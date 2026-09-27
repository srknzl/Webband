'use strict';
// The type check: tsc reads the game's own JavaScript (tools/tsconfig.json) and nothing is
// compiled. The ~170 errors it reported on day one are mostly inference noise and are frozen in
// tools/tsc-baseline.json; only a *new* one fails — a typo'd property, a wrong argument count,
// a repeated dictionary key (its first run found "Başlık" in both dictionaries twice: the
// bride-price screen said "Helmet").
//
// Its reach: `Game`, `Battle`, `state` and the other big globals are `any` to tsc — each refers
// to itself inside its own initializer, and typing them would take hundreds of annotations. So
// `Game.closeModl()` passes; what it does read is everything local: DOM calls, local objects and
// tables, argument counts of plain functions, object literals (the dictionaries included).
//
// An error is counted by file, code and the name it is about ("app.js TS2339 armor"), not by
// line, so moving code never trips it. Fixing errors leaves the baseline loose: the check fails
// then too, until `--update` locks the lower count in (a ratchet).
//
//   cd e2e && npm ci; cd ..      # typescript lives in e2e/node_modules, like Playwright
//   node tools/typecheck.js [--update]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TSC = path.join(ROOT, 'e2e/node_modules/typescript/bin/tsc');
const BASE = path.join(__dirname, 'tsc-baseline.json');
if(!fs.existsSync(TSC)) { console.error('typescript is missing: cd e2e && npm ci'); process.exit(2); }

const out = spawnSync(process.execPath, [TSC, '-p', path.join(__dirname, 'tsconfig.json'), '--pretty', 'false'], { encoding: 'utf8' }).stdout;
const errors = [...out.matchAll(/^(.+?)\((\d+),\d+\): error (TS\d+): (.*)$/gm)].map(([, file, line, code, msg]) => {
    const q = /'([^']*)'/.exec(msg);
    return { key: `${path.basename(file)} ${code} ${q ? q[1] : msg.slice(0, 60)}`, at: `${path.basename(file)}:${line}`, msg };
});
const now = {};
errors.forEach(e => now[e.key] = (now[e.key] || 0) + 1);
const sorted = o => Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});

if(process.argv.includes('--update')) {
    fs.writeFileSync(BASE, JSON.stringify(sorted(now), null, 1) + '\n');
    console.log(`baseline: ${errors.length} errors in ${Object.keys(now).length} groups`);
    process.exit(0);
}
const base = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, 'utf8')) : {};
const worse = Object.keys(now).filter(k => now[k] > (base[k] || 0));
const better = Object.keys(base).filter(k => (now[k] || 0) < base[k]);
worse.forEach(k => {
    console.log(`NEW ${k} (${base[k] || 0} → ${now[k]}):`);
    errors.filter(e => e.key === k).forEach(e => console.log(`  ${e.at} ${e.msg}`));
});
if(better.length) console.log(`${better.length} group(s) below the baseline (${better.slice(0, 3).join('; ')}…) — run node tools/typecheck.js --update to lock it in`);
console.log(`type check: ${errors.length} errors, ${worse.length} new group(s)`);
process.exit(worse.length || better.length ? 1 : 0);
