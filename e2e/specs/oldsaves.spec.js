// A save from an old release, loaded the way the import window loads one, then everything built
// since walked into: the main screens, a town's newer cards (the forge 2.5.0, the carpenter and
// the kitchen 2.10.0), a lair's card (2.2.0, the hideouts 2.9.0) and a day passing. A returning
// player's world is missing every field added after it was saved; the fixture fails on the first
// error any of it throws. The saves were played by that release's own tools (tools/saves/).
const fs = require('fs'), path = require('path');
const { test, expect, modal, okAlert, openView, enter, actionBtn, quietCity } = require('../fixtures');

const DIR = path.join(__dirname, '..', '..', 'tools', 'saves');

for(const file of fs.readdirSync(DIR).filter(f => f.endsWith('.json'))) test(`a ${file.replace('.json', '')} save loads and plays`, async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#start-btn')).toBeVisible();
    await page.evaluate(txt => { Game.setOpt('muted', true); Save.importText(txt); }, fs.readFileSync(path.join(DIR, file), 'utf8'));
    await okAlert(page);
    await expect(page.locator('#main-ui')).toHaveClass(/\bactive\b/);

    for(const view of ['character', 'party', 'inventory', 'quests', 'map']) await openView(page, view);

    await enter(page, await quietCity(page));
    let opened = 0;
    for(const card of ['🔨 Demirhane', '🪚 Marangoz Atölyesi', '🍲 Han Mutfağı']) {
        const btn = await actionBtn(page, card);
        if(!await btn.count()) continue;
        await btn.click();
        await expect(modal(page)).toBeVisible();
        await page.evaluate(() => Game.closeModal());
        opened++;
    }
    expect(opened, 'the town showed none of the newer cards').toBeGreaterThan(0);
    await page.evaluate(() => { Game.closeModal(); Game.showScreen('map'); const s = Game.lairs()[0]; s.seen = true; Game.enterSite(s); });
    await expect(modal(page).locator('.lair-brief')).toBeVisible();
    await page.evaluate(() => { Game.closeModal(); Game.advanceTime(24); Game.closeModal(); });
    expect(await page.evaluate(() => Debug.invariants())).toEqual([]);
});
