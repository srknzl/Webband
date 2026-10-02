// The forge (2.5.0) through the real screens: the 🔨 Demirhane card, the recipe window, the scene
// with its bellows, anvil and quench, and the way back to the town. World setup only: iron and
// coal put in the bag, the hero at a city gate, and for the finish the bar's shape set through the
// run's own state — a whole forging takes a minute of held bellows, which is the model test's job
// (tools/test.js plays it start to finish).
const { test, expect, L, modal, modalBtn, newGame, enter, actionBtn, quietCity } = require('../fixtures');

async function toForge(page, recipe) {
    await newGame(page);
    await page.evaluate(() => {
        Game.setOpt('muted', true);   // no hearth, bellows or hammer from a test run
        Game.addItem('iron', 4); Game.addItem('coal', 12);
    });
    const city = await quietCity(page);
    await enter(page, city);
    await (await actionBtn(page, '🔨 Demirhane')).click();
    await expect(modal(page).locator('.forge-shop')).toBeVisible();
    await modal(page).locator(`[onclick*="'${recipe}'"]`).click();
    await expect(page.locator('#forge-view')).toHaveClass(/\bactive\b/);
    // the first time in, the how-to is up and the clock waits for it
    await expect(page.locator('#forge-over .lb-howto li').first()).toBeVisible();
    await page.locator('#forge-over button').click();
    await expect(page.locator('#forge-over')).toBeHidden();
    return city;
}
/** Holds a button down for `ms`, by touch on a phone and by mouse elsewhere. */
async function hold(page, sel, ms) {
    const box = await page.locator(sel).boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.waitForTimeout(ms);
    await page.mouse.up();
}

test('the smithy rents the hearth: bellows heat the bar, the hammer works it, giving up keeps the iron', async ({ page }) => {
    const city = await toForge(page, 'sword');
    const money = await page.evaluate(() => state.player.money);
    // rent paid, materials taken
    expect(await page.evaluate(() => state.player.inventory.find(i => i.id === 'iron').qty)).toBe(3);

    // the bellows: the hearth climbs and the bar takes the heat
    const before = await page.evaluate(() => Forge.run().segs[20].T);
    await hold(page, '#forge-pump', 1500);
    const after = await page.evaluate(() => ({ F: Forge.run().F, T: Forge.run().segs[20].T }));
    expect(after.F).toBeGreaterThan(900);
    expect(after.T).toBeGreaterThan(before + 100);

    // to the anvil; a blow on hot metal does work, the Quench button waits for the shape
    await page.evaluate(() => Forge.run().segs.forEach(s => { s.T = 1050; }));
    await page.locator('#forge-move').click();
    await expect(page.locator('#forge-phase')).toHaveText(await L(page, 'Örs'));
    await expect(page.locator('#forge-quench')).toBeDisabled();
    const pt = await page.evaluate(() => Forge._segPoint(12));
    await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await page.waitForTimeout(300); await page.mouse.up();
    const run = await page.evaluate(() => ({ strikes: Forge.run().strikes, w: Forge.run().segs[12].w, cold: Forge.run().cold }));
    expect(run.strikes).toBe(1);
    expect(run.w).toBeLessThan(1);
    expect(run.cold).toBe(0);

    // giving up: back in the town, the iron returned, the coal and the rent gone, time passed
    const hour = await page.evaluate(() => state.time.day * 24 + state.time.hour);
    await page.locator('#forge-pausebtn').click();
    await page.locator('#forge-over').getByText(await L(page, '🚪 Vazgeç')).click();
    await expect(page.locator('#settlement-view')).toHaveClass(/\bactive\b/);
    const end = await page.evaluate(() => ({ active: Forge.active, iron: state.player.inventory.find(i => i.id === 'iron').qty,
        coal: (state.player.inventory.find(i => i.id === 'coal') || { qty: 0 }).qty, hour: state.time.day * 24 + state.time.hour, money: state.player.money, loop: !!Game._loopId }));
    expect(end).toMatchObject({ active: false, iron: 4, coal: 8, loop: true });
    expect(end.hour).toBeGreaterThan(hour);
    expect(end.money).toBe(money);
    expect(await page.evaluate(() => Game._enteredLoc)).toBe(city);
});

test('a bar hammered to its outline is quenched into the item, with smithing gained', async ({ page }) => {
    await toForge(page, 'sword');
    const skill = () => page.evaluate(() => { const p = state.player.proficiencies.smithing; return p.level * 1e6 + p.xp; });
    const before = await skill();
    // the shape done and the heat in the quench band, as a good smith leaves it
    await page.evaluate(() => {
        const g = Forge.run();
        g.segs.forEach(s => { s.w = 0.02; s.T = 840; });
    });
    await page.locator('#forge-move').click();
    await expect(page.locator('#forge-quench')).toBeEnabled();
    await page.locator('#forge-quench').click();
    await expect(page.locator('#forge-over .lres')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('#forge-over')).toContainText(await L(page, '{0} hazır, çantanda.', await L(page, 'Kılıç')));
    expect(await skill()).toBeGreaterThan(before);
    await page.locator('#forge-over button').click();
    await expect(page.locator('#settlement-view')).toHaveClass(/\bactive\b/);
    expect(await page.evaluate(() => state.player.inventory.filter(i => i.id === 'sword').reduce((n, i) => n + i.qty, 0))).toBeGreaterThan(0);
});

test('the smithy shows what a piece needs and locks the tiers above your skill', async ({ page }) => {
    await newGame(page);
    await page.evaluate(() => { Game.setOpt('muted', true); state.player.inventory = state.player.inventory.filter(i => i.id !== 'iron'); });
    await enter(page, await quietCity(page));
    await (await actionBtn(page, '🔨 Demirhane')).click();
    // no iron: nothing can be forged, and the royal sword asks for more skill
    await expect(modal(page).locator('.fs-row button:not([disabled])')).toHaveCount(0);
    const royal = modal(page).locator('.fs-row.locked', { hasText: await L(page, 'Kraliyet Kılıcı') });
    await expect(royal).toContainText(await L(page, 'Demircilik {0} gerekir', 7));
    await modal(page).locator('.lb-help').click();
    await expect(modal(page).locator('.lb-howto li')).toHaveCount(5);
    await (await modalBtn(page, '← Ocağa dön')).click();
    await expect(modal(page).locator('.forge-shop')).toBeVisible();
});

test('the start screen opens a practice forge: every piece, nothing taken or given, back to the menu', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => Game.setOpt('muted', true));
    const bag = await page.evaluate(() => JSON.stringify(state.player.inventory));
    await page.locator('.start-act', { hasText: await L(page, 'Demircilik') }).click();
    // every piece is open, the royal sword included, at no cost
    await expect(modal(page).locator('.fs-row button:not([disabled])')).toHaveCount(await page.evaluate(() => Forge.RECIPES.filter(r => ITEMS[r.id]).length));
    await modal(page).locator(`[onclick="Forge.practice('sword_royal')"]`).click();
    await expect(page.locator('#forge-view')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#start-screen')).not.toHaveClass(/\bactive\b/);
    // a practice always starts with the how-to
    await expect(page.locator('#forge-over .lb-howto li').first()).toBeVisible();
    await page.locator('#forge-over button').click();
    await page.evaluate(() => Forge.run().segs.forEach(s => { s.w = 0.02; s.T = 840; }));
    await page.locator('#forge-move').click();
    await page.locator('#forge-quench').click();
    await expect(page.locator('#forge-over .lres')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('#forge-over .lres')).not.toContainText('XP');
    // try again: the same piece, straight to the hearth
    await page.locator('#forge-over').getByText(await L(page, '🔁 Tekrar dene')).click();
    await expect(page.locator('#forge-over')).toBeHidden();
    expect(await page.evaluate(() => ({ id: Forge.runConfig().recipe.id, phase: Forge.run().phase }))).toEqual({ id: 'sword_royal', phase: 'forge' });
    // the pause menu leads out; the start screen is back, the bag untouched, no game loop running
    await page.locator('#forge-pausebtn').click();
    await page.locator('#forge-over').getByText(await L(page, '🚪 Vazgeç')).click();
    await expect(page.locator('#start-screen')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#main-ui')).not.toHaveClass(/\bactive\b/);
    expect(await page.evaluate(() => ({ active: Forge.active, loop: !!Game._loopId, bag: JSON.stringify(state.player.inventory) })))
        .toEqual({ active: false, loop: false, bag });
});
