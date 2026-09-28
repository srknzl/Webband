#!/usr/bin/env node
// ============================================================
// mapwatch.js — the map's parties, watched for moves no army makes
// ------------------------------------------------------------
// Every lord, band, caravan and wanderer moves in one place, `Game.updateNPCs`, one quarter
// hour at a time. This runs the world on the harness's clock and watches each party's every
// step for four things a player would call absurd:
//
//   jump    — a party that already existed moved outside `updateNPCs` (some daily rule set its
//             position: it vanished here and stood there), or moved faster inside it than its
//             speed allows with every bonus stacked (road ×1.18, a wolf's burst ×1.6, a lord's
//             pursuit up to ×1.5).
//   stuck   — a party with somewhere to go that hasn't made 20 units of ground in a day.
//   dither  — a party that turns back on itself again and again: a day with more than 8 steps
//             reversing the one before (a real target change turns it once).
//   pile    — six or more parties inside 40 units of one another for a whole day.
//   siege   — a party that says it besieges a place, a whole day more than 500 units from it.
//
// Four worlds per seed (SCENES): no player (parked off the map), a neutral company in the middle
// of the map (bands flee it or hunt it), a vassal at the front of a war (a kingdom's lords give
// chase) and the same vassal besieging the enemy's nearest castle (the relief comes). A hostile
// party that reaches the player is taken off the map, as an encounter would take it.
//
//   node tools/mapwatch.js [--seed 1-3] [--days 40]
// One line per find (MAP <kind> …) so the nightly can file them; exits 1 when any.
// ============================================================
'use strict';
const H = require('./harness');

const a = H.args();
const SEEDS = H.seeds(a.seed, [1, 2, 3]);
const DAYS = +a.days || 40, STEP = 0.25, PER_DAY = 24 / STEP;
const MAX_MULT = 1.18 * 1.6 * 1.5;              // road × wolf burst × lord pursuit: the fastest a step can be

// Where the player stands decides who notices him: nobody, the bands (a neutral company), a
// whole enemy kingdom (a vassal at the front), or that kingdom's relief (a vassal besieging).
const SCENES = {
    'no player': g => Object.assign(g.state.player, { x: 4500, y: -40000 }),
    'neutral company': g => Object.assign(g.state.player, { x: 4500, y: 4500 }),
    'vassal at the front': g => front(g, false),
    'vassal besieging': g => front(g, true)
};
function front(g, besiege) {
    const { Game, state, LOCATIONS, FACTIONS } = g;
    const facs = Object.keys(FACTIONS).filter(f => f !== 'player_kingdom');
    let mine, foe;
    for(const f of facs) for(const e of facs) if(!mine && Game.atWar(f, e)) { mine = f; foe = e; }
    if(!mine) { mine = facs[0]; foe = facs[1]; Game.declareWar(mine, foe); }
    state.player.vassalOf = mine;
    const castle = LOCATIONS.filter(l => l.type !== 'village' && l.faction === foe)
        .sort((a, b) => Math.min(...LOCATIONS.filter(m => m.faction === mine).map(m => Game.dist(m, a)))
                      - Math.min(...LOCATIONS.filter(m => m.faction === mine).map(m => Game.dist(m, b))))[0];
    if(besiege) {
        Game.beginSiege(castle.id, Object.keys(Game.SIEGE_PLANS)[0], false);
        Game.closeModal();
    } else Object.assign(state.player, { x: castle.x + 250, y: castle.y + 250, status: 'idle' });
}

function watch(seed, scene) {
    const g = H.world({ seed });
    const { Game, state } = g;
    Game.checkAchievements = () => {};
    const withPlayer = scene !== 'no player';
    state.player.party = Array.from({ length: 25 }, (_, i) => ({ id: 'w' + i, name: 'Acemi', level: 4, xp: 0, xpNext: 9, type: 'infantry' }));
    SCENES[scene](g);
    const finds = [], told = new Set();
    const tell = (kind, n, detail) => {
        const key = kind + ' ' + (n.lordId || n.type + ':' + (n.band || n.trade && 'trade' || n.wanderer || '')) + ' ' + detail.replace(/[\d.]+/g, '#');
        if(told.has(key)) return;
        told.add(key);
        finds.push(`MAP ${kind} seed ${seed} (${scene}) day ${state.time.day} ${String(Math.floor(state.time.hour)).padStart(2, '0')}h: `
            + `${n.name} [${n.type}${n.faction ? ' ' + n.faction : ''}${n.id ? ' ' + n.id : ''}] — ${detail}`);
    };
    // what a party was doing, for the report: it says where to look
    const doing = n => [n.siegeLocId && 'besieging ' + n.siegeLocId, n.playerTargetId && 'on the player', n.hunting && 'hunting ' + n.hunting,
        n.bandTargetId && 'patrolling at ' + n.bandTargetId, n.trade && 'trading', n.questWave && 'quest wave'].filter(Boolean).join(', ') || 'wandering';

    const seen = new Map();                        // id → { x, y, day: [positions this day], rev, prev }
    let contacts = 0;
    for(let t = 0; t < DAYS * PER_DAY; t++) {
        const before = new Map(state.npcParties.map(n => [n, { x: n.x, y: n.y }]));
        Game.advanceTime(STEP);
        // Movement lives in updateNPCs; anything else that moved an existing party set it down elsewhere
        for(const [n, p] of before) if(state.npcParties.includes(n) && Math.hypot(n.x - p.x, n.y - p.y) > 5)
            tell('jump', n, `set down ${Math.round(Math.hypot(n.x - p.x, n.y - p.y))} units away outside updateNPCs (${doing(n)})`);
        const mid = new Map(state.npcParties.map(n => [n, { x: n.x, y: n.y }]));
        Game.updateNPCs(STEP);
        for(const [n, p] of mid) {
            if(!state.npcParties.includes(n)) continue;
            const d = Math.hypot(n.x - p.x, n.y - p.y), cap = (n.speed || 0) * STEP * MAX_MULT + 1;
            if(d > cap) tell('jump', n, `stepped ${Math.round(d)} units in a quarter hour, its fastest is ${Math.round(cap)} (${doing(n)})`);
        }
        if(withPlayer) {                           // an encounter takes a party that reaches you off the map
            const hit = state.npcParties.filter(n => Game.isHostile(n) && Game.dist(n, state.player) < 40);
            if(hit.length) { contacts += hit.length; state.npcParties = state.npcParties.filter(n => !hit.includes(n)); }
        }

        for(const n of state.npcParties) {
            let s = seen.get(n.id);
            if(!s) { seen.set(n.id, s = { path: [], rev: 0, prev: null, x: n.x, y: n.y }); continue; }
            const vx = n.x - s.x, vy = n.y - s.y, len = Math.hypot(vx, vy);
            if(len > 0.5) {
                if(s.prev && (vx * s.prev[0] + vy * s.prev[1]) < -0.5 * len * Math.hypot(s.prev[0], s.prev[1])) s.rev++;
                s.prev = [vx, vy];
            }
            s.x = n.x; s.y = n.y;
            s.path.push([n.x, n.y, Math.hypot(n.targetX - n.x, n.targetY - n.y)]);
        }

        if((t + 1) % PER_DAY) continue;
        // ---- the day's verdicts ----
        for(const n of state.npcParties) {
            const s = seen.get(n.id);
            if(!s || s.path.length < PER_DAY) { if(s) { s.path = []; s.rev = 0; } continue; }
            const [x0, y0] = s.path[0], far = s.path.every(p => p[2] > 40);
            const moved = Math.max(...s.path.map(([x, y]) => Math.hypot(x - x0, y - y0)));
            if(n.speed > 0 && far && moved < 20 && !n.siegeLocId)
                tell('stuck', n, `${Math.round(moved)} units in a day with its target ${Math.round(s.path[s.path.length - 1][2])} away${Game.atMapEdge(n) ? ', pinned at the map edge' : ''} (${doing(n)})`);
            if(s.rev > 8) tell('dither', n, `turned back on itself ${s.rev} times in a day (${doing(n)})`);
            // a party that says it besieges a place stands at its walls, not a day's march away
            const sieged = n.siegeLocId && g.LOCATIONS.find(l => l.id === n.siegeLocId);
            if(sieged && s.path.every(([x, y]) => Math.hypot(x - sieged.x, y - sieged.y) > 500))
                tell('siege', n, `besieging ${sieged.id} all day from ${Math.round(Game.dist(n, sieged))} units away`);
            s.path = []; s.rev = 0;
        }
        // one line per crowd, not per member: the crowd is named by its members, the report says where
        const crowds = new Map();
        for(const n of state.npcParties) {
            const near = state.npcParties.filter(o => Math.hypot(o.x - n.x, o.y - n.y) < 40);
            if(near.length < 6) { n._pile = 0; continue; }
            if((n._pile = (n._pile || 0) + 1) < 2) continue;
            const key = near.map(o => o.id).sort().join(',');
            if(!crowds.has(key)) crowds.set(key, { n, near });
        }
        for(const { n, near } of crowds.values()) {
            const at = g.LOCATIONS.reduce((b, l) => Game.dist(l, n) < Game.dist(b, n) ? l : b);
            const kinds = {};
            near.forEach(o => { const k = `${o.type}${o.faction ? ' ' + o.faction : ''}: ${doing(o)}`; kinds[k] = (kinds[k] || 0) + 1; });
            tell('pile', n, `${near.length} parties within 40 units for a day, ${Math.round(Game.dist(at, n))} from ${at.id} — `
                + Object.entries(kinds).map(([k, c]) => `${c}× ${k}`).join('; '));
        }
        for(const [id] of seen) if(!state.npcParties.some(n => n.id === id)) seen.delete(id);
    }
    state.npcParties.forEach(n => delete n._pile);
    return { finds, contacts };
}

const all = [];
for(const seed of SEEDS) for(const scene of Object.keys(SCENES)) {
    const { finds, contacts } = watch(seed, scene);
    console.error(`seed ${seed} ${scene}: ${DAYS} days, ${finds.length} find(s), ${contacts} contacts`);
    all.push(...finds);
}
all.forEach(f => console.log(f));
console.log(all.length ? `${all.length} odd move(s)` : 'no odd move');
process.exit(all.length ? 1 : 0);
