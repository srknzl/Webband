// A woman at the head of the party: picked at creation with her hair, and in battle with it.
// No other spec ever made the hero a woman — the coverage map showed the long hair (Swordsman's
// femHair) drawn by nothing, the very code the "hair flickers from behind" report was about.
const { test, expect, L, modal, painted } = require('../fixtures');

test('kahraman kadın: yaratılışta saçını seçer, savaşa o saçla girer', async ({ page }) => {
    await page.goto('/');
    await page.locator('#char-name').fill('Kalra');
    await page.locator('#start-btn').click();
    await modal(page).locator(`[onclick="Game.pickCreation('gender','female')"]`).click();
    // the hair button steps through the four styles and keeps the name written on it
    const hair = modal(page).locator('#cr-hair');
    for(const style of ['Saç topuzu', 'Örgü', 'Uzun saç']) {
        await hair.click();
        await expect(hair).toContainText(await L(page, 'Saç: {0}', await L(page, style)));
    }
    const steps = await page.evaluate(() => BACKGROUND.length);
    for(let i = 1; i < steps; i++) await modal(page).locator('[onclick^="Game.pickCreation"]').first().click();
    await modal(page).locator('[onclick^="Game.pickBanner"]').first().click();
    await modal(page).locator('[onclick="Game.diffStepDone()"]').click();
    await modal(page).locator('[onclick="Game.finishCreation()"]').click();
    await expect(page.locator('#main-ui')).toHaveClass(/\bactive\b/);
    expect(await page.evaluate(() => [state.player.background.gender, state.player.background.hair])).toEqual(['female', 'long']);

    // a two-man band next to her, and the fight
    await page.evaluate(() => {
        Game.setOpt('muted', true);
        const b = state.npcParties.find(n => n.type === 'bandit' && !(BAND_KINDS[n.band] || {}).beast);
        Object.assign(b, { size: 2, x: state.player.x + 70, y: state.player.y, speed: 0 });
        Game.triggerEncounter(b);
    });
    await modal(page).locator('button[onclick*="Battle.start"]').click({ timeout: 20_000 });
    await expect(page.locator('#battle-view')).toHaveClass(/\bactive\b/);
    const look = await page.evaluate(() => { const l = Battle.spriteLook(Battle.units.find(u => u.id === 'player')); return l && (l.rider || l); });
    expect(look && [look.fem, look.hairStyle]).toEqual([true, 'long']);
    await expect.poll(() => page.evaluate(() => Battle.battleTime)).toBeGreaterThan(1.5);
    expect(await painted(page)).toBeGreaterThan(1);
    await page.evaluate(() => Battle.units.forEach(u => { if(!u.isPlayerTeam) u.hp = 0; }));
    await expect(modal(page).locator('#bres-tab-ozet')).toBeVisible();
});

// The flicker (2.2.1): from behind, a few frames show an ear or the neck, those pixels were read
// as the face, the skull shrank to a sliver and the hair jumped to a spike for a frame. Measured
// as the area the hair adds over the same man's frame: within one animation and facing it moves
// by up to ~20 px with the sway and the swing; on the broken frames it fell 60-80 px below the
// row's median. Every style, armour, animation, facing and frame.
test('kahraman kadın: saç hiçbir karede, hiçbir yönde sıçramaz', async ({ page }) => {
    test.skip(test.info().project.name !== 'tr-desktop', 'the pixels are the same in every project');
    await page.goto('/');
    await page.waitForFunction(() => { Swordsman.load(); return Swordsman.ready(); });
    const jumps = await page.evaluate(() => {
        const area = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for(let i = 3; i < d.length; i += 4) if(d[i]) n++; return n; };
        const out = [];
        for(const style of ['tail', 'bun', 'braid', 'long']) for(const armor of [1, 2, 3])
            for(const anim of Object.keys(Swordsman.ANIM).filter(a => a !== 'Death')) for(const dir of ['down', 'left', 'right', 'up']) {
                const A = Swordsman.ANIM[anim], n = anim === 'Idle' && dir === 'up' ? 4 : A.n, add = [];
                const man = { armor, weapon: 1, helm: '', skin: 0, hair: 3, cloth: 'player' }, woman = Object.assign({}, man, { fem: true, hairStyle: style });
                for(let f = 0; f < n; f++) add.push(area(Swordsman.art(woman, anim, dir, f * A.ms + 1)) - area(Swordsman.art(man, anim, dir, f * A.ms + 1)));
                const med = add.slice().sort((a, b) => a - b)[add.length >> 1];
                add.forEach((a, f) => { if(Math.abs(a - med) > 45) out.push(`${style} armour ${armor} ${anim} ${dir} frame ${f}: ${a} px vs the row's ${med}`); });
            }
        return out;
    });
    expect(jumps).toEqual([]);
});
