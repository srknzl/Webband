// ============================================================
// WebBand ölçüm koşum takımı (#62)
// ------------------------------------------------------------
// app.js/battle.js/nobles.js/quests.js tarayıcı için yazıldı ama içindeki
// mantığın tamamı saf: dünya üretimi, diplomasi, ekonomi, savaş matematiği.
// Burada minik bir DOM sahtesi kurulup dosyalar tek bir vm bağlamında
// çalıştırılır — böylece `const Game` / `const Battle` birbirini tarayıcıdaki
// gibi görür. Çizim çağrıları sahte tuval bağlamına düşer ve hiçbir şey yapmaz.
//
// Kullanım:  const g = require('./harness').load({ seed: 1 });  g.Game.init();
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = ['app.js', 'battle.js', 'nobles.js', 'quests.js'];

// Tohumlu üreteç (mulberry32): aynı tohum aynı dünyayı verir, ölçüm tekrarlanabilir olur
function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Her şeye "boş ama çalışır" cevap veren tuval bağlamı
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
            return (t[k] = noop);          // bilinmeyen çizim çağrısı: sessiz no-op
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
        // Gerçek çocuk varsa o döner, yoksa tembel bir hayalet: oyun kodu
        // `el.firstElementChild.innerText = …` gibi zincirler kuruyor.
        // *Hayalet children dizisinde DEĞİLDİR — `while(children.length > 5)
        // removeChild(lastChild)` (battle.js log) sonsuza dönüyordu.*
        get firstElementChild() { return this.children[0] || (this._kid || (this._kid = fakeEl('span', doc))); },
        // Ata zinciri tek kademe: `while(el.parentElement)` gezen kod sonsuza gitmesin
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
 * Oyunu tarayıcısız yükler.
 * @param {object} opts  seed: tohum (varsayılan 1), quiet: alert/uyarıları yut (varsayılan true)
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
        requestAnimationFrame: () => 1,        // döngü kurulur ama hiç dönmez; adımı sim sürer
        cancelAnimationFrame: () => {},
        setTimeout: () => 0, clearTimeout: () => {},
        setInterval: () => 0, clearInterval: () => {},
        navigator: { userAgent: 'node-harness', language: 'tr', clipboard: { writeText: () => Promise.resolve() } },
        screen: { width: 1920, height: 1080 },
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
    vm.runInContext('Math.random = __rng;', ctx);   // tohumlu üreteç bağlamın içinde

    for(const f of FILES) {
        vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
    }
    // `const` bağlamın sözcüksel kapsamında kalır, sandbox nesnesinde görünmez — buradan alınır
    const names = ['VERSION', 'Debug', 'Input', 'Game', 'Save', 'state', 'Battle', 'TournamentMinigame',
                   'Nobles', 'Feast', 'Quests', 'FACTIONS', 'LOCATIONS', 'ITEMS', 'TROOP_TYPES',
                   'TROOP_TREES', 'TROOP_UPGRADES', 'BAND_KINDS', 'LORDS', 'LADIES', 'COMPANIONS', 'QUESTS'];
    const out = { _ctx: ctx, _sandbox: sandbox, alerts, seed, reseed: s => vm.runInContext('Math.random = __rng;', ctx) };
    for(const n of names) {
        try { out[n] = vm.runInContext(`typeof ${n} !== 'undefined' ? ${n} : undefined`, ctx); }
        catch(e) { out[n] = undefined; }
    }
    return out;
}

/** Dünyayı kurar ve oyuncusuz simülasyona hazır hâle getirir. */
function world(opts = {}) {
    const g = load(opts);
    g.Game.init();            // yerleşim dağıtımı, yollar, NPC'ler
    g.Nobles.initRivals();
    g.Game.initDiplomacy();   // Kalradya'da her zaman açık bir cephe vardır
    return g;
}

/** Oyuncusuz N gün ilerlet. `onDay(day, g)` her günün sonunda çağrılır. */
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

/** `--gun 200 --tohum 1..5` → { gun: '200', tohum: '1..5' } (kısa çizgi sayısı önemsiz) */
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
    // Aralık iki yazımla da kabul edilir: "1-5" NaN'a düşüp listeyi boşaltıyor,
    // çağıran araç da boş listeyle "son satır yok" diye patlıyordu.
    let m = s.match(/^(\d+)\s*(?:\.\.|-)\s*(\d+)$/);
    if(m) {
        let a = Number(m[1]), b = Number(m[2]);
        return Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => Math.min(a, b) + i);
    }
    let list = s.split(',').map(Number).filter(n => !isNaN(n));
    return list.length ? list : def;      // boş liste dönmez — araçlar tek turu varsayar
}

/** Ölçüm çıktısı docs/olcum/<tarih>-<konu>.md — CLAUDE.md'deki sayılar buradan alıntılanır. */
function writeReport(topic, markdown) {
    const dir = path.join(ROOT, 'docs', 'olcum');
    fs.mkdirSync(dir, { recursive: true });
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const file = path.join(dir, `${stamp}-${topic}.md`);
    fs.writeFileSync(file, markdown);
    return path.relative(ROOT, file);
}

module.exports = { load, world, run, mulberry32, args, seeds, writeReport };
