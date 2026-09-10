'use strict';
// Koddaki T(...) anahtarlarını statik olarak çıkarır (#81).
// Sözlükler üretilmiş dosyalardır; koda yeni bir cümle girip sözlüğe girmezse
// EN/ID'de Türkçe düşer. Bu modül o farkı görünür kılar — tek kullanıcısı
// tools/test.js'teki regresyon testidir.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = ['app.js', 'battle.js', 'nobles.js', 'quests.js', 'i18n.js'];

const ESC = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0' };
const unesc = s => s.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (m, c) => {
    if(c[0] === 'u' || c[0] === 'x') return String.fromCodePoint(parseInt(c.replace(/^[ux]|[{}]/g, ''), 16));
    return ESC[c] !== undefined ? ESC[c] : c;
});

/** Tek dosyadan `T('…')` ve `T`…`` anahtarlarını toplar. */
function keysIn(src) {
    const out = [], n = src.length;
    for(let i = 0; i < n; i++) {
        // Yorum atlanır: düzyazıdaki `T`` yanlış pozitif üretiyordu
        if(src[i] === '/' && src[i + 1] === '/') { while(i < n && src[i] !== '\n') i++; continue; }
        if(src[i] === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i); if(i < 0) i = n; continue; }
        if(src[i] !== 'T' || /[A-Za-z0-9_$.]/.test(i ? src[i - 1] : ' ')) continue;
        let j = i + 1;
        if(src[j] === '(') {                                  // T('…')
            let k = j + 1;
            const q = src[k];
            if(q !== '\'' && q !== '"') continue;
            let s = '', esc = false;
            for(k++; k < n; k++) {
                const c = src[k];
                if(esc) { s += '\\' + c; esc = false; continue; }
                if(c === '\\') { esc = true; continue; }
                if(c === q) break;
                s += c;
            }
            if(src[k + 1] !== ')') continue;                  // T('a' + b): anahtar değil
            out.push(unesc(s)); i = k + 1;
        } else if(src[j] === '`') {                           // T`… ${x} …`
            let s = '', esc = false, depth = 0, arg = 0, k = j + 1;
            for(; k < n; k++) {
                const c = src[k];
                if(esc) { s += '\\' + c; esc = false; continue; }
                if(c === '\\') { esc = true; continue; }
                if(depth > 0) {
                    if(c === '{') depth++;
                    else if(c === '}' && --depth === 0) s += '{' + (arg++) + '}';
                    continue;
                }
                if(c === '$' && src[k + 1] === '{') { depth = 1; k++; continue; }
                if(c === '`') break;
                s += c;
            }
            out.push(unesc(s)); i = k;
        }
    }
    return out;
}

const norm = k => String(k).replace(/\s*\n\s*/g, ' ');

/** Bütün oyun dosyalarındaki anahtarlar (normalleştirilmiş). */
function codeKeys() {
    const all = new Set();
    for(const f of FILES) keysIn(fs.readFileSync(path.join(ROOT, f), 'utf8')).forEach(k => all.add(norm(k)));
    return all;
}

/** lang-*.js dosyalarını I18N olmadan okur. */
function dicts() {
    const ctx = { I18N: { dicts: {} } };
    for(const f of ['lang-en.js', 'lang-id.js'])
        new Function('I18N', fs.readFileSync(path.join(ROOT, f), 'utf8'))(ctx.I18N);
    return ctx.I18N.dicts;
}

module.exports = { keysIn, norm, codeKeys, dicts };
