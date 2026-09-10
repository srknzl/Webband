// ============================================
// DİL KATMANI (#65 sonrası dil turu)
// ============================================
// Anahtar **Türkçe kaynak metnin kendisidir**: sözlükte karşılığı yoksa
// ekrana Türkçe düşer. Yani çeviri eksik kalsa da oyun hiçbir yerde boş
// ya da "missing.key" göstermez; Türkçe oynayanda `T` kimlik fonksiyonudur.
//
// İki çağrı biçimi var, ikisi de aynı sözlüğe bakar:
//   T('Yeni Oyun')                 → düz metin
//   T`${n} asker katıldı`          → etiketli şablon; anahtar "{0} asker katıldı"
// Etiketli biçimde araya giren değerler anahtarda numaralanır, çeviride
// istenen sırada kullanılabilir ({0}, {1}) — cümle dizilimi dile göre değişir.

const I18N = {
    lang: 'tr',
    dicts: {},          // { en: {...}, id: {...} } — lang-*.js dosyaları doldurur
    missing: new Set(), // çevrilmemiş anahtarlar; Debug raporuna girer

    LANGS: [
        { id: 'tr', flag: '🇹🇷', name: 'Türkçe' },
        { id: 'en', flag: '🇬🇧', name: 'English' },
        { id: 'id', flag: '🇮🇩', name: 'Bahasa Indonesia' }
    ],


    // index.html'deki durağan metinler. Anahtar **bir kez**, sayfa daha hiçbir
    // şey çizmeden `prime()` ile düğümün üstüne yazılır; `applyDom` yalnız
    // anahtarı olan düğüme dokunur. Aksi hâlde ekranı `innerHTML` ile kuran
    // her panel (rozet künyeleri, ekranlar, modal) çevrilmiş metniyle bu
    // yürüyüşe yakalanıyor, İngilizce cümle anahtar diye kaydediliyor ve
    // TR→EN→ID gezildiğinde o düğüm İngilizce çakılı kalıyordu.
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
            if(!key) return;                       // durağan olmayan düğüm: dokunma
            n.nodeValue = n.nodeValue.replace(n.nodeValue.trim(), T(key));
        });
        // Varsayılan alan değeri: oyuncu kendi adını yazdıysa dokunma
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

    // Şablon dizesi birden çok satıra yayılınca anahtara satır sonu + girinti
    // karışır. Sözlük tek satırla yazılsın diye arama anahtarı normalize edilir.
    norm(key) { return String(key).replace(/\s*\n\s*/g, ' '); },

    lookup(key) {
        key = this.norm(key);
        const d = this.dict();
        if(!d) return key;
        const hit = d[key];
        if(hit === undefined) { this.missing.add(key); return key; }
        return hit;
    },

    // Tarayıcı dilinden ilk açılış önerisi — seçim yapılana kadarki varsayılan
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

// Tek kapı: hem `T('...')` hem `` T`...` `` buradan geçer.
function T(x, ...vals) {
    if(I18N.lang === 'tr') {
        // Türkçede çeviri aranmaz: etiketli şablon kendi metnini kurar
        return (x && x.raw) ? x.reduce((a, s, i) => a + vals[i - 1] + s) : x;
    }
    if(!x || !x.raw) return I18N.lookup(String(x));
    const key = x.reduce((a, s, i) => a + '{' + (i - 1) + '}' + s);
    const out = I18N.lookup(key);
    return out.replace(/\{(\d+)\}/g, (m, i) => (vals[+i] !== undefined ? vals[+i] : m));
}

// Durağan metnin anahtarı, sayfa dinamik hiçbir şey çizmeden damgalanır.
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => I18N.prime());
else I18N.prime();
