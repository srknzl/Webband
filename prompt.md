# Task: move WebBand's battle renderer to PixiJS 8

You are working on **WebBand**, a single-page Mount & Blade-style RPG that runs in the browser
(Turkish UI, EN/ID translations, no build step). Your job is to render the **battle** with
**PixiJS 8 (WebGL)** instead of hand-written Canvas2D, keeping Canvas2D as a fallback, with the
look and every animation unchanged.

- Work on this branch (`pixi-migration`) or a branch off it; open a PR into `main`.
- Do **not** push to `main`, do **not** deploy (deploy is a manual copy to another repo).
- Delete this `prompt.md` and the `poc/` folder in the PR's last commit — they are scaffolding.

## Read first (in this order)

1. `CLAUDE.md` — invariant rules. They override anything in this file.
2. `docs/SYSTEMS.md` — sections *Visual layer*, *Motion (1.32.0)*, *Soft pass (1.32.0)*,
   *Performance*, *Lite mode*, *Adaptive frame rate (1.31.5)*, *Fighting beside a clashing lord*.
3. `battle.js` — `Battle.render()`, `drawUnit()`, `drawHud()`, `drawMinimap()`,
   `drawSiegeFx()`, `drawBossSpecial()`, `buildGround()`, `unitSprite()`, `troopSprite()`,
   `playerSprite()`, `bossSprite()`, `bakeFitted()`, `roundRect()`, and the battle loop in `start()`.
4. `app.js` — `Anim` (easing/clock vocabulary), `Game.skipFrame`, `Game.battleCtx`,
   `Game.lite`, `Game.targetFps`, `Game.opt/setOpt/OPTS`, `Game.showSettings`, `Debug.report`.
5. **`poc/`** — a working proof of concept of exactly this move, on a stand-alone mini battle:
   - `poc/sim/battle-sim.js`: a deterministic mini battle (not the game's engine).
   - `poc/a-pixi/render-canvas.js`: that battle drawn the way the game draws today.
   - `poc/a-pixi/render-pixi.js`: the same battle in Pixi 8 — pooled Sprites per layer, every
     per-unit shape baked once to a texture at devicePixelRatio, pixel-art sprites with
     `nearest` sampling, `BitmapText` damage numbers, one `app.render()` per frame with the
     ticker stopped. **Follow its structure.**
   - `poc/a-pixi/assets.js`: the baking helpers (shadow, rings, sword, bow, arrows, corpses,
     stains, ground, vignette).
   - `poc/a-pixi/vendor/pixi.min.js`: the Pixi 8.21 UMD build + licence, already pinned.
   - Run it: `node poc/serve.mjs` then open the printed `/poc/a-pixi/` URL.

## Why (so you optimise for the right thing)

Measured on an iPhone 14, Canvas2D already holds 60 fps with zero jank even at 250 v 250 units
(Pixi too; CPU 1–4 ms/frame for all). So this is **not** a frame-rate fix. The goals are:

1. **Crisp rendering**: today `#battle-canvas` is 1 canvas px per CSS px, i.e. soft on
   retina. Pixi renders at `min(devicePixelRatio, 3)` with `autoDensity`.
2. **A GPU scene graph** for future effects (particles, filters, light) and a lower per-unit
   cost than ~15 `ctx.*` calls per unit.
3. **Nothing else changes**: same picture, same motion, same gameplay.

## Scope of this PR

The battle only: ground, water shimmer, siege FX, blood, corpses, swing trails, the touch aim
arc, boss telegraphs, units (`drawUnit` including shield, bow, sword, rank ticks, health bars),
arrows, sparks, floating texts, the vignette, the HUD (tug-of-war bar, command strip, status
text) and the minimap.

Out of scope, stays Canvas2D: the world map (`renderMap`), settlement scenes
(`renderScene`/`drawScene`), view backgrounds, and `TournamentMinigame` (the chicken chase).
End the PR description with what a follow-up PR for the map would need.

## Architecture

- **A renderer seam.** `Battle` keeps all game state and animation clocks exactly as today
  (`atkT/atkA`, `hitT/hitA`, `shotT/shotA`, `deadT/fallDir`, `DIE_T`, `shakeT`, `cam`,
  `camZoom`, `tugRatio`, `floatingTexts[].age`). Split the *drawing* behind one interface, e.g.
  `Battle.gfx = { init(host), resize(w, h), render(battle, now), destroy() }`, with two
  implementations: the current Canvas2D code (moved as-is, not rewritten) and the new Pixi one.
- **Rendering must be side-effect free.** Today `drawUnit` plays the hoofbeat sfx and writes
  `u._hoofUp`; move that into `update()`. Rendering twice must leave state identical.
- **Setting through the single gate**: `Game.OPTS.renderer = 'auto'`, values
  `'auto' | 'pixi' | 'canvas'`, read with `Game.opt('renderer')`; `'auto'` = Pixi when a WebGL
  context can be created, else Canvas2D. Add a row to `Game.showSettings()`. Every new `T()` key
  goes into **both** `lang-en.js` and `lang-id.js` in the same commit. Add the renderer name,
  its resolution and (if cheap) the draw-call count to `Debug.report().render`.
- **One canvas cannot hold both a `2d` and a `webgl` context.** `#battle-canvas` is shared by
  `Battle` and `TournamentMinigame` through `Game.battleCtx()`. Give Pixi its own canvas
  (e.g. `#battle-gl`) stacked inside `#battle-view` and show exactly one of the two. It needs
  `touch-action: none` like the other gesture canvases (see CLAUDE.md, #91). Keep
  `Game.battleCtx()` working for the chicken chase.
- **Input and hit-testing stay in world coordinates** (`Battle.worldMouse()`, `Input.mouse`,
  the touch sticks). The Pixi canvas' CSS size must equal today's canvas, so nothing that maps
  screen → world changes.
- **Motion parity.** Reproduce every 1.32.0 motion as sprite transforms, reading the same
  clocks and the same `Anim` curves:
  - feet-pivot lean / fall / squash
  - lunge + swing trail for AI swings
  - eased hit flash
  - shot recoil + visible bow for AI archers
  - walk stretch and lean; idle breathing
  - the 0.7 s fall with the corpse fading in
  - damage-number pop (`Anim.ease.outBack`)
  - the player-hit camera shake (sine-based — no `Math.random` in the draw path)
  - `Anim.on()` (reduce motion) behaviour

  Mounted gait uses the 1.32.1 values (`strideMs = max(170, 12000/speed)`, hop 3.5, sway 0.07).
  Rounded shapes come from the 1.32.0 soft pass (tug bar and command strip as pills, rounded
  health bars).
- **Allies (1.32.1).** Units with `allyOf` are a backed lord's men on the player's side; they
  draw like the player's troops.
- **Lite mode and the adaptive frame rate stay as they are**: `Game.lite()` still thins
  particles and ground detail; `Game.skipFrame()` / `Game.targetFps()` still gate the loop.
  The loop rules in CLAUDE.md apply: double-start guard, the loop restarts only from
  `showScreen()`, the 700 ms pulse check still works.
- **Performance rules still apply**: no `backdrop-filter` above the moving canvas; bake
  expensive things once (ground, shapes, emoji sprites) and pool Sprites instead of creating
  display objects per frame.

## No-build rules

- Move the pinned `poc/a-pixi/vendor/pixi.min.js` (+ `PIXI-LICENSE`) to `vendor/`. Load it with
  a classic `<script>` **before** `app.js` in `index.html` and update CLAUDE.md's script-order
  rule. No CDN at runtime.
- Add it to `sw.js`'s `FILES` (precache) and to `native/package.json`'s `www` copy list.
- `tools/harness.js` runs the four game scripts in Node with a fake DOM and no WebGL. It must
  keep loading unchanged: in the harness the renderer resolves to Canvas2D (or a no-op), and
  Pixi is never touched there.
- `node tools/test.js` and `node tools/framegate.js` must stay green.

## Tests and proof

- **Unit (`tools/test.js`)**:
  - renderer selection: `auto`/`pixi`/`canvas`, and the fallback when WebGL is missing
  - the settings row goes through `Game.opt`/`setOpt`
  - rendering is side-effect free (render twice → identical `Battle` state)
- **E2E (`e2e/`, Playwright, runs every spec in 4 projects: tr-desktop, tr-phone, en-phone,
  id-desktop)**:
  - `battle.spec.js`'s `painted()` reads pixels through a `2d` context. Make it
    renderer-aware (Pixi: `app.renderer.extract`, or `preserveDrawingBuffer` only when a test
    asks for it).
  - Add a spec that fights a battle with `renderer=pixi` and one with `renderer=canvas`: the
    canvas paints, units move, the result screen appears.
  - `assist.spec.js` (allies on your side) must keep passing.
  - `e2e/fixtures.js` fails any test on a console error, a failed request, a missing `T()`
    key, or a Turkish-only letter on an EN/ID screen.
  - Run:

    ```
    cd e2e && npm ci && npx playwright install chromium && npx playwright test
    ```

  - Chromium headless has WebGL (SwiftShader). A local static server is started by the config;
    if Python's `http.server` stalls on your OS, start `node poc/serve.mjs 8124` first — the
    config reuses an existing server.
- **Screenshots for the PR**: the same battle frozen mid-fight (`Battle.paused = true`, fixed
  clocks) under canvas and under pixi, on the desktop and the phone viewport.
- **Numbers**: CPU ms/frame for both paths from the debug report on desktop. Say plainly that
  device measurements are still to be done.

## Housekeeping (CLAUDE.md)

- Bump `VERSION` in `app.js`. In the same commit add a `CHANGELOG.md` entry (player-facing
  Turkish) and set the matching `CACHE` name in `sw.js` — `tools/test.js` asserts all three.
- Update `docs/SYSTEMS.md`: *Visual layer*, *Performance*, and any "Measured" line whose number
  changes.
- Code comments in English, UI text in Turkish through `T()` (never inside a top-level data
  table).
- PR description:
  - what moved where
  - how to switch renderers (setting + URL/console)
  - known gaps
  - the map follow-up
  - before/after screenshots
