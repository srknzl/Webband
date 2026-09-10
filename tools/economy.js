#!/usr/bin/env node
// ============================================================
// economy.js — verilen oyuncu betiği için para/gider eğrisi (#62)
// ------------------------------------------------------------
// Fiyat, stok, maaş, yemek ve vergi hesabının hepsi oyunun kendi
// fonksiyonlarından geçer (`Game.buyItem` / `sellItem` / `dailyUpdate`);
// burada yalnızca oyuncunun ne yaptığı yazılıdır.
//
//   node tools/economy.js --betik ticaret --gun 60 --asker 10
//   node tools/economy.js --betik hepsi --gun 60 --rapor
// ============================================================
'use strict';
const H = require('./harness');

// Ordu yemek ister: aç kalan grup 5 günde firar edip dağılıyor ve ölçüm
// "para eğrisi" değil "ordunun buharlaşması" oluyordu. Her betik gün başında
// buradan geçer — erzak da giderin parçasıdır.
function feed(g) {
    const { Game, state, LOCATIONS } = g;
    if(!state.player.party.length) return 0;
    const fs = Game.foodStock();
    if(fs.days >= 4) return 0;
    const here = LOCATIONS.reduce((a, l) => Game.dist(state.player, l) < Game.dist(state.player, a) ? l : a, LOCATIONS[0]);
    const önce = state.player.money;
    Game._marketLoc = here;
    Game.buyItem('wheat', Math.max(1, Math.ceil(fs.need * 10 - fs.low)));
    return önce - state.player.money;
}

// Fiyat stoğa bağlıdır (#46 arz eğrisi): tek birimlik fiyata bakıp 30 birim
// almak kârı hayal ettirir. Yükün **ortalama** birim fiyatı, stok yükün yarısı
// kadar oynamışken okunur — stoku geçici kıpırdatıp geri koyarız.
function ortFiyat(g, loc, id, sell, adet) {
    const { Game } = g;
    const eski = loc.stock[id];
    loc.stock[id] = Math.max(1, eski + (sell ? adet / 2 : -adet / 2));
    Game._marketLoc = loc;
    const p = Game.marketPrice(id, sell);
    loc.stock[id] = eski;
    return p;
}

// Kasa tek başına yanıltır: ticaret betiği günü yükle kapatınca para sıfır
// görünüyor, ertesi gün satınca geri geliyordu. Ölçülen şey **servet** —
// kasa + elindeki ticaret malının o günkü satış değeri.
function worth(g) {
    const { Game, state, LOCATIONS } = g;
    const here = LOCATIONS.reduce((a, l) => Game.dist(state.player, l) < Game.dist(state.player, a) ? l : a, LOCATIONS[0]);
    Game._marketLoc = here;
    return state.player.inventory.filter(i => i.type === 'trade')
        .reduce((sum, i) => sum + i.qty * (Game.marketPrice(i.id, true) || 0), state.player.money);
}

// Oyuncu betikleri: her gün bir kez çağrılır, oynanışın "meslek" seçimi budur
const SCRIPTS = {
    // Hiçbir şey yapmayan ordu: saf gider eğrisi
    bos: { ad: 'Boş gezen ordu', gun: () => {} },

    // Ucuz alıp pahalıya satan kervancı: her seferde en kârlı mal/rota seçilir
    ticaret: {
        ad: 'Ticaret rotası',
        kur(g) { this.hedef = null; },
        gun(g) {
            const { Game, state, LOCATIONS, ITEMS } = g;
            const goods = Object.keys(ITEMS).filter(id => ITEMS[id].type === 'trade');
            const cities = LOCATIONS.filter(l => l.type === 'city');
            const here = cities.reduce((a, l) => Game.dist(state.player, l) < Game.dist(state.player, a) ? l : a, cities[0]);

            // Elindeki yükü burada sat (kâr varsa)
            Game._marketLoc = here;
            state.player.inventory.filter(i => i.type === 'trade').forEach(i => Game.sellItem(i.id, i.qty));

            // En kârlı (mal, hedef şehir) çifti: alış burada, satış orada
            let best = null;
            goods.forEach(id => {
                Game._marketLoc = here;
                const buy = Game.marketPrice(id), stok = Math.floor(Game.stock(here, id));
                if(!stok) return;
                cities.forEach(dst => {
                    if(dst === here) return;
                    Game._marketLoc = dst;
                    const sell = Game.marketPrice(id, true);
                    const gun = Game.dist(here, dst) / Math.max(1, Game.getPlayerSpeed().value) / 24;   // hız dökümlü nesne döner
                    // Hedefin stoğunun dörtte birinden fazlasını boşaltmak fiyatı çökertir
                    // (#46 arz eğrisi) — kâr tahmini yükün büyüklüğüne bakmadan yapılamaz.
                    let alım = Math.min(stok, Math.floor(Game.stock(dst, id) * 0.25), 40);
                    if(alım <= 0) return;
                    // Birim kârı değil **yükün toplam kârını** gün başına ölç: kadifede
                    // birim marjı yüksek ama pazar tek top alıyor, o rota günlük gideri ödemiyor.
                    const kar = alım * (ortFiyat(g, dst, id, true, alım) - ortFiyat(g, here, id, false, alım)) / Math.max(0.5, gun);
                    if(kar > 0 && (!best || kar > best.kar)) best = { id, dst, buy, sell, kar, gun, alım };
                });
            });
            Game._marketLoc = here;
            // Kârlı rota yoksa tüccar oturmaz: en yakın başka şehre geçip orada bakar
            // (yoksa betik fiyatı çökerttiği şehirde sonsuza kadar bekliyordu).
            if(!best) {
                const dst = cities.filter(c => c !== here)
                    .sort((a, b) => Game.dist(here, a) - Game.dist(here, b))[0];
                const s2 = Math.max(2, Math.round(Game.dist(here, dst) / Math.max(1, Game.getPlayerSpeed().value)));
                for(let h = 0; h < s2; h++) Game.advanceTime(1);
                state.player.x = dst.x; state.player.y = dst.y;
                return;
            }

            const adet = Math.min(best.alım, Math.floor(state.player.money * 0.6 / best.buy));   // kasada erzak payı kalsın
            if(adet > 0) Game.buyItem(best.id, adet);
            // Yol zaman yer: mesafeyi harita hızıyla geçer
            const saat = Math.max(2, Math.round(best.gun * 24));
            for(let h = 0; h < saat; h++) Game.advanceTime(1);
            state.player.x = best.dst.x; state.player.y = best.dst.y;
        }
    },

    // Tımar sahibi: vergi gelir, garnizon maaşı gider
    timar: {
        ad: 'Tımar sahibi',
        kur(g) {
            const { Game, state, LOCATIONS } = g;
            const city = LOCATIONS.filter(l => l.type === 'city')
                .sort((a, b) => Game.dist(state.player, a) - Game.dist(state.player, b))[0];
            Game.grantFief(city, city.faction);
            city.garrison = Array.from({ length: 20 }, (_, i) => ({
                id: 'gar_' + i, name: Game.recruitName(city), level: 1, xp: 0, xpNext: 3, type: 'infantry'
            }));
            this.city = city.name;
        },
        gun(g) { g.Game.advanceTime(24); }
    }
};

function runScript(key, days, seed, troops, troopName, troopLvl, kasa) {
    const g = H.world({ seed });
    const { Game, state } = g;
    const s = SCRIPTS[key];
    for(let i = 0; i < troops; i++) {
        state.player.party.push({ id: 'tr_' + i, name: troopName, level: troopLvl, xp: 0, xpNext: 3, type: 'infantry' });
    }
    state.player.money = kasa;
    if(s.kur) s.kur(g);

    const curve = [], start = Math.round(worth(g)), maas = Math.round(Game.upkeep().wage);
    let yem = 0;
    for(let d = 0; d < days; d++) {
        const gunBasi = state.time.day;
        yem += feed(g);
        s.gun(g);
        while(state.time.day === gunBasi) Game.advanceTime(1);   // betik gün geçirmediyse gün doldurulur
        curve.push(Math.round(worth(g)));
    }
    const son = worth(g);
    return {
        betik: key, ad: s.ad, gun: days, asker: troops,
        baslangic: start, bitis: Math.round(son),
        gunluk: +((son - start) / days).toFixed(1),
        enDusuk: Math.min(...curve), enYuksek: Math.max(...curve),
        egri: curve, maas, yem: Math.round(yem / days),
        askerSonu: state.player.party.length, hata: g.Debug.errors.length
    };
}

function main() {
    const a = H.args();
    const days = Number(a.gun || 60), seed = Number(a.tohum || 1);
    const troops = Number(a.asker || 10), tName = String(a.tur || 'Svadya Milisi'), tLvl = Number(a.seviye || 10);
    const kasa = Number(a.kasa || 1000);
    const keys = (!a.betik || a.betik === 'hepsi') ? Object.keys(SCRIPTS) : String(a.betik).split(',');
    const rows = keys.map(k => {
        const r = runScript(k, days, seed, troops, tName, tLvl, kasa);
        console.error(`${r.ad}: ${r.baslangic} → ${r.bitis} dinar (${r.gunluk >= 0 ? '+' : ''}${r.gunluk}/gün)`);
        return r;
    });
    if(a.json) return console.log(JSON.stringify(rows, null, 2));

    const örnek = r => r.egri.filter((_, i) => i % Math.max(1, Math.floor(days / 6)) === 0).join(' → ');
    let md = `# Ekonomi eğrisi — ${days} gün, ${troops}× ${tName} (sv. ${tLvl})\n\n`
        + `\`node tools/economy.js --gun ${days} --asker ${troops} --kasa ${kasa}\` · sürüm ${H.load({ seed }).VERSION.no}\n`
        + `Başlangıç kasası ${kasa} dinar; ölçülen **servet** = kasa + elindeki ticaret malının satış değeri.\n`
        + `Fiyat, stok, maaş, yemek ve vergi oyunun kendi kodundan geçer; ordu aç kalmasın diye her gün erzak alınır.\n\n`
        + `| Betik | Başlangıç | Bitiş | Gün başına | En düşük | Günlük maaş | Günlük erzak | Kalan asker |\n|---|---|---|---|---|---|---|---|\n`
        + rows.map(r => `| ${r.ad} | ${r.baslangic} | ${r.bitis} | **${r.gunluk >= 0 ? '+' : ''}${r.gunluk}** | ${r.enDusuk} | ${r.maas}₺ | ${r.yem}₺ | ${r.askerSonu}/${r.asker} |`).join('\n')
        + `\n\nEğri (her ~${Math.max(1, Math.floor(days / 6))} günde bir örnek):\n\n`
        + rows.map(r => `- **${r.ad}**: ${örnek(r)}`).join('\n') + '\n';
    console.log(md);
    if(a.rapor) console.error('yazıldı: ' + H.writeReport('ekonomi', md));
}

if(require.main === module) main();
module.exports = { runScript, SCRIPTS };
