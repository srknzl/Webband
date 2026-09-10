# WebBand

Mount & Blade: Warband tarzı, tarayıcıda çalışan tek sayfalık RPG. Türkçe arayüz.
Build yok, bağımlılık yok — `index.html` doğrudan tarayıcıda açılır.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html` | Tüm ekranların DOM iskeleti (start, main-ui, map/settlement/character/party/inventory/battle view'ları, modal, esaret paneli, kuşatma kampı paneli, yağma paneli, kamp paneli) |
| `app.js` | Çekirdek — harita, zaman, yerleşim, diplomasi, kayıt. Global objeler: `Debug`, `Input`, `Game`, `Save` + `state` |
| `battle.js` | Savaş arenası ve turnuva minigame'i: `Battle`, `TournamentMinigame` |
| `nobles.js` | `LORDS` (23), `LADIES` (12), `COMPANIONS` (7), `PERSONALITIES`, `LADY_TRAITS`, `COMPLIMENTS`, `POEMS` + `Nobles` ve `Feast` objeleri |
| `quests.js` | `QUESTS` (11 görev tanımı) + `Quests` görev motoru |
| `docs/PLAN-soylular-ve-gorevler.md` | Bu sistemin tasarım planı |
| `tools/` | Node ölçüm araçları (`harness.js` + `sim/duel/economy/framegate`) — bkz. "Ölçüm araçları" |
| `docs/olcum/` | Araçların ürettiği tarihli ölçüm raporları |
| `README.md` | İngilizce depo tanıtımı — kurulum tek satır: `index.html`'i aç |
| `CHANGELOG.md` | Oyuncu diliyle, tarihli değişiklik listesi; sürüm numarası `VERSION` sabitidir |
| `.github/ISSUE_TEMPLATE/bug.md` | Hata şablonu: sürüm damgası, **ekran tazeleme hızı**, debug raporu, kayıt JSON'u |
| `style.css` | Cam panel (glassmorphism) teması, CSS değişkenleri (`--primary`, `--danger`, `--success`, `--panel-border`, `--text-muted`) |
| `bg.jpg`, `bg_hdr.jpg` | Arkaplan görselleri |
| `lord_portraits.jpg` | 3x3 sprite sheet — lord portreleri (`background-position` ile kırpılır) |
| `kingdom_crests.jpg` | 3x3 sprite sheet — krallık armaları |
| `LICENSE` | AGPL-3.0-or-later |

## Mimari

`window.onload → Game.init()` → harita üretimi + NPC spawn. `Game.startGame()` oyun döngüsünü
(`requestAnimationFrame`) başlatır. Döngü `update(dt)` + `renderMap()` çağırır ve
`Battle.active || TournamentMinigame.active` iken **gerçekten durur** (`_loopId = null`,
yeni kare istemez); savaş/turnuva kendi döngüsünü işletir. Döngüyü geri kuran tek yer
`showScreen()`'dir: savaş dışı bir ekrana dönülünce, `_loopId` boşsa ve iki motor da kapalıysa
`startGameLoop()` çağrılır. Savaştan çıkan her yol (zafer, yenilgi, teslim, düello, arena,
turnuva) `Game.showScreen('map')`'ten geçtiği için ek kanca gerekmez.

Script yükleme sırası: `app.js` → `battle.js` → `nobles.js` → `quests.js`. Aralarındaki tüm
referanslar fonksiyon gövdelerinde olduğu için sıra sadece `const` çakışmasını önlemek için
önemli. *(`const` klasik script'te global sözcüksel kapsama girer, yani `battle.js`'teki
`Battle` app.js'ten de görünür — `window.Battle` diye aranmamalı.)*

Tüm veri tek bir `state` objesinde; `Save` onu localStorage'a JSON olarak yazar
(3 slot + 5'lik otomatik kayıt halkası, bkz. "Kayıt sistemi").

`VERSION = { no, date, name }` `app.js`'in en başında durur ve **elle artırılır**. Başlangıç
ekranının köşesindeki `#ver-tag` ile debug raporunun ilk satırı aynı sabitten okur — oyuncunun
masaüstü kısayolu her açılışta depoyu `main`'e çektiği için "hangi kodu konuşuyoruz"
sorusunun tek cevabı budur (#55 madde 8). Sürüm artırılırken `CHANGELOG.md`'ye de bir satır girer.

Global veri sabitleri: app.js'te `FACTIONS`, `LOCATIONS`, `RIVERS`, `FORESTS`, `ITEMS`,
`TROOP_TREES` (+ ondan üretilen `TROOP_UPGRADES` / `TROOP_TYPES`); nobles.js'te `LORDS`, `LADIES`, `PERSONALITIES`,
`LADY_TRAITS`, `COMPLIMENTS`, `POEMS`; quests.js'te `QUESTS`.

`window.alert` override edilmiştir → modal olarak gösterilir.

## Mevcut Özellikler

### Karakter yaratma
`start-btn` → `Game.startGame()` artık doğrudan dünyaya sokmaz, modal üstünde dönen
6 adımlık bir sihirbaz açar (`Game.creation = { step, sel }`): cinsiyet + 4 geçmiş sorusu
(`BACKGROUND`) + sancak (`BANNERS`), sonra özet. Onaylanınca `applyCreation()` seçimleri
tek yerden işler ve `enterWorld()` (eski `startGame` gövdesi) çalışır.

- Seçim etkileri veri olarak durur: `attr{}`, `prof{}`, `money`, `renown`, `item` (kuşanılır),
  `relAll`, `relFaction{id,n}`. `Game.bonusText(o)` bunu insan diline çevirir — hem seçenek
  kartı hem özet aynı fonksiyondan okur.
- Cevaplar `state.player.background`'da saklanır; karakter ekranı `Game.backgroundLine()` ile yazar.

| Soru | Seçenekler (özet) |
|---|---|
| Kimsin? | Erkek (nötr) / Kadın (bütün lordlarla **−5** ilişki, evlilik yolu değişir) |
| Nerede doğdun? | 5 fraksiyon yurdu — biri nitelik/yetenek + **o krallığın lordlarıyla +5 ilişki** |
| Baban ne iş yapardı? | Soylu (+200 dinar, +10 nam, Liderlik+1) / Tüccar / Demirci / Asker / Çoban |
| Gençliğinde ne yaptın? | Uşaklık / Avcılık / Sokak / Manastır / Ahır — yetenek puanları |
| İlk mesleğin? | Paralı asker (kılıç) / Kervan muhafızı (kalkan) / Şövalye adayı (**at**, −100 dinar) / Kaçakçı (+300 dinar, −2 ilişki) / Haydut (balta, −4 ilişki) |

- **Sancak** (`BANNERS`, 9 arma): `kingdom_crests.jpg` 3×3 sprite sheet'inden `Game.bannerCss(i)`
  ile kırpılır. Rengi (`Game.bannerColor()`) haritadaki grup ikonunun ve kendi krallığını
  kurduğunda `FACTIONS.player_kingdom`'ın rengidir (eskiden sabit `#ffcc00`).
- `Nobles.initRivals()` artık `spawnNPCs()`'te değil `enterWorld()`'de çağrılır — rakip
  taliplerin kimi hedeflediği cinsiyete bağlı. Eski kayıtta rakip yoksa `Save.load()` kurar.

### Dünya haritası
- Prosedürel kıta sınırı: `getMapRadius()` açıya bağlı sinüs toplamı ile düzensiz kıyı üretir; `clampToMap()` herkesi içeride tutar.
- Yerleşimler (`LOCATIONS`) `init()` içinde **kurallı olarak yeniden dağıtılır** (`Game.layoutWorld`)
  — dizideki x/y değerleri kullanılmaz; bkz. "Yerleşim dağıtımı (#57)".
- Yollar: doğal güzergâhlı, türlü ve kavşaklı bir ağ (`state.roads`, `state.bridges`) —
  bkz. "Yol ağı (#56)".
- Nehirler (`RIVERS`) ve ormanlar (`FORESTS`) sabit koordinatlı.
- Keşif noktaları (`state.sites`): harabe, çiftlik, kule, mağara, kamp — bkz. "Terk edilmiş yapılar (#58)".
- **Orman oynanışa etki eder**: ormandaki düşman normal görüşle görünmez
  (`Game.spotRange(npc)` = görüş × `min(0.9, 0.25 + Gözcülük×3% + Yol Bulma×2%)`; temel
  yeteneklerle 500 → 125 birim). Render, künye ve tıklama tek `Game.canSee(npc)` kontrolünden
  geçer. Kurt sürüsü ormandayken 700 birimden oyuncuya kilitlenip **×1.6 hızla fırlar**.
- **Pusu** (`Game.checkAmbush`, saniyede bir zar): ormanda ilerlerken 240 birim içindeki
  gizli çete üstüne atlar. Fark etme şansı `min(0.9, 0.2 + Gözcülük×6% + Yol Bulma×4%)` —
  fark edersen normal karşılaşma (yeşil uyarı), fark edemezsen `state.ambush` açılır:
  `Battle.start` oyuncuyu arenanın ortasına koyar ve düşmanı 130–240 birimlik **çember**
  hâlinde doğurur (normalde 470–530 birim uzakta, tek şeritte).
- **Savaş sisi yok** (Warband'daki gibi): arazi, yollar, nehirler ve yerleşimler ilk
  kareden itibaren görünür. Gizli olan tek şey **gruplardır** — `Game.canSee(npc)` /
  `Game.spotRange(npc)` hâlâ tek kapı, yani uzaktaki ve ormandaki çeteler görünmez.
  Görüş `Game.getVisibility()` = `500 + (int−10)×30 + (Gözcülük−1)×25`, **gece ×0.7**;
  artık sis kazımaz, yalnızca grup fark etme menzilini belirler.
  *(Kaldırılanlar: `exploredCanvas`/`exploredCtx`/`exploredGrid`, `markExplored`,
  `repaintFog`, `loadExplored`, görüş çemberi dışını `evenodd` ile karartan katman.)*
- Kamera: fare tekerleği zoom (`Game.minZoom()`–3.0), kenardan fare ile pan, **WASD/ok tuşlarıyla
  serbest pan** (#44), oyuncuya yumuşak takip. Kamera `state.player + camera.offset`'i izler;
  pan yalnızca offset'i oynatır, ±9000 birimle sınırlıdır ve **Boşluk** / 🎯 Beni Bul
  (`Game.centerOnPlayer`) onu sıfırlar. *(Eskiden WASD tam tersini yapıp offset'i sıfırlıyordu:
  haritayı elle gezmenin tek yolu fareyi ekran kenarına dayamaktı. Haritaya tıklayıp yürürken
  offset'i kendiliğinden geri çeken kural da kaldırıldı — kamerayı toparlamak artık oyuncunun kararı.)*
  Alt sınır ekrana göre hesaplanır (`min(kısa kenar/9600, 0.8)`, taban 0.07) — **tüm kıta
  (9000 birim) tek ekrana sığar**. 1440×900'de ölçüldü: zoom 0.084, ekran 14453×9600 birimlik
  alanı gösteriyor, 25 yerleşimin hepsi ve 36 gruptan yalnızca görüş içindeki 4'ü çizili.
  Uzaklaşınca yerleşim ve grup ikonları dünya biriminde eridiği için `Game.iconScale()`
  = `max(1, 0.55/zoom)` ile büyütülür (etiketler zaten `1/zoom` ile ekran boyutundaydı).
- **Rota çizgisi ve sürüklenebilir hedef** (#35): akan ince kesikli çizgi (gölge + altın kat)
  ve hedefte küçük **dolu** nokta + nabız atan halka. Ok başı kaldırıldı — çizgi zaten yönü
  söylüyor. Çizgi ve işaret ekran boyutundadır (`/zoom`), yani uzaklaşınca kalınlaşıp
  haritayı ezmez. Hedef işareti **fareyle sürüklenir**: `startTargetDrag` işaretin
  `targetGrabRadius()` (ekranda 16 px) yakınında basılırsa yakalar, `handleMapHover`
  sürüklerken `Game.dragTarget`'i taşır, `endTargetDrag` bırakıldığı yeri `setTarget`'a verir.
  Sürüklenen geçici rota **beyaz ve donuk**, onaylanmış rota **altın ve akar** — hangisinin
  geçerli olduğu tek bakışta ayrılır. Bırakmanın ardından gelen `click` yutulur
  (`suppressClick`), yoksa hedef iki kez atanıyordu.
- Tıklama ile hareket: yerleşim → içeri gir, NPC → karşılaşma, boşluk → serbest hareket.
  Tıklama, sürükleme ve künye aynı iki kapıdan geçer: `Game.mapPos(e)` (ekran → dünya) ve
  `Game.setTarget(m)` (yerleşim < 36 → NPC < 30 → boş alan).
- **Grup ikonları** (Warband'daki gibi grubun neye benzediğini gösterir, `Game.drawPartyIcon`):
  atın varsa **atlı** silüeti (`drawRider`: at + eyer örtüsü + kalkık kılıç), yoksa mızraklı
  yaya (`drawFootman`: mızrak + kalkan + miğfer). Fraksiyon rengi eyer örtüsünde/kalkanda ve
  sancakta. Grup 10+ kişiyse arkada 1, 30+ kişiyse 2 figür daha çizilir — kalabalık uzaktan belli olur.
  Soylular atlı; krala 👑, vezire 🎖️ eklenir.
  İkon boyutu ordunun büyüklüğünü de yansıtır (`Game.partyIconScale`: 5 kişiden sonra kişi başı
  +%0.7, tavan +%35).
  **Çeteler kendi silüetiyle gezer** (`BAND_KINDS[].icon` → `Game.drawFigure`): çapulcu/eşkıya
  mızraklı yaya, orman haydudu **yaylı** yaya (`drawFootman(..., bow)`), kurt sürüsü **kurt**
  silüeti (`Game.drawWolf`, sancak taşımaz). Halka ve sancak rengi de çetenin kendi rengidir —
  hepsi aynı kırmızıyla çizilmez. **Kervan** ise araba silüetidir (`Game.drawCart`: çeki atı +
  tenteli yük kasası + tekerlekler); 10+ kişilik kervan arkasında ikinci arabayla, yani konvoy
  olarak görünür.
- **Günün vakti**: `Game.getDayPart()` yalnızca ad/ikon verir (Gece / Şafak / Sabah / Öğle /
  İkindi / Gün Batımı). Harita tonu **kademelidir**: `Game.dayTint()` `DAY_TINTS` anahtar
  saatleri arasında rgba'yı lineer geçirir, `Game.nightGlow()` yerleşimlerdeki ocak ışığını
  akşam 19–21 arası açar, şafakta 5–7 arası kapatır. *(Eskiden ton saat 5/8/17/20'de
  bir karede sıçrıyordu.)*
- İsim etiketleri (`Game.mapLabel`) **zoom'dan bağımsız ekran boyutunda** çizilir ve
  üst üste binenler yukarı kaydırılır (`_labelRects` çakışma testi).
- **Harita künyesi** (`handleMapHover` → `#map-tooltip`): yerleşimin üstüne gelince
  `Game.locTipHtml(loc)` — fraksiyon + tür, sahibi lord ve onunla ilişkin, refah,
  garnizon (`Game.garrisonOf`), bekleyen gönüllü, düşman toprağıysa "sadece kuşatma" uyarısı.
  Çete/partinin üstünde tür (yaratık sürüsü / haydut çetesi / fraksiyon) + asker sayısı.
  *(Ekran→dünya dönüşümünde `rect/2` ortalama payı eksikti; künye imlecin yarım ekran
  uzağındaki şeyi arıyor, yani hiç açılmıyordu.)*

### Yerleşim dağıtımı — asgari aralık, sınırdaki kale, köyün merkezi (#57)
Eski dağıtım tek satırdı: her yerleşim kendi fraksiyonunun açı diliminde **tamamen rastgele**
bir noktaya (merkeze 1000–3500 birim) düşüyordu. Ölçüldü (200 dünya): dünya başına
**6.81 asgari aralık ihlali**, **200 dünyanın 200'ünde** en az bir ihlal, en yakın çiftin
medyanı **148** birim (en kötü **12** — iki şehir üst üste), ve **82 yerleşim kıtanın dışında**
kalıyordu. `layoutWorld()` bunu üç kuralla değiştirir; kurallar sağlanana kadar
(en fazla 12 deneme) dünya baştan kurulur.

**1. Asgari aralık** (`Game.MIN_GAP`, `minGap(a,b)` çift türüne bakar): şehir–şehir 700,
şehir–kale 480, şehir–köy 380, kale–kale 620, kale–köy 340, köy–köy 420 birim.
`spotOk(p, type, placed)` tek kapıdır: aday nokta hem kıyıdan **320 birim** içeride olacak
hem de yerleşmiş herkese kendi çift kuralı kadar uzak duracak. 400 denemede yer bulunamazsa
son aday kabul edilir (kilitlenme yerine kusurlu bir dünya — doğrulama zaten yakalar).

**2. Kale sınırda, şehir ortada** (`placeLocations`): dilim içindeki açı `f` kale için
`0.02–0.20` ya da `0.80–0.98`, şehir için `0.22–0.78`. Yani kale komşu krallığın sınırına
bakar, şehir yurdun göbeğinde durur. Ölçüldü (40 dünya, 240 kale / 520 şehir):
kalelerin **%100'ü**, şehirlerin **%0'ı** dilimin dış %20'lik bandında.
Merkezden uzaklık **kıyıya görelidir** (`R = getMapRadius(açı)`, `d = R × 0.28–0.82`) —
sabit 1300–3200 bandı kıtanın şişkin taraflarını boş bırakıyordu.

**3. Köyün bir merkezi var** (`placeVillage`): her köy o fraksiyonun **en az köyü olan**
şehrine/kalesine bağlanır (`loc.parentId`) ve ondan `VILLAGE_RANGE` = **420–900** birim
uzağa konur. Ölçüldü (200 dünya): köy–merkez mesafesi min **420** / medyan **655** / max **900**.

`validateLocations()` üretilen dünyayı denetler ve **insan diliyle** hata listesi döner:
kıta dışı, asgari aralık ihlali, merkezi olmayan/kopmuş köy, **yol ağına bağlanmamış**
yerleşim (`state.roads` uçlarına 40 birim). `layoutWorld` bu liste boşalana kadar döner;
12 denemede de oturmazsa `console.warn` ile sebebi yazar. Ölçüldü (200 dünya):
**deneme sayısı medyan 1, max 1, 12 denemede başarısız 0**.

| | eski | yeni |
|---|---|---|
| İhlal / dünya | 6.81 | **0** |
| İhlalli dünya (200'de) | 200 | **0** |
| En yakın çift (medyan / en kötü) | 148 / **12** | **431 / 345** |
| Kıta dışında kalan (200 dünya toplamı) | 82 | **0** |
| En boş noktanın uzaklığı (40 dünya medyanı) | 2294 | **2189** |
| Rastgele noktadan en yakın yerleşime (medyan) | 680 | **637** |

Çift bazında ölçülen en dar aralık kuralın kendisine oturuyor: şehir|şehir 701,
kale|şehir 481, şehir|köy 380, kale|kale 622, kale|köy 345, köy|köy 454.

**`parentId` üç kopyalanmış sezgiyi de siliyor.** Fetih (`captureSettlement`), tımar
(`grantFief`) ve vassala tımar verme (`grantFiefTo`) "900 birim içindeki köyler de gelir"
kuralını **ayrı ayrı** yazıyordu; artık üçü de `Game.villagesOf(loc)` çağırır. Eski
kayıtlarda köyün `parentId`'si yoktur — `villagesOf` o zaman eski 900 birim kuralına düşer,
yani göç kodu gerekmedi. (`parentId` `Save.snapshot`'ın `locations` dizisine yazılır.)

### Yol ağı — dönemeç, tür ve köprü (#56)
Yollar eskiden yerleşimleri bağlayan minimum spanning tree'nin **düz çizgileriydi**: 24 parça,
hepsi aynı kahverengi, hepsi aynı ×1.1. Şimdi ağ üç noktada değişti.

**1. Güzergâh dönemeçlidir** (`Game.roadPath(a, b)`): iki nokta arası düz çizgi değil,
`max(6, min(18, uzaklık/220))` parçalı bir polyline. Dik yönde `sin(t·π)` ile uçlarda
sıfırlanan bir taban dönemeç (genlik = uzunluk × 0.10–0.24) ve ikinci harmonikten gelen
sapma bindirilir; ara noktalar ormana girerse **kenarına** (yarıçap + 45) itilir ve
`clampToMap`'ten geçer. Ölçüldü (285 rastgele yerleşim çifti): yol / kuş uçuşu oranı
medyan **1.049**, p90 1.088, en fazla 1.122 — yani yol kuş uçuşundan ~%5 uzun.
Ormanın **içinden** geçen parça sayısı 0 (eskiden düz çizgiler ormanı biçiyordu).

**2. Yol türü vardır** (`Game.ROAD_KINDS`, hedef yerleşimin türünden: şehir → taş,
kale → toprak, köy → keçi yolu). Tür hem yarıçapı hem hız çarpanını hem dokusunu belirler:

| Tür | Yarıçap | Hız | Ölçülen hız (aynı grup, düzlük 121.5) | Doku |
|---|---|---|---|---|
| 🛣️ Taş Yol | 26 | ×1.18 | **143.4** | gri taş yüzey, kısa kesik orta çizgi |
| 🛤️ Toprak Yol | 22 | ×1.10 | **133.7** | kahverengi, uzun kesik tekerlek izi |
| 🥾 Keçi Yolu | 15 | ×1.04 | **126.4** | ince, soluk, seyrek kesik |

Yol %5 uzun ama %18 hızlı olduğu için taş yolu takip etmek net ~%12 kazanç — Warband'daki
gibi "yoldan git" bir tercih, zorunluluk değil.

**3. Kavşak ve köprü.** MST'nin her bağlantısı bir yerleşimden çıkmıyor artık: yeni
yerleşim, bağlı yerleşimlere **ve mevcut yol noktalarına** olan mesafeye bakar, en yakını
kazanır. Yol noktası kazanınca ağda gerçek bir **T kavşağı** oluşur (ölçüldü: tipik dünyada
yerleşim dışında **5 kavşak**). Bir yol parçası bir nehir parçasını kesiyorsa
(`Game.segCross`) kesişim noktası `state.bridges`'e **köprü** olarak yazılır: haritada yola
dik kalaslarla çizilir, `Game.onBridge(x, y)` (70 birim) sayesinde `getTerrainInfo` orada
nehrin ×0.5 cezasını **uygulamaz**, adı "🌉 Köprü" kalır ama yolun hız çarpanını alır
(ölçüldü: köprüde 133.7, aynı nehrin köprüsüz yerinde "Nehir Geçidi" ×0.5).

**Maliyet**: parça sayısı 24 → **~150**. `getTerrainInfo` yol döngüsüne önce ucuz bir
kutu elemesi kondu ve `sqrt` karşılaştırması kareye çevrildi; yine de çağrı başına
0.35 µs → **3.84 µs**. Kare bütçesindeki karşılığı ölçüldü (50 NPC, `update` + `renderMap`):
**0.88 ms → 1.17 ms**, yani 16.7 ms'lik bütçenin %1.7'si. Uzamsal ızgara gerekmedi.

*(Kayıt: `state.roads` ve `state.bridges` `state` ile birlikte yazılır. `#56` öncesi
kayıtlarda parçaların `kind`'ı yoktur — `Save.apply` bunu görüp ağı baştan örer.)*

### Terk edilmiş yapılar ve keşif noktaları (#58)
Arazi eskiden yalnız yerleşimlerden ve düşmanlardan ibaretti; iki şehir arası bomboş yol
demekti. Şimdi haritada **14 keşif noktası** var (`state.sites`, 5 tür). `LOCATIONS`'a
girmezler — kendi hafif dizileri vardır — ama `type: 'site'` taşıdıkları için hedefleme
ve varış makinesi (`setTarget` → `update` → `enterLocation`) onları **tek satırlık bir
kapıyla** taşır: `enterLocation`'ın ilk satırı `if(loc.type === 'site') return this.enterSite(loc)`.
Yani ekran değil modal açılır, ayrı bir hareket/varış kodu yazılmadı.

**Dağıtım** (`spawnSites`): yerleşimlerden ve birbirlerinden en az `SITE_MIN_GAP` = **520**
birim uzak, kıtanın içinde. Ölçüldü (200 dünya): yerleşime en yakın nokta en kötü **520**
medyan 539, iki nokta arası en kötü **522** medyan 581, kıta dışına düşen **0**.

| Tür | Yenilenme | Sonuç havuzu (ölçüldü, 2000 zar) |
|---|---|---|
| 🏚️ Harabe | **tek kullanımlık** (araştırılınca haritadan silinir) | para %31, pusu %30, ekipman %20, boş %19 |
| 🌾 Terk Edilmiş Çiftlik | 25 gün | erzak %46, asker %22, boş %22, pusu %11 |
| 🗼 Gözetleme Kulesi | 12 gün | uzağı gör %55, boş %24, para %11, tuzak %10 |
| 🕳️ Mağara | 30 gün | pusu %40, para %21, tuzak %20, ekipman %19 |
| ⛺ Terk Edilmiş Kamp | 15 gün | erzak %23, para %22, sığınak %21, pusu %21, boş %12 |

Sonuçlar (`Game.SITE_OUTCOMES`) **günlük olay havuzuyla aynı desende** yazıldı: `when`
süzgeci + metin döndüren `run`. `recruit` yalnız grup kapasitesi varsa havuza girer.
Ağırlıklar toplamında **%57 ödül, %28 risk, %15 boş** — sonuç girmeden bilinmez, ama
tür bir ipucudur: mağara ve harabe kumar, çiftlik ve kamp görece güvenli.

| Sonuç | Ne yapar |
|---|---|
| `coin` | 60–220 dinar |
| `gear` | rastgele silah/zırh envantere |
| `food` | 3–8 tahıl/peynir/et |
| `shelter` | moral +4 |
| `recruit` | bölgenin köylüsü gruba katılır (kapasite varsa) |
| `scout` | 700 birimden uzaktaki en yakın grup **haritaya işaretlenir** — "nerede?" mekaniğinin `state.knownLocations` işareti, 3 gün sonra `Nobles.dailyTick` kendiliğinden siler |
| `trap` | 8–25 can |
| `ambush` | noktanın türüne göre çete doğar (mağara → kurt, harabe → dağ eşkıyası, diğeri → çapulcu) ve `triggerEncounter(npc, 'ambush')` |
| `empty` | üç ayrı boş bulma repliği |

Pusu sonucunun savaşı modalin **kapanışında** açılır: `run` bir `then` döndürür,
`Game.siteDone()` modali kapatıp onu çalıştırır — yoksa savaş modali sonuç metnini eziyordu.

Yenilenme tek alanla çözülür (`kind.renew`): **0 = tek kullanımlık** (nokta silinir),
değilse `usedDay`'den o kadar gün sonra yeniden dolar. Ölçüldü: harabe araştırılınca
14 → 13 nokta, mağara 100. günde araştırıldı → 129. günde hâlâ kapalı, **130. günde açık**.
Araştırılmış ama silinmemiş nokta haritada **soluk** çizilir ve künyesi kaç gün önce
boşaltıldığını yazar.

Etiket yalnız `zoom > 0.18`'de çizilir — 14 uzun ad kıta görünümünde yerleşim adlarını
eziyordu. Ölçüldü: 14 noktanın çizim maliyeti `renderMap` içinde ölçüm gürültüsünün altında
(sitesiz 1.02–1.26 ms, siteli 1.12–1.16 ms).

*(Kayıt: `state.sites` `state` ile birlikte yazılır, `usedDay` korunur. Eski kayıtlarda
nokta yoktur — `Save.apply` içindeki `Game.ensureSites()` doldurur, `ensureTraders` gibi.)*

### Zaman & günlük döngü (`advanceTime` / `dailyUpdate`)
Zaman **sadece** harita ekranında, modal kapalıyken ve oyuncu hareket ederken (veya esirken) akar
(`dt * Game.timeScale()`). Akış hızı oyuncuya bırakıldı: üst çubuktaki takvim rozetine tıklamak
`state.timeScale`'i 0.5 → 1 → 2 arasında döndürür (varsayılan 1; eskiden sabit 2 idi, gün çok hızlı geçiyordu).

**Harita hızı** (`getPlayerSpeed`, Warband'ın modeline yakın):
`(temel + çeviklik×1.5) × (1 + grup bonusu + atlı oranı×0.35) × arazi × gece`.
Temel atlıyken 105, yayayken 66. **Grup bonusu**: tek başına +%50, 10 kişide +%20, 20 kişide 0,
sonrası kişi başı −%1 (taban −%45) — kalabalık ordu ağır ilerler, atlı oranı bu cezayı hafifletir. Atlı oranı = (süvari sayısı + atın varsa 1) / grup.
Arazi `getTerrainInfo()`'dan gelir (orman ×0.8, nehir ×0.5, yol ×1.1) ve künyede adıyla yazar.
Gece (saat <6 veya ≥20) ×0.85.

Her gün:
- Asker maaşı (lvl 10–19: 2, lvl 20+: `level/2`, lvl 51: bedava)
- Yemek tüketimi — düşük kalite (tahıl/ekmek) ve yüksek kalite (et/peynir). Lvl 30+ askerler yüksek kalite alamazsa `debuff` yer (savaşta ×0.7).
  Durum tek yerden okunur: `Game.foodStock()` → `{low, high, total, need, needHigh, days, kinds}`.
  Üst çubuktaki 🍞 rozeti kaç gün yettiğini yazar (3 günün altında kırmızıya döner), künyesinde kalem kalem döküm var.
  Açlık başlayınca/bitince ve seçkin asker et bulamayınca **geçişte bir kez** uyarı çıkar
  (`state.player.wasHungry` / `wasLowQuality`) — kalite eksiği açlıkla karıştırılmasın diye ayrı metin.
  Her erzağın kendi dayanıklılığı var (`ITEMS[].spoil` = gün): tahıl 60, peynir 40, et 30, ekmek 20.
  `Game.spoilFood()` her gün `qty/spoil` kadar eksiltir (kesirli kayıp `it.decay`'de birikir), `foodStock().days` bunu sayar.
- Moral yeniden hesaplanır (`Game.updateMorale`)
- Oyuncu +5 HP
- Köy gönüllüleri yenilenir (köy max 5; şehirler 2 günde bir 4–8)
- Krallar/vezirler zamanla güçlenir (kral 90 günde lvl 20 / 110 asker, vezir lvl 10 / 50 asker)
- %25 ihtimalle rastgele şehirde turnuva açılır, açık turnuvalar %30 ihtimalle kapanır
- Çapulcu sayısı 5'in altına düşerse yenisi doğar
- `Nobles.dailyTick()` — konum işaretlerini eskitir, rakip taliplerin ilgisini artırır, evlilik geliri, düğün günü kontrolü
- `Feast.dailyTick()` — süresi dolan şöleni kapatır, planlanmış/kendiliğinden şöleni başlatır
- `Quests.dailyTick()` — görevlerin `day()` kancası ve süre kontrolü

### Moral
`state.player.morale` (0–100, başlangıç 60). Günlük hedef `Game.moraleTarget()`:
`50 + (idare−1)×3 + yemek çeşidi×5 − açlık 30 − maaş borcu (10..40) − kapasite aşımı×2`.
**Maaş borcu zamana bağlıdır**: ödenemeyen maaş `state.player.wageDebt`'e birikir ve
`Game.wageDebtTick()` her saat 1 moral götürür (`wageLateHours` sayar). Para yeterli hâle
gelince borç kendiliğinden ödenir, sayaç sıfırlanır. Hazine ve moral künyelerinde görünür.
Moral hedefe doğru gider ama **hızlı düşer, yavaş toparlanır** (−10 / +4 gün başına);
zafer +5, yenilgi −15.
- Moral < 25 → her gün `1 + (25−moral)/8` asker **firar eder** (en son katılanlar).
- Savaşta bütün oyuncu askerlerinin can ve saldırısı `Game.moraleMult()` = `0.8 + moral/250`
  ile çarpılır (moral 0 → ×0.8, 50 → ×1.0, 100 → ×1.2).
- Üst çubukta 🎺 rozeti, grup ekranında kalem kalem döküm (`Game.moraleHtml`).

### Arayüz
- **Sefer çubuğu** (`#top-bar`): gün + saat + günün vakti ikonu, dinar, nam, ardından
  **çubuklu** rozetler — can, grup/kapasite, moral, seviye/XP. Son rozet hızdır; üstüne gelince
  `#ui-speed-breakdown` kalem kalem döküm gösterir (temel / çeviklik / grup / atlı oranı /
  arazi / gece). Rozet ikonu atlıysan 🐎, yayaysan 🥾.
- **Künye taşması** `Game.initTooltipClamp()` ile tek yerden çözülür: künye göründüğü anda
  ölçülüp ekran içine kaydırılır (eskiden `#chip-speed`/`#chip-time` için CSS'te elle istisna vardı,
  yeni rozet eklenince yine kesiliyordu). `.tooltip-content` **transform'u animasyonlamaz**
  (`transition: opacity/visibility`) — yoksa ölçüm animasyonun ara değerini okuyup yanlış düzeltir.
- **Her rozette künye** (`Game.updateTips`, `.tooltip-container`): rozetin üstüne gelince o
  değerin ne olduğu, neyden geldiği ve neyi etkilediği kalem kalem çıkar — takvim (akış hızı),
  hazine (günlük maaş/yemek gideri, `Game.upkeep()`), nam (hangi kapı kaç namda açılır),
  can (seviye + zırh payı), grup (kapasite dökümü + birlik dağılımı), moral (`Game.moraleTip`),
  seviye (XP, bekleyen puanlar). Takvim rozeti aynı zamanda tıklanabilir (zaman akışı).
- Karakter ekranındaki her yetenek satırı **şu anki etkisini sayıyla** yazar
  (ör. "Görüş 615 birim", "Esir kapasitesi 8", "Savaş ganimeti +%12").
- **Kenar menüsü**: ikon + ad + kısayol rozeti. Kısayollar `M/C/P/I/Q`, **K** diplomasi
  ekranını açar (`Game.showDiplomacy`), **Esc** her ekrandan
  haritaya döner, **WASD/oklar** haritada kamerayı serbest kaydırır, **Boşluk** kamerayı
  oyuncuya geri getirir (`Game.centerOnPlayer()`)
  — hepsi `Input.init` içinde, modal veya savaş açıkken çalışmaz. Kayıt bölümünde
  **💾 Kayıtlar** (`Save.open()`), 🔊 ses ve **⚙️ Ayarlar** durur.
  `showScreen()` tıklanan butonu `data-view` ile aktifler.
- **Harita künyesi** (`#map-hud`): bulunduğun arazi + hız etkisi, altında birlik dağılımı
  (🪖 piyade / 🏹 okçu / 🐎 süvari), **🎯 Beni Bul** ve **🌍 Diplomasi** düğmeleri.
  `Game.updateMapHud()` doldurur.
  **Harcanmamış puan rozeti** (#35): nitelik/odak puanın varsa aynı satırda
  `✨ 2 nitelik · 3 odak` düğmesi çıkar, tıklanınca karakter ekranını açar. Sıçramaz,
  yalnız ışığı nefes alır (`#btn-points`, `@keyframes pointsGlow` 2.2 sn) — puan harcanınca
  rozet kendiliğinden kaybolur.
  Künye `pointer-events:none` olduğu için düğmeye CSS'te `pointer-events:auto` verilmiştir.
- `Game.setHtml(id, html)` innerHTML'i sadece metin değiştiyse yazar — `updateTopBar` her
  karede çağrıldığı için gereksiz DOM yazımını önler.

#### İşlem geri bildirimi — parlama, uçan yazı, ses (#45)
Alım/satım/asker işlemleri eskiden yalnız `#market-msg` şeridine bir satır yazıyordu; tıkladın
mı tıklamadın mı belli olmuyordu. Artık her işlem tek kapıdan geçer:
`Game.feedback(kind, el, moneyDelta)` → `sfx(kind)` + `flash(el, ok)` + `floatText(...)`.
`kind` = `buy | sell | error | recruit | upgrade`.

- **Ses** (`Game.SFX` + `Game.sfx`): dosya yok, WebAudio osilatörü. Her tür kısa bir arpej —
  al `523→784 Hz` üçgen, sat `659→988`, hata `196→131 Hz` kare dalga, asker `392→523→659`,
  terfi `523→659→880`. `AudioContext` tek örnek olarak tembel kurulur, tamamı `try/catch`
  içinde (ses kapalı/izinsiz tarayıcı oyunu bozmaz) ve `state.muted` ise hiç çalmaz.
- **Mute**: kenar menüsündeki 🔊/🔇 düğmesi (`Game.toggleMute`), durum `state.muted`'da,
  `updateTopBar` `mute-ico`/`mute-lbl`'i yazar. Kayda `state` ile birlikte girer.
- **Parlama** (`Game.flash`): satıra `.fx-flash` (yeşil) ya da `.fx-flash-bad` (kırmızı)
  eklenir. Sınıfı eklemeden önce ikisi de silinip `void el.offsetWidth` ile reflow zorlanır —
  yoksa arka arkaya aynı işlemde animasyon yeniden başlamıyordu.
- **Uçan yazı** (`Game.floatText`): hazine rozetinin üstünde `−65₺` / `+140₺` yükselip söner
  (`.fx-float`, 950 ms sonra DOM'dan silinir). `position:fixed`, `z-index:200`.
- Pazar satırlarına `mrow-buy-<id>` / `mrow-sell-<id>` kimlikleri verildi (`refreshMarket`) —
  parlayacak elemanı bulmanın tek yolu bu. Alışta alış satırı yeşil, karşılığı olan satış
  satırı da sessizce parlar (stok değişti).
- Animasyonlar `style.css` sonunda: `@keyframes fxFlash` / `fxFlashBad` / `fxFloat`.

Bağlanan yerler: `buyItem` / `sellItem` (para yetmezse `error`), `doRecruit` (üç başarısızlık
dalı `sfx('error')`, başarı `recruit`), `promoteTroop` (`upgrade`).

### Karakter
- Nitelikler **hedef/efektif** çalışır (`Game.ATTRS`). Puan vermek `stats.<k>` **hedefini** yükseltir;
  gerçekten işleyen değer `stats.eff.<k>`'dir ve o niteliğe uygun oynadıkça hedefe yaklaşır.
  Okuma her yerde `Game.attr(k)` üzerinden — `stats.str` doğrudan okunmaz.
  `Game.trainAttr(k, w)`: kazanç `w × ATTR_RATE × (0.25 + fark)` — fark büyükken hızlı, hedefe
  yaklaşırken yavaş; 0.25 tabanı olmasa hedefe hiç ulaşılmazdı. Seviye başına **1** puan.

| Nitelik | Etkisi | Neyle gelişir (`w`) |
|---|---|---|
| 💪 Güç | yakın dövüş saldırısı, turnuvada hedef süresi | isabetli vuruş (0.15) |
| 🏃 Çeviklik | harita hızı +1.5, savaş hızı +0.5, turnuva hedef boyutu | yol katetmek (mesafe/1500) |
| 🧠 Zekâ | görüş +30 | görev almak (1) / bitirmek (2) |
| 👑 Liderlik *(eski Karizma)* | grup kapasitesi +3 | kalabalık yönetmek (günlük grup/20) |
| 🫀 Dirayet | max can +5, can yenilenme hızı | savaşta hasar yemek (hasar/60) + günlük 0.1 |

  Ölçüldü (`ATTR_RATE = 0.08`): 5 puanlık farkı kapatmak ~37 eylem — çeviklikte ~11 harita
  geçişi, güçte ~8 savaş, liderlikte ~37 gün, zekâda ~12 görev.
- **Can yenilenmesi** günde +5 sıçraması değil, `Game.regenTick()` ile **saatte 1 can**;
  aralık Dirayet'e bağlı (`hpRegenHours()` = `max(1, 8 − (vit−10)/2)`; vit 10 → 8 saat, vit 20 → 3 saat).
  Üst sınır maxHp. Esarette de işler.
- Yetenek adı çakışmasın diye `leadership` **yeteneği** artık "İdare", nitelik "Liderlik".
- Yetenekler (Bannerlord tarzı odak sistemi). Her seviyede 3 odak puanı; odak XP çarpanını `0.5 + focus` yapar (max 5 odak).

| Yetenek | Etkisi |
|---|---|
| `oneHanded`/`twoHanded`/`polearm` | savaşta hasar çarpanı `0.35 + min(0.4, lvl×0.004)` |
| `bow` | ok hasarı `0.5 + min(0.5, lvl×0.005)`, ok sayısı `24 + lvl×2`, atış süresi `max(0.5, 1.15 − lvl×0.006)` sn, sapmayı azaltır |
| `riding` | atlı savaş hızı `95 + çeviklik×0.5 + (lvl−1)×3` |
| `athletics` | yaya savaş hızı `50 + çeviklik×0.5 + (lvl−1)×1.5` |
| `leadership` | grup kapasitesi +3/seviye, moral +3/seviye |
| `persuasion` | drahoma pazarlığı |
| `surgery` | ölen askerin yaralı kurtulma şansı |
| `prisonerMgmt` | esir kapasitesi, esir kaçışını azaltır |
| `pathfinding` | harita hızı ×(1 + (lvl−1)×0.02) |
| `spotting` | görüş +25/seviye (`Game.getVisibility`) |
| `trade` | alışta indirim / satışta prim, en fazla %25 |
| `looting` | savaş ganimeti +%4/seviye |
| `trainer` | her gün en tecrübesiz `lvl−1` askere +1 XP |
- Seviye atlama: `xpNext *= 1.5`, +10 max HP, tam iyileşme.
- Grup kapasitesi: `12 + floor((cha−10)×3) + (İdare−1)×4 + floor(nam/40)` — yeni karakter
**12 kişiyle** başlar; ordu nitelik, yetenek ve namla birlikte büyür (temel 50 → 24 → 12).
Nitelikler efektif, yani kesirli olduğu için kapasite **kaynağında** kırpılır (#43) — rozet,
künye dökümü ve bütün karşılaştırmalar aynı tam sayıyı görsün diye (eskiden
`15/15.785700000000002` yazıyordu). Künyedeki İdare satırı oyuncunun **kendi** seviyesini
okur, `profLvl` (gruptaki en yüksek) değil — yoksa yoldaş varken döküm toplama uymuyordu.

### Başlangıç dengesi
Başlangıç: **250 dinar** (geçmiş seçimleri ±300 oynatır), grup kapasitesi 12, 1 kişilik grup. Erken oyunda her dinar bir karar;
ordu liderlik/karizma ile büyür. Düşük seviyeli düşmandan alınan ödül `Battle.rewardScale` ile kısılır.

### Paralı asker
Handa şehir başına 2 kalem, 3 günde bir tazelenen havuz (`state.mercPools`): hazır
seviye 10–15 asker (şehrin kendi fraksiyonunun ağacından), kişi başı `60 + seviye×12` dinar. Gönüllü grindine alternatif —
parayı doğrudan orduya çevirmenin tek yolu.

### Grup & asker
- **Fraksiyon asker ağaçları** (`TROOP_TREES`): her krallığın kendi köylü → dal → elit
  zinciri var. Tek kaynak tablodur; `TROOP_UPGRADES` ve `TROOP_TYPES` yüklemede ondan
  üretilir (satır formatı `[ad, tür, hp, hız, saldırı, savunma, ikon, hasar türü, terfi bedeli]`;
  köylü satırında terfi bedeli yoktur).

| Fraksiyon | Köylü | Dallar (orta → elit) | Karakter |
|---|---|---|---|
| Svadya | Svadya Köylüsü | Milis→Çavuş, Avcı→Keskin Nişancı, Süvari→Şövalye | dengeli, en güçlü ağır süvari |
| Rodok | Rodok Köylüsü | Mızraklı→Kalkanlı, Nişancı→Tatar Yaylısı | **süvarisi yok**, en yüksek savunma ve okçu hasarı |
| Veagir | Veagir Köylüsü | Piyade→Baltacı, Okçu→Nişancı, Atlı→Süvari | baltalı piyade, ölümcül okçu, vasat süvari |
| Nord | Nord Serfi | Savaşçı→Baltacı, Avcı→Nişancı | **atsız**, en güçlü piyade (Baltacı 80 hp / 24 atk) |
| Kergit | Kergit Çobanı | Atlı→Süvari, Atlı Okçu→Han Muhafızı | **hepsi atlı**, en hızlı (105–118), ince zırh |

- **Askerin de hasar türü var (#37)**: ağaçtaki hasar türü kolonu `TROOP_TYPES` üzerinden
  `Battle`'ın doğurduğu birime (`u.dmgType`) geçer, oradan zaten hazır olan
  `Battle.afterArmor` matematiğine girer. Kural basit: **balta/kılıç kesici, mızrak ve
  yay delici, köylünün sopası ezici**; süvari kesici sayılır çünkü mızrağını zaten
  `chargeMult` temsil eder. Çeteler tek alanla ayarlanır (`BAND_KINDS[].dmg`) —
  çapulcu ve dağ eşkıyası sopalı (`blunt`), köy milisi ve kervan muhafızı yabalı/mızraklı
  (`pierce`), kalanı kesici.
  - Orta kademe mızraklı artık zırhlı elite karşı gerçekten işe yarıyor. Ölçüldü
    (`Battle.dealMelee` ile 200 tekrar, hedef karşılık vermiyor): Rodok Mızraklısı bir
    Nord Baltacısı'nı (savunma 13) **84.9 sn → 24.8 sn**'de indiriyor, Svadya Milisi bir
    Rodok Kalkanlısı'nı (savunma 18) **74.1 sn → 39.8 sn**'de. Zırhsız hedefe karşı fark yok.
  - Elit dengesi bozulmadı: Nord Baltacısı vs Rodok Kalkanlısı hâlâ %100 (11.9 sn),
    Nord Baltacısı vs Svadya Şövalyesi %69. *Denemede Rodok Kalkanlısı'na `pierce`
    verilmişti; savunma 18 + delici birleşince baltacıyı %100'den %1'e düşürüyordu —
    ağır kalkanlı piyade bu yüzden kısa kılıçla (kesici) dövüşür.*
  - Köylü sopası (`blunt`) hem zırha karşı biraz daha iyi (Svadya Köylüsü → Svadya Milisi
    38.7 sn → 30.5 sn) hem de düşürdüğü düşmanı bayıltır: acemi orduyla savaşmak esir
    oranını %45'ten %90'a çıkarır (`stunned`, bkz. "Esir alma").
  - Grup ekranında asker satırında tür yanında yazar ("Piyade · delici").

- Kaynaklar fraksiyona bağlı: köy/şehir gönüllüsü `Game.recruitName(loc)` ile o yerleşimin
  köylüsünü verir, handaki paralı asker havuzu ve savaştaki düşman fraksiyon ordusu
  `Game.factionTroopPool(faction)`'dan gelir (her daldan 2 pay orta, 1 pay elit).
  Bilinmeyen/boş fraksiyon Svadya ağacına düşer; eski kayıtlardaki `Acemi Asker`
  Svadya köylüsünün takma adıdır.
- **Grup ekranı** (#51): her satırda sınıf (`Game.troopClassName`) + hasar türü yazar, sağında
  **▲ / ▼** (aynı adlı askerler blok hâlinde yer değiştirir, `moveTroopGroup`; sıralama
  `state.player.party` dizisinin kendisidir) ve **➖** (`dismissTroops` → "Bir Tane / Hepsi"
  onayı) durur. Terfi düğmeleri de artık kör tercih değil: her seçenekte ikon + sınıf +
  hasar türü yazar ("🐴 Svadya Süvarisi · Süvari · kesici"). Sınıf **hızdan** okunur —
  Kergit Atlı Okçusu ağaçta `archer`'dır ama 108 hızla gezer, yaya tavanı 66 / süvari
  tabanı 95 olduğu için ≥90 hız "atlı" sayılır ve "Atlı Okçu" yazılır.
  Esir bölümünde kapasite, günlük kaçma ihtimali (`max(1, 6 − Esir Yönetimi×0.5)`) ve
  eldeki esirlerin toplam değeri görünür.
- XP savaşta öldürme başına +1. XP dolunca ya otomatik seviye atlar ya da `TROOP_UPGRADES` varsa **terfiye hazır** olur — grup ekranından dinar ödeyerek sınıf seçilir. Terfi kademesi ada değil ağaca bakar: üstü olmayan asker elit (lvl 20) sayılır.
- Tavan lvl 50. Boss'tan düşen **Savaş Tanrısı Nişanı** ile lvl 51 "Efsanevi" yapılır: maaş ve yemek istemez, +100 HP / +15 saldırı.

### Yoldaşlar (`COMPANIONS`)
7 isimli kahraman, her biri bir şehrin hanında bekler (`c.city`), 600–900 dinara katılır.
- Savaşta **ölmezler**, yalnızca yaralanırlar; sıradan asker gibi seviye atlarlar (`Game.giveTroopXp`).
- Uzmanlık yeteneklerini gruba katarlar: `Game.profLvl(id)` "gruptaki en yüksek" kuralını
  uygular (yaralı yoldaş katkı vermez).
- **Husumet**: `dislikes` listesindeki yoldaş gruptayken katılmazlar (Gaddar Kudret ↔ Cerrah
  Ferhat / Tüccar Mervan).
- Günde 20 dinar ücret + 1 yemek isterler.
- Grup üyelerinin savaş/ekran verisi `Game.troopStats(t)`'ten gelir — yoldaş ve eş
  `TROOP_TYPES`'ta olmadığı için her çağıran kendi varsayılanını uyduruyordu.

### Envanter & ekipman
Silah / zırh / at slotları. Zırh max HP'ye, silah saldırıya, at harita hızına (66 → 105) etki eder.
Ticaret malları pazarda alınıp satılır (satış fiyatı ×0.7).

**Erzak ticaret malı değildir (#47)**: tahıl 4, ekmek 6, peynir 16, et 20 temel fiyat —
eskisinin **beşte biri**. Ordunun günlük yemi para akışını tek başına bitiriyordu; ölçüldü,
20 kişilik ordu günde 20 tahıl yiyor: eskiden ~270₺, şimdi **40₺** (aynı orduya maaş 40₺).
Ticaret malları (demir, kadife, bira, tuz) indirimden etkilenmedi — onlar kâr için taşınır.
Kafileler bunun için araba dolusu erzak taşır (bkz. "Ticaret partileri").
Al/Sat butonlarının yanında **x5** var; her işlem `#market-msg` şeridine ürün + adet + ödenen/alınan tutar + kalan dinar yazar
(`Game.marketMsg`). Para yetmezse alabildiği kadarını alır ve bunu söyler — `alert()` kullanılmaz, pazarı kapatırdı.

#### Mal başına arz/talep fiyatı (#24)
Fiyat artık şehre girerken atılan **tek zar** değil (eskiden bütün mallara aynı 0.8–1.2
çarpanı vuruyordu, yani rota kurulamıyordu). Her yerleşimin her mal için kendi çarpanı var:

- `Game.basePriceMult(loc, id)` = **üretim bölgesi** (`Game.GOOD_ORIGIN`: Svadya tahıl 0.70,
  Rodok bira 0.65 / demir 0.80, Veagir et 0.70, Nord tuz 0.70, Kergit peynir 0.70; uzak
  krallıkta 1.20–1.35) × yerleşim+mal hash'inden sabit ±%12 sapma × köy düzeltmesi
  (erzak ×0.8, ticaret malı ×1.15) × refah (`1.15 − refah/400`).
- `Game.priceMult(loc, id)` = taban × **arz eğrisi** (`supplyMul`). Fiyatın kendi durumu yoktur;
  oynayan tek şey **stoktur** (aşağıda). Aynı gün pazara ikinci kez girmek fiyatı değiştirmez —
  ölçüldü: Praven'de bira iki girişte de 44₺.
- Pazar listesinde ve lonca defterinde `Game.priceTag()` rozetleri: **ucuz** ≤ −%12 yeşil,
  **pahalı** ≥ +%12 kırmızı.
- **Lonca fiyat defteri** (han → ⚖️ Lonca Ustası → 📈 Fiyat Defterine Bak,
  `Game.guildPrices`): en yakın 5 şehrin bütün erzak/ticaret mallarındaki fiyatı tek tabloda.
  Rota kurmanın bilgi kaynağı bu — Warband'daki "ticaret malları fiyatları" ekranı.

#### Sınırlı stok ve arz eğrisi (#46)
Pazarın elindeki mal sonsuz değil: `loc.stock[id]` (kayda girer, `Save`'deki `locations` dizisinde).

- `Game.stockBase(loc, id)` = `STOCK_SCALE` (şehir 500 / köy 190 / kale 150) × `(0.55 + refah/110)`
  ÷ (üretim bölgesi çarpanı × **√fiyat**). Ölçüldü (refah 86 Praven): tahıl 474, ekmek 361,
  et 148, bira 80, kadife 22; refah 56'lık köyde tahıl 144, et 45. Ucuz temel gıda bol,
  pahalı ticaret malı kıt — bir şehrin ambarı boşaltılamaz, kadife tezgâhı boşaltılır. *(Tam fiyatla bölmek denendi: şehirde 6 top kadife
  kalıyordu, tek yük pazarı boşaltıp ticareti zarara sokuyordu.)*
- `Game.supplyMul` = `(stok/taban)^−0.5`, **0.55–2.0** sınırlı. Stok yarıya inince fiyat ×1.41,
  ikiye katlanınca ×0.71.
- **Fiyat birim birim hesaplanır** (`buyItem`/`sellItem` döngüsü): her alınan mal stoku düşürür,
  düşen stok bir sonrakini pahalılaştırır. Böylece teker teker almakla toplu almak aynı tutar.
- **Stoktan fazlası alınamaz**: tükenmiş malda buton yerine "tükendi" yazar, satır kırmızı
  "stok 0" rozeti taşır. Sattığın mal pazarın stokuna girer ve fiyatı düşürür.
- `Game.stockTick()` her gün stoku tabanına `0.08 + refah/700` oranında yaklaştırır
  (refah 50 → %15/gün). Ölçüldü: 80'lik bira stoku sıfırlandıktan sonra 12 günde 63'e,
  fiyat 87₺'den 45₺'ye döndü.

Ölçüldü (yeni dünya, ticaret yeteneği 1) — **tek yükün kârı, yük büyüdükçe payı düşer**:

| Mal / rota | 10 birim | 20 birim | 30 birim |
|---|---|---|---|
| Bira, Jelkala→Reyvadin | +116 (%35) | +182 (%26) | +253 (%24) |
| Tuz, Sargoth→Uxkhal | +287 (%49) | +462 (%38) | +575 (%31) |
| Demir, Veluca→Tihr | +383 (%37) | +618 (%29) | +553 (%16) |
| Kadife, Veluca→Narra | +404 (%11) | **−741 (−%9)** | **−3847 (−%27)** |

Yani ucuz mal (bira/tuz) yükü büyüttükçe kâr getirir, pahalı mal (kadife, şehirde 22 top)
tek pazarı doyurur: 20 topu tek şehre boşaltmak zarardır, yükü şehirlere bölmek gerekir.
Bir çapulcu savaşı ~80 dinar olduğu için ticaret hâlâ gerçek bir meslek.

### Yerleşimler
- **Şehir**: pazar, köle tüccarı, han (dinlenme + ozandan şiir öğrenme + **paralı asker** +
  **lonca ustası** + **yoldaş** kiralama), **arena** (her zaman açık), turnuva (varsa), lordlar salonu,
  şölen (varsa katıl; kendi krallığındaysa ver), gönüllü toplama
- **Kale**: lordlar salonu, şölen (varsa)
- Aktif göreve bağlı butonlar da burada çıkar (ör. tavuk kovalama).
- **Kendi tımarında** (`loc.owner === 'player'`, köy hariç): **🛡️ Garnizon** ve **📦 Depo**
  düğmeleri en üstte çıkar (bkz. "Tımar yönetimi").
- **Köy**: köy yaşlısı (duruma göre diyalog), gönüllü toplama, erzak pazarı,
  **köyü yağmalama**. Savaştaki krallığın köyünde yalnızca yağma seçeneği çıkar — düşman
  köyü sana ne asker ne erzak verir. **Köy yaşlısı her durumda konuşur** (#50): ağzı
  duruma göre değişir — 30 günlük yağma penceresi içindeyse (`Game.raidedRecently`)
  açık düşmanlık ve arkadan taş, düşman krallığın köyündeyse korkmuş/soğuk ret,
  onursuzluk kademen 2 ise ("💀 Köy Yakan") dost köyde bile "çabuk git". Yağmaladığın
  köy o pencerede **gönüllü ve erzak da vermez** — küfrettiği adama peynir satmaz.
- Düşman (savaşta olduğun) fraksiyonun şehri/kalesi ise sadece **kuşatma** seçeneği çıkar —
  pazar, han, salon, gönüllü, hatta görev düğmeleri bile kapalıdır (#48). Bağımsızsan aynı
  düğme "Kuşat! (Kendi Krallığını Kur)" olur, iki ayrı kuşatma düğmesi çıkmaz.
- **Refah** (`loc.prosperity`, 35–90; `init()`'te atanır, kayda yazılır) tek sayıdır ve üç yeri
  besler: garnizon (`Game.garrisonOf` = temel × (0.6 + refah/125)), gönüllü tazelenmesi
  (+refah/40) ve pazar çarpanı (× (1.15 − refah/400) — bolluk fiyatı düşürür).
  Her gün kendiliğinden toparlanır: 50'nin altındaysa +0.4, üstündeyse +0.15 (tavan 90).

#### Yerleşim sahnesi — düğmeler bina olarak (#60)
Yerleşim ekranı düz bir düğme listesiydi. Şimdi listenin üstünde `#scene-canvas`
(900×280) var ve **sahne düğmelerden üretilir**: `Game.renderScene(loc)` `#settlement-actions`
çocuklarını okur, her düğmenin **ikonunu** bir yapı türüne çevirir (`SCENE_KIND`:
👑🛡️🏆 → kule, 🍺🧓⛓️ → ev, 🏭 → atölye, 🛒🍷 → tezgâh, 🪖⚔️ → çadır, 🤺 → arena çemberi,
🔥 → ateş, 🐔 → kümes, 🚪 → kapı; tanınmayan ikon eve düşer) ve o yapıyı çizer.

**`addBtn` tek kapı olduğu için yeni bir yerleşim düğmesi kendiliğinden bina olur** — ayrı
bir "hotspot tablosu" tutulmaz. Tıklama da öyle: `cv.onclick` bulduğu kutunun
`btn.onclick()`'ini çağırır, yani sahne düğmenin ikizidir, kopyası değil.

| Parça | Kural |
|---|---|
| Yerleşim | Çift indisli düğmeler ön sırada (122×88, taban `H−16`), tek indisliler arka sırada (96×66, ×0.82 karartma) |
| Gök | `state.time.hour`: gece <6/≥20, tan 6–8, gün batımı 18–20; gece yıldız + ay diski, gündüz güneş |
| Arka plan | Köy: tarla şeritleri + çit · Kale: mazgallı iç kale + sancak · Şehir: 7–12 evlik silüet; hepsinin önünde 92 birim yükseklikte sur, mazgal, kapı kemeri ve fraksiyon flaması |
| Rastgelelik | `Game.sceneRnd(loc, i)` = `loc.id + '|' + i` hash'i (×131) — **kayda hiçbir şey yazılmaz**, aynı şehir her açılışta aynı silueti verir |
| Fareyle | `cv.onmousemove` kutu testi; **yalnız üstündeki bina değişince** yeniden çizilir, imleç `pointer` olur, bina altın `shadowBlur` ile parlar, üstünde adı yazan plaka çıkar |

**İç mekân** (`Game.sceneBg(kind)`): han ve lordlar salonu modalinin arkasına o mekânın resmi
konur — `showModal`'ın zaten var olan üçüncü argümanı (`bgImage`) kullanılır. Çizim bir kez
yapılıp `toDataURL` ile önbelleklenir (`_sceneBg`). Han: ahşap duvar + kirişler, ocak ışığı,
fıçılar, uzun masa, asma kandiller. Salon: taş sıraları, sütunlar, iki sancak, taht, kırmızı
halı, meşaleler. *Modalin siyah perdesi 0.80/0.90'dan **0.62/0.82**'ye indirildi — eski değerde
çizim tamamen yutuluyordu, yazı hâlâ okunur.*

**Bütün çizim koddadır** — dışarıdan tek bir görsel dosya gelmez, yani lisans/atıf sorunu yok.

Ölçüldü: 25 yerleşimin **25'inin de arka plan parmak izi farklı**; düğme yerleşimi türe göre
3 kalıp (şehir 9 düğme, köy 5, kale 3 — durum düğmeleriyle, ör. turnuva veya kendi tımarın,
sayı artar). Sahnenin tam çizimi **1.62 ms** (yerleşime girerken ve fare binayı değiştirince
bir kez), aynı bina üstünde gezinen fare **0.007 ms** (erken çıkış, yeniden çizim yok).
Gök gerçekten değişiyor: aynı şehrin sol üst pikseli öğlen `120,172,222`, gün batımı
`82,73,100`, gece `14,19,44`. İç mekân JPEG'i **19.8 KB**, ilk açılış **17.3 ms**, sonrası önbellek.

#### Menü ekranlarına tematik zemin (#61)
Envanter/karakter/grup/görev ekranları düz `.glass-panel`'di. Aynı `Game.sceneBg(kind)`
makinesi (bkz. yukarıdaki sahne bölümü) bu ekranlara da zemin çiziyor; tek kapı
`showScreen` → `Game.applyViewBg(id)`, zemin **ekran başına bir kez** konur, sonrası CSS.

| Ekran | Çizim | Ne var |
|---|---|---|
| Karakter | `armory` | Taş duvar, çapraz kılıç, kalkan, iki yan sancak, miğfer rafı |
| Grup | `camp` | Gece göğü + yıldız, tepe hattı, üç çadır, ocak ateşi, mızrak demeti |
| Envanter | `storage` | Ahşap ambar, raflar, sandık + kilit, çuvallar, asılı fener |
| Görevler | `parchment` | Lif dokusu, silik satırlar, yanık kenar, mum mührü |

Perde koyuluğu ekrana göre (`VIEW_BG` = `[kind, üstAlfa, altAlfa]`): koyu çizimlerde
0.70–0.74, açık parşömende 0.60. **Hareketli tuvalin üstünde blur yok** — bunlar statik
`background-image`, `backdrop-filter` eklenmedi (bkz. "Performans").

**Okunabilirlik ölçüldü** (perde altındaki zemin rengi ile metin rengi arasında WCAG kontrast
oranı, ekranın üst üçte biri):

| Ekran | Zemin | `--text-muted` | beyaz | altın başlık |
|---|---|---|---|---|
| Karakter | `19,20,21` | **7.19** | 18.44 | 8.77 |
| Grup | `16,16,20` | **7.40** | 18.98 | 9.03 |
| Envanter | `25,20,15` | **7.13** | 18.29 | 8.70 |
| Görevler | `88,77,57` | **6.07** | 8.28 | 3.94 |

Görev ekranındaki `--text-muted` (#94a3b8) kahverengi kâğıt üstünde **3.23**'e düşüyordu
(AA sınırı 4.5). Çözüm tek satır CSS: değişken `#quests-view` içinde `#e6dcc2`'ye çekildi
→ 6.07. Altın başlıklar büyük ve kalın olduğu için 3.94 AA-large (3:1) sınırını geçer.

Maliyet: ilk açılışta ekran başına **8.2–11.9 ms** (çizim + JPEG kodlama), veri **27–37 KB**;
aynı ekrana ikinci geçişte `dataset.bg` erken çıkışı **0.3 µs**. Yerleşim ekranına zemin
konmadı — orada zaten `#scene-canvas` var.

#### Köy yağması (#21)
`Game.raidVillage(loc)` onay modali → `startRaid` → `Battle.start('Köy Milisi', n, null, faction)`.
Milis sayısı `max(4, refah/5)` (~7–18) ve `BAND_KINDS.militia` karışımından doğar
(Köylü / Köy Avcısı / Köy Bekçisi + 6 kişiden sonra Köy Muhtarı) — fraksiyon ordusu değil,
köylüdür. Savaş kazanılınca `Battle` zafer dalı `Game.completeRaid(locId)` çağırır:

| Kazanç | Bedel |
|---|---|
| `refah × 6 × 0.85–1.15` dinar | Sahibi lordla ilişki **−30**, o krallığın diğer lordları **−6** |
| Tahıl `4 + refah/12`, peynir `1 + refah/25` | Refah **−20** (taban 10), `loc.raidedDay` işaretlenir |
| Yağma yeteneğine +60 XP | Köy **7 gün** gönüllü vermez, nam **−6** (zaferin +3'ünü de yer) |

Barıştaki bir krallığın köyünü yakmak **savaş sebebidir** (`declareWar`). Yenilgi/teslim
yollarında `state.player.currentRaid` da `currentSiege` gibi temizlenir.
Ölçüldü: refah 44 köyde 408 dinar + 9 tahıl + 4 peynir, refah 24'e düştü, sahibi 5 → −25,
40 günde refah 54'e toparlandı.

#### Yağma bir eylemdir, ganimet düğmesi değil (#49)
Milisi yenmek yağmanın **başlangıcıdır**. `Game.completeRaid` artık ganimeti dağıtmaz;
`state.player.raid = { locId, t }` kurar, oyuncuyu köyün üstüne çakar ve
`state.player.status = 'raiding'` yapar — kuşatma kampıyla aynı desen: zaman akar
(`update`'in `timeFlows` listesinde), harita tıklaması yok sayılır, sağ altta `#raid-ui`
paneli (kalan süre, ilerleme çubuğu, en yakın lordun mesafesi) durur.

| Sabit | Değer | Ne yapar |
|---|---|---|
| `RAID_SECONDS` | 15 sn | ambarı boşaltma süresi; bitince `finishRaid` → `grantRaidLoot` |
| `RAID_ALERT` | 1600 birim | dumanı gören lord (`npc.raidResponder`) — 15 sn'de ~1200–1600 birim yol alır, yani sınırdakiler yetişir |
| `RAID_COOLDOWN` | 30 gün | aynı köy tekrar yağmalanamaz (`loc.raidedDay`) |

`Game.raidTick(dt)` her karede işaretli lordları köye yönlendirir; biri **60 birim** yaklaşırsa
yağma iptal olur, ilişki **−15** düşer ve `triggerEncounter(responder, 'raid')` savaşı açar.
`'raid'` kipi `triggerEncounter`'ın dostane soylu dalını atlar — yoksa seni suçüstü yakalayan
lord gelip hâl hatır soruyordu. 🚪 *Yağmayı Bırak* ile ganimetsiz çekilebilirsin.

**Yağmacı damgası** artık ayrı bir sayı değil, **şerefin eksi tarafıdır** (#53 madde 1.5).
`Game.infamy()` = `−honor` (yalnız eksi taraf), `infamyTier()`/`infamyLabel()`/`infamyPenalty()`
hâlâ aynı isimlerle duruyor — bütün eski çağrı yerleri (gönüllü, paralı asker, köy yaşlısı,
soylu ağırlığı) tek satır değişmeden çalışır. Bir yağma **−12 şeref**tir.
Aşağıdaki "Şeref" bölümü kademeleri ve ölçülen etkileri yazıyor.

Ölçüldü: rahatsız edilmeyen yağma 15.1 saatte bitiyor, 297 dinar + 8 tahıl + 3 peynir;
900 birimdeki lord (hız 70) 12. saniyede yetişip yağmayı bozuyor ve "🔥 Baskın!" savaşını
açıyor; 2000 birimdeki lord işaretlenmiyor, yağma tamamlanıyor.

### Soylular (`nobles.js`)
23 lord + 12 leydi. Her lordun haritada gezen kendi partisi var (`npc.lordId`); parti kendi
yerleşiminin etrafında dolaşır, böylece salonunda bulunabilir. `Nobles.isAt()` "evinde mi"
kontrolünü 420 birim yarıçapla yapar.

- **Portreler**: lordlar `lord_portraits.jpg` sprite sheet'inden gelir, sheet'te leydi
  yok (#39). Leydi portresi `Nobles.ladyPortrait(n, size)` ile **kodla çizilir** — baş
  harf madalyonunun yerini alan satır içi SVG. Her şey `n.id`'nin hash'inden türediği için
  aynı leydi her açılışta aynı yüzle gelir: elbise/ten paleti fraksiyondan
  (`Nobles.LADY_LOOK`), saç/göz/dudak rengi ve yüz genişliği hash'ten, aksesuar **huydan**
  (`ambitious` taç, `pious` tülbent, `romantic` çiçek + örgü, `wild` savrulmuş tutamlar).
  Aksesuar `back`/`front` diye ikiye ayrılır — tülbent yüzün altına çizilmezse yüzü kapatıyordu.
  Lord portreleri fotoğraf olduğu için SVG'nin temiz kenarı yanlarında oyuncak duruyordu:
  hafif `feDisplacementMap` dalgalanması + tuval taneciği + `sepia(0.35)` ile aynı çerçeveye
  yaklaştırılır. `portraitCss` hâlâ tek kapıdır; talip (`suitor_*`) kimlikleri lordun kendi
  portresini kullanmaya devam eder.
- **İlişki** `state.relations[lordId]` (−100..100). `Nobles.relLabel()` etiketler:
  Kan Davalı / Düşman / Kırgın / Kayıtsız / Hoşnut / Dost / Sadık Dost.
- **Mizaç** (`PERSONALITIES`): `martial`, `cunning`, `debauched`, `goodnatured`, `quarrelsome`.
  Selamlama replikleri, hangi hediyeyi sevdikleri, hangi görevi verdikleri ve drahoma çarpanı buna bağlı.
- **Ağırlık** (`Nobles.standing(id)`, −1..4): nam/130 + ilişki + kapıya getirdiğin ordunun
  lordunkine oranı, huysuz mizaçta −1. Selamlama havuzunu (`Nobles.GREETS`) ve sohbetin
  karşılığını belirler: ağırlık ≤ −1 → **−1 ilişki ve tersleme**, 0 → ilişki değişmez,
  1–2 → +1, 3–4 → +2. Diyalog başlığında etiket olarak yazar (`standingLabel`).
- **Diyalog** (`Nobles.talk`): hâl hatır sor (günde 1, ağırlığa bağlı), görev iste, birinin yerini sor,
  hediye ver, şiir oku (görev varsa), kızıyla ilgili konuş, hakaret et (−15 ilişki, +2 nam,
  rakip krallık lordlarıyla +5), bağlılık yemini.
- **Hediye**: mizaca uyan eşya +6..+10, uymayan +1, huysuza her şey +3. Günde bir kez.
- **"… nerede?"** (`Nobles.askWhere`): doğruluk ilişkiye bağlı.
  rel<0 → yalan (gerçek konumdan 800–1500 birim uzağa işaret), 0–19 → sadece yön,
  20–49 → 600 birimlik belirsizlik çemberi, 50+ → 200 birim + 3 gün canlı takip.
  Başka krallıktan birini sormak bir kademe düşürür. İşaretler haritaya altın kesikli
  çember olarak çizilir (`Nobles.drawMarkers`, `renderMap` içinden çağrılır), 3 gün sonra silinir.
- **Karşılaşma**: düşman olmayan bir soylunun partisine çarpmak savaş değil, diyalog açar
  (`Game.triggerEncounter` içindeki `npc.lordId` dalı).

### Lord kişilikleri ve replik havuzu (#59)

Mizaç (`PERSONALITIES`) lordun **ne yaptığını** belirler (hangi hediyeyi sever, hangi görevi
verir, drahoma çarpanı). Ona ek olarak her lordun **nasıl konuştuğunu** belirleyen bir
karakter özelliği vardır (`Nobles.LORD_TRAITS`): 🦚 Kibirli, 🐁 Korkak, 🗡️ Zalim, 🍺 Neşeli,
💰 Paragöz, ⚜️ Onurlu, 🙇 Dalkavuk.

Özellik **kayda yazılmaz**: `Nobles.traitOf(id)` lordun id'sinin hash'inden türer
(`h = h*131 + kod`), yani her açılışta ve bütün eski kayıtlarda aynı lorda aynı huy düşer —
göç kodu, yeni `state` alanı, `Save` değişikliği yok. Ölçüldü (23 lord): çarpan 131 ile
dağılım **2–4** (7 özelliğin hepsi çıkıyor); ilk denenen 31 ile **1–6** idi.

**Havuz** `Nobles.LORD_LINES`, türe göre bölünmüş: `greet` (selam), `chat` (hâl hatır),
`brush` (tersleme), `quest` (görev teklifinin ön sözü), `retort` (hakarete cevap),
`retinue` (maiyet atışması, `[maiyetin sözü, lordun cevabı]` çifti).
Ölçüldü: **119 replik** (greet 42, chat 20, brush 10, quest 20, retort 7, retinue 20 çift =
40 cümle) + eski `GREETS` kademe havuzunun 18 satırı, toplam **137 seçilebilir kayıt**.

Seçim üç süzgeçten geçer (`Nobles.lineFor(kind, id, extra)`):

| Süzgeç | Kaynak |
|---|---|
| Karakter özelliği | `LORD_LINES[kind][traitOf(id)]` |
| Oyuncunun ağırlığı | `band(standing(id))` → **0** ciddiye almıyor / **1** normal / **2** çekiniyor–yağcılık. `greet`'te özellik havuzu da banda göre üçe ayrılmıştır, diğerlerinde `b0/b1/b2` havuzu eklenir |
| Bağlam | çağıran yer `extra` ile o anki dünyadan replik ekler (sohbette fraksiyonun vergisi, rastgele bir lordun adı) |

Nam, ilişki ve kapıya getirdiğin ordu `standing`'e girdiği için **aynı lordun üslubu oyuncu
güçlendikçe değişir**. Ölçüldü (Neşeli bir lord, ilişki 0): nam 0 / 1 kişi → *"Sen de kimsin?
Kapıda bekleyen dilencilere sadaka veriyoruz, salonda değil."*; nam 600 / 80 kişi →
*"Ordunu kapımın önünde gördüm. Dostça geldiğini varsayıyorum... değil mi?"*

**Tekrar süzgeci** `Nobles.fresh(pool, kind)` — `Game.dailyEvent`'in "son N" deseni, iki farkla:
sayaç **tür+bant başına** tutulur (`state.recentLines`) ve geriye bakış **havuzun %60'ı**
kadardır. Sabit 12'lik pencere küçük havuzu tamamen boşaltıyor ve seçim rastgeleye düşüyordu.
Ölçüldü (5 replikli havuz, 300 çekiliş): süzgeçle **bitişik tekrar 0**, üç çekilişlik pencerede
tekrar **0**; süzgeçsiz **66 (%22)** ve **141 (%47)**.

**Maiyet atışması**: `Nobles.retinueHtml(id)` her diyalogda değil, **%34** ihtimalle araya girer;
konuşan `RETAINERS`'tan rastgele biridir (Yaşlı çavuş / Kâhya / Silahtar / Danışman / Genç uşak /
Kâtip) ve lordun cevabıyla birlikte iki satır olarak lordun repliğinin altında durur.

**Yazı makinesi** `Game.typeIn(elId, text, then, cps)` / `Game.skipType()` — `textContent`'e
karakter karakter yazar (kısmi HTML etiketi ihtimali yok). Tek seferde tek metin yazılır:
yeni çağrı, modalın kapanması ya da **herhangi bir tıklama** onu tamamlar ve `then` kancasını
çalıştırır (maiyet atışması bu kancayla görünür olur). `Game.reduceMotion()` açıksa hiç
beklemez. Ölçüldü: 44 karakter **781 ms** (~56 karakter/sn), tıklama 12. karakterde metni
tamamladı, hareket azaltmada 48 karakter **tek karede** yazıldı.

Bağlandığı yerler: `Nobles.talk` (selam + maiyet + başlıkta özellik rozeti), `Nobles.smallTalk`
(artık `alert` değil, portreli `Nobles.say` modali), `Nobles.insult` (lordun cevabı),
`Quests.offerMenu` (lordun ön sözü; lonca ustasının karakter özelliği yoktur, ona çıkmaz).

### Flört ve evlilik
- **Kadın oyuncuda hedef leydiler değil bekâr lordlardır** (`SUITORS`): her kral olmayan lord
  `suitor_<lordId>` kimliğiyle "leydi şeklinde" sarılır — vasisi kendi kralı, huyu mizacından
  türer (`SUITOR_TRAIT`). Böylece bütün flört makinesi (ilgi, iltifat, şiir, rakip, drahoma,
  nişan, düğün) tek kod yolundan çalışır; `Nobles.courtables()` cinsiyete göre listeyi seçer,
  `Nobles.lady()` her iki kimliği de çözer. Liste erkek oyuncuda hiç üretilmez (`SUITORS` boş kalır).
  Kadın oyuncuda salonda ayrı konuk bölümü yoktur: kur, lordun kendi diyaloğundaki
  **💘 Ona kur yap** düğmesinden yürür (80 nam kapısı orada) ve rakip talip bir leydidir —
  şeref düellosuna onun yerine **vasisi** çıkar (`Nobles.duelTarget`).
- Salonun leydi bölümüne girmek **80 nam**, şölene girmek **150 nam** ister.
- **İlgi** `state.affection[ladyId]` (0..100). Artırma yolları: sohbet +3 (3 gün bekleme),
  iltifat (huya uyarsa +5, ters düşerse −8, nötr +1), şiir +12 (her leydiye her şiir bir kez),
  turnuva zaferini ithaf +18 (`state.pendingDedication`), düello galibiyeti +15.
- **Huylar** (`LADY_TRAITS`): `romantic`/`ambitious`/`pious`/`wild` — her biri bir iltifat
  konusunu sever, bir tanesinden nefret eder. Ekranda ipucu verilir.
- **Rakip talip**: oyun başında %60 ihtimalle atanır (`state.rivals`), günde +1.5 ilerler.
  100'e ilk ulaşan nişanlanır. Karşı hamle: şeref düellosu (`Battle.startDuel`, 1v1, grup
  sahneye girmez) ya da itibar lekeleme (%30 geri teper).
- **İsteme** (`Nobles.askForHand`): ilgi ≥60, nam ≥120, vasiyle ilişki ≥25 şartı.
  Drahoma: `8000 + kale/şehir×400 − 2200·log10(1+nam/60) − ilişki×25`, mevki çarpanı (kendi krallığın 0.6 /
  derebeyi 0.8 / bağımsız 1.0) ve mizaç çarpanı (cunning 1.3 … goodnatured 0.8), alt sınır 2500.
  Ölçüldü: nam 120/ilişki 25 → ~10500, nam 300/ilişki 80 → ~8000, nam 1000/ilişki 100 + kendi krallığın → ~3700.
  Kalemi kalemine gösterilir. Seçenekler: öde / pazarlık (ikna seviyesine bağlı, %20 indirim,
  günde bir) / "param yok ama kılıcım var" (200 nam, görev alınca drahoma yarıya iner) /
  kaçırma (−60 vasi, −20 krallık, −30 nam).
- **Nişan → düğün**: `Feast.schedule()` ile 5–10 gün sonrasına bir şölen kurulur.
  O gün orada olman gerekir; iki gün geçerse rezil olursun (−25 ilişki, −25 ilgi).
- **Evlilik**: +15 idare hakkı, eşin krallığının lordlarıyla +20, günlük +50 dinar,
  eş gruba katılır.

### Şölenler (`Feast`)
10–20 günde bir rastgele şehirde 4 gün sürer. O krallığın bütün soyluları orada sayılır
(`Nobles.isAt` şöleni de kabul eder). "Salonu dolaş" herkesle bir kez +2 ilişki verir.
Kendi krallığının şehrinde 3000 dinar + 30 et/peynir ile şölen verebilirsin (+5 ilişki, +15 nam).

### Görevler (`quests.js`)
Görev motoru olay tabanlı. `Quests.emit(ev, data)` çağrıları: `entered_location`, `bought_item`,
`battle_won`, `escaped_captivity`, `tournament_end`, `chickens_caught`, `talked_to`,
`poem_recited_lord`. Ayrıca `Quests.dailyTick()` her gün `day(q)` kancasını çağırır ve
süre dolmasını kontrol eder.

Görevler Warband'ın görev listesinin kopyası değil; **WebBand'ın kendi mekaniklerini** hedefler:

| Görev | Hangi mekanik |
|---|---|
| Tereyağı Ablukası | Pazardan belirli şehirde 15 peynir alımı |
| Sisteki Nokta | Sis + sıcak/soğuk ipucu (500/1200 birim) ile gizli nokta avı |
| Çavuşluk Sınavı | Terfi ağacı — 20+ seviye 5 asker ile lordun kapısına gitmek |
| Aç Ordu | Günlük yemek tüketimi — kendi ordun yükü yerken 20 yemek taşımak |
| Zincirdeki Kardeş | **İki çözüm**: çeteyi yen, ya da bilerek esir düşüp kaçış planı mekaniğiyle çık (ekstra ödül) |
| Şike | Turnuvada 5–8 arası skorla elenmek (−15 nam, +2500 dinar) |
| Yalan Haber | "Nerede?" mekaniği — 2+ lorda yalan söyle; sonra 5 gün onlar da sana yalan söyler |
| Deli Hüsnü'nün Tavukları | Turnuva minigame'inin 15 saniyelik / 8 hedeflik tavuk varyantı |
| Hasat Nöbeti | Köy yakınında bekle, 2 çapulcu dalgası püskürt |
| Kayıp Mektup | Köyden al, başka bir lorda götür |
| Bir Şiir Getir | Meyhane ozanından şiir öğren, lorda oku |
| Kervan Yolu Temizliği | *(lonca)* 2 çapulcu grubu dağıt, sonra hedef şehre var |
| Lonca Siparişi | *(lonca)* 10 birim ticaret malını loncanın şehrine getir |

Görev veren lord olabilir, **lonca ustası** da olabilir (`giverId = 'guild_<locId>'`,
`Quests.giver()` ikisini de çözer). Lonca ustasının ilişkisi yoktur: ödülü yalnızca dinar
ve nam, başarısızlığın ilişki cezası yok. `Quests.back()` lordda diyaloga, loncada hana döner.

Kabul edilen görevler `state.player.quests`; **Görevler** sekmesi (`#quests-view`) listeler.
Reddedilen lord 7–15 gün yeni görev vermez (`state.questCooldown`).
Başarısızlık −10 ilişki. Bir lordda aynı anda tek görev olabilir.

### Ticaret partileri — kervan ve kafileler (#22)
Harita artık yalnız haydutlar ve lordlardan ibaret değil: yollarda **6 kervan + 8 köylü
kafilesi** dolaşır (`Game.ensureTraders`, `spawnTrader`). İkisi de `BAND_KINDS`'ta bir çete
gibi tanımlıdır (`trade: true`), böylece harita ikonu, savaş birim karışımı ve reis mantığı
hazır makineden gelir.

| Parti | Rota | Muhafız | Yük (ölçüldü) | Harita ikonu |
|---|---|---|---|---|
| Kervan | şehir → barıştaki başka şehir (`traderNext`) | 6–14: Kervan Muhafızı / Okçu / Atlı Muhafız + **Kervanbaşı** | 2 kalem ticaret malı + 120–380 dinar kese → satışta **790–1350 dinar** | araba (`cart`), altın sarısı |
| Köylü kafilesi | köy ↔ en yakın şehir (mekik) | 3–7: Köylü / Köy Avcısı | 15–44 tahıl + 5–19 peynir + 20–70 dinar → **100–270 dinar** | mızraklı yaya, açık yeşil |

- Yük değerce dengelenir: `qty ≈ (3–7) × 100 / basePrice`, yani kadife 1–2, bira 10–19 taşınır.
- **Saldırmazlar.** `isHostile` false döner; yalnızca krallığıyla savaştaysan senden kaçarlar.
- Çarpışınca savaş değil **seçim** açılır (`Game.meetTrader`): 🗡️ Soy / 🚪 Yoluna Bırak
  (bırakınca `encounterCooldown = 6`, dibinden geçerken modal tekrar açılmaz).
- **Soymak eşkıyalıktır** (`Game.robTrader`): barıştaki krallığın kafilesini vurmak
  **−5 nam** ve o krallığın *bütün* lordlarıyla **−4 ilişki** demektir (zaferin +3 namıyla
  birlikte net −2). Savaştaki krallığın kervanı meşru ganimettir, ceza yoktur.
- Zafer ganimeti: yük doğrudan envantere, kese doğrudan kasaya (`beaten.cargo` / `beaten.purse`,
  zafer modalinde "Yük Ganimeti" satırı). `rewardScale` yalnız dinar ödülünü kısar, yükü kısmaz.
- Vardıkları yerleşimin refahını besler (kervan +0.5, kafile +0.15 / varış).
- Kafileler `state.npcParties`'te durduğu için kayda kendiliğinden yazılır; eski kayıtlar
  `Save.load` içindeki `Game.ensureTraders()` ile doldurulur.

### Yol kesme — haydutlar kervan avlar
Kafileleri yalnız oyuncu soymaz. `Game.banditTick()` her gün (`dailyUpdate`, `warTick`'ten
sonra) haydut çeteleriyle ticaret partilerini eşleştirir: **400 birim** içinde kesişen varsa
baskın olur. Kurt sürüsü yağma yapmaz (`BAND_KINDS[].beast` elenir).

- Güç zarı `size × 0.7–1.3`; kervan muhafızı **×1.15**, köylü kafilesi **×0.5** ile direnir —
  yani kervan sık sık püskürtür, köylü neredeyse hep kaybeder.
- **Püskürtülen çete** yarı yarıya kırılır (4 kişinin altına düşerse dağılır), kafile birkaç
  kişi kaybeder ve yoluna devam eder.
- **Basılan kafile haritadan silinir**; yük ve kese *çetenin üstüne geçer* (`b.cargo` aynı
  kalemde birleştirilir, `b.purse` toplanır). Zafer dalı `beaten.cargo`/`beaten.purse`'ü
  zaten envantere yazdığı için **o çeteyi yakalayan yükü de alır** — ek kod yok.
  Künye (`npcTipHtml`) artık yükü ticaret partisine özel değil, taşıyan herkese gösterir.
- Ulaşamayan yük varış yerleşiminin refahını düşürür (kervan −1.5, kafile −0.5).
- Haberler `state.warLog`'a düşer (bildirim çıkmaz, diplomasi ekranından okunur).

**Çete artık ava çıkar (#38)**: `updateNPCs`'te haydut partisi, oyuncuyla ilgilenmiyorsa
(`!notices`) **1200 birim** içindeki en yakın ticaret partisine yönelir. Peşine düşme şartı
baskının güç şartıyla aynı: `kafile gücü × (kervan 1.15 / köylü 0.5) < çete × 1.2` — zayıf
çete güçlü kervanın peşinde ölmez. Kurt sürüsü avlanmaz (`beast`). Hedef `npc.hunting`'de
durur ve harita künyesinde "🎯 Peşinde: …" satırı olarak görünür; baskını yine `banditTick`
çözer, yani av davranışı sadece **yolları kesiştirir**.

Ölçüldü (200 gün, oyuncusuz, 3 tohum — her tur ayrı sayfa yüklemesiyle):

| | av yokken | av varken |
|---|---|---|
| Baskın / gün | 0.11 / 0.18 / 0.27 (ort. **0.19**) | 0.43 / 0.70 / 0.92 (ort. **0.68**) |
| Püskürtme (200 günde) | 9–11 | 21–30 |
| Basılan kafilenin ömrü | 13–21 gün (ort. 16) | 6–8 gün (ort. **7**) |
| 200. günde yüklü çete | 2–5, kese 49–229 dinar | 0–1, kese **668–822** dinar |

Yani av davranışı baskını **3.5 katına** çıkarıyor ama haritayı yüklü çeteyle doldurmuyor:
çete daha çok vuruyor, daha çok püskürtülüp dağılıyor, ayakta kalan az sayıdaki çete
**çok daha zengin** oluyor. Kafile sayısı `ensureTraders` sayesinde 14'te sabit kalır.

### Karşılaşma & savaş
- Düşmanlık kuralları `isHostile()`: çapulcular 120 birim içinde her zaman saldırır, oyuncu 1.5× güçlüyse kaçar; ilk 14 gün id hash'ine göre kademeli agresifleşir.
- **Kaçış menzili güç farkına bağlı** (`updateNPCs`): zayıf çete `360 + min(640, (bizim güç/onun gücü)×240)`
  birimden seni fark edip kaçar. **Soylu kaçmaz** (#48): lord partisinin kovalama eşiği
  `size × 1.5`, yani kendinden kalabalık orduya da yürür; ancak belirgin şekilde güçlüysen
  geri çekilir. Ölçüldü (100 kişilik lord): 101 ve 122 kişilik orduya yürüyor (300 → 20 birim),
  151 kişilikten kaçıyor (300 → 580 birim). Eskiden `isHostile` false dönünce hiç kaçmıyor, dibine girene kadar dolaşıyordu. Soylular (`npc.lordId`) yalnızca düşman krallığın vassalıysan ya da ilişki ≤ −50 ise saldırır; aksi halde çarpışma **diyalog** açar.
- Karşılaşma modali: savaş / **askerlerini gönder** / **kaç** / teslim ol (#30). (İlk 14 günde
  çapulcular %25 ihtimalle "uzaklaş" seçeneği verir.) Hayvan sürüsüne teslim olunmaz.
- **Savaş öncesi asker mırıltısı** (#35, `Game.troopChatter`): düşmanın repliğinin altında
  kendi adamlarından biri de iki çift laf eder ("Nereden geldim buraya, anamın evi
  sıcacıktı..."). Havuz koşullara göre seçilir — **korku** (düşman/senin oran ≥ `1.3 +
  (İdare−1)×0.08` ya da moral < 25), **açlık** (stok günlük ihtiyacın altında), **maaş borcu**,
  **cesaret** (moral ≥ 70 ya da oran ≤ 0.6), kalanı **homurdanma**. Konuşan rastgele bir grup
  üyesidir, adı `troopLabel`'den gelir; grup boşsa kimse konuşmaz. Ölçüldü (11 kişilik grup,
  40'ar örnek): 3 kişilik düşman + moral 80 → hep cesaret, 40 kişilik düşman → hep korku,
  denk düşman → homurdanma, erzak biterse açlık, borç varsa maaş; 16 kişilik düşmana karşı
  **İdare 1 korkarken İdare 8 yalnız homurdanıyor**.

#### Kaçış, otomatik çözüm ve dalgalar (#30)
**Kaçış** (`Game.fleeChance` / `fleeEncounter`): pusu ve yağma baskını dışında her
karşılaşmada çıkar. Şans **hız oranına** bağlıdır: `clamp(0.1, 0.9, (senin hızın/onun hızı − 0.8) × 1.2)`.
*(Fark tabanlı formül denendi — 20 kişilik ordu Kergit atlılarından %89 ile kaçıyordu.)*
Başarısızlık normal savaştır. Ölçüldü (yeni karakter): yaya tek başına (hız 122) çapulcudan
(66) %90, lord partisinden (84) %78, Kergit'ten (100) %50 kaçar; 20 piyadeli ordu aynı,
20 süvarili ordu (hız 161) hepsinden %90.

**Otomatik çözüm** — "🎖️ Askerlerini Gönder", ordun düşmanın **1.5 katıysa** çıkar.
Ayrı bir hesap değil, aynı motor: `Battle.start(..., auto = true)` birimleri normal gibi
kurar, arenayı açmaz, `Battle.autoResolve()` sonucu hesaplar ve **aynı `endBattle`**'a
girer — ganimet, esir, kuşatma/yağma/kervan dalları tek yerde kalır.
Kayıp oranı `0.45 / güç oranı`, İdare yeteneğiyle %40'a kadar iner; güç
`Σ(can × (saldırı+2))`, sonuca ±%15 talih payı bindirilir. *(Lanchester'ın kare yasası
denendi: 5 kat üstün orduda kayıp %3'e düşüyor, otomatik çözüm bedavaya geliyordu.)*
Oyuncu otomatik çözümde ölmez, canının bir kısmını kaybeder.
Ölçüldü (20 tur, lvl-10 Svadya Milisi, İdare 1): 20 vs 10 çapulcu → **%4 kayıp (0.7 asker)**,
20 vs 25 → **%7 (1.3)**, 20 vs 40 → **%12 (2.9)**, 20 köylüyle 25 çapulcu → **%20 (3.9)**;
İdare 8 ile 20 vs 25 kaybı %6'ya iner. Aynı savaş elle dövüşünce 0 kayıpla ve 7.2 sn'de
bitiyor — otomatik çözüm hız için ödenen bedeldir.

**Kısmi katılım ve dalgalar**: sahaya taraf başına en fazla `Battle.FIELD_CAP` (**30**)
birim çıkar (`splitReserves`), kalanı `Battle.reserves`'te bekler. Saha kapasitenin
**%70'inin altına** inince `reinforce()` yedeği toptan sahaya sürer ve savaş kütüğüne
"🚩 Takviye dalgası" yazar — damla damla değil dalga hâlinde. `checkEnd` yedekleri de
sayar, yoksa savaş ilk dalga bitince sona ererdi. Ölçüldü (45 asker vs 60 çapulcu, kafa
kafaya sim): sahada hiç 30'u geçmedi, düşman 1.3 / 2.2 / 3.3 / 4.3 sn'de **9+9+9+3** kişilik
dört dalga hâlinde girdi, savaş 8.5 sn sürdü.

#### Düşman çeteleri (`BAND_KINDS`)
Çapulcunun ötesinde çeşit var; her tür haritada kendi adı/rengiyle gezer (`npc.band`) ve savaşta
kendi birim karışımını doğurur. 6+ kişilik çetenin başında **reis** çıkar.

| Çete | Harita ikonu | Savaş birimleri | Karakter |
|---|---|---|---|
| Çapulcular | mızraklı yaya, kırmızı | Çapulcu / Çapulcu Okçu / Atlı Çapulcu + Çapulcu Reisi | dengeli, en zayıf |
| Orman Haydutları | yaylı yaya, açık yeşil | Haydut Okçusu (ağırlıklı) / Orman Haydudu + Haydut Başı | okçu ağırlıklı, hızlı |
| Dağ Eşkıyaları | mızraklı yaya, altın | Dağ Eşkıyası / Eşkıya Nişancısı / Atlı Eşkıya + Eşkıya Reisi | zırhlı ve sert, 20. günden sonra doğar |
| Kurt Sürüsü | kurt silüeti, çelik grisi | Kurt / Yaşlı Kurt + Alfa Kurt | çok hızlı (104–112), `beast`: hücum ×1.6, esir düşmez, ganimeti az |
- **Savaş**: 2D top-down canvas arena, prosedürel arazi (tepe / çukur / orman / nehir).
  - Arazi etkileri: ormanda okçu ×0.7 hasar & süvari ×0.6 hız, tepede okçu ×1.3 hasar, çukurda ×0.8 hız, nehirde ×0.7 hız.
  - Oyuncu: WASD hareket, sol tık/boşluk ile yay şeklinde kılıç savurma (300 ms).
    **Savurma yayın içindeki EN YAKIN tek düşmana isabet eder** — eskiden yaydaki herkese
    aynı anda vuruyordu (grup biçme hatası). Ayrıca `swingCd` toparlanma süresi var
    (`swingCooldown()` = `max(0.45, 0.75 − yeterlilik×0.005)` sn), yani hızlı tıklamak hasarı katlamaz.
    Hasar çarpanı yeterliliğe bağlı: `0.35 + min(0.4, prof×0.004)`. Isıka giderse "ıska" yazısı çıkar.
    Menzil silaha bağlı: temel 45, mızrak +15, at üstünde +8.
  - **Binek** (`equipment.horse` varsa): oyuncu savaşa `type:'cavalry'` olarak girer — hız
    `95 + çeviklik×0.5 + (Binicilik−1)×3` (yayada `50 + çeviklik×0.5 + (Atletizm−1)×1.5`).
    **Şarj** (`Battle.chargeMult`): hasar `1 + hız oranı × (mızrak 1.6 / diğer 0.6)`, yani
    dörtnala mızrakla ×2.6'ya kadar; ≥1.8'de "MIZRAK ŞARJI!" yazısı çıkar. Ölçüldü (atlı,
    aynı vuruş): durarak 11 → dörtnala mızrak 22, dörtnala kılıç 16, yaya 11.
    Can yarıya inince **oyuncu da attan düşer** (`dismounted`, hız −30, ikon 🧑‍🌾) — bu kontrol
    artık oyuncu dalından önce, tek yerden herkese uygulanır.
  - **Blok**: sağ tık ya da **Shift** basılı tutulur. Kalkanın baktığı yön fareye kilitlenir,
    yarı açı 60°. `Battle.blockFactor()` tek kapıdır — hem yakın dövüş (`dealMelee`) hem ok
    isabeti oradan geçer. Kalkan (`equipment.armor` = Kalkan) önden geleni **tamamen** keser,
    kalkansız blok %60'a indirir; yan/arkadan gelen hiç engellenmez. Ölçüldü (30 ham hasar,
    savunma 0): kalkanla önden 0, arkadan 30, kalkansız önden 12, bloksuz 30; ok da aynı.
    Bedeli: blokta savuramazsın ve hızın yarıya iner (ölçüldü 10 → 5 birim/0.1 sn).
    Kalkan zırh slotunu işgal ettiği için "blok mu, zırh mı" gerçek bir tercihtir.
  - **Yay**: silah `bow` ise sol tık/boşluk kılıç yerine **ok atar** (`Battle.playerShoot`).
    Torba savaş başına `24 + Okçuluk×2` ok; bitince "ok bitti" yazısı çıkar. Sapma sabitken
    ±0.04 rad, yürürken +0.10, at üstünde +0.08 — yeterlilikle azalır. Ölçüldü (Okçuluk 20):
    sabit 2.1° → yürüyüş 7.2° → at üstünde 11.2°; ok hızı 320, hasar `saldırı × (0.5+…)`.
  - **Hasar türleri** (`DMG_TYPES`, Warband'ın kesici/delici/ezici'si): hasar tek kapıdan
    geçer — `Battle.afterArmor(tür, ham, savunma)` = `ham × mult − savunma × armor`, taban 1.

    | Tür | Savunma etkisi | Hasar çarpanı | Silah |
    |---|---|---|---|
    | kesici (`cut`) | %100 | ×1.0 | Kılıç, Savaş Baltası |
    | delici (`pierce`) | %50 | ×0.9 | Mızrak, ok |
    | ezici (`blunt`) | %65 | ×0.8 | Topuz — **öldürmez, bayıltır** |

    30 ham hasar için ölçüldü: savunma 0'da kesici 30 / delici 27 / ezici 24, savunma 12'de
    18 / 21 / 16, savunma 25'te **5 / 15 / 8** — zırh arttıkça delici öne geçer.
    Oyuncu 120 canlı, savunma 18'lik hedefi kılıçla 60 sn'de indiremiyor, mızrakla 18.8 sn,
    topuzla 44 sn (ve bayıltarak). Ezici ile düşen düşmanın esir düşme şansı %45 yerine %90 —
    ölçüldü: 64 düşenden kılıçta 24 esir (%38), topuzda 59 esir (%92).
    Silahın türü envanterde ve pazarda künye olarak yazar (`Game.itemNote`).
    Askerlerin hasar türü de aynı kapıdan geçer — bkz. "Grup & asker".
  - **Düşman blok yapar**: yakın dövüşteki (hayvan olmayan) birimler vuruşlar arasında
    kalkan kaldırır — blok isteği `min(0.45, savunma/40)` ile 0.6–1.4 sn'de bir yenilenir,
    savuracakken (`atkCd ≤ 0.2`) kalkan iner. Oyuncuyla **aynı `blockFactor` kapısından**
    geçer, yani yalnız önden gelen kesilir; yandan/arkadan dolaşmak sayar. Düşmanda kalkan
    eşyası olmadığı için tam blok değil, %60 azaltma. Ölçüldü (12v12, simetrik): savunma 8'de
    savaş 11.0 → 12.8 sn, savunma 18'de 37.6 → 45.3 sn — zırhlı birlik belirgin şekilde sert,
    savaş kilitlenmiyor.
  - Savaş künyesi (HUD, sol alt): binek durumu, kalan ok, blok göstergesi.
  - Tüm saldırı bekleme sayaçları **dt tabanlı** (`u.atkCd`), `performance.now()` değil — kare hızından bağımsız.
    Piyade `0.85–1.25` sn, okçu `1.4–1.7` sn.
  - Yakın dövüş hasarı tek yerden geçer: `Battle.dealMelee(src, tgt, raw)` — savunma düşer,
    geri tepme + kan + kıvılcım + uçan yazı üretir, öldürürse `logKill` + XP.
  - Düşman karışımı çeteye göre (`BAND_KINDS`, yukarıdaki tablo). Düşmanlar **gün sayısına göre
    ölçeklenir** (`enemyLvl`): +4 hp / +0.5 atk / +0.25 def per seviye.
  - **Geçilemez kayalar** (`terrain.rocks`, 2–4 adet): birim içine giremez, sınır kontrolüyle
    aynı yerde dışarı itilir. Doğum şeritlerine konmaz. *(Oklar kayanın üstünden geçer — siper değil.)*
  - Taktik emirleri **savaşın başında hazır beklemez**: her biri kendi rastgele anında
    "fırsat" olarak doğar (`Battle.cmdSlots`; hücum 1–2.5 sn, takip 2.5–5 sn, mevzi 4–7.5 sn).
    Kapalı emre basmak uyarı verir, aynı emri tekrar bağırmak yok sayılır. HUD'da kapalı
    emirler soluk çizilir, açılan emir logda ve oyuncunun başında uçan yazı olarak belirir.
    Pencereler ölçülerek daraltıldı: 21'e 25 savaş 6.9 sn sürüyor, ilk deneme (8–22 sn)
    üçüncü emri hiç açmıyordu.
  - Okçu AI: 250 birim menzil, %50 ihtimalle hedefin hızına göre öndeleme yapar.
    **Kite dengesi**: geri çekilirken hızı ×0.55, menzile yürürken ×0.8; yakın dövüş birimleri
    hedef 220 birimden yakınken **hücuma kalkar** (×1.3, kurtlar ×1.6). Eskiden okçu takipçisiyle
    aynı hızda kaçtığı için risksiz vuruyordu — ölçüldü: 1v1'de kovalama 28.6 sn → 12 sn,
    piyadenin kalan canı 24 → 31.
  - Süvari HP'si yarıya inince attan düşer (piyadeye döner, hız −30).
  - **Herkes arenaya kilitli** (12 birim kenar payı) — geri çekilen okçular haritadan kaçıp savaşı
    sonsuza kilitliyordu.
  - Oyuncu ölürse savaş bitmez: **bayılırsın** (`Battle.knockedOut`), adamların dövüşmeye devam eder.
    Böyle kazanılan savaşta dinar ve XP **yarıya iner**.
  - **Performans**: hedef arama her karede tam tarama değil, birim başına 0.3–0.5 sn'de bir
    (`u.tgtId` + kare başına bir kez kurulan `_byId` tablosu); parçacık tavanları
    (kıvılcım 120, uçan yazı 40, kan lekesi 200). Ölçüldü: 121 birimlik savaşta
    update 0.31 ms + render 1.25 ms (kare başına).
  - **Görünürlük**: birimin emojisi koyu konturla, takım halkası dolgulu ve tam opak çizilir;
    zemin pişirilirken üstüne `rgba(6,10,6,0.16)` karartma konur — birlikler çimin üstünde kayboluyordu.
  - Kan lekeleri, cesetler (max 60), kıvılcımlar, uçan hasar yazıları, iki taraflı öldürme logu,
    düşman komutanından rastgele hakaret repliği + ping animasyonu.
  - Teslim ol butonu her an açık.
- **Zafer**: ganimet (düşman başına `10 + seviye×5`, hayvanda `6 + seviye×3`, ×0.85–1.15, Yağma
  yeteneğiyle çarpılır) + 3 nam + XP. **Ödül güç oranına göre kısılır** (`Battle.rewardScale`):
  `clamp(0.2, 1, (düşman gücü / kendi gücün) × 1.6)` — çapulcu avı sonsuza dek kârlı değil,
  zafer modalinde "Kolay av: ödüller %X'e indi" satırı çıkar. Boss savaşı muaf. silah/binicilik/atletizm yeterlilik XP'si, ölü askerler gruptan silinir,
  NPC haritadan kaldırılır, oyuncunun savaş sonu canı `state`'e geri yazılır.
- **Yenilgi**: tüm grup dağılır, paranın %60–90'ı gider, HP %30'a düşer, **esir düşülür** ve
  **nam yanar** (`Game.defeatRenown(düşman gücü)`): `2 + 18×(1 − güç oranı) + nam×2%×(1 − oran)`,
  eldeki namla sınırlı. Dengine yenilmek −2, beş kişilik çapulcu çetesine yenilmek −22 (nam 200,
  20×lvl15 ordu ile ölçüldü). Teslim olmak da (`Game.surrender`) aynı cezayı yer; boss muaf.
- **Denge** (ölçülmüş, oyuncu göğüs göğüse dalarken): 5 acemi vs 5 çapulcu → 2–4 kayıpla zafer;
  10 vs 15 → yenilgi; 20 acemi vs 20 çapulcu → kıl payı (yazı-tura); seviyeli askerlerle
  (20×L10 vs 20) rahat zafer. Savaşlar 8–30 sn sürer.

### Esir alma (oyuncunun esirleri)
- Kazanılan savaşta düşen düşmanların **%45'i esir düşer** (`state.player.prisoners`), boss savaşı hariç.
- Kapasite `Game.prisonerCapacity()` = `5 + (Esir Yönetimi − 1) × 3`; her esir alma/satma bu yeteneğe XP verir.
- Değer `Game.prisonerValue()` = `(25 + seviye×12) × (süvari 1.5 / okçu 1.2 / piyade 1)`; şehirdeki
  **⛓️ Köle Tüccarı** ekranından tür tür ya da toptan satılır. Grup ekranında salıverilebilir.
- Her gün `max(1%, 6% − yetenek×0.5%)` ihtimalle esir kaçar; soylular kaçmaz.
- **Soylu esir**: lord partisi yenilince o lord esir düşer (haritadan silinir). Grup ekranından
  fidye istenir (2500–4500 dinar, −20 ilişki, o krallığın diğer lordlarına −4) ya da onurla
  salıverilır (+25 ilişki, fraksiyona +6, +3 nam). Her iki durumda `Game.respawnLordParty()`
  lordu evinin yanında küçülmüş bir partiyle haritaya döndürür.
- Oyuncu yenilir/teslim olursa elindeki bütün esirler serbest kalır.

### Esaret (oyuncunun esareti)
- **Tek veri modeli**: nerede esir düşersen düş (savaş yenilgisi, teslim olma) esaret
  `Game.beginCaptivity(npc, gün)`'den geçer ve tamamı `state.player.prisoner`'da durur:
  `{npcId, npcName, troops, fellows[], daysLeft, ransomRequired, ransomRefusals,
  escapeChance, isPlanning, lastAttemptDay}`. Kurtuluş/kaçış/salıverilme bu objeyi null yapar.
  `fellows` seninle sürüklenen diğer esirlerdir (`Game.rollFellows`; hayvan sürüsü esir tutmaz).
- Esirken oyuncu esir alanın konumuna kilitlenir, başka hiçbir şey yapılamaz.
- **Haritada hareket eden tek taraf esir alan partidir**: oyuncunun grup ikonu ve adı
  çizilmez, yalnızca esir alanın yanında ⛓️ işareti durur. *(Eskiden oyuncu ikonu + adı +
  "Esir (Ng)" yazısı esir alanın ikonu/etiketiyle aynı noktaya biniyordu.)*
- Esir alan partinin künyesinde kendi askerleri, sen ve diğer esirler görünür (`Game.npcTipHtml`).
- `#prisoner-ui` (sağ alt) seni tutan, muhafız sayısı, kalan gün, diğer esirler ve kaçış
  şansını tek panelde gösterir. Ayrı duran dev ⛓️ ikonu kaldırıldı — sol alttaki
  `#map-hud`'un üstüne biniyordu.
- "Kaçış planı yap" toggle'ı kaçış şansını 0'dan 80'e kadar giderek yavaşlayan bir ivmeyle doldurur.
- "Kaçmaya çalış" günde bir kez; başarısızlıkta şans −60 ve plan sıfırlanır.
- Süre dolunca %40 bedava kaçış, aksi halde fidye modali (paranın %75–90'ı).

### Diplomasi — krallıklar arası savaş (#20)
Tek veri: `state.wars = { 'a|b': savaşın başladığı gün }` (fraksiyon çifti sıralı anahtar).
Yardımcılar `Game.atWar(a,b)` / `warsOf(f)` / `declareWar` / `makePeace` / `playerFaction()`;
haberler `state.warLog` (son 20 olay), `Game.news(msg, mine)` yazar — `mine` yalnızca oyuncunun
krallığını ilgilendiren olayda bildirim çıkarır.

**Oyuncunun da bir bayrağı var (#48)**: `Game.playerFaction()` artık vassal değilken `null`
değil **`'player'`** döner. Eskiden bağımsız oyuncu hiç kimseyle savaşta sayılmıyordu —
`atWar` her yerde false dönüyor, düşman şehrin pazarı/hanı açık kalıyor ve düşman lord
yanından geçip gidiyordu. `'player'` bir `FACTIONS` kaydı değildir; `factionName` onu
"<oyuncu adı> Bölüğü" diye yazar, `diplomacyTick`'in "iki toprağa düşen krallık barış ister"
kuralına girmez (toprağı yok), ama savaş anahtarı (`player|rhodok`), haber akışı, kapalı
şehir kapısı ve lord saldırganlığı normal bir cephe gibi işler. Bağımsızken savaşa girmenin
yolu **köy yağmalamaktır** (`completeRaid` → `declareWar`); 15 günden sonra karşı taraf
kendiliğinden barış imzalayabilir. Diplomasi ekranı bağımsız oyuncuya bağlılık yerine
düşman listesini yazar.

- `Game.initDiplomacy()` dünyaya girişte (ve diplomasi öncesi kayıtlarda `Save.load`'da) bir
  cephe açık başlatır — Kalradya hiç sakin değildir.
- `Game.diplomacyTick()` her gün: 15 günü geçen savaşlar `0.06 + süre×0.004` ihtimalle barışla
  biter; %10 ihtimalle yeni savaş ilan edilir (bir krallık **en fazla iki cephede** savaşır).
- `Game.warTick()` her gün cepheyi çözer:
  - 700 birim içindeki düşman lord partileri çarpışır (`resolveFieldBattle`) — kazanan %20,
    kaybeden ~%70 asker kaybeder; 8 kişinin altına düşen parti dağılır, `state.lordRespawn`
    ile 4–10 gün sonra evinde yeniden doğar. Bu çarpışmalar bildirim çıkarmaz, yalnız
    parti dağılırsa habere girer.
  - 500 birim içindeki güçlü ordu (`size > garnizon × 1.3`) yerleşimi **3 gün kuşatır**
    (`atk.siegeDays`), sonra alır; düşen yerleşim 10 gün geri alınamaz (`loc.capturedDay`),
    kuşatan ordu %40 erir. Şehir/kale el değiştirince 900 birim içindeki köyleri de götürür.
- Savaştaki lordlar evinde oturmaz: `updateNPCs`'te yeni hedef seçerken %35 ihtimalle en yakın
  3 düşman yerleşiminden birine yürür.
- Oyuncuya etkisi: lord partisi yalnızca **krallığın onunkiyle savaştaysa** saldırır
  (`isHostile` → `atWar`); şehir/kale ancak savaştaysan kuşatılır, barıştaki komşunun pazarı ve
  hanı sana açıktır (`enterSettlement`, `locTipHtml`). Fetih yaptığında o krallıkla savaş başlar.
- `Game.showDiplomacy()` (harita künyesindeki 🌍 düğmesi veya **K**): krallık başına toprak
  sayısı, kiminle savaşta/müttefik olduğu, yürüyen seferler, altında haber akışı.
- Ölçüldü (200 gün, oyuncusuz simülasyon): 8 yerleşim el değiştirdi, ~290 cephe çarpışması,
  13 savaş ilanı, hiçbir krallık silinmedi. Kuşatma bekleme süresi eklenmeden önce aynı sim
  38 fetih üretiyor ve iki krallığı 150. günde haritadan siliyordu.

### Mareşal, sefer çağrısı ve ittifak (#36)
Diplomasi artık yalnız "kim kiminle savaşta" değil: krallıklar **ordu topluyor** ve
**taraf tutuyor**.

**Sefer** (`state.campaigns[faction]` = `{marshalId, marshalName, targetLocId, day, pledged, helped}`,
`Game.campaignTick()` günlük):
- Savaştaki krallık günde %25 ihtimalle bir **mareşal** seçer (`pickMarshal`: haritadaki en
  büyük lord partisi, kral hariç) ve ona en yakın düşman şehrini/kalesini hedef verir.
- **`updateNPCs` artık orduyu dağıtmıyor**: seferi olan krallığın lordu yeni hedef seçerken
  %70 ihtimalle mareşalin hedefine yürür (eskiden %35 ile rastgele üç düşman yerleşiminden
  biri). Ordunun toplanması kuşatmayı `warTick`'in kendi kuralıyla çözer — kuşatma koduna
  dokunulmadı.
- Sefer, hedef düşünce / barış olunca / 25 gün dolunca `endCampaign` ile biter; aynı krallık
  **3 gün** yeni sefer açamaz (`state.campaignCooldown`) — yoksa biten seferin ödül modalini
  yeni çağrı modali eziyordu.

**Sefer çağrısı** (vassalsan): `summonToArms` modali kralın adı, mareşal ve hedefle çıkar.

| Cevap | Sonuç |
|---|---|
| ⚔️ Katıl + hedefin **1200 birim** yakınında bulun (günde bir örneklenir → `helped`) | Sefer başarılıysa **+15 nam, bütün lordlarla +8**; başarısızsa +5 nam / +3 ilişki |
| ⚔️ Katıl ama hiç gitme | **Kral −8, diğer lordlar −3** — en pahalı seçenek |
| 🚪 Reddet | Anında bütün lordlarla **−5**, sefer bitince ek ceza yok |

Katılınca hedef haritada altın kesikli çemberle görünür: `state.knownLocations['campaign']`
her gün tazelenir, böylece `Nobles.dailyTick`'in 3 günlük silme kuralına takılmaz.

**İttifak** (`state.allies` = `{'a|b': gün}`, `Game.allied/alliesOf/makeAlliance/breakAlliance`):
- `diplomacyTick` günde %5 ihtimalle **ortak düşmanı olan** iki barışık krallığı el sıkıştırır.
- İttifakın bedeli var: müttefikin bütün cepheleri sana da açılır (`makeAlliance` içinde
  karşılıklı `declareWar`). `declareWar` müttefike savaş açmaz.
- 25 günü geçen ittifak günde %5 ihtimalle dağılır.

**Krallık artık silinmiyor** — sefer sistemi orduları tek hedefte topladığı için fetih hızlandı
ve ölçümde 4 turun 3'ünde bir krallık haritadan siliniyordu. İki kural geri getirdi:
`warTick` bir fraksiyonun **son şehrini/kalesini kuşattırmaz**, ve iki toprağa düşen krallık
`diplomacyTick`'te 5 günden sonra günde %25 ihtimalle barış imzalar (normalde 15 gün / %6).

Ölçüldü (`node tools/sim.js --gun 200 --tohum 1-5`, oyuncusuz): **5–15 fetih**,
29–39 sefer (~6 günde bir), 1–5 ittifak, 17–27 barış antlaşması,
**hiçbir turda krallık silinmedi**. Sefer öncesi aynı
sim 8 fetih üretiyordu — cephe belirgin şekilde hareketlendi ama harita çökmedi.

### Kuşatma & krallık kurma (#25)
Kuşatma tek tuşla açılan bir meydan savaşı değil, **üç aşamalı** bir iştir: kamp → hazırlık →
sur dibinde saldırı. Garnizon `Game.garrisonOf(loc)`: **senin tımarındaysa oradaki gerçek asker
sayısı**, değilse şehir 30 / kale 15 temel, refahla ±%30.

**1. Kamp** (`Game.besiegeLocation` → `beginSiege`): yerleşim ekranındaki *⚔️ Kuşatma Kampı Kur*
yöntem sorar. Seçim `state.player.siege = { locId, plan, daysLeft, weaken, foundingKingdom }`
olarak durur (kayda `state.player` ile birlikte yazılır), oyuncu yerleşimin üstüne çakılır ve
`state.player.status = 'besieging'` olur — **kampta zaman akar**, dünya işlemeye devam eder.
Sağ alttaki `#siege-ui` paneli durumu ve iki düğmeyi (⚔️ Saldırıya Geç / 🚪 Kuşatmayı Kaldır)
gösterir; saldırı düğmesi hazırlık bitene kadar sönüktür.

| Yöntem (`Game.SIEGE_PLANS`) | Hazırlık | Surdaki gedik | Savunan avantajı |
|---|---|---|---|
| 🪜 Merdiven | **1 gün** | yalnız kapı (74 birim) | **+%40** can ve saldırı |
| 🗼 Kuşatma Kulesi | **3 gün** | kapı + kule rampası (118 birim) | **+%15** |

**2. Hazırlık ve açlık** (`Game.siegeTick`, `dailyUpdate`): her gün `daysLeft` düşer. Hazırlık
bittikten sonra beklemeye devam etmek **açlığa mahkûm etmektir** — garnizon günde **%7** erir
(tavan %55) ve yerleşimin refahı günde 1.5 düşer. Ölçüldü: 34 kişilik garnizon 3 günde 26'ya,
refah 65'ten 61'e indi. Bedeli senin ordunun da kapıda erzak yemesidir.
**Yardım ordusu** (`Game.siegeRelief`): hazırlık günlerinde de bekleme günlerinde de %25 ihtimalle
2500 birim içindeki en yakın düşman lord partisi kapıya gelir — ya karşılarsın (normal karşılaşma)
ya da kampı toplarsın. Yenilirsen/teslim olursan kamp kendiliğinden dağılır.

**3. Saldırı** (`assaultSiege` → `startSiege` → `Battle.start(..., plan)`): savaş arenası
**sur varyantı** olur (`Battle.siege`). Arenanın %66'sında dikey bir taş sur vardır; nehir ve
kaya konmaz, tepe/orman yalnız kuşatan tarafta kalır. Savunan surun ardında, saldıran sahada doğar.
- Sur geçilmez (`update`'in arena sınırı bloğunda); gediğin içi koridor gibi daraltır.
- Yol bulma tek kuraldan geçer: hedefi surun **öbür** tarafında olan birim en yakın gediğe yürür.
  Saldıran gediğin 70 birim ötesini hedefler (geçince sapma kalkar), **savunan geçmez** —
  gediğin ağzını tutar, darboğaz onun avantajıdır. *(Hedef noktası yakın dövüş menzilinden
  uzak olmalı: 30 birim denendiğinde saldıran gediğin ağzında "vardım" sanıp duruyor ve orada
  kırılıyordu.)*
- Oklar surun üstünden geçer (kayalar gibi) — savunan okçu mazgaldan vurur.
- Ölçüldü (40 lvl-15 Svadya Milisi vs 26 kişilik Svadya garnizonu, 2 tur, her tur ayrı sayfa
  yüklemesi): sursuz meydan savaşı **0–1 kayıp / 9–10 sn**, kuşatma kulesi **3–4 kayıp / 9–10 sn**,
  merdiven **8–18 kayıp / 10–14 sn**. Yani kule üç günün karşılığını veriyor, merdiven hızlı ama pahalı.

Kazanılırsa yerleşim vassalı olunan fraksiyona geçer; bağımsızsan **kendi krallığını** kurarsın
(`FACTIONS.player_kingdom` runtime'da oluşturulur). Her iki durumda fethedilen yerleşimin eski
sahibiyle **savaş ilan edilir** (`Game.declareWar`) ve yerleşim **senin tımarın olur**
(`Game.grantFief` → aşağıdaki bölüm). Fetih bilgisi zafer modalinde yazar; `alert()` kullanılmaz,
zafer ekranı onu eziyordu.

### Tımar yönetimi (#23)
Fethedilen yerleşim artık bayrak değişikliğinden ibaret değil: `loc.owner === 'player'` olur
(`Game.grantFief`, 900 birim içindeki köyler de seninle beraber gelir) ve üç şey açar.

| Ne | Nerede | Kural |
|---|---|---|
| **Vergi** | her gün, `dailyUpdate` | `Game.fiefTax(loc)` = `refah × (şehir 2 / kale 0.7 / köy 1)`. Ölçüldü: 55 refahlı şehir +110, 69 refahlı şehir +141, tipik kale ~+45 |
| **Garnizon** | yerleşim ekranı → 🛡️ Garnizon | `loc.garrison[]` gerçek asker nesneleri; grup kapasitenden düşmez ama **maaşı `upkeep()`'e eklenir**. Yoldaş garnizonda kalamaz |
| **Depo** | yerleşim ekranı → 📦 Depo | `loc.storage[]`; **depodaki erzak bozulmaz** (`spoilFood` yalnız `state.player.inventory`'yi gezer) ve yenilgide yağmalanmaz |

- Maaş tek kuraldan okunur: `Game.troopWage(t)` (yoldaş 20, lvl 51 bedava, lvl 20+ `level/2`,
  lvl 10+ 2, altı bedava) — hem `upkeep()` hem `fiefIncome()` bunu çağırır.
- `Game.fiefIncome()` = `{tax, wage, troops, net}`. Hazine künyesinde "Tımar vergisi" satırı,
  diplomasi ekranında (**K**) tımar listesi + net gelir görünür.
- **Denge**: garnizonu elit askerle doldurmak zarardır — ölçüldü, 12 şövalye (lvl 30) 180
  dinar/gün yer, 141 dinarlık şehri **−39**'a düşürür. Ucuz askerle doldurmak Warband'daki
  gibi doğru hamledir.
- **Savunmasız tımar geri alınır**: `warTick`'in kuşatma eşiği `garrisonOf`'a bakar, yani
  garnizonsuz tımarı düşman lord ilk uğradığında alır. `captureSettlement` o zaman
  `owner`'ı düşürür, **garnizonu yok eder** ve haberi modal olarak sana gösterir; depo kalır.
- `owner` / `garrison` / `storage` kayda yazılır (`Save.save`'deki `locations` dizisi).

### Vassallar — kral olarak tımar dağıtma (#40)
Kendi krallığını kurunca (`state.player.vassalOf === 'player_kingdom'`, `Game.isKing()`)
tımar tek başına taşınacak bir yük olmaktan çıkar: **toprak vererek lord tutarsın.**
Warband'daki kural aynen geçerli — topraksız krala kimse yemin etmez.

| Ne | Nerede | Kural |
|---|---|---|
| **Davet** | lord diyaloğu → 👑 Krallığıma katıl | İlişki ≥ **25** ve elinde dağıtılacak (köy olmayan) bir tımar şartı. Teklif doğrudan tımar teklifidir: seçtiğin şehir/kale onun olur |
| **Tımar dağıtma** | diplomasi ekranı (**K**) → tımar satırındaki 👑 Vassala ver | `Game.grantFiefTo(locId, lordId)`; 900 birim içindeki köylerin de sahibi değişir |
| **Haraç** | her gün, `fiefIncome()` | Vassalın tımar vergisinin **%30'u** (`Game.VASSAL_TRIBUTE`) sana gelir, kalanı ve garnizon derdi ona kalır |

- Vassalın **partisi senin bayrağınla savaşır**: `lord.faction` ve haritadaki partisinin
  `faction`/rengi `player_kingdom` olur, yani `warTick`/`isHostile`/`pickMarshal` onu
  kendiliğinden senin ordunun parçası sayar. Eski krallığının bütün lordları **−10** ilişki.
- Tımarı verirken oradaki **garnizon vassalın emrine geçer** (`loc.garrison` boşalır, maaşı
  artık `upkeep()`'ten çıkmaz); savunma `garrisonOf`'un formül dalına döner.
- Verilen tımar **+20 ilişki**, o sırada hâlâ topraksız kalan diğer vassallar **−5** (kıskançlık).
- `LORDS` kayda yazılmadığı için vassallık `state.vassals` (id listesi) olarak saklanır;
  `Game.applyVassals()` yüklemede lordun ve partisinin bayrağını geri kurar.
- Kral olan oyuncu **kendi seferine çağrılmaz**: `campaignTick`'teki `summonToArms` çağrısı
  `player_kingdom` için atlanır (mareşalini yine de seçer, vassalları hedefe yürür).
- Ölçüldü: 3 tımarlı kral günde +205 vergi topluyor; refah 55'lik Praven'i vassala verince
  kendi vergisi 96'ya iniyor ama +33 haraç geliyor (net 129) — toprağı dağıtmak parayı
  yarıya indirir, karşılığında sana savaşacak bir lord ve bedavaya savunulan bir şehir verir.

### Turnuva, bahis ve arena (#26)
Şehirde savaş dışı iki dövüş içeriği var: **turnuva** (ara sıra açılır, ödüllü, bahisli) ve
**arena** (her zaman açık, ödülsüz, pratik).

**Turnuva** — `TournamentMinigame.start({ bet })`, 25 saniyede 12 hedefe tıklama. Hedef boyutu
çevikliğe, ekranda kalma süresi güce bağlı. Artık **tur tur elenilir**: 12 hedef `ROUNDS = 4`
tura bölünür (`perRound = 3`), her turun başında kuradan **rastgele bir ekipman** çıkar
(`GEAR`) ve tur arasında +6 saniye nefes payı verilir.

| Ekipman | Hedef boyutu | Ekranda kalma |
|---|---|---|
| 🗡️ Tahta Kılıç | ×1.00 | ×1.00 |
| 🔱 Mızrak | ×0.85 | ×1.30 |
| 🏹 Yay | ×0.70 | ×1.55 |
| 🛡️ Topuz ve Kalkan | ×1.30 | ×0.75 |

**Bahis** (`ODDS`, en fazla `Game.ARENA_BET_MAX` = 1000 dinar): para turnuvaya girerken
kesilir, ödeme **temizlenen tur sayısına** göre yapılır — `bet × ODDS[floor(skor/perRound)]`.

| Elendiğin tur | 1 | 2 | 3 | 4 | 🏆 Şampiyon |
|---|---|---|---|---|---|
| Oran | ×0 | ×0.3 | ×0.8 | ×1.6 | **×5** |

Ölçüldü (1000 dinar bahisle): 1. turda elenme **−1000**, 2. tur −700, 3. tur −200,
finalde elenme **+600**, şampiyonluk **+4000** (üstüne turnuvanın kendi 500 dinarı + 20 nam).
Yani orta seviye bir oyuncuda beklenen değer negatif, iyi oyuncuda erken oyunun en hızlı
para kaynağı — Warband'daki gibi.

Kazanınca ayrıca `state.pendingDedication` açılır (zaferi bir leydiye ithaf edebilirsin).
`opts = { mode:'chicken', goal:8, time:15 }` ile tavuk görevi varyantı olarak çalışır —
tavuk modunda tur, kura ve bahis yoktur. Bitişte `tournament_end` / `chickens_caught` olayı yayınlanır.

**Arena** (`Game.openArena` → `Battle.startArena(idx)`) — düello altyapısının varyantı: grup
sahneye girmez, **ganimet, nam, esir ve esaret yok**. Rakip `Battle.ARENA_FOES`'tan seçilir,
seviyesi oyuncununkine göredir; tahta silah olduğu için `dmgType = 'blunt'` (öldürmez, bayıltır)
ve `type = 'infantry'` — *tekil rakip piyade olmalı, havuzdan okçu çıkarsa 1v1'de seni sonsuza
kadar kite eder; aynı düzeltme `startDuel`'e de uygulandı.*

| Rakip | Seviye | Yeterlilik XP'si (galibiyet) |
|---|---|---|
| Acemi Dövüşçü | oyuncu −3 | 80 |
| Arena Gediklisi | oyuncu +2 | 180 |
| Arena Şampiyonu | oyuncu +8 | 340 |

Yenilgide XP'nin **%40'ı** verilir. Ödenen bedel zamandır (`Game.finishArena`): galibiyet
**3 saat**, yenilgi **1 gün** hasta yatağı — bu, sonsuz XP grindini sınırlar. Silah yeterliliği
kuşandığın silahın türüne, ek olarak `riding`/`athletics` XP'nin %60'ı kadar yazılır.
Ölçüldü (Tek El 1 → 10, hep kazanarak): acemiyle **52 dövüş / 6.5 gün**, gediklisiyle
**23 / 2.9 gün**, şampiyonla **13 / 1.6 gün**.

*(`Battle.surrender()` artık düello ve arenada doğrudan `endBattle(false)`'a düşer — eski yol
`_duelParty`'yi geri koymadığı için maçtan çekilen oyuncunun grubu kalıcı olarak siliniyordu.)*

### Boss
`boss_map` eşyası (pazardan 5000 dinar) kullanılınca **Savaş Tanrısı** savaşı açılır.
En fazla 4 kez girilebilir, her girişte boss seviyesi +5. Kazanınca lvl 51 nişanı düşer.

### Günlük olay havuzu (#35)
Sefer sessiz bir tabloya bakmak olmasın diye `Game.dailyEvent()` her günün sonunda
(`dailyUpdate`'in en altında, günün hesabı kapandıktan sonra) zar atar: `EVENT_CHANCE`
**0.35**. Olay çıkarsa modal olarak anlatılır ve mekanik sonucu satırında yazar.

- Havuz `Game.DAY_EVENTS` (13 olay, 8 olumsuz / 5 olumlu). Her olayın `when(ctx)` süzgeci
  var — `ctx` = grup mevcudu, **900 birim içindeki en yakın yerleşim**, erzak toplamı, moral.
  Böylece "sarhoş asker" yalnız yerleşim yakınında, "nal düştü" yalnız atlıyken,
  "köylü kadın peynir bıraktı" yalnız köy dibinde çıkar.
- Zar **iki kez** atılır: önce ton (%60 olumsuz), sonra o tondan olay. Son 4 olay tekrar
  seçilmez ama bu süzgeç **tonun içinde** çalışır — genel havuza uygulanınca küçük olumlu
  havuz "son olaylar"a takılıp boşalıyor ve olumsuz oran %71'e çıkıyordu. Ton havuzu
  tamamen boşsa süzgeç düşer, yoksa ordusuz ve şehirsiz gezen oyuncuya hiç olay çıkmıyordu.
- Bedeller küçüktür: moral ±2–4, 2–4 birim erzak, 15–60 dinar ceza, bir askerin 2 gün
  yaralanması; hırsızlık kasanın %2–5'i ama **tavanı 250 dinar** (zengin oyuncuyu da yalnız
  kızdırsın). Olumlu taraf: +30–90 dinar kese, 2–4 et, moral, kapasite varsa yoldan katılan
  bir asker, köyden iki peynir.
- Yardımcılar `Game.addMorale/addItem/takeFood`; esaret ve kuşatma kampında olay çıkmaz.

Ölçüldü (400 gün, gezen ve büyüyen 6 kişilik grup): **156 olay — 2.6 günde bir**, %60'ı
olumsuz, 13 olayın 12'si çıktı (nal düşmesi at gerektirir).

### Debug raporu (#52)
Hata yaşandığında elde ekran görüntüsünden fazlası olsun diye **🐞 Debug Raporu**
düğmesi var (`Debug.open()`; ⚙️ Ayarlar panelinden ve hata rozetine tıklayarak açılır). `Debug` objesi `app.js`'in **en başında**
durur ve `Debug.init()` orada çağrılır — oyun kurulurken atılan hata da yakalansın diye.

- Halkasal tampon (`Debug.errors`, son 25): `window.onerror` (mesaj + dosya:satır + yığının
  ilk 3 satırı), `unhandledrejection` ve sarmalanmış `console.error`.
- `Game.skipFrame` her rAF'ta `Debug.frame(d)` çağırır — son 30 kare aralığı raporda durur,
  "siyah ekran / donuyor" şikâyetinde kanıt olur.
- Rapor (`Debug.report()` → JSON): dosya tarihi + adres, oyun özeti (gün/saat, aktif ekran,
  modal açık mı, can/dinar/nam, konum, `status`, grup, esir, fraksiyon, damga, kuşatma/yağma/
  esaret, açık savaşlar, görev id'leri), çizim durumu (`Battle.active`, döngü id'leri, kare
  böleni, ölçülen tazeleme hızı, iki tuvalin boyutu, son kareler), tarayıcı/ekran/DPR/bellek,
  hata listesi. Her alan try/catch'ten geçer — rapor kendi başına patlamaz.
- Modal metni seçilebilir; **📋 Panoya Kopyala** (`navigator.clipboard`, izin yoksa
  `execCommand` yedeği) ve **💾 Dosya Olarak İndir** (`webband-debug-gunN.json`).

Ölçüldü: `Game.nonexistentFunction()` ve reddedilen bir promise tamponda `error` ve
`promise` olarak göründü, rapor 1.6 KB, son 30 karenin ortalaması 16.7 ms (68 Hz).

**Yazısız sarı düğme** şikâyetinin (#35) tek kapısı `Game.btnLabelOk(text, where)`:
etiket boş/`undefined` ya da yalnız etiketten ibaretse düğme **hiç çizilmez** ve
`Debug.log('bosbuton', …)` çağrının yığınıyla birlikte rapora düşer — hangi akıştan geldiği
oyuncunun gönderdiği JSON'dan okunur. İki çağıranı var: `addBtn` (yerleşim ekranı) ve
`showModal`, ki modal HTML'i şablon dizesiyle üretildiği için düğmeleri yazıldıktan sonra
tarar ve boş olanı `display:none` yapar. Ölçüldü: boş etiketli `addBtn` çizilmedi, modaldeki
boş düğme gizlendi, dolu düğme dokunulmadan kaldı; pazar (36 düğme), han (11), salon,
diplomasi ve debug modallerinde tek bir yanlış pozitif yok.

### Kayıt sistemi (#55 madde 1)
Tek slotlu `webband_save_v1` yerine sürümlü, göçlü, dışa aktarılabilir bir sistem.

| Ne | Kural |
|---|---|
| Anahtar | `webband_save_<slot>`; slotlar `1/2/3` (elle) + `a1..a5` (otomatik halka) + `legacy` (`webband_save_v1`, yalnız okunur) |
| Sürüm | Kaydın kökünde `v: 2`; `state.meta = { v, surum, createdAt, playtime, autoIdx }` |
| Otomatik kayıt | `Save.auto()` her oyun gününün başında (`dailyUpdate`'in ilk satırı), halka `a1→a5→a1`; ayarlardan kapatılır |
| Bozuk kayıt | `Save.read()` JSON hatasında kaydı **silmez**, `webband_broken_<zaman>` anahtarına taşır, `Debug.log` + uyarı verir, `null` döner |
| Dışa/içe aktarma | `Save.exportSave()` metni panoya kopyalar, `Save.doImport()` yapıştırılanı doğrular ve 1. slota yazar |

**Göç zinciri** `Save.migrate(d)` tek yerdedir — eskiden `load()` içine serpilmiş tek seferlik
`if`'lerdi. v1 → v2: `state.explored` silinir, `Efsanevi ` önekli asker adı `legendary: true`
bayrağına çevrilir, `state.muted` `settings.muted`'a taşınır, `meta` kurulur (`gocEdildi: true`).
`d.v > Save.V` ise kayıt açılmaz ("daha yeni bir sürümden").

Ölçüldü: `Save.save('1')` **1.4 ms**, kayıt **36 KB**; 7 otomatik kayıttan sonra halka
`a1..a5` = gün 15/16/12/13/14 (`autoIdx=2`); dışa aktar → `localStorage.clear()` → içe aktar
turunda gün 42 / 9999 dinar / 77 nam birebir geri geldi; bozuk JSON `webband_save_2`'den
`webband_broken_2026-09-09042327`'ye taşındı, oyun açık kaldı; v1 kaydı yüklendiğinde
`explored` düştü, "Efsanevi Svadya Şövalyesi" → "Svadya Şövalyesi + legendary", `muted`
ayarlara geçti, `meta.v = 2`.

### Hata görünürlüğü: rozet ve döngü kalkanı (#55 madde 2)
Bir istisna rAF zincirini koparınca ekran donuyor ve konsolu açmayan kimse sebebini
göremiyordu. İki parça:

- **`Debug.guard(where, fn)`** — üç döngünün de gövdesini sarar (`harita döngüsü`,
  `savaş döngüsü`, `turnuva döngüsü`). İstisnayı yutar, **bir sonraki satırdaki
  `requestAnimationFrame` yine çalışır**, yani döngü yaşar. Aynı imza (`yer|mesaj`) bir kez
  loglanır, tekrarı `Debug._sig`'de sayılır ve raporda `yutulanTekrar` olarak yazar — hata
  seli tamponu süpürmez.
- **`#err-badge`** — sağ alt köşede "⚠️ N hata — tıkla ve kopyala", tıklayınca `Debug.open()`.
  `Debug.log` her çağrıda `badge()` çağırır, yani `onerror`/`unhandledrejection`/`guard`
  hepsi aynı sayaçtan geçer.

Ölçüldü: 45 istisna (40'ı aynı imza, 5'i ikinci imza) → **2 kayıt, 0 sızan istisna**, rozet
"⚠️ 2 hata", rapor `harita döngüsü|test patlaması x40` ve `savaş döngüsü|ikinci imza x5`
satırlarını taşıyor; normal dönen gövdenin değeri (`42`) korunuyor. Gerçek döngüde
`renderMap` patlatıldığında `Game._loopId` yaşıyor ve rozet 1 hata gösteriyor.

### Ayarlar ekranı (#55 madde 7)
Kenar menüsündeki **⚙️ Ayarlar** (`Game.showSettings()`). Tek kapı `Game.opt(k)` / `setOpt(k,v)`:
varsayılanlar `Game.OPTS`'ta durur, `state.settings` **yalnızca sapmaları** saklar (kayda
`state` ile girer).

| Ayar | Etki |
|---|---|
| Ses / ses seviyesi | `Game.sfx()` `opt('muted')` bakar, kazancı `opt('volume')` ile çarpar |
| Hareket azaltma (Sistem/Açık/Kapalı) | `Game.reduceMotion()`; `body.reduced-motion` bütün CSS animasyon ve geçişlerini kapatır, kamera yumuşatması **anlık** olur (`snap = 1`), `Battle.spark()` hiç parçacık üretmez |
| Kan ve ceset | `opt('gore')` false ise `Battle.blood()` erken döner, ceset itilmez |
| Kare atlama kapısı | `opt('frameGate')` false ise `skipFrame` **hiç kare atmaz** (ölçüm yine sürer) — oyuncunun elindeki kaçış yolu |
| Yazı boyutu | `opt('fontScale')` × 16 px kök yazı boyutu; arayüz `rem` tabanlı |
| Otomatik kayıt | `Save.auto()`'yu kapatır |

Panel ayrıca 💾 Kayıtlar, 🐞 Debug Raporu, ⌨️ Tuşlar (`Game.KEYS` tablosu) ve sürüm satırını
taşır. Ölçüldü: yazı ölçeği 0.9/1/1.15 → kök **14.4 / 16 / 18.4 px**; `reducedMotion:true`
`body.reduced-motion` sınıfını ekliyor, `'auto'` bu makinede false; kare kapısı `_minStep=4`
iken açıkken `[true,true,true,false]`, kapalıyken `[false,false,false,false]`;
`state.settings` yalnız sapan üç anahtarı tutuyor.

### Erişilebilirlik turu (#55 madde 6)
- **Takım ayrımı yalnız renk değil**: `Battle.drawUnit` düşman halkasını `setLineDash([4,3.2])`
  ile çizer, dost halkası dolu kalır. Ölçüldü: dost halkası **%100 kapsama / 0 boşluk**,
  düşman **%75 / 6 boşluk**; iki halka renginin gri tonu 151'e karşı 138 — arada yalnız
  **13/255** var, yani gri tonlamalı ekranda ayrımı taşıyan şey artık şekil.
- **Modalde klavye**: `Input.init` modal açıkken **Esc** kapatır (karşılaşma modali hariç —
  `currentEncounterNpcId` varken kaçış tuşu yok) ve **Enter** `#modal-body`'deki
  `button.primary`'ye, yoksa ilk düğmeye basar. Ölçüldü: Esc kapattı, Enter primary düğmeyi
  seçti (2), primary yokken tek düğmeye bastı (7), karşılaşma modali Esc'e direndi.
- Yazı boyutu ölçeği ve hareket azaltma yukarıdaki ayarlar tablosunda.
- Dokunmatik/mobil kendi turunda yapıldı — aşağıdaki bölüm.

### Dokunmatik ve mobil (#65)

Oyun fare ve klavye olmadan hiç oynanmıyordu. Üç ayrı iş: **giriş yolu**, **yerleşim**,
**ipucu metni**. Tek kural: giriş yolunu `pointer: coarse` belirler, yerleşimi `max-width` —
ikisi ayrı sorular, çünkü tabletin geniş ekranı da parmakla sürülür.

**1. Tek giriş kapısı.** `mousemove/mousedown/click` dinleyicileri **pointer olaylarıyla**
değiştirildi (`Game.onMapDown/onMapMove/onMapUp`); fare de parmak da aynı kapıdan geçer,
iki ayrı hedefleme yolu tutulmaz. `e.pointerType === 'mouse'` dalı eski davranışı
(`handleMapHover` / `startTargetDrag` / `endTargetDrag`) aynen çağırır.

| Parmak | Ne yapar |
|---|---|
| Tek parmak sürükleme | Kamerayı kaydırır — WASD ile **aynı** kapı (`camera.offset`), ±9000 sınırı `update`'te |
| İki parmak | Yakınlaştırır: `targetZoom × (yeni açıklık / eski açıklık)`, `minZoom()`–3.0 arası |
| Kısa dokunuş (<450 ms, <10 px) | `handleMapClick` — hedef koyar / yerleşime girer |
| Uzun dokunuş (≥450 ms) | `handleMapHover` — künye açılır, **hedef atanmaz** |
| İşaretin üstünde sürükleme | Hedef işaretini taşır (#35'in kendi kodu) |

Ölçüldü (375×812, zoom 0.8): −60/−30 px sürükleme kamerayı **+75 / +37.5** dünya birimi
kaydırdı (= piksel/zoom); iki parmak açıklığı 100 → 200 px olunca zoom **0.80 → 1.60**.
Kısa dokunuş hedefi kurdu, 600 ms'lik dokunuş künyeyi açtı ve **hedefi kurmadı**.

**2. Savaş kumandası** (`#touch-ui`, `Game.initTouchUI`). Sol altta 116 px'lik sanal çubuk,
sağ altta 74 px'lik ⚔️/🛡️ düğmeleri, ikisinin üstünde tek sıra emir düğmeleri.
Hiçbiri savaş motoruna yeni bir giriş yolu açmaz:

- Çubuk `Input.keys` içindeki `w/a/s/d`'yi yazar (eşik ±0.38) — motor hâlâ tuş okur.
- Nişan `Input.aimSync(u)` ile **çubuğun yönünden** türetilip `Input.mouse`'a yazılır;
  parmakla oynarken imleç diye bir şey yok. Fare kıpırdarsa `Input.stick` sıfırlanır,
  nişanı yine fare alır.
- ⚔️ doğrudan `Battle.playerAttack()`, 🛡️ `Battle.blockHeld` bayrağını tutar — sağ tıkla
  aynı alan.
- Emirler `Game.touchCommand(key)` ile sentetik `KeyboardEvent('keydown')` gönderir;
  `Input`'un kendi dinleyicisi çözer.

**Ekran alt yarısı parmaklarındır**, o yüzden çizim ve paneller yukarı taşındı:
`drawHud`'daki taban `const B = Game.isTouch() ? 150 : H` — künye ve emir şeridi güç
çubuğunun **altında**, ekranın üstünde durur. Savaş kütüğü `bottom: 236px`'e çıkar.
Ölçüldü (355×493 tuval): emir şeridi 110–138, kütük 223–319, emir düğmeleri 325–359,
çubuk 367–483, ⚔️/🛡️ 409–483, Teslim Ol 503–547 — **hiçbir çift kesişmiyor**.
Kumanda `--tui-lift: calc(72px + env(safe-area-inset-bottom))` ile alt şeridin
(Teslim Ol) üstünde başlar ve çentikli telefonda ev çubuğunun altına girmez.

**3. Dar ekran yerleşimi** (`@media (max-width: 820px)`): kenar menüsü alta açılan yatay
şerit olur (ikon üstte, etiket altta, kısayol rozeti gizli), sefer çubuğu rozetleri sarar,
modal `calc(100vw - 20px)` + `max-height: 88vh` ile kendi içinde kayar, pazarın iki sütunu
alt alta diner (`#market-cols`), başlangıç ekranının mutlak konumlu düğmeleri akışa girer.
Yatay tutulan telefonda (`max-height: 480px`) rozet alt yazıları ve menü etiketleri düşer.

- **Künye dokunmayla açılır**: `:hover` parmakta yoktur. `pointerdown` `.tooltip-container`
  üstünde `.tip-open` sınıfını çevirir, coarse cihazda `:hover` kuralı iptal edilir.
  Taşma düzeltmesi tek yerde toplandı (`Game.clampTip`) — fareyle gelen de dokunmayla
  açılan da oradan geçer. Harita künyesi de ölçülüp ekran içine kırpılır
  (`handleMapHover`): ölçüldü, 375 px ekranda 132 → 361, **taşma yok**.
  *(Aynı gövdedeki `rect` tanımsızdı: yerleşimin üstüne her gelişte `ReferenceError`
  atıyor, künye hiç açılmıyordu.)*
- **Dokunma hedefleri** en az 44 px (WCAG 2.5.5). Ölçüldü: kural öncesi `#map-hud`'da
  22/22/20/20 px dört düğme vardı, sonrasında ekrandaki görünür düğmelerin **0'ı** 44'ün
  altında.
- Üç tuval `touch-action: none` taşır (pan/pinch bizde), `viewport` etiketi
  `user-scalable=no, viewport-fit=cover`.
- İpucu metni cihazı tanır (`Game.isTouch()`): savaş kütüğünde "WASD hareket · Sol tık
  saldırı" yerine "Çubukla hareket · ⚔️ saldırı · 🛡️ blok", künyede "[Sağ tık/Shift]"
  yerine "🛡 düğmesi".

**Kabul yolu yalnız parmakla yürütüldü** (375×812, `pointer: coarse`): karakter yaratma
sihirbazı → çapulcu savaşı **"⚔️ Mükemmel Zafer!"** (sanal çubukla dört yön de kullanıldı,
6–7 savurma, 0 kayıp) → pazarda alışveriş (`🌾 Tahıl x1 alındı · -3₺ · kasa 663₺`).

### Denge görünürlüğü (#55 madde 9)
Sayıların kendisi değil, oyuncunun onları **görüp görmediği** düzeltildi.

| Ne | Kural | Ölçüldü |
|---|---|---|
| **Zirve nam** | Bütün nam kapıları `Game.peakRenown()` okur (leydi 80, şölen 150, evlilik 120, drahoma görevi 200, bağlılık 50). `p.maxRenown` kendi kendini günceller | Nam 350'ye çıkıp 40'a düşünce kapılar hâlâ 350'yi görüyor — tek yenilgi bütün kapıları kapatmıyor |
| **Kolay av uyarısı** | `Game.preyWarning(npc)` karşılaşma modalinde ve harita künyesinde; `Battle.rewardScale`'i savaş **öncesi** düşman gücüyle çağırır | 6 kişilik grupla: 1–3 kişilik çete %20, 5 kişilik %25, 10 kişilik %50, 20+ kişide uyarı yok |
| **Garnizon neti** | `openGarrison` başlığında `vergi − maaş = net`, negatifse "bu tımar zarar ediyor" | Praven (refah 83, vergi 165): 12 şövalye **−15/gün**, 12 köylü **+165/gün** |
| **Aç asker işareti** | Grup ekranında `debuff` taşıyan satırda "🍖 Et/peynir bulamadı — savaşta can ve saldırı ×0.7" | Satır çıkıyor |
| **Boss kapısı** | `boss_map` kullanımı `Game.BOSS_RENOWN = 300` zirve nam ister; envanter künyesinde de yazar | Nam 10'da harita harcanmadı, uyarı çıktı |
| **Kervan yükü muhafıza bağlı** | `spawnTrader`'da `w = size / türün ortası`; yük ve kese `w` ile ölçeklenir. Ortalama değişmez, **dağılım riske bağlanır** | Kervan: 6 muhafız ort **949**, 14 muhafız **2135** (ort. 1544). Kafile: 3 muhafız **221**, 7 muhafız **513** (ort. 374). Eskiden en zayıfını seçmek risksiz kârdı |

### Zaman bir kaynaktır: kamp (#53 madde 1.1)

Zaman eskiden yalnız **yürürken** akıyordu: yaralı oyuncu iyileşmek için haritada daire
çiziyor, turnuvanın açılmasını / gönüllünün tazelenmesini / şölenin kurulmasını bekleyemiyordu.
`Game.startWait(hours)` tek primitifle bunu açar — Warband'ın "Kamp kur → Burada bekle"si.

- Harita künyesindeki **⏳ Bekle** düğmesi (`askWait`) süre sorar: 1 saat / 8 saat / 1 gün /
  3 gün / **sabahı bekle** (`hoursUntilDawn`).
- `state.player.wait = { until }` (mutlak saat) + `status = 'waiting'`. `update`'in `timeFlows`
  listesine girer, `advanceTime` çarpanı `timeScale × WAIT_SCALE` (**×4**) olur.
- Sağ altta `#wait-ui` paneli: kalan süre, can, moral, 🚶 *Kampı Topla*.
- **Kesilme tek kapıdan geçer**: `triggerEncounter`'ın ilk satırı `stopWait()` çağırır. Yani
  NPC çarpışması da, ormandaki pusu da (`checkAmbush` → `triggerEncounter`) kampı bozar;
  her karşılaşma yoluna ayrı yama gerekmez.
- Han'da dinlenmek de artık bedava değil: `restAtTavern` 10 dinarın yanında **8 saat** yer.

Ölçüldü (npc'siz harita, `dt = 0.05`): `startWait(24)` **24.2 oyun saati / 6.05 gerçek saniye**
sürdü — aynı 24 saat yürüyerek 24 saniye, yani tam **×4**. Dirayet 10'la can 8 saatte bir
yenilendiği için 24 saatte **+3 can** geldi. 200 birim ötedeki bir çapulcu çetesi kampı
**10.8 saatte** bastı: `wait` null oldu, karşılaşma modali açıldı.

### Şeref — ikinci itibar ekseni (#53 madde 1.5)

Nam "ne kadar tanınıyorsun"u ölçer; şeref (`state.player.honor`, **−100..100**) "nasıl
tanınıyorsun"u. Tek eksen: eski yağmacı damgası onun eksi tarafının etiketidir.

| Eylem (`Game.HONOR`) | Şeref |
|---|---|
| Köy yağmalamak (`raid`) | **−12** |
| Barıştaki kervanı soymak (`robPeace`) | −5 |
| Köylü kafilesini soymak (`robPeasant`) | −8 |
| Soylu esirden fidye (`ransom`) | −2 |
| Soyluyu onurla salıvermek (`release`) | **+5** |
| Kız kaçırma (`abduct`) | **−20** |
| Sefer sözünü tutmamak (`oathBroken`) | −5 |
| Görevi bitirmek (`questDone`) | +2 |

Kademe (`honorTier` / `honorLabel`): ≥40 ⚜️ Şerefli, ≥15 🕊️ Sözünün Eri, ≤−10 🔥 Yağmacı,
≤−36 💀 Köy Yakan. Günde **0.5** sıfıra doğru söner (iki yönlü).

| Etki | Kural |
|---|---|
| Gönüllü ve ücret | `infamyPenalty()` = `−honor/100`, **−0.3 .. +0.6** — artı şeref köylüyü de getirir |
| Paralı asker | `mercPrice` aynı çarpanla |
| Soylu ağırlığı | `Nobles.standing` artık kademe değil **mizaç** okur: `Game.honorWeight(personality)` — iyi huylu `honor/40`, kurnaz `−honor/60`, sefih `−honor/90`, diğerleri `honor/55` (±2 ile sınırlı) |
| Şölen | `Feast.HONOR_REQ = −30`: nam kapıyı açar, şeref kapıda tutar |
| Köy yaşlısı | kademe 2'de dost köyde bile "çabuk git" (zaten #50'de vardı, şimdi şereften okuyor) |

Ölçüldü: bir yağma −12 (🔥 Yağmacı), **beş yağma −60** (💀 Köy Yakan, ceza %60);
gönüllü/ücret 8 kişi–10₺ → **3 kişi–16₺**, lvl 12 paralı asker 204 → **326 dinar**;
şeref +30/+60'ta **10 kişi–7₺** ve **143 dinar**. −60 şeref **119 günde** sıfıra döndü.
Aynı −60 şeref iyi huylu lordda `standing` **−1**, kurnaz ve sefih lordda **+1** —
şerefsiz adamın kurnaz lordun salonunda sözü daha çok geçer.

### Kan davası — dünya seni hatırlar (#53 madde 1.3)

`state.grudges[lordId] = başladığı gün`; `GRUDGE_DAYS = 30`. Köyünü yaktığın lord
(`grantRaidLoot`), kervanını soyduğun bölgenin en yakın lordu (`robTrader` →
`addGrudgeNearest`) ve fidyeye bağladığın soylu (`ransomLord`) sana kan davası açar.
Onurla salıvermek (`releaseLord`) davayı **siler**.

- `isHostile(npc)` ilk satırı: kan davalı lord savaş/ilişki şartına bakmadan **saldırır**.
- `updateNPCs`'te kan davalı lord yeni hedef seçerken **%50** ihtimalle evine değil
  **senin üstüne** yürür; `npc.hunting = oyuncu adı` olduğu için harita künyesinde
  "🎯 Peşinde: …" satırı çıkar. Dava bitince `hunting` silinir.
- Süresi dolan davalar `dailyUpdate`'te `state.grudges`'tan atılır; diplomasi ekranında
  (**K**) "🩸 Kan Davaları" başlığı kaç gün kaldığını yazar.

Ölçüldü (tek lorda dava açıp 30 gün sim, saatte bir örnek): lord partisi **720 saatin
674'ünde** 1200 birim içinde kaldı, mesafe **0'a** kadar indi (gerçek döngüde bu
karşılaşma demek), 693 saat boyunca `hunting` alanı doluydu; **31. gün** dava silindi.

### Servet ölçekli tehdit (#53 madde 1.3)

`Game.threatLevel()` = `round(√(asker seviyeleri toplamı + oyuncu seviyesi) / 2)`.
`battle.js`'te düşman seviyesi artık yalnız takvime bakmıyor:
haydut `max(1 + gün/30, tehdit − 1)`, fraksiyon ordusu `max(5 + gün/15, tehdit + 3)`.
Rimworld'ün "baskın puanı = koloni serveti" kuralının en ucuz hâli.

Ölçüldü: tek başına gezen oyuncu **1**, 10 acemi **2**, 20×lvl10 **7**, 40×lvl20 **14**,
60×lvl30 **21**. 20. günde 20×lvl10 ordu 20 çapulcuya karşı otomatik çözümde ortalama
kaybı **0.6 → 1.7 asker** (15/15 zafer) — güçsüz oyuncuyu ezmiyor, güçlü oyuncuyu
çapulcu avına gömmüyor.

### Hedef zinciri — `AMBITIONS` (#53 madde 1.4)

Battle Brothers'ın "ambition"ı: aynı anda **tek** aktif hedef, tamamlanınca ödül ve yeni
hedefler. Tamamı veri (`Game.AMBITIONS`), koşullar `state`'i okur — olay dinlemez, günlük
`ambitionTick()` ve Görevler sekmesi aynı `check`'i çağırır.

| Hedef | Koşul | Ödül | Açtığı |
|---|---|---|---|
| Küçük bir bölük | grup ≥ 10 | +5 nam | Turnuva şampiyonu, Bir lordun dostu |
| Turnuva şampiyonu | `tourneyWins > 0` | +10 nam, +500 dinar | Toprak sahibi |
| Bir lordun dostu | herhangi ilişki ≥ 30 | +5 nam | Yeminli |
| Yeminli | bağlılık yemini | +15 nam | Kan bedeli, Toprak sahibi |
| Kan bedeli | açtığın bütün kan davaları kapandı | +10 nam, +5 şeref | — |
| Toprak sahibi | tımar ≥ 1 | +20 nam | — |

Panel **Görevler** sekmesinin (Q) en üstünde durur: seçili hedef + vazgeç, ya da açık
hedeflerin listesi. Ölçüldü: zincir baştan sona yürüyor — 4 hedef kapatınca **+35 nam**,
her tamamlamada açık hedef listesi değişiyor (`band` → `champion`/`friend` → `sworn` → `feud`/`fief`).

### İşletme ve tımar kasası (#53 madde 1.6 / 1.2)

**İşletme** (`Game.buyEnterprise`, şehir ekranında 🏭): **3000 dinar**, günde
`refah × 0.55`. `fiefIncome()`'un `trade` kalemi olarak günlük akışa girer ve hazine
künyesinde satır olur. Şehirle savaştaysan kapı kapalıdır, **kazanç durur**
(`enterpriseWorks`); mülk kaybolmaz. Kayda `loc.enterprise` olarak yazılır.
Ölçüldü: refah 87'lik Tulga **+52 dinar/gün, 58 günde amorti**; refah 51'lik Narra
**+28/gün, 108 gün**. Yani işletme "hangi şehir" sorusu olur.

**Kasa** (`loc.treasury`, 📦 Depo ekranında): tımarına para yatırırsın, yenilgide
yağmalanmaz. Yenilgi/teslim kaybı artık zar değil karar:
`Game.defeatLootRatio()` = `0.6 + 0.3 × (1 − kasadaki pay)` ve yalnız **yanındaki keseye**
işler. Ölçüldü (toplam 10 000 dinar): hepsi yanındayken oran 0.90, geriye **1 000** kalıyor;
%90'ı kasadayken oran 0.63, geriye **9 370** kalıyor. Depo böylece gerçek bir sigorta olur.

## Görsel katman (renovasyon)

Tüm çizim `app.js` + `battle.js` içinde, kütüphane yok. Ortak yaklaşım: **pahalı şeyi bir kez pişir,
sonra her karede resmi bas.**

- `Game.buildGroundTexture()` — 256px **dikişsiz** çim döşemesi (her leke/çim 9 sarmalı
  konumda çizilir), `createPattern` ile `Game.groundPattern`'e konur. Harita zemini bu.
- `Battle.buildGround()` — savaş arenasının tamamını (çim gradyanı + 60 yumuşak leke +
  2600 çim tutamı + nehir/çukur/tepe/orman) offscreen canvas'a pişirir; `render()` tek
  `drawImage` ile basar.
- `Battle.drawTree(ctx,x,y,r)` — gölge + gövde + 3 gradyanlı taç. Hem savaşta hem haritada
  kullanılır (harita ormanları `_forestTrees` içinde önbelleklenir).
- `Battle.drawUnit()` — zemin gölgesi, takım halkası (mavi `#4fa8ff` / kırmızı `#ff5a4a`),
  oyuncuya nabız atan altın halka, toz, emoji + rütbe işareti, isabet beyaz flaşı,
  `currentWeaponAngle`'da gradyanlı kılıç, HP çubuğu **yalnızca hasar aldıysa**.
  Birimler y'ye göre sıralı çizilir (derinlik hissi).
- `Battle.drawHud()` — genişliğe uyum sağlayan komut şeridi + çelik çerçeveli halat-çekme
  çubuğu (çentikler, titreyen çatışma imleci, Cinzel durum yazısı).
- `Game.mapLabel()` — yuvarlak köşeli plaka + fraksiyon renginde alt çizgi. Yazı boyutu
  `1/camera.zoom` ile ölçeklenir (her yakınlıkta aynı ekran boyu), çakışan etiketler
  yukarı itilir. Yerleşim etiketleri ikonun üstünde, NPC etiketleri altında.
- `Game.drawPartyIcon()` / `drawRider()` / `drawFootman()` — haritadaki grup silüetleri;
  emoji değil, canvas yolu. Detay için "Dünya haritası" bölümüne bak.
- `renderMap()`: önbellekli deniz gradyanı + animasyonlu dalga çizgileri, kıta yolu
  (kum bandı → gölgeli dolgu → kenar) sonra `ctx.clip()`, toprak lekeleri, nehirler
  (yatak + su + parıltı + akan kesikli çizgi), yollar (48/30/kesikli-4 katman), ormanlar,
  yerleşimler (gölge + emoji + fraksiyon flaması + turnuva 🏆).
- Gradyanlar **dünya koordinatlarında** önbelleklenir; kamera kaydırınca kaymazlar.

`style.css` sonundaki `RENOVASYON` bloğu: body radyal gradyanları, `.glass-panel` iç ışığı,
sefer çubuğu rozetleri (`.hud-chip` / `.hud-bar` / `.fill-hp|party|xp`), ikonlu ve kısayol
rozetli `.menu-btn`, `#map-hud` künyesi, `.view > h2::after` altın çizgi,
`#map-view`/`#battle-view` altın çerçeve, `.battle-logs` için `min(330px, 50% - 28px)`
genişlik + `mask-image` ile alta doğru sönme.
`#top-bar`'a `position:relative; z-index:60` verilmiştir — yoksa hız ipucu harita
canvas'ının altında kalıyordu.

## Performans

Darboğaz JS değil, **compositor**. Ölçüldü (1920×1080 tuval, 81 canlı birim + 60 ceset +
200 kan lekesi): `Battle.update` kare başına 0.27 ms, `Battle.render` 0.97 ms — toplam
~1.2 ms. Yani kare bütçesinin (16.7 ms) ancak %7'si JS'te geçiyor; kalan her şey çizim
ve birleştirme.

**Kare bütçesi ekranın tazeleme hızına bağlıdır**: 180 Hz'lik bir monitörde `requestAnimationFrame`
kare başına 16.7 ms değil **5.5 ms** verir — aynı çizim işi 3 kat sıkışık bir bütçeye girer ve
kaçan kareler takılma olarak hissedilir. Bu yüzden `Game.skipFrame(t)` üç döngünün de başında
fazla kareleri atar. Sabit ms eşiği kullanılmaz (90 Hz'te her ikinci kareyi atlamak 45 fps eder);
tazeleme hızı ilk karelerden ölçülüp 60'ın altına düşürmeyen en büyük tam bölen seçilir.
Ölçüldü (`node` ile kapı simülasyonu): 60→60, 75→75, 90→90, 120→60, 144→72, 165→82, 180→60, 240→60.
`_minStep` yalnızca 1 ms'den büyük deltalarla güncellenir — iki döngü aynı karede çağırırsa
delta ~0 olup bölen patlıyordu.

**Karar kare başına verilir, çağrı başına değil (#42).** Aynı karede ikinci kez sorulursa
(`t === _prevT`) önbelleklenmiş cevap döner. Eskiden her çağrı `_frameNo`'yu artırıyordu:
harita ve savaş döngüsü bir arada koştuğunda sayaç kare başına **2** artıyor, `n ≥ 2` olan
her ekranda (120 Hz ve üstü) döngülerden birinin parmak izi kalıcı olarak tek sayıya
düşüyor ve o döngü **bir kez bile** çalışmıyordu. Ölçüldü (n=2, 2 saniye): önce harita
döngüsü 60 / savaş döngüsü **0** kare — savaş donuyor, tuval hiç çizilmediği için ekran
**simsiyah** kalıyordu (bkz. #42: "savaş arka planda çözülüyor" — kaydet/yükle döngüleri
yeniden kurup pariteyi değiştirdiği için savaş bir anda bitiyordu). Düzeltmeden sonra aynı
koşulda savaş döngüsü **61 update + 61 render** (30 fps), harita döngüsü 0 (zaten durmuş).
60 Hz'te değişen bir şey yok: harita 60 fps, savaş 60 fps, savaş sırasında boşa harita
render'ı 0.

Savaş açıkken harita girdisi de yok sayılır (`handleMapClick` / `handleMapHover` başında
`Battle.active || TournamentMinigame.active` kapısı).

**İki emniyet ağı** (#54) kök nedenin üstüne kondu — ikisi de çözüm değil, sessiz siyah
ekranı bir daha uzun sürmesin diye konmuş nöbetçilerdir:
- `Game.battleCtx()` — `battle-canvas`'ı `Battle` ve `TournamentMinigame` paylaşıyor ve
  **ilk `getContext` bağlayıcıdır**: biri `{ alpha:false }` bayrağını unutsaydı ikinci çağrı
  `null` dönecek ve ekran yine siyah kalacaktı. Artık ikisi de aynı kapıdan alır, bağlam
  alınamazsa `Debug.log('tuval', …)`.
- **Nabız kontrolü** — `Battle.start` savaş döngüsünü kurduktan 700 ms sonra bakar: tek kare
  bile çizilmediyse (`this.lastRender` hâlâ 0) döngüyü bir kez yeniden kurar ve
  `Debug.log('nabiz', …)` yazar. `document.hidden` iken atlanır, çünkü gizli sekmede
  `requestAnimationFrame` zaten durur — yoksa alt+tab yapan her oyuncuya yanlış alarm.
  Ölçüldü: `render` boşa çıkarılıp rAF kesildiğinde uyarı 700 ms'de düştü, normal savaşta
  hiç düşmedi.

Bu yüzden kasma aramak için profiler'da JS'e bakmak yanıltıcı. Uygulanan kurallar:

- **Hareketli tuvalin üstünde `backdrop-filter` yok.** Blur, altındaki piksel her değiştiğinde
  yeniden hesaplanır; harita/savaş tuvali her kare değiştiği için bu kare başına tam bir
  blur geçişi demek. Ölçüldü: 344×513'lük savaş tuvalinde bile 10 kütük mesajı
  **54 fps / p95 33.3 ms → 60 fps / p95 18.2 ms** (üç kez tekrarlandı). `#map-hud`,
  `#map-tooltip`, `#prisoner-ui`, `.battle-logs .log-msg` blur yerine daha opak zemin
  kullanıyor. Durağan zemin üstündeki paneller (`#top-bar`, `#sidebar`, modal) blur'u
  koruyabilir — altları değişmediği için sonuç önbelleklenir.
- **Modal açıkken `renderMap()` erken döner.** Zaman zaten donuk; çizmeye devam etmek
  modalin 16 px'lik cam blur'unu her kare yeniden hesaplatıyordu. Ölçüldü: modal açıkken
  500 ms'de 30 kare → 0 kare, kapanınca geri geliyor.
- **Tuvaller opak** (`getContext('2d', { alpha: false })`): harita denizi, savaş zemini ve
  turnuva arka planı her kareyi baştan sona dolduruyor, alfa kanalı boşuna.
  Not: `battle-canvas`'ı `Battle` ve `TournamentMinigame` paylaşıyor — ikisi de aynı
  bayrakla `getContext` çağırmalı (ilk çağrı bağlayıcıdır).
- **Her rAF döngüsünün çift başlama koruması var** (`Game.startGameLoop`, `Battle.start`,
  `TournamentMinigame.start`): `if(this.loopId) cancelAnimationFrame(this.loopId)`. Yoksa
  ikinci bir döngü hem hızı hem çizim yükünü ikiye katlar.
- **Birim emojileri sprite olarak önbelleklenir** (`Battle.unitSprite`). Renkli emoji
  glifini `strokeText` + `fillText` ile her kare yeniden rasterize etmek pahalı: ölçüldü,
  çağrı başına **13 µs → 3.4 µs (3.8×)**. `Battle.warmUp()` savaş başlamadan önce
  `UNIT_ICONS`'un hepsini pişirir — "ilk saniyeler kasıyor, sonra açılıyor" şikâyetinin
  kaynağı ilk karelerdeki glif rasterizasyonuydu. Ölçüldü: savaşın ilk `render()`'ı
  **32.6 ms → 21.1 ms**, ilk kareler `32.5 + 33.5 ms` yerine tek `33.3 ms`.
  Yeni bir birim ikonu eklerken `UNIT_ICONS`'a da eklenmeli.
- Pahalı şey bir kez pişirilir: `Game.buildGroundTexture()`, `Battle.buildGround()`,
  `_seaGrad`, `_vignette`, `_forestTrees`, `_swordGrad`. Kare başına gradyan üretilmez.
- Parçacık tavanları: kıvılcım 120, uçan yazı 40, kan lekesi 200, ceset 60.
- Hedef arama kare başına tam tarama değil — birim başına 0.3–0.5 sn'de bir (`u.tgtId`).

Hâlâ kasan bir makinede ilk bakılacak yer `chrome://gpu`: tuval hızlandırması kapalıysa
(sürücü kara listesi) her şey yazılımla rasterize edilir ve buradaki hiçbir önlem yetmez.

## Bilinen eksikler / bozukluklar

Faz 0'da düzeltilenler (artık sorun değil): fidye butonları, turnuva softlock'u
(`battle-log` → `battle-log-left`), çift tanımlı `showLore`/`toggleEscapePlan`/`attemptEscape`,
Windows mutlak portre yolları, yeterlilik anahtarı uyuşmazlığı, `renderPartyScreen` kapasitesi,
kayıt/yükleme.

Savaş turunda düzeltilenler: tek savurmanın yaydaki **herkese** vurması, toparlanma süresi
olmadığı için hızlı tıklamanın hasarı katlaması, `enemyLvl`'in hesaplanıp hiç kullanılmaması,
`performance.now()` tabanlı bekleme sayaçlarının kare hızına bağlı olması, arenadan kaçan
okçuların savaşı sonsuza kilitlemesi, ok hasarının `-4.199999999999999` gibi yazılması,
yenilgide oyuncu canının %30'a düşürülüp hemen üzerine yazılması, oyuncu ölünce savaşın
anında bitmesi.

Kalanlar: —

*(Savaş motoru #41'de `battle.js`'e ayrıldı: `app.js` 6276 → 4581 satır, `battle.js` 1701 satır.)*

## Ölçüm araçları (#62)

CLAUDE.md'deki "Ölçüldü" sayıları tarayıcı konsolunda elle yazılan tek seferlik
betiklerden geliyordu: tekrarlanamıyor, sürüm atlayınca sessizce eskiyordu. `tools/`
altındaki dört araç **oyunun kendi kodunu** koşturur (yeniden yazmaz) ve çıktıyı
`docs/olcum/<tarih>-<konu>.md` olarak bırakır.

`tools/harness.js` tek kapıdır: minik bir DOM sahtesi kurar, `app.js` → `battle.js`
→ `nobles.js` → `quests.js`'i **tek bir `vm` bağlamında** çalıştırır (klasik script'te
`const Game` sözcüksel globaldir, `window.Game` diye aranamaz) ve `vm.runInContext`
ile isimleri geri okur. Çizim çağrıları sahte tuval bağlamına düşüp no-op olur.
Tohumlu üreteç (`mulberry32`) `Math.random`'ın yerine geçtiği için **aynı tohum aynı
dünyayı** verir. Ortak bayraklar: `--tohum 1-5`, `--json`, `--rapor`.

| Araç | Ne ölçer | Örnek |
|---|---|---|
| `sim.js` | Oyuncusuz dünya: fetih, sefer, savaş/barış, kafile baskını, refah, silinen krallık | `node tools/sim.js --gun 200 --tohum 1-5` |
| `duel.js` | 1v1 asker dengesi — gerçek `Battle.update` adım adım işletilir (blok, kite, hücum dahil) | `node tools/duel.js --n 200` |
| `economy.js` | Oyuncu betiğinin **servet** eğrisi: kasa + elindeki ticaret malının satış değeri | `node tools/economy.js --gun 60 --asker 10` |
| `framegate.js` | `Game.skipFrame` kapısı: Hz → geçen fps ve #42 paritesi | `node tools/framegate.js` |

### Kare atlama kapısı — regresyon (`framegate.js`)
Kapının kendi kodu sahte zaman damgalarıyla sürülür. Ölçüldü (2 sn):
**60→60, 75→75, 90→90, 120→60, 144→72, 165→82.5, 180→60, 240→60** — yani kural
("60 fps'in altına düşürmeyen en büyük bölen") tuttu. İkinci tablo #42'nin
regresyonudur: aynı karede iki döngü sorunca **ayrık cevap 0**, harita ve savaş
döngüsü aynı fps'i görüyor. Ayrık cevap sıfırdan büyük çıkarsa döngülerden biri
kalıcı olarak aç kalır ve ekran siyahlanır; araç bu durumda **1 ile çıkar**, yani
CI kapısı olarak kullanılabilir.

### Ekonomi — meslek seçimi gerçekten bir seçim mi? (`economy.js`)
Üç oyuncu betiği aynı dünyada, aynı orduyla koşturulur. Ordu aç kalmasın diye her
gün erzak alınır (yoksa ölçüm "para eğrisi" değil "ordunun firar edişi" oluyordu) ve
ölçülen şey kasa değil **servettir** — ticaret betiği günü yükle kapattığı için kasa
tek başına yanıltıyordu.

Ölçüldü (`--gun 60 --asker 10`, 10× sv. 10 Svadya Milisi, 1000 dinar kasa):

| Betik | Bitiş | Gün başına | Günlük maaş | Günlük erzak | Kalan asker |
|---|---|---|---|---|---|
| Boş gezen ordu | 127 | **−14.6** | 20₺ | 14₺ | 1/10 |
| Ticaret rotası | 137 | **−14.4** | 20₺ | 18₺ | 0/10 |
| Tımar sahibi | 5745 | **+79.1** | 20₺ | 49₺ | 11/10 |

Okunacak sonuç: **10 kişilik ordu geliri olmadan yaşamaz** (maaş + erzak ≈ 35–50₺/gün)
ve **ticaret tek başına bir orduyu beslemez**. Ordusuz koşturulan aynı ticaret betiği
+11.8₺/gün kazanıyor; kasayı büyütmek işe yaramıyor (`--kasa 5000` → +2.3, `--kasa 20000`
→ +0.2), çünkü darboğaz para değil **#46'nın arz eğrisidir**: hedef pazarın stoğunun
dörtte birinden fazlasını boşaltmak fiyatı çökertir. Yani ticaretin ölçeği keseyle değil
**rota sayısıyla** büyür — Warband'daki gibi. Tımar ise düzenli gelirdir: sefer/savaş
olmadan bile günde +79₺.

### Düello — araç ölçümü elle ölçümden neden farklı (`duel.js`)
"Grup & asker" bölümündeki süreler `Battle.dealMelee`'nin **tek yönlü** çağrılmasıyla
ölçülmüştü (hedef karşılık vermiyor). `duel.js` gerçek düellodur: ikisi de vurur,
bloklar, kaçar, hücuma kalkar. Ölçüldü (tur başına 200 dövüş; düello rastgeledir,
tekrarlanan turlarda oran ±%3 oynar):

| A | B | A kazanma | Ort. süre |
|---|---|---|---|
| Nord Baltacısı | Rodok Kalkanlısı | **%96.9** | 22.9 sn |
| Nord Baltacısı | Svadya Şövalyesi | **%50.8** | 15.1 sn |
| Rodok Mızraklısı | Nord Baltacısı | %0 | 8.8 sn |
| Svadya Milisi | Rodok Kalkanlısı | %0 | 10 sn |
| Kergit Atlı Okçusu | Rodok Tatar Yaylısı | %6.5 | 9.6 sn |

İki yöntem çelişmiyor, farklı soru soruyor: tek yönlü ölçüm "bu silah bu zırhı ne kadar
sürede deler"i, düello "bu asker bu askeri yener mi"yi söyler. Elit dengesi ayakta —
baltacı kalkanlıyı yeniyor ama **23 saniyede**, şövalyeyle ise yazı-tura. Orta kademe
elite karşı hâlâ kaybediyor (%0): mızrak zırhı deler, ama can havuzu tutmuyor.

*(Araçlar tarayıcı oyununa hiçbir şey eklemez — `index.html` onları yüklemez.)*

## Kod tarzı

- Türkçe yorum ve arayüz metni, İngilizce değişken/fonksiyon isimleri.
- Arayüz `innerHTML` şablon dizeleriyle üretilir, inline `style` yaygın. Buton eylemleri
  `onclick="Game.xxx()"` ile globallere bağlanır — bu yüzden `Game`/`Battle`/`Nobles`/`Quests`/
  `Feast`/`Save` global kalmalı.
- Modal açmak: `Game.showModal(html, width?, bgImage?)`, kapatmak `Game.closeModal()`.
- Bildirim için `alert()` yeterli (modala yönlendirilmiş durumda). Override `typeof Game`
  ile bakar: `const Game` **sözcüksel** globaldir, `window.Game`'e takılmaz — eski guard
  `window.Game` sorduğu için oyundaki bütün `alert()` çağrıları sessizce yutuluyordu
  (ör. "İlgi 0/60" uyarısı; buton hiçbir şey yapmıyor sanılıyordu). Mesajdaki `\n`
  modalde `<br>`'ye çevrilir.
