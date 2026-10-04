// Everything you'd want to edit lives here.
import prevCogo from "./assets/prevs/cogo.jpg";
import prevMarketEcho from "./assets/prevs/marketEcho.jpg";
import prevOcare from "./assets/prevs/ocare.jpg";
import prevAntwerp from "./assets/prevs/antwerp-unseen.jpg";
import prevDior from "./assets/prevs/couturiers-code.jpg";
import prevSynesthesia from "./assets/prevs/synesthesia.jpg";
import prevType01 from "./assets/prevs/type01.jpg";
export const CONFIG = {
  name: "Artem Diakunchak",
  handle: "artem",
  role: "Creative designer & design engineer",
  email: "artem.diakunchak.work@gmail.com",
  links: [
    { label: "LinkedIn", url: "https://www.linkedin.com/in/artem-diakunchak-b6142123b/" },
    { label: "Behance", url: "https://www.behance.net/artemdiakunchak" },
    { label: "Portfolio", url: "https://ixtliii.github.io/portfolio/" },
    { label: "Résumé", url: "https://ixtliii.github.io/portfolio/Artem_Diakunchak-CV.pdf" }
  ],
  about:
    "Hi, I'm Artem.\n\nI design things and then build them, usually in that order. My work sits between brand, interface and code: identities that move, products that feel good in the hand, and tools that make other designers faster.\n\nThis is my actual room, rebuilt from phone photos. The palm is real, the guitar is real, and that's the chair I do all of it from.",
  facts: [
    { k: "Currently", v: "Open to freelance and full-time" },
    { k: "Tools", v: "Figma, Adobe CC, React, Three.js" },
    { k: "Plays", v: "Acoustic guitar, badly but daily" }
  ],
  work: [
    { title: "Cogo Mobility App", year: "2026", role: "Product & Creative Designer, Mayten Technologies", color: "#dfe7fa", image: prevCogo,
      summary: "Sole designer on a mobility super-app: redesigning core flows and shipping new features to a live user base across Belgium, the Netherlands and Germany.",
      tags: ["Product Design", "UX/UI", "Brand", "Mobile"], caseStudy: "cogo", cta: "Read the case study" },
    { title: "MarketEcho", year: "2025", role: "Product & UX/UI Designer", color: "#def3e6", image: prevMarketEcho,
      summary: "An analytics dashboard for traders, cutting cognitive load with a scalable design system across app, dashboard and web.",
      tags: ["Product Design", "Design System", "Dashboard", "Web"], url: "https://www.behance.net/gallery/241398813/MarketEcho-Web-App-UXUI", cta: "View on Behance",
      extra: [{ label: "Live site", url: "https://marketecho.io/" }] },
    { title: "OCare", year: "2025", role: "UX/UI Designer, mental health app", color: "#f4e3f8", image: prevOcare,
      summary: "A mental health app, from UX research through to the mobile interface.",
      tags: ["UX Research", "Mobile"], url: "https://www.behance.net/gallery/241707793/OCare-Mental-Health-UXUI", cta: "View on Behance" },
    { title: "TYPE01 Typography Conference", year: "2025", role: "Web design concept", color: "#3d9a50", image: prevType01,
      summary: "A concept website for the TYPE01 conference, with a bold, type-driven aesthetic that appeals to creatives without sacrificing usability. It translates the complex two-day schedule into a clean, responsive interface that works just as well on a phone as it does on a desktop.",
      tags: ["Typography", "Conference", "Web Design"], url: "https://www.behance.net/gallery/241213239/Typography-Conference-Web-Design", cta: "View on Behance" }
  ],
  lab: [
    { title: "Antwerp Unseen", year: "2026", role: "Antwerp Visit × Howest", color: "#12121e", image: prevAntwerp,
      summary: "A capstone street installation where passers-by shape a shared, anonymous archive of urban memory through real-time body tracking. The crowd becomes the interface. Built with React, Three.js, GSAP and MediaPipe.",
      tags: ["Interaction Design", "React", "Three.js", "MediaPipe"], url: "https://antwerp-unseen.vercel.app/", cta: "Visit project" },
    { title: "The Couturier's Code", year: "2026", role: "MoMu × Howest", color: "#f2efe9", image: prevDior,
      summary: "An interactive story made with MoMu (ModeMuseum Antwerp) that traces Dior's private world of superstition, from lucky charms and fortune-tellers to flower symbolism, through a cinematic, scroll-driven experience with interactive rituals.",
      tags: ["Interactive Story", "WebGL", "GSAP", "Editorial"], url: "https://ixtliii.github.io/dior-impress/", cta: "Visit project" },
    { title: "Synesthesia", year: "2026", role: "Personal", color: "#101018", image: prevSynesthesia,
      summary: "A first-person, glitch-editorial piece about synesthesia, where sound bleeds into colour. It builds from fragmented \"damaged records\" to a live simulation that turns your microphone input into visual frequency.",
      tags: ["Experimental", "Creative Coding", "Audio-reactive"], url: "https://artem-diakunchak.be/personal-experience/", cta: "Visit project" },
    { title: "Dyvnyi", year: "2026", role: "This portfolio", color: "#2a3a6a",
      summary: "My room rebuilt from phone photos as a PS2-era scene packed inside a cardboard box. React for the interface, three.js for everything else.", tags: ["Three.js", "React", "Game feel"], url: "https://ixtliii.github.io/portfolio/", cta: "Visit project" }
  ],
  showreel: { comingSoon: true, text: "Two minutes of the best bits: motion, interfaces and the occasional thing that exploded on purpose.", url: "" },
  trash: [["logo_final_FINAL_v7.psd", "214 MB"], ["moodboard_2019.fig", "38 MB"], ["dont_open.txt", "2 KB"], ["helvetica_vs_arial_rant.md", "11 KB"]],
  meme: { top: "{n} projects in this room", bottom: "and you picked the toilet" }
};

/* Chat scripts. Each one is what Artem says when you use something.
   `choices` become reply buttons. Actions: "close", "go:<item>", "os:<app>", "strum",
   "copy:email", "mailto", "link:<url>", "sound". */
export const CHATS = {
  welcome: {
    lines: () => {
      const touch = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
      return ["hey, welcome to my room :)", touch ? "drag to look around, tap the floor to walk, and tap on stuff to use it." : "drag to look around, click the floor to walk, and click on stuff to use it.", "all my work is on the computer by the window."];
    },
    choices: [{ label: "Show me the work", action: "go:work" }, { label: "I'll look around", action: "close" }]
  },
  guitar: {
    lines: () => [...CONFIG.about.split("\n\n").map((s) => s.toLowerCase().replace(/\.$/, "")), ...CONFIG.facts.map((f) => `${f.k.toLowerCase()}: ${f.v.toLowerCase()}`)],
    choices: [{ label: "Play something", action: "strum" }, { label: "How do I reach you?", action: "go:contact" }, { label: "Cool, bye", action: "close" }]
  },
  contact: {
    lines: () => ["leaving already?", "best way to reach me is email:", CONFIG.email, "or find me here: " + CONFIG.links.map((l) => l.label).join(", ")],
    choices: () => [{ label: "Copy email", action: "copy:email" }, { label: "Write an email", action: "mailto" }, ...CONFIG.links.map((l) => ({ label: l.label, action: "link:" + l.url }))]
  },
  couch: {
    lines: () => CONFIG.showreel.comingSoon
      ? ["feet up for a minute.", "this is where the showreel goes. it's coming soon, i'm still cutting it.", "in the meantime, the work is on the computer."]
      : ["feet up for a minute.", CONFIG.showreel.text.toLowerCase()],
    choices: () => CONFIG.showreel.comingSoon
      ? [{ label: "Show me the work", action: "go:work" }, { label: "Get up", action: "close" }]
      : [{ label: "Watch the showreel", action: "link:" + CONFIG.showreel.url }, { label: "Get up", action: "close" }]
  },
  stairs: {
    lines: ["that's the loft.", "it's where the unfinished projects sleep. not ready for visitors yet."],
    choices: [{ label: "Fair enough", action: "close" }]
  },
  lab: {
    lines: () => ["that's the side desk, where the experiments happen.", ...CONFIG.lab.map((p) => `${p.title.toLowerCase()} (${p.year}): ${p.summary.split(". ")[0].toLowerCase()}`)],
    choices: [{ label: "Open them on the computer", action: "os:lab" }, { label: "Close", action: "close" }]
  }
};
