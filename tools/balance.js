#!/usr/bin/env node
// ============================================================
// balance.js — the battle-balance rules, fought out in the real engine
// ------------------------------------------------------------
// The design rules in docs/SYSTEMS.md ("Balance is a range rule") as scenarios: every one is a
// real fight stepped through Battle.update (tools/duel.js), not a formula. The scenarios are
// generated from the troop trees, so a new troop is covered the day it is added.
//
//   node tools/balance.js                 # the table, every rule with its measured win rate
//   node tools/balance.js --check         # exit 1 on a rule outside its range (tools/test.js runs this)
//   node tools/balance.js --only tier     # one group: tier, worth, mirror, band, counter, crowd, hit
//   node tools/balance.js --report        # also write docs/measurements/
// ============================================================
'use strict';
const H = require('./harness');
const { fight, troopRow } = require('./duel');

// The rules (2.8.0). A win rate is side A's over `n` fights, [lo, hi] in percent. Balance is
// read as worth — how many of one troop a troop is worth — because that is what a group fight,
// a wage and an upgrade price all ask. The engine is decisive one on one (no miss chance: a
// power edge of 1.3 already wins ~87 % of duels), so a duel rule can only say "the better
// troop wins"; the exchange rates live in the group fights.
const RULES = {
    oneTier:  [90, 100],   // one step up its own tree beats the step below, 1v1
    twoTiers: [97, 100],   // two steps up, 1v1
    // 8 of a step against 4 of the step above: one step up is worth two; 8 recruits against 2
    // elites: two steps up is worth four. Within ~±15 % — damage types make a tree's chain
    // intransitive: against an armoured sergeant a militiaman's spear (pierce) lands 11 % more than
    // a sword would and a villager's club (blunt) 7 % less, so the Swadian sergeant is worth two
    // militia but nearer five villagers. No one scale meets all three at 50 % (measured 26 / 59 / 78).
    worth2:   [20, 80],
    worth4:   [20, 80],
    // same step, same arm, two kingdoms, six against six: a kingdom's flavour — Rodok's slow,
    // thick-armoured shieldman against Swadia's sergeant — but within ~15 % of the other's worth
    // (identical stats read 45–55 %, Rodok's shape alone 25–40 %)
    mirror:   [20, 80],
    band:     [30, 70],    // a band's row against the troop it stands in for, six against six
    // the report: 22 villagers into 8 sergeants may lose, but they leave a quarter of the sergeants' blood on the field
    crowd:    [0, 100],
    // the triangle, six against six of one step: a braced line (spear, shield) holds riders even,
    // riders run down plain footmen and bowmen
    brace:    [30, 70],
    charge:   [70, 100],
    bow:      [75, 100],
};
const CROWD_TOLL = 0.25;
const N_DUEL = 30, N_GROUP = 64;   // 64: a 50 % rule reads ±6 (one σ); at 16 it read ±12 and 30–70 failed on noise

function scenarios(g) {
    const out = [], trees = g.TROOP_TREES;
    const name = r => r[0];
    for(const f of Object.keys(trees)) {
        const t = trees[f], rec = name(t.recruit);
        for(const [mid, elite] of t.branches) {
            if(mid[1] === t.recruit[1]) {     // the recruit's own arm (infantry)
                out.push({ group: 'tier', rule: 'oneTier', a: name(mid), b: rec });
                out.push({ group: 'tier', rule: 'twoTiers', a: name(elite), b: rec });
                out.push({ group: 'worth', rule: 'worth2', a: rec, na: 8, b: name(mid), nb: 4 });
                out.push({ group: 'worth', rule: 'worth4', a: rec, na: 8, b: name(elite), nb: 2 });
            }
            out.push({ group: 'tier', rule: 'oneTier', a: name(elite), b: name(mid) });
            out.push({ group: 'worth', rule: 'worth2', a: name(mid), na: 8, b: name(elite), nb: 4 });
        }
    }
    const byArm = {};
    for(const f of Object.keys(trees)) trees[f].branches.forEach(b => b.forEach((r, i) => {
        (byArm[r[1] + i] = byArm[r[1] + i] || []).push(name(r));
    }));
    // every pair: two kingdoms each within reach of a third can sit at opposite ends of it
    for(const xs of Object.values(byArm))
        for(let i = 0; i < xs.length; i++) for(let j = i + 1; j < xs.length; j++)
            out.push({ group: 'mirror', rule: 'mirror', a: xs[i], na: 6, b: xs[j], nb: 6 });
    // a band's rows against the kingdom troop each one stands in for
    [['Çapulcu', 'Svadya Köylüsü'], ['Orman Haydudu', 'Svadya Köylüsü'], ['Köy Bekçisi', 'Svadya Köylüsü'],
     ['Dağ Eşkıyası', 'Svadya Milisi'], ['Kervan Muhafızı', 'Svadya Milisi'], ['Çapulcu Reisi', 'Svadya Milisi'],
     ['Haydut Okçusu', 'Svadya Avcısı'], ['Eşkıya Reisi', 'Svadya Çavuşu']]
        .forEach(([x, y]) => out.push({ group: 'band', rule: 'band', a: x, na: 6, b: y, nb: 6 }));
    // the triangle (Fable danisma 006 in group form; tools/test.js keeps its 1v1 anchors)
    [['brace', 'Rodok Mızraklısı', 'Svadya Süvarisi'], ['brace', 'Rodok Mızraklısı', 'Kergit Atlısı'], ['brace', 'Rodok Kalkanlısı', 'Svadya Şövalyesi'],
     ['charge', 'Svadya Şövalyesi', 'Nord Baltacısı'], ['charge', 'Kergit Süvarisi', 'Veagir Baltacısı'], ['charge', 'Svadya Süvarisi', 'Veagir Piyadesi'],
     ['bow', 'Svadya Şövalyesi', 'Rodok Tatar Yaylısı'], ['bow', 'Svadya Süvarisi', 'Svadya Avcısı']]
        .forEach(([rule, a, b]) => out.push({ group: 'counter', rule, a, na: 6, b, nb: 6 }));
    out.push({ group: 'crowd', rule: 'crowd', a: name(trees.swadia.recruit), na: 22, b: 'Svadya Çavuşu', nb: 8, needToll: CROWD_TOLL });
    return out;
}

function rate(g, a, na, b, nb, n) {
    let w = 0, ok = 0, dur = 0, lostB = 0;
    for(let i = 0; i < n; i++) {
        const r = fight(g, a, b, na, nb);
        if(r.won === null) continue;
        ok++; dur += r.duration; lostB += 1 - r.hpLeftB; if(r.won) w++;
    }
    return { rate: ok ? Math.round(w / ok * 100) : 0, secs: ok ? +(dur / ok).toFixed(0) : 0, toll: ok ? lostB / ok : 0, ok };
}

function hash(str) {     // FNV-1a
    let h = 2166136261;
    for(let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
}

function measure(g, s) {
    const na = s.na || 1, nb = s.nb || 1, n = s.n || (na + nb > 2 ? N_GROUP : N_DUEL);
    // each rule rolls its own dice, seeded by what it is: a rule reads the same alone (--only), in
    // the full run, and after a scenario is added in front of it
    const seed = hash(`${s.rule}|${s.a}|${na}|${s.b}|${nb}`);
    g._sandbox.__rng = H.mulberry32(seed); g.reseed();
    g._duelRng = H.mulberry32(seed ^ 0x9e3779b9);     // duel.js places the men from its own stream
    const r = rate(g, s.a, na, s.b, nb, n), [lo, hi] = RULES[s.rule];
    const pass = r.ok > 0 && r.rate >= lo && r.rate <= hi && (!s.needToll || r.toll >= s.needToll);
    return Object.assign({}, s, { na, nb, rate: r.rate, secs: r.secs, toll: +r.toll.toFixed(2), pass });
}

// "Nobody hits for 1": every attacker's blow on every defender, through the one damage choke point
function hits(g) {
    const names = Object.keys(g.TROOP_TYPES).filter(n => n !== 'Acemi Asker');
    Object.values(g.BAND_KINDS).forEach(b => b.battle.concat(b.leader ? [b.leader] : []).forEach(r => names.push(r[0])));
    const rows = names.map(n => Object.assign({ name: n }, troopRow(g, n)));
    let worst = null;
    for(const a of rows) for(const d of rows) {
        const dmg = g.Battle.afterArmor(a.dmgType || 'cut', a.attack * g.Battle.DAMAGE_PACE, d.defense, { isPlayerTeam: false });
        if(!worst || dmg < worst.dmg) worst = { a: a.name, d: d.name, dmg };
    }
    return worst;
}

function run(opts = {}) {
    const g = H.world({ seed: opts.seed || 7 });
    g.Game.diff = () => ({ taken: 1, dealt: 1 });     // the rules are for the normal difficulty
    if(opts.patch) opts.patch(g);                     // an experiment: a stat table or formula tried before it's written in
    const list = scenarios(g).filter(s => !opts.only || s.group === opts.only);
    const rows = list.map(s => measure(g, s));
    const worst = !opts.only || opts.only === 'hit' ? hits(g) : null;
    return { rows, worst, version: g.VERSION.no };
}

function table({ rows, worst, version }) {
    const fmt = r => `| ${r.group} | ${r.na > 1 ? r.na + '× ' : ''}${r.a} | ${r.nb > 1 ? r.nb + '× ' : ''}${r.b} | ${RULES[r.rule].join('–')}${r.needToll ? ` · B's hp lost ≥ ${r.needToll * 100}%` : ''} | **${r.rate}%**${r.needToll ? ` · B lost ${Math.round(r.toll * 100)}%` : ''} | ${r.secs} s | ${r.pass ? '✓' : '✗'} |`;
    const bad = rows.filter(r => !r.pass).length;
    return `# Battle balance — version ${version}\n\n`
        + `\`node tools/balance.js\` · real engine (Battle.update), ${N_DUEL} duels / ${N_GROUP} group fights per row · `
        + `${rows.length - bad}/${rows.length} rules hold\n\n`
        + (worst ? `Weakest blow in the game: ${worst.a} → ${worst.d}: **${worst.dmg}**\n\n` : '')
        + `| Group | A | B | Rule | A wins | Length | |\n|---|---|---|---|---|---|---|\n`
        + rows.map(fmt).join('\n') + '\n';
}

function main() {
    const a = H.args();
    const res = run({ only: a.only, seed: a.seed && Number(a.seed) });
    const md = table(res);
    console.log(md);
    if(a.report) console.error('written: ' + H.writeReport('balance', md));
    if(a.check && (res.rows.some(r => !r.pass) || (res.worst && res.worst.dmg < 2))) process.exit(1);
}

if(require.main === module) main();
module.exports = { run, table, measure, RULES, scenarios };
