// Layout audit on every screen and window a player reaches in the first hour, on both the
// desktop and the phone layout: nothing spills sideways, windows fit the screen, panels do not
// sit on each other, button labels fit their buttons, and on a phone every control is big
// enough for a thumb.
const { test, expect, L, modal, modalBtn, actionBtn, openView, newGame, enter, quietCity, audit } = require('../fixtures');

test('yerleşim denetimi: bütün ekranlar ve pencereler', async ({ page, isMobile, lang }) => {
    // circled pseudo-letters are wider than any real language's: sizes are measured on real text
    test.skip(lang === 'xx', 'the pseudo-locale checks where text comes from, not how wide it is');
    const found = [];
    const look = async where => found.push(...await audit(page, where));

    await page.goto('/');
    await look('başlangıç');
    await page.locator('#start-btn').click();
    await look('sihirbaz');
    await page.evaluate(() => Game.closeModal());
    await newGame(page);
    await look('harita');
    // The map badge is one capsule row (2.1): the place, then the buttons (the narrow layout
    // moved diplomacy and the music skip into "⋯ Daha" and folds the troop count away)
    if(await page.locator('#sidebar .sb-more').isVisible()) {
        const mids = await page.evaluate(() => [...document.querySelectorAll('#map-terrain, #map-hud button')]
            .filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return (r.top + r.bottom) / 2; }));
        expect(Math.max(...mids) - Math.min(...mids), 'map badge sits on one row').toBeLessThan(10);
    }
    for(const v of ['character', 'party', 'inventory', 'quests']) { await openView(page, v); await look(v); }
    await openView(page, 'map');
    if(isMobile) { await page.locator('#sidebar .sb-more').click(); await look('daha'); }
    for(const [call, where] of [['Game.showSettings()', 'ayarlar'], ['Save.open()', 'kayıtlar'],
                                ['Game.showAchievements()', 'başarımlar'], ['Game.showDiplomacy()', 'diplomasi']]) {
        await page.evaluate(c => eval(c), call);
        await look(where);
    }
    await page.evaluate(() => Game.closeModal());

    const city = await quietCity(page);
    await page.evaluate(() => { state.player.money = 5000; });
    await enter(page, city);
    await look('şehir');
    for(const [btn, where] of [['🍺 Hana Gir', 'han'], ['🛒 Pazara Git', 'pazar'], ['👑 Lordlar Salonuna Git', 'salon'], ['🤺 Arenada Dövüş', 'arena']]) {
        await (await actionBtn(page, btn)).click();
        await look(where);
        await page.evaluate(() => Game.closeModal());
    }
    // A fight: the encounter window, the battlefield with its controls, the result window
    await (await actionBtn(page, '🚪 Ayrıl')).click();
    await page.evaluate(() => {
        state.time.day = 20;   // no back-off roll: the encounter always offers the fight
        // A lone band: next to anyone else's party the game offers to join their clash instead (#32)
        const b = state.npcParties.find(n => n.type === 'bandit' && !(BAND_KINDS[n.band] || {}).beast
            && state.npcParties.every(o => o === n || Game.dist(o, n) > 400));
        Object.assign(b, { size: 3, speed: 0 });
        Object.assign(state.player, { x: b.x - 20, y: b.y });
        Game.triggerEncounter(b);
    });
    await look('karşılaşma');
    await modal(page).locator('button[onclick*="Battle.start"]').click();
    await expect(page.locator('#battle-view')).toHaveClass(/\bactive\b/);
    await look('savaş');
    await page.evaluate(() => Battle.units.forEach(u => { if(!u.isPlayerTeam) u.hp = 0; }));
    await expect(modal(page).locator('#bres-tab-ozet')).toBeVisible();
    await look('savaş sonucu');

    expect(found).toEqual([]);
});
