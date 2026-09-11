# WebBand

[![test](https://github.com/srknzl/Webband/actions/workflows/test.yml/badge.svg)](https://github.com/srknzl/Webband/actions/workflows/test.yml)

**[▶ Play it here](https://serkanozel.me/webband/)**

A single-page, Mount & Blade: Warband-style RPG that runs entirely in the browser.
Turkish, English and Bahasa Indonesia UI, chosen on first launch. No build step, no
dependencies, no server.

```bash
git clone https://github.com/srknzl/Webband.git
```

Then open `index.html` in a browser. That's the whole install. Saves are per-origin, so
the hosted game and your local copy keep separate saves.

## Controls

Mouse and keyboard on desktop: click the map to move, `M`/`C`/`P`/`I`/`Q` switch screens,
`Esc` closes a window, `Enter` presses its main button.

On a touch screen the game switches to two sticks in battle: **the left stick walks, the
right stick aims your sword** — where you pull is where you strike, lift to swing. The
yellow arc in front of you shows where the blade will land.

## What's in it

Procedural map of Calradia with five kingdoms, 23 lords and 12 ladies, roads, rivers and
forests. Real-time top-down battles with formations, morale, damage types, shields and
sieges. A market with per-good supply and demand, caravans and villager convoys that
bandits hunt. Quests, tournaments with betting, arenas, courtship and marriage, village
raiding, fiefs, vassals — and a war that keeps running whether you take part or not.

Saves live in `localStorage`: three manual slots plus a rolling autosave, exportable as
JSON from the 💾 Kayıtlar screen.

## Files

| File | Contents |
|---|---|
| `index.html` | DOM skeleton for every screen |
| `app.js` | Core: map, time, settlements, diplomacy, saves (`Debug`, `Input`, `Game`, `Save`, `state`) |
| `battle.js` | Battle arena and tournament minigame (`Battle`, `TournamentMinigame`) |
| `nobles.js` | Lords, ladies, companions, courtship, feasts |
| `quests.js` | Quest definitions and the quest engine |
| `i18n.js` | Language layer; the Turkish source text is the key |
| `lang-en.js`, `lang-id.js` | English and Bahasa Indonesia dictionaries (generated) |
| `style.css` | Glassmorphism theme |
| `tools/` | Headless test, simulation and balance tools, run by CI |
| `docs/` | Design plans, system notes and measurements (Turkish) |
| `CLAUDE.md` | Design notes and measured numbers (Turkish) |
| `CHANGELOG.md` | Player-facing change log (Turkish) |

## Reporting a bug

Open an issue with the template. The two fields that matter most are the **version stamp**
(bottom-right of the start screen) and the **debug report** (⚙️ Ayarlar → 🐞 Debug Raporu →
copy to clipboard) — it carries the browser, the measured refresh rate, the last frame
timings and the captured errors.

## Licence

AGPL-3.0-or-later. See [LICENSE](LICENSE).
