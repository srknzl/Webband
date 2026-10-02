// The bandit-held mine (2.7.0) through the real screens: the scouting card, a sack carried out and
// set down at the mouth, the cart rumbling three out at once, the foreman's crucible steel, and
// what a thief keeps when they catch him. World setup only: the mine picked, the clock set to
// night, the hero put beside the thing to use.
const { test, expect, L, modal, newGame } = require('../fixtures');

async function openMine(page) {
    const id = await page.evaluate(() => {
        Game.setOpt('muted', true);
        state.time.hour = 23;                            // night: the sleepers sleep
        state.player.proficiencies.spotting.level = 8;   // the whole card
        localStorage.setItem(Lair.TUTOR_KEY, '1');       // the tour has its own test (lair.spec.js)
        const s = Game.lairs().find(l => Game.isMine(l));
        s.seen = true; s.lairAmbush = { day: state.time.day, on: false };
        Game.enterSite(s);
        return s.id;
    });
    await expect(modal(page).locator('.lair-brief')).toBeVisible();
    return id;
}
async function act(page) {
    if(await page.evaluate(() => Game.isTouch())) await page.locator('#lair-act').tap();
    else await page.keyboard.press('e');
}
async function goIn(page) {
    await modal(page).locator(`[onclick*="'solo'"]`).click();
    await expect(page.locator('#lair-view')).toHaveClass(/\bactive\b/);
    await page.waitForFunction(() => Lair.active && Lair.run());
}
/** Beside the first object `pick` matches, facing it, until the button offers it. */
async function besides(page, pick) {
    await page.evaluate(pick => { const o = Lair.run().objs.find(o => o && !o.gone && new Function('o', 'return ' + pick)(o)); Lair._place(o.x, o.y); }, pick);
    await page.waitForFunction(pick => { const c = Lair.run().ctx; return c && c.at && !c.blocked && new Function('o', 'return ' + pick)(c.at); }, pick);
}
async function shoulder(page, kind) {
    await besides(page, `o.ore === '${kind}'`);
    await act(page);
    await page.waitForFunction(kind => Lair.run().carry === kind, kind);
}
async function toMouth(page) {
    await page.evaluate(() => { const st = Lair.run().start, p = Lair.run().player; Lair._place(st.x, st.y - 1); p.x = st.x * 32 + 16; p.y = st.y * 32 + 20; });
    await page.waitForFunction(() => Lair.run().ctx && !Lair.run().ctx.blocked);
}
const bag = (page, id) => page.evaluate(id => (state.player.inventory.find(i => i.id === id) || { qty: 0 }).qty, id);
const site = (page, id) => page.evaluate(id => Game.lairs().find(l => l.id === id), id);

test('a sack carried to the mouth is iron in the bag, and the mine holds one sack fewer', async ({ page }) => {
    await newGame(page);
    const id = await openMine(page);
    await expect(modal(page).locator('.lb-lead')).toHaveText(await L(page, 'Haydutlar madeni ele geçirmiş. Sızarsan çuvalları sırtında ya da arabayla çıkışa taşırsın; çıkışa bıraktığın her çuval senindir, sonra yakalansan bile.'));
    await expect(modal(page).locator('.lb-intel li.unk')).toHaveCount(0);
    const iron0 = await bag(page, 'iron'), stock0 = (await site(page, id)).ore.iron;
    await goIn(page);
    await shoulder(page, 'iron');
    await expect(page.locator('#lair-stance')).toContainText(await L(page, 'çuval sırtında'));
    await toMouth(page);
    await act(page);                                           // set it down: it's safe now
    await page.waitForFunction(() => Lair.run().bank.iron === 1 && !Lair.run().carry);
    await expect(page.locator('#lair-ore-iron')).toHaveText('1');
    await page.waitForFunction(() => Lair.run().ctx && !Lair.run().ctx.blocked);
    await act(page);                                           // and out
    await expect(page.locator('#lair-over .lres')).toContainText(await L(page, 'Çıkarılan demir'));
    expect(await bag(page, 'iron')).toBe(iron0 + await page.evaluate(() => Game.MINE.perSack.iron));
    expect((await site(page, id)).ore.iron).toBe(stock0 - 1);
});

test('the cart rolls its sacks out on its own, and the foreman\'s chest holds crucible steel', async ({ page }) => {
    await newGame(page);
    const id = await openMine(page);
    const steel = (await site(page, id)).steel, coal0 = await bag(page, 'coal');
    expect(steel).toBeGreaterThan(0);
    await goIn(page);
    // the guards are out cold — this is about the cart, not about getting caught at it — but for
    // the one asleep in the far coal store: with nobody left standing the mine would fall, and
    // its whole stock would come along
    await page.evaluate(() => Lair.run().chars.forEach(g => { if(g.kind === 'guard' && !(g.x > 24 * 32 && g.y < 5 * 32)) g.state = 'ko'; }));
    await shoulder(page, 'coal');
    await page.evaluate(() => { const c = Lair.run().cart; Lair._place(c.x, c.y); });
    await page.waitForFunction(() => { const c = Lair.run().ctx; return c && c.at && c.at.cart; });
    await act(page);                                           // into the cart
    await page.waitForFunction(() => Lair.run().cart.load.coal === 1 && !Lair.run().carry);
    await page.waitForFunction(() => { const c = Lair.run().ctx; return c && c.at && c.at.cart && !c.blocked; });
    await act(page);                                           // and push
    await page.waitForFunction(() => Lair.run().cart.rolling);
    // it rumbles all the way down: a wide noise ring round the cart
    await page.waitForFunction(() => Lair.run().fx.some(f => f.kind === 'ring' && f.r >= 200));
    await page.waitForFunction(() => Lair.run().cart.done, null, { timeout: 20_000 });
    expect(await page.evaluate(() => Lair.run().bank.coal)).toBe(1);
    await besides(page, `o.chest && o.ch === 'C'`);
    await act(page);
    await page.waitForFunction(() => Lair.run().steel > 0);
    await toMouth(page);
    await act(page);
    await expect(page.locator('#lair-over .lres')).toContainText(await L(page, 'Pota çeliği'));
    expect(await bag(page, 'crucible')).toBe(steel);
    expect(await bag(page, 'coal')).toBe(coal0 + await page.evaluate(() => Game.MINE.perSack.coal));
});

test('caught, the sack set down at the mouth is still yours; the one on your back is not', async ({ page }) => {
    await newGame(page);
    const id = await openMine(page);
    const iron0 = await bag(page, 'iron'), stock0 = (await site(page, id)).ore.iron;
    await goIn(page);
    await shoulder(page, 'iron');
    await toMouth(page);
    await act(page);
    await page.waitForFunction(() => Lair.run().bank.iron === 1);
    await shoulder(page, 'iron');
    // a bandit catches the hero with the second sack on his back
    await page.evaluate(() => {
        const p = Lair.run().player, g = Lair.run().chars.find(c => c.kind === 'guard' && !c.leader);
        Object.assign(g, { state: 'alert', sus: 1, attack: 999, x: p.x + 20, y: p.y, lastSeen: { x: p.x, y: p.y } });
        p.hp = 1;
    });
    await expect(page.locator('#lair-over .lres')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#lair-over .llead')).toContainText(await L(page, 'Çıkışa bıraktığın çuvallar ise senin kaldı.'));
    expect(await bag(page, 'iron')).toBe(iron0 + await page.evaluate(() => Game.MINE.perSack.iron));
    expect((await site(page, id)).ore.iron).toBe(stock0 - 1);
});
