# WebBand

Mount & Blade: Warband tarzı, tarayıcıda çalışan tek sayfalık RPG. Türkçe arayüz.
Build yok, bağımlılık yok — `index.html` doğrudan tarayıcıda açılır.

**Ayrıntı `docs/SISTEMLER.md`'dedir** — her mekaniğin tasarım kararı ve ölçülmüş sayısı.
Burada yalnız değişmez kurallar var. Bir mekaniği değiştirmeden önce oradaki bölümü oku,
değiştirdikten sonra "Ölçüldü" satırlarını güncelle.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html` | Tüm ekranların DOM iskeleti |
| `app.js` | Çekirdek — harita, zaman, yerleşim, diplomasi, kayıt. `Debug`, `Input`, `Game`, `Save` + `state` |
| `battle.js` | `Battle`, `TournamentMinigame` |
| `nobles.js` | `LORDS`/`LADIES`/`COMPANIONS` + `Nobles`, `Feast` |
| `quests.js` | `QUESTS` + `Quests` görev motoru |
| `i18n.js` | `I18N` + global `T` |
| `lang-en.js` / `lang-id.js` | Üretilmiş sözlükler — elle düzenlenmez |
| `style.css` | Cam panel teması, CSS değişkenleri |
| `tools/` | Node ölçüm araçları (`harness.js` + `test/sim/duel/economy/framegate`) |
| `docs/SISTEMLER.md` | Mekanik dökümü ve ölçümler |
| `docs/PLAN-*.md`, `docs/olcum/` | Tasarım planları, tarihli ölçüm raporları |
| `CHANGELOG.md` | Oyuncu diliyle değişiklik listesi |
| `bg*.jpg`, `lord_portraits.jpg`, `kingdom_crests.jpg` | Görseller (sprite sheet'ler 3×3) |

## Değişmez kurallar

**Globaller global kalır.** Arayüz `onclick="Game.xxx()"` ile bağlanır, yani
`Game`/`Battle`/`Nobles`/`Quests`/`Feast`/`Save`/`Debug` global olmalı. Klasik script'te
`const` **sözcüksel** globaldir — `window.Game` diye aranmaz (`alert` override'ı bu yüzden
`typeof Game` sorar).

**Script sırası**: `i18n.js` → `lang-en.js` → `lang-id.js` → `app.js` → `battle.js` →
`nobles.js` → `quests.js`. Sıra yalnız `const` çakışmasını önler.

**Tek `state`**; `Save` onu localStorage'a yazar (3 elle slot + 5'lik otomatik halka,
`Save.migrate` tek göç zinciri; yeni alan çoğu zaman `ensureX()` deseniyle yeter).
**`VERSION = { no, date, name }`** `app.js`'in başındadır, **elle** artırılır ve aynı turda
`CHANGELOG.md`'ye bir satır girer.

**Ham dur, gösterimde çevir.** i18n anahtarı Türkçe kaynak metnin kendisidir (`T('Yeni Oyun')`,
`` T`${n} asker` `` → `{0}`). `T()`'yi **üst düzey veri tablosuna yazma** — o satır
`I18N.load()`'dan önce çalışır ve çeviriyi dondurur. Tablo ham Türkçe durur, `T` ekrana basan
yerde çağrılır; ada bakan karşılaştırmalar (`=== 'Orman'`) bu sayede dilden bağımsızdır.
Bir veri alanı ham duruyorsa onu ekrana basan **her** yol `T`den geçmeli.

**Sözlükler üretilir.** `T()` anahtarını değiştirirsen `lang-en.js` **ve** `lang-id.js` aynı
turda güncellenir; `tools/test.js`'in *"her T anahtarı iki sözlükte de var"* iddiası bunun
regresyon kapısıdır. Yüzde yazımı `Game.pct(n, signed)`.

**Ayarlar tek kapıdan**: varsayılan `Game.OPTS`, okuma `Game.opt(k)`, yazma `Game.setOpt(k,v)` —
`state.settings` yalnız **sapmaları** tutar. Üçlü cihaz ayarları `'auto' | true | false`.

**Cihaz için tek bir "mobil modu" anahtarı yok** — dört ayrı soru, dört knob: *nasıl
giriliyor* `Game.isTouch()` (= `pointer: coarse`; `body.touch`, yardım metni, `#touch-ui`),
*nasıl yerleşiyor* `@media (max-width: 820px / 430px)`, *ne kadar çiziliyor* `Game.lite()`
(`'auto'` = `isTouch()`), *kenardan kayıyor mu* `Game.edgePan()` (`'auto'` = `!isTouch()`).

**Savaş hasarı tek çoke noktasından geçer**: `Battle.afterArmor(dmgType, raw, def, tgt)` —
zırh, hasar türü ve zorluk çarpanı (`Game.dmgMult`) orada.

**Oyun döngüsü** `Battle.active || TournamentMinigame.active` iken gerçekten durur
(`_loopId = null`); geri kuran tek yer `showScreen()`'dir. Her rAF döngüsünde çift başlama
koruması vardır.

## Performans

Darboğaz JS değil **compositor**: savaşın JS'i kare başına ~1.2 ms, bütçe 16.7 ms.

- `Game.skipFrame(t)` fazla kareyi atar; tazeleme periyodu son 31 karenin **ortancasıdır**
  (#85) ve karar **kare başına** verilir, çağrı başına değil (#42).
- **Hareketli tuvalin üstünde `backdrop-filter` yok**; modal açıkken `renderMap()` erken döner.
- Pahalı şey bir kez pişirilir (`buildGroundTexture`, `Battle.buildGround`, `unitSprite`,
  `Game.emoji/radial/textW`) — kare başına gradyan üretilmez.
- Tuvaller opak; `battle-canvas`'ı iki motor paylaşır, ikisi de `Game.battleCtx()`'ten alır.

## Ölçüm ve test

`tools/harness.js` tek kapıdır: sahte DOM kurar, dört script'i **tek `vm` bağlamında**
çalıştırır, tohumlu `mulberry32` ile aynı tohum aynı dünyayı verir. Dışa verdikleri:
`{ load, world, run, mulberry32, args, seeds, writeReport }` — `boot` diye bir şey yok.

```
node tools/test.js [--hizli]   # 25 iddia ~4.5 sn / yalnız saf mantık ~0.13 sn
node tools/framegate.js        # kare kapısı + #42 parite regresyonu
node tools/sim.js --gun 200 --tohum 1-5 | duel.js --n 200 | economy.js --gun 60 --asker 10
```

CI her itmede ilk ikisini koşar; `npm install` adımı yoktur. Beklenen sayılar
`docs/SISTEMLER.md`'deki "Ölçüldü" satırlarıdır — biri değişirse ya kod ya belge yanlıştır.

## Kod tarzı

Türkçe yorum ve arayüz metni, İngilizce değişken/fonksiyon isimleri. Arayüz `innerHTML`
şablon dizeleriyle üretilir, inline `style` yaygın; küçük puntolar `--fs-xs/sm/md`
değişkenlerinden okunur. Modal: `Game.showModal(html, width?, bgImage?)` / `closeModal()`;
`window.alert` modala yönlendirilmiştir.
