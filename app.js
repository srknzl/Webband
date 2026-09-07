// ============================================
// WEBBAND - Mount & Blade Tarzı RPG
// ============================================

// --- DATA ---
const FACTIONS = {
    swadia:  { id: 'swadia',  name: 'Svadya Krallığı',  color: '#ff4d4d', ruler: 'Kral Harlaus', vizier: 'Vezir Klargus', lore: 'Ağır zırhlı şövalyeleri ve geniş düzlükleriyle meşhur, eski Kalradya İmparatorluğu\'nun asıl varisi olduğunu iddia eden güçlü bir krallık.' },
    rhodok:  { id: 'rhodok',  name: 'Rodok Krallığı',   color: '#33cc33', ruler: 'Kral Graveth', vizier: 'Vezir Matheas', lore: 'Dağlık bölgelerde yaşayan özgür ruhlu insanların kurduğu, tatar yaylı keskin nişancıları ve dev kalkanlı mızraklılarıyla geçilmez bir krallık.' },
    vaegir:  { id: 'vaegir',  name: 'Veagir Krallığı',  color: '#cccccc', ruler: 'Kral Yaroglek', vizier: 'Vezir Vuldrat', lore: 'Kuzeyin karlı ve soğuk ormanlarından gelen, baltalı piyadeleri ve ölümcül okçularıyla bilinen sert insanların diyarı.' },
    nord:    { id: 'nord',    name: 'Nord Krallığı',    color: '#3399ff', ruler: 'Kral Ragnar', vizier: 'Vezir Lethwin', lore: 'Deniz aşırı ülkelerden uzun gemileriyle gelip kıyıları ele geçiren, atları kullanmayan fakat piyade dövüşünde rakipsiz olan savaşçılar.' },
    khergit: { id: 'khergit', name: 'Kergit Hanlığı',   color: '#cc66ff', ruler: 'Sancar Han', vizier: 'Vezir Tonju', lore: 'Doğunun bozkırlarından at sırtında gelen, aşırı hızlı atlı okçuları ve göçebe savaş taktikleriyle düşmanlarını çıldırtan boyların birleşimi.' }
};

// LORDS, LADIES, PERSONALITIES -> nobles.js


const LOCATIONS = [
    // Swadia
    { id:'praven',  name:'Praven',   type:'city',   faction:'swadia',  x:3450, y:3900 },
    { id:'suno',    name:'Suno',     type:'city',   faction:'swadia',  x:3750, y:3750 },
    { id:'uxkhal',  name:'Uxkhal',   type:'city',   faction:'swadia',  x:3840, y:4140 },
    { id:'dhirim',  name:'Dhirim',   type:'city',   faction:'swadia',  x:4200, y:3900 },
    { id:'castle_s1', name:'Tevarin Kalesi', type:'castle', faction:'swadia', x:3300, y:4050 },
    { id:'castle_s2', name:'Kelredan Kalesi', type:'castle', faction:'swadia', x:3960, y:3960 },
    { id:'vil_s1',  name:'Azgad',    type:'village', faction:'swadia',  x:3540, y:3840 },
    { id:'vil_s2',  name:'Emirin',   type:'village', faction:'swadia',  x:3660, y:4020 },
    // Rhodok
    { id:'jelkala', name:'Jelkala',  type:'city',   faction:'rhodok',  x:3540, y:4440 },
    { id:'veluca',  name:'Veluca',   type:'city',   faction:'rhodok',  x:3840, y:4380 },
    { id:'castle_r1', name:'Culmarr Kalesi', type:'castle', faction:'rhodok', x:3360, y:4560 },
    { id:'vil_r1',  name:'Pagundur', type:'village', faction:'rhodok',  x:3690, y:4500 },
    // Nord
    { id:'sargoth', name:'Sargoth',  type:'city',   faction:'nord',    x:3750, y:3300 },
    { id:'tihr',    name:'Tihr',     type:'city',   faction:'nord',    x:3360, y:3360 },
    { id:'castle_n1', name:'Jelbegi Kalesi', type:'castle', faction:'nord', x:3540, y:3210 },
    { id:'vil_n1',  name:'Yruma',    type:'village', faction:'nord',    x:3840, y:3390 },
    // Vaegir
    { id:'reyvadin', name:'Reyvadin', type:'city',  faction:'vaegir',  x:4500, y:3450 },
    { id:'khudan',   name:'Khudan',   type:'city',  faction:'vaegir',  x:4860, y:3360 },
    { id:'castle_v1', name:'Nelag Kalesi', type:'castle', faction:'vaegir', x:4680, y:3240 },
    { id:'vil_v1',  name:'Uslum',    type:'village', faction:'vaegir',  x:4620, y:3600 },
    // Khergit
    { id:'tulga',   name:'Tulga',    type:'city',   faction:'khergit', x:5040, y:4050 },
    { id:'halmar',  name:'Halmar',   type:'city',   faction:'khergit', x:4590, y:4200 },
    { id:'narra',   name:'Narra',    type:'city',   faction:'khergit', x:4800, y:3900 },
    { id:'castle_k1', name:'Durquba Kalesi', type:'castle', faction:'khergit', x:5160, y:3840 },
    { id:'vil_k1',  name:'Peshmi',   type:'village', faction:'khergit',  x:4950, y:4260 },
];

const RIVERS = [
    { x1: 3660, y1: 3000, x2: 3600, y2: 3750, width: 25 },
    { x1: 3600, y1: 3750, x2: 4140, y2: 4050, width: 20 },
    { x1: 4140, y1: 4050, x2: 4350, y2: 4800, width: 30 },
    { x1: 3600, y1: 3750, x2: 3150, y2: 4200, width: 15 },
    { x1: 4350, y1: 3300, x2: 4650, y2: 3750, width: 18 },
];

const FORESTS = [
    { x: 3450, y: 3450, radius: 135 },
    { x: 3960, y: 4440, radius: 165 },
    { x: 4650, y: 3960, radius: 150 },
    { x: 3300, y: 4650, radius: 180 }
];

window.alert = function(msg) {
    if(window.Game && window.Game.showModal) {
        Game.showModal(`<div style="text-align:center"><h3 style="margin-bottom:1rem;color:#ffaa00">Bildirim</h3><p style="font-size:1.1rem;line-height:1.5">${msg}</p><button class="btn primary" style="margin-top:1.5rem" onclick="Game.closeModal()">Tamam</button></div>`);
    }
};

// Hasar türleri (Warband): zırh her türe farklı direnir.
// armor = savunmanın kaçta kaçı işler, mult = ham hasar çarpanı.
const DMG_TYPES = {
    cut:    { name: 'kesici', armor: 1.0,  mult: 1.0 },
    pierce: { name: 'delici', armor: 0.5,  mult: 0.9 },
    blunt:  { name: 'ezici',  armor: 0.65, mult: 0.8, knock: true }   // öldürmez, bayıltır: esir düşürür
};

const ITEMS = {
    // spoil: kaç günde bir stoğun tamamı bozulur (günlük kayıp = qty/spoil).
    // Ucuz erzak çabuk bozulur, pahalısı dayanır — depolamak da bir tercih.
    wheat:  { id:'wheat',  name:'Tahıl',         type:'food',  quality:'low', basePrice:20,  icon:'🌾', spoil:60 },
    bread:  { id:'bread',  name:'Ekmek',         type:'food',  quality:'low', basePrice:30,  icon:'🍞', spoil:20 },
    meat:   { id:'meat',   name:'Kurutulmuş Et', type:'food',  quality:'high',basePrice:100, icon:'🥩', spoil:30 },
    cheese: { id:'cheese', name:'Peynir',        type:'food',  quality:'high',basePrice:80,  icon:'🧀', spoil:40 },
    iron:   { id:'iron',   name:'Demir',         type:'trade', basePrice:150, icon:'⛏️' },
    velvet: { id:'velvet', name:'Kadife',        type:'trade', basePrice:400, icon:'🧵' },
    ale:    { id:'ale',    name:'Bira',          type:'trade', basePrice:50,  icon:'🍺' },
    salt:   { id:'salt',   name:'Tuz',           type:'trade', basePrice:100, icon:'🧂' },
    sword:  { id:'sword',  name:'Kılıç',         type:'weapon', weaponType:'oneHanded', dmgType:'cut',    basePrice:250, attack:15, icon:'⚔️' },
    axe:    { id:'axe',    name:'Savaş Baltası', type:'weapon', weaponType:'twoHanded', dmgType:'cut',    basePrice:300, attack:20, icon:'🪓' },
    mace:   { id:'mace',   name:'Topuz',         type:'weapon', weaponType:'oneHanded', dmgType:'blunt',  basePrice:220, attack:16, icon:'🔨' },
    lance:  { id:'lance',  name:'Mızrak',        type:'weapon', weaponType:'polearm',   dmgType:'pierce', basePrice:200, attack:12, icon:'🔱' },
    bow:    { id:'bow',    name:'Yay',           type:'weapon', weaponType:'bow',       dmgType:'pierce', basePrice:220, attack:10, icon:'🏹' },
    shield: { id:'shield', name:'Kalkan',        type:'armor',  basePrice:150, defense:10, icon:'🛡️' },
    mail:   { id:'mail',   name:'Zincir Zırh',   type:'armor',  basePrice:500, defense:25, icon:'🦺' },
    horse:  { id:'horse',  name:'Savaş Atı',     type:'horse',  basePrice:600, icon:'🐴' },
    boss_map: { id:'boss_map', name:'Boss Haritası', type:'special', basePrice:5000, icon:'🗺️' },
    lvl51_token: { id:'lvl51_token', name:'Savaş Tanrısı Nişanı', type:'special', basePrice:10000, icon:'🏅' }
};

// --- UPGRADE TREES & STATS ---
// Her fraksiyonun kendi asker ağacı: köylü -> dal -> elit.
// Satır formatı: [ad, tür, hp, hız, saldırı, savunma, ikon, terfi bedeli]
const TROOP_TREES = {
    swadia: {   // dengeli; en güçlü ağır süvari
        recruit: ['Svadya Köylüsü', 'infantry', 20, 50, 6, 0, '🪖'],
        branches: [
            [['Svadya Milisi', 'infantry', 45, 60, 12, 5, '🛡️', 40],
             ['Svadya Çavuşu', 'infantry', 65, 65, 18, 12, '🏰', 100]],
            [['Svadya Avcısı', 'archer', 35, 55, 6, 2, '🏹', 50],
             ['Svadya Keskin Nişancısı', 'archer', 45, 60, 10, 5, '🎯', 120]],
            [['Svadya Süvarisi', 'cavalry', 50, 99, 12, 8, '🐴', 70],
             ['Svadya Şövalyesi', 'cavalry', 75, 110, 22, 15, '⚔️🐴', 150]]
        ]
    },
    rhodok: {   // süvarisi yok; dev kalkanlar ve tatar yayı
        recruit: ['Rodok Köylüsü', 'infantry', 20, 50, 6, 0, '🪖'],
        branches: [
            [['Rodok Mızraklısı', 'infantry', 48, 56, 11, 8, '🛡️', 40],
             ['Rodok Kalkanlısı', 'infantry', 70, 58, 17, 18, '🛡️', 110]],
            [['Rodok Nişancısı', 'archer', 36, 54, 8, 3, '🏹', 55],
             ['Rodok Tatar Yaylısı', 'archer', 48, 56, 16, 6, '🎯', 130]]
        ]
    },
    vaegir: {   // baltalı piyade, ölümcül okçu, vasat süvari
        recruit: ['Veagir Köylüsü', 'infantry', 20, 50, 6, 0, '🪖'],
        branches: [
            [['Veagir Piyadesi', 'infantry', 44, 60, 13, 4, '🪓', 40],
             ['Veagir Baltacısı', 'infantry', 62, 64, 20, 9, '🪓', 105]],
            [['Veagir Okçusu', 'archer', 34, 56, 9, 2, '🏹', 55],
             ['Veagir Nişancısı', 'archer', 44, 60, 14, 4, '🎯', 125]],
            [['Veagir Atlısı', 'cavalry', 46, 95, 11, 6, '🐴', 70],
             ['Veagir Süvarisi', 'cavalry', 60, 100, 16, 10, '🐴', 140]]
        ]
    },
    nord: {     // at kullanmaz; piyade dövüşünde rakipsiz
        recruit: ['Nord Serfi', 'infantry', 20, 50, 6, 0, '🪖'],
        branches: [
            [['Nord Savaşçısı', 'infantry', 50, 62, 14, 6, '🛡️', 45],
             ['Nord Baltacısı', 'infantry', 80, 66, 24, 13, '🪓', 140]],
            [['Nord Avcısı', 'archer', 38, 58, 9, 3, '🏹', 50],
             ['Nord Nişancısı', 'archer', 50, 60, 12, 6, '🎯', 115]]
        ]
    },
    khergit: {  // hepsi atlı; hızlı ama ince zırhlı
        recruit: ['Kergit Çobanı', 'infantry', 20, 55, 6, 0, '🪖'],
        branches: [
            [['Kergit Atlısı', 'cavalry', 44, 105, 11, 4, '🐴', 60],
             ['Kergit Süvarisi', 'cavalry', 58, 115, 18, 8, '⚔️🐴', 135]],
            [['Kergit Atlı Okçusu', 'archer', 40, 108, 10, 3, '🏹', 65],
             ['Kergit Han Muhafızı', 'archer', 52, 118, 15, 6, '🎯', 145]]
        ]
    }
};

const TROOP_UPGRADES = {};
const TROOP_TYPES = {};
(function buildTroopTrees() {
    const stats = r => ({ hp: r[2], speed: r[3], attack: r[4], defense: r[5], type: r[1], icon: r[6] });
    const up = r => ({ name: r[0], cost: r[7], type: r[1] });
    for(let f in TROOP_TREES) {
        let tree = TROOP_TREES[f];
        TROOP_TYPES[tree.recruit[0]] = stats(tree.recruit);
        TROOP_UPGRADES[tree.recruit[0]] = tree.branches.map(b => up(b[0]));
        tree.branches.forEach(b => b.forEach((r, i) => {
            TROOP_TYPES[r[0]] = stats(r);
            if(b[i + 1]) TROOP_UPGRADES[r[0]] = [up(b[i + 1])];
        }));
    }
})();
// Eski kayıtlardaki 'Acemi Asker' Svadya ağacına girer
TROOP_TYPES['Acemi Asker'] = TROOP_TYPES['Svadya Köylüsü'];
TROOP_UPGRADES['Acemi Asker'] = TROOP_UPGRADES['Svadya Köylüsü'];

// Düşman çeteleri: haritadaki parti + savaştaki birim karışımı.
// battle: [ad, tür, hp, hız, saldırı, savunma, pay] — pay = çıkma ağırlığı
const BAND_KINDS = {
    bandit:   { name: 'Çapulcular', color: '#d0483a', icon: 'foot', min: 5, max: 14, speedMult: 1,
                lore: '"Ya paranı, ya canını!"',
                battle: [['Çapulcu','infantry',24,52,6,0,6], ['Çapulcu Okçu','archer',20,50,6,0,2],
                         ['Atlı Çapulcu','cavalry',32,88,9,2,1]],
                leader: ['Çapulcu Reisi','infantry',52,60,13,4] },
    forest:   { name: 'Orman Haydutları', color: '#8bd15a', icon: 'archer', min: 6, max: 12, speedMult: 1.05,
                lore: '"Ağaçların arasından bakan gözleri ancak ok uçarken fark edersin."',
                battle: [['Haydut Okçusu','archer',24,54,8,1,6], ['Orman Haydudu','infantry',28,58,8,1,4]],
                leader: ['Haydut Başı','archer',48,58,14,3] },
    mountain: { name: 'Dağ Eşkıyaları', color: '#d4a03a', icon: 'foot', min: 8, max: 16, speedMult: 0.95,
                lore: '"Bu geçit bizim. Geçiş ücreti: her şeyin."',
                battle: [['Dağ Eşkıyası','infantry',36,56,11,4,6], ['Eşkıya Nişancısı','archer',30,54,10,2,2],
                         ['Atlı Eşkıya','cavalry',44,92,13,5,2]],
                leader: ['Eşkıya Reisi','infantry',75,62,18,7] },
    wolf:     { name: 'Kurt Sürüsü', color: '#9aa4b2', icon: 'wolf', min: 6, max: 14, speedMult: 1.25, beast: true,
                lore: '"Uluma çok yakından geliyor. Sürü sizi çoktan çevirmiş."',
                battle: [['Kurt','infantry',20,104,8,0,8], ['Yaşlı Kurt','infantry',30,96,10,1,2]],
                leader: ['Alfa Kurt','infantry',55,112,15,2] }
};

// --- STATE ---
const state = {
    npcParties: [],
    timeScale: 1,            // zaman akışı çarpanı (üst çubuktaki takvim rozetinden 0.5/1/2)
    activeTournaments: {},   // { cityId: true }
    mercPools: {},           // { locId: { day, list:[{name, level, count}] } }
    encounterCooldown: 0,
    player: {
        name: 'Maceracı',
        money: 250,
        renown: 0,
        rightToRule: 0,
        wageDebt: 0,          // ödenemeyen maaş birikir
        wageLateHours: 0,     // kaç saattir gecikmiş (saat başı -1 moral)
        partyCapacity: 50,
        party: [],
        inventory: [{...ITEMS.wheat, qty:3}],
        equipment: { weapon: null, armor: null, horse: null },
        x: 4500, y: 4500,
        targetLocation: null,
        status: 'idle',
        speed: 50,
        // str/agi/int/cha/vit HEDEF değerdir; puan dağıtınca hedef büyür.
        // eff.* efektif (gerçekten işleyen) değerdir, ilgili eylemi yaptıkça hedefe yaklaşır.
        stats: { level:1, xp:0, xpNext:100, hp:50, maxHp:50, str:10, agi:10, int:10, cha:10, vit:10,
                 eff: { str:10, agi:10, int:10, cha:10, vit:10 }, attributePoints: 5 },
        proficiencies: {
            oneHanded: { level: 1, xp: 0, next: 100, focus: 0 },
            twoHanded: { level: 1, xp: 0, next: 100, focus: 0 },
            polearm:   { level: 1, xp: 0, next: 100, focus: 0 },
            bow:       { level: 1, xp: 0, next: 100, focus: 0 },
            riding:    { level: 1, xp: 0, next: 100, focus: 0 },
            athletics: { level: 1, xp: 0, next: 100, focus: 0 },
            leadership:{ level: 1, xp: 0, next: 100, focus: 0 },
            persuasion:{ level: 1, xp: 0, next: 100, focus: 0 },
            surgery:   { level: 1, xp: 0, next: 100, focus: 0 },
            prisonerMgmt:{ level: 1, xp: 0, next: 100, focus: 0 },
            pathfinding:{ level: 1, xp: 0, next: 100, focus: 0 },
            spotting:  { level: 1, xp: 0, next: 100, focus: 0 },
            trade:     { level: 1, xp: 0, next: 100, focus: 0 },
            looting:   { level: 1, xp: 0, next: 100, focus: 0 },
            trainer:   { level: 1, xp: 0, next: 100, focus: 0 }
        },
        skills: { fastRun: 0, wideSwing: 0, fastArrow: 0, homingArrow: 0 },
        attackAngle: 30, // Base 30 degrees
        spouse: null,
        vassalOf: null,
        currentSiege: null,
        currentEncounterNpcId: null,
        prisoner: null,  // { npcId, daysLeft, ransomRequired, ransomRefusals }
        morale: 60,      // parti morali 0-100
        moraleInfo: {},  // son moral hesabının kalemleri (grup ekranında gösterilir)
        prisoners: [],   // ele geçirilen esirler: { id, name, level, type } | soylu: { id, name, noble, lordId, faction, ransom }
        quests: [],
        poems: [],
    },
    time: { day:1, hour:8 },

    // --- Soylu / görev sistemi ---
    relations: {},        // lordId -> -100..100
    affection: {},        // ladyId -> 0..100
    rivals: {},           // ladyId -> { lordId, affection }
    knownLocations: {},   // lordId -> { x, y, radius, day, name, live }
    questCooldown: {},    // lordId -> gün
    smallTalkDay: {}, giftDay: {}, visitDay: {}, poemsRead: {}, dedicatedTo: [],
    pendingQuest: null, questOffers: {}, dowryOffer: null, betrothed: null, pendingWedding: null,
    pendingDedication: false, duel: null,
    feast: null, scheduledFeasts: [], nextFeastDay: 8,
    explored: '',        // keşfedilen harita: 90x90 kaba ızgara, '0'/'1' dizesi
};

// --- INPUT ---
const Input = {
    keys: {},
    mouse: { x: 0, y: 0 },
    init() {
        window.addEventListener('keydown', e => {
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            this.keys[e.key.toLowerCase()] = true;
            if(e.key === ' ') e.preventDefault(); // Boşluk ile kaymayı engelle
            // Menü kısayolları (Warband tarzı) — savaş/turnuva/modal açıkken çalışmaz
            if(!Battle.active && !TournamentMinigame.active && !e.ctrlKey && !e.metaKey &&
               document.getElementById('modal-overlay').classList.contains('hidden') &&
               document.getElementById('main-ui').classList.contains('active')) {
                let scr = { m:'map', c:'character', p:'party', i:'inventory', q:'quests' }[e.key.toLowerCase()];
                if(scr) Game.showScreen(scr);
                // Esc her ekrandan haritaya döner
                else if(e.key === 'Escape') Game.showScreen('map');
                // Boşluk kamerayı oyuncuya geri getirir (harita kenardan kaydırılmışsa)
                else if(e.key === ' ' && document.getElementById('map-view').classList.contains('active')) Game.centerOnPlayer();
            }
        });
        window.addEventListener('keyup', e => { 
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if(e.key) Input.keys[e.key.toLowerCase()] = false; 
        });
        window.addEventListener('blur', () => {
            Input.keys = {}; // Pencere odağı kaybolduğunda tuşların kilitlenmesini engelle
        });
        window.addEventListener('mousemove', e => {
            Input.mouse.clientX = e.clientX;
            Input.mouse.clientY = e.clientY;
            
            let canvas = document.getElementById('battle-canvas');
            if(canvas && canvas.offsetParent !== null) { // Only track if visible
                let rect = canvas.getBoundingClientRect();
                Input.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
                Input.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
            }
        });
        window.addEventListener('wheel', e => {
            if (document.getElementById('map-view').classList.contains('active')) {
                Game.camera.targetZoom -= e.deltaY * 0.001;
                Game.camera.targetZoom = Math.max(0.4, Math.min(Game.camera.targetZoom, 3.0));
            }
        });
    }
};

// --- GAME ---
const Game = {
    mapCanvas: null,
    ctx: null,
    exploredCanvas: null,
    exploredCtx: null,
    // Sis 9000x9000 tuvalde tutuluyor; kaydedilebilmesi için aynı bilgi
    // 100 birimlik kaba bir ızgarada da tutulur (90x90 = 8100 hücre).
    FOG_CELL: 100,
    FOG_N: 90,
    exploredGrid: null,
    camera: { x: 0, y: 0, zoom: 0.8, targetZoom: 0.8, offsetX: 0, offsetY: 0 },

    getMapRadius(x, y) {
        let dx = x - 4500;
        let dy = y - 4500;
        let angle = Math.atan2(dy, dx);
        return 4000 + Math.sin(angle * 6) * 300 + Math.cos(angle * 11) * 200 + Math.sin(angle * 3) * 400;
    },

    clampToMap(obj) {
        let dx = obj.x - 4500;
        let dy = obj.y - 4500;
        let dist = Math.sqrt(dx*dx + dy*dy);
        let maxR = this.getMapRadius(obj.x, obj.y);
        if(dist > maxR - 50) { // Keep slightly inside
            let angle = Math.atan2(dy, dx);
            obj.x = 4500 + Math.cos(angle) * (maxR - 50);
            obj.y = 4500 + Math.sin(angle) * (maxR - 50);
        }
    },

    init() {
        Input.init();
        this.initTooltipClamp();
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        this.mapCanvas = document.getElementById('map-canvas');
        // Opak tuval: deniz her kareyi baştan sona dolduruyor, alfa kanalına gerek yok.
        // alpha:false ile tarayıcı harmanlama geçişini atlar (zayıf GPU'da belirgin).
        this.ctx = this.mapCanvas.getContext('2d', { alpha: false });
        this.mapCanvas.addEventListener('mousemove', e => this.handleMapHover(e));
        this.mapCanvas.addEventListener('click', e => this.handleMapClick(e));
        document.getElementById('modal-overlay').addEventListener('click', e => {
            // Karşılaşma (savaş/teslim ol) modali açıkken dışa tıklayarak kapanmasın
            if(e.target.id === 'modal-overlay' && !state.player.currentEncounterNpcId) this.closeModal();
        });
        window.addEventListener('resize', () => this.resizeCanvases());

        // Köy gönüllülerini ilklendir
        LOCATIONS.forEach(loc => {
            // Refah tek sayıdır: garnizonu, gönüllü havuzunu ve pazar fiyatını besler
            loc.prosperity = 35 + Math.floor(Math.random()*40)
                           + (loc.type === 'city' ? 15 : loc.type === 'castle' ? 5 : 0);
            if(loc.type === 'village' || loc.type === 'city') {
                loc.volunteersAvailable = 1 + Math.floor(Math.random()*4);
                if(loc.type === 'city') loc.volunteersAvailable += 3; // Cities have more
            }
        });

        // LOCATIONS Dağıtımı (Kıtanın her yerine yayalım)
        let angleOffset = 0;
        let factionIds = Object.keys(FACTIONS);
        let quadrantAngle = (Math.PI * 2) / factionIds.length;
        
        factionIds.forEach((fid, index) => {
            let baseAngle = index * quadrantAngle;
            let factionLocs = LOCATIONS.filter(l => l.faction === fid);
            factionLocs.forEach((loc, i) => {
                let a = baseAngle + (Math.random() * quadrantAngle * 0.8) + (quadrantAngle * 0.1);
                let dist = 1000 + Math.random() * 2500;
                loc.x = 4500 + Math.cos(a) * dist;
                loc.y = 4500 + Math.sin(a) * dist;
            });
        });

        // Kıtayı ve Sıradağları oluştur
        if(!state.mapBorder) {
            state.mapBorder = [];
            for(let a=0; a < Math.PI*2; a += 0.02) {
                let maxR = 4000 + Math.sin(a * 6) * 300 + Math.cos(a * 11) * 200 + Math.sin(a * 3) * 400;
                maxR += (Math.random() - 0.5) * 50; // Jitter
                state.mapBorder.push({ x: 4500 + Math.cos(a)*maxR, y: 4500 + Math.sin(a)*maxR });
            }
        }

        this.buildRoads();
        this.spawnNPCs();
    },

    // Tüm yerleşkeleri birbirine bağlayan Minimum Spanning Tree tarzı yol ağı.
    // Yerleşim koordinatları değiştiğinde (eski kayıt yüklemesi) yeniden çağrılır.
    buildRoads() {
        state.roads = [];
        let connected = [LOCATIONS[0]];
        let unconnected = LOCATIONS.slice(1);

        while(unconnected.length > 0) {
            let bestDist = Infinity;
            let bestConn = null;
            let bestUnconnIdx = -1;

            for(let c of connected) {
                for(let i=0; i<unconnected.length; i++) {
                    let u = unconnected[i];
                    let d = Math.sqrt(Math.pow(c.x-u.x,2)+Math.pow(c.y-u.y,2));
                    if(d < bestDist) {
                        bestDist = d;
                        bestConn = c;
                        bestUnconnIdx = i;
                    }
                }
            }

            let u = unconnected[bestUnconnIdx];
            state.roads.push({ x1: bestConn.x, y1: bestConn.y, x2: u.x, y2: u.y });
            connected.push(u);
            unconnected.splice(bestUnconnIdx, 1);
        }
    },

    // Haritadaki düşman çeşitleri: her biri savaşta farklı birim karışımı ve davranış
    // (BAND_KINDS.battle -> Battle.start içindeki birim üretimi)
    spawnBand(kind) {
        let k = BAND_KINDS[kind];
        let size = k.min + Math.floor(Math.random() * (k.max - k.min + 1));
        let npc = this.createNPC(k.name, 'bandit', size, k.color, null, 1);
        npc.band = kind;
        npc.speed = Math.round(npc.speed * (k.speedMult || 1));
        state.npcParties.push(npc);
        return npc;
    },
    // Gün ilerledikçe daha zorlu çeteler ortaya çıkar
    randomBandKind() {
        let pool = ['bandit', 'bandit', 'wolf', 'forest'];
        if(state.time.day >= 20) pool.push('mountain');
        return pool[Math.floor(Math.random() * pool.length)];
    },

    spawnNPCs() {
        for(let i = 0; i < 8; i++) this.spawnBand('bandit');
        for(let i = 0; i < 3; i++) this.spawnBand('wolf');
        for(let i = 0; i < 2; i++) this.spawnBand('forest');
        // Her soylunun haritada gezen kendi partisi var
        LORDS.forEach(l => {
            let size = l.rank === 'king' ? 100 : l.rank === 'vizier' ? 50 : 35;
            let npc = this.createNPC(l.name, l.rank, size, FACTIONS[l.faction].color, l.faction, 1);
            npc.lordId = l.id;
            let home = LOCATIONS.find(x => x.id === l.homeLocId);
            if(home) { npc.x = home.x; npc.y = home.y; npc.targetX = home.x; npc.targetY = home.y; }
            state.npcParties.push(npc);
        });
        Nobles.initRivals();
    },

    createNPC(name, type, size, color, faction = null, level = 1) {
        let a = Math.random() * Math.PI * 2;
        let r = Math.random() * 3800; // Harita içinde rastgele
        let x = 4500 + Math.cos(a)*r, y = 4500 + Math.sin(a)*r;
        return {
            id: 'npc_' + Math.random().toString(36).substr(2,9),
            name, type, faction, level,
            x, y, targetX: x, targetY: y,
            speed: type === 'bandit' ? 66 : (type === 'king' ? 70 : (type === 'vizier' ? 84 : 84)),
            size, color
        };
    },

    startGame() {
        const n = document.getElementById('char-name').value.trim();
        if(n) state.player.name = n;
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('main-ui').classList.add('active');
        this.resizeCanvases();
        
        // Başlangıçta kamerayı anında oyuncuya odakla
        this.camera.x = state.player.x;
        this.camera.y = state.player.y;
        this.camera.offsetX = 0;
        this.camera.offsetY = 0;

        this.updateTopBar();
        this.startGameLoop();
    },

    resizeCanvases() {
        // Gizli bir tuvalin ebeveyni 0 ölçü verir; o değeri yazmak tuvali
        // kalıcı olarak 0x0 bırakır. Sadece gerçek bir ölçü varken yaz.
        let fit = (canvas) => {
            let w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
            if(w > 0 && h > 0) { canvas.width = w; canvas.height = h; }
        };
        fit(this.mapCanvas);
        fit(document.getElementById('battle-canvas'));

        if(!this.exploredCanvas) {
            this.exploredCanvas = document.createElement('canvas');
            this.exploredCanvas.width = 9000;
            this.exploredCanvas.height = 9000;
            this.exploredCtx = this.exploredCanvas.getContext('2d');
            this.exploredGrid = new Uint8Array(this.FOG_N * this.FOG_N);
            this.repaintFog();
        }
    },

    // Kayıttan gelen ızgarayı tuvale uygular
    loadExplored() {
        let n = this.FOG_N, want = n * n, str = state.explored || '';
        this.exploredGrid = new Uint8Array(want);
        if(str.length === want) {
            for(let i = 0; i < want; i++) if(str[i] === '1') this.exploredGrid[i] = 1;
        }
        this.repaintFog();
    },

    // Sis tuvalini ızgaradan yeniden üretir (yeni oyunda ızgara boş = her yer sisli)
    repaintFog() {
        let c = this.FOG_CELL, n = this.FOG_N, g = this.exploredGrid;
        this.exploredCtx.globalCompositeOperation = 'source-over';
        this.exploredCtx.fillStyle = 'black';
        this.exploredCtx.fillRect(0, 0, 9000, 9000);
        this.exploredCtx.globalCompositeOperation = 'destination-out';
        for(let gy = 0; gy < n; gy++) for(let gx = 0; gx < n; gx++) {
            if(g[gy*n + gx]) this.exploredCtx.fillRect(gx*c, gy*c, c, c);
        }
        this.exploredCtx.globalCompositeOperation = 'source-over';
    },

    // Görüş çemberinin içinde kalan ızgara hücrelerini keşfedilmiş işaretle
    markExplored(x, y, r) {
        let c = this.FOG_CELL, n = this.FOG_N, g = this.exploredGrid;
        if(!g) return;
        let gx0 = Math.max(0, Math.floor((x - r) / c)), gx1 = Math.min(n-1, Math.floor((x + r) / c));
        let gy0 = Math.max(0, Math.floor((y - r) / c)), gy1 = Math.min(n-1, Math.floor((y + r) / c));
        for(let gy = gy0; gy <= gy1; gy++) for(let gx = gx0; gx <= gx1; gx++) {
            let dx = (gx + 0.5) * c - x, dy = (gy + 0.5) * c - y;
            if(dx*dx + dy*dy <= r*r) g[gy*n + gx] = 1;
        }
    },

    // 144/180 Hz ekranda rAF kare başına 5-7 ms bütçe verir; oyun 60 fps'te de
    // aynı görünür ama GPU'ya 2-3 kat iş çıkar ve kaçan kareler takılma olarak
    // hissedilir. Fazla kareler atlanır.
    //
    // Sabit ms eşiği olmaz: 90 Hz'te her ikinci kareyi atlamak 45 fps eder.
    // Onun yerine tazeleme hızı ölçülüp 60'ın altına düşürmeyen en büyük tam
    // bölen seçilir -> 60:60, 75:75, 90:90, 120:60, 144:72, 165:82, 180:60, 240:60.
    _prevT: 0, _minStep: Infinity, _frameNo: 0,
    skipFrame(t) {
        let d = t - this._prevT;
        this._prevT = t;
        // d > 1: iki döngü aynı karede çağırırsa delta ~0 olur ve bölen patlar.
        // Gerçek hiçbir ekran 1000 Hz'in üstünde değil, alt sınır güvenli.
        if(d > 1 && d < this._minStep) this._minStep = d;   // min: tek tük takılmayı eler
        let n = Math.max(1, Math.floor(1000 / 60 / this._minStep + 0.01));
        return (++this._frameNo % n) !== 0;
    },

    startGameLoop() {
        // Çift döngü koruması: yükleme/yeniden başlatma her seferinde bir rAF
        // döngüsü daha eklerse zaman ve hareket kat kat hızlanır.
        if(this._loopId) cancelAnimationFrame(this._loopId);
        let lastTime = performance.now();
        const loop = (t) => {
            if(this.skipFrame(t)) { this._loopId = requestAnimationFrame(loop); return; }
            let dt = (t - lastTime) / 1000;
            if(dt > 0.1) dt = 0.1;
            lastTime = t;
            this.update(dt);
            this.renderMap();
            this._loopId = requestAnimationFrame(loop);
        };
        this._loopId = requestAnimationFrame(loop);
    },

    // --- UPDATE ---
    // --- NİTELİKLER: hedef / efektif ---
    // Puan vermek niteliği anında açmaz; bir HEDEF koyar. Efektif değer o
    // niteliğe uygun oynadıkça hedefe yaklaşır: çeviklik yol katederek, güç
    // kılıç sallayarak, zekâ konuşarak, liderlik kalabalık yöneterek,
    // dirayet dayak yiyerek. Fark büyükken hızlı, hedefe yaklaşırken yavaş.
    ATTRS: {
        str: { name: 'Güç',      icon: '💪', how: 'Yakın dövüşte isabetli vuruş' },
        agi: { name: 'Çeviklik', icon: '🏃', how: 'Haritada yol katetmek' },
        int: { name: 'Zekâ',     icon: '🧠', how: 'Soylularla konuşmak, görev almak' },
        cha: { name: 'Liderlik', icon: '👑', how: 'Kalabalık bir grubu yönetmek' },
        vit: { name: 'Dirayet',  icon: '🫀', how: 'Savaşta hasar yemek ve ayakta kalmak' }
    },
    // Ölçüldü: 5 puanlık farkı kapatmak ~38 "kayda değer eylem" alıyor —
    // çeviklikte ~11 harita geçişi, güçte ~8 savaş, liderlikte ~38 gün.
    ATTR_RATE: 0.08,

    // Efektif değer. Eski kayıtta eff yoksa hedefe eşitlenir (geriye dönük).
    attr(k) {
        let s = state.player.stats;
        if(!s.eff) s.eff = {};
        if(s.eff[k] === undefined) s.eff[k] = s[k] || 10;
        return s.eff[k];
    },
    attrInt(k) { return Math.floor(this.attr(k)); },

    // w: eylemin ağırlığı (1 ≈ "kayda değer bir eylem").
    trainAttr(k, w) {
        let s = state.player.stats;
        let cur = this.attr(k), gap = (s[k] || 10) - cur;
        if(gap <= 0) { s.eff[k] = s[k] || 10; return; }
        // 0.25 tabanı olmasa hedefe asla ulaşılmazdı (fark küçüldükçe kazanç 0'a giderdi).
        s.eff[k] = Math.min(s[k], cur + w * this.ATTR_RATE * (0.25 + gap));
    },

    // Dirayet: can yenilenmesi 5'lik sıçramalarla değil, saatte 1 can adımlarıyla.
    hpRegenHours() { return Math.max(1, 8 - Math.floor((this.attr('vit') - 10) / 2)); },

    // Yeni karakter 12 kişiyle sınırlı; ordu nitelik, yetenek VE namla büyür.
    // Nam da sayılır çünkü kalabalık asker tanınmış bir komutanın peşinden gider.
    getPartyCapacity() {
        let cha = this.attr('cha');
        let leadership = state.player.proficiencies.leadership ? state.player.proficiencies.leadership.level : 1;
        return 12 + (cha - 10) * 3 + (leadership - 1) * 4 + Math.floor((state.player.renown || 0) / 40);
    },

    // Ödenmemiş maaş her saat 1 moral götürür ve borç birikir. Para geldiği anda
    // otomatik ödenir; sayaç ancak borç tamamen kapanınca sıfırlanır.
    // Can 5'lik sıçramalarla değil, Dirayet'in belirlediği aralıkta 1'er dolar.
    // Üst sınır açık: maxHp. Esaretteyken de işler, hücrede de iyileşirsin.
    regenTick() {
        let s2 = state.player.stats;
        s2.regenAcc = (s2.regenAcc || 0) + 1;
        if(s2.regenAcc < this.hpRegenHours()) return;
        s2.regenAcc = 0;
        if(s2.hp < s2.maxHp) s2.hp = Math.min(s2.maxHp, s2.hp + 1);
    },

    wageDebtTick() {
        let p = state.player;
        if(!(p.wageDebt > 0)) { p.wageLateHours = 0; return; }
        if(p.money >= p.wageDebt) {
            p.money -= p.wageDebt;
            alert(`💰 Birikmiş <b>${Math.ceil(p.wageDebt)} dinar</b> maaş borcu ödendi. Askerler homurdanmayı bıraktı.`);
            p.wageDebt = 0; p.wageLateHours = 0;
            return;
        }
        p.wageLateHours = (p.wageLateHours || 0) + 1;
        p.morale = Math.max(0, this.morale() - 1);
    },

    // Ormandaki av gözden kaçar: ağaçların arasındaki çete normal görüşle değil,
    // ancak yakınına sokulunca ya da iz sürerek (Gözcülük / Yol Bulma) fark edilir.
    spotRange(npc) {
        let vis = this.getVisibility();
        if(this.getTerrainInfo(npc.x, npc.y).name !== 'Orman') return vis;
        let track = (this.profLvl('spotting') - 1) * 0.03 + (this.profLvl('pathfinding') - 1) * 0.02;
        return vis * Math.min(0.9, 0.25 + track);
    },
    canSee(npc) { return this.dist(npc, state.player) <= this.spotRange(npc); },

    getTerrainMultiplier(x, y) { return this.getTerrainInfo(x, y).mult; },

    // Arazi hem hız çarpanını hem de künyede yazacak adı verir — tek kaynak
    getTerrainInfo(x, y) {
        let mult = 1.0, name = 'Düzlük', icon = '🌾';
        for(let f of FORESTS) {
            let dx = x - f.x, dy = y - f.y;
            if(Math.sqrt(dx*dx + dy*dy) <= f.radius) {
                mult *= 0.8; // Ormanda %20 yavaşla
                name = 'Orman'; icon = '🌲';
                break;
            }
        }
        for(let r of RIVERS) {
            let A = x - r.x1, B = y - r.y1;
            let C = r.x2 - r.x1, D = r.y2 - r.y1;
            let dot = A * C + B * D;
            let len_sq = C * C + D * D;
            let param = -1;
            if (len_sq != 0) param = dot / len_sq;
            let xx, yy;
            if (param < 0) { xx = r.x1; yy = r.y1; }
            else if (param > 1) { xx = r.x2; yy = r.y2; }
            else { xx = r.x1 + param * C; yy = r.y1 + param * D; }
            let dx = x - xx, dy = y - yy;
            if(Math.sqrt(dx * dx + dy * dy) <= r.width / 2) {
                mult = 0.5; // Nehirde yavaşla
                name = 'Nehir Geçidi'; icon = '🌊';
                break;
            }
        }
        if(state.roads) {
            for(let r of state.roads) {
                let A = x - r.x1, B = y - r.y1;
                let C = r.x2 - r.x1, D = r.y2 - r.y1;
                let dot = A * C + B * D;
                let len_sq = C * C + D * D;
                let param = -1;
                if (len_sq != 0) param = dot / len_sq;
                let xx, yy;
                if (param < 0) { xx = r.x1; yy = r.y1; }
                else if (param > 1) { xx = r.x2; yy = r.y2; }
                else { xx = r.x1 + param * C; yy = r.y1 + param * D; }
                let dx = x - xx, dy = y - yy;
                if(Math.sqrt(dx * dx + dy * dy) <= 22.5) {
                    mult *= 1.1; // Yolda %10 hız artışı
                    if(name === 'Düzlük') { name = 'Yol'; icon = '🛣️'; }
                    break;
                }
            }
        }
        return { mult, name, icon };
    },

    // Grubun sınıf dağılımı — hem harita künyesi hem atlı oranı için
    // Bir grup üyesinin savaş/ekran verisi tek yerden gelir: yoldaşlar ve eş
    // TROOP_TYPES'ta yok, her çağıran kendi varsayılanını uyduruyordu.
    troopStats(t) {
        if(t.isCompanion) {
            let c = COMPANIONS.find(x => x.id === t.companionId) || {};
            return { hp: 55, speed: c.troopType === 'cavalry' ? 90 : 68, attack: 14, defense: 6,
                     type: c.troopType || 'infantry', icon: c.icon || '🎖️' };
        }
        if(t.isSpouse) return { hp: 45, speed: 70, attack: 10, defense: 4, type: 'infantry', icon: '💍' };
        return TROOP_TYPES[t.name] || { hp: 30, speed: 60, attack: 8, defense: 0, type: 'infantry', icon: '🪖' };
    },

    getPartyComposition() {
        let c = { infantry: 0, archer: 0, cavalry: 0 };
        state.player.party.forEach(t => { c[this.troopStats(t).type]++; });
        return c;
    },

    // Warband'da harita hızını en çok grubun atlı oranı belirler
    getMountedRatio() {
        let total = state.player.party.length + 1;
        return (this.getPartyComposition().cavalry + (state.player.equipment.horse ? 1 : 0)) / total;
    },

    isNight() { let h = state.time.hour; return h < 6 || h >= 20; },

    // Günün vakti: yalnızca ad/ikon (saat rozeti). Harita tonu ayrı ve kademeli
    // hesaplanır — bkz. dayTint()/nightGlow().
    getDayPart() {
        let h = state.time.hour;
        if(h < 5)  return { key: 'night',   name: 'Gece',       icon: '🌙' };
        if(h < 8)  return { key: 'dawn',    name: 'Şafak',      icon: '🌅' };
        if(h < 11) return { key: 'morning', name: 'Sabah',      icon: '🌄' };
        if(h < 15) return { key: 'day',     name: 'Öğle',       icon: '🌞' };
        if(h < 18) return { key: 'noon',    name: 'İkindi',     icon: '🌇' };
        if(h < 20) return { key: 'dusk',    name: 'Gün Batımı', icon: '🌆' };
        return { key: 'night', name: 'Gece', icon: '🌙' };
    },

    // Harita tonu saat başında sıçramaz: anahtar saatler arasında lineer geçer.
    // [saat, r, g, b, alfa]
    DAY_TINTS: [
        [0,   12, 20, 52, 0.46],
        [4,   12, 20, 52, 0.42],
        [6,   74, 44, 34, 0.30],   // şafak sökerken sıcak ton
        [9,    0,  0,  0, 0.00],   // sabah aydınlığı
        [16,   0,  0,  0, 0.00],   // ikindiye kadar tonsuz
        [19, 112, 54, 22, 0.30],   // gün batımı
        [21,  30, 34, 70, 0.38],   // akşam karanlığı
        [24,  12, 20, 52, 0.46]
    ],
    dayTint() {
        let h = ((state.time.hour % 24) + 24) % 24, k = this.DAY_TINTS;
        let i = 0;
        while(i < k.length - 2 && h >= k[i + 1][0]) i++;
        let a = k[i], b = k[i + 1];
        let t = (h - a[0]) / (b[0] - a[0]);
        let v = j => a[j] + (b[j] - a[j]) * t;
        let alpha = v(4);
        if(alpha < 0.015) return null;
        return `rgba(${Math.round(v(1))},${Math.round(v(2))},${Math.round(v(3))},${alpha.toFixed(3)})`;
    },
    // Yerleşimlerdeki ocak ışığı da anahtarla yanıp sönmez, akşam yavaşça güçlenir
    nightGlow() {
        let h = ((state.time.hour % 24) + 24) % 24;
        if(h >= 21 || h < 5) return 1;
        if(h < 7)  return (7 - h) / 2;
        if(h > 19) return (h - 19) / 2;
        return 0;
    },

    getPlayerSpeed() {
        // Küçük grup çevik, kalabalık ordu ağır ilerler (atlı oranı cezayı hafifletir)
        let size = state.player.party.length + 1;
        let speedBonus = 0;
        if(size <= 1) speedBonus = 0.5;
        else if(size <= 10) speedBonus = 0.5 - ((size - 1) / 9) * 0.3;
        else if(size <= 20) speedBonus = 0.2 - ((size - 10) / 10) * 0.2;
        else speedBonus = -Math.min(0.45, (size - 20) * 0.01);

        let base = state.player.equipment.horse ? 105 : 66;
        let agiBonus = this.attr('agi') * 1.5;
        let mountBonus = this.getMountedRatio() * 0.35; // atlı oranı
        let nightMult = this.isNight() ? 0.85 : 1;      // gece yavaş yol alınır
        let terrain = this.getTerrainInfo(state.player.x, state.player.y);
        let pathMult = 1 + (this.profLvl('pathfinding') - 1) * 0.02;  // Yol Bulma yeteneği

        return {
            value: (base + agiBonus) * (1 + speedBonus + mountBonus) * terrain.mult * nightMult * pathMult,
            base, agiBonus,
            partyMult: speedBonus,
            mountBonus,
            nightMult,
            pathMult,
            terrainMult: terrain.mult,
            terrain
        };
    },

    updateSpeedUI(spdData) {
        let speedEl = document.getElementById('ui-speed');
        if(!speedEl) return;
        speedEl.innerText = spdData.value.toFixed(0);

        let mounted = !!state.player.equipment.horse;
        let ico = document.getElementById('ui-speed-ico');
        if(ico) ico.innerText = mounted ? '🐎' : '🥾';
        let mode = document.getElementById('ui-speed-mode');
        if(mode) mode.innerText = mounted ? 'atlı' : 'yaya';

        let row = (label, val, good) =>
            `<div style="display:flex;justify-content:space-between;gap:1.2rem">
                <span>${label}</span>
                <span style="color:${good ? 'var(--success)' : 'var(--danger)'}">${val}</span>
             </div>`;

        this.setHtml('ui-speed-breakdown', `
            <b style="font-family:Cinzel,serif">Yol Alma Hızı</b>
            <hr style="border:0;border-top:1px solid rgba(212,175,55,.4);margin:5px 0">
            ${row(`Temel (${mounted ? 'atlı' : 'yaya'})`, spdData.base, true)}
            ${row('Çeviklik', '+' + spdData.agiBonus.toFixed(1), true)}
            ${row('Grup büyüklüğü', (spdData.partyMult >= 0 ? '+' : '') + '%' + (spdData.partyMult*100).toFixed(0), spdData.partyMult >= 0)}
            ${row('Atlı oranı', '+%' + (spdData.mountBonus*100).toFixed(0), true)}
            ${row(`Arazi (${spdData.terrain.name})`, (spdData.terrainMult >= 1 ? '+' : '') + '%' + ((spdData.terrainMult-1)*100).toFixed(0), spdData.terrainMult >= 1)}
            ${spdData.nightMult < 1 ? row('Gece yürüyüşü', '-%15', false) : ''}
            ${spdData.pathMult > 1 ? row('Yol Bulma', '+%' + ((spdData.pathMult-1)*100).toFixed(0), true) : ''}
            <hr style="border:0;border-top:1px solid rgba(212,175,55,.4);margin:5px 0">
            ${row('<b>Toplam</b>', '<b>' + spdData.value.toFixed(1) + '</b>', true)}
        `);
    },

    getHumorousDialog(type, npc) {
        let p = state.player;
        let day = state.time.day;
        let lastDefeatDaysAgo = p.lastDefeatDay ? (day - p.lastDefeatDay) : 999;
        
        if(type === 'elder') {
            if(p.party.length < 5 && p.stats.level < 5) return `"Şu cılız delikanlıya bakın, Deli Hüsnü'ye söyleyin belki gönüllü olur, bununla giderse biz de kurtuluruz."`;
            if(p.money > 5000) return `"Lordum, şu yaşlıya köydeki fakfakirler için biraz dinar atsanız da ortalık şenlense..."`;
            if(lastDefeatDaysAgo < 3) return `"Duyduğuma göre geçenlerde biri buralarda çapulculardan fena dayak yemiş... Umarım o sen değilsindir yabancı."`;
            return `"Köyümüze hoşgeldin yabancı. Hasat bu aralar fena değil, Deli Hüsnü yine tavukları kovalıyor."`;
        } else if(type === 'lord' || type === 'king' || type === 'vizier') {
            if(p.party.length < 10) return `"Hah! Bu çapulcu sürüsüyle mi karşıma çıkıyorsun? Seni ezip geçeceğim!"`;
            if(lastDefeatDaysAgo < 3) return `"Daha dünün dayak yemiş eziği gelmiş kafa tutuyor... Askerler, şunların işini bitirin!"`;
            return `"Kılıcımın tadına bakma vakti geldi. Teslim ol ya da öl!"`;
        } else if(type === 'bandit') {
            let band = npc && npc.band ? BAND_KINDS[npc.band] : null;
            if(band && band.beast) return band.lore;
            if(p.party.length > 50) return `"Aman abi, biz kendi halimizde garip çapulcularız... (Ama yine de saldırırlar!)"`;
            if(band && band.lore && npc.band !== 'bandit') return band.lore;
            return `"Ya paranı, ya canını! Gerçi üstündekiler beş para etmez ama..."`;
        }
        return `"Sana nasıl yardım edebilirim?"`;
    },

    update(dt) {
        if (Battle.active || TournamentMinigame.active) return;
        
        // Fare ile Ekran Kaydırma (Edge Panning)
        let edgeMargin = 40;
        let panSpeed = 600 * dt / this.camera.zoom;
        let mx = Input.mouse.clientX;
        let my = Input.mouse.clientY;
        
        if (document.getElementById('map-view').classList.contains('active') && mx !== undefined) {
            let rect = this.mapCanvas.getBoundingClientRect();
            if (mx >= rect.left && mx <= rect.right && my >= rect.top && my <= rect.bottom) {
                let innerX = mx - rect.left;
                let innerY = my - rect.top;
                
                if (innerX < edgeMargin) this.camera.offsetX -= panSpeed;
                else if (innerX > rect.width - edgeMargin) this.camera.offsetX += panSpeed;
                
                if (innerY < edgeMargin) this.camera.offsetY -= panSpeed;
                else if (innerY > rect.height - edgeMargin) this.camera.offsetY += panSpeed;
            }
        }

        // Smooth Zoom ve Camera Follow
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 8 * dt;
        let targetCamX = state.player.x + this.camera.offsetX;
        let targetCamY = state.player.y + this.camera.offsetY;
        this.camera.x += (targetCamX - this.camera.x) * 5 * dt;
        this.camera.y += (targetCamY - this.camera.y) * 5 * dt;

        // Klavyeden hareket edilirse kamerayı tekrar oyuncuya kitle (offset'i sıfırla)
        if(Input.keys['w']||Input.keys['arrowup']||Input.keys['s']||Input.keys['arrowdown']||Input.keys['a']||Input.keys['arrowleft']||Input.keys['d']||Input.keys['arrowright']) {
            this.camera.offsetX = 0;
            this.camera.offsetY = 0;
        }

        // Mouse click ile hareket edilirse de kitle
        if(state.player.status === 'moving' && state.player.targetLocation && state.player.targetLocation.name === 'Hedef Bölge') {
            // Eğer oyuncu haritaya tıklayıp gidiyorsa da kamerayı toparla
            // offseti yavaşça sıfıra çekelim
            this.camera.offsetX += (0 - this.camera.offsetX) * 2 * dt;
            this.camera.offsetY += (0 - this.camera.offsetY) * 2 * dt;
        }

        if(state.player.prisoner) {
            state.player.status = 'prisoner';
        }

        let isMapActive = document.getElementById('map-view').classList.contains('active');
        let isModalOpen = !document.getElementById('modal-overlay').classList.contains('hidden');
        let timeFlows = false;
        
        if (isMapActive && !isModalOpen) {
            if (state.player.status === 'moving' || state.player.status === 'prisoner') {
                timeFlows = true;
            }
        }

        if (timeFlows) {
            this.advanceTime(dt * this.timeScale());
            this.updateNPCs(dt);
            if(state.encounterCooldown > 0) state.encounterCooldown -= dt;
        }

        if(state.player.status === 'prisoner') {
            let captor = state.npcParties.find(n => n.id === state.player.prisoner.npcId);
            if(captor) {
                state.player.x = captor.x; state.player.y = captor.y;
            }
            
            // Dinamik kaçış planı ilerlemesi
            if(state.player.prisoner.isPlanning) {
                let currentChance = state.player.prisoner.escapeChance || 0;
                
                if (currentChance < 80) {
                    // Başlangıçta (0'da) ivme = 5.0
                    // 80'e yaklaştıkça ivme = 0.1
                    let planSpeed = 0.1 + ((80 - currentChance) / 80) * 4.9;
                    
                    state.player.prisoner.escapeChance = Math.min(80, currentChance + planSpeed * dt);
                }
                
                let el = document.getElementById('ui-escape-chance');
                if(el) el.innerText = state.player.prisoner.escapeChance.toFixed(1) + '%';
            }
            
            return; // Esir iken başka hiçbir şey yapma
        }

        if(state.player.status === 'moving' && state.player.targetLocation && timeFlows) {
            let target = state.player.targetLocation;
            if(target.isNpc) {
                let liveNpc = state.npcParties.find(n => n.id === target.id);
                if(liveNpc) { target.x = liveNpc.x; target.y = liveNpc.y; }
                else { state.player.status = 'idle'; state.player.targetLocation = null; return; }
            }
            let dx = target.x - state.player.x, dy = target.y - state.player.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if(dist < 15) {
                state.player.x = target.x; state.player.y = target.y;
                state.player.status = 'idle';
                if(target.isNpc) this.triggerEncounter(target);
                else if(target.type) this.enterLocation(target);
            } else {
                let spdData = this.getPlayerSpeed();
                let spd = spdData.value;
                let r = Math.min(spd * dt / dist, 1);
                state.player.x += dx * r; state.player.y += dy * r;
                this.clampToMap(state.player); // Doğal sınırlardan taşmayı engelle
                this.trainAttr('agi', (dist * r) / 1500);   // çeviklik yolda gelişir
                
                // Araziye göre hızın anlık değişebilmesi için UI'ı güncelle
                if(Math.random() < 0.1) { // 60 FPS'te sürekli DOM güncellememek için
                    this.updateSpeedUI(spdData);
                }
            }
        }

        if(this.exploredCtx) {
            this.exploredCtx.globalCompositeOperation = 'destination-out';
            this.exploredCtx.fillStyle = 'rgba(0,0,0,1)';
            this.exploredCtx.beginPath();
            let vis = this.getVisibility();
            let time = performance.now() / 2000;
            for (let a = 0; a < Math.PI * 2; a += 0.1) {
                let r = vis + Math.sin(a * 6 + time) * 24;
                let px = state.player.x + Math.cos(a) * r;
                let py = state.player.y + Math.sin(a) * r;
                if(a === 0) this.exploredCtx.moveTo(px, py);
                else this.exploredCtx.lineTo(px, py);
            }
            this.exploredCtx.closePath();
            this.exploredCtx.fill();
            this.exploredCtx.globalCompositeOperation = 'source-over';
            this.markExplored(state.player.x, state.player.y, vis);
        }

        if(timeFlows) this.checkAmbush(dt);

        // NPC -> player collision
        if(timeFlows && state.encounterCooldown <= 0) {
            for(let npc of state.npcParties) {
                // Dost soylulara çarpmak da bir karşılaşmadır — savaş değil, sohbet
                if(!npc.lordId && !this.isHostile(npc)) continue;
                let d = this.dist(npc, state.player);
                if(d < 24) {
                    state.player.status = 'idle';
                    state.player.targetLocation = null;
                    this.triggerEncounter(npc);
                    break;
                }
            }
        }
    },

    // Ormanda pusu: ağaçların arasında gizlenmiş çete/sürü sen yaklaşınca üstüne atlar.
    // Fark etme şansı Gözcülük + Yol Bulma'ya bağlı; fark edersen normal karşılaşma olur,
    // fark edemezsen savaşa etrafın sarılmış hâlde başlarsın.
    checkAmbush(dt) {
        if(state.player.prisoner || state.encounterCooldown > 0) return;
        if(this.getTerrainInfo(state.player.x, state.player.y).name !== 'Orman') return;
        this._ambushCd = (this._ambushCd || 0) - dt;
        if(this._ambushCd > 0) return;
        this._ambushCd = 1;   // saniyede bir zar atmak yeter

        let lurker = state.npcParties.find(n => n.type === 'bandit'
            && this.dist(n, state.player) < 240
            && this.getTerrainInfo(n.x, n.y).name === 'Orman');
        if(!lurker) return;

        let notice = Math.min(0.9, 0.2 + (this.profLvl('spotting') - 1) * 0.06
                                       + (this.profLvl('pathfinding') - 1) * 0.04);
        let spotted = Math.random() < notice;
        this.addProficiencyXp('spotting', 25);
        state.player.status = 'idle';
        state.player.targetLocation = null;
        this.triggerEncounter(lurker, spotted ? 'spotted' : 'ambush');
    },

    // Hayvan sürüsüne teslim olunmaz — hızın yeterse sıyrılırsın
    fleeEncounter(npcId) {
        let npc = state.npcParties.find(n => n.id === npcId);
        this.closeModal();
        let chance = Math.max(0.15, Math.min(0.85, this.getPlayerSpeed().value / 160));
        if(Math.random() < chance) {
            state.encounterCooldown = 6;
            state.player.status = 'idle'; state.player.targetLocation = null;
            alert(`Sürüyü geride bıraktın. (Kaçış şansı %${Math.round(chance*100)})`);
        } else {
            alert(`Kaçamadın, sürü yolunu kesti! (Kaçış şansı %${Math.round(chance*100)})`);
            Battle.start(npc ? npc.name : 'Kurt Sürüsü', npc ? npc.size : 6);
        }
    },

    isHostile(npc) {
        let ps = state.player.party.length + 1;
        let dx = state.player.x - npc.x, dy = state.player.y - npc.y;
        let dist = Math.sqrt(dx*dx + dy*dy);

        if(npc.type === 'bandit') {
            if(dist < 120) return true; // Dibine girersen affetmez!
            if(ps > npc.size * 1.5) return false; // Biz çok güçlüysek bizden kaçsınlar (agresif olmazlar)
            if(state.time.day <= 14) {
                let hash = parseInt(npc.id.replace('npc_',''), 36) % 100 || 50;
                let aggroThreshold = (state.time.day / 14) * 100;
                if (hash > aggroThreshold) return false;
            }
            return true;
        }
        // Soylular artık konuşulacak kişiler; kavga sadece düşman krallıktaysak.
        if(npc.lordId) {
            if(Nobles.rel(npc.lordId) <= -50) return true;
            if(!state.player.vassalOf || state.player.vassalOf === npc.faction ||
               state.player.vassalOf === 'player_kingdom' || npc.faction === 'player_kingdom') return false;
            return true;
        }
        if(npc.type === 'king' || npc.type === 'vizier' || npc.type === 'lord') {
            if(state.player.stats.level < npc.level - 5 && ps < npc.size / 2) return false; // Güçsüzlere agresif değil
        }
        if((npc.type === 'lord' || npc.type === 'king' || npc.type === 'vizier') && state.player.vassalOf &&
           state.player.vassalOf !== npc.faction &&
           state.player.vassalOf !== 'player_kingdom' &&
           npc.faction !== 'player_kingdom') return true;
        return false;
    },

    updateNPCs(dt) {
        let ps = state.player.party.length + 1;
        state.npcParties.forEach(npc => {
            let dxP = state.player.x - npc.x, dyP = state.player.y - npc.y;
            let dp = Math.sqrt(dxP*dxP + dyP*dyP);
            // Esirken NPC'ler oyuncuyu hedef alıp kilitlenmez (böylece esir alan serbestçe dolaşır)
            let hostile = this.isHostile(npc) && state.player.status !== 'prisoner';

            // Zayıf çete, güçlü orduyu uzaktan görüp kaçar; kovalayan yakından fark eder
            let sense = npc.size > ps ? 360 : 360 + Math.min(640, (ps / Math.max(1, npc.size)) * 240);
            // Kaçış artık düşmanlıktan bağımsız: çete zaten sana saldırmayacak kadar
            // zayıfsa (isHostile false) eskiden hiç kaçmıyor, dolaşmaya devam ediyordu.
            let notices = dp < sense && (hostile || npc.type === 'bandit');
            if(notices && (npc.size > ps ? hostile : true)) {
                if(npc.size > ps) {
                    npc.targetX = state.player.x; npc.targetY = state.player.y;
                } else {
                    npc.targetX = npc.x - dxP * 2; npc.targetY = npc.y - dyP * 2;
                }
            } else {
                let dtx = npc.targetX - npc.x, dty = npc.targetY - npc.y;
                if(Math.sqrt(dtx*dtx + dty*dty) < 15) {
                    let a = Math.random() * Math.PI * 2;
                    // Soylular kendi yerleşimlerinin etrafında döner; başkalarını
                    // salonlarında bulabilmek için bu şart.
                    let lord = npc.lordId ? Nobles.lord(npc.lordId) : null;
                    let home = lord ? LOCATIONS.find(x => x.id === lord.homeLocId) : null;
                    if(state.feast && lord && lord.faction === state.feast.faction) {
                        home = LOCATIONS.find(x => x.id === state.feast.locId) || home;
                    }
                    if(home) {
                        let r = Math.random() < 0.45 ? Math.random() * 200 : 300 + Math.random() * 900;
                        npc.targetX = home.x + Math.cos(a)*r;
                        npc.targetY = home.y + Math.sin(a)*r;
                    } else {
                        let r = Math.random() * 3800;
                        npc.targetX = 4500 + Math.cos(a)*r;
                        npc.targetY = 4500 + Math.sin(a)*r;
                    }
                }
            }

            // Kurtlar ağaçların arasından fırlar: ormandaki sürü seni uzaktan sezer
            // ve üstüne atılır (gizlendiği için sen onu ancak dibinde görürsün).
            let burst = 1;
            if((BAND_KINDS[npc.band] || {}).beast && dp < 700 && state.player.status !== 'prisoner'
               && this.getTerrainInfo(npc.x, npc.y).name === 'Orman') {
                npc.targetX = state.player.x; npc.targetY = state.player.y;
                burst = 1.6;
            }

            let dx = npc.targetX - npc.x, dy = npc.targetY - npc.y;
            let d = Math.sqrt(dx*dx+dy*dy);
            if(d > 3) {
                let spd = npc.speed * this.getTerrainMultiplier(npc.x, npc.y) * burst;
                let r = Math.min(spd * dt / d, 1);
                npc.x += dx*r; npc.y += dy*r;
            }
            this.clampToMap(npc); // NPC'lerin dağları aşmasını engelle
        });
    },

    triggerEncounter(npc, ambush) {
        state.encounterCooldown = 2;
        state.ambush = false;   // her karşılaşma bayrağı sıfırlar; pusu dalı geri açar
        state.player.currentEncounterNpcId = npc.id;

        // Düşman olmayan bir soyluya rastladıysak bu bir sohbet fırsatı, savaş değil
        if(npc.lordId && !this.isHostile(npc)) {
            state.player.currentEncounterNpcId = null;
            state.encounterCooldown = 8;
            return Nobles.talk(npc.lordId);
        }

        let dialog = this.getHumorousDialog(npc.type, npc);

        let html = `<h3>${ambush === 'ambush' ? '🌲 Pusu!' : '⚔️ Karşılaşma:'} ${npc.name}</h3>
        <p style="margin-top:0.5rem;">Düşman grup büyüklüğü: <b>${npc.size}</b> kişi</p>
        <p>Senin grubun: <b>${state.player.party.length + 1}</b> kişi</p>`;

        if(ambush === 'ambush') {
            // Fark edemedin: savaş etrafın sarılmış hâlde başlar (Battle.start okur)
            state.ambush = true;
            html += `<p style="color:#e0463a;margin-top:0.5rem">Ağaçların arasından üstünüze
                     atladılar — kaçacak yer yok, adamların dağılmış durumda!</p>`;
        } else if(ambush === 'spotted') {
            html += `<p style="color:#2ecc71;margin-top:0.5rem">Kırılan dalı duydun: pusuyu
                     zamanında fark ettin, seni saramadılar.</p>`;
        }

        if(!ambush && npc.type === 'bandit' && state.time.day <= 14 && Math.random() < 0.25) {
            dialog = `"Şu çaylağa bak patron, kılıcımızı kirletmeye değmez. Yürü git buradan çömez!"`;
            html += `<p><i>${dialog}</i></p>
            <p style="color:#2d2;font-size:0.85rem;margin-top:0.5rem">Çapulcular seninle savaşmaya değmeyeceğini düşünüyor.</p>
            <div style="display:flex;gap:1rem;margin-top:1rem;">
            <button class="btn primary" onclick="Game.closeModal(); state.encounterCooldown = 5;">Uzaklaş</button>
            <button class="btn" style="border-color:#cc0000;color:#cc0000" onclick="Game.closeModal(); Battle.start('${npc.name.replace(/'/g,"\\'")}', ${npc.size}, null, '${npc.faction || ''}')">⚔️ Yine De Savaş!</button>
            </div>`;
        } else {
            html += `<p><i>${dialog}</i></p>
            <p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.5rem">Kaçış yok — savaş ya da teslim ol!</p>
            <div style="display:flex;gap:1rem;margin-top:1rem;">
            <button class="btn primary" onclick="Game.closeModal(); Battle.start('${npc.name.replace(/'/g,"\\'")}', ${npc.size}, null, '${npc.faction || ''}')">⚔️ Savaş!</button>
            ${(BAND_KINDS[npc.band] || {}).beast
                ? `<button class="btn" style="border-color:#cc8800;color:#cc8800" onclick="Game.fleeEncounter('${npc.id}')">🏃 Kaçmayı Dene</button>`
                : `<button class="btn" style="border-color:#cc8800;color:#cc8800" onclick="Game.closeModal(); Game.surrender('${npc.id}', '${npc.name.replace(/'/g,"\\'")}')">🏳️ Teslim Ol</button>`}
            </div>`;
        }
        this.showModal(html);
    },

    surrender(npcId, npcName) {
        state.player.lastDefeatDay = state.time.day;
        // Teslim olmak da yenilgidir: karşındaki ne kadar zayıfsa o kadar nam yakar
        let foe = state.npcParties.find(n => n.id === npcId);
        let renownLost = this.defeatRenown(foe ? foe.size * ((foe.level || 1) + 1) : 0);
        state.player.renown = Math.max(0, state.player.renown - renownLost);
        let daysLost = 3 + Math.floor(Math.random() * 5); // 3-7 gün esir
        let ratio = 0.60 + Math.random() * 0.30; // %60-90 para kaybı
        let moneyLost = Math.floor(state.player.money * ratio);
        state.player.money = Math.max(0, state.player.money - moneyLost);

        // Tüm askerler kaybedilir, esirler serbest kalır
        state.player.party = [];
        state.player.prisoners.filter(p => p.noble).forEach(p => this.respawnLordParty(p));
        state.player.prisoners = [];
        state.player.stats.hp = Math.max(5, Math.floor(state.player.stats.maxHp * 0.3));

        this.beginCaptivity(foe || { id: npcId, name: npcName, size: 0 }, daysLost);
        state.player.currentEncounterNpcId = null;
        state.player.currentSiege = null;

        alert(`Teslim oldun! Tüm birliğini kaybettin ve köle olarak sürükleneceksin.<br>-${moneyLost} Dinar`
            + (renownLost ? `<br>-${renownLost} nam` : ''));
        this.updateTopBar();
    },

    // --- ESARET (tek veri modeli) ---
    // Nerede esir düşersen düş buradan geçer: esir alan parti (haritada hareket eden
    // tek taraf), yanındaki diğer esirler ve kaçış durumu hep burada durur.
    // Kurtuluşa kadar başka hiçbir yerde esaret alanı tutulmaz.
    beginCaptivity(npc, days) {
        let band = npc ? BAND_KINDS[npc.band] : null;
        state.player.prisoner = {
            npcId: npc ? npc.id : null,
            npcName: npc ? npc.name : 'Bilinmeyen',
            troops: npc ? npc.size : 0,          // esir alanın kendi askerleri
            fellows: this.rollFellows(band),     // seninle beraber sürüklenenler
            daysLeft: days,
            ransomRequired: 0.75 + Math.random()*0.15, ransomRefusals: 0,
            escapeChance: 0, isPlanning: false, lastAttemptDay: 0
        };
        state.player.status = 'prisoner';
        state.player.targetLocation = null;   // esirin gideceği yer yok
        this.renderPrisonerUI();
    },
    // Hayvan sürüsü esir tutmaz; çete birkaç talihsizi daha sürüklüyor olabilir
    rollFellows(band) {
        if(band && band.beast) return [];
        let pool = ['Köylü', 'Kervancı', 'Gezgin Tüccar', 'Yaralı Asker', 'Değirmenci', 'Ozan', 'Çırak'];
        let out = [];
        for(let i = Math.floor(Math.random()*4); i > 0; i--) {
            out.push(pool[Math.floor(Math.random()*pool.length)]);
        }
        return out;
    },

    payRansom(amount) {
        if(!state.player.prisoner) return this.closeModal();
        if(state.player.money < amount) {
            // Parası yetmiyorsa elindeki her şeyi alıp salıverirler
            state.player.money = 0;
            this.releaseFromCaptivity('Kesenin dibi göründü. Ellerindeki son dinarı da alıp seni yol kenarına attılar.');
            return;
        }
        state.player.money -= amount;
        this.releaseFromCaptivity(`${amount} Dinar ödedin. Zincirlerin çözüldü.`);
    },

    refuseRansom(ratio) {
        if(!state.player.prisoner) return this.closeModal();
        let p = state.player.prisoner;
        p.ransomRefusals = (p.ransomRefusals || 0) + 1;
        this.closeModal();

        if(p.ransomRefusals >= 3) {
            // Üçüncü retten sonra ellerinde tutmanın anlamı kalmaz
            state.player.money = Math.floor(state.player.money * 0.5);
            this.releaseFromCaptivity('"Bu adamı beslemek fidyesinden pahalıya geliyor." Yarı paranı alıp seni kovdular.');
            return;
        }

        // Ceza: birkaç gün daha + kaçış planı sıfırlanır
        p.daysLeft = 2 + Math.floor(Math.random() * 4);
        p.ransomRequired = Math.min(0.95, (p.ransomRequired || 0.75) + 0.05);
        p.escapeChance = Math.max(0, (p.escapeChance || 0) - 25);
        p.isPlanning = false;
        this.renderPrisonerUI();
        alert(`Reddettin. Bir güzel dayak yedin ve zindana geri atıldın. (${p.daysLeft} gün daha)`);
    },

    releaseFromCaptivity(msg) {
        state.player.prisoner = null;
        state.player.status = 'idle';
        state.encounterCooldown = 5;
        this.closeModal();
        this.renderPrisonerUI();
        this.updateTopBar();
        alert(msg);
    },

    dist(a, b) { return Math.sqrt(Math.pow(a.x-b.x,2)+Math.pow(a.y-b.y,2)); },

    // Bir gün eskiden ~12 sn'de geçiyordu; varsayılan yarıya indi, oyuncu rozetten değiştirebilir
    timeScale() { return state.timeScale || 1; },
    cycleTimeScale() {
        let steps = [0.5, 1, 2];
        let i = steps.indexOf(this.timeScale());
        state.timeScale = steps[(i + 1) % steps.length];
        this.updateTopBar();
    },

    advanceTime(hours) {
        let before = state.time.day * 24 + state.time.hour;
        state.time.hour += hours;
        // Maaş borcu saat saat işler: tek seferlik sabit ceza yerine büyüyen bir
        // baskı. Tam saat sınırlarını sayıyoruz, dt kesirli geldiği için.
        let passed = Math.floor(state.time.day * 24 + state.time.hour) - Math.floor(before);
        for(let i = 0; i < passed; i++) { this.wageDebtTick(); this.regenTick(); }
        while(state.time.hour >= 24) {
            state.time.day++;

        // Gönüllü yenilenmesi (şehirler ve köyler için 2 günde bir)
        LOCATIONS.forEach(loc => {
            if(loc.type === 'village' || loc.type === 'city') {
                // Kısmi alım sonrası (ör. 5'ten 2 kalmış) köy de yenilenebilmeli;
                // eskiden yalnızca tam boşalınca yenileniyordu.
                let full = loc.type === 'city' ? 7 : 5;
                if(loc.volunteersAvailable < full && (state.time.day - (loc.lastRecruitDay || 0) >= 2)) {
                    let fresh = 1 + Math.floor(Math.random()*4) + (loc.type === 'city' ? 3 : 0)
                             + Math.floor((loc.prosperity || 50) / 40);   // zengin yerleşim daha çok gönüllü besler
                    loc.volunteersAvailable = Math.max(loc.volunteersAvailable, fresh);
                }
            }
        });

        state.time.hour -= 24;
            this.dailyUpdate();
        }
        this.updateTopBar();
    },

    dailyUpdate() {
        if(state.player.prisoner) {
            state.player.prisoner.daysLeft--;
            if(state.player.prisoner.daysLeft <= 0) {
                let escapeChance = Math.random();
                if(escapeChance <= 0.40) {
                    Quests.emit('escaped_captivity', { npcId: state.player.prisoner.npcId });
                    state.player.prisoner = null; state.player.status = 'idle'; state.encounterCooldown = 5;
                    this.renderPrisonerUI();
                    alert('Şanslısın! Fırsatını bulup fidye ödemeden kaçmayı başardın!');
                } else {
                    let ratio = state.player.prisoner.ransomRequired;
                    let amount = Math.floor(state.player.money * ratio);
                    this.showModal(`<div style="text-align:center">
                        <h3 style="margin-bottom:1rem;color:#ffaa00">Fidye İsteği</h3>
                        <p style="font-size:1.1rem;margin-bottom:1.5rem">Seni esir edenler özgürlüğün karşılığında senden <b>${amount} Dinar</b> istiyor. Kabul ediyor musun?</p>
                        <div style="display:flex;gap:1rem;justify-content:center;">
                            <button class="btn primary" onclick="Game.payRansom(${amount})">Öde ve Kurtul</button>
                            <button class="btn" style="border-color:#cc0000;color:#cc0000" onclick="Game.refuseRansom(${ratio})">Reddet</button>
                        </div>
                    </div>`);
                }
                this.updateTopBar();
            }
        }

        // Maaş, yemek ve can yenilenmesi yalnızca hür oyuncuya işler; dünyanın
        // geri kalanı (görev süreleri, şölen/düğün günü, rakip talipler, turnuva)
        // esaret sırasında da dönmeli. Eskiden esaret bloğu return ediyordu ve
        // nişanlıyken esir düşenin düğünü hiç kurulmuyordu.
        if(!state.player.prisoner) {
            let up = this.upkeep();
            let totalWage = up.wage;
            let foodRequiredLow = up.foodLow;
            let foodRequiredHigh = up.foodHigh;

            let paid = state.player.money >= totalWage;
            if(paid) state.player.money -= totalWage;
            else state.player.wageDebt = (state.player.wageDebt || 0) + totalWage;   // borç birikir, saat saat morali yer

            this.spoilFood();

            // Yemek Tüketimi
            let lowQualityFoods = ['wheat', 'bread'];
            let highQualityFoods = ['meat', 'cheese'];
        
            let consumeFood = (typeArr, amount) => {
                let req = amount;
                for(let i=0; i<state.player.inventory.length && req>0; i++) {
                    let it = state.player.inventory[i];
                    if(typeArr.includes(it.id)) {
                        let take = Math.min(it.qty, req);
                        it.qty -= take; req -= take;
                        if(it.qty <= 0) { state.player.inventory.splice(i,1); i--; }
                    }
                }
                return req; // Kalan (karşılanamayan) miktar
            };

            // Yüksek kalite yemekler 30+ level askerler için
            let missingHighQuality = consumeFood(highQualityFoods, Math.ceil(foodRequiredHigh));
            if(missingHighQuality > 0) {
                state.player.party.forEach(t => { if(t.level >= 30 && t.level < 51) t.debuff = true; });
            } else {
                state.player.party.forEach(t => { if(t.level >= 30 && t.level < 51) t.debuff = false; });
            }

            // Kalan yemek ihtiyacı düşük kalite ile de karşılanabilir
            let missingLow = consumeFood([...lowQualityFoods, ...highQualityFoods], Math.ceil(foodRequiredLow - foodRequiredHigh + missingHighQuality));

            // Maaş ve açlığın karşılığı artık moralde
            this.updateMorale(paid, missingLow > 0);

            // Oyuncu neden aç kaldığını görmeli. Warband'da da erzak biterken uyarı gelir;
            // burada hiç gelmiyordu, oyuncu moral çöküşünün sebebini anlamıyordu.
            let hungry = missingLow > 0;
            if(hungry && !state.player.wasHungry) {
                alert(`🍽️ <b>Ordu aç kaldı!</b><br>Günlük ihtiyaç <b>${Math.ceil(foodRequiredLow)} birim</b> yemekti, ` +
                      `<b>${Math.ceil(foodRequiredLow) - missingLow} birim</b> bulundu.<br>` +
                      `Moral <b>−30</b> — moral 25'in altına inerse asker firar etmeye başlar.<br>` +
                      `<i>Köylerin erzak pazarı en ucuz kaynaktır.</i>`);
            } else if(!hungry && state.player.wasHungry) {
                alert('🍞 Ordu doydu, açlık cezası kalktı.');
            }
            state.player.wasHungry = hungry;

            // Kalite eksiği açlıktan ayrı bir şey: karnı tok ama seçkin asker homurdanıyor.
            // Oyuncu "envanterde ekmek var, neden debuff yiyorum" diye haklı olarak şaşırıyordu.
            let elite = state.player.party.filter(t => t.level >= 30 && t.level < 51).length;
            if(missingHighQuality > 0 && elite && !state.player.wasLowQuality) {
                alert(`🥩 <b>${elite} seçkin askerin</b> et/peynir bulamadı.<br>` +
                      `Ekmek ve tahıl karınlarını doyurur ama <b>savaşta ×0.7</b> güçle dövüşürler.<br>` +
                      `Bu açlık değil, <b>kalite</b> meselesi: günde ${Math.ceil(foodRequiredHigh)} birim et ya da peynir gerekiyor.`);
            }
            state.player.wasLowQuality = missingHighQuality > 0 && elite > 0;

            // Eğitim yeteneği: her gün en tecrübesiz birkaç askeri çalıştırır
            let trained = state.player.party.filter(t => !t.wounded)
                .sort((a, b) => a.level - b.level)
                .slice(0, this.profLvl('trainer') - 1);
            trained.forEach(t => this.giveTroopXp(t, 1));
            if(trained.length) this.addProficiencyXp('trainer', 4 * trained.length);

            this.addProficiencyXp('pathfinding', 12);
            this.addProficiencyXp('spotting', 8);

            // Can artık günde +5 sıçramıyor; saat saat 1'er doluyor (Game.regenTick).
            this.trainAttr('cha', state.player.party.length / 20);   // kalabalık yönetmek liderliği geliştirir
            this.trainAttr('vit', 0.1);

            // Yaralılar gün gün iyileşir
            state.player.party.forEach(t => {
                if(!t.wounded) return;
                t.wounded--;
                if(t.wounded <= 0) delete t.wounded;
            });

            // Esirler fırsat kollar: her gün küçük bir kaçış şansı.
            // ponytail: soylular kaçmaz — fidye kararını oyuncuya bırakıyoruz.
            let pmLvl = (state.player.proficiencies.prisonerMgmt || { level: 1 }).level;
            let escChance = Math.max(0.01, 0.06 - pmLvl * 0.005);
            state.player.prisoners = state.player.prisoners.filter(pr => pr.noble || Math.random() > escChance);
        }

        // Gönüllü yenileme (her gün köylerde +1-2 gönüllü artar, max 5)
        LOCATIONS.forEach(loc => {
            if(loc.type === 'village' && loc.volunteersAvailable !== undefined) {
                loc.volunteersAvailable = Math.min(5, loc.volunteersAvailable + Math.floor(Math.random() * 2));
            }
        });

        // NPC Zamanla Güçlenme (İlk 3 ay)
        let day = state.time.day;
        state.npcParties.forEach(npc => {
            if(npc.type === 'king') {
                npc.level = Math.min(20, 1 + Math.floor(day / 4.5)); // 90 günde max 20
                npc.size = 50 + npc.level * 3;
            } else if(npc.type === 'vizier') {
                npc.level = Math.min(10, 1 + Math.floor(day / 9)); // 90 günde max 10
                npc.size = 30 + npc.level * 2;
            }
        });

        // Turnuva oluşturma
        if(Math.random() < 0.25) {
            let cities = LOCATIONS.filter(l => l.type === 'city');
            let c = cities[Math.floor(Math.random() * cities.length)];
            state.activeTournaments[c.id] = true;
        }
        // Bazı turnuvaları bitir
        for(let cid in state.activeTournaments) {
            if(Math.random() < 0.3) delete state.activeTournaments[cid];
        }

        Nobles.dailyTick();
        Feast.dailyTick();
        Quests.dailyTick();

        // Çapulcu yeniden doğma
        if(state.npcParties.filter(n=>n.type==='bandit').length < 10) {
            this.spawnBand(this.randomBandKind());
        }
    },

    updateTopBar() {
        let p = state.player;
        let set = (id, v) => { let e = document.getElementById(id); if(e) e.innerText = v; };
        let bar = (id, pct) => { let e = document.getElementById(id); if(e) e.style.width = Math.max(0, Math.min(100, pct)) + '%'; };

        let cap = this.getPartyCapacity();
        let dp = this.getDayPart();

        set('ui-day', state.time.day);
        set('ui-clock', `${String(Math.floor(state.time.hour)).padStart(2,'0')}:00 · ${dp.name}`);
        set('ui-daypart', dp.icon);
        set('ui-money', Math.floor(p.money));
        let fs = this.foodStock();
        set('ui-food', fs.need ? (fs.days === Infinity ? '∞' : fs.days) : '—');
        set('ui-food-sub', fs.need ? (fs.total ? 'gün erzak' : 'erzak yok') : 'erzak');
        let fe = document.getElementById('chip-food');
        if(fe) fe.classList.toggle('warn', fs.need > 0 && fs.days < 3);
        set('ui-renown', p.renown);
        set('ui-party', `${p.party.length}/${cap}`);
        set('ui-hp', `${Math.floor(p.stats.hp)}/${p.stats.maxHp}`);
        set('ui-level', p.stats.level);

        bar('bar-hp', p.stats.hp / p.stats.maxHp * 100);
        bar('bar-party', p.party.length / cap * 100);
        bar('bar-xp', p.stats.xp / p.stats.xpNext * 100);
        set('ui-morale', Math.round(this.morale()));
        bar('bar-morale', this.morale());

        this.updateSpeedUI(this.getPlayerSpeed());
        this.updateTips(cap);
        this.updateMapHud();

    },

    // Üst çubuk künyeleri: her rozet neyi, ne kadar etkiliyor (setHtml sayesinde
    // yalnızca metin değişince DOM'a yazılır)
    tipRow(label, val, good) {
        return `<div style="display:flex;justify-content:space-between;gap:1.2rem">
            <span>${label}</span><span style="color:${good === null ? '#ddd' : good ? 'var(--success)' : 'var(--danger)'}">${val}</span></div>`;
    },
    tipBox(title, rows, note) {
        return `<b style="font-family:Cinzel,serif">${title}</b>
            <hr style="border:0;border-top:1px solid rgba(212,175,55,.4);margin:5px 0">${rows}
            ${note ? `<div style="color:var(--text-muted);font-size:0.8rem;margin-top:5px;max-width:270px">${note}</div>` : ''}`;
    },
    updateTips(cap) {
        let p = state.player, R = (l, v, g) => this.tipRow(l, v, g);

        this.setHtml('tip-time', this.tipBox('Sefer Takvimi',
            R('Gün', p.quests && p.quests.length ? `${state.time.day}. gün` : state.time.day, null) +
            R('Saat', `${String(Math.floor(state.time.hour)).padStart(2,'0')}:00 · ${this.getDayPart().name}`, null) +
            R('Zaman akışı', '×' + this.timeScale(), null),
            'Zaman yalnızca haritada, sen yol alırken işler. Gece yol alma hızı −%15, görüş ×0.7. Rozete tıkla → akış hızını değiştir.'));

        let up = this.upkeep();
        this.setHtml('tip-money', this.tipBox('Hazine',
            R('Kesede', Math.floor(p.money) + ' dinar', null) +
            R('Günlük asker maaşı', '-' + up.wage, false) +
            R('Günlük yemek', `-${Math.ceil(up.foodLow)} birim${up.foodHigh ? ` (${Math.ceil(up.foodHigh)}'i et/peynir)` : ''}`, false) +
            (p.spouse ? R('Evlilik geliri', '+50', true) : '') +
            (p.wageDebt > 0 ? R('Gecikmiş maaş', `${Math.ceil(p.wageDebt)} dinar · ${p.wageLateHours || 0} saattir`, false) : '') +
            (p.wageDebt > 0 ? R('Saatlik moral kaybı', '-1', false) : ''),
            'Maaş ödenemezse borç birikir ve her saat 1 moral gider; paran olunca borç kendiliğinden ödenir. Lvl 10 altı asker maaş istemez, lvl 51 hiçbir şey istemez.'));

        let fs = this.foodStock();
        this.setHtml('tip-food', this.tipBox('Erzak',
            R('Elde', `${fs.total} birim (${fs.low} tahıl/ekmek · ${fs.high} et/peynir)`, fs.total > 0) +
            R('Günlük tüketim', `-${fs.need} birim`, false) +
            (fs.spoil >= 0.05 ? R('Bozulma', `-${fs.spoil.toFixed(1)} birim/gün`, false) : '') +
            R('Yeter', fs.need ? `${fs.days} gün` : 'ordu yok', fs.days >= 3) +
            (fs.needHigh ? R('Seçkin asker payı', `${fs.needHigh} birim et/peynir`, fs.high >= fs.needHigh) : '') +
            R('Yemek çeşidi', `${fs.kinds} çeşit · moral +${fs.kinds * 5}`, fs.kinds > 1),
            'Erzak biterse moral −30 ve firar başlar. Çeşit başına +5 moral. Ekmek çabuk bozulur (20 gün), tahıl dayanır (60 gün).'));

        this.setHtml('tip-renown', this.tipBox('Nam',
            R('Namın', p.renown, null) +
            R('Leydi salonu', '80 nam', p.renown >= 80) +
            R('Kız isteme', '120 nam', p.renown >= 120) +
            R('Şölen daveti', '150 nam', p.renown >= 150),
            'Nam kazandıran: savaş zaferi +3, turnuva +20, şölen vermek +15. Drahomayı da düşürür.'));

        this.setHtml('tip-hp', this.tipBox('Can',
            R('Şu an', `${Math.floor(p.stats.hp)}/${p.stats.maxHp}`, p.stats.hp > p.stats.maxHp * 0.4) +
            R('Seviyeden', 50 + (p.stats.level - 1) * 10, true) +
            (p.equipment.armor ? R(`Zırh (${p.equipment.armor.name})`, '+' + p.equipment.armor.armor, true) : R('Zırh', 'yok', false)),
            'Her gün +5 iyileşirsin. Savaşta canın biterse ölmezsin, bayılırsın — adamların dövüşmeye devam eder ama ödül yarıya iner.'));

        let comp = this.getPartyComposition();
        let lead = this.profLvl('leadership');
        this.setHtml('tip-party', this.tipBox('Grup',
            R('Mevcut', `${p.party.length}/${cap}`, p.party.length <= cap) +
            R('Temel kapasite', 12, null) +
            R('Liderlik (efektif)', `+${Math.round((this.attr('cha') - 10) * 3)}`, this.attr('cha') >= 10) +
            R('İdare yeteneği', `+${(lead - 1) * 4}`, true) +
            R('Nam', `+${Math.floor(p.renown / 40)}`, p.renown >= 40) +
            R('Dağılım', `🪖${comp.infantry} 🏹${comp.archer} 🐎${comp.cavalry}`, null) +
            R('Atlı oranı', '%' + Math.round(this.getMountedRatio() * 100), null),
            'Kapasiteyi aşarsan moral düşer. Kalabalık ordu haritada yavaş yol alır; atlı oranı bu cezayı hafifletir.'));

        this.setHtml('tip-morale', this.moraleTip());

        this.setHtml('tip-level', this.tipBox('Seviye',
            R('Seviye', p.stats.level, null) +
            R('Tecrübe', `${Math.floor(p.stats.xp)}/${p.stats.xpNext}`, null) +
            R('Bekleyen nitelik puanı', p.stats.attributePoints || 0, (p.stats.attributePoints || 0) > 0) +
            R('Bekleyen odak puanı', p.stats.focusPoints || 0, (p.stats.focusPoints || 0) > 0),
            'Her seviye: +10 can, tam iyileşme, 2 nitelik + 3 odak puanı. Seninle boy ölçüşemeyecek düşmandan alınan tecrübe ve ganimet azalır.'));
    },
    // Moral künyesi: moraleHtml ile aynı kalemler, rozete sığan biçimde
    moraleTip() {
        let m = Math.round(this.morale());
        let info = state.player.moraleInfo || {};
        let rows = Object.keys(info).filter(k => info[k] !== 0)
            .map(k => this.tipRow(k, (info[k] > 0 ? '+' : '') + info[k], info[k] > 0)).join('');
        return this.tipBox(`Moral ${m}/100 — ${this.moraleLabel(m)}`,
            (rows || '<i>Henüz hesaplanmadı (bir gün geçmeli).</i>') +
            this.tipRow('Savaş gücü çarpanı', '×' + this.moraleMult().toFixed(2), this.moraleMult() >= 1) +
            (state.player.wageDebt > 0
                ? this.tipRow('Maaş gecikmesi', `${state.player.wageLateHours || 0} saat · -1/saat`, false) : ''),
            'Moral tüm askerlerinin canını ve saldırısını ölçekler. 25\'in altında her gece asker firar eder. Hızlı düşer, yavaş toparlanır.');
    },

    // innerHTML her karede yeniden yazılmasın — sadece metin değiştiyse
    _htmlCache: {},
    setHtml(id, html) {
        if(this._htmlCache[id] === html) return;
        this._htmlCache[id] = html;
        let e = document.getElementById(id);
        if(e) e.innerHTML = html;
    },

    // Harita künyesi: bulunduğun arazi + birlik dağılımı
    updateMapHud() {
        let t = document.getElementById('map-terrain-txt');
        if(!t) return;
        let terrain = this.getTerrainInfo(state.player.x, state.player.y);
        t.innerText = terrain.name + (terrain.mult !== 1 ? `  (${terrain.mult > 1 ? '+' : ''}%${((terrain.mult-1)*100).toFixed(0)} hız)` : '');
        document.getElementById('map-terrain').firstElementChild.innerText = terrain.icon;

        let c = this.getPartyComposition();
        this.setHtml('map-comp',
            `<span>🪖 <b>${c.infantry}</b></span><span>🏹 <b>${c.archer}</b></span><span>🐎 <b>${c.cavalry}</b></span>`
            + `<button id="btn-center" onclick="Game.centerOnPlayer()" title="Kamerayı bana getir (Boşluk)">🎯 Beni Bul <kbd>Boşluk</kbd></button>`);
    },

    renderPrisonerUI() {
        let ui = document.getElementById('prisoner-ui');
        if(!state.player.prisoner) { ui.classList.add('hidden'); return; }
        ui.classList.remove('hidden');

        let p = state.player.prisoner;
        this.setHtml('prisoner-info',
              `Seni tutan: <b>${p.npcName}</b><br>`
            + `Muhafız: <b>${p.troops || '?'}</b> kişi<br>`
            + `Kalan süre: <b>${Math.max(0, p.daysLeft)}</b> gün<br>`
            + (p.fellows && p.fellows.length
                ? `Diğer esirler: <b>${p.fellows.join(', ')}</b>`
                : `Zincirdeki tek esir sensin.`));
        document.getElementById('ui-escape-chance').innerText = `${Math.round(p.escapeChance)}%`;
        
        let btn = document.getElementById('btn-escape-plan');
        if(p.isPlanning) {
            btn.classList.add('planning-active');
            btn.innerText = 'Plan Yapılıyor... (Vazgeç)';
        } else {
            btn.classList.remove('planning-active');
            btn.innerText = 'Kaçış Planı Yap';
        }
    },

    toggleEscapePlan() {
        if(!state.player.prisoner) return;
        state.player.prisoner.isPlanning = !state.player.prisoner.isPlanning;
        this.renderPrisonerUI();
    },

    attemptEscape() {
        if(!state.player.prisoner) return;
        let p = state.player.prisoner;
        
        if(p.lastAttemptDay === state.time.day) {
            alert('Günde sadece 1 kez kaçmayı deneyebilirsin! Plan yapmaya devam et veya yarını bekle.');
            return;
        }
        
        p.lastAttemptDay = state.time.day;
        
        if(Math.random() * 100 <= p.escapeChance) {
            alert('Harika! Gardiyanların dalgınlığından yararlanarak başarıyla kaçtın!');
            Quests.emit('escaped_captivity', { npcId: p.npcId });
            state.player.prisoner = null;
            state.player.status = 'idle';
        } else {
            alert('Kahretsin! Kaçış girişimin fark edildi. Tüm planların suya düştü ve ceza aldın!');
            p.escapeChance = Math.max(0, p.escapeChance - 60);
            p.isPlanning = false;
        }
        this.renderPrisonerUI();
    },

    // --- SCREENS ---
    // Kamerayı oyuncuya geri kilitle (kenardan kaydırma offset'ini sıfırlar)
    centerOnPlayer() {
        this.camera.offsetX = 0;
        this.camera.offsetY = 0;
    },

    showScreen(screenId) {
        document.querySelectorAll('.menu-btn').forEach(b => b.classList.toggle('active', b.dataset.view === screenId));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        let view = document.getElementById(screenId + '-view');
        if(view) view.classList.add('active');

        // Görünür hale gelen tuvali ölçüsüne kavuştur: gizliyken yapılan bir
        // resize onu 0x0 bırakmış olabilir (harita bomboş kalıyordu).
        this.resizeCanvases();

        if(screenId === 'quests') Quests.render();
        else if(screenId === 'character') this.renderCharacterScreen();
        else if(screenId === 'party') this.renderPartyScreen();
        else if(screenId === 'inventory') this.renderInventoryScreen();
    },

    // --- MAP RENDER ---
    // Toprak dokusu: 256px'lik tekrarlı desen, bir kez üretilir
    buildGroundTexture() {
        let sz = 256;
        let c = document.createElement('canvas'); c.width = c.height = sz;
        let x = c.getContext('2d');
        x.fillStyle = '#32472d'; x.fillRect(0, 0, sz, sz);
        // Kenarları sarmalayarak çiz — yoksa desen döşenince ızgara izi çıkıyor
        let wrap = (px, py, draw) => {
            for(let ox = -1; ox <= 1; ox++) for(let oy = -1; oy <= 1; oy++) draw(px + ox*sz, py + oy*sz);
        };
        for(let i = 0; i < 26; i++) {
            let px = Math.random()*sz, py = Math.random()*sz, r = 18 + Math.random()*40;
            let col = Math.random() > 0.5 ? 'rgba(84,112,64,0.22)' : 'rgba(26,42,26,0.22)';
            wrap(px, py, (qx, qy) => {
                let g = x.createRadialGradient(qx, qy, 0, qx, qy, r);
                g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
                x.fillStyle = g; x.beginPath(); x.arc(qx, qy, r, 0, Math.PI*2); x.fill();
            });
        }
        for(let i = 0; i < 2600; i++) {
            let px = Math.random()*sz, py = Math.random()*sz, r = 0.5 + Math.random()*1.2;
            x.fillStyle = Math.random() > 0.5 ? 'rgba(86,116,66,0.35)' : 'rgba(28,44,26,0.35)';
            wrap(px, py, (qx, qy) => { x.beginPath(); x.arc(qx, qy, r, 0, Math.PI*2); x.fill(); });
        }
        this.groundPattern = this.ctx.createPattern(c, 'repeat');
    },

    // Haritadaki isim etiketleri — çıplak gölgeli yazı yerine okunur bir plaka.
    // Üst üste binenler yukarı kaydırılır (kalabalık bölgede isimler birbirini yemesin).
    mapLabel(ctx, text, x, y, color, accent) {
        // Yazı boyutu zoom'dan bağımsız: her yakınlıkta aynı ekran boyunda okunur
        let k = 1 / this.camera.zoom;
        ctx.font = `bold ${(19*k).toFixed(1)}px Inter, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let w = ctx.measureText(text).width + 18*k, h = 25*k;

        if(!this._labelRects) this._labelRects = [];
        for(let tries = 0; tries < 8; tries++) {
            let hit = this._labelRects.some(r =>
                Math.abs(r.x - x) < (r.w + w)/2 && Math.abs(r.y - y) < (r.h + h)/2 + 3);
            if(!hit) break;
            y -= h + 5;
        }
        this._labelRects.push({ x, y, w, h });

        ctx.fillStyle = 'rgba(8,10,14,0.72)';
        ctx.beginPath();
        if(ctx.roundRect) ctx.roundRect(x - w/2, y - h/2, w, h, 5*k);
        else ctx.rect(x - w/2, y - h/2, w, h);
        ctx.fill();
        if(accent) {
            ctx.fillStyle = accent;
            ctx.fillRect(x - w/2, y + h/2 - 2.5*k, w, 2.5*k);
        }
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    },

    // --- HARİTA GRUP İKONLARI ---
    // Warband'da grup ikonu grubun neye benzediğini gösterir: atlıysan atlı,
    // yayaysan mızraklı piyade, kalabalıksan arkanda kolon görünür.

    // Yaya asker silüeti (0,0 = ayak basma noktası)
    drawFootman(ctx, col, cloak, bow) {
        if(bow) {                                                      // yay (haydut okçusu)
            ctx.strokeStyle = '#6b5535'; ctx.lineWidth = 2.4;
            ctx.beginPath(); ctx.arc(9, -16, 14, -Math.PI*0.45, Math.PI*0.45); ctx.stroke();
            ctx.strokeStyle = 'rgba(240,240,230,0.75)'; ctx.lineWidth = 1.1;
            ctx.beginPath(); ctx.moveTo(11, -28.6); ctx.lineTo(11, -3.4); ctx.stroke();
        } else {
        ctx.strokeStyle = '#6b5535'; ctx.lineWidth = 2.2;             // mızrak sapı
        ctx.beginPath(); ctx.moveTo(7, -36); ctx.lineTo(10, 8); ctx.stroke();
        ctx.fillStyle = '#cfd6dc';                                     // mızrak ucu
        ctx.beginPath(); ctx.moveTo(7, -36); ctx.lineTo(4, -44); ctx.lineTo(11, -40); ctx.closePath(); ctx.fill();
        }

        ctx.strokeStyle = cloak; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-3, 2); ctx.lineTo(-5, 12); ctx.moveTo(3, 2); ctx.lineTo(5, 12); ctx.stroke();

        ctx.fillStyle = cloak;                                         // gövde
        ctx.beginPath();
        ctx.moveTo(-7, 4); ctx.lineTo(-5, -15);
        ctx.quadraticCurveTo(0, -21, 5, -15); ctx.lineTo(7, 4);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = col;                                           // kalkan
        ctx.beginPath(); ctx.arc(-8, -6, 6.4, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.4; ctx.stroke();

        ctx.fillStyle = '#d9c6a2';                                     // yüz
        ctx.beginPath(); ctx.arc(0, -20, 4.8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = cloak;                                         // miğfer
        ctx.beginPath(); ctx.arc(0, -20, 5.2, Math.PI, 0); ctx.fill();
        ctx.lineCap = 'butt';
    },

    // Atlı silüeti (0,0 = atın toynak hizası, at sağa bakar)
    drawRider(ctx, col, cloak) {
        let hide = '#4a3524', dark = '#33241a';

        ctx.strokeStyle = dark; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
        ctx.beginPath();                                                // bacaklar
        ctx.moveTo(-9, -5); ctx.lineTo(-11, 9);
        ctx.moveTo(-4, -4); ctx.lineTo(-2, 9);
        ctx.moveTo(8, -5);  ctx.lineTo(10, 9);
        ctx.moveTo(12, -6); ctx.lineTo(15, 8);
        ctx.stroke();
        ctx.beginPath();                                                // kuyruk
        ctx.moveTo(-13, -12); ctx.quadraticCurveTo(-22, -10, -21, -1);
        ctx.lineWidth = 3.8; ctx.stroke();

        ctx.fillStyle = hide;
        ctx.beginPath(); ctx.ellipse(1, -10, 14, 7.5, 0, 0, Math.PI*2); ctx.fill();   // gövde
        ctx.beginPath();                                                // boyun
        ctx.moveTo(7, -15); ctx.lineTo(13, -31); ctx.lineTo(19, -29); ctx.lineTo(15, -11);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();                                                // kafa + burun
        ctx.moveTo(13, -32); ctx.lineTo(26, -28); ctx.lineTo(26, -24); ctx.lineTo(15, -25);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();                                                // kulak
        ctx.moveTo(14, -32); ctx.lineTo(15, -37); ctx.lineTo(18, -31); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = dark; ctx.lineWidth = 2.6;                    // yele
        ctx.beginPath(); ctx.moveTo(5, -17); ctx.lineTo(13, -32); ctx.stroke();

        ctx.fillStyle = col;                                            // eyer örtüsü (fraksiyon rengi)
        ctx.beginPath(); ctx.moveTo(-8, -11); ctx.lineTo(6, -11); ctx.lineTo(3, -2); ctx.lineTo(-7, -2);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = cloak;                                          // binicinin gövdesi
        ctx.beginPath();
        ctx.moveTo(-7, -12); ctx.lineTo(-5, -29);
        ctx.quadraticCurveTo(0, -34, 5, -29); ctx.lineTo(6, -12);
        ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#c8d0d8'; ctx.lineWidth = 2.6;               // havaya kalkmış kılıç
        ctx.beginPath(); ctx.moveTo(5, -28); ctx.lineTo(14, -44); ctx.stroke();
        ctx.strokeStyle = cloak; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(3, -25); ctx.lineTo(6, -29); ctx.stroke();

        ctx.fillStyle = '#d9c6a2';                                      // yüz
        ctx.beginPath(); ctx.arc(0, -35, 4.8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = cloak;                                          // miğfer
        ctx.beginPath(); ctx.arc(0, -35, 5.2, Math.PI, 0); ctx.fill();
        ctx.lineCap = 'butt';
    },

    // Kurt silüeti (0,0 = pençe hizası, sağa bakar) — sürü insan ikonu taşımaz
    drawWolf(ctx, col) {
        let fur = '#5b6068', dark = '#33373d';

        ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath();                                               // bacaklar
        ctx.moveTo(-8, -8); ctx.lineTo(-10, 6);
        ctx.moveTo(-3, -8); ctx.lineTo(-1, 6);
        ctx.moveTo(7, -8);  ctx.lineTo(6, 6);
        ctx.moveTo(11, -9); ctx.lineTo(13, 5);
        ctx.stroke();
        ctx.beginPath(); ctx.lineWidth = 4.2;                          // kuyruk
        ctx.moveTo(-11, -13); ctx.quadraticCurveTo(-23, -15, -21, -26); ctx.stroke();

        ctx.fillStyle = fur;
        ctx.beginPath(); ctx.ellipse(0, -13, 13, 6.5, 0, 0, Math.PI*2); ctx.fill();   // gövde
        ctx.beginPath();                                               // boyun + kafa
        ctx.moveTo(6, -18); ctx.lineTo(15, -25); ctx.lineTo(25, -23);
        ctx.lineTo(25, -18); ctx.lineTo(13, -12); ctx.closePath(); ctx.fill();
        ctx.beginPath();                                               // kulaklar
        ctx.moveTo(14, -25); ctx.lineTo(14, -32); ctx.lineTo(18, -25); ctx.closePath();
        ctx.moveTo(19, -24); ctx.lineTo(21, -30); ctx.lineTo(24, -23); ctx.closePath(); ctx.fill();

        ctx.fillStyle = col;                                           // sürü rengi: ense tüyü
        ctx.beginPath(); ctx.moveTo(-3, -19); ctx.lineTo(3, -26); ctx.lineTo(9, -18); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd479';                                     // göz
        ctx.beginPath(); ctx.arc(21, -21, 1.6, 0, Math.PI*2); ctx.fill();
        ctx.lineCap = 'butt';
    },

    // Grup neye benziyorsa o çizilir: atlı / mızraklı yaya / okçu / kurt
    drawFigure(ctx, kind, col, cloak) {
        if(kind === 'wolf')  return this.drawWolf(ctx, col);
        if(kind === 'rider') return this.drawRider(ctx, col, cloak);
        this.drawFootman(ctx, col, cloak, kind === 'archer');
    },

    /**
     * Tam grup ikonu: gölge + arkadaki kolon + ön figür + sancak.
     * o = { mounted, size, color, scale, bob, dim }
     */
    // Kalabalık ordu haritada da iri görünür (30 kişide ~+%20, 100'de tavan +%35)
    partyIconScale(size) { return 1 + Math.min(0.35, Math.max(0, size - 5) * 0.007); },

    drawPartyIcon(ctx, x, y, o) {
        let sc = o.scale || 1;
        let kind = o.kind || (o.mounted ? 'rider' : 'foot');
        let cloak = o.dim ? '#3a3a42' : '#26262e';

        ctx.save();
        ctx.translate(x, y);

        ctx.beginPath();                                               // yer gölgesi
        ctx.ellipse(0, 0, 26*sc, 9*sc, 0, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();

        ctx.scale(sc, sc);
        ctx.translate(0, o.bob || 0);

        // Kalabalık kolonu: 10+ kişi 1, 30+ kişi 2 arkadaş figürü
        let extra = o.size >= 30 ? 2 : (o.size >= 10 ? 1 : 0);
        let offsets = [[-17, -4], [16, -7]];
        ctx.globalAlpha = 0.75;
        for(let i = 0; i < extra; i++) {
            ctx.save();
            ctx.translate(offsets[i][0], offsets[i][1]);
            ctx.scale(0.78, 0.78);
            this.drawFigure(ctx, kind, o.color, cloak);
            ctx.restore();
        }
        ctx.globalAlpha = 1;

        this.drawFigure(ctx, kind, o.color, cloak);

        // Sancak direği (kurt sürüsü sancak taşımaz)
        if(kind === 'wolf') { ctx.restore(); return; }
        let top = kind === 'rider' ? -62 : -48;
        ctx.strokeStyle = '#7d6a45'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(-14, 4); ctx.lineTo(-14, top); ctx.stroke();
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.moveTo(-14, top); ctx.lineTo(-14 - 20, top + 6); ctx.lineTo(-14, top + 13);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.4; ctx.stroke();

        ctx.restore();
    },

    renderMap() {
        if(!document.getElementById('map-view').classList.contains('active')) return;
        // Modal açıkken zaman durur; çizmeye devam etmek modalin cam panelindeki
        // backdrop blur'unu her kare yeniden hesaplatıyordu.
        if(!document.getElementById('modal-overlay').classList.contains('hidden')) return;
        let c = this.mapCanvas, ctx = this.ctx;
        let W = c.width, H = c.height;
        this._labelRects = [];
        ctx.clearRect(0,0,W,H);
        ctx.save();
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x + W/(2*this.camera.zoom), -this.camera.y + H/(2*this.camera.zoom));

        // --- Deniz
        if(!this._seaGrad) {
            let g = ctx.createLinearGradient(0, -2000, 0, 11000);
            g.addColorStop(0, '#0a1c2e');
            g.addColorStop(0.5, '#123c58');
            g.addColorStop(1, '#0a1c2e');
            this._seaGrad = g;
        }
        ctx.fillStyle = this._seaGrad;
        ctx.fillRect(-5000, -5000, 20000, 20000);

        // Deniz dalgaları
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 6;
        let wt = performance.now() / 4000;
        for(let i = -4; i < 22; i++) {
            let y = i * 600 + Math.sin(wt + i) * 40;
            ctx.beginPath();
            for(let x = -4000; x < 14000; x += 400) ctx.lineTo(x, y + Math.sin((x/900) + wt*2 + i) * 30);
            ctx.stroke();
        }

        // --- Kıta
        ctx.save();
        ctx.beginPath();
        for(let i=0; i<state.mapBorder.length; i++) {
            let pt = state.mapBorder[i];
            if(i===0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();

        // Kumsal + kıyı gölgesi
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.lineWidth = 90; ctx.strokeStyle = 'rgba(226,205,150,0.16)'; ctx.stroke();
        ctx.lineWidth = 42; ctx.strokeStyle = 'rgba(214,190,132,0.55)'; ctx.stroke();
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 70;
        ctx.fillStyle = '#2f452c'; ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(140,170,120,0.35)'; ctx.stroke();

        ctx.clip(); // Bundan sonrası kıtanın dışına taşmaz

        // Toprak dokusu (bir kez üretilip pattern olarak döşenir)
        if(!this.groundPattern) this.buildGroundTexture();
        ctx.fillStyle = this.groundPattern;
        ctx.fill();

        // Toprak lekeleri — yumuşak geçişli
        if(!state.dirtPatches) {
            state.dirtPatches = [];
            for(let i=0;i<60;i++) state.dirtPatches.push({x:Math.random()*9000, y:Math.random()*9000, r:45+Math.random()*120});
        }
        state.dirtPatches.forEach(d => {
            let g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
            g.addColorStop(0, 'rgba(30,44,28,0.55)');
            g.addColorStop(1, 'rgba(30,44,28,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI*2); ctx.fill();
        });

        // Nehirler — yatak, su, akıntı
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        RIVERS.forEach(riv => {
            ctx.beginPath(); ctx.moveTo(riv.x1, riv.y1); ctx.lineTo(riv.x2, riv.y2);
            ctx.lineWidth = riv.width + 22; ctx.strokeStyle = 'rgba(96,110,70,0.55)'; ctx.stroke();
            ctx.lineWidth = riv.width; ctx.strokeStyle = 'rgba(48,120,160,0.85)'; ctx.stroke();
            ctx.lineWidth = riv.width * 0.45; ctx.strokeStyle = 'rgba(120,200,235,0.5)'; ctx.stroke();
        });
        ctx.setLineDash([50, 90]);
        ctx.lineDashOffset = -(performance.now() / 25);
        ctx.strokeStyle = 'rgba(255,255,255,0.30)';
        RIVERS.forEach(riv => {
            ctx.lineWidth = Math.max(3, riv.width * 0.18);
            ctx.beginPath(); ctx.moveTo(riv.x1, riv.y1); ctx.lineTo(riv.x2, riv.y2); ctx.stroke();
        });
        ctx.setLineDash([]);

        // Yollar — toprak şerit + tekerlek izi
        if(state.roads) {
            ctx.beginPath();
            state.roads.forEach(r => { ctx.moveTo(r.x1, r.y1); ctx.lineTo(r.x2, r.y2); });
            ctx.lineWidth = 48; ctx.strokeStyle = 'rgba(92,68,38,0.45)'; ctx.stroke();
            ctx.lineWidth = 30; ctx.strokeStyle = 'rgba(158,124,74,0.42)'; ctx.stroke();
            ctx.setLineDash([70, 55]);
            ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(214,186,132,0.30)'; ctx.stroke();
            ctx.setLineDash([]);
        }

        // Ormanlar — gerçek ağaçlar (konumlar bir kez üretilip saklanır)
        if(!this._forestTrees) {
            this._forestTrees = FORESTS.map(f => {
                let arr = [];
                let n = Math.max(14, Math.floor(f.radius / 11));
                for(let i=0;i<n;i++) {
                    let a = Math.random()*Math.PI*2, d = Math.sqrt(Math.random()) * f.radius * 0.95;
                    arr.push({ x: f.x + Math.cos(a)*d, y: f.y + Math.sin(a)*d, r: 18 + Math.random()*20 });
                }
                arr.sort((p,q) => p.y - q.y);
                return arr;
            });
        }
        FORESTS.forEach((f, i) => {
            let g = ctx.createRadialGradient(f.x, f.y, f.radius*0.2, f.x, f.y, f.radius);
            g.addColorStop(0, 'rgba(16,38,18,0.85)');
            g.addColorStop(1, 'rgba(16,38,18,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(f.x, f.y, f.radius, 0, Math.PI*2); ctx.fill();
            this._forestTrees[i].forEach(t => Battle.drawTree(ctx, t.x, t.y, t.r));
        });

        ctx.restore(); // kıta clip'i biter

        // Draw locations
        LOCATIONS.forEach(loc => {
            let fc = FACTIONS[loc.faction] || {color:'#888'};
            let big = loc.type === 'city' ? 64 : loc.type === 'castle' ? 48 : 32;
            let icon = loc.type === 'city' ? '🏙️' : loc.type === 'castle' ? '🏰' : '🏘️';

            // Yer gölgesi
            ctx.beginPath();
            ctx.ellipse(loc.x, loc.y + 18, big*0.55, big*0.22, 0, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();

            ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.font = big + 'px Arial';
            ctx.fillText(icon, loc.x, loc.y + 15);

            // Fraksiyon flaması
            let px = loc.x + big*0.42, py = loc.y - big*0.45;
            ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(px, py + 34); ctx.lineTo(px, py - 26); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(px, py - 26); ctx.lineTo(px + 30, py - 17); ctx.lineTo(px, py - 8);
            ctx.closePath();
            ctx.fillStyle = fc.color; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2; ctx.stroke();

            if(loc.type === 'city' && state.activeTournaments[loc.id]) {
                ctx.font = '36px Arial';
                ctx.fillText('🏆', loc.x - big*0.55, loc.y - 15);
            }

            this.mapLabel(ctx, loc.name, loc.x, loc.y - big*0.82 - 14, '#f2e4bb', fc.color);
        });

        // --- GÜNÜN VAKTİ ---
        // Gece mavi, şafak/gün batımı sıcak ton. Gece yerleşimlerde ocak ışığı yanar.
        let tint = this.dayTint();
        if(tint) {
            ctx.fillStyle = tint;
            ctx.fillRect(-1000, -1000, 11000, 11000);
        }
        let glow = this.nightGlow();
        if(glow > 0.02) {
            ctx.globalCompositeOperation = 'lighter';
            LOCATIONS.forEach(loc => {
                let g = ctx.createRadialGradient(loc.x, loc.y, 0, loc.x, loc.y, 110);
                g.addColorStop(0, `rgba(255,170,70,${(0.30 * glow).toFixed(3)})`);
                g.addColorStop(1, 'rgba(255,140,50,0)');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(loc.x, loc.y, 110, 0, Math.PI*2); ctx.fill();
            });
            ctx.globalCompositeOperation = 'source-over';
        }

        // FOG OF WAR çizimi
        if(this.exploredCanvas) {
            ctx.drawImage(this.exploredCanvas, 0, 0); // Keşfedilmemiş yerler siyah olur
        }
        
        // Tüm ekranı hafif karart (Keşfedilmiş ama şu an göremediğimiz yerleri karartmak için)
        // Ancak o anki dalgalı görüş alanını karartmadan Bırakacağız (evenodd taktiği)
        ctx.beginPath();
        ctx.rect(-1000,-1000, 11000, 11000); // Tüm ekranı kapsayan dikdörtgen
        let vis = this.getVisibility() * (this.isNight() ? 0.7 : 1);
        let time = performance.now() / 2000;
        for (let a = 0; a < Math.PI * 2; a += 0.1) {
            let r = vis + Math.sin(a * 6 + time) * 24;
            let px = state.player.x + Math.cos(a) * r;
            let py = state.player.y + Math.sin(a) * r;
            if(a === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fill('evenodd'); // İç içe geçen şekillerin içini boyamaz
        
        // Sınırlar boyunca sıra dağları çiz
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        state.mapBorder.forEach((pt, index) => {
            if(index % 2 === 0) { // Çok yoğun olmaması için iki noktada bir dağ çiz
                let sz = 42 + ((index * 37) % 24); // düzenli tekrar yerine kırık silüet
                ctx.font = sz + 'px Arial';
                ctx.fillText('🏔️', pt.x, pt.y + 20 + (index % 3) * 6);
            }
        });

        // NPC'ler (sadece görüş alanındakiler)
        state.npcParties.forEach(npc => {
            let dx = npc.x - state.player.x;
            let dy = npc.y - state.player.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if(dist > this.spotRange(npc) + 45) return; // Görüş dışıysa (ya da ormanda gizliyse) çizme

            let nf = FACTIONS[npc.faction] || {};
            let band = BAND_KINDS[npc.band] || null;
            // Çete kendi rengiyle ve kendi silüetiyle gezer: kurt sürüsü çapulcuya benzemez
            let nCol = band ? band.color : (npc.type === 'bandit' ? '#ff5a4a' : (nf.color || '#cccccc'));

            // Fraksiyon halkası
            ctx.beginPath();
            ctx.ellipse(npc.x, npc.y + 22, 24, 9, 0, 0, Math.PI*2);
            ctx.strokeStyle = nCol; ctx.lineWidth = 3; ctx.globalAlpha = 0.75; ctx.stroke(); ctx.globalAlpha = 1;

            // Çapulcular yayadır, soylular atlı — ikondan hemen anlaşılsın
            let isMoving = (Math.abs(npc.targetX - npc.x) > 3 || Math.abs(npc.targetY - npc.y) > 3);
            this.drawPartyIcon(ctx, npc.x, npc.y + 22, {
                kind: band ? (band.icon || 'foot') : (npc.type === 'bandit' ? 'foot' : 'rider'),
                mounted: npc.type !== 'bandit',
                size: npc.size || 1,
                color: nCol,
                scale: (npc.type === 'king' ? 1.15 : 1) * this.partyIconScale(npc.size || 1),
                bob: isMoving ? -Math.abs(Math.sin(performance.now()/150)) * 5 : 0,
                dim: npc.type === 'bandit'
            });

            // Taç: kral/vezir
            if(npc.type === 'king' || npc.type === 'vizier') {
                ctx.font = (npc.type === 'king' ? 30 : 24) + 'px Arial';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(npc.type === 'king' ? '👑' : '🎖️', npc.x + 22, npc.y - 44);
            }
            
            let shortName = npc.name.split(' ')[0];
            if(npc.type === 'lord' || npc.type === 'king' || npc.type === 'vizier') {
                shortName = npc.name.replace(' Ordusu', '').replace(' Birliği', '');
            }
            this.mapLabel(ctx, `${shortName} (${npc.size})`, npc.x, npc.y + 50, '#ffffff', nCol);
        });

        // Player
        // Esirken haritada hareket eden tek taraf seni tutan partidir; senin ayrı bir
        // grubun yoktur. Eskiden oyuncu ikonu + adı + "Esir" yazısı esir alanın ikonu
        // ve etiketiyle aynı noktaya çiziliyordu (üst üste binen metinler).
        let isPrisoner = !!state.player.prisoner;
        if(isPrisoner) {
            ctx.font = '30px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('⛓️', state.player.x - 30, state.player.y - 40);
        } else {
            // Oyuncu tabanı — nabız atan altın halka
            let pp = 1 + Math.sin(performance.now()/450) * 0.1;
            ctx.beginPath();
            ctx.ellipse(state.player.x, state.player.y + 28, 36*pp, 13*pp, 0, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(255,204,0,0.9)';
            ctx.lineWidth = 4; ctx.stroke();

            // Atımız varsa haritada atlı görünürüz (Warband'daki gibi)
            this.drawPartyIcon(ctx, state.player.x, state.player.y + 28, {
                mounted: !!state.player.equipment.horse,
                size: state.player.party.length + 1,
                color: '#ffcc00',
                scale: 1.35 * this.partyIconScale(state.player.party.length + 1),
                bob: state.player.status === 'moving' ? -Math.abs(Math.sin(performance.now()/150)) * 6 : 0
            });

            this.mapLabel(ctx, `${state.player.name} (${state.player.party.length + 1})`,
                          state.player.x, state.player.y - 72, '#ffcc00', '#ffcc00');
        }

        // Rota: hedefe akan ince kesikli çizgi + varış halkası + ok başı
        if(state.player.targetLocation && state.player.status === 'moving') {
            let t = state.player.targetLocation;
            let dx = t.x - state.player.x, dy = t.y - state.player.y;
            let len = Math.sqrt(dx*dx + dy*dy) || 1;
            let ang = Math.atan2(dy, dx);
            let flow = (performance.now() / 60) % 26;

            ctx.save();
            ctx.lineCap = 'round';
            ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 6;
            ctx.setLineDash([16, 10]); ctx.lineDashOffset = -flow;
            ctx.beginPath(); ctx.moveTo(state.player.x, state.player.y); ctx.lineTo(t.x, t.y); ctx.stroke();

            ctx.strokeStyle = 'rgba(255,214,102,0.85)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(state.player.x, state.player.y); ctx.lineTo(t.x, t.y); ctx.stroke();
            ctx.setLineDash([]);

            // Varış noktası: nabız atan halka + yön oku
            let pr = 14 + Math.sin(performance.now()/300) * 3;
            ctx.strokeStyle = 'rgba(255,214,102,0.9)'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(t.x, t.y, pr, 0, Math.PI*2); ctx.stroke();

            if(len > 60) {
                ctx.translate(t.x - Math.cos(ang)*26, t.y - Math.sin(ang)*26);
                ctx.rotate(ang);
                ctx.fillStyle = 'rgba(255,214,102,0.95)';
                ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(-8,-8); ctx.lineTo(-8,8); ctx.closePath(); ctx.fill();
            }
            ctx.restore();
        }

        // Lordlardan öğrenilen konum işaretleri
        Nobles.drawMarkers(ctx);

        ctx.restore();
    },

    handleMapHover(e) {
        let rect = this.mapCanvas.getBoundingClientRect();
        // Ekran -> dünya: tıklamayla aynı dönüşüm. Ortalama payı (rect/2) eksikti,
        // künye imlecin yarım ekran uzağındaki yerleşimi buluyordu — yani hiç çıkmıyordu.
        let mx = ((e.clientX - rect.left) - rect.width/2) / this.camera.zoom + this.camera.x;
        let my = ((e.clientY - rect.top) - rect.height/2) / this.camera.zoom + this.camera.y;
        let tooltip = document.getElementById('map-tooltip');
        let found = null;

        for(let loc of LOCATIONS) {
            if(this.dist(loc, {x:mx,y:my}) < 36) { found = { name: loc.name, sub: this.locTipHtml(loc) }; break; }
        }
        if(!found) {
            for(let npc of state.npcParties) {
                if(this.dist(npc,{x:mx,y:my}) < 30 && this.canSee(npc)) {
                    found = { name: npc.name, sub: this.npcTipHtml(npc) };
                    break;
                }
            }
        }

        if(found) {
            tooltip.innerHTML = `<strong>${found.name}</strong><br>${found.sub}`;
            tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
            tooltip.style.top = (e.clientY - rect.top + 15) + 'px';
            tooltip.classList.remove('hidden');
            this.mapCanvas.style.cursor = 'pointer';
        } else {
            tooltip.classList.add('hidden');
            this.mapCanvas.style.cursor = 'crosshair';
        }
    },

    handleMapClick(e) {
        let rect = this.mapCanvas.getBoundingClientRect();
        let mx = ((e.clientX - rect.left) - rect.width/2) / this.camera.zoom + this.camera.x;
        let my = ((e.clientY - rect.top) - rect.height/2) / this.camera.zoom + this.camera.y;

        for(let loc of LOCATIONS) {
            if(this.dist(loc, {x:mx,y:my}) < 36) {
                state.player.targetLocation = loc;
                state.player.status = 'moving';
                return;
            }
        }
        for(let npc of state.npcParties) {
            if(this.dist(npc,{x:mx,y:my}) < 30 && this.canSee(npc)) {
                state.player.targetLocation = { ...npc, isNpc: true };
                state.player.status = 'moving';
                return;
            }
        }
        // Boş alana tıklanırsa oraya doğru git (serbest hareket / kaçış)
        state.player.targetLocation = { x: mx, y: my, name: 'Hedef Bölge', type: null };
        state.player.status = 'moving';
    },

    // --- SETTLEMENT ---
    enterLocation(loc) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('settlement-view').classList.add('active');
        document.getElementById('settlement-name').innerText = loc.name + (loc.type==='city'?' (Şehir)':loc.type==='castle'?' (Kale)':' (Köy)');
        let ac = document.getElementById('settlement-actions');
        ac.innerHTML = '';

        // Kendi krallığını kuran oyuncu da bir fraksiyona bağlıdır: kendi
        // yerleşimi olmayan her şehir/kale ona da düşmandır. Eskiden
        // 'player_kingdom' istisna tutulduğu için krallık kurduktan sonra
        // hiçbir yer kuşatılamıyordu.
        let isEnemy = state.player.vassalOf && state.player.vassalOf !== loc.faction;

        Quests.emit('entered_location', { locId: loc.id, loc });

        let chickenQ = state.player.quests.find(q => q.id === 'crazy_chickens' && q.data.locId === loc.id);
        if(chickenQ) this.addBtn(ac, '🐔 Tavukları Kovala (15 sn)', () => TournamentMinigame.start({ mode:'chicken', goal:8, time:15 }));

        if(isEnemy && (loc.type==='city'||loc.type==='castle')) {
            this.addBtn(ac, '⚔️ Kuşat ve Saldır!', () => this.besiegeLocation(loc));
        } else {
            if(loc.type === 'city') {
                this.addBtn(ac, '🛒 Pazara Git', () => this.openMarket(loc));
                this.addBtn(ac, '🍺 Hana Gir', () => this.openTavern(loc));
                this.addBtn(ac, '⛓️ Köle Tüccarı', () => this.openSlaveTrader());
                if(state.activeTournaments[loc.id]) {
                    this.addBtn(ac, '🏆 Turnuvaya Katıl', () => this.joinTournament(loc));
                }
                this.addBtn(ac, '👑 Lordlar Salonuna Git', () => Nobles.openHall(loc));
                if(state.feast && state.feast.locId === loc.id) {
                    this.addBtn(ac, '🍷 Şölene Katıl', () => Feast.open(loc));
                } else if(state.player.vassalOf && loc.faction === state.player.vassalOf) {
                    this.addBtn(ac, '🍷 Şölen Ver (3000 Dinar + 30 et/peynir)', () => Feast.host(loc));
                }
                if(loc.volunteersAvailable > 0) {
                    this.addBtn(ac, '🪖 Gönüllü Topla', () => this.recruitVolunteers(loc));
                }
            } else if(loc.type === 'castle') {
                this.addBtn(ac, '👑 Lordlar Salonuna Git', () => Nobles.openHall(loc));
                if(state.feast && state.feast.locId === loc.id) {
                    this.addBtn(ac, '🍷 Şölene Katıl', () => Feast.open(loc));
                }
            } else if(loc.type === 'village') {
                this.addBtn(ac, '🧓 Köy Yaşlısıyla Konuş', () => this.talkToElder(loc));
                if(loc.volunteersAvailable > 0) {
                    this.addBtn(ac, '🪖 Gönüllü Topla', () => this.recruitVolunteers(loc));
                }
                this.addBtn(ac, '🛒 Erzak Al', () => this.openMarket(loc));
            }
        }
        if(!state.player.vassalOf && (loc.type==='city'||loc.type==='castle')) {
            this.addBtn(ac, '⚔️ Saldır! (Kendi Krallığını Kur)', () => this.besiegeLocation(loc, true));
        }
        this.addBtn(ac, '🚪 Ayrıl', () => this.showScreen('map'));
    },

    addBtn(container, text, cb) {
        let b = document.createElement('button');
        b.className = 'btn'; b.innerHTML = text; b.onclick = cb;
        container.appendChild(b);
    },

    showModal(html, width = '600px', bgImage = null) {
        let mc = document.getElementById('modal-content');
        mc.style.width = width;
        mc.style.maxWidth = '90vw';
        if(bgImage) {
            mc.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.9)), url('${bgImage}')`;
            mc.style.backgroundSize = 'cover';
            mc.style.backgroundPosition = 'center';
        } else {
            mc.style.backgroundImage = 'none';
            mc.style.background = 'rgba(20, 20, 25, 0.95)';
        }
        document.getElementById('modal-body').innerHTML = html;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },
    closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); },

    // --- MARKET ---
    openMarket(loc) {
        let html = `<h3>🛒 Pazar - ${loc.name}</h3>
        <div style="display:flex;gap:2rem;margin-top:1rem;">
        <div style="flex:1;"><h4>Satın Al</h4><ul id="market-buy" style="list-style:none;"></ul></div>
        <div style="flex:1;"><h4>Sat</h4><ul id="market-sell" style="list-style:none;"></ul></div>
        </div>
        <div id="market-msg" style="min-height:1.4rem;margin-top:0.8rem;font-size:0.9rem"></div>`;
        this.showModal(html);
        this._marketLoc = loc;
        this._marketMult = (0.8 + Math.random()*0.4) * (1.15 - (loc.prosperity || 50) / 400);  // bolluk fiyatı düşürür
        this.refreshMarket();
    },
    // Fiyat butonun HTML'inden parametre olarak gelmemeli: DOM'dan değiştirilerek
    // bedavaya alışveriş yapılabiliyor, eksik parametrede para NaN oluyordu.
    marketPrice(id, selling = false) {
        let it = ITEMS[id] || state.player.inventory.find(i => i.id === id);
        if(!it) return null;
        // Ticaret yeteneği: alışta indirim, satışta prim (en fazla %25)
        let edge = Math.min(0.25, (this.profLvl('trade') - 1) * 0.02);
        let mult = (this._marketMult || 1) * (selling ? 0.7 * (1 + edge) : 1 - edge);
        return Math.max(1, Math.floor(it.basePrice * mult));
    },
    refreshMarket() {
        let buy = document.getElementById('market-buy'); buy.innerHTML = '';
        Object.values(ITEMS).forEach(item => {
            let price = this.marketPrice(item.id);
            let li = document.createElement('li'); li.style.marginBottom = '0.5rem';
            let note = this.itemNote(item);
            li.innerHTML = `${item.icon} ${item.name} - <b>${price}₺</b> `
                + `<button class="btn" style="padding:0.2rem 0.5rem;font-size:0.8rem" onclick="Game.buyItem('${item.id}')">Al</button> `
                + `<button class="btn" style="padding:0.2rem 0.5rem;font-size:0.8rem" onclick="Game.buyItem('${item.id}',5)">x5</button>`
                + (note ? `<div style="font-size:0.7rem;color:#cbb26b">${note}</div>` : '');
            buy.appendChild(li);
        });
        let sell = document.getElementById('market-sell'); sell.innerHTML = '';
        state.player.inventory.forEach(item => {
            if(item.type === 'trade') {
                let price = this.marketPrice(item.id, true);
                let li = document.createElement('li'); li.style.marginBottom = '0.5rem';
                li.innerHTML = `${item.icon||'📦'} ${item.name} x${item.qty} - <b>${price}₺</b> `
                    + `<button class="btn" style="padding:0.2rem 0.5rem;font-size:0.8rem" onclick="Game.sellItem('${item.id}')">Sat</button> `
                    + (item.qty >= 5 ? `<button class="btn" style="padding:0.2rem 0.5rem;font-size:0.8rem" onclick="Game.sellItem('${item.id}',5)">x5</button>` : '');
                sell.appendChild(li);
            }
        });
    },
    // Alışverişin sonucu modalin içinde görünsün: alert() pazarı kapatırdı.
    marketMsg(html, ok = true) {
        this.setHtml('market-msg', `<span style="color:${ok ? 'var(--success)' : 'var(--danger)'}">${html}</span>`);
    },
    buyItem(id, n = 1) {
        let price = this.marketPrice(id);
        if(price === null) return alert('Bu eşya pazarda yok.');
        // Parası yetmiyorsa alabildiği kadarını al, sessizce hiçbir şey yapma.
        let can = Math.min(n, Math.floor(state.player.money / price));
        if(can <= 0) return this.marketMsg(`Yeterli dinarın yok — ${ITEMS[id].name} ${price}₺, kasanda ${Math.floor(state.player.money)}₺.`, false);
        let cost = price * can;
        state.player.money -= cost;
        let ex = state.player.inventory.find(i=>i.id===id);
        if(ex) ex.qty += can; else state.player.inventory.push({...ITEMS[id], qty:can});
        this.addProficiencyXp('trade', 4 * can);
        Quests.emit('bought_item', { itemId: id, qty: can, locId: this._marketLoc ? this._marketLoc.id : null });
        let have = state.player.inventory.find(i=>i.id===id);
        this.marketMsg(`${ITEMS[id].icon} <b>${ITEMS[id].name} x${can}</b> alındı · <b>-${cost}₺</b> · kasa <b>${Math.floor(state.player.money)}₺</b> · elde ${have ? have.qty : 0}`
            + (can < n ? ` <i>(paran ${n} taneye yetmedi)</i>` : ''));
        this.updateTopBar(); this.refreshMarket();
    },
    sellItem(id, n = 1) {
        let idx = state.player.inventory.findIndex(i => i.id === id);
        if(idx === -1) return;
        let item = state.player.inventory[idx];
        if(item.type !== 'trade') return alert('Bu eşya pazarda satılmıyor.');
        let can = Math.min(n, item.qty);
        let price = this.marketPrice(id, true), gain = price * can;
        state.player.money += gain;
        this.addProficiencyXp('trade', 4 * can);
        item.qty -= can;
        if(item.qty <= 0) state.player.inventory.splice(idx,1);
        this.marketMsg(`${item.icon||'📦'} <b>${item.name} x${can}</b> satıldı · <b>+${gain}₺</b> · kasa <b>${Math.floor(state.player.money)}₺</b> · elde ${Math.max(0,item.qty)}`);
        this.updateTopBar(); this.refreshMarket();
    },

    // --- TAVERN ---
    openTavern(loc) {
        let html = `<h3>🍺 Han - ${loc.name}</h3><p>Hancı sana gülümsüyor. "Hoşgeldin yolcu!"</p>
        <p>Burada dinlenip canını yenileyebilirsin. (10 Dinar)</p>
        <button class="btn primary" onclick="Game.restAtTavern()">Dinlen</button>
        <hr style="border-color:var(--panel-border);margin:1.2rem 0">
        <h4 style="color:var(--primary)">🎵 Köşedeki Ozan</h4>
        <p style="font-size:0.9rem;color:var(--text-muted)">"Bir kadeh ve biraz gümüş, sana bir dize öğretirim. Kime okuyacağın seni ilgilendirir."</p>
        <div style="display:flex;flex-direction:column;gap:0.4rem;margin-top:0.6rem">`;
        POEMS.forEach(p => {
            html += state.player.poems.includes(p.id)
                ? `<button class="btn" disabled style="opacity:0.4;font-size:0.85rem">${p.name} (ezberinde)</button>`
                : `<button class="btn" style="font-size:0.85rem" onclick="Game.learnPoem('${p.id}')">${p.name} — ${p.cost} Dinar</button>`;
        });
        html += `</div>`;

        // Paralı askerler — parayı doğrudan hazır seviyeli askere çevirmenin tek yolu
        let pool = this.mercPool(loc);
        html += `<hr style="border-color:var(--panel-border);margin:1.2rem 0">
            <h4 style="color:var(--primary)">🗡️ Paralı Askerler</h4>
            <p style="font-size:0.9rem;color:var(--text-muted)">"Sadakat pahalıdır, biz peşin çalışırız."</p>`;
        if(!pool.list.length) html += `<p style="color:var(--text-muted)">Bu şehirde şu an boşta adam yok.</p>`;
        pool.list.forEach((m, i) => {
            let price = this.mercPrice(m);
            let space = Math.max(0, this.getPartyCapacity() - state.player.party.length);
            let max = Math.min(m.count, space, Math.floor(state.player.money / price));
            let st = this.troopStats({ name: m.name });
            html += `<div style="background:rgba(0,0,0,0.25);border:1px solid var(--panel-border);border-radius:6px;padding:0.7rem;margin-bottom:0.5rem">
                <b>${st.icon} ${m.name}</b> <span style="font-size:0.8rem;color:var(--text-muted)">· seviye ${m.level} · ${m.count} kişi · kişi başı ${price} dinar</span>`;
            html += max > 0
                ? `<input type="range" id="merc-n-${i}" min="1" max="${max}" value="${max}" style="width:100%;margin:0.5rem 0"
                        oninput="Game.updateMercLabel(${i}, ${price})">
                   <button class="btn primary" id="merc-btn-${i}" style="font-size:0.85rem"
                        onclick="Game.hireMercs('${loc.id}', ${i}, +document.getElementById('merc-n-${i}').value)">Tut: ${max} kişi (${max * price} Dinar)</button>`
                : `<div style="font-size:0.85rem;color:var(--danger);margin-top:0.4rem">${space <= 0 ? 'Grubunda yer yok.' : 'Kesen yetmiyor.'}</div>`;
            html += `</div>`;
        });

        // Lonca ustası
        html += `<hr style="border-color:var(--panel-border);margin:1.2rem 0">
            <h4 style="color:var(--primary)">⚖️ Lonca Ustası</h4>
            <p style="font-size:0.9rem;color:var(--text-muted)">Köşedeki masada, defterine bir şeyler yazıyor.</p>
            <button class="btn" onclick="Quests.offerMenu('guild_${loc.id}')">İşi Sor</button>`;

        // Handaki yoldaşlar
        let here = COMPANIONS.filter(c => c.city === loc.id && !state.player.party.some(t => t.companionId === c.id));
        if(here.length) {
            html += `<hr style="border-color:var(--panel-border);margin:1.2rem 0">
                <h4 style="color:var(--primary)">🎖️ Köşedeki Yabancılar</h4>`;
            here.forEach(c => {
                let rival = c.dislikes.map(d => state.player.party.find(t => t.companionId === d)).find(Boolean);
                html += `<div style="background:rgba(0,0,0,0.25);border:1px solid var(--panel-border);border-radius:6px;padding:0.8rem;margin-bottom:0.5rem">
                    <b>${c.icon} ${c.name}</b> <span style="font-size:0.8rem;color:var(--text-muted)">· ${this.profName(c.skill)} ${c.level}</span>
                    <div style="font-size:0.85rem;font-style:italic;color:var(--text-muted);margin:0.3rem 0">${c.lore}</div>
                    ${rival
                        ? `<button class="btn" disabled style="opacity:0.5;font-size:0.85rem">${rival.name} grubundayken katılmaz</button>`
                        : `<button class="btn primary" style="font-size:0.85rem" onclick="Game.hireCompanion('${c.id}')">Gruba Kat (${c.cost} Dinar)</button>`}
                </div>`;
            });
        }

        this.showModal(html);
        this._tavernLoc = loc;
    },
    // Paralı asker havuzu şehir başına 3 günde bir tazelenir
    mercPool(loc) {
        state.mercPools = state.mercPools || {};
        let p = state.mercPools[loc.id];
        if(!p || state.time.day - p.day >= 3) {
            let names = this.factionTroopPool(loc.faction);
            let list = [];
            for(let i = 0; i < 2; i++) {
                let name = names[Math.floor(Math.random() * names.length)];
                if(list.some(x => x.name === name)) continue;
                list.push({ name, level: 10 + Math.floor(Math.random() * 6), count: 3 + Math.floor(Math.random() * 6) });
            }
            p = state.mercPools[loc.id] = { day: state.time.day, list };
        }
        return p;
    },
    mercPrice(m) { return 60 + m.level * 12; },

    // Yerleşimin fraksiyonu hangi köylüyü verir; bilinmeyen fraksiyon Svadya ağacına düşer
    tree(faction) { return TROOP_TREES[faction] || TROOP_TREES.swadia; },
    recruitName(loc) { return this.tree(loc && loc.faction).recruit[0]; },
    // Fraksiyon ordusu havuzu: her daldan 2 pay orta, 1 pay elit
    factionTroopPool(faction) {
        let pool = [];
        this.tree(faction).branches.forEach(b => pool.push(b[0][0], b[0][0], b[1][0]));
        return pool;
    },

    updateMercLabel(i, price) {
        let n = +document.getElementById('merc-n-' + i).value;
        this.setHtml('merc-btn-' + i, `Tut: ${n} kişi (${n * price} Dinar)`);
    },

    hireMercs(locId, idx, n) {
        let loc = LOCATIONS.find(l => l.id === locId);
        let pool = this.mercPool(loc);
        let m = pool.list[idx];
        if(!m) return;
        let price = this.mercPrice(m);
        n = Math.min(n, m.count, Math.max(0, this.getPartyCapacity() - state.player.party.length), Math.floor(state.player.money / price));
        if(n < 1) return alert('Alacak adam yok.');
        state.player.money -= n * price;
        m.count -= n;
        for(let i = 0; i < n; i++) {
            state.player.party.push({
                id: 'merc_' + Math.random().toString(36).substr(2,9),
                name: m.name, level: m.level, xp: 0,
                xpNext: m.level < 30 ? 3 + m.level : 5 + m.level * 2
            });
        }
        if(m.count <= 0) pool.list.splice(idx, 1);
        this.updateTopBar();
        this.openTavern(loc);
    },

    profName(id) {
        let m = { surgery:'Cerrahlık', spotting:'Gözcülük', pathfinding:'Yol Bulma', trade:'Ticaret',
                  looting:'Yağma', trainer:'Eğitim', prisonerMgmt:'Esir Yönetimi' };
        return m[id] || id;
    },

    hireCompanion(cid) {
        let c = COMPANIONS.find(x => x.id === cid);
        if(!c || state.player.party.some(t => t.companionId === cid)) return;
        if(state.player.party.length >= this.getPartyCapacity()) return alert('Grubun dolu. "Kalabalığa karışmam ben."');
        let rival = c.dislikes.map(d => state.player.party.find(t => t.companionId === d)).find(Boolean);
        // ponytail: husumet katılmayı engeller; Warband'daki "sonradan çekip gitme"
        // için grup içi olay sistemi gerekirdi, bu kadarı hikâyeyi veriyor.
        if(rival) return alert(`"${rival.name} mi? O adamla aynı çadırda uyumam." (Katılmadı)`);
        if(state.player.money < c.cost) return alert('Kesen yetmiyor. "Bedavaya kimse kılıç sallamaz."');
        state.player.money -= c.cost;
        state.player.party.push({
            id: 'comp_' + c.id, companionId: c.id, isCompanion: true,
            name: c.name, level: c.level, xp: 0, xpNext: 3 + c.level
        });
        this.updateTopBar();
        alert(`${c.name} gruba katıldı. ${this.profName(c.skill)} yeteneği artık grubuna işliyor (seviye ${c.level}).`);
        if(this._tavernLoc) this.openTavern(this._tavernLoc);
    },

    learnPoem(pid) {
        let p = POEMS.find(x => x.id === pid);
        if(state.player.poems.includes(pid)) return;
        if(state.player.money < p.cost) return alert('Ozan kadehini kaldırmadı. Paran yetmiyor.');
        state.player.money -= p.cost;
        state.player.poems.push(pid);
        this.updateTopBar();
        alert(`${p.text}\n\nOzan üç kez tekrarlattı. Artık ezberinde.`);
        if(this._tavernLoc) this.openTavern(this._tavernLoc);
    },
    restAtTavern() {
        if(state.player.money >= 10) {
            state.player.money -= 10;
            state.player.stats.hp = state.player.stats.maxHp;
            this.updateTopBar(); this.closeModal();
            alert('Dinlendin! Canın tamamen yenilendi.');
        } else alert('Yeterli dinarın yok!');
    },

    // --- TOURNAMENT ---
    joinTournament(loc) {
        if(!state.activeTournaments[loc.id]) {
            this.showModal(`<h3>🏆 Turnuva Alanı</h3><p>Şu anda bu şehirde turnuva düzenlenmiyor.</p>`);
            return;
        }
        this.showModal(`<h3>🏆 Büyük Turnuva!</h3>
        <p>Ödül: <b>500 Dinar</b> ve <b>+20 Nam</b></p>
        <p>Kaybedersen turnuva sona erer.</p>
        <button class="btn primary" style="margin-top:1rem" onclick="Game.startTournament('${loc.id}')">⚔️ Arenaya Çık!</button>`);
    },
    startTournament(locId) {
        this.closeModal();
        delete state.activeTournaments[locId];
        TournamentMinigame.start();
    },

    // Garnizon refahla büyür — kuşatma ekranı da harita künyesi de aynı sayıyı kullanır
    garrisonOf(loc) {
        let base = loc.type === 'city' ? 30 : loc.type === 'castle' ? 15 : 0;
        return Math.round(base * (0.6 + (loc.prosperity || 50) / 125));
    },
    // Yerleşimin sahibi lord; köylerin kendi lordu yok, en yakın kale/şehre bağlıdırlar
    ownerLord(loc) {
        if(typeof LORDS === 'undefined') return null;
        let own = LORDS.find(x => x.homeLocId === loc.id);
        if(own) return own;
        let seats = LOCATIONS.filter(x => x.faction === loc.faction && LORDS.some(y => y.homeLocId === x.id));
        let near = seats.sort((a, b) => this.dist(a, loc) - this.dist(b, loc))[0];
        return near ? LORDS.find(y => y.homeLocId === near.id) : null;
    },
    // Parti künyesi. Seni tutan partide kendi askerlerinin yanında sen ve
    // yanındaki diğer esirler de görünür (esaret modeli: state.player.prisoner).
    npcTipHtml(npc) {
        let bk = BAND_KINDS[npc.band];
        let what = bk ? (bk.beast ? 'Yaratık sürüsü' : 'Haydut çetesi')
                      : (FACTIONS[npc.faction] || { name: 'Bağımsız' }).name;
        let html = `${what}<br>Asker: ${npc.size}`;
        let pr = state.player.prisoner;
        if(pr && pr.npcId === npc.id) {
            html += `<br><span style="color:#ff8f82">⛓️ Esirleri:</span> ${state.player.name} (sen)`
                  + (pr.fellows && pr.fellows.length ? `, ${pr.fellows.join(', ')}` : '');
        }
        return html;
    },
    // Harita künyesi: kimin toprağı, kim yönetiyor, ne kadar zengin, kaç asker bekliyor
    locTipHtml(loc) {
        let f = FACTIONS[loc.faction] || { name: '?' };
        let type = loc.type === 'city' ? 'Şehir' : loc.type === 'castle' ? 'Kale' : 'Köy';
        let pr = Math.round(loc.prosperity || 50);
        let prLbl = pr >= 75 ? 'Zengin' : pr >= 58 ? 'Müreffeh' : pr >= 42 ? 'İdare eder' : 'Yoksul';
        let g = this.garrisonOf(loc);
        let lord = this.ownerLord(loc);
        let rel = lord && typeof Nobles !== 'undefined' ? Nobles.rel(lord.id) : 0;
        let hostile = state.player.vassalOf && state.player.vassalOf !== loc.faction;
        return `${f.name} · ${type}<br>`
            + (lord ? `Sahibi: ${lord.name} (${Nobles.relLabel(rel)})<br>` : '')
            + `Refah: ${prLbl} <span style="color:var(--text-muted)">(${pr})</span><br>`
            + (g ? `Garnizon: ~${g} asker<br>` : '')
            + (loc.volunteersAvailable !== undefined ? `Gönüllü: ${loc.volunteersAvailable} kişi<br>` : '')
            + (hostile ? `<span style="color:#e0463a">⚔️ Düşman toprağı — sadece kuşatma</span>`
                       : `<span style="color:#2ecc71">Kapılar sana açık</span>`);
    },
    // Yenilgide nam kaybı: düşman senden ne kadar zayıfsa rezillik o kadar büyük.
    // pow = düşmanın güç puanı (asker başına seviye+1)
    defeatRenown(pow) {
        let mine = state.player.stats.level +
                   state.player.party.reduce((a, t) => a + (t.level || 1) + 1, 0);
        let r = Math.min(1, pow / Math.max(1, mine));
        let loss = 2 + Math.round(18 * (1 - r)) + Math.floor((state.player.renown || 0) * 0.02 * (1 - r));
        return Math.min(state.player.renown || 0, loss);
    },

    // --- SIEGE ---
    besiegeLocation(loc, founding = false) {
        let garrison = this.garrisonOf(loc);
        this.showModal(`<h3>🏰 Kuşatma - ${loc.name}</h3>
        <p>Garnizonda tahmini <b>${garrison}</b> asker var.</p>
        <button class="btn primary" onclick="Game.closeModal(); Game.startSiege('${loc.id}',${garrison},${founding})">⚔️ Saldırıya Geç!</button>
        <button class="btn" onclick="Game.closeModal()">Vazgeç</button>`);
    },
    startSiege(locId, count, founding) {
        state.player.currentSiege = { locId, foundingKingdom: founding };
        let loc = LOCATIONS.find(l => l.id === locId);
        Battle.start('Garnizon', count, null, loc ? loc.faction : null);
    },

    // --- VILLAGE ---
    talkToElder(loc) {
        let dialog = this.getHumorousDialog('elder', loc);
        this.showModal(`<h3>🧓 Köy Yaşlısı</h3><p><i>${dialog}</i></p>`);
    },
    // Kaç gönüllü alınacağı seçilebilir. Eskiden hepsini almak zorunluydu:
    // kapasitede 3 yer varken 5 gönüllülük köyden tek asker bile alınamıyordu.
    recruitVolunteers(loc) {
        let cost = 10;
        let avail = loc.volunteersAvailable;
        let space = Math.max(0, this.getPartyCapacity() - state.player.party.length);
        let afford = Math.floor(state.player.money / cost);
        let max = Math.min(avail, space, afford);

        if(max <= 0) {
            return this.showModal(`<h3>🪖 Gönüllü Topla</h3>
            <p>${avail} gönüllü hazır. Kişi başı ${cost} Dinar.</p>
            <p style="color:var(--danger)">${space <= 0 ? 'Grubunda yer yok.' : 'Bir gönüllüye bile yetecek dinarın yok.'}</p>`);
        }

        this.showModal(`<h3>🪖 Gönüllü Topla</h3>
        <p>${avail} gönüllü hazır. Kişi başı ${cost} Dinar. En fazla <b>${max}</b> kişi alabilirsin.</p>
        <input type="range" id="recruit-n" min="1" max="${max}" value="${max}" style="width:100%;margin:0.8rem 0"
               oninput="Game.updateRecruitLabel(${cost})">
        <button class="btn primary" id="recruit-btn"
                onclick="Game.doRecruit('${loc.id}', +document.getElementById('recruit-n').value, ${cost})"></button>`);
        this.updateRecruitLabel(cost);
    },
    updateRecruitLabel(cost) {
        let n = +document.getElementById('recruit-n').value;
        this.setHtml('recruit-btn', `İşe Al: ${n} kişi (${n * cost} Dinar)`);
    },
    doRecruit(locId, amount, cost) {
        let loc = LOCATIONS.find(l => l.id === locId);
        amount = Math.min(amount, loc ? loc.volunteersAvailable : amount);
        let total = amount * cost;
        if(amount < 1) return alert('Alınacak gönüllü yok!');
        if(state.player.money < total) return alert('Yeterli dinarın yok!');
        if(state.player.party.length + amount > this.getPartyCapacity()) return alert('Grubunda yer yok!');
        state.player.money -= total;
        if(loc) {
            loc.volunteersAvailable -= amount;
            loc.lastRecruitDay = state.time.day;
        }
        
        for(let i=0;i<amount;i++) {
            state.player.party.push({
                id: 'troop_' + Math.random().toString(36).substr(2,9),
                name: this.recruitName(loc),
                level: 1,
                xp: 0,
                xpNext: 3,
                type: 'infantry'
            });
        }
        this.closeModal(); this.updateTopBar();
        if(loc) this.enterLocation(loc); // Arayüzü yenile
        alert(`${amount} gönüllü gruba katıldı!`);
    },

    // --- LORE ---
    showLore(type) {
        let title = type === 'lords' ? 'Kalradya Lordları' : 'Kalradya Krallıkları';
        let modalHtml = `<div style="text-align:center;">
            <h2 style="font-family:'Cinzel',serif;color:#ffcc00;font-size:2.5rem;margin-bottom:2rem;text-shadow:0 0 10px rgba(255,204,0,0.5);">${title}</h2>
            <div style="display:flex;flex-direction:column;gap:1.5rem;text-align:left;max-height:65vh;overflow-y:auto;padding-right:1rem;">`;

        const frame = inner => `<div style="padding:12px;background:linear-gradient(135deg,#5c3a21,#2a160b);
            box-shadow:inset 0 0 15px #000,0 10px 20px rgba(0,0,0,0.9);border:2px solid #111;display:inline-block;">
            <div style="border:6px ridge #dca243;padding:4px;background:#1a0b02;box-shadow:inset 0 0 10px #000;">${inner}</div></div>`;

        const row = (imgHtml, color, name, sub, text) => `
            <div style="display:flex;gap:2rem;align-items:center;background:rgba(0,0,0,0.6);padding:1.2rem 2rem;border-radius:8px;">
                ${imgHtml}
                <div>
                    <h3 style="color:${color};font-size:1.6rem;margin-bottom:0.2rem;font-family:'Cinzel',serif;">${name}</h3>
                    <div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.5rem">${sub}</div>
                    <p style="color:#eee;line-height:1.4;font-size:1.2rem;font-family:'Cormorant Garamond','Georgia',serif;font-style:italic;">${text}</p>
                </div>
            </div>`;

        if(type === 'lords') {
            LORDS.forEach(l => {
                let f = FACTIONS[l.faction] || { name:'Bilinmiyor', color:'#fff' };
                let home = LOCATIONS.find(x => x.id === l.homeLocId);
                modalHtml += row(frame(Nobles.portraitCss(l, 140)), f.color, l.name,
                    `${f.name} · ${PERSONALITIES[l.personality].name}${home ? ' · ' + home.name : ''}`, l.lore);
            });
            LADIES.forEach(L => {
                let f = FACTIONS[L.faction] || { name:'Bilinmiyor', color:'#fff' };
                modalHtml += row(frame(Nobles.portraitCss(L, 140)), '#ff9ec4', L.name,
                    `${f.name} · ${LADY_TRAITS[L.trait].name} · Vasisi: ${(Nobles.lord(L.guardianId)||{name:'?'}).name}`, L.lore);
            });
        } else {
            let i = 0;
            Object.values(FACTIONS).forEach(f => {
                if(f.id === 'player' || f.id === 'player_kingdom') return;
                let crest = `<div style="width:140px;height:140px;background-image:url('kingdom_crests.jpg');
                    background-size:300% 300%;background-position:${(i%3)*50}% ${Math.floor(i/3)*50}%;filter:sepia(0.2) contrast(1.1);"></div>`;
                i++;
                modalHtml += row(frame(crest), f.color, f.name, `${f.ruler} · ${f.vizier}`, f.lore);
            });
        }

        modalHtml += `</div>
            <button class="btn primary" style="margin-top:2rem;width:200px;" onclick="Game.closeModal()">Kapat</button>
        </div>`;
        this.showModal(modalHtml, '1000px', 'bg_hdr.jpg');
    },

    // --- CHARACTER ---
    // Niteliğin şu an ne yaptığını efektif değere göre yazar (hedefe göre değil —
    // oyuncu neyi kazandığını değil, neyin işlediğini görmeli).
    attrEffect(k) {
        let v = this.attr(k);
        switch(k) {
            case 'str': return `Yakın dövüş saldırısı +${v.toFixed(1)}`;
            case 'agi': return `Harita hızı +${(v * 1.5).toFixed(1)} · savaş hızı +${(v * 0.5).toFixed(1)}`;
            case 'int': return `Görüş ${Math.round(this.getVisibility())} birim`;
            case 'cha': return `Grup kapasitesi +${Math.round((v - 10) * 3)}`;
            case 'vit': return `Max can +${Math.round((v - 10) * 5)} · ${this.hpRegenHours()} saatte 1 can`;
        }
        return '';
    },
    attrRowHtml(k, pts) {
        let a = this.ATTRS[k], s = state.player.stats;
        let eff = this.attr(k), tgt = s[k] || 10;
        let pct = tgt > 10 ? Math.max(0, Math.min(100, (eff - 10) / (tgt - 10) * 100)) : 100;
        let done = eff >= tgt - 0.001;
        return `<li>
            ${a.icon} <strong>${a.name}:</strong>
            <span style="color:${done ? '#fff' : 'var(--primary)'};font-size:1.05rem">${eff.toFixed(1)}</span>
            <span style="color:var(--text-muted)"> / ${tgt} hedef</span>
            ${pts > 0 ? `<button class="btn" style="padding:0 0.4rem;font-size:0.8rem;margin-left:0.5rem;" onclick="Game.addStat('${k}')">+</button>` : ''}
            ${done ? '' : `<div style="background:rgba(0,0,0,0.35);border-radius:3px;height:5px;margin:0.3rem 0;max-width:220px">
                <div style="background:var(--primary);height:100%;width:${pct}%;border-radius:3px"></div></div>`}
            <div style="font-size:0.75rem;color:var(--text-muted)">${this.attrEffect(k)}</div>
            ${done ? '' : `<div style="font-size:0.72rem;color:#cbb26b">Gelişimi: ${a.how}</div>`}
        </li>`;
    },
    renderCharacterScreen() {
        let p = state.player, s = p.stats;
        let xpBar = Math.floor(s.xp / s.xpNext * 100);
        let pts = s.attributePoints || 0;
        
        document.getElementById('char-stats').innerHTML = `
        <div style="display:flex;gap:2rem;">
        <div style="flex:1;">
            <h3 style="color:var(--primary)">${p.name}</h3>
            <p>Seviye: ${s.level} (XP: ${s.xp}/${s.xpNext})</p>
            <div style="background:rgba(0,0,0,0.3);border-radius:4px;height:8px;width:200px;margin:0.5rem 0;">
                <div style="background:var(--primary);height:100%;width:${xpBar}%;border-radius:4px;"></div>
            </div>
            <p>Can: ${Math.round(s.hp)}/${Math.round(s.maxHp)}</p>
            <p>Nam: ${p.renown} | İdare Hakkı: ${p.rightToRule}</p>
            <p>Bağlılık: ${p.vassalOf ? (FACTIONS[p.vassalOf]||{name:p.vassalOf}).name : 'Bağımsız'}</p>
            <p>Eş: ${p.spouse || 'Yok'}</p>
        </div>
        <div style="flex:1;">
            <h3 style="color:var(--primary)">Nitelikler ${pts > 0 ? `<span style="color:#2d2;font-size:0.9rem;">(${pts} Puan Dağıtılabilir)</span>` : ''}</h3>
            <p style="font-size:0.75rem;color:var(--text-muted);margin:-0.4rem 0 0.6rem">
                Puan vermek <b>hedefi</b> yükseltir. Sayının solundaki <b>efektif</b> değer, o niteliğe
                uygun oynadıkça hedefe yaklaşır — beklemek işe yaramaz.</p>
            <ul style="list-style:none;display:flex;flex-direction:column;gap:0.8rem;">
                ${Object.keys(this.ATTRS).map(k => this.attrRowHtml(k, pts)).join('')}
            </ul>
        </div>
        </div>`;

        let fp = s.focusPoints || 0;
        // Her yetenek ne yapıyor + şu anki değeri (geri bildirim: etkiler görünmüyordu)
        const L = id => this.profLvl(id);
        let profs = [
            { id: 'oneHanded', name: 'Tek Elli Silahlar', d: l => `Kılıç hasarı ×${(0.35 + Math.min(0.4, l*0.004)).toFixed(2)}` },
            { id: 'twoHanded', name: 'Çift Elli Silahlar', d: l => `Çift elli silah hasarı ×${(0.35 + Math.min(0.4, l*0.004)).toFixed(2)}` },
            { id: 'polearm', name: 'Göndergeli Silahlar', d: l => `Mızrak hasarı ×${(0.35 + Math.min(0.4, l*0.004)).toFixed(2)} (atlı şarjda ×2.6'ya kadar)` },
            { id: 'bow', name: 'Okçuluk', d: l => `Ok hasarı ×${(0.5 + Math.min(0.5, l*0.005)).toFixed(2)}, savaş başına ${24 + l*2} ok` },
            { id: 'riding', name: 'Binicilik', d: l => `Atlı savaş hızı ${Math.round(95 + this.attr('agi')*0.5 + (l-1)*3)}` },
            { id: 'athletics', name: 'Atletizm', d: l => `Yaya savaş hızı ${Math.round(50 + this.attr('agi')*0.5 + (l-1)*1.5)}` },
            { id: 'leadership', name: 'İdare', d: l => `Grup kapasitesi +${(L('leadership')-1)*4}, moral +${(L('leadership')-1)*3}` },
            { id: 'persuasion', name: 'İkna Kabiliyeti', d: () => 'Drahoma pazarlığı ve diyalog seçenekleri' },
            { id: 'surgery', name: 'Cerrahlık', d: () => `Ölen askerin yaralı kurtulma şansı %${Math.round(Math.min(0.75, 0.35 + L('surgery')*0.03)*100)}` },
            { id: 'prisonerMgmt', name: 'Esir Yönetimi', d: () => `Esir kapasitesi ${this.prisonerCapacity()}, kaçış şansı %${Math.max(1, 6 - L('prisonerMgmt')*0.5).toFixed(1)}` },
            { id: 'pathfinding', name: 'Yol Bulma', d: () => `Harita hızı +%${((L('pathfinding')-1)*2).toFixed(0)}` },
            { id: 'spotting', name: 'Gözcülük', d: () => `Görüş ${Math.round(this.getVisibility())} birim` },
            { id: 'trade', name: 'Ticaret', d: () => `Alışta indirim / satışta prim %${Math.round(Math.min(0.25, (L('trade')-1)*0.02)*100)}` },
            { id: 'looting', name: 'Yağma', d: () => `Savaş ganimeti +%${((L('looting')-1)*4).toFixed(0)}` },
            { id: 'trainer', name: 'Eğitim', d: () => `Her gün ${Math.max(0, L('trainer')-1)} askere +1 XP` }
        ];

        let profHtml = `<h3 style="color:var(--primary);margin-top:1.5rem;">Yetenekler ${fp > 0 ? `<span style="color:#2d2;font-size:0.9rem;">(${fp} Odak Puanı Dağıtılabilir)</span>` : ''}</h3>
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem;">Odak puanları yeteneklerin öğrenme hızını artırır (Bannerlord sistemi). Savaşarak gelişir.</p>
        <div style="display:flex;flex-wrap:wrap;gap:1rem;">`;
        
        profs.forEach(pr => {
            let pData = p.proficiencies[pr.id] || { level:1, xp:0, next:100, focus:0 };
            p.proficiencies[pr.id] = pData;
            let fill = (pData.xp / pData.next) * 100;
            let mult = 0.5 + (pData.focus||0);
            profHtml += `<div style="background:rgba(0,0,0,0.3);padding:0.8rem;border-radius:6px;width:48%;display:flex;justify-content:space-between;align-items:center;">
                <div style="flex:1">
                    <div style="font-weight:bold">${pr.name} (Seviye ${pData.level})</div>
                    <div style="font-size:0.75rem;color:#cbb26b">${pr.d(pData.level)}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">Öğrenme Hızı: x${mult} | Odak: ${pData.focus||0}/5</div>
                    <div style="background:rgba(0,0,0,0.5);border-radius:2px;height:4px;margin-top:4px;width:90%;">
                        <div style="background:var(--primary);height:100%;width:${fill}%;"></div>
                    </div>
                </div>
                <div>
                    ${(fp > 0 && (pData.focus||0) < 5) ? `<button class="btn primary" style="padding:0.2rem 0.5rem;font-size:0.8rem;" onclick="Game.addFocus('${pr.id}')">+</button>` : ''}
                </div>
            </div>`;
        });
        profHtml += `</div>`;
        document.getElementById('char-stats').innerHTML += profHtml;
    },
    addFocus(id) {
        let p = state.player;
        if((p.stats.focusPoints || 0) > 0) {
            let pData = p.proficiencies[id];
            if(!pData.focus) pData.focus = 0;
            if(pData.focus < 5) {
                pData.focus++;
                p.stats.focusPoints--;
                this.renderCharacterScreen();
                this.updateTopBar();
            }
        }
    },
    // Asker tecrübesi tek yerden geçer: savaşta öldürme de, Eğitim yeteneği de.
    giveTroopXp(t, n = 1) {
        if(!t || t.level >= 50) return null;                             // 50 üstü sadece Boss Nişanı ile
        if(TROOP_UPGRADES[t.name] && t.xp >= t.xpNext) return null;      // Terfiye hazır, XP almaz
        t.xp += n;
        if(t.xp < t.xpNext) return null;
        if(TROOP_UPGRADES[t.name]) return 'ready';
        t.level++;
        t.xp = 0;
        t.xpNext = t.level < 30 ? 3 + t.level : 5 + t.level * 2;
        return 'levelup';
    },

    // Parti yetenekleri "gruptaki en yüksek" kuralıyla çalışır: uzman bir
    // yoldaş kendi alanında oyuncunun seviyesinin yerine geçebilir.
    profLvl(id) {
        let lvl = (state.player.proficiencies[id] || { level: 1 }).level;
        state.player.party.forEach(t => {
            if(!t.isCompanion || t.wounded) return;
            let c = COMPANIONS.find(x => x.id === t.companionId);
            if(c && c.skill === id) lvl = Math.max(lvl, t.level);
        });
        return lvl;
    },

    addProficiencyXp(id, amount) {
        let pData = state.player.proficiencies[id];
        if(!pData) return;
        let mult = 0.5 + (pData.focus || 0);
        pData.xp += amount * mult;
        while(pData.xp >= pData.next) {
            pData.xp -= pData.next;
            pData.level++;
            pData.next = Math.floor(pData.next * 1.2);
            // Savaş içinde alert rahatsız eder, bu yüzden loglara eklenebilir veya console.
            console.log(`Yeteneğin gelişti: ${id} (Lvl ${pData.level})`);
        }
    },
    // Görüş tek kaynaktan: zeka + Gözcülük yeteneği. Eskiden state.player.visibility
    // yalnızca zeka puanı harcandığında güncelleniyordu.
    getVisibility() {
        return 500 + (this.attr('int') - 10) * 30 + (this.profLvl('spotting') - 1) * 25;
    },

    addStat(type) {
        let s = state.player.stats;
        if(s.attributePoints && s.attributePoints > 0) {
            s[type]++;
            s.attributePoints--;
            this.updateStatsFromEquip();
            this.renderCharacterScreen();
            this.updateTopBar();
        }
    },

    // --- PARTY ---
    renderPartyScreen() {
        let wounded = state.player.party.filter(t => t.wounded).length;
        let html = `<p>Kapasite: ${state.player.party.length}/${this.getPartyCapacity()}` +
            (wounded ? ` · <span style="color:#ffaa00">🩹 ${wounded} yaralı</span> (savaşa giremez)` : '') + `</p><hr style="margin:0.8rem 0;border-color:var(--panel-border)">`;
        if(state.player.party.length === 0) html += '<p>Grubunda hiç asker yok.</p>';
        else {
            let groups = {};
            state.player.party.forEach(t => {
                // efsaneviler ve yaralılar ayrı satırda listelenir
                let key = this.troopLabel(t) + (t.wounded ? ' 🩹 (yaralı)' : '');
                if(!groups[key]) {
                    groups[key] = { base: t.name, sample: t, count: 0, ready: [], normal: [], wounded: 0 };
                }
                if(t.wounded) groups[key].wounded = Math.max(groups[key].wounded, t.wounded);
                if(!t.legendary && !t.wounded && t.xp >= t.xpNext && TROOP_UPGRADES[t.name]) {
                    groups[key].ready.push(t);
                } else {
                    groups[key].normal.push(t);
                }
                groups[key].count++;
            });

            html += '<ul style="list-style:none;">';
            for(let name in groups) {
                let g = groups[name];
                let typeInfo = this.troopStats(g.sample);
                html += `<li style="padding:0.8rem;background:rgba(0,0,0,0.2);margin-bottom:0.5rem;border-radius:6px;display:flex;justify-content:space-between;align-items:center;border:1px solid var(--panel-border);">
                <div>
                    <span style="font-size:1.2rem;margin-right:0.5rem;">${typeInfo.icon}</span>
                    <strong style="color:var(--primary)">${name}</strong> x${g.count}
                    <div style="font-size:0.75rem;color:var(--text-muted)">Tür: ${typeInfo.type==='infantry'?'Piyade':typeInfo.type==='archer'?'Okçu':'Süvari'}${g.sample.isCompanion ? ` · Yoldaş · ${this.profName((COMPANIONS.find(c=>c.id===g.sample.companionId)||{}).skill)} ${g.sample.level} · 20 dinar/gün` : ''}${g.wounded ? ` · savaşamaz, ${g.wounded} gün` : ''}</div>
                </div>`;
                
                if(g.ready.length > 0) {
                    let upgradeChoices = TROOP_UPGRADES[g.base];
                    html += `<div style="display:flex;gap:0.4rem;margin-top:0.4rem;">`;
                    upgradeChoices.forEach(choice => {
                        html += `<button class="btn primary" style="font-size:0.75rem;padding:0.3rem 0.6rem" onclick="Game.promoteTroop('${g.base.replace(/'/g,"\\'")}', '${choice.name.replace(/'/g,"\\'")}', ${choice.cost})">
                            Sınıf Terfisi: ${choice.name} (${choice.cost} Dinar)
                        </button>`;
                    });
                    html += `</div>`;
                }

                let maxLevelTroop = g.normal.find(t => t.level === 50) || g.ready.find(t => t.level === 50);
                let hasToken = state.player.inventory.some(i => i.id === 'lvl51_token');
                if(maxLevelTroop && hasToken) {
                    html += `<div style="margin-top:0.5rem"><button class="btn" style="border-color:#aa00ff;color:#aa00ff;font-size:0.75rem;padding:0.3rem 0.6rem" onclick="Game.promoteTo51('${maxLevelTroop.id}')">🌟 Savaş Tanrısı Nişanı Kullan (Lvl 51 Yap)</button></div>`;
                }

                html += `</li>`;
            }
            html += '</ul>';
        }
        html += this.moraleHtml();
        html += this.prisonersHtml();
        document.getElementById('party-list').innerHTML = html;
    },
    // Efsanevi öneki yalnızca ekranda görünür, veride ad temiz kalır
    troopLabel(t) { return (t.legendary ? 'Efsanevi ' : '') + t.name; },

    // --- MORAL ---
    // Warband'ın moral sistemi: yemek çeşidi, maaş, idare ve kalabalık grubun
    // bir arada durmasını belirler. Moral düşünce asker firar eder, savaşta
    // bütün birlik zayıflar.
    moraleTarget(paid, hungry) {
        let p = state.player;
        let foods = ['wheat','bread','meat','cheese'].filter(id => p.inventory.some(i => i.id === id && i.qty > 0)).length;
        let over = Math.max(0, p.party.length - this.getPartyCapacity());
        let lead = (p.proficiencies.leadership || { level: 1 }).level;
        let parts = {
            'Temel': 50,
            'İdare yeteneği': (lead - 1) * 3,
            'Yemek çeşidi': foods * 5,
            'Açlık': hungry ? -30 : 0,
            // Sabit -25 yerine: borç büyüdükçe hedef de düşer. Asıl ceza saat başı
            // işleyen -1 moral (Game.wageDebtTick); bu satır moralin toparlanmasını engeller.
            'Maaş borcu': p.wageDebt > 0 ? -Math.min(40, 10 + Math.floor(p.wageDebt / Math.max(1, this.upkeep().wage)) * 10) : 0,
            'Kapasite aşımı': -over * 2
        };
        p.moraleInfo = parts;
        let t = Object.keys(parts).reduce((a, k) => a + parts[k], 0);
        return Math.max(0, Math.min(100, t));
    },

    // Künyeler ekranın dışına taşmasın. Eskiden her taşan rozete elle
    // 'left/right' veriliyordu (#chip-speed, #chip-time) — yeni bir rozet
    // eklenince yine kesiliyordu. Tek yerde, göründüğü anda kaydırılıyor.
    initTooltipClamp() {
        document.addEventListener('mouseover', e => {
            let c = e.target.closest && e.target.closest('.tooltip-container');
            if(!c) return;
            let t = c.querySelector('.tooltip-content');
            if(!t) return;
            t.style.transform = 'translateX(-50%)';
            let r = t.getBoundingClientRect(), pad = 10;
            let over = r.right - (window.innerWidth - pad), under = pad - r.left;
            if(over > 0) t.style.transform = `translateX(calc(-50% - ${Math.ceil(over)}px))`;
            else if(under > 0) t.style.transform = `translateX(calc(-50% + ${Math.ceil(under)}px))`;
        });
    },

    // Erzak bozulur: her türün kendi dayanıklılığı var (ITEMS[].spoil = gün).
    // Kesirli kayıp yığının üstünde birikir, tam birime ulaşınca düşer —
    // 3 birimlik yığın da sonsuza kadar durmasın.
    spoilFood() {
        for(let i = state.player.inventory.length - 1; i >= 0; i--) {
            let it = state.player.inventory[i];
            let sp = (ITEMS[it.id] || {}).spoil;
            if(!sp || it.qty <= 0) continue;
            it.decay = (it.decay || 0) + it.qty / sp;
            let n = Math.min(Math.floor(it.decay), it.qty);
            if(n <= 0) continue;
            it.decay -= n;
            it.qty -= n;
            if(it.qty <= 0) state.player.inventory.splice(i, 1);
        }
    },

    // Bugün bozulmayla kaç birim gidecek (künyede gösterilir).
    spoilRate() {
        return state.player.inventory.reduce((a, it) => {
            let sp = (ITEMS[it.id] || {}).spoil;
            return a + (sp ? it.qty / sp : 0);
        }, 0);
    },

    // Erzak durumu: elde ne var, günde ne gidiyor, kaç gün yeter.
    // Künye, uyarı ve envanter aynı hesabı kullansın diye tek yerde.
    foodStock() {
        let inv = state.player.inventory;
        let sum = q => inv.filter(i => q.includes(i.id)).reduce((a, i) => a + i.qty, 0);
        let low = sum(['wheat','bread']), high = sum(['meat','cheese']);
        let up = this.upkeep();
        let need = Math.ceil(up.foodLow);
        // Bozulma da stoğu yiyor; "kaç gün yeter" onu saymazsa iyimser çıkar.
        let drain = need + this.spoilRate();
        return {
            low, high, total: low + high,
            need, needHigh: Math.ceil(up.foodHigh), spoil: this.spoilRate(),
            // Karışık stokta bile doğru: yüksek kalite hem kendi payını hem genel payı kapatır
            days: drain > 0 ? Math.floor((low + high) / drain) : Infinity,
            kinds: ['wheat','bread','meat','cheese'].filter(id => inv.some(i => i.id === id && i.qty > 0)).length
        };
    },

    // Günlük gider: maaş + yemek. dailyUpdate ve üst çubuk künyesi aynı hesabı kullanır.
    upkeep() {
        let wage = 0, foodLow = 0, foodHigh = 0;
        state.player.party.forEach(t => {
            if(t.isCompanion) { wage += 20; foodLow += 1; return; } // yoldaş pahalıdır
            if(t.level >= 51) return;                               // efsanevi bedava
            if(t.level >= 20) wage += Math.floor(t.level / 2);
            else if(t.level >= 10) wage += 2;
            foodLow += t.level >= 20 ? 1.5 : 1;
            if(t.level >= 30) foodHigh += 1;
        });
        return { wage, foodLow, foodHigh };
    },

    // 0 morali de doğru okumak için: (p.morale || 50) sıfırı 50 sayıyordu
    morale() { return typeof state.player.morale === 'number' ? state.player.morale : 60; },

    updateMorale(paid, hungry) {
        let p = state.player;
        p.morale = this.morale();
        let t = this.moraleTarget(paid, hungry);
        // Moral hızlı düşer, yavaş toparlanır
        p.morale = Math.max(0, Math.min(100, p.morale + Math.max(-10, Math.min(4, t - p.morale))));

        if(p.morale < 25 && p.party.length > 0) {
            let n = Math.min(p.party.length, 1 + Math.floor((25 - p.morale) / 8));
            // ponytail: en son katılanlar ilk firar eder; rastgele seçim bir şey katmıyor
            let gone = p.party.splice(p.party.length - n, n);
            alert(`Moral çöktü! ${gone.length} asker gece kamptan kaçtı. (Moral ${Math.round(p.morale)})`);
        }
    },

    moraleLabel(m) {
        if(m >= 80) return '<span style="color:#2ecc71">Coşkulu</span>';
        if(m >= 60) return '<span style="color:#8ecf5a">Yüksek</span>';
        if(m >= 40) return '<span style="color:#ccc">Normal</span>';
        if(m >= 25) return '<span style="color:#e59b3d">Düşük</span>';
        return '<span style="color:#e74c3c">Çökmüş</span>';
    },

    // Moral savaşta bütün birliğin gücünü ölçekler (0 -> x0.8, 50 -> x1.0, 100 -> x1.2)
    moraleMult() { return 0.8 + this.morale() / 250; },

    moraleHtml() {
        let m = Math.round(this.morale());
        let info = state.player.moraleInfo || {};
        let rows = Object.keys(info).filter(k => info[k] !== 0)
            .map(k => `<div style="display:flex;justify-content:space-between"><span>${k}</span><span style="color:${info[k] > 0 ? '#2ecc71' : '#e74c3c'}">${info[k] > 0 ? '+' : ''}${info[k]}</span></div>`).join('');
        return `<h3 style="color:var(--primary);margin-top:1.5rem">🎺 Moral ${m}/100 — ${this.moraleLabel(m)}</h3>
            <div style="background:rgba(0,0,0,0.25);padding:0.8rem;border-radius:6px;font-size:0.85rem;line-height:1.6">
            ${rows || '<i>Henüz hesaplanmadı (bir gün geçmeli).</i>'}
            <div style="color:var(--text-muted);margin-top:0.4rem">Savaş gücü çarpanı: ×${this.moraleMult().toFixed(2)}${m < 25 ? ' · <span style="color:#e74c3c">firar başladı!</span>' : ''}</div>
            </div>`;
    },

    // --- ESİRLER ---
    // Kapasite Esir Yönetimi yeteneğine bağlı; soylu esirler de yer kaplar.
    prisonerCapacity() {
        let lvl = (state.player.proficiencies.prisonerMgmt || { level: 1 }).level;
        return 5 + (lvl - 1) * 3;
    },
    prisonerValue(p) {
        if(p.noble) return p.ransom || 0;
        let mult = p.type === 'cavalry' ? 1.5 : p.type === 'archer' ? 1.2 : 1;
        return Math.floor((25 + (p.level || 1) * 12) * mult);
    },

    openSlaveTrader(note) {
        let ps = state.player.prisoners;
        let html = `<h2 style="color:var(--primary);margin-top:0">⛓️ Köle Tüccarı</h2>`;
        if(note) html += `<p style="color:#ffcc00">${note}</p>`;
        let troops = ps.filter(p => !p.noble);
        if(troops.length === 0) {
            html += `<p style="color:var(--text-muted)">Tüccar boş ranzalarını gösteriyor: "Zincirim bol, malın yok. Git birkaç çapulcu topla da konuşalım."</p>`;
        } else {
            let groups = {};
            troops.forEach(t => {
                let key = t.name;
                if(!groups[key]) groups[key] = { count: 0, value: this.prisonerValue(t) };
                groups[key].count++;
            });
            let total = troops.reduce((a, t) => a + this.prisonerValue(t), 0);
            html += `<p style="color:var(--text-muted)">Tüccar esirlerini tek tek süzüyor.</p><ul style="list-style:none;padding:0">`;
            for(let name in groups) {
                let g = groups[name];
                html += `<li style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem;background:rgba(0,0,0,0.25);border:1px solid var(--panel-border);border-radius:6px;margin-bottom:0.4rem">
                    <span>⛓️ <b>${name}</b> x${g.count} <span style="color:var(--text-muted);font-size:0.8rem">(tanesi ${g.value} dinar)</span></span>
                    <button class="btn" style="font-size:0.8rem;padding:0.3rem 0.6rem" onclick="Game.sellPrisoners('${name.replace(/'/g,"\\'")}')">Sat (+${g.count * g.value})</button>
                </li>`;
            }
            html += `</ul><button class="btn primary" style="width:100%" onclick="Game.sellPrisoners()">Hepsini Sat (+${total} Dinar)</button>`;
        }
        if(ps.some(p => p.noble)) html += `<p style="color:#e59b3d;font-size:0.85rem;margin-top:0.8rem">Tüccar soylulara elini sürmez: "Onların fidyesi benim değil, senin işin." (Grup ekranından fidye iste)</p>`;
        html += `<button class="btn" style="width:100%;margin-top:0.8rem" onclick="Game.closeModal()">Ayrıl</button>`;
        this.showModal(html);
    },

    sellPrisoners(name) {
        let sold = 0, money = 0;
        state.player.prisoners = state.player.prisoners.filter(p => {
            if(p.noble || (name && p.name !== name)) return true;
            money += this.prisonerValue(p); sold++;
            return false;
        });
        if(!sold) return;
        state.player.money += money;
        this.addProficiencyXp('prisonerMgmt', 8 * sold);
        this.updateTopBar();
        // Not modalın içinde gösterilir; alert() showModal ile üst üste binerdi
        this.openSlaveTrader(`${sold} esir satıldı. +${money} dinar.`);
    },

    releasePrisoners(name) {
        let n = 0;
        state.player.prisoners = state.player.prisoners.filter(p => {
            if(p.noble || p.name !== name) return true;
            n++; return false;
        });
        if(n) { this.renderPartyScreen(); alert(`${n} esir salıverildi.`); }
    },

    // Fidye alınan ya da salıverilen lord haritaya döner — yoksa yenilen soylu
    // oyundan tamamen siliniyordu.
    respawnLordParty(pr) {
        let lord = Nobles.lord(pr.lordId);
        if(!lord || state.npcParties.some(n => n.lordId === lord.id)) return;
        let size = lord.rank === 'king' ? 60 : lord.rank === 'vizier' ? 30 : 20;
        let npc = this.createNPC(lord.name, lord.rank, size, FACTIONS[lord.faction].color, lord.faction, 1);
        npc.lordId = lord.id;
        let home = LOCATIONS.find(x => x.id === lord.homeLocId);
        if(home) { npc.x = home.x; npc.y = home.y; npc.targetX = home.x; npc.targetY = home.y; }
        state.npcParties.push(npc);
    },

    ransomLord(id) {
        let i = state.player.prisoners.findIndex(p => p.id === id);
        if(i === -1) return;
        let pr = state.player.prisoners.splice(i, 1)[0];
        state.player.money += pr.ransom;
        Nobles.addRel(pr.lordId, -20);
        LORDS.filter(l => l.faction === pr.faction && l.id !== pr.lordId).forEach(l => Nobles.addRel(l.id, -4));
        this.respawnLordParty(pr);
        this.addProficiencyXp('prisonerMgmt', 40);
        this.updateTopBar();
        this.renderPartyScreen();
        alert(`${pr.name} için ${pr.ransom} dinar fidye alındı. Serbest bıraktın ama bunu unutmayacak.`);
    },

    releaseLord(id) {
        let i = state.player.prisoners.findIndex(p => p.id === id);
        if(i === -1) return;
        let pr = state.player.prisoners.splice(i, 1)[0];
        Nobles.addRel(pr.lordId, 25);
        LORDS.filter(l => l.faction === pr.faction && l.id !== pr.lordId).forEach(l => Nobles.addRel(l.id, 6));
        state.player.renown += 3;
        this.respawnLordParty(pr);
        this.updateTopBar();
        this.renderPartyScreen();
        alert(`${pr.name}'i fidyesiz salıverdin. Bu şerefli davranış dilden dile dolaşacak. (+3 nam)`);
    },

    prisonersHtml() {
        let ps = state.player.prisoners || [];
        let html = `<h3 style="color:var(--primary);margin-top:1.5rem">⛓️ Esirler ${ps.length}/${this.prisonerCapacity()}</h3>`;
        if(ps.length === 0) return html + `<p style="color:var(--text-muted);font-size:0.85rem">Zincirlerin boş. Kazandığın savaşlarda düşen düşmanların bir kısmı esir alınır; şehirdeki köle tüccarına satılır.</p>`;
        let groups = {};
        html += '<ul style="list-style:none;padding:0">';
        ps.forEach(p => {
            if(p.noble) {
                html += `<li style="padding:0.8rem;background:rgba(0,0,0,0.25);border:1px solid #e59b3d;border-radius:6px;margin-bottom:0.5rem">
                    <b style="color:#e59b3d">👑 ${p.name}</b> <span style="font-size:0.8rem;color:var(--text-muted)">${(FACTIONS[p.faction]||{name:''}).name} · İlişki: ${Nobles.relLabel(Nobles.rel(p.lordId))}</span>
                    <div style="display:flex;gap:0.4rem;margin-top:0.5rem">
                        <button class="btn" style="font-size:0.8rem;padding:0.3rem 0.6rem" onclick="Game.ransomLord('${p.id}')">💰 Fidye İste (${p.ransom} Dinar)</button>
                        <button class="btn" style="font-size:0.8rem;padding:0.3rem 0.6rem;border-color:#2ecc71;color:#2ecc71" onclick="Game.releaseLord('${p.id}')">🕊️ Onurunla Salıver</button>
                    </div></li>`;
                return;
            }
            if(!groups[p.name]) groups[p.name] = { count: 0, value: this.prisonerValue(p) };
            groups[p.name].count++;
        });
        for(let name in groups) {
            let g = groups[name];
            html += `<li style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem;background:rgba(0,0,0,0.2);border:1px solid var(--panel-border);border-radius:6px;margin-bottom:0.4rem">
                <span>⛓️ <b>${name}</b> x${g.count} <span style="font-size:0.8rem;color:var(--text-muted)">(tanesi ~${g.value} dinar)</span></span>
                <button class="btn" style="font-size:0.75rem;padding:0.25rem 0.5rem" onclick="Game.releasePrisoners('${name.replace(/'/g,"\\'")}')">Salıver</button>
            </li>`;
        }
        return html + '</ul>';
    },

    promoteTo51(id) {
        let t = state.player.party.find(x => x.id === id);
        let tokenIdx = state.player.inventory.findIndex(i => i.id === 'lvl51_token');
        if(t && tokenIdx !== -1) {
            let token = state.player.inventory[tokenIdx];
            token.qty--;
            if(token.qty <= 0) state.player.inventory.splice(tokenIdx, 1);
            
            t.level = 51;
            // Adın başına 'Efsanevi ' eklemek TROOP_TYPES / TROOP_UPGRADES
            // anahtarını bozuyordu; önek artık yalnızca gösterimde.
            t.legendary = true;

            alert(`${this.troopLabel(t)} doğdu! Artık maaş istemez, yemek yemez ve muazzam güçlü!`);
            this.renderPartyScreen();
            this.updateTopBar();
        }
    },
    promoteTroop(oldName, newName, cost) {
        if(state.player.money < cost) return alert('Yeterli dinarın yok!');
        let troopIdx = state.player.party.findIndex(t => t.name === oldName && t.xp >= t.xpNext);
        if(troopIdx !== -1) {
            state.player.money -= cost;
            let t = state.player.party[troopIdx];
            t.name = newName;
            t.xp = 0;
            let nextTier = TROOP_UPGRADES[newName] ? 2 : 3;   // daha üstü yoksa elit kademe
            t.xpNext = nextTier * 4;
            t.level = nextTier === 3 ? 20 : 10;
            t.type = TROOP_TYPES[newName].type;
            
            this.updateTopBar();
            this.renderPartyScreen();
            alert(`Asker başarıyla ${newName} sınıfına terfi ettirildi!`);
        }
    },

    // --- INVENTORY ---
    renderInventoryScreen() {
        let e = state.player.equipment;
        let html = `<div style="display:flex;gap:2rem;">
        <div style="flex:1;">
            <h3 style="color:var(--primary)">Kuşanılan</h3>
            ${this._eqSlot('Silah','weapon',e.weapon)}
            ${this._eqSlot('Zırh','armor',e.armor)}
            ${this._eqSlot('At','horse',e.horse)}
        </div>
        <div style="flex:2;">
            <h3 style="color:var(--primary)">Çanta</h3>`;
        if(state.player.inventory.length === 0) html += '<p>Envanterin boş.</p>';
        else {
            html += '<div style="display:flex;gap:0.8rem;flex-wrap:wrap;">';
            state.player.inventory.forEach((item,i) => {
                let canEquip = item.type==='weapon'||item.type==='armor'||item.type==='horse';
                let isUse = item.type === 'special' && item.id === 'boss_map';
                html += `<div style="padding:0.8rem;background:rgba(0,0,0,0.3);border:1px solid var(--panel-border);border-radius:6px;width:120px;text-align:center;">
                <div style="font-size:1.5rem">${item.icon||'📦'}</div>
                <div style="font-weight:bold;font-size:0.9rem;margin-top:0.3rem">${item.name}</div>
                <div style="color:var(--text-muted);font-size:0.8rem">x${item.qty}</div>
                ${this.itemNote(item) ? `<div style="font-size:0.68rem;color:#cbb26b;line-height:1.2;margin-top:0.2rem">${this.itemNote(item)}</div>` : ''}
                ${canEquip ? `<button class="btn primary" style="font-size:0.7rem;padding:0.2rem 0.4rem;margin-top:0.3rem" onclick="Game.equipItem(${i})">Kuşan</button>` : ''}
                ${isUse ? `<button class="btn" style="border-color:#ffaa00;color:#ffaa00;font-size:0.7rem;padding:0.2rem 0.4rem;margin-top:0.3rem" onclick="Game.useItem(${i})">Kullan</button>` : ''}
                </div>`;
            });
            html += '</div>';
        }
        html += '</div></div>';
        document.getElementById('inventory-content').innerHTML = html;
    },
    // Silahın hasar türü künyesi — zırha karşı davranışı burada görünür
    itemNote(item) {
        if(!item) return '';
        let bits = [];
        if(item.attack) bits.push(`+${item.attack} saldırı`);
        if(item.defense) bits.push(`+${item.defense} savunma`);
        let t = DMG_TYPES[item.dmgType];
        if(t) bits.push(`${t.name} — düşman savunması %${Math.round(t.armor*100)} etkili, hasar ×${t.mult}${t.knock ? ', bayıltır (esir)' : ''}`);
        return bits.join(' · ');
    },

    _eqSlot(label, slot, item) {
        return `<div style="background:rgba(0,0,0,0.3);padding:0.8rem;border-radius:6px;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;">
        <div><div style="font-size:0.75rem;color:var(--text-muted)">${label}</div>
        <div style="font-weight:bold">${item ? (item.icon||'')+' '+item.name : 'Yok'}</div>
        ${item ? `<div style="font-size:0.72rem;color:#cbb26b">${this.itemNote(item)}</div>` : ''}</div>
        ${item ? `<button class="btn" style="font-size:0.75rem;padding:0.2rem 0.4rem" onclick="Game.unequipItem('${slot}')">Çıkar</button>` : ''}
        </div>`;
    },
    equipItem(idx) {
        let item = state.player.inventory[idx];
        let slot = item.type;
        if(state.player.equipment[slot]) this.unequipItem(slot, false);
        state.player.equipment[slot] = {...item, qty:1};
        item.qty--;
        if(item.qty <= 0) state.player.inventory.splice(idx, 1);
        this.updateStatsFromEquip();
        this.renderInventoryScreen();
    },
    useItem(idx) {
        let item = state.player.inventory[idx];
        if(item.id === 'boss_map') {
            state.bossEntries = (state.bossEntries || 0) + 1;
            if(state.bossEntries > 4) { alert("Boss haritasını daha fazla kullanamazsın!"); return; }
            item.qty--;
            if(item.qty <= 0) state.player.inventory.splice(idx, 1);
            this.renderInventoryScreen();
            
            let bossLevel = 30 + (state.bossEntries - 1) * 5; // İlk giriş 30, sonra zorlaşır
            Battle.start('Savaş Tanrısı (Boss)', 15 + state.bossEntries * 5, bossLevel);
        }
    },
    unequipItem(slot, reRender = true) {
        let item = state.player.equipment[slot];
        if(!item) return;
        let ex = state.player.inventory.find(i => i.id === item.id);
        if(ex) ex.qty++; else state.player.inventory.push({...item, qty:1});
        state.player.equipment[slot] = null;
        this.updateStatsFromEquip();
        if(reRender) this.renderInventoryScreen();
    },
    // Maksimum can tek bir formülden türetilir: taban + seviye + zırh.
    // Eskiden yalnızca zırha bakıyordu, bu yüzden nitelik puanı harcamak ya da
    // zırh giymek seviyeden gelen tüm canı siliyordu.
    updateStatsFromEquip() {
        let s = state.player.stats;
        let e = state.player.equipment;
        s.maxHp = 50 + (s.level - 1) * 10 + Math.round((this.attr('vit') - 10) * 5) + (e.armor ? (e.armor.defense||0) : 0);
        if(s.hp > s.maxHp) s.hp = s.maxHp;
    },

    // --- LEVEL UP ---
    checkLevelUp() {
        let s = state.player.stats;
        while(s.xp >= s.xpNext) {
            s.xp -= s.xpNext;
            s.level++;
            s.xpNext = Math.floor(s.xpNext * 1.5);
            s.attributePoints = (s.attributePoints || 0) + 1; // Seviye başına 1 puan (hedef sistemi geldi, puan seyrekleşti)
            s.focusPoints = (s.focusPoints || 0) + 3; // Bannerlord tarzı seviye başına 3 odak puanı
            this.updateStatsFromEquip(); // seviye +10 max can — tek formülden
            s.hp = s.maxHp;
            alert(`Seviye atladın! Artık Lvl ${s.level}. <b>1 Nitelik</b>, 3 Odak Puanı kazandın.<br>` +
                  `Nitelik puanı bir <b>hedef</b> koyar; efektif değer o niteliğe uygun oynadıkça yükselir.`);
        }
        this.updateTopBar();
    },

};

// --- BATTLE ---
const Battle = {
    canvas: null, ctx: null, units: [], projectiles: [], bloodStains: [], floatingTexts: [], active: false, loopId: null, clickHandler: null, commandListener: null, currentCommand: 'charge',
    swings: [], sparks: [], corpses: [], knockedOut: false, grass: null,

    // Rakip talip düellosu: 1'e 1, grup yok, ganimet yok
    startDuel(lord) {
        this._duelParty = state.player.party;
        state.player.party = [];
        this.isDuel = true;
        this.start(lord.name, 1);
        let e = this.units.find(u => !u.isPlayerTeam);
        if(e) {
            let lv = state.player.stats.level;
            e.hp = e.maxHp = 60 + lv * 6;
            e.attack = 12 + lv;
            e.defense = 8; e.speed = 70; e.radius = 9; e.color = '#ff8800';
        }
        document.getElementById('battle-log-left').innerHTML = `<b>🗡️ Şeref Düellosu:</b> ${lord.name}`;
    },

    start(enemyName, enemyCount, bossLevel = null, faction = null) {
        Input.keys = {}; // Tuşları temizle
        this.canvas = document.getElementById('battle-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        Game.showScreen('battle');
        this.isBossFight = !!bossLevel;
        
        let vc = document.getElementById('view-container');
        let uiHeight = document.getElementById('battle-ui').offsetHeight || 50;
        
        let clientH = vc.clientHeight || window.innerHeight;
        let W = vc.clientWidth || 800;
        let H = Math.max(300, clientH - uiHeight);
        
        this.canvas.width = W;
        this.canvas.height = H;

        this.units = [];
        this.projectiles = [];
        this.bloodStains = [];
        this.floatingTexts = [];
        this.battlePings = [];
        this.swings = [];
        this.sparks = [];
        this.corpses = [];
        this.knockedOut = false;
        this.grass = null;
        this.currentCommand = 'charge';
        this.cmdSlots = []; this.battleTime = 0;
        // Pusu (Game.checkAmbush): fark edemediğin çete seni ortada yakalar
        this.ambushed = !!state.ambush; state.ambush = false;
        this.active = true;

        // Pusuda oyuncu kenarda değil, arenanın ortasında yakalanır (çember için şart)
        let startPlayerX = this.ambushed ? W/2 : (enemyCount < 30 ? W/2 - 200 - Math.random()*100 : 80);
        let startEnemyX = enemyCount < 30 ? W/2 + 100 + Math.random()*100 : W - 160;

        // Procedural Terrain Generation
        this.terrain = { hills: [], pits: [], forests: [], rivers: [] };
        for(let i=0; i<3+Math.random()*6; i++) {
            this.terrain.hills.push({ x: Math.random()*W, y: Math.random()*H, r: 50+Math.random()*80 });
        }
        for(let i=0; i<2+Math.random()*4; i++) {
            this.terrain.pits.push({ x: Math.random()*W, y: Math.random()*H, r: 20+Math.random()*40 });
        }
        for(let i=0; i<2+Math.random()*3; i++) {
            this.terrain.forests.push({ x: Math.random()*W, y: Math.random()*H, r: 60+Math.random()*60 });
        }
        // Geçilemez kayalar — mevzi almayı ve taktik çeşitliliğini artırır.
        // Doğum şeritlerine (kenarlardan 150 birim) konmaz.
        this.terrain.rocks = [];
        for(let i=0; i<2+Math.random()*3; i++) {
            this.terrain.rocks.push({
                x: 150 + Math.random()*Math.max(1, W-300),
                y: 40 + Math.random()*Math.max(1, H-80),
                r: 18 + Math.random()*20
            });
        }
        
        // 50% ihtimalle nehir olsun (rastgele dikey veya yatay kesen şerit)
        if(Math.random() > 0.5) {
            let isVertical = Math.random() > 0.5;
            if(isVertical) {
                let rx = W*0.3 + Math.random()*(W*0.4); // Ortaya yakın
                this.terrain.rivers.push({ x: rx, y: 0, w: 60+Math.random()*40, h: H, isVertical: true });
            } else {
                let ry = H*0.3 + Math.random()*(H*0.4);
                this.terrain.rivers.push({ x: 0, y: ry, w: W, h: 60+Math.random()*40, isVertical: false });
            }
        }
        
        let weaponAtk = state.player.equipment.weapon ? state.player.equipment.weapon.attack : 0;
        let armorDef = state.player.equipment.armor ? state.player.equipment.armor.defense : 0;

        // Binek: at varsa oyuncu süvari olarak girer — motor süvariyi (ve attan düşmeyi) zaten biliyor
        let mounted = !!state.player.equipment.horse;
        // Ok torbası savaş başına dolar; yay yoksa sıfır
        this.arrows = this.playerHasBow() ? 24 + this.prof('bow') * 2 : 0;
        this.blockHeld = false;

        // Player
        this.units.push({
            id: 'player', isPlayerTeam: true,
            hp: state.player.stats.hp, maxHp: state.player.stats.maxHp,
            x: startPlayerX, y: H/2,
            speed: mounted ? 95 + Game.attr('agi') * 0.5 + (this.prof('riding') - 1) * 3
                           : 50 + Game.attr('agi') * 0.5 + (this.prof('athletics') - 1) * 1.5,
            attack: 10 + Game.attr('str') + weaponAtk,
            defense: armorDef, type: mounted ? 'cavalry' : 'infantry',
            dmgType: this.playerDmgType(),
            hasShield: this.playerHasShield(),
            color: '#ffcc00', radius: mounted ? 9 : 8, atkCd: 0,
            isAttacking: false, attackTimer: 0, swingCd: 0, angleToMouse: 0, currentWeaponAngle: 0
        });

        // Troops (Player's party) — yaralılar savaşa katılmaz, kampta iyileşir
        state.player.party.filter(p => !p.wounded).forEach((p, i) => {
            let typeInfo = Game.troopStats(p);
            let lvlBonusHp = p.level * 2 + (p.level===51?100:0);
            let lvlBonusAtk = Math.floor(p.level / 3) + (p.level===51?15:0);
            let debuff = (p.debuff ? 0.7 : 1) * Game.moraleMult();

            this.units.push({
                id: p.id, isPlayerTeam: true,
                hp: (typeInfo.hp + lvlBonusHp) * debuff, maxHp: (typeInfo.hp + lvlBonusHp) * debuff,
                x: startPlayerX - 20 + Math.random()*60, y: 50 + Math.random()*(H-100),
                speed: typeInfo.speed * debuff, attack: (typeInfo.attack + lvlBonusAtk) * debuff, defense: typeInfo.defense,
                type: typeInfo.type, color: typeInfo.type === 'cavalry' ? '#33ddff' : typeInfo.type === 'archer' ? '#55ff55' : '#33aaff',
                radius: typeInfo.type === 'cavalry' ? 7 : 5, atkCd: 0
            });
        });

        // Enemies (Bands vs Faction Lords vs Boss)
        let npc = state.npcParties.find(n => n.id === state.player.currentEncounterNpcId);
        let bandKey = (npc && npc.band) || (Object.keys(BAND_KINDS).find(k => BAND_KINDS[k].name === enemyName));
        let band = BAND_KINDS[bandKey];
        let isBandit = !!band;
        for(let i=0; i<enemyCount; i++) {
            let name = 'Çapulcu';
            let hp = 24, speed = 52, attack = 6, defense = 0, type = 'infantry', color = '#ff4444', radius = 5;

            if(!bossLevel && isBandit) {
                // Çete karışımı: her türün kendi birimleri; kalabalık çetenin başında reis olur
                let row;
                if(i === 0 && enemyCount >= 6 && band.leader) {
                    row = band.leader;
                } else {
                    let total = band.battle.reduce((a2, r) => a2 + r[6], 0);
                    let roll = Math.random() * total;
                    row = band.battle.find(r => (roll -= r[6]) <= 0) || band.battle[0];
                }
                name = row[0]; type = row[1]; hp = row[2]; speed = row[3]; attack = row[4]; defense = row[5];
                radius = type === 'cavalry' ? 7 : 5;
                color = band.beast ? '#c9b6a0' : type === 'archer' ? '#ff7744' : type === 'cavalry' ? '#ff5522' : '#ff4444';
            }
            
            if(bossLevel) {
                if(i === 0) { // Savaş Tanrısı
                    name = 'Savaş Tanrısı';
                    hp = 100 + bossLevel * 10; speed = 70; attack = 25 + bossLevel; defense = 20; type = 'infantry'; radius = 10;
                    color = '#aa00ff';
                } else {
                    name = 'Karanlık Muhafız';
                    hp = 50 + bossLevel * 3; speed = 65; attack = 15 + Math.floor(bossLevel/2); defense = 10; type = (Math.random()>0.5?'infantry':'archer'); radius = 6;
                    color = '#8800cc';
                }
            }
            else if(!isBandit) {
                // Fraksiyon askeri — karşılaşılan krallığın kendi asker ağacından
                let pool = Game.factionTroopPool(faction);
                name = pool[Math.floor(Math.random() * pool.length)];
                let ti = TROOP_TYPES[name];
                hp = ti.hp; speed = ti.speed; attack = ti.attack; defense = ti.defense; type = ti.type;
                radius = type === 'cavalry' ? 7 : 5;
                color = '#ff6666';
            }

            let enemyLvl = 1;
            if(bossLevel) {
                // Alt sınır şart: muhafız seviyesi negatife düşerse (bossLevel < 10)
                // ölçekleme uygulandığı an eksi can/saldırıyla doğarlar.
                if(i===0) enemyLvl = bossLevel;
                else enemyLvl = Math.max(1, bossLevel - 10);
            } else if(!isBandit) {
                enemyLvl = 5 + Math.floor(state.time.day / 15);
            } else {
                enemyLvl = 1 + Math.floor(state.time.day / 30);
            }

            // Seviye artık sadece etikette değil, gerçekten güçlendiriyor
            if(!bossLevel) {
                hp += (enemyLvl - 1) * 4;
                attack += Math.floor((enemyLvl - 1) / 2);
                defense += Math.floor((enemyLvl - 1) / 4);
            }

            this.units.push({
                id: 'enemy_'+i, isPlayerTeam: false, name: name,
                beast: !!(band && band.beast),
                charge: (band && band.beast) ? 1.6 : 1.3,   // kurtlar atılarak saldırır
                hp: hp, maxHp: hp,
                // Pusuda düşman tek şeritten değil, oyuncunun etrafındaki çemberden doğar
                x: this.ambushed ? Math.max(20, Math.min(W-20, startPlayerX + Math.cos(i*2.4)*(130+Math.random()*110)))
                                 : startEnemyX + Math.random()*80,
                y: this.ambushed ? Math.max(20, Math.min(H-20, H/2 + Math.sin(i*2.4)*(130+Math.random()*110)))
                                 : 50 + Math.random()*(H-100),
                speed: speed, attack: attack, defense: defense,
                type: type, color: color, radius: radius, atkCd: Math.random()*0.6, level: enemyLvl
            });
        }

        document.getElementById('battle-log-left').innerHTML = '<div class="log-msg" style="padding:6px 10px;color:#fff;"><b>'
            + (this.ambushed ? 'Pusuya Düştün! Etrafın sarıldı.' : 'Savaş Başladı!')
            + '</b><br>WASD hareket · Sol tık saldırı<br>[1] Takip · [2] Hücum · [3] Bekle</div>';
        document.getElementById('battle-log-right').innerHTML = '';

        setTimeout(() => {
            if(this.active) {
                let names = ["Antonius", "John", "Ragnar", "Kel Mahmut", "Bozkurt", "Topal Rıza", "Deli Yürek", "Kemikkıran", "Kanlı Hasan", "Gaius", "Bjorn", "Dilsiz Suikastçi", "Kör Hafız", "Barbaros", "Turgut"];
                let n1 = names[Math.floor(Math.random()*names.length)];
                let n2 = names[Math.floor(Math.random()*names.length)];
                while(n1 === n2) n2 = names[Math.floor(Math.random()*names.length)];

                let quotes = [
                    `Bu ezikleri ezelim! ${n1} soldan ilerle, ${n2} sen sağdan dalacaksın!`,
                    `Bu gerizekalılar bizi yeneceğini mi düşündü gerçekten? ${n1}, ${n2}, parçalayın şunları!`,
                    `Bugün kılıçlarımız kan içecek! ${n1} okçuları koru, ${n2} hücuma geç!`,
                    `Haha! Akşama ziyafet var çocuklar! ${n1} sağ kanadı tut, ${n2} esir alma!`,
                    `Sadece zırhları para eder, kendileri çöp! ${n1}, ${n2}, saldırın!`,
                    `Şu zavallılara bakın... ${n1} sen soldan vur, ${n2} sen arkadan dolaş!`,
                    `Yemek molasından önce şunları halledelim! ${n1} önden git, ${n2} destek çık!`,
                    `Analarını ağlatmaya geldik! ${n1} sol taraftan sar, ${n2} kaçmalarına izin verme!`,
                    `Bunlar savaşmayı oyun sanıyor herhalde! ${n1}, ${n2}, onlara gerçek savaşı gösterin!`
                ];
                let q = quotes[Math.floor(Math.random()*quotes.length)];

                this.log(`<span style="color:#ffaa00;font-size:1.1rem;display:block;margin-bottom:5px"><b>Düşman Komutanı:</b></span><span style="color:#fff;font-style:italic">"${q}"</span>`, 'right');
                
                // Grupların ilerleme yerlerine ping animasyonu
                let W = this.canvas.width, H = this.canvas.height;
                this.battlePings.push({ x: W/3, y: 150, life: 3.0, label: n1 });
                this.battlePings.push({ x: W/3, y: H-150, life: 3.0, label: n2 });
                this.battlePings.push({ x: W/2, y: H/2, life: 3.0, label: 'Ana Grup' });
            }
        }, 1000);

        // Sol tık savurur/atar, sağ tık blok tutar (Shift de blok)
        this.clickHandler = (e) => {
            if(e.button === 2) { e.preventDefault(); this.blockHeld = true; }
            else this.playerAttack(e);
        };
        this.canvas.addEventListener('mousedown', this.clickHandler);
        this.upHandler = () => { this.blockHeld = false; };
        window.addEventListener('mouseup', this.upHandler);
        this.menuHandler = (e) => e.preventDefault();
        this.canvas.addEventListener('contextmenu', this.menuHandler);

        // Emirler savaşın başında hazır beklemez: her biri kendi rastgele anında
        // "fırsat" olarak doğar. Boru sesi savaşın içinden gelir, menüden değil.
        this.cmdSlots = [
            { key: '2', cmd: 'charge', name: 'Hücum Edin',      at: 1.0 + Math.random() * 1.5 },
            { key: '1', cmd: 'follow', name: 'Beni Takip Edin', at: 2.5 + Math.random() * 2.5 },
            { key: '3', cmd: 'hold',   name: 'Mevzi Koruyun',   at: 4.0 + Math.random() * 3.5 }
        ];
        this.battleTime = 0;

        this.commandListener = (e) => {
            let slot = this.cmdSlots.find(c => c.key === e.key);
            if(!slot) return;
            if(!slot.open) return this.log(`<span style="opacity:0.7">Şu an "${slot.name}" emrini verecek durumda değilsin.</span>`);
            // Aynı emri üst üste bağırmak anlamsız
            if(this.currentCommand === slot.cmd) return;
            this.currentCommand = slot.cmd;
            this.log(`🔊 Emir: <b>${slot.name}!</b>`);
        };
        window.addEventListener('keydown', this.commandListener);

        this.warmUp();
        if(this.loopId) cancelAnimationFrame(this.loopId);
        let last = performance.now();
        const loop = (t) => {
            if(!this.active) return;
            if(Game.skipFrame(t)) { this.loopId = requestAnimationFrame(loop); return; }
            let dt = Math.min((t-last)/1000, 0.05);
            last = t;
            this.update(dt);
            this.render();
            this.loopId = requestAnimationFrame(loop);
        };
        this.loopId = requestAnimationFrame(loop);
    },

    playerAttack(e) {
        if(e) e.preventDefault();
        let p = this.units.find(u => u.id === 'player');
        // Toparlanma bitmeden yeni savurma yok — hızlı tıklama artık hasarı katlamıyor
        if(!p || p.hp <= 0 || p.blocking || p.isAttacking || p.swingCd > 0) return;
        if(this.playerHasBow()) return this.playerShoot(p);

        p.isAttacking = true;
        p.attackTimer = 0.3; // 300ms saldırı süresi
        p.swingCd = this.swingCooldown();
        p.hasHit = false; // Tek hedefe vurmak için
        p.angleToMouse = Math.atan2(Input.mouse.y - p.y, Input.mouse.x - p.x);
        this.swings.push({ x: p.x, y: p.y, angle: p.angleToMouse, life: 0.3 });
    },

    // Savurma toparlanması: yeterlilik arttıkça hızlanır (0.75 sn → 0.45 sn)
    swingCooldown() {
        let lv = this.playerWeaponProf();
        return Math.max(0.45, 0.75 - lv * 0.005);
    },

    prof(id) { let d = state.player.proficiencies[id]; return d ? d.level : 1; },
    playerWeaponType() {
        let w = state.player.equipment.weapon;
        let t = w ? w.weaponType : 'oneHanded';
        return state.player.proficiencies[t] ? t : 'oneHanded';
    },
    playerWeaponProf() { return this.prof(this.playerWeaponType()); },
    playerHasBow() { return this.playerWeaponType() === 'bow'; },
    playerDmgType() { let w = state.player.equipment.weapon; return (w && w.dmgType) || 'cut'; },
    // Kalkan zırh slotunu işgal eder: blok mu, zırh mı — seçim oyuncunun
    playerHasShield() { let a = state.player.equipment.armor; return !!a && a.id === 'shield'; },

    // Yay: ok torbası sınırlı, hareket ve at üstü isabeti bozar
    playerShoot(p) {
        let lv = this.prof('bow');
        p.swingCd = Math.max(0.5, 1.15 - lv * 0.006);
        if(this.arrows <= 0) {
            this.floatingTexts.push({ x: p.x, y: p.y - 20, text: 'ok bitti', color: '#999', life: 0.6 });
            return;
        }
        this.arrows--;
        let a = Math.atan2(Input.mouse.y - p.y, Input.mouse.x - p.x);
        let moving = Math.abs(p.lastVx || 0) > 0.1 || Math.abs(p.lastVy || 0) > 0.1;
        let spread = (0.04 + (moving ? 0.10 : 0) + (p.type === 'cavalry' ? 0.08 : 0)) * (1 - Math.min(0.6, lv * 0.005));
        a += (Math.random() - 0.5) * spread * 2;
        let speed = 320;
        this.projectiles.push({
            x: p.x + Math.cos(a) * 12, y: p.y + Math.sin(a) * 12,
            vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
            damage: p.attack * (0.5 + Math.min(0.5, lv * 0.005)), dmgType: 'pierce',
            isPlayerTeam: true, sourceId: 'player'
        });
        p.angleToMouse = a;
        p.bowTimer = 0.25;
    },

    // Zırh hasar türüne göre işler: kesici tam yer, delici yarısını, ezici üçte ikisini
    afterArmor(dmgType, raw, def) {
        let t = DMG_TYPES[dmgType] || DMG_TYPES.cut;
        return Math.max(1, Math.round(raw * t.mult - (def || 0) * t.armor));
    },

    // Blok: saldırı kalkanın baktığı yaya denk gelirse kesilir (0 = tam blok)
    blockFactor(tgt, sx, sy) {
        if(!tgt.blocking) return 1;
        let a = Math.atan2(sy - tgt.y, sx - tgt.x);
        let diff = Math.abs(a - (tgt.blockAngle || 0));
        while(diff > Math.PI) diff = 2 * Math.PI - diff;
        if(diff > Math.PI / 3) return 1;              // arkadan/yandan gelen geçer
        return tgt.hasShield ? 0 : 0.4;               // kalkanla tam, çıplak kolla %60 azaltma
    },
    blockedFx(tgt, sx, sy) {
        this.spark(tgt.x, tgt.y, Math.atan2(sy - tgt.y, sx - tgt.x), '#dfe6ef');
        this.floatingTexts.push({ x: tgt.x, y: tgt.y - 14, text: '🛡 blok', color: '#cfe3ff', life: 0.6 });
        tgt.blockFlash = 0.2;
    },

    // Şarj: at üstünde hızlıyken hasar artar, mızrakla katlanır (couched lance)
    chargeMult(u) {
        if(u.type !== 'cavalry') return 1;
        let sp = Math.sqrt((u.lastVx || 0) ** 2 + (u.lastVy || 0) ** 2) / Math.max(1, u.speed);
        let lance = this.playerWeaponType() === 'polearm';
        return 1 + Math.min(1, sp) * (lance ? 1.6 : 0.6);
    },

    // Kılıç yayının yarı açısı — attackAngle + Geniş Savurma yeteneği
    swingHalfAngle() {
        let deg = (state.player.attackAngle || 30) + (state.player.skills.wideSwing || 0) * 10;
        return deg * Math.PI / 180;
    },

    // Tek yerden yakın dövüş hasarı: kan, sarsıntı, hasar yazısı, ölüm kaydı
    dealMelee(src, tgt, raw) {
        let bf = this.blockFactor(tgt, src.x, src.y);
        if(bf === 0) return this.blockedFx(tgt, src.x, src.y);
        let dmg = this.afterArmor(src.dmgType, raw * bf, tgt.defense);
        tgt.hp -= dmg;
        // Nitelikler oynanışla gelişir: vuran oyuncuysa güç, yiyen oyuncuysa dirayet.
        if(src.id === 'player') Game.trainAttr('str', 0.15);
        if(tgt.id === 'player') Game.trainAttr('vit', dmg / 60);
        tgt.hitFlash = 0.18;
        let a = Math.atan2(tgt.y - src.y, tgt.x - src.x);
        tgt.x += Math.cos(a) * 4; tgt.y += Math.sin(a) * 4; // geri tepme
        this.bloodStains.push({ x: tgt.x, y: tgt.y, alpha: 1.0, size: 3 + Math.random()*3 });
        this.spark(tgt.x, tgt.y, a, src.isPlayerTeam ? '#ffdd66' : '#ff8866');
        this.floatingTexts.push({ x: tgt.x, y: tgt.y - 12, text: `-${dmg}`, color: src.isPlayerTeam ? '#ffdd55' : '#ff6666', life: 0.8, big: src.id === 'player' });
        if(tgt.hp <= 0) {
            // Ezici silah öldürmez, bayıltır — esir düşme şansı yükselir
            if((DMG_TYPES[src.dmgType] || {}).knock) tgt.stunned = true;
            this.logKill(tgt, src);
            this.awardTroopXp(src.id);
        }
    },

    spark(x, y, angle, color) {
        for(let i = 0; i < 5; i++) {
            let a = angle + (Math.random()-0.5) * 1.6;
            let sp = 40 + Math.random()*90;
            this.sparks.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life: 0.25 + Math.random()*0.2, color });
        }
    },

    getTerrainEffects(u) {
        let speedMod = 1.0;
        let attackMod = 1.0;
        if(!this.terrain) return { speedMod, attackMod };
        
        // Orman
        if (this.terrain.forests) {
            for(let f of this.terrain.forests) {
                let dx = u.x - f.x, dy = u.y - f.y;
                if(dx*dx + dy*dy <= f.r*f.r) {
                    if(u.type === 'archer') attackMod *= 0.7;
                    if(u.type === 'cavalry') speedMod *= 0.6;
                }
            }
        }
        // Tepe
        if (this.terrain.hills) {
            for(let h of this.terrain.hills) {
                let dx = u.x - h.x, dy = u.y - h.y;
                if(dx*dx + dy*dy <= h.r*h.r) {
                    if(u.type === 'archer') attackMod *= 1.3;
                }
            }
        }
        // Çukur
        if (this.terrain.pits) {
            for(let p of this.terrain.pits) {
                let dx = u.x - p.x, dy = u.y - p.y;
                if(dx*dx + dy*dy <= p.r*p.r) {
                    speedMod *= 0.8;
                }
            }
        }
        // Nehir
        if (this.terrain.rivers) {
            for(let r of this.terrain.rivers) {
                if(u.x >= r.x && u.x <= r.x + r.w && u.y >= r.y && u.y <= r.y + r.h) {
                    speedMod *= 0.7;
                }
            }
        }
        return { speedMod, attackMod };
    },

    awardTroopXp(id) {
        if(!id || id === 'player') return;
        let t = state.player.party.find(x => x.id === id);
        if(!t) return;
        let r = Game.giveTroopXp(t, 1);
        if(r === 'ready') this.log(`🔥 <b>${t.name}</b> Terfiye Hazır! (Grup ekranından sınıf atlatın)`);
        else if(r === 'levelup') this.log(`🔥 <b>${t.name}</b> Seviye Atladı! (Lvl ${t.level})`);
    },

    update(dt) {
        if(dt <= 0) return; // FIX NaN POISONING

        // Emir fırsatları: her biri kendi anında açılır, hepsi bir arada değil.
        this.battleTime += dt;
        (this.cmdSlots || []).forEach(c => {
            if(c.open || this.battleTime < c.at) return;
            c.open = true;
            this.log(`<span style="color:#ffd479">⚑ Fırsat: <b>[${c.key}] ${c.name}</b></span>`);
            // Log 5 satırla sınırlı ve öldürme mesajları onu süpürüyor; fırsat
            // oyuncunun kendi başının üstünde de belirsin.
            let pl = this._byId ? this._byId['player'] : null;
            if(pl) this.floatingTexts.push({ x: pl.x, y: pl.y - 34, text: `⚑ [${c.key}] ${c.name}`, color: '#ffd479', life: 2.2 });
        });

        // Hem Tıklama Hem Boşluk saldırı tetikler
        if(Input.keys[' ']) {
            this.playerAttack();
        }

        // Projectiles Update
        for(let i = this.projectiles.length - 1; i >= 0; i--) {
            let proj = this.projectiles[i];
            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;

            // Bounds check
            if(proj.x < 0 || proj.x > this.canvas.width || proj.y < 0 || proj.y > this.canvas.height) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Collision check
            let hit = false;
            for(let j = 0; j < this.units.length; j++) {
                let u = this.units[j];
                if(u.hp <= 0 || u.isPlayerTeam === proj.isPlayerTeam) continue;
                let d = Math.sqrt(Math.pow(u.x - proj.x, 2) + Math.pow(u.y - proj.y, 2));
                if(d < u.radius + 2) {
                    let bf = this.blockFactor(u, proj.x - proj.vx, proj.y - proj.vy);
                    if(bf === 0) { this.blockedFx(u, proj.x - proj.vx, proj.y - proj.vy); hit = true; break; }
                    let dmg = this.afterArmor(proj.dmgType, proj.damage * bf, u.defense);
                    u.hp -= dmg;
                    hit = true;
                    u.hitFlash = 0.15;
                    this.bloodStains.push({ x: u.x, y: u.y, alpha: 1.0, size: 2.5 + Math.random()*2 });
                    this.spark(u.x, u.y, Math.atan2(proj.vy, proj.vx), '#ffeebb');
                    this.floatingTexts.push({ x: u.x, y: u.y - 12, text: `-${dmg}`, color: proj.isPlayerTeam ? '#ffdd55' : '#ff6666', life: 0.8 });
                    
                    if(u.hp <= 0) {
                        let killer = this.units.find(un => un.id === proj.sourceId);
                        this.logKill(u, killer);
                        if(proj.sourceId) this.awardTroopXp(proj.sourceId);
                    }
                    break;
                }
            }
            if(hit) this.projectiles.splice(i, 1);
        }

        // Blood stains fade
        this.bloodStains.forEach(b => { b.alpha -= 0.05 * dt; });
        this.bloodStains = this.bloodStains.filter(b => b.alpha > 0);

        // Floating texts float up and fade
        this.floatingTexts.forEach(f => {
            f.y -= 15 * dt;
            f.life -= dt;
        });
        this.floatingTexts = this.floatingTexts.filter(f => f.life > 0);

        // Kılıç izleri, kıvılcımlar, isabet parlaması
        this.swings.forEach(sw => sw.life -= dt);
        this.swings = this.swings.filter(sw => sw.life > 0);
        this.sparks.forEach(sp => {
            sp.x += sp.vx * dt; sp.y += sp.vy * dt;
            sp.vy += 120 * dt; sp.life -= dt;
        });
        this.sparks = this.sparks.filter(sp => sp.life > 0);
        // Kalabalık savaşta parçacık seli FPS'i düşürüyordu
        if(this.sparks.length > 120) this.sparks.splice(0, this.sparks.length - 120);
        if(this.floatingTexts.length > 40) this.floatingTexts.splice(0, this.floatingTexts.length - 40);
        if(this.bloodStains.length > 200) this.bloodStains.splice(0, this.bloodStains.length - 200);
        this.units.forEach(u => { if(u.hitFlash > 0) u.hitFlash -= dt; });

        // Battle pings
        if(this.battlePings) {
            this.battlePings.forEach(p => p.life -= dt);
            this.battlePings = this.battlePings.filter(p => p.life > 0);
        }

        // id -> birim tablosu (hedef aramaları bunun üstünden çalışır)
        this._byId = {};
        this.units.forEach(u => { this._byId[u.id] = u; });

        // Units movement & action update
        this.units.forEach(u => {
            if(u.hp <= 0) return;

            u.vx = 0; u.vy = 0; // Reset velocity
            if(u.atkCd > 0) u.atkCd -= dt; // saldırı bekleme sayacı (dt tabanlı — kare hızından bağımsız)
            
            let { speedMod, attackMod } = this.getTerrainEffects(u);
            let uSpeed = u.speed * speedMod;
            let uAttack = u.attack * attackMod;

            // At vurulunca binici yere düşer — oyuncu dahil herkes için tek kontrol
            if(u.type === 'cavalry' && u.hp < u.maxHp * 0.5 && !u.dismounted) {
                u.type = 'infantry';
                u.dismounted = true;
                u.speed = Math.max(50, u.speed - 30);
                if(u.id === 'player') u.radius = 8;
                this.floatingTexts.push({ x: u.x, y: u.y - 12, text: 'Attan Düştü!', color: '#ffaa00', life: 1.0 });
            }

            if(u.id === 'player') {
                // Blok: sağ tık ya da Shift. Blokta savuramaz, yavaş yürür.
                u.blocking = u.hp > 0 && !u.isAttacking && (this.blockHeld || !!Input.keys['shift']);
                if(u.blocking) u.blockAngle = Math.atan2(Input.mouse.y - u.y, Input.mouse.x - u.x);
                if(u.blockFlash > 0) u.blockFlash -= dt;
                if(u.bowTimer > 0) u.bowTimer -= dt;
                uSpeed *= u.blocking ? 0.5 : 1;
                // Saldırı (Sweep) Logic
                if(u.swingCd > 0) u.swingCd -= dt;
                if(u.isAttacking) {
                    u.attackTimer -= dt;
                    // Kılıç yayı: sol omuzdan sağa süpürür (çizim için)
                    let half = this.swingHalfAngle();
                    let prog = 1 - Math.max(0, u.attackTimer) / 0.3;
                    u.currentWeaponAngle = u.angleToMouse - half + prog * half * 2;

                    if(u.attackTimer <= 0.15 && !u.hasHit) {
                        u.hasHit = true;
                        // TEK hedef: yayın içindeki en yakın düşman.
                        // (Eskiden yaydaki herkese aynı anda vuruyordu — grup biçme hatası.)
                        // Menzil silaha bağlı: mızrak uzun, at üstünde biraz daha uzun
                        let hitDist = 45 + (this.playerWeaponType() === 'polearm' ? 15 : 0) + (u.type === 'cavalry' ? 8 : 0);
                        let target = null, best = Infinity;
                        this.units.forEach(e => {
                            if(e.hp <= 0 || e.isPlayerTeam === u.isPlayerTeam) return;
                            let dx = e.x - u.x, dy = e.y - u.y;
                            let dist = Math.sqrt(dx*dx+dy*dy);
                            if(dist > hitDist || dist >= best) return;
                            let diff = Math.abs(Math.atan2(dy, dx) - u.angleToMouse);
                            while(diff > Math.PI) diff = 2*Math.PI - diff;
                            if(diff <= half) { best = dist; target = e; }
                        });
                        if(target) {
                            // Hasar yeterliliğe bağlı: acemi %35, usta %75
                            let mult = 0.35 + Math.min(0.4, this.playerWeaponProf() * 0.004);
                            let charge = this.chargeMult(u);
                            if(charge >= 1.8) this.floatingTexts.push({ x: u.x, y: u.y - 26, text: 'MIZRAK ŞARJI!', color: '#ffcc00', life: 0.9 });
                            this.dealMelee(u, target, uAttack * mult * charge);
                        } else {
                            this.floatingTexts.push({ x: u.x, y: u.y - 20, text: 'ıska', color: '#999', life: 0.5 });
                        }
                    }

                    if(u.attackTimer <= 0) u.isAttacking = false;
                }

                let dx=0, dy=0;
                if(Input.keys['w']||Input.keys['arrowup']) dy=-1;
                if(Input.keys['s']||Input.keys['arrowdown']) dy=1;
                if(Input.keys['a']||Input.keys['arrowleft']) dx=-1;
                if(Input.keys['d']||Input.keys['arrowright']) dx=1;
                if(dx||dy) {
                    let len = Math.sqrt(dx*dx+dy*dy);
                    u.vx = (dx/len)*uSpeed; u.vy = (dy/len)*uSpeed;
                    u.x += u.vx*dt; u.y += u.vy*dt;
                    u.x = Math.max(10, Math.min(this.canvas.width-10, u.x));
                    u.y = Math.max(10, Math.min(this.canvas.height-10, u.y));
                }
                // vx/vy kare başında sıfırlanıyor — şarj ve nişan son kareye bakar
                u.lastVx = u.vx; u.lastVy = u.vy;
                return;
            }

            // Terrain effects already calculated above

            // Hedef arama eskiden her karede tam taramaydı (kalabalıkta O(n²) ve FPS düşüşü).
            // Hedef 0.3 sn'de bir yenilenir, aradaki karelerde mesafe id ile bulunan hedeften ölçülür.
            u.retargetCd = (u.retargetCd || 0) - dt;
            let closest = u.tgtId ? this._byId[u.tgtId] : null;
            if(closest && closest.hp <= 0) closest = null;
            if(!closest || u.retargetCd <= 0) {
                let minD2 = Infinity;
                this.units.forEach(e => {
                    if(e.hp<=0 || e.isPlayerTeam === u.isPlayerTeam) return;
                    let dx = e.x-u.x, dy = e.y-u.y, d2 = dx*dx + dy*dy;
                    if(d2 < minD2) { minD2 = d2; closest = e; }
                });
                u.tgtId = closest ? closest.id : null;
                u.retargetCd = 0.3 + Math.random()*0.2;
            }
            let minD = closest ? Math.sqrt(Math.pow(closest.x-u.x,2)+Math.pow(closest.y-u.y,2)) : Infinity;

            // Target coordinates based on command
            let targetX = closest ? closest.x : u.x;
            let targetY = closest ? closest.y : u.y;
            let finalDist = closest ? minD : 0;

            if(u.isPlayerTeam) {
                if(this.currentCommand === 'follow') {
                    let p = this.units[0];
                    targetX = p.x + (Math.random()*40-20);
                    targetY = p.y + (Math.random()*40-20);
                    finalDist = Math.sqrt(Math.pow(targetX - u.x, 2) + Math.pow(targetY - u.y, 2));
                } else if(this.currentCommand === 'hold') {
                    if(finalDist > 40) {
                        if(u.type === 'archer' && closest && finalDist < 250) {} // Shoot
                        else return; // Stand still
                    }
                }
            }

            // Archer AI
            if(u.type === 'archer') {
                if(closest) {
                    if(finalDist < 250) {
                        if(finalDist < 55) {
                            // Yayı bırakıp geri çekilirken ağırlaşır — eskiden yakın dövüşçüyle
                            // aynı hızda kaçtığı için sonsuza dek risksiz vuruyordu
                            let dx = u.x - closest.x, dy = u.y - closest.y;
                            let len = Math.max(1, Math.sqrt(dx*dx + dy*dy));
                            let rs = uSpeed * 0.55;
                            u.vx = (dx/len)*rs; u.vy = (dy/len)*rs;
                            u.x += u.vx*dt; u.y += u.vy*dt;
                        } else {
                            if(u.atkCd <= 0) {
                                u.atkCd = 1.4 + Math.random()*0.3;
                                let arrowSpeed = 250;
                                let tX = closest.x, tY = closest.y;
                                if(Math.random() > 0.5) { // 50% predictive aim
                                    let timeToHit = finalDist / arrowSpeed;
                                    tX += (closest.vx || 0) * timeToHit;
                                    tY += (closest.vy || 0) * timeToHit;
                                }
                                let dx = tX - u.x, dy = tY - u.y;
                                let len = Math.sqrt(dx*dx + dy*dy);
                                this.projectiles.push({
                                    x: u.x, y: u.y,
                                    vx: (dx/len) * arrowSpeed, vy: (dy/len) * arrowSpeed,
                                    damage: uAttack, dmgType: 'pierce',
                                    isPlayerTeam: u.isPlayerTeam, sourceId: u.id
                                });
                            }
                        }
                    } else {
                        let dx = closest.x-u.x, dy = closest.y-u.y;
                        let r = Math.min(uSpeed*0.8*dt/finalDist, 1);   // okçu yürüyerek yaklaşır
                        u.vx = dx*r/dt; u.vy = dy*r/dt;
                        u.x += dx*r; u.y += dy*r;
                    }
                }
                return;
            }

            // Melee Cavalry & Infantry AI
            if(closest) {
                let meleeRange = 35;
                let currentTargetDist = Math.sqrt(Math.pow(targetX - u.x, 2) + Math.pow(targetY - u.y, 2));
                // Kalkanlı düşman vuruşlar arasında blok tutar (blok yeteneği savunmadan gelir).
                // Aynı Battle.blockFactor kapısından geçer: yalnız önden gelen kesilir, oyuncu yandan dolaşabilir.
                if(!u.beast && finalDist <= meleeRange + 15) {
                    u.blockCd = (u.blockCd || 0) - dt;
                    if(u.blockCd <= 0) {
                        u.blockCd = 0.6 + Math.random() * 0.8;
                        u.wantsBlock = Math.random() < Math.min(0.45, (u.defense || 0) / 40);
                    }
                    u.blocking = !!u.wantsBlock && u.atkCd > 0.2;   // savuracakken kalkanı indirir
                    if(u.blocking) u.blockAngle = Math.atan2(closest.y - u.y, closest.x - u.x);
                } else u.blocking = false;
                if(currentTargetDist > meleeRange) {
                    // Hücum: hedefe yaklaşırken hızlanır, okçu kaçışını kapatır
                    let charge = currentTargetDist < 220 ? (u.charge || 1.3) : 1;
                    let dx = targetX-u.x, dy = targetY-u.y;
                    let r = Math.min(uSpeed*charge*dt/Math.max(1, currentTargetDist), 1);
                    u.vx = dx*r/dt; u.vy = dy*r/dt;
                    u.x += dx*r; u.y += dy*r;
                } else if(finalDist <= meleeRange) {
                    if(u.atkCd <= 0) {
                        u.atkCd = 0.85 + Math.random()*0.4; // herkes aynı anda vurmasın
                        this.dealMelee(u, closest, uAttack);
                    }
                }
            }
        });

        // Kimse arenadan çıkamaz — geri çekilen okçular haritadan kaçıp savaşı kilitliyordu
        let bw = this.canvas.width, bh = this.canvas.height;
        let rocks = (this.terrain && this.terrain.rocks) || [];
        this.units.forEach(u => {
            if(u.hp <= 0) return;
            u.x = Math.max(12, Math.min(bw - 12, u.x));
            u.y = Math.max(12, Math.min(bh - 12, u.y));
            // Kayalar geçilmez: içine giren dışarı itilir.
            // ponytail: oklar kayanın üstünden geçer — engel siperi yok, sadece hareket engeli.
            rocks.forEach(k => {
                let dx = u.x - k.x, dy = u.y - k.y;
                let d = Math.sqrt(dx*dx + dy*dy), min = k.r + u.radius;
                if(d < min && d > 0.01) { u.x = k.x + dx/d*min; u.y = k.y + dy/d*min; }
            });
        });

        this.checkEnd();
    },

    // --- Zemin: çim + arazi bir kez offscreen canvas'a çizilir, her karede yeniden üretilmez
    buildGround() {
        let W = this.canvas.width, H = this.canvas.height;
        let g = document.createElement('canvas');
        g.width = W; g.height = H;
        let c = g.getContext('2d');

        let base = c.createLinearGradient(0, 0, 0, H);
        base.addColorStop(0, '#35532f');
        base.addColorStop(1, '#233b21');
        c.fillStyle = base; c.fillRect(0, 0, W, H);

        // Yumuşak renk lekeleri — düz yeşil zemin yerine benekli çayır
        for(let i = 0; i < 60; i++) {
            let x = Math.random()*W, y = Math.random()*H, r = 60 + Math.random()*140;
            let rg = c.createRadialGradient(x, y, 0, x, y, r);
            rg.addColorStop(0, Math.random() > 0.5 ? 'rgba(96,134,72,0.16)' : 'rgba(18,38,18,0.18)');
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = rg; c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill();
        }
        // Çim tutamları
        for(let i = 0; i < 2600; i++) {
            let x = Math.random()*W, y = Math.random()*H;
            c.strokeStyle = Math.random() > 0.5 ? 'rgba(126,166,92,0.30)' : 'rgba(28,52,26,0.35)';
            c.lineWidth = 1;
            c.beginPath(); c.moveTo(x, y); c.lineTo(x + (Math.random()-0.5)*3, y - 2 - Math.random()*3); c.stroke();
        }

        let T = this.terrain || {};

        (T.rivers||[]).forEach(r => {
            let vert = r.isVertical;
            let wg = vert ? c.createLinearGradient(r.x, 0, r.x+r.w, 0) : c.createLinearGradient(0, r.y, 0, r.y+r.h);
            wg.addColorStop(0, 'rgba(58,92,74,0.9)');
            wg.addColorStop(0.5, 'rgba(88,172,206,0.72)');
            wg.addColorStop(1, 'rgba(58,92,74,0.9)');
            c.fillStyle = wg; c.fillRect(r.x, r.y, r.w, r.h);
            c.strokeStyle = 'rgba(186,164,110,0.32)'; c.lineWidth = 3;
            c.beginPath();
            if(vert) { c.moveTo(r.x,0); c.lineTo(r.x,H); c.moveTo(r.x+r.w,0); c.lineTo(r.x+r.w,H); }
            else { c.moveTo(0,r.y); c.lineTo(W,r.y); c.moveTo(0,r.y+r.h); c.lineTo(W,r.y+r.h); }
            c.stroke();
        });

        (T.pits||[]).forEach(p => {
            let rg = c.createRadialGradient(p.x, p.y - p.r*0.2, p.r*0.1, p.x, p.y, p.r);
            rg.addColorStop(0, 'rgba(0,0,0,0.58)');
            rg.addColorStop(0.75, 'rgba(0,0,0,0.30)');
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = rg; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI*2); c.fill();
            c.strokeStyle = 'rgba(170,190,140,0.22)'; c.lineWidth = 2;
            c.beginPath(); c.arc(p.x, p.y, p.r*0.94, Math.PI*1.1, Math.PI*1.9); c.stroke();
        });

        (T.hills||[]).forEach(h => {
            let rg = c.createRadialGradient(h.x - h.r*0.25, h.y - h.r*0.3, h.r*0.1, h.x, h.y, h.r);
            rg.addColorStop(0, 'rgba(196,220,152,0.20)');
            rg.addColorStop(0.6, 'rgba(124,164,92,0.10)');
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = rg; c.beginPath(); c.arc(h.x, h.y, h.r, 0, Math.PI*2); c.fill();
            c.strokeStyle = 'rgba(255,255,255,0.07)'; c.lineWidth = 1.5;
            c.beginPath(); c.arc(h.x, h.y, h.r*0.62, 0, Math.PI*2); c.stroke();
        });

        (T.forests||[]).forEach(f => {
            c.fillStyle = 'rgba(9,24,11,0.5)';
            c.beginPath(); c.arc(f.x, f.y, f.r, 0, Math.PI*2); c.fill();
            let n = Math.floor(f.r / 9);
            let trees = [];
            for(let i = 0; i < n; i++) {
                let a = Math.random()*Math.PI*2, d = Math.sqrt(Math.random()) * f.r * 0.92;
                trees.push({ x: f.x + Math.cos(a)*d, y: f.y + Math.sin(a)*d, r: 8 + Math.random()*7 });
            }
            trees.sort((a,b) => a.y - b.y).forEach(t => this.drawTree(c, t.x, t.y, t.r));
        });

        (T.rocks||[]).forEach(k => this.drawRock(c, k.x, k.y, k.r));

        // Hafif karartma: birimler zeminin üstünde daha okunur dursun
        c.fillStyle = 'rgba(6,10,6,0.16)';
        c.fillRect(0, 0, W, H);

        this.ground = g;
    },

    drawRock(c, x, y, r) {
        c.fillStyle = 'rgba(0,0,0,0.45)';
        c.beginPath(); c.ellipse(x + r*0.2, y + r*0.5, r*1.05, r*0.45, 0, 0, Math.PI*2); c.fill();
        let rg = c.createRadialGradient(x - r*0.4, y - r*0.5, r*0.15, x, y, r*1.1);
        rg.addColorStop(0, '#9aa0a6'); rg.addColorStop(0.6, '#5e646a'); rg.addColorStop(1, '#33383d');
        c.fillStyle = rg;
        c.beginPath();
        for(let i = 0; i < 8; i++) {
            let a2 = i / 8 * Math.PI * 2, rr = r * (0.82 + ((i * 37) % 11) / 40);
            let px = x + Math.cos(a2)*rr, py = y + Math.sin(a2)*rr*0.8;
            i ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.closePath(); c.fill();
        c.strokeStyle = 'rgba(20,22,24,0.8)'; c.lineWidth = 2; c.stroke();
    },

    drawTree(c, x, y, r) {
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.beginPath(); c.ellipse(x + r*0.4, y + r*0.55, r*0.95, r*0.42, 0, 0, Math.PI*2); c.fill();
        c.fillStyle = '#3b2a18';
        c.fillRect(x - r*0.13, y - r*0.1, r*0.26, r*0.7);
        let rg = c.createRadialGradient(x - r*0.35, y - r*0.45, r*0.1, x, y - r*0.2, r);
        rg.addColorStop(0, 'rgba(96,146,72,1)');
        rg.addColorStop(0.65, 'rgba(46,88,40,1)');
        rg.addColorStop(1, 'rgba(20,44,20,1)');
        c.fillStyle = rg;
        c.beginPath(); c.arc(x, y - r*0.25, r*0.85, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(x - r*0.5, y - r*0.05, r*0.5, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(x + r*0.5, y - r*0.05, r*0.48, 0, Math.PI*2); c.fill();
    },

    render() {
        let ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
        if(!this.ground || this.ground.width !== W || this.ground.height !== H) this.buildGround();
        let now = performance.now();

        ctx.clearRect(0,0,W,H);
        ctx.drawImage(this.ground, 0, 0);

        // Su parıltısı (tek canlı arazi efekti)
        if(this.terrain && this.terrain.rivers) {
            ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2;
            this.terrain.rivers.forEach(r => {
                for(let i = 0; i < 7; i++) {
                    let t = (now/1400 + i/7) % 1;
                    ctx.beginPath();
                    if(r.isVertical) { let y = t*H; ctx.moveTo(r.x+6, y); ctx.lineTo(r.x+r.w-6, y + Math.sin(now/500+i)*4); }
                    else { let x = t*W; ctx.moveTo(x, r.y+6); ctx.lineTo(x + Math.sin(now/500+i)*4, r.y+r.h-6); }
                    ctx.stroke();
                }
            });
        }

        // Kan lekeleri
        this.bloodStains.forEach(b => {
            ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI*2);
            ctx.fillStyle = `rgba(122,10,10,${b.alpha*0.8})`; ctx.fill();
        });

        // Cesetler — düşenler meydanda kalır
        this.corpses.forEach(cp => {
            ctx.save();
            ctx.translate(cp.x, cp.y); ctx.rotate(cp.rot);
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = cp.isPlayerTeam ? '#4a5a7a' : '#6a3a3a';
            ctx.beginPath(); ctx.ellipse(0, 0, 9, 4.5, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
            ctx.restore();
            ctx.globalAlpha = 1;
        });

        // Kılıç savurma izi
        this.swings.forEach(sw => {
            let a = sw.life / 0.3;
            let half = this.swingHalfAngle();
            ctx.save();
            ctx.translate(sw.x, sw.y);
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.arc(0, 0, 46, sw.angle - half, sw.angle + half);
            ctx.closePath();
            ctx.fillStyle = `rgba(255,240,190,${0.18*a})`; ctx.fill();
            ctx.strokeStyle = `rgba(255,255,255,${0.45*a})`; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
        });

        // Birimler — y sırasına göre, derinlik hissi için
        this.units.filter(u => u.hp > 0).sort((a,b) => a.y - b.y).forEach(u => this.drawUnit(ctx, u, now));

        // Oklar
        this.projectiles.forEach(p => {
            let angle = Math.atan2(p.vy, p.vx);
            ctx.save();
            ctx.translate(p.x, p.y); ctx.rotate(angle);
            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-11, 3); ctx.lineTo(4, 3); ctx.stroke();
            ctx.strokeStyle = '#d8c9a0'; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(5, 0); ctx.stroke();
            ctx.fillStyle = '#e8e8ee';
            ctx.beginPath(); ctx.moveTo(5,0); ctx.lineTo(0,-2); ctx.lineTo(0,2); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = p.isPlayerTeam ? '#8fd4ff' : '#ff9a8a'; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(-11,0); ctx.lineTo(-14,-3); ctx.moveTo(-11,0); ctx.lineTo(-14,3); ctx.stroke();
            ctx.restore();
        });

        // Kıvılcımlar
        this.sparks.forEach(sp => {
            ctx.globalAlpha = Math.max(0, sp.life / 0.4);
            ctx.strokeStyle = sp.color; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x - sp.vx*0.02, sp.y - sp.vy*0.02); ctx.stroke();
        });
        ctx.globalAlpha = 1;

        // Uçan hasar yazıları
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        this.floatingTexts.forEach(f => {
            ctx.globalAlpha = Math.min(1, f.life / 0.4);
            ctx.font = `bold ${f.big ? 15 : 12}px Inter, sans-serif`;
            ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
            ctx.strokeText(f.text, f.x, f.y);
            ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
        });
        ctx.globalAlpha = 1;

        // Komutan pingleri
        if(this.battlePings) {
            this.battlePings.forEach(p => {
                let progress = 1 - (p.life / 3.0);
                let size = 30 + progress * 20;
                let alpha = p.life > 1.0 ? 1.0 : p.life;
                ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI*2);
                ctx.strokeStyle = `rgba(255,50,50,${alpha})`; ctx.lineWidth = 3; ctx.stroke();
                ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
                ctx.fillStyle = `rgba(255,50,50,${alpha})`; ctx.fill();
                ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                ctx.font = '14px Inter, sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(p.label, p.x, p.y - size - 10);
            });
        }

        // Vinyet
        if(!this._vignette || this._vignette.w !== W) {
            let vg = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.35, W/2, H/2, Math.max(W,H)*0.72);
            vg.addColorStop(0, 'rgba(0,0,0,0)');
            vg.addColorStop(1, 'rgba(0,0,0,0.55)');
            this._vignette = { w: W, g: vg };
        }
        ctx.fillStyle = this._vignette.g; ctx.fillRect(0,0,W,H);

        this.drawHud(ctx, W, H, now);
    },

    // Savaşta kullanılan bütün birim emojileri. warmUp() bunları savaş başlamadan
    // pişirir; yoksa ilk kareler glif rasterizasyonu yüzünden takılıyordu.
    UNIT_ICONS: ['💂', '🏹', '🐎', '🐺', '🐴', '🧑‍🌾'],

    // Konturlu emoji sprite'ı (ikon başına bir kez üretilir).
    unitSprite(icon) {
        if(!this._sprites) this._sprites = {};
        let c = this._sprites[icon];
        if(c) return c;
        c = document.createElement('canvas');
        c.width = c.height = 40;
        let x = c.getContext('2d');
        x.font = '22px Arial';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.strokeStyle = 'rgba(0,0,0,0.85)'; x.lineWidth = 4; x.lineJoin = 'round';
        x.strokeText(icon, 20, 20);
        x.fillText(icon, 20, 20);
        this._sprites[icon] = c;
        return c;
    },

    // Savaşın ilk karesinde rasterize edilecek yeni bir şey kalmasın.
    warmUp() {
        this._swordGrad = null;   // bağlam yenilenmiş olabilir
        this.UNIT_ICONS.forEach(i => this.unitSprite(i));
    },

    drawUnit(ctx, u, now) {
        let isPlayer = u.id === 'player';
        let icon = '💂';
        if(isPlayer) icon = u.type === 'cavalry' ? '🐴' : '🧑‍🌾';
        else if(u.beast) icon = '🐺';
        else if(u.type === 'archer') icon = '🏹';
        else if(u.type === 'cavalry') icon = '🐎';

        let isMoving = (Math.abs(u.vx) > 0.1 || Math.abs(u.vy) > 0.1);
        let offset = (u.x + u.y) * 0.05;
        let hop = isMoving ? Math.abs(Math.sin(now/150 + offset)) * 4 : 0;
        let sway = isMoving ? Math.sin(now/150 + offset) * 0.15 : 0;
        let ring = u.isPlayerTeam ? '#4fa8ff' : '#ff5a4a';

        // Yer gölgesi + takım halkası (zeminde silik kalmasın diye dolgulu ve tam opak)
        ctx.beginPath();
        ctx.ellipse(u.x, u.y + 9, 12, 5.5, 0, 0, Math.PI*2);
        ctx.fillStyle = `rgba(0,0,0,${0.5 - hop*0.03})`; ctx.fill();

        ctx.beginPath();
        ctx.ellipse(u.x, u.y + 9, 10, 4.5, 0, 0, Math.PI*2);
        ctx.fillStyle = u.isPlayerTeam ? 'rgba(79,168,255,0.28)' : 'rgba(255,90,74,0.28)';
        ctx.fill();
        ctx.strokeStyle = ring; ctx.lineWidth = 2.5; ctx.stroke();

        if(isPlayer) {
            let pulse = 1 + Math.sin(now/300)*0.12;
            ctx.beginPath();
            ctx.ellipse(u.x, u.y + 9, 14*pulse, 6.5*pulse, 0, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(255,204,0,0.85)'; ctx.lineWidth = 2.5; ctx.stroke();
        }

        if(isMoving && Math.random() < 0.25) {
            ctx.fillStyle = 'rgba(196,186,150,0.35)';
            ctx.beginPath(); ctx.arc(u.x + (Math.random()-0.5)*8, u.y + 9, 1.5+Math.random()*2.5, 0, Math.PI*2); ctx.fill();
        }

        ctx.save();
        ctx.translate(u.x, u.y - hop);
        ctx.rotate(sway);
        // Emoji her kare yeniden rasterize edilmesin: konturlu hâli bir kez
        // sprite'a pişirilip blit ediliyor (ölçüldü: 13 us -> 3.4 us, 3.8x).
        let spr = this.unitSprite(icon);
        ctx.drawImage(spr, -spr.width/2, -spr.height/2);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        if(u.level >= 5) {
            let rankStr = u.level >= 20 ? '^' : u.level >= 15 ? "'''" : u.level >= 10 ? "''" : "'";
            ctx.fillStyle = '#ffcc44';
            ctx.font = 'bold 15px Inter, sans-serif';
            ctx.fillText(rankStr, -12, -12);
        }
        ctx.restore();

        // İsabet parlaması
        if(u.hitFlash > 0) {
            ctx.globalAlpha = Math.min(0.75, u.hitFlash * 4);
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(u.x, u.y - hop, 13, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Kalkan (blok tutarken) — baktığı yay 60°, isabet alınca beyaz parlar
        if(u.blocking) {
            let ba = u.blockAngle || 0;
            ctx.save();
            ctx.translate(u.x, u.y - hop);
            ctx.beginPath();
            ctx.arc(0, 0, 20, ba - Math.PI/3, ba + Math.PI/3);
            ctx.lineWidth = u.blockFlash > 0 ? 7 : 5;
            ctx.strokeStyle = u.blockFlash > 0 ? '#ffffff' : (u.hasShield ? 'rgba(150,190,255,0.9)' : 'rgba(190,190,190,0.6)');
            ctx.stroke();
            ctx.restore();
        }

        // Yay (ok attıktan hemen sonra)
        if(u.bowTimer > 0) {
            ctx.save();
            ctx.translate(u.x, u.y - hop);
            ctx.rotate(u.angleToMouse || 0);
            ctx.beginPath();
            ctx.arc(12, 0, 11, -Math.PI/2.2, Math.PI/2.2);
            ctx.lineWidth = 2.5; ctx.strokeStyle = '#c8a24a'; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(12 + 11*Math.cos(-Math.PI/2.2), 11*Math.sin(-Math.PI/2.2));
            ctx.lineTo(12 + 11*Math.cos(Math.PI/2.2), 11*Math.sin(Math.PI/2.2));
            ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.stroke();
            ctx.restore();
        }

        // Kılıç (savururken)
        if(u.isAttacking) {
            ctx.save();
            ctx.translate(u.x, u.y - hop);
            ctx.rotate(u.currentWeaponAngle || 0);
            ctx.beginPath();
            ctx.moveTo(10,-2); ctx.lineTo(15,-2); ctx.lineTo(15,-6); ctx.lineTo(18,-6);
            ctx.lineTo(18,-2); ctx.lineTo(40,-2); ctx.lineTo(45,0); ctx.lineTo(40,2);
            ctx.lineTo(18,2); ctx.lineTo(18,6); ctx.lineTo(15,6); ctx.lineTo(15,2);
            ctx.lineTo(10,2); ctx.closePath();
            if(!this._swordGrad) {
                let sg = ctx.createLinearGradient(10,-4,45,4);
                sg.addColorStop(0, '#8a7a55'); sg.addColorStop(0.35, '#f2f2f6'); sg.addColorStop(1, '#9aa0aa');
                this._swordGrad = sg;   // dönüşümden sonra çizildiği için yerel koordinatlar sabit
            }
            ctx.fillStyle = this._swordGrad; ctx.fill();
            ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 1; ctx.stroke();
            ctx.restore();
        }

        // Can çubuğu — sadece yaralıysa (ve oyuncuda hep)
        if(u.hp < u.maxHp || isPlayer) {
            let bw = 26, r = Math.max(0, u.hp / u.maxHp);
            let by = u.y - 20 - hop;
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(u.x - bw/2 - 1, by - 1, bw + 2, 5);
            ctx.fillStyle = r > 0.5 ? '#41d06a' : r > 0.25 ? '#e8c93a' : '#e0463a';
            ctx.fillRect(u.x - bw/2, by, bw * r, 3);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(u.x - bw/2, by, bw * r, 1);
        }
    },

    drawHud(ctx, W, H, now) {
        // Emir şeridi
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        let cmdName = this.currentCommand === 'follow' ? 'Takip Et' : this.currentCommand === 'hold' ? 'Mevzini Koru' : 'Hücum Et';
        let hudW = Math.min(360, W - 24);
        ctx.fillStyle = 'rgba(12,14,10,0.72)';
        ctx.fillRect(12, H - 40, hudW, 28);
        ctx.strokeStyle = 'rgba(200,170,90,0.45)'; ctx.lineWidth = 1;
        ctx.strokeRect(12, H - 40, hudW, 28);
        ctx.fillStyle = '#e9d9a8'; ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText(`⚑ ${cmdName}`, 22, H - 26);
        // Henüz açılmamış emirler soluk: oyuncu neyin ne zaman geleceğini görür
        ctx.font = '11px Inter, sans-serif';
        let lbl = { '1': 'Takip', '2': 'Hücum', '3': 'Bekle' };
        let x = 22 + hudW*0.42;
        (this.cmdSlots || []).forEach(c => {
            ctx.fillStyle = c.open ? 'rgba(233,217,168,0.75)' : 'rgba(233,217,168,0.22)';
            let t = `[${c.key}] ${lbl[c.key]} `;
            ctx.fillText(t, x, H - 26);
            x += ctx.measureText(t).width + 4;
        });

        // Oyuncu künyesi: binek, ok, blok
        let pl = this._byId ? this._byId['player'] : null;
        if(pl && pl.hp > 0) {
            let bits = [pl.type === 'cavalry' ? '🐴 Atlı' : '🥾 Yaya'];
            if(this.playerHasBow()) bits.push(`🏹 ${this.arrows} ok`);
            bits.push(pl.blocking ? '🛡 BLOK' : (this.playerHasShield() ? '🛡 [Sağ tık/Shift] blok' : '[Sağ tık/Shift] savuştur'));
            ctx.fillStyle = pl.blocking ? '#bcd8ff' : 'rgba(233,217,168,0.75)';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillText(bits.join('   ·   '), 22, H - 56);
        }

        if(this.knockedOut) {
            ctx.fillStyle = 'rgba(255,70,70,0.9)'; ctx.font = 'bold 13px Inter, sans-serif';
            ctx.fillText('☠ Baygınsın — adamların savaşıyor', 22, H - 76);
        }

        // Güç çubuğu
        let playerAlive = this.units.filter(u => u.isPlayerTeam && u.hp > 0).length;
        let enemyAlive = this.units.filter(u => !u.isPlayerTeam && u.hp > 0).length;
        let total = playerAlive + enemyAlive;
        if(total <= 0) return;

        let ratio = playerAlive / total;
        if(this.tugRatio === undefined) this.tugRatio = ratio;
        this.tugRatio += (ratio - this.tugRatio) * 0.08;

        let barW = Math.min(460, W - 130), barH = 22, barX = W/2 - barW/2, barY = 30;

        ctx.fillStyle = 'rgba(10,12,9,0.75)';
        ctx.fillRect(barX - 6, barY - 6, barW + 12, barH + 12);
        ctx.strokeStyle = 'rgba(200,170,90,0.5)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(barX - 6, barY - 6, barW + 12, barH + 12);

        let fill = barW * this.tugRatio;
        let gl = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        gl.addColorStop(0, '#2f8f4f'); gl.addColorStop(1, '#5ad07f');
        ctx.fillStyle = gl; ctx.fillRect(barX, barY, fill, barH);
        let gr = ctx.createLinearGradient(barX + fill, 0, barX + barW, 0);
        gr.addColorStop(0, '#c0392b'); gr.addColorStop(1, '#7d241a');
        ctx.fillStyle = gr; ctx.fillRect(barX + fill, barY, barW - fill, barH);

        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(barX, barY, barW, barH/2);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
        for(let i = 1; i < 10; i++) {
            let x = barX + barW*i/10;
            ctx.beginPath(); ctx.moveTo(x, barY); ctx.lineTo(x, barY + barH); ctx.stroke();
        }

        let jitter = Math.sin(now/110) * 3;
        ctx.fillStyle = '#fff';
        ctx.fillRect(barX + fill - 2 + jitter, barY - 5, 4, barH + 10);
        ctx.fillStyle = 'rgba(255,220,120,0.9)';
        ctx.fillRect(barX + fill - 1 + jitter, barY - 5, 2, barH + 10);

        let statusText = 'Kafa Kafaya! ⚔️';
        if(this.tugRatio > 0.8) statusText = 'Ağlatıyoruz! 😂';
        else if(this.tugRatio > 0.6) statusText = 'Tokatlıyoruz! 😎';
        else if(this.tugRatio < 0.2) statusText = 'Eyvah Anam! 😱';
        else if(this.tugRatio < 0.4) statusText = 'Dayak Yiyoruz! 😬';

        ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 6;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f3e6c0'; ctx.font = 'bold 18px Cinzel, serif';
        ctx.fillText(statusText, W/2, barY - 18);
        ctx.font = 'bold 13px Inter, sans-serif'; ctx.fillStyle = '#fff';
        ctx.textAlign = 'left'; ctx.fillText(`Biz ${playerAlive}`, barX + 8, barY + barH/2);
        ctx.textAlign = 'right'; ctx.fillText(`${enemyAlive} Düşman`, barX + barW - 8, barY + barH/2);
        ctx.shadowBlur = 0;
    },
    logKill(victim, killer) {
        this.corpses.push({ x: victim.x, y: victim.y, isPlayerTeam: victim.isPlayerTeam, rot: Math.random()*Math.PI*2 });
        if(this.corpses.length > 60) this.corpses.shift();
        if(victim.id === 'player') {
            this.knockedOut = true;
            this.log('<span style="color:#ff4444"><b>Yere yığıldın!</b> Adamların savaşa devam ediyor…</span>', 'right');
        }
        let vName = victim.name || (victim.isPlayerTeam ? 'Dost Asker' : 'Çapulcu');
        let kName = killer ? (killer.name || (killer.isPlayerTeam ? 'Dost Asker' : 'Çapulcu')) : 'Bilinmeyen';
        let msg = `☠ ${vName} <span style="opacity:.6">←</span> ${kName}`;

        if (victim.isPlayerTeam) {
            this.log(`<span style="color:#ff6666">${msg}</span>`, 'right');
        } else {
            this.log(`<span style="color:#66dd77">${msg}</span>`, 'left');
        }
    },

    log(msg, side = 'left') {
        let b = document.getElementById(side === 'left' ? 'battle-log-left' : 'battle-log-right');
        if(!b) return;
        let div = document.createElement('div');
        div.className = 'log-msg';
        div.innerHTML = msg;
        div.style.padding = '5px 10px';
        div.style.color = '#fff';
        div.style.fontFamily = 'Inter, sans-serif';
        div.style.transition = 'opacity 0.5s';
        
        b.prepend(div);
        while(b.children.length > 5) b.removeChild(b.lastChild);
        
        setTimeout(() => {
            if(b.contains(div)) div.style.opacity = '0';
            setTimeout(() => { if(b.contains(div)) b.removeChild(div); }, 500);
        }, 4500);
    },

    checkEnd() {
        let pAlive = this.units.some(u=>u.isPlayerTeam&&u.hp>0);
        let eAlive = this.units.some(u=>!u.isPlayerTeam&&u.hp>0);
        if(!pAlive) { this.active=false; this.endBattle(false); }
        else if(!eAlive) { this.active=false; this.endBattle(true); }
    },

    // Seninle boy ölçüşemeyecek düşman doyurmaz: ganimet ve tecrübe güç oranına göre kısılır
    rewardScale() {
        let ep = this.units.filter(u => !u.isPlayerTeam).reduce((a, u) => a + (u.level || 1) + 1, 0);
        let pp = state.player.stats.level +
                 state.player.party.reduce((a, t) => a + (t.level || 1) + 1, 0);
        return Math.max(0.2, Math.min(1, (ep / Math.max(1, pp)) * 1.6));
    },

    endBattle(won) {
        this.canvas.removeEventListener('mousedown', this.clickHandler);
        window.removeEventListener('mouseup', this.upHandler);
        this.canvas.removeEventListener('contextmenu', this.menuHandler);
        window.removeEventListener('keydown', this.commandListener);
        cancelAnimationFrame(this.loopId);

        if(this.isDuel) {
            this.isDuel = false;
            state.player.party = this._duelParty || [];
            this._duelParty = null;
            let pUnit = this.units[0];
            state.player.stats.hp = Math.max(5, pUnit ? Math.floor(pUnit.hp) : 5);
            Game.showScreen('map');
            Nobles.resolveDuel(won);
            return;
        }

        // Canı biten asker doğrudan ölmez: Cerrahlık yeteneği onu yaralı olarak
        // kurtarabilir. Yaralı grupta kalır, savaşamaz, birkaç günde iyileşir.
        // Eşleştirme sıra yerine id ile yapılır: savaşa girmeyen yaralılar sırayı kaydırıyordu.
        let surgery = (state.player.proficiencies.surgery || { level: 1 }).level;
        let saveChance = Math.min(0.75, 0.35 + surgery * 0.03);
        let saved = 0, killed = 0;
        state.player.party.forEach(t => {
            let u = this.units.find(x => x.id === t.id);
            if(!u || u.hp > 0) return;
            // Yoldaşlar ölmez, yalnızca yaralanır
            if(t.isCompanion || Math.random() < saveChance) {
                t.wounded = Math.max(1, 3 + Math.floor(Math.random()*2) - Math.floor(surgery / 4));
                saved++;
            } else { t._dead = true; killed++; }
        });
        state.player.party = state.player.party.filter(t => !t._dead);
        if(saved) Game.addProficiencyXp('surgery', 30 * saved);
        this.lastCasualties = { saved, killed };

        // Düşen düşmanların bir kısmı ölmez, esir düşer (Warband'ın esir sistemi).
        // Kapasite Esir Yönetimi yeteneğine bağlı; boss savaşında esir alınmaz.
        let captured = 0;
        if(won && !this.isBossFight) {
            let free = Game.prisonerCapacity() - state.player.prisoners.length;
            this.units.forEach(u => {
                // Hayvan esir düşmez; ezici silahla bayıltılan neredeyse kesin düşer
                if(u.isPlayerTeam || u.hp > 0 || u.beast || free <= 0) return;
                if(Math.random() > (u.stunned ? 0.9 : 0.45)) return;
                state.player.prisoners.push({
                    id: 'pr_' + Math.random().toString(36).substr(2,7),
                    name: u.name || 'Çapulcu', level: u.level || 1, type: u.type
                });
                free--; captured++;
            });
            if(captured) Game.addProficiencyXp('prisonerMgmt', 10 * captured);
        }

        if(won) {
            let xpGain = 30 + state.player.party.length * 5;
            // Ganimet düşmanın sayısı ve seviyesiyle ölçeklenir — eskiden
            // 5 çapulcu ile 100 kişilik ordu aynı parayı getiriyordu.
            let loot = this.units.filter(u => !u.isPlayerTeam)
                .reduce((a, u) => a + (u.beast ? 6 : 10) + (u.level || 1) * (u.beast ? 3 : 5), 0);  // post yağması daha az eder
            let moneyGain = Math.floor(loot * (0.85 + Math.random()*0.3) * (1 + (Game.profLvl('looting') - 1) * 0.04));

            // Çapulcu avı sonsuza dek kârlı olmasın
            let rScale = this.isBossFight ? 1 : this.rewardScale();
            moneyGain = Math.max(1, Math.floor(moneyGain * rScale));
            xpGain = Math.max(1, Math.floor(xpGain * rScale));

            // Bayılıp adamlarının sırtından kazanılan zafer yarım zaferdir
            if(this.knockedOut) {
                xpGain = Math.floor(xpGain * 0.5);
                moneyGain = Math.floor(moneyGain * 0.5);
            }
            
            if(this.isBossFight) {
                moneyGain += 1000 + state.bossEntries * 500;
                xpGain += 500 + state.bossEntries * 200;
                let token = ITEMS.lvl51_token;
                let ex = state.player.inventory.find(i => i.id === token.id);
                if(ex) ex.qty++; else state.player.inventory.push({...token, qty:1});
                alert('Tebrikler! Savaş Tanrısı\'nı yendin. Savaş Tanrısı Nişanı (Lvl 51 Upgrade) kazandın!');
            }
            
            state.player.money += moneyGain;
            state.player.renown += 3;
            state.player.morale = Math.min(100, Game.morale() + 5);
            state.player.stats.xp += xpGain;

            let enemyCount = this.units.filter(u => !u.isPlayerTeam).length;
            Game.addProficiencyXp('looting', 10 * enemyCount);
            let wpType = state.player.equipment.weapon ? state.player.equipment.weapon.weaponType : 'oneHanded';
            if(!state.player.proficiencies[wpType]) wpType = 'oneHanded';
            Game.addProficiencyXp(wpType, 50 * enemyCount);
            if(state.player.equipment.horse) Game.addProficiencyXp('riding', 40 * enemyCount);
            else Game.addProficiencyXp('athletics', 40 * enemyCount);

            // Kuşatma
            if(state.player.currentSiege) {
                let s = state.player.currentSiege;
                let loc = LOCATIONS.find(l=>l.id===s.locId);
                if(loc) {
                    if(s.foundingKingdom) {
                        FACTIONS['player_kingdom'] = {id:'player_kingdom', name:state.player.name+' Krallığı', color:'#ffcc00', ruler:state.player.name};
                        state.player.vassalOf = 'player_kingdom';
                        loc.faction = 'player_kingdom';
                        alert(`${loc.name} fethedildi! Kendi krallığını ilan ettin!`);
                    } else if(state.player.vassalOf) {
                        loc.faction = state.player.vassalOf;
                        alert(`${loc.name} fethedildi! ${(FACTIONS[state.player.vassalOf]||{name:'?'}).name} adına aldın.`);
                    }
                }
                state.player.currentSiege = null;
            }

            // Yenilen NPC'yi haritadan kaldır
            let nobleTaken = null;
            if(state.player.currentEncounterNpcId) {
                let beaten = state.npcParties.find(n => n.id === state.player.currentEncounterNpcId);
                Quests.emit('battle_won', {
                    npcId: state.player.currentEncounterNpcId,
                    questWave: beaten ? beaten.questWave : null,
                    lordId: beaten ? beaten.lordId : null
                });
                state.npcParties = state.npcParties.filter(n => n.id !== state.player.currentEncounterNpcId);
                state.player.currentEncounterNpcId = null;

                // Yenilen soylu esir düşer: ya fidyesini alırsın ya onurunla salıverirsin
                let lord = beaten && beaten.lordId ? Nobles.lord(beaten.lordId) : null;
                if(lord) {
                    state.player.prisoners.push({
                        id: 'pr_' + Math.random().toString(36).substr(2,7),
                        name: lord.name, noble: true, lordId: lord.id, faction: lord.faction,
                        ransom: 2500 + Math.floor(Math.random()*2000)
                    });
                    nobleTaken = lord.name;
                }
            }

            let resultHtml = `
            <div style="text-align:center;">
                <h2 style="color:#2ecc71;margin-bottom:1rem;font-size:2rem;text-shadow:0 0 10px rgba(46,204,113,0.5)">${this.knockedOut ? '🩸 Pahalı Zafer' : '⚔️ Mükemmel Zafer! ⚔️'}</h2>
                ${this.knockedOut ? '<p style="color:#ff8866;margin-bottom:1rem">Savaş meydanında bayıldın; ganimet ve tecrübe yarıya indi.</p>' : ''}
                ${rScale < 0.9 ? `<p style="color:#c9a227;margin-bottom:1rem">Kolay av: bu düşman sana denk değildi, ödüller %${Math.round(rScale*100)}'e indi.</p>` : ''}
                <div style="background:rgba(0,0,0,0.3);padding:1.5rem;border-radius:10px;margin-bottom:1.5rem;font-size:1.2rem;line-height:1.6;text-align:left;">
                    <p style="margin-bottom:0.8rem"><b>Kazanılan Dinar:</b> <span style="color:#ffcc00">+${moneyGain}</span> 💰</p>
                    <p style="margin-bottom:0.8rem"><b>Kazanılan Şan/Nam:</b> <span style="color:#3498db">+3</span> 👑</p>
                    <p style="margin-bottom:0.8rem"><b>Kazanılan Tecrübe:</b> <span style="color:#e74c3c">+${xpGain}</span> 🌟</p>
                    <p><b>Kayıplar:</b> <span style="color:#e74c3c">${killed} ölü</span> · <span style="color:#ffaa00">${saved} yaralı</span> 🩹</p>
                    ${captured ? `<p style="margin-top:0.8rem"><b>Esir Alınan:</b> <span style="color:#dda0dd">${captured}</span> ⛓️ <span style="font-size:0.85rem;color:var(--text-muted)">(şehirdeki köle tüccarına satabilirsin)</span></p>` : ''}
                    ${nobleTaken ? `<p style="margin-top:0.8rem;color:#e59b3d"><b>👑 ${nobleTaken} esir alındı!</b> <span style="font-size:0.85rem;color:var(--text-muted)">Grup ekranından fidye iste ya da salıver.</span></p>` : ''}
                </div>
                <button class="btn primary" style="font-size:1.2rem;padding:0.8rem 2rem;box-shadow:0 0 15px rgba(255,170,0,0.4);border-radius:8px" onclick="Game.closeModal(); Game.checkLevelUp(); Game.updateTopBar()">Kazanımları Al ve İlerle</button>
            </div>`;
            Game.showModal(resultHtml);
        } else {
            // Savaşı kaybettik — esir düştük.
            // Nam kaybı parti dağılmadan hesaplanmalı: güç oranı ondan çıkıyor.
            let epow = this.units.filter(u => !u.isPlayerTeam).reduce((a, u) => a + (u.level || 1) + 1, 0);
            let renownLost = this.isBossFight ? 0 : Game.defeatRenown(epow);
            state.player.renown = Math.max(0, state.player.renown - renownLost);

            let daysLost = 3 + Math.floor(Math.random() * 5);
            let ratio = 0.60 + Math.random() * 0.30;
            let moneyLost = Math.floor(state.player.money * ratio);
            state.player.money = Math.max(0, state.player.money - moneyLost);

            state.player.morale = Math.max(0, Game.morale() - 15);

            // Askerler dağılır, esirler zincirlerinden kurtulur
            state.player.party = [];
            state.player.prisoners.filter(p => p.noble).forEach(p => Game.respawnLordParty(p));
            state.player.prisoners = [];
            state.player.stats.hp = Math.max(5, Math.floor(state.player.stats.maxHp * 0.3));

            // Esir sistemi
            let captorId = state.player.currentEncounterNpcId;
            let captor = captorId ? state.npcParties.find(n => n.id === captorId) : null;
            if(captor) {
                Game.beginCaptivity(captor, daysLost);
            } else if(this.isBossFight) {
                alert('Savaş Tanrısı seni ezdi geçti. Tüm birliğini ve paranı kaybettin.');
            }
            state.player.currentEncounterNpcId = null;
            state.player.currentSiege = null;

            if(captor) alert(`Yenildin! Esir düştün! Tüm birliğin dağıldı.<br>-${moneyLost} Dinar`
                + (renownLost ? `<br>-${renownLost} nam — <i>böyle bir düşmana yenilmek dilden dile dolaşacak.</i>` : ''));
        }

        // Sync HP — yenilgide yukarıdaki %30 canı ezmesin
        let pUnit = this.units[0];
        if(won) state.player.stats.hp = Math.max(1, Math.floor(pUnit ? pUnit.hp : 1));

        Game.updateTopBar();
        Game.showScreen('map');
    },

    surrender() {
        this.active = false;
        this.canvas.removeEventListener('mousedown', this.clickHandler);
        window.removeEventListener('mouseup', this.upHandler);
        this.canvas.removeEventListener('contextmenu', this.menuHandler);
        window.removeEventListener('keydown', this.commandListener);
        cancelAnimationFrame(this.loopId);

        let captorId = state.player.currentEncounterNpcId;
        let captor = captorId ? state.npcParties.find(n => n.id === captorId) : null;
        // Kuşatma/boss gibi esir alacak kimsenin olmadığı savaşlarda da devam eden
        // durum temizlenmeli; yoksa açık kalan currentSiege bir sonraki kazanılan
        // savaşta o şehri fethetmiş sayıyordu.
        let wasSiege = state.player.currentSiege;
        state.player.currentSiege = null;
        state.player.currentEncounterNpcId = null;

        if(captor) Game.surrender(captor.id, captor.name);
        else {
            alert(wasSiege ? 'Kuşatmadan çekildin. Birliğin dağıldı.' : 'Teslim oldun! Birliğini kaybettin.');
            state.player.party = [];
            state.player.prisoners.filter(p => p.noble).forEach(p => Game.respawnLordParty(p));
            state.player.prisoners = [];
            state.player.stats.hp = Math.max(5, Math.floor(state.player.stats.maxHp * 0.3));
        }
        Game.updateTopBar();
        Game.showScreen('map');
    },

};

// --- TOURNAMENT MINIGAME ---
const TournamentMinigame = {
    canvas:null, ctx:null, active:false, score:0, targets:[], spawnTimer:0, timeLeft:0, loopId:null, clickHandler:null,

    start(opts = {}) {
        this.mode = opts.mode || 'tournament';
        this.goal = opts.goal || 12;
        this.canvas = document.getElementById('battle-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        Game.showScreen('battle');
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.active = true;
        this.score = 0;
        this.targets = [];
        this.timeLeft = opts.time || 25;
        this.spawnTimer = 0;

        document.getElementById('battle-log-left').innerHTML = this.mode === 'chicken'
            ? `<b>🐔 Tavuk Avı!</b> ${this.goal} tavuk yakala. Kimseye anlatma.`
            : `<b>🏆 Turnuva!</b> Hedeflere tıkla! ${this.goal} hedef vurursan kazanırsın.`;

        this.clickHandler = (e) => this.onClick(e);
        this.canvas.addEventListener('mousedown', this.clickHandler);

        if(this.loopId) cancelAnimationFrame(this.loopId);
        let last = performance.now();
        const loop = (t) => {
            if(!this.active) return;
            if(Game.skipFrame(t)) { this.loopId = requestAnimationFrame(loop); return; }
            let dt = Math.min((t-last)/1000, 0.05);
            last = t;
            this.update(dt);
            this.render();
            if(this.active) this.loopId = requestAnimationFrame(loop);
        };
        this.loopId = requestAnimationFrame(loop);
    },

    update(dt) {
        this.timeLeft -= dt;
        if(this.timeLeft <= 0) { this.end(false); return; }

        let agiBonus = Game.attr('agi');
        let strBonus = Game.attr('str');

        this.spawnTimer -= dt;
        if(this.spawnTimer <= 0) {
            this.targets.push({
                x: 40 + Math.random()*(this.canvas.width-80),
                y: 40 + Math.random()*(this.canvas.height-80),
                radius: 42 + agiBonus * 1.2,
                timeLeft: 1.2 + strBonus * 0.12,
            });
            this.spawnTimer = 0.4 + Math.random()*0.4;
        }

        for(let i=this.targets.length-1; i>=0; i--) {
            this.targets[i].timeLeft -= dt;
            if(this.targets[i].timeLeft <= 0) this.targets.splice(i,1);
        }

        if(this.score >= this.goal) this.end(true);
    },

    render() {
        let ctx=this.ctx, W=this.canvas.width, H=this.canvas.height;
        ctx.clearRect(0,0,W,H);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0,0,W,H);

        ctx.fillStyle = '#fff'; ctx.font = '18px Inter';
        ctx.fillText(`Skor: ${this.score}/${this.goal}`, 15, 25);
        ctx.fillText(`Süre: ${Math.ceil(this.timeLeft)}`, 15, 50);

        this.targets.forEach(t => {
            let alpha = Math.min(t.timeLeft, 1);
            ctx.beginPath(); ctx.arc(t.x,t.y,t.radius,0,Math.PI*2);
            ctx.fillStyle = `rgba(200,40,40,${alpha})`; ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            // Shrinking inner
            ctx.beginPath(); ctx.arc(t.x,t.y,t.radius*alpha,0,Math.PI*2);
            ctx.fillStyle = `rgba(255,255,255,${alpha*0.3})`; ctx.fill();
        });
    },

    onClick(e) {
        if(!this.active) return;
        let rect = this.canvas.getBoundingClientRect();
        let mx = e.clientX-rect.left, my = e.clientY-rect.top;
        for(let i=this.targets.length-1; i>=0; i--) {
            let t = this.targets[i];
            if(Math.sqrt(Math.pow(t.x-mx,2)+Math.pow(t.y-my,2)) <= t.radius) {
                this.score++;
                this.targets.splice(i,1);
                document.getElementById('battle-log-left').innerHTML = `${this.mode === 'chicken' ? 'Yakaladın!' : 'İsabet!'} (${this.score}/${this.goal})`;
                break;
            }
        }
    },

    end(won) {
        this.active = false;
        this.canvas.removeEventListener('mousedown', this.clickHandler);
        cancelAnimationFrame(this.loopId);
        Game.showScreen('map');

        if(this.mode === 'chicken') {
            Quests.emit('chickens_caught', { won, score: this.score });
            if(won) alert(`Son tavuğu ahırın arkasında kıstırdın. ${this.score}/${this.goal}.`);
            Game.updateTopBar();
            return;
        }

        if(won) {
            state.player.money += 500; state.player.renown += 20;
            state.pendingDedication = true;
            alert('Turnuvayı kazandın! +500 Dinar, +20 Nam\n\nArenada zaferini bir leydiye ithaf edebilirsin — salona git.');
        } else {
            alert(`Elendin! Skor: ${this.score}/${this.goal}`);
        }
        Quests.emit('tournament_end', { won, score: this.score });
        Game.updateTopBar();
    }
};

// --- KAYIT / YÜKLEME ---
// ponytail: tüm state'i JSON'a atıyoruz. npcParties ve görev data'sı düz veri
// olduğu için bu yeterli; kaydedilemeyen tek şey canvas/loop referansları.
const Save = {
    KEY: 'webband_save_v1',
    V: 1,

    save() {
        try {
            // Keşfedilen harita kaba ızgarada saklanır (8100 karakter)
            if(Game.exploredGrid) state.explored = Game.exploredGrid.join('');
            localStorage.setItem(this.KEY, JSON.stringify({
                v: this.V, savedAt: Date.now(),
                state: { ...state },
                // x/y de kaydedilmeli: init() yerleşimleri her açılışta rastgele yeniden dağıtıyor,
                // yoksa yüklemede yollar/oyuncu konumu bambaşka bir dünyaya denk geliyor.
                locations: LOCATIONS.map(l => ({ id: l.id, faction: l.faction, x: l.x, y: l.y, volunteersAvailable: l.volunteersAvailable, lastRecruitDay: l.lastRecruitDay, prosperity: l.prosperity })),
                playerKingdom: FACTIONS['player_kingdom'] || null
            }));
            alert('Oyun kaydedildi.');
        } catch(e) {
            alert('Kayıt başarısız: ' + e.message);
        }
    },

    hasSave() { return !!localStorage.getItem(this.KEY); },

    load() {
        let raw = localStorage.getItem(this.KEY);
        if(!raw) return alert('Kayıtlı oyun yok.');
        let d;
        try { d = JSON.parse(raw); } catch(e) { return alert('Kayıt bozuk.'); }

        if(d.v > this.V) return alert('Bu kayıt oyunun daha yeni bir sürümünden; yüklenemiyor.');

        if(d.playerKingdom) FACTIONS['player_kingdom'] = d.playerKingdom;
        this.mergeInto(state, d.state);

        // Eski kayıtlarda efsanevi askerin adı 'Efsanevi ' önekiyle saklanıyordu
        state.player.party.forEach(t => {
            if(t.name.startsWith('Efsanevi ')) { t.name = t.name.slice(9); t.legendary = true; }
        });

        let legacyLocs = false;
        (d.locations || []).forEach(sl => {
            let l = LOCATIONS.find(x => x.id === sl.id);
            if(!l) return;
            if(sl.x === undefined) legacyLocs = true;
            Object.assign(l, sl);
        });
        // x/y taşımayan eski kayıtlarda yerleşimler init()'in rastgele yerinde kalır;
        // kayıttan gelen yollar o dünyaya ait olmadığı için baştan örülür.
        if(legacyLocs) Game.buildRoads();

        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('main-ui').classList.add('active');
        Game.resizeCanvases();   // sis tuvalini de kurar
        Game.loadExplored();     // keşfedilen harita ızgaradan geri gelir
        Game.camera.x = state.player.x; Game.camera.y = state.player.y;
        Game.camera.offsetX = 0; Game.camera.offsetY = 0;
        Game.showScreen('map');
        Game.updateTopBar();
        Game.renderPrisonerUI();
        Game.startGameLoop();
        alert(`Kayıt yüklendi. Gün ${state.time.day}.`);
    },

    // Kayıtta olmayan anahtar varsayılan değerinde kalır. Eskiden state'te olup
    // kayıtta olmayan her anahtar siliniyordu: sürüm ilerledikçe eklenen alanlar
    // (örneğin state.rivals) eski kayıt yüklenince yok oluyor, o alanları okuyan
    // sistemler undefined üzerinde patlıyordu. Düz objeler anahtar anahtar
    // birleşir, diziler ve ilkel değerler kayıttan olduğu gibi gelir.
    mergeInto(target, src) {
        for(let k in src) {
            let sv = src[k], tv = target[k];
            let plain = (o) => o && typeof o === 'object' && !Array.isArray(o);
            if(plain(sv) && plain(tv)) this.mergeInto(tv, sv);
            else target[k] = sv;
        }
    },

    wipe() {
        localStorage.removeItem(this.KEY);
        alert('Kayıt silindi.');
    }
};

window.onload = () => Game.init();
