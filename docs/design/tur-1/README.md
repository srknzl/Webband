# Görsel yenileme — Tur 1

Visual-refresh proposal, round 1: diagnosis, CraftPix pack review, two live PoCs
(equipment-driven player sprite, mini battle old-vs-new) and three UI mocks.
Nothing here is wired into the game yet.

- `index.html` + `engine.js` + `app.js` — open `index.html` through a static server
  (`python3 -m http.server`); canvases read the sprite sheets with `getImageData`.
- `node build.js` inlines the two scripts into `page.html` (the published artifact).
- `a/sw1..3/` — CraftPix "Free Swordsman 1-3 Level" layers (body/head/sword/…),
  `a/arc/` — the Roguelike Kit archer, blood and arrow; see `troops/LICENSE.txt`.
- `a/shots/` — screenshots of the game as of 1.33.0.
- `review.html#nasal|1|a` — every frame of one helmet (`nasal|cap|greathelm`), level
  (`1..3`) and set (`a` = Idle/Walk/Run, `b` = attack/Hurt/Death); `review/` holds the
  sheets checked for round 1.
