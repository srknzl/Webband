// WebBand Tur 1 — sprite engine for the PoCs.
// Composes the CraftPix Swordsman layers (body / head / sword) per frame, so armour,
// weapon and helmet can come from different tiers; recolours skin, hair and cloth by
// exact palette entries (shading survives); paints helmets procedurally on the head layer.
(function () {
  const F = 64;                       // frame cell, px
  const ANCHOR = { x: 32, y: 44 };    // feet inside the cell
  const ANIM = {
    Idle:   { n: 12, ms: 120, loop: true },
    Walk:   { n: 6,  ms: 110, loop: true },
    Run:    { n: 8,  ms: 80,  loop: true },
    attack: { n: 8,  ms: 70,  loop: false },
    Hurt:   { n: 5,  ms: 85,  loop: false },
    Death:  { n: 7,  ms: 120, loop: false },
  };
  const ROW = { down: 0, left: 1, right: 2, up: 3 };

  // ---- palette tables (read off the pack's own PNGs) ----
  const HAIR = ['#2b2023', '#3b2c33', '#4d3945', '#684f5a', '#876c7d'];
  const HAIR_LINE = '#211a1c';
  const SKIN = ['#795048', '#a46f59', '#be865f', '#e1b26e', '#f6ca74'];
  const EYES = ['#3f6ad4', '#374a8f', '#d2dde8'];
  const CLOTH = {
    1: ['#2d312b', '#3f433d', '#5e615a', '#6f736a', '#868b7c', '#a0a387'],
    2: ['#3c201e', '#4f2725', '#653631', '#784639', '#905941'],   // the leather vest, dyed
    3: ['#481916', '#5e1e1c', '#8a3b26', '#a24d29', '#4c2726'],
  };
  const FACTIONS = {
    swadia:  { name: 'Svadya',  h: 2,   s: 0.62, dl: 0.06, color: '#ff4d4d' },
    rhodok:  { name: 'Rodok',   h: 118, s: 0.42, dl: 0.04, color: '#33cc33' },
    vaegir:  { name: 'Veagir',  h: 210, s: 0.07, dl: 0.14, color: '#cccccc' },
    nord:    { name: 'Nord',    h: 213, s: 0.62, dl: 0.06, color: '#3399ff' },
    khergit: { name: 'Kergit',  h: 282, s: 0.45, dl: 0.06, color: '#cc66ff' },
    bandit:  { name: 'Haydut',  h: 28,  s: 0.28, dl: 0.00, color: '#a0703f' },
  };
  const HAIRS = [
    { name: 'Kestane (orijinal)' },
    { name: 'Siyah',  f: (h, s, l) => [20, 0.12, l * 0.7] },
    { name: 'Kahve',  f: (h, s, l) => [24, 0.4, l * 1.02] },
    { name: 'Kızıl',  f: (h, s, l) => [12, 0.55, l * 1.08 + 0.04] },
    { name: 'Sarı',   f: (h, s, l) => [40, 0.5, l * 1.2 + 0.12] },
    { name: 'Kır',    f: (h, s, l) => [220, 0.05, l * 1.15 + 0.14] },
  ];
  const SKINS = [
    { name: 'Buğday (orijinal)' },
    { name: 'Açık',  f: (h, s, l) => [h + 2, s * 0.8, Math.min(0.9, l + 0.06)] },
    { name: 'Esmer', f: (h, s, l) => [h - 4, s * 0.95, l - 0.12] },
    { name: 'Koyu',  f: (h, s, l) => [h - 6, s * 0.85, l - 0.24] },
  ];

  // ---- colour helpers ----
  const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  const key = (r, g, b) => (r << 16) | (g << 8) | b;
  const hkey = h => { const [r, g, b] = hex2rgb(h); return key(r, g, b); };
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
    if (!s) return [l * 255, l * 255, l * 255].map(Math.round);
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const t = x => { x = (x + 1) % 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 0.5 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; };
    return [t(h + 1 / 3), t(h), t(h - 1 / 3)].map(v => Math.round(v * 255));
  }
  const viaHsl = (hex, f) => { const [r, g, b] = hex2rgb(hex); return hsl2rgb(...f(...rgb2hsl(r, g, b))); };

  // ---- loading ----
  const imgs = {};
  function load(url) {
    return imgs[url] || (imgs[url] = new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load ' + url)); i.src = url;
    }));
  }
  const BASE = 'a/';
  const partUrl = (lvl, anim, part) => `${BASE}sw${lvl}/${anim}_${part}.png`;
  const hasParts = (lvl, anim) => !(lvl === 3 && anim === 'Hurt');   // lvl3 ships no Hurt parts

  async function preload(levels = [1, 2, 3]) {
    const jobs = [];
    for (const l of levels) for (const a in ANIM) {
      if (!hasParts(l, a)) continue;
      for (const p of ['body', 'head', 'sword', 'sword_back']) jobs.push(load(partUrl(l, a, p)));
      if (a === 'Hurt' || a === 'Death') jobs.push(load(partUrl(l, a, 'red')));
      if (a === 'attack') jobs.push(load(partUrl(l, a, 'swing')));
    }
    await Promise.all(jobs);
  }

  // ---- recolour + helmet baking (once per sheet+variant; cached canvases) ----
  const baked = {};
  function colourMap(v, clothLvl) {
    const m = new Map();
    if (v.skin) SKIN.forEach(h => m.set(hkey(h), viaHsl(h, SKINS[v.skin].f)));
    if (v.hair) HAIR.forEach(h => m.set(hkey(h), viaHsl(h, HAIRS[v.hair].f)));
    const fc = v.cloth && FACTIONS[v.cloth];
    if (fc && clothLvl) {
      const sat = clothLvl === 1 ? fc.s * 0.7 : fc.s;
      const dl = clothLvl === 1 ? fc.dl : fc.dl + 0.08;
      CLOTH[clothLvl].forEach(h => m.set(hkey(h), viaHsl(h, (hh, s, l) => [fc.h, sat, l + dl])));
    }
    return m;
  }
  function applyMap(d, m) {
    if (!m.size) return;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const c = m.get(key(d[i], d[i + 1], d[i + 2]));
      if (c) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; }
    }
  }
  function sheet(url, v, clothLvl, helm, anim) {
    const k = url + '|' + (v.skin | 0) + (v.hair | 0) + (v.cloth || '-') + (clothLvl || 0) + (helm || '');
    if (baked[k]) return baked[k];
    const img = imgs[url] && imgs[url].__img;
    if (!img) return null;
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const id = x.getImageData(0, 0, c.width, c.height);
    if (helm) paintHelmets(id, helm, anim);
    applyMap(id.data, colourMap(v, clothLvl));
    x.putImageData(id, 0, 0);
    return (baked[k] = c);
  }
  // Images resolve asynchronously; keep a sync handle on each for the draw path.
  const _load = load;
  load = function (url) { return _load(url).then(i => { imgs[url].__img = i; return i; }); };

  // ---- procedural helmets ----
  const HAIRSET = new Set([...HAIR, HAIR_LINE].map(hkey));
  const SKINSET = new Set([...SKIN, '#552d24', '#110b00'].map(hkey));
  const EYESET = new Set(EYES.map(hkey));
  const STEEL = ['#1d1a22', '#3d4552', '#5f6b7d', '#8795a8', '#b9c6d4', '#e4ecf2'];
  const LEATHER = ['#1f130d', '#4a2c1a', '#6e4527', '#8f5d33', '#b07a45', '#c99a62'];
  // ---- hand-drawn helmets ----
  // Each helmet is drawn once per facing, pixel by pixel, in the coordinates of that facing's
  // reference head (level-1 Idle, frame 0). Every other frame gets the same drawing, moved by
  // however far its head moved: the offset is found by matching the frame's head against the
  // reference (skin, eyes, hair, outline must line up). Nothing is re-derived per frame, so the
  // helmet cannot change shape between frames. A fallen head (Death) is matched against the
  // reference turned by ±45/±90/180°, and the helmet turns with it.
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

  // 64x64 grids: Uint8Array of classes, or of template symbols
  const PIV = { x: 31, y: 28 };
  function rotGrid(g, deg) {                    // nearest-neighbour rotation about the head pivot
    if (!deg) return g;
    const o = new Uint8Array(F * F), r = -deg * Math.PI / 180, c = Math.round(Math.cos(r) * 1e6) / 1e6, s = Math.round(Math.sin(r) * 1e6) / 1e6;
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
      const dx = x - PIV.x, dy = y - PIV.y;
      const sx = Math.round(PIV.x + dx * c - dy * s), sy = Math.round(PIV.y + dx * s + dy * c);
      if (sx >= 0 && sy >= 0 && sx < F && sy < F) o[y * F + x] = g[sy * F + sx];
    }
    return o;
  }
  const mirror = g => { const o = new Uint8Array(F * F); for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) o[y * F + x] = g[y * F + (F - 1 - x)]; return o; };
  const SYM = { '.': 0, O: 1, '1': 2, '2': 3, '3': 4, '4': 5, '5': 6, N: 7 };
  function tplGrids(t) {                        // symbols + the "above the brim" cut mask
    const g = new Uint8Array(F * F), cut = new Uint8Array(F * F);
    t.rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) g[(t.y + j) * F + t.x + i] = SYM[row[i]] || 0; });
    const w = Math.max(...t.rows.map(r => r.length));
    for (let y = 0; y <= t.brim; y++) for (let x = t.x - 3; x < t.x + w + 3; x++) if (x >= 0 && x < F) cut[y * F + x] = 1;
    return { g, cut };
  }
  let _refs = null;
  function refs() {                             // reference head class grids per facing
    if (_refs) return _refs;
    const img = imgs[partUrl(1, 'Idle', 'head')].__img;
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, img.height).data;
    const grab = row => { const g = new Uint8Array(F * F); for (let y = 0; y < F; y++) for (let xx = 0; xx < F; xx++) g[y * F + xx] = classOf(d, ((row * F + y) * img.width + xx) * 4); return g; };
    _refs = { down: grab(0), left: grab(1), up: grab(3) };
    _refs.right = mirror(_refs.left);
    return _refs;
  }
  const tplCache = {};
  function tplFor(type, dir, deg) {
    const k = type + dir + deg;
    if (tplCache[k]) return tplCache[k];
    const base = HELM_TPL[type][dir === 'right' ? 'left' : dir];
    let { g, cut } = tplGrids(base);
    let ref = refs()[dir];
    if (dir === 'right') { g = mirror(g); cut = mirror(cut); }
    const rr = rotGrid(ref, deg), pts = [];
    for (let i = 0; i < F * F; i++) if (rr[i]) pts.push(i % F, (i / F) | 0, rr[i]);
    return (tplCache[k] = { g: rotGrid(g, deg), cut: rotGrid(cut, deg), pts });
  }
  // how well a cell's head sits on a (turned) reference at offset dx,dy
  function score(cell, pts, dx, dy) {
    let s = 0;
    for (let p = 0; p < pts.length; p += 3) {
      const r = pts[p + 2], X = pts[p] + dx, Y = pts[p + 1] + dy;
      const c = X >= 0 && Y >= 0 && X < F && Y < F ? cell[Y * F + X] : 0;
      if (c === r) s += r === 1 ? 1 : 2;       // face features anchor harder than swaying hair
      else if (!c) s -= 1;
    }
    return s;
  }
  const DIRS = ['down', 'left', 'right', 'up'];
  const fits = {};                              // debug/inspection: chosen fit per cell
  function paintHelmets(id, type, anim) {
    const W = id.width, H = id.height, d = id.data;
    const RAMP = type === 'cap' ? LEATHER : STEEL;
    const COL = [null, RAMP[0], RAMP[1], RAMP[2], RAMP[3], RAMP[4], RAMP[5], '#0d0b10'].map(h => h && hex2rgb(h));
    const turning = anim === 'Death';
    for (let cy = 0; cy < H; cy += F) for (let cx = 0; cx < W; cx += F) {
      const row = (cy / F) | 0, dir = DIRS[row];
      const cell = new Uint8Array(F * F); let any = false;
      for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) { const v = classOf(d, ((cy + y) * W + cx + x) * 4); cell[y * F + x] = v; if (v) any = true; }
      if (!any) continue;
      let best = null;
      // a head seen from behind falls straight down (it never turns); the others may roll
      const degs = turning && dir !== 'up' ? [0, 45, -45, 90, -90, 180] : [0];
      for (const deg of degs) {
        const { pts } = tplFor(type, dir, deg), R = turning ? 12 : 7;
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
          const s = score(cell, pts, dx, dy) - (deg ? 4 : 0);   // prefer upright on a tie
          if (!best || s > best.s) best = { s, deg, dx, dy };
        }
      }
      fits[anim + ':' + row + ':' + (cx / F)] = best;
      const { g, cut } = tplFor(type, dir, best.deg);
      for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
        const X = x + best.dx, Y = y + best.dy;
        if (X < 0 || Y < 0 || X >= F || Y >= F) continue;
        const i = ((cy + Y) * W + cx + X) * 4, sym = g[y * F + x];
        if (sym) { const [r, gg, b] = COL[sym]; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255; }
        else if (cut[y * F + x]) { const c = classOf(d, i); if (c === 1 || c === 2) d[i + 3] = 0; }
      }
    }
  }

  // ---- drawing ----
  // u: { armor 1..3, weapon 1..3, helm ''|'cap'|'nasal'|'greathelm', skin, hair, cloth, anim, dir, t (ms into anim) }
  function frameOf(u) {
    const A = ANIM[u.anim];
    let f = Math.floor(u.t / A.ms);
    return A.loop ? f % A.n : Math.min(A.n - 1, f);
  }
  // How red the pack paints each Hurt/Death frame, read once off its red overlay layer.
  // The overlay itself is not drawn: its silhouette is the bare-headed one, so the tint is
  // re-applied over whatever the unit is actually wearing.
  const redCache = {};
  function redAt(lvl, anim, f, row) {
    const url = partUrl(lvl, anim, 'red'), img = imgs[url] && imgs[url].__img;
    if (!img) return 0;
    let t = redCache[url];
    if (!t) {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const dd = x.getImageData(0, 0, c.width, c.height).data, cols = img.width / F, rows = img.height / F;
      const n = new Float32Array(cols * rows); let mx = 1;
      for (let y = 0; y < img.height; y++) for (let xx = 0; xx < img.width; xx++) {
        const a = dd[(y * img.width + xx) * 4 + 3]; if (a) n[((y / F) | 0) * cols + ((xx / F) | 0)] += a / 255;
      }
      n.forEach(v => mx = Math.max(mx, v));
      t = redCache[url] = { cols, n: Array.from(n, v => v / mx) };
    }
    return t.n[row * t.cols + f] || 0;
  }
  // Level 3 ships no layered Hurt; it is built from its idle frame: knocked back, then flushed red.
  const HURT3 = [[1, 0], [2, 0], [2, 0.9], [1, 0.8], [0, 0.3]];
  const KNOCK = { right: [-1, 0], left: [1, 0], down: [0, -1], up: [0, 1] };
  function drawUnit(ctx, u, x, y, opts = {}) {
    const f = opts.frame != null ? opts.frame : frameOf(u), row = ROW[u.dir];
    let anim = u.anim, fr = f, ox = 0, oy = 0, red = 0;
    if (!hasParts(u.armor, anim)) {
      const [k, r] = HURT3[Math.min(f, HURT3.length - 1)];
      anim = 'Idle'; fr = 0; ox = KNOCK[u.dir][0] * k; oy = KNOCK[u.dir][1] * k; red = r;
    } else if (anim === 'Hurt' || anim === 'Death') red = redAt(u.armor, anim, f, row);
    if (opts.noRed) red = 0;
    const sx = fr * F, sy = row * F, dx = Math.round(x - ANCHOR.x + ox), dy = Math.round(y - ANCHOR.y + oy);
    const v = { skin: u.skin, hair: u.hair, cloth: u.cloth };
    const wl = hasParts(u.weapon, anim) ? u.weapon : 2;
    const layers = [
      sheet(partUrl(wl, anim, 'sword_back'), {}, 0, '', anim),
      sheet(partUrl(u.armor, anim, 'body'), v, u.armor, '', anim),
      sheet(partUrl(u.armor, anim, 'head'), v, 0, u.helm, anim),
      sheet(partUrl(wl, anim, 'sword'), {}, 0, '', anim),
    ];
    const swing = anim === 'attack' && !opts.noSwing ? sheet(partUrl(wl, anim, 'swing'), {}, 0, '', anim) : null;
    const flash = opts.flash || 0;
    if (flash > 0 || red > 0.02) {
      const s = scratch(); s.x.clearRect(0, 0, F, F);
      for (const L of layers) if (L) s.x.drawImage(L, sx, sy, F, F, 0, 0, F, F);
      s.x.globalCompositeOperation = 'source-atop';
      if (red > 0.02) { s.x.fillStyle = '#d42a3a'; s.x.globalAlpha = Math.min(0.85, red * 0.8); s.x.fillRect(0, 0, F, F); }
      if (flash > 0) { s.x.fillStyle = '#fff'; s.x.globalAlpha = flash; s.x.fillRect(0, 0, F, F); }
      s.x.globalCompositeOperation = 'source-over'; s.x.globalAlpha = 1;
      ctx.drawImage(s.c, dx, dy);
    } else for (const L of layers) if (L) ctx.drawImage(L, sx, sy, F, F, dx, dy, F, F);
    if (swing) ctx.drawImage(swing, sx, sy, F, F, dx, dy, F, F);
    return f;
  }
  let _scratch;
  function scratch() {
    if (!_scratch) { const c = document.createElement('canvas'); c.width = c.height = F; _scratch = { c, x: c.getContext('2d') }; }
    return _scratch;
  }

  window.SW = { F, ANCHOR, ANIM, ROW, FACTIONS, HAIRS, SKINS, preload, drawUnit, frameOf, load, sheet };
})();
