// Translation sweep: walks the screens a new player sees (creation, map, every menu, a town,
// a village, a castle, a fight and its end) on the EN/ID projects and fails on any Turkish
// source text left on show. The fixture already catches a key missing from the dictionary and
// Turkish-only letters; this catches the rest — a string that never went through T() at all
// ("Kale", "Kapat"), in text, a tooltip (`title`), a screen-reader label (`aria-label`) or a
// placeholder, visible or waiting in a hidden HUD tooltip.
const { test, expect, modal, modalBtn, openView, enter, quietCity, tapWorld } = require('../fixtures');

/** Every piece of text on the page that is exactly a dictionary key whose translation differs. */
function untranslated(page, all) {
    return page.evaluate(all => {
        const d = I18N.dicts[I18N.lang];
        if(!d) return [];
        const norm = s => s.replace(/\{\d\}/g, '#').replace(/[\p{Extended_Pictographic}‍️]/gu, '')
            .replace(/\d+([.,]\d+)?/g, '#').replace(/\s+/g, ' ').trim();
        const keys = new Set();
        for(const k in d) { const n = norm(k); if(n.length > 2 && norm(d[k]) !== n) keys.add(n); }
        const shown = el => {
            for(let e = el; e && e !== document.body; e = e.parentElement) {
                const cs = getComputedStyle(e);
                if(cs.display === 'none' || cs.visibility === 'hidden') return false;
            }
            return true;
        };
        const out = new Set(), check = (s, where) => { if(keys.has(norm(s))) out.add(`${where}: "${s.trim()}"`); };
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for(let n = w.nextNode(); n; n = w.nextNode()) {
            const p = n.parentElement;
            if(p && !['SCRIPT', 'STYLE'].includes(p.tagName) && (all || shown(p))) check(n.nodeValue, 'text');
        }
        document.querySelectorAll('[title], [aria-label], [placeholder]').forEach(el => {
            if(all || shown(el)) for(const a of ['title', 'aria-label', 'placeholder']) if(el.getAttribute(a)) check(el.getAttribute(a), a);
        });
        return [...out];
    }, all);
}

test('çeviri taraması: İngilizce/Endonezce ekranlarda Türkçe kaynak metin kalmaz', async ({ page }, info) => {
    test.skip(info.project.use.lang === 'tr', 'Turkish is the source language');
    const found = [];
    const look = async (where, all = false) => (await untranslated(page, all)).forEach(x => found.push(`[${where}] ${x}`));
    const closeModal = () => page.evaluate(() => Game.closeModal());

    // Character creation, step by step
    await page.goto('/');
    await look('başlangıç');
    await page.locator('#char-name').fill('Deneme');
    await page.locator('#start-btn').click();
    const steps = await page.evaluate(() => BACKGROUND.length);
    for(let i = 0; i < steps; i++) {
        await look(`yaratma ${i + 1}`);
        await modal(page).locator('[onclick^="Game.pickCreation"]').first().click();
    }
    await look('sancak');
    await modal(page).locator('[onclick^="Game.pickBanner"]').first().click();
    await look('zorluk');
    await modal(page).locator('[onclick="Game.diffStepDone()"]').click();
    await look('özet');
    await modal(page).locator('[onclick="Game.finishCreation()"]').click();
    await page.waitForFunction(() => Game._loopId);

    // The map, its hidden HUD tooltips too, then every menu
    await look('harita');
    await look('harita ipuçları', true);
    for(const v of ['character', 'party', 'inventory', 'quests']) { await openView(page, v); await look(v); }
    for(const f of ['showMoreMenu', 'showSettings', 'showKeys', 'showDiplomacy', 'showAchievements', 'openAmbitions']) {
        await page.evaluate(f => Game[f](), f);
        await look(f);
        await closeModal();
    }

    // A fight and its result screen
    await openView(page, 'map');
    await page.evaluate(() => { state.player.party = [1, 2, 3].map(i => ({ id: 'tr' + i, name: 'Svadya Avcısı', level: 1 })); });
    const band = await page.evaluate(() => {
        const b = state.npcParties.find(n => n.type === 'bandit' && !(BAND_KINDS[n.band] || {}).beast);
        Object.assign(b, { size: 2, x: state.player.x + 70, y: state.player.y, speed: 0 });
        return { x: b.x, y: b.y };
    });
    await tapWorld(page, band);
    await look('karşılaşma');
    await modal(page).locator('button[onclick*="Battle.start"]').click({ timeout: 20_000 });
    await expect(page.locator('#battle-view')).toHaveClass(/\bactive\b/);
    await page.waitForTimeout(1500);
    await look('savaş');
    await page.evaluate(() => Battle.units.filter(u => !u.isPlayerTeam).forEach(u => { u.hp = 0; }));
    await expect(modal(page).locator('#bres-tab-ozet')).toBeVisible();
    await look('savaş sonu');
    await modal(page).locator('#bres-tab-detay').click();
    await look('savaş sonu ayrıntı');
    await modal(page).locator('#bres-tab-ozet').click();
    await (await modalBtn(page, 'Kazanımları Al ve İlerle')).click();
    await page.waitForFunction(() => Game._loopId && !Battle.active);

    // A town and its three busiest rooms, a village, a castle
    await openView(page, 'map');
    const city = await quietCity(page);
    await enter(page, city);
    await look('şehir');
    for(const f of ['openMarket', 'openTavern', 'openArena']) {
        await page.evaluate(([f, id]) => Game[f](LOCATIONS.find(l => l.id === id)), [f, city]);
        await look(f);
        await closeModal();
    }
    for(const type of ['village', 'castle']) {
        const id = await page.evaluate(t => LOCATIONS.find(l => l.type === t && !Game.atWar(Game.playerFaction(), l.faction)).id, type);
        await page.evaluate(() => Game.showScreen('main-ui'));
        await enter(page, id);
        await look(type);
    }

    expect(found, 'Turkish source text on a translated screen').toEqual([]);
});
