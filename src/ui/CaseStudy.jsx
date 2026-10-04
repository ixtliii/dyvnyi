import { useMemo, useRef } from "react";
import { marked } from "marked";
import { XPWindow, Icon } from "./xp.jsx";
import cogoMd from "../assets/cogo/cogo.md?raw";

// Images are bundled with the site; the markdown keeps the same paths as the original portfolio.
const cogoImgs = import.meta.glob("../assets/cogo/*.webp", { eager: true, query: "?url", import: "default" });
const imgMap = Object.fromEntries(Object.entries(cogoImgs).map(([p, url]) => [p.split("/").pop().replace(".webp", ""), url]));

export const CASE_STUDIES = {
  cogo: {
    title: "Cogo Mobility App",
    subtitle: "Sole designer on a mobility super-app, redesigning core flows and shipping new features to a live user base across Belgium, the Netherlands & Germany",
    facts: [["Company", "Mayten Technologies"], ["Year", "2026"], ["Role", "Product & Creative Designer"]],
    tags: ["Product Design", "UX/UI", "Brand", "Mobile"],
    md: cogoMd,
    url: "https://ixtliii.github.io/portfolio/work/cogo"
  }
};

function render(md) {
  const fixed = md.replace(/\/case-studies\/cogo\/([\w-]+)\.(png|jpe?g)/g, (m, name) => imgMap[name] || m);
  const tokens = marked.lexer(fixed);
  const toc = tokens.filter((t) => t.type === "heading" && t.depth === 1).map((t) => t.text);
  let i = 0;
  const renderer = new marked.Renderer();
  renderer.heading = (text, depth) => depth === 1 ? `<h2 id="cs-sec-${i++}">${text}</h2>` : `<h${depth + 1}>${text}</h${depth + 1}>`;
  renderer.link = (href, title, text) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  const html = marked.parser(tokens, { renderer }).replace(/<img /g, '<img loading="lazy" decoding="async" ');
  return { html, toc };
}

export default function CaseStudy({ id, onClose, onFocus, active, z }) {
  const cs = CASE_STUDIES[id];
  const { html, toc } = useMemo(() => render(cs.md), [id]);
  const scroller = useRef(null);
  const narrow = innerWidth < 700;
  const w = narrow ? innerWidth : Math.min(900, innerWidth - 40);
  const jump = (n) => { const el = scroller.current.querySelector(`#cs-sec-${n}`); if (el) scroller.current.scrollTo({ top: el.offsetTop - 12, behavior: "smooth" }); };
  return (
    <XPWindow className={`browser ${narrow ? "full" : ""}`} title={`${cs.title} - Case study`} icon={Icon.globe()} onClose={onClose} onFocus={onFocus} active={active} z={z}
      x={narrow ? 0 : Math.max(10, (innerWidth - w) / 2)} y={narrow ? 0 : 16} w={w} status={["Done", "Internet"]}>
      <div className="toolbar">
        <button className="xbtn" onClick={onClose}>Back</button>
        <button className="xbtn" onClick={() => scroller.current.scrollTo({ top: 0, behavior: "smooth" })}>Top</button>
        <a className="xbtn" href={cs.url} target="_blank" rel="noopener noreferrer">Open in new tab</a>
      </div>
      <div className="addr">Address <span>{Icon.globe()}{cs.url}</span></div>
      <div className="xbody white cs" ref={scroller}>
        <header className="cs-hero">
          <h1>{cs.title}</h1>
          <p className="cs-sub">{cs.subtitle}</p>
          <dl className="cs-facts">{cs.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          <ul className="cs-tags">{cs.tags.map((t) => <li key={t}>{t}</li>)}</ul>
          {toc.length > 1 && <nav className="cs-toc" aria-label="Sections">{toc.map((t, n) => <button key={t} onClick={() => jump(n)}>{t}</button>)}</nav>}
        </header>
        <article className="cs-content" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </XPWindow>
  );
}
