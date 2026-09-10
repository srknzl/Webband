#!/usr/bin/env node
// ============================================================
// duel.js — iki asker türünü gerçek savaş motorunda dövüştürür (#62)
// ------------------------------------------------------------
// Ayrı bir hasar matematiği YAZMAZ: Battle.start arenayı kurar, birimler
// TROOP_TYPES'tan doğar, sonra Battle.update(dt) adım adım işletilir. Yani
// blok, kite, hücum ve arazi dahil ölçüm.
//
//   node tools/duel.js --a "Nord Baltacısı" --b "Rodok Kalkanlısı" --n 200
//   node tools/duel.js --a "Svadya Milisi" --b "Rodok Kalkanlısı" --sayi 5
//   node tools/duel.js --liste                 # asker adlarını yazar
//   node tools/duel.js --rapor                 # varsayılan eşleşme tablosu → docs/olcum
// ============================================================
'use strict';
const H = require('./harness');

const DT = 1 / 60;          // motorun kendi kare adımı
const MAX_S = 180;          // kilitlenen dövüş sonsuza sürmesin

function mkUnit(g, name, i, team, W, HGT) {
    const t = g.TROOP_TYPES[name];
    if(!t) throw new Error(`bilinmeyen asker: ${name}`);
    return {
        id: (team ? 'a_' : 'b_') + i, isPlayerTeam: team, name,
        hp: t.hp, maxHp: t.hp,
        x: team ? 60 + Math.random() * 40 : W - 100 + Math.random() * 40,
        y: 40 + Math.random() * (HGT - 80),
        speed: t.speed, attack: t.attack, defense: t.defense,
        type: t.type, dmgType: t.dmgType, charge: 1.3,
        color: team ? '#33aaff' : '#ff4444', radius: t.type === 'cavalry' ? 7 : 5,
        atkCd: Math.random() * 0.6
    };
}

/** Tek dövüş: A takımı kazandı mı, kaç saniyede, kaç kişi ayakta kaldı. */
function fight(g, a, b, n) {
    const { Battle } = g;
    let done = null;
    const end = Battle.endBattle;
    Battle.endBattle = won => { done = won; Battle.active = false; };   // ganimet/modal yolu kapalı
    Battle.start('Çapulcu', 1);
    const W = Battle.canvas.width, HGT = Battle.canvas.height;
    Battle.units = [];
    for(let i = 0; i < n; i++) Battle.units.push(mkUnit(g, a, i, true, W, HGT));
    for(let i = 0; i < n; i++) Battle.units.push(mkUnit(g, b, i, false, W, HGT));
    Battle.reserves = { p: [], e: [] };
    Battle.projectiles = []; Battle.corpses = [];

    let t = 0;
    while(done === null && t < MAX_S) { Battle.update(DT); t += DT; }
    const alive = team => Battle.units.filter(u => u.isPlayerTeam === team && u.hp > 0).length;
    const out = { won: done, sure: t, kalanA: alive(true), kalanB: alive(false) };
    Battle.endBattle = end;
    return out;
}

function duel(a, b, n, rounds, seed) {
    const g = H.world({ seed });
    let winA = 0, sum = 0, kalan = 0, kilit = 0;
    for(let i = 0; i < rounds; i++) {
        const r = fight(g, a, b, n);
        if(r.won === null) { kilit++; continue; }
        if(r.won) { winA++; kalan += r.kalanA; }
        sum += r.sure;
    }
    const ok = rounds - kilit;
    return {
        a, b, kisi: n, tur: rounds,
        kazanmaA: ok ? +(winA / ok * 100).toFixed(1) : 0,
        ortSure: ok ? +(sum / ok).toFixed(1) : 0,
        ortKalanA: winA ? +(kalan / winA).toFixed(1) : 0,
        kilit
    };
}

// Rapor kipinde ölçülen eşleşmeler: CLAUDE.md'deki denge cümlelerinin kaynağı
const PAIRS = [
    ['Nord Baltacısı', 'Rodok Kalkanlısı'],
    ['Nord Baltacısı', 'Svadya Şövalyesi'],
    ['Rodok Mızraklısı', 'Nord Baltacısı'],
    ['Svadya Milisi', 'Rodok Kalkanlısı'],
    ['Svadya Köylüsü', 'Svadya Milisi'],
    ['Kergit Atlı Okçusu', 'Rodok Tatar Yaylısı']
];

function main() {
    const a = H.args();
    const g0 = H.load({ seed: 1 });
    if(a.liste) return console.log(Object.keys(g0.TROOP_TYPES).join('\n'));

    const n = Number(a.sayi || 1), rounds = Number(a.n || a.tur || 50), seed = Number(a.tohum || 1);
    const pairs = a.a && a.b ? [[String(a.a), String(a.b)]] : PAIRS;
    const rows = pairs.map(([x, y]) => {
        const r = duel(x, y, n, rounds, seed);
        console.error(`${x} vs ${y}: %${r.kazanmaA} / ${r.ortSure} sn`);
        return r;
    });
    if(a.json) return console.log(JSON.stringify(rows, null, 2));

    let md = `# Düello ölçümü — ${n}v${n}, tur başına ${rounds} dövüş\n\n`
        + `\`node tools/duel.js --sayi ${n} --n ${rounds}\` · sürüm ${g0.VERSION.no}\n`
        + `Gerçek savaş motoru (\`Battle.update\`) adım adım işletilir: blok, kite, hücum ve arazi dahil.\n\n`
        + `| A | B | A kazanma | Ort. süre | A'nın kalanı | Kilitlenen |\n|---|---|---|---|---|---|\n`
        + rows.map(r => `| ${r.a} | ${r.b} | **%${r.kazanmaA}** | ${r.ortSure} sn | ${r.ortKalanA}/${r.kisi} | ${r.kilit} |`).join('\n') + '\n';
    console.log(md);
    if(a.rapor) console.error('yazıldı: ' + H.writeReport('duello', md));
}

if(require.main === module) main();
module.exports = { duel, fight };
