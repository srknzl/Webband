// Baseline: the real game's way of drawing a battle (battle.js render/drawUnit) — Canvas2D,
// sprites baked once, every ring/sword/bar/arrow re-pathed each frame. `dpr` 1 is what
// the game does today (1 canvas px per CSS px); `dpr` = devicePixelRatio is the "crisp"
// variant, to show what native resolution costs on Canvas2D.
import { TYPES, gait, lerp } from '../sim/battle-sim.js';
import { bakeFitted, bakeGround, hpColor } from './assets.js';

export class CanvasRenderer {
    constructor(host, assets, { dpr = 1 } = {}) {
        this.dpr = dpr;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'stage';
        host.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.sprites = {};
        for (const key in assets.troops) {
            const type = key.split('_')[0];
            this.sprites[key] = bakeFitted(assets.troops[key], TYPES[type].size, 1);
        }
        this.ground = null; this.groundFor = null;
    }
    get name() { return this.dpr === 1 ? 'Canvas2D 1x (oyundaki)' : `Canvas2D ${this.dpr}x`; }
    setActive(on) { this.canvas.style.display = on ? 'block' : 'none'; }
    resize(w, h) {
        this.w = w; this.h = h;
        this.canvas.width = Math.round(w * this.dpr); this.canvas.height = Math.round(h * this.dpr);
        this._vig = null;
    }
    render(sim, alpha, cam, tMs) {
        const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height, z = cam.zoom * this.dpr;
        if (this.groundFor !== sim.decor) { this.ground = bakeGround(sim); this.groundFor = sim.decor; }
        ctx.fillStyle = '#1d2a17'; ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
        ctx.drawImage(this.ground, 0, 0);

        for (const b of sim.stains) {
            ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(122,10,10,${b.a * 0.8})`; ctx.fill();
        }
        for (const cp of sim.corpses) {
            ctx.save(); ctx.translate(cp.x, cp.y); ctx.rotate(cp.rot); ctx.globalAlpha = 0.5;
            ctx.fillStyle = cp.team === 0 ? '#4a5a7a' : '#6a3a3a';
            ctx.beginPath(); ctx.ellipse(0, 0, 9, 4.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
            ctx.restore();
        }
        ctx.globalAlpha = 1;

        // y-sorted like battle.js (a sort per frame is part of the real cost)
        const live = sim.units.filter(u => u.alive).sort((a, b) => a.y - b.y);
        for (const u of live) this.drawUnit(ctx, u, alpha, tMs);

        for (const a of sim.arrows) {
            const x = lerp(a.px, a.x, alpha), y = lerp(a.py, a.y, alpha);
            ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(a.vy, a.vx));
            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-11, 3); ctx.lineTo(4, 3); ctx.stroke();
            ctx.strokeStyle = '#d8c9a0'; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(5, 0); ctx.stroke();
            ctx.fillStyle = '#e8e8ee';
            ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(0, -2); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = a.team === 0 ? '#8fd4ff' : '#ff9a8a'; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-14, -3); ctx.moveTo(-11, 0); ctx.lineTo(-14, 3); ctx.stroke();
            ctx.restore();
        }
        for (const sp of sim.sparks) {
            ctx.globalAlpha = Math.max(0, sp.life / 0.4);
            ctx.strokeStyle = sp.color; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x - sp.vx * 0.02, sp.y - sp.vy * 0.02); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (const f of sim.texts) {
            ctx.globalAlpha = Math.min(1, f.life / 0.4);
            ctx.font = `bold ${f.big ? 15 : 12}px Inter, sans-serif`;
            ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
            ctx.strokeText(f.text, f.x, f.y);
            ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        if (!this._vig) {
            const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
            g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
            this._vig = g;
        }
        ctx.fillStyle = this._vig; ctx.fillRect(0, 0, W, H);
    }
    drawUnit(ctx, u, alpha, tMs) {
        const x = lerp(u.px, u.x, alpha), y = lerp(u.py, u.y, alpha);
        const { hop, sway } = gait(u, tMs);
        ctx.beginPath(); ctx.ellipse(x, y + 9, 12, 5.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,0,0,${0.5 - hop * 0.03})`; ctx.fill();
        ctx.beginPath(); ctx.ellipse(x, y + 9, 10, 4.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = u.team === 0 ? 'rgba(79,168,255,0.28)' : 'rgba(255,90,74,0.28)'; ctx.fill();
        ctx.setLineDash(u.team === 0 ? [] : [4, 3.2]);
        ctx.strokeStyle = u.team === 0 ? '#4fa8ff' : '#ff5a4a'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.setLineDash([]);

        const spr = this.sprites[u.type + '_' + u.tier];
        ctx.save(); ctx.translate(x, y - hop); ctx.rotate(sway);
        ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
        ctx.restore();

        if (u.hitFlash > 0) {
            ctx.globalAlpha = Math.min(0.75, u.hitFlash * 4); ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(x, y - hop, 13, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        }
        if (u.bowT > 0) {
            ctx.save(); ctx.translate(x, y - hop); ctx.rotate(u.aim);
            ctx.beginPath(); ctx.arc(12, 0, 11, -Math.PI / 2.2, Math.PI / 2.2);
            ctx.lineWidth = 2.5; ctx.strokeStyle = '#c8a24a'; ctx.stroke();
            ctx.restore();
        }
        if (u.swingT > 0) {
            // The blade sweeps through a 100-degree arc over the 0.25 s swing.
            const a = u.swingAngle - 0.9 + (1 - u.swingT / 0.25) * 1.8;
            ctx.save(); ctx.translate(x, y - hop); ctx.rotate(a);
            ctx.beginPath();
            ctx.moveTo(10, -2); ctx.lineTo(15, -2); ctx.lineTo(15, -6); ctx.lineTo(18, -6); ctx.lineTo(18, -2); ctx.lineTo(40, -2);
            ctx.lineTo(45, 0); ctx.lineTo(40, 2); ctx.lineTo(18, 2); ctx.lineTo(18, 6); ctx.lineTo(15, 6); ctx.lineTo(15, 2); ctx.lineTo(10, 2);
            ctx.closePath();
            if (!this._swordGrad) {
                const g = ctx.createLinearGradient(10, -4, 45, 4);
                g.addColorStop(0, '#8a7a55'); g.addColorStop(0.35, '#f2f2f6'); g.addColorStop(1, '#9aa0aa');
                this._swordGrad = g;
            }
            ctx.fillStyle = this._swordGrad; ctx.fill();
            ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 1; ctx.stroke();
            ctx.restore();
        }
        if (u.hp < u.maxHp) {
            const bw = 26, r = Math.max(0, u.hp / u.maxHp), by = y - 20 - hop;
            ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 5);
            ctx.fillStyle = hpColor(r); ctx.fillRect(x - bw / 2, by, bw * r, 3);
        }
    }
}
