#!/usr/bin/env node
// ============================================================
// sim.js — oyuncusuz dünya simülasyonu (#62)
// ------------------------------------------------------------
// Diplomasi, sefer, kuşatma, ticaret ve yol kesme kendi başına N gün işler;
// çıktı JSON + docs/olcum altına markdown tablo. CLAUDE.md'deki "4-11 fetih"
// gibi aralıkların kaynağı budur.
//
//   node tools/sim.js --gun 200 --tohum 1..5
//   node tools/sim.js --gun 200 --tohum 1..5 --rapor       # docs/olcum'a yaz
//   node tools/sim.js --gun 50 --json                      # ham JSON
// ============================================================
'use strict';
const H = require('./harness');

// Her dünya olayı Game.news'ten geçiyor ve etkisi olmayan çağrı haber yazmıyor
// (declareWar zaten savaşta olan çifte erken dönüyor) — sayacın tek kapısı bu.
// *Fonksiyonları ayrıca sarmalamak çift sayıyordu: 11 fetih 22 görünüyordu.*
const NEWS_KINDS = [
    ['fetih', m => m.startsWith('🏰')],
    ['savasIlani', m => m.startsWith('⚔️')],
    ['baris', m => m.startsWith('🕊️')],
    ['ittifak', m => m.startsWith('🤝')],
    ['ittifakBozuldu', m => m.startsWith('💔')],
    ['sefer', m => /mareşal seçildi/.test(m)],
    ['kafileBaskini', m => m.startsWith('🗡️')],
    ['baskinPuskurtme', m => m.startsWith('🛡️')],
    ['partiDagildi', m => m.startsWith('🩸')]
];

function simulate(seed, days) {
    const g = H.world({ seed });
    const { Game, state, LOCATIONS, FACTIONS } = g;
    const c = {};
    NEWS_KINDS.forEach(([k]) => c[k] = 0);

    const news = Game.news.bind(Game);
    Game.news = (msg, mine) => {
        let m = String(msg).trim(), hit = NEWS_KINDS.find(([, test]) => test(m));
        if(hit) c[hit[0]]++;
        return news(msg, mine);
    };

    const owned = f => LOCATIONS.filter(l => l.faction === f).length;
    const min = {};
    Object.keys(FACTIONS).forEach(f => min[f] = owned(f));

    H.run(g, days, () => {
        Object.keys(FACTIONS).forEach(f => { min[f] = Math.min(min[f], owned(f)); });
    });

    const son = {}; Object.keys(FACTIONS).forEach(f => son[f] = owned(f));
    return {
        tohum: seed, gun: days,
        ...c,
        silinenKrallik: Object.keys(FACTIONS).filter(f => min[f] === 0).length,
        krallikToprak: son,
        ortRefah: +(LOCATIONS.reduce((a, l) => a + (l.prosperity || 0), 0) / LOCATIONS.length).toFixed(1),
        acikSavas: Object.keys(state.wars).length,
        yukluCete: state.npcParties.filter(n => n.purse > 0).length,
        kafile: state.npcParties.filter(n => n.trade && n.size > 0).length,
        hata: g.Debug.errors.length
    };
}

const COLS = [
    ['fetih', 'Fetih'], ['sefer', 'Sefer'], ['savasIlani', 'Savaş ilanı'], ['baris', 'Barış'],
    ['ittifak', 'İttifak'], ['kafileBaskini', 'Kafile baskını'], ['baskinPuskurtme', 'Püskürtme'],
    ['ortRefah', 'Ort. refah'], ['silinenKrallik', 'Silinen krallık'], ['hata', 'Hata']
];

function main() {
    const a = H.args();
    const days = Number(a.gun || a.days || 200);
    const list = H.seeds(a.tohum || a.seed, [1]);
    const rows = list.map(s => {
        const t0 = Date.now();
        const r = simulate(s, days);
        r.sure = ((Date.now() - t0) / 1000).toFixed(1) + ' sn';
        if(!a.json) console.error(`tohum ${s}: ${r.fetih} fetih, ${r.sefer} sefer, ${r.baris} barış (${r.sure})`);
        return r;
    });
    if(a.json) return console.log(JSON.stringify(rows, null, 2));

    const rng = k => {
        const v = rows.map(r => r[k]);
        const lo = Math.min(...v), hi = Math.max(...v);
        return lo === hi ? String(lo) : `${lo}–${hi}`;
    };
    let md = `# Oyuncusuz dünya simülasyonu — ${days} gün × ${list.length} tur\n\n`
           + `\`node tools/sim.js --gun ${days} --tohum ${a.tohum || a.seed || 1}\` · sürüm ${H.load({ seed: 1 }).VERSION.no}\n\n`
           + `| Tohum | ${COLS.map(c => c[1]).join(' | ')} |\n|---|${COLS.map(() => '---').join('|')}|\n`
           + rows.map(r => `| ${r.tohum} | ${COLS.map(c => r[c[0]]).join(' | ')} |`).join('\n')
           + `\n| **Aralık** | ${COLS.map(c => '**' + rng(c[0]) + '**').join(' | ')} |\n\n`
           + `Krallık toprakları (son tur): `
           + Object.entries(rows[rows.length - 1].krallikToprak).map(([f, n]) => `${f} ${n}`).join(', ') + '\n';
    console.log(md);
    if(a.rapor) console.error('yazıldı: ' + H.writeReport('dunya-simulasyonu', md));
}

if(require.main === module) main();
module.exports = { simulate };
