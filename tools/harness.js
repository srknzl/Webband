// ============================================================
// WebBand measurement test harness (#62)
// ------------------------------------------------------------
// app.js/battle.js/nobles.js/quests.js are written for the browser, but all
// the logic inside them is pure: world generation, diplomacy, economy, combat
// math. Here a tiny DOM fake is set up and the files are run in a single vm
// context — so `const Game` / `const Battle` see each other just like in the
// browser. Drawing calls land on the fake canvas context and do nothing.
//
// Usage:  const g = require('./harness').load({ seed: 1 });  g.Game.init();
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
// Same order as index.html. i18n.js is required: app.js's top-level `state`
// table calls T('Maceracı'), and the file blows up mid-read if the language
// layer isn't loaded yet.
const FILES = ['i18n.js', 'lang-en.js', 'lang-id.js', 'app.js', 'battle.js', 'nobles.js', 'quests.js'];

// Seeded generator (mulberry32): same seed gives the same world, so a
// measurement is repeatable.
function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// A canvas context that answers everything with "empty but works"
function fakeCtx() {
    const grad = { addColorStop() {} };
    const noop = () => {};
    return new Proxy({
        canvas: null,
        createLinearGradient: () => grad,
        createRadialGradient: () => grad,
        createConicGradient: () => grad,
        createPattern: () => ({}),
        measureText: t => ({ width: String(t).length * 6 }),
        getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(4 * Math.max(1, w) * Math.max(1, h)) }),
        putImageData: noop,
        setLineDash: noop,
        getLineDash: () => [],
        save: noop, restore: noop
    }, {
        get(t, k) {
            if(k in t) return t[k];
            return (t[k] = noop);          // unknown drawing call: silent no-op
        },
        set(t, k, v) { t[k] = v; return true; }
    });
}

function fakeEl(tag, doc) {
    const cls = new Set();
    const el = {
        tagName: String(tag || 'div').toUpperCase(),
        id: '', value: '', textContent: '', innerText: '', innerHTML: '',
        style: {}, dataset: {}, children: [], parentNode: null,
        width: 900, height: 600,
        clientWidth: 900, clientHeight: 600, offsetWidth: 900, offsetHeight: 600,
        scrollWidth: 900, scrollHeight: 600, offsetParent: null, disabled: false, checked: false,
        classList: {
            add(...c) { c.forEach(x => cls.add(x)); },
            remove(...c) { c.forEach(x => cls.delete(x)); },
            contains(c) { return cls.has(c); },
            toggle(c, f) { let on = f === undefined ? !cls.has(c) : !!f; on ? cls.add(c) : cls.delete(c); return on; }
        },
        appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
        insertBefore(c) { this.children.unshift(c); c.parentNode = this; return c; },
        prepend(c) { this.children.unshift(c); if(c) c.parentNode = this; return c; },
        append(c) { this.children.push(c); if(c) c.parentNode = this; return c; },
        removeChild(c) { let i = this.children.indexOf(c); if(i >= 0) this.children.splice(i, 1); return c; },
        remove() { if(this.parentNode) this.parentNode.removeChild(this); },
        addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
        setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
        querySelector() { return null; }, querySelectorAll() { return []; },
        getBoundingClientRect() {
            return { left: 0, top: 0, right: this.clientWidth, bottom: this.clientHeight,
                     width: this.clientWidth, height: this.clientHeight, x: 0, y: 0 };
        },
        getContext() { return this._ctx || (this._ctx = fakeCtx()); },
        // Returns a real child if there is one, otherwise a lazy ghost: the game
        // code chains things like `el.firstElementChild.innerText = …`.
        // *The ghost is NOT in the children array* — `while(children.length > 5)
        // removeChild(lastChild)` (battle.js log) would otherwise loop forever.
        get firstElementChild() { return this.children[0] || (this._kid || (this._kid = fakeEl('span', doc))); },
        // Single-level ancestor chain: code walking `while(el.parentElement)` shouldn't loop forever
        get parentElement() { return this.parentNode || (this._top ? null : (this._up || (this._up = Object.assign(fakeEl('div', doc), { _top: true })))); },
        get lastElementChild() { return this.children[this.children.length - 1] || this.firstElementChild; },
        get firstChild() { return this.firstElementChild; },
        get lastChild() { return this.lastElementChild; },
        contains(c) { return this.children.indexOf(c) !== -1; },
        toDataURL() { return 'data:,'; },
        focus() {}, blur() {}, click() {}, select() {}, scrollIntoView() {},
        setSelectionRange() {}
    };
    return el;
}

function fakeDocument() {
    const byId = {};
    const doc = {
        hidden: false,
        readyState: 'complete',
        getElementById(id) { return byId[id] || (byId[id] = Object.assign(fakeEl('div', doc), { id })); },
        createElement(tag) { return fakeEl(tag, doc); },
        createTextNode(t) { return { textContent: t }; },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        addEventListener() {}, removeEventListener() {},
        execCommand() { return false; },
        // index.html is never loaded, so there's no static text to stamp:
        // I18N.prime() walks an empty tree and exits (see i18n.js textNodes).
        createTreeWalker() { return { nextNode: () => null }; },
        _byId: byId
    };
    doc.body = fakeEl('body', doc);
    doc.documentElement = fakeEl('html', doc);
    doc.head = fakeEl('head', doc);
    return doc;
}

function fakeStorage() {
    const m = new Map();
    return {
        getItem: k => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => m.set(k, String(v)),
        removeItem: k => m.delete(k),
        clear: () => m.clear(),
        key: i => [...m.keys()][i],
        get length() { return m.size; }
    };
}

/**
 * Loads the game without a browser.
 * @param {object} opts  seed: seed (default 1), quiet: swallow alert/warnings (default true)
 * @returns sandbox — Game, Battle, Nobles, Quests, Save, state, LOCATIONS, FACTIONS, ...
 */
function load(opts = {}) {
    const seed = opts.seed === undefined ? 1 : opts.seed;
    const doc = fakeDocument();
    const alerts = [];

    const sandbox = {
        console: opts.quiet === false ? console : Object.assign({}, console, { log: () => {} }),
        document: doc,
        localStorage: fakeStorage(),
        performance: { now: () => Number(process.hrtime.bigint() / 1000n) / 1000 },
        requestAnimationFrame: () => 1,        // a loop gets set up but never spins; the sim drives the steps
        cancelAnimationFrame: () => {},
        setTimeout: () => 0, clearTimeout: () => {},
        setInterval: () => 0, clearInterval: () => {},
        navigator: { userAgent: 'node-harness', language: 'tr', clipboard: { writeText: () => Promise.resolve() } },
        screen: { width: 1920, height: 1080 },
        NodeFilter: { SHOW_TEXT: 4, SHOW_ALL: 0xFFFFFFFF },
        devicePixelRatio: 1,
        innerWidth: 1920, innerHeight: 1080,
        alert: m => { alerts.push(String(m)); },
        Image: function () { return { set src(v) {}, onload: null }; },
        Blob: function () {}, URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
        AudioContext: undefined, webkitAudioContext: undefined,
        __rng: mulberry32(seed),
        __alerts: alerts
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.addEventListener = () => {};
    sandbox.removeEventListener = () => {};

    const ctx = vm.createContext(sandbox);
    vm.runInContext('Math.random = __rng;', ctx);   // seeded generator, inside the context

    for(const f of FILES) {
        vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
        // opts.lang: the language layer picks its dictionary as soon as it loads,
        // and the game files are read *after* that. If a top-level data table calls
        // T(...), the translation freezes right there — this flag makes that
        // freeze visible (see test.js).
        if(opts.lang && f === 'lang-id.js') vm.runInContext(`I18N.set(${JSON.stringify(opts.lang)});`, ctx);
    }
    // `const` stays in the context's lexical scope and isn't visible on the sandbox object — pull it out here
    const names = ['VERSION', 'Debug', 'Input', 'Game', 'Save', 'state', 'Battle', 'TournamentMinigame', 'I18N', 'T',
                   'Nobles', 'Feast', 'Quests', 'FACTIONS', 'LOCATIONS', 'ITEMS', 'TROOP_TYPES',
                   'TROOP_TREES', 'TROOP_UPGRADES', 'BAND_KINDS', 'LORDS', 'LADIES', 'COMPANIONS', 'QUESTS'];
    const out = { _ctx: ctx, _sandbox: sandbox, alerts, seed, reseed: s => vm.runInContext('Math.random = __rng;', ctx) };
    for(const n of names) {
        try { out[n] = vm.runInContext(`typeof ${n} !== 'undefined' ? ${n} : undefined`, ctx); }
        catch(e) { out[n] = undefined; }
    }
    return out;
}

/** Sets up the world and gets it ready for a playerless simulation. */
function world(opts = {}) {
    const g = load(opts);
    g.Game.init();            // settlement layout, roads, NPCs
    g.Nobles.initRivals();
    g.Game.initDiplomacy();   // Calradia always has an open front
    return g;
}

/** Advance N playerless days. `onDay(day, g)` is called at the end of each day. */
function run(g, days, onDay, step = 0.25) {
    const perDay = Math.round(24 / step);
    for(let d = 0; d < days; d++) {
        for(let i = 0; i < perDay; i++) {
            g.Game.advanceTime(step * g.Game.timeScale());
            g.Game.updateNPCs(step);
        }
        if(onDay) onDay(g.state.time.day, g);
    }
    return g;
}

/** `--days 200 --seed 1..5` → { days: '200', seed: '1..5' } (number of dashes doesn't matter) */
function args(argv = process.argv.slice(2)) {
    const o = {};
    for(let i = 0; i < argv.length; i++) {
        let a = argv[i];
        if(!a.startsWith('-')) continue;
        let k = a.replace(/^-+/, ''), v = true;
        if(k.includes('=')) { [k, v] = k.split(/=(.*)/); }
        else if(argv[i + 1] && !argv[i + 1].startsWith('-')) v = argv[++i];
        o[k] = v;
    }
    return o;
}

/** "1" → [1]; "1..5" / "1-5" → [1,2,3,4,5]; "1,3,7" → [1,3,7] */
function seeds(spec, def = [1]) {
    if(spec === undefined || spec === true) return def;
    let s = String(spec);
    // A range is accepted in both spellings: "1-5" was collapsing to NaN and
    // emptying the list, and the calling tool would then blow up on "no rows".
    let m = s.match(/^(\d+)\s*(?:\.\.|-)\s*(\d+)$/);
    if(m) {
        let a = Number(m[1]), b = Number(m[2]);
        return Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => Math.min(a, b) + i);
    }
    let list = s.split(',').map(Number).filter(n => !isNaN(n));
    return list.length ? list : def;      // never return an empty list — tools assume at least one round
}

/** Report output at docs/measurements/<date>-<topic>.md — the numbers in CLAUDE.md are quoted from these. */
function writeReport(topic, markdown) {
    const dir = path.join(ROOT, 'docs', 'measurements');
    fs.mkdirSync(dir, { recursive: true });
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const file = path.join(dir, `${stamp}-${topic}.md`);
    fs.writeFileSync(file, markdown);
    return path.relative(ROOT, file);
}

module.exports = { load, world, run, mulberry32, args, seeds, writeReport };
