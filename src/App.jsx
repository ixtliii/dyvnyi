import { useEffect, useRef, useState } from "react";
import { createEngine } from "./engine/engine.js";
import * as A from "./engine/audio.js";
import { CONFIG, CHATS } from "./content.js";
import { XPWindow, Taskbar, StartMenu, Balloons, Icon } from "./ui/xp.jsx";
import Chat from "./ui/Chat.jsx";
import Desktop, { APPS, appMeta } from "./ui/Desktop.jsx";

const resolve = (v) => (typeof v === "function" ? v() : v);
let bid = 0, ckey = 0;

export default function App() {
  const canvasRef = useRef(null), eng = useRef(null), tipRef = useRef(null), mouse = useRef({ x: 0, y: 0 }), zTop = useRef(10), winN = useRef(0), achieved = useRef(new Set());
  const [phase, setPhase] = useState("loading");          // loading | gate | opening | room | os
  const [progress, setProgress] = useState(0);
  const [nearest, setNearest] = useState(null);
  const [hover, setHover] = useState(null);
  const [chat, setChat] = useState(null);
  const [balloons, setBalloons] = useState([]);
  const [startOpen, setStartOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [wins, setWins] = useState([]);
  const [meme, setMeme] = useState(false);
  const [flash, setFlash] = useState(false);
  const skipRef = useRef(false);
  const coarse = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;

  /* ---------- helpers ---------- */
  const balloon = (title, text, icon) => setBalloons((b) => [...b.slice(-2), { id: ++bid, title, text, icon }]);
  const achieve = (id, title, text) => { if (achieved.current.has(id)) return; achieved.current.add(id); balloon(title, text, Icon.star()); A.bell(988, 0, .04); A.bell(1318, .1, .04); };
  const openChat = (id) => {
    const s = CHATS[id]; eng.current.setMode("busy"); setStartOpen(false);
    setChat({ key: ++ckey, item: id, lines: resolve(s.lines), choices: resolve(s.choices) });
  };
  const closeChat = () => { setChat((c) => { if (c && c.item === "couch") eng.current.stand(); return null; }); A.uiBack(); if (eng.current.mode === "busy") eng.current.setMode("play"); };

  const openWin = (id) => {
    A.audio(); A.blip(660, .07, "triangle", .04, 1.5);
    setWins((ws) => {
      const ex = ws.find((w) => w.id === id); if (ex) return ws.map((w) => (w.id === id ? { ...w, min: false, z: ++zTop.current } : w));
      const n = winN.current++ % 6, narrow = innerWidth < 640;
      return [...ws, { id, z: ++zTop.current, min: false, x: narrow ? 6 : Math.min(140 + n * 40, innerWidth - 540), y: narrow ? 8 + (n % 3) * 14 : 40 + n * 30 }];
    });
    if (id === "trash") achieve("trash", "Digging", "You checked the trash.");
  };
  const closeWin = (id) => { setWins((ws) => ws.filter((w) => w.id !== id)); A.blip(500, .06, "triangle", .035, .6); };
  const focusWin = (id) => setWins((ws) => { const t = ws.find((w) => w.id === id); if (!t || t.z === zTop.current) return ws; return ws.map((w) => (w.id === id ? { ...w, z: ++zTop.current } : w)); });
  const minimizeWin = (id) => setWins((ws) => ws.map((w) => (w.id === id ? { ...w, min: true } : w)));
  const copyEmail = async () => { try { await navigator.clipboard.writeText(CONFIG.email); balloon("Copied", CONFIG.email + " is on your clipboard."); } catch (e) { balloon("Copy this", CONFIG.email); } };

  const openComputer = (first) => {
    setChat(null); setStartOpen(false);
    eng.current.zoomToScreen(() => {
      setFlash(true); A.bell(392, 0, .04); A.bell(587.33, .08, .04); A.bell(783.99, .16, .05);
      setTimeout(() => { setPhase("os"); setFlash(false); if (first) openWin(first); achieve("os", "Logged in", "One click opens anything here."); }, 220);
    });
  };
  const exitComputer = () => { setWins([]); setStartOpen(false); setPhase("room"); A.blip(300, .3, "sine", .05, .5); eng.current.zoomOut(); };

  const ACTIONS = {
    work: () => openComputer(),
    lab: () => { openChat("lab"); achieve("lab", "Nosy", "You looked at the messy desk too."); },
    guitar: () => { eng.current.strum(); openChat("guitar"); },
    contact: () => openChat("contact"),
    couch: () => { eng.current.sit(); openChat("couch"); },
    stairs: () => { A.blip(220, .15, "square", .035, .7); openChat("stairs"); achieve("stairs", "Explorer", "You tried the stairs."); },
    plant: () => { eng.current.waterPlant(); balloon("Lucky bamboo", "the plant looks a little happier. hydration is design too."); achieve("plant", "Green thumb", "You watered the plant."); },
    lamp: () => { const on = eng.current.toggleLamp(); balloon(on ? "Lamp on" : "Lamp off", on ? "and there was light." : "moody. i like it."); },
    toilet: () => { eng.current.setMode("busy"); eng.current.openToilet(); A.blip(180, .25, "sawtooth", .03, 1.4); setTimeout(() => { A.flush(); setMeme(true); setTimeout(() => achieve("toilet", "Wrong door", "Every room has one."), 500); }, 1600); }
  };
  const chatAction = async (a) => {
    if (a === "close") { closeChat(); return "closed"; }
    if (a.startsWith("go:")) { closeChat(); eng.current.walkTo(a.slice(3)); return "closed"; }
    if (a.startsWith("os:")) { closeChat(); const app = a.slice(3); eng.current.walkTo("work", () => openComputer(app)); return "closed"; }
    if (a === "strum") { eng.current.strum(); return { lines: ["(plays an e minor chord. mostly in tune.)"] }; }
    if (a === "copy:email") { await copyEmail(); return { lines: ["copied. talk soon :)"] }; }
    if (a === "mailto") { location.href = `mailto:${CONFIG.email}`; return { lines: ["opening your mail app..."] }; }
    if (a.startsWith("link:")) { window.open(a.slice(5), "_blank", "noopener"); return { lines: ["opened it in a new tab."] }; }
    return null;
  };
  const act = useRef(); act.current = { ACTIONS, enter: () => enter(false) };

  /* ---------- engine ---------- */
  useEffect(() => {
    const e = createEngine(canvasRef.current); eng.current = e;
    const offs = [
      e.on("progress", setProgress), e.on("ready", () => setPhase((p) => (p === "loading" ? "gate" : p))),
      e.on("nearest", setNearest), e.on("hover", setHover),
      e.on("interact", (id) => act.current.ACTIONS[id] && act.current.ACTIONS[id]()),
      e.on("gateClick", () => act.current.enter()),
      e.on("entered", () => { setPhase("room"); if (skipRef.current) setTimeout(() => e.walkTo("work"), 200); else setTimeout(() => openChat("welcome"), 700); }),
      e.on("fell", () => { balloon("Whoops", "there's nothing out there."); achieve("void", "Into the void", "You found the edge of the world."); })
    ];
    const mv = (ev) => { mouse.current = { x: ev.clientX, y: ev.clientY }; if (tipRef.current) { tipRef.current.style.left = ev.clientX + "px"; tipRef.current.style.top = ev.clientY + "px"; } };
    addEventListener("pointermove", mv);
    return () => { offs.forEach((f) => f()); removeEventListener("pointermove", mv); e.dispose(); };
  }, []);

  function enter(skip) {
    if (phase !== "gate" && eng.current.mode !== "gate") return;
    skipRef.current = skip; A.audio(); A.startAmbient(); A.chime(); setPhase("opening"); eng.current.openHead(skip);
  }

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const k = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (phase === "gate") { if (key === "Enter" || key === " ") { if (document.activeElement?.dataset?.skip) return; e.preventDefault(); enter(false); } return; }
      if (key === "Escape") {
        if (meme) return closeMeme();
        if (startOpen) return setStartOpen(false);
        if (chat) return closeChat();
        if (phase === "os") { const vis = wins.filter((w) => !w.min); if (vis.length) closeWin(vis.reduce((a, w) => (w.z > a.z ? w : a)).id); else exitComputer(); }
        return;
      }
      if (phase === "room" && !chat && !meme && !e.target.closest?.("button, a")) {
        if (key === "h") openChat("welcome");
        if (key === "m") toggleSound();
      }
    };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  });

  const toggleSound = () => { A.audio(); A.startAmbient(); const m = !muted; A.setMuted(m); setMuted(m); };
  const closeMeme = () => { setMeme(false); eng.current.closeToilet(); eng.current.setMode("play"); A.uiBack(); };
  const go = (id) => { setStartOpen(false); if (chat) closeChat(); eng.current.setMode("play"); eng.current.stand(); eng.current.walkTo(id); };

  /* ---------- start menu contents ---------- */
  const roomMenu = {
    left: [
      { label: "Work", sub: "On the computer", icon: Icon.computer(), onClick: () => go("work") },
      { label: "Side projects", sub: "The side desk", icon: Icon.desk(), onClick: () => go("lab") },
      { label: "About me", sub: "By the guitar", icon: Icon.guitar(), onClick: () => go("guitar") },
      { label: "Showreel", sub: CONFIG.showreel.comingSoon ? "Coming soon" : "On the couch", icon: Icon.couch(), onClick: () => go("couch") },
      { label: "Contact", sub: "Front door", icon: Icon.door(), onClick: () => go("contact") }
    ],
    right: [
      { label: "Reset camera", icon: Icon.eye(), onClick: () => { setStartOpen(false); eng.current.resetView(); } },
      { label: "Controls", icon: Icon.help(), onClick: () => { setStartOpen(false); openChat("welcome"); } },
      { label: muted ? "Turn sound on" : "Mute sound", icon: Icon.film(), onClick: () => { toggleSound(); } }
    ],
    foot: [{ label: "Log off", icon: Icon.back(), onClick: () => location.reload() }]
  };
  const osMenu = {
    left: Object.entries(APPS).filter(([id]) => id !== "trash").map(([id, a]) => ({ label: a.title, icon: a.icon(), onClick: () => { setStartOpen(false); openWin(id); } })),
    right: [{ label: "Trash", icon: Icon.trash(), onClick: () => { setStartOpen(false); openWin("trash"); } }, "-", { label: "Back to the room", icon: Icon.back(), onClick: exitComputer }],
    foot: [{ label: "Turn off computer", icon: Icon.power(), onClick: exitComputer }]
  };

  /* ---------- taskbar tasks ---------- */
  const topWin = wins.filter((w) => !w.min).reduce((a, w) => (!a || w.z > a.z ? w : a), null);
  const tasks = phase === "os"
    ? wins.map((w) => { const m = appMeta(w.id); return { id: w.id, title: m.title, icon: m.icon(), active: topWin && topWin.id === w.id }; })
    : [{ id: "room", title: "Dyvnyi - Room", icon: Icon.computer(), active: !chat }, ...(chat ? [{ id: "chat", title: `${CONFIG.name.split(" ")[0]} - Conversation`, icon: Icon.chat(), active: true }] : [])];
  const onTask = (id) => { if (phase !== "os") return; const w = wins.find((x) => x.id === id); if (!w) return; if (topWin && topWin.id === id) minimizeWin(id); else openWin(id); };

  const inRoom = phase === "room";
  const showPrompt = inRoom && nearest && !chat && !meme;

  return (
    <>
      <canvas ref={canvasRef} className="stage" aria-label="A 3D version of Artem's room. Open the start menu to jump to any section." />

      {(phase === "loading" || phase === "gate" || phase === "opening") && (
        <div className={`gate ${phase === "opening" ? "out" : ""}`}>
          <div />
          <div className="mid">
            <div className="cta">
              {phase === "loading"
                ? <><div className="xpbar" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Loading"><i /><i /><i /></div><p>Loading the room</p></>
                : <><button className="xbtn primary" onClick={() => enter(false)} style={{ fontSize: 15, padding: "8px 18px" }}>{coarse ? "Tap" : "Click"} to look inside</button><p>Best with sound on.</p></>}
            </div>
          </div>
          <div className="foot"><span>{CONFIG.name}<br />{CONFIG.role}</span>{phase !== "loading" && <button data-skip="1" onClick={() => enter(true)}>Skip straight to the work</button>}</div>
        </div>
      )}

      {(inRoom || phase === "os") && phase !== "os" && <div className="mark"><span className="px">Dyvnyi</span><small>{CONFIG.name}</small></div>}

      {phase === "os" && <Desktop wins={wins} open={openWin} close={closeWin} focus={focusWin} minimize={minimizeWin} copy={copyEmail} />}

      {inRoom && hover && !chat && !meme && <div className="xtip" ref={tipRef} style={{ left: mouse.current.x, top: mouse.current.y }}>{eng.current.items[hover.id].short}{hover.near ? "" : " (click to walk there)"}</div>}

      <div className={`prompt ${showPrompt ? "" : "off"}`}>
        <button className="xbtn" onClick={() => nearest && eng.current.interact(nearest)}>{nearest ? eng.current.items[nearest].label : ""} <kbd>{coarse ? "Tap" : "E"}</kbd></button>
      </div>

      {chat && inRoom && <Chat script={chat} onAction={chatAction} onClose={closeChat} active z={700} />}

      {meme && (
        <div className="scrim" style={{ background: "rgba(0,0,0,.6)" }}>
          <XPWindow title="you_found_it.jpg" icon={Icon.file("#3a76e0")} onClose={closeMeme} x={Math.max(6, innerWidth / 2 - Math.min(520, innerWidth - 12) / 2)} y={Math.max(6, innerHeight / 2 - 260)} w={Math.min(520, innerWidth - 12)} z={890}>
            <div className="xbody"><MemeImage /><div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}><button className="xbtn" autoFocus onClick={closeMeme}>Close the door, quietly</button></div></div>
          </XPWindow>
        </div>
      )}

      {(inRoom || phase === "os") && (
        <>
          {startOpen && <div className="scrim" onPointerDown={() => setStartOpen(false)} />}
          {startOpen && <StartMenu {...(phase === "os" ? osMenu : roomMenu)} onClose={() => setStartOpen(false)} />}
          <Taskbar startOpen={startOpen} onStart={() => { A.audio(); A.uiMove(); setStartOpen((s) => !s); }} tasks={tasks} onTask={onTask} muted={muted} onSound={toggleSound} />
        </>
      )}
      <Balloons items={balloons} onClose={(id) => setBalloons((b) => b.filter((x) => x.id !== id))} />
      <div className={`flash ${flash ? "on" : ""}`} />
    </>
  );
}

function MemeImage() {
  const ref = useRef(null);
  useEffect(() => {
    const g = ref.current.getContext("2d"); const W = 160, H = 120; let s = 3; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#1a1430"); gr.addColorStop(1, "#040308"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = "#b0a8d8"; for (let i = 0; i < 40; i++) g.fillRect(r() * W | 0, r() * H | 0, 1, 1);
    g.fillStyle = "#cfcac0"; g.fillRect(48, 92, 64, 8); g.fillStyle = "#a9a397"; g.fillRect(48, 100, 64, 4);
    g.fillStyle = "#2a2338"; g.beginPath(); g.moveTo(52, 104); g.lineTo(108, 104); g.lineTo(80, 118); g.fill();
    g.fillStyle = "#fff"; g.fillRect(90, 46, 16, 30); g.fillRect(62, 64, 34, 10); g.fillStyle = "#e9eef8"; g.fillRect(64, 74, 26, 10); g.fillRect(68, 84, 18, 8);
    g.fillStyle = "#c9d3e6"; g.fillRect(64, 66, 26, 3); g.fillRect(104, 48, 2, 26); g.fillStyle = "#fff"; g.fillRect(40, 70, 8, 8);
  }, []);
  return (<div className="memeimg"><canvas ref={ref} width="160" height="120" /><div className="cap top">{CONFIG.meme.top.replace("{n}", CONFIG.work.length + CONFIG.lab.length)}</div><div className="cap bot">{CONFIG.meme.bottom}</div></div>);
}
