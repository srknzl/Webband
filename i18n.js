// ============================================
// LANGUAGE LAYER (language pass after #65)
// ============================================
// The key **is the Turkish source text itself**: if the dictionary has no
// match, the screen falls back to Turkish. So even an incomplete translation
// never shows a blank string or "missing.key" anywhere; for a Turkish player
// `T` is the identity function.
//
// Two call forms, both look up the same dictionary:
//   T('Yeni Oyun')                 → plain string
//   T`${n} asker katıldı`          → tagged template; key is "{0} asker katıldı"
// In the tagged form, interpolated values are numbered in the key and can be
// reordered in translation ({0}, {1}) — sentence order varies by language.

const I18N = {
    lang: 'tr',
    dicts: {},          // { en: {...}, id: {...} } — filled in by lang-*.js
    missing: new Set(), // untranslated keys; feeds the debug report
    doubled: new Set(), // T() given an already translated text (a value, not a key); also reported

    // The pseudo-locale (tests only, never in the menu): every translation comes back with its
    // letters circled — "Beni Bul" → "Ⓑⓔⓝⓘ Ⓑⓤⓛ" — and a key counts as known if the English
    // dictionary has it. A circled letter is a symbol, not a letter, so any plain letter left on
    // screen never went through T(); a circled key reaching T() is a translation translated
    // again; circled text in a save is a translation frozen into the state; and one reaching a
    // lookup table breaks the logic out loud. Cutting or splitting a translation keeps it circled.
    PSEUDO: 'xx',
    CIRCLED: /[\u24B6-\u24E9]/,
    pseudo(key) {
        const up = 'ÇĞİÖŞÜ', low = 'çğıöşü', base = 'CGIOSU';
        const one = ch => {
            let i = up.indexOf(ch); if(i >= 0) ch = base[i];
            i = low.indexOf(ch); if(i >= 0) ch = base[i].toLowerCase();
            const c = ch.charCodeAt(0);
            return c >= 65 && c <= 90 ? String.fromCharCode(0x24B6 + c - 65)
                 : c >= 97 && c <= 122 ? String.fromCharCode(0x24D0 + c - 97) : ch;
        };
        // markup, placeholders and entities stay as they are
        return key.split(/(<[^>]*>|\{\d+\}|&[a-z#0-9]+;)/i).map((part, i) => i % 2 ? part : part.replace(/[A-Za-zÇĞİÖŞÜçğıöşü]/g, one)).join('');
    },

    LANGS: [
        { id: 'tr', flag: '🇹🇷', name: 'Türkçe' },
        { id: 'en', flag: '🇬🇧', name: 'English' },
        { id: 'id', flag: '🇮🇩', name: 'Bahasa Indonesia' }
    ],


    // Static text in index.html. The key is stamped onto the node **once**,
    // by `prime()`, before the page draws anything; `applyDom` only touches a
    // node that has a key. Otherwise every panel that builds its screen via
    // `innerHTML` (badge captions, screens, modals) would get caught by this
    // walk with its *already-translated* text, the English sentence would get
    // saved as the key, and the node would freeze in English when cycling
    // TR→EN→ID.
    textNodes(root) {
        const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const out = [];
        for(let n = walk.nextNode(); n; n = walk.nextNode()) {
            const p = n.parentElement;
            if(!p || p.tagName === 'SCRIPT' || p.tagName === 'STYLE') continue;
            // One letter is enough: the keycap hints are single characters and the I/İ
            // pair differs between Turkish and English. A letter with no dictionary entry
            // still falls back to itself, so widening this costs nothing.
            if(!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(n.nodeValue)) continue;
            out.push(n);
        }
        return out;
    },

    // Translated static attributes → the dataset key holding their Turkish source. A screen
    // reader reads aria-label aloud, so it is as visible as the text.
    ATTRS: { placeholder: 'trplaceholder', title: 'trtitle', 'aria-label': 'trAria' },

    prime(root) {
        root = root || document.body;
        this.textNodes(root).forEach(n => { if(n._trKey === undefined) n._trKey = n.nodeValue.trim(); });
        root.querySelectorAll('[placeholder], [title], [aria-label]').forEach(el => {
            for(const a in this.ATTRS) {
                const v = el.getAttribute(a), d = this.ATTRS[a];
                if(v && el.dataset[d] === undefined) el.dataset[d] = v;
            }
        });
    },

    applyDom(root) {
        root = root || document.body;
        this.textNodes(root).forEach(n => {
            const key = n._trKey;
            if(!key) return;                       // not a static node: leave it alone
            n.nodeValue = n.nodeValue.replace(n.nodeValue.trim(), T(key));
        });
        // Default field value: if the player typed their own name, leave it
        root.querySelectorAll('input[data-tr-value]').forEach(el => {
            const k = el.dataset.trValue;
            if(!el.value || el.value === k || el.value === el._trPrev) el.value = el._trPrev = T(k);
        });
        root.querySelectorAll('[placeholder], [title], [aria-label]').forEach(el => {
            for(const a in this.ATTRS) {
                const k = el.dataset[this.ATTRS[a]];
                if(k) el.setAttribute(a, T(k));
            }
        });
    },

    dict() { return this.dicts[this.lang === this.PSEUDO ? 'en' : this.lang] || null; },

    // A template string spanning multiple lines mixes newlines and indentation
    // into the key. The dictionary is written as one line, so the lookup key
    // is normalized to match.
    norm(key) { return String(key).replace(/\s*\n\s*/g, ' '); },

    lookup(key) {
        key = this.norm(key);
        const d = this.dict();
        if(!d) return key;
        const hit = d[key];
        if(hit === undefined) {
            this.missing.add(key);
            if(this.CIRCLED.test(key) || this.values().has(key)) this.doubled.add(key);
            return key;
        }
        return this.lang === this.PSEUDO ? this.pseudo(key) : hit;
    },
    // The current dictionary's translations, to tell "a key nobody wrote" from "a translation
    // passed to T() again" (built on the first miss only; a hit never pays for it)
    values() {
        if(this._valuesOf !== this.lang) { this._valuesOf = this.lang; this._values = new Set(Object.values(this.dict() || {})); }
        return this._values;
    },

    // A `Tx` text in the language on show now: a string is a value (a name, an old save's
    // already-worded line) and shows as is; `{ t, a }` is a key looked up now, its values shown
    // the same way; an array is its parts joined.
    show(v) {
        if(Array.isArray(v)) return v.map(x => this.show(x)).join('');
        if(!v || typeof v !== 'object') return v == null ? '' : String(v);
        if(v.sfx) return this.suffix(this.show(v.of), v.sfx, v.place);   // a stored name with its case ending
        const text = this.lang === 'tr' ? this.norm(v.t) : this.lookup(v.t);
        return v.a ? text.replace(/\{(\d+)\}/g, (m, i) => (v.a[+i] !== undefined ? this.show(v.a[+i]) : m)) : text;
    },

    // A Turkish case ending after a name or a number, apostrophe and all (2.12.0): the endings were
    // typed into the text ("{0}'a"), so a name ending in a vowel or a front vowel read wrong —
    // "Narra'a", "%47'e", "Harlaus'e". The ending now follows the word: vowel harmony, the buffer
    // letter after a vowel (y / n / s), d→t after a voiceless consonant; a number by its spoken last
    // word (47 → "yedi" → %47'ye). Kinds: dat (-a), loc (-da), abl (-dan), gen (-ın), acc (-ı),
    // ins (-la), poss (-ı/-sı, "%30'u"). Other languages say it in their own words: the word as is.
    // `place`: a place or realm name. One of two words or more whose last ends in -ı/-i/-u/-ü is a
    // compound ("Tevarin Kalesi", "Svadya Krallığı", "Haydut İni") and its endings take an n:
    // Kalesi'ne, Krallığı'ndan. A person's name never is ("Jarl Skeggi'ye"), hence the flag.
    // ponytail: a multi-word place ending in a bare -i that is not a possessive would read wrong; none exists.
    suffix(word, kind, place) {
        word = String(word);
        if(this.lang !== 'tr') return word;
        // a closing aside is not read out: "Lonca Ustası (Praven)" takes Ustası's ending, as TDK writes "Yunus Emre (1240?-1320)'nin"
        let bare = word.replace(/\s*\([^()]*\)$/, '');
        let num = /(\d+)$/.exec(bare);
        let said = num ? this.numberWord(+num[1]) : bare.toLocaleLowerCase('tr');
        let vs = said.match(/[aıoueiöüâîû]/g), last = vs ? vs[vs.length - 1] : 'e';
        last = { 'â': 'a', 'î': 'i', 'û': 'u' }[last] || last;
        let vowelEnd = /[aıoueiöüâîû]$/.test(said), hard = /[fstkçşhp]$/.test(said);
        let n = place && /\s\S*[ıiuü]$/.test(said) ? 'n' : '';
        let a = 'aıou'.includes(last) ? 'a' : 'e', i = { a: 'ı', ı: 'ı', o: 'u', u: 'u', e: 'i', i: 'i', ö: 'ü', ü: 'ü' }[last];
        let s = { dat: (n || (vowelEnd ? 'y' : '')) + a, loc: n + (hard ? 't' : 'd') + a, abl: n + (hard ? 't' : 'd') + a + 'n',
                  gen: (vowelEnd ? 'n' : '') + i + 'n', acc: (n || (vowelEnd ? 'y' : '')) + i, ins: (vowelEnd ? 'y' : '') + 'l' + a,
                  poss: (vowelEnd ? 's' : '') + i }[kind];
        return s ? `${word}'${s}` : word;
    },
    // The word a number is read out with last: 47 → yedi, 40 → kırk, 300 → yüz
    numberWord(n) {
        const ones = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
        const tens = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
        if(!n) return 'sıfır';
        if(n % 10) return ones[n % 10];
        if(n % 100) return tens[(n % 100) / 10];
        if(n % 1000) return 'yüz';
        return n % 1e6 ? 'bin' : 'milyon';
    },

    // First-launch suggestion from the browser's language — the default until the player picks one
    guess() {
        const l = (navigator.language || 'tr').slice(0, 2).toLowerCase();
        return this.LANGS.some(x => x.id === l) ? l : 'en';
    },

    set(lang) {
        if(lang !== this.PSEUDO && !this.LANGS.some(x => x.id === lang)) return;
        this.lang = lang;
        try { localStorage.setItem('webband_lang', lang); } catch(_) {}
        document.documentElement.setAttribute('lang', lang);
    },

    load() {
        let saved = null;
        try { saved = localStorage.getItem('webband_lang'); } catch(_) {}
        if(saved) this.set(saved);
        return saved;
    }
};

// One gate: both `T('...')` and `` T`...` `` go through here.
function T(x, ...vals) {
    if(I18N.lang === 'tr') {
        // No lookup in Turkish: a tagged template builds its own text
        return (x && x.raw) ? x.reduce((a, s, i) => a + vals[i - 1] + s) : x;
    }
    if(!x || !x.raw) return I18N.lookup(String(x));
    const key = x.reduce((a, s, i) => a + '{' + (i - 1) + '}' + s);
    const out = I18N.lookup(key);
    return out.replace(/\{(\d+)\}/g, (m, i) => (vals[+i] !== undefined ? vals[+i] : m));
}

// T, later: the same two call forms, but it returns the key and its values as data instead of
// the text — for words that are *stored* (the news feed, a map mark) and must come back in the
// language on show when they're read, not the one of the day they were said. Values may be
// `Tx` texts themselves; `I18N.show()` turns it all into text.
function Tx(x, ...vals) {
    if(!x || !x.raw) return { t: String(x) };
    return { t: x.reduce((a, s, i) => a + '{' + (i - 1) + '}' + s), a: vals };
}

// The static text's key is stamped before the page draws anything dynamic.
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => I18N.prime());
else I18N.prime();
