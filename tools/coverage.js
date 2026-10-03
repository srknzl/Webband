'use strict';
// The coverage map: which game functions no test ever called. Two sources, both V8's own call
// counts: every e2e run with COVERAGE=1 leaves a coverage.json next to its results
// (e2e/fixtures.js), and a Node run under NODE_V8_COVERAGE=.coverage-node leaves V8's raw files
// (the harness runs each game file under its own name, so tools/test.js and career.js count).
// This merges all of them and lists what nothing reached, biggest first — where the next
// scenario should go.
//
//   NODE_V8_COVERAGE=.coverage-node node tools/test.js
//   cd e2e && COVERAGE=1 npx playwright test --project=tr-desktop; cd ..
//   node tools/coverage.js [--dir e2e/test-results,.coverage-node] [--top 40] [--md out.md]
//
// Only the outermost never-run function is listed: the helpers inside it are unreached with it.
const fs = require('fs');
const path = require('path');
const H = require('./harness');

const ROOT = path.join(__dirname, '..');
const a = H.args();
const DIRS = String(a.dir || 'e2e/test-results,.coverage-node').split(',').map(d => path.resolve(ROOT, d));
const GAME = /^(i18n|app|battle|battle-gl|map-gl|map-art|nobles|quests|lair|forge|crafts)\.js$/;
const TOP = +a.top || 40;

function* runs(dir) {
    for(const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if(e.isDirectory()) yield* runs(p);
        else if(e.name === 'coverage.json') yield [JSON.parse(fs.readFileSync(p, 'utf8')), fs.statSync(p).mtimeMs];
        else if(/^coverage-.*\.json$/.test(e.name))            // Node's raw V8 output, one per process
            yield [JSON.parse(fs.readFileSync(p, 'utf8')).result.filter(r => GAME.test(r.url))
                .map(r => ({ file: r.url, functions: r.functions.map(f => [f.functionName, f.ranges[0].startOffset, f.ranges[0].endOffset, f.ranges[0].count]) })),
                fs.statSync(p).mtimeMs];
    }
}

// Offsets only mean something against the code they were recorded on: a run made before an edit
// would list every function twice, at old and new offsets. An e2e run carries the hash of the
// source it saw; Node's raw files carry none, so they have to be newer than every game file.
// ponytail: an edit *during* a Node run slips past the mtime check; rerun after editing.
const sha1 = f => require('crypto').createHash('sha1').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
const hashes = {};
const current = (run, mtime) => run.every(({ file, sha1: h }) => h ? h === (hashes[file] = hashes[file] || sha1(file))
    : !fs.existsSync(path.join(ROOT, file)) || fs.statSync(path.join(ROOT, file)).mtimeMs <= mtime);

// file → start offset → { name, end, ran }
const fns = {};
let count = 0, stale = 0;
for(const dir of DIRS.filter(d => fs.existsSync(d))) for(const [run, mtime] of runs(dir)) {
    if(!current(run, mtime)) { stale++; continue; }
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
if(stale) console.error(`skipped ${stale} run(s) recorded on older code — rerun them for a full map`);
if(!count) { console.error(`no coverage under ${DIRS.map(d => path.relative(ROOT, d)).join(', ')} — run the e2e specs with COVERAGE=1 or Node with NODE_V8_COVERAGE first`); process.exit(1); }

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
