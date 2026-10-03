// The crafts (2.10.0) through the real screens: the 🪚 workshop and 🍲 kitchen cards, their windows,
// the scenes and the way back to the town. The saw and the skewers are worked by pointer; world setup
// only puts timber in the bag, finishes the cut through the run's own state (a whole board is the
// model test's job, tools/test.js) and fast-forwards the shift's clock.
const { test, expect, L, modal, newGame, enter, actionBtn, quietCity, passGuide } = require('../fixtures');

async function toTown(page) {
    await newGame(page);
    await page.evaluate(() => { Game.setOpt('muted', true); Game.addItem('timber', 3); });
    const city = await quietCity(page);
    await enter(page, city);
    return city;
}
// the how-to is up the first time in, one step at a time, and the clock waits for it
async function pastHowto(page) {
    await expect(page.locator('#craft-view')).toHaveClass(/\bactive\b/);
    await passGuide(page, page.locator('#craft-over'));
    await expect(page.locator('#craft-over')).toBeHidden();
}
const hour = page => page.evaluate(() => state.time.day * 24 + state.time.hour);
const bag = (page, id) => page.evaluate(id => (state.player.inventory.find(i => i.id === id) || { qty: 0 }).qty, id);

test('the workshop: scrubbing saws the board, giving up keeps the timber', async ({ page }) => {
    const city = await toTown(page);
    await (await actionBtn(page, '🪚 Marangoz Atölyesi')).click();
    await expect(modal(page).locator('.forge-shop')).toBeVisible();
    // Carpentry 1: the stool opens, the chest asks for more skill
    await expect(modal(page).locator('.fs-row.locked', { hasText: await L(page, 'Ahşap Sandık') })).toContainText(await L(page, 'Marangozluk {0} gerekir', 3));
    const money = await page.evaluate(() => state.player.money);
    await modal(page).locator(`[onclick*="'stool'"]`).click();
    await pastHowto(page);
    expect(await bag(page, 'timber')).toBe(2);
    // the hand scrubs left and right over the board: every turn is a stroke
    const pt = await page.evaluate(() => Crafts._point('board', 3));
    await page.mouse.move(pt.x, pt.y); await page.mouse.down();
    for(let k = 0; k < 8; k++) { await page.mouse.move(pt.x + (k % 2 ? 30 : -30), pt.y, { steps: 4 }); await page.waitForTimeout(250); }
    await page.mouse.up();
    const run = await page.evaluate(() => ({ strokes: Crafts.run().strokes, x: Crafts.run().x }));
    expect(run.strokes).toBeGreaterThanOrEqual(6);
    expect(run.x).toBeGreaterThan(1);
    await expect(page.locator('#craft-phase')).toHaveText(await L(page, 'Testere'));
    // giving up: back in town, the timber back, the rent gone, time passed
    const h = await hour(page);
    await page.locator('#craft-pausebtn').click();
    await page.locator('#craft-over').getByText(await L(page, '🚪 Vazgeç')).click();
    await expect(page.locator('#settlement-view')).toHaveClass(/\bactive\b/);
    expect(await bag(page, 'timber')).toBe(3);
    expect(await page.evaluate(() => ({ active: Crafts.active, loop: !!Game._loopId }))).toEqual({ active: false, loop: true });
    expect(await page.evaluate(() => state.player.money)).toBe(money - 5);
    expect(await hour(page)).toBeGreaterThan(h);
    expect(await page.evaluate(() => Game._enteredLoc)).toBe(city);
});

test('the workshop: a planed edge on the line makes the piece, with carpentry gained', async ({ page }) => {
    await toTown(page);
    await (await actionBtn(page, '🪚 Marangoz Atölyesi')).click();
    await modal(page).locator(`[onclick*="'stool'"]`).click();
    await pastHowto(page);
    const skill = () => page.evaluate(() => { const p = state.player.proficiencies.carpentry; return p.level * 1e6 + p.xp; });
    const before = await skill();
    // the cut done straight, as a careful hand leaves it; then the plane by pointer
    await page.evaluate(() => { const g = Crafts.run(); for(let t = 1; g.x < Crafts.WOOD.N; t += .4) { g.aim = -g.drift[Math.min(23, Math.floor(g.x))] / Crafts.WOOD.AIM - g.y * .8; Crafts._model.stroke(g, t); }
        g.last = -9; });
    await page.waitForTimeout(100);
    // the stroke past the end turns the board edge up: one more scrub tips it over
    const pt = await page.evaluate(() => Crafts._point('board', 3));
    await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await page.mouse.move(pt.x + 30, pt.y, { steps: 3 }); await page.mouse.up();
    await expect(page.locator('#craft-phase')).toHaveText(await L(page, 'Rende'));
    await expect(page.locator('#craft-b3')).toBeDisabled();
    const h0 = await page.evaluate(() => Crafts.run().h.reduce((a, h) => a + h, 0));
    const a = await page.evaluate(() => Crafts._point('board', 2)), z = await page.evaluate(() => Crafts._point('board', 20));
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(z.x, z.y, { steps: 18 }); await page.mouse.up();
    expect(await page.evaluate(() => Crafts.run().h.reduce((a, h) => a + h, 0))).toBeLessThan(h0);
    await page.evaluate(() => { const g = Crafts.run(); g.h = g.h.map(() => 0.02); });
    await expect(page.locator('#craft-b3')).toBeEnabled();
    await page.locator('#craft-b3').click();
    await expect(page.locator('#craft-over .lres')).toBeVisible();
    await expect(page.locator('#craft-over')).toContainText(await L(page, '{0} hazır, çantanda.', await L(page, 'Tabure')));
    expect(await skill()).toBeGreaterThan(before);
    await page.locator('#craft-over button').click();
    await expect(page.locator('#settlement-view')).toHaveClass(/\bactive\b/);
    expect(await bag(page, 'stool')).toBe(1);
});

test('the inn kitchen: skewers go on and come off by hand, the shift pays, once a day', async ({ page }) => {
    await toTown(page);
    await (await actionBtn(page, '🍲 Han Mutfağı')).click();
    await modal(page).locator('[onclick^="Crafts.shift"]').click();
    await pastHowto(page);
    // a tap on an empty place puts a skewer on; a tap on it turns it
    const s0 = await page.evaluate(() => Crafts._point('skewer', 0));
    await page.mouse.click(s0.x, s0.y);
    expect(await page.evaluate(() => Crafts.run().skew[0] && Crafts.run().skew[0].down)).toBe('a');
    await page.mouse.click(s0.x, s0.y);
    expect(await page.evaluate(() => Crafts.run().skew[0].down)).toBe('b');
    // golden both sides and a kebab ordered: held, it goes to the customer
    await page.evaluate(() => { const g = Crafts.run(); Object.assign(g.skew[0], { a: 1, b: 1 }); g.orders.push({ id: 99, kind: 'kebap', left: 40 }); });
    await page.mouse.move(s0.x, s0.y); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
    expect(await page.evaluate(() => ({ served: Crafts.run().served.kebap, on: !!Crafts.run().skew[0] }))).toEqual({ served: 1, on: false });
    // a log feeds the fire
    const fuel = await page.evaluate(() => Crafts.run().pot.fuel);
    await page.locator('#craft-b1').click();
    expect(await page.evaluate(() => Crafts.run().pot.fuel)).toBeGreaterThan(fuel);
    // the end of the shift: the pay goes in the purse, four hours pass back in the town
    const money = await page.evaluate(() => state.player.money), h = await hour(page);
    await page.evaluate(() => { Crafts.run().t = Crafts.KITCHEN.SHIFT - .05; });
    await expect(page.locator('#craft-over .lres')).toBeVisible();
    const total = await page.evaluate(() => Crafts.run().result.pay.total);
    expect(total).toBeGreaterThan(await page.evaluate(() => Crafts.KITCHEN.WAGE * .5));
    await page.locator('#craft-over button').click();
    await expect(page.locator('#settlement-view')).toHaveClass(/\bactive\b/);
    expect(await page.evaluate(() => state.player.money)).toBe(money + total);
    expect(await hour(page)).toBeGreaterThanOrEqual(h + 4);
    // the inn takes one shift a day
    await (await actionBtn(page, '🍲 Han Mutfağı')).click();
    await expect(modal(page).locator('[onclick^="Crafts.shift"]')).toBeDisabled();
});

test('Meslekler on the start screen: carpentry and the kitchen practised, nothing kept, back to the menu', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => Game.setOpt('muted', true));
    const before = await page.evaluate(() => JSON.stringify({ bag: state.player.inventory, money: state.player.money, prof: state.player.proficiencies, days: state.kitchenDays || null }));
    await page.locator('.start-act', { hasText: await L(page, 'Meslekler') }).click();
    await expect(modal(page).locator('.fs-row')).toHaveCount(3);
    await modal(page).locator(`[onclick="Crafts.practice('saw')"]`).click();
    // every piece open at skill 1, the table included
    await expect(modal(page).locator('.fs-row button:not([disabled])')).toHaveCount(await page.evaluate(() => Crafts.WOODWORK.filter(r => ITEMS[r.id]).length));
    await modal(page).locator(`[onclick="Crafts.practice('saw', 'table')"]`).click();
    await expect(page.locator('#craft-view')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#start-screen')).not.toHaveClass(/\bactive\b/);
    // a practice always starts with the how-to
    await pastHowto(page);
    await page.evaluate(() => { const g = Crafts.run(); for(let t = 1; g.x < Crafts.WOOD.N; t += .4) Crafts._model.stroke(g, t); Crafts._model.toPlane(g); g.phase = 'plane'; g.u = 0; g.h = g.h.map(() => 0.02); });
    await page.locator('#craft-b3').click();
    await expect(page.locator('#craft-over .lres')).toBeVisible();
    await expect(page.locator('#craft-over .lres')).not.toContainText('XP');
    // try again: the same piece, straight to the saw
    await page.locator('#craft-over').getByText(await L(page, '🔁 Tekrar dene')).click();
    await expect(page.locator('#craft-over')).toBeHidden();
    expect(await page.evaluate(() => ({ id: Crafts.runConfig().recipe.id, phase: Crafts.run().phase }))).toEqual({ id: 'table', phase: 'saw' });
    // another trade: the kitchen, its shift run out
    await page.locator('#craft-pausebtn').click();
    await page.locator('#craft-over').getByText(await L(page, '🚪 Vazgeç')).click();
    await expect(page.locator('#start-screen')).toHaveClass(/\bactive\b/);
    await page.locator('.start-act', { hasText: await L(page, 'Meslekler') }).click();
    await modal(page).locator(`[onclick="Crafts.practice('cook')"]`).click();
    await pastHowto(page);
    await page.evaluate(() => { Crafts.run().t = Crafts.KITCHEN.SHIFT - .05; });
    await expect(page.locator('#craft-over .lres')).toBeVisible();
    await expect(page.locator('#craft-over .lres')).not.toContainText('XP');
    await page.locator('#craft-over').getByText(await L(page, 'Ana menü')).click();
    await expect(page.locator('#start-screen')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#main-ui')).not.toHaveClass(/\bactive\b/);
    expect(await page.evaluate(() => ({ active: Crafts.active, loop: !!Game._loopId }))).toEqual({ active: false, loop: false });
    expect(await page.evaluate(() => JSON.stringify({ bag: state.player.inventory, money: state.player.money, prof: state.player.proficiencies, days: state.kitchenDays || null }))).toBe(before);
});

// A phone sends the page to the background and leaves the sound stopped on the way back; the game
// wakes its one context the moment the page is visible again, not at the next sound
test('the sound comes back after a trip to another app', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => Game.setOpt('muted', true));
    await page.locator('#char-name').click();   // a gesture, so the context is allowed to run
    expect(await page.evaluate(async () => { const ac = Game.ac(); await ac.resume(); await ac.suspend(); return ac.state; })).toBe('suspended');
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect.poll(() => page.evaluate(() => Game._audio.state)).toBe('running');
});
