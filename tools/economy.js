#!/usr/bin/env node
// ============================================================
// economy.js — money/expense curve for a given player script (#62)
// ------------------------------------------------------------
// Price, stock, wages, food and tax all run through the game's own
// functions (`Game.buyItem` / `sellItem` / `dailyUpdate`); the only thing
// written here is what the player does.
//
//   node tools/economy.js --script trade --days 60 --troops 10
//   node tools/economy.js --script all --days 60 --report
// ============================================================
'use strict';
const H = require('./harness');

// An army wants food: a starving group deserts and scatters within 5 days,
// and the measurement stopped being a "money curve" and became "the army
// evaporating". Every script passes through here at the start of the day —
// supplies are part of the expense too.
function feed(g) {
    const { Game, state, LOCATIONS } = g;
    if(!state.player.party.length) return 0;
    const fs = Game.foodStock();
    if(fs.days >= 4) return 0;
    const here = LOCATIONS.reduce((a, l) => Game.dist(state.player, l) < Game.dist(state.player, a) ? l : a, LOCATIONS[0]);
    const before = state.player.money;
    Game._marketLoc = here;
    Game.buyItem('wheat', Math.max(1, Math.ceil(fs.need * 10 - fs.low)));
    return before - state.player.money;
}

// Price depends on stock (#46 supply curve): looking at the single-unit price
// and buying 30 units makes up a fantasy profit. The **average** unit price of
// a shipment is read once stock has moved by half the shipment size — we nudge
// stock temporarily and put it back.
function avgPrice(g, loc, id, sell, qty) {
    const { Game } = g;
    const old = loc.stock[id];
    loc.stock[id] = Math.max(1, old + (sell ? qty / 2 : -qty / 2));
    Game._marketLoc = loc;
    const p = Game.marketPrice(id, sell);
    loc.stock[id] = old;
    return p;
}

// The purse alone is misleading: the trade script closes out the day with a
// full shipment and the money looks like zero, then it comes back the next
// day when sold. What's measured is **net worth** — purse + today's sale
// value of whatever trade goods are on hand.
function worth(g) {
    const { Game, state, LOCATIONS } = g;
    const here = LOCATIONS.reduce((a, l) => Game.dist(state.player, l) < Game.dist(state.player, a) ? l : a, LOCATIONS[0]);
    Game._marketLoc = here;
    return state.player.inventory.filter(i => i.type === 'trade')
        .reduce((sum, i) => sum + i.qty * (Game.marketPrice(i.id, true) || 0), state.player.money);
}

// Player scripts: called once per day, this is the "profession" choice of the playthrough
const SCRIPTS = {
    // An army that does nothing: the pure expense curve
    idle: { label: 'Idle army', day: () => {} },

    // A caravaneer who buys cheap and sells high: picks the most profitable good/route each time
    trade: {
        label: 'Trade route',
        setup(g) { this.target = null; },
        day(g) {
            const { Game, state, LOCATIONS, ITEMS } = g;
            const goods = Object.keys(ITEMS).filter(id => ITEMS[id].type === 'trade');
            const cities = LOCATIONS.filter(l => l.type === 'city');
            const here = cities.reduce((a, l) => Game.dist(state.player, l) < Game.dist(state.player, a) ? l : a, cities[0]);

            // Sell whatever's in the hold here (if there's a profit)
            Game._marketLoc = here;
            state.player.inventory.filter(i => i.type === 'trade').forEach(i => Game.sellItem(i.id, i.qty));

            // Most profitable (good, destination city) pair: buy here, sell there
            let best = null;
            goods.forEach(id => {
                Game._marketLoc = here;
                const buy = Game.marketPrice(id), stock = Math.floor(Game.stock(here, id));
                if(!stock) return;
                cities.forEach(dst => {
                    if(dst === here) return;
                    Game._marketLoc = dst;
                    const sell = Game.marketPrice(id, true);
                    const travelDays = Game.dist(here, dst) / Math.max(1, Game.getPlayerSpeed().value) / 24;   // returns a value-wrapped speed
                    // Draining more than a quarter of the destination's stock crashes the
                    // price (#46 supply curve) — profit can't be estimated without looking
                    // at the shipment size.
                    let qty = Math.min(stock, Math.floor(Game.stock(dst, id) * 0.25), 40);
                    if(qty <= 0) return;
                    // Measure the shipment's **total** profit per day, not the per-unit
                    // margin: velvet has a high unit margin but the market only buys one
                    // bolt, so that route doesn't cover the daily expense.
                    const profit = qty * (avgPrice(g, dst, id, true, qty) - avgPrice(g, here, id, false, qty)) / Math.max(0.5, travelDays);
                    if(profit > 0 && (!best || profit > best.profit)) best = { id, dst, buy, sell, profit, travelDays, qty };
                });
            });
            Game._marketLoc = here;
            // No profitable route: the trader doesn't just sit there — it moves to the
            // nearest other city and looks again (otherwise the script would wait forever
            // in the city whose price it just crashed).
            if(!best) {
                const dst = cities.filter(c => c !== here)
                    .sort((a, b) => Game.dist(here, a) - Game.dist(here, b))[0];
                const s2 = Math.max(2, Math.round(Game.dist(here, dst) / Math.max(1, Game.getPlayerSpeed().value)));
                for(let h = 0; h < s2; h++) Game.advanceTime(1);
                state.player.x = dst.x; state.player.y = dst.y;
                return;
            }

            const qty = Math.min(best.qty, Math.floor(state.player.money * 0.6 / best.buy));   // leave some cash for supplies
            if(qty > 0) Game.buyItem(best.id, qty);
            // Travel takes time: covers the distance at map speed
            const hours = Math.max(2, Math.round(best.travelDays * 24));
            for(let h = 0; h < hours; h++) Game.advanceTime(1);
            state.player.x = best.dst.x; state.player.y = best.dst.y;
        }
    },

    // A fief holder: tax comes in, garrison wages go out
    fief: {
        label: 'Fief holder',
        setup(g) {
            const { Game, state, LOCATIONS } = g;
            const city = LOCATIONS.filter(l => l.type === 'city')
                .sort((a, b) => Game.dist(state.player, a) - Game.dist(state.player, b))[0];
            Game.grantFief(city, city.faction);
            city.garrison = Array.from({ length: 20 }, (_, i) => ({
                id: 'gar_' + i, name: Game.recruitName(city), level: 1, xp: 0, xpNext: 3, type: 'infantry'
            }));
            this.city = city.name;
        },
        day(g) { g.Game.advanceTime(24); }
    }
};

function runScript(key, days, seed, troops, troopName, troopLvl, purse) {
    const g = H.world({ seed });
    const { Game, state } = g;
    const s = SCRIPTS[key];
    for(let i = 0; i < troops; i++) {
        state.player.party.push({ id: 'tr_' + i, name: troopName, level: troopLvl, xp: 0, xpNext: 3, type: 'infantry' });
    }
    state.player.money = purse;
    if(s.setup) s.setup(g);

    const curve = [], start = Math.round(worth(g)), wage = Math.round(Game.upkeep().wage);
    let feedSpent = 0;
    for(let d = 0; d < days; d++) {
        const dayStart = state.time.day;
        feedSpent += feed(g);
        s.day(g);
        while(state.time.day === dayStart) Game.advanceTime(1);   // fill out the day if the script didn't advance it
        curve.push(Math.round(worth(g)));
    }
    const end = worth(g);
    return {
        script: key, label: s.label, days, troops,
        start, end: Math.round(end),
        perDay: +((end - start) / days).toFixed(1),
        low: Math.min(...curve), high: Math.max(...curve),
        curve, wage, feed: Math.round(feedSpent / days),
        troopsLeft: state.player.party.length, errors: g.Debug.errors.length
    };
}

function main() {
    const a = H.args();
    const days = Number(a.days || a.gun || 60), seed = Number(a.seed || a.tohum || 1);
    const troops = Number(a.troops || a.asker || 10), tName = String(a.type || a.tur || 'Svadya Milisi'), tLvl = Number(a.level || a.seviye || 10);
    const purse = Number(a.purse || a.kasa || 1000);
    const LEGACY = { bos: 'idle', ticaret: 'trade', timar: 'fief' };   // ponytail: old script keys, drop once nothing references them
    const scriptArg = a.script || a.betik;
    const keys = (!scriptArg || scriptArg === 'all' || scriptArg === 'hepsi')
        ? Object.keys(SCRIPTS) : String(scriptArg).split(',').map(k => LEGACY[k] || k);
    const rows = keys.map(k => {
        const r = runScript(k, days, seed, troops, tName, tLvl, purse);
        console.error(`${r.label}: ${r.start} → ${r.end} coin (${r.perDay >= 0 ? '+' : ''}${r.perDay}/day)`);
        return r;
    });
    if(a.json) return console.log(JSON.stringify(rows, null, 2));

    const sample = r => r.curve.filter((_, i) => i % Math.max(1, Math.floor(days / 6)) === 0).join(' → ');
    let md = `# Economy curve — ${days} days, ${troops}× ${tName} (lvl ${tLvl})\n\n`
        + `\`node tools/economy.js --days ${days} --troops ${troops} --purse ${purse}\` · version ${H.load({ seed }).VERSION.no}\n`
        + `Starting purse ${purse} coin; the measured **net worth** = purse + today's sale value of trade goods on hand.\n`
        + `Price, stock, wages, food and tax run through the game's own code; supplies are bought every day so the army doesn't starve.\n\n`
        + `| Script | Start | End | Per day | Low | Daily wage | Daily feed | Troops left |\n|---|---|---|---|---|---|---|---|\n`
        + rows.map(r => `| ${r.label} | ${r.start} | ${r.end} | **${r.perDay >= 0 ? '+' : ''}${r.perDay}** | ${r.low} | ${r.wage}₺ | ${r.feed}₺ | ${r.troopsLeft}/${r.troops} |`).join('\n')
        + `\n\nCurve (sampled every ~${Math.max(1, Math.floor(days / 6))} days):\n\n`
        + rows.map(r => `- **${r.label}**: ${sample(r)}`).join('\n') + '\n';
    console.log(md);
    if(a.report || a.rapor) console.error('written: ' + H.writeReport('economy', md));
}

if(require.main === module) main();
module.exports = { runScript, SCRIPTS };
