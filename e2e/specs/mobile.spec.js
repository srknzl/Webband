// Every window the game opens, one level deep, audited for layout (fixtures' `audit`): nothing
// slides sideways, no scroll box sits inside another, windows fit the screen, labels fit their
// buttons, thumbs can hit the controls. The walk is not a script: on each root screen it presses
// every visible button whose handler only opens something (OPENS below) and every settlement
// action that opens a window, audits what came up, and goes back to the root. A new window is
// covered the day it gets a button. Plus the phone's own gestures: a swipe on a screen that has
// nothing to scroll must not move it (the start screen slid 22px sideways under the thumb).
const { test, expect, L, modal, openView, newGame, enter, quietCity, audit } = require('../fixtures');

// Close every window, the queued notices behind the top one too
const closeAll = page => page.evaluate(() => {
    for(let i = 0; i < 10 && !document.getElementById('modal-overlay').classList.contains('hidden'); i++) Game.closeModal();
});

// Handlers that open a window or a view and change nothing in the world
const OPENS = /^\s*(Game\.(show\w+|open\w+|pauseMenu|envoyMenu|grantFiefMenu|guildPrices|setMarketCategory|mktMode|askWait|showLore)|Nobles\.(talk|courtMenu|spouseMenu|rivalMenu|poemMenu|giftMenu|complimentMenu|askWhereMenu)|Quests\.offerMenu|Save\.open|Debug\.bug)\(/;
// ...except these: the victory screen ends the game, the install prompt is the browser's
const NOT = /showVictory|showInstallBtn|showMapSurface/;
// Settlement actions that open a window (their handlers are closures, so they go by label)
const SETTLEMENT_WINDOWS = ['🍺 Hana Gir', '🛒 Pazara Git', '👑 Lordlar Salonuna Git', '🤺 Arenada Dövüş', '⛓️ Köle Tüccarı',
    '🛒 Erzak Al', '🧓 Köy Yaşlısıyla Konuş', '🛡️ Garnizon ({0} asker)', '📦 Depo ({0} kalem)'];

/**
 * From `root()`, press each window-opening button once (at most `perFn` per handler name: forty
 * lords' talk windows are one layout) and audit each window it opens.
 */
const seen = [];
async function sweep(page, where, root, found, done) {
    await root();
    if(!done.has('root ' + where)) {
        done.set('root ' + where, 1);
        found.push(...await audit(page, where));
        seen.push(where);
    }
    const calls = await page.evaluate(({ opens, not }) => {
        const O = new RegExp(opens), N = new RegExp(not);
        const open = !document.getElementById('modal-overlay').classList.contains('hidden');
        const scope = open ? document.getElementById('modal-content') : document.body;
        return [...new Set([...scope.querySelectorAll('[onclick]')]
            .filter(b => b.offsetParent && !b.disabled && O.test(b.getAttribute('onclick')) && !N.test(b.getAttribute('onclick')))
            .map(b => b.getAttribute('onclick')))];
    }, { opens: OPENS.source, not: NOT.source });
    for(const call of calls) {
        const fn = call.match(OPENS)[0];
        if((done.get(fn) || 0) >= 4 || done.has(call)) continue;
        done.set(fn, (done.get(fn) || 0) + 1); done.set(call, 1);
        await root();
        // tag the button this call belongs to, then press it like a player would
        const ok = await page.evaluate(c => {
            document.querySelectorAll('[data-sweep]').forEach(e => delete e.dataset.sweep);
            const open = !document.getElementById('modal-overlay').classList.contains('hidden');
            const scope = open ? document.getElementById('modal-content') : document.body;
            const b = [...scope.querySelectorAll('[onclick]')].find(e => e.offsetParent && e.getAttribute('onclick') === c);
            if(b) b.dataset.sweep = '1';
            return !!b;
        }, call);
        if(!ok) continue;
        await page.locator('[data-sweep="1"]').click({ timeout: 5000 });
        await page.waitForTimeout(120);
        found.push(...await audit(page, `${where} → ${call.slice(0, 60)}`));
        seen.push(`${where} → ${call.slice(0, 60)}`);
    }
}

test('her pencere, bir kat derine: kayan ekran, iç içe kaydırma, taşan pencere yok', async ({ page, lang }) => {
    test.skip(lang === 'xx', 'the pseudo-locale checks where text comes from, not how wide it is');
    test.setTimeout(240_000);
    const found = [], done = new Map();

    // Before a game: the start screen and its windows (the lords, the kingdoms, the saves)
    const start = async () => {
        if(!(await page.locator('#start-screen.active').count())) await page.goto('/');
        await closeAll(page);
    };
    await page.goto('/');
    found.push(...await audit(page, 'başlangıç'));
    await sweep(page, 'başlangıç', start, found, done);

    await newGame(page);
    const map = async () => { await closeAll(page); await page.evaluate(() => Game.showScreen('map')); };
    await sweep(page, 'harita', map, found, done);
    if(await page.locator('#sidebar .sb-more').isVisible())
        await sweep(page, 'daha', async () => { await map(); await page.locator('#sidebar .sb-more').click(); }, found, done);
    // Mid-game: a big mixed party with a companion, prisoners, a full bag, quests on the go —
    // the long lists are where a scroll box inside a scrolling view would hide
    await page.evaluate(() => {
        const names = Object.keys(TROOP_TYPES);
        state.player.party = Array.from({ length: 40 }, (_, i) => ({ id: 'mw' + i, name: names[(i * 7) % names.length],
            level: 1 + (i * 5) % 30, xp: 0, xpNext: 8, wounded: i % 6 === 5 ? 2 : 0 }));
        state.player.party.push(Object.assign({ id: 'cmp', isCompanion: true, level: 8, xp: 0, xpNext: 99 },
            { name: COMPANIONS[0].name, companionId: COMPANIONS[0].id }));
        state.player.prisoners = Array.from({ length: 12 }, (_, i) => ({ id: 'pw' + i, name: names[(i * 3) % names.length], level: 5 + i }));
        const lord = LORDS[3];
        state.player.prisoners.push({ id: 'pn', name: lord.name, noble: true, lordId: lord.id, faction: lord.faction, ransom: 12500 });
        Object.values(ITEMS).slice(0, 40).forEach(it => state.player.inventory.push(Object.assign({}, it, { qty: 2 })));
        LORDS.slice(0, 4).forEach(l => { try {
            const id = Object.keys(QUESTS).find(k => QUESTS[k].givers && QUESTS[k].givers.includes(l.personality) && !Quests.has(k));
            if(id) state.player.quests.push(Quests.make(id, l.id));
        } catch(_) {} });
    });
    for(const v of ['character', 'party', 'inventory', 'quests'])
        await sweep(page, v, async () => { await map(); await openView(page, v); }, found, done);

    // A town: each action that opens a window, and one level into each of those
    const city = await quietCity(page);
    // held by the player, so the garrison and the storehouse are there too
    await page.evaluate(id => { state.player.money = 5000; LOCATIONS.find(l => l.id === id).owner = 'player'; }, city);
    const town = async () => {
        await closeAll(page);
        if(!(await page.locator('#settlement-view.active').count())) await enter(page, city);
    };
    await town();
    found.push(...await audit(page, 'şehir'));
    // a label with a count ("🛡️ Garnizon (3 asker)") is matched by the part before the count
    const label = async key => (await L(page, key, '§')).split('§')[0].trim();
    const places = async (where, go) => {
        for(const key of SETTLEMENT_WINDOWS) {
            const btn = page.locator('#settlement-actions button', { hasText: await label(key) });
            await go();
            if(!(await btn.count())) continue;
            await sweep(page, `${where} → ${key}`, async () => { await go(); await btn.first().click(); }, found, done);
        }
    };
    await places('şehir', town);
    // A village: the elder, the volunteers, the provisions
    const village = await page.evaluate(() => {
        const v = LOCATIONS.find(l => l.type === 'village' && !state.npcParties.some(n => Game.dist(n, l) < 300)) || LOCATIONS.find(l => l.type === 'village');
        return v.id;
    });
    const home = async () => {
        await closeAll(page);
        if(!(await page.locator('#settlement-view.active').count())
           || !(await page.evaluate(id => Game._enteredLoc === id, village))) await enter(page, village);
    };
    await home();
    await sweep(page, 'köy', home, found, done);
    await places('köy', home);
    // Esc on the map: the pause menu
    await map();
    await page.evaluate(() => Game.pauseMenu());
    found.push(...await audit(page, 'duraklatma'));
    seen.push('duraklatma');
    await sweep(page, 'duraklatma', async () => { await map(); await page.evaluate(() => Game.pauseMenu()); }, found, done);

    // A lord's own window and what it opens (the talk window is reached from the hall above,
    // this reaches its sub-menus)
    const lord = await page.evaluate(() => LORDS[0].id);
    await sweep(page, 'lord', async () => { await closeAll(page); await page.evaluate(id => Nobles.talk(id), lord); }, found, done);

    // the walk itself must have walked: a renamed handler would silently empty it
    console.log(seen.join('\n'));
    expect(seen.length, seen.join('\n')).toBeGreaterThan(25);
    expect(found).toEqual([]);
});

// The phone's gestures: a finger dragged across a screen with nothing to scroll leaves it where
// it was. The start screen scrolled 22px sideways (its title's glow) and the page could slide.
test('telefonda sürüklemek ekranı kaydırmıyor', async ({ page, isMobile, browserName }) => {
    test.skip(!isMobile, 'touch gestures are the phone layout\'s');
    const cdp = await page.context().newCDPSession(page);
    const swipe = (x, y, dx, dy) => cdp.send('Input.synthesizeScrollGesture',
        { x, y, xDistance: dx, yDistance: dy, gestureSourceType: 'touch', speed: 1200 });
    const moved = () => page.evaluate(() => {
        const out = [], de = document.scrollingElement;
        if(de.scrollLeft || de.scrollTop) out.push(`page ${de.scrollLeft},${de.scrollTop}`);
        if(visualViewport.offsetLeft || visualViewport.offsetTop) out.push(`viewport ${visualViewport.offsetLeft},${visualViewport.offsetTop}`);
        document.querySelectorAll('.screen, .view').forEach(s => { if(s.offsetParent !== null && s.scrollLeft) out.push(`#${s.id} ${s.scrollLeft}px sideways`); });
        return out;
    });

    await page.goto('/');
    const { width, height } = page.viewportSize();
    await swipe(width / 2, height * 0.3, -width * 0.6, 0);
    await swipe(width / 2, height * 0.3, width * 0.6, 0);
    await swipe(width * 0.2, height * 0.3, -width * 0.6, 0);
    expect(await moved(), 'start screen after sideways swipes').toEqual([]);

    await newGame(page);
    // the top bar and the bottom nav: nothing under them scrolls
    await swipe(width / 2, 30, 0, -200);
    await swipe(width / 2, height - 30, -width * 0.5, -200);
    expect(await moved(), 'map after swipes on its bars').toEqual([]);
});

// Phones with their browser bars showing are shorter than their screens: iPhone Safari leaves
// 390×664 of an 844px screen. The start screen fits there without scrolling.
test('başlangıç ekranı tarayıcı çubuklu bir telefona kaydırmadan sığıyor', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'a phone size');
    await page.setViewportSize({ width: 390, height: 664 });
    await page.goto('/');
    const s = await page.evaluate(() => { const e = document.getElementById('start-screen');
        return { sh: e.scrollHeight, ch: e.clientHeight, sw: e.scrollWidth, cw: e.clientWidth }; });
    expect(s.sh, `start screen content ${s.sh}px in ${s.ch}px`).toBeLessThanOrEqual(s.ch + 1);
    expect(await audit(page, '390×664 başlangıç')).toEqual([]);
});

// The scenes the walk above never reaches: a lair's scouting card and the lair itself with its
// touch controls, and the arena's tournament. The battle is ux.spec's.
test('sahneler: in kartı, in, turnuva', async ({ page, lang }) => {
    test.skip(lang === 'xx', 'the pseudo-locale checks where text comes from, not how wide it is');
    const found = [];
    await newGame(page);
    await page.evaluate(() => {
        state.time.hour = 23; state.player.proficiencies.spotting.level = 8;   // the whole card
        const s = Game.lairs()[0];
        s.layout = 'house'; s.seen = true; s.lairAmbush = { day: state.time.day, on: false };
        Game.enterSite(s);
    });
    await expect(modal(page).locator('.lair-brief')).toBeVisible();
    found.push(...await audit(page, 'in kartı'));
    await modal(page).locator('.lb-help').click();
    found.push(...await audit(page, 'in kartı → nasıl oynanır'));
    await page.evaluate(() => { localStorage.setItem(Lair.TUTOR_KEY, '1'); Lair.enter(Game.lairs()[0].id, 'solo'); });
    await expect(page.locator('#lair-view')).toHaveClass(/\bactive\b/);
    await page.waitForFunction(() => Lair.active && Lair.run());
    found.push(...await audit(page, 'in'));
    // backing out: the result card over the lair
    await page.evaluate(() => Lair.retreat());
    await expect(page.locator('#lair-over .lres')).toBeVisible();
    found.push(...await audit(page, 'in sonucu'));
    await page.evaluate(() => { Lair.leave(); Game.closeModal(); });
    await page.evaluate(() => { Game.showScreen('map'); TournamentMinigame.start({ goal: 3, time: 20 }); });
    found.push(...await audit(page, 'turnuva'));
    await page.evaluate(() => TournamentMinigame.end(false));
    expect(found).toEqual([]);
});
