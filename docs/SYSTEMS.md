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
  Space/🎯 recenters. Icons/labels scale with `Game.iconScale()`/`1/zoom` so they don't vanish
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
`Game.clockStopped()` (`paused || towerReveal`) gates `update(dt)` — `renderMap()` stays outside
that gate on purpose (a tower reveal is a frozen map you're meant to look at). Esc: close a
window → go to map → pause (opens Resume/Save/Settings/Main Menu). `closeModal` is the one place
that clears `Game.paused` directly. `state.timeScale` cycles 0.5→1→2 via the calendar badge.

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
  **Space** recenters — all via `Input.init`, disabled during a modal/battle.
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
250 denars (background shifts ±300), party capacity 12, solo. Loot from a low-level enemy is
scaled down (`Battle.rewardScale`).

### Mercenaries
2 slots/town at the inn, refreshed every 3 days: troops at level 10–15 from that town's faction
tree, `60 + level×12` denars.

### Party & troops
**Faction troop trees** (`TROOP_TREES`, the single source `TROOP_UPGRADES`/`TROOP_TYPES` are
generated from):

| Faction | Villager | Branches | Character |
|---|---|---|---|
| Svadya | Svadya Köylüsü | Milis→Çavuş, Avcı→Keskin Nişancı, Süvari→Şövalye | balanced, strongest heavy cavalry |
| Rodok | Rodok Köylüsü | Mızraklı→Kalkanlı, Nişancı→Tatar Yaylısı | no cavalry, best defense/archers |
| Veagir | Veagir Köylüsü | Piyade→Baltacı, Okçu→Nişancı, Atlı→Süvari | axes, deadly archers, mediocre cavalry |
| Nord | Nord Serfi | Savaşçı→Baltacı, Avcı→Nişancı | no horses, strongest infantry |
| Kergit | Kergit Çobanı | Atlı→Süvari, Atlı Okçu→Han Muhafızı | all mounted, fastest, light armor |

**Damage type by troop** (`u.dmgType`): axe/sword = cutting, spear/bow = piercing, a villager's
club = blunt; cavalry counts as cutting (the charge already represents the lance).

#### Balance is a range rule, not a win-rate table
Same tier **40–60%**, one-tier gap **65–80%**, two tiers **85%+**; a unit's counter-type
(spear→cavalry, bow→light) gets **+10**. `ARMOR_FLOOR`(0.18) means a strong hit is never reduced
below 18% of its type-adjusted raw. Anti-cavalry lives in the **brace**
(`Battle.braceMult`), not the damage type — spear infantry ×1.5, a shield troop gets a lighter
explicit `u.brace` so its identity doesn't leak into every matchup (`pierce` on a shield troop
was tried and rejected — it halves armor in *every* fight, not just against horses).

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
×0.7 of buy. **Weapon tiers**: 5 base weapons × 4 quality tiers each (T1 base → T4, price growing
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
`poem_recited_lord`, `raided`; `Quests.dailyTick()` runs each quest's `day()` hook and checks
deadlines.

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
reward is denars/renown only, failure carries no relation penalty). Accepted quests live in
`state.player.quests`; a refused lord won't offer again for 7–15 days; one active quest per
lord; failure is −10 relation.

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
crossing convoy rolls a raid (guard resistance ×1.15 caravan / ×0.5 convoy); a repelled band is
halved, a raided convoy is removed and its cargo passes to the band (whoever beats that band
next gets it — no extra code, same loot pipeline). Idle bands within 1200 units actively chase
the nearest trade party if it's a winnable fight.

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
- **Auto-resolve** ("🎖️ Send Your Troops", available at 1.5× enemy strength): same engine, no
  arena — `Battle.autoResolve()` feeds the normal `endBattle`. Loss rate `0.45 / strength ratio`
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
→ `Game.clearLair`); respawns every `LAIR_RESPAWN`=20 days.

| Band | Character |
|---|---|
| Çapulcular | balanced, weakest |
| Orman Haydutları | archer-heavy, fast |
| Dağ Eşkıyaları | armored/tough, from day 20 |
| Kurt Sürüsü | very fast (104–112), `beast`: lunges from sight range ×1.6, never captured |

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
with the strength ratio** (`Battle.rewardScale`, exempt for bosses) so farming weak enemies
stops paying past a point. **Defeat**: party scatters, 60–90% of money lost, HP→30%, taken
prisoner, renown burns (`Game.defeatRenown`, scaled by how outmatched you were).

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
scattered party respawns 4–10 days later), a strong-enough army besieges a settlement over 3
days, and 35% of a wartime lord's movement targets an enemy settlement.

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
25% daily chance of a relief army showing up) → **assault** (`Battle.siege`: a wall across 66%
of the arena, the defender holds the breach's mouth, arrows pass over the wall like a rock).
Winning transfers the settlement to your liege (or founds your own kingdom if independent) and
declares war on the former owner.

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

**The chicken-chase minigame** (`TournamentMinigame`) still exists but only as a quest
encounter now — its tournament branch is unreachable, `start()` defaults to chicken mode.

**Arena** (`Battle.startArena`): always open, no party/loot/renown/prisoners — practice against
a leveled foe, always infantry (an archer would kite a 1v1 forever). A win pays a small purse
(`ARENA_PURSE`=10, scaled by town prosperity) with a 5-fight streak bonus; a loss pays **no XP**
(it used to pay 40%, making deliberate losses the fastest weapon-skill grind in the game).

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
`update`/`render` per drawn frame),
browser info, and the error list — every field wrapped in try/catch so the reporter itself can't
throw. Copy-to-clipboard or download as JSON.

### Save system
Versioned, migratable, exportable (`webband_save_<slot>`: `1/2/3` manual + `a1..a5` autosave
ring + `legacy`). `state.meta = { v, version, createdAt, playtime, autoIdx }`. `Save.auto()`
fires at the start of every game day. A corrupt save is moved to `webband_broken_<time>`, never
silently deleted. **The migration chain** `Save.migrate(d)` lives in one place, one `if` block
per version bump — never scattered `if`s inside `load()`.

### Error visibility: badge and loop shield
`Debug.guard(where, fn)` wraps the body of all three rAF loops — an exception is swallowed and
logged (deduped by signature), but `requestAnimationFrame` on the next line still runs, so the
loop survives instead of freezing the screen. `#err-badge` (bottom-right) surfaces the count.

### Settings screen
One gate: `Game.opt(k)`/`setOpt(k,v)`, defaults in `Game.OPTS`, `state.settings` stores only
deviations. Rows: sound/volume, reduce motion (System/On/Off), blood & corpses, frame-skip gate
toggle, font size, autosave, 🖱️ edge panning (Device-dependent/On/Off), 📱 lite mode
(Device-dependent/On/Off), 🎯 frame-rate target (Device-dependent/60/30, `Game.targetFps()`),
🧩 battle renderer (Device-dependent/WebGL/Canvas, `Game.opt('renderer')`), ⚔️ difficulty.

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

Language picked once on first launch (`#lang-ask`), stored in `localStorage.webband_lang`,
changeable anytime from Settings — a live screen rebuilds its own text, no restart needed.
**Known limit**: `state.warLog` news lines are stored already-translated, so switching language
mid-game leaves old news in the old language (accepted gap — fixing it needs a structured news
format).

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
Battle Brothers-style: one active goal at a time, completing it rewards renown/honor and opens
the next (party≥10 → tournament win / a friend lord → sworn oath → blood price / a landholder).
Pure data + a daily `check()`, shown at the top of the Quests tab.

### Achievements
50 one-time milestones (`ACHIEVEMENTS`), swept daily and on the Quests tab
(`Game.checkAchievements`). State-based conditions plus a `state.career` tally
(`Game.tally`/`careerBattle`) for things state alone can't answer (kill counts, best winning
odds, a no-losses win, etc). Each tier pays once (bronze 200₺, silver 650₺, gold 2000₺+20
renown) — deliberately not a stacking permanent bonus (that's what `RELICS` is for). A gold
achievement's name becomes a cosmetic title shown on the character screen.

### Enterprise and the fief treasury
**Enterprise** (`Game.buyEnterprise`, 3000₺): `prosperity × 0.55`/day, folded into `fiefIncome()`
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

## Audio layer
Two independent systems. **Transaction SFX** are still synthesized (WebAudio oscillator
envelopes, `Game.SFX`, no files). **Music** is 15 recorded CC0 tracks (10 map / 3 fight / 2
stings), loudness-normalized (EBU R128, map −19 LUFS / fight+stings −16) so no per-track mixer
is needed. Not precached by the service worker — a second fetch branch caches each track on
first play, so install stays light. Played via `<audio>` elements, not Web Audio (streams
immediately, no decode-then-play stall, and sidesteps iOS's AudioContext-resume bugs entirely).
`Music.sync()` picks `'map' | 'battle' | null` from the current screen + a 10-in-view-hours
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

The map, settlement scenes and the chicken chase are hand-drawn Canvas2D in `app.js`/`battle.js`;
the battle draws through PixiJS since 1.33.0 (below), with its Canvas2D code kept as the
fallback. Shared approach: **bake the expensive thing once, stamp the picture every frame**
(`buildGroundTexture`, `Battle.buildGround`, `unitSprite`, cached gradients). `Game.mapLabel()` scales with `1/zoom` so text stays the same
screen size at any zoom and pushes overlapping labels up rather than overlapping them. An NPC's
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
| `tools/test.js [--fast]` | the full assertion suite (`--fast` = pure-logic only, skips the day-200 sim) |

`tools/playtest-scenario.js` is the one exception — paste it into the browser console, don't
run it with `node`. None of `tools/` is loaded by `index.html`; `.github/workflows/test.yml`
runs `test.js` + `framegate.js` on every push (no `npm install` step — the repo has no
dependencies), and on green push to `main` a `release` job cuts a GitHub release from
`VERSION.no` + that version's `CHANGELOG.md` section (skipped if the tag already exists, and it
fails loudly if the bump forgot a CHANGELOG line).

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
