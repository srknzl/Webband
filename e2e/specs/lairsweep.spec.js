// Bug hunt: every lair layout, every way in, day and night — in and a few seconds of its loop.
const { test, expect, modal, newGame } = require('../fixtures');
test.skip(!process.env.MONKEY, 'bug-hunt run');
test.setTimeout(10 * 60_000);

test('lair sweep', async ({ page }) => {
    await newGame(page, 'Sweeper');   // a name with no Turkish-only letter: the fixture reads it on EN/ID screens
    const found = [];
    const layouts = await page.evaluate(() => Object.keys(Lair.LAYOUTS || Lair.LEVELS));
    const sites = await page.evaluate(() => Game.lairs().map((s, i) => i));
    for(const si of sites) for(const layout of layouts) for(const way of ['solo', 'squad']) for(const hour of [12, 23]) for(const men of [4]) {
        const r = await page.evaluate(async ([layout, way, hour, men, si]) => {
            Debug.errors.length = 0;
            Game.setOpt('muted', true);
            state.time.hour = hour;
            // a real party's mix: every troop tree, a companion, some wounded
            const names = Object.keys(TROOP_TYPES);
            state.player.party = Array.from({ length: men }, (_, i) => ({ id: 'sw' + i, name: names[(i * 7 + hour) % names.length], level: 1 + (i * 5) % 30, xp: 0, xpNext: 8, wounded: i % 5 === 4 ? 2 : 0 }));
            if(men) state.player.party.push(Object.assign({ id: 'cmp', isCompanion: true, level: 8, xp: 0, xpNext: 99 }, { name: COMPANIONS[0].name, companionId: COMPANIONS[0].id }));
            state.player.proficiencies.leadership.level = 5;
            const s = Game.lairs()[si];
            s.layout = layout; s.seen = true; s.lairAmbush = { day: state.time.day, on: Math.random() < 0.5 };
            Game.closeModal();
            try { Lair.enter(s.id, way); } catch(e) { return 'enter threw: ' + e.message; }
            for(let i = 0; i < 80 && !(Lair.active && Lair.run()); i++) await new Promise(r => setTimeout(r, 50));
            localStorage.setItem(Lair.TUTOR_KEY, '1');
            Game.closeModal(); Game.tutor = null; Lair.setPaused(false);
            // walk about: every direction, run, crouch, act, swing
            const press = (k, ms) => new Promise(r => { dispatchEvent(new KeyboardEvent('keydown', { key: k })); setTimeout(() => { dispatchEvent(new KeyboardEvent('keyup', { key: k })); r(); }, ms); });
            for(const k of ['w', 'd', 's', 'a', 'w', 'e', ' ', 'c', 'd', 'q']) await press(k, 250);
            const errs = Debug.errors.map(e => `${e.msg} | ${e.stack || ''}`);
            try { if(Lair.active) { const G = Lair.run(); if(G && !G.done) Lair.retreat(); Lair.leave(); } } catch(e) { errs.push('leave threw: ' + e.message); }
            Game.closeModal();
            return errs.join(' || ');
        }, [layout, way, hour, men, si]);
        if(r) found.push(`site${si}/${layout}/${way}/h${hour}/men${men}: ${r}`);
    }
    console.log('LAIR SWEEP:\n' + (found.map(f => `MK ${test.info().project.name} lair ${f}`).join('\n') || 'nothing'));
    await page.evaluate(() => { Debug.errors.length = 0; });
    expect(found).toEqual([]);
});
