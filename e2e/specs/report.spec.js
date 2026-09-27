// 🐞 Hata Bildir: the form opens from the menu with a screenshot of the game already in it, takes
// the player's own picture, and posts it all to the site's endpoint — mocked here, the endpoint
// has its own tests in the site's repo. When the endpoint isn't there, the prefilled GitHub page.
const { test, expect, L, modal, modalBtn, newGame } = require('../fixtures');

// A 1×1 PNG, as a player's gallery picture
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function openForm(page) {
    if(await page.evaluate(() => Game.isTouch())) await page.locator('#sidebar .sb-more').click();
    else await page.keyboard.press('Escape');
    await (await modalBtn(page, 'Hata Bildir')).click();
    await expect(modal(page).locator('#bug-text')).toBeVisible();
}

test('bug report: screenshot, an extra picture, sent, and the issue link comes back', async ({ page }) => {
    await newGame(page);
    let sent = null;
    await page.route('**/api/webband/report', async r => {
        sent = r.request().postDataJSON();
        await r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'x1', url: 'https://github.com/srknzl/Webband/issues/999' }) });
    });
    await openForm(page);
    await expect(modal(page).locator('img')).toHaveCount(1);          // the map, captured on opening

    // too short: said so, nothing sent
    await modal(page).locator('#bug-text').fill('bug');
    await (await modalBtn(page, '📨 Gönder')).click();
    await expect(modal(page).locator('#bug-msg')).toHaveText(await L(page, 'Bir iki cümleyle ne olduğunu yaz.'));
    expect(sent).toBeNull();

    await modal(page).locator('#bug-text').fill('The caravan walked through the river twice.');
    await modal(page).locator('#bug-file').setInputFiles({ name: 'shot.png', mimeType: 'image/png', buffer: PNG });
    await expect(modal(page).locator('img')).toHaveCount(2);
    await expect(modal(page).locator('#bug-text')).toHaveValue('The caravan walked through the river twice.');   // kept across the redraw
    await (await modalBtn(page, '📨 Gönder')).click();
    await expect(modal(page)).toContainText('srknzl/Webband/issues/999');
    expect(sent.text).toBe('The caravan walked through the river twice.');
    expect(sent.images).toHaveLength(2);
    sent.images.forEach(d => expect(d).toMatch(/^data:image\/jpeg;base64,/));
    expect(sent.version).toBe(await page.evaluate(() => VERSION.no));
    expect(JSON.parse(sent.report).version).toBeTruthy();
});

test('bug report: with no endpoint the prefilled GitHub page is offered', async ({ page }) => {
    await newGame(page);
    page.expectHttpError(/\/api\/webband\/report/);
    await page.route('**/api/webband/report', r => r.fulfill({ status: 404, body: 'not here' }));
    await openForm(page);
    await modal(page).locator('#bug-text').fill('The tavern never sells me a poem.');
    await (await modalBtn(page, '📨 Gönder')).click();
    const link = modal(page).locator('a[href^="https://github.com/srknzl/Webband/issues/new"]');
    await expect(link).toBeVisible();
    expect(decodeURIComponent(await link.getAttribute('href'))).toContain('The tavern never sells me a poem.');
});
