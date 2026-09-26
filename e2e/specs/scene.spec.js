// The settlement scene (2.0.0). On a desktop it spans the panel and shows no scroll cues. On a
// phone it keeps a readable height and slides sideways: arrows and shaded edges on whichever
// side has more, a track under it, and — until the first slide — a "slide the scene" pill, in
// every language. A finger slides it natively, a tap on a building still runs that building's
// action wherever the scene is scrolled to, and a vertical swipe that starts on the scene still
// scrolls the page.
const { test, expect, L, newGame, enter, quietCity } = require('../fixtures');

/** Scroll state of the scene and which cues are on show. */
function sceneState(page) {
    return page.evaluate(() => {
        const sc = document.getElementById('scene-scroll'), wrap = document.getElementById('scene-wrap');
        const cv = document.getElementById('scene-canvas');
        // An arrow faded out at its edge also stops taking taps; the pill never takes any
        const shown = (id, tappable) => { const e = document.getElementById(id), s = getComputedStyle(e);
            return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.5 && (!tappable || s.pointerEvents !== 'none'); };
        return {
            x: sc.scrollLeft, max: sc.scrollWidth - sc.clientWidth, h: cv.getBoundingClientRect().height,
            box: sc.clientWidth, left: shown('scene-left', true), right: shown('scene-right', true),
            hint: shown('scene-hint'), track: shown('scene-track'), hintText: document.querySelector('#scene-hint span').textContent,
            labels: ['scene-left', 'scene-right', 'scene-scroll'].map(id => document.getElementById(id).getAttribute('aria-label')),
            cls: wrap.className, pageWide: document.documentElement.scrollWidth - innerWidth
        };
    });
}

/** A finger drag: raw touch points through Chromium's input pipeline, so the browser itself
 *  decides what scrolls (CDP's synthesizeScrollGesture scrolls nothing in headless Chromium). */
async function swipe(page, sel, dx, dy) {
    const box = await page.locator(sel).boundingBox();
    const x0 = Math.round(box.x + box.width / 2), y0 = Math.round(box.y + box.height / 2);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    for(let i = 1; i <= 12; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + dx * i / 12, y: y0 + dy * i / 12 }] });
        await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(500);
}

test('yerleşim sahnesi: telefonda yana kayar, kaydırılabildiğini söyler; masaüstünde tam genişlik', async ({ page, isMobile }) => {
    await newGame(page);
    await page.evaluate(() => { try { localStorage.removeItem('webband_sceneSlide'); } catch(e) {} Game._sceneSeen = false; });
    const city = await quietCity(page);
    await enter(page, city);
    await page.waitForTimeout(200);
    let s = await sceneState(page);

    if(!isMobile) {
        // Desktop: the scene fits its panel and none of the cues exist
        expect(s.max, 'desktop scene fits its box').toBeLessThanOrEqual(4);
        expect(s.cls).not.toMatch(/\bscrolls\b/);
        for(const k of ['left', 'right', 'hint', 'track']) expect(s[k], k + ' hidden on desktop').toBe(false);
        // A click on a building still runs its button's action
        const label = await page.evaluate(() => {
            const h = Game.sceneHot.find(Boolean);
            h.btn.onclick = () => { window.__tapped = h.label; };
            return h.label;
        });
        const pt = await page.evaluate(() => {
            const h = Game.sceneHot.find(Boolean), r = document.getElementById('scene-canvas').getBoundingClientRect();
            return { x: r.left + (h.x + h.w / 2) * r.width / Game.SCENE_W, y: r.top + (h.y + h.h * 0.7) * r.height / Game.SCENE_H };
        });
        await page.mouse.click(pt.x, pt.y);
        expect(await page.evaluate(() => window.__tapped)).toBe(label);
        return;
    }

    // Phone: a readable height, wider than the box, every cue up, labels in the page's language
    expect(s.h, 'scene height on a phone').toBeGreaterThanOrEqual(190);
    expect(s.max, 'the scene is wider than its box').toBeGreaterThan(100);
    expect(s.pageWide, 'the page itself does not scroll sideways').toBeLessThanOrEqual(1);
    expect(s.x).toBe(0);
    expect(s.left, 'no left arrow at the left edge').toBe(false);
    expect(s.right, 'right arrow').toBe(true);
    expect(s.track, 'position track').toBe(true);
    expect(s.hint, 'slide hint before the first slide').toBe(true);
    expect(s.cls).toMatch(/\bpeek\b/);
    expect(s.hintText).toBe(await L(page, 'Sahneyi yana kaydır'));
    expect(s.labels).toEqual([await L(page, 'Sahneyi sola kaydır'), await L(page, 'Sahneyi sağa kaydır'),
        await L(page, 'Yerleşim sahnesi, yana kaydırılır')]);
    // Nothing on the scene is covered where a finger starts: the pill lets taps through
    const through = await page.evaluate(() => {
        const r = document.getElementById('scene-hint').getBoundingClientRect();
        return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).id;
    });
    expect(through).toBe('scene-canvas');

    // The right arrow slides it; the words go, the left arrow comes
    await page.locator('#scene-right').tap();
    await page.waitForTimeout(600);
    s = await sceneState(page);
    expect(s.x, 'the arrow slid the scene').toBeGreaterThan(s.box * 0.5);
    expect(s.hint, 'hint gone after the first slide').toBe(false);
    expect(s.left, 'left arrow once there is scene to the left').toBe(true);
    const thumb = await page.evaluate(() => parseFloat(document.querySelector('#scene-track i').style.left));
    expect(thumb, 'the track follows').toBeGreaterThan(0);

    // A finger drag slides it all the way; the right arrow and shade go at the end
    await swipe(page, '#scene-scroll', -330, 0);
    s = await sceneState(page);
    expect(s.x, 'a swipe reaches the right edge').toBeGreaterThanOrEqual(s.max - 4);
    expect(s.right, 'no right arrow at the right edge').toBe(false);
    expect(s.cls).toMatch(/\bat-end\b/);

    // A tap on a building runs that building's button — wherever the scene is scrolled to
    const target = await page.evaluate(() => {
        const r = document.getElementById('scene-canvas').getBoundingClientRect(), sc = document.getElementById('scene-scroll').getBoundingClientRect();
        const k = r.width / Game.SCENE_W;
        const i = Game.sceneHot.findIndex(h => h && r.left + (h.x + h.w / 2) * k > sc.left + 50 && r.left + (h.x + h.w / 2) * k < sc.right - 50);
        const h = Game.sceneHot[i];
        h.btn.onclick = () => { window.__tapped = h.label; };
        return { label: h.label, x: r.left + (h.x + h.w / 2) * k, y: r.top + (h.y + h.h * 0.7) * r.height / Game.SCENE_H };
    });
    await page.touchscreen.tap(target.x, target.y);
    expect(await page.evaluate(() => window.__tapped), 'the tapped building ran its own action').toBe(target.label);

    // A vertical swipe starting on the scene still scrolls the settlement screen
    const scroller = await page.evaluate(() => {
        for(let e = document.getElementById('scene-wrap'); e; e = e.parentElement)
            if(e.scrollHeight > e.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(e).overflowY)) { e.id ||= 'e2e-scroller'; e.scrollTop = 0; return '#' + e.id; }
        return null;
    });
    if(scroller) {
        await swipe(page, '#scene-scroll', 0, -250);
        expect(await page.locator(scroller).evaluate(e => e.scrollTop), 'vertical swipe on the scene scrolls the page').toBeGreaterThan(40);
        await page.locator(scroller).evaluate(e => { e.scrollTop = 0; });
    }

    // Another settlement starts at its left edge; the hint stays gone (remembered)
    const other = await page.evaluate(id => LOCATIONS.find(l => l.type === 'village' && l.id !== id && !Game.atWar(Game.playerFaction(), l.faction)).id, city);
    await page.evaluate(() => Game.showScreen('main-ui'));
    await enter(page, other);
    await page.waitForTimeout(200);
    s = await sceneState(page);
    expect(s.x, 'a new settlement starts at the left').toBe(0);
    expect(s.hint, 'the hint does not come back').toBe(false);
    expect(s.right).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('webband_sceneSlide'))).toBe('1');
});
