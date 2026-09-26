// Backing a lord in a map clash (#32, player report): two parties are fighting next to you,
// you tap the band, the game offers "🤝 Destek Ver" — and the lord's men should stand beside
// yours. Then the other half of the report: lose that fight, and the lord you backed must not
// march along with the band that carries you off.
const { test, expect, L, modal, modalBtn, okAlert, newGame, placeParty, tapWorld } = require('../fixtures');

/** A lord at peace with you and a human bandit band, 100 apart, your party just beside. */
function stageClash(page) {
    return page.evaluate(() => {
        const ally = state.npcParties.find(n => n.lordId && n.size > 0 && !Game.isHostile(n) && !Game.atWar(Game.playerFaction(), n.faction));
        const foe = state.npcParties.find(n => n.type === 'bandit' && n.size > 0 && !(BAND_KINDS[n.band] || {}).beast);
        foe.size = 12;
        // Held still for the setup; the lord gets its pace back once the fight is over
        ally._speed = ally.speed; ally.speed = 0; foe._speed = foe.speed; foe.speed = 0;
        foe.x = ally.x + 100; foe.y = ally.y;
        state.player.party = [1, 2, 3].map(i => ({ id: 'as' + i, name: 'Svadya Köylüsü', level: 1 }));
        return { ally: { id: ally.id, name: ally.name, size: ally.size, x: ally.x, y: ally.y }, foe: { id: foe.id, x: foe.x, y: foe.y } };
    });
}

/** Tap the band, answer the clash offer with "🤝 Destek Ver", land in the battle. */
async function backTheLord(page, clash) {
    await placeParty(page, clash.ally.x + 40, clash.ally.y + 60);
    await tapWorld(page, clash.foe);
    await expect(modal(page)).toContainText(await L(page, '⚔️ Çarpışma'), { timeout: 20_000 });
    await (await modalBtn(page, '🤝 Destek Ver')).click();
    await expect(page.locator('#battle-view')).toHaveClass(/\bactive\b/);
    await expect.poll(() => page.evaluate(() => Battle.battleTime)).toBeGreaterThan(0.3);
}

test('destek ver: yardım ettiğin lordun askerleri senin yanında savaşır', async ({ page }) => {
    await newGame(page);
    const clash = await stageClash(page);
    await backTheLord(page, clash);

    const sides = await page.evaluate(() => ({
        mine: Battle.units.filter(u => u.isPlayerTeam).length,
        own: state.player.party.length + 1,
    }));
    expect(sides.mine, `only your own ${sides.own} stand on your side — ${clash.ally.name}'s ${clash.ally.size} men never join`)
        .toBeGreaterThan(sides.own);
});

test('destekli savaşı kaybedince yardım ettiğin lord seni esir alanla birlikte yürümez', async ({ page }) => {
    await newGame(page);
    const clash = await stageClash(page);
    await backTheLord(page, clash);

    // Lose: everyone on your side falls
    await page.evaluate(() => Battle.units.forEach(u => { if(u.isPlayerTeam) u.hp = 0; }));
    await okAlert(page);                                   // "Yenildin! Esir düştün! …"
    await expect(page.locator('#map-view')).toHaveClass(/\bactive\b/);
    expect(await page.evaluate(() => state.player.status)).toBe('prisoner');
    expect(await page.evaluate(() => state.player.prisoner.npcId)).toBe(clash.foe.id);

    // The world moves on for a few in-game hours; the lord walks at its normal pace again
    const locked = await page.evaluate(({ allyId, foeId }) => {
        const ally = state.npcParties.find(n => n.id === allyId), foe = state.npcParties.find(n => n.id === foeId);
        ally.speed = ally._speed; foe.speed = foe._speed;
        let locked = 0;
        for(let i = 0; i < 600; i++) {
            Game.updateNPCs(Game.npcWorldDelta(0.1));
            // a chase is exact: the target IS the band's position, or bandTargetId names it
            if(ally.bandTargetId === foe.id || Math.hypot(ally.targetX - foe.x, ally.targetY - foe.y) < 1) locked++;
        }
        return locked;
    }, { allyId: clash.ally.id, foeId: clash.foe.id });
    expect(locked, `${clash.ally.name} kept marching on your captor for ${locked} of 600 ticks`).toBe(0);
});
