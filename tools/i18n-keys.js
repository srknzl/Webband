'use strict';
// Statically extracts the T(...) keys in the code (#81).
// The dictionaries are generated files; if new prose is added to the code and
// never added to a dictionary, EN/ID falls back to Turkish. This module makes
// that gap visible — its only caller is the regression test in tools/test.js.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = ['app.js', 'battle.js', 'battle-gl.js', 'nobles.js', 'quests.js', 'i18n.js'];

const ESC = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0' };
const unesc = s => s.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (m, c) => {
    if(c[0] === 'u' || c[0] === 'x') return String.fromCodePoint(parseInt(c.replace(/^[ux]|[{}]/g, ''), 16));
    return ESC[c] !== undefined ? ESC[c] : c;
});

/** Collects `T('…')` and `T`…`` keys from a single file. */
function keysIn(src, withSpans) {
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
            out.push(withSpans ? { key: unesc(s), a: i, b: k + 1 } : unesc(s)); i = k + 1;
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
            out.push(withSpans ? { key: unesc(s), a: i, b: k } : unesc(s)); i = k;
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

/**
 * Turkish prose sitting in an HTML text node that never passes through T() — the gap
 * codeKeys() cannot see, because it only reports the keys that ARE wrapped. A raw string
 * here ships Turkish to every language (#129 shipped the spouse menu that way).
 * Data tables are unaffected: they hold bare strings, not `>text<`.
 */
function rawUiText(src) {
    const spans = keysIn(src, true), out = [];
    const inT = i => spans.some(s => i > s.a && i < s.b);
    const re = /[>]([^<>${}`'"]*[\u00e7\u011f\u0131\u015f\u00f6\u00fc\u00c7\u011e\u0130\u015e\u00d6\u00dc][^<>${}`'"]*)</g;
    let m;
    while((m = re.exec(src)) !== null) {
        const t = m[1].trim();
        if(t && !inT(m.index)) out.push({ text: t, line: src.slice(0, m.index).split('\n').length });
    }
    return out;
}

/**
 * Turkish prose inside an `offer(q)` / `desc(q)` body that sits outside every T() span.
 * These two return the quest pitch and the objective line — pure prose, no data — so a
 * single untagged letter there ships Turkish to every language (#129 shipped twelve quests
 * that way). Interpolations are safe to ignore: identifiers are ASCII, so any ç/ğ/ı/ş/ö/ü
 * left over is literal text. rawUiText() cannot cover this — it only sees `>text<` between
 * tags, and a pitch ends at the closing backtick, not at a `<`.
 */
function untaggedProse(src) {
    const TR = /[\u00e7\u011f\u0131\u015f\u00f6\u00fc\u00c7\u011e\u0130\u015e\u00d6\u00dc]/;
    const out = [];
    const re = /\b(offer|desc)\s*\([^)]*\)\s*\{/g;
    let m;
    while((m = re.exec(src)) !== null) {
        let i = re.lastIndex, depth = 1;
        for(; i < src.length && depth > 0; i++) {
            const c = src[i];
            if(c === "'" || c === '"') { const q = c; for(i++; i < src.length; i++) { if(src[i] === '\\') i++; else if(src[i] === q) break; } }
            else if(c === '`') { let t = 0; for(i++; i < src.length; i++) { const d = src[i]; if(d === '\\') i++; else if(t) { if(d === '{') t++; else if(d === '}') t--; } else if(d === '$' && src[i+1] === '{') { t = 1; i++; } else if(d === '`') break; } }
            else if(c === '{') depth++;
            else if(c === '}') depth--;
        }
        const a = re.lastIndex, body = src.slice(a, i);
        const spans = keysIn(body, true);
        // Two rules, because either alone has a hole: a body with no T() at all is raw even
        // when its Turkish happens to carry no diacritic ("Soylu olmayan esirleri..."), and a
        // body that calls T() on a place name can still leave the sentence around it untagged.
        let at = spans.length ? -1 : 0;
        for(let j = 0; at < 0 && j < body.length; j++)
            if(TR.test(body[j]) && !spans.some(s2 => j > s2.a && j < s2.b)) at = j;
        if(at >= 0) out.push({ name: m[1], line: src.slice(0, a + at).split('\n').length });
    }
    return out;
}

module.exports = { keysIn, norm, codeKeys, dicts, rawUiText, untaggedProse };
