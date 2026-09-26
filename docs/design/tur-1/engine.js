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
  // Helmets are derived from the hair itself: the hair mask is "opened" (8-neighbour
  // erode, then dilate) so the 1–2 px spikes fall away and the skull-shaped mass stays;
  // that mass becomes the helmet. It never grows past the hair, fits every frame and
  // works on a fallen, sideways head as well as a standing one.
  function paintHelmets(id, type, anim) {
    const W = id.width, H = id.height, d = id.data;
    const lying = anim === 'Death';
    const ramp = type === 'cap' ? LEATHER : STEEL;
    const N = F * F;
    for (let cy = 0; cy < H; cy += F) for (let cx = 0; cx < W; cx += F) {
      const row = (cy / F) | 0, f = (cx / F) | 0;
      const hair = new Uint8Array(N), face = new Uint8Array(N);
      let any = false, eyeY = 99, sx0 = 99, sx1 = -1, sy1 = -1, sN = 0, sSum = 0;
      for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
        const i = ((cy + y) * W + cx + x) * 4;
        if (!d[i + 3]) continue;
        const k = key(d[i], d[i + 1], d[i + 2]);
        if (HAIRSET.has(k)) { hair[y * F + x] = 1; any = true; }
        else if (EYESET.has(k)) { face[y * F + x] = 1; eyeY = Math.min(eyeY, y); }
        else if (SKINSET.has(k)) { face[y * F + x] = 1; sx0 = Math.min(sx0, x); sx1 = Math.max(sx1, x); sy1 = Math.max(sy1, y); sN++; sSum += x; }
      }
      if (!any) continue;
      const at = (m, x, y) => x >= 0 && y >= 0 && x < F && y < F && m[y * F + x];
      const morph = (m, keepIf) => {
        const o = new Uint8Array(N);
        for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
          let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += at(m, x + dx, y + dy) ? 1 : 0;
          o[y * F + x] = keepIf(n, m[y * F + x]) ? 1 : 0;
        }
        return o;
      };
      const erode = m => morph(m, (n, v) => v && n === 9);
      const dilate = m => morph(m, n => n > 0);
      const opaque = new Uint8Array(N);
      for (let i = 0; i < N; i++) opaque[i] = d[((cy + ((i / F) | 0)) * W + cx + (i % F)) * 4 + 3] ? 1 : 0;
      const count = mm => mm.reduce((a, v) => a + v, 0);
      // radius 1 keeps an open helmet organic; the closed helm wants radius 2 so it reads as one block
      let m = type === 'greathelm' ? dilate(dilate(erode(erode(hair)))) : dilate(erode(hair));
      if (count(m) < 14) m = dilate(erode(hair));
      for (let i = 0; i < N; i++) m[i] &= hair[i];               // an opening never grows past the hair
      const rowFill = mm => {                                      // smooth, convex rows inside the head
        for (let y = 0; y < F; y++) {
          let a = -1, b = -1; for (let x = 0; x < F; x++) if (mm[y * F + x]) { if (a < 0) a = x; b = x; }
          for (let x = a + 1; x < b; x++) if (opaque[y * F + x]) mm[y * F + x] = 1;
        }
        return mm;
      };
      if (type === 'greathelm') m = rowFill(m);
      // An open helmet stops at the brow; the hair below it (sideburns, nape) stays hair,
      // which is what makes it read as a helmet and not as a grey haircut.
      let cut = 99;
      if (!lying && type !== 'greathelm') {
        let t0 = 99, t1 = -1; for (let i = 0; i < N; i++) if (m[i]) { const y = (i / F) | 0; t0 = Math.min(t0, y); t1 = Math.max(t1, y); }
        cut = eyeY < 99 && row !== ROW.up ? eyeY - 2 : t0 + Math.round((t1 - t0) * 0.68);
        for (let i = 0; i < N; i++) if (((i / F) | 0) > cut) m[i] = 0;
      }
      if (type === 'greathelm') {                                 // a closed helm swallows the face too
        for (let i = 0; i < N; i++) m[i] |= face[i];
        m = rowFill(m);
      }
      for (let i = 0; i < N; i++) {                               // fill pin-holes
        const x = i % F, y = (i / F) | 0;
        if (!m[i] && at(m, x - 1, y) && at(m, x + 1, y) && at(m, x, y - 1) && at(m, x, y + 1)) m[i] = 1;
      }
      // round the corners (only the crown's when standing, all of them on a fallen head):
      // a pixel with three or fewer of its eight neighbours is a convex corner
      {
        let t0 = 99, t1 = -1; for (let i = 0; i < N; i++) if (m[i]) { const y = (i / F) | 0; t0 = Math.min(t0, y); t1 = Math.max(t1, y); }
        const lim = lying ? 99 : t0 + (t1 - t0) * 0.5;
        for (let pass = 0; pass < (type === 'greathelm' ? 1 : 2); pass++) {
          const drop = [];
          for (let i = 0; i < N; i++) if (m[i]) {
            const x = i % F, y = (i / F) | 0; if (y > lim) continue;
            let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(m, x + dx, y + dy)) n++;
            if (n <= 3) drop.push(i);
          }
          drop.forEach(i => m[i] = 0);
        }
      }
      let bx0 = 99, bx1 = -1, by0 = 99, by1 = -1;
      for (let i = 0; i < N; i++) if (m[i]) { const x = i % F, y = (i / F) | 0; bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
      const put = (x, y, hex) => {
        if (x < 0 || y < 0 || x >= F || y >= F) return;
        const i = ((cy + y) * W + cx + x) * 4, [r, g, b] = hex2rgb(hex);
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      };
      // spikes that did not make it into the helmet go
      for (let i = 0; i < N; i++) if (hair[i] && !m[i] && ((i / F) | 0) <= cut) d[((cy + ((i / F) | 0)) * W + cx + (i % F)) * 4 + 3] = 0;
      if (bx1 < 0) continue;
      const bw = Math.max(1, bx1 - bx0), bh = Math.max(1, by1 - by0);
      const edge = (x, y) => !at(m, x - 1, y) || !at(m, x + 1, y) || !at(m, x, y - 1) || !at(m, x, y + 1);
      for (let i = 0; i < N; i++) if (m[i]) {
        const x = i % F, y = (i / F) | 0;
        if (edge(x, y)) { put(x, y, ramp[0]); continue; }
        const u = (x - bx0) / bw, v = (y - by0) / bh;
        let t = 3;
        if (u + v < 0.62) t = 4;
        if (u > 0.74 || v > 0.8) t = 2;
        put(x, y, ramp[t]);
      }
      // specular glint on the crown, upper left
      for (let y = by0 + 1; y <= by1; y++) { const x = Math.round(bx0 + bw * 0.32); if (at(m, x, y) && !edge(x, y)) { put(x, y, ramp[5]); break; } }
      const standing = !lying, faceOn = standing && row !== ROW.up && sN > 0;
      const side = row === ROW.left || row === ROW.right, facing = row === ROW.right ? 1 : row === ROW.left ? -1 : 0;
      if (standing && type !== 'greathelm') {                    // rim: the lowest inner pixel of each column
        for (let x = bx0 + 1; x < bx1; x++) { let yb = -1; for (let y = by1; y >= by0; y--) if (at(m, x, y)) { yb = y; break; } if (yb > 0 && at(m, x, yb - 1) && !edge(x, yb - 1)) put(x, yb - 1, ramp[type === 'cap' ? 1 : 2]); }
      }
      if (type === 'nasal' && faceOn) {
        const nx = side ? (facing > 0 ? sx1 - 1 : sx0 + 1) : Math.round(sSum / sN - 0.5);
        let yb = -1; for (let y = by1; y >= by0; y--) if (at(m, nx, y)) { yb = y; break; }
        if (yb > 0) { put(nx, yb + 1, ramp[3]); put(nx, yb + 2, ramp[3]); put(nx, yb + 3, ramp[1]); }
        if (!side) for (let y = by0 + 1; y < by1 - 1; y++) if (at(m, nx, y) && !edge(nx, y)) put(nx, y, ramp[4]);
      }
      if (type === 'cap' && standing) { const mx = Math.round((bx0 + bx1) / 2); for (let y = by0 + 1; y < by1 - 1; y += 2) if (at(m, mx, y) && !edge(mx, y)) put(mx, y, ramp[2]); }
      if (type === 'greathelm' && faceOn && eyeY < 99) {
        let a = 99, b = -1; for (let x = 0; x < F; x++) if (at(m, x, eyeY) && !edge(x, eyeY)) { a = Math.min(a, x); b = Math.max(b, x); }
        if (side) { if (facing > 0) a = Math.max(a, Math.round((bx0 + bx1) / 2)); else b = Math.min(b, Math.round((bx0 + bx1) / 2)); }
        else { a += 1; b -= 1; }
        for (let x = a; x <= b; x++) put(x, eyeY, '#0d0b10');
        for (let x = a + 1; x < b; x += 2) if (at(m, x, eyeY + 2) && !edge(x, eyeY + 2)) put(x, eyeY + 2, ramp[1]);
        if (!side) { const mx = Math.round((a + b) / 2); for (let y = eyeY + 1; y < by1; y++) if (at(m, mx, y) && !edge(mx, y)) put(mx, y, ramp[4]); }
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
