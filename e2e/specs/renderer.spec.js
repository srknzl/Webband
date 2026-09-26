// The battle renderer (1.33.0): the same fight drawn by PixiJS/WebGL on #battle-gl and by the
// Canvas2D fallback on #battle-canvas. Each run picks one through the settings gate, then
// plays the loop a player sees — the canvas on show paints, the men move, the fight ends in
// the result screen and the map comes back.
const { test, expect, modal, modalBtn, newGame, tapWorld, painted } = require('../fixtures');

/** A two-man human band parked just east of the party (as in battle.spec.js). */
function band(page, dx = 70) {
    return page.evaluate(dx => {
        const b = state.npcParties.find(n => n.type === 'bandit' && !(BAND_KINDS[n.band] || {}).beast);
        Object.assign(b, { size: 2, x: state.player.x + dx, y: state.player.y, speed: 0 });
        return { id: b.id, x: b.x, y: b.y };
    }, dx);
}

for(const renderer of ['pixi', 'canvas']) {
    test(`savaş çizimi: ${renderer} — tuval boyanır, birlikler yürür, sonuç ekranı gelir`, async ({ page, isMobile }) => {
        // CI's Chromium has only SwiftShader: forced WebGL at a phone's 2.6x density renders on
        // the CPU and starves the page for whole seconds (red on main since 1.34.0) — more time,
        // not a weaker check
        test.slow(renderer === 'pixi' && isMobile);
        await newGame(page);
        await page.evaluate(r => Game.setOpt('renderer', r), renderer);
        if(renderer === 'pixi') await page.waitForFunction(() => BattleGL.ready);
        // A few men of your own, so there is a line to watch walk forward
        await page.evaluate(() => { state.player.party = [1, 2, 3].map(i => ({ id: 'rr' + i, name: 'Svadya Köylüsü', level: 1 })); });
        const b = await band(page);
        await tapWorld(page, b);
        await modal(page).locator('button[onclick*="Battle.start"]').click({ timeout: 20_000 });
        await expect(page.locator('#battle-view')).toHaveClass(/\bactive\b/);

        // Exactly one battle canvas shows, and it is the one this renderer draws on
        const [shown, hidden] = renderer === 'pixi' ? ['#battle-gl', '#battle-canvas'] : ['#battle-canvas', '#battle-gl'];
        await expect(page.locator(shown)).toBeVisible();
        await expect(page.locator(hidden)).toBeHidden();
        await expect.poll(() => page.evaluate(() => Battle.gfx && Battle.gfx.name)).toBe(renderer);
        const info = await page.evaluate(() => Debug.report().render.battleRenderer);
        expect(info.active).toBe(renderer);
        expect(info.setting).toBe(renderer);
        if(renderer === 'pixi') {
            // Drawn at the screen's pixel density: the backing store is DPR x the CSS box
            const dens = await page.evaluate(() => {
                const c = document.getElementById('battle-gl'), r = c.getBoundingClientRect();
                return { ratio: c.width / r.width, dpr: Math.min(3, devicePixelRatio), css: [r.width, r.height], field: [Battle.canvas.width, Battle.canvas.height] };
            });
            expect(Math.abs(dens.ratio - dens.dpr)).toBeLessThan(0.02);
            // Same CSS size as the field, so screen → world mapping is unchanged
            expect(Math.abs(dens.css[0] - dens.field[0])).toBeLessThan(1);
            expect(Math.abs(dens.css[1] - dens.field[1])).toBeLessThan(1);
            await expect.poll(() => page.evaluate(() => Debug.report().render.battleRenderer.drawCalls)).toBeGreaterThan(0);
        }

        // The men move
        const at = await page.evaluate(() => Battle.units.map(u => [u.id, u.x, u.y]));
        await expect.poll(() => page.evaluate(() => Battle.battleTime)).toBeGreaterThan(1);
        const moved = await page.evaluate(at => at.filter(([id, x, y]) => {
            const u = Battle.units.find(v => v.id === id);
            return u && Math.hypot(u.x - x, u.y - y) > 5;
        }).length, at);
        expect(moved, 'nobody walked in a second of battle').toBeGreaterThan(0);
        expect(await painted(page)).toBeGreaterThan(3);

        // End it through the real result screen, back to the map
        await page.evaluate(() => Battle.units.forEach(u => { if(!u.isPlayerTeam) u.hp = 0; }));
        await expect(modal(page).locator('#bres-tab-ozet')).toBeVisible();
        await (await modalBtn(page, 'Kazanımları Al ve İlerle')).click();
        await expect(page.locator('#map-view')).toHaveClass(/\bactive\b/);
        await page.waitForFunction(() => Game._loopId && !Battle.active);

        // The chicken chase stays Canvas2D on #battle-canvas, whatever drew the last battle
        await page.evaluate(() => TournamentMinigame.start({ mode: 'chicken', goal: 3, time: 20 }));
        await expect(page.locator('#battle-canvas')).toBeVisible();
        await expect(page.locator('#battle-gl')).toBeHidden();
        await expect.poll(() => painted(page)).toBeGreaterThan(1);
        await page.evaluate(() => TournamentMinigame.end(false));
        await expect(page.locator('#map-view')).toHaveClass(/\bactive\b/);
    });
}

// The map (1.34.0) follows the same setting. With Pixi it draws on #map-gl, under a
// see-through #map-canvas that still takes every tap; switching back to Canvas at runtime
// tears the WebGL map down and the 2d canvas shows again.
for(const renderer of ['pixi', 'canvas']) {
    test(`harita çizimi: ${renderer} — harita boyanır, dokunuş hâlâ hedef verir`, async ({ page, isMobile }) => {
        test.slow(renderer === 'pixi' && isMobile);   // as above: software WebGL at phone density
        await newGame(page);
        await page.evaluate(r => Game.setOpt('renderer', r), renderer);
        if(renderer === 'pixi') await page.waitForFunction(() => MapGL.ready && Game._mapSurface === 'gl');
        const gl = renderer === 'pixi';
        await expect(page.locator('#map-gl')).toBeVisible({ visible: gl });
        await expect(page.locator('#map-view')).toHaveClass(gl ? /\bgl\b/ : /^(?!.*\bgl\b)/);
        expect(await page.evaluate(() => getComputedStyle(Game.mapCanvas).opacity)).toBe(gl ? '0' : '1');
        const info = await page.evaluate(() => Debug.report().render.mapRenderer);
        expect(info.active).toBe(renderer);
        if(gl) {
            // Drawn at the screen's pixel density, over exactly the box #map-canvas measures input in
            const dens = await page.evaluate(() => {
                const c = document.getElementById('map-gl'), r = c.getBoundingClientRect(), m = Game.mapCanvas.getBoundingClientRect();
                return { ratio: c.width / r.width, dpr: Math.min(3, devicePixelRatio), box: [r.left - m.left, r.top - m.top, r.width - m.width, r.height - m.height] };
            });
            expect(Math.abs(dens.ratio - dens.dpr)).toBeLessThan(0.02);
            dens.box.forEach(d => expect(Math.abs(d)).toBeLessThan(1));
            await expect.poll(() => page.evaluate(() => Debug.report().render.mapRenderer.drawCalls)).toBeGreaterThan(0);
        }
        expect(await painted(page, gl ? '#map-gl' : '#map-canvas')).toBeGreaterThan(3);

        // A tap on the map still sets a destination: the input surface didn't move
        await page.evaluate(() => { state.player.status = 'idle'; state.player.targetLocation = null; });
        const spot = await page.evaluate(() => ({ x: state.player.x + 120, y: state.player.y + 60 }));
        await tapWorld(page, spot);
        await expect.poll(() => page.evaluate(() => state.player.status)).toBe('moving');

        if(gl) {
            await page.evaluate(() => Game.setOpt('renderer', 'canvas'));
            await expect(page.locator('#map-gl')).toBeHidden();
            await expect(page.locator('#map-view')).not.toHaveClass(/\bgl\b/);
            await expect.poll(() => painted(page, '#map-canvas')).toBeGreaterThan(3);
            expect(await page.evaluate(() => MapGL.app)).toBeNull();
        }
    });
}

// Without WebGL, 'auto' and even a forced 'pixi' fall back to Canvas2D — and the fight still runs.
test('savaş çizimi: WebGL yoksa Canvas\'a döner', async ({ page }) => {
    await newGame(page);
    await page.evaluate(() => { Game._webgl = { ok: false, soft: false, gpu: '' }; Game.setOpt('renderer', 'pixi'); });
    expect(await page.evaluate(() => Battle.rendererKind())).toBe('canvas');
    const b = await band(page);
    await tapWorld(page, b);
    await modal(page).locator('button[onclick*="Battle.start"]').click({ timeout: 20_000 });
    await expect(page.locator('#battle-canvas')).toBeVisible();
    await expect(page.locator('#battle-gl')).toBeHidden();
    await expect.poll(() => page.evaluate(() => Battle.battleTime)).toBeGreaterThan(0.5);
    expect(await painted(page)).toBeGreaterThan(3);
});
