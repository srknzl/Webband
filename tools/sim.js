#!/usr/bin/env node
// ============================================================
// sim.js — playerless world simulation (#62)
// ------------------------------------------------------------
// Diplomacy, campaigns, sieges, trade and banditry all run N days on their
// own; output is JSON + a markdown table under docs/olcum. This is the
// source of ranges like "4-11 conquests" in CLAUDE.md.
//
//   node tools/sim.js --days 200 --seed 1..5
//   node tools/sim.js --days 200 --seed 1..5 --report       # write to docs/olcum
//   node tools/sim.js --days 50 --json                      # raw JSON
// ============================================================
'use strict';
const H = require('./harness');

// Every world event goes through Game.news, and a call with no effect doesn't
// write news (declareWar already returns early for a pair already at war) —
// this is the single gate for the counters.
// *Wrapping the functions instead would double-count: 11 conquests would show as 22.*
const NEWS_KINDS = [
    ['conquest', m => m.startsWith('🏰')],
    ['warDeclared', m => m.startsWith('⚔️')],
    ['peace', m => m.startsWith('🕊️')],
    ['alliance', m => m.startsWith('🤝')],
    ['allianceBroken', m => m.startsWith('💔')],
    ['campaign', m => /mareşal seçildi/.test(m)],
    ['caravanRaid', m => m.startsWith('🗡️')],
    ['raidRepelled', m => m.startsWith('🛡️')],
    ['partyScattered', m => m.startsWith('🩸')]
];

function simulate(seed, days) {
    const g = H.world({ seed });
    const { Game, state, LOCATIONS, FACTIONS } = g;
    const c = {};
    NEWS_KINDS.forEach(([k]) => c[k] = 0);

    const news = Game.news.bind(Game);
    Game.news = (msg, mine) => {
        let m = String(msg).trim(), hit = NEWS_KINDS.find(([, test]) => test(m));
        if(hit) c[hit[0]]++;
        return news(msg, mine);
    };

    const owned = f => LOCATIONS.filter(l => l.faction === f).length;
    const min = {};
    Object.keys(FACTIONS).forEach(f => min[f] = owned(f));

    H.run(g, days, () => {
        Object.keys(FACTIONS).forEach(f => { min[f] = Math.min(min[f], owned(f)); });
    });

    const end = {}; Object.keys(FACTIONS).forEach(f => end[f] = owned(f));
    return {
        seed, days,
        ...c,
        erasedKingdoms: Object.keys(FACTIONS).filter(f => min[f] === 0).length,
        kingdomTerritory: end,
        avgProsperity: +(LOCATIONS.reduce((a, l) => a + (l.prosperity || 0), 0) / LOCATIONS.length).toFixed(1),
        openWars: Object.keys(state.wars).length,
        fundedBands: state.npcParties.filter(n => n.purse > 0).length,
        caravans: state.npcParties.filter(n => n.trade && n.size > 0).length,
        errors: g.Debug.errors.length
    };
}

const COLS = [
    ['conquest', 'Conquered'], ['campaign', 'Campaigns'], ['warDeclared', 'Wars declared'], ['peace', 'Peace'],
    ['alliance', 'Alliances'], ['caravanRaid', 'Caravan raids'], ['raidRepelled', 'Repelled'],
    ['avgProsperity', 'Avg. prosperity'], ['erasedKingdoms', 'Kingdoms erased'], ['errors', 'Errors']
];

function main() {
    const a = H.args();
    const days = Number(a.days || a.gun || 200);
    const list = H.seeds(a.seed || a.tohum, [1]);
    const rows = list.map(s => {
        const t0 = Date.now();
        const r = simulate(s, days);
        r.duration = ((Date.now() - t0) / 1000).toFixed(1) + ' s';
        if(!a.json) console.error(`seed ${s}: ${r.conquest} conquests, ${r.campaign} campaigns, ${r.peace} peace (${r.duration})`);
        return r;
    });
    if(a.json) return console.log(JSON.stringify(rows, null, 2));

    const rng = k => {
        const v = rows.map(r => r[k]);
        const lo = Math.min(...v), hi = Math.max(...v);
        return lo === hi ? String(lo) : `${lo}–${hi}`;
    };
    let md = `# Playerless world simulation — ${days} days × ${list.length} rounds\n\n`
           + `\`node tools/sim.js --days ${days} --seed ${a.seed || a.tohum || 1}\` · version ${H.load({ seed: 1 }).VERSION.no}\n\n`
           + `| Seed | ${COLS.map(c => c[1]).join(' | ')} |\n|---|${COLS.map(() => '---').join('|')}|\n`
           + rows.map(r => `| ${r.seed} | ${COLS.map(c => r[c[0]]).join(' | ')} |`).join('\n')
           + `\n| **Range** | ${COLS.map(c => '**' + rng(c[0]) + '**').join(' | ')} |\n\n`
           + `Kingdom territory (final round): `
           + Object.entries(rows[rows.length - 1].kingdomTerritory).map(([f, n]) => `${f} ${n}`).join(', ') + '\n';
    console.log(md);
    if(a.report || a.rapor) console.error('written: ' + H.writeReport('dunya-simulasyonu', md));
}

if(require.main === module) main();
module.exports = { simulate };
