// node poc/sim/check.mjs — sanity + determinism + cost of the shared POC battle.
// Prints a checksum per army size; poc/e-godot/sim.gd's port prints the same line
// (`--check` mode) so the two can be compared number for number.
import { createSim } from './battle-sim.js';

const sum = sim => {
    let h = 0;
    for (const u of sim.units) h = (h * 31 + Math.round(u.x * 100) + Math.round(u.y * 100) * 7 + Math.round(u.hp)) % 1000000007;
    return h;
};

let failed = false;
for (const perSide of [20, 100, 250]) {
    const a = createSim({ perSide, seed: 1 }), b = createSim({ perSide, seed: 1 });
    let t0 = performance.now(), endStep = 0;
    for (let i = 0; i < 60 * 180 && !endStep; i++) { a.step(); if (a.endT) endStep = a.steps; }
    let ms = (performance.now() - t0) / a.steps;
    for (let i = 0; i < a.steps; i++) b.step();
    const same = sum(a) === sum(b);
    const c = createSim({ perSide, seed: 1 }), at = {};
    for (let i = 1; i <= 1800; i++) { c.step(); if (i === 600 || i === 1800) at[i] = sum(c); }
    console.log(`perSide=${perSide} arena=${a.W}x${a.H} ends@${(endStep / 60).toFixed(1)}s alive=${a.alive} ` +
        `step=${ms.toFixed(3)}ms deterministic=${same} checksum@600=${at[600]} checksum@1800=${at[1800]}`);
    if (!same || !endStep) failed = true;
}
process.exit(failed ? 1 : 0);
