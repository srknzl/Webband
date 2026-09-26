// ============================================
// WEBBAND - WEBGL BATTLE RENDERER (PixiJS 8)
// ============================================
// The battle drawn through PixiJS (vendor/pixi.min.js) instead of Canvas2D (1.33.0). Same
// picture, same motion: it reads Battle's state and the same pose/gait/HUD helpers the
// Canvas2D path uses (Battle.unitPose, gait, dustPuff, tugBox, statusLine...) and writes none
// of it. What changes is how the pixels get made:
// - it renders at the screen's pixel density (min(devicePixelRatio, 3), autoDensity), so the
//   field is sharp on a retina phone — #battle-canvas is one canvas pixel per CSS pixel;
// - every per-unit shape (shadow, ring, sword, bow, arrow, corpse, bar, text) is baked ONCE
//   into a texture at the scale it will be shown at (device pixels x camera zoom), and every
//   unit is a pooled Sprite, so a frame is a handful of batched draw calls instead of ~15
//   ctx calls per unit; nothing is created per frame;
// - the only shapes still built per frame are the few that change shape every frame (swing
//   and trail arcs, shields, the boss telegraph, water shimmer, the minimap's view box).
// One app.render() per frame, the Pixi ticker stays stopped: Battle's own loop (with its
// skipFrame gate and 700 ms pulse check) decides when a frame is drawn.
// It lives on its own canvas (#battle-gl): #battle-canvas already holds the 2d context the
// chicken chase draws through, and a canvas can't hold both.

// A set of Sprites in one layer, handed out in draw order and hidden when unused. `shape`
// (a baked { tex, ax, ay }) is stamped on every sprite the pool makes.
class GLPool {
    constructor(layer, make) { this.layer = layer; this.make = make; this.items = []; this.n = 0; this.shape = null; }
    use(shape) { this.shape = shape; this.items.forEach(s => this.stamp(s)); }
    stamp(s) { if(this.shape) { s.texture = this.shape.tex; s.anchor.set(this.shape.ax, this.shape.ay); } }
    begin() { this.n = 0; }
    next() {
        let s = this.items[this.n];
        if(!s) { s = this.make(); this.stamp(s); this.items.push(s); this.layer.addChild(s); }
        s.visible = true; this.n++;
        return s;
    }
    end() { for(let i = this.n; i < this.items.length; i++) this.items[i].visible = false; }
}

const BattleGL = {
    name: 'pixi', app: null, ready: false, w: 0, h: 0,
    R: 1,          // screen pixels per CSS pixel (HUD, minimap, vignette)
    S: 0,          // world bake scale: R x camera zoom — a baked shape lands 1:1 on the screen
    frame: 0, calls: 0, lastCalls: 0,
    _initP: null,

    // ---- Lifecycle --------------------------------------------------------------------
    init(canvas) {
        if(this._initP) return this._initP;
        this._initP = (async () => {
            if(!canvas) throw new Error('#battle-gl missing');
            this.R = Math.min(3, window.devicePixelRatio || 1);
            const app = new PIXI.Application();
            await app.init({
                canvas, width: Math.max(1, canvas.clientWidth || 300), height: Math.max(1, canvas.clientHeight || 150),
                resolution: this.R, autoDensity: true,
                // MSAA only where a pixel is big enough to see a jagged arc; at 2-3x it is noise
                antialias: this.R < 2, background: 0x2d422a, autoStart: false, sharedTicker: false,
                preference: 'webgl', powerPreference: 'high-performance', hello: false
            });
            app.ticker.stop();
            this.app = app;
            // A lost context doesn't come back reliably on phones: finish the session on Canvas2D.
            this._onLost = e => { e.preventDefault(); Battle.glFailed(new Error('webglcontextlost')); };
            canvas.addEventListener('webglcontextlost', this._onLost);
            let gl = app.renderer.gl;
            this.maxTex = Math.min(4096, (gl && gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 4096);
            this.countCalls(gl);
            this.build();
            // Text is baked with the webfonts; once they finish loading, re-bake it.
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
        canvas.replaceWith(fresh);
        Object.assign(this, { app: null, ready: false, _initP: null, w: 0, h: 0, S: 0, shapes: null, P: null,
                              texts: new Map(), arts: new WeakMap(), groundFor: null, stripKey: null });
    },
    // Draw calls per frame for the debug report — cheaper than any profiler, and honest:
    // it counts what actually reached the GPU.
    countCalls(gl) {
        if(!gl) return;
        for(const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
            let f = gl[k];
            if(typeof f !== 'function') continue;
            gl[k] = (...a) => { this.calls++; return f.apply(gl, a); };
        }
    },
    info() {
        let c = this.app && this.app.canvas;
        return { resolution: `${this.R}x` + (c ? ` (${c.width}x${c.height})` : ''), drawCalls: this.lastCalls };
    },
    resize(w, h) {
        this.w = w; this.h = h;
        if(!this.app) return;
        this.app.renderer.resize(w, h);
        this.bakeScreen(w, h);
    },

    // ---- Texture helpers --------------------------------------------------------------
    canvas(w, h) { let c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; },
    texOf(c, nearest) {
        return new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: c, scaleMode: nearest ? 'nearest' : 'linear' }) });
    },
    // Battle's own baked unit canvases -> textures, once per canvas. A troop whose image was
    // still loading returns a placeholder canvas first, then the real one: a new key, a new texture.
    arts: new WeakMap(),
    artTex(c) {
        let t = this.arts.get(c);
        if(!t) { t = this.texOf(c, !!c._pixel); this.arts.set(c, t); }
        return t;
    },
    // A shape drawn in `w` x `h` field units at scale R; `ax/ay` is the anchor that sits on the point.
    shape(w, h, R, ax, ay, draw) {
        let c = this.canvas(w * R, h * R), x = c.getContext('2d');
        x.scale(R, R); draw(x);
        return { tex: this.texOf(c), ax, ay };
    },
    // Baked text, cached by content. Canvas2D's own strokeText/fillText rasterize it, so glyphs,
    // emoji and the webfonts look exactly as they do on the Canvas2D path.
    texts: new Map(),
    _mctx: null,
    text(str, font, fill, R, o = {}) {
        let key = [str, font, fill, R, o.stroke ? 1 : 0, o.shadow ? 1 : 0].join('\u0001');
        let e = this.texts.get(key);
        if(e) { e.used = this.frame; return e; }
        let m = this._mctx || (this._mctx = this.canvas(1, 1).getContext('2d'));
        m.font = font;
        let tw = m.measureText(str).width, px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)[1]);
        let pad = 4 + (o.shadow ? 8 : 0), w = tw + pad * 2, h = px * 1.5 + pad * 2;
        let c = this.canvas(w * R, h * R), x = c.getContext('2d');
        x.scale(R, R);
        x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
        // shadowBlur is in device pixels whatever the transform — scale it by hand
        if(o.shadow) { x.shadowColor = 'rgba(0,0,0,0.85)'; x.shadowBlur = 6 * R; }
        if(o.stroke) { x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,0.75)'; x.strokeText(str, w / 2, h / 2); }
        x.fillStyle = fill; x.fillText(str, w / 2, h / 2);
        e = { tex: this.texOf(c), w, h, pad, used: this.frame };
        this.texts.set(key, e);
        if(this.texts.size > 400) this.evictTexts();
        return e;
    },
    // Place a baked text on a sprite: `align` like Canvas2D's textAlign, middle baseline.
    putText(s, e, x, y, align, R) {
        s.texture = e.tex;
        s.anchor.set(align === 'left' ? e.pad / e.w : align === 'right' ? 1 - e.pad / e.w : 0.5, 0.5);
        s.position.set(x, y);
        s.scale.set(1 / R);
    },
    textSprites() { return this.P ? this.P.texts.items.concat(this.P.ranks.items, this.hudTexts) : []; },
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
        this.stripKey = null;
    },
    // CSS colour -> [0xRRGGBB, alpha], memoized: the same dozen colours come back every frame.
    _hex: new Map(),
    hex(css) {
        let v = this._hex.get(css);
        if(v) return v;
        if(css[0] === '#') v = [parseInt(css.length === 4 ? css.replace(/(\w)/g, '$1$1').slice(1) : css.slice(1, 7), 16), 1];
        else {
            let m = /rgba?\(([^)]+)\)/.exec(css), p = m ? m[1].split(',').map(Number) : [255, 255, 255, 1];
            v = [(p[0] << 16) | (p[1] << 8) | p[2], p[3] === undefined ? 1 : p[3]];
        }
        if(this._hex.size < 256) this._hex.set(css, v);
        return v;
    },
    tint(s, css, alpha = 1) { let [c, a] = this.hex(css); s.tint = c; s.alpha = a * alpha; },

    // ---- The scene graph, built once -------------------------------------------------
    build() {
        const C = () => new PIXI.Container(), stage = this.app.stage;
        this.world = C(); stage.addChild(this.world);
        this.ground = new PIXI.Sprite(); this.world.addChild(this.ground);
        const L = {};
        const graphics = parent => { let g = new PIXI.Graphics(); parent.addChild(g); return g; };
        L.terrainFx = graphics(this.world);                        // water shimmer, arrow rain off the wall
        this.oil = new PIXI.Sprite(); this.oil.anchor.set(0.5); this.world.addChild(this.oil);
        for(const n of ['stains', 'corpses']) { L[n] = C(); this.world.addChild(L[n]); }
        L.decal = graphics(this.world);                            // swing sweep, aim arc, boss telegraph
        for(const n of ['shadows', 'rings', 'dust', 'units', 'flash']) { L[n] = C(); this.world.addChild(L[n]); }
        this.pulse = new PIXI.Sprite(); this.pulse.anchor.set(0.5); L.rings.addChild(this.pulse);
        L.trails = graphics(this.world);                           // AI swing trails, shields
        for(const n of ['weapons', 'bars', 'arrows', 'sparks', 'texts']) { L[n] = C(); this.world.addChild(L[n]); }
        this.L = L;

        const S = (ax = 0.5, ay = 0.5) => () => { let s = new PIXI.Sprite(); s.anchor.set(ax, ay); return s; };
        this.P = {
            stains: new GLPool(L.stains, S()), corpses: new GLPool(L.corpses, S()),
            shadows: new GLPool(L.shadows, S()), rings: new GLPool(L.rings, S()), dust: new GLPool(L.dust, S()),
            // A unit: outer = feet point, hop and sway; inner = lean/squash pivoting on the feet
            units: new GLPool(L.units, () => {
                let o = new PIXI.Container(), i = new PIXI.Container(), body = new PIXI.Sprite(), rank = new PIXI.Sprite();
                body.anchor.set(0.5, 1); rank.anchor.set(0.5);
                i.addChild(body, rank); o.addChild(i);
                Object.assign(o, { inner: i, body, rank });
                return o;
            }),
            flash: new GLPool(L.flash, S()),
            bows: new GLPool(L.weapons, S(0, 0.5)), swords: new GLPool(L.weapons, S(0, 0.5)),
            barBg: new GLPool(L.bars, S(0, 0)),
            barFg: new GLPool(L.bars, () => new PIXI.NineSliceSprite({ texture: PIXI.Texture.WHITE })),
            barHi: new GLPool(L.bars, () => new PIXI.Sprite(PIXI.Texture.WHITE)),
            arrows: new GLPool(L.arrows, S()), sparks: new GLPool(L.sparks, () => { let s = new PIXI.Sprite(PIXI.Texture.WHITE); s.anchor.set(1, 0.5); return s; }),
            texts: new GLPool(L.texts, S()),
            ranks: { items: [] }   // rank ticks live inside the unit sprites; listed for text eviction
        };

        // Screen space: vignette, HUD, minimap — not zoomed
        this.vignette = new PIXI.Sprite(); stage.addChild(this.vignette);
        let hud = this.hud = C(); stage.addChild(hud);
        this.strip = new PIXI.Sprite(); hud.addChild(this.strip);
        this.tugBg = graphics(hud);
        this.tugMask = graphics(hud);
        this.tugClip = C(); hud.addChild(this.tugClip); this.tugClip.mask = this.tugMask;
        this.tugGreen = new PIXI.Sprite(); this.tugRed = new PIXI.Sprite(); this.tugHi = new PIXI.Sprite(PIXI.Texture.WHITE);
        this.tugTicks = new PIXI.Graphics();
        this.tugClip.addChild(this.tugGreen, this.tugRed, this.tugHi, this.tugTicks);
        this.markA = new PIXI.Sprite(PIXI.Texture.WHITE); this.markB = new PIXI.Sprite(PIXI.Texture.WHITE);
        hud.addChild(this.markA, this.markB);
        this.hudTexts = [];
        const T2 = () => { let s = new PIXI.Sprite(); hud.addChild(s); this.hudTexts.push(s); return s; };
        this.stTxt = T2(); this.koTxt = T2(); this.tugTxt = T2(); this.usTxt = T2(); this.themTxt = T2();
        this.mini = C(); stage.addChild(this.mini);
        this.miniBg = graphics(this.mini);
        this.miniDots = new GLPool(this.mini, S());
        this.miniView = graphics(this.mini);

        // Screen-space bakes that don't depend on the window size
        const R = this.R;
        const grad = (a, b) => {
            let c = this.canvas(256, 1), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 256, 0);
            g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, 256, 1);
            return this.texOf(c);
        };
        this.tugGreen.texture = grad('#2f8f4f', '#5ad07f');
        this.tugRed.texture = grad('#c0392b', '#7d241a');
        this.dotTex = this.shape(8, 8, R, 0.5, 0.5, x => { x.fillStyle = '#fff'; x.beginPath(); x.arc(4, 4, 4, 0, Math.PI * 2); x.fill(); }).tex;
        this.miniDots.make = () => { let s = new PIXI.Sprite(this.dotTex); s.anchor.set(0.5); return s; };
    },

    // Window-size-dependent screen bakes: vignette, tug bar frame, minimap frame.
    bakeScreen(W, H) {
        if(!this.app) return;
        // Vignette: the same radial gradient Canvas2D fills every frame, baked at half size
        let c = this.canvas(W / 2, H / 2), x = c.getContext('2d');
        x.scale(0.5, 0.5);
        let vg = x.createRadialGradient(W/2, H/2, Math.min(W,H)*0.35, W/2, H/2, Math.max(W,H)*0.72);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
        x.fillStyle = vg; x.fillRect(0, 0, W, H);
        if(this.vignette.texture && this.vignette.texture !== PIXI.Texture.EMPTY) this.vignette.texture.destroy(true);
        this.vignette.texture = this.texOf(c);
        this.vignette.width = W; this.vignette.height = H;

        // Tug-of-war frame, clip and tick marks (soft pill ends, 1.32.0)
        let { barW, barH, barX, barY } = Battle.tugBox(W);
        this.tugBg.clear().roundRect(barX - 6, barY - 6, barW + 12, barH + 12, (barH + 12) / 2)
            .fill({ color: 0x0a0c09, alpha: 0.75 }).stroke({ width: 1.5, color: 0xc8aa5a, alpha: 0.5 });
        this.tugMask.clear().roundRect(barX, barY, barW, barH, barH / 2).fill(0xffffff);
        this.tugTicks.clear();
        for(let i = 1; i < 10; i++) { let tx = barX + barW * i / 10; this.tugTicks.moveTo(tx, barY).lineTo(tx, barY + barH); }
        this.tugTicks.stroke({ width: 1, color: 0x000000, alpha: 0.35 });
        this.tugHi.position.set(barX, barY); this.tugHi.width = barW; this.tugHi.height = barH / 2; this.tugHi.alpha = 0.12;
        this.tugGreen.position.set(barX, barY); this.tugGreen.width = barW; this.tugGreen.height = barH;

        // Minimap frame (#4)
        this.miniBox = Battle.miniBox(W);
        let { mw, mh } = this.miniBox;
        this.miniBg.clear().rect(this.miniBox.mx, this.miniBox.my, mw, mh)
            .fill({ color: 0x0a0e0a, alpha: 0.6 }).stroke({ width: 1, color: 0xc8aa5a, alpha: 0.5 });
        this.stripKey = null;
    },

    // World shapes, baked at scale S whenever the camera zoom (and so S) changes.
    bakeWorld(S) {
        if(this.shapes) for(const k in this.shapes) this.shapes[k].tex.destroy(true);
        const sh = {}, mk = (k, w, h, ax, ay, draw) => { sh[k] = this.shape(w, h, S, ax, ay, draw); };
        mk('shadow', 28, 14, 0.5, 0.5, x => { x.fillStyle = '#000'; x.beginPath(); x.ellipse(14, 7, 12, 5.5, 0, 0, Math.PI * 2); x.fill(); });
        for(const team of [0, 1]) mk('ring' + team, 26, 13, 0.5, 0.5, x => {
            x.beginPath(); x.ellipse(13, 6.5, 10, 4.5, 0, 0, Math.PI * 2);
            x.fillStyle = team ? 'rgba(79,168,255,0.28)' : 'rgba(255,90,74,0.28)'; x.fill();
            // Friendly solid, enemy dashed (#55 item 6) — readable on a grayscale screen too
            x.setLineDash(team ? [] : [4, 3.2]);
            x.strokeStyle = team ? '#4fa8ff' : '#ff5a4a'; x.lineWidth = 2.5; x.stroke();
        });
        mk('pulse', 34, 17, 0.5, 0.5, x => {
            x.beginPath(); x.ellipse(17, 8.5, 14, 6.5, 0, 0, Math.PI * 2);
            x.strokeStyle = 'rgba(255,204,0,0.85)'; x.lineWidth = 2.5; x.stroke();
        });
        // White discs, tinted per use: a small one for dust and blood, a big one for the hit flash
        mk('c4', 10, 10, 0.5, 0.5, x => { x.fillStyle = '#fff'; x.beginPath(); x.arc(5, 5, 4, 0, Math.PI * 2); x.fill(); });
        mk('c16', 34, 34, 0.5, 0.5, x => { x.fillStyle = '#fff'; x.beginPath(); x.arc(17, 17, 16, 0, Math.PI * 2); x.fill(); });
        for(const team of [0, 1]) mk('corpse' + team, 22, 12, 0.5, 0.5, x => {
            x.globalAlpha = 0.5; x.fillStyle = team ? '#4a5a7a' : '#6a3a3a';
            x.beginPath(); x.ellipse(11, 6, 9, 4.5, 0, 0, Math.PI * 2); x.fill();
            x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 1; x.stroke();
        });
        // Sword: origin at the hand, blade along +x (drawUnit's polygon and gradient)
        mk('sword', 48, 14, 0, 0.5, x => {
            x.translate(0, 7); x.beginPath();
            x.moveTo(10,-2); x.lineTo(15,-2); x.lineTo(15,-6); x.lineTo(18,-6); x.lineTo(18,-2); x.lineTo(40,-2); x.lineTo(45,0); x.lineTo(40,2);
            x.lineTo(18,2); x.lineTo(18,6); x.lineTo(15,6); x.lineTo(15,2); x.lineTo(10,2); x.closePath();
            let g = x.createLinearGradient(10, -4, 45, 4);
            g.addColorStop(0, '#8a7a55'); g.addColorStop(0.35, '#f2f2f6'); g.addColorStop(1, '#9aa0aa');
            x.fillStyle = g; x.fill(); x.strokeStyle = '#3a3a3a'; x.lineWidth = 1; x.stroke();
        });
        mk('bow', 26, 26, 0, 0.5, x => {
            x.translate(0, 13);
            x.beginPath(); x.arc(12, 0, 11, -Math.PI/2.2, Math.PI/2.2); x.lineWidth = 2.5; x.strokeStyle = '#c8a24a'; x.stroke();
            x.beginPath(); x.moveTo(12 + 11*Math.cos(-Math.PI/2.2), 11*Math.sin(-Math.PI/2.2));
            x.lineTo(12 + 11*Math.cos(Math.PI/2.2), 11*Math.sin(Math.PI/2.2));
            x.lineWidth = 1; x.strokeStyle = 'rgba(255,255,255,0.7)'; x.stroke();
        });
        for(const team of [0, 1]) mk('arrow' + team, 22, 10, 15 / 22, 0.5, x => {
            x.translate(15, 5);
            x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 3; x.beginPath(); x.moveTo(-11, 3); x.lineTo(4, 3); x.stroke();
            x.strokeStyle = '#d8c9a0'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(-11, 0); x.lineTo(5, 0); x.stroke();
            x.fillStyle = '#e8e8ee'; x.beginPath(); x.moveTo(5, 0); x.lineTo(0, -2); x.lineTo(0, 2); x.closePath(); x.fill();
            x.strokeStyle = team ? '#8fd4ff' : '#ff9a8a'; x.lineWidth = 1.4;
            x.beginPath(); x.moveTo(-11, 0); x.lineTo(-14, -3); x.moveTo(-11, 0); x.lineTo(-14, 3); x.stroke();
        });
        // Health bar: the dark back is always the same size; the fill is a nine-slice pill
        mk('barBg', 28, 5, 0, 0, x => { x.fillStyle = 'rgba(0,0,0,0.65)'; Battle.roundRect(x, 0, 0, 28, 5, 2.5); x.fill(); });
        mk('pill', 6, 3, 0, 0, x => { x.fillStyle = '#fff'; Battle.roundRect(x, 0, 0, 6, 3, 1.5); x.fill(); });
        // The boiling-oil glow at a used breach (#118): alpha carries the pulse
        mk('oil', 92, 92, 0.5, 0.5, x => {
            let g = x.createRadialGradient(46, 46, 4, 46, 46, 46);
            g.addColorStop(0, 'rgba(255,150,40,1)'); g.addColorStop(1, 'rgba(255,150,40,0)');
            x.fillStyle = g; x.beginPath(); x.arc(46, 46, 46, 0, Math.PI * 2); x.fill();
        });
        this.shapes = sh;
        this.oil.texture = sh.oil.tex;
        this.pulse.texture = sh.pulse.tex;
        const P = this.P;
        P.shadows.use(sh.shadow); P.stains.use(sh.c4); P.dust.use(sh.c4); P.flash.use(sh.c16);
        P.bows.use(sh.bow); P.swords.use(sh.sword); P.barBg.use(sh.barBg);
        // Nine-slice borders are in texture pixels, so the fill pills are rebuilt per scale
        P.barFg.make = () => new PIXI.NineSliceSprite({ texture: sh.pill.tex, leftWidth: 1.5 * S, rightWidth: 1.5 * S, topHeight: 0, bottomHeight: 0 });
        P.barFg.items.forEach(s => s.destroy());
        P.barFg.items = [];
        this.S = S;
    },

    // ---- One frame --------------------------------------------------------------------
    render(b, now) {
        const W = b.canvas.width, H = b.canvas.height, lite = Game.lite(), P = this.P;
        this.frame++;
        this.calls = 0;
        const zoom = b.camZoom || 1, cam = b.cam || { x: W/2, y: H/2 };
        const S = Math.min(6, Math.round(this.R * zoom * 4) / 4);
        if(S !== this.S) {
            this.bakeWorld(S);
            // Battle bakes its own unit canvases at S; do it before the first frame needs them
            Battle.UNIT_ICONS.forEach(i => this.artTex(b.unitSprite(i, S)));
        }
        const inv = 1 / S;

        // Ground: Battle.buildGround at more pixels per unit (capped by the GPU's texture size).
        // Baked once per field like on Canvas2D — a lite-mode flip mid-battle doesn't re-roll it.
        if(!b.ground || b.ground._w !== W || b.ground._h !== H) {
            let gs = Math.max(1, Math.min(S, lite ? 2 : 3, this.maxTex / Math.max(W, H)));
            b.buildGround(Math.floor(gs * 4) / 4 || 1);
        }
        if(this.groundFor !== b.ground) {
            let old = this.ground.texture;
            this.ground.texture = this.texOf(b.ground, true);   // pixel ground (2.1): hard edges at any zoom
            this.ground.scale.set(1 / b.ground._s);
            if(old && old !== PIXI.Texture.EMPTY) old.destroy(true);
            this.groundFor = b.ground;
        }

        // Camera (#4) + the player-hit shake (1.32.0) — a sine, never Math.random
        let shx = 0, shy = 0;
        if(b.shakeT !== undefined && b.shakeT < 0.22 && Anim.on()) {
            let s = 2.2 * Anim.decay(b.shakeT, 0.22) / zoom;
            shx = Math.sin(b.battleTime * 97) * s; shy = Math.cos(b.battleTime * 71) * s;
        }
        this.world.scale.set(zoom);
        this.world.position.set(W/2 + (shx - cam.x) * zoom, H/2 + (shy - cam.y) * zoom);

        for(const k in P) if(P[k].begin) P[k].begin();

        // Water shimmer + siege arrow rain (not in lite mode)
        let gT = this.L.terrainFx.clear();
        if(b.terrain && b.terrain.rivers && !lite) {
            b.terrain.rivers.forEach(r => {
                for(let i = 0; i < 7; i++) {
                    let t = (now/1400 + i/7) % 1;
                    if(r.isVertical) { let y = t*H; gT.moveTo(r.x+6, y).lineTo(r.x+r.w-6, y + Math.sin(now/500+i)*4); }
                    else { let x = t*W; gT.moveTo(x, r.y+6).lineTo(x + Math.sin(now/500+i)*4, r.y+r.h-6); }
                }
            });
            gT.stroke({ width: 2, color: 0xffffff, alpha: 0.14 });
        }
        this.oil.visible = false;
        if(b.siege && b.siege.wall && !lite) this.siegeFx(b, gT, now, H);

        // Blood and corpses
        b.bloodStains.forEach(bs => {
            let s = P.stains.next(); s.position.set(bs.x, bs.y); s.scale.set(bs.size / 4 * inv);
            s.tint = 0x7a0a0a; s.alpha = bs.alpha * 0.8;
        });
        b.corpses.forEach(cp => {
            let s = P.corpses.next(), k = cp.isPlayerTeam ? 'corpse1' : 'corpse0';
            if(s.texture !== this.shapes[k].tex) s.texture = this.shapes[k].tex;
            s.position.set(cp.x, cp.y); s.rotation = cp.rot; s.scale.set(inv);
            s.alpha = cp.born === undefined ? 1 : Anim.k(b.battleTime - cp.born - 0.2, 0.5, 'outQuad');
        });

        // Decals: the player's swing sweep, the touch aim arc (#88), boss telegraphs (#132)
        let gD = this.L.decal.clear();
        let half = b.swingHalfAngle();
        b.swings.forEach(sw => {
            let a = Anim.ease.outQuad(Anim.clamp01(sw.life / 0.3));
            gD.moveTo(sw.x, sw.y).arc(sw.x, sw.y, 46, sw.angle - half, sw.angle + half).closePath()
              .fill({ color: 0xfff0be, alpha: 0.18 * a }).stroke({ width: 2, color: 0xffffff, alpha: 0.45 * a });
        });
        let aimP = Game.isTouch() && b.units.find(u => u.id === 'player' && u.hp > 0);
        if(aimP) {
            let a = Math.atan2(Input.mouse.y - aimP.y, Input.mouse.x - aimP.x);
            gD.moveTo(aimP.x, aimP.y).arc(aimP.x, aimP.y, 42, a - half, a + half).closePath()
              .stroke({ width: 1.5, color: 0xffe196, alpha: 0.32 });
        }
        b.units.forEach(u => {
            let sp = u.hp > 0 && u.special;
            if(!sp || sp.state !== 'telegraph') return;
            let pulse = 0.4 + 0.3 * Math.abs(Math.sin(now / 120));
            if(sp.shape === 'circle') gD.circle(sp.tx, sp.ty, sp.radius);
            else {
                let c = Math.cos(sp.angle), s = Math.sin(sp.angle), hw = sp.width / 2, L2 = sp.length;
                gD.poly([sp.tx + hw*s, sp.ty - hw*c, sp.tx + L2*c + hw*s, sp.ty + L2*s - hw*c,
                         sp.tx + L2*c - hw*s, sp.ty + L2*s + hw*c, sp.tx - hw*s, sp.ty + hw*c]);
            }
            gD.fill({ color: 0xff3c3c, alpha: pulse * 0.18 }).stroke({ width: 3, color: 0xff3c3c, alpha: pulse });
        });

        // Units, y-sorted; the just-fallen too, for DIE_T seconds of their fall (1.32.0)
        let gTr = this.L.trails.clear();
        this.pulse.visible = false;
        b.units.filter(u => u.hp > 0 || (u.deadT !== undefined && u.deadT < b.dieT(u)))
            .sort((a, c) => a.y - c.y).forEach(u => this.unit(b, u, now, S, lite, gTr));

        b.projectiles.forEach(p => {
            let s = P.arrows.next(), sh = this.shapes[p.isPlayerTeam ? 'arrow1' : 'arrow0'];
            if(s.texture !== sh.tex) { s.texture = sh.tex; s.anchor.set(sh.ax, sh.ay); }
            s.position.set(p.x, p.y); s.rotation = Math.atan2(p.vy, p.vx); s.scale.set(inv);
        });
        b.sparks.forEach(sp => {
            let s = P.sparks.next();
            this.tint(s, sp.color, Math.max(0, sp.life / 0.4));
            s.position.set(sp.x, sp.y); s.rotation = Math.atan2(sp.vy, sp.vx);
            s.width = Math.hypot(sp.vx, sp.vy) * 0.02; s.height = 1.5;
        });
        // Damage numbers pop in: small, overshoot, settle (Anim.ease.outBack, 1.32.0)
        let pop = Anim.on();
        b.floatingTexts.forEach(f => {
            let s = P.texts.next(), e = this.text(f.text, `bold ${f.big ? 15 : 12}px Inter, sans-serif`, f.color, S, { stroke: true });
            let age = f.age || 0, k = pop && age < 0.2 ? 0.55 + 0.45 * Anim.ease.outBack(age / 0.2) : 1;
            this.putText(s, e, f.x, f.y, 'center', S);
            s.scale.set(k * inv);
            s.alpha = Anim.ease.outQuad(Anim.clamp01(f.life / 0.4));
        });
        for(const k in P) if(P[k].end) P[k].end();

        this.hudFrame(b, W, H, now, lite);
        this.miniFrame(b, W, H);
        this.app.render();
        this.lastCalls = this.calls;
    },

    siegeFx(b, g, now, H) {
        let w = b.siege.wall, t = (now / 900) % 1;
        if(t < 0.5) {
            for(let i = 0; i < 5; i++) {
                let sy = (H / 5) * i + 20, prog = (t*2 + i*0.13) % 1;
                let sx = w.x - w.t/2 - 4, ex = sx - 130;
                let x = sx + (ex - sx) * prog, y = sy - Math.sin(prog * Math.PI) * 30;
                g.moveTo(x, y).lineTo(x + 10, y + 3);
            }
            g.stroke({ width: 1.5, color: 0xdcc896, alpha: 0.55 });
        }
        let gate = w.gaps.find(gp => gp.gate);
        if(gate && b.units.some(u => u.isPlayerTeam && Math.abs(u.x - w.x) < 60 && Math.abs(u.y - gate.y) < gate.h/2)) {
            this.oil.visible = true;
            this.oil.position.set(w.x, gate.y); this.oil.scale.set(1 / this.S);
            this.oil.alpha = 0.25 + 0.15 * Math.sin(now / 180);
        }
    },

    // One unit: drawUnit's layers, spread over the shared layers (shadow < ring < body < flash <
    // weapons < bar) and posed by Battle.unitPose — the Canvas2D path's exact numbers.
    unit(b, u, now, S, lite, gTr) {
        const P = this.P, inv = 1 / S, isPlayer = u.id === 'player';
        let p = b.unitPose(u, now), hop = p.hop;
        let s = P.shadows.next();
        s.position.set(u.x, u.y + 9); s.scale.set(inv); s.alpha = p.alpha * (0.5 - hop * 0.03);
        if(!p.dead) {
            if(b.teamRing(u)) {                           // only a unit without clothes to show (Battle.teamRing)
                s = P.rings.next();
                let rk = u.isPlayerTeam ? 'ring1' : 'ring0';
                if(s.texture !== this.shapes[rk].tex) s.texture = this.shapes[rk].tex;
                s.position.set(u.x, u.y + 9); s.scale.set(inv);
            }
            if(isPlayer) {
                this.pulse.visible = true;
                this.pulse.position.set(u.x, u.y + 9); this.pulse.scale.set((1 + Math.sin(now/300)*0.12) * inv);
            }
            let dp = p.moving && !lite ? b.dustPuff(u, now, (u.x + u.y) * 0.05) : null;
            if(dp) { s = P.dust.next(); s.position.set(dp.x, dp.y); s.scale.set(dp.r / 4 * inv); s.tint = 0xc4ba96; s.alpha = 0.35; }
        }

        // A Swordsman frame is baked at its own pixel size (`_k` field units per pixel) and
        // anchored on its feet (`_ax/_ay`); every other art is baked at S and anchored bottom-centre.
        let o = P.units.next(), art = b.unitArt(u, S, now), sprite = art._ay !== undefined;
        let k = art._k || inv, lh = art.height * k, foot = sprite ? b.SPRITE_FOOT : lh / 2;
        o.position.set(p.ux, p.uy - hop); o.rotation = p.sway; o.alpha = p.alpha;
        o.inner.position.set(0, foot); o.inner.rotation = p.lean; o.inner.scale.set(p.sx, p.sy);
        o.body.texture = this.artTex(art); o.body.scale.set(k);
        o.body.anchor.set(sprite ? art._ax : 0.5, sprite ? art._ay : 1);
        o.rank.visible = u.level >= 5;
        if(o.rank.visible) {
            let e = this.text(u.level >= 20 ? '^' : u.level >= 15 ? "'''" : u.level >= 10 ? "''" : "'", 'bold 15px Inter, sans-serif', '#ffcc44', S);
            this.putText(o.rank, e, -12, art._rankY !== undefined ? art._rankY : -12 - lh / 2, 'center', S);
            if(P.ranks.items.indexOf(o.rank) < 0) P.ranks.items.push(o.rank);
        }
        if(p.dead) return;   // a falling unit has no flash, weapon, shield or health bar

        let ux = p.ux, uy = p.uy - hop;
        let flash = u.hitT !== undefined ? Anim.decay(u.hitT, 0.3) * 0.75 : 0;
        if(flash > 0.01) { s = P.flash.next(); s.position.set(ux, uy); s.scale.set(13 / 16 * inv); s.alpha = flash; }
        // AI swing trail (1.32.0)
        if(!isPlayer && u.atkT < 0.22) {
            let k = Anim.k(u.atkT, 0.22, 'outCubic'), a0 = u.atkA - 0.85;
            if(k > 0) gTr.moveTo(ux + Math.cos(a0) * 20, uy - 2 + Math.sin(a0) * 20).arc(ux, uy - 2, 20, a0, a0 + 1.7 * k)
                .stroke({ width: 1 + 2.5 * (1 - k), color: 0xfff5d7, alpha: 0.6 * (1 - k) });
        }
        // Shield while blocking — a 60° arc, white on a hit
        if(u.blocking) {
            let ba = u.blockAngle || 0, [col, al] = this.hex(u.blockFlash > 0 ? '#ffffff' : u.hasShield ? 'rgba(150,190,255,0.9)' : 'rgba(190,190,190,0.6)');
            gTr.moveTo(ux + Math.cos(ba - Math.PI/3) * 20, uy + Math.sin(ba - Math.PI/3) * 20).arc(ux, uy, 20, ba - Math.PI/3, ba + Math.PI/3)
               .stroke({ width: u.blockFlash > 0 ? 7 : 5, color: col, alpha: al });
        }
        if((isPlayer ? u.bowTimer > 0 : u.shotT < 0.25) && !art._bow) {   // the archer sprite draws its own bow
            s = P.bows.next(); s.position.set(ux, uy); s.rotation = (isPlayer ? u.angleToMouse : u.shotA) || 0; s.scale.set(inv);
        }
        // A Swordsman player swings the sprite's own sword; the trail still shows where it cuts.
        if(u.isAttacking && isPlayer && sprite) {
            let a1 = u.currentWeaponAngle || 0, k2 = 1 - Math.max(0, u.attackTimer) / 0.3, a0 = a1 - 1.2 * Math.min(1, k2 + 0.2);
            gTr.moveTo(ux + Math.cos(a0) * 24, uy - 2 + Math.sin(a0) * 24).arc(ux, uy - 2, 24, a0, a1)
               .stroke({ width: 3, color: 0xfff5d7, alpha: 0.7 * (1 - k2 * 0.6) });
        }
        else if(u.isAttacking) { s = P.swords.next(); s.position.set(ux, uy); s.rotation = u.currentWeaponAngle || 0; s.scale.set(inv); }

        // Health bar — only when wounded, always for the player
        if(u.hp < u.maxHp || isPlayer) {
            let bw = 26, r = Math.max(0, u.hp / u.maxHp), by = u.y - 20 - hop;
            s = P.barBg.next(); s.position.set(u.x - bw/2 - 1, by - 1); s.scale.set(inv);
            let fw = bw * r;
            if(fw > 0.5) {
                s = P.barFg.next();
                s.tint = this.hex(r > 0.5 ? '#41d06a' : r > 0.25 ? '#e8c93a' : '#e0463a')[0];
                s.position.set(u.x - bw/2, by);
                // under 3 units the pill's round ends meet: squash the smallest pill instead
                s.width = Math.max(fw, 3) * S; s.height = 3 * S; s.scale.set(fw < 3 ? fw / 3 * inv : inv, inv);
            }
            s = P.barHi.next(); s.position.set(u.x - bw/2, by); s.width = fw; s.height = 1; s.alpha = 0.25;
        }
    },

    // Screen-space HUD: the same pieces drawHud draws, from the same Battle helpers.
    hudFrame(b, W, H, now, lite) {
        const R = this.R;
        let { touch, B, hudW } = b.hudLayout(W, H);
        // Command strip: baked whole, re-baked only when what it shows changes
        let key = b.cmdStripKey(hudW, touch);
        this.strip.visible = !!key;
        if(key && (key = key + '|' + W + '|' + B) !== this.stripKey) {
            let c = this.canvas(W * R, 32 * R), x = c.getContext('2d');
            x.scale(R, R); x.translate(0, -(B - 42));
            b.drawCmdStrip(x, B, hudW, touch);
            if(this.strip.texture && this.strip.texture !== PIXI.Texture.EMPTY) this.strip.texture.destroy(true);
            this.strip.texture = this.texOf(c);
            this.strip.position.set(0, B - 42); this.strip.scale.set(1 / R);
            this.stripKey = key;
        }
        let st = b.statusLine(touch);
        this.stTxt.visible = !!st;
        if(st) this.putText(this.stTxt, this.text(st.text, 'bold 12px Inter, sans-serif', st.color, R), 22, B - 56, 'left', R);
        this.koTxt.visible = !!b.knockedOut;
        if(b.knockedOut) this.putText(this.koTxt, this.text(T('☠ Baygınsın — adamların savaşıyor'), 'bold 13px Inter, sans-serif', 'rgba(255,70,70,0.9)', R), 22, B - 76, 'left', R);

        // Power bar
        let pa = 0, ea = 0;
        b.units.forEach(u => { if(u.hp > 0) u.isPlayerTeam ? pa++ : ea++; });
        let on = pa + ea > 0;
        for(const s of [this.tugBg, this.tugClip, this.markA, this.markB, this.tugTxt, this.usTxt, this.themTxt]) s.visible = on;
        if(!on) return;
        let tug = b.tugShown(pa / (pa + ea)), { barW, barH, barX, barY } = b.tugBox(W), fill = barW * tug;
        this.tugRed.visible = barW - fill > 0.01;
        this.tugRed.position.set(barX + fill, barY); this.tugRed.width = barW - fill; this.tugRed.height = barH;
        let jitter = Math.sin(now/110) * 3;
        this.markA.position.set(barX + fill - 2 + jitter, barY - 5); this.markA.width = 4; this.markA.height = barH + 10;
        this.markB.position.set(barX + fill - 1 + jitter, barY - 5); this.markB.width = 2; this.markB.height = barH + 10;
        this.tint(this.markB, 'rgba(255,220,120,0.9)');
        let sh = { shadow: !lite };
        this.putText(this.tugTxt, this.text(b.tugStatus(tug), 'bold 18px Cinzel, serif', '#f3e6c0', R, sh), W/2, barY - 18, 'center', R);
        this.putText(this.usTxt, this.text(T`Biz ${pa}`, 'bold 13px Inter, sans-serif', '#fff', R, sh), barX + 8, barY + barH/2, 'left', R);
        this.putText(this.themTxt, this.text(T`${ea} Düşman`, 'bold 13px Inter, sans-serif', '#fff', R, sh), barX + barW - 8, barY + barH/2, 'right', R);
    },

    // Minimap (#4): the whole field shrunk into the corner, plus the camera's view box.
    miniFrame(b, W, H) {
        let on = b.units.length > 0;
        this.mini.visible = on;
        this.miniDots.begin();
        let gV = this.miniView.clear();
        if(on) {
            let { mw, mh, mx, my } = this.miniBox, sx = mw / W, sy = mh / H, inv = 1 / this.R;
            b.units.forEach(u => {
                if(u.hp <= 0) return;
                let s = this.miniDots.next(), me = u.id === 'player';
                s.position.set(mx + u.x * sx, my + u.y * sy);
                s.tint = me ? 0xffcc00 : u.isPlayerTeam ? 0x4fa8ff : 0xff5a4a;
                s.scale.set((me ? 2.6 : 1.6) / 4 * inv);
            });
            let zoom = b.camZoom || 1;
            if(zoom > 1.02 && b.cam) {
                let halfW = W / (2*zoom), halfH = H / (2*zoom);
                gV.rect(mx + (b.cam.x - halfW) * sx, my + (b.cam.y - halfH) * sy, halfW * 2 * sx, halfH * 2 * sy)
                  .stroke({ width: 1, color: 0xffffff, alpha: 0.55 });
            }
        }
        this.miniDots.end();
    }
};
