#!/usr/bin/env node
'use strict';
// ============================================================
// A long game (#149): does anything pile up without end? sim.js measures 200 playerless days and
// career.js 150 played ones; nothing looked further. This plays both for 1000 days and samples
// the save's size, the lists that could grow (harness `footprint`) and the time a day takes.
// A number that keeps climbing in the second half is a leak.
//
//   node tools/longgame.js [--days 1000] [--seed 1] [--every 50] [--report]
// Exit code 1 if a number keeps growing, or the career broke something.
// ============================================================
const H = require('./harness');
const career = require('./career');

const a = H.args();
const DAYS = +a.days || 1000, EVERY = +a.every || 50;
const seeds = H.seeds(a.seed, [1]);

function sampler() {
    const rows = [];
    let t = Date.now();
    return {
        rows,
        onDay(day, g) {
            if(day % EVERY) return;
            rows.push({ day, ...H.footprint(g), msPerDay: Math.round((Date.now() - t) / EVERY) });
            t = Date.now();
        }
    };
}

// A leak never comes back down: the second half's lowest sample stays well above the first
// half's mean. A market's stock empties and refills (0 to 26 and back), and a run of full samples
// is not a trend; the quest list that piled up (#149) never dropped below 20 after day 500. The
// gap floors keep a list that goes from 2 to 3 from counting; time gets a ratio only, since the
// machine sets its scale.
const FLOOR = { saveKB: 8, msPerDay: 0 };
const mean = xs => +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1);
function growing(rows) {
    const mid = rows.length >> 1, out = [];
    for(const k of Object.keys(rows[0]).filter(k => k !== 'day')) {
        const early = mean(rows.slice(0, mid).map(r => r[k])), late = Math.min(...rows.slice(mid).map(r => r[k]));
        if(late > early * 1.25 && late - early >= (FLOOR[k] ?? 5)) out.push(`${k}: first-half mean ${early}, never below ${late} after`);
    }
    return out;
}

function table(title, rows) {
    const keys = Object.keys(rows[0]);
    return `### ${title}\n\n| ${keys.join(' | ')} |\n|${keys.map(() => '---').join('|')}|\n`
        + rows.map(r => `| ${keys.map(k => r[k]).join(' | ')} |`).join('\n') + '\n';
}

let md = `# A ${DAYS}-day game (#149)\n\n\`node tools/longgame.js --days ${DAYS} --seed ${a.seed || 1}\` · `
       + `version ${H.load({ seed: 1 }).VERSION.no}\n\n`;
const bad = [];
for(const seed of seeds) {
    const w = sampler(), g = H.world({ seed });
    H.run(g, DAYS, w.onDay);
    const c = sampler(), r = career.run(seed, undefined, DAYS, c.onDay);
    console.error(r.summary);
    for(const [name, s] of [['playerless world', w], ['scripted career', c]]) {
        const grows = growing(s.rows);
        md += table(`Seed ${seed}, ${name}`, s.rows) + `\nGrowing: ${grows.join(', ') || 'nothing'}\n\n`;
        grows.forEach(x => bad.push(`seed ${seed} ${name}: ${x}`));
    }
    r.problems.forEach(p => bad.push(p));
}
console.log(md);
if(a.report) console.error('written: ' + H.writeReport('long-game', md));
if(bad.length) { console.error('\n' + bad.join('\n')); process.exit(1); }
