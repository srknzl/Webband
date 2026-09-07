# WebBand

Mount & Blade: Warband tarzı, tarayıcıda çalışan tek sayfalık RPG. Türkçe arayüz.
Build yok, bağımlılık yok — `index.html` doğrudan tarayıcıda açılır.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html` | Tüm ekranların DOM iskeleti (start, main-ui, map/settlement/character/party/inventory/battle view'ları, modal, esaret paneli) |
| `app.js` | Çekirdek — harita, zaman, yerleşim, savaş, turnuva, kayıt. Global objeler: `Input`, `Game`, `Battle`, `TournamentMinigame`, `Save` + `state` |
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

Script yükleme sırası: `app.js` → `nobles.js` → `quests.js`. Aralarındaki tüm referanslar
fonksiyon gövdelerinde olduğu için sıra sadece `const` çakışmasını önlemek için önemli.

Tüm veri tek bir `state` objesinde. `Save.save()` / `Save.load()` bunu localStorage'a
(`webband_save_v1`) JSON olarak yazar. Keşfedilen harita 100 birimlik kaba bir ızgarada
(`state.explored`, 90×90 '0'/'1' dizesi) saklanır; yüklemede sis tuvali bu ızgaradan yeniden boyanır.

Global veri sabitleri: app.js'te `FACTIONS`, `LOCATIONS`, `RIVERS`, `FORESTS`, `ITEMS`,
`TROOP_TREES` (+ ondan üretilen `TROOP_UPGRADES` / `TROOP_TYPES`); nobles.js'te `LORDS`, `LADIES`, `PERSONALITIES`,
`LADY_TRAITS`, `COMPLIMENTS`, `POEMS`; quests.js'te `QUESTS`.

`window.alert` override edilmiştir → modal olarak gösterilir.

## Mevcut Özellikler

### Dünya haritası
- Prosedürel kıta sınırı: `getMapRadius()` açıya bağlı sinüs toplamı ile düzensiz kıyı üretir; `clampToMap()` herkesi içeride tutar.
- Yerleşimler (`LOCATIONS`) `init()` içinde her fraksiyon için bir açı diliminde **rastgele yeniden dağıtılır** — dizideki x/y değerleri kullanılmaz.
- Yollar: tüm yerleşimleri bağlayan minimum spanning tree (`state.roads`).
- Nehirler (`RIVERS`) ve ormanlar (`FORESTS`) sabit koordinatlı.
- Savaş sisi: 9000×9000 offscreen canvas (`exploredCanvas`), oyuncu görüş yarıçapı kadar `destination-out` ile silinir. Görüş `Game.getVisibility()` = `500 + (int−10)×30 + (Gözcülük−1)×25`, **gece ×0.7**. Aynı keşif `Game.markExplored()` ile 90×90 ızgaraya da işlenir (kayıt için); `Game.repaintFog()` / `loadExplored()` tuvali ızgaradan üretir.
- Kamera: fare tekerleği zoom (0.4–3.0), kenardan fare ile pan, oyuncuya yumuşak takip.
- **Rota çizgisi**: kalın sarı kesik yerine akan ince kesikli çizgi (gölge + altın kat),
  hedefte nabız atan halka ve yön oku.
- Tıklama ile hareket: yerleşim → içeri gir, NPC → karşılaşma, boşluk → serbest hareket. WASD/ok tuşları kamerayı oyuncuya kilitler.
- **Grup ikonları** (Warband'daki gibi grubun neye benzediğini gösterir, `Game.drawPartyIcon`):
  atın varsa **atlı** silüeti (`drawRider`: at + eyer örtüsü + kalkık kılıç), yoksa mızraklı
  yaya (`drawFootman`: mızrak + kalkan + miğfer). Fraksiyon rengi eyer örtüsünde/kalkanda ve
  sancakta. Grup 10+ kişiyse arkada 1, 30+ kişiyse 2 figür daha çizilir — kalabalık uzaktan belli olur.
  Çapulcular her zaman yaya, soylular atlı; krala 👑, vezire 🎖️ eklenir.
  İkon boyutu ordunun büyüklüğünü de yansıtır (`Game.partyIconScale`: 5 kişiden sonra kişi başı
  +%0.7, tavan +%35).
- **Günün vakti** (`Game.getDayPart()`): gece mavi tonlama + yerleşimlerde ocak ışığı,
  şafak/gün batımı sıcak ton, gündüz tonlamasız. Saat `state.time.hour`'dan gelir.
- İsim etiketleri (`Game.mapLabel`) **zoom'dan bağımsız ekran boyutunda** çizilir ve
  üst üste binenler yukarı kaydırılır (`_labelRects` çakışma testi).

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
`50 + (idare−1)×3 + yemek çeşidi×5 − açlık 30 − ödenmeyen maaş 25 − kapasite aşımı×2`.
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
- **Her rozette künye** (`Game.updateTips`, `.tooltip-container`): rozetin üstüne gelince o
  değerin ne olduğu, neyden geldiği ve neyi etkilediği kalem kalem çıkar — takvim (akış hızı),
  hazine (günlük maaş/yemek gideri, `Game.upkeep()`), nam (hangi kapı kaç namda açılır),
  can (seviye + zırh payı), grup (kapasite dökümü + birlik dağılımı), moral (`Game.moraleTip`),
  seviye (XP, bekleyen puanlar). Takvim rozeti aynı zamanda tıklanabilir (zaman akışı).
- Karakter ekranındaki her yetenek satırı **şu anki etkisini sayıyla** yazar
  (ör. "Görüş 615 birim", "Esir kapasitesi 8", "Savaş ganimeti +%12").
- **Kenar menüsü**: ikon + ad + kısayol rozeti. Kısayollar `M/C/P/I/Q`, **Esc** her ekrandan
  haritaya döner, **Boşluk** haritada kamerayı oyuncuya geri kilitler (`Game.centerOnPlayer()`)
  — hepsi `Input.init` içinde, modal veya savaş açıkken çalışmaz.
  `showScreen()` tıklanan butonu `data-view` ile aktifler.
- **Harita künyesi** (`#map-hud`): bulunduğun arazi + hız etkisi, altında birlik dağılımı
  (🪖 piyade / 🏹 okçu / 🐎 süvari) ve **🎯 Beni Bul** düğmesi. `Game.updateMapHud()` doldurur.
  Künye `pointer-events:none` olduğu için düğmeye CSS'te `pointer-events:auto` verilmiştir.
- `Game.setHtml(id, html)` innerHTML'i sadece metin değiştiyse yazar — `updateTopBar` her
  karede çağrıldığı için gereksiz DOM yazımını önler.

### Karakter
- Nitelikler: **Güç** (yakın dövüş hasarı, turnuvada hedef süresi), **Çeviklik** (harita hızı +1.5, savaş hızı +0.5, turnuvada hedef boyutu), **Zeka** (görüş +30), **Karizma** (grup kapasitesi +2). Seviye başına 2 puan.
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
- Grup kapasitesi: `24 + (cha-10)*2 + (leadership-1)*3` (temel 50'den 24'e indi: ordu artık liderlikle büyür).

### Başlangıç dengesi
Başlangıç: **250 dinar**, grup kapasitesi 24, 1 kişilik grup. Erken oyunda her dinar bir karar;
ordu liderlik/karizma ile büyür. Düşük seviyeli düşmandan alınan ödül `Battle.rewardScale` ile kısılır.

### Paralı asker
Handa şehir başına 2 kalem, 3 günde bir tazelenen havuz (`state.mercPools`): hazır
seviye 10–15 asker (şehrin kendi fraksiyonunun ağacından), kişi başı `60 + seviye×12` dinar. Gönüllü grindine alternatif —
parayı doğrudan orduya çevirmenin tek yolu.

### Grup & asker
- **Fraksiyon asker ağaçları** (`TROOP_TREES`): her krallığın kendi köylü → dal → elit
  zinciri var. Tek kaynak tablodur; `TROOP_UPGRADES` ve `TROOP_TYPES` yüklemede ondan
  üretilir (satır formatı `[ad, tür, hp, hız, saldırı, savunma, ikon, terfi bedeli]`).

| Fraksiyon | Köylü | Dallar (orta → elit) | Karakter |
|---|---|---|---|
| Svadya | Svadya Köylüsü | Milis→Çavuş, Avcı→Keskin Nişancı, Süvari→Şövalye | dengeli, en güçlü ağır süvari |
| Rodok | Rodok Köylüsü | Mızraklı→Kalkanlı, Nişancı→Tatar Yaylısı | **süvarisi yok**, en yüksek savunma ve okçu hasarı |
| Veagir | Veagir Köylüsü | Piyade→Baltacı, Okçu→Nişancı, Atlı→Süvari | baltalı piyade, ölümcül okçu, vasat süvari |
| Nord | Nord Serfi | Savaşçı→Baltacı, Avcı→Nişancı | **atsız**, en güçlü piyade (Baltacı 80 hp / 24 atk) |
| Kergit | Kergit Çobanı | Atlı→Süvari, Atlı Okçu→Han Muhafızı | **hepsi atlı**, en hızlı (105–118), ince zırh |

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
Ticaret malları pazarda alınıp satılır (satış fiyatı ×0.7). Pazar çarpanı şehir girişinde rastgele 0.8–1.2.

### Yerleşimler
- **Şehir**: pazar, köle tüccarı, han (dinlenme + ozandan şiir öğrenme + **paralı asker** +
  **lonca ustası** + **yoldaş** kiralama), turnuva (varsa), lordlar salonu,
  şölen (varsa katıl; kendi krallığındaysa ver), gönüllü toplama
- **Kale**: lordlar salonu, şölen (varsa)
- Aktif göreve bağlı butonlar da burada çıkar (ör. tavuk kovalama).
- **Köy**: köy yaşlısı (duruma göre esprili diyalog), gönüllü toplama, erzak pazarı
- Düşman fraksiyon şehri/kalesi ise sadece **kuşatma** seçeneği çıkar.

### Soylular (`nobles.js`)
23 lord + 12 leydi. Her lordun haritada gezen kendi partisi var (`npc.lordId`); parti kendi
yerleşiminin etrafında dolaşır, böylece salonunda bulunabilir. `Nobles.isAt()` "evinde mi"
kontrolünü 420 birim yarıçapla yapar.

- **İlişki** `state.relations[lordId]` (−100..100). `Nobles.relLabel()` etiketler:
  Kan Davalı / Düşman / Kırgın / Kayıtsız / Hoşnut / Dost / Sadık Dost.
- **Mizaç** (`PERSONALITIES`): `martial`, `cunning`, `debauched`, `goodnatured`, `quarrelsome`.
  Selamlama replikleri, hangi hediyeyi sevdikleri, hangi görevi verdikleri ve drahoma çarpanı buna bağlı.
- **Diyalog** (`Nobles.talk`): hâl hatır sor (günde 1, +1/+2), görev iste, birinin yerini sor,
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

| Çete | Savaş birimleri | Karakter |
|---|---|---|
| Çapulcular | Çapulcu / Çapulcu Okçu / Atlı Çapulcu + Çapulcu Reisi | dengeli, en zayıf |
| Orman Haydutları | Haydut Okçusu (ağırlıklı) / Orman Haydudu + Haydut Başı | okçu ağırlıklı, hızlı |
| Dağ Eşkıyaları | Dağ Eşkıyası / Eşkıya Nişancısı / Atlı Eşkıya + Eşkıya Reisi | zırhlı ve sert, 20. günden sonra doğar |
| Kurt Sürüsü | Kurt / Yaşlı Kurt + Alfa Kurt | çok hızlı (104–112), `beast`: hücum ×1.6, esir düşmez, ganimeti az |
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
  - Taktik emirleri: **1** takip, **2** hücum, **3** mevzi koru.
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
- **Yenilgi**: tüm grup dağılır, paranın %60–90'ı gider, HP %30'a düşer, **esir düşülür**.
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
- Esirken oyuncu esir alanın konumuna kilitlenir, başka hiçbir şey yapılamaz.
- "Kaçış planı yap" toggle'ı kaçış şansını 0'dan 80'e kadar giderek yavaşlayan bir ivmeyle doldurur.
- "Kaçmaya çalış" günde bir kez; başarısızlıkta şans −60 ve plan sıfırlanır.
- Süre dolunca %40 bedava kaçış, aksi halde fidye modali (paranın %75–90'ı).

### Kuşatma & krallık kurma
Şehir/kale kuşatması normal savaş olarak oynanır (garnizon: şehir 30, kale 15).
Kazanılırsa yerleşim vassalı olunan fraksiyona geçer; bağımsızsan **kendi krallığını** kurarsın
(`FACTIONS.player_kingdom` runtime'da oluşturulur).

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

Tüm çizim `app.js` içinde, kütüphane yok. Ortak yaklaşım: **pahalı şeyi bir kez pişir,
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

Kalanlar:

1. `lord_portraits.jpg` yalnızca 9 erkek portre içeriyor; leydiler CSS ile üretilen
   baş harf madalyonu (`Nobles.portraitCss`) kullanıyor.
2. Krallıklar arası savaş/barış yok — fraksiyonlar birbiriyle hiç savaşmıyor.
3. `app.js` ~4300 satır. Büyümeye devam ederse savaş motoru `battle.js`'e ayrılmalı.
4. Asker birimlerinin hasar türü sabit: yakın dövüş `cut`, oklar `pierce`. Fraksiyon
   ağacındaki baltacı/mızraklı ayrımı henüz hasar türüne yansımıyor — yalnız oyuncunun
   silahı tür seçiyor.

## Kod tarzı

- Türkçe yorum ve arayüz metni, İngilizce değişken/fonksiyon isimleri.
- Arayüz `innerHTML` şablon dizeleriyle üretilir, inline `style` yaygın. Buton eylemleri
  `onclick="Game.xxx()"` ile globallere bağlanır — bu yüzden `Game`/`Battle`/`Nobles`/`Quests`/
  `Feast`/`Save` global kalmalı.
- Modal açmak: `Game.showModal(html, width?, bgImage?)`, kapatmak `Game.closeModal()`.
- Bildirim için `alert()` yeterli (modala yönlendirilmiş durumda).
