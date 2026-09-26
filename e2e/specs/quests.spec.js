// Quest life cycle through the real screens: offer → accept → objective → "done, go hand
// it in" (#106/#107) → hand-in → reward. The only shortcuts are world setup: which quest
// the giver offers is pinned (the game's own `questOffers` pin), and walking to a gate is
// replaced by arriving at it — map travel has its own test.
const { test, expect, L, modal, modalBtn, okAlert, openView, newGame, enter, actionBtn, quietCity } = require('../fixtures');

/** The market (2.0.0): pick the good's tile, type how many, press the trade panel's buy button. */
async function buy(page, id, n) {
    await modal(page).locator(`#mrow-buy-${id}`).click();
    const qty = modal(page).locator('#mkt-qty');
    await qty.fill(String(n));
    await qty.press('Tab');                       // the stepper applies on change
    await modal(page).locator('.mp-go').click();
}

const strip = s => s.replace(/<[^>]+>/g, '');

/** Pins the quest `id` as what `giverId` will offer, and returns what the test needs to know. */
function pinOffer(page, id, giverId) {
    return page.evaluate(([id, giverId]) => {
        const q = Quests.make(id, giverId);
        (state.questOffers = state.questOffers || {})[giverId] = q;
        const d = QUESTS[id];
        return { data: q.data, title: d.title, reward: d.reward };
    }, [id, giverId]);
}

/** The "done — here is how you collect" line every finished quest must show. */
async function turnInHint(page, reward) {
    return strip(await L(page, 'Ödül: <b>+{0} dinar, {1}{2} nam</b>. Konuşma penceresinde <b>✅ Görevi teslim et</b> düğmesine bas.',
        reward.money, reward.renown > 0 ? '+' : '', reward.renown));
}

/** The reward alert's first line: title, money, renown. */
function paidLine(page, title, reward) {
    return L(page, '✅ Görev tamamlandı: {0}\n\n+{1} dinar, {2}{3} nam', title, reward.money, reward.renown > 0 ? '+' : '', reward.renown);
}

/** The turn-in dot has to sit on a button the player can actually see — on a phone the
 *  Quests tab lives behind "⋯ Daha". */
const turnInDot = page => page.locator('#sidebar .menu-btn.has-turnin:visible');

/** Opens the quest screen and returns the card of the quest titled `title`. */
async function questCard(page, title) {
    await openView(page, 'quests');
    return page.locator('#quest-list > div').filter({ hasText: title });
}

test('lonca görevi: teklif, kabul, pazardan alım, teslim, ödül', async ({ page }) => {
    await newGame(page);
    const city = await quietCity(page);
    await page.evaluate(() => { state.player.money = 20000; Game.updateTopBar(); });
    const q = await pinOffer(page, 'guild_supply', 'guild_' + city);
    const title = await L(page, q.title);

    // Offer at the tavern's guild master
    await enter(page, city);
    await (await actionBtn(page, '🍺 Hana Gir')).click();
    await (await modalBtn(page, 'İşi Sor')).click();
    await expect(modal(page)).toContainText(title);
    await expect(modal(page)).toContainText(await L(page, '{0} dinar', q.reward.money));
    await (await modalBtn(page, 'Kabul Ediyorum')).click();
    expect(await okAlert(page)).toContain(title);

    // Quest screen: listed, with its clock and progress
    let card = await questCard(page, title);
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(await L(page, '{0} gün kaldı', await page.evaluate(() => {
        const x = state.player.quests[0]; return x.deadline - state.time.day;
    })));
    await expect(card).toContainText(`0/${q.data.need}`);
    await expect(turnInDot(page)).toHaveCount(0);

    // Objective: buy the goods at the market, then walk in through the gate with them
    await enter(page, city);
    await (await actionBtn(page, '🛒 Pazara Git')).click();
    await buy(page, q.data.item, q.data.need);
    await expect(modal(page).locator(`#mrow-buy-${q.data.item}`)).toContainText(await L(page, 'sende {0}', q.data.need));
    await (await modalBtn(page, 'Kapat')).click();
    await (await actionBtn(page, '🚪 Ayrıl')).click();
    await enter(page, city);

    // "Done" is its own moment: the title, and exactly how to collect
    const done = await okAlert(page);
    expect(done).toContain(`✅ ${title}`);
    expect(done).toContain(await turnInHint(page, q.reward));
    await expect(turnInDot(page)).toHaveCount(1);

    // Still inside the gate: the guild master's "ask for work" button is now the hand-in
    const before = await page.evaluate(() => state.player.money);
    await (await actionBtn(page, '🍺 Hana Gir')).click();
    const handIn = await modalBtn(page, '✅ Görevi teslim et: {0}', title);
    await expect(handIn).toHaveClass(/\bprimary\b/);
    await handIn.click();
    const paid = await okAlert(page);
    expect(paid).toContain(await paidLine(page, title, q.reward));
    expect(await page.evaluate(() => state.player.money)).toBe(before + q.reward.money);
    await expect(page.locator('#ui-money')).toHaveText(String(before + q.reward.money));

    await expect(turnInDot(page)).toHaveCount(0);
    await expect(await questCard(page, title)).toHaveCount(0);
});

/** A lord who gives `questId`, standing in his own hall. */
function lordAtHome(page, questId) {
    return page.evaluate(questId => {
        const givers = QUESTS[questId].givers;
        const l = LORDS.find(l => (!givers.length || givers.includes(l.personality)) && Nobles.partyOf(l.id)
            && ['city', 'castle'].includes((LOCATIONS.find(x => x.id === l.homeLocId) || {}).type));
        const home = LOCATIONS.find(x => x.id === l.homeLocId);
        Object.assign(Nobles.partyOf(l.id), { x: home.x, y: home.y });
        return { id: l.id, name: l.name, home: home.id };
    }, questId);
}

async function talkInHall(page, lord) {
    await enter(page, lord.home);
    await (await actionBtn(page, '👑 Lordlar Salonuna Git')).click();
    await modal(page).getByRole('button', { name: await L(page, lord.name), exact: true }).click();
    await expect(modal(page).locator('h3').first()).toHaveText(await L(page, lord.name));
}

test('lord görevi: salonda al, pazarda bitir, haritada karşılaşınca teslim et', async ({ page }) => {
    await newGame(page);
    await page.evaluate(() => { state.player.money = 20000; Game.updateTopBar(); });
    const lord = await lordAtHome(page, 'butter_blockade');
    const q = await pinOffer(page, 'butter_blockade', lord.id);
    const title = await L(page, q.title);

    await talkInHall(page, lord);
    await (await modalBtn(page, '📜 Bana bir iş var mı?')).click();
    await expect(modal(page)).toContainText(title);
    await (await modalBtn(page, 'Kabul Ediyorum')).click();
    expect(await okAlert(page)).toContain(title);

    // The objective finishes inside the market: the "done" notice must still reach the player
    await (await actionBtn(page, '🚪 Ayrıl')).click();
    await enter(page, q.data.locId);
    await (await actionBtn(page, '🛒 Pazara Git')).click();
    await buy(page, 'cheese', q.data.need);
    const done = await okAlert(page);
    expect(done).toContain(`✅ ${title}`);
    expect(done).toContain(await L(page, lord.name));
    expect(done).toContain(await turnInHint(page, q.reward));

    // Finished quests float to the top of the list, marked, with nothing left to abandon
    await (await actionBtn(page, '🚪 Ayrıl')).click();
    await expect(turnInDot(page)).toHaveCount(1);
    expect(await page.evaluate(id => Quests.targets()[id][0].done, lord.home)).toBe(true);   // ✅ map pin
    const card = await questCard(page, title);
    await expect(card).toContainText(await L(page, 'Teslime hazır'));
    await expect(card.getByRole('button', { name: await L(page, 'Vazgeç') })).toHaveCount(0);
    await openView(page, 'map');

    // Meeting the lord's party on the map opens his dialogue — the hand-in is right there
    const rel = await page.evaluate(id => Nobles.rel(id), lord.id);
    await page.evaluate(id => Game.triggerEncounter(Nobles.partyOf(id)), lord.id);
    await (await modalBtn(page, '✅ Görevi teslim et: {0}', title)).click();
    const paid = await okAlert(page);
    expect(paid).toContain(await paidLine(page, title, q.reward));
    expect(paid).toContain(await L(page, ', {0} ile +{1} ilişki.', await L(page, lord.name), q.reward.rel));
    expect(await page.evaluate(id => Nobles.rel(id), lord.id)).toBe(rel + q.reward.rel);
    await expect(turnInDot(page)).toHaveCount(0);
});

test('bitmiş görev, verenin bulunduğu şehre girince kendiliğinden teslim edilir', async ({ page }) => {
    await newGame(page);
    const lord = await lordAtHome(page, 'butter_blockade');
    // Accepted and finished off-screen — the objective path is covered above
    const q = await page.evaluate(id => {
        const q = Quests.make('butter_blockade', id);
        state.player.quests.push(q);
        Quests.markDone(q);
        const d = QUESTS.butter_blockade;
        return { title: d.title, reward: d.reward, money: d.reward.money, at: q.turnInLocId };
    }, lord.id);
    await okAlert(page);
    expect(q.at).toBe(lord.home);

    const before = await page.evaluate(() => state.player.money);
    await enter(page, lord.home);
    expect(await okAlert(page)).toContain(await paidLine(page, await L(page, q.title), q.reward));
    expect(await page.evaluate(() => state.player.money)).toBe(before + q.money);
    expect(await page.evaluate(() => state.player.quests.length)).toBe(0);
});

test('görevden vazgeçmek görevi düşürür ve ilişkiyi keser', async ({ page }) => {
    await newGame(page);
    const lord = await lordAtHome(page, 'butter_blockade');
    const q = await pinOffer(page, 'butter_blockade', lord.id);
    const title = await L(page, q.title);
    await talkInHall(page, lord);
    await (await modalBtn(page, '📜 Bana bir iş var mı?')).click();
    await (await modalBtn(page, 'Kabul Ediyorum')).click();
    await okAlert(page);
    await page.evaluate(() => Game.closeModal());

    const rel = await page.evaluate(id => Nobles.rel(id), lord.id);
    await (await questCard(page, title)).getByRole('button', { name: await L(page, 'Vazgeç') }).click();
    const text = await okAlert(page);
    expect(text).toContain(`❌ ${title}`);
    expect(text).toContain(await L(page, 'Görevden vazgeçtin.'));
    expect(await page.evaluate(id => Nobles.rel(id), lord.id)).toBe(rel - 10);
    await expect(await questCard(page, title)).toHaveCount(0);
});
