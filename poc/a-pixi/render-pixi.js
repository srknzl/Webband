// Track A: the same battle drawn by PixiJS 8 (WebGL -> ANGLE -> Metal on iOS). Nothing is
// pathed per frame: every ring/sword/arrow/corpse is a baked texture, every unit a pooled
// Sprite, so a frame is a few batched draw calls instead of ~15 ctx calls per unit.
// Rendered at the device's pixel ratio (crisp on retina), which Canvas2D can't afford.
/* global PIXI */
import { TYPES, gait, lerp } from '../sim/battle-sim.js';
import { bakeFitted, bakeShapes, bakeGround, bakeVignette, hpColor } from './assets.js';

class Pool {
    constructor(layer, make) { this.layer = layer; this.make = make; this.items = []; this.n = 0; }
    begin() { this.n = 0; }
    next() {
        let s = this.items[this.n];
        if (!s) { s = this.make(); this.items.push(s); this.layer.addChild(s); }
        s.visible = true; this.n++;
        return s;
    }
    end() { for (let i = this.n; i < this.items.length; i++) this.items[i].visible = false; }
}

const hex = css => parseInt(css.slice(1), 16);

export class PixiRenderer {
    static async create(host, assets) {
        const r = new PixiRenderer();
        r.R = Math.min(3, window.devicePixelRatio || 1);
        r.app = new PIXI.Application();
        await r.app.init({
            width: 300, height: 150, resolution: r.R, autoDensity: true, antialias: false,
            background: 0x1d2a17, autoStart: false, sharedTicker: false, preference: 'webgl',
            powerPreference: 'high-performance',
        });
        r.app.ticker.stop();
        r.canvas = r.app.canvas;
        r.canvas.className = 'stage';
        host.appendChild(r.canvas);
        r.build(assets);
        return r;
    }
    get name() { return `PixiJS ${this.R}x (${this.app.renderer.name || 'webgl'})`; }
    setActive(on) { this.canvas.style.display = on ? 'block' : 'none'; }

    build(assets) {
        const R = this.R, tex = c => { const t = PIXI.Texture.from(c); t.source.scaleMode = 'linear'; return t; };
        this.shapes = bakeShapes(R);
        this.tx = {};
        for (const k in this.shapes) this.tx[k] = tex(this.shapes[k].c);
        this.unitTx = {};
        for (const key in assets.troops) {
            const t = PIXI.Texture.from(bakeFitted(assets.troops[key], TYPES[key.split('_')[0]].size, R));
            t.source.scaleMode = 'nearest';
            this.unitTx[key] = t;
        }
        PIXI.BitmapFont.install({
            name: 'dmg', chars: [['0', '9']], resolution: R, padding: 4,
            style: { fontFamily: 'Inter, Arial, sans-serif', fontSize: 12, fontWeight: 'bold', fill: '#ffffff',
                stroke: { color: '#000000', width: 3, alpha: 0.75 } },
        });

        const C = () => new PIXI.Container();
        const stage = this.app.stage;
        this.world = C(); stage.addChild(this.world);
        this.groundSprite = new PIXI.Sprite(); this.world.addChild(this.groundSprite);
        const layers = ['stains', 'corpses', 'shadows', 'rings', 'units', 'flash', 'weapons', 'bars', 'arrows', 'sparks', 'texts'];
        this.L = {};
        for (const n of layers) { this.L[n] = C(); this.world.addChild(this.L[n]); }
        const S = (t, ax = 0.5, ay = 0.5) => () => { const s = new PIXI.Sprite(t); s.anchor.set(ax, ay); return s; };
        const sh = this.shapes;
        this.P = {
            stains: new Pool(this.L.stains, S(this.tx.stain)),
            corpses: new Pool(this.L.corpses, S(this.tx.corpse0)),
            shadows: new Pool(this.L.shadows, S(this.tx.shadow)),
            rings: new Pool(this.L.rings, S(this.tx.ring0)),
            units: new Pool(this.L.units, S(PIXI.Texture.EMPTY)),
            flash: new Pool(this.L.flash, S(this.tx.flash)),
            swords: new Pool(this.L.weapons, S(this.tx.sword, sh.sword.ax, sh.sword.ay)),
            bows: new Pool(this.L.weapons, S(this.tx.bow, sh.bow.ax, sh.bow.ay)),
            barBg: new Pool(this.L.bars, S(PIXI.Texture.WHITE, 0, 0)),
            barFg: new Pool(this.L.bars, S(PIXI.Texture.WHITE, 0, 0)),
            arrows: new Pool(this.L.arrows, S(this.tx.arrow0, sh.arrow0.ax, sh.arrow0.ay)),
            sparks: new Pool(this.L.sparks, S(this.tx.dot, 1, 0.5)),
            texts: new Pool(this.L.texts, () => { const t = new PIXI.BitmapText({ text: '0', style: { fontFamily: 'dmg', fontSize: 12 } }); t.anchor.set(0.5); return t; }),
        };
        this.vignette = new PIXI.Sprite(tex(bakeVignette()));
        stage.addChild(this.vignette);
    }

    resize(w, h) {
        this.w = w; this.h = h;
        this.app.renderer.resize(w, h);
        this.vignette.width = w; this.vignette.height = h;
    }

    render(sim, alpha, cam, tMs) {
        const R = this.R, inv = 1 / R, P = this.P;
        if (this.groundFor !== sim.decor) {
            const gs = Math.min(2, R, 4096 / sim.W);
            const old = this.groundSprite.texture;
            this.groundSprite.texture = PIXI.Texture.from(bakeGround(sim, gs));
            this.groundSprite.scale.set(1 / gs);
            if (old && old !== PIXI.Texture.EMPTY) old.destroy(true);
            this.groundFor = sim.decor;
        }
        this.world.scale.set(cam.zoom);
        this.world.position.set(this.w / 2 - cam.x * cam.zoom, this.h / 2 - cam.y * cam.zoom);

        for (const p in P) P[p].begin();
        for (const b of sim.stains) {
            const s = P.stains.next(); s.position.set(b.x, b.y); s.scale.set(b.r / 11 * inv); s.alpha = b.a * 0.8;
        }
        for (const cp of sim.corpses) {
            const s = P.corpses.next(); s.texture = cp.team ? this.tx.corpse1 : this.tx.corpse0;
            s.position.set(cp.x, cp.y); s.rotation = cp.rot; s.scale.set(inv);
        }

        const live = sim.units.filter(u => u.alive).sort((a, b) => a.y - b.y);
        for (const u of live) {
            const x = lerp(u.px, u.x, alpha), y = lerp(u.py, u.y, alpha);
            const { hop, sway } = gait(u, tMs);
            let s = P.shadows.next(); s.position.set(x, y + 9); s.scale.set(inv); s.alpha = 1 - hop * 0.06;
            s = P.rings.next(); s.texture = u.team ? this.tx.ring1 : this.tx.ring0; s.position.set(x, y + 9); s.scale.set(inv);
            s = P.units.next(); s.texture = this.unitTx[u.type + '_' + u.tier];
            s.position.set(x, y - hop); s.rotation = sway; s.scale.set(inv);
            if (u.hitFlash > 0) { s = P.flash.next(); s.position.set(x, y - hop); s.scale.set(inv); s.alpha = Math.min(0.75, u.hitFlash * 4); }
            if (u.bowT > 0) { s = P.bows.next(); s.position.set(x, y - hop); s.rotation = u.aim; s.scale.set(inv); }
            if (u.swingT > 0) {
                s = P.swords.next(); s.position.set(x, y - hop); s.scale.set(inv);
                s.rotation = u.swingAngle - 0.9 + (1 - u.swingT / 0.25) * 1.8;
            }
            if (u.hp < u.maxHp) {
                const bw = 26, r = Math.max(0, u.hp / u.maxHp), by = y - 20 - hop;
                s = P.barBg.next(); s.tint = 0x000000; s.alpha = 0.65; s.position.set(x - bw / 2 - 1, by - 1); s.width = bw + 2; s.height = 5;
                s = P.barFg.next(); s.tint = hex(hpColor(r)); s.position.set(x - bw / 2, by); s.width = Math.max(0.01, bw * r); s.height = 3;
            }
        }
        for (const a of sim.arrows) {
            const s = P.arrows.next(); s.texture = a.team ? this.tx.arrow1 : this.tx.arrow0;
            s.position.set(lerp(a.px, a.x, alpha), lerp(a.py, a.y, alpha)); s.rotation = Math.atan2(a.vy, a.vx); s.scale.set(inv);
        }
        for (const sp of sim.sparks) {
            const s = P.sparks.next(); s.tint = hex(sp.color); s.alpha = Math.max(0, sp.life / 0.4);
            s.position.set(sp.x, sp.y); s.rotation = Math.atan2(sp.vy, sp.vx);
            s.scale.set(Math.max(0.5, Math.hypot(sp.vx, sp.vy) * 0.02) / 4 * inv, 1.5 / 4 * inv);
        }
        for (const f of sim.texts) {
            const t = P.texts.next(); if (t.text !== f.text) t.text = f.text;
            t.tint = hex(f.color); t.alpha = Math.min(1, f.life / 0.4); t.position.set(f.x, f.y); t.scale.set(f.big ? 1.25 : 1);
        }
        for (const p in P) P[p].end();
        this.app.render();
    }
}
