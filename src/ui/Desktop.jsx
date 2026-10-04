import { XPWindow, Icon } from "./xp.jsx";
import { CONFIG } from "../content.js";
import TEX from "../assets/tex.json";
import CaseStudy, { CASE_STUDIES } from "./CaseStudy.jsx";

export const APPS = {
  work: { title: "Work", icon: () => Icon.folder() },
  lab: { title: "Side projects", icon: () => Icon.folder("#8fc0f0") },
  about: { title: "About me.txt", icon: Icon.doc },
  mail: { title: "Contact", icon: Icon.mail },
  reel: { title: "Showreel.mov", icon: Icon.film },
  trash: { title: "Trash", icon: Icon.trash }
};
export function appMeta(id) {
  if (id.startsWith("cs:")) { const c = CASE_STUDIES[id.slice(3)]; return { title: `${c.title} - Case study`, icon: () => Icon.globe(), w: 900 }; }
  if (id.startsWith("p:")) { const [, set, i] = id.split(":"); const p = CONFIG[set][+i]; return { title: p.title, icon: () => Icon.file(p.color), w: 520 }; }
  const a = APPS[id]; return { ...a, w: { work: 470, lab: 470, about: 480, mail: 440, reel: 520, trash: 440 }[id] };
}

function Content({ id, open, copy }) {
  if (id === "work" || id === "lab") {
    const list = CONFIG[id];
    return (<>
      <div className="toolbar"><button className="xbtn" disabled>Back</button><button className="xbtn" disabled>Up</button></div>
      <div className="addr">Address <span>{Icon.folder()}C:\Artem\{APPS[id].title}</span></div>
      <div className="xbody white"><div className="fgrid">
        {list.map((p, i) => <button key={i} className="dicon" onClick={() => open(`p:${id}:${i}`)}>{p.image ? <img className="thumb" src={p.image} alt="" /> : Icon.file(p.color)}<span>{p.title}</span></button>)}
      </div></div></>);
  }
  if (id.startsWith("p:")) {
    const [, set, i] = id.split(":"); const p = CONFIG[set][+i];
    return (<div className="xbody white proj">
      {p.image ? <img className="heroimg" src={p.image} alt={`${p.title} preview`} style={{ background: p.color }} />
        : <div className="hero" style={{ background: `${p.color} repeating-linear-gradient(45deg, rgba(255,255,255,.06) 0 6px, transparent 6px 12px)` }}><span className="px">{p.title}</span></div>}
      <h4>{p.title}</h4><p className="meta">{p.role}, {p.year}</p><p>{p.summary}</p>
      <ul>{p.tags.map((t) => <li key={t}>{t}</li>)}</ul>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{p.caseStudy
        ? <button className="xbtn primary" onClick={() => open(`cs:${p.caseStudy}`)}>{p.cta || "Read the case study"}</button>
        : <a className="xbtn primary" href={p.url} target="_blank" rel="noopener noreferrer">{p.cta || "Open"}</a>}
        {(p.extra || []).map((l) => <a key={l.label} className="xbtn" href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a>)}</div>
    </div>);
  }
  if (id === "about") return (<div className="xbody white"><pre className="notepad">{CONFIG.about + "\n\n" + CONFIG.facts.map((f) => `${f.k}: ${f.v}`).join("\n")}</pre></div>);
  if (id === "mail") return (<>
    <div className="toolbar"><a className="xbtn" href={`mailto:${CONFIG.email}`}>Send</a><button className="xbtn" onClick={copy}>Copy address</button></div>
    <div className="xbody"><div className="mailhead"><span>To:</span><b>{CONFIG.email}</b><span>Subject:</span><b>Let's make something dyvnyi</b></div>
      <p className="copy">Or find me here:</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{CONFIG.links.map((l) => <a key={l.label} className="xbtn" href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a>)}</div></div></>);
  if (id === "reel") return CONFIG.showreel.comingSoon
    ? (<div className="xbody"><div className="player soon"><span className="px">Coming soon</span><small>Showreel.mov is still rendering</small></div><p className="copy">The showreel is on its way. Until then, the projects in the Work folder say it better anyway.</p><button className="xbtn" onClick={() => open("work")}>Open Work</button></div>)
    : (<div className="xbody"><div className="player"><a href={CONFIG.showreel.url} target="_blank" rel="noopener noreferrer" aria-label="Play showreel"><svg width="22" height="24" viewBox="0 0 22 24"><path d="M2 1l19 11L2 23z" fill="#fff" /></svg></a></div><p className="copy">{CONFIG.showreel.text}</p></div>);
  if (id === "trash") return (<div className="xbody white" style={{ padding: 0 }}><table className="files"><thead><tr><th>Name</th><th>Size</th></tr></thead>
    <tbody>{CONFIG.trash.map((f) => <tr key={f[0]}><td>{f[0]}</td><td>{f[1]}</td></tr>)}</tbody></table></div>);
  return null;
}

export default function Desktop({ wins, open, close, focus, minimize, copy }) {
  const top = wins.filter((w) => !w.min).reduce((a, w) => (!a || w.z > a.z ? w : a), null);
  return (
    <div className="desktop" style={{ backgroundImage: `url(${TEX.wallpaper})` }} role="application" aria-label="Artem's computer">
      <div className="icons">{Object.entries(APPS).map(([id, a]) => <button key={id} className="dicon" onClick={() => open(id)}>{a.icon()}<span>{a.title}</span></button>)}</div>
      {wins.filter((w) => !w.min).map((w) => { const m = appMeta(w.id);
        if (w.id.startsWith("cs:")) return <CaseStudy key={w.id} id={w.id.slice(3)} z={w.z} active={top && top.id === w.id} onClose={() => close(w.id)} onFocus={() => focus(w.id)} />;
        const status = w.id === "work" || w.id === "lab" ? [`${CONFIG[w.id].length} objects`, "My Computer"] : w.id === "trash" ? [`${CONFIG.trash.length} objects, all regrettable`] : null;
        return (
          <XPWindow key={w.id} title={m.title} icon={m.icon()} x={w.x} y={w.y} w={Math.min(m.w, innerWidth - 12)} z={w.z} active={top && top.id === w.id}
            onClose={() => close(w.id)} onFocus={() => focus(w.id)} onMinimize={() => minimize(w.id)} status={status}
            menu={w.id === "about" ? ["File", "Edit", "Format", "View", "Help"] : ["File", "Edit", "View", "Help"]}>
            <Content id={w.id} open={open} copy={copy} />
          </XPWindow>);
      })}
    </div>
  );
}
