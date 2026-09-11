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

// --- Dil katmanı (#81) ---
// İki bozukluk sınıfı da statik yakalanır: sözlükte olmayan anahtar (kod
// sözlükten sonra değişmiş) ve üst düzey tabloda donmuş çeviri.
test('i18n: koddaki her T anahtarı iki sözlükte de var', () => {
    const K = require('./i18n-keys');
    const d = K.dicts(), eksik = [...K.codeKeys()].filter(k => !(k in d.en) || !(k in d.id));
    assert.ok(eksik.length === 0, `${eksik.length} anahtar sözlükte yok, ilki: ${JSON.stringify(eksik[0])}`);
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
