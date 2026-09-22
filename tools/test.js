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
    assert.strictEqual(seen.size, 60);
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
    Battle.dealMelee(src, tgt, 20);
    assert.strictEqual(tgt.hp, 85, '20 raw damage was not paced to 15');
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

test('battle terrain: a siege wall cannot persist into the next field battle', () => {
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
    gw.state.player.ambition = { id: 'champion', day: gw.state.time.day };
    gw.state.player.ambitionsDone = (gw.state.player.ambitionsDone || []).filter(id => id !== 'champion');
    const m0 = gw.state.player.money, r0 = gw.state.player.renown, w0 = gw.state.player.tourneyWins || 0;
    for(let i = 0; i < 3; i++) gw.Game.tourneyRoundDone(true);
    assert.ok(gw.state.tourney.champion.you, 'the player won every round and was still not crowned');
    assert.strictEqual(gw.state.player.money - m0, 1200, 'the prize ladder and ambition rewards did not arrive');
    assert.strictEqual(gw.state.player.renown - r0, 30, 'the championship and ambition paid the wrong renown');
    assert.strictEqual((gw.state.player.tourneyWins || 0) - w0, 1, 'the ambition counter did not tick');
    assert.ok(!gw.state.player.ambition && gw.state.player.ambitionsDone.includes('champion'),
        'winning the tournament did not immediately complete the selected ambition');
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
    Object.assign(M, { active: true, mode: 'chicken', goal: 16, gear: null, score: 0, targets: [] });
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
    M.mode = 'tournament'; M.gear = { size: 1, life: 1 };
    assert.ok(!spawn(20, 100).some(t => t.bad), 'a goose wandered into the tournament minigame');

    M.mode = 'chicken'; M.score = 3;
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
test('infamy: burning villages empties the recruiting tent, and the stain is slow (#104)', () => {
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
    foe.teamFight = {
        size:4, player:pair[0], enemy:pair[1],
        allies:[fighter('M1', 3), fighter('M2', 4), fighter('M3', 5)],
        enemies:[fighter('K1', 3), fighter('K2', 4), fighter('K3', 5)]
    };
    Battle.startTourneyFight(foe);
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
    state.player.ambition = { id:'champion', day:state.time.day };
    state.player.ambitionsDone = [];
    const wins = state.player.tourneyWins || 0;
    Game.tournamentFinished(false, { score:0 });
    assert.strictEqual(state.player.tourneyWins || 0, wins, 'a tournament loss incremented the win hook');
    assert.strictEqual(state.player.ambition.id, 'champion', 'a loss completed the champion ambition');
    Game.tournamentFinished(true, { score:3 });
    assert.strictEqual(state.player.tourneyWins, wins + 1, 'the win hook did not increment the tournament counter');
    assert.ok(!state.player.ambition && state.player.ambitionsDone.includes('champion'),
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

test('road: a lone wanderer asks to join instead of auto-joining (#33)', () => {
    const { Game, state, _sandbox } = gw;
    state.player.party = [];
    const before = state.player.party.length;
    Game.offerWanderer(gw.LOCATIONS[0]);
    const html = _sandbox.document.getElementById('modal-body').innerHTML;
    assert.ok(html.includes('acceptWanderer') && html.includes('declineWanderer'), 'no accept/reject buttons');
    assert.strictEqual(state.player.party.length, before, 'the wanderer joined before consent');
    Game.acceptWanderer();
    assert.strictEqual(state.player.party.length, before + 1, 'accept did not add the recruit');
    Game.offerWanderer(gw.LOCATIONS[0]);
    Game.declineWanderer();
    assert.strictEqual(state.player.party.length, before + 1, 'decline still added the recruit');
});

test('road: the storm now offers three balanced choices, the middle one costs food (#121)', () => {
    const { Game, state } = gw;
    const storm = Game.ROAD_EVENTS.find(e => e.id === 'storm');
    assert.strictEqual(storm.choices.length, 3, 'storm should have 3 choices');
    state.player.party = [{ id: 'p1', name: 'Asker', level: 1 }];
    state.player.inventory = [{ ...gw.ITEMS.wheat, qty: 5 }];
    const before = Game.foodStock().total;
    storm.choices[1].run({ food: before });     // "Atları yatıştır"
    assert.ok(Game.foodStock().total < before, 'the middle choice should cost food');
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

// --- Combat anchor matchups (Fable danisma 006) ---
// The rock-paper-scissors triangle, measured through the real engine. Bands are wide
// (Fable's calibration is ±8) so these guard the shape, not a knife-edge number: spears and
// shield troops must contest cavalry, plain infantry must lose to elite cavalry, cavalry must
// run down archers. A win-rate that leaves its band means a stat or the brace broke the triangle.
const { duel } = require('./duel');
const rate = (a, b, n = 1) => duel(a, b, n, 25, 2).winRateA;

test('anchor: spearmen contest light cavalry (brace)', () => {
    const w = rate('Rodok Mızraklısı', 'Kergit Süvarisi');
    assert.ok(w >= 40 && w <= 72, `spear vs light cav ${w}% — anti-cav brace off band`);
});
test('anchor: a shield line contests heavy cavalry', () => {
    const w = rate('Rodok Kalkanlısı', 'Svadya Şövalyesi');
    assert.ok(w >= 38 && w <= 72, `shield vs heavy cav ${w}% — off band`);
});
test('anchor: two same-tier infantry are an even fight', () => {
    const w = rate('Nord Baltacısı', 'Rodok Kalkanlısı');
    assert.ok(w >= 40 && w <= 66, `elite infantry mirror ${w}% — not an even fight`);
});
test('anchor: plain infantry loses to elite cavalry (bring spears)', () => {
    const w = rate('Nord Baltacısı', 'Svadya Şövalyesi');
    assert.ok(w <= 30, `axeman vs knight ${w}% — infantry should not beat elite cavalry head-on`);
});
test('anchor: cavalry runs down archers', () => {
    const w = rate('Svadya Şövalyesi', 'Rodok Tatar Yaylısı', 6);
    assert.ok(w >= 75, `cavalry vs archers ${w}% — horse should reach the bow line`);
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
        const b = Game.createNPC('Çapulcu Reisi', 'bandit', 6, '#8b0000');
        state.npcParties.push(b);
    }
    // An active AI siege so siege_provisions has a besieged fief to offer (its `can` gate).
    const siegeCity = LOCATIONS.find(l => l.type === 'city' && l.faction);
    if(siegeCity) {
        const sieger = Game.createNPC('Kuşatmacı', 'lord', 30, '#333');
        sieger.siegeLocId = siegeCity.id;
        state.npcParties.push(sieger);
    }
    const bandNpc = band => { const n = Game.createNPC('Çete', 'bandit', 4, '#888'); n.band = band; state.npcParties.push(n); return n; };

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
        clear_lair: q => Game.clearLair(q.data.lairId),
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
            assert.strictEqual(state.player.money, QUESTS[id].reward.money, 'reward wasn\'t paid');
        });
    });
}
questSuite();

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
    const b = Game.createNPC('Çapulcu Reisi', 'bandit', 6, '#8b0000');
    state.npcParties.push(b);
    const giver = LORDS.find(l => QUESTS.brother_in_chains.givers.includes(l.personality));
    const q = Quests.make('brother_in_chains', giver.id);
    state.player.quests.push(q);
    assert.strictEqual(q.data.npcId, b.id, 'setup should have tracked this exact bandit party');
    assert.strictEqual(b.questLocks, 1, 'the tracked party should be locked once');

    // Still the exact match it always was — a win against some other bandit party doesn't count.
    const other = Game.createNPC('Başka Çete', 'bandit', 5, '#888');
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

test('wait: a running camp is protected from map encounters', () => {
    const g = H.world({ seed: 40 });
    const { Game, state } = g;
    const band = Game.createNPC('Çapulcular', 'bandit', 8, '#800');
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
    const band = Game.createNPC('Çapulcular', 'bandit', 20, '#800');
    band.x = state.player.x + 220; band.y = state.player.y;
    band.targetX = state.player.x; band.targetY = state.player.y;
    state.npcParties = [band];
    Game.updateNPCs(10);
    assert.ok(Game.dist(band, state.player) >= Game.CAMP_SAFE_RADIUS - 1,
        'a hostile party crossed the protected camp perimeter');
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
    state.player.ambition = { id:'feud', day:state.time.day };
    state.player.ambitionsDone = [];
    state.player.hadGrudge = false;
    state.grudges[lord.id] = state.time.day;
    state.player.prisoners = [{ id:'held_lord', name:lord.name, noble:true, lordId:lord.id,
                                faction:lord.faction, ransom:1000 }];
    Game.releaseLord('held_lord');
    assert.ok(!state.player.ambition && state.player.ambitionsDone.includes('feud'),
        'releasing the feud prisoner did not complete the selected goal');
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
        let n = Game.createNPC('Takipçi', 'bandit', 8, '#800');
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
test('band population tracks a target that rises over 60 days', () => {
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

// The dictionary gate above only sees prose that is already wrapped in T(). Prose that
// was never wrapped is invisible to it and ships Turkish to every language — which is
// exactly how #129 shipped the spouse menu. This gate reads the other direction: Turkish
// sitting in an HTML text node outside any T() call.
test('i18n: no Turkish prose reaches the screen outside T()', () => {
    const fs = require('fs'), path = require('path');
    const K = require('./i18n-keys');
    const bad = [];
    for(const f of ['app.js', 'battle.js', 'nobles.js', 'quests.js'])
        K.rawUiText(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'))
            .forEach(h => bad.push(`${f}:${h.line} ${JSON.stringify(h.text.slice(0, 60))}`));
    assert.ok(bad.length === 0, `${bad.length} untranslated UI string(s), first: ${bad[0]}`);
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
    Game.update(0.016);                                  // seeds the previous-position pair
    const tx = state.player.x + Game.camera.offsetX, ty = state.player.y + Game.camera.offsetY;
    for(let i = 0; i < 50; i++) { state.player.x += 7; state.player.y += 4; Game.update(0.016); }
    // Sub-pixel, not bit-exact: fifty subtractions of the player's own drifting float position
    // leave rounding behind. The invariant is that the view does not slide, not that it is exact.
    assert.ok(Math.abs(state.player.x + Game.camera.offsetX - tx) < 0.5, 'the panned view slid sideways');
    assert.ok(Math.abs(state.player.y + Game.camera.offsetY - ty) < 0.5, 'the panned view slid down');

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

// A hostile party that stays in view for CHASE_HOURS game hours is a chase, and a chase gets
// the fight music (#131). The count lives in advanceTime, so it only runs while the map is up
// and no modal is open — which is also what makes a dialog pause the chase instead of ending it.
test('a chase is ten visible game hours, and losing sight resets it (#131)', () => {
    const { Game, state } = g;
    Game.mapCanvas = { width: 800, height: 600 };
    Game.camera.x = state.player.x; Game.camera.y = state.player.y; Game.camera.zoom = 1;
    const put = (dx, dy) => {
        state.npcParties.length = 0;
        state.npcParties.push({ id: 'chase-test', type: 'bandit', size: 30, x: Game.camera.x + dx,
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
        assert.ok(['map', 'battle', 'sting'].includes(t.s), t.f + ' is in a known scene: ' + t.s);
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
