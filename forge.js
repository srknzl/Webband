'use strict';
// ============================================================================================
// The forge (2.5.0) — smithing modelled on Kingdom Come: Deliverance II's anvil. A town's
// 🔨 Demirhane (rented by the job) or your own castle's forge (free, and it reaches into the
// storage) opens a recipe window; picking a piece pays its iron, coal and rent and opens the
// scene. There the metal is read by its glow, not by a number: pump the bellows until the bar
// burns orange-yellow (white burns it), take it to the anvil and hammer it EVENLY into the
// faint outline (overworking a spot thins it for good), put it back when the glow fades, and
// quench it once the shape holds — cherry-orange all along, before the tip goes dark. The
// score decides whether the piece comes out at its tier, a tier lower, or cracks.
//
// docs/PLAN-smithing.md has the design and the phases. Phase 4 (2.7.0) adds the masterworks
// (Demircilik 9 and a bar of crucible steel from the bandit mine), the Örs perks every number
// below can bend (Game.perkMod: coalSave, ironSave, forgeHours, blowFocus, passEase, edgeBonus,
// scrapYield) and melting a piece back down to iron.
// The model (Forge.MODEL + the pure step functions in Forge._model) is pinned by tools/test.js.
// Drawn with Canvas2D on #forge-canvas into a small pixel buffer scaled up whole; its own loop,
// the map loop steps aside while `Forge.active` (Game.inScene). Every shown word goes through
// T(); the recipe and help tables stay raw Turkish. Nothing here runs at load time.
// ============================================================================================
const Forge = (() => {
const el = id => /** @type {any} */ (document.getElementById(id));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const perk = k => Game.perkMod(k) / 100;   // the Örs branch, as a share

// ---------- the model ----------
const M = {
    N: 24,              // segments along the bar, tang first, tip last
    AMB: 25,            // room temperature (°C)
    F_HOT: 1450,        // the hearth with the bellows going
    F_IDLE: 820,        // ...and left alone
    F_UP: 0.35, F_DOWN: 0.2,      // how fast the hearth follows (1/s)
    K_IN: 0.2,          // how fast a segment takes the hearth's heat: the tang at 0.6×, the tip at 1.6×
    BURN_T: 1300,       // white: the steel starts to burn
    BURN_S: 0.8,        // seconds above it before a segment is burnt
    COOL: 0.009, COOL_THIN: 0.012, COOL_TIP: 0.009,   // cooling on the anvil (1/s): base, finished, tip — the same for every smith
    K_STRIKE: 0.30,     // work one full-heat blow takes off its centre segment
    SIGMA: 0.6,         // how far a blow spreads (segments): a neighbour takes a quarter
    OVER: 0.25,         // past the outline the metal stiffens: a blow moves it at this share
    CHILL: 4,           // °C a blow takes out of the metal it hits
    COLD: 650,          // a hard blow below this is a cold strike (a flaw)
    EFF_LO: 600, EFF_HI: 950,     // the metal moves from LO, fully from HI
    Q_LO: 760, Q_HI: 900,         // the quench's ideal band
    PASS: 0.62, PREV: 0.40,       // the score for a tier-1 piece (+0.04 a tier) / for the tier below
    BILLET: 11,         // the raw bar's thickness, in the outline's units
    IRON_SHARE: 0.5     // the iron's worth as a share of the piece's price
};

// Raw Turkish item names come from ITEMS and are translated where shown. `fam` groups one
// weapon's tiers — a forge that misses its tier falls back one step in its family; armour has
// no family below it. `req` is the Demircilik a piece needs: 1/3/5/7/9 for tiers 1–5 (every skill starts at 1). Leather
// pieces (Deri Zırh, Deri Başlık...) are not a smith's work. A masterwork (tier 5) also takes `steel`
// bars of crucible steel, which only the bandit mine gives; a miss loses the bar.
const RECIPES = [
    { id: 'sword', fam: 'sword', shape: 'blade', req: 1 }, { id: 'sword_steel', fam: 'sword', shape: 'blade', req: 3 },
    { id: 'sword_sham', fam: 'sword', shape: 'blade', req: 5 }, { id: 'sword_royal', fam: 'sword', shape: 'blade', req: 7 },
    { id: 'axe', fam: 'axe', shape: 'axe', req: 1 }, { id: 'axe_steel', fam: 'axe', shape: 'axe', req: 3 },
    { id: 'axe_master', fam: 'axe', shape: 'axe', req: 5 }, { id: 'axe_headsman', fam: 'axe', shape: 'axe', req: 7 },
    { id: 'mace', fam: 'mace', shape: 'mace', req: 1 }, { id: 'mace_steel', fam: 'mace', shape: 'mace', req: 3 },
    { id: 'mace_spiked', fam: 'mace', shape: 'mace', req: 5 }, { id: 'mace_warhammer', fam: 'mace', shape: 'mace', req: 7 },
    { id: 'lance', fam: 'lance', shape: 'spear', req: 1 }, { id: 'lance_long', fam: 'lance', shape: 'spear', req: 3 },
    { id: 'lance_knight', fam: 'lance', shape: 'spear', req: 5 }, { id: 'lance_piercing', fam: 'lance', shape: 'spear', req: 7 },
    { id: 'nasal', fam: 'armor', shape: 'plate', req: 1 }, { id: 'gauntlets', fam: 'armor', shape: 'plate', req: 3 },
    { id: 'greaves', fam: 'armor', shape: 'plate', req: 3 }, { id: 'greathelm', fam: 'armor', shape: 'plate', req: 3 },
    { id: 'mail', fam: 'armor', shape: 'plate', req: 3 }, { id: 'plate', fam: 'armor', shape: 'plate', req: 5 },
    { id: 'sword_wootz', fam: 'sword', shape: 'blade', req: 9, steel: 1 }, { id: 'axe_wootz', fam: 'axe', shape: 'axe', req: 9, steel: 1 },
    { id: 'mace_wootz', fam: 'mace', shape: 'mace', req: 9, steel: 1 }, { id: 'lance_wootz', fam: 'lance', shape: 'spear', req: 9, steel: 1 },
    { id: 'plate_wootz', fam: 'armor', shape: 'plate', req: 9, steel: 1 }
];
const FAMILIES = [['sword', 'Kılıçlar'], ['axe', 'Baltalar'], ['mace', 'Topuzlar'], ['lance', 'Mızraklar'], ['armor', 'Zırh ve miğfer']];

// The outline each shape is hammered into: thickness per segment (tang → tip)
const SHAPES = {
    blade: i => i < 3 ? 3 : i >= M.N - 4 ? Math.max(2, 7 - (i - (M.N - 5)) * 1.3) : 7,
    axe:   i => i < 4 ? 6 : i < 14 ? 4 : Math.min(15, 4 + (i - 13) * 1.2),
    mace:  i => i < 15 ? 4 : i < 17 ? 6 : (i % 2 ? 13 : 11),
    spear: i => i < 4 ? 6 : i < 13 ? 3 : i < 20 ? 3 + (i - 12) * 0.9 : Math.max(2, 9 - (i - 19) * 2),
    plate: i => i < 1 || i > M.N - 2 ? 6 : 4
};

const recipe = id => RECIPES.find(r => r.id === id) || null;
const tierOf = r => (r.req - 1) >> 1;
// the iron a piece is worth, before any perk: what melting it down goes by
const ironOf = r => Math.max(1, Math.round(ITEMS[r.id].basePrice * M.IRON_SHARE / ITEMS.iron.basePrice));
function cost(r) {
    const iron = ironOf(r), tier = tierOf(r);
    return { iron: Math.max(1, Math.round(iron * (1 - perk('ironSave')))), coal: Math.round((2 + Math.round(iron * 1.5)) * (1 - perk('coalSave'))),
             hours: Math.max(1, Math.round((2 + 2 * tier) * (1 - perk('forgeHours')))), rent: 10 + 10 * tier, steel: r.steel || 0 };
}
// the step below in the same weapon family, or null (armour, or the first tier)
function prevOf(r) {
    if(r.fam === 'armor') return null;
    const fam = RECIPES.filter(x => x.fam === r.fam), i = fam.indexOf(r);
    return i > 0 ? fam[i - 1] : null;
}

function newBar(r, lvl) {
    const shape = SHAPES[r.shape], tier = tierOf(r), segs = [], ease = clamp((lvl - r.req) / 6, 0, 1);
    for(let i = 0; i < M.N; i++) {
        const t = shape(i);
        // `w` is the share of this segment's work still to do: 1 raw, 0 on the outline, below 0
        // overworked. w0 is how much hammering the whole of it takes — more the further the
        // outline is from the billet, and more on a finer tier.
        segs.push({ T: M.AMB, w: 1, w0: (0.35 + 0.65 * Math.abs(M.BILLET - t) / 9) * (1 + 0.15 * tier), t, burnT: 0, burned: false });
    }
    return { segs, F: M.F_IDLE, heats: 1, cold: 0, burned: 0, strikes: 0, tier,
             ease, tol: 0.10 - 0.012 * tier + 0.04 * ease, sigma: M.SIGMA * (1 - perk('blowFocus')), passEase: perk('passEase') };
}
// how much a blow moves the metal at this heat
function eff(T) { return T < M.EFF_LO ? 0 : T >= M.EFF_HI ? 1 : (T - M.EFF_LO) / (M.EFF_HI - M.EFF_LO); }
// returns the segments that burnt this step
function stepForge(g, dt, pump) {
    const tgt = pump ? M.F_HOT : M.F_IDLE, rate = pump ? M.F_UP : M.F_DOWN, burnt = [];
    g.F += (tgt - g.F) * (1 - Math.exp(-rate * dt));
    g.segs.forEach((s, i) => {
        const k = M.K_IN * (0.6 + i / (M.N - 1));
        s.T += (g.F - s.T) * (1 - Math.exp(-k * dt));
        if(s.T > M.BURN_T) {
            s.burnT += dt;
            if(!s.burned && s.burnT > M.BURN_S) { s.burned = true; g.burned++; burnt.push(i); }
        }
    });
    return burnt;
}
function stepAnvil(g, dt) {
    g.F += (M.F_IDLE - g.F) * (1 - Math.exp(-M.F_DOWN * dt));
    g.segs.forEach((s, i) => {
        const thin = 1 - clamp(s.w, 0, 1);
        const c = M.COOL + M.COOL_THIN * thin + M.COOL_TIP * i / (M.N - 1);
        s.T += (M.AMB - s.T) * (1 - Math.exp(-c * dt));
    });
}
// one blow centred on `u` (a segment position, fractional) with power 0.35–1
function strike(g, u, p) {
    const c = clamp(Math.round(u), 0, M.N - 1), T = g.segs[c].T, cold = T < M.COLD && p > 0.3;
    let work = 0;
    g.segs.forEach((s, i) => {
        const sg = g.sigma || M.SIGMA, k = Math.exp(-((i - u) ** 2) / (2 * sg * sg));
        if(k < 0.02) return;
        // up to the outline the blow moves the metal fully, past it only at OVER: a stray blow
        // thins a finished spot a little, hammering on and on there still ruins it
        const d = M.K_STRIKE * p * eff(s.T) * k / s.w0, free = clamp(s.w, 0, d), moved = free + (d - free) * M.OVER;
        s.w -= moved; work += moved;
        s.T -= M.CHILL * p * k;
    });
    if(cold) g.cold++;
    g.strikes++;
    return { cold, work, T };
}
const shapeReady = g => g.segs.every(s => s.w <= g.tol);
const shapeDone = g => clamp(1 - g.segs.reduce((a, s) => a + clamp(s.w, 0, 1), 0) / g.segs.length, 0, 1);
function score(g) {
    const segs = g.segs, n = segs.length;
    const err = segs.reduce((a, s) => a + (s.w > 0 ? s.w : 1.8 * -s.w), 0) / n;
    const shape = clamp(1 - err * 3, 0, 1);
    let hi = -Infinity, lo = Infinity, q = 0;
    for(const s of segs) {
        hi = Math.max(hi, s.T); lo = Math.min(lo, s.T);
        q += s.T < M.Q_LO ? clamp((s.T - (M.Q_LO - 200)) / 200, 0, 1) : s.T > M.Q_HI ? clamp((M.Q_HI + 200 - s.T) / 200, 0, 1) : 1;
    }
    const quench = clamp(q / n - Math.max(0, (hi - lo - 200) / 400), 0, 1);
    const care = clamp(1 - 0.06 * g.cold - 0.08 * g.burned - 0.03 * Math.max(0, g.heats - 3 - g.tier), 0, 1);
    return { shape, quench, care, S: 0.55 * shape + 0.30 * quench + 0.15 * care };
}
// the score a piece needs: higher for a finer tier, a little lower for a smith above the recipe
const passMark = g => M.PASS + 0.04 * g.tier - 0.05 * g.ease - (g.passEase || 0);
function outcome(g, r, S) {
    if(S >= passMark(g)) return { kind: 'item', id: r.id };
    const p = prevOf(r);
    if(S >= M.PREV && p) return { kind: 'prev', id: p.id };
    return { kind: 'ruin', id: null };
}

// ---------- the grindstone ----------
// Sharpening (phase 2): a temporary edge on the weapon in hand, read from the sparks. The edge is
// the outline's working part — a blade past its tang, an axe's bit, a spear's head — and each of
// its segments has a keenness `k` (0 dull, 1 keen) and a heat `h`. Holding the blade on the
// turning stone works the segments round the contact point `u`; the angle `a` decides how well:
// near A0 it keens, off it barely bites, far off it rounds the edge back down. Contact heats the
// steel faster than it cools, so a blade held still runs its temper (h reaches 1: a blue mark that
// never takes a full edge again) and a blade kept moving doesn't. The score is the edge's mean and
// its worst spot; it becomes a damage bonus that dulls over the next few battles (Game.edge).
const GM = {
    A0: 20, AW: 9,      // the angle that keens (degrees) and how far off it still bites
    K: 1.4,             // how fast the stone keens the segment under it, at the right angle (1/s)
    H_UP: 1.4,          // heat from contact (1/s; ×1.5 at a steep angle); held still it runs in under a second
    H_COOL: 0.8,        // ...and the steel cools all the while (1/s)
    SIGMA: 0.8,         // how wide the contact is (segments)
    BURN_CAP: 0.5,      // the best a segment whose temper ran can still take
    MAX: 20,            // % damage for a perfect edge
    BATTLES: 3,         // battles until it's dull again
    RENT: 5, HOURS: 1   // a town smithy's stone, by the job
};
const EDGE = { blade: 3, axe: 14, spear: 13 };   // the first segment of the edge, by shape
const edgeMax = () => GM.MAX + Game.perkMod('edgeBonus');   // the Örs branch's whetstone perks
// an edged weapon in hand: swords, axes, spears and daggers, not maces or bows
const sharpenable = it => !!it && it.type === 'weapon' && it.weaponType !== 'bow' && (it.dmgType === 'cut' || it.dmgType === 'pierce');
function shapeOf(it) {
    const r = recipe(it.id);
    return r ? r.shape : it.weaponType === 'twoHanded' ? 'axe' : it.weaponType === 'polearm' ? 'spear' : 'blade';
}
function newEdge(shape, lvl) {
    const e0 = EDGE[shape] || EDGE.blade, segs = [];
    // the edge comes in dull and nicked, unevenly
    for(let i = 0; i < M.N; i++) segs.push({ t: SHAPES[shape](i), k: i < e0 ? 1 : .1 + .25 * hashRand(i * 7 + 3), h: 0, burned: false });
    return { segs, e0, u: (e0 + M.N - 1) / 2, a: 32, burns: 0, ease: clamp((lvl - 1) / 6, 0, 1), max: edgeMax() };
}
// how well the angle bites: 1 at A0, 0 at A0 ± AW, negative (rounding the edge) beyond
const matchOf = a => clamp(1 - ((a - GM.A0) / GM.AW) ** 2, -1, 1);
// returns the segments whose temper ran this step
function stepGrind(g, dt, on) {
    const m = matchOf(g.a), steep = Math.max(0, (g.a - GM.A0) / GM.AW), burnt = [];
    for(let i = g.e0; i < M.N; i++) {
        const s = g.segs[i], c = on ? Math.exp(-((i - g.u) ** 2) / (2 * GM.SIGMA * GM.SIGMA)) : 0;
        if(c > .02) {
            const cap = s.burned ? GM.BURN_CAP : 1;
            if(m > 0) s.k += Math.max(0, cap - s.k) * (1 - Math.exp(-GM.K * m * c * dt));
            else s.k = Math.max(0, s.k + GM.K * .4 * m * c * dt);
            s.h += GM.H_UP * c * (1 + .5 * Math.min(1, steep)) * (1 - .3 * g.ease) * dt;
            if(!s.burned && s.h >= 1) { s.burned = true; s.k = Math.min(s.k, GM.BURN_CAP); g.burns++; burnt.push(i); }
        }
        s.h *= Math.exp(-GM.H_COOL * dt);
    }
    return burnt;
}
function grindScore(g) {
    const ks = g.segs.slice(g.e0).map(s => Math.min(1, s.k));
    const mean = ks.reduce((a, k) => a + k, 0) / ks.length, lo = Math.min(...ks);
    const Q = clamp(.65 * mean + .35 * lo - .06 * g.burns, 0, 1);
    return { mean, lo, Q, pct: Math.round((g.max || GM.MAX) * Q) };
}

// ---------- the glow ----------
// Steel's colour by its heat, the way a smith reads it: dark red, cherry, orange, yellow, white.
// Below the glow it's grey steel; a cache keyed by 10 °C keeps it off the frame's hot path.
/** @type {[number, number[]][]} */
const GLOW = [[300, [118, 122, 130]], [480, [96, 90, 90]], [560, [112, 40, 30]], [650, [150, 30, 18]], [740, [190, 40, 18]],
    [820, [222, 62, 22]], [900, [242, 98, 26]], [980, [255, 138, 38]], [1080, [255, 182, 64]], [1180, [255, 220, 112]],
    [1280, [255, 246, 190]], [1380, [255, 255, 244]]];
const HEAT = new Map();
function heatRGB(T) {
    const k = Math.round(clamp(T, 300, 1380) / 10);
    let c = HEAT.get(k);
    if(c) return c;
    const t = k * 10;
    let i = 0;
    while(i < GLOW.length - 2 && GLOW[i + 1][0] < t) i++;
    const [t0, a] = GLOW[i], [t1, b] = GLOW[i + 1], f = clamp((t - t0) / (t1 - t0), 0, 1);
    c = `rgb(${Math.round(lerp(a[0], b[0], f))},${Math.round(lerp(a[1], b[1], f))},${Math.round(lerp(a[2], b[2], f))})`;
    HEAT.set(k, c);
    return c;
}
const heat01 = T => clamp((T - 700) / 700, 0, 1);

// ---------- live state ----------
let G = null, R = null;   // the run (bar + scene) and its settings (recipe, place, cost)
let canvas = null, ctx = null, buf = null, b = null;
let W = 320, H = 180, DPR = 1, S = 1, LY = null;
let loopId = null, last = 0, paused = false, built = false;
let pumpHeld = false, pressed = null, keyAim = 0, keyTilt = 0, drag = null;
const TXT = new Map();
function setText(id, t) { if(TXT.get(id) !== t) { TXT.set(id, t); const e = el(id); if(e) e.textContent = t; } }
function setHtml(id, t) { if(TXT.get(id) !== t) { TXT.set(id, t); const e = el(id); if(e) e.innerHTML = t; } }
function say(t, secs) { G.msg = t; G.msgT = secs || 2.4; }

// ---------- sound ----------
// Recorded takes (forge/CREDITS.md), picked by ear. A hammer blow mixes two of them by the bar's
// heat — a dull thud on hot metal, the long ring of cold steel — so you hear the bar going cold.
// The open hearth is a looped fire that the heat turns up, the bellows breathe once a stroke and
// the bar boils in the trough. At the grindstone the stone's crank turns under everything, the
// blade's first touch scrapes once and the grinding loops while it's held on, brighter and faster
// the nearer the angle is to right. Only the tongs' clank is synthesized. The files are fetched and
// decoded on the first visit (the worker keeps them offline); until then those sounds are silent.
// Same mute and volume as every other sound.
const SFX = ['hit-hot', 'hit-cold', 'quench', 'fire', 'bellows', 'grind-contact', 'grind-turn', 'grind-touch'], BUF = {};
// the looped files and each one's loop length (s); the bellows' breath (s)
const LOOPS = { fire: 10, 'grind-contact': 3, 'grind-turn': 6 }, BREATH = 1.3;
let sfxAsked = false;
function loadSfx(ac) {
    if(sfxAsked) return;
    sfxAsked = true;
    for(const k of SFX) fetch(`forge/${k}.mp3`).then(r => r.arrayBuffer()).then(a => ac.decodeAudioData(a))
        .then(b => { BUF[k] = b; if(LOOPS[k]) Snd.loops(); }).catch(() => { sfxAsked = false; });
}
const Snd = {
    on() { return !Game.opt('muted') && Game.opt('volume') > 0; },
    start(job) {
        this.stop();
        if(!this.on()) return;
        const ac = Game.ac(); if(!ac) return;
        try {
            const out = this.out = ac.createGain(); out.gain.value = Math.min(1, Game.opt('volume') * 1.6); out.connect(ac.destination);
            const len = ac.sampleRate >> 2, buf = this.noise = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
            for(let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            // one gain per loop; the stone's crank only turns at the grindstone
            this.gains = {}; this.src = {};
            for(const k in LOOPS) { const g = this.gains[k] = ac.createGain(); g.gain.value = k === 'grind-turn' && job === 'grind' ? .6 : 0; g.connect(out); }
            this.breathT = 0; this.touching = false;
            loadSfx(ac); this.loops();
        } catch(e) { this.stop(); }
    },
    // each loop starts once decoded, from its first sound on, past whatever padding the MP3 decoder left in front
    loops() {
        const ac = Game.ac(); if(!ac || !this.gains) return;
        for(const k in LOOPS) {
            const b = BUF[k]; if(!b || this.src[k]) continue;
            const d = b.getChannelData(0); let i = 0;
            while(i < d.length && Math.abs(d[i]) < 1e-4) i++;
            const s = this.src[k] = ac.createBufferSource(), t0 = i / b.sampleRate;
            s.buffer = b; s.loop = true; s.loopStart = t0; s.loopEnd = Math.min(b.duration, t0 + LOOPS[k]);
            s.connect(this.gains[k]); s.start(0, t0);
        }
    },
    stop() {
        for(const k in this.src || {}) { try { this.src[k].stop(); } catch(e) {} }
        this.src = null; this.gains = null; this.breath = null;
        if(this.out) { try { this.out.disconnect(); } catch(e) {} }
        this.out = null;
    },
    /** One recorded take; returns its gain node, or null while the file isn't decoded yet. */
    play(k, vol, rate) {
        const ac = Game.ac(), b = BUF[k]; if(!ac || !b || !this.out || vol < .02) return null;
        try {
            const s = ac.createBufferSource(), g = ac.createGain();
            s.buffer = b; s.playbackRate.value = rate || 1; g.gain.value = vol;
            s.connect(g); g.connect(this.out); s.start();
            return g;
        } catch(e) { return null; }
    },
    strike(T, p) {
        // the same mix as the sound page's bench: all thud from 1150 °C, all ring at 650 °C
        const hot = clamp((T - 650) / 500, 0, 1), j = rnd(.96, 1.04);
        this.play('hit-hot', p * hot, j); this.play('hit-cold', p * (1 - hot), j);
    },
    clank() {
        const ac = Game.ac(); if(!ac || !this.out || !this.noise) return;
        try {
            const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), o = ac.createOscillator(), og = ac.createGain();
            s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 3;
            g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
            s.connect(f); f.connect(g); g.connect(this.out); s.start(t); s.stop(t + .1);
            o.type = 'triangle'; o.frequency.value = 880;
            og.gain.setValueAtTime(.05, t); og.gain.exponentialRampToValueAtTime(.0001, t + .18);
            o.connect(og); og.connect(this.out); o.start(t); o.stop(t + .2);
        } catch(e) {}
    },
    quench() { this.play('quench', .9); },
    tick(dt, F, pump, grind) {
        const ac = Game.ac(); if(!ac || !this.out) return;
        const t = ac.currentTime;
        if(!this.gains) return;
        this.gains.fire.gain.setTargetAtTime(.25 + .55 * heat01(F), t, .3);
        // the blade on the stone: a scrape as it touches, then the grinding — the same curve as the
        // sound page's bench, 0.55–1 of its level and 0.85–1.15 of its speed as the angle comes right
        const m = grind == null ? 0 : Math.max(0, grind), c = this.src['grind-contact'];
        if(grind != null && !this.touching) this.play('grind-touch', .8);
        this.touching = grind != null;
        this.gains['grind-contact'].gain.setTargetAtTime(grind == null ? 0 : .7 * (.55 + .45 * m), t, .04);
        if(c && grind != null) c.playbackRate.setTargetAtTime(.85 + .3 * m, t, .05);
        // a breath every stroke while the bellows are worked; letting go cuts the breath short
        this.breathT -= dt;
        if(pump && this.breathT <= 0) { this.breathT = BREATH; this.breath = this.play('bellows', .7); }
        if(!pump && this.breath) { this.breath.gain.setTargetAtTime(0, t, .05); this.breath = null; this.breathT = 0; }
    }
};

// ---------- the scene ----------
// One pixel buffer that covers the whole screen: its short side is about 180–200 pixels and the
// long side follows the screen's shape, so a phone held upright gets a tall picture, not a strip
// between black bands. The scene is a 180-tall stage centred in it (`sy`); the wall, the floor,
// the chimney and the anvil's stump run on to the edges. Upright, the bar is drawn thicker.
const STAGE = 180;
function layout() {
    // the hearth takes what the bellows (44 px on its left) leave of the width
    const cx = W >> 1, hw = Math.min(170, W - 60), hx = clamp(cx - (hw >> 1) + 18, 50, W - hw - 6);
    const sy = Math.round((H - STAGE) / 2);
    const fstep = Math.max(2, Math.floor((hw - 14) / M.N));
    const segW = Math.max(4, Math.floor((W - Math.min(56, Math.round(W * .12))) / M.N));
    LY = { cx, hw, hx, sy, bedY: sy + 108, floorY: sy + 150, fstep, fbarX: hx + 6, segW, barX: Math.round((W - segW * M.N) / 2) + 4,
           faceY: sy + 124, hScale: 1.4 + 0.8 * clamp(H / W - 1, 0, 1) };
}
const BAKE = new Map();
function bake(key, w, h, draw) {
    const k = key + ':' + w;
    let c = BAKE.get(k);
    if(c) return c;
    c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'));
    BAKE.set(k, c);
    return c;
}
function hashRand(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
function wall(x) {
    const fy = LY.floorY;
    x.fillStyle = '#16110e'; x.fillRect(0, 0, W, H);
    // brick courses laid down from the floor, so the stage's bricks sit the same at any height
    for(let row = 0, y = fy - 9; y > -9; row++, y -= 9) for(let col = -1, xx = (row % 2) * -8; xx < W; col++, xx += 16) {
        const v = 26 + Math.floor(hashRand(row * 97 + col) * 12);
        x.fillStyle = `rgb(${v + 6},${v},${v - 4})`; x.fillRect(xx + 1, y + 1, 14, 7);
    }
    // a soft fall-off into the dark above the hearth's light
    const top = x.createLinearGradient(0, 0, 0, fy);
    top.addColorStop(0, 'rgba(8,6,5,.85)'); top.addColorStop(Math.max(0, (LY.sy - 10) / fy), 'rgba(8,6,5,.45)'); top.addColorStop(1, 'rgba(8,6,5,0)');
    x.fillStyle = top; x.fillRect(0, 0, W, fy);
    x.fillStyle = '#100c0a'; x.fillRect(0, fy, W, H - fy);
    for(let i = 0; i < W; i += 3) for(let y = fy; y < H; y += 28) { x.fillStyle = hashRand(i + y) > .6 ? '#1a1410' : '#0c0908'; x.fillRect(i, y + Math.floor(hashRand(i + y + 5) * 28), 2, 1); }
}
function glowSprite(r, g, bl) {
    return bake('glow' + r + g + bl, 64, 64, x => {
        const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, `rgba(${r},${g},${bl},.9)`); gr.addColorStop(.45, `rgba(${r},${g},${bl},.28)`); gr.addColorStop(1, `rgba(${r},${g},${bl},0)`);
        x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    });
}
function forgeBg() {
    return bake('forge', W, H, x => {
        wall(x);
        const { hx, hw, bedY, sy, floorY } = LY;
        // hood and chimney, soot-dark; the chimney runs up out of the picture
        x.fillStyle = '#211a15';
        for(let y = sy + 18; y < sy + 78; y++) { const k = (y - sy - 18) / 60, half = lerp(22, hw / 2 + 6, k); x.fillRect(Math.round(hx + hw / 2 - half), y, Math.round(half * 2), 1); }
        x.fillStyle = '#2b221b'; x.fillRect(Math.round(hx + hw / 2 - 18), 0, 36, sy + 18);
        x.fillStyle = '#0d0a08'; x.fillRect(Math.round(hx - 6), sy + 78, hw + 12, 3);
        // the hearth's brick body
        for(let row = 0, y = bedY + 4; y < floorY; row++, y += 6) for(let xx = hx + (row % 2) * 5; xx < hx + hw - 2; xx += 10) {
            const v = 70 + Math.floor(hashRand(row * 31 + xx) * 22);
            x.fillStyle = `rgb(${v + 30},${v - 18},${v - 30})`; x.fillRect(xx, y, Math.min(9, hx + hw - 2 - xx), 5);
        }
        x.fillStyle = '#3a2a20'; x.fillRect(hx - 2, bedY + 2, hw + 4, 3);
        // the bellows' frame and the pipe into the hearth
        const bx = hx - 44;
        x.fillStyle = '#4a3220'; x.fillRect(bx, sy + 112, 34, 3); x.fillRect(bx, sy + 138, 34, 3);
        x.fillStyle = '#5a5a5e'; x.fillRect(bx + 34, sy + 124, hx - bx - 30, 4);
        // the anvil, dim at the edge of the light, where the screen is wide enough for it
        if(W - 46 > hx + hw) {
            x.fillStyle = '#121214';
            x.fillRect(W - 46, sy + 128, 40, 6); x.fillRect(W - 36, sy + 134, 20, 10); x.fillRect(W - 42, sy + 144, 32, 6);
        }
    });
}
function anvilBg() {
    return bake('anvil', W, H, x => {
        wall(x);
        const { faceY } = LY, x0 = 10, x1 = W - 10;
        // the anvil: face, horn on the left, waist and feet
        x.fillStyle = '#2e2f33'; x.fillRect(x0 + 24, faceY, x1 - x0 - 24, 10);
        for(let i = 0; i < 26; i++) x.fillRect(x0 + i, faceY + Math.round(i < 20 ? (20 - i) * .18 : 0), 1, Math.max(2, Math.round(i * .38)));
        x.fillStyle = '#4a4b52'; x.fillRect(x0 + 24, faceY, x1 - x0 - 24, 1);
        x.fillStyle = '#232428'; x.fillRect(Math.round(W * .3), faceY + 10, Math.round(W * .4), 22);
        x.fillStyle = '#2a2b30'; x.fillRect(Math.round(W * .22), faceY + 32, Math.round(W * .56), 8);
        // the stump under it
        x.fillStyle = '#3a2618'; x.fillRect(Math.round(W * .26), faceY + 40, Math.round(W * .48), H - faceY - 40);
        x.fillStyle = '#4a3220'; for(let i = Math.round(W * .26); i < W * .74; i += 4) x.fillRect(i, faceY + 40, 1, H - faceY - 40);
        // the forge's light falls in from the left
        x.globalCompositeOperation = 'lighter';
        const gl = glowSprite(255, 120, 40);
        x.globalAlpha = .35; x.drawImage(gl, -90, LY.sy + 20, 200, 200); x.globalAlpha = 1;
        x.globalCompositeOperation = 'source-over';
    });
}
function quenchBg() {
    return bake('quench', W, H, x => {
        wall(x);
        // the trough: a wooden tub of dark water across the middle
        const x0 = Math.round(W * .12), x1 = Math.round(W * .88), sy = LY.sy;
        x.fillStyle = '#3b2617'; x.fillRect(x0, sy + 112, x1 - x0, 46);
        x.fillStyle = '#4c3220'; for(let y = sy + 114; y < sy + 158; y += 7) x.fillRect(x0, y, x1 - x0, 1);
        x.fillStyle = '#1b2a30'; x.fillRect(x0 + 3, sy + 116, x1 - x0 - 6, 8);
    });
}
// the coals: lumps whose glow follows the hearth, each flickering on its own phase
function coals(t, front) {
    const { hx, hw, bedY } = LY, F = G.F;
    for(let i = 0, n = Math.floor(hw / 3); i < n; i++) {
        const r1 = hashRand(i * 13 + (front ? 7 : 0)), r2 = hashRand(i * 29 + 3);
        const x = hx + 2 + Math.floor(r1 * (hw - 6)), y = bedY - (front ? 1 : 5) + Math.floor(r2 * 4);
        const fl = Math.sin(t * (2 + r2 * 5) + i) * 90;
        b.fillStyle = heatRGB(F - 120 - r2 * 160 + fl); b.fillRect(x, y, front ? 2 : 3, 2);
        if(r1 > .82) { b.fillStyle = '#1a1210'; b.fillRect(x + 1, y, 1, 1); }
    }
}
function barPx(s) { return Math.max(1, Math.round((s.t + s.w * (M.BILLET - s.t) * (s.w < 0 ? .6 : 1)) * LY.hScale)); }
const FX = [];
function puff(kind, x, y, n) {
    for(let i = 0; i < n; i++) {
        if(FX.length > 260) FX.shift();
        if(kind === 'spark') FX.push({ kind, x, y, vx: rnd(-70, 70), vy: rnd(-110, -20), life: rnd(.25, .6), max: .6 });
        else if(kind === 'scale') FX.push({ kind, x, y, vx: rnd(-30, 30), vy: rnd(-40, 0), life: rnd(.5, .9), max: .9 });
        else if(kind === 'ember') FX.push({ kind, x, y, vx: rnd(-8, 8), vy: rnd(-40, -18), life: rnd(.6, 1.4), max: 1.4 });
        else if(kind === 'steam') FX.push({ kind, x, y, vx: rnd(-10, 10), vy: rnd(-34, -14), life: rnd(1, 2), max: 2, r: rnd(2, 4) });
    }
}
// Sparks off the grindstone, thrown along the stone's turn: how they fly is the angle's tell. At
// the right angle a long bright shower; too steep, short red spits; too shallow, a few faint ones.
function grit(x, y, m, steep) {
    if(FX.length > 260) FX.shift();
    const good = m > .5, len = good ? 1 : steep ? .45 : .8;
    FX.push({ kind: 'grit', x, y, vx: rnd(50, 150) * len, vy: rnd(-25, 35) * len, life: rnd(.2, .55) * len, max: .55,
              col: good ? (Math.random() < .5 ? '#fff0a8' : '#ffa53a') : steep ? '#ff5a24' : '#b8783c' });
}
function stepFx(dt) {
    for(let i = FX.length - 1; i >= 0; i--) {
        const p = FX[i];
        p.life -= dt; if(p.life <= 0) { FX.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if(p.kind === 'spark' || p.kind === 'scale') p.vy += 260 * dt;
        else if(p.kind === 'grit') p.vy += 180 * dt;
        if(p.kind === 'steam') p.r += 4 * dt;
    }
}
function drawFx() {
    for(const p of FX) {
        const a = p.life / p.max;
        if(p.kind === 'spark') { b.fillStyle = a > .5 ? '#fff2b0' : '#ff9a30'; b.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
        else if(p.kind === 'grit') { b.fillStyle = p.col; b.fillRect(Math.round(p.x), Math.round(p.y), a > .4 ? 2 : 1, 1); }
        else if(p.kind === 'scale') { b.fillStyle = '#2a2420'; b.fillRect(Math.round(p.x), Math.round(p.y), 2, 1); }
        else if(p.kind === 'ember') { b.fillStyle = a > .5 ? '#ffb040' : '#c04018'; b.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
        else { b.globalAlpha = a * .45; b.fillStyle = '#d8dde0'; const r = Math.round(p.r); b.fillRect(Math.round(p.x) - r, Math.round(p.y) - r, r * 2, r * 2); b.globalAlpha = 1; }
    }
}
function drawForge(t) {
    b.drawImage(forgeBg(), 0, 0);
    const { hx, hw, bedY, fstep, fbarX } = LY, h = heat01(G.F);
    b.globalCompositeOperation = 'lighter';
    b.globalAlpha = .18 + .55 * h; b.drawImage(glowSprite(255, 110, 30), hx - hw * .4, bedY - hw * .9, hw * 1.8, hw * 1.4); b.globalAlpha = 1;
    b.globalCompositeOperation = 'source-over';
    coals(t, false);
    // the bar in the coals: tip deep in the fire on the left, tang out to the right in the tongs
    G.segs.forEach((s, i) => { b.fillStyle = heatRGB(s.T); b.fillRect(fbarX + (M.N - 1 - i) * fstep, bedY - 6, fstep, 4); });
    const tx = fbarX + M.N * fstep;
    b.fillStyle = '#26262a';
    for(let x = tx; x < W; x++) { const y = bedY - 5 - Math.round((x - tx) * .32); b.fillRect(x, y, 1, 2); b.fillRect(x, y + 3 + Math.round((x - tx) * .05), 1, 1); }
    coals(t + 1.7, true);
    G.segs.forEach((s, i) => { if(s.T > M.BURN_T && Math.random() < .25) puff('spark', fbarX + (M.N - 1 - i) * fstep + 1, bedY - 6, 1); });
    // the bellows: leather folds that squeeze while you pump
    const bx = hx - 44, open = 10 + Math.round(8 * (.5 + .5 * Math.cos(G.pumpPh))), my = LY.sy + 126;
    b.fillStyle = '#6a4a2c'; b.fillRect(bx + 2, my - open, 30, open * 2);
    b.fillStyle = '#4e3520'; for(let y = my - open + 3; y < my + open; y += 4) b.fillRect(bx + 3, y, 28, 1);
    b.fillStyle = '#5a3c22'; b.fillRect(bx, my - 2 - open, 34, 3); b.fillRect(bx, my + open, 34, 3);
    drawFx();
}
function drawAnvil() {
    b.drawImage(anvilBg(), 0, 0);
    const { segW, barX, faceY } = LY;
    const tx = barX - 1;
    b.fillStyle = '#26262a';
    for(let x = 0; x < tx; x++) { const y = faceY - 4 - Math.round((tx - x) * .25); b.fillRect(x, y, 1, 2); }
    let glowAt = -1;
    G.segs.forEach((s, i) => {
        const x = barX + i * segW, hp = barPx(s), col = heatRGB(s.T);
        b.fillStyle = col; b.fillRect(x, faceY - hp, segW, hp);
        if(s.T > 650 && i % 4 === 2) glowAt = i;
        if(s.burned) { b.fillStyle = '#2a2420'; b.fillRect(x + 1, faceY - hp + 1, 1, 1); }
        if(glowAt === i) {
            b.globalCompositeOperation = 'lighter'; b.globalAlpha = heat01(s.T) * .55;
            b.drawImage(glowSprite(255, 120, 40), x - 22, faceY - hp - 22, 48, 48); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
        }
        // the outline to hammer down to: a dashed line while there's work left, solid gold once the
        // segment is on it (within tolerance), red with a notch above where it was hammered past —
        // an overworked spot is under a pixel thinner, so the line has to say so
        const ty = faceY - Math.max(1, Math.round(s.t * LY.hScale)) - 1;
        if(s.w < -G.tol) { b.fillStyle = '#e8402c'; b.fillRect(x, ty, segW, 1); b.fillRect(x + (segW >> 1), ty - 3, 1, 2); }
        else if(s.w <= G.tol) { b.fillStyle = 'rgba(255,214,110,.9)'; b.fillRect(x, ty, segW, 1); }
        else {
            b.fillStyle = ty >= faceY - hp ? 'rgba(20,8,4,.6)' : 'rgba(255,240,200,.6)';
            for(let k = 0; k < segW; k += 3) b.fillRect(x + k, ty, Math.min(2, segW - k), 1);
        }
    });
    // the hammer over where it will land
    const hm = G.hammer, u = clamp(hm.u, 0, M.N - 1), c = clamp(Math.round(u), 0, M.N - 1);
    const hx = Math.round(barX + u * segW + segW / 2), top = faceY - barPx(G.segs[c]);
    const lift = hm.drop > 0 ? Math.round(hm.drop / .12 * 6) : 4 + Math.round(hm.charge * 26);
    const hy = top - 9 - lift;
    b.fillStyle = '#5b3a1e'; for(let i = 0; i < 46; i++) b.fillRect(hx + 4 + Math.round(i * .55), hy + 3 - i, 2, 1);
    b.fillStyle = '#3c3d42'; b.fillRect(hx - 6, hy, 12, 8);
    b.fillStyle = '#6a6b72'; b.fillRect(hx - 6, hy, 12, 1);
    if(hm.charge > 0) { b.fillStyle = 'rgba(255,230,160,.6)'; b.fillRect(hx - 6, hy + 10, Math.round(12 * hm.charge), 1); }
    drawFx();
}
function drawQuench() {
    b.drawImage(quenchBg(), 0, 0);
    const k = clamp(G.quenchT / .45, 0, 1), sw = Math.max(3, Math.floor((W * .7) / M.N)), x0 = Math.round((W - sw * M.N) / 2);
    const sy = LY.sy, y = Math.round(lerp(sy + 96, sy + 132, k));
    G.segs.forEach((s, i) => { const hp = Math.max(1, Math.round(barPx(s) * .7)); b.fillStyle = heatRGB(s.T); b.fillRect(x0 + i * sw, y - hp, sw, hp); });
    // the water closes over the bar
    b.globalAlpha = .7; b.fillStyle = '#1b2a30'; b.fillRect(Math.round(W * .12) + 3, sy + 124, Math.round(W * .76) - 6, 32); b.globalAlpha = 1;
    b.fillStyle = '#2f4650'; b.fillRect(Math.round(W * .12) + 3, sy + 124, Math.round(W * .76) - 6, 1);
    drawFx();
}
const STONE_R = 30;
function grindBg() {
    return bake('grind', W, H, x => {
        wall(x);
        const { cx, sy } = LY, gy = sy + 136;
        // the trough under the stone and the frame's two legs
        x.fillStyle = '#3b2617'; x.fillRect(cx - 40, gy + 6, 80, 18);
        x.fillStyle = '#4c3220'; for(let y = gy + 8; y < gy + 24; y += 5) x.fillRect(cx - 40, y, 80, 1);
        x.fillStyle = '#1b2a30'; x.fillRect(cx - 37, gy + 8, 74, 4);
        x.fillStyle = '#4a3220'; x.fillRect(cx - 46, gy - 6, 5, LY.floorY - gy + 6); x.fillRect(cx + 41, gy - 6, 5, LY.floorY - gy + 6);
        x.fillStyle = '#5a5a5e'; x.fillRect(cx - 46, gy - 2, 92, 3);
        // the stone (only its flecks turn, drawn each frame)
        disc(x, cx, gy, STONE_R + 1, '#57534c'); disc(x, cx, gy, STONE_R - 1, '#7a756c'); disc(x, cx, gy, STONE_R - 9, '#736e65');
        // the hearth's light from off to the left
        x.globalCompositeOperation = 'lighter';
        x.globalAlpha = .3; x.drawImage(glowSprite(255, 120, 40), -90, sy + 20, 200, 200); x.globalAlpha = 1;
        x.globalCompositeOperation = 'source-over';
    });
}
// the edge's keenness as a colour: dull grey to bright steel; a run temper is blue
function edgeRGB(sg) {
    if(sg.burned) return '#4a6cb0';
    const v = Math.round(lerp(70, 245, clamp(sg.k, 0, 1)));
    return `rgb(${v},${v + 4},${Math.min(255, v + 10)})`;
}
// a filled circle in whole pixels, row by row, so it stays as crisp as the rest of the scene
function disc(c, x, y, r, col) {
    c.fillStyle = col;
    for(let dy = -r; dy <= r; dy++) { const h = Math.round(Math.sqrt(r * r - dy * dy)); c.fillRect(x - h, y + dy, h * 2 + 1, 1); }
}
function drawGrind(t) {
    b.drawImage(grindBg(), 0, 0);
    const { cx, sy, segW } = LY, gy = sy + 136, r = STONE_R, top = gy - r;
    // the stone, turning
    b.fillStyle = '#6a655d';
    for(let k = 0; k < 6; k++) { const a = G.t * (G.grinding ? 7 : 4) + k * Math.PI / 3; b.fillRect(Math.round(cx + Math.cos(a) * (r - 7)) - 1, Math.round(gy + Math.sin(a) * (r - 7)) - 1, 3, 3); }
    b.fillStyle = '#3c3d42'; b.fillRect(cx - 3, gy - 3, 6, 6);
    // the blade laid along the stone, the contact segment over its top; it slides as you move it
    const lift = G.grinding ? 0 : 2;
    G.segs.forEach((sg, i) => {
        const x = Math.round(cx + (i - G.u - .5) * segW), hp = Math.max(2, Math.round(sg.t * LY.hScale));
        if(x + segW < 0 || x > W) return;
        const ey = top - lift;
        if(i < G.e0 && R.recipe.shape === 'blade') { b.fillStyle = '#5b3a1e'; b.fillRect(x, ey - hp, segW, hp); return; }   // the grip
        b.fillStyle = '#8d939b'; b.fillRect(x, ey - hp, segW, hp);
        b.fillStyle = '#b4bac2'; b.fillRect(x, ey - hp, segW, 1);
        if(i >= G.e0) {
            // heat creeping in shows as a straw then bronze tint above the edge — the warning
            if(sg.h > .45 && !sg.burned) { b.fillStyle = sg.h > .75 ? '#a0562c' : '#c8a050'; b.fillRect(x, ey - 4, segW, 2); }
            b.fillStyle = edgeRGB(sg); b.fillRect(x, ey - 2, segW, 2);
        }
    });
    // the angle the blade meets the stone at, drawn small beside it
    const ax = cx + r + 22, ay = sy + 84, ar = G.a * Math.PI / 180;
    b.fillStyle = '#57534c'; b.fillRect(ax - 12, ay, 24, 2);
    b.fillStyle = '#c9ced6';
    for(let i = 0; i < 18; i++) b.fillRect(Math.round(ax - Math.cos(ar) * i), Math.round(ay - 1 - Math.sin(ar) * i), 1, 1);
    if(G.grinding && !blocked()) {
        const m = matchOf(G.a), n = m > .5 ? 3 : m > 0 ? 2 : 1;
        for(let k = 0; k < n; k++) if(Math.random() < .85) grit(cx + 1, top, m, G.a > GM.A0);
    }
    drawFx();
}
function render() {
    if(!G || !ctx) return;
    const t = G.t;
    b.imageSmoothingEnabled = false;
    if(G.phase === 'grind' || G.job === 'grind') drawGrind(t);
    else if(G.phase === 'forge') drawForge(t);
    else if(G.phase === 'quench' || G.phase === 'done') drawQuench();
    else drawAnvil();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, W, H, 0, 0, Math.round(W * S), Math.round(H * S));
}
function resize() {
    if(!canvas) return;
    const r = canvas.getBoundingClientRect(), cw = Math.max(1, r.width), ch = Math.max(1, r.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cw * DPR); canvas.height = Math.round(ch * DPR);
    // pixel size: the short side gets 180 buffer pixels; the buffer is rounded up, so the last
    // column or row may run a fraction off the edge, never short of it
    S = Math.min(canvas.width, canvas.height) / STAGE;
    W = Math.ceil(canvas.width / S); H = Math.ceil(canvas.height / S);
    buf.width = W; buf.height = H;
    BAKE.clear();
    layout();
}
// a pointer on the canvas → a segment position on the anvil
function segAt(clientX) {
    const r = canvas.getBoundingClientRect(), bx = (clientX - r.left) * DPR / S;
    return clamp((bx - LY.barX - LY.segW / 2) / LY.segW, 0, M.N - 1);
}

// ---------- the loop ----------
function frame(t) {
    if(!api.active) { loopId = null; return; }
    loopId = requestAnimationFrame(frame);
    if(Game.skipFrame(t)) return;
    const dt = last ? Math.min(.05, (t - last) / 1000) : 1 / 60;
    last = t;
    Debug.guard('forge loop', () => {
        if(!G) return;
        if(!blocked()) update(dt);
        render();
        updateHud();
    });
}
function pumping() { return pumpHeld || !!Input.keys[' '] && !blocked(); }
function update(dt) {
    G.t += dt;
    if(G.msgT > 0) G.msgT -= dt;
    const pump = G.phase === 'forge' && pumping();
    if(G.phase === 'forge') {
        if(pump) G.pumpPh += dt * Math.PI * 2 / BREATH;   // one stroke a breath
        const burnt = stepForge(G, dt, pump);
        if(burnt.length) say(T('Demir yanıyor! Beyaz ışıltıda fazla kaldı.'), 3);
        if(pump && Math.random() < dt * 14) puff('ember', LY.hx + rnd(10, LY.hw - 10), LY.bedY - 6, 1);
    } else if(G.phase === 'anvil') {
        stepAnvil(G, dt);
        const hm = G.hammer;
        if(keyAim) hm.u = clamp(hm.u + keyAim * dt * 9, 0, M.N - 1);
        if(hm.drop > 0) hm.drop -= dt;
        hm.charge = pressed ? clamp((performance.now() - pressed.t0) / 700, 0, 1) : 0;
        const hot = G.segs.reduce((a, s) => Math.max(a, s.T), 0);
        if(hot < M.EFF_LO && !G.coldSaid) { G.coldSaid = true; say(T('Kızıllık gitti: demir soğudu, ocağa geri koy.'), 3.5); }
    } else if(G.phase === 'grind') {
        G.grinding = grindHeld();
        if(keyAim) G.u = clamp(G.u + keyAim * dt * 6, G.e0, M.N - 1);
        if(keyTilt) G.a = clamp(G.a + keyTilt * dt * 18, 0, 45);
        const burnt = stepGrind(G, dt, G.grinding);
        if(burnt.length) say(T('Tavı kaçtı! Çeliği bir yerde fazla tuttun; orası artık tam bilenmez.'), 3);
    } else if(G.phase === 'quench') {
        G.quenchT += dt;
        const k = 1 - Math.exp(-2.6 * dt);
        G.segs.forEach(s => { s.T += (60 - s.T) * k; });
        if(Math.random() < dt * 40) puff('steam', rnd(W * .2, W * .8), LY.sy + 122, 1);
        if(G.quenchT > 1.9) finish();
    }
    stepFx(dt);
    Snd.tick(dt, G.F, pump, G.phase === 'grind' && G.grinding ? matchOf(G.a) : null);
}
function grindHeld() { return !!(pressed && pressed.grind) || !!Input.keys[' '] && !blocked(); }

// ---------- actions ----------
function toAnvil() {
    if(!G || G.result || G.phase !== 'forge') return;
    G.phase = 'anvil'; G.coldSaid = false; Snd.clank();
}
function toForge() {
    if(!G || G.result || G.phase !== 'anvil') return;
    G.phase = 'forge'; G.heats++; Snd.clank();
}
function swap() { if(G && G.phase === 'forge') toAnvil(); else toForge(); }
function blow(u, power) {
    if(!G || G.result || G.phase !== 'anvil' || paused) return;
    const r = strike(G, u, power), c = clamp(Math.round(u), 0, M.N - 1), s = G.segs[c];
    G.hammer.u = u; G.hammer.drop = .12;
    const x = LY.barX + u * LY.segW + LY.segW / 2, y = LY.faceY - barPx(s);
    puff('spark', x, y, Math.round(2 + 10 * power * eff(r.T)));
    if(r.T > 800) puff('scale', x, y, 2);
    Snd.strike(r.T, power);
    // on a phone the blow is felt too: a short tick, harder for a full swing (ignored where unsupported)
    if(Game.isTouch() && navigator.vibrate) try { navigator.vibrate(power > .7 ? 22 : 10); } catch(e) {}
    if(r.cold) say(T('Soğuk demire vurdun: çatlak riski!'), 2.6);
}
function quench() {
    if(!G || G.result || G.phase !== 'anvil' || !shapeReady(G)) return;
    G.score = score(G);          // judged at the moment it goes in, not after it cools
    G.phase = 'quench'; G.quenchT = 0;
    Snd.quench();
    puff('steam', W / 2, LY.sy + 122, 18);
}
function act() { if(G && G.phase === 'grind') finishGrind(); else quench(); }
function finishGrind() {
    if(!G || G.result || G.phase !== 'grind') return;
    const sc = grindScore(G), it = ITEMS[R.recipe.id], xp = R.practice ? 0 : Math.round(15 * (.4 + sc.Q));
    if(!R.practice) {
        state.player.sharp = sc.pct > 0 ? { id: it.id, pct: sc.pct, left: GM.BATTLES, n: GM.BATTLES } : null;
        Game.addProficiencyXp('smithing', xp);
    }
    G.grinding = false; G.phase = 'done';
    G.result = { grind: true, sc, xp };
    paused = false;
    showResult();
}
function finish() {
    const r = R.recipe, sc = G.score, out = outcome(G, r, sc.S);
    const xp = R.practice ? 0 : Math.round((40 + 40 * tierOf(r)) * (.4 + sc.S));
    if(R.practice) out.iron = 0;
    else {
        if(out.kind === 'ruin') { const back = Math.floor(R.cost.iron / 2); if(back) Game.addItem('iron', back); out.iron = back; }
        else Game.addItem(out.id, 1);
        Game.addProficiencyXp('smithing', xp);
        Game.trainAttr('str', 1);
    }
    G.phase = 'done';
    G.result = { out, sc, xp };
    paused = false;
    showResult();
}

// ---------- materials ----------
// What a forge can reach: your bag, and at your own castle or town its storage too
const own = loc => !!loc && loc.owner === 'player';
function stock(loc, id) {
    const inv = (state.player.inventory.find(i => i.id === id) || {}).qty || 0;
    const st = own(loc) ? ((loc.storage || []).find(i => i.id === id) || {}).qty || 0 : 0;
    return inv + st;
}
function take(loc, id, n) {
    const lists = [state.player.inventory].concat(own(loc) ? [loc.storage || []] : []);
    for(const list of lists) {
        const it = list.find(i => i.id === id);
        if(!it || n <= 0) continue;
        const k = Math.min(n, it.qty);
        it.qty -= k; n -= k;
        if(it.qty <= 0) list.splice(list.indexOf(it), 1);
    }
}
function rentOf(loc, r) { return own(loc) ? 0 : cost(r).rent; }
// why a piece can't be forged right now, or null
function blockOf(loc, r) {
    const c = cost(r), lvl = Game.profLvl('smithing');
    if(lvl < r.req) return T`Demircilik ${r.req} gerekir`;
    if(stock(loc, 'iron') < c.iron) return T`${c.iron} demir gerekir`;
    if(stock(loc, 'coal') < c.coal) return T`${c.coal} kömür gerekir`;
    if(stock(loc, 'crucible') < c.steel) return T`${c.steel} pota çeliği gerekir`;
    if(state.player.money < rentOf(loc, r)) return T('Ocak kirasına paran yetmiyor');
    return null;
}

// the grindstone in a town or your own fief: the weapon in hand, why it can't be sharpened now, or null
const grindRent = loc => own(loc) ? 0 : GM.RENT;
function grindBlock(loc) {
    if(!sharpenable(state.player.equipment.weapon)) return T('Kılıç, balta ya da mızrak kuşan');
    if(state.player.money < grindRent(loc)) return T('Taşın kirasına paran yetmiyor');
    return null;
}
function grind(locId) {
    const loc = LOCATIONS.find(l => l.id === locId), w = loc && state.player.equipment.weapon;
    if(!loc) return;
    const why = grindBlock(loc);
    if(why) return alert(why);
    const rent = grindRent(loc);
    state.player.money -= rent;
    Game.updateTopBar();
    begin({ id: w.id, shape: shapeOf(w) }, { loc, job: 'grind', cost: { hours: GM.HOURS }, rent, own: own(loc) }, Game.profLvl('smithing'));
    let seen = null; try { seen = localStorage.getItem(GRIND_KEY); } catch(e) {}
    if(!seen) howto();
}
const GRIND_KEY = 'webband_grind_help';
// the grindstone's row at the top of the smithy's window
function grindRow(loc) {
    const w = state.player.equipment.weapon, why = grindBlock(loc), rent = grindRent(loc), edge = Game.edge();
    return `<h4 class="fs-fam">${T('Bileme taşı')}</h4><div class="fs-list"><div class="fs-row">
        <span class="fs-ic">${w ? Game.itemIco(w) : '🪨'}</span>
        <span class="fs-tx"><b>${w ? T(w.name) : T('Elinde silah yok')}</b><small>${edge ? T`Şu an keskin: +%${edge} hasar` : T`Bilenmiş ağız: en çok +%${edgeMax()} hasar`}${why ? ` · <em>${why}</em>` : ''}</small></span>
        <span class="fs-cost"><span>⏳ ${T`${GM.HOURS} saat`}</span>${rent ? ` <span class="${state.player.money < rent ? 'fs-short' : ''}">💰 ${rent}</span>` : ''}</span>
        <button class="btn${why ? '' : ' primary'}" ${why ? 'disabled' : ''} onclick="Forge.grind('${loc.id}')">${T('🪨 Bile')}</button>
    </div></div>`;
}

// ---------- melting ----------
// A piece in the bag that a smith could forge goes back into the hearth for scrap: half the iron
// it is worth (the Örs branch's scrapYield adds to that), an hour, and in town the hearth's rent.
// A masterwork's crucible steel doesn't survive the pot. The iron is worth well under what the
// market pays for the piece, so melting is never a way to money — it's iron where there's no market.
const MELT = { SHARE: 0.5, HOURS: 1, RENT: 5 };
// a piece too small to give back a whole bar (a tier-1 mace) isn't worth the hearth: it isn't offered
const meltIron = r => Math.floor(ironOf(r) * MELT.SHARE * (1 + perk('scrapYield')));
const meltable = it => { const r = recipe(it.id); return !!r && !it.unique && meltIron(r) > 0; };
const meltRent = loc => own(loc) ? 0 : MELT.RENT;
function melt(locId, id) {
    const loc = LOCATIONS.find(l => l.id === locId), r = recipe(id), inv = state.player.inventory, i = inv.findIndex(x => x.id === id);
    if(!loc || i < 0 || !meltable(inv[i])) return;
    if(state.player.money < meltRent(loc)) return alert(T('Ocak kirasına paran yetmiyor'));
    state.player.money -= meltRent(loc);
    if(--inv[i].qty <= 0) inv.splice(i, 1);
    const iron = meltIron(r);
    Game.addItem('iron', iron);
    Game.closeModal();
    Game.advanceTime(MELT.HOURS);
    Game.updateTopBar();
    Game.redrawTown(loc);
    // whatever the hour brought (an event, a letter) keeps the screen; otherwise back to the hearth
    if(el('modal-overlay').classList.contains('hidden')) open(loc, T`${T(ITEMS[id].name)} eritildi: <b>+${iron} demir</b>.`);
}
// the melting rows at the foot of the smithy's window: every forgeable piece in the bag
function meltRows(loc) {
    const list = state.player.inventory.filter(meltable), rent = meltRent(loc), poor = state.player.money < rent;
    if(!list.length) return '';
    return `<h4 class="fs-fam">${T('Erit')}</h4><div class="fs-list">${list.map(it => `<div class="fs-row">
        <span class="fs-ic">${Game.itemIco(it)}</span>
        <span class="fs-tx"><b>${T(it.name)}${it.qty > 1 ? ` ×${it.qty}` : ''}</b><small>${T`Hurdadan ${meltIron(recipe(it.id))} demir çıkar`}${recipe(it.id).steel ? ` · ${T('pota çeliği yanar')}` : ''}</small></span>
        <span class="fs-cost"><span>⏳ ${T`${MELT.HOURS} saat`}</span>${rent ? ` <span class="${poor ? 'fs-short' : ''}">💰 ${rent}</span>` : ''}</span>
        <button class="btn" ${poor ? 'disabled' : ''} onclick="Forge.melt('${loc.id}','${it.id}')">${T('♨️ Erit')}</button>
    </div>`).join('')}</div>`;
}

// ---------- the recipe window ----------
function open(loc, note) {
    if(!loc) return;
    const lvl = Game.profLvl('smithing'), mine = own(loc);
    const chip = h => `<span class="lchip">${h}</span>`;
    const rows = FAMILIES.map(([fam, name]) => {
        const list = RECIPES.filter(r => r.fam === fam && ITEMS[r.id]).map(r => {
            const it = ITEMS[r.id], c = cost(r), why = blockOf(loc, r), rent = rentOf(loc, r);
            const stat = it.attack ? T`Saldırı ${it.attack}` : T`Savunma ${it.defense}`;
            const need = (have, n) => have >= n ? '' : ' fs-short';
            return `<div class="fs-row${lvl < r.req ? ' locked' : ''}">
                <span class="fs-ic">${Game.itemIco(it)}</span>
                <span class="fs-tx"><b>${T(it.name)}</b><small>${stat} · ${T`Demircilik ${r.req}`}${why ? ` · <em>${why}</em>` : ''}</small></span>
                <span class="fs-cost"><span class="${need(stock(loc, 'iron'), c.iron)}">⛏️ ${c.iron}</span> <span class="${need(stock(loc, 'coal'), c.coal)}">🪨 ${c.coal}</span>${c.steel ? ` <span class="${need(stock(loc, 'crucible'), c.steel)}">💠 ${c.steel}</span>` : ''}
                    <span>⏳ ${T`${c.hours} saat`}</span>${rent ? ` <span class="${state.player.money < rent ? 'fs-short' : ''}">💰 ${rent}</span>` : ''}</span>
                <button class="btn${why ? '' : ' primary'}" ${why ? 'disabled' : ''} onclick="Forge.start('${loc.id}','${r.id}')">${T('🔥 Döv')}</button>
            </div>`;
        }).join('');
        return `<h4 class="fs-fam">${T(name)}</h4><div class="fs-list">${list}</div>`;
    }).join('');
    Game.showModal(`<div class="forge-shop">
        <div class="lb-head"><div><div class="leyebrow">${mine ? T('Kendi ocağın') : T('Demirhane')}</div><h3>🔨 ${T(loc.name)}</h3></div>
            <button class="btn lb-help" onclick="Forge.help('${loc.id}')" title="${T('Nasıl dövülür?')}" aria-label="${T('Nasıl dövülür?')}">?</button></div>
        <p class="lb-lead">${note || (mine ? T('Kira yok; depodaki demir ve kömürü de kullanırsın.') : T('Ocağı iş başına kiralarsın. Demir ve kömür pazardan alınır.'))}</p>
        <div class="lchips">${chip(T`Demircilik <b>${lvl}</b>`)}${chip(T`⛏️ Demir <b>${stock(loc, 'iron')}</b>`)}${chip(T`🪨 Kömür <b>${stock(loc, 'coal')}</b>`)}${stock(loc, 'crucible') ? chip(T`💠 Pota çeliği <b>${stock(loc, 'crucible')}</b>`) : ''}${chip(`💰 <b>${Math.floor(state.player.money)}</b>`)}</div>
        ${grindRow(loc)}${rows}${meltRows(loc)}
        <div class="lb-foot"><button class="btn" onclick="Game.closeModal()">${T('Kapat')}</button></div>
    </div>`, '760px');
}
// How it's done, as a list — for the window, before going in (and from the pause menu)
const HELP = [
    ['🔥 Isıt', 'Körüğü bas: ocak beyazlaşır, demir ısınır. Rengine bak: koyu kırmızı soğuk, turuncu ve sarı dövülür, beyaz yanar. Turuncu-sarıya gelince örse al.'],
    ['🔨 Döv', 'Çekici demirin üstüne getir; bas, basılı tut, bırak: ne kadar tutarsan o kadar sert vurur. Demir kesik çizgiye kadar dövülür; biten yerde çizgi altın sarısı olur. Çizgiyi geçersen demir sertleşir ama yine incelir, çizgi kırmızıya döner: eşit döv.'],
    ['🌡️ Yeniden ısıt', 'İnce yerler ve uç önce soğur. Kızıllık gidince ocağa geri koy; soğuk demire sert vurmak çatlatır. Her kızdırma başarısızlık değildir ama çok kızdırmak işçiliği düşürür.'],
    ['💧 Su ver', 'Şekil tutunca Su ver açılır. Demir baştan uca kiraz-turuncuyken daldır; bir yeri karardıysa ya da hâlâ sarıysa iş zayıf çıkar.'],
    ['🏅 Sonuç', 'Şekil, su verme ve ocak işçiliği birlikte puanlanır. İyi iş istediğin kademeyi verir; zayıf iş bir alt kademeyi; kötü iş çatlar ve demirin yarısı kurtulur. Demircilik yükseldikçe kademe daha kolay tutar.'],
    ['💠 Usta işi', 'Desenli parçalar Demircilik 9 ve bir pota çeliği ister; pota çeliği yalnız haydut madeninden çıkar. Tutmazsa çelik yine yanar.'],
    ['♨️ Erit', 'Çantandaki dövülebilir bir parçayı ocağa geri atarsın: demirinin yarısı hurda olarak döner. Pazarın verdiğinden azdır; pazarı olmayan yerde işe yarar.']
];
const GRIND_HELP = [
    ['🪨 Taşa bas', 'Bas ve basılı tut: bıçak dönen taşa değer. Sağa sola sürükle: bıçak taşın üstünde kayar, ağzın her yeri bilenir.'],
    ['📐 Açıyı kıvılcımdan oku', 'Yukarı-aşağı sürükle: açı değişir. Kıvılcım bol, uzun ve parlaksa açı doğru. Kısa, kırmızı kıvılcım fazla dik; seyrek, sönük kıvılcım fazla yatık. Çok yanlış açı ağzı köreltir.'],
    ['🔥 Bir yerde durma', 'Taş çeliği ısıtır. Ağzın üstü saman sarısına, sonra bronza döner: orayı bırak. Tavı kaçan yer maviye döner ve bir daha tam bilenmez.'],
    ['⚔️ Sonuç', 'Ağzın tamamı ve en kör yeri puanlanır. Bilenmiş silah sonraki 3 savaşta daha sert vurur, her savaşta biraz körelir. Silahı değiştirirsen bileme o silahta kalır.']
];
function help(locId) {
    const rows = HELP.map(([t, d]) => `<li><b>${T(t)}</b> ${T(d)}</li>`).join('');
    const back = locId ? `<button class="btn primary" onclick="Forge.open(LOCATIONS.find(l => l.id === '${locId}'))">${T('← Ocağa dön')}</button>`
                       : `<button class="btn primary" onclick="Game.closeModal()">${T('Tamam')}</button>`;
    Game.showModal(`<div class="lair-brief"><h3>${T('❔ Demir nasıl dövülür?')}</h3><ul class="lb-howto">${rows}</ul><div class="lb-foot">${back}</div></div>`, '640px');
}

// ---------- the screen ----------
// Built from JS so every word goes through T()
function build() {
    if(built) return;
    built = true;
    const v = el('forge-view');
    const legend = [[620, 'Koyu kırmızı'], [760, 'Kiraz'], [920, 'Turuncu'], [1150, 'Sarı'], [1340, 'Beyaz']]
        .map(([t, n]) => `<span><i style="background:${heatRGB(t)}"></i>${T(n)}</span>`).join('');
    v.innerHTML = `<canvas id="forge-canvas"></canvas>
        <div id="forge-hud">
            <div class="lchips">
                <span class="lchip" id="forge-item"></span>
                <span class="lchip" id="forge-phase"></span>
                <span class="lchip"><span id="forge-heats-l"></span> <b id="forge-heats">1</b></span>
                <span class="lchip"><span id="forge-shape-l"></span> <b id="forge-shape">0</b></span>
            </div>
            <div id="forge-hint"></div>
            <div id="forge-legend">${legend}</div>
        </div>
        <button id="forge-pausebtn" translate="no" aria-label="${T('Duraklat')}" title="${T('Duraklat')}">II</button>
        <div id="forge-msg" hidden></div>
        <div id="forge-keys"></div>
        <div id="forge-btns">
            <button class="fbtn" id="forge-pump">${T('Körük')}</button>
            <button class="fbtn" id="forge-move"></button>
            <button class="fbtn primary" id="forge-quench">${T('Su ver')}</button>
        </div>
        <div id="forge-over" hidden></div>`;
    canvas = el('forge-canvas'); ctx = canvas.getContext('2d');
    buf = document.createElement('canvas'); b = buf.getContext('2d');
    bindInput();
}
function overlay(html) { const o = el('forge-over'); o.innerHTML = html ? `<div class="lpanel">${html}</div>` : ''; o.hidden = !html; }
const PHASE = { forge: 'Ocak', anvil: 'Örs', quench: 'Su verme', done: 'Su verme', grind: 'Bileme taşı' };
function keysHelp() {
    return R.job === 'grind'
        ? `<kbd>${T('Boşluk')}</kbd> ${T('taşa bas')} · <kbd>←</kbd><kbd>→</kbd> ${T('kaydır')} · <kbd>↑</kbd><kbd>↓</kbd> ${T('açı')} · <kbd>Q</kbd> ${T('bitir')} · <kbd>Esc</kbd> ${T('duraklat')}`
        : `<kbd>${T('Boşluk')}</kbd> ${T('körük / vur')} · <kbd>←</kbd><kbd>→</kbd> ${T('çekiç')} · <kbd>E</kbd> ${T('ocak ↔ örs')} · <kbd>Q</kbd> ${T('su ver')} · <kbd>Esc</kbd> ${T('duraklat')}`;
}
function updateHud() {
    setHtml('forge-item', `${Game.itemIco(ITEMS[R.recipe.id])} ${T(ITEMS[R.recipe.id].name)}`);
    setHtml('forge-keys', keysHelp());
    if(R.job === 'grind') return grindHud();
    const ready = G.phase === 'anvil' && shapeReady(G);
    setText('forge-phase', T(PHASE[G.phase]));
    setText('forge-heats-l', T('Kızdırma')); setText('forge-shape-l', T('Şekil'));
    el('forge-legend').style.display = '';
    setText('forge-heats', String(G.heats));
    setText('forge-shape', Game.pct(Math.round(shapeDone(G) * 100)));
    const touch = Game.isTouch();
    setText('forge-hint', G.phase === 'forge' ? T('Körüğü bas: ateş beyazlaşır, demir ısınır. Turuncu-sarıya gelince örse al. Beyazda bırakma, yanar.')
        : G.phase === 'anvil' ? (ready ? T('Şekil tuttu. Baştan uca kiraz-turuncuyken su ver; uç kararmadan.')
            : touch ? T('Parmağını demirin üstüne bas, istediğin yere kaydır, bırak: vurursun. Basılı tuttukça sert vurur. Kesik çizgiye kadar döv: biten yer altın, fazlası kırmızı olur.')
            : T('Demirin üstüne bas, basılı tut, bırak: vurursun. ← → ve Boşluk da olur. Kesik çizgiye kadar döv: biten yer altın, fazlası kırmızı olur.'))
        : T('Su veriliyor…'));
    const m = el('forge-msg');
    if(G.msgT > 0) { m.hidden = false; setText('forge-msg', G.msg); } else m.hidden = true;
    el('forge-pump').hidden = G.phase !== 'forge';
    el('forge-pump').classList.toggle('on', pumpHeld);
    const mv = el('forge-move');
    mv.hidden = G.phase !== 'forge' && G.phase !== 'anvil';
    setText('forge-move', G.phase === 'forge' ? T('Örse al') : T('Ocağa koy'));
    const q = el('forge-quench');
    q.hidden = G.phase !== 'anvil';
    q.disabled = !ready;
    setText('forge-quench', T('Su ver'));
}
function grindHud() {
    const sc = grindScore(G), hot = G.segs.reduce((a, sg) => Math.max(a, sg.burned ? 0 : sg.h), 0);
    setText('forge-phase', T(PHASE.grind));
    setText('forge-heats-l', T('Isı')); setText('forge-heats', Game.pct(Math.round(hot * 100)));
    setText('forge-shape-l', T('Keskinlik')); setText('forge-shape', Game.pct(Math.round(sc.mean * 100)));
    el('forge-legend').style.display = 'none';
    setText('forge-hint', Game.isTouch()
        ? T('Parmağını bas ve sağa sola kaydır: bıçak taşın üstünde gider. Yukarı-aşağı sürükle: açı değişir. Kıvılcım bol ve parlaksa açı doğru. Bir yerde durma, tavı kaçar.')
        : T('Bas ve sürükle: sağa sola bıçağı taşta gezdirir, yukarı-aşağı açıyı değiştirir. Kıvılcım bol ve parlaksa açı doğru; kısa kırmızıysa fazla dik, seyrekse fazla yatık. Bir yerde durma, tavı kaçar.'));
    const m = el('forge-msg');
    if(G.msgT > 0) { m.hidden = false; setText('forge-msg', G.msg); } else m.hidden = true;
    el('forge-pump').hidden = true; el('forge-move').hidden = true;
    const q = el('forge-quench');
    q.hidden = G.phase !== 'grind'; q.disabled = false;
    setText('forge-quench', T('Bitir'));
}

// ---------- input ----------
// a pause, a window, a tutorial coach still up (as in a lair) or the result: the metal waits
const blocked = () => paused || Game.tutor != null || !el('modal-overlay').classList.contains('hidden') || !!(G && G.result);
function bindInput() {
    const KEYS = new Set([' ', 'e', 'q', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', 'escape']);
    window.addEventListener('keydown', e => {
        if(!api.active || !G) return;
        const k = e.key === ' ' ? ' ' : Input.letter(e);
        if(!KEYS.has(k) && !KEYS.has(e.key.toLowerCase())) return;
        e.preventDefault();
        if(e.key === 'Escape') { if(!G.result) paused ? resume() : pauseMenu(); return; }
        if(blocked() || e.repeat) return;
        if(k === 'e') swap();
        else if(k === 'q') act();
        else if(e.key === 'ArrowUp' || k === 'w') keyTilt = 1;
        else if(e.key === 'ArrowDown' || k === 's') keyTilt = -1;
        else if(e.key === 'ArrowLeft' || k === 'a') keyAim = -1;
        else if(e.key === 'ArrowRight' || k === 'd') keyAim = 1;
        else if(k === ' ' && G.phase === 'anvil') pressed = { t0: performance.now(), key: true };
    }, true);
    window.addEventListener('keyup', e => {
        if(!api.active || !G) return;
        const k = e.key === ' ' ? ' ' : Input.letter(e);
        if(e.key === 'ArrowLeft' || k === 'a' || e.key === 'ArrowRight' || k === 'd') keyAim = 0;
        if(e.key === 'ArrowUp' || k === 'w' || e.key === 'ArrowDown' || k === 's') keyTilt = 0;
        if(k === ' ') {
            e.preventDefault();
            if(pressed && pressed.key) { const p = power(); pressed = null; blow(G.hammer.u, p); }
        }
    }, true);
    canvas.addEventListener('pointerdown', e => {
        if(!G || blocked()) return;
        e.preventDefault();
        try { canvas.setPointerCapture(e.pointerId); } catch(err) {}
        if(G.phase === 'forge') { pumpHeld = true; pressed = { t0: performance.now(), pump: true }; return; }
        if(G.phase === 'grind') { pressed = { t0: performance.now(), grind: true }; drag = { x: e.clientX, y: e.clientY }; return; }
        if(G.phase !== 'anvil') return;
        G.hammer.u = segAt(e.clientX);
        pressed = { t0: performance.now() };
    });
    canvas.addEventListener('pointermove', e => {
        if(G && G.phase === 'anvil' && (pressed || e.pointerType === 'mouse')) G.hammer.u = segAt(e.clientX);
        // on the stone the blade follows the hand: sideways slides it along, up and down tilts it
        if(G && G.phase === 'grind' && pressed && pressed.grind && drag && !blocked()) {
            const k = DPR / S;
            G.u = clamp(G.u - (e.clientX - drag.x) * k / LY.segW, G.e0, M.N - 1);
            G.a = clamp(G.a - (e.clientY - drag.y) * k * .5, 0, 45);
            drag = { x: e.clientX, y: e.clientY };
        }
    });
    const up = () => {
        if(!pressed) return;
        const p = pressed;
        pressed = null;
        if(p.pump) { pumpHeld = false; return; }
        if(p.grind) { drag = null; return; }
        if(!p.key && G && G.phase === 'anvil') blow(G.hammer.u, power(p));
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', () => { pressed = null; pumpHeld = false; drag = null; });
    // the bellows button is held, like the bellows; the others are pressed and let go of focus,
    // so Space never "clicks" a button that kept it
    const pump = el('forge-pump');
    pump.addEventListener('pointerdown', e => { e.preventDefault(); pumpHeld = true; try { pump.setPointerCapture(e.pointerId); } catch(err) {} });
    for(const ev of ['pointerup', 'pointercancel', 'pointerleave']) pump.addEventListener(ev, () => { pumpHeld = false; });
    /** @type {[string, () => void][]} */
    const BTNS = [['forge-move', swap], ['forge-quench', act], ['forge-pausebtn', pauseMenu]];
    for(const [id, fn] of BTNS) {
        const btn = el(id);
        btn.addEventListener('click', () => { btn.blur(); fn(); });
    }
    window.addEventListener('resize', () => { if(api.active) resize(); });
}
function power(p) { const q = p || pressed; return q ? .35 + .65 * clamp((performance.now() - q.t0) / 700, 0, 1) : .5; }

function pauseMenu() {
    if(!G || G.result) return;
    paused = true; pumpHeld = false; pressed = null;
    overlay(`<div class="leyebrow">${T('Duraklatıldı')}</div><h2>${T(ITEMS[R.recipe.id].name)}</h2>
        <div class="lrow">
            <button class="btn primary" onclick="Forge.resume()">${T('Devam et')}</button>
            <button class="btn" onclick="Forge.howto()">${T('❔ Nasıl dövülür?')}</button>
            <button class="btn" onclick="Forge.abandon()">${T('🚪 Vazgeç')}</button>
        </div>
        <p class="lnote">${R.practice ? T('Deneme: malzeme harcanmaz, eşya, XP ve zaman yok.') : R.job === 'grind' ? T('Vazgeçersen silah olduğu gibi kalır; kira ödenmiştir.') : T('Vazgeçersen demir sana kalır; kömür yanmış, kira ödenmiştir.')}</p>`);
}
function howto() {
    paused = true;
    const grind = R && R.job === 'grind', list = grind ? GRIND_HELP : HELP;
    overlay(`<h2>${grind ? T('❔ Nasıl bilenir?') : T('❔ Demir nasıl dövülür?')}</h2><ul class="lb-howto">${list.map(([t, d]) => `<li><b>${T(t)}</b> ${T(d)}</li>`).join('')}</ul>
        <div class="lrow"><button class="btn primary" onclick="Forge.resume()">${T('Başla')}</button></div>`);
}
function resume() {
    paused = false; overlay(''); last = 0;
    try { localStorage.setItem(R && R.job === 'grind' ? GRIND_KEY : HELP_KEY, '1'); } catch(e) {}
}
const HELP_KEY = 'webband_forge_help';
function grade(sc, out) {
    if(out.kind === 'ruin') return T('Hurda');
    if(out.kind === 'prev') return T('Bir alt kademe');
    return sc.S >= .85 ? T('Ustalık işi') : sc.S >= .72 ? T('İyi iş') : T('Kabul edilir');
}
function grindGrade(Q) { return Q >= .85 ? T('Jilet gibi') : Q >= .6 ? T('Keskin') : Q >= .3 ? T('İdare eder') : T('Kör kaldı'); }
function againBtns() {
    return `<button class="btn primary" onclick="Forge.practice('${R.recipe.id}'${R.job === 'grind' ? ", 'grind'" : ''})">${T('🔁 Tekrar dene')}</button>
            <button class="btn" onclick="Forge.practice()">${T('🔨 Başka parça')}</button><button class="btn" onclick="Forge.leave()">${T('Ana menü')}</button>`;
}
function showGrindResult() {
    const { sc, xp } = G.result, it = ITEMS[R.recipe.id], pc = v => Game.pct(Math.round(v * 100));
    const lead = R.practice ? T`Keskinlik: +%${sc.pct} hasar.`
        : sc.pct > 0 ? T`${T(it.name)} bilendi: ${GM.BATTLES} savaş boyunca +%${sc.pct} hasar, her savaşta biraz körelir.` : T('Ağız tutmadı; silah olduğu gibi kaldı.');
    const rows = [[T('Keskinlik'), pc(sc.mean)], [T('En kör yer'), pc(sc.lo)], [T('Tavı kaçan yer'), G.burns], [T('Puan'), pc(sc.Q)]]
        .concat(R.practice ? [] : [[T('Demircilik'), T`+${xp} XP`], [T('Geçen süre'), T`${R.cost.hours} saat`]]);
    overlay(`<div class="leyebrow">${T(it.name)} · ${where()}</div>
        <h2>${Game.itemIco(it, true)} ${grindGrade(sc.Q)}</h2><p class="llead">${lead}</p>
        <table class="lres">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>
        <div class="lrow">${R.practice ? againBtns() : `<button class="btn primary" onclick="Forge.leave()">${T('🏘️ Şehre dön')}</button>`}</div>`);
}
function showResult() {
    if(G.result.grind) return showGrindResult();
    const { out, sc, xp } = G.result, it = ITEMS[R.recipe.id];
    const lead = R.practice ? (out.kind === 'item' ? T`${T(it.name)} tuttu.` : out.kind === 'prev' ? T`Kademe tutmadı: ${T(ITEMS[out.id].name)} olurdu.` : T('Demir çatladı.'))
        : out.kind === 'item' ? T`${T(it.name)} hazır, çantanda.`
        : out.kind === 'prev' ? T`Kademe tutmadı: ${T(ITEMS[out.id].name)} oldu, çantanda.`
        : out.iron ? T`Demir çatladı. Hurdadan ${out.iron} demir kurtardın.` : T('Demir çatladı; kurtarılacak bir şey kalmadı.');
    const pc = v => Game.pct(Math.round(v * 100));
    const rows = [[T('Şekil'), pc(sc.shape)], [T('Su verme'), pc(sc.quench)], [T('Ocak işçiliği'), pc(sc.care)], [T('Puan'), pc(sc.S)],
                  [T('Kızdırma'), G.heats], [T('Soğuk vuruş'), G.cold]]
        .concat(R.practice ? [] : [[T('Demircilik'), T`+${xp} XP`], [T('Geçen süre'), T`${R.cost.hours} saat`]]);
    const btns = R.practice ? againBtns() : `<button class="btn primary" onclick="Forge.leave()">${T('🏘️ Şehre dön')}</button>`;
    overlay(`<div class="leyebrow">${T(it.name)} · ${where()}</div>
        <h2>${(out.kind === 'ruin' ? '' : Game.itemIco(ITEMS[out.id], true) + ' ') + grade(sc, out)}</h2><p class="llead">${lead}</p>
        <table class="lres">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>
        <div class="lrow">${btns}</div>`);
}

// ---------- going in and coming out ----------
function start(locId, id) {
    const loc = LOCATIONS.find(l => l.id === locId), r = recipe(id);
    if(!loc || !r || !ITEMS[id]) return;
    const why = blockOf(loc, r);
    if(why) return alert(why);
    const c = cost(r), rent = rentOf(loc, r);
    take(loc, 'iron', c.iron); take(loc, 'coal', c.coal); take(loc, 'crucible', c.steel);
    state.player.money -= rent;
    Game.updateTopBar();
    begin(r, { loc, cost: c, rent, own: own(loc) }, Game.profLvl('smithing'));
    let seen = null; try { seen = localStorage.getItem(HELP_KEY); } catch(e) {}
    if(!seen) howto();
}
const where = () => R.practice ? T('Deneme ocağı') : R.job === 'grind' ? T('Bileme taşı') : R.own ? T('Kendi ocağın') : T('Demirhane');
function begin(r, run, lvl) {
    Game.closeModal();
    build();
    R = Object.assign({ recipe: r, job: 'forge' }, run);
    const scene = { t: 0, pumpPh: 0, msg: '', msgT: 0, quenchT: 0, job: R.job, result: null, score: null, coldSaid: false, hammer: { u: M.N / 2, charge: 0, drop: 0 } };
    G = R.job === 'grind' ? Object.assign(newEdge(r.shape, lvl), scene, { phase: 'grind', F: M.F_IDLE, heats: 1, grinding: false })
        : Object.assign(newBar(r, lvl), scene, { phase: 'forge' });
    if(R.practice) Object.assign(G, { sigma: M.SIGMA, passEase: 0, max: GM.MAX });   // practice is Demircilik 1, perks and all
    FX.length = 0; TXT.clear(); pumpHeld = false; pressed = null; keyAim = 0; keyTilt = 0; drag = null;
    api.active = true; paused = false;
    if(R.practice) practiceScreen(true); else Game.showScreen('forge');
    overlay('');
    resize();
    Game.curtain(T(ITEMS[r.id].name), where());
    Snd.start(R.job);
    Game.Music.sync();
    last = 0;
    if(!loopId) loopId = requestAnimationFrame(frame);
}

// ---------- practice ----------
// From the start screen, with no game under way: the whole scene at Demircilik 1 with every piece
// open, and nothing taken, given or passing — no iron, coal, rent, item, XP or hours. The forge
// view lives in the game's UI, so it's shown over the start screen by hand: showScreen would set
// up the campaign's panels for a world that isn't there.
function practiceScreen(on) {
    el('start-screen').classList.toggle('active', !on);
    el('main-ui').classList.toggle('active', on);
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', on && v.id === 'forge-view'));
    document.body.classList.toggle('in-battle', on);
}
function practice(id, job) {
    const it = id && ITEMS[id], r = it && (job === 'grind' ? sharpenable(it) && { id, shape: shapeOf(it) } : recipe(id));
    if(r) {
        const again = api.active;   // "try again" from the result: the scene stays up, the how-to was read
        begin(r, job === 'grind' ? { practice: true, job, cost: { hours: GM.HOURS }, rent: 0, own: false, loc: null }
            : { practice: true, cost: cost(r), rent: 0, own: false, loc: null }, 1);
        if(!again) howto();
        return;
    }
    if(api.active) leave();
    // the grindstone first: it's the quick one
    const rows = `<h4 class="fs-fam">${T('Bileme taşı')}</h4><div class="fs-list">${['sword', 'axe', 'lance'].map(id => { const it = ITEMS[id];
            return `<div class="fs-row"><span class="fs-ic">${Game.itemIco(it)}</span>
                <span class="fs-tx"><b>${T(it.name)}</b><small>${T`Bilenmiş ağız: en çok +%${GM.MAX} hasar`}</small></span>
                <button class="btn primary" onclick="Forge.practice('${id}', 'grind')">${T('🪨 Bile')}</button></div>`; }).join('')}</div>`
        + FAMILIES.map(([fam, name]) => `<h4 class="fs-fam">${T(name)}</h4><div class="fs-list">${
        RECIPES.filter(x => x.fam === fam && ITEMS[x.id]).map(x => { const it = ITEMS[x.id];
            return `<div class="fs-row"><span class="fs-ic">${Game.itemIco(it)}</span>
                <span class="fs-tx"><b>${T(it.name)}</b><small>${it.attack ? T`Saldırı ${it.attack}` : T`Savunma ${it.defense}`}</small></span>
                <button class="btn primary" onclick="Forge.practice('${x.id}')">${T('🔥 Döv')}</button></div>`; }).join('')}</div>`).join('');
    Game.showModal(`<div class="forge-shop">
        <div class="lb-head"><div><div class="leyebrow">${T('Deneme ocağı')}</div><h3>🔨 ${T('Demircilik Dene')}</h3></div>
            <button class="btn lb-help" onclick="Forge.help()" title="${T('Nasıl dövülür?')}" aria-label="${T('Nasıl dövülür?')}">?</button></div>
        <p class="lb-lead">${T('Oyuna başlamadan ocağı dene: her parça açık, malzeme harcanmaz; eşya, XP ve zaman yok.')}</p>
        ${rows}
        <div class="lb-foot"><button class="btn" onclick="Game.closeModal()">${T('Kapat')}</button></div>
    </div>`, '760px');
}
// Giving up: the bar is drawn back into iron (the crucible steel too); the coal burnt and the rent paid stay spent
function abandon() {
    if(!G || G.result) return;
    if(!R.practice && R.cost.iron) Game.addItem('iron', R.cost.iron);
    if(!R.practice && R.cost.steel) Game.addItem('crucible', R.cost.steel);   // the bar never went in the fire
    G.result = { abandoned: true };
    leave();
}
function leave() {
    if(!R) return;
    const loc = R.loc, hours = G && G.result && !G.result.abandoned ? R.cost.hours : Math.ceil(R.cost.hours / 2);
    overlay('');
    api.active = false;
    Snd.stop();
    if(loopId) { cancelAnimationFrame(loopId); loopId = null; }
    const wasPractice = R.practice;
    G = null; R = null; pumpHeld = false; pressed = null;
    if(wasPractice) { practiceScreen(false); Game.Music.sync(); return; }
    Game.drawTown(loc);
    Game.Music.sync();
    // the hours at the anvil pass once you're back in the town — whatever they bring arrives there
    Game.advanceTime(hours);
    Game.updateTopBar();
    Game.redrawTown(loc);
}

const api = {
    active: false,
    MODEL: M, GRIND: GM, RECIPES, FAMILIES, HELP,
    MELT, open, help, start, grind, melt, practice, resume, howto, abandon, leave, pauseMenu,
    // the pure model, for tools/test.js
    _model: { newBar, stepForge, stepAnvil, strike, score, outcome, passMark, eff, shapeReady, shapeDone, cost, prevOf, heatRGB, stock, blockOf,
        newEdge, stepGrind, grindScore, matchOf, sharpenable, shapeOf, ironOf, meltIron },
    // for the tests and the debug report: the live run, read-only by convention
    run() { return G; }, runConfig() { return R; },
    // world setup for the e2e tests: where segment i sits on screen, in client pixels
    _segPoint(i) {
        const r = canvas.getBoundingClientRect(), s = G.segs[i];
        const bx = LY.barX + i * LY.segW + LY.segW / 2, by = LY.faceY - barPx(s) / 2;
        return { x: r.left + bx * S / DPR, y: r.top + by * S / DPR };
    },
    // the measured numbers in docs/SYSTEMS.md: ms per update and per render, averaged over n frames
    _bench(n = 120) { let u = 0, r = 0; for(let i = 0; i < n; i++) { let t = performance.now(); update(1 / 60); u += performance.now() - t; t = performance.now(); render(); r += performance.now() - t; } return { update: +(u / n).toFixed(3), render: +(r / n).toFixed(3) }; },
    // the strings the tables show, for the i18n gate (tools/test.js)
    strings() { return [...FAMILIES.map(f => f[1]), ...HELP.flat(), ...GRIND_HELP.flat(), ...Object.values(PHASE), 'Koyu kırmızı', 'Kiraz', 'Turuncu', 'Sarı', 'Beyaz']; }
};
return api;
})();
