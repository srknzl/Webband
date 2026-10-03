#!/usr/bin/env node
// ============================================================
// oddsfit.js — the strength model (Battle.sideStrength) fitted to real-engine fights (2.11.0)
// ------------------------------------------------------------
// The odds label, the easy-prey cut, a band's courage and every fight the player doesn't play
// read one formula. Its constants used to be set by hand off a dozen fights; this tool gives it
// data instead. It deals hundreds of seeded matchups — single troops, footmen with bowmen at
// every share, riders, a kingdom's pool, a band's roster, a hero with villagers — fights each one
// in the real engine (tools/duel.js: Battle.update stepped, no formula of its own), and writes
// the win rates to docs/measurements/odds-data.json. tools/test.js reads that file: the model
// has to agree with it on every push, without fighting a single battle.
//
//   node tools/oddsfit.js --gen [--n 360 --fights 24 --workers 6]   # fight, write the data
//   node tools/oddsfit.js --fit                                     # fit the constants to it
//   node tools/oddsfit.js --check                                   # score Battle's constants
// ============================================================
'use strict';
const path = require('path');
const fs = require('fs');
const H = require('./harness');
const { fight, troopRow } = require('./duel');

const DATA = path.join(__dirname, '..', 'docs', 'measurements', 'odds-data.json');
const args = H.args();

// --- Matchups ------------------------------------------------------------------------------
// A side is a list of troop names, one per man. Heroes are troops of their own (the engine has
// no hand on the player's sword, so a hero fights as one more man of his stats).
const HEROES = { 'Kahraman I': [50, 20, 0], 'Kahraman II': [90, 32, 10], 'Kahraman III': [130, 42, 20], 'Kahraman IV': [180, 55, 30] };
function addHeroes(g) {
    for(const [nm, [hp, attack, defense]] of Object.entries(HEROES))
        g.TROOP_TYPES[nm] = { hp, speed: 70, attack, defense, type: 'infantry', dmgType: 'cut' };
}

function pools(g) {
    const names = Object.keys(g.TROOP_TYPES).filter(n => !HEROES[n]);
    for(const k of Object.keys(g.BAND_KINDS)) for(const r of g.BAND_KINDS[k].battle) names.push(r[0]);
    const uniq = [...new Set(names)].filter(n => troopRow(g, n));
    const by = t => uniq.filter(n => troopRow(g, n).type === t);
    return { inf: by('infantry'), arch: by('archer'), cav: by('cavalry') };
}

// One side's makeup as [name, share] — the count is chosen afterwards
function makeup(g, P, rnd) {
    const pick = a => a[Math.floor(rnd() * a.length)];
    const kind = Math.floor(rnd() * 8);
    if(kind === 0) return [[pick(P.inf), 1]];
    if(kind === 1) return [[pick(P.arch), 1]];
    if(kind === 2) return [[pick(P.cav), 1]];
    if(kind === 3) { const s = 0.15 + rnd() * 0.7; return [[pick(P.inf), 1 - s], [pick(P.arch), s]]; }    // a line with bowmen
    if(kind === 4) { const s = 0.2 + rnd() * 0.5; return [[pick(P.inf), 1 - s], [pick(P.cav), s]]; }
    if(kind === 5) { const fac = pick(Object.keys(g.TROOP_TREES)); return g.Game.factionTroopPool(fac).map(n => [n, 1]); }
    if(kind === 6) { const b = g.BAND_KINDS[pick(Object.keys(g.BAND_KINDS))]; return b.battle.map(r => [r[0], r[6]]); }
    return [[pick(Object.keys(HEROES)), 'hero'], ['Svadya Köylüsü', 1]];                                   // a hero and villagers
}

// n men from a makeup: shares rounded so the side holds exactly n, a hero is always one man
function deal(mk, n) {
    const hero = mk.find(m => m[1] === 'hero');
    const rest = mk.filter(m => m[1] !== 'hero'), tot = rest.reduce((a, m) => a + m[1], 0);
    const out = hero ? [hero[0]] : [];
    const left = n - out.length;
    let given = 0;
    rest.forEach((m, i) => {
        const k = i === rest.length - 1 ? left - given : Math.round(left * m[1] / tot);
        for(let j = 0; j < k; j++) out.push(m[0]);
        given += k;
    });
    return out.slice(0, n);
}

// The rows sideStrength reads, from a dealt side (the same shape Battle.enemyMix builds)
function rows(g, side, team) {
    const count = {};
    side.forEach(n => count[n] = (count[n] || 0) + 1);
    return Object.entries(count).map(([name, m]) => { const t = troopRow(g, name);
        return { name, n: m, hp: t.hp, attack: t.attack, defense: t.defense, dmgType: t.dmgType || 'cut', type: t.type,
                 brace: t.brace, beast: t.beast, speed: t.speed, mounted: t.type === 'cavalry' || t.speed > g.Battle.FOOT_MAX, isPlayerTeam: team }; });
}

function matchups(g, n, seed) {
    const rnd = H.mulberry32(seed), P = pools(g), out = [];
    const B = g.Battle, ratio = (a, b) => B.sideStrength(rows(g, a, true), rows(g, b, false)) / B.sideStrength(rows(g, b, false), rows(g, a, true));
    while(out.length < n) {
        const ma = makeup(g, P, rnd), mb = makeup(g, P, rnd);
        const na = 3 + Math.floor(rnd() * 16);
        const a = deal(ma, na);
        // the other side's size: whichever puts the current model nearest a target drawn from
        // 0.55–1.8 (log-even) — fights decided before they start teach the fit nothing
        const target = Math.exp(Math.log(0.55) + rnd() * Math.log(1.8 / 0.55));
        let best = null;
        for(let nb = 2; nb <= 30; nb++) {
            const b = deal(mb, nb), r = ratio(a, b), d = Math.abs(Math.log(r / target));
            if(!best || d < best.d) best = { b, d };
        }
        if(best.b.length >= 2) out.push({ a, b: best.b });
    }
    return out;
}

// --- Fighting ------------------------------------------------------------------------------
function fightAll(list, fights, seed) {
    const g = H.world({ seed });
    addHeroes(g);
    return list.map(m => {
        let won = 0, ok = 0;
        for(let i = 0; i < fights; i++) {
            const r = fight(g, m.a, m.b, m.a.length, m.b.length);
            if(r.won === null) continue;
            ok++; if(r.won) won++;
        }
        return Object.assign({}, m, { won, fights: ok });
    });
}

function gen() {
    const n = +args.n || 360, fights = +args.fights || 24, workers = +args.workers || Math.max(1, require('os').cpus().length - 2);
    const g = H.world({ seed: 1 });
    addHeroes(g);
    const list = matchups(g, n, +args.seed || 2026);
    const { fork } = require('child_process');
    const chunks = Array.from({ length: workers }, (_, w) => list.filter((_, i) => i % workers === w));
    console.log(`${list.length} matchups × ${fights} fights on ${workers} workers…`);
    const t0 = Date.now();
    return Promise.all(chunks.map((chunk, w) => new Promise((ok, fail) => {
        const child = fork(__filename, ['--worker']);
        child.on('message', ok);
        child.on('error', fail);
        child.send({ chunk, fights, seed: 100 + w });
    }))).then(parts => {
        const data = [].concat(...parts);
        fs.writeFileSync(DATA, JSON.stringify({
            note: 'Real-engine win rates (tools/oddsfit.js --gen). Side a is the player side; won/fights is a\'s record.',
            made: new Date().toISOString().slice(0, 10), fights, heroes: HEROES,
            matchups: data.map(m => ({ a: compact(m.a), b: compact(m.b), won: m.won, fights: m.fights }))
        }, null, 0).replace(/\},\{/g, '},\n{') + '\n');
        console.log(`wrote ${data.length} matchups to ${path.relative(process.cwd(), DATA)} in ${Math.round((Date.now() - t0) / 1000)} s`);
    });
}
// [['Svadya Milisi', 4], ['Svadya Avcısı', 2]] — the side as name/count pairs, dealt order kept
function compact(side) {
    const out = [];
    side.forEach(n => { const last = out[out.length - 1]; if(last && last[0] === n) last[1]++; else out.push([n, 1]); });
    return out;
}
function expand(c) { return [].concat(...c.map(([n, k]) => Array(k).fill(n))); }

// --- Scoring and fitting -------------------------------------------------------------------
function load() { return JSON.parse(fs.readFileSync(DATA, 'utf8')); }

// How well a model's ratios explain the record: a logistic win curve p = 1/(1+r^-β) through
// the ratio (β fitted too), scored as binomial log-loss per fight; plus the bucket promises.
function score(g, data, opts = {}) {
    const B = g.Battle;
    const cases = data.matchups.map(m => {
        const A = rows(g, expand(m.a), true), E = rows(g, expand(m.b), false);
        return { m, r: B.sideStrength(A, E) / B.sideStrength(E, A), w: m.won / Math.max(1, m.fights) };
    });
    let bestBeta = 1, bestLoss = Infinity;
    for(let beta = 1; beta <= 30; beta += 0.25) {
        let loss = 0, n = 0;
        for(const c of cases) {
            const p = Math.min(1 - 1e-6, Math.max(1e-6, 1 / (1 + Math.pow(c.r, -beta))));
            loss -= c.m.won * Math.log(p) + (c.m.fights - c.m.won) * Math.log(1 - p); n += c.m.fights;
        }
        if(loss / n < bestLoss) { bestLoss = loss / n; bestBeta = beta; }
    }
    const label = r => g.Game.ODDS.find(o => r >= o[0])[1];
    const broken = cases.filter(c => (label(c.r) === 'Kolay' && c.w < 0.85) || (label(c.r) === 'Çetin' && c.w > 0.15));
    return { loss: bestLoss, beta: bestBeta, cases, broken, label };
}

function report(g, data, title) {
    const s = score(g, data);
    console.log(`\n${title}: log-loss ${s.loss.toFixed(4)} per fight, curve β ${s.beta}, broken promises ${s.broken.length}/${s.cases.length}`);
    // calibration: win rate by label
    for(const o of g.Game.ODDS) {
        const c = s.cases.filter(x => s.label(x.r) === o[1]);
        if(!c.length) continue;
        const w = c.reduce((a, x) => a + x.w, 0) / c.length;
        console.log(`  ${o[1].padEnd(8)} ${String(c.length).padStart(4)} matchups, won ${Math.round(w * 100)} % on average, range ${Math.round(Math.min(...c.map(x => x.w)) * 100)}–${Math.round(Math.max(...c.map(x => x.w)) * 100)} %`);
    }
    // the worst misses, archers marked
    const miss = s.broken.slice().sort((x, y) => Math.abs(y.w - 0.5) - Math.abs(x.w - 0.5)).slice(0, 8);
    for(const c of miss) console.log(`  miss: ${desc(c.m.a)} vs ${desc(c.m.b)} — ratio ${c.r.toFixed(2)} (${s.label(c.r)}), won ${Math.round(c.w * 100)} %`);
    return s;
}
const desc = c => c.map(([n, k]) => `${k} ${n}`).join(' + ');

// The parameters the fit may move, read and written on Battle itself (so the fitted model IS the
// game's model: no copy of the formula lives here)
const PARAMS = ['ODDS_P', 'HP_POW', 'HIT_POW', 'ARCHER_IN_MELEE', 'ARCHER_SHARE_POW', 'ARCHER_SCREEN', 'ARCHER_VS_SPEED', 'ARCHER_DUEL', 'CHARGE'];
const LIMITS = { ODDS_P: [1, 2.5], HP_POW: [0.2, 1.5], HIT_POW: [0.2, 1.5], ARCHER_IN_MELEE: [0.05, 3], ARCHER_SHARE_POW: [0, 3],
                 ARCHER_SCREEN: [0, 1], ARCHER_VS_SPEED: [-2, 3], ARCHER_DUEL: [0.1, 3], CHARGE: [0.3, 2] };
// Nelder–Mead over the live parameters, each held to its limits; the loss is score()'s log-loss
function fit(g, data, only) {
    const B = g.Battle, live = (only || PARAMS).filter(k => typeof B[k] === 'number');
    const clampK = (k, v) => Math.min(LIMITS[k][1], Math.max(LIMITS[k][0], v));
    const f = x => { live.forEach((k, i) => { B[k] = clampK(k, x[i]); }); return score(g, data).loss; };
    const n = live.length, x0 = live.map(k => B[k]);
    let simplex = [x0].concat(live.map((k, i) => { const x = x0.slice(); x[i] += Math.max(0.1, Math.abs(x[i]) * 0.3) * (x[i] + 0.3 > LIMITS[k][1] ? -1 : 1); return x; }));
    let vals = simplex.map(f);
    for(let it = 0; it < 120 * n; it++) {
        const order = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]);
        simplex = order.map(i => simplex[i]); vals = order.map(i => vals[i]);
        if(vals[n] - vals[0] < 1e-6) break;
        const c = live.map((_, j) => simplex.slice(0, n).reduce((a, x) => a + x[j], 0) / n);
        const at = t => c.map((cj, j) => cj + t * (simplex[n][j] - cj));
        const xr = at(-1), fr = f(xr);
        if(fr < vals[0]) { const xe = at(-2), fe = f(xe); [simplex[n], vals[n]] = fe < fr ? [xe, fe] : [xr, fr]; }
        else if(fr < vals[n - 1]) { simplex[n] = xr; vals[n] = fr; }
        else {
            const xc = at(fr < vals[n] ? -0.5 : 0.5), fc = f(xc);
            if(fc < Math.min(fr, vals[n])) { simplex[n] = xc; vals[n] = fc; }
            else for(let i = 1; i <= n; i++) { simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j])); vals[i] = f(simplex[i]); }
        }
    }
    const best = simplex[vals.indexOf(Math.min(...vals))];
    live.forEach((k, i) => { B[k] = clampK(k, best[i]); });
    console.log('\nfitted: ' + live.map(k => `${k}: ${+B[k].toFixed(3)}`).join(', '));
    return Object.fromEntries(live.map(k => [k, B[k]]));
}

// Buckets read off the fitted curve: the ratio where the record's win rate crosses 85 / 50 / 30 %
function buckets(g, data) {
    const s = score(g, data), at = p => Math.pow(p / (1 - p), 1 / s.beta);
    console.log(`buckets off the curve (β ${s.beta}): Kolay ≥ ${at(0.92).toFixed(2)}, Dengeli ≥ ${at(0.5).toFixed(2)}, Zorlu ≥ ${at(0.2).toFixed(2)}`);
}

if(args.worker) {
    process.on('message', ({ chunk, fights, seed }) => { process.send(fightAll(chunk, fights, seed)); process.exit(0); });
} else if(require.main === module) {
    if(args.gen) gen().catch(e => { console.error(e); process.exit(1); });
    else {
        const g = H.world({ seed: 1 }); addHeroes(g);
        const data = load();
        if(args.fit) { report(g, data, 'before'); fit(g, data); report(g, data, 'after'); buckets(g, data); }
        else report(g, data, 'Battle as it stands');
    }
}

module.exports = { DATA, HEROES, addHeroes, rows, expand, score, load, fit };
