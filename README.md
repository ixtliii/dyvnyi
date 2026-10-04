# Dyvnyi

Artem Diakunchak's portfolio: a cardboard box that unfolds to reveal a PS2-style room you can walk around, with a Windows XP-style interface.

Built with React (interface) and three.js (the 3D world), using Vite.

## Quick look

Open `dyvnyi-single-file.html` in a browser. It's the whole site in one file, ready to upload anywhere.

## Develop

    npm install
    npm run dev            # local dev server with hot reload
    npm run build          # normal multi-file build in dist/
    npm run build:single   # one self-contained dist/index.html

## Where things live

- `src/content.js`: everything you'll edit. Name, email, links, about text, projects, side projects, showreel,
  trash files, the toilet meme, and the chat scripts. Project preview images are in `src/assets/prevs/` (what you "say" when someone uses an object, plus the reply buttons).
- `src/App.jsx`: wires the 3D engine to the interface (what each object does, start menu, taskbar, keyboard).
- `src/engine/engine.js`: the 3D world. Room, avatar rig, the cardboard box (drawn in code) and its unfolding, camera orbit, input, post-processing.
  It's imperative like a game loop and talks to React through events (`ready`, `nearest`, `hover`, `interact`, `entered`).
- `src/engine/audio.js`: all sound, synthesised in the browser (ambience, guitar, typing ticks, door creak).
- `src/ui/xp.jsx`: XP-style window, taskbar, start menu, notification balloons and icons.
- `src/ui/Chat.jsx`: the messenger window that types messages out.
- `src/ui/Desktop.jsx`: the computer's desktop and its windows.
- `src/ui/CaseStudy.jsx`: the in-site case study viewer (a browser-style window). The Cogo case study markdown and its images live in `src/assets/cogo/`; add more case studies to `CASE_STUDIES` there and give the project a `caseStudy` id in `content.js`.
- `src/ui/xp.css`: all styling.
- `src/assets/tex.json`: every texture as a data URL. `src/assets/GothicPixels.ttf`: display font.
- `tools/`: Python scripts that cut the textures from the original photos (`gentex.py` for the room and body;
  `gencube.py` makes the small portrait used in the start menu and chat), plus the generated images in `tools/textures-src/`. You only need these if you
  re-shoot photos; they expect the originals as PNGs in a `src/` folder next to them (see the paths at the top of each script).

## Controls

Drag to orbit, scroll or pinch to zoom, WASD or click the floor to walk, E or click to use things.
C resets the camera, H shows the controls, M mutes, Esc closes the top window.

## Notes

- three.js is pinned to 0.150 to keep the lighting identical; newer versions change the lighting maths.
- The window chrome uses Tahoma and Trebuchet MS like XP; longer text uses the Helvetica / Neue Haas Grotesk stack.
- No Microsoft logos or wallpapers are used; the start button shows a "D" and the wallpaper is Artem's own.
- Check the GothicPixels licence before using it commercially.
# dyvnyi
