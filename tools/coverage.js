'use strict';
// The coverage map: which game functions no e2e run ever called. Every test run with
// COVERAGE=1 leaves a coverage.json next to its results (e2e/fixtures.js — V8's own call counts);
// this merges all of them and lists what nothing reached, biggest first. A function no test,
// monkey or sweep ever runs is where the next scenario should go.
//
//   cd e2e && COVERAGE=1 MONKEY=1 npx playwright test specs/monkey.spec.js; cd ..
//   node tools/coverage.js [--dir e2e/test-results] [--top 40] [--md out.md]
//
// Only the outermost never-run function is listed: the helpers inside it are unreached with it.
const fs = require('fs');
const path = require('path');
const H = require('./harness');

const ROOT = path.join(__dirname, '..');
const a = H.args();
const DIR = path.resolve(ROOT, a.dir || 'e2e/test-results');
const TOP = +a.top || 40;

function* runs(dir) {
    for(const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if(e.isDirectory()) yield* runs(p);
        else if(e.name === 'coverage.json') yield JSON.parse(fs.readFileSync(p, 'utf8'));
    }
}

// file → start offset → { name, end, ran }
const fns = {};
let count = 0;
if(fs.existsSync(DIR)) for(const run of runs(DIR)) {
    count++;
    for(const { file, functions } of run) {
        const m = fns[file] || (fns[file] = new Map());
        for(const [name, start, end, n] of functions) {
            if(!name) continue;                            // a script's top level
            const f = m.get(start) || { name, start, end, ran: false };
            f.ran = f.ran || n > 0;
            m.set(start, f);
        }
    }
}
if(!count) { console.error(`no coverage.json under ${path.relative(ROOT, DIR)} — run the e2e specs with COVERAGE=1 first`); process.exit(1); }

const rows = [], unreached = [];
for(const file of Object.keys(fns).sort()) {
    const src = fs.existsSync(path.join(ROOT, file)) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : '';
    const line = off => src.slice(0, off).split('\n').length;
    const all = [...fns[file].values()].sort((x, y) => x.start - y.start);
    const ran = all.filter(f => f.ran).length;
    rows.push(`| ${file} | ${ran}/${all.length} | ${all.length ? Math.round(ran / all.length * 100) : 0}% |`);
    let outer = -1;
    for(const f of all) {
        if(f.ran || f.start < outer) continue;
        outer = f.end;
        unreached.push({ file, name: f.name, line: line(f.start), lines: line(f.end) - line(f.start) + 1 });
    }
}
unreached.sort((x, y) => y.lines - x.lines);

const md = [
    `# Coverage map — ${count} runs`, '',
    '| file | functions run | |', '|---|---|---|', ...rows, '',
    `## Never run (${unreached.length}; biggest ${Math.min(TOP, unreached.length)})`, '',
    ...unreached.slice(0, TOP).map(u => `- \`${u.file}:${u.line}\` **${u.name}** — ${u.lines} lines`)
].join('\n');
console.log(md);
if(a.md) fs.writeFileSync(path.resolve(ROOT, String(a.md)), md + '\n');
