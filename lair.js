'use strict';
// ============================================================================================
// Bandit lairs (2.2.0) — a lair on the map is a real place you can walk into.
// The scouting card (Gözcülük decides what you know) offers three ways in: sneak in alone,
// sneak in with a few soldiers (İdare decides how many), or storm it with the whole army (the
// ordinary battle, with reinforcements). Sneaking is real-time and top-down: bandits see in
// cones that shrink in the dark and hear running, splashing and fighting; you can take them
// down from behind, hide, throw a pebble to pull one away, douse a torch, free prisoners,
// steal the lair's purse — and you must get back out. A sneak leaves the lair standing.
// A bandit-held mine (2.7.0, `Game.isMine`) is the same game with a load: iron and coal sacks
// carried on your back (slow and loud), a rail cart that takes three at once and rumbles all
// the way to the mouth, the foreman's chest with crucible steel. A sack set down at an exit is
// yours even if they catch you afterwards; what's still on your back or in the cart is not.
//
// Drawn with Canvas2D on #lair-canvas, its own loop; the map loop steps aside while
// `Lair.active` (Game.inScene). The people are battle.js's Swordsman and the horses its Horse;
// props are the CraftPix Roguelike kit in lair/ at 2x. One world unit = one sprite pixel,
// a tile is TS = 32 units. Level tables stay raw Turkish and go through T() where shown.
// Every blow goes through Battle.afterArmor. Nothing here runs at load time.
// ============================================================================================
const Lair = (() => {
const TS = 32;
const el = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);
let seed = 1;
const srand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const hashStr = s => { let h = 2166136261; for(let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

// ---------- assets ----------
const IMG = {};
const ASSETS = ['barrel', 'chest', 'chest2', 'crate', 'fire', 'lever', 'pot', 'purse', 'rubble', 'sack', 'shadow', 'spikes', 'stool', 'torch', 'trapdoor'];
let assetsP = null;
function loadAssets() {
    if(assetsP) return assetsP;
    Swordsman.load();
    assetsP = Promise.all(ASSETS.map(n => new Promise(r => { const i = new Image(); i.onload = i.onerror = () => r(); i.src = 'lair/' + n + '.png'; IMG[n] = i; })))
        .then(() => new Promise(r => { let n = 0; const w = () => Swordsman.ready() || n++ > 150 ? r() : setTimeout(w, 30); w(); }));
    return assetsP;
}

// ---------- levels ----------
// Tiles: # wall · . floor · O outside ground · E exit ground · W window · D door · X rubble (a lever clears it)
// ~ water · ' ' rock/void · n tent · f fence · | cage bars · Y watchtower. Objects on a floor: b crate · B barrel
// s sack · k table · h stool · T torch · F fire · C chest · c trapped chest · L lever · t trapdoor (pairs)
// P prisoner · $ the lair's purse · S hidden spikes · v bats · H hiding place · A pen gate · K cage door
// = rail (floor) · o iron sack · q coal sack · M the mine cart (on a rail) · @ start (also an exit). Guards live in the list, not in the map. Every string shown goes through T().
// Hideouts (2.9.0): % deep water (you swim, they can't) · r reeds or brush (crouched in it you're
// hard to see) · , a loud floor (bones, gravel, dry leaves) · d a locked door (a guard carries
// the key) · J a ledge you can jump down. Objects: G a bell · m a larder (meat for the dogs) ·
// i a herb shelf (sleeping herb) · w a keg (the herb goes in it) · Z a rope cleat that drops the
// nearest z (a hanging load) · y a bear's cage.
const LEVELS = {
    house: {
        name: 'Değirmencinin Evi', kind: 'Haydut evi', theme: 'house',
        map: [
            'OOOOOOOOOOOOOOOOOOOOOOOO      ',
            'O######################O######',
            'O#b.k..#H.....b#b.b...#O#PP.s#',
            'O#.kkk.#..kk$..#.....C#O#....#',
            'O#..h..#...h...#b.....#O#....#',
            'O#....s#B......#...B.s#O#t..C#',
            'O###D#####D#######D####O######',
            'O#T..................T#O      ',
            'OW....................#O      ',
            'O#B.........#.S...t.c.#O      ',
            'O#bb...s....#b..H.....#O      ',
            'O##########D###########O      ',
            'EEEEEEEEEEE@EEEEEEEEEEEE      '],
        ambient: { day: .34, night: .07 }, outside: { day: .95, night: .26 },
        lights: [{ x: 4, y: 3, r: 110, i: .8, kind: 'candle' }, { x: 10.5, y: 3, r: 120, i: .85, kind: 'candle' },
                 { x: 27, y: 3, r: 95, i: .7, kind: 'candle' }],
        dayLights: [{ x: 1.5, y: 8, r: 150, i: .6, kind: 'window' }],
        guards: [
            { x: 2, y: 3, type: 'dice', face: 'right', night: 'sleep' },
            { x: 6, y: 3, type: 'dice', face: 'left', night: 'sleep' },
            { x: 11, y: 4, type: 'leader', face: 'up', night: 'sleep', leader: true },
            { x: 3, y: 8, type: 'patrol', route: [[3, 8], [20, 8], [20, 10], [15, 10], [20, 8]] },
            { x: 27, y: 4, type: 'sleep', face: 'left' }],
        ambush: { room: [16, 2, 21, 5], doors: [[18, 6]], spawns: [[20, 2], [17, 5]], where: 'depo odası' },
        chests: { C: [55, 95], c: [140, 180] }, loot: 'leather',
        news: 'Köylü: "Sağ ol! Reis keseyi masada sayar, sırtı hep kapıya dönük."',
        intel: {
            entrances: 'Ön kapı (yolun tarafında), batıda bir pencere',
            entrance1: 'Ön kapı (yolun tarafında)',
            secret: 'Arka koridordaki zemin kapağı bodruma iniyor; tutsaklar orada.',
            leader: { day: 'Reis kendi odasında, sırtı kapıya dönük kese sayıyor.', night: 'Reis gece odasında uyuyor.' },
            traps: 'Arka koridorda gizli diken, sağdaki sandık tuzaklı.'
        }
    },
    cave: {
        name: 'Yarasa İni', kind: 'Mağara', theme: 'cave',
        map: [
            '################################',
            '##b..c.b######.......T#P.P######',
            '##......######.....b..X...######',
            '##.L..s.######........#..$######',
            '##B.....######........#C.s######',
            '#####v#####.b.......H.#####~~~##',
            '#####.#####...........#####~~~##',
            '###.....###...........#####~~~##',
            '###.............F..........~~~##',
            '###.....###H...............~~~##',
            '###.....###...........####.~~~##',
            '#####..####s........B.####.~~~##',
            '######..##################.~~~.#',
            '#######..#################.~~~.E',
            '########..#################~~~.E',
            '#########@#################~~~.#',
            '#########E######################'],
        ambient: { day: .05, night: .03 }, outside: { day: .5, night: .12 },
        lights: [{ x: 24, y: 2, r: 100, i: .75, kind: 'candle' }],
        dayLights: [{ x: 9, y: 15.5, r: 130, i: .5, kind: 'mouth' }],
        guards: [
            { x: 14, y: 8, type: 'dice', face: 'right', night: 'sleep' },
            { x: 18, y: 8, type: 'dice', face: 'left', night: 'sleep' },
            { x: 16, y: 10, type: 'dice', face: 'up', night: 'sleep' },
            { x: 15, y: 3, type: 'post', face: 'right', sweep: 1.1 },
            { x: 12, y: 6, type: 'patrol', route: [[12, 6], [21, 6], [25, 9], [26, 12], [25, 9], [21, 6]] },
            { x: 24, y: 3, type: 'leader', face: 'right', night: 'sleep', leader: true }],
        ambush: { room: [2, 1, 7, 4], doors: [], block: [[5, 6]], spawns: [[4, 1], [7, 4]], where: 'erzak mağarası' },
        chests: { C: [60, 110], c: [150, 200] }, loot: 'sword_steel',
        lever: { opens: [[22, 2]] },
        news: 'Tüccar: "Beni kurtardın! Nehir yolundaki kervan yarın pusuya düşecek, duydum."',
        intel: {
            entrances: 'Mağara ağzı (güneybatı), dereden sağ alta ikinci bir çıkış',
            entrance1: 'Mağara ağzı (güneybatı)',
            secret: 'Batıdaki erzak mağarasında bir kol var; nişi kapatan taşları indiriyor. Tutsaklar ve reis orada.',
            leader: { day: 'Reis taşların ardındaki nişte, tutsakların başında keseyle oyalanıyor.', night: 'Reis nişte uyuyor.' },
            traps: 'Erzak mağarasındaki sandık tuzaklı; tünelde yarasalar var, geçerken ses çıkar.'
        }
    },
    camp: {
        name: 'Kurt Tepesi', kind: 'Kamp', theme: 'camp',
        map: [
            'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
            'O################################O',
            'O#b............................b#O',
            'O#..nnn..bB......c.nnnnnnn..YY..#O',
            'O#..nnn.....HH.....ns..$.n..YY..#O',
            'O..................n.....n......#O',
            'O..................n....Cn......#O',
            'O#.................nnn.nnnT.....#O',
            'O#.||||||...B...................#O',
            'O#.|P..P|.T..............fffffff#O',
            'O#.|....|.......F........f.....f#O',
            'O#.|....|................A.....f#O',
            'O#.||K|||............H.s.f.....f#O',
            'O#............H..........fffffff#O',
            'O#..nnn.........................#O',
            'O#..nnn...nn.......b......nnn...#O',
            'O#........nn..........B...nnn...#O',
            'O#.H.....s.....T..T..........bH.#O',
            'O#..............................#O',
            'O###############DD###############O',
            'EEEEEEEEEEEEEEEE@EEEEEEEEEEEEEEEEE'],
        ambient: { day: .7, night: .1 }, outside: { day: .9, night: .15 },
        lights: [], dayLights: [],
        guards: [
            { x: 15, y: 18, type: 'post', face: 'down' },
            { x: 18, y: 18, type: 'post', face: 'down' },
            { x: 14, y: 10, type: 'dice', face: 'right', night: 'sleep' },
            { x: 18, y: 10, type: 'dice', face: 'left', night: 'sleep' },
            { x: 16, y: 11, type: 'dice', face: 'up', night: 'sleep' },
            { x: 3, y: 6, type: 'patrol', route: [[3, 6], [15, 6], [15, 2], [8, 2], [3, 2]] },
            { x: 20, y: 14, type: 'patrol', route: [[20, 14], [30, 14], [30, 18], [20, 18]] },
            { x: 28, y: 4, type: 'tower', face: 'left', sweep: 1.1, dx: 16 },
            { x: 21, y: 5, type: 'leader', face: 'right', night: 'sleep', leader: true }],
        ambush: { room: [20, 4, 24, 6], doors: [], spawns: [[20, 6], [24, 4]], where: 'reisin çadırı' },
        pen: { horses: [[27, 10], [29, 11], [28, 12]], box: [26, 10, 30, 12] },
        chests: { C: [70, 120], c: [150, 210] }, loot: 'nasal',
        news: 'Köylü: "Sağ ol! Reis çadırında keseyle uyur, kulede bir gözcü var."',
        intel: {
            entrances: 'Ana kapı (güneyde, iki nöbetçi), batı çitinde bir gedik',
            entrance1: 'Ana kapı (güneyde, iki nöbetçi)',
            secret: 'Batı çitindeki gedikten girersen kapı nöbetçilerine hiç görünmezsin.',
            leader: { day: 'Reis kendi çadırında keseyle meşgul.', night: 'Reis çadırında uyuyor.' },
            traps: 'Kulede bir gözcü var, uzağı görüyor. Tutsak kafesi kilitli. Kulübenin önündeki sandık tuzaklı.'
        }
    },
    mine: {
        name: 'Kara Damar Madeni', kind: 'Maden', theme: 'cave', mine: true,
        map: [
            '################################',
            '#o.o..=.##bk$k..C##q..q....bB###',
            '#.....=.##.k.k...##.......q....E',
            '#o..o.=.##..h....##..q.......s.E',
            '#####.M.####D######.....H....###',
            '#T....=......................T##',
            '#.....=.b.........B......b....##',
            '#.H...=........................#',
            '#.....=........F..........H....#',
            '#s....=........................#',
            '#B....=......b......T......B...#',
            '######=#######.#################',
            '######=#######.#################',
            '####..=........b.###############',
            '####.H=........B.###############',
            '####..=..........###############',
            '#####E@E########################',
            '#####EEE########################'],
        ambient: { day: .06, night: .04 }, outside: { day: .6, night: .14 },
        lights: [{ x: 13, y: 2, r: 100, i: .75, kind: 'candle' }, { x: 3.5, y: 2, r: 125, i: .7, kind: 'candle' }, { x: 24, y: 2.5, r: 120, i: .6, kind: 'candle' }],
        dayLights: [{ x: 6, y: 16.5, r: 130, i: .5, kind: 'mouth' }, { x: 30.5, y: 2.5, r: 110, i: .45, kind: 'mouth' }],
        guards: [
            { x: 12, y: 14, type: 'post', face: 'up', night: 'sleep' },
            { x: 13, y: 8, type: 'dice', face: 'right', night: 'sleep' },
            { x: 17, y: 8, type: 'dice', face: 'left', night: 'sleep' },
            { x: 4, y: 6, type: 'patrol', route: [[4, 6], [27, 6], [27, 9], [4, 9]] },
            { x: 26, y: 3, type: 'post', face: 'left', sweep: 1, night: 'sleep' },
            { x: 14, y: 2, type: 'leader', face: 'left', night: 'sleep', leader: true }],
        ambush: { room: [10, 1, 16, 3], doors: [[12, 4]], spawns: [[10, 3], [15, 3]], where: 'ustabaşının odası' },
        chests: { C: [40, 80], c: [120, 160] }, loot: null,
        news: null,
        intel: {
            entrances: 'Maden ağzı (güneyde), kömür deposunun doğusunda bir hava bacası',
            entrance1: 'Maden ağzı (güneyde)',
            secret: 'Kömür deposundaki hava bacasından girersen ana tünelden hiç geçmezsin.',
            leader: { day: 'Ustabaşı odasında, sandığının başında defter tutuyor.', night: 'Ustabaşı odasında uyuyor.' },
            traps: 'Tuzak yok. Ray boyunca itilen araba bütün madeni ayağa kaldırır.'
        }
    },
    // ---- the hideouts (2.9.0): twelve more places, each with its own trick ----
    swamp: {
        name: 'Sazlık Kulübesi', kind: 'Bataklık', theme: 'swamp', sky: 'open', fog: .6, hide: 'log', indoor: [[10, 3, 19, 7]],
        map: [
            'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
            'O%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%O',
            'O%rrr%%%%%%%%%%%%%%%%%%%%%%%rrr%%O',
            'O%r..r%%%%##########%%%%%%%%r.Hr%O',
            'O%rbsr%%%%#k.h.#.P.Wr%%%%%%%rrrr%O',
            'O%%rr%%%%%#kk..D..P#%%%%%%%%%%%%%O',
            'O%%%%%%%%%#.$..#c..#%%%%%rrrr%%%%O',
            'O%%%%%%%%%###D######%%%rr..rr%%%%O',
            'O%%%%%rrr%%%%.%%%%%%%%rr.C..r%%%%O',
            'O%%%%rr.rr%%%.%%%%%%%%%rr..rr%%%%O',
            'O%%%rr..Fr%%%.%%rrrr%%%%rrrr%%%%%O',
            'O%%%%rr.rr%%%.%rr..r%%%%%%%%%%%%%O',
            'O%%%%%rr%%%%%.%%r.Hr%%%%%%rrr%%%%O',
            'O%%%%%%%%%%%%.%%%rr%%%%%%rr.rr%%%O',
            'O%%rrrr%%%%%%.%%%%%%%%%%%r..sr%%%O',
            'O%rr..rr%%%%%.%%%%%%%%%%%%rrr%%%%O',
            'O%%rrrr%%%%%%.%%%%%%%%%%%%%%%%%%%O',
            'OOOOOOOOOOOOO@OOOOOOOOOOOOOOOOOOOO',
            'EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE'],
        ambient: { day: .3, night: .06 }, outside: { day: .85, night: .16 },
        lights: [{ x: 12.5, y: 5, r: 100, i: .7, kind: 'candle' }], dayLights: [],
        guards: [
            { x: 13, y: 9, type: 'post', face: 'down', sweep: .8 },
            { x: 13, y: 12, type: 'patrol', route: [[13, 12], [13, 10]] },
            { x: 7, y: 9, type: 'dice', face: 'down', night: 'sleep' },
            { x: 7, y: 11, type: 'dice', face: 'up', night: 'sleep' },
            { x: 29, y: 3, type: 'post', face: 'left', sweep: 1.2 },
            { x: 17, y: 6, type: 'post', face: 'left', night: 'sleep' },
            { x: 13, y: 5, type: 'leader', face: 'down', night: 'sleep', leader: true }],
        ambush: { room: [11, 4, 14, 6], doors: [[13, 7], [15, 5]], spawns: [[14, 4], [11, 6]], where: 'reisin odası' },
        chests: { C: [60, 100], c: [130, 180] }, loot: 'bow_hunter',
        news: 'Balıkçı: "Sağ ol! Ateşin başındakiler gece uyur; reis keseyi masasının dibinde tutar."',
        intel: {
            entrances: 'Kıyıdan kulübeye uzanan tahta yol; bataklığın her yerinden yüzerek',
            entrance1: 'Kıyıdan kulübeye uzanan tahta yol',
            secret: 'Kulübenin doğu duvarında bir pencere var: sazlıktan yüzüp oradan girersen tahta yolu hiç görmezsin.',
            leader: { day: 'Reis kulübede, masasının başında keseyle oyalanıyor.', night: 'Reis kulübede uyuyor.' },
            traps: 'Sis var: nöbetçiler uzağı görmez. Sazlıkta eğilirsen neredeyse görünmezsin, derin suda yüzerken de. Haydutlar yüzemez.'
        }
    },
    dock: {
        name: 'Kaçakçı İskelesi', kind: 'Liman', theme: 'dock', sky: 'open', hide: 'barrel', indoor: [[5, 10, 26, 16]],
        map: [
            '%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%',
            '%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%',
            '%%%.b.s%%%%%%%%%%%%%%%%%%%%%.s.b%%%%',
            '%%%....%%%%%%%%%%%%%%%%%%%%%..k.%%%%',
            '%%%.H..%%%%%%%%%%%%%%%%%%%%%..z.%%%%',
            '%%%....%%%%%%%%%%%%%%%%%%%%%....%%%%',
            '%%%....%%%%%%%%%%%%%%%%%%%%%Z...%%%%',
            '%%%....%%%%%%%%%%%%%%%%%%%%%....%%%%',
            '%..................................%',
            '%..T.....b......B.......T.....b....%',
            '%....######D###############........%',
            '%.s..#b.s.......b#..P..c..#..b.....%',
            '%....#.........k.#.....P..#........%',
            '%.H..#.T....h..k.d....$...#....T...%',
            '%....#....bb.....#C.......#..s.....%',
            '%..b.#B.........H#....B...#........%',
            '%....#######D##############........%',
            '%..................................%',
            '%OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO%',
            '%EEEEEEEEEEEEEEEEE@EEEEEEEEEEEEEEEE%'],
        ambient: { day: .32, night: .06 }, outside: { day: .9, night: .2 },
        lights: [{ x: 22, y: 12.5, r: 100, i: .75, kind: 'candle' }], dayLights: [],
        guards: [
            { x: 2, y: 8, type: 'patrol', route: [[2, 8], [33, 8], [33, 9], [2, 9]] },
            { x: 12, y: 17, type: 'post', face: 'left', sweep: .8 },
            { x: 13, y: 13, type: 'post', face: 'left', key: true, night: 'sleep' },
            { x: 7, y: 12, type: 'patrol', route: [[7, 12], [14, 12], [14, 14], [7, 14]] },
            { x: 29, y: 4, type: 'dice', face: 'right', night: 'sleep' },
            { x: 31, y: 4, type: 'dice', face: 'left', night: 'sleep' },
            { x: 4, y: 3, type: 'post', face: 'down', sweep: 1.2 },
            { x: 21, y: 13, type: 'leader', face: 'left', night: 'sleep', leader: true }],
        ambush: { room: [18, 11, 25, 15], doors: [[17, 13]], spawns: [[19, 12], [24, 14]], where: 'kasa odası' },
        chests: { C: [80, 130], c: [160, 220] }, loot: 'shield',
        news: 'Kayıkçı: "Sağ ol! Liman ağası kasanın anahtarını kemerinde taşır; vinçteki yük bir halata asılı, bir kesik yeter."',
        intel: {
            entrances: 'Karadan rıhtıma inen yol; denizden yüzerek iskelelere',
            entrance1: 'Karadan rıhtıma inen yol',
            secret: 'Kıyı boyunca yüzersen rıhtımın nöbetçisine hiç görünmeden iskelelere çıkarsın.',
            leader: { day: 'Reis kilitli kasa odasında keseyi sayıyor; anahtar liman ağasında.', night: 'Reis kasa odasında uyuyor; anahtar liman ağasının kemerinde.' },
            traps: 'Vincin altında zar oynayanlar var; yük bir halata asılı. Kasa odasındaki sandık tuzaklı.'
        }
    },
    abbey: {
        name: 'Yıkık Manastır', kind: 'Manastır', theme: 'stone', hide: 'tomb', crunchLook: 'gravel', crunch: 'Kırık taşlar ayağının altında çıtırdadı!',
        indoor: [[0, 0, 33, 7], [24, 7, 33, 19], [0, 15, 24, 19]],
        map: [
            '##################################',
            '#C.T..k$k..T....b.#..G..#h.k..h..#',
            '#.................#.....#........#',
            '#.hh..hh..hh..hh..D.....W........#',
            '#.................#s...b#........#',
            '#.hh..hh..hh..hh.H#.....#b.....s.#',
            '#b...............B#.....#........#',
            '#########D###########D#######D####',
            '#.......................#..h...k.#',
            '#....,,,,,,,,,,,,,,,....#........#',
            '#....,,,,,,,,,,,,,,,....####D#####',
            '#....,,,,,B..b,,,,,,....D.b.P....#',
            '#....,,,H,,,,,,,,,,,....#........#',
            '#....,,,,,,,,,,,,,,,....#....s...#',
            '#.......................######D###',
            '################D########..P.....#',
            '#H,,,,,H,,c#T.........bs#s.......#',
            '#,,P,,,,,,,d............#........#',
            '#H,,,,,,,,C#b..........B#....c..C#',
            '################.#################',
            'EEEEEEEEEEEEEEEE@EEEEEEEEEEEEEEEEE'],
        ambient: { day: .3, night: .06 }, outside: { day: .85, night: .18 },
        lights: [{ x: 7, y: 2, r: 130, i: .8, kind: 'candle' }, { x: 29, y: 8.5, r: 90, i: .6, kind: 'candle' }], dayLights: [],
        guards: [
            { x: 13, y: 17, type: 'post', face: 'right', sweep: .6 },
            { x: 2, y: 8, type: 'patrol', route: [[2, 8], [22, 8], [22, 14], [2, 14]] },
            { x: 13, y: 10, type: 'dice', face: 'left', night: 'sleep' },
            { x: 9, y: 4, type: 'patrol', route: [[2, 4], [16, 4], [16, 2], [2, 2]] },
            { x: 26, y: 9, type: 'post', face: 'right', key: true, night: 'sleep' },
            { x: 27, y: 3, type: 'sleep', face: 'left' },
            { x: 7, y: 2, type: 'leader', face: 'down', night: 'sleep', leader: true }],
        ambush: { room: [25, 15, 32, 18], doors: [[30, 14]], spawns: [[26, 17], [31, 16]], where: 'arka hücre' },
        chests: { C: [70, 110], c: [140, 190] }, loot: 'mace_steel',
        news: 'Rahip: "Tanrı razı olsun! Çanı kim çalarsa bütün manastır kuleye koşar."',
        intel: {
            entrances: 'Güneydeki kapı evi; çan kulesinin penceresi hücrelerin damına açılıyor',
            entrance1: 'Güneydeki kapı evi',
            secret: 'Çanı çalarsan bütün manastır kuleye koşar; o sırada mahzene ya da kiliseye geçersin. Kulenin penceresinden kaçabilirsin.',
            leader: { day: 'Reis kilisede, sunağın başında keseyle.', night: 'Reis kilisede uyuyor.' },
            traps: 'Avluda ve mahzende kırık taş ve kemik var: eğilsen de ses çıkar. Mahzen kilitli, anahtar hücrelerdeki bekçide.'
        }
    },
    crypt: {
        name: 'Kemikli Katakomp', kind: 'Katakomp', theme: 'stone', sky: 'under', hide: 'tomb', crunchLook: 'bones', crunch: 'Kemikler ayağının altında çatırdadı!',
        map: [
            '##################################',
            '#.P..P..##.C...k$k...c.###########',
            '#b.....t##.............####B,,,,##',
            '####D#####.H.........H.####,,,L,##',
            '###...####T...........T####,,,,,##',
            '###...##########X##########,,,,,##',
            '###H,,##B...........,,,,.##,,,,,##',
            '###,,,##.h..........,,,,.##,,,,,##',
            '###,,,##........F........##,,,,H##',
            '###.......................v,,,,,##',
            '###..H##.,,,,,.........s.##,,,,,##',
            '###...##.,,,,,..........B##,,,,,##',
            '###H..#########....########s,,,,##',
            '###...#########...,,,,,####,,,,,##',
            '###.S.#########...,H.c,####,,t,,##',
            '###...#########...,,,,,####,,,,B##',
            '###############...,,,,b###########',
            '###############...################',
            '###############E@E################'],
        ambient: { day: .04, night: .03 }, outside: { day: .5, night: .12 },
        lights: [{ x: 16, y: 2, r: 110, i: .75, kind: 'candle' }], dayLights: [{ x: 16, y: 17, r: 120, i: .5, kind: 'mouth' }],
        guards: [
            { x: 16, y: 10, type: 'post', face: 'down', sweep: .8 },
            { x: 15, y: 8, type: 'dice', face: 'right', night: 'sleep' },
            { x: 17, y: 8, type: 'dice', face: 'left', night: 'sleep' },
            { x: 16, y: 7, type: 'dice', face: 'down', night: 'sleep' },
            { x: 4, y: 4, type: 'patrol', route: [[4, 4], [4, 15], [4, 9], [8, 9]] },
            { x: 25, y: 9, type: 'patrol', route: [[25, 9], [29, 9], [29, 4], [29, 13], [29, 9]] },
            { x: 16, y: 3, type: 'leader', face: 'down', night: 'sleep', leader: true }],
        ambush: { room: [27, 2, 31, 15], doors: [], block: [[26, 9]], spawns: [[28, 4], [30, 13]], where: 'kemiklik' },
        chests: { C: [70, 120], c: [150, 210] }, loot: 'axe_steel',
        lever: { opens: [[16, 5]] },
        news: 'Mezarcı: "Sağ ol! Kemikliğin dibinde bir kol var; sunağın önündeki taşları indiriyor."',
        intel: {
            entrances: 'Mezarlıktan inen merdiven; kemikliğe kadar uzanan eski bir kapak',
            entrance1: 'Mezarlıktan inen merdiven',
            secret: 'Kemikliğin dibindeki kol sunağa giden taşları indirir. Tutsakların hücresinden kemikliğe bir kapak var.',
            leader: { day: 'Reis taşların ardındaki sunakta, keseyle.', night: 'Reis sunakta uyuyor.' },
            traps: 'Yerler kemik dolu: eğilsen de ses çıkar. Batı galerisinde gizli diken, tünelde yarasalar var. Sunağın sağındaki sandık tuzaklı.'
        }
    },
    farm: {
        name: 'Köpekli Çiftlik', kind: 'Çiftlik', theme: 'house', sky: 'open', hide: 'hay', indoor: [[3, 3, 13, 9], [22, 3, 33, 10]],
        map: [
            'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
            'OffffffffffffffffffffffffffffffffffO',
            'OfOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOfO',
            'OfO###########OOOOOOOO############fO',
            'OfO#m.h..#..$#OOOOOOOO#.P.P......#fO',
            'OfO#.kk..#...#OOOOOOOO#........H.#fO',
            'OfOW.....D...#OOOOOHOO#s.........#fO',
            'OfO#B...s#...#OOOOOOOO#..........#fO',
            'OfO#.....#H.C#OOOOOOOO#b.......H.#fO',
            'OfO####D######OOOOOOOO#........c.#fO',
            'OfOOOOOOOOOOOOOOOOOOOO#####DD#####OO',
            'OfOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOfO',
            'OfOOOOOOOOOOOOOHOOOOOOOOOOOOOOOOOOfO',
            'OfOOOOOOOOOOOOOOOOOOOOOffffAffffOOfO',
            'OfOOOOOOOOOObbOOOOOOOOOfOOOOOOOfOOfO',
            'OfOOHOOOOOOOOOOOOOOOOOOfOOOOOOOfOOfO',
            'OfOOOOOOOOOOOOOOOOOOsOOfffffffffOOfO',
            'OfOOOOOOOOOOOOOOOOOOOOOOOOOOOOOHOOfO',
            'OfffffffffffffffOOOffffffffffffffffO',
            'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
            'EEEEEEEEEEEEEEEEE@EEEEEEEEEEEEEEEEEE'],
        ambient: { day: .32, night: .06 }, outside: { day: .95, night: .2 },
        lights: [{ x: 6.5, y: 5, r: 110, i: .8, kind: 'candle' }, { x: 11, y: 5, r: 90, i: .6, kind: 'candle' }], dayLights: [{ x: 2, y: 6, r: 140, i: .5, kind: 'window' }],
        guards: [
            { x: 15, y: 11, type: 'patrol', dog: true, route: [[15, 11], [21, 11], [21, 17], [15, 17]] },
            { x: 27, y: 11, type: 'post', face: 'down', dog: true },
            { x: 17, y: 13, type: 'post', face: 'down', sweep: .9 },
            { x: 5, y: 12, type: 'patrol', route: [[5, 12], [12, 12], [12, 16], [5, 16]] },
            { x: 5, y: 6, type: 'dice', face: 'right', night: 'sleep' },
            { x: 8, y: 5, type: 'dice', face: 'left', night: 'sleep' },
            { x: 11, y: 6, type: 'leader', face: 'left', night: 'sleep', leader: true }],
        ambush: { room: [23, 4, 32, 9], doors: [[27, 10], [28, 10]], spawns: [[23, 9], [32, 4]], where: 'ahır' },
        pen: { horses: [[25, 14], [28, 15], [30, 14]], box: [24, 14, 30, 15] },
        chests: { C: [60, 100], c: [130, 180] }, loot: 'gloves',
        news: 'Çiftçi: "Sağ ol! Köpekler mutfaktaki ete bayılır; birini atarsan peşinden koşarlar."',
        intel: {
            entrances: 'Güneydeki çit kapısı; doğu çitinde bir gedik',
            entrance1: 'Güneydeki çit kapısı',
            secret: 'Doğu çitindeki gedikten girersen kapı nöbetçisine görünmezsin. Mutfaktaki kilerde köpekleri oyalayacak et var.',
            leader: { day: 'Reis evin yatak odasında, keseyle.', night: 'Reis yatak odasında uyuyor.' },
            traps: 'İki bekçi köpeği var: seni karanlıkta da koklarlar ve havlarlar. Ahırdaki sandık tuzaklı.'
        }
    },
    tavern: {
        name: 'Kör Baykuş Hanı', kind: 'Han', theme: 'house',
        map: [
            '##################################',
            '#B.P.P...b.....T....s.s.B.########',
            '#.........................########',
            '#BB...s....H..............########',
            '#.......S.......B....t....########',
            '#c.....b.......s......C...########',
            '##################################',
            '#F...........w....#h.k...i#..$...#',
            '#.................#.......#......#',
            '#.......kkk.......#.......D....k.#',
            '#.............h...D.......#......#',
            '#.............kk..#.......#......#',
            '#.kkkk........h...#.....t.#H....C#',
            '#B...........H....#B.....s#......#',
            '#########D############D###########',
            'OOOOOOOOO@OOOOOOOOOOOOOOOOOOOOOOOO',
            'EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE'],
        ambient: { day: .34, night: .08 }, outside: { day: .95, night: .26 },
        lights: [{ x: 9, y: 9, r: 120, i: .8, kind: 'candle' }, { x: 29, y: 8, r: 100, i: .7, kind: 'candle' }, { x: 22, y: 8, r: 90, i: .6, kind: 'candle' }],
        dayLights: [],
        guards: [
            { x: 8, y: 8, type: 'dice', face: 'down' },
            { x: 10, y: 10, type: 'dice', face: 'up' },
            { x: 11, y: 9, type: 'dice', face: 'left' },
            { x: 3, y: 10, type: 'patrol', route: [[3, 10], [16, 10], [16, 13], [3, 13]] },
            { x: 21, y: 9, type: 'post', face: 'right', night: 'sleep' },
            { x: 12, y: 2, type: 'post', face: 'left', night: 'sleep' },
            { x: 30, y: 10, type: 'leader', face: 'left', night: 'sleep', leader: true }],
        ambush: { room: [27, 7, 32, 13], doors: [[26, 9]], spawns: [[27, 13], [32, 8]], where: 'hancının odası' },
        chests: { C: [70, 110], c: [140, 190] }, loot: 'cap',
        news: 'Hancı: "Tanrı senden razı olsun! Mutfakta uyku otu kurur; fıçıya katarsan zar oynayanlar sızar."',
        intel: {
            entrances: 'Hanın ön kapısı; arka avludan mutfak kapısı',
            entrance1: 'Hanın ön kapısı',
            secret: 'Mutfaktaki zemin kapağı mahzene iner; tutsaklar orada. Mutfakta kurumaya asılmış uyku otu var.',
            leader: { day: 'Reis hancının odasında keseyi sayıyor.', night: 'Reis hancının odasında uyuyor.' },
            traps: 'Salonda üç haydut fıçının başında zar oynuyor, gece bile. Mahzende gizli diken var.'
        }
    },
    quarry: {
        name: 'Kırık Taş Ocağı', kind: 'Taş Ocağı', theme: 'stone', sky: 'open', crunchLook: 'gravel', crunch: 'Çakıllar ayağının altında kaydı!', indoor: [[3, 14, 10, 18]],
        map: [
            '##################################',
            'E.....,,,,,,,,,...........s......#',
            '@.....,,,,,,,,,..................#',
            'E...................bb...........#',
            '#...........H....................#',
            '##JJJJJJJJJJJJJJJJJJJJJJJJJJJJJ..#',
            '#................................#',
            '#.......,,,,,,,,,,,,,.....YY..B..#',
            '#....H..,,,,,,,,,,,,,.....YY.....#',
            '#.......,,,,,,,,,,,,,............#',
            '#...............Z.....s..........#',
            '#................................#',
            '#..JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ#',
            '#............b.....b.............#',
            '#..####D###............|||K||||..#',
            '#..#C...$.#.....z......|.....c|..#',
            '#..#......#,,,,,k,,,,..|.P..P.|..#',
            '#..#h.k...#,,,,,,,,,,..|......|..#',
            '#..########,,,,,,,,,,..||||||||..#',
            '###############...################',
            '###############EEE################'],
        ambient: { day: .3, night: .06 }, outside: { day: .9, night: .16 },
        lights: [{ x: 7, y: 16, r: 100, i: .7, kind: 'candle' }], dayLights: [],
        guards: [
            { x: 8, y: 3, type: 'patrol', route: [[8, 3], [31, 3], [31, 4]] },
            { x: 27, y: 8, type: 'tower', face: 'left', sweep: 1.1, dx: 16 },
            { x: 4, y: 9, type: 'patrol', route: [[4, 9], [24, 9], [24, 7], [4, 7]] },
            { x: 2, y: 11, type: 'post', face: 'down', night: 'sleep' },
            { x: 15, y: 15, type: 'dice', face: 'right', night: 'sleep' },
            { x: 17, y: 15, type: 'dice', face: 'left', night: 'sleep' },
            { x: 16, y: 18, type: 'post', face: 'up', sweep: 1 },
            { x: 6, y: 16, type: 'leader', face: 'right', night: 'sleep', leader: true }],
        ambush: { room: [4, 15, 9, 17], doors: [[7, 14]], spawns: [[4, 16], [9, 16]], where: 'ustanın kulübesi' },
        chests: { C: [70, 110], c: [140, 200] }, loot: 'gauntlets',
        news: 'Taşçı: "Sağ ol! Orta sekideki halat vincin taşını tutuyor; kesersen altındakiler bayılır."',
        intel: {
            entrances: 'Batı yamacındaki patika (ocağın tepesine çıkar); güneydeki taş yolu',
            entrance1: 'Batı yamacındaki patika',
            secret: 'Sekilerden aşağı atlayabilirsin ama geri tırmanamazsın; haydutlar uzun rampalardan dolaşır. Çıkış güneyde.',
            leader: { day: 'Reis aşağıda, ustanın kulübesinde keseyle.', night: 'Reis kulübede uyuyor.' },
            traps: 'Çakıllı yerler gürültülü. Orta sekide bir gözcü kulesi var. Vincin taşı zar oynayanların tam üstünde asılı. Tutsakların kafesindeki sandık tuzaklı.'
        }
    },
    keep: {
        name: 'Kartal Burcu', kind: 'Kale', theme: 'stone', sky: 'open', hide: 'barrel', indoor: [[2, 1, 31, 6], [18, 12, 24, 16]],
        map: [
            'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
            'OO##############################OO',
            'OO#.s.b.#C.T..k$k...T..b.#P..cP#OO',
            'OO#.....D................#.....#OO',
            'OO#.....#F...............W.....#OO',
            'OO#b...s#H..............B#b....#OO',
            'OO###D##########D###########d###OO',
            'OO#............................#OO',
            'OO#............................#OO',
            'OO#H......BB...................#OO',
            'OOD............................#OO',
            'OO#............................#OO',
            'OO#S..YY..........###D###......#OO',
            'OO#...YY..........#.L.b.#.......OO',
            'OO#...........B...#.....#...H..#OO',
            'OO#.........H.....#s....#......#OO',
            'OO##############XX##############OO',
            'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
            'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
            'EEEEEEEEEEEEEEEE@EEEEEEEEEEEEEEEEE'],
        ambient: { day: .3, night: .06 }, outside: { day: .9, night: .18 },
        lights: [{ x: 16, y: 3, r: 130, i: .8, kind: 'candle' }, { x: 28, y: 3, r: 80, i: .5, kind: 'candle' }], dayLights: [],
        guards: [
            { x: 3, y: 10, type: 'post', face: 'right', sweep: .8 },
            { x: 7, y: 13, type: 'tower', face: 'right', sweep: 1.2, dx: 16 },
            { x: 4, y: 8, type: 'patrol', route: [[4, 8], [29, 8], [29, 11], [10, 11], [10, 8]] },
            { x: 28, y: 8, type: 'post', face: 'down', key: true, night: 'sleep' },
            { x: 4, y: 3, type: 'sleep', face: 'right' },
            { x: 6, y: 4, type: 'sleep', face: 'left' },
            { x: 20, y: 14, type: 'post', face: 'up', night: 'sleep' },
            { x: 15, y: 3, type: 'leader', face: 'down', night: 'sleep', leader: true }],
        ambush: { room: [9, 2, 24, 5], doors: [[16, 6], [8, 3]], spawns: [[10, 5], [24, 2]], where: 'büyük salon' },
        chests: { C: [80, 130], c: [160, 220] }, loot: 'greaves',
        lever: { opens: [[16, 16], [17, 16]] },
        news: 'Kale kâtibi: "Sağ ol! Kapı odasındaki kol demir parmaklığı kaldırır; çıkış oradan dümdüz."',
        intel: {
            entrances: 'Batı duvarında küçük bir arka kapı; doğu duvarında yıkık bir gedik',
            entrance1: 'Batı duvarında küçük bir arka kapı',
            secret: 'Doğu duvarındaki gedik avluya açılır. Kapı odasındaki kol ana kapının parmaklığını kaldırır. Salonun doğu penceresi zindana çıkar.',
            leader: { day: 'Reis büyük salonda, ocağın yanında keseyle.', night: 'Reis salonda uyuyor.' },
            traps: 'Avluda bir gözcü kulesi var. Zindan kilitli, anahtar zindan kapısındaki bekçide. Arka kapının içinde gizli diken.'
        }
    },
    tamer: {
        name: 'Ayıcının Kampı', kind: 'Kamp', theme: 'camp', hide: 'hay',
        map: [
            'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
            'O##################################O',
            'O#................................#O',
            'O#.|||||||..s.............nnnnnnn.#O',
            'O#.|.....|...T......T...c.n$..C.n.#O',
            'O#.|P...P|................n.....n.#O',
            'O#.|.....|................n.h...n.#O',
            'O#.|||K|||...fffffffff....nnn.nnn.#O',
            'O#...........f.......f............#O',
            'O#H..........f...y...f...........H#O',
            'O#...........f.b.....f.............O',
            'O#.nnnn......f.......f......nnnn..#O',
            'O#.nnnn......ffff.ffff......nnnn..#O',
            'O#.nnnn...m.................nnnn..#O',
            'O#.....................fAff.......#O',
            'O#.nnnn.F..............f..f.nnnn..#O',
            'O#.nnnn....B...........f..f.nnnn..#O',
            'O#.nnnn................f..f.nnnn..#O',
            'O#...................H.ffff.......#O',
            'O#................................#O',
            'O################DD################O',
            'EEEEEEEEEEEEEEEEE@EEEEEEEEEEEEEEEEEE'],
        ambient: { day: .7, night: .1 }, outside: { day: .9, night: .15 },
        lights: [], dayLights: [],
        guards: [
            { x: 16, y: 19, type: 'post', face: 'down' },
            { x: 19, y: 19, type: 'post', face: 'down' },
            { x: 8, y: 14, type: 'dice', face: 'right', night: 'sleep' },
            { x: 8, y: 16, type: 'dice', face: 'up', night: 'sleep' },
            { x: 12, y: 9, type: 'patrol', dog: true, route: [[12, 9], [12, 14], [22, 14], [22, 9]] },
            { x: 7, y: 9, type: 'post', face: 'up', dog: true },
            { x: 23, y: 8, type: 'patrol', route: [[23, 8], [32, 8], [32, 10], [23, 10]] },
            { x: 29, y: 5, type: 'leader', face: 'down', night: 'sleep', leader: true }],
        ambush: { room: [27, 4, 31, 6], doors: [], spawns: [[27, 6], [31, 5]], where: 'reisin çadırı' },
        pen: { horses: [[24, 15], [25, 17]], box: [24, 15, 25, 17] },
        chests: { C: [70, 120], c: [150, 210] }, loot: 'mail',
        news: 'Ayı oynatıcısı: "Sağ ol! Ayımı kafesinden salarsan haydutlara saldırır; köpekler de ete gelir."',
        intel: {
            entrances: 'Güneydeki kamp kapısı (iki nöbetçi); doğu çitinde bir gedik',
            entrance1: 'Güneydeki kamp kapısı (iki nöbetçi)',
            secret: 'Arenadaki kafeste bir ayı var: salarsan haydutlara saldırır, onlar ayıyla uğraşırken sen işini görürsün. Doğu çitinde gedik.',
            leader: { day: 'Reis kendi çadırında keseyle.', night: 'Reis çadırında uyuyor.' },
            traps: 'İki bekçi köpeği koku alır. Tutsak kafesi kilitli. Kafesin yanındaki sandık tuzaklı.'
        }
    },
    forest: {
        name: 'Kızılağaç Sığınağı', kind: 'Orman', theme: 'forest', sky: 'open', fog: .75, hide: 'log', crunchLook: 'leaves', crunch: 'Kuru yapraklar ayağının altında hışırdadı!',
        map: [
            '####################################',
            '##.................................#',
            '##...........~~~################...#',
            '##.,,,,,,,s,.~~~.rrr...............#',
            '##.,,,,,,,,,.~~~.rrr....nnnnn.c....#',
            '##...........~~~.rrr....n$.Cn......#',
            '##...........%%%.rrr....nn.nn......#',
            '##..H........%%%...................#',
            '##...........%%%....nnn............#',
            '##...........%%%.H..nnn......nnn...#',
            '#######.#####%%%.......F.....nnnJJJ#',
            '##...........~~~.................###',
            '##.rrrr......~~~...P..,,,,,.H....###',
            '##.rrrr......~~~......,,,,,......###',
            '##......,,,,.~~~...P..,,,,,..rrr.###',
            '##......,,,,.~~~......,,,,,..rrr.###',
            '##....#######~~~rrrrrb.......rrr.###',
            '##....#######~~~rrrrr........rrr.###',
            '##....#######~~~####################',
            '##....##############################',
            'EEE@EEE#############################'],
        ambient: { day: .6, night: .08 }, outside: { day: .85, night: .14 },
        lights: [], dayLights: [],
        guards: [
            { x: 15, y: 13, type: 'post', face: 'left', sweep: 1 },
            { x: 22, y: 10, type: 'dice', face: 'right', night: 'sleep' },
            { x: 24, y: 11, type: 'dice', face: 'up', night: 'sleep' },
            { x: 18, y: 8, type: 'patrol', route: [[18, 8], [30, 8], [30, 16], [22, 16], [21, 12]] },
            { x: 8, y: 6, type: 'patrol', route: [[8, 6], [8, 2], [30, 1], [8, 2]] },
            { x: 27, y: 12, type: 'post', face: 'left', night: 'sleep' },
            { x: 26, y: 5, type: 'leader', face: 'down', night: 'sleep', leader: true }],
        ambush: { room: [22, 12, 26, 15], doors: [], spawns: [[22, 15], [26, 12]], where: 'çukur' },
        chests: { C: [60, 100], c: [130, 180] }, loot: 'bow_steel',
        news: 'Oduncu: "Sağ ol! Doğudaki kayadan çukura atlarsan derenin nöbetçisini hiç görmezsin."',
        intel: {
            entrances: 'Güneybatıdan gelen patika ve dereden geçen sığ geçit; kuzeydeki eski kömürcü yolu',
            entrance1: 'Güneybatıdan gelen patika',
            secret: 'Kuzeydeki kömürcü yolu doğudaki kayaya çıkar; oradan çukura atlarsın. Derenin derin göleti yüzülerek geçilir.',
            leader: { day: 'Reis çadırında keseyle.', night: 'Reis çadırında uyuyor.' },
            traps: 'Sis var. Kuru yapraklar hışırdar. Çalılıkta eğilirsen zor görünürsün. Doğudaki sandık tuzaklı.'
        }
    },
    cistern: {
        name: 'Batık Sarnıç', kind: 'Sarnıç', theme: 'stone', sky: 'under', hide: 'tomb',
        map: [
            '##################################',
            '##............C.$k.c............##',
            '##.%%%%%%%%%%%%%..%%%%%%%%%%%%%.##',
            '##.%%%%%%%%%%%%%..%%%%%%%%%%%%%.##',
            '##.%%#%%%#%%%#%%..%%%#%%%#%%%#%.##',
            '##.%%%%%%%%%%%%%..%%%%H.....%%%.##',
            '##.%%%%%%%%%%%%%..%%%%.P..P.%%%.##',
            '##.%%#%%%#%%%#%%..%%%#......%#%.##',
            '##.%%%%%%%%%%%%%..%%%%.....B%%%.##',
            '##.%%%%%%%%%%%%%..%%%%%%%%%%%%%.##',
            '##.%%#%%%#%%%#%%..%%%#%%%#%%%#%.##',
            '##.%%%%%%%%%%%%%..%%%%%%%%%%%%%.##',
            '#L.%%%%%%%%%%%%%..%%%%%%%%%%%%%.##',
            '##..............................##',
            '###########################...####',
            '###########################.v.####',
            '###########################...####',
            '###########################...####',
            '###########################E@E####'],
        ambient: { day: .06, night: .04 }, outside: { day: .5, night: .12 },
        lights: [{ x: 16.5, y: 1, r: 140, i: .8, kind: 'candle' }, { x: 2, y: 6, r: 130, i: .8, kind: 'torch' }, { x: 31, y: 6, r: 130, i: .8, kind: 'torch' }], dayLights: [{ x: 28, y: 16, r: 120, i: .5, kind: 'mouth' }, { x: 9, y: 6, r: 120, i: .45, kind: 'mouth' }, { x: 24, y: 7, r: 120, i: .45, kind: 'mouth' }],
        guards: [
            { x: 24, y: 13, type: 'post', face: 'right', sweep: .8 },
            { x: 2, y: 12, type: 'patrol', route: [[2, 12], [15, 13], [2, 13], [2, 2]] },
            { x: 17, y: 9, type: 'patrol', route: [[17, 12], [17, 2], [16, 2], [16, 12]] },
            { x: 31, y: 2, type: 'patrol', route: [[31, 2], [31, 12], [31, 2], [20, 1]] },
            { x: 24, y: 8, type: 'post', face: 'left', night: 'sleep' },
            { x: 17, y: 2, type: 'leader', face: 'down', night: 'sleep', leader: true }],
        ambush: { room: [22, 5, 27, 8], doors: [], spawns: [[22, 8], [27, 5]], where: 'su içindeki set' },
        chests: { C: [70, 120], c: [150, 210] }, loot: 'shoes',
        lever: { opens: [], drains: [2, 2, 15, 12] },
        news: 'Sucu: "Sağ ol! Batı köşedeki savak kolu batı havuzunu boşaltır; ama o zaman haydutlar da yürür."',
        intel: {
            entrances: 'Doğudaki yıkık merdiven',
            entrance1: 'Doğudaki yıkık merdiven',
            secret: 'Tutsaklar doğu havuzunun ortasındaki sette; oraya ancak yüzerek varılır. Batı köşedeki savak kolu batı havuzunun suyunu boşaltır.',
            leader: { day: 'Reis kuzeydeki sekide, eski kuyunun altında keseyle.', night: 'Reis sekide uyuyor.' },
            traps: 'Merdivende yarasalar var. Haydutlar yüzemez; suda yüzerken seni zor görürler. Sekideki sandık tuzaklı.'
        }
    },
    caravan: {
        name: 'Terk Edilmiş Kervansaray', kind: 'Kervansaray', theme: 'stone', sky: 'open', hide: 'barrel', indoor: [[1, 1, 34, 6], [1, 6, 6, 18], [29, 6, 34, 18]],
        map: [
            'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
            'O##################################O',
            'O#i.s..b....#....w.....#P..P..c.$.#O',
            'O#..........D.kkk......#..........#O',
            'O#..........#..........#..........#O',
            'O#B.....b...#h.........#C.......b.#O',
            'O###D############D##########d######O',
            'O#....#......................#....#O',
            'O#m...#......................#....#O',
            'O#....D.B........H........s..#.fff#O',
            'O#....#......................#.f.f#O',
            'O#....#......................#.A.f#O',
            'OW....#......................#.f.f#O',
            'O#....#......................#.fff#O',
            'O#....#..b...............b...#....#O',
            'O#B..s#......................D....#O',
            'O#....#....T............T....#....#O',
            'O#....#......................#....#O',
            'O###############...################O',
            'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
            'EEEEEEEEEEEEEEEEE@EEEEEEEEEEEEEEEEEE'],
        ambient: { day: .3, night: .06 }, outside: { day: .95, night: .2 },
        lights: [{ x: 15, y: 3, r: 110, i: .75, kind: 'candle' }, { x: 28, y: 3, r: 90, i: .6, kind: 'candle' }], dayLights: [{ x: 2, y: 12, r: 120, i: .5, kind: 'window' }],
        guards: [
            { x: 11, y: 15, type: 'post', face: 'right', dog: true },
            { x: 22, y: 15, type: 'post', face: 'left', sweep: .8 },
            { x: 8, y: 8, type: 'patrol', route: [[8, 8], [27, 8], [27, 13], [8, 13]] },
            { x: 14, y: 4, type: 'dice', face: 'up' },
            { x: 16, y: 4, type: 'dice', face: 'up' },
            { x: 17, y: 3, type: 'dice', face: 'left' },
            { x: 28, y: 7, type: 'post', face: 'down', key: true, night: 'sleep' },
            { x: 30, y: 16, type: 'patrol', dog: true, route: [[30, 16], [30, 8], [33, 8], [33, 15]] },
            { x: 30, y: 3, type: 'leader', face: 'left', night: 'sleep', leader: true }],
        ambush: { room: [24, 2, 33, 5], doors: [[28, 6]], spawns: [[24, 3], [33, 4]], where: 'hazine odası' },
        pen: { horses: [[32, 10], [32, 12]], box: [32, 10, 32, 12] },
        chests: { C: [90, 140], c: [170, 230] }, loot: 'axe',
        news: 'Kervancı: "Sağ ol! Ambarda uyku otu var; çay odasındaki fıçıya katarsan zarcılar sızar. Anahtar kâhyanın kemerinde."',
        intel: {
            entrances: 'Güneydeki büyük kapı (köpekli nöbet); mutfağın batı penceresi',
            entrance1: 'Güneydeki büyük kapı',
            secret: 'Mutfağın penceresinden girersen kapıdaki köpeğe görünmezsin. Ambardaki uyku otu, çay odasının fıçısına katılabilir.',
            leader: { day: 'Reis kilitli hazine odasında keseyle; anahtar kâhyada.', night: 'Reis hazine odasında uyuyor.' },
            traps: 'Kapıda ve ahırda birer köpek var. Hazine odası kilitli. Hazine odasının sandığı tuzaklı.'
        }
    }
};
// A lair spawned before 2.9.0 carries no `layout`: its id picks one of the first three, as it
// always did, so a place you'd seen doesn't change. A newer lair is given its layout when it's
// made (Game.pickLayout, from DENS: every level but the mine).
const LAYOUTS = ['house', 'cave', 'camp'];
const DENS = Object.keys(LEVELS).filter(k => !LEVELS[k].mine);
// what a level has that needs explaining: the tour and the card's help show those steps only
function feats(lv) {
    const m = lv.map.join(''), f = new Set();
    if(lv.guards.some(g => g.dog)) f.add('dog');
    if(/d/.test(m)) f.add('key');
    if(/[%r]/.test(m)) f.add('water');
    if(/G/.test(m)) f.add('bell');
    if(/w/.test(m)) f.add('herb');
    if(/Z/.test(m)) f.add('drop');
    if(/y/.test(m)) f.add('bear');
    if(/J/.test(m)) f.add('ledge');
    if(/,/.test(m)) f.add('loud');
    if(lv.mine) f.add('mine');
    return f;
}
// what Gözcülük (spotting) tells you: numbers and entrances, then the sketch and the traps,
// then a laid ambush, then the secret way in and the leader's habits
const INTEL = { basic: 2, sketch: 4, ambush: 5, secret: 7 };
const AMBUSH_CHANCE = 0.4;
// an open assault is the ordinary battle — against more of them: they whistle for help
const ASSAULT_REINFORCE = 1.35;

// ---------- run state ----------
let L = null, G = null, R = null;   // level def, live game, the run's settings (site, time, skills, approach)
let canvas = null, ctx = null, DPR = 1, Z = 2, VW = 0, VH = 0;
let loopId = null, last = 0, paused = false, built = false;

// ---------- tile helpers ----------
const WALLS = new Set(['#', ' ']);
function tile(x, y) { if(y < 0 || y >= G.h || x < 0 || x >= G.w) return ' '; return G.grid[y][x]; }
function obj(x, y) { return G.objs[y * G.w + x]; }
const SOLID_T = new Set(['n', 'f', '|', 'Y', 'J']);
// deep water: the hero, the squad and freed prisoners swim it; bandits, dogs and the bear won't
const swims = c => !c || c.kind === 'player' || c.kind === 'squad' || c.kind === 'prisoner';
function solidFor(c, x, y) { return solidTile(x, y) || (tile(x, y) === '%' && !swims(c)); }
function solidTile(x, y) {
    const c = tile(x, y);
    if(WALLS.has(c) || c === 'W' || SOLID_T.has(c)) return true;
    if(c === 'X') return !G.opened.has(x + ',' + y);
    if(c === 'D') { const d = G.doors[x + ',' + y]; return !d || !d.open; }
    const o = obj(x, y);
    return !!(o && o.solid && !o.gone);
}
// vision is blocked by walls, shut doors, rubble and tall cover (crates, barrels, sacks); not by tables, water or windows
function opaque(x, y) {
    const c = tile(x, y);
    if(WALLS.has(c) || c === 'n') return true;
    if(c === 'X') return !G.opened.has(x + ',' + y);
    if(c === 'D') { const d = G.doors[x + ',' + y]; return !d || !d.open; }
    const o = obj(x, y);
    return !!(o && o.cover && !o.gone);
}
function los(ax, ay, bx, by, ignoreEnd) {
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy), n = Math.ceil(d / 8);
    const ex = Math.floor(bx / TS), ey = Math.floor(by / TS), sx = Math.floor(ax / TS), sy = Math.floor(ay / TS);
    for(let i = 1; i < n; i++) {
        const tx = Math.floor((ax + dx * i / n) / TS), ty = Math.floor((ay + dy * i / n) / TS);
        if((tx === sx && ty === sy) || (ignoreEnd && tx === ex && ty === ey)) continue;
        if(opaque(tx, ty)) return false;
    }
    return true;
}
const isOutside = (x, y) => { const c = tile(x, y); return c === 'O' || c === 'E' || c === '@'; };
// under the open sky: the outside ground, or (a level that names its roofed parts) anything not under one
const roofed = (x, y) => !!L.indoor && L.indoor.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);
const skyAt = (x, y) => isOutside(x, y) || (!!L.indoor && !roofed(x, y) && !WALLS.has(tile(x, y)));
function isExit(tx, ty) { const c = tile(tx, ty); return c === 'E' || c === '@'; }

// ---------- lighting ----------
function buildLight() {
    const amb = L.ambient[R.time], out = L.outside[R.time];
    G.light = new Float32Array(G.w * G.h);
    const lights = G.lights.filter(l => !l.off);
    for(let y = 0; y < G.h; y++) for(let x = 0; x < G.w; x++) {
        let v = skyAt(x, y) ? out : amb;     // a level out under the sky names its roofed parts (`indoor`)
        const cx = x * TS + 16, cy = y * TS + 16;
        for(const l of lights) {
            const d = Math.hypot(cx - l.px, cy - l.py);
            if(d < l.r && (d < 24 || los(l.px, l.py, cx, cy, true))) v += l.i * (1 - d / l.r);
        }
        G.light[y * G.w + x] = Math.min(1.2, v);
    }
    // the dark layer: one pixel per tile, drawn smoothed and big — soft light for nothing
    const c = G.darkCanvas || (G.darkCanvas = document.createElement('canvas'));
    c.width = G.w; c.height = G.h;
    const x2 = c.getContext('2d'), id = x2.createImageData(G.w, G.h);
    for(let i = 0; i < G.w * G.h; i++) {
        const v = clamp(G.light[i], 0, 1), a = Math.round(255 * Math.pow(1 - v, 1.15) * .94);
        id.data[i * 4] = 4; id.data[i * 4 + 1] = 5; id.data[i * 4 + 2] = 12; id.data[i * 4 + 3] = a;
    }
    x2.putImageData(id, 0, 0);
}
function lightAt(px, py) {
    const x = clamp(Math.floor(px / TS), 0, G.w - 1), y = clamp(Math.floor(py / TS), 0, G.h - 1);
    return G.light[y * G.w + x];
}
// The glows and the player's sight hole are gradients: baked once, stamped scaled every frame
const BAKED = {};
function glowSprite(kind) {
    if(BAKED[kind]) return BAKED[kind];
    const c = document.createElement('canvas'), R0 = 64; c.width = c.height = R0 * 2;
    const x = c.getContext('2d'), g = x.createRadialGradient(R0, R0, 2, R0, R0, R0);
    if(kind === 'hole') { g.addColorStop(0, 'rgba(0,0,0,.62)'); g.addColorStop(1, 'rgba(0,0,0,0)'); }
    else { g.addColorStop(0, kind === 'candle' ? 'rgba(255,190,110,.32)' : 'rgba(255,160,70,.38)'); g.addColorStop(1, 'rgba(255,120,40,0)'); }
    x.fillStyle = g; x.fillRect(0, 0, R0 * 2, R0 * 2);
    return (BAKED[kind] = c);
}

// ---------- baking the ground ----------
// A theme is a floor, a wall and the ground outside: `floor` planks | dirt | rock | flags | mud,
// `wall` beams | palisade | rock | blocks | trees, `out` the grass (or sand, or marsh) round it
const PAL = {
    house: { floor: 'planks', wall: 'beams', f: ['#6a4a30', '#5d412a', '#74523a', '#65462e'], seam: '#3b2819', nail: '#2a1c12', top: '#2a1f18', topHi: '#3c2d22',
             face: '#7a6754', faceHi: '#8c7862', faceLo: '#5b4b3c', beam: '#46311f', out: ['#3d5a2c', '#48673a', '#334c25'] },
    camp:  { floor: 'dirt', wall: 'palisade', f: ['#5e4d37', '#554430', '#66543c', '#4f3f2c'], seam: '#3e3222', nail: '#6e5c44', top: '#3a2718', topHi: '#5a3f26',
             face: '#6e4e30', faceHi: '#8a6440', faceLo: '#3e2a18', beam: '#2a1c10', out: ['#3d5a2c', '#48673a', '#334c25'], grass: '#4a6a35' },
    cave:  { floor: 'rock', wall: 'rock', f: ['#2f2b28', '#292522', '#35302c', '#26221f'], seam: '#1d1a18', nail: '#3d3833', top: '#141211', topHi: '#221e1b',
             face: '#3a342e', faceHi: '#4a423a', faceLo: '#27221e', beam: '#1d1916', out: ['#3a3f2c', '#48673a', '#334c25'] },
    // 2.9.0: dressed stone (a monastery, a keep, a crypt), a marsh, a harbour, a wood
    stone: { floor: 'flags', wall: 'blocks', f: ['#4a4744', '#43403d', '#504d49', '#3f3c39'], seam: '#2a2826', nail: '#5a5652', top: '#1c1b1d', topHi: '#2a292c',
             face: '#5e5a55', faceHi: '#77726b', faceLo: '#3e3b38', beam: '#33302d', out: ['#3a5230', '#465f3a', '#2f4427'] },
    swamp: { floor: 'mud', wall: 'trees', f: ['#3b3a26', '#34331f', '#423f2a', '#2e2d1c'], seam: '#24231a', nail: '#4c4a30', top: '#16261a', topHi: '#22381f',
             face: '#2a2618', faceHi: '#3a3420', faceLo: '#1c190f', beam: '#1a1a10', out: ['#2f4429', '#3a5233', '#26391f'], grass: '#3f5a2e' },
    dock:  { floor: 'planks', wall: 'beams', f: ['#6b604f', '#615646', '#756a57', '#5a5040'], seam: '#3a342a', nail: '#2a2620', top: '#262320', topHi: '#36322c',
             face: '#6e6556', faceHi: '#857b6a', faceLo: '#4e473c', beam: '#3a332a', out: ['#b8a676', '#c7b685', '#a8966a'] },
    forest:{ floor: 'dirt', wall: 'trees', f: ['#4a3d2a', '#423625', '#524430', '#3b3022'], seam: '#2e261b', nail: '#5c4c34', top: '#17301a', topHi: '#234524',
             face: '#2e2416', faceHi: '#3e3020', faceLo: '#1e170e', beam: '#1a140c', out: ['#35532a', '#406336', '#2b4521'], grass: '#4f7a36' }
};
function bakeGround() {
    const c = document.createElement('canvas'); c.width = G.w * 16; c.height = G.h * 16;   // 16 px per tile, drawn at 2x
    const x = c.getContext('2d'), P = PAL[L.theme];
    const px = (X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
    const isWall = ch => ch === '#' || ch === ' ' || ch === 'W';
    seed = 7;
    for(let ty = 0; ty < G.h; ty++) for(let tx = 0; tx < G.w; tx++) {
        const ch = tile(tx, ty), X = tx * 16, Y = ty * 16;
        if(ch === ' ') { x.fillStyle = '#060508'; x.fillRect(X, Y, 16, 16); continue; }
        if(ch === 'O' || ch === 'E' || ch === '@') {
            const road = ch !== 'O';
            x.fillStyle = road ? '#6d5a3e' : P.out[0]; x.fillRect(X, Y, 16, 16);
            for(let i = 0; i < 22; i++) px(X + (srand() * 16 | 0), Y + (srand() * 16 | 0), road ? (srand() < .5 ? '#7c6747' : '#5f4d35') : P.out[1 + (srand() < .5 ? 0 : 1)]);
            continue;
        }
        if(ch === '~' || ch === '%') {                                    // shallow water, and deep water (darker, no bottom showing)
            const deep = ch === '%';
            x.fillStyle = deep ? '#0d2230' : '#16323f'; x.fillRect(X, Y, 16, 16);
            for(let i = 0; i < 10; i++) px(X + (srand() * 16 | 0), Y + (srand() * 16 | 0), deep ? (srand() < .5 ? '#123040' : '#0a1a26') : (srand() < .5 ? '#1c3d4c' : '#122a35'));
            if(deep) for(const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if(tile(tx + dx, ty + dy) === '~') { x.fillStyle = 'rgba(40,90,110,.35)'; x.fillRect(X + (dx > 0 ? 14 : 0), Y + (dy > 0 ? 14 : 0), dx ? 2 : 16, dy ? 2 : 16); }
            continue;
        }
        if(ch === 'J') {                                                   // a ledge: a lip of rock, then the drop
            x.fillStyle = P.faceLo; x.fillRect(X, Y, 16, 16);
            x.fillStyle = P.faceHi; x.fillRect(X, Y, 16, 3);
            x.fillStyle = P.face; for(let i = 1; i < 16; i += 4) x.fillRect(X + i, Y + 4 + (i % 3), 2, 9);
            x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(X, Y + 13, 16, 3);
            continue;
        }
        if(P.wall === 'palisade' && ch === '#') {                          // the palisade: sharpened logs
            x.fillStyle = P.out[0]; x.fillRect(X, Y, 16, 16);
            for(let i = 0; i < 3; i++) {
                const lx = X + i * 5 + 1;
                x.fillStyle = '#2a1c10'; x.fillRect(lx - 1, Y + 1, 6, 15);
                x.fillStyle = i % 2 ? '#6e4e30' : '#7a5836'; x.fillRect(lx, Y + 2, 4, 14);
                x.fillStyle = '#8a6440'; x.fillRect(lx, Y + 2, 1, 14);
                x.fillStyle = '#a07a4e'; x.fillRect(lx + 1, Y, 2, 2);
            }
            continue;
        }
        if(P.wall === 'trees' && ch === '#') {                             // a thicket: canopy blobs, trunks where it meets open ground
            x.fillStyle = P.top; x.fillRect(X, Y, 16, 16);
            for(let i = 0; i < 5; i++) { const bx = X + (srand() * 12 | 0), by = Y + (srand() * 12 | 0); x.fillStyle = srand() < .5 ? P.topHi : '#2c5a2a'; x.fillRect(bx, by, 4 + (srand() * 3 | 0), 3 + (srand() * 3 | 0)); }
            for(let i = 0; i < 4; i++) px(X + (srand() * 16 | 0), Y + (srand() * 16 | 0), '#3f7238');
            if(!isWall(tile(tx, ty + 1))) { x.fillStyle = P.face; x.fillRect(X + 3, Y + 11, 3, 5); x.fillRect(X + 10, Y + 12, 3, 4); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(X, Y + 14, 16, 2); }
            continue;
        }
        if(ch === 'n' || ch === 'f' || ch === '|' || ch === 'Y') {          // floor under tents, fences, bars, tower
            for(let i = 0; i < 16; i++) for(let j = 0; j < 16; j += 4) { x.fillStyle = P.f[(i + j + tx + ty) % 4]; x.fillRect(X + i, Y + j, 1, 4); }
            if(ch === 'n') {
                // tent canvas: the sunlit slope on top, the shaded slope below, a ridge pole between
                // them, pegged edges and, on a free-standing tent's lower edge, a dark flap
                const e = (dx, dy) => tile(tx + dx, ty + dy) !== 'n';
                const top = e(0, -1), bot = e(0, 1);
                x.fillStyle = top ? '#b09c72' : bot ? '#7a6a4c' : '#948259'; x.fillRect(X, Y, 16, 16);
                x.fillStyle = top ? '#c2ad80' : bot ? '#8a7856' : '#a39064'; for(let i = 1; i < 16; i += 5) x.fillRect(X + i, Y, 1, 16);
                if(top && !bot) { x.fillStyle = '#5e4a30'; x.fillRect(X, Y + 14, 16, 2); }
                if(!top && !bot) { x.fillStyle = '#5e4a30'; x.fillRect(X, Y + 7, 16, 2); }
                x.fillStyle = '#4a3c28';
                if(top) x.fillRect(X, Y, 16, 2); if(bot) x.fillRect(X, Y + 13, 16, 3); if(e(-1, 0)) x.fillRect(X, Y, 2, 16); if(e(1, 0)) x.fillRect(X + 14, Y, 2, 16);
                if(bot && e(-1, 0) === false && e(1, 0) === false) { x.fillStyle = '#2a2016'; x.fillRect(X + 5, Y + 9, 6, 5); }
            }
            if(ch === 'f') { x.fillStyle = '#4a321e'; x.fillRect(X + 7, Y + 2, 2, 13); x.fillStyle = '#7a5836'; x.fillRect(X, Y + 5, 16, 2); x.fillRect(X, Y + 10, 16, 2); }
            if(ch === '|') { x.fillStyle = '#3a3a40'; for(let i = 1; i < 16; i += 4) x.fillRect(X + i, Y, 2, 16); x.fillStyle = '#7a7a86'; for(let i = 1; i < 16; i += 4) x.fillRect(X + i, Y, 1, 16); x.fillStyle = '#4a4a52'; x.fillRect(X, Y + 3, 16, 2); x.fillRect(X, Y + 12, 16, 2); }
            continue;
        }
        if(ch === '#' || ch === 'W') {
            x.fillStyle = P.top; x.fillRect(X, Y, 16, 16);
            for(let i = 0; i < 8; i++) px(X + (srand() * 16 | 0), Y + (srand() * 16 | 0), P.topHi);
            const below = tile(tx, ty + 1);
            if(!isWall(below)) {                                           // the wall's face toward the room
                x.fillStyle = P.face; x.fillRect(X, Y + 9, 16, 7);
                x.fillStyle = P.faceHi; x.fillRect(X, Y + 9, 16, 1);
                x.fillStyle = P.faceLo; x.fillRect(X, Y + 15, 16, 1);
                if(P.wall === 'beams') { x.fillStyle = P.beam; x.fillRect(X, Y + 8, 16, 1); if(tx % 3 === 0) x.fillRect(X + 7, Y + 9, 2, 7); }
                else if(P.wall === 'blocks') { x.fillStyle = P.faceLo; x.fillRect(X, Y + 12, 16, 1); x.fillRect(X + ((tx % 2) ? 4 : 11), Y + 9, 1, 3); x.fillRect(X + ((tx % 2) ? 10 : 2), Y + 13, 1, 3); }
                else for(let i = 0; i < 6; i++) px(X + (srand() * 16 | 0), Y + 10 + (srand() * 5 | 0), srand() < .5 ? P.faceHi : P.faceLo);
                if(P.wall === 'rock') for(let i = 0; i < 16; i += 2) if(srand() < .5) px(X + i, Y + 8, P.face);
                if(L.mine && tx % 4 === 1) { x.fillStyle = '#5c4128'; x.fillRect(X + 6, Y + 8, 4, 8); x.fillStyle = '#7a5532'; x.fillRect(X + 6, Y + 8, 1, 8); x.fillRect(X + 2, Y + 8, 12, 2); }
            }
            if(ch === 'W') {
                x.fillStyle = '#3b2a1c'; x.fillRect(X + 2, Y + 3, 12, 11);
                x.fillStyle = R.time === 'day' ? '#8fb8cf' : '#22384a'; x.fillRect(X + 3, Y + 4, 10, 9);
                x.fillStyle = '#3b2a1c'; x.fillRect(X + 7, Y + 4, 2, 9); x.fillRect(X + 3, Y + 8, 10, 1);
            }
            continue;
        }
        // floor
        if(P.floor === 'dirt' || P.floor === 'mud') {
            x.fillStyle = P.f[0]; x.fillRect(X, Y, 16, 16);
            for(let i = 0; i < 20; i++) px(X + (srand() * 16 | 0), Y + (srand() * 16 | 0), P.f[1 + (srand() * 3 | 0)]);
            if(P.grass && srand() < .3) { x.fillStyle = P.grass; x.fillRect(X + (srand() * 14 | 0), Y + (srand() * 14 | 0), 2, 1); }
            if(P.floor === 'mud' && srand() < .25) { x.fillStyle = 'rgba(20,40,40,.5)'; x.fillRect(X + (srand() * 10 | 0), Y + (srand() * 12 | 0), 5, 2); }
        } else if(P.floor === 'planks') {
            for(let r = 0; r < 4; r++) {
                x.fillStyle = P.f[(r + tx * 3 + ty) % 4]; x.fillRect(X, Y + r * 4, 16, 4);
                x.fillStyle = P.seam; x.fillRect(X, Y + r * 4 + 3, 16, 1);
                const cut = ((tx * 7 + ty * 3 + r * 5) % 16); x.fillRect(X + cut, Y + r * 4, 1, 3);
                if(srand() < .4) px(X + (cut + 3) % 16, Y + r * 4 + 1, P.nail);
            }
        } else if(P.floor === 'flags') {                                    // flagstones, two to a tile, offset by row
            x.fillStyle = P.f[(tx + ty) % 4]; x.fillRect(X, Y, 16, 16);
            x.fillStyle = P.f[(tx + ty + 2) % 4]; x.fillRect(X + (ty % 2 ? 0 : 8), Y, 8, 8); x.fillRect(X + (ty % 2 ? 8 : 0), Y + 8, 8, 8);
            x.fillStyle = P.seam; x.fillRect(X, Y + 7, 16, 1); x.fillRect(X + (ty % 2 ? 7 : 15), Y, 1, 7); x.fillRect(X + (ty % 2 ? 15 : 7), Y + 8, 1, 8);
            for(let i = 0; i < 6; i++) px(X + (srand() * 16 | 0), Y + (srand() * 16 | 0), P.nail);
        } else {
            x.fillStyle = P.f[0]; x.fillRect(X, Y, 16, 16);
            for(let i = 0; i < 26; i++) px(X + (srand() * 16 | 0), Y + (srand() * 16 | 0), P.f[1 + (srand() * 3 | 0)]);
            if(srand() < .25) { const a = srand() * 12 | 0, b = srand() * 12 | 0; x.fillStyle = P.seam; x.fillRect(X + a, Y + b, 3, 1); }
        }
        // reeds' roots: a wetter, greener patch (the stalks themselves stand up, drawn with the people)
        if(ch === 'r') { x.fillStyle = 'rgba(40,70,30,.55)'; x.fillRect(X, Y, 16, 16); for(let i = 0; i < 8; i++) px(X + (srand() * 16 | 0), Y + (srand() * 16 | 0), '#4f6a34'); }
        // a loud floor: bones, gravel or dry leaves strewn over it
        if(ch === ',') {
            const k = L.crunchLook || 'gravel', cols = { bones: ['#d8d0bc', '#b8b09c'], gravel: ['#8a857c', '#6a665e'], leaves: ['#a8642a', '#c88a3a', '#7a4a20'] }[k];
            for(let i = 0; i < 14; i++) { x.fillStyle = cols[i % cols.length]; x.fillRect(X + (srand() * 15 | 0), Y + (srand() * 15 | 0), k === 'bones' && i % 3 === 0 ? 3 : 2, 1); }
        }
        // a rail: sleepers across the way it runs, two iron rails along it
        if(ch === '=') {
            const along = (dx, dy) => tile(tx + dx, ty + dy) === '=';
            const h = along(-1, 0) || along(1, 0), v = along(0, -1) || along(0, 1);
            if(v || !h) { x.fillStyle = '#4a3420'; for(let i = 1; i < 16; i += 4) x.fillRect(X + 2, Y + i, 12, 2); x.fillStyle = '#7d8893'; x.fillRect(X + 4, Y, 1, 16); x.fillRect(X + 11, Y, 1, 16); }
            if(h) { x.fillStyle = '#4a3420'; for(let i = 1; i < 16; i += 4) x.fillRect(X + i, Y + 2, 2, 12); x.fillStyle = '#7d8893'; x.fillRect(X, Y + 4, 16, 1); x.fillRect(X, Y + 11, 16, 1); }
        }
        // a wall above casts a short shadow onto the floor
        if(isWall(tile(tx, ty - 1))) { x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(X, Y, 16, 3); }
    }
    G.ground = c;
}

// ---------- entities ----------
const LOOKS = {
    squad: (i, cloth) => ({ armor: 1 + (i % 2), weapon: 1 + (i % 2), helm: ['cap', '', 'nasal', 'cap'][i % 4], skin: (i * 2) % 4, hair: (i * 3) % 6, cloth }),
    bandit: i => ({ armor: 1 + (i % 2), weapon: 1 + ((i >> 1) % 2), helm: ['', 'cap', '', 'cap', 'nasal'][i % 5], skin: (i * 3) % 4, hair: (i * 5) % 6, cloth: 'bandit' }),
    leader: { armor: 2, weapon: 3, helm: 'nasal', skin: 1, hair: 1, cloth: 'bandit', wpn: 'axe' },
    prisoner: i => ({ armor: 1, weapon: 1, helm: '', skin: (i * 2 + 1) % 4, hair: (i * 2 + 2) % 6, cloth: 'vaegir' })
};
const OBJDEF = {
    // (T is a torch: it can be put out, and a bandit will come to light it again)
    b: { img: 'crate', solid: true, cover: true, search: true }, B: { img: 'pot', solid: true, cover: true, search: true }, s: { img: 'sack', solid: true, cover: true, search: true },
    k: { table: true, solid: true }, h: { img: 'stool' }, T: { img: 'torch', solid: true, torch: true, light: { r: 170, i: .95 } },
    F: { fire: true, solid: true, light: { r: 250, i: 1.1 } }, C: { chest: true, solid: true }, c: { chest: true, trapped: true, solid: true },
    L: { lever: true, solid: true }, t: { trapdoor: true }, $: { purse: true }, S: { spikes: true }, v: { bats: true },
    H: { hide: true, solid: true, cover: true }, A: { pen: true, solid: true }, K: { cage: true, solid: true },
    o: { ore: 'iron', solid: true, cover: true }, q: { ore: 'coal', solid: true, cover: true }, M: { cart: true },
    G: { bell: true, solid: true }, m: { larder: true, solid: true, cover: true }, i: { herbs: true, solid: true, cover: true },
    w: { keg: true, img: 'barrel', solid: true, cover: true }, Z: { cleat: true, solid: true }, z: { load: true }, y: { bearCage: true, solid: true }
};
// the hideouts' numbers (2.9.0): a dog smells you within SMELL px (×1.6 running or carrying a
// sack) whatever the light, and barks; meat keeps one eating for MEAT_T s; the bell carries over
// the whole place; the herb in a keg puts its drinkers to sleep DRUG_T s later; a dropped load
// knocks out whoever stands within DROP_R px of it; you swim deep water at SWIM × your pace and
// are seen there within SWIM_SEEN px only; crouched in reeds within REED_SEEN
const SMELL = 74, MEAT_T = 25, BELL_R = 1400, DRUG_T = 12, DRUG_R = 7 * TS, DROP_R = 46, SWIM = .5, SWIM_SEEN = 60, REED_SEEN = 34;
// the mine's numbers: how many sacks the cart takes and how fast it rolls (px/s); the stock, and
// what a sack is worth, live on the map side (Game.MINE) so a site keeps them between visits
const CART_CAP = 3, CART_SPEED = 64;

// The hero as the battle draws them, on foot and with a blade in hand (a bow stays on the back)
function heroLook() {
    const eq = state.player.equipment || {}, w = eq.weapon;
    const bg = state.player.background || {};
    const look = Battle.heroLook(Object.assign({}, eq, { weapon: w && w.weaponType === 'bow' ? null : w }), bg.gender === 'female', Battle.playerCloth || 'player', false, bg.hair);
    return look && look.kind === 'foot' ? look : { armor: 2, weapon: 2, helm: '', skin: 0, hair: 0, cloth: 'player' };
}
// The band's own numbers (BAND_KINDS) make the guards: its footman for the rank and file, its leader for the leader
function bandStats() {
    const band = BAND_KINDS[R.site.band] || BAND_KINDS.bandit;
    const foot = band.battle.find(b => b[1] === 'infantry') || band.battle[0], lead = band.leader || foot;
    return { dmg: band.dmg || 'cut', foot: { hp: Math.round(foot[2] * 1.4), attack: foot[4], defense: foot[5] }, leader: { hp: Math.round(lead[2] * 1.2), attack: lead[4], defense: lead[5] } };
}
function heroStats() {
    const eq = state.player.equipment || {};
    const def = ['shield', 'armor', 'helmet', 'gloves', 'boots'].reduce((n, s) => n + ((eq[s] || {}).defense || 0), 0);
    return { hp: state.player.stats.hp, maxHp: state.player.stats.maxHp, attack: 10 + Game.attr('str') + (eq.weapon && eq.weapon.weaponType !== 'bow' ? eq.weapon.attack || 0 : 0),
             defense: def, gearArmor: true, dmgType: eq.weapon && eq.weapon.weaponType !== 'bow' ? eq.weapon.dmgType || 'cut' : 'cut' };
}

function newGame() {
    L = LEVELS[R.level];
    const map = L.map, h = map.length, w = map[0].length;
    const BS = bandStats();
    G = { w, h, grid: map.map(r => r.split('')), objs: new Array(w * h).fill(null), doors: {}, opened: new Set(), lights: [], t: 0,
          chars: [], fx: [], texts: [], gold: 0, items: [], freed: 0, kos: 0, downs: 0, alarms: 0, alarm: 0,
          approach: R.approach, seen: new Uint8Array(w * h), ambushOn: R.ambush, ambushState: 0, done: false, trapdoors: [], stepAcc: 0,
          pebbles: 3, band: BS, purseTaken: false, carry: null, bank: { iron: 0, coal: 0 }, steel: 0, cart: null,
          meat: 0, draught: 0, key: false, crunchTold: false, meats: [] };
    seed = 3 + (hashStr(R.site.id) % 97);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) {
        const ch = G.grid[y][x];
        if(ch === 'D') G.doors[x + ',' + y] = { x, y, open: false, locked: false };
        if(ch === 'd') { G.grid[y][x] = 'D'; G.doors[x + ',' + y] = { x, y, open: false, locked: true, keyed: true }; }
        if(OBJDEF[ch]) {
            const d = OBJDEF[ch], o = Object.assign({ ch, x, y, cx: x * TS + 16, cy: y * TS + 16, frame: 0 }, d);
            if(ch === 't') G.trapdoors.push(o);
            if(d.cart) { o.load = { iron: 0, coal: 0 }; G.cart = o; }
            if(d.light) { o.lightRef = { px: o.cx, py: o.cy - 6, r: d.light.r, i: d.light.i, kind: ch === 'F' ? 'fire' : 'torch' }; G.lights.push(o.lightRef); }
            if(d.spikes || d.trapped) o.known = R.scout >= INTEL.sketch;
            if(d.search) { const r = srand(); o.loot = r < .42 ? null : r < .72 ? { gold: 6 + (srand() * 17 | 0) } : r < .86 ? { herb: true } : { pebbles: 2 }; }
            G.objs[y * w + x] = o;
            G.grid[y][x] = d.cart ? '=' : '.';          // the cart stands on its rail
        }
        if(ch === 'P') { G.grid[y][x] = '.'; G.chars.push(makeChar('prisoner', x, y, { look: LOOKS.prisoner(G.chars.length), face: 'down', tied: true })); }
        if(ch === '@') G.start = { x, y };
    }
    for(const l of L.lights) G.lights.push({ px: l.x * TS + 16, py: l.y * TS + 16, r: l.r, i: l.i, kind: l.kind });
    if(R.time === 'day') for(const l of L.dayLights || []) G.lights.push({ px: l.x * TS + 16, py: l.y * TS + 16, r: l.r, i: l.i, kind: l.kind });

    // the hero, and whoever came along, at the start
    const hs = heroStats();
    G.player = makeChar('player', G.start.x, G.start.y, Object.assign({ look: heroLook(), face: 'up', isPlayerTeam: true }, hs));
    G.player.y -= 4;
    G.chars.push(G.player);
    // the squad stands on free ground round the start (placed below it they were past the map's
    // bottom edge, where every tile counts as a wall, and never moved)
    const spots = freeTilesNear(G.start.x, G.start.y, R.squad.length + 1).slice(1);
    R.squad.forEach((t, i) => {
        const st = Game.troopStats(t);
        const [sx, sy] = spots[i % Math.max(1, spots.length)] || [G.start.x, G.start.y];
        const s = makeChar('squad', sx, sy, { look: LOOKS.squad(i, Battle.playerCloth || 'player'), hp: st.hp, maxHp: st.hp, attack: st.attack, defense: st.defense, troop: t, face: 'up', isPlayerTeam: true });
        if(i >= spots.length) s.x += (i % 3 - 1) * 8;
        G.chars.push(s);
    });
    G.trail = [];
    const prs = G.chars.filter(c => c.kind === 'prisoner');
    if(prs[0]) prs[0].news = L.news;
    if(prs[1] && Math.random() < .5) prs[1].loud = true;
    // a lord's ward or heir held here for the "İndeki Soylu" quest takes the first prisoner's place
    const cq = captiveQuest(R.site.id);
    if(cq && prs[0]) Object.assign(prs[0], { noble: cq.data, news: null, loud: false,
        look: cq.data.kind === 'lady' ? { armor: 1, weapon: 1, helm: '', skin: 1, hair: 3, cloth: Swordsman.DYE[cq.data.faction] ? cq.data.faction : 'vaegir', fem: true, hairStyle: 'long' }
                                     : { armor: 2, weapon: 1, helm: '', skin: 0, hair: 2, cloth: Swordsman.DYE[cq.data.faction] ? cq.data.faction : 'vaegir' } });
    L.guards.forEach((gd, i) => {
        let type = gd.type;
        if(R.time === 'night' && gd.night) type = gd.night;
        const st = gd.leader ? BS.leader : gd.dog ? { hp: Math.round(BS.foot.hp * .7), attack: BS.foot.attack, defense: 0 } : BS.foot;
        const g = makeChar('guard', gd.x, gd.y, { look: gd.leader ? LOOKS.leader : LOOKS.bandit(i), hp: st.hp, maxHp: st.hp, attack: st.attack, defense: st.defense,
            role: type, face: gd.face || 'down', route: gd.route, sweep: gd.sweep || 0, leader: !!gd.leader, dog: !!gd.dog, key: !!gd.key });
        if(gd.dx) g.x += gd.dx;
        if(type === 'tower') { g.y -= 2; g.elev = 30; }                 // up on the platform
        g.home = { x: g.x, y: g.y, a: g.a };
        g.state = type === 'sleep' ? 'sleep' : 'calm';
        G.chars.push(g);
    });
    if(L.mine) stockMine();
    G.horses = (L.pen ? L.pen.horses : []).map(([x, y], i) => ({ x: x * TS + 16, y: y * TS + 24, coat: ['bay', 'grey', 'black'][i % 3], gait: 'stand', a: i * 2.1, face: i % 2 ? -1 : 1 }));
    buildLight();
    bakeGround();
    G.revealAll = R.scout >= INTEL.sketch;
    const ys = []; for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) if(G.grid[y][x] === 'Y') ys.push([x, y]);
    G.tower = ys.length ? { x0: Math.min(...ys.map(a => a[0])), y0: Math.min(...ys.map(a => a[1])), y1: Math.max(...ys.map(a => a[1])) } : null;
    // one sign per stretch of exit ground (the house's road is one; the cave has its mouth and the stream)
    G.exitSigns = [];
    const seenE = new Set();
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) {
        if(!isExit(x, y) || seenE.has(x + ',' + y)) continue;
        const grp = [], q = [[x, y]]; seenE.add(x + ',' + y);
        while(q.length) { const [a, b] = q.pop(); grp.push([a, b]); for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (a + dx) + ',' + (b + dy); if(isExit(a + dx, b + dy) && !seenE.has(k)) { seenE.add(k); q.push([a + dx, b + dy]); } } }
        const st = grp.find(([a, b]) => tile(a, b) === '@') || grp[grp.length >> 1];
        G.exitSigns.push({ x: st[0] * TS + 16, y: st[1] * TS + 30 });
    }
    say(T('Sessiz ol. Eğilirsen daha az görünürsün.'), 5);
}
// the n nearest walkable tiles to (tx, ty), breadth first, the start itself first
function freeTilesNear(tx, ty, n) {
    const out = [], seen = new Set([tx + ',' + ty]), q = [[tx, ty]];
    while(q.length && out.length < n) {
        const [x, y] = q.shift();
        if(!solidTile(x, y) && tile(x, y) !== 'W') out.push([x, y]);
        for(const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) {
            const k = (x + dx) + ',' + (y + dy);
            if(seen.has(k) || x + dx < 0 || y + dy < 0 || x + dx >= G.w || y + dy >= G.h || solidTile(x + dx, y + dy)) continue;
            seen.add(k); q.push([x + dx, y + dy]);
        }
    }
    return out;
}
function makeChar(kind, tx, ty, o) {
    const face = o.face || 'down';
    return Object.assign({ kind, x: tx * TS + 16, y: ty * TS + 20, a: faceAngle(face), dir: face, anim: 'Idle', animT: Math.random() * 2000,
        hp: 40, maxHp: 40, attack: 8, defense: 0, state: 'calm', sus: 0, atkT: 0, cd: 0, crouch: false, running: false, hurtT: 0 }, o);
}
function faceAngle(f) { return { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[f] ?? Math.PI / 2; }
function dirOf(a) { const c = Math.cos(a), s = Math.sin(a); return Math.abs(c) > Math.abs(s) * .9 ? (c < 0 ? 'left' : 'right') : (s < 0 ? 'up' : 'down'); }
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= 2 * Math.PI; while(d < -Math.PI) d += 2 * Math.PI; return d; };

// ---------- movement ----------
const RAD = 9;
function moveChar(c, dx, dy) {
    const tryAxis = (nx, ny) => {
        const x0 = Math.floor((nx - RAD) / TS), x1 = Math.floor((nx + RAD) / TS), y0 = Math.floor((ny - RAD * .6) / TS), y1 = Math.floor((ny + RAD * .4) / TS);
        for(let y = y0; y <= y1; y++) for(let x = x0; x <= x1; x++) if(solidFor(c, x, y)) return false;
        return true;
    };
    if(dx && tryAxis(c.x + dx, c.y)) c.x += dx;
    else if(dx && c.kind === 'player') bump(c, Math.floor((c.x + dx + Math.sign(dx) * RAD) / TS), Math.floor(c.y / TS));
    if(dy && tryAxis(c.x, c.y + dy)) c.y += dy;
    else if(dy && c.kind === 'player') bump(c, Math.floor(c.x / TS), Math.floor((c.y + dy + Math.sign(dy) * RAD * .6) / TS));
}
// walking into a shut door opens it (with a creak)
function bump(c, tx, ty) {
    const d = G.doors[tx + ',' + ty];
    if(d && d.keyed && G.key) { d.keyed = d.locked = false; d.open = true; noise(tx * TS + 16, ty * TS + 16, 30, null); floatText(tx * TS + 16, ty * TS - 4, T('Kilit açıldı'), '#9fe0a0'); buildLight(); }
    else if(d && !d.open && !d.locked) { d.open = true; noise(tx * TS + 16, ty * TS + 16, 70, T('Kapı gıcırdadı')); buildLight(); }
    else if(d && d.locked && !c.lockedToldT) { say(d.keyed ? T('Kapı kilitli. Anahtar haydutlardan birinin kemerinde.') : T('Kapı kilitli!')); c.lockedToldT = 1.5; }
}
// grid path (BFS, 4-way; doors are passable — guards open them)
function path(from, to) {
    const W = G.w, sx = Math.floor(from.x / TS), sy = Math.floor(from.y / TS), ex = Math.floor(to.x / TS), ey = Math.floor(to.y / TS);
    if(sx === ex && sy === ey) return [];
    const prev = new Int32Array(W * G.h).fill(-1), q = [sy * W + sx]; prev[sy * W + sx] = sy * W + sx;
    const pass = (x, y) => { const c = tile(x, y); if(c === 'D') { const d = G.doors[x + ',' + y]; return !d.locked; } return !solidFor(from, x, y); };
    for(let qi = 0; qi < q.length; qi++) {
        const cur = q[qi], cx = cur % W, cy = cur / W | 0;
        if(cx === ex && cy === ey) break;
        for(const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + ddx, ny = cy + ddy, ni = ny * W + nx;
            if(nx < 0 || ny < 0 || nx >= W || ny >= G.h || prev[ni] !== -1) continue;
            if(!pass(nx, ny) && !(nx === ex && ny === ey)) continue;
            prev[ni] = cur; q.push(ni);
        }
    }
    const end = ey * W + ex; if(prev[end] === -1) return null;
    const out = []; for(let c = end; c !== sy * W + sx; c = prev[c]) out.push({ x: (c % W) * TS + 16, y: (c / W | 0) * TS + 20 });
    return out.reverse();
}
function walkTo(c, tx, ty, speed, dt) {
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
    if(d < 2) return true;
    const s = Math.min(d, speed * dt);
    // anyone but the player reaching a shut door opens it
    const nx = Math.floor((c.x + dx / d * 14) / TS), ny = Math.floor((c.y + dy / d * 14) / TS), door = G.doors[nx + ',' + ny];
    if(door && !door.open && !door.locked && c.kind !== 'player') { door.open = true; buildLight(); }
    moveChar(c, dx / d * s, dy / d * s);
    c.a = Math.atan2(dy, dx);
    return false;
}
function followPath(c, target, speed, dt) {
    c.repath = (c.repath || 0) - dt;
    if(!c.path || c.repath <= 0 || !c.pathTo || Math.hypot(c.pathTo.x - target.x, c.pathTo.y - target.y) > 24) {
        c.path = path(c, target) || []; c.pathTo = { x: target.x, y: target.y }; c.repath = .45;
    }
    if(!c.path.length) return walkTo(c, target.x, target.y, speed, dt);
    const n = c.path[0];
    if(walkTo(c, n.x, n.y, speed, dt) || Math.hypot(n.x - c.x, n.y - c.y) < 6) c.path.shift();
    return false;
}

// ---------- noise, alarm, messages ----------
function noise(x, y, r, label, from) {
    G.fx.push({ kind: 'ring', x, y, r, t: 0 });
    for(const g of G.chars) {
        if(g.kind !== 'guard' || g === from || g.state === 'ko' || g.state === 'down' || g.state === 'eat') continue;
        const d = Math.hypot(g.x - x, g.y - y), rr = g.state === 'sleep' ? r * .45 : r;
        if(d > rr) continue;
        if(g.state === 'sleep') { g.state = 'calm'; g.role = g.role === 'sleep' || g.role === 'dice' ? 'post' : g.role; floatText(g.x, g.y - 40, T('Uyandı'), '#ffb36b'); }
        if(g.state === 'calm' || g.state === 'search' || g.state === 'suspicious' || g.state === 'return') {
            g.state = 'suspicious'; g.lastSeen = { x, y }; g.sus = Math.max(g.sus, .5); g.investigate = 7; g.goLook = g.role !== 'tower'; g.lookT = 0; g.path = null;
        }
    }
    if(label && r > 60) say(label);
}
// `at` is what they run at: the hero, or a bear let loose among them
function raiseAlarm(by, silent, at) {
    if(!G.alarm) { G.alarms++; Snd.alarm(); }
    G.alarm = 12;
    const p = at || G.player;
    for(const g of G.chars) {
        if(g.kind !== 'guard' || g.state === 'ko' || g.state === 'down') continue;
        const d = by ? Math.hypot(g.x - by.x, g.y - by.y) : 0;
        if(!by || d < 11 * TS || g.state === 'alert') {
            if(g.state === 'sleep') g.wakeT = .9;
            if(g.state === 'eat') continue;          // a dog at its meat doesn't care
            g.state = g.state === 'sleep' ? 'sleep' : 'alert'; g.lastSeen = { x: p.x, y: p.y }; g.sus = 1;
            if(at) g.target = at;
        }
    }
    if(at && at.kind === 'beast' && !G.bearTold) { G.bearTold = true; say(T('Haydutlar ayıyla boğuşuyor!')); }
    else if(!silent) say(T('Fark edildin! Alarm!'));
}
function say(t, secs) { G.msg = t; G.msgT = secs || 2.6; }
function floatText(x, y, t, col) { G.texts.push({ x, y, t, col: col || '#fff', life: 1.1 }); }

// ---------- sound ----------
// The music is the game's own player (Music.sync reads Lair.active and Lair.alarmed): three quiet
// stealth pieces while you sneak, three fight pieces once the alarm is up. Under the stealth
// music, at night, a cricket loop plays through Web Audio as a separate layer — louder the more
// open sky is round you (all over the camp, by the road and windows in the house, never in the
// cave, where a few drips fall instead) and faded out while they're chasing you. The small
// effects (a pebble's clack, a thud, coins, a hit, the alarm stab) are generated. Everything is
// under the same mute and volume as every other sound, through Game.ac().
// open sky (crickets all over at night), underground (drips), or a building (crickets by the doors and windows)
function skyOf() { return L.sky || (L.theme === 'camp' ? 'open' : L.theme === 'cave' ? 'under' : 'roof'); }
const Snd = {
    on() { return !Game.opt('muted') && Game.opt('volume') > 0; },
    start() {
        this.stop();
        if(!this.on()) return;
        const ac = Game.ac(); if(!ac) return;
        try {
            const out = this.out = ac.createGain(); out.gain.value = Math.min(1, Game.opt('volume') * 1.6); out.connect(ac.destination);
            const len = ac.sampleRate, buf = this.noiseBuf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
            for(let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            if(skyOf() === 'under') this.dripT = 1;
            else if(R.time === 'night') this.crickets(ac);
            this.openT = 0;
        } catch(e) { this.stop(); }
    },
    // the cricket loop: fetched once, decoded once, looped seamlessly by a buffer source
    crickets(ac) {
        const cg = this.cg = ac.createGain(); cg.gain.value = 0; cg.connect(this.out);
        const go = b => { if(!this.cg || this.cg !== cg) return; const s = ac.createBufferSource(); s.buffer = b; s.loop = true; s.connect(cg); s.start(); this.src = s; };
        if(Snd.cricketBuf) return go(Snd.cricketBuf);
        fetch('lair/crickets.mp3').then(r => r.arrayBuffer()).then(a => ac.decodeAudioData(a)).then(b => { Snd.cricketBuf = b; go(b); }).catch(() => {});
    },
    stop() {
        try { if(this.src) this.src.stop(); } catch(e) {}
        this.src = null; this.cg = null; this.dripT = undefined;
        if(this.out) { try { this.out.disconnect(); } catch(e) {} }
        this.out = null;
    },
    tone(f, t0, dur, type, vol, f2) {
        const ac = Game.ac(); if(!ac || !this.out) return;
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if(f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
        g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
        o.connect(g); g.connect(this.out); o.start(t0); o.stop(t0 + dur + .02);
    },
    burst(t0, dur, freq, vol, type) {
        const ac = Game.ac(); if(!ac || !this.out || !this.noiseBuf) return;
        const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = this.noiseBuf; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = 3;
        g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
        s.connect(f); f.connect(g); g.connect(this.out); s.start(t0, Math.random() * .5); s.stop(t0 + dur + .02);
    },
    fx(kind) {
        const ac = Game.ac(); if(!ac || !this.out) return;
        const t = ac.currentTime;
        try {
            if(kind === 'pebble') { this.burst(t, .05, 2800, .5); this.burst(t + .09, .04, 3400, .3); }
            else if(kind === 'thud') { this.tone(120, t, .18, 'sine', .5, 50); this.burst(t, .08, 400, .3, 'lowpass'); }
            else if(kind === 'hit') { this.burst(t, .07, 1500, .45); this.tone(180, t, .1, 'square', .08, 90); }
            else if(kind === 'coin') { this.tone(1320, t, .09, 'triangle', .12); this.tone(1760, t + .07, .12, 'triangle', .1); }
            else if(kind === 'bell') for(let i = 0; i < 3; i++) for(const [f, v] of [[392, .14], [784, .06], [1046, .04]]) this.tone(f, t + i * 1.1, 2.4, 'sine', v);
        } catch(e) {}
    },
    alarm() {
        const ac = Game.ac();
        if(ac && this.out) try { const t = ac.currentTime; for(const [f, i] of [[220, 0], [233, 0], [165, 1]]) this.tone(f, t + i * .16, .5, 'sawtooth', .09, f * .94); } catch(e) {}
    },
    // how much open sky is round the hero: the share of outdoor tiles within four (the camp is all sky)
    openness() {
        if(skyOf() === 'open') return 1;
        const p = G.player, px = Math.floor(p.x / TS), py = Math.floor(p.y / TS);
        let n = 0, o = 0;
        for(let y = py - 4; y <= py + 4; y++) for(let x = px - 4; x <= px + 4; x++) { n++; if(skyAt(x, y) || tile(x, y) === 'W') o++; }
        return o / n;
    },
    tick(dt) {
        const ac = Game.ac(); if(!ac || !this.out) return;
        if(this.cg) {
            this.openT -= dt;
            if(this.openT <= 0) {
                this.openT = .3;
                const v = G.alarm > 0 ? 0 : .12 + .88 * this.openness();
                this.cg.gain.setTargetAtTime(v * .9, ac.currentTime, .6);
            }
        }
        if(this.dripT !== undefined) {
            this.dripT -= dt;
            if(this.dripT <= 0) { this.dripT = rnd(.8, 3.5); const f = rnd(900, 1500); this.tone(f, ac.currentTime, .12, 'sine', .05, f * 1.6); }
        }
    }
};

// ---------- input ----------
let touchMove = { x: 0, y: 0, mag: 0 }, actPressed = false, atkPressed = false, crouchToggle = false, throwPressed = false;
// aiming a pebble: holding Q (the mouse picks the spot) or holding the Taş button and dragging (the
// drag picks the spot); a landing mark and the circle of who'll hear it show until you let go
let aim = null, aimFinal = null;
const mouse = { world: null, t: 0, sx: 0, sy: 0 };
const blocked = () => paused || Game.tutor != null || !el('modal-overlay').classList.contains('hidden');
function keyDown(e) {
    if(!api.active || !G || G.done || blocked()) return;
    const k = Input.letter(e);
    if(k === 'c' || e.key === 'Control') crouchToggle = true;
    if(k === 'e') actPressed = true;
    if(k === 'q' && !aim) aim = { touch: false };
    if(e.key === ' ' || k === 'j') { atkPressed = true; e.preventDefault(); }
    if(e.key === 'Escape') pauseMenu();
    if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
}
function keyUp(e) {
    if(!api.active) return;
    if(Input.letter(e) === 'q' && aim && !aim.touch) { aim = null; if(!blocked()) throwPressed = true; }
}
function held(k) { return !!Input.keys[k]; }
function bindInput() {
    addEventListener('keydown', keyDown);
    addEventListener('keyup', keyUp);
    addEventListener('blur', () => { aim = null; });
    canvas.addEventListener('mousemove', e => { const r = canvas.getBoundingClientRect(); mouse.sx = (e.clientX - r.left) * DPR; mouse.sy = (e.clientY - r.top) * DPR; mouse.t = Date.now(); });
    const zone = el('lair-stickzone'), stick = el('lair-stick'), knob = el('lair-knob');
    let id = null, cx = 0, cy = 0;
    zone.addEventListener('pointerdown', e => { id = e.pointerId; cx = e.clientX; cy = e.clientY; stick.hidden = false;
        stick.style.left = cx + 'px'; stick.style.top = cy + 'px'; zone.setPointerCapture(id); e.preventDefault(); });
    zone.addEventListener('pointermove', e => {
        if(e.pointerId !== id) return;
        let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), RR = 50;
        if(d > RR) { dx *= RR / d; dy *= RR / d; }
        knob.style.transform = `translate(${dx}px,${dy}px)`;
        const m = Math.min(1, d / RR), n = Math.max(1, Math.hypot(dx, dy));
        touchMove = m < .15 ? { x: 0, y: 0, mag: 0 } : { x: dx / n, y: dy / n, mag: m };
    });
    const end = e => { if(e.pointerId !== id) return; id = null; stick.hidden = true; knob.style.transform = ''; touchMove = { x: 0, y: 0, mag: 0 }; };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    const tap = (b, fn) => el(b).addEventListener('pointerdown', e => { e.preventDefault(); if(!blocked()) fn(); });
    tap('lair-act', () => actPressed = true);
    tap('lair-atk', () => atkPressed = true);
    tap('lair-crouch', () => crouchToggle = true);
    // Taş: a tap throws where you face; press and drag to pick the spot (a full drag of ~110 px is
    // the longest throw), let go to throw. Back over the button the throw is called off — the
    // button turns red and says so, and the aim line greys out.
    const tb = el('lair-throw'); let tid = null, tx0 = 0, ty0 = 0;
    const overBtn = e => { const r = tb.getBoundingClientRect(); return e.clientX >= r.left - 6 && e.clientX <= r.right + 6 && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6; };
    tb.addEventListener('pointerdown', e => { e.preventDefault(); if(blocked()) return; tid = e.pointerId; tx0 = e.clientX; ty0 = e.clientY; tb.setPointerCapture(tid); aim = { touch: true, dx: 0, dy: 0, moved: false, cancel: false }; tb.classList.add('on'); });
    tb.addEventListener('pointermove', e => {
        if(e.pointerId !== tid || !aim) return;
        aim.dx = e.clientX - tx0; aim.dy = e.clientY - ty0;
        if(!overBtn(e)) aim.moved = true;
        aim.cancel = aim.moved && overBtn(e);
        tb.classList.toggle('cancel', aim.cancel);
    });
    const tend = (e, cancel) => {
        if(e.pointerId !== tid) return; tid = null; tb.classList.remove('on', 'cancel');
        const back = aim && aim.cancel;
        if(aim && !cancel && !back && G && !G.done) { aimFinal = aimTarget(); throwPressed = true; }
        else if(back && G) say(T('Atış iptal.'));
        aim = null;
    };
    tb.addEventListener('pointerup', e => tend(e, false)); tb.addEventListener('pointercancel', e => tend(e, true));
    el('lair-pausebtn').addEventListener('click', () => pauseMenu());
    addEventListener('resize', () => { if(api.active) resize(); });
}

// ---------- the player ----------
function updatePlayer(dt) {
    const p = G.player;
    if(p.state === 'down') return;
    if(p.hidden) {
        // hidden: any move, or the button again, steps back out where you came in
        const moving = held('w') || held('a') || held('s') || held('d') || held('arrowup') || held('arrowdown') || held('arrowleft') || held('arrowright') || touchMove.mag > .3;
        if(moving || actPressed) { actPressed = false; unhide(); }
        crouchToggle = false; atkPressed = false; throwPressed = false;
        p.anim = 'Idle'; G.ctx = { label: T('Çık'), at: p.hidden, run: unhide };
        return;
    }
    if(crouchToggle) { p.crouch = !p.crouch; crouchToggle = false; }
    if(throwPressed) { throwPressed = false; if(G.carry) say(T('Sırtında çuval varken taş atamazsın.')); else if(p.swim) say(T('Yüzerken bir şey atamazsın.')); else if(!p.busy) throwPebble(); }
    if(p.busy && chaser()) { p.busy = null; say(T('Peşindeler! Yarım kaldı.')); }
    if(p.busy) { p.busy.t -= dt; if(p.busy.t <= 0) { const b = p.busy; p.busy = null; b.done(); } return; }
    let mx = 0, my = 0, run = false;
    if(held('w') || held('arrowup')) my -= 1; if(held('s') || held('arrowdown')) my += 1;
    if(held('a') || held('arrowleft')) mx -= 1; if(held('d') || held('arrowright')) mx += 1;
    run = held('shift');
    if(touchMove.mag) { mx = touchMove.x; my = touchMove.y; run = touchMove.mag > .92; }
    const m = Math.hypot(mx, my);
    const under = tile(Math.floor(p.x / TS), Math.floor(p.y / TS)), inWater = under === '~', deep = under === '%';
    if(run && p.crouch) p.crouch = false;
    let speed = p.crouch ? 46 : run ? 128 : 78;
    if(inWater) speed *= .55;
    if(deep) { speed = 78 * SWIM; run = false; }
    if(G.carry) speed *= .7;
    if(p.atkT > 0) speed *= .35;
    p.running = run && m > 0;
    if(m > 0) {
        mx /= m; my /= m;
        moveChar(p, mx * speed * dt, my * speed * dt);
        if(p.atkT <= 0) p.a = Math.atan2(my, mx);
        // footsteps are noise: running is loud, walking quiet, crouching silent; water always splashes
        G.stepAcc += speed * dt;
        if(G.stepAcc > 38) {
            G.stepAcc = 0;
            if(deep) noise(p.x, p.y, 45, null);                                   // a stroke: a soft splash
            else if(under === ',') {                                              // bones, gravel, dry leaves: even a crouch is heard
                noise(p.x, p.y, p.running ? 170 : p.crouch ? 60 : 110, null);
                if(!G.crunchTold) { G.crunchTold = true; say(T(L.crunch)); }   // said even crouched: noise() only names the loud ones
            }
            else if(under === 'r' && !p.crouch) noise(p.x, p.y, p.running ? 150 : 55, null);   // upright in reeds: they rustle
            else if(inWater) noise(p.x, p.y, p.crouch ? 70 : 115, null);
            else if(G.carry) noise(p.x, p.y, p.running ? 180 : p.crouch ? 35 : 85, null);   // a sack on the back is never silent
            else if(p.running) noise(p.x, p.y, 150, null);
            else if(!p.crouch) noise(p.x, p.y, 40, null);
        }
        p.anim = p.running ? 'Run' : 'Walk';
    } else p.anim = 'Idle';
    if(p.atkT > 0) p.anim = 'attack';
    // the trail the squad follows
    const lt = G.trail[0];
    if(!lt || Math.hypot(lt.x - p.x, lt.y - p.y) > 10) { G.trail.unshift({ x: p.x, y: p.y }); if(G.trail.length > 120) G.trail.pop(); }
    // traps underfoot
    const o = obj(Math.floor(p.x / TS), Math.floor(p.y / TS));
    if(o && o.spikes && !o.sprung) { o.sprung = true; o.known = true; hurtBy(p, 'pierce', 26, null); noise(o.cx, o.cy, 110, T('Diken tuzağı!')); }
    if(o && o.bats && !o.flown) { o.flown = true; noise(o.cx, o.cy, p.crouch ? 90 : 170, T('Yarasalar havalandı!')); G.fx.push({ kind: 'bats', x: o.cx, y: o.cy, t: 0 }); }
    p.cd -= dt; p.atkT -= dt;
    p.swim = deep;
    if(deep) { if(atkPressed) say(T('Yüzerken dövüşemezsin.')); atkPressed = false; G.ctx = null; actPressed = false; return; }
    if(atkPressed && p.cd <= 0) { atkPressed = false; if(G.carry) dropSack(true); playerAttack(); }
    atkPressed = false;
    G.ctx = findInteraction();
    if(actPressed) { actPressed = false; if(G.ctx) G.ctx.run(); }
}
// The hero's blow: the weapon's own numbers through the battle's armour gate; a bandit who
// didn't see it coming takes three times as much
function playerAttack() {
    const p = G.player; p.cd = .55; p.atkT = .42; p.animT = 0;
    let hit = false;
    for(const g of G.chars) {
        if(g.kind !== 'guard' || g.state === 'ko' || g.state === 'down') continue;
        const dx = g.x - p.x, dy = g.y - p.y, d = Math.hypot(dx, dy);
        if(d > 40 || Math.abs(angDiff(Math.atan2(dy, dx), p.a)) > 1.1) continue;
        const unaware = g.state !== 'alert' && !(g.sees && g.sees.player);
        hurtBy(g, p.dmgType, p.attack * rnd(.85, 1.15) * Battle.DAMAGE_PACE * (unaware ? 3 : 1), p);
        hit = true;
    }
    if(hit) Snd.fx('hit');
    noise(p.x, p.y, hit ? 200 : 60, null);
}
// every blow in a lair — the hero's, a soldier's, a bandit's, a trap's — passes Battle.afterArmor
function hurtBy(c, dmgType, raw, by) {
    hurt(c, Battle.afterArmor(dmgType, raw, c.defense, c), by, dmgType);
}
function hurt(c, dmg, by, dmgType) {
    if(c.state === 'down' || c.state === 'ko') return;
    c.hp -= dmg; c.hurtT = .25;
    floatText(c.x, c.y - 34, '-' + dmg, c.kind === 'guard' ? '#ffd28a' : '#ff8a7a');
    if(by) { const a = Math.atan2(c.y - by.y, c.x - by.x); moveChar(c, Math.cos(a) * 6, Math.sin(a) * 6); }
    if(c.kind === 'guard' && c.state !== 'alert' && c.hp > 0) { const bear = by && by.kind === 'beast' ? by : undefined; c.state = 'alert'; c.lastSeen = by ? { x: by.x, y: by.y } : c.lastSeen; if(bear) c.target = bear; raiseAlarm(c, false, bear); }
    if(c.hp <= 0) {
        c.hp = 0;
        // a blunt weapon knocks out rather than kills, as it does on the field (DMG_TYPES.blunt.knock)
        if(c.kind === 'guard' && dmgType && (DMG_TYPES[dmgType] || {}).knock) { c.state = 'ko'; c.body = true; G.kos++; floatText(c.x, c.y - 36, T('Baygın'), '#cfe8ff'); }
        else { c.state = 'down'; c.anim = 'Death'; c.animT = 0; c.body = true; if(c.kind === 'guard') G.downs++; }
        if(c.kind === 'guard' && c.ambusher) checkAmbushOver();
        if(c.kind === 'player') setTimeout(() => endGame('lost'), 1400);
        if(c.kind === 'squad') floatText(c.x, c.y - 40, T('Yaralandı'), '#ffb3a8');
    }
}

// an alert bandit within 8 tiles: while one is on you nothing can be used — no chest, no lever, no
// hiding, no door out. Get rid of him or get away first
function chaser() { const p = G.player; return G.chars.find(g => g.kind === 'guard' && g.state === 'alert' && !(g.target && g.target.kind === 'beast') && Math.hypot(g.x - p.x, g.y - p.y) < 8 * TS); }

// what the action button would do right now: every candidate in reach, the nearest wins, and
// what you face counts as nearer than what's behind you
function findInteraction() {
    const p = G.player, tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS), cand = [];
    if(G.carry) return carryInteraction(p, tx, ty);
    const add = (d, label, at, run) => {
        const ax = at ? (at.cx ?? at.x) : p.x, ay = at ? (at.cy ?? at.y) : p.y;
        const off = at && Math.hypot(ax - p.x, ay - p.y) > 8 ? Math.abs(angDiff(Math.atan2(ay - p.y, ax - p.x), p.a)) : 0;
        cand.push({ d: d + (off > 1.6 ? 40 : off > .8 ? 10 : 0), label, at, run });
    };
    // takedown: a bandit who hasn't seen you, from behind (or asleep, or bent over the dice)
    for(const g of G.chars) {
        if(g.kind !== 'guard' || g.state === 'ko' || g.state === 'down' || g.state === 'alert' || g.state === 'grabbed') continue;
        const d = Math.hypot(g.x - p.x, g.y - p.y);
        if(d > 36) continue;
        const behind = Math.abs(angDiff(Math.atan2(p.y - g.y, p.x - g.x), g.a)) > 1.6;
        if(g.state === 'sleep' || behind || (g.role === 'dice' && g.state === 'calm') || g.state === 'eat') add(d - 12, g.dog ? T('Köpeği bayılt') : T('Bayılt'), g, () => takedown(g));
        if(g.key && !G.key && (g.state === 'sleep' || behind)) add(d - 14, T('Anahtarı çal'), g, () => pickKey(g));
    }
    // the key off a bandit who's down
    for(const g of G.chars) if(g.kind === 'guard' && g.key && !G.key && (g.state === 'ko' || g.state === 'down')) {
        const d = Math.hypot(g.x - p.x, g.y - p.y);
        if(d < 36) add(d - 8, T('Anahtarı al'), g, () => pickKey(g));
    }
    for(const c of G.chars) if(c.kind === 'prisoner' && c.tied) {
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if(d < 36) add(d - 6, c.loud && !c.shushed ? T('Sus işareti ver') : T('Çözüp kurtar'), c, c.loud && !c.shushed ? () => { c.shushed = true; say(T('Tutsak başını salladı.')); } : () => freePrisoner(c));
    }
    for(const o of G.objs) {
        if(!o || o.gone) continue;
        // measured from the feet to the object's base, so standing on any side counts the same
        const d = Math.hypot(o.cx - p.x, o.cy + 6 - p.y);
        if(d > 50) continue;
        if(o.chest && !o.open) {
            if(o.trapped && o.known && !o.disarmed) add(d, T('Tuzağı sök'), o, () => busy(2, T('Tuzak sökülüyor…'), () => { o.disarmed = true; say(T('Tuzak söküldü.')); }));
            else add(d, T('Sandığı aç'), o, () => busy(1.1, T('Açılıyor…'), () => openChest(o)));
        }
        if(o.search && !o.searched) add(d + 4, T('Ara'), o, () => busy(1, T('Aranıyor…'), () => searchCover(o)));
        if(o.lever && !o.pulled) add(d, T('Kolu çek'), o, () => pullLever(o));
        if(o.hide) add(d + 2, T('Saklan'), o, () => hide(o));
        if(o.torch && o.lit !== false) add(d + 3, T('Meşaleyi söndür'), o, () => douseTorch(o));
        if(o.pen && !o.used) add(d, T('Atları ürküt'), o, () => spookHorses(o));
        if(o.cage && !o.open) add(d, T('Kilidi zorla'), o, () => busy(2.5, T('Kilit zorlanıyor…'), () => { o.open = true; o.solid = false; noise(o.cx, o.cy, 80, T('Kilit gıcırdayarak açıldı.')); floatText(o.cx, o.cy - 30, T('Kafes açık'), '#9fe0a0'); }));
        if(o.purse) add(d - 4, T('Keseyi al'), o, () => busy(.8, T('Kese alınıyor…'), () => takePurse(o)));
        if(o.trapdoor) add(d + 2, T('Kapaktan geç'), o, () => busy(.9, T('Kapaktan geçiliyor…'), () => useTrapdoor(o)));
        if(o.ore) add(d, o.ore === 'iron' ? T('Demir çuvalını sırtla') : T('Kömür çuvalını sırtla'), o, () => shoulder(o));
        if(o.cart && !o.rolling && !o.done && o.load.iron + o.load.coal > 0) add(d, T('Arabayı it'), o, () => pushCart(o));
        if(o.bell && !o.rung) add(d, T('Çanı çal'), o, () => busy(.5, T('Çan ipi çekiliyor…'), () => ringBell(o)));
        if(o.larder && !o.taken) add(d, T('Et al'), o, () => busy(.7, T('Et alınıyor…'), () => takeMeat(o)));
        if(o.herbs && !o.taken) add(d, T('Uyku otu topla'), o, () => busy(1.1, T('Ot toplanıyor…'), () => takeHerb(o)));
        if(o.keg && G.draught > 0 && !o.drugged) add(d - 2, T('Fıçıya uyku otu kat'), o, () => busy(1.3, T('Ot fıçıya karıştırılıyor…'), () => drugKeg(o)));
        if(o.cleat && !o.cut && loadOf(o)) add(d, T('Halatı kes'), o, () => busy(.8, T('Halat kesiliyor…'), () => cutRope(o)));
        if(o.bearCage && !o.open) add(d, T('Ayının kafesini aç'), o, () => busy(1.6, T('Kafesin sürgüsü çekiliyor…'), () => freeBear(o)));
    }
    // a ledge underfoot: jump down to the tile below it (one way: from below it's a wall)
    if(tile(tx, ty + 1) === 'J' && !solidTile(tx, ty + 2)) add(Math.abs(tx * TS + 16 - p.x) + 6, T('Aşağı atla'), { cx: tx * TS + 16, cy: (ty + 1) * TS + 16 }, () => busy(.6, T('Atlanıyor…'), () => jumpDown(tx, ty + 2)));
    for(const [dx] of [[1], [-1]]) if(tile(tx + dx, ty) === 'W')
        add(Math.abs((tx + dx) * TS + 16 - p.x), T('Pencereden geç'), { cx: (tx + dx) * TS + 16, cy: ty * TS + 16 }, () => busy(1.1, T('Pencereden geçiliyor…'), () => { p.x += dx * TS * 2; noise(p.x, p.y, 45, null); }));
    if(isExit(tx, ty)) add(20, T('İnden ayrıl'), null, () => endGame('out'));
    cand.sort((a, b) => a.d - b.d);
    const best = cand[0] || null;
    // chased: the button says why it won't work instead of doing it
    if(best && chaser()) return { label: T('Peşindeler!'), at: best.at, blocked: true, run: () => say(T('Peşinde haydutlar varken hiçbir şeyle uğraşamazsın. Önce onlardan kurtul ya da uzaklaş.')) };
    return best;
}
function searchCover(o) {
    o.searched = true;
    noise(o.cx, o.cy, 30, null);
    if(!o.loot) floatText(o.cx, o.cy - 24, T('Boş'), '#b8b0a2');
    else if(o.loot.gold) { G.gold += o.loot.gold; Snd.fx('coin'); floatText(o.cx, o.cy - 24, T`+${o.loot.gold} dinar`, '#f5d76e'); }
    else if(o.loot.pebbles) { G.pebbles += o.loot.pebbles; floatText(o.cx, o.cy - 24, T`+${o.loot.pebbles} çakıl taşı`, '#e8e0cc'); }
    else { const p = G.player, h = Math.min(30, p.maxHp - p.hp); p.hp += h; floatText(o.cx, o.cy - 24, h ? T`Şifalı ot (+${h} can)` : T('Şifalı ot'), '#9fe0a0'); }
}
function takePurse(o) {
    o.gone = true; G.purseTaken = true;
    const n = purseAmount(); G.gold += n;
    Snd.fx('coin');
    floatText(o.cx, o.cy - 20, T`+${n} dinar`, '#f5d76e'); say(T('İnin kesesi senin!'));
}
function purseAmount() { return Math.max(60, Math.round(R.site.purse || 0)); }
function freeSpotNear(tx, ty) {
    for(const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]])
        if(!solidTile(tx + dx, ty + dy)) return { x: (tx + dx) * TS + 16, y: (ty + dy) * TS + 20 };
    return { x: tx * TS + 16, y: ty * TS + 20 };
}
function busy(t, label, done) { const p = G.player; p.busy = { t, label, done, total: t }; p.anim = 'Idle'; }
function hide(o) {
    const p = G.player;
    p.hidden = o; p.hideFrom = { x: p.x, y: p.y }; p.crouch = true;
    p.x = o.cx; p.y = o.cy + 6;                                         // inside it: noise and sight start from there
    o.shakeT = .4;
    say(T(HIDES[hideKind()]));
}
// what a hiding place is, by level (or by theme): drawn in drawObj, named when you get in
const HIDES = {
    hay: 'Samanın içine gömüldün. Yanına gelmedikçe seni göremezler.',
    niche: 'Kayanın gölgesine sindin. Yanına gelmedikçe seni göremezler.',
    wardrobe: 'Dolaba girdin. Kapağı açmadıkça seni göremezler.',
    tomb: 'Kapağı kayık bir lahdin içine girdin. Yanına gelmedikçe seni göremezler.',
    barrel: 'Boş bir fıçının içine girdin. Yanına gelmedikçe seni göremezler.',
    log: 'Kovuk bir kütüğün içine sindin. Yanına gelmedikçe seni göremezler.'
};
function hideKind() { return L.hide || (L.theme === 'camp' ? 'hay' : L.theme === 'cave' ? 'niche' : 'wardrobe'); }
function unhide() {
    const p = G.player, o = p.hidden;
    if(!o) return;
    p.hidden = null; o.shakeT = .3;
    p.x = p.hideFrom.x; p.y = p.hideFrom.y;
}
// a pebble goes where you point (the drag on a phone, the mouse on a desktop) or four tiles ahead,
// stops at a wall, and clatters there: bandits walk over to look, away from you
const PEBBLE_RANGE = 7 * TS, PEBBLE_NOISE = 175;
function aimTarget() {
    const p = G.player;
    if(aim && aim.touch && Math.hypot(aim.dx, aim.dy) > 14) {
        const m = Math.min(1, Math.hypot(aim.dx, aim.dy) / 110), a = Math.atan2(aim.dy, aim.dx);
        return { x: p.x + Math.cos(a) * m * PEBBLE_RANGE, y: p.y + Math.sin(a) * m * PEBBLE_RANGE };
    }
    if(!Game.isTouch() && mouse.world && Date.now() - mouse.t < 4000) return { x: mouse.world.x, y: mouse.world.y };
    return { x: p.x + Math.cos(p.a) * 4.5 * TS, y: p.y + Math.sin(p.a) * 4.5 * TS };
}
function pebbleLanding(tx, ty) {
    const p = G.player, dx = tx - p.x, dy = ty - p.y, len = Math.hypot(dx, dy) || 1, d = Math.min(PEBBLE_RANGE, len), ux = dx / len, uy = dy / len;
    let r = 0;
    for(; r < d; r += 6) { const x = p.x + ux * r, y = p.y - 10 + uy * r; if(solidTile(Math.floor(x / TS), Math.floor(y / TS)) && r > 20) { r -= 10; break; } }
    return { x: p.x + ux * r, y: p.y - 4 + uy * r, ux, uy };
}
// with meat in hand the throw is the meat (for the dogs); the pebbles wait until it's gone
function throwPebble() {
    const p = G.player, meat = G.meat > 0;
    if(!meat && G.pebbles <= 0) { say(T('Atacak taşın kalmadı. Çuvallarda, sandıklarda bulabilirsin.')); return; }
    const tgt = aimFinal || aimTarget(); aimFinal = null;
    const { x: lx, y: ly, ux, uy } = pebbleLanding(tgt.x, tgt.y);
    if(meat) G.meat--; else G.pebbles--;
    p.a = Math.atan2(uy, ux); p.atkT = .2;
    G.fx.push({ kind: meat ? 'meat' : 'stone', x0: p.x, y0: p.y - 20, x: lx, y: ly, t: 0, land: true });
}
// meat on the floor: a soft thud for the bandits, a dinner for every dog within nine tiles that
// isn't already after you — the nearest one runs to it and eats for MEAT_T seconds
function meatLands(x, y) {
    noise(x, y, 50, null);
    const dogs = G.chars.filter(g => g.dog && !['ko', 'down', 'alert', 'eat', 'grabbed'].includes(g.state) && Math.hypot(g.x - x, g.y - y) < 9 * TS && path(g, { x, y }))
        .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
    const dog = dogs[0];
    if(!dog) { floatText(x, y - 16, T('Pat'), '#e8e0cc'); return; }
    if(dog.state === 'sleep') dog.role = 'post';
    Object.assign(dog, { state: 'eat', meat: { x, y }, eatT: MEAT_T, sus: 0, path: null, goLook: false });
    floatText(dog.x, dog.y - 30, T('Eti kokladı'), '#ffd28a');
    say(T('Köpek etin peşine düştü. Yerken başka bir şeyle ilgilenmez.'));
}
function spookHorses(o) {
    o.used = true;
    G.horsesRun = 6;
    const P = L.pen.box, cx = (P[0] + P[2] + 1) / 2 * TS, cy = (P[1] + P[3] + 1) / 2 * TS;
    noise(cx, cy, 300, T('Atlar kişneyip ağılda deli gibi koşuşuyor!'));
}
function douseTorch(o) {
    o.lit = false; o.lightRef.off = true; buildLight();
    noise(o.cx, o.cy, 40, null);
    G.fx.push({ kind: 'smoke', x: o.cx, y: o.cy - 24, t: 0 });
    // the nearest bandit on his feet notices the dark and comes to light it again
    let best = null, bd = 1e9;
    for(const g of G.chars) if(g.kind === 'guard' && ['calm', 'suspicious', 'return', 'search'].includes(g.state) && g.role !== 'tower') { const d = Math.hypot(g.x - o.cx, g.y - o.cy); if(d < bd && d < 11 * TS) { bd = d; best = g; } }
    if(best) { best.state = 'suspicious'; best.lastSeen = { x: o.cx, y: o.cy + 24 }; best.goLook = true; best.relight = o; best.investigate = 12; best.sus = .5; best.path = null; say(T('Meşale söndü. Biri yakmaya gelecek.')); }
}
function takedown(g) {
    const p = G.player;
    g.wasAsleep = g.state === 'sleep';
    g.state = 'grabbed';
    busy(.9, T('Bayıltılıyor…'), () => { g.state = 'ko'; g.body = true; G.kos++; Snd.fx('thud'); floatText(g.x, g.y - 36, T('Baygın'), '#cfe8ff'); noise(g.x, g.y, 45, null); });
    p.a = Math.atan2(g.y - p.y, g.x - p.x);
}
function freePrisoner(c) {
    busy(1.4, T('İpler çözülüyor…'), () => {
        c.tied = false; c.following = true; G.freed++;
        floatText(c.x, c.y - 36, T('Kurtarıldı'), '#9fe0a0');
        say(c.noble ? T`${T(c.noble.name)}: "Sonunda! Beni buradan çıkar, çıkışa kadar peşindeyim."` : c.news ? T(c.news) : T('Tutsak peşine takıldı. Onu dışarı çıkar!'));
    });
}
function openChest(o) {
    if(o.trapped && !o.disarmed) { hurtBy(G.player, 'pierce', 30, null); noise(o.cx, o.cy, 130, T('Sandık tuzaklıymış!')); o.known = true; }
    const [a, b] = L.chests[o.ch]; const g = Math.round(rnd(a, b));
    o.open = true; G.gold += g; Snd.fx('coin');
    const item = o.trapped && ITEMS[L.loot] ? L.loot : null;
    if(item) G.items.push(item);
    const steel = L.mine && o.ch === 'C' ? (R.site.steel || 0) : 0;   // the foreman keeps the crucible steel
    G.steel += steel;
    floatText(o.cx, o.cy - 24, T`+${g} dinar` + (item ? ' · ' + T(ITEMS[item].name) : '') + (steel ? ' · ' + T`${steel} pota çeliği` : ''), '#f5d76e');
    noise(o.cx, o.cy, 35, null);
}
function pullLever(o) {
    o.pulled = true;
    busy(.6, T('Kol çekiliyor…'), () => {
        const opens = (L.lever && L.lever.opens) || [];
        for(const [x, y] of opens) G.opened.add(x + ',' + y);
        for(const k of G.ambushBlock || []) G.opened.add(k);          // the lever also lifts an ambush's rockfall
        // a sluice lever lets the deep water out of its box: what you swam, they now wade
        const dr = L.lever && L.lever.drains;
        if(dr) { for(let y = dr[1]; y <= dr[3]; y++) for(let x = dr[0]; x <= dr[2]; x++) if(G.grid[y][x] === '%') G.grid[y][x] = '~'; bakeGround(); say(T('Savak açıldı: su çekiliyor, artık haydutlar da geçebilir.')); }
        buildLight();
        const at = opens[0] ? { x: opens[0][0] * TS + 16, y: opens[0][1] * TS + 16 } : { x: o.cx, y: o.cy };
        G.fx.push({ kind: 'dust', x: at.x, y: at.y, t: 0 });
        noise(at.x, at.y, 160, dr ? null : T('Taşlar gürültüyle yuvarlandı!'));   // a sluice's own line is said above
    });
}
function useTrapdoor(o) {
    const other = G.trapdoors.find(t => t !== o);
    if(!other) return;
    const p = G.player, spot = freeSpotNear(other.x, other.y);
    p.x = spot.x; p.y = spot.y;
    for(const c of G.chars) if((c.kind === 'squad' && c.state !== 'down') || (c.kind === 'prisoner' && c.following)) { c.x = spot.x + rnd(-6, 6); c.y = spot.y + rnd(-4, 4); }
    G.trail = [];
}

// ---------- the hideouts' things (2.9.0) ----------
// the key off a belt: a sleeper, a bandit with his back to you, or one who's down. Lifting it
// from a man on his feet is a brush he may half feel
function pickKey(g) {
    busy(.8, T('Anahtar alınıyor…'), () => {
        if(!g.key) return;
        g.key = false; G.key = true;
        if(g.state === 'calm' || g.state === 'return') g.sus = Math.min(.9, g.sus + .3);
        floatText(g.x, g.y - 40, T('Anahtar sende'), '#f5d76e'); say(T('Anahtar sende: kilitli kapıya yürü, açılır.'));
    });
}
// the bell carries over the whole place: everyone awake walks over to see who rang it, the
// sleepers near it wake up. Ring it and be somewhere else when they come
function ringBell(o) {
    o.rung = true; o.swingT = 3;
    noise(o.cx, o.cy, BELL_R, T('Çan bütün inde yankılandı! Herkes çana koşuyor.'));
    for(const g of G.chars) if(g.kind === 'guard' && g.state === 'suspicious') { g.investigate = 14; g.lastSeen = { x: o.cx, y: o.cy + 28 }; }
    Snd.fx('bell');
}
function takeMeat(o) { o.taken = true; G.meat += 2; floatText(o.cx, o.cy - 24, T('+2 et'), '#ffb38a'); say(T('Et elinde: attığında köpek peşinden gider.')); }
function takeHerb(o) { o.taken = true; G.draught++; floatText(o.cx, o.cy - 24, T('+1 uyku otu'), '#9fe0a0'); say(T('Uyku otu: içtikleri fıçıya katarsan zar başındakiler uyur.')); }
// the herb in the keg: a while later every bandit at the dice table near it drinks and nods off
function drugKeg(o) {
    G.draught--; o.drugged = true;
    G.drug = { x: o.cx, y: o.cy, t: DRUG_T };
    floatText(o.cx, o.cy - 30, T('Fıçıya karıştı'), '#9fe0a0'); say(T`Biraz bekle: ${DRUG_T} saniye içinde içenler uyuyacak.`);
}
function updateDrug(dt) {
    const d = G.drug;
    if(!d || (d.t -= dt) > 0) return;
    G.drug = null;
    let n = 0;
    for(const g of G.chars) if(g.kind === 'guard' && !g.dog && (g.role === 'dice' || g.role === 'sleep') && ['calm', 'suspicious', 'return'].includes(g.state) && Math.hypot(g.x - d.x, g.y - d.y) < DRUG_R) {
        g.state = 'sleep'; g.role = 'sleep'; g.sus = 0; n++;
        floatText(g.x, g.y - 40, T('Uyudu'), '#cfe8ff');
    }
    say(n ? T`Fıçıdan içen ${n} haydut uyuyakaldı.` : T('Fıçıdan içen olmadı.'));
}
// the cleat's load is the nearest hanging z within eight tiles that hasn't come down yet
function loadOf(o) {
    let best = null, bd = 8 * TS;
    for(const z of G.objs) if(z && z.load && !z.down) { const d = Math.hypot(z.cx - o.cx, z.cy - o.cy); if(d < bd) { bd = d; best = z; } }
    return best;
}
// cut: the load comes down. Whoever stands under it is knocked senseless (a friend too), and the
// crash is heard far off — the guards come to look at the heap
function cutRope(o) {
    const z = loadOf(o);
    o.cut = true;
    if(!z) return;
    z.down = true; z.solid = false;
    G.fx.push({ kind: 'crash', x: z.cx, y: z.cy, t: 0 });
    let n = 0;
    for(const c of G.chars) {
        if(c.state === 'down' || c.state === 'ko' || Math.hypot(c.x - z.cx, c.y - 6 - z.cy) > DROP_R) continue;
        if(c.kind === 'guard') { c.state = 'ko'; c.body = true; c.hp = Math.min(c.hp, 1); G.kos++; n++; floatText(c.x, c.y - 36, T('Baygın'), '#cfe8ff'); }
        else hurtBy(c, 'blunt', 40, null);
    }
    Snd.fx('thud');
    noise(z.cx, z.cy, 240, n ? T`Yük çöktü: altındaki ${n} haydut baygın!` : T('Yük gürültüyle yere çöktü!'));
}
// the bear comes out of its cage roaring and goes for the nearest bandit; they turn on it
function freeBear(o) {
    o.open = true; o.solid = false;
    const sp = freeSpotNear(o.x, o.y);
    const b = makeChar('beast', 0, 0, { x: sp.x, y: sp.y, hp: 150, maxHp: 150, attack: 22, defense: 3, face: 'down' });
    G.chars.push(b);
    floatText(sp.x, sp.y - 40, T('GRRAAH!'), '#ff9a6a');
    noise(sp.x, sp.y, 260, T('Ayı kafesinden çıktı! Haydutlara saldırıyor.'));
}
function jumpDown(tx, ty) {
    const p = G.player, x = tx * TS + 16, y = ty * TS + 20;
    p.x = x; p.y = y; p.a = Math.PI / 2;
    for(const c of G.chars) if((c.kind === 'squad' && c.state !== 'down') || (c.kind === 'prisoner' && c.following)) { c.x = x + rnd(-8, 8); c.y = y + rnd(0, 6); }
    G.trail = [];
    noise(x, y, 100, null);
    G.fx.push({ kind: 'dust', x, y: y - 6, t: 0 });
}

// ---------- the mine ----------
// The sacks the site still holds stand at the ore face and in the coal store; the rest were
// carried off on an earlier visit and come back as the miners dig (Game.lairTick)
function stockMine() {
    const ore = R.site.ore || {};
    for(const kind of ['iron', 'coal']) G.objs.filter(o => o && o.ore === kind).forEach((o, i) => { if(i >= (ore[kind] || 0)) o.gone = true; });
    if(G.cart) G.cart.path = railPath(G.cart.x, G.cart.y);
}
// the rail from (x0, y0) to its end against an exit, tile by tile, the start first
function railPath(x0, y0) {
    const prev = new Map([[x0 + ',' + y0, null]]), q = [[x0, y0]], N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for(let i = 0; i < q.length; i++) {
        const [x, y] = q[i];
        if(N4.some(([dx, dy]) => isExit(x + dx, y + dy))) {
            const out = [];
            for(let k = x + ',' + y; k; k = prev.get(k)) out.unshift(k.split(',').map(Number));
            return out;
        }
        for(const [dx, dy] of N4) {
            const k = (x + dx) + ',' + (y + dy);
            if(tile(x + dx, y + dy) === '=' && !prev.has(k)) { prev.set(k, x + ',' + y); q.push([x + dx, y + dy]); }
        }
    }
    return [[x0, y0]];
}
function shoulder(o) {
    busy(.8, T('Çuval sırtlanıyor…'), () => {
        o.gone = true; G.carry = o.ore;
        noise(o.cx, o.cy, 45, null);
        say(T('Ağır: yavaş yürürsün, eğilsen bile adımın duyulur. Çıkışa bıraktığın çuval senindir.'), 4);
    });
}
// set the sack down on a free tile beside you (a blow you swing drops it with a thud); with
// nowhere to put it, it stays on your back
function dropSack(thud) {
    const p = G.player, kind = G.carry;
    if(!kind) return;
    const tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS);
    for(const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const x = tx + dx, y = ty + dy, here = obj(x, y);
        if(solidTile(x, y) || (here && !here.gone) || isExit(x, y) || ['~', 'D', 'W'].includes(tile(x, y))) continue;
        const ch = kind === 'iron' ? 'o' : 'q';
        G.objs[y * G.w + x] = Object.assign({ ch, x, y, cx: x * TS + 16, cy: y * TS + 16, frame: 0 }, OBJDEF[ch]);
        G.carry = null;
        noise(x * TS + 16, y * TS + 16, thud ? 90 : 35, null);
        return;
    }
}
function bankSack() {
    const k = G.carry, p = G.player;
    if(!k) return;
    G.carry = null; G.bank[k]++;
    floatText(p.x, p.y - 40, T('Çuval güvende'), '#9fe0a0');
}
function loadCart(c) {
    busy(.6, T('Arabaya yükleniyor…'), () => {
        if(!G.carry) return;
        c.load[G.carry]++; G.carry = null;
        noise(c.cx, c.cy, 60, null);
    });
}
function pushCart(c) {
    busy(.7, T('Araba itiliyor…'), () => {
        c.rolling = true; c.seg = 0; c.noiseT = 0;
        say(T('Araba raylarda gürleyerek yuvarlanıyor! Bütün maden duydu.'), 4);
    });
}
// a rolling cart rumbles every step of the way: loud enough to wake the mine, and to pull its
// guards to the rail, away from you; at the mouth its sacks are yours
function updateCart(dt) {
    const c = G.cart;
    if(!c || !c.rolling) return;
    const nx = c.path[c.seg + 1];
    if(!nx) {
        c.rolling = false; c.done = true;
        const n = c.load.iron + c.load.coal;
        G.bank.iron += c.load.iron; G.bank.coal += c.load.coal; c.load = { iron: 0, coal: 0 };
        floatText(c.cx, c.cy - 30, T`${n} çuval güvende`, '#9fe0a0');
        return;
    }
    const tx = nx[0] * TS + 16, ty = nx[1] * TS + 16, dx = tx - c.cx, dy = ty - c.cy, d = Math.hypot(dx, dy), step = CART_SPEED * dt;
    if(d <= step) { c.cx = tx; c.cy = ty; c.seg++; c.x = nx[0]; c.y = nx[1]; }
    else { c.cx += dx / d * step; c.cy += dy / d * step; }
    if((c.noiseT -= dt) <= 0) { c.noiseT = .6; noise(c.cx, c.cy, 210, null); }
}
// with a sack on your back the button only does what a sack allows
function carryInteraction(p, tx, ty) {
    const c = G.cart, cand = [];
    if(isExit(tx, ty)) cand.push({ label: T('Çuvalı bırak · güvende'), at: null, run: () => busy(.5, T('Çuval bırakılıyor…'), bankSack) });
    if(c && !c.rolling && !c.done && c.load.iron + c.load.coal < CART_CAP && Math.hypot(c.cx - p.x, c.cy + 6 - p.y) < 50)
        cand.push({ label: T`Arabaya yükle (${c.load.iron + c.load.coal}/${CART_CAP})`, at: c, run: () => loadCart(c) });
    cand.push({ label: T('Çuvalı yere koy'), at: null, run: () => dropSack(false) });
    if(chaser()) return { label: T('Peşindeler!'), at: cand[0].at, blocked: true, run: () => say(T('Peşinde haydutlar varken hiçbir şeyle uğraşamazsın. Önce onlardan kurtul ya da uzaklaş.')) };
    return cand[0];
}

// ---------- guards ----------
const FOV = 1.25, BASE_RANGE = 220;   // half-angle: a 143° cone
function guardSight(g) {
    // shorter in the dark; a guard who knows something's wrong looks harder
    if(g.role === 'tower') return { fov: .95, range: 1.75 };
    return { fov: g.role === 'dice' && g.state === 'calm' ? .85 : FOV, range: (g.role === 'dice' && g.state === 'calm' ? .62 : 1) * (g.state === 'alert' || g.state === 'search' ? 1.25 : 1) };
}
function canSee(g, c) {
    if(c.state === 'down' && !c.body) return false;
    const dx = c.x - g.x, dy = (c.y - 10) - (g.y - 14), d = Math.hypot(dx, dy);
    if(c.hidden) return d < 22 ? { d, range: 40, light: 1 } : false;
    const under = c.kind ? tile(Math.floor(c.x / TS), Math.floor(c.y / TS)) : '';
    if(under === '%' && d > SWIM_SEEN) return false;                    // a head in dark water
    if(under === 'r' && c.crouch && d > REED_SEEN) return false;        // crouched in the reeds
    const s = guardSight(g), light = lightAt(c.x, c.y);
    const range = BASE_RANGE * s.range * (.3 + .7 * Math.min(1, light)) * (c.crouch ? .78 : 1) * (L.fog || 1) * (g.dog ? .7 : 1);
    if(d > range) return false;
    if(d > 26 && Math.abs(angDiff(Math.atan2(dy, dx), g.a)) > s.fov) return false;
    if(!los(g.x, g.y - 14, c.x, c.y - 10, false)) return false;
    return { d, range, light };
}
function updateGuard(g, dt) {
    if(g.state === 'down' || g.state === 'ko') return;
    if(g.state === 'grabbed') { g.anim = 'Hurt'; return; }
    if(g.wakeT) { g.wakeT -= dt; if(g.wakeT <= 0) { g.wakeT = 0; g.state = 'alert'; floatText(g.x, g.y - 40, T('Uyandı!'), '#ffb36b'); } return; }
    if(g.state === 'sleep') { g.anim = 'Idle'; return; }
    if(g.state === 'eat') return updateEating(g, dt);
    const p = G.player;
    g.sees = null;
    // eyes: the hero, the squad, freed prisoners, a loose bear — and fallen friends. A dog's nose
    // finds what its eyes miss: close by, through the dark, round a corner it can't (walls stop it)
    let best = null;
    for(const c of G.chars) {
        if(!(c.kind === 'player' || c.kind === 'squad' || c.kind === 'beast' || (c.kind === 'prisoner' && c.following)) || c.state === 'down') continue;
        let v = canSee(g, c);
        if(!v && g.dog && c.kind !== 'beast' && !c.hidden && !c.swim) {
            const d = Math.hypot(c.x - g.x, c.y - g.y), r = SMELL * (c.running || (c.kind === 'player' && G.carry) ? 1.6 : 1);
            if(d < r && los(g.x, g.y - 6, c.x, c.y - 6, false)) v = { d, range: r * 1.2, light: 1 };
        }
        if(v && (!best || v.d < best.v.d)) best = { c, v };
    }
    // a suspicious or angry dog barks, and the bark brings the bandits to the dog
    if(g.dog && (g.state === 'suspicious' || g.state === 'alert') && (g.barkT = (g.barkT || 0) - dt) <= 0) {
        g.barkT = 1.6; floatText(g.x, g.y - 30, T('Hav! Hav!'), '#ffb36b');
        noise(g.x, g.y, 170, g.state === 'alert' ? null : T('Bir köpek havlıyor!'), g);
    }
    if(best) {
        g.sees = { player: best.c === p };
        g.lastSeen = { x: best.c.x, y: best.c.y }; g.target = best.c;
        if(best.c.kind === 'beast' && g.state !== 'alert') { g.state = 'alert'; g.sus = 1; raiseAlarm(g, true, best.c); }
        else if(g.state !== 'alert') {
            const moving = best.c.kind === 'player' ? (best.c.anim !== 'Idle') : true;
            const rate = 4.2 * (.45 + Math.min(1, best.v.light)) * (1.35 - best.v.d / best.v.range) * (best.c.crouch ? .6 : 1) * (moving ? 1 : .7)
                * (best.c.kind === 'player' ? 1 : .75) * (best.v.d < 48 ? 2.5 : 1);
            g.sus = Math.min(1, g.sus + rate * dt);
            if(g.sus > .35 && g.state === 'calm') { g.state = 'suspicious'; g.investigate = 3; }
            if(g.sus >= 1) { g.state = 'alert'; raiseAlarm(g); }
        } else G.alarm = 12;
    } else if(g.state !== 'alert') g.sus = Math.max(0, g.sus - .22 * dt);
    // a body on the floor is an alarm
    if(g.state !== 'alert') for(const c of G.chars) {
        if(!c.body || c === g || c.kind !== 'guard' || c.foundBy) continue;
        if(canSee(g, { x: c.x, y: c.y, crouch: false, state: 'x' })) { c.foundBy = g; g.state = 'alert'; g.lastSeen = { x: c.x, y: c.y }; say(T('Bir haydut yerde yatan arkadaşını buldu!')); raiseAlarm(g, true); }
    }

    const walk = g.dog ? 56 : 44, runS = g.dog ? 135 : 108;
    if(g.role === 'tower') {
        if(g.state === 'alert') { const t = nearestFoe(g); if(t) g.a = Math.atan2(t.y - g.y, t.x - g.x); if(best) G.alarm = Math.max(G.alarm, 8); }
        else if(g.state !== 'suspicious') g.a = g.home.a + Math.sin(G.t * .5) * g.sweep;
        else { g.investigate -= dt; if(g.lastSeen) g.a = Math.atan2(g.lastSeen.y - g.y, g.lastSeen.x - g.x); if(g.investigate <= 0) g.state = 'calm'; }
        g.anim = 'Idle';
        return;
    }
    if(g.state === 'alert') {
        if(g.react === undefined) g.react = .5;
        const t = g.target && g.target.state !== 'down' ? g.target : nearestFoe(g);
        if(!t) { g.state = 'search'; g.searchT = 6; return; }
        g.target = t;
        const d = Math.hypot(t.x - g.x, t.y - g.y);
        const seesT = canSee(g, t);
        if(!seesT && g.lastSeen && Math.hypot(g.lastSeen.x - g.x, g.lastSeen.y - g.y) < 20 && G.alarm <= 0) { g.state = 'search'; g.searchT = 6; }
        // fairness: only so many of them press in at once
        const engaged = g.engaged = t.kind === 'beast' || hasToken(g);
        const goal = seesT ? t : (g.lastSeen || t);
        if(engaged) {
            if(d > 30) { followPath(g, goal, runS, dt); g.anim = 'Run'; }
            else { g.a = Math.atan2(t.y - g.y, t.x - g.x); g.anim = 'Idle'; }
        } else {
            if(d > 110) { followPath(g, goal, walk * 1.3, dt); g.anim = 'Walk'; }
            else if(d < 80) { walkTo(g, g.x - (t.x - g.x) / d * 20, g.y - (t.y - g.y) / d * 20, walk, dt); g.anim = 'Walk'; g.a = Math.atan2(t.y - g.y, t.x - g.x); }
            else { g.a = Math.atan2(t.y - g.y, t.x - g.x); g.anim = 'Idle'; }
        }
        // attacks are telegraphed: a wind-up, then the blow lands if you're still there
        g.cd -= dt;
        if(g.windup > 0) {
            g.windup -= dt; g.anim = 'attack';
            if(g.windup <= 0) {
                g.cd = g.ambusher && G.solo ? 1.6 : 1.2;
                const dd = Math.hypot(t.x - g.x, t.y - g.y);
                // a lair bandit's blow is a real one (his attack plus a flat 12) — then armour decides
                if(dd < 40 && Math.abs(angDiff(Math.atan2(t.y - g.y, t.x - g.x), g.a)) < 1.2) { hurtBy(t, g.dog ? 'pierce' : G.band.dmg, (g.attack + (g.dog ? 6 : 12)) * rnd(.85, 1.15) * (g.leader ? 1.3 : 1) * (g.weak ? .7 : 1), g); Snd.fx('hit'); }
            }
        } else if(engaged && d < 34 && g.cd <= 0 && (g.react || 0) <= 0) { g.windup = .45; g.animT = 0; }
        g.react -= dt;
        return;
    }
    if(g.state === 'suspicious') {
        g.investigate -= dt;
        const to = g.lastSeen;
        if(to) {
            const d = Math.hypot(to.x - g.x, to.y - g.y);
            // a noise makes him walk over and look round; a glimpse makes him stare
            if(d > 24 && (g.goLook || g.sus > .45)) { followPath(g, to, walk * .9, dt); g.anim = 'Walk'; }
            else {
                g.lookT = (g.lookT || 0) + dt;
                g.a = Math.atan2(to.y - g.y, to.x - g.x) + Math.sin(G.t * 2) * .7; g.anim = 'Idle';
                if(g.relight && g.lookT > 1.5 && d < 48) { const o = g.relight; g.relight = null; o.lit = true; o.lightRef.off = false; buildLight(); floatText(o.cx, o.cy - 40, T('Meşaleyi yaktı'), '#ffd28a'); g.investigate = Math.min(g.investigate, 1); }
                if(g.lookT > 3) g.goLook = false;
            }
        }
        if(g.investigate <= 0 && g.sus < .3 && !g.relight) { g.state = 'return'; g.goLook = false; }
        return;
    }
    if(g.state === 'search') {
        g.searchT -= dt;
        const to = g.lastSeen || g.home;
        if(Math.hypot(to.x - g.x, to.y - g.y) > 20) { followPath(g, to, walk, dt); g.anim = 'Walk'; }
        else { g.a += dt * 1.6; g.anim = 'Idle'; }
        if(g.searchT <= 0) g.state = 'return';
        return;
    }
    if(g.state === 'return') {
        const home = g.route ? { x: g.route[g.ri || 0][0] * TS + 16, y: g.route[g.ri || 0][1] * TS + 20 } : g.home;
        if(followPath(g, home, walk, dt) || Math.hypot(home.x - g.x, home.y - g.y) < 6) { g.state = 'calm'; if(!g.route) g.a = g.home.a; }
        g.anim = 'Walk';
        return;
    }
    // calm routines
    if(g.role === 'patrol' && g.route) {
        g.ri = g.ri || 0;
        if(g.pause > 0) { g.pause -= dt; g.anim = 'Idle'; g.a += Math.sin(G.t * 1.3) * dt * 1.2; return; }
        const [rx, ry] = g.route[g.ri], tgt = { x: rx * TS + 16, y: ry * TS + 20 };
        followPath(g, tgt, walk, dt);
        if(Math.hypot(tgt.x - g.x, tgt.y - g.y) < 5) { g.ri = (g.ri + 1) % g.route.length; g.pause = 1.4; g.path = null; }
        g.anim = 'Walk';
    } else {
        g.anim = 'Idle';
        if(g.sweep) g.a = g.home.a + Math.sin(G.t * .6) * g.sweep;
    }
}
// a dog at its meat: trots over, eats, and only a blow or the end of the meat stops it
function updateEating(g, dt) {
    const m = g.meat;
    if(!m) { g.state = 'return'; return; }
    if(Math.hypot(m.x - g.x, m.y + 4 - g.y) > 14) { followPath(g, { x: m.x, y: m.y + 4 }, 135, dt); g.anim = 'Run'; return; }
    g.anim = 'Idle'; g.a = Math.atan2(m.y - g.y, m.x - g.x);
    if((g.eatT -= dt) <= 0) {
        G.meats = G.meats.filter(x => Math.hypot(x.x - m.x, x.y - m.y) > 4);
        g.meat = null; g.state = 'return'; g.sus = 0;
        floatText(g.x, g.y - 30, T('Eti bitirdi'), '#ffd28a');
    }
}
// the bear: after the nearest bandit it can reach, mauling; with none left it paces by its cage
function updateBeast(b, dt) {
    if(b.state === 'down') return;
    b.retarget = (b.retarget || 0) - dt;
    if(b.retarget <= 0 || !b.foe || ['down', 'ko'].includes(b.foe.state)) {
        b.retarget = .6;
        b.foe = G.chars.filter(g => g.kind === 'guard' && !['down', 'ko'].includes(g.state) && Math.hypot(g.x - b.x, g.y - b.y) < 16 * TS)
            .sort((x, y) => Math.hypot(x.x - b.x, x.y - b.y) - Math.hypot(y.x - b.x, y.y - b.y)).find(g => Math.hypot(g.x - b.x, g.y - b.y) < 40 || path(b, g)) || null;
    }
    const t = b.foe;
    b.cd -= dt; b.atkT -= dt;
    if(!t) { b.anim = 'Idle'; return; }
    const d = Math.hypot(t.x - b.x, t.y - b.y);
    if(d > 30) { followPath(b, t, 96, dt); b.anim = 'Run'; return; }
    b.a = Math.atan2(t.y - b.y, t.x - b.x); b.anim = b.atkT > 0 ? 'attack' : 'Idle';
    if(b.cd <= 0) { b.cd = 1.1; b.atkT = .4; hurtBy(t, 'cut', b.attack * rnd(.85, 1.15) * Battle.DAMAGE_PACE * 1.2, b); Snd.fx('hit'); }
}
function nearestFoe(g) {
    let best = null, bd = 1e9;
    for(const c of G.chars) if((c.kind === 'player' || c.kind === 'squad' || c.kind === 'beast') && c.state !== 'down') { const d = Math.hypot(c.x - g.x, c.y - g.y); if(d < bd) { bd = d; best = c; } }
    return best;
}
// alone: three press in at once (two in an ambush, whose bandits hit softer); each soldier with you adds one
function hasToken(g) {
    const squadUp = G.chars.filter(c => c.kind === 'squad' && c.state !== 'down').length;
    const tokens = (G.ambushState === 1 && squadUp === 0) ? 2 : 3 + squadUp;
    const alert = G.chars.filter(c => c.kind === 'guard' && c.state === 'alert').sort((a, b) => Math.hypot(a.x - G.player.x, a.y - G.player.y) - Math.hypot(b.x - G.player.x, b.y - G.player.y));
    return alert.indexOf(g) < tokens;
}

// ---------- squad and freed prisoners ----------
function updateFollower(c, dt, i) {
    if(c.state === 'down') return;
    const p = G.player;
    if(c.kind === 'squad' && G.alarm > 0) {
        // fight the nearest alert bandit they can actually walk to (one in a cellar only a trapdoor
        // reaches is left for when you take them down there); rechecked twice a second
        c.retarget = (c.retarget || 0) - dt;
        if(c.retarget <= 0 || !c.foe || c.foe.state !== 'alert') {
            c.retarget = .5; c.foe = null;
            const foes = G.chars.filter(g => g.kind === 'guard' && g.state === 'alert' && Math.hypot(g.x - c.x, g.y - c.y) < 12 * TS)
                .sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
            for(const g of foes) if(Math.hypot(g.x - c.x, g.y - c.y) < 40 || path(c, g)) { c.foe = g; break; }
        }
        const t = c.foe, bd = t ? Math.hypot(t.x - c.x, t.y - c.y) : 1e9;
        if(t) {
            c.crouch = false;
            if(bd > 30) { followPath(c, t, 100, dt); c.anim = 'Run'; }
            else {
                c.a = Math.atan2(t.y - c.y, t.x - c.x); c.anim = c.atkT > 0 ? 'attack' : 'Idle';
                c.cd -= dt; c.atkT -= dt;
                if(c.cd <= 0) { c.cd = .95; c.atkT = .4; c.animT = 0; hurtBy(t, 'cut', c.attack * rnd(.85, 1.15) * Battle.DAMAGE_PACE * 1.2, c); }
            }
            return;
        }
    }
    // follow the trail, a few steps apart; crouch when the leader crouches
    const slot = Math.min(G.trail.length - 1, 3 + i * 3);
    const tgt = slot >= 0 ? G.trail[slot] : null;
    c.crouch = p.crouch;
    if(!tgt) { c.anim = 'Idle'; return; }
    const d = Math.hypot(tgt.x - c.x, tgt.y - c.y);
    if(d > 14) {
        const sp = Math.min(p.crouch ? 50 : 135, Math.max(60, d * 3)) * (c.kind === 'prisoner' ? .9 : 1);
        // straight at the trail point when nothing's in the way, round the walls when something is
        if(los(c.x, c.y - 6, tgt.x, tgt.y - 6, false) && d < 3 * TS) walkTo(c, tgt.x, tgt.y, sp, dt);
        else followPath(c, tgt, sp, dt);
        c.anim = sp > 100 ? 'Run' : 'Walk';
    } else { c.anim = 'Idle'; c.a = p.a; }
}

// ---------- ambush ----------
function updateAmbush() {
    if(!G.ambushOn || G.ambushState) return;
    const A = L.ambush, p = G.player, tx = p.x / TS, ty = p.y / TS;
    if(tx >= A.room[0] + .2 && tx <= A.room[2] + .8 && ty >= A.room[1] + .3 && ty <= A.room[3] + .9) {
        G.ambushState = 1;
        G.solo = !G.chars.some(c => c.kind === 'squad' && c.state !== 'down');
        for(const [x, y] of A.doors || []) { const d = G.doors[x + ',' + y]; if(d) { d.open = false; d.locked = true; } }
        G.ambushBlock = (A.block || []).map(([x, y]) => x + ',' + y);
        for(const [x, y] of A.block || []) { G.grid[y][x] = 'X'; G.opened.delete(x + ',' + y); G.fx.push({ kind: 'dust', x: x * TS + 16, y: y * TS + 16, t: 0 }); }
        buildLight();
        const n = G.solo ? 2 : 3, st = G.band.foot;
        for(let i = 0; i < n; i++) {
            const [sx, sy] = A.spawns[i % A.spawns.length];
            const hp = Math.round(st.hp * (G.solo ? .7 : 1));
            const g = makeChar('guard', sx, sy, { look: LOOKS.bandit(10 + i), hp, maxHp: hp, attack: st.attack, defense: st.defense, role: 'post', ambusher: true, weak: G.solo });
            if(i >= A.spawns.length) g.x += 14;
            g.home = { x: g.x, y: g.y, a: 0 }; g.state = 'alert'; g.sus = 1; g.react = G.solo ? 1.2 : .6; g.lastSeen = { x: p.x, y: p.y };
            G.chars.push(g);
        }
        G.banner = { t: 3, text: A.block ? T('Pusu! Tünel çöktü') : T('Pusu! Kapı kapandı') };
        say(G.solo ? T('Pusu! İkişer ikişer saldırıyorlar, sakin ol.') : T('Pusu! Askerlerin yanında.'));
        if(!G.alarm) { G.alarms++; Snd.alarm(); }
        G.alarm = 12;
    }
}
function checkAmbushOver() {
    if(G.chars.some(c => c.ambusher && c.state !== 'down' && c.state !== 'ko')) return;
    G.ambushState = 2;
    for(const [x, y] of L.ambush.doors || []) { const d = G.doors[x + ',' + y]; if(d) { d.locked = false; d.open = true; } }
    for(const [x, y] of L.ambush.block || []) G.opened.add(x + ',' + y);
    buildLight();
    say(T('Pusu bitti. Yol açıldı.'));
}

// ---------- the loop ----------
function frame(t) {
    if(!api.active) { loopId = null; return; }
    loopId = requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - (last || t)) / 1000); last = t;
    if(Game.skipFrame(t)) return;
    Debug.guard('lair loop', () => {
        if(!G) return;
        if(!G.done && !blocked()) update(dt);
        // under a window (blurred backdrop) the picture holds still: nothing moves anyway
        if(el('modal-overlay').classList.contains('hidden') || !G.drawn) { render(); G.drawn = true; }
    });
}
function update(dt) {
    G.t += dt;
    updatePlayer(dt);
    let fi = 0;
    for(const c of G.chars) {
        c.animT += dt * 1000; c.hurtT = Math.max(0, c.hurtT - dt);
        if(c.lockedToldT) c.lockedToldT = Math.max(0, c.lockedToldT - dt);
        if(c.kind !== 'guard' && c.kind !== 'beast') c.swim = c.state !== 'down' && tile(Math.floor(c.x / TS), Math.floor(c.y / TS)) === '%';
        if(c.kind === 'guard') updateGuard(c, dt);
        else if(c.kind === 'beast') updateBeast(c, dt);
        else if(c.kind === 'squad' || (c.kind === 'prisoner' && c.following)) updateFollower(c, dt, fi++);
        else if(c.kind === 'prisoner' && c.loud && c.tied && !c.shushed) {
            // an excited prisoner calls out if you hang about near him without hushing him
            const d = Math.hypot(c.x - G.player.x, c.y - G.player.y);
            if(d < 100) {
                c.yellT = (c.yellT || 0) + dt;
                if(c.yellT > 1.2 && !c.warned) { c.warned = true; floatText(c.x, c.y - 44, 'Mmh! Mmmh!', '#ffd28a'); say(T('Bu tutsak heyecanlı. Önce sus işareti ver, yoksa bağıracak.')); }
                if(c.yellT > 4.5) { c.yellT = 1.5; noise(c.x, c.y, 180, T('Tutsak bağırdı: "Buradayım! Kurtarın beni!"')); floatText(c.x, c.y - 44, T('Kurtarın!'), '#ffb3a8'); }
            }
        }
        if(c.state !== 'down' && c.state !== 'ko') c.dir = dirOf(c.a);
    }
    updateAmbush();
    updateCart(dt);
    updateDrug(dt);
    for(const o of G.objs) if(o && o.swingT > 0) o.swingT -= dt;
    if(G.horsesRun > 0) G.horsesRun -= dt;
    for(const h of G.horses) {
        const P = L.pen.box, run = G.horsesRun > 0;
        h.a += dt * (run ? 2.2 : .15);
        const tx = (P[0] + (P[2] - P[0] + 1) * (.5 + .38 * Math.cos(h.a))) * TS, ty = (P[1] + (P[3] - P[1] + 1) * (.5 + .35 * Math.sin(h.a * (run ? 1.3 : .7)))) * TS + 8;
        const dx = tx - h.x; h.moving = Math.abs(dx) + Math.abs(ty - h.y) > (run ? 1 : .3);
        if(Math.abs(dx) > .5) h.face = dx > 0 ? 1 : -1;
        h.x += (tx - h.x) * Math.min(1, dt * (run ? 5 : .8)); h.y += (ty - h.y) * Math.min(1, dt * (run ? 5 : .8));
        h.gait = run ? 'gallop' : h.moving ? 'walk' : 'stand';
    }
    for(const o of G.objs) if(o && o.shakeT > 0) o.shakeT -= dt;
    if(G.alarm > 0) {
        G.alarm -= dt;
        if(G.chars.some(g => g.kind === 'guard' && g.state === 'alert' && g.sees)) G.alarm = Math.max(G.alarm, 6);
        if(G.alarm <= 0) { for(const g of G.chars) if(g.kind === 'guard' && g.state === 'alert') { g.state = 'search'; g.searchT = 7; g.sus = .5; } say(T('Seni kaybettiler. Arıyorlar…')); }
    }
    // The music follows the alarm itself, whichever path raised or dropped it. Snd.alarm() used
    // to sync it, but raiseAlarm played the stab before setting G.alarm, so the sync still read a
    // quiet lair and the stealth pieces played on through the whole chase.
    if((G.alarm > 0) !== !!G.chaseMusic) { G.chaseMusic = G.alarm > 0; Game.Music.sync(); }
    // discovered tiles for the minimap
    if(((G.t * 10) | 0) !== G.seenTick) {
        G.seenTick = (G.t * 10) | 0;
        const p = G.player, px = Math.floor(p.x / TS), py = Math.floor(p.y / TS);
        for(let y = py - 5; y <= py + 5; y++) for(let x = px - 6; x <= px + 6; x++)
            if(x >= 0 && y >= 0 && x < G.w && y < G.h && !G.seen[y * G.w + x] && los(p.x, p.y - 8, x * TS + 16, y * TS + 16, true)) G.seen[y * G.w + x] = 1;
    }
    for(const f of G.fx) {
        f.t += dt;
        // a pebble lands: a clack, and whoever hears it comes to look
        if(f.land && f.t >= .42) {
            f.land = false;
            if(f.kind === 'meat') { meatLands(f.x, f.y); G.meats.push({ x: f.x, y: f.y }); }
            else { Snd.fx('pebble'); noise(f.x, f.y, PEBBLE_NOISE, null); floatText(f.x, f.y - 16, T('Tık!'), '#e8e0cc'); }
        }
    }
    G.fx = G.fx.filter(f => f.t < (f.kind === 'bats' ? 1.6 : f.kind === 'dust' || f.kind === 'crash' ? 1.2 : f.kind === 'stone' || f.kind === 'meat' ? .45 : .7) || f.land);
    for(const x of G.texts) { x.life -= dt; x.y -= 18 * dt; } G.texts = G.texts.filter(x => x.life > 0);
    if(G.msgT > 0) G.msgT -= dt;
    if(G.banner) { G.banner.t -= dt; if(G.banner.t <= 0) G.banner = null; }
    Snd.tick(dt);
    updateHud();
}

// ---------- rendering ----------
function resize() {
    const v = el('lair-view');
    // pixel art at an integer zoom stays crisp at 2x; lite mode (a phone) spares the third of the pixels above that
    DPR = Math.min(Game.lite() ? 2 : 3, devicePixelRatio || 1);
    const w = v.clientWidth || innerWidth, h = v.clientHeight || innerHeight;
    canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR);
    // integer zoom keeps the pixel art crisp: ~11 tiles across a phone, ~22 on a desktop
    const touch = Game.isTouch();
    Z = Math.max(1, Math.round(canvas.width / (touch ? 11 * TS : 22 * TS)));
    if(touch && canvas.height / Z < 9 * TS) Z = Math.max(1, Math.floor(canvas.height / (9 * TS)));
    VW = canvas.width / Z; VH = canvas.height / Z;
}
function drawSprite(img, sx, sy, sw, sh, x, y, w, h) { if(img && img.width) ctx.drawImage(img, sx, sy, sw, sh, Math.round(x), Math.round(y), w, h); }
function render() {
    const p = G.player;
    let camX = clamp(p.x - VW / 2, -40, G.w * TS - VW + 40), camY = clamp(p.y - VH / 2 - 10, -40, G.h * TS - VH + 40);
    if(G.w * TS < VW) camX = (G.w * TS - VW) / 2; if(G.h * TS < VH) camY = (G.h * TS - VH) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    mouse.world = { x: mouse.sx / Z + camX, y: mouse.sy / Z + camY };
    ctx.fillStyle = '#050407'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cam = () => ctx.setTransform(Z, 0, 0, Z, -Math.round(camX * Z), -Math.round(camY * Z));
    cam();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(G.ground, 0, 0, G.w * TS, G.h * TS);
    // water shimmer
    for(let y = Math.max(0, camY / TS | 0); y < Math.min(G.h, (camY + VH) / TS + 1); y++) for(let x = Math.max(0, camX / TS | 0); x < Math.min(G.w, (camX + VW) / TS + 1); x++) {
        if(tile(x, y) !== '~') continue;
        const s = (G.t * 1.6 + x * .7 + y * 1.3) % 2;
        ctx.fillStyle = 'rgba(120,180,200,.18)'; ctx.fillRect(x * TS + ((s * 8) | 0) * 2, y * TS + 10, 10, 2); ctx.fillRect(x * TS + 18 - ((s * 5) | 0) * 2, y * TS + 24, 8, 2);
    }
    // floor-level things first, then everything that stands, in depth order
    const sprites = [];
    for(const o of G.objs) {
        if(!o || o.gone) continue;
        if(o.spikes) { if(o.known) { const f = o.sprung ? Math.min(5, ((G.t * 12) | 0) % 6) : 0; drawSprite(IMG.spikes, f * 17, 0, 17, 17, o.cx - 17, o.cy - 17, 34, 34); } continue; }
        if(o.trapdoor) { drawSprite(IMG.trapdoor, 0, 0, 17, 17, o.cx - 17, o.cy - 17, 34, 34); continue; }
        if(o.bats) continue;
        sprites.push(o.load && !o.down ? { obj: o, cy: o.cy + 70 } : o);       // a hanging load is over the heads under it
    }
    // reeds stand up round whoever wades through them; meat thrown for the dogs lies on the floor
    const vx0 = Math.max(0, camX / TS | 0), vx1 = Math.min(G.w, (camX + VW) / TS + 1), vy0 = Math.max(0, camY / TS | 0), vy1 = Math.min(G.h, (camY + VH) / TS + 2);
    for(let y = vy0; y < vy1; y++) for(let x = vx0; x < vx1; x++) if(tile(x, y) === 'r') sprites.push({ reeds: true, x, y, cy: y * TS + 26 });
    for(const m of G.meats) drawMeat(m.x, m.y);
    for(const k in G.doors) sprites.push({ door: G.doors[k], cy: G.doors[k].y * TS + 30 });
    for(let y = 0; y < G.h; y++) for(let x = 0; x < G.w; x++) if(tile(x, y) === 'X' && !G.opened.has(x + ',' + y)) sprites.push({ rubble: true, x, y, cy: y * TS + 28 });
    // vision cones under the people
    for(const g of G.chars) if(g.kind === 'guard' && ['calm', 'suspicious', 'alert', 'search', 'return'].includes(g.state) && Math.hypot(g.x - p.x, g.y - p.y) < 12 * TS) drawCone(g);
    for(const c of G.chars) sprites.push({ char: c, cy: c.elev ? c.y + TS + 4 : c.y });
    for(const h of G.horses) sprites.push({ horse: h, cy: h.y });
    if(G.tower) sprites.push({ tower: G.tower, cy: G.tower.y1 * TS + TS });
    sprites.sort((a, b) => (a.cy ?? a.y * TS) - (b.cy ?? b.y * TS));
    for(const s of sprites) {
        if(s.char) drawChar(s.char);
        else if(s.horse) drawHorse(s.horse);
        else if(s.tower) drawTower(s.tower);
        else if(s.door) drawDoor(s.door);
        else if(s.rubble) drawSprite(IMG.rubble, 0, 0, 16, 16, s.x * TS, s.y * TS, 32, 32);
        else if(s.reeds) drawReeds(s.x, s.y);
        else drawObj(s.obj || s);
    }
    // darkness, with the hero's own eyes cutting a small hole (sight only — it doesn't light you up)
    // The dark is soft by nature, so its layer is a quarter of the screen's resolution, stretched
    // smoothed over it: a full-size layer cost the phone two full-screen fills a frame for nothing.
    const DS = 4, dk = G.darkLayer || (G.darkLayer = document.createElement('canvas'));
    const dw = Math.ceil(canvas.width / DS), dh = Math.ceil(canvas.height / DS), zd = Z / DS;
    if(dk.width !== dw || dk.height !== dh) { dk.width = dw; dk.height = dh; }
    const d2 = dk.getContext('2d');
    d2.setTransform(1, 0, 0, 1, 0, 0); d2.globalCompositeOperation = 'source-over'; d2.clearRect(0, 0, dw, dh);
    d2.imageSmoothingEnabled = true;
    d2.setTransform(zd, 0, 0, zd, -camX * zd, -camY * zd);
    d2.drawImage(G.darkCanvas, 0, 0, G.w * TS, G.h * TS);
    d2.globalCompositeOperation = 'destination-out';
    d2.drawImage(glowSprite('hole'), p.x - 96, p.y - 10 - 96, 192, 192);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(dk, 0, 0, dw * DS, dh * DS);
    ctx.imageSmoothingEnabled = false;
    // fog: slow pale bands drifting over everything (it shortens their sight, not yours)
    if(L.fog) {
        const W = canvas.width, Hh = canvas.height, band = fogBand();
        ctx.globalAlpha = (R.time === 'day' ? .16 : .1) * (1.4 - L.fog); ctx.imageSmoothingEnabled = true;
        for(let i = 0; i < 5; i++) {
            const yy = ((i * .23 + G.t * .012 * (1 + i % 2)) % 1.4 - .3) * Hh;
            ctx.drawImage(band, 0, yy, W, Hh * .26);
        }
        ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
    }
    cam();
    // warm glow on the lights
    if(!Game.lite()) {
        ctx.globalCompositeOperation = 'lighter';
        for(const l of G.lights) {
            if(l.kind === 'window' || l.kind === 'mouth' || l.off) continue;
            const fl = .85 + Math.sin(G.t * 9 + l.px) * .08 + Math.sin(G.t * 23 + l.py) * .05;
            const r = (l.kind === 'fire' ? 90 : l.kind === 'torch' ? 60 : 40) * fl;
            ctx.drawImage(glowSprite(l.kind === 'candle' ? 'candle' : 'flame'), l.px - r, l.py - r, r * 2, r * 2);
        }
        ctx.globalCompositeOperation = 'source-over';
    }
    // effects over the dark: noise rings, dust, bats, marks, floating text
    for(const f of G.fx) {
        if(f.kind === 'ring') { ctx.strokeStyle = `rgba(245,215,110,${.35 * (1 - f.t / .7)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * Math.min(1, f.t / .5), 0, 7); ctx.stroke(); }
        if(f.kind === 'dust') { ctx.fillStyle = `rgba(180,170,150,${.5 * (1 - f.t / 1.2)})`; for(let i = 0; i < 12; i++) { const a = i * .52, r = 8 + f.t * 40; ctx.fillRect(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * .6, 4, 4); } }
        if(f.kind === 'meat' && f.t < .42) { const u = f.t / .42, x = f.x0 + (f.x - f.x0) * u, y = f.y0 + (f.y - f.y0) * u - Math.sin(u * Math.PI) * 28; drawMeat(x, y + 4); }
        if(f.kind === 'crash') { ctx.fillStyle = `rgba(190,170,140,${.6 * (1 - f.t / 1.2)})`; for(let i = 0; i < 16; i++) { const a = i * .4, r = 6 + f.t * 55; ctx.fillRect(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * .5, 5, 4); } }
        if(f.kind === 'stone' && f.t < .42) { const u = f.t / .42, x = f.x0 + (f.x - f.x0) * u, y = f.y0 + (f.y - f.y0) * u - Math.sin(u * Math.PI) * 28; ctx.fillStyle = '#d8d0c0'; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4); ctx.fillStyle = '#6a6258'; ctx.fillRect(Math.round(x), Math.round(y), 2, 2); }
        if(f.kind === 'smoke') { ctx.fillStyle = `rgba(160,160,160,${.45 * (1 - f.t / .7)})`; for(let i = 0; i < 4; i++) ctx.fillRect(f.x - 3 + Math.sin(i + f.t * 5) * 4, f.y - f.t * 30 - i * 5, 5, 5); }
        if(f.kind === 'bats') { ctx.fillStyle = '#0c0a0e'; for(let i = 0; i < 7; i++) { const a = i * .9 + f.t * 3, r = f.t * 70 + i * 6; const bx = f.x + Math.cos(a) * r, by = f.y - f.t * 50 + Math.sin(a * 2) * 10; ctx.fillRect(bx - 4, by, 8, 2); ctx.fillRect(bx - 1, by - 1, 2, 3); } }
    }
    drawMarkers();
    if(aim && G.pebbles > 0) drawAim();
    for(const g of G.chars) if(g.kind === 'guard') drawGuardMark(g);
    ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
    for(const c of G.chars) if(c.kind === 'prisoner' && c.tied && Math.hypot(c.x - p.x, c.y - p.y) < 5 * TS) { ctx.fillStyle = '#f5d76e'; ctx.fillText('?', c.x, c.y - 42); }
    ctx.font = 'bold 11px Inter, sans-serif';
    for(const x of G.texts) { ctx.globalAlpha = Math.min(1, x.life * 2); ctx.fillStyle = '#000'; ctx.fillText(x.t, x.x + 1, x.y + 1); ctx.fillStyle = x.col; ctx.fillText(x.t, x.x, x.y); }
    ctx.globalAlpha = 1;
    // the busy bar over the hero
    if(p.busy) { const f = 1 - p.busy.t / p.busy.total; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(p.x - 16, p.y - 48, 32, 5); ctx.fillStyle = '#f5d76e'; ctx.fillRect(p.x - 15, p.y - 47, 30 * f, 3); }
    // the way out is signposted, steady: a faint edge on the exit ground and one sign per exit
    ctx.strokeStyle = 'rgba(245,215,110,.22)'; ctx.lineWidth = 1;
    for(let y = 0; y < G.h; y++) for(let x = 0; x < G.w; x++) if(isExit(x, y) && !isExit(x, y - 1)) { ctx.beginPath(); ctx.moveTo(x * TS, y * TS + .5); ctx.lineTo(x * TS + TS, y * TS + .5); ctx.stroke(); }
    const exitTxt = T('ÇIKIŞ');
    ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
    const ew = ctx.measureText(exitTxt).width + 12;
    for(const sgn of G.exitSigns) {
        ctx.fillStyle = 'rgba(10,9,8,.8)'; ctx.fillRect(Math.round(sgn.x - ew / 2), Math.round(sgn.y - 9), Math.round(ew), 13);
        ctx.fillStyle = '#f5d76e'; ctx.fillText(exitTxt, Math.round(sgn.x), Math.round(sgn.y + 1));
    }
    drawMini();
}
// Everything you can use carries a green outline within a few steps and in sight; the one the
// button would use right now pulses and says what it does. Used things lose it.
function usable(o) {
    if(o.gone) return false;
    const cart = o.cart && !o.rolling && !o.done, load = cart ? o.load.iron + o.load.coal : 0;
    if(G.carry) return cart && load < CART_CAP;              // a sack on your back: only the cart takes it
    return (o.chest && !o.open) || (o.search && !o.searched) || (o.lever && !o.pulled) || o.purse || o.trapdoor || o.hide || (o.pen && !o.used) || (o.cage && !o.open) || (o.torch && o.lit !== false)
        || !!o.ore || (cart && load > 0) || (o.bell && !o.rung) || ((o.larder || o.herbs) && !o.taken) || (o.keg && G.draught > 0 && !o.drugged)
        || (o.cleat && !o.cut && !!loadOf(o)) || (o.bearCage && !o.open);
}
// the pebble's flight, where it lands, how far it carries, and a "?" over each bandit who'll hear it;
// greyed out while the finger is back over the button (letting go there calls the throw off)
function drawAim() {
    const p = G.player, t = aimTarget(), l = pebbleLanding(t.x, t.y), x0 = p.x, y0 = p.y - 20, off = aim.cancel, meat = G.meat > 0;
    ctx.fillStyle = off ? 'rgba(150,140,130,.45)' : 'rgba(232,224,204,.8)';
    for(let i = 1; i < 12; i++) { const u = i / 12, x = x0 + (l.x - x0) * u, y = y0 + (l.y - y0) * u - Math.sin(u * Math.PI) * 28; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }
    if(off) return;
    ctx.strokeStyle = 'rgba(245,215,110,.28)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(l.x, l.y, meat ? 9 * TS : PEBBLE_NOISE, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#f5d76e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(l.x, l.y, 6, 0, 7); ctx.stroke();
    ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f5d76e';
    for(const g of G.chars) {
        if(g.kind !== 'guard' || ['ko', 'down', 'alert', 'eat'].includes(g.state) || (meat && !g.dog)) continue;
        if(Math.hypot(g.x - l.x, g.y - l.y) <= (meat ? 9 * TS : g.state === 'sleep' ? PEBBLE_NOISE * .45 : PEBBLE_NOISE)) ctx.fillText(meat ? '♨' : '?', g.x, g.y - (g.state === 'sleep' || g.dog ? 22 : 46));
    }
}
function drawMarkers() {
    const p = G.player, at = G.ctx && G.ctx.at;
    const pulse = .78 + Math.sin(G.t * 5) * .22;
    for(const o of G.objs) {
        if(!o || !usable(o)) continue;
        const d = Math.hypot(o.cx - p.x, o.cy - p.y);
        if(d > 6 * TS || (o !== at && !los(p.x, p.y - 8, o.cx, o.cy, true))) continue;
        const g = objGeom(o), a = o === at ? pulse : clamp(1.2 - d / (6 * TS), .35, .75);
        if(g && g[0] && g[0].width) drawOutline(...g, a);
        else {   // code-drawn things (hiding places, the pen gate, the cage door): a green frame round the tile
            const tall = o.hide && hideKind() === 'wardrobe' ? 15 : 0;
            ctx.strokeStyle = `rgba(110,255,140,${a})`; ctx.lineWidth = 2; ctx.strokeRect(Math.round(o.cx) - 15, Math.round(o.cy) - 15 - tall, TS - 2, TS - 2 + tall);
        }
    }
    // a bandit you can take down right now, a prisoner you can free: outlined the same way
    if(at && at.kind) {
        const fr = at.state === 'sleep' || at.dog || at.kind === 'beast' || at.state === 'ko' || at.state === 'down' ? null : Swordsman.art(at.look, at.anim === 'attack' ? 'Idle' : at.anim, at.dir, at.animT);
        if(fr) drawOutline(fr, 0, 0, fr.width, fr.height, at.x - fr._ax * fr.width, at.y - fr._ay * fr.height * (at.crouch ? .84 : 1), fr.width, Math.round(fr.height * (at.crouch ? .84 : 1)), pulse);
        else { ctx.strokeStyle = `rgba(110,255,140,${pulse})`; ctx.lineWidth = 1.5; ctx.strokeRect(Math.round(at.x - 18), Math.round(at.y - 18), 36, 22); }
    }
    if(at && !p.busy) {
        const x = at.cx ?? at.x, gm = at.kind ? null : objGeom(at), top = at.kind ? at.y - 50 : (gm ? gm[6] - 8 : at.cy - 30);
        const label = (Game.isTouch() || G.ctx.blocked ? '' : 'E · ') + G.ctx.label;
        ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
        const w = ctx.measureText(label).width + 12;
        ctx.fillStyle = 'rgba(10,9,8,.88)'; ctx.fillRect(Math.round(x - w / 2), Math.round(top - 11), Math.round(w), 14);
        ctx.fillStyle = G.ctx.blocked ? '#ff8a70' : '#8dffa8'; ctx.fillText(label, Math.round(x), Math.round(top));
    }
}
function drawCone(g) {
    const s = guardSight(g), rays = Game.lite() ? 14 : 22, pts = [];
    const range = BASE_RANGE * s.range;
    for(let i = 0; i <= rays; i++) {
        const a = g.a - s.fov + (2 * s.fov * i) / rays;
        let r = 0;
        for(; r < range; r += 8) {
            const x = g.x + Math.cos(a) * r, y = g.y - 8 + Math.sin(a) * r;
            if(opaque(Math.floor(x / TS), Math.floor(y / TS))) break;
            // the cone fades where it's dark: what it reaches depends on the light out there
            if(r > range * (.3 + .7 * Math.min(1, lightAt(x, y)))) break;
        }
        pts.push([g.x + Math.cos(a) * r, g.y - 8 + Math.sin(a) * r]);
    }
    const col = g.state === 'alert' ? '255,80,70' : g.state === 'suspicious' || g.state === 'search' ? '255,200,80' : '235,230,210';
    ctx.fillStyle = `rgba(${col},${g.state === 'calm' || g.state === 'return' ? .11 : .18})`;
    ctx.beginPath(); ctx.moveTo(g.x, g.y - 8); for(const [x, y] of pts) ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
}
function drawLying(c, bedroll) {
    const fr = Swordsman.art(c.look, 'Idle', 'down', 0);
    if(!fr) return;
    const w = fr.width, h = fr.height, cx = Math.round(c.x), cy = Math.round(c.y - 6);
    if(bedroll) { ctx.fillStyle = '#5a4630'; ctx.fillRect(cx - h / 2 - 5, cy - w / 2 - 1, h + 10, w + 3); ctx.fillStyle = '#6e5a3c'; ctx.fillRect(cx - h / 2 - 4, cy - w / 2, h + 8, 2); }
    ctx.globalAlpha = .4; drawSprite(IMG.shadow, 0, 0, IMG.shadow.width, IMG.shadow.height, cx - 16, cy + w / 2 - 4, 32, 8); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-Math.PI / 2);        // head to the left
    ctx.drawImage(fr, -Math.round(w / 2), -Math.round(h / 2), w, h);
    ctx.restore();
    if(bedroll) { ctx.fillStyle = '#7a3a2e'; ctx.fillRect(cx - 2, cy - w / 2, Math.round(h / 2) + 4, w); ctx.fillStyle = '#8f4a3a'; ctx.fillRect(cx - 2, cy - w / 2, Math.round(h / 2) + 4, 2); }   // the blanket
}
function drawChar(c) {
    if(c.kind === 'player' && c.hidden) return;
    if(c.elev) { ctx.save(); ctx.translate(0, -c.elev); drawCharInner(c); ctx.restore(); if(G.tower) drawTowerRail(G.tower); return; }
    drawCharInner(c);
    if(c.kind === 'player' && G.carry) drawSack(c.x + (c.dir === 'left' ? 5 : c.dir === 'right' ? -5 : 0), c.y - (c.crouch ? 30 : 36), G.carry, .75);
}
function drawMeat(x, y) {
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = '#9a4a3a'; ctx.fillRect(x - 5, y - 4, 9, 6); ctx.fillStyle = '#b8604a'; ctx.fillRect(x - 5, y - 4, 9, 2);
    ctx.fillStyle = '#e8d8c0'; ctx.fillRect(x + 3, y - 3, 4, 2);
}
// a clump of reeds or brush, swaying a little; drawn in depth order so it hides the legs of whoever's in it
function drawReeds(tx, ty) {
    const X = tx * TS, Y = ty * TS, sw = Math.sin(G.t * 1.3 + tx * .7 + ty) * 1.5;
    for(let i = 0; i < 7; i++) {
        const bx = X + 2 + i * 4.3 + ((tx * 7 + i * 3) % 3), hgt = 18 + ((tx * 3 + ty * 5 + i * 7) % 9);
        ctx.fillStyle = i % 2 ? '#5e7a3a' : '#4a6a2e'; ctx.fillRect(Math.round(bx), Y + 30 - hgt, 2, hgt);
        ctx.fillStyle = '#7a9a4a'; ctx.fillRect(Math.round(bx + sw), Y + 30 - hgt - 3, 2, 4);
        if(i % 3 === 0) { ctx.fillStyle = '#6a4a2a'; ctx.fillRect(Math.round(bx + sw) - 1, Y + 30 - hgt - 6, 3, 5); }   // a cattail head
    }
}
// someone in deep water: head and shoulders over the surface, a ring of ripples round them
function drawSwimmer(c) {
    const fr = Swordsman.art(c.look, 'Idle', c.dir, c.animT);
    if(!fr) return;
    const w = fr.width, h = fr.height, x = Math.round(c.x - fr._ax * w), y = Math.round(c.y - fr._ay * h) + 12, keep = Math.round(h * .5);
    ctx.drawImage(fr, 0, 0, w, keep, x, y, w, keep);
    const s = (G.t * 2 + c.x * .05) % 1;
    ctx.strokeStyle = `rgba(150,200,220,${.5 - s * .4})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(Math.round(c.x), y + keep, 10 + s * 8, 3 + s * 2, 0, 0, 7); ctx.stroke();
}
// an ore sack, tied at the neck with its ore showing: rust-red iron ore or black coal
function drawSack(X, Y, kind, k = 1) {
    const r = (x, y, w, h) => ctx.fillRect(Math.round(X + x * k), Math.round(Y + y * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)));
    const iron = kind === 'iron';
    if(k === 1) { ctx.fillStyle = 'rgba(0,0,0,.3)'; r(-12, 10, 24, 4); }
    ctx.fillStyle = '#8a7350'; r(-11, -8, 22, 19);
    ctx.fillStyle = '#a58b62'; r(-11, -8, 22, 3);
    ctx.fillStyle = '#6b5638'; r(-11, 8, 22, 3); r(8, -8, 3, 19);
    ctx.fillStyle = '#5a4630'; r(-3, -12, 6, 5);
    ctx.fillStyle = iron ? '#8a4a32' : '#1e1d22'; r(-8, -11, 4, 4); r(3, -10, 5, 3);
    ctx.fillStyle = iron ? '#b0705a' : '#4a4a52'; r(-7, -11, 2, 1); r(4, -10, 2, 1);
}
function drawCart(c) {
    const X = Math.round(c.cx), Y = Math.round(c.cy), n = c.load.iron + c.load.coal;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X - 14, Y + 10, 28, 4);
    ctx.fillStyle = '#5c4128'; ctx.fillRect(X - 13, Y - 10, 26, 18);
    ctx.fillStyle = '#7a5532'; ctx.fillRect(X - 13, Y - 10, 26, 3);
    ctx.fillStyle = '#7d8893'; ctx.fillRect(X - 13, Y - 4, 26, 2); ctx.fillRect(X - 13, Y + 4, 26, 2);
    for(let i = 0; i < n; i++) drawSack(X - 8 + i * 8, Y - 13, i < c.load.iron ? 'iron' : 'coal', .5);   // heaped over the rim
    const spin = c.rolling && (G.t * 12 | 0) % 2;
    ctx.fillStyle = '#2a2016'; ctx.fillRect(X - 11, Y + 7, 6, 6); ctx.fillRect(X + 5, Y + 7, 6, 6);
    ctx.fillStyle = '#6b5638'; ctx.fillRect(X - 9 + spin, Y + 9, 2, 2); ctx.fillRect(X + 7 + spin, Y + 9, 2, 2);
}
// a dog or the bear, side on, in pixel blocks: body, head and snout toward where it faces, four
// legs that scissor when it moves; lying flat (asleep, out cold, dead) with its legs out
const BEASTS = {
    dog:  { len: 22, h: 9, leg: 7, head: 8, coat: '#7a5a3a', hi: '#9a7a52', lo: '#4e3a26', ear: '#3e2c1c' },
    bear: { len: 36, h: 16, leg: 9, head: 13, coat: '#4a3020', hi: '#6a4630', lo: '#2e1e14', ear: '#2a1a10' }
};
// a fog bank's soft edge, baked once: pale in the middle, nothing at the top and bottom
let fogCanvas = null;
function fogBand() {
    if(fogCanvas) return fogCanvas;
    fogCanvas = document.createElement('canvas'); fogCanvas.width = 1; fogCanvas.height = 64;
    const x = fogCanvas.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(200,210,205,0)'); gr.addColorStop(.5, 'rgba(200,210,205,1)'); gr.addColorStop(1, 'rgba(200,210,205,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 1, 64);
    return fogCanvas;
}
function drawBeast(c, k) {
    const B = BEASTS[k], flip = Math.cos(c.a) < 0 ? -1 : 1, X = Math.round(c.x), Y = Math.round(c.y);
    const r = (x, y, w, h) => ctx.fillRect(flip > 0 ? X + x : X - x - w, Y + y, w, h);
    ctx.globalAlpha = .4; drawSprite(IMG.shadow, 0, 0, IMG.shadow.width, IMG.shadow.height, X - B.len / 2 - 4, Y - 5, B.len + 8, 10); ctx.globalAlpha = 1;
    const flat = ['sleep', 'ko', 'down', 'grabbed'].includes(c.state);
    if(flat) {
        ctx.fillStyle = B.lo; r(-B.len / 2, -4, B.len, 2);
        ctx.fillStyle = B.coat; r(-B.len / 2, -B.h / 2 - 3, B.len, B.h / 2 + 1); r(B.len / 2 - 2, -B.h / 2 - 2, B.head, B.head * .6);
        ctx.fillStyle = B.hi; r(-B.len / 2, -B.h / 2 - 3, B.len, 2);
        ctx.fillStyle = B.ear; r(B.len / 2, -B.h / 2 - 4, 3, 2);
        return;
    }
    const moving = c.anim === 'Run' || c.anim === 'Walk' || c.anim === 'attack';
    const ph = moving ? Math.sin(G.t * (c.anim === 'Run' ? 18 : 10) + c.x * .1) * 2.5 : 0;
    const by = -B.leg - B.h, lunge = c.anim === 'attack' ? 4 : 0;
    ctx.fillStyle = B.lo;                                                         // legs: the far pair darker
    r(-B.len / 2 + 2 - ph, -B.leg, 3, B.leg); r(B.len / 2 - 6 + ph, -B.leg, 3, B.leg);
    ctx.fillStyle = B.coat; r(-B.len / 2 + 4 + ph, -B.leg, 3, B.leg); r(B.len / 2 - 4 - ph, -B.leg, 3, B.leg);
    r(-B.len / 2, by, B.len, B.h);                                                // body
    ctx.fillStyle = B.hi; r(-B.len / 2, by, B.len, 2);
    ctx.fillStyle = B.coat; r(B.len / 2 - 3 + lunge, by - B.head * .45, B.head, B.head);   // head
    ctx.fillStyle = B.lo; r(B.len / 2 - 3 + B.head + lunge, by - B.head * .45 + B.head * .45, B.head * .45, B.head * .45);   // snout
    ctx.fillStyle = B.ear; r(B.len / 2 - 2 + lunge, by - B.head * .45 - 3, 3, 3);
    ctx.fillStyle = '#100c08'; r(B.len / 2 + B.head - 5 + lunge, by - B.head * .2, 2, 2);  // the eye
    if(k === 'dog') { ctx.fillStyle = B.coat; r(-B.len / 2 - 5, by - 3 + (moving ? Math.round(ph) : 0), 6, 2); }  // the tail
    if(c.hurtT > 0) { ctx.globalAlpha = .45; ctx.fillStyle = '#fff'; r(-B.len / 2, by, B.len, B.h); ctx.globalAlpha = 1; }
    if(k === 'bear' && c.hp < c.maxHp) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(X - 14, Y + by - 18, 28, 3); ctx.fillStyle = '#d0905a'; ctx.fillRect(X - 14, Y + by - 18, Math.round(28 * Math.max(0, c.hp) / c.maxHp), 3); }
}
function drawCharInner(c) {
    if(c.dog) return drawBeast(c, 'dog');
    if(c.kind === 'beast') return drawBeast(c, 'bear');
    if(c.swim) return drawSwimmer(c);
    if(c.state === 'sleep' || c.state === 'ko' || (c.state === 'grabbed' && c.wasAsleep)) {
        drawLying(c, c.state === 'sleep' || c.wasAsleep);
        const hx = c.x - 14;
        if(c.state === 'sleep') { const b = (G.t * 1.2 + c.x) % 1.5; ctx.fillStyle = 'rgba(210,225,255,.85)'; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('z', hx + b * 6, c.y - 20 - b * 10); }
        if(c.state === 'ko') { ctx.fillStyle = '#cfe8ff'; ctx.font = 'bold 9px Inter, sans-serif'; ctx.textAlign = 'center'; for(let i = 0; i < 3; i++) ctx.fillText('✶', hx + Math.cos(G.t * 4 + i * 2.1) * 7, c.y - 18 + Math.sin(G.t * 4 + i * 2.1) * 3); }
        return;
    }
    let anim = c.anim, t = c.animT, dir = c.dir;
    if(c.kind === 'prisoner' && c.tied) { anim = 'Idle'; dir = 'down'; }
    if(c.state === 'down') { anim = 'Death'; t = Math.min(c.animT, 900); }
    if(anim === 'attack') t = c.kind === 'guard' && c.windup > 0 ? (1 - c.windup / .45) * 280 : c.animT * 1.3;
    const fr = Swordsman.art(c.look, anim, dir, anim === 'Walk' && c.crouch ? t * .6 : t);
    if(!fr) return;
    const w = fr.width, h = fr.height, sq = c.crouch && c.state !== 'down' ? .84 : 1;
    ctx.globalAlpha = .45; drawSprite(IMG.shadow, 0, 0, IMG.shadow.width, IMG.shadow.height, c.x - 13, c.y - 5, 26, 10); ctx.globalAlpha = 1;
    const x = c.x - fr._ax * w, y = c.y - fr._ay * h * sq;
    ctx.drawImage(fr, Math.round(x), Math.round(y), w, Math.round(h * sq));
    // a hit flashes the figure white for a moment (drawn over it, not through ctx.filter, which Safari lacks)
    if(c.hurtT > 0) { ctx.globalAlpha = .5; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(fr, Math.round(x), Math.round(y), w, Math.round(h * sq)); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    if(c.kind === 'prisoner' && c.tied) { ctx.fillStyle = '#8a6a3a'; ctx.fillRect(Math.round(c.x - 7), Math.round(c.y - 18), 14, 2); ctx.fillRect(Math.round(c.x - 6), Math.round(c.y - 13), 12, 2); }
    if((c.kind === 'squad' || c.kind === 'player') && c.hp < c.maxHp && c.state !== 'down') {
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(Math.round(c.x - 12), Math.round(c.y - 44), 24, 3);
        ctx.fillStyle = c.kind === 'player' ? '#e0605a' : '#6cc98a'; ctx.fillRect(Math.round(c.x - 12), Math.round(c.y - 44), Math.round(24 * Math.max(0, c.hp) / c.maxHp), 3);
    }
}
function drawGuardMark(g) {
    // the key on a belt glints, so you know whose to lift (on a body too)
    if(g.key && (G.revealAll || Math.hypot(g.x - G.player.x, g.y - G.player.y) < 6 * TS)) { const k = (G.t * 3 | 0) % 4 === 0; ctx.fillStyle = k ? '#fff6c8' : '#f5d76e'; ctx.fillRect(Math.round(g.x) + 6, Math.round(g.y) - 22, 3, 3); ctx.fillRect(Math.round(g.x) + 8, Math.round(g.y) - 20, 4, 1); }
    if(g.state === 'down' || g.state === 'ko' || g.state === 'sleep') return;
    const x = Math.round(g.x), y = Math.round(g.y - (g.dog ? 30 : 44) - (g.elev || 0));
    if(g.state === 'eat') { ctx.fillStyle = '#ffb38a'; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('♨', x, y); return; }
    if(g.state === 'alert') { ctx.fillStyle = '#ff5a4a'; ctx.font = 'bold 14px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', x, y); }
    else if(g.sus > .02) {
        ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x - 9, y - 10, 18, 4);
        ctx.fillStyle = g.sus > .6 ? '#ff9a4a' : '#f5d76e'; ctx.fillRect(x - 8, y - 9, Math.round(16 * g.sus), 2);
        ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', x, y + 2);
    }
    if(g.windup > 0) { ctx.strokeStyle = 'rgba(255,90,70,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.x, g.y - 10, 22, g.a - .9, g.a + .9); ctx.stroke(); }
}
function drawHorse(h) {
    const gt = Horse.GAITS[h.gait], n = gt ? gt.n : 1, ms = gt ? gt.ms : 200;
    const fr = Horse.bake(h.coat, h.gait, h.gait === 'stand' ? 0 : Math.floor(G.t * 1000 / ms) % n, null);
    if(!fr) return;
    ctx.globalAlpha = .4; drawSprite(IMG.shadow, 0, 0, IMG.shadow.width, IMG.shadow.height, h.x - 20, h.y - 5, 40, 10); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(Math.round(h.x), Math.round(h.y - Horse.GROUND)); if(h.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(fr, -Math.round(fr.width / 2), 0); ctx.restore();
}
// the watchtower: two legs, a ladder, a plank platform the lookout stands on
function drawTower(t) {
    const X = t.x0 * TS, Y = t.y0 * TS, W = 2 * TS, top = Y - 26;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X + 4, Y + 2 * TS - 6, W - 8, 8);
    ctx.fillStyle = '#4a321e'; for(const lx of [X + 4, X + W - 10]) ctx.fillRect(lx, top + 20, 6, 2 * TS + 6);
    ctx.fillStyle = '#6e4e30'; for(let y = top + 30; y < Y + 2 * TS; y += 10) ctx.fillRect(X + 26, y, 12, 2);
    ctx.fillStyle = '#5a3f26'; ctx.fillRect(X + 26, top + 24, 2, 2 * TS + 2); ctx.fillRect(X + 36, top + 24, 2, 2 * TS + 2);
    ctx.fillStyle = '#7a5836'; ctx.fillRect(X - 2, top + 14, W + 4, 12);
    ctx.fillStyle = '#946a40'; for(let i = 0; i < W + 4; i += 7) ctx.fillRect(X - 2 + i, top + 14, 5, 12);
    ctx.fillStyle = '#3e2a18'; ctx.fillRect(X - 2, top + 24, W + 4, 2);
}
// the railing goes in front of the lookout: drawn after him
function drawTowerRail(t) {
    const X = t.x0 * TS, Y = t.y0 * TS, W = 2 * TS, top = Y - 26;
    ctx.fillStyle = '#5a3f26'; ctx.fillRect(X - 2, top + 8, W + 4, 3);
    for(let i = 0; i <= W + 2; i += 10) ctx.fillRect(X - 2 + i, top + 8, 3, 8);
}
function drawDoor(d) {
    // a plank door filling the doorway when shut; open, a dark gap with the leaf swung back
    const X = d.x * TS, Y = d.y * TS, cave = PAL[L.theme].wall === 'rock' || PAL[L.theme].wall === 'blocks';
    ctx.fillStyle = cave ? '#241f1b' : '#3b2a1c'; ctx.fillRect(X, Y + 4, 3, 28); ctx.fillRect(X + TS - 3, Y + 4, 3, 28);
    if(!d.open) {
        ctx.fillStyle = '#7a5232'; ctx.fillRect(X + 3, Y + 6, TS - 6, 26);
        ctx.fillStyle = '#5e3e25'; for(let i = 0; i < 4; i++) ctx.fillRect(X + 3 + i * 6.5, Y + 6, 1, 26);
        ctx.fillStyle = '#3e2816'; ctx.fillRect(X + 3, Y + 12, TS - 6, 2); ctx.fillRect(X + 3, Y + 25, TS - 6, 2);
        ctx.fillStyle = '#c9b07a'; ctx.fillRect(X + TS - 9, Y + 18, 2, 3);
    } else {
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(X + 3, Y + 6, TS - 6, 26);
        ctx.fillStyle = '#7a5232'; ctx.fillRect(X + 3, Y + 6, 5, 26); ctx.fillStyle = '#5e3e25'; ctx.fillRect(X + 7, Y + 6, 1, 26);
    }
    if(d.locked) { ctx.fillStyle = '#b3413a'; ctx.fillRect(X + 4, Y + 17, TS - 8, 3); ctx.fillStyle = '#ffd0c8'; ctx.fillRect(X + 14, Y + 15, 4, 7); }
}
// where and how a usable object is drawn: [image, sx, sy, sw, sh, x, y, w, h] at 2x
function objGeom(o) {
    const x = o.cx, y = o.cy;
    if(o.chest) return [o.trapped ? IMG.chest2 : IMG.chest, (o.open ? 3 : 0) * 16, 0, 16, 24, x - 16, y - 30, 32, 48];
    if(o.lever) return [IMG.lever, (o.pulled ? 3 : 0) * 16, 0, 16, 18, x - 16, y - 20, 32, 36];
    if(o.purse) return [IMG.purse, 0, 0, 11, 14, x - 11, y - 18, 22, 28];
    if(o.trapdoor) return [IMG.trapdoor, 0, 0, 17, 17, x - 17, y - 17, 34, 34];
    if(o.img) { const im = IMG[o.img]; if(!im || !im.width) return null; return [im, 0, 0, im.width, im.height, Math.round(x - im.width), Math.round(y + 14 - im.height * 2), im.width * 2, im.height * 2]; }
    return null;
}
// a hollow green outline around a sprite region, one source pixel wide, baked once per region
const OUTLINES = new Map();
function outlineOf(img, sx, sy, sw, sh) {
    const key = (img.src || img._oid || (img._oid = Math.random())) + ':' + sx + ':' + sy + ':' + sw + ':' + sh;
    let c = OUTLINES.get(key);
    if(c) return c;
    const src = document.createElement('canvas'); src.width = sw + 2; src.height = sh + 2;
    const sx2 = src.getContext('2d'); sx2.drawImage(img, sx, sy, sw, sh, 1, 1, sw, sh);
    const d = sx2.getImageData(0, 0, sw + 2, sh + 2).data, W = sw + 2, H = sh + 2;
    c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx2 = c.getContext('2d'), out = cx2.createImageData(W, H);
    const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 40;
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++) {
        if(on(x, y)) continue;
        if(on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) { const i = (y * W + x) * 4; out.data[i] = 110; out.data[i + 1] = 255; out.data[i + 2] = 140; out.data[i + 3] = 255; }
    }
    cx2.putImageData(out, 0, 0);
    if(OUTLINES.size > 400) OUTLINES.clear();
    OUTLINES.set(key, c);
    return c;
}
function drawOutline(img, sx, sy, sw, sh, x, y, w, h, alpha) {
    const o = outlineOf(img, sx, sy, sw, sh), k = w / sw;
    ctx.globalAlpha = alpha;
    ctx.drawImage(o, Math.round(x - k), Math.round(y - k), Math.round(w + 2 * k), Math.round(h + 2 * k));
    ctx.globalAlpha = 1;
}
function drawObj(o) {
    const x = o.cx, y = o.cy;
    if(o.ore) return drawSack(x, y, o.ore);
    if(o.cart) return drawCart(o);
    if(o.table) {
        const tl = s => s && s.table;
        const L2 = obj(o.x - 1, o.y), R2 = obj(o.x + 1, o.y), U2 = obj(o.x, o.y - 1), D2 = obj(o.x, o.y + 1);
        ctx.fillStyle = '#7a4f2e'; ctx.fillRect(o.x * TS, o.y * TS + 4, TS, TS - 4);
        ctx.fillStyle = '#946038';
        for(let i = 0; i < 4; i++) ctx.fillRect(o.x * TS, o.y * TS + 6 + i * 7, TS, 5);
        ctx.fillStyle = '#4a2f1b';
        if(!tl(L2)) ctx.fillRect(o.x * TS, o.y * TS + 4, 3, TS - 4);
        if(!tl(R2)) ctx.fillRect(o.x * TS + TS - 3, o.y * TS + 4, 3, TS - 4);
        if(!tl(U2)) ctx.fillRect(o.x * TS, o.y * TS + 4, TS, 3);
        if(!tl(D2)) { ctx.fillRect(o.x * TS, o.y * TS + TS - 3, TS, 3); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(o.x * TS, o.y * TS + TS, TS, 4); }
        // a candle where the level lights one, and dice on the dice table
        if(G.lights.some(l => Math.abs(l.px - x) < 20 && Math.abs(l.py - y) < 20 && l.kind === 'candle')) { ctx.fillStyle = '#efe2c0'; ctx.fillRect(x - 2, y - 8, 4, 8); ctx.fillStyle = '#ffcf6a'; ctx.fillRect(x - 1, y - 12 + (Math.sin(G.t * 12) > 0 ? 0 : 1), 2, 3); }
        if((o.x + o.y) % 2 === 0) { ctx.fillStyle = '#f0ece2'; ctx.fillRect(x + 6, y + 2, 4, 4); ctx.fillRect(x - 10, y + 8, 4, 4); }
        return;
    }
    if(o.hide) {
        const sh = o.shakeT > 0 ? Math.sin(G.t * 60) * 1.5 : 0, X = o.x * TS + sh, Y = o.y * TS;
        const kind = hideKind();
        if(kind === 'hay') {           // a haystack
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X + 2, Y + 26, 28, 5);
            ctx.fillStyle = '#b8923e'; ctx.beginPath(); ctx.ellipse(X + 16, Y + 18, 16, 13, 0, Math.PI, 0); ctx.lineTo(X + 32, Y + 28); ctx.lineTo(X, Y + 28); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#d4ac52'; for(let i = 0; i < 9; i++) ctx.fillRect(X + 4 + i * 3, Y + 8 + (i % 3) * 5, 1, 12);
            ctx.fillStyle = '#8a6a2a'; ctx.fillRect(X, Y + 26, 32, 2);
        } else if(kind === 'niche') {  // a dark niche in the rock
            ctx.fillStyle = '#1a1715'; ctx.beginPath(); ctx.ellipse(X + 16, Y + 18, 15, 14, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#0a0908'; ctx.beginPath(); ctx.ellipse(X + 16, Y + 20, 10, 10, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#3a342e'; ctx.fillRect(X + 3, Y + 8, 4, 3); ctx.fillRect(X + 24, Y + 6, 5, 3);
        } else if(kind === 'tomb') {   // a stone sarcophagus, its lid pushed askew
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X + 1, Y + 26, 30, 4);
            ctx.fillStyle = '#5e5a55'; ctx.fillRect(X + 2, Y + 8, 28, 19);
            ctx.fillStyle = '#77726b'; ctx.fillRect(X + 2, Y + 8, 28, 2);
            ctx.fillStyle = '#0c0b0a'; ctx.fillRect(X + 4, Y + 11, 10, 4);
            ctx.fillStyle = '#8a857c'; ctx.fillRect(X + 9, Y + 3, 22, 8); ctx.fillStyle = '#a39d93'; ctx.fillRect(X + 9, Y + 3, 22, 2);
            ctx.fillStyle = '#6a665e'; ctx.fillRect(X + 18, Y + 5, 2, 5); ctx.fillRect(X + 16, Y + 6, 6, 1);
        } else if(kind === 'barrel') { // a big cask on its side, the end knocked in
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X + 2, Y + 26, 28, 4);
            ctx.fillStyle = '#6a4428'; ctx.fillRect(X + 2, Y + 6, 28, 21);
            ctx.fillStyle = '#8a5a34'; for(let i = 0; i < 28; i += 5) ctx.fillRect(X + 2 + i, Y + 6, 3, 21);
            ctx.fillStyle = '#4a4a52'; ctx.fillRect(X + 7, Y + 6, 2, 21); ctx.fillRect(X + 23, Y + 6, 2, 21);
            ctx.fillStyle = '#0c0a08'; ctx.beginPath(); ctx.ellipse(X + 16, Y + 16, 6, 8, 0, 0, 7); ctx.fill();
        } else if(kind === 'log') {    // a hollow fallen trunk
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X, Y + 25, 32, 4);
            ctx.fillStyle = '#4a3420'; ctx.fillRect(X, Y + 10, 32, 16);
            ctx.fillStyle = '#5e4429'; for(let i = 0; i < 32; i += 3) ctx.fillRect(X + i, Y + 11 + (i % 2), 2, 13);
            ctx.fillStyle = '#7a5a36'; ctx.beginPath(); ctx.ellipse(X + 28, Y + 18, 5, 8, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#0c0a08'; ctx.beginPath(); ctx.ellipse(X + 28, Y + 18, 3, 6, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#3f7238'; ctx.fillRect(X + 6, Y + 9, 5, 2); ctx.fillRect(X + 15, Y + 8, 3, 2);
        } else {                        // a tall wardrobe
            ctx.fillStyle = '#3e2816'; ctx.fillRect(X + 3, Y - 14, 26, 42);
            ctx.fillStyle = '#6a4428'; ctx.fillRect(X + 5, Y - 12, 11, 38); ctx.fillRect(X + 17, Y - 12, 10, 38);
            ctx.fillStyle = '#c9b07a'; ctx.fillRect(X + 14, Y + 6, 2, 3); ctx.fillRect(X + 17, Y + 6, 2, 3);
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X + 3, Y + 28, 26, 3);
        }
        return;
    }
    if(o.bell) {                        // a bell under a little timber frame; it swings for a while after it's rung
        const X = Math.round(x), Y = Math.round(y), sw = o.swingT > 0 ? Math.sin(G.t * 9) * 3 * Math.min(1, o.swingT) : 0;
        ctx.fillStyle = '#4a321e'; ctx.fillRect(X - 14, Y - 30, 3, 44); ctx.fillRect(X + 11, Y - 30, 3, 44); ctx.fillRect(X - 15, Y - 32, 30, 4);
        ctx.fillStyle = '#8a6a2a'; ctx.beginPath(); ctx.moveTo(X - 7 + sw, Y - 26); ctx.lineTo(X + 7 + sw, Y - 26); ctx.lineTo(X + 10 + sw * 1.4, Y - 6); ctx.lineTo(X - 10 + sw * 1.4, Y - 6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c9a44a'; ctx.fillRect(X - 6 + sw, Y - 25, 2, 17); ctx.fillStyle = '#5a4418'; ctx.fillRect(X - 10 + sw * 1.4, Y - 7, 20, 2);
        ctx.fillStyle = '#c9b07a'; ctx.fillRect(X - 1 + sw * 1.6, Y - 6, 2, 16);   // the rope
        return;
    }
    if(o.larder || o.herbs) {           // a shelf: hams and a string of sausages, or bundles of drying herbs
        const X = o.x * TS, Y = o.y * TS;
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X + 2, Y + 27, 28, 4);
        ctx.fillStyle = '#4a321e'; ctx.fillRect(X + 2, Y - 6, 3, 34); ctx.fillRect(X + 27, Y - 6, 3, 34);
        ctx.fillStyle = '#6e4e30'; for(const sy of [-4, 10, 24]) ctx.fillRect(X + 2, Y + sy, 28, 3);
        if(!o.taken) {
            if(o.larder) { ctx.fillStyle = '#9a4a3a'; ctx.fillRect(X + 7, Y - 2, 8, 11); ctx.fillRect(X + 18, Y + 12, 8, 11); ctx.fillStyle = '#e8d8c0'; ctx.fillRect(X + 9, Y - 2, 4, 2); ctx.fillStyle = '#7a3a2a'; for(let i = 0; i < 4; i++) ctx.fillRect(X + 6 + i * 4, Y + 14, 3, 5); }
            else { ctx.fillStyle = '#5e8a3a'; for(let i = 0; i < 4; i++) ctx.fillRect(X + 6 + i * 5, Y - 1, 3, 10); ctx.fillStyle = '#9a7ab8'; for(let i = 0; i < 3; i++) ctx.fillRect(X + 8 + i * 6, Y + 13, 3, 8); ctx.fillStyle = '#c9b07a'; ctx.fillRect(X + 5, Y - 1, 22, 1); }
        }
        return;
    }
    if(o.cleat) {                       // a post with the rope made fast round it
        const X = Math.round(x), Y = Math.round(y);
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X - 7, Y + 10, 14, 4);
        ctx.fillStyle = '#4a321e'; ctx.fillRect(X - 4, Y - 18, 8, 30); ctx.fillStyle = '#6e4e30'; ctx.fillRect(X - 4, Y - 18, 2, 30);
        if(!o.cut) { ctx.fillStyle = '#c9b07a'; ctx.fillRect(X - 6, Y - 6, 12, 3); ctx.fillRect(X - 6, Y - 1, 12, 3); ctx.fillRect(X - 1, Y - 30, 2, 24); }
        else { ctx.fillStyle = '#c9b07a'; ctx.fillRect(X - 6, Y - 1, 12, 3); ctx.fillRect(X + 5, Y + 2, 2, 8); }
        return;
    }
    if(o.load) {                        // up: a net of crates over a dark shadow; down: the wreck of them
        const X = Math.round(x), Y = Math.round(y);
        if(o.down) { ctx.fillStyle = '#5c4128'; ctx.fillRect(X - 14, Y - 2, 12, 8); ctx.fillRect(X + 2, Y + 2, 13, 7); ctx.fillStyle = '#7a5532'; ctx.fillRect(X - 6, Y - 8, 10, 8); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(X - 13, Y + 5, 26, 3); return; }
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(X, Y + 6, 16, 6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#c9b07a'; ctx.fillRect(X - 1, Y - 120, 2, 70);
        ctx.fillStyle = '#5c4128'; ctx.fillRect(X - 13, Y - 52, 26, 20); ctx.fillStyle = '#7a5532'; ctx.fillRect(X - 13, Y - 52, 26, 3);
        ctx.strokeStyle = '#a08a5a'; ctx.lineWidth = 1; for(let i = -12; i <= 12; i += 6) { ctx.beginPath(); ctx.moveTo(X + i, Y - 52); ctx.lineTo(X, Y - 60); ctx.stroke(); }
        return;
    }
    if(o.bearCage) {                    // a heavy timber cage, the bear's eyes in the dark behind the bars
        const X = o.x * TS, Y = o.y * TS;
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X - 2, Y + 27, 36, 4);
        ctx.fillStyle = '#2a1c10'; ctx.fillRect(X - 2, Y - 10, 36, 38);
        if(!o.open) { ctx.fillStyle = '#4a3020'; ctx.beginPath(); ctx.ellipse(X + 16, Y + 14, 11, 9, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ffcf6a'; ctx.fillRect(X + 11, Y + 9, 2, 2); ctx.fillRect(X + 19, Y + 9, 2, 2); }
        ctx.fillStyle = '#6e4e30'; for(let i = 0; i < 36; i += 7) if(!o.open || i < 4 || i > 30) ctx.fillRect(X - 2 + i, Y - 10, 3, 38);
        ctx.fillStyle = '#4a321e'; ctx.fillRect(X - 2, Y - 10, 36, 4); ctx.fillRect(X - 2, Y + 24, 36, 4);
        return;
    }
    if(o.pen) { const X = o.x * TS, Y = o.y * TS; ctx.fillStyle = '#4a321e'; ctx.fillRect(X + 13, Y + 2, 6, 28); ctx.fillStyle = o.used ? '#5a4030' : '#8a6440'; ctx.fillRect(X + 2, Y + 8, 28, 3); ctx.fillRect(X + 2, Y + 18, 28, 3); ctx.fillStyle = '#c9b07a'; ctx.fillRect(X + 20, Y + 12, 3, 4); return; }
    if(o.cage) { const X = o.x * TS, Y = o.y * TS; if(!o.open) { ctx.fillStyle = '#3a3a40'; for(let i = 3; i < 32; i += 6) ctx.fillRect(X + i, Y, 3, 32); ctx.fillStyle = '#9a9aa6'; for(let i = 3; i < 32; i += 6) ctx.fillRect(X + i, Y, 1, 32); ctx.fillStyle = '#6a5a3a'; ctx.fillRect(X + 12, Y + 12, 8, 8); ctx.fillStyle = '#c9a44a'; ctx.fillRect(X + 14, Y + 14, 4, 4); } else { ctx.fillStyle = '#3a3a40'; ctx.fillRect(X, Y, 4, 32); } return; }
    if(o.img) {
        const im = IMG[o.img]; if(!im || !im.width) return;
        if(o.searched) ctx.globalAlpha = .6;
        ctx.drawImage(im, Math.round(x - im.width), Math.round(y + 14 - im.height * 2), im.width * 2, im.height * 2); ctx.globalAlpha = 1;
        if(o.ch === 'T' && o.lit !== false) { const fl = (G.t * 10 | 0) % 2; ctx.fillStyle = '#ffd36a'; ctx.fillRect(x - 2, y + 14 - 30 - 4 + fl, 4, 4); }
        return;
    }
    if(o.fire) { const f = (G.t * 10 | 0) % 8; drawSprite(IMG.fire, f * 16, 0, 16, 16, x - 16, y - 22, 32, 32); ctx.fillStyle = '#3a2a1c'; ctx.fillRect(x - 12, y + 8, 24, 4); return; }
    if(o.chest) { drawSprite(o.trapped ? IMG.chest2 : IMG.chest, (o.open ? 3 : 0) * 16, 0, 16, 24, x - 16, y - 30, 32, 48); if(o.trapped && o.known && !o.disarmed && !o.open) { ctx.fillStyle = '#e0605a'; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⚠', x, y - 30); } return; }
    if(o.lever) { drawSprite(IMG.lever, (o.pulled ? 3 : 0) * 16, 0, 16, 18, x - 16, y - 20, 32, 36); return; }
    if(o.purse) { drawSprite(IMG.purse, 0, 0, 11, 14, x - 11, y - 18, 22, 28); if((G.t * 2 | 0) % 3 === 0) { ctx.fillStyle = '#fff6c8'; ctx.fillRect(x + 4, y - 14, 2, 2); } return; }
}
function drawMini() {
    const m = el('lair-mini'), x = m.getContext('2d'), s = Math.min(m.width / G.w, m.height / G.h) | 0 || 1;
    const ox = (m.width - G.w * s) / 2 | 0, oy = (m.height - G.h * s) / 2 | 0;
    x.clearRect(0, 0, m.width, m.height);
    for(let y = 0; y < G.h; y++) for(let xx = 0; xx < G.w; xx++) {
        if(!G.revealAll && !G.seen[y * G.w + xx]) continue;
        const c = tile(xx, y);
        if(c === ' ') continue;
        x.fillStyle = c === '#' ? '#4a4036' : c === 'n' ? '#6a5c40' : c === 'f' || c === '|' || c === 'Y' || c === 'J' ? '#3a3026' : c === '~' ? '#2a5a70' : c === '%' ? '#1a3a50' : c === 'r' ? '#2e4424' : isOutside(xx, y) ? '#34452a' : c === 'X' && !G.opened.has(xx + ',' + y) ? '#6a5f52' : '#211d18';
        x.fillRect(ox + xx * s, oy + y * s, s, s);
    }
    for(const c of G.chars) {
        if(c.state === 'down' && c.kind !== 'guard') continue;
        const vis = c.kind !== 'guard' || G.revealAll || G.seen[(c.y / TS | 0) * G.w + (c.x / TS | 0)];
        if(!vis) continue;
        x.fillStyle = c.kind === 'player' ? '#f5d76e' : c.kind === 'squad' ? '#9fe0a0' : c.kind === 'prisoner' ? '#8fc8ff' : c.kind === 'beast' ? '#d0905a' : c.state === 'alert' ? '#ff5a4a' : c.state === 'ko' || c.state === 'down' ? '#6a5a50' : '#e0a080';
        x.fillRect(ox + (c.x / TS) * s - 1.5, oy + (c.y / TS) * s - 1.5, 3, 3);
    }
}

// ---------- HUD ----------
const setText = (id, t) => { const e = el(id); if(e.textContent !== t) e.textContent = t; };
const setHtml = (id, h) => { const e = el(id); if(e.innerHTML !== h) e.innerHTML = h; };
function updateHud() {
    const p = G.player;
    el('lair-hp').style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
    const inWater = tile(Math.floor(p.x / TS), Math.floor(p.y / TS)) === '~';
    const stance = p.crouch || p.hidden ? 'crouch' : p.running ? 'run' : 'walk';
    const ground = tile(Math.floor(p.x / TS), Math.floor(p.y / TS));
    setText('lair-stance', p.hidden ? T('Saklanıyor · görünmez') : p.swim ? T('Yüzüyor · zor görünür') : ground === 'r' && p.crouch ? T('Sazlıkta · zor görünür') : (p.crouch ? (G.carry ? T('Eğilmiş') : T('Eğilmiş · sessiz')) : p.running ? T('Koşuyor · gürültülü') : T('Ayakta'))
        + (G.carry ? ' · ' + T('çuval sırtında') : '') + (inWater ? ' · ' + T('suda') : ''));
    el('lair-stance').className = 'lchip st-' + stance;
    setText('lair-gold', String(G.gold));
    setText('lair-peb', String(G.pebbles));
    setText('lair-throw', G.meat > 0 ? T`Et (${G.meat})` : T`Taş (${G.pebbles})`);
    el('lair-meatchip').hidden = !G.meat; setText('lair-meat', String(G.meat));
    el('lair-herbchip').hidden = !G.draught; setText('lair-herb', String(G.draught));
    el('lair-keychip').hidden = !G.key;
    if(aim && aim.cancel) setText('lair-throw', T('İptal'));
    const pris = G.chars.filter(c => c.kind === 'prisoner').length;
    el('lair-prischip').hidden = !pris || (!G.freed && R.scout < INTEL.basic);
    setText('lair-pris', G.freed + '/' + pris);
    const hasPurse = G.objs.some(o => o && o.purse && !o.gone);
    el('lair-orechip').hidden = !L.mine;
    if(L.mine) { setText('lair-ore-iron', String(G.bank.iron)); setText('lair-ore-coal', String(G.bank.coal)); }
    const goals = L.mine ? [G.carry ? T('Çuvalı <b>çıkışa</b> bırak ya da <b>arabaya</b> yükle') : T('<b>Çuvalları</b> sırtla, çıkışa taşı')] : [];
    if(L.mine && (R.site.steel || 0) > 0) goals.push(G.steel ? T('<s>Pota çeliği</s> alındı') : T('Ustabaşının <b>sandığında</b> pota çeliği'));
    goals.push(hasPurse ? T('Reisin <b>kesesini</b> al') : T('<s>Kese</s> alındı'));
    if(pris) goals.push(T`<b>Tutsakları</b> kurtar (${G.freed}/${pris})`);
    goals.push(T('Sonra <b>çıkışa</b> dön'));
    setHtml('lair-goal', goals.join(' · ') + (G.msgT > 0 ? '<br><span class="lmsg">' + G.msg + '</span>' : ''));
    const ban = el('lair-banner');
    if(G.banner) { ban.hidden = false; ban.className = ''; setText('lair-banner', G.banner.text); }
    else if(G.alarm > 0) { ban.hidden = false; ban.className = ''; setText('lair-banner', T`Alarm · ${Math.ceil(G.alarm)} sn`); }
    else if(G.chars.some(g => g.kind === 'guard' && g.state === 'search')) { ban.hidden = false; ban.className = 'calm'; setText('lair-banner', T('Seni arıyorlar')); }
    else ban.hidden = true;
    const c = G.ctx;
    const pr = el('lair-prompt');
    pr.hidden = !p.busy || Game.isTouch();          // the action itself is written next to the thing, in the world
    if(p.busy) setText('lair-prompt', p.busy.label);
    const ab = el('lair-act');
    ab.classList.toggle('idle', !c || !!p.busy); ab.classList.toggle('bad', !!(c && c.blocked));
    setText('lair-act', p.busy ? '…' : c ? c.label : T('Etkileşim'));
    el('lair-crouch').classList.toggle('on', p.crouch);
}

// ---------- the screen ----------
// Built from JS so every word goes through T(); the ids are lair-* (the battle owns #tbtns & co)
function build() {
    if(built) return;
    built = true;
    const v = el('lair-view');
    v.innerHTML = `<canvas id="lair-canvas"></canvas>
        <div id="lair-hud">
            <div class="lchips">
                <span class="lchip"><span class="lhp"><i id="lair-hp"></i></span></span>
                <span class="lchip" id="lair-stance"></span>
                <span class="lchip">${T('Dinar')} <b id="lair-gold">0</b></span>
                <span class="lchip" id="lair-prischip" hidden>${T('Tutsak')} <b id="lair-pris">0</b></span>
                <span class="lchip">${T('Çakıl')} <b id="lair-peb">3</b></span>
                <span class="lchip" id="lair-meatchip" hidden>🍖 <b id="lair-meat">0</b></span>
                <span class="lchip" id="lair-herbchip" hidden>🌿 <b id="lair-herb">0</b></span>
                <span class="lchip" id="lair-keychip" hidden>🔑 ${T('Anahtar')}</span>
                <span class="lchip" id="lair-orechip" hidden title="${T('Çıkışa bırakılan çuvallar: demir · kömür')}">⛏️ <b id="lair-ore-iron">0</b> 🪨 <b id="lair-ore-coal">0</b></span>
            </div>
            <div id="lair-goal"></div>
        </div>
        <canvas id="lair-mini" width="150" height="96"></canvas>
        <button id="lair-pausebtn" translate="no" aria-label="${T('Duraklat')}" title="${T('Duraklat')}">II</button>
        <div id="lair-banner" hidden></div>
        <div id="lair-prompt" hidden></div>
        <div id="lair-keys"><kbd>WASD</kbd> ${T('yürü')} · <kbd>Shift</kbd> ${T('koş')} · <kbd>C</kbd> ${T('eğil')} · <kbd>E</kbd> ${T('etkileşim')} · <kbd>Q</kbd> ${T('taş at')} · <kbd>${T('Boşluk')}</kbd> ${T('saldır')} · <kbd>Esc</kbd> ${T('duraklat')}</div>
        <div id="lair-touch">
            <div id="lair-stickzone"></div>
            <div id="lair-stick" hidden><div id="lair-knob"></div></div>
            <div id="lair-tbtns">
                <button class="ltb ctx idle" id="lair-act">${T('Etkileşim')}</button>
                <button class="ltb" id="lair-crouch">${T('Eğil')}</button>
                <button class="ltb" id="lair-throw">${T('Taş')}</button>
                <button class="ltb big" id="lair-atk">${T('Saldır')}</button>
            </div>
        </div>
        <div id="lair-over" hidden></div>`;
    canvas = el('lair-canvas'); ctx = canvas.getContext('2d');
    bindInput();
}
function overlay(html) { const o = el('lair-over'); o.innerHTML = html ? `<div class="lpanel">${html}</div>` : ''; o.hidden = !html; }

function pauseMenu() {
    if(!G || G.done || G.player.state === 'down') return;
    paused = true;
    const ch = chaser();
    overlay(`<div class="leyebrow">${T('Duraklatıldı')}</div><h2>${T(L.name)}</h2>
        <div class="lrow">
            <button class="btn primary" onclick="Lair.resume()">${T('Devam et')}</button>
            <button class="btn" onclick="Lair.tutorial()">${T('❔ Nasıl oynanır?')}</button>
            <button class="btn" ${ch ? 'disabled' : ''} onclick="Lair.retreat()">${T('🚪 Geri çekil')}</button>
            <button class="btn" onclick="Debug.bug()">${T('🐞 Hata Bildir')}</button>
        </div>
        <p class="lnote">${ch ? T('Peşinde haydutlar varken geri çekilemezsin.') : T('Geri çekilirsen bulduklarını alıp inden çıkarsın; in yerinde kalır.')}</p>`);
}
function resume() { paused = false; overlay(''); last = 0; }

// the active "İndeki Soylu" quest whose noble is held in this lair, if any
function captiveQuest(lairId) {
    return (state.player.quests || []).find(q => q.id === 'lair_captive' && q.state !== 'awaiting' && q.data && q.data.lairId === lairId) || null;
}

// ---------- the scouting card ----------
function levelOf(s) { return LEVELS[s.layout] ? s.layout : LAYOUTS[hashStr(String(s.id)) % LAYOUTS.length]; }
function squadCap() { return Math.min(6, 1 + Math.floor(Game.profLvl('leadership') / 2)); }
function squadPool() { return state.player.party.filter(t => !t.wounded).sort((a, b) => (b.level || 1) - (a.level || 1)); }
// the ambush is rolled once a day per lair, so reopening the card doesn't reroll what a scout saw
function ambushToday(s) {
    if(!s.lairAmbush || s.lairAmbush.day !== state.time.day) s.lairAmbush = { day: state.time.day, on: Math.random() < AMBUSH_CHANCE };
    return s.lairAmbush.on;
}
function intelList(s) {
    const lv = LEVELS[levelOf(s)], sc = Game.profLvl('spotting'), night = Game.isNight(), tk = night ? 'night' : 'day';
    const guards = lv.guards.filter(g => !g.dog).length, dogs = lv.guards.length - guards, pris = lv.map.join('').split('P').length - 1;
    const sleepers = lv.guards.filter(g => g.type === 'sleep' || (night && g.night === 'sleep')).length;
    const li = [];
    if(sc >= INTEL.basic) {
        li.push(T`<b>${guards}</b> haydut nöbette` + (sleepers ? ', ' + (night ? T`gece olduğu için <b>${sleepers}</b> tanesi uyuyor olmalı` : T`<b>${sleepers}</b> tanesi uyuyor olmalı`) : ''));
        if(dogs) li.push(T`<b>${dogs}</b> bekçi köpeği: koku alırlar, karanlık onları durdurmaz`);
        li.push(T`Girişler: ${T(lv.intel.entrances)}`);
        li.push(pris ? T`<b>${pris}</b> tutsak tutuluyor` : T('Tutsak yok'));
    } else {
        li.push(T`Tahminen <b>${Math.max(1, guards - 2)}–${guards + 3}</b> haydut`);
        li.push(T`Görünen tek giriş: ${T(lv.intel.entrance1)}`);
        li.push({ unk: T('Tutsak var mı bilmiyorsun') });
    }
    const cq = captiveQuest(s.id);
    if(cq) li.unshift(T`📜 <b>${T(cq.data.name)}</b> burada tutuluyor`);
    if(lv.mine) {
        const ore = s.ore || {};
        li.splice(2, 1, sc >= INTEL.basic ? T`Ocakta <b>${ore.iron || 0}</b> demir, <b>${ore.coal || 0}</b> kömür çuvalı` : { unk: T('Ocakta kaç çuval kaldığını bilmiyorsun') });
        li.push(sc >= INTEL.sketch ? ((s.steel || 0) > 0 ? T`Ustabaşının sandığında <b>${s.steel}</b> pota çeliği` : T('Ustabaşının sandığında çelik kalmamış')) : { unk: T('Ustabaşının sandığında ne olduğunu bilmiyorsun') });
    }
    li.push(sc >= INTEL.sketch ? T('Kroki çıkarıldı: nöbetçilerin yerleri ve yolları belli.') + ' ' + T(lv.intel.traps) : { unk: T('Nöbetçilerin yerini bilmiyorsun') });
    if(sc >= INTEL.ambush) li.push(ambushToday(s) ? T`<b>Uyarı:</b> ${T(lv.ambush.where)} için pusu hazırlığı var gibi` : T('Pusu belirtisi yok'));
    li.push(sc >= INTEL.secret ? T(lv.intel.secret) : { unk: T('Gizli bir yol olup olmadığını bilmiyorsun') });
    li.push(sc >= INTEL.secret ? T(lv.intel.leader[tk]) : { unk: T('Reisin alışkanlıklarını bilmiyorsun') });
    return li;
}
function drawSketch(lv, sc) {
    const c = el('lair-sketch'); if(!c) return;
    const x = c.getContext('2d'), map = lv.map, h = map.length, w = map[0].length;
    const s = Math.floor(Math.min(c.width / w, c.height / h)), ox = (c.width - w * s) / 2 | 0, oy = (c.height - h * s) / 2 | 0;
    x.fillStyle = '#0a0908'; x.fillRect(0, 0, c.width, c.height);
    if(sc < INTEL.sketch) {
        x.fillStyle = '#6a5f52'; x.font = '600 12px Inter, sans-serif'; x.textAlign = 'center';
        x.fillText(T`Kroki yok — Gözcülük ${INTEL.sketch} ile çıkar`, c.width / 2, c.height / 2);
        return;
    }
    for(let y = 0; y < h; y++) for(let xx = 0; xx < w; xx++) {
        const ch = map[y][xx];
        if(ch === ' ') continue;
        x.fillStyle = ch === '#' ? '#4a4036' : ch === '~' ? '#2a5a70' : ch === '%' ? '#1a3a50' : ch === 'r' ? '#2e4424' : ch === 'd' ? '#b3413a' : 'OE@'.includes(ch) ? '#26331f' : ch === 'n' ? '#6a5c40' : ch === 'X' ? (sc >= INTEL.secret ? '#8a6a3a' : '#4a4036') : '#1c1814';
        x.fillRect(ox + xx * s, oy + y * s, s, s);
        const mark = { C: '#f5d76e', c: '#e0605a', P: '#8fc8ff', $: '#f5d76e', L: sc >= INTEL.secret ? '#c9a0ff' : null, S: '#e0605a', t: '#c8b090', o: '#b0705a', q: '#6a6a74', M: '#a07a4e', '=': '#3a3026',
                       G: '#e8c860', m: '#ff9a7a', i: '#9fe0a0', w: '#a07a4e', Z: '#c9b07a', y: '#d0905a' }[ch];
        if(mark) { x.fillStyle = mark; x.fillRect(ox + xx * s + s * .25, oy + y * s + s * .25, s * .5, s * .5); }
    }
    for(const g of lv.guards) {
        x.fillStyle = g.dog ? '#d0a070' : g.key ? '#f5d76e' : '#ff7a5a'; x.fillRect(ox + g.x * s + 1, oy + g.y * s + 1, s - 2, s - 2);
        if(g.route) { x.strokeStyle = 'rgba(255,122,90,.6)'; x.setLineDash([3, 3]); x.beginPath(); g.route.forEach(([a, b], i) => i ? x.lineTo(ox + a * s + s / 2, oy + b * s + s / 2) : x.moveTo(ox + a * s + s / 2, oy + b * s + s / 2)); x.stroke(); x.setLineDash([]); }
    }
}
function brief(id) {
    const s = Game.lairs().find(x => x.id === id);
    if(!s) return Game.closeModal();
    const lv = LEVELS[levelOf(s)], sc = Game.profLvl('spotting'), n = Math.min(squadCap(), squadPool().length);
    const li = intelList(s).map(t => typeof t === 'object' ? `<li class="unk">${t.unk}</li>` : `<li>${t}</li>`).join('');
    const army = state.player.party.filter(t => !t.wounded).length;
    Game.showModal(`<div class="lair-brief">
        <div class="lb-head"><div><div class="leyebrow">${T(lv.kind)} · ${Game.isNight() ? T('Gece') : T('Gündüz')}</div><h3>☠️ ${T(lv.name)}</h3></div>
            <button class="btn lb-help" onclick="Lair.help('${s.id}')" title="${T('Nasıl oynanır?')}" aria-label="${T('Nasıl oynanır?')}">?</button></div>
        <p class="lb-lead">${lv.mine ? T('Haydutlar madeni ele geçirmiş. Sızarsan çuvalları sırtında ya da arabayla çıkışa taşırsın; çıkışa bıraktığın her çuval senindir, sonra yakalansan bile.')
                                     : T('Önce keşif, sonra yolunu sen seç. Sızarsan in yerinde kalır; aldığını alıp çıkışa dönmen gerekir.')}</p>
        <div class="lb-intel"><div><b class="lb-t">${T`Keşif · Gözcülük ${sc}`}</b><ul>${li}</ul></div>
            <canvas id="lair-sketch" width="300" height="140"></canvas></div>
        <div class="lb-ways">
            <button class="lb-way" onclick="Lair.enter('${s.id}','solo')"><b>${T('🕵️ Tek başına sız')}</b><span>${T('Karanlıkta, sessizce. Yakalanırsan kısa bir dövüş ya da kaçış.')}</span></button>
            <button class="lb-way" ${n ? '' : 'disabled'} onclick="Lair.enter('${s.id}','squad')"><b>${n ? T`👥 ${n} askerinle sız` : T('👥 Askerlerinle sız')}</b><span>${n ? T('Seni sessizce takip ederler. Fark edildiğiniz an dövüşe girerler. Kaç kişi götürebileceğini İdare belirler.') : T('Yanına alacak sağlam askerin yok.')}</span></button>
            <button class="lb-way" ${army ? '' : 'disabled'} onclick="Lair.enter('${s.id}','army')"><b>${T('⚔️ Bütün orduyla bas')}</b><span>${T`Ön kapıdan, açıkça: bir meydan savaşı. Kabaca ${Math.round(s.strength)} kişi.`}</span><span class="lb-warn">${T('Dikkat: açık baskında haydutlar destek çağırır, sayıları artar.')}</span></button>
        </div>
        <div class="lb-foot"><button class="btn" onclick="Game.closeModal()">${T('🚪 Yoluna Devam Et')}</button></div>
    </div>`, '720px');
    drawSketch(lv, sc);
}
// how to play, as a list — for the card before going in (the in-lair tour rings the real buttons)
function help(id) {
    const touch = Game.isTouch();
    const site = id && Game.lairs().find(x => x.id === id);
    const f = site ? feats(LEVELS[levelOf(site)]) : new Set();
    const rows = TUTOR.filter(s => (touch ? s.d : s.m) && (!s.feat || f.has(s.feat))).map(s => `<li><b>${T(s.t)}</b> ${T(touch ? s.d : s.m)}</li>`).join('');
    Game.showModal(`<div class="lair-brief"><h3>${T('❔ Haydut ini: nasıl oynanır?')}</h3><ul class="lb-howto">${rows}</ul>
        <div class="lb-foot">${id ? `<button class="btn primary" onclick="Lair.brief('${id}')">${T('← Keşfe dön')}</button>` : `<button class="btn primary" onclick="Game.closeModal()">${T('Tamam')}</button>`}</div></div>`, '720px');
}

// The tour of the lair: the game's own coach (Game.startTutorial) ringing the real controls.
// Raw Turkish, translated at display by tutorStep; `m` is the keyboard text, `d` the touch one.
const TUTOR = [
    { el: '#lair-goal', t: '🕵️ Amaç',
      m: 'Reisin kesesini al, tutsakları kurtar, sonra ÇIKIŞ yazan yere dönüp E ile inden ayrıl. Sızarsan in yerinde kalır.',
      d: 'Reisin kesesini al, tutsakları kurtar, sonra ÇIKIŞ yazan yere dönüp Etkileşim ile inden ayrıl. Sızarsan in yerinde kalır.' },
    { el: '#lair-keys', t: '🚶 Hareket',
      m: 'WASD yürür. Shift basılıyken koşarsın ama gürültü yaparsın. C ile eğilirsin: yavaşsın ama sessizsin ve daha az görünürsün.',
      d: 'Ekranın solunda parmağını sürükle: yürürsün. Sonuna kadar itersen koşarsın ama gürültü yaparsın. Eğil düğmesiyle eğilirsin: yavaşsın ama sessizsin ve daha az görünürsün.' },
    { el: '#lair-stickzone', t: '🕹️ Hareket kolu', m: '',
      d: 'Parmağını bastığın yerde çıkar. Hafif itersen yürürsün, kolu sonuna kadar itersen koşarsın.' },
    { el: '#lair-crouch', t: '🧎 Eğil', m: '',
      d: 'Eğilmiş yürürken adım sesin çıkmaz, haydutlar seni daha geç fark eder. Koşmaya başlarsan kalkarsın.' },
    { el: null, t: '👁️ Görüş konileri',
      m: 'Her haydudun önünde bir koni var: beyaz sakin, sarı şüpheli, kırmızı alarm. Başındaki ? çubuğu dolarsa seni fark eder. Karanlıkta daha az görürler; meşale ışığında seni uzaktan görürler.',
      d: 'Her haydudun önünde bir koni var: beyaz sakin, sarı şüpheli, kırmızı alarm. Başındaki ? çubuğu dolarsa seni fark eder. Karanlıkta daha az görürler; meşale ışığında seni uzaktan görürler.' },
    { el: null, t: '👂 Ses',
      m: 'Koşmak, suya basmak, kapı gıcırtısı ve dövüş ses halkası yayar; halkanın içindeki haydutlar bakmaya gelir. Uyuyanlar ancak yakındaki sesle uyanır.',
      d: 'Koşmak, suya basmak, kapı gıcırtısı ve dövüş ses halkası yayar; halkanın içindeki haydutlar bakmaya gelir. Uyuyanlar ancak yakındaki sesle uyanır.' },
    { el: '#lair-act', t: '✋ Etkileşim',
      m: 'Yeşil çerçeveli her şey kullanılabilir: sandık, çuval, varil, kol, kapak, pencere, kafes, kese. Yanına gidip E\'ye bas; ne yapacağı üstünde yazar.',
      d: 'Yeşil çerçeveli her şey kullanılabilir: sandık, çuval, varil, kol, kapak, pencere, kafes, kese. Yanına git; ne yapacağı bu düğmede ve nesnenin üstünde yazar.' },
    { el: null, t: '💤 Bayıltmak',
      m: 'Seni görmemiş bir haydudun arkasına sokul (eğilirsen daha kolay); başında "Bayılt" yazınca E. Uyuyanları ve zar oynayanları her yönden bayıltabilirsin. Yerde yatanı bulan haydut alarm verir.',
      d: 'Seni görmemiş bir haydudun arkasına sokul (eğilirsen daha kolay); başında "Bayılt" yazınca Etkileşim. Uyuyanları ve zar oynayanları her yönden bayıltabilirsin. Yerde yatanı bulan haydut alarm verir.' },
    { el: null, t: '🌾 Saklanmak',
      m: 'Saman, dolap ya da kaya kovuğuna girersen yanına gelmedikçe seni göremezler. Hareket edince çıkarsın.',
      d: 'Saman, dolap ya da kaya kovuğuna girersen yanına gelmedikçe seni göremezler. Kolu oynatınca çıkarsın.' },
    { el: '#lair-throw', t: '🪨 Çakıl taşı',
      m: 'Q\'yu basılı tut, fareyle yeri seç, bırakınca atılır. Taşın düştüğü yere bakmaya giderler; duyacakların başında ? çıkar. Meşaleyi söndürürsen biri yakmaya gelir, kampta atları ürkütmek birkaçını birden çeker.',
      d: 'Dokunursan baktığın yöne atarsın. Basılı tutup sürüklersen nereye düşeceğini seçersin, bırakınca atılır; parmağını düğmeye geri getirirsen düğme kırmızı "İptal" olur ve bırakınca atılmaz. Duyacakların başında ? çıkar.' },
    { el: '#lair-atk', t: '⚔️ Dövüş',
      m: 'Boşluk ile vurursun; seni görmemiş birine vurmak üç kat acıtır. Haydudun önündeki kırmızı yay vuruşun geldiğini gösterir: geri çekil. Aynı anda ancak birkaçı saldırır.',
      d: 'Saldır ile vurursun; seni görmemiş birine vurmak üç kat acıtır. Haydudun önündeki kırmızı yay vuruşun geldiğini gösterir: geri çekil. Aynı anda ancak birkaçı saldırır.' },
    { el: null, t: '🏃 Peşindeler!',
      m: 'Seni kovalayan bir haydut yakındayken hiçbir şey kullanılamaz: sandık, saklanma yeri, çıkış. Onları yen ya da uzaklaş; alarm biterse seni aramaya başlarlar.',
      d: 'Seni kovalayan bir haydut yakındayken hiçbir şey kullanılamaz: sandık, saklanma yeri, çıkış. Onları yen ya da uzaklaş; alarm biterse seni aramaya başlarlar.' },
    { el: null, t: '⛏️ Maden', feat: 'mine',
      m: 'Çuvalı E ile sırtlarsın: yavaşlarsın, eğilsen bile adımın duyulur, taş atamazsın; vurursan çuval yere düşer. Çıkışta E ile bırakırsın: bıraktığın çuval senindir, sonra yakalansan bile. Araba üç çuval alır; ittiğin an raylarda gürleyerek çıkışa yuvarlanır, bütün maden duyar.',
      d: 'Çuvalı Etkileşim ile sırtlarsın: yavaşlarsın, eğilsen bile adımın duyulur, taş atamazsın; vurursan çuval yere düşer. Çıkışta Etkileşim ile bırakırsın: bıraktığın çuval senindir, sonra yakalansan bile. Araba üç çuval alır; ittiğin an raylarda gürleyerek çıkışa yuvarlanır, bütün maden duyar.' },
    // the hideouts' own things (2.9.0), shown only where the level has them
    { el: null, t: '🐕 Bekçi köpekleri', feat: 'dog',
      m: 'Köpekler seni karanlıkta da koklar, köşeden bile; havlayınca haydutlar gelir. Kilerden et al: Q ile önce et atılır, köpek koşup yer ve bir süre başka şeyle ilgilenmez. Yerken arkasından bayıltabilirsin.',
      d: 'Köpekler seni karanlıkta da koklar, köşeden bile; havlayınca haydutlar gelir. Kilerden et al: Taş düğmesi önce eti atar, köpek koşup yer ve bir süre başka şeyle ilgilenmez. Yerken arkasından bayıltabilirsin.' },
    { el: null, t: '🔑 Anahtar', feat: 'key',
      m: 'Kırmızı çizgili kapı kilitli. Anahtar kemerinde parlayan haydutta: arkasından ya da uyurken sokulup E ile çal, ya da onu yere serip al. Anahtar sendeyse kapıya yürümen yeter.',
      d: 'Kırmızı çizgili kapı kilitli. Anahtar kemerinde parlayan haydutta: arkasından ya da uyurken sokulup Etkileşim ile çal, ya da onu yere serip al. Anahtar sendeyse kapıya yürümen yeter.' },
    { el: null, t: '🌊 Derin su ve sazlık', feat: 'water',
      m: 'Koyu suda yüzersin: yavaşsın, dövüşemezsin ama başın ancak yakından görünür ve haydutlar yüzemez. Sazlıkta eğilirsen dibine gelmedikçe seni görmezler; ayakta yürürsen sazlar hışırdar.',
      d: 'Koyu suda yüzersin: yavaşsın, dövüşemezsin ama başın ancak yakından görünür ve haydutlar yüzemez. Sazlıkta eğilirsen dibine gelmedikçe seni görmezler; ayakta yürürsen sazlar hışırdar.' },
    { el: null, t: '🦴 Gürültülü zemin', feat: 'loud',
      m: 'Kemik, çakıl ya da kuru yaprak saçılmış yerde eğilsen bile ses çıkar. Ya dolaş ya da hızlı geç.',
      d: 'Kemik, çakıl ya da kuru yaprak saçılmış yerde eğilsen bile ses çıkar. Ya dolaş ya da hızlı geç.' },
    { el: null, t: '🔔 Çan', feat: 'bell',
      m: 'Çanı çalarsan uyanık olan herkes çana koşar, yakında uyuyanlar uyanır. Çalıp hemen başka yere geç: onlar kulede ararken sen işini görürsün.',
      d: 'Çanı çalarsan uyanık olan herkes çana koşar, yakında uyuyanlar uyanır. Çalıp hemen başka yere geç: onlar kulede ararken sen işini görürsün.' },
    { el: null, t: '🌿 Uyku otu', feat: 'herb',
      m: 'Raftaki uyku otunu topla, zar oynayanların içtiği fıçıya kat. Biraz sonra fıçının çevresindeki zarcılar uyuyakalır.',
      d: 'Raftaki uyku otunu topla, zar oynayanların içtiği fıçıya kat. Biraz sonra fıçının çevresindeki zarcılar uyuyakalır.' },
    { el: null, t: '🪢 Asılı yük', feat: 'drop',
      m: 'Bir direğe bağlı halat, yerinde gölgesi görünen bir yükü tutuyor. Halatı kes: yük düşer, altındaki herkes bayılır. Gürültüsü uzaktan duyulur.',
      d: 'Bir direğe bağlı halat, yerinde gölgesi görünen bir yükü tutuyor. Halatı kes: yük düşer, altındaki herkes bayılır. Gürültüsü uzaktan duyulur.' },
    { el: null, t: '🐻 Ayı', feat: 'bear',
      m: 'Kafesteki ayıyı salarsan en yakın haydudun üstüne yürür; haydutlar ayıyla boğuşurken seni kovalamazlar.',
      d: 'Kafesteki ayıyı salarsan en yakın haydudun üstüne yürür; haydutlar ayıyla boğuşurken seni kovalamazlar.' },
    { el: null, t: '🪨 Kaya kenarı', feat: 'ledge',
      m: 'Kaya kenarının üstünde E ile aşağı atlarsın: kestirme ama tek yönlü, geri çıkamazsın. Haydutlar uzun yoldan dolaşır.',
      d: 'Kaya kenarının üstünde Etkileşim ile aşağı atlarsın: kestirme ama tek yönlü, geri çıkamazsın. Haydutlar uzun yoldan dolaşır.' },
    { el: null, t: '⛓️ Tutsaklar ve pusu',
      m: 'Tutsağın ipini çöz, seni takip eder; dışarı çıkarırsan grubuna katılır. Bazıları heyecanlıdır, önce sus işareti ver. Bazı inlerde pusu kurulur: kapı kapanır, haydutlar saldırır — iyi bir gözcü bunu önceden görür.',
      d: 'Tutsağın ipini çöz, seni takip eder; dışarı çıkarırsan grubuna katılır. Bazıları heyecanlıdır, önce sus işareti ver. Bazı inlerde pusu kurulur: kapı kapanır, haydutlar saldırır — iyi bir gözcü bunu önceden görür.' }
];
const TUTOR_KEY = 'webband_ltutor_done';
function tutorial() {
    overlay('');
    paused = false;
    const f = L ? feats(L) : new Set();
    Game.startTutorial(true, TUTOR.filter(s => (Game.isTouch() ? true : !!s.m) && (!s.feat || f.has(s.feat))), TUTOR_KEY);
}
// the first time in: ask whether to see the tour (a no is remembered too)
function offerTutorial() {
    let seen = null; try { seen = localStorage.getItem(TUTOR_KEY); } catch(e) {}
    if(seen) return;
    Game.showModal(`<h3>${T('🕵️ İlk haydut inin')}</h3><p>${T('Nasıl oynandığını kısaca göstereyim mi? Sonra da duraklatma menüsünden ya da keşif kartındaki ? düğmesinden açabilirsin.')}</p>
        <div style="display:flex;gap:.6rem;margin-top:1rem;flex-wrap:wrap">
            <button class="btn primary" onclick="Game.closeModal(); Lair.tutorial()">${T('Evet, göster')}</button>
            <button class="btn" onclick="Lair.skipTutorial()">${T('Hayır, biliyorum')}</button></div>`);
}
function skipTutorial() { try { localStorage.setItem(TUTOR_KEY, '1'); } catch(e) {} Game.closeModal(); }

// ---------- going in and coming out ----------
function enter(id, approach) {
    const s = Game.lairs().find(x => x.id === id);
    if(!s) return Game.closeModal();
    if(approach === 'army') return Game.assaultLair(id, ASSAULT_REINFORCE);
    Game.closeModal();
    const squad = approach === 'squad' ? squadPool().slice(0, squadCap()) : [];
    R = { site: s, level: levelOf(s), time: Game.isNight() ? 'night' : 'day', scout: Game.profLvl('spotting'), approach, squad, ambush: ambushToday(s) };
    if(LEVELS[R.level].mine && !s.ore) s.ore = { ...Game.MINE.ore };   // a site made a mine by hand (a test, an old save) starts full
    s.lairAmbush = null;          // what was waiting is sprung (or not) now; tomorrow's is new
    build();
    // the map clock stops while the sprites load (seconds on a slow link): an encounter popping up
    // meanwhile would open its window over the lair's first frame (#171). showScreen lifts the hold.
    Game.hold(true);
    loadAssets().then(() => {
        api.active = true; paused = false;
        Game.showScreen('lair');
        overlay('');
        resize();
        newGame();
        Game.curtain(T(LEVELS[R.level].name), T(LEVELS[R.level].kind));
        Snd.start();
        Game.Music.sync();
        last = 0;
        if(!loopId) loopId = requestAnimationFrame(frame);
        setTimeout(offerTutorial, 900);
    });
}
// a downed hero has already lost (endGame('lost') waits only for the fall): no walking out with the loot
function retreat() { if(!G || G.done || G.player.state === 'down' || chaser()) return; overlay(''); paused = false; endGame('out'); }
// What a sneak brings home is booked the moment it ends; the panel only reports it
function endGame(kind) {
    if(G.done) return;
    G.done = true;
    const s = R.site, p = G.player;
    const pris = G.chars.filter(c => c.kind === 'prisoner'), out = kind === 'lost' ? 0 : pris.filter(c => c.following && c.state !== 'down').length;
    const standing = G.chars.filter(c => c.kind === 'guard' && !c.ambusher && c.state !== 'down' && c.state !== 'ko').length;
    const fallen = G.chars.filter(c => c.kind === 'squad' && c.state === 'down');
    fallen.forEach(c => { c.troop.wounded = Math.max(c.troop.wounded || 0, 3); });
    const rows = [];
    let title, lead, cleared = '';
    if(L.mine) {
        // carried out on your back counts as set down at the mouth; what's in a cart that never
        // got there, or on your back when they caught you, stays in the mine (and in its stock)
        if(kind !== 'lost' && G.carry) { G.bank[G.carry]++; G.carry = null; }
        const per = Game.MINE.perSack, got = { iron: G.bank.iron * per.iron, coal: G.bank.coal * per.coal };
        for(const k in got) if(got[k]) Game.addItem(k, got[k]);
        s.ore.iron = Math.max(0, (s.ore.iron || 0) - G.bank.iron); s.ore.coal = Math.max(0, (s.ore.coal || 0) - G.bank.coal);
        rows.push([T('Çıkarılan demir'), got.iron], [T('Çıkarılan kömür'), got.coal]);
        if(kind !== 'lost' && G.steel) { Game.addItem('crucible', G.steel); s.steel = 0; rows.push([T('Pota çeliği'), G.steel]); }
    }
    if(kind === 'lost') {
        // beaten and robbed: what you found stays inside, a quarter of the purse you carried goes too
        const lost = Math.floor(state.player.money * .25);
        state.player.money -= lost;
        state.player.stats.hp = Math.max(5, Math.floor(state.player.stats.maxHp * .2));
        s.strength = Math.min(24, (s.strength || 8) + 1);
        title = T('Yenildin'); lead = T('Haydutlar seni yere serdi, üstünü arayıp in dışına attılar. Bulduklarını geri aldılar.')
            + (L.mine && G.bank.iron + G.bank.coal ? ' ' + T('Çıkışa bıraktığın çuvallar ise senin kaldı.') : '');
        rows.push([T('Kaybedilen dinar'), '-' + lost]);
    } else {
        state.player.money += G.gold;
        G.items.forEach(id => Game.addItem(id, 1));
        state.player.stats.hp = Math.max(1, Math.min(state.player.stats.maxHp, Math.round(p.hp)));
        if(G.purseTaken) s.purse = 0;
        // every bandit left on the floor is one fewer in the lair; nobody left standing means it's broken
        s.strength = Math.max(4, (s.strength || 8) - (G.downs + G.kos) * .6);
        let joined = 0;
        const near = LOCATIONS.slice().sort((a, b) => Game.dist(a, s) - Game.dist(b, s))[0];
        // a noble walked out is the quest done (the lord pays at the hand-in); the rest join the party
        const nobleOut = pris.find(c => c.noble && c.following && c.state !== 'down');
        for(let i = 0; i < out - (nobleOut ? 1 : 0); i++) if(Game.addRecruit(near)) joined++; else state.player.renown = (state.player.renown || 0) + 2;
        if(nobleOut) Quests.emit('lair_captive_freed', { lairId: s.id });
        Game.addProficiencyXp('spotting', 25 + G.kos * 5);
        if(!standing) cleared = Game.clearLair(s.id);
        title = G.alarm > 0 ? T('Kaçtın') : T('Sessizce çıktın');
        lead = cleared || T('İn yerinde duruyor. Haydutlar dönünce eksikleri fark edecek.');
        rows.push([T('Dinar'), '+' + G.gold], [T('Eşya'), G.items.map(id => T(ITEMS[id].name)).join(', ') || '—'],
                  [T('Kurtarılan tutsak'), out + ' / ' + pris.length + (joined ? ' · ' + T`${joined} kişi grubuna katıldı` : '')]);
        if(nobleOut) rows.push([T('Kurtarılan soylu'), T(nobleOut.noble.name)]);
    }
    rows.push([T('Bayıltılan'), G.kos], [T('Yere serilen'), G.downs], [T('Alarm'), G.alarms ? T`${G.alarms} kez` : T('hiç')]);
    if(fallen.length) rows.push([T('Yaralanan asker'), fallen.length]);
    rows.push([T('Süre'), Math.floor(G.t / 60) + ':' + String(Math.floor(G.t % 60)).padStart(2, '0')]);
    Game.updateTopBar();
    Snd.stop();
    Game.Music.sync();
    const eyebrow = T(L.name) + ' · ' + (R.approach === 'squad' ? T('Askerlerinle') : T('Tek başına')) + ' · ' + (R.time === 'day' ? T('Gündüz') : T('Gece'));
    setTimeout(() => overlay(`<div class="leyebrow">${eyebrow}</div><h2>${title}</h2><p class="llead">${lead}</p>
        <table class="lres">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>
        <div class="lrow"><button class="btn primary" onclick="Lair.leave()">${T('🗺️ Haritaya dön')}</button></div>`), kind === 'lost' ? 0 : 150);
}
function leave() {
    overlay('');
    api.active = false;
    Snd.stop();
    if(loopId) { cancelAnimationFrame(loopId); loopId = null; }
    G = null;
    Game.showScreen('map');
    Game.autosave && Game.autosave();
}

// A level, read off its table alone (no run): can the hero do everything it offers and get out,
// can every guard walk his post and round? The hero's moves are the game's: doors open, a
// lever lifts its rubble, a cage door can be forced, the keyed doors open once a key-carrier
// can be reached, a ledge drops one way, a window and a trapdoor pair carry you across, deep
// water is swum. Guards don't swim, jump or pass a keyed door. Returns what's wrong, [] if
// nothing (tools/test.js runs it on every level).
function check(key) {
    const lv = LEVELS[key], map = lv.map, h = map.length, w = map[0].length, errs = [];
    const at = (x, y) => (y < 0 || y >= h || x < 0 || x >= w) ? ' ' : map[y][x];
    const SOLIDO = new Set(Object.keys(OBJDEF).filter(c => OBJDEF[c].solid && c !== 'K'));
    const wallish = c => WALLS.has(c) || c === 'W' || SOLID_T.has(c) || SOLIDO.has(c);
    const opens = new Set(((lv.lever && lv.lever.opens) || []).map(([x, y]) => x + ',' + y));
    const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    const find = ch => { const o = []; map.forEach((r, y) => [...r].forEach((c, x) => { if(c === ch) o.push([x, y]); })); return o; };
    const reach = (x, y, R) => R.has(x + ',' + y) || N8.some(([dx, dy]) => R.has((x + dx) + ',' + (y + dy)));
    // the hero's reach, grown until nothing new opens (a lever's rubble, a key's doors)
    const flood = (lever, key, guard) => {
        const R = new Set(), st = guard || find('@')[0], q = [st];
        if(!st) return R;
        R.add(st[0] + ',' + st[1]);
        const tds = find('t');
        const ok = (x, y) => {
            const c = at(x, y);
            if(c === 'X') return lever && opens.has(x + ',' + y);
            if(c === 'd') return key && !guard;
            if(c === '%') return !guard;
            return !wallish(c);
        };
        for(let i = 0; i < q.length; i++) {
            const [x, y] = q[i], nxt = [];
            for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if(ok(x + dx, y + dy)) nxt.push([x + dx, y + dy]);
            if(!guard) {
                if(at(x, y + 1) === 'J' && ok(x, y + 2)) nxt.push([x, y + 2]);
                for(const dx of [1, -1]) if(at(x + dx, y) === 'W' && ok(x + 2 * dx, y)) nxt.push([x + 2 * dx, y]);
                if(at(x, y) === 't') for(const [a, b] of tds) for(const [ex, ey] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if(ok(a + ex, b + ey)) nxt.push([a + ex, b + ey]);
            }
            for(const [a, b] of nxt) { const k = a + ',' + b; if(!R.has(k)) { R.add(k); q.push([a, b]); } }
        }
        return R;
    };
    let lever = false, keyed = false, R = flood(false, false);
    for(let n = 0; n < 3; n++) {
        lever = lever || find('L').some(([x, y]) => reach(x, y, R));
        keyed = keyed || lv.guards.some(g => g.key && reach(g.x, g.y, R));
        R = flood(lever, keyed);
    }
    if(!find('@').length) errs.push('no start (@)');
    if(map.some(r => r.length !== w)) errs.push('ragged rows');
    if(!find('E').concat(find('@')).length) errs.push('no exit');
    const must = lv.mine ? ['o', 'q', 'C'] : ['$', 'P', 'C'];
    for(const ch of must) if(!find(ch).length) errs.push(`nothing marked ${ch}`);
    for(const ch of ['$', 'P', 'C', 'c', 'o', 'q', 'L', 'G', 'm', 'i', 'Z', 'y', 'H']) for(const [x, y] of find(ch)) if(!reach(x, y, R)) errs.push(`${ch} at ${x},${y} can't be reached`);
    if(find('d').length && !lv.guards.some(g => g.key)) errs.push('a locked door and no key-carrier');
    if(find('Z').length && !find('z').length) errs.push('a rope cleat with no load');
    if(find('w').length && !find('i').length) errs.push('a keg with no herb shelf');
    if(lv.guards.some(g => g.dog) && !find('m').length) errs.push('dogs and no larder');
    // the herb in the keg is worth something only if bandits drink from it
    for(const [x, y] of find('w')) if(!lv.guards.some(g => g.type === 'dice' && Math.hypot(g.x - x, g.y - y) * TS < DRUG_R)) errs.push(`keg at ${x},${y} has no dice table near it`);
    for(const g of lv.guards) {
        if(g.type === 'tower') continue;                               // up on the platform
        if(wallish(at(g.x, g.y)) || at(g.x, g.y) === '%') { errs.push(`guard on a wall at ${g.x},${g.y}`); continue; }
        const GR = flood(true, false, [g.x, g.y]);
        for(const [rx, ry] of g.route || []) if(!GR.has(rx + ',' + ry)) errs.push(`guard ${g.x},${g.y} can't walk to ${rx},${ry}`);
    }
    // a fair start: nobody awake by day sees the spot you come in at (whichever way he's facing)
    const [sx, sy] = find('@')[0] || [0, 0], dark = c => WALLS.has(c) || c === 'D' || c === 'd' || c === 'X' || c === 'n';
    for(const g of lv.guards) {
        if(g.type === 'sleep') continue;
        const r = BASE_RANGE * (lv.fog || 1) * (g.type === 'tower' ? 1.75 : 1), d = Math.hypot(g.x - sx, g.y - sy) * TS;
        if(d > r) continue;
        // a post's cone, swept: a patrol or a dog on the move may face anywhere
        const FACE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
        if(g.type !== 'patrol' && !g.dog && g.face in FACE && Math.abs(angDiff(Math.atan2(sy - g.y, sx - g.x), FACE[g.face])) > (g.type === 'tower' ? .95 : FOV) + (g.sweep || 0)) continue;
        const n = Math.ceil(d / 8);
        let clear = true;
        for(let i = 1; i < n && clear; i++) { const tx = Math.floor(g.x + .5 + (sx - g.x) * i / n), ty = Math.floor(g.y + .5 + (sy - g.y) * i / n); if(dark(at(tx, ty))) clear = false; }
        if(clear) errs.push(`guard ${g.x},${g.y} sees the start`);
    }
    if(find(',').length && !lv.crunch) errs.push('a loud floor with no crunch line');
    const A = lv.ambush;
    if(!A) errs.push('no ambush'); else for(const [x, y] of A.spawns) if(wallish(at(x, y)) || x < A.room[0] || x > A.room[2] || y < A.room[1] || y > A.room[3]) errs.push(`ambush spawn ${x},${y} off the room's floor`);
    if(!(find('E').length + find('@').length) || !find('E').concat(find('@')).some(([x, y]) => R.has(x + ',' + y))) errs.push('the way out is cut off');
    if(lv.loot && typeof ITEMS !== 'undefined' && !ITEMS[lv.loot]) errs.push(`loot ${lv.loot} is no item`);
    return errs;
}

const api = {
    active: false, check,
    LEVELS, LAYOUTS, DENS, INTEL, TUTOR, TUTOR_KEY, ASSAULT_REINFORCE, CART_CAP, feats,
    brief, help, enter, resume, retreat, leave, tutorial, skipTutorial, levelOf, intelList,
    alarmed() { return !!(api.active && G && !G.done && G.alarm > 0); },
    setPaused(v) { if(api.active) { paused = !!v; if(!v) last = 0; } },
    pauseMenu,
    // for the tests and the debug report: the live run, read-only by convention
    run() { return G; }, runConfig() { return R; },
    // the measured numbers in docs/SYSTEMS.md: ms per update and per render, averaged over n frames
    _bench(n = 120) { let u = 0, r = 0; for(let i = 0; i < n; i++) { let t = performance.now(); update(1 / 60); u += performance.now() - t; t = performance.now(); render(); r += performance.now() - t; } return { update: +(u / n).toFixed(3), render: +(r / n).toFixed(3) }; },
    // world setup for the tests: a walkable spot beside tile (x, y) and the player put there
    _place(x, y, a) { const sp = freeSpotNear(x, y); G.player.x = sp.x; G.player.y = sp.y; if(a !== undefined) G.player.a = a; else G.player.a = Math.atan2(y * TS + 16 - sp.y, x * TS + 16 - sp.x); },
    // the strings the level tables show, for the i18n gate (tools/test.js)
    strings() {
        const out = [];
        for(const lv of Object.values(LEVELS)) {
            out.push(lv.name, lv.kind, lv.news, lv.ambush.where, lv.intel.entrances, lv.intel.entrance1, lv.intel.secret, lv.intel.traps, lv.intel.leader.day, lv.intel.leader.night, lv.crunch);
        }
        out.push(...Object.values(HIDES));
        for(const s of TUTOR) out.push(s.t, s.m, s.d);
        return out.filter(Boolean);
    }
};
return api;
})();
