// Events on the road (#121, #119, #133): the hail with its ten-second clock, walking through it
// to a roof, the winter's coal warnings, and a stranger on the map who asks to join. World setup
// only: the event is raised through the game's own `showChoiceEvent` / `spawnWanderer` /
// `winterTick`; the answer is a click, and the ten seconds are real ones.
const { test, expect, L, modal, modalBtn, okAlert, newGame, enter, placeParty, tapWorld } = require('../fixtures');

const troops = n => Array.from({ length: n }, (_, i) => ({ id: 'e2e' + i, name: 'Svadya Köylüsü', level: 1, xp: 0, xpNext: 8 }));
const hail = page => page.evaluate(() => Game.showChoiceEvent(Game.ROAD_EVENTS.find(e => e.id === 'storm'), Game.eventCtx()));

test('hail: the ten-second clock decides for you, and hesitation costs', async ({ page }) => {
    await newGame(page);
    await page.evaluate(t => { state.player.party = t; }, troops(4));
    const morale = await page.evaluate(() => Game.morale());
    await hail(page);
    await expect(page.locator('#ev-timer-left')).toHaveText(await L(page, '{0} sn', 10));
    await expect(page.locator('#modal-close')).toBeHidden();   // no way out but a choice or the clock
    // (the choice it makes may be the shelter, whose hours outlast the 6-hour slow-down: counted, not polled)
    await expect.poll(() => page.evaluate(() => (state.career || {}).indecisive || 0), { timeout: 15_000 }).toBe(1);
    await expect(modal(page)).toContainText('⌛');
    expect(await page.evaluate(() => Game.morale())).toBeLessThan(morale);
    await (await modalBtn(page, 'Tamam')).click();
    await expect(page.locator('#modal-overlay')).toHaveClass(/\bhidden\b/);
});

test('hail: walking it to the nearest roof, and the count when it stops', async ({ page }) => {
    await newGame(page);
    await page.evaluate(t => { state.player.party = t; }, troops(6));
    await hail(page);
    await page.waitForTimeout(700);   // a pointer press right as the event opens is not an answer
    await modal(page).locator('button[onclick^="Game.roadChoice(1"]').click();
    await expect(modal(page)).toContainText(await page.evaluate(() => T(Game.nearestLoc().name)));
    await (await modalBtn(page, 'Tamam')).click();
    expect(await page.evaluate(() => !!(state.player.storm && state.player.storm.walking))).toBe(true);
    await expect(page.locator('#pause-bar')).toContainText('⛈️');

    // A roof: walking into the nearest settlement ends it, with the toll named
    const near = await page.evaluate(() => Game.nearestLoc().id);
    await enter(page, near);
    const said = await okAlert(page);
    expect(said).toContain('⛈️');
    expect(await page.evaluate(() => state.player.storm)).toBeNull();
    await expect(page.locator('#pause-bar')).toHaveText('');
});

test('winter: a warning five days out, the cold without coal, the fires lit again', async ({ page }) => {
    await newGame(page);
    await page.evaluate(t => { state.player.party = t; state.player.inventory = state.player.inventory.filter(i => i.id !== 'coal'); }, troops(12));
    const year = await page.evaluate(() => [Game.YEAR_DAYS, Game.WINTER_DAYS]);
    const winterStarts = year[0] - year[1] + 1;

    await page.evaluate(d => { state.time.day = d - 5; Game.winterTick(); }, winterStarts);
    expect(await okAlert(page)).toContain(await L(page, '❄️ <b>Kış 5 gün sonra geliyor.</b> Kışın ordu her gün her {0} kişi için 1 kömür yakar; kömürsüz asker hastalanır. Pazarlarda kömür bulunur.', 10).then(s => s.replace(/<\/?b>/g, '')));

    await page.evaluate(d => { state.time.day = d; Game.winterTick(); }, winterStarts);
    const cold = await okAlert(page);
    expect(cold).toContain(await L(page, '❄️ <b>Kış geldi.</b> {0} gün sürecek. Grubun günde <b>{1} kömür</b> yakar; elinde {2} var.', year[1], 2, 0).then(s => s.replace(/<\/?b>/g, '')));
    expect(await page.evaluate(() => Game.cold())).toBe(true);

    await page.evaluate(d => { Game.addItem('coal', 10); state.time.day = d + 1; Game.winterTick(); }, winterStarts);
    expect(await okAlert(page)).toContain(await L(page, '🔥 Ateşler yeniden yandı, ordu ısındı.'));
    expect(await page.evaluate(() => [Game.cold(), Game.coalCount()])).toEqual([false, 8]);
});

test('wanderer: a stranger on the map, a click, and one more in the party', async ({ page }) => {
    await newGame(page);
    const w = await page.evaluate(() => {
        const n = Game.spawnWanderer('deserter');
        Object.assign(n, { speed: 0, targetX: n.x, targetY: n.y });
        state.npcParties.filter(o => o !== n && Game.dist(o, n) < 400).forEach(o => { o.x += 2000; o.targetX = o.x; });
        return { id: n.id, x: n.x, y: n.y };
    });
    await placeParty(page, w.x - 60, w.y);
    const before = await page.evaluate(() => state.player.party.length);
    await tapWorld(page, w);
    await expect(modal(page)).toContainText(await L(page, 'Yolda'), { timeout: 20_000 });
    await page.waitForTimeout(700);
    await (await modalBtn(page, 'Kabul Et')).click();
    await expect(modal(page)).toContainText(await L(page, 'Yolda'));
    await (await modalBtn(page, 'Tamam')).click();
    expect(await page.evaluate(() => state.player.party.length)).toBe(before + 1);
    expect(await page.evaluate(id => state.npcParties.some(n => n.id === id), w.id), 'the stranger left the map').toBe(false);
});
