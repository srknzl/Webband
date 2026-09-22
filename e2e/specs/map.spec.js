// The map is the game's main input: a click (or a tap on a phone) on a settlement sends
// the party walking, and arriving opens the settlement screen.
const { test, expect, L, actionBtn, newGame, placeParty, tapWorld, quietCity } = require('../fixtures');

test('yerleşime tıklayınca grup yürür ve içeri girer', async ({ page }) => {
    await newGame(page);
    const city = await quietCity(page);
    const loc = await page.evaluate(id => { const l = LOCATIONS.find(x => x.id === id); return { x: l.x, y: l.y, name: l.name }; }, city);
    await placeParty(page, loc.x - 70, loc.y);

    await tapWorld(page, loc);
    await expect.poll(() => page.evaluate(() => state.player.status)).toBe('moving');
    const hour = await page.evaluate(() => state.time.hour);
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
    await expect.poll(() => page.evaluate(() => state.player.status)).toBe('moving');
    await expect.poll(() => page.evaluate(() => state.player.status), { timeout: 20_000 }).toBe('idle');
    const end = await page.evaluate(() => ({ x: state.player.x, y: state.player.y, h: state.time.hour }));
    expect(Math.hypot(end.x - p.x - 40, end.y - p.y - 30)).toBeLessThan(20);
    expect(end.h).not.toBe(t0);
});
