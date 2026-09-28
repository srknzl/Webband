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

// The rules live in the game (Debug.invariants): the same list runs in players' browsers,
// in every e2e test, and here after every scripted action
const invariants = g => g.Debug.invariants();

function run(seed, lang, days = DAYS, onDay) {
    const g = H.world({ seed, lang });
    // the harness has no media element; a load syncs the music through one
    g._sandbox.Audio = function() { return { play: () => Promise.resolve(), pause() {}, load() {}, addEventListener() {}, removeEventListener() {}, volume: 1 }; };
    const { Game, Battle, Save, Quests, state, LOCATIONS } = g;
    const rnd = H.mulberry32(seed * 7919);
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const problems = [];
    let day = 0, action = 'start';
    state.player.name = 'Kariyer';   // typed at creation in the game; the same in every language
    state.player.money = 2000;
    state.player.stats.hp = state.player.stats.maxHp;
    const seen = new Set(), worlds = [];
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
            // the giver's own window, as a player reaches it: a finished job is handed in there,
            // an open one refuses a second, otherwise it offers one (offerFrom skipped that gate
            // and never handed in: 40 quests piled up by day 1000, #149)
            let lord = pick(g.LORDS);
            Quests.offerMenu(lord.id);
            if(state.pendingQuest) rnd() < 0.8 ? Quests.accept() : Quests.decline(lord.id);
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

    for(day = 1; day <= days; day++) {
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
        if(a.lang) worlds.push(JSON.stringify(canonical(g)));   // compared day by day in --lang mode
        if(onDay) onDay(day, g);
    }
    return { problems, days: worlds, summary: `seed ${seed}: day ${days}, lvl ${state.player.stats.level}, party ${state.player.party.length}, ${Math.round(state.player.money)} dinars, renown ${state.player.renown}` };
}

// The whole world as data, keys sorted, minus the clock stamps and the debug log
function canonical(g) {
    const d = JSON.parse(JSON.stringify(g.Save.snapshot()));
    delete d.savedAt; delete d.state.meta;
    const sort = v => Array.isArray(v) ? v.map(sort) : v && typeof v === 'object'
        ? Object.keys(v).sort().reduce((o, k) => (o[k] = sort(v[k]), o), {}) : v;
    return sort(d);
}
function firstDiffs(a, b, path = 'save', out = []) {
    if(out.length >= 5 || JSON.stringify(a) === JSON.stringify(b)) return out;
    if(a && b && typeof a === 'object' && typeof b === 'object')
        new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => firstDiffs(a[k], b[k], path + '.' + k, out));
    else out.push(`${path}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`.slice(0, 200));
    return out;
}

// --lang xx: the same career in another language must end in the same world. The language layer
// only changes words on screen; a difference means a translation leaked into the game's logic
// (a translated troop name used as a type, a translated line kept in the state...).
if(require.main === module) {
    const other = a.lang;
    let all = [];
    for(const s of seeds) {
        const r = run(s);
        console.log(r.summary + (r.problems.length ? `, ${r.problems.length} problem(s)` : ', clean'));
        all = all.concat(r.problems);
        if(other) {
            const o = run(s, other), day = r.days.findIndex((d, i) => d !== o.days[i]);
            console.log(`seed ${s} in '${other}': ` + (day >= 0 ? `the worlds part on day ${day + 1}` : 'the same world, every day'));
            if(day >= 0) firstDiffs(JSON.parse(r.days[day]), JSON.parse(o.days[day]))
                .forEach(d => all.push(`seed ${s} day ${day + 1} [language '${other}'] ${d}`));
            o.problems.forEach(p => all.push(p.replace(/^(seed \d+ day \d+ )\[/, `$1[${other}: `)));
        }
    }
    if(all.length) { console.log('\n' + all.join('\n')); process.exit(1); }
}
module.exports = { run };
