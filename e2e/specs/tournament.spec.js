// The arena and the tournament (#26, #122, #133): the city's cards open them, each fight is the
// real Battle engine on the sand ring, and the result comes back through the same door as a
// real battle. The fight itself is not played stroke by stroke (tools/duel.js measures that):
// the test checks the ring is up, fells the other side, and reads what the game pays out.
const { test, expect, L, modal, modalBtn, okAlert, actionBtn, newGame, enter, quietCity, painted } = require('../fixtures');

/** Waits for the ring to be live, then drops every foe; the round ends as a win. */
async function winFight(page) {
    await expect(page.locator('#battle-view')).toHaveClass(/\bactive\b/);
    await expect.poll(() => page.evaluate(() => Battle.battleTime)).toBeGreaterThan(0.3);
    await page.evaluate(() => Battle.units.forEach(u => { if(!u.isPlayerTeam) u.hp = 0; }));
}

test('arena: the novice goes down and the purse is paid', async ({ page }) => {
    await newGame(page);
    const city = await quietCity(page);
    await enter(page, city);
    await (await actionBtn(page, '🤺 Arenada Dövüş')).click();
    await expect(modal(page).locator('button[onclick^="Game.startArena"]')).toHaveCount(3);
    const before = await page.evaluate(() => ({ money: state.player.money, purse: Game.arenaPurse() }));
    await modal(page).locator('button[onclick="Game.startArena(0)"]').click();

    await expect(page.locator('#battle-view')).toHaveClass(/\bactive\b/);
    // One wooden-weapon novice in the ring, unarmoured (2.2.1: it used to wear the full kit)
    const foe = await page.evaluate(() => Battle.units.filter(u => !u.isPlayerTeam).map(u => ({ name: u.name, def: u.defense })));
    expect(foe).toEqual([{ name: 'Acemi Dövüşçü', def: 0 }]);
    expect(await painted(page)).toBeGreaterThan(1);
    await winFight(page);

    const said = await okAlert(page);
    expect(said).toContain(await L(page, '{0} kumun üstünde kaldı, kalabalık ıslık çalıyor.', await L(page, 'Acemi Dövüşçü')));
    await expect(page.locator('#map-view')).toHaveClass(/\bactive\b/);
    expect(said).toContain(await L(page, '\n+{0} dinar maç ücreti.', before.purse));
    const after = await page.evaluate(() => ({ money: state.player.money, streak: state.player.arenaStreak }));
    expect(after.money).toBe(before.money + before.purse);
    expect(after.streak).toBe(1);
    await page.waitForFunction(() => Game._loopId && !Battle.active);
});

test('tournament: a bet, three rounds on the sand, the champion is paid once', async ({ page }) => {
    await newGame(page);
    const city = await quietCity(page);
    await page.evaluate(id => { state.activeTournaments[id] = true; state.player.money = 1000; }, city);
    await enter(page, city);
    await (await actionBtn(page, '🏆 Turnuvaya Katıl')).click();

    // The draw: eight seats, the player among them, and a bet on yourself
    await expect(modal(page).locator('#tourney-bet')).toBeVisible();
    await modal(page).locator('#tourney-bet').fill('100');
    await (await modalBtn(page, '⚔️ Kuraya Gir')).click();
    expect(await page.evaluate(() => state.player.money)).toBe(900);
    expect(await page.evaluate(id => !!state.activeTournaments[id], city), 'the tournament left the city list').toBe(false);

    for(const [round, size] of [['Çeyrek Final', 4], ['Yarı Final', 2], ['Final', 1]]) {
        await expect(modal(page)).toContainText(await L(page, round));
        await (await modalBtn(page, '⚔️ Meydana Çık')).click();
        // Team rounds: size a side, everyone in the same padded kit on foot
        await expect(page.locator('#battle-view')).toHaveClass(/\bactive\b/);
        const sides = await page.evaluate(() => ({
            mine: Battle.units.filter(u => u.isPlayerTeam).length,
            theirs: Battle.units.filter(u => !u.isPlayerTeam).length,
            mounted: Battle.units.some(u => u.mounted)
        }));
        expect(sides).toEqual({ mine: size, theirs: size, mounted: false });
        await winFight(page);
    }

    // The board settles the bet and names the champion; a second look does not pay again
    await expect(modal(page)).toContainText(await L(page, '🏆 Şampiyon sensin.'));
    const odds = await page.evaluate(() => Game.tourneyOdds()[3]);
    const paid = await page.evaluate(() => state.player.money);
    expect(paid).toBe(900 + 50 + 150 + 500 + Math.floor(100 * odds));
    await page.evaluate(() => Game.tourneyBoard());
    expect(await page.evaluate(() => state.player.money)).toBe(paid);
    expect(await page.evaluate(id => state.tourneyChampions[id].name === state.player.name, city)).toBe(true);
    await (await modalBtn(page, 'Meydandan Ayrıl')).click();
    await expect(page.locator('#modal-overlay')).toHaveClass(/\bhidden\b/);
    expect(await page.evaluate(() => state.tourney)).toBeNull();
});
