// Bandit lairs (2.2.0) through the real screens: the scouting card a lair on the map opens, the
// tour offer on the first visit, the lair itself (a chest, the way out), the noble quest and the
// open assault. World setup only: the lair picked and its layout pinned, the clock set to night,
// the hero put beside the thing to use — walking a lair has no shortcut worth testing here.
const { test, expect, L, modal, modalBtn, newGame } = require('../fixtures');

/** Opens the scouting card of a lair the way a click on its map icon does, returning its id. */
async function openCard(page, layout = 'house') {
    const id = await page.evaluate(layout => {
        Game.setOpt('muted', true);                      // nobody wants a lair ambience from a test run
        state.time.hour = 23;                            // night: the sleepers sleep
        state.player.proficiencies.spotting.level = 8;   // the whole card
        const s = Game.lairs()[0];
        s.layout = layout; s.seen = true; s.lairAmbush = { day: state.time.day, on: false };
        Game.enterSite(s);
        return s.id;
    }, layout);
    await expect(modal(page).locator('.lair-brief')).toBeVisible();
    return id;
}
/** The action button: E on a keyboard, the Etkileşim button on a phone. */
async function act(page) {
    if(await page.evaluate(() => Game.isTouch())) await page.locator('#lair-act').tap();
    else await page.keyboard.press('e');
}
async function goIn(page, way = 'solo') {
    await modal(page).locator(`[onclick*="'${way}'"]`).click();
    await expect(page.locator('#lair-view')).toHaveClass(/\bactive\b/);
    await page.waitForFunction(() => Lair.active && Lair.run());
}
async function skipOffer(page) {
    await (await modalBtn(page, 'Hayır, biliyorum')).click();
    await expect(page.locator('#modal-overlay')).toHaveClass(/\bhidden\b/);
}
async function leaveBy(page) {
    await page.evaluate(() => { const st = Lair.run().start; Lair._place(st.x, st.y - 1); const p = Lair.run().player; p.y = st.y * 32 + 20; });
    await page.waitForFunction(() => Lair.run().ctx && !Lair.run().ctx.blocked);
    await act(page);
    await expect(page.locator('#lair-over .lres')).toBeVisible();
}

test('the scouting card offers three ways in and the tour opens on the first visit', async ({ page }) => {
    await newGame(page);
    await openCard(page);
    // Gözcülük 8 knows everything: count, ways in, prisoners, the sketch, the ambush, the secret, the leader
    await expect(modal(page).locator('.lb-intel li')).toHaveCount(7);
    await expect(modal(page).locator('.lb-intel li.unk')).toHaveCount(0);
    await expect(modal(page).locator('.lb-way')).toHaveCount(3);
    await expect(modal(page).locator('.lb-warn')).toHaveText(await L(page, 'Dikkat: açık baskında haydutlar destek çağırır, sayıları artar.'));
    // the ? button explains the game before going in, and comes back to the card
    await modal(page).locator('.lb-help').click();
    await expect(modal(page).locator('.lb-howto li').first()).toBeVisible();
    await (await modalBtn(page, '← Keşfe dön')).click();
    await expect(modal(page).locator('.lair-brief .lb-ways')).toBeVisible();

    await goIn(page);
    // first time in: the tour is offered, and taken it rings the real controls
    await (await modalBtn(page, 'Evet, göster')).click();
    await expect(page.locator('#coach-box')).toBeVisible();
    // the lair's clock stands still while the tour runs
    const t0 = await page.evaluate(() => Lair.run().t);
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => Lair.run().t)).toBe(t0);
    for(let i = 0; i < 20 && await page.locator('#coach-box').isVisible(); i++)
        await page.locator('#coach-box .btn.primary').click();
    await expect(page.locator('#coach-box')).toHaveCount(0);
    // asked once: a second lair doesn't ask again
    expect(await page.evaluate(() => localStorage.getItem(Lair.TUTOR_KEY))).toBe('1');
    await leaveBy(page);
    await page.locator('#lair-over .btn.primary').click();
    await expect(page.locator('#map-view')).toHaveClass(/\bactive\b/);
    await page.waitForFunction(() => Game._loopId && !Lair.active);
});

test('the map clock holds while a lair loads, and its pen draws under a window (#171)', async ({ page }) => {
    await newGame(page);
    const id = await openCard(page, 'camp');
    // a window opened before the lair's first frame (an encounter while its sprites loaded):
    // that frame is drawn before any update has walked the horses
    const held = await page.evaluate(id => {
        Lair.enter(id, 'solo');
        const held = Game.clockStopped();
        Game.showModal(`<p>${T('Çık')}</p>`);
        return held;
    }, id);
    expect(held).toBe(true);
    await page.waitForFunction(() => Lair.active && Lair.run() && Lair.run().drawn);
    expect(await page.evaluate(() => [Lair.run().horses.length, Game.held])).toEqual([3, false]);
});

test('a chest opened in a lair pays out on the map', async ({ page }) => {
    await newGame(page);
    await openCard(page, 'house');
    await goIn(page);
    await skipOffer(page);
    const before = await page.evaluate(() => state.player.money);
    // the plain chest in the store room (the trapped one would sting)
    await page.evaluate(() => { const o = Lair.run().objs.find(o => o && o.chest && !o.trapped); Lair._place(o.x, o.y); });
    await page.waitForFunction(() => Lair.run().ctx && Lair.run().ctx.at && Lair.run().ctx.at.chest);
    await act(page);
    await page.waitForFunction(() => Lair.run().gold > 0);
    const gold = await page.evaluate(() => Lair.run().gold);
    await leaveBy(page);
    expect(await page.evaluate(() => state.player.money)).toBe(before + gold);
    // the lair is still there: a sneak doesn't break it
    expect(await page.evaluate(() => Game.lairs().length)).toBe(await page.evaluate(() => Game.LAIR_COUNT));
});

test('a hero a trapped chest fells can\'t walk out with the loot while falling', async ({ page }) => {
    await newGame(page);
    await openCard(page, 'house');
    await goIn(page);
    await skipOffer(page);
    const before = await page.evaluate(() => state.player.money);
    await page.evaluate(() => { const o = Lair.run().objs.find(o => o && o.chest && o.trapped); Lair._place(o.x, o.y); Lair.run().player.hp = 1; });
    await page.waitForFunction(() => Lair.run().ctx && Lair.run().ctx.at && Lair.run().ctx.at.chest);
    await act(page);
    await page.waitForFunction(() => Lair.run().player.state === 'down');
    // the fall lasts a moment: neither the pause menu nor a retreat turns it into a way out
    await page.keyboard.press('Escape');
    await page.evaluate(() => Lair.retreat());
    await expect(page.locator('#lair-over .lres')).toBeVisible();
    expect(await page.evaluate(() => state.player.money)).toBe(before - Math.floor(before * .25));
    await page.locator('#lair-over .btn.primary').click();
    await page.waitForFunction(() => Game._loopId && !Lair.active);
});

test('a noble carried out of the lair finishes the lord\'s quest', async ({ page }) => {
    await newGame(page);
    const lord = await page.evaluate(() => LORDS.find(l => l.rank === 'lord').id);
    const lairId = await page.evaluate(lord => {
        const q = Quests.make('lair_captive', lord);
        state.player.quests.push(q);
        return q.data.lairId;
    }, lord);
    await page.evaluate(id => { const i = Game.lairs().findIndex(l => l.id === id); const [l] = Game.lairs().splice(i, 1); state.sites.splice(state.sites.indexOf(l), 1); state.sites.unshift(l); }, lairId);
    await openCard(page, 'house');
    await expect(modal(page).locator('.lb-intel li').first()).toContainText('📜');
    await goIn(page);
    await skipOffer(page);
    // out on the road in front of the house: cut the noble loose there, then leave together
    await page.evaluate(() => { const n = Lair.run().chars.find(c => c.noble), st = Lair.run().start; n.x = (st.x - 1) * 32 - 6; n.y = st.y * 32 + 20; Lair.run().player.x = (st.x - 1) * 32 + 16; Lair.run().player.y = st.y * 32 + 20; Lair.run().player.a = Math.PI; });
    await page.waitForFunction(() => Lair.run().ctx && Lair.run().ctx.at && Lair.run().ctx.at.noble);
    await act(page);
    await page.waitForFunction(() => Lair.run().chars.find(c => c.noble).following);
    await leaveBy(page);
    await expect(page.locator('#lair-over .lres')).toContainText(await L(page, 'Kurtarılan soylu'));
    expect(await page.evaluate(() => state.player.quests.find(q => q.id === 'lair_captive').state)).toBe('awaiting');
});

test('storming a lair with the army is a battle against the lair and its reinforcements', async ({ page }) => {
    await newGame(page);
    await page.evaluate(() => { for(let i = 0; i < 4; i++) Game.addRecruit(LOCATIONS[0]); });
    const strength = await page.evaluate(() => Math.round(Game.lairs()[0].strength));
    await openCard(page);
    await goIn(page, 'army').catch(() => {});
    await page.waitForFunction(() => Battle.active);
    const foes = await page.evaluate(() => Battle.units.filter(u => !u.isPlayerTeam).length);
    expect(foes).toBeGreaterThan(strength);
});
