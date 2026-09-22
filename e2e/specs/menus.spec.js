// Menus: every screen opens and has something on it, the keyboard map works, pause stops
// the clock, every menu entry is reachable on both layouts, and a save survives a reload.
const { test, expect, L, modal, modalBtn, okAlert, openView, newGame } = require('../fixtures');

/** Clicks a sidebar entry (desktop) or its "⋯ Daha" twin (phone) — both call the same `onclick`. */
async function openExtra(page, call) {
    const side = page.locator(`#sidebar .menu-btn[onclick="${call}"]`);
    if(await side.isVisible()) return side.click();
    await page.locator('#sidebar .sb-more').click();
    await modal(page).locator(`button[onclick^="${call}"]`).click();
}

test('ana ekranlar açılıyor ve içerikleri dolu', async ({ page }) => {
    await newGame(page);
    for(const [view, body] of [['character', '#char-stats'], ['party', '#party-list'],
                               ['inventory', '#inventory-content'], ['quests', '#quest-list'], ['map', '#map-canvas']]) {
        await openView(page, view);
        await expect(page.locator(body)).toBeVisible();
        if(view !== 'map') expect((await page.locator(body).innerText()).trim().length, view).toBeGreaterThan(20);
        // exactly one tab lit, and it is this one (on a phone "Görevler" lights "⋯ Daha")
        await expect(page.locator('#sidebar .menu-btn.active:visible')).toHaveCount(1);
    }
    await expect(page.locator('body')).toHaveClass(/\bview-map\b/);
});

test('klavye kısayolları ve Esc ile duraklatma', async ({ page, isMobile }) => {
    test.skip(isMobile, 'klavye yok');
    await newGame(page);
    for(const [key, view] of [['c', 'character'], ['p', 'party'], ['i', 'inventory'], ['q', 'quests'], ['m', 'map']]) {
        await page.keyboard.press(key);
        await expect(page.locator(`#${view}-view`)).toHaveClass(/\bactive\b/);
    }
    // Esc from a screen goes back to the map; Esc on the map pauses and opens the menu
    await page.keyboard.press('c');
    await page.keyboard.press('Escape');
    await expect(page.locator('#map-view')).toHaveClass(/\bactive\b/);
    await page.keyboard.press('Escape');
    await expect(modal(page)).toContainText(await L(page, '⏸ Duraklatıldı'));
    await expect(page.locator('#pause-bar')).toBeVisible();
    expect(await page.evaluate(() => Game.isPaused())).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-overlay')).toBeHidden();
    await expect(page.locator('#pause-bar')).toBeHidden();
    expect(await page.evaluate(() => Game.isPaused())).toBe(false);
    // K: diplomacy
    await page.keyboard.press('k');
    await expect(modal(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-overlay')).toBeHidden();
});

test('duraklatma menüsü: ana menüye dönüş onay ister', async ({ page }) => {
    await newGame(page);
    await page.evaluate(() => Game.togglePause());   // the phone has no Esc; the path under it is the same
    await (await modalBtn(page, 'Ana Menü')).click();
    await expect(modal(page)).toContainText(await L(page, 'Son kayıttan sonraki ilerleme kaybolur. Ana menüye dönülsün mü?'));
    await (await modalBtn(page, 'Hayır, kal')).click();
    await expect(modal(page)).toContainText(await L(page, '⏸ Duraklatıldı'));
    await (await modalBtn(page, 'Ana Menü')).click();
    await (await modalBtn(page, 'Evet, dön')).click();
    await expect(page.locator('#start-screen')).toHaveClass(/\bactive\b/);
});

test('başarımlar ve topraklarım her cihazda açılabiliyor', async ({ page }) => {
    await newGame(page);
    const total = await page.evaluate(() => ACHIEVEMENTS.length);
    await openExtra(page, 'Game.showAchievements()');
    await expect(modal(page).locator('h3').first()).toContainText(`(0/${total})`);
    await expect(modal(page).locator('h3 + div > div')).toHaveCount(total);
    await (await modalBtn(page, 'Kapat')).click();

    await openExtra(page, 'Game.showFiefs()');
    await expect(modal(page).locator('h3').first()).toContainText(await L(page, '🏰 Topraklarım'));
    await page.evaluate(() => Game.closeModal());
});

test('ayarlar: ses aç/kapa ve oyun içinde dil değiştirme', async ({ page, lang }) => {
    await newGame(page);
    await openExtra(page, 'Game.showSettings()');
    await expect(modal(page).locator('#settings-panel')).toBeVisible();

    // Switching language in-game redraws the settings and the screen underneath
    const other = lang === 'en' ? 'id' : 'en';
    await modal(page).locator(`button[onclick="Game.setLang('${other}')"]`).click();
    await expect(page.locator('html')).toHaveAttribute('lang', other);
    await expect(modal(page).locator(`button[onclick="Game.setLang('${other}')"]`)).toHaveClass(/\bprimary\b/);
    await expect(page.locator('#sidebar .menu-btn[data-view="map"] .mb-lbl')).toHaveText(await L(page, 'Harita'));
    await modal(page).locator(`button[onclick="Game.setLang('${lang}')"]`).click();
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await page.evaluate(() => Game.closeModal());

    // Mute: the label and the stored setting follow the button
    const before = await page.evaluate(() => Game.opt('muted'));
    await openExtra(page, 'Game.toggleMute()');
    await page.evaluate(() => Game.closeModal());   // the phone's "⋯ Daha" sheet redraws itself open
    expect(await page.evaluate(() => Game.opt('muted'))).toBe(!before);
    await expect(page.locator('#mute-lbl')).toHaveText(await L(page, before ? 'Ses Açık' : 'Ses Kapalı'));
});

test('kaydet, sayfayı yenile, kayıttan devam et', async ({ page }) => {
    await newGame(page, 'Kayıtçı');
    await page.evaluate(() => { state.player.money = 4321; state.time.day = 7; Game.updateTopBar(); });
    await openExtra(page, 'Save.open()');
    await modal(page).locator(`button[onclick="Save.save('1')"]`).click();
    const slot = await page.evaluate(() => Save.slotName('1'));
    await expect(modal(page)).toContainText(await L(page, '✅ {0} kaydedildi.', slot));
    await expect(modal(page)).toContainText('Kayıtçı');

    await page.reload();
    await expect(page.locator('#start-screen')).toHaveClass(/\bactive\b/);
    await page.locator('.start-actions button[onclick="Save.continueGame()"]').click();
    expect(await okAlert(page)).toContain(await L(page, 'Kayıt yüklendi ({0}). Gün {1}.', slot, 7));
    await expect(page.locator('#map-view')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#ui-money')).toHaveText('4321');
    expect(await page.evaluate(() => state.player.name)).toBe('Kayıtçı');
    await page.waitForFunction(() => Game._loopId);
});
