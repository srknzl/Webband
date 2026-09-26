// ============================================
// WEBBAND - WEBGL MAP RENDERER (PixiJS 8)
// ============================================
// The world map drawn through PixiJS (vendor/pixi.min.js) instead of Canvas2D (1.34.0), the
// battle's BattleGL done for the map. Since 2.0.0 the map is MapArt's pixel art (map-art.js),
// and it is one piece of Canvas2D code: MapArt.render(G, ctx) draws into either #map-canvas's own
// context or PixCtx below, a Canvas2D facade that turns every call into pooled Pixi sprites and
// geometry, in call order. So the picture is written once, and WebGL only changes how pixels get
// made:
// - it renders at the screen's pixel density (min(devicePixelRatio, 3)); #map-canvas is one
//   canvas pixel per CSS pixel, so on a retina phone the Canvas2D map is stretched 2-3x. Pixel
//   sprites keep their hard edges either way, but the name plates, rings and routes were soft;
// - every baked canvas (terrain, settlement and soldier sprites, emoji, name plates) is uploaded
//   once and stamped as a sprite; a frame moves sprites instead of re-rasterising the terrain.
// Nothing in this file writes game state. One app.render() per frame; the Pixi ticker stays
// stopped — the map loop (skipFrame gate, modal pause) decides when a frame is drawn.

// ---- GLCtx: the slice of the Canvas2D API the map's vector code uses, recorded into a
// PIXI.GraphicsContext. Paths are flattened to polylines here (arcs, ellipses, curves) with the
// current transform applied per call, exactly as Canvas2D does; fill()/stroke() replay the
// current path into Pixi. Line dashes are cut here too — Pixi has none. Not supported here:
// gradients/patterns, clip, composite modes; images, text and blending are PixCtx's (below).
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

// ---- PixCtx: the Canvas2D surface MapArt's map draws through (2.0.0). Paths, transforms, dashes
// and styles are GLCtx's; on top of that:
// - drawImage → a sprite with the canvas as its texture (uploaded once, see MapGL.tex), placed by
//   the full current transform, so a mirrored soldier or a scaled terrain lands where Canvas2D
//   puts it. imageSmoothingEnabled picks the texture's filter, exactly the Canvas2D meaning:
//   false = hard pixel edges (the pixel art), true = smooth (emoji, name plates, glows);
// - fillRect → a tinted white sprite when the transform is axis-aligned (the sea, the tint, the
//   window pixels, the banners), otherwise a path;
// - fill/stroke → one pooled Graphics each, the path already flattened in screen space;
// - fillText → the text baked at its on-screen size (shadow included), then a sprite;
// - globalCompositeOperation 'lighter' → additive blending.
// Objects are handed out in call order and re-parented in that order every frame, so what
// Canvas2D paints later lies on top here too. Gradients and patterns are not supported: the map
// code uses baked glow canvases instead.
const PIX_STATE = ['globalCompositeOperation', 'imageSmoothingEnabled', 'font', 'textAlign', 'textBaseline', 'shadowColor', 'shadowBlur'];
class PixCtx extends GLCtx {
    constructor(gl) {
        super(null);
        this.gl = gl;
        this.pixelRatio = gl.R;
        this.spr = []; this.gfx = []; this.ns = 0; this.ng = 0;
        this._M = new PIXI.Matrix();
        this.reset();
    }
    reset() {
        this.m = [1, 0, 0, 1, 0, 0]; this.stack = []; this.subs = []; this.cur = null;
        this.fillStyle = '#000'; this.strokeStyle = '#000'; this.lineWidth = 1; this.lineCap = 'butt'; this.lineJoin = 'miter';
        this.miterLimit = 10; this.globalAlpha = 1; this.lineDashOffset = 0; this._dash = [];
        this.globalCompositeOperation = 'source-over'; this.imageSmoothingEnabled = true;
        this.font = '10px sans-serif'; this.textAlign = 'start'; this.textBaseline = 'alphabetic';
        this.shadowColor = 'rgba(0,0,0,0)'; this.shadowBlur = 0;
    }
    save() { super.save(); let s = this.stack[this.stack.length - 1]; PIX_STATE.forEach(k => { s[k] = this[k]; }); }
    restore() { let s = this.stack[this.stack.length - 1]; super.restore(); if(s) PIX_STATE.forEach(k => { this[k] = s[k]; }); }
    // One frame: every object goes back to the pool and is re-parented in call order
    begin(root) { this.root = root; this.reset(); this.ns = this.ng = 0; root.removeChildren(); }
    end() {
        // unused pool entries drop their textures, so an evicted one is never drawn again
        for(let i = this.ns; i < this.spr.length; i++) this.spr[i].texture = PIXI.Texture.EMPTY;
    }
    _spr() { let s = this.spr[this.ns++]; if(!s) { s = new PIXI.Sprite(); this.spr.push(s); } this.root.addChild(s); return s; }
    _gfx() { let g = this.gfx[this.ng++]; if(!g) { g = new PIXI.Graphics(); this.gfx.push(g); } g.clear(); this.root.addChild(g); return g; }
    _blend(o) { o.blendMode = this.globalCompositeOperation === 'lighter' ? 'add' : 'normal'; }
    // The current transform, then translate(x, y) and scale(sx, sy), onto a sprite
    _place(o, x, y, sx, sy) {
        let [a, b, c, d, e, f] = this.m;
        this._M.set(a * sx, b * sx, c * sy, d * sy, a * x + c * y + e, b * x + d * y + f);
        o.setFromMatrix(this._M);
    }
    fill() { let g = this._gfx(); this.gc = g.context; super.fill(); this._blend(g); }
    stroke() { let g = this._gfx(); this.gc = g.context; super.stroke(); this._blend(g); }
    fillRect(x, y, w, h) {
        if(typeof this.fillStyle !== 'string' || this.m[1] || this.m[2]) return super.fillRect(x, y, w, h);
        let [color, a] = GLCtx.rgba(this.fillStyle), s = this._spr(), t = PIXI.Texture.WHITE;
        if(s.texture !== t) s.texture = t;
        s.anchor.set(0, 0); s.tint = color; s.alpha = a * this.globalAlpha; this._blend(s);
        this._place(s, x, y, w / t.width, h / t.height);
    }
    drawImage(img, ...a) {
        let sx = 0, sy = 0, sw = img.width, sh = img.height, dx, dy, dw, dh;
        if(a.length === 2) { [dx, dy] = a; dw = sw; dh = sh; }
        else if(a.length === 4) [dx, dy, dw, dh] = a;
        else [sx, sy, sw, sh, dx, dy, dw, dh] = a;
        if(!(sw > 0 && sh > 0 && img.width > 0 && img.height > 0)) return;
        let t = this.gl.tex(img, !this.imageSmoothingEnabled, sx, sy, sw, sh), s = this._spr();
        if(s.texture !== t) s.texture = t;
        s.anchor.set(0, 0); s.tint = 0xffffff; s.alpha = this.globalAlpha; this._blend(s);
        this._place(s, dx, dy, dw / sw, dh / sh);
    }
    measureText(t) {
        let m = this._mctx || (this._mctx = BattleGL.canvas(1, 1).getContext('2d'));
        m.font = this.font;
        return m.measureText(t);
    }
    fillText(str, x, y) {
        // baked for its on-screen size in power-of-two steps, so a zoom re-bakes a handful of times
        let q = Math.pow(2, Math.max(-2, Math.min(3, Math.ceil(Math.log2(Math.max(1e-3, this.k() * this.pixelRatio))))));
        let e = this.gl.text(str, this.font, this.fillStyle, this.shadowColor, this.shadowBlur * this.pixelRatio, this.textAlign, this.textBaseline, q);
        let s = this._spr();
        if(s.texture !== e.tex) s.texture = e.tex;
        s.anchor.set(e.ax, e.ay); s.tint = 0xffffff; s.alpha = this.globalAlpha; this._blend(s);
        this._place(s, x, y, 1 / q, 1 / q);
    }
    strokeText() {}
    createRadialGradient() { throw new Error('PixCtx: gradients are not supported, draw a baked canvas'); }
}

const MapGL = {
    name: 'pixi', app: null, ready: false, w: 0, h: 0,
    R: 1,          // screen pixels per CSS pixel
    frame: 0, calls: 0, lastCalls: 0,
    fx: null,      // the PixCtx the map draws through
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
                // MSAA only touches the few vector shapes (rings, route, hail); on a phone's
                // tile-based GPU it is close to free
                antialias: true, background: 0x173f5c, autoStart: false, sharedTicker: false,
                preference: 'webgl', powerPreference: 'high-performance', hello: false
            });
            app.ticker.stop();
            this.app = app;
            // A lost context doesn't come back reliably on phones: finish the session on Canvas2D.
            this._onLost = e => { e.preventDefault(); Game.mapGlFailed(new Error('webglcontextlost')); };
            canvas.addEventListener('webglcontextlost', this._onLost);
            BattleGL.countCalls.call(this, app.renderer.gl);
            this.fx = new PixCtx(this);
            // Text is baked with the webfonts; once they finish loading, bake it again.
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
        Object.assign(this, { app: null, ready: false, _initP: null, w: 0, h: 0, fx: null, texs: [new Map(), new Map()], texts: new Map() });
    },
    info() {
        let c = this.app && this.app.canvas;
        return { resolution: `${this.R}x` + (c ? ` (${c.width}x${c.height})` : ''), drawCalls: this.lastCalls, textures: this.texs[0].size + this.texs[1].size };
    },
    resize(w, h) {
        this.w = w; this.h = h;
        if(this.app) this.app.renderer.resize(w, h);
    },

    // ---- Textures ------------------------------------------------------------------------
    // A baked canvas (or image) -> one texture source per filter, uploaded once; sub-rectangles
    // share it. Kept while drawn; one unused for 600 frames is freed (soldier frames and name
    // plates come and go as the camera moves).
    texs: [new Map(), new Map()],     // [smooth, nearest]
    tex(img, nearest, sx, sy, sw, sh) {
        let map = this.texs[nearest ? 1 : 0], e = map.get(img);
        if(!e) {
            let o = { resource: img, scaleMode: nearest ? 'nearest' : 'linear' };
            let src = typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement ? new PIXI.CanvasSource(o) : new PIXI.ImageSource(o);
            e = { src, whole: new PIXI.Texture({ source: src }), subs: null, used: 0 };
            map.set(img, e);
        }
        e.used = this.frame;
        if(!sx && !sy && sw === img.width && sh === img.height) return e.whole;
        let key = sx + ',' + sy + ',' + sw + ',' + sh, t = (e.subs || (e.subs = new Map())).get(key);
        if(!t) { t = new PIXI.Texture({ source: e.src, frame: new PIXI.Rectangle(sx, sy, sw, sh) }); e.subs.set(key, t); }
        return t;
    },
    // Text baked at q texture pixels per unit, drawn at a fixed spot of its canvas with the
    // requested align/baseline, so the anchor puts it exactly where Canvas2D would.
    texts: new Map(),
    text(str, font, fill, shadow, blur, align, base, q) {
        let key = [str, font, fill, shadow, blur, align, base, q].join('\u0001'), e = this.texts.get(key);
        if(e) { e.used = this.frame; return e; }
        let m = this._mctx || (this._mctx = BattleGL.canvas(1, 1).getContext('2d'));
        m.font = font;
        let px = parseFloat((/(\d+(?:\.\d+)?)px/.exec(font) || [0, 16])[1]), pad = 2 + blur / q * 1.5;
        let w = m.measureText(str).width + pad * 2, h = px * 2 + pad * 2;
        let c = BattleGL.canvas(w * q, h * q), x = c.getContext('2d');
        x.scale(q, q);
        x.font = font; x.textAlign = align; x.textBaseline = base; x.fillStyle = fill;
        if(blur) { x.shadowColor = shadow; x.shadowBlur = blur; }
        let ox = align === 'center' ? w / 2 : align === 'right' || align === 'end' ? w - pad : pad, oy = pad + px;
        x.fillText(str, ox, oy);
        e = { tex: new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: c }) }), ax: ox / w, ay: oy / h, used: this.frame };
        this.texts.set(key, e);
        return e;
    },
    dropTexts() {
        this.texts.forEach(e => e.tex.destroy(true));
        this.texts.clear();
    },
    evict() {
        let old = this.frame - 600;
        for(const map of this.texs) for(const [img, e] of map) if(e.used < old) {
            if(e.subs) e.subs.forEach(t => t.destroy(false));
            e.whole.destroy(false); e.src.destroy();
            map.delete(img);
        }
        for(const [k, e] of this.texts) if(e.used < old) { e.tex.destroy(true); this.texts.delete(k); }
    },

    // ---- One frame --------------------------------------------------------------------
    // `draw(ctx)` is MapArt.render with this PixCtx as its context
    render(draw) {
        this.frame++;
        this.calls = 0;
        this.fx.begin(this.app.stage);
        draw(this.fx);
        this.fx.end();
        this.app.render();
        this.lastCalls = this.calls;
        if(this.frame % 300 === 0) this.evict();
    }
};
