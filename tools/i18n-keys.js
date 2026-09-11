'use strict';
// Statically extracts the T(...) keys in the code (#81).
// The dictionaries are generated files; if new prose is added to the code and
// never added to a dictionary, EN/ID falls back to Turkish. This module makes
// that gap visible — its only caller is the regression test in tools/test.js.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = ['app.js', 'battle.js', 'nobles.js', 'quests.js', 'i18n.js'];

const ESC = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0' };
const unesc = s => s.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (m, c) => {
    if(c[0] === 'u' || c[0] === 'x') return String.fromCodePoint(parseInt(c.replace(/^[ux]|[{}]/g, ''), 16));
    return ESC[c] !== undefined ? ESC[c] : c;
});

/** Collects `T('…')` and `T`…`` keys from a single file. */
function keysIn(src) {
    const out = [], n = src.length;
    for(let i = 0; i < n; i++) {
        // Comments are skipped: a `` T` `` in prose was producing false positives
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
            if(src[k + 1] !== ')') continue;                  // T('a' + b): not a key
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

/** Keys across all game files (normalized). */
function codeKeys() {
    const all = new Set();
    for(const f of FILES) keysIn(fs.readFileSync(path.join(ROOT, f), 'utf8')).forEach(k => all.add(norm(k)));
    return all;
}

/** Reads the lang-*.js files without I18N. */
function dicts() {
    const ctx = { I18N: { dicts: {} } };
    for(const f of ['lang-en.js', 'lang-id.js'])
        new Function('I18N', fs.readFileSync(path.join(ROOT, f), 'utf8'))(ctx.I18N);
    return ctx.I18N.dicts;
}

module.exports = { keysIn, norm, codeKeys, dicts };
