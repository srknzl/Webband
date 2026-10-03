'use strict';
// ============================================================================================
// Crafts (2.10.0) — two trades that earn money beside the forge, on the forge's kind of scene: a
// small pixel buffer scaled up whole, its own loop (the map loop steps aside while
// `Crafts.active`, Game.inScene), every shown word through T(), the tables raw Turkish.
//  - 🪚 Marangoz Atölyesi (a town's or a village's, rented by the job; your own fief's is free and
//    reaches into its storage): timber in, furniture out. Saw the board along the pencil line —
//    the grain pulls the saw, so you read it and lean against it, and a saw scrubbed too fast
//    binds — then plane the sawn edge down to the gauge line: the plane's sole rides the high
//    spots and its iron takes them off, and planing against the grain tears the fibres. How true
//    the cut and how flat the edge decide whether the piece comes out, comes out one step
//    smaller, or is firewood.
//  - 🍲 Han Mutfağı (a city's inn, one shift a day in each town): a cook's apprentice at the grill
//    and the pot. Turn the skewers before the side over the coals burns and take them off golden;
//    keep the soup at a simmer — the bubbles say how hot it is —, stir it before it catches and
//    feed the fire. An order waits only so long. The pay is the inn's wage, what the dishes earn
//    and the tips.
// The models (Crafts.WOOD, Crafts.KITCHEN and the pure functions in Crafts._model) are pinned by
// tools/test.js. Nothing here runs at load time.
// ============================================================================================
const Crafts = (() => {
const el = id => /** @type {any} */ (document.getElementById(id));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
function hashRand(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }

// ---------- the carpenter's model ----------
const WM = {
    N: 24,              // segments along the board
    STEP: 0.42,         // segments one good stroke cuts
    BIND: 0.16,         // a stroke quicker than this (s) binds: little cut and a jerk
    SLOW: 0.9,          // ...slower than this, the saw starts again cold (0.6× the cut)
    AIM: 0.8,           // mm the cut moves sideways per segment with the saw leant all the way
    DRIFT: 0.55, DRIFT_T: 0.1,    // the grain's pull (mm per segment) and what a finer piece adds a tier
    KICK: 0.5,          // mm a binding saw jumps
    MAXDEV: 6,          // mm off the line the board's edge allows
    STOCK: 0.7, ROUGH: 0.6, SAW_STOCK: 0.6,   // the sawn edge above the gauge (mm): base, roughness, and per mm the cut wandered
    SOLE: 5,            // segments the plane's sole spans
    TEAR: 0.3, TEAR_P: 0.4,       // against the grain: how deep a tear goes (mm) and how often a cut tears
    PASS: 0.6, PREV: 0.4          // the score for a tier-1 piece (+0.04 a tier) / for the step below
};
// Raw Turkish item names come from ITEMS and are translated where shown. `req` is the Marangozluk a
// piece needs (1/3/5/7, every skill starts at 1), `timber` how many beams it takes. A piece that
// misses its mark comes out as the one before it in this list.
const WOODWORK = [
    { id: 'stool', req: 1, timber: 1 }, { id: 'chest_wood', req: 3, timber: 3 },
    { id: 'wheel', req: 5, timber: 4 }, { id: 'table', req: 7, timber: 6 }
];
const work = id => WOODWORK.find(r => r.id === id) || null;
const tierOf = r => (r.req - 1) >> 1;
function cost(r) { const t = tierOf(r); return { timber: r.timber, hours: 2 + t, rent: 5 + 5 * t }; }
function prevOf(r) { const i = WOODWORK.indexOf(r); return i > 0 ? WOODWORK[i - 1] : null; }

// A board: the grain's pull at each segment (two slow waves from the seed: it wanders, it doesn't
// jitter), the way the edge's grain runs in each stretch, and the cut and the edge as they go.
function newBoard(r, lvl, seed) {
    const tier = tierOf(r), ease = clamp((lvl - r.req) / 6, 0, 1), amp = WM.DRIFT + WM.DRIFT_T * tier;
    const p1 = hashRand(seed) * 6.283, p2 = hashRand(seed + 1) * 6.283, drift = [], dir = [];
    for(let i = 0; i < WM.N; i++) drift.push(amp * (0.6 * Math.sin(i * 0.26 + p1) + 0.4 * Math.sin(i * 0.55 + p2)));
    // the edge's grain runs one way for a stretch, then turns: two stretches on a stool, five on a table
    const runs = 2 + tier, turns = [];
    for(let k = 1; k < runs; k++) turns.push(Math.round(WM.N * (k - 0.3 + 0.6 * hashRand(seed + 3 + k)) / runs));
    let d = hashRand(seed + 2) < 0.5 ? 1 : -1;
    for(let i = 0; i < WM.N; i++) { if(turns.includes(i)) d = -d; dir.push(d); }
    const tol = 0.14 + 0.06 * ease - 0.015 * tier;
    return { seed, tier, ease, drift, dir, x: 0, y: 0, aim: 0, path: [[0, 0]], dev: new Array(WM.N).fill(null),
             strokes: 0, binds: 0, last: -9, h: null, h0: 0, tears: 0, cuts: 0, tol, depth: 1.8 * tol };
}
// One stroke of the saw at time `now` (s). `y` is the cut's distance from the pencil line in mm:
// positive is the waste side (more to plane later), negative eats into the piece.
function stroke(g, now) {
    const gap = now - g.last, bind = gap < WM.BIND;
    g.last = now; g.strokes++;
    let dx = WM.STEP * (bind ? 0.25 : gap > WM.SLOW ? 0.6 : 1) * (1 + 0.3 * g.ease);
    if(bind) { g.binds++; g.y = clamp(g.y + (hashRand(g.seed * 7 + g.strokes) - 0.5) * 2 * WM.KICK, -WM.MAXDEV, WM.MAXDEV); }
    // the cut runs on in small steps, the grain and the saw's lean steering it as it goes
    while(dx > 1e-6 && g.x < WM.N) {
        const st = Math.min(dx, 0.1, WM.N - g.x), i = Math.min(WM.N - 1, Math.floor(g.x)), i0 = Math.floor(g.x);
        g.y = clamp(g.y + (g.aim * WM.AIM + g.drift[i]) * st, -WM.MAXDEV, WM.MAXDEV);
        g.x += st; dx -= st;
        g.path.push([g.x, g.y]);
        if(Math.floor(g.x) > i0 || g.x >= WM.N) g.dev[i0] = g.y;
    }
    return { bind, done: g.x >= WM.N };
}
// The sawn edge, ready for the plane: how far above the gauge line each segment stands (mm)
function toPlane(g) {
    g.h = g.dev.map((d, i) => WM.STOCK + WM.ROUGH * hashRand(g.seed + 40 + i) + (d || 0) * WM.SAW_STOCK);
    g.h0 = g.h.reduce((a, h) => a + Math.max(0, h - g.tol), 0) || 1;
}
// The plane pushed from u0 to u1 (segment positions) with its iron down. Every segment its middle
// passes is cut down to `depth` under the highest point the sole stands on — so a hump goes and a
// hollow is ridden over. Against the grain a cut can tear out below that.
function planeMove(g, u0, u1) {
    const out = { cut: 0, tears: [] }, dir = Math.sign(u1 - u0), half = WM.SOLE >> 1;
    if(!dir || !g.h) return out;
    const list = [];
    for(let i = Math.floor(Math.min(u0, u1)) + 1; i <= Math.floor(Math.max(u0, u1)); i++) if(i >= 0 && i < WM.N) list.push(i);
    if(dir < 0) list.reverse();
    for(const i of list) {
        let top = -Infinity;
        for(let k = Math.max(0, i - half); k <= Math.min(WM.N - 1, i + half); k++) top = Math.max(top, g.h[k]);
        const floor = top - g.depth;
        if(g.h[i] <= floor) continue;
        out.cut += g.h[i] - floor; g.h[i] = floor; g.cuts++;
        if(dir !== g.dir[i] && hashRand(g.seed * 3 + g.cuts * 1.37) < WM.TEAR_P) { g.h[i] -= WM.TEAR; g.tears++; out.tears.push(i); }
    }
    return out;
}
const planeReady = g => !!g.h && g.h.every(h => h <= g.tol);
const planeDone = g => g.h ? clamp(1 - g.h.reduce((a, h) => a + Math.max(0, h - g.tol), 0) / g.h0, 0, 1) : 0;
function boardScore(g) {
    const n = WM.N;
    const saw = clamp(1 - g.dev.reduce((a, d) => a + Math.abs(d || 0), 0) / n / 2.5, 0, 1);
    // the edge against its own tolerance: a finer piece is held to a finer line
    const plane = clamp(1 - (g.h || []).reduce((a, h) => a + (h > 0 ? h : 1.8 * -h), 0) / n / (4 * g.tol), 0, 1);
    const care = clamp(1 - 0.04 * g.binds - 0.06 * g.tears, 0, 1);
    return { saw, plane, care, S: 0.4 * saw + 0.45 * plane + 0.15 * care };
}
const passMark = g => WM.PASS + 0.04 * g.tier - 0.05 * g.ease;
function outcome(g, r, S) {
    if(S >= passMark(g)) return { kind: 'item', id: r.id };
    const p = prevOf(r);
    if(S >= WM.PREV && p) return { kind: 'prev', id: p.id };
    return { kind: 'ruin', id: null };
}

// ---------- the kitchen's model ----------
const KM = {
    SHIFT: 90, HOURS: 4, LAST: 8,   // a shift's seconds and game hours; no order in its last LAST s
    SEAR: 0.085,        // how done the side over the coals gets a second
    RAW: 0.5, GOLD_LO: 0.85, GOLD_HI: 1.2, BURNT: 1.6,   // a side's doneness: raw below, golden between, black above
    HOLD: 0.45,         // seconds a skewer is held to take it off
    FUEL_USE: 0.035, WOOD: 0.35,   // the fire burns down (1/s); a log adds
    HEAT_K: 0.45,       // how fast the pot follows the fire (1/s)
    SIMMER: 0.42, BOIL: 0.72, OVER: 0.9, SPILL: 2.5,   // the pot's heat: still / simmer / rolling boil / boiling over, and the seconds over that lose a bowl
    COOK: 0.045,        // a batch's progress a second at a simmer (×1.3 boiling)
    SCORCH: 0.04, STIR_T: 6,   // how fast an unstirred pot catches (×2.5 boiling) and how long a stir lasts
    PORTIONS: 4,
    GAP: [7, 10], PATIENCE: 40, MAXORD: 4,
    WAGE: 20, PAY: { kebap: 9, corba: 8 }, TIP: 3, TIP_Q: 0.8
};
// A side's quality by its doneness: 0 raw, rising to 1 across golden, back to 0 at black
function sideQ(d) {
    if(d < KM.RAW) return 0;
    if(d < KM.GOLD_LO) return (d - KM.RAW) / (KM.GOLD_LO - KM.RAW);
    if(d <= KM.GOLD_HI) return 1;
    return clamp(1 - (d - KM.GOLD_HI) / (KM.BURNT - KM.GOLD_HI), 0, 1);
}
function newShift(lvl, prosperity, seed) {
    return { seed, t: 0, ended: false, skew: [null, null, null],
             pot: { fuel: 0.55, h: 0.3, done: 0, scorch: 0, stirT: 0, over: 0, portions: 0 },
             orders: [], seq: 0, nextAt: 2, served: { kebap: 0, corba: 0 }, earned: 0, tips: 0, missed: 0, wasted: 0,
             patience: KM.PATIENCE * (1 + 0.04 * (lvl - 1)),
             payMul: (0.7 + 0.006 * (prosperity == null ? 50 : prosperity)) * (1 + 0.05 * (lvl - 1)) };
}
// the pot is empty: the next batch goes in
function refill(p) { p.done = 0; p.scorch = 0; p.portions = 0; }
// one step of the shift; returns what happened in it
function stepKitchen(g, dt) {
    const ev = [], p = g.pot;
    g.t += dt;
    for(const s of g.skew) if(s) s[s.down] += KM.SEAR * dt;
    p.fuel = Math.max(0, p.fuel - KM.FUEL_USE * dt);
    p.h += (p.fuel - p.h) * (1 - Math.exp(-KM.HEAT_K * dt));
    p.stirT += dt;
    if(!p.portions && p.h >= KM.SIMMER) {
        p.done = Math.min(1, p.done + KM.COOK * dt * (p.h >= KM.BOIL ? 1.3 : 1));
        if(p.done >= 1) { p.portions = KM.PORTIONS; ev.push('ready'); }
    }
    if(p.h >= KM.SIMMER) p.scorch += KM.SCORCH * dt * (p.h >= KM.BOIL ? 2.5 : 1) * (p.stirT > KM.STIR_T ? 1 : 0.15);
    if(p.scorch >= 1) { refill(p); g.wasted++; ev.push('burnt'); }
    if(p.h >= KM.OVER) {
        p.over += dt;
        if(p.over >= KM.SPILL) {
            p.over = 0; ev.push('spill');
            if(p.portions) { if(!--p.portions) refill(p); }
            else p.done = Math.max(0, p.done - 0.15);
        }
    } else p.over = 0;
    for(let i = g.orders.length - 1; i >= 0; i--) {
        const o = g.orders[i];
        o.left -= dt;
        if(o.left <= 0) { g.orders.splice(i, 1); g.missed++; ev.push('missed'); }
    }
    if(g.t >= g.nextAt && g.t < KM.SHIFT - KM.LAST && g.orders.length < KM.MAXORD) {
        g.seq++;
        g.orders.push({ id: g.seq, kind: hashRand(g.seed + g.seq * 7.1) < 0.55 ? 'kebap' : 'corba', left: g.patience });
        g.nextAt = g.t + KM.GAP[0] + (KM.GAP[1] - KM.GAP[0]) * hashRand(g.seed + g.seq * 3.3);
        ev.push('order');
    }
    if(g.t >= KM.SHIFT && !g.ended) { g.ended = true; ev.push('end'); }
    return ev;
}
// a tap on a skewer's place: a fresh one goes on, or the one there turns over
function flip(g, i) {
    const s = g.skew[i];
    if(!s) { g.skew[i] = { a: 0, b: 0, down: 'a' }; return 'new'; }
    s.down = s.down === 'a' ? 'b' : 'a';
    return 'flip';
}
// the oldest order of this kind is handed its dish
function serve(g, kind, q) {
    const o = g.orders.find(x => x.kind === kind);
    g.orders.splice(g.orders.indexOf(o), 1);
    g.served[kind]++;
    const pay = KM.PAY[kind] * q * g.payMul, tip = q >= KM.TIP_Q && o.left >= g.patience / 2 ? KM.TIP * g.payMul : 0;
    g.earned += pay; g.tips += tip;
    return { kind: 'served', q, pay, tip };
}
// a skewer held: a black one goes in the bin, a raw one stays, a good one goes to whoever asked for kebap
function takeOff(g, i) {
    const s = g.skew[i];
    if(!s) return { kind: 'empty' };
    if(s.a >= KM.BURNT || s.b >= KM.BURNT) { g.skew[i] = null; g.wasted++; return { kind: 'burnt' }; }
    if(s.a < KM.RAW || s.b < KM.RAW) return { kind: 'raw' };
    if(!g.orders.some(o => o.kind === 'kebap')) return { kind: 'nobody' };
    g.skew[i] = null;
    return serve(g, 'kebap', (sideQ(s.a) + sideQ(s.b)) / 2);
}
function ladle(g) {
    const p = g.pot;
    if(!p.portions) return { kind: 'notready' };
    if(!g.orders.some(o => o.kind === 'corba')) return { kind: 'nobody' };
    const r = serve(g, 'corba', clamp(1 - p.scorch, 0, 1));
    if(!--p.portions) refill(p);
    return r;
}
function stir(g) { g.pot.stirT = 0; }
function addWood(g) { g.pot.fuel = Math.min(1, g.pot.fuel + KM.WOOD); }
function shiftPay(g) {
    const wage = KM.WAGE * g.payMul;
    return { wage: Math.round(wage), dishes: Math.round(g.earned), tips: Math.round(g.tips), total: Math.round(wage + g.earned + g.tips) };
}
// the town's inn takes one shift a day from you
const workedToday = loc => ((state.kitchenDays || {})[loc.id]) === state.time.day;

// ---------- live state ----------
let G = null, R = null;   // the run and its settings (job, place, recipe, cost)
let canvas = null, ctx = null, buf = null, b = null;
let W = 320, H = 180, DPR = 1, S = 1, LY = null;
let loopId = null, last = 0, paused = false, built = false;
let pressed = null, keyAim = 0, keyTilt = 0, planeHeld = false;
const TXT = new Map();
function setText(id, t) { if(TXT.get(id) !== t) { TXT.set(id, t); const e = el(id); if(e) e.textContent = t; } }
function setHtml(id, t) { if(TXT.get(id) !== t) { TXT.set(id, t); const e = el(id); if(e) e.innerHTML = t; } }
function say(t, secs) { G.msg = t; G.msgT = secs || 2.2; }

// ---------- sound ----------
// Recorded takes (crafts/CREDITS.md), picked by ear from a page of candidates, played the way that
// page's bench did. The bench: a saw stroke on every turn of the hand (duller and slower when it
// binds), a shaving hiss while the plane takes wood, and the hammer when the piece comes together.
// The kitchen: three loops under the shift — the grill sizzling louder with every skewer on it and
// harder once one starts to burn, the pot bubbling faster and louder as the fire roars, and the
// inn's crowd, a little louder while orders wait. The loops fall silent while the scene is paused.
// The files are fetched and decoded on the first visit (the worker keeps them offline); until then
// those sounds are silent. Same mute and volume as every other sound (forge.js's pattern).
const SFX = ['saw', 'plane', 'hammer', 'sizzle', 'pot', 'crowd'], BUF = {};
const LOOPS = { sizzle: 3, pot: 4, crowd: 12 };   // the looped files and each one's loop length (s)
let sfxAsked = false;
function loadSfx(ac) {
    if(sfxAsked) return;
    sfxAsked = true;
    for(const k of SFX) fetch(`crafts/${k}.mp3`).then(r => r.arrayBuffer()).then(a => ac.decodeAudioData(a))
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
            this.shaveAt = 0; this.src = {}; this.gains = null;
            // the loops only play in the kitchen
            if(job === 'cook') { this.gains = {}; for(const k in LOOPS) { const g = this.gains[k] = ac.createGain(); g.gain.value = 0; g.connect(out); } }
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
        this.src = null; this.gains = null;
        if(this.out) { try { this.out.disconnect(); } catch(e) {} }
        this.out = null;
    },
    /** One recorded take, or nothing while the file isn't decoded yet. */
    play(k, vol, rate) {
        const ac = Game.ac(), b = BUF[k]; if(!ac || !b || !this.out || vol < .02) return;
        try {
            const s = ac.createBufferSource(), g = ac.createGain();
            s.buffer = b; s.playbackRate.value = rate || 1; g.gain.value = vol;
            s.connect(g); g.connect(this.out); s.start();
        } catch(e) {}
    },
    stroke(bind) { this.play('saw', bind ? .55 : .85, bind ? .8 : rnd(.94, 1.06)); },
    // the plane cuts every frame it moves: one hiss at a time, the next once this one has mostly sounded
    shave() {
        const ac = Game.ac(); if(!ac || ac.currentTime < this.shaveAt) return;
        this.shaveAt = ac.currentTime + .5;
        this.play('plane', .8, rnd(.92, 1.08));
    },
    done() { this.play('hammer', .9); },
    tick(g, quiet) {
        const ac = Game.ac(); if(!ac || !this.gains) return;
        const t = ac.currentTime, on = g.skew.filter(Boolean), burning = on.some(s => s[s.down] > KM.GOLD_HI), h = g.pot.h;
        // the bench's curves: the sizzle by the skewers on, the pot by the fire, the crowd by the orders waiting
        const want = { sizzle: on.length ? .35 + .22 * on.length + (burning ? .15 : 0) : 0,
                       pot: h < KM.SIMMER ? .15 * h / KM.SIMMER : .35 + .65 * (h - KM.SIMMER) / (1 - KM.SIMMER),
                       crowd: .4 + .1 * g.orders.length / KM.MAXORD };
        const rate = { sizzle: burning ? 1.1 : 1, pot: .85 + .35 * h, crowd: 1 };
        for(const k in LOOPS) {
            this.gains[k].gain.setTargetAtTime(quiet ? 0 : want[k], t, .15);
            if(this.src[k]) this.src[k].playbackRate.setTargetAtTime(rate[k], t, .2);
        }
    }
};

// ---------- the scene ----------
// The forge's frame: the short side gets 180 buffer pixels, the long side follows the screen, and
// the picture is a 180-tall stage centred in it (`sy`) with the wall and floor running on.
const STAGE = 180, PXMM = 3, PXP = 5;   // the saw's sideways mm on the board, the plane's mm on the edge (buffer px)
function layout() {
    const sy = Math.round((H - STAGE) / 2), tall = H > W * 1.3;
    const segW = Math.max(4, Math.floor((W - Math.min(56, Math.round(W * .12))) / WM.N));
    LY = { sy, tall, floorY: sy + 150, segW, barX: Math.round((W - segW * WM.N) / 2), lineY: sy + 100, gaugeY: sy + 112 };
    // the kitchen: the order slips along the top, the grill and the pot side by side (upright: one over the other)
    if(tall) Object.assign(LY, { tk: { x: 6, y: sy - 30 }, gr: { x: 14, y: sy + 10, w: W - 28 }, pot: { x: W >> 1, y: sy + 132 } });
    else Object.assign(LY, { tk: { x: 8, y: sy + 30 }, gr: { x: Math.round(W * .05), y: sy + 74, w: Math.round(W * .5) }, pot: { x: Math.round(W * .78), y: sy + 112 } });
}
const BAKE = new Map();
function bake(key, w, h, draw) {
    const k = key + ':' + w + 'x' + h;
    let c = BAKE.get(k);
    if(c) return c;
    c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'));
    BAKE.set(k, c);
    return c;
}
function disc(c, x, y, r, col) {
    c.fillStyle = col;
    for(let dy = -r; dy <= r; dy++) { const h = Math.round(Math.sqrt(r * r - dy * dy)); c.fillRect(x - h, y + dy, h * 2 + 1, 1); }
}
function shade(x) {
    // a soft fall-off into the dark at the top, the floor below
    const fy = LY.floorY, top = x.createLinearGradient(0, 0, 0, fy);
    top.addColorStop(0, 'rgba(8,6,5,.85)'); top.addColorStop(Math.max(0, (LY.sy - 10) / fy), 'rgba(8,6,5,.45)'); top.addColorStop(1, 'rgba(8,6,5,0)');
    x.fillStyle = top; x.fillRect(0, 0, W, fy);
    x.fillStyle = '#120d09'; x.fillRect(0, fy, W, H - fy);
    for(let i = 0; i < W; i += 3) for(let y = fy; y < H; y += 28) { x.fillStyle = hashRand(i + y) > .6 ? '#1c140e' : '#0c0907'; x.fillRect(i, y + Math.floor(hashRand(i + y + 5) * 28), 2, 1); }
}
// the workshop: a wall of boards with their grain
function plankWall(x) {
    x.fillStyle = '#140e09'; x.fillRect(0, 0, W, H);
    for(let col = 0, xx = 0; xx < W; col++, xx += 12) {
        const v = 38 + Math.floor(hashRand(col * 17) * 14);
        x.fillStyle = `rgb(${v + 16},${v + 4},${v - 8})`; x.fillRect(xx, 0, 11, LY.floorY);
        x.fillStyle = `rgb(${v + 6},${v - 4},${v - 14})`;
        for(let y = Math.floor(hashRand(col) * 20); y < LY.floorY; y += 23) x.fillRect(xx + 3 + (y % 5), y, 1, 6);
    }
    shade(x);
}
// the kitchen: whitewashed stone gone yellow with smoke
function stoneWall(x) {
    x.fillStyle = '#18130f'; x.fillRect(0, 0, W, H);
    for(let row = 0, y = LY.floorY - 11; y > -11; row++, y -= 11) for(let col = -1, xx = (row % 2) * -9; xx < W; col++, xx += 18) {
        const v = 52 + Math.floor(hashRand(row * 91 + col) * 16);
        x.fillStyle = `rgb(${v + 10},${v + 4},${v - 6})`; x.fillRect(xx + 1, y + 1, 16, 9);
    }
    shade(x);
}
// how far the cut would have wandered at segment position `u` with the saw held straight: the grain's
// own line, which the board's streaks follow so the pull can be read before it comes
function grainAt(g, u) {
    let y = 0;
    for(let i = 0; i < WM.N && i < u; i++) y += g.drift[i] * Math.min(1, u - i);
    return y;
}
function sawBg() {
    return bake('saw' + G.seed, W, H, x => {
        plankWall(x);
        const { barX, segW, lineY, floorY } = LY, x1 = barX + segW * WM.N, top = lineY - 34, bot = lineY + 20;
        // two trestles under the board
        x.fillStyle = '#3a2716';
        for(const tx of [barX + 10, x1 - 22]) { x.fillRect(tx, bot, 12, 4); x.fillRect(tx + 1, bot + 4, 3, floorY - bot - 4); x.fillRect(tx + 8, bot + 4, 3, floorY - bot - 4); }
        // the board seen from above, its streaks running with the grain
        x.fillStyle = '#b8864e'; x.fillRect(barX, top, x1 - barX, bot - top);
        for(let k = -8; k < 22; k++) {
            const off = top + 2 + k * 4, col = k % 3 === 1 ? '#cfa066' : '#94643a';
            x.fillStyle = col;
            for(let px = barX; px < x1; px++) {
                const yy = Math.round(off + grainAt(G, (px - barX) / segW) * PXMM * 2);   // twice the pull: the bend is the tell, not its size
                if(yy > top && yy < bot - 1 && hashRand(px * 3 + k) > .12) x.fillRect(px, yy, 1, 1);
            }
        }
        x.fillStyle = '#7a5230'; x.fillRect(barX, bot - 1, x1 - barX, 1); x.fillRect(x1 - 1, top, 1, bot - top);
        // the pencil line, and the waste side hatched below it as a carpenter marks it
        x.fillStyle = '#2c2630'; x.fillRect(barX, lineY, x1 - barX, 1);
        x.fillStyle = 'rgba(44,38,48,.3)';
        for(let px = barX + 4; px < x1 - 4; px += 9) for(let i = 0; i < 4; i++) x.fillRect(px + i, lineY + 4 + i, 1, 1);
    });
}
function planeBg() {
    return bake('plane', W, H, x => {
        plankWall(x);
        const { barX, segW, gaugeY, floorY } = LY, x1 = barX + segW * WM.N;
        // the bench the board is clamped in, edge up
        x.fillStyle = '#4a321e'; x.fillRect(barX - 16, gaugeY + 22, x1 - barX + 32, 8);
        x.fillStyle = '#5c3e24'; x.fillRect(barX - 16, gaugeY + 22, x1 - barX + 32, 1);
        x.fillStyle = '#3a2716'; x.fillRect(barX - 10, gaugeY + 30, 6, floorY - gaugeY - 30); x.fillRect(x1 + 4, gaugeY + 30, 6, floorY - gaugeY - 30);
        x.fillStyle = '#5a5a5e'; x.fillRect(barX - 6, gaugeY + 4, 4, 18); x.fillRect(x1 + 2, gaugeY + 4, 4, 18);   // the bench dogs
    });
}
function kitchenBg() {
    return bake('kitchen', W, H, x => {
        stoneWall(x);
        const { gr, pot } = LY;
        // the grill's iron frame and the hearth stones under the pot
        x.fillStyle = '#26221f'; x.fillRect(gr.x - 3, gr.y + 2, 3, 58); x.fillRect(gr.x + gr.w, gr.y + 2, 3, 58);
        x.fillStyle = '#2e2620'; x.fillRect(gr.x - 4, gr.y + 58, gr.w + 8, 6);
        x.fillStyle = '#4a4038'; for(let i = 0; i < 5; i++) x.fillRect(pot.x - 26 + i * 11, pot.y + 36, 10, 6);
        // the log pile beside the fire
        const wx = pot.x + 30;
        for(let k = 0; k < 6; k++) { const lx = wx + (k % 3) * 7 - (k > 2 ? -3 : 0), ly = pot.y + 36 - (k > 2 ? 6 : 0); x.fillStyle = '#5a3a20'; x.fillRect(lx, ly, 6, 5); x.fillStyle = '#c8a070'; x.fillRect(lx + 1, ly + 1, 2, 2); }
        // a ladle on the wall
        x.fillStyle = '#6a6460'; x.fillRect(pot.x - 34, pot.y - 50, 1, 16); disc(x, pot.x - 34, pot.y - 32, 3, '#6a6460');
    });
}

// ---------- particles ----------
const FX = [];
function puff(kind, x, y, n) {
    for(let i = 0; i < n; i++) {
        if(FX.length > 260) FX.shift();
        if(kind === 'dust') FX.push({ kind, x, y, vx: rnd(-20, 20), vy: rnd(-12, 18), life: rnd(.4, .9), max: .9 });
        else if(kind === 'shaving') FX.push({ kind, x, y, vx: rnd(-25, 25), vy: rnd(-55, -25), life: rnd(.6, 1.1), max: 1.1, ph: rnd(0, 6) });
        else if(kind === 'chip') FX.push({ kind, x, y, vx: rnd(-40, 40), vy: rnd(-60, -10), life: rnd(.4, .7), max: .7 });
        else if(kind === 'smoke') FX.push({ kind, x, y, vx: rnd(-6, 6), vy: rnd(-24, -12), life: rnd(1, 1.8), max: 1.8, r: rnd(1, 2.5) });
        else if(kind === 'steam') FX.push({ kind, x, y, vx: rnd(-8, 8), vy: rnd(-30, -14), life: rnd(.8, 1.5), max: 1.5, r: rnd(1.5, 3) });
        else if(kind === 'spark') FX.push({ kind, x, y, vx: rnd(-14, 14), vy: rnd(-50, -20), life: rnd(.3, .7), max: .7 });
    }
}
function stepFx(dt) {
    for(let i = FX.length - 1; i >= 0; i--) {
        const p = FX[i];
        p.life -= dt; if(p.life <= 0) { FX.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if(p.kind === 'dust' || p.kind === 'chip') p.vy += 160 * dt;
        else if(p.kind === 'shaving') p.vy += 90 * dt;
        if(p.r) p.r += 3 * dt;
    }
}
function drawFx() {
    for(const p of FX) {
        const a = p.life / p.max, x = Math.round(p.x), y = Math.round(p.y);
        if(p.kind === 'dust') { b.fillStyle = '#d8b480'; b.fillRect(x, y, 1, 1); }
        else if(p.kind === 'shaving') { b.fillStyle = '#ecd29a'; b.fillRect(x, y, 2, 1); b.fillRect(x + Math.round(Math.sin(p.ph + p.life * 9)), y - 1, 1, 1); }
        else if(p.kind === 'chip') { b.fillStyle = '#7a5230'; b.fillRect(x, y, 1, 1); }
        else if(p.kind === 'spark') { b.fillStyle = a > .5 ? '#ffd070' : '#e05a18'; b.fillRect(x, y, 1, 1); }
        else { b.globalAlpha = a * (p.kind === 'smoke' ? .5 : .35); b.fillStyle = p.kind === 'smoke' ? '#2a2420' : '#d8dde0'; const r = Math.round(p.r); b.fillRect(x - r, y - r, r * 2, r * 2); b.globalAlpha = 1; }
    }
}

// ---------- drawing the workshop ----------
function drawSaw() {
    b.drawImage(sawBg(), 0, 0);
    const { barX, segW, lineY } = LY, px = u => barX + u * segW, py = y => lineY + y * PXMM;
    // the kerf so far; the strip below it is the waste
    b.fillStyle = '#2a1a10';
    for(const [u, y] of G.path) b.fillRect(Math.round(px(u)), Math.round(py(y)), 1, 2);
    // the saw: the blade lies along the cut, leant by the aim, and slides with each stroke
    const fx = px(G.x), fy = py(G.y), th = G.aim * .35, ux = Math.cos(th), uy = Math.sin(th), ext = 6 + G.sawOff;
    // where the saw is heading: a faint line ahead of it
    b.fillStyle = 'rgba(255,240,200,.45)';
    for(let i = 4; i < 30; i += 3) b.fillRect(Math.round(fx + ux * i), Math.round(fy + uy * i), 1, 1);
    for(let i = -64 + ext; i <= ext; i++) {
        const x = Math.round(fx + ux * i), y = Math.round(fy + uy * i);
        b.fillStyle = '#9aa2aa'; b.fillRect(x, y - 1, 1, 2);
        if(i % 2 === 0) { b.fillStyle = '#c8d0d8'; b.fillRect(x, y - 1, 1, 1); }
    }
    const hx = Math.round(fx + ux * (-64 + ext)), hy = Math.round(fy + uy * (-64 + ext));
    b.fillStyle = '#6a3e1e'; b.fillRect(hx - 9, hy - 4, 10, 8);
    b.fillStyle = '#8a5428'; b.fillRect(hx - 9, hy - 4, 10, 1);
    drawFx();
}
function drawPlane() {
    b.drawImage(planeBg(), 0, 0);
    const { barX, segW, gaugeY } = LY;
    G.h.forEach((h, i) => {
        const x = barX + i * segW, top = gaugeY - Math.round(h * PXP), done = h <= G.tol;
        b.fillStyle = '#b8864e'; b.fillRect(x, top, segW, gaugeY + 22 - top);
        // a planed surface is bright and smooth, a sawn one dark and ragged
        b.fillStyle = done ? '#e2b878' : '#8a5a30'; b.fillRect(x, top, segW, 1);
        if(!done && hashRand(i * 5 + Math.round(h * 10)) > .5) b.fillRect(x + 1, top + 1, 1, 1);
        // the grain's run, as chevrons pointing the way the plane cuts clean
        b.fillStyle = 'rgba(110,70,36,.75)';
        for(const cy of [gaugeY + 8, gaugeY + 16]) {
            if(cy <= top + 2 || i % 2) continue;
            const d = G.dir[i], cx = x + (segW >> 1);
            b.fillRect(cx - d, cy - 2, 1, 1); b.fillRect(cx, cy - 1, 1, 1); b.fillRect(cx + d, cy, 1, 1); b.fillRect(cx, cy + 1, 1, 1); b.fillRect(cx - d, cy + 2, 1, 1);
        }
        // the gauge line, as the forge's outline: dashed while there's wood to take, gold on it, red with a notch below
        const ty = gaugeY - 1;
        if(h < -G.tol) { b.fillStyle = '#e8402c'; b.fillRect(x, ty, segW, 1); b.fillRect(x + (segW >> 1), ty - 3, 1, 2); }
        else if(done) { b.fillStyle = 'rgba(255,214,110,.9)'; b.fillRect(x, ty, segW, 1); }
        else { b.fillStyle = 'rgba(30,20,30,.75)'; for(let k = 0; k < segW; k += 3) b.fillRect(x + k, ty, Math.min(2, segW - k), 1); }
    });
    // the plane, its sole on the highest point under it
    const half = WM.SOLE >> 1, c = clamp(Math.round(G.u), 0, WM.N - 1);
    let topH = -Infinity;
    for(let k = Math.max(0, c - half); k <= Math.min(WM.N - 1, c + half); k++) topH = Math.max(topH, G.h[k]);
    const cx = Math.round(barX + G.u * segW + segW / 2), w = WM.SOLE * segW, sole = gaugeY - Math.round(topH * PXP) - (pressHeld() ? 0 : 3);
    b.fillStyle = '#5c3a1e'; b.fillRect(cx - (w >> 1), sole - 9, w, 9);
    b.fillStyle = '#7a4e28'; b.fillRect(cx - (w >> 1), sole - 9, w, 1);
    b.fillStyle = '#6a4424'; b.fillRect(cx + (w >> 1) - 10, sole - 17, 6, 8); b.fillRect(cx - (w >> 1) + 3, sole - 13, 5, 4);   // the tote and the knob
    b.fillStyle = '#8d939b'; for(let k = 0; k < 9; k++) b.fillRect(cx - 2 + (k >> 1), sole - 12 + k, 1, 1);                 // the iron
    drawFx();
}

// ---------- drawing the kitchen ----------
/** @type {[number, number[]][]} */
const MEAT = [[0, [196, 82, 92]], [0.5, [214, 128, 110]], [0.7, [206, 150, 96]], [0.85, [190, 118, 54]], [1.2, [142, 78, 32]], [1.4, [86, 48, 24]], [1.6, [34, 24, 18]]];
const MEATC = new Map();
function meatRGB(d) {
    const k = Math.round(clamp(d, 0, 1.6) * 40);
    let c = MEATC.get(k);
    if(c) return c;
    const t = k / 40;
    let i = 0;
    while(i < MEAT.length - 2 && MEAT[i + 1][0] < t) i++;
    const [t0, a] = MEAT[i], [t1, bb] = MEAT[i + 1], f = clamp((t - t0) / (t1 - t0), 0, 1);
    c = `rgb(${Math.round(lerp(a[0], bb[0], f))},${Math.round(lerp(a[1], bb[1], f))},${Math.round(lerp(a[2], bb[2], f))})`;
    MEATC.set(k, c);
    return c;
}
const rowY = k => LY.gr.y + 10 + k * 16;
function drawTicket(o, x, y, t) {
    const late = o.left / G.patience;
    b.fillStyle = '#e8dcc0'; b.fillRect(x, y, 30, 22);
    b.fillStyle = '#c8b898'; b.fillRect(x, y + 21, 30, 1);
    if(o.kind === 'kebap') {
        b.fillStyle = '#8a6a40'; b.fillRect(x + 4, y + 10, 22, 1);
        for(let k = 0; k < 4; k++) { b.fillStyle = meatRGB(1); b.fillRect(x + 6 + k * 5, y + 8, 4, 5); }
    } else {
        b.fillStyle = '#7a4a24'; b.fillRect(x + 7, y + 11, 16, 2); b.fillRect(x + 8, y + 13, 14, 2); b.fillRect(x + 10, y + 15, 10, 2);
        b.fillStyle = '#c87a3a'; b.fillRect(x + 8, y + 10, 14, 1);
        b.fillStyle = 'rgba(160,160,160,.7)'; for(let k = 0; k < 3; k++) b.fillRect(x + 10 + k * 4, y + 4 + Math.round(Math.sin(t * 4 + k) * 1.5), 1, 4);
    }
    // the patience left: green, then amber, then red
    b.fillStyle = 'rgba(0,0,0,.45)'; b.fillRect(x, y + 24, 30, 2);
    b.fillStyle = late > .5 ? '#6ac46a' : late > .25 ? '#e0b040' : '#e04a3a'; b.fillRect(x, y + 24, Math.max(1, Math.round(30 * late)), 2);
}
function drawKitchen() {
    b.drawImage(kitchenBg(), 0, 0);
    const t = G.t, { gr, pot, tk } = LY, p = G.pot;
    G.orders.forEach((o, k) => drawTicket(o, tk.x + k * 34, tk.y, t));
    // the coal bed under the skewers
    for(let i = 0, n = Math.floor(gr.w / 3); i < n; i++) {
        const r1 = hashRand(i * 13), r2 = hashRand(i * 29 + 3), fl = Math.sin(t * (2 + r2 * 5) + i);
        b.fillStyle = ['#3a1a10', '#a83010', '#e05a18', '#ff9030'][clamp(Math.round(1.6 + fl * 1.2 + r1 - .5), 0, 3)];
        b.fillRect(gr.x + 1 + Math.floor(r1 * (gr.w - 3)), gr.y + 54 + Math.floor(r2 * 4), 3, 2);
    }
    G.skew.forEach((s, k) => {
        const y = rowY(k);
        b.fillStyle = '#c8a070'; b.fillRect(gr.x - 2, y, gr.w + 4, 1);
        if(!s) { b.fillStyle = 'rgba(255,255,255,.12)'; b.fillRect(gr.x + 6, y - 3, gr.w - 12, 7); return; }
        const up = s.down === 'a' ? s.b : s.a, dn = s[s.down], gap = (gr.w - 16) / 5;
        for(let c = 0; c < 5; c++) {
            const x = Math.round(gr.x + 8 + c * gap);
            b.fillStyle = meatRGB(up); b.fillRect(x, y - 4, 7, 7);
            b.fillStyle = meatRGB(dn); b.fillRect(x, y + 2, 7, 2);    // the side over the coals shows at the bottom edge
        }
        // fat on the coals; smoke once the bottom is past golden
        if(!blocked() && Math.random() < .05) puff('spark', gr.x + rnd(8, gr.w - 8), gr.y + 54, 1);
        if(!blocked() && dn > KM.GOLD_HI && Math.random() < .04 + .3 * (dn - KM.GOLD_HI)) puff('smoke', gr.x + rnd(8, gr.w - 8), y - 2, 1);
        if(pressed && pressed.slot === k) {
            const f = clamp((performance.now() - pressed.t0) / 1000 / KM.HOLD, 0, 1);
            b.fillStyle = 'rgba(0,0,0,.5)'; b.fillRect(gr.x + 6, y - 8, gr.w - 12, 2);
            b.fillStyle = '#ffd070'; b.fillRect(gr.x + 6, y - 8, Math.round((gr.w - 12) * f), 2);
        }
    });
    // the fire under the pot, tall as its fuel
    const fx = pot.x, fy = pot.y + 36;
    for(let k = 0; k < 6; k++) {
        const hgt = Math.round((3 + 12 * p.fuel) * (.7 + .3 * Math.sin(t * 9 + k * 1.7))), x = fx - 15 + k * 6;
        b.fillStyle = '#e86a20'; b.fillRect(x, fy - hgt, 4, hgt);
        b.fillStyle = '#ffd060'; b.fillRect(x + 1, fy - Math.round(hgt * .6), 2, Math.round(hgt * .6));
    }
    b.fillStyle = '#4a2c16'; b.fillRect(fx - 18, fy - 2, 36, 3);
    // the pot: an iron belly, the soup's face inside the rim
    const r = 20, top = pot.y - 8;
    b.fillStyle = '#2a2a2e';
    for(let y = top; y <= pot.y + r; y++) { const hw = y < pot.y ? r : Math.round(Math.sqrt(r * r - (y - pot.y) ** 2)); b.fillRect(pot.x - hw, y, hw * 2 + 1, 1); }
    b.fillStyle = '#4a4a50'; b.fillRect(pot.x - r - 2, top - 2, r * 2 + 5, 2);
    const sc = clamp(p.scorch, 0, 1), rich = p.portions ? 1 : p.done;
    const soup = [lerp(lerp(184, 168, rich), 70, sc), lerp(lerp(160, 92, rich), 44, sc), lerp(lerp(112, 44, rich), 24, sc)].map(Math.round);
    b.fillStyle = `rgb(${soup})`; b.fillRect(pot.x - r + 2, top, r * 2 - 3, 3);
    // the bubbles are the heat's tell: none cold, a few small at a simmer, many and big at a boil, foam over the rim boiling over
    if(!blocked()) {
        const n = p.h < KM.SIMMER ? 0 : p.h < KM.BOIL ? 1 : 3;
        for(let k = 0; k < n; k++) if(Math.random() < .5) { G.bubbles.push({ x: pot.x - r + 4 + Math.random() * (r * 2 - 8), life: p.h < KM.BOIL ? .35 : .25, big: p.h >= KM.BOIL }); }
        if(p.h >= KM.SIMMER && Math.random() < .15) puff('steam', pot.x + rnd(-12, 12), top - 2, 1);
        if(sc > .45 && Math.random() < sc * .3) puff('smoke', pot.x + rnd(-10, 10), top - 2, 1);
    }
    b.fillStyle = 'rgba(255,240,210,.85)';
    for(const bb of G.bubbles) { const s = bb.big ? 2 : 1; b.fillRect(Math.round(bb.x), top - (bb.big ? 1 : 0), s, s); }
    if(p.h >= KM.OVER) { b.fillStyle = 'rgba(240,230,200,.9)'; b.fillRect(pot.x - r - 1, top - 3, r * 2 + 3, 2); b.fillRect(pot.x - r - 2, top - 1, 2, 5 + Math.round(Math.sin(t * 7) * 2)); }
    // the bowls a cooked batch still holds
    for(let k = 0; k < p.portions; k++) { const bx = pot.x + r + 6 + (k % 2) * 10, by = pot.y - 6 + (k >> 1) * 7; b.fillStyle = '#7a4a24'; b.fillRect(bx, by, 8, 3); b.fillStyle = `rgb(${soup})`; b.fillRect(bx + 1, by - 1, 6, 1); }
    drawFx();
}
function render() {
    if(!G || !ctx) return;
    b.imageSmoothingEnabled = false;
    if(R.job === 'cook') drawKitchen();
    else if(G.phase === 'saw') drawSaw();
    else drawPlane();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, W, H, 0, 0, Math.round(W * S), Math.round(H * S));
}
function resize() {
    if(!canvas) return;
    const r = canvas.getBoundingClientRect(), cw = Math.max(1, r.width), ch = Math.max(1, r.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cw * DPR); canvas.height = Math.round(ch * DPR);
    S = Math.min(canvas.width, canvas.height) / STAGE;
    W = Math.ceil(canvas.width / S); H = Math.ceil(canvas.height / S);
    buf.width = W; buf.height = H;
    BAKE.clear();
    layout();
}
// a pointer on the canvas → a point in the buffer
function toBuf(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * DPR / S, y: (e.clientY - r.top) * DPR / S };
}
const segAt = bx => clamp((bx - LY.barX - LY.segW / 2) / LY.segW, 0, WM.N - 1);
// what in the kitchen a point is on: a skewer's place, the pot, or the fire and its logs
function kitchenHit(p) {
    const { gr, pot } = LY;
    if(p.x >= gr.x - 4 && p.x <= gr.x + gr.w + 4) for(let k = 0; k < 3; k++) if(Math.abs(p.y - rowY(k)) <= 8) return { slot: k };
    if(Math.abs(p.x - pot.x) <= 26 && p.y >= pot.y - 18 && p.y <= pot.y + 22) return { pot: true };
    if(p.x >= pot.x - 26 && p.x <= pot.x + 54 && p.y > pot.y + 22 && p.y <= pot.y + 48) return { wood: true };
    return null;
}

// ---------- the loop ----------
function frame(t) {
    if(!api.active) { loopId = null; return; }
    loopId = requestAnimationFrame(frame);
    if(Game.skipFrame(t)) return;
    const dt = last ? Math.min(.05, (t - last) / 1000) : 1 / 60;
    last = t;
    Debug.guard('crafts loop', () => {
        if(!G) return;
        if(!blocked()) update(dt);
        if(G && R.job === 'cook') Snd.tick(G, blocked());
        render();
        updateHud();
    });
}
const pressHeld = () => planeHeld || !!Input.keys[' '] && !blocked();
function update(dt) {
    G.t += R.job === 'cook' ? 0 : dt;   // the kitchen's model keeps its own clock
    if(G.msgT > 0) G.msgT -= dt;
    if(R.job === 'cook') updateKitchen(dt);
    else if(G.phase === 'saw') {
        if(keyTilt) G.aim = clamp(G.aim + keyTilt * dt * 1.2, -1, 1);
        G.sawOff += (G.sawTo - G.sawOff) * (1 - Math.exp(-18 * dt));
        if(G.y < -0.6 && !G.intoSaid) { G.intoSaid = true; say(T('Çizgiyi geçtin: testere işin içine kaçıyor!'), 2.6); }
    } else {
        if(keyAim) moveTo(clamp(G.u + keyAim * dt * 8, 0, WM.N - 1));
    }
    stepFx(dt);
}
function updateKitchen(dt) {
    for(const ev of stepKitchen(G, dt)) {
        if(ev === 'missed') say(T('Müşteri bekleyemedi, kalkıp gitti.'), 2.4);
        else if(ev === 'ready') say(T('Çorba pişti! Kepçeyle ver.'), 2.2);
        else if(ev === 'burnt') say(T('Çorba dibi tuttu! Kazan boşaltıldı, yenisi konuyor.'), 3);
        else if(ev === 'spill') say(T('Kazan taşıyor! Ateşi azalt.'), 2.4);
        else if(ev === 'end') return finishShift();
    }
    // a skewer held long enough comes off on its own, no need to let go
    if(pressed && pressed.slot != null && !pressed.done && performance.now() - pressed.t0 >= KM.HOLD * 1000) { pressed.done = true; doTakeOff(pressed.slot); }
    for(let i = G.bubbles.length - 1; i >= 0; i--) if((G.bubbles[i].life -= dt) <= 0) G.bubbles.splice(i, 1);
}

// ---------- actions ----------
function doStroke(key) {
    if(!G || G.result || G.phase !== 'saw' || blocked()) return;
    const r = stroke(G, G.t);
    Snd.stroke(r.bind);
    if(key) G.sawTo = G.sawTo > 0 ? -6 : 6;
    puff('dust', LY.barX + G.x * LY.segW, LY.lineY + G.y * PXMM + 2, r.bind ? 1 : 4);
    if(r.bind) say(T('Testere sıkıştı! Daha sakin çek.'), 1.8);
    if(r.done) {
        toPlane(G);
        G.phase = 'plane'; G.u = 0;
        say(T('Kesim bitti. Şimdi kenarı çizgiye kadar rendele.'), 3);
    }
}
// the plane slides to `u`; with the iron down it cuts what it passes
function moveTo(u) {
    const u0 = G.u;
    G.u = u;
    if(!pressHeld() || blocked()) return;
    const r = planeMove(G, u0, u);
    const x = LY.barX + G.u * LY.segW + LY.segW / 2, y = LY.gaugeY - 8;
    if(r.cut > 0) { puff('shaving', x, y, Math.min(3, 1 + Math.round(r.cut * 4))); Snd.shave(); }
    if(r.tears.length) { puff('chip', x, y, 5); say(T('Lif kalktı! Damarın tersine rendeledin.'), 2.4); }
    if(!G.overSaid && G.h.some(h => h < -G.tol)) { G.overSaid = true; say(T('Çizginin altına indin: orası artık kısa kaldı.'), 2.8); }
    if(!G.readySaid && planeReady(G)) { G.readySaid = true; say(T('Kenar çizgide. Bitir\'e bas.'), 2.6); }
}
function finishBoard() {
    if(!G || G.result || G.phase !== 'plane' || !planeReady(G)) return;
    const r = R.recipe, sc = boardScore(G), out = outcome(G, r, sc.S), xp = Math.round((30 + 30 * tierOf(r)) * (.4 + sc.S));
    if(out.kind !== 'ruin') Snd.done();
    if(R.practice) out.timber = 0;
    else {
        if(out.kind === 'ruin') { const back = Math.floor(R.cost.timber / 2); if(back) Game.addItem('timber', back); out.timber = back; }
        else Game.addItem(out.id, 1);
        Game.addProficiencyXp('carpentry', xp);
        Game.trainAttr('agi', 1);
    }
    planeHeld = false; pressed = null;
    G.result = { out, sc, xp };
    paused = false;
    showResult();
}
function doTakeOff(k) {
    const r = takeOff(G, k), x = LY.gr.x + LY.gr.w / 2, y = rowY(k);
    if(r.kind === 'burnt') { puff('smoke', x, y, 6); say(T('Kebap kömür oldu, çöpe gitti.'), 2); }
    else if(r.kind === 'raw') say(T('Bu daha çiğ: iki yüzü de kızarsın.'), 2);
    else if(r.kind === 'nobody') say(T('Kebap isteyen yok.'), 1.6);
    else if(r.kind === 'served') served(r);
}
function served(r) {
    const pay = Math.round(r.pay + r.tip);
    say(r.q >= KM.TIP_Q ? T`Afiyet olsun! +${pay} dinar` : T`Müşteri yedi ama memnun değil: +${pay} dinar`, 1.6);
}
function doLadle() {
    if(!G || G.result || R.job !== 'cook' || blocked()) return;
    const r = ladle(G);
    if(r.kind === 'notready') say(T('Çorba daha pişmedi.'), 1.6);
    else if(r.kind === 'nobody') say(T('Çorba isteyen yok.'), 1.6);
    else { puff('steam', LY.pot.x, LY.pot.y - 12, 4); served(r); }
}
function doStir() { if(G && !G.result && R.job === 'cook' && !blocked()) { stir(G); puff('steam', LY.pot.x, LY.pot.y - 12, 2); } }
function doWood() { if(G && !G.result && R.job === 'cook' && !blocked()) { addWood(G); puff('spark', LY.pot.x, LY.pot.y + 30, 6); } }
function tapSlot(k) { if(G && !G.result && !blocked()) flip(G, k); }
function finishShift() {
    const pay = shiftPay(G), dishes = G.served.kebap + G.served.corba, xp = R.practice ? 0 : 10 + 4 * dishes;
    if(!R.practice) { state.player.money += pay.total; Game.addProficiencyXp('cooking', xp); }
    pressed = null;
    G.result = { pay, xp, dishes };
    paused = false;
    showResult();
}

// ---------- materials ----------
// What a workshop can reach: your bag, and at your own fief its storage too (the forge's rule)
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
const rentOf = (loc, r) => own(loc) ? 0 : cost(r).rent;
// why a piece can't be made right now, or null
function blockOf(loc, r) {
    const c = cost(r);
    if(Game.profLvl('carpentry') < r.req) return T`Marangozluk ${r.req} gerekir`;
    if(stock(loc, 'timber') < c.timber) return T`${c.timber} kereste gerekir`;
    if(state.player.money < rentOf(loc, r)) return T('Tezgâh kirasına paran yetmiyor');
    return null;
}

// ---------- the windows ----------
const chip = h => `<span class="lchip">${h}</span>`;
function open(loc) {
    if(!loc) return;
    const lvl = Game.profLvl('carpentry'), mine = own(loc);
    const rows = WOODWORK.filter(r => ITEMS[r.id]).map(r => {
        const it = ITEMS[r.id], c = cost(r), why = blockOf(loc, r), rent = rentOf(loc, r);
        return `<div class="fs-row${lvl < r.req ? ' locked' : ''}">
            <span class="fs-ic">${Game.itemIco(it)}</span>
            <span class="fs-tx"><b>${T(it.name)}</b><small>${T`Değeri ${it.basePrice} dinar`} · ${T`Marangozluk ${r.req}`}${why ? ` · <em>${why}</em>` : ''}</small></span>
            <span class="fs-cost"><span class="${stock(loc, 'timber') < c.timber ? 'fs-short' : ''}">🪵 ${c.timber}</span>
                <span>⏳ ${T`${c.hours} saat`}</span>${rent ? ` <span class="${state.player.money < rent ? 'fs-short' : ''}">💰 ${rent}</span>` : ''}</span>
            <button class="btn${why ? '' : ' primary'}" ${why ? 'disabled' : ''} onclick="Crafts.start('${loc.id}','${r.id}')">${T('🪚 Yap')}</button>
        </div>`;
    }).join('');
    Game.showModal(`<div class="forge-shop">
        <div class="lb-head"><div><div class="leyebrow">${mine ? T('Kendi atölyen') : T('Marangoz Atölyesi')}</div><h3>🪚 ${T(loc.name)}</h3></div>
            <button class="btn lb-help" onclick="Crafts.help('${loc.id}')" title="${T('Nasıl yapılır?')}" aria-label="${T('Nasıl yapılır?')}">?</button></div>
        <p class="lb-lead">${mine ? T('Kira yok; depodaki keresteyi de kullanırsın.') : T('Tezgâhı iş başına kiralarsın. Kereste pazardan alınır; yaptığını pazarda satarsın.')}</p>
        <div class="lchips">${chip(T`Marangozluk <b>${lvl}</b>`)}${chip(T`🪵 Kereste <b>${stock(loc, 'timber')}</b>`)}${chip(`💰 <b>${Math.floor(state.player.money)}</b>`)}</div>
        <div class="fs-list">${rows}</div>
        <div class="lb-foot"><button class="btn" onclick="Game.closeModal()">${T('Kapat')}</button></div>
    </div>`, '700px');
}
function kitchen(loc) {
    if(!loc) return;
    const lvl = Game.profLvl('cooking'), done = workedToday(loc), m = newShift(lvl, loc.prosperity, 0).payMul;
    const est = Math.round(KM.WAGE * m);
    Game.showModal(`<div class="forge-shop">
        <div class="lb-head"><div><div class="leyebrow">${T('Han Mutfağı')}</div><h3>🍲 ${T(loc.name)}</h3></div>
            <button class="btn lb-help" onclick="Crafts.help('${loc.id}', 'cook')" title="${T('Nasıl pişirilir?')}" aria-label="${T('Nasıl pişirilir?')}">?</button></div>
        <p class="lb-lead">${T`Hancı bir çırak arıyor: ${KM.HOURS} saatlik bir vardiya, ızgarada kebap ve kazanda çorba. Usta ${est} dinar yevmiye verir; her tabak ayrıca kazandırır, iyi tabağa bahşiş düşer.`}</p>
        <div class="lchips">${chip(T`Aşçılık <b>${lvl}</b>`)}${chip(T`Yevmiye <b>${est}</b>`)}</div>
        ${done ? `<p class="lb-lead"><em>${T('Bugün bu handa çalıştın. Yarın yine gel.')}</em></p>` : ''}
        <div class="lb-foot"><button class="btn" onclick="Game.closeModal()">${T('Kapat')}</button>
            <button class="btn primary" ${done ? 'disabled' : ''} onclick="Crafts.shift('${loc.id}')">${T('🍲 Vardiyaya gir')}</button></div>
    </div>`, '560px');
}
// How it's done — for the window, before going in, and from the pause menu
const HELP = [
    ['🪚 Biç', 'Tuval üstünde sağa sola sürükle: her gidiş bir testere çekişi. Boşluk tuşu da çeker. Çok hızlı çekersen testere sıkışır ve sıçrar; sakin ve düzenli çek.'],
    ['🧭 Damarı oku', 'Tahtadaki damarlar testereyi kendi yönüne çeker: damar aşağı kıvrılıyorsa kesik de aşağı kayar. Yukarı-aşağı sürükle (ya da ↑ ↓): testereyi damara karşı eğersin. Önündeki ince çizgi gittiği yeri gösterir.'],
    ['✏️ Çizgiyi bırakma', 'Kurşun kalem çizgisinin altı taralı: orası fire. Kesik firede kalırsa rendelecek iş artar; çizginin üstüne kaçarsa parça eksik kalır.'],
    ['🪵 Rendele', 'Kesilen kenar yukarı bakar. Basılı tutup sağa sola sürükle: rende en yüksek yerlere biner ve onları alır. Kesik çizgi altın sarısına dönünce orası tamam; çizginin altına inersen kırmızı olur.'],
    ['➤ Damar yönü', 'Tahtanın yüzündeki oklar rendenin temiz kestiği yönü gösterir. Tersine sürersen lif kalkar ve orası derin oyulur.'],
    ['🏅 Sonuç', 'Kesimin doğruluğu, kenarın düzlüğü ve işçilik puanlanır. İyi iş istediğin parçayı verir; zayıf iş bir öncekini; kötü iş odun olur ve kerestenin yarısı kurtulur. Marangozluk yükseldikçe iş kolaylaşır.']
];
const COOK_HELP = [
    ['🧾 Siparişler', 'Üstteki fişler müşterilerin istediği: kebap ya da çorba. Altındaki çizgi sabırları; kızarınca kalkıp giderler.'],
    ['🍢 Izgara', 'Boş yere dokun: şiş konur. Şişe dokun: çevrilir. Kömüre bakan yüz pişer; etin alt kenarı o yüzün rengini gösterir. Pembe çiğdir, altın sarısı tamdır, kahve koyulaşır, siyah yanmıştır.'],
    ['✋ Servis', 'İki yüzü de altın olunca şişe basılı tut: kebap sıradaki müşteriye gider. Çiğ şiş inmez; yanmış şiş çöpe gider.'],
    ['🍲 Kazan', 'Kabarcıklar ısıyı söyler: kabarcık yoksa soğuk, ufak ufak kaynıyorsa tam kıvamda, fokur fokursa çok sıcak, köpük taşıyorsa taşıyor. Ateş zamanla söner; odun at. Kazana dokun ya da Karıştır: karıştırılmayan çorba dibini tutar.'],
    ['🥣 Çorba ver', 'Çorba pişince kazanın yanında kâseler belirir. Çorba isteyen varsa Çorba ver ile verilir. Dibi tutmuş çorba az para getirir.'],
    ['💰 Ücret', 'Usta yevmiyeni her hâlde verir; her tabak kalitesine göre ayrıca kazandırır, iyi ve çabuk tabağa bahşiş düşer. Bir handa günde bir vardiya çalışılır. Aşçılık yükseldikçe ücret ve müşterinin sabrı artar.']
];
function help(locId, job) {
    const list = job === 'cook' ? COOK_HELP : HELP, rows = list.map(([t, d]) => `<li><b>${T(t)}</b> ${T(d)}</li>`).join('');
    const back = `<button class="btn primary" onclick="Crafts.${job === 'cook' ? 'kitchen' : 'open'}(LOCATIONS.find(l => l.id === '${locId}'))">${T('← Geri dön')}</button>`;
    Game.showModal(`<div class="lair-brief"><h3>${job === 'cook' ? T('❔ Mutfakta nasıl çalışılır?') : T('❔ Tahta nasıl işlenir?')}</h3><ul class="lb-howto">${rows}</ul><div class="lb-foot">${back}</div></div>`, '640px');
}

// ---------- the screen ----------
// Built from JS so every word goes through T(); the forge's styles dress it (style.css)
function build() {
    if(built) return;
    built = true;
    el('craft-view').innerHTML = `<canvas id="craft-canvas"></canvas>
        <div id="craft-hud">
            <div class="lchips">
                <span class="lchip" id="craft-item"></span>
                <span class="lchip" id="craft-phase"></span>
                <span class="lchip"><span id="craft-s1-l"></span> <b id="craft-s1"></b></span>
                <span class="lchip"><span id="craft-s2-l"></span> <b id="craft-s2"></b></span>
            </div>
            <div id="craft-hint"></div>
        </div>
        <button id="craft-pausebtn" translate="no" aria-label="${T('Duraklat')}" title="${T('Duraklat')}">II</button>
        <div id="craft-msg" hidden></div>
        <div id="craft-keys"></div>
        <div id="craft-btns">
            <button class="fbtn" id="craft-b1"></button>
            <button class="fbtn" id="craft-b2"></button>
            <button class="fbtn primary" id="craft-b3"></button>
        </div>
        <div id="craft-over" hidden></div>`;
    canvas = el('craft-canvas'); ctx = canvas.getContext('2d');
    buf = document.createElement('canvas'); b = buf.getContext('2d');
    bindInput();
}
function overlay(html) { const o = el('craft-over'); o.innerHTML = html ? `<div class="lpanel">${html}</div>` : ''; o.hidden = !html; }
const PHASE = { saw: 'Testere', plane: 'Rende', cook: 'Mutfak' };
function keysHelp() {
    if(R.job === 'cook') return `<kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> ${T('şişi çevir, basılı tut: servis')} · <kbd>Q</kbd> ${T('karıştır')} · <kbd>W</kbd> ${T('odun at')} · <kbd>E</kbd> ${T('çorba ver')} · <kbd>Esc</kbd> ${T('duraklat')}`;
    return G.phase === 'saw' ? `<kbd>${T('Boşluk')}</kbd> ${T('testere çek')} · <kbd>↑</kbd><kbd>↓</kbd> ${T('testereyi eğ')} · <kbd>Esc</kbd> ${T('duraklat')}`
        : `<kbd>${T('Boşluk')}</kbd> ${T('rendeye bastır')} · <kbd>←</kbd><kbd>→</kbd> ${T('rendeyi sür')} · <kbd>Q</kbd> ${T('bitir')} · <kbd>Esc</kbd> ${T('duraklat')}`;
}
const mmTxt = v => T`${v.toFixed(1)} mm`;
function updateHud() {
    setHtml('craft-keys', keysHelp());
    const touch = Game.isTouch(), b1 = el('craft-b1'), b2 = el('craft-b2'), b3 = el('craft-b3');
    if(R.job === 'cook') {
        const left = Math.max(0, Math.ceil(KM.SHIFT - G.t)), p = G.pot;
        setText('craft-item', T('🍲 Han Mutfağı'));
        setText('craft-phase', `⏳ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`);
        setText('craft-s1-l', T('Kazanç')); setText('craft-s1', String(Math.round(G.earned + G.tips)));
        setText('craft-s2-l', T('Kaçan')); setText('craft-s2', String(G.missed));
        setText('craft-hint', touch ? T('Şişe dokun: çevir. Basılı tut: servis et. Kazana dokun: karıştır. Kabarcıklara bak: ufak ufak kaynasın.')
            : T('Şişe tıkla: çevir. Basılı tut: servis et. Kazana tıkla: karıştır. Kabarcıklara bak: ufak ufak kaynasın.'));
        b1.hidden = false; b2.hidden = false; b3.hidden = false;
        setText('craft-b1', T('🪵 Odun at')); setText('craft-b2', T('🥄 Karıştır')); setText('craft-b3', T('🥣 Çorba ver'));
        b3.disabled = !p.portions || !G.orders.some(o => o.kind === 'corba');
    } else {
        const it = ITEMS[R.recipe.id];
        setHtml('craft-item', `${Game.itemIco(it)} ${T(it.name)}`);
        setText('craft-phase', T(PHASE[G.phase]));
        if(G.phase === 'saw') {
            setText('craft-s1-l', T('Kesim')); setText('craft-s1', Game.pct(Math.round(G.x / WM.N * 100)));
            setText('craft-s2-l', T('Sapma')); setText('craft-s2', mmTxt(Math.abs(G.y)));
            setText('craft-hint', touch ? T('Parmağınla sağa sola sürterek biç. Yukarı-aşağı kaydırarak testereyi eğ: damarlar testereyi kendine çeker, kesik kurşun kalem çizgisinde kalsın.')
                : T('Fareyle basılı tutup sağa sola sürterek biç (ya da Boşluk). Yukarı-aşağı sürükleyerek testereyi eğ: damarlar testereyi kendine çeker, kesik kurşun kalem çizgisinde kalsın.'));
            b3.hidden = true;
        } else {
            setText('craft-s1-l', T('Rendelenen')); setText('craft-s1', Game.pct(Math.round(planeDone(G) * 100)));
            setText('craft-s2-l', T('Lif kalkması')); setText('craft-s2', String(G.tears));
            setText('craft-hint', planeReady(G) ? T('Kenar çizgide. Bitir\'e bas.')
                : touch ? T('Parmağını bas ve sağa sola sür: rende yüksek yerleri alır. Okların yönünde sür, kesik çizgi altın olunca orayı bırak.')
                : T('Basılı tutup sağa sola sürükle (ya da Boşluk + ← →): rende yüksek yerleri alır. Okların yönünde sür, kesik çizgi altın olunca orayı bırak.'));
            b3.hidden = false; b3.disabled = !planeReady(G);
            setText('craft-b3', T('Bitir'));
        }
        b1.hidden = true; b2.hidden = true;
    }
    const m = el('craft-msg');
    if(G.msgT > 0) { m.hidden = false; setText('craft-msg', G.msg); } else m.hidden = true;
}

// ---------- input ----------
// a pause, a window, a tutorial coach still up, or the result: the work waits
const blocked = () => paused || Game.tutor != null || !el('modal-overlay').classList.contains('hidden') || !!(G && G.result);
function bindInput() {
    window.addEventListener('keydown', e => {
        if(!api.active || !G) return;
        const k = e.key === ' ' ? ' ' : Input.letter(e);
        const mine = [' ', 'q', 'w', 'e', '1', '2', '3', 'a', 'd', 's'].includes(k) || /^(Arrow|Escape)/.test(e.key);
        if(!mine) return;
        e.preventDefault();
        if(e.key === 'Escape') { if(!G.result) paused ? resume() : pauseMenu(); return; }
        if(blocked() || e.repeat) return;
        if(R.job === 'cook') {
            if('123'.includes(k)) pressed = { slot: +k - 1, t0: performance.now(), key: true };
            else if(k === 'q') doStir();
            else if(k === 'w') doWood();
            else if(k === 'e') doLadle();
            return;
        }
        if(G.phase === 'saw') {
            if(k === ' ') doStroke(true);
            else if(e.key === 'ArrowUp' || k === 'w') keyTilt = -1;
            else if(e.key === 'ArrowDown' || k === 's') keyTilt = 1;
        } else {
            if(k === 'q') finishBoard();
            else if(e.key === 'ArrowLeft' || k === 'a') keyAim = -1;
            else if(e.key === 'ArrowRight' || k === 'd') keyAim = 1;
        }
    }, true);
    window.addEventListener('keyup', e => {
        if(!api.active || !G) return;
        const k = e.key === ' ' ? ' ' : Input.letter(e);
        if(e.key === 'ArrowLeft' || k === 'a' || e.key === 'ArrowRight' || k === 'd') keyAim = 0;
        if(e.key === 'ArrowUp' || k === 'w' || e.key === 'ArrowDown' || k === 's') keyTilt = 0;
        if(pressed && pressed.key && '123'.includes(k)) release();
    }, true);
    canvas.addEventListener('pointerdown', e => {
        if(!G || blocked()) return;
        e.preventDefault();
        try { canvas.setPointerCapture(e.pointerId); } catch(err) {}
        const p = toBuf(e);
        if(R.job === 'cook') {
            const hit = kitchenHit(p);
            if(!hit) return;
            if(hit.slot != null) pressed = { slot: hit.slot, t0: performance.now() };
            else if(hit.pot) doStir();
            else if(hit.wood) doWood();
            return;
        }
        // the plane is set down where the hand is, without cutting its way there
        pressed = { x: p.x, y: p.y, ext: p.x, dir: 0, run: 0 };
        if(G.phase === 'plane') { G.u = segAt(p.x); planeHeld = true; }
    });
    canvas.addEventListener('pointermove', e => {
        if(!G || !pressed || R.job === 'cook' || blocked()) return;
        const p = toBuf(e);
        if(G.phase === 'plane') moveTo(segAt(p.x));
        else {
            // the hand's sideways scrub drives the saw: a turn of direction (3 px back from the
            // furthest point, so a shaky hand isn't a stroke) after a real stretch is one stroke;
            // up and down leans it
            G.aim = clamp(G.aim + (p.y - pressed.y) * .05, -1, 1);
            G.sawTo = clamp(G.sawTo + p.x - pressed.x, -8, 8);
            const back = (pressed.ext - p.x) * pressed.dir;
            if(!pressed.dir) { if(Math.abs(p.x - pressed.ext) >= 3) { pressed.dir = Math.sign(p.x - pressed.ext); pressed.run = Math.abs(p.x - pressed.ext); pressed.ext = p.x; } }
            else if(back < 0) { pressed.run -= back; pressed.ext = p.x; }
            else if(back >= 3) {
                if(pressed.run >= 5) doStroke();
                pressed.dir = -pressed.dir; pressed.run = back; pressed.ext = p.x;
            }
        }
        pressed.x = p.x; pressed.y = p.y;
    });
    const release = () => {
        const p = pressed;
        pressed = null; planeHeld = false;
        if(!p || !G) return;
        if(p.slot != null && !p.done) tapSlot(p.slot);
        if(p.run >= 5 && G.phase === 'saw') doStroke();   // the last stroke before letting go counts too
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', () => { pressed = null; planeHeld = false; });
    /** @type {[string, () => void][]} */
    const BTNS = [['craft-b1', doWood], ['craft-b2', doStir], ['craft-b3', () => R.job === 'cook' ? doLadle() : finishBoard()], ['craft-pausebtn', pauseMenu]];
    for(const [id, fn] of BTNS) {
        const btn = el(id);
        btn.addEventListener('click', () => { btn.blur(); fn(); });
    }
    window.addEventListener('resize', () => { if(api.active) resize(); });
}

function pauseMenu() {
    if(!G || G.result) return;
    paused = true; pressed = null; planeHeld = false;
    const cook = R.job === 'cook';
    overlay(`<div class="leyebrow">${T('Duraklatıldı')}</div><h2>${cook ? T('Han Mutfağı') : T(ITEMS[R.recipe.id].name)}</h2>
        <div class="lrow">
            <button class="btn primary" onclick="Crafts.resume()">${T('Devam et')}</button>
            <button class="btn" onclick="Crafts.howto()">${cook ? T('❔ Mutfakta nasıl çalışılır?') : T('❔ Tahta nasıl işlenir?')}</button>
            <button class="btn" onclick="Crafts.abandon()">${T('🚪 Vazgeç')}</button>
        </div>
        <p class="lnote">${R.practice ? (cook ? T('Deneme: para, XP ve zaman yok.') : T('Deneme: kereste harcanmaz; eşya, XP ve zaman yok.')) : cook ? T('Vazgeçersen vardiyanın parası ödenmez; bugün bu handa yine çalışamazsın.') : T('Vazgeçersen kereste sana kalır; kira ödenmiştir.')}</p>`);
}
function howto() {
    paused = true;
    const cook = R && R.job === 'cook', list = cook ? COOK_HELP : HELP;
    overlay(`<h2>${cook ? T('❔ Mutfakta nasıl çalışılır?') : T('❔ Tahta nasıl işlenir?')}</h2><ul class="lb-howto">${list.map(([t, d]) => `<li><b>${T(t)}</b> ${T(d)}</li>`).join('')}</ul>
        <div class="lrow"><button class="btn primary" onclick="Crafts.resume()">${T('Başla')}</button></div>`);
}
const HELP_KEY = { saw: 'webband_wood_help', cook: 'webband_cook_help' };
function resume() {
    paused = false; overlay(''); last = 0;
    try { localStorage.setItem(HELP_KEY[R.job], '1'); } catch(e) {}
}
function grade(sc, out) {
    if(out.kind === 'ruin') return T('Odun oldu');
    if(out.kind === 'prev') return T('Bir küçüğü çıktı');
    return sc.S >= .85 ? T('Ustalık işi') : sc.S >= .72 ? T('İyi iş') : T('Kabul edilir');
}
function showResult() {
    const pc = v => Game.pct(Math.round(v * 100)), table = rows => `<table class="lres">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`;
    // a practice keeps nothing and goes on: the same again, another trade, or back to the menu
    const back = `<div class="lrow">${R.practice ? `<button class="btn primary" onclick="Crafts.practice('${R.job}'${R.recipe ? `, '${R.recipe.id}'` : ''})">${T('🔁 Tekrar dene')}</button>
            <button class="btn" onclick="Crafts.trades()">${T('🧰 Başka meslek')}</button><button class="btn" onclick="Crafts.leave()">${T('Ana menü')}</button>`
        : `<button class="btn primary" onclick="Crafts.leave()">${T('🏘️ Şehre dön')}</button>`}</div>`;
    const kept = rows => R.practice ? [] : rows;
    if(R.job === 'cook') {
        const { pay, xp, dishes } = G.result;
        const head = dishes >= 8 && !G.missed ? T('Usta memnun') : dishes >= 4 ? T('Fena değil') : T('Usta söyleniyor');
        overlay(`<div class="leyebrow">${T('Han Mutfağı')} · ${where()}</div>
            <h2>🍲 ${head}</h2><p class="llead">${R.practice ? T`Vardiya bitti: ${pay.total} dinar kazanırdın.` : T`Vardiya bitti: eline ${pay.total} dinar geçti.`}</p>
            ${table([[T('Kebap'), G.served.kebap], [T('Çorba'), G.served.corba], [T('Kaçan sipariş'), G.missed], [T('Çöpe giden'), G.wasted],
                [T('Yevmiye'), pay.wage], [T('Tabak parası'), pay.dishes], [T('Bahşiş'), pay.tips], [T('Toplam'), `💰 ${pay.total}`]]
                .concat(kept([[T('Aşçılık'), T`+${xp} XP`], [T('Geçen süre'), T`${KM.HOURS} saat`]])))}${back}`);
        return;
    }
    const { out, sc, xp } = G.result, it = ITEMS[R.recipe.id];
    const lead = R.practice ? (out.kind === 'item' ? T`${T(it.name)} tuttu.` : out.kind === 'prev' ? T`İş tutmadı: ${T(ITEMS[out.id].name)} olurdu.` : T('Tahta odun oldu.'))
        : out.kind === 'item' ? T`${T(it.name)} hazır, çantanda.`
        : out.kind === 'prev' ? T`İş tutmadı; artan tahtadan ${T(ITEMS[out.id].name)} çıkardın, çantanda.`
        : out.timber ? T`Tahta odun oldu. ${out.timber} kereste kurtardın.` : T('Tahta odun oldu; kurtarılacak bir şey kalmadı.');
    overlay(`<div class="leyebrow">${T(it.name)} · ${where()}</div>
        <h2>${(out.kind === 'ruin' ? '' : Game.itemIco(ITEMS[out.id], true) + ' ') + grade(sc, out)}</h2><p class="llead">${lead}</p>
        ${table([[T('Kesim'), pc(sc.saw)], [T('Rende'), pc(sc.plane)], [T('İşçilik'), pc(sc.care)], [T('Puan'), pc(sc.S)],
            [T('Testere sıkıştı'), G.binds], [T('Lif kalkması'), G.tears]].concat(kept([[T('Marangozluk'), T`+${xp} XP`], [T('Geçen süre'), T`${R.cost.hours} saat`]])))}${back}`);
}

// ---------- going in and coming out ----------
function start(locId, id) {
    const loc = LOCATIONS.find(l => l.id === locId), r = work(id);
    if(!loc || !r || !ITEMS[id]) return;
    const why = blockOf(loc, r);
    if(why) return alert(why);
    const c = cost(r), rent = rentOf(loc, r);
    take(loc, 'timber', c.timber);
    state.player.money -= rent;
    Game.updateTopBar();
    begin({ job: 'saw', recipe: r, loc, cost: c, rent, own: own(loc) },
        Object.assign(newBoard(r, Game.profLvl('carpentry'), Math.floor(Math.random() * 1e6)), { phase: 'saw', u: 0, sawOff: 0, sawTo: 6 }));
}
function shift(locId) {
    const loc = LOCATIONS.find(l => l.id === locId);
    if(!loc || workedToday(loc)) return;
    // the day is taken the moment you walk into the kitchen, so walking out can't buy a second go
    (state.kitchenDays = state.kitchenDays || {})[loc.id] = state.time.day;
    begin({ job: 'cook', loc, cost: { hours: KM.HOURS } }, Object.assign(newShift(Game.profLvl('cooking'), loc.prosperity, Math.floor(Math.random() * 1e6)), { bubbles: [] }));
}
const where = () => R.practice ? (R.job === 'cook' ? T('Deneme mutfağı') : T('Deneme tezgâhı')) : R.job === 'cook' ? T(R.loc.name) : R.own ? T('Kendi atölyen') : T('Marangoz Atölyesi');
function begin(run, g) {
    Game.closeModal();
    build();
    R = run;
    G = Object.assign(g, { msg: '', msgT: 0, result: null });
    if(R.job !== 'cook') G.t = 0;
    FX.length = 0; TXT.clear(); pressed = null; keyAim = 0; keyTilt = 0; planeHeld = false;
    api.active = true; paused = false;
    if(R.practice) practiceScreen(true); else Game.showScreen('craft');
    overlay('');
    resize();
    Game.curtain(R.job === 'cook' ? T('Han Mutfağı') : T(ITEMS[R.recipe.id].name), where());
    Game.Music.sync();
    Snd.start(R.job);
    last = 0;
    if(!loopId) loopId = requestAnimationFrame(frame);
    let seen = null; try { seen = localStorage.getItem(HELP_KEY[R.job]); } catch(e) {}
    if(!seen && !R.practice) howto();
}
// ---------- practice ----------
// From the start screen's Meslekler, with no game under way: every trade's whole scene at skill 1
// with every piece open, and nothing taken, given or passing — no timber, rent, item, pay, XP or
// hours. The forge's own practice (Forge.practice) is the third trade on the list. The view lives
// in the game's UI, so it's shown over the start screen by hand, as the forge does.
function practiceScreen(on) {
    el('start-screen').classList.toggle('active', !on);
    el('main-ui').classList.toggle('active', on);
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', on && v.id === 'craft-view'));
    document.body.classList.toggle('in-battle', on);
}
const TRADES = [
    ['🔨', 'Demircilik', 'Ocakta demir döv, su ver, taşta bile.', 'Forge.practice()'],
    ['🪚', 'Marangozluk', 'Tahtayı damarına karşı biç, kenarını rendele.', "Crafts.practice('saw')"],
    ['🍲', 'Aşçılık', 'Han mutfağında bir vardiya: şişler ve çorba kazanı.', "Crafts.practice('cook')"]
];
function trades() {
    if(api.active) leave();
    if(Forge.active) Forge.leave();   // "another trade" from the forge's practice result
    Game.showModal(`<div class="forge-shop">
        <div class="lb-head"><div><div class="leyebrow">${T('Zanaat')}</div><h3>🧰 ${T('Meslekler')}</h3></div></div>
        <p class="lb-lead">${T('Oyuna başlamadan bir zanaatı dene: malzeme harcanmaz; eşya, para, XP ve zaman yok.')}</p>
        <div class="fs-list">${TRADES.map(([ic, name, desc, go]) => `<div class="fs-row">
            <span class="fs-ic">${ic}</span><span class="fs-tx"><b>${T(name)}</b><small>${T(desc)}</small></span>
            <button class="btn primary" onclick="${go}">${T('Dene')}</button></div>`).join('')}</div>
        <div class="lb-foot"><button class="btn" onclick="Game.closeModal()">${T('Kapat')}</button></div>
    </div>`, '600px');
}
function practice(job, id) {
    const r = id && work(id), again = api.active;   // "try again" from the result: the how-to was read
    if(job === 'cook' || r) {
        const seed = Math.floor(Math.random() * 1e6);
        begin(job === 'cook' ? { job, practice: true, loc: null, cost: { hours: KM.HOURS } }
                : { job: 'saw', practice: true, recipe: r, loc: null, cost: cost(r), rent: 0, own: false },
            job === 'cook' ? Object.assign(newShift(1, 50, seed), { bubbles: [] })
                : Object.assign(newBoard(r, 1, seed), { phase: 'saw', u: 0, sawOff: 0, sawTo: 6 }));
        if(!again) howto();
        return;
    }
    if(api.active) leave();
    const rows = WOODWORK.filter(x => ITEMS[x.id]).map(x => { const it = ITEMS[x.id];
        return `<div class="fs-row"><span class="fs-ic">${Game.itemIco(it)}</span>
            <span class="fs-tx"><b>${T(it.name)}</b><small>${T`Değeri ${it.basePrice} dinar`} · ${T`Marangozluk ${x.req}`}</small></span>
            <button class="btn primary" onclick="Crafts.practice('saw', '${x.id}')">${T('🪚 Yap')}</button></div>`; }).join('');
    Game.showModal(`<div class="forge-shop">
        <div class="lb-head"><div><div class="leyebrow">${T('Deneme tezgâhı')}</div><h3>🪚 ${T('Marangozluk Dene')}</h3></div></div>
        <p class="lb-lead">${T('Her parça açık, kereste harcanmaz; eşya, XP ve zaman yok.')}</p>
        <div class="fs-list">${rows}</div>
        <div class="lb-foot"><button class="btn" onclick="Crafts.trades()">${T('← Geri dön')}</button></div>
    </div>`, '700px');
}
// Giving up: the timber comes back (the rent stays paid); a shift walked out of pays nothing
function abandon() {
    if(!G || G.result) return;
    if(R.job === 'saw' && !R.practice) Game.addItem('timber', R.cost.timber);
    G.result = { abandoned: true };
    leave();
}
function leave() {
    if(!R) return;
    const loc = R.loc, hours = G && G.result && !G.result.abandoned ? R.cost.hours : Math.ceil(R.cost.hours / 2);
    overlay('');
    api.active = false;
    if(loopId) { cancelAnimationFrame(loopId); loopId = null; }
    const wasPractice = R.practice;
    G = null; R = null; pressed = null; planeHeld = false;
    Snd.stop();
    if(wasPractice) { practiceScreen(false); Game.Music.sync(); return; }
    Game.drawTown(loc);
    Game.Music.sync();
    // the hours at the bench or the grill pass once you're back in the town
    Game.advanceTime(hours);
    Game.updateTopBar();
    Game.redrawTown(loc);
}

const api = {
    active: false,
    WOOD: WM, KITCHEN: KM, WOODWORK, HELP, COOK_HELP,
    open, kitchen, help, start, shift, resume, howto, abandon, leave, pauseMenu, trades, practice,
    // the pure models, for tools/test.js
    _model: { newBoard, stroke, toPlane, planeMove, planeReady, planeDone, boardScore, passMark, outcome, cost, prevOf, blockOf, stock,
        newShift, stepKitchen, flip, takeOff, ladle, stir, addWood, sideQ, shiftPay, workedToday, meatRGB },
    // for the tests and the debug report: the live run, read-only by convention
    run() { return G; }, runConfig() { return R; },
    // world setup for the e2e tests: a buffer point in client pixels, and where the kitchen's things are
    _point(what, k) {
        const r = canvas.getBoundingClientRect(), at = (x, y) => ({ x: r.left + x * S / DPR, y: r.top + y * S / DPR });
        if(what === 'skewer') return at(LY.gr.x + LY.gr.w / 2, rowY(k));
        if(what === 'pot') return at(LY.pot.x, LY.pot.y);
        if(what === 'wood') return at(LY.pot.x + 36, LY.pot.y + 34);
        if(what === 'board') return at(LY.barX + k * LY.segW + LY.segW / 2, R.job === 'saw' && G.phase === 'saw' ? LY.lineY : LY.gaugeY);
        return null;
    },
    // the measured numbers in docs/SYSTEMS.md: ms per update and per render, averaged over n frames
    _bench(n = 120) { let u = 0, r = 0; for(let i = 0; i < n; i++) { let t = performance.now(); update(1 / 60); u += performance.now() - t; t = performance.now(); render(); r += performance.now() - t; } return { update: +(u / n).toFixed(3), render: +(r / n).toFixed(3) }; },
    // the strings the tables show, for the i18n gate (tools/test.js)
    strings() { return [...HELP.flat(), ...COOK_HELP.flat(), ...Object.values(PHASE), ...TRADES.flatMap(t => [t[1], t[2]]),
        ...['timber', ...WOODWORK.map(r => r.id)].flatMap(id => ITEMS[id] ? [ITEMS[id].name, ITEMS[id].desc] : [])]; }
};
return api;
})();
