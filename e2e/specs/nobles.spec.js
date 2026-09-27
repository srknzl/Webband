// Nobles (#133): the lords' hall, an oath of fealty, courting a lady to a betrothal and a
// wedding at the feast, and a feast of your own. World setup only — renown, a guardian's
// goodwill, the day the wedding feast opens — through the game's own state and daily calls;
// every step a player takes is a click on the real screen.
const { test, expect, L, modal, modalBtn, okAlert, actionBtn, openView, newGame, enter, quietCity } = require('../fixtures');

test('fealty: the hall asks for renown first, then takes the oath', async ({ page }) => {
    await newGame(page);
    const city = await quietCity(page);
    await enter(page, city);
    await (await actionBtn(page, '👑 Lordlar Salonuna Git')).click();
    const oath = modal(page).locator('button[onclick^="Nobles.swearFealtyPrompt"]');
    await oath.click();
    expect(await okAlert(page)).toContain(await L(page, 'Derebeyi olmak için en az 50 Nam gerekli.'));

    await page.evaluate(() => { state.player.renown = 60; });
    await (await actionBtn(page, '👑 Lordlar Salonuna Git')).click();
    await oath.click();
    const fid = await page.evaluate(id => LOCATIONS.find(l => l.id === id).faction, city);
    const kingdom = await page.evaluate(f => Game.factionName(f), fid);
    expect(await okAlert(page)).toContain(await L(page, 'Artık {0} derebeyisin! Krallığın lordları seni tanımaya başladı.', kingdom));
    expect(await page.evaluate(() => state.player.vassalOf)).toBe(fid);
    // sworn: the hall no longer offers it
    await (await actionBtn(page, '👑 Lordlar Salonuna Git')).click();
    await expect(oath).toHaveCount(0);
});

test('courtship: a visit, the guardian\'s price, betrothal, and the wedding at the feast', async ({ page }) => {
    await newGame(page);
    const s = await page.evaluate(() => {
        // a lady at home in a city at peace, no rival, no feast running anywhere
        const L = LADIES.find(l => { const h = LOCATIONS.find(x => x.id === l.homeLocId); return h && h.type === 'city' && !Game.atWar(Game.playerFaction(), h.faction); });
        delete state.rivals[L.id];
        state.feast = null; state.scheduledFeasts = []; state.nextFeastDay = 999;
        state.player.renown = 200; state.player.money = 20000;
        state.affection[L.id] = 57;
        Nobles.addRel(L.guardianId, 60 - Nobles.rel(L.guardianId));
        return { lady: L.id, home: L.homeLocId, name: T(L.name) };
    });
    await enter(page, s.home);
    await (await actionBtn(page, '👑 Lordlar Salonuna Git')).click();
    await modal(page).locator(`button[onclick="Nobles.talk('${s.lady}')"]`).click();

    // Not yet: marriage needs 60, and one visit brings her there
    await expect(modal(page)).toContainText(await L(page, '💍 Evlilikten söz etmek için ilgisi 60 olmalı ({0})', 57));
    await (await modalBtn(page, '💬 Sohbet et (+3)')).click();
    await okAlert(page);
    await expect(modal(page)).toContainText(s.name);
    await (await modalBtn(page, 'Babandan seni isteyeceğim')).click();

    // The guardian's terms: renown and goodwill met, the price named, paid
    const price = await page.evaluate(() => state.dowryOffer.amount);
    const money = await page.evaluate(() => state.player.money);
    await (await modalBtn(page, '💰 Kabul et ve öde ({0})', price)).click();
    const said = await okAlert(page);
    expect(said).toContain(await L(page, 'Drahoma sayıldı, eller sıkıldı.'));
    expect(await page.evaluate(() => state.player.money)).toBe(money - price);
    const w = await page.evaluate(() => state.pendingWedding);
    expect(w.ladyId).toBe(s.lady);

    // The day comes: the guardian's feast opens and the party is at its gate
    await page.evaluate(day => { state.time.day = day; Feast.dailyTick(); }, w.day);
    await enter(page, w.locId);
    await (await actionBtn(page, '🍷 Şölene Katıl')).click();
    await (await modalBtn(page, '💍 Nikâhı Kıy!')).click();
    expect(await okAlert(page)).toContain(s.name);
    expect(await page.evaluate(() => [state.player.spouse, state.pendingWedding, state.betrothed])).toEqual([s.lady, null, null]);

    // She rides with the party now, and the party screen names her in this language
    await openView(page, 'party');
    await expect(page.locator('#party-list')).toContainText(s.name);
});

test('feast: hosting one needs the money and the fine food, then the hall fills', async ({ page }) => {
    await newGame(page);
    const city = await quietCity(page);
    await page.evaluate(id => {
        const c = LOCATIONS.find(l => l.id === id);
        state.player.vassalOf = c.faction;   // a sworn vassal may feast in his liege's towns
        state.feast = null; state.player.money = 5000; state.player.renown = 200;
    }, city);
    await enter(page, city);
    const host = await actionBtn(page, '🍷 Şölen Ver (3000 Dinar + 30 et/peynir)');
    await host.click();
    expect(await okAlert(page)).toContain(await L(page, 'Şölen için {0} birim yüksek kalite yemek (et/peynir) gerek. Sende {1} var.', 30, 0));

    await page.evaluate(() => state.player.inventory.push(Object.assign({}, ITEMS.meat, { qty: 30 })));
    const money = await page.evaluate(() => state.player.money);
    await host.click();
    const kingdom = await page.evaluate(id => Game.factionName(LOCATIONS.find(l => l.id === id).faction), city);
    expect(await okAlert(page)).toContain(await L(page, 'Şölenin başladı! {0}\'nın bütün soyluları geldi.\nHer biriyle +5 ilişki, +15 nam.', kingdom));
    expect(await page.evaluate(() => [state.player.money, !!state.feast && state.feast.hostedByPlayer])).toEqual([money - 3000, true]);
    expect(await page.evaluate(() => state.player.inventory.some(i => i.id === 'meat')), 'the feast ate the meat').toBe(false);
});
