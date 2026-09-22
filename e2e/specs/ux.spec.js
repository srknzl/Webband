// Layout audit on every screen and window a player reaches in the first hour, on both the
// desktop and the phone layout: nothing spills sideways, windows fit the screen, panels do not
// sit on each other, button labels fit their buttons, and on a phone every control is big
// enough for a thumb.
const { test, expect, L, modal, modalBtn, actionBtn, openView, newGame, enter, quietCity } = require('../fixtures');

/** Everything wrong with the layout on screen right now, as readable lines. */
function audit(page, where) {
    return page.evaluate(where => {
        const out = [], W = innerWidth, H = innerHeight;
        const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && el.offsetParent !== null; };
        const name = el => (el.id ? '#' + el.id : el.tagName.toLowerCase()) + ' "' + (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30) + '"';
        const de = document.scrollingElement || document.documentElement;
        if(de.scrollWidth > W + 1) out.push(`page scrolls sideways: ${de.scrollWidth}px wide on a ${W}px screen`);

        const mc = document.getElementById('modal-content'), open = !document.getElementById('modal-overlay').classList.contains('hidden');
        if(open) {
            const r = mc.getBoundingClientRect();
            if(r.left < -1 || r.right > W + 1) out.push(`window spills sideways: ${Math.round(r.left)}..${Math.round(r.right)} on ${W}px`);
            if(r.top < -1 || r.bottom > H + 1) out.push(`window taller than the screen: ${Math.round(r.top)}..${Math.round(r.bottom)} on ${H}px`);
            if(mc.scrollWidth > mc.clientWidth + 1) out.push(`window content scrolls sideways (${mc.scrollWidth} > ${mc.clientWidth})`);
        }
        // Panels that share the screen must not overlap (only the map floats its chrome)
        const panels = ['top-bar', 'sidebar', 'map-hud'].map(id => document.getElementById(id)).filter(e => e && vis(e));
        for(let i = 0; i < panels.length; i++) for(let j = i + 1; j < panels.length; j++) {
            const a = panels[i].getBoundingClientRect(), b = panels[j].getBoundingClientRect();
            const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if(ox > 2 && oy > 2) out.push(`#${panels[i].id} overlaps #${panels[j].id} by ${Math.round(ox)}×${Math.round(oy)}px`);
        }
        // Controls the player can see (the modal's own when one is open — the rest is behind it)
        const scope = open ? mc : document.body;
        const touch = matchMedia('(pointer: coarse)').matches;
        scope.querySelectorAll('button, .btn, input[type=range]').forEach(el => {
            if(!vis(el) || el.disabled) return;
            const r = el.getBoundingClientRect();
            // Clipped: out of the screen and out of reach of any scroll container
            if(r.right < 0 || r.left > W) return;
            if(el.tagName === 'BUTTON' && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'auto')
                out.push(`label does not fit its button: ${name(el)} (${el.scrollWidth} > ${el.clientWidth})`);
            if(touch && Math.min(r.width, r.height) < 32 && el.id !== 'modal-close')
                out.push(`too small for a thumb: ${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}px`);
        });
        return out.map(x => `[${where}] ${x}`);
    }, where);
}

test('yerleşim denetimi: bütün ekranlar ve pencereler', async ({ page, isMobile }) => {
    const found = [];
    const look = async where => found.push(...await audit(page, where));

    await page.goto('/');
    await look('başlangıç');
    await page.locator('#start-btn').click();
    await look('sihirbaz');
    await page.evaluate(() => Game.closeModal());
    await newGame(page);
    await look('harita');
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
