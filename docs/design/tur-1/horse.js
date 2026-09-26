// WebBand Tur 1 — a pixel horse for the Swordsman riders. Neither pack ships a horse, so this
// one is built from a few shapes (barrel, chest, rump, neck, head, jointed legs) rasterised
// straight onto the pixel grid, then shaded by edge and outlined, in the pack's palette logic.
// A six-frame gallop comes from the leg joint angles; every frame is baked once and cached.
(function () {
  const W = 48, H = 36, GROUND = 33;
  const COATS = {
    bay:   { o: '#24160f', c: ['#4a2a18', '#6b3f22', '#8c5530', '#ad7143'], mane: '#261710', sock: '#d8c7a8' },
    grey:  { o: '#23232b', c: ['#5b5b67', '#83838f', '#a7a7b1', '#cbcbd3'], mane: '#3d3d47', sock: '#e9e9ee' },
    black: { o: '#121015', c: ['#262229', '#38323c', '#4b4450', '#655c6b'], mane: '#141117', sock: '#8d8490' },
  };
  // Legs follow one stride cycle each, offset in time: stance (hoof down, the straight leg sweeps
  // back under the body) then swing (the leg lifts, folds and reaches forward). A foreleg folds
  // at the knee with the hoof tucked back; a hind leg folds at the hock with the hoof tucked
  // forward under the belly — the two joints bend opposite ways, as on a real horse.
  // Angles are absolute, in degrees from vertical, + = toward the head.
  const ease = u => u * u * (3 - 2 * u);
  function legAt(p, fore) {
    const STANCE = 0.42;
    if (p < STANCE) {                                   // planted, sweeping back
      const th = 26 - 56 * (p / STANCE);
      return fore ? [th, th] : [th - 12, th + 8];
    }
    const u = (p - STANCE) / (1 - STANCE), th = -30 + 56 * ease(u), flex = Math.sin(Math.PI * u);
    return fore ? [th + flex * 22, th - flex * 78]       // knee forward, hoof tucked back
                : [th - 12 - flex * 14, th + 8 + flex * 70];   // hock back, hoof tucked forward
  }
  // rotary gallop footfalls: near hind, far hind, near fore, far fore, then a moment in the air
  const PHASE = { nh: 0, fh: 0.12, nf: 0.4, ff: 0.52 };
  const N_GALLOP = 8;
  const GALLOP = Array.from({ length: N_GALLOP }, (_, i) => {
    const t = i / N_GALLOP, f = {};
    for (const k in PHASE) f[k] = legAt((t + 1 - PHASE[k]) % 1, k[1] === 'f');
    f.bob = Math.round(-Math.sin(2 * Math.PI * (t - 0.15)));  // rises in the suspension
    f.tail = 1 + Math.round(Math.sin(2 * Math.PI * t));
    return f;
  });
  const STAND = { nf: [3, 3], ff: [-2, -2], nh: [-14, 6], fh: [-10, 9], bob: 0, tail: 1 };
  const cache = {};

  function bake(coatName, fi, cloth) {
    const key = coatName + fi + (cloth || '');
    if (cache[key]) return cache[key];
    const coat = COATS[coatName], P = fi < 0 ? STAND : GALLOP[fi], b = P.bob;
    const m = new Uint8Array(W * H);          // 1 body · 2 far leg · 3 mane/tail · 4 hoof · 6 cloth · 7 saddle · 8 eye · 9 sock
    const set = (x, y, v, over = true) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; if (over || !m[y * W + x]) m[y * W + x] = v; };
    const ell = (cx, cy, rx, ry, v) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) set(x, y, v); } };
    const line = (x0, y0, x1, y1, r, v) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1; for (let i = 0; i <= n; i++) { const t = i / n; ell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, v); } };
    const leg = (hx, hy, [a1, a2], v, sockOn) => {
      const r1 = a1 * Math.PI / 180, r2 = a2 * Math.PI / 180;
      const kx = hx + Math.sin(r1) * 6, ky = hy + Math.cos(r1) * 6;
      const fx = kx + Math.sin(r2) * 6, fy = ky + Math.cos(r2) * 6;
      line(hx, hy, kx, ky, 1.25, v); line(kx, ky, fx, fy, 0.75, v);
      if (sockOn) line(kx + (fx - kx) * 0.6, ky + (fy - ky) * 0.6, fx, fy, 0.7, 9);
      set(fx, fy, 4); set(fx + Math.sin(r2 + Math.PI / 2), fy + Math.cos(r2 + Math.PI / 2) * 0, 4);
    };
    // far legs first (they sit behind the body)
    leg(27, 21 + b, P.ff, 2); leg(14, 21 + b, P.fh, 2);
    // tail
    const tw = [[9, 15], [6, 18], [5, 22], [5, 25]].map(([x, y], i) => [x - (i ? P.tail * 0.6 * i : 0), y + b]);
    for (let i = 0; i < tw.length - 1; i++) line(tw[i][0], tw[i][1], tw[i + 1][0], tw[i + 1][1], 1, 3);
    // body
    ell(22, 18 + b, 9.5, 5, 1); ell(29, 17 + b, 5, 5, 1); ell(14, 17 + b, 5.5, 5, 1);
    line(29, 15 + b, 34, 8 + b, 2.4, 1);
    ell(37, 8 + b, 4, 2.4, 1); ell(40, 10 + b, 2, 1.8, 1);
    set(35, 3 + b, 1); set(35, 4 + b, 1); set(36, 4 + b, 1);
    // near legs
    leg(28, 21 + b, P.nf, 1, true); leg(15, 21 + b, P.nh, 1, false);
    // mane, forelock, eye
    line(28, 12 + b, 33, 5 + b, 0.8, 3); set(34, 5 + b, 3); set(35, 6 + b, 3);
    set(37, 7 + b, 8);
    // saddle cloth and saddle
    for (let y = 14; y <= 20; y++) for (let x = 17; x <= 25; x++) if (m[(y + b) * W + x] === 1) set(x, y + b, cloth ? 6 : 7);
    for (let x = 18; x <= 23; x++) { set(x, 12 + b, 7); set(x, 13 + b, 7); }
    set(17, 12 + b, 7); set(24, 11 + b, 7);

    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), id = x.createImageData(W, H), d = id.data;
    const rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
    const clothRamp = cloth ? [shade(cloth, -0.35), shade(cloth, -0.15), cloth, shade(cloth, 0.2)] : null;
    const put = (i, h) => { const [r, g, bb] = rgb(h); d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = bb; d[i * 4 + 3] = 255; };
    const at = (xx, yy) => xx < 0 || yy < 0 || xx >= W || yy >= H ? 0 : m[yy * W + xx];
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      const v = m[yy * W + xx], i = yy * W + xx; if (!v) continue;
      const up = at(xx, yy - 1), dn = at(xx, yy + 1), lf = at(xx - 1, yy);
      if (v === 1) put(i, coat.c[!up || up === 3 ? 3 : !dn ? 1 : lf === 0 ? 2 : 2]);
      else if (v === 2) put(i, coat.c[!up ? 1 : 0]);
      else if (v === 3) put(i, coat.mane);
      else if (v === 4) put(i, '#1a1412');
      else if (v === 6) put(i, clothRamp[!up || up === 7 ? 3 : !dn || dn === 2 ? 0 : (xx === 17 || xx === 25) ? 1 : 2]);
      else if (v === 7) put(i, !up ? '#9a6a3a' : '#6e4527');
      else if (v === 8) put(i, '#0e0b0a');
      else if (v === 9) put(i, coat.sock);
    }
    // outline everything that borders empty space
    const out = [];
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (!m[yy * W + xx] && (at(xx - 1, yy) || at(xx + 1, yy) || at(xx, yy - 1) || at(xx, yy + 1))) out.push(yy * W + xx);
    out.forEach(i => put(i, coat.o));
    x.putImageData(id, 0, 0);
    return (cache[key] = c);
  }
  function shade(hex, k) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16));
    const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  let _flip;
  function flipped(src) {
    if (!_flip) { _flip = document.createElement('canvas'); _flip.width = W; _flip.height = H; }
    const fx = _flip.getContext('2d'); fx.clearRect(0, 0, W, H); fx.save(); fx.translate(W, 0); fx.scale(-1, 1); fx.drawImage(src, 0, 0); fx.restore();
    return _flip;
  }
  let _rider;
  // Draws horse + rider with the hooves' centre on (x, y). rider: SW unit (drawn from the waist up).
  function drawHorse(ctx, h, x, y) {
    const fi = h.moving ? Math.floor(h.t / 70) % GALLOP.length : -1;
    const src = bake(h.coat, fi, h.cloth), left = h.facing === 'left';
    const img = left ? flipped(src) : src, ox = Math.round(x - 24), oy = Math.round(y - GROUND);
    const bob = fi < 0 ? 0 : GALLOP[fi].bob;
    if (h.rider) {
      if (!_rider) { _rider = document.createElement('canvas'); _rider.width = _rider.height = 64; }
      const rx = _rider.getContext('2d'); rx.clearRect(0, 0, 64, 64);
      SW.drawUnit(rx, { ...h.rider, dir: left ? 'left' : 'right' }, 32, 44, { noRed: true, flash: h.flash || 0 });
      const sx = left ? 47 - 21 : 21;                // saddle x in the (possibly mirrored) horse
      ctx.drawImage(img, ox, oy);
      ctx.drawImage(_rider, 0, 0, 64, 37, ox + sx - 32, oy + 13 + bob - 37, 64, 37);
    } else ctx.drawImage(img, ox, oy);
    if (h.flash > 0.05) {                           // hit flash on the horse as well
      ctx.save(); ctx.globalAlpha = h.flash * 0.7; ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(img, ox, oy); ctx.restore();
    }
  }
  window.HORSE = { drawHorse, bake, COATS, W, H, GROUND };
})();
