# WebBand

Mount & Blade: Warband tarzı, tarayıcıda çalışan tek sayfalık RPG. Türkçe arayüz.
Build yok, bağımlılık yok — `index.html` doğrudan tarayıcıda açılır.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html` | Tüm ekranların DOM iskeleti (start, main-ui, map/settlement/character/party/inventory/battle view'ları, modal, esaret paneli, kuşatma kampı paneli) |
| `app.js` | Çekirdek — harita, zaman, yerleşim, diplomasi, kayıt. Global objeler: `Input`, `Game`, `Save` + `state` |
| `battle.js` | Savaş arenası ve turnuva minigame'i: `Battle`, `TournamentMinigame` |
| `nobles.js` | `LORDS` (23), `LADIES` (12), `COMPANIONS` (7), `PERSONALITIES`, `LADY_TRAITS`, `COMPLIMENTS`, `POEMS` + `Nobles` ve `Feast` objeleri |
| `quests.js` | `QUESTS` (11 görev tanımı) + `Quests` görev motoru |
| `docs/PLAN-soylular-ve-gorevler.md` | Bu sistemin tasarım planı |
| `style.css` | Cam panel (glassmorphism) teması, CSS değişkenleri (`--primary`, `--danger`, `--success`, `--panel-border`, `--text-muted`) |
| `bg.jpg`, `bg_hdr.jpg` | Arkaplan görselleri |
| `lord_portraits.jpg` | 3x3 sprite sheet — lord portreleri (`background-position` ile kırpılır) |
| `kingdom_crests.jpg` | 3x3 sprite sheet — krallık armaları |
| `LICENSE` | AGPL-3.0-or-later |

## Mimari

`window.onload → Game.init()` → harita üretimi + NPC spawn. `Game.startGame()` oyun döngüsünü
(`requestAnimationFrame`) başlatır. Döngü `update(dt)` + `renderMap()` çağırır ve
`Battle.active || TournamentMinigame.active` iken kendini durdurur; savaş/turnuva kendi
döngüsünü işletir.

Script yükleme sırası: `app.js` → `battle.js` → `nobles.js` → `quests.js`. Aralarındaki tüm
referanslar fonksiyon gövdelerinde olduğu için sıra sadece `const` çakışmasını önlemek için
önemli. *(`const` klasik script'te global sözcüksel kapsama girer, yani `battle.js`'teki
`Battle` app.js'ten de görünür — `window.Battle` diye aranmamalı.)*

Tüm veri tek bir `state` objesinde. `Save.save()` / `Save.load()` bunu localStorage'a
(`webband_save_v1`) JSON olarak yazar. *(Savaş sisi kaldırıldığı için `state.explored`
ızgarası da kayıttan çıktı; eski kayıtlardaki alan yok sayılır.)*

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
- Yerleşimler (`LOCATIONS`) `init()` içinde her fraksiyon için bir açı diliminde **rastgele yeniden dağıtılır** — dizideki x/y değerleri kullanılmaz.
- Yollar: tüm yerleşimleri bağlayan minimum spanning tree (`state.roads`).
- Nehirler (`RIVERS`) ve ormanlar (`FORESTS`) sabit koordinatlı.
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
- Kamera: fare tekerleği zoom (`Game.minZoom()`–3.0), kenardan fare ile pan, oyuncuya yumuşak takip.
  Alt sınır ekrana göre hesaplanır (`min(kısa kenar/9600, 0.8)`, taban 0.07) — **tüm kıta
  (9000 birim) tek ekrana sığar**. 1440×900'de ölçüldü: zoom 0.084, ekran 14453×9600 birimlik
  alanı gösteriyor, 25 yerleşimin hepsi ve 36 gruptan yalnızca görüş içindeki 4'ü çizili.
  Uzaklaşınca yerleşim ve grup ikonları dünya biriminde eridiği için `Game.iconScale()`
  = `max(1, 0.55/zoom)` ile büyütülür (etiketler zaten `1/zoom` ile ekran boyutundaydı).
- **Rota çizgisi**: kalın sarı kesik yerine akan ince kesikli çizgi (gölge + altın kat),
  hedefte nabız atan halka ve yön oku.
- Tıklama ile hareket: yerleşim → içeri gir, NPC → karşılaşma, boşluk → serbest hareket. WASD/ok tuşları kamerayı oyuncuya kilitler.
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
  haritaya döner, **Boşluk** haritada kamerayı oyuncuya geri kilitler (`Game.centerOnPlayer()`)
  — hepsi `Input.init` içinde, modal veya savaş açıkken çalışmaz.
  `showScreen()` tıklanan butonu `data-view` ile aktifler.
- **Harita künyesi** (`#map-hud`): bulunduğun arazi + hız etkisi, altında birlik dağılımı
  (🪖 piyade / 🏹 okçu / 🐎 süvari), **🎯 Beni Bul** ve **🌍 Diplomasi** düğmeleri.
  `Game.updateMapHud()` doldurur.
  Künye `pointer-events:none` olduğu için düğmeye CSS'te `pointer-events:auto` verilmiştir.
- `Game.setHtml(id, html)` innerHTML'i sadece metin değiştiyse yazar — `updateTopBar` her
  karede çağrıldığı için gereksiz DOM yazımını önler.

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
- Grup kapasitesi: `12 + (cha-10)*3 + (leadership-1)*4 + nam/40` — yeni karakter **12 kişiyle** başlar;
ordu nitelik, yetenek ve namla birlikte büyür (temel 50 → 24 → 12).

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
Al/Sat butonlarının yanında **x5** var; her işlem `#market-msg` şeridine ürün + adet + ödenen/alınan tutar + kalan dinar yazar
(`Game.marketMsg`). Para yetmezse alabildiği kadarını alır ve bunu söyler — `alert()` kullanılmaz, pazarı kapatırdı.

#### Mal başına arz/talep fiyatı (#24)
Fiyat artık şehre girerken atılan **tek zar** değil (eskiden bütün mallara aynı 0.8–1.2
çarpanı vuruyordu, yani rota kurulamıyordu). Her yerleşimin her mal için kendi çarpanı var:

- `Game.basePriceMult(loc, id)` = **üretim bölgesi** (`Game.GOOD_ORIGIN`: Svadya tahıl 0.70,
  Rodok bira 0.65 / demir 0.80, Veagir et 0.70, Nord tuz 0.70, Kergit peynir 0.70; uzak
  krallıkta 1.20–1.35) × yerleşim+mal hash'inden sabit ±%12 sapma × köy düzeltmesi
  (erzak ×0.8, ticaret malı ×1.15) × refah (`1.15 − refah/400`).
- `Game.priceMult(loc, id)` bu tabanı `loc.prices[id]`'ye yazar ve **oradan okur** —
  yani fiyat oynayabilir bir durumdur, kayda girer.
- **Sen aldıkça pahalanır, sattıkça ucuzlar**: `priceImpact` birim başına **%0.8**,
  taban çarpanın 0.5–1.8 katıyla sınırlı. *(%2 denendi: 20 birimlik tek yük fiyatı %49
  oynatıp kârı %8'e indiriyordu — piyasa oyuncunun tek yüküne fazla duyarlıydı.)*
- `Game.priceTick()` her gün fiyatı tabanına **%12** yaklaştırır; oturunca anahtarı siler.
- Pazar listesinde ve lonca defterinde `Game.priceTag()` rozetleri: **ucuz** ≤ −%12 yeşil,
  **pahalı** ≥ +%12 kırmızı.
- **Lonca fiyat defteri** (han → ⚖️ Lonca Ustası → 📈 Fiyat Defterine Bak,
  `Game.guildPrices`): en yakın 5 şehrin bütün erzak/ticaret mallarındaki fiyatı tek tabloda.
  Rota kurmanın bilgi kaynağı bu — Warband'daki "ticaret malları fiyatları" ekranı.

Ölçüldü (yeni dünya, ticaret yeteneği 1): en ucuz→en pahalı şehir arası **tek yükün kârı**
20 bira Jelkala→Reyvadin **+220 dinar (%33)**, 20 tuz Sargoth→Uxkhal **+470 (%37)**,
10 kadife Veluca→Narra **+1005 (%30)**, 20 demir Veluca→Tihr **+310 (%14)**. Bir çapulcu
savaşı ~80 dinar olduğu için ticaret artık gerçekten meslek — ama sermaye, yol ve haydut
riski istiyor.

### Yerleşimler
- **Şehir**: pazar, köle tüccarı, han (dinlenme + ozandan şiir öğrenme + **paralı asker** +
  **lonca ustası** + **yoldaş** kiralama), turnuva (varsa), lordlar salonu,
  şölen (varsa katıl; kendi krallığındaysa ver), gönüllü toplama
- **Kale**: lordlar salonu, şölen (varsa)
- Aktif göreve bağlı butonlar da burada çıkar (ör. tavuk kovalama).
- **Kendi tımarında** (`loc.owner === 'player'`, köy hariç): **🛡️ Garnizon** ve **📦 Depo**
  düğmeleri en üstte çıkar (bkz. "Tımar yönetimi").
- **Köy**: köy yaşlısı (duruma göre esprili diyalog), gönüllü toplama, erzak pazarı,
  **köyü yağmalama**. Savaştaki krallığın köyünde yalnızca yağma seçeneği çıkar — düşman
  köyü sana ne asker ne erzak verir.
- Düşman (savaşta olduğun) fraksiyonun şehri/kalesi ise sadece **kuşatma** seçeneği çıkar.
- **Refah** (`loc.prosperity`, 35–90; `init()`'te atanır, kayda yazılır) tek sayıdır ve üç yeri
  besler: garnizon (`Game.garrisonOf` = temel × (0.6 + refah/125)), gönüllü tazelenmesi
  (+refah/40) ve pazar çarpanı (× (1.15 − refah/400) — bolluk fiyatı düşürür).
  Her gün kendiliğinden toparlanır: 50'nin altındaysa +0.4, üstündeyse +0.15 (tavan 90).

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
| Köylü kafilesi | köy ↔ en yakın şehir (mekik) | 3–7: Köylü / Köy Avcısı | tahıl + peynir + 20–70 dinar → **120–300 dinar** | mızraklı yaya, açık yeşil |

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
  birimden seni fark edip kaçar. Eskiden `isHostile` false dönünce hiç kaçmıyor, dibine girene kadar dolaşıyordu. Soylular (`npc.lordId`) yalnızca düşman krallığın vassalıysan ya da ilişki ≤ −50 ise saldırır; aksi halde çarpışma **diyalog** açar.
- Karşılaşma modali: savaş / teslim ol. (İlk 14 günde çapulcular %25 ihtimalle "uzaklaş" seçeneği verir.)
  Hayvan sürüsüne teslim olunmaz: kurtlarda buton **"🏃 Kaçmayı Dene"** olur
  (`Game.fleeEncounter`, şans = harita hızın/160, %15–85 arası).

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

Ölçüldü (200 gün × 5 tur, oyuncusuz): **4–11 fetih**, 23–37 sefer (~6 günde bir),
0–2 ittifak, 10–22 barış antlaşması, **hiçbir turda krallık silinmedi**. Sefer öncesi aynı
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

### Turnuva
`TournamentMinigame.start(opts)` — varsayılan 25 saniyede 12 hedefe tıklama. Hedef boyutu
çevikliğe, ekranda kalma süresi güce bağlı. Kazanınca +500 dinar, +20 nam ve
`state.pendingDedication` açılır (zaferi bir leydiye ithaf edebilirsin).
`opts = { mode:'chicken', goal:8, time:15 }` ile tavuk görevi varyantı olarak çalışır.
Bitişte `tournament_end` / `chickens_caught` olayı yayınlanır.

### Boss
`boss_map` eşyası (pazardan 5000 dinar) kullanılınca **Savaş Tanrısı** savaşı açılır.
En fazla 4 kez girilebilir, her girişte boss seviyesi +5. Kazanınca lvl 51 nişanı düşer.

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
