#!/usr/bin/env node
// ============================================================
// framegate.js — regression measurement for the frame-skip gate (#54 item 1, #62)
// ------------------------------------------------------------
// `Game.skipFrame` drops extra frames on high-refresh-rate screens. Here the
// game's **own** function is driven with fake timestamps; it isn't rewritten.
// Measures two things:
//   1. Refresh rate → passed-fps table (rule: largest divisor that doesn't drop below 60)
//   2. #42 parity: if two loops ask in the same frame, both get the same
//      answer — i.e. no loop is ever left permanently starved.
//
//   node tools/framegate.js
//   node tools/framegate.js --hz 60,90,144 --seconds 3 --report
// ============================================================
'use strict';
const H = require('./harness');

const HZ = [60, 75, 90, 120, 144, 165, 180, 240];

// One loop: hz frames per second, frames that pass the gate = measured fps
function measure(hz, seconds) {
    const { Game } = H.load({ seed: 1 });
    const step = 1000 / hz;
    let passed = 0;
    for(let i = 0; i < hz * seconds; i++) {
        if(!Game.skipFrame(i * step)) passed++;
    }
    return { hz, fps: +(passed / seconds).toFixed(1), divisor: Math.round(hz * seconds / Math.max(1, passed)) };
}

// #42: the map loop and the battle loop both ask in the same frame. If the
// gate doesn't make a single decision per frame, one of the loops always
// lands on the odd/even fingerprint and NEVER runs.
function parity(hz, seconds) {
    const { Game } = H.load({ seed: 1 });
    const step = 1000 / hz;
    let a = 0, b = 0, mismatch = 0;
    for(let i = 0; i < hz * seconds; i++) {
        const t = i * step;
        const s1 = Game.skipFrame(t), s2 = Game.skipFrame(t);   // two loops, same frame
        if(s1 !== s2) mismatch++;
        if(!s1) a++;
        if(!s2) b++;
    }
    return { hz, map: a / seconds, battle: b / seconds, mismatch };
}

function main() {
    const arg = H.args();
    const seconds = Number(arg.seconds || arg.saniye || 2);
    const list = arg.hz ? String(arg.hz).split(',').map(Number) : HZ;

    const rows = list.map(hz => measure(hz, seconds));
    const par = list.map(hz => parity(hz, seconds));
    if(arg.json) return console.log(JSON.stringify({ rows, par }, null, 2));

    const md = `# Frame-skip gate — ${seconds}-second run\n\n`
        + `\`node tools/framegate.js --seconds ${seconds}\` · version ${H.load({ seed: 1 }).VERSION.no}\n`
        + `The game's own \`Game.skipFrame\` was driven with fake timestamps.\n`
        + `Rule: refresh rate is measured, **the largest divisor that doesn't drop below 60 fps** is chosen.\n\n`
        + `| Screen | Passed fps | Divisor |\n|---|---|---|\n`
        + rows.map(r => `| ${r.hz} Hz | **${r.fps}** | ${r.divisor} |`).join('\n')
        + `\n\n## Parity (#42): when two loops ask in the same frame\n\n`
        + `| Screen | Map loop | Battle loop | Mismatch |\n|---|---|---|---|\n`
        + par.map(p => `| ${p.hz} Hz | ${p.map} fps | ${p.battle} fps | ${p.mismatch} |`).join('\n')
        + `\n\nMismatch should be 0: if two questions asked in the same frame get different\n`
        + `answers, one of the loops is permanently starved and its screen goes black.\n`;
    console.log(md);

    const belowTarget = rows.filter(r => r.fps < 60);
    const broken = par.filter(p => p.mismatch || p.map < 60 || p.battle < 60);
    if(belowTarget.length) console.error('WARNING below 60 fps: ' + belowTarget.map(r => `${r.hz}Hz→${r.fps}`).join(', '));
    if(broken.length) console.error('WARNING parity: ' + broken.map(p => `${p.hz}Hz`).join(', '));
    if(arg.report || arg.rapor) console.error('written: ' + H.writeReport('kare-kapisi', md));
    process.exitCode = (belowTarget.length || broken.length) ? 1 : 0;
}

if(require.main === module) main();
module.exports = { measure, parity };
