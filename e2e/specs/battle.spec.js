// Encounter → battle → result → back on the map: the loop the whole game hangs on. The
// battle itself is not played out stroke by stroke (tools/duel.js measures that); the
// test checks the screen lives, then ends the fight and walks the result screens.
const { test, expect, L, modal, modalBtn, okAlert, actionBtn, newGame, enter, placeParty, tapWorld, painted } = require('../fixtures');

/** A two-man human band (animals never talk and some back off) parked `dx` east of the party. */
function band(page, dx = 70) {
    return page.evaluate(dx => {
        const b = state.npcParties.find(n => n.type === 'bandit' && !(BAND_KINDS[n.band] || {}).beast);
        Object.assign(b, { size: 2, x: state.player.x + dx, y: state.player.y, speed: 0 });
        return { id: b.id, x: b.x, y: b.y };
    }, dx);
}

test('çeteye tıkla, savaş, kazan, sonuçları al, haritaya dön', async ({ page, isMobile }) => {
    await newGame(page);
    const b = await band(page);
    await tapWorld(page, b);

    // Encounter: sizes on show, a fight button (a small band may first offer to back off)
    await expect(modal(page)).toContainText(await L(page, '⚔️ Karşılaşma:'), { timeout: 20_000 });
    await expect(page.locator('#modal-close')).toBeHidden();   // no × out of an encounter (#70)
    await modal(page).locator('button[onclick*="Battle.start"]').click();

    await expect(page.locator('#battle-view')).toHaveClass(/\bactive\b/);
    await expect(page.locator('body')).toHaveClass(/\bin-battle\b/);
    await expect(page.locator('#top-bar')).toBeHidden();
    await expect(page.locator('#sidebar')).toBeHidden();
    // Surrender: a button on the bar with a mouse; on a phone the bar is gone and it sits in the
    // corner pause button's menu (2.1)
    if(isMobile) { await expect(page.locator('#btn-bpause')).toBeVisible(); await expect(page.locator('#btn-surrender')).toBeHidden(); }
    else await expect(page.locator('#btn-surrender')).toBeVisible();
    // The virtual sticks exist exactly where there is no mouse (#65)
    if(isMobile) await expect(page.locator('#tstick')).toBeVisible();
    else await expect(page.locator('#touch-ui')).toBeHidden();
    await expect.poll(() => page.evaluate(() => Battle.battleTime)).toBeGreaterThan(0.5);
    expect(await painted(page)).toBeGreaterThan(1);

    // End it: the last enemy falls, the victory screen follows with both tabs
    await page.evaluate(() => Battle.units.forEach(u => { if(!u.isPlayerTeam) u.hp = 0; }));
    await expect(modal(page).locator('#bres-tab-ozet')).toBeVisible();
    await modal(page).locator('#bres-tab-detay').click();
    await expect(modal(page).locator('#bres-pane-detay')).toBeVisible();
    await expect(modal(page).locator('#bres-pane-ozet')).toBeHidden();
    await modal(page).locator('#bres-tab-ozet').click();
    await (await modalBtn(page, 'Kazanımları Al ve İlerle')).click();

    await expect(page.locator('#map-view')).toHaveClass(/\bactive\b/);
    await expect(page.locator('body')).not.toHaveClass(/\bin-battle\b/);
    await expect(page.locator('#top-bar')).toBeVisible();
    await page.waitForFunction(() => Game._loopId && !Battle.active);
    expect(await page.evaluate(id => state.npcParties.some(n => n.id === id), b.id), 'the beaten band is gone').toBe(false);
});

test('köyde gönüllü topla, askerlerini gönder (otomatik savaş)', async ({ page }) => {
    await newGame(page);
    const village = await page.evaluate(() => {
        const v = LOCATIONS.find(l => l.type === 'village' && !Game.atWar(Game.playerFaction(), l.faction));
        v.volunteersAvailable = 10;
        state.player.money = 5000;
        return v.id;
    });
    await enter(page, village);
    await (await actionBtn(page, '🪖 Gönüllü Topla')).click();
    await modal(page).locator('button[onclick^="Game.doRecruit"]').click();
    const men = await page.evaluate(() => state.player.party.length);
    expect(await okAlert(page)).toContain(await L(page, '{0} gönüllü gruba katıldı!', men));
    await expect(page.locator('#settlement-view')).toHaveClass(/\bactive\b/);
    expect(men).toBeGreaterThanOrEqual(3);
    await expect(page.locator('#ui-party')).toContainText(`${men}/`);

    await (await actionBtn(page, '🚪 Ayrıl')).click();
    // Past day 14 a band no longer rolls to back off from a bigger party, so the fight is certain
    await page.evaluate(() => { state.time.day = 20; });
    const b = await band(page);
    await placeParty(page, b.x - 70, b.y);
    await tapWorld(page, b);
    await (await modalBtn(page, '🎖️ Askerlerini Gönder')).click();
    await expect(modal(page)).toContainText(await L(page, '🎖️ Askerlerin Halletti'));
    await (await modalBtn(page, 'Kazanımları Al ve İlerle')).click();
    await expect(page.locator('#map-view')).toHaveClass(/\bactive\b/);
    await page.waitForFunction(() => Game._loopId && !Battle.active);
});

// The way to the surrender question: the bar's button, or on a phone the pause menu's entry
async function askSurrender(page) {
    if(await page.evaluate(() => Game.isTouch())) {
        await page.locator('#btn-bpause').click();
        await (await modalBtn(page, '🏳️ Teslim Ol')).click();
    } else await page.locator('#btn-surrender').click();
}
test('teslim ol önce sorar: savaşa dönmek savaşı sürdürür, onay esarete düşürür', async ({ page }) => {
    await newGame(page);
    const b = await band(page);
    await tapWorld(page, b);
    await modal(page).locator('button[onclick*="Battle.start"]').click({ timeout: 20_000 });
    await expect(page.locator('#battle-view')).toHaveClass(/\bactive\b/);
    await expect.poll(() => page.evaluate(() => Battle.battleTime)).toBeGreaterThan(0.2);

    // A stray tap only asks — with the price named and the fight frozen meanwhile
    await askSurrender(page);
    await expect(modal(page)).toContainText(await L(page, 'Bütün birliğin dağılır ve esir düşersin.'));
    const t = await page.evaluate(() => Battle.battleTime);
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => Battle.battleTime), 'the fight waits for the answer').toBe(t);
    expect(await page.evaluate(() => Battle.active)).toBe(true);

    // "Back to the fight" is the default answer and resumes the clock
    await expect(await modalBtn(page, '⚔️ Savaşa Dön')).toHaveClass(/\bprimary\b/);
    await (await modalBtn(page, '⚔️ Savaşa Dön')).click();
    await expect(page.locator('#modal-overlay')).toBeHidden();
    await expect.poll(() => page.evaluate(() => Battle.battleTime)).toBeGreaterThan(t);

    // Esc (a keyboard's way out) resumes too
    if(!await page.evaluate(() => Game.isTouch())) {
        await page.locator('#btn-surrender').click();
        await expect(modal(page)).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('#modal-overlay')).toBeHidden();
        expect(await page.evaluate(() => Battle.paused)).toBe(false);
    }

    // Asked and answered yes: captivity
    await askSurrender(page);
    await (await modalBtn(page, '🏳️ Teslim Ol')).click();
    await expect(page.locator('#map-view')).toHaveClass(/\bactive\b/);
    const said = await L(page, 'Teslim oldun! Tüm birliğini kaybettin ve köle olarak sürükleneceksin.<br>-{0} Dinar', 0);
    await expect(modal(page)).toContainText(said.split('<br>')[0]);
    await modal(page).locator('[onclick="Game.alertOk()"]').click();
    await expect(page.locator('#prisoner-ui')).toBeVisible();
});
