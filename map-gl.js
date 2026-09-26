// ============================================
// WEBBAND - WEBGL MAP RENDERER (PixiJS 8)
// ============================================
// The world map drawn through PixiJS (vendor/pixi.min.js) instead of Canvas2D (1.34.0) — the
// battle's BattleGL (battle-gl.js), done for the map. Same picture, same motion: Game.renderMap
// decides what stands on the map (Game.mapScene: settlements, lairs, parties, labels, routes)
// and hands it here; nothing in this file writes game state. What changes is how pixels get made:
// - it renders at the screen's pixel density (min(devicePixelRatio, 3)), so coastlines, roads
//   and names stay sharp on a retina phone — #map-canvas is one canvas pixel per CSS pixel;
// - the terrain (sea, coast, rivers, roads, bridges, forests, mountains) is built ONCE into
//   GPU geometry and sprites; a frame only moves the camera. Canvas2D re-strokes all of it
//   every frame, which is why phones had to drop half of it (lite mode, #84);
// - the vector pieces are not re-implemented: the same Game.drawCoast / drawRivers / drawRoads /
//   drawFigure / drawRoute ctx code runs into Pixi geometry through GLCtx below, a Canvas2D
//   facade. Party figures become shared GraphicsContexts — vectors, so they stay crisp at every
//   zoom from the whole continent (0.07) to 3x.
// One app.render() per frame; the Pixi ticker stays stopped — the map loop (skipFrame gate,
// modal pause) decides when a frame is drawn.

// ---- GLCtx: the slice of the Canvas2D API the map's vector code uses, recorded into a
// PIXI.GraphicsContext. Paths are flattened to polylines here (arcs, ellipses, curves) with the
// current transform applied per call, exactly as Canvas2D does; fill()/stroke() replay the
// current path into Pixi. Line dashes are cut here too — Pixi has none. Not supported (and not
// used by the code that runs through it): gradients/patterns, text, images, clip (MapGL masks
// with the coast instead), composite modes.
const GLCTX_STATE = ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit', 'globalAlpha', 'lineDashOffset', '_dash'];
class GLCtx {
    constructor(gc) {
        this.gc = gc;
        this.m = [1, 0, 0, 1, 0, 0];      // a b c d e f: x' = a·x + c·y + e, y' = b·x + d·y + f
        this.fillStyle = '#000'; this.strokeStyle = '#000'; this.lineWidth = 1; this.lineCap = 'butt';
        this.lineJoin = 'miter'; this.miterLimit = 10; this.globalAlpha = 1; this.lineDashOffset = 0; this._dash = [];
        this.stack = [];
        this.subs = [];                   // [{ pts: [x0, y0, x1, y1, ...], closed }]
        this.cur = null;
    }
    // --- state
    save() { let s = { m: this.m.slice() }; GLCTX_STATE.forEach(k => { s[k] = this[k]; }); this.stack.push(s); }
    restore() { let s = this.stack.pop(); if(!s) return; this.m = s.m; GLCTX_STATE.forEach(k => { this[k] = s[k]; }); }
    setLineDash(a) { this._dash = (a || []).length % 2 ? a.concat(a) : (a || []).slice(); }
    getLineDash() { return this._dash.slice(); }
    clip() {}
    clearRect() {}
    // --- transform
    transform(a2, b2, c2, d2, e2, f2) {
        let [a, b, c, d, e, f] = this.m;
        this.m = [a*a2 + c*b2, b*a2 + d*b2, a*c2 + c*d2, b*c2 + d*d2, a*e2 + c*f2 + e, b*e2 + d*f2 + f];
    }
    translate(x, y) { this.transform(1, 0, 0, 1, x, y); }
    scale(x, y) { this.transform(x, 0, 0, y === undefined ? x : y, 0, 0); }
    rotate(t) { let c = Math.cos(t), s = Math.sin(t); this.transform(c, s, -s, c, 0, 0); }
    setTransform(a, b, c, d, e, f) { this.m = [a, b, c, d, e, f]; }
    resetTransform() { this.m = [1, 0, 0, 1, 0, 0]; }
    k() { let m = this.m; return Math.sqrt(Math.abs(m[0]*m[3] - m[1]*m[2])); }   // length scale of the transform
    // --- path (world points are stored already transformed)
    beginPath() { this.subs = []; this.cur = null; }
    _pt(x, y) { let m = this.m; return [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]]; }
    _add(x, y) {
        let [px, py] = this._pt(x, y);
        if(!this.cur) { this.cur = { pts: [], closed: false }; this.subs.push(this.cur); }
        this.cur.pts.push(px, py);
    }
    moveTo(x, y) { this.cur = null; this._add(x, y); }
    lineTo(x, y) { this._add(x, y); }
    closePath() {
        if(!this.cur || this.cur.pts.length < 2) return;
        this.cur.closed = true;
        let p = this.cur.pts;
        this.cur = { pts: [p[0], p[1]], closed: false }; this.subs.push(this.cur);   // Canvas2D: a new subpath from the start point
    }
    _lastUser() {   // the current point back in user space (for curves drawn with the current transform)
        let p = this.cur && this.cur.pts, m = this.m;
        if(!p || !p.length) return null;
        let X = p[p.length - 2] - m[4], Y = p[p.length - 1] - m[5], det = m[0]*m[3] - m[1]*m[2];
        return [(m[3]*X - m[2]*Y) / det, (-m[1]*X + m[0]*Y) / det];
    }
    quadraticCurveTo(cx, cy, x, y) {
        let p0 = this._lastUser() || [cx, cy];
        if(!this.cur) this._add(p0[0], p0[1]);
        for(let i = 1; i <= 16; i++) {
            let t = i / 16, u = 1 - t;
            this._add(u*u*p0[0] + 2*u*t*cx + t*t*x, u*u*p0[1] + 2*u*t*cy + t*t*y);
        }
    }
    bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
        let p0 = this._lastUser() || [c1x, c1y];
        if(!this.cur) this._add(p0[0], p0[1]);
        for(let i = 1; i <= 24; i++) {
            let t = i / 24, u = 1 - t;
            this._add(u*u*u*p0[0] + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*x, u*u*u*p0[1] + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*y);
        }
    }
    // Canvas2D's sweep rules: clockwise sweeps land in [0, 2π], anticlockwise in [-2π, 0]
    static sweep(a0, a1, ccw) {
        let d = a1 - a0, T = Math.PI * 2;
        if(!ccw) { if(d >= T) return T; d %= T; return d < 0 ? d + T : d; }
        if(-d >= T) return -T; d %= T; return d > 0 ? d - T : d;
    }
    // Enough segments that a curve stays round at 3x zoom on a 3x screen
    _segs(r, sweep) { return Math.max(4, Math.ceil(Math.abs(sweep) / (Math.PI * 2) * Math.min(256, Math.max(32, 8 * Math.sqrt(r * this.k()))))); }
    arc(x, y, r, a0, a1, ccw) { this.ellipse(x, y, r, r, 0, a0, a1, ccw); }
    ellipse(x, y, rx, ry, rot, a0, a1, ccw) {
        let d = GLCtx.sweep(a0, a1, !!ccw), n = this._segs(Math.max(rx, ry), d), cr = Math.cos(rot || 0), sr = Math.sin(rot || 0);
        for(let i = 0; i <= n; i++) {
            let t = a0 + d * i / n, ex = Math.cos(t) * rx, ey = Math.sin(t) * ry;
            this._add(x + ex*cr - ey*sr, y + ex*sr + ey*cr);
        }
    }
    rect(x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); }
    roundRect(x, y, w, h, r) {
        r = Math.max(0, Math.min(Array.isArray(r) ? r[0] : (r || 0), w / 2, h / 2));
        this.cur = null;
        const H = Math.PI / 2;
        this.arc(x + w - r, y + r, r, -H, 0); this.arc(x + w - r, y + h - r, r, 0, H);
        this.arc(x + r, y + h - r, r, H, 2*H); this.arc(x + r, y + r, r, 2*H, 3*H);
        this.closePath();
    }
    // --- painting
    static rgba(css) {
        if(typeof css !== 'string') return [0, 1];
        let v = { black: '#000000', white: '#ffffff' }[css] || css;
        return BattleGL.hex(v);
    }
    _replay(subs) {
        let gc = this.gc, any = false;
        gc.beginPath();
        subs.forEach(s => {
            let p = s.pts;
            if(p.length < 4) return;
            any = true;
            gc.moveTo(p[0], p[1]);
            for(let i = 2; i < p.length; i += 2) gc.lineTo(p[i], p[i + 1]);
            if(s.closed) gc.closePath();
        });
        return any;
    }
    fill() {
        if(!this._replay(this.subs)) return;
        let [color, a] = GLCtx.rgba(this.fillStyle);
        this.gc.fill({ color, alpha: a * this.globalAlpha });
    }
    stroke() {
        let k = this.k(), subs = GLCtx.joined(this.subs);
        if(this._dash.length) subs = GLCtx.dashed(subs, this._dash.map(v => v * k), this.lineDashOffset * k);
        if(!this._replay(subs)) return;
        let [color, a] = GLCtx.rgba(this.strokeStyle);
        this.gc.stroke({ width: this.lineWidth * k, color, alpha: a * this.globalAlpha, cap: this.lineCap, join: this.lineJoin, miterLimit: this.miterLimit });
    }
    fillRect(x, y, w, h) { let s = this.subs, c = this.cur; this.beginPath(); this.rect(x, y, w, h); this.fill(); this.subs = s; this.cur = c; }
    strokeRect(x, y, w, h) { let s = this.subs, c = this.cur; this.beginPath(); this.rect(x, y, w, h); this.stroke(); this.subs = s; this.cur = c; }
    // Chain open subpaths that pick up where the previous one ended (a road is a run of
    // segments, each its own moveTo/lineTo). Canvas2D strokes a whole path as one shape, so a
    // translucent road is one even tone; Pixi strokes each piece on its own, and two round caps
    // on the same spot would paint the joint twice as dark. One polyline has proper joins instead.
    static joined(subs) {
        let out = [];
        subs.forEach(s => {
            let p = s.pts, prev = out[out.length - 1], q = prev && prev.pts;
            if(p.length < 4) return;
            if(q && !prev.closed && !s.closed && Math.abs(q[q.length - 2] - p[0]) < 1e-3 && Math.abs(q[q.length - 1] - p[1]) < 1e-3) {
                prev.pts = q.concat(p.slice(2));
                return;
            }
            out.push({ pts: p.slice(), closed: s.closed });
        });
        return out;
    }
    // Cut polylines into dashes, Canvas2D-style: the pattern restarts at every subpath, shifted
    // by the offset, and runs on across vertices (a closed subpath includes its closing edge).
    static dashed(subs, dash, offset) {
        let total = dash.reduce((s, v) => s + v, 0);
        if(!(total > 0)) return subs;
        let out = [];
        subs.forEach(s => {
            let p = s.pts.slice();
            if(s.closed && p.length >= 4) p.push(p[0], p[1]);
            if(p.length < 4) return;
            let ph = ((offset % total) + total) % total, i = 0;
            while(ph >= dash[i]) { ph -= dash[i]; i = (i + 1) % dash.length; }
            let left = dash[i] - ph, on = i % 2 === 0, piece = on ? [p[0], p[1]] : null;
            for(let j = 2; j < p.length; j += 2) {
                let x0 = p[j - 2], y0 = p[j - 1], x1 = p[j], y1 = p[j + 1], len = Math.hypot(x1 - x0, y1 - y0), at = 0;
                while(len - at > left) {
                    at += left;
                    let t = at / len, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
                    if(on) { piece.push(x, y); out.push({ pts: piece, closed: false }); piece = null; }
                    else piece = [x, y];
                    on = !on; i = (i + 1) % dash.length; left = dash[i];
                }
                left -= len - at;
                if(on) piece.push(x1, y1);
            }
            if(on && piece && piece.length >= 4) out.push({ pts: piece, closed: false });
        });
        return out;
    }
}

const MapGL = {
    name: 'pixi', app: null, ready: false, w: 0, h: 0,
    R: 1,          // screen pixels per CSS pixel
    k: 1,          // screen pixels per world unit this frame (R x camera zoom)
    frame: 0, calls: 0, lastCalls: 0,
    _initP: null,

    // ---- Lifecycle (BattleGL's, for #map-gl) ------------------------------------------
    init(canvas) {
        if(this._initP) return this._initP;
        this._initP = (async () => {
            if(!canvas) throw new Error('#map-gl missing');
            this.R = Math.min(3, window.devicePixelRatio || 1);
            const app = new PIXI.Application();
            await app.init({
                canvas, width: Math.max(1, canvas.clientWidth || 300), height: Math.max(1, canvas.clientHeight || 150),
                resolution: this.R, autoDensity: true,
                // The map is vectors (coast, roads, figures): MSAA keeps their edges smooth.
                // On a phone's tile-based GPU it is close to free.
                antialias: true, background: 0x0a1c2e, autoStart: false, sharedTicker: false,
                preference: 'webgl', powerPreference: 'high-performance', hello: false
            });
            app.ticker.stop();
            this.app = app;
            // A lost context doesn't come back reliably on phones: finish the session on Canvas2D.
            this._onLost = e => { e.preventDefault(); Game.mapGlFailed(new Error('webglcontextlost')); };
            canvas.addEventListener('webglcontextlost', this._onLost);
            BattleGL.countCalls.call(this, app.renderer.gl);
            this.build();
            // Labels are baked with the webfonts; once they finish loading, re-bake them.
            if(document.fonts && document.fonts.addEventListener) {
                this._onFonts = () => this.dropTexts();
                document.fonts.addEventListener('loadingdone', this._onFonts);
            }
            this.ready = true;
        })();
        return this._initP;
    },
    destroy() {
        if(!this.app) return;
        let canvas = this.app.canvas;
        canvas.removeEventListener('webglcontextlost', this._onLost);
        if(this._onFonts && document.fonts) document.fonts.removeEventListener('loadingdone', this._onFonts);
        this.app.destroy({ removeView: false }, { children: true, texture: true, textureSource: true });
        // The old context stays bound to that element — a later init gets a fresh one.
        let fresh = canvas.cloneNode(false);
        fresh.removeAttribute('style');
        fresh.hidden = true;
        canvas.replaceWith(fresh);
        Object.assign(this, { app: null, ready: false, _initP: null, w: 0, h: 0, _wkey: null, bk: null,
                              texts: new Map(), cvTexs: new WeakMap(), figs: new Map(), trees: new Map(), pennants: new Map() });
    },
    info() {
        let c = this.app && this.app.canvas;
        return { resolution: `${this.R}x` + (c ? ` (${c.width}x${c.height})` : ''), drawCalls: this.lastCalls };
    },
    resize(w, h) {
        this.w = w; this.h = h;
        if(this.app) this.app.renderer.resize(w, h);
    },

    // ---- Textures ------------------------------------------------------------------------
    canvas(w, h) { return BattleGL.canvas(w, h); },
    // `repeat` for the ground tile; power-of-two textures get mipmaps (they shrink a lot when zoomed out)
    texOf(c, o = {}) {
        let pot = (c.width & (c.width - 1)) === 0 && (c.height & (c.height - 1)) === 0;
        return new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: c, scaleMode: 'linear', autoGenerateMipmaps: pot, mipmapFilter: 'linear',
                                                                    addressMode: o.repeat ? 'repeat' : 'clamp-to-edge' }) });
    },
    // A baked Canvas2D canvas (Game's emoji glyphs) -> texture, once per canvas
    cvTexs: new WeakMap(),
    cvTex(c) {
        let t = this.cvTexs.get(c);
        if(!t) { t = this.texOf(c); this.cvTexs.set(c, t); }
        return t;
    },
    radialTex(inner, outer, r0 = 0) {
        let c = this.canvas(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 64 * r0, 64, 64, 64);
        g.addColorStop(0, inner); g.addColorStop(1, outer);
        x.fillStyle = g; x.fillRect(0, 0, 128, 128);
        return this.texOf(c);
    },
    // A fresh Canvas2D facade over a Graphics, emptied first (per-frame geometry)
    gx(g) { g.clear(); return new GLCtx(g.context); },

    // Emoji on a sprite, Game.emoji's placement: (x, y) is the baseline centre, `size` world units.
    // The glyph is picked for its on-screen pixel size, so it is always shrunk, never blown up.
    emo(s, ch, x, y, size, k = this.k) {
        let c = Game.emojiCanvas(ch, size * k);
        let t = this.cvTex(c);
        if(s.texture !== t) s.texture = t;
        s.anchor.set(0.5, c._base / (c._k * c.height));
        s.position.set(x, y);
        s.scale.set(size * c._k);
    },

    // Name plates, baked whole (plate + accent + text) at the screen's density and cached by
    // content. Game.labelSpot sized them; they read at the same on-screen size at every zoom.
    texts: new Map(),
    plate(l) {
        let s = Game.uiScale(), q = s * this.R;
        let key = [l.text, l.color, l.accent, q].join('\u0001'), e = this.texts.get(key);
        if(e) { e.used = this.frame; return e; }
        let w = Game.textW(Game.ctx, l.text) + 18, h = 25;
        let c = this.canvas(w * q, h * q), x = c.getContext('2d');
        x.scale(q, q);
        x.fillStyle = 'rgba(8,10,14,0.72)';
        x.beginPath(); Battle.roundRect(x, 0, 0, w, h, 5); x.fill();
        if(l.accent) { x.fillStyle = l.accent; x.fillRect(0, h - 2.5, w, 2.5); }
        x.font = 'bold 19px Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillStyle = l.color; x.fillText(l.text, w / 2, h / 2);
        e = { tex: this.texOf(c), q, used: this.frame };
        this.texts.set(key, e);
        if(this.texts.size > 240) this.evictTexts();
        return e;
    },
    // World-sized text (the lords' 📍 markers): baked for the zoom bucket, shadow included
    wtext(str, font, fill, blur) {
        let q = Math.pow(2, Math.max(-2, Math.min(2, Math.ceil(Math.log2(this.k)))));
        let key = [str, font, fill, blur, q].join('\u0001'), e = this.texts.get(key);
        if(e) { e.used = this.frame; return e; }
        let m = this._mctx || (this._mctx = this.canvas(1, 1).getContext('2d'));
        m.font = font;
        let px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)[1]), pad = 4 + blur * 1.5;
        let w = m.measureText(str).width + pad * 2, h = px * 1.5 + pad * 2, base = pad + px * 1.1;
        let c = this.canvas(w * q, h * q), x = c.getContext('2d');
        x.scale(q, q);
        x.font = font; x.textAlign = 'center';
        if(blur) { x.shadowColor = 'black'; x.shadowBlur = blur * q; }
        x.fillStyle = fill; x.fillText(str, w / 2, base);
        e = { tex: this.texOf(c), q, ay: base / h, used: this.frame };
        this.texts.set(key, e);
        return e;
    },
    textSprites() { let P = this.P; return P ? P.glabels.items.concat(P.plabels.items, P.mtexts.items) : []; },
    evictTexts() {
        let old = new Set();
        for(const [k, e] of this.texts) if(e.used < this.frame - 2) { old.add(e.tex); this.texts.delete(k); }
        this.textSprites().forEach(s => { if(old.has(s.texture)) s.texture = PIXI.Texture.EMPTY; });
        old.forEach(t => t.destroy(true));
    },
    dropTexts() {
        this.textSprites().forEach(s => { s.texture = PIXI.Texture.EMPTY; });
        this.texts.forEach(e => e.tex.destroy(true));
        this.texts.clear();
    },

    // Shared vector contexts: a party figure per (kind, colour, cloak), a pole per height, a
    // pennant per colour — built once through the same Game.drawFigure/drawPole/drawFlag code.
    figs: new Map(),
    vec(key, draw) {
        let gc = this.figs.get(key);
        if(!gc) { gc = new PIXI.GraphicsContext(); draw(new GLCtx(gc)); this.figs.set(key, gc); }
        return gc;
    },
    figCtx(kind, col, cloak) { return this.vec('f|' + kind + '|' + col + '|' + cloak, c => Game.drawFigure(c, kind, col, cloak)); },
    poleCtx(top) { return this.vec('p|' + top, c => Game.drawPole(c, top)); },
    // The pennant with its pole-side edge on the origin; the wave is a skew (see icon())
    flagCtx(col) { return this.vec('g|' + col, c => { c.translate(14, 0); Game.drawFlag(c, 0, col, 0); }); },
    ringCtx(rx, ry, w) {
        return this.vec('r|' + rx + '|' + ry + '|' + w, c => {
            c.strokeStyle = '#fff'; c.lineWidth = w; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.stroke();
        });
    },
    // One tree (Battle.drawTree) baked for a zoom bucket; sprites scale it to their own radius
    TREE_R: 32,
    trees: new Map(),
    treeTex(b) {
        let e = this.trees.get(b);
        if(!e) {
            let r = this.TREE_R, c = this.canvas(2.4 * r * b, 2.1 * r * b), x = c.getContext('2d');
            x.scale(b, b); x.translate(r * 1.02, r * 1.1);
            Battle.drawTree(x, 0, 0, r);
            e = { tex: this.texOf(c), ax: 1.02 / 2.4, ay: 1.1 / 2.1 };
            this.trees.set(b, e);
        }
        return e;
    },

    // ---- The scene graph, built once --------------------------------------------------
    build() {
        const C = () => new PIXI.Container(), G = () => new PIXI.Graphics(), stage = this.app.stage;
        const add = (parent, o) => { parent.addChild(o); return o; };
        const S = (ax = 0.5, ay = 0.5) => () => { let s = new PIXI.Sprite(); s.anchor.set(ax, ay); return s; };
        let w = this.world = add(stage, C());

        // Sea: the deep colour everywhere, the gradient band over the map (flat in lite mode)
        this.seaFlat = add(w, new PIXI.Sprite(PIXI.Texture.WHITE));
        this.seaFlat.position.set(-5000, -5000); this.seaFlat.width = 20000; this.seaFlat.height = 20000;
        let sg = this.canvas(1, 256), sx = sg.getContext('2d'), grad = sx.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0, '#0a1c2e'); grad.addColorStop(0.5, '#123c58'); grad.addColorStop(1, '#0a1c2e');
        sx.fillStyle = grad; sx.fillRect(0, 0, 1, 256);
        this.seaGrad = add(w, new PIXI.Sprite(this.texOf(sg)));
        this.seaGrad.position.set(-5000, -2000); this.seaGrad.width = 20000; this.seaGrad.height = 13000;
        // Waves: each a fixed sine polyline, slid sideways and bobbed (see render)
        this.waves = add(w, C());
        this.waveLines = [];
        const WP = Math.PI * 2 * 900;
        for(let i = -4; i < 22; i++) {
            let g = add(this.waves, G());
            for(let x = -4000, first = true; x < 14000 + WP + 400; x += 400, first = false)
                g[first ? 'moveTo' : 'lineTo'](x, Math.sin(x / 900 + i) * 30);
            g.stroke({ width: 6, color: 0xffffff, alpha: 0.05 });
            this.waveLines.push(g);
        }
        this.coast = add(w, G());
        // The land: everything on it is clipped to the coast, as Canvas2D's ctx.clip() does
        this.land = add(w, C());
        this.landMask = add(this.land, G());
        this.land.mask = this.landMask;
        this.ground = add(this.land, new PIXI.TilingSprite({ texture: this.texOf(Game.groundCanvas(), { repeat: true }), width: 1, height: 1 }));
        this.dirt = add(this.land, C());
        this.rivers = add(this.land, G());
        this.shimmer = add(this.land, G());
        this.roads = add(this.land, G());
        this.forests = add(this.land, C());

        const L = this.L = {};
        for(const n of ['shadows', 'icons', 'pennants', 'qmarks', 'glabels']) L[n] = add(w, C());
        this.tint = add(w, new PIXI.Sprite(PIXI.Texture.WHITE));
        L.glow = add(w, C());
        this.mountains = add(w, C());
        for(const n of ['rings', 'rmarks', 'parties', 'badges']) L[n] = add(w, C());
        this.pRing = add(w, new PIXI.Graphics(this.ringCtx(36, 13, 4)));
        this.pEmo = add(w, S(0.5, 0.5)());
        L.player = add(w, C());
        for(const n of ['plabels']) L[n] = add(w, C());
        this.routes = add(w, G());
        this.markers = add(w, G());
        L.mtexts = add(w, C());
        this.hail = add(stage, G());     // screen space

        let dc = this.canvas(128, 128), dx = dc.getContext('2d');
        dx.fillStyle = '#000'; dx.beginPath(); dx.arc(64, 64, 63, 0, Math.PI * 2); dx.fill();
        this.shadowTex = this.texOf(dc);                                    // a solid disc, clean-edged
        this.dirtTex = this.radialTex('rgba(30,44,28,0.55)', 'rgba(30,44,28,0)');
        this.forestTex = this.radialTex('rgba(16,38,18,0.85)', 'rgba(16,38,18,0)', 0.2);
        this.glowTex = this.radialTex('rgba(255,170,70,1)', 'rgba(255,140,50,0)');

        const icon = () => {
            let o = C(), shadow = new PIXI.Sprite(this.shadowTex), a = C(), b = C();
            shadow.anchor.set(0.5); shadow.tint = 0x000000; shadow.alpha = 0.45;
            let ex = Game.ICON_CROWD.map(([ox, oy]) => {
                let c = C(), g = G(); c.position.set(ox, oy); c.scale.set(0.78); c.alpha = 0.75; c.addChild(g); c.g = g; b.addChild(c); return c;
            });
            let fig = G(), pole = G(), flag = G();
            b.addChild(fig, pole, flag); a.addChild(b); o.addChild(shadow, a);
            return Object.assign(o, { shadow, a, b, ex, fig, pole, flag });
        };
        this.P = {
            shadows: new GLPool(L.shadows, () => { let s = new PIXI.Sprite(this.shadowTex); s.anchor.set(0.5); s.tint = 0; return s; }),
            icons: new GLPool(L.icons, S()), qmarks: new GLPool(L.qmarks, S()),
            glabels: new GLPool(L.glabels, S()), plabels: new GLPool(L.plabels, S()),
            glow: new GLPool(L.glow, () => { let s = new PIXI.Sprite(this.glowTex); s.anchor.set(0.5); s.blendMode = 'add'; return s; }),
            rings: new GLPool(L.rings, G), rmarks: new GLPool(L.rmarks, S()),
            parties: new GLPool(L.parties, icon), badges: new GLPool(L.badges, S()),
            player: new GLPool(L.player, icon), mtexts: new GLPool(L.mtexts, S())
        };
    },

    // The terrain, rebuilt whenever it could look different: a new world (new game, a load),
    // or lite mode flipping (the adaptive frame rate, #84). Neither happens mid-play.
    ensureWorld(lite) {
        let key = [lite, state.mapBorder, state.roads, state.bridges, state.dirtPatches, Game._forestTrees];
        if(this._wkey && key.every((v, i) => v === this._wkey[i])) return;
        this._wkey = key;
        this.seaFlat.tint = lite ? 0x123c58 : 0x0a1c2e;
        this.seaGrad.visible = !lite;

        Game.drawCoast(this.gx(this.coast), lite);
        let m = this.gx(this.landMask);
        Game.coastPath(m); m.fillStyle = '#fff'; m.fill();
        let xs = state.mapBorder.map(p => p.x), ys = state.mapBorder.map(p => p.y);
        let x0 = Math.min(...xs) - 10, y0 = Math.min(...ys) - 10;
        this.ground.visible = !lite;
        this.ground.position.set(x0, y0);
        this.ground.width = Math.max(...xs) + 10 - x0; this.ground.height = Math.max(...ys) + 10 - y0;
        this.ground.tilePosition.set(-x0, -y0);     // the pattern sits on the world origin, like Canvas2D's

        const clear = c => c.removeChildren().forEach(o => o.destroy());
        clear(this.dirt);
        if(!lite) state.dirtPatches.forEach(d => {
            let s = new PIXI.Sprite(this.dirtTex); s.anchor.set(0.5); s.position.set(d.x, d.y); s.scale.set(d.r / 64);
            this.dirt.addChild(s);
        });
        Game.drawRivers(this.gx(this.rivers), lite);
        Game.drawRoads(this.gx(this.roads), lite);

        // Forests: the dark patch, then its trees front to back (thinned to a third in lite mode)
        clear(this.forests);
        this.treeSprites = [];
        let step = lite ? 3 : 1;
        FORESTS.forEach((f, i) => {
            let p = new PIXI.Sprite(this.forestTex); p.anchor.set(0.5); p.position.set(f.x, f.y); p.scale.set(f.radius / 64);
            this.forests.addChild(p);
            Game._forestTrees[i].forEach((t, j) => {
                if(j % step) return;
                let s = new PIXI.Sprite(); s.position.set(t.x, t.y); s.r = t.r;
                this.forests.addChild(s); this.treeSprites.push(s);
            });
        });

        clear(this.mountains);
        let mStep = Game.mountainStep(lite);
        state.mapBorder.forEach((pt, index) => {
            if(index % mStep) return;
            let s = new PIXI.Sprite(); s.mx = pt.x; s.my = pt.y + 20 + (index % 3) * 6; s.size = Game.mountainSize(index);
            this.mountains.addChild(s);
        });
        this.bk = null;   // new sprites: (re)texture them for the zoom
    },
    // Textures picked for the zoom: the tree bake and the mountain glyphs. Power-of-two
    // buckets, so this runs a handful of times over a whole zoom-out, not every frame.
    retexture() {
        let top = Math.pow(2, this.bk), b = Math.max(1/16, Math.min(8, top));   // the most px/unit this bucket shows
        let t = this.treeTex(b);
        this.treeSprites.forEach(s => { s.texture = t.tex; s.anchor.set(t.ax, t.ay); s.scale.set(s.r / this.TREE_R / b); });
        this.mountains.children.forEach(s => this.emo(s, '🏔️', s.mx, s.my, s.size, top));
    },

    // One party icon: Game.drawPartyIcon's layers and pose (Game.iconPose), as a container.
    icon(o, x, y, opt) {
        let p = Game.iconPose(x, opt), sc = p.sc;
        o.position.set(x, y); o.alpha = p.alpha;
        o.shadow.scale.set(26 * sc / 63, 9 * sc / 63);
        o.a.scale.set(sc); o.a.rotation = p.rot;
        o.b.scale.set(p.face, 1); o.b.position.set(0, p.bob);
        let fig = this.figCtx(p.kind, opt.color, p.cloak);
        if(o.fig.context !== fig) o.fig.context = fig;
        o.ex.forEach((e, i) => { e.visible = i < p.extra; if(e.visible && e.g.context !== fig) e.g.context = fig; });
        o.pole.visible = o.flag.visible = p.flag;
        if(p.flag) {
            let pc = this.poleCtx(p.top), fc = this.flagCtx(opt.color);
            if(o.pole.context !== pc) o.pole.context = pc;
            if(o.flag.context !== fc) o.flag.context = fc;
            // The pennant's wave as a vertical shear from the pole: the tip (20 out) moves by
            // exactly `wave`, the curve's control point (10 out) by half — Canvas2D's numbers.
            o.flag.position.set(-14, p.top);
            o.flag.skew.set(0, Math.asin(Math.max(-1, Math.min(1, -p.wave / 20))));
        }
    },

    // ---- One frame --------------------------------------------------------------------
    render(sc, now) {
        const cam = Game.camera, Z = cam.zoom, W = this.w, H = this.h, lite = Game.lite(), P = this.P;
        this.frame++;
        this.calls = 0;
        this.k = Z * this.R;
        this.ensureWorld(lite);
        let bk = Math.ceil(Math.log2(this.k));
        if(bk !== this.bk) { this.bk = bk; this.retexture(); }
        this.world.scale.set(Z);
        this.world.position.set(W / 2 - cam.x * Z, H / 2 - cam.y * Z);
        for(const n in P) if(P[n].begin) P[n].begin();

        // Sea waves slide sideways — the same travelling sine as Canvas2D's per-frame polylines
        this.waves.visible = !lite;
        if(!lite) {
            let wt = now / 4000, WP = Math.PI * 2 * 900;
            this.waveLines.forEach((g, j) => { let i = j - 4; g.position.set(-((1800 * wt) % WP), i * 600 + Math.sin(wt + i) * 40); });
        }
        this.shimmer.clear();
        if(!lite) Game.drawRiverShimmer(new GLCtx(this.shimmer.context), now);

        // Lairs and settlements
        sc.sites.forEach(s => {
            let sh = P.shadows.next(); sh.position.set(s.x, s.y + 12); sh.scale.set(s.big * 0.5 / 63, s.big * 0.2 / 63); sh.alpha = 0.35;
            let e = P.icons.next(); this.emo(e, s.icon, s.x, s.y + 10, s.big); e.alpha = s.alpha;
        });
        let seen = new Set();
        sc.locs.forEach(l => {
            let sh = P.shadows.next(); sh.position.set(l.x, l.y + 18); sh.scale.set(l.big * 0.55 / 63, l.big * 0.22 / 63); sh.alpha = 0.45;
            let e = P.icons.next(); this.emo(e, l.icon, l.x, l.y + 15, l.big); e.alpha = 1;
            this.pennant(l); seen.add(l.id);
            if(l.quest) this.emo(P.qmarks.next(), l.quest, l.x - l.big * 0.55, l.y - 15 - 34 * l.ik, 36 * l.ik);
        });
        this.pennants.forEach((p, id) => { if(!seen.has(id)) p.g.visible = false; });
        sc.groundLabels.forEach(l => this.label(P.glabels.next(), l));

        // Time of day: the tint over the view, hearth light at night (not in lite mode)
        let tint = Game.dayTint();
        this.tint.visible = !!tint;
        if(tint) {
            BattleGL.tint(this.tint, tint);
            this.tint.position.set(cam.x - W / 2 / Z - 10, cam.y - H / 2 / Z - 10);
            this.tint.width = W / Z + 20; this.tint.height = H / Z + 20;
        }
        let glow = Game.nightGlow();
        if(glow > 0.02 && !lite) LOCATIONS.forEach(loc => {
            let s = P.glow.next(); s.position.set(loc.x, loc.y); s.scale.set(110 / 64); s.alpha = 0.30 * glow;
        });

        // Parties
        const ring = (x, y, gc, col, a) => {
            let g = P.rings.next(); if(g.context !== gc) g.context = gc;
            g.position.set(x, y); BattleGL.tint(g, col, a);
        };
        sc.npcs.forEach(n => {
            ring(n.x, n.y + 22, this.ringCtx(24, 9, 3), n.col, 0.75);
            if(n.charging) ring(n.x, n.y + 22, this.ringCtx(32, 13, 2.5), '#e0463a', 0.5 + 0.35 * Math.abs(Math.sin(now / 260)));
            if(n.quest) {
                ring(n.x, n.y + 22, this.ringCtx(28, 11, 2.5), '#e0b062', 0.6 + 0.3 * Math.abs(Math.sin(now / 400)));
                this.emo(P.rmarks.next(), n.quest.ch, n.quest.x, n.quest.y, n.quest.size);
            }
            this.icon(P.parties.next(), n.x, n.y + 22, n.icon);
            if(n.badge) this.emo(P.badges.next(), n.badge.ch, n.badge.x, n.badge.y, n.badge.size);
        });
        let pl = sc.player;
        this.pRing.visible = !pl.chain;
        this.pEmo.visible = !!(pl.chain || pl.tent);
        if(pl.chain || pl.tent) { let e = pl.chain || pl.tent; this.emo(this.pEmo, e.ch, e.x, e.y, e.size); }
        if(!pl.chain) {
            this.pRing.position.set(pl.x, pl.y + 28); this.pRing.scale.set(pl.pulse);
            BattleGL.tint(this.pRing, 'rgba(255,204,0,0.9)');
            if(pl.icon) this.icon(P.player.next(), pl.x, pl.y + 28, pl.icon);
        }
        sc.partyLabels.forEach(l => this.label(P.plabels.next(), l));

        // Routes and the lords' location markers: rebuilt per frame (they flow and pulse)
        let rc = this.gx(this.routes);
        sc.routes.forEach(r => Game.drawRoute(rc, r.t, r.live, now));
        let mc = this.gx(this.markers);
        Nobles.markers().forEach(m => {
            Nobles.markerRing(mc, m);
            if(m.ghost) return;
            let e = this.wtext(Nobles.markerText(m), Nobles.MARKER_FONT, '#ffcc00', 12), s = P.mtexts.next();
            if(s.texture !== e.tex) s.texture = e.tex;
            s.anchor.set(0.5, e.ay); s.position.set(m.x, m.y - m.radius - 14); s.scale.set(1 / e.q);
        });

        let hc = this.gx(this.hail);
        if(Game.hailOn()) Game.hailPath(hc, W, H);

        for(const n in P) if(P[n].end) P[n].end();
        this.app.render();
        this.lastCalls = this.calls;
    },

    // A settlement's pennant: built once per settlement (again when the fief changes hands),
    // scaled by the icon scale like everything Canvas2D draws with `ik`.
    pennants: new Map(),
    pennant(l) {
        let p = this.pennants.get(l.id);
        if(!p) { p = { g: new PIXI.Graphics(), color: null }; this.L.pennants.addChild(p.g); this.pennants.set(l.id, p); }
        if(p.color !== l.color || p.base !== l.base) {
            p.color = l.color; p.base = l.base;
            Game.drawLocPennant(this.gx(p.g), 0, 0, l.base, 1, l.color);
        }
        p.g.visible = true;
        p.g.position.set(l.x, l.y); p.g.scale.set(l.ik);
    },
    label(s, l) {
        let e = this.plate(l);
        if(s.texture !== e.tex) s.texture = e.tex;
        s.position.set(l.x, l.y);
        s.scale.set(l.k / e.q);
    }
};
