# Değişiklikler

Oyuncu diliyle, en yeniden eskiye. Sürüm numarası `app.js` içindeki `VERSION` sabitidir ve
başlangıç ekranının sağ alt köşesinde yazar.

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
