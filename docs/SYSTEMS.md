# WebBand — system notes

Companion to CLAUDE.md: one entry per mechanic, its key formula/constants, and the load-bearing
**why** behind a non-obvious choice. Kept short on purpose — future sessions (human or agent)
read a section before touching that mechanic, and update its numbers after. Don't re-inflate
this file with narrative ("we tried X, here's the whole story") or confirmation measurements
that just prove a fixed number is that number — one representative figure is enough; exact
counts that drift with every feature (quest count, dictionary size, assertion count) belong to
the tools that generate them, not to hand-maintained prose here.

## Files
See CLAUDE.md's file table for the canonical list. Extra detail specific to this doc:
`kingdom_crests.jpg` is a 2×2 sprite sheet (4 banners); `lord_portraits.jpg` is 3×3. Design
docs: `docs/PLAN-nobles-and-quests.md`, `docs/PLAN-mobile-port.md` (mobile-port research),
`docs/measurements/<date>-<topic>.md` (dated tool output). LICENSE is AGPL-3.0-or-later.

## Architecture
`window.onload → Game.init()` → map generation + NPC spawn. `Game.startGame()` opens the
character-creation wizard; on confirm, `enterWorld()` starts the game loop
(`requestAnimationFrame`, `update(dt)` + `renderMap()`). The loop **genuinely stops** while
`Battle.active || TournamentMinigame.active` (`_loopId = null`); battle/tournament run their own
loop. `showScreen()` is the only place that restarts it — every way out of battle funnels
through `Game.showScreen('map')`, so no extra hook is needed.

Script order: `i18n.js → lang-en.js → lang-id.js → vendor/pixi.min.js → app.js → battle.js →
battle-gl.js → nobles.js → quests.js` — only matters to avoid a `const` collision (a classic
script's `const` is a lexical global, not `window.X`). PixiJS is the one library, vendored and
pinned (8.21, `vendor/PIXI-LICENSE`); the Node harness loads neither Pixi file.

All data lives in one `state` object; `Save` writes it to localStorage as JSON. `VERSION = { no,
date, name }` sits at the top of `app.js`, bumped by hand alongside a `CHANGELOG.md` line and a
matching `CACHE` name in `sw.js` (cache-first service worker — an unbumped cache ships stale
code forever; `tools/test.js` asserts the two stay in sync).

Global data constants: `app.js` — `FACTIONS`, `LOCATIONS`, `RIVERS`, `FORESTS`, `ITEMS`,
`TROOP_TREES`, `BAND_KINDS`, `SITE_KINDS`, `BOSSES`, `RELICS`, `ACHIEVEMENTS`,
`AMBITIONS`; `nobles.js` — `LORDS` (23), `LADIES` (12), `COMPANIONS` (7), `PERSONALITIES`,
`LADY_TRAITS`; `quests.js` — `QUESTS`. `window.alert` is overridden to a modal.

## Current features

### Character creation
The name field starts empty (1.32.1): an empty or blank name doesn't start the game, it shows
"Önce bir isim yaz." under the field and shakes it; Enter in the field starts like the button.
`Game.startGame()` opens a 7-step wizard on a modal (`Game.creation = { step, sel }`): gender +
4 background questions + a banner + a difficulty step, then a summary. `applyCreation()` applies
every choice from one place; `enterWorld()` runs the old `startGame` body.

Choice effects are data (`attr{}`, `prof{}`, `money`, `renown`, `item`, `relAll`,
`relFaction{id,n}`); `Game.bonusText(o)` turns this into text for both the choice card and the
summary. Answers live in `state.player.background`.

| Question | Choices (summary) |
|---|---|
| Gender | Male / Female (**−5** relation with every lord, different marriage path) |
| Birthplace | 5 faction homelands — one gives an attribute/skill + **+5** relation with that kingdom |
| Father's trade | Noble (+200 coin, +10 renown, Leadership+1) / Merchant / Blacksmith / Soldier / Shepherd |
| Youth | Servant / Hunting / Streets / Monastery / Stable — skill points |
| First profession | Mercenary (sword) / Caravan guard (shield) / Knight hopeful (horse, −100 coin) / Smuggler (+300 coin, −2 rel) / Bandit (axe, −4 rel) |

- **Banner**: 9 choices over the 4 crests, cropped from `kingdom_crests.jpg` via
  `Game.crestCss(crest, size, style)` — the single choke point for both the player's banner and
  the encyclopedia's kingdom list. `Game.bannerColor()` colors the party icon and
  `FACTIONS.player_kingdom` once a kingdom is founded.
- **Kingdom crests**: each `FACTIONS` entry carries a `crest` index (0 lion / 1 bear+crossbow /
  2 horse / 3 raven+axe). 5 kingdoms, 4 banners — Vaegir shares Nord's crest with `crestFx:
  'saturate(0.2) brightness(1.1)'` so it still reads grey, not pale blue.
- **Difficulty** (Easy/Medium/Hard) is asked here so it's set before Settings is ever opened —
  see "Difficulty" below.

### World map
- Procedural continent border (`getMapRadius()`, sum of angle-dependent sines); `clampToMap()`
  keeps everyone inside it.
- Settlements are **rule-based redistributed** inside `init()` — see "Settlement layout".
- Roads form a network with bends, kinds, and junctions (`state.roads`/`state.bridges`) — see
  "Road network".
- Rivers/forests have fixed coordinates. Points of interest (`state.sites`) — see "Abandoned
  structures".
- **Forest hides bands**: `Game.spotRange(npc)` = sight × `min(0.9, 0.25 + Scouting×3% +
  Pathfinding×2%)` inside a forest (drawing/tooltip/click all gate on `Game.canSee(npc)`). A
  wolf pack in a forest locks on from `spotRange` and lunges at ×1.6.
- **Ambush** (`checkAmbush`, one roll/sec while moving through forest): a hidden band within
  `min(AMBUSH_RANGE=240, spotRange(band))` jumps you. A strong party is immune (`healthy troop
  count < band.size × 1.5`). Notice chance `min(0.9, 0.2 + Scouting×6% + Pathfinding×4%)` — miss
  it and the enemy rings you at 130–240 units instead of a normal 470–530 unit approach.
- **No fog of war**: terrain/roads/settlements are always visible; only *parties* hide, via
  `canSee`/`spotRange`. Sight (`getVisibility()`) = `500 + (int−10)×30 + (Scouting−1)×25`, ×0.7
  at night, ×`TOWER_REVEAL_MUL`(4) during a watchtower reveal.
- Camera: wheel zoom (`minZoom()`–3.0), edge pan, free WASD/arrow pan (offset clamped ±9000),
  H/🎯 recenters. The camera is its own step (`updateCamera`, 2.4.9), outside the clock gate, so
  it pans and zooms while time is stopped. Edge pan (2.4.9) only while the pointer is on the map
  itself (`Input.mouse.onMap`): over the menu, the HUD (a solid panel since 2.4.9, no longer
  click-through) or the campaign bar it stays still, and the top band starts under the campaign
  bar, which covers the whole top edge. Icons/labels scale with `Game.iconScale()`/`1/zoom` so they don't vanish
  when zoomed out to see the whole 9000-unit continent.
- **`body.view-map`** (set by `showScreen('map')`) makes the canvas fill the viewport with glass
  chrome floating over it; `enterLocation` goes through `showScreen('settlement')` like every
  other screen so this class never leaks onto a non-map screen.
- Route line: a flowing dashed gold line + pulsing dot; the target marker is **draggable**
  (`startTargetDrag`/`endTargetDrag`), shown white/static while dragging vs. gold/flowing once
  confirmed.
- Click-to-move: settlement → enter, NPC → encounter, empty space → move. All go through
  `Game.mapPos(e)` (screen→world) and `Game.setTarget(m)`.
- **Party icons** (`drawPartyIcon`): mounted silhouette if the party has a horse, else a
  spearman; faction color on saddle cloth/shield/banner; 10+/30+ draws extra figures behind for
  a crowd. Nobles are mounted, king gets 👑, marshal 🎖️.
- **Map tooltip** (`locTipHtml`): shows only what you actually know — see below.

#### A settlement's location is known, its state isn't (#74)
| State | Condition | Tooltip |
|---|---|---|
| **Live** | within `getVisibility() × LOC_SPOT`(1.5) — range 750 units | today's real values |
| **Memory** | visited/entered before (`loc.intel`) | values from that day, "N days ago:" |
| **Unknown** | never | "You don't know its state." |

`Game.noteLoc(loc)` writes memory; called hourly from `scoutTick()` (inside `advanceTime`) and
by `enterLocation`. The settlement itself (name, banner, targetability) is never hidden — only
lord/prosperity/garrison/recruit are. An old save with no `loc.intel` just starts "unknown," no
migration needed.

### Settlement layout — minimum gap, border keep, village center (#57)
`layoutWorld()` rebuilds the world (up to 12 tries) until three rules hold, validated by
`validateLocations()`:

1. **Minimum gap** (`Game.MIN_GAP`, per pair type): town–town 700, town–keep 480, town–village
   380, keep–keep 620, keep–village 340, village–village 420 units; every point also ≥320 units
   inside the coast (`spotOk`).
2. **Keep at the border, town in the middle** (`placeLocations`): within a faction's angular
   slice, a keep sits in the outer 20% band (facing the neighbor), a town in the middle 56%.
   Distance from center is relative to the coastline (`R × 0.28–0.82`), not a fixed band.
3. **A village has a parent** (`placeVillage`): attaches to the town/keep of its faction with
   the fewest villages (`loc.parentId`), placed 420–900 units away.

`Game.villagesOf(loc)` is the single reader `captureSettlement`/`grantFief`/`grantFiefTo` all
call — an old save with no `parentId` falls back to the old "within 900 units" rule.

### Road network — bends, kind, and bridges (#56)
`Game.roadPath(a, b)` bends a route into a polyline (a base sine bend + a second-harmonic
deviation, midpoints inside a forest pushed to its edge) rather than a straight MST edge — roads
are ~5% longer than straight-line but never cut through forests.

| Kind (from destination type) | Radius | Speed | Texture |
|---|---|---|---|
| 🛣️ Stone Road (→town) | 26 | ×1.18 | gray, short dashed centerline |
| 🛤️ Dirt Road (→keep) | 22 | ×1.10 | brown, wheel ruts |
| 🥾 Goat Path (→village) | 15 | ×1.04 | thin, sparse |

A road is ~5% longer but the fastest kind is 18% faster — sticking to stone roads nets ~12%,
Warband-style, not mandatory. A new settlement can also snap onto an existing road point
instead of another settlement, forming a real T-junction; a road segment crossing a river writes
a **bridge** into `state.bridges` (`Game.onBridge`, 70-unit radius) that cancels the river's
×0.5 speed penalty while keeping the road's own multiplier. An old save's roads have no `kind` —
`Save.apply` re-weaves the network from scratch when it notices.

### Abandoned structures and points of interest (#58)
`state.sites`, own array (not `LOCATIONS`), routed through `enterLocation`'s
`if(loc.type === 'site') return this.enterSite(loc)`. Placed ≥`SITE_MIN_GAP`(520) units from
settlements and each other.

| Type | Respawn | Outcome pool |
|---|---|---|
| 🏚️ Ruins | one-time (removed) | coin 31% / ambush 30% / gear 20% / empty 19% |
| 🌾 Abandoned Farm | 25 days | food 46% / recruit 22% / empty 22% / ambush 11% |
| 🗼 Watchtower | 12 days | see-far 55% / empty 24% / coin 11% / trap 10% |
| 🕳️ Cave | 30 days | ambush 40% / coin 21% / trap 20% / gear 19% |
| ⛺ Abandoned Camp | 15 days | food 23% / coin 22% / shelter 21% / ambush 21% / empty 12% |

Outcomes (`Game.SITE_OUTCOMES`) follow the daily-event pattern (`when` filter + `run`). `scout`
calls `Game.startTowerReveal()`: `getVisibility() ×4` and the clock stops
(`clockStopped()`) for `min(8, 3 + (Scouting−1)×0.3)` seconds — every band/lair inside the
widened circle draws live, riding the same `getVisibility()` every other spot-check reads, so no
drawing code needs to know towers exist. `renew: 0` in `kind` means one-time; otherwise it
refills `renew` days after `usedDay`.

### Time & daily cycle (`advanceTime` / `dailyUpdate`)
Time flows only on the map screen, only while not paused/tower-revealing and the player is
moving or captive (`dt × Game.timeScale()`).

**Pause**: `Game.setPaused(on)` writes `Battle.paused` mid-battle or `Game.paused` otherwise;
`Game.clockStopped()` (`paused || held || towerReveal`) gates `update(dt)` — `renderMap()` and
`updateCamera()` stay outside that gate on purpose (a stopped map is one you're meant to look at). Esc: close a
window → go to map → pause (opens Resume/Save/Settings/Main Menu). `closeModal` is the one place
that clears `Game.paused` directly. **Space** (2.4.9) is the player's own stop, `Game.held`, kept
apart from `paused`: closing a window doesn't lift it — Space again, a speed key or the speed
button does, and so does walking into a town or a fight (`showScreen`). `pauseBar('')` falls back
to the held banner, and the speed button shows ⏸. `state.timeScale` is one of `TIME_SCALES`
(0.5, 1, 2): the HUD's speed button and **Z** cycle it, **1 2 3** pick it (`setTimeScale`, which
also lifts the hold) — digits on the map only; in a town they press its cards, in battle they
are the tactical orders.

**Map speed** (`getPlayerSpeed`): `(base 66 + agility×1.5) × (1 + party bonus) × (1 + mounted
ratio×0.5) × terrain × night(×0.85) × overload`. Party bonus: solo +50%, +20% at 10, 0 at 20,
−1%/person after (floor −45%) — shared with a pursuing lord's own chase speed
(`partySizeSpeedBonus`), so neither side is arbitrarily favored.

**Mounted/foot gap is capped at exactly ×1.5** (`Battle.FOOT_MAX` = 85, below the slowest horse's
88) — it used to be two stacked multipliers that drifted up to ×2.4 with party size; now it's a
flat multiplier at every size (`tools/test.js` regression-guards this). Terrain: forest ×0.8,
river ×0.5, road ×1.1 (`worst()` applies only the single worst penalty, they don't stack).

Every day: troop wages, food consumption, morale recalc, +5 player HP, village/town recruit
refill, king/vizier armies grow (king → lvl20/110 troops by day 90), tournaments top up toward 3
open, `lairTick`, `Nobles.dailyTick`, `Feast.dailyTick`, `Quests.dailyTick`, then
`Game.dailyEvent()` (see "Daily event pool").

#### Food — a troop eats a fraction of a unit a day (`FOOD_MAN` = 0.3, `FOOD_PLAYER` = 0.5625)
`Game.foodStock()` → `{low, high, total, need, needHigh, days, kinds}` is the single source for
the 🍞 badge, the hunger warning, and the tooltip. Each troop's low-quality share is
`FOOD_MAN × min(3, 1 + min(level,50)/25)` — stronger troops eat more; an elite troop
additionally wants meat/cheese equal to `FOOD_MAN` or takes a ×0.7 battle debuff. The player
eats too (`upkeep()` starts with `foodLow = FOOD_PLAYER`) — a solo party without food starves on
day 2 (−`HUNGER_HP`=3 health/day, no regen that day, floor 1 HP; doesn't kill). Every foodstuff
has a shelf life (`ITEMS[].spoil` days: grain 60, cheese 40, meat 30, bread 20),
`Game.spoilFood()` decays it daily. A 10×lvl10 party + player needs 5 units/day (20₺ food, 20₺
wages).

### Morale
`state.player.morale` (0–100, starts 60). Daily target: `50 + (Management−1)×3 + food
variety×5 − hunger 30 − wage debt(10–40) − over-capacity×2`. Wage debt accrues from
`state.player.wageDebt`, costs 1 morale/hour until paid off. Drifts toward target **fast down,
slow up** (−10/+4 per day; victory +5, defeat −15). Below 25: `1 + (25−morale)/8` troops desert
daily (newest first). In battle, `Game.moraleMult()` = `0.8 + morale/250` scales health/attack
(not speed — the enemy has no morale to compare against).

### UI
- **Campaign bar**: day/hour/time icon, denars, renown, then bar-style badges (health,
  party/capacity, carry load, morale, level/XP, speed). Every badge has a tooltip
  (`Game.updateTips`) breaking down where the value comes from.
- Tooltip overflow is solved once (`Game.initTooltipClamp()`), never per-badge.
- Side menu: `M/C/P/I/Q` shortcuts, **K** diplomacy, **Esc** to map, **WASD**/arrows pan,
  **H** recenters, **Space** stops/starts time, **1 2 3 / Z** speed — all via `Input.init`,
  disabled during a modal/battle.
- Map HUD: terrain + speed, troop composition, Wait / Find Me / Next / Diplomacy, time-speed
  button. Since 2.0.0 all of them use line icons (`Game.icon`); the terrain's icon comes from
  `Game.TERRAIN_ICON` by name. The labels' dictionary keys still carry their old emoji, which
  is cut off at display. Collapses to two rows + "⋯ Daha" under 820px.
- `Game.setHtml(id, html)` only writes `innerHTML` when the text actually changed.
- **Icons (2.0.0)**: one inline SVG sprite (`#icon-sprite`, 50 line symbols) at the top of
  `index.html`; `Game.icon(name)` → `<svg class="i"><use href="#i-name"/></svg>`, colored
  by `currentColor`. HUD, side menu, bottom strip and town cards use it. Map-HUD buttons and
  data tables (items, troops) keep their emoji.
- **Top bar trays (2.0.0)**: the badges sit in four `.hud-group` trays (time · money+food ·
  party+morale+cargo · health+level+renown+speed). Every badge id is unchanged. `.hud-more`
  badges fold away under 820px and `.hud-more-narrow` (health) under 430px, behind
  `#hud-toggle` (`Game.toggleHud()` → `body.hud-open`). A tray whose chips are all folded
  hides via `:has()`. Measured: Pixel 7 (412px), TR/EN, the closed bar is one row, 48px
  tall, and the toggle is 36×36 (the thumb gate in `ux.spec` is 32).
- **Settlement cards (2.0.0)**: `Game.cardSettlementActions()` runs before `renderScene` and
  rewrites the plain action buttons into cards grouped as Ticaret / Mekânlar / Ordu / Savaş /
  Kamp. The grouping comes from `TOWN_CARD` (by the label's leading emoji → icon, group, hint);
  a trailing "(…)" becomes the card's meta. The button itself, its `onclick` and its label
  text (kept in an `.sr-only` span) are untouched, so tests and screen readers see the same
  button.

#### Transaction feedback (#45)
Every buy/sell/recruit/promote goes through `Game.feedback(kind, el, moneyDelta)` →
`sfx(kind)` + `flash(el, ok)` + `floatText(...)`. Sound is a WebAudio oscillator arpeggio per
kind (no audio files), muted via `state.muted`. `.fx-flash`/`.fx-flash-bad` on the row,
`.fx-float` (`±N₺`) rises above the treasury badge.

### Character
Attributes are **target/effective** (`Game.ATTRS`): a spent point raises the target, the
effective value (`stats.eff.<k>`, read only via `Game.attr(k)`) approaches it through play —
`Game.trainAttr(k, w)` gain is `w × ATTR_RATE(0.08) × (0.25 + gap)`.

| Attribute | Effect | Trained by |
|---|---|---|
| 💪 Strength | melee attack, tournament target duration | landing a hit |
| 🏃 Agility | map speed +1.5, battle speed +0.5 | covering distance |
| 🧠 Intelligence | sight +30 | taking/finishing quests |
| 👑 Leadership | party capacity +3 | commanding a crowd (daily) |
| 🫀 Vitality | max HP +5, regen rate | taking damage + daily 0.1 |

Health regen: 1 HP/hour, interval `hpRegenHours()` = `max(1, 8 − (vit−10)/2)`. Skills (Bannerlord
focus system, 3 focus points/level, XP × `0.5 + focus`):

| Skill | Effect |
|---|---|
| `oneHanded`/`twoHanded`/`polearm` | dmg mult `0.35 + min(0.4, lvl×0.004)` |
| `bow` | arrow dmg `0.5+min(0.5,lvl×0.005)`, arrows `24+lvl×2`, less spread |
| `riding` | mounted battle speed `80 + agility×0.5 + (lvl−1)×2` |
| `athletics` | foot battle speed, capped at `Battle.FOOT_MAX`(85) |
| `leadership` (renamed from Charisma-adjacent "Management") | party cap +3/lvl, morale +3/lvl |
| `persuasion` | dowry negotiation | `surgery` | wounded-not-dead chance |
| `prisonerMgmt` | prisoner capacity, fewer escapes | `pathfinding` | map speed ×(1+(lvl−1)×0.02) |
| `spotting` | sight +25/lvl | `trade` | buy/sell edge, capped 25% |
| `looting` | battle loot +4%/lvl | `trainer` | daily +1 XP to the least-experienced troops |

Party capacity: `12 + floor((cha−10)×3) + (Management−1)×4 + floor(renown/40)`, floored at the
source so every UI reads the same integer.

### Starting balance
250 denars (background shifts ±300), party capacity 12, solo. Loot from a much weaker enemy is
scaled down (`Battle.rewardScale`, on the foe's strength — see **The foe's share** below).

### Mercenaries
2 slots/town at the inn, refreshed every 3 days: troops at level 10–15 from that town's faction
tree, `60 + level×12` denars.

### Party & troops
**Faction troop trees** (`TROOP_TREES`, the single source `TROOP_UPGRADES`/`TROOP_TYPES` are
generated from):

| Faction | Villager | Branches | Character |
|---|---|---|---|
| Svadya | Svadya Köylüsü | Milis→Çavuş, Avcı→Keskin Nişancı, Süvari→Şövalye | balanced; spear militia, the most armoured knight |
| Rodok | Rodok Köylüsü | Mızraklı→Kalkanlı, Nişancı→Tatar Yaylısı | no cavalry, best defense/archers |
| Veagir | Veagir Köylüsü | Piyade→Baltacı, Okçu→Nişancı, Atlı→Süvari | axes, deadly archers, mediocre cavalry |
| Nord | Nord Serfi | Savaşçı→Baltacı, Avcı→Nişancı | no horses; fast, cutting infantry |
| Kergit | Kergit Çobanı | Atlı→Süvari, Atlı Okçu→Han Muhafızı | all mounted, fastest, light armor |

**Damage type by troop** (`u.dmgType`): axe/sword = cutting, spear/bow = piercing, a villager's
club = blunt; cavalry counts as cutting (the charge already represents the lance).

#### Balance is a range rule, fought out in the real engine (2.8.0)
`tools/balance.js` turns every rule into real fights stepped through `Battle.update`
(`tools/duel.js`), generated from `TROOP_TREES`, so a new troop is covered the day it is added; CI
runs `node tools/balance.js --check` on every push and fails on a rule out of its range. Balance is
read as **worth** — how many of one troop a troop is worth — because a group fight, a wage and an
upgrade price all ask that. The engine is decisive (no miss chance: one on one a 1.3 edge wins ~87 %,
six against six a 10 % edge reads 75 %), so a duel rule can only say "the better troop wins"; the
exchange rates live in group fights, 64 per rule (a 50 % rule reads ±6).

| Group | Rule (side A's win rate) | Range |
|---|---|---|
| tier | one step up its own tree beats the step below 1v1 / two steps up | 90–100 / 97–100 % |
| worth | 8 of a step against 4 of the step above (a step is worth two) | 20–80 % |
| worth | 8 villagers against 2 elites (two steps are worth four) | 20–80 % |
| mirror | same step, same arm, every pair of kingdoms, 6 v 6 (flavour, within ~15 % worth) | 20–80 % |
| band | a band's row against the kingdom troop it stands in for, 6 v 6 | 30–70 % |
| counter | a braced line (spear, shield) against riders of its step, 6 v 6 | 30–70 % |
| counter | riders against plain footmen / against bowmen, 6 v 6 | 70–100 / 75–100 % |
| crowd | 22 villagers into 8 sergeants: they may lose, but take ≥ 25 % of the sergeants' hp | — |
| hit | every row's blow on every row through `afterArmor`: none under 2 | — |

The worth range is wide because damage types make a tree's chain intransitive: against an
armoured sergeant a militiaman's spear (pierce) lands 11 % more than a sword would, a villager's
club (blunt) 7 % less, so the Swadian sergeant is worth two militiamen but nearer five villagers —
measured over 200 fights, 8 villagers vs 4 militia 59 %, 8 militia vs 4 sergeants 78 %, 8 villagers
vs 2 sergeants 26 %; no scale of the sergeant meets the last two at once. A mirror allows a kingdom's shape: Rodok's slow, thick-armoured shieldman against Swadia's sergeant
reads 25–40 %, the same two with identical stats 45–55 %. A spear (pierce infantry) and a shield
troop's explicit `u.brace` both brace; Swadia's militia carries a spear, so riders against it is a
brace rule, not a charge rule.

**The table is fitted, not picked** (2.8.0). Each row's hp × attack (attack rounded, hp carrying
the rest; defense and speed are the row's shape and stay) was scaled until the fights it is judged
by come out even: a mid against 8 villagers, an elite against 8 mids and 8 villagers at once, bowmen
among bowmen (a bow's worth against a charging villager is no rule), riders against the braced line of
their step, then every row against every rule it sits in, each weighted the same. The villager is
20 hp / 6 attack in every kingdom (a Nord serf was never stronger than a Swadian peasant). A band's
footmen and leader were fitted to the kingdom troop each stands in for: the looter and the mountain
bandit barely moved (24 → 20, 36 → 35 hp), the forest bandit and village watchman came down to a
villager (28 → 18, 30 → 19), the looter chief and the mountain chief to a militiaman and a sergeant
(52 → 39, 75 → 64) — the lair's guards with them. The kingdoms' mid and elite rows came down to their worth (sergeant 65/18 → 52/14). One shape moved: Swadia's
militia went from defense 5 to 8 (45/12/5 → 28/9/8) — against a crowd of weak blows armour is what
counts, and at 5 eight villagers beat four militiamen 75 % whatever his hp and attack.
Before: a step up was worth ~3 of the step below and 22 peasants into 8 sergeants dealt 1 a blow.
**Measured** (`balance.js`, 2.8.0, `docs/measurements/2026-10-03-balance.md`): 95/95 rules hold
(on 2.7.1's table a step up was worth ~3 and 22 peasants dealt 1 a blow); weakest
blow 2 (a villager's club on a knight; on a militiaman 3, before 1); the crowd takes 35 % of the
sergeants' hp. The whole run is ~6 minutes (64 group fights a rule; each rule seeded by its own name,
so it reads the same alone, in the full run, and with scenarios added in front of it).

**Armour is a share of the blow** (2.8.0): `landed = base × K / (K + defense × typeArmor)`,
`ARMOR_K` 20 for troops, bosses and the tournament's kit, `HERO_ARMOR_K` 60 for the gear-armoured
hero (field and lair), whose defense is five pieces summed (leather set 21, plate set 65), a scale
no troop's attack reaches. Subtracted (until 2.8.0, with `ARMOR_FLOOR` 0.18), a villager's club on a
militiaman fell to the 1 floor and every armour point above a blow's size made it worth nothing; a
share never reaches zero. Leather lets 74 % of a cut through the hero, plate 48 %; a level-1 hero
(71 hp) in leather falls to 7–18 blows from mid and elite melee troops, in plate to 11–24. Each hit
also rolls ±`HIT_SPREAD` (25 %) around its mean (`Battle.hitRoll`, melee and arrows), so a weak
man's blows vary instead of reading one small number; `afterArmor` itself stays deterministic, and
that mean is what the odds read. Bosses (defense 25–40) take a troop's 7-attack blow as 2 (before
1) and a mid-game hero's ~18 (before ~16). Anti-cavalry lives in the **brace** (`Battle.braceMult`), not
the damage type — spear infantry ×1.5, a shield troop gets a lighter explicit `u.brace` so its
identity doesn't leak into every matchup (`pierce` on a shield troop was tried and rejected — it
halves armor in *every* fight, not just against horses).

**The encounter's odds label** ("Tahmini denge", `Game.oddsLabel`) compares
`Battle.sideStrength` both ways: (Σ (hp × hit)^(1/1.7))^1.7 — N^1.7 × the 1/1.7-power mean of
hp × hit (2.10.2; the plain mean before), where `hit` runs through
`afterArmor` (armour, damage type, difficulty) and the brace. The rosters are `Battle.playerMix`
(hero from `heroGear`, the unwounded with their morale debuff) and `Battle.enemyMix` (the band's
weighted roster and leader, or the kingdom's troop pool). A bowman's hit on a non-archer counts
`ARCHER_IN_MELEE` (0.45) × his side's archer share^1.5: alone with bowmen he shoots the whole
approach (four villagers are even with four Swadian bowmen), behind his own footmen his line is in
the way (4 militia ≈ 8 villagers, 4 militia + 4 bowmen ≈ 10.5). **Measured** (real engine, 40–80
fights each): every even point — pure footmen at 4, 8 and 16 a side, militia with riders, militia
with bowmen, the Swadian, Vaegir and Nord armies — reads 0.91–1.05; at 0.84 the side won 5–25 %,
at 1.05 75–88 %, at 1.28 98 %. Buckets: Kolay ≥ 1.25, Dengeli ≥ 0.9, Zorlu ≥ 0.7, else Çetin.
22 peasants vs 8 sergeants is 0.59 (won 0 %); 21 peasants vs 8 Swadian soldiers (the kingdom's
pool) is 1.59 (won 100 %), 11 of them 0.53 (won 0 %). Until 2.7.1 the label was a level-weighted
headcount; 2.7.1's buckets (1.5 / 0.8 / 0.55) were read off the subtracted armour and the unfitted
table.

**The hero is one man** (2.10.2). For a single troop type the power mean and the plain mean are
the same number, so every calibration case above kept its value; what changed is a side of mixed
quality. The plain mean let one strong man lift the whole side, but he fights one foe at a time
while the rest gang up. **Measured** (real engine, the hero fought as one more man of his stats
beside eight villagers, 30 fights each): against nine Swadian regulars a 130 hp / 42 attack hero
read **Kolay 1.80** and won 77 % (2.10.2's report: "it said easy, we lost"), now **Dengeli 1.09**;
90 / 32 read Dengeli 1.03 and won 0 %, now Zorlu 0.76; 180 / 55 reads Kolay either way and wins
100 %; a fresh hero (50 / 20) with eight villagers against nine looters reads Kolay 1.94 and wins
93 %. A side of bowmen still reads off (`ARCHER_IN_MELEE` is a share, not a rate of fire): a fresh
hero and eight villagers against six Swadians dealt three footmen and three bowmen read Kolay 1.40
and won 47 % — `enemyMix` weighs a kingdom's whole pool, so the label itself never sees that hand.

**The foe's share** (2.10.2): `Game.foeShare(npc)` = `Battle.powerRatio(enemy, you)`, the enemy's
strength counted in your own heads (1 = even; the label's ratio is it raised to −1.7). Every
pre-battle readout reads it: the odds label, the easy-prey cut (`preyWarning` →
`Battle.rewardScale(share)` = clamp(share × 1.6, 0.2, 1)), your men's chatter (`troopChatter`:
scared at ≥ 1.3, bold at ≤ 0.6) and a surrender's renown (`defeatRenown(share)`). `Battle.start`
takes the same number off the field as it lines up (`Battle.foeShare`, reserves included) for the
win's pay and a defeat's renown. All four weighed heads × level (or raw heads) until 2.10.2, and
since #124 a level adds nothing in a fight: a level-25 hero with eight villagers was told nine
Swadian regulars were "🪶 Kolay av" (paid at 70 %).

**Every fight the player doesn't play reads the same strength** (2.8.0): `Battle.powerRatio(a, b)`
= (sideStrength a / sideStrength b)^(1/1.7), the two sides as a headcount ratio — linear in heads
like the headcount it replaced, so luck and casualty numbers keep their scale. Auto-resolve
(`Battle.autoResolve`, it summed hp × attack), its button (it appeared at 1.5× the heads), a lord
clearing a band (`lordBanditTick`, heads × level, wolves ×1.2), two kingdoms' armies
(`resolveFieldBattle`, heads × level), a band raiding a convoy and choosing one to chase
(`banditTick`, heads × 1.15 caravan / × 0.5 villagers) all read the rosters through it now.
Measured (`sim.js --days 200 --seed 1-5`, 2.8.0 against 2.7.1): conquered 9–20 (8–17), campaigns
24–32 (20–31), wars 16–27 (14–26), peace 17–27 (15–25), caravan raids 133–333 (269–554), repelled
277–320 (274–360), prosperity 63.2–72.1 (64.4–71.3), 0 kingdoms erased — guards are counted as the
men they are, so fewer convoys fall.
Measured again with 2.10.2's power mean (same command, against 2.10.0): conquered 6–20 (9–20),
campaigns 19–32 (24–32), wars 14–26 (16–27), peace 15–25 (17–27), caravan raids 176–407 (133–333),
repelled 293–377 (277–320), prosperity 64.6–72.1 (63.2–72.1), 0 kingdoms erased, 0 errors — a
convoy's guards are a mixed roster (footmen, bowmen, a rider, a leader) and no longer read as
strong as their best man, so bands try more convoys and take more of them.

Sources: a settlement recruit comes from `Game.recruitName(loc)` (that town's own faction);
mercenaries/enemy armies come from `Game.factionTroopPool(faction)` (2 shares mid-tier, 1 elite).
Party screen row: class + damage type, ▲/▼ (troops with the same name move as a block), ➖
dismiss.

**Level is only the promotion gate** (`Game.tierLevel`: recruit 1, mid 10, elite 20) — a tree
troop's stats are exactly `TROOP_TYPES` for its current step, no XP-driven stat growth. Wage and
food read the level, so they too change only at promotion. Companions/spouse aren't tree troops
and keep leveling (cap 50) because their level backs party skills (`profLvl`).

### Companions (`COMPANIONS`)
7 named heroes, each at one town's inn, 600–900 denars. Don't die, only get wounded; level like
a normal troop. Lend expertise via `Game.profLvl(id)` ("highest in the party" rule — a wounded
one contributes nothing). Feuds: a companion on someone's `dislikes` list won't join while they're
in the party. 20 denar/day wage + 1 food.

### Inventory & equipment
Weapon/armor/horse slots; armor→max HP, weapon→attack, horse→map speed (66→105). Sell price is
×0.7 of buy. The trade edge (Ticaret skill `(lvl−1)×0.02` + perks + the merchant relic, capped
0.40) narrows that spread from both ends — buy `1 − 0.3×edge`, sell `0.7 + 0.3×edge`
(`TRADE_EDGE_K`) — and never closes it: 6 % is left at the cap. Measured (bug hunt, 2.3.1): the
old `(1−edge)` / `0.7×(1+edge)` crossed at edge 0.18, and a buy-5/sell-5 round trip in one market
paid up to +175 dinars (swords); now no item in any town pays a round trip, at the full edge. **Weapon tiers**: 5 base weapons × 4 quality tiers each (T1 base → T4, price growing
faster than attack). Carry capacity (`Game.cargoCap()` = `20 + 5×heads + 4×mounted`) gates
purchases (`buyItem` stops at whichever of money/stock/room runs out first) and speed
(`cargoMult()` = `max(0.5, 1 − overload/capacity×0.5)`). Everything sellable can be sold back
except `unique`/`unsellable`/`type:'special'` items; equipped gear never appears in the sell
list (it lives in `equipment`, not `inventory`).

#### Per-good supply/demand pricing (#24)
`Game.priceMult(loc, id)` = `basePriceMult(loc,id)` (production region ± geography-based
deviation × village/prosperity adjustment) `× supplyMul` (stock-driven, `(stock/base)^−0.5`
clamped 0.55–2.0). Price is computed **unit by unit** inside the buy/sell loop, so buying in
bulk costs the same total as one at a time. `Game.priceNoise(x,y,id)` makes per-good regional
deviation continuous across the map (two low-frequency sines) instead of a per-settlement hash —
neighboring towns now sit close in price, distant ones diverge. Stock (`loc.stock[id]`, saved)
regresses toward its base at `0.08 + prosperity/700`/day. **Guild price ledger** (inn → ⚖️
Guildmaster) shows every food/trade price across the nearest 5 towns — the information source
for planning a route.

A single load's profit share shrinks as it grows (cheap goods like ale/salt scale better than
scarce ones like velvet, which saturates a single town fast) — trade profits from **route
count**, not one big haul.

### Settlements
- **Town**: market, slave trader, inn (rest, bard's poems, mercenaries, guildmaster, hire
  companions), arena (always open), tournament (if any), lords' hall, feast, recruiting.
- **Keep**: lords' hall, feast (if any). **Village**: elder, recruiting, food market, raiding.
- On your own fief (except villages): 🛡️ Garrison / 📦 Storage buttons.
- At war with the owner: only the siege option shows (market/inn/hall/recruit all closed); if
  you're independent it reads "Besiege! (Found Your Own Kingdom)."
- An enemy village gives neither troops nor food; a village you raided withholds both for 7
  days and its elder turns hostile (village-burner-tier dishonor even makes a *friendly* village
  ask you to leave).
- **Prosperity** (35–90, saved) drives garrison size, recruit refill, and market price;
  recovers +0.4/day below 50, +0.15 above (cap 90).

#### Settlement scene (#60)
`#scene-canvas` is generated **from the settlement's own buttons**: `Game.renderScene(loc)`
maps each button's icon to a building type (`SCENE_KIND`) and draws it — adding a settlement
button becomes a building for free, no separate hotspot table. Everything is drawn code, no
image files. Backed at `900×280 × min(2, devicePixelRatio)` (unlike the map/battle canvases,
which stay 1:1 since they redraw every frame and DPR would cost real frame time there).
Inn/hall interiors reuse the same machinery (`Game.sceneBg(kind)`) as backdrops for the
character/party/inventory/quest screens (`Game.applyViewBg`).

#### Raiding a village (#21, #49)
`Game.raidVillage(loc)` → beat the militia (`militia count = max(4, prosperity/5)`) → the raid
becomes a **15-second timed action** (`RAID_SECONDS`), not instant loot: `state.player.raid`
pins you over the village, time flows, a nearby lord (`RAID_ALERT`=1600 units) can interrupt and
cancel it. Reward: `prosperity×6×0.85–1.15` denars + grain/cheese + 60 looting XP; cost: owner
relation −30 (other lords −6), prosperity −20 (floor 10), recruits withheld 7 days, renown −6,
**−12 honor**, and burning a peacetime village is grounds for war. `RAID_COOLDOWN`=30 days
before the same village can be raided again.

### Nobles (`nobles.js`)
23 lords + 12 ladies, each with a roaming party (`npc.lordId`) that wanders near its home
settlement (`Nobles.isAt`, 420-unit radius).

- **Portraits**: lords from `lord_portraits.jpg` (3×3); ladies are drawn in code
  (`Nobles.ladyPortrait`) — hash-derived face, faction palette, personality-driven accessory,
  same face every time for the same lady.
- **Relation** `state.relations[lordId]` (−100..100): Blood Feud / Enemy / Resentful /
  Indifferent / Content / Friend / Loyal Friend.
- **Personality** (`martial`/`cunning`/`debauched`/`goodnatured`/`quarrelsome`) drives greeting
  lines, favorite gift, quest type, dowry multiplier.
- **Standing** (`Nobles.standing(id)`, −1..4): renown/130 + relation + army-brought ratio − 1 if
  quarrelsome. Decides dialogue tone: ≤−1 → −1 relation + brush-off, 0 → unchanged, 1–2 → +1,
  3–4 → +2.
- **Dialogue** (`Nobles.talk`): daily chat, ask for a quest, ask location, gift, poem (if
  courting), insult (−15 relation, +2 renown, +5 with rivals), swear fealty.
- **Character trait** (`Nobles.LORD_TRAITS`, hash-derived, never saved): 🦚Vain 🐁Cowardly
  🗡️Cruel 🍺Jovial 💰Greedy ⚜️Honorable 🙇Sycophantic — decides *how* a lord talks
  (`Nobles.LORD_LINES`, filtered by trait × standing band × context, ~130+ lines total). A
  retinue exchange (a random retainer's aside) cuts in 34% of the time.
- **"Where is …?"** (`Nobles.askWhere`): accuracy scales with relation, from a deliberate lie
  (rel<0) to a live 3-day tracking marker (rel 50+).

### Courtship and marriage
- **A female player courts unmarried lords** (`SUITORS`, wrapped as `suitor_<lordId>`) instead
  of ladies — one code path handles both genders (`Nobles.courtables()`/`lady()`).
- Entering a hall's lady section costs 80 renown, a feast 150 renown.
- **Interest** `state.affection[ladyId]` (0–100): small talk +3 (3-day cooldown), matching
  compliment +5 (mismatched −8), poem +12 (once/lady), dedicated tournament win +18, duel win
  +15.
- **Rival suitor**: 60% chance at game start, +1.5/day; first to 100 gets engaged. Countered by
  an honor duel or reputation smearing (30% backfire chance).
- **Proposing** (`Nobles.askForHand`): interest ≥60, renown ≥120, guardian relation ≥25. Dowry
  `8000 + keep/town×400 − 2200·log10(1+renown/60) − relation×25`, floor 2500, scaled by rank and
  personality.
- **Wedding**: scheduled 5–10 days out; miss it by 2+ days → −25 relation/interest. Marriage:
  +15 Management, +20 with spouse's kingdom, +50 denars/day, spouse joins the party.

### Feasts (`Feast`)
Every 10–20 days, a random town, 4 days. Every noble of that kingdom counts as present. "Walk
the hall" gives +2 relation with everyone (once). Hosting one in your own kingdom's town: 3000
denars + 30 meat/cheese for +5 relation, +15 renown.

### Quests (`quests.js`)
Event-driven engine. `Quests.emit(ev, data)` fires on `entered_location`, `bought_item`,
`battle_won`, `escaped_captivity`, `tournament_end`, `chickens_caught`, `talked_to`,
`poem_recited_lord`, `raided`, `lair_cleared`, `lair_captive_freed`; `Quests.dailyTick()` runs
each quest's `day()` hook and checks deadlines. **The event contract** (2.4.2): the quest suite's
drivers emit events themselves, so they prove the engine, not the game — `tools/test.js` also
reads every `Quests.emit('x', { … })` literal in the game against every `on()` body and fails on
an event nobody sends or a `d.field` no send of that event carries. Keep emits as plain object
literals so the scan can read them.
**Where** (`where(q)`) is a settlement id or a map site's: the lair quests pin the lair itself
(`Quests.place` reads both; the 📍 line, its day count and the 📜 map label all follow it). They
used to pin the nearest settlement, which named a castle while the text sent you to the lair.

A quest definition has 4 hooks (only `desc`/`where` mandatory): `setup(q, giver)` (assume the
precondition — `can` already filtered), `can(giver)` (is it currently offerable), `desc(q)`
(what + progress), `where(q)` (target settlement id — the single source both the quest card's 📍
line and the map's 📜 stamp read from). `Quests.taskHtml(q)` merges the two; `Quests.make(id,
giverId)` generates an instance.

The roster has grown well past its original handful — `quests.js` currently defines **over 40**
quests (both hand-designed ones like the two-solution "Brother in Chains" or the lair-revealing
"Clear the Lair," and a larger batch of shorter, more generic delivery/escort/bounty/hostage
quests added later for variety). Don't duplicate the full list here — it drifts with every
addition; read `quests.js` directly, and `Object.keys(QUESTS)` is what `tools/test.js`'s quest
suite iterates to guarantee every quest has a driver.

Giver is either a lord or the **guildmaster** (`giverId = 'guild_<locId>'`, no relation stake —
reward is denars/renown only, failure carries no relation penalty). **What a quest pays** (2.10.0) is
`Quests.money(def)`: the table's `reward.money` × `MONEY_SCALE` 0.6, to the nearest 10 — one choke
point for the offer, the card, the payout and its alert. The tables kept their old sums (400–2500);
a hand-in was worth a month of a town enterprise (~27/day), so a quest is renown and friends
first and money second now (240–1500). Accepted quests live in
`state.player.quests`; a refused lord won't offer again for 7–15 days; one active quest per
lord; failure is −10 relation.

**The named gang doesn't run, and is never a pack** (2.6.2). The three "find this exact gang"
quests (Zincirdeki Kardeş, Rehin Tüccar, Kaçak Birlik) lock their target (`questLocks`), and a
locked band weaker than you no longer notices you (`updateNPCs`): it used to sense your army from
`sense` (~1000 units) while you see ~500 (~125 in a forest), flee for `FLEE_HOURS`, and the marker
only names the town nearest it. They also pick from `Quests.gangs()` — bandit bands minus `beast`
kinds: a pack outpaces a foot column (82 + sprints vs ~74), and holds no hostage. Measured
(scratch bot that walks to the marker and chases only what it sees, 21 foot, 20 seeds, 20 days):
before — plain gang found in 13/20, forest gang 14/19, after **~300 h**; after — **20/20** (median
~45 h) and **19/19** (median ~30 h). Packs, even unfleeing, took up to ~160 h. `wolf_cull` still
targets packs: any pack counts, and they come to you.

### Trade parties — caravans and convoys (#22)
6 caravans + 8 villager convoys roam the roads (`BAND_KINDS.caravan`/`.villager`,
`trade: true`), so map icon/battle mix/leader logic are free from the existing band machinery.

| Party | Route | Guard | Cargo | Icon |
|---|---|---|---|---|
| Caravan | town↔town at peace | 6–14 (+Kervanbaşı) | 2 trade goods + 120–380₺ purse → **790–1350₺** | a cart, gold |
| Convoy | village↔nearest town | 3–7 | 15–44 grain + 5–19 cheese + 20–70₺ → **100–270₺** | a spearman, light green |

They never attack (`isHostile` false unless at war). Clicking one opens a choice (`meetTrader`):
🗡️ Rob or 🚪 Let Pass. **Robbing a peacetime kingdom's convoy is banditry** (−5 renown, −4
relation with every lord of that kingdom) — a wartime one is free loot. Feeds destination
prosperity on arrival (caravan +0.5, convoy +0.15).

**Bandits hunt them too** (`Game.banditTick()`/`.hunting`, daily): a band within 400 units of a
crossing convoy rolls a raid (the two rosters as fighting men, `Battle.powerRatio`, ±30% luck
each — 2.8.0; it was headcount × 1.15 caravan / × 0.5 convoy); a repelled band is
halved, a raided convoy is removed and its cargo passes to the band (whoever beats that band
next gets it — no extra code, same loot pipeline). Idle bands within 1200 units actively chase
the nearest trade party if it's a winnable fight (the convoy under 1.2× the band, same measure). **One band per convoy** (2.4.4): a convoy
another band already hunts is skipped, a band keeps its own convoy unless another is `PREY_HOLD`
(300) units nearer, a band skips one inside the sight of an army it would flee, and the band
hunting a convoy is the one that raids it. Each convoy walks at its own pace (±10%): at one fixed
speed on a fixed route, two that met once walked in lockstep for good.

### Map movement rules (2.4.4, `tools/mapwatch.js`)
`mapwatch.js` watches every party's every step (no player / a neutral company / a vassal at the
front / a vassal besieging) for jumps, stuck parties, dithering and crowds. What it caught, and
the rule each find became:
- **Flight lasts** — a party that flees you keeps running `FLEE_HOURS` (4) once out of sight;
  errands (a convoy, a patrol, a campaign) wait. It used to turn back at the edge of `sense` and
  flee again, all day. A wolf pack in flight doesn't lean back in on blood scent or charge.
- **One lord per band** — a patrol skips a band another lord is after; a lord within
  `PATROL_CONTACT` (30) of its band lets it go and scans again in 24 h (only one lord-band clash
  resolves a day). Before, every lord in reach took the nearest band and crossed the map beside
  it as one ball for days.
- **Besiegers and campaign armies stand on a ring** — each lord its own spot `SIEGE_RING` (90)
  from the place (angle from `Battle.idHash`), instead of a dozen parties on its centre pixel.
- **Wolves shun a party on the road** — a pack neither locks onto nor leans toward you while you
  stand on a road (its road rule pushes every target off it: packs used to orbit a siege camp on
  the high road for weeks). Off the road it hunts as before.
- **Spawns on land** — a band or wanderer placed around a coastal lair/village is clamped ashore
  before it appears (the first step snapped it up to 170 units).
Measured: seeds 1–16 × 40 days × 4 scenes, no find (before: 43 finds on seed 1 in 20 days, ~170
crowd finds on seeds 1–3).

### Fighting beside a clashing lord (#32)
No NPC-vs-NPC battle engine — a "clash" is detected at the moment of encounter
(`Game.clashContext(npc)`, another hostile party within `CLASH_RANGE`=260 units). Choosing to
help (`assistFight`) starts the battle against the foe at **70% of its roster** (already worn
down by the ally), and **the lord's men fight beside you** (1.32.1): `Battle.allyShare(size)` =
35% of his host, min 3, max `ALLY_CAP` 20, drawn from `Game.allyRoster(faction, level)` (recruit +
first rung of each branch, second rung at level 10+), tagged `allyOf` — they never touch your
party's XP or casualties, and `endBattle` takes his dead off his map party (floor 5). A win: +6
relation with the ally, +2 with their faction, +4 renown; a loss or a surrender grants nothing
(surrender now clears `assistAlly`, which used to leak into the next unrelated win).

**The band holding you prisoner** (`Game.holdsPlayer(npc)`) is off-limits to lords: patrols
neither pick it nor keep chasing it (a lord already on it drops the target on the spot), and the
daily `lordBanditTick` skips it — a patrolling lord used to walk beside your captor for the whole
captivity.

### Encounters & combat
- **Hostility** (`isHostile()`): marauders attack within 120 units, flee if you're 1.5× stronger
  (ramping up over the first 14 days). **A noble never flees** below an overwhelming threat
  (chase-vs-flee at `size × 1.5`) — nobles only attack you if you're a vassal of an enemy
  kingdom or relation ≤ −50; otherwise a collision opens dialogue, not a fight.
- Encounter modal: fight / send troops (auto-resolve) / flee / surrender. **The announced roster
  is the roster that fights** (`Game.fieldSize()` = leader + unwounded only, snapshotted at
  modal-open so a growing enemy doesn't retroactively change the fight you agreed to).
- **Withdraw chance depends on band kind**: a young (<14 day) bandit band gives 25% "walk away";
  an animal pack only backs off (50%) if you outnumber it 1.5×, no calendar effect.
- **Pre-battle troop chatter** (`troopChatter`): fear / hunger / wage-debt / courage / grumbling
  lines picked from live party state.

#### Fleeing, auto-resolve, and waves
- **Flee chance** (`fleeChance`): `clamp(0.1, 0.9, (speed ratio − 0.8) × 1.2)`; halved
  (`AMBUSH_FLEE`=0.5) while ambushed.
- **Auto-resolve** ("🎖️ Send Your Troops", available at 1.5× enemy strength in fighting men,
  `Battle.powerRatio`): same engine, no arena — `Battle.autoResolve()` feeds the normal
  `endBattle`. Loss rate `0.45 / strength ratio`
  (as low as 40% with Management), ±15% luck. Player never dies here, only loses health.
- **Waves**: at most `Battle.FIELD_CAP`(30) units/side on the field at once
  (`splitReserves`/`Battle.reserves`); once the field drops below 70% capacity, `reinforce()`
  sends the whole reserve on at once.

#### Routing and pursuit
A side whose remaining count (reserves included) drops below `ROUT_AT`(25%) breaks
(`Battle.routCheck`, skipped under `ROUT_MIN`=6 people): survivors run at `ROUT_SPEED`(×1.2)
toward their own spawn edge, don't fight, are never looted/captured/killed (removed from
`Battle.units` on leaving the field — your own routed troops survive in the party). Once the
enemy breaks, **🕊️ Let Them Go** (+3 honor) vs. doing nothing (chase down whoever you can catch
— speed determines who that is).

#### Enemy bands (`BAND_KINDS`)
**Population follows the player** (`Game.bandTarget`): target `10 + day/3 + renown/60`, clamped
10–34 — the world starts quiet and fills in with the calendar and the player's own renown
(not sight, which runs backward — smallest at day one). Refill is hourly
(`BAND_REFILL_HOURS`=6), stateless.

**A band comes from a lair**: `LAIR_COUNT`=9 bandit lairs (`state.sites`, `kind:'lair'`), each
spawned band bound to one; **the emptiest lair sends the next band** so population evens out
instead of piling onto one unlucky lair. An undiscovered lair is invisible until it enters sight
range. A lair grows daily (purse, headcount) and drains nearby settlements' prosperity
(`LAIR_RANGE`, doesn't stack when ranges overlap) until assaulted (`assaultLair` → normal battle
→ `Game.clearLair`); respawns every `LAIR_RESPAWN`=20 days. Since 2.2.0 a lair is also a place
you walk into — see **Bandit lairs (2.2.0)** below.

| Band | Character |
|---|---|
| Çapulcular | balanced, weakest |
| Orman Haydutları | archer-heavy, fast |
| Dağ Eşkıyaları | armored/tough, from day 20 |
| Kurt Sürüsü | very fast (104–112), `beast`: lunges from sight range ×1.6, never captured |

**Every bandit party is one of these kinds** (2.10.2): `Game.createBand(kind, size, name, color)` is
the only door — a quest's raiders keep their own name and colour and borrow a kind (Hasat
Çapulcuları and Karakol Baskıncıları are `bandit`, Kervan Baskıncıları `forest`, Sisteki Gölgeler
`mountain`). Those four were built with a bare `createNPC` until 2.10.2: no band, no kingdom, and
both the odds label and the battle fell through to Swadia's troop pool — a third of it sergeants,
sharpshooters and knights — dressed as looters. `Battle.foeKind(name, faction, band)` is the one
resolver `enemyMix` (the label) and `start` (the fight) read; a side with neither a band nor a
kingdom is logged (`Debug`, kind `roster`) and dealt as looters. A one-on-one (duel, arena,
tournament) and a boss deal from no army at all. `Save.apply` gives a saved bandless bandit the
`bandit` kind. Tests (`tools/test.js 'roster:'`): no `createNPC(…, 'bandit', …)` outside
`createBand`; for every band kind (under its own name and a quest's) and every kingdom the battle
fields no man the label didn't weigh; every quest in `QUESTS` is taken and its spawners run, and
every party they make has an army to deal from; forty arena foes, none mounted.

**No enemy scales with the calendar or your own strength** (#99, #132): every non-boss enemy —
bandit, faction soldier, boss guard — is a fixed level forever; only its `TROOP_TREES`/band-row
stats decide the fight. (It used to scale with `threatLevel()`, a wealth-proxy formula that
punished *not* upgrading far harder than it rewarded progress — an unpromoted recruit fighting a
day-200 lair band lost 77% of the time even at 25-vs-14 odds.) A lair's own `strength` still
grows with time (8→24) — an old lair is a *bigger* fight, not a *stronger* enemy.

#### Battle
2D top-down canvas arena, procedural terrain (hill/pit/forest/river; `worst()` — penalties don't
stack). Player: WASD move, click/space swings (hits only the single closest enemy in a 300ms
arc, `swingCd` recovery `max(0.45, 0.75−skill×0.005)`s). Mount (if `equipment.horse`): speed `95
+ agility×0.5 + (Riding−1)×3`; foot cap is `Battle.FOOT_MAX`=85 (below the slowest horse, so no
amount of Athletics out-runs a horse). **Charge** (`chargeMult`): `1 + speed ratio × (spear 1.6 /
other 0.6)`. A horse adds a flat +33% max-HP buffer (`baseMaxHp` stores the unbuffered value);
dismount at `baseMaxHp` (buffer spent), plus a 10% flat chance the horse dies for good.
**Charge stamina** (`chargeSpeed`): burns 2s, then 4s recovery at ×0.9, no passive regen (so
tapping the charge can't beat holding it) — same budget for player and AI.

**Horses** (`ITEMS`, 8 `type:'horse'` entries): each carries its own `hSpd`/`hDef` — a cheap
horse buys speed, an armored one survivability, price climbing faster than stats (diminishing
return per tier). Only the player's mount has these stats; army cavalry has fixed per-unit
stats.

**Block**: hold right-click/Shift, half-angle 60° toward the mouse (`blockFactor`). A shield
blocks front hits **entirely**, no shield reduces by 60%, side/behind is unblocked; can't swing
while blocking, speed ×0.65 (applies to the AI too). The enemy blocks too (same gate, raised
between swings).

**Bow**: `24 + Archery×2` arrows, spread shrinking with skill (±0.04 rad standing → +0.10
walking → +0.08 mounted).

**Damage types** (`Battle.afterArmor(type, raw, def, tgt)`, the single gate for melee and
arrows):

| Type | Defense effect | Dmg mult | Weapon |
|---|---|---|---|
| cutting | 100% | ×1.0 | Sword, War Axe |
| piercing | 50% | ×0.9 | Spear, arrow |
| blunt | 65% | ×0.8 | Mace — **stuns, doesn't kill**, 90% prisoner rate vs. 45% |

**Cadence**: every attack cooldown is dt-based, multiplied by `Battle.SWING_PACE`=1.6 — infantry
1.36–2.0s, archers 2.24–2.72s in play. (Damage is a weak lever on fight length; slowing the
*swing* is what makes armor and blocking matter — halving damage in a 20v20 only shaved 2s off
12.5s, slowing cadence added 4s.)

**Bodies collide** (`Battle.separate`): units closer than `(rA+rB)×1.35` push apart, weighted by
mass (mounted gives 0.3 of a foot soldier's push). O(n²) over the ~70 units a battle ever holds
— `// ponytail: bucket by grid if the unit cap ever rises`.

**Tactical orders** spawn as timed windows (`Battle.cmdSlots`; charge 1–2.5s, pursue 2.5–5s,
hold 4–7.5s) rather than sitting ready from the start; hidden entirely when `state.player.party`
is empty (duel/arena/solo encounter).

**Sprites**: animated pixel art (below) for every regular unit; the single cropped CraftPix frames
(`Battle.troopSprite()`) are only the placeholder while the atlases load. Tier (weak/normal/
armored) is fixed by the troop's identity, never live stats — the same named troop always looks
the same. Bosses get their own hand-drawn canvas silhouettes
(`Battle.bossSprite`), bigger than a regular unit.

**Animated soldiers (2.0.0)**: the player on foot with a melee weapon and every regular
infantry unit are drawn with the CraftPix Swordsman 1–3 (idle 12 / walk 6 / run 8 / attack 8 /
hurt 5 / death 7 frames, 4 facings). `tools/build-swordsman.js` crops each body/head/sword layer
sheet to its content and packs one atlas per level (`troops/swordsman_{1,2,3}.png`, the index
block in battle.js); the pack's red hurt overlay is not shipped, only its per-frame strength.
`Swordsman.art(look, anim, dir, t)` composes a frame — body and head from the armour level,
sword from the weapon level — recolours skin/hair/cloth by exact palette entry, paints the
helmet, crops to content and caches the canvas (LRU, 2500 frames); `Battle.unitArt` returns it
to both renderers with `_k` (1.25 field units per pixel, ~32 tall like the old tile), `_ax/_ay`
(feet anchor, placed `SPRITE_FOOT` = 14 below the unit's point) and `_pixel`.
- **Look** (`Battle.spriteLook`, pure): player armour none/<20 def/≥20 → level 1/2/3, weapon
  none/<400/≥400 dinars → 1/2/3, helmet def <5 cap, <12 nasal, else great helm — a new game
  starts in rags with a stick. Infantry: fixed `tier` → armour and weapon, helmet/hair/skin from
  an FNV hash of the unit id (no hair/skin variety under `Game.lite()`). Cloth: the side's
  kingdom (`playerCloth`/`enemyCloth` at `start`, allies their lord's), gold for an unsworn
  warband, brown for bandits. Bosses, beasts and the marked companions keep their own art.
- **Archers** (`Archer`): the Roguelike Kit's hooded archer — idle 4 / walk 6 / attack 4 / hurt 2
  / death 8 frames of 32×32, facing down/side/up (the side strip is drawn facing left; right is its mirror), one strip per row in
  `troops/archer_anim.png` (`ARCHER_INDEX`). Cloth greens dyed like the swordsmen's, drawn at
  1.5 units per pixel; the release lands on attack frame 2 when `shotT` resets
  (`Battle.archerAnim`). Standing between shots it faces `shotA`, its last target, not the
  way it last walked, and while it steps back from a close enemy (within 2 s of a shot) it
  walks backwards facing it. The player with a bow is one too.
- **Riders** (`Horse` + `Mounted`): neither pack has a horse, so `Horse` rasterises one (barrel,
  chest, rump, neck, head, two-segment legs) onto a 48×36 grid, shades by edge and outlines it.
  Each leg runs one stride cycle, offset in time: gallop = rotary footfalls with a moment in the
  air (8 × 70 ms), walk = four-beat lateral (8 × 115 ms, three feet always down); the fore knee
  tucks the hoof back, the hind hock tucks it forward. `Mounted.art` seats the Swordsman's upper
  body (cut 7 px above the feet) on the saddle; the horse faces left/right only, walks under
  60 u/s and gallops above (`Battle.mountAnim`); a fallen rider lies beside a horse that bolts
  and fades. Saddle cloth takes the side's colour; coat: the player's horse by price
  (< 1000 bay, < 2000 grey, else black), troops by tier. Mounted archers ride the same way. The
  Battle for Wesnoth cavalry art (GPL) is no longer shipped.
- **Anim** (`Battle.spriteAnim`, pure): death from `deadT`, the player's swing mapped onto
  `attackTimer`, an AI swing from its striking frame on `atkT`, hurt for 0.42 s of `hitT`, walk /
  run (> 95 u/s) while moving, else idle; facing from mouse (player), velocity, last swing,
  last velocity. `unitPose` drops hop/sway/lean/squash for these units (the frames carry them) and
  fades the fallen out between 0.9 and `SPRITE_DIE_T` = 1.3 s (`Battle.dieT`).
- **Helmets** are drawn by hand once per facing (plus a half-turned side pose) and placed per
  frame at the offset that best matches the frame's head to the reference; a fallen head is
  matched against the reference turned ±45/±90/180°. Fits are cached per (level, anim, facing,
  frame, helmet).

Measured (headless Chromium, 1366×768): first bake 0.24 ms per foot frame, a cached lookup 2 µs;
a death frame with a turned helmet 7.8 ms the first time (once per combination); a rider frame
2.1 ms first time (horse + rider), an archer frame 0.5 ms. `archer_anim.png` 17 KB. Atlases 69–73 KB
each, 1024×304–344 px — about 4 MB decoded for all three, against ~35 MB for the raw sheets.

**Performance**: target search runs every 0.3–0.5s per unit, not every frame; particle ceilings
(sparks 120, floating text 40, blood 200, corpses 60); everyone is clamped to the arena (a
12-unit edge margin) so a routing archer can't run off-map and lock the battle. If the player
dies mid-battle, they're knocked out (not eliminated) and the fight continues at half reward on
a win.

**Victory**: `(10 + level×5)` loot per enemy × Looting skill, +3 renown, XP; **reward shrinks
with the strength ratio** (`Battle.rewardScale` on the foe's share, exempt for bosses) so farming
weak enemies stops paying past a point. **Defeat**: party scatters, 60–90% of money lost, HP→30%,
taken prisoner, renown burns (`Game.defeatRenown`, scaled by how outmatched you were — the same
foe's share, 2.10.2).

### Taking prisoners (the player's own prisoners)
45% of downed enemies are captured in a won battle (not the boss fight). Capacity `5 +
(Prisoner Management−1)×3`; value `(25+level×12) × (cavalry 1.5/archer 1.2/infantry 1)`, sold at
the town's ⛓️ Slave Trader. `max(1%, 6%−skill×0.5%)` daily escape chance (nobles never escape).
A captured lord: demand ransom (2500–4500₺, −20 relation) or release honorably (+25 relation,
+3 renown); either way they respawn near home in a shrunken party.

### Captivity (the player's own captivity)
Single model: `Game.beginCaptivity(npc, days)` → `state.player.prisoner`. Locked to the captor's
location; the captor's party is the only one that moves (the player's own icon isn't drawn).
"Plan an escape" ramps escape chance 0→80 on a slowing curve; one attempt/day, failure costs −60
and resets the plan. At the deadline: 40% free escape, else a ransom modal (75–90% of money).

### Diplomacy — war between kingdoms (#20)
`state.wars = { 'a|b': start day }`. **An independent player has a banner too**
(`Game.playerFaction()` returns `'player'`, not `null`) — an enemy town's gates close, a lord
attacks, exactly like any real front; raiding a village is how an independent player opens a
war. `Game.warTick()` daily: nearby enemy lords clash (winner loses ~20%, loser ~70%, a
scattered party respawns 4–10 days later), a strong-enough army besieges a settlement over `AI_SIEGE_DAYS` (12) days at its walls, and 35% of a wartime lord's movement targets an enemy settlement.
**The besieger holds the walls** (2.4.4): `updateNPCs` keeps it on its ring spot, the army already
besieging a place carries on (a new one comes from lords not besieging), and a siege is dropped
the day its army is 500+ units away, no longer outnumbers the garrison ×1.3, made peace, or the
place became its owner's last holding. Before, it wandered off, the day count survived separate
visits, and whichever lord was in reach could reset it; with honest sieges, 3 days tripled the
conquests. Measured (`sim.js --days 200 --seed 1-5`): conquered 6–19 (before 7–12), campaigns
23–26, wars 16–21, peace 15–22, raids 264–396, prosperity 61.3–71.8, 0 kingdoms erased.

### Marshal, campaign call, and alliance (#36)
A kingdom at war has a 15%/day chance of picking a **marshal** (`pickMarshal`, biggest lord
party excluding the king) with a target settlement; other lords of that kingdom then have a 70%
chance of marching toward that target instead of scattering — this is what turns "at war" into
an actual siege. A campaign ends on target-fall/peace/16 days, cooldown 7 days.

As a vassal, joining a call and showing up (within 1200 units) earns +15 renown/+8 relation on
success; pledging and never showing costs king −8/lords −3 — the most expensive option.
Alliances form (5%/day) between two peaceful kingdoms sharing an enemy and open every one of the
ally's fronts to you too. A kingdom down to its last town/keep can't be besieged, and one down
to 2 fiefs gets a much better peace chance — no kingdom gets wiped out.

### Sieges & founding a kingdom (#25)
Three stages: **camp** (pick a method: 🪜 Ladder 1-day prep/+40% defender advantage or 🗼 Siege
Tower 3-day prep/+15%) → **preparation/starvation** (garrison erodes 7%/day while you wait, a
25% daily chance of a relief army setting out) → **assault** (`Battle.siege`: a wall across 66%
of the arena, the defender holds the breach's mouth, arrows pass over the wall like a rock).
Winning transfers the settlement to your liege (or founds your own kingdom if independent) and
declares war on the former owner.

**The camp is the army at the walls** (2.4.4, `Game.holdSiege()`, run every frame and at the
start of `siegeTick`/`assaultSiege`): within `SIEGE_REACH` (150) units an encounter leaves the
siege paused and the party goes back to it; farther (a map click, a captor) lifts it. The siege
used to stay behind — days kept ticking and the walls could be assaulted from across the map.
**The relief marches** (`siegeRelief`): the nearest enemy lord within 2500 gets `reliefLocId`,
one relief at a time, and the camp hears of it in the news; it walks to you (it doesn't flee the
army it came for), and at `RELIEF_REACH` (120) `checkRelief` opens the meet-or-lift choice. It
used to be set down at the gate the instant it was rolled.

### Fief management (#23)
`loc.owner === 'player'` opens tax (`Game.fiefTax(loc)` = `prosperity × (town 2/keep 0.7/village
1)`), garrison (`loc.garrison[]`, real troops that don't count against party capacity but do add
wage to `upkeep()`), and storage (`loc.storage[]`, food here doesn't spoil and isn't looted on
defeat). Stuffing a garrison with elite troops is usually a net loss — wage scales with level,
tax doesn't. An undefended fief (garrison below the siege threshold) falls to the first passing
enemy lord. A vassal can ask their liege for unowned land past a renown gate
(`FIEF_GATE`=300, +200/fief already held) + relation ≥20.

### Vassals — granting fiefs as king (#40)
Once you found your own kingdom, you grant fiefs to keep lords (no fief, no fealty, same rule as
Warband). Inviting a lord needs relation ≥25 + a spare fief; a vassal's party then fights under
your banner and their old kingdom's lords lose −10 relation. **Tribute**: 30% of the vassal's
fief tax comes to you daily; granting a fief gives it its garrison too (no longer your wage
burden) and +20 relation (other landless vassals −5, jealousy).

### Tournament, betting, and the arena (#26)
**Tournament**: a real 8-fighter bracket (lords, 7 traveling regulars, companions, you) fought
on the real `Battle` engine — wooden weapons, blunt damage, nobody dies. Rounds you're not in
are rolled (`a.lv/(a.lv+b.lv)`); the city keeps a remembered champion even after you're
eliminated. Prize: Çeyrek Final 50 / Yarı Final 150 / Final 500+20 renown. Betting odds read off
the actual field strength (`tourneyOdds`, clamped 1.2–6), not a fixed table. Fought in a round
sand-pit arena, not the open-field terrain generator.

**The chicken-chase minigame** (`TournamentMinigame`) is only the quest's chicken chase. Its old
click-rounds tournament mode (bet, gear draws, rounds) was removed in 2.4.2: unreachable, it still
sent a `tournament_end` without `wins`, which would have failed the fixed-match quest on every
entry. `Game.tournamentFinished(won, wins)` is the bracket's one result hook.

**Arena** (`Battle.startArena`): always open, no party/loot/renown/prisoners — practice against
a leveled foe, always infantry (an archer would kite a 1v1 forever). A win pays a small purse
(`ARENA_PURSE`=10, scaled by town prosperity) with a 5-fight streak bonus; a loss pays **no XP**
(it used to pay 40%, making deliberate losses the fastest weapon-skill grind in the game).
The ladder's novice (`ARENA_FOES[0]`) carries `def: 0, hpMul: 0.7` (2.2.1). Measured, a fresh
hero (no weapon, proficiency 1) against it: 5 damage a hit, down in 8 (before: defense 6 and 56
hp — the swing sank to the armour floor, 1 a hit, and a shielded hero took 1 back).

### Bosses and relics (#37, #38, #132)
4 renown-gated bosses surface as unique solo units (Kurt Ana 60 renown, Bozkır Hanı 130, Demirci
Dev 200, Korsan Kral 280) plus a 5th final boss (Savaş Tanrısı, only revealed by the `boss_map`
item once all 4 relics + 300 peak renown are held). No escort troops any more — each boss is one
tough unit with its own hp/attack/defense and a **dodgable signature attack**
(`Battle.updateBossSpecial`: idle → telegraph → strike → recovery, one shared state machine, 5
data-driven configs). Each drops a unique unsellable item and a **relic** (`RELICS`, one-of-a-
kind permanent bonus, kept through captivity): Kurt Kanı (+map speed), Bozkır Tuğu (+morale),
Demir Yürek (+max HP%), Fırtına Tılsımı (+loot%), Tüccar Mink (+trade edge, buyable for 6000₺
instead of a drop), and the final boss's Kalradya Sancağı (+attack, +party cap, +cargo%).

### Daily event pool (#35)
`Game.dailyEvent()` rolls at day-end: `EVENT_CHANCE`=0.35. Pool is `Game.DAY_EVENTS` (mostly
negative, contextual `when(ctx)` filters — near a settlement / mounted / near a village etc.).
Costs are small (morale, a little food, a small fine, a wounded troop; theft capped at 250₺);
positives are a small purse, food, morale, a road recruit.

### Who may stop you (#131)
Two different things: **you chose it** (`setTarget`→arrival always opens, no gate) vs. **it
happened to you** (collision at `d<24`, gated by `Game.npcCanInitiateEncounter(npc)` =
`isHostile(npc) || partiesTargetEachOther(npc)`). A friendly/neutral lord or any trade party
never interrupts you by merely crossing your path — only something hostile, or something either
side was actually heading toward, does.

### Road events — encounters with a decision (#67)
`Game.ROAD_EVENTS` (30 options across ~2–3 choices each, real costs: money/hours/morale/honor/a
wound/a fight). The roll is **distance-based**, not daily: every `ROAD_EVERY`=1200 units,
`ROAD_CHANCE`=0.5, then a **quiet period** (`ROAD_QUIET`=2400) after a hit — so the shortest
possible gap between two road events is 3600 units, never back-to-back. Shares its context
(`Game.eventCtx()`), picker (`Game.pickEvent`), and last-12-events repeat filter with the daily
event pool — one machine, two pools.

### Hail and winter (#121)
**Hail**: a 10-second timed road event (`storm.timer`), can't be dismissed. Choosing (or timing
out into a random choice) starts an 8-hour storm: extra food burn, and either **shelter** (skips
the hours) or **walk** (2 unwounded troops/hour take a hit, 25% die outright, companions only
wounded).

**Winter**: last 20 of every 120-day year. Burns `coalNeed()` = `⌈(party+1)/10⌉` coal/day; short
of it, the day is **cold** (morale capped at 40, and after 3 cold days 5% of troops die/day —
never a companion/spouse).

### Wanderers — the only way a stranger joins (#119)
No road/day event adds a troop directly any more — a stranger walks the map as its own sprite
(`type: 'wanderer'`, 5 stories: deserter/runaway/chained/deserters/orphan) and you choose whether
to approach. Daily upkeep keeps up to `WANDERER_MAX`=4 on the map, each living `WANDERER_LIFE`=4
days before moving on. Never hostile, never a bandit, never prey.

### Debug report (#52)
🐞 Debug Report (`Debug.open()`). `Debug.errors` is a 25-entry ring buffer catching
`window.onerror`/`unhandledrejection`/wrapped `console.error`; the report (`Debug.report()`)
bundles game state, rendering status (target/effective fps, frame divisor, canvas sizes, and
`battleRenderer`: setting, active renderer, GPU string, resolution, draw calls, smoothed CPU ms for
`update`/`render` per drawn frame; `mapRenderer` (1.34.0): setting, active, resolution, draw calls,
CPU ms per map frame),
browser info, and the error list — every field wrapped in try/catch so the reporter itself can't
throw. Copy-to-clipboard or download as JSON.

### Save system
Versioned, migratable, exportable (`webband_save_<slot>`: `1/2/3` manual + `a1..a5` autosave
ring + `legacy`). `state.meta = { v, version, createdAt, playtime, autoIdx }`. `Save.auto()`
fires at the start of every game day. A corrupt save is moved to `webband_broken_<time>`, never
silently deleted. **The migration chain** `Save.migrate(d)` lives in one place, one `if` block
per version bump — never scattered `if`s inside `load()`.

**Surviving the browser (#132).** localStorage is best-effort: Safari clears it after 7 days
without a visit, Chrome when the disk fills. The first successful `Save.write` asks
`navigator.storage.persist()` once; the panel reads `persisted()` and says whether it held.
The panel's **⬇️ Dosyaya Yedekle** downloads the snapshot as `webband-kayit-gun<N>.json`
(`Debug.saveAs`, the debug report's own download) and stamps `webband_lastBackup`; with no
backup, or one older than `BACKUP_DAYS` (7), the panel says so. **📂 Dosyadan Yükle** and the
pasted-text import share `Save.importText`: parse → check → `migrate` → slot 1 → `apply`; a
refused file never touches an existing save. e2e: backup → `localStorage.clear()` → reload →
load the file → name, day and money match.

**A load starts from a fresh world (2.4.6, #147).** `Save.apply` used to merge the save into the
running game, so what the save didn't carry kept the running game's value. A field left out of the
JSON (`undefined`: a settlement's `treasury`, `storage`, `owner`, `garrison`…) and the tables the
save never holds (`LORDS`' factions, `FACTIONS.player_kingdom`) all outlived an in-game load. Save,
deposit 4000 in a fief's treasury, load: the purse was 5000 again and the treasury still held 4000,
a money pump; the storehouse duplicated items; a castle taken, a lord sworn in, a kingdom founded
after the save stayed. `Save.keepFresh()` copies `state`, `LOCATIONS`, `FACTIONS` and `LORDS` at the
end of `Game.init` (the world a just-opened page has). `apply` first `resetWorld()`s to that copy,
in place (`resetInto`, so `state.player` and each settlement keep their identity), then merges the
save as before. A field an old save lacks still gets its default, now the fresh page's, not the
running game's. `state.settings` is kept out of the reset: settings are the device's, and the save's
merge over them as they always did. Gate: `tools/test.js` "kayıt ara durumda (#147)". Each
in-between state (tournament between rounds, siege camp, ladder day, a wait, a quest awaiting its
hand-in, an open encounter, captivity, a feast) is saved and loaded twice, into a just-opened
world and into a game sitting in the next scene. The snapshot must come back identical, the
invariants hold, and the scene carries on. A last test covers the treasury/storehouse/castle/vassal/
kingdom leftovers; e2e `menus.spec` loads from the save panel mid-game. Measured: all eight
in-between states resumed correctly before the fix too — the leak was only in what a save leaves out.

### Rules the game checks on itself (2.4.0)
`Debug.invariants()` lists what no legitimate play breaks: finite money (≥ 0), hp, renown,
position and morale; hp ≤ maxHp; a party within capacity + 5, unique troop ids, every troop of a
known type; items of a known id with qty > 0; prosperity 0–100, stock ≥ 0, a known faction per
settlement; finite, non-empty parties on the map; finite relations. `Debug.checkInvariants(where)`
runs it at the end of every game day and after every battle and logs each *kind* of break once
(kind `kural`): the red badge, the debug report (`invariants`), every e2e run and the nightly
career see it. `tools/career.js` uses the same list.

### 🐞 Hata Bildir — in-game bug report (2.4.0)
From the pause menu, the phone's ⋯ Daha menu, the battle and lair pause menus and the debug
report. `Debug.capture()` composites every canvas on screen into a JPEG (≤ 1600 px; the WebGL
ones are drawn and read in the same task), taken as the form opens; the player can remove it and
add up to three pictures of their own (`shrink`, JPEG ≤ ~1.4 MB). `Debug.sendBug()` posts text,
screenshots, version, language, device and the debug report to `/api/webband/report` on the
same origin — a route of the `serkanozelme` Cloudflare Worker (blog repo,
`src/services/webbandReport.ts`) that rate-limits per IP (2/min), checks sizes and image magic
bytes, commits the screenshots to the Webband repo's `player-reports` branch and opens an issue
labelled `player-report` with them inline. The token is the Worker secret `WEBBAND_GITHUB_TOKEN`
(fine-grained, Webband only: Issues + Contents write). Without it (503), offline, or on a local
copy (404) the form offers the prefilled GitHub page and the report file instead. e2e:
`report.spec.js` (endpoint mocked). The text is public: players are told so on the form.

### Error visibility: badge and loop shield
`Debug.guard(where, fn)` wraps the body of all three rAF loops — an exception is swallowed and
logged (deduped by signature), but `requestAnimationFrame` on the next line still runs, so the
loop survives instead of freezing the screen. `#err-badge` (bottom-right) surfaces the count.

### Settings screen
One gate: `Game.opt(k)`/`setOpt(k,v)`, defaults in `Game.OPTS`, `state.settings` stores only
deviations. Rows: sound/volume, reduce motion (System/On/Off), blood & corpses, frame-skip gate
toggle, font size, autosave, 🖱️ edge panning (Device-dependent/On/Off), 📱 lite mode
(Device-dependent/On/Off), 🎯 frame-rate target (Device-dependent/60/30, `Game.targetFps()`),
🧩 map and battle renderer (Device-dependent/WebGL/Canvas, `Game.opt('renderer')`), ⚔️ difficulty.

### Accessibility pass
Team rings are distinguished by **dash pattern**, not just color (enemy dashed, friendly solid —
their gray values are only 13/255 apart, so shape carries the distinction on a grayscale
screen). Modal keyboard: Esc closes (except an open encounter modal), Enter presses the primary
button.

### Touch and mobile
Three separate questions, three separate knobs — never one "mobile mode" switch, because they
diverge even on the same device (a tablet: coarse pointer + wide screen):

| Question | Knob | Default |
|---|---|---|
| How is it entered? | `Game.isTouch()` = `pointer: coarse` | — |
| How does it lay out? | `@media (max-width: 820px / 430px)` | — |
| How much is drawn? | `Game.lite()` | `'auto'` = adaptive rung, starts at `isTouch()` (1.31.5) |
| Does it edge-pan? | `Game.edgePan()` | `'auto'` = `!isTouch()` |

- **One input gate**: pointer events (not mouse-specific listeners) drive both mouse and touch.
  One-finger drag pans the camera (same code path as WASD), two fingers pinch-zoom, a short tap
  sets a target, a long tap (≥450ms) opens the tooltip without setting one.
- **A dropped `pointerup`/`pointercancel`** (backgrounding mid-touch on iOS/Android) used to
  leave a ghost finger that made every future tap read as multi-touch — fixed by clearing the
  tracked-touch map on any *primary* pointerdown (a browser-guaranteed "nothing else is really
  down" signal).
- **Battle controls** (`#touch-ui`): left stick = movement (writes into `Input.keys`, same as
  WASD), right stick = aim + swing on lift (same `Input.mouse` the engine already reads), 🛡️
  block button, a row of command buttons. No second input path into the battle engine anywhere.
- **Narrow layout** (`≤820px`): side menu becomes a bottom strip, HUD/modal/market reflow;
  `≤430px` additionally shrinks HUD text and hides keyboard digits from command buttons.
  `body.in-battle` (set only under `pointer: coarse`) hides the campaign bar and menu strip
  during a fight so the whole screen is arena.
- **One scroller per window, nothing slides** (2.4.5): a screen, view or window never scrolls
  sideways, no box scrolls both ways, and no scroll box sits inside a scrolling window. The
  start screen slid 24px sideways under the thumb (its title's 130%-wide glow) and scrolled on a
  phone with its browser bars showing (796px of content in iPhone Safari's 390×664); the start
  screen's Lordlar/Krallıklar list was a 250px box scrolling both ways inside the modal; the
  achievements list scrolled inside its scrolling window on desktop. `#start-screen` clips
  sideways (`overflow-x: hidden`, `overscroll-behavior: contain`) and drops its ornaments under
  760px tall. Gate: `e2e/specs/mobile.spec.js` — a walk that opens every window one level deep
  from each root screen (every button whose handler only opens something, every settlement
  action with a window, a mid-game party/bag/prisoners/quests) and runs the shared `audit()`
  (`e2e/fixtures.js`, also `ux.spec`) on each; touch swipes on the start screen and the map
  bars must move nothing; the start screen fits 390×664; a scenes test audits the lair's scouting
  card, its how-to, the lair, its result card and the tournament. The Turkish phone walks at 360×640 (the narrowest common
  Android), the English one at the Pixel 7's 412. Measured: 47 windows on a phone, 45 on desktop.
  At 360 the walk found the slave merchant's "Sat (+n)" and the bug form's buttons squeezed under
  their labels. The lair card's intel (`max-height: 38vh`) and how-to (`60vh`) boxes are gone:
  unboxed, the three ways in still end on screen (702 px of 720, 705 of 768). The walk also found an achievement toast that ate taps for 5 s over the bottom bar
  (now `pointer-events: none`) and the prisoner list's "Salıver" squeezed under its label.
- **Battle camera zoom** (`Battle.camZoomFor`, 1.31.5): desktop keeps `CAM_ZOOM` 2.3; on touch
  the screen's short side shows `MOBILE_VIEW` = 280 arena px (clamped 1.2–2.3) — 1.39 on a
  390px-wide iPhone, which shows ~1.65× the width 2.3 did.
- Touch targets ≥44px (WCAG 2.5.5). `100dvh` (not `100vh`) so iOS's toolbar-hide doesn't leave
  the layout taller than the visible viewport. Tooltip hover becomes tap-to-toggle
  (`.tip-open`) on a coarse pointer.
- **Tutorial** (`Game.startTutorial()`, first playthrough only, gated by `localStorage
  webband_tutor_done`): 6 steps, mouse/finger text picked by `isTouch()`; a battle tutorial
  (`BATTLE_TUTOR`) fires the same way from `Battle.start`, pausing `Battle.update` but not
  `render` while open.

### The language layer — Turkish, English, Indonesian
One rule: **the key is the Turkish source text itself** (`T('New Game')` /
`` T`${n} troops joined` ``, tagged-template placeholders numbered `{0}`/`{1}` so word order can
differ by language). Missing translation → Turkish falls onto the screen (never an empty box).
`lang-en.js`/`lang-id.js` are flat generated tables (currently ~2900 keys each; this grows with
every feature — `tools/test.js`'s i18n assertions are the sync gate, not this number).

**Raw stays, translate at display**: a `T(...)` call inside a top-level data table runs before
`I18N.load()` and freezes to Turkish forever — tables (`BAND_KINDS`, `SITE_KINDS`, quest
`title`s, etc.) stay raw, every **display** site calls `T()`. This also keeps name-based
comparisons (`terrain.name === 'Orman'`) language-independent. Three bug classes and how they're
caught: missing translation (`I18N.missing`), double translation (also `I18N.missing` — the
English string gets recorded as a bogus key), and "never touches `T` at all" (**no counter sees
this one** — a data field's *every* display path still needs checking by hand when it's
added). Since 2.0.0 `e2e/specs/i18n.spec.js` sweeps the screens a new player sees (creation,
map + its hidden HUD tooltips, every menu, a fight and both result tabs, a town and three of
its rooms, a village, a castle) on EN/ID and fails on any text, `title`, `aria-label` or
placeholder that is exactly a dictionary key whose translation differs. Its first run found
the F11 hint's close button reading "Kapat" aloud: static `aria-label`s were not translated.
`I18N.ATTRS` now covers them next to `title`/`placeholder`. Only screens the sweep visits are
covered. A string that reaches the screen only after a week of play still needs the manual
pass.

**The pseudo-locale `xx` (2.4.0)** closes the "never touches `T`" gap for good. Not in the menu;
the e2e project `xx-desktop` and the nightly hunt run in it. `I18N.pseudo(key)` returns the key
with every letter circled (`Beni Bul` → `Ⓑⓔⓝⓘ Ⓑⓤⓛ`), markup, `{n}` and entities untouched; a
key counts as known if the English dictionary has it. A circled letter is a Unicode *symbol*,
not a letter, and cutting or splitting a translation keeps it circled. The fixture then fails on:
- a plain-letter word on screen (it never went through `T()`), except the hero's typed name and
  anything under `translate="no"` (a track's title, a renderer's name, a date);
- a circled key reaching `T()` (`I18N.doubled`, a translation translated again — also recorded
  in every player's debug report, from the reverse lookup of the dictionary's values);
- circled text anywhere in `Save.snapshot()` (a translation frozen into the state) — no exceptions
  since 2.4.1.
Its first runs found item and village names printed raw in 17 quest lines ("10 units Demir" in
English), `21.1 saat` in the wait panel, a raw `dinar` in the dowry and the treasury, the
caravan's translated people-name and five translated NPC/boss names stored in the save, and the
lords' line memory keeping translated lines. Layout checks skip `xx` (circled glyphs are wider
than any real script). **Language independence**: `tools/career.js --lang xx` plays the same
career in the pseudo-locale and compares the whole save day by day: the language layer only
changes words, so the worlds must never part; the nightly job runs it on eight seeds.

**Key extraction** (`tools/i18n-keys.js`) recurses into a template's `${…}` (a T inside another
T's placeholder used to be invisible) and only takes `//` or `/*` after whitespace as a comment
(`accept="image/*"` once hid every key below it).
**Leak gate** (`leakedT`, 2.4.1): a `T` call (not `Tx`) in a statement that assigns to or pushes
into `state.…`, or a `${T(…)}` baked into an `onclick` attribute, fails `tools/test.js` — it reads
every line, where the pseudo-locale's save check only sees the paths a test walks. Its first run
found the prisoner trader's per-group Sell and the party screen's Set free passing the translated
troop name to a handler that matched it against the raw one: both did nothing on EN/ID.

Language picked once on first launch (`#lang-ask`), stored in `localStorage.webband_lang`,
changeable anytime from Settings — a live screen rebuilds its own text, no restart needed. The
screen under the Settings window too (2.4.7, #150): `setLang` redrew Settings and returned before
the open screen, and the quests screen kept the old language until something else redrew it.
**Stored text** (2.4.1): words that are kept in the state — a news line (`state.warLog[].msg`), a
map mark's `label` — are built with `Tx`, `T`'s twin with the same two call forms, which returns
the key and its values as data (`{ t, a }`, values may nest, an array is parts joined) instead of
the text. `I18N.show(v)` words it in the language on show, so a switch rewords the whole feed.
`Game.factionTx/facTx/peopleTx/npcTx` are the stored forms of the name helpers, and the text
helpers are `show()` of them — one source. A plain string is a value shown as is: a hero's name,
or an old save's already worded line (no migration; they age out of the 20-line feed). The key
extractor takes `Tx` like `T`.

### Balance visibility
What changed isn't the numbers, it's whether the player **sees** them before committing: peak
renown gates (`Game.peakRenown()`, never drops even after losing renown), an easy-prey warning
before a fight (`Game.preyWarning`), a fief's net income shown as `tax − wage = net`, a
starving-troop marker on the party screen, the boss-map's renown requirement shown up front, and
a caravan's cargo openly scaling with its guard count (more guards = richer, not a free-lunch
weak target).

### Time is a resource: camp
`Game.startWait(hours)` — the ⏳ Wait button (1h/8h/1 day/3 days/until dawn) runs time at
`timeScale × WAIT_SCALE`(×4) while `state.player.wait = { until }`/`status = 'waiting'` is set.
Any encounter interrupts it (`triggerEncounter`'s first line calls `stopWait()`). Resting at a
tavern also costs 8 hours now, not just 10 denars.

**The camp perimeter** (`CAMP_SAFE_RADIUS` 120) only repels: a hostile party whose target lies
inside it (a pursuer, a blood-feud hunt, a wander point on the tent) holds at its edge. It no
longer pulls in every hostile within `sense` (2.2.1). Measured (seeds 1–5, day 25, lone hero in a
friendly city, 72 h wait): hostile parties within 200 at the end 0/0/0/0/0 (before: 6/7/12/3/5,
every one of them had never noticed the hero).

### Honor — the second reputation axis
`state.player.honor` (−100..100); the old "bandit stain"/infamy label is just its negative side
(`Game.infamy()` = `−honor`). Raiding a village is −12, robbing peacetime trade is −5/−8,
sparing a routed foe is +3, releasing a noble captive with honor is +5, abducting a lady −20.
Decays 0.5/day (infamy only 0.15, and not at all on a day you raided) — good behavior fades
faster than bad behavior does, on purpose. Tiers: ≥40 ⚜️Honorable, ≥15 🕊️True to Their Word,
≤−10 🔥Raider, ≤−36 💀Village Burner. Affects: volunteer count/wage (`volunteerTerms()` — the
penalty side is cubed, the bonus side stays linear, so dishonor has real teeth without making
honor a farmable discount), village market rates, mercenary price, how nobles weigh your word
(depends on *their* personality — a cunning lord respects infamy more than a good-natured one
does), and the feast gate (`Feast.HONOR_REQ`=−30).

### Blood feud — the world remembers you
`state.grudges[lordId] = day opened`, `GRUDGE_DAYS`=30. Burning a lord's village, robbing their
nearest caravan, or ransoming them opens a feud (releasing with honor clears it). A feuding lord
**always** attacks regardless of war/relation state, and has a 50% chance of actively hunting you
instead of going home.

### The goal chain — `AMBITIONS`
Battle Brothers-style chain, without the picking (2.7.1): every open goal counts at once;
completing one rewards renown/honor and opens the next (party≥10 → tournament win / a friend lord →
sworn oath → blood price / a landholder), and a goal it opens that already holds pays in the same
`ambitionTick`. Until 2.7.1 one goal had to be picked first, so a party of ten sat unrewarded until
the player clicked it. Pure data + a daily `check()`, shown at the top of the Quests tab.

### Achievements
50 one-time milestones (`ACHIEVEMENTS`), swept daily and on the Quests tab
(`Game.checkAchievements`). State-based conditions plus a `state.career` tally
(`Game.tally`/`careerBattle`) for things state alone can't answer (kill counts, best winning
odds, a no-losses win, etc). Each tier pays once (bronze 200₺, silver 650₺, gold 2000₺+20
renown) — deliberately not a stacking permanent bonus (that's what `RELICS` is for). A gold
achievement's name becomes a cosmetic title shown on the character screen.

### Enterprise and the fief treasury
**Enterprise** (`Game.buyEnterprise`, 3000₺; asks first — the card and the scene's building
both call it): `prosperity × 0.55`/day, folded into `fiefIncome()`
as a `trade` line; earnings stop (not lost) while at war with the town. **Treasury**
(`loc.treasury`): money deposited here isn't looted on defeat — `Game.defeatLootRatio()` =
`0.6 + 0.3 × (1 − share in treasury)` only touches the purse on hand, so storage is real
insurance.

### Rumours — information has a price
👂 Listen at the tavern: 20₺, 2–4 hours. Spotting skill gates **which stories reach you** and
**how often they're wrong** (tier 1 direction-only/45% lies → tier 3 numbers-and-dates/5% lies).
A false rumor is always a true story pinned to the wrong place, not an invented one — one
generator, one `L()` location-swap function, no duplicated prose. The guild price ledger costs
50₺/town/day (free to re-check the same day).

### Renown gates above 300
Three late-game unlocks (`Game.RENOWN_GATES`, gated on `peakRenown()` so losing renown never
revokes them):
- **300 — tribute right** (independent only): outweigh 80% of a village's militia, no siege
  needed; costs relation/prosperity, pays 40% of `fiefTax` daily.
- **500 — envoy embassy**: send a companion to negotiate relation or a truce (they leave the
  party for 3–6 days — their skill leaves with them, the real cost).
- **800 — marshal candidacy** (vassal only): as marshal, *you* pick the campaign target instead
  of being summoned to one.

## Bandit lairs (2.2.0)

`lair.js` (`Lair`): a lair on the map (`state.sites`, `kind:'lair'`) is a place you can walk into.
Clicking it opens the **scouting card** (`Lair.brief`), not a straight battle. Measured numbers
below come from `Lair._bench` in headless Chromium (software raster, so a real GPU is faster).

**Which lair.** Fifteen hand-drawn levels — `house` (Değirmencinin Evi, 30×13), `cave` (Yarasa
İni, 32×17), `camp` (Kurt Tepesi, 34×21) and the twelve hideouts of 2.9.0 (below) — and the mine
(2.7.0, below). A site's level is `s.layout` if set, else `hash(s.id) % 3` over the first three: a
lair spawned before 2.9.0 keeps the level its id always gave it. Day or night comes from `Game.isNight()`: at
night the `night: 'sleep'` guards lie on bedrolls and the ambient light drops (house .34 → .07).

**The scouting card** reads `Game.profLvl('spotting')` (companions count). Thresholds
(`Lair.INTEL`): ≥2 the real guard count, the ways in and the prisoners (below that a vague
range and one entrance); ≥4 the sketch, guard posts and rounds, the traps (trapped chests and
spikes start *known* in the lair too, and the minimap is revealed); ≥5 whether an ambush is laid;
≥7 the secret way in and the leader's habits. The ambush is rolled once per lair per day
(`s.lairAmbush`, 40%), so reopening the card doesn't reroll what the scout saw; it's consumed on
entry. An active **İndeki Soylu** quest adds a 📜 line naming who is held there.

**Three ways in.** *Alone*. *With soldiers*: `min(6, 1 + ⌊İdare/2⌋)` of your healthiest
(non-wounded, highest level first), disabled with none. *Whole army*: the ordinary battle
(`Game.assaultLair(id, 1.35)`) against 1.35× the lair's count — the bandits whistle for help; the
card says so in orange before you pick it. A win still goes through `Game.clearLair`.

**Stealth model** (unchanged from the playtested prototype). A guard sees in a cone: half-angle
1.25 rad (143°), dice players .85, the tower lookout .95 at 1.75× range. Range =
`220 × (.3 + .7 × light) × (crouched .78)`; alert or searching ×1.25. Suspicion fills at
`4.2 × (.45 + light) × (1.35 − d/range) × (crouched .6) × (standing still .7) × (a follower .75) ×
(within 48 px ×2.5)` per second and drains .22/s; >.35 suspicious, 1 = alarm (12 s, refreshed
while seen). Noise rings: walking 40, running 150, water 70/115, a creaking door 70, a pebble
175, a hit 200 (a miss 60), bats 90/170, a spooked horse pen 300; sleepers hear at .45×. A body
on the floor seen by a guard is an alarm. Light is baked per tile with line of sight; torches can
be doused (a guard walks over to relight) and the lever, doors and rubble rebuild it.

**Fair fights.** Only so many bandits press in at once: 3 alone, 2 in an ambush, +1 per standing
soldier; the rest hang back at 80–110 px. Every blow telegraphs (.45 s red arc) and passes
**`Battle.afterArmor`**: the hero's `10 + str + weapon attack` × `DAMAGE_PACE` (×3 on a bandit who
hadn't seen it coming), a bandit's `attack + 12` (leader ×1.3, a solo ambusher ×.7) in the band's
damage type, a soldier's `troopStats.attack × PACE × 1.2`, spikes 26 and a chest trap 30 pierce.
Guards take their numbers from the band's `BAND_KINDS` footman (hp ×1.4) and leader (hp ×1.2). A
blunt weapon knocks out instead of killing (`DMG_TYPES.blunt.knock`). The hero enters with
`stats.hp` and leaves with what's left.

**Chased means busy.** While an alert bandit is within 8 tiles nothing can be used — no chest,
no hiding place, no exit; the button reads "Peşindeler!" in red and a task under way is cut
short. Hidden, a guard sees you only within 22 px.

**What comes home.** Leaving by an exit tile: the dinars found go to `money`; a trapped chest's
item (house leather, cave steel sword, camp nasal helmet) to the inventory; each prisoner walked
out joins via `Game.addRecruit` (+2 renown if there's no room); taking the purse (`max(60,
s.purse)`) empties the lair's purse; every bandit knocked out or struck down takes .6 off
`s.strength` (floor 4); nobody left standing (ambushers aside) runs `Game.clearLair`. Spotting
XP 25 + 5 per knockout. Fallen soldiers are wounded 3 days. Beaten: 25% of the carried money
is gone, hp drops to 20% of max, the lair gains 1 strength — no captivity.

**İndeki Soylu** (`QUESTS.lair_captive`, lords only): the giver's ward (a lady whose
`guardianId` is the giver, 60%) or a named heir is held in the lair nearest his hall, which is
revealed. That lair's first prisoner becomes the noble (a lady wears the long hair); walking
them out emits `lair_captive_freed`, and storming the lair (`lair_cleared`) frees them too. A
rescued lady's affection +15. Reward 1400 dinars, 14 renown, 18 relation.

**Controls.** Keyboard: WASD (the layout-independent `Input.keys`), Shift run, C crouch, E use,
Q held + mouse to aim a pebble, Space strike, Esc pause. Touch: a floating stick on the left
55%×55% (full push = run), Etkileşim / Eğil / Taş / Saldır. The Taş button: tap = throw ahead,
press and drag = aim (110 px of drag = the full 7 tiles), back over the button = red "İptal".
While aiming, a "?" marks every bandit who will hear it.

**Tutorial.** The first entry asks whether to take the tour (`webband_ltutor_done`, a "no" is
remembered). The tour is the game's coach (`Game.startTutorial` with `Lair.TUTOR`), ringing the
real HUD and buttons, pausing the lair; keyboard and touch texts differ, and touch-only steps
(the stick, the crouch button) are skipped on a desktop. The same thirteen texts are the "?"
list on the scouting card (`Lair.help`) and the pause menu's "Nasıl oynanır?".

**Sound.** Music is the game's player: `'lair'` (three quiet pieces, −22 LUFS) while you sneak,
`'lairchase'` (three fight pieces) while `Lair.alarmed()`. The lair's update syncs the music
on every change of `G.alarm > 0`, whichever path raised or dropped it (2.2.1: the stab used to
sync before `raiseAlarm` set the alarm, so the stealth pieces played through the chase). At night outside the cave a cricket
loop (`lair/crickets.mp3`, Web Audio buffer, looped) sits over it at `.12 + .88 × openness`
(the share of outdoor tiles within 4; the camp is all sky), faded to 0 during an alarm. The cave
drips instead. Pebble, knockout, coins, hits and the alarm stab are synthesized.

**Loop and cost.** Its own rAF loop (`Game.skipFrame` gate, double-start safe); the map loop
stops while `Lair.active` (`Game.inScene`), and `showScreen('map')` restarts it on the way out.
Under a modal the picture holds still (no redraw behind the blurred backdrop). The dark layer is
a quarter-resolution canvas stretched smoothed; glows and the sight hole are baked gradients;
lite mode skips the glows, casts 14 cone rays instead of 22 and caps the canvas at 2× density.

- Measured (2.2.0, headless Chromium, night): update 0.09–0.12 ms per frame on either device;
  render 4.3 ms (house) / 4.7 ms (camp) at 1366×768, 5.3 / 4.6 ms on a Pixel 7 in lite mode.
  Before the quarter-res dark layer and the lite density cap: 8.3–8.9 ms desktop, 13.6–18.1 ms
  phone.

## Smithing (2.5.0)

`forge.js` (`Forge`): the **🔨 Demirhane** card (every city not at war with you, and your own
castles) opens the recipe window (`Forge.open`); a piece pays its iron, coal and rent up front and
opens the forge scene (`#forge-view`). Phase 1 of `docs/PLAN-smithing.md`: existing tiers only.
The mechanics follow Kingdom Come: Deliverance II — the heat is read from the glow, never a number.

**Recipes** (`Forge.RECIPES`): four weapon families of four tiers (sword, axe, mace, lance) and six
armour pieces, plus a fifth tier of masterworks (2.7.0, below). Demircilik 1/3/5/7 opens tiers 1–4 (every skill starts at 1; the "Demirciydi"
background gives +2, so tier 2 from day one). Cost: iron `max(1, round(price × 0.5 / 150))`, coal
`2 + 1.5 × iron`, `2 + 2 × tier` hours, rent `10 + 10 × tier` in a town and none at your own fief,
where the storage counts as well as the bag. A tier-1 mace or lance is little more than its one bar
of iron (training work); from tier 2 the iron is at most 60 % of the piece. Giving up returns the
iron and half the hours pass; the coal and the rent are spent.

**The bar** is 24 segments, tang to tip, each with a heat `T` and the work left `w` (1 raw, 0 on
the outline, below 0 overworked — thinned for good). The outline's thickness per segment comes from
the shape (`blade`, `axe`, `mace`, `spear`, `plate`); `w0` (how many blows a segment takes) grows
with its distance from the billet and by 15 % a tier.

- **Hearth.** Bellows drive it to 1450 °C (rate 0.35/s), left alone it settles at 820 °C (0.2/s).
  Segments take its heat at 0.2/s × 0.6 (tang) … 1.6 (tip): the tip glows first. Above 1300 °C for
  0.8 s a segment burns (a flaw; marked on the bar).
- **Anvil** (2.7.1). Cooling 0.009/s plus up to 0.012 for a finished segment and 0.009 at the tip,
  the same for every smith: from 1000 °C the tip stays workable (above 720 °C) for 14 s, the middle
  17 s, the tang 23 s (before 2.7.1: 4/5/7 s, a little longer with Demircilik). A blow takes
  `0.30 × power × eff(T) × gauss(σ 0.6) / w0` (a neighbour gets a quarter; σ was 0.85, half), and
  past the outline only a quarter of that moves the metal (`OVER`): a stray blow barely thins a
  finished spot, hammering on there still does;
  `eff` is 0 below 600 °C and 1 from 950 °C; holding the press charges power 0.35 → 1 over 0.7 s.
  A blow of power > 0.3 on metal under 650 °C is a cold strike (a flaw). Each blow chills 4 °C.
  On screen the outline is dashed while there's work left, solid gold once the segment is within
  tolerance, red with a notch where it was hammered past.
- **Quench** opens once every segment is within `0.10 − 0.012 × tier + 0.04 × ease` of its outline
  (`ease` 0–1 for a smith 0–6 levels above the recipe). Score:
  `S = 0.55 shape + 0.30 quench + 0.15 care`; shape = `1 − 3 × mean error` (overwork counts 1.8×),
  quench = share of segments in 760–900 °C less a penalty for a spread over 200 °C, care loses
  0.06 a cold strike, 0.08 a burnt segment, 0.03 for each heat past `3 + tier`. The pass mark is
  `0.62 + 0.04 × tier − 0.05 × ease`; from 0.40 the piece comes out a tier lower (weapons only);
  below that it cracks and half the iron is saved. Every outcome trains Demircilik
  (`(40 + 40 × tier) × (0.4 + S)` before the focus multiplier) and strength.

**The scene.** A pixel buffer that covers the whole screen, its short side 180 pixels and the long
side following the screen's shape, scaled up whole: no black bands on a phone held either way. The
hearth, the anvil and the quench tub sit on a 180-tall stage centred in it; the wall, floor, chimney
and the anvil's stump run on to the edges, and held upright the bar on the anvil is drawn up to
1.6× thicker. On touch the buttons are one bottom action bar and a blow ticks the vibration motor
where there is one. A tutorial coach still up holds the forge still, as in a lair. The heat colour is a blackbody ramp
(`heatRGB`, cached per 10 °C). Controls: hold Space / the Körük button / the canvas to pump; E or
the button moves the bar between hearth and anvil; on the anvil the pointer (or ←/→) aims and a
press-hold-release strikes; Q quenches; Esc pauses. The how-to shows on the first visit
(`localStorage webband_forge_help`). Sound is recorded (`forge/`, picked by ear from a page of
candidates, credits in `forge/CREDITS.md`): a blow mixes a dull hot-iron take and a ringing
cold-steel take linearly by the bar's heat (all thud from 1150 °C, all ring at 650 °C, ±4 %
pitch); a 10 s open-fire loop, made seamless by crossfading its tail into its head, rises with the
hearth; one 1.3 s bellows breath plays per stroke (the leather folds cycle at the same rate) and is
cut short on release; the quench is one 3.2 s boil. Only the tongs' clank is synthesized. The five
files are 224 KB, fetched on the first visit and precached by the worker. No music plays in the forge.

**Practice** (`Forge.practice`, the start screen's 🧰 Meslekler → Demircilik since 2.10.0): the same scene with no game
under way — every recipe open, the model at Demircilik 1, nothing taken, given or passing (no
materials, rent, item, XP, strength or hours). The forge view lives inside `#main-ui`, so practice
shows it over the start screen by toggling the screen/view classes itself rather than
`showScreen`, which would set up the campaign's panels and restart the map loop for a world that
isn't there; leaving puts the start screen back.

**Loop and cost.** Its own rAF loop (`Game.skipFrame` gate, double-start safe); the map loop stops
while `Forge.active` (`Game.inScene`). Leaving redraws the town, then the hours pass there.

- Measured (2.7.1, `tools/test.js`, the scripted careful smith): every recipe, masterworks
  included, forged at its own tier, S 0.95–0.99, 34–57 s of game time, 2–3 heats, no flaw. The
  careless smith (full blows anywhere, reheating only when the bar is dark) cracks 79 of 81 tries
  and gets the tier below in 2 (S 0.02–0.50).
- Measured (2.7.1, `humanBot`, a smith who reads the bar in pixels and misses by up to half a
  segment): shape 0.88–0.92, 0–1 of 24 segments overworked; missing by a whole segment, shape
  0.78–0.89. Before 2.7.1 the same smiths scored 0.41–0.79 and 0.10–0.52, with 8–19 segments
  overworked — the "shape is always 0" report.
- Measured (2.5.0, `Forge._bench`, 1024×768 at 2× on an M-series Mac): update < 0.01 ms per frame;
  render 0.12 ms at the hearth, 0.07 ms at the anvil.

## Grindstone (2.6.0)

Sharpening, phase 2 of `docs/PLAN-smithing.md`: the smithy's window opens with a 🪨 Bileme taşı row
for the weapon in hand (`Forge.grind`), rented at 5 in a town, free at your own fief, an hour either
way. It runs in the forge's scene, loop and overlays (`R.job = 'grind'`, `G.phase = 'grind'`).

**Model** (`Forge.GRIND`, the pure `newEdge/stepGrind/grindScore/matchOf` in `Forge._model`). The edge
is the outline's working part on the same 24 segments (a blade from segment 3, an axe's bit from 14,
a spear's head from 13), each with keenness `k` (starts 0.10–0.35, nicked unevenly) and heat `h`.
The contact is a Gaussian (σ 0.8) round `u`. The angle's bite is `m = 1 − ((a − 20°)/9°)²`, clamped to
[−1, 1]: positive keens (`k` approaches 1 at 1.4·m·c per s), negative rounds the edge down (0.56·m·c
per s). Contact heats at 1.4·c per s (×1.5 when steep, −30 % at Demircilik 7) and the steel cools at
0.8 per s throughout, so a still blade runs its temper in under a second and a moving one doesn't;
`h ≥ 1` marks the segment blue and caps it at 0.5 for good. Score `Q = 0.65·mean + 0.35·worst − 0.06·burns`,
bonus `round(20·Q)` %. Only edged melee weapons go on the stone (cut or pierce, not bows): maces don't.

**In battle.** `state.player.sharp = { id, pct, left, n }`; `Game.edge()` is `pct·left/n` while a
weapon of that id is in hand (it waits through a switch), read in `Battle.afterArmor` for the player's
own melee only (the `src` argument; arrows and everyone else pass none). A battle the edge was used
in calls `Game.dullEdge()` once in `endBattle`: 3 battles, +20 → 13 → 7 → gone for a perfect edge.

**Scene.** The stone turns under the blade, which slides so the contact segment sits on its top;
pointer drag moves it (sideways) and tilts it (up/down, 0.5° a buffer pixel), keys ←→/↑↓ and Space
do the same. The edge strip goes from dull grey to bright steel, straw (heat over `GM.WARM` 0.45)
then bronze (0.75) above it as heat builds, blue where the temper ran; the first straw of a run says
so once, and the how-to spells both out — the whitening edge is the keenness, losing the temper is
the steel going soft, blue, capped at half (2.10.0, in all three languages); a small cross-section beside the stone shows the angle. Sparks
are the angle's tell: a long bright shower at the right angle, short red spits too steep, a few
faint ones too flat. The sound is recorded (2.6.1, picked from a page of candidates): the stone's
crank loops under the scene, a scrape plays once as the blade touches, and the grinding loops while
it's held on at 0.55–1 of its level and 0.85–1.15 of its speed as the angle's bite `m` rises.

**Measured** (`tools/test.js` grindBot, 30 Hz): sweeping at 6 segments/s at 20° keens a blade to
Q 0.95 in 26 s, an axe in 14 s, a spear in 16 s, no burns; at 26° the same takes up to 46 s. Sweeping
at 2 segments/s runs the temper four times (Q 0.45–0.52); holding still at 32° scores 0. Render
0.53 ms a frame on a 1280×800 headless desktop (the hearth 0.69 ms on the same screen).

## The bandit mine (2.7.0)

Phase 3 of `docs/PLAN-smithing.md`: a lair whose site carries `layout: 'mine'` (`Game.isMine`) plays
`Lair.LEVELS.mine` (Kara Damar Madeni, 32×18, cave theme). A spawned lair becomes a mine one time
in five (`Game.MINE.share`), and `ensureLairs` keeps at least one on the map: an old save turns a
lair it hasn't found yet into the mine. `Game.dens()` is every lair but the mine, and the two lair
quests (İni Bas, İndeki Soylu) pick from those only.

**Stock.** The site holds `ore: { iron, coal }` in sacks (4 + 4 when full) and `steel` (crucible
steel, 1–2). Every 2nd day a sack of each grows back, every 12th day a bar of steel, up to the full
stock. One sack is 2 iron or 8 coal (`MINE.perSack`). Taking the mine by force (`clearLair`)
hands over its whole stock with the purse.

**In the level.** No prisoners. Sacks (`o` iron, `q` coal) beyond the site's stock start gone.
E shoulders one (0.8 s, noise 45): you walk at 0.7×, footsteps carry 85 (walking), 180 (running),
35 (crouched), you can't throw stones and a blow drops the sack (noise 90). Set down beside the
mouth (or any exit) it is banked: counted even if you're caught later. The cart (`M`) holds 3
sacks; pushed, it rolls the rail (`=`) to the mouth at 64 px/s, sounding a 210-wide noise ring
every 0.6 s, and banks its load at the end. The foreman's chest (`C`) holds the site's steel.
Leaving by an exit adds the bank (and a sack still on your back) to the bag and takes it off the
site; a lost run keeps the bank but not the steel.

- Measured (`e2e/specs/lairsweep.spec.js`, every lair and the mine × both ways in × day and
  night, monkey input): no page errors. `e2e/specs/mine.spec.js`: a carried sack, the cart's
  run and the foreman's steel, and a caught run keeping its bank.
- Measured (2.7.0, `Lair._bench`, headless Chromium, night): render 0.36 ms at 1366×768 (the
  cave 0.33, the camp 3.4, the house 4.4); 4.5 ms on a Pixel 7 in lite mode (the house 4.3).
  Update 0.02–0.04 ms.

## The hideouts (2.9.0)

Twelve more levels in `Lair.LEVELS`, each built around a trick of its own. `Lair.DENS` is every
level but the mine; `Game.LAIR_LAYOUTS` is the same list on the map side (`tools/test.js` holds
the two equal). `Game.pickLayout` gives a new lair the layout the map has fewest of, ties broken
by a hash of its id — no dice, so a seed still makes one world. `ensureLairs` gives a layout to an
old save's lairs that haven't been found yet; a found one keeps its level. The card's tooltip on
the map names the level (`🗺️ Name · Kind`).

| Key | Name | Theme | Its trick |
|---|---|---|---|
| `swamp` | Sazlık Kulübesi | swamp, fog .6 | reeds, deep water all round, a window in the hut |
| `dock` | Kaçakçı İskelesi | dock | keyed strongroom, a load hung over the dice, the sea |
| `abbey` | Yıkık Manastır | stone | the bell, a keyed crypt, rubble underfoot, the tower window |
| `crypt` | Kemikli Katakomp | stone, under | a floor of bones, the lever's rubble, bats, trapdoors |
| `farm` | Köpekli Çiftlik | house, open | two dogs, the larder, the horse pen, a gap in the fence |
| `tavern` | Kör Baykuş Hanı | house | sleepwort and the keg, three dice players, the cellar trapdoor |
| `quarry` | Kırık Taş Ocağı | stone, open | ledges, a watchtower, a crane stone over the dice |
| `keep` | Kartal Burcu | stone, open | keyed dungeon, the portcullis lever, postern, breach |
| `tamer` | Ayıcının Kampı | camp | the bear's cage, two dogs, the larder |
| `forest` | Kızılağaç Sığınağı | forest, fog .75 | dry leaves, brush, a deep pool, the ledge into the hollow |
| `cistern` | Batık Sarnıç | stone, under | deep pools, the prisoners on a causeway, the sluice |
| `caravan` | Terk Edilmiş Kervansaray | stone, open | dogs, larder, herbs and keg, keyed treasury, a window |

**The new pieces** (numbers at the top of `lair.js`):

- **Deep water `%`.** The hero, the squad and freed prisoners swim it at `SWIM` 0.5× pace: no
  running, no blows, no throws, every stroke a 45-wide splash. A guard sees a swimmer only within
  `SWIM_SEEN` 60 px. Guards, dogs and the bear can't enter it (`solidFor`), so it's also a refuge.
- **Reeds `r`.** Walkable. Crouched in them you're seen within `REED_SEEN` 34 px only; upright
  they rustle (noise 55, running 150).
- **Loud floor `,`** (bones, gravel or leaves: `crunchLook`). Every step is heard: 60 crouched,
  110 walking, 170 running. The level's `crunch` line is said the first time.
- **Fog** (`fog`). Multiplies every guard's sight range; drawn as soft pale banks drifting down.
- **Dogs** (`dog: true` guards). 0.7× hp, no armour, 0.7× sight, but a nose: anything within
  `SMELL` 74 px (×1.6 if it runs or carries a sack) with a clear line, in any light. A suspicious
  or alerted dog barks every 1.6 s (noise 170). Bites are pierce, attack + 6.
- **Meat** (larder `m`, +2). The throw button throws meat first; where it lands the nearest dog
  within 9 tiles that can walk there goes to eat for `MEAT_T` 25 s, deaf and blind. An eating
  dog can be knocked out from any side.
- **The key** (`key: true` guard, `d` doors). A keyed door stays shut to everyone; the key is
  stolen from a sleeper or from behind (0.8 s; a waking guard gets +0.3 suspicion) or taken off
  one who's down. With it, walking into the door opens it.
- **The bell** (`G`). Rung once: a noise of `BELL_R` 1400, so everyone awake goes to look and
  sleepers within 630 wake.
- **Sleepwort** (herb shelf `i`, keg `w`). The herb in a keg: `DRUG_T` 12 s later every dice or
  sleeping bandit within `DRUG_R` 7 tiles of it, awake and unalarmed, falls asleep.
- **A hanging load** (cleat `Z`, load `z`). Cutting the rope drops the nearest load within 8 tiles:
  every guard within `DROP_R` 46 px is knocked out, anyone else takes a 40 blunt blow; noise 240.
- **The bear** (`y`). Loosed, a beast of 150 hp, attack 22, goes for the nearest bandit; every
  guard who sees it fights it, and `chaser()` ignores guards busy with it.
- **Ledges `J`.** Solid both ways for walking; from the tile above, E jumps two tiles down (the
  squad and followers come along). Guards walk round.
- **Sluice** (`lever.drains`). Pulling the lever turns the rect's deep water into shallows.
- **Light by sky**: `sky: 'open'` levels take outside light everywhere except their `indoor`
  rects; `'under'` levels drip.

`Lair.check(key)` is a static solver run by `tools/test.js` on every level: the hero's reach is
flooded (levers open their rubble, a reached key-carrier opens keyed doors, ledges, windows and
trapdoors work, water is swum); everything you need must be reachable, every guard must be able
to walk his route, an ambush spawn must stand on its room's floor, a keg needs dice near it, a
cleat a load, dogs a larder, a loud floor a crunch line — and **nobody awake by day may see the
start**, whichever way his post sweeps (it found seven gate sentries looking straight at it).

- Measured (`e2e/specs/hideouts.spec.js`, five projects): every hideout opens from its card and
  runs; meat, a dog's nose, a stolen and a taken key, the bell, the keg, the rope, the bear,
  swimming, the ledge, the sluice and the bone floor each work through the real buttons.
- Measured (2.9.0, `Lair._bench`, headless Chromium 1366×768, day and night, at the start):
  render 0.40–4.9 ms across the twelve, in the range of the old three in the same run (house 4.4–4.7,
  camp 3.6–3.7, cave 0.44–0.54); the fog banks cost nothing measurable. Update 0.02–0.05 ms.

## Crafts (2.10.0)

Two trades that earn money, in `crafts.js` (`Crafts`): the forge's kind of scene (a 180-pixel stage
scaled up whole, its own loop, `Game.inScene` while `Crafts.active`, `#craft-view` wearing the
forge's CSS) and recorded sound in `crafts/` (CREDITS.md there). `tools/harness.js` doesn't load it; `tools/test.js` evaluates it
into its own world like forge.js.

**🪚 Marangoz Atölyesi** — every city, your own castle, and a village that isn't hostile or raided.
Rent `5 + 5·tier` a job in town, free at your own fief, which also reaches into its storage (the
forge's `stock/take`). `WOODWORK`: Tabure (Marangozluk 1, 1 timber), Ahşap Sandık (3, 3), Araba
Tekerleği (5, 4), Meşe Masa (7, 6); `2 + tier` hours. `timber` (Kereste, 20) is a trade good like any
(Vaegir 0.65, Nord 0.85, Khergit 1.35). The pieces are `type: 'craft'` (70/190/290/400): they sell
on the trade goods' supply curve (`stocked`), but the market's buy list skips `craft`, and the
caravans, price ledger and rumours only enumerate `trade`, so none of them carries one.
- *Saw* (`newBoard/stroke`): the board's 24 segments each pull the cut sideways (`drift`, two slow
  waves from the seed: 0.55 + 0.1·tier mm a segment), the saw's lean `aim` (−1…1) adds 0.8 mm a
  segment. A stroke cuts 0.42 segments (×1.3 at full ease); quicker than 0.16 s it binds (a quarter
  of the cut and a 0.5 mm jerk), slower than 0.9 s it's 0.6×. Positive `y` is the hatched waste side.
  The board's streaks follow the grain's own line (drawn at twice its size), so the pull is read
  before it comes. Pointer: a turn of a sideways scrub (3 px back from the furthest point, after
  5 px) is a stroke; vertical motion leans the saw (0.05 a buffer pixel). Keys: Space, ↑/↓.
- *Plane* (`toPlane/planeMove`): the sawn edge stands `0.7 + 0.6·rnd + 0.6·dev` mm over the gauge,
  so a cut wandered into the piece (≲ −1.2 mm) is short before the plane touches it. Each segment
  the plane's middle passes is cut to `depth` (1.8·tol) under the highest point its 5-segment sole
  stands on — humps go, hollows are ridden over. Each stretch of edge (2 + tier) has a grain
  direction, drawn as chevrons; going against it tears 0.3 mm deeper 40 % of the time. Finish once
  every segment is ≤ tol (0.14 + 0.06·ease − 0.015·tier). Pressing down sets the plane where the hand
  is without cutting its way there.
- *Score* `S = 0.4·saw + 0.45·plane + 0.15·care`: saw = 1 − mean|dev|/2.5 mm, plane = 1 − mean
  error/(4·tol) (below the gauge counts 1.8×), care = 1 − 0.04·binds − 0.06·tears. Pass mark
  0.6 + 0.04·tier − 0.05·ease; from 0.4 the piece before it in `WOODWORK`, below that firewood and half
  the timber back. XP `(30 + 30·tier)·(0.4 + S)` to Marangozluk, `trainAttr('agi', 1)`. Giving up
  returns the timber; the rent stays paid, half the hours pass.
- Sold at the market's 0.7, a piece clears its timber and rent by 12–28 dinars an hour of game time
  (the test bounds it at 5–40).

**🍲 Han Mutfağı** — a city's inn, one shift a day in each town (`state.kitchenDays[locId] = day`,
taken on walking in, so walking out can't buy a second go). 90 s of play = 4 game hours. Three
skewers: the side over the coals cooks 0.085/s; a side is raw under 0.5, golden 0.85–1.2, black from
1.6; tap places/turns, holding 0.45 s serves (raw stays on, black is binned). The pot follows the
fire (fuel burns 0.035/s, a log +0.35) at 0.45/s; the bubbles are its tell — still under 0.42,
simmer to 0.72 (cooks a batch of 4 bowls in ~22 s, ×1.3 boiling), rolling to 0.9, over that it boils
over and loses a bowl every 2.5 s. An unstirred pot catches (0.04/s, ×2.5 boiling, 0.15× for 6 s
after a stir) and is dumped at 1. Orders come every 7–10 s (none in the last 8), wait 40 s
(+4 %/Aşçılık level). Pay = wage 20 + kebap 9 / çorba 8 × quality + tip 3 for a dish of quality ≥ 0.8
served in the first half of the patience, all × `(0.7 + 0.006·prosperity)·(1 + 0.05·(Aşçılık − 1))`.
XP `10 + 4·dishes`.

**Sound** (`Snd` in `crafts.js`, forge.js's pattern: fetched and decoded on the first visit, the
volume setting ×1.6 capped at 1, nothing at all while muted). The bench: `saw` on every stroke
(0.85 at 0.94–1.06 speed; a bind 0.55 at 0.8), `plane` while the iron takes wood (at most one every
0.5 s), `hammer` when the piece comes out (not on firewood). The kitchen: three loops from their
first sound on — `sizzle` 0.35 + 0.22 a skewer on (+0.15 and ×1.1 speed once a down side is past
golden), `pot` by the pot's heat (0.15·h/0.42 under a simmer, 0.35–1 from there; speed 0.85 + 0.35·h),
`crowd` 0.4 + 0.1 × orders/4 — all eased to 0 while the scene is paused or a window is open.

**Measured** (`tools/test.js` bots, seeds 1–3, at each piece's own level). A careful carpenter (leans
against the grain it can see, a stroke every 0.4 s, planes the highest spot with the grain) scores
0.87–0.91 on every piece, 58 strokes, no binds or tears; a middling one (steers only past 1.2 mm,
planes both ways) 0.52–0.62: a stool, a step down for the rest; a careless one (no steering,
a stroke every 0.15 s, end-to-end sweeps) 0.09–0.35, firewood. Kitchen at prosperity 50, Aşçılık 1:
a good shift (fire at a simmer, a stir every 5 s) serves 10 dishes and pays 115–120, an idle one 20,
a roaring unstirred pot never serves soup (10–11 wasted).

**Practice** (`Crafts.trades`, the start screen's 🧰 Meslekler): the three trades — Demircilik opens
`Forge.practice`, Marangozluk lists every piece, Aşçılık starts a shift — at skill 1 with nothing
taken, given or passing (no timber, rent, item, pay, XP, `kitchenDays` or hours); shown over the
start screen as the forge's practice is. The result offers the same again, another trade, or the menu.

**Sound after the background** (`Game.ac`, 2.10.0): the game never suspends its one AudioContext,
so any state but running is the browser's — a phone backgrounding the page (iOS: 'interrupted')
left it stopped until the next one-shot. `Game.keepAwake` resumes it on visibilitychange, pageshow,
focus and the first press after (some phones only allow it in a gesture), so the forge's and the
kitchen's loops come back on their own. Headless 1366×768: update 0.005 ms, render
0.17 ms a frame (phone 390×844 at ×3: 0.14 ms).

## Smith's work (2.7.0)

Phase 4 of `docs/PLAN-smithing.md`.

**Masterworks.** Five pieces of crucible steel (`master: true, rare: true` in `ITEMS`, so never on
a market): Desenli Kılıç (attack 26), Balta (38), Topuz (29), Mızrak (23) and Plaka Zırh (defence
41). They are tier 5 (`req: 9`) and take `steel: 1` bar of crucible steel on top of iron and coal.
A miss falls back to the royal tier like any weapon (the armour cracks); the steel is spent either
way, and giving up returns it with the iron. The one-handed ones stay at or under the boss's Kurt
Dişi Hançeri (29).

**Örs**, the seventh perk branch (strength, Demircilik): `a` perks spare materials and time,
`b` perks are the craft. The mods are read in `forge.js` through `perk(k)`:

| Mod | Where |
|---|---|
| `coalSave`, `ironSave` (%) | `cost()`: coal and iron × (1 − mod), at least 1 iron |
| `forgeHours` (%) | `cost()`: hours × (1 − mod), at least 1 |
| `blowFocus` (%) | `newBar` → `g.sigma`: the blow's spread × (1 − mod) (2.7.1; was `forgeCool`) |
| `passEase` (points) | `newBar` → `g.passEase`: the pass mark − mod/100 |
| `edgeBonus` (points) | `newEdge` → `g.max`: the grindstone's best edge 20 + mod % |
| `scrapYield` (%) | `meltIron`: melting yield × (1 + mod) |

Practice ignores them (Demircilik 1, no perks).

**Melting** (`Forge.melt`, the smithy window's ♨️ Erit rows): a forgeable piece in the bag
(not one in hand) goes back for `floor(iron × 0.5 × (1 + scrapYield))` iron, where `iron` is its
recipe's iron before perks. It takes an hour, and 5 rent in a town. A piece too small to give a
whole bar (a tier-1 mace) isn't offered. A masterwork's steel is lost.

- Measured (`tools/test.js`, the scripted careful smith): every masterwork forged at its tier,
  S 0.84–0.95 against a pass mark of 0.78, in 44–52 s and 4–5 heats. The careless smith cracks
  them (S 0.02–0.30).
- Measured: melting gives at most 0.35 of a piece's price in iron (with Hurdacı), against the
  market's 0.7 sell. A sword_steel melts to 1 iron, a masterwork to 11–12.

## Audio layer
Two independent systems. **Transaction SFX** are still synthesized (WebAudio oscillator
envelopes, `Game.SFX`, no files). **Music** is 21 recorded CC0 tracks (10 map / 3 fight / 3 lair
stealth / 3 lair chase / 2 stings), loudness-normalized (EBU R128, map −19 LUFS, lair stealth −22,
fight, lair chase and stings −16) so no per-track mixer is needed. Not precached by the service worker — a second fetch branch caches each track on
first play, so install stays light. Played via `<audio>` elements, not Web Audio (streams
immediately, no decode-then-play stall, and sidesteps iOS's AudioContext-resume bugs entirely).
`Music.sync()` picks `'map' | 'battle' | 'lair' | 'lairchase' | null` from the current screen + a 10-in-view-hours
"chase" flag (`Game.chaseTick`) and only switches on an actual mode change, so a modal opening
over the map doesn't restart the track. Victory/defeat stings play over `Battle.endBattle`
(the single exit from every kind of fight) without interrupting whatever plays next.

## Visual layer
### Motion (1.32.0)
`Anim` (app.js, before `Input`) is the one animation vocabulary: easing curves (`outCubic`,
`outBack` pop, `bump` there-and-back…), `k(t, dur, ease)` / `decay(t, dur)` for "seconds since
an event → eased 0..1", `damp(cur, target, dt, halfLife)` for frame-rate-independent smoothing,
and a small tween list (`to`/`tick`, ticked by the map and battle loops) for UI. `Anim.on()` is
the reduce-motion gate: exaggerations drop, fades stay.

Battle motion is drawn-only — hit boxes, AI and collisions still use the unit's real x/y. Units
carry clocks ticked in `update` (so a pause freezes them): `atkT/atkA` (set in `dealMelee` for
every swing, AI included — AI hits used to land with nothing on screen), `hitT/hitA`, `shotT/shotA`
(AI archers now show their bow), `deadT/fallDir` (set in `logKill`). `drawUnit` turns them into a
6px lunge + swing trail, squash/lean/push-back with an eased flash, a 3px shot recoil, walk
stretch + lean, idle breathing, and a `DIE_T` = 0.7s fall (tip over away from the killer, fade)
while the corpse fades in. Lean/fall/squash pivot on the feet. Damage numbers pop in (`outBack`),
a player hit shakes the camera 0.22s (sine, not random). The tug-of-war bar eases with a 0.14s
half-life instead of 8%/frame (which was half as fast at 30fps).

Map and UI motion: `Game.iconMotion(id, x, moving)` keeps per-party facing (eased −1..1; a turn
squeezes the figure through 0), a walk amount (eased 0..1, scales the bob and a 0.06 rad lean) and
the moment it came into view (400ms fade-in) in `Game._icons` — a Map outside `state`, so it
never reaches a save. `drawPartyIcon` uses it when given `o.id`; the pennant tip waves. The map
camera and zoom follow with `Anim.damp` half-lives 0.139s/0.087s (the old 5·dt / 8·dt at 60fps).
`Game.countTo(id, n)` tweens the top bar's money and renown (0.6s `outCubic`, `Anim.to` with a
`step` callback) and bumps the chip (`.bump-up/.bump-down`); views fade in (`viewIn`, 0.2s).
`Anim.tick` runs even while the game clock is stopped, so a purchase inside a modal still counts.

### Soft pass (1.32.0)
Not a theme — the default look. Corner radii come from `--r-xs/sm/md/lg/xl/pill` (6/10/14/18/22/999px)
in style.css and in every inline style the JS builds; the cool slate neutrals (`--text-color`,
`--text-muted`, `--panel-bg`) moved toward warm parchment, `--danger`/`--success` softened; gold
unchanged. Modals lift-and-fade in (`modalIn`, 0.22s), buttons scale 0.97 on press; the global
reduced-motion rule flattens both. Canvas: `Battle.roundRect` (falls back to `rect` without
Canvas2D roundRect) for the tug bar, command strip and health bars.

Settlement scenes and the chicken chase are hand-drawn Canvas2D in `app.js`/`battle.js`; the
battle (1.33.0) and the map (1.34.0) draw through PixiJS (below), each with its Canvas2D code kept
as the fallback. Shared approach: **bake the expensive thing once, stamp the picture every frame**
(`Battle.buildGround`, `unitSprite`, MapArt's terrain and sprites, cached gradients). Map labels
are laid out by MapArt in screen space (see Pixel map), so text stays the same screen size at any
zoom and a label that finds no free spot is dropped rather than overlapping another. An NPC's
name label is colored by hostility (red+⚔ foe / blue friend / parchment neutral) rather than
just the faction-colored ring, since "whose is it" and "will it attack me" are different
questions. Gradients are cached in world coordinates so panning doesn't invalidate them.

### Pixel map (2.0.0)
`map-art.js` (`MapArt`) draws the campaign map in the battle's pixel world. `Game.renderMap()`
hands over to `MapArt.render(Game)`. In `tools/harness.js` MapArt isn't loaded and the map draws
nothing. The emoji-and-vector map it replaced was removed after round 2 approved this one. The
game's side of the drawing lives in `drawMapSites / drawMapParties / drawMapPlayer /
drawMapRoute`: what is on show, its colour, its label.
- **Terrain bake.** The whole continent is baked once into one canvas, `TEX` = 8 world units
  per pixel, 1275×1275 (the square −600…9600). Per texel: sea by depth, foam and beach, or
  ground. Ground is four shades of the land's palette, picked by value noise with light Bayer
  dithering. The land is a coarse grid (8 texels per cell) of palettes blended by distance to
  each settlement's founding kingdom (σ 820): Swadia green, Rhodok olive with rock flecks,
  Nord cool green, Vaegir grey-green with snow that thickens northward, Khergit steppe with dry
  patches, plus a wild green. Then forest floor, a hedged patchwork of fields beside every
  non-Khergit village and town, rivers (bank, water, glint), roads (kerbs first, then the
  surface, so a junction has no kerb across it), a trodden square at each gate, bridges.
  Last come stamped sprites, back to front: mountains on the rocky half of the coast (angular
  noise decides cliff or beach), trees in forests (pine, birch or broadleaf by region) and
  ~2600 bushes, rocks and lone trees on open ground. Two pre-shrunk copies (½, ¼) are made with
  high-quality filtering. `key()` rebakes when settlements, roads or the border change.
- **Decorative only.** Regional colour, snow, steppe and rocks change nothing in play: speed,
  ambush and sight still read `getTerrainInfo`, which knows only forest, river, bridge and road.
  The terrain panel says "Düzlük" on snow.
- **Settlements** are sprites of `SPX` = 3 world units per pixel, built from primitives (block,
  crenels, cone / onion / wooden / flat tower tops, gable house, palisade, yurt, tugh, flag),
  outlined in dark brown. The style is the founding kingdom's (`CULTURE`, read from `LOCATIONS`
  before any save or siege), the flag the current owner's. Sizes: city 40×42, castle 32×40,
  village 28×18. They grow with `max(1, 0.35 / zoom)`, slower than parties (0.55), so a
  kingdom's towns don't overlap at the continent view. Window pixels are recorded at build
  time and lit after the day tint: a `#ffd36a` pixel each, plus one pre-drawn halo image per
  settlement stamped with `lighter`. Only settlements on screen are drawn, lit or glowing. The
  pixel map has no `lite` branch. On the Pixel 7 profile a night frame with halos, hearth glow
  and sea glints costs what a day frame costs (0.9 / 0.7 ms at 0.45 / 0.8). The first
  proposal's per-window radial halo over every settlement cost +1.1 ms, and that is why it was
  desktop-only there.
- **Sites** (#58) have their own sprites: ruin, farm, tower, cave, camp, lair, boss keep.
- **Parties** are the battle's soldiers: `MapArt.partyLook` gives lords, kings and viziers a
  Mounted knight in their kingdom's cloth, bandits a tier-0/1 Swordsman in bandit brown, forest
  bandits the Archer. A caravan is a covered wagon behind a walking `Horse` (spokes turning), its
  column capped-and-armed guards walking behind. A wolf pack is a pixel wolf with a four-frame
  trot. The old drawn silhouettes (`drawPartyIcon`) only stand in until the sprite sheets have
  loaded. The player is
  `Battle.spriteLook` of the player, so the map shows what they wear. Idle faces down, walking
  faces the way it moves (`Game.iconMotion`), and 10+ / 30+ men add one or two followers.
  `Swordsman.load()` / `Archer.load()` are called from the map, not only from a battle.
- **Night** is the old `dayTint` a third deeper (alpha ×1.35, cap 0.64).
- **Labels** are laid out in screen space after the world is drawn, so text stays crisp and
  untinted. Priority order: player 0, cities 1, castles 2, villages 3, foes 3.5, lords 4, quest
  lines 4, other parties 5, sites 6. Each tries eight spots: above, below, right, left, then
  one row further out each way. Every settlement sprite is an obstacle. Cities and castles
  always get a label, the rest only where one fits.
- **Measured** (headless Chromium, software raster, ms per frame, desktop 1366×768 / Pixel 7):
  close 0.8 → 0.4–0.9 / 0.3–0.5 (classic 1.3–2.0 / 0.7–1.1); mid 0.3 → 0.6–1.1 / 0.3–0.7
  (classic 1.2–1.9 / 0.6–1.2); continent 0.12 → 2.5–5 / 2.6–4 (classic 1.1–2.4 / 0.7–0.9).
  Bake 350 ms desktop, 430 ms phone, once per world. Two lessons from the measuring:
  - A smoothed `drawImage` of the terrain cost 3.3 ms at any zoom and a nearest one 0.7 ms, so
    the ground is always drawn nearest from the right copy.
  - The sea-glint cell loop cost 5.8 ms at the continent view, so glints run only from zoom
    0.25. At 0.45–0.8 they cost nothing measurable, so phones get them too.

### Market: pick, then how many (2.0.0)
`openMarket` shows Buy/Sell tabs over one grid of tiles (`.mkt-tile`, id `mrow-buy-<id>` /
`mrow-sell-<id>`): pixel icon, name, price with its regional tag, stock and "you have N". The chosen
tile fills the trade panel (`marketPanelHtml`):
- the good's note, and for equipment the difference from what you wear
- a − / quantity / + stepper with 1 · 5 · 10 · Max chips, for goods, food and any stack you sell
- why fewer than asked (bag room, the market's stock, the purse)
- one button that says what it will do: "Buy 10 · 144₺"

`marketQuote(id, n, selling)` walks the price unit by unit, the way the supply curve moves it, and
puts the stock back. The panel's total and Max come from it, and `buyItem`/`sellItem` commit the
same walk, so the preview is what you pay. On desktop the panel is a sticky 290 px column; under
820 px it pins to the bottom of the window, solid, over a three-column grid. The last trade's
message lives in the panel (`_mktMsg`) so a redraw keeps it.

### Settlement scene, item icons, portraits, start screen (2.0.0)
- **Scene** (`MapArt.scene`, called from `Game.drawScene`): 300×94 pixels drawn 3× into the scene
  canvas's 900×280 units. Layers:
  - a four-band dithered sky by time of day, clouds by day, a pixel sun or crescent moon
  - the founding kingdom's land: Swadian hills with trees, Rhodok peaks (the map's mountain
    sprites), the Nord sea with a sail, Vaegir snow with pines, a flat Khergit steppe
  - the settlement behind: a city wall with towers, house roofs and a keep; a castle keep and
    curtain wall; a village fence with fields and a mill, or a Khergit yurt camp
  - the ground and a road
  - one building per action button, built from the map's primitives in the kingdom's style
    (`SCENE_KIND`: tower, house, tavern, shop, smithy, pen, ram, barn, stall, tent, ring, fire, coop, gate — 2.7.1 gave the inn, forge, workshop, slaver and siege their own shapes; they had shared the house and the tent)

  Buttons alternate back row / front row across the width, so a back building's sign never lands
  on the front one. The still part is cached per settlement, owner, time band and button set
  (`BASES`, 40 entries). A hover redraws only the gold ring (`goldRing`), the signs and the
  tooltip. Hot rects are the building sprite's opaque bounding box, in 900×280 units. That is
  what `renderScene`'s pointer mapping and click already read, so a building still clicks its
  own button. Signs are the town card's line icon (`Game.TOWN_CARD`), rasterised once from the
  SVG sprite as an image. At night: a blue tint, stars, lit windows and gate torches with a warm
  glow. Round 3 approved it and the vector scene is gone; Node's harness (no MapArt) draws
  a blank scene with no hot rects. A click maps its own point (not the last hover), so a
  finger tap hits the building under it.
- **Phone scene** (`@media (max-width: 820px)`, `Game.sceneScrollInit/Sync/Slide`): at 100 %
  width a 390 px phone got a 112 px strip with 8 px signs. There the canvas keeps
  `height: clamp(190px, 52vw, 240px)` and `#scene-scroll` slides sideways natively. From 660 px
  up it fits the width again: sliding for the last few dozen pixels only put an arrow over a
  building. The cues show only while the scene overflows (`.scrolls`):
  - arrow buttons (40 px, 70 % of the box per tap), plus a shaded edge on whichever side has
    more to show; both fade out at their end (`.at-start/.at-end`)
  - a thin track under the scene, the thumb as wide as the view
  - until the first slide, a "Sahneyi yana kaydır" pill (`pointer-events: none`) and one peek
    of the canvas per session; after a slide `webband_sceneSlide` remembers it

  Labels (pill, arrow `aria-label`/`title`, the region's `aria-label`) are written through `T()`
  on every render, so they follow the language. A new settlement starts at the left, and a
  redraw of the same one keeps its place.

  Measured (Pixel 7 emulation, `scene.spec.js`): the scene is 190 px tall at 320–360 px, 203 at
  390, 224 at 430 and 240 at 600–659, overflowing by 150–330 px; it fits (0 overflow) from 660
  px. The page never scrolls sideways. A horizontal touch drag on the scene slides it, and a
  vertical one scrolls the settlement screen.
- **Item icons** (`MapArt.itemIcon`, `Game.itemIco`): 16×16 pixel art for all 56 items, cached as
  data URLs. A weapon's tier is its rank by price within its family (`sword`, `sword_steel`, …)
  and shows in the metal (`METAL`), grip and trim. Used in the bag, the equipment slots (an
  empty slot shows the plainest item of its kind, faded), market lists and messages, and storage.
  Plain-text places (alerts, logs, tooltips) keep the emoji. An item without a drawing falls back
  to its emoji.
- **Portraits** (`MapArt.portrait`, through `Nobles.portraitCss`): a 48×48 pixel bust per lord and
  lady, seeded by id, cached as a data URL and shown `pixelated`. The painted `lord_portraits.jpg`
  and the SVG ladies only stand in where MapArt isn't loaded.
  - Kingdom: skin and hair palettes and the background tone; Khergit moustaches and fur-rimmed
    cone hats, Nord braided beards and hair, Nord and Vaegir fur collars, Vaegir fur caps.
  - Rank: kings are older, with a crown, an ermine collar and a beard; viziers get a gold
    collar and chain.
  - Personality: brows (angled for quarrelsome and martial, one raised for cunning, arched for
    goodnatured), the mouth's mood, a scar on some martial lords, a red nose for the debauched.
  - A lady's trait: ambitious → tiara, pious → a veil with hair beside the face, romantic →
    a flower, wild → loose hair with a feather.
  - `HAIR_OF` hand-picks a hair colour (Lady Avrilia brown).
- **Lord dialogue cards** (`Game.cardButtons(box, table)`, `Nobles.TALK_CARD`): the conversation's
  buttons become the town cards. Each gets a line icon by the label's leading emoji and a hint of
  what it does, e.g. "once a day · relation rises if it suits their taste", or "relation −15,
  renown +2 · lords of rival kingdoms are pleased" (the numbers `insult` applies). The colour a
  button's inline border carried becomes `tone-danger/love/gold/done`. One column on a phone,
  where the portrait shrinks to 88 px with the words flowing beside and under it. The typed
  greeting reserves its final height before the first letter (`typeIn`), so the cards never
  move. Measured: the first card's top stays on the same pixel for the whole line on desktop
  and Pixel 7.
- **Portrait frame** (`Nobles.framed`): a dark-gold mount, an outer ring in the kingdom's colour
  (`--fc`) and the crest (`Game.crestCss`) as a corner badge; round for a lady.
- **Start screen**: the secondary buttons are `.start-act`, dark glass with a gold edge and a line
  icon. The install button's label is its own key, `Uygulamayı Yükle` ("Yükle" is already
  "Load"). `MapArt.march()` draws the game's soldiers walking past a keep on a 320×64 canvas at
  ~20 fps. It has a double-start guard, stops itself once `#start-screen` isn't active, and draws
  a single still frame under reduced motion. The start screen only comes back on a reload, so the
  march starts once, at load.

### Motion polish and round-1 leftovers (2.1.0)
- **Living scene** (`MapArt.sceneLife`, `Game.tickScene`): chimney smoke, flags (`FLAG_F`), torch
  and hearth flames (`FLAME`), birds and a villager on the road, drawn over the cached still scene.
  `sheet()`/`building()`/`sceneBase()` collect the anchor points (`fx`) once per base. The map loop
  calls `tickScene` after `renderMap` behind an 83 ms gate (~12 fps: pixel art needs no more). It
  skips under reduced motion, behind a modal and off the settlement screen. The map's settlement
  flags wave the same way per frame. Measured (Chromium, Praven): a whole scene redraw costs
  0.23 ms on desktop and 0.29 ms at Pixel 7 density.
- **Entrance / fly / banner / curtain** (`Game.playEntrance`, `fly`, `flourish`, `curtain`,
  style.css "2.1 motion"):
  - screens and cards slide up into place (`.entering`), and an action card lifts on hover
  - a bought item flies to the bag chip and sale money to the purse (`mktGo`, `#mst-bag`/`#mst-gold`)
  - a level-up or finished quest rises as a gold banner (`#flourish`, `role=status`); **since
    tur 4 q4 a level-up is the banner alone — no alert**, and the character screen explains target
    points
  - a battle opens with a 1.3 s curtain ('Savaş!' / 'Kuşatma' / 'Son savaş'), but not in auto-resolve
  Everything is off under `Anim.on() === false`.
- **Pixel battle ground** (`Battle.buildGround`, `GROUND_PX 1.25`): the meadow is painted into a
  low-res `ImageData` field (its own mulberry, seeded by one `Math.random`), then upscaled
  nearest-neighbour. Both renderers draw it unsmoothed (`imageSmoothingEnabled = false`,
  `texOf(ground, true)`). Measured: 45 ms for a 1366×715 field and 24 ms for a 412×915 one, once
  per battle.
- **Hero in character creation** (`heroPreview`, `startHeroPreview`, `Battle.heroLook`): the
  wizard shows the hero sprite wearing what the choices so far (plus the hovered one) give. It is
  the same `heroLook` the battle uses. One rAF loop with a `_heroId` guard; it stops once
  `#cr-hero` is gone.
- **Sprite looks** (Swordsman bake): `fem` trims the pack's spiky crop to a smooth dome
  (`headBox`, `smoothDome`) and draws a hairstyle by code (`femHair`), not on the death frames.
  - Styles: `'tail'` ponytail (the default), `'bun'`, `'braid'`, `'long'` shoulder-length.
  - Facing up, `headBox` always takes the skull's width from the lower half (2.2.1): some back
    frames show an ear or the neck, and those skin pixels were read as a face — the dome shrank
    to a sliver and long hair flickered to a spike (Idle 2/6/10, Hurt, the swing). Measured: a
    scan of every armour × style × helm × anim × facing frame finds no frame under 80 % of its
    row's median (only attack frame 0, the wind-up pose).
  - The parts that hang behind the head are drawn before it. Braid and long hair are painted
    on their own cell and outlined once all round (`mass`), so only the outer silhouette shows.
  - Strand ends are uneven by a fixed table (`RAG`), the same on every frame.
  - 2.1.1: the player picks the style in character creation. `Game.hairBtn` is one button under
    the preview that steps through `HAIR_STYLES`; the choice is stored as `background.hair` and
    passed to `heroLook`, and is part of both frame-cache keys.
  - Review history: the first attempt (two side strands) was turned down, then the first
    braid and long hair were too; both were redone in 2.1.1. `wpn` gives an axe / mace / spiked mace / hammer / spear head at the blade tip, with the
  blade pixels recoloured to wood (`weapon()`). `plate` (defense ≥ 30) draws steel plates on the
  body (`plateArmour`). All three are part of the frame-cache key in `Swordsman.art` and
  `Mounted.art`. `Battle.teamRing(u)` draws the ground ring only for units with no sprite look:
  clothing already says the team.
- **Settlement header** (`settlementSubline`): faction dot and name · prosperity · lords in the
  keep (or 'Kalede soylu yok'); for a village, its owner. **Card keys** (`settlementKey`): cards
  are numbered 1-9 in reading order and Esc leaves. The `<kbd>` chips are hidden on `body.touch`.
  A card whose dinar price is above the purse gets `.act-poor` (dimmed, price in red).
- **Phone battle** (`@media (pointer: coarse)`): `#battle-ui` is a see-through overlay over the
  whole field (`inset: 0`, `Game.floatsOver` → `uiHeight = 0`). `#btn-bpause` (top left) opens
  `Battle.pauseMenu` — Resume / Surrender, the battle paused under it. `#btn-surrender` is hidden,
  and the rout prompt sits under the power bar. Measured (Pixel 7): the sticks' `--tui-lift`
  dropped from 66 px + inset to 24 px + inset. The battle spec asserts both sticks and the block
  button sit in the screen's lower half.
- **Phone map capsule** (≤430 px): the terrain sits in the button row (a gold divider after it).
  The troop count is hidden (it's on the party screen), and the terrain's speed shows as
  `Game.pct` only (`.mt-short`; `.mt-long` on wider screens). The points button drops its icon, not
  its words. Measured: the panel is 56 px tall at 412 px (76 before), and one row from 390 px up
  in TR/EN/ID with unspent points showing. At 360 px ID it wraps to two rows. `ux.spec` asserts
  one row on Pixel 7.

### Small polish (2.1.1)
- **Battle forests and pits** (`buildField`): nothing round is drawn for a rough zone any more.
  - Before, a forest was a flat 50 % black disc and a pit a black radial gradient: huge round
    shadows on the pixel meadow.
  - Now a forest is only its trees, denser toward the middle, with low bushes along the edge
    (`drawBush`).
  - A pit is 3 + r/14 small, ragged clumps of trodden earth and mud, painted into the ground's
    pixels (`clump`).
  - The rules still use the exact circle (`getTerrainEffects`).
- **Top-bar gains** (`countTo`, `Game.gainFx`):
  - money, renown, morale and level count up to their new value
  - on a rise the badge bumps, its icon pops (`icoPop`) and a "+N" pill drops out just under
    the badge (`.hud-plus`, fixed to the page so the bar's clipping never cuts it, 1.2 s)
  - a new man in the party gets the pill too; earned XP makes the level bar flash (`.bar-gain`)
  - `Save.apply` resets the counters, so a loaded game's numbers are set, not "gained"
  - everything is off under `Anim.on() === false`
- **Map sidebar, desktop**: the floating strip on the map keeps its labels and key chips, the
  same rows as on every other screen (it was icon-only while taking nearly the same width).
  `#map-hud` moved to `left: 212px` to clear it. Measured at 1366×768: the strip ends at 187 px
  (TR) / 198 px (EN), with no scroll; at 1024×640 in ID it ends at 192 px, also without scroll.
- **e2e**: the forced-pixi renderer specs are `test.slow()` on the phone projects. CI's
  SwiftShader at a phone's density starved the page past 60 s: red on main since 1.34.0.
  Measured locally: 33–42 s each.

### Battle renderer (1.33.0)
Not a frame-rate fix — Canvas2D already held 60 fps on an iPhone 14 at 250 v 250. What it buys:
**sharpness** (`#battle-canvas` is one canvas pixel per CSS pixel, soft on a retina screen; Pixi
draws at `min(devicePixelRatio, 3)` with `autoDensity`) and a GPU scene graph to build effects on.

- **One seam, two renderers.** `Battle.render()` asks `liveGfx()` for `canvasGfx` (the pre-1.33
  Canvas2D code, moved as-is into `drawCanvas`) or `BattleGL` (`battle-gl.js`), both
  `{ resize, render(battle, now), info, destroy }`. Battle owns all state and clocks; both
  renderers read the same pure helpers — `unitPose` (lunge, recoil, squash, walk stretch,
  breathing, the `DIE_T` fall), `gait` (1.32.1 mounted stride), `unitArt` / `spriteAnim`, `dustPuff`,
  `hudLayout`/`drawCmdStrip`/`statusLine`/`tugBox`/`tugStatus` — so motion can't drift apart.
- **Drawing writes nothing.** The tug bar's easing (`tickTug`) and the hoofbeats (`tickHooves`)
  moved from the draw path into `update()`; the dust puffs' dice became `Battle.hash01`
  (rendering must not consume `Math.random`, or a seeded run replays differently with the
  renderer). `tools/test.js` renders three times and checks state, dice and sounds are untouched.
- **Setting**: `Game.opt('renderer')` `'auto' | 'pixi' | 'canvas'`, `?renderer=` URL override
  for a session. `'auto'` = Pixi on a hardware WebGL context; a software rasterizer
  (`Game.webgl().soft`: SwiftShader/llvmpipe/Basic Render, read from the unmasked renderer string —
  `failIfMajorPerformanceCaveat` doesn't catch SwiftShader) stays on Canvas2D. `'pixi'` forces
  any WebGL. No WebGL, a failed init or a lost context (`Battle.glFailed`) → Canvas2D for the
  session. Pixi's init is async: `applySettings → Battle.prepareGfx()` starts it before the first
  battle, and a battle that starts earlier draws Canvas2D until `BattleGL.ready`.
- **Two canvases.** A canvas can't hold a `2d` and a `webgl` context, and `#battle-canvas` also
  serves the chicken chase through `Game.battleCtx()`, so Pixi owns `#battle-gl`. Exactly one
  shows (`Battle.showSurface`, `[hidden]`); the hidden `#battle-canvas` still carries the field
  size, and mouse mapping measures the visible one (`Battle.surfaceEl()`), so screen → world is
  unchanged. Switching the setting away from Pixi destroys the app and swaps in a fresh element.
- **Baking.** World shapes are baked at `S = devicePixelRatio × camera zoom` (a texel lands on one
  screen pixel): shadow, team rings (enemy dashed), player pulse, discs, corpses, sword, bow,
  arrows, bar back + nine-slice fill, oil glow; unit art through `Battle.unitArt(u, S)` (the same
  bakers with a scale argument — pixel art sampled `nearest`); text (damage numbers, rank ticks,
  HUD lines) through Canvas2D's own `fillText` into cached textures, re-baked when webfonts
  finish loading. The ground is `buildGround(scale)` at up to 3× (2× lite), capped at 4096 px.
  Per frame: pooled Sprites per layer, three `Graphics` rebuilt for the arcs that change shape
  (swing sweep/aim arc/telegraph, AI trails/shields, shimmer/arrow rain), one `app.render()`,
  ticker stopped — Battle's loop, `skipFrame` and the 700 ms pulse check are unchanged.
- **Known differences.** Layers instead of per-unit interleave: a lower unit's shadow/ring never
  covers a neighbour's sprite and health bars always sit above sprites. The ground is baked at
  a higher resolution. Pixel art is crisp instead of bilinear-blurred.

Measured (headless Chromium, 1366×768, SwiftShader — **no real-device numbers yet**): CPU per
drawn frame from `Debug.report().render.battleRenderer`, update / render: Canvas2D 10v10
0.24 / 1.06 ms, 30v30 0.52 / 1.6 ms at 60 fps; Pixi 10v10 0.45 / 2.4 ms, 30v30 0.41 / 2.4 ms, 5–7
draw calls, but only 8–10 fps — the software rasterizer is the bottleneck, which is why `'auto'`
keeps software GL on Canvas2D. Phone viewport (Pixel 7 emulation, 2.625×): Pixi render 2.7 ms
(10v10) / 5.8 ms (30v30).

### Map renderer (1.34.0, pixel map 2.0.0)
The battle's move, done for the world map, for **sharpness**: `#map-canvas` is one canvas pixel per
CSS pixel, so on a 2.6× phone the Canvas2D map is stretched; `MapGL` draws at
`min(devicePixelRatio, 3)`. 1.34.0 did it for the vector map; 2.0.0 replaced that map with
MapArt's pixel art, and the merge kept the renderer seam, not the vector scene graph.

- **One piece of drawing code.** `Game.renderMap()` → `liveMapGfx()` → `MapArt.render(G, ctx)`,
  with `ctx` = `Game.ctx` (Canvas2D) or `MapGL.fx`, a `PixCtx`. PixCtx extends `GLCtx` (the
  1.34.0 facade: transform stack, arcs/ellipses/curves flattened with the current transform,
  dashes cut, `GLCtx.joined` for chained subpaths) with the rest of the Canvas2D surface the map
  uses: `drawImage` (3/5/9 args) → a sprite placed by the full transform (`setFromMatrix`, so a
  mirrored soldier stays mirrored), `fillRect` → a tinted white sprite when axis-aligned,
  `fill`/`stroke` → one pooled `Graphics` each, `fillText` → text baked per power-of-two bucket of
  on-screen size (shadow included), `'lighter'` → additive blend. `imageSmoothingEnabled` picks
  the texture filter, Canvas2D's meaning: off = nearest (the pixel art), on = linear (emoji,
  plates, glows). Objects are handed out and re-parented in call order every frame, so the paint
  order is Canvas2D's. Gradients throw: the map draws baked glow canvases instead (the hearth light
  became one for this).
- **Density-aware in one place.** `ctx.pixelRatio` (1 on Canvas2D) picks the terrain level (a texel
  must stay a screen pixel wide) and the resolution name plates are baked at. Plates (backing,
  border, faction dot, text) are baked per content × density and stamped in both renderers —
  Canvas2D stopped re-filling ~30 rounded rects a frame too.
- **Uploads, not rasterising.** `MapGL.tex` keeps one texture source per canvas and filter;
  sub-rectangles share it. A texture unused for 600 frames is freed (soldier frames come and go
  with the camera), checked every 300 frames. Text is dropped and re-baked when webfonts finish.
- **MapArt is handed in.** `MapArt.render` passes itself to `Game.drawMapSites/Parties/Player(ctx,
  art)`: app.js never looks MapArt up by name mid-frame (it loads after app.js and not at all in
  Node). `tools/test.js` evaluates map-art.js in a function scope and draws it through both a
  fake Canvas2D and PixCtx over a fake Pixi: no state change, no dice, no two labels overlapping.
- **Party fade-in counts frames.** `iconMotion` used to fade a party in when it hadn't been drawn
  for 400 ms. At a low frame rate (software WebGL at a phone's density, a slow phone) that was every
  frame, so parties sat at zero opacity; it now fades in only a party missing from the previous
  drawn map frame (`Game._mapFrame`).
- **Input doesn't move.** `#map-gl` sits *under* `#map-canvas`; while Pixi draws, `#map-view.gl`
  makes `#map-canvas` see-through (`opacity: 0`), but it stays the element every pointer handler,
  `mapPos`, the cursor, the edge pan and the tutorial highlight use. The storm shake moves both.
- **Setting**: the battle's — `Game.opt('renderer')` / `?renderer=`, `Game.mapRendererKind()` with
  the same rules (software GL stays Canvas2D on `'auto'`); `applySettings → prepareMapGfx()`
  starts or destroys it, a failed init or lost context (`Game.mapGlFailed`) → Canvas2D for the
  session. MSAA is on (rings, route, hail; close to free on a tile-based phone GPU).

Measured (headless Chromium, SwiftShader, so CPU-rastered — **no real-GPU numbers yet**): screenshot
pairs Canvas2D/WebGL at Praven, day and night, desktop 1366×768 and Pixel 7 (2.625×), match except
for sharper text and rings on WebGL. `renderMap` ms per frame (includes SwiftShader's raster on the
WebGL side): Canvas2D 1.2–1.5 desktop, 0.7–1.5 phone; WebGL 8.1 desktop, 3.8–4.1 phone; 1 draw
call. `renderer.spec.js`'s phone WebGL tests, 2 workers: 39–49 s here against 60 s+ (two timeouts)
for 1.34.0's vector WebGL map on the same machine; at 4 workers both time out.

## Performance
The bottleneck is the **compositor**, not JS — a typical battle frame costs ~1.2ms of JS against
a 16.7ms budget. Rules that follow from that:

- **No `backdrop-filter` above a moving canvas** (recomputes every frame the pixels under it
  change) — panels over the map/battle canvas use an opaque background instead; panels over a
  static background can keep the blur since the result caches.
- `renderMap()` returns early while a modal is open — no point redrawing a frozen world under a
  blurred curtain.
- Canvases are opaque (`getContext('2d', {alpha:false})`; Pixi's opaque background gives its
  WebGL context `alpha:false` too) — nothing under them shows anyway.
- Emoji/gradients/ground textures are baked once and stamped, never rebuilt per frame.
- Particle ceilings (sparks/text/blood/corpses) and target-search throttling (every 0.3–0.5s/unit,
  not every frame).

**`Game.skipFrame(t)`** targets `Game.targetFps()` — the 🎯 setting; `'auto'` = the adaptive
rung below — regardless of the monitor's real refresh
rate, by measuring the **median of the last 31 frame intervals** (not the smallest — a single
short interval, e.g. iOS delivering two rAFs ~2ms apart during a scroll, used to permanently pin
the estimate and starve the game to a few fps with no way to recover) and picking the largest
whole divisor that doesn't drop below 60fps. The divisor decision is cached per-frame (not
per-call) so the map loop and battle loop — which can both call it in the same frame — never see
different parities and starve each other. Two safety nets on top: a shared canvas-context getter
(`Game.battleCtx()`, since only the first `getContext` call on a shared canvas binds its flags)
and a 700ms "did battle actually draw a frame" pulse check that rebuilds the loop once if not.

### Adaptive frame rate (1.31.5)
With lite and/or fps on `'auto'`, the game starts at 60fps (full drawing on desktop, lite on
touch) and steps **down** one rung — full@60 → lite@60 → lite@30 — when two consecutive 5s windows
of drawn frames each have >10% frames later than 1.5× the expected interval (`_step × divisor`).
`skipFrame` feeds `perfObserve` for every drawn frame; frames under a modal, in a hidden tab,
within 1.5s of a `showScreen` (loading), or >250ms apart are no evidence. Because "late" is
measured against the gate's own median refresh estimate, iOS Low Power Mode's steady 30Hz is
not a stutter; a steadily slow device isn't caught either (it doesn't stutter). Never climbs
back within a session; the rung is stored in `localStorage.webband_perf` with `VERSION.no` and
retried from the top on a new version. A hand-picked lite/fps value is never touched. The debug
report carries `render.adaptive` (rung, strikes, last window's jank %, step-down log).
Measured (`tools/test.js`): 25% late frames → lite@60 after ~10s, lite@30 ~13s later; 5% late,
steady 60Hz and steady 30Hz stay on full@60.

### Lite mode
One switch (`Game.opt('lite')`, `'auto'` = the adaptive rung — on from the start on touch) that simplifies map density (sea
waves/ground patches off, forest trees thin to 1-in-3), battle ground density, particle
ceilings, and drops screen backdrop images. Since 1.31.5 it no longer implies 30fps — the frame
rate is its own (adaptive) knob. A
flat-color fallback additionally replaces gradient sea/coast/river/road layers in lite mode
(`Fill rate`, #84) since raster fill rate, not JS, was still the bottleneck on a phone even with
everything else trimmed.

## Known gaps / bugs
None currently tracked here. Historical fixes (battle-arc hitting the whole group, frame-rate-
dependent timers, save/load edge cases, the #41 `app.js`/`battle.js` split) are in git history
and `CHANGELOG.md`, not repeated here once resolved.

## Measurement tools
`tools/harness.js` is the shared rig: a fake DOM + all four game scripts run in one `vm`
context (so `const Game` etc. resolve as they do in the browser), a seeded `mulberry32` stands
in for `Math.random`. Everything else is built on it:

| Tool | What it measures |
|---|---|
| `tools/sim.js --days 200 --seed 1-5` | playerless world: conquest, campaigns, war/peace, prosperity |
| `tools/duel.js --n 200` | 1v1 troop balance, real `Battle.update` stepped frame by frame |
| `tools/economy.js --days 60 --troops 10` | a player script's net-worth curve |
| `tools/framegate.js` | `Game.skipFrame` gate correctness + the #42 loop-parity regression |
| `tools/test.js [--fast]` | the full assertion suite, ~80 s (`--fast` ~3 s: skips the day-200 sim, the mid-scene saves and every `slow()` test — the ones that play worlds or duels over seeds and days) |
| `tools/career.js --days 150 --seed 1-8` | a scripted player (shop, recruit, fight, promote, arena, tournament, hire, perks, gear, save/load…) with invariants checked after every action |
| `tools/typecheck.js [--update]` | tsc over the game's JS (`tools/tsconfig.json`, nothing compiled; typescript from `e2e/node_modules`): fails on an error not in `tools/tsc-baseline.json` |
| `tools/exploits.js [--seed 1-3] [--walks 600] [--edge]` | the money-pump hunt: seeded button walks from the settlements and the map's payouts (a bandit band and its battle fought by hand, a lord prisoner, a ruin, a quest hand-in), replayed; fails on a walk (or a pair of walks) that leaves the player richer every time with the clock still |
| `tools/longgame.js [--days 1000] [--seed 1] [--every 50] [--report]` | a 1000-day game, playerless and scripted career: the save's size, the lists that could grow (`H.footprint`) and the time a day takes, sampled every 50 days; fails on a number that never comes back down |
| `tools/mapwatch.js [--seed 1-3] [--days 40]` | map parties watched step by step in four scenes: a jump, a stuck party, a dithering one, a crowd, a siege from afar — one `MAP` line per find, exit 1 |
| `tools/coverage.js [--dir e2e/test-results] [--top 40] [--md f]` | the coverage map: merges every e2e run made with `COVERAGE=1` and lists the game functions none of them called, biggest first |

Bug hunting in the browser: `MONKEY=1 MONKEY_SEED=1,2,3 MONKEY_STEPS=400 npx playwright test
specs/monkey.spec.js` (seeded random play, reports the step and the element behind any error,
missing key or broken text) and `MONKEY=1 npx playwright test specs/lairsweep.spec.js` (every lair,
layout, way in, time of day). Both are skipped in the regular run. `.github/workflows/nightly.yml`
runs them every night at 01:00 UTC with seeds from the day of the year (two monkey seeds × the
four projects at 300 steps, the lair sweep, `career.js` on eight seeds) and opens — or comments
on — one `nightly`-labelled issue with each finding's project and seed. Actions → nightly → Run
workflow starts it by hand with chosen seeds and steps.

**A long game (#149):** `tools/longgame.js` plays 1000 days twice per seed: the playerless world
(`H.run`) and the scripted career (`career.js`'s `run`, now exported with a per-day hook). Every 50
days it samples `H.footprint(g)`: the save's size, map parties, news, war log, market stock
entries, sites, feasts, quests and offers, the bag, relations, grudges, errors, and ms a day. A
leak never comes back down, so a number is flagged when the second half's lowest sample stays
25% (and 5, 8 KB for the save) above the first half's mean. Market stock swings 0-26 and back and
isn't one. The first run flagged the career's quest list: 19 at day 500, 40 at day 1000. The game
caps it at one per giver (`offerMenu` hands a finished job in and refuses a second), but
`career.js` took quests through `offerFrom` straight past that gate and never handed any in; it
now goes through the giver's window, so hand-ins are played too. Measured, seeds 1-3 (the report
is `docs/measurements/2026-09-28-long-game.md`): nothing grows. The save stays at 65-71 KB in the
playerless world and 75-86 KB in a career, map parties 59-75, news capped at 12, the war log at 20,
sites at 23-27; a day takes ~60 ms playerless and ~220 ms with the career, flat to day 1000 (the
odd 1-3 s sample is the machine busy with something else, and comes straight back).

**Type check** (2.4.1, the e2e CI job): `tools/typecheck.js` runs tsc on the game's own scripts as
plain JavaScript. Day one: 170 errors, frozen in `tools/tsc-baseline.json` counted by file, code and
the name they're about (not by line); a new one fails, and a fixed one fails until `--update` locks
the lower count in. Its reach is local: `Game`, `Battle`, `state` and the other big globals refer to
themselves in their own initializers, so tsc types them `any` (`Game.closeModl()` passes). The
first run found one real bug — "Başlık" twice in both dictionaries, the bride price and the helmet
slot, the later entry winning (the bride-price screen said "Helmet"); the bride price is now
"Başlık parası", and `tools/test.js` fails on any repeated dictionary key.

**Coverage map** (2.4.1): with `COVERAGE=1` the e2e fixture records V8's call count of every game
function for each test (started before the first script, so a function never called is listed
with 0) into the test's `coverage.json`; `tools/coverage.js` merges them and lists only the
outermost never-run functions — where the next scenario should go. The nightly job runs the monkey,
the lair sweep and the regular suite on tr-desktop with it and writes the map into the run summary.
Node runs count too (2.4.2): under `NODE_V8_COVERAGE=.coverage-node` V8 writes its raw files and
the harness runs each game file under its own name. A run recorded on older code (offsets moved)
is skipped with a warning — e2e runs carry their source's sha1, Node files must be newer than
every game file. Measured, `tools/test.js` + the regular suite on tr-desktop: app.js 85% of
functions, battle.js 90%, quests.js 81%, nobles.js 73% (e2e alone: quests.js 13%, nobles.js 60%).
The map then pointed at two gaps that now have tests: the wave quests' `day()` hooks (the drivers
emit their wins straight at the engine — `tools/test.js` now plays harvest_watch, outpost_defense
and merchant_convoy through real days, waves and auto-resolved battles to the hand-in) and the
lord/lady dialogues (a seeded walk that presses the buttons each window shows, 400 walks from
states that open courtship, dowry, poems, rivals and feasts, in English — 2779 presses, clean;
alone it reaches 80% of nobles.js), and the long hair (`femHair`, no spec ever made the hero a
woman — `heroine.spec.js` now does). Still unreached: the pre-sprite map silhouettes
(`drawRider/Footman/Wolf`, a fallback the loaded sprite sheets never need).

**Money-pump hunt** (2.4.3): `tools/exploits.js` starts walks at eight gates — four settlements
(an own city, a friendly city, a castle, a village; with a purse, goods, prisoners, troops and a
fief) and four map payouts: a bandit band on the road (the encounter window, `autoBattle`, the
battle fought by hand, the result), a lord in your chains (ransom, release), a ruin to search, a quest waiting for its
hand-in. A walk is up to six seeded presses — the gate's buttons, then every `onclick` the window
that opens offers. The pick leans to the less pressed, by what a button calls before which one (a
hundred `mktSelect` tiles are one choice, `mktGo` another), or the walks never reach a trade. Each
walk that took no time is replayed five times, and so is every pair where one walk raised a
holding (a good, stored goods, a treasury) and the other lowered it — a conversion and its
inverse. The map's sources are laid once per cycle, not per replay, so a replay that finds its
source spent pays nothing: a pump there is a source that pays twice. Wealth counts the purse, fief
treasuries, prisoners at their price and every good, bag and storage pooled per good, at what
selling the whole lot here would bring (the game's own `marketQuote`); at one unit's price, buying
looked like a pump, since each buy lifts the price of what's already held. Richer on all five
turns with the clock still is a pump. A press that throws is reported too. Proven on planted bugs
(seed 1, 200-400 walks): the old trade-edge pump (spread closed) comes back as 74 pumps, a
treasury withdrawal paying 10% extra as 4, a ransom that leaves the lord in chains, prisoners sold
and kept, and a quest that pays and stays open (caught at the city gate, where walking in hands
it in again). **The battle is played (#148):** `Battle.start` used to end the walk, so the band
gate had six distinct walks (fight, flee, give in). Now a real battle is stepped frame by frame,
as `duel.js` does. `~fight` is a press that runs it to its end or to the enemy breaking, and the
field's own choices are presses: "Bırak Gitsinler" (`spareRouters`), surrender through its
question window. A failed flee lands in the same battle. The hunt's band is a real one (the
`bandit` kind, 10 strong, over `ROUT_MIN`, so it can break): without `band`, a band fell through
to a lord's roster and the recruits never won. The hunt clears a scene it abandons
(`abandon()`); only `endBattle` resets the arena mode, so an arena bout dropped mid-walk turned the
next field battle into an arena one. Proven on a planted bug: a won battle that leaves the band on
the map comes back as pumps (fight, spare the routers: +150–350 on every replay). Measured, seeds
1-3 × 600 walks: 6754 walks and 10143 pairs, no pump, ~99 s a seed; the band gate 196 distinct
walks (win and chase, win and spare, surrender mid-fight, flee into the fight). Its first find was no pump but a crash — the gate's "join the
feast" after greeting the hall carried the feast past its last midnight. The nightly runs it on
two seeds, plain and with the trade edge at its cap. Also since 2.4.3,
`tools/test.js` offers every quest from every lord allowed to give it, on four seeds in TR and
EN, and reads each text it shows (offer, list, three days on, awaiting its hand-in) for a hole —
`undefined`, `NaN`, an unfilled `{0}`, a place its id no longer finds, a missing EN key. Clean.

`tools/playtest-scenario.js` is the one exception — paste it into the browser console, don't
run it with `node`. None of `tools/` is loaded by `index.html`; `.github/workflows/test.yml`
runs `test.js` + `framegate.js` on every push (no `npm install` step — the repo has no
dependencies), and on green push to `main` a `release` job cuts a GitHub release from
`VERSION.no` + that version's `CHANGELOG.md` section (skipped if the tag already exists, and it
fails loudly if the bump forgot a CHANGELOG line).

### e2e coverage (#133)
`e2e/specs/` drives the real game in Chromium, every spec in the five projects (TR/EN/ID,
desktop/phone, and the pseudo-locale). Beyond the first round (boot, menus, save/load, quests, map, battle, lair,
scene, i18n) each system has its own spec: `tournament` (arena purse, the three-round bracket
and the bet), `siege` (camp → ladder day → assault → own kingdom, and lifting it), `captivity`
(plan, a failed try, one try a day, ransom), `nobles` (fealty, courtship to the wedding feast,
hosting a feast), `fief` (garrison, storehouse and treasury, raid, tribute), `events` (the
10-second hail clock, walking the hail, winter coal, a wanderer joining), `heroine` (2.4.2: a
woman created with the hair button stepped through its four styles, into a battle wearing it; and
the hair flicker's guard — the area the hair adds over the same man's frame, every style, armour,
animation, facing and frame, may move ~20 px within a row; the broken frames fell 60-80 px below
the row's median and fail it by name). Writing them found
seven bugs, all in EN/ID or in a stale screen: the player's typed name and the circuit regulars
T()'d in the bracket, the player kingdom's name frozen at founding (now `Game.facName`), the
spouse's frozen name, an untranslated `zor`, T() calls nested in another T's placeholder that
the key extractor never saw (it recurses now), and town cards that kept their counts after a
garrison/storage/tribute change (`Game.redrawTown`).

## Two pipelines: the site and the app
`test.yml` is the web pipeline (game logic + a release). `native.yml` wraps the same files in a
Capacitor shell and leaves an installable `.apk` (debug-signed, sideloadable) + an unsigned iOS
simulator build as CI artifacts — nothing is forked, `native/www/` is just a `cp` of the repo's
own files, `ios/`/`android/` are regenerated every run rather than committed. A Capacitor shell
runs the same WebView engine as the browser, so it's not a performance win — what it buys is
full-screen (no address bar), no external font fetch, and no `dvh` toolbar dance.

Mobile-specific fixes worth remembering because they're easy to reintroduce:
- **`touch-action` doesn't inherit** — the gate is `* { touch-action: pan-x pan-y }` in
  `style.css`, not a rule on `html, body` (a body-only rule leaves every button inside it on
  `auto`, so the browser's own double-tap-zoom keeps firing). The seven elements that own real
  gestures (`#map-canvas`, `#battle-canvas`, `#battle-gl`, `#scene-canvas`, `#tstick`,
  `#tastick`, `#tb-block`) override it to `none`.
- Fonts (Cinzel/Inter) are self-hosted in `fonts/`, not fetched from `fonts.googleapis.com` —
  offline/`file://`/native WebView all silently lost that link and fell back to serif.
- The notch inset lives on `.screen` itself (`inset: env(...)`), not as padding on its
  containing block — an absolutely-positioned child's containing-block padding never moves it,
  only `top`/`inset` do; two earlier attempts (`env()` padding, then a `max(env(), 59px)` floor)
  were both no-ops for exactly this reason. Since 2.0.0 it is `var(--safe-top)` = the inset plus
  `min(6px, inset)`, a 6px gap under the status bar that stays 0 on a flat screen; the native
  shell's fallback is 65px. The map's fixed top bar reads the same variable, and the start
  screen's picture runs up under the notch (its padding carries the inset instead). The bottom
  strip on non-map screens pads `.content-area` by `safe-area-inset-bottom` so it clears the
  home indicator. Measured with Chromium's `Emulation.setSafeAreaInsetsOverride` (59/34px,
  393×852): the top bar starts at 65px, nothing on start/map/menus/town/battle sits under the
  island, and the bottom nav ends above the 34px home strip.
- **Battle HUD on a portrait phone**: the tug bar (`Battle.tugBox`, top 34) spans `W − 130`, so
  the minimap in the top-right corner used to sit on its "N Enemies" end. `Battle.miniBox(W)`,
  read by both renderers, drops the minimap below the tug bar and the log strip whenever the
  two would overlap (every phone in portrait; desktop and landscape keep the corner).
- `sw.js` registration is guarded by `!window.Capacitor`, not just a protocol check — the native
  shell's own origin (`https://localhost`) would otherwise install a second, stale asset cache
  on top of the one already bundled in the app.

## Code style
- English comments and identifiers; UI text stays Turkish, translated via `T()`.
- `innerHTML` template strings + inline `style`; button actions bind to globals via
  `onclick="Game.xxx()"`.
- Modal: `Game.showModal(html, width?, bgImage?)` / `Game.closeModal()`. `alert()` is fine — it's
  redirected to a modal, and a `\n` becomes `<br>`. The override checks `typeof Game` (`const
  Game` is a lexical global, not reachable via `window.Game`).
