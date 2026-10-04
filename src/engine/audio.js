// Everything is synthesised in the browser: no audio files.
let AC = null, master = null, fx = null, ambBus = null, verb = null, ambientOn = false, muted = false;
const pluckCache = {};

export function audio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = 0.8; master.connect(AC.destination);
      fx = AC.createGain(); fx.gain.value = 0.6; fx.connect(master);
      ambBus = AC.createGain(); ambBus.gain.value = 0; ambBus.connect(master);
      verb = AC.createConvolver();
      const len = AC.sampleRate * 3.2, ir = AC.createBuffer(2, len, AC.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      verb.buffer = ir; const vg = AC.createGain(); vg.gain.value = 0.5; verb.connect(vg).connect(master);
    } catch (e) { return null; }
  }
  if (AC.state === "suspended") AC.resume();
  return AC;
}
export const isMuted = () => muted;
export function setMuted(m) { muted = m; if (AC) master.gain.setTargetAtTime(m ? 0 : 0.8, AC.currentTime, 0.05); }

export function blip(f = 880, d = 0.06, type = "square", v = 0.05, slide = 0) {
  if (!AC) return; const t = AC.currentTime; const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(fx); o.start(t); o.stop(t + d + 0.02);
}
export function bell(f, when = 0, v = 0.05, toAmb = false) {
  if (!AC) return; const t = AC.currentTime + when;
  const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain(), g2 = AC.createGain();
  o.type = o2.type = "sine"; o.frequency.value = f; o2.frequency.value = f * 2.01; g2.gain.value = 0.25;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
  o.connect(g); o2.connect(g2).connect(g); g.connect(toAmb ? ambBus : fx); g.connect(verb);
  o.start(t); o2.start(t); o.stop(t + 2.5); o2.stop(t + 2.5);
}
export function noise(d, f0, f1, v) {
  if (!AC) return; const t = AC.currentTime; const n = Math.floor(AC.sampleRate * d);
  const b = AC.createBuffer(1, n, AC.sampleRate); const ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
  const s = AC.createBufferSource(); s.buffer = b; const fl = AC.createBiquadFilter(); fl.type = "lowpass";
  fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + d);
  const g = AC.createGain(); g.gain.setValueAtTime(v, t); g.gain.linearRampToValueAtTime(v * 0.8, t + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl).connect(g).connect(fx); s.start(t);
}
function pluck(freq, when, v = 0.22) {
  if (!AC) return; const sr = AC.sampleRate; let buf = pluckCache[freq];
  if (!buf) {
    const N = Math.round(sr / freq), len = Math.floor(sr * 2.6); buf = AC.createBuffer(1, len, sr); const d = buf.getChannelData(0);
    for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1;
    for (let i = N; i < len; i++) d[i] = 0.4985 * (d[i - N] + d[i - N + 1 < i ? i - N + 1 : i - N]);
    pluckCache[freq] = buf;
  }
  const s = AC.createBufferSource(); s.buffer = buf; const g = AC.createGain(); g.gain.value = v; s.connect(g); g.connect(fx); g.connect(verb); s.start(AC.currentTime + when);
}
export const strum = () => [82.41, 123.47, 164.81, 196.0, 246.94, 329.63].forEach((f, i) => pluck(f, i * 0.028));
export const flush = () => noise(1.8, 2400, 260, 0.35);
export const step = () => noise(0.06, 700, 200, 0.04);
export const click = () => { blip(1600, 0.02, "square", 0.04); setTimeout(() => blip(900, 0.03, "square", 0.03), 40); };
export const uiOpen = () => blip(520, 0.1, "triangle", 0.05, 2);
export const uiBack = () => blip(700, 0.09, "triangle", 0.045, 0.5);
export const uiMove = () => blip(1180, 0.03, "triangle", 0.035);
export const typeTick = () => blip(900 + Math.random() * 500, 0.018, "square", 0.012);
export const nudge = () => [660, 880].forEach((f, i) => setTimeout(() => blip(f, 0.08, "triangle", 0.05), i * 90));
export const chime = () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, i * 0.12, 0.05));
export const creak = () => { if (!AC) return; const t = AC.currentTime; const o = AC.createOscillator(), g = AC.createGain(), fl = AC.createBiquadFilter();
  o.type = "sawtooth"; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(140, t + 0.5); o.frequency.linearRampToValueAtTime(55, t + 0.9);
  fl.type = "bandpass"; fl.frequency.value = 600; fl.Q.value = 6; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.08, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
  o.connect(fl).connect(g).connect(fx); o.start(t); o.stop(t + 1.05); };
export const rip = () => { noise(.55, 6000, 1500, .16); setTimeout(() => noise(.25, 4000, 900, .1), 260); };
export const whoosh = () => noise(1.4, 300, 3000, 0.12);
export const thud = () => { blip(90, 0.3, "sine", 0.18, 0.5); noise(0.25, 900, 100, 0.12); };

export function startAmbient() {
  if (!AC || ambientOn) return; ambientOn = true;
  ambBus.gain.setTargetAtTime(1, AC.currentTime, 2);
  const n = AC.sampleRate * 4, b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0); let last = 0;
  for (let i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3; }
  const src = AC.createBufferSource(); src.buffer = b; src.loop = true; const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380;
  const rg = AC.createGain(); rg.gain.value = 0.05; src.connect(lp).connect(rg).connect(ambBus); src.start();
  const padBus = AC.createGain(); padBus.gain.value = 0.032; const pf = AC.createBiquadFilter(); pf.type = "lowpass"; pf.frequency.value = 900; pf.Q.value = 0.7;
  const lfo = AC.createOscillator(), lfoG = AC.createGain(); lfo.frequency.value = 0.07; lfoG.gain.value = 380; lfo.connect(lfoG).connect(pf.frequency); lfo.start();
  padBus.connect(pf); pf.connect(ambBus); pf.connect(verb);
  const chords = [[174.61, 220.0, 261.63, 329.63], [146.83, 220.0, 261.63, 349.23], [130.81, 196.0, 246.94, 329.63], [164.81, 196.0, 246.94, 293.66]];
  let ci = 0;
  const playChord = () => { const t = AC.currentTime; chords[ci++ % chords.length].forEach((f) => [-6, 6].forEach((det) => {
    const o = AC.createOscillator(), g = AC.createGain(); o.type = "triangle"; o.frequency.value = f; o.detune.value = det;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 3); g.gain.setValueAtTime(0.5, t + 6); g.gain.linearRampToValueAtTime(0, t + 10.5);
    o.connect(g).connect(padBus); o.start(t); o.stop(t + 11); })); };
  playChord(); setInterval(playChord, 8000);
  const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  const sparkle = () => { bell(notes[(Math.random() * notes.length) | 0], 0, 0.018, true); setTimeout(sparkle, 3000 + Math.random() * 6000); };
  setTimeout(sparkle, 2500);
}
