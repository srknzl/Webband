# Değişiklikler

Oyuncu diliyle, en yeniden eskiye. Sürüm numarası `app.js` içindeki `VERSION` sabitidir ve
başlangıç ekranının sağ alt köşesinde yazar.

## 1.25.0 — Kılık (2026-09-18)

- **Karakterinin görünümü artık kuşandığın silaha göre değişiyor** (kılıç/balta/mızrak/yay,
  atlıyken de).
- **Asker ikonları artık daha çeşitli**: her birlik türünün kendi rütbe ikonu savaşta görünüyor,
  eşkıyalar da güçlerine göre farklı görünüyor.

## 1.24.0 — Tezgah (2026-09-18)

- **Pazarda kategori sekmeleri eklendi**: Tümü/Silah/Zırh/At/Mal/Yiyecek/Özel. Hem alım hem
  satım listesi aynı kategoriye göre filtreleniyor. Mobilde de test edildi.

## 1.23.0 — Eyer (2026-09-18)

- **Atlı savaşta çok hızlıydın.** Atlı hareket hızı savaşta ~%20 azaltıldı — hâlâ yayadan
  belirgin şekilde hızlısın, sadece o kadar ezici değil.
- **Canın az olsa bile ata binebilmelisin.** Şimdi ata binince, azami canının %33'ü kadar
  ekstra bir "tampon" kazanıyorsun — yaralı girsen bile bu tampon tam ekleniyor. Tampon
  bitince (canın normal azami canına dönünce) attan düşüyorsun; at ölme ihtimali (yüzde 10)
  hâlâ var ama artık bu anda değerlendiriliyor.

## 1.22.0 — Savaş İlanı (2026-09-17)

- **Herhangi bir krallığa savaş ilan edebilirsin.** Diplomasi ekranında (K) her krallığın yanında
  bir "⚔️ Savaş İlan Et" butonu var — barış teklifi yok henüz, sadece tek taraflı ilan.
- **Savaştan haritaya dönünce bazen zoom sonuna kadar açık kalıyordu.** Savaş başlarken bitmemiş
  bir pinch-zoom hareketi haritanın kamerasını yanlış değere kilitliyordu; düzeltildi.
- **Demirci Dev zırhı kalkan ikonuyla görünüyordu**, artık doğru zırh ikonu var.
- **At nal sesi tek bir "bip" gibiydi**, artık iki tonlu bir "tak-tak" sesi.
- **Asker erzak tüketimi %25 daha da azaldı** (0.75× — bu, önceki bir indirimin üstüne).
- **"⚑ Fırsat" satırı İngilizce'de "Opening" diye çevrilmişti**, komut vermediğin halde emir
  verilmiş gibi okunuyordu — "Available" (mevcut) olarak düzeltildi.
- **At özellikleri (hız/zırh bonusu) envanterde ve pazarda görünmüyordu**, artık silah/zırh gibi
  gösteriliyor.
- **Pazarda ekipman ve atlarda 5x/Tümü satın alma seçenekleri kaldırıldı** (yiyecek/mal hâlâ var).
- **8 yeni at türünün İngilizce/Endonezce çevirileri eksikti**, eklendi.
- **Savaş sırasında (arena dâhil) kenar menüsüne tıklayınca ekran kararıyordu.** Menü, savaş
  bitmeden tıklanabilir kalıyordu; artık savaştayken tamamen gizli.

## 1.21.13 — Nal Sesi (2026-09-17)

- **Savaş kamerası çok yakındı**, özellikle dar telefon ekranında. Yakınlaştırma 3'ten 2.3'e
  çekildi, etrafı görmek daha kolay.
- **Atlı hareket dümdüz "uçuyordu."** Atın (ve tüm atlı birimlerin) yürüyüş sıçraması artık hıza
  göre değişiyor — dörtnala kalkınca adım daha hızlı, daha belirgin sallanıyor; sabit bir tempoda
  kaymıyor. Oyuncunun kendi atı için her adımda kısa bir nal sesi de eklendi (ses dosyası yok,
  diğer efektler gibi anlık üretiliyor — ses kapalıyken o da susuyor).

## 1.21.12 — Ustalık (2026-09-17)

- **Başarımlar artık ödül veriyor.** Şimdiye kadar sadece bir bildirimdi; artık her başarım
  tek seferlik ödül veriyor — bronz 200₺, gümüş 650₺, altın 2000₺ + 20 nam. Altın başarımların
  adı, karakter ekranında görünen ufak bir unvan rozetine dönüşüyor (savaşı etkilemez, tamamen
  gösteriş).
- **Her silaha 3 yeni kalite kademesi eklendi (toplam 4).** Kılıç, Savaş Baltası, Topuz, Mızrak
  ve Yay'ın artık çelik/usta/kraliyet gibi daha güçlü ve daha pahalı versiyonları var — fiyat
  güçten daha hızlı artıyor (atlardaki gibi azalan getiri). Kurt Dişi Hançeri ve Fırtına Yayı da
  bu yeni kademelerin üstünde kalacak şekilde güçlendirildi.

## 1.21.11 — Tip Kimlik (2026-09-17)

- **Kral/lord ordularının askerleri gün geçtikçe ve sen güçlendikçe güçleniyordu.** Bu ölçekleme
  kaldırıldı (`Game.threatLevel()` de onunla birlikte) — artık hiçbir düşman asker (çapulcu, boss
  muhafızı, lord askeri) takvime ya da senin gücüne göre güçlenmiyor. Gücü tamamen asker tipi
  (`TROOP_TREES`) belirliyor, tıpkı çapulcularda zaten olduğu gibi.

## 1.21.10 — Muhafız (2026-09-17)

- **Boss muhafızları abartılı güçlüydü.** Muhafızların gücü hangi boss olduğuna göre ölçekleniyordu
  — Kurt Ana gibi en erişilebilir (60 nam) bossun muhafızları bile oyundaki en iyi askerden
  (Nord Baltacısı: 80/24/13) daha güçlüydü (140 can/30 saldırı). Artık muhafızlar hangi boss
  olursa olsun sabit bir "seçkin" seviyesinde (90/22/12); asıl zorluk artışı bossun kendisinde ve
  final dövüşte muhafız sayısında.
- **Her boss dövüşü ekranda "Savaş Tanrısı" yazıyordu.** Kurt Ana, Bozkır Hanı, Demirci Dev ve
  Korsan Kral'a karşı savaşırken bile birim adı hep "Savaş Tanrısı" görünüyordu; artık dövüştüğün
  bossun kendi adı yazıyor.

## 1.21.9 — Kum Meydanı (2026-09-17)

- **Savaşta dost/düşman öldürünce hepsinde "Dost Asker" yazıyordu.** Oyuncu ve grup askerlerinin
  savaş birimine tip adı hiç yazılmıyordu; artık öldürülen/öldüren oyuncuysa kendi adın, asker ise
  askerin tipi (ör. "Svadya Milisi") görünüyor.
- **Mobilde savaş çubukları (sol/sağ joystick) küçük geliyordu.** 92/60 px'ten 116/74 px'e
  büyütüldü.
- **Bozgun teklifi ("Düşman kaçıyor" + Bırak Gitsinler) Teslim Ol'un yanında ekran dışına
  taşıyordu.** Savaş şeridi artık gerektiğinde ikinci satıra sarıyor.
- **Mobilde Tam Ekran düğmesinin bir anlamı yok.** Dokunmatik cihazda hem şeritten hem "⋯ Daha"
  menüsünden kaldırıldı.
- **Envanterde çanta eşyaları mobilde tek tek alt alta diziliyordu.** Kuşanılan bölüm üste
  taşındı, çanta artık gerçek bir grid — yan yana sığdığı kadar eşya.
- **Arena ve turnuva dövüşleri açık arazi zeminiyle açılıyordu.** İkisi de artık kendi yuvarlak
  kum meydanında geçiyor: ahşap çit, etrafta seyirci kalabalığı — ve sınırı görsel değil, gerçek:
  aynı daire hem zemini çiziyor hem de kimsenin dışarı taşmasını engelliyor.
- **Mobilde savaş sırasında sağ üstteki küçük harita bazen kayboluyordu.** Telefonun adres
  çubuğu gizlenince/klavye açılınca tetiklenen `resize` olayı, savaş tuvalini komuta şeridinin
  yüksekliğini hiç düşmeden yeniden boyutlandırıyordu — tuval göründüğünden uzun oluyor, üstüne
  çizilen her şey (küçük harita dahil) artık görünmeyen bir köşeye kayıyordu. İki hesaplama artık
  aynı sayıyı kullanıyor.

## 1.21.8 — Kapı Eşiği (2026-09-17)

- **Haritadan bir şehre/kaleye/köye yürüyünce mobilde ekranın üstü göstergelerin, altı ise alt
  menünün arkasında kalıyordu.** `enterLocation` haritadan gelirken ekran geçişini kendi başına
  yapıyor, `showScreen`'in üstlendiği `body.view-map` temizliğini atlıyordu — bu yüzden
  yerleşim ekranı haritanın "kayan göstergeler" düzenini miras alıyor, üst çubuk şehir adının,
  alt menü de son düğmenin (ör. "Ayrıl") üstüne biniyordu. `enterLocation` artık her ekran gibi
  `showScreen('settlement')` üzerinden açılıyor.
- **Handa çıkış düğmesi yoktu.** Uzun han ekranında köşedeki küçük × dışında bir çıkış yolu
  gösterilmiyordu; şimdi listenin en altında "🚪 Handan Çık" düğmesi var.

## 1.21.7 — Eyer (2026-09-17)

- **8 farklı at eklendi.** Köylü Beygiri'nden (500 dinar) Demir Zırhlı Cenk Atı'na (4550 dinar)
  kadar her atın kendi hız/zırh dengesi var — ucuzu hızlı ama zırhsız, pahalısı yavaş ama sağlam.
  Fiyat arttıkça getiri azalıyor; boss ödülü Han Kısrağı hâlâ satılıklardan üstün.
- **At artık savaşta ölebilir.** Attan her düşüşte %10 ihtimalle at kalıcı olarak ölüyor ve
  envanterden siliniyor; savaş bitince özet ekranında bildiriliyor. Sadece oyuncunun bindiği
  at için geçerli — ordudaki atlı askerlerin atları ölmüyor.
- **Savaş Tanrısı Nişanı ve bir askeri 51. seviyeye çıkarma mekaniği kaldırıldı.** Bosslar artık
  sadece kendine özgü eşya ve relic bırakıyor; "Efsanevi" asker etiketi ve ona bağlı tüm kodlar
  silindi.

## 1.21.6 — Parmak İzi (2026-09-17)

- **Şehir ekranında mobilde en aşağı kadar kaydırılamıyordu.** Bina resmi (`#scene-canvas`)
  kendi kaydırma/yakınlaştırma kodu olmadığı halde tarayıcının dokunma jestini yutan bir
  kuraldan pay alıyordu; üstünden başlayan bir parmak kaydırması hiçbir yere gitmiyordu.
  Artık sadece haritanın ve savaş ekranının kendi pan/pinch kodu olan tuvalleri bu kuralı
  taşıyor, şehir resmi normal kaydırmaya açık.

## 1.21.5 — Ulak (2026-09-17)

- **Soylulara "birinin yerini sor" gibi bazı diyalog cevapları hiç görünmeden kayboluyordu.**
  `alert()` bu oyunda bloklamıyor; hemen ardından ekranı değiştiren kod (diyaloğa dönmek,
  başka bir pencere açmak) mesajı tarayıcı hiç çizmeden eziyordu. Artık mesaj "Tamam"a
  basılana kadar ekranda kalıyor, devamı ancak ondan sonra açılıyor.
- **Görev teklifi ekranında "Reddet" butonunun metni mobilde kenardan taşıyordu.** Dokunma
  hedefi büyütmesi (#86) buton satırının otomatik daralma sınırını devre dışı bırakmıştı;
  satır artık gerektiğinde alt satıra kayıyor, metin kırpılmıyor.

## 1.21.4 — Çentik (2026-09-17)

- **Haritadayken üst çubuk çentikli iPhone'larda göstergelerin arkasına düşüyordu.** #40'taki
  "harita odaklı düzen" üst çubuğu ekranın üstüne sabitlerken çentik boşluğunu unutmuştu —
  düzeltildi, üst çubuk artık haritada da çentiğin altında kalıyor.

## 1.21.3 — Tempo (2026-09-17)

- **Yeni hız düğmesi sadece takvimi hızlandırıyordu, karakterin haritadaki yürüyüşünü değil** —
  görünürde hiçbir şey değişmiyordu. Artık ×2 seçince gerçekten daha hızlı yürüyorsun, ×0.5
  seçince daha yavaş; kaçış planı ilerlemesi de aynı hıza uyuyor.

## 1.21.2 — Saatin İbresi (2026-09-17)

- **Haritadaki "1x/2x" düğmesi zamanı hızlandırıyordu, yakınlaştırmıyordu — kafa karıştırıyordu.**
  O düğme artık gerçekten söylediğini yapıyor: zaman akış hızını (0.5x/1x/2x) gösterip değiştiriyor.
  Harita yakınlaştırma fare tekerleği/iki parmakla elde kalıyor; Z tuşu da artık hız değiştiriyor.

## 1.21.1 — Sağlam Zemin (2026-09-17)

- **Mobilde köşe paneli künyeyi ezmiyor.** Kuşatma, yağma, kamp veya esaret paneli açıkken
  alt-soldaki arazi/birlik künyesi artık üstünde kalmıyor; altındaki Diplomasi düğmesi ve
  hız göstergesi tekrar erişilebilir.
- **Karakter oluşturma ve Lordlar Salonu artık klavye ve ekran okuyucuyla tam kullanılabilir.**
  Sancak seçimi ve soylu kartları gerçek düğmeye çevrildi; hiçbiri isimsiz veya ulaşılamaz kalmıyor.
- **Savaştaki çift çubuk kontrolleri İngilizce ve Endonezcede eksik kalmıştı**, düzeltildi.

## 1.21.0 — Yolların Kıyısı (2026-09-17)

- **Savaş dengesi elden geçti.** Mızraklılar süvariye, kalkanlılar ağır süvariye karşı hak ettiği
  üstünlüğü kazandı; zırh artık hiçbir vuruşu tamamen sıfırlamıyor (en az %18 hasar geçer),
  kalkan tutan birimler süvari şarjını daha sert karşılıyor. Aynı seviyedeki birimler ölçülü
  dövüşüyor, seviye atlayınca fark hissediliyor.
- **Karşılaşma öncesi denge tahmini.** Bir orduyla karşılaşınca "Kolay / Dengeli / Zorlu / Çetin"
  etiketi düşman gücüne göre gösteriliyor.
- **Kurt sürüleri artık gerçekten sürü gibi.** Sıçrayışlarla koşuyor, yaralı/kanı akan avın kokusunu
  uzaktan alıp yöneliyor, temizlenmiş yollardan uzak duruyor.
- **Yolda tek başına dolaşan biri artık soruyor.** Otomatik katılmıyor; kabul mü red mi, sen karar
  veriyorsun.
- **Güçlü asker daha çok yer.** Seviye yükseldikçe iaşe artıyor (en güçlüde 3 kata kadar); seçkin
  birimler ayrıca et istiyor.
- **Atlı birime terfi için ahırında at gerekiyor.** Terfi bir at tüketiyor.
- **Harita 2x yakınlaştırma** (Z tuşu veya haritadaki düğme). Kenara dayanınca "hedefi bırak?" sorusu.
- **Yayaların arasında yürüyüş yavaşlıyor.** Dibinde biriken yaya kalabalığı hızı düşürüyor (taban %50).
- **Dolu olayı yeniden tasarlandı** — üç anlamlı seçenek, daha az rastgele ceza.
- **Tımarlarım penceresi tek başlığa indi**, uzun modallarda içerik kayması düzeldi.

## 1.20.0 — Dünya Nefes Alıyor (2026-09-17)

- **Mareşal seferleri seyrekleşti.** Lordlar artık her fırsatta sefere çıkıp birbirini bozguna
  uğratmıyor; sefer sıklığı ve bekleme süresi ayarlandı, kuşatmalar biraz kısaldı. Dünya daha
  durağan: lordlar topraklarını daha uzun tutuyor (200 günde fetih 4–10, sefer 22–31).
- **Artık her eşya pazarda satılabiliyor.** Sadece ticaret malları değil; silah, zırh, at, yiyecek
  ne aldıysan geri satabilirsin. Yalnızca boss ödülleri ve Savaş Tanrısı Nişanı gibi kazanılan
  eşyalar satılmaz.
- **Çarpışan lorda destek (#32).** Yakınında bir lord haydutlarla ya da düşman bir lordla kapışıyorsa
  yanına varıp destek verebilirsin — adamları düşmanı çoktan hırpalamış olur, karşına daha az kişi
  çıkar; kazanırsan o lord ve krallığı sana minnettar kalır.

## 1.19.0 — Harita Odaklı Arayüz (2026-09-17)

- **Harita artık tüm ekranı kaplıyor (#40).** Üst çubuk ve kenar menüsü haritadan yer çalmıyor;
  ikisi de haritanın üstünde yarı saydam cam paneller olarak yüzüyor, üzerlerine gelince tam
  opak oluyor. Kenar menüsü dikey bir ikon şeridine indi, haritanın ortası her zaman açık.
- **Mobilde de harita tam ekran.** Telefonda menü alt kenara yatay şerit olarak iniyor, üst
  çubuk üstte tek satır kalıyor — arada kalan her piksel harita.
- **Uygulama-içi tam ekran düğmesi (⛶).** F11'in olmadığı telefonlarda da tek dokunuşla tam
  ekrana geçilir; düğme, tam ekran durumuna göre simge değiştirir.

## 1.18.0 — Bosslar ve Nişanlar (2026-09-17)

- **Dört benzersiz boss haritada beliriyor (#38).** Namın yükseldikçe Kurt Ana, Bozkır Hanı,
  Demirci Dev ve Korsan Kral sırayla haritaya çıkıyor — kocaman ikonuyla, çevresinde muhafızlarıyla.
  Her biri tek sefer yenilir; üstüne gidince ödülü önceden gösteren bir tanıtım açılıyor.
- **Her bossun benzersiz bir ganimeti var.** Kurt Dişi Hançer, Han Kısrağı, Dev Örsü Zırhı ve
  Fırtına Yayı — satılmayan, güçlü ama oyunu bozmayan eşyalar. Yanında bir de kalıcı nişan düşüyor.
- **Nişanlar (relic) kalıcı efekt taşıyor (#37).** Kurt Kanı harita hızını, Bozkır Tuğu moral,
  Demir Yürek canı, Fırtına Tılsımı ganimeti, Tüccar Mink ticaret payını artırıyor. Her çeşitten
  bir tane; esarette kaybolmaz. Tüccar Mink hancıdan satın alınır, gerisi bosslardan gelir.
- **Bossların bossu — oyunun sonu.** Dört nişanı toplayıp yeterli nama ulaşınca boss haritası
  Savaş Tanrısı'nı açıyor; onu devirmek oyunu bitiriyor ve zafer ekranı geliyor.
- **Her eşyaya açıklama eklendi.** Envanterde eşyanın ne işe yaradığı artık yazıyor.

## 1.17.0 — Mekân Sahneleri (2026-09-17)

- **Köy, kale ve şehir artık birbirinden ayrılıyor (#100).** Her yerleşim türü kendi taş
  paletiyle çiziliyor — köy sıcak toprak, kale soğuk çelik grisi, şehir kiremit-kum sarısı —
  şehre kubbe ve minare silüeti eklendi, köşeye türü yazan küçük bir etiket kondu. Silüetin
  kalabalıklığı yerleşimin refahına göre ölçekleniyor: zengin şehir kaynıyor, fakir köy tenha.
- **Han, arena ve pazarın kendine ait sahnesi var (#102).** Hana girince ocak başında dizilmiş
  fıçılar, duvara yaslanmış kolları kavuşuk bir paralı asker, tezgâh arkasında hancı; arenada
  kum meydan, gölgedeki tribün ve bize dik dik bakan üç dövüşçü; pazarda kervansaray kemerleri,
  çizgili tenteler, yüklü deve ve tezgâh başındaki tüccarlar.
- **Sahne görselleri netleşti (#101).** Sahneler 1,5x çözünürlükte pişiriliyor ve daha az
  kayıpla saklanıyor — eski "144p" bulanıklığı gitti.

## 1.16.0 — Yetenek Ağacı (2026-09-17)

- **Yetenek ağacı geldi (#110).** Altı dal, her dalda beş kademe, her kademede iki karşıt
  perk — birini seçince öbürü kilitlenir. Kılıç Ustalığı, Süvari ve Okçu, Komuta, Sıhhiye ve
  Zindan, İz Sürme, Çapul ve Ticaret. Toplam 60 perk; hasar, hız, kapasite, moral, esir,
  görüş, harita hızı, ticaret, ganimet, yemek, can ve nam gibi gerçek sistemlere dokunuyor.
- **Perk puanı her 2 seviyede bir.** Üst kademeler seviye, ilgili nitelik ve yeterlilik ister;
  tek statı yığmak bir dalı açmaya yetmez.
- **Zekâ artık odak puanı veriyor.** Zekâya harcanan her nitelik puanı anında +1 odak puanı
  kazandırıyor — akla yatırım, öğrenmeyi hızlandırıyor.

## 1.15.0 — Muharebe Merceği (2026-09-17)

- **Savaş kamerası yakınlaştı.** Muharebe artık 3 kat yakından oynanıyor; hangi askerin
  kiminle vuruştuğu net görünüyor. Sağ üstteki **minimap** tüm arenayı, dost ve düşman
  noktalarını gösteriyor — yakın planı kaybetmeden sahayı okuyabiliyorsun.
- **Beş kademeli zorluk.** "Çok Kolay"dan "Çok Zor"a beş kademe; aldığın ve verdiğin hasarı
  birlikte ayarlıyor. Ayarlar menüsünden seçilir.
- **Oklar hızlandı.** Ok ve yaylım artık 1,5 kat hızlı uçuyor — havada asılı kalıp yana
  adımlanamıyor.
- **Savaş yapay zekâsı akıllandı.** Birimler ulaşamadıkları hedefe saplanıp kalmıyor,
  okçular önceliğini koruyor; düşük canlı piyade süvariye karşı boşuna kaçmıyor.
- **Yedi yeni sözleşme.** Borç Tahsildarı, Kaçak Birlik, Gölgedeki Ferman, Tüccar Kervanı,
  Kuşatma Erzakı, Rehine Değişimi ve çok adımlı "Sisteki Nokta" hikâyesi.
- **Envanter kuşanması yenilendi.** Beş kare yerine insan + at silüeti; eşyayı çantadan
  sürükleyip doğru yuvaya bırakarak kuşanıyorsun.
- **Tam ekran ipucu.** Masaüstünde ilk haritada "F11 ile tam ekran" hatırlatması çıkar;
  bir kez kapattığında bir daha görünmez.

## 1.14.0 — Ün ve Nişan (2026-09-17)

- **Başarımlar geldi.** Ünden tımara, seviyeden esir sayısına 31 başarım; kazandığın an
  sağ altta bronz/gümüş/altın rozet belirir, hepsini "Başarımlar" menüsünden görürsün.

- **Dokuz yeni görev.** Ateşli Hastalık, Tehlikeli Yolculuk, Düşman Ordugâhı, Sınır
  Anlaşmazlığı, Rehin Tüccar, Zincirleme Teslimat, Kurt Sürüleri, Orman Pususu, Sınır
  Karakolu — ve artık görevi bitirdiğinde ödülü veren lordun ya da loncanın **yanına
  dönerek teslim ediyorsun**, havadan gelmiyor.

- **Yolda kalmış satıcı bazen kazık atar.** Denklerini gerçek değerinin üstüne satmaya
  çalışır; ticaret gözün varsa fiyatı yüzüne vurup gerçeğine alırsın.

- **Gözetleme kulesi bir gün iz bırakır.** Kuleyi açtığın gün gördüğün düşman izleri
  ertesi güne hayalet olarak kalır.

- **Savaş arazisi konuşuyor.** Oklar ormanda dallara takılır, engebe atışı bozar; safların
  düzeni ve süvari itişi elden geçti.

## 1.13.1 — Kalradya Ezgileri (2026-09-14)

- **Kervanlar da artık yolunu kesmiyor.** Üzerinden geçtiğin bir kervan ya da köylü kafilesi
  kendiliğinden pencere açmıyor; ticaret için üstüne tıklaman gerekiyor. Lordlar için aynı
  kural 1.10'da gelmişti, kervanlar dışarıda kalmıştı. Tıklayarak açılan 🗡️ Soy / 🚪 Yoluna
  Bırak seçimi aynen duruyor — o bambaşka bir yol ve hiç değişmedi.
- Düşmanlar eskisi gibi yolunu kesmeye devam ediyor: haydutlar, savaşta olduğun krallığın
  lordları, kan davalıların. Seni durduran tek şey kavga.

## 1.13 — Kalradya Ezgileri (2026-09-14)

- **Müzik artık gerçek müzik.** Oyunun içinde üretilen ezgiler kalktı; yerine tamamı CC0
  (kamu malı) **15 parça** geldi — 10'u harita, 3'ü savaş, 2'si zafer/yenilgi ezgisi.
  Yaklaşık 30 dakika. Parçaların adı ve bestecisi çalarken üst çubukta yazıyor, tam liste
  `music/CREDITS.md` dosyasında.
- Parçalar **birbirine göre seviyelendi** — biri patlarken öbürü fısıldamıyor. Savaş müziği
  haritadakinden bir tık yüksek.
- **Savaş müziği artık arenada ve turnuvada da çalıyor.**
- **Kovalamaca.** Düşman bir parti ekranda 10 oyun saati boyunca görünür kalırsa savaş
  müziği başlıyor — daha kavga çıkmadan. Gözden kaybolursa sayaç sıfırlanıyor.
- **Diyalog müziği kesmiyor.** Bir kez başlayan parça, araya bir konuşma penceresi girse de
  kaldığı yerden devam ediyor. Bir kovalamaca sırasında açılan pencere sayacı durduruyor,
  bitirmiyor.
- **Savaş sonunda zafer ya da yenilgi ezgisi** çalıyor — gerçek savaşta, arenada, turnuva
  turunda ve onur düellosunda.
- **"🎶 Müzik yükleniyor…" göstergesi.** Parçalar oyunla birlikte inmiyor, ilk çalındıklarında
  tek tek iniyor ve ondan sonra çevrimdışı da açılıyor. Yükleme yarım saniyeden uzun sürerse
  sağ altta dönen bir halka çıkıyor.

## 1.12.1 — Üç Dil (2026-09-14)

- Lonca ve lord kontratlarının **görev metinleri artık çevriliyor**. Oyunu İngilizce ya da
  Endonezce oynarken görev başlığı çevriliyor ama altındaki teklif ve hedef satırı Türkçe
  kalıyordu — 12 kontratın 24 metni birden ham Türkçe gidiyordu.
- Şölendeki **"💍 Nikâhı Kıy!"** düğmesinin evlilik mesajı da çevriliyor.
- Görev metinleri için yeni bir çeviri kapısı: bir kontratın teklif veya hedef satırı
  çeviriden geçmezse testler patlıyor.

## 1.12 — Üç Dil (2026-09-14)

- **Eşinle konuşma ekranı artık üç dilde.** Evlendikten sonra açılan `💬 Dertleş`, `🗺️ Savaş meclisi`
  ve `🏛️ Saray desteği` seçenekleri ile verdikleri cevaplar İngilizce ve Endonezcede Türkçe
  kalıyordu; hepsi çevrildi. Aynı ekranda evliliğin ne kazandırdığını anlatan satır da öyle.

- **Kadın karakter de eşiyle konuşabiliyor.** Bekâr bir lordla evlenen kadın oyuncunun kocasının
  konuşmasında hiçbir şey çıkmıyordu — yeni eş konuşmaları yalnızca erkek yola bağlanmıştı.
  Artık `💞 Eşinle vakit geçir` orada.

- **"bugün" artık çevriliyor.** Son görülme tarihlerinde `1 gün önce` çevrilirken hemen yanındaki
  `bugün` Türkçe kalıyordu.

- **Ayarlardaki tazeleme hızı ve iki hata mesajı çevrildi.** Ekran hızı ölçülemediğinde yazan
  `ölçülmedi`, savaş döngüsü kendini toparladığında ve savaş tuvali açılamadığında çıkan uyarılar
  artık oyunun dilinde.

- **Çeviri açıkları için iki yeni test.** Biri T() dışında ekrana kaçan Türkçe metni yakalıyor —
  eş konuşmaları tam olarak öyle kaçmıştı; diğeri bir çevirinin `{0}` ya da `<b>` gibi parçalarını
  düşürmediğini denetliyor.

## 1.11 — Tımar Fermanı (2026-09-14)

- **Kralından toprak isteyebiliyorsun.** Bir hanedana bağlıysan kralın konuşmasında `🏰 Tımar iste`
  var: yeterli nam ve ilişkiyle sana sahipsiz bir köy/kale/şehir veriliyor. İstenen nam her yeni
  tımarla artıyor, toprağı alınca hanedanın diğer lordları biraz gücenmiş oluyor.

- **Topraklarım ekranı.** Sahip olduğun yerler artık diplomasi penceresinin dibinde saklı değil;
  `⋯ Daha Fazla` menüsündeki `🏰 Topraklarım` hepsini günlük gelirleriyle listeliyor ve istediğine
  doğrudan yola çıkarıyor.

- **Ordular birbirinin içinden geçmiyor.** Savaşta askerler artık birbirini itiyor: iki ordu aynı
  piksele yığılıp tek karede erimiyor, hat kuruluyor ve kanatlar anlam kazanıyor. Atlı, yayanın
  önünde daha az geri adım atıyor.

- **Nehirde görünmez duvar kalmadı.** Su içine düşen kayalar araziden siliniyor; geçide girip
  görünmeyen bir şeye toslamak bitti.

- **Turnuva artık kolay para değil.** Sekiz kişilik çizelgede ilk tur bedava geçilmiyor ve
  şampiyonun oranı en çok ×6; seviye düşükken sınırsız bahis kazancı yok.

- **Pazar penceresi kapandıktan sonra gelen dokunuş alışveriş yapmıyor.** Telefonda çift dokunuşun
  geriden gelmesi hem oyunu çökertiyordu hem de parayı alıp götürüyordu.

- **Basacak tuşu olmayan pencereye `Kapat` düğmesi geliyor.** Köyde gönüllü kalmadığında ya da
  benzeri boş bildirimlerde köşedeki × aranmıyor.

- **Savaşlar yavaşladı — vuruş hızından, yürüyüş hızından değil.** Her saldırı bekleme süresi
  (askerlerinki de senin kılıcın ve yayın da) 1,6 katına çıktı. Piyade artık 1,36–2,0 saniyede,
  okçular 2,24–2,72 saniyede bir vuruyor. Hareket hızına dokunulmadı; sahada çamurda yürüme
  hissi yok. Ölçüldü: teke tek düello 12,2 → 16,0 sn, 12'ye 12 zırhlı çarpışma 34,9 → 49,0 sn.
  Kalkan kaldırmaya, yana çıkmaya ve emir vermeye vakit kalıyor.

- **Savaş haritasındaki kırmızı isim daireleri kalktı.** Düşman komutanı hâlâ konuşuyor ama
  sahanın ortasına atılan üç kırmızı halka ve isim etiketi çiziliyor değil.

- **Yalnızken kimse kimseye bakmıyor.** "Kese hafiflemiş, herkes birbirine bakıyor" olayı tek
  başına gezerken çıkmıyor.

## 1.10 — Bekleyen Yol (2026-09-13)

- **Kampta düşman baskını yok.** Bekleme sırasında harita dünyası hareket etmeyi sürdürse de düşman
  çarpışması/pususu kampı kesmiyor; seçilen süre bitene kadar güvenle zaman geçiyor. Düşmanlar ayrıca
  kamp çevresindeki güvenli mesafenin içine giremiyor; uyanır uyanmaz savaş açılmıyor.

- **Dost şehir ve kalelerde beklenebiliyor.** Savaşta olmadığın şehir/kale menüsünde artık
  `⏳ Burada Bekle` var; aynı kamp süre seçenekleriyle haritaya dönüp zamanı geçiriyor.

- **Kamptan hareket emri verilemiyor.** Bekleme sürerken haritaya tıklama, hedef sürükleme ve doğrudan
  rota atama yok sayılıyor; kamp yalnız süre dolunca ya da karşılaşma kesince bitiyor.

- **Beklerken kamptasın.** Haritada zaman geçirirken oyuncu birliği atlı/ayaklı birlik yerine
  çadır sembolüyle gösteriliyor; isim etiketinde de kamp işareti var.

- **Erken oyunda haydut baskısı yumuşadı.** İlk iki gün yeni haydut takviyesi çıkmıyor; çeteler
  ilk gün en fazla 8 kişiyle başlıyor ve 16. güne kadar normal büyüklüklerine açılıyor. İnler de
  oyuncunun güvenli doğuş yarıçapındaysa yeni çete çıkaramıyor; dibinde yeni grup belirmiyor.

- **Günler biraz daha yavaş geçiyor.** Normal dünya zamanı saniye başına 1 yerine 0,75 oyun saati
  ilerliyor. Kamp ve NPC hareketi de aynı temel oranı kullandığı için zaman ile harita tutarlı kalıyor.

- **Lordlar kıyıda takılmıyor.** Harita dışına düşen devriye/kaçış hedefleri hareketten önce
  kıyı çizgisinin içine çekiliyor; erişilemeyen hedefe yürüyüp kenarda sonsuza dek kalmıyorlar.

- **Erzak daha yavaş tükeniyor.** Asker başına günlük tüketim 0,5'ten 0,4'e, oyuncunun payı
  1'den 0,75'e indirildi. Günlük tüketim, erzak günü göstergesi ve açlık hesabı aynı oranı kullanıyor.

- **Lord orduları artık zıplamıyor.** Günlük güç hedefi ordu mevcudunu bir anda yeniden yazmıyor;
  eksik ya da fazla asker sayısı günde en çok üç kişiyle hedefe yaklaşıyor. Yeni doğan ve yeniden
  çıkan lordlar da aynı hedef büyüklükten başlıyor.

- **Hasat nöbeti daha adil.** Görevin iki çapulcu dalgası artık 8–19 yerine 5–12 kişiden oluşuyor.
- **Kampta dünya da hızlanıyor.** Beklerken saat dört kat akıyorsa lordlar, kervanlar ve haydutlar da
  haritada dört kat yol alıyor; geçen dünya zamanı ile parti hareketi artık birbirini tutuyor.
- **Esiri onurla salma hedefi anında işliyor.** Kan davasındaki son lordu fidyesiz bıraktığında
  “Kan bedeli” hedefi geçmiş husumeti kaydedip aynı anda tamamlanıyor.

- **On iki yeni görev eklendi.** Mühürlü ferman taşıma, üç duraklı sınır teftişi, tahıl vergisi,
  şölen fıçıları, esir kafilesi, üç çete avı, kıdemli muhafız yetiştirme, düşman kapılarını keşif,
  diplomatik nabız yoklama, üç şehirlik pazar defteri, tuz yolu ve savaş sandığı görevleri lordların
  mizacına ve lonca ustalarına göre teklif havuzuna katıldı.

- **Turnuva yerleri artık gizli.** Açık turnuvalar dünya haritasında kupa işaretiyle gösterilmiyor,
  han söylentileri şehirlerini ele vermiyor ve turnuva görevleri haritaya hedef noktası koymuyor.
  Turnuva ancak düzenlendiği şehre girildiğinde fark ediliyor.

- **Harita buluşmaları niyeti biliyor.** Dost veya nötr lordla tesadüfi çarpışma sohbet açmıyor;
  oyuncu lordu ya da lord oyuncuyu kimliğiyle hedeflediyse buluşmada diyalog açılıyor. Düşman lordların
  yolu kesmesi ve haydut saldırıları aynen sürüyor.
- **Lord orduları biraz zayıfladı.** Kral, vezir ve normal lord kuvvetleri başlangıçta, günlük
  yenilenmede ve mağlubiyet sonrası dönüşte %10 daha az askerle geliyor; eski kayıtlardaki normal
  lordlar da bir sonraki günlük güncellemede yeni 32 kişilik üst sınıra iniyor.
- **Hediye ve iltifatın tepkisi artık kaybolmuyor.** Sonuç modalı salon menüsü tarafından aynı
  karede ezilmiyor; “çok sevdi / hoşuna gitti / kibarca karşıladı / hoşlanmadı” tepkisi ile
  ilişki veya ilginin önceki ve yeni değeri, oyuncu Devam'a basana kadar ekranda kalıyor. Aynı
  güvenli sonuç ekranı şiir okuma ve turnuva zaferi ithafına da uygulandı.
- **Turnuvalar renkli takım savaşları oldu.** Warband düzenine yaklaşan turnuvada çeyrek final
  4’e 4, yarı final 2’ye 2, final 1’e 1 oynanıyor; iki tarafın takım adı ve yüksek kontrastlı
  rengi hem tur ekranında hem savaş alanındaki dövüşçülerde aynı görünüyor. Kişisel ekipman içeri
  girmiyor: herkeste aynı tahta kılıç ve dolgulu zırh var, at iki tarafa da yasak.
- **Yazılan konuşmada ilk basış onaydır.** Lordun cümlesi yazılırken kayan bir seçeneğe dokunmak
  artık o seçeneği çalıştırmıyor: ilk basış metni tamamlıyor, ikinci basış bilinçli seçimi yapıyor.
  Konuşma alanı da uzun cümlelerde tuşları daha az oynatacak kadar büyütüldü.
- **Yol olayı dokunmayı çalmıyor.** Haritaya basılıyken açılan rastgele olay, aynı parmağın
  bırakılmasını bir seçenek tıklaması saymıyor; kısa dokunma kilidinden sonra seçim normal çalışıyor.
- **Turnuva hedefi zafer anında tamamlanıyor.** “Turnuva şampiyonu” hedefi artık ertesi günün
  dünya güncellemesini beklemiyor. Yeni takım turnuvası ve eski arena yolu aynı sonuç hook'una
  bağlandı; sayaç, hedef ve turnuva görevi tek noktadan ve yalnız gerçek zaferde çalışıyor.
- **“Sisteki Nokta” görevi kaldırıldı.** Gizli koordinat arayıp sıcak/soğuk bildirimi bekleten
  görev artık hiçbir görev verenden çıkmıyor; tanımı ve kullanılmayan çevirileri de temizlendi.
- **Yol kenarında geçen saatler gerçekten geçiyor.** Yaralıyla ilgilenirken, fırtınayı beklerken
  ya da iz sürerken peşindeki düşmanlar da yürür; yetişirlerse sonuç penceresinden sonra önünü keserler.
- **Diyalog zemini artık kapatma düğmesi değil.** Özellikle hareket hâlindeyken açılan yol olayları,
  haritaya giden eski dokunuşla yanlışlıkla kapanmıyor; kararlar yalnız görünür düğmelerle veriliyor.
- **Haritaya dönünce kamera oyuncuyu buluyor.** Menüden veya savaştan çıkarken eski kaydırma ofseti
  taşınmıyor; yarım kalmış dokunma ve yakınlaştırma hâli de temizlenmeye devam ediyor.
- **İltifatın üç günlük arası var.** Aynı leydiye durmadan aynı iltifatı basarak ilgi kasılamıyor.
- **Oynanan savaşlar yaklaşık üçte bir uzadı.** Hasar temposu düşürüldü; zırh, birlik oranları ve
  otomatik çözüm dengesi değişmedi.
- **Tek kişilik karşılaşmalar ordu taklidi yapmıyor.** Arena, turnuva ve şeref düellosunda düşman
  komutanı konuşması ile isimli kırmızı komuta halkaları çıkmıyor. Tavuk avında da emir tuşları yok.
- **Karşılaşmada söylenen düşman, sahaya çıkan düşman.** Eski bir karşılaşma kimliği bellekte
  kaldığında "haydut çetesi" başlığının altından kurt sürüsü çıkabiliyordu; ilan edilen birlik türü
  artık savaş motoruna doğrudan taşınıyor.
- **Teçhizat artık yedi parçalı.** Silah, kalkan, gövde zırhı ve atın yanına başlık, eldiven ve
  çizme yuvaları geldi. Deri/plaka zırhlar, üç miğfer, iki eldiven ve iki çizme pazar ile keşif
  ganimetine eklendi; kalkan artık gövde zırhını çıkarmadan kuşanılıyor ve bütün parçaların
  savunması savaşta birlikte hesaplanıyor.
- **Erzak sofrası genişledi.** Tütsülenmiş balık, kuru meyve, tereyağı ve bal eklendi; her birinin
  fiyatı ve raf ömrü ayrı. Tüketim, seçkin askerlerin kaliteli yemek ihtiyacı, bozulma ve moraldeki
  yemek çeşitliliği yeni erzakların hepsini tanıyor.
- **Lordlar yol güvenliğine karışıyor.** Yakınındaki çapulcu, haydut veya kurt sürüsünün üstüne
  yürüyüp haritada savaşıyor; iki taraf gerçek asker kaybı veriyor, dağılan lord daha sonra kendi
  yurdunda yeniden toplanıyor. Yenilen çetenin sağ kalanları üç gün saklanıp toparlanıyor. Günlük
  çatışma sayısı birle sınırlı: dünya hareketlenirken haritadaki toplam çete sayısı kabaca aynı kalıyor.
- **Müzikler dış lisans yükü taşımıyor.** Harita ve savaş parçaları, oyunun Web Audio motorunun
  çalışma anında besteleyip sentezlediği özgün/prosedürel eserlerdir; haricî kayıt kullanılmaz.

## 1.09 — Leydi Avrilia (2026-09-13)

- **Leydi Nelda'nın adı Leydi Avrilia oldu.** Swadia'nın dindar leydisi, şafak duasını
  kaçırmayan ve ganimet sandığına elini sürmeyen kişi. Eski kayıtlar bozulmadı.

## 1.08 — Boş Çadır (2026-09-13)

- **Pususa düşünce sayılan adam, sahaya çıkan adamdır.** Karşılama ekranı yaralıları da
  sayıyordu, oysa onlar kampta kalıyor: artık "senin grubun" satırı sahaya çıkacak kadroyu
  yazıyor ve kaç yaralının geride kaldığını söylüyor. Kaçmayı deneyip tutulursan da ilan
  edilen düşman sayısıyla dövüşüyorsun — aradan geçen sürede grup büyümüş olsa bile. (#116)
- **Yol olayları arka arkaya gelmiyor.** Bir olaydan sonra yol bir süre susuyor; olay sıklığı
  aynı kaldı, ama iki olayın sırt sırta patlaması artık mümkün değil. Son on iki olay hatırlanıyor,
  aynı hikâye üst üste çıkmıyor. (#94)
- **Köy yakmanın bedeli ağırlaştı.** Şerefsizlik arttıkça gönüllü çadırı boşalıyor, kalanların
  ücreti katlanıyor, köy pazarı sana pahalıya satıp ucuza alıyor. Leke de yavaş çıkıyor: bir
  baskının izini silmek iki aydan fazla sürüyor, baskın yaptığın gün hiç azalmıyor. (#104)
- **Arena para veriyor.** Her galibiyet kesenin refahına göre ~10 dinar; üçüncü galibiyette
  +25, beşincide +60 ve seri baştan başlıyor. Yenilirsen seri sıfırlanır. (#115)
- **Tavuk kovalamaca artık kovalamaca.** Tavuklar küçüldü ve hızlandı, son beş saniyede iyice
  küçülüyor, aralarına kaz karıştı — kaza dokunursan elindeki tavuk da kaçıyor. 25 saniyede
  16 tavuk, ödül de buna göre arttı. (#123)

## 1.07 — Kum Meydanı (2026-09-13)

- **Turnuva artık gerçek dövüş.** Eskiden ekrana çıkan daireye tıklıyordun; şimdi sekiz
  dövüşçülük bir eleme cetveline giriyorsun ve üç turun her birini arenanın kendi motorunda,
  tahta silahlarla, bizzat dövüşüyorsun. Rakipler isimli: şehrin lordları, turnuvaları takip
  eden müdavimler, hatta grubundaki yoldaşın. Canın turlar arasında yenilenmiyor — finale
  yorgun çıkarsın.
- **Cetvel ekranda.** Kimin kime denk geldiği, kimin elendiği, senin yolun altın çerçeveyle
  görünüyor; her turun kazananı bir üst kutuya kayarak yerleşiyor. Sen elensen bile turnuva
  sonuna kadar oynanıyor ve şampiyonun adını şehir hatırlıyor.
- **Ödül kademeli, bahis oranı gerçek.** Çeyrek finali kazanmak 50, yarı finali 150, finali
  500 dinar ve 20 nam getiriyor. Bahis oranı artık sabit tablodan değil, cetveldeki
  rakiplerin seviyesinden hesaplanıyor — zayıf bir kuraya yatırmak para kazandırmaz.
- **Aynı anda üç şehirde turnuva var.** Eskiden haritada ortalama birden az turnuva açıktı ve
  denk gelmek şanstı; artık meydanlar dolu.

## 1.06 — Kule Nöbeti (2026-09-13)

- **Esc artık oyunu gerçekten duraklatıyor.** Eskiden Esc yalnızca açık pencereyi kapatıp
  haritaya dönüyordu; saat akmaya devam ediyordu, yani "bir dakika düşüneyim" diye
  durduğunda grubun yol almaya, erzağın erimeye devam ediyordu. Artık haritadayken Esc
  duraklatma menüsünü açıyor — Devam Et / Kaydet / Ayarlar / Ana Menü — ve ekranın üstünde
  "⏸ DURAKLATILDI" şeridi duruyor ki oyunun donduğunu sanmayasın. Savaşta da Esc aynı kapıdan
  geçiyor: menüsüz, sade bir duraklatma.
- **Gözetleme kulesine çıkınca çevre birkaç saniye açılıyor.** Kule şimdiye kadar haritaya
  yalnızca uzaktaki bir grubu işaretleyen bir nokta bırakıyordu. Artık pencereyi kapattığın
  anda görüş menzilin dört katına çıkıyor ve zaman duruyor: çeteler, lord orduları, in ağızları
  ve yerleşimlerin durumu o an olduğu gibi önüne seriliyor. Süre Gözcülük yeteneğiyle uzuyor
  (3 saniyeden başlayıp en fazla 8 saniyeye çıkıyor). Kulenin 12 günlük bekleme süresi duruyor —
  bu bedava bir yetenek değil.
- **Pazarda artık ne aldığını bilerek alıyorsun.** 5x düğmesi alt satıra kayıyordu; artık
  1x / x5 / **Tümü** üçlüsü tek satırda. Başlığın altında sabit bir şerit var: çantanda kalan
  yer (aşarsan kırmızı, hız cezasını da yazıyor), kaç günlük yiyeceğin kaldığı ve kesendeki
  para. Her malın yanında "sende N" yazıyor — satmadan önce envantere gidip gelmek yok.
- **Grup ve esir sayacı yeni geleni ayrı gösteriyor.** Üst şeritte `23+4/30`, esir başlığında
  `11+2/16` biçiminde: yeşil "+N" son baktığından beri katılanları söylüyor. Grup ekranını
  açınca sayaç sıfırlanıyor.

## 1.05 — Kızıl Ad (2026-09-13)

- **Düşman artık haritada kırmızı yazıyor.** Bir lordun adı hangi krallıktan olursa olsun
  aynı beyazla yazılıyordu; savaşta olduğun bir krallığın ordusu ile müttefikinin ordusu
  yazıdan ayırt edilemiyordu. Artık düşman adı kırmızı ve başında ⚔ işareti, dostun adı mavi,
  tarafsızın rengi eskisi gibi. Renk körlüğü için işaret de var — kırmızıyı parşömen üstünde
  seçemeyen gözler kılıcı görür.
- **Kasaba resmi bulanık değil artık.** Köy, kale ve şehir manzarası sabit bir boyutta
  çiziliyor, ekran onu büyütüyordu: yüksek çözünürlüklü telefonlarda her kenar dört kat
  bulanık çıkıyordu. Artık ekranın gerçek piksel sayısında çiziliyor. Harita ve savaş
  ekranına bilerek dokunulmadı — onlar her karede yeniden çizildiği için kare düşürürdü.
- **Haydutlar artık başta az, sonra çok.** Sayıları görüş menziline bağlıydı ve görüş en dar
  hâldeyken, yani ilk gün, en tepedeydi: oyunun başında haritayı dolduruyor, sen güçlendikçe
  seyreliyorlardı. Artık tam tersi — dünya sakin başlıyor, takvim ilerledikçe ve namın
  yayıldıkça doluyor. Temizlediğin bölge de ertesi güne kadar boş kalmıyor; altı saatte bir
  yeni bir çete yola çıkıyor.
- **Müzik sessizlikten açılıyor.** Hem ilk açılışta hem de harita–savaş geçişlerinde ses tek
  karede tam seviyeye sıçrıyordu; bir çalgının notanın ortasından başlaması gibiydi. Artık
  1,8 saniyede yükseliyor, parça değişiminde de seviye kayarak geçiyor. Ses kaydırağı eskisi
  gibi anında yazıyor.
- **Düelloda ve arenada boş emirler kalktı.** Yanında kimse yokken bile "⚑ Fırsat: Hücum
  Edin" yazısı düşüyor, dokunmatik emir tuşları ekranın altında duruyordu. Artık grubun boşsa
  emir şeridi hiç çizilmiyor.
- **Harita her ekran değişiminde temiz başlıyor.** Savaş, olay penceresi ya da kasaba ziyareti
  yarım kalmış bir dokunuşu ortada bırakabiliyordu: işaret sürükleme takılı kalıyor, yakınlaştırma
  kendi kendine kayıyor ya da dönüşteki ilk dokunuş yutuluyordu. Artık her ekran girişinde
  harita girdi durumu sıfırlanıyor.
- **Kıtanın ortası artık kalabalık değil.** Haydutlar ve gezgin gruplar haritaya dağıtılırken
  merkeze doğru yığılıyor, kıyılar seyrek kalıyordu. Dağılım düzeltildi; her respawn buradan
  geçtiği için sapma her gün yeniden üretiliyordu.

## 1.04 — Hayalet Parmak (2026-09-13)

- **Harita bazen emir almayı bırakıyordu; düzeldi.** Telefon oyunu arka plana attığında
  parmağın "kalktım" haberi kayboluyor, oyun da o parmağı hâlâ ekranda sanıyordu. O andan
  sonra her dokunuş "iki parmak, yakınlaştırma" diye okunuyor ve grup bir daha kıpırdamıyordu.
  Oyunu kapatıp açmaktan başka çaresi yoktu — kayıt alıp yüklemek bile kurtarmıyordu.
  Artık ekrana konan ilk parmak hayaleti siliyor; çift parmak yakınlaştırma aynen duruyor.
- **Hata raporu artık dokunma durumunu da yazıyor** — donma gibi görünen bu tür takılmaların
  aslında girdi kaynaklı olduğu raporda tek bakışta görünsün diye.

## 1.03 — Üç Deyiş (2026-09-12)

- **Her parça ezgisini üç ayrı desende çalıyor.** Dört barlık her cümlede aynı çalgı aynı
  notaları başka sırayla söylüyor: önce düz, sonra tersten, sonra ikinci yarısından başlayarak.
  Çalgı değişmiyor — değişen deseni. Aynı melodinin iki dakika boyunca tek şekilde dönmesi
  bitti. Yirmi parçanın hepsinde var.

## 1.02 — Yenilgiden Ustalık Çıkmaz (2026-09-12)

- **Arenada yenilince artık yeterlilik kazanılmıyor.** Eskiden kaybetmek de kesenin %40'ını
  ödüyordu; en kolay yol şampiyonu seçip kendini yere attırmaktı — risk yok, çünkü arenada kimse
  ölmüyor. Yenilginin bedeli artık sadece yatakta geçen bir gün.

## 1.01 — Çapulcu Çapulcudur (2026-09-12)

- **Çapulcular artık takvimle güçlenmiyor.** Her 30 günde bir seviye atlıyorlardı — tavansız,
  yani 330. günde seviye 12 — ve her seviye +4 can, +0.5 saldırı getiriyordu. Yükseltilmemiş
  bir köylü ise hiç büyümüyor; sonuçta bir noktadan sonra asker sayısı hiçbir şey ifade
  etmiyordu. Gerçek savaş motorunda ölçüldü: 25 köylü, 14 kişilik sığınak çetesine karşı
  60. günde %98, 120. günde %73, 200. günde **%23** kazanıyordu. Çapulcu çapulcudur — geç
  oyundaki oyuncuya cevap, veteran can barlı bir köylü değil, bir lordun ordusudur.

## 1.00 — Cenk Sahnesi (2026-09-12)

- **Savaş müzikleri baştan yazıldı, bu sefer tür tür.** On savaş parçasının her biri artık ayrı
  bir müzik türünde: *Neon Sefer* synthwave, *Kara Devre* darksynth, *Demir Tel* rock,
  *Altın Sancak* pop, *Meydan Dansı* disco, *Dörtnala* hızlı country, *Halay Ateşi* zurna-davul,
  *Kanun Cengi* 7/8 aksak, *Çelik Halay* 9/8, *Kılıç Gölgesi* sinematik. Altlarındaki ezgi hâlâ
  ortaçağ kilise makamlarından geliyor — yani synthwave'e çalınan ortaçağ havaları, ortaçağ
  havasının üstüne serpiştirilmiş synthwave değil.
- **Soru ve cevap.** *Kılıç Gölgesi*'nde ezgiyi iki çalgı sırayla taşıyor: dört bar yaylılar
  söylüyor, dört bar koro bir oktav aşağıdan cevap veriyor — aynı ezginin tersten yürüyen hâliyle.
- **Kılıç, hücum ve nara.** Kılıç çınlaması, hava kesen bıçak ve savaş narası artık davul
  ızgarasının parçası; on parçanın altısında, her birinde birer kez, vurmalıların boş bıraktığı
  vuruşta.
- **Stereo.** Şimdiye kadar sadece salon yankısı stereoydu, bütün çalgılar tam ortadaydı.
  Artık arpej solda, bas ve ikinci ses sağda, pedin akor sesleri iki yana, dem sesinin karar ve
  beşlisi tam karşılıklı; davul ve ezgi ortada kalıyor.
- **Metalik gitar sesi yumuşadı.** Oyunun her yerinde duyulan o telli/cırtlak tını, artık daha
  akustik ve kibar — telin kendisi değil, ona vuran şey yumuşatıldı. Haritadaki bütün parçalar
  da bundan payını aldı.
- **Yeni çalgı: kanun.** 7/8 ve 9/8 parçaların arpejlerini o taşıyor.
- **🎵 Sıradaki tuşu (N).** Haritada, çalan parçayı bırakıp yenisini besteler. Aynı topluluk
  arka arkaya gelmez.

## 0.99 — Yirmi Topluluk (2026-09-12)

- **Yirmi ayrı topluluk.** Haritada on, savaşta on — ve her biri gerçekten başka bir grup:
  çalgıları, ölçüsü, temposu ve dokusu kendine ait. Önceki sürümde iki düzenleme vardı,
  üstüne birkaç ayar; bu yüzden bütün parçalar birbirine benziyordu.
- **Yeni çalgılar**: santur/arp ve çan (vurulmuş tel — armonikleri kasten tam katlar değil),
  boru (nefesle açılan pirinç), zurna/duduk (kamış), zil ve marakas, örs.
- **Harita hep sakin**: 52–88 vuruş. *Çayır Yolu* (gitar + flüt), *Göl Aynası* (santur),
  *Kav Ateşi* (tek gitar + çello), *Kar Sessizliği* (çanlar + koro), *Çoban Düdüğü* (kamış
  ve dem), *Yolcu Adımı* (gitar + hafif marakas), *Manastır* (ilahi), *Ney ve Su* (iki flüt
  paralel), *Kopuz Havası* (6/8), *Yaylı Vadi* (yaylılar).
- **Savaş hep hızlı**: 128–164 vuruş. *Cenk Korosu*, *Nal Sesi* (üçleme dörtnal), *Boru ve
  Davul* (paralel beşlilerle boru), *Zurna ve Davul*, *Fırtına* (onaltılıklar + zil),
  *Kara Ayin* (kalın ilahi + ağır davul), *Kaval Süvari* (6/8), *Demirhane* (örs),
  *Sancak* (hepsi bir arada), *Yedi Vuruş* (7/8).
- Ölçü artık 4/4 ile sınırlı değil: 6/8 ve 7/8 parçalar da çıkıyor.

## 0.98 — Hücum (2026-09-12)

- **Savaş müziği hızlandı**: 92–112 yerine 126–152 vuruş. Aynı ezgi, koşan hâli.
- **Her parçanın bir düzenleme stili var.** Savaşta beşi: *march* (düz sekizlikler),
  *gallop* (filmlerdeki süvari ritmi), *storm* (onaltılıklar, koro yok), *hymn* (koro
  oktavlarda, yaylar uzun), *charge* (onaltılıklar + koro + kısa yay darbeleri). Ağır
  stillerde kalın yaylılar kök notayı sekizlik sekizlik pompalıyor — "epik"in büyük kısmı
  aslında o.
- **Haritada dört stil**: flütün dört barın kaçında çaldığı değişiyor, bazılarında da
  akorun altına sıcak bir çello uzatması giriyor.

## 0.97 — Gitar ve Keman (2026-09-12)

- **Müzik baştan yazıldı.** Eski hâlinde her nota bağımsız olarak rastgele seçiliyordu, bu
  yüzden ezgi bir yere varmıyordu: hiçbir şey geri gelmiyordu. Artık her parçanın bir
  **motifi** var — bir ritim ve bir şekil — ve bu motif akor değiştikçe tekrar tekrar
  çalınıyor. Tekrar, bir avuç notayı ezgiye çeviren şeydir.
- **Harita: akustik gitar ve flüt.** Gitara gövde eklendi (190 Hz'de kutu rezonansı), tel
  sesi değil gerçekten çalgı gibi duyuluyor; parmak düzeni başparmakla dönüşümlü bas
  basıyor. Flüt dört barın ikisinde motifi bir oktav yukarıdan alıyor, kalan iki barda
  soluklanıyor.
- **Savaş: davul, keman, koro.** 6/8 estampi gitti, yerine yürüyüş temposunda 4/4 geldi —
  1 ve 3'te kalın davul, aralarda sekizlikler, akor dönmeden önce doldurma. Keman gerçek
  bir yay gibi: her çekişin başında filtre 60 ms açılıyor (telin tutması) ve vibrato
  sonradan giriyor. Koro akoru bar boyunca tutuyor.
- **Psaltery ve tek zurnalı düzenleme silindi.** Kimsenin dinlemek istemediği çeşitlilik
  çeşitlilik değil; her ekrana bir topluluk kaldı.
- **Uygulamadan dönünce müzik kendi geliyor.** Artık sesi kapatıp açmak gerekmiyor. İki
  sebebi vardı: iOS askıya alınmış sesi ancak bir dokunuşla geri veriyor (o yüzden ekrana
  ilk dokunuş da müziği uyandırıyor), ve bazen ses motoru "çalışıyorum" deyip aslında ölmüş
  oluyor — saati ilerlemiyorsa komple atılıp yenisi kuruluyor.

## 0.96 — Koro ve Flüt (2026-09-12)

- **Harita müziği artık gerçekten müzik.** Önceki sürümde tek bir tele arada bir basılıyordu;
  şimdi kesintisiz parmakla çalınan akustik gitar arpeji var, üstünde bir bar çalıp bir bar
  soluklanan flüt geziyor. Her bar için akor değişiyor.
- **Savaş müziği epik oldu.** Davulun üstüne akortları hafif kaydırılmış yaylı grubu (tek
  keman değil, orkestra) ve akoru tutan koro eklendi — koro gerçek bir insan sesi gibi
  duyulsun diye ünlü harf formantlarıyla üretiliyor.
- **Ses seviyesi düzeldi.** Müzik fazla kısıktı; ölçülüp yükseltildi ve savaşın haritadan üç
  kat gürültülü olması dengelendi. Çıkışa bir sınırlayıcı kondu, üst üste binen notalarda
  cızırtı olmuyor.
- **Dört topluluk, her birinin adı var.** Haritada *Yalnız Ozan* ile *Çayır Yolu*, savaşta
  *Davul ve Zurna* ile *Cenk Korosu*; her yeni parçada içlerinden biri çekiliyor, yani
  sadece ezgi değil çalan grup da değişiyor. Eski düzenlemeler silinmedi, isim aldı.
- **⚙️ Ayarlar'daki 🎵 Müzik satırı o an ne çaldığını yazıyor** — topluluğun adı ve makam.
- Hafif modda yaylı grubu tek sese düşüyor — zayıf telefonda ses için CPU harcanmıyor.

## 0.95 — Tepe Temiz (2026-09-12)

- **Telefon uygulamasında üst satır artık gerçekten çentiğin altında.** 0.89'da eklenen ve
  0.93'te büyütülen boşluk hiçbir işe yaramıyormuş: boşluk yanlış kutuya veriliyordu, o
  yüzden ekranı bir piksel bile aşağı itmiyordu. Ölçüldü, doğru yere taşındı.
- **Başka bir uygulamaya geçip dönünce müzik susmuyor.** iOS sesi askıya alıp geri
  açmıyordu; artık oyun geri gelince kendi devam ettiriyor.

## 0.94 — Ozan Geldi (2026-09-12)

- **Oyunun müziği var.** Haritada sakin bir telli saz ile altında duran kalın bir dem
  sesi, savaşta çerçeve davul ve üflemeli bir ezgi. Ortaçağ kilise makamlarında
  (majör kasıtlı olarak dışarıda — panayır havası oradan geliyor), ölçüleri eşit
  olmayan cümlelerle ve aralarında gerçek sessizlikle.
- **Hiçbir müzik dosyası inmiyor.** Her parça o an besteleniyor: makamı, tonu ve temposu
  her seferinde yeniden seçiliyor, bu yüzden aynı ezgiyi iki kez duymuyorsun ve oyunun
  boyutu bir bayt bile büyümüyor.
- **Savaşa girince müzik davullara geçiyor**, çıkınca haritaya dönüyor.
- **⚙️ Ayarlar'da 🎵 Müzik anahtarı** var; ses seviyesi ve 🔇 sessiz düğmesi müziği de
  kapsıyor.

## 0.93 — Çentik Aşıldı (2026-09-12)

- **Telefon uygulamasında üst satır çentiğin altında kalmıyor.** Kabuk sayfayı saatin
  altına çiziyor ama çentiğin yüksekliğini 0 olarak bildiriyordu; 0.89'daki boşluk bu
  yüzden hiçbir işe yaramamıştı. Artık uygulama içinde 0'a güvenilmiyor.
- **Debug raporu çentik ölçüsünü de yazıyor** — bir sonraki seferde tahmin etmeye gerek
  kalmasın diye.

## 0.92 — Nöbet Tutulur (2026-09-12)

- **Hasat Nöbeti'nde çapulcular artık kaçmıyor.** Görev "gelince savaş" diyordu ama gelen
  grup senin ordundan küçük olduğu için genel "zayıf grup kaçar" kuralına takılıyor, seni
  görüp ters yöne koşuyordu. Görev için çağrılan dalga doğrudan üstüne geliyor.
- **Nöbette olup olmadığın yazıyor.** Köyden uzaktayken hiç çapulcu çıkmıyor, ama bu
  ekranda şanssızlıktan ayırt edilemiyordu; görev kartı artık "✅ Nöbettesin" ya da
  "❌ Nöbet yerinden uzaktasın" diyor.
- **Görev biten dalga haritada kalmıyor.** Görev tamamlanınca ya da yanınca o göreve ait
  gruplar siliniyor — yoksa artık kaçmadıkları için peşini hiç bırakmazlardı.

## 0.91 — Bakış Sabit (2026-09-12)

- **Haritayı kaydırınca bakış orada kalıyor.** Karakterden başka bir yere (mesela hedefine)
  bakarken, karakter yürüdükçe harita da yavaşça onun gittiği yöne kayıyordu. Artık kamera
  elle kaydırıldığı noktada duruyor; Boşluk ve 🎯 Beni Bul yine karaktere döndürüyor.

## 0.90 — Tam İsim (2026-09-12)

- **Haritadaki birlik isimleri tam yazıyor.** "Orman Haydutları" sadece "Orman" görünüyordu;
  isim ilk kelimesine kısaltılıyordu ve atılan yarı asıl anlamı taşıyan yarıydı. Üç dilde de
  tam isim yazıyor; sadece lordların tekrar eden "Ordusu" eki atılıyor.
- **Başlangıç ekranı kısa pencerede kayıyor.** Pencere alçaldığında dil düğmeleri ekranın
  altında kalıyor ve ulaşılamıyordu.

## 0.89 — Tuş Yerini Buldu (2026-09-12)

- **Fareyle haritaya tıklamak yine yürütüyor.** 0.83'te kazara geri alınmıştı; masaüstünde
  tıklama hedef kurmuyor, sadece var olan işareti sürüklemek çalışıyordu.
- **Türkçe klavyede kısayollar çalışıyor.** I tuşu Türkçe düzende `ı` gönderdiği için
  envanter açılmıyordu; artık tuşun kendisi okunuyor, harfi değil. Envanter rozeti de
  Türkçede **İ** yazıyor.
- **Ayarlardaki "Cihaza göre" / "Sistem" düğmeleri düzeldi.** Üçü de hiç çalışmıyordu ve
  oyun açılışında sessizce hata veriyordu.
- **iPhone'da çentik üst şeridi yemiyor.** Gün, saat ve can artık saat ile pilin altından
  çıktı.
- **Hata rozeti raporu açınca kayboluyor** ve telefonda alt menünün üstüne çıkıyor.
- Başlangıç ekranında dil düğmeleri alt sıradaki düğmelerle çakışmıyor.
- Telefon uygulaması artık canlı siteyi açıyor: oyun her güncellendiğinde uygulama da
  güncelleniyor, yeniden kurmak gerekmiyor.

## 0.88 — Tek Dokunuşta Kurulur (2026-09-12)

- **Başlangıç ekranına 📲 Yükle düğmesi geldi.** Oyunu telefona kurmak için tarayıcının
  ⋮ menüsünü aramak gerekmiyor artık; düğme yalnızca tarayıcı "bu kurulabilir" dediğinde
  beliriyor, kurulduktan sonra kendiliğinden kayboluyor.
- iPhone'da düğme çıkmıyor: Safari böyle bir şey sunmuyor, orada yol hâlâ Paylaş →
  **Ana Ekrana Ekle**.

## 0.87 — Sancak Yerine Oturdu (2026-09-12)

- **Krallık armaları düzeldi.** Arma resmi dört sancak içeriyor ama oyun onu dokuza
  bölüyordu: ansiklopedideki beş krallığın üçü sancak yerine kale duvarı, ya da iki
  sancağın birbirine geçmiş yarısı görünüyordu. Artık her krallık kendi bütün sancağını
  gösteriyor — Svadya aslan, Rodok ayı, Kergit at, Nord karga; Veagir de Nord'un
  sancağını çelik grisine çevirerek taşıyor.
- **Sancak seçimi de düzeldi.** Karakter yaratırken çıkan dokuz sancağın çoğu kırık
  görünüyordu; hepsi artık bütün. Dördü gerçek çizim olduğu için dokuz seçenek bu dördü
  paylaşıyor, ayıran şey rengi ve adı — adlar da resme uydu (Mavi Karga, Yeşil Ayı,
  Mor At...). Eski kayıtlardaki sancak seçimin olduğu gibi duruyor.

## 0.86 — Cepte Taşınır (2026-09-12)

- **Düğmeye iki kez hızlı dokununca sayfa zıplamıyor artık.** Telefonda herhangi bir
  düğmeye çift dokunmak tarayıcının kendi yakınlaştırmasını açıyordu; paneller ekran
  ölçüsüne göre hesaplandığı için de hiçbir şey yerinde kalmıyordu. Jest artık
  arayüzün tamamında kapalı.
- Dokununca çıkan gri parlama kalktı; basılı tutunca iOS'un metin seçme büyüteci
  ipucunun üstüne binmiyor.
- **Yazı tipleri oyunun içinde.** Cinzel ve Inter Google'dan çekiliyordu — internetsiz
  açıldığında oyun başka bir yazı tipiyle görünüyordu. Artık tek bir dış bağlantı yok.
- **Oyun telefona kurulabiliyor.** Tarayıcıdan "Ana ekrana ekle" dendiğinde tam ekran,
  kendi simgesiyle ve **internetsiz** açılan bir uygulama oluyor.
- Android ve iOS için gerçek uygulama paketi: her itmede derleniyor, Android'in `.apk`
  dosyası doğrudan kurulabiliyor.

## 0.85 — Köşedeki Fısıltılar (2026-09-12)

Bilgi bedava değil artık — ne handa, ne loncada. Nam merdiveni de 300'ün üstünde bitmiyor.

- **👂 Söylenti Dinle.** Handa köşeye oturup kadehleri ödüyorsun: **20 dinar, 2-4 saat**.
  Duyduğun sözün ağırlığı **Gözcülük** yeteneğine bağlı: düşük seviyede yalnızca bir yön
  ("kuzeyde çete var"), ortada kim nerede (hangi lord nereyi kuşatmış, ordu nereye yürüyor),
  yüksekte rakamlar (hangi mal nereye götürülünce kaç para eder, turnuva, şölen, inin kesesi).
- **Handa duyulan her söz doğru değil.** Yalan çıkma ihtimali Gözcülük 1'de **%45**, 12'de
  **%5**. Yalan uydurma bir hikâye değil — doğru hikâye, **yanlış yere** yapıştırılmış olanı.
  Yani bedeli üç günlük boşa yol.
- **📈 Fiyat defteri artık 50 dinar.** Günde bir kez, şehir başına. Ticaretin haritası
  bedavaydı, değil.
- **👑 300 nam — hükmetme hakkı.** Bağımsızken, arkanda yeterince kılıçla bir köyün meydanında
  durup fiyatı söylüyorsun: kuşatma yok, kılıç yok. Köy sana **her gün haraç** ödüyor (vergisinin
  %40'ı) ve **+3 idare hakkı** kazanıyorsun. Sahibi ve krallığının lordları bunu unutmuyor.
  Krallığıyla savaşa girersen para durur.
- **🕊️ 500 nam — yoldaş elçiliği.** Bir yoldaşını lorda elçi yolluyorsun: ilişki pazarlığı ya
  da ateşkes. **3-6 gün** gruptan ayrılıyor — yeteneği de onunla gidiyor, asıl bedel bu.
- **🎖️ 800 nam — mareşallik.** Derebeyiysen kralından sancağı istiyorsun. Kabul ederse krallık
  sefere çıktığında hedefi **sen** seçiyorsun ve lordlar oraya yürüyor. Ölçüldü: bilerek
  lordlardan en uzak hedefi seçtiğimizde bile **27 lorddan 24'ü 20 gün içinde** oraya vardı,
  ortanca varış **4. gün**. Görev tek seferlik; sefer bitince sancağı yeniden istemen gerek.
- Nam rozetinin ipucu artık beş kapıyı da gösteriyor (80 / 150 / 300 / 500 / 800).

## 0.84 — Usta Yerini Biliyor (2026-09-12)

- **Yeni lonca görevi: İni Bas.** Şehrin hanındaki lonca ustası, kervanlarını soyan inin
  yerini biliyor — kabul ettiğin anda ini **haritana işaretliyor**. Görevin asıl değeri
  bu: inler kendiliğinden ancak yanından geçersen görünüyor.
- Ödül **1600 dinar + 10 nam**, üstüne inin biriktirdiği kese. Süre 20 gün.

## 0.83 — İnler (2026-09-11)

Çete artık boşluktan doğmuyor. Haritada beş **haydut ini** var; çıkan her çete birinden
çıkıyor, her in de çevresindeki köyleri günden güne kemiriyor.

- **☠️ Haydut İni.** Kayalara sinmiş kamplar. Yanından geçmeden haritada görünmüyorlar —
  önce bulman gerek.
- **Çevresi fakirleşir.** İnin 1500 birimlik menzilindeki yerleşimlerin refahı her gün
  eriyor; köy toparlanmaya çalışıyor ama in daha hızlı kemiriyor.
- **Basabilirsin.** İnin üstüne gidip **⚔️ İni Bas** dersen normal bir savaş açılır.
  Kazanırsan biriktirdikleri kese senin olur, bölge nefes alır ve **oradan yeni çete
  çıkmaz**.
- **Temizlemenin karşılığı var.** Ölçüldü: inlerin menzilindeki yerleşimler 100 günde
  82 refahtan **54**'e düşüyor; aynı inler 40. günde temizlenirse 100. günde **78**'de
  oluyorlar. İn bekledikçe hem kesesi hem adam sayısı büyüyor.

## 0.82 — Bozgun (2026-09-11)

Kimse son adamına kadar dövüşmüyor artık. Dörtte birine inen ordu kılıcı bırakıp
geldiği yöne kaçıyor — ve asıl karar orada başlıyor.

- **Düşman kırılınca kaçıyor.** Kalan üç kişi seni beklemiyor; arkasını dönüp koşuyor,
  can havliyle, normalden hızlı.
- **Peşine düşmek senin kararın.** Hiçbir şey yapmazsan kovalıyorsun: yakaladığın ganimet
  ve esir oluyor. Savaş şeridindeki **🕊️ Bırak Gitsinler** düğmesi ise onlara yol veriyor —
  ganimet yok, **şeref +3** var.
- **Atının hızı nihayet para ediyor.** Kaçan senden hızlıysa kaçar. Yaya bir komutan
  bozguna uğrattığı süvariyi seyretmekle yetinir.
- **Senin adamların da kaçabilir** — ve kaçan **ölmüyor**. Eskiden kaybedilen savaşta
  grubun tamamı kırılırdı; artık dağılan askerin sağ salim yanında kalıyor.

## 0.81 — Yollar Tekin Değil (2026-09-11)

Harita bomboştu: günlerce yol gidip tek bir çapulcu görmemek mümkündü, "çeteyi bul" diyen
bir görevi almak da resmen umutsuzluktu.

- **Yollarda iki kat fazla çete var.** Görüş menzilin kıtanın yüzde biri kadar; çete sayısı
  artık buna göre belirleniyor — 30 gün yol giden biri eskiden 18–23 çete görürken şimdi
  **39–51** görüyor, yani günde birden fazla.
- **Temizlenen bölge boş kalmıyor.** Eskiden günde tek bir çete doğuyordu ve lordların
  süpürdüğü yerler haftalarca ıssız kalıyordu; artık nüfus her gün hedefe doğru dolduruluyor.
- **Çete avlatan görev söylenti veriyor.** "Zincirdeki Kardeş" artık çetenin *şu an* en
  yakın olduğu yerleşimi söylüyor; çete gezdikçe haritadaki işaret de onunla kayıyor.
  Adres değil, iz sürüyorsun.

## 0.80 — Kervanın Adı (2026-09-11)

Haritada kervanların ve köylü kafilelerinin adı yerleşim adına benziyordu — "Praven" yazan
nokta köyün kendisi mi, yoldaki kafile mi belli olmuyordu.

- **Kafileler kendi adlarıyla yazıyor.** Artık **Praven Köylüleri**, **Kergit Kervanı**.
  Yerleşim adıyla karışmıyor, tek bakışta hangi krallığın kervanı olduğu okunuyor.
- **Kervan halkın adını taşıyor**, devletin değil: "Kergit Hanlığı Kervanı" değil
  **Kergit Kervanı** — askerlerin adlarındaki sözcüğün aynısı.
- Üç dilde de düzgün: *Khergit Caravan*, *Kafilah Khergit*.

## 0.79 — Yolda Bir Adam (2026-09-11)

İki şehir arası artık boş bir çizgi değil. Yolda biri seni durduruyor ve bir şey soruyor;
cevabın bedava değil. Yirmi ayrı karşılaşma, her birinin iki-üç cevabı, her cevabın bir
bedeli — para, saat, moral, şeref, bazen doğrudan kılıç.

- **Yolda karar veriyorsun.** Yol kenarında dilenen ihtiyar, ateşler içindeki kervancı,
  zincirli adam, haraç isteyen altı kişi, damgası başkasına ait üç at… Her biri sana
  soruyor, sen seçiyorsun. "Yoluna devam et" de bir seçim — adamların onu da görüyor.
- **Şeref yolda birikiyor.** Tek tek küçük: yardım eden ele +2, zayıfı ezene −2. Ama yirmi
  olay sonunda huy oluyor ve lordlar bunu biliyor.
- **Olaylar nereden geçtiğini biliyor.** Kurt postu ormanda çıkar, taşkın geçit nehirde,
  gecenin ortasındaki ateş yalnız geceleyin. Yağmalanmış bir köyün dibinde külün içinden
  biri çıkıyor. Şerefi yüksek olana köy yol kenarına peynir sepetiyle iniyor.
- **Zar güne değil yola bağlı.** Kampta beklemek olay çıkarmaz; yol yürümek çıkarır.
  Savaştan yeni çıkmışken de sayaç durur — üst üste iki karar konmaz önüne.

## 0.78 — Ağaçların Arasından (2026-09-11)

Ormanda "hiç görmediğim bir şey bana saldırdı" diye bir şey kalmadı. Pusu da kurt sürüsü de
artık görüş menzilinin içinde kalıyor: saldıran ne varsa, saldırmadan önce ekrandaydı.

- **Seni basan çeteyi artık görüyorsun.** Pusu menzili görüşünden geniş olamaz — gizli çete
  ancak görebileceğin kadar yakından üstüne atlıyor. Gözcülük ve Yol Bulma yükseldikçe
  ormanda hem daha uzağı görüyor hem de pusuyu daha erken fark ediyorsun.
- **Kurt sürüsü artık görünmez yerden atılmıyor.** Sürü sana kilitlendiğinde etrafında
  nabız gibi atan kırmızı bir halka beliriyor: kaçacak mısın, duracak mısın — karar senin.
- **Kalabalık ordunun üstüne altı kurt atlamaz.** Sağlam adamların pusucuların 1.5 katını
  geçiyorsa kimse seni pusuya düşürmüyor; onlar da kâr hesabı yapıyor.
- **Pusuda kaçış kapalı değil, pahalı.** Sarıldığında kaçış şansın yarıya iniyor ama
  kapanmıyor; pencerede yazan yüzde neyse atılan zar da o.

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
