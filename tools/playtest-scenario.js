// Playtest scenario (#132) — NOT a node script like the rest of tools/: this is meant to be
// pasted into the browser DevTools console while the real game is loaded and running.
//
// Sets up a level-6 character with a horse, sword, and medium-high war skills, a 30-troop
// army (10 infantry / 10 cavalry / 10 archers, Swadya's top tier of each), and spawns all
// 4 unique bosses on the map — a realistic mid-campaign save to manually test combat
// balance and mounted movement/camera changes against, rather than a fresh level-1 start.
//
// How to use: open the game, click through character creation once (any answers — this
// overwrites them all), reach the map screen, open the console (F12 / Cmd+Option+I), paste
// this whole file, press Enter. It saves itself to manual slot 1 when done.
(function() {
    const s = state.player;

    // Level 6, attributes leaning combat, fully "trained" (eff == target) so there's no
    // ramp-up needed to feel the character's real strength immediately.
    s.stats.level = 6; s.stats.xp = 200; s.stats.xpNext = 759;
    s.stats.str = 15; s.stats.agi = 13; s.stats.int = 10; s.stats.cha = 12; s.stats.vit = 13;
    s.stats.eff = { str: 15, agi: 13, int: 10, cha: 12, vit: 13 };
    s.stats.attributePoints = 0; s.stats.focusPoints = 0;

    // Medium-high war skills: one-handed weapon comfortably past "competent," a fair bit
    // of riding (mounted speed bonus scales with it), some athletics, a little leadership
    // for a 30-strong army.
    const setProf = (id, level) => { s.proficiencies[id] = { level, xp: 0, next: Math.floor(100 * Math.pow(1.2, level - 1)), focus: 0 }; };
    setProf('oneHanded', 50);
    setProf('riding', 30);
    setProf('athletics', 20);
    setProf('leadership', 15);

    // Horse + sword, plus enough armor to actually survive a boss fight.
    s.equipment.weapon = { ...ITEMS.sword, qty: 1 };
    s.equipment.shield = { ...ITEMS.shield, qty: 1 };
    s.equipment.armor  = { ...ITEMS.mail, qty: 1 };
    s.equipment.helmet = { ...ITEMS.nasal, qty: 1 };
    s.equipment.horse  = { ...ITEMS.horse, qty: 1 };
    Game.updateStatsFromEquip();
    s.stats.hp = s.stats.maxHp;

    // 30-troop army: 10 infantry, 10 cavalry, 10 archers, Swadya's top tier of each
    // (medium-to-high quality), levels spread 12-22 like a real campaign roster would be.
    s.party = [];
    const addTroop = (name, count) => {
        for(let i = 0; i < count; i++) {
            let lvl = 12 + Math.floor(Math.random() * 11);
            s.party.push({ id: 'party_' + Math.random().toString(36).slice(2, 10), name, level: lvl,
                xp: Math.floor(Math.random() * (3 + lvl)), xpNext: 3 + lvl });
        }
    };
    addTroop('Svadya Çavuşu', 10);          // infantry
    addTroop('Svadya Şövalyesi', 10);       // cavalry
    addTroop('Svadya Keskin Nişancısı', 10); // archers

    // Money, renown (past all 4 boss gates: 60/130/200/280, short of the 300 tribute gate),
    // a campaign day, and food so the army isn't starving the moment you take over.
    s.money = 3000;
    s.renown = 285;
    state.time.day = 40;
    s.inventory = s.inventory.filter(i => i.id !== 'bread');
    s.inventory.push({ ...ITEMS.bread, qty: 30 }, { ...ITEMS.cheese, qty: 15 });

    Game.ensureBosses();   // spawns Kurt Ana / Bozkır Hanı / Demirci Dev / Korsan Kral now that renown qualifies
    Game.updateTopBar();
    Save.save('1');
    alert('Sahne hazır ve Slot 1\'e kaydedildi. Haritada 4 boss işareti aramaya başlayabilirsin.');
})();
