// Baked pictures shared by both web renderers — the same "bake once, stamp every frame"
// approach battle.js uses. Everything is drawn into small canvases at scale R (2 on a
// retina screen) so the GPU renderer can sample them without blur.
import { TYPES, TIER_NAMES } from '../sim/battle-sim.js';

const loadImage = src => new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => fail(new Error('image failed: ' + src));
    img.src = src;
});

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; };

export async function loadTroopImages(base = '../../troops/') {
    const imgs = {};
    await Promise.all(Object.keys(TYPES).flatMap(type => TIER_NAMES.map(async (tn, tier) => {
        imgs[type + '_' + tier] = await loadImage(base + type + '_' + tn + '.png');
    })));
    return imgs;
}

// bakeFitted from battle.js: aspect-fit into a size x size tile, nearest-neighbour.
export function bakeFitted(img, size, R = 1) {
    const c = canvas(size * R, size * R), x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    const s = Math.min(size * R / img.naturalWidth, size * R / img.naturalHeight) * 0.92;
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    x.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
    return c;
}

// The unit decorations battle.js draws with paths every frame, baked once. Each entry is
// { c: canvas, ax, ay } where (ax, ay) is the anchor (0..1) that sits on the unit's point.
export function bakeShapes(R = 1) {
    const out = {};
    const make = (w, h, ax, ay, draw) => {
        const c = canvas(w * R, h * R), x = c.getContext('2d');
        x.scale(R, R); draw(x);
        return { c, ax, ay, w, h };
    };
    out.shadow = make(28, 14, 0.5, 0.5, x => {
        x.fillStyle = 'rgba(0,0,0,0.5)'; x.beginPath(); x.ellipse(14, 7, 12, 5.5, 0, 0, Math.PI * 2); x.fill();
    });
    for (const team of [0, 1]) out['ring' + team] = make(28, 14, 0.5, 0.5, x => {
        x.beginPath(); x.ellipse(14, 7, 10, 4.5, 0, 0, Math.PI * 2);
        x.fillStyle = team === 0 ? 'rgba(79,168,255,0.28)' : 'rgba(255,90,74,0.28)'; x.fill();
        x.setLineDash(team === 0 ? [] : [4, 3.2]);
        x.strokeStyle = team === 0 ? '#4fa8ff' : '#ff5a4a'; x.lineWidth = 2.5; x.stroke();
    });
    out.flash = make(28, 28, 0.5, 0.5, x => { x.fillStyle = '#fff'; x.beginPath(); x.arc(14, 14, 13, 0, Math.PI * 2); x.fill(); });
    // Sword: origin at the unit, blade pointing +x (same polygon as battle.js).
    out.sword = make(48, 14, 0, 0.5, x => {
        x.translate(0, 7);
        x.beginPath();
        x.moveTo(10, -2); x.lineTo(15, -2); x.lineTo(15, -6); x.lineTo(18, -6); x.lineTo(18, -2); x.lineTo(40, -2);
        x.lineTo(45, 0); x.lineTo(40, 2); x.lineTo(18, 2); x.lineTo(18, 6); x.lineTo(15, 6); x.lineTo(15, 2); x.lineTo(10, 2);
        x.closePath();
        const g = x.createLinearGradient(10, -4, 45, 4);
        g.addColorStop(0, '#8a7a55'); g.addColorStop(0.35, '#f2f2f6'); g.addColorStop(1, '#9aa0aa');
        x.fillStyle = g; x.fill(); x.strokeStyle = '#3a3a3a'; x.lineWidth = 1; x.stroke();
    });
    out.bow = make(26, 26, 0, 0.5, x => {
        x.translate(0, 13);
        x.beginPath(); x.arc(12, 0, 11, -Math.PI / 2.2, Math.PI / 2.2);
        x.lineWidth = 2.5; x.strokeStyle = '#c8a24a'; x.stroke();
        x.beginPath(); x.moveTo(12 + 11 * Math.cos(-Math.PI / 2.2), 11 * Math.sin(-Math.PI / 2.2));
        x.lineTo(12 + 11 * Math.cos(Math.PI / 2.2), 11 * Math.sin(Math.PI / 2.2));
        x.lineWidth = 1; x.strokeStyle = 'rgba(255,255,255,0.7)'; x.stroke();
    });
    for (const team of [0, 1]) out['arrow' + team] = make(22, 10, 15 / 22, 0.5, x => {
        x.translate(15, 5);
        x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 3; x.beginPath(); x.moveTo(-11, 3); x.lineTo(4, 3); x.stroke();
        x.strokeStyle = '#d8c9a0'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(-11, 0); x.lineTo(5, 0); x.stroke();
        x.fillStyle = '#e8e8ee'; x.beginPath(); x.moveTo(5, 0); x.lineTo(0, -2); x.lineTo(0, 2); x.closePath(); x.fill();
        x.strokeStyle = team === 0 ? '#8fd4ff' : '#ff9a8a'; x.lineWidth = 1.4;
        x.beginPath(); x.moveTo(-11, 0); x.lineTo(-14, -3); x.moveTo(-11, 0); x.lineTo(-14, 3); x.stroke();
    });
    for (const team of [0, 1]) out['corpse' + team] = make(22, 12, 0.5, 0.5, x => {
        x.globalAlpha = 0.5; x.fillStyle = team === 0 ? '#4a5a7a' : '#6a3a3a';
        x.beginPath(); x.ellipse(11, 6, 9, 4.5, 0, 0, Math.PI * 2); x.fill();
        x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 1; x.stroke();
    });
    out.stain = make(24, 24, 0.5, 0.5, x => { x.fillStyle = 'rgb(122,10,10)'; x.beginPath(); x.arc(12, 12, 11, 0, Math.PI * 2); x.fill(); });
    out.dot = make(4, 4, 0.5, 0.5, x => { x.fillStyle = '#fff'; x.fillRect(0, 0, 4, 4); });
    return out;
}

// The arena ground, drawn once per round from sim.decor.
export function bakeGround(sim, scale = 1) {
    const c = canvas(sim.W * scale, sim.H * scale), x = c.getContext('2d');
    x.scale(scale, scale);
    x.fillStyle = '#3d5a2e'; x.fillRect(0, 0, sim.W, sim.H);
    for (const d of sim.decor) {
        if (d.kind === 'dirt') {
            const g = x.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
            g.addColorStop(0, 'rgba(92,74,44,0.45)'); g.addColorStop(1, 'rgba(92,74,44,0)');
            x.fillStyle = g; x.beginPath(); x.arc(d.x, d.y, d.r, 0, Math.PI * 2); x.fill();
        } else if (d.kind === 'grass') {
            x.strokeStyle = 'rgba(120,160,80,0.55)'; x.lineWidth = 1.2; x.beginPath();
            for (let i = -1; i <= 1; i++) { x.moveTo(d.x + i * 2, d.y); x.lineTo(d.x + i * 3, d.y - d.r); }
            x.stroke();
        } else {
            x.fillStyle = '#6f6a60'; x.beginPath(); x.ellipse(d.x, d.y, d.r, d.r * 0.7, 0, 0, Math.PI * 2); x.fill();
            x.fillStyle = 'rgba(255,255,255,0.12)'; x.beginPath(); x.ellipse(d.x - d.r * 0.3, d.y - d.r * 0.2, d.r * 0.4, d.r * 0.25, 0, 0, Math.PI * 2); x.fill();
        }
    }
    return c;
}

export function bakeVignette(w, h) {
    const c = canvas(256, 256), x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 256 * 0.35, 128, 128, 256 * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    return c;
}

export const hpColor = r => r > 0.5 ? '#41d06a' : r > 0.25 ? '#e8c93a' : '#e0463a';
