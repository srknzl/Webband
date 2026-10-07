// A seeded monkey (bug hunt): a new game, then hundreds of steps of a player who clicks whatever
// the screen offers — cards, modal answers, the sidebar, map targets, fights won and lost. The
// fixture already fails on an error, a missing translation or broken text; this spec also says
// *which step* produced it. Not part of the regular run: MONKEY=1 turns it on.
//   MONKEY=1 MONKEY_SEED=3 MONKEY_STEPS=400 npx playwright test specs/monkey.spec.js
const { test, expect, newGame } = require('../fixtures');

const STEPS = +process.env.MONKEY_STEPS || 250;
// one test per seed, so a single run spreads them over the workers: MONKEY_SEED=1,2,3
const SEEDS = String(process.env.MONKEY_SEED || 1).split(',').map(Number);
// Never pressed: a reload ends the run, a delete wipes what the run is testing
const NEVER = /location\.reload|Save\.del|Save\.wipe|Game\.install|toggleFullscreen|Save\.toFile|Debug\.download|save-file/;

test.skip(!process.env.MONKEY, 'bug-hunt run, MONKEY=1 enables it');
test.setTimeout(20 * 60_000);

for(const SEED of SEEDS) test(`monkey: ${STEPS} steps, seed ${SEED}`, async ({ page }) => {
    let r = SEED * 2654435761 >>> 0;
    const rnd = () => { r ^= r << 13; r >>>= 0; r ^= r >> 17; r ^= r << 5; r >>>= 0; return r / 4294967296; };
    const pick = a => a[Math.floor(rnd() * a.length)];
    const log = [], found = [], reported = new Set();
    let step = 0, last = 'start';
    page.on('pageerror', e => found.push(`#${step} [${last}] pageerror: ${e.message} @ ${(e.stack || '').split('\n')[1] || ''}`));
    page.on('console', m => { if(m.type() === 'error') found.push(`#${step} [${last}] console.error: ${m.text()}`); });

    await newGame(page, 'Maymun');
    // where broken text lands: the element's id/class chain, for the report
    await page.evaluate(() => {
        window.__mkWhere = [];
        new MutationObserver(ms => ms.forEach(m => [...m.addedNodes, m.target].forEach(n => {
            const t = n.nodeType === 3 ? n.nodeValue : n.nodeType === 1 ? n.textContent : '';
            if(!/\bundefined\b|\bNaN\b/.test(t || '')) return;
            let e = n.nodeType === 3 ? n.parentElement : n, path = [];
            for(let k = 0; e && k < 4; k++, e = e.parentElement) path.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').join('.') : ''));
            window.__mkWhere.push(path.join(' < ') + ' :: ' + t.slice(0, 80));
        }))).observe(document.body, { subtree: true, childList: true, characterData: true });
    });
    await page.evaluate(() => { Game.setOpt('muted', true); state.player.money = 3000; });

    const inPage = () => page.evaluate(() => ({
        debug: Debug.errors.length, missing: I18N.missing.size, issues: (window.__e2eIssues || []).length,
        battle: Battle.active, lair: typeof Lair !== 'undefined' && Lair.active,
        modal: !document.getElementById('modal-overlay').classList.contains('hidden'),
        view: (document.querySelector('.view.active') || {}).id || '?',
        typing: !!Game._type, coach: !!document.getElementById('coach-box')
    }));
    const snapshot = async () => page.evaluate(() => ({
        debug: Debug.errors.slice(-3).map(e => `${e.kind}: ${e.msg}${e.stack ? ' @ ' + e.stack : ''}`),
        missing: [...I18N.missing].slice(-3), issues: (window.__e2eIssues || []).slice(-3), where: (window.__mkWhere || []).slice(-2)
    }));

    // Clicks one of the visible, enabled buttons under `root`; returns what it pressed
    const clickIn = async root => {
        const n = await page.evaluate(([root, never]) => {
            document.querySelectorAll('[data-mk]').forEach(e => e.removeAttribute('data-mk'));
            const re = new RegExp(never);
            const els = [...document.querySelectorAll(root + ' button, ' + root + ' [onclick]')].filter(e => {
                const b = e.getBoundingClientRect(), st = getComputedStyle(e);
                return b.width > 2 && b.height > 2 && !e.disabled && st.visibility !== 'hidden' && st.pointerEvents !== 'none'
                    && !re.test(e.getAttribute('onclick') || '') && !re.test(e.id || '');
            });
            els.forEach((e, i) => e.setAttribute('data-mk', i));
            return els.length;
        }, [root, NEVER.source]);
        if(!n) return null;
        const i = Math.floor(rnd() * n), el = page.locator(`[data-mk="${i}"]`);
        const what = ((await el.getAttribute('onclick').catch(() => '')) || (await el.innerText().catch(() => '')) || '?').slice(0, 70).replace(/\s+/g, ' ');
        // a typed line eats the first press (typeIn); the player reads it first
        await page.waitForFunction(() => !Game._type, null, { timeout: 5000 }).catch(() => {});
        await el.click({ timeout: 3000 }).catch(e => { log.push(`  (click failed: ${what})`); });
        return what;
    };

    for(step = 1; step <= STEPS; step++) {
        const s = await inPage().catch(() => null);
        if(!s) break;
        const before = s;
        let did;
        // a window over a lair (the tour offer on a first visit) is answered first, and the tour it
        // starts is walked: under either every lair click missed, and the rest of the run was spent
        // stuck there
        if(s.coach && !s.modal) did = 'coach: ' + (await clickIn('#coach-box'));
        else if(s.lair && !s.modal) {
            const k = rnd();
            if(k < 0.5) { const key = pick(['w', 'a', 's', 'd', 'e', ' ', 'c']); await page.keyboard.down(key); await page.waitForTimeout(250); await page.keyboard.up(key); did = `lair key ${key}`; }
            else if(k < 0.8) did = 'lair: ' + (await clickIn('#lair-view'));
            else { await page.evaluate(() => { const G = Lair.run(); if(G && !G.done) Lair.retreat(); }); did = 'lair retreat'; }
        } else if(s.battle) {
            await page.waitForTimeout(400);
            const k = rnd();
            if(k < 0.65) { await page.evaluate(() => Battle.units.forEach(u => { if(!u.isPlayerTeam) u.hp = 0; })); did = 'battle: win'; }
            else if(k < 0.8) { await page.evaluate(() => Battle.units.forEach(u => { if(u.isPlayerTeam) u.hp = 0; })); did = 'battle: lose'; }
            else { await page.mouse.click(300 + rnd() * 300, 200 + rnd() * 200); did = 'battle: swing'; }
            await page.waitForTimeout(1300);
        } else if(s.modal) {
            if(rnd() < 0.05) { await page.keyboard.press('Escape'); did = 'Escape'; }
            else {
                const bet = page.locator('#modal-body input[type=number]');
                if(await bet.count() && rnd() < 0.5) await bet.first().fill(String(Math.floor(rnd() * 300))).catch(() => {});
                did = 'modal: ' + ((await clickIn('#modal-body')) || (await page.keyboard.press('Escape'), 'Escape (no button)'));
            }
        } else if(s.view === 'settlement-view') {
            did = 'town: ' + (await clickIn(rnd() < 0.85 ? '#settlement-actions' : '#settlement-view'));
        } else if(s.view === 'map-view') {
            const k = rnd();
            if(k < 0.3) {          // walk up to a party on the map and meet it
                did = 'meet ' + await page.evaluate(() => {
                    const n = state.npcParties[Math.floor(Math.random() * state.npcParties.length)];
                    if(!n) return '-';
                    Object.assign(state.player, { x: n.x - 40, y: n.y, status: 'idle', targetLocation: null });
                    Game.setTarget({ x: n.x, y: n.y, isNpc: true, id: n.id, name: n.name });
                    return n.type + ':' + (n.band || n.lordId || '');
                });
                await page.waitForTimeout(1500);
            } else if(k < 0.6) {   // walk into a settlement
                did = 'enter ' + await page.evaluate(() => {
                    // a town or castle or village, now and then a site (ruin, lair, boss keep)
                    const sites = (state.sites || []).filter(x => x.kind !== 'lair' || x.seen || Math.random() < 0.5);
                    const l = Math.random() < 0.2 && sites.length ? sites[Math.floor(Math.random() * sites.length)] : LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
                    if(l.kind === 'lair') l.seen = true;
                    Object.assign(state.player, { x: l.x, y: l.y, status: 'idle', targetLocation: null });
                    Game.enterLocation(l);
                    return l.id;
                });
            } else if(k < 0.7) { await page.evaluate(() => Game.advanceTime(6 + Math.random() * 30)); did = 'time passes'; }
            else if(k < 0.8) { did = 'hud: ' + (await clickIn('#map-view')); }
            else did = 'sidebar: ' + (await clickIn(pick(['#sidebar', '#top-bar'])));
        } else {
            did = s.view + ': ' + (await clickIn(rnd() < 0.7 ? '#' + s.view : '#sidebar'));
        }
        last = did;
        log.push(`#${step} ${did}`);
        await page.waitForTimeout(120);
        // Stale screen: redraw the open screen from the state; if its words change, it was
        // showing numbers from before the last action (the town cards kept the garrison count)
        if(!(await inPage().catch(() => ({ modal: true }))).modal) {
            const stale = await page.evaluate(() => {
                const v = document.querySelector('.view.active');
                const redraw = v && {
                    'quests-view': () => Quests.render(), 'character-view': () => Game.renderCharacterScreen(),
                    'party-view': () => Game.renderPartyScreen(), 'inventory-view': () => Game.renderInventoryScreen(),
                    'settlement-view': () => { const l = LOCATIONS.find(x => x.id === Game._enteredLoc); if(l) Game.enterLocation(l); }
                }[v.id];
                if(!redraw || Battle.active) return null;
                // The roster's "11+2/16" mark shows what was new on the way in and is then marked
                // seen (#111), so a redraw drops it by design — not a stale number
                const text = () => (v.id === 'settlement-view' ? document.getElementById('settlement-actions') : v).innerText
                    .replace(/(\d)\+\d+\//g, '$1/');
                const before = text(); redraw(); const after = text();
                if(before === after) return null;
                const a = before.split('\n'), b = after.split('\n'); let i = 0; while(i < a.length && a[i] === b[i]) i++;
                return `${v.id}: "${(a[i] || '').slice(0, 60)}" → "${(b[i] || '').slice(0, 60)}"`;
            }).catch(() => null);
            if(stale && !reported.has('stale ' + stale.split(':')[0])) { reported.add('stale ' + stale.split(':')[0]); found.push(`#${step} [${did}] stale screen — ${stale}`); }
        }
        // Overflow: the page scrolls sideways, or a clipped box cuts its own text
        const over = await page.evaluate(() => {
            if(document.documentElement.scrollWidth > innerWidth + 1) return `the page scrolls sideways (${document.documentElement.scrollWidth} > ${innerWidth})`;
            const root = [...document.querySelectorAll('.view.active, #modal-overlay:not(.hidden), #top-bar')];
            for(const r of root) for(const e of r.querySelectorAll('button, .btn, h3, h4, .hud-chip, td, li')) {
                const st = getComputedStyle(e);
                if(!e.offsetParent || !/hidden|clip/.test(st.overflowX) || st.textOverflow === 'ellipsis') continue;
                if(e.scrollWidth > e.clientWidth + 2 && e.innerText.trim())
                    return `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''} cuts its text: "${e.innerText.trim().slice(0, 50)}" (${e.scrollWidth} > ${e.clientWidth})`;
            }
            return null;
        }).catch(() => null);
        if(over && !reported.has('over ' + over.slice(0, 40))) { reported.add('over ' + over.slice(0, 40)); found.push(`#${step} [${did}] overflow — ${over}`); }
        const after = await inPage().catch(() => null);
        if(after && (after.debug > before.debug || after.missing > before.missing || after.issues > before.issues)) {
            const snap = await snapshot();
            found.push(`#${step} [${did}] → ${JSON.stringify(snap)}`);
        }
    }
    console.log(`MONKEY LOG (seed ${SEED}):\n` + log.slice(-40).join('\n'));
    // one line per finding, with what it takes to replay it (the nightly job greps `MK `)
    const where = `${test.info().project.name} seed ${SEED}`;
    console.log(`MONKEY FOUND:\n` + (found.map(f => `MK ${where} ${f}`).join('\n') || 'nothing'));
    expect(found).toEqual([]);
});
