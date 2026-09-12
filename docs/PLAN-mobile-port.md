# Mobile port plan

> **Status (0.86, #91):** phase 1 step **1 is done** — a Capacitor shell builds on every push
> (`.github/workflows/native.yml`), and the PWA/touch work that rode along with it is written
> up in `SYSTEMS.md`. Steps **2 and 3** (the `Game.gfx` abstraction and the PixiJS renderer)
> are **still gated on phase 0**: nobody has taken a debug report from a real device yet.
> One measurement worth adding to that reading — `resizeCanvases()` never applies DPR, so the
> canvas backing store is already 1 CSS px per pixel and raster cost is at the floor. That
> makes cause (2) below, the DOM compositor, the likelier of the three.

**Question:** "It stutters badly on mobile. Which framework/language gives the best
performance/graphics quality and can use the GPU natively? Let's port it directly."

This document first **measures the codebase** (what would need to move), then says
**where the bottleneck actually is**, then ranks the options against that measurement.

---

## 1. What do we actually have? (measured)

Via `wc -l` and `grep`, 2026-09-11:

| Layer | Where | Size | Effect on a port |
|---|---|---|---|
| **Game logic and data** | the rest of app.js/battle.js/nobles.js/quests.js | **~11,500 lines** | If the target language is JS/TS, moves **1:1**. Otherwise it's a rewrite. |
| **DOM UI** | 965 lines of HTML-generating JS + `style.css` 1117 + `index.html` 277 | **~2,360 lines** | **No engine has an equivalent.** Rewritten in every scenario. |
| **Canvas drawing** | app.js 490 + battle.js 229 lines | **719 lines / 1,230 `ctx.*` calls / 41 distinct APIs** | Translates **mechanically** to any 2D GPU API. The smallest piece. |
| | **Total** | **13,192 lines** | |

UI density was also counted: **60 `showModal` calls**, **184 `onclick="`**,
**588 lines of inline `style="`**, **47 `innerHTML`/`setHtml`**.

**Takeaway:** the "native GPU" question only touches **5%** of the work (719 lines of
canvas). The port's real cost is the **60-modal DOM UI** — and that gets rewritten no
matter which engine is picked.

---

## 2. Why does it stutter? (known measurements)

CLAUDE.md's "Performance" and "#84" sections already say:

- In lite mode `renderMap` is **0.38 ms** (JS). The 30 fps gate gives a **33 ms** budget.
  So **JS is 1% of the budget**. Cutting draw calls further wins nothing here.
- #84 halved the fill rate — **~2×** less raster work at every zoom level. It **still
  stutters** on a phone.

Three candidates remain, and none can be told apart **without measuring on the device**:

1. **The WebView canvas never reaches the GPU at all** (software rasterization).
   `chrome://gpu` on Chrome says so; on iOS, WKWebView's "GPU Process: Canvas Rendering"
   is a separate process, and canvas acceleration can be off on older versions.
2. **The compositor is choking on the DOM layer** — 588 lines of inline style, glass
   panels, a campaign bar updated every frame.
3. **Thermal throttling** — "fine at first, stutters after two minutes" is its classic
   signature.

> **The one mandatory step before a port decision:** from the phone,
> ⚙️ Settings → 🐞 Debug Report → 📋 Copy. The report carries the last 30 frames'
> interval, the measured refresh rate, DPR, canvas sizes, and the device.
> If the cause is (1), **Track A** ends the question. If it's (2), moving the canvas to
> the GPU **accomplishes nothing** and an engine port hits the same wall.

---

## 3. Options — against this codebase

Columns: native GPU path · what happens to 11,500 lines of logic · what happens to the
2,360-line UI · what happens to 719 lines of canvas.

| Option | Native GPU | Logic | UI | Canvas | Rough effort |
|---|---|---|---|---|---|
| **A. Capacitor + PixiJS** | WebGL/WebGPU → **Metal** (iOS) / **Vulkan-GL** (Android), the app's own WKWebView/Android WebView | **stays as-is** | **stays as-is** | translated to PixiJS's scene graph | **2–3 weeks** |
| **B. React Native + Skia** | `@shopify/react-native-skia`, **Skia** on the UI thread via JSI → Metal/Vulkan | **stays as-is** (JS) | RN components — **60 modals from scratch** | translated to Skia's canvas | **2–4 months** |
| **C. Godot 4.6** | **Metal** (iOS/macOS arm64) and **Vulkan**; GLES "Compatibility" for older devices | rewritten in GDScript **from scratch** | `Control` nodes — **from scratch** | `CanvasItem.draw_*` — from scratch | **4–8 months** |
| **D. Flutter + Impeller** | **Impeller** → Metal/Vulkan, shaders compiled AOT (no in-frame shader jank) | rewritten in Dart **from scratch** | Widgets — **from scratch** | `CustomPainter` — from scratch | **4–8 months** |
| **E. Defold** | OpenGL ES/Vulkan; **<5 MB** package, 60 fps on low-end Android | rewritten in Lua **from scratch** | GUI nodes — **from scratch** | from scratch | **4–8 months** |
| **F. Fully native** (Swift+Metal / Kotlin+Vulkan) | The lowest level, the ceiling is here | **from scratch, twice** | **from scratch, twice** | **from scratch, twice** | **8–18 months, two codebases** |

**C/D/E/F's shared cost:** the 11,500-line simulation — world generation, the supply
curve, diplomacy, campaigns, the noble line pool, the quest engine, the save/migration
chain — gets **rewritten**. Along with it, the 4 measurement tools under `tools/` and the
24-assertion test suite get rewritten too; since they run the game's **own** code, none of
them survive a language change. That's the real bill paid in exchange for the GPU gained.

**A's weakness:** you're still inside a WebView. If the bottleneck is cause (2) in §2 (the
DOM compositor), PixiJS accelerates the canvas but the UI stays the same.
**B's strength:** you get out of the WebView entirely without losing the logic —
it stays JS, only the UI and drawing change.

*(Tried and rejected: "drop-in" canvas2d→WebGL shells like `Canvas2DtoWebGL`. We use 41
distinct `ctx.*` APIs — `createPattern`, `createLinearGradient`, `setLineDash`,
`measureText`, an offscreen canvas via `drawImage`, `getImageData` — and these shells don't
give full coverage. One uncovered API means a silent drawing bug. Translating to PixiJS
explicitly has fewer surprises.)*

---

## 4. Recommended path — staged

### Phase 0 — Measure (1 day, not a port)
A debug report from the phone. `chrome://gpu` (Android). The decision is made after this.
If the cause is thermal throttling, no port fixes it — the fix is lowering the frame
budget (lite mode already drops to 30 fps, 24 fps could be tried).

### Phase 1 — Track A: a Capacitor shell + a PixiJS renderer (2–3 weeks)
Order matters — each step can go live on its own:

1. **Capacitor shell** (2 days) — `npx cap add ios android`. The repo still runs
   build-free; Capacitor is just a native project wrapping `index.html`.
   Output: a real App Store / Play Store app, full screen, no address bar,
   `webband_lang`/saves persist on the device.
2. **Abstract the drawing gate** (3–5 days) — `renderMap` and `Battle.render` stop
   calling `ctx.*` directly and call a `Game.gfx` interface instead. Two
   implementations: `gfx-canvas2d.js` (today's code, unchanged) and `gfx-pixi.js`.
   A `Game.opt('renderer')` switch. **The rollback path stays open at all times.**
3. **PixiJS renderer** (1–2 weeks) — the counterpart to the 41 APIs. The "bake the
   expensive thing once" work already done (`Game.emoji`, `radial`, `textW`,
   `buildGroundTexture`, `Battle.buildGround`) maps **naturally** onto PixiJS
   textures/sprites; #80/#84's caches aren't wasted.
4. **Measure A/B** — same phone, same world, same frame: canvas2d vs pixi.
   The measurement method is the same as #84's (`getImageData(0,0,1,1)` to drain
   the queue, measure both modes back-to-back in the same window).

If phase 1 finishes: a game **shipped to native GPU, in the app stores, keeping all
13,192 lines**. Tests and `tools/` keep working.

### Phase 2 — only if phase 1 isn't enough: Track B (React Native + Skia)
If phase 1's A/B measurement says "canvas is on the GPU but the UI is still choking,"
you need to get out of the WebView. **B** is then preferred over C/D/E: since the 11,500
lines of logic stay in JS, they move over; only the 60 modals + 719 lines of drawing are
rewritten.

### When is Track C (Godot) the right call?
When the goal stops being "port this game to mobile" and becomes **"raise the graphics
quality."** Godot 4.6's Metal/Vulkan opens the door to shaders, lighting, particles, and
3D; today's canvas drawing can't do any of that. But that's no longer a port, it's a
**new game** — and the full bill of moving the 11,500-line simulation to GDScript comes due.

---

## 5. Decision summary

| Goal | Path |
|---|---|
| "Smooth on the phone, an app in the store" | **A: Capacitor + PixiJS** — 2–3 weeks, no lines lost |
| "Get out of the WebView entirely" | **B: React Native + Skia** — 2–4 months, logic preserved |
| "Move the graphics somewhere completely different" | **C: Godot 4.6** — 4–8 months, a rewrite |

**Recommendation: start with A, don't skip phase 0.** Every line written before the
stutter's cause is measured risks tearing down the wrong wall.

---

## Sources

- [WebGL vs Canvas 2D — GPU parallelism and frame rate](https://ume.group/articles/webgl-vs-canvas-2d)
- [SVG vs Canvas vs WebGL (2026 comparison)](https://www.svggenie.com/blog/svg-vs-canvas-vs-webgl-performance-2025)
- [Canvas vs WebGL: which renderer, when](https://simplified.media/guides/canvas-vs-webgl)
- [Godot 4.6 — iOS Metal / Mobile renderer](https://github.com/gtibo/godot-4.6-release-page/issues/3)
- [Godot: Metal support (macOS arm64 + iOS) PR #88199](https://github.com/godotengine/godot/pull/88199)
- [Godot 4 mobile optimization guide](https://gtstu.com/godot-4-optimize-android-ios/)
- [Canvas2DtoWebGL — a drop-in shell (rejected path)](https://github.com/jagenjo/Canvas2DtoWebGL)
- [Firefox 110: GPU-accelerated 2D canvas by default](https://www.phoronix.com/news/Firefox-110-Released)
