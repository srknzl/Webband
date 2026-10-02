# Plan: Smithing — the forge, the grindstone, the mine

Goal: let the player make weapons and armour by hand, in a mini-game modelled on Kingdom Come:
Deliverance II's forge. Raw iron and coal come from the market, or are stolen out of a bandit-held
mine. A new skill, Demircilik, decides which tiers the player can forge.

## Decisions (2026-10-02)

- **Mechanics follow KCD2.** Read the heat from the metal's glow, work the bellows, hammer the
  piece *evenly* into its outline, reheat when it cools, quench when the shape is right. The
  grindstone is about angle and pressure, read from the sparks.
- **Quality uses the existing tiers.** Kılıç → Çelik → Şam → Kraliyet, plus a few new items in
  phase 4 that can only be forged and need high Demircilik.
- **Sharpening gives a temporary bonus.** A sharpened blade hits harder and dulls over battles.
  There is no wear system.
- **The mine works like the bandit house.** Iron and coal count only once you carry them out
  through the exit. There are no prisoners. Sacks already set down at the exit stay yours
  even if you lose.
- **Two places to forge.** A town's smithy, rented by the job, and the player's own castle or
  town, free, which can also use the materials in its storage.
- **Sound.** Real recordings chosen by the user from an artifact page of candidates
  (`forge/CREDITS.md`), the grindstone's too (2.6.1); only the tongs' clank is synthesized.

## Phases

1. **The forge** (2.5.0): the 🔨 Demirhane card, the recipe window, the forge scene
   (`forge.js`, `Forge`) with its heat, anvil and quench steps, the `smithing` skill, and the
   "Demirciydi" background starting with it. Existing tiers only.
2. **The grindstone** (2.6.0): sharpening, a temporary damage bonus applied in `Battle.afterArmor`.
   Angle and dwell, read from the sparks and the heat tint; pressure is not modelled (a phone can't
   sense it).
3. **The mine**: a new lair level in `lair.js`. Sacks are carried and slow you and make noise;
   a mine cart is loud. Sacks set down at the exit are banked; the foreman's chest holds rare
   steel.
4. **Smith's work**: new top-tier items (smithing 8 and rare steel), the Örs perk branch, and
   melting loot down for scrap.

## Phase 1 model

The bar is `N = 24` segments, tang first, tip last. Each segment has a temperature `T` (°C) and
the work still left to do on it, `w` (it starts near 1, the outline is 0, and below 0 is
overworked). The numbers live in `Forge.MODEL`; `tools/test.js` pins their behaviour.

- **Forge.** The hearth `F` climbs towards 1450 °C while the bellows are pumped and settles
  towards 820 °C when they stop, with a lag. Each segment chases `F`; the tip heats fastest and
  the tang stays cooler. A segment held above 1300 °C (white) for more than 0.8 s burns.
- **Anvil.** Every segment cools towards room temperature. Thin (finished) segments and the tip
  cool fastest. A blow takes `0.40 × power × eff(T)` off `w`, spread over neighbouring segments
  as a Gaussian (σ 0.85). `eff` is 0 below 600 °C, rises linearly to 1 at 950 °C and stays there.
  A hard blow on a segment under 650 °C is a cold strike: a flaw. Holding the press charges the
  blow (0.35 to 1).
- **Quench.** Allowed once every segment is within tolerance of its outline. Each segment is
  judged on its temperature (760–900 °C is ideal), and a large spread between the hottest and
  coolest is penalised.
- **Score.** `S = 0.55 × shape + 0.30 × quench + 0.15 × care`.
  - At or above the pass mark (0.62 + 0.04 a tier, a little lower for a smith above the
    recipe's level): the item.
  - From 0.40 up to the pass mark: the tier below, if the family has one.
  - Below 0.40: ruined, and half the iron comes back.
- **Skill.** A recipe needs Demircilik 1/3/5/7 for tiers 1–4 (every skill starts at 1). Every level above that slows
  cooling (up to −30 %) and lowers the pass mark (up to −0.05). Forging trains Demircilik
  and strength.
- **Cost.** Iron is `round(basePrice × 0.5 / 150)` (at least 1) and coal is `2 + 1.5 × iron`.
  The hours are `2 + 2 × tier index`. The town's rent is `10 + 10 × tier index`. At the
  market's 0.7 sell ratio, a tier-1 piece only breaks even, and the margin grows with tier.
  It is a trade, not a pump: the hours always pass.

The implemented numbers (heating rates, cooling, the scripted smiths' scores) are in
`docs/SYSTEMS.md` → *Smithing (2.5.0)*.
