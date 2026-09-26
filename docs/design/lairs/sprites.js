// Lifted from battle.js (SWORDSMAN_INDEX + the Swordsman composer), unchanged — the game's own soldiers.
const SWORDSMAN_INDEX = {"1":{"size":[1024,332],"parts":{"Death":{"head":[0,0,14,19,36,27],"body":[208,200,22,31,19,15],"sword_back":[0,264,17,35,31,10],"sword":[698,264,16,37,25,8]},"attack":{"head":[252,0,20,17,24,25],"sword":[444,0,11,25,42,25],"sword_back":[0,108,11,21,36,23],"body":[0,200,19,30,26,16]},"Run":{"head":[780,0,23,17,18,24],"body":[518,108,23,27,17,17],"sword":[656,200,19,33,18,11],"sword_back":[800,200,23,34,20,10]},"Walk":{"head":[288,108,22,17,20,21],"body":[341,200,25,30,14,14],"sword_back":[217,264,22,34,22,9],"sword":[204,304,20,37,21,7]},"Hurt":{"head":[408,108,20,19,22,19],"body":[581,200,24,31,15,13],"sword":[613,264,19,37,17,8],"sword_back":[330,304,21,36,23,7]},"Idle":{"head":[654,108,23,19,18,16],"body":[425,200,25,31,13,13],"sword_back":[349,264,22,36,22,8],"sword":[0,304,19,37,17,7]}},"red":{"Hurt":[0,0,0.48,0.97,0.53,0,0,0.49,0.95,0.52,0,0,0.49,0.95,0.5,0,0,0.52,1,0.49],"Death":[0,0,0,0.36,0.86,0.41,0,0,0,0,0.43,1,0.49,0,0,0,0,0.44,0.99,0.49,0,0,0,0,0.49,0.92,0.45,0]}},"2":{"size":[1024,344],"parts":{"attack":{"sword":[0,0,13,24,40,27],"sword_back":[572,0,11,20,35,24],"head":[0,108,20,17,24,24],"body":[0,204,19,30,26,16]},"Death":{"head":[320,0,14,19,36,27],"body":[208,204,22,31,19,15],"sword_back":[0,268,18,35,30,11],"sword":[794,268,15,37,26,9]},"Run":{"head":[192,108,23,17,18,20],"body":[566,108,22,27,18,17],"sword_back":[692,204,24,32,19,13],"sword":[844,204,19,33,18,13]},"Walk":{"head":[336,108,22,17,20,19],"body":[341,204,24,30,16,14],"sword_back":[462,268,22,35,22,9],"sword":[192,312,20,37,20,8]},"Hurt":{"head":[456,108,20,19,22,19],"body":[437,204,24,31,15,14],"sword_back":[594,268,21,35,23,9],"sword":[709,268,19,37,17,9]},"Idle":{"head":[710,108,23,19,18,16],"body":[512,204,24,31,15,13],"sword_back":[210,268,22,36,21,9],"sword":[0,312,20,37,16,8]}},"red":{"Hurt":[0,0,0.48,0.96,0.53,0,0,0.49,0.94,0.51,0,0,0.5,0.96,0.51,0,0,0.52,1,0.5],"Death":[0,0,0,0.39,0.93,0.45,0,0,0,0,0.43,1,0.49,0,0,0,0,0.43,0.97,0.48,0,0,0,0,0.52,0.99,0.49,0]}},"3":{"size":[1024,304],"parts":{"attack":{"sword":[0,0,13,24,40,27],"sword_back":[572,0,11,20,35,25],"head":[0,108,20,17,24,24],"body":[592,108,19,29,26,17]},"Death":{"head":[320,0,14,19,36,27],"body":[0,204,22,31,19,15],"sword":[468,264,15,36,26,10],"sword_back":[650,264,18,35,30,9]},"Run":{"head":[192,108,23,17,18,20],"body":[456,108,23,27,17,17],"sword_back":[229,204,23,32,20,14],"sword":[569,204,19,33,18,13]},"Walk":{"head":[336,108,22,17,20,19],"body":[133,204,24,30,16,14],"sword_back":[713,204,22,34,22,11],"sword":[845,204,20,35,21,11]},"Idle":{"head":[800,108,23,19,18,16],"body":[389,204,24,31,15,13],"sword_back":[0,264,22,36,22,10],"sword":[264,264,19,36,17,10]}},"red":{"Death":[0,0,0,0.4,0.94,0.45,0,0,0,0,0.43,1,0.49,0,0,0,0,0.43,0.97,0.48,0,0,0,0,0.5,0.96,0.47,0]}}};
const Swordsman = (() => {
    const F = 64, FOOT = { x: 32, y: 44 };
    const K = 1.25;                 // field units per sprite pixel: ~32 tall, the old tile's size
    const ANIM = {
        Idle:   { n: 12, ms: 120, loop: true },
        Walk:   { n: 6,  ms: 110, loop: true },
        Run:    { n: 8,  ms: 80,  loop: true },
        attack: { n: 8,  ms: 70,  loop: false },
        Hurt:   { n: 5,  ms: 85,  loop: false },
        Death:  { n: 7,  ms: 120, loop: false },
    };
    const ROW = { down: 0, left: 1, right: 2, up: 3 }, DIRS = ['down', 'left', 'right', 'up'];

    // ---- palettes, read off the pack's own PNGs ----
    const HAIR = ['#2b2023', '#3b2c33', '#4d3945', '#684f5a', '#876c7d'], HAIR_LINE = '#211a1c';
    const SKIN = ['#795048', '#a46f59', '#be865f', '#e1b26e', '#f6ca74'];
    const EYES = ['#3f6ad4', '#374a8f', '#d2dde8'];
    const CLOTH = {
        1: ['#2d312b', '#3f433d', '#5e615a', '#6f736a', '#868b7c', '#a0a387'],   // rags
        2: ['#3c201e', '#4f2725', '#653631', '#784639', '#905941'],              // leather vest, dyed
        3: ['#481916', '#5e1e1c', '#8a3b26', '#a24d29', '#4c2726'],              // cape
    };
    // kingdom id -> the hue its soldiers are dyed in (FACTIONS colours, toned for cloth)
    const DYE = {
        swadia:  { h: 2,   s: 0.62, dl: 0.06 },
        rhodok:  { h: 118, s: 0.42, dl: 0.04 },
        vaegir:  { h: 210, s: 0.07, dl: 0.14 },
        nord:    { h: 213, s: 0.62, dl: 0.06 },
        khergit: { h: 282, s: 0.45, dl: 0.06 },
        bandit:  { h: 28,  s: 0.28, dl: 0.00 },
        player:  { h: 42,  s: 0.62, dl: 0.08 },   // an unsworn warband: gold, a colour no kingdom wears
    };
    const HAIRS = [null,
        (h, s, l) => [20, 0.12, l * 0.7], (h, s, l) => [24, 0.4, l * 1.02], (h, s, l) => [12, 0.55, l * 1.08 + 0.04],
        (h, s, l) => [40, 0.5, l * 1.2 + 0.12], (h, s, l) => [220, 0.05, l * 1.15 + 0.14]];
    const SKINS = [null,
        (h, s, l) => [h + 2, s * 0.8, Math.min(0.9, l + 0.06)], (h, s, l) => [h - 4, s * 0.95, l - 0.12], (h, s, l) => [h - 6, s * 0.85, l - 0.24]];
    const STEEL = ['#1d1a22', '#3d4552', '#5f6b7d', '#8795a8', '#b9c6d4', '#e4ecf2'];
    const LEATHER = ['#1f130d', '#4a2c1a', '#6e4527', '#8f5d33', '#b07a45', '#c99a62'];

    const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
    const key = (r, g, b) => (r << 16) | (g << 8) | b;
    const hkey = h => { const [r, g, b] = hex2rgb(h); return key(r, g, b); };
    function rgb2hsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
        if(mx === mn) return [0, 0, l];
        const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return [h * 60, s, l];
    }
    function hsl2rgb(h, s, l) {
        h = ((h % 360) + 360) % 360 / 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
        if(!s) return [l * 255, l * 255, l * 255].map(Math.round);
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
        const t = x => { x = (x + 1) % 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 0.5 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; };
        return [t(h + 1 / 3), t(h), t(h - 1 / 3)].map(v => Math.round(v * 255));
    }
    const viaHsl = (hex, f) => { const [r, g, b] = hex2rgb(hex); return hsl2rgb(...f(...rgb2hsl(r, g, b))); };

    // ---- atlases ----
    let imgs = null;
    function load() {
        if(imgs || typeof Image === 'undefined' || !SWORDSMAN_INDEX) return;
        imgs = [1, 2, 3].map(l => { const i = new Image(); i.src = 'troops/swordsman_' + l + '.png'; return i; });
    }
    const ready = () => !!imgs && imgs.every(i => i.complete && i.naturalWidth > 0);
    const hasAnim = (lvl, anim) => !!(SWORDSMAN_INDEX[lvl].parts[anim] && SWORDSMAN_INDEX[lvl].parts[anim].body);
    function cell() { const c = document.createElement('canvas'); c.width = c.height = F; return c; }
    // one layer of one frame, drawn into a 64x64 cell at its place in the pack's grid
    function layer(x, lvl, anim, part, f, row) {
        const p = SWORDSMAN_INDEX[lvl].parts[anim] && SWORDSMAN_INDEX[lvl].parts[anim][part];
        if(!p) return;
        const [ax, ay, bx, by, bw, bh] = p;
        x.drawImage(imgs[lvl - 1], ax + f * bw, ay + row * bh, bw, bh, bx, by, bw, bh);
    }

    // ---- hand-drawn helmets ----
    // Each helmet is drawn once per facing, pixel by pixel, in the coordinates of that facing's
    // reference head (level-1 Idle frame 0; the side facings also carry the half-turned Idle
    // frame 6). Every other frame gets the same drawing, moved by however far its head moved,
    // found by matching the frame's head (skin, eyes, hair, outline) against the reference. A
    // fallen head (Death) is matched against the reference turned by ±45/±90/180°.
    //   O outline · 1–5 dark→light · N slit/hole · . empty
    const HELM_TPL = {
      nasal: {
        down: { x: 25, y: 21, brim: 28, rows: [
          '...OOOOOOO...',
          '.OO3445432OO.',
          'O33455543322O',
          'O34554433221O',
          'O34443333221O',
          'O33333332221O',
          'O22222222111O',
          'OOOOOO3OOOOOO',
          '......3......',
          '......2......',
          '......O......'] },
        left: { x: 25, y: 21, brim: 28, rows: [
          '....OOOOOOO...',
          '..OO3445432OO.',
          '.O34455433221O',
          'O344554332211O',
          'O344443332211O',
          'O333333322211O',
          'O222222221111O',
          'OOOOOOOO22111O',
          'O3......O2111O',
          'O3.......O111O',
          'OO........OOO.'] },
        // the side head half-turned to the camera (Idle frames 5–10): the nose guard sits mid-face
        left34: { x: 25, y: 21, brim: 28, rows: [
          '....OOOOOOO...',
          '..OO3445432OO.',
          '.O34455433221O',
          'O344554332211O',
          'O344443332211O',
          'O333333322211O',
          'O222222221111O',
          'OOOOO3OOO2111O',
          '.....3...O111O',
          '.....2....OOO.',
          '.....O........'] },
        up: { x: 25, y: 21, brim: 29, rows: [
          '...OOOOOOO...',
          '.OO3445432OO.',
          'O33455543322O',
          'O34554433221O',
          'O34443333221O',
          'O33333332221O',
          'O33333322211O',
          'O22222222111O',
          'OOOOOOOOOOOOO'] },
      },
      cap: {
        down: { x: 25, y: 22, brim: 28, rows: [
          '...OOOOOOO...',
          '.OO4452432OO.',
          'O34453233221O',
          'O34432332211O',
          'O33332322111O',
          'O11111111111O',
          'OOOOOOOOOOOOO'] },
        left: { x: 25, y: 22, brim: 28, rows: [
          '...OOOOOOOO...',
          '.OO44534332OO.',
          'O344532433211O',
          'O344432333211O',
          'O333322322111O',
          'O111111111111O',
          'OOOOOOOOOOOOOO'] },
        up: { x: 25, y: 22, brim: 29, rows: [
          '...OOOOOOO...',
          '.OO4453432OO.',
          'O34453233221O',
          'O34432332211O',
          'O33332322111O',
          'O33332322111O',
          'O11111111111O',
          'OOOOOOOOOOOOO'] },
      },
      greathelm: {
        down: { x: 25, y: 21, brim: 34, rows: [
          '.OOOOOOOOOOO.',
          'O34455443322O',
          'O34554433221O',
          'O34443333221O',
          'O33333333221O',
          'O33333333221O',
          'O22222422211O',
          'O33333433221O',
          'O33333433221O',
          'ONNNNNONNNNNO',
          'O33333433221O',
          'O33333433221O',
          'O2N2N242N2N1O',
          '.OOOOOOOOOOO.'] },
        left: { x: 25, y: 21, brim: 34, rows: [
          '.OOOOOOOOOOOO.',
          'O344554332211O',
          'O344554332211O',
          'O344443332211O',
          'O333333322211O',
          'O333333322211O',
          'O222222221111O',
          'O333333322211O',
          'O333333322211O',
          'ONNNNN3322211O',
          'O333333322211O',
          'O333333322211O',
          'ON3N3332211OO.',
          '.OOOOOOOOOOO..'] },
        up: { x: 25, y: 21, brim: 34, rows: [
          '.OOOOOOOOOOO.',
          'O34455443322O',
          'O34554433221O',
          'O34443333221O',
          'O33333333221O',
          'O33333333221O',
          'O33333332221O',
          'O33333322211O',
          'O33333322211O',
          'O22222222111O',
          'O33333322211O',
          'O33333322211O',
          'O22222222111O',
          '.OOOOOOOOOOO.'] },
      },
    };

    const CLS = new Map();
    HAIR.forEach(h => CLS.set(hkey(h), 1)); CLS.set(hkey(HAIR_LINE), 2);
    SKIN.forEach(h => CLS.set(hkey(h), 3)); CLS.set(hkey('#552d24'), 3);
    EYES.forEach(h => CLS.set(hkey(h), 4)); CLS.set(hkey('#110b00'), 5);
    const classOf = (d, i) => d[i + 3] ? (CLS.get(key(d[i], d[i + 1], d[i + 2])) || 6) : 0;
    const PIV = { x: 31, y: 28 };
    function rotGrid(g, deg) {
        if(!deg) return g;
        const o = new Uint8Array(F * F), r = -deg * Math.PI / 180, c = Math.round(Math.cos(r) * 1e6) / 1e6, s = Math.round(Math.sin(r) * 1e6) / 1e6;
        for(let y = 0; y < F; y++) for(let x = 0; x < F; x++) {
            const dx = x - PIV.x, dy = y - PIV.y;
            const sx = Math.round(PIV.x + dx * c - dy * s), sy = Math.round(PIV.y + dx * s + dy * c);
            if(sx >= 0 && sy >= 0 && sx < F && sy < F) o[y * F + x] = g[sy * F + sx];
        }
        return o;
    }
    const mirror = g => { const o = new Uint8Array(F * F); for(let y = 0; y < F; y++) for(let x = 0; x < F; x++) o[y * F + x] = g[y * F + (F - 1 - x)]; return o; };
    const SYM = { '.': 0, O: 1, '1': 2, '2': 3, '3': 4, '4': 5, '5': 6, N: 7 };
    function tplGrids(t) {
        const g = new Uint8Array(F * F), cut = new Uint8Array(F * F);
        t.rows.forEach((row, j) => { for(let i = 0; i < row.length; i++) g[(t.y + j) * F + t.x + i] = SYM[row[i]] || 0; });
        const w = Math.max(...t.rows.map(r => r.length));
        for(let y = 0; y <= t.brim; y++) for(let x = t.x - 3; x < t.x + w + 3; x++) if(x >= 0 && x < F) cut[y * F + x] = 1;
        return { g, cut };
    }
    let _refs = null;
    function refs() {
        if(_refs) return _refs;
        const grab = (row, f = 0) => {
            const c = cell(), x = c.getContext('2d'); layer(x, 1, 'Idle', 'head', f, row);
            const d = x.getImageData(0, 0, F, F).data, g = new Uint8Array(F * F);
            for(let i = 0; i < F * F; i++) g[i] = classOf(d, i * 4);
            return g;
        };
        _refs = { down: [grab(0)], left: [grab(1), grab(1, 6)], up: [grab(3)] };
        _refs.right = _refs.left.map(mirror);
        return _refs;
    }
    const tplCache = {};
    function tplFor(type, dir, deg, pose = 0, fallen = false) {
        const k = type + dir + deg + ':' + pose + (fallen ? 'f' : '');
        if(tplCache[k]) return tplCache[k];
        const side = dir === 'right' ? 'left' : dir, set = HELM_TPL[type];
        // a head fallen face-down, seen from behind, shows only its crown: every helmet reads as a dome
        const base = fallen && dir === 'up' ? HELM_TPL.nasal.up : (pose && set[side + '34']) || set[side];
        let { g, cut } = tplGrids(base);
        if(dir === 'right') { g = mirror(g); cut = mirror(cut); }
        const rr = rotGrid(refs()[dir][pose], deg), pts = [];
        for(let i = 0; i < F * F; i++) if(rr[i]) pts.push(i % F, (i / F) | 0, rr[i]);
        return (tplCache[k] = { g: rotGrid(g, deg), cut: rotGrid(cut, deg), pts });
    }
    function score(cellCls, pts, dx, dy) {
        let s = 0;
        for(let p = 0; p < pts.length; p += 3) {
            const r = pts[p + 2], X = pts[p] + dx, Y = pts[p + 1] + dy;
            const c = X >= 0 && Y >= 0 && X < F && Y < F ? cellCls[Y * F + X] : 0;
            if(c === r) s += r === 1 ? 1 : 2;
            else if(!c) s -= 1;
        }
        return s;
    }
    const fitCache = {};
    // paint `type` onto one head cell (ImageData of a 64x64 canvas holding only the head layer)
    function helmet(id, type, anim, row, f, lvl) {
        const d = id.data, dir = DIRS[row], turning = anim === 'Death';
        const cellCls = new Uint8Array(F * F); let any = false;
        for(let i = 0; i < F * F; i++) { cellCls[i] = classOf(d, i * 4); if(cellCls[i]) any = true; }
        if(!any) return;
        const fk = [lvl, anim, row, f, type].join(':');
        let best = fitCache[fk];
        if(!best) {
            const degs = turning && dir !== 'up' ? [0, 45, -45, 90, -90, 180] : [0], poses = refs()[dir].length;
            for(let pose = 0; pose < poses; pose++) for(const deg of degs) {
                if(pose && deg) continue;
                const { pts } = tplFor(type, dir, deg, pose), R = turning ? 12 : 7;
                for(let dy = -R; dy <= R; dy++) for(let dx = -R; dx <= R; dx++) {
                    const s = score(cellCls, pts, dx, dy) - (deg ? 4 : 0) - (pose ? 1 : 0);
                    if(!best || s > best.s) best = { s, deg, dx, dy, pose };
                }
            }
            fitCache[fk] = best;
        }
        const { g, cut } = tplFor(type, dir, best.deg, best.pose, turning && dir === 'up' && f >= 3);
        let clip = null;             // a fallen helmet covers only where the head still shows
        if(turning) {
            clip = new Uint8Array(F * F);
            for(let i = 0; i < F * F; i++) if(cellCls[i]) { const x0 = i % F, y0 = (i / F) | 0; for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++) { const X = x0 + dx, Y = y0 + dy; if(X >= 0 && Y >= 0 && X < F && Y < F) clip[Y * F + X] = 1; } }
        }
        const ramp = type === 'cap' ? LEATHER : STEEL;
        const COL = [null, ramp[0], ramp[1], ramp[2], ramp[3], ramp[4], ramp[5], '#0d0b10'].map(h => h && hex2rgb(h));
        for(let y = 0; y < F; y++) for(let x = 0; x < F; x++) {
            const X = x + best.dx, Y = y + best.dy;
            if(X < 0 || Y < 0 || X >= F || Y >= F) continue;
            const i = (Y * F + X) * 4, sym = clip && !clip[Y * F + X] ? 0 : g[y * F + x];
            if(sym) { const [r, gg, b] = COL[sym]; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255; }
            else if(cut[y * F + x]) { const c = classOf(d, i); if(c === 1 || c === 2) d[i + 3] = 0; }
        }
    }

    // ---- other weapons and plate (2.1, round 1's promise: the pack only has swords) ----
    // An axe, a mace or a spear is the sword layer made into a haft — its steel greys turned to
    // wood — with a head drawn at the far end, pointing the way the blade pointed. The grip is the
    // layer's pixel nearest the body, the tip the farthest, so it follows every swing.
    const WOOD = ['#4a3420', '#6b4e2e', '#8a6a40'], STEEL_H = ['#2a2d33', '#6e7680', '#9aa3ad', '#c9d0d6', '#eef2f4'];
    function weapon(x, lvl, anim, part, f, row, kind) {
        if(!kind) return layer(x, lvl, anim, part, f, row);
        const t = cell(), tx = t.getContext('2d');
        layer(tx, lvl, anim, part, f, row);
        const id = tx.getImageData(0, 0, F, F), d = id.data, BX = 32, BY = 33;
        let grip = null, tip = null, gd = 1e9, td = -1;
        for(let i = 0; i < F * F; i++) {
            const o = i * 4;
            if(!d[o + 3]) continue;
            const px = i % F, py = (i / F) | 0, dist = (px - BX) ** 2 + (py - BY) ** 2;
            if(dist < gd) { gd = dist; grip = [px, py]; }
            if(dist > td) { td = dist; tip = [px, py]; }
            const r = d[o], g = d[o + 1], b = d[o + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
            if(mx > 90 && b >= r - 8 && mx - mn < 90) {     // blade steel (grey to steel-blue) -> haft wood, by brightness
                const w = WOOD[mx > 190 ? 2 : mx > 140 ? 1 : 0]; d[o] = parseInt(w.slice(1, 3), 16); d[o + 1] = parseInt(w.slice(3, 5), 16); d[o + 2] = parseInt(w.slice(5, 7), 16);
            }
        }
        tx.putImageData(id, 0, 0);
        if(tip && grip && td > 16) {
            let dx = tip[0] - grip[0], dy = tip[1] - grip[1], L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
            const nx = -dy, ny = dx, P = (a, b, c) => { tx.fillStyle = c; tx.fillRect(Math.round(a), Math.round(b), 1, 1); };
            if(kind === 'axe') {                           // a bearded blade on one side of the haft
                const W = [3, 5, 6, 6, 4, 2];
                W.forEach((w, s) => {
                    const cx = tip[0] - dx * s, cy = tip[1] - dy * s;
                    for(let k = 1; k <= w; k++) P(cx + nx * k, cy + ny * k, k === w ? STEEL_H[4] : STEEL_H[s === 0 || s === W.length - 1 ? 1 : 2]);
                    P(cx + nx * (w + 1), cy + ny * (w + 1), STEEL_H[0]);
                });
                P(tip[0] + dx, tip[1] + dy, STEEL_H[0]);
            } else if(kind === 'mace' || kind === 'hammer' || kind === 'spiked') {
                const cx = tip[0] + dx, cy = tip[1] + dy;
                if(kind === 'hammer') {                    // a block across the haft
                    for(let k = -3; k <= 3; k++) for(let s = -1; s <= 1; s++) P(cx + nx * k + dx * s, cy + ny * k + dy * s, Math.abs(k) === 3 || s === 1 ? STEEL_H[0] : s === -1 ? STEEL_H[3] : STEEL_H[2]);
                } else {
                    for(let yy = -3; yy <= 3; yy++) for(let xx = -3; xx <= 3; xx++) {
                        const r2 = xx * xx + yy * yy;
                        if(r2 <= 9) P(cx + xx, cy + yy, r2 > 5 ? STEEL_H[0] : xx + yy < -1 ? STEEL_H[3] : STEEL_H[2]);
                    }
                    if(kind === 'spiked') for(const [a, b] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) P(cx + a, cy + b, STEEL_H[4]);
                }
            } else if(kind === 'spear') {                  // a leaf-shaped point past the tip
                for(let s = 1; s <= 5; s++) {
                    const w = s < 2 ? 1 : s < 4 ? 2 : 1, cx = tip[0] + dx * s, cy = tip[1] + dy * s;
                    for(let k = -w + 1; k < w; k++) P(cx + nx * k, cy + ny * k, k === 0 ? STEEL_H[4] : STEEL_H[2]);
                }
                P(tip[0] + dx * 6, tip[1] + dy * 6, STEEL_H[0]);
            }
        }
        x.drawImage(t, 0, 0);
    }
    // Plate: steel shoulder guards on the body layer's shoulders and a bright ridge down the chest
    // (the pack's chain shirt is the top armour level; plate is drawn over it)
    function plateArmour(bx, dir, anim) {
        const id = bx.getImageData(0, 0, F, F).data;
        let x0 = F, y0 = F, x1 = -1, y1 = -1;
        for(let i = 0; i < F * F; i++) if(id[i * 4 + 3]) { const px = i % F, py = (i / F) | 0; if(px < x0) x0 = px; if(px > x1) x1 = px; if(py < y0) y0 = py; if(py > y1) y1 = py; }
        if(x1 < 0 || anim === 'Death') return;
        const P = (a, b, w, h, c) => { bx.fillStyle = c; bx.fillRect(a, b, w, h); };
        const guard = gx => { P(gx - 1, y0 - 1, 5, 1, STEEL_H[0]); P(gx - 1, y0, 1, 3, STEEL_H[0]); P(gx + 3, y0, 1, 3, STEEL_H[0]); P(gx, y0, 3, 3, STEEL_H[2]); P(gx, y0, 3, 1, STEEL_H[4]); P(gx, y0 + 3, 3, 1, STEEL_H[0]); };
        const mid = (x0 + x1 + 1) >> 1;
        if(dir === 'down' || dir === 'up') {
            guard(x0 + 1); guard(x1 - 3);
            if(dir === 'down') { P(mid - 1, y0 + 4, 2, 5, STEEL_H[2]); P(mid - 1, y0 + 4, 1, 5, STEEL_H[3]); }
        } else {
            guard(dir === 'left' ? mid - 1 : mid - 2);
            P(dir === 'left' ? x0 + 2 : x1 - 3, y0 + 4, 1, 5, STEEL_H[3]);
        }
    }

    // ---- a woman's hair (2.1, round 1's "same body, long hair, a different face") ----
    // The pack only has a man's spiky crop, so for a woman the head layer is first trimmed to a
    // smooth dome (spikes outside an ellipse over the face go, the edge is re-outlined), then a
    // style is drawn by code: parts that hang behind the head before it, the rest after. Placed
    // by the head layer's own box, so it follows every frame's bob and turn; painted in the pack's
    // hair palette, so colourMap recolours it with the rest of the hair. Styles under review
    // (tur 5, 2.1.1): 'tail' ponytail, 'bun', 'braid', 'long' shoulder-length — the player picks one.
    const HAIR_SET = new Set([...HAIR, HAIR_LINE].map(hkey)), SKIN_SET = new Set(SKIN.map(hkey));
    function headBox(hx) {
        const d = hx.getImageData(0, 0, F, F).data;
        let x0 = F, y0 = F, x1 = -1, y1 = -1, s0 = F, s1 = -1, sy = F;
        for(let i = 0; i < F * F; i++) {
            if(!d[i * 4 + 3]) continue;
            const px = i % F, py = (i / F) | 0;
            if(px < x0) x0 = px; if(px > x1) x1 = px; if(py < y0) y0 = py; if(py > y1) y1 = py;
            if(SKIN_SET.has(key(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]))) { if(px < s0) s0 = px; if(px > s1) s1 = px; if(py < sy) sy = py; }
        }
        if(x1 < 0) return null;
        if(s1 < 0) {                                    // seen from behind: no face, so the skull's width comes from
            const mid = y0 + ((y1 - y0) >> 1);          // the lower half, which the spikes never reach
            s0 = F; s1 = -1;
            for(let i = mid * F; i < F * F; i++) if(d[i * 4 + 3]) { const px = i % F; if(px < s0) s0 = px; if(px > s1) s1 = px; }
            s0 += 2; s1 -= 2; sy = y0 + Math.round((y1 - y0) * 0.55);
        }
        return { x0, y0, x1, y1, s0, s1, sy };
    }
    function smoothDome(hx, hb) {
        const id = hx.getImageData(0, 0, F, F), d = id.data;
        const cx = (hb.s0 + hb.s1) / 2, rx = (hb.s1 - hb.s0) / 2 + 2.2, cy = hb.sy + 2, ry = Math.max(6, cy - hb.y0 - 1);
        const hair = i => d[i * 4 + 3] && HAIR_SET.has(key(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]));
        for(let i = 0; i < F * F; i++) {
            if(!hair(i)) continue;
            const px = i % F, py = (i / F) | 0, ex = (px + 0.5 - cx) / rx, ey = py < cy ? (py + 0.5 - cy) / ry : 0;
            if(ex * ex + ey * ey > 1) d[i * 4 + 3] = 0;
        }
        const [lr, lg, lb] = [1, 3, 5].map(k => parseInt(HAIR_LINE.slice(k, k + 2), 16));
        const edge = [];
        for(let i = 0; i < F * F; i++) {
            if(!hair(i)) continue;
            const px = i % F, py = (i / F) | 0;
            if([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const qx = px + dx, qy = py + dy; return qx < 0 || qy < 0 || qx >= F || qy >= F || !d[(qy * F + qx) * 4 + 3]; })) edge.push(i);
        }
        edge.forEach(i => { d[i * 4] = lr; d[i * 4 + 1] = lg; d[i * 4 + 2] = lb; });
        hx.putImageData(id, 0, 0);
    }
    function femHair(x, hb, dir, stage, style, sway) {
        const P = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
        const cx = (hb.s0 + hb.s1 + 1) >> 1, top = hb.y0, back = hb.y1;
        const ball = (bx, by, r) => {
            for(let yy = -r - 1; yy <= r + 1; yy++) for(let xx = -r - 1; xx <= r + 1; xx++) {
                const q = xx * xx + yy * yy;
                if(q <= r * r) P(bx + xx, by + yy, 1, 1, xx + yy < -1 ? HAIR[4] : HAIR[2]);
                else if(q <= (r + 1) * (r + 1)) P(bx + xx, by + yy, 1, 1, HAIR_LINE);
            }
        };
        // a hair shape painted on its own cell, then given one outline all round and laid on the frame
        const mass = paint => {
            const hc = cell(), h = hc.getContext('2d');
            paint(h);
            const id = h.getImageData(0, 0, F, F), d = id.data, [lr, lg, lb] = [1, 3, 5].map(k => parseInt(HAIR_LINE.slice(k, k + 2), 16)), line = [];
            for(let i = 0; i < F * F; i++) {
                if(d[i * 4 + 3]) continue;
                const px = i % F, py = (i / F) | 0;
                if([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const qx = px + a, qy = py + b; return qx >= 0 && qy >= 0 && qx < F && qy < F && d[(qy * F + qx) * 4 + 3]; })) line.push(i);
            }
            line.forEach(i => { d[i * 4] = lr; d[i * 4 + 1] = lg; d[i * 4 + 2] = lb; d[i * 4 + 3] = 255; });
            h.putImageData(id, 0, 0);
            x.drawImage(hc, 0, 0);
        };
        const side = dir === 'left' ? 1 : -1;            // the back of the head in profile
        const nape = side > 0 ? hb.x1 - 2 : hb.x0 + 2;
        // a ponytail: gathered at the tie, swelling a little, then narrowing to a point; in profile it
        // arcs out from the back of the head before it falls
        const tail = (sx, y, len, arc) => {
            for(let r = 0; r <= len; r++) {
                const f = r / len, ox = Math.round(sx + arc * Math.sin(Math.PI * Math.min(1, f * 1.25)) * 0.9 + sway * f);
                const w = r < 2 ? 2 : f < 0.7 ? 3 : f < 0.88 ? 2 : 1;
                P(ox - 1, y + r, w + 2, 1, HAIR_LINE); P(ox, y + r, w, 1, HAIR[2]);
                if(w > 1) P(ox + (arc < 0 ? w - 1 : 0), y + r, 1, 1, HAIR[4]);
            }
        };
        if(style === 'tail') {
            if(stage === 'back' && (dir === 'left' || dir === 'right')) tail(nape + side, hb.sy - 3, 11, side * 2.2);
            if(stage === 'front' && dir === 'up') tail(cx - 1, hb.sy - 2, 11, 0);
            if(stage === 'front' && dir !== 'down') P(dir === 'up' ? cx - 1 : nape + (side > 0 ? 0 : -1), hb.sy - 4, 2 + (dir === 'up'), 2, '#b3413a');   // the tie
        } else if(style === 'bun') {
            if(stage === 'back' && dir === 'down') ball(cx, top + 1, 3);
            if(stage === 'front' && dir === 'up') ball(cx, top + 4, 3);
            if(stage === 'front' && (dir === 'left' || dir === 'right')) ball(nape - side, top + 5, 3);
        } else if(style === 'long') {
            // shoulder-length (2.1.1 redo): the crown's own mass carried down to the shoulders.
            // Drawn behind the head in front and profile, so the face covers its inner edge and
            // only one outline — the outer silhouette — is ever seen; strand ends are uneven.
            if(stage === 'back' && dir === 'down') mass(h => {
                for(const sd of [-1, 1]) for(let k = 0; k < 5; k++) {
                    const col = sd < 0 ? hb.s0 - 3 + k : hb.s1 + 3 - k, t0 = [5, 3, 1, 0, 0][k];   // the top follows the head's curve
                    const end = hb.sy + 8 + (k % 2 ? RAG[(k + (sd > 0 ? 3 : 0)) % 6] : 0) - (k === 0 ? 1 : 0);
                    for(let y = hb.sy - 4 + t0; y < end; y++) {
                        const ox = col + (y > end - 4 ? sd : 0);
                        h.fillStyle = k === 0 ? HAIR[1] : k === 2 && y > hb.sy - 2 && y < hb.sy + 3 ? HAIR[3] : HAIR[2];
                        h.fillRect(ox, y, 1, 1);
                    }
                }
            });
            if(stage === 'back' && (dir === 'left' || dir === 'right')) mass(h => {
                for(let k = 0; k < 5; k++) {                // from inside the skull outward, rounding off at the back
                    const col = nape - side * 2 + side * k, t0 = [0, 0, 1, 2, 4][k], end = hb.sy + 8 - [0, 0, 1, 2, 3][k] + (k % 2 ? RAG[k] : 0);
                    for(let y = hb.y0 + 3 + t0; y < end; y++) {
                        const ox = col + (y > end - 5 ? Math.round(sway * (y - end + 5) / 5) : 0);
                        h.fillStyle = k >= 3 ? HAIR[1] : k === 1 && y < hb.sy + 2 ? HAIR[3] : HAIR[2];
                        h.fillRect(ox, y, 1, 1);
                    }
                }
            });
            if(stage === 'front' && dir === 'up') mass(h => {
                const half = (hb.s1 - hb.s0) / 2 + 1;       // the back of the head itself, carried down to the shoulders
                for(let col = hb.s0 - 1; col <= hb.s1 + 1; col++) {
                    const k = col - hb.s0 + 1, u = (col - cx) / half, t = hb.y0 + 2 + Math.round(u * u * 5);
                    const end = hb.sy + 8 + (k % 2 ? RAG[k % 6] : 0) - (Math.abs(u) > 0.9 ? 1 : 0);
                    for(let y = t; y < end; y++) {
                        const ox = col + (y > end - 3 ? (u < 0 ? -1 : u > 0 ? 1 : 0) : 0) + (y > hb.sy + 3 ? sway : 0);
                        h.fillStyle = Math.abs(u) > 0.85 ? HAIR[1] : (k % 4 === 1 && y > t + 1 && y < t + 6) ? HAIR[3] : HAIR[2];
                        h.fillRect(ox, y, 1, 1);
                    }
                }
            });
        } else if(style === 'braid') {
            // a braid (2.1.1 redo): interlocking lobes that start at the head, narrow toward the end,
            // a red tie and a little tuft below it
            const braid = (h, sx, y0, n, curve) => {
                for(let k = 0; k < n; k++) {
                    const bx = Math.round(sx + curve(k / n)), y = y0 + k * 2, w = k > n - 3 ? 2 : 3, flip = k % 2;
                    h.fillStyle = HAIR[2]; h.fillRect(bx - 1, y, w, 1);
                    h.fillStyle = HAIR[3]; h.fillRect(flip ? bx - 1 + w - 1 : bx - 1, y, 1, 1);
                    h.fillStyle = HAIR[1]; h.fillRect(bx - 1 + (flip ? 0 : 1), y + 1, w - 1, 1);
                }
                const ex = Math.round(sx + curve(1)), ey = y0 + n * 2;
                h.fillStyle = '#b3413a'; h.fillRect(ex - 1, ey, 2, 1);
                h.fillStyle = HAIR[2]; h.fillRect(ex - 1, ey + 1, 2, 1); h.fillRect(ex - 2, ey + 2, 4, 1);
            };
            if(stage === 'front' && dir === 'down') mass(h => braid(h, hb.s1 + 1, hb.sy + 1, 6, f => Math.min(1, f * 2.5)));   // over the right shoulder
            if(stage === 'back' && (dir === 'left' || dir === 'right')) mass(h => braid(h, nape + side, hb.sy - 2, 6, f => side * 1.5 * Math.sin(Math.PI * Math.min(1, f * 1.4)) + sway * f));
            if(stage === 'front' && dir === 'up') mass(h => braid(h, cx, hb.sy + 1, 5, f => sway * f));
        }
        if(stage === 'front' && dir === 'down') P(cx, hb.y1 - 2, 1, 1, '#c9706a');                    // a softer mouth
    }
    const FEM_SWAY = [0, 1, 0, -1], RAG = [0, 1, -1, 1, 0, -1];   // uneven strand ends, the same every frame
    let femStyle = 'tail';

    // ---- composed frames ----
    const mapCache = {};
    function colourMap(look) {
        const k = look.skin + ':' + look.hair + ':' + look.cloth + ':' + look.armor;
        if(mapCache[k]) return mapCache[k];
        const m = new Map();
        if(look.skin) SKIN.forEach(h => m.set(hkey(h), viaHsl(h, SKINS[look.skin])));
        if(look.hair) HAIR.forEach(h => m.set(hkey(h), viaHsl(h, HAIRS[look.hair])));
        const dye = DYE[look.cloth];
        if(dye) {
            const sat = look.armor === 1 ? dye.s * 0.7 : dye.s, dl = look.armor === 1 ? dye.dl : dye.dl + 0.08;
            CLOTH[look.armor].forEach(h => m.set(hkey(h), viaHsl(h, (hh, s, l) => [dye.h, sat, l + dl])));
        }
        return (mapCache[k] = m);
    }
    // level 3 ships no layered Hurt: built from its idle frame, knocked back, then flushed red
    const HURT3 = [[1, 0], [2, 0], [2, 0.9], [1, 0.8], [0, 0.3]];
    const KNOCK = { right: [-1, 0], left: [1, 0], down: [0, -1], up: [0, 1] };
    const frames = new Map(), CAP = 2500;
    function frameIndex(anim, t) {
        const A = ANIM[anim], f = Math.floor(Math.max(0, t) / A.ms);
        return A.loop ? f % A.n : Math.min(A.n - 1, f);
    }
    // look: { armor 1..3, weapon 1..3, helm ''|'cap'|'nasal'|'greathelm', skin 0..3, hair 0..5, cloth }
    function art(look, anim, dir, t) {
        if(!ready()) return null;
        // the pack's Idle row facing up has 4 frames, not 12: frames 4-11 are empty and a unit
        // standing still with its back to the camera vanished for 1 s in every 1.4
        const f = anim === 'Idle' && dir === 'up' ? frameIndex(anim, t) % 4 : frameIndex(anim, t), row = ROW[dir];
        const k = [look.armor, look.weapon, look.helm, look.skin, look.hair, look.cloth, look.fem ? 'f' + (look.hairStyle || femStyle) : '', look.wpn || '', look.plate ? 'p' : '', anim, row, f].join('|');
        let c = frames.get(k);
        if(c) { frames.delete(k); frames.set(k, c); return c; }   // keep recently used frames
        c = bake(look, anim, row, f, dir);
        frames.set(k, c);
        if(frames.size > CAP) frames.delete(frames.keys().next().value);
        return c;
    }
    function bake(look, anim, row, f, dir) {
        let a = anim, fr = f, ox = 0, oy = 0, red = 0;
        if(!hasAnim(look.armor, a)) {
            const [kk, r] = HURT3[Math.min(f, HURT3.length - 1)];
            a = 'Idle'; fr = 0; ox = KNOCK[dir][0] * kk; oy = KNOCK[dir][1] * kk; red = r;
        } else if(a === 'Hurt' || a === 'Death') {
            const t = SWORDSMAN_INDEX[look.armor].red[a];
            red = t ? t[row * ANIM[a].n + f] || 0 : 0;
        }
        const wl = hasAnim(look.weapon, a) ? look.weapon : 2;
        const head = cell(), hx = head.getContext('2d');
        layer(hx, look.armor, a, 'head', fr, row);
        const fem = look.fem && a !== 'Death', hb = fem ? headBox(hx) : null, style = look.hairStyle || femStyle;
        const sway = a === 'Walk' || a === 'Run' ? FEM_SWAY[fr % 4] : 0;
        if(hb) smoothDome(hx, hb);
        if(look.helm) { const id = hx.getImageData(0, 0, F, F); helmet(id, look.helm, a, row, fr, look.armor); hx.putImageData(id, 0, 0); }
        const comp = cell(), x = comp.getContext('2d');
        weapon(x, wl, a, 'sword_back', fr, row, look.wpn);
        if(look.plate) { const b = cell(), bx = b.getContext('2d'); layer(bx, look.armor, a, 'body', fr, row); plateArmour(bx, dir, a); x.drawImage(b, 0, 0); }
        else layer(x, look.armor, a, 'body', fr, row);
        if(hb) femHair(x, hb, dir, 'back', style, sway);
        x.drawImage(head, 0, 0);
        if(hb) femHair(x, hb, dir, 'front', style, sway);
        weapon(x, wl, a, 'sword', fr, row, look.wpn);
        const id = x.getImageData(0, 0, F, F), d = id.data, m = colourMap(look);
        let x0 = F, y0 = F, x1 = -1, y1 = -1;
        for(let i = 0; i < d.length; i += 4) {
            if(!d[i + 3]) continue;
            const c = m.get(key(d[i], d[i + 1], d[i + 2]));
            if(c) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; }
            const p = i >> 2, px = p % F, py = (p / F) | 0;
            if(px < x0) x0 = px; if(px > x1) x1 = px; if(py < y0) y0 = py; if(py > y1) y1 = py;
        }
        x.putImageData(id, 0, 0);
        if(red > 0.02) {
            x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#d42a3a'; x.globalAlpha = Math.min(0.65, red * 0.65);
            x.fillRect(0, 0, F, F); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
        }
        if(x1 < 0) { x0 = y0 = 0; x1 = y1 = 1; }
        const out = document.createElement('canvas');
        out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
        out.getContext('2d').drawImage(comp, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
        out._pixel = true; out._k = K; out._rankY = -36;
        out._ax = (FOOT.x - ox - x0) / out.width; out._ay = (FOOT.y - oy - y0) / out.height;
        return out;
    }
    // a cloth colour dyed with a side's hue — shared with the archer and the saddle cloth
    const dyeRgb = (hex, dye) => viaHsl(hex, (h, s, l) => [dye.h, dye.s, l + dye.dl]);
    const dyeHex = cloth => { const d = DYE[cloth]; if(!d) return null; const [r, g, b] = hsl2rgb(d.h, d.s * 0.9, 0.42 + d.dl); return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''); };
    return { ANIM, K, load, ready, art, frameIndex, DYE, dyeRgb, dyeHex };
})();
