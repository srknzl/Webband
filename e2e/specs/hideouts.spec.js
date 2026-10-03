// The hideouts (2.9.0) through the real screens: every one of them opens from its scouting card and
// runs, and each trick a hideout is built around works by the button — meat for a dog, a key off a
// bandit's belt, the bell, the herb in the keg, a cut rope, a loosed bear, deep water, a rock ledge,
// a sluice, a floor of bones. World setup only: the layout pinned, the clock set, the hero put
// beside the thing to use (and, for the drugged keg, its clock wound forward).
const { test, expect, L, modal, newGame } = require('../fixtures');

async function enterAt(page, layout, hour = 23) {
    await page.evaluate(([layout, hour]) => {
        Game.setOpt('muted', true);
        state.time.hour = hour;
        state.player.proficiencies.spotting.level = 8;
        localStorage.setItem(Lair.TUTOR_KEY, '1');       // the tour has its own test (lair.spec.js)
        const s = Game.dens()[0];
        s.layout = layout; s.seen = true; s.lairAmbush = { day: state.time.day, on: false };
        Game.enterSite(s);
    }, [layout, hour]);
    await expect(modal(page).locator('.lair-brief h3')).toContainText(await L(page, await page.evaluate(k => Lair.LEVELS[k].name, layout)));
    await modal(page).locator(`[onclick*="'solo'"]`).click();
    await expect(page.locator('#lair-view')).toHaveClass(/\bactive\b/);
    await page.waitForFunction(() => Lair.active && Lair.run() && Lair.run().t > 0);
}
async function act(page) {
    if(await page.evaluate(() => Game.isTouch())) await page.locator('#lair-act').tap();
    else await page.keyboard.press('e');
}
/** Beside tile (x, y), facing it, until the action button offers `label`. */
async function besideTile(page, x, y, label) {
    const want = await L(page, label);
    await page.evaluate(([x, y]) => Lair._place(x, y), [x, y]);
    await page.waitForFunction(want => { const c = Lair.run().ctx; return c && !c.blocked && c.label === want; }, want);
}
const objAt = (page, flag) => page.evaluate(flag => { const o = Lair.run().objs.find(o => o && o[flag]); return [o.x, o.y]; }, flag);
const msg = page => page.locator('#lair-goal .lmsg');
/** Holds a movement key until `until` (a function body over G) holds. */
async function walk(page, key, until) {
    await page.keyboard.down(key);
    try { await page.waitForFunction(until => new Function('G', 'return ' + until)(Lair.run()), until, { timeout: 5000 }); }
    finally { await page.keyboard.up(key); }
}
async function leave(page) {
    await page.evaluate(() => { if(Lair.active) { if(!Lair.run().done) Lair.retreat(); Lair.leave(); } Game.closeModal(); });
    await page.waitForFunction(() => !Lair.active);
}

test('every hideout opens from its card, names itself and runs', async ({ page }) => {
    test.setTimeout(120_000);
    await newGame(page);
    for(const key of await page.evaluate(() => Lair.DENS)) {
        await enterAt(page, key, key.length % 2 ? 12 : 23);    // a mix of day and night
        await page.waitForFunction(() => Lair.run().t > .5);
        expect(await page.evaluate(() => Lair.run().done)).toBe(false);
        await leave(page);
    }
});

test('a dog smells you in the dark; meat sends it eating, and an eating dog can be knocked out', async ({ page }) => {
    await newGame(page);
    await enterAt(page, 'farm');
    // the larder in the kitchen: two pieces of meat, and the throw button says so
    const [lx, ly] = await objAt(page, 'larder');
    await besideTile(page, lx, ly, 'Et al');
    await act(page);
    await page.waitForFunction(() => Lair.run().meat === 2);
    await expect(page.locator('#lair-throw')).toHaveText(await L(page, 'Et ({0})').then(t => t.replace('{0}', '2')));
    // the dog on the gate, asleep or not: the hero four steps off by its own path, behind it, meat
    // thrown at the hero's own feet — it comes over and eats
    await page.evaluate(() => {
        const G = Lair.run(), d = G.chars.find(g => g.dog && g.role === 'post');
        const free = (x, y) => G.grid[y] && G.grid[y][x] && !'#WfJ%|nYDXE '.includes(G.grid[y][x]) && !(G.objs[y * G.w + x] && G.objs[y * G.w + x].solid);
        const x0 = Math.floor(d.x / 32), y0 = Math.floor(d.y / 32), seen = new Map([[x0 + ',' + y0, 0]]), q = [[x0, y0]];
        let at = null;
        for(let i = 0; i < q.length && !at; i++) for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = q[i][0] + dx, y = q[i][1] + dy, k = x + ',' + y, n = seen.get(q[i][0] + ',' + q[i][1]) + 1;
            if(seen.has(k) || !free(x, y)) continue;
            seen.set(k, n); q.push([x, y]);
            if(n === 4) { at = [x, y]; break; }
        }
        const p = G.player; p.x = at[0] * 32 + 16; p.y = at[1] * 32 + 20; p.crouch = true;
        d.state = 'calm'; d.sus = 0; d.a = Math.atan2(d.y - p.y, d.x - p.x);   // looking away from the hero
        p.a = Math.atan2(d.y - p.y, d.x - p.x);
    });
    if(await page.evaluate(() => Game.isTouch())) await page.locator('#lair-throw').tap();
    else {
        const box = await page.locator('#lair-canvas').boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);   // throw at your own feet
        await page.keyboard.press('q');
    }
    await page.waitForFunction(() => Lair.run().meat === 1 && Lair.run().chars.some(g => g.dog && g.state === 'eat'));
    // while it eats, it's a takedown from any side
    await page.evaluate(() => { const d = Lair.run().chars.find(g => g.dog && g.state === 'eat'); d.eatT = 60; });
    await page.waitForFunction(() => { const d = Lair.run().chars.find(g => g.dog && g.state === 'eat'); return d && !d.path; }, null, { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => { const d = Lair.run().chars.find(g => g.dog && g.state === 'eat'); const p = Lair.run().player; p.x = d.x - 20; p.y = d.y; p.a = 0; });
    await page.waitForFunction(want => { const c = Lair.run().ctx; return c && !c.blocked && c.label === want; }, await L(page, 'Köpeği bayılt'));
    await act(page);
    await page.waitForFunction(() => Lair.run().chars.some(g => g.dog && (g.state === 'ko' || g.state === 'grabbed')));

    // the other dog, awake in the dark: it doesn't need light to find you
    await page.evaluate(() => {
        const G = Lair.run(), d = G.chars.find(g => g.dog && g.state !== 'ko' && g.state !== 'grabbed' && g.state !== 'eat');
        d.state = 'calm'; d.role = 'post'; d.path = null; d.route = null; d.sus = 0;
        const p = G.player; p.x = d.x + 40; p.y = d.y; p.crouch = true;
    });
    await page.waitForFunction(() => Lair.run().chars.some(g => g.dog && g.sus > 0 && g.state !== 'eat'));
    await leave(page);
});

test('a locked door opens to the key off a bandit\'s belt', async ({ page }) => {
    await newGame(page);
    await enterAt(page, 'dock');
    const door = await page.evaluate(() => { const d = Object.values(Lair.run().doors).find(d => d.keyed); return [d.x, d.y]; });
    // walking into it without the key: locked, and the message says who has it
    await page.evaluate(([x, y]) => { const p = Lair.run().player; p.x = (x - 1) * 32 + 16; p.y = y * 32 + 20; p.a = 0; }, door);
    await page.keyboard.down('d'); await page.waitForTimeout(500); await page.keyboard.up('d');
    await expect(msg(page)).toHaveText(await L(page, 'Kapı kilitli. Anahtar haydutlardan birinin kemerinde.'));
    // the harbourmaster sleeps at night: his key is a pickpocket's
    await page.evaluate(() => { const g = Lair.run().chars.find(g => g.key); const p = Lair.run().player; p.x = g.x - 24; p.y = g.y + 4; p.a = 0; });
    await page.waitForFunction(want => { const c = Lair.run().ctx; return c && !c.blocked && c.label === want; }, await L(page, 'Anahtarı çal'));
    await act(page);
    await page.waitForFunction(() => Lair.run().key === true);
    await expect(page.locator('#lair-keychip')).toBeVisible();
    await page.evaluate(([x, y]) => { const p = Lair.run().player; p.x = (x - 1) * 32 + 16; p.y = y * 32 + 20; p.a = 0; }, door);
    await walk(page, 'd', `G.doors['${door[0]},${door[1]}'].open`);
    await leave(page);
});

test('a bandit put down drops his key for the taking', async ({ page }) => {
    await newGame(page);
    await enterAt(page, 'keep', 12);
    await page.evaluate(() => { const g = Lair.run().chars.find(g => g.key); g.state = 'ko'; g.body = true; const p = Lair.run().player; p.x = g.x - 20; p.y = g.y; p.a = 0; });
    await page.waitForFunction(want => { const c = Lair.run().ctx; return c && !c.blocked && c.label === want; }, await L(page, 'Anahtarı al'));
    await act(page);
    await page.waitForFunction(() => Lair.run().key === true);
    await leave(page);
});

test('the bell calls every waking bandit to the tower', async ({ page }) => {
    await newGame(page);
    await enterAt(page, 'abbey', 12);
    const [bx, by] = await objAt(page, 'bell');
    await besideTile(page, bx, by, 'Çanı çal');
    await act(page);
    await expect(msg(page)).toHaveText(await L(page, 'Çan bütün inde yankılandı! Herkes çana koşuyor.'));
    // everyone awake and calm has heard it; the ones far off are on their way
    await page.waitForFunction(([bx, by]) => {
        const awake = Lair.run().chars.filter(g => g.kind === 'guard' && g.state !== 'sleep' && g.state !== 'ko' && g.role !== 'tower');
        return awake.length && awake.every(g => g.state !== 'calm' || Math.hypot(g.x - bx * 32, g.y - by * 32) < 80);
    }, [bx, by]);
    await leave(page);
});

test('sleepwort in the keg puts the dice table to sleep', async ({ page }) => {
    await newGame(page);
    await enterAt(page, 'tavern', 12);
    const [hx, hy] = await objAt(page, 'herbs');
    await besideTile(page, hx, hy, 'Uyku otu topla');
    await act(page);
    await page.waitForFunction(() => Lair.run().draught === 1);
    await expect(page.locator('#lair-herbchip')).toBeVisible();
    // the kitchen has bandits of its own: this test is about the keg, not getting caught carrying it
    await page.evaluate(() => Lair.run().chars.forEach(g => { if(g.kind === 'guard' && g.role !== 'dice') g.state = 'ko'; }));
    const [kx, ky] = await objAt(page, 'keg');
    await besideTile(page, kx, ky, 'Fıçıya uyku otu kat');
    await act(page);
    await page.waitForFunction(() => Lair.run().objs.some(o => o && o.keg && o.drugged) && Lair.run().drug);
    const dice = await page.evaluate(() => Lair.run().chars.filter(g => g.role === 'dice' && g.state !== 'ko').length);
    expect(dice).toBeGreaterThan(1);
    await page.evaluate(() => { Lair.run().drug.t = .2; });   // the herb's twelve seconds, wound forward
    await expect(msg(page)).toHaveText((await L(page, 'Fıçıdan içen {0} haydut uyuyakaldı.')).replace('{0}', String(dice)));
    expect(await page.evaluate(() => Lair.run().chars.filter(g => g.role === 'dice').every(g => g.state === 'sleep'))).toBe(true);
    await leave(page);
});

test('a cut rope drops the load on whoever stands under it', async ({ page }) => {
    await newGame(page);
    await enterAt(page, 'quarry', 12);
    const [cx, cy] = await objAt(page, 'cleat');
    await besideTile(page, cx, cy, 'Halatı kes');
    await act(page);
    await page.waitForFunction(() => Lair.run().objs.some(o => o && o.load && o.down));
    expect(await page.evaluate(() => Lair.run().kos)).toBeGreaterThan(0);   // the dice players sit right under it
    await leave(page);
});

test('a loosed bear goes for the bandits, and they turn on it', async ({ page }) => {
    await newGame(page);
    await enterAt(page, 'tamer');
    const [yx, yy] = await objAt(page, 'bearCage');
    await page.evaluate(() => Lair.run().chars.forEach(g => { if(g.dog) g.state = 'ko'; }));   // no nose on the hero for this one
    await besideTile(page, yx, yy, 'Ayının kafesini aç');
    await act(page);
    await page.waitForFunction(() => Lair.run().chars.some(c => c.kind === 'beast'));
    // the bear reaches a bandit and the bandits fight it, not the hero
    await page.waitForFunction(() => { const G = Lair.run(), b = G.chars.find(c => c.kind === 'beast'); return b.hp < b.maxHp || G.chars.some(g => g.kind === 'guard' && g.hp < g.maxHp); }, null, { timeout: 15000 });
    await leave(page);
});

test('deep water: the hero swims, can\'t fight there, and the bandits can\'t follow', async ({ page }) => {
    await newGame(page);
    await enterAt(page, 'swamp', 12);
    const spot = await page.evaluate(() => { const G = Lair.run(); for(let y = 0; y < G.h; y++) for(let x = 0; x < G.w; x++) if(G.grid[y][x] === '%' && G.grid[y][x + 1] === '%' && G.grid[y + 1][x] === '%' && y > 8 && x > 18) return [x, y]; });
    await page.evaluate(([x, y]) => { const p = Lair.run().player; p.x = x * 32 + 16; p.y = y * 32 + 20; }, spot);
    await page.waitForFunction(() => Lair.run().player.swim);
    await expect(page.locator('#lair-stance')).toHaveText(await L(page, 'Yüzüyor · zor görünür'));
    await page.keyboard.press(' ');
    await expect(msg(page)).toHaveText(await L(page, 'Yüzerken dövüşemezsin.'));
    // the bandits know where you are and still can't come in after you
    await page.evaluate(() => Lair.run().chars.forEach(g => { if(g.kind === 'guard' && g.state !== 'ko') { g.state = 'alert'; g.lastSeen = { x: Lair.run().player.x, y: Lair.run().player.y }; } }));
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => { const G = Lair.run(); return G.chars.filter(g => g.kind === 'guard' && G.grid[Math.floor(g.y / 32)][Math.floor(g.x / 32)] === '%').length; })).toBe(0);
    await leave(page);
});

test('a rock ledge is a one-way jump down', async ({ page }) => {
    await newGame(page);
    await enterAt(page, 'forest', 12);
    const top = await page.evaluate(() => { const G = Lair.run(); for(let y = 1; y < G.h - 2; y++) for(let x = 0; x < G.w; x++) if(G.grid[y + 1][x] === 'J' && G.grid[y][x] !== 'J' && !'#OTn'.includes(G.grid[y][x]) && G.grid[y + 2][x] !== 'J') return [x, y]; });
    await page.evaluate(([x, y]) => { const p = Lair.run().player; p.x = x * 32 + 16; p.y = y * 32 + 20; p.a = Math.PI / 2; }, top);
    await page.waitForFunction(want => { const c = Lair.run().ctx; return c && !c.blocked && c.label === want; }, await L(page, 'Aşağı atla'));
    await act(page);
    await page.waitForFunction(y => Math.floor(Lair.run().player.y / 32) === y + 2, top[1]);
    // from below the ledge is a wall: walking up stops at it
    await page.keyboard.down('w'); await page.waitForTimeout(500); await page.keyboard.up('w');
    expect(await page.evaluate(() => Math.floor(Lair.run().player.y / 32))).toBe(top[1] + 2);
    await leave(page);
});

test('the sluice lever drains the west pool', async ({ page }) => {
    await newGame(page);
    await enterAt(page, 'cistern');
    const deep = () => page.evaluate(() => { const [a, b, c, d] = Lair.LEVELS.cistern.lever.drains, G = Lair.run(); let n = 0; for(let y = b; y <= d; y++) for(let x = a; x <= c; x++) if(G.grid[y][x] === '%') n++; return n; });
    expect(await deep()).toBeGreaterThan(0);
    const [lx, ly] = await objAt(page, 'lever');
    // the west patrol starts its round at the lever: this one is about the water, not about him
    await page.evaluate(([lx, ly]) => Lair.run().chars.forEach(g => { if(g.kind === 'guard' && Math.hypot(g.x - lx * 32, g.y - ly * 32) < 6 * 32) { g.state = 'ko'; g.body = true; } }), [lx, ly]);
    await besideTile(page, lx, ly, 'Kolu çek');
    await act(page);
    await expect(msg(page)).toHaveText(await L(page, 'Savak açıldı: su çekiliyor, artık haydutlar da geçebilir.'));
    expect(await deep()).toBe(0);
    await leave(page);
});

test('a floor of bones gives you away even crouched', async ({ page }) => {
    await newGame(page);
    await enterAt(page, 'crypt', 12);
    const bone = await page.evaluate(() => { const G = Lair.run(); for(let y = 0; y < G.h; y++) for(let x = 1; x < G.w - 1; x++) if(G.grid[y][x] === ',' && G.grid[y][x + 1] === ',' && G.grid[y][x - 1] === ',') return [x, y]; });
    await page.evaluate(([x, y]) => { const p = Lair.run().player; p.x = (x - 1) * 32 + 16; p.y = y * 32 + 20; p.crouch = true; }, bone);
    await walk(page, 'd', `G.crunchTold`);
    await expect(msg(page)).toHaveText(await L(page, 'Kemikler ayağının altında çatırdadı!'));
    await leave(page);
});
