# WebBand

A Mount & Blade: Warband-style single-page RPG that runs in the browser. Turkish UI.
No build, no dependencies — `index.html` opens directly in the browser.

**Deploy**: the live site is `serkanozel.me/webband` — to update it, copy this repo's files
to `~/git/serkanozelme/blog/public/webband/` and push that repo (auto-deploy fires).

**Detail lives in `docs/SYSTEMS.md`** — every mechanic's design decision and measured number.
Only invariant rules live here. Before changing a mechanic, read its section there;
after changing it, update the "Measured" lines.

## Files

| File | Contents |
|---|---|
| `index.html` | DOM skeleton for every screen |
| `app.js` | Core — map, time, settlements, diplomacy, saves. `Debug`, `Input`, `Game`, `Save` + `state` |
| `battle.js` | `Battle`, `TournamentMinigame` |
| `nobles.js` | `LORDS`/`LADIES`/`COMPANIONS` + `Nobles`, `Feast` |
| `quests.js` | `QUESTS` + the `Quests` quest engine |
| `i18n.js` | `I18N` + global `T` |
| `lang-en.js` / `lang-id.js` | Generated dictionaries — never hand-edited |
| `style.css` | Glass panel theme, CSS variables |
| `sw.js`, `manifest.webmanifest`, `fonts/`, `icon-*.png` | PWA: offline cache, install metadata, self-hosted Cinzel/Inter |
| `native/` | Capacitor shell — the only place npm exists. `ios/`/`android/` are generated, never committed |
| `tools/` | Node measurement tools (`harness.js` + `test/sim/duel/economy/framegate`) |
| `docs/SYSTEMS.md` | Mechanic breakdown and measurements |
| `docs/PLAN-*.md`, `docs/measurements/` | Design plans, dated measurement reports |
| `CHANGELOG.md` | Change list in player-facing language |
| `bg*.jpg`, `lord_portraits.jpg`, `kingdom_crests.jpg` | Images (sprite sheets 3×3) |

## Invariant rules

**Globals stay global.** The UI binds with `onclick="Game.xxx()"`, so `Game`/`Battle`/
`Nobles`/`Quests`/`Feast`/`Save`/`Debug` must be global. In a classic script, `const` is a
**lexical** global — it isn't looked up as `window.Game` (which is why the `alert` override
checks `typeof Game`).

**Script order**: `i18n.js` → `lang-en.js` → `lang-id.js` → `app.js` → `battle.js` →
`nobles.js` → `quests.js`. The order only prevents `const` collisions.

**One `state`**; `Save` writes it to localStorage (3 manual slots + a ring of 5 autosaves,
`Save.migrate` is a single migration chain; a new field is usually enough with the
`ensureX()` pattern). **`VERSION = { no, date, name }`** sits at the top of `app.js`, is
**bumped by hand**, and gets a line in `CHANGELOG.md` **and** a matching `CACHE` name in
`sw.js` in the same pass — the worker serves cache-first, so an unbumped cache name ships
the old game forever. `tools/test.js` asserts both.

**Raw stays, translate at display.** The i18n key is the Turkish source text itself
(`T('Yeni Oyun')`, `` T`${n} asker` `` → `{0}`). Never call `T()` inside a **top-level data
table** — that line runs before `I18N.load()` and freezes the translation. The table stays
raw Turkish, `T` is called at the display site; name-based comparisons (`=== 'Orman'`) stay
language-independent this way. If a data field stays raw, **every** path that displays it
must go through `T`.

**Dictionaries are generated.** If you change a `T()` key, update `lang-en.js` **and**
`lang-id.js` in the same pass; `tools/test.js`'s *"every T key exists in both dictionaries"*
assertion is the regression gate for this. Percent formatting is `Game.pct(n, signed)`.

**Settings through one gate**: defaults in `Game.OPTS`, read via `Game.opt(k)`, write via
`Game.setOpt(k,v)` — `state.settings` only holds **deviations**. Tri-state device settings
are `'auto' | true | false`.

**`touch-action` is not inherited.** The gate is `* { touch-action: pan-x pan-y }` in
`style.css`, not `html, body` — a rule on the body leaves every button inside it on `auto`
and the browser keeps its double-tap zoom (#91). The six elements that own their own
gestures (three canvases, two sticks, the block button) override it with `none`; an id or
class selector outranks `*`.

**There's no single "mobile mode" switch for devices** — four separate questions, four
knobs: *how input arrives* `Game.isTouch()` (= `pointer: coarse`; `body.touch`, help text,
`#touch-ui`), *how layout adapts* `@media (max-width: 820px / 430px)`, *how much gets drawn*
`Game.lite()` (`'auto'` = `isTouch()`), *whether edges pan* `Game.edgePan()` (`'auto'` =
`!isTouch()`).

**Battle damage passes through a single choke point**: `Battle.afterArmor(dmgType, raw, def,
tgt)` — armor, damage type, and the difficulty multiplier (`Game.dmgMult`) all live there.

**The game loop** genuinely stops while `Battle.active || TournamentMinigame.active`
(`_loopId = null`); the only place that restarts it is `showScreen()`. Every rAF loop has a
double-start guard.

## Performance

The bottleneck isn't JS, it's the **compositor**: battle JS runs ~1.2 ms per frame, budget is
16.7 ms.

- `Game.skipFrame(t)` drops extra frames; the refresh period is the **median of the last 31
  frames** (#85) and the decision is made **per frame**, not per call (#42).
- **No `backdrop-filter` above the moving canvas**; `renderMap()` returns early while a modal
  is open.
- Expensive things are baked once (`buildGroundTexture`, `Battle.buildGround`, `unitSprite`,
  `Game.emoji/radial/textW`) — no gradient is generated per frame.
- Canvases are opaque; `battle-canvas` is shared by both engines, both read from
  `Game.battleCtx()`.

## Measurement and tests

`tools/harness.js` is the single entry point: it builds a fake DOM, runs the four scripts in
**one `vm` context**, and the same seed gives the same world via seeded `mulberry32`. It
exports: `{ load, world, run, mulberry32, args, seeds, writeReport }` — there's no `boot`.

```
node tools/test.js [--fast]     # 66 assertions ~5s / pure-logic only ~0.15s
node tools/framegate.js         # frame-skip gate + #42 parity regression
node tools/sim.js --days 200 --seed 1-5 | duel.js --n 200 | economy.js --days 60 --troops 10
```

CI runs the first two on every push; the web build has no `npm install` step. `native.yml`
is the second pipeline — it assembles `native/www` from these same files, runs
`npx cap add`, and leaves a sideloadable Android `.apk` plus a compiled iOS build as run
artifacts. npm lives only under `native/`. The expected numbers are
the "Measured" lines in `docs/SYSTEMS.md` — if one changes, either the code or the doc is
wrong.

## Code style

Code comments and docs in English, UI text in Turkish (via `T()`), variable/function names in
English. The UI is built from `innerHTML` template strings, inline `style` is common; small
font sizes read from `--fs-xs/sm/md` variables. Modal: `Game.showModal(html, width?,
bgImage?)` / `closeModal()`; `window.alert` is routed to a modal.
