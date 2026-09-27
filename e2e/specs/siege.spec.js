// Sieges (#25, #133): the camp is pitched from the settlement screen, the preparation days run
// on the map clock, the assault is a real battle at the wall, and taking the place founds the
// player's own kingdom. World setup only: the lords who could ride to break the siege are sent
// far away, and the days pass through the game's own clock.
const { test, expect, L, modal, modalBtn, okAlert, actionBtn, newGame, enter } = require('../fixtures');

test('siege: camp, a day of ladders, the assault, a kingdom of your own', async ({ page }) => {
    await newGame(page);
    const castle = await page.evaluate(() => {
        const c = LOCATIONS.find(l => l.type === 'castle' && !Game.atWar(Game.playerFaction(), l.faction));
        // no relief army: every lord of that kingdom is across the map
        state.npcParties.filter(n => n.faction === c.faction).forEach(n => { n.x = 100; n.y = 100; n.targetX = 100; n.targetY = 100; n.speed = 0; });
        state.player.party = Array.from({ length: 12 }, (_, i) => ({ id: 'e2e' + i, name: 'Svadya Köylüsü', level: 1, xp: 0, xpNext: 8 }));
        return c.id;
    });
    await enter(page, castle);
    await (await actionBtn(page, '⚔️ Kuşat! (Kendi Krallığını Kur)')).click();
    await expect(modal(page).locator('button[onclick*="beginSiege"]')).toHaveCount(2);
    await modal(page).locator(`button[onclick*="'ladder'"]`).click();

    // The camp: on the map, with a panel that says what is left and a locked assault
    await expect(page.locator('#map-view')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#siege-ui')).toBeVisible();
    await expect(page.locator('#siege-info')).toContainText(await L(page, 'Hazırlık: <b>{0}</b> gün kaldı', 1).then(s => s.replace(/<\/?b>/g, '')));
    await expect(page.locator('#btn-siege-assault')).toBeDisabled();
    expect(await page.evaluate(() => state.player.status)).toBe('besieging');

    // A day passes on the map clock: the ladders are ready and the panel says so
    await page.evaluate(() => Game.advanceTime(24 - state.time.hour + 0.1));
    expect(await okAlert(page)).toContain(await L(page, '{0} hazır — {1} surlarına saldırabilirsin.',
        await L(page, 'Merdiven'), await page.evaluate(id => T(LOCATIONS.find(l => l.id === id).name), castle)));
    await expect(page.locator('#btn-siege-assault')).toBeEnabled();
    const garrison = await page.evaluate(id => Game.siegeGarrison(LOCATIONS.find(l => l.id === id), state.player.siege), castle);
    await expect(page.locator('#siege-info')).toContainText(await L(page, 'Garnizon: <b>{0}</b> asker', garrison).then(s => s.replace(/<\/?b>/g, '')));

    // The assault: a siege battle with a wall, the garrison on the other side
    await page.locator('#btn-siege-assault').click();
    await expect(page.locator('#battle-view')).toHaveClass(/\bactive\b/);
    expect(await page.evaluate(() => !!Battle.siege)).toBe(true);
    expect(await page.evaluate(() => Battle.units.filter(u => !u.isPlayerTeam).length)).toBe(garrison);
    await expect.poll(() => page.evaluate(() => Battle.battleTime)).toBeGreaterThan(0.3);
    await page.evaluate(() => Battle.units.forEach(u => { if(!u.isPlayerTeam) u.hp = 0; }));

    // The victory screen carries the conquest, and the castle flies the new banner
    const name = await page.evaluate(id => T(LOCATIONS.find(l => l.id === id).name), castle);
    await expect(modal(page)).toContainText(await L(page, '{0} fethedildi — kendi krallığını ilan ettin!', name));
    await (await modalBtn(page, 'Kazanımları Al ve İlerle')).click();
    await expect(page.locator('#map-view')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#siege-ui')).toBeHidden();
    expect(await page.evaluate(id => ({ f: LOCATIONS.find(l => l.id === id).faction, owner: LOCATIONS.find(l => l.id === id).owner,
                                          king: state.player.vassalOf }), castle))
        .toEqual({ f: 'player_kingdom', owner: 'player', king: 'player_kingdom' });

    // Walking into your own castle: the header names your kingdom, the fief's own cards are there
    await enter(page, castle);
    const men = await page.evaluate(id => (LOCATIONS.find(l => l.id === id).garrison || []).length, castle);
    await expect(await actionBtn(page, '🛡️ Garnizon ({0} asker)', men)).toBeVisible();
    await page.waitForFunction(() => Game._loopId);
});

test('siege: lifting the camp asks nothing and leaves the place as it was', async ({ page }) => {
    await newGame(page);
    const castle = await page.evaluate(() => LOCATIONS.find(l => l.type === 'castle' && !Game.atWar(Game.playerFaction(), l.faction)).id);
    await enter(page, castle);
    await (await actionBtn(page, '⚔️ Kuşat! (Kendi Krallığını Kur)')).click();
    await modal(page).locator(`button[onclick*="'tower'"]`).click();
    await expect(page.locator('#siege-ui')).toBeVisible();
    await expect(page.locator('#siege-info')).toContainText(await L(page, 'Hazırlık: <b>{0}</b> gün kaldı', 3).then(s => s.replace(/<\/?b>/g, '')));
    await page.locator('#siege-ui button[onclick="Game.liftSiege()"]').click();
    expect(await okAlert(page)).toContain(await L(page, 'Kuşatma kaldırıldı. Ordun kampı toplayıp çekildi.'));
    await expect(page.locator('#siege-ui')).toBeHidden();
    expect(await page.evaluate(() => [state.player.siege, state.player.status])).toEqual([null, 'idle']);
});
