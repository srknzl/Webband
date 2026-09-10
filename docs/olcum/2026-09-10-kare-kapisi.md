# Kare atlama kapısı — 2 saniyelik sürüş

`node tools/framegate.js --saniye 2` · sürüm 0.63
Oyunun kendi `Game.skipFrame`'i sahte zaman damgalarıyla sürüldü.
Kural: tazeleme hızı ölçülür, **60 fps'in altına düşürmeyen en büyük bölen** seçilir.

| Ekran | Geçen fps | Bölen |
|---|---|---|
| 60 Hz | **60** | 1 |
| 75 Hz | **75** | 1 |
| 90 Hz | **90** | 1 |
| 120 Hz | **60** | 2 |
| 144 Hz | **72** | 2 |
| 165 Hz | **82.5** | 2 |
| 180 Hz | **60** | 3 |
| 240 Hz | **60** | 4 |

## Parite (#42): iki döngü aynı karede sorarsa

| Ekran | Harita döngüsü | Savaş döngüsü | Ayrık cevap |
|---|---|---|---|
| 60 Hz | 60 fps | 60 fps | 0 |
| 75 Hz | 75 fps | 75 fps | 0 |
| 90 Hz | 90 fps | 90 fps | 0 |
| 120 Hz | 60 fps | 60 fps | 0 |
| 144 Hz | 72 fps | 72 fps | 0 |
| 165 Hz | 82.5 fps | 82.5 fps | 0 |
| 180 Hz | 60 fps | 60 fps | 0 |
| 240 Hz | 60 fps | 60 fps | 0 |

Ayrık cevap 0 olmalı: aynı karede sorulan iki soruya farklı cevap verilirse
döngülerden biri kalıcı olarak aç kalır ve ekranı siyah bırakır.
