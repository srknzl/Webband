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
//   node tools/test.js --fast     # pure logic only: no thresholds, no `slow` tests
// ============================================================
'use strict';
const assert = require('assert');
const H = require('./harness');

const results = [];
function test(name, fn) {
    try { fn(); results.push({ name, ok: true }); }
    catch(e) { results.push({ name, ok: false, msg: e.message.split('\n')[0] }); }
}
// A test that plays worlds or duels over many seeds and days (a second or more each): part of
// the full run CI makes, left out of --fast so the quick loop stays quick.
const FAST = H.args().fast || H.args().hizli;
function slow(name, fn) { if(!FAST) test(name, fn); }
// Range assertion: the world is random, so no single number is expected.
function between(actual, lo, hi, what) {
    assert.ok(actual >= lo && actual <= hi, `${what}: ${actual} ∉ [${lo}, ${hi}]`);
}

// ---------- 1. Pure logic ----------
// Loading once is enough: all of these functions read `state` and none of
// them need a world (settlement layout, NPCs). Tests set up their own state.
const g = H.load({ seed: 1 });
const { Game, Battle, Save, state, PERKS, PERK_BY_ID } = g;

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
// 2.8.0: armour takes a share (× 20 / (20 + def × typeArmor)), no longer subtracts — so a heavy
// armour still lets a third of a cut through instead of a sixth (the old 30-on-25 gave 5)
test('afterArmor: as armor rises, pierce takes the lead (def 25)', () => {
    assert.strictEqual(Battle.afterArmor('cut', 30, 12), 19);
    assert.strictEqual(Battle.afterArmor('pierce', 30, 12), 21);
    assert.strictEqual(Battle.afterArmor('blunt', 30, 12), 17);
    assert.strictEqual(Battle.afterArmor('cut', 30, 25), 13);
    assert.strictEqual(Battle.afterArmor('pierce', 30, 25), 17);
    assert.strictEqual(Battle.afterArmor('blunt', 30, 25), 13);
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

test('getPartyCapacity: marriage adds a household retinue allowance', () => {
    const p = reset();
    p.spouse = null;
    assert.strictEqual(Game.getPartyCapacity(), 12);
    p.spouse = 'lady_test';
    assert.strictEqual(Game.getPartyCapacity(), 17);
    p.spouse = null;
});

test('perks: point economy is floor(level/2)', () => {
    const p = reset(); p.perks = [];
    p.stats.level = 1; assert.strictEqual(Game.perkPointsTotal(), 0);
    p.stats.level = 4; assert.strictEqual(Game.perkPointsTotal(), 2);
    p.stats.level = 40; assert.strictEqual(Game.perkPointsTotal(), 20);
});
test('perks: every id is unique and maps to a branch/tier', () => {
    const seen = new Set();
    PERKS.forEach(br => br.tiers.forEach((pair, ti) => {
        assert.strictEqual(pair.length, 2, br.id + ' tier ' + ti + ' must be a pair');
        pair.forEach(pk => { assert.ok(!seen.has(pk.id), 'dup ' + pk.id); seen.add(pk.id);
            assert.strictEqual(PERK_BY_ID[pk.id].branch, br.id); assert.strictEqual(PERK_BY_ID[pk.id].tier, ti); });
    }));
    assert.strictEqual(seen.size, 70);
});
test('perks: gates block, then a taken perk feeds perkMod', () => {
    const p = reset(); p.perks = [];
    p.stats.level = 40; p.stats.eff.str = 20;
    p.proficiencies.oneHanded = { level: 10 };
    // tier 0 melee A is now reachable
    assert.strictEqual(Game.perkBlock('melee_edge_a'), null);
    // tier 1 is still blocked until tier 0 is taken
    assert.ok(Game.perkBlock('melee_heavy_a'));
    Game.takePerk('melee_edge_a');
    assert.ok(Game.hasPerk('melee_edge_a'));
    assert.ok(Math.abs(Game.perkMod('dmg1h') - 0.10) < 1e-9);
    // the opposing perk in the same tier is now locked out
    assert.ok(Game.perkBlock('melee_guard_b'));
    p.perks = [];
});
test('perks: low level/attr/prof block a tier', () => {
    const p = reset(); p.perks = [];
    p.stats.level = 1; p.stats.eff.str = 10; p.proficiencies.oneHanded = { level: 1 };
    assert.ok(Game.perkBlock('melee_edge_a'));   // level too low
    p.stats.level = 40;
    assert.ok(Game.perkBlock('melee_edge_a'));   // str/prof still too low
});
test('perks: intelligence point grants a focus point', () => {
    const p = reset(); p.stats.attributePoints = 1; p.stats.focusPoints = 0;
    Game.addStat('int');
    assert.strictEqual(p.stats.focusPoints, 1);
});
test('perks: foodUse stacks multiplicatively via upkeep', () => {
    const p = reset(); p.perks = ['scout_ration_a'];   // 0.90
    const base = Game.upkeep().foodLow;
    p.perks = [];
    const raw = Game.upkeep().foodLow;
    assert.ok(Math.abs(base - raw * 0.90) < 1e-6);
    p.perks = [];
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
    assert.strictEqual(fs.need, 5);                   // 10 × lvl10 (0.3×1.4=0.42) + player 0.5625 = 4.7625 → 5 (#27, cut to 0.75× again #132)
    assert.strictEqual(fs.kinds, 1);
    assert.strictEqual(fs.spoil, 1);                  // 60 wheat / 60-day shelf life
    assert.strictEqual(fs.days, 10);                  // 60 / (5 + 1)
});
test('foodStock: elite troops want meat, variety is counted', () => {
    const p = reset();
    // Elite = the top of its tree, not a level (#124): two knights, and a mid-tier troop that eats bread only.
    const knight = id => troop(20, { id, name: 'Svadya Şövalyesi' });
    p.party = [knight('k1'), knight('k2'), troop(10, { name: 'Svadya Süvarisi' })];
    p.inventory = [{ id: 'wheat', qty: 10 }, { id: 'meat', qty: 10 }];
    const fs = Game.foodStock();
    assert.strictEqual(fs.need, 3);                   // 2 × lvl20 (0.3×1.8=0.54) + lvl10 (0.42) + player 0.5625 = 2.0625 → 3 (#27, #132)
    assert.strictEqual(fs.needHigh, 1);               // 0.3 meat per elite troop, ×2 = 0.6 → 1
    assert.strictEqual(fs.high, 10);
    assert.strictEqual(fs.kinds, 2);
});
test('troop level only opens a promotion, it adds no strength (#124)', () => {
    const p = reset();
    const mid = troop(10, { id: 'm', name: 'Svadya Süvarisi', xp: 0, xpNext: 8 });
    const elite = troop(20, { id: 'e', name: 'Svadya Şövalyesi', xp: 0, xpNext: 12 });
    const comp = troop(5, { id: 'c', name: 'Yoldaş', isCompanion: true, xp: 0, xpNext: 8 });
    for(let i = 0; i < 40; i++) { Game.giveTroopXp(mid); Game.giveTroopXp(elite); Game.giveTroopXp(comp); }
    assert.strictEqual(mid.level, 10, 'a promotable troop levelled instead of waiting for its promotion');
    assert.ok(mid.xp >= mid.xpNext, 'a promotable troop never became ready to promote');
    assert.strictEqual(elite.level, 20, 'an elite troop still climbs past its tree step');
    assert.ok(comp.level > 5, 'a companion stopped levelling — its level backs the party skills');
    // In battle a troop is exactly its class: the same knight at any level fields the same unit.
    const w = H.world({ seed: 2 });
    const field = lvl => {
        w.state.player.party = [troop(lvl, { id: 'k', name: 'Svadya Şövalyesi' })];
        w.Battle.start('Çapulcular', 1);
        const u = w.Battle.units.find(x => x.id === 'k'); w.Battle.active = false;
        return [u.maxHp, u.attack, u.defense, u.speed].join('/');
    };
    assert.strictEqual(field(20), field(45), 'a higher level still adds stats in battle');
    const merc = w.Game.mercPool({ id: 'merc_test', faction: 'swadia' }).list[0];
    assert.strictEqual(merc.level, w.Game.tierLevel(merc.name), 'a mercenary\'s level is off its tree step');
    const save = { v: 2, state: { player: { party: [troop(35, { name: 'Svadya Şövalyesi' }), troop(35, { name: 'Yoldaş', isCompanion: true })], equipment: {} } },
                   locations: [{ id: 'x', garrison: [troop(41, { name: 'Svadya Şövalyesi' })] }] };
    Save.migrate(save);
    assert.deepStrictEqual([save.state.player.party[0].level, save.state.player.party[1].level, save.locations[0].garrison[0].level], [20, 35, 20],
        'an old save keeps its veterans above their tree step (or clamps a companion)');
});

test('foodStock: empty inventory is 0 days, never infinite', () => {
    const p = reset();
    p.party = [troop(10)];
    assert.strictEqual(Game.foodStock().days, 0);
});

test('promote: a cavalry upgrade needs a horse in the stable (#30)', () => {
    const p = reset();
    p.money = 9999;
    p.party = [Object.assign(troop(10, { id: 't0' }), { name: 'X', xp: 99, xpNext: 4 })];
    p.inventory = [];
    Game.promoteTroop('X', 'Svadya Şövalyesi', 100);
    assert.strictEqual(p.party[0].name, 'X', 'no horse -> promotion blocked');
    p.inventory = [{ id: 'horse', type: 'horse', qty: 1 }];
    Game.promoteTroop('X', 'Svadya Şövalyesi', 100);
    assert.strictEqual(p.party[0].name, 'Svadya Şövalyesi', 'with a horse -> promoted');
    assert.strictEqual(p.inventory.length, 0, 'the mount was spent');
});

test('foodStock: every added ration joins consumption, quality and variety', () => {
    const p = reset();
    p.inventory = ['wheat','bread','meat','cheese','fish','fruit','butter','honey']
        .map(id => ({ ...g.ITEMS[id], qty: 1 }));
    const fs = Game.foodStock();
    assert.strictEqual(fs.total, 8);
    assert.strictEqual(fs.kinds, 8);
    assert.strictEqual(fs.low, 3);
    assert.strictEqual(fs.high, 5);
    assert.strictEqual(Game.takeFood(8), 8);
    assert.strictEqual(Game.foodStock().total, 0);
});

test('foodStock: expensive preserved food supplies multiple daily portions', () => {
    const p = reset();
    p.inventory = [{ id:'bread', qty:10 }, { id:'honey', qty:10 }];
    const fs = Game.foodStock();
    assert.strictEqual(fs.total, 20, 'physical packs should remain visible as packs');
    assert.strictEqual(fs.nutrition, 40, 'honey should provide three portions per pack');
    assert.ok(fs.days >= 20, 'expensive preserved food did not last substantially longer');
});

test('equipment: seven slots stack defense and shield no longer replaces armour', () => {
    const p = reset();
    p.stats.eff.vit = 10;
    p.equipment = {
        weapon: null, horse: null,
        shield: { id:'shield', defense:10 }, armor: { id:'mail', defense:25 },
        helmet: { id:'nasal', defense:8 }, gloves: { id:'gauntlets', defense:6 },
        boots: { id:'greaves', defense:7 }
    };
    Game.updateStatsFromEquip();
    assert.strictEqual(p.stats.maxHp, 106);
    assert.ok(Battle.playerHasShield());
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
test('skipFrame: lite mode no longer implies 30 fps; the fps setting does (#80 -> 1.31.5)', () => {
    assert.strictEqual(gateFps(60, 2, { lite: true }), 60);              // lite drawing starts at 60
    assert.strictEqual(gateFps(60, 2, { fps: 30 }), 30);
    assert.strictEqual(gateFps(120, 2, { fps: 30 }), 30);
});
test('skipFrame: the fps setting pins the target either way (1.31.4)', () => {
    assert.strictEqual(gateFps(60, 2, { lite: true, fps: 60 }), 60);     // lite drawing, 60 fps
    assert.strictEqual(gateFps(120, 2, { lite: true, fps: 60 }), 60);
    assert.strictEqual(gateFps(60, 2, { lite: false, fps: 30 }), 30);
    assert.strictEqual(gateFps(120, 2, { lite: false, fps: 'auto' }), 60);
});
test('skipFrame: one bad sample doesn\'t lock the gate', () => {
    // This test comes from an actual phone report: iOS delivers two rAFs ~2 ms
    // apart while scrolling the page. Since the predictor is "the smallest of
    // all time", the value gets PERMANENTLY stuck at 2 ms, the divisor becomes
    // 1000/30/2 = 16, and the game ran at 3.79 fps on a 60 Hz screen — unplayable.
    const { Game } = H.load({ seed: 1 });
    Object.assign(Game.OPTS, { fps: 30 });                // 30 fps target
    let t = 0;
    for(let i = 0; i < 120; i++) { t += (i === 100 || i === 101) ? 2 : 1000 / 60; Game.skipFrame(t); }
    let t0 = t, drawn = 0;
    for(let i = 0; i < 600; i++) { t += 1000 / 60; if(!Game.skipFrame(t)) drawn++; }
    const fps = drawn / ((t - t0) / 1000);
    assert.ok(fps > 25, `${fps.toFixed(2)} fps after the bad sample — gate got stuck`);
});
// Adaptive rung (1.31.5): feed the gate synthetic rAF timestamps with the map on screen.
function perfRun(G, hz, seconds, lateEvery = 0, t0 = 1000) {
    G._sandbox.document.getElementById('map-view').classList.add('active');
    G._sandbox.document.getElementById('modal-overlay').classList.add('hidden');
    let t = t0;
    for(let i = 1; i <= hz * seconds; i++) { t += (lateEvery && i % lateEvery === 0) ? 2000 / hz : 1000 / hz; G.Game.skipFrame(t); }
    return t;
}
function perfGame(opts) {
    const G = H.load({ seed: 1 });
    if(opts) Object.assign(G.Game.OPTS, opts);
    G.Game.perf = null; G.Game._lite = undefined;
    return G;
}
test('adaptive fps: a steady 60 Hz device stays on full drawing at 60', () => {
    const G = perfGame();
    perfRun(G, 60, 40);
    assert.strictEqual(G.Game.perfRung(), 'full@60');
    assert.strictEqual(G.Game.targetFps(), 60);
});
test('adaptive fps: a stuttering device steps down full -> lite -> 30, one rung at a time', () => {
    const G = perfGame();
    let t = perfRun(G, 60, 11, 4);                        // every 4th frame late = 25% > 10%
    assert.strictEqual(G.Game.perfRung(), 'lite@60', 'two bad 5 s windows -> lite drawing first');
    assert.strictEqual(G.Game.lite(), true);
    perfRun(G, 60, 14, 4, t);
    assert.strictEqual(G.Game.perfRung(), 'lite@30');
    assert.strictEqual(G.Game.targetFps(), 30);
    const saved = JSON.parse(G._sandbox.localStorage.getItem('webband_perf'));
    assert.strictEqual(saved.v, G.VERSION.no);
    assert.strictEqual(saved.log.length, 2, 'each step is logged for the debug report');
});
test('adaptive fps: an occasional hitch is not a stutter', () => {
    const G = perfGame();
    perfRun(G, 60, 40, 20);                               // 5% late
    assert.strictEqual(G.Game.perfRung(), 'full@60');
});
test('adaptive fps: iOS Low Power Mode (steady 30 Hz rAF) is not mistaken for a struggle', () => {
    const G = perfGame();
    perfRun(G, 30, 40);
    assert.strictEqual(G.Game.perfRung(), 'full@60');
});
test('adaptive fps: a hand-picked setting is never overridden', () => {
    const G = perfGame({ lite: false, fps: 60 });
    perfRun(G, 60, 40, 3);
    assert.strictEqual(G.Game.lite(), false);
    assert.strictEqual(G.Game.targetFps(), 60);
});
test('adaptive fps: frames under a modal are no evidence', () => {
    const G = perfGame();
    G._sandbox.document.getElementById('map-view').classList.add('active');
    G._sandbox.document.getElementById('modal-overlay').classList.remove('hidden');
    let t = 1000;
    for(let i = 1; i <= 60 * 30; i++) { t += i % 3 ? 1000 / 60 : 2000 / 60; G.Game.skipFrame(t); }
    assert.strictEqual(G.Game.perfRung(), 'full@60');
});
test('adaptive fps: the learned rung survives a reload but is retried on a new version', () => {
    const G = perfGame();
    G._sandbox.localStorage.setItem('webband_perf', JSON.stringify({ v: G.VERSION.no, lite: true, fps30: true, log: [] }));
    G.Game.perf = null;
    assert.strictEqual(G.Game.perfRung(), 'lite@30');
    G._sandbox.localStorage.setItem('webband_perf', JSON.stringify({ v: '0.0.1', lite: true, fps30: true, log: [] }));
    G.Game.perf = null;
    assert.strictEqual(G.Game.perfRung(), 'full@60');
});
test('skipFrame: no frame is dropped when the gate is turned off in settings', () => {
    assert.strictEqual(gateFps(240, 2, { frameGate: false }), 240);
});

// A horse's +33 % hp buffer is spent first and stays on the field (bug hunt: a mounted win
// wrote the unspent buffer into hp, so the hero rode off at up to 1.33 × maxHp).
test('battle: the mount buffer is not carried off the field', () => {
    const w = H.world({ seed: 4 });
    const { Game, Battle, state, ITEMS } = w;
    const fight = (entry, dmg) => {
        state.player.equipment.horse = { ...ITEMS.horse, qty: 1 };
        state.player.stats.hp = entry;
        Battle.start('Çapulcular', 1);
        const p = Battle.units[0];
        p.hp -= dmg;
        Battle.units.forEach(u => { if(!u.isPlayerTeam) u.hp = 0; });
        Battle.endBattle(true); w.Game.closeModal();
        return state.player.stats.hp;
    };
    const max = state.player.stats.maxHp;
    assert.strictEqual(fight(max, 0), max, 'an untouched rider came back above his max hp');
    assert.strictEqual(fight(40, 5), 40, 'a hit the buffer absorbed still cost hp');
    assert.ok(fight(40, 30) < 40, 'a hit past the buffer cost nothing');
});

// The trade edge narrows the spread and never closes it (bug hunt: past edge 0.18 a sell beat
// the buy in the same market, and buy-then-sell printed money).
test('market: no buy-then-sell profit in one market, even at the full trade edge', () => {
    const w = H.world({ seed: 2 });
    const { Game, state, LOCATIONS, ITEMS } = w;
    const edge = w.Game.perkMod;
    Game.perkMod = k => k === 'tradeEdge' ? 40 : edge.call(Game, k);   // the 0.40 cap from perks alone
    try {
        for(const c of LOCATIONS.filter(l => l.type === 'city').slice(0, 4)) {
            Game.enterLocation(c); Game.openMarket(c);
            for(const id of Object.keys(ITEMS)) {
                if(Game.marketPrice(id) === null) continue;
                state.player.money = 1e6; state.player.inventory = [];
                Game.buyItem(id, 5);
                const got = state.player.inventory.find(i => i.id === id);
                if(!got) continue;
                Game.sellItem(id, got.qty);
                assert.ok(state.player.money <= 1e6, `${c.id} ${id}: +${state.player.money - 1e6} from a round trip`);
            }
            Game.closeModal();
        }
    } finally { Game.perkMod = edge; }
});

// The rules the game checks on itself every day (Debug.invariants): a fresh world keeps them,
// a broken one is caught, and the same break is logged once however often it's seen.
test('invariants: a fresh world is clean, a break is caught and logged once', () => {
    const w = H.world({ seed: 6 });
    const { Debug, state } = w;
    H.run(w, 3);
    const fresh = Debug.invariants();
    assert.strictEqual(fresh.length, 0, `a fresh world breaks a rule: ${fresh.join(' | ')}`);
    state.player.stats.hp = state.player.stats.maxHp + 40;
    state.player.party.push({ id: 'x', name: 'Swadian Militia', level: 1, xp: 0 });   // a translated name as a type
    const errs = Debug.errors.length;
    Debug.checkInvariants('test'); Debug.checkInvariants('test');
    const logged = Debug.errors.slice(errs).map(e => e.msg);
    assert.strictEqual(logged.length, 2, `expected two rules broken, logged: ${logged.join(' | ')}`);
    assert.ok(logged.some(m => /hp .* > maxHp/.test(m)) && logged.some(m => /unknown type: Swadian Militia/.test(m)));
});

// Every outcome a site can roll, run once (bug hunt: 'gear' called `this.itemIco`, and inside
// the outcome table `this` is the outcome, not Game — the crate crashed the modal, item and all).
test('sites: every outcome runs and returns its text', () => {
    const w = H.world({ seed: 5 });
    const s = { id: 'x', kind: 'ruin', x: w.state.player.x + 900, y: w.state.player.y, usedDay: null };
    for(const [key, o] of Object.entries(w.Game.SITE_OUTCOMES)) {
        if(o.when && !o.when(s)) continue;
        const r = o.run(s);
        assert.ok(r && typeof r.html === 'string' && r.html.length > 10, `${key} returned no text`);
        if(r.then) r.then();
        w.Game.closeModal();
    }
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
test('Save.migrate: a spouse saved under a translated name gets the raw one back (#133)', () => {
    const L = g.LADIES[0];
    const d = { v: 2, state: { player: { party: [{ id: 'spouse_' + L.id, name: 'Lady X (Spouse)', isSpouse: true }] }, meta: { v: 2 } } };
    Save.migrate(d);
    assert.strictEqual(d.state.player.party[0].name, L.name);
    assert.strictEqual(Game.troopLabel(d.state.player.party[0]), L.name + ' (Eş)');
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

// A pursuing lord's speed now shares the player's own party-size curve (#132) — a small
// regrouping band chases quickly, a big army chases heavily, on both sides of a chase alike.
test('speed: a pursuing lord slows by the same party-size curve the player uses', () => {
    assert.ok(Game.partySizeSpeedBonus(5) > Game.partySizeSpeedBonus(32),
        'a small party should be faster than a "flat lord"-sized one');
    assert.ok(Game.partySizeSpeedBonus(32) > Game.partySizeSpeedBonus(99),
        'a "flat lord"-sized party should be faster than a big king-sized one');
    assert.ok(Math.abs(Game.partySizeSpeedBonus(32) - (-0.12)) < 0.001, 'size 32 should sit at -12%');
    assert.ok(Math.abs(Game.partySizeSpeedBonus(99) - (-0.45)) < 0.001, 'size 99 should floor at -45%');
});

test('speed: a pursuing lord\'s party size actually changes how fast it closes the gap', () => {
    const g2 = H.world({ seed: 41 });
    const { Game: G, state: st } = g2;
    st.player.party = [];
    G.declareWar(G.playerFaction(), Object.keys(g2.FACTIONS).find(f => f !== 'player_kingdom'));
    const foeFaction = Object.keys(g2.FACTIONS).find(f => f !== 'player_kingdom' && G.atWar(G.playerFaction(), f));

    const closingDist = (size) => {
        const npc = G.createNPC('Test Lordu', 'lord', size, '#800', foeFaction);
        npc.lordId = 'test_lord';
        npc.x = st.player.x + 200; npc.y = st.player.y;
        npc.targetX = npc.x; npc.targetY = npc.y;
        st.npcParties = [npc];
        const before = G.dist(npc, st.player);
        G.updateNPCs(1);
        assert.strictEqual(npc.playerTargetId, 'player', 'the lord should have locked onto the player to begin with');
        return before - G.dist(npc, st.player);
    };
    const smallClosed = closingDist(5), bigClosed = closingDist(99);
    assert.ok(smallClosed > bigClosed,
        `a small pursuing lord (closed ${smallClosed.toFixed(1)}) should gain ground faster than a huge one (closed ${bigClosed.toFixed(1)})`);
});

// --- Foot crowd slow (#23) ---
test('speed: nearby foot NPCs stack a capped slowdown, riders ignored', () => {
    const save = state.npcParties;
    state.npcParties = [];
    const base = Game.getPlayerSpeed().value;
    const foot = (n) => Array.from({ length: n }, (_, i) =>
        ({ id: 'f' + i, band: 'bandit', x: state.player.x, y: state.player.y }));  // bandit icon:'foot'
    state.npcParties = foot(1);
    assert.ok(Math.abs(Game.getPlayerSpeed().value / base - 0.92) < 1e-6, 'one footman = -8%');
    state.npcParties = foot(20);
    assert.ok(Math.abs(Game.getPlayerSpeed().value / base - 0.5) < 1e-6, 'crowd floors at 0.5×');
    state.npcParties = [{ id: 'r', band: 'caravan', x: state.player.x, y: state.player.y }];  // cart icon, not foot
    assert.ok(Math.abs(Game.getPlayerSpeed().value / base - 1) < 1e-6, 'riders/carts do not crowd');
    state.npcParties = save;
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

test('modal: a choice pressed while dialogue is typing only finishes the text', () => {
    let prevented = 0, stopped = 0, completed = 0;
    const el = { textContent: '' };
    Game._type = { el, text: 'Bitmiş konuşma', timer: null, then: () => completed++ };
    const guarded = Game.finishTypedChoice({
        target: { closest: selector => selector === '#modal-body button' ? {} : null },
        preventDefault: () => prevented++,
        stopImmediatePropagation: () => stopped++
    });
    assert.ok(guarded, 'a moving dialogue allowed its choice to run');
    assert.strictEqual(prevented, 1, 'the choice click was not cancelled');
    assert.strictEqual(stopped, 1, 'the choice click reached its inline action');
    assert.strictEqual(el.textContent, 'Bitmiş konuşma', 'the first press did not finish the sentence');
    assert.strictEqual(completed, 1, 'the typewriter completion callback did not run');
});

test('battle: the real-time damage pace lengthens played fights', () => {
    const src = { id:'a', x:0, y:0, dmgType:'cut', isPlayerTeam:true };
    const tgt = { id:'b', x:1, y:0, hp:100, defense:0, isPlayerTeam:false, hitFlash:0 };
    Battle.bloodStains = []; Battle.sparks = []; Battle.floatingTexts = [];
    const roll = Battle.hitRoll; Battle.hitRoll = () => 1;     // the pace alone, not the hit's spread
    Battle.dealMelee(src, tgt, 20);
    Battle.hitRoll = roll;
    assert.strictEqual(tgt.hp, 85, '20 raw damage was not paced to 15');
});
// 2.8.0: a blow lands within ±HIT_SPREAD of its mean, so a weak man's hits vary instead of all
// reading the same small number — and never below the afterArmor floor
test('battle: a hit varies within its spread around the paced mean', () => {
    const src = { id:'a', x:0, y:0, dmgType:'cut', isPlayerTeam:true }, seen = new Set();
    for(let i = 0; i < 200; i++) {
        const tgt = { id:'b', x:1, y:0, hp:100, defense:0, isPlayerTeam:false, hitFlash:0 };
        Battle.bloodStains = []; Battle.sparks = []; Battle.floatingTexts = [];
        Battle.dealMelee(src, tgt, 20);
        seen.add(100 - tgt.hp);
    }
    const lo = Math.min(...seen), hi = Math.max(...seen), mean = 20 * Battle.DAMAGE_PACE, k = Battle.HIT_SPREAD;
    assert.ok(lo >= Math.round(mean * (1 - k)) && hi <= Math.round(mean * (1 + k)), `hits ${lo}–${hi} outside ±${k * 100} % of ${mean}`);
    assert.ok(seen.size >= 4, `only ${[...seen]} — the spread isn't rolled`);
});

test('courtship: a lady only accepts one compliment every three days', () => {
    const id = 'isolla';
    state.time.day = 20; state.affection[id] = 50; state.complimentDay = {};
    const liked = 'glory';   // Isolla is ambitious: glory is her explicit liked subject
    g.Nobles.compliment(id, liked);
    const once = state.affection[id];
    const result = g._sandbox.document.getElementById('modal-body').innerHTML;
    assert.ok(result.includes('Çok sevdi') && result.includes('50 → 55'),
        'the compliment result did not show whether it landed or the affection change');
    g.Nobles.compliment(id, liked);
    assert.strictEqual(state.affection[id], once, 'a second compliment landed on the same day');
    state.time.day += 3;
    g.Nobles.compliment(id, liked);
    assert.notStrictEqual(state.affection[id], once, 'the compliment did not reopen after three days');
});

test('relations: a gift result stays visible with the reaction and before/after value', () => {
    const id = g.LORDS.find(l => l.personality === 'martial').id;
    state.time.day = 30; state.giftDay = {}; state.relations[id] = 10;
    state.player.inventory = [{ id:'sword', name:'Kılıç', type:'weapon', icon:'⚔️', qty:1 }];
    g.Nobles.giveGift(id, 0);
    const result = g._sandbox.document.getElementById('modal-body').innerHTML;
    assert.ok(result.includes('Çok sevdi') && result.includes('10 → 18'),
        'the gift result was overwritten before its reaction could be read');
    assert.ok(result.includes('Nobles.talk'), 'the result has no explicit continue button');
});

test('courtship: a poem result stays visible with a clear affection reaction', () => {
    const id = 'isolla';
    state.affection[id] = 20; state.poemsRead = {};
    g.Nobles.recitePoem(id, 'poem_butter');
    const result = g._sandbox.document.getElementById('modal-body').innerHTML;
    assert.ok(result.includes('Çok sevdi') && result.includes('20 → 32'),
        'the poem reaction was overwritten before its affection result could be read');
    assert.ok(result.includes('Nobles.courtMenu'), 'the poem result has no explicit continue button');
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

test('market: a tap that lands after the window is gone buys nothing (#49)', () => {
    // iOS ghost click / a second tap after closeModal fired buyItem with the market DOM already
    // destroyed: refreshMarket threw on a null list, and the money was gone either way.
    const p = reset();
    p.money = 5000;
    const open = Game.marketOpen;
    Game.marketOpen = () => false;
    try {
        Game._marketLoc = null;
        Game.buyItem('wheat', 5);
        assert.strictEqual(p.money, 5000, 'a closed market still took the money');
        assert.strictEqual(p.inventory.length, 0, 'a closed market still handed over goods');
        p.inventory = [{ ...g.ITEMS.wheat, qty: 5 }];
        Game.sellItem('wheat', 5);
        assert.strictEqual(p.money, 5000, 'a closed market still paid out a sale');
        assert.strictEqual(p.inventory[0].qty, 5, 'a closed market still took the goods');
    } finally { Game.marketOpen = open; reset(); }
});

test('modal: a window with nothing to press still has a way out (#57)', () => {
    // "No village lad will come out for you" had no button of its own and leaned on the ×
    // in the corner; on a phone that is easy to miss and the player is stuck staring at it.
    const body = g._sandbox.document.getElementById('modal-body');
    try {
        state.player.currentEncounterNpcId = null;
        Game.showModal('<p>Köyden sana tek bir gönüllü çıkmıyor.</p>');
        assert.ok(/closeModal/.test(body.innerHTML), 'a text-only window offered no way out');
        // An encounter window is deliberately inescapable — it must not grow one.
        state.player.currentEncounterNpcId = 'npc1';
        Game.showModal('<p>Yolunu kestiler.</p>');
        assert.ok(!/closeModal/.test(body.innerHTML), 'an encounter window grew an escape hatch');
    } finally {
        state.player.currentEncounterNpcId = null;
        Game.closeModal();
    }
});

test('camp events: nobody looks at anybody when you ride alone (#56)', () => {
    // "The purse was lighter in the morning. Nobody saw a thing, everyone is looking at each
    // other." — with a party of one there is nobody to look at, and nobody to suspect.
    const ctx = extra => Object.assign({ party: 0, cap: 30, near: null, food: 20, morale: 60,
                                         money: 5000, honor: 0, night: false, day: 5 }, extra);
    const thief = Game.DAY_EVENTS.find(e => e.id === 'thief');
    assert.ok(thief, 'the thief event is gone');
    state.player.money = 5000;
    assert.ok(!thief.when(ctx({ party: 0 })), 'a lone rider was robbed by his own men');
    assert.ok(!thief.when(ctx({ party: 1 })), 'a rider with one man was robbed by a whole camp');
    assert.ok(thief.when(ctx({ party: 2 })), 'a real camp can no longer be robbed');
    // The general rule behind it: a line that speaks of the men as a group needs a group.
    Game.DAY_EVENTS.filter(e => /Askerlerden|herkes birbirine/.test(String(e.run)))
        .forEach(e => assert.ok(!e.when(ctx({ party: 1 })),
            `day event "${e.id}" speaks of the men as a group but fires for a lone rider`));
    reset();
});

// Battle.start sets up the real arena (canvas, settlement) — these need `world`.
const gw = H.world({ seed: 1 });

test('tournament: the field is no longer a row of boys, and the book is capped (#53)', () => {
    const p = gw.state.player;
    const lv = p.stats.level;
    p.stats.level = 10;
    try {
        const loc = gw.LOCATIONS.find(l => l.type === 'city');
        const field = gw.Game.tourneyField(loc);
        assert.strictEqual(field.length, 8, 'the bracket is not eight fighters');
        const rivals = field.filter(f => !f.you);
        assert.ok(Math.min(...rivals.map(f => f.lv)) >= 9, 'the bracket still opens with a free round');
        assert.ok(Math.max(...rivals.map(f => f.lv)) >= 16, 'no champion in the bracket stands above the player');
        // The same field seen by a level-1 player: the odds used to reach ×12 on a 1000 denar bet.
        gw.state.tourney = { rounds: [field] };
        p.stats.level = 1;
        assert.ok(gw.Game.tourneyOdds()[3] <= 6, 'champion odds still pay more than ×6');
    } finally { p.stats.level = lv; gw.state.tourney = null; }
});

test('bandits do not scale with the calendar (#99)', () => {
    // Two years apart, the same band has to be the same band. It used to gain a level every
    // 30 days while an un-upgraded recruit gained nothing, and 25 peasants lost to 14 bandits.
    const banditAt = day => {
        gw.state.time.day = day;
        gw.state.player.party = [{ id: 'p1', name: 'Svadya Köylüsü', level: 1 }];
        gw.Battle.start('Çapulcular', 8);
        const e = gw.Battle.units.filter(u => !u.isPlayerTeam);
        gw.Battle.active = false;
        return { hp: Math.max(...e.map(u => u.hp)), lvl: Math.max(...e.map(u => u.level)) };
    };
    const early = banditAt(1), late = banditAt(730);
    assert.strictEqual(late.lvl, early.lvl, 'a looter on day 730 is the looter of day 1');
    assert.strictEqual(late.hp, early.hp, 'and carries the same HP: ' + early.hp + ' vs ' + late.hp);
    gw.state.time.day = 1;
});

// --- Start screen (1.32.1) ---
test('start: no name, no game — an empty or blank name opens nothing', () => {
    const g = H.load({ seed: 1 }), G = g.Game, doc = g._sandbox.document;
    const input = doc.getElementById('char-name'), err = doc.getElementById('char-name-err');
    let opened = 0;
    G.renderCreation = () => { opened++; };
    err.hidden = true;
    for(const v of ['', '   ']) {
        input.value = v;
        assert.strictEqual(G.startGame(), false, `started with ${JSON.stringify(v)}`);
        assert.strictEqual(err.hidden, false, 'the note says why');
    }
    assert.strictEqual(opened, 0);
    input.value = '  Deneme ';
    G.startGame();
    assert.strictEqual(opened, 1);
    assert.strictEqual(g.state.player.name, 'Deneme', 'trimmed');
    assert.strictEqual(err.hidden, true);
});

// --- Backing a lord in a map clash (#32 report) ---
// A lord at peace with you and a bandit band, side by side next to your party: the clash the
// map offers to join. Each test builds its own world — they end in captivity.
function assistSetup() {
    const w = H.world({ seed: 1 }), G = w.Game, s = w.state;
    const ally = s.npcParties.find(n => n.lordId && n.size > 0 && !G.isHostile(n) && !G.atWar(G.playerFaction(), n.faction));
    const foe = s.npcParties.find(n => n.type === 'bandit' && n.size > 0 && !(w.BAND_KINDS[n.band] || {}).beast);
    foe.size = 12;
    foe.x = ally.x + 100; foe.y = ally.y;
    Object.assign(s.player, { x: ally.x + 40, y: ally.y + 60, status: 'idle', targetLocation: null });
    s.player.party = [1, 2, 3].map(i => ({ id: 'as' + i, name: 'Svadya Köylüsü', level: 1 }));
    // As on the live map, the lord has already locked onto the band by the time you arrive
    ally.bandScanCd = 0;
    G.updateNPCs(G.npcWorldDelta(0.05));
    assert.strictEqual(ally.bandTargetId, foe.id, 'setup: the lord is on the band before you join');
    return { w, G, s, ally, foe };
}
test('assist: the map offers the clash with the lord as ally and the band as foe', () => {
    const { G, ally, foe } = assistSetup();
    const clash = G.clashContext(foe);
    assert.ok(clash, 'no clash offered');
    assert.strictEqual(clash.ally, ally);
    assert.strictEqual(clash.foe, foe);
});
test('assist: the lord you back fights beside you, not just your own party', () => {
    const { w, G, s, ally, foe } = assistSetup();
    G.assistFight(ally.lordId, foe.id);
    const own = s.player.party.length + 1;
    const mine = w.Battle.units.filter(u => u.isPlayerTeam).length;
    w.Battle.active = false;
    assert.ok(mine > own,
        `only your own ${own} are on your side (${mine} player-team units) — ${ally.name}'s ${ally.size} men never join the fight`);
});
slow('assist: after losing, the lord you backed does not march alongside your captor', () => {
    const { w, G, s, ally, foe } = assistSetup();
    G.assistFight(ally.lordId, foe.id);
    w.Battle.active = false;
    w.Battle.endBattle(false);
    assert.strictEqual(s.player.status, 'prisoner');
    assert.strictEqual(s.player.prisoner.npcId, foe.id, 'captured by the band you fought');
    // A few in-game hours of the world moving on (the same step update() gives the NPCs)
    let locked = 0;
    for(let i = 0; i < 600; i++) {
        G.updateNPCs(G.npcWorldDelta(0.1));
        // a chase is exact: the target IS the band's position, or bandTargetId names it
        if(ally.bandTargetId === foe.id || Math.hypot(ally.targetX - foe.x, ally.targetY - foe.y) < 1) locked++;
    }
    assert.strictEqual(locked, 0, `${ally.name} kept marching on your captor for ${locked} of 600 ticks`);
});
test('assist: the lord pays for his own dead, win or lose', () => {
    const { w, G, ally, foe } = assistSetup();
    const before = ally.size;
    G.assistFight(ally.lordId, foe.id);
    const his = w.Battle.units.filter(u => u.allyOf === ally.id);
    his.slice(0, 4).forEach(u => { u.hp = 0; });
    w.Battle.active = false;
    w.Battle.endBattle(true);
    assert.strictEqual(ally.size, before - 4, `${before} -> ${ally.size}, 4 of his men fell`);
});
test('assist: surrendering an assisted fight earns no gratitude later', () => {
    const { w, G, s, ally, foe } = assistSetup();
    G.assistFight(ally.lordId, foe.id);
    assert.ok(s.player.assistAlly, 'the assist is on record while the fight runs');
    w.Battle.surrender();
    assert.strictEqual(s.player.assistAlly, null, 'a surrendered assist would thank you after the next unrelated win');
});
test('assist: no lord hunts, or fights, the band that holds you prisoner', () => {
    const { w, G, s, ally, foe } = assistSetup();
    G.beginCaptivity(foe, 5);
    s.npcParties.filter(n => n.lordId && n !== ally).forEach(n => { n.x += 5000; });   // one lord in range
    ally.size = 200; foe.size = 10;                         // a lord that would crush the band
    for(let i = 0; i < 20; i++) G.updateNPCs(G.npcWorldDelta(0.1));
    assert.notStrictEqual(ally.bandTargetId, foe.id, 'the lord picked your captor as its patrol target');
    G.lordBanditTick();
    assert.strictEqual(foe.size, 10, 'the daily lord-vs-band clash was fought with you in the band\'s chains');
    assert.strictEqual(s.player.prisoner.npcId, foe.id);
});

// --- Animation core + battle motion (1.32.0) ---
test('Anim: every curve starts at 0 and ends at 1; outBack overshoots, bump returns', () => {
    const Anim = gw.Anim;
    for(const [name, f] of Object.entries(Anim.ease)) {
        assert.ok(Math.abs(f(0)) < 1e-9, `${name}(0) = ${f(0)}`);
        if(name !== 'bump') assert.ok(Math.abs(f(1) - 1) < 1e-9, `${name}(1) = ${f(1)}`);
    }
    assert.ok(Math.max(...[0.6, 0.7, 0.8, 0.9].map(Anim.ease.outBack)) > 1.05, 'outBack pops past 1');
    assert.ok(Math.abs(Anim.ease.bump(0.5) - 1) < 1e-9 && Math.abs(Anim.ease.bump(1)) < 1e-9, 'bump peaks mid-way and returns');
    assert.strictEqual(Anim.k(-1, 1), 0); assert.strictEqual(Anim.k(5, 1), 1);
    assert.strictEqual(Anim.decay(0, 0.3), 1); assert.strictEqual(Anim.decay(1, 0.3), 0);
});
test('Anim: damp closes half the gap per half-life, whatever the frame rate', () => {
    const Anim = gw.Anim;
    let a = 0, b = 0;
    for(let i = 0; i < 30; i++) a = Anim.damp(a, 100, 1 / 60, 0.25);    // 0.5 s at 60 fps
    for(let i = 0; i < 15; i++) b = Anim.damp(b, 100, 1 / 30, 0.25);    // 0.5 s at 30 fps
    assert.ok(Math.abs(a - 75) < 1e-6 && Math.abs(b - 75) < 1e-6, `${a} / ${b} — two half-lives should leave 25 to go`);
});
test('Anim: a tween lands exactly, calls done once, and a chained tween starts cleanly', () => {
    const Anim = gw.Anim;
    const o = { x: 0, y: 5 }; let done = 0;
    Anim.to(o, { x: 10 }, 0.3, 'outCubic', () => { done++; Anim.to(o, { y: 0 }, 0.2); });
    for(let i = 0; i < 20; i++) Anim.tick(1 / 60);
    assert.strictEqual(o.x, 10); assert.strictEqual(done, 1);
    assert.ok(o.y > 0 && o.y < 5, 'the chained tween is under way: ' + o.y);
    for(let i = 0; i < 20; i++) Anim.tick(1 / 60);
    assert.strictEqual(o.y, 0);
    Anim.to(o, { x: 50 }, 1); Anim.to(o, { x: -50 }, 1);                // latest wins
    for(let i = 0; i < 70; i++) Anim.tick(1 / 60);
    assert.strictEqual(o.x, -50); assert.strictEqual(Anim._tw.length, 0);
});
test('top bar: a number counts to its new value and lands exactly; the first write is immediate', () => {
    const G = gw.Game, el = gw._sandbox.document.getElementById('ui-test-count');
    G._counters['ui-test-count'] = undefined;
    G.countTo('ui-test-count', 100);
    assert.strictEqual(String(el.innerText), '100', 'first write sets the number');
    G.countTo('ui-test-count', 600);
    gw.Anim.tick(0.15);
    const mid = Number(el.innerText);
    assert.ok(mid > 100 && mid < 600, 'mid-count: ' + mid);
    for(let i = 0; i < 40; i++) gw.Anim.tick(1 / 60);
    assert.strictEqual(Number(el.innerText), 600);
});
test('map icons: facing follows the direction of travel and the walk eases in', () => {
    const G = gw.Game;
    G._icons.delete('t1');
    let m;
    for(let i = 0; i < 20; i++) m = G.iconMotion('t1', 100 + i * 3, true);
    assert.ok(m.face > 0.9, 'walking east faces east: ' + m.face);
    const t0 = m.last;
    for(let i = 0; i < 30; i++) { m.last = t0 - 16 * (30 - i); m = G.iconMotion('t1', 160 - i * 3, true); }
    assert.ok(m.face < 0, 'turned west: ' + m.face);
});
test('battle motion: swings, hits and falls start their clocks; the fallen are drawn while they fall', () => {
    gw.state.player.party = [{ id: 'p1', name: 'Svadya Köylüsü', level: 1 }];
    gw.Battle.start('Çapulcular', 4);
    const B = gw.Battle, me = B.units.find(u => u.isPlayerTeam && u.id !== 'player'), foe = B.units.find(u => !u.isPlayerTeam);
    foe.x = me.x + 20; foe.y = me.y; foe.defense = 0;
    B.dealMelee(me, foe, 5);
    assert.strictEqual(me.atkT, 0, 'the attacker lunges');
    me.atkCd = 99;                                                      // no second swing to reset the clock
    assert.ok(foe.hitT === 0 || foe.blockFlash > 0, 'the target reacts (or blocked)');
    B.update(0.1);
    assert.ok(Math.abs(me.atkT - 0.1) < 1e-9, 'clocks tick in update: ' + me.atkT);
    B.dealMelee(me, foe, 1e6);
    assert.ok(foe.hp <= 0 && foe.deadT !== undefined, 'the kill starts the fall');
    B.render();                                                          // draws the falling unit without throwing
    let drawn = 0;
    const orig = B.drawUnit; B.drawUnit = function(ctx, u, now) { if(u === foe) drawn++; return orig.call(this, ctx, u, now); };
    B.render();
    for(let i = 0; i < 10; i++) B.update(0.1);
    B.render();
    B.drawUnit = orig;
    assert.strictEqual(drawn, 1, 'drawn during the fall, gone after DIE_T');
    B.active = false;
});

// --- Battle renderer seam (1.33.0) ---
// Two renderers, one setting: 'auto'/'pixi' draw through PixiJS when a WebGL context exists,
// 'canvas' — and every case without WebGL — through the Canvas2D code. The harness has no
// WebGL and never loads battle-gl.js, so here it is always Canvas2D until a test fakes both in.
test('renderer: auto/pixi/canvas resolve through one gate, and fall back without WebGL', () => {
    const ctx = gw._ctx, vm = require('vm'), B = gw.Battle, G = gw.Game, S = gw.state;
    const run = src => vm.runInContext(src, ctx);
    const kinds = () => ['auto', 'pixi', 'canvas'].map(v => { G.setOpt('renderer', v); return B.rendererKind(); });
    assert.strictEqual(G.OPTS.renderer, 'auto', 'the default is auto');
    assert.strictEqual(G.webgl().ok, false, 'the harness has no WebGL');
    assert.deepStrictEqual(kinds(), ['canvas', 'canvas', 'canvas'], 'no Pixi loaded: Canvas2D whatever the setting');
    let inits = 0;
    run('globalThis.PIXI = {}; globalThis.BattleGL = { name: "pixi", ready: false, app: null, init() { globalThis.__glInits = (globalThis.__glInits || 0) + 1; return Promise.resolve(); }, destroy() {} };');
    const hadGl = G._webgl;
    try {
        G._webgl = { ok: false, soft: false, gpu: '' };
        assert.deepStrictEqual(kinds(), ['canvas', 'canvas', 'canvas'], 'Pixi loaded but no WebGL context: Canvas2D');
        G._webgl = { ok: true, soft: true, gpu: 'SwiftShader' };
        assert.deepStrictEqual(kinds(), ['canvas', 'pixi', 'canvas'], 'software GL: auto keeps Canvas2D, pixi forces WebGL');
        G._webgl = { ok: true, soft: false, gpu: 'Apple GPU' };
        assert.deepStrictEqual(kinds(), ['pixi', 'pixi', 'canvas'], 'hardware WebGL: auto and pixi draw with Pixi, canvas stays Canvas2D');
        inits = run('globalThis.__glInits || 0');
        assert.ok(inits > 0, 'choosing pixi starts the WebGL renderer ahead of the battle');
        // Pixi is still initialising (or failed): the battle draws with Canvas2D meanwhile
        G.setOpt('renderer', 'pixi');
        S.player.party = [];
        B.start('Çapulcular', 3);
        assert.strictEqual(B.gfx.name, 'canvas', 'not ready yet: Canvas2D carries the first frames');
        B.render();
        B._glBroken = true;
        assert.strictEqual(B.rendererKind(), 'canvas', 'a failed or lost WebGL context drops to Canvas2D for the session');
        B._glBroken = false;
        // ?renderer= overrides the saved setting for the session
        gw._sandbox.location = { search: '?renderer=canvas' };
        assert.strictEqual(B.rendererKind(), 'canvas', 'URL override');
        gw._sandbox.location = { search: '?renderer=pixi' };
        G.setOpt('renderer', 'canvas');
        assert.strictEqual(B.rendererKind(), 'pixi', 'URL override wins over the setting');
        B.active = false;
    } finally {
        delete gw._sandbox.location;
        G._webgl = hadGl;
        run('delete globalThis.PIXI; delete globalThis.BattleGL; delete globalThis.__glInits;');
        G.setOpt('renderer', 'auto');
    }
});
test('renderer: the settings row writes through Game.setOpt and reads through Game.opt', () => {
    const G = gw.Game, S = gw.state;
    let html = '';
    const orig = G.showModal;
    G.showModal = h => { html = h; };
    try {
        G.showSettings();
        for(const v of ['auto', 'pixi', 'canvas']) assert.ok(html.includes(`Game.setOpt('renderer', '${v}')`), 'a button for ' + v);
        G.setOpt('renderer', 'canvas');
        assert.strictEqual(G.opt('renderer'), 'canvas');
        assert.strictEqual(S.settings.renderer, 'canvas', 'a deviation lands in state.settings');
        G.setOpt('renderer', 'auto');
        assert.strictEqual(G.opt('renderer'), 'auto');
    } finally { G.showModal = orig; }
});
// --- Map renderer seam (1.34.0) ---
// The map follows the same setting as the battle; MapGL (map-gl.js) is never loaded by the
// harness, so here the map always draws with Canvas2D until a test fakes Pixi in.
test('map renderer: the battle\'s setting and gate decide the map too', () => {
    const ctx = gw._ctx, vm = require('vm'), G = gw.Game;
    const run = src => vm.runInContext(src, ctx);
    const kinds = () => ['auto', 'pixi', 'canvas'].map(v => { G.setOpt('renderer', v); return G.mapRendererKind(); });
    assert.deepStrictEqual(kinds(), ['canvas', 'canvas', 'canvas'], 'no Pixi loaded: Canvas2D whatever the setting');
    assert.strictEqual(G.liveMapGfx(), null, 'Canvas2D draws');
    run('globalThis.PIXI = {}; globalThis.MapGL = { ready: false, app: null, init() { globalThis.__mapInits = (globalThis.__mapInits || 0) + 1; return Promise.resolve(); }, destroy() {} };');
    const hadGl = G._webgl;
    try {
        G._webgl = { ok: true, soft: true, gpu: 'SwiftShader' };
        assert.deepStrictEqual(kinds(), ['canvas', 'pixi', 'canvas'], 'software GL: auto keeps Canvas2D, pixi forces WebGL');
        G._webgl = { ok: true, soft: false, gpu: 'Apple GPU' };
        assert.deepStrictEqual(kinds(), ['pixi', 'pixi', 'canvas'], 'hardware WebGL: auto and pixi draw the map with Pixi');
        assert.ok(run('globalThis.__mapInits || 0') > 0, 'choosing pixi starts the map renderer');
        G.setOpt('renderer', 'pixi');
        assert.strictEqual(G.liveMapGfx(), null, 'still initialising: Canvas2D carries the frames meanwhile');
        run('MapGL.ready = true;');
        assert.strictEqual(G.liveMapGfx(), run('MapGL'), 'ready: Pixi draws');
        const view = gw._sandbox.document.getElementById('map-view');
        assert.ok(view.classList.contains('gl'), '#map-canvas turns see-through over #map-gl, but stays the input surface');
        G._mapGlBroken = true;
        assert.strictEqual(G.liveMapGfx(), null, 'a failed or lost context drops the map to Canvas2D for the session');
        assert.ok(!view.classList.contains('gl'), 'and #map-canvas shows again');
        G._mapGlBroken = false;
        gw._sandbox.location = { search: '?renderer=canvas' };
        assert.strictEqual(G.mapRendererKind(), 'canvas', '?renderer= overrides the setting for the map too');
        const info = G.mapGfxInfo();
        assert.ok(['pixi', 'canvas'].includes(info.active) && 'cpuMs' in info, 'the debug report says which one draws');
    } finally {
        delete gw._sandbox.location;
        G._webgl = hadGl; G._mapGlBroken = false;
        run('delete globalThis.PIXI; delete globalThis.MapGL; delete globalThis.__mapInits;');
        G.setOpt('renderer', 'auto');
        G.showMapSurface('canvas');
    }
});

// GLCtx is the Canvas2D facade the WebGL map runs the shared vector code through (coast,
// rivers, roads, figures, route). It needs no GPU: here it records into a fake Pixi context.
test('map renderer: GLCtx turns Canvas2D path calls into Pixi geometry', () => {
    const vm = require('vm'), fs = require('fs'), path = require('path');
    const hex = css => {
        if(css[0] === '#') return [parseInt(css.length === 4 ? css.replace(/(\w)/g, '$1$1').slice(1) : css.slice(1, 7), 16), 1];
        const p = /rgba?\(([^)]+)\)/.exec(css)[1].split(',').map(Number);
        return [(p[0] << 16) | (p[1] << 8) | p[2], p[3] === undefined ? 1 : p[3]];
    };
    const box = { BattleGL: { hex }, Math };
    const { GLCtx } = vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'map-gl.js'), 'utf8') + '\n;({ GLCtx })', box);
    const rec = () => {
        const log = [], polys = [];
        let cur = null;
        const gc = {
            beginPath() { polys.length = 0; cur = null; },
            moveTo(x, y) { cur = [x, y]; polys.push(cur); },
            lineTo(x, y) { cur.push(x, y); },
            closePath() { cur.closed = true; },
            fill(s) { log.push({ op: 'fill', s, polys: polys.map(p => p.slice()) }); },
            stroke(s) { log.push({ op: 'stroke', s, polys: polys.map(p => p.slice()) }); }
        };
        return { gc, log };
    };

    // Transforms apply per call, like Canvas2D; widths and dashes scale with the transform
    let { gc, log } = rec(), c = new GLCtx(gc);
    c.translate(100, 50); c.scale(2, 2);
    c.strokeStyle = 'rgba(255,0,0,0.5)'; c.lineWidth = 3; c.globalAlpha = 0.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(10, 0); c.stroke();
    assert.deepStrictEqual(log[0].polys[0], [100, 50, 120, 50], 'points land where the transform puts them');
    assert.strictEqual(log[0].s.width, 6, 'lineWidth scales with the transform');
    assert.strictEqual(log[0].s.color, 0xff0000);
    assert.strictEqual(log[0].s.alpha, 0.25, 'colour alpha x globalAlpha');
    assert.strictEqual(log[0].s.cap, 'round');

    // A full arc is a closed ring of points on the radius
    ({ gc, log } = rec()); c = new GLCtx(gc);
    c.fillStyle = '#0f0'; c.beginPath(); c.arc(5, 5, 10, 0, Math.PI * 2); c.fill();
    const ring = log[0].polys[0];
    assert.ok(ring.length / 2 >= 32, 'round enough to hold at 3x zoom');
    for(let i = 0; i < ring.length; i += 2) assert.ok(Math.abs(Math.hypot(ring[i] - 5, ring[i + 1] - 5) - 10) < 1e-9);
    assert.strictEqual(log[0].s.color, 0x00ff00);

    // Dashes: Canvas2D's pattern, restarting per subpath and shifted by the offset
    const pieces = GLCtx.dashed([{ pts: [0, 0, 100, 0], closed: false }], [10, 5], 0);
    assert.strictEqual(pieces.length, 7, '0-10, 15-25 ... 90-100');
    assert.deepStrictEqual([...pieces[1].pts], [15, 0, 25, 0]);
    const shifted = GLCtx.dashed([{ pts: [0, 0, 30, 0], closed: false }], [10, 5], 5);
    assert.deepStrictEqual([...shifted[0].pts], [0, 0, 5, 0], 'an offset starts mid-dash');
    const corner = GLCtx.dashed([{ pts: [0, 0, 6, 0, 6, 6], closed: false }], [10, 20], 0);
    assert.deepStrictEqual([...corner[0].pts], [0, 0, 6, 0, 6, 4], 'a dash runs on around a vertex');

    // A road is a run of segments: joined into one polyline so a translucent joint isn't painted twice
    ({ gc, log } = rec()); c = new GLCtx(gc);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(10, 0); c.moveTo(10, 0); c.lineTo(20, 5); c.moveTo(50, 50); c.lineTo(60, 60); c.stroke();
    assert.strictEqual(log[0].polys.length, 2, 'the connected run is one piece, the separate one stays apart');
    assert.deepStrictEqual(log[0].polys[0], [0, 0, 10, 0, 20, 5]);

    // fillRect paints on its own and leaves the current path alone
    ({ gc, log } = rec()); c = new GLCtx(gc);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(5, 5);
    c.fillRect(0, 0, 2, 2);
    c.stroke();
    assert.strictEqual(log[0].op, 'fill');
    assert.deepStrictEqual(log[1].polys[0], [0, 0, 5, 5], 'the path survived the fillRect');

    // save/restore brings back transform and style
    c.save(); c.translate(7, 7); c.lineWidth = 9; c.restore();
    assert.deepStrictEqual([...c.m], [1, 0, 0, 1, 0, 0]); assert.strictEqual(c.lineWidth, 1);

    // The shared party figures run through it without a Canvas2D-only call
    for(const kind of ['foot', 'archer', 'rider', 'wolf', 'cart']) {
        ({ gc, log } = rec()); c = new GLCtx(gc);
        gw.Game.drawFigure(c, kind, '#c0392b', '#26262e');
        assert.ok(log.filter(l => l.op === 'fill').length >= 3, kind + ' figure draws its shapes');
        assert.ok(log.every(l => l.polys.every(p => p.every(Number.isFinite))), kind + ': no NaN points');
    }
    ({ gc, log } = rec()); c = new GLCtx(gc);
    gw.Game.drawFlag(c, -48, '#c0392b', 3);
    assert.deepStrictEqual(log.map(l => l.op), ['fill', 'stroke'], 'the pennant: fill, then its outline');
});

// The map is one piece of Canvas2D code (MapArt.render) drawn into either #map-canvas's context
// or PixCtx, the WebGL facade. Neither the harness nor the game loads MapArt in Node, so it is
// evaluated here inside a function scope (no lexical global leaks into later tests), and PixCtx
// runs over a fake Pixi that records what it would put on screen.
function fakePixi() {
    class Obj {
        constructor() { this.anchor = { set: (x, y) => { this.ax = x; this.ay = y; } }; this.blendMode = 'normal'; this.tint = 0xffffff; this.alpha = 1; }
        setFromMatrix(M) { this.M = [M.a, M.b, M.c, M.d, M.tx, M.ty]; }
    }
    class Sprite extends Obj {}
    class Graphics extends Obj {
        constructor() { super(); this.clear(); }
        clear() {
            const log = this.log = [], polys = [];
            let cur = null;
            this.context = {
                beginPath() { polys.length = 0; cur = null; },
                moveTo(x, y) { cur = [x, y]; polys.push(cur); },
                lineTo(x, y) { cur.push(x, y); },
                closePath() { cur.closed = true; },
                fill(st) { log.push({ op: 'fill', st, polys: polys.map(p => p.slice()) }); },
                stroke(st) { log.push({ op: 'stroke', st, polys: polys.map(p => p.slice()) }); }
            };
        }
    }
    class Matrix { set(a, b, c, d, tx, ty) { Object.assign(this, { a, b, c, d, tx, ty }); } }
    class Source { constructor(o) { Object.assign(this, o); } destroy() {} }
    class Texture {
        constructor(o) { this.source = o.source; this.frame = o.frame; this.width = o.frame ? o.frame.width : o.source.resource.width; this.height = o.frame ? o.frame.height : o.source.resource.height; }
        destroy() {}
    }
    Texture.WHITE = { width: 1, height: 1, white: true };
    Texture.EMPTY = { width: 1, height: 1, empty: true };
    class Rectangle { constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); } }
    return { Sprite, Graphics, Matrix, Texture, CanvasSource: Source, ImageSource: Source, Rectangle };
}
function loadMapGL() {
    const vm = require('vm'), fs = require('fs'), path = require('path');
    const hex = css => {
        if(css[0] === '#') return [parseInt(css.length === 4 ? css.replace(/(\w)/g, '$1$1').slice(1) : css.slice(1, 7), 16), 1];
        const p = /rgba?\(([^)]+)\)/.exec(css)[1].split(',').map(Number);
        return [(p[0] << 16) | (p[1] << 8) | p[2], p[3] === undefined ? 1 : p[3]];
    };
    const doc = gw._sandbox.document;
    const BattleGL = { hex, canvas: (w, h) => { const c = doc.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }, countCalls() {} };
    gw._sandbox.__pixi = fakePixi(); gw._sandbox.__bgl = BattleGL;
    const src = fs.readFileSync(path.join(__dirname, '..', 'map-gl.js'), 'utf8');
    return vm.runInContext(`(function (PIXI, BattleGL) {\n${src}\n;return { GLCtx, PixCtx, MapGL };\n})(__pixi, __bgl)`, gw._ctx);
}

test('map renderer: PixCtx puts images, rects and paths where Canvas2D would, in call order', () => {
    const { PixCtx, MapGL } = loadMapGL();
    MapGL.R = 2; MapGL.frame = 1;
    const fx = new PixCtx(MapGL), root = { children: [], removeChildren() { this.children = []; }, addChild(o) { this.children.push(o); } };
    const doc = gw._sandbox.document, img = doc.createElement('canvas');
    img.width = 4; img.height = 4;
    fx.begin(root);
    assert.strictEqual(fx.pixelRatio, 2, 'the map may bake for the screen density');
    fx.save(); fx.scale(2, 2); fx.translate(10, 5);
    fx.imageSmoothingEnabled = false;
    fx.drawImage(img, 1, 2, 8, 8);                       // world (1,2) 8x8 -> screen (22,14), 4 units per texel
    fx.restore();
    const s = root.children[0];
    assert.deepStrictEqual(s.M, [4, 0, 0, 4, 22, 14], 'placed by the whole transform');
    assert.strictEqual(s.texture.source.scaleMode, 'nearest', 'imageSmoothingEnabled=false keeps hard pixel edges');
    fx.save(); fx.translate(50, 0); fx.scale(-1, 1); fx.drawImage(img, 0, 0); fx.restore();
    assert.deepStrictEqual(root.children[1].M, [-1, 0, 0, 1, 50, 0], 'a mirrored sprite stays mirrored');
    assert.strictEqual(root.children[1].texture.source.scaleMode, 'linear', 'smoothing on: a linear texture');
    assert.strictEqual(root.children[1].texture.source, MapGL.tex(img, false, 0, 0, 4, 4).source, 'one upload per canvas and filter');
    fx.fillStyle = 'rgba(255,0,0,0.5)'; fx.globalAlpha = 0.5; fx.globalCompositeOperation = 'lighter';
    fx.fillRect(3, 4, 10, 20);
    const r = root.children[2];
    assert.ok(r.texture.white && r.tint === 0xff0000 && r.alpha === 0.25 && r.blendMode === 'add', 'fillRect: a tinted sprite, alpha and blend kept');
    assert.deepStrictEqual(r.M, [10, 0, 0, 20, 3, 4]);
    fx.globalAlpha = 1; fx.globalCompositeOperation = 'source-over';
    fx.beginPath(); fx.ellipse(0, 0, 10, 4, 0, 0, Math.PI * 2); fx.strokeStyle = '#00ff00'; fx.lineWidth = 3; fx.stroke();
    const g = root.children[3];
    assert.ok(g.log.length === 1 && g.log[0].op === 'stroke' && g.log[0].st.width === 3, 'a path is its own Graphics');
    fx.font = 'bold 30px Inter'; fx.textAlign = 'center'; fx.fillStyle = '#ffcc00';
    fx.fillText('Praven', 100, 50);
    const t = root.children[4];
    assert.ok(t.texture && t.ax > 0.3 && t.ax < 0.7 && t.M[4] === 100 && t.M[5] === 50, 'text is anchored on its point, centred');
    assert.deepStrictEqual(root.children.map(o => o.constructor.name), ['Sprite', 'Sprite', 'Sprite', 'Graphics', 'Sprite'], 'call order is draw order');
    assert.throws(() => fx.createRadialGradient(0, 0, 0, 0, 0, 1), /gradients/, 'a gradient fails loudly, not as a black blot');
});

slow('map: MapArt draws through Canvas2D and PixCtx without touching game state; labels never overlap', () => {
    const G = gw.Game, S = gw.state, vm = require('vm'), fs = require('fs'), path = require('path'), box = gw._sandbox;
    if(!vm.runInContext('typeof ImageData', gw._ctx).startsWith('f'))
        vm.runInContext('globalThis.ImageData = class { constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); } };', gw._ctx);
    const src = fs.readFileSync(path.join(__dirname, '..', 'map-art.js'), 'utf8');
    // Evaluated in a function scope, no global: MapArt.render hands itself to the game's drawMap*
    // calls, so app.js never looks it up by name and nothing leaks into later tests
    const MapArt = vm.runInContext(`(function () {\n${src}\n;return MapArt;\n})()`, gw._ctx);
    try {
        const { PixCtx, MapGL } = loadMapGL();
        G.mapCanvas = box.document.getElementById('map-canvas');
        G.mapCanvas.width = 1200; G.mapCanvas.height = 800;
        G.ctx = G.mapCanvas.getContext('2d');
        G.camera.x = S.player.x; G.camera.y = S.player.y; G.camera.zoom = 0.8;
        S.player.targetLocation = { x: S.player.x + 300, y: S.player.y }; S.player.status = 'moving';
        S.npcParties.forEach(n => { n.charging = false; });
        const fx = new PixCtx(MapGL), root = { children: [], removeChildren() { this.children = []; }, addChild(o) { this.children.push(o); } };
        const pix = () => { fx.begin(root); MapArt.render(G, fx); fx.end(); };
        MapArt.render(G, G.ctx);                           // the first frame bakes the terrain and sprites
        pix();
        assert.ok(root.children.length > 20, 'the WebGL facade got the picture: ' + root.children.length + ' objects');
        const { labels, boxes } = MapArt.placed();
        assert.ok(labels.some(l => l.text.startsWith(S.player.name)), 'you, with your name');
        for(let i = 0; i < labels.length; i++) {
            const a = labels[i];
            for(let j = i + 1; j < labels.length; j++) {
                const b = labels[j], hit = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
                assert.ok(!hit, `labels "${a.text}" and "${b.text}" overlap (#86)`);
            }
        }
        const before = JSON.stringify(S);
        let dice = 0;
        box.__rnd0 = vm.runInContext('Math.random', gw._ctx);
        box.__die = () => { dice++; return box.__rnd0(); };
        vm.runInContext('Math.random = __die;', gw._ctx);
        try {
            for(let i = 0; i < 2; i++) { MapArt.render(G, G.ctx); pix(); }
            S.time.hour = 23; MapArt.render(G, G.ctx); pix();      // night: windows, halos, hearth light
        } finally { vm.runInContext('Math.random = __rnd0;', gw._ctx); }
        S.time.hour = JSON.parse(before).time.hour;
        assert.strictEqual(JSON.stringify(S), before, 'drawing the map changed the game');
        assert.strictEqual(dice, 0, 'the map draw path consumed the game\'s random stream');
    } finally {
        S.player.targetLocation = null; S.player.status = 'idle';
    }
});
test('renderer: drawing is side-effect free — two renders leave Battle exactly as they found it', () => {
    const B = gw.Battle, G = gw.Game, S = gw.state;
    S.player.party = ['Svadya Köylüsü', 'Svadya Okçusu', 'Svadya Süvarisi'].map((name, i) => ({ id: 'se' + i, name, level: 12 }));
    S.player.equipment.horse = { id: 'horse', name: 'At', hSpd: 0, hDef: 0 };
    B.start('Çapulcular', 6);
    const mine = B.units.filter(u => u.isPlayerTeam), foes = B.units.filter(u => !u.isPlayerTeam);
    foes.forEach((f, i) => { f.x = mine[i % mine.length].x + 22; f.y = mine[i % mine.length].y; });   // straight into melee
    B.dealMelee(mine[1], foes[0], 1e6);                // one mid-fall
    for(let i = 0; i < 40; i++) B.update(1 / 60);      // swings, hits, arrows, floating text
    const pl = B.units.find(u => u.id === 'player');
    pl.vx = 120; pl.vy = 0;                            // a galloping mount: the old draw path played hoofbeats
    B.render();                                        // the first frame bakes the ground (that one draws dice)
    const snap = () => JSON.stringify({
        units: B.units, projectiles: B.projectiles, floatingTexts: B.floatingTexts, sparks: B.sparks, swings: B.swings,
        bloodStains: B.bloodStains, corpses: B.corpses, cam: B.cam, camZoom: B.camZoom, tugRatio: B.tugRatio,
        shakeT: B.shakeT, battleTime: B.battleTime, cmdSlots: B.cmdSlots, arrows: B.arrows, currentCommand: B.currentCommand
    });
    const vm = require('vm'), box = gw._sandbox, sfx = G.sfx, before = snap();
    let dice = 0, sounds = 0;
    box.__rnd0 = vm.runInContext('Math.random', gw._ctx);
    box.__die = () => { dice++; return box.__rnd0(); };
    vm.runInContext('Math.random = __die;', gw._ctx);
    G.sfx = () => { sounds++; };
    const realNow = box.performance.now;
    try {
        for(const t of [1000, 1234.5, 4321]) { box.performance.now = () => t; B.render(); }
    } finally { vm.runInContext('Math.random = __rnd0;', gw._ctx); G.sfx = sfx; box.performance.now = realNow; }
    assert.strictEqual(snap(), before, 'a render changed battle state');
    assert.strictEqual(dice, 0, 'the draw path consumed the game\'s random stream');
    assert.strictEqual(sounds, 0, 'the draw path played a sound');
    assert.ok(B.units.some(u => u.hp <= 0 && u.deadT < B.DIE_T) && B.units.some(u => u.hitT < 0.3) && B.floatingTexts.length,
        'the scene had a fall, a hit and floating text to draw');
    B.active = false;
    S.player.equipment.horse = null;
});
test('renderer: hoofbeats moved to update — one clop per stride peak, from the same gait the pose uses', () => {
    const B = gw.Battle, G = gw.Game, S = gw.state;
    S.player.party = [];
    S.player.equipment.horse = { id: 'horse', name: 'At', hSpd: 0, hDef: 0 };
    B.start('Çapulcular', 2);
    B.update(1 / 60);
    const pl = B.units.find(u => u.id === 'player');
    pl.vx = 100; pl.vy = 0;
    const gt = B.gait(pl, 0), peak = (Math.PI / 2 - gt.offset) * gt.strideMs;   // |sin| = 1 here
    let sounds = 0; const sfx = G.sfx; G.sfx = k => { if(k === 'hoofbeat') sounds++; };
    try {
        B.tickHooves(peak); B.tickHooves(peak + 1);
        assert.strictEqual(sounds, 1, 'one peak, one clop');
        B.tickHooves(peak + gt.strideMs * Math.PI / 2);   // the trough re-arms it
        B.tickHooves(peak + gt.strideMs * Math.PI);        // the next peak
        assert.strictEqual(sounds, 2, 'the next stride clops again');
        pl.vx = 0;
        B.tickHooves(peak + gt.strideMs * Math.PI * 2);
        assert.strictEqual(sounds, 2, 'standing still is silent');
    } finally { G.sfx = sfx; B.active = false; S.player.equipment.horse = null; }
});

// --- Mounted battle speed (#132) ---
// Nerfed ~20% (base and riding coefficient both cut) — mounted was overwhelmingly faster than
// foot at every riding level, not just the top end. This pins the formula itself so a future
// tweak has to be a deliberate edit, not a silent drift.
test('battle: mounted speed formula reflects the #132 nerf', () => {
    gw.state.player.stats.agi = 10; gw.state.player.stats.eff = {};
    gw.state.player.proficiencies.riding = { level: 1, xp: 0, next: 100, focus: 0 };
    gw.state.player.equipment.horse = { id: 'horse', name: 'At', hSpd: 0, hDef: 0 };
    gw.state.player.party = [];
    gw.Battle.start('Çapulcular', 4);
    const player = gw.Battle.units.find(u => u.id === 'player');
    assert.strictEqual(player.speed, 85, '(80 + agi 10 × 0.5) at riding level 1 — was 100 before #132');
    gw.Battle.active = false;
    gw.state.player.equipment.horse = null;
});

// --- Mounted HP buffer and dismount (#132) ---
// A horse adds a flat +33% of max HP on top of whatever health the player carries into the
// fight, and the dismount trigger moves from "50% of the buffed max" to "back down to the
// unbuffered max" — the buffer is meant to be spent before the rider comes off, not on top of
// a separate 50% cushion.
test('battle: mounted player gets a flat +33%-of-max HP buffer, not +33% of current HP', () => {
    gw.state.player.stats.maxHp = 100; gw.state.player.stats.hp = 40;   // riding in already hurt
    gw.state.player.equipment.horse = { id: 'horse', name: 'At', hSpd: 0, hDef: 0 };
    gw.state.player.party = [];
    gw.Battle.start('Çapulcular', 4);
    const player = gw.Battle.units.find(u => u.id === 'player');
    assert.strictEqual(player.baseMaxHp, 100);
    assert.strictEqual(player.maxHp, 133);                 // 100 + 33% of max, not 40 × 1.33
    assert.strictEqual(player.hp, 40 + 33);                // current hp + the same flat bonus
    gw.Battle.active = false;
    gw.state.player.equipment.horse = null;
    gw.state.player.stats.hp = gw.state.player.stats.maxHp;
});
test('battle: dismount fires when the buffer is spent, not at a flat 50% of the buffed max', () => {
    gw.state.player.stats.maxHp = 100; gw.state.player.stats.hp = 100;
    gw.state.player.equipment.horse = { id: 'horse', name: 'At', hSpd: 0, hDef: 0 };
    gw.state.player.party = [];
    gw.Battle.start('Çapulcular', 4);
    const player = gw.Battle.units.find(u => u.id === 'player');
    player.hp = 110;   // 110/133 ≈ 83% of the buffed max, but below the OLD flat-50%-of-buffed
                        // line's target too — still above baseMaxHp, so the buffer isn't spent yet
    gw.Battle.update(0.016);
    assert.strictEqual(player.dismounted, undefined, 'dismounted before the buffer was actually spent');
    player.hp = player.baseMaxHp;   // buffer (33) is now exactly spent
    const before = Math.random;
    Math.random = () => 0.99;       // dodge the 10% horse-death roll so the assertion is deterministic
    gw.Battle.update(0.016);
    Math.random = before;
    assert.strictEqual(player.dismounted, true, 'buffer-spent dismount did not fire');
    assert.strictEqual(player.type, 'infantry');
    gw.Battle.active = false;
    gw.state.player.equipment.horse = null;
    gw.state.player.stats.hp = gw.state.player.stats.maxHp;
});

slow('battle terrain: a siege wall cannot persist into the next field battle', () => {
    const plan = { name:'Test siege', defBonus:0.2, gaps:1 };
    gw.Battle.start('Garnizon', 8, null, '', plan);
    gw.Battle.buildGround();
    const siegeGround = gw.Battle.ground;
    assert.ok(gw.Battle.siege && siegeGround, 'siege field was not built');
    gw.Battle.start('Çapulcular', 8);
    assert.strictEqual(gw.Battle.siege, null, 'normal battle retained siege state');
    assert.strictEqual(gw.Battle.ground, null, 'normal battle reused the siege terrain cache');
    gw.Battle.buildGround();
    assert.notStrictEqual(gw.Battle.ground, siegeGround, 'new field terrain was not regenerated');
    gw.Battle.active = false;
});

test('battle: bodies push each other apart instead of sharing one pixel (#55)', () => {
    // Two armies used to walk straight through each other: a stack of six men on one spot took
    // six times the damage in one second, and you could not tell who you were swinging at.
    gw.state.player.party = [{ id: 'c1', name: 'Svadya Milisi', level: 1 }];
    gw.Battle.start('Çapulcular', 8);
    const live = gw.Battle.units.filter(u => u.hp > 0);
    assert.ok(live.length >= 4, 'not enough units to test separation');
    live.forEach(u => { u.x = 300; u.y = 300; });        // everyone on one pixel
    // One pass halves each pair's overlap; a handful has to open a real gap between every two.
    for(let k = 0; k < 40; k++) gw.Battle.separate();
    for(let i = 0; i < live.length; i++)
        for(let j = i + 1; j < live.length; j++) {
            const a = live[i], b = live[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            assert.ok(d >= a.radius + b.radius,
                `two units are ${d.toFixed(1)} apart, closer than their ${a.radius + b.radius} of body`);
        }
    gw.Battle.active = false;
    gw.state.player.party = [];
});

test('battle terrain: no impassable rock is left standing in the river (#21)', () => {
    // A rock is the only thing on the field that cannot be walked through. Standing in the water
    // it reads as part of the river: the player walks into the ford and stops dead against nothing.
    gw.state.player.party = [];
    let withRiver = 0;
    for(let i = 0; i < 60; i++) {
        gw.Battle.start('Çapulcular', 6);
        const t = gw.Battle.terrain;
        if(t.rivers.length) withRiver++;
        t.rocks.forEach(k => t.rivers.forEach(r => assert.ok(
            !(k.x + k.r > r.x && k.x - k.r < r.x + r.w && k.y + k.r > r.y && k.y - k.r < r.y + r.h),
            `rock (${Math.round(k.x)},${Math.round(k.y)}) sits in the river`)));
        gw.Battle.active = false;
    }
    assert.ok(withRiver > 0, '60 fields and not one river — the case was never exercised');
});

test('battle terrain: a rock blocks where it is drawn, not a taller circle around it (#118)', () => {
    // The rock is drawn squashed to ROCK_SQUASH vertically; the hit test used a full circle, so a
    // unit walking up from below stopped against empty ground.
    const k = { x: 200, y: 200, r: 12 }, reach = k.r + 5, S = gw.Battle.ROCK_SQUASH;
    const below = off => { const u = { x: k.x, y: k.y + reach * S + off, radius: 5 }; gw.Battle.pushOffRock(u, k); return u; };
    assert.strictEqual(below(1).y, k.y + reach * S + 1, 'pushed while standing clear of the drawn rock');
    assert.ok(below(-3).y > k.y + reach * S - 3, 'walked into the drawn rock without being pushed out');
    const side = { x: k.x + reach - 3, y: k.y, radius: 5 };
    gw.Battle.pushOffRock(side, k);
    assert.ok(side.x > k.x + reach - 3, 'the rock no longer blocks from the side');
});

test('no party, no orders (#114)', () => {
    // A duel and an arena bout both empty the party before the fight, so the command strip was
    // drawn and "opportunities" announced for orders nobody could obey. The gate is the party
    // itself rather than an isDuel flag, which also covers a player caught alone on the road.
    // The slots are read by the opening log, so they have to be set before it is written.
    gw.state.player.party = [];
    gw.Battle.start('Şampiyon', 1);
    assert.strictEqual(gw.Battle.cmdSlots.length, 0, 'orders offered to an empty party');
    assert.ok(!/\[1\]/.test(gw._sandbox.document.getElementById('battle-log-left').innerHTML),
        'the opening log still lists command keys in a one-on-one');
    gw.Battle.active = false;

    gw.state.player.party = [{ id: 'c1', name: 'Svadya Milisi', level: 1 }];
    gw.Battle.start('Çapulcular', 4);
    assert.strictEqual(gw.Battle.cmdSlots.length, 3, 'a party that can be commanded gets no orders');
    gw.Battle.active = false;
    gw.state.player.party = [];
});

test('pause: one door, and the clock is the only thing that stops (#113)', () => {
    // Two loops, one flag each: on the map the flag is Game.paused, in battle it is Battle.paused,
    // and setPaused routes to whichever loop is alive. The map render must NOT be gated on it —
    // the watchtower reveal (#125) is a frozen map you are meant to look at.
    gw.Game.setPaused(true);
    assert.ok(gw.Game.paused && gw.Game.clockStopped(), 'Esc on the map did not stop the clock');
    gw.Game.closeModal();   // Esc, ×, clicking outside and "Devam Et" all land here
    assert.ok(!gw.Game.paused, 'closing the pause menu left the game frozen');

    gw.state.player.party = [{ id: 'q1', name: 'Svadya Milisi', level: 1 }];
    gw.Battle.start('Çapulcular', 3);
    gw.Game.setPaused(true);
    assert.ok(gw.Battle.paused, 'in battle the flag landed on the map clock instead');
    assert.ok(!gw.Game.paused, 'and it froze the map clock too — the battle would never resume');
    gw.Game.setPaused(false);
    gw.Battle.active = false;
    gw.state.player.party = [];
});

test('watchtower: the horizon opens, then closes on its own (#125)', () => {
    // The reveal rides getVisibility(), the one number spotRange/locSpotRange/lairSeen and the
    // map draw gate all read, so nothing in the drawing code knows a tower exists.
    const base = gw.Game.getVisibility();
    gw.Game.startTowerReveal();
    assert.strictEqual(gw.Game.getVisibility(), base * gw.Game.TOWER_REVEAL_MUL, 'the horizon did not widen');
    assert.ok(gw.Game.clockStopped(), 'time kept running while the player was looking');

    // The countdown starts on the first frame, not at the call: the reveal is kicked off from a
    // modal, and the map draws nothing until that modal is gone.
    gw.Game.towerRevealTick(1000);
    assert.ok(gw.Game.towerReveal.until > 1000, 'the countdown never started');
    gw.Game.towerRevealTick(1000 + gw.Game.towerReveal.secs * 1000);
    assert.strictEqual(gw.Game.towerReveal, null, 'the tower left the map permanently revealed');
    assert.strictEqual(gw.Game.getVisibility(), base, 'sight stayed boosted after the reveal ended');
});

test('roster: "11+2" counts what is new, and losses move the mark (#111)', () => {
    gw.state.player.party = [{ id: 'r1', name: 'Svadya Milisi', level: 1 }];
    gw.Game.markRosterSeen('party');
    assert.strictEqual(gw.Game.newCount('party'), 0, 'a party just looked at still shows arrivals');
    gw.state.player.party.push({ id: 'r2', name: 'Svadya Milisi', level: 1 });
    assert.ok(/^2<span[^>]*>\+1<\/span>\/9$/.test(gw.Game.rosterTag('party', 9)), gw.Game.rosterTag('party', 9));
    // A wiped-out party must not owe a permanent "+N" it never earned.
    gw.state.player.party = [];
    assert.strictEqual(gw.Game.newCount('party'), 0, 'losses left the seen mark above the real count');
    gw.state.player.party = [{ id: 'r3', name: 'Svadya Milisi', level: 1 }];
    assert.strictEqual(gw.Game.newCount('party'), 1, 'the rebuilt party\'s first recruit was not new');
    gw.state.player.party = [];
    gw.Game.markRosterSeen('party');
});

test('tournament: eight enter, one is crowned, and the ladder pays per round (#122)', () => {
    const city = gw.LOCATIONS.find(l => l.type === 'city');
    gw.state.player.money = 1000;
    gw.state.activeTournaments[city.id] = true;
    gw.Game.joinTournament(city);
    const t = gw.state.tourney;
    assert.strictEqual(t.rounds[0].length, 8, 'the draw is not eight fighters');
    assert.strictEqual(t.rounds[0].filter(f => f.you).length, 1, 'the player is not in the draw exactly once');
    gw.Game.startTournament();
    // Knocked out in the first round: the player is done, but the bracket still has to crown
    // somebody — that name is what the city remembers afterwards.
    gw.Game.tourneyRoundDone(false);
    assert.ok(t.done, 'the bracket stopped when the player went out');
    assert.ok(t.champion && !t.champion.you, 'nobody was crowned');
    assert.strictEqual(t.wins, 0, 'a first-round loss counted as a win');
    assert.ok(gw.state.tourneyChampions[city.id], 'the city did not remember the winner');

    const teamSizes = [4, 2, 1];
    teamSizes.forEach((size, round) => {
        const teams = gw.Game.TOURNEY_TEAMS[round];
        assert.strictEqual(teams.length, 2, `round ${round} has no two-team colour pairing`);
        assert.notStrictEqual(teams[0].color, teams[1].color, `round ${round} teams share a colour`);
        assert.strictEqual(new Set(teams.map(x => x.color)).size, 2, `round ${round} colours are not distinguishable`);
        assert.strictEqual([4, 2, 1][round], size);
    });

    // Win all three and the prizes arrive as you climb, not only at the end.
    gw.state.tourney = null;
    gw.state.activeTournaments[city.id] = true;
    gw.Game.joinTournament(city);
    gw.Game.startTournament();
    gw.state.player.ambitionsDone = gw.Game.AMBITIONS.map(a => a.id).filter(id => id !== 'champion');   // the one goal left open
    const m0 = gw.state.player.money, r0 = gw.state.player.renown, w0 = gw.state.player.tourneyWins || 0;
    for(let i = 0; i < 3; i++) gw.Game.tourneyRoundDone(true);
    assert.ok(gw.state.tourney.champion.you, 'the player won every round and was still not crowned');
    assert.strictEqual(gw.state.player.money - m0, 1200, 'the prize ladder and ambition rewards did not arrive');
    assert.strictEqual(gw.state.player.renown - r0, 30, 'the championship and ambition paid the wrong renown');
    assert.strictEqual((gw.state.player.tourneyWins || 0) - w0, 1, 'the ambition counter did not tick');
    assert.ok(gw.state.player.ambitionsDone.includes('champion'),
        'winning the tournament did not immediately complete the open ambition');
    gw.state.tourney = null;

    // The board is topped up, not rolled once: a player crossing the map should keep running
    // into open tournaments, and the top-up must never overfill or spin on an empty city list.
    gw.state.activeTournaments = {};
    let seen = 0;
    for(let d = 0; d < 40; d++) {
        gw.Game.dailyUpdate();
        let n = Object.keys(gw.state.activeTournaments).length;
        assert.ok(n <= gw.Game.TOURNEY_OPEN, `${n} tournaments open at once`);
        seen += n;
    }
    // Measured over 5 seeds x 120 days: 2.11 open on an average day, never more than the cap,
    // and 2.7% of days with none at all.
    assert.ok(seen / 40 > 1.8, `only ${(seen / 40).toFixed(2)} tournaments open on an average day`);
});

// --- The arena's purse (#115) ---
// The sand paid nothing, so three hours in the ring bought proficiency and no coin. It pays
// pocket change now -- and the streak bonus has to stop, or the fifth win keeps paying its 60
// on every fight after it.
test('chicken: a goose costs a bird, and the closing seconds shrink the birds (#123)', () => {
    reset();
    const M = g.TournamentMinigame;
    Object.assign(M, { active: true, goal: 16, score: 0, targets: [] });
    M.canvas = { width: 400, height: 300, getBoundingClientRect: () => ({ left: 0, top: 0 }) };
    // One spawn per update: zero dt, zero spawn timer, and take the bird straight back off the field.
    const spawn = (timeLeft, n) => {
        const out = [];
        for(let i = 0; i < n; i++) { M.timeLeft = timeLeft; M.spawnTimer = 0; M.update(0); out.push(M.targets.pop()); }
        return out;
    };
    const early = spawn(20, 400), late = spawn(4, 400);
    assert.strictEqual(late[0].radius / early[0].radius, 0.75,
        `the closing seconds scale the bird by ${late[0].radius / early[0].radius}`);
    const geese = early.filter(t => t.bad).length / early.length;
    between(geese, 0.15, 0.35, 'share of geese among the birds');
    M.score = 3;
    const click = bad => {
        M.targets = [{ x: 100, y: 100, radius: 20, timeLeft: 1, bad }];
        M.onClick({ clientX: 100, clientY: 100 });
    };
    click(true);
    assert.strictEqual(M.score, 2, 'grabbing a goose should cost a chicken');
    click(false);
    assert.strictEqual(M.score, 3, 'a caught chicken should score');
    M.score = 0; click(true);
    assert.strictEqual(M.score, 0, 'a goose at zero should not push the score negative');
    M.active = false;
});

test('arena: a bout pays, and the streak bonus starts over at five (#115)', () => {
    const gw = H.world({ seed: 9 });
    const { Game, state, LOCATIONS } = gw;
    const town = LOCATIONS.find(l => l.type === 'city');
    state.arenaLocId = town.id;
    town.prosperity = 50;                       // the purse rides on the town's prosperity
    const foe = { name: 'Arena Gediklisi', xp: 180 };

    assert.strictEqual(Game.arenaPurse(), Game.ARENA_PURSE, 'a middling town pays something other than the base purse');
    town.prosperity = 100;
    assert.strictEqual(Game.arenaPurse(), Math.round(Game.ARENA_PURSE * 1.5), 'a rich town is not capped at +50%');
    town.prosperity = 50;

    state.player.arenaStreak = 0;
    // The hours in the ring drag wages and food along with them, and a day boundary inside the
    // loop would show up as a negative purse. The clock is what's being held still, not the payout.
    const clock = Game.advanceTime;
    Game.advanceTime = () => {};
    const pay = [];
    for(let i = 0; i < 10; i++) {
        const before = state.player.money;
        Game.finishArena(foe, true);
        pay.push(Math.round(state.player.money - before));
    }
    const base = Game.ARENA_PURSE;
    assert.deepStrictEqual(pay, [base, base, base + 25, base, base + 60,
                                 base, base, base + 25, base, base + 60],
        `the streak pays ${pay.join(',')}`);

    // A loss breaks it: the next win starts the count from one
    state.player.arenaStreak = 2;
    Game.finishArena(foe, false);
    assert.strictEqual(state.player.arenaStreak, 0, 'the streak survived a defeat');
    const before = state.player.money;
    Game.finishArena(foe, true);
    assert.strictEqual(Math.round(state.player.money - before), base, 'the bonus was paid on the first win after a loss');
    Game.advanceTime = clock;
});

// --- Infamy at the recruiting tent (#104) ---
// A village-burner used to recruit almost as well as a clean lord: x0.4 turnout and a 16-denar
// fee at the very bottom of the honor scale. The gap has to be felt, and it has to be slow to
// undo -- otherwise waiting a few days is the whole penalty.
slow('infamy: burning villages empties the recruiting tent, and the stain is slow (#104)', () => {
    const gw = H.world({ seed: 7 });
    const { Game, state } = gw;
    const terms = h => { state.player.honor = h; return Game.volunteerTerms(); };

    const clean = terms(0), raider = terms(-36), worst = terms(-95);
    assert.strictEqual(clean.cost, 10, 'a clean reputation no longer recruits at the base fee');
    assert.ok(worst.cost / clean.cost >= 20, `the fee only spreads ${(worst.cost / clean.cost).toFixed(1)}x`);
    assert.ok(clean.mult / raider.mult >= 3.5 && worst.mult * 20 < 0.01,
        `turnout spread is too narrow: ${raider.mult.toFixed(3)} / ${worst.mult.toFixed(3)}`);
    // Honor's good side stays linear -- a good name opens a door, it doesn't print recruits
    assert.ok(terms(40).mult <= 1.35, 'a good name now hands out free volunteers');

    // One raid is 12 dishonor at 0.15 a day: nearly three months, and nothing fades on the
    // day of the raid itself.
    state.player.honor = -12; state.player.lastRaidDay = state.time.day - 1;
    const frozen = state.player.honor;
    Game.dailyUpdate();
    assert.strictEqual(state.player.honor, frozen, 'the stain faded on the day of the raid');
    state.player.lastRaidDay = -99;
    let days = 0;
    while(state.player.honor < 0 && days < 500) { Game.dailyUpdate(); days++; }
    assert.ok(days >= 60, `one raid washes off in ${days} days`);
});

// --- The announcement and the roster (#116) ---
// "Six of them blocked the road" and then seven bandits walk out. The two numbers came from
// two places: the modal counted the whole party (the wounded included, who stay in camp) and
// read the band's size at render time, while the battle that starts seconds later -- from the
// button, or from a failed escape -- read it again. Both sides are read once now.
test('encounter: the announced roster is the roster that takes the field (#116)', () => {
    const gw = H.world({ seed: 5 });
    const { Game, state, Battle } = gw;
    state.player.party = ['a', 'b', 'c', 'd'].map((k, i) =>
        ({ id: k, name: 'Svadya Milisi', level: 1, wounded: i >= 2 }));   // two of the four are wounded
    const npc = { id: 'npc_x', name: 'Çapulcu', type: 'bandit', band: 'looter',
                  size: 6, x: state.player.x + 10, y: state.player.y, speed: 60, faction: '' };
    state.npcParties.push(npc);
    state.encounterCooldown = 0;
    Game.triggerEncounter(npc, 'ambush');

    const html = gw._sandbox.document.getElementById('modal-body').innerHTML;
    const nums = [...html.matchAll(/<b>(\d+)<\/b> kişi/g)].map(m => +m[1]);
    assert.strictEqual(nums.length, 2, 'the encounter window no longer announces two rosters');
    const [foes, mine] = nums;

    // The band grows between the announcement and the fight -- a caravan raid, a lord's army
    // rebuilt. The battle must still field what the player was told.
    npc.size = 9;
    Game.fleeChance = () => 0;             // the escape fails, the road is cut off
    Battle.endBattle = () => { Battle.active = false; };
    Game.fleeEncounter(npc.id);

    const onField = t => Battle.units.filter(u => u.isPlayerTeam === t).length
                       + Battle.reserves[t ? 'p' : 'e'].length;
    assert.strictEqual(onField(false), foes, `announced ${foes} enemies, ${onField(false)} took the field`);
    assert.strictEqual(onField(true), mine, `announced ${mine} of your own, ${onField(true)} took the field`);
    assert.strictEqual(mine, 3, 'the wounded were counted into the announcement again');
});

test('band spawning: early bands stay small and a nearby lair cannot produce a party in the player\'s lap', () => {
    const g = H.world({ seed: 37 });
    const { Game, state } = g;
    state.time.day = 1;
    const early = Game.spawnBand('bandit');
    assert.ok(early.size <= 8, `day-one band spawned with ${early.size} troops`);
    const closeLair = { id:'near_lair', band:'bandit', x:state.player.x, y:state.player.y };
    const fromNearLair = Game.spawnBand('bandit', closeLair);
    assert.ok(Game.dist(fromNearLair, state.player) >= Game.SPAWN_SAFE,
        'a band spawned inside the player safety radius');
    state.npcParties = state.npcParties.filter(n => n.type !== 'bandit');
    const before = Game.bandCount();
    Game.bandRefillTick(6);
    assert.strictEqual(Game.bandCount(), before, 'the refill grace period spawned a day-one band');
});

test('tournament: a 4v4 round spawns two complete, colour-coded teams', () => {
    const gt = H.world({ seed: 122 });
    const { Battle, Game } = gt;
    const pair = Game.TOURNEY_TEAMS[0];
    const fighter = (name, lv) => ({ name, lv });
    const foe = fighter('Rakip Kaptan', 5);
    foe.round = Game.TOURNEY_ROUNDS[0];
    Battle.startTourneyFight(foe, {
        size:4, player:pair[0], enemy:pair[1],
        allies:[fighter('M1', 3), fighter('M2', 4), fighter('M3', 5)],
        enemies:[fighter('K1', 3), fighter('K2', 4), fighter('K3', 5)]
    });
    const blue = Battle.units.filter(u => u.isPlayerTeam);
    const red = Battle.units.filter(u => !u.isPlayerTeam);
    assert.strictEqual(blue.length, 4, 'the player tournament team is not 4 fighters');
    assert.strictEqual(red.length, 4, 'the opposing tournament team is not 4 fighters');
    assert.ok(blue.every(u => u.color === pair[0].color), 'player teammates do not share their team colour');
    assert.ok(red.every(u => u.color === pair[1].color), 'opponents do not share their team colour');
    assert.ok(Battle.units.every(u => u.defense === 8 && u.dmgType === 'blunt' && !u.hasShield),
        'personal weapons or armour leaked into the tournament issue');
    assert.ok(Battle.units.every(u => !u.mounted && u.type === 'infantry'),
        'a horse entered an otherwise foot-only tournament round');
    assert.strictEqual(Battle.arrows, 0, 'the player carried a personal bow into the tournament');
    Battle.active = false;
});

test('tournament: the shared result hook completes the ambition immediately and only on a win', () => {
    const gh = H.world({ seed: 123 });
    const { Game, state } = gh;
    state.player.ambitionsDone = Game.AMBITIONS.map(a => a.id).filter(id => id !== 'champion');
    const wins = state.player.tourneyWins || 0;
    Game.tournamentFinished(false, 0);
    assert.strictEqual(state.player.tourneyWins || 0, wins, 'a tournament loss incremented the win hook');
    assert.ok(!state.player.ambitionsDone.includes('champion'), 'a loss completed the champion ambition');
    Game.tournamentFinished(true, 3);
    assert.strictEqual(state.player.tourneyWins, wins + 1, 'the win hook did not increment the tournament counter');
    assert.ok(state.player.ambitionsDone.includes('champion'),
        'the shared result hook deferred ambition completion until day end');
});

test('encounter: the announced band kind wins over a stale global encounter id', () => {
    const gw = H.world({ seed: 15 });
    const { Game, state, Battle } = gw;
    state.player.party = [];
    const wolf = Game.spawnBand('wolf');
    state.player.currentEncounterNpcId = wolf.id; // stale state from a different encounter
    Battle.endBattle = () => { Battle.active = false; };
    Battle.start('Çapulcular', 6, null, '', null, false, 'bandit');
    const foes = Battle.units.filter(u => !u.isPlayerTeam).concat(Battle.reserves.e);
    assert.ok(foes.length === 6);
    assert.ok(foes.every(u => !u.beast && !/Kurt/.test(u.name)),
        'a bandit announcement produced wolves');
    Battle.active = false;
});

test('wolf: a bleeding quarry pulls the pack in (#36)', () => {
    const { Game, state } = gw;
    state.player.status = 'idle';
    state.player.x = 4500; state.player.y = 4500;
    state.player.party = [];
    state.player.stats.hp = 5; state.player.stats.maxHp = 50;   // hpFrac < 0.5 -> bleeding
    state.npcParties = [];
    const wolf = Game.spawnBand('wolf');
    wolf.x = wolf.targetX = 4500 + Math.round(Game.getVisibility() * 1.5);
    wolf.y = wolf.targetY = 4500;
    const before = wolf.targetX;
    Game.updateNPCs(0.01);
    assert.ok(wolf.targetX < before, 'the pack did not lean toward the wounded player');
    state.player.stats.hp = state.player.stats.maxHp;
});

test('fief: the lands window renders a single heading, not a duplicate (#6)', () => {
    const { Game, LOCATIONS } = gw;
    const loc = LOCATIONS.find(l => l.type === 'city');
    const prev = loc.owner; loc.owner = 'player';
    const withHeading = Game.fiefListHtml(true, true);
    const noHeading = Game.fiefListHtml(true, false);
    assert.ok(withHeading.includes('Tımarların'), 'diplomacy list should keep its heading');
    assert.ok(!noHeading.includes('Tımarların'), 'the lands window must suppress the inner heading');
    loc.owner = prev;
});

test('wanderers: joining happens only by walking up to one on the map (#119, #33)', () => {
    const { Game, state, _sandbox } = gw;
    const html = () => _sandbox.document.getElementById('modal-body').innerHTML;
    // No road or day event adds a man any more — that is what the sprites are for.
    const joinIds = Game.WANDERERS.map(w => w.id);
    assert.strictEqual(joinIds.length, 5, 'the five "take me along" stories did not all move');
    const recruits = e => /addRecruit|offerWanderer/.test(String(e.run) + (e.choices || []).map(c => String(c.run)).join(''));
    [...Game.ROAD_EVENTS, ...Game.DAY_EVENTS].forEach(e =>
        assert.ok(!joinIds.includes(e.id) && !recruits(e), `${e.id} still adds a man from a dice roll`));

    state.player.party = [];
    state.npcParties = state.npcParties.filter(n => !n.wanderer);
    const w = Game.spawnWanderer('deserter');
    assert.ok(w && w.type === 'wanderer' && !Game.isHostile(w) && !Game.mapPartyIsFoe(w), 'a wanderer spawned hostile');
    // Meeting: the story asks first — nobody joins before a choice.
    Game.triggerEncounter({ ...w, isNpc: true });
    assert.ok(/roadChoice/.test(html()), 'meeting a wanderer did not offer a choice');
    assert.strictEqual(state.player.party.length, 0, 'the wanderer joined before consent');
    assert.ok(!state.npcParties.includes(w), 'the wanderer stayed on the map after being met');
    Game.roadChoice(0);                                   // Kabul Et
    assert.strictEqual(state.player.party.length, 1, 'accepting did not add the recruit');

    // A full party can't take them, infamy keeps them away — either way nobody joins.
    const cap = Game.getPartyCapacity();
    state.player.party = Array.from({ length: cap - 1 }, (_, i) => ({ id: 'f' + i, name: 'Asker', level: 1 }));
    const full = Game.spawnWanderer('deserters');
    Game.triggerEncounter({ ...full, isNpc: true });
    assert.ok(!/roadChoice/.test(html()) && state.player.party.length === cap - 1, 'two deserters joined a full party');
    state.player.party = [];
    const honor = state.player.honor; state.player.honor = -90;
    const shy = Game.spawnWanderer('orphan');
    Game.triggerEncounter({ ...shy, isNpc: true });
    assert.ok(!/roadChoice/.test(html()) && state.player.party.length === 0, 'a stranger joined an infamous party');
    state.player.honor = honor;

    // They come and go on their own.
    state.npcParties = state.npcParties.filter(n => !n.wanderer);
    for(let d = 0; d < 30; d++) { state.time.day++; Game.wandererTick(); }
    const alive = state.npcParties.filter(n => n.wanderer);
    assert.ok(alive.length > 0 && alive.length <= Game.WANDERER_MAX, `${alive.length} wanderers after a month`);
    assert.ok(alive.every(n => n.leaveDay > state.time.day), 'a wanderer outstayed its time');
    state.npcParties = state.npcParties.filter(n => !n.wanderer);
    state.player.party = [];
});

test('hail: ten seconds to choose, eight hours that follow the choice (#121)', () => {
    const g = H.world({ seed: 5 });
    const { Game, state, ITEMS, LOCATIONS } = g;
    const storm = Game.ROAD_EVENTS.find(e => e.id === 'storm');
    assert.strictEqual(storm.timer, 10, 'the hail gives no ten-second decision');
    assert.strictEqual(storm.choices.length, 2, 'the hail is shelter or walk');
    const hour = () => state.time.day * 24 + state.time.hour;
    const setup = () => {
        state.player.party = Array.from({ length: 20 }, (_, i) => ({ id: 's' + i, name: 'Svadya Milisi', level: 1 }));
        state.player.inventory = [{ ...ITEMS.wheat, qty: 200 }];
        state.player.morale = 70; state.player.storm = null;
    };
    // Shelter: eight hours pass, nobody is hurt, and those hours eat three times the ration.
    setup();
    const daily = Game.upkeep().foodLow, food0 = Game.foodStock().total, h0 = hour();
    storm.choices[0].run(Game.eventCtx());
    assert.ok(hour() - h0 >= Game.STORM_HOURS, 'sheltering did not cost the eight hours');
    assert.ok(!state.player.party.some(t => t.wounded) && state.player.party.length === 20, 'someone was hurt under shelter');
    const eaten = food0 - Game.foodStock().total;
    assert.ok(eaten >= Math.floor(2 * daily * Game.STORM_HOURS / 24), `sheltering ate only ${eaten} extra food`);
    assert.strictEqual(state.player.storm, null, 'the storm outlived its eight hours');
    // Walk: every hour under the hail strikes two men; a roof ends it.
    setup();
    storm.choices[1].run(Game.eventCtx());
    for(let i = 0; i < 3; i++) Game.advanceTime(1);
    const struck = state.player.storm.dead + state.player.storm.hurt;
    assert.strictEqual(struck, 3 * Game.STORM_HITS, `three hours of hail struck ${struck} men`);
    assert.strictEqual(20 - state.player.party.length, state.player.storm.dead, 'the dead are still in the party');
    Game.enterLocation(LOCATIONS[0]);
    assert.strictEqual(state.player.storm, null, 'reaching a settlement did not end the hail');
    Game.closeModal();
    // Out of time: a choice is made anyway and the hesitation costs morale and pace.
    setup();
    const pace = Game.getPlayerSpeed().value;
    Game.showChoiceEvent(storm, Game.eventCtx());
    assert.ok(!Game.canDismiss(), 'a timed decision can be closed away');
    Game.indecision(); Game.roadChoice(1, null, true);
    assert.ok(Game.canDismiss(), 'the decision stayed locked after it was made');
    assert.strictEqual(state.player.morale, 62, 'indecision did not cost 8 morale');
    assert.ok(Math.abs(Game.getPlayerSpeed().value / pace - 0.9) < 1e-9, 'indecision did not slow the march');
    Game.advanceTime(Game.INDECISION_HOURS);
    assert.ok(!Game.indecisive(), 'the indecision outlasted its hours');
    state.player.storm = null; Game.closeModal();
});

test('winter: the last 20 days of a 120-day year burn coal; without it the army sickens (#121)', () => {
    const g = H.world({ seed: 6 });
    const { Game, state, ITEMS } = g;
    assert.deepStrictEqual([100, 101, 120, 121, 221].map(d => Game.isWinter(d)), [false, true, true, false, true], 'winter falls on the wrong days');
    assert.strictEqual(Game.daysToWinter(95), 6);
    state.player.party = Array.from({ length: 19 }, (_, i) => ({ id: 'w' + i, name: 'Svadya Milisi', level: 1 }));
    state.player.party.push({ id: 'c', name: 'Yoldaş', isCompanion: true, companionId: 'x', level: 5 });
    state.time.day = 101;
    // Warm: 20 in the party plus the player is 21 heads — three coal a day; morale free to climb.
    state.player.inventory = [{ ...ITEMS.coal, qty: 4 }];
    Game.winterTick();
    assert.strictEqual(Game.coalCount(), 1, '21 heads did not burn three coal');
    state.player.morale = 80;
    assert.strictEqual(Game.morale(), 80, 'a warm army is capped');
    // Cold: morale capped at 40, and after three cold days a share of the troops dies each day.
    for(let d = 0; d < 3; d++) Game.winterTick();
    assert.ok(Game.cold() && Game.morale() === Game.COLD_MORALE_CAP, 'a cold army is not capped at 40');
    const before = state.player.party.length;
    Game.winterTick();
    assert.ok(state.player.party.length < before, 'the fourth cold day killed no one');
    assert.ok(state.player.party.some(t => t.isCompanion), 'the cold killed a companion');
    // Coal again: warm, cap lifted.
    state.player.inventory = [{ ...ITEMS.coal, qty: 10 }];
    Game.winterTick();
    assert.ok(!Game.cold() && Game.morale() === 80, 'coal did not lift the cold');
    // A winter with no cold day counts as warm when it ends; this one had some.
    state.time.day = 121; Game.winterTick();
    assert.ok(!(state.career && state.career.warmWinters), 'a winter with cold days counted as warm');
});

test('market: trade goods are under the "Mal" tab and can be bought in bulk', () => {
    const { Game } = gw;
    const cat = Game.MARKET_CATEGORIES.find(c => c.id === 'goods');
    const trade = Object.values(gw.ITEMS).filter(i => i.type === 'trade');
    assert.ok(trade.length && trade.every(i => cat.types.includes(i.type)), 'the "Mal" tab matches no trade good');
});

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
const { fight, troopRow } = require('./duel');

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

// --- Combat anchor matchups (Fable danisma 006) ---
// The rock-paper-scissors triangle now lives in tools/balance.js's `counter` group (CI runs
// `balance.js --check` on every push), six against six over 64 fights instead of 25 duels: one on
// one the engine is decisive enough that a 10 % edge reads 75 %, and the old spear anchor set a
// mid-tier spearman against an elite rider, which the tier rule says he must lose.

// The encounter window's own path (party, hero, a kingdom's roster). Until 2.8.0 a kingdom's
// soldiers were worth ~3 villagers a step and 21 peasants with a fresh hero read "Çetin" against 8
// of them; on the fitted table (a step is worth two) 8 Swadian soldiers are ~14 villagers.
test('odds: the encounter label reads the party, the hero and the kingdom\'s roster', () => {
    const go = H.world({ seed: 4 }), { Game: G, state: st } = go;
    const party = (n, name, level) => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name, level }));
    st.encounterSize = null;
    const npc = { size: 8, faction: 'swadia' };
    st.player.party = party(8, 'Svadya Köylüsü', 1);
    assert.ok(['Zorlu', 'Çetin'].includes(G.oddsLabel(npc).name), `8 peasants and a fresh hero read ${G.oddsLabel(npc).name} (${G.oddsRatio(npc).toFixed(2)})`);
    st.player.party = party(21, 'Svadya Köylüsü', 1);
    assert.strictEqual(G.oddsLabel(npc).name, 'Kolay', `21 peasants and a fresh hero: ratio ${G.oddsRatio(npc).toFixed(2)}`);
    st.player.party = party(12, 'Svadya Çavuşu', 20);
    assert.strictEqual(G.oddsLabel({ size: 6, band: 'bandit' }).name, 'Kolay', 'twelve sergeants against six looters');
});

// --- The odds label against the real engine ---
// The encounter's "Tahmini denge" is a formula (Battle.sideStrength); these fights are the truth it
// must match, re-measured on every push so a stat, armour or AI change that moves the battle moves
// this test too. A "Kolay" side has to win nearly always and a "Çetin" one nearly never. A side is
// one troop or a roster dealt in turn — a kingdom's army mixes footmen, bowmen and riders, and the
// bowmen behind a line are what a one-troop case never shows (Battle.ARCHER_IN_MELEE).
// The 22-peasants-on-8-sergeants case is the report: the old level-weighted headcount said
// "Kolay", and every man died.
slow('odds: the encounter label agrees with real-engine fights', () => {
    const go = H.world({ seed: 3 }), { Battle: B, Game: G, TROOP_TYPES: TT } = go;
    const side = (names, n, team) => {
        const count = {};
        for(let i = 0; i < n; i++) { const x = Array.isArray(names) ? names[i % names.length] : names; count[x] = (count[x] || 0) + 1; }
        return Object.entries(count).map(([name, m]) => { const t = troopRow(go, name);   // a kingdom's troop or a band's row
            return { n: m, hp: t.hp, attack: t.attack, defense: t.defense, dmgType: t.dmgType || 'cut', type: t.type, brace: t.brace, speed: t.speed, isPlayerTeam: team }; });
    };
    const label = (a, na, b, nb) => {
        const A = side(a, na, true), E = side(b, nb, false);
        return G.ODDS.find(o => B.sideStrength(A, E) / B.sideStrength(E, A) >= o[0])[1];
    };
    const won = (a, na, b, nb, n = 20) => {
        let w = 0, ok = 0;
        for(let i = 0; i < n; i++) { const r = fight(go, a, b, na, nb); if(r.won === null) continue; ok++; if(r.won) w++; }
        return Math.round(w / ok * 100);
    };
    const swadia = G.factionTroopPool('swadia'), nord = G.factionTroopPool('nord');
    const cases = [
        ['Svadya Köylüsü', 22, 'Svadya Çavuşu', 8, 'Çetin'],     // the report
        ['Svadya Köylüsü', 12, 'Svadya Milisi', 10, 'Çetin'],
        ['Svadya Milisi', 6, 'Svadya Çavuşu', 5, 'Çetin'],
        ['Svadya Köylüsü', 10, 'Nord Serfi', 10, 'Dengeli'],
        ['Svadya Köylüsü', 12, 'Svadya Köylüsü', 8, 'Kolay'],
        ['Svadya Çavuşu', 4, 'Svadya Milisi', 5, 'Kolay'],
        ['Svadya Çavuşu', 8, 'Svadya Milisi', 10, 'Kolay'],
        ['Veagir Baltacısı', 5, 'Nord Savaşçısı', 6, 'Kolay'],
        ['Svadya Köylüsü', 21, swadia, 8, 'Kolay'],             // a kingdom's army: footmen, bowmen, riders
        ['Svadya Köylüsü', 11, swadia, 8, 'Çetin'],
        ['Svadya Milisi', 5, nord, 8, 'Çetin'],
    ];
    // The hero beside eight villagers, fought as one more man of his stats (the engine has no hand
    // on his sword). The plain mean of hp × hit let one strong man lift his whole side: the
    // mid-game hero read "Kolay" against nine Swadian regulars and won 77 % (2.11.0's report).
    const hero = (hp, attack, defense) => { const nm = `Kahraman ${hp}`; TT[nm] = { hp, speed: 70, attack, defense, type: 'infantry', dmgType: 'cut' }; return nm; };
    const looters = ['Çapulcu', 'Çapulcu', 'Çapulcu', 'Çapulcu', 'Çapulcu', 'Çapulcu', 'Çapulcu Okçu', 'Çapulcu Okçu', 'Atlı Çapulcu'];
    const withHero = h => [h].concat(Array(8).fill('Svadya Köylüsü'));
    cases.push([withHero(hero(50, 20, 0)), 9, looters, 9, 'Kolay'],
               [withHero(hero(130, 42, 20)), 9, swadia, 9, 'Dengeli'],   // the report: read Kolay
               [withHero(hero(180, 55, 30)), 9, swadia, 9, 'Dengeli']);   // won 100 %: the fitted model is careful
    for(const [a, na, b, nb, want] of cases) {
        const got = label(a, na, b, nb), w = won(a, na, b, nb), bn = Array.isArray(b) ? 'mixed' : b;
        const an = Array.isArray(a) ? `${a[0]} + ${na - 1} villagers` : `${na} ${a}`;
        assert.strictEqual(got, want, `${an} vs ${nb} ${bn}: label ${got}, expected ${want} (won ${w} %)`);
        if(got === 'Kolay') assert.ok(w >= 85, `${an} vs ${nb} ${bn} reads Kolay but won ${w} %`);
        if(got === 'Çetin') assert.ok(w <= 15, `${an} vs ${nb} ${bn} reads Çetin but won ${w} %`);
    }
});

// --- The strength model against the real-engine record (2.11.0) ---
// docs/measurements/odds-data.json holds 600 matchups fought 32 times each in the real engine
// (tools/oddsfit.js --gen): single troops, footmen with bowmen at every share, riders, kingdoms'
// pools, bands' rosters, heroes with villagers. Battle's constants were fitted to it (--fit). This
// reads the record and holds the game's own model to it — no battle is fought, so it runs on
// every --fast too. If it fails, the formula or a troop's stats moved: re-fit, or say why not.
test('odds: the strength model agrees with the real-engine record', () => {
    const F = require('./oddsfit'), go = H.world({ seed: 1 });
    F.addHeroes(go);
    const data = F.load(), s = F.score(go, data);
    assert.ok(data.matchups.length >= 500, `the record holds only ${data.matchups.length} matchups`);
    assert.ok(s.loss <= 0.42, `log-loss ${s.loss.toFixed(4)} per fight against the record (fitted 0.405)`);
    const by = name => s.cases.filter(c => s.label(c.r) === name), avg = cs => cs.reduce((a, c) => a + c.w, 0) / cs.length;
    const [K, D, Z, C] = ['Kolay', 'Dengeli', 'Zorlu', 'Çetin'].map(by);
    assert.ok(avg(K) >= 0.93 && avg(C) <= 0.07, `Kolay won ${Math.round(avg(K) * 100)} %, Çetin ${Math.round(avg(C) * 100)} % on average`);
    assert.ok(avg(K) > avg(D) && avg(D) > avg(Z) && avg(Z) > avg(C), 'the labels are out of order against the record');
    // the tails: a label is a promise, and 32 fights a matchup leave room for luck, not for a miss
    const kLow = K.filter(c => c.w < 0.7).length, cHigh = C.filter(c => c.w > 0.3).length;
    assert.ok(kLow <= Math.ceil(K.length * 0.03) && cHigh <= Math.ceil(C.length * 0.03),
        `${kLow}/${K.length} Kolay matchups won under 70 %, ${cHigh}/${C.length} Çetin ones over 30 %`);
    // bowmen read true: no side wins more or less than the model says because it has archers
    // (before the fit a side with bowmen beat its odds by 0.5–1.3 on the logit, riders fell short)
    const { troopRow: tr } = require('./duel');
    const share = (side, type) => { const ex = F.expand(side); return ex.filter(x => tr(go, x).type === type).length / ex.length; };
    const logit = w => { const p = Math.max(0.02, Math.min(0.98, w)); return Math.log(p / (1 - p)); };
    const bias = f => { const cs = s.cases.filter(f); return cs.reduce((a, c) => a + logit(c.w) - s.beta * Math.log(c.r), 0) / cs.length; };
    for(const [what, f, lim] of [['bowmen on the player\'s side', c => share(c.m.a, 'archer') > 0, 0.35],
                                 ['bowmen on the other side', c => share(c.m.b, 'archer') > 0, 0.35],
                                 ['a side of bowmen alone', c => share(c.m.a, 'archer') === 1, 0.75],
                                 ['riders on the player\'s side', c => share(c.m.a, 'cavalry') > 0, 0.35],
                                 ['no bowmen at all', c => !share(c.m.a, 'archer') && !share(c.m.b, 'archer'), 0.35]]) {
        const b = bias(f);
        assert.ok(Math.abs(b) <= lim, `${what}: the record beats the model by ${b.toFixed(2)} on the logit`);
    }
});

// The record is only true while the engine is the one that fought it. A sample of it is fought
// again here; if the engine moved (a troop's stats, the AI, damage, terrain), this fails first —
// then `node tools/oddsfit.js --gen` and `--fit` bring the record and the constants back.
slow('odds: the record still matches the engine', () => {
    const F = require('./oddsfit'), go = H.world({ seed: 11 });
    F.addHeroes(go);
    const data = F.load(), sample = data.matchups.filter((_, i) => i % 20 === 7);
    let diff = 0;
    for(const m of sample) {
        const a = F.expand(m.a), b = F.expand(m.b);
        let w = 0, ok = 0;
        for(let i = 0; i < 24; i++) { const r = fight(go, a, b, a.length, b.length); if(r.won === null) continue; ok++; if(r.won) w++; }
        diff += Math.abs(w / Math.max(1, ok) - m.won / Math.max(1, m.fights));
    }
    diff /= sample.length;
    assert.ok(diff <= 0.1, `the engine strays ${Math.round(diff * 100)} points a matchup from the record — re-run tools/oddsfit.js --gen and --fit`);
});

// Bands weigh you as fighting men too (Game.strengthSeen): eight sergeants keep looters off,
// twenty raw villagers don't scare mountain brigands — heads to heads, both went the other way.
test('bandits come at you or keep off by strength, not by heads', () => {
    const go = H.world({ seed: 4 }), { Game: G, state: st } = go;
    st.time.day = 30;   // past the first fortnight's grace
    const party = (n, name) => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name, level: 1 }));
    const far = n => { n.x = st.player.x + 300; n.y = st.player.y; return n; };
    st.player.party = party(8, 'Svadya Çavuşu');
    const looters = far(G.createBand('bandit', 12));
    assert.ok(G.strengthSeen(looters) > 1.5, `eight sergeants read ${G.strengthSeen(looters).toFixed(2)} to twelve looters`);
    assert.strictEqual(G.isHostile(looters), false, 'twelve looters came at eight sergeants (they outnumber them)');
    st.player.party = party(20, 'Svadya Köylüsü');
    const brigands = far(G.createBand('mountain', 12));
    assert.ok(G.strengthSeen(brigands) < 1.5, `twenty villagers read ${G.strengthSeen(brigands).toFixed(2)} to twelve brigands`);
    assert.strictEqual(G.isHostile(brigands), true, 'twelve brigands kept off twenty raw villagers (outnumbered)');
    // the reading follows the party: upgrade the same twenty and it changes within the hour
    const before = G.strengthSeen(brigands);
    st.player.party = party(20, 'Svadya Çavuşu');
    assert.ok(G.strengthSeen(brigands) > before * 2, 'the same headcount, upgraded, still read as villagers (stale cache)');
});

// --- Who an enemy side is (2.11.0) ---
// Four quests built their raiders with a bare createNPC: no band, no kingdom. The odds label and
// the battle both fell through to Swadia's troop pool — militia, sergeants, knights — under a
// looter's name and a looter's brown, and eight villagers met them as "easy". The fix is one
// resolver (Battle.foeKind) read by both, and one door for bandits (Game.createBand); these
// tests hold every road back to the old hole shut, including roads a future quest might open.
test('roster: no bandit party is built outside Game.createBand', () => {
    const fs = require('fs'), path = require('path'), bad = [], root = path.join(__dirname, '..');
    // the game, and the tests and tools too: a bandless fixture fights as Swadia's army and hides
    // exactly the bug it should catch
    const dirs = d => fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.js')).map(f => path.join(d, f));
    for(const f of ['app.js', 'battle.js', 'nobles.js', 'quests.js', 'lair.js', 'forge.js', 'crafts.js', ...dirs('tools'), ...dirs('e2e'), ...dirs('e2e/specs')]) {
        const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
        src.split('\n').forEach((line, i) => {
            if(/^\s*\/\//.test(line)) return;   // prose about the rule isn't a breach of it
            if(/createNPC\([^)]*['"]bandit['"]/.test(line) && !/^\s*let npc = this\.createNPC\(name, 'bandit', size, color, null, 1\);\s*$/.test(line))
                bad.push(`${f}:${i + 1} ${line.trim()}`);
        });
    }
    assert.deepStrictEqual(bad, [], 'a bandit party with no band fights as a kingdom\'s army — use Game.createBand(kind, size, name, color)');
});

test('roster: the odds label and the battle deal from the same army', () => {
    const go = H.world({ seed: 6 }), { Battle: B, BAND_KINDS, TROOP_TREES, Debug, state: st } = go;
    st.player.currentEncounterNpcId = null;
    const foes = [
        ...Object.keys(BAND_KINDS).map(k => ({ name: BAND_KINDS[k].name, band: k })),    // a band under its own name
        ...Object.keys(BAND_KINDS).map(k => ({ name: 'Görev Çetesi', band: k })),        // a quest's raiders: own name, borrowed kind
        ...Object.keys(TROOP_TREES).map(f => ({ name: 'Lord Ordusu', faction: f })),
    ];
    const errs = Debug.errors.length;
    for(const npc of foes) {
        const weighed = new Set(B.enemyMix(npc, 14).map(r => r.name));
        B.start(npc.name, 14, null, npc.faction || '', null, false, npc.band || '');
        const fielded = B.units.concat(B.reserves.e || []).filter(u => !u.isPlayerTeam).map(u => u.name);
        const stray = [...new Set(fielded.filter(n => !weighed.has(n)))];
        assert.deepStrictEqual(stray, [], `${npc.name} (${npc.band || npc.faction}): the battle fielded men the odds label never weighed`);
    }
    B.active = false;
    assert.deepStrictEqual(Array.from(Debug.errors.slice(errs), e => e.msg), [], 'a real foe had nothing to deal from');
    // A side with neither a band nor a kingdom is a bug: logged, and dealt as looters, never as an army
    const kind = B.foeKind('Kimsesiz', null, null);
    assert.strictEqual(kind.band, BAND_KINDS.bandit, 'a nameless side fell through to a kingdom\'s pool');
    assert.ok(Debug.errors.slice(errs).some(e => e.kind === 'roster'), 'a side with nothing to deal from went unlogged');
});

// Generic over QUESTS: every quest is taken and its spawners are run, so a quest written next
// year that spawns its own enemies is covered without touching this test.
test('roster: every party a quest spawns has an army to deal from', () => {
    const g = questWorld({ seed: 5 }), { Quests, QUESTS, LOCATIONS, Battle: B, BAND_KINDS, Debug, Game, state } = g;
    const errs = Debug.errors.length, before = new Set(state.npcParties.map(n => n.id));
    for(const id of Object.keys(QUESTS)) {
        const d = QUESTS[id], giverId = giversFor(g, id)[0];
        if(!giverId || (!d.day && !d.on)) continue;
        const q = Quests.make(id, giverId);
        state.player.quests = [q];
        const at = LOCATIONS.find(l => l.id === (d.where ? d.where(q) : q.data && q.data.locId));
        if(at) { state.player.x = at.x; state.player.y = at.y; }
        for(let i = 0; i < 40 && !state.npcParties.some(n => n.questWave === q.id); i++) {
            if(d.day) d.day(q);
            if(at && d.on) d.on(q, 'entered_location', { locId: at.id, loc: at });
        }
        Game.closeModal();
    }
    const spawned = state.npcParties.filter(n => !before.has(n.id) && !n.wanderer && n.type !== 'lord' && n.lordId === undefined);
    assert.ok(spawned.filter(n => n.questWave).length >= 4, `only ${spawned.filter(n => n.questWave).length} quest parties spawned — the test isn't reaching the spawners`);
    for(const n of spawned) {
        if(n.type === 'bandit') assert.ok(BAND_KINDS[n.band], `${n.name} (quest ${n.questWave}) is a bandit with no band`);
        B.enemyMix(n, n.size || 1);
    }
    assert.deepStrictEqual(Array.from(Debug.errors.slice(errs).filter(e => e.kind === 'roster'), e => e.msg), [], 'a quest party had nothing to deal from');
});

// The map's hover tip reads every party on the map (Game.npcTipHtml → preyWarning → foeShare):
// bands, convoys, lords' hosts and wanderers. A wanderer has no roster and never fights, and the
// first 2.11.0 build weighed one there — e2e caught it, this catches it in a second.
test('roster: every party on the map can be read, wanderers included', () => {
    const g = H.world({ seed: 8 }), { Game, Debug, state } = g;
    H.run(g, 5);
    for(const w of Game.WANDERERS) { const n = Game.spawnWanderer(w.id); if(n) n.leaveDay = 1e9; }
    const errs = Debug.errors.length, kinds = new Set();
    for(const n of state.npcParties) { Game.npcTipHtml(n); kinds.add(n.wanderer ? 'wanderer' : n.trade ? 'trade' : n.type); }
    assert.ok(['wanderer', 'trade', 'bandit'].every(k => kinds.has(k)), `the map held only ${[...kinds]}`);
    assert.deepStrictEqual(Array.from(Debug.errors.slice(errs), e => e.msg), [], 'reading a map party logged an error');
});

test('roster: a one-on-one foe is dealt from no army and never rides', () => {
    const go = H.world({ seed: 7 }), { Battle: B, Debug } = go;
    const errs = Debug.errors.length;
    for(let i = 0; i < 40; i++) {
        B.startArena(i % B.ARENA_FOES.length);
        const e = B.units.find(u => !u.isPlayerTeam);
        // dealt from Swadia's pool until 2.11.0: a rider drawn there kept `mounted` as infantry
        assert.strictEqual(e.mounted, false, `arena foe ${e.name} rides (dealt as a mounted troop)`);
        assert.strictEqual(e.type, 'infantry');
    }
    B.isArena = B.isTourney = null; B.active = false;
    assert.deepStrictEqual(Array.from(Debug.errors.slice(errs), e => e.msg), []);
});

test('odds: easy prey, chatter and a defeat\'s renown read the foe\'s strength, not heads × level', () => {
    const go = H.world({ seed: 4 }), { Game: G, Battle: B, state: st } = go;
    const party = (n, name) => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name, level: 1 }));
    st.encounterSize = null; st.player.renown = 500;
    st.player.stats.level = 25;
    st.player.party = party(8, 'Svadya Köylüsü');
    const regulars = { name: 'Lord Ordusu', size: 9, faction: 'swadia' }, looters = { size: 4, band: 'bandit' };
    // heads × level said a level-25 hero's band was owed only 70 % for nine regulars: "easy prey"
    assert.strictEqual(G.preyWarning(regulars), '', 'nine Swadian regulars against eight villagers were called easy prey');
    st.player.party = party(14, 'Svadya Çavuşu');
    assert.ok(G.preyWarning(looters), 'four looters against fourteen sergeants are easy prey and the warning stayed silent');
    st.player.party = party(8, 'Svadya Köylüsü');
    assert.ok(G.defeatRenown(G.foeShare(regulars)) < G.defeatRenown(G.foeShare({ size: 3, band: 'bandit' })),
        'losing to the stronger side burned as much renown as losing to three looters');
    // one number under every readout: the label's ratio is the foe's share raised to −P
    assert.ok(Math.abs(Math.pow(G.oddsRatio(regulars), -1 / B.ODDS_P) - G.foeShare(regulars)) < 1e-9, 'the label and foeShare read different sides');
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
// A world where every quest's `can()` can pass (shared with the text sweep below).
function questWorld(opts) {
    const gq = H.world(opts);
    const { LOCATIONS, Game, state } = gq;
    // Achievements pay real money now (#132). This suite loops every quest type in one world,
    // so state.career.quests keeps climbing across sub-tests and quests_5/20/... would eventually
    // fire mid-loop, adding an unrelated payout right when some other quest's test asserts its
    // own reward was paid *exactly*. Earning achievements isn't what this suite is testing.
    Game.checkAchievements = () => {};

    // Preconditions a few quests gate on: enemy_muster needs a war on the map,
    // hostage_rescue needs a bandit party to rescue from. Declare war between every
    // AI faction pair and plant one bandit so every giver's `can()` can pass.
    const facs = Object.keys(gq.FACTIONS).filter(f => f !== 'player_kingdom');
    for(let i = 0; i < facs.length; i++)
        for(let j = i + 1; j < facs.length; j++) Game.declareWar(facs[i], facs[j]);
    if(!state.npcParties.some(n => n.type === 'bandit' && n.size > 0)) {
        const b = Game.createBand('bandit', 6, 'Çapulcu Reisi', '#8b0000');
        state.npcParties.push(b);
    }
    // An active AI siege so siege_provisions has a besieged fief to offer (its `can` gate).
    const siegeCity = LOCATIONS.find(l => l.type === 'city' && l.faction);
    if(siegeCity) {
        const sieger = Game.createNPC('Kuşatmacı', 'lord', 30, '#333', facs.find(f => f !== siegeCity.faction));
        sieger.siegeLocId = siegeCity.id;
        state.npcParties.push(sieger);
    }
    return gq;
}

// Who may give a quest: personality + the world's `can` precondition (the first, or all of them)
function giversFor(g, id, all = false) {
    const { QUESTS, LORDS, LOCATIONS, Quests } = g, d = QUESTS[id];
    if(d.givers.includes('guild')) return LOCATIONS.filter(l => l.type === 'city').slice(0, all ? 3 : 1).map(l => 'guild_' + l.id);
    const ok = LORDS.filter(x => (!d.givers.length || d.givers.includes(x.personality))
                              && (!d.can || d.can(Quests.giver(x.id)))).map(l => l.id);
    return all ? ok : ok.slice(0, 1);
}

function questSuite() {
    const gq = questWorld({ seed: 3 });
    const { Quests, QUESTS, LOCATIONS, LORDS, Nobles, Game, state } = gq;
    const loc = id => LOCATIONS.find(l => l.id === id);
    const enter = id => Quests.emit('entered_location', { locId: id, loc: loc(id) });
    const give = (itemId, qty) => state.player.inventory.push({ ...gq.ITEMS[itemId], qty });
    const bandNpc = band => { const n = Game.createBand(band, 4, 'Çete', '#888'); state.npcParties.push(n); return n; };

    const drivers = {
        butter_blockade: q => Quests.emit('bought_item', { locId: q.data.locId, itemId: 'cheese', qty: q.data.need }),
        sergeant_exam: q => {
            state.player.party = Array.from({ length: q.data.need }, (_, i) =>
                ({ id: 'v' + i, name: 'Svadya Şövalyesi', level: 21, type: 'cavalry' }));
            enter(q.data.locId);
        },
        hungry_army: q => { give('wheat', q.data.need); enter(q.data.locId); },
        brother_in_chains: q => Quests.emit('battle_won', { npcId: q.data.npcId }),
        fixed_match: q => Quests.emit('tournament_end', { won: false, wins: q.data.lo }),
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
        arena_champion: () => Quests.emit('tournament_end', { won: true, wins: 3 }),
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
        clear_lair: q => Game.clearLair(q.data.lairId),
        // the lair run emits this when the noble walks out of the exit with you (lair.js endGame)
        lair_captive: q => Quests.emit('lair_captive_freed', { lairId: q.data.lairId }),
        royal_courier: q => enter(q.data.locId),
        border_inspection: q => q.data.stops.forEach(enter),
        grain_levy: q => { Quests.emit('bought_item', { itemId:'wheat', qty:q.data.need, locId:q.data.locId }); enter(q.data.locId); },
        ale_for_feast: q => { give('ale', q.data.need); enter(q.data.locId); },
        ransom_column: q => { for(let i=0;i<q.data.need;i++) state.player.prisoners.push({ id:'r'+i, level:5 }); enter(q.data.locId); },
        bandit_bounty: q => { for(let i=0;i<q.data.need;i++) Quests.emit('battle_won', { npcId:'band'+i }); },
        veteran_guard: q => { state.player.party = Array.from({length:q.data.need}, (_,i) => ({id:'vg'+i,level:q.data.level})); enter(q.data.locId); },
        enemy_scout: q => q.data.stops.forEach(enter),
        diplomatic_round: q => q.data.lords.forEach(lordId => Quests.emit('talked_to', { lordId })),
        market_sampler: q => { LOCATIONS.filter(l=>l.type==='city').slice(0,q.data.need).forEach(l => Quests.emit('bought_item',{itemId:'wheat',qty:1,locId:l.id})); enter(q.data.home); },
        salt_run: q => { Quests.emit('bought_item',{itemId:'salt',qty:q.data.need,locId:q.data.home}); enter(q.data.home); },
        war_chest: q => { state.player.money = q.data.need; enter(q.data.locId); },
        fever_relief: q => { give('honey', q.data.need); enter(q.data.locId); },
        lady_escort: q => enter(q.data.locId),
        enemy_muster: q => enter(q.data.locId),
        border_dispute: q => q.data.lords.forEach(lordId => Quests.emit('talked_to', { lordId })),
        hostage_rescue: q => Quests.emit('battle_won', { npcId: q.data.npcId }),
        relay_packages: q => q.data.stops.forEach(enter),
        wolf_cull: q => { for(let i = 0; i < q.data.need; i++) Quests.emit('battle_won', { npcId: bandNpc('wolf').id }); },
        forest_ambush: q => { for(let i = 0; i < q.data.need; i++) Quests.emit('battle_won', { npcId: bandNpc('forest').id }); },
        outpost_defense: q => {
            const v = loc(q.data.locId);
            state.player.x = v.x; state.player.y = v.y;
            for(let i = 0; i < q.data.need; i++) Quests.emit('battle_won', { questWave: q.id });
        },
        debt_collector: q => q.data.debtors.forEach(lordId => Quests.emit('talked_to', { lordId })),
        rogue_company: q => Quests.emit('battle_won', { npcId: q.data.npcId }),
        shadow_dispatch: q => { enter(q.data.locId); enter(q.data.homeId); },
        merchant_convoy: q => enter(q.data.locId),
        siege_provisions: q => { give('wheat', q.data.need); enter(q.data.locId); },
        noble_hostage_exchange: q => { for(let i = 0; i < q.data.need; i++) state.player.prisoners.push({ id: 'nh' + i, level: 5 }); enter(q.data.locId); },
        mist_point: q => { enter(q.data.locId); Quests.emit('battle_won', { questWave: q.id }); }
    };
    assert.ok(!QUESTS.fog_dot, 'retired hidden-location quest is still in the offer pool');


    test('quest: every quest in the table has a test driver', () => {
        const missing = Object.keys(QUESTS).filter(id => !drivers[id]);
        assert.strictEqual(missing.length, 0, `quest with no driver: ${missing.join(', ')}`);
    });

    Object.keys(QUESTS).forEach(id => {
        test(`quest: ${id} completes in the real engine`, () => {
            const giverId = giversFor(gq, id)[0];
            assert.ok(giverId, 'nobody around can give this quest');
            // Every quest starts with a clean player: the previous quest's inventory shouldn't count
            state.player.quests = []; state.player.inventory = []; state.player.prisoners = [];
            state.player.party = []; state.player.money = 0;
            const q = Quests.make(id, giverId);
            state.player.quests.push(q);

            // The answer to "where" is either a real place (a settlement or a map site) or none at all
            const w = QUESTS[id].where && QUESTS[id].where(q);
            assert.ok(!w || Quests.place(w), `where() returned a place not on the map: ${w}`);
            // a quest whose text sends you to a lair pins that lair, not the castle beside it
            if(q.data.lairId) {
                const lair = Quests.place(q.data.lairId);
                assert.strictEqual(w, lair.id, 'the pin isn\'t on the lair the text names');
                assert.ok(Quests.taskHtml(q).includes(`📍 ${Quests.locName(lair.id)}`), 'the 📍 line names another place');
                assert.ok(Quests.daysTo(w) >= 1, 'no travel time to the lair');
                assert.ok(Quests.targets()[lair.id], 'no map pin on the lair');
            }
            assert.ok(QUESTS[id].desc(q).length > 10, 'desc is empty');

            drivers[id](q);
            // #107: meeting the objective no longer pays — it flips the quest to 'awaiting'
            // and the reward is collected by returning to the giver. Drive that hand-off:
            // pull the giver to the snapshot spot so `giverPresent` holds, then walk in.
            if(Quests.has(id) && q.state === 'awaiting') {
                const g = Quests.giver(q.giverId);
                if(!g.isGuild) {
                    const p = Nobles.partyOf(q.giverId), tl = loc(q.turnInLocId);
                    if(p && tl) { p.x = tl.x; p.y = tl.y; }
                }
                enter(q.turnInLocId);
            }
            assert.ok(!Quests.has(id), 'quest didn\'t finish — the driver\'s events don\'t reach the engine');
            // #167: handing in exactly what was asked empties the stack — and it leaves the bag
            const empty = state.player.inventory.find(i => !(i.qty > 0));
            assert.ok(!empty, `the hand-in left ${empty && empty.id} at qty ${empty && empty.qty} in the bag`);
            assert.strictEqual(state.player.money, Quests.money(QUESTS[id]), 'reward wasn\'t paid');
        });
    });
}
questSuite();

// The drivers above check that each quest can finish; none reads what the player is told on the
// way. Every quest is offered by every lord allowed to give it, in several worlds, and each text
// it shows — the offer window, the quest list while active, a few days on, and once it waits for
// its hand-in — must not carry a hole: `undefined`, `NaN`, a `{0}` left unfilled, an object
// printed whole, a place its id no longer finds ('?'), or (EN) a key missing from the dictionary.
slow('quest: every quest text, from every giver, in TR and EN, has no hole', () => {
    const found = new Map();
    let texts = 0;
    for(const lang of ['tr', 'en']) for(const seed of [1, 2, 3, 4]) {
        const g = questWorld({ seed, lang });
        const { Quests, QUESTS, Game, I18N, state, Debug } = g;
        const doc = g._sandbox.document;
        const check = (html, where) => {
            texts++;
            const text = html.replace(/<[^>]+>/g, ' ');
            const bad = /\bundefined\b|\bNaN\b|\{\d\}|\[object Object\]/.exec(text)
                     || /<b>\?<\/b>|📍 \?/.exec(html);
            if(bad) found.set(`${where}: ${text.slice(Math.max(0, bad.index - 60), bad.index + 30).replace(/\s+/g, ' ')}`, 1);
            if(I18N.missing.size) { found.set(`${where}: missing EN key ${[...I18N.missing].join(' | ')}`, 1); I18N.missing.clear(); }
            if(Debug.errors.length) { found.set(`${where}: ${Debug.errors[0].msg}`, 1); Debug.errors.length = 0; }
        };
        const listed = where => { Quests.render(); check(doc.getElementById('quest-list').innerHTML, where); };
        state.player.quests = [];
        for(const id of Object.keys(QUESTS)) for(const giverId of giversFor(g, id, true)) {
            const at = `${lang} seed ${seed} ${id} from ${giverId}`;
            const q = Quests.make(id, giverId);
            state.questOffers = { [giverId]: q };           // offerMenu shows this pinned offer
            Quests.offerMenu(giverId);
            check(doc.getElementById('modal-body').innerHTML, at + ' offer');
            Game.closeModal();
            if(!state.player.quests.some(x => x.id === id)) state.player.quests.push(q);   // one of each in the list
        }
        state.questOffers = {};
        listed(`${lang} seed ${seed} list`);
        H.run(g, 3);                                        // days pass: day() ticks, counters move
        listed(`${lang} seed ${seed} list, 3 days on`);
        for(const q of state.player.quests) { q.state = 'awaiting'; q.turnInLocId = Quests.turnInLoc(q); }
        listed(`${lang} seed ${seed} list, awaiting`);
    }
    assert.ok(texts > 300, `only ${texts} texts read`);
    assert.ok(!found.size, [...found.keys()].slice(0, 15).join('\n    '));
});

// The drivers above emit quest events themselves, so they prove the engine, not the game: a
// quest listening for an event the game never sends, or reading a field the game never fills,
// passes them and can never finish in play. The minigame's old tournament mode sent
// `tournament_end` without the `wins` the fixed-match quest reads — it failed on every entry.
// This reads both sides of the contract: every `Quests.emit('x', { … })` in the game against
// every `on()` body in quests.js.
test('quest: every event a quest waits for is sent by the game, with the fields it reads', () => {
    const fs = require('fs'), path = require('path');
    const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    const sent = {};
    for(const f of ['app.js', 'battle.js', 'nobles.js', 'lair.js', 'map-art.js'])
        for(const [, ev, body] of read(f).matchAll(/Quests\.emit\('(\w+)',\s*\{([^{}]*)\}\)/g))
            body.split(',').map(p => (/^\s*(\w+)\s*(?::|$)/.exec(p) || [])[1]).filter(Boolean)
                .forEach(k => (sent[ev] = sent[ev] || new Set()).add(k));
    const src = read('quests.js'), bad = [];
    for(const m of src.matchAll(/\bon\(q, ev, d\)\s*\{/g)) {
        let i = m.index + m[0].length, depth = 1;
        for(; depth; i++) depth += src[i] === '{' ? 1 : src[i] === '}' ? -1 : 0;
        const body = src.slice(m.index, i), line = src.slice(0, m.index).split('\n').length;
        const evs = [...body.matchAll(/ev [!=]== '(\w+)'/g)].map(x => x[1]);
        evs.filter(e => !sent[e]).forEach(e => bad.push(`quests.js:${line} waits for '${e}', which the game never sends`));
        const has = new Set(evs.flatMap(e => [...(sent[e] || [])]));
        [...new Set([...body.matchAll(/\bd\.(\w+)/g)].map(x => x[1]))].filter(k => !has.has(k))
            .forEach(k => bad.push(`quests.js:${line} reads d.${k}, which no '${evs.join("'/'")}' the game sends carries`));
    }
    assert.ok(Object.keys(sent).length >= 10, `only ${Object.keys(sent).length} emitted events found — the scan broke`);
    assert.ok(!bad.length, `${bad.length} broken: ${bad.join(' · ')}`);
});

// The money-pump hunt's first find (tools/exploits.js): greeting the hall takes four hours, and
// on a feast's last evening that crosses midnight and ends it. The gate still showed "join the
// feast", and pressing it read the faction of a feast that was gone.
test('feast: the gate\'s join button after the feast ended says so, and the gate redraws', () => {
    const w = H.world({ seed: 4 });
    const { Game, Feast, state, LOCATIONS } = w;
    const c = LOCATIONS.find(l => l.type === 'city' && l.faction);
    state.player.renown = 500;
    Object.assign(state.player, { x: c.x, y: c.y });
    state.feast = { faction: c.faction, locId: c.id, endDay: state.time.day + 1, greeted: [] };
    state.time.hour = 22;
    const ac = w._sandbox.document.getElementById('settlement-actions'), cards = () => ac.children.flatMap(sec => sec.lastChild.children);
    Game.enterLocation(c);
    const join = cards().find(b => /Şölene Katıl/.test(b.innerHTML));
    assert.ok(join, 'no join button while the feast is on');
    Feast.open(c); Feast.greetAll();
    assert.strictEqual(state.feast, null, 'the greeting didn\'t carry the feast past its end');
    join.onclick();
    assert.ok(/Şölen sona ermiş/.test(w._sandbox.document.getElementById('modal-body').innerHTML), 'the ended feast wasn\'t announced');
    assert.ok(!cards().some(b => /Şölene Katıl/.test(b.innerHTML)), 'the gate still offers the ended feast');
});

// The lords' and ladies' dialogues are a web of buttons no test walked (the coverage map: asking
// where someone is, small talk, gifts, insults, poems, dowry haggling, rivals, feasts). This walks
// it the way a player does — open a dialogue, press a button the window shows, again — on seeded
// random paths from states that open the deep branches, with the world in English, and fails on
// a throw, a Debug error, a key missing from the dictionary or broken text in the window.
test('dialogues: seeded walks through every lord and lady window stay clean (EN)', () => {
    const vm = require('vm');
    const w = H.world({ seed: 5, lang: 'en' });
    const { Game, Nobles, Feast, state, LORDS, LADIES, LOCATIONS, I18N, Debug, Battle } = w;
    Game.checkAchievements = () => {};
    const POEMS = vm.runInContext('POEMS', w._ctx), rnd = H.mulberry32(77);
    const body = () => w._sandbox.document.getElementById('modal-body').innerHTML;
    const unesc = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    const buttons = () => [...body().matchAll(/onclick="([^"]*)"/g)].map(m => unesc(m[1]))
        .filter(h => !/this\.|location\.|Save\.(del|wipe|toFile)|Debug\.download|install|Fullscreen/.test(h));
    const found = new Map(), note = (k, path) => found.has(k) || found.set(k, path.join(' > '));
    Object.assign(state.player, { money: 100000, renown: 800 });
    const starts = [...LORDS.slice(0, 12), ...LADIES.slice(0, 8)].map(l => l.id);
    let steps = 0;
    for(let walk = 0; walk < 400; walk++) {
        const id = starts[walk % starts.length], n = Nobles.any(id);
        const home = LOCATIONS.find(l => l.id === n.homeLocId) || LOCATIONS[0], party = Nobles.partyOf(id);
        Nobles.addRel(id, (walk % 3) * 20 - 10);
        Object.assign(state.player, { x: home.x, y: home.y, status: 'idle' });
        if(party) Object.assign(party, { x: home.x, y: home.y });
        // the states the deep branches need: poems known, a tournament to dedicate, a lady taken
        // with you, a spouse, a heroine (courted by lords), a feast in the hall
        const v = walk % 5, lady = n.guardianId !== undefined;
        state.player.poems = v ? POEMS.map(p => p.id) : [];
        state.pendingDedication = v === 1;
        if(lady) state.affection[id] = v >= 2 ? 70 : 20;
        state.player.spouse = v === 3 && lady ? id : null;
        (state.player.background = state.player.background || {}).gender = v === 4 ? 'female' : 'male';
        state.feast = v === 4 ? { faction: n.faction, locId: home.id, endDay: state.time.day + 4, greeted: [] } : null;
        const path = [v === 4 ? `Feast.open(${home.id})` : `Nobles.talk(${id}) v${v}`];
        try { if(v === 4) Feast.open(home); else Nobles.talk(id); } catch(e) { note('throw ' + e.message, path); continue; }
        for(let d = 0; d < 7; d++) {
            const bs = buttons();
            if(!bs.length) break;
            const h = bs[Math.floor(rnd() * bs.length)], errs = Debug.errors.length, miss = I18N.missing.size;
            path.push(h.slice(0, 70));
            try { vm.runInContext(`(function(event){ ${h} }).call({}, { stopPropagation(){}, preventDefault(){}, target: {} })`, w._ctx); steps++; }
            catch(e) { note('throw ' + e.message, path); break; }
            if(Debug.errors.length > errs) note('Debug.errors ' + Debug.errors[Debug.errors.length - 1].msg, path);
            if(I18N.missing.size > miss) note('missing EN key ' + [...I18N.missing].pop(), path);
            const text = body().replace(/<[^>]+>/g, ' '), bad = /\bundefined\b|\bNaN\b|\{\d\}|\[object Object\]/.exec(text);
            if(bad) note('broken text ' + text.slice(Math.max(0, bad.index - 50), bad.index + 30).replace(/\s+/g, ' '), path);
            if(Battle.active) { Battle.active = false; break; }   // a duel starts a real fight: the walk ends at its gate
        }
        Game.closeModal();
    }
    assert.ok(steps > 1500, `only ${steps} buttons pressed — the walk isn't getting into the dialogues`);
    assert.ok(!found.size, [...found].map(([k, p]) => `${k}\n      after ${p}`).join('\n    '));
});

// Three quests are won by waves their own day() sends — and the drivers above emit battle_won
// straight at the engine, so no test had ever run a day() (the coverage map's biggest quest gap).
// Here the world runs: the day spawns the wave, the wave comes, a real auto-resolved battle
// beats it, battle.js emits the win with the wave's tag, and the giver pays at the gate.
slow('quest: the wave quests play through their own days, battles and hand-in', () => {
    const played = {};
    for(const id of ['harvest_watch', 'outpost_defense', 'merchant_convoy']) {
        const w = H.world({ seed: 11 });
        const { Game, Battle, Quests, QUESTS, LORDS, LOCATIONS, Nobles, state } = w;
        Game.checkAchievements = () => {};
        const giver = LORDS.find(l => QUESTS[id].givers.includes(l.personality));
        const q = Quests.make(id, giver.id);
        state.player.quests.push(q);
        state.player.party = Array.from({ length: 40 }, (_, i) => ({ id: 'w' + i, name: 'Svadya Şövalyesi', level: 25, xp: 0, xpNext: 999 }));
        state.player.money = 5000;
        const post = LOCATIONS.find(l => l.id === q.data.locId);
        // on guard next to the post; the convoy walks from wherever it is
        const stand = id === 'merchant_convoy' ? LOCATIONS.find(l => l.id === giver.homeLocId) : post;
        let fights = 0;
        // The convoy's ambush is a 15% daily roll: about one run in six has none in 12 days, and
        // which seed gets which drifts with any change to the world. Roll it once here (the dice
        // held at 0), so the fight path always plays.
        if(id === 'merchant_convoy') {
            Object.assign(state.player, { x: stand.x + 40, y: stand.y });
            const M = require('vm').runInContext('Math', w._ctx), roll = M.random;
            M.random = () => 0;
            try { QUESTS[id].day(q); } finally { M.random = roll; }
            Game.closeModal();
            assert.ok(q.data.ambushed, 'merchant_convoy: the held dice raised no ambush');
        }
        H.run(w, QUESTS[id].days - 1, () => {
            Object.assign(state.player, { x: stand.x + 40, y: stand.y, status: 'idle', targetLocation: null });
            state.npcParties.filter(n => n.questWave === q.id && n.size > 0).forEach(n => {
                state.player.currentEncounterNpcId = n.id;
                Battle.start(n.name, n.size, null, '', null, true, null);
                Game.closeModal(); fights++;
            });
            if(id === 'merchant_convoy' && q.data.cleared && q.state === 'active') Game.enterLocation(post);
        });
        assert.strictEqual(q.state, 'awaiting', `${id}: not finished after its days (${fights} fights, data ${JSON.stringify(q.data)})`);
        // the giver collects wherever the trail says — once his army is back on the map: a lord
        // routed in a war while you stood guard regroups in 4–10 days (the world, not the quest)
        for(let d = 0; d < 12 && !Nobles.partyOf(giver.id); d++) H.run(w, 1);
        const p = Nobles.partyOf(giver.id), at = LOCATIONS.find(l => l.id === q.turnInLocId);
        assert.ok(p, `${id}: the giver's army never came back`);
        Object.assign(p, { x: at.x, y: at.y });
        const before = state.player.money;
        Game.enterLocation(at);
        assert.ok(!Quests.has(id), `${id}: not handed in at ${at.id}`);
        assert.ok(state.player.money >= before + Quests.money(QUESTS[id]), `${id}: reward not paid`);
        played[id] = fights;
    }
    assert.ok(played.harvest_watch >= 2 && played.outpost_defense >= 3 && played.merchant_convoy >= 1, JSON.stringify(played));
});

// A "find and defeat this exact bandit gang" quest (brother_in_chains and its two siblings)
// keeps its narrative meaning — the tracked party stays a specific target (#132) — but it's
// no longer allowed to just vanish out from under the quest: setup() marks it `questLocks++`,
// which banditTick() must respect (a lost raid batters it instead of disbanding it), and
// complete()/fail() must release the lock again once the quest is off the books either way.
test('quest: a bandit gang locked by a quest survives a lost raid, and the lock releases after', () => {
    const gq2 = H.world({ seed: 7 });
    const { Quests, QUESTS, LORDS, Game, state } = gq2;
    state.player.quests = []; state.player.money = 0;
    // brother_in_chains.setup() picks the *largest* current bandit party — clear the world's
    // own generated ones so this test's own party is unambiguously the one tracked.
    state.npcParties = state.npcParties.filter(n => n.type !== 'bandit');
    const b = Game.createBand('bandit', 6, 'Çapulcu Reisi', '#8b0000');
    state.npcParties.push(b);
    const giver = LORDS.find(l => QUESTS.brother_in_chains.givers.includes(l.personality));
    const q = Quests.make('brother_in_chains', giver.id);
    state.player.quests.push(q);
    assert.strictEqual(q.data.npcId, b.id, 'setup should have tracked this exact bandit party');
    assert.strictEqual(b.questLocks, 1, 'the tracked party should be locked once');

    // Still the exact match it always was — a win against some other bandit party doesn't count.
    const other = Game.createBand('bandit', 5, 'Başka Çete', '#888');
    state.npcParties.push(other);
    Quests.emit('battle_won', { npcId: other.id });
    assert.strictEqual(q.state, 'active', 'a different bandit party should not complete the quest');

    // A raid loss that would normally disband a small band (banditTick, size < 4 -> 0 and
    // removed) instead just batters a locked one down to a floor of 1 — it survives.
    b.size = 3;
    const caravan = Game.createNPC('Kervan', 'caravan', 50, '#4a7');
    caravan.trade = { kind: 'caravan' };
    caravan.x = b.x; caravan.y = b.y;
    state.npcParties.push(caravan);
    Game.banditTick();
    assert.ok(state.npcParties.includes(b) && b.size > 0,
        'a quest-locked bandit party should not be wiped out by a lost raid');

    // Completing the quest releases the lock — the band goes back to being an ordinary,
    // vulnerable bandit party once the quest is done.
    Quests.emit('battle_won', { npcId: b.id });
    assert.strictEqual(q.state, 'awaiting', 'the exact tracked party should still complete the quest');
    Quests.complete(q);
    assert.strictEqual(b.questLocks, 0, 'the lock should be released once the quest is complete');
});

// A wolf pack smells a big army from farther than you can see it and outruns a foot column:
// a player asked to rescue a hostage from one followed the marker for 20 days and never met it.
test('quest: a "find this gang" quest never names a wolf pack', () => {
    const w = H.world({ seed: 3 });
    const { Quests, QUESTS, LORDS, Game, state } = w;
    state.npcParties = state.npcParties.filter(n => n.type !== 'bandit');
    const wolves = [Game.spawnBand('wolf'), Game.spawnBand('wolf')];
    wolves[0].size = 40;   // the largest band: brother_in_chains would have picked it
    for(const id of ['brother_in_chains', 'hostage_rescue', 'rogue_company']) {
        if(QUESTS[id].can) assert.ok(!QUESTS[id].can(), `${id} should not be offered with only wolf packs around`);
    }
    const gang = Game.spawnBand('bandit');
    for(const id of ['brother_in_chains', 'hostage_rescue', 'rogue_company']) {
        const giver = LORDS.find(l => QUESTS[id].givers.includes(l.personality));
        for(let i = 0; i < 10; i++) assert.strictEqual(Quests.make(id, giver.id).data.npcId, gang.id, `${id} named a wolf pack`);
    }
});

test('quests: a finished job says so everywhere the player looks for it (#106)', () => {
    // The hand-in used to hide behind the same "any work for me?" button, and the map marked a
    // finished job exactly like an open one — the player had no cue that a reward was waiting.
    const g = H.world({ seed: 34 });
    const { Quests, Nobles, LORDS, state } = g;
    state.player.quests = [];
    const lord = LORDS.find(l => Nobles.partyOf(l.id));
    const open = Quests.make('lost_letter', LORDS.find(l => l.id !== lord.id).id);
    const q = Quests.make('butter_blockade', lord.id);
    state.player.quests.push(open, q);
    assert.ok(!/primary/.test(Quests.askBtn(lord.id, 'x')), 'an open quest already offers a hand-in');
    Quests.markDone(q);
    assert.ok(/primary/.test(Quests.askBtn(lord.id, 'x')) && /Quests\.offerMenu/.test(Quests.askBtn(lord.id, 'x')),
        'the giver\'s dialogue does not offer the hand-in');
    const marks = Object.values(Quests.targets()).flat();
    assert.deepStrictEqual(marks.map(x => x.done).sort(), [false, true], 'the map marks the finished job like an open one');
    Quests.render();
    const list = g._sandbox.document.getElementById('quest-list');
    if(list) assert.ok(list.innerHTML.indexOf('Tereyağı') < list.innerHTML.indexOf('Mektup'), 'the waiting reward is not at the top');
    const before = state.player.money;
    Quests.offerMenu(lord.id);
    assert.ok(state.player.money > before && !state.player.quests.includes(q), 'handing in through the dialogue does not pay');
    assert.ok(!Quests.awaiting(), 'the quest still reads as waiting after the hand-in');
});

test('achievements: Bir Dalda Usta counts earned levels, not the background\'s head start (#135)', () => {
    const g = H.world({ seed: 12 });
    const { Game, state } = g;
    Game.creation = { sel: { gender: 'male', birth: 'nord', father: 'smith', job: 'merc' } };
    Game.applyCreation();                                  // smith +1, mercenary +2 one-handed
    assert.strictEqual(state.player.proficiencies.oneHanded.level, 4);
    const got = () => { Game.checkAchievements(); return !!state.achievements.prof_master; };
    assert.ok(!got(), 'the achievement unlocked on day one from the background alone');
    state.player.proficiencies.oneHanded.level = 8;
    assert.ok(got(), 'four earned levels on top of the head start did not count');
});

test('achievements: fifty of them, each new one reachable through its own hook (#127)', () => {
    const g = H.world({ seed: 12 });
    const { Game, Battle, state, ITEMS, LOCATIONS, ACHIEVEMENTS } = g;
    assert.strictEqual(ACHIEVEMENTS.length, 50, 'the list is not fifty long');
    assert.strictEqual(new Set(ACHIEVEMENTS.map(a => a.id)).size, 50, 'two achievements share an id');
    const got = id => { Game.checkAchievements(); return !!state.achievements[id]; };
    const troops = (n, name) => Array.from({ length: n }, (_, i) => ({ id: name[0] + i, name, level: 1, xp: 0, xpNext: 8 }));

    // A real fought battle: 25 foes against ten and you, every one on the field felled by your hand.
    state.player.party = troops(10, 'Svadya Milisi');
    Battle.start('Çapulcular', 25);
    const me = Battle.units.find(u => u.id === 'player');
    Battle.units.filter(u => !u.isPlayerTeam).forEach(u => { u.hp = 0; Battle.logKill(u, me); });
    Battle.active = false;
    Battle.endBattle(true);
    ['first_blood', 'odds_2', 'flawless'].forEach(id => assert.ok(got(id), `${id} did not unlock from a real battle`));
    assert.ok(!got('odds_3'), 'odds of 25 to 11 counted as threefold');
    // The rest of the battle ones through the same summary endBattle hands over.
    Game.careerBattle({ won: true, kills: 0, slain: 1000, foes: 33, own: 11, killed: 1, surgery: 5 });
    ['odds_3', 'butcher', 'surgeon'].forEach(id => assert.ok(got(id), `${id} did not unlock`));
    while(state.career.battles < 50) Game.careerBattle({ won: false, kills: 0, slain: 0, foes: 5, own: 5, killed: 0, surgery: 0 });
    assert.ok(got('survivor'), 'survivor did not unlock at 50 battles');

    // Promotion to the top of a tree, then ten of them at once.
    state.player.party = troops(1, 'Svadya Milisi'); state.player.party[0].xp = 8; state.player.money = 5000;
    Game.promoteTroop('Svadya Milisi', 'Svadya Çavuşu', 100);
    assert.ok(got('drillmaster'), 'promoting to the top rank did not count');
    assert.ok(!got('elite_10'), 'one elite counted as ten');
    state.player.party = troops(10, 'Svadya Çavuşu');
    assert.ok(got('elite_10'), 'ten elite troops did not count');

    // The peddler, both ways.
    const peddler = Game.ROAD_EVENTS.find(e => e.id === 'peddler');
    const deal = (scam, detect) => Object.assign(Game.eventCtx(), { _peddler: { scam, detect, price: 300 } });
    peddler.choices[1].run(deal(true, true));
    peddler.choices[0].run(deal(true, false));
    ['scam_caught', 'scammed'].forEach(id => assert.ok(got(id), `${id} did not unlock`));

    state.player.money = 0; state.player.wageDebt = 5;
    assert.ok(got('broke'), 'an empty purse with wage debt did not count');
    state.player.money = 5000; state.player.wageDebt = 0;

    // Prisoners: sold and set free through the party-screen actions.
    const captives = (n, name) => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name, level: 1 }));
    state.player.prisoners = captives(200, 'Çapulcu');
    Game.sellPrisoners();
    state.player.prisoners = captives(50, 'Haydut');
    Game.releasePrisoners('Haydut');
    ['slaver', 'merciful'].forEach(id => assert.ok(got(id), `${id} did not unlock`));

    // Towers: ten climbs (the map only has three, and they renew).
    const tower = state.sites.find(s => s.kind === 'tower');
    for(let i = 0; i < 10; i++) { tower.usedDay = -999; Game.investigateSite(tower.id); Game.towerReveal = null; }
    assert.ok(got('tower_10'), 'ten tower climbs did not count');

    // Every settlement's gate.
    LOCATIONS.forEach(l => { Game.enterLocation(l); Game.closeModal(); });
    assert.ok(got('cartographer'), 'visiting every settlement did not count');

    // A winter with coal to spare every day, then the thaw.
    state.player.party = troops(9, 'Svadya Milisi');
    state.player.inventory = [{ ...ITEMS.coal, qty: 40 }];
    for(let d = 101; d <= 121; d++) { state.time.day = d; Game.winterTick(); }
    assert.ok(got('winter_child'), 'a warm winter did not count');

    // Walking the hail and reaching a roof before the first hour struck anyone.
    Game.startStorm(true); Game.enterLocation(LOCATIONS[0]); Game.closeModal();
    assert.ok(got('hail_walker'), 'walking the hail without a loss did not count');

    // Ten arena wins in a row — past the purse series, which resets at five.
    for(let i = 0; i < 10; i++) Game.finishArena({ name: 'Rakip', xp: 5 }, true);
    assert.ok(got('arena_king'), 'ten arena wins in a row did not count');
});

test('wait: world parties receive the same fourfold camping acceleration as the clock', () => {
    const g = H.world({ seed: 33 });
    const { Game, state } = g;
    state.player.wait = null;
    assert.strictEqual(Game.npcWorldDelta(0.5), 0.5 * Game.TIME_FLOW);
    state.player.wait = { until: 99 };
    assert.strictEqual(Game.npcWorldDelta(0.5), 0.5 * Game.TIME_FLOW * Game.WAIT_SCALE);
});

test('wait: map orders cannot cancel a running camp', () => {
    const g = H.world({ seed: 38 });
    const { Game, state } = g;
    state.player.status = 'waiting';
    state.player.wait = { until: 99 };
    Game.setTarget({ x:state.player.x + 500, y:state.player.y + 500 });
    assert.strictEqual(state.player.status, 'waiting');
    assert.strictEqual(state.player.targetLocation, null, 'a map order escaped the camp lock');
});

// A round's team line-up was hung on the opponent inside state.tourney, holding other fighters of
// the same bracket; by the semi-final two of them pointed at each other and every save failed until
// the tournament ended (monkey 9605: "Converting circular structure to JSON").
test('tournament: a bracket played through its rounds still saves', () => {
    const { Game, Battle, Save, state, LOCATIONS } = H.world({ seed: 42 });
    const city = LOCATIONS.find(l => l.type === 'city');
    // the line-ups are shuffled: one bracket in four closed the circle, twenty make it certain
    for(let bracket = 0; bracket < 20; bracket++) {
        state.activeTournaments[city.id] = true;
        Game.joinTournament(city);
        Game.startTournament();
        for(let round = 0; round < 3; round++) {
            Game.tourneyFight();
            assert.ok(Battle.active, `round ${round} did not start a fight`);
            assert.doesNotThrow(() => JSON.stringify(Save.snapshot()), `bracket ${bracket}: no save in round ${round}`);
            Battle.active = false;
            Battle.endBattle(true);
            Game.closeModal();
        }
        assert.ok(state.tourney.champion && state.tourney.champion.you, 'the player won every round and was not crowned');
        Game.tourneyClose();
    }
});

// Losing to a pack once ran the whole captivity: wolves guarding you in chains for days, taking
// 60-90% of the purse and asking a ransom. A band still takes you, and the panel's countdown follows the days.
test('defeat: a wolf pack scatters you but keeps no captive and no purse; a band takes you', () => {
    const g = H.world({ seed: 42 }), { Game, Battle, state, BAND_KINDS } = g;
    const lose = band => {
        const npc = state.npcParties.find(n => n.type === 'bandit' && n.band === band);
        assert.ok(npc, `no ${band} band in the world`);
        Object.assign(state.player, { money: 1000, currentEncounterNpcId: npc.id, status: 'idle', prisoner: null });
        Battle.start(npc.name, npc.size, null, '', null, false, npc.band);
        Battle.endBattle(false);
        Game.closeModal();
    };
    const pack = Object.keys(BAND_KINDS).find(k => BAND_KINDS[k].beast);
    lose(pack);
    assert.strictEqual(state.player.prisoner, null, 'the pack took a prisoner');
    assert.strictEqual(state.player.money, 1000, 'the pack took money');
    assert.strictEqual(state.player.party.length, 0);
    // ...and has had its fill: standing right beside the wounded hero it doesn't jump him again
    // (without captivity it did, over and over), until a day has gone by
    const wolves = state.npcParties.find(n => n.band === pack && n.fedLeft > 0);
    assert.ok(wolves, 'the pack that won was not marked fed');
    const beside = () => Object.assign(state.player, { x: wolves.x + 10, y: wolves.y, targetLocation: null, currentEncounterNpcId: null });
    beside();
    assert.ok(!Game.npcCanInitiateEncounter(wolves), 'the fed pack jumps the hero again at once');
    for(let h = 0; h < 25; h++) Game.updateNPCs(1);
    state.player.graceLeft = 0;   // the hero's own grace day after a defeat has its own test
    beside();
    assert.ok(Game.npcCanInitiateEncounter(wolves), 'a day later the pack is still fed');
    lose('bandit');
    assert.ok(state.player.prisoner && state.player.money < 1000, 'a band no longer takes you');
    state.player.prisoner.daysLeft = 5;
    Game.renderPrisonerUI();
    Game.dailyUpdate();
    assert.ok(/Kalan süre: <b>4<\/b>/.test(g._sandbox.document.getElementById('prisoner-info').innerHTML), 'the countdown on the panel did not move');
});

// A defeat used to cost ~98 % of the purse (60–90 % on the field, a 75–90 % ransom of the rest), the
// freed hero lost to the next band in sight, and healing took ~18 days (playtest 2.11.3).
test('defeat: a capture costs at most ~2/3 of the purse, the freed hero has a day of grace, rest heals 3×', () => {
    const g = H.world({ seed: 42 }), { Game, Battle, state } = g;
    state.player.money = 1000;
    assert.ok(Math.abs(Game.defeatLootRatio() - 0.4) < 1e-9, 'no treasury: 40 % is the field loss');
    const band = state.npcParties.find(n => n.type === 'bandit' && !g.BAND_KINDS[n.band].beast);
    Object.assign(state.player, { currentEncounterNpcId: band.id, status: 'idle', prisoner: null });
    Battle.start(band.name, band.size, null, '', null, false, band.band);
    Battle.endBattle(false);
    Game.closeModal();
    assert.strictEqual(state.player.money, 600);
    const ransom = state.player.prisoner.ransomRequired;
    assert.ok(ransom >= 0.3 && ransom <= 0.45, `ransom ${ransom}`);
    for(let i = 0; i < 5; i++) Game.refuseRansom(0);   // refusals raise it, up to the cap
    assert.ok(!state.player.prisoner || state.player.prisoner.ransomRequired <= Game.RANSOM_MAX);
    if(state.player.prisoner) Game.payRansom(Math.floor(state.player.money * state.player.prisoner.ransomRequired));
    Game.closeModal();
    assert.ok(state.player.money >= 600 * (1 - Game.RANSOM_MAX) - 1, `the ransom took ${600 - state.player.money}`);
    // free, and nobody jumps the hero for a day — not even a band standing next to them
    assert.strictEqual(state.player.graceLeft, Game.DEFEAT_GRACE_HOURS);
    const other = state.npcParties.find(n => n.type === 'bandit' && n.id !== band.id);
    const beside = () => Object.assign(state.player, { x: other.x + 10, y: other.y, targetLocation: null });
    beside();
    assert.ok(!Game.npcCanInitiateEncounter(other) && !Game.menaces(other), 'a band jumped the hero in the grace day');
    state.player.targetLocation = { isNpc: true, id: other.id };
    assert.ok(Game.npcCanInitiateEncounter(other), 'the hero could not attack in the grace day');
    Game.advanceTime(Game.DEFEAT_GRACE_HOURS + 1);
    beside();
    assert.ok(Game.npcCanInitiateEncounter(other), 'the grace never ended');
    // three times the healing while waiting in a town
    const heal = wait => {
        Object.assign(state.player.stats, { hp: 10, regenAcc: 0 }); state.player.wasHungry = false;
        state.player.wait = wait ? { until: 1e9 } : null;
        for(let h = 0; h < 24; h++) Game.regenTick();
        state.player.wait = null;
        return state.player.stats.hp - 10;
    };
    assert.strictEqual(heal(true), 3 * heal(false));
});

// A band that robbed a caravan carries its load (302 coal in a playtest): winning it put the party at
// six times its pack, 1.4% speed, ~54 days from the nearest town, and nothing could be left behind.
test('loot: an overflowing win says so, and the bag can leave a stack on the road', () => {
    const g = H.world({ seed: 42 }), { Game, Battle, state } = g;
    const npc = state.npcParties.find(n => n.type === 'bandit');
    npc.cargo = [{ id: 'iron', qty: Game.cargoCap() * 6 }];
    Object.assign(state.player, { currentEncounterNpcId: npc.id, status: 'idle', inventory: [] });
    Battle.start(npc.name, npc.size, null, '', null, false, npc.band);
    Battle.endBattle(true);
    assert.ok(Game.cargoMult() < 0.05, 'the load did not overflow');
    assert.ok(/🎒 Çanta taşıyor/.test(g._sandbox.document.getElementById('modal-body').innerHTML), 'the victory screen kept quiet about the load');
    Game.closeModal();
    state.player.inventory.push({ ...g.ITEMS.kurt_disi_hancer, qty: 1 });
    Game.renderInventoryScreen();
    const html = g._sandbox.document.getElementById('inventory-content').innerHTML;
    assert.ok(html.includes('Game.dropItem(0)') && !html.includes('Game.dropItem(1)'), 'the goods have no drop button, or the unique blade has one');
    Game.dropItem(1, true);
    assert.strictEqual(state.player.inventory.length, 2, 'a unique item was left behind');
    Game.dropItem(0, true);
    assert.strictEqual(Game.cargoMult(), 1, 'the bag is still overloaded after leaving the iron');
});

// The raid's two records: currentRaid marks the militia fight, raid the storehouse phase after it.
// Debug.invariants once held 'raiding' to the first and flagged every won raid (monkey 9606).
test('raid: a won militia fight starts the raid phase, and leaving it frees the map', () => {
    const { Game, Battle, state, LOCATIONS, Debug } = H.world({ seed: 42 });
    const loc = LOCATIONS.find(l => l.type === 'village');
    Game.startRaid(loc.id, 3);
    Battle.endBattle(true);
    assert.strictEqual(state.player.status, 'raiding');
    assert.ok(state.player.raid && !state.player.currentRaid, 'the raid phase did not take over from the fight');
    assert.deepStrictEqual([...Debug.invariants()], []);
    Game.abortRaid(true);
    assert.strictEqual(state.player.status, 'idle');
    assert.deepStrictEqual([...Debug.invariants()], []);
});

test('encounter: every way out without a fight closes it, and the windows after it close again', () => {
    const vm = require('vm'), g = H.world({ seed: 42 });
    const { Game, state, LOCATIONS } = g;
    const body = () => g._sandbox.document.getElementById('modal-body').innerHTML;
    const press = label => {
        const m = new RegExp(`onclick="([^"]*)"[^>]*>[^<]*${label}`).exec(body());
        assert.ok(m, `no "${label}" button`);
        vm.runInContext(m[1].replace(/&quot;/g, '"'), g._ctx);
    };
    const elder = LOCATIONS.find(l => l.type === 'village');
    g._sandbox.__rnd0 = vm.runInContext('Math.random', g._ctx);
    try {
        vm.runInContext('Math.random = () => 0', g._ctx);   // the band backs off, the flight works
        // a band that thinks you aren't worth it: walk away
        state.time.day = 2;
        Game.triggerEncounter(Game.createBand('bandit', 6));
        press('Uzaklaş');
        assert.strictEqual(state.player.currentEncounterNpcId, null, 'walking away from a band left the encounter open');
        // a convoy let go on its way
        const convoy = state.npcParties.find(n => n.trade);
        Game.triggerEncounter(convoy);
        press('Yoluna Bırak');
        assert.strictEqual(state.player.currentEncounterNpcId, null, 'a convoy let go left the encounter open');
        // outrun
        state.time.day = 30;
        const band = Game.createBand('bandit', 6);
        Game.triggerEncounter(band);
        Game.fleeEncounter(band.id);
        Game.alertOk();
        assert.strictEqual(state.player.currentEncounterNpcId, null, 'a flight that worked left the encounter open');
    } finally { vm.runInContext('Math.random = __rnd0', g._ctx); }
    // what the player saw: the elder's words, a window with no button of its own, can be closed
    Game.talkToElder(elder);
    assert.ok(Game.canDismiss() && /Game\.closeModal\(\)/.test(body()), 'the elder\'s window has no way out');
});

test('wait: a running camp is protected from map encounters', () => {
    const g = H.world({ seed: 40 });
    const { Game, state } = g;
    const band = Game.createBand('bandit', 8);
    state.player.wait = { until: 99 }; state.player.status = 'waiting';
    assert.ok(Game.campProtected());
    Game.triggerEncounter(band);
    assert.strictEqual(state.player.wait.until, 99, 'an encounter interrupted the protected camp');
    assert.strictEqual(state.player.currentEncounterNpcId, null, 'a protected camp opened an encounter');
});

test('wait: hostile parties hold outside the camp perimeter and cannot stack for an instant wake-up fight', () => {
    const g = H.world({ seed: 41 });
    const { Game, state } = g;
    state.time.day = 20;
    state.player.party = [];
    state.player.wait = { until: 99 }; state.player.status = 'waiting';
    const band = Game.createBand('bandit', 20);
    band.x = state.player.x + 220; band.y = state.player.y;
    band.targetX = state.player.x; band.targetY = state.player.y;
    state.npcParties = [band];
    Game.updateNPCs(10);
    assert.ok(Game.dist(band, state.player) >= Game.CAMP_SAFE_RADIUS - 1,
        'a hostile party crossed the protected camp perimeter');
});

test('wait: the camp perimeter repels but never attracts a band that has not noticed you', () => {
    const g = H.world({ seed: 41 });
    const { Game, state } = g;
    state.time.day = 20;
    state.player.party = [];
    state.player.wait = { until: 99 }; state.player.status = 'waiting';
    const band = Game.createBand('bandit', 20);
    band.x = state.player.x + 300; band.y = state.player.y;          // inside `sense`, never noticed
    band.targetX = state.player.x + 2000; band.targetY = state.player.y;
    band.playerTargetId = null;
    state.npcParties = [band];
    Game.updateNPCs(1);
    assert.strictEqual(band.targetX, state.player.x + 2000, 'a camp pulled an unaware band toward the tent');
});

test('wait: friendly cities and castles offer a place to pass time, enemy settlements do not', () => {
    const g = H.world({ seed: 39 });
    const { Game, LOCATIONS } = g;
    const city = LOCATIONS.find(l => l.type === 'city');
    const castle = LOCATIONS.find(l => l.type === 'castle');
    const village = LOCATIONS.find(l => l.type === 'village');
    assert.ok(Game.canWaitAtSettlement(city) && Game.canWaitAtSettlement(castle));
    assert.ok(!Game.canWaitAtSettlement(village), 'villages incorrectly offer settlement waiting');
    Game.declareWar(Game.playerFaction(), city.faction);
    assert.ok(!Game.canWaitAtSettlement(city), 'an enemy city incorrectly offers settlement waiting');
});

test('ambition: honourably releasing the last feuding lord completes blood money immediately', () => {
    const g = H.world({ seed: 34 });
    const { Game, state, LORDS } = g;
    const lord = LORDS[0];
    state.player.ambitionsDone = Game.AMBITIONS.map(a => a.id).filter(id => id !== 'feud');
    state.player.hadGrudge = false;
    state.grudges[lord.id] = state.time.day;
    state.player.prisoners = [{ id:'held_lord', name:lord.name, noble:true, lordId:lord.id,
                                faction:lord.faction, ransom:1000 }];
    Game.releaseLord('held_lord');
    assert.ok(state.player.ambitionsDone.includes('feud'),
        'releasing the feud prisoner did not complete the open goal');
});

test('ambition: every open goal counts without being picked, and one it opens that already holds pays too', () => {
    const g = H.world({ seed: 35 });
    const { Game, state } = g;
    state.player.ambitionsDone = [];
    state.player.renown = 0;
    Game.ambitionTick();
    assert.deepStrictEqual(state.player.ambitionsDone, [], 'a fresh hero met a goal');
    // ten men and a lord friend at 30: the head of the chain, then the friend goal it opens
    state.player.party = Array.from({ length: 10 }, (_, i) => ({ id: 'amb' + i, name: 'Köylü', level: 1 }));
    state.relations = Object.assign(state.relations || {}, { [g.LORDS[0].id]: 30 });
    Game.ambitionTick();
    assert.deepStrictEqual(state.player.ambitionsDone.slice().sort(), ['band', 'friend'], 'met goals waited to be picked');
    assert.strictEqual(state.player.renown, 10, 'band and friend pay 5 renown each');
    Game.ambitionTick();
    assert.strictEqual(state.player.renown, 10, 'a goal paid twice');
    assert.ok(!Game.ambitionHtml().includes('pickAmbition'), 'the goals panel still asks you to pick one');
});

test('lord prisoners: released nobles return only after recovery with a small retinue', () => {
    const g = H.world({ seed: 37 });
    const { Game, state, LORDS } = g;
    const lord = LORDS[0];
    state.npcParties = state.npcParties.filter(n => n.lordId !== lord.id);
    state.player.prisoners = [{ id:'held_lord', name:lord.name, noble:true, lordId:lord.id,
                                faction:lord.faction, ransom:1000 }];
    Game.releaseLord('held_lord');
    assert.ok(!state.npcParties.some(n => n.lordId === lord.id), 'released lord returned immediately');
    const due = state.lordRespawn[lord.id];
    assert.ok(due >= state.time.day + Game.LORD_RETURN_DAYS, 'lord recovery delay was not scheduled');
    state.time.day = due;
    Game.dailyUpdate();
    const returned = state.npcParties.find(n => n.lordId === lord.id);
    assert.ok(returned, 'lord did not return after recovery');
    assert.ok(returned.size <= Math.ceil(Game.lordForceTarget(lord.rank, returned.level) * Game.LORD_RETURNING_FORCE),
        'lord returned with a full army');
});

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

    test('road: a pursuer keeps moving during hours lost to an event', () => {
        state.time.day = 10; state.time.hour = 6;
        state.player.x = 4500; state.player.y = 4500; state.player.party = [];
        let n = Game.createBand('bandit', 8, 'Takipçi', '#800');
        n.x = 4600; n.y = 4500; n.targetX = n.x; n.targetY = n.y; n.speed = 60;
        state.npcParties = [n]; state.encounterCooldown = 0;
        let before = Game.dist(n, state.player);
        Game.roadDelay(1);
        assert.ok(Game.dist(n, state.player) < before, 'the pursuer stood still while an hour passed');
        assert.strictEqual(state.time.hour, 7);
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
        const marks = [];
        let walked = 0;
        for(let i = 0; i < 40; i++) {
            walked += Game.ROAD_EVERY / 4;
            if(Game.roadTick(Game.ROAD_EVERY / 4)) marks.push(walked);
        }
        Game.ROAD_CHANCE = chance;
        Game.roadEvent = orig;
        // Every roll hits (chance 1), so the spacing here is the silence margin alone (#94):
        // ROAD_EVERY to earn a roll, plus ROAD_QUIET of enforced quiet after each event.
        const step = Game.ROAD_EVERY + Game.ROAD_QUIET;
        assert.strictEqual(counter, Math.floor((walked - Game.ROAD_EVERY) / step) + 1,
            `40×(ROAD_EVERY/4) of travel produced ${counter} events`);
        marks.slice(1).forEach((d, i) => assert.ok(d - marks[i] >= step,
            `two events ${d - marks[i]} units apart, silence margin is ${step}`));
    });

    test('road: the recent-events window blocks repeats', () => {
        state.recentEvents = [];
        const pool = Game.ROAD_EVENTS.slice(0, 3);
        const ctx = Game.eventCtx();
        const always = () => true;
        const a = Game.pickEvent(pool.map(e => ({ ...e, when: always })), ctx);
        const b = Game.pickEvent(pool.map(e => ({ ...e, when: always })), ctx);
        assert.ok(a && b && a.id !== b.id, 'the same event repeated back-to-back while fresh options existed');
        assert.ok(state.recentEvents.length <= 12, 'the repeat window grows without bound');
    });
}
roadSuite();

// The population is *held* at a target: it used to start with 13 bands and spawn one a day,
// i.e. a region a lord had cleared would stay empty for weeks (the map looked deserted).
// Since #126 the target rises with the calendar instead of falling with the player's sight,
// so the run checks both that the curve climbs and that the hourly refill keeps up with it.
slow('band population tracks a target that rises over 60 days', () => {
    const g = H.world({ seed: 4 });
    const start = g.Game.bandTarget();
    assert.strictEqual(g.Game.bandCount(), start, 'the world doesn\'t start at the target population');
    let worst = 0;
    H.run(g, 60, () => { worst = Math.max(worst, g.Game.bandTarget() - g.Game.bandCount()); });
    const end = g.Game.bandTarget();
    assert.ok(end > start + 5,
        `pressure doesn't build: target went ${start} -> ${end} over 60 days`);
    // One band every 6 hours is 4 a day against a target that climbs by a third of one,
    // so the gap should never open more than a few bands wide.
    assert.ok(worst <= 4, `refill can't keep up: population fell ${worst} short of target`);
});

test('road: the touch that opens an event cannot also choose an answer', () => {
    const g = H.world({ seed: 41 });
    const { Game } = g;
    let ran = 0, stopped = 0;
    Game._roadEv = { ctx: {}, ev: { choices: [{ run: () => { ran++; return 'ok'; } }] } };
    Game._roadChoiceLockUntil = Date.now() + 650;
    Game.roadChoice(0, { detail: 1, preventDefault() {}, stopPropagation() { stopped++; } });
    assert.strictEqual(ran, 0, 'the opening touch leaked through to a road-event choice');
    assert.strictEqual(stopped, 1, 'the leaked click was allowed to propagate');
    Game._roadChoiceLockUntil = 0;
    Game.roadChoice(0);
    assert.strictEqual(ran, 1, 'the choice stayed locked after the opening touch had ended');
});

test('world battle: a lord hunts and disperses a nearby outlaw band', () => {
    const g = H.world({ seed: 24 });
    const lord = g.state.npcParties.find(n => n.lordId);
    const band = g.state.npcParties.find(n => n.type === 'bandit');
    lord.x = lord.targetX = 4500; lord.y = lord.targetY = 4500; lord.size = 80; lord.level = 5;
    band.x = band.targetX = 4600; band.y = band.targetY = 4500; band.size = 6; band.band = 'bandit';
    g.state.npcParties = [lord, band];
    g.Game.updateNPCs(0.1);
    assert.strictEqual(lord.bandTargetId, band.id, 'the lord ignored a nearby outlaw patrol target');
    assert.strictEqual(g.Game.lordBanditTick(), 1, 'the touching parties did not fight');
    assert.ok(g.state.npcParties.some(n => n.id === band.id && n.size < 4),
        'the routed outlaw took no losses or vanished instead of scattering');
    assert.ok(g.state.npcParties.some(n => n.id === lord.id && n.size < 80), 'the winning lord took no losses');
});

test('assist: a nearby lord+bandit clash offers a support fight the player can win credit for', () => {
    const g = H.world({ seed: 24 });
    const { Game, state } = g;
    const lord = state.npcParties.find(n => n.lordId);
    const band = state.npcParties.find(n => n.type === 'bandit');
    lord.x = 4500; lord.y = 4500; lord.size = 40;
    band.x = 4600; band.y = 4500; band.size = 12; band.band = 'bandit';
    state.npcParties = [lord, band];
    state.player.vassalOf = null;
    const clash = Game.clashContext(lord);
    assert.ok(clash, 'no clash was detected between a peaceable lord and a bandit at his side');
    assert.strictEqual(clash.ally.id, lord.id, 'the friendly lord was not chosen as the ally');
    assert.strictEqual(clash.foe.id, band.id, 'the bandit was not chosen as the foe');
    // a far-off bandit is not a clash
    band.x = 9000; band.y = 9000;
    assert.strictEqual(Game.clashContext(lord), null, 'a distant bandit still counted as a clash');
    // the ally reward is granted only on a won assist battle
    band.x = 4600; band.y = 4500;
    Game.assistFight(lord.lordId, band.id);
    assert.ok(state.player.assistAlly && state.player.assistAlly.lordId === lord.lordId,
        'assistFight did not record which ally to reward');
    g.Battle.active = false;
});

test('lord balance: every spawn and daily force target is reduced by ten percent', () => {
    const gl = H.world({ seed: 25 });
    const { Game, state } = gl;
    assert.strictEqual(Game.lordForce(100), 90);
    assert.strictEqual(Game.lordForce(35), 32);
    const king = state.npcParties.find(n => n.type === 'king');
    const regular = state.npcParties.find(n => n.lordId && n.faction === king.faction
        && n.type !== 'king' && n.type !== 'vizier');
    assert.strictEqual(king.size, Game.lordForceTarget('king', king.level), 'a new king did not spawn at its daily target');
    assert.strictEqual(regular.size, 32, 'a new lord still spawned at the old strength');
    regular.size = 35; // old-save cap
    state.npcParties = [king, regular];
    Game.LAIR_COUNT = 0;
    state.sites = state.sites.filter(s => s.kind !== 'lair');
    Game.dailyUpdate();
    assert.strictEqual(regular.size, 32, 'a regular lord did not drift toward the intended cap');
    assert.strictEqual(king.size, Game.lordForceTarget('king', king.level), 'daily king strength bypassed the multiplier');
});

test('lord forces: daily recovery changes a wounded army gradually, never in random-sized jumps', () => {
    const g = H.world({ seed: 35 });
    const { Game, state } = g;
    const lord = state.npcParties.find(n => n.lordId && n.type !== 'king' && n.type !== 'vizier');
    lord.size = 12;
    state.npcParties = [lord];
    Game.LAIR_COUNT = 0; state.sites = state.sites.filter(s => s.kind !== 'lair');
    let before = lord.size;
    for(let i = 0; i < 5; i++) {
        Game.dailyUpdate();
        assert.ok(lord.size - before >= 0 && lord.size - before <= Game.LORD_REINFORCE_PER_DAY,
            `lord force jumped from ${before} to ${lord.size}`);
        before = lord.size;
    }
});

test('map movement: an off-coast lord destination is pulled back inside instead of sticking at the edge', () => {
    const g = H.world({ seed: 36 });
    const { Game, state } = g;
    const lord = state.npcParties.find(n => n.lordId);
    lord.x = 4500; lord.y = 4500;
    lord.targetX = 20000; lord.targetY = -10000;
    state.npcParties = [lord];
    Game.updateNPCs(0.01);
    const dx = lord.targetX - 4500, dy = lord.targetY - 4500;
    assert.ok(Math.hypot(dx, dy) <= Game.getMapRadius(lord.targetX, lord.targetY) - 49,
        'lord kept an unreachable target beyond the coast');
});

test('map encounter: a friendly lord cannot force a conversation by bumping into the player', () => {
    const gm = H.world({ seed: 26 });
    const { Game, Nobles, state } = gm;
    const lord = state.npcParties.find(n => n.lordId);
    state.relations[lord.lordId] = 0;
    assert.ok(!Game.npcCanInitiateEncounter(lord), 'a friendly lord can still open unsolicited map dialogue');
    state.player.targetLocation = { id:lord.id, isNpc:true };
    assert.ok(Game.npcCanInitiateEncounter(lord), 'meeting a lord deliberately targeted by the player opens no dialogue');
    state.player.targetLocation = null;
    lord.playerTargetId = 'player';
    assert.ok(Game.npcCanInitiateEncounter(lord), 'a lord deliberately targeting the player opens no dialogue');
    lord.playerTargetId = null;
    state.relations[lord.lordId] = -50;
    assert.ok(Game.npcCanInitiateEncounter(lord), 'a hostile lord can no longer intercept the player');
    state.relations[lord.lordId] = 0;
    assert.ok(Nobles.lord(lord.lordId), 'the lord is no longer available for player-initiated talk');
});

// The same rule, for the party type it used to exempt (#131). A caravan is not hostile —
// isHostile returns false for every trade party — so before this it got through the gate on
// `npc.trade` alone and stopped you just by being walked past.
test('map encounter: a caravan cannot force a conversation by bumping into the player', () => {
    const gm = H.world({ seed: 26 });
    const { Game, state, LOCATIONS } = gm;
    const van = state.npcParties.find(n => n.trade);
    assert.ok(van, 'the world has a trade party to test');
    assert.ok(!Game.isHostile(van), 'a trade party is not hostile in the first place');

    state.player.targetLocation = null; van.playerTargetId = null;
    assert.ok(!Game.npcCanInitiateEncounter(van), 'a caravan still stops the player unasked');

    // Both halves of "intent" still open it: you clicked them, or they came for you.
    state.player.targetLocation = { id: van.id, isNpc: true };
    assert.ok(Game.npcCanInitiateEncounter(van), 'a caravan the player walked to opens nothing');
    state.player.targetLocation = null;
    van.playerTargetId = 'player';
    assert.ok(Game.npcCanInitiateEncounter(van), 'a caravan hunting the player opens nothing');
    van.playerTargetId = null;

    // And the click path is what keeps trade reachable: it sets a target and never consults
    // the gate, so gating the collision loop cannot take the caravan menu away. setTarget only
    // locks onto what the player can see, and prefers a settlement within 36 — so the caravan
    // is put in open country beside the player, which is the case being claimed anyway.
    state.player.wait = null;
    van.x = state.player.x + 20; van.y = state.player.y + 20;
    assert.ok(Game.canSee(van), 'a party twenty paces away is visible');
    assert.ok(!LOCATIONS.some(l => Game.dist(l, van) < 36), 'and not standing on a settlement');
    Game.setTarget({ x: van.x, y: van.y });
    assert.ok(state.player.targetLocation && state.player.targetLocation.isNpc
        && state.player.targetLocation.id === van.id, 'clicking a caravan no longer targets it');
    state.player.targetLocation = null; state.player.status = 'idle';
});

test('map labels: a lord actively pursuing the player is marked hostile outside a formal war', () => {
    const g = H.world({ seed: 38 });
    const { Game, state } = g;
    const lord = state.npcParties.find(n => n.lordId);
    state.relations[lord.lordId] = -50;
    assert.ok(!Game.atWar(Game.playerFaction(), lord.faction), 'test lord unexpectedly starts at war');
    lord.playerTargetId = 'player';
    assert.ok(Game.mapPartyIsFoe(lord), 'an actively pursuing hostile lord has no red-label state');
    lord.playerTargetId = null;
    assert.ok(!Game.mapPartyIsFoe(lord), 'a non-pursuing non-war lord remains marked as a foe');
});

// --- Bandit lairs (#68) ---
// Three claims in one run: a lair erodes the region around it, pays out its
// purse and is removed from the map when cleared, and no lairless world spawns new bands.
test('peace: a treaty immediately cancels an enemy lord pursuit', () => {
    const g = H.world({ seed: 39 });
    const { Game, state, FACTIONS } = g;
    const lord = state.npcParties.find(n => n.lordId);
    const mine = Object.keys(FACTIONS).find(f => f !== lord.faction);
    state.player.vassalOf = mine;
    Game.declareWar(mine, lord.faction);
    lord.playerTargetId = 'player';
    Game.makePeace(mine, lord.faction);
    assert.strictEqual(lord.playerTargetId, null, 'lord kept pursuing after the treaty');
});

test('marriage: a married player cannot replace their spouse with a second wedding', () => {
    const g = H.world({ seed: 40 });
    const { Nobles, state } = g;
    const [first, second] = Nobles.courtables();
    Nobles.marry(first.id, 'test wedding');
    Nobles.marry(second.id, 'second test wedding');
    assert.strictEqual(state.player.spouse, first.id, 'a second wedding replaced the spouse');
    assert.strictEqual(state.player.party.filter(t => t.isSpouse).length, 1, 'more than one spouse joined the party');
});

test('marriage: spouse council gives one useful daily action, not a blank dialogue', () => {
    const g = H.world({ seed: 42 });
    const { Nobles, state, Game } = g;
    const spouse = Nobles.courtables()[0];
    state.player.spouse = spouse.id;
    state.player.proficiencies.leadership = { level:1, xp:0, next:100, focus:1 };
    Nobles.spouseAction(spouse.id, 'counsel');
    assert.strictEqual(state.player.proficiencies.leadership.xp, 52.5, 'spouse council gave no leadership benefit');
    Nobles.spouseAction(spouse.id, 'counsel');
    assert.strictEqual(state.player.proficiencies.leadership.xp, 52.5, 'spouse action could be farmed repeatedly in one day');
    assert.strictEqual(Game.getPartyCapacity(), 17, 'marriage benefit disappeared while speaking to spouse');
});

test('marriage: a female player can reach her husband and his benefits (#129)', () => {
    const g = H.world({ seed: 7 });
    const { Nobles, state, Game } = g;
    state.player.gender = 'female';
    const s = Nobles.suitors()[0];
    assert.ok(s, 'a female player has no one to marry');
    const solo = Game.getPartyCapacity();
    state.player.spouse = s.id;
    assert.strictEqual(Game.getPartyCapacity(), solo + 5, 'marrying a lord gave no party capacity');
    let shown = '';
    Game.showModal = h => { shown = h; };
    Nobles.talk(s.lordId);
    assert.ok(/spouseMenu/.test(shown), 'her husband offers no way into the spouse conversations');
    Nobles.spouseMenu(s.id);
    assert.ok(/spouseAction/.test(shown), 'the spouse menu is empty for a female player');
});

test('peace: a treaty lifts the player siege against the new partner', () => {
    const g = H.world({ seed: 41 });
    const { Game, state, FACTIONS, LOCATIONS } = g;
    const target = LOCATIONS.find(l => l.type !== 'village');
    const mine = Object.keys(FACTIONS).find(f => f !== target.faction);
    state.player.vassalOf = mine;
    state.player.siege = { locId:target.id, plan:'ladder', daysLeft:2, weaken:0 };
    state.player.status = 'besieging';
    Game.declareWar(mine, target.faction);
    Game.makePeace(mine, target.faction);
    assert.strictEqual(state.player.siege, null, 'peace left a siege camp active');
    assert.strictEqual(state.player.status, 'idle', 'peace left the player in besieging status');
});

// ---- Map parties: the moves tools/mapwatch.js caught (every one reproduced before its fix) ----
// A foe castle, the player besieging it as a vassal of the other side of a war
function siegeWorld(seed) {
    const w = H.world({ seed });
    const { Game, state, FACTIONS, LOCATIONS } = w;
    Game.checkAchievements = () => {};
    const castle = LOCATIONS.find(l => l.type === 'castle');
    const mine = Object.keys(FACTIONS).find(f => f !== castle.faction && f !== 'player_kingdom');
    if(!Game.atWar(mine, castle.faction)) Game.declareWar(mine, castle.faction);
    state.player.vassalOf = mine;
    state.player.party = Array.from({ length: 25 }, (_, i) => troop(4, { id: 'sw' + i }));
    Game.beginSiege(castle.id, Object.keys(Game.SIEGE_PLANS)[0], false);
    Game.closeModal();
    return Object.assign(w, { castle, mine });
}
// a point `r` units from `at`, toward the middle of the map (always on land)
const inland = (at, r) => {
    const dx = 4500 - at.x, dy = 4500 - at.y, d = Math.hypot(dx, dy) || 1;
    return { x: at.x + dx / d * r, y: at.y + dy / d * r };
};

test('siege: the camp is the army at the walls — an encounter pauses it, a march lifts it', () => {
    const { Game, state, castle } = siegeWorld(7);
    // a band walking into the camp leaves the party idle (the collision rule); the siege goes on
    state.player.status = 'idle';
    Game.holdSiege();
    assert.ok(state.player.siege, 'an encounter at the camp ended the siege');
    assert.strictEqual(state.player.status, 'besieging', 'after the encounter the party did not go back to the siege');
    // walking off: the siege used to stay behind, counting days and ready to assault from anywhere
    Object.assign(state.player, inland(castle, 1000));
    const days = state.player.siege.daysLeft;
    Game.siegeTick();
    assert.strictEqual(state.player.siege, null, `a siege 1000 units from its walls still ran (${days} → ${state.player.siege && state.player.siege.daysLeft} days)`);
    // and the assault button can't reach across the map either
    state.player.siege = { locId: castle.id, plan: Object.keys(Game.SIEGE_PLANS)[0], daysLeft: 0, weaken: 0 };
    let started = false;
    Game.startSiege = () => { started = true; };
    Game.assaultSiege();
    assert.ok(!started, 'the walls were assaulted from 1000 units away');
});

test('siege: the relief army marches to the camp and meets it there', () => {
    const { Game, state, castle } = siegeWorld(7);
    const lord = state.npcParties.find(n => n.lordId && n.faction === castle.faction);
    Object.assign(lord, inland(castle, 1500));
    lord.size = 60;
    state.npcParties = [lord];
    const from = { x: lord.x, y: lord.y };
    for(let i = 0; i < 200 && !lord.reliefLocId; i++) Game.siegeRelief(castle);
    assert.strictEqual(lord.reliefLocId, castle.id, 'no relief set out');
    assert.ok(lord.x === from.x && lord.y === from.y, 'the relief was set down at the gate instead of marching');
    let shown = '', steps = 0;
    Game.showModal = h => { shown = h; };
    const cap = lord.speed * 0.25 * 1.18 * 1.5 + 1;
    while(!Game.checkRelief() && steps++ < 400) {
        const x = lord.x, y = lord.y;
        Game.updateNPCs(0.25);
        const d = Math.hypot(lord.x - x, lord.y - y);
        assert.ok(d <= cap, `the relief stepped ${Math.round(d)} units in a quarter hour`);
    }
    assert.ok(/meetRelief/.test(shown), `the relief never reached the camp (${Math.round(Game.dist(lord, state.player))} units off after ${steps} steps)`);
    assert.ok(!lord.reliefLocId, 'the relief kept marching after it arrived');
    assert.ok(steps > 10, `1500 units in ${steps} quarter hours is not a march`);
});

test('AI siege: the besieger holds the walls, and one that marches off starts over', () => {
    const { Game, state, LOCATIONS, FACTIONS, castle } = siegeWorld(7);
    Game.liftSiege(true);
    Object.assign(state.player, { x: 4500, y: -40000 });
    const foe = Object.keys(FACTIONS).find(f => f !== castle.faction && f !== 'player_kingdom' && Game.atWar(f, castle.faction));
    const atk = state.npcParties.find(n => n.lordId && n.faction === foe);
    Object.assign(atk, inland(castle, 300), { size: 400, siegeLocId: castle.id, siegeDays: 2 });
    state.npcParties = [atk];
    for(let i = 0; i < 48; i++) Game.updateNPCs(0.25);
    const d = Game.dist(atk, castle);
    assert.ok(Math.abs(d - Game.SIEGE_RING) < 20, `a besieger stood ${Math.round(d)} units from the walls it besieges`);
    // away from the walls, the count starts over: three passing visits used to take a castle
    Object.assign(atk, inland(castle, 2000));
    Game.warTick();
    assert.notStrictEqual(atk.siegeLocId, castle.id, 'a lord 2000 units away still besieges the castle');
    assert.ok(LOCATIONS.find(l => l.id === castle.id).faction === castle.faction, 'the castle fell to an army that had left');
});

test('flee: a band that runs keeps running once out of sight, not back and forth at its edge', () => {
    const w = H.world({ seed: 7 });
    const { Game, state } = w;
    state.player.party = Array.from({ length: 25 }, (_, i) => troop(4, { id: 'fl' + i }));
    Object.assign(state.player, { x: 4500, y: 4500 });
    const band = Game.createBand('bandit', 5);
    band.band = 'bandit';
    Object.assign(band, { x: 4500 + 980, y: 4500, targetX: 4500 + 980, targetY: 4500 });
    // a caravan behind the player: out of sight, the band used to turn at once to hunt it
    const prey = Game.createNPC('Kervan', 'caravan', 1, '#000');
    Object.assign(prey, { x: 4400, y: 4500, targetX: 4400, targetY: 4500, speed: 0, trade: { kind: 'caravan' } });
    state.npcParties = [band, prey];
    let last = Game.dist(band, state.player);
    for(let i = 0; i < Game.FLEE_HOURS / 0.25; i++) {
        Game.updateNPCs(0.25);
        const d = Game.dist(band, state.player);
        assert.ok(d >= last - 0.01, `hour ${(i * 0.25).toFixed(2)}: the fleeing band turned back (${Math.round(last)} → ${Math.round(d)})`);
        last = d;
    }
});

test('patrol: one lord per band, and a lord that catches it lets it go', () => {
    const w = H.world({ seed: 7 });
    const { Game, state } = w;
    Object.assign(state.player, { x: 4500, y: -40000 });
    state.campaigns = {};
    const [a, b] = state.npcParties.filter(n => n.lordId).filter((n, i, all) => n.faction === all[0].faction);
    const band = Game.createBand('bandit', 8);
    band.band = 'bandit';
    Object.assign(band, { x: 4500, y: 4500, targetX: 4500, targetY: 4500, speed: 0 });
    Object.assign(a, { x: 4800, y: 4500, bandScanCd: 0 });
    Object.assign(b, { x: 4500, y: 4800, bandScanCd: 0 });
    state.npcParties = [a, b, band];
    Game.updateNPCs(0.25);
    assert.strictEqual([a, b].filter(l => l.bandTargetId === band.id).length, 1,
        'both lords set out after the one band (a posse that crossed the map as one ball)');
    const hunter = a.bandTargetId ? a : b;
    Object.assign(hunter, { x: band.x + 10, y: band.y });
    Game.updateNPCs(0.25);
    assert.ok(!hunter.bandTargetId, 'a lord that caught its band walks beside it (only one clash resolves a day)');
});

test('wolves: a pack neither locks onto nor circles a party on the road', () => {
    const w = H.world({ seed: 7 });
    const { Game, state } = w;
    state.player.party = [];
    let spot = null;
    for(let x = 1000; x < 8000 && !spot; x += 37) for(let y = 1000; y < 8000 && !spot; y += 41)
        if(Game.onRoad(x, y) && Game.getTerrainInfo(x + 150, y).name === 'Düzlük') spot = { x, y };
    assert.ok(spot, 'no road on the map');
    Object.assign(state.player, spot);
    state.time.day = 30;
    const wolves = Game.createBand('wolf', 12);
    wolves.band = Object.keys(w.BAND_KINDS).find(k => w.BAND_KINDS[k].beast);
    Object.assign(wolves, { x: spot.x + 150, y: spot.y, targetX: spot.x + 150, targetY: spot.y });
    state.npcParties = [wolves];
    for(let i = 0; i < 16; i++) Game.updateNPCs(0.25);
    assert.ok(!wolves.playerTargetId, 'the pack locked onto a party on the road it can never set foot on');
    // off the road, the same pack comes for you
    Object.assign(state.player, { x: spot.x + 150, y: spot.y + 60 });
    Object.assign(wolves, { x: spot.x + 150, y: spot.y + 200 });
    if(!Game.onRoad(state.player.x, state.player.y)) {
        Game.updateNPCs(0.25);
        assert.strictEqual(wolves.playerTargetId, 'player', 'the pack no longer hunts a party off the road');
    }
});

test('spawns: new bands and wanderers appear on land, not in the sea a step from the coast', () => {
    const w = H.world({ seed: 6 });
    const { Game, state } = w;
    Object.assign(state.player, { x: 4500, y: -40000 });
    for(let i = 0; i < 150; i++) {
        for(const n of [Game.spawnFromLair(), Game.spawnWanderer()]) {
            if(!n) continue;
            const p = { x: n.x, y: n.y };
            Game.clampToMap(p);
            assert.ok(Math.hypot(p.x - n.x, p.y - n.y) < 0.5, `${n.type} spawned ${Math.round(Math.hypot(p.x - n.x, p.y - n.y))} units off the coast`);
        }
    }
});

slow('bandit lairs: bands spread across the lairs instead of piling on a few (#97)', () => {
    // A random lair pick let the busiest of five lairs hold 29–62% of the bands on average
    // (worst 78%); the emptiest lair now sends the next band. Measured over 60 days, seeds 1–5:
    // the busiest of nine holds 14% on average, 20% at worst.
    const g = H.world({ seed: 3 });
    assert.strictEqual(g.Game.lairs().length, g.Game.LAIR_COUNT, 'the world doesn\'t start with every lair');
    let worst = 0;
    H.run(g, 30, () => {
        const bands = g.state.npcParties.filter(n => n.type === 'bandit' && n.lairId);
        if(bands.length < 5) return;
        const c = {}; bands.forEach(b => c[b.lairId] = (c[b.lairId] || 0) + 1);
        worst = Math.max(worst, Math.max(...Object.values(c)) / bands.length);
    });
    assert.ok(worst <= 0.3, `one lair held ${Math.round(worst * 100)}% of the bands`);
});

slow('bandit lair: erodes the region, pays out when cleared, and is a band source', () => {
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

// --- Bosses and relics (#37, #38) ---
// A boss appears on the map the day its renown gate is reached and not before; its relic
// carries a permanent modifier; the boss-of-bosses map is gated behind all four relics AND renown.
test('bosses: spawn at their renown gate, relics stack modifiers, the final map is doubly gated', () => {
    const g = H.world({ seed: 6 });
    const { Game, state, BOSSES, RELICS } = g;

    // No boss is on the map at renown 0, and the cheapest one appears once its gate is crossed.
    // The final boss (BOSSES.savas_tanrisi, renown 0, `final:true`) is excluded throughout —
    // it's only ever revealed by the boss_map item, never by this renown loop (#132).
    Game.ensureBosses();
    assert.strictEqual(Game.bossSites().length, 0, 'a boss appeared before any renown was earned');
    const regularKeys = Object.keys(BOSSES).filter(k => !BOSSES[k].final);
    const cheapest = regularKeys.reduce((a, b) => BOSSES[a].renown <= BOSSES[b].renown ? a : b);
    state.player.renown = state.player.maxRenown = BOSSES[cheapest].renown;
    Game.ensureBosses();
    assert.ok(Game.bossSites().some(s => s.bossKey === cheapest), 'the boss didn\'t spawn at its gate');
    const before = Game.bossSites().length;
    Game.ensureBosses();
    assert.strictEqual(Game.bossSites().length, before, 'ensureBosses spawned the same boss twice');

    // A killed boss never respawns.
    state.bossKills[cheapest] = true;
    state.sites = state.sites.filter(s => s.bossKey !== cheapest);
    Game.ensureBosses();
    assert.ok(!Game.bossSites().some(s => s.bossKey === cheapest), 'a slain boss came back');

    // Relics: each is one-of-a-kind, gainRelic stores it, and relicMod sums the modifier.
    const kk = RELICS.kurt_kani;
    Game.gainRelic('kurt_kani');
    assert.ok(Game.hasRelic('kurt_kani'), 'the relic wasn\'t granted');
    assert.strictEqual(Game.relicMod('mapSpeed'), kk.mod.mapSpeed, 'relicMod didn\'t read the modifier');
    const money = state.player.money;
    Game.gainRelic('kurt_kani');   // duplicate pays coin, doesn't stack
    assert.strictEqual(state.player.money, money + 1500, 'a duplicate relic didn\'t pay out');
    assert.strictEqual(Game.relicMod('mapSpeed'), kk.mod.mapSpeed, 'a duplicate relic stacked its modifier');

    // The final map: blocked until all four boss relics are held AND renown clears the gate.
    // Redesigned (#132): using the map no longer starts the fight directly — it reveals the
    // final boss as a map site, exactly like the other 4. `state.finalBoss` is only set once
    // the player actually attacks that revealed site.
    Game.addItem('boss_map', 1);
    const idx = state.player.inventory.findIndex(i => i.id === 'boss_map');
    state.player.relics = {};
    state.player.renown = state.player.maxRenown = Game.BOSS_RENOWN;
    state.finalBoss = false;
    Game.useItem(idx);
    assert.ok(!Game.bossSites().some(s => s.bossKey === 'savas_tanrisi'), 'the final boss map revealed a site without the four relics');
    regularKeys.forEach(k => Game.gainRelic(BOSSES[k].relic));
    state.player.renown = state.player.maxRenown = Game.BOSS_RENOWN - 1;
    Game.useItem(idx);
    assert.ok(!Game.bossSites().some(s => s.bossKey === 'savas_tanrisi'), 'the final boss map revealed a site below the renown gate');
    state.player.renown = state.player.maxRenown = Game.BOSS_RENOWN;
    Game.useItem(idx);   // neither earlier call consumed the item — both returned before item.qty--
    const finalSite = Game.bossSites().find(s => s.bossKey === 'savas_tanrisi');
    assert.ok(finalSite, 'the final boss map didn\'t reveal a site with relics and renown in hand');
    assert.ok(!state.finalBoss, 'finalBoss was set just from revealing the site, before attacking it');
    Game.attackBoss(finalSite.id);
    assert.ok(state.finalBoss, 'attacking the revealed final boss site didn\'t set finalBoss');
    g.Battle.active = false;
});

test('bosses: the final boss never auto-spawns from the renown loop, only from the boss map', () => {
    const g = H.world({ seed: 11 });
    const { Game, state } = g;
    state.player.renown = state.player.maxRenown = 9999;
    Game.ensureBosses();
    assert.ok(!Game.bossSites().some(s => s.bossKey === 'savas_tanrisi'), 'the final boss spawned from the renown loop without the map item');
});

// --- Rumours (#71) ---
// Information was free and instant before this: the guild ledger handed over every
// price in the world for nothing. Three claims: the tavern charges coin AND hours,
// Spotting decides both which stories reach you and how often they're wrong, and a
// false rumour is a true story pinned to the wrong place (not invented prose).
slow('rumour: the tavern charges coin and hours, and Spotting sets tier and lie rate', () => {
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

slow('rumour: every generator produces a story, and a lie only moves the place', () => {
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
    // "Has something to say" is checked over every town, not the one the lie test uses. A
    // generator returning null is a designed outcome -- `listenRumor` has a line for the night
    // nobody is talking -- and the trade-margin one legitimately goes quiet in a town whose
    // five nearest neighbours all trade the same goods. Pinned to a single town this assertion
    // was really testing a coincidence: it passed on seed 3 with a margin of 0.169 against a
    // threshold of 0.15, and any change that nudged the world at all tipped it over.
    // Two generators speak only of a war and of the campaign marching out of one, and whether
    // either exists on day 40 is the world's coin-flip, not the generator's doing -- any change
    // that shifts the random stream by one call used to take this assertion down with it. The
    // preconditions are set here instead, so what is tested is the generator.
    const cities = LOCATIONS.filter(l => l.type === 'city');
    const facs = [...new Set(cities.map(c => c.faction))];
    const f1 = facs[0], f2 = facs.find(f => f !== f1 && !Game.allied(f1, f));
    Game.declareWar(f1, f2);
    if(!Object.keys(state.campaigns).length) {
        const target = cities.find(c => c.faction === f2);
        state.campaigns[f1] = { marshalId: 'x', marshalName: 'Mareşal Bahadır',
                                targetLocId: target.id, day: state.time.day };
    }
    // The siege generator has the same conditional nature as war/campaign. A changed patrol
    // route can legitimately leave day 40 between sieges, so establish its own precondition.
    if(!state.npcParties.some(n => n.lordId && n.siegeLocId)) {
        const army = state.npcParties.find(n => n.lordId);
        const target = cities.find(c => c.faction !== army.faction) || cities[0];
        army.siegeLocId = target.id;
    }
    Game.RUMORS.forEach((r, i) => assert.ok(cities.some(c => r.run(c, truth)),
        `generator ${i} found nothing to say in any town of a 40-day-old world`));

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

slow('gate 500: the envoy leaves the party, comes back, and only one rides at a time', () => {
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
slow('gate 800: a player marshal\'s target actually pulls the kingdom\'s lords', () => {
    let lords = 0, reached = 0, seeds = 0;
    // A wider seed sample (#132) — a fixed 4-seed list is brittle against any change that
    // shifts the shared RNG stream earlier in the run (e.g. the day/road event pools growing),
    // even when that change has nothing to do with marshals or campaigns. 16 seeds at the same
    // ~75% pass ratio absorbs that kind of drift without hiding a real regression.
    for(const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) {
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
    assert.ok(seeds >= 12, `only ${seeds} seeds produced a campaign to lead`);
    assert.ok(reached / lords >= 0.5,
        `the marshal's target pulled only ${reached}/${lords} lords in 20 days — the post is decorative`);
});

slow('gate 800: the post lasts exactly one campaign', () => {
    const g = H.world({ seed: 3 });
    const { Game, state, LORDS } = g;
    // Wait for a kingdom that actually opens a campaign rather than guessing one at war on day
    // 20: a guess made the test hostage to whichever peace the dice rolled in between.
    H.run(g, 20);
    let f = null, w = 0;
    while(!f && w++ < 60) {
        H.run(g, 1);
        f = Object.keys(state.campaigns).find(x => x !== 'player_kingdom' && state.campaigns[x] && Game.warsOf(x).length);
    }
    assert.ok(f, 'no kingdom opened a campaign in 80 days');
    const king = LORDS.find(l => l.faction === f && l.rank === 'king');
    state.player.vassalOf = f;
    state.player.renown = state.player.maxRenown = Game.RENOWN_GATES.marshal;
    state.relations[king.id] = Game.MARSHAL_REL + 20;
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

// One Turkish word, two meanings: "Başlık" was both the helmet slot and the bride price, the
// dictionary held the key twice, and the later entry won — the bride-price screen said "Helmet"
// (found by the type check). A repeated key is always a lost translation.
test('i18n: no key appears twice in a dictionary', () => {
    const fs = require('fs'), path = require('path');
    for(const f of ['lang-en.js', 'lang-id.js']) {
        const seen = new Set(), twice = [];
        for(const m of fs.readFileSync(path.join(__dirname, '..', f), 'utf8').matchAll(/^\s*("(?:[^"\\]|\\.)*")\s*:/gm)) {
            const k = JSON.parse(m[1]);
            if(seen.has(k)) twice.push(k); else seen.add(k);
        }
        assert.deepStrictEqual(twice, [], `${f} repeats a key`);
    }
});

// The dictionary gate above only sees prose that is already wrapped in T(). Prose that
// was never wrapped is invisible to it and ships Turkish to every language — which is
// exactly how #129 shipped the spouse menu. This gate reads the other direction: Turkish
// sitting in an HTML text node outside any T() call.
test('i18n: no Turkish prose reaches the screen outside T()', () => {
    const fs = require('fs'), path = require('path');
    const K = require('./i18n-keys');
    const bad = [];
    for(const f of ['app.js', 'battle.js', 'nobles.js', 'quests.js', 'lair.js', 'forge.js', 'crafts.js'])
        K.rawUiText(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'))
            .forEach(h => bad.push(`${f}:${h.line} ${JSON.stringify(h.text.slice(0, 60))}`));
    assert.ok(bad.length === 0, `${bad.length} untranslated UI string(s), first: ${bad[0]}`);
});

// A percent sign written by hand outside T() is Turkish word order in every language: the
// EN/ID screen read "escape chance %35" (#134). Inside a T() key the dictionary moves it; outside
// one, Game.pct is the gate — and its own body is the one place allowed to write `%${`.
test('i18n: no hand-written %${…} outside T() (#134)', () => {
    const fs = require('fs'), path = require('path');
    const K = require('./i18n-keys');
    const bad = [];
    for(const f of ['app.js', 'battle.js', 'nobles.js', 'quests.js', 'lair.js', 'forge.js', 'crafts.js']) {
        const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), spans = K.keysIn(src, true), re = /%\$\{/g;
        let m;
        while((m = re.exec(src))) {
            const ls = src.lastIndexOf('\n', m.index) + 1, line = src.slice(ls, src.indexOf('\n', m.index));
            if(line.includes("I18N.lang === 'tr'") || line.trimStart().startsWith('//')) continue;   // Game.pct itself
            if(!spans.some(s => m.index > s.a && m.index < s.b)) bad.push(`${f}:${src.slice(0, m.index).split('\n').length} ${line.trim().slice(0, 70)}`);
        }
    }
    assert.ok(bad.length === 0, `${bad.length} hand-written percent(s) outside T(), first: ${bad[0]}`);
});

// The per-group "Sell" and "Set free" buttons passed the *translated* troop name and the handler
// matched it against the raw one in the save: on EN/ID both did nothing (found by the gate below).
test('prisoners: the per-group sell and release buttons work on EN', () => {
    const w = H.world({ seed: 4, lang: 'en' });
    const { Game, state } = w;
    const press = (html, fn) => require('vm').runInContext(html.match(new RegExp(`onclick="(Game\\.${fn}\\('[^"]*)"`))[1], w._ctx);
    const captives = (n, name) => Array.from({ length: n }, (_, i) => ({ id: name + i, name, level: 1 }));
    state.player.prisoners = [...captives(3, 'Çapulcu'), ...captives(2, 'Haydut')];
    Game.openSlaveTrader();
    press(w._sandbox.document.getElementById('modal-body').innerHTML, 'sellPrisoners');
    assert.strictEqual(state.player.prisoners.length, 2, 'the group sale sold nothing');
    press(Game.prisonersHtml(), 'releasePrisoners');
    assert.strictEqual(state.player.prisoners.length, 0, 'the group release freed nobody');
});

// Translated text into the state or baked into an onclick (i18n-keys leakedT): the pseudo-locale's
// save check only sees the paths a test walks; this sees every line. The warLog line it would
// have caught before 2.4.1 is the first sample.
test('i18n: no translation written into state or baked into an onclick', () => {
    const fs = require('fs'), path = require('path');
    const K = require('./i18n-keys');
    const rules = src => K.leakedT(src).map(h => h.rule);
    assert.deepStrictEqual(rules("state.warLog.unshift({ day: 1, msg: T`${a} savaş hâlinde.` });"), ['state']);
    assert.deepStrictEqual(rules("state.warLog.unshift({ day: 1, msg: Tx`${a} savaş hâlinde.` });"), []);
    assert.deepStrictEqual(rules("state.x = {\n  label: T('Sefer') };"), ['state']);
    assert.deepStrictEqual(rules("state.x = y; alert(T('Tamam'));"), []);
    assert.deepStrictEqual(rules("`<b onclick=\"Game.go('${T(l.name)}')\">`"), ['onclick']);
    assert.deepStrictEqual(rules("`<b onclick=\"Nobles.marry('${id}', T('Şölen'))\">`"), []);
    const bad = [];
    for(const f of ['app.js', 'battle.js', 'nobles.js', 'quests.js', 'lair.js', 'forge.js', 'crafts.js'])
        K.leakedT(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).forEach(h => bad.push(`${f}:${h.line} [${h.rule}] ${h.text}`));
    assert.ok(bad.length === 0, `${bad.length} translation(s) leaking into logic, first: ${bad[0]}`);
});

// A quest's pitch and objective line are the two strings a player reads most, and #129
// shipped twelve of them as bare template literals — the Indonesian build showed a Turkish
// brief under an Indonesian header. The gate below is the shape-based one: it does not care
// whether the sentence happens to contain a Turkish diacritic.
test('i18n: every quest offer/desc goes through T() (#129)', () => {
    const fs = require('fs'), path = require('path');
    const K = require('./i18n-keys');
    const bad = [];
    for(const f of ['quests.js', 'nobles.js'])
        K.untaggedProse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'))
            .forEach(h => bad.push(`${f}:${h.line} ${h.name}()`));
    assert.ok(bad.length === 0, `${bad.length} untranslated quest text(s), first: ${bad[0]}`);
});

// A translation that loses a {0} silently drops the number it was carrying, and one that
// loses a <b> ships broken markup. Both are invisible to the key-existence gate.
test('i18n: translations keep every placeholder and tag of their key', () => {
    const d = require('./i18n-keys').dicts();
    const ph = t => (t.match(/\{\d+\}/g) || []).sort().join(',');
    const tags = t => (t.match(/<\/?[a-z][a-z0-9]*/gi) || []).map(x => x.toLowerCase()).sort().join(',');
    const bad = [];
    for(const lang of ['en', 'id'])
        for(const [k, v] of Object.entries(d[lang])) {
            if(ph(k) !== ph(v)) bad.push(`${lang} placeholders ${JSON.stringify(k.slice(0, 50))}`);
            if(tags(k) !== tags(v)) bad.push(`${lang} tags ${JSON.stringify(k.slice(0, 50))}`);
        }
    assert.ok(bad.length === 0, `${bad.length} broken translation(s), first: ${bad[0]}`);
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
// A touch whose pointerup never arrives left a ghost in `Game._ptr`, and onMapUp reads
// `_ptr.size` to tell a tap from a pinch — so one ghost killed map orders for the rest of
// the session, on the map, with nothing else on screen and no error in the log (#100).
test('a ghost finger cannot lock the map out of taking orders (#100)', () => {
    const { Game, state } = g;
    Game.mapCanvas = g._sandbox.document.getElementById('map-canvas');
    const at = (id, primary) => ({ pointerId: id, pointerType: 'touch', isPrimary: primary,
                                   clientX: 400, clientY: 300, button: 0 });
    const tap = (id, primary) => {
        state.player.status = 'idle'; state.player.targetLocation = null;
        Game.onMapDown(at(id, primary));
        Game.onMapUp(at(id, primary));
        return state.player.status;
    };
    Game._ptr.clear();
    assert.strictEqual(tap(1, true), 'moving', 'a plain tap sets a target');

    Game.onMapDown(at(2, true));                 // finger down, app backgrounded: no up, no cancel
    assert.strictEqual(tap(3, true), 'moving', 'the next tap still gives an order');
    assert.strictEqual(Game._ptr.size, 0, 'and the ghost is gone, not merely outvoted');
    assert.ok(!Game.dragTarget, 'the marker drag the same lost event stranded is gone too');

    // The clear must not cost pinch-zoom: a real second finger is never the primary one.
    Game._ptr.clear();
    Game.onMapDown(at(4, true)); Game.onMapDown(at(5, false));
    assert.strictEqual(Game._ptr.size, 2, 'two real fingers stay two fingers');
    Game._ptr.clear();
});

test('returning from a menu centers the map on the player', () => {
    const map = g._sandbox.document.getElementById('map-view');
    map.classList.add('active');
    Game.showScreen('party');
    map.classList.remove('active'); // the tiny DOM fake has no live class selector
    Game.camera.offsetX = 700; Game.camera.offsetY = -400;
    Game.showScreen('map');
    assert.strictEqual(Game.camera.offsetX, 0);
    assert.strictEqual(Game.camera.offsetY, 0);
});

test('a panned camera holds its world position while the player walks', () => {
    const { Game, state } = g;
    Game.camera.offsetX = 600; Game.camera.offsetY = 400;
    Game.updateCamera(0.016);                                  // seeds the previous-position pair
    const tx = state.player.x + Game.camera.offsetX, ty = state.player.y + Game.camera.offsetY;
    for(let i = 0; i < 50; i++) { state.player.x += 7; state.player.y += 4; Game.updateCamera(0.016); }
    // Sub-pixel, not bit-exact: fifty subtractions of the player's own drifting float position
    // leave rounding behind. The invariant is that the view does not slide, not that it is exact.
    assert.ok(Math.abs(state.player.x + Game.camera.offsetX - tx) < 0.5, 'the panned view slid sideways');
    assert.ok(Math.abs(state.player.y + Game.camera.offsetY - ty) < 0.5, 'the panned view slid down');

    // With no pan the camera still follows: a zero offset stays zero.
    Game.camera.offsetX = 0; Game.camera.offsetY = 0;
    for(let i = 0; i < 50; i++) { state.player.x += 7; Game.updateCamera(0.016); }
    assert.strictEqual(Game.camera.offsetX, 0);
});

// A quest wave is deliberately smaller than the player's army, so the generic
// "a weak band runs" rule made Hasat Nöbeti a chase instead of a fight (#94).
test('a quest wave closes in where a plain band of the same size flees', () => {
    const { Game, state } = g;
    state.player.party.length = 0;
    for(let i = 0; i < 25; i++) state.player.party.push({ level: 10, hp: 10, maxHp: 10 });
    const walk = (wave) => {
        const n = Game.createBand('bandit', 10, 'Hasat Çapulcuları', '#8b0000');
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

// The gang a quest names used to flee from beyond your sight, so following the marker found it
// late or never (2.6.2). It doesn't run from you; it just carries on where it was going.
test('a quest-locked band does not flee a stronger army', () => {
    const { Game, state } = g;
    state.player.party.length = 0;
    for(let i = 0; i < 25; i++) state.player.party.push({ level: 10, hp: 10, maxHp: 10 });
    state.player.stats.hp = 50;   // a world loaded, never started: the hero has no hp yet, and bands weigh it
    const walk = (locked) => {
        const n = Game.createBand('bandit', 10);
        n.x = state.player.x + 400; n.y = state.player.y;
        n.targetX = n.x; n.targetY = n.y;
        if(locked) n.questLocks = 1;
        state.npcParties.length = 0; state.npcParties.push(n);
        for(let i = 0; i < 30; i++) Game.updateNPCs(0.1);
        return !!n.fleeLeft && n.fleeLeft > 0;
    };
    assert.ok(!walk(true), 'the quest target ran from the player');
    assert.ok(walk(false), 'an ordinary weak band still flees');
});

// A hostile party that stays in view for CHASE_HOURS game hours is a chase, and a chase gets
// the fight music (#131). The count lives in advanceTime, so it only runs while the map is up
// and no modal is open — which is also what makes a dialog pause the chase instead of ending it.
test('a chase is ten visible game hours, and losing sight resets it (#131)', () => {
    const { Game, state } = g;
    Game.mapCanvas = { width: 800, height: 600 };
    Game.camera.x = state.player.x; Game.camera.y = state.player.y; Game.camera.zoom = 1;
    const put = (dx, dy) => {
        state.npcParties.length = 0;
        state.npcParties.push({ id: 'chase-test', type: 'bandit', band: 'bandit', size: 30, x: Game.camera.x + dx,
                                y: Game.camera.y + dy, targetX: 0, targetY: 0 });
    };
    Game._chase = 0; Game._chasing = false;
    // Half a canvas away at zoom 1 is on screen; twice that is not.
    put(100, 0);
    assert.ok(Game.isHostile(state.npcParties[0]), 'a bandit band is hostile');
    for(let i = 0; i < 9; i++) Game.chaseTick(1);
    assert.strictEqual(Game._chasing, false, 'nine hours is not yet a chase');
    Game.chaseTick(1);
    assert.strictEqual(Game._chasing, true, 'the tenth hour is');
    // Out of the visible rect: the count drops to zero, not down by one.
    put(900, 0);
    Game.chaseTick(1);
    assert.strictEqual(Game._chasing, false, 'losing sight ends the chase');
    assert.strictEqual(Game._chase, 0, 'and the count starts over, it does not decay');
    // A friendly party in view is not a chase however long it sits there.
    state.npcParties.length = 0;
    state.npcParties.push({ id: 'caravan-test', type: 'caravan', trade: true, size: 10,
                            x: Game.camera.x, y: Game.camera.y, targetX: 0, targetY: 0 });
    for(let i = 0; i < 20; i++) Game.chaseTick(1);
    assert.strictEqual(Game._chasing, false, 'a caravan in view is not a chase');
    state.npcParties.length = 0;
    Game._chase = 0; Game._chasing = false;
});

test('the soundtrack table names files that exist, one scene each (#131)', () => {
    const fs = require('fs'), path = require('path');
    const M = g.Game.Music, dir = path.join(__dirname, '..', 'music');
    const seen = new Set();
    M.TRACKS.forEach(t => {
        assert.ok(!seen.has(t.f), 'one entry per file: ' + t.f); seen.add(t.f);
        assert.ok(fs.existsSync(path.join(dir, t.f + '.mp3')), 'music/' + t.f + '.mp3 ships');
        assert.ok(t.t && t.a, t.f + ' credits its title and author');
        assert.ok(['map', 'battle', 'sting', 'lair', 'lairchase'].includes(t.s), t.f + ' is in a known scene: ' + t.s);
    });
    // A stray .mp3 in music/ is 1-3 MB of dead weight the player still downloads offline.
    fs.readdirSync(dir).filter(f => f.endsWith('.mp3'))
        .forEach(f => assert.ok(seen.has(f.slice(0, -4)), 'music/' + f + ' is in TRACKS'));
    // sting() looks these two up by name, so a rename that misses them is silence at the one
    // moment the player is looking at the result screen.
    ['sting-victory', 'sting-defeat'].forEach(f =>
        assert.ok(seen.has(f), f + ' exists for Battle.endBattle'));
    // 🎵 Sıradaki exists to get a different piece; rolling the same one back is the one answer
    // it must never give. pick() is pure data — it touches no <audio>.
    ['map', 'battle'].forEach(scene => {
        M._last = {};
        let prev = null;
        for(let i = 0; i < 60; i++) {
            const tr = M.pick(scene);
            assert.strictEqual(tr.s, scene, 'a fresh piece is from the right scene');
            assert.notStrictEqual(tr.f, prev, 'a fresh piece is a fresh file: ' + prev);
            prev = tr.f;
        }
    });
    M._last = {};
});

// The music is NOT precached — 20.8 MB would make the install a 20 MB download before the
// game runs at all. sw.js caches each piece on first play instead, in its own cache that a
// VERSION bump does not wipe.
test('the soundtrack streams instead of being precached (#131)', () => {
    const fs = require('fs'), path = require('path');
    const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
    const files = sw.slice(sw.indexOf('const FILES'), sw.indexOf('];', sw.indexOf('const FILES')));
    assert.ok(!/music\//.test(files), 'no music file is in the precache list');
    assert.ok(/MUSIC/.test(sw) && /music\\\/\[\^\/\]\+\\\.mp3/.test(sw),
        'sw.js runtime-caches music/*.mp3');
    assert.ok(/k !== CACHE && k !== MUSIC/.test(sw), 'a VERSION bump leaves the music cache alone');
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

// A map mark from a rumour or a campaign is a composed line ("Siege: Praven"); it used to be
// stored translated and T()'d again when drawn, a miss on every EN/ID map (bug hunt).
test('i18n: a rumour mark and a campaign mark draw without a dictionary miss', () => {
    const w = H.world({ seed: 9, lang: 'en' });
    const { Game, Nobles, state, LOCATIONS, I18N } = w;
    const city = LOCATIONS.find(l => l.type === 'city');
    state.player.proficiencies.spotting.level = 8;
    for(let i = 0; i < 12; i++) { state.player.money = 500; Game.listenRumor(city.id); Game.closeModal(); }
    state.knownLocations.campaign = { x: city.x, y: city.y, radius: 200, day: state.time.day, label: w.Tx`Sefer: ${w.Tx(city.name)}` };
    I18N.missing.clear();
    Nobles.markers().forEach(m => Nobles.markerText(m));
    assert.deepStrictEqual([...I18N.missing], [], 'a map mark missed the dictionary');
});

// The news feed and a map mark are stored as keys (`Tx`) and worded when read: they used to be
// stored translated, and a language switch left the last 20 lines in the old language.
test('i18n: old news and a map mark reword after a language switch', () => {
    const w = H.world({ seed: 9, lang: 'en' });
    const { Game, Nobles, state, FACTIONS, LOCATIONS, I18N } = w;
    const fs = Object.keys(FACTIONS).filter(f => f !== 'player_kingdom');
    const [a, b] = fs.flatMap(x => fs.map(y => [x, y])).find(([x, y]) => x !== y && !Game.atWar(x, y) && !Game.allied(x, y));
    Game.declareWar(a, b);
    Game.startTowerReveal = () => {};
    state.knownLocations.x = { x: 0, y: 0, radius: 200, day: state.time.day, label: Game.npcTx(state.npcParties.find(n => n.trade)) };
    const shown = () => [I18N.show(state.warLog[0].msg), Nobles.markerText(state.knownLocations.x)];
    const en = shown();
    assert.ok(en[0].includes(Game.factionName(a)) && !/savaşa girdi/.test(en[0]), en[0]);
    const saved = JSON.stringify(state.warLog[0]);
    I18N.set('tr');
    const tr = shown();
    assert.ok(tr[0].includes('savaşa girdi') && tr[0].includes(Game.factionName(b)), tr[0]);
    assert.ok(/Kervanı|Köylüleri/.test(tr[1]) && tr[1] !== en[1], tr[1]);
    assert.strictEqual(JSON.stringify(state.warLog[0]), saved, 'reading the feed wrote to it');
    // an old save's line, already worded, shows as it was
    state.warLog.unshift({ day: 1, msg: 'Old line.' });
    assert.strictEqual(I18N.show(state.warLog[0].msg), 'Old line.');
    I18N.set('en');
});

// The morale breakdown's line names are object keys shown through T() on the party screen and
// the top-bar tooltip ('Aşırı yük' had no entry — bug hunt).
test('i18n: every morale line is in both dictionaries', () => {
    const d = require('./i18n-keys').dicts();
    g.Game.morale();
    const missing = Object.keys(g.state.player.moraleInfo).filter(k => !(k in d.en) || !(k in d.id));
    assert.strictEqual(missing.length, 0, `morale line with no dictionary entry: ${missing.join(', ')}`);
});

// Both tutorials are data tables shown through T() (tutorStep). The battle tour was reworded
// and never reached a dictionary — every EN/ID player met it in Turkish (bug hunt).
test('i18n: the map and battle tutorials are in both dictionaries', () => {
    const K = require('./i18n-keys'), d = K.dicts();
    const missing = ['TUTOR', 'BATTLE_TUTOR'].flatMap(l => g.Game[l].flatMap(s => [s.t, s.m, s.d]))
        .filter(Boolean).map(K.norm).filter(k => !(k in d.en) || !(k in d.id));
    assert.strictEqual(missing.length, 0, `tutorial text with no dictionary entry: ${missing[0]}`);
});

// The circuit regulars fill a tournament bracket through T() at display (#133 found them
// missing: every EN/ID bracket showed the Turkish epithets).
test('i18n: tournament regulars are in both dictionaries', () => {
    const d = require('./i18n-keys').dicts();
    const missing = g.Game.TOURNEY_REGULARS.filter(t => !(t in d.en) || !(t in d.id));
    assert.strictEqual(missing.length, 0, `regular with no dictionary entry: ${missing.join(', ')}`);
});

// Same blind spot again: the keyboard/touch help table is rendered with `T(k)`/`T(v)`
// (showKeys()), so a redesigned control scheme (the old single-stick+button touch
// layout became the current dual-stick one) can change Game.TOUCH_HELP's strings
// without the extractor ever noticing the new ones have no dictionary entry.
test('i18n: keyboard/touch help entries are in both dictionaries', () => {
    const d = require('./i18n-keys').dicts();
    const cells = [...g.Game.KEYS, ...g.Game.TOUCH_HELP].flat();
    const missing = cells.filter(t => !(t in d.en) || !(t in d.id));
    assert.strictEqual(missing.length, 0, `help entry with no dictionary entry: ${missing.join(', ')}`);
});

// The bandit lairs (2.2.0) keep their level tables and the in-lair tour as raw Turkish and
// translate at display (T(lv.name), T(s.m)...), which the extractor can't see. lair.js does
// nothing at load time, so it is evaluated on its own here and asked for every shown string;
// the lair quest's noble names ride along.
test('i18n: lair tables and the lair tour are in both dictionaries', () => {
    const fs = require('fs'), path = require('path'), vm = require('vm');
    const d = require('./i18n-keys').dicts(), ctx = {};
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'lair.js'), 'utf8') + ';this.Lair = Lair;', ctx);
    const strs = [...ctx.Lair.strings(), g.QUESTS.lair_captive.title, ...g.QUESTS.lair_captive.HEIRS];
    const missing = strs.filter(t => !(t in d.en) || !(t in d.id));
    assert.strictEqual(missing.length, 0, `lair text with no dictionary entry: ${missing.slice(0, 3).join(' | ')}`);
    // every level has an exit and a start, and every row is the same width
    for(const [k, lv] of Object.entries(ctx.Lair.LEVELS)) {
        const map = lv.map.join('\n');
        // a den holds prisoners; the mine (2.7.0) holds sacks of both ores, a cart and the foreman's chest instead
        if(lv.mine) assert.ok(/@/.test(map) && /o/.test(map) && /q/.test(map) && /M/.test(map) && /C/.test(map) && !/P/.test(map), `${k}: needs a start, iron and coal sacks, a cart and the foreman's chest`);
        else assert.ok(/@/.test(map) && /\$/.test(map) && /P/.test(map), `${k}: needs a start, a purse and prisoners`);
        assert.ok(lv.map.every(r => r.length === lv.map[0].length), `${k}: ragged map rows`);
        // solvable on paper (2.9.0): everything you need is reachable, every route is walkable
        const errs = ctx.Lair.check(k);
        assert.strictEqual(errs.length, 0, `${k}: ${errs.join('; ')}`);
    }
    // the map hands out exactly the levels lair.js has, and spreads them before repeating one
    assert.deepStrictEqual([...g.Game.LAIR_LAYOUTS].sort(), [...ctx.Lair.DENS].sort());
    const w = H.world({ seed: 4 }), G = w.Game;
    w.state.sites = w.state.sites.filter(s => s.kind !== 'lair');
    for(let i = 0; i < G.LAIR_LAYOUTS.length; i++) G.spawnLair(false);
    assert.deepStrictEqual([...G.dens().map(s => s.layout)].sort(), [...G.LAIR_LAYOUTS].sort(), 'fifteen lairs, fifteen different layouts');
    // an old save: a lair you've seen keeps the level its id picked, an unseen one gets a layout
    const old = G.dens().slice(0, 2); old.forEach(s => delete s.layout); old[0].seen = true;
    G.ensureLairs();
    assert.ok(!old[0].layout && old[1].layout, 'only the unseen lair is given a layout');
});

// The forge (2.5.0): forge.js does nothing at load time, so it is evaluated into its own world and
// its model is played by two scripted smiths. The careful one heats until the unfinished metal is
// orange, strikes where the most work is left (softly where little is), reheats when that spot
// cools and quenches in the band; the careless one swings full blows anywhere until the whole bar
// is dark. Every recipe must be forgeable by the first and the second must crack the piece.
function forgeWorld() {
    const fs = require('fs'), path = require('path'), vm = require('vm');
    const w = H.world({ seed: 3 });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'forge.js'), 'utf8') + ';this.Forge = Forge;', w._ctx);
    w.Forge = w._ctx.Forge;
    return w;
}
function forgeBot(F, r, careless, seed = 1) {
    const m = F._model, M = F.MODEL, dt = 1 / 30, g = m.newBar(r, r.req);
    let x = seed, t = 0, phase = 'forge';
    const rnd = () => (x = (x * 16807) % 2147483647) / 2147483647;
    const open = () => g.segs.filter(s => s.w > g.tol / 2);
    while(t < 600) {
        if(phase === 'forge') {
            m.stepForge(g, dt, true); t += dt;
            if(careless ? g.segs[0].T > 1000 : open().every(s => s.T >= 1000) || g.segs.some(s => s.T > 1250)) phase = 'anvil';
            continue;
        }
        for(let k = 0; k < 12; k++) { m.stepAnvil(g, dt); t += dt; }
        if(m.shapeReady(g)) break;
        if(careless) {
            if(g.segs.every(s => s.T < M.EFF_LO)) { phase = 'forge'; g.heats++; }
            else m.strike(g, rnd() * (M.N - 1), 1);
            continue;
        }
        let best = -1, most = 0;
        g.segs.forEach((s, i) => { if(s.w > g.tol / 2 && s.T > 820 && s.w * s.w0 > most) { most = s.w * s.w0; best = i; } });
        if(best < 0) { phase = 'forge'; g.heats++; continue; }
        const s = g.segs[best];
        m.strike(g, best, Math.min(1, Math.max(.35, s.w * s.w0 / (M.K_STRIKE * m.eff(s.T)))));
    }
    for(let k = 0; k < 600 && g.segs.some(s => s.T > M.Q_HI); k++) m.stepAnvil(g, dt);
    const sc = m.score(g);
    return { g, sc, t, out: m.outcome(g, r, sc.S) };
}
// A grinder at the stone (phase 2): sweeps the blade along at `speed` segments/s at angle `a`, or
// (speed 0) holds it still on random spots for `dwell` s each. Stops once the edge is keen all along.
function grindBot(F, shape, { speed = 6, a = 20, dwell = 0 } = {}, seed = 1) {
    const m = F._model, g = m.newEdge(shape, 1), dt = 1 / 30;
    let x = seed, t = 0, dir = 1, hold = 0;
    const rnd = () => (x = (x * 16807) % 2147483647) / 2147483647, end = F.MODEL.N - 1;
    g.a = a;
    while(t < 60) {
        if(dwell) { if((hold -= dt) <= 0) { g.u = g.e0 + rnd() * (end - g.e0); hold = dwell; } }
        else { g.u += dir * speed * dt; if(g.u > end) { g.u = end; dir = -1; } if(g.u < g.e0) { g.u = g.e0; dir = 1; } }
        m.stepGrind(g, dt, true); t += dt;
        const sc = m.grindScore(g);
        if(sc.mean > .97 && sc.lo > .9) break;
    }
    return { g, t, sc: m.grindScore(g) };
}
test('grindstone: a blade kept moving at the right angle keens evenly; held still it runs its temper; a wrong angle dulls it', () => {
    const { Forge: F } = forgeWorld();
    for(const shape of ['blade', 'axe', 'spear']) {
        const good = grindBot(F, shape);
        assert.ok(good.sc.Q > .85 && good.g.burns === 0 && good.t < 35, `${shape}: a careful grinder got ${good.sc.Q.toFixed(2)} in ${Math.round(good.t)} s, ${good.g.burns} burns`);
        const slow = grindBot(F, shape, { speed: 2 });
        assert.ok(slow.g.burns > 0 && slow.sc.Q < .7, `${shape}: a slow sweep never ran the temper (${slow.sc.Q.toFixed(2)})`);
        const still = grindBot(F, shape, { a: 32, dwell: 3 });
        assert.ok(still.sc.Q < .1, `${shape}: holding still at a steep angle scored ${still.sc.Q.toFixed(2)}`);
    }
    // what can go on the stone: edged weapons in hand, not maces, bows or armour
    const { sharpenable } = F._model, I = forgeWorld().ITEMS;
    assert.deepStrictEqual(['sword', 'axe', 'lance', 'mace', 'bow', 'mail'].map(id => sharpenable(I[id])), [true, true, true, false, false, false]);
});
// 2.7.1: the hero's armour is five pieces summed (leather 21, plate 65), on a scale no troop's attack
// reaches; subtracted, a hero in a leather set took 1–3 from a sergeant's blow and cut down ten
// armoured men alone. On the gear-armoured hero it's a share now; since 2.8.0 every blow is, the
// troops' and the tournament kit's on the troop scale (ARMOR_K).
test('armour: the hero\'s gear takes a share of a blow on its own scale, troops and the tournament kit on theirs', () => {
    const { Battle, TROOP_TYPES } = H.world({ seed: 1 });
    const sgt = TROOP_TYPES['Svadya Çavuşu'], raw = sgt.attack * Battle.DAMAGE_PACE;
    const onHero = (def, r = raw) => Battle.afterArmor('cut', r, def, { isPlayerTeam: true, id: 'player', gearArmor: true });
    const share = def => onHero(def, 100) / 100;     // a big blow, so rounding doesn't blur the share
    assert.ok(share(21) >= .7 && share(21) <= .78, `a leather set lets ${Math.round(share(21) * 100)} % of a sergeant's blow through`);
    assert.ok(share(65) >= .44 && share(65) <= .52, `a plate set lets ${Math.round(share(65) * 100)} % through`);
    assert.ok(Math.ceil(71 / onHero(21)) <= 10, `a level-1 hero in leather (71 hp) outlasts ${Math.ceil(71 / onHero(21))} sergeant blows`);
    // troop against troop and the tournament's fixed kit: the troop scale
    const plain = { isPlayerTeam: false }, K = Battle.ARMOR_K;
    assert.strictEqual(Battle.afterArmor('cut', raw, 12, plain), Math.round(raw * K / (K + 12)));
    assert.strictEqual(Battle.afterArmor('cut', raw, 21, { isPlayerTeam: true, id: 'player', gearArmor: false }), Math.round(raw * K / (K + 21)));
});
test('grindstone: the edge adds to the player\'s melee only, only with that weapon, and dulls battle by battle', () => {
    const w = forgeWorld(), { Game, Battle, state, ITEMS } = w;
    state.player.equipment.weapon = { ...ITEMS.sword, qty: 1 };
    state.player.sharp = { id: 'sword', pct: 15, left: 3, n: 3 };
    const plain = Battle.afterArmor('cut', 30, 0);
    assert.strictEqual(Battle.afterArmor('cut', 30, 0, null, { id: 'player' }), Math.round(plain * 1.15));
    assert.strictEqual(Battle.afterArmor('cut', 30, 0, null, { id: 'npc1' }), plain, 'someone else\'s blow took the player\'s edge');
    state.player.equipment.weapon = { ...ITEMS.axe, qty: 1 };
    assert.strictEqual(Game.edge(), 0, 'the edge followed the player to another weapon');
    state.player.equipment.weapon = { ...ITEMS.sword, qty: 1 };
    const seen = [];
    for(let i = 0; i < 4; i++) { seen.push(Game.edge()); Game.dullEdge(); }
    assert.deepStrictEqual(seen, [15, 10, 5, 0]);
    assert.strictEqual(state.player.sharp, null);
});
test('forge: tables are in both dictionaries and every recipe is a real item with a sane cost', () => {
    const d = require('./i18n-keys').dicts(), { Forge: F, ITEMS } = forgeWorld();
    const missing = F.strings().filter(t => !(t in d.en) || !(t in d.id));
    assert.strictEqual(missing.length, 0, `forge text with no dictionary entry: ${missing.slice(0, 3).join(' | ')}`);
    for(const r of F.RECIPES) {
        assert.ok(ITEMS[r.id], `${r.id}: no such item`);
        assert.ok(F.FAMILIES.some(f => f[0] === r.fam), `${r.id}: unknown family`);
        const c = F._model.cost(r), p = F._model.prevOf(r);
        assert.ok(c.iron >= 1 && c.coal > c.iron && c.hours >= 2, `${r.id}: cost ${JSON.stringify(c)}`);
        // the tier below is the same family, one step down, and armour has none
        if(r.fam === 'armor') assert.strictEqual(p, null);
        else if(p) assert.ok(p.fam === r.fam && p.req === r.req - 2, `${r.id}: falls back to ${p.id}`);
    }
    // raw iron is worth less than the piece; from tier 2 up the forge adds real value (a tier-1 mace
    // is little more than its one bar of iron — training work), and the hours are its price
    for(const r of F.RECIPES) {
        const iron = F._model.cost(r).iron * ITEMS.iron.basePrice, price = ITEMS[r.id].basePrice;
        assert.ok(iron < price && (r.req < 3 || iron <= price * 0.6), `${r.id}: ${iron} of iron for a ${price} piece`);
    }
});
test('forge: the bellows burn the bar, the idle hearth never does; cold metal doesn\'t move', () => {
    const { Forge: F } = forgeWorld(), m = F._model, M = F.MODEL, r = F.RECIPES[0];
    let g = m.newBar(r, 1);
    for(let i = 0; i < 30 * 120; i++) m.stepForge(g, 1 / 30, false);
    assert.strictEqual(g.burned, 0, 'an idle hearth burnt the bar');
    assert.ok(g.segs.every(s => s.T > M.EFF_LO), 'an idle hearth leaves the bar unworkable');
    for(let i = 0; i < 30 * 60; i++) m.stepForge(g, 1 / 30, true);
    assert.ok(g.burned > 0, 'a minute of bellows left the bar unburnt');
    g = m.newBar(r, 1);
    const hit = m.strike(g, 12, 1);
    assert.ok(hit.cold && g.cold === 1 && hit.work === 0, 'a full blow on cold metal moved it or wasn\'t a flaw');
    // the tip heats first: the colour gradient the player reads
    for(let i = 0; i < 30 * 3; i++) m.stepForge(g, 1 / 30, true);
    assert.ok(g.segs[M.N - 1].T > g.segs[0].T + 50, 'the tip and the tang heat alike');
});
test('forge: a careful smith forges every recipe, a careless one cracks it', () => {
    const { Forge: F } = forgeWorld();
    for(const r of F.RECIPES) {
        const good = forgeBot(F, r, false);
        assert.strictEqual(good.out.kind, 'item', `${r.id}: careful smith scored ${good.sc.S.toFixed(2)}`);
        assert.ok(good.t < 90, `${r.id}: careful forging took ${Math.round(good.t)} s`);
        assert.ok(good.g.cold === 0 && good.g.burned === 0, `${r.id}: careful smith flawed the bar`);
    }
    for(const id of ['sword', 'sword_royal', 'mace', 'nasal', 'plate']) for(const seed of [1, 2, 3]) {
        const bad = forgeBot(F, F.RECIPES.find(r => r.id === id), true, seed);
        assert.strictEqual(bad.out.kind, 'ruin', `${id}#${seed}: careless smith scored ${bad.sc.S.toFixed(2)}`);
    }
});
// 2.7.1: the anvil as a person plays it. This smith sees the bar only in pixels (an overworked
// spot is under a pixel thinner), hits whatever looks most above its outline, misses by up to
// half a segment either way, holds longer for a bigger excess and reheats when the spot looks dark.
// Before 2.7.1 the metal cooled in 4–7 s, a blow took half its neighbours' work and nothing stopped
// at the outline: this smith overworked 8–19 of 24 segments and scored shape 0.10–0.79.
function humanBot(F, r, seed, aim) {
    const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
    const m = F._model, M = F.MODEL, hS = 1.4, g = m.newBar(r, r.req), dt = 1 / 30;
    const px = s => Math.max(1, Math.round((s.t + s.w * (M.BILLET - s.t) * (s.w < 0 ? .6 : 1)) * hS));
    let x = seed, t = 0, hot = false;
    const rnd = () => (x = (x * 16807) % 2147483647) / 2147483647, noise = () => (rnd() + rnd() + rnd() - 1.5) * 1.4;
    while(t < 400) {
        if(!hot) { m.stepForge(g, dt, true); t += dt; hot = g.segs.every(s => s.T > 950) || g.segs.some(s => s.T > 1200); continue; }
        for(let k = 0; k < 15; k++) { m.stepAnvil(g, dt); t += dt; }      // a blow every half second
        if(m.shapeReady(g)) break;
        let best = -1, ex = 0;
        g.segs.forEach((s, i) => { const e = (px(s) - Math.max(1, Math.round(s.t * hS))) * Math.sign(M.BILLET - s.t || 1); if(e > ex) { ex = e; best = i; } });
        if(best < 0) { best = g.segs.findIndex(s => s.w > g.tol); ex = .5; }
        if(g.segs[best].T < 720) { hot = false; g.heats++; continue; }
        m.strike(g, clamp(best + aim * noise(), 0, M.N - 1), clamp(.35 + .65 * Math.min(1, ex / 5) + .1 * noise(), .35, 1));
    }
    return m.score(g);
}
test('forge: a smith who reads the bar by eye forges a good piece, and the metal stays workable whatever the skill', () => {
    const { Forge: F } = forgeWorld(), m = F._model;
    for(const id of ['sword', 'axe', 'mace', 'lance', 'plate', 'sword_wootz']) {
        const r = F.RECIPES.find(x => x.id === id), runs = [1, 2, 3, 4, 5, 6].map(k => humanBot(F, r, k * 7919, .35));
        const shape = runs.reduce((a, sc) => a + sc.shape, 0) / runs.length;
        assert.ok(shape >= .8, `${id}: a careful eye scores shape ${shape.toFixed(2)}`);
        const sloppy = [1, 2, 3].map(k => humanBot(F, r, k * 104729, .7)).reduce((a, sc) => a + sc.shape, 0) / 3;
        assert.ok(sloppy >= .6 && sloppy < shape, `${id}: a sloppier eye scores ${sloppy.toFixed(2)} against ${shape.toFixed(2)}`);
    }
    // from 1000 °C the middle of the bar stays above 720 °C for 15 s or more, at Demircilik 1 and at 10 alike
    const secs = lvl => { const g = m.newBar(F.RECIPES[0], lvl); g.segs.forEach(s => { s.T = 1000; s.w = .5; }); let t = 0; while(g.segs[12].T >= 720) { m.stepAnvil(g, 1 / 30); t += 1 / 30; } return t; };
    assert.ok(secs(1) >= 15 && Math.abs(secs(1) - secs(10)) < 1e-9, `workable for ${secs(1).toFixed(1)} s at Demircilik 1, ${secs(10).toFixed(1)} s at 10`);
});
test('forge: materials come from the bag, and from the storage only at your own fief', () => {
    const { Forge: F, state, LOCATIONS } = forgeWorld(), m = F._model;
    const loc = LOCATIONS.find(l => l.type === 'castle');
    state.player.inventory = state.player.inventory.filter(i => i.id !== 'iron' && i.id !== 'coal');
    state.player.inventory.push({ id: 'iron', qty: 1 });
    loc.storage = [{ id: 'iron', qty: 5 }];
    loc.owner = 'lord';
    assert.strictEqual(m.stock(loc, 'iron'), 1, 'a lord\'s storage was reachable');
    loc.owner = 'player';
    assert.strictEqual(m.stock(loc, 'iron'), 6, 'your own storage wasn\'t reachable');
    assert.ok(m.blockOf(loc, F.RECIPES[0]), 'forged without coal');
    assert.ok(m.blockOf(loc, F.RECIPES[1]), 'forged a tier above the skill');
});

// The bandit mine (2.7.0, smithing phase 3): a world always has one, its sacks and crucible steel
// come back slowly, and taking it by force hands over whatever stock it holds.
test('mine: always one on the map, its stock refills slowly, clearing it hands the stock over', () => {
    const { Game, state, ITEMS } = H.world({ seed: 4 }), M = Game.MINE;
    const mines = () => Game.lairs().filter(l => Game.isMine(l));
    assert.ok(mines().length >= 1, 'a new world has no mine');
    state.sites = state.sites.filter(s => !Game.isMine(s));
    Game.ensureLairs();
    assert.strictEqual(mines().length, 1, 'a world that lost its mine didn\'t get one back');
    const m = mines()[0];
    assert.ok(!Game.dens().includes(m), 'the mine counts as a den for the den quests');
    m.ore = { iron: 0, coal: 0 }; m.steel = 0;
    for(let d = 1; d <= M.steelDays; d++) { state.time.day = 24 * 10 + d; Game.lairTick(); }   // day 241–252: one steel day
    assert.deepStrictEqual(m.ore, { iron: Math.min(M.ore.iron, M.steelDays / M.regrow), coal: Math.min(M.ore.coal, M.steelDays / M.regrow) });
    assert.strictEqual(m.steel, 1, 'no crucible steel grew back in a steel period');
    const bag = id => (state.player.inventory.find(i => i.id === id) || { qty: 0 }).qty;
    const before = { iron: bag('iron'), coal: bag('coal'), crucible: bag('crucible') };
    Game.clearLair(m.id);
    assert.strictEqual(bag('iron'), before.iron + m.ore.iron * M.perSack.iron);
    assert.strictEqual(bag('coal'), before.coal + m.ore.coal * M.perSack.coal);
    assert.strictEqual(bag('crucible'), before.crucible + 1);
    assert.strictEqual(ITEMS.crucible.rare, true, 'crucible steel is for sale');
});

// Smith's work (2.7.0, phase 4): the masterworks need Demircilik 9 and a bar of crucible steel and
// fall back to the royal tier; the Örs perks bend cost, cooling, the pass mark and the stone; and
// melting a piece pays well under what a market does for it, whatever the perks.
test('forge: masterworks need crucible steel, Örs perks bend the numbers, melting is never a pump', () => {
    const w = forgeWorld(), { Forge: F, state, LOCATIONS, ITEMS } = w, m = F._model;
    const masters = F.RECIPES.filter(r => r.steel);
    assert.strictEqual(masters.length, 5);
    for(const r of masters) {
        assert.ok(r.req === 9 && ITEMS[r.id].rare && ITEMS[r.id].master, `${r.id}: not a rare Demircilik 9 masterwork`);
        const p = m.prevOf(r);
        if(r.fam !== 'armor') assert.strictEqual(p.req, 7, `${r.id} falls back to ${p && p.id}`);
    }
    const loc = LOCATIONS.find(l => l.type === 'castle'), sw = masters[0];
    loc.owner = 'player'; loc.storage = [];
    state.player.proficiencies.smithing = { level: 9, xp: 0, next: 999 };
    state.player.inventory = [{ ...ITEMS.iron, qty: 99 }, { ...ITEMS.coal, qty: 999 }];
    assert.ok(m.blockOf(loc, sw), 'a masterwork forged without crucible steel');
    state.player.inventory.push({ ...ITEMS.crucible, qty: 1 });
    assert.strictEqual(m.blockOf(loc, sw), null);
    // the perks
    state.player.perks = [];
    const c0 = m.cost(sw), g0 = m.newBar(sw, 9), e0 = m.newEdge('blade', 1);
    state.player.perks = ['smith_master_a', 'smith_grand_b', 'smith_oilstone_b', 'smith_quick_a'];
    const c1 = m.cost(sw), g1 = m.newBar(sw, 9), e1 = m.newEdge('blade', 1);
    assert.ok(c1.iron < c0.iron && c1.coal < c0.coal && c1.hours < c0.hours && c1.steel === c0.steel, `perks didn't spare: ${JSON.stringify([c0, c1])}`);
    assert.ok(m.passMark(g1) < m.passMark(g0) && g1.sigma < g0.sigma, 'the craft perks didn\'t ease the anvil');
    assert.strictEqual(e1.max - e0.max, 6, 'the oilstone didn\'t raise the grindstone\'s best edge');
    // melting: even with the scrapper's perk, the iron is worth at most half of what the piece costs
    state.player.perks = ['smith_scrap_a'];
    for(const r of F.RECIPES) assert.ok(m.meltIron(r) * ITEMS.iron.basePrice <= ITEMS[r.id].basePrice * 0.5, `${r.id}: melts into ${m.meltIron(r)} iron`);
    state.player.perks = [];
    state.player.inventory.push({ ...ITEMS.sword_steel, qty: 1 });
    const iron = state.player.inventory[0].qty, hour = state.time.day * 24 + state.time.hour;
    F.melt(loc.id, 'sword_steel');
    assert.ok(!state.player.inventory.some(i => i.id === 'sword_steel'), 'the piece is still in the bag');
    assert.strictEqual(state.player.inventory[0].qty, iron + m.meltIron(F.RECIPES.find(r => r.id === 'sword_steel')));
    assert.strictEqual(state.time.day * 24 + state.time.hour, hour + F.MELT.HOURS, 'melting took no time');
    w.Game.closeModal();
});

// The crafts (2.10.0): crafts.js does nothing at load time either, so it gets the forge's treatment —
// its own world, and scripted hands. A careful carpenter leans the saw against the grain it can see
// coming, strokes at an even pace, and planes the highest spot each time in the grain's direction; a
// careless one scrubs as fast as it can, never steers, and sweeps the plane end to end both ways.
function craftsWorld(seed = 3) {
    const fs = require('fs'), path = require('path'), vm = require('vm');
    const w = H.world({ seed });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'crafts.js'), 'utf8') + ';this.Crafts = Crafts;', w._ctx);
    w.Crafts = w._ctx.Crafts;
    return w;
}
function carpenterBot(C, r, careful, seed = 1) {
    const m = C._model, N = C.WOOD.N, g = m.newBoard(r, r.req, seed);
    let t = 0, it = 0;
    while(g.x < N) {
        const i = Math.min(N - 1, Math.floor(g.x));
        g.aim = careful ? Math.max(-1, Math.min(1, (-g.drift[i] - (g.y - 0.3) * 0.8) / C.WOOD.AIM)) : 0;
        t += careful ? 0.4 : 0.15;
        m.stroke(g, t);
    }
    m.toPlane(g);
    for(let d = 1; !m.planeReady(g) && it++ < 3000; d = -d) {
        // only as far as a hand can push it (planeTravel): the bots once planed from −0.5 while the
        // pointer stopped at 0, and the board's left end was out of every player's reach
        const T = m.planeTravel;
        if(!careful) { m.planeMove(g, T(d * -Infinity), T(d * Infinity)); continue; }
        let best = 0;
        g.h.forEach((h, i) => { if(h > g.h[best]) best = i; });
        m.planeMove(g, T(best - 0.5 * g.dir[best]), T(best + 0.5 * g.dir[best]));
    }
    const sc = m.boardScore(g);
    return { g, sc, out: m.outcome(g, r, sc.S) };
}
test('carpentry: a careful carpenter makes every piece at its level, a careless one makes firewood', () => {
    const { Crafts: C } = craftsWorld();
    for(const r of C.WOODWORK) for(const seed of [1, 2, 3]) {
        const good = carpenterBot(C, r, true, seed), bad = carpenterBot(C, r, false, seed);
        assert.strictEqual(good.out.kind, 'item', `${r.id} #${seed}: a careful carpenter scored ${good.sc.S.toFixed(2)}`);
        assert.ok(good.g.binds === 0 && good.g.tears === 0 && good.sc.saw > .8, `${r.id} #${seed}: careful work ${JSON.stringify(good.sc)}`);
        assert.strictEqual(bad.out.kind, 'ruin', `${r.id} #${seed}: careless work scored ${bad.sc.S.toFixed(2)}`);
        assert.ok(bad.g.binds > 20, `${r.id} #${seed}: scrubbing at ${(1 / 0.15).toFixed(1)} strokes/s never bound the saw`);
    }
    // the step below: a stool's has none, a table falls back to a wheel
    const m = C._model, ww = id => C.WOODWORK.find(r => r.id === id), g = m.newBoard(ww('table'), 7, 1);
    assert.deepStrictEqual({ ...m.outcome(g, ww('table'), C.WOOD.PREV) }, { kind: 'prev', id: 'wheel' });
    assert.strictEqual(m.outcome(m.newBoard(ww('stool'), 1, 1), ww('stool'), .5).kind, 'ruin');
});
test('carpentry: the grain pulls a straight saw off the line; the plane rides the hollows and tears against the grain', () => {
    const { Crafts: C } = craftsWorld(), m = C._model, W = C.WOOD, r = C.WOODWORK[3];
    // a saw held straight wanders with the grain, as far as the grain's own line says
    const g = m.newBoard(r, 1, 5);
    for(let t = 0; g.x < W.N; t += .4) m.stroke(g, t);
    assert.ok(Math.max(...g.dev.map(Math.abs)) > 1, `the grain moved a straight saw only ${Math.max(...g.dev.map(Math.abs)).toFixed(2)} mm`);
    // the plane: a hump comes down, a hollow next to it is ridden over
    const p = m.newBoard(r, 1, 5);
    p.h = new Array(W.N).fill(1); p.h[10] = 2; p.h[12] = 0.2; p.dir = new Array(W.N).fill(1);
    m.planeMove(p, 9.5, 12.5);
    assert.ok(p.h[10] < 2 && p.h[11] === 1 && p.h[12] === 0.2, `one pass over a hump: ${p.h.slice(9, 13).map(h => h.toFixed(2))}`);
    // planing with the grain never tears; against it, it does
    p.h = new Array(W.N).fill(3);
    for(let k = 0; k < 6; k++) m.planeMove(p, -0.5, W.N - 0.5);
    assert.strictEqual(p.tears, 0, 'the plane tore going with the grain');
    for(let k = 0; k < 6; k++) m.planeMove(p, W.N - 0.5, -0.5);
    assert.ok(p.tears > 0, 'six passes against the grain never tore');
    // both ends are in reach, each with the grain, within the travel a hand has (2.10.2: the left
    // end could not be planed at all), and a stroke that comes back counts the middle it lands on
    const T = m.planeTravel;
    assert.deepStrictEqual([T(-99), T(99)], [-0.5, W.N - 0.5], 'the plane can\'t start a stroke off the board');
    for(const grain of [1, -1]) {
        const e = m.newBoard(r, 1, 5);
        e.h = new Array(W.N).fill(2); e.dir = new Array(W.N).fill(grain);
        for(let k = 0; k < 12; k++) grain > 0 ? m.planeMove(e, T(-99), T(99)) : m.planeMove(e, T(99), T(-99));
        assert.ok(e.h[0] <= e.tol && e.h[W.N - 1] <= e.tol, `grain ${grain}: ends left at ${e.h[0].toFixed(2)} / ${e.h[W.N - 1].toFixed(2)}`);
        assert.strictEqual(e.tears, 0, `grain ${grain}: planing with it tore`);
    }
    const back = m.newBoard(r, 1, 5);
    back.h = new Array(W.N).fill(2); back.dir = new Array(W.N).fill(-1);
    m.planeMove(back, 1, 0);
    assert.ok(back.h[0] < 2 && back.h[1] === 2, `a stroke from 1 back to 0 cut ${back.h.slice(0, 2)}`);
    // a cut that strays into the piece leaves the edge short of the gauge before the plane touches it
    const q = m.newBoard(r, 1, 5);
    q.dev = new Array(W.N).fill(0); q.dev[4] = -3;
    m.toPlane(q);
    assert.ok(q.h[4] < -q.tol && q.h.filter((h, i) => i !== 4).every(h => h > q.tol), 'a stray cut didn\'t mark the edge');
});
function cookBot(C, mode, seed) {
    const m = C._model, g = m.newShift(1, 50, seed), dt = 1 / 30;
    let stirAt = 0;
    while(!g.ended) {
        m.stepKitchen(g, dt);
        if(mode === 'idle') continue;
        const p = g.pot, want = g.orders.filter(o => o.kind === 'kebap').length;
        g.skew.forEach((s, i) => {
            if(!s) { if(g.skew.filter(Boolean).length < want) m.flip(g, i); return; }
            const dn = s[s.down], up = s.down === 'a' ? s.b : s.a;
            if(dn >= .95 && up < .95) m.flip(g, i);
            else if(dn >= .95) m.takeOff(g, i);
        });
        if(mode === 'good') { if(p.fuel < .35) m.addWood(g); if(g.t - stirAt > 5) { m.stir(g); stirAt = g.t; } }
        else if(p.fuel < .8) m.addWood(g);   // 'hot': the fire kept roaring, the pot never stirred
        if(p.portions && g.orders.some(o => o.kind === 'corba')) m.ladle(g);
    }
    return { g, pay: m.shiftPay(g) };
}
test('kitchen: a good shift pays several times an idle one; a pot kept roaring spills and burns', () => {
    const { Crafts: C } = craftsWorld(), K = C.KITCHEN;
    for(const seed of [1, 2, 3]) {
        const good = cookBot(C, 'good', seed), idle = cookBot(C, 'idle', seed), hot = cookBot(C, 'hot', seed);
        assert.strictEqual(idle.pay.total, K.WAGE, 'an idle apprentice got more than the wage');
        assert.ok(idle.g.missed >= 5, `${idle.g.missed} orders went unserved by an idle apprentice`);
        assert.ok(good.pay.total >= 4 * idle.pay.total && good.g.missed === 0 && good.g.served.corba > 0, `a good shift: ${JSON.stringify(good.pay)}, ${good.g.missed} missed`);
        assert.ok(hot.g.served.corba === 0 && hot.g.wasted >= 3, `a roaring pot served ${hot.g.served.corba} bowls, wasted ${hot.g.wasted}`);
        between(good.pay.total, 70, 160, 'a good shift\'s pay');
    }
    // a raw skewer stays on the grill, a black one goes in the bin
    const m = C._model, g = m.newShift(1, 50, 1);
    m.flip(g, 0); g.skew[0].a = 1; g.skew[0].b = .3;
    assert.strictEqual(m.takeOff(g, 0).kind, 'raw');
    g.skew[0].b = 1.7;
    assert.strictEqual(m.takeOff(g, 0).kind, 'burnt');
    assert.strictEqual(g.skew[0], null);
});
test('crafts: tables are in both dictionaries, pieces are real items that pay for their timber, the market and caravans never stock them', () => {
    const d = require('./i18n-keys').dicts(), w = craftsWorld(), { Crafts: C, ITEMS, Game, state, LOCATIONS } = w;
    const missing = C.strings().filter(t => !(t in d.en) || !(t in d.id));
    assert.strictEqual(missing.length, 0, `crafts text with no dictionary entry: ${missing.slice(0, 3).join(' | ')}`);
    for(const r of C.WOODWORK) {
        const it = ITEMS[r.id], c = C._model.cost(r);
        assert.ok(it && it.type === 'craft', `${r.id}: not a craft item`);
        // sold at the market's 0.7 it beats its timber and rent, but by no more than a trade route an hour
        const perHour = (it.basePrice * 0.7 - c.timber * ITEMS.timber.basePrice - c.rent) / c.hours;
        between(perHour, 5, 40, `${r.id}'s profit an hour`);
    }
    assert.ok(Game.stocked('table') && Game.stocked('timber'), 'crafted goods and timber have no supply curve');
    assert.ok(!Object.values(ITEMS).some(i => i.type === 'trade' && C.WOODWORK.some(r => r.id === i.id)), 'a crafted good is a trade good: caravans would carry it');
    // one shift a day in each town, and a skill newer than the save starts at level 1
    const loc = LOCATIONS.find(l => l.type === 'city');
    assert.ok(!C._model.workedToday(loc));
    state.kitchenDays = { [loc.id]: state.time.day };
    assert.ok(C._model.workedToday(loc));
    state.time.day++;
    assert.ok(!C._model.workedToday(loc), 'the kitchen stayed shut the next day');
    delete state.player.proficiencies.cooking;
    Game.addProficiencyXp('cooking', 10);
    assert.strictEqual(state.player.proficiencies.cooking.level, 1);
    assert.ok(state.player.proficiencies.cooking.xp > 0, 'a skill missing from an old save gained nothing');
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
        // 260→300 (2.4.4): the band that walked onto a convoy is now the one that raids it, and
        // one band hunts one convoy; seed 1 went 249→264 raids, prosperity 66.3→67.6 (seeds 1–5:
        // 264–396 raids, 61.3–71.8 prosperity, before 249–459 and 56.4–68.8).
        between(r.caravanRaid, 20, 300, 'caravan raids');
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

// ---------- 3. A save taken in the middle of things (#147) ----------
// Each in-between state is set up with the game's own calls and saved. The save is loaded twice:
// into a page just opened (another world) and into a game sitting in the next scene of the list —
// a load from the pause menu lands on whatever is running. Both must come back as the very save
// (snapshot for snapshot), pass the invariants, and carry on: the tournament plays its next round,
// the siege counts its day, the wait runs out, the quest is handed in...
function midScene() {
    const canon = w => {
        const d = JSON.parse(JSON.stringify(w.Save.snapshot()));
        delete d.savedAt; delete d.state.meta;
        return d;
    };
    const diffs = (a, b, path = 'save', out = []) => {
        // undefined → value: a lazy field the load sets up (career.js's rule too)
        if(out.length >= 4 || a === undefined || JSON.stringify(a) === JSON.stringify(b)) return out;
        if(a && b && typeof a === 'object' && typeof b === 'object')
            new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => diffs(a[k], b[k], path + '.' + k, out));
        else out.push(`${path}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`.slice(0, 140));
        return out;
    };
    const world = seed => {
        const w = H.world({ seed });
        // the harness has no media element; a load syncs the music through one
        w._sandbox.Audio = function() { return { play: () => Promise.resolve(), pause() {}, load() {}, addEventListener() {}, removeEventListener() {}, volume: 1 }; };
        const p = w.state.player, names = Object.keys(w.TROOP_TYPES);
        p.party = Array.from({ length: 10 }, (_, i) => ({ id: 'ms' + i, name: names[i % 8], level: 8, xp: 0, xpNext: 99 }));
        p.money = 3000;
        return w;
    };
    const at = (w, l) => Object.assign(w.state.player, { x: l.x, y: l.y, status: 'idle', targetLocation: null });
    const city = w => w.LOCATIONS.find(l => l.type === 'city');
    const castle = w => w.LOCATIONS.find(l => l.type === 'castle');
    const bandit = w => w.state.npcParties.find(n => n.type === 'bandit' && n.size > 0);
    const day = (w, n = 1) => { H.run(w, n); w.Game.closeModal(); };

    const SCENES = {
        'turnuvanın iki turu arası': {
            set(w) {
                const c = city(w); at(w, c); w.state.activeTournaments[c.id] = true;
                w.Game.joinTournament(c); w.Game.startTournament(); w.Game.tourneyRoundDone(true); w.Game.closeModal();
            },
            goOn(w) {
                const t = w.state.tourney;
                assert.ok(t && t.started && t.round === 1 && !t.done, `tournament after the load: ${JSON.stringify(t && { round: t.round, done: t.done })}`);
                w.Game.joinTournament(city(w));   // the city's "Cetvele Dön"
                w.Game.tourneyRoundDone(true); w.Game.tourneyRoundDone(true);
                assert.ok(t.done && t.champion.you && t.paid, 'the tournament plays out to its champion');
            }
        },
        'kuşatma kampı': {
            set(w) { const k = castle(w); at(w, k); w.Game.beginSiege(k.id, 'tower'); day(w); },
            goOn(w) {
                assert.strictEqual(w.state.player.siege && w.state.player.siege.daysLeft, 2, 'the tower is two days off');
                day(w);
                assert.strictEqual(w.state.player.siege && w.state.player.siege.daysLeft, 1, 'a day of carpentry passes');
            }
        },
        'merdiven günü': {
            set(w) { const k = castle(w); at(w, k); w.Game.beginSiege(k.id, 'ladder'); day(w); },
            goOn(w) {
                const s = w.state.player.siege;
                assert.ok(s && s.daysLeft === 0 && !s.weaken, 'the ladders are ready');
                day(w);
                assert.ok(w.state.player.siege && w.state.player.siege.weaken > 0, 'waiting on starves the garrison');
            }
        },
        'bekleme sürerken': {
            set(w) { w.Game.startWait(10); },
            goOn(w) {
                assert.ok(w.state.player.wait && w.state.player.status === 'waiting', 'still camped');
                day(w); w.Game.waitTick();
                assert.ok(!w.state.player.wait && w.state.player.status === 'idle', 'the wait runs out');
            }
        },
        'görev teslimi beklerken': {
            set(w) {
                const lord = w.LORDS.find(l => (w._q = w.Quests.pick(l.id, true)));
                w._giver = lord.id; w.state.player.quests.push(w._q); w.Quests.markDone(w._q); w.Game.closeModal();
            },
            goOn(w) {
                const q = w.state.player.quests.find(x => x.state === 'awaiting');
                assert.ok(q, 'the finished job still waits for its hand-in');
                const money = w.state.player.money;
                w.Quests.offerMenu(q.giverId); w.Game.closeModal();
                assert.ok(!w.state.player.quests.includes(q) && w.state.player.money > money, 'handed in, paid');
            }
        },
        'karşılaşma penceresi açık': {
            set(w) { const b = bandit(w); at(w, { x: b.x - 20, y: b.y }); w.state.time.day = 20; w.Game.triggerEncounter(b); },
            goOn(w) {
                w.Game.closeModal();
                const b = bandit(w); at(w, { x: b.x - 20, y: b.y }); w.state.encounterCooldown = 0;
                w.Game.triggerEncounter(b);
                assert.strictEqual(w.state.player.currentEncounterNpcId, b.id, 'the next band can be met');
                w.Game.closeModal(); day(w);
            }
        },
        'esaret': {
            set(w) { w.Game.beginCaptivity(bandit(w), 5); w.Game.closeModal(); },
            goOn(w) {
                assert.ok(w.state.player.prisoner && w.state.player.status === 'prisoner', 'still a captive');
                const left = w.state.player.prisoner.daysLeft;
                day(w);
                assert.strictEqual(w.state.player.prisoner && w.state.player.prisoner.daysLeft, left - 1, 'captivity counts its days');
            }
        },
        'şölen sürerken': {
            set(w) { const c = city(w); w.Feast.schedule(c.faction, c.id, w.state.time.day); w.Feast.dailyTick(); },
            goOn(w) {
                const f = w.state.feast;
                assert.ok(f && f.endDay > w.state.time.day, 'the feast is on');
                day(w, f.endDay - w.state.time.day + 1);
                assert.ok(w.state.feast !== f && !(w.state.feast && w.state.feast.endDay === f.endDay), 'the feast ends on its day');
            }
        }
    };

    const names = Object.keys(SCENES);
    names.forEach((name, i) => test(`kayıt ara durumda (#147): ${name}`, () => {
        const w = world(10 + i);
        SCENES[name].set(w);
        const before = canon(w);
        w.Save.save('1'); w.Game.closeModal();
        const raw = w._sandbox.localStorage.getItem(w.Save.key('1'));
        const next = names[(i + 1) % names.length];
        for(const [where, into] of [['a page just opened', world(40 + i)], [`a game in "${next}"`, (() => { const o = world(70 + i); SCENES[next].set(o); return o; })()]]) {
            into._sandbox.localStorage.setItem(into.Save.key('1'), raw);
            into.Save.load('1'); into.Game.closeModal();
            const d = diffs(before, canon(into));
            assert.deepStrictEqual(d, [], `loaded into ${where}, the save came back different: ${d.join(' | ')}`);
            const bad = into.Debug.invariants();
            assert.strictEqual(bad.length, 0, `loaded into ${where}: ${bad.join(' | ')}`);   // a sandbox array: lengths, not deepStrictEqual
            SCENES[name].goOn(into);
            assert.strictEqual(into.Debug.errors.length, 0, `errors after going on in ${where}: ${into.Debug.errors.map(e => e.msg).join(' | ')}`);
        }
    }));

    // A load used to lay the save over the running game, so whatever the save didn't carry kept the
    // running game's value (#147): save, put money in a fief's treasury and bread in its storehouse,
    // load — the save's purse came back and the treasury kept the deposit, a pump. A castle taken,
    // a lord sworn in and a kingdom founded after the save outlived the load the same way.
    test('kayıt ara durumda (#147): yükleme dünyayı kayıttaki hâline döndürür (hazine, depo, kale, vasal, krallık)', () => {
        const w = world(99), k = castle(w), other = w.LOCATIONS.find(l => l.type === 'castle' && l !== k), lord = w.LORDS[2];
        k.owner = 'player'; at(w, k);
        w.state.player.inventory.push(Object.assign({}, w.ITEMS.bread, { qty: 5 }));
        const faction = lord.faction;
        w.Save.save('1'); w.Game.closeModal();
        w.Game.moveTreasury(k.id, 2000, 'in'); w.Game.moveStorage(k.id, 'bread', 5, 'in'); w.Game.closeModal();
        assert.ok(k.treasury === 2000 && k.storage.length, 'the deposit went in');
        other.owner = 'player';
        w.FACTIONS.player_kingdom = { name: 'Test', color: '#fff' };
        w.state.vassals = [lord.id]; w.Game.applyVassals();
        w.Save.load('1'); w.Game.closeModal();
        assert.strictEqual(w.state.player.money, 3000, 'the save\'s purse');
        assert.ok(!k.treasury && !(k.storage || []).length, `the treasury (${k.treasury}) and storehouse are the save's, empty`);
        assert.strictEqual(other.owner, undefined, 'the castle taken after the save is not yours');
        assert.strictEqual(lord.faction, faction, 'the lord sworn in after the save serves his old king');
        assert.ok(!w.FACTIONS.player_kingdom, 'the kingdom founded after the save is gone');
    });
}

// A returning player: a save an old release wrote (tools/saves/, played by that release's own
// tools) goes in through Save.migrate/apply and is played on — shopping, fights, quests, days —
// with the invariants checked after every action. Everything added since is missing from it.
// e2e/specs/oldsaves.spec.js opens the newer windows from the same saves in the browser.
slow('old saves: a save from an earlier release loads and plays 15 days clean', () => {
    const { run } = require('./career'), fs = require('fs'), path = require('path');
    const dir = path.join(__dirname, 'saves');
    for(const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
        const r = run(3, undefined, 15, null, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
        assert.deepStrictEqual(r.problems, [], `the ${f} save: ${r.problems[0]}`);
    }
});

// ---------- Output ----------
if(!FAST) { thresholds(); midScene(); }

const bad = results.filter(r => !r.ok);
results.forEach(r => console.log(`${r.ok ? '  ok' : 'FAIL'}  ${r.name}${r.ok ? '' : '\n        ' + r.msg}`));
console.log(`\n${results.length - bad.length}/${results.length} passed`);
if(bad.length) process.exit(1);
