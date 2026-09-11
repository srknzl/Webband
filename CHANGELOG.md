# Değişiklikler

Oyuncu diliyle, en yeniden eskiye. Sürüm numarası `app.js` içindeki `VERSION` sabitidir ve
başlangıç ekranının sağ alt köşesinde yazar.

## 0.77 — Nereye Gidiyorum (2026-09-11)

Görevler baştan aşağı okunur hâle geldi. Eskiden "lorda git" deyip seni salıyordu; artık
her görev **ne** istediğini, **nerede** olduğunu ve **kaç günlük yol** olduğunu söylüyor.

- **Her görev kartında hedef yazıyor.** Kabul etmeden önce teklif penceresinde de aynı
  kutu var: ne yapılacağı, hangi yerleşime gidileceği ve şu anki hızınla oraya kaç gün.
  Süre dolarsa ne olacağı da orada — artık sürprizle öğrenmiyorsun.
- **Hedef haritada da duruyor.** Görevin olan yerleşimin üstünde 📜 damgası, yakınlaştırınca
  görev adı. Kart ile harita aynı kaynaktan besleniyor, ayrışamazlar.
- **Görev metinleri yeniden yazıldı.** "Peynir al" değil, "**Reyvadin** pazarından peynir al
  — 0/15 birim (başka şehirde alınanı saymaz)". Sayacı, şartı ve püf noktası metnin içinde.
- **Üç yeni görev.** *Arena Şampiyonu* (turnuvayı kazan — Şike'nin tersi), *Zincir Pazarı*
  (4 esir teslim et), *Şafak Baskını* (düşman köyünü bas: iyi para, kötü nam). Sonuncusu
  krallığın savaşta değilse teklif bile edilmiyor.
- **Sisteki Nokta artık bölgeyi gösteriyor.** Sandığın yeri hâlâ sır, ama hangi şehrin
  çevresinde arayacağın haritada yazıyor.

## 0.76 — Tek Satır (2026-09-11)

- **Telefonda savaşta artık kendini görüyorsun.** Ölüm satırları, düşman komutanının
  nutku ve emir yazıları iki köşede yığılıp arenanın alt yarısını kaplıyordu; üstüne bir
  de emir fırsatı senin başının üstüne yazılıyordu. Hepsi güç çubuğunun altında, tam
  enine, **tek satıra** indi ve orada yalnız son mesaj duruyor. Masaüstünde hiçbir şey
  değişmedi — orada yer zaten vardı.

## 0.75 — Nefes Payı (2026-09-11)

Savaş hızlarının baştan aşağı dengelenmesi. Kısaca: kimse sonsuza dek hızlı değil, kimse
kaçamıyor, ve yavaşladığında **neden** yavaşladığını görüyorsun.

- **Hücumun artık soluğu var.** Hem sen hem düşman hızlanabilir, ama 2 saniye sürer;
  sonra 4 saniye soluklanma gelir ve o sırada normalden yavaşsın. Eskiden düşman piyadesi
  sana 220 birim yaklaştığı andan itibaren **sonsuza dek** hızlıydı — kaçmak diye bir
  seçenek yoktu. Şimdi hücum bir karar: ne zaman basacağını seçiyorsun. Kesik kesik basıp
  bedelinden kaçmak işe yaramaz; soluk ancak tam dinlenince dolar.

- **Blok artık düşmanı da yavaşlatıyor.** Kalkanını kaldırınca yavaşlamak sende hep vardı,
  düşmanda yoktu — kalkanlı Rodok'a kalkanla yaklaşmak bu yüzden hep kayıptı. Aynı ceza
  (×0.65) artık herkese işliyor; üstelik eskisi kadar sert değil, blokta yürüyebiliyorsun.

- **Düşük moral artık askerini yavaşlatmıyor.** Moral canı ve saldırıyı düşürüyordu — bu
  yazıyordu. Sessizce **hızı** da düşürüyordu: moralin bozukken adamların düşmanı
  yakalayamıyordu, hiçbir yerde yazmayan ikinci bir ceza. Kalktı.

- **Ormanda yavaşlayan artık gerçekten atlılar.** Kural "süvari sınıfı"na bakıyordu;
  kurtlar ve Kergit atlı okçuları kâğıt üzerinde süvari yazmadığı için ağaçların arasından
  tam hızla geçiyordu. Şimdi dört ayaklı olan herkes yavaşlıyor — kurtlar dahil. Ormana
  kaçmak kurt sürüsüne karşı **işe yarar** bir taktik oldu.

- **Arazi cezaları üst üste binmiyor.** Ormanın içindeki nehrin kıyısındaki çukurda
  hızın üçte birine düşüyordu; artık yalnızca en kötü ceza sayılıyor.

- **Yayan daha hızlısın.** Temel yaya hızı 50 → 56, Atletizm'in her seviyesi 1.5 yerine
  2 veriyor. Tavan en yavaş atın **altında** duruyor: iyi bir koşucu okçuyu kovalayabilir,
  ama hiçbir insan atı geçemez.

- **Atından düşen gerçekten yaya kalır.** Eskiden hızdan sadece 30 gidiyordu; devrilen bir
  şövalye hâlâ en gelişmiş yayadan hızlıydı. Artık hızının yarısından biraz fazlasını
  kaybediyor.

- **Yaya okçular sırtını dönüp kaçarken bu kadar sakat değil.** Geri çekilme cezası
  atlı okçuya kaldı; yaya okçu zaten yavaştı, ikinci cezayı hak etmiyordu.

- **Bazı yayalar hızlandı**: Svadya Çavuşu 65→70, Nord Baltacısı 66→74, Kergit Çobanı
  55→70 — çoban herkesin yemiydi.

- **Künyede iki yeni rozet**: 🌲 *Ağır Zemin* (arazi seni yavaşlatıyor) ve
  💨 *Soluklanıyor* (hücum soluğun bitti). Yavaşladığında sebebini görüyorsun.

## 0.74 — Aç Ordu (2026-09-11)

- **Her pencerenin köşesinde × var.** Esc ve dışarı tıklamak zaten kapatıyordu ama
  ekranda "buradan çıkılır" diyen bir işaret yoktu; gövdesine kendi düğmesini koymayan
  pencere çıkışsız görünüyordu. × uzun pencereyi kaydırınca da köşede duruyor.
  Karşılaşma penceresinde (savaş / teslim ol) çıkmıyor — orası zaten bir karar anı.

- **Atlı olmak artık iki kez saymıyor.** Haritada atlı/yaya farkı yayanın **1.5 katıyla**
  sınırlı. Eskiden iki ayrı çarpan üst üste biniyordu: fark tek başınayken 1.8, kalabalık
  orduda 2.4 katına kadar çıkıyordu — süvari toplamak her şeyi gölgede bırakıyordu.
  Atın hâlâ değerli, sadece ölçüsü belli.

- **Sayı sürgüleri parmakta artık kaçmıyor.** Gönüllü toplarken ya da paralı asker
  tutarken sürgüyü sağa çekmek "bazen" işe yaramıyordu: parmak biraz eğik kaydıysa
  tarayıcı hareketi sayfa kaydırması sanıp sürgüden çalıyordu. Sürgüde artık kaydırma
  yok, sürgü var — ve tutamak başparmağa göre büyüdü.

- **Pazarda kapatma tuşu var.** Mobilde iki sütun taşıyordu, çıkış için dışarı
  dokunmak gerekiyordu.

- **Askerler yarı yarıya az yiyor.** Eskiden kişi başı günde 1 birim erzak gidiyordu:
  20 kişilik bir ordu günde 21 birim (~84 dinar) yiyor, yani erzak faturası maaşın iki
  katına çıkıyordu. Artık asker günde yarım birim yer, oyuncu tam bir birim. 10 kişilik
  grupla 60 tahıl **5 gün değil 8 gün** yetiyor; seçkin asker (20+ seviye) yarım kat
  fazla, 30+ seviye ayrıca et/peynir ister — o kurallar aynı kaldı.

- **Kılıcına yön verebiliyorsun.** Parmakla oynarken savaşta iki çubuk var: **sol çubuk
  yürütür, sağ çubuk kılıcı yönlendirir.** Çektiğin yer nişanındır, parmağını kaldırınca
  savurur; sürüklemeden dokunmak son yöne vurur (yayın varsa aynı çubuk ok atar).
  Oyuncunun önündeki sarı yay kılıcın nereye gideceğini gösterir. Eskiden nişan hareket
  yönüne kilitliydi — yürüdüğün yere vuruyordun. Sağ çubuğa hiç dokunmazsan eski davranış
  aynen duruyor.

- **Savaşın öğreticisi var.** İlk savaşında meydan durur ve altı adımda anlatılır: nişan
  ve blok, iki çubuk, emir fırsatları, teslim olma, ve iki taktik ipucu (zırha karşı mızrak
  ve ok, blok yalnız önden korur). Bir kez çıkar; ⚙️ Ayarlar'daki **🗡️ Savaş Öğreticisi**
  düğmesiyle istediğinde tekrar açılır. Öğretici açıkken savaş duraklar — okurken adamın
  öldürülmez.

- **Oyuna başlarken zorluk ve hafif mod sorulur.** Karakter yaratma sihirbazı 7 adım oldu;
  son adım Kolay / Orta / Zor ve 📱 Hafif mod (Cihaza göre / Açık / Kapalı). Orta ve
  "Cihaza göre" seçili gelir, ikisi de sonradan ⚙️ Ayarlar'dan değiştirilebilir —
  aynı tablodan okuduğu için iki ayrı ayar yok. (Dil zaten ilk açılışta soruluyor.)

- **Oyunun ilk karesinde kucağında çete olmuyor.** Yeni bir çete artık oyuncudan en az
  1500 birim uzakta doğar. Eskiden dibinde bir çapulcu grubu doğabiliyor ve daha haritayı
  görmeden yakalanıp esir düşülüyordu.

- **Mobilde harita kendi kendine kaymıyor.** Fareyi ekranın kenarına dayayınca harita
  kayar (öyle olmalı), ama dokunmatikte imleç diye bir şey yok: son dokunuşun koordinatı
  kenara denk geldiyse harita durmadan kayıyordu. Kenar kaydırması artık yalnız farede —
  ve ⚙️ Ayarlar'daki **🖱️ Kenardan kaydırma** satırından (Cihaza göre / Açık / Kapalı) her
  iki yönde de zorlanabilir: masaüstünde rahatsız ediyorsa kapatılır, tablette isteniyorsa açılır.

- **Parmakla arayüzü zoomlamak kapatıldı.** İki parmakla bütün sayfayı büyütmek panel
  ölçülerini bozuyor ve geri döndürmenin yolu kalmıyordu. Haritanın kendi iki parmak
  zoom'u duruyor; kapanan şey sayfanın tamamının zoom'u (çift dokunuş zoom'u dahil).

## 0.73 — Kale Adı (2026-09-11)

- **Haritadaki kale adları artık çevriliyor.** İngilizcede "Tevarin Kalesi" yazan altı kale
  "Tevarin Castle", Endonezcede "Kastil Tevarin" oldu. Sözlükte karşılıkları zaten vardı;
  haritanın etiket çizimi, harita künyesinin başlığı ve yerleşim ekranının başlığı
  sözlüğe hiç uğramıyordu.

## 0.72 — Üç Kademe (2026-09-11)

- **Zorluk ayarı geldi** (⚙️ Ayarlar → ⚔️ Zorluk): Kolay / Orta / Zor. Kurt sürüsü fazla
  sert geldiyse artık tek düğmeyle yumuşuyor.
  - **Kolay**: aldığın hasar %40 az, verdiğin %25 fazla.
  - **Orta**: oyunun tasarlandığı denge — hiçbir sayı oynamıyor.
  - **Zor**: aldığın hasar %50 fazla, verdiğin %15 az.
- Ayar yalnız **hasar çarpanına** dokunur: ok menzili, hücum çarpanı, zırh matematiği,
  asker ağaçları ve ekonomi aynen kalır. Yakın dövüş de ok da aynı kapıdan geçtiği için
  kurt da lord ordusu da aynı kademeyi görür.
- "Askerlerini gönder" (otomatik çözüm) de kademeyi sayar: kolayda kaybın azalır,
  zorda artar.
- Seçim kayda yazılır, oyunun ortasında değiştirilebilir.

## 0.71 — Büyük Punto (2026-09-11)

- **Açıklama yazıları büyüdü.** Arayüzün her yerine serpilmiş 0.68–0.92rem'lik inline
  puntolar üç CSS değişkenine bağlandı (`--fs-xs` 0.82 / `--fs-sm` 0.92 / `--fs-md` 1rem):
  en küçük yazı 10.9 px'ten **13.1 px**'e çıktı, karakter yaratma ekranındaki seçenek
  açıklamaları 12.8 → **14.7 px** oldu. Artık tek satır değiştirerek hepsi büyüyor.
- **Başlangıç ekranı telefonda okunur hâle geldi**: alt başlık 16.8 → **20 px**,
  alttaki dört düğme 12 → **14.7 px** (yüksekliği 44 px), dil düğmeleri 10.6 → **12.8 px**.
- Haritadaki keşif noktalarının adı (Mağara, Terk Edilmiş Kamp…) İngilizce ve
  Endonezce oynarken de Türkçe kalıyordu; etiket ve künye artık çeviriden geçiyor.

## 0.70 — Uzaktan Görünmez (2026-09-11)

- **Uzaktaki kalenin içini göremiyorsun.** Haritanın öbür ucundaki şehrin garnizonu,
  refahı, sahibi ve bekleyen gönüllüsü künyede yazıyordu. Artık yerleşimin **yeri**
  bilinir, **durumu** bilinmez: hiç uğramadığın yer "durumunu bilmiyorsun" der,
  bir kez yaklaştığın yer *"4 gün önce: Garnizon ~30 asker"* diye **o günkü** hâlini
  hatırlatır, ancak 750 birim yaklaşınca bugünkü rakamı görürsün. Kapıdan girmek
  her şeyi tazeler.
- Yerleşim hâlâ haritada duruyor, adı ve bayrağı görünüyor, hedef seçilebiliyor —
  keşif bir engel değil, bilgi artık bedava değil.

## 0.69 — İlk Ders (2026-09-11)

- **Yeni oyuncuya arayüz bir kez anlatılıyor.** Karakterini kurup haritaya
  düşünce altı adımlık bir öğretici açılır: haritanın nasıl gezildiği, 🍞 erzak ve
  ⚔️ grup rozetlerinin ne söylediği, 🧭 künyedeki arazi ve ⏳ Bekle, alttaki ekran
  şeridi ve son adımda "ilk işin ne" — en yakın köye git, gönüllü topla, erzak al,
  bir çapulcu çetesi avla. Anlatılan parça ışık halkasıyla çerçevelenir, ekranın
  geri kalanı kararır.
- **Metin cihaza göre değişir.** Farede "tıkla · WASD ile gez · tekerlekle
  yakınlaş", parmakta "dokun · tek parmakla sürükle · iki parmakla yakınlaştır" ve
  "⋯ Daha düğmesinin arkasında". Üç dilde de yazılı.
- **Bir kez çıkar, atlanabilir.** Atla ya da son adımdaki Başla işareti koyar;
  kayıttan yüklenen oyunda hiç çıkmaz. Tekrar görmek istersen
  ⚙️ Ayarlar → **🎓 Öğretici**.

## 0.68 — Avuç İçi (2026-09-11)

- **Savaşta ekranın tamamı arena.** Telefonda sefer çubuğu ve alt menü şeridi savaş
  sırasında da duruyordu; geriye 370x345'lik bir tuval kalıyor, savaş kütüğü emir
  şeridinin üstüne biniyor ve ekran okunmayan bir yazı yığınına dönüyordu. Savaşta
  ikisi de gizlenir: tuval **370x345 → 390x602**, hiçbir arayüz parçası bir
  diğeriyle kesişmiyor.
- **Kumanda küçüldü.** Sanal çubuk 116 → 92, ⚔️/🛡️ düğmeleri 74 → 60 piksel —
  arenanın alt yarısını kaplamıyor, kendi karakterini görüyorsun.
- **Emir düğmelerinde klavye rakamı yok.** "1 Takip / 2 Hücum / 3 Mevzi" artık
  yalnız **Takip / Hücum / Mevzi**; parmakla oynayan için tuş numarası anlamsızdı.
  Aynı liste savaş kütüğünde ve tuvalde ikinci kez yazılmıyor.
- **Alt şeritte dört sekme + "⋯ Daha".** Sekiz düğmenin üçü ekran dışında kalıyordu
  ve kaydırılabildiğine dair bir işaret yoktu. Artık Harita / Karakter / Grup /
  Envanter görünür, Görevler, Kayıtlar, Ses ve Ayarlar "⋯ Daha" sayfasına iner.
- **Harita etiketleri ekrana göre.** Sabit 19 punto telefonda yazı duvarı
  üretiyordu; punto ekranla küçülür ve yer bulamayan etiket **hiç çizilmez**
  (üst üste binen iki ad ikisini de siler).
- **⏳ Bekle düğmesi çalışıyor.** Künyenin üstündeki düğme her platformda ölüydü —
  tıklama tuvale gidiyordu. Artık diğer künye düğmeleriyle aynı görünümde ve
  tıklanabilir.
- **Harita künyesi haritayı yemiyor**: 137 → 77 piksel, dört düğme tek satırda,
  metinleri yerinde.
- **Üst çubuk 123 → 73 piksel**; rozetlerin alt yazısı dar telefonda düşer, saat kalır.
- **Dokunma hedefleri en az 44x44** — karakter ekranındaki `+`, envanterdeki
  "Çıkar" ve savaş emir düğmeleri dahil.
- **Can/moral gibi rozetlere dokununca açıklaması açılıyor** (10 rozetin hepsi
  ölçüldü, künye ekranın dışına taşmıyor).

## 0.67 — Kare Kapısı (2026-09-11)

- **Telefonda oyun 3.8 kare/saniyede dönüyordu.** Sebep grafik değil, kare kapısının
  kendisiydi. Oyun ekranının tazeleme hızını "gördüğü en kısa kare aralığı" diye
  tahmin ediyordu; iOS sayfayı kaydırırken iki kareyi 2 ms arayla teslim edince bu
  tahmin **kalıcı olarak** 2 ms'e kilitleniyor ve oyun her 16 kareden 15'ini
  atıyordu. Tahmin artık son 31 karenin **ortancasıdır**: hem uzun takılmaya hem
  çift teslimata dayanıklı ve kendini toparlıyor. Ölçüldü: aynı senaryoda
  **3.79 → 29.94 fps**.
- **Sayfa kendi kendine kaymıyor.** Yükseklik `100vh` ile veriliyordu; iOS'ta bu
  değer araç çubukları gizliyken geçerli olan yüksekliktir, yani sayfa görünen
  alandan ~80 piksel uzun kalıyor ve telefon boyuna kayıp duruyordu.
- **Debug raporu doğru sayıyı yazıyor.** "Kare böleni" satırı hafif modda bile
  60 fps varsayıyordu: gerçek bölen 16 iken rapora 8 yazmış. Artık hedef fps,
  bölen ve **efektif fps** ayrı ayrı görünüyor.

## 0.66 — Hafif Mod (2026-09-10)

- **Telefonda oyun artık kasmıyor.** İki dakika sonra başlayan takılmanın sebebi
  haritanın her karede sıfırdan çizilmesiydi: ~157 dağ emojisi yeniden rasterize
  ediliyor, ~123 gradyan üretilip çöpe atılıyor, kıyı gölgesi bütün kıtayı piksel
  piksel bulanıklaştırıyordu. Hepsi bir kez pişirilip önbelleğe alındı — bu düzeltme
  **her modda** geçerli.
- **📱 Hafif mod** eklendi (⚙️ Ayarlar → *Cihaza göre / Açık / Kapalı*). Telefon ve
  tablette kendiliğinden açılır ve sana bir kez haber verir; beğenmezsen tek tıkla
  kapatırsın. Tek anahtar bütün oyunu kapsar:
  - **Harita:** deniz dalgası, toprak lekeleri ve ocak ışığı düşer, orman ağaçları
    seyrelir, dağ halkası aralanır.
  - **Savaş:** zemin dokusu sadeleşir, kan/ceset/kıvılcım tavanları düşer, su
    parıltısı ve toz bulutu kalkar.
  - **Ekranlar:** karakter/grup/envanter/görev zeminleri çizilmez, cam panellerin
    bulanıklığı kalkar.
  - Hedef kare hızı 60 yerine **30 fps** — telefonda bütçeyi yarıya indirmek çizimi
    kısmaktan daha çok işe yarar, ısınmayı da yavaşlatır.

## 0.65 — Üç Dil (2026-09-10)

- **Oyun üç dilde oynanıyor: Türkçe, İngilizce ve Endonezce.** İlk açılışta bayraklı bir
  seçici çıkar (🇹🇷 🇬🇧 🇮🇩), tarayıcının dili işaretli gelir; seçim hatırlanır ve
  ⚙️ Ayarlar'dan istediğin an değiştirilir — oyunu baştan başlatmana gerek yok.
- Çeviri **tam**: menüler, künyeler, pazar, han, salon, diyaloglar, görevler, günlük
  olaylar, savaş kütüğü, ayarlar ve debug raporu dahil ekrana düşen her metin çevrildi.
  1721 cümle, iki dil.
- Sayı ve yüzde yazımı da dile uyuyor: Türkçede `%50`, İngilizce ve Endonezcede `50%`.
- *Not:* diplomasi ekranındaki haber akışı, haberin **yazıldığı** dilde kalır — dili
  ortada değiştirirsen eski satırlar eski diliyle durur, yenileri yeni dille gelir.

## 0.64 — Avuç İçi (2026-09-10)

- **Oyun artık telefonda oynanıyor.** Haritayı tek parmakla kaydırıyor, iki parmakla
  yakınlaştırıyorsun; kısa dokunuş hedef koyar, basılı tutmak künyeyi açar.
- Savaşta sol altta **sanal çubuk**, sağ altta **⚔️ savur** ve **🛡️ blok** düğmeleri var;
  emirler (takip / hücum / mevzi) çubuğun üstünde tek sıra hâlinde duruyor. Savaş künyesi
  ekranın üstüne taşındı, yani parmaklar arenayı kapatmıyor.
- Kenar menüsü dar ekranda alta açılan bir şerit oluyor, sefer çubuğunun rozetleri sarıyor,
  pazar iki sütun yerine alt alta diziliyor ve modaller ekranın enini kullanıyor.
- Bütün dokunma hedefleri en az 44 piksel. İpuçları da cihazı tanıyor: parmakla oynayana
  artık "WASD" değil "çubukla hareket" yazıyor.

## 0.63 — Terazi (2026-09-10)

- Oyunun dengesi artık **ölçülüyor**: `tools/` altındaki dört araç oyunun kendi kodunu
  Node'da koşturup dünya simülasyonu, 1v1 asker dengesi, para eğrisi ve kare hızı
  kapısı için sayı üretiyor. Raporlar `docs/olcum/` altına tarihiyle düşüyor.
- Ölçüm ilk meyvesini verdi: **ticaret tek başına bir orduyu beslemiyor**. Kese
  büyütmek de işe yaramıyor — darboğaz para değil, pazarın stoğu. Ticaretin ölçeği
  keseyle değil rota sayısıyla büyür.
- Yüksek tazeleme hızlı ekranlardaki kare atlama kapısı artık her sürümde otomatik
  sınanıyor: 144 Hz'te 72, 240 Hz'te 60 fps — ve iki döngü aynı karede asla farklı
  cevap almıyor (eski siyah ekran hatasının regresyon testi).

## 0.62 — Parşömen ve Cephanelik (2026-09-09)

- **Menü ekranları da bir yere benziyor**: karakter ekranının arkasında çapraz kılıçlar,
  kalkan ve miğfer rafı olan bir cephanelik duvarı; grup ekranında gece kampı — çadırlar,
  ocak ateşi, mızrak demeti; envanterde raflar, sandıklar ve çuvallar; görevler ekranı
  ise yanık kenarlı, mühürlü bir parşömen.
- Zemin dekoratiftir, yazıyla yarışmaz: her ekranın perdesi kendi çizimine göre ayarlandı.
  Parşömen açık renk olduğu için görev ekranındaki soluk yazı sıcak ve açık bir tona çekildi.

## 0.61 — Şehrin Kapısı (2026-09-09)

- **Yerleşimler artık düğme listesi değil, bir manzara**: şehre, kaleye ya da köye girince
  üstte o yerin resmi çıkar — sur, kapı, çarşı tezgâhı, arena çemberi, kulübeler, ocak ateşi.
  Binaların üstündeki tabelalar hangi kapı olduğunu söyler.
- **Binalara tıklanır**: fareyi üstüne getirince bina altın ışıkla parlar ve adı yazar;
  tıklayınca aşağıdaki düğmenin yaptığı şey olur. Düğmeler duruyor, sahne onların ikizi.
- **Sahne günün vaktini bilir**: öğlen mavi gök, akşam kızıl ufuk, gece yıldızlar ve ay.
  Her yerleşimin kendi silueti var — Praven'in çatıları Suno'nunkine benzemiyor.
- **Hana ve lordlar salonuna girince arka plan da değişiyor**: han ocağı ve fıçıları,
  salonun taş duvarı, sancakları ve tahtı pencerenin ardında durur.

## 0.60 — Lordun Dili (2026-09-09)

- **Her lordun bir de huyu var**: kibirli, korkak, zalim, neşeli, paragöz, onurlu, dalkavuk.
  Diyalog başlığında yazar ve ağzından çıkanı belirler.
- **Aynı lord sen güçlendikçe başka konuşur**: kapıda tersleyen adam, ordunla geldiğinde
  yer gösterip yağcılık yapmaya başlar.
- 119 yeni replik: selam, sohbet, tersleme, görev teklifi, hakarete cevap. Aynı replik
  kısa aralıkla bir daha çıkmaz.
- **Maiyet araya giriyor**: kâhya, silahtar ya da yaşlı çavuş bir laf atıyor, lord cevap veriyor.
- Replikler **kademeli yazılıyor**; tıklayınca anında tamamlanır (hareket azaltma açıksa hiç beklemez).

## 0.59 — Yol Kenarındakiler (2026-09-09)

- **Arazide keşfedilecek yerler var**: harabe, terk edilmiş çiftlik, gözetleme kulesi,
  mağara ve terk edilmiş kamp. Üstüne git, gir, ne çıkacağını gör.
- İçeriden **para, ekipman, erzak, yola katılan bir asker** çıkabilir — ya da **pusu**,
  çürük döşeme, hiçbir şey. Kuleye tırmanınca uzaktaki bir grubu görüp haritana işaretlersin.
- Harabe bir kez soyulur ve haritadan silinir; çiftlik, kule, mağara ve kamp zamanla
  yeniden dolar.

## 0.58 — Kurallı Kıta (2026-09-09)

- **Yerleşimler artık üst üste binmiyor**: her şehir/kale/köy çifti için bir asgari aralık var,
  kaleler krallığın sınırına, şehirler yurdun göbeğine düşüyor.
- **Her köyün bir merkezi var** — bağlı olduğu şehir/kale belli, 420–900 birim uzağında.
  Şehri fethettiğinde hangi köylerin seninle geldiği artık tesadüf değil.
- Dünya kurulurken kendini denetliyor: kıta dışına taşan, komşusuna yapışan ya da yola
  bağlanmayan yerleşim varsa harita baştan üretiliyor.

## 0.57 — Doğal Yollar (2026-09-09)

- **Yollar artık dümdüz değil**: dönemeçli geçiyor, ormanın içinden değil kenarından dolaşıyor.
- **Üç yol türü**: taş yol (×1.18), toprak yol (×1.10), keçi yolu (×1.04). Şehre giden yol taş,
  köye giden patika. Yoldan gitmek Warband'daki gibi bir tercih.
- **Köprüler**: yol nehri kestiği yerde köprü var — nehir geçidinin yarı hız cezası orada yok.
- Yollar birbirine kavuşuyor: her bağlantı bir yerleşimden çıkmıyor, kavşaklar oluşuyor.

## 0.55 — Denetim Turu (2026-09-09)

- **Kayıtlar yenilendi**: 3 elle slot + her oyun gününün başında dönen 5 otomatik kayıt.
  Kayıtları dışa aktarıp panoya kopyalayabilir, başka bir kaydı yapıştırıp açabilirsin.
  Bozuk kayıt artık oyunu açılmaz yapmıyor — kenara alınıyor, oyun açılıyor.
- **Ayarlar ekranı** (⚙️): ses ve ses seviyesi, hareket azaltma, kan/ceset, kare atlama
  kapısı, yazı boyutu, otomatik kayıt, tuş listesi.
- **Hata rozeti**: bir şey patlarsa köşede "⚠️ N hata" çıkar, tıklayınca debug raporu açılır.
  Oyun döngüsü artık tek bir hatayla ölmüyor.
- **Sürüm damgası** başlangıç ekranında ve debug raporunda.
- Nam kapıları (leydi 80, şölen 150, evlilik 120) artık **ulaşılan en yüksek nam**a bakıyor —
  tek bir yenilgi bütün kapıları kapatmıyor.
- Savaş öncesi "kolay av" uyarısı, garnizon ekranında günlük net, grup ekranında aç askerin
  işareti, Savaş Tanrısı haritası için 300 nam kapısı.
- Kervan ve kafilelerin yükü artık muhafız sayısıyla ölçülüyor: en zayıfını seçmek en az kâr.
- Düşman halkası kesikli çizilir — takım ayrımı yalnız renge bağlı değil.

## 0.54 (2026-09-09)

- Denetim kapanışı: boş tuval koruması, savaş döngüsü nabzı, harita etiketleri.
- Otomatik savaş çözümü, karşılaşmada kaçma, dalga hâlinde takviye.
- Oyun içi debug raporu.

## 0.50 (2026-09-09)

- Grup ekranı: sıralama, asker çıkarma, sınıf etiketleri, esir dökümü.
- Yağma bir eyleme dönüştü: 15 saniye, yetişen lord, yağmacı damgası.
- Düşman şehrinin kapısı kapandı, düşman lord üstüne geliyor.
- Pazarda sınırlı stok ve arz eğrisi; erzak fiyatları beşte bire indi.
- İşlem geri bildirimi: parlama, uçan yazı, ses.

## 0.40 (2026-09-08)

- Gerçek kuşatma (kamp, hazırlık, sur), turnuvada bahis ve şehir arenası.
- Vassallar, mareşal ve sefer çağrısı, ittifaklar.
- Asker hasar türleri, haydutların kervan avı, leydi portreleri.
