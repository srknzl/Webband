# WebBand — system notes

The detailed counterpart to CLAUDE.md. Each section writes down a mechanic, its design
decision, and that decision's **measured** counterpart. CLAUDE.md carries only the invariant
rules; the reasoning, numbers, and history live here.


## Files

| File | Contents |
|---|---|
| `index.html` | DOM skeleton for every screen (start, main-ui, map/settlement/character/party/inventory/battle views, modal, captivity panel, siege camp panel, loot panel, camp panel) |
| `app.js` | Core — map, time, settlements, diplomacy, saves. Global objects: `Debug`, `Input`, `Game`, `Save` + `state` |
| `battle.js` | Battle arena and the tournament minigame: `Battle`, `TournamentMinigame` |
| `nobles.js` | `LORDS` (23), `LADIES` (12), `COMPANIONS` (7), `PERSONALITIES`, `LADY_TRAITS`, `COMPLIMENTS`, `POEMS` + the `Nobles` and `Feast` objects |
| `quests.js` | `QUESTS` (15 quest definitions) + the `Quests` quest engine |
| `i18n.js` | Language layer: `I18N` + global `T` — the key is the Turkish source text itself |
| `lang-en.js` / `lang-id.js` | Generated dictionaries (1785 keys); never hand-edited |
| `docs/PLAN-nobles-and-quests.md` | Design plan for this system |
| `docs/PLAN-mobile-port.md` | Mobile port research and plan (measured codebase breakdown + framework comparison) |
| `tools/` | Node measurement tools (`harness.js` + `sim`/`duel`/`economy`/`framegate`) — see "Measurement tools" |
| `docs/measurements/` | Dated measurement reports produced by the tools |
| `README.md` | English repo blurb — setup is one line: open `index.html` |
| `CHANGELOG.md` | A dated change list in player-facing language; the version number is the `VERSION` constant |
| `.github/workflows/test.yml` | Runs `test.js` + `framegate.js` on every push; if green, opens a release for `VERSION.no` — see "Versions and releases" |
| `.github/ISSUE_TEMPLATE/bug.md` | Bug template: version stamp, **screen refresh rate**, debug report, save JSON |
| `style.css` | Glass panel (glassmorphism) theme, CSS variables (`--primary`, `--danger`, `--success`, `--panel-border`, `--text-muted`) |
| `bg_hdr.jpg` | Background image (`bg.jpg` was a copy of the same file, deleted — #88 item 10) |
| `lord_portraits.jpg` | 3x3 sprite sheet — lord portraits (cropped with `background-position`) |
| `kingdom_crests.jpg` | 3x3 sprite sheet — kingdom crests |
| `LICENSE` | AGPL-3.0-or-later |

## Architecture

`window.onload → Game.init()` → map generation + NPC spawn. `Game.startGame()` starts the
game loop (`requestAnimationFrame`). The loop calls `update(dt)` + `renderMap()` and
**genuinely stops** while `Battle.active || TournamentMinigame.active` (`_loopId = null`,
no new frame requested); battle/tournament run their own loop. The only place that restarts
the loop is `showScreen()`: when returning to a non-battle screen, if `_loopId` is empty and
both engines are off, `startGameLoop()` is called. Every path out of battle (victory, defeat,
surrender, duel, arena, tournament) goes through `Game.showScreen('map')`, so no extra hook is
needed.

Script load order: `i18n.js` → `lang-en.js` → `lang-id.js` → `app.js` → `battle.js` →
`nobles.js` → `quests.js`. Since every reference between them lives inside function bodies,
the order only matters to avoid a `const` collision. *(In a classic script, `const` enters
global lexical scope, so `Battle` in `battle.js` is visible from `app.js` too — it shouldn't be
looked up as `window.Battle`.)*

All data lives in a single `state` object; `Save` writes it to localStorage as JSON
(3 slots + a ring of 5 autosaves, see "Save system").

`VERSION = { no, date, name }` sits at the very top of `app.js` and is **bumped by hand**.
The `#ver-tag` in the corner of the start screen and the first line of the debug report both
read from the same constant — since the player's desktop shortcut pulls the repo to `main` on
every launch, this is the only answer to "which code are we talking about" (#55 item 8). A line
is also added to `CHANGELOG.md` when the version is bumped.

Global data constants: in app.js — `FACTIONS`, `LOCATIONS`, `RIVERS`, `FORESTS`, `ITEMS`,
`TROOP_TREES` (+ the `TROOP_UPGRADES` / `TROOP_TYPES` generated from it); in nobles.js —
`LORDS`, `LADIES`, `PERSONALITIES`, `LADY_TRAITS`, `COMPLIMENTS`, `POEMS`; in quests.js —
`QUESTS`.

`window.alert` is overridden → shown as a modal.

## Current features

### Character creation
`start-btn` → `Game.startGame()` no longer drops you straight into the world; it opens a
6-step wizard running on a modal (`Game.creation = { step, sel }`): gender + 4 background
questions (`BACKGROUND`) + a banner (`BANNERS`), then a summary. On confirm, `applyCreation()`
applies the choices from one place and `enterWorld()` (the old `startGame` body) runs.

- Choice effects sit as data: `attr{}`, `prof{}`, `money`, `renown`, `item` (equipped),
  `relAll`, `relFaction{id,n}`. `Game.bonusText(o)` turns this into human language — both the
  choice card and the summary read from the same function.
- Answers are stored in `state.player.background`; the character screen writes them with
  `Game.backgroundLine()`.

| Question | Choices (summary) |
|---|---|
| Who are you? | Male (neutral) / Female (**−5** relation with every lord, marriage path changes) |
| Where were you born? | 5 faction homelands — one gives an attribute/skill + **+5 relation with that kingdom's lords** |
| What did your father do? | Noble (+200 coin, +10 renown, Leadership+1) / Merchant / Blacksmith / Soldier / Shepherd |
| What did you do in your youth? | Servant / Hunting / Streets / Monastery / Stable — skill points |
| Your first profession? | Mercenary (sword) / Caravan guard (shield) / Knight hopeful (**horse**, −100 coin) / Smuggler (+300 coin, −2 relation) / Bandit (axe, −4 relation) |

- **Banner** (`BANNERS`, 9 crests): cropped from the `kingdom_crests.jpg` 3×3 sprite sheet
  with `Game.bannerCss(i)`. Its color (`Game.bannerColor()`) is used for the party icon on the
  map, and for `FACTIONS.player_kingdom` once you found your own kingdom (used to be the fixed
  `#ffcc00`).
- `Nobles.initRivals()` is now called from `enterWorld()`, not `spawnNPCs()` — which suitors
  rival you for depends on gender. `Save.load()` sets up rivals if an old save has none.

### World map
- Procedural continent border: `getMapRadius()` produces an irregular coastline from an
  angle-dependent sum of sines; `clampToMap()` keeps everyone inside it.
- Settlements (`LOCATIONS`) are **rule-based redistributed** inside `init()` (`Game.layoutWorld`)
  — the array's x/y values aren't used; see "Settlement layout (#57)".
- Roads: a network with natural routes, varied kinds, and junctions (`state.roads`,
  `state.bridges`) — see "Road network (#56)".
- Rivers (`RIVERS`) and forests (`FORESTS`) have fixed coordinates.
- Points of interest (`state.sites`): ruins, farms, towers, caves, camps — see "Abandoned
  structures (#58)".
- **Forest affects gameplay**: an enemy in a forest isn't visible at normal sight range
  (`Game.spotRange(npc)` = sight × `min(0.9, 0.25 + Scouting×3% + Pathfinding×2%)`; 500 → 125
  units with base skills). Rendering, the tooltip, and clicking all go through the single
  `Game.canSee(npc)` check. A wolf pack in a forest locks onto the player from **as close as
  `spotRange(npc)`** and **lunges at ×1.6 speed**; a charging pack is marked on the map with a
  pulsing red ring (`npc.charging`). *(The range used to be a fixed 700 — with the pack
  closing at ×2 speed, the player only saw it from 125 units away, meaning the whole approach
  was invisible.)*
- **Ambush** (`Game.checkAmbush`, one roll per second): while moving through a forest,
  jumps onto a hidden band within `min(AMBUSH_RANGE=240, spotRange(band))` — meaning **the
  band that ambushes you is always close enough to be drawn**. *(The fixed 240 was wider than
  a starting character's forest sight (125): a band setting up an ambush would, by definition,
  never have been drawn on screen. 240 stays as a ceiling so ambushes don't get more frequent
  as skills grow.)* A strong party isn't ambushed: the check is `your healthy troop count <
  band.size × 1.5` — six wolves won't jump a forty-strong army. Notice chance is
  `min(0.9, 0.2 + Scouting×6% + Pathfinding×4%)` — if you notice, it's a normal encounter
  (green warning); if you don't, `state.ambush` opens: `Battle.start` places the player at the
  center of the arena and spawns the enemy in a 130–240 unit **ring** around them (normally
  470–530 units away, in a single line).
- **No fog of war** (unlike Warband): terrain, roads, rivers, and settlements are visible
  from the first frame. The only thing hidden is **parties** — `Game.canSee(npc)` /
  `Game.spotRange(npc)` are still the single gate, so distant and forest-hidden bands stay
  invisible. Sight is `Game.getVisibility()` = `500 + (int−10)×30 + (Scouting−1)×25`, **×0.7 at
  night**; it no longer scrapes away fog, it only sets the party-notice range.
  *(Removed: `exploredCanvas`/`exploredCtx`/`exploredGrid`, `markExplored`, `repaintFog`,
  `loadExplored`, the layer that darkened everything outside the sight circle with
  `evenodd`.)*
- Camera: mouse wheel zoom (`Game.minZoom()`–3.0), edge-of-screen mouse pan, **free pan with
  WASD/arrow keys** (#44), soft follow on the player. The camera tracks `state.player +
  camera.offset`; panning only moves the offset, is clamped to ±9000 units, and **Space** /
  🎯 Find Me (`Game.centerOnPlayer`) resets it. *(WASD used to do the opposite and reset the
  offset: the only way to pan the map by hand was pinning the mouse to the screen edge. The
  rule that auto-pulled the offset back while clicking-and-walking was also removed — reining
  in the camera is now the player's own call.)* The lower bound is computed from the screen
  (`min(short side/9600, 0.8)`, floor 0.07) — **the whole continent (9000 units) fits on one
  screen**. Measured at 1440×900: zoom 0.084, the screen shows a 14453×9600-unit area, all 25
  settlements are drawn and only 4 of 36 parties (the ones in sight). Since settlement and
  party icons shrink away in world units when zoomed out, they're scaled up with
  `Game.iconScale()` = `max(1, 0.55/zoom)` (labels were already screen-sized via `1/zoom`).
- **Route line and draggable target** (#35): a flowing thin dashed line (shadow + gold
  layer) and, at the target, a small **filled** dot + a pulsing ring. The arrowhead was
  removed — the line already says the direction. The line and marker are screen-sized
  (`/zoom`), so they don't thicken up and swamp the map when zoomed out. The target marker
  **can be dragged with the mouse**: `startTargetDrag` grabs it if pressed near the marker's
  `targetGrabRadius()` (16 px on screen), `handleMapHover` moves `Game.dragTarget` while
  dragging, `endTargetDrag` hands the drop point to `setTarget`. The temporary dragged route is
  **white and static**, the confirmed route is **gold and flowing** — which one is active is
  clear at a glance. The `click` that follows a drop is swallowed (`suppressClick`), otherwise
  the target got set twice.
- Click-to-move: settlement → enter it, NPC → encounter, empty space → free movement.
  Clicking, dragging, and the tooltip all go through the same two gates: `Game.mapPos(e)`
  (screen → world) and `Game.setTarget(m)` (settlement < 36 → NPC < 30 → empty space).
- **Party icons** (show what the party looks like, like in Warband, `Game.drawPartyIcon`):
  a **mounted** silhouette if it has a horse (`drawRider`: horse + saddle cloth + raised sword),
  otherwise a spearman on foot (`drawFootman`: spear + shield + helmet). Faction color is on
  the saddle cloth/shield and the banner. A party of 10+ gets 1 extra figure drawn behind it,
  30+ gets 2 — a crowd reads as a crowd from a distance. Nobles are mounted; a king gets 👑, a
  marshal gets 🎖️.
- Name labels (`Game.mapLabel`) are drawn at a **zoom-independent screen size** and
  overlapping ones get nudged upward (`_labelRects` collision test).
- **Map tooltip** (`handleMapHover` → `#map-tooltip`): hovering a settlement shows
  `Game.locTipHtml(loc)` — faction + type, its lord and your relation with them, prosperity,
  garrison (`Game.garrisonOf`), pending recruit, an "siege only" warning if it's enemy soil —
  but **only as much as you actually know** (see "A settlement's location is known, its state
  isn't"). Over a band/party: type (creature pack / bandit band / faction) + troop count.
  *(The screen→world conversion was missing the `rect/2` centering offset — the tooltip was
  looking for whatever was half a screen away from the cursor, so it never opened.)*

#### A settlement's location is known, its state isn't (#74)
There was a sight check for bands (`canSee`), but not for settlements: a keep on the far side
of the map had its garrison, prosperity, and pending recruit written right into the tooltip.
Now the tooltip shows one of three states:

| State | Condition | Tooltip |
|---|---|---|
| **Live** | `Game.locLive(loc)` — within `getVisibility() × LOC_SPOT` (1.5) | today's real values |
| **Memory** | you've entered its range before, or entered it (`loc.intel`) | values **from that day**, headed *"4 days ago:"* |
| **Unknown** | never visited | "You don't know its state — get closer or go inside." |

Range is wider than a band's sight (500 → **750** units): the smoke over the wall is visible
from a distance, but counting the garrison needs getting close. `Game.noteLoc(loc)` writes the
memory; it has two callers — `Game.scoutTick()`, which runs once an hour (inside
`advanceTime`'s hourly loop, next to `regenTick`) and `enterLocation` (walking through the gate
sees everything). The record is written as `loc.intel` alongside `state`; an old save has no
such field, so that settlement starts as "unknown" — no migration code was needed.

**Location info isn't hidden**: the settlement stays on the map, its name and faction banner
are visible, it can be targeted — only the things that **change** are hidden (its lord, its
prosperity, its garrison, its recruit). There was never a way to see market prices from a
distance anyway; that information channel is already the **guild price ledger** at the inn.

Measured (no seed, fresh world): sight 500 → settlement range **750**, **1 of 25** settlements
in range at the start. The Emir's village at 3517 units has the tooltip
*"Svadya Kingdom · Village — You don't know its state"*; Azgad at 723 units gets the full
readout. Passing by Praven and moving away, the tooltip reads *"Today's news: … Garrison ~30
troops"*; 4 days later, even though prosperity is actually 51 → **90**, the tooltip still says
**"4 days ago: … Prosperity: Managing (51)"**. Over a recording run, `intel` came back
byte-for-byte identical for three settlements; a call to `enterLocation` from 9000 units away
refreshed the memory to **day 99**. A `scoutTick` call costs **0.003 ms** (25 settlements),
0.072 ms total per day. 3 new keys went into both dictionaries; `I18N.missing` is empty across
tr/en/id.

### Settlement layout — minimum gap, border keep, village center (#57)
The old layout was one line: every settlement dropped at a **fully random** point (1000–3500
units from center) inside its faction's angular slice. Measured (200 worlds): **6.81 minimum-
gap violations** per world, **200 of 200 worlds** had at least one violation, the median
closest pair was **148** units apart (worst **12** — two towns nearly stacked), and **82
settlements** ended up outside the continent. `layoutWorld()` replaces this with three rules;
the world is rebuilt from scratch (up to 12 tries) until the rules hold.

**1. Minimum gap** (`Game.MIN_GAP`, `minGap(a,b)` looks at the pair's types): town–town 700,
town–keep 480, town–village 380, keep–keep 620, keep–village 340, village–village 420 units.
`spotOk(p, type, placed)` is the single gate: a candidate point must be **320 units** inside
the coast *and* far enough from everyone already placed per their pair rule. If no spot is
found in 400 tries, the last candidate is accepted (a flawed world beats a hang — validation
catches it anyway).

**2. Keep at the border, town in the middle** (`placeLocations`): within the slice, the angle
`f` is `0.02–0.20` or `0.80–0.98` for a keep, `0.22–0.78` for a town. So the keep faces the
neighboring kingdom's border while the town sits in the heartland. Measured (40 worlds, 240
keeps / 520 towns): **100%** of keeps, **0%** of towns fall in the slice's outer 20% band.
Distance from center is **relative to the coastline** (`R = getMapRadius(angle)`,
`d = R × 0.28–0.82`) — a fixed 1300–3200 band left the continent's bulging sides empty.

**3. A village has a parent** (`placeVillage`): every village attaches to the town/keep of
that faction with the **fewest villages** (`loc.parentId`) and is placed `VILLAGE_RANGE` =
**420–900** units away from it. Measured (200 worlds): village-to-parent distance min **420**
/ median **655** / max **900**.

`validateLocations()` audits the generated world and returns a **human-language** list of
problems: off-continent, minimum-gap violation, a village with no parent/disconnected, a
settlement **not connected to the road network** (within 40 units of a `state.roads`
endpoint). `layoutWorld` loops until this list is empty; if it still hasn't settled after 12
tries, it writes the reason with `console.warn`. Measured (200 worlds): **median tries 1, max
tries 1, 0 failures in 12 tries**.

| | old | new |
|---|---|---|
| Violations / world | 6.81 | **0** |
| Worlds with a violation (of 200) | 200 | **0** |
| Closest pair (median / worst) | 148 / **12** | **431 / 345** |
| Off-continent (total over 200 worlds) | 82 | **0** |
| Distance to emptiest point (median of 40 worlds) | 2294 | **2189** |
| Random point to nearest settlement (median) | 680 | **637** |

The tightest gap measured per pair type settles right at the rule itself: town|town 701,
keep|town 481, town|village 380, keep|keep 622, keep|village 345, village|village 454.

**`parentId` erases three duplicated heuristics.** Conquest (`captureSettlement`), granting a
fief (`grantFief`), and granting a fief to a vassal (`grantFiefTo`) each wrote their own
"villages within 900 units come along too" rule **separately**; now all three call
`Game.villagesOf(loc)`. An old save's village has no `parentId` — `villagesOf` then falls back
to the old 900-unit rule, so no migration code was needed. (`parentId` is written into
`Save.snapshot`'s `locations` array.)

### Road network — bends, kind, and bridges (#56)
Roads used to be the **straight-line edges** of a minimum spanning tree connecting
settlements: 24 segments, all the same brown, all the same ×1.1. The network has changed in
three ways.

**1. A route bends** (`Game.roadPath(a, b)`): not a straight line between two points, but a
polyline of `max(6, min(18, distance/220))` segments. A base bend that zeroes out at the ends
via `sin(t·π)` (amplitude = length × 0.10–0.24) is layered with a deviation from the second
harmonic; if a midpoint lands inside a forest it's pushed to the **edge** (radius + 45) and
run through `clampToMap`. Measured (285 random settlement pairs): road-length-to-straight-line
ratio, median **1.049**, p90 1.088, max 1.122 — so a road is ~5% longer than as the crow
flies. Segments passing **through** a forest: 0 (straight lines used to slice right through
forests).

**2. A road has a kind** (`Game.ROAD_KINDS`, from the destination settlement's type: town →
stone, keep → dirt, village → goat path). The kind sets both the radius, the speed
multiplier, and the texture:

| Kind | Radius | Speed | Measured speed (same group, flatness 121.5) | Texture |
|---|---|---|---|---|
| 🛣️ Stone Road | 26 | ×1.18 | **143.4** | gray stone surface, short dashed center line |
| 🛤️ Dirt Road | 22 | ×1.10 | **133.7** | brown, long dashed wheel ruts |
| 🥾 Goat Path | 15 | ×1.04 | **126.4** | thin, faint, sparse dashes |

A road is 5% longer but 18% faster, so following a stone road is a net ~12% gain — a
Warband-style "stick to the road" preference, not a requirement.

**3. Junctions and bridges.** Not every edge of the MST leaves from a settlement anymore: a
new settlement checks its distance to connected settlements **and to existing road points**,
and the closest wins. When a road point wins, a real **T-junction** forms in the network
(measured: a typical world has **5 junctions** away from settlements). If a road segment
crosses a river segment (`Game.segCross`), the intersection point is written into
`state.bridges` as a **bridge**: drawn on the map as planks perpendicular to the road,
`Game.onBridge(x, y)` (70 units) means `getTerrainInfo` **doesn't apply** the river's ×0.5
penalty there, the name stays "🌉 Bridge" but it gets the road's speed multiplier (measured:
133.7 on the bridge, vs. "River Crossing" ×0.5 at the same river's unbridged spot).

**Cost**: segment count 24 → **~150**. `getTerrainInfo`'s road loop got a cheap bounding-box
cull first and the `sqrt` comparison was squared instead; even so, per-call cost went from
0.35 µs → **3.84 µs**. The frame-budget impact was measured (50 NPCs, `update` +
`renderMap`): **0.88 ms → 1.17 ms**, i.e. 1.7% of the 16.7 ms budget. A spatial grid wasn't
needed.

*(Save note: `state.roads` and `state.bridges` are written alongside `state`. A pre-`#56`
save's segments have no `kind` — `Save.apply` notices and re-weaves the network from scratch.)*

### Abandoned structures and points of interest (#58)
Terrain used to be only settlements and enemies; two towns meant an empty road between them.
Now the map has **14 points of interest** (`state.sites`, 5 types). They don't go into
`LOCATIONS` — they have their own light-weight array — but since they carry `type: 'site'`,
the targeting and arrival machinery (`setTarget` → `update` → `enterLocation`) routes them
through **one line**: the first line of `enterLocation` is
`if(loc.type === 'site') return this.enterSite(loc)`. So a modal opens instead of a screen —
no separate movement/arrival code was written.

**Distribution** (`spawnSites`): at least `SITE_MIN_GAP` = **520** units from settlements and
from each other, inside the continent. Measured (200 worlds): worst distance to nearest
settlement **520**, median 539; worst distance between two points **522**, median 581; landing
outside the continent: **0**.

| Type | Respawn | Outcome pool (measured, 2000 rolls) |
|---|---|---|
| 🏚️ Ruins | **one-time** (removed from the map once explored) | coin 31%, ambush 30%, gear 20%, empty 19% |
| 🌾 Abandoned Farm | 25 days | food 46%, recruit 22%, empty 22%, ambush 11% |
| 🗼 Watchtower | 12 days | see-far 55%, empty 24%, coin 11%, trap 10% |
| 🕳️ Cave | 30 days | ambush 40%, coin 21%, trap 20%, gear 19% |
| ⛺ Abandoned Camp | 15 days | food 23%, coin 22%, shelter 21%, ambush 21%, empty 12% |

Outcomes (`Game.SITE_OUTCOMES`) are written **in the same pattern as the daily event pool**: a
`when` filter + a `run` that returns text. `recruit` only enters the pool if the party has
capacity. Weights sum to **57% reward, 28% risk, 15% empty** — you can't know which without
entering, but the type is a hint: caves and ruins are a gamble, farms and camps are relatively
safe.

| Outcome | What it does |
|---|---|
| `coin` | 60–220 denars |
| `gear` | random weapon/armor to inventory |
| `food` | 3–8 grain/cheese/meat |
| `shelter` | morale +4 |
| `recruit` | a local villager joins the party (if there's capacity) |
| `scout` | the closest party more than 700 units away is **marked on the map** — the "where is it?" mechanic's `state.knownLocations` marker, auto-removed by `Nobles.dailyTick` after 3 days |
| `trap` | 8–25 health |
| `ambush` | a band spawns based on the site's type (cave → wolves, ruins → mountain bandits, others → marauders) and `triggerEncounter(npc, 'ambush')` |
| `empty` | three different empty-handed flavor lines |

An ambush outcome's battle opens on the modal's **close**: `run` returns a `then`,
`Game.siteDone()` closes the modal and then runs it — otherwise the battle modal was
clobbering the outcome text.

Respawn resolves to a single field (`kind.renew`): **0 = one-time** (the point is removed),
otherwise it refills that many days after `usedDay`. Measured: exploring ruins takes it from
14 → 13 points; a cave explored on day 100 → still closed on day 129, **open on day 130**. An
explored-but-not-removed point is drawn **faded** on the map and its tooltip says how many
days ago it was cleared.

The label is only drawn at `zoom > 0.18` — 14 long names were clobbering settlement names in
the continent view. Measured: the draw cost of 14 points sits below measurement noise inside
`renderMap` (1.02–1.26 ms without sites, 1.12–1.16 ms with).

*(Save note: `state.sites` is written alongside `state`, `usedDay` is preserved. An old save
has no points — `Game.ensureSites()` inside `Save.apply` fills them in, same pattern as
`ensureTraders`.)*

### Time & daily cycle (`advanceTime` / `dailyUpdate`)
Time flows **only** on the map screen, only while no modal is open and the player is moving
(or in captivity) (`dt * Game.timeScale()`). Flow speed is left to the player: clicking the
calendar badge in the top bar cycles `state.timeScale` through 0.5 → 1 → 2 (default 1; it used
to be a fixed 2, and days passed too fast).

**Map speed** (`getPlayerSpeed`, close to Warband's model):
`(base + agility×1.5) × (1 + party bonus) × (1 + mounted ratio×0.5) × terrain × night × overload`.
Base is **66**, same while mounted. **Party bonus**: solo +50%, +20% at 10 people, 0 at 20,
−1% per person after that (floor −45%) — a crowded army marches heavier. Mounted ratio =
(cavalry count + 1 if you have a horse) / party size.

**The mounted/foot difference is capped at exactly 1.5× (#72)**, so being mounted is a
*multiplier*, not an addend. It used to be two multipliers stacked on top of each other — a
base 105/66 (=1.59×) **plus** an additive `mounted ratio×0.35` on top. Being additive didn't
give a fixed ratio since the party bonus sits in the denominator: the gap drifted as the party
grew. Measured (seed 1, flat ground, daytime), fully mounted / fully on foot:

| Party | Old | New |
|---|---|---|
| 1 | 1.83× | 1.50× |
| 10 | 1.91× | 1.50× |
| 20 | 2.00× | 1.50× |
| 65 | 2.42× | 1.50× |

`tools/test.js` holds the regression → *"speed: mounted/foot gap capped at 1.5× at every
party size"*; if it goes back to additive, that line fails.
Terrain comes from `getTerrainInfo()` (forest ×0.8, river ×0.5, road ×1.1) and is named in the
tooltip. Night (hour <6 or ≥20) is ×0.85. If your pack exceeds its carry limit,
`Game.cargoMult()` kicks in (see "Carry capacity").

Every day:
- Troop wages (lvl 10–19: 2, lvl 20+: `level/2`, lvl 51: free)
- Food consumption — low quality (grain/bread) and high quality (meat/cheese). Lvl 30+ troops
  get a `debuff` if they can't get high quality (×0.7 in battle).
  Status is read from a single place: `Game.foodStock()` → `{low, high, total, need, needHigh, days, kinds}`.
  The 🍞 badge in the top bar shows how many days it'll last (turns red under 3 days), its
  tooltip has a line-by-line breakdown.
  A warning fires **once per transition** when hunger starts/ends and when an elite troop
  can't find meat (`state.player.wasHungry` / `wasLowQuality`) — separate text so a quality
  shortage isn't confused with starvation.
  Every foodstuff has its own shelf life (`ITEMS[].spoil` = days): grain 60, cheese 40, meat 30,
  bread 20. `Game.spoilFood()` subtracts `qty/spoil` every day (the fractional loss
  accumulates in `it.decay`), `foodStock().days` counts this in.
  **The player eats too (#75)**: `upkeep()` starts with `foodLow = 1` — it used to count only
  the party, so a solo party consumed no food at all and the badge showed `—`. Hunger's
  consequence used to be morale alone; since morale only affects troops (`moraleMult`), a
  player traveling alone was never touched by starving at all. Now every day spent hungry
  costs **−`Game.HUNGER_HP` = 3 health** and `regenTick` doesn't heal that day (floor 1 health
  — starvation doesn't kill, it lays you low). Starting inventory is now **3 grain → 1 bread**:
  the food problem should start on day one.
  Measured (seed 1, 20 days): a solo party now eats **0 → 1** unit a day, the "how many days
  left" badge shows a real number instead of `—` (a fresh character: **0 days**, red); a player
  traveling without buying food starves on **day 3**, health goes 50 → 41 by day 5 → 26 by day
  10 → 1 by day 20. The same player leaving with 30 bread lasts 12 days (1 consumption + 1.5
  spoilage), first hunger on **day 17**. 10 troops + player = **6** units a day (see `FOOD_MAN`
  below).
#### A troop eats half a unit a day (`FOOD_MAN`)
1 unit per head was too much: a 20-strong army ate 21 units a day (~84 denars), so the
**food bill ran double the wage bill** (the same army's wages were 40₺). One knob,
`Game.FOOD_MAN` = **0.5**, sits right above `upkeep()`; consumption, the "how many days left"
badge, the hunger penalty, and the tooltip breakdown all read from `upkeep()` already, so
nothing else needed touching. The player's own belly stays at **1 unit** (`foodLow = 1`, #75)
— the knob is only the troops' share. Elite tiers keep their ratio: lvl 20+ **×1.5** (0.75
units), lvl 30+ additionally wants meat/cheese equal to `FOOD_MAN`, lvl 51 free.

Measured (`upkeep()` directly):

| Party | Daily units | Meat/cheese | Wages | Grain cost |
|---|---|---|---|---|
| solo | 1 | 0 | 0 | 4₺ |
| 10 × lvl10 | **6** *(was 11)* | 0 | 20₺ | 24₺ |
| 20 × lvl10 | **11** *(was 21)* | 0 | 40₺ | 44₺ |
| 20 × lvl20 | 16 | 0 | 200₺ | 64₺ |
| 10 × lvl30 | 9 | 5 | 150₺ | 36₺ |

60 grain lasts a 10-person party **8 days, not 5**. Two `foodStock` assertions in
`tools/test.js` encode these numbers (need 11→6, days 5→8, need 4→3, needHigh 2→1) — they went
red when the balance changed and were updated by hand, so the regression gate is doing its
job.

- Morale is recalculated (`Game.updateMorale`)
- Player +5 HP
- Village recruits refill (village cap 5; towns 4–8 every 2 days)
- Kings/viziers strengthen over time (king reaches lvl 20 / 110 troops in 90 days, vizier lvl
  10 / 50 troops)
- 25% chance a random town opens a tournament, an open tournament has a 30% chance to close
- Band population fills toward its target (at most `BAND_REFILL`=3 a day — see below)
- `Nobles.dailyTick()` — ages location markers, raises rival suitors' interest, marriage
  income, wedding-day check
- `Feast.dailyTick()` — closes a feast whose time is up, starts a scheduled/spontaneous feast
- `Quests.dailyTick()` — quests' `day()` hook and deadline check

### Morale
`state.player.morale` (0–100, starts at 60). Daily target `Game.moraleTarget()`:
`50 + (management−1)×3 + food variety×5 − hunger 30 − wage debt (10..40) − over-capacity×2`.
**Wage debt is time-based**: unpaid wages accumulate in `state.player.wageDebt` and
`Game.wageDebtTick()` costs 1 morale every hour (`wageLateHours` counts it). Once there's
enough money the debt pays itself off and the counter resets. Visible in the treasury and
morale tooltips. Morale drifts toward the target but **falls fast, recovers slow** (−10 / +4
per day); a victory is +5, a defeat −15.
- Morale < 25 → every day `1 + (25−morale)/8` troops **desert** (most recently joined first).
- In battle, every player troop's health and attack is multiplied by `Game.moraleMult()` =
  `0.8 + morale/250` (morale 0 → ×0.8, 50 → ×1.0, 100 → ×1.2). **Speed is not multiplied** — it
  used to be silently multiplied; since the enemy has no morale, that meant a penalty at low
  morale (failing to catch the enemy) that was never written down anywhere.
- The 🎺 badge in the top bar, a line-by-line breakdown on the party screen (`Game.moraleHtml`).

### UI
- **Campaign bar** (`#top-bar`): day + hour + time-of-day icon, denars, renown, then **bar-
  style** badges — health, party/capacity, **carry load**, morale, level/XP. The last badge is
  speed; hovering it shows `#ui-speed-breakdown`, a line-by-line breakdown (base / agility /
  party / mounted ratio / terrain / night / overload). The badge icon is 🐎 mounted, 🥾 on foot.
  A badge over its limit turns red — `.hud-chip.warn` is no longer specific to `#chip-food`,
  it's a shared rule.
- **Tooltip overflow** is solved from a single place, `Game.initTooltipClamp()`: the moment a
  tooltip appears it's measured and nudged back inside the screen (it used to be a hand-rolled
  CSS exception just for `#chip-speed`/`#chip-time`, and a new badge got clipped again).
  `.tooltip-content`'s **transform is never animated** (`transition: opacity/visibility`) —
  otherwise the measurement reads the animation's mid-transition value and corrects wrong.
- **Every badge has a tooltip** (`Game.updateTips`, `.tooltip-container`): hovering a badge
  spells out what the value is, where it comes from, and what it affects — calendar (flow
  speed), treasury (daily wage/food expense, `Game.upkeep()`), renown (which gate opens at
  what renown), health (level + armor share), party (capacity breakdown + troop composition),
  morale (`Game.moraleTip`), level (XP, pending points). The calendar badge is also clickable
  (time flow).
- Every skill line on the character screen states **its current effect as a number** (e.g.
  "Sight 615 units", "Prisoner capacity 8", "Battle loot +12%").
- **Side menu**: icon + name + shortcut badge. Shortcuts `M/C/P/I/Q`, **K** opens the diplomacy
  screen (`Game.showDiplomacy`), **Esc** returns to the map from any screen, **WASD/arrows**
  freely pan the map camera, **Space** brings the camera back to the player
  (`Game.centerOnPlayer()`) — all inside `Input.init`, none of them work while a modal or
  battle is open. In the save section: **💾 Saves** (`Save.open()`), 🔊 sound, and
  **⚙️ Settings** sit. `showScreen()` activates the clicked button via `data-view`.
- **Map HUD** (`#map-hud`): the terrain you're on + its speed effect, below it troop
  composition (🪖 infantry / 🏹 archers / 🐎 cavalry), **🎯 Find Me** and **🌍 Diplomacy**
  buttons. `Game.updateMapHud()` fills it in.
  **Unspent-points badge** (#35): if you have an attribute/focus point, the same row shows a
  `✨ 2 attribute · 3 focus` button; clicking it opens the character screen. It doesn't jump
  around, it just breathes its glow (`#btn-points`, `@keyframes pointsGlow` 2.2s) — the badge
  disappears on its own once the points are spent.
  Since the HUD is `pointer-events:none`, the button is given `pointer-events:auto` in CSS.
- `Game.setHtml(id, html)` only writes innerHTML if the text actually changed —
  `updateTopBar` is called every frame, so this avoids needless DOM writes.

#### Transaction feedback — flash, floating text, sound (#45)
Buy/sell/recruit actions used to only write a line to the `#market-msg` strip; whether the
click landed wasn't clear. Now every transaction goes through one gate:
`Game.feedback(kind, el, moneyDelta)` → `sfx(kind)` + `flash(el, ok)` + `floatText(...)`.
`kind` = `buy | sell | error | recruit | upgrade`.

- **Sound** (`Game.SFX` + `Game.sfx`): no files, a WebAudio oscillator. Each kind is a short
  arpeggio — buy `523→784 Hz` triangle, sell `659→988`, error `196→131 Hz` square wave, recruit
  `392→523→659`, promotion `523→659→880`. `AudioContext` is lazily built as a single instance,
  all of it wrapped in `try/catch` (a muted/permissionless browser doesn't break the game), and
  it never plays at all if `state.muted`.
- **Mute**: the 🔊/🔇 button in the side menu (`Game.toggleMute`), state lives in
  `state.muted`, `updateTopBar` writes `mute-ico`/`mute-lbl`. Saved alongside `state`.
- **Flash** (`Game.flash`): adds `.fx-flash` (green) or `.fx-flash-bad` (red) to the row. Both
  are removed before adding the class and a reflow is forced with `void el.offsetWidth` —
  otherwise the animation wouldn't restart on back-to-back identical transactions.
- **Floating text** (`Game.floatText`): `−65₺` / `+140₺` rises and fades above the treasury
  badge (`.fx-float`, removed from the DOM 950 ms later). `position:fixed`, `z-index:200`.
- Market rows got `mrow-buy-<id>` / `mrow-sell-<id>` ids (`refreshMarket`) — the only way to
  find the element to flash. On a buy, the buy row flashes green, and the matching sell row
  flashes too, quietly (stock changed).
- Animations live at the end of `style.css`: `@keyframes fxFlash` / `fxFlashBad` / `fxFloat`.

Wired up at: `buyItem` / `sellItem` (`error` if not enough money), `doRecruit` (three failure
branches play `sfx('error')`, success plays `recruit`), `promoteTroop` (`upgrade`).

### Character
- Attributes work as **target/effective** (`Game.ATTRS`). Spending a point raises `stats.<k>`'s
  **target**; the value that actually applies is `stats.eff.<k>`, which approaches the target
  the more you play in a way that suits that attribute. Reads always go through `Game.attr(k)`
  — `stats.str` is never read directly. `Game.trainAttr(k, w)`: gain is
  `w × ATTR_RATE × (0.25 + gap)` — fast while the gap is large, slow as it nears the target;
  without the 0.25 floor the target would never be reached. **1** point per level.

| Attribute | Effect | Trained by (`w`) |
|---|---|---|
| 💪 Strength | melee attack, tournament target duration | landing a hit (0.15) |
| 🏃 Agility | map speed +1.5, battle speed +0.5, tournament target size | covering distance (distance/1500) |
| 🧠 Intelligence | sight +30 | taking a quest (1) / finishing one (2) |
| 👑 Leadership *(was Charisma)* | party capacity +3 | commanding a crowd (daily party/20) |
| 🫀 Vitality | max health +5, health regen rate | taking damage in battle (damage/60) + daily 0.1 |

  Measured (`ATTR_RATE = 0.08`): closing a 5-point gap takes ~37 actions — ~11 map crossings
  for agility, ~8 battles for strength, ~37 days for leadership, ~12 quests for intelligence.
- **Health regen** isn't a +5 jump per day, it's **1 health per hour** via `Game.regenTick()`;
  the interval depends on Vitality (`hpRegenHours()` = `max(1, 8 − (vit−10)/2)`; vit 10 → 8
  hours, vit 20 → 3 hours). Capped at maxHp. Works during captivity too.
- To avoid a skill-name collision, the **skill** `leadership` is now "Management", the
  attribute is "Leadership".
- Skills (Bannerlord-style focus system). 3 focus points per level; focus multiplies XP gain
  by `0.5 + focus` (max focus 5).

| Skill | Effect |
|---|---|
| `oneHanded`/`twoHanded`/`polearm` | battle damage multiplier `0.35 + min(0.4, lvl×0.004)` |
| `bow` | arrow damage `0.5 + min(0.5, lvl×0.005)`, arrow count `24 + lvl×2`, shot time `max(0.5, 1.15 − lvl×0.006)` s, reduces spread |
| `riding` | mounted battle speed `95 + agility×0.5 + (lvl−1)×3` |
| `athletics` | foot battle speed `min(85, 56 + agility×0.5 + (lvl−1)×2)` — capped at `Battle.FOOT_MAX` |
| `leadership` | party capacity +3/level, morale +3/level |
| `persuasion` | dowry negotiation |
| `surgery` | chance a dying troop survives wounded instead |
| `prisonerMgmt` | prisoner capacity, reduces prisoner escapes |
| `pathfinding` | map speed ×(1 + (lvl−1)×0.02) |
| `spotting` | sight +25/level (`Game.getVisibility`) |
| `trade` | discount buying / premium selling, capped at 25% |
| `looting` | battle loot +4%/level |
| `trainer` | every day, +1 XP to the `lvl−1` least experienced troops |
- Leveling up: `xpNext *= 1.5`, +10 max HP, full heal.
- Party capacity: `12 + floor((cha−10)×3) + (Management−1)×4 + floor(renown/40)` — a new
character starts with **12 people**; the army grows with attributes, skills, and renown (base
50 → 24 → 12). Since attributes are effective (i.e. fractional), capacity is floored **at the
source** (#43) — so the badge, the tooltip breakdown, and every comparison all see the same
integer (it used to display `15/15.785700000000002`). The Management line in the tooltip reads
the player's **own** level, not `profLvl` (the highest in the party) — otherwise the total in
the breakdown didn't match when a companion was along.

### Starting balance
Start: **250 denars** (background choices shift it ±300), party capacity 12, a 1-person party.
Every denar is a decision in the early game; the army grows with leadership/charisma. Loot
taken from a low-level enemy is scaled down by `Battle.rewardScale`.

### Mercenaries
2 slots per town at the inn, a pool that refreshes every 3 days (`state.mercPools`): troops
ready at level 10–15 (from that town's own faction's tree), `60 + level×12` denars each. An
alternative to the volunteer grind — the only way to turn money directly into an army.

### Party & troops
- **Faction troop trees** (`TROOP_TREES`): every kingdom has its own villager → branch →
  elite chain. This table is the single source; `TROOP_UPGRADES` and `TROOP_TYPES` are
  generated from it at load time (row format
  `[name, class, hp, speed, attack, defense, icon, damage type, promotion cost]`; a villager
  row has no promotion cost).

| Faction | Villager | Branches (mid → elite) | Character |
|---|---|---|---|
| Svadya | Svadya Köylüsü | Milis→Çavuş, Avcı→Keskin Nişancı, Süvari→Şövalye | balanced, the strongest heavy cavalry |
| Rodok | Rodok Köylüsü | Mızraklı→Kalkanlı, Nişancı→Tatar Yaylısı | **no cavalry**, highest defense and archer damage |
| Veagir | Veagir Köylüsü | Piyade→Baltacı, Okçu→Nişancı, Atlı→Süvari | axe infantry, deadly archers, mediocre cavalry |
| Nord | Nord Serfi | Savaşçı→Baltacı, Avcı→Nişancı | **no horses**, the strongest infantry (Baltacı 80 hp / 24 atk) |
| Kergit | Kergit Çobanı | Atlı→Süvari, Atlı Okçu→Han Muhafızı | **all mounted**, the fastest (105–118), light armor |

- **Foot speeds stay under `Battle.FOOT_MAX` (85)**; elite infantry were nudged closer to the
  ceiling so that even if they can't outrun cavalry, they can still chase down archers: Svadya
  Çavuşu 65→70, Nord Baltacısı 66→74, Kergit Çobanı 55→70 (the villager couldn't flee, 55 was
  everyone's easy prey).
- **Troops have a damage type too (#37)**: the tree's damage-type column passes through
  `TROOP_TYPES` into the unit `Battle` spawns (`u.dmgType`), which then enters the
  `Battle.afterArmor` math that already existed. The rule is simple: **axe/sword is cutting,
  spear and bow are piercing, a villager's club is blunt**; cavalry counts as cutting since
  `chargeMult` already represents their lance. Bands are set with a single field
  (`BAND_KINDS[].dmg`) — marauders and mountain bandits use clubs (`blunt`), village militia
  and caravan guards use pitchforks/spears (`pierce`), everyone else is cutting.
  - A mid-tier spear troop is now genuinely useful against armored elites. Measured
    (`Battle.dealMelee`, 200 repeats, the target doesn't fight back): Rodok Mızraklısı takes
    down a Nord Baltacısı (defense 13) in **84.9s → 24.8s**, Svadya Milisi takes down a Rodok
    Kalkanlısı (defense 18) in **74.1s → 39.8s**. No difference against an unarmored target.
  - Elite balance wasn't disturbed: Nord Baltacısı vs Rodok Kalkanlısı is still 100% (11.9s),
    Nord Baltacısı vs Svadya Şövalyesi 69%. *An earlier attempt gave Rodok Kalkanlısı
    `pierce`; combined with defense 18, that dropped its win rate against the axeman from
    100% to 1% — a heavily-shielded infantry unit fights with a short sword (cutting) for a
    reason.*
  - A villager's club (`blunt`) is both slightly better against armor (Svadya Köylüsü →
    Svadya Milisi 38.7s → 30.5s) and stuns the enemy it downs: fighting a green army raises
    the capture rate from 45% to 90% (`stunned`, see "Taking prisoners").
  - The party screen's troop row now names the class next to the damage type ("Infantry ·
    piercing").

- Sources are faction-bound: a village/town recruit comes from `Game.recruitName(loc)`, which
  gives that settlement's villager; the mercenary pool at the inn and the enemy faction army
  in battle come from `Game.factionTroopPool(faction)` (2 shares mid-tier per branch, 1 share
  elite). An unknown/empty faction falls back to the Svadya tree; an old save's
  `Acemi Asker` is an alias for the Svadya villager.
- **Party screen** (#51): every row names the class (`Game.troopClassName`) + damage type,
  with **▲ / ▼** on the right (troops with the same name move as a block, `moveTroopGroup`;
  the order is `state.player.party`'s own array order) and **➖** (`dismissTroops` → "One /
  All" confirmation). Promotion buttons are no longer a blind choice either: every option
  names icon + class + damage type ("🐴 Svadya Süvarisi · Cavalry · cutting"). Class is read
  from **speed** — Kergit Atlı Okçusu is `archer` in the tree but travels at speed 108; any
  speed above `Battle.FOOT_MAX` (85) counts as "mounted" and displays "Mounted Archer". The
  threshold is the **same constant** as battle's forest rule. The prisoner section shows
  capacity, the daily escape chance (`max(1, 6 − Prisoner Management×0.5)`), and the total
  value of prisoners on hand.
- XP is +1 per kill in battle. Once XP fills, a troop either auto-levels or, if
  `TROOP_UPGRADES` has an entry, becomes **ready to promote** — pick a class from the party
  screen by paying denars. Promotion tier looks at the tree, not the name: a troop with no
  further branch counts as elite (lvl 20).
- Level cap 50. The **War God's Medal**, dropped by the boss, promotes a troop to lvl 51
  "Legendary": no wages or food needed, +100 HP / +15 attack.

### Companions (`COMPANIONS`)
7 named heroes, each waiting at one town's inn (`c.city`), joining for 600–900 denars.
- They **don't die** in battle, only get wounded; they level up like a regular troop
  (`Game.giveTroopXp`).
- They lend their expertise skills to the party: `Game.profLvl(id)` applies the "highest in
  the party" rule (a wounded companion contributes nothing).
- **Feuds**: a companion on someone's `dislikes` list won't join while that person is in the
  party (Gaddar Kudret ↔ Cerrah Ferhat / Tüccar Mervan).
- They want a 20-denar daily wage + 1 food.
- Party members' battle/screen stats come from `Game.troopStats(t)` — since companions and a
  spouse aren't in `TROOP_TYPES`, every caller used to invent its own defaults.

### Inventory & equipment
Weapon / armor / horse slots. Armor affects max HP, weapon affects attack, horse affects map
speed (66 → 105). Trade goods are bought and sold at the market (sell price ×0.7).

**Food isn't a trade good (#47)**: grain 4, bread 6, cheese 16, meat 20 base price — a
**fifth** of the old price. An army's daily feed alone was draining all the cash flow;
measured, a 20-person army eats 20 grain a day: it used to cost ~270₺, now **40₺** (the same
army's wages are 40₺). Trade goods (iron, velvet, ale, salt) weren't discounted — those are
carried for profit. Caravans carry cartloads of food for this reason (see "Trade parties").
There's an **x5** next to the Buy/Sell buttons; every transaction writes the item + quantity +
amount paid/received + remaining denars to the `#market-msg` strip (`Game.marketMsg`). If
there's not enough money it buys as much as it can and says so — `alert()` is never used, it
would close the market.

#### Carry capacity — the pack has a bottom (#78)
Inventory used to be unlimited: a solo character could carry 500 units of wheat. The limit is
**per head** (`Game.cargoCap()`), load is the sum of every good's quantity (`cargoLoad()`),
both are derived — no new field went into the save.

| Item | Value |
|---|---|
| Base (`CARGO_BASE`) | 20 |
| Per head (`CARGO_PER_MAN`, player included) | +5 |
| Mounted share (`CARGO_PER_MOUNT`, cavalry + your own horse) | +4 |

Measured: solo **25**, with 10 foot **75**, plus 10 cavalry **165**, with your own horse
**169**. The second gate is speed: `cargoMult()` = `max(0.5, 1 − overload/capacity × 0.5)`.
Measured (a party with capacity 169, flat ground): under capacity 140.8 speed (×1), at ×1.25
load **123.3** (×0.876), at ×1.5 **105.4** (×0.749), at ×2 and beyond **70.4** (×0.5 floor) —
it doesn't lock you out of walking, it slows you down.

**The market doesn't silently ignore the limit.** `buyItem` counts remaining room inside its
loop: it buys as much as fits and says "*(your pack is full)*", and if there's no room at all
it buys nothing and says why. Measured (capacity 50, load 48): an `x5` purchase gives
*"🌾 Grain x2 bought · -4₺ · … (your pack is full)"*, the second purchase says
*"No room in your pack — your carry limit is 50 units, you're holding 50. Sell, put it in
storage, or grow your party."* — in all of tr/en/id, `I18N.missing` is empty.

Loot, quest rewards, and points of interest **can exceed the limit**; the cost is the speed
penalty. A fief's storage (`loc.storage`) doesn't take up room — storage is thus both a
safety net and a warehouse.

Measured (the issue's own scenario): with 100,000 denars, a solo character calling
`buyItem('wheat', 500)` gets **25 units**, even though the town's warehouse still has 387
grain — the limit is the pack, not the shelf. The same call with a 10-person party gets **75
units**. So trade scales with the **party**, not the purse (#46's supply curve already
constrained the purse). The economy tool showed a small difference
(`--days 60 --troops 10`: trade route −14.4 → **−15.1**₺/day) because that script was already
bounded by the supply curve; capacity's real effect is on **food/grain stockpiling**.

#### Per-good supply/demand pricing (#24)
Price is no longer a **single die roll** applied on entering a town (it used to hit all goods
with the same 0.8–1.2 multiplier, so no trade route could ever be built). Every settlement has
its own multiplier per good:

- `Game.basePriceMult(loc, id)` = **production region** (`Game.GOOD_ORIGIN`: Svadya grain
  0.70, Rodok ale 0.65 / iron 0.80, Veagir meat 0.70, Nord salt 0.70, Kergit cheese 0.70; a
  distant kingdom 1.20–1.35) × **location-based** ±6% deviation (`Game.priceNoise`, below) ×
  village adjustment (food ×0.8, trade good ×1.15) × prosperity (`1.15 − prosperity/400`).
- `Game.priceMult(loc, id)` = base × **supply curve** (`supplyMul`). Price has no state of its
  own; the only thing that moves is **stock** (below). Entering the market a second time on
  the same day doesn't change the price — measured: ale in Praven is 44₺ on both entries.
- The price badge on the market list and the guild ledger (`Game.priceTag()`) is now
  **just a colored percentage** (#76): ≤ −12% green, ≥ +12% red, in between faint. It used to
  have a word in front too (`cheap −22%`); the sign, color, and number were already saying the
  same thing. Measured (3 seeds, 19 settlements × 8 goods = 456 badges): the badge's visible
  text went from a **median of 10 → 4 characters**, total **4557 → 1593** (longest 11 → 4);
  **228 of them (50%)** already just said "normal", meaning half the line carried no
  information at all. In English, total went 4671 → 1593.
- **Guild price ledger** (inn → ⚖️ Guildmaster → 📈 View Price Ledger,
  `Game.guildPrices`): every food/trade-good price across the nearest 5 towns in one table.
  This is the information source for building a route — Warband's "commodity prices" screen.

#### Deviation is geography, not a hash (#77)
Per-settlement deviation used to come from a `loc.id + id` hash: **±12%**, with no connection
to geography whatsoever. Of two neighboring towns, one could draw 0.88 and the other 1.12 —
price couldn't be read off the map, only memorized by visiting every town one by one.

`Game.priceNoise(x, y, id)` generates the deviation **from position**: the sum of two
low-frequency sines (`PRICE_WAVE = [1800, 1100]` unit scale, weight 0.6 / 0.4), with wave
direction and phase coming from **a hash of the good's identity**. So the region where grain
is cheap isn't the region where iron is cheap, but every good has its own region and that
region is continuous. Amplitude is `PRICE_NOISE` = **0.06** (±6%). Nothing new goes into the
save — `loc.x`/`loc.y` are already saved.

Measured (5 seeds, 25 settlements × 8 goods, deviation isolated by dividing out
`GOOD_ORIGIN`/village/prosperity):

| | hash (old) | position (new) |
|---|---|---|
| Deviation range | −12% .. +12% | **−5.9% .. +5.9%** |
| **Gap to nearest neighboring town** (median / p90 / worst) | 6.0% / 15.0% / **23.0%** | **1.1% / 2.4% / 5.8%** |
| Gap to a distant pair (>3500 units, median / worst) | 7.0% / 24.0% | **3.0% / 11.4%** |

The result worth reading is the **ratio** of the last two rows: it used to be that the
neighbor gap (6.0%) and the distant-pair gap (7.0%) were nearly the same — distance said
nothing. Now neighbor is 1.1%, distant is 3.0%: region is real information. Measured (seed 3,
iron, west to east): Veluca −7% / Jelkala +8% (a 15% gap 150 units apart) becomes
**−2.6% / −1.6%**; the deviation from Praven toward Suno decreases **smoothly**,
−5.7% → −1.7%.

Real price differences thus fall back to their actual sources: **production region**
(`GOOD_ORIGIN`, ±35%) and **stock** (`supplyMul`, ×0.55–2.0). Both are learnable, both change
with the player's own behavior.

#### Limited stock and the supply curve (#46)
A market's stock isn't infinite: `loc.stock[id]` (saved, inside `Save`'s `locations` array).

- `Game.stockBase(loc, id)` = `STOCK_SCALE` (town 500 / village 190 / keep 150) ×
  `(0.55 + prosperity/110)` ÷ (production-region multiplier × **√price**). Measured
  (prosperity 86 Praven): grain 474, bread 361, meat 148, ale 80, velvet 22; a village with
  prosperity 56 has grain 144, meat 45. Cheap staple food is plentiful, expensive trade goods
  are scarce — a town's grain store can't be emptied out, a velvet stall can be. *(Dividing by
  raw price was tried: a town was left with 6 bolts of velvet, one wagonload emptied the
  market and turned trade into a loss.)*
- `Game.supplyMul` = `(stock/base)^−0.5`, clamped to **0.55–2.0**. Stock halving raises price
  ×1.41, doubling drops it to ×0.71.
- **Price is computed unit by unit** (the `buyItem`/`sellItem` loop): every unit bought lowers
  stock, and lowered stock makes the next one pricier. So buying one at a time costs the same
  total as buying in bulk.
- **You can't buy more than the stock**: an exhausted good shows "sold out" instead of a
  button, the row carries a red "stock 0" badge. What you sell enters the market's stock and
  lowers its price.
- `Game.stockTick()` nudges stock toward its base every day at a rate of
  `0.08 + prosperity/700` (prosperity 50 → 15%/day). Measured: an ale stock of 80, once
  emptied, returns to 63 in 12 days, price falls from 87₺ to 45₺.

Measured (fresh world, trade skill 1) — **a single load's profit share shrinks as the load
grows**:

| Good / route | 10 units | 20 units | 30 units |
|---|---|---|---|
| Ale, Jelkala→Reyvadin | +116 (35%) | +182 (26%) | +253 (24%) |
| Salt, Sargoth→Uxkhal | +287 (49%) | +462 (38%) | +575 (31%) |
| Iron, Veluca→Tihr | +383 (37%) | +618 (29%) | +553 (16%) |
| Velvet, Veluca→Narra | +404 (11%) | **−741 (−9%)** | **−3847 (−27%)** |

So a cheap good (ale/salt) turns a profit the bigger the load gets, while an expensive good
(velvet, 22 bolts in the town) saturates a single market: dumping 20 bolts on one town is a
loss, the load has to be split across towns. Since a bandit fight costs ~80 denars, trade is
still a real profession.

### Settlements
- **Town**: market, slave trader, inn (rest + learn poems from the bard + **mercenaries** +
  **guildmaster** + hiring **companions**), **arena** (always open), tournament (if any),
  lords' hall, feast (join one if there is one; if it's your own kingdom, host one), recruiting
- **Keep**: lords' hall, feast (if any)
- Buttons tied to an active quest also appear here (e.g. chicken chase).
- **On your own fief** (`loc.owner === 'player'`, except villages): **🛡️ Garrison** and
  **📦 Storage** buttons appear at the top (see "Fief management").
- **Village**: village elder (context-dependent dialogue), recruiting, food market,
  **raiding the village**. A village belonging to a kingdom you're at war with shows only the
  raid option — an enemy village gives you neither troops nor food. **The village elder always
  talks** (#50): what they say depends on context — open hostility and a shoulder of stone
  within the 30-day raid window (`Game.raidedRecently`), a scared/cold refusal in an enemy
  kingdom's village, and even a friendly village gives "leave, quickly" if your dishonor tier
  is 2 ("💀 Village Burner"). A village you raided **also withholds recruits and food** during
  that window — it won't sell cheese to the man who just cursed it.
- If it's a town/keep of a faction you're at war with, only the **siege** option appears — the
  market, inn, hall, recruiting, even quest buttons are all closed (#48). If you're
  independent, the same button becomes "Besiege! (Found Your Own Kingdom)" — no two separate
  siege buttons appear.
- **Prosperity** (`loc.prosperity`, 35–90; assigned in `init()`, saved) is a single number that
  feeds three things: garrison (`Game.garrisonOf` = base × (0.6 + prosperity/125)), recruit
  refill (+prosperity/40), and the market multiplier (× (1.15 − prosperity/400) — abundance
  lowers price). It recovers on its own every day: +0.4 below 50, +0.15 above (cap 90).

#### Settlement scene — buttons as buildings (#60)
The settlement screen used to be a flat list of buttons. Now `#scene-canvas` (900×280) sits
above the list, and **the scene is generated from the buttons**: `Game.renderScene(loc)` reads
`#settlement-actions`'s children, maps each button's **icon** to a building type
(`SCENE_KIND`: 👑🛡️🏆 → tower, 🍺🧓⛓️ → house, 🏭 → workshop, 🛒🍷 → stall, 🪖⚔️ → tent,
🤺 → arena ring, 🔥 → fire, 🐔 → coop, 🚪 → gate; an unrecognized icon falls back to a house)
and draws that building.

**Since `addBtn` is the single gate, a new settlement button becomes a building on its own** —
no separate "hotspot table" is kept. Clicking works the same way: `cv.onclick` calls the
`btn.onclick()` of whichever box it finds, so the scene is the button's twin, not a copy.

| Piece | Rule |
|---|---|
| Layout | Even-indexed buttons in the front row (122×88, floor `H−16`), odd-indexed in the back row (96×66, ×0.82 darkened) |
| Sky | `state.time.hour`: night <6/≥20, dawn 6–8, sunset 18–20; night has stars + a moon disc, day has a sun |
| Backdrop | Village: field strips + fence · Keep: crenellated inner keep + banner · Town: a 7–12 house silhouette; all three have a 92-unit wall, battlements, gate arch, and faction banner in front |
| Randomness | `Game.sceneRnd(loc, i)` = a hash of `loc.id + '|' + i` (×131) — **nothing is written to the save**, the same town gives the same silhouette on every open |
| Mouse | `cv.onmousemove` does a box test; it only redraws **when the hovered building changes**, the cursor becomes `pointer`, the building glows gold via `shadowBlur`, a plaque with its name appears above it |

**Interior** (`Game.sceneBg(kind)`): the inn and lords' hall modal get that location's image
behind them — using `showModal`'s already-existing third argument (`bgImage`). Drawn once and
cached via `toDataURL` (`_sceneBg`). Inn: wooden wall + beams, hearth light, barrels, a long
table, hanging lamps. Hall: stone benches, columns, two banners, a throne, a red carpet,
torches. *The modal's black curtain went from 0.80/0.90 down to **0.62/0.82** — at the old
value the drawing was completely swallowed; text is still readable.*

**Every drawing is code** — not a single external image file, so no license/attribution
concern.

Measured: all **25 of 25** settlements have a different backdrop fingerprint; button layout
falls into 3 patterns by type (town 9 buttons, village 5, keep 3 — plus status buttons, e.g. a
tournament or your own fief, add to the count). A full scene draw is **1.62 ms** (once on
entering a settlement and once when the mouse changes building), the mouse hovering the same
building costs **0.007 ms** (early exit, no redraw). The sky genuinely changes: the same
town's top-left pixel is `120,172,222` at noon, `82,73,100` at sunset, `14,19,44` at night. The
interior JPEG is **19.8 KB**, first open **17.3 ms**, cached after that.

#### Themed backgrounds for menu screens (#61)
The inventory/character/party/quest screens were flat `.glass-panel`s. The same
`Game.sceneBg(kind)` machinery (see the scene section above) now draws a backdrop for these
screens too; the single gate is `showScreen` → `Game.applyViewBg(id)`, the backdrop is set
**once per screen**, everything after that is CSS.

| Screen | Drawing | What's in it |
|---|---|---|
| Character | `armory` | Stone wall, crossed sword, shield, two side banners, a helmet rack |
| Party | `camp` | Night sky + stars, a hill line, three tents, a campfire, a bundle of spears |
| Inventory | `storage` | A wooden warehouse, shelves, a chest + lock, sacks, a hanging lantern |
| Quests | `parchment` | Fiber texture, faded lines, a burnt edge, a wax seal |

Curtain darkness varies by screen (`VIEW_BG` = `[kind, topAlpha, bottomAlpha]`): 0.70–0.74 on
dark drawings, 0.60 on the light parchment. **No blur above the moving canvas** — these are
static `background-image`s, `backdrop-filter` was never added (see "Performance").

**Readability was measured** (WCAG contrast ratio between the backdrop color under the
curtain and the text color, top third of the screen):

| Screen | Backdrop | `--text-muted` | white | gold heading |
|---|---|---|---|---|
| Character | `19,20,21` | **7.19** | 18.44 | 8.77 |
| Party | `16,16,20` | **7.40** | 18.98 | 9.03 |
| Inventory | `25,20,15` | **7.13** | 18.29 | 8.70 |
| Quests | `88,77,57` | **6.07** | 8.28 | 3.94 |

The quest screen's `--text-muted` (#94a3b8) dropped to **3.23** over the brown paper (AA floor
is 4.5). The fix was one line of CSS: the variable was pulled to `#e6dcc2` inside
`#quests-view` → 6.07. The gold headings are large and bold, so they clear the AA-large (3:1)
floor at 3.94.

Cost: **8.2–11.9 ms** per screen on first open (draw + JPEG encode), data **27–37 KB**; a
second visit to the same screen's early-exit via `dataset.bg` costs **0.3 µs**. No backdrop was
added to the settlement screen — it already has `#scene-canvas`.

#### Raiding a village (#21)
`Game.raidVillage(loc)` confirmation modal → `startRaid` → `Battle.start('Köy Milisi', n, null, faction)`.
The militia count is `max(4, prosperity/5)` (~7–18) and is spawned from the
`BAND_KINDS.militia` mix (Köylü / Köy Avcısı / Köy Bekçisi + Köy Muhtarı after 6 people) — not
a faction army, villagers. On winning the battle, `Battle`'s victory branch calls
`Game.completeRaid(locId)`:

| Gain | Cost |
|---|---|
| `prosperity × 6 × 0.85–1.15` denars | Relation with the owning lord **−30**, that kingdom's other lords **−6** |
| Grain `4 + prosperity/12`, cheese `1 + prosperity/25` | Prosperity **−20** (floor 10), `loc.raidedDay` is marked |
| +60 XP to the looting skill | Village withholds recruits for **7 days**, renown **−6** (eating even the victory's +3) |

Burning down a village of a kingdom you're at peace with **is grounds for war** (`declareWar`).
On defeat/surrender, `state.player.currentRaid` gets cleared the same way as `currentSiege`.
Measured: a prosperity-44 village yields 408 denars + 9 grain + 4 cheese, its prosperity drops
to 24, the owner's relation goes 5 → −25, prosperity recovers to 54 over 40 days.

#### Raiding is an action, not a loot button (#49)
Beating the militia is the raid's **start**, not its end. `Game.completeRaid` no longer hands
out loot directly; it sets up `state.player.raid = { locId, t }`, pins the player over the
village, and sets `state.player.status = 'raiding'` — the same pattern as a siege camp: time
flows (in `update`'s `timeFlows` list), map clicks are ignored, and a `#raid-ui` panel sits in
the bottom right (time left, a progress bar, the nearest lord's distance).

| Constant | Value | What it does |
|---|---|---|
| `RAID_SECONDS` | 15s | time to empty the warehouse; on completion `finishRaid` → `grantRaidLoot` |
| `RAID_ALERT` | 1600 units | the lord who sees the smoke (`npc.raidResponder`) — covers ~1200–1600 units in 15s, so a bordering lord can make it |
| `RAID_COOLDOWN` | 30 days | the same village can't be raided again (`loc.raidedDay`) |

`Game.raidTick(dt)` steers marked lords toward the village every frame; if one gets within
**60 units** the raid is cancelled, relation drops **−15**, and `triggerEncounter(responder, 'raid')` opens a battle.
The `'raid'` mode skips `triggerEncounter`'s friendly-noble branch — otherwise the lord
catching you red-handed would stop to make small talk. 🚪 *Abandon Raid* lets you withdraw
without loot.

**The raider stigma** is no longer a separate number, it's **honor's negative side** (#53 item
1.5). `Game.infamy()` = `−honor` (only the negative side); `infamyTier()`/`infamyLabel()`/
`infamyPenalty()` still stand under the same names — every old call site (recruiting,
mercenaries, village elder, noble weighting) works unchanged in a single line. A raid is
**−12 honor**. The "Honor" section below covers the tiers and their measured effects.

Measured: an unhindered raid finishes in 15.1 hours, yielding 297 denars + 8 grain + 3 cheese;
a lord 900 units away (speed 70) arrives at second 12 and breaks up the raid, opening a
"🔥 Raid!" battle; a lord 2000 units away never gets marked, the raid completes.

### Nobles (`nobles.js`)
23 lords + 12 ladies. Every lord has their own party roaming the map (`npc.lordId`); the party
wanders around its own settlement, so it can be found in its hall. `Nobles.isAt()` checks
"are they home" with a 420-unit radius.

- **Portraits**: lords come from the `lord_portraits.jpg` sprite sheet, which has no ladies in
  it (#39). A lady's portrait is **drawn in code** via `Nobles.ladyPortrait(n, size)` — an
  inline SVG standing in for the initial-letter medallion. Since everything derives from a
  hash of `n.id`, the same lady gets the same face every time the game opens: dress/skin
  palette from faction (`Nobles.LADY_LOOK`), hair/eye/lip color and face width from the hash,
  accessory from **personality** (`ambitious` a crown, `pious` a veil, `romantic` flowers +
  braid, `wild` wind-blown strands). The accessory splits into `back`/`front` — a veil not
  drawn beneath the face was covering it. Since lord portraits are photos, the SVG's clean
  edges stuck out next to them: a light `feDisplacementMap` ripple + canvas grain +
  `sepia(0.35)` brings it closer to the same frame. `portraitCss` is still the single gate;
  suitor (`suitor_*`) identities keep using the lord's own portrait.
- **Relation** `state.relations[lordId]` (−100..100). `Nobles.relLabel()` labels them: Blood
  Feud / Enemy / Resentful / Indifferent / Content / Friend / Loyal Friend.
- **Personality** (`PERSONALITIES`): `martial`, `cunning`, `debauched`, `goodnatured`,
  `quarrelsome`. Greeting lines, which gift they like, which quest they give, and the dowry
  multiplier all depend on this.
- **Standing** (`Nobles.standing(id)`, −1..4): renown/130 + relation + the ratio of the army
  you bring to the gate against the lord's own, −1 for a quarrelsome personality. This decides
  the greeting pool (`Nobles.GREETS`) and how a conversation lands: standing ≤ −1 →
  **−1 relation and a brush-off**, 0 → relation unchanged, 1–2 → +1, 3–4 → +2. Shown as a
  label in the dialogue header (`standingLabel`).
- **Dialogue** (`Nobles.talk`): ask how they're doing (once a day, depends on standing), ask
  for a quest, ask someone's location, give a gift, recite a poem (if courting), talk about
  their daughter, insult them (−15 relation, +2 renown, +5 with rival kingdom's lords), swear
  fealty.
- **Gift**: an item matching their personality gives +6..+10, a mismatched one +1, a
  quarrelsome lord gets +3 for anything. Once a day.
- **"Where is …?"** (`Nobles.askWhere`): accuracy depends on relation. rel<0 → a lie (points
  800–1500 units away from the real location), 0–19 → direction only, 20–49 → a 600-unit
  uncertainty circle, 50+ → 200 units + 3 days of live tracking. Asking about someone from
  another kingdom drops a tier. Markers are drawn on the map as a dashed gold circle
  (`Nobles.drawMarkers`, called from inside `renderMap`), removed after 3 days.
- **Encounter**: bumping into a non-hostile noble's party doesn't start a battle, it opens
  dialogue (the `npc.lordId` branch inside `Game.triggerEncounter`).

### Lord personalities and line pool (#59)

Personality (`PERSONALITIES`) decides **what** a lord does (which gift they like, which quest
they give, the dowry multiplier). On top of that, every lord has a character trait that
decides **how they talk** (`Nobles.LORD_TRAITS`): 🦚 Vain, 🐁 Cowardly, 🗡️ Cruel, 🍺 Jovial,
💰 Greedy, ⚜️ Honorable, 🙇 Sycophantic.

The trait is **never written to the save**: `Nobles.traitOf(id)` derives it from a hash of the
lord's id (`h = h*131 + code`), so every open, and every old save, lands the same personality
on the same lord — no migration code, no new `state` field, no `Save` change. Measured (23
lords): with multiplier 131, the distribution is **2–4** per trait (all 7 traits show up); the
first attempt with 31 gave **1–6**.

**The pool** `Nobles.LORD_LINES` splits by kind: `greet` (greeting), `chat` (small talk),
`brush` (brush-off), `quest` (a quest offer's preamble), `retort` (reply to an insult),
`retinue` (a retinue exchange, a `[retinue's line, lord's reply]` pair).
Measured: **119 lines** (greet 42, chat 20, brush 10, quest 20, retort 7, retinue 20 pairs =
40 sentences) + the old `GREETS` tier pool's 18 lines, **137 selectable entries** total.

Selection passes through three filters (`Nobles.lineFor(kind, id, extra)`):

| Filter | Source |
|---|---|
| Character trait | `LORD_LINES[kind][traitOf(id)]` |
| Player standing | `band(standing(id))` → **0** dismissive / **1** normal / **2** wary–fawning. For `greet`, the trait pool is itself split three ways by band; the others add a `b0/b1/b2` pool |
| Context | the calling site adds `extra`, pulling a line from the live world (the faction's tax rate in small talk, a random lord's name) |

Since renown, relation, and the army you bring to the gate all feed `standing`, **the same
lord's tone changes as the player grows stronger**. Measured (a Jovial lord, relation 0):
renown 0 / party of 1 → *"And who are you? We give alms to beggars at the gate, not in the
hall."*; renown 600 / party of 80 → *"I saw your army outside my gate. I'll assume you come in
friendship... yes?"*

**Repeat filter** `Nobles.fresh(pool, kind)` — the same pattern as `Game.dailyEvent`'s "last N"
rule, with two differences: the counter is kept **per kind+band** (`state.recentLines`) and
lookback is **60% of the pool** in size. A fixed window of 12 was draining a small pool
completely dry and selection fell back to random. Measured (a 5-line pool, 300 draws): with
the filter, **0 back-to-back repeats**, **0** repeats in a 3-draw window; without it,
**66 (22%)** and **141 (47%)**.

**Retinue exchange**: `Nobles.retinueHtml(id)` cuts in **34%** of the time, not on every
dialogue; the speaker is a random pick from `RETAINERS` (Old Sergeant / Steward / Squire /
Advisor / Young Servant / Clerk) and sits as two lines under the lord's own line, along with
the lord's reply.

**The typewriter** `Game.typeIn(elId, text, then, cps)` / `Game.skipType()` — writes into
`textContent` character by character (no chance of a partial HTML tag). Only one text writes
at a time: a new call, the modal closing, or **any click** completes it and runs the `then`
hook (the retinue exchange becomes visible through this hook). Doesn't wait at all if
`Game.reduceMotion()` is on. Measured: 44 characters took **781 ms** (~56 chars/s), a click at
the 12th character completed the text, 48 characters were written in a **single frame** with
reduced motion.

Wired up at: `Nobles.talk` (greeting + retinue + a trait badge in the header), `Nobles.smallTalk`
(no longer `alert`, a portrait-bearing `Nobles.say` modal), `Nobles.insult` (the lord's reply),
`Quests.offerMenu` (the lord's preamble; the guildmaster has no character trait, so it never
appears for them).

### Courtship and marriage
- **For a female player, the targets aren't ladies but unmarried lords** (`SUITORS`): every
  non-king lord is wrapped "as a lady" under the identity `suitor_<lordId>` — their guardian is
  their own king, their personality derives from their own trait (`SUITOR_TRAIT`). This way the
  entire courtship machine (interest, compliments, poems, rival, dowry, engagement, wedding)
  runs through a single code path; `Nobles.courtables()` picks the list by gender,
  `Nobles.lady()` resolves either identity. The list is never generated for a male player
  (`SUITORS` stays empty). A female player has no separate guest section in the hall: courting
  runs from the **💘 Court them** button inside the lord's own dialogue (the 80-renown gate
  lives there), and the rival suitor is a lady — instead of her, her **guardian** steps up for
  the honor duel (`Nobles.duelTarget`).
- Entering a hall's lady section costs **80 renown**, entering a feast costs **150 renown**.
- **Interest** `state.affection[ladyId]` (0..100). Ways to raise it: small talk +3 (3-day
  cooldown), a compliment (+5 if it matches personality, −8 if it clashes, +1 neutral), a poem
  +12 (each poem works once per lady), dedicating a tournament win +18
  (`state.pendingDedication`), winning a duel +15.
- **Personalities** (`LADY_TRAITS`): `romantic`/`ambitious`/`pious`/`wild` — each likes one
  compliment topic and hates one. A hint is shown on screen.
- **Rival suitor**: assigned with 60% chance at game start (`state.rivals`), advances +1.5 a
  day. Whoever reaches 100 first gets engaged. Countermove: an honor duel (`Battle.startDuel`,
  1v1, no party enters the arena) or reputation smearing (30% chance to backfire).
- **Proposing** (`Nobles.askForHand`): requires interest ≥60, renown ≥120, relation with the
  guardian ≥25. Dowry: `8000 + keep/town×400 − 2200·log10(1+renown/60) − relation×25`, a rank
  multiplier (your own kingdom 0.6 / a vassal 0.8 / independent 1.0), and a personality
  multiplier (cunning 1.3 … goodnatured 0.8), floor 2500. Measured: renown 120/relation 25 →
  ~10500, renown 300/relation 80 → ~8000, renown 1000/relation 100 + your own kingdom → ~3700.
  Shown line by line. Options: pay / negotiate (depends on persuasion level, 20% discount,
  once a day) / "no money but I have my sword" (200 renown, taking a quest halves the dowry) /
  elope (−60 guardian, −20 kingdom, −30 renown).
- **Engagement → wedding**: `Feast.schedule()` sets up a feast 5–10 days out. You need to be
  there that day; letting two days pass disgraces you (−25 relation, −25 interest).
- **Marriage**: +15 to management, +20 with the spouse's kingdom's lords, +50 denars a day,
  the spouse joins the party.

### Feasts (`Feast`)
Held every 10–20 days in a random town, lasts 4 days. Every noble of that kingdom counts as
being there (`Nobles.isAt` accepts a feast too). "Walk the hall" gives +2 relation with
everyone, once each. You can host a feast in your own kingdom's town for 3000 denars +
30 meat/cheese (+5 relation, +15 renown).

### Quests (`quests.js`)
The quest engine is event-driven. `Quests.emit(ev, data)` calls: `entered_location`,
`bought_item`, `battle_won`, `escaped_captivity`, `tournament_end`, `chickens_caught`,
`talked_to`, `poem_recited_lord`, `raided`. `Quests.dailyTick()` also calls the `day(q)` hook
every day and checks for expired deadlines.

A quest definition has four hooks; three aren't mandatory:

| Hook | What it does |
|---|---|
| `setup(q, giver)` | Sets up `q.data`. Can **assume** the precondition — `can` already filtered |
| `can(giver)` | Does the world currently make this quest possible; if not, it isn't even offered (`dawn_raid` needs a war) |
| `desc(q)` | **What** to do + progress. Same text on the quest screen and the offer window |
| `where(q)` | **Where** — the id of the settlement to go to. Single source: both the 📍 line on the quest card and the 📜 stamp on the map (`Quests.targets()` → `renderMap`) read from this, so the two can never diverge. A deliberately hidden target (a chest's location in `fog_dot`) returns the center of the search ring instead |

`Quests.taskHtml(q)` merges these two into a single box and writes "~N days away right now"
via `daysTo(where)`; both the offer window and the quest list call it. Generating a quest
instance is `Quests.make(id, giverId)`'s job — the draw happens in `pick()`, the setup happens
there, and tests generate from there too.

Quests aren't a copy of Warband's quest list; they target **WebBand's own mechanics**:

| Quest | Which mechanic |
|---|---|
| Butter Blockade | Buying 15 cheese from the market in a specific town |
| Dot in the Fog | Hidden-point hunt with fog + a hot/cold hint (500/1200 units) |
| Sergeant's Trial | Promotion tree — reaching the lord's gate with 5 troops at level 20+ |
| Hungry Army | Daily food consumption — carrying 20 food while your own army eats into it |
| Brother in Chains | **Two solutions**: beat the band, or deliberately get captured and escape via the escape-plan mechanic (extra reward) |
| Thrown Fight | Getting eliminated from a tournament with a score of 5–8 (−15 renown, +2500 denars) |
| False Report | The "Where?" mechanic — lie to 2+ lords; they lie back to you for 5 days afterward |
| Mad Hüsnü's Chickens | The tournament minigame's 15-second / 8-target chicken variant |
| Harvest Watch | Wait near a village, repel 2 waves of marauders |
| Lost Letter | Pick up from a village, deliver to another lord |
| Bring a Poem | Learn a poem from the tavern bard, recite it to a lord |
| Clear the Caravan Road | *(guild)* Break up 2 bandit bands, then reach the target town |
| Guild Order | *(guild)* Deliver 10 units of a trade good to the guild's town |
| Arena Champion | The **win** side of a tournament — the mirror of Thrown Fight |
| Chain Market | Prisoner mechanic: deliver 4 captured troops to the lord's gate |
| Clear the Lair | *(guild)* Clear the bandit lair the guildmaster marked — this quest's value is **the location**: the lair isn't drawn until seen, the guildmaster stamps it `seen` (`can`: not offered if no lair is on the map) |
| Dawn Raid | Raid an enemy village (the `raided` event). `can`: not offered without an open front; reward +1800 denars but **−8 renown** |

The giver can be a lord, or the **guildmaster** (`giverId = 'guild_<locId>'`, `Quests.giver()`
resolves both). A guildmaster has no relation: the reward is only denars and renown, failure
carries no relation penalty. `Quests.back()` returns to dialogue for a lord, to the inn for the
guild.

Accepted quests live in `state.player.quests`; the **Quests** tab (`#quests-view`) lists them.
Every card carries a "what + where + how many days away" box, a quest with a target is stamped
📜 on the map (close up, it also shows the quest's name).
A lord who was refused won't offer a new quest for 7–15 days (`state.questCooldown`).
Failure is −10 relation. A given lord can have only one active quest at a time.

### Trade parties — caravans and convoys (#22)
The map isn't only bandits and lords anymore: **6 caravans + 8 villager convoys** roam the
roads (`Game.ensureTraders`, `spawnTrader`). Both are defined in `BAND_KINDS` like any band
(`trade: true`), so the map icon, the battle unit mix, and the leader logic all come from the
existing machinery for free.

| Party | Route | Guard | Cargo (measured) | Map icon |
|---|---|---|---|---|
| Caravan | town → another town at peace (`traderNext`) | 6–14: Kervan Muhafızı / Okçu / Atlı Muhafız + **Kervanbaşı** | 2 trade-good items + a 120–380 denar purse → sells for **790–1350 denars** | a cart (`cart`), golden yellow |
| Villager convoy | village ↔ nearest town (shuttle) | 3–7: Köylü / Köy Avcısı | 15–44 grain + 5–19 cheese + 20–70 denars → **100–270 denars** | a spearman on foot, light green |

- Cargo is balanced by value: `qty ≈ (3–7) × 100 / basePrice`, so velvet carries 1–2 units,
  ale carries 10–19.
- **They don't attack.** `isHostile` returns false; they only flee you if you're at war with
  their kingdom.
- Bumping into one opens a **choice**, not a battle (`Game.meetTrader`): 🗡️ Rob / 🚪 Let Pass
  (letting it pass sets `encounterCooldown = 6`, so passing right by it doesn't reopen the modal).
- **Robbing is banditry** (`Game.robTrader`): hitting a convoy of a kingdom at peace costs
  **−5 renown** and **−4 relation** with *every* lord of that kingdom (net −2 once the
  victory's +3 renown is counted). A convoy of a kingdom you're at war with is fair loot, no
  penalty.
- Victory loot: cargo goes straight to inventory, the purse straight to the treasury
  (`beaten.cargo` / `beaten.purse`, a "Cargo Loot" line in the victory modal). `rewardScale`
  only shrinks the denar reward, not the cargo.
- Feeds the prosperity of the settlement it reaches (caravan +0.5, convoy +0.15 per arrival).
- Since convoys live in `state.npcParties`, they're saved automatically; an old save is filled
  in by `Game.ensureTraders()` inside `Save.load`.
- **Its name isn't the settlement's name.** The map label used to be clipped to the name's
  first word (`renderMap`), so "Praven Villagers" showed on the map as just **Praven**,
  confused with the settlement itself. Trade parties are now drawn with their full name. A
  caravan's name also comes from the **people's** name, not the state's
  (`Game.factionPeople`, `FACTIONS[f].people`): "Kergit Khanate Caravan" didn't fit the row, now
  it's **Kergit Caravan** — the same wording as troop names ("Kergit Rider"). The people's name
  is raw data (`T(k.people)`), the static extractor can't see it, so its presence in the
  dictionary is gated by a separate assertion.

### Highway robbery — bandits hunt caravans
Convoys aren't only robbed by the player. `Game.banditTick()` runs every day (inside
`dailyUpdate`, after `warTick`) and matches bandit bands against trade parties: if paths cross
within **400 units**, a raid happens. A wolf pack doesn't loot (`BAND_KINDS[].beast` is
excluded).

- Strength roll is `size × 0.7–1.3`; a caravan guard resists at **×1.15**, a villager convoy at
  **×0.5** — so a caravan often fights it off, a convoy nearly always loses.
- **A repelled band** is cut in half (scattering if it drops under 4 people), the convoy loses
  a few people and moves on.
- **A raided convoy is removed from the map**; its cargo and purse *pass to the band*
  (`b.cargo` merges into the same slots, `b.purse` adds up). Since the victory branch already
  writes `beaten.cargo`/`beaten.purse` to inventory, **whoever catches that band gets the
  cargo too** — no extra code.
  The tooltip (`npcTipHtml`) now shows cargo for anyone carrying it, not just trade parties.
- Cargo that never arrives lowers the destination settlement's prosperity (caravan −1.5,
  convoy −0.5).
- News lands in `state.warLog` (no notification pops up, read it from the diplomacy screen).

**Bands now go hunting (#38)**: inside `updateNPCs`, a bandit party not busy with the player
(`!notices`) heads for the nearest trade party within **1200 units**. The chase condition is
the same as the raid's strength condition: `convoy strength × (caravan 1.15 / convoy 0.5) <
band × 1.2` — a weak band doesn't die chasing a strong caravan. A wolf pack never hunts
(`beast`). The target sits in `npc.hunting` and shows up in the map tooltip as
"🎯 Hunting: …"; the raid itself is still resolved by `banditTick` — hunting behavior only
**makes paths cross**.

Measured (200 days, playerless, 3 seeds — each round its own fresh page load):

| | without hunting | with hunting |
|---|---|---|
| Raids / day | 0.11 / 0.18 / 0.27 (avg **0.19**) | 0.43 / 0.70 / 0.92 (avg **0.68**) |
| Repelled (over 200 days) | 9–11 | 21–30 |
| Lifespan of a raided convoy | 13–21 days (avg 16) | 6–8 days (avg **7**) |
| Loaded bands at day 200 | 2–5, purse 49–229 denars | 0–1, purse **668–822** denars |

So hunting behavior raises raids to **3.5×** but doesn't fill the map with loaded bands: a
band hits more, gets repelled and scattered more, and the small number of bands still standing
are **much richer**. Convoy count stays fixed at 14 thanks to `ensureTraders`.

### Encounters & combat
- Hostility rules `isHostile()`: marauders always attack within 120 units, they flee if the
  player is 1.5× stronger; the first 14 days ramp up aggression gradually based on an id hash.
- **Flee range depends on the strength gap** (`updateNPCs`): a weak band notices you and flees
  from `360 + min(640, (our strength/their strength)×240)` units away. **A noble never flees**
  (#48): a lord's party chase threshold is `size × 1.5`, so it'll walk toward an army bigger
  than itself; only a clearly overwhelming one makes it retreat. Measured (a 100-person lord):
  it walks toward a 101- and a 122-person army (300 → 20 units), it flees a 151-person one
  (300 → 580 units). It used to be that `isHostile` returning false meant never fleeing at all,
  wandering until it walked right into you. Nobles (`npc.lordId`) only attack if you're a
  vassal of the enemy kingdom or relation ≤ −50; otherwise a collision opens **dialogue**.
- Encounter modal: fight / **send your troops** / **flee** / surrender (#30). You can't
  surrender to an animal pack.
- **The withdraw branch looks at the band's kind (#79)**: a bandit band in its first 14 days
  gives a 25% chance of a "walk away" option — it looks down on a rookie. **An animal pack
  doesn't talk**: wolves know neither renown nor words, only numbers; if your party is
  **1.5× the pack's size**, there's a 50% chance it bares its teeth and retreats, below that it
  always attacks (independent of the calendar — animals have no 14-day rule). The
  distinguishing field is `BAND_KINDS[npc.band].beast`; the text is no longer a fixed
  "Marauders" either, it's `Game.npcName(npc)`, so Forest Bandits get called by their own name.
  Measured (200 encounters each, against a 6-person band): wolves — 1 person 0%, 9 people 49%,
  13 people 53% (day 30: 56%, i.e. the calendar has no effect); marauders — day 5: 20–24%,
  **day 30: 0%**.
- **Pre-battle troop chatter** (#35, `Game.troopChatter`): under the enemy's line, one of your
  own men also gets a couple of words in ("How did I end up here, my mother's house was so
  warm..."). The pool is chosen by context — **fear** (enemy/your ratio ≥
  `1.3 + (Management−1)×0.08` or morale < 25), **hunger** (stock under daily need), **wage
  debt**, **courage** (morale ≥ 70 or ratio ≤ 0.6), the rest **grumbling**. The speaker is a
  random party member, named via `troopLabel`; nobody speaks if the party is empty. Measured
  (an 11-person party, 40 samples each): a 3-person enemy + morale 80 → always courage, a
  40-person enemy → always fear, an even enemy → grumbling, empty food stock → hunger, wage
  debt present → wage; against a 16-person enemy, **Management 1 fears while Management 8
  merely grumbles**.

#### Fleeing, auto-resolve, and waves (#30)
**Fleeing** (`Game.fleeChance` / `fleeEncounter`): available in every encounter except a raid
being caught red-handed. Chance depends on the **speed ratio**:
`clamp(0.1, 0.9, (your speed/their speed − 0.8) × 1.2)`.
**Fleeing isn't disabled during an ambush, it's expensive**: while `state.ambush` is open,
chance is multiplied by `AMBUSH_FLEE = 0.5` (the multiplier lives inside `fleeChance` so the
percentage shown on screen never diverges from the percentage the roll actually uses); if you
get away, `state.ambush` resets — being surrounded doesn't carry into the next battle.
*(A gap-based formula was tried — a 20-person army fled Kergit riders at 89%.)* Failure is a
normal battle. Measured (a fresh character): a lone foot character (speed 122) flees a
marauder (66) 90%, a lord's party (84) 78%, a Kergit (100) 50%; a 20-infantry army is the
same, a 20-cavalry army (speed 161) flees all of them 90%.

**Auto-resolve** — "🎖️ Send Your Troops" appears when your army is **1.5× the enemy's**.
Not a separate calculation, the same engine: `Battle.start(..., auto = true)` sets up units
normally, doesn't open the arena, `Battle.autoResolve()` computes the outcome and enters
**the same `endBattle`** — loot, prisoners, siege/raid/caravan branches all stay in one place.
Loss rate is `0.45 / strength ratio`, falling as low as 40% with the Management skill; strength
is `Σ(health × (attack+2))`, the result gets a ±15% luck factor layered on top. *(Lanchester's
square law was tried: at 5× superior strength, losses fell to 3%, making auto-resolve
essentially free.)* The player doesn't die in auto-resolve, only loses some health.
Measured (20 rounds, lvl-10 Svadya Milisi, Management 1): 20 vs 10 marauders → **4% loss
(0.7 troops)**, 20 vs 25 → **7% (1.3)**, 20 vs 40 → **12% (2.9)**, 20 villagers vs 25 marauders
→ **20% (3.9)**; with Management 8, the 20 vs 25 loss falls to 6%. The same fight, played by
hand, ends with 0 losses in 7.2s — auto-resolve is the price paid for speed.

**Partial commitment and waves**: at most `Battle.FIELD_CAP` (**30**) units per side take the
field (`splitReserves`), the rest wait in `Battle.reserves`. Once the field drops **below 70%**
of capacity, `reinforce()` sends the whole reserve onto the field at once and writes "🚩
Reinforcement wave" to the battle log — in a wave, not a trickle. `checkEnd` counts reserves
too, otherwise the battle would end once the first wave was done. Measured (45 troops vs 60
marauders, a head-to-head sim): the field never exceeded 30, the enemy entered in four waves
of **9+9+9+3** at 1.3 / 2.2 / 3.3 / 4.3s, the battle lasted 8.5s.

#### Routing and pursuit
An army doesn't fight to the last man. A side whose remaining count (reserves included) drops
**below a quarter** stops fighting: `Battle.routCheck()` checks every frame from inside
`checkEnd`, marks the broken side's survivors `u.routing`, **wipes its reserve**, and units run
at `ROUT_SPEED` = **×1.2** toward *the edge they came from* (`routX`, derived from their spawn
lane — even if you spawned in the middle during an ambush, they run back toward their own
side). A routing unit doesn't fight, doesn't seek a target, doesn't hold a block.

Thresholds are `ROUT_AT` 0.25 / `ROUT_MIN` 6: a clash **smaller than six people** has no rout
phase at all (duels and the arena included — there the fight is already over anyway).

**A fleeing unit's accounting closes in one line**: leaving the field removes it from
`Battle.units`. Since loot (`!isPlayerTeam` sum), prisoners (`hp <= 0` scan), and player losses
(matching against the `party` id) all walk that same list, a fleeing unit is never looted,
never taken prisoner, never killed — no extra branch was written. If your own troop flees, it
stays in the party **alive**: it used to be that in a lost battle, everyone died.

**The player's choice**: once the enemy breaks, a single button appears on the battle strip —
*🕊️ Let Them Go*. Doing nothing means "chase them down"; you cut down whoever you catch, and
loot and prisoners come from that. Letting them go earns `Game.HONOR.spare` = **+3 honor** and
the victory screen says what you gave up. What you can actually catch depends on your mount's
speed: a fleeing unit runs at ×1.2, so a player on foot can't catch a fleeing rider — this is
where the speed numbers actually matter.

There are two deadlock guards: a routing unit **never collides with a rock** (a man running in
a straight line couldn't be pushed aside by a rock without getting stuck), and a unit that's
been running for **12 seconds** counts as having left the battle even if it never reaches the
edge (a wall, a breach). `tools/test.js` asserts that a rout triggers, that a routing unit
moves away from the player, and that the battle genuinely ends.

#### Enemy bands (`BAND_KINDS`)
There's more than just marauders; every kind roams the map under its own name/color
(`npc.band`) and spawns its own unit mix in battle. A band of 6+ gets a **leader**.

**Population is derived from sight** (`Game.bandTarget`), not stored by hand. The continent is
9000×9000 units, starting sight is ~500: the player sees about **1%** of the map at any
moment. Area swept per day ≈ `2 × sight × daily distance` (~2600 units); its ratio to the
continent is the daily encounter probability per band — the target is set so that gives ~1
encounter a day, clamped to 14–30 (**30** at starting sight). A world **starts** at target
population and `dailyUpdate` fills toward the target every day, at most `BAND_REFILL`=3 bands
a day. It used to start with 13 bands and spawn one a day: a cleared region stayed empty for
weeks.

Measured (seeds 1–5, 30 uninterrupted days of travel, distinct band count): with the old 13
bands, **18–23** (0.69/day); with the new target, **39–51** (**1.49**/day). `tools/test.js`
asserts population stays at target over 60 days.

**A band comes from a lair (#68)**. The map has `LAIR_COUNT`=5 **bandit lairs**, and every
spawned band is bound to one (`npc.lairId`, spawning within 200–500 units of the lair); no new
band spawns in a world with no lairs — that's clearing's payoff. A lair sits in `state.sites`
as `kind:'lair'`: since drawing, tooltip, clicking, targeting, and saving already run through
that array, a separate `state.lairs` would have meant a second loop in five separate places
(this is the deliberate deviation from the issue's own suggestion). A lair is **assaulted, not
explored**: `enterSite` shows a lair a single button (⚔️ Assault Lair), `assaultLair` sets up
`state.player.currentLair` and starts a normal battle, `endBattle`'s victory branch calls
`Game.clearLair` — the same pattern as a village raid's `currentRaid`/`completeRaid`. An
undiscovered lair is **absent** from the map (`lairSeen`: gets stamped `seen` once it enters
sight range; drawing/tooltip/clicking all check this stamp).

Daily: purse +15 (cap 1200), current 8–12 people +0.15/day (cap 24) — a lair left standing
grows. A settlement within range (`LAIR_RANGE`=1500) loses **0.5 prosperity a day**, and this
**doesn't stack**: a village where two lairs' ranges overlapped used to lose 1.0 a day and die,
same reasoning as the `worst()` rule for terrain penalties. At the initial 2500-unit range,
22 of the map's 30 settlements sat inside a lair's range, leaving nothing "regional" about it.

Measured (seed 3, 100 days, playerless): with no lairs, all settlements average **82.2**; with
5 lairs, the ones in range average **54.1**, out of range **81.7**; if those same lairs are
cleared on day 40, in-range recovers to **78.4**. So a lair is a regional, persistent, and
**reversible** pressure. A missing lair respawns every `LAIR_RESPAWN`=20 days — the world
never empties out.

The guildmaster **knows** a lair (their own caravan gets robbed): accepting
`QUESTS.clear_lair` stamps that lair `seen`, so the quest's real reward is the location itself.
Completion is closed by the `lair_cleared` event `clearLair` fires — not the battle's outcome,
the criterion is **the lair being removed**.

Seeing is one thing, finding *a specific* one is another: a quest that sends you hunting a band
like "Brother in Chains" gives a **rumor** (`QUESTS.brother_in_chains.where`) — the settlement
the band is *currently* closest to. As the band roams, both the 📍 line and the map's 📜 stamp
move with it — you're tracking a trail, not an address.

| Band | Map icon | Battle units | Character |
|---|---|---|---|
| Çapulcular | a spearman on foot, red | Çapulcu / Çapulcu Okçu / Atlı Çapulcu + Çapulcu Reisi | balanced, the weakest |
| Orman Haydutları | a bowman on foot, light green | Haydut Okçusu (weighted) / Orman Haydudu + Haydut Başı | archer-heavy, fast |
| Dağ Eşkıyaları | a spearman on foot, gold | Dağ Eşkıyası / Eşkıya Nişancısı / Atlı Eşkıya + Eşkıya Reisi | armored and tough, spawns after day 20 |
| Kurt Sürüsü | a wolf silhouette, steel gray | Kurt / Yaşlı Kurt + Alfa Kurt | very fast (104–112), `beast`: lunges from sight range at ×1.6 (red ring), never taken prisoner, little loot |
- **Battle**: a 2D top-down canvas arena, procedural terrain (hill / pit / forest / river).
  - Terrain effects: in a forest, archers do ×0.7 damage & **mounted** units get ×0.6 speed; on
    a hill, archers do ×1.3 damage; in a pit, ×0.8 speed; in a river, ×0.7 speed. **Speed
    penalties don't multiply — the worst one applies** (`worst()`); they used to stack, so
    forest+river+pit gave an unplayable ×0.34. "Mounted" is `u.mounted`, not `type` — wolves
    show up as `infantry` in the tree, and Kergit Atlı Okçusu shows as `archer` — both were
    tripping up a rule that checked `type`. `mounted` = `type==='cavalry' || speed >
    Battle.FOOT_MAX` (85, below the slowest horse's 88).
  - Player: WASD to move, left-click/space to swing a sword in an arc (300 ms). **The swing
    hits only the SINGLE closest enemy inside the arc** — it used to hit everyone in the arc at
    once (a group-mowing bug). There's also a `swingCd` recovery time
    (`swingCooldown()` = `max(0.45, 0.75 − skill×0.005)` s), so clicking fast doesn't multiply
    damage. Damage multiplier depends on skill: `0.35 + min(0.4, prof×0.004)`. A missed swing
    shows "miss". Range depends on weapon: base 45, spear +15, mounted +8.
  - **Mount** (if `equipment.horse` exists): the player enters battle as `type:'cavalry'` —
    speed `95 + agility×0.5 + (Riding−1)×3` (on foot, `Battle.footSpeed()` =
    `min(85, 56 + agility×0.5 + (Athletics−1)×2)`). The foot cap sits **below the slowest
    horse (88)**: no amount of Athletics lets a human outrun a horse — if it could, it wouldn't
    be realistic, and a maxed-out foot character would get flagged "mounted" by its own forest
    rule.
    **Charge** (`Battle.chargeMult`): damage is `1 + speed ratio × (spear 1.6 / other 0.6)`,
    so a full gallop with a spear reaches ×2.6; at ≥1.8 "LANCE CHARGE!" appears. Measured
    (mounted, same swing): standing 11 → galloping spear 22, galloping sword 16, on foot 11.
    Once health drops to half, **the player is unhorsed too** (`dismounted`, icon 🧑‍🌾) — this
    check runs before the player's own branch, applied to everyone from a single place. Once
    dismounted you genuinely stay on foot: the player drops to `footSpeed()`, a troop drops to
    `max(50, speed×0.55)`. It used to be −30, so a 174-speed knight still stayed at 144, faster
    than even the best foot troop.
  - **Charge stamina** (`Battle.chargeSpeed`): the speed bonus is no longer unlimited — it burns
    for 2s while you hold the charge, then 4s of **recovery** (×0.9) follows, and it only
    refills once you're fully rested. There's **no passive regen**: with one, tapping the charge
    on and off would beat holding it continuously (measured: tapping 1-in-2 averages ×1.083 >
    holding continuously's ×1.033). The same budget applies to both the player and the AI; the
    player isn't asked which direction (closing in or fleeing both burn stamina), the AI's
    threshold is 220 units to its target. The HUD shows "💨 Winded" and "🌲 Rough Ground" badges.
  - **Block**: hold right-click or **Shift**. The shield's facing locks to the mouse, half-angle
    60°. `Battle.blockFactor()` is the single gate — both melee (`dealMelee`) and arrow hits go
    through it. A shield (`equipment.armor` = Shield) blocks damage from the front
    **entirely**, blocking without one reduces it by 60%; from the side/behind, nothing is
    blocked. Measured (30 raw damage, defense 0): with a shield, front 0, back 30; without a
    shield, front 12, no block 30; same for arrows. Cost: you can't swing while blocking and
    your speed drops to ×0.65 — **the same penalty applies to the AI**; it used to slow only
    the player (to half — pulled to 0.65 so blocking doesn't make walking up impossible).
    Since a shield takes up the armor slot, "block or armor" is a real trade-off.
  - **Bow**: if the weapon is `bow`, left-click/space **shoots an arrow** instead of a sword
    swing (`Battle.playerShoot`). Quiver is `24 + Archery×2` arrows per battle; running out
    shows "out of arrows". Spread is ±0.04 rad standing, +0.10 walking, +0.08 mounted —
    shrinking with skill. Measured (Archery 20): standing 2.1° → walking 7.2° → mounted 11.2°;
    arrow speed 320, damage `attack × (0.5+…)`.
  - **Damage types** (`DMG_TYPES`, Warband's cut/pierce/blunt): damage passes through a single
    gate — `Battle.afterArmor(type, raw, defense)` = `raw × mult − defense × armor`, floor 1.

    | Type | Defense effect | Damage multiplier | Weapon |
    |---|---|---|---|
    | cutting (`cut`) | 100% | ×1.0 | Sword, War Axe |
    | piercing (`pierce`) | 50% | ×0.9 | Spear, arrow |
    | blunt (`blunt`) | 65% | ×0.8 | Mace — **doesn't kill, stuns** |

    Measured for 30 raw damage: at defense 0, cutting 30 / piercing 27 / blunt 24; at defense
    12, 18 / 21 / 16; at defense 25, **5 / 15 / 8** — piercing pulls ahead as armor rises. The
    player, at 120 health, can't bring down a defense-18 target with a sword in under 60s, with
    a spear in 18.8s, with a mace in 44s (and stunning it). An enemy downed by blunt has a 90%
    chance of being taken prisoner instead of 45% — measured: of 64 downed, sword gets 24
    prisoners (38%), mace gets 59 (92%).
    A weapon's damage type is shown as a tooltip in the inventory and market
    (`Game.itemNote`). Troops' damage type goes through the same gate — see "Party & troops".
  - **The enemy blocks too**: non-animal melee units raise their shield between swings — the
    block urge refreshes every 0.6–1.4s at a rate of `min(0.45, defense/40)`, and the shield
    drops right before a swing (`atkCd ≤ 0.2`). It goes through **the same `blockFactor` gate**
    as the player, so only frontal hits are blocked; flanking around the side/behind still
    lands. Since an enemy has no shield item, it's not a full block, just a 60% reduction.
    Measured (12v12, symmetric): at defense 8, the battle went 11.0 → 12.8s; at defense 18,
    37.6 → 45.3s — an armored unit is noticeably tougher, the fight doesn't lock up.
  - Battle tooltip (HUD, bottom left): mount status, arrows left, block indicator.
  - Every attack cooldown timer is **dt-based** (`u.atkCd`), not `performance.now()` — independent
    of frame rate. Infantry `0.85–1.25`s, archers `1.4–1.7`s.
  - Melee damage passes through a single place: `Battle.dealMelee(src, tgt, raw)` — drops
    defense, produces knockback + blood + sparks + floating text, and on a kill calls `logKill`
    + XP.
  - Enemy mix depends on the band (`BAND_KINDS`, table above). Enemies **scale with the day
    count** (`enemyLvl`): +4 hp / +0.5 atk / +0.25 def per tier.
  - **Impassable rocks** (`terrain.rocks`, 2–4 of them): a unit can't enter one, it gets pushed
    out the same way the boundary check does. Never placed on spawn lanes. *(Arrows pass over a
    rock — it isn't cover.)*
  - Tactical orders **don't sit ready from the start of battle**: each one spawns as an
    "opportunity" at its own random moment (`Battle.cmdSlots`; charge 1–2.5s, pursue 2.5–5s,
    hold 4–7.5s). Pressing a closed order gives a warning, shouting the same order again is
    ignored. Closed orders draw faded in the HUD, an order opening up shows in the log and as
    floating text over the player. The windows were narrowed by measurement: a 21-vs-25 battle
    lasts 6.9s, and the first attempt's window (8–22s) never opened the third order at all.
  - Archer AI: 250-unit range, 50% chance of leading the shot based on the target's speed.
    **Kiting balance**: while retreating, speed is ×0.55 mounted, **×0.8 on foot** (a foot
    archer is already slow, a second penalty was unnecessary); ×0.8 while walking to range;
    melee units **rush in** once within 220 units of their target (×1.3, wolves ×1.6) — but now
    against the stamina budget, see "Charge stamina". Used to be that an archer fled at the
    same speed as its pursuer, so it hit risk-free — measured: 1v1 chase time 28.6s → 12s, the
    infantry's remaining health 24 → 31.
    The regression gate is `tools/test.js`'s three *"kite: …"* assertions: a mounted archer, a
    foot archer, and a wolf pack must all resolve without hitting the 180s ceiling.
  - **Battle log fits a phone in one line (#89)**: two corner stacks (`#battle-log-left/right`,
    each 46vw × 20%) piled death lines, the enemy commander's line, and order announcements
    into the arena's bottom half — the player couldn't see their own silhouette. On a
    touch-played device, `Battle.log` writes everything to the **left** stack only, where
    only the **latest** message stays (5 on desktop), and CSS pulls the strip under the power
    bar, full width, one line (`white-space:nowrap` + ellipsis; the commander line's
    `display:block` pieces are switched to `inline` too). The right stack closes — side
    information is already in the color. For the same reason, an order-opportunity's floating
    text **above the player's head** isn't drawn on touch; that text was exactly the text
    covering the player, and the information is already in the strip.
    Measured (375×812, a commander line): the strip is `top:62`, height **16px**, one line.
  - **Everyone is locked to the arena** (12-unit edge margin) — retreating archers used to run
    off the map and lock the battle forever.
  - If the player dies, the battle doesn't end: **you're knocked out** (`Battle.knockedOut`),
    your men keep fighting. A battle won this way gives **half** denars and XP.
  - **Performance**: target search isn't a full scan every frame, it's once every 0.3–0.5s per
    unit (`u.tgtId` + a `_byId` table built once per frame); particle caps (spark 120, floating
    text 40, blood 200). Measured: a 121-unit battle costs update 0.31 ms + render 1.25 ms per
    frame.
  - **Visibility**: a unit's emoji is drawn with a dark outline, its team ring filled and fully
    opaque; the baked ground gets an `rgba(6,10,6,0.16)` darkening layered over it — units used
    to vanish against the grass.
  - Blood pools, corpses (max 60), sparks, floating damage numbers, a two-sided kill log, a
    random insult line + ping animation from the enemy commander.
  - The surrender button is open at all times.
- **Victory**: loot (`10 + level×5` per enemy, `6 + level×3` for an animal, ×0.85–1.15,
  multiplied by the Looting skill) + 3 renown + XP. **The reward shrinks with the strength
  ratio** (`Battle.rewardScale`): `clamp(0.2, 1, (enemy strength / your strength) × 1.6)` —
  hunting marauders isn't profitable forever, the victory modal shows "Easy prey: reward cut
  to X%". The boss fight is exempt. Weapon/riding/athletics skill XP applies, dead troops are
  removed from the party, the NPC is removed from the map, the player's end-of-battle health is
  written back to `state`.
- **Defeat**: the whole party scatters, 60–90% of your money is gone, HP drops to 30%, **you're
  taken prisoner**, and **renown burns** (`Game.defeatRenown(enemy strength)`):
  `2 + 18×(1 − strength ratio) + renown×2%×(1 − ratio)`, capped by renown on hand. Losing to an
  equal costs −2, losing to a 5-person marauder band costs −22 (measured with renown 200, a
  20×lvl15 army). Surrendering (`Game.surrender`) takes the same penalty; the boss is exempt.
- **Balance** (measured, the player wading in): 5 rookies vs 5 marauders → victory with 2–4
  losses; 10 vs 15 → defeat; 20 rookies vs 20 marauders → a coin-flip; with leveled troops
  (20×L10 vs 20) → an easy win. Battles run 8–30s.

### Taking prisoners (the player's own prisoners)
- **45% of downed enemies are taken prisoner** in a won battle (`state.player.prisoners`),
  except the boss fight.
- Capacity is `Game.prisonerCapacity()` = `5 + (Prisoner Management − 1) × 3`; every
  taking/selling of a prisoner gives XP to this skill.
- Value is `Game.prisonerValue()` = `(25 + level×12) × (cavalry 1.5 / archer 1.2 / infantry 1)`;
  sold one at a time or in bulk from the town's **⛓️ Slave Trader** screen. Can be released from
  the party screen.
- Every day, `max(1%, 6% − skill×0.5%)` chance a prisoner escapes; nobles never do.
- **A noble prisoner**: when a lord's party is defeated, that lord is taken prisoner (removed
  from the map). Demand ransom from the party screen (2500–4500 denars, −20 relation, −4 with
  that kingdom's other lords) or release them honorably (+25 relation, +6 with the faction, +3
  renown). Either way, `Game.respawnLordParty()` returns the lord to the map near their home in
  a shrunken party.
- If the player is defeated/surrenders, every prisoner they're holding goes free.

### Captivity (the player's own captivity)
- **A single data model**: however you get captured (defeat in battle, surrender), captivity
  goes through `Game.beginCaptivity(npc, days)` and it all lives in `state.player.prisoner`:
  `{npcId, npcName, troops, fellows[], daysLeft, ransomRequired, ransomRefusals,
  escapeChance, isPlanning, lastAttemptDay}`. Ransom/escape/release all null this object.
  `fellows` are the other prisoners dragged along with you (`Game.rollFellows`; an animal
  pack never takes prisoners).
- While captive, the player is locked to the captor's location; nothing else can be done.
- **The captor's party is the only one that moves on the map**: the player's own party icon
  and name aren't drawn, only a ⛓️ mark next to the captor. *(It used to be that the player's
  icon + name + "Prisoner (Ng)" text landed on the same spot as the captor's own icon/label.)*
- The captor's tooltip shows their own troops, you, and other prisoners
  (`Game.npcTipHtml`).
- `#prisoner-ui` (bottom right) shows who's holding you, guard count, days left, other
  prisoners, and escape chance in a single panel. The separate giant ⛓️ icon was removed — it
  was overlapping `#map-hud` in the bottom left.
- The "plan an escape" toggle fills escape chance from 0 to 80 on a slowing curve.
- "Attempt escape" once a day; on failure, chance −60 and the plan resets.
- Once time runs out, 40% chance of a free escape, otherwise a ransom modal (75–90% of your
  money).

### Diplomacy — war between kingdoms (#20)
Single data: `state.wars = { 'a|b': the day the war started }` (an ordered faction-pair key).
Helpers: `Game.atWar(a,b)` / `warsOf(f)` / `declareWar` / `makePeace` / `playerFaction()`; news
lands in `state.warLog` (last 20 events), written by `Game.news(msg, mine)` — `mine` only pops
a notification for an event concerning the player's own kingdom.

**The player has a banner too (#48)**: `Game.playerFaction()` now returns **`'player'`**
instead of `null` while not a vassal. It used to be that an independent player didn't count as
at war with anyone — `atWar` returned false everywhere, an enemy town's market/inn stayed
open, and an enemy lord just walked right by. `'player'` isn't a `FACTIONS` entry;
`factionName` writes it as "<player name>'s Company", it never enters `diplomacyTick`'s "a
kingdom down to two fiefs sues for peace" rule (it has no fiefs), but the war key
(`player|rhodok`), the news feed, the closed enemy gate, and lord aggression all behave like a
normal front. The way to enter a war while independent is **raiding a village**
(`completeRaid` → `declareWar`); after 15 days the other side can sign peace on its own. The
diplomacy screen shows an independent player their enemy list instead of vassalage.

- `Game.initDiplomacy()` opens one front on entering the world (and, in a save from before
  diplomacy existed, inside `Save.load`) — Calradia is never at rest.
- `Game.diplomacyTick()` every day: a war past 15 days ends in peace with `0.06 + duration×0.004`
  chance; 10% chance a new war is declared (a kingdom fights **at most two** fronts).
- `Game.warTick()` resolves the front every day:
  - Enemy lord parties within 700 units clash (`resolveFieldBattle`) — the winner loses ~20%
    troops, the loser ~70%; a party that drops under 8 people scatters, respawning at home
    4–10 days later via `state.lordRespawn`. These clashes don't pop a notification, only a
    scattered party makes the news.
  - A strong army within 500 units (`size > garrison × 1.3`) **besieges** a settlement for
    **3 days** (`atk.siegeDays`), then takes it; a fallen settlement can't be retaken for 10
    days (`loc.capturedDay`), the besieging army loses 40%. A town/keep changing hands takes
    villages within 900 units with it.
  - A kingdom at war doesn't sit at home: while `updateNPCs` picks a new target, there's a 35%
    chance a lord walks toward one of the 3 nearest enemy settlements.
- Effect on the player: a lord's party only attacks if **your kingdom is at war with theirs**
  (`isHostile` → `atWar`); a town/keep is only besiegable if you're at war with it, a
  peacetime neighbor's market and inn stay open to you (`enterSettlement`, `locTipHtml`). War
  starts with that kingdom the moment you conquer one of their fiefs.
- `Game.showDiplomacy()` (the 🌍 button in the map tooltip, or **K**): fief count per kingdom,
  who's at war/allied with whom, ongoing campaigns, a news feed below.
- Measured (200 days, playerless simulation): 8 settlements changed hands, ~290 front clashes,
  13 war declarations, no kingdom got wiped out. Before the siege wait time was added, the same
  sim produced 38 conquests and wiped two kingdoms off the map by day 150.

### Marshal, campaign call, and alliance (#36)
Diplomacy isn't just "who's at war with whom" anymore: kingdoms **raise armies** and
**take sides**.

**Campaign** (`state.campaigns[faction]` =
`{marshalId, marshalName, targetLocId, day, pledged, helped}`, `Game.campaignTick()` runs
daily):
- A kingdom at war has a 25% daily chance of picking a **marshal** (`pickMarshal`: the biggest
  lord party on the map, excluding the king) and giving them the nearest enemy town/keep as a
  target.
- **`updateNPCs` no longer scatters the army**: while a lord of a campaigning kingdom picks a
  new target, there's a 70% chance they walk toward the marshal's target (it used to be 35%
  chance of a random one of three enemy settlements). The army massing then resolves into a
  siege via `warTick`'s own rule — the siege code itself wasn't touched.
- A campaign ends via `endCampaign` once the target falls / peace happens / 25 days pass; the
  same kingdom can't open a new campaign for **3 days** (`state.campaignCooldown`) — otherwise
  a finished campaign's reward modal got clobbered by the next call-to-arms modal.

**Campaign call** (if you're a vassal): the `summonToArms` modal appears with the king's name,
the marshal, and the target.

| Response | Result |
|---|---|
| ⚔️ Join + be within **1200 units** of the target (sampled once a day → `helped`) | **+15 renown, +8 with every lord** if the campaign succeeds; +5 renown / +3 relation if it fails |
| ⚔️ Join but never show up | **King −8, other lords −3** — the most expensive option |
| 🚪 Refuse | An immediate **−5** with every lord, no extra penalty once the campaign ends |

Once you join, the target shows on the map as a dashed gold circle:
`state.knownLocations['campaign']` refreshes every day, so it never gets caught by
`Nobles.dailyTick`'s 3-day removal rule.

**Alliance** (`state.allies` = `{'a|b': day}`, `Game.allied/alliesOf/makeAlliance/breakAlliance`):
- `diplomacyTick` has a 5% daily chance of shaking hands between two peaceful kingdoms that
  **share a common enemy**.
- An alliance has a cost: the ally's every front opens to you too (`makeAlliance` fires mutual
  `declareWar`s internally). `declareWar` doesn't declare war on an ally.
- An alliance past 25 days has a 5% daily chance of dissolving.

**A kingdom no longer gets wiped out** — since the campaign system massed armies onto a single
target, conquest sped up, and in measurement, 3 of every 4 rounds wiped a kingdom off the map.
Two rules brought this back: `warTick` never lets a faction's **last** town/keep be besieged,
and a kingdom down to two fiefs has a 25% daily chance of signing peace after 5 days in
`diplomacyTick` (normally 15 days / 6%).

Measured (`node tools/sim.js --days 200 --seed 1-5`, playerless): **5–15 conquests**,
29–39 campaigns (~every 6 days), 1–5 alliances, 17–27 peace treaties,
**no kingdom wiped out in any round**. Before campaigns, the same sim produced 8 conquests —
the front got noticeably more active without the map collapsing.

### Sieges & founding a kingdom (#25)
A siege isn't a field battle you open with one button, it's a **three-stage** affair: camp →
preparation → assault at the wall. Garrison is `Game.garrisonOf(loc)`: **the real troop
count there if it's your own fief**, otherwise town 30 / keep 15 base, ±30% by prosperity.

**1. Camp** (`Game.besiegeLocation` → `beginSiege`): the settlement screen's *⚔️ Set Up Siege
Camp* asks for a method. The choice sits as
`state.player.siege = { locId, plan, daysLeft, weaken, foundingKingdom }` (saved alongside
`state.player`), the player is pinned over the settlement and
`state.player.status = 'besieging'` — **time flows in camp**, the world keeps running. The
`#siege-ui` panel in the bottom right shows status and two buttons (⚔️ Begin Assault / 🚪 Lift
Siege); the assault button is dimmed until preparation is done.

| Method (`Game.SIEGE_PLANS`) | Preparation | Breach in the wall | Defender's advantage |
|---|---|---|---|
| 🪜 Ladder | **1 day** | gate only (74 units) | **+40%** health and attack |
| 🗼 Siege Tower | **3 days** | gate + tower ramp (118 units) | **+15%** |

**2. Preparation and starvation** (`Game.siegeTick`, `dailyUpdate`): `daysLeft` drops every
day. Waiting on past preparation being done **is a deliberate starvation tactic** — the
garrison erodes **7%** a day (cap 55%) and the settlement's prosperity drops 1.5 a day.
Measured: a 34-person garrison drops to 26 in 3 days, prosperity drops from 65 to 61. The cost
is that your own army eats through supplies at the gate too.
**Relief army** (`Game.siegeRelief`): during both preparation and waiting days, there's a 25%
chance the nearest enemy lord party within 2500 units shows up at the gate — either you fight
them (a normal encounter) or you break camp. If you're defeated/surrender, the camp disperses
on its own.

**3. Assault** (`assaultSiege` → `startSiege` → `Battle.start(..., plan)`): the battle arena
becomes a **siege variant** (`Battle.siege`). A vertical stone wall sits across 66% of the
arena; no river or rocks are placed, hills/forest only appear on the attacker's side. The
defender spawns behind the wall, the attacker spawns on the field.
- The wall is impassable (inside `update`'s arena-boundary block); the breach narrows its
  interior like a corridor.
- Pathfinding runs through a single rule: a unit whose target is on the **other** side of the
  wall walks to the nearest breach. The attacker targets a point 70 units past the breach (the
  offset drops once through), **the defender never crosses it** — they hold the breach's mouth,
  the bottleneck is their advantage. *(The target point has to sit outside melee range: at 30
  units, the attacker thought it had "arrived" right at the breach's mouth and got cut down
  standing there.)*
- Arrows pass over the wall (like rocks) — a defending archer shoots through the battlement.
- Measured (40 lvl-15 Svadya Milisi vs a 26-person Svadya garrison, 2 rounds, each round a
  separate page load): a wall-less field battle costs **0–1 losses / 9–10s**, a siege tower
  **3–4 losses / 9–10s**, a ladder **8–18 losses / 10–14s**. So the tower pays back its three
  days, the ladder is fast but costly.

Winning transfers the settlement to your liege's faction; if independent, you found **your own
kingdom** (`FACTIONS.player_kingdom` is created at runtime). Either way, **war is declared**
(`Game.declareWar`) on the conquered settlement's former owner and the settlement **becomes
your fief** (`Game.grantFief` → the section below). Conquest news is written into the victory
modal; `alert()` is never used, the victory screen would clobber it.

### Fief management (#23)
A conquered settlement is no longer just a flag change: `loc.owner === 'player'`
(`Game.grantFief`, villages within 900 units come along with it) and it opens up three things.

| What | Where | Rule |
|---|---|---|
| **Tax** | every day, `dailyUpdate` | `Game.fiefTax(loc)` = `prosperity × (town 2 / keep 0.7 / village 1)`. Measured: a prosperity-55 town gives +110, a prosperity-69 town +141, a typical keep ~+45 |
| **Garrison** | settlement screen → 🛡️ Garrison | `loc.garrison[]` are real troop objects; they don't count against your party capacity but their **wage adds to `upkeep()`**. A companion can't stay in a garrison |
| **Storage** | settlement screen → 📦 Storage | `loc.storage[]`; **food in storage doesn't spoil** (`spoilFood` only walks `state.player.inventory`) and isn't looted on defeat |

- Wage is read from a single rule: `Game.troopWage(t)` (companion 20, lvl 51 free, lvl 20+
  `level/2`, lvl 10+ 2, below that free) — both `upkeep()` and `fiefIncome()` call it.
- `Game.fiefIncome()` = `{tax, wage, troops, net}`. The treasury tooltip has a "Fief tax" line,
  the diplomacy screen (**K**) shows the fief list + net income.
- **Balance**: stuffing a garrison with elite troops is a loss — measured, 12 knights (lvl 30)
  eat 180 denars/day, dropping a 141-denar town to **−39**. Filling it with cheap troops is
  the correct move, same as in Warband.
- **An undefended fief gets taken back**: `warTick`'s siege threshold looks at `garrisonOf`, so
  a garrisonless fief falls the first time an enemy lord passes by. `captureSettlement` then
  drops `owner`, **wipes the garrison**, and shows you the news as a modal; storage stays put.
- `owner` / `garrison` / `storage` are saved (in `Save.save`'s `locations` array).

### Vassals — granting fiefs as king (#40)
Once you found your own kingdom (`state.player.vassalOf === 'player_kingdom'`,
`Game.isKing()`), a fief stops being a burden you carry alone: **you grant land to keep
lords.** The same rule as Warband applies exactly — no one swears fealty to a landless king.

| What | Where | Rule |
|---|---|---|
| **Invite** | lord dialogue → 👑 Join my kingdom | Requires relation ≥ **25** and a fief on hand (non-village) to grant. The offer is a direct fief offer: the town/keep you choose becomes theirs |
| **Granting a fief** | diplomacy screen (**K**) → 👑 Grant to vassal on the fief's row | `Game.grantFiefTo(locId, lordId)`; villages within 900 units change hands too |
| **Tribute** | every day, `fiefIncome()` | **30%** of the vassal's fief tax (`Game.VASSAL_TRIBUTE`) comes to you, the rest and the garrison burden stay with them |

- A vassal's **party fights under your banner**: `lord.faction` and their map party's
  `faction`/color become `player_kingdom`, so `warTick`/`isHostile`/`pickMarshal` all
  automatically count them as part of your army. Every lord of their old kingdom loses
  **−10** relation.
- Granting a fief hands its **garrison to the vassal's command** (`loc.garrison` empties, its
  wage no longer comes out of `upkeep()`); defense falls back to `garrisonOf`'s formula branch.
- Granting a fief gives **+20 relation**; other vassals still landless get **−5** (jealousy).
- Since `LORDS` isn't saved, vassalage is stored as `state.vassals` (an id list);
  `Game.applyVassals()` restores the lord's and their party's banner on load.
- A player who is king **isn't summoned to their own campaign**: `campaignTick`'s
  `summonToArms` call is skipped for `player_kingdom` (it still picks a marshal, vassals still
  march to the target).
- Measured: a king with 3 fiefs collects +205 tax a day; granting Praven (prosperity 55) to a
  vassal drops their own tax to 96 but brings +33 tribute (net 129) — giving away land halves
  the money, in exchange for a lord who'll fight for you and a town defended for free.

### Tournament, betting, and the arena (#26)
A town has two non-battle fight offerings: the **tournament** (opens occasionally, has a
prize, has betting) and the **arena** (always open, no prize, practice).

**Tournament** — `TournamentMinigame.start({ bet })`, clicking 12 targets in 25 seconds. Target
size depends on agility, on-screen duration depends on strength. Now **eliminated round by
round**: the 12 targets split into `ROUNDS = 4` rounds (`perRound = 3`), a **random piece of
gear** (`GEAR`) is drawn at the start of each round, and there's a +6-second breather between
rounds.

| Gear | Target size | On-screen time |
|---|---|---|
| 🗡️ Wooden Sword | ×1.00 | ×1.00 |
| 🔱 Spear | ×0.85 | ×1.30 |
| 🏹 Bow | ×0.70 | ×1.55 |
| 🛡️ Mace and Shield | ×1.30 | ×0.75 |

**Betting** (`ODDS`, at most `Game.ARENA_BET_MAX` = 1000 denars): money is taken when entering
the tournament, payout depends on **how many rounds you cleared** —
`bet × ODDS[floor(score/perRound)]`.

| Round eliminated in | 1 | 2 | 3 | 4 | 🏆 Champion |
|---|---|---|---|---|---|
| Odds | ×0 | ×0.3 | ×0.8 | ×1.6 | **×5** |

Measured (with a 1000-denar bet): eliminated round 1 **−1000**, round 2 −700, round 3 −200,
eliminated in the final **+600**, becoming champion **+4000** (plus the tournament's own 500
denars + 20 renown). So expected value is negative for a mediocre player, and it's the
fastest early-game money source for a good one — same as in Warband.

Winning also opens `state.pendingDedication` (you can dedicate the win to a lady).
With `opts = { mode:'chicken', goal:8, time:15 }` it runs as the chicken-quest variant — chicken
mode has no rounds, gear, or betting. On completion, the `tournament_end` / `chickens_caught`
event fires.

**Arena** (`Game.openArena` → `Battle.startArena(idx)`) — a variant of the duel machinery: no
party enters the arena, **no loot, renown, prisoners, or captivity**. The opponent is picked
from `Battle.ARENA_FOES`, leveled relative to the player; since it's a wooden weapon,
`dmgType = 'blunt'` (doesn't kill, stuns) and `type = 'infantry'` — *a single opponent must be
infantry, since an archer drawn from the pool would kite you forever in a 1v1; the same fix was
also applied to `startDuel`.*

| Opponent | Level | Skill XP (on win) |
|---|---|---|
| Acemi Dövüşçü | player −3 | 80 |
| Arena Gediklisi | player +2 | 180 |
| Arena Şampiyonu | player +8 | 340 |

A loss gives **40%** of the XP. The real cost is time (`Game.finishArena`): a win costs
**3 hours**, a loss costs **1 day** in a sickbed — this bounds infinite XP grinding. Weapon
skill matches your equipped weapon's type, and an extra 60% of that amount is written to
`riding`/`athletics` XP. Measured (One-Handed 1 → 10, always winning): the rookie takes
**52 fights / 6.5 days**, the veteran **23 / 2.9 days**, the champion **13 / 1.6 days**.

*(`Battle.surrender()` in a duel or the arena now drops straight into `endBattle(false)` — the
old path didn't restore `_duelParty`, so a player withdrawing from the match had their party
permanently deleted.)*

### Boss
Using the `boss_map` item (5000 denars from the market) opens the **War God** fight. It can be
entered at most 4 times, the boss's level rising +5 each time. Winning drops the lvl 51 medal.

### Daily event pool (#35)
So a campaign isn't just staring at a silent table, `Game.dailyEvent()` rolls a die at the end
of every day (at the very bottom of `dailyUpdate`, after the day's accounting is closed):
`EVENT_CHANCE` **0.35**. If an event fires, it's told as a modal and its mechanical result is
written in a line.

- The pool is `Game.DAY_EVENTS` (13 events, 8 negative / 5 positive). Every event has a
  `when(ctx)` filter — `ctx` = party headcount, **the nearest settlement within 900 units**,
  total food, morale. So "drunk soldier" only appears near a settlement, "lost a horseshoe"
  only while mounted, "a village woman left cheese" only right by a village.
- The die is rolled **twice**: first the tone (60% negative), then an event from that tone.
  The last 4 events aren't repeated, but this filter runs **inside the tone** — applying it to
  the whole pool used to starve the small positive pool against "recent events" and pushed the
  negative share up to 71%. If the tone's own pool is completely empty, the filter drops —
  otherwise a player wandering with no army and no town got no events at all.
- Costs are small: morale ±2–4, 2–4 units of food, a 15–60 denar fine, a troop wounded for 2
  days; theft is 2–5% of the treasury but **capped at 250 denars** (so it only annoys a rich
  player too). The positive side: +30–90 denar purse, 2–4 meat, morale, a troop joining from
  the road if there's capacity, two cheeses from a village.
- Helpers: `Game.addMorale/addItem/takeFood`; no event fires during captivity or a siege camp.

Measured (400 days, a roaming and growing 6-person party): **156 events — one every 2.6 days**,
60% negative, 12 of 13 events appeared (the horseshoe event needs a horse).

### Road events — encounters with a decision (#67)
The day's event just *happens to* you; a road event **asks** you. `Game.ROAD_EVENTS` has 20
events, each with 2–3 options, and every option has a real cost: money, hours, morale, honor,
a troop getting wounded, or a straight battle.

- **The die depends on distance, not the day.** `Game.roadTick(step)` accumulates distance
  walked every frame inside the movement branch; every `ROAD_EVERY` **1200** units it rolls
  `ROAD_CHANCE` **0.25**, so the expected interval is 4800 units. The counter pauses during
  captivity and while `encounterCooldown` runs — a player fresh out of a battle doesn't
  immediately get another decision thrown at them.
- **No second event system was built.** The day's event and a road event share the same three
  pieces: context `Game.eventCtx()` (party/capacity, the nearest settlement within 900 units
  and its faction, food, morale, purse, honor, whether it's night, terrain name, whether on a
  road), selection `Game.pickEvent(pool, ctx, extra?)`, and a shared **last-6-events** window
  (`state.recentEvents`). Two pools, one machine.
- **Filters genuinely use context**: `pelt` only in a forest, `ford` only at a river crossing,
  `lost_scout` only off-road, `peddler` only on a road, `night_fire`/`tracks` only at night,
  `survivor` only right by a village raided within the last 10 days, `treat` only appears if
  honor ≥10.
- **Raw stays, translate at display.** The pool's `text` and every `label` are **functions**:
  since the table is built before `I18N.load()`, a `T('…')` written at the top level would
  freeze the translation. The string inside the function body is still a literal the static
  extractor can see — the *"every T key exists in both dictionaries"* assertion covers this pool
  too, no separate gate needed.
- **One gate, two callers**: the result can return `{ html, then }`; `then` runs **after** the
  modal closes (`Game.modalDone()`). Points-of-interest outcomes go through the same gate — a
  battle screen opened before the modal closed used to get buried underneath it.
- Shared helpers: `Game.spend(n)`, `Game.woundRandom(days)`, `Game.addRecruit(loc)` (`null` if
  capacity is full), `addMorale/addItem/takeFood/addHonor/advanceTime`.

Measured (seeds 1–5, 30 days of **uninterrupted** travel, a 6-person party ≈111 units/hour):
**13–20 events, average 16**. In real play, since not the whole day is spent traveling, this
shows up at about half that rate.

### Debug report (#52)
So there's more on hand than a screenshot when something breaks, there's a **🐞 Debug Report**
button (`Debug.open()`; opened from the ⚙️ Settings panel and by clicking the error badge). The
`Debug` object sits at the **very top** of `app.js` and `Debug.init()` is called right there —
so even an error thrown while the game is booting gets caught.

- A ring buffer (`Debug.errors`, last 25): `window.onerror` (message + file:line + the stack's
  first 3 lines), `unhandledrejection`, and a wrapped `console.error`.
- `Game.skipFrame` calls `Debug.frame(d)` on every rAF — the last 30 frame intervals sit in the
  report, evidence for a "black screen / freezing" complaint.
- Report (`Debug.report()` → JSON): file date + address, game summary (day/hour, active
  screen, whether a modal is open, health/denars/renown, location, `status`, party, prisoners,
  faction, stamp, siege/raid/captivity, open battles, quest ids), rendering status
  (`Battle.active`, loop ids, **target fps / frame divisor / effective fps**, measured refresh
  rate, both canvases' size, last frames), browser/screen/DPR/memory, error list. *(The
  divisor line used to assume 60 fps even in lite mode: with a real divisor of 16, the report
  wrote 8 — this is what delayed diagnosing #85. The three fields are now written separately.)*
  Every field goes through try/catch — the report itself can't blow up.
- Modal text is selectable; **📋 Copy to Clipboard** (`navigator.clipboard`, an `execCommand`
  fallback if permission is denied) and **💾 Download as File**
  (`webband-debug-dayN.json`).

Measured: `Game.nonexistentFunction()` and a rejected promise both showed up in the buffer as
`error` and `promise`, the report was 1.6 KB, the average of the last 30 frames was 16.7 ms
(68 Hz).

**The "unlabeled yellow button" complaint's (#35)** single gate is `Game.btnLabelOk(text,
where)`: if the label is empty/`undefined` or is nothing but the label, the button is **never
drawn** and `Debug.log('emptybutton', …)` drops into the report along with the call's stack —
which flow it came from is read from the JSON the player submits. It has two callers: `addBtn`
(the settlement screen) and `showModal`, which — since modal HTML is generated from a template
string — scans the buttons after they're written and sets an empty one to `display:none`.
Measured: an `addBtn` with an empty label never drew, an empty button in a modal was hidden,
a filled one was left untouched; not a single false positive across the market (36 buttons),
the inn (11), the hall, diplomacy, and debug modals.

### Save system (#55 item 1)
A versioned, migratable, exportable system in place of the single-slot `webband_save_v1`.

| What | Rule |
|---|---|
| Key | `webband_save_<slot>`; slots are `1/2/3` (manual) + `a1..a5` (auto ring) + `legacy` (`webband_save_v1`, read-only) |
| Version | `v: 2` at the save's root; `state.meta = { v, version, createdAt, playtime, autoIdx }` |
| Autosave | `Save.auto()` at the start of every game day (`dailyUpdate`'s first line), ring `a1→a5→a1`; can be turned off in settings |
| Corrupt save | On a JSON error, `Save.read()` **doesn't delete** the save, moves it to a `webband_broken_<time>` key, logs via `Debug.log` + a warning, returns `null` |
| Export/import | `Save.exportSave()` copies the text to the clipboard, `Save.doImport()` validates the pasted text and writes it to slot 1 |

**The migration chain** `Save.migrate(d)` lives in one place — it used to be one-off `if`s
scattered inside `load()`. v1 → v2: `state.explored` is dropped, a troop name prefixed
`Efsanevi ` is converted to a `legendary: true` flag, `state.muted` moves to
`settings.muted`, `meta` is set up (`migrated: true`).
If `d.v > Save.V`, the save doesn't open ("from a newer version").

Measured: `Save.save('1')` **1.4 ms**, a save is **36 KB**; after 7 autosaves the ring
`a1..a5` = days 15/16/12/13/14 (`autoIdx=2`); export → `localStorage.clear()` → import
round-trip brought back day 42 / 9999 denars / 77 renown exactly; a corrupt JSON was moved
from `webband_save_2` to `webband_broken_2026-09-09042327`, the game stayed open; loading a
v1 save dropped `explored`, turned "Efsanevi Svadya Şövalyesi" into "Svadya Şövalyesi +
legendary", moved `muted` into settings, `meta.v = 2`.

### Error visibility: badge and loop shield (#55 item 2)
An exception breaking the rAF chain froze the screen, and no one who hadn't opened the
console could see why. Two pieces:

- **`Debug.guard(where, fn)`** — wraps the body of all three loops (`map loop`, `battle
  loop`, `tournament loop`). Swallows the exception, **the `requestAnimationFrame` on the
  next line still runs**, so the loop survives. The same signature (`where|message`) is
  logged once, a repeat is counted in `Debug._sig` and written into the report as
  `swallowedRepeat` — a flood of errors doesn't sweep the buffer.
- **`#err-badge`** — bottom-right "⚠️ N errors — click to copy", clicking opens `Debug.open()`.
  `Debug.log` calls `badge()` on every call, so `onerror`/`unhandledrejection`/`guard` all go
  through the same counter.

Measured: 45 exceptions (40 with the same signature, 5 with a second) → **2 records, 0 leaked
exceptions**, badge "⚠️ 2 errors", the report carries the lines `map loop|test blowup x40` and
`battle loop|second signature x5`; a normally-returning body's value (`42`) is preserved. In
the real loop, blowing up `renderMap` keeps `Game._loopId` alive and the badge shows 1 error.

### Settings screen (#55 item 7)
**⚙️ Settings** in the side menu (`Game.showSettings()`). One gate: `Game.opt(k)` /
`setOpt(k,v)` — defaults live in `Game.OPTS`, `state.settings` stores only the
**deviations** (it enters the save with `state`).

| Setting | Effect |
|---|---|
| Sound / volume | `Game.sfx()` checks `opt('muted')`, scales the gain by `opt('volume')` |
| Reduce motion (System/On/Off) | `Game.reduceMotion()`; `body.reduced-motion` turns off every CSS animation and transition, camera smoothing becomes **instant** (`snap = 1`), `Battle.spark()` produces no particles at all |
| Blood and corpses | if `opt('gore')` is false, `Battle.blood()` returns early, corpses aren't pushed |
| Frame-skip gate | if `opt('frameGate')` is false, `skipFrame` **never** skips a frame (measurement keeps running anyway) — the player's own escape hatch |
| Font size | `opt('fontScale')` × the 16 px root font size; the UI is `rem`-based |
| Autosave | turns off `Save.auto()` |
| 🖱️ Edge panning (Device-dependent/On/Off) | `Game.edgePan()`; `'auto'` = `!isTouch()` — see "Edge panning is for the mouse" |
| 📱 Lite mode (Device-dependent/On/Off) | `Game.lite()`; simplifies the whole game and drops the target to 30 fps — see "Lite mode" |

The panel also carries 💾 Saves, 🐞 Debug Report, ⌨️ Keys (the `Game.KEYS` table), and the
version line. Measured: font scale 0.9/1/1.15 → root **14.4 / 16 / 18.4 px**;
`reducedMotion:true` adds the `body.reduced-motion` class, `'auto'` is false on this machine;
with the frame gate `_step=4`, on it gives `[true,true,true,false]`, off gives
`[false,false,false,false]`; `state.settings` holds only the three deviating keys.

### Accessibility pass (#55 item 6)
- **Team distinction isn't color alone**: `Battle.drawUnit` draws the enemy ring with
  `setLineDash([4,3.2])`, the friendly ring stays solid. Measured: friendly ring **100%
  coverage / 0 gaps**, enemy **75% / 6 gaps**; the two ring colors' gray value is 151 vs
  138 — only **13/255** apart, so on a grayscale screen shape is now what carries the
  distinction.
- **Keyboard in a modal**: `Input.init` — while a modal is open, **Esc** closes it (except
  the encounter modal — no escape key while `currentEncounterNpcId` is set) and **Enter**
  presses `button.primary` in `#modal-body`, or the first button if there is none. Measured:
  Esc closed it, Enter picked the primary button (2), with no primary it pressed the single
  button (7), the encounter modal resisted Esc.
- Font-size scale and reduce-motion are in the settings table above.
- Touch/mobile got its own pass — see the section below.

### Touch and mobile (#65)

The game was completely unplayable without a mouse and keyboard. Three separate jobs:
**input path**, **layout**, **hint text**. One rule: `pointer: coarse` decides the input
path, `max-width` decides the layout — two separate questions, because a tablet's wide
screen is still dragged with a finger.

**1. One input gate.** `mousemove/mousedown/click` listeners were replaced with **pointer
events** (`Game.onMapDown/onMapMove/onMapUp`); mouse and finger go through the same gate, two
separate targeting paths aren't kept. The `e.pointerType === 'mouse'` branch calls the old
behavior (`handleMapHover` / `startTargetDrag` / `endTargetDrag`) exactly as before.

| Finger | What it does |
|---|---|
| One-finger drag | Pans the camera — the **same** gate as WASD (`camera.offset`), the ±9000 bound in `update` |
| Two fingers | Zooms: `targetZoom × (new spread / old spread)`, between `minZoom()` and 3.0 |
| Short tap (<450 ms, <10 px) | `handleMapClick` — sets a target / enters a settlement |
| Long tap (≥450 ms) | `handleMapHover` — opens the tooltip, **doesn't set a target** |
| Dragging over the target marker | Moves the target marker (its own code, #35) |

Measured (375×812, zoom 0.8): a −60/−30 px drag panned the camera **+75 / +37.5** world
units (= pixels/zoom); a two-finger spread going 100 → 200 px turned zoom **0.80 → 1.60**.
A short tap set the target, a 600 ms tap opened the tooltip and **didn't set a target**.

**2. Battle controls** (`#touch-ui`, `Game.initTouchUI`). Bottom-left a **movement stick**,
bottom-right an **aim stick**, a 🛡️ block button between them, a single row of command
buttons above. Sizes live in three `:root` variables (`--tui-stick` / `--tui-btn` /
`--tui-lift`) — shrunk in #86. None of them opens a new input path into the battle engine:

- The left stick writes `w/a/s/d` into `Input.keys` (threshold ±0.38) — the engine still
  reads keys.
- **The right stick aims the sword (#88)**: while dragging, `Input.aim`; on finger-lift,
  `Battle.playerAttack()`. Tapping without dragging swings at the last aim direction, so the
  old ⚔️ button's job still stands. If a bow is equipped, the same stick shoots an arrow
  (`playerAttack` already checks the weapon).
- Aim is derived via `Input.aimSync(u)` from `Input.aim || Input.stick`'s direction and
  written into `Input.mouse` — the battle engine still only reads `Input.mouse`, two separate
  aim paths aren't kept. If the right stick is never touched, aim is still the **movement**
  direction, exactly as before (#65's behavior). If the mouse moves, both reset, aim goes
  back to the mouse.
- With a finger there's no cursor, so `Battle.render` draws an **aim arc** in front of the
  player (a single outline, spanning `swingHalfAngle()`) — where the sword will go is only
  visible if it's drawn.
- The stick machinery lives in one place: the `mount(el, knob, onDir, onEnd)` closure inside
  `initTouchUI` sets up both sticks.
- Commands send a synthetic `KeyboardEvent('keydown')` via `Game.touchCommand(key)`;
  `Input`'s own listener resolves it.

**The bottom half of the screen belongs to fingers**, so drawing and panels moved up:
`drawHud`'s base is `const B = Game.isTouch() ? 150 : H` — the tooltip and command strip sit
**above** the power bar, near the top of the screen. The battle log's bottom position is
derived from the same control variables.
Measured (355×493 canvas): command strip 110–138, log 223–319, command buttons 325–359,
sticks 367–483, ⚔️/🛡️ 409–483, Surrender 503–547 — **no pair overlaps**. The controls'
`--tui-lift: calc(66px + env(safe-area-inset-bottom))` starts above the bottom strip
(Surrender) and doesn't slide under the home bar on a notched phone.

**3. Narrow-screen layout** (`@media (max-width: 820px)`): the side menu becomes a horizontal
strip that opens at the bottom (icon on top, label below, shortcut badge hidden), campaign-bar
badges wrap, the modal scrolls within itself via `calc(100vw - 20px)` + `max-height: 88vh`,
the market's two columns stack (`#market-cols`), the start screen's absolutely-positioned
buttons join the flow. On a landscape-held phone (`max-height: 480px`) badge subtitles and
menu labels drop.

- **A tooltip opens on tap**: there's no `:hover` on a finger. `pointerdown` toggles the
  `.tip-open` class on `.tooltip-container`, the `:hover` rule is voided on a coarse device.
  The overflow fix is gathered into one place (`Game.clampTip`) — a tooltip arriving via mouse
  and one opened via touch both go through it. The map tooltip is also measured and clipped
  into the screen (`handleMapHover`): measured, on a 375 px screen 132 → 361, **no overflow**.
  *(A `rect` in the same body was undefined: it threw a `ReferenceError` every time near a
  settlement, and the tooltip never opened.)*
- **Touch targets** at least 44 px (WCAG 2.5.5). Measured: before the rule, `#map-hud` had
  four buttons at 22/22/20/20 px, after it **0** of the visible on-screen buttons are under 44.
- The three canvases carry `touch-action: none` (pan/pinch are ours), the `viewport` tag
  carries `user-scalable=no, viewport-fit=cover`.
- **Page height is `dvh`, not `vh` (#85).** On iOS, `100vh` is the height valid *while the
  toolbars are hidden*. Measured (an iPhone debug report): `screen 390x844`,
  `window 390x669` — so the layout stayed ~80 px taller than the visible area and the phone
  "kept scrolling itself." `body` and `#game-container` now carry `height: 100dvh` right after
  their `height: 100vh` line (the first is the fallback for a browser that doesn't support it),
  `html`/`body` also cut rubber-banding with `overscroll-behavior: none`.
- Hint text knows the device too (`Game.isTouch()`): in the battle log, "WASD move · Left
  click attack" becomes "Left stick move · Right stick sword · 🛡️ block", in the tooltip
  "[Right click/Shift]" becomes "🛡 button".

#### Hint text learns the device too (#83)
In the first pass only two strings looked at the device; the rest of the UI still spoke
keyboard. Now it's a single gate again, `Game.isTouch()`:

| Where | Keyboard | Finger |
|---|---|---|
| Side menu | `<kbd>M</kbd>` badges | no badge (`body.touch .menu-btn kbd { display: none }`) |
| Map tooltip | `🌍 Diplomacy <kbd>K</kbd>`, `🎯 Find Me <kbd>Space</kbd>` | no badge, no "(K)" / "(Space)" suffix in the tooltip title either |
| Settings | `⌨️ Keys` → `Game.KEYS` (14 lines) | `🎮 Controls` → `Game.TOUCH_HELP` (12 lines: tap / hold / drag / two fingers / stick / ⚔️ / 🛡️ / 1-2-3) |

The class is `body.touch`, not a media query: `@media (max-width: 820px)` was missing the
tablet — a tablet is a wide screen but is dragged with a finger (#65's rule: `max-width`
decides layout, `pointer: coarse` decides input). `Game.init` sets the class once.

Measured: at 375×812 with `pointer: coarse`, `body.className = "lite touch"`, the menu
badges' `display` value is `none`, the settings button reads `🎮 Controls`, the table has
**12 rows**; at 1280×800 with a mouse, `isTouch() false`, `body.className` empty, badge
`display: block`, button `⌨️ Keys`, table **14 rows**. 24 new keys landed in both
dictionaries (1725 → 1749), `I18N.missing` is empty in tr/en/id alike.

**The acceptance run was carried out with a finger only** (375×812, `pointer: coarse`):
character-creation wizard → a bandit fight, **"⚔️ Perfect Victory!"** (all four directions
used with the virtual stick, 6–7 swings, 0 losses) → shopping at the market
(`🌾 Grain x1 bought · -3₺ · treasury 663₺`).

#### The iPhone 14 tour: full-screen battle, four tabs, "⋯ More" (#86)

#65 and #83 fixed the input path and the hint text; **layout** was still broken on a 390 px
screen. Every screen was walked with a finger at 390×664 (an iPhone 14's visible window with
toolbars shown), and nine flaws were measured and closed.

**1. In battle the whole screen belongs to the arena.** The campaign bar (123 px) and menu
strip (105 px) ate a third of the 664 px window; the remaining 345 px canvas had `drawHud`'s
top strip, the battle log, and the controls stacked on top of each other. `showScreen` now
toggles a `body.in-battle` class, and the CSS rule hides both **only inside** `pointer:
coarse` (desktop untouched). No one taps them on a screen that isn't being played anyway; Esc
/ Surrender leaving battle brings the strip back.

**2. Controls are measured from `:root` variables.** `--tui-stick` 116 → **92**, `--tui-btn`
74 → **60**, `--tui-lift` 72 → **66**. `.battle-logs`'s bottom position is no longer a fixed
pixel value, it's derived from the same three variables — when the controls shrink, the log
falls into place on its own.

**3. Label size follows the screen** (`Game.uiScale()` = `max(0.68, min(1, short side/620))`).
A fixed 19 px was right on a 1440 px canvas, a wall of text on a 370 px one. The second change
at the collision point: if `mapLabel` can't find a spot in 8 tries, it **doesn't draw the
label at all** (it used to draw it anyway). Which name gets dropped is read from the
tooltip — two overlapping names used to erase both.

**4. Four tabs + "⋯ More".** `#sidebar` with 8 buttons was `scrollWidth 530 / clientWidth
372`: Saves, Sound, and Settings were off-screen with no scroll indicator. On a narrow
screen those four are hidden with `.sb-extra`, an `.sb-more` button appears in their place,
and `Game.showMoreMenu()` lists the same `onclick`s as a modal — **no second code path
opens**. Since Quests sits behind "More", `showScreen` marks `.sb-more` active while that
screen is showing.

**5. The map tooltip was narrowed by font size, not text.** In the first attempt buttons were
reduced to icons (`⏳ Wait` → `⏳`); the player's first reaction was *"some buttons had no
text."* Rule: **text doesn't get stripped from a button.** Inside `@media (max-width: 430px)`,
`#map-hud` gets `font-size: 0.66rem`, buttons `0.6rem` — the tooltip goes **137 → 77 px**, all
four fit on one line, the touch target is still 44 px.

**6. Command buttons carry no keyboard digit.** `1 Follow / 2 Charge / 3 Hold` →
**`Follow / Charge / Hold`** (the dictionary keys changed too). On a finger, `drawHud` doesn't
write the command list to the canvas **a second time** (`hudW` 360 → 150), and the battle
start log doesn't get a `[1] Follow · [2] Charge · [3] Wait` line; the block hint also isn't
written every frame, only the moment of a block shows.

**7–9.** `#btn-wait` gets `pointer-events: auto` + the gold-button look (it was dead on every
platform); the touch-target rule got `min-width: 44px` (including `#tcmds button`, 34 → 44);
on a narrow phone, badges' `.hud-sub` subtitle drops (except the clock) → top bar **123 →
73 px**.

Measured (390×664, tr):

| | before | after |
|---|---|---|
| Battle canvas | 370×345 | **390×602** |
| Overlapping UI pairs (in battle) | 3 | **0** |
| Menu strip | `scrollWidth 530 / clientWidth 372` | **372 / 372**, 5 tabs (71–75 px) |
| `#map-hud` height | 137 px | **77 px** |
| Top bar | 123 px (3 lines) | **73 px** |
| Visible touch targets under 44 px | 6 | **0** |

Layout measured in battle (390×664): canvas 0–602, log 385–450, command strip 450–494,
sticks 506–598, ⚔️/🛡️ 538–598, Surrender 612–656 — **no pair overlaps**. At 390×844 (no
toolbars) the same row is 0–782 / 565–630 / 630–674 / 686–778 / 718–778 / 792–836.

**Badge tooltips open on tap** — #65's `pointerdown` hook was already correct, and it was
confirmed: all 10 badges (clock, denars, food, renown, health, party, bag, morale, level,
speed) get `tip-open`, become `visibility: visible`, and the tooltip box stays **fully
inside** the 390×664 window (`Game.clampTip`).

Screens scanned (390×664, every one with 0 targets under 44 px and 0 horizontal overflow):
start, character-creation wizard, map, character, party, inventory, quests, settlement (9
buttons, 342×52), market, tavern, the "⋯ More" page, battle. Desktop check (1280×800): all
8 tabs visible, `.sb-more` hidden, shortcut badges in place, tooltip buttons full-text —
**nothing changed**. `Debug.errors` is 0 and `I18N.missing` is 0 in tr/en/id alike.

#### Edge panning is for the mouse, zooming isn't for the page
Two separate things were broken on touch by the same cause: **there's no such thing as a
cursor.**

**1. Edge panning is mouse-only.** Resting the mouse at the screen's edge and having the map
pan is correct behavior; but while playing with a finger, `Input.mouse` stays at the
coordinates of the last **touch**, and if that point landed in the edge band (40 px) the map
kept scrolling on its own — in the player's words, *"unplayable."* A single gate was put at
the top of `update`'s edge block — `Game.edgePan()`; panning with a finger already happens via
the one-finger drag (#65), so no capability is lost.

The gate is **adjustable**: `Game.OPTS.edgePan` = `'auto' | true | false`, a **🖱️ Edge
panning** row in ⚙️ Settings (Device-dependent / On / Off), the same triple pattern as
`lite`. `'auto'` = `!isTouch()`. The device guess is a good default but not a verdict: edge
panning isn't loved by everyone on desktop either, and on a tablet (coarse pointer + a mouse
plugged in) someone might want it. The other two device knobs (`isTouch()` for the input
path, `max-width` media queries for layout) weren't touched — see the note below.

Measured (cursor 5 px inside the left edge, 10 frames of `update(0.016)`, `camera.offsetX`):

| | Device-dependent | On | Off |
|---|---|---|---|
| Mouse | **−120** | −120 | **0** |
| Touch | **0** | −120 | 0 |

**2. Pinch-zooming the whole page is disabled.** Pinch-zooming the whole UI with two fingers
breaks the panel (sizes are computed against the screen) and there was no way back. Two
gates were needed, since neither alone is enough:

| Browser | Gate |
|---|---|
| Chrome / Android | `style.css`: `html, body { touch-action: pan-x pan-y; }` — cuts both pinch **and** double-tap zoom |
| iOS Safari | `Game.init`: `gesturestart` / `gesturechange` / `gestureend` → `preventDefault` (`{ passive: false }`) — Safari ignores `user-scalable=no` |

**3. There is no single "desktop mode / mobile mode" switch — and there shouldn't be.** Three
separate questions tie to three separate knobs, because their answers diverge even on the
same device (a tablet: coarse pointer + a wide screen + a good GPU):

| Question | Knob | Where |
|---|---|---|
| How is it entered? | `Game.isTouch()` = `pointer: coarse` | `app.js` (`body.touch`, hint text, `#touch-ui`) |
| How does it lay out? | `@media (max-width: 820px / 430px)` | `style.css` |
| How much is drawn? | `Game.lite()` (`'auto'` = `isTouch()`) | ⚙️ Settings → 📱 Lite mode |
| Does it edge-pan? | `Game.edgePan()` (`'auto'` = `!isTouch()`) | ⚙️ Settings → 🖱️ Edge panning |

Tying all three to one mode gives the wrong answer; a separate mobile codebase doubles every
change. What was missing was **override**, and it's solved per knob: graphics (`lite`) and
edge panning (`edgePan`) are now in the player's hands. There's still no switch that forces
layout; if one's ever needed, the cost is adding a class to the selector list of
`style.css`'s media queries (rule bodies aren't duplicated).

The map's **own** two-finger zoom still works: the three canvases already carry
`touch-action: none` (the item above), so the game claims the pinch over the canvas, the
browser doesn't claim the page's.

#### A bandit gang doesn't spawn in the player's lap (`SPAWN_SAFE`)
The player starts at 4500,4500, while `createNPC` picked its radius with `Math.random() *
3800`, i.e. starting from **0**: a bandit gang could appear right on top of them on the
first frame and they'd be caught and taken captive before ever seeing the map. `Game.
SPAWN_SAFE` = **1500**; `createNPC` tries up to 40 times to find a point outside that radius
(accepting the last candidate if it can't — a flawed birth instead of a lockup). **One gate
here**: `spawnNPCs`, `spawnBand`, `spawnTrader`, and the daily refresh all go through
`createNPC`, so four separate patches weren't needed.

Measured: at game start the nearest bandit is **1550** units away; when 400 new gangs are
spawned, **the nearest is 1503**, average 2647; the six nearest NPCs at start are all a lord
or a caravan (1267–1315 units) and **none are hostile**. `Debug.errors 0`.

#### Tutorial — the UI is explained once, on the first playthrough (#87)

Once character creation finished, the player dropped onto the map and nobody told them
anything. `Game.startTutorial()` is called at the end of `enterWorld()` (with a 400 ms delay
so the UI settles) — **not on loading a save**: `enterWorld`'s only caller is
`finishCreation`, `Save.load` never goes through it, so it never fires on a returning player.
The second gate is `localStorage` (`webband_tutor_done`); Skip or the Start marker on the
last step sets it.

The steps are data (`Game.TUTOR`, 6 records): `{ el, t, m, d }` — `el` is the CSS selector
the light ring wraps, `t` the title, `m` the mouse text, `d` the finger text. Which one gets
read is decided by `Game.isTouch()` (#83's rule, not a media query). **Raw stays, `T` is
called at display** — writing `T` into the top-level table would freeze the translation.

| Step | Target | What it explains |
|---|---|---|
| 1 | `#map-canvas` | Click/tap where you want to go; WASD and scroll wheel / drag and two fingers |
| 2 | `#chip-food` | Your army eats every day, the badge says how many days it'll last, a starving soldier deserts |
| 3 | `#chip-party` | Capacity is set by Leadership + Stewardship + renown; volunteers from a village, mercenaries from a tavern |
| 4 | `#map-hud` | Terrain changes speed, ⏳ Wait makes camp |
| 5 | `#sidebar` | The screens; keyboard shortcuts on a mouse (M C P I Q), behind "⋯ More" on a finger |
| 6 | — (centered) | Your first job: go to the nearest village, recruit volunteers, buy supplies, hunt bandits |

**The light ring wants no separate curtain element**: `#coach-ring` carries `box-shadow: 0 0
0 9999px rgba(4,5,9,0.66)` — the same shadow both frames the target and darkens the rest of
the screen. Since it has `pointer-events: none`, the UI underneath stays clickable. The box
(`#coach-box`) sits below the ring, moves above if it doesn't fit, and is clipped inside the
screen on both axes (`Game.placeCoach`; the same trouble as `clampTip`, except the target can
also be at the screen's center). If the target is missing or hidden (`!el.offsetParent`) the
**step is skipped** — drawing an empty ring in a corner isn't a tutorial, it looks like a bug.

*(`#chip-party` was added this round: the party badge had no id, only the `#ui-party` inside
it did — the ring would've been drawn around the number.)*

Measured (390x664, `pointer: coarse`): **all 6** steps land inside the screen (1
`30,459–360,656` · 2 `52,49–382,247` · 3 `8,80–338,258` · 4 `25,281–355,478` ·
5 `30,402–360,580` · 6 `30,233–360,431`), Skip/Next buttons are **44 px** (WCAG 2.5.5),
`Debug.errors 0`. On a 1280x800 mouse, the same six steps, text switches to "click. Explore
the map with WASD", `isTouch() false`, the box stays inside 800 px at every step. Skip sets
the marker (`webband_tutor_done = '1'`), a second `startTutorial()` call **never opens**,
⚙️ Settings → 🎓 Tutorial forces it open. 20 new keys landed in both dictionaries
(1765 → 1785); `I18N.missing` is empty in tr/en/id alike and the 6 steps read in their own
language (en: *Step 1/6 · Skip/Next*, id: *Langkah 1/6 · Lewati/Berikutnya*).

#### Battle tutorial and opening settings (#88)

**The battle tutorial is the same machine, a different list.** `startTutorial(force, list,
key)` takes three arguments; the map tutorial uses the defaults (`Game.TUTOR` / `TUTOR_KEY`),
the battle tutorial passes `Game.BATTLE_TUTOR` (6 steps) and `BTUTOR_KEY`. The caller is a
500 ms `setTimeout` at the end of `Battle.start` — after the arena is set up and the first
frame is drawn. Since auto-resolve (`if(auto) return this.autoResolve()`) returns **before**
the loop, it never fires there.

| Step | Target | What it explains |
|---|---|---|
| 1 | `#battle-canvas` | Aim is the cursor (on a finger: right stick + yellow arc), left click swings, right click/Shift blocks |
| 2 | `#tstick` | Left stick — movement *(skipped on desktop)* |
| 3 | `#tastick` | Right stick — the sword's direction *(skipped on desktop)* |
| 4 | — (centered) | Command opportunities are born inside the battle |
| 5 | `#btn-surrender` | Surrender is always open; if you die you're knocked out, the battle doesn't end |
| 6 | — (centered) | Against armor: spear/arrow/mace, blocking only protects from the front |

**Device distinction comes for free**: `tutorStep` already skipped a step whose target was
missing or hidden (`!el.offsetParent`), and `#touch-ui`'s children are also `display: none`
on desktop — so steps 2 and 3 fall away on a mouse on their own, 6 steps become 4. No device
branching was written.

**Battle stops while the tutorial is open.** `Battle.paused` only skips `update`, `render`
keeps running — nobody should get killed while there's something to read on screen, but the
arena shouldn't disappear either. `startTutorial` sets the flag if `Battle.active`,
`endTutorial()` clears it; between steps `endTutorial(true)` **doesn't clear it** (the box
changes, battle stays paused). Since `dt` is already clamped to 0.05 and `last = t` is written
every frame, resuming doesn't cause a jump.

**Opening settings** live in the character-creation wizard's last step (`renderDiffStep`):
difficulty and 📱 Lite mode. Both go through the `Game.setOpt` gate, so they share one code
path with the rows in ⚙️ Settings; picking one doesn't close the step (the `pickDiff` step
redraws), what advances it is the **Next** button (`diffStepDone`). Language doesn't enter
this step — the `#lang-ask` curtain on first launch already asks.

#### Small-text sizes from one place: `--fs-xs/sm/md` (#73)

The UI's small text was scattered across 158 separate inline `font-size:` values (`0.68` –
`0.92rem`), so "make the text bigger" meant editing 158 lines. Three variables now live in
one place in `:root`:

| Variable | Replaces | Value | at a 16 px root |
|---|---|---|---|
| `--fs-xs` | 0.68 / 0.7 / 0.72 / 0.75rem | **0.82rem** | 13.1 px |
| `--fs-sm` | 0.78 / 0.8 / 0.82 / 0.85 / 0.86rem | **0.92rem** | 14.7 px |
| `--fs-md` | 0.9 / 0.92rem | **1rem** | 16 px |

Changed: `app.js` 119, `nobles.js` 27, `quests.js` 5, `battle.js` 2 (= **153** inline values)
+ body text in `style.css` that needs to be readable (the four side panels, the battle log,
the tutorial box, the version stamp, the language button). **The HUD chrome wasn't
touched** — the campaign-bar badges, side menu, and map tooltip were hand-tuned for 390 px
in #86.

*Dictionaries go through the same pass too.* Three `T()` keys carry inline HTML with a
`font-size` (e.g. `<span style="…font-size:var(--fs-xs)">a companion can't stay</span>`);
since the key is the source text itself, if `lang-en.js`/`lang-id.js` don't go through the
same `sed`, `tools/test.js`'s *"every T key in the code is in both dictionaries"* assertion
turns red (it did, it was measured). This assertion is the regression test for this class of
bug.

The **font size** setting (#55 item 7) multiplies the root size by 0.9/1/1.15; since it's
`rem`-based, the two gates work together (at the large scale `--fs-sm` = 16.9 px).

Measured (1280×800 / 390×664, `Debug.errors 0`, no horizontal overflow):

| | before | after |
|---|---|---|
| Character creation, option description | 12.8 px | **14.7 px** |
| Version stamp | 11.5 px | **13.1 px** |
| Start-screen subtitle (390 px) | 16.8 px | **20 px** |
| Start-screen corner buttons (390 px) | 12 px | **14.7 px** (44 px tall) |
| Language buttons (390 px) | 10.6 px | **12.8 px** |
| Desktop: h1 / subtitle / label | — | 136 / 24 / 17.6 px |

**The smallest text on screen is now the side menu's 9.6 px shortcut badge** (`kbd`) and a
9.9 px section header — both are chrome, not text.

#### A point of interest's name wasn't translated on the map (during the #73 pass)
`SITE_KINDS` is a top-level table: the `T('Cave')` inside it runs while the script loads,
i.e. before `I18N.load()`, and returns identity (CLAUDE.md's "raw stays, translate at
display" rule). The table already kept raw Turkish; what was missing was the **display**
side: `renderMap`'s `mapLabel(ctx, k.name, …)` call and the map tooltip's `… + site.name`
title didn't go through `T()`. Both were wrapped in `T()`, and the table's dead `T()`
wrappers (`SITE_KINDS`, `ROAD_KINDS`) were stripped. Measured (EN): map labels read
`Ruins / Abandoned Farm / Watchtower / Cave / Abandoned Camp`, tooltip `🏚️ Ruins`, no
Turkish leftover in any label drawn on the map.

#### A settlement's name also wasn't translated on the map (same class, second round)

**The exact same bug** as the points of interest, this time in `LOCATIONS`: the dictionary
already had all six castles' translation ready (`"Tevarin Kalesi": "Tevarin Castle"`), the
data table was correctly raw Turkish, but three **display** sites never went through `T` at
all — `renderMap`'s label drawing, the map tooltip's title (`handleMapHover`), and the
settlement screen's title (`enterLocation`). The remaining ~30 call sites (market, tavern,
arena, siege, raid, fief, news feed) already called `T(loc.name)`; so the bug wasn't the
table's, it was three lines'.

The lesson again: **if a data field stays raw Turkish, EVERY path that draws it on screen
must go through `T`.** The scan method was the same too — searching for the `\$\{…\.name\}`
pattern in lines that don't contain `T(` found all three spots in one pass.

Measured (EN and ID, tooltip + screen title + button list for every one of 25 settlements,
14 points of interest, every party on the map, and the diplomacy screen scanned): **0**
Turkish leftovers, `I18N.missing` carries only the version name (a documented false
positive), `Debug.errors 0`. The castle title reads **"Tevarin Castle (Castle)"** in EN,
**"Kastil Tevarin (Benteng)"** in ID.

#### Difficulty — one pair of multipliers (Easy/Medium/Hard)

The answer to "the wolves are too strong" isn't a new balance table, it's **one knob**.
`Game.DIFFS` holds a `{taken, dealt}` pair per tier; nothing else moves — bow range, charge
multiplier, armor math, troop trees, and the economy stay exactly as they are.

| Tier | `taken` | `dealt` |
|---|---|---|
| 🙂 Easy | ×0.6 | ×1.25 |
| ⚖️ Medium | ×1 | ×1 |
| 💀 Hard | ×1.5 | ×0.85 |

**The single choke point is `Battle.afterArmor(dmgType, raw, def, tgt)`**: melee
(`dealMelee`) and arrow hits already both went through it, so adding a fourth argument
(`tgt`) covered the whole battle. `Game.dmgMult(tgt)` looks at the target's side — "taken" if
`tgt.isPlayerTeam`, otherwise "dealt". A wolf pack and a lord's army both go through the same
gate, siege and arena included. The second and last hookup point is `Battle.autoResolve`: in
a won auto-resolve, the loss rate is scaled by `taken`.

The setting is `Game.OPTS.difficulty` (default `'normal'`), so only the deviation is written
to `state.settings` and it enters the save with `state`. The panel row sits in ⚙️ Settings as
`⚔️ Difficulty`, with the chosen tier's description written below it.
`DIFFS` **stays raw, is translated at display** with `T(this.DIFFS[v].name)`; since it's
dynamic, 7 keys (`⚔️ Difficulty`, three tier names, three descriptions) were added to both
dictionaries **by hand**; `tools/test.js`'s i18n assertion is the regression test for this.

Measured (30 raw `cut` hits, defense 10 — and 20 raw `pierce` arrows, defense 8):

| | taken (cut) | dealt (cut) | taken arrow (pierce) |
|---|---|---|---|
| Easy | **12** | **25** | 8 |
| Medium | 20 | 20 | 14 |
| Hard | **30** | **17** | 21 |

`state.settings.difficulty` is written to the save right after the choice, `Debug.errors 0`.

**Difficulty is asked when entering the game.** The choice needed to be made before anyone
opens the settings menu; the character-creation wizard is therefore 7 steps, not 6
(`renderDiffStep`, after the banner, before the summary). There's no separate table — it
reads from the same `Game.DIFFS` and writes through the same `Game.setOpt('difficulty', k)`
gate, so it shares one code path with the row in ⚙️ Settings. It shows up as an
`⚔️ Difficulty Hard` line in the summary screen.
Measured: the step title reads `Step 7/7`, MEDIUM comes pre-selected, after picking
`Game.opt('difficulty')` = `'hard'` and `Game.diff().name` = `Zor`, `Debug.errors 0`.

**The knob's in-game effect was measured** (`tools/harness.js`, the real `Battle.update(1/60)`
is stepped frame by frame; 24 rounds per cell, seed 100+i, `Battle.endBattle` stubbed out,
player at 100 health and **an effective bot**: walks to the nearest enemy, aims, swings once
the wind-up timer fills):

| Scenario | Measure | Easy | Medium | Hard |
|---|---|---|---|---|
| 10× lvl10 Militia vs 12 Bandits | victory | **79%** | 13% | **0%** |
| | player's health lost | 32.6 | 92.5 | 100 |
| | troops lost | 3.7 | 9.1 | 10 |
| 20× lvl10 Militia vs 20 Bandits | victory | **79%** | 13% | **0%** |
| | troops lost | 7.8 | 18.5 | 20 |
| Player alone vs 3 Wolves | survival time | **13.3 s** | 8.6 s | **6.7 s** |

So the tier is monotonic and its effect matches the table one-to-one (survival on Easy ≈
1/0.6 ≈ **×1.55**). **Easy alone doesn't save a lone player from 3 wolves** — it only buys
~55% more time; the absolute victory rates look harsh because the scripted bot neither
blocks nor retreats. The real player's two extra tools (a shield and running away) aren't in
this measurement.

### The language layer — Turkish, English, Indonesian

The game is played in three languages. One rule: **the key is the Turkish source text
itself** (`T('New Game')`). If the dictionary has no match, Turkish falls onto the screen —
so a missing translation isn't an empty box or `missing.key`, it's a readable sentence; in
Turkish mode `T` is the identity function and no lookup happens at all.

Two call forms, one dictionary:

| Form | Key |
|---|---|
| `T('In your purse')` | `In your purse` |
| `` T`${n} troops joined` `` | `{0} troops joined` |

In the tagged form, interpolated values are numbered, and a translation can use them in
**whatever order** it likes (`{0}`/`{1}`) — sentence order differs by language. Since a
template spanning multiple lines would mix a line break and indentation into the key, lookup
goes through `I18N.norm(key)` (`/\s*\n\s*/g` → a single space); the dictionary generator
applies the same transform.

**Dictionaries are generated, not hand-written.** `lang-en.js` / `lang-id.js` are flat tables
of 1785 keys (161 / 164 KB); their source is a hand-written Turkish→(EN, ID) dictionary kept
outside the repo. Measured: `keys 1728, translated 1721, missing 0, placeholder mismatch 0`.

#### Static text: the `prime()` / `applyDom()` split
Static text in `index.html` gets its key stamped onto the node **once**, before the page has
drawn anything (`I18N.prime()`, `n._trKey`); `applyDom` only touches a node that has a key.
The split is necessary: a single-pass walk that captures every panel built with `innerHTML`
(badge tooltips, screens, modal) **already translated**, records the English sentence as the
key, and once TR→EN→ID is walked that node stays stuck in English. Measured: 40 nodes get
stamped, `prime` **0.8 ms**, switching language (`set` + `applyDom`) **0.5–1.3 ms**.

#### Raw stays, translate at display
Writing `T(...)` **inside a top-level data table** freezes the translation: that line runs
while the script loads, while `I18N.load()` is called from `Game.init()` (i.e. from
`window.onload`) — the table is set up while the language is still `'tr'`. The rule is
therefore singular: **the table stays raw Turkish, `T` is called at the display site.**
`CHATTER`, `KEYS`, `WAIT_CHOICES`, `Battle.cmdSlots`, `COMPLIMENTS`/`POEMS` all work this way.

The same rule keeps **name-based comparisons** like `getTerrainInfo().name === 'Orman'` or
`BAND_KINDS[k].name === enemyName` working: since these fields stay raw, the comparison is
language-independent. This is what to check when translating a new data field.

Percentage formatting differs by language (`%50` / `50%`): one gate, `Game.pct(n, signed)`.

#### Three classes of bug and how they're each caught
| Class | Symptom | Caught by |
|---|---|---|
| **Missing translation** | A data field lands on screen without going through `T` | `I18N.missing` (key isn't in the dictionary) |
| **Double translation** | An already-translated value goes through `T` a second time | `I18N.missing` (the English sentence gets recorded as a key) |
| **Never translated at all** | Turkish text is embedded inside a template, never touches `T` | **No counter sees it** — the only evidence is the Turkish word left on screen |

The third is the dangerous one and shows up two ways: (i) a stray literal inside the template
(`'none'`, `<b>time</b>.`), (ii) an **early-closed `` T`...` `` template** — the rest of the
sentence falls outside the template. Catching it: `showModal` / `setHtml` / `locTipHtml` /
`npcTipHtml` / `alert` / `Battle.log` / `Game.news` are temporarily wrapped, the game is
walked end to end in EN/ID mode, and the **rendered HTML** is scanned against Turkish
leftovers. The first scan turned up 99 EN / 114 ID leftovers, narrowing to 8 distinct spots
(siege, raid, and arena modals were early-closed templates).

*The Turkish stop-word list doesn't work for Indonesian* — `para`, `dinar`, `sana`, `bir`
exist in both languages (48 false positives). For ID the reliable signal is the
`[ğşıİĞŞ]` diacritic class plus a Turkish-only word list.

#### Language selection
On first launch a flag-bearing curtain appears (`#lang-ask`): 🇹🇷 Türkçe · 🇬🇧 English ·
🇮🇩 Bahasa Indonesia, the browser's language (`I18N.guess()`) comes pre-checked. The choice
is written to `localStorage.webband_lang` and isn't asked again. Afterward, both the start
screen's flag order and the row in ⚙️ Settings go through the same `Game.setLang()` gate; a
screen that's open while playing rebuilds its own text — so **restarting the game isn't
needed**.

#### Measured
A walk covering the whole game (character creation → 5 screens → 8 modals →
town/village/castle → market/tavern/hall/arena/guild → dialogue/courtship/compliment/poem →
quest offer → 14 daily events → a pitched battle, a siege, and a raid) was run in all three
languages:

| | errors | `I18N.missing` | Turkish leftover on screen |
|---|---|---|---|
| `tr` | 0 | 0 | — |
| `en` | 0 | **0** | 0 (4 false positives: `I've`, `you've`, the version name, the language list itself) |
| `id` | 0 | **0** | 0 (1 false positive: the version name) |

A direct load was also checked separately: with `localStorage.webband_lang = 'en'` (and
`'id'`), the page opened **without ever switching language** and the same walk ran —
`missing 0`, so top-level data tables don't fall into double translation.

**Known limit:** `state.warLog` news entries are stored **already translated at the moment
they're written**. Changing language mid-game leaves old lines on the diplomacy screen in
their old language; new news arrives in the new language. Storing news raw and translating
at display would be the right fix, but news text is a sentence built at runtime (lord name +
settlement name) — that needs a separate structured news format; for now it's an accepted gap.

### Balance visibility (#55 item 9)
What got fixed isn't the numbers themselves, it's whether the player **sees** them.

| What | Rule | Measured |
|---|---|---|
| **Peak renown** | Every renown gate reads `Game.peakRenown()` (lady 80, feast 150, marriage 120, dowry quest 200, allegiance 50). `p.maxRenown` self-updates | Renown climbs to 350 then drops to 40, gates still see 350 — a single defeat doesn't close every gate |
| **Easy-prey warning** | `Game.preyWarning(npc)` in the encounter modal and the map tooltip; calls `Battle.rewardScale` with enemy strength **before** the battle | With a 6-person party: a 1–3-person gang shows 20%, a 5-person one 25%, a 10-person one 50%, no warning at 20+ |
| **Fief net** | `openGarrison`'s title shows `tax − wage = net`, "this fief is losing money" if negative | Praven (prosperity 83, tax 165): 12 knights **−15/day**, 12 peasants **+165/day** |
| **Starving-troop marker** | On a row carrying a `debuff` in the party screen: "🍖 Couldn't find meat/cheese — health and attack ×0.7 in battle" | The line shows |
| **Boss gate** | Using `boss_map` asks for `Game.BOSS_RENOWN = 300` peak renown; also written in the inventory tooltip | At renown 10 the map wasn't spent, the warning showed |
| **Caravan load tied to guard count** | In `spawnTrader`, `w = size / the kind's average`; cargo and purse scale with `w`. The average is unchanged, **the distribution ties to risk** | Caravan: 6 guards avg **949**, 14 guards **2135** (avg. 1544). Convoy: 3 guards **221**, 7 guards **513** (avg. 374). Used to be that picking the weakest one was risk-free profit |

### Time is a resource: camp (#53 item 1.1)

Time used to flow only **while walking**: a wounded player circled the map to heal, unable to
wait out a tournament opening / a volunteer refreshing / a feast being set up.
`Game.startWait(hours)` opens this with a single primitive — Warband's "Make camp → Wait
here."

- The **⏳ Wait** button on the map tooltip (`askWait`) asks for a duration: 1 hour / 8 hours /
  1 day / 3 days / **wait for dawn** (`hoursUntilDawn`).
- `state.player.wait = { until }` (an absolute hour) + `status = 'waiting'`. It enters
  `update`'s `timeFlows` list, `advanceTime`'s multiplier becomes `timeScale × WAIT_SCALE`
  (**×4**).
- A `#wait-ui` panel bottom-right: time left, health, morale, 🚶 *Break Camp*.
- **Interruption goes through one gate**: `triggerEncounter`'s first line calls `stopWait()`.
  So an NPC collision and a forest ambush (`checkAmbush` → `triggerEncounter`) alike break
  camp; no separate patch is needed per encounter path.
- Resting at a tavern isn't free anymore either: `restAtTavern` now costs **8 hours** on top
  of the 10 denars.

Measured (an NPC-free map, `dt = 0.05`): `startWait(24)` took **24.2 game hours / 6.05 real
seconds** — the same 24 hours took 24 real seconds walking, i.e. exactly **×4**. With
Endurance 10, health regenerates every 8 hours, so **+3 health** came in over 24 hours. A
bandit gang 200 units away hit the camp after **10.8 hours**: `wait` went null, the encounter
modal opened.

### Honor — the second reputation axis (#53 item 1.5)

Renown measures "how known you are"; honor (`state.player.honor`, **−100..100**) measures
"how you're known." One axis: the old bandit-stain label is that axis's negative side.

| Action (`Game.HONOR`) | Honor |
|---|---|
| Raiding a village (`raid`) | **−12** |
| Robbing a caravan in peacetime (`robPeace`) | −5 |
| Robbing a peasant convoy (`robPeasant`) | −8 |
| Ransoming a noble captive (`ransom`) | −2 |
| Releasing a noble with honor (`release`) | **+5** |
| Abducting a lady (`abduct`) | **−20** |
| Breaking a campaign oath (`oathBroken`) | −5 |
| Finishing a quest (`questDone`) | +2 |
| Lending a hand on the road (`roadKind`) | +2 |
| Running over the weak on the road (`roadCruel`) | −2 |
| Not chasing down a routed foe (`spare`) | **+3** |

Tier (`honorTier` / `honorLabel`): ≥40 ⚜️ Honorable, ≥15 🕊️ True to Their Word, ≤−10 🔥
Raider, ≤−36 💀 Village Burner. Decays **0.5** toward zero per day (both directions).

| Effect | Rule |
|---|---|
| Volunteers and their wage | `infamyPenalty()` = `−honor/100`, **−0.3 .. +0.6** — positive honor also brings the villager |
| Mercenary | `mercPrice` scales by the same multiplier |
| Weight with nobles | `Nobles.standing` now reads **personality**, not tier: `Game.honorWeight(personality)` — good-natured `honor/40`, cunning `−honor/60`, debauched `−honor/90`, others `honor/55` (clamped to ±2) |
| Feast | `Feast.HONOR_REQ = −30`: renown opens the gate, honor holds it there |
| Village elder | at tier 2, "get out quick" even in a friendly village (already existed in #50, now reads from honor) |

Measured: one raid −12 (🔥 Raider), **five raids −60** (💀 Village Burner, a 60% penalty);
volunteers/wage 8 people–10₺ → **3 people–16₺**, a lvl 12 mercenary 204 → **326 denars**;
honor +30/+60 give **10 people–7₺** and **143 denars**. −60 honor decayed to zero in **119
days**. That same −60 honor moves `standing` **−1** with a good-natured lord, **+1** with a
cunning or debauched one — a dishonorable man's word carries further in a cunning lord's hall.

### Blood feud — the world remembers you (#53 item 1.3)

`state.grudges[lordId] = the day it started`; `GRUDGE_DAYS = 30`. The lord whose village you
burned (`grantRaidLoot`), the nearest lord in the region whose caravan you robbed
(`robTrader` → `addGrudgeNearest`), and the noble you ransomed (`ransomLord`) all open a
blood feud on you. Releasing one with honor (`releaseLord`) **clears** it.

- `isHostile(npc)`'s first line: a lord with a blood feud **attacks** regardless of
  war/relation state.
- In `updateNPCs`, a lord with a blood feud has a **50%** chance of heading not home but
  **straight at you** when picking a new target; since `npc.hunting = the player's name`,
  the map tooltip shows "🎯 Hunting: …". Once the feud ends, `hunting` is cleared.
- Expired feuds are dropped from `state.grudges` in `dailyUpdate`; the diplomacy screen
  (**K**)'s "🩸 Blood Feuds" heading shows how many days are left.

Measured (a feud opened on one lord, 30-day sim, sampled hourly): the lord's party stayed
within 1200 units for **674 of 720 hours**, distance dropped to **0** (an encounter in the
real loop), `hunting` was set for 693 hours; the feud was cleared on **day 31**.

### Wealth-scaled threat (#53 item 1.3)

`Game.threatLevel()` = `round(√(sum of troop levels + player level) / 2)`. In `battle.js`,
enemy level no longer looks only at the calendar: bandits `max(1 + day/30, threat − 1)`, a
faction army `max(5 + day/15, threat + 3)`. The cheapest version of Rimworld's "raid points =
colony wealth" rule.

Measured: a lone wandering player **1**, 10 recruits **2**, 20×lvl10 **7**, 40×lvl20 **14**,
60×lvl30 **21**. On day 20, a 20×lvl10 army against 20 bandits in auto-resolve lost on
average **0.6 → 1.7 troops** (15/15 victories) — it doesn't crush a weak player, and it
doesn't bury a strong one in bandit-hunting.

### The goal chain — `AMBITIONS` (#53 item 1.4)

Battle Brothers' "ambition": a **single** active goal at a time, completing it gives a reward
and opens new goals. It's all data (`Game.AMBITIONS`), conditions read `state` — no event
listening, a daily `ambitionTick()` and the Quests tab both call the same `check`.

| Goal | Condition | Reward | Opens |
|---|---|---|---|
| A small company | party ≥ 10 | +5 renown | Tournament champion, A lord's friend |
| Tournament champion | `tourneyWins > 0` | +10 renown, +500 denars | A landholder |
| A lord's friend | any relation ≥ 30 | +5 renown | Sworn |
| Sworn | an oath of allegiance | +15 renown | Blood price, A landholder |
| Blood price | every blood feud you opened has closed | +10 renown, +5 honor | — |
| A landholder | fief ≥ 1 | +20 renown | — |

Sits at the top of the **Quests** tab (Q): the chosen goal + give up, or the list of open
goals. Measured: the chain walks start to finish — closing 4 goals gives **+35 renown**, the
open-goal list changes on every completion (`band` → `champion`/`friend` → `sworn` →
`feud`/`fief`).

### Enterprise and the fief treasury (#53 item 1.6 / 1.2)

**Enterprise** (`Game.buyEnterprise`, 🏭 in the town screen): **3000 denars**, `prosperity ×
0.55` per day. It enters the daily flow as `fiefIncome()`'s `trade` line and shows up as a row
in the treasury tooltip. If you're at war with the town the gate is closed, **earnings
stop** (`enterpriseWorks`); the property isn't lost. Saved as `loc.enterprise`.
Measured: Tulga at prosperity 87 gives **+52 denars/day, paid off in 58 days**; Narra at
prosperity 51 gives **+28/day, 108 days**. So enterprise becomes a "which city" question.

**Treasury** (`loc.treasury`, in the 📦 Storage screen): you deposit money into your fief,
it isn't looted on defeat. Loss on defeat/surrender is now a decision, not a die roll:
`Game.defeatLootRatio()` = `0.6 + 0.3 × (1 − share in the treasury)`, and it only touches
the **purse on hand**. Measured (10,000 denars total): all of it on hand gives a ratio of
0.90, leaving **1,000**; 90% in the treasury gives a ratio of 0.63, leaving **9,370**. The
storage becomes real insurance this way.

### Rumours — information has a price (#71)

The tavern is the one place information costs something. **👂 Söylenti Dinle**: **20 denars**
and **2-4 hours** of game time (`Game.listenRumor`, `RUMOR_COST` / `RUMOR_HOURS`). Skill buys
two things and only two: **which stories reach you at all** and **how often they are wrong**.

| Spotting | Tier | Lie chance | What you hear |
|---|---|---|---|
| 1-3 | 1 | 45% → 35% | a direction and nothing more ("a band to the north", "an army came through") |
| 4-6 | 2 | 30% → 20% | who is where — a siege, a marshal's campaign, a lord's party and its size |
| 7+ | 3 | 15% → 5% | numbers and dates — the best trade margin, a tournament/feast, a lair's purse |

`rumorTier()` = 3 at Spotting ≥ 7, 2 at ≥ 4, else 1. `rumorLieChance()` =
`max(0.05, 0.45 − (lvl−1) × 0.05)`. Generators below your tier stay in the bag, and each is
weighted by its own tier — a trained ear doesn't just unlock the good stories, it hears them
more often. Every draw grants 25 Spotting XP, so the skill trains itself by being used.

**A false rumour is never an invented story** — it's a true story pinned to the wrong place.
Each generator takes an `L` function and passes its subject through it before naming or
marking it: the facts come from the real subject, the *place* comes from `L(subject)`, which
is the subject itself when truthful and a random `LOCATIONS` entry when lying. One knob, no
duplicated prose, and the lie costs you a three-day ride to a village nobody touched.

Tier 2 and 3 stories drop a `state.knownLocations['rumor']` marker (3 days, the standard
lifetime); tier 1 never does — a direction is not a map pin. The lair story sets `l.seen` on
a **true** rumour, so paying for the right story genuinely puts a lair on the map.

**The guild ledger** (`guildPrices`, 📈 in the town) used to hand over the whole trade map
free and instantly. It now costs **50 denars** (`GUILD_FEE`), charged **once per town per
day** (`state.guildPaid[locId]`) so paging back out of the table and in again is free.

Measured (seed 3, 20 draws per level): Spotting **1** → tier 1, 45% lies, **0/20** markers,
3.3 h/draw, story mix 400/0/0 · **4** → tier 2, 30%, 18/20, 2.9 h, 71/329/0 · **7** → tier 3,
15%, 15/20, 2.9 h, 27/146/227 · **12** → tier 3, 5%, 17/20, 3.0 h, 31/148/221. Those 20 draws
alone carry Spotting from 1 to 3. Guild fee: 50 denars charged on the first look, the second
look the same day free.

### Renown gates above 300 (#69, #53 item 1.4)

`AMBITIONS` ended at "a landholder" and the game flattened into collecting the tax. Three
gates open the late game's own ladder (`Game.RENOWN_GATES`), and the renown badge tooltip
lists all five now (80 / 150 / 300 / 500 / 800). Gates read `peakRenown()`, so losing renown
never takes a right back.

**300 — hükmetme hakkı.** While **independent** (no `vassalOf`), stand in a village square
with enough men and name a price: no siege, no sword. Needs the party to outweigh **80% of
the militia** (`villageMilitia` = `max(4, prosperity/5)`). Costs the owner **−20 relation**,
its kingdom's lords **−4**, the village **−5 prosperity**; pays **40% of `fiefTax`** daily
(`TRIBUTE_CUT`) and **+3 right to rule**. War with the village's kingdom **zeroes** the
payment the way an enterprise's gate closing stops its earnings; a new conqueror honours no
old tribute (`captureSettlement` clears `tributeTo`). Shows up as `fiefIncome().levy`, its own
treasury-tooltip row, and a `+N köy haracı` tail on the fief screen.

**500 — yoldaş elçiliği.** Send a **companion** to a lord to negotiate relation or a truce
(`envoyMenu` / `sendEnvoy` / `envoyTick`, `state.envoy`). The companion is **spliced out of
the party for 3-6 days** — their skill leaves with them, which is the real cost. Chance =
`0.25 + level × 0.02 + (Persuasion−1) × 0.03 + relation × 0.004`, clamped to 10-90%. Success
gives +12..20 relation, or a truce via `makePeace`; failure −3 (−5 on a refused truce). One
envoy at a time.

**800 — mareşal adaylığı.** As a vassal, ask your king for the banner (`askMarshal`, needs
relation ≥ 20 and the kingdom **at war**). `state.marshalOf` then makes the player the
marshal in `campaignTick`: no lord is picked, and instead of being summoned to arms **you**
choose the target (`chooseCampaignTarget` → `setCampaignTarget`). No new movement code —
`updateNPCs` already walks lords toward `state.campaigns[f].targetLocId`. The post lasts
**exactly one campaign**; `endCampaign` clears `marshalOf` (+10 renown, +5 right to rule if
the target fell) and it has to be asked for again.

Measured — **does the marshal's target actually pull lords?** 8 seeds, target picked
*farthest from the lords* on purpose: **24/27 lords reached it within 20 days**, average
distance to target **3788 → 2292**, arrival on a **median day 4** (range 1-11). Picking the
target nearest the player instead: 15/27, 2629 → 2190, median day 3 (range 1-14). So the pen
is real — pointing at the far side of the map still moves the army.

Tribute per day (seed 3): Azgad (prosperity 56) **22** · Emirin (90) **36** · Pagundur (67)
**27** · Yruma (65) **26** · Uslum (31) **12**; militia to outweigh 9/11 · 15/18 · 11/13 ·
11/13 · 5/6.

**Not measured**: the issue also asks which day each gate typically opens. `tools/sim.js` runs
a **playerless** world — it has no renown curve to read — so that number would be invented,
not measured. It needs a player-driving sim first.

## Visual layer (renovation)

All drawing lives inside `app.js` + `battle.js`, no library. Shared approach: **bake the
expensive thing once, then stamp the picture every frame.**

- `Game.buildGroundTexture()` — a 256px **seamless** grass tile (every blade/patch drawn at 9
  wrapped positions), put into `Game.groundPattern` via `createPattern`. This is the map's
  ground.
- `Battle.buildGround()` — bakes the whole battle arena (grass gradient + 60 soft patches +
  2600 grass tufts + river/pit/hill/forest) onto an offscreen canvas; `render()` stamps it
  with a single `drawImage`.
- `Battle.drawTree(ctx,x,y,r)` — shadow + trunk + a 3-gradient crown. Used in both battle and
  on the map (map forests are cached inside `_forestTrees`).
- `Battle.drawUnit()` — ground shadow, team ring (blue `#4fa8ff` / red `#ff5a4a`), a pulsing
  gold ring for the player, dust, emoji + rank marker, a white hit flash, a gradient sword at
  `currentWeaponAngle`, an HP bar **only if damaged**. Units are drawn sorted by y (a sense of
  depth).
- `Battle.drawHud()` — a width-adaptive command strip + a steel-framed tug-of-war bar
  (notches, a jittering clash cursor, Cinzel status text).
- `Game.mapLabel()` — a rounded plate + a faction-colored underline. Text size scales with
  `1/camera.zoom` (the same on-screen size at any zoom), overlapping labels are pushed up.
  Settlement labels sit above the icon, NPC labels below.
- `Game.drawPartyIcon()` / `drawRider()` / `drawFootman()` — the map's party silhouettes; not
  emoji, a canvas path. See the "World map" section for detail.
- `renderMap()`: a cached sea gradient + animated wave lines, the continent's shore (a sand
  band → a shaded fill → an edge) then `ctx.clip()`, ground patches, rivers (bed + water +
  glint + a flowing dashed line), roads (48/30/dashed-4 layers), forests, settlements
  (shadow + emoji + faction pennant + tournament 🏆).
- Gradients are cached in **world coordinates**; panning the camera doesn't shift them.

The `RENOVATION` block at the end of `style.css`: body radial gradients, `.glass-panel`'s
inner glow, campaign-bar badges (`.hud-chip` / `.hud-bar` / `.fill-hp|party|xp`), an iconed
and shortcut-badged `.menu-btn`, the `#map-hud` tooltip, `.view > h2::after`'s gold line,
`#map-view`/`#battle-view`'s gold frame, `.battle-logs`'s `min(330px, 50% - 28px)` width +
`mask-image` fading toward the bottom.
`#top-bar` has `position:relative; z-index:60` — otherwise the speed hint sat underneath the
map canvas.

## Performance

The bottleneck isn't JS, it's the **compositor**. Measured (1920×1080 canvas, 81 live units +
60 corpses + 200 blood stains): `Battle.update` 0.27 ms per frame, `Battle.render` 0.97 ms —
~1.2 ms total. So only ~7% of the frame budget (16.7 ms) goes to JS; everything else is
drawing and compositing.

**The frame budget depends on the screen's refresh rate**: on a 180 Hz monitor,
`requestAnimationFrame` gives **5.5 ms** per frame, not 16.7 ms — the same drawing work fits
into a 3× tighter budget, and dropped frames feel like stutter. That's why `Game.skipFrame(t)`
skips excess frames at the top of all three loops. It doesn't use a fixed ms threshold
(skipping every second frame at 90 Hz would give 45 fps); the refresh rate is measured from
the first frames and the largest whole divisor that doesn't drop below 60 fps is chosen.
Measured (a gate simulation in `node`): 60→60, 75→75, 90→90, 120→60, 144→72, 165→82, 180→60,
240→60.

**The refresh period is the MEDIAN of the last 31 frames, not the smallest (#85).** The old
estimator was "the shortest interval I've ever seen," and its value could never go back up:
**one** bad sample nailed `_step` down permanently. That's exactly what a player's iPhone
debug report measured — iOS delivers two rAFs ~2 ms apart while the page is being scrolled,
the estimate locks to 2 ms, the report reads "500 Hz," and the divisor `1000/30/2` becomes
**16**: 15 of every 16 frames get dropped, the game ran at **3.79 fps** (that's what the
report's `frameDivisor: 8` + `500 Hz` lines mean). The median resists both directions — a
long jank spell and a double delivery alike stay a minority within the 31-frame window — and
it **recovers on its own** as the window slides. A second safety net is the sample filter:
consumer screens top out at 240 Hz, so an interval under `4 ms` can't be a real screen
period; if the filter strains out everything, `_step` stays `Infinity` and the divisor becomes
1, so the failure always falls toward **"draw too many frames"**. Measured (two 2 ms samples
spliced into a 60 Hz stream, next 600 frames counted): **3.79 → 29.94 fps**.
`tools/test.js`'s *"one bad sample doesn't lock the gate"* assertion is the regression test for
this (confirmed to turn red run against the pre-fix code).

**The decision is made per frame, not per call (#42).** If asked a second time in the same
frame (`t === _prevT`), the cached answer is returned. It used to be that every call
incremented `_frameNo`: when the map loop and battle loop ran together, the counter went up by
**2** per frame, and on any screen where `n ≥ 2` (120 Hz and up) one loop's parity got stuck
on the wrong number permanently and that loop **never ran once**. Measured (n=2, 2 seconds):
before, the map loop got 60 frames, the battle loop **0** — battle froze, the canvas was
never drawn so the screen went **pitch black** (see #42: "battle resolving in the
background" — the save/load loops rebuilding and shifting parity made a battle end all of a
sudden). After the fix, in the same setup the battle loop got **61 update + 61 render** (30
fps), the map loop 0 (already stopped). Nothing changes at 60 Hz: map 60 fps, battle 60 fps,
a wasted map render during battle is 0.

Map input is also ignored while battle is open (`handleMapClick` / `handleMapHover`'s opening
gate is `Battle.active || TournamentMinigame.active`).

**Two safety nets** (#54) sit on top of the root fix — neither is the fix itself, they're
sentries so a silent black screen doesn't last as long:
- `Game.battleCtx()` — `battle-canvas` is shared by `Battle` and `TournamentMinigame`, and
  **the first `getContext` call binds**: if one forgot the `{ alpha:false }` flag, the second
  call would return `null` and the screen would stay black. Now both get it from the same
  gate, and `Debug.log('canvas', …)` if the context can't be obtained.
- **A pulse check** — 700 ms after `Battle.start` sets up the battle loop, it checks: if not
  even one frame has been drawn (`this.lastRender` still 0), it rebuilds the loop once and
  writes `Debug.log('pulse', …)`. Skipped while `document.hidden`, since
  `requestAnimationFrame` already stops in a hidden tab — otherwise every player who alt-tabs
  gets a false alarm. Measured: with `render` stubbed out and rAF cut, the warning fired at
  700 ms; it never fired in a normal battle.

So looking at JS in a profiler to hunt for stutter is misleading. Rules applied:

- **No `backdrop-filter` over a moving canvas.** Blur recomputes every time the pixels
  underneath change; since the map/battle canvas changes every frame, that's a full blur
  pass every frame. Measured: even on a 344×513 battle canvas, 10 log messages went from
  **54 fps / p95 33.3 ms → 60 fps / p95 18.2 ms** (repeated three times). `#map-hud`,
  `#map-tooltip`, `#prisoner-ui`, `.battle-logs .log-msg` use a more opaque background
  instead of blur. Panels over a static background (`#top-bar`, `#sidebar`, modal) can keep
  the blur — since what's under them doesn't change, the result gets cached.
- **`renderMap()` returns early while a modal is open.** Time is already frozen; continuing
  to draw was recomputing the modal's 16 px glass blur every frame for nothing. Measured:
  30 frames in 500 ms while a modal was open dropped to 0, and it comes back when it closes.
- **Canvases are opaque** (`getContext('2d', { alpha: false })`): the map's sea, the battle
  ground, and the tournament background all fill every pixel every frame anyway, the alpha
  channel is wasted. Note: `battle-canvas` is shared by `Battle` and `TournamentMinigame` —
  both must call `getContext` with the same flag (the first call binds).
- **Every rAF loop has double-start protection** (`Game.startGameLoop`, `Battle.start`,
  `TournamentMinigame.start`): `if(this.loopId) cancelAnimationFrame(this.loopId)`.
  Otherwise a second loop doubles both speed and draw load.
- **Unit emoji are cached as sprites** (`Battle.unitSprite`). Rasterizing a colored emoji
  glyph with `strokeText` + `fillText` every frame is expensive: measured, per call **13 µs
  → 3.4 µs (3.8×)**. `Battle.warmUp()` bakes all of `UNIT_ICONS` before battle starts — the
  "the first seconds stutter, then it smooths out" complaint's source was glyph
  rasterization in the first frames. Measured: battle's first `render()` went **32.6 ms →
  21.1 ms**, the first frames went from `32.5 + 33.5 ms` to a single `33.3 ms`. A new unit
  icon must also be added to `UNIT_ICONS`.
- The expensive thing is baked once: `Game.buildGroundTexture()`, `Battle.buildGround()`,
  `_seaGrad`, `_vignette`, `_forestTrees`, `_swordGrad`. No gradient is produced per frame.
- Particle ceilings: sparks 120, floating text 40, blood stains 200, corpses 60.
- Target search isn't a full scan per frame — once every 0.3–0.5 s per unit (`u.tgtId`).

### Lite mode — one config, the whole game (#80)

"Even on an iPhone 14, the map stutters after 2 minutes of walking around." Two separate
jobs: a **root fix** (applies in every mode) and **lite mode** (one switch simplifies the
whole game).

**1. Root fix — the map was being redrawn from scratch every frame.** Measured (900×620
canvas, zoom 0.8, per frame, via `CanvasRenderingContext2D` counters):

| | before | after (vanilla) |
|---|---|---|
| `createRadialGradient` | **123** | **0** |
| `fillText` | **239** | **43** |
| `measureText` | **42** | **0** |
| `shadowBlur > 0` | 1 *(a 70 px blur over the whole continent)* | **0** |
| `renderMap` (JS) | 0.66 ms | 0.55 ms |

The JS difference is small, and that's expected — the bottleneck is the compositor (see
above). The real win is the ~250 short-lived gradient objects going to the GC on a phone and
the ~157 mountain emoji re-rasterized every frame; the two combined with thermal throttling
produced the "fine at first, stutters after two minutes" picture.

Four caches, all on `Game`:

| Gate | What it does |
|---|---|
| `Game.emoji(ctx, ch, x, y, size)` | Bakes an emoji once onto an offscreen canvas sized to a power of 2, then `drawImage`. Mountain rings, settlement/site icons, crown, and chain go through it |
| `Game.radial(ctx, r, inner, outer)` | A radial gradient keyed by radius+color. **The cache lives on the context** (`ctx._grads`) — a `CanvasGradient` is tied to the context that created it |
| `Game.textW(ctx, text)` | A label's width is measured once per text (`mapLabel`) |
| `Battle.drawTree` | The crown gradient now depends only on radius, not position: drawing is set up at the origin and moved with `translate`, the gradient is produced once per radius (`c._treeGrad`) |

The coastline's `shadowBlur = 70` was replaced with three transparent wide outlines: the same
look, at the cost of a road drawing.

**2. Lite mode.** One switch: `Game.opt('lite')` = `'auto' | true | false`, `Game.lite()`
gives the answer and caches it within the frame (`_lite`, refreshed by `applySettings`).
`'auto'` = `Game.isTouch()`, i.e. `pointer: coarse`. **📱 Lite mode** row in ⚙️ Settings; when
it turns on by itself, the player is told once with `Game.liteNotice()`
(`localStorage.webband_lite_told`) — graphics quietly dropping raises the question "why does
the game look like this."

| Area | What drops in lite mode |
|---|---|
| Map | Sea waves, ground patches, and campfire light aren't drawn; forest trees thin to **1 in 3** (not 0 — a forest is gameplay information: ambush, sight, speed), mountain ring 1-in-2 instead of 1-in-4. Full-screen layers also flatten — see "Fill rate" (#84) |
| Battle | `buildGround` density drops (60→20 patches, 2600→700 grass tufts, forest trees halved); water glint and unit dust drop; `drawHud`'s text shadow drops; `spark()` gives 2 particles instead of 5 |
| Particle ceilings | sparks 120→**40**, floating text 40→**14**, blood stains 200→**60**, corpses 60→**20** |
| Screens | `Game.sceneBg` returns null: character/party/inventory/quest backgrounds and the tavern/hall modal image aren't drawn (the curtain stays) |
| CSS (`body.lite`) | `backdrop-filter` drops, glass panels move to an opaque background, continuously spinning animations stop |
| Frame rate | `skipFrame`'s target is **30 fps** instead of 60 — on a phone, halving the budget helps more than trimming drawing (and slows heat buildup) |

Measured (the same canvas and frame, vanilla → lite):

| | vanilla | lite |
|---|---|---|
| `renderMap` | 0.55 ms · arc 285 · fill 501 · drawImage 198 | **0.38 ms · arc 111 · fill 289 · drawImage 119** |
| Map trees / frame | 59 | **21** |
| `Battle.buildGround` (once per battle) | 2.3 ms | **0.3 ms** |
| `Battle.render` (49 live units) | 0.39 ms · arc 131 · fill 235 · shadowBlur 1 | **0.29 ms · arc 69 · fill 173 · shadowBlur 0** |
| First entry into 4 menu screens | 28.4 ms, ground data 38 KB | **4.7 ms, 63 bytes** |
| Frame gate (60 Hz screen) | `[f,f,f,f,f,f,f,f]` = 60 fps | **`[t,f,t,f,…]` = 30 fps** |

`applySettings` clears the `dataset.bg` stamp on screen backgrounds when the mode changes and
rebuilds the open screen — otherwise a screen entered in lite mode stayed background-less
when switching back to vanilla.

#### Fill rate: in lite mode the map is flat-painted (#84)
The map still stuttered on a phone even with lite mode on. Measurement cleared the JS: the
30 fps gate is working, only `update` + `renderMap` run per frame, no per-frame DOM writes,
the canvas's own background is already 1 CSS px (no DPR bloat), `sceneBg`'s JPEG decoding is
already skipped in lite mode. The remaining bottleneck is **fill rate**: `renderMap` paints
the screen and the continent on top of each other several times over. In lite mode those
layers are swapped for flat counterparts:

| Layer | vanilla | lite |
|---|---|---|
| Sea | a cached gradient, a `20000×20000`-unit rectangle | a single color `#123c58` |
| Continent | flat green + a **second** texture (pattern) fill on top | flat green only |
| Coast | a sand strip + a 90-unit halo + three shadow outlines at 130/86/48 units | just a 42-unit sand strip |
| River | bed + water + glint + a dashed line sliding every frame | a single layer of water |
| Road | shoulder + surface + a dashed centerline by kind | shoulder + surface (kind is already read from width) |

Measured (1058×709 canvas, the same world, the same frame, A/B — `renderMap` per frame, two
rounds):

| zoom | 0.07 | 0.30 | 0.80 | 1.50 | 3.00 |
|---|---|---|---|---|---|
| vanilla | 1.16 / 0.99 ms | 1.02 / 0.82 | 0.97 / 0.75 | 0.90 / 0.79 | 0.85 / 0.77 |
| lite | **0.49 / 0.49** | **0.46 / 0.38** | **0.40 / 0.37** | **0.44 / 0.34** | **0.39 / 0.43** |

So ~2× less raster work at every zoom level. Measured via `ctx.getImageData(0,0,1,1)`: canvas
commands are queued, looking only at JS time alone is misleading. *(Note: repeating the same
`getImageData` call drops the canvas into software rasterization in Chrome and every number
inflates ~10×  — vanilla and lite must always be measured back-to-back in the same window.)*

A path tried and **rejected**: baking the whole world (sea + continent + road + river) once
onto an offscreen canvas and stamping it with `drawImage` every frame. Baking alone took
19.1 ms and the image blurs above ~zoom 1 — since the camera's zoom keeps changing, the cache
invalidates constantly.

On a machine that still stutters, the first place to look is `chrome://gpu`: if canvas
acceleration is off (a driver blocklist), everything gets rasterized in software and nothing
here helps.

## Known gaps / bugs

Fixed in phase 0 (no longer an issue): ransom buttons, a tournament softlock
(`battle-log` → `battle-log-left`), duplicate definitions of
`showLore`/`toggleEscapePlan`/`attemptEscape`, absolute portrait paths on Windows, a skill-key
mismatch, `renderPartyScreen` capacity, save/load.

Fixed in the battle pass: a single swing hitting **everyone** in its arc, damage stacking from
rapid clicks because there was no recovery time, `enemyLvl` being computed and never used,
`performance.now()`-based wait counters depending on frame rate, an archer fleeing the arena
locking the battle forever, arrow damage being written as `-4.199999999999999`, the player's
health being dropped to 30% on defeat and then immediately overwritten, the battle ending
instantly when the player died.

Remaining: —

*(The battle engine was split out into `battle.js` in #41: `app.js` 6276 → 4581 lines,
`battle.js` 1701 lines.)*

## Measurement tools (#62)

The "Measured" numbers in CLAUDE.md used to come from one-off scripts typed by hand in the
browser console: not repeatable, silently going stale across versions. The four tools under
`tools/` run **the game's own code** (don't rewrite it) and drop output as
`docs/measurements/<date>-<topic>.md`.

`tools/harness.js` is the one gate: it sets up a tiny fake DOM, runs `app.js` → `battle.js` →
`nobles.js` → `quests.js` in **a single `vm` context** (in a classic script, `const Game` is a
lexical global, it can't be looked up as `window.Game`), and reads names back with
`vm.runInContext`. Drawing calls land on a fake canvas context and become no-ops. A seeded
generator (`mulberry32`) stands in for `Math.random`, so **the same seed gives the same
world**. Shared flags: `--seed 1-5`, `--json`, `--report`.

| Tool | What it measures | Example |
|---|---|---|
| `sim.js` | A playerless world: conquest, campaigns, war/peace, caravan raids, prosperity, erased kingdoms | `node tools/sim.js --days 200 --seed 1-5` |
| `duel.js` | 1v1 troop balance — the real `Battle.update` is stepped frame by frame (block, kite, charge included) | `node tools/duel.js --n 200` |
| `economy.js` | A player script's **net worth** curve: treasury + the sale value of trade goods on hand | `node tools/economy.js --days 60 --troops 10` |
| `framegate.js` | The `Game.skipFrame` gate: Hz → passed fps and #42 parity | `node tools/framegate.js` |

### Frame-skip gate — regression (`framegate.js`)
The gate's own code is driven with fake timestamps. Measured (2 s):
**60→60, 75→75, 90→90, 120→60, 144→72, 165→82.5, 180→60, 240→60** — so the rule ("the
largest divisor that doesn't drop below 60 fps") held. The second table is #42's regression
test: when two loops ask in the same frame, **the parity difference is 0**, the map and
battle loop see the same fps. If the parity difference ever comes out above zero, one of the
loops is permanently starved and the screen goes black; the tool **exits with 1** in that
case, so it can be used as a CI gate.

### Economy — is choosing a profession really a choice? (`economy.js`)
Three player scripts are run in the same world, with the same army. So the army doesn't
starve, supplies are bought every day (otherwise the measurement would be "does the army
desert," not "the money curve"), and what's measured isn't the treasury but **net worth** —
the trade script closes the day by unloading, so the treasury alone would mislead.

Measured (`--days 60 --troops 10`, 10× lvl 10 Svadya Milisi, 1000-denar treasury):

| Script | End | Per day | Daily wage | Daily food | Troops left |
|---|---|---|---|---|---|
| Idle army | 37 | **−16.1** | 20₺ | **12₺** | 0/10 |
| Trade route | 8 | **−16.5** | 20₺ | **14₺** | 0/10 |
| Fief holder | 6721 | **+95.3** | 20₺ | **31₺** | 11/10 |

*(Measured after `FOOD_MAN`. The food line dropped in every script — 14→12, 18→14, 49→31 —
but "per day" only improved **for the fief**: +79.1 → **+95.3**, so the ~18₺ saved went
straight to profit. The other two scripts already end at zero denars; what's measured there
isn't profitability but "how many days until bankrupt," so the −14.6 → −16.1 difference isn't
meaningful. The takeaway is unchanged: **a 10-person army doesn't live without income** — but
the bill is now in the same range as the wage, not double it.)*

Takeaway: **a 10-person army doesn't live without income** (wage + food ≈ 35–50₺/day) and
**trade alone doesn't feed an army**. The same trade script run without an army earns
+11.8₺/day; growing the treasury doesn't help (`--purse 5000` → +2.3, `--purse 20000` →
+0.2), because the bottleneck isn't money, it's **#46's supply curve**: draining more than a
quarter of the target market's stock crashes the price. So trade scales by **route count**,
not purse size — same as in Warband. A fief is steady income: +79₺/day even with no campaign
or war.

### Duel — why the tool's measurement differs from the hand measurement (`duel.js`)
The durations in the "Party & troops" section were measured with `Battle.dealMelee` called
**one-way** (the target doesn't hit back). `duel.js` is a real duel: both hit, block, flee,
charge. Measured (200 fights per round; a duel is random, the rate moves ±3% across repeated
rounds):

| A | B | A wins | Avg. duration |
|---|---|---|---|
| Nord Baltacısı | Rodok Kalkanlısı | **96.9%** | 22.9 s |
| Nord Baltacısı | Svadya Şövalyesi | **50.8%** | 15.1 s |
| Rodok Mızraklısı | Nord Baltacısı | 0% | 8.8 s |
| Svadya Milisi | Rodok Kalkanlısı | 0% | 10 s |
| Kergit Atlı Okçusu | Rodok Tatar Yaylısı | 6.5% | 9.6 s |

The two methods don't conflict, they ask a different question: the one-way measurement says
"how fast does this weapon pierce this armor," the duel says "does this troop beat that
troop." Elite balance holds up — the halberdier beats the shielded knight, but **in 23
seconds**, and it's a coin flip against the cavalry knight. A mid-tier troop still loses to
an elite (0%): the spear pierces the armor, but the health pool doesn't hold up.

### Test and CI (#63)

`tools/test.js` uses the same rig (`harness.js`) as its test runner. No framework, no
dependency: `test(name, fn)` + `assert`. **67 assertions**, two sections:

1. **Pure logic** — functions with a known input/output table: `Battle.afterArmor`,
   `Game.troopWage`, `fiefTax`, `getPartyCapacity`, `prisonerValue`, `moraleTarget`,
   `foodStock`, the `skipFrame` gate, `Save.migrate`, the language layer (#81). The expected
   numbers are the "Measured" lines in CLAUDE.md themselves — if one changes, either the code
   or the doc is wrong. There's also a **quest suite** here: **every** quest in `QUESTS` is
   set up via `Quests.make`, `where`/`desc` are checked, then it's finished with real engine
   events and its reward is paid. It's also asserted that the driver table covers
   `Object.keys(QUESTS)` — adding a quest without writing its test turns red. Since quest
   **titles** are raw data (`T(def.title)`, a form the static extractor can't see), their
   presence in both dictionaries is gated by a separate assertion. The **road-events suite**
   (#67) is here too: every option in the pool is actually run — `run`'s body is code, a
   helper whose name changed blows up only when that option is picked, and only the player
   would have seen it. Since the trigger depends on distance, `ROAD_CHANCE` is pulled to 1 to
   test it; the engine's own `Math` lives in a separate vm context, so overriding
   `Math.random` from outside does nothing.
2. **Thresholds** — a 200-day playerless world (`sim.js`) and 60-day economy scripts
   (`economy.js`). Since the world is random, an **exact number isn't expected, a range** is:
   conquest 1–20, caravan raids 20–260, erased kingdoms 0; an idle army shouldn't turn a daily
   profit, a fief should earn above 20₺/day.

| Command | What it runs | Measured |
|---|---|---|
| `node tools/test.js` | everything | **4.9 s** (sim 200 days ~4.1 s, economy 3 scripts ~0.4 s) |
| `node tools/test.js --fast` | pure logic only | **0.13 s** |

**The acceptance path was measured**: with supply prices deliberately doubled, `node
tools/test.js` turned red (`fief income collapsed: 18.8₺/day`) and exited with 1. *Known
weakness:* the same sabotage isn't caught by the "a 10-person army's daily food bill"
assertion — the `idle` script buys less grain as it gets poorer, so the cost stays within
range. So the thresholds need to be read **together**.

`.github/workflows/test.yml` runs `node tools/test.js` + `node tools/framegate.js` on every
push to `main` and every PR (the second is the regression test for #42's loop parity). There's
no `npm install` step — the repo has no dependencies.

*(The tools add nothing to the browser game — `index.html` never loads them.)*

### Versioning and release (#88 item 8)

`VERSION` is bumped by hand; opening a release by hand gets forgotten — up through 0.74 the
repo had **not a single tag**, even though an error report's first line is the version stamp
and "what was in 0.68" needs somewhere to point to. Versions 0.55–0.75 were tagged
retroactively: each version's **real** bump commit was found with
`git log -S"no: '0.xx'" -- app.js`, notes were pulled from that section of CHANGELOG.
0.40/0.50/0.54 weren't tagged — the `VERSION` constant was born in #55, before that there was
no version in the code at all.

Everything after that is left to `test.yml`'s `release` job: on every green build pushed to
`main`, `VERSION.no` is read (from the test rig, not a grep), if the tag already exists it's
silently skipped, otherwise a release opens with that version's CHANGELOG section as notes.
The job depends on `needs: test` — a red build doesn't release. If the version was bumped
without a CHANGELOG line, the job **breaks**; the same assertion also lives in the local test
(*"version: VERSION.no finds a section inside CHANGELOG.md"*), where breaking is cheaper.

## Code style

- English comments and variable/function names; UI text stays Turkish (see below).
- The UI is built with `innerHTML` template strings, inline `style` is common. Button actions
  bind to globals via `onclick="Game.xxx()"` — so `Game`/`Battle`/`Nobles`/`Quests`/`Feast`/
  `Save` must stay global.
- Open a modal with `Game.showModal(html, width?, bgImage?)`, close with `Game.closeModal()`.
- `alert()` is fine for a notice (it's redirected to the modal). The override checks
  `typeof Game`: `const Game` is a **lexical** global, it isn't found via `window.Game` — the
  old guard checked `window.Game`, so every `alert()` call in the game was silently swallowed
  (e.g. the "Interest 0/60" warning; the button looked like it did nothing). A `\n` in a
  message becomes `<br>` in the modal.