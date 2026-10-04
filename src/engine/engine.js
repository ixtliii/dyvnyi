// Dyvnyi 3D engine: the room, the avatar, the cube head, camera and input.
// It's deliberately imperative (like a game loop) and talks to React through events.
import * as THREE from "three";
import TEX from "../assets/tex.json";
import * as A from "./audio.js";
import { CONFIG } from "../content.js";

export function createEngine(canvas) {
const listeners = {};
const on = (e, fn) => { (listeners[e] = listeners[e] || []).push(fn); return () => { listeners[e] = listeners[e].filter((f) => f !== fn); }; };
const emit = (e, d) => (listeners[e] || []).forEach((fn) => fn(d));

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function rng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = rng(11);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x0b0816, 16, 40);
const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 140);

const SNAP = { value: new THREE.Vector2(320, 200) };
function snap(m){
  m.onBeforeCompile = (sh) => { sh.uniforms.uSnap = SNAP;
    sh.vertexShader = "uniform vec2 uSnap;\n" + sh.vertexShader.replace("#include <project_vertex>",
      "#include <project_vertex>\n vec4 sp = gl_Position; sp.xy = floor(sp.xy / sp.w * uSnap + 0.5) / uSnap * sp.w; gl_Position = sp;"); };
  return m;
}
const L = (color, o = {}) => snap(new THREE.MeshLambertMaterial(Object.assign({ color }, o)));
const P = (color, o = {}) => snap(new THREE.MeshPhongMaterial(Object.assign({ color, shininess: 40 }, o)));
const B = (o) => snap(new THREE.MeshBasicMaterial(o));
/* textures */
const loader = new THREE.TextureLoader(); let toLoad = 0, loaded = 0;
function ptex(name, rx = 1, ry = 1){
  toLoad++;
  const t = loader.load(TEX[name], () => { loaded++; emit("progress", loaded / toLoad); if (loaded === toLoad) setTimeout(() => emit("ready"), 0); });
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
}
function ctex(w, h, draw, rx = 1, ry = 1){
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
}
function noiseFill(g, w, h, base, amt){ g.fillStyle = base; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){ const v = (R() - .5) * amt; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(x, y, 1, 1); } }
const T = {
  wall: ptex("wall", 4, 2), tile: ptex("tile", 7, 7), rug: ptex("rug"), rugDark: ptex("rugDark", 6, 4), curtain: ptex("curtain", 9, 1),
  screen: ptex("screen"), couch: ptex("couch", 3, 2), door: ptex("door"), intercom: ptex("intercom"), shade: ptex("shade"), shoes: ptex("shoes"),
  shirt: ptex("shirt"), vase: ptex("vase"), croc: ptex("croc"), bags: ptex("bags"), palm: ptex("palm"), bamboo: ptex("bamboo"),
  clusia: ptex("clusia"), flowers: ptex("flowers"), guitar: ptex("guitar"),
  torsoF: ptex("torsoF"), torsoB: ptex("torsoB"), sleeve: ptex("sleeve", 2, 1), shortsF: ptex("shortsF"), shortsB: ptex("shortsB"), leg: ptex("leg", 2, 1), hair: ptex("hair", 2, 1),
  wood: ctex(32, 32, (g, w, h) => { g.fillStyle = "#8a4a22"; g.fillRect(0, 0, w, h); for (let i = 0; i < 46; i++){ g.fillStyle = R() < .55 ? "rgba(50,18,4,.3)" : "rgba(255,190,120,.12)"; g.fillRect(0, (R() * h) | 0, w, 1); } }),
  rock: ctex(32, 32, (g, w, h) => noiseFill(g, w, h, "#221d2c", .3), 3, 2),
  sign: ctex(128, 44, (g, w, h) => { g.fillStyle = "#f4f2ec"; g.fillRect(0, 0, w, h); g.strokeStyle = "#111"; g.lineWidth = 3; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = "#111"; g.font = "bold 24px Helvetica, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("TOILET", 72, h / 2 + 1); g.beginPath(); g.arc(20, 14, 4, 0, 7); g.fill(); g.fillRect(16, 20, 8, 16); }),
  ao: ctex(4, 32, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(0,0,0,.62)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }),
  dust: ctex(8, 8, (g) => { const gr = g.createRadialGradient(4, 4, 0, 4, 4, 4); gr.addColorStop(0, "rgba(255,230,180,1)"); gr.addColorStop(1, "rgba(255,230,180,0)"); g.fillStyle = gr; g.fillRect(0, 0, 8, 8); })
};
T.ao.magFilter = T.ao.minFilter = THREE.LinearFilter; T.dust.magFilter = T.dust.minFilter = THREE.LinearFilter;

/* builders */
const interactiveMeshes = [];
function box(w, h, d, mat, x, y, z, parent = scene){ const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
function rbox(w, h, d, r, mat, x, y, z, parent = scene){
  const g = new THREE.BoxGeometry(w, h, d, 4, 4, 4); const p = g.attributes.position;
  const rad = r * Math.min(w, h, d) / 2, ix = w / 2 - rad, iy = h / 2 - rad, iz = d / 2 - rad; const v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i++){ v.fromBufferAttribute(p, i); c.set(clamp(v.x, -ix, ix), clamp(v.y, -iy, iy), clamp(v.z, -iz, iz)); v.sub(c); if (v.lengthSq() > 0) v.setLength(rad); v.add(c); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
function cyl(rt, rb, h, seg, mat, x, y, z, parent = scene, open = false){ const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
function rod(a, b, r, mat, parent = scene){
  const dir = new THREE.Vector3().subVectors(b, a); const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, 6); g.translate(0, len / 2, 0);
  const m = new THREE.Mesh(g, mat); m.position.copy(a); m.castShadow = true;
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); parent.add(m); return m;
}
function card(tex, w, h, x, y, z, ry = 0, parent = scene){
  const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
  const m = new THREE.Mesh(geo, L(0xffffff, { map: tex, alphaTest: .45, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; parent.add(m); return m;
}
function cross(tex, w, h, x, y, z, n = 3, parent = scene, rot = 0){ const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); for (let i = 0; i < n; i++) card(tex, w, h, 0, 0, 0, rot + i * Math.PI / n, g); return g; }
function aoStrip(len, depth, x, y, z, ry, rx, parent){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, depth), new THREE.MeshBasicMaterial({ map: T.ao, transparent: true, depthWrite: false, fog: false }));
  m.rotation.set(rx, ry, 0, "YXZ"); m.position.set(x, y, z); m.renderOrder = 1; parent.add(m); return m;
}
function tagInteractive(obj, id){ obj.traverse(o => { if (o.isMesh){ o.userData.iid = id; interactiveMeshes.push(o); } }); }
const M = {
  wall: L(0xf4efe4, { map: T.wall }), wood: L(0xffffff, { map: T.wood }),
  white: L(0xf1eee8), offwhite: L(0xdedad2), silver: P(0xb9bcc4, { shininess: 90 }), chrome: P(0xffffff, { map: T.vase, shininess: 120, specular: 0x888888 }),
  black: L(0x18181b), dark: L(0x2a2a2e), grey: L(0x6d6f78), couch: L(0xb0b0b8, { map: T.couch }), terracotta: L(0x9a4f2c), pot: L(0x3c3d42)
};

/* =====================================================================
   ROOM
   ===================================================================== */
const room = new THREE.Group(); scene.add(room);
const rockM = L(0xffffff, { map: T.rock });
box(6.4, 0.5, 6.4, [rockM, rockM, L(0xe6e2da, { map: T.tile }), L(0x15111f), rockM, rockM], 0, -0.25, 0, room);
const under = new THREE.Mesh(new THREE.ConeGeometry(4.3, 3.4, 7), rockM); under.rotation.x = Math.PI; under.rotation.y = .3; under.position.set(0, -2.2, 0); room.add(under);
const debris = [];
for (let i = 0; i < 24; i++){ const s = .08 + R() * .35, a = R() * Math.PI * 2, r = 2.8 + R() * 1.3;
  const d = box(s, s, s, rockM, Math.cos(a) * r, -0.6 - R() * 3.2, Math.sin(a) * r, room); d.castShadow = false;
  d.userData.base = d.position.y; d.userData.ph = R() * 6; d.rotation.set(R() * 3, R() * 3, 0); debris.push(d); }

// walls are grouped so the camera can cut them away when it orbits behind them
const wallBack = new THREE.Group(), wallLeft = new THREE.Group(), wallRight = new THREE.Group(); room.add(wallBack, wallLeft, wallRight);
box(6.3, 3.2, .15, M.wall, 0, 1.6, -3.075, wallBack);
box(.15, 3.2, 6.15, M.wall, -3.075, 1.6, -0.075, wallLeft);
box(.15, 3.2, 5.3, M.wall, 3.075, 1.6, -0.5, wallRight);
box(.15, 1.2, .8, M.wall, 3.075, 2.6, 2.55, wallRight);
box(.15, 3.2, .05, M.wall, 3.075, 1.6, 2.975, wallRight);
box(6.4, .16, .22, M.wood, 0, 3.25, -3.05, wallBack); box(.22, .16, 6.4, M.wood, -3.05, 3.25, 0, wallLeft); box(.22, .16, 6.4, M.wood, 3.05, 3.25, 0, wallRight);
rod(new THREE.Vector3(.6, 2.45, -2.93), new THREE.Vector3(1.6, 3.2, -2.93), .07, M.wood, wallBack);
rod(new THREE.Vector3(2.2, 2.45, -2.93), new THREE.Vector3(1.6, 3.2, -2.93), .07, M.wood, wallBack);
box(1.8, .12, .12, M.wood, 1.4, 2.45, -2.93, wallBack);
aoStrip(6, .55, 0, .006, -2.73, 0, -Math.PI / 2, room); aoStrip(6, .55, -2.73, .006, 0, Math.PI / 2, -Math.PI / 2, room); aoStrip(6, .55, 2.73, .006, 0, -Math.PI / 2, -Math.PI / 2, room);
aoStrip(6, .5, 0, .25, -2.995, 0, Math.PI, wallBack); aoStrip(6, .5, -2.995, .25, 0, Math.PI / 2, Math.PI, wallLeft); aoStrip(6, .5, 2.995, .25, 0, -Math.PI / 2, Math.PI, wallRight);
const rugD = box(4.6, .02, 3.3, L(0xffffff, { map: T.rugDark }), 0, .01, -0.45, room); rugD.castShadow = false;
const rugO = box(3.6, .03, 2.5, [L(0x55543a), L(0x55543a), L(0xffffff, { map: T.rug }), L(0x55543a), L(0x55543a), L(0x55543a)], .15, .02, -0.35, room); rugO.castShadow = false;

// curtains (they sway a little)
const curtainGeo = new THREE.PlaneGeometry(3.8, 3.0, 54, 4); const curtainBase = curtainGeo.attributes.position.array.slice();
const curtain = new THREE.Mesh(curtainGeo, L(0xffffff, { map: T.curtain, side: THREE.DoubleSide })); curtain.receiveShadow = true;
curtain.rotation.y = Math.PI / 2; curtain.position.set(-2.9, 1.55, -1.1); wallLeft.add(curtain);
function swayCurtain(t){ const p = curtainGeo.attributes.position; for (let i = 0; i < p.count; i++){ const x = curtainBase[i * 3], y = curtainBase[i * 3 + 1]; const low = (1.5 - y) / 3;
  p.setZ(i, Math.sin(x * 9.2) * .055 + Math.sin(t * .9 + x * 1.6) * .025 * low * low); } p.needsUpdate = true; curtainGeo.computeVertexNormals(); }
swayCurtain(0);
const crod = cyl(.02, .02, 3.9, 6, M.silver, -2.88, 3.06, -1.1, wallLeft); crod.rotation.x = Math.PI / 2;

/* main desk */
const deskG = new THREE.Group(); room.add(deskG);
rbox(2.9, .05, .72, .3, M.white, -.45, .75, -2.62, deskG);
[[-1.85, -2.32], [-1.85, -2.92], [.95, -2.32], [.95, -2.92]].forEach(p => box(.05, .73, .05, M.white, p[0], .365, p[1], deskG));
box(.22, .46, .45, M.dark, .65, .23, -2.62, deskG);
rbox(.6, .12, .24, .3, M.offwhite, -1.35, .84, -2.84, deskG);
box(.82, .008, .36, L(0xbcb6dc), -.32, .778, -2.46, deskG);
rbox(.42, .025, .13, .4, M.white, -.38, .79, -2.47, deskG);
const keyMat = L(0xe9e6f0); const keyCaps = [];
for (let r = 0; r < 4; r++) for (let k = 0; k < 13; k++){ const kc = box(.022, .008, .022, keyMat, -.56 + k * .03, .806, -2.515 + r * .03, deskG); kc.castShadow = false; keyCaps.push(kc); }
rbox(.065, .03, .1, .5, M.offwhite, .02, .79, -2.47, deskG);
box(.26, .015, .19, L(0x2f5d50), .42, .785, -2.5, deskG);
box(.25, .02, .18, M.silver, -.35, .785, -2.8, deskG);
box(.06, .34, .04, M.silver, -.35, .95, -2.85, deskG);
rbox(1.02, .62, .05, .2, L(0xcfd2d8), -.35, 1.3, -2.86, deskG);
const screenMat = B({ map: T.screen, color: 0xffffff });
const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(.96, .56), screenMat); screenMesh.position.set(-.35, 1.3, -2.832); deskG.add(screenMesh);
const SCREEN_POS = new THREE.Vector3(-.35, 1.3, -2.832);
cyl(.045, .04, .09, 10, M.white, -1.05, .82, -2.48, deskG);
cyl(.03, .03, .16, 8, M.silver, -.95, .9, -2.76, deskG);
const hp = new THREE.Mesh(new THREE.TorusGeometry(.08, .02, 6, 12, Math.PI), M.black); hp.position.set(.62, .86, -2.7); hp.castShadow = true; deskG.add(hp);
cyl(.07, .095, .27, 10, M.chrome, .8, .9, -2.76, deskG);
cross(T.flowers, .42, .25, .8, 1.0, -2.76, 2, deskG, .3);
cyl(.07, .06, .14, 9, M.pot, .2, .84, -2.85, deskG);
cross(T.clusia, .32, .42, .2, .9, -2.85, 2, deskG);
tagInteractive(deskG, "work");
const chair = new THREE.Group(); chair.position.set(-.25, 0, -1.95); room.add(chair);
for (let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2; const s = box(.32, .03, .04, M.offwhite, Math.cos(a) * .16, .06, Math.sin(a) * .16, chair); s.rotation.y = -a; }
cyl(.03, .03, .38, 8, M.silver, 0, .26, 0, chair);
rbox(.5, .08, .48, .4, M.offwhite, 0, .48, 0, chair);
rbox(.48, .62, .06, .3, L(0xd9dbe2), 0, .86, .24, chair);
const hr = new THREE.Mesh(new THREE.TorusGeometry(.13, .025, 6, 12, Math.PI), M.white); hr.position.set(0, 1.22, .26); hr.castShadow = true; chair.add(hr);
const shirt = box(.56, .62, .06, [L(0xa8c0e4), L(0xa8c0e4), L(0xa8c0e4), L(0xa8c0e4), L(0xffffff, { map: T.shirt }), L(0xa8c0e4)], 0, .78, .3, chair); shirt.rotation.y = Math.PI;
tagInteractive(chair, "work");

/* side desk + palm */
const sideG = new THREE.Group(); room.add(sideG);
rbox(.72, .05, 1.3, .3, M.white, -2.62, .75, -2.36, sideG);
rbox(.66, .7, .42, .1, M.offwhite, -2.62, .36, -1.9, sideG);
[[-2.95, -2.98], [-2.3, -2.98], [-2.3, -1.74]].forEach(p => box(.04, .73, .04, M.white, p[0], .365, p[1], sideG));
cyl(.22, .17, .38, 12, M.pot, -2.66, .97, -2.7, sideG);
const bigPalm = cross(T.palm, 1.6, 1.55, -2.66, 1.05, -2.7, 3, sideG, .4);
cyl(.08, .07, .14, 9, M.pot, -2.55, .85, -2.12, sideG);
cross(T.clusia, .3, .36, -2.55, .9, -2.12, 2, sideG, 1);
const sketch = box(.3, .02, .22, L(0xf6f1e4), -2.6, .785, -1.95, sideG); sketch.rotation.y = .2;
box(.3, .08, .12, M.wood, -2.65, .82, -1.75, sideG);
tagInteractive(sideG, "lab");

/* guitar, bamboo, lamp */
const guitar = new THREE.Group(); guitar.position.set(-2.82, 0, -1.25); room.add(guitar);
const gCard = card(T.guitar, .32, 1.06, 0, 0, 0, Math.PI / 2, guitar); gCard.rotation.z = .08;
tagInteractive(guitar, "guitar");
const bamboo = new THREE.Group(); bamboo.position.set(-2.66, 0, -.55); room.add(bamboo);
cyl(.17, .13, .28, 12, M.terracotta, 0, .14, 0, bamboo);
cross(T.bamboo, .75, 1.45, 0, .12, 0, 2, bamboo, .5);
tagInteractive(bamboo, "plant");
const lamp = new THREE.Group(); lamp.position.set(-2.5, 0, .2); room.add(lamp);
const lampTop = new THREE.Vector3(0, 1.42, 0); const lampWood = L(0xd9b07a);
for (let i = 0; i < 3; i++){ const a = i / 3 * Math.PI * 2 + .4; rod(new THREE.Vector3(Math.cos(a) * .3, 0, Math.sin(a) * .3), lampTop, .02, lampWood, lamp); }
cyl(.016, .016, .2, 6, lampWood, 0, 1.5, 0, lamp);
const shadeMat = L(0xffffff, { map: T.shade, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: T.shade, emissiveIntensity: .95 });
const shadeMesh = cyl(.21, .25, .34, 16, shadeMat, 0, 1.6, 0, lamp, true); shadeMesh.castShadow = false;
const bulb = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), B({ color: 0xfff1c8 })); bulb.position.set(0, 1.55, 0); lamp.add(bulb);
rbox(.24, .42, .24, .2, M.white, -.25, .21, .42, lamp); box(.2, .01, .2, M.grey, -.25, .425, .42, lamp);
tagInteractive(lamp, "lamp");

/* entrance (on the left wall) */
const entry = new THREE.Group(); room.add(entry);
box(.05, 2.1, .96, L(0x2a160d), -2.98, 1.05, 2.25, wallLeft);
const doorM = new THREE.Mesh(new THREE.PlaneGeometry(.92, 2.06), L(0xffffff, { map: T.door })); doorM.rotation.y = Math.PI / 2; doorM.position.set(-2.95, 1.03, 2.25); doorM.receiveShadow = true; wallLeft.add(doorM);
const ic = new THREE.Mesh(new THREE.PlaneGeometry(.22, .18), L(0xffffff, { map: T.intercom })); ic.rotation.y = Math.PI / 2; ic.position.set(-2.993, 1.35, 1.62); wallLeft.add(ic);
const bagsCard = card(T.bags, .62, 1.2, -2.97, .78, 1.3, Math.PI / 2, wallLeft);
const rack = new THREE.Group(); rack.position.set(-2.8, 0, 1.3); entry.add(rack);
const bam = L(0xcfa46a);
[[-.16, -.3], [-.16, .3], [.16, -.3], [.16, .3]].forEach(p => box(.025, .62, .025, bam, p[0], .31, p[1], rack));
[.06, .28, .5].forEach(y => box(.34, .02, .62, bam, 0, y, 0, rack));
const shoesCard = new THREE.Mesh(new THREE.PlaneGeometry(.66, .58), L(0xffffff, { map: T.shoes })); shoesCard.rotation.y = Math.PI / 2; shoesCard.position.set(.0, .3, 0); rack.add(shoesCard);
const crocMat = P(0xffffff, { map: T.croc, shininess: 30 });
const mat2 = box(.9, .01, .7, L(0xffffff, { map: T.rugDark }), -2.4, .012, 2.25, entry); mat2.castShadow = false;
tagInteractive(entry, "contact"); tagInteractive(doorM, "contact"); tagInteractive(bagsCard, "contact");

/* couch */
const couch = new THREE.Group(); room.add(couch);
rbox(.86, .3, 1.72, .2, M.couch, 2.57, .23, 1.15, couch);
rbox(.64, .14, 1.5, .5, M.couch, 2.5, .44, 1.15, couch);
rbox(.24, .6, 1.72, .4, M.couch, 2.88, .62, 1.15, couch);
rbox(.86, .5, .16, .4, M.couch, 2.57, .44, .36, couch);
rbox(.86, .5, .16, .4, M.couch, 2.57, .44, 1.94, couch);
const thr = rbox(.55, .07, .5, .5, L(0x7a7c84), 2.45, .53, 1.6, couch); thr.rotation.y = .3;
rbox(.2, .16, .16, .5, L(0x3a2a20), 2.78, .62, .65, couch);
tagInteractive(couch, "couch");

/* stairs + loft */
const stairs = new THREE.Group(); room.add(stairs);
[2.32, 2.93].forEach(x => { const s = box(.05, 2.68, .14, M.wood, x, 1.22, -.86, stairs); s.rotation.x = -Math.atan2(1.1, 2.4); });
for (let i = 0; i < 9; i++){ const y = (i + 1) * .26; box(.6, .035, .2, M.wood, 2.625, y, -.32 - (y / 2.4) * 1.08, stairs); }
tagInteractive(stairs, "stairs");
const loft = new THREE.Group(); room.add(loft);
box(1.55, .12, 1.62, M.wood, 2.25, 2.46, -2.2, loft); box(.1, 2.4, .1, M.wood, 1.52, 1.2, -1.44, loft);
box(.82, .05, .05, M.wood, 1.9, 3.3, -1.42, loft); box(.05, .05, 1.6, M.wood, 1.5, 3.3, -2.2, loft);
for (let i = 0; i <= 6; i++) box(.03, .8, .03, M.wood, 1.5 + i * .13, 2.9, -1.42, loft);
for (let i = 1; i <= 11; i++) box(.03, .8, .03, M.wood, 1.5, 2.9, -1.42 - i * .14, loft);
rbox(1.1, .3, 1.1, .3, L(0x34364a), 2.3, 2.67, -2.45, loft);
rbox(.5, .4, .4, .1, L(0xa0784a), 2.2, .2, -2.65, room); rbox(.4, .3, .35, .1, L(0x8f6a40), 2.65, .15, -2.2, room);

/* ---------- extra clutter so the room feels lived in ---------- */
function imgTex(url){ const t = loader.load(url); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; return t; }
// framed prints of my own work above the couch
[[CONFIG.work[3] && CONFIG.work[3].image, .95, .64, .7], [CONFIG.lab[0] && CONFIG.lab[0].image, .8, .42, 1.62]].forEach(([url, w, h, z]) => {
  if (!url) return; const f = new THREE.Group(); f.position.set(2.985, 1.62, z); f.rotation.y = -Math.PI / 2; wallRight.add(f);
  box(w + .06, h + .06, .03, L(0x161616), 0, 0, 0, f).castShadow = false;
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), L(0xffffff, { map: imgTex(url) })); pic.position.z = .018; f.add(pic);
});
// a small printed box under the loft, like the one you opened
{ const c = document.createElement("canvas"); c.width = 128; c.height = 96; const g = c.getContext("2d"); g.fillStyle = "#b58650"; g.fillRect(0, 0, 128, 96);
  g.fillStyle = "rgba(205,170,110,.8)"; g.fillRect(0, 0, 128, 14); g.fillStyle = "#1b120a"; g.font = "bold 18px Helvetica, Arial, sans-serif"; g.textAlign = "center"; g.fillText("DYVNYI", 64, 52); g.font = "10px Helvetica, Arial, sans-serif"; g.fillText("FRAGILE", 64, 70);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; const km = L(0xb58650), fm = L(0xffffff, { map: t });
  const bx = box(.5, .36, .42, [km, km, km, km, fm, km], 2.0, .58, -2.55, room); bx.rotation.y = .12; }
// narrow white bookshelf between the desk and the loft
{ const sh = new THREE.Group(); sh.position.set(1.21, 0, -2.82); room.add(sh);
  box(.38, 1.5, .3, M.white, 0, .75, 0, sh);
  [.32, .74, 1.16].forEach((y, r) => { box(.34, .02, .27, M.offwhite, 0, y - .2, .02, sh);
    for (let i = 0; i < 5 + r; i++){ const bk = box(.035 + R() * .02, .16 + R() * .08, .2, L([0x2d3e6b, 0xa64032, 0xe3d9c4, 0x1d1d1d, 0x4f7a4a, 0xc89a3a][(i + r) % 6]), -.13 + i * .047, y - .1, .04, sh); bk.rotation.z = (R() - .5) * .08; } });
  cyl(.06, .05, .1, 8, M.pot, 0, 1.55, 0, sh); cross(T.clusia, .2, .24, 0, 1.58, 0, 2, sh); }
// warm fairy lights along the loft railing
const fairy = []; { const fm = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  for (let i = 0; i <= 22; i++){ const t = i / 22; const x = 1.5 + Math.max(0, t * 2 - 1) * .8, z = -2.97 + Math.min(t * 2, 1) * 1.55; const m = new THREE.Mesh(new THREE.SphereGeometry(.018, 5, 4), fm.clone()); m.position.set(x, 3.24 - Math.sin(t * Math.PI * 6) * .04, z); loft.add(m); fairy.push(m); } }
const fairyLight = new THREE.PointLight(0xffc88a, .5, 3.2, 2); fairyLight.position.set(1.8, 3.0, -1.7); scene.add(fairyLight);
// desk bits: laptop, notebook, water bottle, bin
box(.3, .012, .21, M.silver, .58, .785, -2.42, deskG).rotation.y = -.15;
const nb = box(.15, .015, .21, L(0x1f2a44), -.95, .785, -2.38, deskG); nb.rotation.y = .3;
cyl(.035, .035, .2, 8, L(0x5b8fb0), -1.6, .875, -2.4, deskG);
cyl(.13, .11, .3, 10, L(0x2a2a2e), -1.4, .15, -2.55, room);
// side desk: a stack of books
for (let i = 0; i < 4; i++){ const bk = box(.22 - i * .015, .04, .16, L([0xe3d9c4, 0x2d3e6b, 0xa64032, 0x1d1d1d][i]), -2.6, .8 + i * .04, -2.2, sideG); bk.rotation.y = (R() - .5) * .4; }
// couch: a hoodie over the arm
{ const hd = rbox(.36, .08, .5, .5, L(0x3a3d46), 2.57, .72, 1.9, couch); hd.rotation.x = .3; }
// floor: backpack by the couch, slippers by the door, a little plant by the stairs
{ const bp = new THREE.Group(); bp.position.set(1.95, 0, 2.15); bp.rotation.y = .5; room.add(bp);
  rbox(.32, .42, .2, .5, L(0x1b1b1f), 0, .21, 0, bp); rbox(.24, .16, .06, .5, L(0x26262c), 0, .14, .12, bp); }
[[-2.35, 1.95, .2], [-2.24, 1.97, .05]].forEach(([x, z, r]) => { const sl = rbox(.11, .05, .27, .6, L(0x6b4a33), x, .03, z, room); sl.rotation.y = r; });
{ const pg = new THREE.Group(); pg.position.set(1.72, 0, -1.2); room.add(pg); cyl(.14, .11, .26, 10, M.pot, 0, .13, 0, pg); cross(T.palm, .7, .75, 0, .22, 0, 3, pg, .2); }
// light switch by the desk
box(.08, .14, .015, L(0xece7da), 1.05, 1.25, -2.99, wallBack);

/* toilet door (in the right wall) */
const tDoor = new THREE.Group(); tDoor.position.set(3.0, 0, 2.95); wallRight.add(tDoor);
box(.05, 2.0, .8, L(0xf4f2ec), 0, 1.0, -.4, tDoor); box(.04, .03, .12, M.silver, -.04, 1.0, -.72, tDoor);
const sign = new THREE.Mesh(new THREE.PlaneGeometry(.5, .17), B({ map: T.sign })); sign.position.set(-.032, 1.55, -.4); sign.rotation.y = -Math.PI / 2; tDoor.add(sign);
tagInteractive(tDoor, "toilet");
const loo = new THREE.Group(); loo.position.set(4.4, -.15, 2.55); loo.visible = false; scene.add(loo);
box(1.0, .22, 1.0, L(0xffffff, { map: T.tile }), 0, -.11, 0, loo);
const looW = P(0xffffff, { shininess: 100 });
cyl(.2, .14, .38, 12, looW, 0, .19, 0, loo);
const seat = new THREE.Mesh(new THREE.TorusGeometry(.17, .035, 6, 14), looW); seat.rotation.x = Math.PI / 2; seat.position.y = .4; loo.add(seat);
rbox(.16, .38, .4, .3, looW, .24, .45, 0, loo); const lid = box(.02, .36, .34, looW, .17, .58, 0, loo); lid.rotation.z = .25;
cyl(.05, .05, .1, 10, L(0xffffff), -.32, .55, .35, loo); loo.rotation.y = -Math.PI / 2;

/* lights */
const amb = new THREE.AmbientLight(0x55507a, .55); scene.add(amb);
const hemi = new THREE.HemisphereLight(0xb8b4ff, 0x2a1a10, .3); scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff0dc, .35); key.position.set(3.5, 7, 5); key.castShadow = true;
key.shadow.mapSize.set(coarse ? 512 : 1024, coarse ? 512 : 1024); Object.assign(key.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 1, far: 20 }); key.shadow.bias = -0.0015; key.shadow.radius = 3; scene.add(key);
const lampLight = new THREE.PointLight(0xffc98c, 1.35, 7, 1.5); lampLight.position.set(-2.5, 1.5, .2); lampLight.castShadow = true;
lampLight.shadow.mapSize.set(coarse ? 256 : 512, coarse ? 256 : 512); lampLight.shadow.bias = -0.004; lampLight.shadow.radius = 4; lampLight.shadow.camera.near = .1; scene.add(lampLight);
const screenLight = new THREE.PointLight(0x5f8cff, 1.0, 3.8, 2); screenLight.position.set(-.35, 1.3, -2.35); scene.add(screenLight);
let lampOn = true, lampFlicker = 0;

/* particles: void specks + dust in the lamp light */
const PN = 240; const pg = new THREE.BufferGeometry(); const pp = new Float32Array(PN * 3);
for (let i = 0; i < PN; i++){ pp[i * 3] = (R() - .5) * 44; pp[i * 3 + 1] = (R() - .5) * 26; pp[i * 3 + 2] = (R() - .5) * 44; }
pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xb0a8d8, size: .06, transparent: true, opacity: .55, fog: false })));
const DN = 70; const dg = new THREE.BufferGeometry(); const dp = new Float32Array(DN * 3); const dseed = [];
for (let i = 0; i < DN; i++){ dseed.push([R(), R(), R(), R()]); }
dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
const dustMat = new THREE.PointsMaterial({ map: T.dust, size: .035, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending });
const dust = new THREE.Points(dg, dustMat); room.add(dust);

/* =====================================================================
   AVATAR (rigged with knees, elbows, photo textures)
   ===================================================================== */
const skin = L(0xf0c2aa), hoodieM = L(0x2a2a2e), legM = L(0xe9b8a0);
function wrapTex(front, back){
  const c = document.createElement("canvas"); c.width = 256; c.height = 128; const g = c.getContext("2d");
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  const draw = () => { const f = front.image, b = back.image; if (!f || !b || !f.width || !b.width) return false;
    g.drawImage(b, b.width / 2, 0, b.width / 2, b.height, 0, 0, 64, 128); g.drawImage(f, 0, 0, f.width, f.height, 64, 0, 128, 128); g.drawImage(b, 0, 0, b.width / 2, b.height, 192, 0, 64, 128); t.needsUpdate = true; return true; };
  const iv = setInterval(() => { if (draw()) clearInterval(iv); }, 60); return t;
}
const torsoWrap = wrapTex(T.torsoF, T.torsoB), shortsWrap = wrapTex(T.shortsF, T.shortsB);
const pantsM = L(0xffffff, { map: shortsWrap });
function mesh(geo, mat, parent, x = 0, y = 0, z = 0){ const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
function grp(parent, x = 0, y = 0, z = 0){ const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

const avatar = new THREE.Group(); scene.add(avatar);
const body = grp(avatar); body.scale.setScalar(.93);
const hips = grp(body, 0, .97, 0);
mesh(new THREE.CylinderGeometry(.185, .195, .2, 14, 1, false, Math.PI), pantsM, hips, 0, 0, 0).scale.z = .78;
const legs = [-1, 1].map(s => {
  const thigh = grp(hips, s * .095, -.05, 0);
  mesh(new THREE.CylinderGeometry(.1, .11, .37, 10, 1, false, Math.PI), pantsM, thigh, 0, -.16, 0);
  mesh(new THREE.CylinderGeometry(.062, .056, .12, 8), legM, thigh, 0, -.39, 0);
  const knee = grp(thigh, 0, -.44, 0);
  mesh(new THREE.SphereGeometry(.055, 8, 6), legM, knee);
  mesh(new THREE.CylinderGeometry(.052, .038, .42, 8), legM, knee, 0, -.21, 0);
  const ankle = grp(knee, 0, -.43, 0);
  const clog = mesh(new THREE.SphereGeometry(.07, 12, 8), crocMat, ankle, 0, -.02, .05); clog.scale.set(1, .62, 1.85);
  return { thigh, knee, ankle };
});
const torso = grp(hips, 0, .08, 0);
{ const g = new THREE.CylinderGeometry(.21, .21, .62, 16, 8, true, Math.PI); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++){ const t = (p.getY(i) + .31) / .62; // 0 = hem, 1 = shoulders
    const f = t < .2 ? 1.0 - t * .3 : t < .55 ? .94 + (t - .2) * .4 : t < .88 ? 1.08 : 1.08 - (t - .88) * 1.6;
    p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f * .62 * (t > .5 && p.getZ(i) > 0 ? 1.06 : 1)); }
  g.computeVertexNormals(); mesh(g, L(0xffffff, { map: torsoWrap, side: THREE.DoubleSide }), torso, 0, .31, 0); }
const yoke = mesh(new THREE.SphereGeometry(.2, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), hoodieM, torso, 0, .6, 0); yoke.scale.set(1.0, .22, .6);
const hood = mesh(new THREE.SphereGeometry(.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hoodieM, torso, 0, .56, -.11); hood.scale.set(1.0, .42, .68); hood.rotation.x = -.18;
const sleeveM = L(0xffffff, { map: T.sleeve });
const arms = [-1, 1].map(s => {
  const sh = grp(torso, s * .245, .55, 0); sh.rotation.z = s * .08;
  mesh(new THREE.SphereGeometry(.064, 8, 6), hoodieM, sh);
  mesh(new THREE.CylinderGeometry(.06, .054, .3, 8), sleeveM, sh, 0, -.15, 0);
  const el = grp(sh, 0, -.3, 0); mesh(new THREE.SphereGeometry(.054, 8, 6), hoodieM, el);
  mesh(new THREE.CylinderGeometry(.054, .05, .27, 8), sleeveM, el, 0, -.135, 0);
  const wr = grp(el, 0, -.28, 0);
  const hand = mesh(new THREE.SphereGeometry(.044, 8, 6), skin, wr, 0, -.05, .005); hand.scale.set(.72, 1.25, .5);
  const thumb = mesh(new THREE.SphereGeometry(.018, 6, 4), skin, wr, -s * -.028, -.03, .025); thumb.scale.set(.8, 1.4, .8);
  return { sh, el, wr };
});
mesh(new THREE.CylinderGeometry(.05, .058, .09, 10), skin, torso, 0, .64, 0);
const head = grp(torso, 0, .655, 0);
const hg = new THREE.SphereGeometry(.125, 24, 18, Math.PI * 1.5);
{ const p = hg.attributes.position, uvA = hg.attributes.uv;
  for (let i = 0; i < p.count; i++){ let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const th = Math.acos(clamp(y / .125, -1, 1)) / Math.PI; uvA.setY(i, 1 - clamp((th - .06) / .84, 0, 1));
    const ny = y / .125, nx = x / .125, nz = z / .125;
    const t = ny; const taper = t < 0 ? 1 - .3 * t * t : 1 - .06 * t;
    x *= .86 * taper; z *= .98 * taper;
    if (nz > 0){ // face: flatter cheeks, a nose, a brow and a chin
      z *= 1 - .08 * nx * nx;
      z += .02 * Math.exp(-(nx * nx) / .012 - ((ny + .28) * (ny + .28)) / .03) * nz;
      z += .008 * Math.exp(-((ny - .12) * (ny - .12)) / .006) * nz * (1 - nx * nx);
      if (ny < -.5) z += .012 * nz * (1 - Math.abs(nx) * 2);
    }
    p.setXYZ(i, x, y * 1.2, z); }
  hg.computeVertexNormals(); }
const headMesh = mesh(hg, skin, head, 0, .135, 0);
[-1, 1].forEach(s => { const ear = mesh(new THREE.SphereGeometry(.028, 8, 6), skin, head, s * .104, .13, -.005); ear.scale.set(.4, 1, .75);
  const e = mesh(new THREE.TorusGeometry(.014, .004, 4, 10), P(0xdddddd, { shininess: 120 }), head, s * .108, .095, .0); e.rotation.y = Math.PI / 2; });
const hairM = L(0xffffff, { map: T.hair, side: THREE.DoubleSide });
{ const cg = new THREE.SphereGeometry(.137, 20, 10, 0, Math.PI * 2, 0, Math.PI * .5); const p = cg.attributes.position; const rr = rng(5);
  for (let i = 0; i < p.count; i++){ const y = p.getY(i); const edge = y < .05 ? 1 : 0; const n = 1 + (rr() - .5) * .14 * (edge + .5);
    p.setXYZ(i, p.getX(i) * .9 * n, y * 1.24 * n - (edge ? rr() * .035 : 0), p.getZ(i) * n); }
  cg.computeVertexNormals();
  const cap = mesh(cg, hairM, head, 0, .145, -.014); cap.rotation.x = -.45;
}
const blob = new THREE.Mesh(new THREE.CircleGeometry(.32, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .3, depthWrite: false }));
blob.rotation.x = -Math.PI / 2; scene.add(blob);
const SPAWN = new THREE.Vector3(.4, 0, .6);
avatar.position.copy(SPAWN); avatar.rotation.y = Math.PI * .1;
const marker = new THREE.Mesh(new THREE.OctahedronGeometry(.07, 0), B({ color: 0xffd27a })); marker.visible = false; scene.add(marker);

/* =====================================================================
   INTERACTABLES + COLLISION
   ===================================================================== */
const ITEMS = {
  work:    { label: "Use the computer", short: "Computer", pos: [-.35, -2.4], stand: [-.6, -1.45], r: 1.15, h: 1.85 },
  lab:     { label: "Look at the side desk", short: "Side desk", pos: [-2.55, -2.3], stand: [-1.85, -2.05], r: 1.0, h: 2.4 },
  guitar:  { label: "Play the guitar", short: "Guitar", pos: [-2.75, -1.25], stand: [-2.05, -1.25], r: .9, h: 1.45 },
  plant:   { label: "Water the plant", short: "Plant", pos: [-2.66, -.55], stand: [-2.05, -.55], r: .85, h: 1.7 },
  lamp:    { label: "Switch the lamp", short: "Lamp", pos: [-2.5, .2], stand: [-1.95, .3], r: .85, h: 2.0 },
  contact: { label: "Leave the room (contact)", short: "Front door", pos: [-2.95, 1.9], stand: [-2.25, 2.1], r: 1.05, h: 2.35 },
  couch:   { label: "Sit on the couch", short: "Couch", pos: [2.5, 1.15], stand: [1.75, 1.15], r: 1.05, h: 1.1 },
  stairs:  { label: "Climb the stairs", short: "Stairs", pos: [2.62, -.45], stand: [2.4, .0], r: .85, h: 2.2 },
  toilet:  { label: "Open the white door", short: "White door", pos: [2.95, 2.55], stand: [2.3, 2.55], r: .95, h: 2.3 }
};
const COLLIDERS = [[-1.92, 1.0, -3, -2.24], [-3, -2.24, -3, -1.66], [-3, -2.38, -1.62, .55], [-3, -2.58, .95, 1.65], [2.12, 3, .28, 2.02], [2.26, 3, -1.42, -.26], [1.42, 3, -3, -1.38], [-.5, .0, -2.25, -1.72], [1.0, 1.42, -3, -2.62], [1.78, 2.12, 1.98, 2.32], [1.55, 1.9, -1.38, -1.02]];
const BOUND = { x0: -2.78, x1: 2.78, z0: -2.78, edge: 3.18 };
function blocked(x, z, r = .2){ if (x < BOUND.x0 || x > BOUND.x1 || z < BOUND.z0) return true; for (const c of COLLIDERS) if (x + r > c[0] && x - r < c[1] && z + r > c[2] && z - r < c[3]) return true; return false; }

/* =====================================================================
   POST
   ===================================================================== */
let rt; const lowRes = new THREE.Vector2();
const post = new THREE.ShaderMaterial({
  uniforms: { tScene: { value: null }, uLow: { value: lowRes }, uAspect: { value: 1 }, uTime: { value: 0 }, uBlur: { value: 1 }, uWob: { value: reduceMotion ? 0 : 1 }, uFade: { value: 1 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
  fragmentShader: `
    precision highp float;
    uniform sampler2D tScene; uniform vec2 uLow; uniform float uAspect, uTime, uBlur, uWob, uFade;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 voidCol(vec2 uv){ vec3 c = mix(vec3(.012,.01,.025), vec3(.07,.05,.14), smoothstep(-.1, 1.1, uv.y));
      c += vec3(.05,.03,.09) * (sin(uv.x * 2.5 + uv.y * 4.0 + uTime * .12) * .5 + .5) * smoothstep(.3, 1., uv.y) * .7; return c; }
    vec4 samp(vec2 uv){ vec4 s = texture2D(tScene, uv); return vec4(s.rgb + voidCol(uv) * (1. - s.a), s.a); }
    void main(){
      vec2 c = vUv - .5; float r = length(c * vec2(uAspect, 1.));
      vec4 sharp = samp(vUv);
      vec2 dir = c * .12 + vec2(0., .02) + vec2(sin(uTime * .7), cos(uTime * .53)) * .006 * uWob;
      vec3 acc = vec3(0.); float aa = 0.;
      for (int i = 0; i < 14; i++){ float t = float(i) / 13.; vec4 s = samp(vUv - dir * t); acc += s.rgb; aa += s.a; }
      acc /= 14.; aa /= 14.;
      float sil = clamp(abs(aa - sharp.a) * 2.4, 0., 1.);
      float scr = smoothstep(.45, 1.05, r);
      vec3 col = mix(sharp.rgb, acc, clamp((sil + scr) * uBlur, 0., 1.));
      vec2 px = 1. / uLow; vec3 bl = vec3(0.);
      for (int i = 0; i < 8; i++){ float a = float(i) * .785; for (int k = 1; k < 4; k++){
        vec3 s = texture2D(tScene, vUv + vec2(cos(a), sin(a)) * px * float(k) * 2.2).rgb; bl += max(s - .62, 0.) / float(k); } }
      col += bl * .16 * vec3(1., .9, .75);
      float l = dot(col, vec3(.299, .587, .114));
      col = mix(vec3(l), col, 1.08);
      col += vec3(.035, .018, .07) * (1. - smoothstep(0., .45, l));
      col *= mix(vec3(.95, .96, 1.04), vec3(1.03, 1.0, .95), smoothstep(.3, .9, l));
      col = (col - .5) * 1.07 + .5;
      col += (hash(floor(gl_FragCoord.xy / 2.) + fract(uTime * 7.) * 91.) - .5) * .07;
      col *= mix(1., .5, smoothstep(.5, 1.2, r));
      col *= .97 + .03 * step(1., mod(gl_FragCoord.y, 2.));
      gl_FragColor = vec4(col * uFade, 1.);
    }`,
  depthTest: false, depthWrite: false
});
const postScene = new THREE.Scene(); const postCam = new THREE.Camera(); postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
function resize(){
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
  const s = (coarse ? 340 : 420) / Math.min(w, h); lowRes.set(Math.max(64, Math.round(w * s)), Math.max(64, Math.round(h * s)));
  if (rt) rt.dispose();
  rt = new THREE.WebGLRenderTarget(lowRes.x, lowRes.y, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, depthBuffer: true });
  post.uniforms.tScene.value = rt.texture; post.uniforms.uAspect.value = w / h; SNAP.value.set(lowRes.x / 1.6, lowRes.y / 1.6);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener("resize", resize); resize();



/* =====================================================================
   THE BOX (the room is packed inside it)
   ===================================================================== */
const HW = 10, HH = 11, HD = 10, HY = -0.3;
const headCube = new THREE.Group(); headCube.position.y = HY; scene.add(headCube);
const kraftRng = rng(41);
function kraft(g, w, h){
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#c08f57"); gr.addColorStop(1, "#a97a45"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 7){ g.fillStyle = "rgba(90,55,20,.05)"; g.fillRect(x, 0, 2, h); }                 // corrugation
  for (let i = 0; i < w * h / 90; i++){ g.fillStyle = kraftRng() < .5 ? "rgba(70,40,10,.18)" : "rgba(255,230,190,.12)"; g.fillRect(kraftRng() * w, kraftRng() * h, 1 + kraftRng() * 2, 1); }
  for (let i = 0; i < 5; i++){ g.fillStyle = "rgba(60,35,10,.06)"; g.beginPath(); g.ellipse(kraftRng() * w, kraftRng() * h, 20 + kraftRng() * 60, 10 + kraftRng() * 30, kraftRng() * 3, 0, 7); g.fill(); } // scuffs
  const e = g.createLinearGradient(0, 0, w, 0); e.addColorStop(0, "rgba(60,35,10,.25)"); e.addColorStop(.06, "rgba(0,0,0,0)"); e.addColorStop(.94, "rgba(0,0,0,0)"); e.addColorStop(1, "rgba(60,35,10,.25)");
  g.fillStyle = e; g.fillRect(0, 0, w, h);
}
function ink(g, draw){ // printed ink that's a bit worn
  const c = document.createElement("canvas"); c.width = g.canvas.width; c.height = g.canvas.height; const k = c.getContext("2d"); draw(k);
  k.globalCompositeOperation = "destination-out"; for (let i = 0; i < c.width * c.height / 60; i++){ k.fillStyle = `rgba(0,0,0,${.3 + kraftRng() * .7})`; k.fillRect(kraftRng() * c.width, kraftRng() * c.height, 1 + kraftRng() * 2, 1 + kraftRng()); }
  g.globalAlpha = .88; g.drawImage(c, 0, 0); g.globalAlpha = 1;
}
const SANS = "Helvetica, Arial, sans-serif";
function arrows(k, x, y, s, col){ k.fillStyle = col; for (let i = 0; i < 2; i++){ const ox = x + i * s * 1.1; k.beginPath(); k.moveTo(ox + s / 2, y); k.lineTo(ox + s, y + s * .5); k.lineTo(ox + s * .68, y + s * .5); k.lineTo(ox + s * .68, y + s * 1.2); k.lineTo(ox + s * .32, y + s * 1.2); k.lineTo(ox + s * .32, y + s * .5); k.lineTo(ox, y + s * .5); k.closePath(); k.fill(); } }
function glass(k, x, y, s, col){ k.strokeStyle = col; k.lineWidth = s * .09; k.beginPath(); k.moveTo(x, y); k.lineTo(x + s * .8, y); k.quadraticCurveTo(x + s * .8, y + s * .7, x + s * .4, y + s * .75); k.quadraticCurveTo(x, y + s * .7, x, y); k.stroke();
  k.beginPath(); k.moveTo(x + s * .4, y + s * .75); k.lineTo(x + s * .4, y + s * 1.15); k.moveTo(x + s * .15, y + s * 1.15); k.lineTo(x + s * .65, y + s * 1.15); k.stroke();
  k.beginPath(); k.moveTo(x + s * .3, y + s * .1); k.lineTo(x + s * .45, y + s * .35); k.lineTo(x + s * .35, y + s * .5); k.stroke(); }
const boxFaces = {};
function boxTex(name, w, h, draw){
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter;
  const paint = () => { kraft(g, w, h); draw(g, w, h); t.needsUpdate = true; };
  paint(); boxFaces[name] = paint; return t;
}
const PIX = "GothicPixels"; const CONFIG_NAME = CONFIG.name;
const BT = {
  front: boxTex("front", 512, 564, (g, w, h) => {
    ink(g, (k) => { k.fillStyle = "#1b120a"; arrows(k, 34, 30, 34, "#1b120a"); k.font = `bold 20px ${SANS}`; k.fillText("THIS SIDE UP", 120, 62);
      k.textAlign = "center"; k.font = `112px "${PIX}", ${SANS}`; k.fillText("Dyvnyi", w / 2, 292);
      k.font = `bold 26px ${SANS}`; k.fillText("1 ROOM. HANDLE WITH CARE.", w / 2, 360);
      k.font = `16px ${SANS}`; k.fillText("CONTENTS: 1 PALM, 1 GUITAR, 1 DESIGNER", w / 2, 392);
      k.strokeStyle = "#1b120a"; k.lineWidth = 3; k.strokeRect(70, 170, w - 140, 250); });
  }),
  left: boxTex("left", 512, 564, (g, w, h) => {
    ink(g, (k) => { k.fillStyle = "#b3261e"; k.textAlign = "center"; k.font = `bold 78px ${SANS}`; k.fillText("FRAGILE", w / 2, 250); glass(k, w / 2 - 40, 290, 90, "#b3261e");
      k.fillStyle = "#1b120a"; k.font = `bold 18px ${SANS}`; k.fillText("DO NOT DROP. IT'S MY WHOLE ROOM.", w / 2, 460); });
  }),
  right: boxTex("right", 512, 564, (g, w, h) => {
    ink(g, (k) => { arrows(k, w / 2 - 75, 150, 68, "#1b120a"); k.fillStyle = "#1b120a"; k.textAlign = "center"; k.font = `bold 42px ${SANS}`; k.fillText("THIS SIDE UP", w / 2, 330);
      k.font = `bold 18px ${SANS}`; k.fillText("OPEN SLOWLY. SOMETHING DYVNYI INSIDE.", w / 2, 380); });
  }),
  back: boxTex("back", 512, 564, (g, w, h) => {
    g.save(); g.translate(w / 2, h / 2); g.rotate(-.04); g.fillStyle = "#f3efe6"; g.fillRect(-160, -110, 320, 220); g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(-160, 108, 320, 4);
    g.fillStyle = "#222"; g.font = `bold 14px ${SANS}`; g.fillText("TO:", -140, -78); g.font = `20px ${SANS}`; g.fillText("whoever's curious", -140, -52);
    g.font = `bold 14px ${SANS}`; g.fillText("FROM:", -140, -18); g.font = `20px ${SANS}`; g.fillText(CONFIG_NAME, -140, 8);
    for (let i = 0; i < 46; i++){ const bw = kraftRng() < .5 ? 2 : 4; g.fillRect(-140 + i * 6, 36, bw, 50); } g.restore();
  }),
  flap: boxTex("flap", 256, 512, (g, w, h) => { // half of the top, tape runs along the inner edge
    g.fillStyle = "rgba(205,170,110,.75)"; g.fillRect(w - 46, 0, 46, h); g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(w - 40, 0, 8, h);
    g.fillStyle = "rgba(90,60,20,.25)"; g.fillRect(w - 47, 0, 2, h);
  }),
  plain: boxTex("plain", 256, 256, () => {})
};
if (document.fonts && document.fonts.load) document.fonts.load(`40px "${PIX}"`).then(() => { Object.values(boxFaces).forEach((f) => f()); }).catch(() => {});
const inner = L(0x7a5530);
const faceMats = [];
function headFace(tex, w, h){
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(w, h), L(0xffffff, { map: tex, transparent: true }));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), inner.clone()); back.rotation.y = Math.PI; back.material.transparent = true;
  g.add(outer, back); faceMats.push(outer.material, back.material); return g;
}
const hinge = {};
hinge.front = new THREE.Group(); hinge.front.position.set(0, -HH / 2, HD / 2); headCube.add(hinge.front);
{ const f = headFace(BT.front, HW, HH); f.position.y = HH / 2; hinge.front.add(f); }
hinge.back = new THREE.Group(); hinge.back.position.set(0, -HH / 2, -HD / 2); headCube.add(hinge.back);
{ const f = headFace(BT.back, HW, HH); f.position.y = HH / 2; f.rotation.y = Math.PI; hinge.back.add(f); }
hinge.left = new THREE.Group(); hinge.left.position.set(HW / 2, -HH / 2, 0); headCube.add(hinge.left);
{ const f = headFace(BT.left, HD, HH); f.position.y = HH / 2; f.rotation.y = Math.PI / 2; hinge.left.add(f); }
hinge.right = new THREE.Group(); hinge.right.position.set(-HW / 2, -HH / 2, 0); headCube.add(hinge.right);
{ const f = headFace(BT.right, HD, HH); f.position.y = HH / 2; f.rotation.y = -Math.PI / 2; hinge.right.add(f); }
// two top flaps, taped down the middle
hinge.topL = new THREE.Group(); hinge.topL.position.set(-HW / 2, HH / 2, 0); headCube.add(hinge.topL);
{ const f = headFace(BT.flap, HW / 2, HD); f.rotation.x = -Math.PI / 2; f.position.x = HW / 4; hinge.topL.add(f); }
hinge.topR = new THREE.Group(); hinge.topR.position.set(HW / 2, HH / 2, 0); headCube.add(hinge.topR);
{ const f = headFace(BT.flap, HW / 2, HD); f.rotation.x = -Math.PI / 2; f.rotation.z = Math.PI; f.position.x = -HW / 4; hinge.topR.add(f); }
hinge.bottom = new THREE.Group(); hinge.bottom.position.set(0, -HH / 2, 0); headCube.add(hinge.bottom);
{ const f = headFace(BT.plain, HW, HD); f.rotation.x = Math.PI / 2; hinge.bottom.add(f); }
let opening = -1, dive = null, hopT = 3; const headLook = new THREE.Vector2();
headCube.traverse((o) => { if (o.isMesh){ o.castShadow = false; o.receiveShadow = false; } });

/* =====================================================================
   CAMERA: orbit + tweens + wall cutaway
   ===================================================================== */
const view = { yaw: .14, pitch: .58, dist: 7.6, tYaw: .14, tPitch: .58, tDist: 7.6 };
const camTarget = new THREE.Vector3(); let tween = null;
function followPose(){
  const k = Math.max(1, .9 / camera.aspect);
  const tx = clamp(avatar.position.x * .6, -1.6, 1.6), tz = clamp(avatar.position.z * .5, -1.4, 1.4);
  const look = new THREE.Vector3(tx, 1.0 + room.position.y, tz - .3); const d = view.dist * k;
  const pos = new THREE.Vector3(look.x + Math.sin(view.yaw) * Math.cos(view.pitch) * d, look.y + Math.sin(view.pitch) * d, look.z + Math.cos(view.yaw) * Math.cos(view.pitch) * d);
  return { pos, look };
}
function camTween(pos, look, dur, done){ tween = { p0: camera.position.clone(), l0: camTarget.clone(), p1: pos, l1: look, t: 0, dur, done, lCur: camTarget.clone() }; }
function resetView(){ view.tYaw = .14; view.tPitch = .58; view.tDist = 7.6; }
function updateCutaway(){ const p = camera.position; wallBack.visible = p.z > -3.3; wallLeft.visible = p.x > -3.3; wallRight.visible = p.x < 3.3; }
function gatePose(){ const d = 36 * Math.max(1, .8 / camera.aspect); return { pos: new THREE.Vector3(0, 6, d), look: new THREE.Vector3(0, HY - .6, 0) }; }

/* =====================================================================
   STATE + INPUT
   ===================================================================== */
let mode = "gate";
const keys = new Set(); let moveTarget = null, pendingAct = null, forceAct = false, afterWalk = null, sitting = false, sitT = 0, nearest = null, hovered = null, doorTarget = 0, doorAng = 0, falling = 0, stuck = 0, armWave = 0, idleT = 0;
const dist2 = (p) => { const dx = avatar.position.x - p[0], dz = avatar.position.z - p[1]; return dx * dx + dz * dz; };
function faceItem(id){ const it = ITEMS[id]; avatar.rotation.y = Math.atan2(it.pos[0] - avatar.position.x, it.pos[1] - avatar.position.z); }
function interact(id){ if (!id || mode !== "play") return; moveTarget = null; pendingAct = null; faceItem(id); emit("interact", id); }
function walkTo(id, then){ const it = ITEMS[id]; moveTarget = new THREE.Vector3(it.stand[0], 0, it.stand[1]); pendingAct = id; forceAct = true; afterWalk = then || null; stuck = 0; }
function arrive(id){ const cb = afterWalk; afterWalk = null; forceAct = false; if (cb){ faceItem(id); cb(); } else interact(id); }

const onKeyDown = (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (mode !== "play") return;
  if (e.target.closest && e.target.closest("input, textarea, [contenteditable]")) return;
  if (e.target.closest && e.target.closest("button, a") && (k === "Enter" || k === " ")) return;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(k)) e.preventDefault();
  if ((k === "e" || k === "Enter" || k === " ") && nearest){ interact(nearest); return; }
  if (k === "c"){ resetView(); return; }
  if (["w", "a", "s", "d", "z", "q", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k)){ keys.add(k); moveTarget = null; pendingAct = null; afterWalk = null; emit("moved"); }
};
const onKeyUp = (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
const onBlur = () => keys.clear();
addEventListener("keydown", onKeyDown); addEventListener("keyup", onKeyUp); addEventListener("blur", onBlur);

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
const ptrs = new Map(); let dragDist = 0, pinch0 = 0, mouse = { x: 0, y: 0, in: false };
function pick(x, y){ ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(interactiveMeshes, false).filter((h) => { let o = h.object; while (o){ if (!o.visible) return false; o = o.parent; } return true; });
  return hits.length ? hits[0].object.userData.iid : null; }
const ring = new THREE.Mesh(new THREE.RingGeometry(.12, .16, 20), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, depthWrite: false })); ring.rotation.x = -Math.PI / 2; scene.add(ring);
let ringT = 1;
canvas.addEventListener("pointerdown", (e) => {
  mouse.in = true;
  if (mode === "gate"){ emit("gateClick"); return; }
  if (mode !== "play") return; A.audio();
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragDist = 0;
  if (ptrs.size === 2){ const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
});
canvas.addEventListener("pointermove", (e) => {
  mouse = { x: e.clientX, y: e.clientY, in: true };
  const p = ptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2){ const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) view.tDist = clamp(view.tDist * pinch0 / d, 2.6, 13); pinch0 = d; dragDist = 99; return; }
  dragDist += Math.abs(dx) + Math.abs(dy);
  if (dragDist > (coarse ? 12 : 6)){ canvas.classList.add("dragging"); view.tYaw -= dx * .006; view.tPitch = clamp(view.tPitch + dy * .004, .12, 1.32); emit("moved"); }
});
function endPtr(e){
  const p = ptrs.get(e.pointerId); if (!p) return; ptrs.delete(e.pointerId); canvas.classList.remove("dragging");
  if (ptrs.size === 0 && dragDist <= (coarse ? 12 : 6) && mode === "play"){
    const id = pick(e.clientX, e.clientY);
    if (id){ const it = ITEMS[id]; if (dist2(it.pos) < it.r * it.r) interact(id); else { moveTarget = new THREE.Vector3(it.stand[0], 0, it.stand[1]); pendingAct = id; forceAct = false; stuck = 0; } return; }
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(floorPlane, hitP)){ moveTarget = hitP.clone(); pendingAct = null; afterWalk = null; stuck = 0; ring.position.set(hitP.x, .05 + room.position.y, hitP.z); ringT = 0; emit("moved"); }
  }
  if (ptrs.size < 2) pinch0 = 0;
}
canvas.addEventListener("pointerup", endPtr); canvas.addEventListener("pointercancel", endPtr);
canvas.addEventListener("pointerleave", () => { mouse.in = false; });
addEventListener("pointermove", (e) => { if (mode === "gate"){ headLook.set(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); } });
canvas.addEventListener("wheel", (e) => { if (mode !== "play") return; e.preventDefault(); view.tDist = clamp(view.tDist * (1 + e.deltaY * .0012), 2.6, 13); }, { passive: false });

/* =====================================================================
   LOOP
   ===================================================================== */
let walkPh = 0, stepAcc = 0, t0 = performance.now(), elapsed = 0, headYaw = 0, lastNearest = undefined, lastHover = undefined, raf = 0;
function update(dt){
  elapsed += dt; idleT += dt;
  let mx = 0, mz = 0, moving = false;
  if (mode === "play" && !sitting && !falling){
    let fwd = 0, side = 0;
    if (keys.has("w") || keys.has("ArrowUp") || keys.has("z")) fwd += 1;
    if (keys.has("s") || keys.has("ArrowDown")) fwd -= 1;
    if (keys.has("a") || keys.has("ArrowLeft") || keys.has("q")) side -= 1;
    if (keys.has("d") || keys.has("ArrowRight")) side += 1;
    if (fwd || side){ const sy = Math.sin(view.yaw), cy = Math.cos(view.yaw); mx = -sy * fwd + cy * side; mz = -cy * fwd - sy * side; }
    else if (moveTarget){
      const dx = moveTarget.x - avatar.position.x, dz = moveTarget.z - avatar.position.z, d = Math.hypot(dx, dz);
      if (d < .08){ moveTarget = null; if (pendingAct){ const id = pendingAct; pendingAct = null; if (forceAct || dist2(ITEMS[id].pos) < ITEMS[id].r ** 2) arrive(id); } }
      else { mx = dx / d; mz = dz / d; }
    }
    const len = Math.hypot(mx, mz);
    if (len > 0){
      mx /= len; mz /= len; let sp = 2.3 * dt; if (moveTarget && !keys.size) sp = Math.min(sp, Math.hypot(moveTarget.x - avatar.position.x, moveTarget.z - avatar.position.z)); const ox = avatar.position.x, oz = avatar.position.z;
      const nx = ox + mx * sp, nz = oz + mz * sp;
      if (!blocked(nx, oz)) avatar.position.x = nx;
      if (nz > BOUND.edge){ avatar.position.z = nz; falling = .001; moveTarget = null; pendingAct = null; }
      else if (!blocked(avatar.position.x, nz)) avatar.position.z = nz;
      const moved = Math.hypot(avatar.position.x - ox, avatar.position.z - oz);
      if (moved < sp * .2 && moveTarget){ stuck += dt; if (stuck > .35){ const id = pendingAct; moveTarget = null; pendingAct = null; if (id && (forceAct || dist2(ITEMS[id].pos) < (ITEMS[id].r + .5) ** 2)) arrive(id); } }
      const want = Math.atan2(mx, mz); let da = want - avatar.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
      avatar.rotation.y += da * Math.min(1, dt * 12); moving = moved > sp * .2; if (moving) idleT = 0;
    }
  }
  if (falling){ falling += dt; avatar.position.y -= falling * 9 * dt; avatar.rotation.x += dt * 2;
    if (falling > 1.4){ falling = 0; avatar.position.copy(SPAWN); avatar.rotation.set(0, Math.PI, 0); emit("fell"); } }

  // ---- avatar animation
  if (moving){ walkPh += dt * 8.5; stepAcc += dt; if (stepAcc > .36){ stepAcc = 0; A.step(); } }
  const amp = moving ? 1 : 0; const s = Math.sin(walkPh), c = Math.cos(walkPh); const breathe = Math.sin(elapsed * 1.8);
  if (sitting){
    sitT = Math.min(1, sitT + dt * 3); const k = ease(sitT);
    legs.forEach((l) => { l.thigh.rotation.x = -1.5 * k; l.knee.rotation.x = 1.45 * k; l.ankle.rotation.x = 0; });
    hips.position.y = lerp(.97, .58, k); torso.rotation.x = -.12 * k;
    arms.forEach((a, i) => { a.sh.rotation.x = -.4 * k; a.el.rotation.x = -.9 * k; a.sh.rotation.z = (i ? 1 : -1) * .15; });
  } else if (falling){
    arms.forEach((a, i) => { a.sh.rotation.z = (i ? 1 : -1) * (2.4 + Math.sin(elapsed * 20) * .3); a.el.rotation.x = -.5; });
    legs.forEach((l, i) => { l.thigh.rotation.x = Math.sin(elapsed * 14 + i * 3) * .6; l.knee.rotation.x = .6; });
  } else {
    hips.position.y = .97 + (moving ? Math.abs(c) * .025 - .01 : breathe * .003);
    hips.rotation.z = moving ? 0 : Math.sin(elapsed * .4) * .02; hips.rotation.y = s * .08 * amp;
    torso.rotation.y = -s * .14 * amp; torso.rotation.x = moving ? .06 : 0; torso.scale.y = 1 + breathe * .006;
    legs.forEach((l, i) => { const ph = i ? s : -s; const ph2 = i ? Math.sin(walkPh - 1.4) : -Math.sin(walkPh - 1.4);
      l.thigh.rotation.x = ph * .55 * amp; l.knee.rotation.x = Math.max(0, ph2) * amp + (moving ? .05 : .02); l.ankle.rotation.x = -l.knee.rotation.x * .3 + ph * .15 * amp; });
    arms.forEach((a, i) => { const ph = i ? -s : s;
      a.sh.rotation.x = ph * .5 * amp + (moving ? 0 : Math.sin(elapsed * .9 + i) * .03); a.el.rotation.x = -(.18 + Math.max(0, ph) * .45 * amp);
      a.sh.rotation.z = (i ? 1 : -1) * (.08 + breathe * .01); });
    if (armWave > 0){ armWave -= dt; const w = Math.min(1, armWave * 2, (1.6 - armWave) * 4); const a = arms[1];
      a.sh.rotation.z = lerp(a.sh.rotation.z, 2.5, w); a.sh.rotation.x = 0; a.el.rotation.x = 0; a.el.rotation.z = Math.sin(elapsed * 12) * .45 * w; } else arms[1].el.rotation.z = 0;
  }
  let lookYaw = 0; const focus = hovered || nearest;
  if (focus && !moving){ const it = ITEMS[focus]; const a = Math.atan2(it.pos[0] - avatar.position.x, it.pos[1] - avatar.position.z) - avatar.rotation.y; lookYaw = clamp(Math.atan2(Math.sin(a), Math.cos(a)), -.9, .9); }
  else if (idleT > 4) lookYaw = Math.sin(elapsed * .35) * .6;
  headYaw = lerp(headYaw, lookYaw, Math.min(1, dt * 4)); head.rotation.y = headYaw; head.rotation.x = moving ? .08 : Math.sin(elapsed * .5) * .03;

  // ---- nearest / hover -> React
  nearest = null; let best = 1e9;
  if (mode === "play" && !sitting && !falling) for (const id in ITEMS){ const it = ITEMS[id]; const d = dist2(it.pos); if (d < it.r * it.r && d < best){ best = d; nearest = id; } }
  hovered = (mode === "play" && mouse.in && !coarse && !ptrs.size) ? pick(mouse.x, mouse.y) : null;
  canvas.classList.toggle("hot", !!hovered);
  if (nearest !== lastNearest){ lastNearest = nearest; emit("nearest", nearest); }
  const hk = hovered ? hovered + (nearest === hovered ? "!" : "") : null;
  if (hk !== lastHover){ lastHover = hk; emit("hover", hovered ? { id: hovered, near: nearest === hovered } : null); }
  const show = hovered || nearest;
  if (show && mode === "play"){ const it = ITEMS[show]; marker.visible = true; marker.position.set(it.pos[0], room.position.y + it.h + Math.sin(elapsed * 4) * .05, it.pos[1]); marker.rotation.y += dt * 3; marker.scale.setScalar(nearest === show ? 1.2 : .9); }
  else marker.visible = false;

  // ---- world
  doorAng = lerp(doorAng, doorTarget, Math.min(1, dt * 5)); tDoor.rotation.y = doorAng;
  if (guitar.userData.wob){ guitar.userData.wob = Math.max(0, guitar.userData.wob - dt * 1.5); gCard.rotation.x = Math.sin(elapsed * 40) * .02 * guitar.userData.wob; }
  if (bamboo.userData.bounce){ bamboo.userData.bounce = Math.max(0, bamboo.userData.bounce - dt * 1.5); const b = bamboo.userData.bounce, q = Math.sin(b * 12) * .08 * b; bamboo.scale.set(1 + q, 1 - q, 1 + q); }
  bigPalm.rotation.y = .4 + Math.sin(elapsed * .7) * .03;
  fairy.forEach((m, i) => { const v = .65 + .35 * Math.sin(elapsed * 2 + i * 1.7); m.material.color.setRGB(1 * v, .85 * v, .62 * v); });
  let li = lampOn ? 1 : 0; if (lampFlicker > 0){ lampFlicker -= dt; li = Math.random() < .5 ? .2 : 1; }
  lampLight.intensity = 1.35 * li; shadeMat.emissiveIntensity = .05 + .9 * li; bulb.visible = li > .5; dustMat.opacity = .8 * li;
  amb.intensity = lampOn ? .55 : .3; hemi.intensity = lampOn ? .3 : .15; key.intensity = lampOn ? .35 : .12;
  screenLight.intensity = (lampOn ? 1 : 1.8) + Math.sin(elapsed * 9) * .05;
  if (!reduceMotion){
    room.position.y = Math.sin(elapsed * .6) * .06;
    debris.forEach((d) => { d.position.y = d.userData.base + Math.sin(elapsed * .8 + d.userData.ph) * .15; d.rotation.y += dt * .2; });
    const p = pg.attributes.position; for (let i = 0; i < PN; i++){ let y = p.getY(i) + dt * .25; if (y > 13) y = -13; p.setY(i, y); } p.needsUpdate = true;
    loo.rotation.z = Math.sin(elapsed * 1.3) * .04; loo.position.y = -.15 + Math.sin(elapsed * 1.1) * .08;
    if (mode !== "gate" && (elapsed * 30 | 0) % 2 === 0) swayCurtain(elapsed);
    for (let i = 0; i < DN; i++){ const q = dseed[i]; const t = elapsed * (.05 + q[3] * .05) + q[0] * 10;
      dp[i * 3] = -2.5 + Math.sin(t * 1.3 + q[1] * 6) * .7; dp[i * 3 + 1] = .3 + ((q[2] * 1.6 + t * .15) % 1.6); dp[i * 3 + 2] = .2 + Math.cos(t + q[0] * 6) * .7; }
    dg.attributes.position.needsUpdate = true;
  }
  if (!falling) avatar.position.y = room.position.y;
  blob.position.set(avatar.position.x, room.position.y + .04, avatar.position.z); blob.visible = !falling;
  lampLight.position.y = 1.5 + room.position.y;
  if (ringT < 1){ ringT += dt * 2; ring.material.opacity = (1 - ringT) * .9; ring.scale.setScalar(1 + ringT * 1.5); }

  // ---- cube head: idle, look at the cursor, blink, open
  if (headCube.visible){
    if (opening < 0){
      // something inside shifts every few seconds: a little hop and wobble
      hopT -= dt; const hp = hopT < 0 ? Math.max(0, 1 + hopT / .5) : 0; if (hopT < -.5) hopT = 3 + Math.random() * 3;
      const hop = Math.sin((1 - hp) * Math.PI) * (hp > 0 ? 1 : 0);
      headCube.rotation.y = lerp(headCube.rotation.y, -.6 + headLook.x * .35 + Math.sin(elapsed * .4) * .06, Math.min(1, dt * 3));
      headCube.rotation.x = lerp(headCube.rotation.x, .12 + headLook.y * .12, Math.min(1, dt * 3));
      headCube.rotation.z = Math.sin(elapsed * 25) * .02 * hop;
      headCube.position.y = HY + Math.sin(elapsed * 1.1) * .25 + hop * .5;
    } else {
      opening += dt; const o = opening;
      if (dive && o > (dive.skip ? 0 : 1.15)){ const d = dive; dive = null; const f = followPose(); camTween(f.pos, f.look, d.skip ? .8 : 2.4, () => { mode = "play"; armWave = 1.6; emit("entered"); }); }
      headCube.rotation.y = lerp(headCube.rotation.y, 0, Math.min(1, dt * 6)); headCube.rotation.x = lerp(headCube.rotation.x, 0, Math.min(1, dt * 6));
      const shake = o < .55 ? Math.sin(o * 60) * .06 * (1 - o / .55) : 0; headCube.position.x = shake;
      const k1 = ease(clamp((o - .5) / .7, 0, 1));            // flaps fold open
      const k2 = ease(clamp((o - .95) / .9, 0, 1));           // walls unfold
      hinge.topL.rotation.z = 2.3 * k1; hinge.topR.rotation.z = -2.3 * ease(clamp((o - .62) / .7, 0, 1));
      hinge.front.rotation.x = 1.62 * k2; hinge.back.rotation.x = -1.62 * k2;
      hinge.left.rotation.z = -1.62 * k2; hinge.right.rotation.z = 1.62 * k2;
      hinge.bottom.position.y = -HH / 2 - 6 * k2 * k2;
      const fade = 1 - clamp((o - 1.5) / .8, 0, 1);
      faceMats.forEach((m) => { m.opacity = fade; }); headCube.rotation.z = 0;
      if (o > 2.4){ headCube.visible = false; scene.fog.near = 16; scene.fog.far = 40; }
    }
  }

  // ---- camera
  const a = 1 - Math.exp(-dt * 8);
  view.yaw = lerp(view.yaw, view.tYaw, a); view.pitch = lerp(view.pitch, view.tPitch, a); view.dist = lerp(view.dist, view.tDist, a);
  if (tween){
    tween.t += dt / tween.dur; const k = ease(Math.min(1, tween.t));
    camera.position.lerpVectors(tween.p0, tween.p1, k); tween.lCur.lerpVectors(tween.l0, tween.l1, k); camTarget.copy(tween.lCur); camera.lookAt(camTarget);
    if (tween.t >= 1){ const d = tween.done; tween = null; if (d) d(); }
  } else if (mode === "gate" || mode === "opening"){
    const g = gatePose(); camera.position.copy(g.pos); camTarget.copy(g.look); camera.lookAt(camTarget);
  } else if (mode === "os" || mode === "zoom"){ /* hold */ }
  else { const f = followPose(); const b = 1 - Math.exp(-dt * 5); camera.position.lerp(f.pos, b); camTarget.lerp(f.look, b); camera.lookAt(camTarget); }
  updateCutaway();
  post.uniforms.uTime.value = elapsed;
}
function frame(now){
  const dt = Math.min(.05, (now - t0) / 1000); t0 = now; update(dt);
  if (mode !== "os"){
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  }
  raf = requestAnimationFrame(frame);
}
scene.fog.near = 60; scene.fog.far = 220; // the box sits further out than the room
raf = requestAnimationFrame(frame);

/* =====================================================================
   PUBLIC API (used by React)
   ===================================================================== */
return {
  on, items: ITEMS, coarse,
  get mode(){ return mode; },
  setMode(m){ mode = m; if (m !== "play"){ keys.clear(); moveTarget = null; } },
  openHead(skip){
    mode = "opening"; opening = 0; A.rip(); setTimeout(() => A.thud(), 1100); setTimeout(() => A.whoosh(), 1300);
    dive = { skip: !!(skip || reduceMotion) }; if (dive.skip) opening = 2;
  },
  walkTo, interact, faceItem, resetView,
  stopWalking(){ moveTarget = null; pendingAct = null; afterWalk = null; },
  zoomToScreen(done){
    mode = "zoom"; faceItem("work"); const look = SCREEN_POS.clone(); look.y += room.position.y;
    const to = look.clone().add(new THREE.Vector3(0, 0, .62 * (camera.aspect < 1 ? 1.9 : 1)));
    camTween(to, look, 1.15, () => { mode = "os"; done && done(); });
  },
  zoomOut(done){ mode = "zoom"; const f = followPose(); camTween(f.pos, f.look, 1.0, () => { mode = "play"; done && done(); }); },
  toggleLamp(){ lampOn = !lampOn; lampFlicker = lampOn ? .45 : 0; A.click(); return lampOn; },
  strum(){ A.strum(); guitar.userData.wob = 1; },
  waterPlant(){ bamboo.userData.bounce = 1; A.noise(.5, 1800, 600, .12); },
  sit(){ sitT = 0; sitting = true; avatar.position.set(2.42, 0, 1.15); avatar.rotation.y = -Math.PI / 2; moveTarget = null; },
  stand(){ if (!sitting) return; sitting = false; avatar.position.set(1.75, 0, 1.15); },
  openToilet(){ loo.visible = true; doorTarget = -1.45; },
  closeToilet(){ doorTarget = 0; setTimeout(() => { if (doorTarget === 0) loo.visible = false; }, 900); },
  wave(){ armWave = 1.6; },
  dispose(){ cancelAnimationFrame(raf); removeEventListener("keydown", onKeyDown); removeEventListener("keyup", onKeyUp); removeEventListener("blur", onBlur); renderer.dispose(); }
};
}
