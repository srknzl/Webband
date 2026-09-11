#!/usr/bin/env node
// ============================================================
// test.js — saf mantık testleri + dünya/ekonomi eşikleri (#63)
// ------------------------------------------------------------
// Depoda hiç test yoktu: sessiz denge kaybı görünmüyordu (#47'de erzak
// fiyatının "on kat ucuzlasın" kararı uygulanmadan aylarca öyle kaldı).
// Burada iki ayrı iş var, ikisi de oyunun **kendi** kodunu koşturur:
//
//   1. Saf mantık — girdi/çıktı tablosu belli fonksiyonlar (hasar, maaş,
//      vergi, moral, kapasite, esir değeri, erzak, kare kapısı, kayıt göçü).
//      Sayılar CLAUDE.md'deki "Ölçüldü" satırlarının kendisidir; biri
//      değişirse ya kod ya belge yanlış demektir.
//   2. Eşikler — 200 günlük oyuncusuz dünya ve 60 günlük ekonomi betikleri.
//      Kesin sayı beklenmez (dünya rastgeledir), **aralık** beklenir: fetih
//      hiç olmaması da 20 olması da bozuk demektir.
//
//   node tools/test.js            # hepsi
//   node tools/test.js --hizli    # yalnız saf mantık (eşikler ~5 sn sürer)
// ============================================================
'use strict';
const assert = require('assert');
const H = require('./harness');

const results = [];
function test(name, fn) {
    try { fn(); results.push({ name, ok: true }); }
    catch(e) { results.push({ name, ok: false, msg: e.message.split('\n')[0] }); }
}
// Aralık iddiası: dünya rastgele olduğu için tek sayı beklenmez.
function between(actual, lo, hi, what) {
    assert.ok(actual >= lo && actual <= hi, `${what}: ${actual} ∉ [${lo}, ${hi}]`);
}

// ---------- 1. Saf mantık ----------
// Tek yükleme yeter: bu fonksiyonların hepsi `state`i okur, hiçbiri dünyaya
// (yerleşim dağıtımı, NPC) ihtiyaç duymaz. Testler state'i kendi kurar.
const g = H.load({ seed: 1 });
const { Game, Battle, Save, state } = g;

// Oyuncuyu bilinen bir başlangıca döndürür — testler birbirinin state'ini görmesin
function reset() {
    const p = state.player;
    p.party = []; p.prisoners = []; p.inventory = []; p.money = 250; p.renown = 0;
    p.wageDebt = 0; p.morale = 60;
    p.stats = { level: 1, str: 10, agi: 10, int: 10, cha: 10, vit: 10, eff: {} };
    p.proficiencies = { leadership: { level: 1, xp: 0 } };
    state.locations = undefined;
    return p;
}
const troop = (level, extra) => Object.assign({ id: 't' + level, name: 'Asker', level, type: 'infantry' }, extra);

test('afterArmor: zırhsız hedefte tür çarpanı (30 ham)', () => {
    assert.strictEqual(Battle.afterArmor('cut', 30, 0), 30);
    assert.strictEqual(Battle.afterArmor('pierce', 30, 0), 27);
    assert.strictEqual(Battle.afterArmor('blunt', 30, 0), 24);
});
test('afterArmor: zırh arttıkça delici öne geçer (def 25)', () => {
    assert.strictEqual(Battle.afterArmor('cut', 30, 12), 18);
    assert.strictEqual(Battle.afterArmor('pierce', 30, 12), 21);
    assert.strictEqual(Battle.afterArmor('blunt', 30, 12), 16);
    assert.strictEqual(Battle.afterArmor('cut', 30, 25), 5);
    assert.strictEqual(Battle.afterArmor('pierce', 30, 25), 15);
    assert.strictEqual(Battle.afterArmor('blunt', 30, 25), 8);
});
test('afterArmor: taban 1, bilinmeyen tür kesici sayılır', () => {
    assert.strictEqual(Battle.afterArmor('cut', 5, 100), 1);
    assert.strictEqual(Battle.afterArmor('sihir', 30, 12), Battle.afterArmor('cut', 30, 12));
});

test('troopWage: kademeler', () => {
    assert.strictEqual(Game.troopWage(troop(5)), 0);        // acemi bedava
    assert.strictEqual(Game.troopWage(troop(10)), 2);
    assert.strictEqual(Game.troopWage(troop(19)), 2);
    assert.strictEqual(Game.troopWage(troop(20)), 10);      // lvl/2
    assert.strictEqual(Game.troopWage(troop(30)), 15);
    assert.strictEqual(Game.troopWage(troop(51)), 0);       // Efsanevi
    assert.strictEqual(Game.troopWage(troop(1, { isCompanion: true })), 20);
});

test('fiefTax: şehir ×2, kale ×0.7, köy ×1', () => {
    assert.strictEqual(Game.fiefTax({ type: 'city', prosperity: 55 }), 110);
    assert.strictEqual(Game.fiefTax({ type: 'castle', prosperity: 64 }), 45);
    assert.strictEqual(Game.fiefTax({ type: 'village', prosperity: 40 }), 40);
    assert.strictEqual(Game.fiefTax({ type: 'city' }), 100);   // refahı olmayan eski kayıt
});

test('getPartyCapacity: yeni karakter 12 kişi', () => {
    const p = reset();
    assert.strictEqual(Game.getPartyCapacity(), 12);
    p.stats.eff.cha = 13;                      // +3 kapasite
    assert.strictEqual(Game.getPartyCapacity(), 21);
    p.proficiencies.leadership.level = 3;      // +8
    assert.strictEqual(Game.getPartyCapacity(), 29);
    p.renown = 120;                            // +3
    assert.strictEqual(Game.getPartyCapacity(), 32);
});
test('getPartyCapacity: kesirli nitelik kaynağında kırpılır (#43)', () => {
    const p = reset();
    p.stats.eff.cha = 11.9286;
    assert.strictEqual(Game.getPartyCapacity() % 1, 0);
    assert.strictEqual(Game.getPartyCapacity(), 17);   // floor(1.9286*3) = 5
});

test('prisonerValue: tür çarpanı, soylu fidyesi', () => {
    assert.strictEqual(Game.prisonerValue({ level: 10, type: 'infantry' }), 145);
    assert.strictEqual(Game.prisonerValue({ level: 10, type: 'archer' }), 174);
    assert.strictEqual(Game.prisonerValue({ level: 10, type: 'cavalry' }), 217);
    assert.strictEqual(Game.prisonerValue({ noble: true, ransom: 3200 }), 3200);
});

test('moraleTarget: kalemler toplanır, 0-100 arası kırpılır', () => {
    const p = reset();
    assert.strictEqual(Game.moraleTarget(true, false), 50);            // yalnız taban
    p.inventory = [{ id: 'wheat', qty: 5 }, { id: 'meat', qty: 5 }];
    assert.strictEqual(Game.moraleTarget(true, false), 60);            // 2 çeşit × 5
    assert.strictEqual(Game.moraleTarget(true, true), 30);             // açlık −30
    p.proficiencies.leadership.level = 5;
    assert.strictEqual(Game.moraleTarget(true, false), 72);            // İdare (5−1)×3
    p.party = Array.from({ length: 40 }, (_, i) => troop(1, { id: 'x' + i }));
    assert.strictEqual(Game.getPartyCapacity(), 28);
    assert.strictEqual(Game.moraleTarget(true, false), 48);            // kapasite aşımı 12×2
});
test('moraleTarget: maaş borcu büyüdükçe hedef düşer, taban 40', () => {
    const p = reset();
    p.party = [troop(20)];                     // maaş 10₺/gün
    p.wageDebt = 10;
    assert.strictEqual(Game.moraleTarget(false, false), 30);   // 50 − (10 + 1×10)
    p.wageDebt = 10000;
    assert.strictEqual(Game.moraleTarget(false, false), 10);   // ceza 40'ta durur
});

test('foodStock: gün sayısı bozulmayı da sayar', () => {
    const p = reset();
    p.party = Array.from({ length: 10 }, (_, i) => troop(10, { id: 'f' + i }));  // 10 × yarım birim/gün
    p.inventory = [{ id: 'wheat', qty: 60 }];
    const fs = Game.foodStock();
    assert.strictEqual(fs.low, 60);
    assert.strictEqual(fs.need, 6);                   // 10 asker × FOOD_MAN 0.5 + oyuncunun kendisi 1
    assert.strictEqual(fs.kinds, 1);
    assert.strictEqual(fs.spoil, 1);                  // 60 tahıl / 60 gün dayanıklılık
    assert.strictEqual(fs.days, 8);                   // 60 / (6 + 1)
});
test('foodStock: seçkin asker et ister, çeşit sayılır', () => {
    const p = reset();
    p.party = [troop(30), troop(30)];
    p.inventory = [{ id: 'wheat', qty: 10 }, { id: 'meat', qty: 10 }];
    const fs = Game.foodStock();
    assert.strictEqual(fs.need, 3);                   // 2 × 0.75 + oyuncu 1, yukarı yuvarlanır
    assert.strictEqual(fs.needHigh, 1);               // lvl 30+ başına yarım et
    assert.strictEqual(fs.high, 10);
    assert.strictEqual(fs.kinds, 2);
});
test('foodStock: boş envanter 0 gün, sonsuza gitmez', () => {
    const p = reset();
    p.party = [troop(10)];
    assert.strictEqual(Game.foodStock().days, 0);
});

// Kare kapısı: tazeleme hızı → geçen fps. Kural "60 fps'in altına düşürmeyen
// en büyük tam bölen". framegate.js bunu tablo olarak yazar, burada eşiktir.
function gateFps(hz, seconds = 2, opts) {
    const { Game } = H.load({ seed: 1 });
    if(opts) Object.assign(Game.OPTS, opts);
    const step = 1000 / hz;
    let passed = 0;
    for(let i = 0; i < hz * seconds; i++) if(!Game.skipFrame(i * step)) passed++;
    return +(passed / seconds).toFixed(1);
}
test('skipFrame: 60 fps altına düşürmeyen en büyük bölen', () => {
    assert.strictEqual(gateFps(60), 60);
    assert.strictEqual(gateFps(75), 75);
    assert.strictEqual(gateFps(90), 90);
    assert.strictEqual(gateFps(120), 60);
    assert.strictEqual(gateFps(144), 72);
    assert.strictEqual(gateFps(180), 60);
    assert.strictEqual(gateFps(240), 60);
});
test('skipFrame: aynı karede iki döngü aynı cevabı alır (#42)', () => {
    // Ayrık cevap, döngülerden birini kalıcı olarak aç bırakır: ekran siyah kalır.
    for(const hz of [60, 120, 144, 165, 240]) {
        const { Game } = H.load({ seed: 1 });
        const step = 1000 / hz;
        let ayrik = 0;
        for(let i = 0; i < hz * 2; i++) {
            const t = i * step;
            if(Game.skipFrame(t) !== Game.skipFrame(t)) ayrik++;   // harita + savaş döngüsü
        }
        assert.strictEqual(ayrik, 0, `${hz} Hz'te ${ayrik} ayrık cevap`);
    }
});
test('skipFrame: hafif mod hedefi 30 fps (#80)', () => {
    assert.strictEqual(gateFps(60, 2, { lite: true }), 30);
    assert.strictEqual(gateFps(120, 2, { lite: true }), 30);
});
test('skipFrame: bozuk tek örnek kapıyı kilitlemez', () => {
    // Bu testin sebebi bir telefon raporu: iOS sayfayı kaydırırken iki rAF'ı
    // ~2 ms arayla teslim ediyor. Tahmin edici "tüm zamanların en küçüğü" olduğu
    // için değer 2 ms'e KALICI olarak kilitleniyor, bölen 1000/30/2 = 16 oluyor
    // ve oyun 60 Hz ekranda 3.79 fps'te dönüyordu — oynanamaz.
    const { Game } = H.load({ seed: 1 });
    Object.assign(Game.OPTS, { lite: true });            // hafif mod: hedef 30 fps
    let t = 0;
    for(let i = 0; i < 120; i++) { t += (i === 100 || i === 101) ? 2 : 1000 / 60; Game.skipFrame(t); }
    let t0 = t, ciz = 0;
    for(let i = 0; i < 600; i++) { t += 1000 / 60; if(!Game.skipFrame(t)) ciz++; }
    const fps = ciz / ((t - t0) / 1000);
    assert.ok(fps > 25, `bozuk örnekten sonra ${fps.toFixed(2)} fps — kapı kilitlendi`);
});
test('skipFrame: kapı ayardan kapatılınca hiç kare atılmaz', () => {
    assert.strictEqual(gateFps(240, 2, { frameGate: false }), 240);
});

test('Save.migrate: v1 → v2 göçü', () => {
    const d = {
        savedAt: 1700000000000,
        state: {
            explored: [[1, 2, 3]],
            muted: true,
            player: { party: [{ name: 'Efsanevi Svadya Şövalyesi', level: 51 }, { name: 'Svadya Milisi', level: 10 }] }
        }
    };
    Save.migrate(d);
    assert.strictEqual(d.v, 2);
    assert.strictEqual(d.state.explored, undefined);          // savaş sisi kaldırıldı
    assert.strictEqual(d.state.player.party[0].name, 'Svadya Şövalyesi');
    assert.strictEqual(d.state.player.party[0].legendary, true);
    assert.strictEqual(d.state.player.party[1].legendary, undefined);
    assert.strictEqual(d.state.settings.muted, true);         // ayarlara taşındı
    assert.strictEqual(d.state.meta.v, 2);
    assert.strictEqual(d.state.meta.createdAt, 1700000000000);
    assert.strictEqual(d.state.meta.gocEdildi, true);
});
test('Save.migrate: güncel kayda dokunmaz', () => {
    const d = { v: 2, state: { player: { party: [] }, meta: { v: 2, createdAt: 1, playtime: 99 } } };
    Save.migrate(d);
    assert.strictEqual(d.state.meta.playtime, 99);
});

// --- Harita hızı (#72) ---
// Atlı/yaya farkı 1.5×'i aşmamalı. Kritik nokta: grup bonusu paydada durduğu için
// atlılık *toplama* olursa oran grup büyüdükçe kayar (eski kodda 2.1× → 2.6×).
// Bu yüzden tek bir grupta değil, ceza eğrisinin her bölgesinde ölçülür.
test('hız: atlı/yaya farkı her grup büyüklüğünde 1.5× ile sınırlı', () => {
    const hiz = (mounted, size) => {
        // Sınıf `t.type`'tan değil TROOP_TYPES[t.name]'den okunur (troopStats)
        state.player.party = Array.from({ length: size - 1 }, (_, i) =>
            ({ id: 'h' + i, name: mounted ? 'Svadya Süvarisi' : 'Svadya Milisi', level: 1 }));
        state.player.equipment.horse = mounted ? { id: 'horse', name: 'At' } : null;
        return Game.getPlayerSpeed().value;
    };
    [1, 5, 10, 20, 40, 65].forEach(size => {
        const oran = hiz(true, size) / hiz(false, size);
        assert.ok(Math.abs(oran - 1.5) < 0.001, `${size} kişilik grupta atlı/yaya farkı ${oran.toFixed(2)}×`);
    });
    state.player.party = [];
    state.player.equipment.horse = null;
});

// --- Modal kapatma kapısı (#70) ---
// Esc, dışa tıklama ve × aynı kapıdan (canDismiss) sorar; closeModal sormaz.
// Bu ayrım önemli: karşılaşma penceresinin kendi düğmeleri ("Yoluna Bırak",
// "Teslim Ol") pencereyi currentEncounterNpcId hâlâ doluyken kapatır — closeModal
// da sorsaydı o pencere savaşın arkasında açık kalırdı.
test('modal: karşılaşma penceresi kullanıcı elinden kapanmaz, kendi düğmesinden kapanır', () => {
    const doc = g._sandbox.document;
    const overlay = () => doc.getElementById('modal-overlay').classList.contains('hidden');

    state.player.currentEncounterNpcId = null;
    Game.showModal('<p>sıradan</p>');
    Game.dismissModal();
    assert.ok(overlay(), 'sıradan pencere × ile kapanmadı');

    state.player.currentEncounterNpcId = 'npc_test';
    Game.showModal('<p>karşılaşma</p>');
    Game.dismissModal();
    assert.ok(!overlay(), 'karşılaşma penceresi kullanıcı elinden kapandı');
    Game.closeModal();
    assert.ok(overlay(), 'karşılaşmanın kendi düğmesi pencereyi kapatamadı');
    state.player.currentEncounterNpcId = null;
});

// --- Savaş hızı dengesi ---
// Hız zincirinin dört halkası oyuncu ile yapay zekâda farklı işliyordu; düzeltirken
// eski "okçu sonsuza dek kaçar" hatasını geri getirmek en büyük risk. Testler o iki
// ucu birden tutar: kaçış mümkün olmalı, ama kimse ebediyen kaçamamalı.

test('hız: yayanın tavanı en yavaş atın altında (insan atı geçemez)', () => {
    reset();
    const p = state.player;
    p.stats.agi = 99; p.proficiencies.athletics = { level: 99, xp: 0 };
    const enYavasAt = Math.min(...Object.values(g.TROOP_TYPES)
        .filter(t => t.type === 'cavalry').map(t => t.speed));
    assert.ok(Battle.footSpeed() <= Battle.FOOT_MAX, `yaya tavanı ${Battle.footSpeed()}`);
    assert.ok(Battle.FOOT_MAX < enYavasAt, `yaya tavanı ${Battle.FOOT_MAX} ≥ en yavaş at ${enYavasAt}`);
    reset();
});

test('hız: FOOT_MAX üstü her asker gerçekten binekli (orman kuralının dayanağı)', () => {
    Object.entries(g.TROOP_TYPES).forEach(([ad, t]) => {
        if(t.speed > Battle.FOOT_MAX)
            assert.ok(t.type === 'cavalry' || /Atlı|Muhafızı/.test(ad), `${ad} ${t.speed} hızlı ama yaya görünüyor`);
        if(t.type === 'cavalry')
            assert.ok(t.speed > Battle.FOOT_MAX, `${ad} süvari ama ${t.speed} ≤ ${Battle.FOOT_MAX}`);
    });
});

// Battle.start gerçek arenayı kurar (tuval, yerleşim) — bunlar `world`u ister.
const gw = H.world({ seed: 1 });

test('hız: moral askerin hızını ölçeklemez (düşmanın morali yok)', () => {
    const hizi = moral => {
        gw.state.player.morale = moral;
        gw.state.player.party = [{ id: 'm1', name: 'Svadya Milisi', level: 1 }];
        gw.Battle.start('Çapulcu', 1);
        const u = gw.Battle.units.find(x => x.id === 'm1');
        gw.Battle.active = false;
        return u.speed;
    };
    assert.strictEqual(hizi(0), hizi(100), 'moral hızı değiştiriyor');
    gw.state.player.party = [];
});

test('hız: arazi cezaları çarpılmaz, en kötüsü geçerli', () => {
    const u = { x: 100, y: 100, type: 'cavalry', mounted: true };
    Battle.terrain = {
        forests: [{ x: 100, y: 100, r: 50 }],
        pits:    [{ x: 100, y: 100, r: 50 }],
        rivers:  [{ x: 50, y: 50, w: 200, h: 200 }],
        hills: []
    };
    const m = Battle.getTerrainEffects(u).speedMod;
    assert.ok(Math.abs(m - 0.6) < 1e-9, `üst üste arazide ${m} (0.6 bekleniyordu)`);
    Battle.terrain = null;
});

test('şarj: soluk tükenir — kimse kalıcı olarak hızlı değil', () => {
    const dt = 1/60, u = { charge: 1.3 };
    let burst = 0, tired = 0;
    for(let i = 0; i < 60 * 10; i++) {                    // 10 sn aralıksız koşu
        const m = Battle.chargeSpeed(u, true, dt);
        if(m > 1) burst++; else if(m < 1) tired++;
    }
    assert.ok(burst > 0 && tired > 0, `şarj ${burst} kare, mola ${tired} kare`);
    // Mola koşudan uzun olmalı: temas kesme penceresi buradan çıkıyor
    assert.ok(tired > burst, `mola (${tired}) koşudan (${burst}) kısa — kaçış penceresi yok`);
    // Dinlenen birim soluğunu geri kazanır
    for(let i = 0; i < 60 * 10; i++) Battle.chargeSpeed(u, false, dt);
    assert.ok(Battle.chargeSpeed(u, true, dt) > 1, 'dinlenince şarj dolmadı');
});

// Bu testin yakaladığı hata gerçekten yaşandı: şarj düşman uzaklığına bağlıyken
// oyuncunun kendi hızı eşiği kontrol ediyordu. Sınırda salınan oyuncu soluğunun
// dörtte birini harcayıp sürekli hızlı kalıyor, kendinden hızlı atı bile geçiyordu.
test('şarj: kesintili basıp bırakmak sürekli şarjdan hızlı olamaz', () => {
    const dt = 1/60, N = 60 * 30;
    const ortalama = duty => {                      // duty: her `duty` karede 1 kare şarj
        const u = { charge: 1.3 };
        let top = 0;
        for(let i = 0; i < N; i++) top += Battle.chargeSpeed(u, i % duty === 0, dt);
        return top / N;
    };
    const surekli = ortalama(1);
    [2, 3, 4, 6].forEach(d => {
        assert.ok(ortalama(d) <= surekli + 1e-9,
            `1/${d} basışta ortalama ${ortalama(d).toFixed(4)} > sürekli ${surekli.toFixed(4)} — sınır istismarı`);
    });
});

// --- Cheese kapıları: kaçış mümkün, ama sonsuz kaçış değil ---
// duel.js gerçek motoru adım adım işletir; kite sonsuzsa dövüş MAX_S'e kadar
// sürer ve `won: null` döner. Kilit = kite hatası.
const { fight } = require('./duel');

test('kite: atlı okçu yakın dövüşçüden sonsuza dek kaçamaz', () => {
    const r = fight(gw, 'Kergit Atlı Okçusu', 'Nord Baltacısı', 3);
    assert.notStrictEqual(r.won, null, `dövüş ${r.sure.toFixed(0)} sn'de bitmedi — atlı okçu kite ediyor`);
});

test('kite: yaya okçu 0.8 kaçışla da yakalanır', () => {
    const r = fight(gw, 'Rodok Tatar Yaylısı', 'Nord Savaşçısı', 3);
    assert.notStrictEqual(r.won, null, `dövüş ${r.sure.toFixed(0)} sn'de bitmedi — yaya okçu kite ediyor`);
});

// Kurtlar `TROOP_TYPES`'ta yok (çeteden doğarlar), o yüzden buradaki en zor durum
// yayanın atlıyı kovalamasıdır: yaya artık şövalyeyi yakalayamaz, ama şövalye de
// vur-kaç yapıp sonsuza dek gezinemez — savaş bir yerde bitmeli.
test('kite: yaya atlıyı yakalayamasa da savaş sonuçlanır', () => {
    const r = fight(gw, 'Nord Savaşçısı', 'Svadya Şövalyesi', 4);
    assert.notStrictEqual(r.won, null, `dövüş ${r.sure.toFixed(0)} sn'de bitmedi`);
});

// --- Sürüm damgası (#88 madde 8) ---
// Release'i CI açıyor ve notlarını CHANGELOG'un o sürüm bölümünden okuyor. Bölüm yoksa
// yapı orada kırılır; burada kırılması daha ucuz.
test('sürüm: VERSION.no CHANGELOG.md içinde bir bölüm buluyor', () => {
    const md = require('fs').readFileSync(require('path').join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
    const v = g.VERSION.no;
    assert.ok(new RegExp(`^## ${v.replace('.', '\\.')}[ (]`, 'm').test(md),
        `CHANGELOG.md'de "## ${v}" bölümü yok — sürüm artmış ama satır girilmemiş`);
});

// --- Görevler: her görev gerçekten bitirilebiliyor mu ---
// Görev tanımları elle yazılıyor ve tek doğrulama yolu oyunu açıp saatlerce
// gezmekti. Burada her görev **gerçek motordan** bitiriliyor: `Quests.make`
// kuruyor, sürücü görev olaylarını `Quests.emit`/`dailyTick` ile veriyor,
// `complete()` ödülü ödüyor. Tablo tanım listesiyle karşılaştırılıyor — yeni
// bir görev sürücüsüz eklenirse test düşer, görev de sessizce bitmez kalmaz.
function questSuite() {
    const gq = H.world({ seed: 3 });
    const { Quests, QUESTS, LOCATIONS, LORDS, Nobles, Game, state } = gq;
    const loc = id => LOCATIONS.find(l => l.id === id);
    const enter = id => Quests.emit('entered_location', { locId: id, loc: loc(id) });
    const give = (itemId, qty) => state.player.inventory.push({ ...gq.ITEMS[itemId], qty });

    const drivers = {
        butter_blockade: q => Quests.emit('bought_item', { locId: q.data.locId, itemId: 'cheese', qty: q.data.need }),
        fog_dot: q => { state.player.x = q.data.x; state.player.y = q.data.y; Quests.dailyTick(); },
        sergeant_exam: q => {
            state.player.party = Array.from({ length: q.data.need }, (_, i) =>
                ({ id: 'v' + i, name: 'Svadya Şövalyesi', level: 21, type: 'cavalry' }));
            enter(q.data.locId);
        },
        hungry_army: q => { give('wheat', q.data.need); enter(q.data.locId); },
        brother_in_chains: q => Quests.emit('battle_won', { npcId: q.data.npcId }),
        fixed_match: q => Quests.emit('tournament_end', { won: false, score: q.data.lo }),
        false_news: q => LORDS.filter(l => l.faction === q.data.faction && l.id !== q.data.about)
                              .forEach(l => Quests.emit('talked_to', { lordId: l.id })),
        crazy_chickens: q => Quests.emit('chickens_caught', { won: true }),
        harvest_watch: q => { for(let i = 0; i < q.data.need; i++) Quests.emit('battle_won', { questWave: q.id }); },
        lost_letter: q => {
            enter(q.data.pickLoc);
            // Lord ancak kendi salonundaysa bulunur (Nobles.isAt) — partisini eve çek
            const seat = loc(Quests.lordSeat(q.data.toId)), p = Nobles.partyOf(q.data.toId);
            if(p) { p.x = seat.x; p.y = seat.y; }
            enter(seat.id);
        },
        bring_poem: q => Quests.emit('poem_recited_lord', { lordId: q.giverId }),
        arena_champion: () => Quests.emit('tournament_end', { won: true, score: 12 }),
        chain_market: q => {
            for(let i = 0; i < q.data.need; i++) state.player.prisoners.push({ id: 'p' + i, name: 'Çapulcu', level: 5 });
            enter(q.data.locId);
        },
        dawn_raid: q => Quests.emit('raided', { locId: q.data.locId }),
        caravan_escort: q => {
            for(let i = 0; i < q.data.need; i++) Quests.emit('battle_won', { npcId: 'b' + i });
            enter(q.data.locId);
        },
        guild_supply: q => { give(q.data.item, q.data.need); enter(q.data.locId); }
    };

    // Görevi verebilecek ilk uygun veren: mizaç + dünyanın `can` önkoşulu
    function giverFor(id) {
        const d = QUESTS[id];
        if(d.givers.includes('guild')) return 'guild_' + LOCATIONS.find(l => l.type === 'city').id;
        const l = LORDS.find(x => (!d.givers.length || d.givers.includes(x.personality))
                               && (!d.can || d.can(Quests.giver(x.id))));
        return l && l.id;
    }

    test('görev: tablodaki her görevin bir test sürücüsü var', () => {
        const eksik = Object.keys(QUESTS).filter(id => !drivers[id]);
        assert.strictEqual(eksik.length, 0, `sürücüsüz görev: ${eksik.join(', ')}`);
    });

    Object.keys(QUESTS).forEach(id => {
        test(`görev: ${id} gerçek motorda tamamlanıyor`, () => {
            const giverId = giverFor(id);
            assert.ok(giverId, 'bu görevi verebilecek kimse yok');
            // Her görev temiz bir oyuncuyla başlar: bir önceki görevin envanteri sayılmasın
            state.player.quests = []; state.player.inventory = []; state.player.prisoners = [];
            state.player.party = []; state.player.money = 0;
            const q = Quests.make(id, giverId);
            state.player.quests.push(q);

            // "Nerede" sorusunun cevabı ya gerçek bir yerleşimdir ya da yoktur
            const w = QUESTS[id].where && QUESTS[id].where(q);
            assert.ok(!w || loc(w), `where() haritada olmayan yer döndü: ${w}`);
            assert.ok(QUESTS[id].desc(q).length > 10, 'desc boş');

            drivers[id](q);
            assert.ok(!Quests.has(id), 'görev bitmedi — sürücü olayları motoru geçmiyor');
            assert.strictEqual(state.player.money, QUESTS[id].reward.money, 'ödül ödenmedi');
        });
    });
}
questSuite();

// --- Dil katmanı (#81) ---
// İki bozukluk sınıfı da statik yakalanır: sözlükte olmayan anahtar (kod
// sözlükten sonra değişmiş) ve üst düzey tabloda donmuş çeviri.
test('i18n: koddaki her T anahtarı iki sözlükte de var', () => {
    const K = require('./i18n-keys');
    const d = K.dicts(), eksik = [...K.codeKeys()].filter(k => !(k in d.en) || !(k in d.id));
    assert.ok(eksik.length === 0, `${eksik.length} anahtar sözlükte yok, ilki: ${JSON.stringify(eksik[0])}`);
});

// Statik çıkarıcı yalnız `T('…')` **literal**lerini görür; `T(def.title)` gibi
// değişkenden çevrilen ham veri onun gözünde yok. Görev başlıkları tam da öyle
// yazılıyor — 0.77'de iki yeni başlık sözlüksüz çıktı ve EN'de Türkçe düştü.
test('i18n: ham veri tablosundaki görev başlıkları iki sözlükte de var', () => {
    const d = require('./i18n-keys').dicts();
    const eksik = Object.keys(g.QUESTS).map(id => g.QUESTS[id].title)
        .filter(t => !(t in d.en) || !(t in d.id));
    assert.strictEqual(eksik.length, 0, `sözlüksüz görev başlığı: ${eksik.join(', ')}`);
});

test('i18n: üst düzey veri tabloları dilden bağımsız', () => {
    // Aynı tohum, iki dil: tablo kurulurken T(...) çalışıyorsa değerler ayrışır.
    const tr = H.load({ seed: 7 }), en = H.load({ seed: 7, lang: 'en' });
    const yollar = [['PERSONALITIES'], ['LADY_TRAITS'], ['COMPLIMENTS'], ['POEMS'], ['QUESTS'],
                    ['Nobles', 'LORD_TRAITS'], ['Nobles', 'LORD_LINES'], ['Nobles', 'RETAINERS'],
                    ['Nobles', 'GREETS'], ['Game', 'ATTRS'], ['Game', 'AMBITIONS'],
                    ['Game', 'SIEGE_PLANS'], ['Game', 'HONOR'], ['Battle', 'ARENA_FOES']];
    const J = v => JSON.stringify(v, (k, x) => typeof x === 'function' ? 'fn' : x);
    const donmus = yollar.filter(p => {
        const al = g => p.reduce((o, k) => o && o[k], g);
        return J(al(tr)) !== J(al(en));
    }).map(p => p.join('.'));
    assert.ok(donmus.length === 0, `donmuş tablo: ${donmus.join(', ')}`);
});

// ---------- 2. Eşikler ----------
// Kesin sayı değil aralık: dünya rastgeledir, ama kırılan bir kural aralığın
// dışına çıkar. Aralıklar ölçülen değerin ~2 katı genişliğinde tutuldu —
// gürültü değil rejim değişikliği yakalansın diye.
function thresholds() {
    const { simulate } = require('./sim');
    const { runScript } = require('./economy');

    test('dünya: 200 gün oyuncusuz sim eşikleri', () => {
        const r = simulate(1, 200);
        between(r.fetih, 1, 20, 'fetih');                  // 0 = cephe donmuş, 20+ = harita eriyor
        assert.strictEqual(r.silinenKrallik, 0, 'krallık haritadan silindi');
        between(r.sefer, 10, 60, 'sefer');
        between(r.baris, 5, 40, 'barış');
        between(r.kafileBaskini, 20, 200, 'kafile baskını');
        assert.ok(r.kafile > 0, 'haritada hiç ticaret partisi kalmadı');
        assert.strictEqual(r.hata, 0, 'sim sırasında istisna');
    });

    test('ekonomi: ordu geliri olmadan yaşamaz, tımar yaşatır', () => {
        const bos = runScript('bos', 60, 1, 10, 'Svadya Milisi', 10, 1000);
        const tim = runScript('timar', 60, 1, 10, 'Svadya Milisi', 10, 1000);
        assert.ok(bos.gunluk < 0, `boş gezen ordu kâr ediyor: ${bos.gunluk}₺/gün`);
        assert.ok(tim.gunluk > 20, `tımar geliri çökmüş: ${tim.gunluk}₺/gün`);
        between(tim.bitis, 2000, 20000, '60. günde tımar serveti');
    });

    // #47'nin regresyonu: erzak ticaret malı değildir. 10 kişilik lvl-10 ordu
    // günde 10 birim düşük kalite yer; tahıl 4₺ iken bu ~40₺. Fiyat iki katına
    // çıkarsa bu satır düşer — issue'daki doğrulama yolu budur.
    test('ekonomi: 10 kişilik ordunun günlük erzak faturası', () => {
        const r = runScript('bos', 60, 1, 10, 'Svadya Milisi', 10, 1000);
        assert.strictEqual(r.maas, 20, 'maaş kademesi değişmiş');
        between(r.yem, 5, 25, 'günlük erzak gideri (₺)');
    });
}

// ---------- Çıktı ----------
if(!H.args().hizli) thresholds();

const bad = results.filter(r => !r.ok);
results.forEach(r => console.log(`${r.ok ? '  ok' : 'FAIL'}  ${r.name}${r.ok ? '' : '\n        ' + r.msg}`));
console.log(`\n${results.length - bad.length}/${results.length} geçti`);
if(bad.length) process.exit(1);
