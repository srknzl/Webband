#!/usr/bin/env node
// ============================================================
// duel.js — pits two troop types against each other in the real battle engine (#62)
// ------------------------------------------------------------
// Does NOT write a separate damage formula: Battle.start sets up the arena,
// units spawn from TROOP_TYPES, then Battle.update(dt) is stepped forward.
// So the measurement includes blocking, kiting, charges and terrain.
//
//   node tools/duel.js --a "Nord Baltacısı" --b "Rodok Kalkanlısı" --n 200
//   node tools/duel.js --a "Svadya Milisi" --b "Rodok Kalkanlısı" --count 5
//   node tools/duel.js --list                   # print troop names
//   node tools/duel.js --report                 # default matchup table → docs/olcum
// ============================================================
'use strict';
const H = require('./harness');

const DT = 1 / 60;          // the engine's own frame step
const MAX_S = 180;          // a stalemate fight shouldn't run forever

// Spawn position and attack timers roll dice, and if the dice were
// `Math.random` the same command would give two different results — a
// matchup near the stalemate cutoff would then pass or fail at random. The
// stream is set up once per world: rounds differ from each other, but runs
// are identical to each other.
function rngOf(g) {
    if(!g._duelRng) g._duelRng = H.mulberry32(g.seed === undefined ? 1 : g.seed);
    return g._duelRng;
}

function mkUnit(g, name, i, team, W, HGT) {
    const t = g.TROOP_TYPES[name];
    if(!t) throw new Error(`unknown troop: ${name}`);
    const rnd = rngOf(g);
    return {
        id: (team ? 'a_' : 'b_') + i, isPlayerTeam: team, name,
        hp: t.hp, maxHp: t.hp,
        x: team ? 60 + rnd() * 40 : W - 100 + rnd() * 40,
        y: 40 + rnd() * (HGT - 80),
        speed: t.speed, attack: t.attack, defense: t.defense,
        type: t.type, dmgType: t.dmgType, charge: 1.3,
        // Terrain's "mounted" rule looks at this, not `type` (same rule as battle.js) —
        // skip it and the measurement lets cavalry fight penalty-free in a forest.
        mounted: t.type === 'cavalry' || t.speed > g.Battle.FOOT_MAX,
        color: team ? '#33aaff' : '#ff4444', radius: t.type === 'cavalry' ? 7 : 5,
        atkCd: rnd() * 0.6
    };
}

/** One fight: did team A win, how many seconds, how many were left standing. */
function fight(g, a, b, n) {
    const { Battle } = g;
    let done = null;
    const end = Battle.endBattle;
    Battle.endBattle = won => { done = won; Battle.active = false; };   // loot/modal path stays closed
    Battle.start('Çapulcu', 1);
    const W = Battle.canvas.width, HGT = Battle.canvas.height;
    Battle.units = [];
    for(let i = 0; i < n; i++) Battle.units.push(mkUnit(g, a, i, true, W, HGT));
    for(let i = 0; i < n; i++) Battle.units.push(mkUnit(g, b, i, false, W, HGT));
    Battle.reserves = { p: [], e: [] };
    Battle.projectiles = []; Battle.corpses = [];

    let t = 0;
    while(done === null && t < MAX_S) { Battle.update(DT); t += DT; }
    const alive = team => Battle.units.filter(u => u.isPlayerTeam === team && u.hp > 0).length;
    const out = { won: done, duration: t, remainingA: alive(true), remainingB: alive(false) };
    Battle.endBattle = end;
    return out;
}

function duel(a, b, n, rounds, seed) {
    const g = H.world({ seed });
    let winA = 0, sum = 0, remaining = 0, stalemates = 0;
    for(let i = 0; i < rounds; i++) {
        const r = fight(g, a, b, n);
        if(r.won === null) { stalemates++; continue; }
        if(r.won) { winA++; remaining += r.remainingA; }
        sum += r.duration;
    }
    const ok = rounds - stalemates;
    return {
        a, b, count: n, rounds,
        winRateA: ok ? +(winA / ok * 100).toFixed(1) : 0,
        avgDuration: ok ? +(sum / ok).toFixed(1) : 0,
        avgRemainingA: winA ? +(remaining / winA).toFixed(1) : 0,
        stalemates
    };
}

// Matchups measured in report mode: source of the balance sentences in CLAUDE.md
const PAIRS = [
    ['Nord Baltacısı', 'Rodok Kalkanlısı'],
    ['Nord Baltacısı', 'Svadya Şövalyesi'],
    ['Rodok Mızraklısı', 'Nord Baltacısı'],
    ['Svadya Milisi', 'Rodok Kalkanlısı'],
    ['Svadya Köylüsü', 'Svadya Milisi'],
    ['Kergit Atlı Okçusu', 'Rodok Tatar Yaylısı']
];

function main() {
    const a = H.args();
    const g0 = H.load({ seed: 1 });
    if(a.list || a.liste) return console.log(Object.keys(g0.TROOP_TYPES).join('\n'));

    const n = Number(a.count || a.sayi || 1), rounds = Number(a.n || a.tur || 50), seed = Number(a.seed || a.tohum || 1);
    const pairs = a.a && a.b ? [[String(a.a), String(a.b)]] : PAIRS;
    const rows = pairs.map(([x, y]) => {
        const r = duel(x, y, n, rounds, seed);
        console.error(`${x} vs ${y}: %${r.winRateA} / ${r.avgDuration} s`);
        return r;
    });
    if(a.json) return console.log(JSON.stringify(rows, null, 2));

    let md = `# Duel measurement — ${n}v${n}, ${rounds} fights per round\n\n`
        + `\`node tools/duel.js --count ${n} --n ${rounds}\` · version ${g0.VERSION.no}\n`
        + `Stepped through the real battle engine (\`Battle.update\`): blocking, kiting, charges and terrain included.\n\n`
        + `| A | B | A wins | Avg. duration | A remaining | Stalemates |\n|---|---|---|---|---|---|\n`
        + rows.map(r => `| ${r.a} | ${r.b} | **%${r.winRateA}** | ${r.avgDuration} s | ${r.avgRemainingA}/${r.count} | ${r.stalemates} |`).join('\n') + '\n';
    console.log(md);
    if(a.report || a.rapor) console.error('written: ' + H.writeReport('duello', md));
}

if(require.main === module) main();
module.exports = { duel, fight };
