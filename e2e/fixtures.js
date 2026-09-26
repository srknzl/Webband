// Shared fixture: every test gets a page that
//   - starts from a seeded Math.random, so a failure replays the same world,
//   - has the one-time prompts (tutorial, lite notice, F11 hint) already answered,
//   - and fails the test afterward on anything a player would call a bug even when the
//     test's own assertions passed: an uncaught error, a console.error, a failed request,
//     an entry in the game's own Debug.errors ring (the red corner badge), a translation
//     lookup that missed the dictionary, or broken text painted on screen.
const base = require('@playwright/test');
const { expect } = base;

// Runs inside the page before any game script. Kept dependency-free on purpose.
function pageInit({ lang, seed }) {
    // mulberry32 — the same generator tools/harness.js seeds the Node runs with
    let a = seed >>> 0;
    Math.random = () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    try {
        if(lang) localStorage.setItem('webband_lang', lang);
        for(const k of ['webband_tutor_done', 'webband_btutor_done', 'webband_lite_told']) localStorage.setItem(k, '1');
        localStorage.setItem('f11hint', 'off');
    } catch(_) {}

    // Text watch. Armed after the game's own boot translated the static DOM, then it sees
    // every node the game writes — screens, modals, tooltips, the top bar.
    const issues = window.__e2eIssues = [];
    const seen = new Set();
    const BROKEN = /\{\d+\}|\bundefined\b|\bNaN\b|\[object Object\]/;
    // Letters English and Indonesian never use; ç/ö/ü are left out because proper names
    // borrowed from other languages carry them legitimately.
    const TURKISH = /[ğĞşŞıİ]/;
    const note = (kind, text) => {
        const key = kind + '|' + text;
        if(seen.has(key)) return;
        seen.add(key);
        issues.push({ kind, text });
    };
    // A word the translation itself kept is a name, not a leak: "Kör Hafız" → "Blind Hafız".
    // So the allowed Turkish-lettered words are read from the current dictionary's own values.
    const bare = w => w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
    const kept = {};
    const keptBy = lang => kept[lang] || (kept[lang] = new Set(Object.values((I18N.dicts || {})[lang] || {})
        .flatMap(v => String(v).split(/\s+/)).map(bare).filter(w => TURKISH.test(w))));
    const check = text => {
        if(!text || !text.trim()) return;
        const b = text.match(BROKEN);
        if(b) note('broken', text.slice(Math.max(0, b.index - 40), b.index + 40).trim());
        // The release name is a stamp, deliberately never translated (see VERSION in app.js)
        if(typeof VERSION !== 'undefined') text = text.split(VERSION.name).join('');
        const lang = document.documentElement.lang;
        if(lang !== 'tr' && TURKISH.test(text))
            text.split(/\s+/).map(bare).filter(w => TURKISH.test(w) && !keptBy(lang).has(w)).forEach(w => note('turkish', w));
    };
    const skip = n => { const p = n.nodeType === 3 ? n.parentElement : n; return !p || !!p.closest('script,style'); };
    // A node written and replaced within the same task never reached the screen — skipped.
    const walk = root => {
        if(!root.isConnected) return;
        if(root.nodeType === 3) { if(!skip(root)) check(root.nodeValue); return; }
        if(root.nodeType !== 1 || skip(root)) return;
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for(let n = w.nextNode(); n; n = w.nextNode()) if(!skip(n)) check(n.nodeValue);
    };
    let armed = false;
    new MutationObserver(ms => {
        if(!armed) return;
        for(const m of ms) {
            if(m.type === 'characterData') walk(m.target);
            else m.addedNodes.forEach(walk);
        }
    }).observe(document, { subtree: true, childList: true, characterData: true });
    // app.js sets `window.onload = Game.init`; a listener added now runs before it, so the
    // arm waits one task for the boot to finish translating.
    addEventListener('load', () => setTimeout(() => { armed = true; walk(document.body); }, 0));
}

const test = base.test.extend({
    lang: ['tr', { option: true }],
    // null = first launch: no language stored, the game has to ask.
    storedLang: [undefined, { option: true }],
    seed: [1, { option: true }],

    page: async ({ page, lang, storedLang, seed }, use) => {
        const errors = [];
        page.on('pageerror', e => errors.push(`pageerror: ${e.message} @ ${(e.stack || '').split('\n').slice(1, 3).map(l => l.trim()).join(' ← ')}`));
        page.on('console', m => { if(m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
        // ERR_ABORTED is the browser cancelling its own load — a music track swapped mid-download
        // when the screen changes — not a request that failed.
        page.on('requestfailed', r => {
            const why = r.failure() && r.failure().errorText;
            if(why !== 'net::ERR_ABORTED') errors.push(`request failed: ${r.url()} (${why})`);
        });
        page.on('response', r => { if(r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });
        await page.addInitScript(pageInit, { lang: storedLang === undefined ? lang : storedLang, seed });

        await use(page);

        if(page.isClosed()) return;
        const inPage = await page.evaluate(() => ({
            debug: typeof Debug === 'undefined' ? [] : Debug.errors.map(e => `${e.kind}: ${e.msg}`),
            lang: typeof I18N === 'undefined' ? 'tr' : I18N.lang,
            missing: typeof I18N === 'undefined' ? [] : [...I18N.missing],
            text: window.__e2eIssues || []
        })).catch(() => null);
        if(!inPage) return;   // navigated away mid-teardown (a reload test); the listeners already ran
        const problems = [
            ...errors,
            ...inPage.debug.map(e => `Debug.errors → ${e}`),
            ...(inPage.lang === 'tr' ? [] : inPage.missing.map(k => `missing ${inPage.lang} translation: ${JSON.stringify(k)}`)),
            ...inPage.text.map(i => i.kind === 'turkish'
                ? `Turkish text on a ${inPage.lang} screen: ${JSON.stringify(i.text)}`
                : `broken text on screen: ${JSON.stringify(i.text)}`)
        ];
        expect(problems, 'the page stayed clean for the whole test').toEqual([]);
    }
});

// ---------- UI vocabulary ----------
// A label is looked up in the page's own dictionary, so the same spec drives the Turkish,
// English and Indonesian builds. Keys are the Turkish source text, exactly as in T(). The
// lookup is read-only — going through T() would add a test's typo to I18N.missing and blame
// the game for it — and a key the dictionary lacks fails right here, by name.
// Whitespace is collapsed: an alert turns "\n" into <br>, and the reader should not care.
async function L(page, key, ...vals) {
    const s = await page.evaluate(([k, v]) => {
        let s = k;
        if(I18N.lang !== 'tr') {
            const hit = I18N.dict()[I18N.norm(k)];
            if(hit === undefined) return { missing: k };
            s = hit;
        }
        return s.replace(/\{(\d+)\}/g, (m, i) => (v[+i] !== undefined ? String(v[+i]) : m));
    }, [key, vals]);
    if(s.missing) throw new Error(`test uses a key the dictionary does not have: ${JSON.stringify(s.missing)}`);
    return squash(s);
}
const squash = s => s.replace(/\s+/g, ' ').trim();

const modal = page => page.locator('#modal-overlay:not(.hidden) #modal-body');

/**
 * A button inside the open modal, by its (translated) label. Waits out the typewriter first,
 * the way a player reads the line before answering: while text is still typing, the game
 * spends the first press on finishing the sentence (typeIn, deliberately).
 */
async function modalBtn(page, key, ...vals) {
    await page.waitForFunction(() => !Game._type);
    return modal(page).getByRole('button', { name: await L(page, key, ...vals) });
}

/** Presses "Tamam" on the alert() modal and returns the alert's text. */
async function okAlert(page) {
    const ok = modal(page).locator('[onclick="Game.alertOk()"]');
    await expect(ok).toBeVisible();
    const text = squash(await modal(page).innerText());
    await ok.click();
    return text;
}

/** Sidebar entry (desktop) or bottom-nav tab / "⋯ Daha" entry (phone). */
async function openView(page, view) {
    const btn = page.locator(`#sidebar .menu-btn[data-view="${view}"]`);
    if(await btn.isVisible()) await btn.click();
    else {
        await page.locator('#sidebar .sb-more').click();
        await (await modalBtn(page, { quests: 'Görevler' }[view])).click();
    }
    await expect(page.locator(`#${view}-view`)).toHaveClass(/\bactive\b/);
}

// ---------- Game setup ----------
/** Start screen → character wizard → map, clicking through every step like a player. */
async function newGame(page, name = 'Deneme') {
    await page.goto('/');
    await expect(page.locator('#start-btn')).toBeVisible();
    await page.locator('#char-name').fill(name);
    await page.locator('#start-btn').click();
    const steps = await page.evaluate(() => BACKGROUND.length);
    for(let i = 0; i < steps; i++) await modal(page).locator('[onclick^="Game.pickCreation"]').first().click();
    await modal(page).locator('[onclick^="Game.pickBanner"]').first().click();
    await modal(page).locator('[onclick="Game.diffStepDone()"]').click();
    await modal(page).locator('[onclick="Game.finishCreation()"]').click();
    await expect(page.locator('#main-ui')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#modal-overlay')).toHaveClass(/\bhidden\b/);
    await page.waitForFunction(() => Game._loopId);
}

/**
 * Setup shortcut: puts the party at a settlement's gate and walks in — the same call the
 * map makes on arrival (the walk itself has its own test in map.spec.js).
 */
async function enter(page, locId) {
    await page.evaluate(id => {
        const l = LOCATIONS.find(x => x.id === id);
        Object.assign(state.player, { x: l.x, y: l.y, status: 'idle', targetLocation: null });
        Game.enterLocation(l);
    }, locId);
    await expect(page.locator('#settlement-view')).toHaveClass(/\bactive\b/);
}

async function actionBtn(page, key, ...vals) {
    return page.locator('#settlement-actions button', { hasText: await L(page, key, ...vals) });
}

/** Setup shortcut: the party stands at (x, y) on the map, idle, with the camera on it. */
async function placeParty(page, x, y) {
    await page.evaluate(([x, y]) => {
        Object.assign(state.player, { x, y, status: 'idle', targetLocation: null });
        Object.assign(Game.camera, { x, y, offsetX: 0, offsetY: 0 });
        Game.centerOnPlayer();
    }, [x, y]);
}

/**
 * Clicks (mouse) or taps (touch device) a world point on the map canvas — the input a player
 * gives, through the same screen→world transform the game inverts in `mapPos`.
 */
async function tapWorld(page, pt) {
    const s = await page.evaluate(({ x, y }) => {
        const r = Game.mapCanvas.getBoundingClientRect(), c = Game.camera;
        return { x: r.left + r.width / 2 + (x - c.x) * c.zoom, y: r.top + r.height / 2 + (y - c.y) * c.zoom };
    }, pt);
    const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y) === Game.mapCanvas, s);
    expect(hit, 'nothing covers the map where the player taps').toBe(true);
    if(await page.evaluate(() => Game.isTouch())) await page.touchscreen.tap(s.x, s.y);
    else await page.mouse.click(s.x, s.y);
}

// ---------- Battle ----------
/**
 * The battle is actually being painted: distinct colours on a 7x7 grid of the battle canvas
 * on show. Read from a screenshot of that element — what the compositor put on screen — so the
 * same check covers Canvas2D (#battle-canvas) and WebGL (#battle-gl, whose drawing buffer is
 * not readable back through a 2d context).
 */
async function painted(page) {
    const shot = await page.locator('#battle-view > canvas:not([hidden])').screenshot();
    return page.evaluate(async b64 => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + b64;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0);
        const seen = new Set();
        for(let i = 1; i < 8; i++) for(let j = 1; j < 8; j++)
            seen.add(x.getImageData(Math.floor(c.width * i / 8), Math.floor(c.height * j / 8), 1, 1).data.join(','));
        return seen.size;
    }, shot.toString('base64'));
}

/** A city at peace with the player, far from any roaming party. */
function quietCity(page) {
    return page.evaluate(() => {
        const calm = l => state.npcParties.every(n => Game.dist(n, l) > 250);
        const cities = LOCATIONS.filter(l => l.type === 'city' && !Game.atWar(Game.playerFaction(), l.faction));
        return (cities.find(calm) || cities[0]).id;
    });
}

module.exports = { test, expect, L, modal, modalBtn, okAlert, openView, newGame, enter, actionBtn, placeParty, tapWorld, quietCity, painted };
