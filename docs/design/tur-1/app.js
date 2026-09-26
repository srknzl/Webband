// WebBand Tur 1 — page logic: hero strip, workbench, mini battle, decisions form.
(function () {
  const $ = s => document.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const ctx2d = c => { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return x; };

  // ---- baked grass (once per size) ----
  function grass(w, h, seed = 7) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), r = rng(seed);
    x.fillStyle = '#4c7439'; x.fillRect(0, 0, w, h);
    const tones = ['#55803f', '#46693a', '#3f6034', '#5b8844'];
    for (let i = 0; i < w * h * 0.16; i++) { x.fillStyle = tones[(r() * 4) | 0]; x.fillRect((r() * w) | 0, (r() * h) | 0, 1, 1); }
    for (let i = 0; i < w * h * 0.004; i++) {       // tufts
      const px = (r() * w) | 0, py = (r() * h) | 0;
      x.fillStyle = '#3a5a30'; x.fillRect(px, py, 1, 2); x.fillRect(px + 2, py, 1, 2);
      x.fillStyle = '#62924a'; x.fillRect(px + 1, py - 1, 1, 3);
    }
    for (let i = 0; i < w * h * 0.0009; i++) {      // flowers
      x.fillStyle = r() < 0.5 ? '#e8d36a' : '#e9e4d6'; x.fillRect((r() * w) | 0, (r() * h) | 0, 1, 1);
    }
    return c;
  }
  // 3x5 pixel digits for damage numbers
  const DIG = { '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111', '-': '000000111000000' };
  function digits(x, str, px, py, col) {
    let ox = px - Math.floor(str.length * 4 / 2);
    for (const ch of str) {
      const m = DIG[ch]; if (!m) { ox += 4; continue; }
      x.fillStyle = '#1a0d0b';
      for (let i = 0; i < 15; i++) if (m[i] === '1') x.fillRect(ox + (i % 3) + 1, py + ((i / 3) | 0) + 1, 1, 1);
      x.fillStyle = col;
      for (let i = 0; i < 15; i++) if (m[i] === '1') x.fillRect(ox + (i % 3), py + ((i / 3) | 0), 1, 1);
      ox += 4;
    }
  }
  const shadow = (x, px, py, w = 9) => { x.fillStyle = 'rgba(20,30,15,.35)'; x.fillRect(px - w / 2 + 1, py, w - 2, 1); x.fillRect(px - w / 2, py + 1, w, 1); x.fillRect(px - w / 2 + 1, py + 2, w - 2, 1); };

  const HELM_OF = { '': 'Başı açık', cap: 'Deri başlık', nasal: 'Burunluklu miğfer', greathelm: 'Büyük miğfer' };
  const ARMOR_OF = { 1: 'Paçavra', 2: 'Deri zırh', 3: 'Zincir zırh' };
  const WEAPON_OF = { 1: 'Sopa', 2: 'Kılıç', 3: 'Çelik kılıç' };

  // ---- hero march ----
  function hero() {
    const c = $('#hero'), x = ctx2d(c), W = c.width, H = c.height, g = grass(W * 2, H, 11);
    const cast = [
      { armor: 1, weapon: 1, helm: '', hair: 0 },
      { armor: 2, weapon: 2, helm: 'cap', hair: 2 },
      { armor: 3, weapon: 2, helm: 'nasal', hair: 1 },
      { armor: 3, weapon: 3, helm: 'greathelm', hair: 4 },
    ];
    let t0 = performance.now();
    (function frame(now) {
      const t = reduced ? 0 : now - t0, off = (t * 0.022) % W;
      x.drawImage(g, -off, 0); x.drawImage(g, W - off, 0);
      cast.forEach((u, i) => {
        const px = W * (i + 0.5) / 4, py = H - 20;
        shadow(x, px, py - 1);
        SW.drawUnit(x, { ...u, skin: i % 3 === 2 ? 2 : 0, cloth: 'nord', anim: 'Walk', dir: 'right', t: t + i * 170 }, px, py);
      });
      if (!reduced) requestAnimationFrame(frame);
    })(t0);
  }

  // ---- small showcases ----
  function spinner(canvasSel, look, scaleY) {
    const c = $(canvasSel); if (!c) return;
    const x = ctx2d(c), dirs = ['down', 'right', 'up', 'left']; const t0 = performance.now();
    (function f(now) {
      const t = now - t0; x.clearRect(0, 0, c.width, c.height);
      const d = reduced ? 'down' : dirs[Math.floor(t / 1600) % 4];
      shadow(x, c.width / 2, scaleY - 1);
      SW.drawUnit(x, { ...look, anim: 'Idle', dir: d, t }, c.width / 2, scaleY);
      if (!reduced) requestAnimationFrame(f);
    })(t0);
  }
  function stillImage(canvasSel, url) {
    const c = $(canvasSel); if (!c) return; const x = ctx2d(c), i = new Image();
    i.onload = () => { x.fillStyle = '#45663b'; x.fillRect(0, 0, c.width, c.height); x.drawImage(i, Math.round((c.width - i.width) / 2), Math.round(c.height - i.height - 5)); };
    i.src = url;
  }
  function avatar(sel, look) {
    const c = $(sel); if (!c) return; const x = ctx2d(c);
    // head-and-shoulders crop of the idle frame
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = 64; const tx = ctx2d(tmp);
    SW.drawUnit(tx, { ...look, anim: 'Idle', dir: 'down', t: 0 }, 32, 44);
    x.drawImage(tmp, 20, 14, 24, 24, 0, 0, 24, 24);
  }

  // ---- workbench ----
  const bench = { armor: 1, weapon: 1, helm: '', cloth: 'nord', hair: 0, skin: 0, anim: 'Idle', dir: 'down', t0: performance.now() };
  const PRESETS = [
    { armor: 1, weapon: 1, helm: '' },
    { armor: 2, weapon: 2, helm: 'cap' },
    { armor: 3, weapon: 3, helm: 'nasal' },
    { armor: 3, weapon: 3, helm: 'greathelm' },
  ];
  function seg(sel, items, keyName, onPick) {
    const el = $(sel);
    el.innerHTML = items.map(([v, label, sw]) => `<button type="button" data-v="${v}" aria-pressed="false">${sw ? `<i class="sw" style="background:${sw}"></i>` : ''}${label}</button>`).join('');
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      let v = b.dataset.v; if (/^\d+$/.test(v)) v = +v;
      bench[keyName] = v; if (onPick) onPick(v); syncBench();
    });
  }
  function syncBench() {
    const map = { '#c-anim': 'anim', '#c-dir': 'dir', '#c-armor': 'armor', '#c-weapon': 'weapon', '#c-helm': 'helm', '#c-cloth': 'cloth', '#c-hair': 'hair', '#c-skin': 'skin' };
    for (const s in map) $(s).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(bench[map[s]]))));
    const title = bench.armor === 1 && bench.weapon === 1 && !bench.helm ? 'Köylü' : bench.helm === 'greathelm' ? 'Kıdemli' : bench.armor === 3 ? 'Er' : 'Milis';
    $('#stageNow').innerHTML = `<b>${title}</b> · ${ARMOR_OF[bench.armor]} · ${WEAPON_OF[bench.weapon]} · ${HELM_OF[bench.helm]}`;
    buildStrip();
  }
  let stripCells = [];
  function buildStrip() {
    const el = $('#strip'), A = SW.ANIM[bench.anim];
    el.innerHTML = ''; stripCells = [];
    for (let f = 0; f < A.n; f++) {
      const c = document.createElement('canvas'); c.width = c.height = 40; const x = ctx2d(c);
      SW.drawUnit(x, { ...bench, cloth: bench.cloth || null, t: 0 }, 20, 32, { frame: f });
      c.title = `Kare ${f + 1}/${A.n}`;
      el.appendChild(c); stripCells.push(c);
    }
  }
  function workbench() {
    seg('#c-anim', [['Idle', 'Bekleme'], ['Walk', 'Yürüme'], ['Run', 'Koşu'], ['attack', 'Saldırı'], ['Hurt', 'Hasar'], ['Death', 'Ölüm']], 'anim', () => bench.t0 = performance.now());
    seg('#c-dir', [['down', '↓ Ön'], ['left', '← Sol'], ['right', 'Sağ →'], ['up', '↑ Arka']], 'dir');
    seg('#c-armor', [[1, 'Yok <small>paçavra</small>'], [2, 'Deri zırh'], [3, 'Zincir / plaka']], 'armor');
    seg('#c-weapon', [[1, 'Sopa'], [2, 'Kılıç'], [3, 'Çelik kılıç']], 'weapon');
    seg('#c-helm', [['', 'Yok'], ['cap', 'Deri başlık'], ['nasal', 'Burunluklu'], ['greathelm', 'Büyük miğfer']], 'helm');
    seg('#c-cloth', [['', 'Orijinal']].concat(Object.entries(SW.FACTIONS).map(([k, f]) => [k, f.name, f.color])), 'cloth');
    seg('#c-hair', SW.HAIRS.map((h, i) => [i, h.name.replace(' (orijinal)', '')]), 'hair');
    seg('#c-skin', SW.SKINS.map((h, i) => [i, h.name.replace(' (orijinal)', '')]), 'skin');
    document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
      Object.assign(bench, PRESETS[+b.dataset.preset]); bench.anim = 'Walk'; bench.dir = 'down'; bench.t0 = performance.now(); syncBench();
    }));
    syncBench();
    const c = $('#stage'), x = ctx2d(c), g = grass(c.width, c.height, 3);
    let lastF = -1;
    (function f(now) {
      const u = { ...bench, cloth: bench.cloth || null, t: now - bench.t0 };
      const A = SW.ANIM[u.anim];
      // one-shot animations replay after a pause, so the loop stays readable
      if (!A.loop && u.t > A.n * A.ms + 900) { bench.t0 = now; u.t = 0; }
      x.drawImage(g, 0, 0);
      shadow(x, c.width / 2, 55, 11);
      const fr = SW.drawUnit(x, u, c.width / 2, 56);
      if (fr !== lastF) { stripCells.forEach((s, i) => s.classList.toggle('on', i === fr)); lastF = fr; }
      requestAnimationFrame(f);
    })(performance.now());
  }

  // ---- mini battle ----
  const ARC = { anchor: { x: 16, y: 27 }, n: { S_Idle: 4, S_Walk: 6, S_Attack: 4, S_Hurt: 2, S_Death: 8 }, ms: { S_Idle: 160, S_Walk: 110, S_Attack: 150, S_Hurt: 120, S_Death: 110 } };
  const arcImg = {}, bloodImg = new Image(), arrowImg = new Image();
  bloodImg.src = 'a/arc/S_Blood.png'; arrowImg.src = 'a/arc/Arrow.png';
  ['S_Idle', 'S_Walk', 'S_Attack', 'S_Hurt', 'S_Death'].forEach(k => { const i = new Image(); i.src = `a/arc/${k}.png`; arcImg[k] = i; });
  function arcFlipped(k) {   // mirrored copy, baked once
    const key = k + '_L'; if (arcImg[key]) return arcImg[key];
    const s = arcImg[k]; if (!s.complete || !s.naturalWidth) return null;
    const c = document.createElement('canvas'); c.width = s.width; c.height = s.height; const x = c.getContext('2d');
    const n = s.width / 32;
    for (let i = 0; i < n; i++) { x.save(); x.translate(i * 32 + 32, 0); x.scale(-1, 1); x.drawImage(s, i * 32, 0, 32, 32, 0, 0, 32, 32); x.restore(); }
    return (arcImg[key] = c);
  }
  function createBattle(cfg) {
    const B = { mode: cfg.mode || 'new', opt: cfg.opt, units: [], fx: [], nums: [], arrows: [], stop: 0, over: 0, t: 0 };
    function resetBattle() {
      const r = rng((Math.random() * 1e9) | 0);
      B.units = []; B.fx = []; B.nums = []; B.arrows = []; B.over = 0; B.stop = 0;
      const W = cfg.W, H = cfg.H, V = cfg.vertical;
      for (let team = 0; team < 2; team++) {
        for (let i = 0; i < 5; i++) {
          const lvl = 1 + ((r() * 3) | 0);
          const along = V ? 16 + i * ((W - 32) / 4) + r() * 4 : 52 + i * 19 + r() * 6;
          const depth = V ? (team ? cfg.top + r() * 22 : cfg.bottom - r() * 22) : (team ? W - 60 - r() * 30 : 60 + r() * 30);
          B.units.push({
            team, x: V ? along : depth, y: V ? depth : along, hp: 3, arc: false,
            look: { armor: lvl, weapon: Math.min(3, lvl + (r() < 0.3 ? 1 : 0)), helm: ['', 'cap', 'nasal', 'greathelm'][Math.min(3, (r() * (lvl + 1)) | 0)], hair: (r() * 6) | 0, skin: (r() * 4) | 0 },
            anim: 'Idle', t: r() * 500, dir: V ? (team ? 'down' : 'up') : (team ? 'left' : 'right'), cd: 0.4 + r() * 0.8, flash: 0, kx: 0, hitDone: false, dead: false, deadT: 0,
          });
        }
        B.units.push({ team, x: V ? (team ? W - 26 : 26) : (team ? W - 22 : 22), y: V ? (team ? cfg.top - 16 : cfg.bottom + 18) : 88, hp: 2, arc: true, anim: 'S_Idle', t: 0, dir: team ? 'left' : 'right', cd: 1 + r(), flash: 0, kx: 0, dead: false, deadT: 0 });
      }
    }
    const alive = u => !u.dead && (B.opt.archers || !u.arc);
    function nearestFoe(u) {
      let best = null, bd = 1e9;
      for (const o of B.units) if (o.team !== u.team && alive(o)) { const d = Math.hypot(o.x - u.x, (o.y - u.y) * 1.4); if (d < bd) { bd = d; best = o; } }
      return [best, bd];
    }
    function hit(tgt, dmg, fromX, fromY = tgt.y) {
      if (tgt.dead) return;
      tgt.hp -= dmg;
      tgt.flash = 1; { const kx = tgt.x - fromX, ky = (tgt.y - fromY) * 1.5, kl = Math.hypot(kx, ky) || 1; tgt.kx = kx / kl * 38; tgt.ky = ky / kl * 38; }
      if (B.opt.numbers) B.nums.push({ x: tgt.x, y: tgt.y - 30, t: 0, s: '-' + (dmg * 7 + ((Math.random() * 5) | 0)) });
      if (B.opt.blood) B.fx.push({ x: tgt.x, y: tgt.y - 10, t: 0, flip: tgt.x < fromX });
      if (B.opt.hitstop) B.stop = 0.07;
      if (tgt.hp <= 0) { tgt.dead = true; tgt.anim = tgt.arc ? 'S_Death' : 'Death'; tgt.t = 0; }
      else if (!tgt.arc) { if (tgt.anim !== 'attack') { tgt.anim = 'Hurt'; tgt.t = 0; } }
      else { tgt.anim = 'S_Hurt'; tgt.t = 0; }
    }
    function faceTo(u, o) {
      const dx = o.x - u.x, dy = o.y - u.y;
      if (u.arc) { u.dir = dx < 0 ? 'left' : 'right'; return; }
      u.dir = Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    }
    function stepBattle(dt) {
      if (B.stop > 0) { B.stop -= dt; return; }
      B.t += dt;
      for (const u of B.units) {
        u.t += dt * 1000;
        u.flash = Math.max(0, u.flash - dt * 7);
        if (u.kx || u.ky) { const k = Math.pow(0.0005, dt); u.x += (u.kx || 0) * dt; u.y += (u.ky || 0) * dt; u.kx *= k; u.ky = (u.ky || 0) * k; if (Math.hypot(u.kx, u.ky) < 1) u.kx = u.ky = 0; }
        if (u.dead) { u.deadT += dt; continue; }
        if (u.arc && !B.opt.archers) continue;
        const [foe, d] = nearestFoe(u);
        if (!foe) { u.anim = u.arc ? 'S_Idle' : 'Idle'; continue; }
        if (u.arc) {
          u.cd -= dt; faceTo(u, foe);
          if (u.anim === 'S_Attack') {
            if (u.t > ARC.n.S_Attack * ARC.ms.S_Attack) { u.anim = 'S_Idle'; u.t = 0; }
            else if (!u.shot && u.t > 2 * ARC.ms.S_Attack) {
              u.shot = true; const ang = Math.atan2(foe.y - 12 - (u.y - 14), foe.x - u.x);
              B.arrows.push({ x: u.x, y: u.y - 14, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, team: u.team, life: 3 });
            }
          } else if (u.anim === 'S_Hurt') { if (u.t > 240) { u.anim = 'S_Idle'; u.t = 0; } }
          else if (u.cd <= 0) { u.anim = 'S_Attack'; u.t = 0; u.shot = false; u.cd = 2 + Math.random(); }
          continue;
        }
        const A = SW.ANIM[u.anim];
        if (u.anim === 'attack') {
          if (!u.hitDone && u.t >= 4 * A.ms) { u.hitDone = true; if (u.tgt && !u.tgt.dead && Math.hypot(u.tgt.x - u.x, u.tgt.y - u.y) < 24) hit(u.tgt, 1, u.x, u.y); }
          if (u.t >= A.n * A.ms) { u.anim = 'Idle'; u.t = 0; }
          continue;
        }
        if (u.anim === 'Hurt') { if (u.t >= A.n * A.ms) { u.anim = 'Idle'; u.t = 0; } continue; }
        u.cd -= dt;
        if (d > 16) {
          const sp = 24, dx = foe.x - u.x, dy = (foe.y - u.y);
          let mx = dx / d * sp, my = dy / d * sp;
          for (const o of B.units) if (o !== u && !o.dead && Math.abs(o.x - u.x) < 10 && Math.abs(o.y - u.y) < 8) { my += (u.y - o.y >= 0 ? 1 : -1) * 14; mx += (u.x - o.x >= 0 ? 1 : -1) * 6; }
          u.x += mx * dt; u.x = Math.max(8, Math.min(cfg.W - 8, u.x)); u.y = Math.max(cfg.ymin, Math.min(cfg.ymax, u.y + my * dt));
          if (u.anim !== 'Walk') { u.anim = 'Walk'; u.t = 0; }
          faceTo(u, foe);
        } else {
          if (u.anim !== 'Idle') { u.anim = 'Idle'; u.t = 0; }
          faceTo(u, foe);
          if (u.cd <= 0) { u.anim = 'attack'; u.t = 0; u.hitDone = false; u.tgt = foe; u.cd = 0.9 + Math.random() * 0.7; }
        }
      }
      for (const a of B.arrows) {
        a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
        for (const o of B.units) if (o.team !== a.team && alive(o) && Math.abs(o.x - a.x) < 6 && a.y > o.y - 22 && a.y < o.y - 2) { hit(o, 1, a.x - a.vx, a.y - a.vy); a.life = 0; break; }
      }
      B.arrows = B.arrows.filter(a => a.life > 0 && a.x > -10 && a.x < cfg.W + 10 && a.y > -10 && a.y < cfg.H + 10);
      B.fx.forEach(f => f.t += dt); B.fx = B.fx.filter(f => f.t < 0.36);
      B.nums.forEach(n => n.t += dt); B.nums = B.nums.filter(n => n.t < 0.8);
      const teamsAlive = [0, 1].map(tm => B.units.some(u => u.team === tm && alive(u)));
      if (!teamsAlive[0] || !teamsAlive[1]) { B.over += dt; if (B.over > 2.6) resetBattle(); }
    }
    function drawBattle(x, g) {
      x.drawImage(g, 0, 0);
      const oldMode = B.mode === 'old';
      const order = B.units.filter(u => B.opt.archers || !u.arc).slice().sort((a, b) => (a.dead ? -1 : 0) - (b.dead ? -1 : 0) || a.y - b.y);
      for (const u of order) {
        const px = Math.round(u.x), py = Math.round(u.y);
        if (u.dead && !B.opt.blood && (oldMode || u.deadT > 0.9)) continue;
        if (oldMode && u.dead) {
          if (u.deadT > 0.5) continue;
          x.globalAlpha = 1 - u.deadT / 0.5;
        }
        if (B.opt.rings && !u.dead) { x.fillStyle = u.team ? 'rgba(255,77,77,.9)' : 'rgba(51,153,255,.9)'; for (let i = -5; i <= 5; i += 2) { x.fillRect(px + i, py + 2, 1, 1); } x.fillRect(px - 6, py + 1, 1, 1); x.fillRect(px + 6, py + 1, 1, 1); }
        if (!u.dead) shadow(x, px, py - 1);
        if (u.arc) {
          const face = u.dir, k = oldMode ? 'S_Idle' : u.anim;
          const img = face === 'left' ? arcFlipped(k) : arcImg[k];
          if (img && (img.naturalWidth || img.width)) {
            const n = ARC.n[k], ms = ARC.ms[k];
            let f = oldMode ? 0 : Math.floor(u.t / ms); f = (k === 'S_Idle' || k === 'S_Walk') ? f % n : Math.min(n - 1, f);
            const hop = oldMode && u.anim === 'S_Attack' ? -1 : 0;
            x.drawImage(img, f * 32, 0, 32, 32, px - ARC.anchor.x, py - ARC.anchor.y + hop, 32, 32);
            if (u.flash > 0.05) flashRect(x, img, f * 32, px - ARC.anchor.x, py - ARC.anchor.y + hop, u.flash);
          }
        } else {
          const look = { ...u.look, cloth: B.opt.colors ? (u.team ? 'swadia' : 'nord') : null };
          if (!B.opt.variety) { look.hair = 0; look.skin = 0; }
          let unit;
          if (oldMode) {
            const moving = u.anim === 'Walk';
            const hop = moving ? -Math.round(Math.abs(Math.sin(u.t / 90)) * 2) : (u.anim === 'attack' ? -Math.round(Math.sin(Math.min(1, u.t / 400) * Math.PI) * 3) : 0);
            unit = { ...look, anim: 'Idle', dir: 'down', t: 0 };
            SW.drawUnit(x, unit, px, py + hop, { frame: 0, flash: u.flash > 0.05 ? u.flash : 0 });
          } else {
            unit = { ...look, anim: u.anim, dir: u.dir, t: u.t };
            SW.drawUnit(x, unit, px, py, { flash: u.flash > 0.05 ? u.flash * 0.9 : 0, noRed: true });
          }
        }
        x.globalAlpha = 1;
      }
      for (const a of B.arrows) {
        x.save(); x.translate(Math.round(a.x), Math.round(a.y)); x.rotate(Math.atan2(a.vy, a.vx)); x.drawImage(arrowImg, -6, -1); x.restore();
      }
      if (B.opt.blood && bloodImg.complete) for (const f of B.fx) {
        const fr = Math.min(3, Math.floor(f.t / 0.09));
        x.save(); x.translate(Math.round(f.x), Math.round(f.y)); if (f.flip) x.scale(-1, 1);
        x.drawImage(bloodImg, fr * 32, 0, 32, 32, -16, -16, 32, 32); x.restore();
      }
      for (const n of B.nums) digits(x, n.s, Math.round(n.x), Math.round(n.y - n.t * 14), n.t < 0.12 ? '#ffffff' : '#ffd166');
    }
    let _fl;
    function flashRect(x, img, sx, dx, dy, a) {
      if (!_fl) { _fl = document.createElement('canvas'); _fl.width = _fl.height = 32; }
      const fx = _fl.getContext('2d'); fx.clearRect(0, 0, 32, 32); fx.drawImage(img, sx, 0, 32, 32, 0, 0, 32, 32);
      fx.globalCompositeOperation = 'source-atop'; fx.fillStyle = '#fff'; fx.globalAlpha = a; fx.fillRect(0, 0, 32, 32);
      fx.globalCompositeOperation = 'source-over'; fx.globalAlpha = 1; x.drawImage(_fl, dx, dy);
    }
    resetBattle();
    return { B, reset: resetBattle, step: stepBattle, draw: drawBattle };
  }
  function battle() {
    const c = $('#arena'), x = ctx2d(c), g = grass(c.width, c.height, 21), opt = {};
    document.querySelectorAll('#b-opts input').forEach(i => { opt[i.dataset.k] = i.checked; i.addEventListener('change', () => { opt[i.dataset.k] = i.checked; }); });
    const bt = createBattle({ W: c.width, H: c.height, ymin: 44, ymax: 142, opt });
    $('#b-mode').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; bt.B.mode = b.dataset.v;
      $('#b-mode').querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    });
    c.addEventListener('click', bt.reset);
    runLoop(c, dt => { if (opt.slow) dt *= 0.3; bt.step(dt); bt.draw(x, g); });
  }
  // One rAF per canvas, paused while it is off screen.
  function runLoop(c, frame) {
    let last = performance.now(), visible = true;
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(c);
    (function f(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (visible) frame(dt, now);
      requestAnimationFrame(f);
    })(last);
  }

  // ---- phone mocks ----
  function phoneToggles() {
    document.querySelectorAll('[data-phone]').forEach(seg => seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      seg.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      document.querySelectorAll(`#${seg.dataset.phone} > .view`).forEach(v => { v.hidden = v.dataset.v !== b.dataset.v; });
    }));
  }
  function phoneBattle() {
    const c = $('#pbattle'), x = ctx2d(c), g = grass(c.width, c.height, 33);
    const opt = { colors: true, variety: true, rings: false, hitstop: true, numbers: true, blood: true, archers: true };
    const bt = createBattle({ W: c.width, H: c.height, vertical: true, top: 92, bottom: 196, ymin: 60, ymax: 250, opt });
    const us = $('#pbUs'), usN = $('#pbUsN'), themN = $('#pbThemN'), mini = $('#pbMini');
    let lastKey = '';
    runLoop(c, dt => {
      bt.step(dt); bt.draw(x, g);
      const live = bt.B.units.filter(u => !u.dead), a = live.filter(u => !u.team).length, b = live.length - a;
      const k = a + ':' + b;
      if (k !== lastKey) {
        lastKey = k; us.style.width = (a + b ? a / (a + b) * 100 : 50) + '%';
        usN.textContent = 'Biz ' + a; themN.textContent = b + ' Düşman';
      }
      mini.innerHTML = live.map(u => `<i style="left:${u.x / c.width * 90 + 3}%;top:${u.y / c.height * 90 + 3}%;background:${u.team ? '#ff6b6b' : '#5aa9ff'}"></i>`).join('');
    });
  }
  function phoneMap() {
    const c = $('#pmap'), x = ctx2d(c), W = c.width, H = c.height;
    const base = grass(W, H, 5), bx = base.getContext('2d'), r = rng(9);
    const stamp = (pts, w, fill, edge, dot) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
        for (let k = 0; k <= n; k++) {
          const px = Math.round(x0 + (x1 - x0) * k / n), py = Math.round(y0 + (y1 - y0) * k / n);
          bx.fillStyle = edge; bx.fillRect(px - w, py - w, w * 2 + 1, w * 2 + 1);
        }
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
        for (let k = 0; k <= n; k++) {
          const px = Math.round(x0 + (x1 - x0) * k / n), py = Math.round(y0 + (y1 - y0) * k / n);
          bx.fillStyle = fill; bx.fillRect(px - w + 1, py - w + 1, w * 2 - 1, w * 2 - 1);
          if (dot && r() < 0.25) { bx.fillStyle = dot; bx.fillRect(px + ((r() * 3) | 0) - 1, py + ((r() * 3) | 0) - 1, 2, 1); }
        }
      }
    };
    const road = [[22, 300], [34, 262], [58, 236], [82, 200], [78, 164], [92, 130], [106, 96], [112, 70]];
    stamp([[0, 150], [30, 146], [60, 156], [96, 140], [144, 128]], 3, '#3f7fb0', '#2b5d85', '#8cc3e6');
    stamp(road, 2, '#b8a06c', '#7f6a44', '#cdb886');
    for (let i = 0; i < 7; i++) { bx.fillStyle = i % 2 ? '#7a5a36' : '#9c7648'; bx.fillRect(84 + i, 140 - 3, 1, 8); }   // bridge
    const tree = (tx, ty) => {
      bx.fillStyle = 'rgba(15,30,10,.35)'; bx.fillRect(tx - 3, ty + 3, 8, 2);
      bx.fillStyle = '#1e3a1c'; bx.fillRect(tx - 3, ty - 3, 7, 7); bx.fillRect(tx - 2, ty - 4, 5, 9); bx.fillRect(tx - 4, ty - 2, 9, 5);
      bx.fillStyle = '#2f5a2b'; bx.fillRect(tx - 2, ty - 3, 5, 6); bx.fillRect(tx - 3, ty - 2, 7, 4);
      bx.fillStyle = '#4f8a3f'; bx.fillRect(tx - 2, ty - 2, 2, 2); bx.fillRect(tx - 1, ty - 3, 2, 1);
    };
    [[14, 70], [24, 62], [20, 82], [32, 76], [10, 96], [124, 206], [132, 220], [116, 230], [128, 240], [44, 190], [52, 180], [120, 176], [8, 200], [16, 214]].forEach(([a, b]) => tree(a, b));
    const castle = (cx, cy) => {
      bx.fillStyle = 'rgba(15,30,10,.35)'; bx.fillRect(cx - 9, cy + 7, 20, 3);
      bx.fillStyle = '#3d3a3a'; bx.fillRect(cx - 9, cy - 6, 19, 14);
      bx.fillStyle = '#8a8f98'; bx.fillRect(cx - 8, cy - 5, 17, 12);
      bx.fillStyle = '#b3b8c0'; bx.fillRect(cx - 8, cy - 5, 17, 2);
      for (let i = -8; i <= 8; i += 3) { bx.fillStyle = '#3d3a3a'; bx.fillRect(cx + i, cy - 8, 2, 3); bx.fillStyle = '#9ca1a9'; bx.fillRect(cx + i, cy - 7, 1, 2); }
      bx.fillStyle = '#3d3a3a'; bx.fillRect(cx - 3, cy - 13, 7, 8); bx.fillStyle = '#8a8f98'; bx.fillRect(cx - 2, cy - 12, 5, 7);
      bx.fillStyle = '#241c18'; bx.fillRect(cx - 1, cy + 2, 3, 5);
      bx.fillStyle = '#5a4a3a'; bx.fillRect(cx, cy - 20, 1, 8); bx.fillStyle = '#ff4d4d'; bx.fillRect(cx + 1, cy - 20, 4, 3);
    };
    const hut = (hx, hy) => {
      bx.fillStyle = 'rgba(15,30,10,.35)'; bx.fillRect(hx - 4, hy + 4, 10, 2);
      bx.fillStyle = '#3a2618'; bx.fillRect(hx - 4, hy - 1, 9, 6); bx.fillStyle = '#b8966a'; bx.fillRect(hx - 3, hy, 7, 4);
      bx.fillStyle = '#5a2a1c'; bx.fillRect(hx - 5, hy - 3, 11, 3); bx.fillStyle = '#9c4a2e'; bx.fillRect(hx - 4, hy - 4, 9, 2);
      bx.fillStyle = '#3a2618'; bx.fillRect(hx, hy + 2, 1, 2);
    };
    castle(110, 70); hut(30, 240); hut(42, 246); hut(36, 232);
    const labels = [
      { x: 110, y: 49, html: '<i style="background:#ff4d4d"></i>Praven' },
      { x: 37, y: 224, html: '<i style="background:#33cc33"></i>Azgad', cls: 'small' },
      { x: 104, y: 166, html: 'Çapulcular (14)', cls: 'foe small' },
    ];
    $('#pmLabels').innerHTML = labels.map(l => `<span class="${l.cls || ''}" style="left:${l.x / W * 100}%;top:${l.y / H * 100}%">${l.html}</span>`).join('') + '<span class="you" id="pmYou">Serkan (1)</span>';
    const you = $('#pmYou');
    // walk the party along the road and back
    const path = road.slice(1, 6), lens = [];
    let total = 0; for (let i = 0; i < path.length - 1; i++) { const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); lens.push(l); total += l; }
    let dist = 0, dirn = 1, t = 0;
    runLoop(c, dt => {
      t += dt * 1000; dist += dirn * dt * 9;
      if (dist > total) { dist = total; dirn = -1; } if (dist < 0) { dist = 0; dirn = 1; }
      let d = dist, i = 0; while (i < lens.length - 1 && d > lens[i]) { d -= lens[i]; i++; }
      const [x0, y0] = path[i], [x1, y1] = path[i + 1], k = Math.min(1, d / lens[i]);
      const px = x0 + (x1 - x0) * k, py = y0 + (y1 - y0) * k, vx = (x1 - x0) * dirn, vy = (y1 - y0) * dirn;
      const dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
      x.drawImage(base, 0, 0);
      // the bandit band idles by the river
      SW.drawUnit(x, { armor: 1, weapon: 1, helm: '', hair: 1, skin: 2, cloth: 'bandit', anim: 'Idle', dir: 'left', t }, 100, 184);
      SW.drawUnit(x, { armor: 2, weapon: 2, helm: 'cap', hair: 3, skin: 0, cloth: 'bandit', anim: 'Idle', dir: 'left', t: t + 300 }, 110, 188);
      shadow(x, Math.round(px), Math.round(py) - 1);
      SW.drawUnit(x, { armor: 1, weapon: 1, helm: '', hair: 0, skin: 0, cloth: 'nord', anim: 'Walk', dir, t }, px, py);
      you.style.left = (px / W * 100) + '%'; you.style.top = ((py - 26) / H * 100) + '%';
    });
  }

  // ---- decisions (shared db doc; the page works without it) ----
  async function decisions() {
    const form = $('#form'), state = $('#saveState'), btn = $('#saveBtn');
    const read = () => {
      const d = {};
      for (const q of ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q8']) { const el = form.querySelector(`input[name="${q}"]:checked`); d[q] = el ? el.value : null; }
      d.q7 = [...form.querySelectorAll('input[name="q7"]:checked')].map(i => i.value);
      d.note = $('#note').value.slice(0, 4000);
      return d;
    };
    const fill = d => {
      if (!d) return;
      for (const q of ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q8']) if (d[q]) { const el = form.querySelector(`input[name="${q}"][value="${d[q]}"]`); if (el) el.checked = true; }
      if (Array.isArray(d.q7)) form.querySelectorAll('input[name="q7"]').forEach(i => { i.checked = d.q7.includes(i.value); });
      if (typeof d.note === 'string' && document.activeElement !== $('#note')) $('#note').value = d.note;
    };
    let db = null;
    btn.disabled = true;
    try { db = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('db') : null; } catch (_) { db = null; }
    if (!db) { state.textContent = 'Bu görünümde kaydedilemiyor. Seçimlerini sohbete yazman yeterli.'; form.addEventListener('submit', e => e.preventDefault()); return; }
    const ref = db.doc('feedback/tur1');
    btn.disabled = false; state.textContent = 'Hazır. Kaydettiğinde ben de görürüm.';
    ref.onSnapshot(s => { if (s.exists) { fill(s.data().answers); const at = s.data().savedAt; if (at) state.textContent = 'Son kayıt: ' + new Date(at).toLocaleString('tr-TR'); } }, () => {});
    form.addEventListener('submit', async e => {
      e.preventDefault(); btn.disabled = true; state.textContent = 'Kaydediliyor…';
      try { await ref.set({ answers: read(), savedAt: Date.now() }); state.textContent = 'Kaydedildi. Teşekkürler, buradan okuyacağım.'; }
      catch (err) { state.textContent = err && err.code === 'permission_denied' ? 'Bu sayfaya yazma iznin yok. Seçimlerini sohbete yazabilirsin.' : 'Kaydedilemedi (' + (err && err.code || 'hata') + '). Seçimlerini sohbete yazabilirsin.'; }
      btn.disabled = false;
    });
  }

  // ---- boot ----
  decisions();
  phoneToggles();
  SW.preload().then(() => {
    hero();
    workbench();
    battle();
    phoneBattle();
    phoneMap();
    spinner('#lineupNew', { armor: 1, weapon: 1, helm: '', hair: 0, skin: 0, cloth: null }, 34);
    spinner('#prevA', { armor: 3, weapon: 3, helm: 'nasal', hair: 1, skin: 0, cloth: 'swadia' }, 28);
    stillImage('#oldKnight', 'a/player_melee.png');
    avatar('#avM', { armor: 1, weapon: 1, helm: '', hair: 0, skin: 0, cloth: null });
    avatar('#avF', { armor: 1, weapon: 1, helm: '', hair: 3, skin: 1, cloth: null });
    window.__ready = 1;
  }).catch(e => { console.error(e); window.__ready = 1; });
})();
