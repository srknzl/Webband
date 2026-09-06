# WebBand

Mount & Blade: Warband tarzı, tarayıcıda çalışan tek sayfalık RPG. Türkçe arayüz.
Build yok, bağımlılık yok — `index.html` doğrudan tarayıcıda açılır.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html` | Tüm ekranların DOM iskeleti (start, main-ui, map/settlement/character/party/inventory/battle view'ları, modal, esaret paneli) |
| `app.js` | Çekirdek — harita, zaman, yerleşim, savaş, turnuva, kayıt. Global objeler: `Input`, `Game`, `Battle`, `TournamentMinigame`, `Save` + `state` |
| `nobles.js` | `LORDS` (23), `LADIES` (12), `PERSONALITIES`, `LADY_TRAITS`, `COMPLIMENTS`, `POEMS` + `Nobles` ve `Feast` objeleri |
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
(`webband_save_v1`) JSON olarak yazar. **Keşfedilen harita (sis) kaydedilmez**, yüklemede sıfırlanır.

Global veri sabitleri: app.js'te `FACTIONS`, `LOCATIONS`, `RIVERS`, `FORESTS`, `ITEMS`,
`TROOP_UPGRADES`, `TROOP_TYPES`; nobles.js'te `LORDS`, `LADIES`, `PERSONALITIES`,
`LADY_TRAITS`, `COMPLIMENTS`, `POEMS`; quests.js'te `QUESTS`.

`window.alert` override edilmiştir → modal olarak gösterilir.

## Mevcut Özellikler

### Dünya haritası
- Prosedürel kıta sınırı: `getMapRadius()` açıya bağlı sinüs toplamı ile düzensiz kıyı üretir; `clampToMap()` herkesi içeride tutar.
- Yerleşimler (`LOCATIONS`) `init()` içinde her fraksiyon için bir açı diliminde **rastgele yeniden dağıtılır** — dizideki x/y değerleri kullanılmaz.
- Yollar: tüm yerleşimleri bağlayan minimum spanning tree (`state.roads`).
- Nehirler (`RIVERS`) ve ormanlar (`FORESTS`) sabit koordinatlı.
- Savaş sisi: 9000×9000 offscreen canvas (`exploredCanvas`), oyuncu görüş yarıçapı kadar `destination-out` ile silinir. Görüş = `500 + (int-10)*30`.
- Kamera: fare tekerleği zoom (0.4–3.0), kenardan fare ile pan, oyuncuya yumuşak takip.
- Tıklama ile hareket: yerleşim → içeri gir, NPC → karşılaşma, boşluk → serbest hareket. WASD/ok tuşları kamerayı oyuncuya kilitler.

### Zaman & günlük döngü (`advanceTime` / `dailyUpdate`)
Zaman **sadece** harita ekranında, modal kapalıyken ve oyuncu hareket ederken (veya esirken) akar (`dt * 2`).

Her gün:
- Asker maaşı (lvl 10–19: 2, lvl 20+: `level/2`, lvl 51: bedava)
- Yemek tüketimi — düşük kalite (tahıl/ekmek) ve yüksek kalite (et/peynir). Lvl 30+ askerler yüksek kalite alamazsa `debuff` yer (savaşta ×0.7).
- Oyuncu +5 HP
- Köy gönüllüleri yenilenir (köy max 5; şehirler 2 günde bir 4–8)
- Krallar/vezirler zamanla güçlenir (kral 90 günde lvl 20 / 110 asker, vezir lvl 10 / 50 asker)
- %25 ihtimalle rastgele şehirde turnuva açılır, açık turnuvalar %30 ihtimalle kapanır
- Çapulcu sayısı 5'in altına düşerse yenisi doğar
- `Nobles.dailyTick()` — konum işaretlerini eskitir, rakip taliplerin ilgisini artırır, evlilik geliri, düğün günü kontrolü
- `Feast.dailyTick()` — süresi dolan şöleni kapatır, planlanmış/kendiliğinden şöleni başlatır
- `Quests.dailyTick()` — görevlerin `day()` kancası ve süre kontrolü

### Karakter
- Nitelikler: **Güç** (yakın dövüş hasarı, turnuvada hedef süresi), **Çeviklik** (harita hızı +1.5, savaş hızı +0.5, turnuvada hedef boyutu), **Zeka** (görüş +30), **Karizma** (grup kapasitesi +2). Seviye başına 2 puan.
- Yetenekler (Bannerlord tarzı odak sistemi): `oneHanded`, `twoHanded`, `polearm`, `bow`, `riding`, `athletics`, `leadership`. Her seviyede 3 odak puanı; odak XP çarpanını `0.5 + focus` yapar (max 5 odak).
- Seviye atlama: `xpNext *= 1.5`, +10 max HP, tam iyileşme.
- Grup kapasitesi: `50 + (cha-10)*2 + (leadership-1)*3`.

### Grup & asker
- Askerler `TROOP_TYPES` ile tanımlı (hp/speed/attack/defense/type/icon). Türler: `infantry`, `archer`, `cavalry`.
- XP savaşta öldürme başına +1. XP dolunca ya otomatik seviye atlar ya da `TROOP_UPGRADES` varsa **terfiye hazır** olur — grup ekranından dinar ödeyerek sınıf seçilir (Acemi Asker → Milis/Avcı/Süvari → Çavuş/Keskin Nişancı/Şövalye).
- Tavan lvl 50. Boss'tan düşen **Savaş Tanrısı Nişanı** ile lvl 51 "Efsanevi" yapılır: maaş ve yemek istemez, +100 HP / +15 saldırı.

### Envanter & ekipman
Silah / zırh / at slotları. Zırh max HP'ye, silah saldırıya, at harita hızına (66 → 105) etki eder.
Ticaret malları pazarda alınıp satılır (satış fiyatı ×0.7). Pazar çarpanı şehir girişinde rastgele 0.8–1.2.

### Yerleşimler
- **Şehir**: pazar, han (dinlenme + ozandan şiir öğrenme), turnuva (varsa), lordlar salonu,
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
  Drahoma: `8000 + kale/şehir×400 − nam×20 − ilişki×60`, mevki çarpanı (kendi krallığın 0.6 /
  derebeyi 0.8 / bağımsız 1.0) ve mizaç çarpanı (cunning 1.3 … goodnatured 0.8), alt sınır 1500.
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

Kabul edilen görevler `state.player.quests`; **Görevler** sekmesi (`#quests-view`) listeler.
Reddedilen lord 7–15 gün yeni görev vermez (`state.questCooldown`).
Başarısızlık −10 ilişki. Bir lordda aynı anda tek görev olabilir.

### Karşılaşma & savaş
- Düşmanlık kuralları `isHostile()`: çapulcular 120 birim içinde her zaman saldırır, oyuncu 1.5× güçlüyse kaçar; ilk 14 gün id hash'ine göre kademeli agresifleşir. Soylular (`npc.lordId`) yalnızca düşman krallığın vassalıysan ya da ilişki ≤ −50 ise saldırır; aksi halde çarpışma **diyalog** açar.
- Karşılaşma modali: savaş / teslim ol. (İlk 14 günde çapulcular %25 ihtimalle "uzaklaş" seçeneği verir.)
- **Savaş**: 2D top-down canvas arena, prosedürel arazi (tepe / çukur / orman / nehir).
  - Arazi etkileri: ormanda okçu ×0.7 hasar & süvari ×0.6 hız, tepede okçu ×1.3 hasar, çukurda ×0.8 hız, nehirde ×0.7 hız.
  - Oyuncu: WASD hareket, sol tık/boşluk ile 60°'lik yay şeklinde kılıç savurma (300 ms, tek isabet).
  - Taktik emirleri: **1** takip, **2** hücum, **3** mevzi koru.
  - Okçu AI: 250 birim menzil, çok yaklaşırsa geri çekilir, %50 ihtimalle hedefin hızına göre öndeleme yapar.
  - Süvari HP'si yarıya inince attan düşer (piyadeye döner, hız −30).
  - Kan lekeleri, uçan hasar yazıları, iki taraflı öldürme logu, düşman komutanından rastgele hakaret repliği + ping animasyonu.
  - Teslim ol butonu her an açık.
- **Zafer**: dinar + 3 nam + XP, silah/binicilik/atletizm yeterlilik XP'si, ölü askerler gruptan silinir, NPC haritadan kaldırılır.
- **Yenilgi**: tüm grup dağılır, paranın %60–90'ı gider, HP %30'a düşer, **esir düşülür**.

### Esaret
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

## Bilinen eksikler / bozukluklar

Faz 0'da düzeltilenler (artık sorun değil): fidye butonları, turnuva softlock'u
(`battle-log` → `battle-log-left`), çift tanımlı `showLore`/`toggleEscapePlan`/`attemptEscape`,
Windows mutlak portre yolları, yeterlilik anahtarı uyuşmazlığı, `renderPartyScreen` kapasitesi,
kayıt/yükleme.

Kalanlar:

1. Sadece Svadya asker ağacı var (`TROOP_UPGRADES`); diğer fraksiyonların askerleri yok.
2. Kaydedilen oyunda **keşfedilen harita (sis) korunmaz** — yüklemede sis yeniden çöker.
3. Ekonomi dengesizliği: bir savaş ~80 dinar getirirken drahoma 1500–8000 dinar. Görev
   ödülleri (600–2500) bunu bir miktar kapatıyor ama savaş ganimeti hâlâ düşük.
4. `lord_portraits.jpg` yalnızca 9 erkek portre içeriyor; leydiler CSS ile üretilen
   baş harf madalyonu (`Nobles.portraitCss`) kullanıyor.
5. Krallıklar arası savaş/barış yok — fraksiyonlar birbiriyle hiç savaşmıyor.
6. `app.js` ~3100 satır. Büyümeye devam ederse savaş motoru `battle.js`'e ayrılmalı.

## Kod tarzı

- Türkçe yorum ve arayüz metni, İngilizce değişken/fonksiyon isimleri.
- Arayüz `innerHTML` şablon dizeleriyle üretilir, inline `style` yaygın. Buton eylemleri
  `onclick="Game.xxx()"` ile globallere bağlanır — bu yüzden `Game`/`Battle`/`Nobles`/`Quests`/
  `Feast`/`Save` global kalmalı.
- Modal açmak: `Game.showModal(html, width?, bgImage?)`, kapatmak `Game.closeModal()`.
- Bildirim için `alert()` yeterli (modala yönlendirilmiş durumda).
