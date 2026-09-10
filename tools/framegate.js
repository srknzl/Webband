#!/usr/bin/env node
// ============================================================
// framegate.js — kare atlama kapısının regresyon ölçümü (#54 madde 1, #62)
// ------------------------------------------------------------
// `Game.skipFrame` yüksek tazeleme hızlı ekranlarda fazla kareyi atar. Burada
// oyunun **kendi** fonksiyonu sahte zaman damgalarıyla sürülür; yeniden yazılmaz.
// Ölçtüğü iki şey:
//   1. Hz → geçen fps tablosu (60'ın altına düşmeyen en büyük bölen kuralı)
//   2. #42 paritesi: aynı karede iki döngü sorarsa ikisi de aynı cevabı alır,
//      yani hiçbir döngü kalıcı olarak aç kalmaz.
//
//   node tools/framegate.js
//   node tools/framegate.js --hz 60,90,144 --saniye 3 --rapor
// ============================================================
'use strict';
const H = require('./harness');

const HZ = [60, 75, 90, 120, 144, 165, 180, 240];

// Tek döngü: saniyede hz kare, kapıdan geçen kare sayısı = ölçülen fps
function measure(hz, seconds) {
    const { Game } = H.load({ seed: 1 });
    const step = 1000 / hz;
    let passed = 0;
    for(let i = 0; i < hz * seconds; i++) {
        if(!Game.skipFrame(i * step)) passed++;
    }
    return { hz, fps: +(passed / seconds).toFixed(1), bolen: Math.round(hz * seconds / Math.max(1, passed)) };
}

// #42: harita ve savaş döngüsü aynı karede sorar. Kapı kare başına tek karar
// vermezse döngülerden biri hep tek/çift parmak izine düşer ve HİÇ çalışmaz.
function parity(hz, seconds) {
    const { Game } = H.load({ seed: 1 });
    const step = 1000 / hz;
    let a = 0, b = 0, ayrik = 0;
    for(let i = 0; i < hz * seconds; i++) {
        const t = i * step;
        const s1 = Game.skipFrame(t), s2 = Game.skipFrame(t);   // iki döngü, aynı kare
        if(s1 !== s2) ayrik++;
        if(!s1) a++;
        if(!s2) b++;
    }
    return { hz, harita: a / seconds, savas: b / seconds, ayrik };
}

function main() {
    const arg = H.args();
    const seconds = Number(arg.saniye || 2);
    const list = arg.hz ? String(arg.hz).split(',').map(Number) : HZ;

    const rows = list.map(hz => measure(hz, seconds));
    const par = list.map(hz => parity(hz, seconds));
    if(arg.json) return console.log(JSON.stringify({ rows, par }, null, 2));

    const md = `# Kare atlama kapısı — ${seconds} saniyelik sürüş\n\n`
        + `\`node tools/framegate.js --saniye ${seconds}\` · sürüm ${H.load({ seed: 1 }).VERSION.no}\n`
        + `Oyunun kendi \`Game.skipFrame\`'i sahte zaman damgalarıyla sürüldü.\n`
        + `Kural: tazeleme hızı ölçülür, **60 fps'in altına düşürmeyen en büyük bölen** seçilir.\n\n`
        + `| Ekran | Geçen fps | Bölen |\n|---|---|---|\n`
        + rows.map(r => `| ${r.hz} Hz | **${r.fps}** | ${r.bolen} |`).join('\n')
        + `\n\n## Parite (#42): iki döngü aynı karede sorarsa\n\n`
        + `| Ekran | Harita döngüsü | Savaş döngüsü | Ayrık cevap |\n|---|---|---|---|\n`
        + par.map(p => `| ${p.hz} Hz | ${p.harita} fps | ${p.savas} fps | ${p.ayrik} |`).join('\n')
        + `\n\nAyrık cevap 0 olmalı: aynı karede sorulan iki soruya farklı cevap verilirse\n`
        + `döngülerden biri kalıcı olarak aç kalır ve ekranı siyah bırakır.\n`;
    console.log(md);

    const kotu = rows.filter(r => r.fps < 60);
    const bozuk = par.filter(p => p.ayrik || p.harita < 60 || p.savas < 60);
    if(kotu.length) console.error('UYARI 60 fps altı: ' + kotu.map(r => `${r.hz}Hz→${r.fps}`).join(', '));
    if(bozuk.length) console.error('UYARI parite: ' + bozuk.map(p => `${p.hz}Hz`).join(', '));
    if(arg.rapor) console.error('yazıldı: ' + H.writeReport('kare-kapisi', md));
    process.exitCode = (kotu.length || bozuk.length) ? 1 : 0;
}

if(require.main === module) main();
module.exports = { measure, parity };
