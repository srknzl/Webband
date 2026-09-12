#!/usr/bin/env node
// ============================================================
// test.js — pure logic tests + world/economy thresholds (#63)
// ------------------------------------------------------------
// The repo had no tests at all: a silent balance regression went unnoticed
// (in #47 the decision to make food "ten times cheaper" sat unapplied for
// months). Two separate jobs live here, both driving the game's **own** code:
//
//   1. Pure logic — input/output tables for specific functions (damage, wage,
//      tax, morale, capacity, prisoner value, food, frame gate, save
//      migration). These numbers ARE the "Measured" lines in CLAUDE.md; if one
//      changes, either the code or the doc is wrong.
//   2. Thresholds — a 200-day playerless world and 60-day economy scripts. No
//      exact number is expected (the world is random), a **range** is: zero
//      conquests is as broken as 20.
//
//   node tools/test.js            # everything
//   node tools/test.js --fast     # pure logic only (thresholds take ~5 s)
// ============================================================
'use strict';
const assert = require('assert');
const H = require('./harness');

const results = [];
function test(name, fn) {
    try { fn(); results.push({ name, ok: true }); }
    catch(e) { results.push({ name, ok: false, msg: e.message.split('\n')[0] }); }
}
// Range assertion: the world is random, so no single number is expected.
function between(actual, lo, hi, what) {
    assert.ok(actual >= lo && actual <= hi, `${what}: ${actual} ∉ [${lo}, ${hi}]`);
}

// ---------- 1. Pure logic ----------
// Loading once is enough: all of these functions read `state` and none of
// them need a world (settlement layout, NPCs). Tests set up their own state.
const g = H.load({ seed: 1 });
const { Game, Battle, Save, state } = g;

// Resets the player to a known starting point — tests shouldn't see each other's state
function reset() {
    const p = state.player;
    p.party = []; p.prisoners = []; p.inventory = []; p.money = 250; p.renown = 0;
    p.wageDebt = 0; p.morale = 60;
    p.stats = { level: 1, str: 10, agi: 10, int: 10, cha: 10, vit: 10, eff: {} };
    p.proficiencies = { leadership: { level: 1, xp: 0 } };
    state.locations = undefined;
    return p;
}
const troop = (level, extra) => Object.assign({ id: 't' + level, name: 'Asker', level, type: 'infantry' }, extra);

test('afterArmor: type multiplier on an unarmored target (30 raw)', () => {
    assert.strictEqual(Battle.afterArmor('cut', 30, 0), 30);
    assert.strictEqual(Battle.afterArmor('pierce', 30, 0), 27);
    assert.strictEqual(Battle.afterArmor('blunt', 30, 0), 24);
});
test('afterArmor: as armor rises, pierce takes the lead (def 25)', () => {
    assert.strictEqual(Battle.afterArmor('cut', 30, 12), 18);
    assert.strictEqual(Battle.afterArmor('pierce', 30, 12), 21);
    assert.strictEqual(Battle.afterArmor('blunt', 30, 12), 16);
    assert.strictEqual(Battle.afterArmor('cut', 30, 25), 5);
    assert.strictEqual(Battle.afterArmor('pierce', 30, 25), 15);
    assert.strictEqual(Battle.afterArmor('blunt', 30, 25), 8);
});
test('afterArmor: floor of 1, unknown type counts as cut', () => {
    assert.strictEqual(Battle.afterArmor('cut', 5, 100), 1);
    assert.strictEqual(Battle.afterArmor('sihir', 30, 12), Battle.afterArmor('cut', 30, 12));
});

test('troopWage: tiers', () => {
    assert.strictEqual(Game.troopWage(troop(5)), 0);        // recruits are free
    assert.strictEqual(Game.troopWage(troop(10)), 2);
    assert.strictEqual(Game.troopWage(troop(19)), 2);
    assert.strictEqual(Game.troopWage(troop(20)), 10);      // lvl/2
    assert.strictEqual(Game.troopWage(troop(30)), 15);
    assert.strictEqual(Game.troopWage(troop(51)), 0);       // Legendary
    assert.strictEqual(Game.troopWage(troop(1, { isCompanion: true })), 20);
});

test('fiefTax: city ×2, castle ×0.7, village ×1', () => {
    assert.strictEqual(Game.fiefTax({ type: 'city', prosperity: 55 }), 110);
    assert.strictEqual(Game.fiefTax({ type: 'castle', prosperity: 64 }), 45);
    assert.strictEqual(Game.fiefTax({ type: 'village', prosperity: 40 }), 40);
    assert.strictEqual(Game.fiefTax({ type: 'city' }), 100);   // old save with no prosperity field
});

test('getPartyCapacity: a fresh character has 12', () => {
    const p = reset();
    assert.strictEqual(Game.getPartyCapacity(), 12);
    p.stats.eff.cha = 13;                      // +3 capacity
    assert.strictEqual(Game.getPartyCapacity(), 21);
    p.proficiencies.leadership.level = 3;      // +8
    assert.strictEqual(Game.getPartyCapacity(), 29);
    p.renown = 120;                            // +3
    assert.strictEqual(Game.getPartyCapacity(), 32);
});
test('getPartyCapacity: fractional attribute source is floored (#43)', () => {
    const p = reset();
    p.stats.eff.cha = 11.9286;
    assert.strictEqual(Game.getPartyCapacity() % 1, 0);
    assert.strictEqual(Game.getPartyCapacity(), 17);   // floor(1.9286*3) = 5
});

test('prisonerValue: type multiplier, noble ransom', () => {
    assert.strictEqual(Game.prisonerValue({ level: 10, type: 'infantry' }), 145);
    assert.strictEqual(Game.prisonerValue({ level: 10, type: 'archer' }), 174);
    assert.strictEqual(Game.prisonerValue({ level: 10, type: 'cavalry' }), 217);
    assert.strictEqual(Game.prisonerValue({ noble: true, ransom: 3200 }), 3200);
});

test('moraleTarget: terms add up, clamped to 0-100', () => {
    const p = reset();
    assert.strictEqual(Game.moraleTarget(true, false), 50);            // base only
    p.inventory = [{ id: 'wheat', qty: 5 }, { id: 'meat', qty: 5 }];
    assert.strictEqual(Game.moraleTarget(true, false), 60);            // 2 kinds × 5
    assert.strictEqual(Game.moraleTarget(true, true), 30);             // starvation −30
    p.proficiencies.leadership.level = 5;
    assert.strictEqual(Game.moraleTarget(true, false), 72);            // Leadership (5−1)×3
    p.party = Array.from({ length: 40 }, (_, i) => troop(1, { id: 'x' + i }));
    assert.strictEqual(Game.getPartyCapacity(), 28);
    assert.strictEqual(Game.moraleTarget(true, false), 48);            // over capacity 12×2
});
test('moraleTarget: target drops as wage debt grows, floor 40', () => {
    const p = reset();
    p.party = [troop(20)];                     // wage 10₺/day
    p.wageDebt = 10;
    assert.strictEqual(Game.moraleTarget(false, false), 30);   // 50 − (10 + 1×10)
    p.wageDebt = 10000;
    assert.strictEqual(Game.moraleTarget(false, false), 10);   // penalty stops at 40
});

test('foodStock: day count accounts for spoilage too', () => {
    const p = reset();
    p.party = Array.from({ length: 10 }, (_, i) => troop(10, { id: 'f' + i }));  // 10 × half a unit/day
    p.inventory = [{ id: 'wheat', qty: 60 }];
    const fs = Game.foodStock();
    assert.strictEqual(fs.low, 60);
    assert.strictEqual(fs.need, 6);                   // 10 troops × FOOD_MAN 0.5 + the player themself 1
    assert.strictEqual(fs.kinds, 1);
    assert.strictEqual(fs.spoil, 1);                  // 60 wheat / 60-day shelf life
    assert.strictEqual(fs.days, 8);                   // 60 / (6 + 1)
});
test('foodStock: elite troops want meat, variety is counted', () => {
    const p = reset();
    p.party = [troop(30), troop(30)];
    p.inventory = [{ id: 'wheat', qty: 10 }, { id: 'meat', qty: 10 }];
    const fs = Game.foodStock();
    assert.strictEqual(fs.need, 3);                   // 2 × 0.75 + player 1, rounded up
    assert.strictEqual(fs.needHigh, 1);               // half a meat per lvl 30+ troop
    assert.strictEqual(fs.high, 10);
    assert.strictEqual(fs.kinds, 2);
});
test('foodStock: empty inventory is 0 days, never infinite', () => {
    const p = reset();
    p.party = [troop(10)];
    assert.strictEqual(Game.foodStock().days, 0);
});

// Frame gate: refresh rate → passed fps. Rule is "the largest whole divisor
// that doesn't drop below 60 fps". framegate.js writes this out as a table;
// here it's a threshold.
function gateFps(hz, seconds = 2, opts) {
    const { Game } = H.load({ seed: 1 });
    if(opts) Object.assign(Game.OPTS, opts);
    const step = 1000 / hz;
    let passed = 0;
    for(let i = 0; i < hz * seconds; i++) if(!Game.skipFrame(i * step)) passed++;
    return +(passed / seconds).toFixed(1);
}
test('skipFrame: largest divisor that doesn\'t drop below 60 fps', () => {
    assert.strictEqual(gateFps(60), 60);
    assert.strictEqual(gateFps(75), 75);
    assert.strictEqual(gateFps(90), 90);
    assert.strictEqual(gateFps(120), 60);
    assert.strictEqual(gateFps(144), 72);
    assert.strictEqual(gateFps(180), 60);
    assert.strictEqual(gateFps(240), 60);
});
test('skipFrame: two loops in the same frame get the same answer (#42)', () => {
    // A mismatched answer leaves one of the loops permanently starved: its screen goes black.
    for(const hz of [60, 120, 144, 165, 240]) {
        const { Game } = H.load({ seed: 1 });
        const step = 1000 / hz;
        let mismatch = 0;
        for(let i = 0; i < hz * 2; i++) {
            const t = i * step;
            if(Game.skipFrame(t) !== Game.skipFrame(t)) mismatch++;   // map + battle loop
        }
        assert.strictEqual(mismatch, 0, `${mismatch} mismatched answers at ${hz} Hz`);
    }
});
test('skipFrame: lite mode targets 30 fps (#80)', () => {
    assert.strictEqual(gateFps(60, 2, { lite: true }), 30);
    assert.strictEqual(gateFps(120, 2, { lite: true }), 30);
});
test('skipFrame: one bad sample doesn\'t lock the gate', () => {
    // This test comes from an actual phone report: iOS delivers two rAFs ~2 ms
    // apart while scrolling the page. Since the predictor is "the smallest of
    // all time", the value gets PERMANENTLY stuck at 2 ms, the divisor becomes
    // 1000/30/2 = 16, and the game ran at 3.79 fps on a 60 Hz screen — unplayable.
    const { Game } = H.load({ seed: 1 });
    Object.assign(Game.OPTS, { lite: true });            // lite mode: 30 fps target
    let t = 0;
    for(let i = 0; i < 120; i++) { t += (i === 100 || i === 101) ? 2 : 1000 / 60; Game.skipFrame(t); }
    let t0 = t, drawn = 0;
    for(let i = 0; i < 600; i++) { t += 1000 / 60; if(!Game.skipFrame(t)) drawn++; }
    const fps = drawn / ((t - t0) / 1000);
    assert.ok(fps > 25, `${fps.toFixed(2)} fps after the bad sample — gate got stuck`);
});
test('skipFrame: no frame is dropped when the gate is turned off in settings', () => {
    assert.strictEqual(gateFps(240, 2, { frameGate: false }), 240);
});

test('Save.migrate: v1 → v2 migration', () => {
    const d = {
        savedAt: 1700000000000,
        state: {
            explored: [[1, 2, 3]],
            muted: true,
            player: { party: [{ name: 'Efsanevi Svadya Şövalyesi', level: 51 }, { name: 'Svadya Milisi', level: 10 }] }
        }
    };
    Save.migrate(d);
    assert.strictEqual(d.v, 2);
    assert.strictEqual(d.state.explored, undefined);          // fog of war removed
    assert.strictEqual(d.state.player.party[0].name, 'Svadya Şövalyesi');
    assert.strictEqual(d.state.player.party[0].legendary, true);
    assert.strictEqual(d.state.player.party[1].legendary, undefined);
    assert.strictEqual(d.state.settings.muted, true);         // moved into settings
    assert.strictEqual(d.state.meta.v, 2);
    assert.strictEqual(d.state.meta.createdAt, 1700000000000);
    assert.strictEqual(d.state.meta.gocEdildi, true);
});
test('Save.migrate: leaves a current save untouched', () => {
    const d = { v: 2, state: { player: { party: [] }, meta: { v: 2, createdAt: 1, playtime: 99 } } };
    Save.migrate(d);
    assert.strictEqual(d.state.meta.playtime, 99);
});

// --- Map speed (#72) ---
// The mounted/foot gap must not exceed 1.5×. Critical point: since the party
// bonus sits in the denominator, if being mounted were *additive* the ratio
// would drift as the party grows (old code: 2.1× → 2.6×). So this is measured
// across every region of the penalty curve, not just one party size.
test('speed: mounted/foot gap is capped at 1.5× at every party size', () => {
    const speed = (mounted, size) => {
        // Class is read from TROOP_TYPES[t.name] (troopStats), not from t.type
        state.player.party = Array.from({ length: size - 1 }, (_, i) =>
            ({ id: 'h' + i, name: mounted ? 'Svadya Süvarisi' : 'Svadya Milisi', level: 1 }));
        state.player.equipment.horse = mounted ? { id: 'horse', name: 'At' } : null;
        return Game.getPlayerSpeed().value;
    };
    [1, 5, 10, 20, 40, 65].forEach(size => {
        const ratio = speed(true, size) / speed(false, size);
        assert.ok(Math.abs(ratio - 1.5) < 0.001, `mounted/foot gap is ${ratio.toFixed(2)}× at party size ${size}`);
    });
    state.player.party = [];
    state.player.equipment.horse = null;
});

// --- Modal dismiss gate (#70) ---
// Esc, clicking outside, and × all ask through the same gate (canDismiss);
// closeModal doesn't ask. This distinction matters: the encounter window's
// own buttons ("Leave it be", "Surrender") close the window while
// currentEncounterNpcId is still set — if closeModal also asked, that window
// would stay open behind the battle.
test('modal: an encounter window can\'t be dismissed by the user, only by its own button', () => {
    const doc = g._sandbox.document;
    const overlay = () => doc.getElementById('modal-overlay').classList.contains('hidden');

    state.player.currentEncounterNpcId = null;
    Game.showModal('<p>plain</p>');
    Game.dismissModal();
    assert.ok(overlay(), 'a plain window didn\'t close on ×');

    state.player.currentEncounterNpcId = 'npc_test';
    Game.showModal('<p>encounter</p>');
    Game.dismissModal();
    assert.ok(!overlay(), 'an encounter window closed by the user\'s hand');
    Game.closeModal();
    assert.ok(overlay(), 'the encounter\'s own button couldn\'t close the window');
    state.player.currentEncounterNpcId = null;
});

// --- Battle speed balance ---
// The four links of the speed chain used to behave differently for the
// player and the AI; the biggest risk while fixing that was bringing back the
// old "archer flees forever" bug. These tests hold both ends at once: fleeing
// must be possible, but nobody may flee forever.

test('speed: foot\'s ceiling is below the slowest horse (a human can\'t outrun a horse)', () => {
    reset();
    const p = state.player;
    p.stats.agi = 99; p.proficiencies.athletics = { level: 99, xp: 0 };
    const slowestHorse = Math.min(...Object.values(g.TROOP_TYPES)
        .filter(t => t.type === 'cavalry').map(t => t.speed));
    assert.ok(Battle.footSpeed() <= Battle.FOOT_MAX, `foot ceiling ${Battle.footSpeed()}`);
    assert.ok(Battle.FOOT_MAX < slowestHorse, `foot ceiling ${Battle.FOOT_MAX} ≥ slowest horse ${slowestHorse}`);
    reset();
});

test('speed: every troop above FOOT_MAX is genuinely mounted (basis of the forest rule)', () => {
    Object.entries(g.TROOP_TYPES).forEach(([name, t]) => {
        if(t.speed > Battle.FOOT_MAX)
            assert.ok(t.type === 'cavalry' || /Atlı|Muhafızı/.test(name), `${name} is ${t.speed} fast but looks like foot`);
        if(t.type === 'cavalry')
            assert.ok(t.speed > Battle.FOOT_MAX, `${name} is cavalry but only ${t.speed} ≤ ${Battle.FOOT_MAX}`);
    });
});

// Battle.start sets up the real arena (canvas, settlement) — these need `world`.
const gw = H.world({ seed: 1 });

test('speed: morale doesn\'t scale troop speed (the enemy has no morale)', () => {
    const speedAt = morale => {
        gw.state.player.morale = morale;
        gw.state.player.party = [{ id: 'm1', name: 'Svadya Milisi', level: 1 }];
        gw.Battle.start('Çapulcu', 1);
        const u = gw.Battle.units.find(x => x.id === 'm1');
        gw.Battle.active = false;
        return u.speed;
    };
    assert.strictEqual(speedAt(0), speedAt(100), 'morale is changing speed');
    gw.state.player.party = [];
});

test('speed: terrain penalties don\'t multiply, the worst one applies', () => {
    const u = { x: 100, y: 100, type: 'cavalry', mounted: true };
    Battle.terrain = {
        forests: [{ x: 100, y: 100, r: 50 }],
        pits:    [{ x: 100, y: 100, r: 50 }],
        rivers:  [{ x: 50, y: 50, w: 200, h: 200 }],
        hills: []
    };
    const m = Battle.getTerrainEffects(u).speedMod;
    assert.ok(Math.abs(m - 0.6) < 1e-9, `${m} on stacked terrain (expected 0.6)`);
    Battle.terrain = null;
});

test('charge: stamina runs out — nobody stays fast forever', () => {
    const dt = 1/60, u = { charge: 1.3 };
    let burst = 0, tired = 0;
    for(let i = 0; i < 60 * 10; i++) {                    // 10 s of nonstop running
        const m = Battle.chargeSpeed(u, true, dt);
        if(m > 1) burst++; else if(m < 1) tired++;
    }
    assert.ok(burst > 0 && tired > 0, `${burst} burst frames, ${tired} tired frames`);
    // Rest must outlast the run: the disengage window comes from this
    assert.ok(tired > burst, `rest (${tired}) shorter than running (${burst}) — no escape window`);
    // A rested unit regains its wind
    for(let i = 0; i < 60 * 10; i++) Battle.chargeSpeed(u, false, dt);
    assert.ok(Battle.chargeSpeed(u, true, dt) > 1, 'charge didn\'t refill after resting');
});

// The bug this test catches actually happened: charge depended on distance to
// the enemy, while the player's own speed checked the threshold. A player
// oscillating right at the border burned a quarter of their wind and stayed
// fast continuously, outrunning even a horse faster than them.
test('charge: tapping intermittently can\'t beat a sustained charge', () => {
    const dt = 1/60, N = 60 * 30;
    const average = duty => {                      // duty: charge for 1 frame every `duty` frames
        const u = { charge: 1.3 };
        let sum = 0;
        for(let i = 0; i < N; i++) sum += Battle.chargeSpeed(u, i % duty === 0, dt);
        return sum / N;
    };
    const sustained = average(1);
    [2, 3, 4, 6].forEach(d => {
        assert.ok(average(d) <= sustained + 1e-9,
            `tapping 1/${d} averages ${average(d).toFixed(4)} > sustained ${sustained.toFixed(4)} — exploit at the border`);
    });
});

// --- Rout phase ---
// Removing a fleeing unit from `units` carries three counts at once (loot,
// prisoners, losses); so what's tested isn't "did it flee" but "is a fleeing
// unit excluded from the tally".
test('rout: the broken side abandons the fight and flees', () => {
    const B = gw.Battle;
    gw.state.player.party = Array.from({ length: 6 }, (_, i) =>
        ({ id: 'b' + i, name: 'Svadya Milisi', level: 3, xp: 0, xpNext: 10 }));
    B.start('Çapulcu', 12);
    const enemy = () => B.units.filter(u => !u.isPlayerTeam && u.hp > 0);
    // Threshold is 12×0.25 = 3; leave two standing and drop the rest
    enemy().slice(2).forEach(u => { u.hp = 0; });
    B.routCheck();
    assert.ok(B.routed.e, 'enemy strength fell below a quarter but didn\'t rout');
    assert.ok(!B.routed.p, 'the healthy side also routed');
    const fleeing = enemy()[0];
    const dist = () => Math.abs(fleeing.x - B.units[0].x);
    const before = dist();
    for(let i = 0; i < 30; i++) B.update(1 / 60);
    assert.ok(dist() > before, 'fleeing unit isn\'t moving away from the player');
    assert.strictEqual(fleeing.tgtId, null, 'fleeing unit is still looking for a target');
    // Given enough time it leaves the field and the battle ends — no stuck lock
    for(let i = 0; i < 60 * 15 && B.active; i++) B.update(1 / 60);
    assert.ok(!B.active, 'fleeing units never left the field, battle got stuck');
    gw.state.player.party = [];
});

// --- Cheese gates: fleeing possible, but not infinite fleeing ---
// duel.js steps the real engine forward; if kiting is infinite the fight runs
// to MAX_S and returns `won: null`. A stalemate = a kiting bug.
const { fight } = require('./duel');

test('kite: a mounted archer can\'t flee a melee fighter forever', () => {
    const r = fight(gw, 'Kergit Atlı Okçusu', 'Nord Baltacısı', 3);
    assert.notStrictEqual(r.won, null, `fight didn't end in ${r.duration.toFixed(0)} s — mounted archer is kiting`);
});

test('kite: a foot archer is still caught even with 0.8 flee', () => {
    const r = fight(gw, 'Rodok Tatar Yaylısı', 'Nord Savaşçısı', 3);
    assert.notStrictEqual(r.won, null, `fight didn't end in ${r.duration.toFixed(0)} s — foot archer is kiting`);
});

// Wolves aren't in `TROOP_TYPES` (they spawn from bands), so the hardest case
// here is foot chasing cavalry: foot can no longer catch the knight, but the
// knight also can't hit-and-run forever — the battle has to end somewhere.
test('kite: even if foot can\'t catch cavalry, the battle resolves', () => {
    const r = fight(gw, 'Nord Savaşçısı', 'Svadya Şövalyesi', 4);
    assert.notStrictEqual(r.won, null, `fight didn't end in ${r.duration.toFixed(0)} s`);
});

// --- Sprite sheets (#92) ---
// kingdom_crests.jpg holds FOUR banners in a 2x2 grid; it was being cut with 3x3 maths,
// so most crests rendered a slice of castle wall or two half banners. Any crest index
// outside 0-3 is that bug coming back — there is no fifth banner to point at.
test('art: every crest index fits the 2x2 kingdom_crests.jpg sheet', () => {
    const bad = i => !Number.isInteger(i) || i < 0 || i > 3;
    const offB = g.BANNERS.map((b, i) => [i, b.crest]).filter(([, c]) => bad(c));
    assert.strictEqual(offB.length, 0, `BANNERS crest out of 0-3: ${JSON.stringify(offB)}`);

    const kingdoms = Object.values(g.FACTIONS).filter(f => f.id !== 'player' && f.id !== 'player_kingdom');
    const offF = kingdoms.map(f => [f.id, f.crest]).filter(([, c]) => bad(c));
    assert.strictEqual(offF.length, 0, `FACTIONS crest out of 0-3: ${JSON.stringify(offF)}`);

    // and the cropper itself lands on a whole quadrant, never a third
    const css = g.Game.crestCss(3, 64);
    assert.ok(/background-size:200% 200%/.test(css), `crestCss is not slicing 2x2: ${css}`);
    assert.ok(/background-position:100% 100%/.test(css), `crest 3 is not the bottom-right quadrant: ${css}`);
});

// --- Version stamp (#88 item 8) ---
// CI opens the release and reads its notes from that version's CHANGELOG
// section. If the section is missing, the build breaks there; breaking here is cheaper.
test('version: VERSION.no finds a section in CHANGELOG.md', () => {
    const md = require('fs').readFileSync(require('path').join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
    const v = g.VERSION.no;
    assert.ok(new RegExp(`^## ${v.replace('.', '\\.')}[ (]`, 'm').test(md),
        `no "## ${v}" section in CHANGELOG.md — version bumped but no line was added`);
});

// --- Service worker (#91) ---
// The web build is installable and caches itself, which means a stale cache is now a
// way to ship nothing at all: the worker serves cache-first, so it only picks up new
// code when the cache NAME changes. That name carries VERSION.no by hand, and hands
// forget. Two things are checked: the name tracks the version, and every file the
// worker promises to precache exists — `cache.addAll` rejects wholesale on one 404,
// which would leave the install with no cache and no offline mode at all.
test('pwa: sw.js cache name tracks VERSION.no and precaches only real files', () => {
    const fs = require('fs'), path = require('path');
    const root = path.join(__dirname, '..');
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

    const name = /const CACHE = '([^']+)'/.exec(sw);
    assert.ok(name, 'sw.js has no `const CACHE = ...` line');
    assert.strictEqual(name[1], `webband-v${g.VERSION.no}`,
        `sw.js cache is ${name[1]} but VERSION.no is ${g.VERSION.no} — bump it in the same pass`);

    const list = /const FILES = \[([\s\S]*?)\];/.exec(sw);
    assert.ok(list, 'sw.js has no `const FILES = [...]` list');
    const files = list[1].match(/'([^']+)'/g).map(x => x.slice(1, -1)).filter(f => f !== './');
    const gone = files.filter(f => !fs.existsSync(path.join(root, f)));
    assert.strictEqual(gone.length, 0, `sw.js precaches files that don't exist: ${gone.join(', ')}`);

    // The other direction: a script added to index.html but not to the worker would
    // be fetched from the network and the game would simply not start offline.
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
    const miss = srcs.filter(f => !files.includes(f));
    assert.strictEqual(miss.length, 0, `index.html loads scripts sw.js never caches: ${miss.join(', ')}`);
});

// --- Quests: can every quest actually be finished ---
// Quest definitions are hand-written, and the only way to verify them used to
// be opening the game and wandering for hours. Here each quest is finished
// **through the real engine**: `Quests.make` sets it up, a driver feeds it
// quest events via `Quests.emit`/`dailyTick`, and `complete()` pays the
// reward. The table is checked against the definition list — a new quest
// added without a driver fails the test instead of silently never finishing.
function questSuite() {
    const gq = H.world({ seed: 3 });
    const { Quests, QUESTS, LOCATIONS, LORDS, Nobles, Game, state } = gq;
    const loc = id => LOCATIONS.find(l => l.id === id);
    const enter = id => Quests.emit('entered_location', { locId: id, loc: loc(id) });
    const give = (itemId, qty) => state.player.inventory.push({ ...gq.ITEMS[itemId], qty });

    const drivers = {
        butter_blockade: q => Quests.emit('bought_item', { locId: q.data.locId, itemId: 'cheese', qty: q.data.need }),
        fog_dot: q => { state.player.x = q.data.x; state.player.y = q.data.y; Quests.dailyTick(); },
        sergeant_exam: q => {
            state.player.party = Array.from({ length: q.data.need }, (_, i) =>
                ({ id: 'v' + i, name: 'Svadya Şövalyesi', level: 21, type: 'cavalry' }));
            enter(q.data.locId);
        },
        hungry_army: q => { give('wheat', q.data.need); enter(q.data.locId); },
        brother_in_chains: q => Quests.emit('battle_won', { npcId: q.data.npcId }),
        fixed_match: q => Quests.emit('tournament_end', { won: false, score: q.data.lo }),
        false_news: q => LORDS.filter(l => l.faction === q.data.faction && l.id !== q.data.about)
                              .forEach(l => Quests.emit('talked_to', { lordId: l.id })),
        crazy_chickens: q => Quests.emit('chickens_caught', { won: true }),
        harvest_watch: q => { for(let i = 0; i < q.data.need; i++) Quests.emit('battle_won', { questWave: q.id }); },
        lost_letter: q => {
            enter(q.data.pickLoc);
            // A lord can only be found in their own hall (Nobles.isAt) — pull their party home
            const seat = loc(Quests.lordSeat(q.data.toId)), p = Nobles.partyOf(q.data.toId);
            if(p) { p.x = seat.x; p.y = seat.y; }
            enter(seat.id);
        },
        bring_poem: q => Quests.emit('poem_recited_lord', { lordId: q.giverId }),
        arena_champion: () => Quests.emit('tournament_end', { won: true, score: 12 }),
        chain_market: q => {
            for(let i = 0; i < q.data.need; i++) state.player.prisoners.push({ id: 'p' + i, name: 'Çapulcu', level: 5 });
            enter(q.data.locId);
        },
        dawn_raid: q => Quests.emit('raided', { locId: q.data.locId }),
        caravan_escort: q => {
            for(let i = 0; i < q.data.need; i++) Quests.emit('battle_won', { npcId: 'b' + i });
            enter(q.data.locId);
        },
        guild_supply: q => { give(q.data.item, q.data.need); enter(q.data.locId); },
        // Drives the real path (Game.clearLair emits the event); on day 1 the lair's
        // purse is still empty, so the quest reward is the only money paid.
        clear_lair: q => Game.clearLair(q.data.lairId)
    };

    // First eligible giver for a quest: personality + the world's `can` precondition
    function giverFor(id) {
        const d = QUESTS[id];
        if(d.givers.includes('guild')) return 'guild_' + LOCATIONS.find(l => l.type === 'city').id;
        const l = LORDS.find(x => (!d.givers.length || d.givers.includes(x.personality))
                               && (!d.can || d.can(Quests.giver(x.id))));
        return l && l.id;
    }

    test('quest: every quest in the table has a test driver', () => {
        const missing = Object.keys(QUESTS).filter(id => !drivers[id]);
        assert.strictEqual(missing.length, 0, `quest with no driver: ${missing.join(', ')}`);
    });

    Object.keys(QUESTS).forEach(id => {
        test(`quest: ${id} completes in the real engine`, () => {
            const giverId = giverFor(id);
            assert.ok(giverId, 'nobody around can give this quest');
            // Every quest starts with a clean player: the previous quest's inventory shouldn't count
            state.player.quests = []; state.player.inventory = []; state.player.prisoners = [];
            state.player.party = []; state.player.money = 0;
            const q = Quests.make(id, giverId);
            state.player.quests.push(q);

            // The answer to "where" is either a real location or none at all
            const w = QUESTS[id].where && QUESTS[id].where(q);
            assert.ok(!w || loc(w), `where() returned a place not on the map: ${w}`);
            assert.ok(QUESTS[id].desc(q).length > 10, 'desc is empty');

            drivers[id](q);
            assert.ok(!Quests.has(id), 'quest didn\'t finish — the driver\'s events don\'t reach the engine');
            assert.strictEqual(state.player.money, QUESTS[id].reward.money, 'reward wasn\'t paid');
        });
    });
}
questSuite();

// --- Ambush: only what you can see can ambush you ---
// The fixed 240-unit ambush range was wider than the starting character's
// sight in a forest (125): a band ambushing you would, by definition, never
// have been drawn on screen. Three gates: range never exceeds sight, a large
// enough army isn't ambushed, and flee while surrounded is a coin flip, not shut off.
function ambushSuite() {
    const ga = H.world({ seed: 5 });
    const { Game, state, LOCATIONS, FORESTS } = ga;
    const forest = FORESTS ? FORESTS[0] : { x: 3450, y: 3450 };

    // Put the player and a wolf pack in the same forest's center. Forest radius
    // is 135, so the distance between them can't exceed it — distances are
    // chosen relative to sight range in a forest.
    const setup = (dist, groupSize) => {
        state.encounterCooldown = 0;
        state.player.prisoner = null;
        state.player.x = forest.x; state.player.y = forest.y;
        state.player.party = Array.from({ length: groupSize }, (_, i) => ({ id: 'p' + i, name: 'Asker', level: 5, type: 'infantry' }));
        state.npcParties.length = 0;
        const wolf = Game.spawnBand('wolf');
        wolf.size = 8;
        wolf.x = wolf.targetX = forest.x + dist; wolf.y = wolf.targetY = forest.y;
        Game._ambushCd = 0;
        let hit = null;
        const orig = Game.triggerEncounter;
        Game.triggerEncounter = (npc, kind) => { hit = { npc, kind }; };
        Game.checkAmbush(1);
        Game.triggerEncounter = orig;
        return { hit, wolf };
    };

    // Sight in a forest: read from the engine itself, not a hardcoded constant
    const sightRange = setup(1, 0).wolf && Game.spotRange(setup(1, 0).wolf);
    const nearDist = Math.round(sightRange * 0.5);
    const farDist = Math.round(sightRange) + 5;    // outside sight range, inside the old fixed 240

    test('ambush: the band that ambushes you is always close enough to be drawn', () => {
        assert.ok(Game.getTerrainInfo(forest.x, forest.y).name === 'Orman', 'forest center isn\'t forest');
        assert.ok(farDist < Game.AMBUSH_RANGE, 'sight range exceeds the ambush ceiling, test is meaningless');

        const far = setup(farDist, 0);
        assert.ok(Game.getTerrainInfo(far.wolf.x, far.wolf.y).name === 'Orman', 'band fell outside the forest');
        assert.strictEqual(far.hit, null, 'a band outside sight range still ambushes');

        const near = setup(nearDist, 0);
        assert.ok(near.hit, 'a band inside sight range doesn\'t ambush');
        assert.ok(Game.canSee(near.wolf), 'the ambushing band isn\'t being drawn');
    });

    test('ambush: no ambush against an army 1.5× as large', () => {
        assert.strictEqual(setup(nearDist, 20).hit, null, '8 wolves are ambushing a 21-strong army');
    });

    test('ambush: flee isn\'t closed off while surrounded, just half as likely', () => {
        const npc = { speed: 60 };
        state.ambush = false; const open = Game.fleeChance(npc);
        state.ambush = true;  const surrounded = Game.fleeChance(npc);
        state.ambush = false;
        assert.ok(surrounded > 0, 'flee chance while ambushed is zero');
        assert.ok(Math.abs(surrounded - open * Game.AMBUSH_FLEE) < 1e-9, 'ambush flee multiplier isn\'t applied');
    });
}
ambushSuite();

// --- Road events (#67) ---
// The pool is data, the `run` bodies are code: if a helper's name changes it
// only breaks when that choice is picked, and only the player ever sees it.
// So the real job of this test is **actually running every choice**. It also
// checks that the trigger depends on distance and that the repeat window works.
function roadSuite() {
    const ga = H.world({ seed: 7 });
    const { Game, state, LOCATIONS } = ga;

    test('road: every event has at least two real choices', () => {
        const ids = new Set();
        Game.ROAD_EVENTS.forEach(ev => {
            assert.ok(!ids.has(ev.id), `duplicate event id: ${ev.id}`);
            ids.add(ev.id);
            assert.ok(ev.icon && typeof ev.when === 'function', `${ev.id}: missing icon/condition`);
            assert.strictEqual(typeof ev.text, 'function', `${ev.id}: text isn't a function (translation would freeze)`);
            assert.ok(ev.choices.length >= 2, `${ev.id}: a single choice isn't a decision`);
            ev.choices.forEach((ch, i) => {
                assert.strictEqual(typeof ch.label, 'function', `${ev.id}[${i}]: label isn't a function`);
                assert.strictEqual(typeof ch.run, 'function', `${ev.id}[${i}]: run is missing`);
            });
        });
        assert.ok(ids.size >= 20, `pool fell to ${ids.size} events`);
    });

    test('road: every choice runs and produces a displayable result', () => {
        // A generous world where every condition passes: money and party are
        // refreshed before every choice, otherwise the first few choices would
        // drain the purse and leave the rest untested.
        Game.ROAD_EVENTS.forEach(ev => ev.choices.forEach((ch, i) => {
            state.player.x = LOCATIONS[0].x + 60; state.player.y = LOCATIONS[0].y;
            state.player.money = 5000;
            state.player.party = Array.from({ length: 4 }, (_, k) => ({ id: 'r' + k, name: 'Asker', level: 3, xp: 0, xpNext: 5, type: 'infantry' }));
            state.npcParties.length = 0;
            const ctx = Game.eventCtx();
            assert.ok(ctx.near, 'no nearby settlement found — context wasn\'t set up');
            assert.ok(typeof ev.text(ctx) === 'string', `${ev.id}: text isn't a string`);
            assert.ok(typeof ch.label(ctx) === 'string', `${ev.id}[${i}]: label isn't a string`);
            let r = ch.run(ctx);
            if(typeof r === 'string') r = { html: r };
            assert.ok(r && typeof r.html === 'string' && r.html.length > 0, `${ev.id}[${i}]: no result text`);
            assert.ok(!r.then || typeof r.then === 'function', `${ev.id}[${i}]: then isn't callable`);
        }));
    });

    test('road: the roll depends on distance, not on days', () => {
        state.player.prisoner = null; state.encounterCooldown = 0;
        state.roadWalked = 0;
        const orig = Game.roadEvent;
        let counter = 0;
        Game.roadEvent = () => { counter++; return 'fake'; };
        // Silencing the roll isn't done via Math.random: the engine runs in a
        // separate vm context, and that Math isn't this Math. Instead we set the
        // chance to 1.
        const chance = Game.ROAD_CHANCE;
        Game.ROAD_CHANCE = 1;
        for(let i = 0; i < 40; i++) Game.roadTick(Game.ROAD_EVERY / 4);
        Game.ROAD_CHANCE = chance;
        Game.roadEvent = orig;
        assert.strictEqual(counter, 10, `40×(ROAD_EVERY/4) of travel produced ${counter} events, expected 10`);
    });

    test('road: the recent-events window blocks repeats', () => {
        state.recentEvents = [];
        const pool = Game.ROAD_EVENTS.slice(0, 3);
        const ctx = Game.eventCtx();
        const always = () => true;
        const a = Game.pickEvent(pool.map(e => ({ ...e, when: always })), ctx);
        const b = Game.pickEvent(pool.map(e => ({ ...e, when: always })), ctx);
        assert.ok(a && b && a.id !== b.id, 'the same event repeated back-to-back while fresh options existed');
        assert.ok(state.recentEvents.length <= 6, 'the repeat window grows without bound');
    });
}
roadSuite();

// Population target is derived from sight and *held*: it used to start with
// 13 bands and spawn one a day, i.e. a region a lord had cleared would stay
// empty for weeks (the map looked deserted).
test('band population stays at target over 60 days', () => {
    const g = H.world({ seed: 4 });
    const target = g.Game.bandTarget();
    assert.strictEqual(g.Game.bandCount(), target, 'the world doesn\'t start at the target population');
    let low = target;
    H.run(g, 60, () => { low = Math.min(low, g.Game.bandCount()); });
    assert.ok(low >= target - g.Game.BAND_REFILL * 2,
        `band population fell to ${low}, target ${target} (refill can't keep up)`);
});

// --- Bandit lairs (#68) ---
// Three claims in one run: a lair erodes the region around it, pays out its
// purse and is removed from the map when cleared, and no lairless world spawns new bands.
test('bandit lair: erodes the region, pays out when cleared, and is a band source', () => {
    const g = H.world({ seed: 6 });
    const lairs = g.Game.lairs();
    assert.strictEqual(lairs.length, g.Game.LAIR_COUNT, 'the world doesn\'t start with lairs');
    const near = g.LOCATIONS.filter(l => l.prosperity !== undefined
        && lairs.some(x => g.Game.dist(x, l) < g.Game.LAIR_RANGE));
    const far = g.LOCATIONS.filter(l => l.prosperity !== undefined && !near.includes(l));
    const avg = a => a.reduce((s, l) => s + l.prosperity, 0) / a.length;
    H.run(g, 40);
    assert.ok(avg(near) < avg(far) - 10,
        `lair surroundings aren't being eroded: near ${avg(near).toFixed(1)} vs far ${avg(far).toFixed(1)}`);

    const l = g.Game.lairs()[0], purse = Math.round(l.purse), money = g.state.player.money;
    assert.ok(purse > 0, 'lair\'s purse isn\'t accumulating');
    g.Game.clearLair(l.id);
    assert.strictEqual(g.state.player.money, money + purse, 'purse wasn\'t paid out');
    assert.ok(!g.Game.lairs().some(x => x.id === l.id), 'cleared lair stayed on the map');

    // A lairless world: population refill runs but no band spawns.
    g.Game.LAIR_COUNT = 0;
    g.state.sites = g.state.sites.filter(s => s.kind !== 'lair');
    g.state.npcParties = g.state.npcParties.filter(n => n.type !== 'bandit');
    H.run(g, 10);
    assert.strictEqual(g.Game.bandCount(), 0, 'a band spawned with no lair present');
});

// --- Rumours (#71) ---
// Information was free and instant before this: the guild ledger handed over every
// price in the world for nothing. Three claims: the tavern charges coin AND hours,
// Spotting decides both which stories reach you and how often they're wrong, and a
// false rumour is a true story pinned to the wrong place (not invented prose).
test('rumour: the tavern charges coin and hours, and Spotting sets tier and lie rate', () => {
    const g = H.world({ seed: 3 });
    const { Game, state, LOCATIONS } = g;
    H.run(g, 40);                      // a live world: bandits, lord parties, campaigns
    const town = LOCATIONS.find(l => l.type === 'city');
    const at = lvl => { state.player.proficiencies.spotting.level = lvl;
                        return { tier: Game.rumorTier(), lie: Game.rumorLieChance() }; };
    assert.strictEqual(at(1).tier, 1, 'an untrained ear is hearing above tier 1');
    assert.strictEqual(at(4).tier, 2);
    assert.strictEqual(at(7).tier, 3);
    assert.ok(at(1).lie > at(12).lie, 'the lie rate isn\'t falling with Spotting');

    state.player.proficiencies.spotting.level = 9;
    state.player.money = 10000;
    const money = state.player.money, clock = state.time.day * 24 + state.time.hour;
    Game.listenRumor(town.id);
    assert.strictEqual(state.player.money, money - Game.RUMOR_COST, 'listening was free');
    const hours = (state.time.day * 24 + state.time.hour) - clock;
    between(hours, Game.RUMOR_HOURS[0], Game.RUMOR_HOURS[1], 'hours spent listening');

    // With no coin there is no story and no clock — the check has to come first
    state.player.money = 0;
    const clock2 = state.time.day * 24 + state.time.hour;
    Game.listenRumor(town.id);
    assert.strictEqual((state.time.day * 24 + state.time.hour), clock2, 'a penniless player still lost hours');
});

test('rumour: every generator produces a story, and a lie only moves the place', () => {
    const g = H.world({ seed: 3 });
    const { Game, state, LOCATIONS } = g;
    H.run(g, 40);
    const town = LOCATIONS.find(l => l.type === 'city');
    const truth = t => t;
    Game.RUMORS.forEach((r, i) => {
        const out = r.run(town, truth);
        assert.ok(out === null || (out && typeof out.html === 'string' && out.html.length > 10),
            `rumour generator ${i} returned something undisplayable`);
        if(out && out.mark) assert.ok(isFinite(out.mark.x) && isFinite(out.mark.y), `generator ${i} marked a nowhere`);
    });
    assert.ok(Game.RUMORS.every(r => r.run(town, truth)),
        'a generator found nothing to say in a 40-day-old world');

    // The lie: same generator, same world, a different place named
    const far = LOCATIONS[LOCATIONS.length - 1];
    const gen = Game.RUMORS.find(r => r.run(town, truth) && r.run(town, truth).mark);
    const a = gen.run(town, truth), b = gen.run(town, () => far);
    assert.notStrictEqual(a.mark.x, b.mark.x, 'a false rumour marked the true place anyway');

    // A tier-1 story is a direction, never a map pin
    Game.RUMORS.filter(r => r.tier === 1).forEach((r, i) => {
        const out = r.run(town, truth);
        assert.ok(!out || !out.mark, `vague rumour ${i} is dropping a map marker`);
    });
});

test('rumour: the guild ledger is paid for once per town per day', () => {
    const g = H.world({ seed: 3 });
    const { Game, state, LOCATIONS } = g;
    const town = LOCATIONS.find(l => l.type === 'city');
    const other = LOCATIONS.filter(l => l.type === 'city' && l.id !== town.id)[0];
    state.player.money = 1000;
    Game.guildPrices(town.id);
    assert.strictEqual(state.player.money, 1000 - Game.GUILD_FEE, 'the ledger was free');
    Game.guildPrices(town.id);
    assert.strictEqual(state.player.money, 1000 - Game.GUILD_FEE, 'paging back charged a second fee');
    Game.guildPrices(other.id);
    assert.strictEqual(state.player.money, 1000 - Game.GUILD_FEE * 2, 'a second town shares the first one\'s fee');
});

// --- Renown gates 300/500/800 (#69) ---
test('gate 300: tribute needs renown, independence and an army, then pays daily', () => {
    const g = H.world({ seed: 5 });
    const { Game, state, LOCATIONS, LORDS, Nobles } = g;
    const vil = LOCATIONS.find(l => l.type === 'village');
    const owner = Game.ownerLord(vil);
    const refuses = () => { Game.tributeVillage(vil); return vil.tributeTo !== 'player'; };

    state.player.renown = state.player.maxRenown = 100;
    assert.ok(refuses(), '100 renown was enough to impose tribute');
    state.player.renown = state.player.maxRenown = Game.RENOWN_GATES.tribute;
    state.player.vassalOf = 'swadia';
    assert.ok(refuses(), 'a vassal collected tribute of his own');
    state.player.vassalOf = null;
    assert.ok(refuses(), 'an empty party was enough to name a price');

    const need = Math.ceil(Game.villageMilitia(vil) * Game.TRIBUTE_MILITIA);
    for(let i = 0; i < need; i++) state.player.party.push(troop(5, { id: 'tr' + i }));
    const rel = owner ? Nobles.rel(owner.id) : 0;
    Game.imposeTribute(vil.id);
    assert.strictEqual(vil.tributeTo, 'player', 'the village didn\'t come under tribute');
    assert.ok(Game.tributeOf(vil) > 0, 'tribute pays nothing');
    assert.strictEqual(Game.fiefIncome().levy, Game.tributeOf(vil), 'tribute is outside the daily flow');
    if(owner) assert.ok(Nobles.rel(owner.id) < rel, 'the village\'s lord didn\'t mind at all');

    // War closes the road: an enterprise's rule, applied to tribute
    Game.declareWar(Game.playerFaction(), vil.faction);
    assert.strictEqual(Game.tributeOf(vil), 0, 'tribute kept flowing across a front');
    Game.makePeace(Game.playerFaction(), vil.faction);

    // A new lord honours no old tribute
    const parent = LOCATIONS.find(l => l.id === vil.parentId) || LOCATIONS.find(l => l.type === 'castle' && l.faction === vil.faction);
    const enemy = Object.keys(g.FACTIONS).find(f => f !== parent.faction && f !== 'player_kingdom');
    Game.captureSettlement(parent, { faction: enemy, size: 100 });
    assert.ok(!vil.tributeTo, 'the tribute survived the village changing hands');
});

test('gate 500: the envoy leaves the party, comes back, and only one rides at a time', () => {
    const g = H.world({ seed: 5 });
    const { Game, state, LORDS, Nobles } = g;
    const lord = LORDS.find(l => l.rank !== 'king');
    const comp = { id: 'comp_x', companionId: 'x', isCompanion: true, name: 'Yoldaş', level: 15, xp: 0, xpNext: 18 };
    state.player.party = [comp];
    state.player.renown = state.player.maxRenown = Game.RENOWN_GATES.envoy;

    Game.sendEnvoy(lord.id, 'comp_x', 'rel');
    assert.ok(state.envoy, 'the envoy never set out');
    assert.ok(!state.player.party.some(t => t.id === 'comp_x'), 'the envoy is still in the party');
    const back = state.envoy.backDay;
    between(back - state.time.day, Game.ENVOY_DAYS[0], Game.ENVOY_DAYS[1], 'days the envoy is away');

    state.player.party.push({ id: 'comp_y', companionId: 'y', isCompanion: true, name: 'Öbürü', level: 10, xp: 0, xpNext: 13 });
    Game.sendEnvoy(lord.id, 'comp_y', 'rel');
    assert.strictEqual(state.envoy.compId, 'comp_x', 'a second envoy set out at the same time');

    const rel = Nobles.rel(lord.id);
    while(state.time.day < back) H.run(g, 1);
    assert.strictEqual(state.envoy, null, 'the envoy never came home');
    assert.ok(state.player.party.some(t => t.id === 'comp_x'), 'the companion didn\'t rejoin the party');
    assert.notStrictEqual(Nobles.rel(lord.id), rel, 'the mission changed nothing either way');
});

// The point of the post: the army marches where YOU point, not where it would have gone.
// The target picked here is the enemy holding farthest from the kingdom's own lords.
test('gate 800: a player marshal\'s target actually pulls the kingdom\'s lords', () => {
    let lords = 0, reached = 0, seeds = 0;
    for(const seed of [1, 3, 4, 5]) {
        const g = H.world({ seed });
        const { Game, state, LOCATIONS, LORDS } = g;
        H.run(g, 20);
        const f = Object.keys(g.FACTIONS).find(x => x !== 'player_kingdom' && Game.warsOf(x).length);
        if(!f) continue;
        const king = LORDS.find(l => l.faction === f && l.rank === 'king');
        state.player.vassalOf = f;
        state.player.renown = state.player.maxRenown = Game.RENOWN_GATES.marshal;
        state.relations[king.id] = Game.MARSHAL_REL + 20;
        let w = 0; while(!state.campaigns[f] && w++ < 60) H.run(g, 1);
        if(!state.campaigns[f]) continue;

        Game.askMarshal(king.id);
        assert.strictEqual(state.marshalOf, f, 'the king refused a qualified candidate');
        assert.strictEqual(state.campaigns[f].marshalId, 'player', 'the banner didn\'t change hands');

        const ours = () => state.npcParties.filter(n => n.lordId && n.faction === f && n.size > 0);
        const enemies = LOCATIONS.filter(l => l.type !== 'village' && Game.atWar(f, l.faction));
        if(!enemies.length || !ours().length) continue;
        const n = ours().length;
        const cen = ours().reduce((a, p) => ({ x: a.x + p.x / n, y: a.y + p.y / n }), { x: 0, y: 0 });
        const tgt = enemies.sort((a, b) => Game.dist(b, cen) - Game.dist(a, cen))[0];
        Game.setCampaignTarget(f, tgt.id);
        assert.strictEqual(state.campaigns[f].targetLocId, tgt.id, 'the marshal\'s order wasn\'t written down');

        seeds++; lords += n;
        const seen = new Set();
        for(let d = 0; d < 20 && state.campaigns[f]; d++) {
            H.run(g, 1);
            ours().filter(p => Game.dist(p, tgt) < 500).forEach(p => seen.add(p.lordId));
        }
        reached += seen.size;
    }
    assert.ok(seeds >= 3, `only ${seeds} seeds produced a campaign to lead`);
    assert.ok(reached / lords >= 0.5,
        `the marshal's target pulled only ${reached}/${lords} lords in 20 days — the post is decorative`);
});

test('gate 800: the post lasts exactly one campaign', () => {
    const g = H.world({ seed: 3 });
    const { Game, state, LORDS } = g;
    H.run(g, 20);
    const f = Object.keys(g.FACTIONS).find(x => x !== 'player_kingdom' && Game.warsOf(x).length);
    const king = LORDS.find(l => l.faction === f && l.rank === 'king');
    state.player.vassalOf = f;
    state.player.renown = state.player.maxRenown = Game.RENOWN_GATES.marshal;
    state.relations[king.id] = Game.MARSHAL_REL + 20;
    let w = 0; while(!state.campaigns[f] && w++ < 60) H.run(g, 1);
    Game.askMarshal(king.id);
    assert.strictEqual(state.marshalOf, f);
    Game.endCampaign(f);
    assert.strictEqual(state.marshalOf, null, 'the marshalcy outlived its campaign');
});

// --- Language layer (#81) ---
// Both classes of bug are caught statically: a key missing from a dictionary
// (code changed after the dictionary did) and a translation frozen in a
// top-level table.
test('i18n: every T key in the code is in both dictionaries', () => {
    const K = require('./i18n-keys');
    const d = K.dicts(), missing = [...K.codeKeys()].filter(k => !(k in d.en) || !(k in d.id));
    assert.ok(missing.length === 0, `${missing.length} keys missing from a dictionary, first: ${JSON.stringify(missing[0])}`);
});

// An inline handler lives inside a double-quoted attribute, so anything it
// interpolates must not contain a raw `"`. JSON.stringify does — `'auto'` became
// `"auto"`, which ended the attribute mid-call and left the button uncompilable
// (#94). Game.lit is the escape; this is the gate that keeps it in use.
test('inline handlers never interpolate a raw double quote', () => {
    const fs = require('fs'), path = require('path');
    const root = path.join(__dirname, '..');
    const bad = [];
    for(const f of ['app.js', 'battle.js', 'nobles.js', 'quests.js', 'index.html']) {
        const src = fs.readFileSync(path.join(root, f), 'utf8');
        const re = /\bon[a-z]+\s*=\s*"/g;
        let m;
        while((m = re.exec(src))) {
            // Walk the attribute brace-aware: an interpolation may hold the " itself.
            let i = m.index + m[0].length;
            while(i < src.length && src[i] !== '"' && src[i] !== '\n') {
                if(src[i] === '$' && src[i + 1] === '{') {
                    let d = 1, s = i;
                    i += 2;
                    while(i < src.length && d) { if(src[i] === '{') d++; else if(src[i] === '}') d--; i++; }
                    const expr = src.slice(s, i);
                    if(/JSON\.stringify\(/.test(expr))
                        bad.push(`${f}:${src.slice(0, s).split('\n').length}  ${expr}`);
                } else i++;
            }
        }
    }
    assert.ok(bad.length === 0, `use Game.lit() instead: ${bad.join(' | ')}`);
});

test('Game.lit escapes the quotes an inline handler cannot carry', () => {
    assert.strictEqual(Game.lit('auto'), '&quot;auto&quot;');
    assert.strictEqual(Game.lit(true), 'true');
    assert.strictEqual(Game.lit(false), 'false');
});

// A Turkish keyboard sends 'ı' from the key engraved I, and 'ı'.toLowerCase() is
// still 'ı' — reading e.key made every letter shortcut US-layout-only (#94).
test('key shortcuts read the physical key, not the layout letter', () => {
    const { Input } = g;
    assert.strictEqual(Input.letter({ code: 'KeyI', key: 'ı' }), 'i');
    assert.strictEqual(Input.letter({ code: 'KeyW', key: 'w' }), 'w');
    assert.strictEqual(Input.letter({ code: 'Escape', key: 'Escape' }), 'escape');
});

// A manual pan is anchored to the map: the camera target is player + offset, so
// without cancelling the player's own step out of the offset the view slid away in
// the direction of travel while you were looking at your destination (#94).
test('a panned camera holds its world position while the player walks', () => {
    const { Game, state } = g;
    Game.camera.offsetX = 600; Game.camera.offsetY = 400;
    Game.update(0.016);                                  // seeds the previous-position pair
    const tx = state.player.x + Game.camera.offsetX, ty = state.player.y + Game.camera.offsetY;
    for(let i = 0; i < 50; i++) { state.player.x += 7; state.player.y += 4; Game.update(0.016); }
    assert.strictEqual(state.player.x + Game.camera.offsetX, tx);
    assert.strictEqual(state.player.y + Game.camera.offsetY, ty);

    // With no pan the camera still follows: a zero offset stays zero.
    Game.camera.offsetX = 0; Game.camera.offsetY = 0;
    for(let i = 0; i < 50; i++) { state.player.x += 7; Game.update(0.016); }
    assert.strictEqual(Game.camera.offsetX, 0);
});

// A quest wave is deliberately smaller than the player's army, so the generic
// "a weak band runs" rule made Hasat Nöbeti a chase instead of a fight (#94).
test('a quest wave closes in where a plain band of the same size flees', () => {
    const { Game, state } = g;
    state.player.party.length = 0;
    for(let i = 0; i < 25; i++) state.player.party.push({ level: 10, hp: 10, maxHp: 10 });
    const walk = (wave) => {
        const n = Game.createNPC('Hasat Çapulcuları', 'bandit', 10, '#8b0000');
        n.x = state.player.x + 200; n.y = state.player.y;
        n.targetX = n.x; n.targetY = n.y;
        if(wave) n.questWave = 'harvest_watch';
        state.npcParties.length = 0; state.npcParties.push(n);
        for(let i = 0; i < 30; i++) Game.updateNPCs(0.1);
        return Game.dist(n, state.player);
    };
    assert.ok(walk(true) < 200, 'a summoned wave must come to the player');
    assert.ok(walk(false) > 200, 'an ordinary weak band still flees');
});

// The static extractor only sees `T('…')` **literals**; raw data translated
// via a variable like `T(def.title)` is invisible to it. Quest titles are
// written exactly that way — in 0.77 two new titles came out with no
// dictionary entry and fell back to Turkish in EN.
test('i18n: quest titles in the raw data table are in both dictionaries', () => {
    const d = require('./i18n-keys').dicts();
    const missing = Object.keys(g.QUESTS).map(id => g.QUESTS[id].title)
        .filter(t => !(t in d.en) || !(t in d.id));
    assert.strictEqual(missing.length, 0, `quest title with no dictionary entry: ${missing.join(', ')}`);
});

// Same blind spot: `FACTIONS[f].people` is translated on the map label with
// `T(k.people)`, so the extractor can't see it. If the people-name has no
// dictionary entry, a caravan renders in Turkish in EN.
test('i18n: faction people-names are in both dictionaries', () => {
    const d = require('./i18n-keys').dicts();
    const people = Object.keys(g.FACTIONS).map(f => g.FACTIONS[f].people);
    assert.ok(people.every(Boolean), 'a faction has no people-name');
    const missing = people.filter(t => !(t in d.en) || !(t in d.id));
    assert.strictEqual(missing.length, 0, `people-name with no dictionary entry: ${missing.join(', ')}`);
});

test('i18n: top-level data tables are language-independent', () => {
    // Same seed, two languages: if T(...) runs while the table is being built, values diverge.
    const tr = H.load({ seed: 7 }), en = H.load({ seed: 7, lang: 'en' });
    const paths = [['PERSONALITIES'], ['LADY_TRAITS'], ['COMPLIMENTS'], ['POEMS'], ['QUESTS'],
                    ['Nobles', 'LORD_TRAITS'], ['Nobles', 'LORD_LINES'], ['Nobles', 'RETAINERS'],
                    ['Nobles', 'GREETS'], ['Game', 'ATTRS'], ['Game', 'AMBITIONS'],
                    ['Game', 'SIEGE_PLANS'], ['Game', 'HONOR'], ['Battle', 'ARENA_FOES']];
    const J = v => JSON.stringify(v, (k, x) => typeof x === 'function' ? 'fn' : x);
    const frozen = paths.filter(p => {
        const at = g => p.reduce((o, k) => o && o[k], g);
        return J(at(tr)) !== J(at(en));
    }).map(p => p.join('.'));
    assert.ok(frozen.length === 0, `frozen table: ${frozen.join(', ')}`);
});

// ---------- 2. Thresholds ----------
// Not an exact number, a range: the world is random, but a broken rule falls
// outside the range. Ranges were kept at roughly 2× the measured width — to
// catch a regime change, not noise.
function thresholds() {
    const { simulate } = require('./sim');
    const { runScript } = require('./economy');

    test('world: 200-day playerless sim thresholds', () => {
        const r = simulate(1, 200);
        between(r.conquest, 1, 20, 'conquests');                  // 0 = the front is frozen, 20+ = the map is melting
        assert.strictEqual(r.erasedKingdoms, 0, 'a kingdom was erased from the map');
        between(r.campaign, 10, 60, 'campaigns');
        between(r.peace, 5, 40, 'peace treaties');
        // Ceiling 200→260: once band population was tied to sight (13 → 30),
        // raids went up too, but average prosperity (87.9–89.6) and erased
        // kingdoms (0) didn't budge — i.e. the economy is absorbing it, the
        // regime isn't changing. Range measured across 5 seeds is 119–206.
        between(r.caravanRaid, 20, 260, 'caravan raids');
        assert.ok(r.caravans > 0, 'no trade party left on the map');
        assert.strictEqual(r.errors, 0, 'exception during the sim');
    });

    test('economy: an army can\'t live without income, a fief sustains it', () => {
        const idle = runScript('idle', 60, 1, 10, 'Svadya Milisi', 10, 1000);
        const fief = runScript('fief', 60, 1, 10, 'Svadya Milisi', 10, 1000);
        assert.ok(idle.perDay < 0, `an idle army is profitable: ${idle.perDay}₺/day`);
        assert.ok(fief.perDay > 20, `fief income has collapsed: ${fief.perDay}₺/day`);
        between(fief.end, 2000, 20000, 'fief net worth at day 60');
    });

    // Regression for #47: food isn't a trade good. A 10-person lvl-10 army eats
    // 10 units of low-grade food a day; at 4₺ wheat that's ~40₺. If the price
    // doubles this line fails — that's the verification path from the issue.
    test('economy: daily supply bill for a 10-person army', () => {
        const r = runScript('idle', 60, 1, 10, 'Svadya Milisi', 10, 1000);
        assert.strictEqual(r.wage, 20, 'wage tier changed');
        between(r.feed, 5, 25, 'daily supply cost (₺)');
    });
}

// ---------- Output ----------
if(!H.args().fast && !H.args().hizli) thresholds();

const bad = results.filter(r => !r.ok);
results.forEach(r => console.log(`${r.ok ? '  ok' : 'FAIL'}  ${r.name}${r.ok ? '' : '\n        ' + r.msg}`));
console.log(`\n${results.length - bad.length}/${results.length} passed`);
if(bad.length) process.exit(1);
