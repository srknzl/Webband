# Plan: Soylu İlişkileri, Flört/Evlilik ve Görev Sistemi

Amaç: şu an sadece "saldır" olan soylu etkileşimini, konuşulabilen–ilişki
kurulabilen–görev veren–kız isteyebileceğin bir sisteme çevirmek.

Bu plan **Warband'in orijinal sistemleri araştırılarak** yazıldı, ama görevler
bilerek Warband'inkilerin kopyası değil — WebBand'in kendi mekaniklerini
(savaş sisi, esaret/kaçış planı, turnuva minigame'i, yemek tüketimi, terfi ağacı,
pazar çarpanı) sömüren özgün görevler tasarlandı. Warband'den alınan tek şey
**iskelet**: ilişki puanı, kişilik tipleri, görev veren rolleri, flört→babadan
isteme→drahoma→düğün akışı.

---

## Araştırma özeti — Warband'de ne var?

Kaynak: Warband module system (`module_quests.py`), StrategyWiki, M&B Wiki, topluluk rehberleri.

**İlişki (relation):** Her lord ile −100…+100 arası ayrı puan. Savaşta yardım,
fieflerini haydutlardan kurtarma, görev tamamlama (+10) yükseltir; saldırmak,
görevi başarısız etmek, diyalogda kırmak düşürür. 30+ = "dost". Ayrıca her
şehir/köy ile ayrı bir "standing" puanı var; yüksekse daha çok ve daha iyi
gönüllü verir.

**Kişilik tipleri:** Martial (%25), Quarrelsome, Pitiless, Cunning, Debauched/Sadistic,
Good-natured, Upstanding. Kimi neyle memnun olacağını, hangi görevi vereceğini,
fief dağıtımına nasıl tepki vereceğini belirler.

**Görev verenler:** Lord, kral/mareşal, köy yaşlısı, lonca başkanı (guild master),
leydi. Vanilla'daki lord görevleri: mesaj götür, vergi topla, kaçağı avla, asker
topla, leydi eskortu, tüccarı öldür, kaçak serfleri geri getir, casusu takip et,
esir lord getir, borç tahsil et, yoldaşını ödünç ver. Lonca: kervan eskortu,
sığır sürüsü taşı, şarap teslim et, haydut ini yok et, kaçırılan kızı fidyeyle
kurtar. Köy yaşlısı: buğday getir, sığır getir, köylüleri eğit, haydutları temizle.
Leydi: esir lordu kurtar, rakibi düelloya çağır, ziyaret et.

**Flört/evlilik akışı:** Şölen ve turnuvalarda aristokrasiye karış → meyhanede
ozanlardan şiir öğren (max 5) → leydiyle tanış, ziyaret et, şiir oku →
turnuva zaferini ona ithaf et (ilk seferde +8'e kadar ilişki) → yeterli ilişkide
babasından/vasisinden izin iste → drahoma (~20.000 dinar) → şölende nikâh.
Rakip talipler var, düelloyla saf dışı bırakılabiliyor.

**Şölen (feast):** Şehri olan soylular düzenler, 200+ nam ile girilir. Lordlar tek
yerde toplandığı için ilişki kurmanın ve görev toplamanın en verimli yeri.

---

## Faz 0 — Önce bunları düzelt (zorunlu)

Görev ve flört sistemi bunların üstüne kurulacak, kırık kalırsa çalışmaz:

1. **Turnuva softlock'u** (`app.js:2921, 2994`) — `battle-log` yok, `start()` orada
   patlıyor; tık dinleyicisi bağlanmıyor, döngü başlamıyor. Oyuncu boş ekranda
   kalıyor. Flörtün ana mekaniği "turnuva zaferini ithaf et" olacağı için
   **birinci öncelik**. → `battle-log-left` kullan.
2. `Game.payRansom()` / `Game.refuseRansom()` tanımlı değil (`app.js:894-895`) →
   fidye modali ölü buton. Esaret görevleri buna dayanacak.
3. `LORDS[].portrait` mutlak Windows yolu → portreler yüklenmiyor. Yerel
   `lord_portraits.jpg` sprite sheet'e çevir (`portraitIndex` → `background-position`).
4. Mükerrer tanımlar: `showLore` (481 / 1599), `toggleEscapePlan` + `attemptEscape`
   (1031 / 1962). İkincileri sil.
5. `renderPartyScreen()` sabit `partyCapacity` yerine `getPartyCapacity()` kullansın.
6. `state.player.proficiencies` anahtarlarını karakter ekranındakilerle eşitle.
7. **Kayıt/yükleme (localStorage).** Görevlerin gün sayacı olacak; oyuncunun
   sekmeyi yenileyince 20 günlük görevi kaybetmesi kabul edilemez.
   `JSON.stringify(state)` + tek "Kaydet/Yükle" butonu yeter.

---

## Faz 1 — Soylular canlansın

### 1.1 Veri modeli

`LORDS` genişletilir (fraksiyon başına 4-5, toplam ~22):

```js
{ id, name, faction, personality, homeLocId, portraitIndex, lore,
  gender: 'm', title: 'Lord' }
```

Yeni `LADIES` dizisi (fraksiyon başına 2-3, toplam ~12):

```js
{ id, name, faction, guardianId, homeLocId, portraitIndex,
  trait: 'romantic' | 'ambitious' | 'pious' | 'wild',
  lore }
```

`trait` hangi flört hamlesinin ne kadar işe yaradığını belirler (tablo 3.2).

Kişilik tipleri (Warband'den, 5 tane yeter):
`martial`, `cunning`, `debauched`, `goodnatured`, `quarrelsome`.

### 1.2 State

```js
state.relations   = {}   // lordId  -> -100..100
state.affection   = {}   // ladyId  -> 0..100
state.villageRel  = {}   // locId   -> -100..100
state.player.quests = []
state.player.poems  = []   // meyhaneden öğrenilen şiirler
state.knownLocations = {}  // 'lord_x' -> {x, y, day, accuracy}
```

### 1.3 Soylular haritada yaşar

`spawnNPCs()` her lord için `type:'lord'` bir parti üretir (`lordId` alanıyla).
Boyut = 20 + level×2. `isHostile()` zaten lord tipini tanıyor; sadece
**düşman değilse savaş yerine diyalog** açılacak (`triggerEncounter` içinde dallanma).

Bir soylunun "evde" sayılması: partisi kendi `homeLocId`'sine 300 birimden yakınsa
o yerleşimin salonunda görünür. Şölen sırasında herkes zorla şölen şehrindedir.

### 1.4 Lordlar Salonu yeniden yazılır

Şu anki iki butonluk ekran gider. Yerine:

- O yerleşimde **o an bulunan** soyluların portre ızgarası (lordlar + leydiler).
- Leydiler ayrı bir bölümde: **"Salonun Konukları"** — girmek için nam eşiği var
  (aşağıda 3.1).
- Portreye tıkla → diyalog modali.

### 1.5 Diyalog menüsü (`Game.talkToNoble(nobleId)`)

Tek bir `showDialog(node)` yardımcısı (~25 satır) yeter, ağaç DSL'i yazma.

| Seçenek | Etki |
|---|---|
| **Hâl hatır sor** | Günde 1 kez, +1 ilişki. Replik kişiliğe + mevcut ilişkiye göre değişir (mevcut `getHumorousDialog` genişletilir) |
| **Görev var mı?** | Faz 2 — görev tablosundan teklif |
| **"… nerede?"** (birinin yerini sor) | Faz 1.6 |
| **Hediye ver** | Envanterden eşya → ilişki. Kişilik neyi sevdiğini belirler |
| **Kızınızla tanışmak isterim** | Faz 3 — sadece vasi olan lordlarda |
| **Krala yemin et** | Mevcut `swearFealty`, buraya taşınır (sadece kral/vezir) |
| **Hakaret et** | −15 ilişki, +2 nam, o fraksiyonun rakiplerinde +5 ilişki |
| **Ayrıl** | — |

Hediye tablosu (kişiliğe göre çarpan):

| Kişilik | Sever | İlişki |
|---|---|---|
| martial | Kılıç, Savaş Baltası, Savaş Atı | +8 |
| cunning | Demir, Tuz (ticaret malı) | +6 |
| debauched | Kadife, Bira, Peynir | +10 |
| goodnatured | Ekmek, Tahıl (halkına dağıtır) | +7 |
| quarrelsome | hiçbiri gerçekten memnun etmez | +3 (her şey) |

Yanlış hediye: +1. Hediye günde 1 kez.

### 1.6 "Birinin yerini sor" — özgün mekanik

Kullanıcının istediği özellik, ve WebBand'in savaş sisi sistemine tam oturuyor.

- Herhangi bir soyluya "X nerede?" diye sor.
- Cevap doğruluğu **sorulan kişiyle ilişkine** ve X'in aynı krallıkta olup
  olmamasına bağlı:

| Sorulan kişiyle ilişki | Sonuç |
|---|---|
| < 0 | Yalan söyler — haritada **yanlış** işaret (gerçek konumdan 800-1500 birim uzakta) |
| 0-19 | "Bilmiyorum, kuzeye gitmişti" — sadece yön |
| 20-49 | Haritada 600 birimlik belirsizlik çemberi |
| 50+ | 200 birimlik çember + hedef 3 gün boyunca sis altında bile görünür |

- Başka fraksiyondan birini sorarsan doğruluk bir kademe düşer.
- İşaret `state.knownLocations`'a yazılır, 3 gün sonra silinir.
- Haritada kesikli altın çember + isim etiketi olarak çizilir (`renderMap` içinde).

Bu tek özellik "kimse nerede bilinmiyor" problemini çözer ve görevleri
oynanabilir kılar (görev hedefi lord olduğunda onu bulman gerekecek).

---

## Faz 2 — Görev sistemi

### 2.1 Motor (küçük tut)

```js
const QUESTS = {
  butter_blockade: {
    title: 'Tereyağı Ablukası',
    givers: ['lord'],                 // kim verebilir
    weight: 3,                        // seçilme ağırlığı
    personality: ['debauched','cunning'],  // hangi kişilik verir (boşsa hepsi)
    minRelation: 0,
    offer(giver)  { /* metin + hedef üret, quest objesi döndür */ },
    tick(q)       { /* günlük: süre kontrolü */ },
    check(q, ev)  { /* olay bazlı ilerleme */ },
    reward(q)     { /* para/nam/ilişki */ }
  }, ...
};
```

- `state.player.quests` aktif görevler.
- `dailyUpdate()` içinde her göreve `tick` çağrılır (süre dolarsa `fail`).
- Olaylar (`Game.emit('battle_won', npc)`, `'entered_location'`, `'bought_item'`,
  `'tournament_end'`, `'became_prisoner'`) `check`'e düşer.
- Yeni ekran: sidebar'a **"Görevler"** butonu + `#quest-view`.
- Aynı soylu görev verdikten sonra 7-15 gün yeni görev vermez.

### 2.2 Görevler (özgün — Warband kopyası değil)

**Lord görevleri**

1. **Tereyağı Ablukası** *(pazar + fiyat mekaniği)*
   Rakibinin şöleni bozulsun diye 3 şehirden toplam 15 peynir/et satın al ve getir.
   Twist: her alımda o şehrin pazar çarpanı %8 artar — hepsini tek şehirden almak
   pahalıya patlar, gezmen gerekir. Süre 12 gün.
   Ödül: 1200 dinar, +12 ilişki. Boşalttığın şehirlerde 10 gün boyunca fiyatlar +%25.
   *(Harlaus'un tereyağı lore'una gönderme.)*

2. **Sisteki Nokta** *(savaş sisi mekaniği — tamamen özgün)*
   "Dedem oraya bir sancak gömdü. Nehrin en keskin döndüğü yerin batısında,
   ormanın kıyısında." Haritada gizli bir nokta üretilir; **görüş çemberinle
   üzerinden geçmen** gerekir. İşaret yok, sadece metin ipucu; yaklaştıkça
   "Sıcak/Soğuk" bildirimi (500 / 1200 birim eşikleri).
   Ödül: 800 dinar, +20 nam, +15 ilişki. Süre yok.

3. **Çavuşluk Sınavı** *(terfi ağacı mekaniği)*
   "Bana 5 tane gerçek Svadya Çavuşu getir, acemi değil." Askerleri terfi
   ettirmen ve teslim etmen gerekir — asker gider.
   Ödül: 2000 dinar + Savaş Atı + 15 ilişki. Süre 25 gün.

4. **Aç Ordu** *(yemek tüketimi mekaniği)*
   Kuşatmadaki ordusuna 20 birim erzak götür, 8 gün içinde. Ama **yolda kendi
   grubun da o erzaktan yiyor** — fazladan almadan yetiştiremezsin.
   Ödül: 900 dinar, +15 ilişki, o fraksiyonun köylerinde gönüllü +2.

5. **Zincirdeki Kardeş** *(esaret mekaniği — iki farklı çözüm)*
   Kardeşi bir çapulcu grubunda esir. Haritada isimli bir çapulcu partisi doğar.
   - **Yol A:** partiyi savaşta yen.
   - **Yol B:** o partiye **bilerek teslim ol**, esaretteyken "Kaçış Planı"nı
     ikinizin için doldur ve kaç. (Kaçış şansı %20 daha yavaş dolar.)
   Yol B daha çok ilişki verir (+25 vs +15) ve +30 nam.
   Kaybedersen görev başarısız, −10 ilişki.

6. **Şike** *(turnuva mekaniği — ters kazanma koşulu)*
   Lord senin aleyhine bahis oynadı. Turnuvada **kaybetmeni ama rezil olmamanı**
   istiyor: skorun 5 ile 8 arasında bitmeli. 12 yaparsan görev batar, 4'ün altında
   yaparsan "çok bariz" der ve yine batar.
   Ödül: 1500 dinar, +10 ilişki, **−15 nam**. Aynı fraksiyondaki `upstanding`
   karakterli lordlarda −10 ilişki (duyulur).

7. **Yalan Haber** *(1.6 mekaniğinin tersine kullanımı)*
   "Şu üç lorda benim doğuda olduğumu söyle." Üç lordla konuşup yalan yay.
   Görev bitince o üç lord 5 gün boyunca sana **yanlış konum** verir (güvenleri
   sarsılır) ve her birinde −5 ilişki.
   Ödül: 1000 dinar, +20 ilişki (veren lordla).

**Köy yaşlısı görevleri**

8. **Deli Hüsnü'nün Tavukları** *(mizah + kısa görev)*
   Köyde 3 gün içinde 5 tavuk yakala — turnuva minigame'inin küçük bir varyantı
   (küçük, hızlı hedefler, 15 saniye).
   Ödül: 150 dinar, +8 köy ilişkisi, köy gönüllü havuzu +3.

9. **Hasat Nöbeti** *(NPC spawn + bekleme)*
   Hasat gecesi köyde kal; 2 gün içinde 2 dalga çapulcu saldırısı gelir.
   Ödül: 400 dinar, +15 köy ilişkisi (o köyün gönüllüleri artık "Milis" seviyesinde başlar).

**Leydi görevleri** (flörtün parçası, bkz. 3.2)

10. **Kayıp Mektup** — nişanlısı olduğunu iddia eden birinden aldığı mektubu
    geri getirmesini ister; mektup rakip talibin partisindedir.
11. **Bir Şiir Getir** — belirli bir şehrin meyhanesindeki ozandan şiir öğren
    ve ona oku.

---

## Faz 3 — Flört ve Evlilik (basit olmayacak)

Şu anki hali: 100 nam → buton → evlisin. Tamamen değişecek.

### 3.1 Salona kabul — nam eşiği

Leydilerin bulunduğu salon bölümüne girebilmek için **nam ≥ 80**.
Altındaysan kapıda çevrilirsin ("Kim bu üstü başı toz içindeki adam?").
Şölene giriş: **nam ≥ 150**.

### 3.2 Flört puanı (`affection`, 0-100)

Ayrı iki sayaç var ve **ikisi de gerekiyor**:
- `affection[ladyId]` — kızın sana ilgisi
- `relations[guardianId]` — babasının/ağabeyinin sana güveni

Flört hamleleri (her biri kendi bekleme süresiyle):

| Hamle | Etki | Kısıt |
|---|---|---|
| **Ziyaret et ve sohbet et** | +3 | 3 günde 1; aynı repliği tekrarlarsan +1'e düşer |
| **İltifat et** | +5 / **−8** | Trait'e uygunsa artı, değilse eksi. Deneme yanılma, ipucu lore metninde |
| **Şiir oku** | +12 | Her şiir her leydiye 1 kez. Şiirler meyhanede ozandan 200 dinara öğrenilir (max 5) |
| **Turnuva zaferini ona ithaf et** | +18 | Turnuvayı kazandığın şehirde olmalı; leydi başına 1 kez |
| **Kişisel görevini bitir** | +25 | Görev 10/11 |
| **Rakibi düelloda yen** | +15 | Bkz. 3.4 |
| **Hediye (mücevher/kadife)** | +6 | 5 günde 1 |

Trait ↔ iltifat eşleşmesi:

| Trait | Hoşuna giden | Nefret ettiği |
|---|---|---|
| `romantic` | Güzelliğinden, gözlerinden bahsetmek | Askerî başarı anlatmak |
| `ambitious` | Fetihlerinden, namından bahsetmek | Şiir, çiçek |
| `pious` | Onurdan, adaletten bahsetmek | Ganimet, para |
| `wild` | Ata binmekten, avdan bahsetmek | Saray adabı |

### 3.3 Babadan isteme — pazarlık

`affection ≥ 60` olunca "Babandan seni istemek istiyorum" seçeneği açılır.
Vasiyle konuştuğunda **üç şeye bakar** ve her birinin ayrı eşiği vardır:

1. **Nam** — en az 120. Altındaysa: *"Adını duyan yok. Kızımı bir hiçe vermem."*
2. **İlişki** — en az 25. Altındaysa: *"Seni tanımıyorum bile."*
3. **Servet ve mevki** — drahoma ister.

**Drahoma hesabı** (pazarlık edilebilir):

```
temel = 8000
+ (leydinin fraksiyonu güçlüyse) şehir sayısı × 400
− nam × 20
− ilişki × 60
× (vassal isen 0.8, bağımsızsan 1.0, kendi krallığın varsa 0.6)
× kişilik çarpanı (cunning 1.3, debauched 1.2, martial 1.0, goodnatured 0.8)
```

Tipik aralık 3.000–12.000 dinar. Ekranda **kalem kalem gösterilir** ("Namın
sayesinde −2400 dinar") — oyuncu neyi iyileştirirse ucuzlayacağını görsün.

Pazarlık seçenekleri:
- **Kabul et ve öde** → nişan.
- **Pazarlık et** (Liderlik yeteneğine bağlı, %40 + lvl×5 şans): başarılıysa
  −%20, başarısızsa −5 ilişki ve o gün tekrar denenemez.
- **"Param yok ama kılıcım var"** → babası bir görev verir (Faz 2 listesinden,
  ödülü drahomadan düşülür). Namı 200'ün üstünde olanlara açık.
- **Kaçırma (elopement)** → drahoma yok, ama: babasıyla −60 ilişki, o fraksiyonun
  tüm lordlarıyla −20, o krallıkla savaş riski, −30 nam. Hızlı ve pahalı olmayan
  ama sonuçları ağır yol.

### 3.4 Rakip talip

Her leydinin %60 ihtimalle bir rakip talibi olur (aynı fraksiyondan bir lord).
Rakibin `affection`'ı **her gün +1.5** artar. 100'e ilk ulaşan kazanır —
yani flörtü sürüncemede bırakamazsın.

Rakiple başa çıkma:
- **Düelloya çağır** — `Battle.start` ile 1v1 (iki tarafın da partisi 0, rakip
  boss benzeri stat bloğu). Kazanırsan rakip çekilir (+15 affection, +10 nam);
  kaybedersen esir düşmezsin ama −20 affection ve 5 gün yatakta (zaman atlar).
- **İtibarını lekele** — Faz 2'deki "Yalan Haber" mekaniği; rakibin affection'ı
  20 düşer, ama yakalanırsan (%30) o fraksiyonda −25 ilişki.
- **Görmezden gel** — hızlı ol, yetiş.

### 3.5 Düğün

Nişandan sonra düğün **şölende** yapılır (Faz 4). Şölen yoksa vasi 5-10 gün
içinde bir tane düzenler.

Evliliğin etkileri (mevcut "eş gruba katılır"ın ötesinde):
- +15 idare hakkı (`rightToRule`)
- Eşinin ailesindeki tüm lordlarla +20 ilişki tabanı
- Günlük +50 dinar (drahoma toprakları)
- Eş grupta bir "yoldaş" birim (lvl 10, ölmez — savaşta düşerse yaralanır, 3 gün pasif)
- Eşin fraksiyonuna karşı savaşa girersen ilişkiler ve gelir yarıya düşer

---

## Faz 4 — Şölen

Görevlerin ve flörtün "soyluyu bulamıyorum" problemini kökten çözen sistem.

- Her 10-20 günde bir rastgele bir şehirde şölen açılır, 4 gün sürer.
- Şölen boyunca o fraksiyonun **tüm lord ve leydileri o şehirde** garanti bulunur.
- Girmek için nam ≥ 150.
- Şölende: herkesle tek tek konuş (+2 ilişki, şölen başına 1 kez), görev teklifleri
  yenilenir, turnuva ithafı yapılır, düğün burada olur.
- Oyuncunun kendi şehri varsa **kendi şölenini** düzenleyebilir (3000 dinar +
  30 birim yüksek kalite yemek) → gelen her soyluyla +5 ilişki.

---

## Uygulama sırası ve tahmini büyüklük

| Adım | İçerik | Tahmini |
|---|---|---|
| 0 | Faz 0 hataları + localStorage kayıt | ~150 satır |
| 1 | LORDS/LADIES verisi, relation state, haritada lord partileri | ~200 satır veri + 80 kod |
| 2 | `showDialog` + diyalog menüsü + hediye + hakaret | ~180 satır |
| 3 | "Birinin yerini sor" + haritada işaret çizimi | ~100 satır |
| 4 | Görev motoru + Görevler ekranı | ~150 satır |
| 5 | 11 görev | ~400 satır |
| 6 | Flört (affection, iltifat, şiir, ithaf) | ~250 satır |
| 7 | Drahoma pazarlığı + rakip talip + düello | ~200 satır |
| 8 | Şölen | ~120 satır |

Toplam ~1800 satır — app.js ~4800 satıra çıkar. **Bu noktada app.js bölünmeli:**
`data.js` (sabitler), `nobles.js`, `quests.js`, `battle.js`, `game.js`.
`<script>` etiketleriyle sırayla yüklenir, build sistemi gerekmez.

## Karar bekleyen noktalar

1. **Kadın karakter oynanabilir mi?** Warband'de kadın oyuncu farklı bir yol izler
   (kendi ailesi seni evlendirmeye çalışır). Şimdilik erkek varsayıp sonra
   eklemeyi öneriyorum.
2. **Drahoma aralığı** 3.000–12.000 doğru mu? Şu anki ekonomide savaş başına
   ~80 dinar kazanılıyor, turnuva 500. Bu rakam ~40-60 savaş demek — muhtemelen
   ekonomiyi de biraz şişirmek gerekecek (ticaret kârını artır, görev ödülleri zaten yüksek).
3. **Faz 0'daki localStorage kaydı** şart mı? Görevlerin gün sayacı olduğu için
   bence şart, ama istersen görevleri süresiz yapıp kaydı erteleyebiliriz.
