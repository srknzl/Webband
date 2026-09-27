// Captivity (#133): the prisoner panel on the map, the escape plan that ripens while time runs,
// one try a day, and the ransom when the days run out. World setup only: the surrender itself
// is battle.spec's; here it starts from the game's own `surrender`, and the dice are settled by
// setting the odds the panel shows, not by patching the roll.
const { test, expect, L, modal, modalBtn, okAlert, newGame } = require('../fixtures');

async function captured(page) {
    await newGame(page);
    const band = await page.evaluate(() => {
        const b = state.npcParties.find(n => n.type === 'bandit' && !(BAND_KINDS[n.band] || {}).beast);
        state.player.money = 1000;
        Game.surrender(b.id, b.name);
        return { id: b.id, name: T(b.name) };
    });
    await okAlert(page);
    await expect(page.locator('#prisoner-ui')).toBeVisible();
    await expect(page.locator('#prisoner-info')).toContainText(band.name);
    return band;
}

test('captivity: an escape plan ripens with time and a good try walks you free', async ({ page }) => {
    await captured(page);
    expect(await page.evaluate(() => state.player.status)).toBe('prisoner');
    await expect(page.locator('#btn-escape-plan')).toHaveText(await L(page, 'Kaçış Planı Yap'));

    // Planning: the button says so, and the odds climb while the map clock runs
    await page.locator('#btn-escape-plan').click();
    await expect(page.locator('#btn-escape-plan')).toHaveText(await L(page, 'Plan Yapılıyor... (Vazgeç)'));
    await expect.poll(() => page.evaluate(() => state.player.prisoner.escapeChance), { timeout: 15_000 }).toBeGreaterThan(5);
    await expect(page.locator('#ui-escape-chance')).not.toHaveText(await page.evaluate(() => Game.pct(0)));

    // A plan ripe to certainty: the try succeeds, the chains come off
    await page.evaluate(() => { state.player.prisoner.escapeChance = 100; });
    await page.locator('#btn-escape-attempt').click();
    expect(await okAlert(page)).toContain(await L(page, 'Harika! Gardiyanların dalgınlığından yararlanarak başarıyla kaçtın!'));
    await expect(page.locator('#prisoner-ui')).toBeHidden();
    expect(await page.evaluate(() => [state.player.prisoner, state.player.status])).toEqual([null, 'idle']);
});

test('captivity: a failed try costs the plan, and there is one try a day', async ({ page }) => {
    await captured(page);
    // No plan, odds of nothing: the try is caught
    await page.evaluate(() => { state.player.prisoner.escapeChance = 0; state.player.prisoner.isPlanning = false; Game.renderPrisonerUI(); });
    await page.locator('#btn-escape-attempt').click();
    expect(await okAlert(page)).toContain(await L(page, 'Kahretsin! Kaçış girişimin fark edildi. Tüm planların suya düştü ve ceza aldın!'));
    await expect(page.locator('#btn-escape-plan')).toHaveText(await L(page, 'Kaçış Planı Yap'));
    await page.locator('#btn-escape-attempt').click();
    expect(await okAlert(page)).toContain(await L(page, 'Günde sadece 1 kez kaçmayı deneyebilirsin! Plan yapmaya devam et veya yarını bekle.'));
    await expect(page.locator('#prisoner-ui')).toBeVisible();
});

test('captivity: when the days run out the captors ask a ransom, and paying it frees you', async ({ page }) => {
    await captured(page);
    // The last day ends with the dice against a lucky slip-away (40 %): the ransom is asked
    await page.evaluate(() => {
        state.player.prisoner.daysLeft = 1;
        const r = Math.random; Math.random = () => 0.9;
        Game.advanceTime(24 - state.time.hour + 0.1);
        Math.random = r;
    });
    await expect(modal(page)).toContainText(await L(page, 'Fidye İsteği'));
    const money = await page.evaluate(() => state.player.money);
    await (await modalBtn(page, 'Öde ve Kurtul')).click();
    const paid = money - await page.evaluate(() => state.player.money);
    expect(paid).toBeGreaterThan(0);
    expect(await okAlert(page)).toContain(await L(page, '{0} Dinar ödedin. Zincirlerin çözüldü.', paid));
    await expect(page.locator('#prisoner-ui')).toBeHidden();
    expect(await page.evaluate(() => state.player.status)).toBe('idle');
});
