// ============================================================
// Swordsman sprite atlas builder (visual refresh, step 1)
// ------------------------------------------------------------
// One-off asset build, not part of the test run. Reads the CraftPix "Free Swordsman
// 1-3 Level" pack's layered PNGs (PNG/Swordsman_lvlN/Parts/*), crops every layer sheet
// to the union of its frames' content, shelf-packs them into one atlas per level
// (troops/swordsman_N.png) and rewrites the index block in battle.js between
// `// <swordsman-index>` and `// </swordsman-index>`: where each (anim, part) sheet sits
// in its atlas, and how red the pack paints each Hurt/Death frame (its red overlay layer
// is not shipped — the game re-applies the tint over whatever the unit wears).
//
// The pack's 64x64 cells are mostly empty; cropped, the three levels decode to a
// fraction of the raw sheets. Needs Chromium through Playwright for canvas work:
//
//   node tools/build-swordsman.js <path-to-unzipped-pack>
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ANIMS = { Idle: 12, Walk: 6, Run: 8, attack: 8, Hurt: 5, Death: 7 };
const PARTS = ['sword_back', 'body', 'head', 'sword'];

function playwright() {
    for (const p of [path.join(ROOT, 'e2e/node_modules/playwright'), path.join(ROOT, 'e2e/node_modules/@playwright/test'), 'playwright', process.env.PLAYWRIGHT_MODULE].filter(Boolean))
        try { return require(p); } catch (_) {}
    throw new Error('Playwright not found: run `cd e2e && npm ci` first');
}

(async () => {
    const pack = process.argv[2];
    if (!pack) { console.error('usage: node tools/build-swordsman.js <unzipped pack dir>'); process.exit(1); }
    const { chromium } = playwright();
    const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
    const page = await browser.newPage();
    const index = {};
    for (const lvl of [1, 2, 3]) {
        const dir = path.join(pack, 'PNG', `Swordsman_lvl${lvl}`, 'Parts');
        const files = {};
        for (const a in ANIMS) for (const p of [...PARTS, 'red']) {
            const f = path.join(dir, `Swordsman_lvl${lvl}_${a}_${p}.png`);
            if (fs.existsSync(f)) files[`${a}|${p}`] = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
        }
        const out = await page.evaluate(async ({ files, ANIMS, PARTS }) => {
            const F = 64, load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
            const blocks = [], red = {};
            for (const key in files) {
                const [anim, part] = key.split('|'), img = await load(files[key]);
                const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
                const x = c.getContext('2d'); x.drawImage(img, 0, 0);
                const d = x.getImageData(0, 0, img.width, img.height).data, n = ANIMS[anim];
                if (part === 'red') {                                 // tint strength per frame, 0..1
                    const sums = [];
                    for (let row = 0; row < 4; row++) for (let f = 0; f < n; f++) {
                        let s = 0;
                        for (let y = 0; y < F; y++) for (let xx = 0; xx < F; xx++) s += d[((row * F + y) * img.width + f * F + xx) * 4 + 3];
                        sums.push(s);
                    }
                    const mx = Math.max(1, ...sums);
                    red[anim] = sums.map(v => Math.round(v / mx * 100) / 100);
                    continue;
                }
                let x0 = F, y0 = F, x1 = -1, y1 = -1;
                for (let row = 0; row < 4; row++) for (let f = 0; f < n; f++)
                    for (let y = 0; y < F; y++) for (let xx = 0; xx < F; xx++)
                        if (d[((row * F + y) * img.width + f * F + xx) * 4 + 3]) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
                if (x1 < 0) continue;
                blocks.push({ anim, part, img, n, bx: x0, by: y0, bw: x1 - x0 + 1, bh: y1 - y0 + 1 });
            }
            // shelf pack, tallest first
            const W = 1024; blocks.sort((a, b) => b.bh * 4 - a.bh * 4);
            let cx = 0, cy = 0, shelf = 0;
            for (const b of blocks) {
                const w = b.n * b.bw, h = 4 * b.bh;
                if (cx + w > W) { cx = 0; cy += shelf; shelf = 0; }
                b.ax = cx; b.ay = cy; cx += w; shelf = Math.max(shelf, h);
            }
            const atlas = document.createElement('canvas'); atlas.width = W; atlas.height = cy + shelf;
            const ax = atlas.getContext('2d');
            for (const b of blocks) for (let row = 0; row < 4; row++) for (let f = 0; f < b.n; f++)
                ax.drawImage(b.img, f * F + b.bx, row * F + b.by, b.bw, b.bh, b.ax + f * b.bw, b.ay + row * b.bh, b.bw, b.bh);
            const idx = {};
            for (const b of blocks) (idx[b.anim] || (idx[b.anim] = {}))[b.part] = [b.ax, b.ay, b.bx, b.by, b.bw, b.bh];
            return { png: atlas.toDataURL('image/png'), idx, red, size: [atlas.width, atlas.height] };
        }, { files, ANIMS, PARTS });
        fs.writeFileSync(path.join(ROOT, 'troops', `swordsman_${lvl}.png`), Buffer.from(out.png.split(',')[1], 'base64'));
        index[lvl] = { size: out.size, parts: out.idx, red: out.red };
        console.log(`level ${lvl}: atlas ${out.size.join('x')}, ${Object.keys(out.idx).length} anims`);
    }
    await browser.close();
    // rewrite the generated block in battle.js
    const bj = path.join(ROOT, 'battle.js');
    let src = fs.readFileSync(bj, 'utf8');
    const open = '// <swordsman-index>', close = '// </swordsman-index>';
    const a = src.indexOf(open), b = src.indexOf(close);
    if (a < 0 || b < 0) throw new Error('index markers not found in battle.js');
    const body = `${open} (generated by tools/build-swordsman.js — do not edit by hand)\n` +
        `const SWORDSMAN_INDEX = ${JSON.stringify(index)};\n`;
    src = src.slice(0, a) + body + src.slice(b);
    fs.writeFileSync(bj, src);
    console.log('battle.js index block rewritten');
})();
