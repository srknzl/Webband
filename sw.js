// ============================================================
// Service worker (#91)
// ------------------------------------------------------------
// The game is a fixed list of static files with no API behind it, so there is
// nothing clever to do: precache the lot on install, serve cache-first, and let a
// VERSION bump invalidate everything at once by changing the cache name.
//
// CACHE carries VERSION.no from app.js and is bumped in the same by-hand pass that
// bumps VERSION and writes the CHANGELOG line. `tools/test.js` asserts the two match
// and that every file below exists — a forgotten bump fails CI instead of serving
// last week's game forever.
//
// Not registered inside the native app: index.html checks `window.Capacitor` first.
// With `androidScheme: https` the app's origin is `https://localhost`, so a protocol
// check alone would install a second, stale copy of every asset on top of the one
// Capacitor already ships in the bundle.
// ============================================================
const CACHE = 'webband-v0.93';

const FILES = [
    './', 'index.html', 'style.css', 'manifest.webmanifest',
    'i18n.js', 'lang-en.js', 'lang-id.js', 'app.js', 'battle.js', 'nobles.js', 'quests.js',
    'bg_hdr.jpg', 'kingdom_crests.jpg', 'lord_portraits.jpg',
    'fonts/cinzel-latin.woff2', 'fonts/cinzel-latin-ext.woff2',
    'fonts/inter-latin.woff2', 'fonts/inter-latin-ext.woff2',
    'icon-192.png', 'icon-512.png'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys()
        .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
    if(e.request.method !== 'GET') return;
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
