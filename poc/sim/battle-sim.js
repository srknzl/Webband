// Shared mini-battle for the renderer POCs (A: PixiJS, C: React Native + Skia; E ports it
// line-for-line to GDScript in poc/e-godot/sim.gd). It is deliberately NOT the real
// battle.js: that one needs the whole game (Game, state, DOM, T) to run, and porting it into
// Hermes or GDScript would be the port itself, not a renderer test. This file keeps the parts
// that decide what a renderer has to draw — N units walking, swinging, shooting, dying,
// arrows, sparks, damage numbers, corpses — and nothing else.
//
// Rules the renderers rely on:
// - No DOM, no globals, no Math.random: the same seed gives the same battle everywhere.
//   Distances are sqrt(x*x + y*y), never Math.hypot or **, so the GDScript port can match
//   it bit for bit (hypot's scaled algorithm rounds differently from a plain sqrt).
// - Fixed 60 Hz step. A renderer runs step() as many times as the wall clock asks for and
//   draws in between with `alpha` (prev -> current position), so motion stays smooth at any
//   display rate (30/60/120 Hz) and the battle's outcome never depends on the frame rate.
// - Arrays are mutated in place; dead units stay in `units` with alive = false (their
//   index is stable), short-lived things (arrows/sparks/texts) are swap-removed.

export const STEP = 1 / 60;

export function mulberry32(a) {
    return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// Numbers are in the real game's range (battle.js: ~60 px/s on foot, cavalry about twice
// that, melee reach ~22-26 px, 36/48 px sprites) so the picture density matches.
export const TYPES = {
    infantry: { speed: 62,  hp: 100, range: 22,  dmg: [12, 18], cd: 0.9, size: 36 },
    archer:   { speed: 56,  hp: 70,  range: 360, dmg: [9, 13],  cd: 1.7, size: 36, ranged: true },
    cavalry:  { speed: 130, hp: 130, range: 26,  dmg: [16, 24], cd: 1.1, size: 48 },
};
export const TIER_NAMES = ['weak', 'normal', 'armored'];
export const ARROW_SPEED = 520;

const CAP = { sparks: 400, texts: 80, corpses: 400, stains: 300 };
const CELL = 48;

export function createSim({ perSide = 20, seed = 1 } = {}) {
    const sim = {
        perSide, seed, round: 0,
        W: 0, H: 0, t: 0, steps: 0,
        units: [], arrows: [], sparks: [], texts: [], corpses: [], stains: [], decor: [],
        alive: [0, 0], endT: 0,
    };
    let rnd, cols, rows, head, next;

    function reset(newSeed) {
        if (newSeed !== undefined) sim.seed = newSeed;
        rnd = mulberry32(sim.seed * 7919 + sim.round);
        // Arena grows with the army so density stays roughly constant.
        sim.W = Math.round(Math.min(3600, 900 + perSide * 9));
        sim.H = Math.round(sim.W * 0.56);
        sim.t = 0; sim.steps = 0; sim.endT = 0;
        sim.units = []; sim.arrows = []; sim.sparks = []; sim.texts = [];
        sim.corpses = []; sim.stains = []; sim.decor = [];
        cols = Math.ceil(sim.W / CELL) + 1; rows = Math.ceil(sim.H / CELL) + 1;
        head = new Int32Array(cols * rows);

        // Ground decoration: every renderer bakes the same ground from this list once.
        for (let i = 0; i < Math.round(sim.W * sim.H / 9000); i++) {
            let k = rnd();
            sim.decor.push({
                kind: k < 0.55 ? 'grass' : k < 0.85 ? 'dirt' : 'rock',
                x: rnd() * sim.W, y: rnd() * sim.H,
                r: k < 0.55 ? 3 + rnd() * 5 : k < 0.85 ? 18 + rnd() * 40 : 5 + rnd() * 9,
            });
        }

        for (let team = 0; team < 2; team++) {
            // Infantry front, archers behind, cavalry on the flanks — the usual line.
            let n = perSide, nInf = Math.round(n * 0.5), nArc = Math.round(n * 0.3), nCav = n - nInf - nArc;
            let dir = team === 0 ? 1 : -1, baseX = team === 0 ? sim.W * 0.18 : sim.W * 0.82;
            const line = (count, type, depth, yFrom, yTo) => {
                let perRow = Math.max(1, Math.min(count, Math.floor((yTo - yFrom) / 30)));
                for (let i = 0; i < count; i++) {
                    let row = Math.floor(i / perRow), col = i % perRow;
                    let y = yFrom + (col + 0.5) * (yTo - yFrom) / perRow + (rnd() - 0.5) * 8;
                    let x = baseX + dir * (depth - row * 28) + (rnd() - 0.5) * 8;
                    addUnit(team, type, x, y);
                }
            };
            line(nInf, 'infantry', 60, sim.H * 0.2, sim.H * 0.8);
            line(nArc, 'archer', -40, sim.H * 0.25, sim.H * 0.75);
            line(Math.ceil(nCav / 2), 'cavalry', 20, sim.H * 0.04, sim.H * 0.18);
            line(Math.floor(nCav / 2), 'cavalry', 20, sim.H * 0.82, sim.H * 0.96);
        }
        next = new Int32Array(sim.units.length);
        sim.alive = [perSide, perSide];
        return sim;
    }

    function addUnit(team, type, x, y) {
        let T = TYPES[type];
        sim.units.push({
            id: sim.units.length, team, type, tier: Math.floor(rnd() * 3),
            x, y, px: x, py: y, vx: 0, vy: 0,
            hp: T.hp, maxHp: T.hp, alive: true,
            cd: rnd() * T.cd, retarget: rnd() * 0.4, target: -1,
            swingT: 0, swingAngle: 0, bowT: 0, aim: team === 0 ? 0 : Math.PI, hitFlash: 0,
            phase: rnd() * 10,   // gait offset, so a line doesn't bob in unison
        });
    }

    function buildGrid() {
        head.fill(-1);
        for (let u of sim.units) {
            if (!u.alive) continue;
            let c = cellOf(u.x, u.y);
            next[u.id] = head[c]; head[c] = u.id;
        }
    }
    function cellOf(x, y) {
        let cx = Math.max(0, Math.min(cols - 1, (x / CELL) | 0));
        let cy = Math.max(0, Math.min(rows - 1, (y / CELL) | 0));
        return cy * cols + cx;
    }
    // Calls fn(unit) for every live unit in the 3x3 cells around (x, y).
    function near(x, y, fn) {
        let cx = (x / CELL) | 0, cy = (y / CELL) | 0;
        for (let j = cy - 1; j <= cy + 1; j++) {
            if (j < 0 || j >= rows) continue;
            for (let i = cx - 1; i <= cx + 1; i++) {
                if (i < 0 || i >= cols) continue;
                for (let id = head[j * cols + i]; id !== -1; id = next[id]) fn(sim.units[id]);
            }
        }
    }

    function nearestEnemy(u) {
        let best = -1, bd = Infinity;
        for (let e of sim.units) {
            if (!e.alive || e.team === u.team) continue;
            let ex = e.x - u.x, ey = e.y - u.y, d = ex * ex + ey * ey;
            if (d < bd) { bd = d; best = e.id; }
        }
        return best;
    }

    function hit(tgt, dmg, fromAngle) {
        if (!tgt.alive) return;   // an arrow and a sword can land on the same step
        tgt.hp -= dmg;
        tgt.hitFlash = 0.18;
        for (let i = 0; i < 5 && sim.sparks.length < CAP.sparks; i++) {
            let a = fromAngle + (rnd() - 0.5) * 1.6, s = 90 + rnd() * 160;
            sim.sparks.push({ x: tgt.x, y: tgt.y - 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4,
                color: rnd() < 0.5 ? '#ffd27a' : '#ff7a4a' });
        }
        if (sim.texts.length < CAP.texts)
            sim.texts.push({ x: tgt.x + (rnd() - 0.5) * 10, y: tgt.y - 22, text: String(dmg),
                life: 0.9, big: dmg >= 20, color: tgt.team === 0 ? '#ff8a7a' : '#ffe08a' });
        if (tgt.hp <= 0) {
            tgt.alive = false; tgt.hp = 0;
            sim.alive[tgt.team]--;
            if (sim.corpses.length >= CAP.corpses) sim.corpses.shift();
            sim.corpses.push({ x: tgt.x, y: tgt.y, rot: rnd() * Math.PI, team: tgt.team });
            if (sim.stains.length >= CAP.stains) sim.stains.shift();
            sim.stains.push({ x: tgt.x + (rnd() - 0.5) * 8, y: tgt.y + 4, r: 5 + rnd() * 6, a: 0.5 + rnd() * 0.3 });
        }
    }

    function step() {
        let dt = STEP;
        sim.t += dt; sim.steps++;
        buildGrid();

        for (let u of sim.units) {
            u.px = u.x; u.py = u.y;
            if (!u.alive) continue;
            let T = TYPES[u.type];
            u.cd -= dt; u.retarget -= dt; u.swingT = Math.max(0, u.swingT - dt);
            u.bowT = Math.max(0, u.bowT - dt); u.hitFlash = Math.max(0, u.hitFlash - dt);

            // Target search is throttled (0.3-0.5 s per unit), like the real game.
            let tgt = u.target >= 0 ? sim.units[u.target] : null;
            if (!tgt || !tgt.alive || u.retarget <= 0) {
                u.target = nearestEnemy(u); u.retarget = 0.3 + rnd() * 0.2;
                tgt = u.target >= 0 ? sim.units[u.target] : null;
            }
            let wantX = 0, wantY = 0;
            if (tgt) {
                let dx = tgt.x - u.x, dy = tgt.y - u.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
                u.aim = Math.atan2(dy, dx);
                if (T.ranged && d > 70) {
                    if (d > T.range * 0.9) { wantX = dx / d; wantY = dy / d; }
                    else if (u.cd <= 0) {
                        // Lead the target so arrows land on walkers too.
                        let tt = d / ARROW_SPEED, ax = tgt.x + tgt.vx * tt, ay = tgt.y + tgt.vy * tt;
                        let a = Math.atan2(ay - u.y, ax - u.x) + (rnd() - 0.5) * 0.12;
                        sim.arrows.push({ x: u.x, y: u.y - 8, px: u.x, py: u.y - 8,
                            vx: Math.cos(a) * ARROW_SPEED, vy: Math.sin(a) * ARROW_SPEED,
                            team: u.team, life: T.range / ARROW_SPEED * 1.25,
                            dmg: T.dmg[0] + Math.floor(rnd() * (T.dmg[1] - T.dmg[0] + 1)) });
                        u.cd = T.cd * (0.85 + rnd() * 0.3); u.bowT = 0.25;
                    }
                } else if (d > T.range) {
                    wantX = dx / d; wantY = dy / d;
                } else if (u.cd <= 0) {
                    hit(tgt, T.dmg[0] + Math.floor(rnd() * (T.dmg[1] - T.dmg[0] + 1)), u.aim);
                    u.cd = T.cd * (0.85 + rnd() * 0.3); u.swingT = 0.25; u.swingAngle = u.aim;
                }
            }
            // Separation: push away from neighbours closer than 16 px.
            let sx = 0, sy = 0;
            near(u.x, u.y, o => {
                if (o === u) return;
                let dx = u.x - o.x, dy = u.y - o.y, d2 = dx * dx + dy * dy;
                if (d2 < 256 && d2 > 0.01) { let d = Math.sqrt(d2); sx += dx / d * (16 - d); sy += dy / d * (16 - d); }
            });
            // Velocity eases toward the wanted direction (no instant turns).
            let k = Math.min(1, dt * 8);
            u.vx += (wantX * T.speed - u.vx) * k;
            u.vy += (wantY * T.speed - u.vy) * k;
            u.x = Math.max(8, Math.min(sim.W - 8, u.x + u.vx * dt + sx * 0.25));
            u.y = Math.max(8, Math.min(sim.H - 8, u.y + u.vy * dt + sy * 0.25));
        }

        for (let i = sim.arrows.length - 1; i >= 0; i--) {
            let a = sim.arrows[i];
            a.px = a.x; a.py = a.y;
            a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
            let victim = null;
            near(a.x, a.y + 8, o => {
                if (victim || o.team === a.team) return;
                let ox = o.x - a.x, oy = o.y - a.y - 8;
                if (ox * ox + oy * oy < 121) victim = o;
            });
            if (victim) hit(victim, a.dmg, Math.atan2(a.vy, a.vx));
            if (victim || a.life <= 0) { sim.arrows[i] = sim.arrows[sim.arrows.length - 1]; sim.arrows.pop(); }
        }
        for (let i = sim.sparks.length - 1; i >= 0; i--) {
            let s = sim.sparks[i];
            s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.92; s.vy *= 0.92; s.life -= dt;
            if (s.life <= 0) { sim.sparks[i] = sim.sparks[sim.sparks.length - 1]; sim.sparks.pop(); }
        }
        for (let i = sim.texts.length - 1; i >= 0; i--) {
            let f = sim.texts[i];
            f.y -= 28 * dt; f.life -= dt;
            if (f.life <= 0) { sim.texts[i] = sim.texts[sim.texts.length - 1]; sim.texts.pop(); }
        }

        // A finished battle restarts on its own after 2.5 s, with the next round's layout.
        if (!sim.endT && (sim.alive[0] === 0 || sim.alive[1] === 0)) sim.endT = sim.t;
        if (sim.endT && sim.t - sim.endT > 2.5) { sim.round++; reset(); }
    }

    sim.reset = reset;
    sim.step = step;
    return reset();
}

// Walk/gallop bob, shared so every renderer animates identically (same formula as
// battle.js drawUnit: the stride follows real speed for riders).
export function gait(u, timeMs) {
    let moving = Math.abs(u.vx) > 4 || Math.abs(u.vy) > 4;
    if (!moving || !u.alive) return { hop: 0, sway: 0 };
    let mounted = u.type === 'cavalry';
    let stride = mounted ? Math.max(85, 6000 / Math.max(25, Math.sqrt(u.vx * u.vx + u.vy * u.vy))) : 150;
    let s = Math.sin(timeMs / stride + u.phase);
    return { hop: Math.abs(s) * (mounted ? 7 : 4), sway: s * (mounted ? 0.24 : 0.15) };
}

export const lerp = (a, b, t) => a + (b - a) * t;

// The benchmark's camera path: a slow pan + zoom breathing over the arena, so every POC
// measures the same pictures in the same order. The view never leaves the arena.
export function benchCamera(t, sim, viewW, viewH) {
    const fit = Math.max(viewW / sim.W, viewH / sim.H);   // smallest zoom that fills the view
    const zoom = fit * (1.4 + Math.sin(t * 0.5) * 0.4);
    const hw = viewW / zoom / 2, hh = viewH / zoom / 2;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    return {
        x: clamp(sim.W / 2 + Math.sin(t * 0.35) * sim.W * 0.3, hw, sim.W - hw),
        y: clamp(sim.H / 2 + Math.sin(t * 0.23) * sim.H * 0.2, hh, sim.H - hh),
        zoom,
    };
}

// Frame-interval statistics. `add(ms)` per displayed frame; `report()` summarises.
// Jank = a frame that took longer than 1.5x the median interval (a visible hitch).
export function createStats() {
    const s = { intervals: [], work: [] };
    s.add = (ms, workMs) => { s.intervals.push(ms); if (workMs !== undefined) s.work.push(workMs); };
    s.report = () => {
        const q = (arr, p) => { if (!arr.length) return 0; let a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
        let iv = s.intervals, total = iv.reduce((a, b) => a + b, 0), med = q(iv, 0.5);
        return {
            frames: iv.length,
            fps: total ? Math.round(iv.length / total * 1000 * 10) / 10 : 0,
            p50: Math.round(med * 100) / 100,
            p95: Math.round(q(iv, 0.95) * 100) / 100,
            p99: Math.round(q(iv, 0.99) * 100) / 100,
            jankPct: iv.length ? Math.round(iv.filter(x => x > med * 1.5).length / iv.length * 1000) / 10 : 0,
            workP50: Math.round(q(s.work, 0.5) * 100) / 100,
            workP95: Math.round(q(s.work, 0.95) * 100) / 100,
        };
    };
    return s;
}
