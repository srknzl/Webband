// Fiefs and villages (#133): a castle of your own — its garrison, its storehouse and treasury —
// and the two things a captain does to a village that is not his: raid it, or name a price.
// World setup only: the castle is granted, the purse and the renown are set; the garrison,
// storage, raid and tribute are all worked through their own panels.
const { test, expect, L, modal, modalBtn, okAlert, actionBtn, newGame, enter } = require('../fixtures');

const troops = n => Array.from({ length: n }, (_, i) => ({ id: 'e2e' + i, name: 'Svadya Köylüsü', level: 1, xp: 0, xpNext: 8 }));

test('fief: troops into the garrison and back, goods and coin into the storehouse', async ({ page }) => {
    await newGame(page);
    const castle = await page.evaluate(t => {
        const c = LOCATIONS.find(l => l.type === 'castle' && !Game.atWar(Game.playerFaction(), l.faction));
        state.player.vassalOf = c.faction;
        Game.grantFief(c, c.faction);
        c.garrison = [];
        state.player.party = t;
        state.player.money = 1000;
        return c.id;
    }, troops(6));
    await enter(page, castle);

    // Garrison: five of the six stay behind, the daily net is written in the panel
    await (await actionBtn(page, '🛡️ Garnizon ({0} asker)', 0)).click();
    const label = await page.evaluate(() => Game.troopLabel(state.player.party[0]));
    await modal(page).locator(`button[onclick^="Game.moveGarrison"][onclick*="'in'"]`, { hasText: '5' }).click();
    expect(await page.evaluate(id => [LOCATIONS.find(l => l.id === id).garrison.length, state.player.party.length], castle)).toEqual([5, 1]);
    await expect(modal(page)).toContainText(`${label} x5`);
    await modal(page).locator(`button[onclick^="Game.moveGarrison"][onclick*="'out'"]`, { hasText: /^1$/ }).click();
    expect(await page.evaluate(id => LOCATIONS.find(l => l.id === id).garrison.length, castle)).toBe(4);
    await (await modalBtn(page, 'Kapat')).click();
    await expect(await actionBtn(page, '🛡️ Garnizon ({0} asker)', 4)).toBeVisible();

    // Storehouse: a sack of grain in, 500 denars into the treasury that a defeat never touches
    await page.evaluate(() => state.player.inventory.push(Object.assign({}, ITEMS.wheat, { qty: 3 })));
    const purse = await page.evaluate(() => state.player.money);
    await (await actionBtn(page, '📦 Depo ({0} kalem)', 0)).click();
    await modal(page).locator(`button[onclick^="Game.moveStorage"][onclick*="'wheat'"][onclick*="'in'"]`, { hasText: '3' }).click();
    await modal(page).locator(`button[onclick^="Game.moveTreasury"][onclick*="'in'"]`, { hasText: '500' }).click();
    const after = await page.evaluate(id => { const c = LOCATIONS.find(l => l.id === id);
        return { stored: (c.storage.find(i => i.id === 'wheat') || {}).qty, treasury: c.treasury, money: state.player.money,
                 carried: state.player.inventory.some(i => i.id === 'wheat'), ratio: Game.defeatLootRatio() }; }, castle);
    expect(after).toMatchObject({ stored: 3, treasury: 500, money: purse - 500, carried: false });
    expect(after.ratio, 'money in the treasury makes a defeat cheaper').toBeLessThan(0.9);
    await (await modalBtn(page, 'Kapat')).click();
    await expect(await actionBtn(page, '📦 Depo ({0} kalem)', 1)).toBeVisible();
});

test('raid: rout the militia, empty the storehouse, carry the loot and the stigma', async ({ page }) => {
    await newGame(page);
    const v = await page.evaluate(t => {
        const v = LOCATIONS.find(l => l.type === 'village' && !Game.atWar(Game.playerFaction(), l.faction));
        // nobody near enough to see the smoke
        state.npcParties.filter(n => n.lordId).forEach(n => { if(Game.dist(n, v) < 2500) { n.x = v.x + 3000; n.y = v.y; n.speed = 0; } });
        state.player.party = t;
        return { id: v.id, name: T(v.name) };
    }, troops(10));
    await enter(page, v.id);
    await (await actionBtn(page, '🔥 Köyü Yağmala')).click();
    await (await modalBtn(page, '🔥 Yak ve Yağmala')).click();

    // The militia: a real fight on the field
    await expect(page.locator('#battle-view')).toHaveClass(/\bactive\b/);
    await expect.poll(() => page.evaluate(() => Battle.battleTime)).toBeGreaterThan(0.3);
    await page.evaluate(() => Battle.units.forEach(u => { if(!u.isPlayerTeam) u.hp = 0; }));
    await (await modalBtn(page, 'Kazanımları Al ve İlerle')).click();

    // The storehouse: fifteen seconds on the map with the panel counting down
    await expect(page.locator('#raid-ui')).toBeVisible();
    await expect(page.locator('#raid-info')).toContainText(v.name);
    await expect(page.locator('#raid-info')).toContainText(await L(page, 'Ufukta kimse yok. Ambarı boşalt.'));
    const money = await page.evaluate(() => state.player.money);
    await page.evaluate(() => { state.player.raid.t = Game.RAID_SECONDS - 0.5; });
    expect(await okAlert(page)).toContain(v.name);
    await expect(page.locator('#raid-ui')).toBeHidden();
    const after = await page.evaluate(id => ({ money: state.player.money, status: state.player.status, honor: Game.honor(),
                                               raided: Game.raidedRecently(LOCATIONS.find(l => l.id === id)) }), v.id);
    expect(after.money).toBeGreaterThan(money);
    expect(after).toMatchObject({ status: 'idle', raided: true });
    expect(after.honor).toBeLessThan(0);
    // a burned village has nothing to sell you now
    await enter(page, v.id);
    await expect(await actionBtn(page, '🛒 Erzak Al')).toHaveCount(0);
});

test('tribute: at 300 renown a village pays without a siege', async ({ page }) => {
    await newGame(page);
    const v = await page.evaluate(t => {
        const v = LOCATIONS.find(l => l.type === 'village' && !Game.atWar(Game.playerFaction(), l.faction));
        state.player.party = t;
        return { id: v.id, name: T(v.name) };
    }, troops(20));
    await enter(page, v.id);
    await (await actionBtn(page, '👑 Haraca Bağla')).click();
    // not yet: the gate names the renown it wants
    await expect(modal(page)).toContainText(await L(page, '👑 Haraç — {0}', v.name));
    await expect(modal(page)).toContainText(String(await page.evaluate(() => Game.RENOWN_GATES.tribute)));
    expect(await page.evaluate(id => LOCATIONS.find(l => l.id === id).tributeTo, v.id)).toBeUndefined();
    await (await modalBtn(page, 'Geri')).click();

    await page.evaluate(() => { state.player.renown = 320; });
    await (await actionBtn(page, '👑 Haraca Bağla')).click();
    await (await modalBtn(page, '👑 Fiyatı Söyle')).click();
    await okAlert(page);
    const per = await page.evaluate(id => { const l = LOCATIONS.find(x => x.id === id); return l.tributeTo === 'player' ? Game.tributeOf(l) : -1; }, v.id);
    expect(per).toBeGreaterThan(0);
    await expect(await actionBtn(page, '👑 Haraç (+{0} dinar/gün)', per)).toBeVisible();
});
