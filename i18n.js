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
            if(!/[A-Za-zÇĞİÖŞÜçğıöşü]{2,}/.test(n.nodeValue)) continue;
            out.push(n);
        }
        return out;
    },

    prime(root) {
        root = root || document.body;
        this.textNodes(root).forEach(n => { if(n._trKey === undefined) n._trKey = n.nodeValue.trim(); });
        root.querySelectorAll('[placeholder], [title]').forEach(el => {
            ['placeholder', 'title'].forEach(a => {
                const v = el.getAttribute(a);
                if(v && el.dataset['tr' + a] === undefined) el.dataset['tr' + a] = v;
            });
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
        root.querySelectorAll('[placeholder], [title]').forEach(el => {
            ['placeholder', 'title'].forEach(a => {
                const k = el.dataset['tr' + a];
                if(k) el.setAttribute(a, T(k));
            });
        });
    },

    dict() { return this.dicts[this.lang] || null; },

    // A template string spanning multiple lines mixes newlines and indentation
    // into the key. The dictionary is written as one line, so the lookup key
    // is normalized to match.
    norm(key) { return String(key).replace(/\s*\n\s*/g, ' '); },

    lookup(key) {
        key = this.norm(key);
        const d = this.dict();
        if(!d) return key;
        const hit = d[key];
        if(hit === undefined) { this.missing.add(key); return key; }
        return hit;
    },

    // First-launch suggestion from the browser's language — the default until the player picks one
    guess() {
        const l = (navigator.language || 'tr').slice(0, 2).toLowerCase();
        return this.LANGS.some(x => x.id === l) ? l : 'en';
    },

    set(lang) {
        if(!this.LANGS.some(x => x.id === lang)) return;
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

// The static text's key is stamped before the page draws anything dynamic.
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => I18N.prime());
else I18N.prime();
