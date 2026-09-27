'use strict';
// ============================================================
// A scripted career (bug hunt): a player who does what players do — shops, recruits, fights
// through auto-resolve, promotes, rests, takes and hands in quests, saves and loads — every
// day for N days, on the real game code in the harness. After every action the world is
// checked against what must always hold (finite money and HP, sane parties and stock,
// a save that loads back into the same state) and any thrown error is caught with the action
// that caused it.
//
//   node tools/career.js [--days 120] [--seed 1-5]
// Exit code 1 if anything broke; the report names the seed, the day and the action.
// ============================================================
const H = require('./harness');

const a = H.args();
const DAYS = +a.days || 120;
const seeds = H.seeds(a.seed, [1, 2, 3, 4, 5]);

function invariants(g) {
    const { state, LOCATIONS, Game } = g, p = state.player, bad = [];
    const fin = (v, what) => { if(typeof v !== 'number' || !Number.isFinite(v)) bad.push(`${what} = ${v}`); };
    fin(p.money, 'money'); if(p.money < 0) bad.push(`money negative: ${p.money}`);
    fin(p.stats.hp, 'hp'); fin(p.stats.maxHp, 'maxHp');
    if(p.stats.hp > p.stats.maxHp + 1e-6) bad.push(`hp ${p.stats.hp} > maxHp ${p.stats.maxHp}`);
    if(p.stats.hp <= 0 && !p.prisoner) bad.push(`hp ${p.stats.hp} while free`);
    fin(p.renown, 'renown'); fin(p.x, 'x'); fin(p.y, 'y'); fin(Game.morale(), 'morale');
    if(p.party.length > Game.getPartyCapacity() + 5) bad.push(`party ${p.party.length} over capacity ${Game.getPartyCapacity()}`);
    const ids = new Set();
    p.party.forEach(t => {
        if(!t.name) bad.push(`troop without a name: ${JSON.stringify(t)}`);
        if(ids.has(t.id)) bad.push(`two troops share id ${t.id}`); ids.add(t.id);
        fin(t.level, `troop ${t.name} level`); fin(t.xp, `troop ${t.name} xp`);
        if(!t.isCompanion && !t.isSpouse && !g.TROOP_TYPES[t.name]) bad.push(`troop of unknown type: ${t.name}`);
    });
    p.inventory.forEach(i => {
        fin(i.qty, `item ${i.id} qty`);
        if(!(i.qty > 0)) bad.push(`item ${i.id} with qty ${i.qty}`);
        if(!g.ITEMS[i.id] && !i.unique) bad.push(`unknown item ${i.id}`);
    });
    LOCATIONS.forEach(l => {
        fin(l.prosperity === undefined ? 50 : l.prosperity, `${l.id} prosperity`);
        if(l.prosperity < 0 || l.prosperity > 100) bad.push(`${l.id} prosperity ${l.prosperity}`);
        if(l.volunteersAvailable < 0) bad.push(`${l.id} volunteers ${l.volunteersAvailable}`);
        Object.entries(l.stock || {}).forEach(([k, v]) => { fin(v, `${l.id} stock ${k}`); if(v < 0) bad.push(`${l.id} stock ${k} ${v}`); });
        if(!g.FACTIONS[l.faction]) bad.push(`${l.id} belongs to unknown faction ${l.faction}`);
    });
    state.npcParties.forEach(n => {
        fin(n.x, `${n.id} x`); fin(n.y, `${n.id} y`); fin(n.size, `${n.id} size`);
        if(n.size <= 0 && !n.wanderer) bad.push(`${n.id} (${n.type}) has size ${n.size}`);
    });
    Object.entries(state.relations || {}).forEach(([k, v]) => fin(v, `relation ${k}`));
    return bad;
}

function run(seed) {
    const g = H.world({ seed });
    // the harness has no media element; a load syncs the music through one
    g._sandbox.Audio = function() { return { play: () => Promise.resolve(), pause() {}, load() {}, addEventListener() {}, removeEventListener() {}, volume: 1 }; };
    const { Game, Battle, Save, Quests, state, LOCATIONS } = g;
    const rnd = H.mulberry32(seed * 7919);
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const problems = [];
    let day = 0, action = 'start';
    state.player.money = 2000;
    state.player.stats.hp = state.player.stats.maxHp;
    const seen = new Set();
    const note = (msg) => { const k = msg.replace(/\d+(\.\d+)?/g, '#'); if(seen.has(k)) return; seen.add(k); problems.push(`seed ${seed} day ${day} [${action}] ${msg}`); };
    const go = loc => { Object.assign(state.player, { x: loc.x, y: loc.y, status: 'idle', targetLocation: null }); Game.enterLocation(loc); };
    const friendly = l => !Game.atWar(Game.playerFaction(), l.faction);

    const ACTIONS = {
        shop() {
            let c = pick(LOCATIONS.filter(l => l.type === 'city' && friendly(l)));
            go(c); Game.openMarket(c);
            ['wheat', 'bread', 'meat', 'cheese'].forEach(id => Game.buyItem(id, 1 + Math.floor(rnd() * 6)));
            let goods = Object.keys(g.ITEMS).filter(id => Game.marketPrice(id) !== null);
            Game.buyItem(pick(goods), 1 + Math.floor(rnd() * 3));
            let inv = state.player.inventory.filter(i => !i.unique);
            if(inv.length && rnd() < 0.5) Game.sellItem(pick(inv).id, 1 + Math.floor(rnd() * 3));
            Game.closeModal();
        },
        recruit() {
            let v = pick(LOCATIONS.filter(l => l.type === 'village' && friendly(l)));
            go(v);
            if(v.volunteersAvailable > 0 && !Game.raidedRecently(v)) Game.doRecruit(v.id, 1 + Math.floor(rnd() * 5), Game.volunteerTerms().cost);
        },
        fight() {
            let foes = state.npcParties.filter(n => n.type === 'bandit' && n.size > 0 && n.size <= state.player.party.length + 2);
            if(!foes.length) return;
            let n = pick(foes);
            Object.assign(state.player, { x: n.x - 30, y: n.y, status: 'idle', currentEncounterNpcId: n.id });
            Battle.start(n.name, n.size, null, n.faction || '', null, true, n.band || null);
            Game.closeModal(); Game.checkLevelUp();
        },
        lord() {
            let n = pick(state.npcParties.filter(x => x.lordId));
            if(!n) return;
            g.Nobles.talk(n.lordId); Game.closeModal();
        },
        promote() {
            let t = state.player.party.find(t => t.xp >= t.xpNext && g.TROOP_UPGRADES[t.name]);
            if(!t) return;
            let ups = [].concat(g.TROOP_UPGRADES[t.name]);
            let to = pick(ups), cost = Game.promoteCost ? Game.promoteCost(t, to) : 50;
            Game.promoteTroop(t.name, typeof to === 'string' ? to : to.name, cost);
        },
        rest() {
            let c = pick(LOCATIONS.filter(l => l.type === 'city' && friendly(l)));
            go(c); Game.openTavern(c); Game.restAtTavern(); Game.closeModal();
        },
        quest() {
            let lord = pick(g.LORDS);
            let q = Quests.offerFrom(lord.id);
            if(q && rnd() < 0.8 && Quests.accept) Quests.accept(lord.id);
            Game.closeModal();
        },
        grow() {                   // spend what the character screen offers
            const st = state.player.stats;
            while(st.attributePoints > 0) Game.addStat(pick(['str', 'agi', 'int', 'cha', 'vit']));
            while((st.focusPoints || 0) > 0) Game.addFocus(pick(Object.keys(state.player.proficiencies)));
            const open = g.PERKS.filter(pk => !Game.perkBlock(pk.id));
            if(open.length) Game.takePerk(pick(open).id);
        },
        gear() {
            const eq = state.player.inventory.map((it, i) => ({ it, i })).filter(o => ['weapon', 'armor', 'helmet', 'shield', 'gloves', 'boots', 'horse'].includes(o.it.type));
            if(eq.length) Game.equipItem(pick(eq).i);
            else { state.player.money += 400; ACTIONS.shop(); }
        },
        arena() {
            let c = pick(LOCATIONS.filter(l => l.type === 'city' && friendly(l)));
            go(c); Game.openArena(c); Game.closeModal();
            Game.finishArena(pick(Battle.ARENA_FOES), rnd() < 0.6); Game.closeModal();
        },
        tourney() {
            let c = pick(LOCATIONS.filter(l => l.type === 'city' && friendly(l)));
            state.activeTournaments[c.id] = true; go(c);
            Game.joinTournament(c); Game.startTournament();
            for(let r = 0; r < 3 && state.tourney && !state.tourney.done; r++) Game.tourneyRoundDone(rnd() < 0.6);
            Game.tourneyClose();
        },
        hire() {
            let c = pick(LOCATIONS.filter(l => l.type === 'city' && friendly(l)));
            go(c);
            if(rnd() < 0.5) { let pool = Game.mercPool(c); if(pool.list.length) Game.hireMercs(c.id, Math.floor(rnd() * pool.list.length), 1 + Math.floor(rnd() * 3)); }
            else Game.hireCompanion(pick(g.COMPANIONS).id);
            Game.closeModal();
        },
        prisoners() {
            if(!state.player.prisoners.length) return;
            Game.openSlaveTrader(); Game.sellPrisoners(pick(state.player.prisoners).name); Game.closeModal();
        },
        dismiss() {
            let t = state.player.party.find(t => !t.isCompanion && !t.isSpouse);
            if(t) { Game.doDismiss(Game.troopGroupKey(t), 1); Game.closeModal(); }
        },
        wait() { Game.startWait(1 + Math.floor(rnd() * 12)); Game.stopWait(); },
        screens() { ['character', 'party', 'inventory', 'quests', 'map'].forEach(s => Game.showScreen(s)); Game.showAchievements(); Game.showFiefs(); Game.closeModal(); },
        saveLoad() {
            // key order is not state: compared canonically, the whole snapshot but the clock stamps
            const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
                ? Object.keys(v).sort().reduce((o, k) => (o[k] = canon(v[k]), o), {}) : v;
            const snap = () => { let d = canon(JSON.parse(JSON.stringify(Save.snapshot()))); delete d.savedAt; delete d.state.meta; return d; };
            let before = snap();
            Save.save('1'); Game.closeModal();
            Save.load('1'); Game.closeModal();
            let after = snap();
            const diff = (x, y, path, out) => {
                if(x === undefined || JSON.stringify(x) === JSON.stringify(y)) return out;   // undefined → value: a lazy field set on load
                if(x && y && typeof x === 'object' && typeof y === 'object' && out.length < 6)
                    new Set([...Object.keys(x), ...Object.keys(y)]).forEach(k => diff(x[k], y[k], path + '.' + k, out));
                else if(out.length < 6) out.push(`${path}: ${JSON.stringify(x)} → ${JSON.stringify(y)}`.slice(0, 160));
                return out;
            };
            let d = diff(before, after, 'save', []);
            if(d.length) note(`save → load changed: ${d.join(' | ')}`);
        }
    };
    const names = Object.keys(ACTIONS);

    for(day = 1; day <= DAYS; day++) {
        for(let k = 0; k < 3; k++) {
            action = state.player.prisoner ? 'captive' : pick(names);
            if(state.player.prisoner) {
                // plan, and try once a day; the ransom, when asked, is paid
                state.player.prisoner.isPlanning = true; state.player.prisoner.escapeChance = Math.min(80, (state.player.prisoner.escapeChance || 0) + 30);
                try { Game.attemptEscape(); } catch(e) { note(`threw: ${e.message}`); }
                Game.closeModal(); break;
            }
            const errs = g.Debug.errors.length;
            try { ACTIONS[action](); } catch(e) { note(`threw: ${e.message} @ ${(e.stack || '').split('\n')[1].trim()}`); }
            if(g.Debug.errors.length > errs) g.Debug.errors.slice(errs).forEach(e => note(`Debug.errors ${e.kind}: ${e.msg}`));
            invariants(g).forEach(note);
            if(Battle.active) { Battle.active = false; note('battle still active after an auto-resolve'); }
        }
        if(process.env.TRACE) console.log(`day ${day}: money ${Math.round(state.player.money)} party ${state.player.party.length} hp ${Math.round(state.player.stats.hp)} status ${state.player.status}`);
        action = 'day passes';
        try {
            for(let i = 0; i < 96; i++) { Game.advanceTime(0.25 * Game.timeScale()); Game.updateNPCs(0.25); }
            Game.closeModal();
        } catch(e) { note(`threw: ${e.message} @ ${(e.stack || '').split('\n')[1].trim()}`); }
        invariants(g).forEach(note);
    }
    return { problems, summary: `seed ${seed}: day ${DAYS}, lvl ${state.player.stats.level}, party ${state.player.party.length}, ${Math.round(state.player.money)} dinars, renown ${state.player.renown}` };
}

let all = [];
for(const s of seeds) {
    const r = run(s);
    console.log(r.summary + (r.problems.length ? `, ${r.problems.length} problem(s)` : ', clean'));
    all = all.concat(r.problems);
}
if(all.length) { console.log('\n' + all.join('\n')); process.exit(1); }
