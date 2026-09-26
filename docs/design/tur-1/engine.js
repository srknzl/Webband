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
      if (!hasParts(l, a)) { jobs.push(load(`${BASE}sw3/Hurt_full.png`)); continue; }
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
  function paintHelmets(id, type, anim) {
    const W = id.width, H = id.height, d = id.data;
    const lying = anim === 'Death';
    for (let cy = 0; cy < H; cy += F) for (let cx = 0; cx < W; cx += F) {
      const row = (cy / F) | 0;
      let hx0 = 99, hx1 = -1, hy0 = 99, hy1 = -1, sx0 = 99, sx1 = -1, sy0 = 99, sy1 = -1, ey = 99;
      for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
        const i = ((cy + y) * W + cx + x) * 4;
        if (!d[i + 3]) continue;
        const k = key(d[i], d[i + 1], d[i + 2]);
        if (HAIRSET.has(k)) { hx0 = Math.min(hx0, x); hx1 = Math.max(hx1, x); hy0 = Math.min(hy0, y); hy1 = Math.max(hy1, y); }
        else if (SKINSET.has(k)) { sx0 = Math.min(sx0, x); sx1 = Math.max(sx1, x); sy0 = Math.min(sy0, y); sy1 = Math.max(sy1, y); }
        else if (EYESET.has(k)) ey = Math.min(ey, y);
      }
      if (hx1 < 0) continue;
      const put = (x, y, hex) => {
        if (x < 0 || y < 0 || x >= F || y >= F) return;
        const i = ((cy + y) * W + cx + x) * 4, [r, g, b] = hex2rgb(hex);
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      };
      if (lying) {   // a fallen head is sideways: tint the hair into the helmet instead of a dome
        const ramp = type === 'cap' ? LEATHER : STEEL;
        for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
          const i = ((cy + y) * W + cx + x) * 4;
          if (!d[i + 3]) continue;
          const k = key(d[i], d[i + 1], d[i + 2]);
          const hi = HAIR.findIndex(h => hkey(h) === k);
          if (hi >= 0) put(x, y, ramp[Math.min(5, hi + 1)]);
        }
        continue;
      }
      const face = sx1 >= 0 && row !== ROW.up;
      const side = row === ROW.left || row === ROW.right;
      const facing = row === ROW.right ? 1 : row === ROW.left ? -1 : 0;
      let top = hy0 + 2, bottom, x0, x1;
      if (face) {
        bottom = ey < 99 ? ey - 2 : sy0 + 1;
        if (side) { x0 = hx0 + 1; x1 = hx1 - 1; if (facing > 0) x1 = Math.min(x1, sx1 + 1); else x0 = Math.max(x0, sx0 - 1); }
        else { x0 = sx0 - 1; x1 = sx1 + 1; }
      } else { bottom = hy1 - 3; x0 = hx0 + 1; x1 = hx1 - 1; }
      if (type === 'greathelm' && face) { bottom = Math.max(bottom, sy1 - 2); top += 1; if (!side) { x0 += 1; x1 -= 1; } }
      if (type === 'greathelm' && !face) top += 1;
      if (type === 'cap') { top += 1; x0 += 1; x1 -= 1; }
      // lift the hair that the helmet covers
      const cut = type === 'greathelm' ? bottom : bottom;
      for (let y = 0; y <= cut; y++) for (let x = 0; x < F; x++) {
        const i = ((cy + y) * W + cx + x) * 4;
        if (d[i + 3] && HAIRSET.has(key(d[i], d[i + 1], d[i + 2]))) d[i + 3] = 0;
      }
      const ramp = type === 'cap' ? LEATHER : STEEL;
      const mid = (x0 + x1) / 2, hw = (x1 - x0) / 2 + 0.5, hgt = Math.max(3, bottom - top);
      const shape = [];
      for (let y = top; y <= bottom; y++) {
        const t = (y - top) / hgt;                                   // 0 at crown
        const w = type === 'greathelm' ? hw * (t < 0.2 ? 0.8 + t : 1) : hw * Math.sqrt(Math.min(1, 0.25 + t * 1.6));
        const a = Math.round(mid - w), b = Math.round(mid + w - 1);
        shape.push([y, a, b]);
      }
      for (const [y, a, b] of shape) for (let x = a; x <= b; x++) {
        const u = (x - a) / Math.max(1, b - a);                      // 0 = left edge
        const v = (y - top) / hgt;
        let tone = 3 + (u < 0.35 ? 1 : 0) - (u > 0.75 ? 1 : 0) - (v > 0.8 ? 1 : 0);
        if (facing > 0) tone = 3 + (u < 0.3 ? -1 : 0) + (u > 0.55 && u < 0.8 ? 1 : 0) - (v > 0.8 ? 1 : 0);
        if (facing < 0) tone = 3 + (u > 0.7 ? -1 : 0) + (u > 0.2 && u < 0.45 ? 1 : 0) - (v > 0.8 ? 1 : 0);
        put(x, y, ramp[Math.max(1, Math.min(5, tone))]);
      }
      // specular pixel on the crown
      if (shape.length > 2) { const [y, a, b] = shape[1]; put(Math.round(a + (b - a) * (facing > 0 ? 0.65 : 0.3)), y, ramp[5]); }
      // brim / rim band
      if (type !== 'greathelm') { const [y, a, b] = shape[shape.length - 1]; for (let x = a; x <= b; x++) put(x, y, ramp[2]); }
      if (type === 'nasal' && face) {
        const nx = side ? (facing > 0 ? x1 - 1 : x0 + 1) : Math.round(mid - 0.5);
        for (let y = bottom + 1; y <= bottom + 3; y++) put(nx, y, ramp[y === bottom + 3 ? 1 : 3]);
        // a riveted ridge down the crown tells the nasal helm from a plain kettle dome
        if (!side) for (const [y] of shape.slice(1, -1)) put(Math.round(mid - 0.5), y, ramp[4]);
      }
      if (type === 'greathelm' && face && ey < 99) {
        const [, a, b] = shape.find(s => s[0] === ey) || shape[shape.length - 2];
        const sa = side ? (facing > 0 ? Math.round(mid) : a + 1) : a + 2, sb = side ? (facing > 0 ? b - 1 : Math.round(mid)) : b - 2;
        for (let x = sa; x <= sb; x++) put(x, ey, '#0d0b10');
        for (let x = sa + 1; x <= sb - 1; x += 2) put(x, ey + 2, '#2a2f3a');
        if (!side) for (let y = ey + 1; y <= bottom; y++) put(Math.round(mid - 0.5), y, ramp[4]);
      }
      // outline the helmet where it meets empty space
      const outline = [];
      for (const [y, a, b] of shape) for (let x = a - 1; x <= b + 1; x++) for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0]]) {
        const X = x + dx, Y = y + dy;
        if (x < a || x > b) continue;
        if (X < 0 || Y < 0 || X >= F || Y >= F) continue;
        const i = ((cy + Y) * W + cx + X) * 4;
        if (!d[i + 3]) outline.push([X, Y]);
      }
      outline.forEach(([x, y]) => put(x, y, ramp[0]));
    }
  }

  // ---- drawing ----
  // u: { armor 1..3, weapon 1..3, helm ''|'cap'|'nasal'|'greathelm', skin, hair, cloth, anim, dir, t (ms into anim) }
  function frameOf(u) {
    const A = ANIM[u.anim];
    let f = Math.floor(u.t / A.ms);
    return A.loop ? f % A.n : Math.min(A.n - 1, f);
  }
  function drawUnit(ctx, u, x, y, opts = {}) {
    const A = ANIM[u.anim], f = opts.frame != null ? opts.frame : frameOf(u), row = ROW[u.dir];
    const sx = f * F, sy = row * F, dx = Math.round(x - ANCHOR.x), dy = Math.round(y - ANCHOR.y);
    const v = { skin: u.skin, hair: u.hair, cloth: u.cloth };
    const layers = [];
    if (!hasParts(u.armor, u.anim)) {
      layers.push(sheet(`${BASE}sw3/Hurt_full.png`, v, 3, '', u.anim));
    } else {
      const wl = hasParts(u.weapon, u.anim) ? u.weapon : 2;
      layers.push(sheet(partUrl(wl, u.anim, 'sword_back'), {}, 0, '', u.anim));
      layers.push(sheet(partUrl(u.armor, u.anim, 'body'), v, u.armor, '', u.anim));
      layers.push(sheet(partUrl(u.armor, u.anim, 'head'), v, 0, u.helm, u.anim));
      layers.push(sheet(partUrl(wl, u.anim, 'sword'), {}, 0, '', u.anim));
      if ((u.anim === 'Hurt' || u.anim === 'Death') && !opts.noRed) layers.push(sheet(partUrl(u.armor, u.anim, 'red'), {}, 0, '', u.anim));
      if (u.anim === 'attack' && !opts.noSwing) layers.push(sheet(partUrl(wl, u.anim, 'swing'), {}, 0, '', u.anim));
    }
    if (opts.flash) {   // white hit flash, baked per call into a scratch cell
      const s = scratch(); s.x.clearRect(0, 0, F, F);
      for (const L of layers) if (L) s.x.drawImage(L, sx, sy, F, F, 0, 0, F, F);
      s.x.globalCompositeOperation = 'source-atop'; s.x.fillStyle = '#fff'; s.x.globalAlpha = opts.flash;
      s.x.fillRect(0, 0, F, F); s.x.globalCompositeOperation = 'source-over'; s.x.globalAlpha = 1;
      ctx.drawImage(s.c, dx, dy);
      return f;
    }
    for (const L of layers) if (L) ctx.drawImage(L, sx, sy, F, F, dx, dy, F, F);
    return f;
  }
  let _scratch;
  function scratch() {
    if (!_scratch) { const c = document.createElement('canvas'); c.width = c.height = F; _scratch = { c, x: c.getContext('2d') }; }
    return _scratch;
  }

  window.SW = { F, ANCHOR, ANIM, ROW, FACTIONS, HAIRS, SKINS, preload, drawUnit, frameOf, load, sheet };
})();
