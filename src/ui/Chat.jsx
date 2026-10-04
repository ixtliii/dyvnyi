import { useEffect, useRef, useState } from "react";
import { XPWindow, Icon, portrait } from "./xp.jsx";
import { CONFIG } from "../content.js";
import { typeTick, nudge } from "../engine/audio.js";

/* A messenger-style window. Lines from Artem are typed out one character at a time,
   with a "typing..." indicator between them. Click the conversation to skip ahead. */
export default function Chat({ script, onAction, onClose, onFocus, active, z }) {
  const [msgs, setMsgs] = useState([]);           // { who, text, shown }
  const [typing, setTyping] = useState(false);
  const [choices, setChoices] = useState([]);
  const convo = useRef(null), skip = useRef(false), q = useRef([]), busy = useRef(false), pending = useRef(null), alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const pump = () => {
    if (busy.current || !alive.current) return;
    const line = q.current.shift();
    if (line === undefined) { setTyping(false); if (pending.current) { setChoices(pending.current); pending.current = null; } return; }
    busy.current = true; skip.current = false; setTyping(true); setChoices([]);
    setTimeout(() => {
      if (!alive.current) return;
      setMsgs((m) => [...m, { who: "artem", text: line, shown: 0 }]);
      let n = 0, last = 0; const t0 = performance.now();
      const tick = () => {
        if (!alive.current) return;
        n = skip.current ? line.length : Math.min(line.length, Math.floor((performance.now() - t0) / 11) + 1);
        if (n - last >= 3 || n === line.length) { typeTick(); last = n; }
        setMsgs((m) => { const c = m.slice(); c[c.length - 1] = { ...c[c.length - 1], shown: n }; return c; });
        if (n < line.length) setTimeout(tick, 18);
        else setTimeout(() => { busy.current = false; pump(); }, skip.current ? 60 : 260);
      };
      tick();
    }, skip.current ? 60 : 380 + Math.min(500, line.length * 6));
  };
  const enqueue = (lines, ch) => { q.current.push(...lines); if (ch) pending.current = ch; pump(); };
  useEffect(() => { if (!script) return; nudge(); enqueue(script.lines, script.choices); }, [script?.key]);

  useEffect(() => { const el = convo.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, typing]);

  const pick = async (c) => {
    setChoices([]); setMsgs((m) => [...m, { who: "you", text: c.label, shown: c.label.length }]);
    const res = await onAction(c.action);
    if (res && res.lines) enqueue(res.lines, res.choices || script.choices);
    else if (res !== "closed") setChoices(script.choices);
  };
  const choiceList = choices;

  return (
    <XPWindow className="chat" title={`${CONFIG.name} - Conversation`} icon={Icon.chat()} onClose={onClose} onFocus={onFocus} active={active} z={z}
      x={Math.max(8, innerWidth - Math.min(470, innerWidth - 16) - 16)} y={Math.max(8, innerHeight - 36 - 420)} w={Math.min(470, innerWidth - 16)}
      menu={["File", "Edit", "Actions", "Help"]} status={[typing ? `${CONFIG.name.split(" ")[0]} is typing a message...` : "Connected"]}>
      <div className="xbody">
        <div className="to">To: <b>{CONFIG.name}</b> &lt;{CONFIG.email}&gt;</div>
        <div className="convo" ref={convo} onClick={() => { skip.current = true; }} onKeyDown={(e) => { if (e.key === " ") skip.current = true; }} aria-live="polite">
          {msgs.map((m, i) => (
            <p className={`msg ${m.who}`} key={i}>
              <span className="who">{m.who === "artem" ? `${CONFIG.name.split(" ")[0]} says:` : "You say:"}</span>
              <span className="txt">{m.text.slice(0, m.shown)}{m.who === "artem" && m.shown < m.text.length && <span className="caret" />}</span>
            </p>
          ))}
        </div>
        <div className="dp"><img src={portrait} alt={CONFIG.name} /><div className="you" aria-hidden="true">?</div></div>
        <div className="replies">
          {choiceList && choiceList.length > 0 && <span className="label">Reply with:</span>}
          {choiceList && choiceList.map((c, i) => <button key={c.label} className={`xbtn ${i === 0 ? "primary" : ""}`} onClick={() => pick(c)} autoFocus={i === 0}>{c.label}</button>)}
        </div>
      </div>
    </XPWindow>
  );
}
