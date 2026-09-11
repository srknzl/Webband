# Mobil port planı

**Soru:** "Mobilde aşırı kasıyor. En iyi performans/grafik kalitesini verecek,
native olarak GPU kullanabilen framework/dil hangisi? Direkt port edelim."

Bu belge önce **kod tabanını ölçer** (ne taşınacak), sonra **darboğazın nerede
olduğunu** söyler, sonra seçenekleri o ölçüme göre sıralar.

---

## 1. Elimizdeki şey ne? (ölçüldü)

`wc -l` ve `grep` ile, 2026-09-11:

| Katman | Nerede | Büyüklük | Porta etkisi |
|---|---|---|---|
| **Oyun mantığı ve veri** | app.js/battle.js/nobles.js/quests.js'in geri kalanı | **~11 500 satır** | Hedef dil JS/TS ise **1:1 taşınır**. Değilse baştan yazılır. |
| **DOM arayüzü** | 965 satır HTML üreten JS + `style.css` 1117 + `index.html` 277 | **~2 360 satır** | **Hiçbir motorda karşılığı yok.** Her senaryoda baştan yazılır. |
| **Canvas çizimi** | app.js 490 + battle.js 229 satır | **719 satır / 1230 `ctx.*` çağrısı / 41 ayrı API** | Her 2D GPU API'sine **mekanik** çevrilir. En küçük parça. |
| | **Toplam** | **13 192 satır** | |

Arayüzün yoğunluğu ayrıca sayıldı: **60 `showModal` çağrısı**, **184 `onclick="`**,
**588 satır içi `style="`**, **47 `innerHTML`/`setHtml`**.

**Okunacak sonuç:** "native GPU" sorusunun cevabı, işin **%5'lik** kısmına
(719 satır canvas) değiyor. Portun gerçek maliyeti **60 modallik DOM
arayüzüdür** — ve o, hangi motoru seçersek seçelim baştan yazılacak.

---

## 2. Neden kasıyor? (bilinen ölçümler)

CLAUDE.md'deki "Performans" ve "#84" bölümleri zaten şunu söylüyor:

- Hafif modda `renderMap` **0.38 ms** (JS). 30 fps kapısı **33 ms** bütçe veriyor.
  Yani **JS bütçenin %1'i**. Çizim çağrısını azaltmak burada kazanç getirmez.
- #84'te doldurma hızı (fill rate) yarıya indirildi — her yakınlıkta **~2 kat**
  az raster işi. Telefonda **yine kasıyor**.

Geriye üç aday kalıyor, üçü de **cihazda ölçülmeden** ayırt edilemez:

1. **WebView tuvali GPU'ya hiç gitmiyor** (yazılım rasterizasyonu). Chrome'da
   `chrome://gpu` bunu söyler; iOS'ta WKWebView'in "GPU Process: Canvas
   Rendering" ayrı bir süreçtir ve düşen sürümlerde canvas hızlandırması
   kapanabiliyor.
2. **Compositor DOM katmanında boğuluyor** — 588 satır içi stil, cam paneller,
   her karede güncellenen sefer çubuğu.
3. **Termal kısılma** — "önce iyi, iki dakika sonra kasıyor" tablosu bunun
   klasik imzası.

> **Port kararından önceki tek zorunlu adım:** telefondan
> ⚙️ Ayarlar → 🐞 Debug Raporu → 📋 Kopyala. Rapor son 30 karenin aralığını,
> ölçülen tazeleme hızını, DPR'ı, tuval boyutlarını ve cihazı taşıyor.
> Sebep (1) ise **Track A** sorunu bitirir. Sebep (2) ise canvas'ı GPU'ya
> taşımak **hiçbir işe yaramaz** ve motor portu da aynı duvara çarpar.

---

## 3. Seçenekler — bu kod tabanına göre

Sütunlar: native GPU yolu · 11 500 satır mantık ne olur · 2 360 satır arayüz ne olur ·
719 satır canvas ne olur.

| Seçenek | Native GPU | Mantık | Arayüz | Canvas | Kaba emek |
|---|---|---|---|---|---|
| **A. Capacitor + PixiJS** | WebGL/WebGPU → **Metal** (iOS) / **Vulkan-GL** (Android), uygulamanın kendi WKWebView/Android WebView'i | **aynen kalır** | **aynen kalır** | PixiJS sahne grafiğine çevrilir | **2–3 hafta** |
| **B. React Native + Skia** | `@shopify/react-native-skia`, JSI üzerinden UI thread'de **Skia** → Metal/Vulkan | **aynen kalır** (JS) | RN bileşenleri — **60 modal baştan** | Skia canvas'ına çevrilir | **2–4 ay** |
| **C. Godot 4.6** | **Metal** (iOS/macOS arm64) ve **Vulkan**; eski cihaz için GLES "Compatibility" | GDScript'e **baştan** | `Control` düğümleri — **baştan** | `CanvasItem.draw_*` — baştan | **4–8 ay** |
| **D. Flutter + Impeller** | **Impeller** → Metal/Vulkan, shader'lar AOT derlenir (kare içi shader jank yok) | Dart'a **baştan** | Widget — **baştan** | `CustomPainter` — baştan | **4–8 ay** |
| **E. Defold** | OpenGL ES/Vulkan; **<5 MB** paket, düşük segment Android'de 60 fps | Lua'ya **baştan** | GUI düğümleri — **baştan** | baştan | **4–8 ay** |
| **F. Tam native** (Swift+Metal / Kotlin+Vulkan) | En düşük seviye, tavan burada | **iki kez** baştan | **iki kez** baştan | **iki kez** baştan | **8–18 ay, iki kod tabanı** |

**C/D/E/F'nin ortak bedeli:** 11 500 satırlık simülasyon — dünya üretimi, arz
eğrisi, diplomasi, sefer, soylu replik havuzu, görev motoru, kayıt/göç zinciri —
**yeniden yazılır**. Yanında `tools/` altındaki 4 ölçüm aracı ve 24 iddialık test
takımı da yeniden yazılır; onlar oyunun **kendi kodunu** koşturduğu için dil
değişince hiçbiri taşınmaz. Bu, kazanılan GPU'nun karşılığında ödenen asıl fatura.

**A'nın zayıflığı:** hâlâ bir WebView içindesin. Darboğaz §2'deki (2) numaralı
sebepse (DOM compositor), PixiJS canvas'ı hızlandırır ama arayüz aynı kalır.
**B'nin gücü:** WebView'den tamamen çıkarsın ve mantığı yine de kaybetmezsin —
JS kalır, sadece arayüz ve çizim değişir.

*(Denenip elenen: `Canvas2DtoWebGL` gibi "drop-in" canvas2d→WebGL kabukları.
41 ayrı `ctx.*` API'si kullanıyoruz — `createPattern`, `createLinearGradient`,
`setLineDash`, `measureText`, `drawImage` ile offscreen tuval, `getImageData` —
ve bu kabuklar tam kapsama vermiyor. Kapsamayan tek API sessiz bir çizim hatası
demek. PixiJS'e açık açık çevirmek daha az sürprizli.)*

---

## 4. Önerilen yol — kademeli

### Faz 0 — Ölç (1 gün, port değil)
Telefondan debug raporu. `chrome://gpu` (Android). Karar bundan sonra verilir.
Sebep termal kısılmaysa hiçbir port çözmez; çözüm kare bütçesini düşürmektir
(hafif mod zaten 30 fps'e indiriyor, 24 fps denenebilir).

### Faz 1 — Track A: Capacitor kabuğu + PixiJS renderer (2–3 hafta)
Sırası önemli, her adım tek başına canlıya alınabilir:

1. **Capacitor kabuğu** (2 gün) — `npx cap add ios android`. Depo hâlâ
   build'siz çalışır; Capacitor yalnızca `index.html`'i saran native proje.
   Çıktı: App Store / Play Store'a çıkabilen gerçek uygulama, tam ekran,
   adres çubuğu yok, `webband_lang`/kayıtlar cihazda kalıcı.
2. **Çizim kapısını soyutla** (3–5 gün) — `renderMap` ve `Battle.render`
   doğrudan `ctx.*` çağırmayı bırakır, `Game.gfx` arayüzünü çağırır. İki
   uygulama: `gfx-canvas2d.js` (bugünkü kod, aynen) ve `gfx-pixi.js`.
   Anahtar `Game.opt('renderer')`. **Geri dönüş yolu hep açık kalır.**
3. **PixiJS renderer** (1–2 hafta) — 41 API'nin karşılığı. Zaten yaptığımız
   "pahalı şeyi bir kez pişir" işi (`Game.emoji`, `radial`, `textW`,
   `buildGroundTexture`, `Battle.buildGround`) PixiJS'te **doğal olarak**
   texture/sprite'a karşılık gelir; #80/#84'ün önbellekleri boşa gitmez.
4. **A/B ölç** — aynı telefon, aynı dünya, aynı kare: canvas2d vs pixi.
   Ölçüm yöntemi #84'teki gibi (`getImageData(0,0,1,1)` ile kuyruğu boşalt,
   iki modu art arda aynı pencerede ölç).

Faz 1 biterse: **native GPU'ya çıkmış, mağazada uygulaması olan, 13 192 satırın
tamamını koruyan** bir oyun. Testler ve `tools/` çalışmaya devam eder.

### Faz 2 — sadece Faz 1 yetmezse: Track B (React Native + Skia)
Faz 1'in A/B ölçümü "canvas GPU'da ama arayüz hâlâ boğuyor" derse, WebView'den
çıkmak gerekir. O zaman **B**, C/D/E'ye tercih edilir: 11 500 satır mantık JS
kaldığı için taşınır, yalnız 60 modal + 719 satır çizim yeniden yazılır.

### Track C (Godot) ne zaman doğru olur?
Hedef "bu oyunu mobile taşımak" değil de **"grafik kalitesini yükseltmek"**
olursa. Godot 4.6 Metal/Vulkan ile shader, ışık, parçacık ve 3D kapısını açar;
bugünkü canvas çizimi bunların hiçbirini yapamaz. Ama bu artık port değil,
**yeni oyun** — ve 11 500 satırlık simülasyonu GDScript'e taşıma faturası
tamamen ödenir.

---

## 5. Karar özeti

| Amaç | Yol |
|---|---|
| "Telefonda akıcı olsun, mağazada uygulama olsun" | **A: Capacitor + PixiJS** — 2–3 hafta, hiçbir satır kaybı yok |
| "WebView'den tamamen çıkayım" | **B: React Native + Skia** — 2–4 ay, mantık korunur |
| "Grafiği bambaşka bir yere taşıyayım" | **C: Godot 4.6** — 4–8 ay, baştan yazım |

**Öneri: A ile başla, Faz 0'ı atlama.** Kasmanın sebebi ölçülmeden yazılan
her satır, yanlış duvarı yıkma riski taşır.

---

## Kaynaklar

- [WebGL vs Canvas 2D — GPU paralelliği ve kare hızı](https://ume.group/articles/webgl-vs-canvas-2d)
- [SVG vs Canvas vs WebGL (2026 karşılaştırması)](https://www.svggenie.com/blog/svg-vs-canvas-vs-webgl-performance-2025)
- [Canvas vs WebGL: hangi renderer ne zaman](https://simplified.media/guides/canvas-vs-webgl)
- [Godot 4.6 — iOS Metal / Mobile renderer](https://github.com/gtibo/godot-4.6-release-page/issues/3)
- [Godot: Metal desteği (macOS arm64 + iOS) PR #88199](https://github.com/godotengine/godot/pull/88199)
- [Godot 4 mobil optimizasyon rehberi](https://gtstu.com/godot-4-optimize-android-ios/)
- [Canvas2DtoWebGL — drop-in kabuk (elenen yol)](https://github.com/jagenjo/Canvas2DtoWebGL)
- [Firefox 110: GPU hızlandırmalı 2D canvas varsayılan](https://www.phoronix.com/news/Firefox-110-Released)
