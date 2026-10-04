import { useEffect, useRef, useState } from "react";
import TEX from "../assets/tex.json";
import { CONFIG } from "../content.js";

/* ---------------- icons (drawn for this project) ---------------- */
const S = (p) => ({ viewBox: "0 0 32 32", "aria-hidden": true, ...p });
export const Icon = {
  folder: (c = "#f5c94a") => <svg {...S()}><path d="M2 8h11l3 3h14v16H2z" fill="#c4932a" /><path d="M2 12h28v15H2z" fill={c} /><path d="M2 12h28v3H2z" fill="#fff" opacity=".35" /></svg>,
  doc: () => <svg {...S()}><path d="M7 3h13l6 6v20H7z" fill="#fff" stroke="#7a8aa6" /><path d="M20 3v6h6" fill="#dfe6f2" stroke="#7a8aa6" /><path d="M10 13h12M10 16h12M10 19h12M10 22h8" stroke="#4a6fb5" /></svg>,
  mail: () => <svg {...S()}><rect x="3" y="7" width="26" height="18" rx="1" fill="#fdfbf3" stroke="#8a7f5a" /><path d="M3 8l13 10L29 8" fill="none" stroke="#c7463d" strokeWidth="2" /></svg>,
  film: () => <svg {...S()}><rect x="3" y="6" width="26" height="20" rx="2" fill="#2b2b33" /><path d="M5 8h2v2H5zM5 14h2v2H5zM5 20h2v2H5zM25 8h2v2h-2zM25 14h2v2h-2zM25 20h2v2h-2z" fill="#fff" /><path d="M13 11l7 5-7 5z" fill="#7cd35a" /></svg>,
  trash: () => <svg {...S()}><path d="M8 9h16l-2 19H10z" fill="#e8edf4" stroke="#7a8aa6" /><path d="M6 6h20v3H6z" fill="#b9c4d6" /><path d="M13 3h6v3h-6z" fill="#9aa8bf" /><path d="M13 13v11M19 13v11" stroke="#7a8aa6" /></svg>,
  computer: () => <svg {...S()}><rect x="4" y="4" width="24" height="17" rx="2" fill="#d8dce6" /><rect x="6" y="6" width="20" height="13" fill="#3a76e0" /><path d="M11 24h10l2 4H9z" fill="#c0c5d1" /></svg>,
  guitar: () => <svg {...S()}><path d="M20 4l4 4-6 6" stroke="#5a3a1a" strokeWidth="2.5" fill="none" /><circle cx="11" cy="21" r="7" fill="#2a2a2a" /><circle cx="15" cy="17" r="4.5" fill="#2a2a2a" /><circle cx="11" cy="21" r="2" fill="#000" /></svg>,
  couch: () => <svg {...S()}><rect x="3" y="12" width="26" height="10" rx="3" fill="#33333d" /><rect x="6" y="8" width="20" height="8" rx="2" fill="#44444f" /><path d="M5 22v4M27 22v4" stroke="#222" strokeWidth="2" /></svg>,
  door: () => <svg {...S()}><rect x="8" y="3" width="16" height="26" fill="#5a3320" /><circle cx="20" cy="17" r="1.5" fill="#e7c36a" /></svg>,
  desk: () => <svg {...S()}><rect x="3" y="14" width="26" height="3" fill="#f2f0ea" stroke="#999" /><path d="M6 17v10M26 17v10" stroke="#999" strokeWidth="2" /><path d="M20 14V6" stroke="#4a7a2a" strokeWidth="2" /><path d="M20 8l-5-3M20 9l5-3M20 11l-6 0M20 11l6 1" stroke="#5aa03a" strokeWidth="2" /></svg>,
  eye: () => <svg {...S()}><path d="M2 16s5-8 14-8 14 8 14 8-5 8-14 8S2 16 2 16z" fill="#fff" stroke="#3a5a9a" /><circle cx="16" cy="16" r="5" fill="#3a76e0" /><circle cx="16" cy="16" r="2" fill="#000" /></svg>,
  help: () => <svg {...S()}><circle cx="16" cy="16" r="13" fill="#3a76e0" /><text x="16" y="22" fontSize="17" fontFamily="Tahoma" fontWeight="700" fill="#fff" textAnchor="middle">?</text></svg>,
  power: () => <svg {...S()}><rect x="2" y="2" width="28" height="28" rx="5" fill="#e0522a" stroke="#fff" /><path d="M11 11a8 8 0 1 0 10 0" stroke="#fff" strokeWidth="2.5" fill="none" /><path d="M16 7v9" stroke="#fff" strokeWidth="2.5" /></svg>,
  back: () => <svg {...S()}><rect x="2" y="2" width="28" height="28" rx="5" fill="#e8a23a" stroke="#fff" /><path d="M18 9l-7 7 7 7" stroke="#fff" strokeWidth="3" fill="none" /></svg>,
  speaker: (m) => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10L5 10H2z" fill="#fff" />{m ? <path d="M11 6l4 4M15 6l-4 4" stroke="#ff8a7a" strokeWidth="1.6" /> : <path d="M11 5.5c1 .8 1 4.2 0 5M13 3.5c2 1.8 2 7.2 0 9" stroke="#fff" fill="none" strokeWidth="1.2" />}</svg>,
  info: () => <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#3a76e0" /><path d="M8 7v5M8 4v1.5" stroke="#fff" strokeWidth="1.8" /></svg>,
  star: () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1l2 4.6 5 .5-3.8 3.3 1.1 4.9L8 11.8 3.7 14.3l1.1-4.9L1 6.1l5-.5z" fill="#f5c94a" stroke="#b07a10" /></svg>,
  chat: () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12v8H7l-3 3v-3H2z" fill="#fff" stroke="#2a5aa8" /><circle cx="5.5" cy="7" r="1" fill="#2a5aa8" /><circle cx="8" cy="7" r="1" fill="#2a5aa8" /><circle cx="10.5" cy="7" r="1" fill="#2a5aa8" /></svg>,
  globe: () => <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#3a8ee6" stroke="#1d5bb0" /><path d="M1 8h14M8 1c-3 3-3 11 0 14M8 1c3 3 3 11 0 14M2.5 4.5h11M2.5 11.5h11" stroke="#d9ecff" strokeWidth=".8" fill="none" /></svg>,
  file: (c) => <svg {...S()}><path d="M6 3h14l6 6v20H6z" fill={c} /><path d="M8 6h10v8H8z" fill="#fff" opacity=".25" /><path d="M20 3v6h6" fill="#000" opacity=".2" /></svg>
};
export const portrait = TEX.portrait;

/* ---------------- window ---------------- */
export function XPWindow({ title, icon, active = true, onClose, onFocus, onMinimize, x, y, w, className = "", children, status, menu, z, label }) {
  const ref = useRef(null); const drag = useRef(null);
  const [pos, setPos] = useState({ x, y });
  const [closing, setClosing] = useState(false);
  useEffect(() => { setPos({ x, y }); }, [x, y]);
  const down = (e) => {
    if (e.target.closest("button")) return; onFocus && onFocus();
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }; e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => { const d = drag.current; if (!d) return;
    setPos({ x: Math.max(-200, Math.min(innerWidth - 80, d.ox + e.clientX - d.sx)), y: Math.max(0, Math.min(innerHeight - 80, d.oy + e.clientY - d.sy)) }); };
  const up = () => { drag.current = null; };
  const close = () => { setClosing(true); setTimeout(() => onClose && onClose(), 130); };
  return (
    <section ref={ref} className={`xwin ${active ? "" : "inactive"} ${closing ? "closing" : ""} ${className}`} role="dialog" aria-label={label || title}
      style={{ left: pos.x, top: pos.y, width: w, zIndex: z }} onPointerDown={() => onFocus && onFocus()}>
      <div className="xtitle" onPointerDown={down} onPointerMove={move} onPointerUp={up}>
        {icon && <span className="ico">{icon}</span>}<span className="t">{title}</span>
        {onMinimize && <button className="xctl" aria-label="Minimise" onClick={onMinimize}><svg viewBox="0 0 10 10"><path d="M1 8h6" stroke="#fff" strokeWidth="2.2" /></svg></button>}
        {onClose && <button className="xctl close" aria-label={`Close ${title}`} onClick={close}><svg viewBox="0 0 10 10"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="#fff" strokeWidth="2" /></svg></button>}
      </div>
      {menu && <div className="xmenu">{menu.map((m) => <span key={m}>{m}</span>)}</div>}
      {children}
      {status && <div className="xstatus">{status.map((s, i) => <span key={i}>{s}</span>)}</div>}
    </section>
  );
}

/* ---------------- taskbar ---------------- */
export function Taskbar({ startOpen, onStart, tasks = [], onTask, muted, onSound }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 10000); return () => clearInterval(t); }, []);
  return (
    <nav className="taskbar" aria-label="Taskbar">
      <button className="start" aria-expanded={startOpen} aria-haspopup="menu" onClick={onStart}><span className="logo">D</span>start</button>
      <div className="tasks">{tasks.map((t) => <button key={t.id} className={`task ${t.active ? "active" : ""}`} onClick={() => onTask(t.id)} title={t.title}>{t.icon}<span>{t.title}</span></button>)}</div>
      <div className="tray">
        <button onClick={onSound} aria-label={muted ? "Sound off. Turn on" : "Sound on. Mute"} aria-pressed={!muted} title={muted ? "Sound off" : "Sound on"}>{Icon.speaker(muted)}</button>
        <span className="clock">{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
      </div>
    </nav>
  );
}

/* ---------------- start menu ---------------- */
export function StartMenu({ left, right, foot, onClose }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.querySelector("button")?.focus(); }, []);
  const key = (e) => { const items = [...ref.current.querySelectorAll("button")]; const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    if (e.key === "Escape") onClose(); };
  return (
    <div className="startmenu" role="menu" ref={ref} onKeyDown={key}>
      <div className="sm-head"><img src={portrait} alt="" /><div>{CONFIG.name}<small>{CONFIG.role}</small></div></div>
      <div className="sm-cols">
        <div className="sm-left">{left.map((it, i) => it === "-" ? <div className="sm-sep" key={i} /> :
          <button key={it.label} className="sm-item" role="menuitem" onClick={it.onClick}>{it.icon}<span><b>{it.label}</b>{it.sub && <small>{it.sub}</small>}</span></button>)}</div>
        <div className="sm-right">{right.map((it, i) => it === "-" ? <div className="sm-sep" key={i} /> :
          <button key={it.label} className="sm-item" role="menuitem" onClick={it.onClick}>{it.icon}<span><b style={{ fontWeight: 400 }}>{it.label}</b></span></button>)}</div>
      </div>
      <div className="sm-foot">{foot.map((f) => <button key={f.label} role="menuitem" onClick={f.onClick}>{f.icon}{f.label}</button>)}</div>
    </div>
  );
}

/* ---------------- tray balloons (text types in) ---------------- */
export function Balloons({ items, onClose }) {
  return <div className="balloons" aria-live="polite">{items.map((b) => <Balloon key={b.id} b={b} onClose={() => onClose(b.id)} />)}</div>;
}
function Balloon({ b, onClose }) {
  const [n, setN] = useState(0);
  useEffect(() => { if (n >= b.text.length) return; const t = setTimeout(() => setN((v) => v + 2), 16); return () => clearTimeout(t); }, [n, b.text]);
  useEffect(() => { const t = setTimeout(onClose, 5200); return () => clearTimeout(t); }, []);
  return (
    <div className="balloon" role="status">
      <b>{b.icon || Icon.info()}{b.title}</b>
      <span>{b.text.slice(0, n)}{n < b.text.length && <span className="caret" />}</span>
      <button className="x" aria-label="Dismiss" onClick={onClose}><svg viewBox="0 0 10 10"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.4" /></svg></button>
    </div>
  );
}
