# WebBand

Mount & Blade: Warband tarzı, tarayıcıda çalışan tek sayfalık RPG. Türkçe arayüz.
Build yok, bağımlılık yok — `index.html` doğrudan tarayıcıda açılır.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html` | Tüm ekranların DOM iskeleti (start, main-ui, map/settlement/character/party/inventory/battle view'ları, modal, esaret paneli) |
| `app.js` | Oyunun tamamı — ~3000 satır, 4 global obje: `Input`, `Game`, `Battle`, `TournamentMinigame` + `state` |
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

Tüm veri tek bir `state` objesinde. **Kayıt/yükleme yok** — sayfa yenilenince oyun sıfırlanır.

Global veri sabitleri (app.js başı): `FACTIONS`, `LORDS`, `LOCATIONS`, `RIVERS`, `FORESTS`,
`ITEMS`, `TROOP_UPGRADES`, `TROOP_TYPES`.

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
- **Şehir**: pazar, han (10 dinar — tam iyileşme), turnuva (varsa), lordlar salonu, gönüllü toplama
- **Kale**: lordlar salonu
- **Köy**: köy yaşlısı (duruma göre esprili diyalog), gönüllü toplama, erzak pazarı
- Düşman fraksiyon şehri/kalesi ise sadece **kuşatma** seçeneği çıkar.

### Soylular (mevcut hali — çok sığ)
`openLordsHall()` yalnızca iki buton sunar:
- **Krala yemin et** (50 nam) → `vassalOf` atanır, +5 idare hakkı
- **Soylularla görüş ve evlen** (100 nam) → rastgele leydi ismi seçilir, gruba katılır

`LORDS` dizisi (8 lord, portre + lore metni) **sadece açılış ekranındaki lore modalinde** kullanılır;
haritada NPC olarak yaşamaz, konuşulamaz, görev vermez.

### Karşılaşma & savaş
- Düşmanlık kuralları `isHostile()`: çapulcular 120 birim içinde her zaman saldırır, oyuncu 1.5× güçlüyse kaçar; ilk 14 gün id hash'ine göre kademeli agresifleşir. Lordlar sadece oyuncu düşman fraksiyonun vassalı ise saldırır.
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
`TournamentMinigame` — 25 saniyede 12 hedefe tıklama. Hedef boyutu çevikliğe, ekranda kalma
süresi güce bağlı. Kazanınca +500 dinar, +20 nam.

### Boss
`boss_map` eşyası (pazardan 5000 dinar) kullanılınca **Savaş Tanrısı** savaşı açılır.
En fazla 4 kez girilebilir, her girişte boss seviyesi +5. Kazanınca lvl 51 nişanı düşer.

## Bilinen eksikler / bozukluklar

Yeni özellik eklerken bunlara dikkat:

1. `Game.payRansom()` ve `Game.refuseRansom()` **tanımlı değil** — `dailyUpdate()` içindeki fidye modalinin butonları çalışmaz (app.js:894-895).
2. **SOFTLOCK:** `TournamentMinigame` `getElementById('battle-log')` kullanıyor ama DOM'da `battle-log-left`/`battle-log-right` var. `start()` bu satırda patlar (app.js:2921) — tık dinleyicisi bağlanmadan ve döngü başlamadan. Sonuç: oyuncu boş yeşil savaş ekranında kalır, tek çıkış `Battle.surrender()` (grubu siler). Turnuva sistemi tamamen oynanamaz durumda. Tarayıcıda doğrulandı.
3. `showLore()` iki kez tanımlı (app.js:481 ve 1599) — ikincisi geçerli. `toggleEscapePlan`/`attemptEscape` de iki kez (app.js:1031/1962).
4. `LORDS[].portrait` mutlak Windows yollarına işaret ediyor (`C:/Users/Administrator/...`) — portreler yüklenmiyor. Yerel `lord_portraits.jpg` sprite sheet kullanılmalı.
5. `state.player.proficiencies` başlangıcında tanımlı anahtarlar (`horse`, `foot`, `crossbow`, `blunt`, `javelin`, `lance`) karakter ekranındakilerle (`riding`, `athletics`, `polearm`, `leadership`) uyuşmuyor; ekran eksik olanları lazily oluşturuyor.
6. `renderPartyScreen()` sabit `state.player.partyCapacity` gösteriyor, gerçek limit `getPartyCapacity()`.
7. Kayıt/yükleme yok.
8. Sadece Svadya asker ağacı var (`TROOP_UPGRADES`); diğer fraksiyonların askerleri yok.

## Kod tarzı

- Türkçe yorum ve arayüz metni, İngilizce değişken/fonksiyon isimleri.
- Arayüz `innerHTML` şablon dizeleriyle üretilir, inline `style` yaygın. Buton eylemleri
  `onclick="Game.xxx()"` ile globallere bağlanır — bu yüzden `Game`/`Battle` global kalmalı.
- Modal açmak: `Game.showModal(html, width?, bgImage?)`, kapatmak `Game.closeModal()`.
- Bildirim için `alert()` yeterli (modala yönlendirilmiş durumda).
