// First launch and character creation: the path every new player walks.
const { test, expect, L, modal, newGame } = require('../fixtures');

test.describe('ilk açılış', () => {
    test.use({ storedLang: null });

    test('dil sorulur, seçim hatırlanır', async ({ page, lang }) => {
        await page.goto('/');
        const ask = page.locator('#lang-ask');
        await expect(ask).toBeVisible();
        await expect(page.locator('#lang-ask-row .lang-btn')).toHaveCount(3);
        const i = ['tr', 'en', 'id'].indexOf(lang);
        await page.locator('#lang-ask-row .lang-btn').nth(i).click();
        await expect(ask).toBeHidden();
        await expect(page.locator('html')).toHaveAttribute('lang', lang);
        await expect(page.locator('#start-btn')).toHaveText(await L(page, 'Maceraya Başla'));

        await page.reload();
        await expect(page.locator('#start-btn')).toBeVisible();
        await expect(ask).toBeHidden();
        await expect(page.locator('#lang-row .lang-btn.on')).toHaveCount(1);
        await expect(page.locator('#lang-row .lang-btn').nth(i)).toHaveClass(/\bon\b/);
    });
});

test('başlangıç ekranı sürümü gösterir', async ({ page }) => {
    await page.goto('/');
    const v = await page.evaluate(() => VERSION.no);
    await expect(page.locator('#ver-tag')).toContainText(v);
});

test('karakter sihirbazı haritaya indirir', async ({ page }) => {
    await page.goto('/');
    await page.locator('#char-name').fill('Deneme');
    await page.locator('#start-btn').click();

    // Each background question: a step counter, a set of choices, and Back from step 2 on
    const steps = await page.evaluate(() => BACKGROUND.length);
    for(let i = 0; i < steps; i++) {
        await expect(modal(page)).toContainText(await L(page, 'Adım {0}/{1} — {2}', i + 1, steps + 2, '').then(s => s.trim()));
        const picks = modal(page).locator('[onclick^="Game.pickCreation"]');
        expect(await picks.count()).toBeGreaterThan(1);
        await picks.first().click();
    }
    await modal(page).locator('[onclick^="Game.pickBanner"]').first().click();
    // Settings step: a difficulty pick is highlighted and survives the lite-mode toggle
    await modal(page).locator('[onclick^="Game.pickDiff"]').last().click();
    await expect(modal(page).locator('[onclick^="Game.pickDiff"]').last()).toHaveClass(/\bprimary\b/);
    await modal(page).locator('[onclick="Game.diffStepDone()"]').click();

    // Summary names the character and offers Back
    await expect(modal(page).locator('h3').first()).toHaveText('Deneme');
    await modal(page).locator('[onclick="Game.creationBack()"]').click();
    await expect(modal(page).locator('[onclick="Game.diffStepDone()"]')).toBeVisible();
    await modal(page).locator('[onclick="Game.diffStepDone()"]').click();
    await modal(page).locator('[onclick="Game.finishCreation()"]').click();

    await expect(page.locator('#main-ui')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#map-view')).toHaveClass(/\bactive\b/);
    await expect(page.locator('body')).toHaveClass(/\bview-map\b/);   // the map's own layout from the first frame
    await expect(page.locator('#modal-overlay')).toHaveClass(/\bhidden\b/);
    await expect(page.locator('#ui-day')).toContainText('1');
    const hard = await page.evaluate(() => Game.opt('difficulty'));
    expect(hard).toBe(await page.evaluate(() => Object.keys(Game.DIFFS).pop()));
});

test('harita çiziliyor ve oyun döngüsü dönüyor', async ({ page }) => {
    await newGame(page);
    const canvas = page.locator('#map-canvas');
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(200);
    expect(box.height).toBeGreaterThan(200);
    // A canvas that was never drawn is one flat colour. Lite mode (phones) paints flat plains,
    // so a handful of colours is already a healthy map.
    const colours = await page.evaluate(() => {
        const c = document.getElementById('map-canvas'), ctx = c.getContext('2d');
        const seen = new Set();
        for(let i = 1; i < 10; i++) for(let j = 1; j < 10; j++) {
            const d = ctx.getImageData(Math.floor(c.width * i / 10), Math.floor(c.height * j / 10), 1, 1).data;
            seen.add(d.join(','));
        }
        return seen.size;
    });
    expect(colours).toBeGreaterThan(1);
    await expect.poll(() => page.evaluate(() => Debug.frames.length)).toBeGreaterThan(5);
});
