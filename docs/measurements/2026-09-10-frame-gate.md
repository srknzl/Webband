# Frame-skip gate — 2-second run

`node tools/framegate.js --seconds 2` · version 0.63
The game's own `Game.skipFrame` was driven with fake timestamps.
Rule: refresh rate is measured, **the largest divisor that doesn't drop below 60 fps** is chosen.

| Screen | Passed fps | Divisor |
|---|---|---|
| 60 Hz | **60** | 1 |
| 75 Hz | **75** | 1 |
| 90 Hz | **90** | 1 |
| 120 Hz | **60** | 2 |
| 144 Hz | **72** | 2 |
| 165 Hz | **82.5** | 2 |
| 180 Hz | **60** | 3 |
| 240 Hz | **60** | 4 |

## Parity (#42): when two loops ask in the same frame

| Screen | Map loop | Battle loop | Mismatch |
|---|---|---|---|
| 60 Hz | 60 fps | 60 fps | 0 |
| 75 Hz | 75 fps | 75 fps | 0 |
| 90 Hz | 90 fps | 90 fps | 0 |
| 120 Hz | 60 fps | 60 fps | 0 |
| 144 Hz | 72 fps | 72 fps | 0 |
| 165 Hz | 82.5 fps | 82.5 fps | 0 |
| 180 Hz | 60 fps | 60 fps | 0 |
| 240 Hz | 60 fps | 60 fps | 0 |

Mismatch should be 0: if two questions asked in the same frame get different
answers, one of the loops is permanently starved and its screen goes black.
