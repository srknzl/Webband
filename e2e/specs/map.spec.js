// The map is the game's main input: a click (or a tap on a phone) on a settlement sends
// the party walking, and arriving opens the settlement screen.
const { test, expect, L, actionBtn, newGame, placeParty, tapWorld, quietCity } = require('../fixtures');

test('yerleşime tıklayınca grup yürür ve içeri girer', async ({ page }) => {
    await newGame(page);
    const city = await quietCity(page);
    const loc = await page.evaluate(id => { const l = LOCATIONS.find(x => x.id === id); return { x: l.x, y: l.y, name: l.name }; }, city);
    await placeParty(page, loc.x - 70, loc.y);

    const hour = await page.evaluate(() => state.time.hour);
    await tapWorld(page, loc);
    // 'moving' is transient — a short walk can finish between two polls — so wait for the arrival
    await expect(page.locator('#settlement-view')).toHaveClass(/\bactive\b/, { timeout: 30_000 });
    await expect(page.locator('#settlement-name')).toContainText(await L(page, loc.name));
    expect(await page.evaluate(() => state.time.hour), 'walking spends game time').not.toBe(hour);
    await expect(page.locator('#settlement-actions button').first()).toBeVisible();

    await (await actionBtn(page, '🚪 Ayrıl')).click();
    await expect(page.locator('#map-view')).toHaveClass(/\bactive\b/);
    await expect(page.locator('body')).toHaveClass(/\bview-map\b/);
});

test('boş araziye tıklamak hedef işaretler, saat yalnız yürürken akar', async ({ page }) => {
    await newGame(page);
    const t0 = await page.evaluate(() => state.time.hour);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => state.time.hour), 'an idle party stops the clock').toBe(t0);

    const p = await page.evaluate(() => ({ x: state.player.x, y: state.player.y }));
    await tapWorld(page, { x: p.x + 40, y: p.y + 30 });
    // Arrived: idle again, standing on the tapped spot (the walk itself can be over in one poll)
    await expect.poll(() => page.evaluate(([x, y]) => state.player.status === 'idle'
        && Math.hypot(state.player.x - x, state.player.y - y) < 20, [p.x + 40, p.y + 30]), { timeout: 20_000 }).toBe(true);
    expect(await page.evaluate(() => state.time.hour)).not.toBe(t0);
});

// Edge panning only over the map: the HUD, the menu and the campaign bar float on the canvas, and
// reaching for their buttons used to slide the map away. The campaign bar spans the whole top
// edge, so the top band starts under it.
test('kenar kaydırma yalnız haritanın üstünde, menülerin üstünde değil', async ({ page, isMobile }) => {
    test.skip(isMobile, 'edge panning is off on a touch screen');
    await newGame(page);
    const drift = async (x, y) => {
        await page.evaluate(() => { Game.camera.offsetX = Game.camera.offsetY = 0; });
        await page.mouse.move(x, y);
        await page.waitForTimeout(400);
        return page.evaluate(() => Math.hypot(Game.camera.offsetX, Game.camera.offsetY));
    };
    const box = sel => page.locator(sel).first().boundingBox();
    const hud = await box('#map-hud'), side = await box('#sidebar .menu-btn'), bar = await box('#top-bar');
    const view = page.viewportSize();
    expect(await drift(hud.x + 20, hud.y + hud.height - 8), 'over the HUD').toBe(0);
    expect(await drift(side.x + 8, side.y + 8), 'over the menu').toBe(0);
    expect(await drift(view.width / 2, bar.y + 8), 'over the campaign bar').toBe(0);
    expect(await drift(view.width / 2, bar.y + bar.height + 10), 'just under the campaign bar').toBeGreaterThan(0);
    expect(await drift(view.width - 5, view.height / 2), 'the right edge of the map').toBeGreaterThan(0);
    await page.mouse.move(view.width / 2, view.height / 2);
});

// Space stops the clock (and a window opened and closed meanwhile does not restart it), 1 2 3 pick
// the speed and go, H brings the camera back — Space's old job.
test('Boşluk zamanı durdurur, 1 2 3 hızı seçer, H kamerayı getirir', async ({ page, isMobile }) => {
    test.skip(isMobile, 'no keyboard');
    await newGame(page);
    const p = await page.evaluate(() => ({ x: state.player.x, y: state.player.y }));
    await tapWorld(page, { x: p.x + 300, y: p.y });
    await expect.poll(() => page.evaluate(() => state.player.status)).toBe('moving');

    await page.keyboard.press('Space');
    await expect(page.locator('#pause-bar')).toBeVisible();
    await expect(page.locator('#btn-map-speed')).toContainText('⏸');
    const still = await page.evaluate(() => ({ x: state.player.x, h: state.time.hour }));
    await page.keyboard.press('k');
    await page.evaluate(() => Game.closeModal());
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => ({ x: state.player.x, h: state.time.hour })), 'held through a window').toEqual(still);

    await page.keyboard.press('3');
    await expect(page.locator('#pause-bar')).toBeHidden();
    await expect(page.locator('#btn-map-speed')).toContainText('×2');
    await expect.poll(() => page.evaluate(() => state.player.x)).not.toBe(still.x);
    await page.keyboard.press('1');
    await expect(page.locator('#btn-map-speed')).toContainText('×0.5');

    await page.evaluate(() => { Game.camera.offsetX = 800; });
    await page.keyboard.press('h');
    expect(await page.evaluate(() => Game.camera.offsetX)).toBe(0);
});

// The map tutorial, every step on every layout: the box stays whole on the screen, its buttons
// within reach — the new time step sits on the HUD's bottom row, right above a phone's tab bar.
test('öğretici: her adımın kutusu ekranın içinde kalır', async ({ page }) => {
    await newGame(page);
    await page.evaluate(() => Game.startTutorial(true));
    const view = page.viewportSize();
    const box = page.locator('#coach-box');
    for(let seen = 0; seen < 12 && await box.count(); seen++) {
        await expect(box).toBeVisible();
        const b = await box.boundingBox();
        const title = await box.locator('h4').innerText();
        expect(b.x >= 0 && b.y >= 0 && b.x + b.width <= view.width && b.y + b.height <= view.height,
            `${title}: ${JSON.stringify(b)} in ${view.width}x${view.height}`).toBe(true);
        await box.locator('.btn.primary').click();
    }
    await expect(box).toHaveCount(0);
});
