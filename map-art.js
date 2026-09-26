// ============================================================
// MapArt — the campaign map in pixel art (2.0.0, visual refresh step 4)
// ------------------------------------------------------------
// The continent's ground is baked ONCE into one pixel canvas, TEX world units per pixel:
// ground tinted by whose land it is (Swadian farmland, Khergit steppe, Vaegir snow, Rhodok
// hills, Nord coast), the coast with its cliffs and mountains, rivers, roads and bridges,
// forests and the fields around villages. A frame draws it with one drawImage, where the
// old map filled the continent with a texture, 60 soft patches, the trees and ~80 mountain
// emoji every frame.
//
// Settlements are pixel sprites built from a few primitives in the style of the kingdom that
// founded them (a siege changes the flag, not the walls), with windows that light up after
// dark. Parties are the battle's own animated soldiers (Swordsman / Mounted / Archer), dressed
// in their kingdom's colours. Labels are laid out in screen space after the world is drawn,
// most important first, and never on top of a settlement.
//
// Everything here only reads state. The bake's inputs — settlements, roads, bridges, rivers,
// forests, the coastline — are fixed once a world exists; `key()` notices a new world.
// ============================================================
const MapArt = (() => {
    const TEX = 8, SPX = 3;                        // world units per terrain / sprite pixel
    const X0 = -600, Y0 = -600, SPAN = 10200;      // the baked square, continent + a sea margin
    const N = Math.ceil(SPAN / TEX);
    const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const hash = (x, y, s) => {
        let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const noise = (x, y, s) => {
        const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    const fbm = (x, y, s) => noise(x, y, s) * 0.62 + noise(x * 2.3, y * 2.3, s + 7) * 0.38;
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
    const dith = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

    // The kingdom that founded each settlement, read before any save or siege can change it
    const CULTURE = {};
    LOCATIONS.forEach(l => { CULTURE[l.id] = l.faction; });
    const culture = loc => CULTURE[loc.id] || (FACTIONS[loc.faction] ? loc.faction : 'swadia');

    // Four ground shades per land, dark to light
    const GROUND = {
        swadia:  ['#3d6a2d', '#4b7b34', '#5b8c3c', '#6f9d47'],
        rhodok:  ['#4c5c33', '#5d6e3b', '#718046', '#8a8c5a'],
        nord:    ['#2e583b', '#3a6845', '#4a7951', '#5d8b61'],
        vaegir:  ['#3c5c4c', '#4c6d5b', '#638673', '#86a293'],
        khergit: ['#76803e', '#8a9046', '#a09f52', '#b8ad68'],
        wild:    ['#355a31', '#42693b', '#527a45', '#64894f']
    };
    const LANDS = Object.keys(GROUND), GRGB = LANDS.map(k => GROUND[k].map(rgb));
    const C = {
        deep: rgb('#173f5c'), sea: rgb('#1f5578'), shallow: rgb('#2b6f96'), foam: rgb('#9cc9da'),
        sand: rgb('#d4bf86'), sand2: rgb('#bea86f'), snow: rgb('#dce4e6'), snow2: rgb('#aebfc0'),
        rock: rgb('#8a877a'), rock2: rgb('#6c6a60'), dry: rgb('#b9a768'),
        under: rgb('#1d3a22'), under2: rgb('#264a2b'),
        bank: rgb('#5d5a3a'), water: rgb('#2f6e98'), water2: rgb('#3f86b0'), glint: rgb('#79b8d8'),
        hedge: rgb('#2d4a25'), plank: rgb('#7a5a36'), plank2: rgb('#5c4226'), plaza: rgb('#8b7452'), plaza2: rgb('#7a6446')
    };
    const ROAD = {
        stone: { r: 18, edge: rgb('#67635a'), top: rgb('#9c978b'), fleck: rgb('#b6b0a2') },
        dirt:  { r: 15, edge: rgb('#6e5433'), top: rgb('#9c7b4d'), fleck: rgb('#b18f5e') },
        track: { r: 8,  edge: null,           top: rgb('#8f7c55'), fleck: rgb('#a38e62') }
    };
    const FIELDS = [['#c7a74c', '#ad8c38'], ['#6d9838', '#5a8330'], ['#7c5d3a', '#6a4e30'], ['#b7b04e', '#9d963e']].map(p => p.map(rgb));

    // --- small sprite toolkit: pixels on a tiny canvas, then a dark outline around the lot
    function sheet(w, h) {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const x = c.getContext('2d');
        const g = {
            c, x, w, h, win: [],
            px(px, py, pw, ph, col) { if(col) { x.fillStyle = col; x.fillRect(px, py, pw, ph); } },
            window(px, py) { g.px(px, py, 1, 1, '#2a2119'); g.win.push([px, py]); }
        };
        return g;
    }
    function outline(g, col = '#1a1611') {
        const id = g.x.getImageData(0, 0, g.w, g.h), d = id.data, W = g.w, H = g.h, o = new Uint8Array(W * H);
        for(let y = 0; y < H; y++) for(let x = 0; x < W; x++) {
            if(d[(y * W + x) * 4 + 3]) continue;
            const on = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && d[(yy * W + xx) * 4 + 3] > 0;
            if(on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) o[y * W + x] = 1;
        }
        const [r, gg, b] = rgb(col);
        for(let i = 0; i < W * H; i++) if(o[i]) { d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; }
        g.x.putImageData(id, 0, 0);
        return g;
    }

    // --- terrain decorations, stamped into the bake at 1 px = 1 texel
    const TREES = {};
    function tree(kind, v) {
        const k = kind + v;
        if(TREES[k]) return TREES[k];
        let g;
        if(kind === 'pine') {
            const P = [['#1f4a2c', '#2d6139', '#3d7646'], ['#1c4430', '#29583c', '#37704c']][v % 2];
            g = sheet(9, 13);
            for(let i = 0; i < 4; i++) {                      // three stacked tiers + a tip
                const y = 1 + i * 2.5 | 0, hw = 1 + i;
                for(let r = 0; r < 3; r++) g.px(4 - hw + (r ? 0 : 1) - 0, y + r, hw * 2 + 1 - (r ? 0 : 2), 1, P[1]);
                g.px(4 - hw, y + 2, hw, 1, P[2]); g.px(5, y + 2, hw, 1, P[0]);
            }
            g.px(4, 11, 1, 2, '#5a3d22');
        } else if(kind === 'birch') {
            g = sheet(8, 12);
            g.px(1, 1, 6, 6, '#6f9447'); g.px(2, 0, 4, 1, '#6f9447'); g.px(1, 2, 3, 3, '#8fb35a'); g.px(4, 4, 3, 3, '#557a36');
            g.px(3, 7, 2, 5, '#e3e0d6'); g.px(3, 8, 1, 1, '#4a4640'); g.px(4, 10, 1, 1, '#4a4640');
        } else if(kind === 'bush') {
            g = sheet(5, 3);
            g.px(0, 1, 5, 2, '#2f5a2c'); g.px(1, 0, 3, 1, '#3f6f38'); g.px(1, 1, 2, 1, '#4f8144');
        } else if(kind === 'rock') {
            g = sheet(4, 3);
            g.px(0, 1, 4, 2, '#77746a'); g.px(1, 0, 2, 1, '#9a978c'); g.px(0, 1, 2, 1, '#a8a598');
        } else {                                              // broadleaf
            const P = [['#2f5f2a', '#3f7535', '#56913f'], ['#35602a', '#477a30', '#63963a']][v % 2];
            g = sheet(10, 11);
            g.px(1, 1, 8, 6, P[1]); g.px(2, 0, 6, 1, P[1]); g.px(0, 2, 10, 4, P[1]); g.px(2, 7, 6, 1, P[1]);
            g.px(2, 1, 4, 3, P[2]); g.px(6, 5, 3, 2, P[0]); g.px(1, 5, 2, 1, P[0]);
            g.px(4, 8, 2, 3, '#5a3d22');
        }
        return (TREES[k] = outline(g, '#15210f').c);
    }
    const MOUNTS = [];
    function mountain(v) {
        if(MOUNTS[v]) return MOUNTS[v];
        const w = 13 + (v % 4) * 3, h = Math.round(w * (0.7 + (v % 3) * 0.08)), g = sheet(w, h + 1);
        const peak = Math.round(w * (0.4 + hash(v, 1, 5) * 0.2));
        for(let x = 0; x < w; x++) {
            const dx = Math.abs(x - peak) / (x < peak ? peak : w - 1 - peak);
            const top = Math.round(h * (dx * 0.95) + (hash(x, v, 9) - 0.5) * 2);
            for(let y = Math.max(0, top); y <= h; y++) {
                const lit = x < peak - (y - top > 3 ? 0 : 0);
                const snowLine = h * 0.32 + hash(x, v, 3) * 2;
                const col = y < snowLine ? (lit ? '#eef3f5' : '#c3cdd3')
                          : lit ? (y > h * 0.8 ? '#6f6c5f' : '#8e8a7a') : (y > h * 0.8 ? '#4a473f' : '#625e52');
                g.px(x, y, 1, 1, col);
            }
        }
        return (MOUNTS[v] = outline(g, '#1c1a16').c);
    }

    // --- the bake
    let baked = null;
    function key() {
        return [LOCATIONS.map(l => l.id + l.x + ',' + l.y).join(), (state.roads || []).length,
                (state.bridges || []).length, state.mapBorder ? state.mapBorder.length : 0].join('|');
    }

    function bake() {
        const t0 = performance.now();
        const img = new ImageData(N, N), d = img.data, cls = new Uint8Array(N * N);
        const put = (i, c) => { d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; };
        const put3 = (i, r, g, b) => { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; };

        // Coastline: the same radius the game clamps parties to, sampled once per angle
        const BINS = 8192, RAD = new Float32Array(BINS), CLIFF = new Uint8Array(BINS);
        for(let i = 0; i < BINS; i++) {
            const a = i / BINS * Math.PI * 2 - Math.PI;
            // the coast wiggles a little off the clamp radius: per angle, not per texel
            RAD[i] = Game.getMapRadius(4500 + Math.cos(a) * 100, 4500 + Math.sin(a) * 100) + (noise(a * 60, 2.5, 4) - 0.5) * 46;
            CLIFF[i] = noise(a * 2.2 + 10, 0.5, 11) > 0.52 ? 1 : 0;   // mountain coast, else a beach
        }
        const bin = a => Math.min(BINS - 1, Math.max(0, ((a + Math.PI) / (Math.PI * 2) * BINS) | 0));

        // Whose land: a coarse grid of blended palettes, one cell per 8 texels
        const CELL = 8, G = Math.ceil(N / CELL), pal = new Float32Array(G * G * 12), snowK = new Float32Array(G * G);
        const rockK = new Float32Array(G * G), dryK = new Float32Array(G * G);
        const sites = LOCATIONS.map(l => ({ x: l.x, y: l.y, f: LANDS.indexOf(culture(l)) }));
        for(let gy = 0; gy < G; gy++) for(let gx = 0; gx < G; gx++) {
            const wx = X0 + (gx + 0.5) * CELL * TEX, wy = Y0 + (gy + 0.5) * CELL * TEX;
            const w = new Float32Array(LANDS.length); w[LANDS.indexOf('wild')] = 0.10;
            for(const s of sites) { const dd = ((s.x - wx) ** 2 + (s.y - wy) ** 2) / (820 * 820); if(dd < 9) w[s.f] += Math.exp(-dd); }
            let sum = 0; for(const v of w) sum += v;
            const c = (gy * G + gx);
            for(let sh = 0; sh < 4; sh++) for(let ch = 0; ch < 3; ch++) {
                let v = 0; for(let f = 0; f < LANDS.length; f++) v += w[f] * GRGB[f][sh][ch];
                pal[c * 12 + sh * 3 + ch] = v / sum;
            }
            const V = w[LANDS.indexOf('vaegir')] / sum, No = w[LANDS.indexOf('nord')] / sum;
            snowK[c] = Math.min(1, V * 1.1 * Math.max(0, Math.min(1, (3900 - wy) / 600)) + No * 0.5 * Math.max(0, Math.min(1, (3150 - wy) / 400)));
            rockK[c] = w[LANDS.indexOf('rhodok')] / sum;
            dryK[c] = w[LANDS.indexOf('khergit')] / sum;
        }

        // 1. ground, sea, beach
        for(let ty = 0; ty < N; ty++) {
            const wy = Y0 + (ty + 0.5) * TEX, dy = wy - 4500;
            for(let tx = 0; tx < N; tx++) {
                const wx = X0 + (tx + 0.5) * TEX, dx = wx - 4500, i = ty * N + tx;
                const r = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx), b = bin(a);
                const dc = RAD[b] - r, dt = dith(tx, ty);
                if(dc < 0) {
                    cls[i] = 1;
                    if(dc > -16 + dt * 10 && !CLIFF[b]) put(i, C.foam);
                    else if(dc > -70 + dt * 24) put(i, C.shallow);
                    else if(dc > -190 + dt * 40) put(i, C.sea);
                    else put(i, C.deep);
                    continue;
                }
                if(!CLIFF[b] && dc < 34 + dt * 14) { cls[i] = 2; put(i, dc < 14 + dt * 10 ? C.sand2 : C.sand); continue; }
                const jx = (tx + ((dt - 0.5) * 10 | 0)) / CELL | 0, jy = (ty + ((dith(ty, tx) - 0.5) * 10 | 0)) / CELL | 0;
                const c = Math.min(G - 1, Math.max(0, jy)) * G + Math.min(G - 1, Math.max(0, jx));
                const n = fbm(wx / 460, wy / 460, 1);
                const sh = Math.max(0, Math.min(3, (n * 4.2 - 0.6 + (dt - 0.5) * 0.35) | 0));
                const o = c * 12 + sh * 3;
                const s = snowK[c];
                if(s > 0.05) {
                    const sn = noise(wx / 38, wy / 38, 12) * 0.6 + noise(wx / 70, wy / 70, 2) * 0.4;
                    if(sn > 1.02 - s * 0.55 + (dt - 0.5) * 0.08) { put(i, sn > 1.08 - s * 0.45 ? C.snow : C.snow2); continue; }
                }
                if(rockK[c] > 0.3 && hash(tx, ty, 21) < rockK[c] * 0.035) { put(i, hash(tx, ty, 22) < 0.5 ? C.rock : C.rock2); continue; }
                if(dryK[c] > 0.35 && noise(wx / 60, wy / 60, 6) > 0.86 - dryK[c] * 0.12 + (dt - 0.5) * 0.05) { put(i, C.dry); continue; }
                put3(i, pal[o], pal[o + 1], pal[o + 2]);
            }
        }
        const texel = (wx, wy) => [Math.floor((wx - X0) / TEX), Math.floor((wy - Y0) / TEX)];
        const box = (x1, y1, x2, y2, pad, fn) => {
            const [ax, ay] = texel(Math.min(x1, x2) - pad, Math.min(y1, y2) - pad), [bx, by] = texel(Math.max(x1, x2) + pad, Math.max(y1, y2) + pad);
            for(let ty = Math.max(0, ay); ty <= Math.min(N - 1, by); ty++)
                for(let tx = Math.max(0, ax); tx <= Math.min(N - 1, bx); tx++) fn(tx, ty, X0 + (tx + 0.5) * TEX, Y0 + (ty + 0.5) * TEX, ty * N + tx);
        };
        const segDist = (px, py, s) => {
            const C2 = s.x2 - s.x1, D2 = s.y2 - s.y1, L = C2 * C2 + D2 * D2;
            let t = L ? ((px - s.x1) * C2 + (py - s.y1) * D2) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
            return Math.hypot(px - (s.x1 + t * C2), py - (s.y1 + t * D2));
        };

        // 2. forest floor
        FORESTS.forEach(f => box(f.x, f.y, f.x, f.y, f.radius * 1.1, (tx, ty, wx, wy, i) => {
            if(cls[i]) return;
            const k = Math.hypot(wx - f.x, wy - f.y) / f.radius;
            if(k > 1.08) return;
            if(k < 0.86 || dith(tx, ty) > (k - 0.86) / 0.22) { put(i, hash(tx, ty, 5) < 0.5 ? C.under : C.under2); cls[i] = 6; }
        }));

        // 3. a patchwork of fields beside villages and towns, hedged, on the side away from the
        //    gate (a Khergit camp grazes its herd instead)
        LOCATIONS.forEach((l, li) => {
            if(l.type === 'castle' || culture(l) === 'khergit') return;
            const cols = l.type === 'city' ? 4 : 3, rows = 2, fw = 52, fh = 38;
            const side = hash(li, 1, 30) < 0.5 ? -1 : 1;
            const gx0 = l.x + side * (l.type === 'city' ? 95 : 70) - (side < 0 ? cols * fw : 0), gy0 = l.y - 30 - hash(li, 2, 30) * 30;
            for(let r = 0; r < rows; r++) for(let q = 0; q < cols; q++) {
                if(hash(li, r * 8 + q, 32) < 0.18) continue;
                const P = FIELDS[(hash(li, r * 8 + q, 35) * 4) | 0], stripes = hash(li, r * 8 + q, 36) < 0.5;
                const x1 = gx0 + q * fw, y1 = gy0 + r * fh;
                box(x1, y1, x1 + fw, y1 + fh, 0, (tx, ty, wx, wy, i) => {
                    if(cls[i]) return;
                    const edge = wx - x1 < TEX || wy - y1 < TEX;
                    put(i, edge ? C.hedge : P[(stripes ? ty : tx) & 1]); cls[i] = 5;
                });
            }
        });

        // 4. rivers: bank, water, a glinting current
        RIVERS.forEach(s => box(s.x1, s.y1, s.x2, s.y2, s.width, (tx, ty, wx, wy, i) => {
            if(cls[i] === 1) return;
            const dd = segDist(wx, wy, s), h = s.width / 2;
            if(dd > h + 9) return;
            if(dd > h) { if(cls[i] !== 3) put(i, C.bank); return; }
            put(i, dd < h * 0.3 && dith(tx, ty) < 0.35 ? C.glint : dd > h * 0.7 ? C.water2 : C.water); cls[i] = 3;
        }));

        // 5. roads, edges first so a junction doesn't draw a kerb across its own surface
        const roads = state.roads || [];
        for(const pass of ['edge', 'top']) roads.forEach(s => {
            const R = ROAD[s.kind] || ROAD.dirt;
            if(pass === 'edge' && !R.edge) return;
            box(s.x1, s.y1, s.x2, s.y2, R.r + TEX, (tx, ty, wx, wy, i) => {
                if(cls[i] === 3 || cls[i] === 1) return;
                const dd = segDist(wx, wy, s);
                if(pass === 'edge') { if(dd <= R.r + TEX * 0.9 && cls[i] !== 4) put(i, R.edge); return; }
                if(dd <= R.r) { put(i, hash(tx, ty, 41) < 0.12 ? R.fleck : R.top); cls[i] = 4; }
            });
        });
        // a trodden square at every settlement's gate
        LOCATIONS.forEach(l => {
            const r = l.type === 'city' ? 62 : l.type === 'castle' ? 46 : 34;
            box(l.x, l.y + 14, l.x, l.y + 14, r, (tx, ty, wx, wy, i) => {
                if(cls[i] === 1 || cls[i] === 3) return;
                const k = Math.hypot(wx - l.x, (wy - l.y - 14) * 1.5) / r;
                if(k < 0.8 || (k < 1 && dith(tx, ty) > (k - 0.8) / 0.2)) { put(i, hash(tx, ty, 43) < 0.2 ? C.plaza2 : C.plaza); cls[i] = 4; }
            });
        });
        // 6. bridges: planks across the water, laid along the road
        (state.bridges || []).forEach(b => {
            const w = (Game.ROAD_KINDS[b.kind] || Game.ROAD_KINDS.dirt).half + 6, a = b.a || 0, ca = Math.cos(a), sa = Math.sin(a);
            box(b.x, b.y, b.x, b.y, w * 1.6, (tx, ty, wx, wy, i) => {
                const u = (wx - b.x) * ca + (wy - b.y) * sa, v = -(wx - b.x) * sa + (wy - b.y) * ca;
                if(Math.abs(u) > w * 1.3 || Math.abs(v) > w * 0.8) return;
                put(i, Math.abs(v) > w * 0.62 ? C.plank2 : (Math.floor(u / TEX) & 1 ? C.plank : C.plank2)); cls[i] = 4;
            });
        });

        const cv = document.createElement('canvas'); cv.width = cv.height = N;
        const x = cv.getContext('2d');
        x.putImageData(img, 0, 0);

        // 7. things that stand up, back to front: mountains on the rocky coast, forest trees,
        //    a bush or a boulder here and there on open ground
        const stamps = [];
        const at = (wx, wy) => { const [tx, ty] = texel(wx, wy); return tx >= 0 && ty >= 0 && tx < N && ty < N ? cls[ty * N + tx] : 1; };
        for(let i = 0; i < BINS; i += 3) {
            if(!CLIFF[i]) continue;
            const a = i / BINS * Math.PI * 2 - Math.PI;
            for(let row = 0; row < 3; row++) {
                const dd = -8 + row * 46 + hash(i, row, 51) * 26;
                if(hash(i, row, 52) < 0.25 + row * 0.2) continue;
                const rr = RAD[i] - dd, v = (hash(i, row, 53) * 12) | 0;
                stamps.push({ wx: 4500 + Math.cos(a) * rr, wy: 4500 + Math.sin(a) * rr, img: mountain(v) });
            }
        }
        FORESTS.forEach((f, fi) => {
            const land = LANDS[sites.reduce((best, s) => { const dd = Math.hypot(s.x - f.x, s.y - f.y); return dd < best.d ? { d: dd, f: s.f } : best; }, { d: 1e9, f: 5 }).f];
            const kinds = land === 'vaegir' || land === 'nord' ? ['pine', 'pine', 'birch'] : land === 'khergit' ? ['broad', 'birch'] : ['broad', 'broad', 'pine'];
            for(let gy = -f.radius; gy <= f.radius; gy += 30) for(let gx = -f.radius; gx <= f.radius; gx += 30) {
                const jx = gx + (hash(gx, gy, 60 + fi) - 0.5) * 26, jy = gy + (hash(gy, gx, 61 + fi) - 0.5) * 26;
                if(Math.hypot(jx, jy) > f.radius * 0.97) continue;
                const k = kinds[(hash(gx, gy, 62 + fi) * kinds.length) | 0];
                stamps.push({ wx: f.x + jx, wy: f.y + jy, img: tree(k, (hash(gx, gy, 63) * 2) | 0) });
            }
        });
        for(let k = 0; k < 2600; k++) {
            const wx = X0 + hash(k, 1, 71) * SPAN, wy = Y0 + hash(k, 2, 71) * SPAN;
            if(at(wx, wy) !== 0 || at(wx + 24, wy) !== 0) continue;
            if(LOCATIONS.some(l => Math.abs(l.x - wx) < 130 && Math.abs(l.y - wy) < 110)) continue;
            const r = hash(k, 3, 71);
            stamps.push({ wx, wy, img: r < 0.55 ? tree('bush', 0) : r < 0.8 ? tree('rock', 0) : tree(r < 0.9 ? 'broad' : 'pine', k & 1) });
        }
        stamps.sort((p, q) => p.wy - q.wy);
        stamps.forEach(s => { const [tx, ty] = texel(s.wx, s.wy); x.drawImage(s.img, tx - (s.img.width >> 1), ty - s.img.height + 1); });

        // pre-shrunk copies for the far zoom, filtered once here so a frame never has to smooth
        const mips = [cv];
        for(let k = 1; k <= 2; k++) {
            const src = mips[k - 1], m = document.createElement('canvas');
            m.width = m.height = Math.ceil(src.width / 2);
            const mx = m.getContext('2d'); mx.imageSmoothingEnabled = true; mx.imageSmoothingQuality = 'high';
            mx.drawImage(src, 0, 0, m.width, m.height);
            mips.push(m);
        }
        baked = { cv, mips, key: key(), ms: Math.round(performance.now() - t0) };
        return baked;
    }
    const terrain = () => (baked && baked.key === key() ? baked : bake());

    // --- settlements, in the founder's style
    const STYLE = {
        swadia:  { wall: ['#d2c9b6', '#b1a791', '#8b8170'], roof: ['#c9543c', '#9c3b2a'], top: 'cone' },
        rhodok:  { wall: ['#e0c48e', '#c2a26c', '#9b7f51'], roof: ['#cf7a44', '#a55a2f'], top: 'flat' },
        nord:    { wall: ['#a1784d', '#7f5a37', '#5c4026'], roof: ['#5e4d40', '#45382e'], top: 'wood' },
        vaegir:  { wall: ['#e8e4d8', '#c7c1b3', '#a09a8b'], roof: ['#3f7e63', '#2e5e4a'], dome: ['#e0b852', '#a8852f'], top: 'onion' },
        khergit: { felt: ['#efe7d2', '#d2c8ae', '#a99f85'], band: '#b03a2e', top: 'yurt' }
    };
    const SPRITES = new Map();

    // primitives, in sprite pixels; y grows down, `gy` is the ground line
    function block(g, x, y, w, h, P) { g.px(x, y, w, h, P[1]); g.px(x, y, 1, h, P[0]); g.px(x + w - 1, y, 1, h, P[2]); }
    function crenels(g, x, y, w, col) { for(let i = 0; i < w; i += 2) g.px(x + i, y - 1, 1, 1, col); }
    function cone(g, cx, yb, w, h, R) {
        for(let r = 0; r < h; r++) { const hw = Math.max(0, Math.round((w / 2) * (r + 1) / h)); g.px(cx - hw, yb - h + r, hw, 1, R[0]); g.px(cx, yb - h + r, hw + 1, 1, R[1]); }
    }
    function gable(g, x, yb, w, R, snow) {
        const h = Math.ceil(w / 2);
        for(let r = 0; r < h; r++) { const hw = r; g.px(x + (w >> 1) - hw, yb - h + r, hw + 1, 1, R[0]); g.px(x + (w >> 1), yb - h + r, hw + 1 - (w % 2 ? 0 : 1), 1, R[1]); }
        if(snow) g.px(x + (w >> 1) - 1, yb - h, 3, 1, '#f1f4f5');
    }
    function house(g, x, gy, w, h, S, snow) {
        block(g, x, gy - h, w, h, S.wall);
        gable(g, x - 1, gy - h, w + 2, S.roof, snow);
        g.px(x + (w >> 1), gy - 3, 1, 3, '#3a2a1c');
        if(w > 4) g.window(x + 1, gy - h + 1);
    }
    function tower(g, x, gy, w, h, S) {
        block(g, x, gy - h, w, h, S.wall);
        const cx = x + (w >> 1);
        if(S.top === 'cone') cone(g, cx, gy - h, w + 2, Math.ceil(w * 0.9), S.roof);
        else if(S.top === 'onion') {
            g.px(x, gy - h - 1, w, 1, S.wall[2]);
            const r = Math.max(2, (w >> 1));
            g.px(cx - r + 1, gy - h - 3, r * 2 - 1, 2, S.dome[1]); g.px(cx - r + 1, gy - h - 3, r - 1, 2, S.dome[0]);
            g.px(cx - r + 2, gy - h - 5, r * 2 - 3, 2, S.dome[0]); g.px(cx, gy - h - 7, 1, 2, S.dome[1]);
        } else if(S.top === 'wood') {
            g.px(x - 1, gy - h - 2, w + 2, 2, S.roof[1]); g.px(x - 1, gy - h - 2, (w + 2) >> 1, 2, S.roof[0]);
            g.px(cx, gy - h - 4, 1, 2, S.roof[1]);
        } else { crenels(g, x, gy - h, w, S.wall[1]); g.px(x, gy - h - 1, 1, 1, S.wall[0]); }
        g.window(cx, gy - h + 2);
        if(h > 8) g.window(cx, gy - h + 5);
    }
    function wall(g, x, gy, w, h, S) {
        if(S.top === 'wood') {                             // a palisade of sharpened stakes
            for(let i = 0; i < w; i++) { const t = i % 2 ? 1 : 0; g.px(x + i, gy - h - t, 1, h + t, i % 3 === 0 ? S.wall[0] : i % 3 === 1 ? S.wall[1] : S.wall[2]); }
            return;
        }
        block(g, x, gy - h, w, h, S.wall);
        g.px(x, gy - h, w, 1, S.wall[0]);
        crenels(g, x, gy - h, w, S.wall[1]);
        if(S.top === 'onion') for(let i = 0; i < w; i += 2) g.px(x + i, gy - h - 1, 1, 1, '#f1f4f5');
    }
    function gate(g, x, gy, w, h) { g.px(x, gy - h, w, h, '#2b2016'); g.px(x + 1, gy - h - 1, w - 2, 1, '#2b2016'); }
    function flag(g, x, y, col) { g.px(x, y, 1, 6, '#5a4a36'); g.px(x + 1, y, 4, 1, col); g.px(x + 1, y + 1, 3, 1, col); g.px(x + 1, y + 2, 2, 1, col); }
    function yurt(g, cx, gy, w, S, big) {
        const h = Math.round(w * 0.55), P = S.felt;
        for(let r = 0; r < h; r++) {
            const k = r < h * 0.45 ? Math.sqrt(1 - ((h * 0.45 - r) / (h * 0.45)) ** 2) : 1;
            const hw = Math.max(1, Math.round((w / 2) * (0.35 + 0.65 * k)));
            g.px(cx - hw, gy - h + r, hw, 1, P[0]); g.px(cx, gy - h + r, hw, 1, P[1]);
        }
        g.px(cx - (w >> 1), gy - (h >> 1), w, 1, S.band);
        g.px(cx - 1, gy - 3, 2, 3, '#4a2e1a');
        if(big) { g.px(cx, gy - h - 3, 1, 3, '#e0b852'); g.px(cx - 1, gy - h - 1, 3, 1, '#e0b852'); }
        g.window(cx + (w >> 2), gy - (h >> 1) - 2);
    }
    function tugh(g, x, gy, col) { g.px(x, gy - 12, 1, 12, '#5a4a36'); g.px(x - 1, gy - 12, 3, 1, '#e0b852'); g.px(x - 1, gy - 11, 3, 3, col); g.px(x, gy - 8, 1, 2, col); }

    function build(loc) {
        const S = STYLE[culture(loc)], col = (FACTIONS[loc.faction] || { color: '#bbb' }).color, cul = culture(loc);
        let g;
        if(loc.type === 'city') {
            g = sheet(40, 42); const gy = 41;          // headroom for the keep's flag
            if(cul === 'khergit') {
                yurt(g, 8, gy - 7, 10, S); yurt(g, 31, gy - 7, 10, S); yurt(g, 20, gy - 9, 16, S, true);
                yurt(g, 5, gy, 9, S); yurt(g, 35, gy, 9, S); yurt(g, 15, gy, 10, S); yurt(g, 26, gy, 10, S);
                for(let i = 1; i < 39; i += 3) g.px(i, gy - 1, 1, 2, '#7a5a38');
                tugh(g, 20, gy - 18, col);
            } else {
                house(g, 5, gy - 10, 6, 5, S, cul === 'vaegir'); house(g, 27, gy - 11, 7, 6, S, cul === 'vaegir'); house(g, 12, gy - 13, 5, 4, S);
                if(cul === 'nord') { house(g, 14, gy - 9, 12, 7, S); tower(g, 30, gy - 8, 5, 14, S); flag(g, 32, gy - 30, col); }
                else { tower(g, 16, gy - 9, 8, 16, S); flag(g, 20, gy - 35 + (S.top === 'onion' ? -2 : 0), col); }
                wall(g, 3, gy, 34, 9, S);
                tower(g, 0, gy, 6, 15, S); tower(g, 34, gy, 6, 15, S);
                gate(g, 17, gy, 6, 6);
            }
        } else if(loc.type === 'castle') {
            g = sheet(32, 40); const gy = 35;
            g.px(2, gy, 28, 2, '#5b6b3a'); g.px(4, gy + 2, 24, 2, '#4d5c31'); g.px(1, gy - 1, 30, 1, '#6a7a44');
            if(cul === 'khergit') {
                wall(g, 4, gy, 24, 7, STYLE.rhodok); yurt(g, 16, gy - 7, 14, S, true); tower(g, 3, gy, 5, 12, STYLE.rhodok); tower(g, 24, gy, 5, 12, STYLE.rhodok);
                gate(g, 14, gy, 4, 5); tugh(g, 9, gy - 7, col);
            } else {
                tower(g, 12, gy - 6, 8, 18, S); flag(g, 16, gy - 34 + (S.top === 'onion' ? -2 : S.top === 'cone' ? 0 : 3), col);
                wall(g, 4, gy, 24, 9, S); tower(g, 1, gy, 6, 15, S); tower(g, 25, gy, 6, 15, S);
                gate(g, 14, gy, 4, 5);
            }
        } else {
            g = sheet(28, 18); const gy = 17;
            if(cul === 'khergit') {
                yurt(g, 7, gy, 10, S); yurt(g, 19, gy - 2, 11, S); yurt(g, 24, gy, 7, S);
                for(let i = 0; i < 28; i += 3) g.px(i, gy - 1, 1, 2, '#7a5a38');
            } else {
                house(g, 2, gy, 7, 5, S, cul === 'vaegir'); house(g, 17, gy - 1, 8, 6, S, cul === 'vaegir'); house(g, 10, gy - 4, 6, 4, S);
                g.px(11, gy - 3, 4, 3, '#caa650'); g.px(12, gy - 4, 2, 1, '#caa650');   // haystack
                for(let i = 0; i < 28; i += 2) g.px(i, gy, 1, 1, '#7a5a38');
            }
        }
        outline(g);
        // the windows' glow, drawn once here: at night a frame stamps this one image instead of
        // a radial gradient per window (that was +1.1 ms a frame on the phone profile)
        const P = 4, glow = document.createElement('canvas');
        glow.width = g.w + P * 2; glow.height = g.h + P * 2;
        const gx = glow.getContext('2d');
        for(const [wx, wy] of g.win) {
            const cx = wx + 0.5 + P, cy = wy + 0.5 + P, gr = gx.createRadialGradient(cx, cy, 0, cx, cy, 2.6);
            gr.addColorStop(0, 'rgba(255,190,90,0.9)'); gr.addColorStop(1, 'rgba(255,160,60,0)');
            gx.fillStyle = gr; gx.fillRect(cx - 3, cy - 3, 6, 6);
        }
        return { cv: g.c, win: g.win, glow, pad: P };
    }
    function settlement(loc) {
        const k = loc.id + '|' + loc.faction;
        let s = SPRITES.get(k);
        if(!s) { s = build(loc); SPRITES.set(k, s); }
        return s;
    }

    // --- discovery sites (#58): a ruin, a farm, a tower, a cave, a camp, a lair, a boss's den
    const SITES = {};
    function buildSite(kind) {
        let g;
        if(kind === 'ruin') {
            g = sheet(16, 11);
            g.px(1, 4, 3, 7, '#9a9486'); g.px(1, 4, 1, 7, '#b4ae9f'); g.px(2, 3, 1, 1, '#9a9486');
            g.px(6, 7, 4, 4, '#8a8476'); g.px(11, 2, 3, 9, '#9a9486'); g.px(11, 2, 1, 9, '#b4ae9f'); g.px(13, 1, 1, 1, '#9a9486');
            g.px(4, 9, 2, 2, '#77736a'); g.px(10, 9, 1, 2, '#77736a'); g.px(12, 5, 1, 3, '#4f7a3a'); g.px(2, 7, 1, 2, '#4f7a3a');
        } else if(kind === 'farm') {
            g = sheet(16, 12);
            g.px(2, 5, 8, 6, '#8f7a5a'); g.px(2, 5, 1, 6, '#a8926e'); g.px(9, 5, 1, 6, '#6e5c42');
            for(let r = 0; r < 4; r++) g.px(1 + r, 4 - r, 10 - r * 2, 1, r === 1 ? null : '#6a5236');
            g.px(5, 8, 2, 3, '#2b2016'); g.px(3, 6, 1, 1, '#2b2016');
            for(let i = 11; i < 16; i += 2) g.px(i, 7, 1, 4, '#c9a94e');
        } else if(kind === 'tower') {
            g = sheet(10, 17);
            g.px(2, 3, 6, 14, '#a39c8c'); g.px(2, 3, 1, 14, '#bdb6a5'); g.px(7, 3, 1, 14, '#7c7568');
            g.px(1, 2, 8, 1, '#a39c8c'); g.px(1, 1, 1, 1, '#a39c8c'); g.px(4, 1, 1, 1, '#a39c8c'); g.px(7, 0, 1, 2, '#a39c8c');
            g.px(4, 6, 1, 2, '#2b2016'); g.px(4, 11, 2, 2, '#2b2016'); g.px(4, 14, 2, 3, '#2b2016');
        } else if(kind === 'cave') {
            g = sheet(18, 11);
            g.px(1, 5, 16, 6, '#7a766a'); g.px(3, 2, 12, 3, '#7a766a'); g.px(6, 0, 6, 2, '#8e8a7c');
            g.px(3, 2, 5, 3, '#908c7e'); g.px(1, 5, 4, 3, '#908c7e'); g.px(12, 6, 5, 5, '#5f5c52');
            g.px(6, 5, 6, 6, '#15120e'); g.px(7, 4, 4, 1, '#15120e'); g.px(5, 10, 8, 1, '#3b3830');
        } else if(kind === 'camp') {
            g = sheet(18, 10);
            for(let r = 0; r < 6; r++) { g.px(4 - r, 3 + r, r + 1, 1, '#b99a66'); g.px(5, 3 + r, r + 1, 1, '#94784c'); }
            for(let r = 0; r < 5; r++) { g.px(13 - r, 4 + r, r + 1, 1, '#a88a58'); g.px(14, 4 + r, r, 1, '#86693f'); }
            g.px(4, 6, 2, 3, '#2b2016'); g.px(8, 8, 3, 1, '#5a3d22'); g.px(9, 7, 1, 1, '#e0763a'); g.px(8, 9, 3, 1, '#5a5a5a');
        } else if(kind === 'lair') {
            g = sheet(18, 15);
            for(let i = 0; i < 18; i += 2) g.px(i, 7 + (i % 4 ? 0 : 1), 1, 8, i % 4 ? '#6e4c2e' : '#8a633d');
            g.px(4, 3, 10, 6, '#5c4128'); for(let r = 0; r < 3; r++) g.px(3 + r, 3 - r, 12 - r * 2, 1, '#4a3a2e');
            g.px(8, 10, 3, 5, '#1c140d'); g.px(16, 0, 1, 7, '#5a4a36'); g.px(15, 0, 3, 2, '#e6e0d0'); g.px(15, 1, 1, 1, '#1c140d'); g.px(17, 1, 1, 1, '#1c140d');
        } else {                                              // boss: a black keep on a scorched knoll
            g = sheet(22, 20);
            g.px(1, 16, 20, 4, '#3a2a24'); g.px(3, 15, 16, 1, '#4a342c');
            g.px(6, 5, 10, 11, '#3b3a40'); g.px(6, 5, 1, 11, '#55535c'); g.px(15, 5, 1, 11, '#28272c');
            g.px(4, 8, 4, 8, '#34333a'); g.px(14, 8, 4, 8, '#34333a'); crenels(g, 6, 5, 10, '#3b3a40');
            g.px(10, 11, 2, 5, '#b8342a'); g.px(8, 7, 1, 2, '#e0463a'); g.px(13, 7, 1, 2, '#e0463a'); g.px(10, 1, 1, 4, '#5a4a36'); g.px(11, 1, 3, 2, '#8a1c1c');
        }
        return (SITES[kind] = outline(g).c);
    }
    function site(ctx, s, big) {
        const kind = Game.SITE_KINDS[s.kind] && Game.SITE_KINDS[s.kind].boss ? 'boss' : s.kind;
        const cv = SITES[kind] || buildSite(kind), k = big / 11;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(cv, s.x - cv.width * k / 2, s.y + 14 - cv.height * k, cv.width * k, cv.height * k);
        return true;
    }

    // --- a caravan's covered wagon behind a walking horse, and the wolf pack's wolf
    const BEASTS = new Map();
    function cart(coat, moving, t, left) {
        const gait = moving ? 'walk' : 'stand', fi = Horse.frameOf(gait, t);
        const k = 'cart|' + coat + gait + fi + (left ? 'L' : 'R');
        let c = BEASTS.get(k);
        if(c) return c;
        const g = sheet(76, 36), gy = Horse.GROUND;
        g.px(2, gy - 13, 30, 5, '#7a5a36'); g.px(2, gy - 13, 30, 1, '#94703f'); g.px(2, gy - 9, 30, 1, '#5c4226');    // bed
        for(let x = 4; x < 30; x++) {                                          // the canvas cover's arch
            const u = (x - 4) / 25, top = Math.round(gy - 25 + 5 * (2 * u - 1) ** 2);
            g.px(x, top, 1, gy - 13 - top, x < 9 ? '#efe6cf' : x > 25 ? '#b9ad8f' : '#d9ceb1');
        }
        for(const x of [9, 17, 25]) g.px(x, gy - 24, 1, 11, '#a39778');         // hoops under the cover
        g.px(30, gy - 11, 14, 1, '#5c4226');                                   // the shaft to the horse
        const spin = moving ? (fi & 1) : 0;
        for(const cx of [8, 25]) {                                             // wheels, spokes turning
            for(let a = 0; a < 16; a++) { const r = a / 16 * Math.PI * 2; g.px(Math.round(cx + Math.cos(r) * 4), Math.round(gy - 4 + Math.sin(r) * 4), 1, 1, '#3e2c1a'); }
            if(spin) { g.px(cx - 3, gy - 4, 7, 1, '#6b4e2e'); g.px(cx, gy - 7, 1, 7, '#6b4e2e'); }
            else { for(let d = -2; d <= 2; d++) { g.px(cx + d, gy - 4 + d, 1, 1, '#6b4e2e'); g.px(cx + d, gy - 4 - d, 1, 1, '#6b4e2e'); } }
        }
        outline(g);
        g.x.drawImage(Horse.bake(coat, gait, fi, null), 28, 0);
        if(left) { const m = sheet(76, 36); m.x.translate(76, 0); m.x.scale(-1, 1); m.x.drawImage(g.c, 0, 0); c = m.c; } else c = g.c;
        c._ax = 0.5; c._ay = gy / 36;
        BEASTS.set(k, c);
        return c;
    }
    function wolf(moving, t, left) {
        const f = moving ? Math.floor(t / 110) % 4 : 0, k = 'wolf' + f + (left ? 'L' : 'R');
        let c = BEASTS.get(k);
        if(c) return c;
        const g = sheet(24, 15), gy = 14, fur = ['#a9afb8', '#7c828c', '#5b6068'];
        g.px(5, gy - 9, 13, 5, fur[1]); g.px(6, gy - 10, 10, 1, fur[0]); g.px(5, gy - 5, 13, 1, fur[2]);   // body
        g.px(17, gy - 11, 4, 4, fur[1]); g.px(17, gy - 12, 1, 1, fur[1]); g.px(19, gy - 12, 1, 1, fur[1]);   // head, ears
        g.px(21, gy - 9, 2, 2, fur[1]); g.px(22, gy - 9, 1, 1, '#2a2a2e'); g.px(19, gy - 10, 1, 1, '#e8c85a'); // muzzle, eye
        g.px(1, gy - 10, 4, 2, fur[1]); g.px(0, gy - 11, 2, 1, fur[0]);                                     // tail
        const legs = [[[6, 0], [9, 1], [14, 0], [17, 1]], [[7, 1], [8, 0], [15, 1], [16, 0]], [[6, 1], [9, 0], [14, 1], [17, 0]], [[5, 0], [10, 1], [13, 0], [18, 1]]][f];
        for(const [x, up] of legs) g.px(x, gy - 5, 1, 5 - up, up ? fur[2] : fur[1]);
        outline(g, '#15161a');
        if(left) { const m = sheet(24, 15); m.x.translate(24, 0); m.x.scale(-1, 1); m.x.drawImage(g.c, 0, 0); c = m.c; } else c = g.c;
        c._ax = 0.5; c._ay = gy / 15;
        BEASTS.set(k, c);
        return c;
    }

    // --- parties: the battle's own soldiers
    function partyLook(npc, band) {
        const h = Battle.idHash({ id: npc.id });
        const cloth = npc.type === 'bandit' ? 'bandit' : Swordsman.DYE[npc.faction] ? npc.faction : 'player';
        if(band && band.icon === 'wolf') return { kind: 'wolf' };
        if(band && band.icon === 'cart') return { kind: 'cart', coat: ['bay', 'grey'][h % 2], cloth,
                                                  guard: { kind: 'foot', armor: 2, weapon: 2, helm: 'cap', skin: (h >>> 3) % 4, hair: (h >>> 5) % 6, cloth } };
        if(band && band.icon === 'archer') return { kind: 'archer', cloth };
        const lordly = npc.type === 'lord' || npc.type === 'king' || npc.type === 'vizier';
        const tier = lordly ? 2 : npc.type === 'bandit' ? (band && band === BAND_KINDS.mountain ? 1 : 0) : 1;
        const rider = { armor: tier + 1, weapon: tier + 1, helm: ['', 'cap', 'greathelm'][tier] || (h % 2 ? 'nasal' : ''),
                        skin: (h >>> 3) % 4, hair: (h >>> 5) % 6, cloth };
        if(lordly || npc.type === 'patrol') return { kind: 'horse', rider, cloth, coat: ['bay', 'grey', 'black'][h % 3] };
        return Object.assign({ kind: 'foot' }, rider);
    }
    function playerLook() {
        const f = Game.playerFaction(), cloth = Swordsman.DYE[f] ? f : 'player';
        return Battle.spriteLook({ id: 'player', isPlayerTeam: true, cloth, mounted: !!state.player.equipment.horse });
    }
    // One figure; returns false when the art isn't ready (the caller falls back to the old icon)
    function figure(ctx, look, x, y, k, face, moving, t) {
        let spr = null, left = face < 0;
        if(look.kind === 'horse') spr = Mounted.art(look, { gait: moving ? 'walk' : 'stand', gt: t, facing: left ? 'left' : 'right', anim: 'Idle', t, dead: false });
        else if(look.kind === 'cart') spr = cart(look.coat, moving, t, left);
        else if(look.kind === 'wolf') spr = wolf(moving, t, left);
        else if(look.kind === 'archer') spr = Archer.art(look.cloth, moving ? 'Walk' : 'Idle', moving ? (left ? 'left' : 'right') : 'down', t);
        else spr = Swordsman.art(look, moving ? 'Walk' : 'Idle', moving ? (left ? 'left' : 'right') : 'down', t);
        if(!spr) return false;
        const w = spr.width * k, h = spr.height * k;
        ctx.drawImage(spr, x - spr._ax * w, y - spr._ay * h, w, h);
        return true;
    }
    function party(ctx, x, y, o) {
        if(!o.look || !Swordsman.ready()) return false;
        const now = performance.now(), m = o.id !== undefined ? Game.iconMotion(o.id, x, o.moving) : { face: 1, move: o.moving ? 1 : 0, seen: 0 };
        const big = o.look.kind === 'horse' || o.look.kind === 'cart';
        const k = (big ? 1.35 : 1.7) * (o.scale || 1), face = m.face < 0 ? -1 : 1, moving = m.move > 0.5;
        const t = now + (Battle.idHash({ id: o.id }) % 997) * 41;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if(o.id !== undefined && Anim.on()) ctx.globalAlpha = Anim.k(now - m.seen, 400, 'outQuad');
        ctx.beginPath(); ctx.ellipse(x, y, (big ? 30 : 20) * (o.scale || 1), 7 * (o.scale || 1), 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
        // a crowd walks in a column: one follower at 10+ men, two at 30+
        const extra = o.size >= 30 ? 2 : o.size >= 10 ? 1 : 0, back = -face;
        // (a caravan's column is its guards, walking behind the wagon)
        const fl = o.look.guard || o.look, gap = o.look.kind === 'cart' ? 62 : 16;
        for(let i = extra; i >= 1; i--) figure(ctx, fl, x + back * (gap + 16 * (i - 1)) * (o.scale || 1), y - 5 * i * (o.scale || 1), (fl === o.look ? k : 1.7 * (o.scale || 1)) * 0.82, face, moving, t + i * 130);
        const ok = figure(ctx, o.look, x, y, k, face, moving, t);
        // the party's banner, one sprite pixel wide, in its colour
        if(ok && o.banner) {
            const s = 2.2 * (o.scale || 1), bx = x - face * (o.look.kind === 'horse' ? 10 : o.look.kind === 'cart' ? 20 : 9) * (o.scale || 1),
                  top = y - (o.look.kind === 'horse' ? 64 : o.look.kind === 'cart' ? 58 : 50) * (o.scale || 1);
            ctx.fillStyle = '#5a4a36'; ctx.fillRect(bx - s / 2, top, s, y - top);
            const wave = Math.sin(now / 260 + x * 0.01) > 0 ? 1 : 0;
            ctx.fillStyle = o.banner;
            for(let r = 0; r < 4; r++) ctx.fillRect(bx + (face < 0 ? s / 2 : -s / 2 - (7 - r - wave) * s), top + r * s, (7 - r - (r ? wave : 0)) * s, s);
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(bx + (face < 0 ? s / 2 : -s / 2 - 7 * s), top + 3 * s, 7 * s, s * 0.6);
        }
        ctx.restore();
        return ok;
    }

    // --- labels, laid out in screen space: player first, then settlements, foes, the rest
    let labels = [];
    function label(wx, wy, text, o) { labels.push(Object.assign({ wx, wy, text }, o)); }
    function drawLabels(ctx, cam, W, H, blocked) {
        const z = cam.zoom, s = Game.uiScale(), fs = Math.round(13 * s + 1.5), ph = Math.round(fs * 1.55);
        const toS = (wx, wy) => [(wx - cam.x) * z + W / 2, (wy - cam.y) * z + H / 2];
        const taken = blocked.map(b => { const [x, y] = toS(b.x, b.y); return { x: x - b.w * z / 2, y: y - b.h * z, w: b.w * z, h: b.h * z }; });
        const hit = r => taken.some(t => r.x < t.x + t.w && r.x + r.w > t.x && r.y < t.y + t.h && r.y + r.h > t.y);
        labels.sort((a, b) => a.prio - b.prio);
        ctx.save();
        ctx.font = `600 ${fs}px Inter, sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        for(const L of labels) {
            const tw = ctx.measureText(L.text).width, dot = L.dot ? fs * 0.75 : 0, w = tw + dot + fs * 1.1, [sx, sy] = toS(L.wx, L.wy);
            if(sx < -w || sx > W + w || sy < -40 || sy > H + 40) continue;
            const up = L.up * z, dn = L.down * z;
            // above, below, right, left, then a row further out each way
            const mid = sy - ph / 2 - up / 2, far = Math.max(L.side * z + 4, 58);
            const spots = [[sx - w / 2, sy - up - ph - 2], [sx - w / 2, sy + dn + 2], [sx + L.side * z + 4, mid], [sx - L.side * z - 4 - w, mid],
                           [sx - w / 2, sy - up - ph * 2 - 4], [sx - w / 2, sy + dn + ph + 4], [sx + far, mid + ph + 2], [sx - far - w, mid + ph + 2]];
            let r = null;
            for(const [x, y] of spots) { const c = { x, y, w, h: ph }; if(!hit(c)) { r = c; break; } }
            if(!r) { if(!L.must) continue; r = { x: spots[0][0], y: spots[0][1], w, h: ph }; }
            taken.push(r);
            ctx.fillStyle = L.foe ? 'rgba(40,8,6,0.82)' : 'rgba(10,11,14,0.78)';
            ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, ph / 2); ctx.fill();
            ctx.lineWidth = 1; ctx.strokeStyle = L.foe ? 'rgba(255,107,90,0.8)' : L.edge || 'rgba(212,175,55,0.28)'; ctx.stroke();
            if(dot) { ctx.fillStyle = L.dot; ctx.beginPath(); ctx.arc(r.x + fs * 0.55 + dot / 2 - 1, r.y + ph / 2, dot / 2.4, 0, Math.PI * 2); ctx.fill(); }
            ctx.fillStyle = L.color; ctx.fillText(L.text, r.x + fs * 0.55 + dot, r.y + ph / 2 + 0.5);
        }
        ctx.restore();
        labels = [];
    }

    // --- the settlement scene (visual refresh step 5) ------------------------------------------
    // 300x94 pixels drawn 3x into the scene canvas's 900x280 units. The land behind is the
    // founding kingdom's (Swadian hills, Rhodok peaks, the Nord sea, Vaegir snow, the Khergit
    // steppe), the walls behind by settlement type, and every clickable building in the
    // kingdom's style. The still part is cached per settlement, time of day and button set; a
    // hover only redraws the gold outline, the sign and the tooltip.
    const SW = 300, SH = 94, SK = 3, HORIZON = 62;
    const LAND = {
        swadia:  { far: ['#9fbd8a', '#86a973'], hill: ['#6f9d4a', '#5b8a3e'], ground: ['#6f8440', '#7e9149', '#8c9c52'], look: 'hills' },
        rhodok:  { far: ['#aab3bd', '#8f99a4'], hill: ['#7b8a52', '#6a7846'], ground: ['#7a7c46', '#88894e', '#969658'], look: 'peaks' },
        nord:    { far: ['#6f93a6', '#4f7888'], hill: ['#4c7656', '#3e6448'], ground: ['#587a50', '#648659', '#709163'], look: 'sea' },
        vaegir:  { far: ['#d4dde1', '#b7c5cb'], hill: ['#c9d4d7', '#aebcc0'], ground: ['#9fb0ad', '#b3c1bf', '#ccd6d6'], look: 'snow' },
        khergit: { far: ['#c2bb7c', '#aea768'], hill: ['#a8a25b', '#968f4d'], ground: ['#9c9453', '#aba25c', '#bab06a'], look: 'steppe' }
    };
    const SKY = {
        day:   ['#5b98d4', '#78ade0', '#9bc4e8', '#c6dcec'],
        dusk:  ['#3a3f6e', '#7d5670', '#cc7548', '#e9b076'],
        night: ['#0a0f26', '#121937', '#1b2349', '#26305a']
    };
    const SCENE_KIND = {
        '👑': 'tower', '🛡': 'tower', '🏆': 'tower', '🍺': 'tavern', '🧓': 'house', '⛓': 'house', '🏭': 'shop', '📦': 'barn',
        '🛒': 'stall', '🍷': 'stall', '🪖': 'tent', '⚔': 'tent', '🤺': 'ring', '🔥': 'fire', '🐔': 'coop', '🚪': 'gate', '⏳': 'fire'
    };
    const BUILD = new Map(), BASES = new Map(), ICONS = {};

    // the town cards' line icon, as an image the canvas can stamp (drawn once, then cached)
    function iconImg(name, stroke, onload) {
        const k = name + stroke;
        if(ICONS[k]) return ICONS[k].complete ? ICONS[k] : null;
        const sym = document.getElementById('i-' + name);
        if(!sym) return null;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${sym.getAttribute('viewBox') || '0 0 24 24'}" width="48" height="48" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${sym.innerHTML}</svg>`;
        const im = new Image();
        im.onload = onload;
        im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        ICONS[k] = im;
        return null;
    }

    function bbox(g) {
        const d = g.x.getImageData(0, 0, g.w, g.h).data;
        let x0 = g.w, y0 = g.h, x1 = -1, y1 = -1;
        for(let y = 0; y < g.h; y++) for(let x = 0; x < g.w; x++) if(d[(y * g.w + x) * 4 + 3]) { if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
        return x1 < 0 ? { x: 0, y: 0, w: g.w, h: g.h } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    }
    // a copy of a sprite with a gold ring round it, for the building under the pointer
    function goldRing(src) {
        const g = sheet(src.width + 2, src.height + 2);
        g.x.drawImage(src, 1, 1);
        outline(g, '#ffd24a');
        return g.c;
    }

    // one clickable building, `w` wide and about `h` tall, standing on the sheet's last row
    function building(kind, cul, w, h, col) {
        const key = [kind, cul, w, h, col].join('|');
        if(BUILD.has(key)) return BUILD.get(key);
        const S = STYLE[cul], yurtish = cul === 'khergit', snow = cul === 'vaegir';
        const g = sheet(w, h + 16), gy = h + 15, cx = w >> 1;
        const awning = (x0, x1, y) => { for(let x = x0; x < x1; x++) { const on = ((x - x0) >> 2) & 1; g.px(x, y, 1, 3, on ? col : '#ede4cf'); g.px(x, y + 3, 1, 1, on ? '#00000055' : '#c9bfa7'); } };
        if(kind === 'tower') {
            if(yurtish) { yurt(g, cx, gy, w - 6, S, true); tugh(g, cx + (w >> 2), gy, col); }
            else {
                wall(g, 1, gy, w - 2, Math.round(h * 0.34), S);
                const tw = Math.max(8, Math.round(w * 0.42)) | 1, topH = S.top === 'cone' ? Math.ceil((tw + 2) * 0.9) : S.top === 'onion' ? 7 : S.top === 'wood' ? 4 : 1;
                tower(g, cx - (tw >> 1), gy, tw, Math.max(10, h - 2 - topH), S);
                flag(g, cx, Math.max(0, gy - (h - 2 - topH) - topH - 7), col);
                gate(g, cx - 2, gy, 4, 5);
            }
        } else if(kind === 'house' || kind === 'tavern' || kind === 'shop') {
            if(yurtish) { yurt(g, cx, gy, w - 8, S); if(kind === 'shop') { g.px(w - 7, gy - 12, 2, 12, '#7a5a38'); g.px(w - 8, gy - 13, 4, 2, '#b8b0a0'); } }
            else {
                const hw = w - 8, hh = Math.round(h * 0.5);
                house(g, 4, gy, hw, hh, S, snow);
                for(let x = 6; x < 4 + hw - 2; x += 5) if(Math.abs(x - (4 + (hw >> 1))) > 2) g.window(x, gy - hh + 3);
                if(kind === 'shop') {                           // a workshop's chimney, smoking
                    g.px(w - 10, gy - hh - Math.ceil((hw + 2) / 2) + 1, 3, 7, S.wall[2]);
                    for(const [dx, dy] of [[0, -3], [1, -5], [-1, -7], [0, -9]]) g.px(w - 9 + dx, gy - hh - Math.ceil((hw + 2) / 2) + dy, 2, 2, '#b4b0a8');
                }
            }
            if(kind === 'tavern') { g.px(w - 4, gy - Math.round(h * 0.5) - 1, 1, 4, '#5a4a36'); g.px(w - 7, gy - Math.round(h * 0.5) + 2, 5, 4, '#7a5a36'); g.px(w - 6, gy - Math.round(h * 0.5) + 3, 3, 2, '#e0b852'); }
        } else if(kind === 'barn') {
            const bw = w - 4, bh = Math.round(h * 0.55);
            block(g, 2, gy - bh, bw, bh, cul === 'khergit' || cul === 'rhodok' ? S.wall || STYLE.rhodok.wall : ['#b0503a', '#8f3e2d', '#6e2f22']);
            gable(g, 1, gy - bh, bw + 2, S.roof || STYLE.nord.roof, snow);
            const dw = Math.round(bw * 0.4); g.px(cx - (dw >> 1), gy - bh + 4, dw, bh - 4, '#5a3d22');
            for(let i = 0; i < dw; i++) { g.px(cx - (dw >> 1) + i, gy - bh + 4 + Math.round(i * (bh - 5) / dw), 1, 1, '#c9a86a'); g.px(cx + (dw >> 1) - 1 - i, gy - bh + 4 + Math.round(i * (bh - 5) / dw), 1, 1, '#c9a86a'); }
        } else if(kind === 'stall') {
            const top = gy - Math.round(h * 0.62);
            g.px(3, top + 3, 2, gy - top - 3, '#6b4e2e'); g.px(w - 5, top + 3, 2, gy - top - 3, '#6b4e2e');
            awning(1, w - 1, top);
            g.px(4, gy - 8, w - 8, 3, '#8a6a40'); g.px(4, gy - 8, w - 8, 1, '#a88452');
            for(let x = 6; x < w - 7; x += 4) { const c = ['#c9a94e', '#b8483a', '#6f9a3a', '#d8cfb8'][(x >> 2) % 4]; g.px(x, gy - 10, 3, 2, c); }
            g.px(6, gy - 5, 4, 5, '#7a5a36'); g.px(w - 10, gy - 5, 4, 5, '#7a5a36');
        } else if(kind === 'tent') {
            const P = yurtish ? S.felt : ['#efe6cf', '#d2c7a9', '#a99f85'], th = Math.round(h * 0.75);
            for(let r = 0; r < th; r++) { const hw = Math.round((w / 2 - 3) * (r + 1) / th); g.px(cx - hw, gy - th + r, hw, 1, P[0]); g.px(cx, gy - th + r, hw + 1, 1, P[1]); }
            for(let r = 4; r < th; r += 5) { const hw = Math.round((w / 2 - 3) * (r + 1) / th); g.px(cx - hw, gy - th + r, hw * 2 + 1, 1, col); }
            for(let r = 0; r < Math.round(th * 0.5); r++) { const hw = Math.round(3 * (r + 1) / (th * 0.5)); g.px(cx - hw, gy - Math.round(th * 0.5) + r, hw * 2 + 1, 1, '#3a2f22'); }
            g.px(cx, gy - th - 4, 1, 4, '#5a4a36'); g.px(cx + 1, gy - th - 4, 3, 2, col);
            for(let i = 0; i < 3; i++) g.px(w - 4 - i * 2, gy - 12, 1, 12, '#6b4e2e'), g.px(w - 4 - i * 2, gy - 13, 1, 1, '#c8ccd2');
        } else if(kind === 'ring') {
            const ry = Math.round(h * 0.28), rx = (w >> 1) - 2, ccy = gy - ry;
            for(let y = -ry; y <= ry; y++) { const hw = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2)); g.px(cx - hw, ccy + y, hw * 2 + 1, 1, '#c9ad78'); }
            for(let a = 0; a < 20; a++) { const t = a / 20 * Math.PI * 2, x = Math.round(cx + Math.cos(t) * rx), y = Math.round(ccy + Math.sin(t) * ry); g.px(x, y - 4, 1, 5, '#6b4e2e'); }
            for(let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; g.px(Math.round(cx + Math.cos(t) * rx), Math.round(ccy + Math.sin(t) * ry) - 3, 1, 1, '#8a6a40'); }
            g.px(cx, ccy - 9, 1, 9, '#6b4e2e'); g.px(cx + 1, ccy - 9, 4, 3, col);
        } else if(kind === 'fire') {
            g.px(cx - 6, gy - 2, 13, 2, '#6b6a62'); g.px(cx - 5, gy - 4, 11, 2, '#5a3d22'); g.px(cx - 4, gy - 3, 3, 1, '#7a5230');
            for(const [dx, dy, c] of [[-2, -6, '#e0763a'], [0, -9, '#f0a040'], [1, -7, '#ffd36a'], [-1, -7, '#f0a040'], [2, -6, '#e0763a'], [0, -11, '#e0763a'], [0, -6, '#fff1b0']]) g.px(cx + dx, gy + dy, 2, 2, c);
            g.win.push([cx, gy - 7]);
            g.px(cx - 10, gy - 5, 5, 5, '#7a5a36'); g.px(cx + 6, gy - 4, 6, 4, '#7a5a36');
        } else if(kind === 'coop') {
            g.px(4, gy - 9, 14, 9, '#8a6a40'); g.px(4, gy - 9, 14, 1, '#a88452'); gable(g, 3, gy - 9, 16, ['#9c7a4a', '#7a5a36']);
            g.px(9, gy - 5, 4, 5, '#2b2016'); for(let i = 0; i < 6; i++) g.px(13 + i, gy - 1 - (i >> 1), 1, 1, '#6b4e2e');
            g.px(w - 9, gy - 5, 4, 3, '#efe9dc'); g.px(w - 6, gy - 7, 2, 2, '#efe9dc'); g.px(w - 5, gy - 8, 1, 1, '#d8402e'); g.px(w - 4, gy - 6, 1, 1, '#e0a030'); g.px(w - 8, gy - 2, 1, 2, '#e0a030');
        } else {                                              // the gate out
            const gh = Math.round(h * 0.8);
            if(S.top === 'wood' || yurtish) { for(let i = 0; i < w - 4; i++) g.px(2 + i, gy - gh + (i % 2), 1, gh - (i % 2), i % 3 ? '#7f5a37' : '#a1784d'); }
            else { block(g, 2, gy - gh, w - 4, gh, S.wall); crenels(g, 2, gy - gh, w - 4, S.wall[1]); }
            const aw = Math.round(w * 0.36); g.px(cx - (aw >> 1), gy - Math.round(gh * 0.62), aw, Math.round(gh * 0.62), '#2b2016');
            g.px(cx - (aw >> 1) + 1, gy - Math.round(gh * 0.62) - 1, aw - 2, 1, '#2b2016');
            g.px(cx - (aw >> 1) - 3, gy - Math.round(gh * 0.62), 2, Math.round(gh * 0.62), '#6b4e2e'); g.px(cx + (aw >> 1) + 1, gy - Math.round(gh * 0.62), 2, Math.round(gh * 0.62), '#6b4e2e');
            g.win.push([cx - (aw >> 1) - 4, gy - Math.round(gh * 0.62) - 3]); g.win.push([cx + (aw >> 1) + 3, gy - Math.round(gh * 0.62) - 3]);   // torches
        }
        outline(g);
        const b = { cv: g.c, win: g.win, box: bbox(g), ring: null };
        b.ring = goldRing(g.c);
        BUILD.set(key, b);
        return b;
    }

    // the still part of a scene: sky, land, walls behind, ground, the buildings in two rows
    function sceneBase(loc, slots, band) {
        const cul = culture(loc), L = LAND[cul] || LAND.swadia, S = STYLE[cul], col = (FACTIONS[loc.faction] || { color: '#ffcc00' }).color;
        const key = [loc.id, loc.faction, band, slots.map(s => s.kind).join()].join('|');
        if(BASES.has(key)) return BASES.get(key);
        const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH;
        const x = cv.getContext('2d'), R = i => hash(i, loc.id.length, 97 + loc.id.charCodeAt(0));
        const px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
        // sky in four dithered bands
        const sky = SKY[band];
        for(let y = 0; y < HORIZON; y++) for(let xx = 0; xx < SW; xx++) {
            const f = y / HORIZON * 3.999 + (dith(xx, y) - 0.5) * 0.9;
            px(xx, y, 1, 1, sky[Math.max(0, Math.min(3, f | 0))]);
        }
        if(band === 'day') for(let k = 0; k < 4; k++) {                    // a few clouds
            const cx = 20 + R(k) * 260, cy = 8 + R(k + 9) * 18, cw = 14 + R(k + 5) * 16;
            px(cx, cy, cw, 3, '#eef4f8'); px(cx + 3, cy - 2, cw - 8, 2, '#f8fbfd'); px(cx + 2, cy + 3, cw - 3, 1, '#d6e4ee');
        }
        // the land beyond
        const ridge = (base, amp, fq, c, seed) => { for(let xx = 0; xx < SW; xx++) { const top = Math.round(base - amp * (0.5 + 0.5 * Math.sin(xx * fq + seed)) - amp * 0.4 * noise(xx / 23, seed, 5)); px(xx, top, 1, HORIZON - top + 1, c); } };
        if(L.look === 'peaks') {
            for(let k = 0; k < 9; k++) { const m = mountain((k * 5 + loc.id.length) % 12); x.drawImage(m, Math.round(k * 36 - 8 + R(k) * 10), HORIZON - m.height + 4); }
            ridge(HORIZON - 4, 5, 0.05, L.hill[1], 2);
        } else if(L.look === 'sea') {
            ridge(HORIZON - 16, 6, 0.03, L.far[1], 1);
            px(0, HORIZON - 12, SW, 12, '#3f7396'); for(let k = 0; k < 30; k++) px(R(k + 40) * SW, HORIZON - 11 + R(k + 70) * 10, 3, 1, '#7fb0cc');
            const bx = 40 + R(3) * 200; px(bx, HORIZON - 7, 12, 2, '#5a3d22'); px(bx + 5, HORIZON - 15, 1, 8, '#5a3d22'); px(bx + 6, HORIZON - 14, 4, 5, '#d8cfb8');
        } else if(L.look === 'snow') {
            ridge(HORIZON - 10, 9, 0.04, L.far[0], 3); ridge(HORIZON - 3, 5, 0.07, L.hill[1], 6);
            for(let k = 0; k < 14; k++) x.drawImage(tree('pine', k & 1), Math.round(R(k + 20) * SW), HORIZON - 16 + Math.round(R(k + 30) * 6));
        } else if(L.look === 'steppe') {
            ridge(HORIZON - 5, 3, 0.02, L.far[1], 4); ridge(HORIZON - 1, 2, 0.05, L.hill[0], 8);
        } else {
            ridge(HORIZON - 12, 8, 0.035, L.far[1], 1); ridge(HORIZON - 4, 6, 0.06, L.hill[1], 5);
            for(let k = 0; k < 10; k++) x.drawImage(tree('broad', k & 1), Math.round(R(k + 20) * SW), HORIZON - 15 + Math.round(R(k + 30) * 5));
        }
        // the settlement behind: a city wall, a castle's keep, a village's fence and fields
        const back = sheet(SW, SH), gy = HORIZON + 2;
        if(loc.type === 'city') {
            if(cul === 'khergit') {
                for(let k = 0; k < 11; k++) yurt(back, 14 + k * 27, gy - 1, 14 + (k % 3) * 3, S, k === 5);
                tugh(back, 150, gy - 12, col);
            } else {
                for(let k = 0; k < 9; k++) house(back, 8 + k * 33 + Math.round(R(k + 50) * 8), gy - 10, 10 + (k % 3) * 2, 6, S, cul === 'vaegir');
                tower(back, 142, gy - 8, 14, 22, S); flag(back, 149, gy - 8 - 22 - (S.top === 'cone' ? 14 : S.top === 'onion' ? 8 : 5) - 6, col);
                wall(back, 0, gy, SW, 10, S);
                for(let k = 0; k < 5; k++) tower(back, 18 + k * 64, gy, 9, 17, S);
            }
        } else if(loc.type === 'castle') {
            const wS = cul === 'khergit' ? STYLE.rhodok : S;
            tower(back, 118, gy - 6, 22, 30, wS); flag(back, 128, gy - 6 - 30 - (wS.top === 'cone' ? 22 : wS.top === 'onion' ? 8 : 5) - 6, col);
            wall(back, 0, gy, SW, 12, wS);
            for(let k = 0; k < 5; k++) tower(back, 10 + k * 70, gy, 12, 20, wS);
        } else {
            if(cul !== 'khergit') {                                    // fields, a fence, a mill or a boat
                for(let k = 0; k < 6; k++) { const fx = k * 50 + Math.round(R(k + 60) * 10), P = FIELDS[k % 4]; for(let r = 0; r < 4; r++) back.px(fx, gy - 4 + r, 44, 1, `rgb(${P[r & 1].join(',')})`); }
                if(cul === 'swadia' || cul === 'rhodok') {
                    const mx = 220 + Math.round(R(1) * 50);
                    block(back, mx, gy - 16, 7, 12, S.wall); cone(back, mx + 3, gy - 16, 9, 5, S.roof);
                    for(let i = -6; i <= 6; i++) { back.px(mx + 3 + i, gy - 18 + i, 1, 1, '#7a5a36'); back.px(mx + 3 + i, gy - 18 - i, 1, 1, '#7a5a36'); }
                }
            } else for(let k = 0; k < 5; k++) yurt(back, 30 + k * 60 + Math.round(R(k) * 20), gy - 2, 11, S);
            for(let xx = 0; xx < SW; xx += 6) { back.px(xx, gy - 2, 1, 5, '#7a5a38'); back.px(xx, gy - 1, 6, 1, '#8a6a40'); }
        }
        outline(back);
        x.drawImage(back.c, 0, 0);
        // the ground, a road along the front
        for(let y = HORIZON + 3; y < SH; y++) for(let xx = 0; xx < SW; xx++) {
            const n = noise(xx / 14, y / 6, 17) * 2.99 + (dith(xx, y) - 0.5) * 0.7;
            px(xx, y, 1, 1, L.ground[Math.max(0, Math.min(2, n | 0))]);
        }
        for(let xx = 0; xx < SW; xx++) { const top = Math.round(SH - 9 + xx * 4 / SW); px(xx, top, 1, SH - top, (xx + top) % 7 ? '#a08a5e' : '#8e7850'); px(xx, top, 1, 1, '#8e7850'); }
        for(let k = 0; k < 40; k++) { const gx = Math.round(R(k + 200) * SW), gy2 = HORIZON + 6 + Math.round(R(k + 300) * 18); px(gx, gy2, 1, 2, L.hill[1]); px(gx + 1, gy2 + 1, 1, 1, L.hill[1]); }
        // the buildings
        for(const s of slots) x.drawImage(s.b.cv, s.x, s.base - s.b.cv.height + 1);
        const out = { cv, cul, col };
        if(BASES.size > 40) BASES.delete(BASES.keys().next().value);
        BASES.set(key, out);
        return out;
    }

    // a round pixel sun, or a moon with its right side bitten off by shadow
    function disc(ctx, cx, cy, r, colr, bite) {
        ctx.fillStyle = colr;
        for(let y = -r; y <= r; y++) for(let x = -r; x <= r; x++) {
            if(x * x + y * y > r * r + r * 0.6) continue;
            if(bite && (x - 2) * (x - 2) + (y + 1) * (y + 1) <= (r - 1) * (r - 1)) continue;
            ctx.fillRect((cx + x) * SK, (cy + y) * SK, SK, SK);
        }
    }

    // Draws the scene into `ctx` (already scaled to 900x280 units) and returns the hot rects,
    // one per button, in those units
    function scene(ctx, loc, btns, hover, G) {
        const hour = state.time.hour, band = hour < 6 || hour >= 20 ? 'night' : (hour >= 18 || hour < 8) ? 'dusk' : 'day';
        // two rows as before (odd buttons in the back, even in front), but taking turns across the
        // width, so a back building's sign never lands on the front building below it
        const slots = [], step = (SW - 16) / Math.max(1, btns.length);
        btns.forEach((btn, k) => {
            const backRow = k % 2 === 1, icon = G.sceneIcon(btn.innerHTML).replace('\uFE0F', ''), kind = SCENE_KIND[icon] || 'house';
            const w = (backRow ? 34 : 42) + (kind === 'ring' ? 6 : 0);
            slots.push({ btn, icon, kind, w, h: backRow ? 22 : 28, idx: k, base: backRow ? HORIZON + 6 : SH - 4,
                         x: Math.round(8 + k * step + (step - w) / 2 + (hash(k, loc.id.length, 99) - 0.5) * 4) });
        });
        slots.sort((a, b) => a.base - b.base);                  // the back row first
        const cul = culture(loc), col = (FACTIONS[loc.faction] || { color: '#ffcc00' }).color;
        for(const s of slots) s.b = building(s.kind, cul, s.w, s.h, col);   // cached, like the base
        const base = sceneBase(loc, slots, band), hot = [];
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(base.cv, 0, 0, SW * SK, SH * SK);
        // dusk and night over everything, then what shines through it
        if(band !== 'day') { ctx.fillStyle = band === 'night' ? 'rgba(10,16,48,0.52)' : 'rgba(90,40,30,0.18)'; ctx.fillRect(0, 0, SW * SK, SH * SK); }
        if(band === 'night') {
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            for(let k = 0; k < 45; k++) ctx.fillRect(Math.round(hash(k, 1, 91) * SW) * SK, Math.round(hash(k, 2, 91) * 44) * SK, SK, SK);
            disc(ctx, 40 + hash(3, 3, 91) * 220 | 0, 12, 4, '#e6ecff', -2);   // a crescent moon
        } else if(band === 'day') {
            disc(ctx, 30 + hash(4, 4, 91) * 230 | 0, 13, 5, '#fff4c8', 0);
        }
        for(const s of slots) {
            const top = s.base - s.b.cv.height + 1, bx = s.x + s.b.box.x, by = top + s.b.box.y;
            // the button's own label (a town card also holds a hint and a price), without its emoji
            const label = (s.btn.querySelector('.sr-only') || s.btn).textContent.replace(/^[^\p{L}\p{N}]+/u, '');
            hot[s.idx] = { x: bx * SK, y: by * SK, w: s.b.box.w * SK, h: s.b.box.h * SK, btn: s.btn, icon: s.icon, label };
            if(band === 'night') for(const [wx, wy] of s.b.win) {
                ctx.fillStyle = '#ffd36a'; ctx.fillRect((s.x + wx) * SK, (top + wy) * SK, SK, SK);
                ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = G.radial(ctx, 12, 'rgba(255,180,80,0.55)', 'rgba(255,150,60,0)');
                ctx.save(); ctx.translate((s.x + wx + 0.5) * SK, (top + wy + 0.5) * SK); ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill(); ctx.restore();
                ctx.globalCompositeOperation = 'source-over';
            }
            if(s.idx === hover) ctx.drawImage(s.b.ring, (s.x - 1) * SK, (top - 1) * SK, s.b.ring.width * SK, s.b.ring.height * SK);
        }
        // signs: the town card's line icon on a small plate over each building
        for(const s of slots) {
            const h = hot[s.idx], card = G.TOWN_CARD[s.icon], on = s.idx === hover;
            if(!card) continue;
            const im = iconImg(card[0], on ? '#1a1406' : '#f2d27a', () => G._sceneLoc === loc && G.renderScene(loc));
            const pw = 30, ph = 26, px = Math.round(h.x + h.w / 2 - pw / 2), py = Math.max(4, h.y - ph - 4);
            h.top = py;                                        // the tooltip goes above the sign
            ctx.fillStyle = on ? 'rgba(255,204,0,0.95)' : 'rgba(12,12,16,0.82)';
            ctx.strokeStyle = on ? '#fff' : 'rgba(255,204,0,0.5)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 6); ctx.fill(); ctx.stroke();
            if(im) ctx.drawImage(im, px + 6, py + 4, 18, 18);
        }
        return hot;
    }

    // --- the start screen's marching column (2.0.0): the game's soldiers walking past a keep.
    // A 320x64 canvas, ~20 fps; it stops itself the moment the start screen isn't showing.
    let marchId = null;
    function march() {
        const cv = document.getElementById('march-canvas');
        if(!cv || !cv.getContext || marchId !== null) return;          // double-start guard
        Swordsman.load(); Archer.load();
        const x = cv.getContext('2d'), W = cv.width, H = cv.height, GY = 55;
        x.imageSmoothingEnabled = false;
        const COL = [
            { kind: 'foot', armor: 1, weapon: 1, helm: '', skin: 0, hair: 0, cloth: 'player' },
            { kind: 'foot', armor: 2, weapon: 2, helm: 'cap', skin: 1, hair: 2, cloth: 'swadia' },
            { kind: 'archer', cloth: 'rhodok' },
            { kind: 'horse', rider: { armor: 3, weapon: 3, helm: 'greathelm', skin: 0, hair: 1, cloth: 'vaegir' }, cloth: 'vaegir', coat: 'grey' },
            { kind: 'foot', armor: 3, weapon: 3, helm: 'nasal', skin: 2, hair: 4, cloth: 'nord' },
            { kind: 'horse', rider: { armor: 2, weapon: 2, helm: 'nasal', skin: 3, hair: 5, cloth: 'khergit' }, cloth: 'khergit', coat: 'bay' }
        ];
        const GAP = 62, SPAN = COL.length * GAP;
        let ground = null, keep = null, last = 0;
        const still = typeof Anim !== 'undefined' && !Anim.on();
        const frame = now => {
            const scr = document.getElementById('start-screen');
            if(!scr || !scr.classList.contains('active')) { marchId = null; return; }
            marchId = still ? null : requestAnimationFrame(frame);
            if(now - last < 48 || !Swordsman.ready()) return;
            last = now;
            if(!ground) {                                  // grass, a road, the keep: drawn once
                const g = sheet(W, H);
                for(let y = GY - 6; y < H; y++) for(let xx = 0; xx < W; xx++) {
                    const road = y >= GY - 2 && y <= GY + 3, n = noise(xx / 9, y / 4, 23) * 2.99 + (dith(xx, y) - 0.5) * 0.7;
                    g.px(xx, y, 1, 1, road ? ((xx + y) % 5 ? '#9c8458' : '#86704a') : ['#4d6f36', '#5b7e3e', '#6a8d47'][Math.max(0, Math.min(2, n | 0))]);
                }
                for(let xx = 0; xx < W; xx += 1) if(dith(xx, 3) < 0.35) g.px(xx, GY - 7, 1, 1, '#5b7e3e');
                ground = g.c;
                keep = settlement({ id: 'castle_s1', type: 'castle', faction: 'swadia' });
            }
            x.clearRect(0, 0, W, H);
            x.drawImage(keep.cv, W - keep.cv.width * 2 - 40, GY - keep.cv.height * 2 + 3, keep.cv.width * 2, keep.cv.height * 2);
            x.drawImage(ground, 0, 0);
            COL.forEach((look, i) => {
                const px = ((now * 0.018 + i * GAP) % SPAN) - 40, t = now + i * 170;
                let spr;
                if(look.kind === 'horse') spr = Mounted.art(look, { gait: 'walk', gt: t, facing: 'right', anim: 'Idle', t, dead: false });
                else if(look.kind === 'archer') spr = Archer.art(look.cloth, 'Walk', 'right', t);
                else spr = Swordsman.art(look, 'Walk', 'right', t);
                if(spr) x.drawImage(spr, Math.round(px - spr._ax * spr.width), Math.round(GY + 1 - spr._ay * spr.height));
            });
        };
        marchId = requestAnimationFrame(frame);
    }

    // --- item icons (visual refresh step 5): 16x16 pixel art per item. A weapon's tier shows in
    // its metal (iron, steel, patterned Damascus, royal silver on gold) and grip; the same emoji
    // used to stand for all four swords.
    const METAL = [['#8d939b', '#b3b9c1', '#5f646b'], ['#b9c4cf', '#e3e9ef', '#7d8893'], ['#9ea5b3', '#d0d5de', '#636878'], ['#e3e9f0', '#ffffff', '#9aa6b2']];
    const GRIP = ['#6b4a2c', '#3e2c1f', '#8a5a2a', '#7a2a2a'], TRIM = ['#5f646b', '#7d8893', '#b07a3a', '#e0b852'];
    const ICON_URL = {};
    function tierOf(item) {
        if(item.type !== 'weapon' && item.type !== 'horse') return 0;
        item = ITEMS[item.id] || item;                        // the bag holds copies: rank the original
        const fam = item.id.split('_')[0], same = Object.values(ITEMS).filter(i => i.type === item.type && i.id.split('_')[0] === fam).sort((a, b) => a.basePrice - b.basePrice);
        return Math.min(3, Math.max(0, same.indexOf(item)));
    }
    function drawItem(g, item) {
        const t = tierOf(item), M = METAL[t], id = item.id, P = (x, y, c, w = 1, h = 1) => g.px(x, y, w, h, c);
        const diag = (x0, y0, n, c, c2) => { for(let i = 0; i < n; i++) { P(x0 - i, y0 + i, c); if(c2) P(x0 - i + 1, y0 + i, c2); } };
        if(item.type === 'weapon' && item.weaponType === 'oneHanded' && !id.startsWith('mace')) {       // swords, the wolf-tooth dagger
            const dag = id === 'kurt_disi_hancer', n = dag ? 6 : 9, M2 = dag ? ['#c9c3b0', '#f0ead8', '#8a8470'] : M;
            diag(13, 1 + (9 - n), n, M2[0], M2[1]);
            if(t === 2) for(let i = 1; i < n; i += 2) P(13 - i, 1 + (9 - n) + i, M2[2]);          // Damascus ripple
            for(let i = -2; i <= 2; i++) P(4 + i, 11 + i, dag ? '#d8d0b8' : TRIM[t]);             // crossguard
            P(3, 12, GRIP[t]); P(2, 13, GRIP[t]); P(1, 14, TRIM[t], 2, 1);
        } else if(id.startsWith('mace')) {
            diag(9, 6, 7, GRIP[t]);
            if(t === 3) { P(8, 2, M[0], 6, 3); P(8, 2, M[1], 6, 1); P(12, 5, M[2], 2, 1); }             // war hammer
            else {
                P(10, 2, M[0], 4, 4); P(11, 1, M[0], 2, 6); P(9, 3, M[0], 6, 2); P(11, 2, M[1], 1, 2);
                if(t >= 1) { P(10, 1, M[2]); P(13, 1, M[2]); P(10, 6, M[2]); P(13, 6, M[2]); }
                if(t === 2) { P(12, 0, M[1]); P(15, 3, M[1]); P(8, 3, M[1]); P(12, 7, M[1]); }          // spikes
            }
        } else if(item.weaponType === 'twoHanded') {                                                     // axes
            diag(11, 3, 11, GRIP[t]);
            for(let y = 0; y < 8; y++) { const w = y < 1 || y > 6 ? 2 : y < 2 || y > 5 ? 3 : 4; P(11, y, M[y < 3 ? 1 : 0], w, 1); }
            P(14, 1, M[2], 1, 6);
            if(t === 3) { P(8, 1, M[0], 2, 4); P(8, 1, M[1]); }                                        // the headsman's back spike
            if(t >= 2) P(12, 3, TRIM[t], 1, 2);
        } else if(item.weaponType === 'polearm') {                                                      // lances
            diag(12, 3, 11, GRIP[t]);
            P(13, 0, M[0], 2, 3); P(12, 1, M[0], 2, 2); P(14, 0, M[1]); P(15, 0, M[1]);
            if(t >= 1) P(10, 5, TRIM[t], 2, 1);
            if(t >= 2) { P(10, 3, t === 3 ? '#2e6fb8' : '#b8342a', 1, 3); P(9, 3, t === 3 ? '#2e6fb8' : '#b8342a', 1, 2); }
        } else if(item.weaponType === 'bow') {
            const storm = id === 'firtina_yayi', wood = storm ? '#35507a' : ['#8a5a2a', '#4a3a2a', '#7a4a1a', '#5a2a1a'][t];
            for(let y = 1; y <= 14; y++) { const x = 4 + Math.round(7 * Math.sin(Math.PI * (y - 1) / 13)); P(x, y, wood); P(x - 1, y, wood); }
            for(let y = 2; y <= 13; y++) P(4, y, storm ? '#9fd0ff' : '#e8e2d0');
            P(3, 0, storm ? '#9fd0ff' : TRIM[t], 2, 1); P(3, 15, storm ? '#9fd0ff' : TRIM[t], 2, 1);
        } else if(item.type === 'shield') {
            for(let y = 1; y < 15; y++) { const hw = y < 9 ? 6 : Math.max(1, 6 - (y - 8)); P(8 - hw, y, '#8a5a2a', hw * 2, 1); }
            for(let y = 1; y < 15; y++) { const hw = y < 9 ? 6 : Math.max(1, 6 - (y - 8)); P(8 - hw, y, '#9aa0a8'); P(8 + hw - 1, y, '#6f757c'); }
            P(2, 1, '#b3b9c1', 12, 1); P(7, 6, '#b3b9c1', 2, 3); P(6, 7, '#9aa0a8', 4, 1);
        } else if(item.type === 'armor') {
            const C = id === 'leather' ? ['#9a6a3a', '#7a4f28', '#b8844c'] : id === 'mail' ? ['#9aa0a8', '#6f757c', '#c1c7ce'] : id === 'dev_orsu_zirhi' ? ['#4a4450', '#2e2a33', '#6e6678'] : ['#b9c4cf', '#7d8893', '#e3e9ef'];
            P(2, 2, C[0], 4, 3); P(10, 2, C[0], 4, 3); P(4, 3, C[0], 8, 11); P(7, 3, C[1], 2, 2);
            P(4, 3, C[2], 1, 10); P(11, 3, C[1], 1, 11); P(4, 11, C[1], 8, 1);
            if(id === 'mail') for(let y = 5; y < 13; y += 2) for(let x = 5 + (y & 2 ? 1 : 0); x < 11; x += 2) P(x, y, C[1]);
            if(id === 'plate' || id === 'dev_orsu_zirhi') { P(5, 7, C[1], 6, 1); P(5, 9, C[1], 6, 1); if(id === 'dev_orsu_zirhi') P(4, 11, '#b8342a', 8, 1); }
            if(id === 'leather') { for(let y = 5; y < 11; y += 2) P(7, y, '#e0c080'); P(4, 11, '#5a3a1a', 8, 1); }
        } else if(item.type === 'helmet') {
            if(id === 'cap') { P(3, 6, '#8a5a2a', 10, 5); P(4, 4, '#8a5a2a', 8, 2); P(6, 3, '#8a5a2a', 4, 1); P(4, 5, '#b07a3a', 3, 3); P(2, 10, '#6b4a2c', 12, 2); }
            else if(id === 'nasal') { for(let y = 1; y < 11; y++) { const hw = Math.min(5, 1 + (y >> 1)); P(8 - hw, y, M[0], hw * 2, 1); P(8 - hw, y, '#c9d0d8'); } P(2, 10, '#6f757c', 12, 2); P(7, 12, '#6f757c', 2, 3); }
            else { P(3, 2, '#9aa0a8', 10, 12); P(4, 1, '#9aa0a8', 8, 1); P(3, 2, '#c1c7ce', 2, 12); P(12, 2, '#6f757c', 1, 12); P(4, 6, '#1a1611', 8, 1); P(8, 9, '#1a1611', 1, 1); P(10, 9, '#1a1611', 1, 1); P(8, 7, '#6f757c', 1, 6); }
        } else if(item.type === 'gloves') {
            const C = id === 'gloves' ? ['#9a6a3a', '#7a4f28'] : ['#b9c4cf', '#7d8893'];
            P(4, 7, C[0], 8, 6); P(4, 3, C[0], 2, 5); P(6, 2, C[0], 2, 5); P(8, 2, C[0], 2, 5); P(10, 3, C[0], 2, 5); P(12, 8, C[0], 2, 3);
            P(4, 12, C[1], 8, 2); P(11, 7, C[1], 1, 5);
        } else if(item.type === 'boots') {
            const C = id === 'shoes' ? ['#8a5a2a', '#5a3a1a'] : ['#b9c4cf', '#7d8893'];
            P(5, 1, C[0], 5, 11); P(5, 10, C[0], 9, 4); P(5, 13, C[1], 9, 2); P(9, 1, C[1], 1, 11); if(id === 'greaves') { P(5, 4, C[1], 5, 1); P(5, 7, C[1], 5, 1); }
        } else if(item.type === 'horse') {
            const coat = { horse_kib: ['#8c5530', '#6b3f22'], horse_midilli: ['#b8844c', '#8c5a30'], horse: ['#6b3f22', '#4a2a18'], horse_dag: ['#a7a7b1', '#83838f'],
                           horse_cenk: ['#38323c', '#262229'], horse_zirhli: ['#6b3f22', '#4a2a18'], horse_demir: ['#4b4450', '#38323c'], han_kisragi: ['#ece6da', '#c9c1b0'] }[id] || ['#8c5530', '#6b3f22'];
            P(5, 3, coat[0], 5, 11); P(8, 2, coat[0], 4, 4); P(10, 3, coat[0], 4, 3); P(12, 5, coat[0], 3, 3);          // neck, head, muzzle
            P(9, 1, coat[1], 1, 2); P(4, 3, '#261710', 2, 9); P(11, 4, '#141117'); P(14, 7, '#141117');
            if(id === 'horse_zirhli' || id === 'horse_demir') { P(6, 6, '#b9c4cf', 4, 8); P(6, 6, '#e3e9ef', 1, 8); P(10, 3, '#9aa6b2', 3, 2); }
            if(id === 'han_kisragi') { P(4, 3, '#e0b852', 2, 9); P(8, 6, '#e0b852', 2, 1); }
        } else if(item.type === 'food') {
            ({
                wheat: () => {                                   // a tied sheaf, ears leaning out
                    for(const [x, top, lean] of [[4, 3, -1], [7, 1, 0], [10, 2, 1], [12, 4, 1]]) {
                        P(x, top + 4, '#b8913a', 1, 14 - top - 4); P(x + lean, top, '#e0b852', 2, 4); P(x + lean + (lean >= 0 ? 1 : -1), top + 1, '#c9a040', 1, 2);
                    }
                    P(3, 10, '#8a6a2a', 11, 2);
                },
                bread: () => { P(2, 7, '#b07a3a', 12, 6); P(3, 6, '#c9924a', 10, 2); P(4, 5, '#c9924a', 8, 1); for(const x of [5, 8, 11]) P(x, 6, '#e8c890', 1, 3); P(2, 12, '#7a4a1a', 12, 1); },
                meat: () => { P(3, 4, '#a8342a', 8, 8); P(4, 3, '#c9483a', 6, 2); P(5, 5, '#e07a6a', 3, 2); P(10, 9, '#efe6cf', 4, 3); P(12, 8, '#efe6cf', 3, 2); },
                cheese: () => { for(let y = 5; y < 13; y++) P(2 + (12 - y), y, '#e8c060', 12 - (12 - y), 1); P(3, 12, '#c9a040', 11, 1); P(8, 9, '#b8902a', 2, 1); P(11, 11, '#b8902a'); P(12, 8, '#b8902a'); },
                fish: () => { P(3, 6, '#8aa6b8', 9, 4); P(4, 5, '#8aa6b8', 7, 1); P(4, 10, '#6f8a9c', 7, 1); P(12, 5, '#6f8a9c', 2, 6); P(14, 4, '#6f8a9c', 1, 2); P(14, 10, '#6f8a9c', 1, 2); P(5, 7, '#141117'); P(3, 7, '#b8cedc', 5, 1); },
                fruit: () => { P(4, 5, '#c9342a', 8, 8); P(3, 6, '#c9342a', 10, 6); P(5, 6, '#e8604a', 2, 2); P(8, 2, '#5a3d22', 1, 3); P(9, 2, '#5a8a3a', 3, 2); },
                butter: () => { P(2, 11, '#c9c1b0', 12, 2); P(4, 6, '#f0d060', 8, 5); P(4, 6, '#f8e490', 8, 1); P(11, 6, '#d8b040', 1, 5); },
                honey: () => { P(4, 5, '#b8783a', 8, 9); P(3, 6, '#b8783a', 10, 7); P(5, 3, '#8a5a2a', 6, 2); P(5, 7, '#e0a030', 6, 2); P(6, 9, '#f0c050', 2, 3); }
            }[id] || (() => P(4, 4, '#b07a3a', 8, 8)))();
        } else if(item.type === 'trade') {
            ({
                iron: () => { P(2, 9, '#6f757c', 12, 4); P(3, 8, '#9aa0a8', 10, 1); P(4, 5, '#6f757c', 8, 3); P(5, 4, '#9aa0a8', 6, 1); P(2, 12, '#4a4f55', 12, 1); },
                velvet: () => { P(2, 4, '#6a2a8a', 12, 9); P(2, 4, '#8a4aaa', 12, 2); P(2, 8, '#4a1a6a', 12, 1); P(12, 4, '#4a1a6a', 2, 9); },
                ale: () => { P(4, 2, '#8a5a2a', 8, 12); P(3, 4, '#8a5a2a', 10, 8); P(3, 5, '#5f646b', 10, 1); P(3, 10, '#5f646b', 10, 1); P(5, 2, '#a8743a', 2, 12); },
                coal: () => { P(3, 8, '#2a2a2e', 5, 5); P(7, 6, '#38383e', 6, 7); P(5, 10, '#1a1a1e', 6, 3); P(8, 7, '#55555c'); P(4, 9, '#55555c'); },
                salt: () => { P(4, 5, '#d8cfb8', 8, 9); P(3, 7, '#d8cfb8', 10, 6); P(5, 3, '#b8ad90', 6, 2); P(6, 2, '#efeae0', 4, 2); P(4, 7, '#efe9dc', 2, 5); }
            }[id] || (() => P(4, 4, '#8a6a40', 8, 8)))();
        } else if(id === 'boss_map') {
            P(2, 3, '#d8c79a', 12, 10); P(2, 3, '#efe0b8', 12, 1); P(2, 12, '#b8a578', 12, 1); P(4, 6, '#8a7a50', 3, 1); P(7, 8, '#8a7a50', 3, 1);
            P(10, 5, '#b8342a'); P(12, 5, '#b8342a'); P(11, 6, '#b8342a'); P(10, 7, '#b8342a'); P(12, 7, '#b8342a');
        } else return false;
        return true;
    }
    // A data URL for <img>, cached per item; null when nothing is drawn for it (the emoji stays)
    function itemIcon(item) {
        if(!item || !item.id) return null;
        if(item.id in ICON_URL) return ICON_URL[item.id];
        const g = sheet(16, 16);
        if(!drawItem(g, item)) return (ICON_URL[item.id] = null);
        outline(g, '#15120e');
        return (ICON_URL[item.id] = g.c.toDataURL('image/png'));
    }

    // --- the frame
    function render(G) {
        const c = G.mapCanvas, ctx = G.ctx, W = c.width, H = c.height, cam = G.camera, z = cam.zoom, now = performance.now();
        const T0 = terrain();
        Swordsman.load(); Archer.load();          // the map's parties are the battle's soldiers
        ctx.save();
        ctx.fillStyle = '#173f5c'; ctx.fillRect(0, 0, W, H);
        ctx.scale(z, z);
        ctx.translate(-cam.x + W / (2 * z), -cam.y + H / (2 * z));
        // the ground, always drawn nearest-neighbour: up close that is the pixel look, far out a
        // pre-shrunk copy keeps a texel at least a screen pixel wide. A smoothed draw cost 3.3 ms
        // at any zoom (measured, software raster), a nearest one 0.7 ms.
        const px = TEX * z, lvl = px < 0.5 ? 2 : px < 1 ? 1 : 0;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(T0.mips[lvl], X0, Y0, N * TEX, N * TEX);
        // the sea glints: a few pale texel dashes drifting, not so far out that a dash is under a
        // pixel (at the continent view the cell loop alone cost 5.8 ms); on a phone profile they
        // measured no cost at 0.45-0.8, so a phone gets them too
        if(z >= 0.25) {
            ctx.fillStyle = 'rgba(200,230,245,0.18)';
            const vx0 = cam.x - W / (2 * z), vy0 = cam.y - H / (2 * z), vx1 = vx0 + W / z, vy1 = vy0 + H / z;
            for(let gx = Math.floor(vx0 / 160); gx <= vx1 / 160; gx++) for(let gy = Math.floor(vy0 / 160); gy <= vy1 / 160; gy++) {
                const px = gx * 160 + hash(gx, gy, 81) * 120, py = gy * 160 + hash(gx, gy, 82) * 120;
                if(Math.hypot(px - 4500, py - 4500) < G.getMapRadius(px, py) + 60) continue;
                const ph2 = (now / 1400 + hash(gx, gy, 83) * 6) % 6;
                if(ph2 < 3) ctx.fillRect(Math.round(px / TEX) * TEX + Math.floor(ph2) * TEX, Math.round(py / TEX) * TEX, TEX * 2, TEX);
            }
        }
        ctx.imageSmoothingEnabled = false;

        G.drawMapSites(ctx);

        // settlements
        // settlements keep a readable size far out, but grow slower than parties (0.35 / zoom
        // against 0.55): at the continent view the towns of a kingdom sat on top of each other
        const ik = G.iconScale(), sk = Math.max(1, 0.35 / z), blocked = [], lit = [], questMarks = typeof Quests !== 'undefined' ? Quests.targets() : {};
        const order = LOCATIONS.slice().sort((a, b) => a.y - b.y);
        const vx0 = cam.x - W / (2 * z), vy0 = cam.y - H / (2 * z), vx1 = vx0 + W / z, vy1 = vy0 + H / z;
        for(const loc of order) {
            const s = settlement(loc), k = SPX * sk, w = s.cv.width * k, h = s.cv.height * k;
            const x = loc.x - w / 2, y = loc.y + 22 * sk - h;
            if(x > vx1 || x + w < vx0 || y > vy1 + 40 / z || y + h < vy0 - 40 / z) continue;   // off screen
            ctx.drawImage(s.cv, x, y, w, h);
            blocked.push({ x: loc.x, y: loc.y + 22 * sk, w, h });
            lit.push({ s, x, y, k });
            const fc = FACTIONS[loc.faction] || { color: '#888' };
            const qm = questMarks[loc.id], qDone = qm && qm.some(q => q.done);
            label(loc.x, loc.y + 22 * sk - h, T(loc.name), { prio: loc.type === 'city' ? 1 : loc.type === 'castle' ? 2 : 3, color: '#f2e4bb', dot: fc.color,
                  up: 4, down: h + 6, side: w / 2, must: loc.type !== 'village', edge: qm ? (qDone ? 'rgba(125,220,138,0.8)' : 'rgba(224,176,98,0.85)') : null });
            if(qm && z > 0.18) label(loc.x, loc.y + 22 * sk - h, qm.map(q => (q.done ? '✅ ' : '📜 ') + q.title).join(' · '),
                  { prio: 4, color: qDone ? '#7ddc8a' : '#e0b062', up: 30 / z, down: h + 30 / z, side: w / 2 });
        }

        G.drawMapParties(ctx);
        G.drawMapPlayer(ctx);

        // time of day over the world, then what gives off light, then the words
        // (the pixel map reads brighter than the old one, so night goes a third deeper)
        const tint = G.dayTint();
        if(tint) {
            ctx.fillStyle = tint.replace(/[\d.]+\)$/, a => Math.min(0.64, parseFloat(a) * 1.35).toFixed(3) + ')');
            ctx.fillRect(cam.x - W / z, cam.y - H / z, W * 2 / z, H * 2 / z);
        }
        const glow = G.nightGlow();
        if(glow > 0.02) {
            // windows: a lit pixel with a soft warm halo round it (the halo is one pre-drawn
            // image per settlement, so a phone gets it too)
            ctx.globalAlpha = Math.min(1, glow * 1.2);
            ctx.fillStyle = '#ffd36a';
            for(const L of lit) for(const [wx, wy] of L.s.win) ctx.fillRect(L.x + wx * L.k, L.y + wy * L.k, L.k, L.k);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.5 * glow;
            for(const L of lit) ctx.drawImage(L.s.glow, L.x - L.s.pad * L.k, L.y - L.s.pad * L.k, L.s.glow.width * L.k, L.s.glow.height * L.k);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            {   // hearth light spilling out of every settlement on screen
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.22 * glow;
                ctx.fillStyle = G.radial(ctx, 110, 'rgba(255,170,70,1)', 'rgba(255,140,50,0)');
                LOCATIONS.forEach(loc => {
                    if(loc.x + 110 < vx0 || loc.x - 110 > vx1 || loc.y + 110 < vy0 || loc.y - 110 > vy1) return;
                    ctx.save(); ctx.translate(loc.x, loc.y); ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.fill(); ctx.restore();
                });
                ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
            }
        }
        G.drawMapRoute(ctx);
        Nobles.drawMarkers(ctx);
        ctx.restore();
        drawLabels(ctx, cam, W, H, blocked);
        G.drawHail(ctx, W, H);
    }

    return { TEX, SPX, render, scene, march, itemIcon, site, terrain, settlement, party, partyLook, playerLook, label, culture, bakeMs: () => baked && baked.ms };
})();
// the start screen is up when the scripts run, and only a reload brings it back: the march starts here
if(typeof requestAnimationFrame === 'function') MapArt.march();
