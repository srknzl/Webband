# Plan: Noble Relations, Courtship/Marriage, and the Quest System

Goal: turn noble interaction, which right now is just "attack," into a system you can
talk to — build a relationship with, get quests from, ask for a lady's hand in.

This plan was written **after researching Warband's original systems**, but the quests
are deliberately not a copy of Warband's — they're original quests that exploit
WebBand's own mechanics (fog of war, captivity/escape plan, the tournament minigame,
food consumption, the promotion tree, the market multiplier). The only thing taken from
Warband is the **skeleton**: a relation score, personality types, quest-giver roles, the
courtship → asking the father → dowry → wedding flow.

---

## Research summary — what does Warband have?

Source: the Warband module system (`module_quests.py`), StrategyWiki, the M&B Wiki,
community guides.

**Relation:** A separate score with each lord, from −100…+100. Helping in battle,
clearing their fiefs of bandits, finishing a quest (+10) raises it; attacking, failing a
quest, breaking things off in dialogue lowers it. 30+ = "friend." There's also a separate
"standing" score with each town/village; a high one gives more and better volunteers.

**Personality types:** Martial (25%), Quarrelsome, Pitiless, Cunning, Debauched/Sadistic,
Good-natured, Upstanding. Decides who's pleased by what, which quest they'll give, and
how they react to fief distribution.

**Quest givers:** Lord, king/marshal, village elder, guild master, lady. Vanilla lord
quests: carry a message, collect taxes, hunt a fugitive, recruit troops, escort a lady,
kill a merchant, bring back runaway serfs, tail a spy, bring in a captive lord, collect a
debt, lend your companion. Guild: escort a caravan, move a cattle herd, deliver wine,
destroy a bandit lair, ransom back a kidnapped girl. Village elder: bring wheat, bring
cattle, train villagers, clear out bandits. Lady: rescue a captive lord, challenge a
rival to a duel, pay a visit.

**Courtship/marriage flow:** Mix with the aristocracy at feasts and tournaments → learn
poems from bards at the tavern (max 5) → meet the lady, visit her, recite a poem →
dedicate a tournament win to her (up to +8 relation the first time) → once relation is
high enough, ask her father/guardian for permission → a dowry (~20,000 denars) →
a wedding at a feast. Rival suitors exist, can be knocked out with a duel.

**Feast:** Hosted by a noble who holds a town, entered at 200+ renown. Since lords all
gather in one place, it's the most efficient spot to build relations and collect quests.

---

## Phase 0 — Fix these first (mandatory)

The quest and courtship system is built on top of these; it won't work if they stay
broken:

1. **The tournament softlock** (`app.js:2921, 2994`) — `battle-log` doesn't exist,
   `start()` blows up there; the click listener never binds, the loop never starts.
   The player is stuck on a blank screen. Since courtship's main mechanic will be
   "dedicate a tournament win," this is **priority one**. → use `battle-log-left`.
2. `Game.payRansom()` / `Game.refuseRansom()` are undefined (`app.js:894-895`) → the
   ransom modal is a dead button. Captivity quests will depend on this.
3. `LORDS[].portrait` is an absolute Windows path → portraits don't load. Switch to
   the local `lord_portraits.jpg` sprite sheet (`portraitIndex` → `background-position`).
4. Duplicate definitions: `showLore` (481 / 1599), `toggleEscapePlan` + `attemptEscape`
   (1031 / 1962). Delete the second ones.
5. `renderPartyScreen()` should use `getPartyCapacity()` instead of a fixed
   `partyCapacity`.
6. Match `state.player.proficiencies` keys to the ones on the character screen.
7. **Save/load (localStorage).** Quests will have a day counter; a player losing a
   20-day quest just from refreshing the tab is unacceptable.
   `JSON.stringify(state)` + a single "Save/Load" button is enough.

---

## Phase 1 — Bring the nobles to life

### 1.1 Data model

`LORDS` is expanded (4-5 per faction, ~22 total):

```js
{ id, name, faction, personality, homeLocId, portraitIndex, lore,
  gender: 'm', title: 'Lord' }
```

A new `LADIES` array (2-3 per faction, ~12 total):

```js
{ id, name, faction, guardianId, homeLocId, portraitIndex,
  trait: 'romantic' | 'ambitious' | 'pious' | 'wild',
  lore }
```

`trait` decides how well each courtship move works (table 3.2).

Personality types (from Warband, 5 is enough):
`martial`, `cunning`, `debauched`, `goodnatured`, `quarrelsome`.

### 1.2 State

```js
state.relations   = {}   // lordId  -> -100..100
state.affection   = {}   // ladyId  -> 0..100
state.villageRel  = {}   // locId   -> -100..100
state.player.quests = []
state.player.poems  = []   // poems learned at the tavern
state.knownLocations = {}  // 'lord_x' -> {x, y, day, accuracy}
```

### 1.3 Nobles live on the map

`spawnNPCs()` generates a `type:'lord'` party for every lord (carrying a `lordId`
field). Size = 20 + level×2. `isHostile()` already recognizes the lord type; the only
change is that **when they aren't hostile, dialogue opens instead of a battle**
(a branch inside `triggerEncounter`).

A noble counts as "home": their party is within 300 units of their own `homeLocId`, and
they appear in that settlement's hall. During a feast everyone is forced into the
feast's city.

### 1.4 The lords' hall gets rewritten

The current two-button screen goes away. In its place:

- A portrait grid of the nobles **currently present** in that settlement (lords and
  ladies).
- Ladies get their own section: **"Guests of the Hall"** — a renown gate to enter
  (see 3.1 below).
- Click a portrait → a dialogue modal.

### 1.5 Dialogue menu (`Game.talkToNoble(nobleId)`)

A single `showDialog(node)` helper (~25 lines) is enough — no dialogue-tree DSL.

| Option | Effect |
|---|---|
| **Ask how they're doing** | Once a day, +1 relation. The line varies by personality + current relation (extends the existing `getHumorousDialog`) |
| **Any quests?** | Phase 2 — an offer from the quest table |
| **"Where is …?"** (ask someone's whereabouts) | Phase 1.6 |
| **Give a gift** | An item from inventory → relation. Personality decides what they like |
| **I'd like to meet your daughter** | Phase 3 — only for lords who are a guardian |
| **Swear fealty to the king** | The existing `swearFealty`, moved here (king/vizier only) |
| **Insult** | −15 relation, +2 renown, +5 relation with that faction's rivals |
| **Leave** | — |

Gift table (multiplier by personality):

| Personality | Likes | Relation |
|---|---|---|
| martial | Sword, Battle Axe, Warhorse | +8 |
| cunning | Iron, Salt (trade goods) | +6 |
| debauched | Velvet, Beer, Cheese | +10 |
| goodnatured | Bread, Grain (hands it out to their people) | +7 |
| quarrelsome | nothing really pleases them | +3 (anything) |

The wrong gift: +1. A gift once a day.

### 1.6 "Ask someone's whereabouts" — an original mechanic

A feature the user asked for, and it fits WebBand's fog-of-war system perfectly.

- Ask any noble "Where is X?"
- The answer's accuracy depends on **your relation with the person you ask** and
  whether X is in the same kingdom:

| Relation with the person asked | Result |
|---|---|
| < 0 | Lies — a **wrong** marker on the map (800–1500 units off the real position) |
| 0-19 | "I don't know, they headed north" — direction only |
| 20-49 | A 600-unit uncertainty circle on the map |
| 50+ | A 200-unit circle + the target stays visible under the fog for 3 days |

- Asking about someone from another faction drops accuracy by one tier.
- The marker is written to `state.knownLocations`, cleared after 3 days.
- Drawn on the map as a dashed gold circle + a name label (inside `renderMap`).

This one feature solves "nobody knows where anyone is" and makes quests playable
(when a quest's target is a lord, you'll actually need to find them).

---

## Phase 2 — The quest system

### 2.1 Engine (keep it small)

```js
const QUESTS = {
  butter_blockade: {
    title: 'Tereyağı Ablukası',
    givers: ['lord'],                 // who can give it
    weight: 3,                        // selection weight
    personality: ['debauched','cunning'],  // which personality gives it (empty = any)
    minRelation: 0,
    offer(giver)  { /* build the text + target, return a quest object */ },
    tick(q)       { /* daily: check the deadline */ },
    check(q, ev)  { /* event-driven progress */ },
    reward(q)     { /* money/renown/relation */ }
  }, ...
};
```

- `state.player.quests` holds the active quests.
- `dailyUpdate()` calls `tick` on every quest (`fail` if the deadline passes).
- Events (`Game.emit('battle_won', npc)`, `'entered_location'`, `'bought_item'`,
  `'tournament_end'`, `'became_prisoner'`) flow into `check`.
- A new screen: a **"Quests"** button in the sidebar + `#quest-view`.
- The same noble won't give a new quest for 7-15 days after giving one.

### 2.2 Quests (original — not a Warband copy)

**Lord quests**

1. **Butter Blockade** *(market + price mechanic)*
   To spoil a rival's feast, buy and deliver 15 units total of cheese/meat from 3
   cities. Twist: each purchase raises that city's market multiplier by 8% — buying
   it all from one city gets expensive fast, you have to travel. 12-day deadline.
   Reward: 1200 denars, +12 relation. Prices stay +25% for 10 days in the cities you
   emptied out. *(A nod to Harlaus's butter lore.)*

2. **The Point in the Fog** *(fog-of-war mechanic — entirely original)*
   "My grandfather buried a banner out there. West of the river's sharpest bend, at
   the forest's edge." A hidden point is generated on the map; **you have to walk your
   sight radius over it**. No marker, just a text hint; a "Warm/Cold" notice as you get
   closer (500 / 1200-unit thresholds).
   Reward: 800 denars, +20 renown, +15 relation. No deadline.

3. **Sergeant's Trial** *(promotion-tree mechanic)*
   "Bring me 5 real Svadya Sergeants, not recruits." You have to promote troops and
   hand them over — the troops leave your party.
   Reward: 2000 denars + a Warhorse + 15 relation. 25-day deadline.

4. **Starving Army** *(food-consumption mechanic)*
   Bring 20 units of supplies to their army at a siege, within 8 days. But **your own
   party eats from those supplies on the way** — you can't make it without buying
   extra.
   Reward: 900 denars, +15 relation, +2 volunteers in that faction's villages.

5. **Brother in Chains** *(captivity mechanic — two different solutions)*
   Their brother is a captive in a bandit gang. A named bandit party spawns on the
   map.
   - **Path A:** beat the party in battle.
   - **Path B:** **deliberately surrender** to that party, fill out the "Escape Plan"
     for both of you while captive, and escape. (Escape chance fills 20% slower.)
   Path B gives more relation (+25 vs +15) and +30 renown.
   Lose, and the quest fails, −10 relation.

6. **Fixed Match** *(tournament mechanic — an inverted win condition)*
   A lord bet against you. They want you to **lose without looking disgraceful**:
   your score has to land between 5 and 8. Score 12 and the quest fails, score under
   4 and they say "too obvious" and it fails too.
   Reward: 1500 denars, +10 relation, **−15 renown**. `upstanding`-personality lords
   in the same faction take −10 relation too (word gets around).

7. **False Rumor** *(an inverse use of the 1.6 mechanic)*
   "Tell these three lords I'm in the east." Talk to all three and spread the lie.
   Once the quest ends, those three lords give you a **wrong location** for 5 days
   (their trust is shaken) and −5 relation each.
   Reward: 1000 denars, +20 relation (with the giving lord).

**Village elder quests**

8. **Crazy Hüsnü's Chickens** *(comic relief + a short quest)*
   Catch 5 chickens in the village within 3 days — a small variant of the tournament
   minigame (small, fast targets, 15 seconds).
   Reward: 150 denars, +8 village relation, +3 to the village's volunteer pool.

9. **Harvest Watch** *(NPC spawn + waiting)*
   Stay in the village on harvest night; 2 waves of bandit attacks come within 2
   days.
   Reward: 400 denars, +15 village relation (that village's volunteers now start at
   "Militia" tier).

**Lady quests** (part of courtship, see 3.2)

10. **The Lost Letter** — someone claiming to be her betrothed asks you to bring back
    a letter he took; it's in a rival suitor's party.
11. **Bring a Poem** — learn a poem from a specific city's tavern bard and recite it
    to her.

---

## Phase 3 — Courtship and Marriage (won't be simple)

The current version: 100 renown → a button → you're married. Changes completely.

### 3.1 Admission to the hall — a renown gate

Entering the section of the hall where the ladies are needs **renown ≥ 80**.
Below that you're turned away at the door ("Who is this dust-covered stranger?").
Entering a feast: **renown ≥ 150**.

### 3.2 Courtship score (`affection`, 0-100)

Two separate counters, and **both are needed**:
- `affection[ladyId]` — her interest in you
- `relations[guardianId]` — her father's/brother's trust in you

Courtship moves (each with its own cooldown):

| Move | Effect | Restriction |
|---|---|---|
| **Visit and chat** | +3 | Once every 3 days; repeating the same line drops it to +1 |
| **Compliment** | +5 / **−8** | A plus if it matches her trait, a minus if not. Trial and error, the hint is in her lore text |
| **Recite a poem** | +12 | Each poem works once per lady. Poems are learned from the tavern bard for 200 denars (max 5) |
| **Dedicate a tournament win to her** | +18 | Must be in the city where you won the tournament; once per lady |
| **Finish her personal quest** | +25 | Quest 10/11 |
| **Beat the rival in a duel** | +15 | See 3.4 |
| **Gift (jewelry/velvet)** | +6 | Once every 5 days |

Trait ↔ compliment matching:

| Trait | Likes | Hates |
|---|---|---|
| `romantic` | Being told about her beauty, her eyes | Being told about military triumphs |
| `ambitious` | Being told about your conquests, your renown | Poetry, flowers |
| `pious` | Being told about honor, justice | Loot, money |
| `wild` | Being told about horseback riding, hunting | Court manners |

### 3.3 Asking the father — a negotiation

Once `affection ≥ 60`, the option "I'd like to ask your father for your hand" opens.
When you talk to the guardian, **three things** are checked, each with its own
threshold:

1. **Renown** — at least 120. Below it: *"No one's heard your name. I won't give my
   daughter to a nobody."*
2. **Relation** — at least 25. Below it: *"I don't even know you."*
3. **Wealth and standing** — a dowry is asked for.

**Dowry calculation** (negotiable):

```
base = 8000
+ (if the lady's faction is strong) city count × 400
− renown × 20
− relation × 60
× (0.8 if a vassal, 1.0 if independent, 0.6 if you hold your own kingdom)
× personality multiplier (cunning 1.3, debauched 1.2, martial 1.0, goodnatured 0.8)
```

Typical range 3,000–12,000 denars. Shown **line by line** on screen ("−2400 denars
thanks to your renown") — so the player sees what to improve to make it cheaper.

Negotiation options:
- **Accept and pay** → engagement.
- **Negotiate** (depends on Leadership skill, 40% + level×5 chance): if it succeeds,
  −20%, if it fails, −5 relation and no retry that day.
- **"I have no money but I have my sword"** → the father gives a quest (from the
  Phase 2 list, its reward is subtracted from the dowry). Open to anyone above 200
  renown.
- **Elopement** → no dowry, but: −60 relation with the father, −20 with every lord
  in that faction, a war risk with that kingdom, −30 renown. Fast and free, but a
  heavy price.

### 3.4 The rival suitor

Each lady has a 60% chance of having a rival suitor (a lord from the same faction).
The rival's `affection` rises **+1.5 every day**. Whoever reaches 100 first wins —
so you can't leave the courtship hanging.

Dealing with the rival:
- **Challenge to a duel** — a 1v1 via `Battle.start` (both parties at 0, the rival is
  a boss-like stat block). Win, and the rival backs off (+15 affection, +10 renown);
  lose, and you aren't taken captive, but −20 affection and 5 days in bed (time
  skips).
- **Stain his reputation** — Phase 2's "False Rumor" mechanic; the rival's affection
  drops 20, but if you're caught (30%), −25 relation with that faction.
- **Ignore it** — move fast, catch up.

### 3.5 The wedding

After the engagement, the wedding happens **at a feast** (Phase 4). If there's no
feast, the guardian arranges one within 5-10 days.

Marriage's effects (beyond the current "spouse joins the party"):
- +15 to the right to rule (`rightToRule`)
- A +20 relation floor with every lord in her family
- Daily +50 denars (dowry lands)
- A "companion" unit in the party for the spouse (lvl 10, doesn't die — falls
  wounded in battle instead, 3 days out)
- Going to war against your spouse's faction halves relations and income

---

## Phase 4 — The Feast

The system that fixes "I can't find the noble" at its root, for both quests and
courtship.

- A feast opens in a random city every 10-20 days, lasting 4 days.
- For the feast's duration, **all of that faction's lords and ladies** are
  guaranteed to be in that city.
- Entering needs renown ≥ 150.
- At the feast: talk to everyone one by one (+2 relation, once per feast), quest
  offers refresh, tournament dedications happen, weddings happen here.
- If the player holds their own city, they can **throw their own feast**
  (3000 denars + 30 units of high-quality food) → +5 relation with every noble who
  attends.

---

## Build order and estimated size

| Step | Content | Estimate |
|---|---|---|
| 0 | Phase 0 fixes + localStorage save | ~150 lines |
| 1 | LORDS/LADIES data, relation state, lord parties on the map | ~200 lines data + 80 code |
| 2 | `showDialog` + dialogue menu + gift + insult | ~180 lines |
| 3 | "Ask someone's whereabouts" + drawing the map marker | ~100 lines |
| 4 | Quest engine + Quests screen | ~150 lines |
| 5 | 11 quests | ~400 lines |
| 6 | Courtship (affection, compliments, poems, dedication) | ~250 lines |
| 7 | Dowry negotiation + rival suitor + duel | ~200 lines |
| 8 | Feast | ~120 lines |

Total ~1800 lines — app.js grows to ~4800 lines. **At this point app.js should be
split:** `data.js` (constants), `nobles.js`, `quests.js`, `battle.js`, `game.js`.
Loaded in order via `<script>` tags, no build system needed.

## Points awaiting a decision

1. **Can a female character be played?** In Warband, a female player follows a
   different path (her own family tries to marry her off). For now I'd suggest
   assuming a male character and adding it later.
2. **Is the 3,000–12,000 dowry range right?** In the current economy a battle earns
   ~80 denars, a tournament 500. That figure means ~40-60 battles — the economy will
   probably need inflating a bit too (raise trade profit; quest rewards are already
   high).
3. **Is the localStorage save in Phase 0 mandatory?** Since quests have a day
   counter, I'd say yes, but if you'd rather, we could make quests untimed and
   put the save off.
