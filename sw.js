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
const CACHE = 'webband-v2.1.1';

// The soundtrack (#131) is 20.8 MB and deliberately NOT in FILES: precaching it would make
// the install a 20 MB download before the game is playable at all. Each piece is cached the
// first time it is actually played, so the second evening is offline and the first is 2 MB
// at a time. Music lives in its own cache, which `activate` below leaves alone — a VERSION
// bump should not make the player download the whole soundtrack again.
const MUSIC = 'webband-music';

const FILES = [
    './', 'index.html', 'style.css', 'manifest.webmanifest',
    'i18n.js', 'lang-en.js', 'lang-id.js', 'vendor/pixi.min.js', 'app.js', 'battle.js', 'battle-gl.js', 'map-gl.js', 'map-art.js', 'nobles.js', 'quests.js',
    'bg_hdr.jpg', 'kingdom_crests.jpg', 'lord_portraits.jpg',
    'fonts/cinzel-latin.woff2', 'fonts/cinzel-latin-ext.woff2',
    'fonts/inter-latin.woff2', 'fonts/inter-latin-ext.woff2',
    'icon-192.png', 'icon-512.png',
    'troops/infantry_weak.png', 'troops/infantry_normal.png', 'troops/infantry_armored.png',
    'troops/archer_weak.png', 'troops/archer_normal.png', 'troops/archer_armored.png',
    'troops/player_bow.png',
    'troops/swordsman_1.png', 'troops/swordsman_2.png', 'troops/swordsman_3.png', 'troops/archer_anim.png'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys()
        .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== MUSIC).map(k => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
    if(e.request.method !== 'GET') return;
    if(/\/music\/[^/]+\.mp3$/.test(new URL(e.request.url).pathname)) {
        e.respondWith(caches.open(MUSIC).then(c => c.match(e.request).then(hit => hit
            || fetch(e.request).then(r => { if(r.ok) c.put(e.request, r.clone()); return r; }))));
        return;
    }
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
