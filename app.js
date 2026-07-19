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

const LORDS = [
    { id: 'harlaus', name: 'Kral Harlaus', faction: 'swadia', portrait: 'C:/Users/Administrator/.gemini/antigravity/brain/123fc75a-27dc-41ef-a9e9-1c9cabe9fc06/lord_portraits_1784496496881.jpg', lore: 'Tereyağına olan düşkünlüğü ile bilinir. Ülkesi elden giderken bile ziyafet vermekten geri durmayan, ağır zırhlı geleneksel bir hükümdardır.', bgOffsetX: 0, bgOffsetY: 0 },
    { id: 'graveth', name: 'Kral Graveth', faction: 'rhodok', portrait: 'C:/Users/Administrator/.gemini/antigravity/brain/123fc75a-27dc-41ef-a9e9-1c9cabe9fc06/lord_portraits_1784496496881.jpg', lore: 'Sert mizaçlı ve dağlıların lideri. Konseyi devirerek zorla başa geçtiği söylenir.', bgOffsetX: -150, bgOffsetY: 0 },
    { id: 'yaroglek', name: 'Kral Yaroglek', faction: 'vaegir', portrait: 'C:/Users/Administrator/.gemini/antigravity/brain/123fc75a-27dc-41ef-a9e9-1c9cabe9fc06/lord_portraits_1784496496881.jpg', lore: 'Kuzeyin karlı steplerinin hükümdarı. Sert bir mizacı olsa da halkı tarafından benimsenmiştir.', bgOffsetX: -300, bgOffsetY: 0 },
    { id: 'ragnar', name: 'Kral Ragnar', faction: 'nord', portrait: 'C:/Users/Administrator/.gemini/antigravity/brain/123fc75a-27dc-41ef-a9e9-1c9cabe9fc06/lord_portraits_1784496496881.jpg', lore: 'Nordların tartışmasız lideri. Oğlu için kıtayı fethetmek isteyen bir denizci savaş ağası.', bgOffsetX: 0, bgOffsetY: -150 },
    { id: 'sancar', name: 'Sancar Han', faction: 'khergit', portrait: 'C:/Users/Administrator/.gemini/antigravity/brain/123fc75a-27dc-41ef-a9e9-1c9cabe9fc06/lord_portraits_1784496496881.jpg', lore: 'Kardeşinin hakkını gasp ederek başa geçtiği için hep tartışılan, at üstünde uyuyup uyanan kurnaz bozkır hanı.', bgOffsetX: -150, bgOffsetY: -150 },
    { id: 'mustafa_abi', name: 'Lord Mustafa', faction: 'swadia', portrait: 'C:/Users/Administrator/.gemini/antigravity/brain/123fc75a-27dc-41ef-a9e9-1c9cabe9fc06/portrait_mustafa_1784497890732.jpg', lore: 'Kalradya\'nın en eski ve bilge lordlarından biridir. Hakkında pek bir şey bilinmez, sadece gerektiğinde kralların bile ona akıl danıştığı söylenir.', bgOffsetX: 0, bgOffsetY: 0, isDirectImage: true },
    { id: 'serkan_abi', name: 'Lord Serkan', faction: 'rhodok', portrait: 'C:/Users/Administrator/.gemini/antigravity/brain/123fc75a-27dc-41ef-a9e9-1c9cabe9fc06/portrait_serkan_1784497905313.jpg', lore: 'Orta yaşlı, sert mizaçlı ve taviz vermeyen bir savaş beyi. Söylentilere göre geçmişte büyük bir ihanete uğramış ve bu yüzden kimseye tam olarak güvenmez.', bgOffsetX: 0, bgOffsetY: 0, isDirectImage: true },
    { id: 'furkan', name: 'Lord Furkan', faction: 'vaegir', portrait: 'C:/Users/Administrator/.gemini/antigravity/brain/123fc75a-27dc-41ef-a9e9-1c9cabe9fc06/portrait_furkan_1784497919869.jpg', lore: 'Genç, hırslı ve bir o kadar da yetenekli bir lord. Ailesinin kökenleri tam olarak bilinmese de kılıç kullanmaktaki ustalığı sayesinde hızla yükselmiştir.', bgOffsetX: 0, bgOffsetY: 0, isDirectImage: true }
];

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

const ITEMS = {
    wheat:  { id:'wheat',  name:'Tahıl',         type:'food',  quality:'low', basePrice:20,  icon:'🌾' },
    bread:  { id:'bread',  name:'Ekmek',         type:'food',  quality:'low', basePrice:30,  icon:'🍞' },
    meat:   { id:'meat',   name:'Kurutulmuş Et', type:'food',  quality:'high',basePrice:100, icon:'🥩' },
    cheese: { id:'cheese', name:'Peynir',        type:'food',  quality:'high',basePrice:80,  icon:'🧀' },
    iron:   { id:'iron',   name:'Demir',         type:'trade', basePrice:150, icon:'⛏️' },
    velvet: { id:'velvet', name:'Kadife',        type:'trade', basePrice:400, icon:'🧵' },
    ale:    { id:'ale',    name:'Bira',          type:'trade', basePrice:50,  icon:'🍺' },
    salt:   { id:'salt',   name:'Tuz',           type:'trade', basePrice:100, icon:'🧂' },
    sword:  { id:'sword',  name:'Kılıç',         type:'weapon', weaponType:'oneHanded', basePrice:250, attack:15, icon:'⚔️' },
    axe:    { id:'axe',    name:'Savaş Baltası', type:'weapon', weaponType:'twoHanded', basePrice:300, attack:20, icon:'🪓' },
    lance:  { id:'lance',  name:'Mızrak',        type:'weapon', weaponType:'lance', basePrice:200, attack:12, icon:'🔱' },
    bow:    { id:'bow',    name:'Yay',           type:'weapon', weaponType:'bow', basePrice:220, attack:10, icon:'🏹' },
    shield: { id:'shield', name:'Kalkan',        type:'armor',  basePrice:150, defense:10, icon:'🛡️' },
    mail:   { id:'mail',   name:'Zincir Zırh',   type:'armor',  basePrice:500, defense:25, icon:'🦺' },
    horse:  { id:'horse',  name:'Savaş Atı',     type:'horse',  basePrice:600, icon:'🐴' },
    boss_map: { id:'boss_map', name:'Boss Haritası', type:'special', basePrice:5000, icon:'🗺️' },
    lvl51_token: { id:'lvl51_token', name:'Savaş Tanrısı Nişanı', type:'special', basePrice:10000, icon:'🏅' }
};

// --- UPGRADE TREES & STATS ---
const TROOP_UPGRADES = {
    'Acemi Asker': [
        { name: 'Svadya Milisi', cost: 40, type: 'infantry' },
        { name: 'Svadya Avcısı', cost: 50, type: 'archer' },
        { name: 'Svadya Süvarisi', cost: 70, type: 'cavalry' }
    ],
    'Svadya Milisi': [
        { name: 'Svadya Çavuşu', cost: 100, type: 'infantry' }
    ],
    'Svadya Avcısı': [
        { name: 'Svadya Keskin Nişancısı', cost: 120, type: 'archer' }
    ],
    'Svadya Süvarisi': [
        { name: 'Svadya Şövalyesi', cost: 150, type: 'cavalry' }
    ]
};

const TROOP_TYPES = {
    'Acemi Asker':          { hp: 20, speed: 50, attack: 6,  defense: 0, type: 'infantry', icon: '🪖' },
    'Svadya Milisi':        { hp: 45, speed: 60, attack: 12, defense: 5, type: 'infantry', icon: '🛡️' },
    'Svadya Çavuşu':        { hp: 65, speed: 65, attack: 18, defense: 12, type: 'infantry', icon: '🏰' },
    'Svadya Avcısı':        { hp: 35, speed: 55, attack: 6,  defense: 2, type: 'archer',   icon: '🏹' },
    'Svadya Keskin Nişancısı': { hp: 45, speed: 60, attack: 10, defense: 5, type: 'archer',   icon: '🎯' },
    'Svadya Süvarisi':      { hp: 50, speed: 99, attack: 12, defense: 8, type: 'cavalry',  icon: '🐴' },
    'Svadya Şövalyesi':     { hp: 75, speed: 110, attack: 22, defense: 15, type: 'cavalry',  icon: '⚔️🐴' },
    'Milis Piyade':         { hp: 40, speed: 60, attack: 11, defense: 5, type: 'infantry', icon: '🛡️' },
    'Milis Okçu':           { hp: 35, speed: 55, attack: 7,  defense: 2, type: 'archer',   icon: '🏹' },
    'Milis Süvari':         { hp: 50, speed: 105, attack: 13, defense: 7, type: 'cavalry',  icon: '🐴' },
};

// --- STATE ---
const state = {
    npcParties: [],
    activeTournaments: {},   // { cityId: true }
    encounterCooldown: 0,
    player: {
        name: 'Maceracı',
        money: 500,
        renown: 0,
        rightToRule: 0,
        partyCapacity: 50,
        party: [],
        inventory: [{...ITEMS.wheat, qty:3}],
        equipment: { weapon: null, armor: null, horse: null },
        x: 4500, y: 4500,
        targetLocation: null,
        status: 'idle',
        speed: 50,
        visibility: 500,
        stats: { level:1, xp:0, xpNext:100, hp:50, maxHp:50, str:10, agi:10, int:10, cha:10, attributePoints: 5 },
        proficiencies: {
            horse: { level: 1, xp: 0, next: 100 }, foot: { level: 1, xp: 0, next: 100 },
            bow: { level: 1, xp: 0, next: 100 }, crossbow: { level: 1, xp: 0, next: 100 },
            oneHanded: { level: 1, xp: 0, next: 100 }, twoHanded: { level: 1, xp: 0, next: 100 },
            blunt: { level: 1, xp: 0, next: 100 }, javelin: { level: 1, xp: 0, next: 100 },
            lance: { level: 1, xp: 0, next: 100 }
        },
        skills: { fastRun: 0, wideSwing: 0, fastArrow: 0, homingArrow: 0 },
        attackAngle: 30, // Base 30 degrees
        spouse: null,
        vassalOf: null,
        currentSiege: null,
        currentEncounterNpcId: null,
        prisoner: null,  // { npcId, daysLeft, ransomRequired, ransomRefusals }
    },
    time: { day:1, hour:8 },
    loopInterval: null,
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
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        this.mapCanvas = document.getElementById('map-canvas');
        this.ctx = this.mapCanvas.getContext('2d');
        this.mapCanvas.addEventListener('mousemove', e => this.handleMapHover(e));
        this.mapCanvas.addEventListener('click', e => this.handleMapClick(e));
        document.getElementById('modal-overlay').addEventListener('click', e => {
            // Karşılaşma (savaş/teslim ol) modali açıkken dışa tıklayarak kapanmasın
            if(e.target.id === 'modal-overlay' && !state.player.currentEncounterNpcId) this.closeModal();
        });
        window.addEventListener('resize', () => this.resizeCanvases());

        // Köy gönüllülerini ilklendir
        LOCATIONS.forEach(loc => {
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

        // Yolları oluştur (Tüm yerleşkeleri birbirine bağlayan Minimum Spanning Tree tarzı)
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

        this.spawnNPCs();
    },

    spawnNPCs() {
        for(let i = 0; i < 8; i++) {
            let size = 5 + Math.floor(Math.random()*10);
            state.npcParties.push(this.createNPC('Çapulcular', 'bandit', size, '#8b0000', null, 1));
        }
        for(let fid in FACTIONS) {
            let f = FACTIONS[fid];
            state.npcParties.push(this.createNPC(f.ruler, 'king', 100, f.color, fid, 1)); // Kral 100 asker
            state.npcParties.push(this.createNPC(f.vizier, 'vizier', 50, f.color, fid, 1)); // Vezir 50 asker
        }
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
        let mc = this.mapCanvas;
        mc.width = mc.parentElement.clientWidth;
        mc.height = mc.parentElement.clientHeight;
        let bc = document.getElementById('battle-canvas');
        bc.width = bc.parentElement.clientWidth;
        bc.height = bc.parentElement.clientHeight;

        if(!this.exploredCanvas) {
            this.exploredCanvas = document.createElement('canvas');
            this.exploredCanvas.width = 9000;
            this.exploredCanvas.height = 9000;
            this.exploredCtx = this.exploredCanvas.getContext('2d');
            this.exploredCtx.fillStyle = 'black';
            this.exploredCtx.fillRect(0,0, 9000, 9000);
        }
    },

    startGameLoop() {
        let lastTime = performance.now();
        const loop = (t) => {
            let dt = (t - lastTime) / 1000;
            if(dt > 0.1) dt = 0.1;
            lastTime = t;
            this.update(dt);
            this.renderMap();
            state.loopInterval = requestAnimationFrame(loop);
        };
        state.loopInterval = requestAnimationFrame(loop);
    },

    // --- UPDATE ---
    getPartyCapacity() {
        let cha = state.player.stats.cha || 10;
        let leadership = state.player.proficiencies.leadership ? state.player.proficiencies.leadership.level : 1;
        return 50 + (cha - 10) * 2 + (leadership - 1) * 3;
    },

    getTerrainMultiplier(x, y) {
        let mult = 1.0;
        for(let f of FORESTS) {
            let dx = x - f.x, dy = y - f.y;
            if(Math.sqrt(dx*dx + dy*dy) <= f.radius) {
                mult *= 0.8; // Ormanda %20 yavaşla
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
                    break;
                }
            }
        }
        return mult;
    },

    getPlayerSpeed() {
        let size = state.player.party.length + 1;
        let speedBonus = 0;
        if(size <= 1) speedBonus = 0.5;
        else if(size <= 10) speedBonus = 0.5 - ((size - 1) / 9) * 0.3;
        else if(size <= 50) speedBonus = 0.2 - ((size - 10) / 40) * 0.2;
        
        let base = state.player.equipment.horse ? 105 : 66;
        let agiBonus = state.player.stats.agi * 1.5;
        let beforeTerrain = (base + agiBonus) * (1 + speedBonus);
        let terrainMult = this.getTerrainMultiplier(state.player.x, state.player.y);
        
        return {
            value: beforeTerrain * terrainMult,
            base,
            agiBonus,
            partyMult: speedBonus,
            terrainMult
        };
    },

    updateSpeedUI(spdData) {
        let speedEl = document.getElementById('ui-speed');
        if(!speedEl) return;
        speedEl.innerText = spdData.value.toFixed(1);
        
        let terrainText = '';
        if(spdData.terrainMult < 1) terrainText = `<br><span style="color:var(--danger)">Arazi: -%${((1 - spdData.terrainMult) * 100).toFixed(0)} (Yavaşlatma)</span>`;
        else if(spdData.terrainMult > 1) terrainText = `<br><span style="color:var(--success)">Yol Etkisi: +%${((spdData.terrainMult - 1) * 100).toFixed(0)} (Hızlanma)</span>`;

        let brk = document.getElementById('ui-speed-breakdown');
        if(brk) {
            brk.innerHTML = `
                <b>Hız Detayları</b><hr style="border-color:var(--primary);margin:4px 0">
                Temel: <span style="color:var(--primary)">${spdData.base}</span> ${state.player.equipment.horse ? '(Atlı)' : '(Yaya)'}<br>
                Çeviklik Bonusu: <span style="color:var(--success)">+${spdData.agiBonus.toFixed(1)}</span><br>
                Grup Bonusu: <span style="color:var(--success)">+%${(spdData.partyMult * 100).toFixed(0)}</span>
                ${terrainText}
            `;
        }
    },

    showLore(type) {
        let content = '';
        if(type === 'lords') {
            content = `
                <div class="lore-timeline">
                    <div class="lore-item">
                        <div class="lore-portrait" style="background-image:url('lord_portraits.jpg'); background-position: 0 0;"></div>
                        <div class="lore-content">
                            <h4>Kral Harlaus</h4>
                            <p>Tereyağına olan tutkusu krallığından bile büyüktür. Savaşın en sıcak anında bile ziyafet vermesiyle tanınır. Bir keresinde bir köyü sadece inekleri iyi tereyağı veriyor diye fethetmiştir.</p>
                        </div>
                    </div>
                    <div class="lore-item">
                        <div class="lore-portrait" style="background-image:url('lord_portraits.jpg'); background-position: -80px 0;"></div>
                        <div class="lore-content">
                            <h4>Vezir Klargus</h4>
                            <p>Her şeye sinirlenen ama hiçbir şey yapamayan tipik bir bürokrat. Kılıç tutmayı bilmez ama vergileri artırma konusunda bir ustadır.</p>
                        </div>
                    </div>
                    <div class="lore-item">
                        <div class="lore-portrait" style="background-image:url('lord_portraits.jpg'); background-position: -160px 0;"></div>
                        <div class="lore-content">
                            <h4>Sancar Han</h4>
                            <p>Atıyla evli olduğu dedikoduları tüm bozkıra yayılmış durumda. Kendisini bir at eti ziyafetinde ağlarken görenler olmuştur.</p>
                        </div>
                    </div>
                    <div class="lore-item">
                        <div class="lore-portrait" style="background-image:url('lord_portraits.jpg'); background-position: 0 -80px;"></div>
                        <div class="lore-content">
                            <h4>Lord Kastor</h4>
                            <p>Eski metinleri okuyup büyü yapabildiğini iddia eder ancak savaşta sadece taş atabildiği gözlemlenmiştir. Tuhaf iksirleri askerlerini daha da güçsüzleştirir.</p>
                        </div>
                    </div>
                    <div class="lore-item">
                        <div class="lore-portrait" style="background-image:url('lord_portraits.jpg'); background-position: -80px -80px;"></div>
                        <div class="lore-content">
                            <h4>Mustafa Abi</h4>
                            <p>Kalradya'da onun hakkında pek bir şey bilinmez, ancak meyhanelerde anlatılanlara göre tek başına bir çapulcu ordusunu sadece bakışlarıyla dağıtmıştır. Geceleri gizlice köy çocuklarına tahta kılıç yonttuğu söylenir.</p>
                        </div>
                    </div>
                    <div class="lore-item">
                        <div class="lore-portrait" style="background-image:url('lord_portraits.jpg'); background-position: -160px -80px;"></div>
                        <div class="lore-content">
                            <h4>Serkan</h4>
                            <p>Gizemli bir figür. Ne zaman büyük bir savaş kopsa o savaşın ortasında atıyla durduğu ve notlar aldığı görülmüştür. Kimilerine göre o aslında bir tarihçi, kimilerine göre ise ölümsüz bir savaş gözlemcisi.</p>
                        </div>
                    </div>
                    <div class="lore-item">
                        <div class="lore-portrait" style="background-image:url('lord_portraits.jpg'); background-position: 0 -160px;"></div>
                        <div class="lore-content">
                            <h4>Furkan</h4>
                            <p>Rivayete göre Kalradya'ya başka bir boyuttan gelmiştir. Kılıç tutmayı bilmez ama elindeki garip metal parçasından ateş saçtığını iddia eden köylüler yüzünden kimse ona yaklaşmaya cesaret edemez.</p>
                        </div>
                    </div>
                </div>
            `;
            this.showModal(`<h3>Kalradya'nın Unutulmaz Lordları</h3>${content}<button class="btn" onclick="Game.closeModal()">Kapat</button>`);
        } else if(type === 'kingdoms') {
            content = `
                <div class="lore-timeline">
                    <div class="lore-item">
                        <div class="lore-portrait" style="border-color:#ffcc00; background-image:url('kingdom_crests.jpg'); background-position: 0 0; background-size: 160px 160px;"></div>
                        <div class="lore-content">
                            <h4>Swadia Krallığı</h4>
                            <p>Ağır zırhları, bitmek bilmeyen ziyafetleri ve "Her sorunu şövalyelerle çözeriz" mantaliteleriyle bilinirler. En büyük zaafları ormanlar ve tereyağı kıtlığıdır.</p>
                        </div>
                    </div>
                    <div class="lore-item">
                        <div class="lore-portrait" style="border-color:#55cc55; background-image:url('kingdom_crests.jpg'); background-position: -80px 0; background-size: 160px 160px;"></div>
                        <div class="lore-content">
                            <h4>Rodok Krallığı</h4>
                            <p>Atları sevmeyen, sadece arbalet ve mızrakla dağlarda pusu kuran asabi köylüler ordusu. Tepelerde onlara saldırmak tam bir deliliktir.</p>
                        </div>
                    </div>
                    <div class="lore-item">
                        <div class="lore-portrait" style="border-color:#cc5555; background-image:url('kingdom_crests.jpg'); background-position: 0 -80px; background-size: 160px 160px;"></div>
                        <div class="lore-content">
                            <h4>Khergit Hanlığı</h4>
                            <p>Bebekken yürümek yerine ata binmeyi öğrenirler. Savaş alanında sinir bozucu şekilde etrafınızda döner, ok atar ve siz onlara ulaşamadan kaçarlar.</p>
                        </div>
                    </div>
                    <div class="lore-item">
                        <div class="lore-portrait" style="border-color:#5555ff; background-image:url('kingdom_crests.jpg'); background-position: -80px -80px; background-size: 160px 160px;"></div>
                        <div class="lore-content">
                            <h4>Nord Krallığı</h4>
                            <p>Gemilerle gelip Kalradya'ya yerleşen devasa adamlar. O kadar kaslıdırlar ki zırha ihtiyaç duymazlar. Baltalarını fırlatıp kalkanınızı kırdıklarında onlarla konuşmayı deneyebilirsiniz.</p>
                        </div>
                    </div>
                </div>
            `;
            this.showModal(`<h3>Kalradya Krallıkları</h3>${content}<button class="btn" onclick="Game.closeModal()">Kapat</button>`);
        }
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
            if(p.party.length > 50) return `"Aman abi, biz kendi halimizde garip çapulcularız... (Ama yine de saldırırlar!)"`;
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
            this.advanceTime(dt * 2);
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
            let vis = state.player.visibility;
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
        }

        // NPC -> player collision
        if(timeFlows && state.encounterCooldown <= 0) {
            for(let npc of state.npcParties) {
                if(!this.isHostile(npc)) continue;
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

            if(hostile && dp < 360) {
                if(npc.size > ps) {
                    npc.targetX = state.player.x; npc.targetY = state.player.y;
                } else {
                    npc.targetX = npc.x - dxP * 2; npc.targetY = npc.y - dyP * 2;
                }
            } else {
                let dtx = npc.targetX - npc.x, dty = npc.targetY - npc.y;
                if(Math.sqrt(dtx*dtx + dty*dty) < 15) {
                    let a = Math.random() * Math.PI * 2;
                    let r = Math.random() * 3800;
                    npc.targetX = 4500 + Math.cos(a)*r;
                    npc.targetY = 4500 + Math.sin(a)*r;
                }
            }

            let dx = npc.targetX - npc.x, dy = npc.targetY - npc.y;
            let d = Math.sqrt(dx*dx+dy*dy);
            if(d > 3) {
                let spd = npc.speed * this.getTerrainMultiplier(npc.x, npc.y);
                let r = Math.min(spd * dt / d, 1);
                npc.x += dx*r; npc.y += dy*r;
            }
            this.clampToMap(npc); // NPC'lerin dağları aşmasını engelle
        });
    },

    triggerEncounter(npc) {
        state.encounterCooldown = 2;
        state.player.currentEncounterNpcId = npc.id;
        let dialog = this.getHumorousDialog(npc.type, npc);

        let html = `<h3>⚔️ Karşılaşma: ${npc.name}</h3>
        <p style="margin-top:0.5rem;">Düşman grup büyüklüğü: <b>${npc.size}</b> kişi</p>
        <p>Senin grubun: <b>${state.player.party.length + 1}</b> kişi</p>`;

        if(npc.type === 'bandit' && state.time.day <= 14 && Math.random() < 0.25) {
            dialog = `"Şu çaylağa bak patron, kılıcımızı kirletmeye değmez. Yürü git buradan çömez!"`;
            html += `<p><i>${dialog}</i></p>
            <p style="color:#2d2;font-size:0.85rem;margin-top:0.5rem">Çapulcular seninle savaşmaya değmeyeceğini düşünüyor.</p>
            <div style="display:flex;gap:1rem;margin-top:1rem;">
            <button class="btn primary" onclick="Game.closeModal(); state.encounterCooldown = 5;">Uzaklaş</button>
            <button class="btn" style="border-color:#cc0000;color:#cc0000" onclick="Game.closeModal(); Battle.start('${npc.name.replace(/'/g,"\\'")}', ${npc.size})">⚔️ Yine De Savaş!</button>
            </div>`;
        } else {
            html += `<p><i>${dialog}</i></p>
            <p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.5rem">Kaçış yok — savaş ya da teslim ol!</p>
            <div style="display:flex;gap:1rem;margin-top:1rem;">
            <button class="btn primary" onclick="Game.closeModal(); Battle.start('${npc.name.replace(/'/g,"\\'")}', ${npc.size})">⚔️ Savaş!</button>
            <button class="btn" style="border-color:#cc8800;color:#cc8800" onclick="Game.closeModal(); Game.surrender('${npc.id}', '${npc.name.replace(/'/g,"\\'")}')">🏳️ Teslim Ol</button>
            </div>`;
        }
        this.showModal(html);
    },

    surrender(npcId, npcName) {
        state.player.lastDefeatDay = state.time.day;
        let daysLost = 3 + Math.floor(Math.random() * 5); // 3-7 gün esir
        let ratio = 0.60 + Math.random() * 0.30; // %60-90 para kaybı
        let moneyLost = Math.floor(state.player.money * ratio);
        state.player.money = Math.max(0, state.player.money - moneyLost);

        // Tüm askerler kaybedilir
        state.player.party = [];
        state.player.stats.hp = Math.max(5, Math.floor(state.player.stats.maxHp * 0.3));

        state.player.prisoner = { npcId, npcName, daysLeft: daysLost, ransomRequired: 0.75 + Math.random()*0.15, ransomRefusals: 0, escapeChance: 10, isPlanning: false };
        state.player.status = 'prisoner';
        state.player.currentEncounterNpcId = null;
        state.player.currentSiege = null;

        alert(`Teslim oldun! Tüm birliğini kaybettin ve köle olarak sürükleneceksin.\n-${moneyLost} Dinar`);
        this.updateTopBar();
        this.renderPrisonerUI();
    },

    dist(a, b) { return Math.sqrt(Math.pow(a.x-b.x,2)+Math.pow(a.y-b.y,2)); },

    advanceTime(hours) {
        state.time.hour += hours;
        while(state.time.hour >= 24) {
            state.time.day++;

        // Gönüllü yenilenmesi (şehirler ve köyler için 2 günde bir)
        LOCATIONS.forEach(loc => {
            if(loc.type === 'village' || loc.type === 'city') {
                if(loc.volunteersAvailable === 0 && (state.time.day - (loc.lastRecruitDay || 0) >= 2)) {
                    loc.volunteersAvailable = 1 + Math.floor(Math.random()*4);
                    if(loc.type === 'city') loc.volunteersAvailable += 3;
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
            return;
        }

        let totalWage = 0;
        let foodRequiredLow = 0;
        let foodRequiredHigh = 0;

        state.player.party.forEach(t => {
            if(t.level >= 51) return; // Seviye 51 maaş ve yemek istemez
            if(t.level >= 20 && t.level < 51) totalWage += Math.floor(t.level / 2);
            else if(t.level < 20 && t.level >= 10) totalWage += 2;

            if(t.level >= 20) foodRequiredLow += 1.5;
            else foodRequiredLow += 1;

            if(t.level >= 30) foodRequiredHigh += 1;
        });

        if(state.player.money >= totalWage) state.player.money -= totalWage;
        else {
            alert("Maaşları ödeyemedin! Askerlerin morali çok düşük.");
            // İleride firar eklenebilir
        }

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
        consumeFood([...lowQualityFoods, ...highQualityFoods], Math.ceil(foodRequiredLow - foodRequiredHigh + missingHighQuality));

        let p = state.player.stats;
        p.hp = Math.min(p.maxHp, p.hp + 5);

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

        // Çapulcu yeniden doğma
        if(state.npcParties.filter(n=>n.type==='bandit').length < 5) {
            state.npcParties.push(this.createNPC('Çapulcular','bandit', 5+Math.floor(Math.random()*10), '#8b0000'));
        }
    },

    updateTopBar() {
        let p = state.player;
        document.getElementById('ui-day').innerText = `${state.time.day}`;
        document.getElementById('ui-money').innerText = Math.floor(p.money);
        document.getElementById('ui-renown').innerText = p.renown;
        document.getElementById('ui-party').innerText = `${p.party.length}/${this.getPartyCapacity()}`;
        document.getElementById('ui-hp').innerText = `${p.stats.hp}/${p.stats.maxHp}`;
        document.getElementById('ui-level').innerText = p.stats.level;
        
        this.updateSpeedUI(this.getPlayerSpeed());
        
        let pi = document.getElementById('prisoner-icon');
        if(pi) pi.style.display = p.status === 'prisoner' ? 'block' : 'none';
    },

    renderPrisonerUI() {
        let ui = document.getElementById('prisoner-ui');
        let icon = document.getElementById('prisoner-icon');
        if(!state.player.prisoner) {
            ui.classList.add('hidden');
            icon.style.display = 'none';
            return;
        }
        ui.classList.remove('hidden');
        icon.style.display = 'block';

        let p = state.player.prisoner;
        document.getElementById('ui-escape-chance').innerText = `${p.escapeChance}%`;
        
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
    showScreen(screenId) {
        document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        let view = document.getElementById(screenId + '-view');
        if(view) view.classList.add('active');

        if(screenId === 'character') this.renderCharacterScreen();
        else if(screenId === 'party') this.renderPartyScreen();
        else if(screenId === 'inventory') this.renderInventoryScreen();
        else if(screenId === 'battle') {
            let bc = document.getElementById('battle-canvas');
            bc.width = bc.parentElement.clientWidth;
            bc.height = bc.parentElement.clientHeight;
        }
    },

    // --- MAP RENDER ---
    renderMap() {
        if(!document.getElementById('map-view').classList.contains('active')) return;
        let c = this.mapCanvas, ctx = this.ctx;
        let W = c.width, H = c.height;
        ctx.clearRect(0,0,W,H);
        ctx.save();
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x + W/(2*this.camera.zoom), -this.camera.y + H/(2*this.camera.zoom));

        ctx.fillStyle = '#0f172a'; // Derin boşluk
        ctx.fillRect(-5000, -5000, 20000, 20000);

        // Kıtanın sınırlarını çiz ve clip yap
        ctx.beginPath();
        for(let i=0; i<state.mapBorder.length; i++) {
            let pt = state.mapBorder[i];
            if(i===0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fillStyle = '#2d402b'; // Mat yeşil toprak zemin
        ctx.fill();

        // Toprak lekeleri (daha gerçekçi zemin)
        if(!state.dirtPatches) {
            state.dirtPatches = [];
            for(let i=0;i<60;i++) state.dirtPatches.push({x:Math.random()*9000, y:Math.random()*9000, r:45+Math.random()*120});
        }
        ctx.fillStyle = '#263624'; // Daha koyu/kahverengimsi lekeler
        state.dirtPatches.forEach(d => {
            ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI*2); ctx.fill();
        });

        // Ormanları Çiz
        FORESTS.forEach(f => {
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.radius, 0, Math.PI*2);
            ctx.fillStyle = '#1b3a1b';
            ctx.fill();
            ctx.font = '42px Arial';
            ctx.fillText('🌲', f.x - 30, f.y - 30);
            ctx.fillText('🌲', f.x + 30, f.y + 45);
            ctx.fillText('🌲', f.x - 60, f.y + 15);
            ctx.fillText('🌲', f.x + 45, f.y - 15);
        });

        // Nehirleri Çiz
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(51, 153, 255, 0.6)';
        ctx.setLineDash([45, 60]);
        ctx.lineDashOffset = -(performance.now() / 30); // Su akış animasyonu
        RIVERS.forEach(riv => {
            ctx.lineWidth = riv.width;
            ctx.beginPath();
            ctx.moveTo(riv.x1, riv.y1);
            ctx.lineTo(riv.x2, riv.y2);
            ctx.stroke();
        });
        ctx.setLineDash([]); // reset

        // Draw Roads
        if(state.roads) {
            ctx.strokeStyle = 'rgba(139, 69, 19, 0.4)';
            ctx.lineWidth = 45;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            state.roads.forEach(r => {
                ctx.moveTo(r.x1, r.y1);
                ctx.lineTo(r.x2, r.y2);
            });
            ctx.stroke();
        }

        // Draw locations
        LOCATIONS.forEach(loc => {
            let fc = FACTIONS[loc.faction] || {color:'#888'};
            ctx.beginPath();
            if(loc.type === 'city') {
                ctx.font = '64px Arial'; // Çok büyük
                ctx.fillText('🏙️', loc.x, loc.y + 15);
                ctx.arc(loc.x, loc.y - 30, 16, 0, Math.PI*2);
                ctx.fillStyle = fc.color;
                ctx.fill();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
                // Turnuva ikonu
                if(state.activeTournaments[loc.id]) {
                    ctx.fillStyle = '#ffcc00';
                    ctx.font = '36px Arial';
                    ctx.fillText('🏆', loc.x + 30, loc.y - 15);
                }
            } else if(loc.type === 'castle') {
                ctx.font = '48px Arial'; // Orta
                ctx.fillText('🏰', loc.x, loc.y + 15);
                ctx.arc(loc.x, loc.y - 30, 12, 0, Math.PI*2);
                ctx.fillStyle = fc.color;
                ctx.fill();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
            } else {
                ctx.font = '32px Arial'; // Küçük
                ctx.fillText('🏘️', loc.x, loc.y + 15);
                ctx.arc(loc.x, loc.y - 24, 8, 0, Math.PI*2);
                ctx.fillStyle = fc.color;
                ctx.fill();
            }
            ctx.fillStyle = '#fff';
            ctx.font = '33px Inter';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'black'; ctx.shadowBlur = 12;
            ctx.fillText(loc.name, loc.x, loc.y - 54);
            ctx.shadowBlur = 0;
        });

        // FOG OF WAR çizimi
        if(this.exploredCanvas) {
            ctx.drawImage(this.exploredCanvas, 0, 0); // Keşfedilmemiş yerler siyah olur
        }
        
        // Tüm ekranı hafif karart (Keşfedilmiş ama şu an göremediğimiz yerleri karartmak için)
        // Ancak o anki dalgalı görüş alanını karartmadan Bırakacağız (evenodd taktiği)
        ctx.beginPath();
        ctx.rect(-1000,-1000, 11000, 11000); // Tüm ekranı kapsayan dikdörtgen
        let vis = state.player.visibility;
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
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        state.mapBorder.forEach((pt, index) => {
            if(index % 2 === 0) { // Çok yoğun olmaması için iki noktada bir dağ çiz
                ctx.fillText('🏔️', pt.x, pt.y + 20);
            }
        });

        // NPC'ler (sadece görüş alanındakiler)
        state.npcParties.forEach(npc => {
            let dx = npc.x - state.player.x;
            let dy = npc.y - state.player.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if(dist > vis + 45) return; // Görüş dışıysa çizme

            // Draw NPC Icon
            ctx.save();
            ctx.translate(npc.x, npc.y + 10);

            let isMoving = (Math.abs(npc.targetX - npc.x) > 3 || Math.abs(npc.targetY - npc.y) > 3);
            if(isMoving) {
                let time = performance.now();
                ctx.translate(0, -Math.abs(Math.sin(time / 150)) * 6);
                ctx.rotate(Math.sin(time / 150) * 0.15);
            }

            ctx.font = '30px Arial'; // emoji font
            ctx.textBaseline = 'middle';
            let icon = '🐴'; // default for lords
            if(npc.type === 'bandit') icon = '🧑‍🌾';
            else if(npc.type === 'king') icon = '🐴';
            else if(npc.type === 'vizier') icon = '🐴';
            
            ctx.fillText(icon, 0, 0);
            ctx.restore();

            // Draw Rank
            if(npc.type === 'king' || npc.type === 'vizier') {
                ctx.fillStyle = '#ffcc00'; // Altın sarısı
                ctx.font = 'bold 30px Inter';
                ctx.textAlign = 'center';
                if(npc.type === 'king') {
                    ctx.fillText('^', npc.x, npc.y - 25);
                    ctx.fillText('^', npc.x, npc.y - 35);
                } else {
                    ctx.fillText('^', npc.x, npc.y - 30);
                }
            }
            
            ctx.fillStyle = '#fff';
            ctx.font = '30px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic'; // reset
            ctx.shadowColor = 'black'; ctx.shadowBlur = 12;
            let shortName = npc.name.split(' ')[0];
            if(npc.type === 'lord' || npc.type === 'king' || npc.type === 'vizier') {
                shortName = npc.name.replace(' Ordusu', '').replace(' Birliği', '');
            }
            ctx.fillText(`${shortName} (${npc.size})`, npc.x, npc.y - 30);
            ctx.shadowBlur = 0;
        });

        // Player (always visible)
        let isPrisoner = !!state.player.prisoner;

        ctx.save();
        ctx.translate(state.player.x, state.player.y);
        let pIsMoving = state.player.status === 'moving';
        if (pIsMoving && !isPrisoner) {
            let time = performance.now();
            ctx.translate(0, -Math.abs(Math.sin(time / 150)) * 8);
            ctx.rotate(Math.sin(time / 150) * 0.15);
        }

        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let pIcon = isPrisoner ? '⛓️' : (state.player.equipment.horse ? '🐴' : '🧑‍🌾');
        ctx.fillText(pIcon, 0, 0);
        ctx.restore();

        // Name and Troop Count
        ctx.fillStyle = isPrisoner ? '#ff6666' : '#ffcc00';
        ctx.font = 'bold 30px Inter';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black'; ctx.shadowBlur = 12;
        let troopCount = state.player.party.length + 1;
        ctx.fillText(`${state.player.name} (${troopCount})`, state.player.x, state.player.y - 45);
        ctx.shadowBlur = 0;

        // Esir durumu ikonu
        if(isPrisoner) {
            ctx.font = '33px Arial';
            ctx.fillText(`⛓️ Esir (${state.player.prisoner.daysLeft}g)`, state.player.x, state.player.y + 54);
        }

        // Target line
        if(state.player.targetLocation && state.player.status === 'moving') {
            ctx.beginPath();
            ctx.moveTo(state.player.x, state.player.y);
            ctx.lineTo(state.player.targetLocation.x, state.player.targetLocation.y);
            ctx.strokeStyle = 'rgba(255,204,0,0.4)';
            ctx.lineWidth = 12;
            ctx.setLineDash([12,12]); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.restore();
    },

    handleMapHover(e) {
        let rect = this.mapCanvas.getBoundingClientRect();
        let mx = ((e.clientX - rect.left) / this.camera.zoom) + this.camera.x;
        let my = ((e.clientY - rect.top) / this.camera.zoom) + this.camera.y;
        let tooltip = document.getElementById('map-tooltip');
        let found = null;

        for(let loc of LOCATIONS) {
            if(this.dist(loc, {x:mx,y:my}) < 36) { found = {name:loc.name, sub: (FACTIONS[loc.faction]||{name:''}).name + (loc.type==='city'?' (Şehir)':loc.type==='castle'?' (Kale)':' (Köy)')}; break; }
        }
        if(!found) {
            for(let npc of state.npcParties) {
                if(this.dist(npc,{x:mx,y:my}) < 30 && this.dist(npc, state.player) <= state.player.visibility) {
                    found = {name:npc.name, sub:`Asker: ${npc.size}`}; break;
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
            if(this.dist(npc,{x:mx,y:my}) < 30 && this.dist(npc, state.player) <= state.player.visibility) {
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

        let isEnemy = state.player.vassalOf && state.player.vassalOf !== loc.faction && state.player.vassalOf !== 'player_kingdom';

        if(isEnemy && (loc.type==='city'||loc.type==='castle')) {
            this.addBtn(ac, '⚔️ Kuşat ve Saldır!', () => this.besiegeLocation(loc));
        } else {
            if(loc.type === 'city') {
                this.addBtn(ac, '🛒 Pazara Git', () => this.openMarket(loc));
                this.addBtn(ac, '🍺 Hana Gir', () => this.openTavern(loc));
                if(state.activeTournaments[loc.id]) {
                    this.addBtn(ac, '🏆 Turnuvaya Katıl', () => this.joinTournament(loc));
                }
                this.addBtn(ac, '👑 Lordlar Salonuna Git', () => this.openLordsHall(loc));
                if(loc.volunteersAvailable > 0) {
                    this.addBtn(ac, '🪖 Gönüllü Topla', () => this.recruitVolunteers(loc));
                }
            } else if(loc.type === 'castle') {
                this.addBtn(ac, '👑 Lordlar Salonuna Git', () => this.openLordsHall(loc));
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
        </div>`;
        this.showModal(html);
        this._marketMult = 0.8 + Math.random()*0.4;
        this.refreshMarket();
    },
    refreshMarket() {
        let m = this._marketMult;
        let buy = document.getElementById('market-buy'); buy.innerHTML = '';
        Object.values(ITEMS).forEach(item => {
            let price = Math.floor(item.basePrice * m);
            let li = document.createElement('li'); li.style.marginBottom = '0.5rem';
            li.innerHTML = `${item.icon} ${item.name} - <b>${price}₺</b> <button class="btn" style="padding:0.2rem 0.5rem;font-size:0.8rem" onclick="Game.buyItem('${item.id}',${price})">Al</button>`;
            buy.appendChild(li);
        });
        let sell = document.getElementById('market-sell'); sell.innerHTML = '';
        state.player.inventory.forEach((item,i) => {
            if(item.type === 'trade') {
                let price = Math.floor(item.basePrice * m * 0.7);
                let li = document.createElement('li'); li.style.marginBottom = '0.5rem';
                li.innerHTML = `${item.icon||'📦'} ${item.name} x${item.qty} - <b>${price}₺</b> <button class="btn" style="padding:0.2rem 0.5rem;font-size:0.8rem" onclick="Game.sellItem(${i},${price})">Sat</button>`;
                sell.appendChild(li);
            }
        });
    },
    buyItem(id, price) {
        if(state.player.money < price) return alert('Yeterli dinarın yok!');
        state.player.money -= price;
        let ex = state.player.inventory.find(i=>i.id===id);
        if(ex) ex.qty++; else state.player.inventory.push({...ITEMS[id], qty:1});
        this.updateTopBar(); this.refreshMarket();
    },
    sellItem(idx, price) {
        let item = state.player.inventory[idx];
        state.player.money += price;
        item.qty--;
        if(item.qty <= 0) state.player.inventory.splice(idx,1);
        this.updateTopBar(); this.refreshMarket();
    },

    // --- TAVERN ---
    openTavern(loc) {
        this.showModal(`<h3>🍺 Han - ${loc.name}</h3><p>Hancı sana gülümsüyor. "Hoşgeldin yolcu!"</p>
        <p>Burada dinlenip canını yenileyebilirsin. (10 Dinar)</p>
        <button class="btn primary" onclick="Game.restAtTavern()">Dinlen</button>`);
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

    // --- LORDS HALL ---
    openLordsHall(loc) {
        let f = FACTIONS[loc.faction] || {name:'?',ruler:'?'};
        let html = `<h3>👑 Lordlar Salonu - ${loc.name}</h3><p>${f.ruler} ve soylular burada.</p>
        <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem;">`;
        if(!state.player.vassalOf) {
            html += `<button class="btn" onclick="Game.swearFealty('${loc.faction}')">Krala Yemin Et (Derebeyi Ol) — 50 Nam gerekir</button>`;
        }
        if(!state.player.spouse) {
            html += `<button class="btn" onclick="Game.courtNoble()">Soylularla Görüş ve Evlen — 100 Nam gerekir</button>`;
        }
        html += `</div>`;
        this.showModal(html);
    },
    swearFealty(fid) {
        if(state.player.renown < 50) return alert('Derebeyi olmak için en az 50 Nam gerekli.');
        state.player.vassalOf = fid;
        state.player.rightToRule += 5;
        alert(`Artık ${FACTIONS[fid].name} derebeyisin!`);
        this.closeModal(); this.updateTopBar();
    },
    courtNoble() {
        if(state.player.renown < 100) return alert('Evlenmek için en az 100 Nam gerekli.');
        let names = ['Leydi Isolla','Leydi Sonadel','Leydi Nelda','Leydi Safiya','Leydi Aesa'];
        let sp = names[Math.floor(Math.random()*names.length)];
        state.player.spouse = sp;
        state.player.party.push({name: sp+' (Eş)', level:10, type:'noble'});
        alert(`${sp} ile evlendin! Eşin grubuna katıldı.`);
        this.closeModal(); this.updateTopBar();
    },

    // --- SIEGE ---
    besiegeLocation(loc, founding = false) {
        let garrison = loc.type === 'city' ? 30 : 15;
        this.showModal(`<h3>🏰 Kuşatma - ${loc.name}</h3>
        <p>Garnizonda tahmini <b>${garrison}</b> asker var.</p>
        <button class="btn primary" onclick="Game.closeModal(); Game.startSiege('${loc.id}',${garrison},${founding})">⚔️ Saldırıya Geç!</button>
        <button class="btn" onclick="Game.closeModal()">Vazgeç</button>`);
    },
    startSiege(locId, count, founding) {
        state.player.currentSiege = { locId, foundingKingdom: founding };
        Battle.start('Garnizon', count);
    },

    // --- VILLAGE ---
    talkToElder(loc) {
        let dialog = this.getHumorousDialog('elder', loc);
        this.showModal(`<h3>🧓 Köy Yaşlısı</h3><p><i>${dialog}</i></p>`);
    },
    recruitVolunteers(loc) {
        let amount = loc.volunteersAvailable;
        let cost = 10;
        this.showModal(`<h3>🪖 Gönüllü Topla</h3><p>${amount} gönüllü hazır. Kişi başı ${cost} Dinar.</p>
        <button class="btn primary" onclick="Game.doRecruit('${loc.id}',${amount},${cost})">İşe Al (${amount*cost} Dinar)</button>`);
    },
    doRecruit(locId, amount, cost) {
        let total = amount * cost;
        if(state.player.money < total) return alert('Yeterli dinarın yok!');
        if(state.player.party.length + amount > this.getPartyCapacity()) return alert('Grubunda yer yok!');
        state.player.money -= total;
        let loc = LOCATIONS.find(l => l.id === locId);
        if(loc) {
            loc.volunteersAvailable = 0;
            loc.lastRecruitDay = state.time.day;
        }
        
        for(let i=0;i<amount;i++) {
            state.player.party.push({
                id: 'troop_' + Math.random().toString(36).substr(2,9),
                name: 'Acemi Asker',
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
        let basePath = 'C:/Users/Administrator/.gemini/antigravity/brain/123fc75a-27dc-41ef-a9e9-1c9cabe9fc06/';
        let bgImage = type === 'lords' ? basePath + 'lore_bg_lords_1784497086865.jpg' : basePath + 'lore_bg_kingdoms_1784497095972.jpg';
        let modalHtml = `<div style="text-align:center;">
            <h2 style="font-family: 'Cinzel', serif; color: #ffcc00; font-size: 2.5rem; margin-bottom: 2rem; text-shadow: 0 0 10px rgba(255,204,0,0.5);">${title}</h2>
            <div style="display:flex; flex-direction:column; gap: 2rem; text-align:left; max-height: 65vh; overflow-y:auto; padding-right:1rem; scrollbar-width: thin; scrollbar-color: var(--primary) #111;">`;
            
        if(type === 'lords') {
            LORDS.forEach(l => {
                let factionName = FACTIONS[l.faction] ? FACTIONS[l.faction].name : 'Bilinmiyor';
                let factionColor = FACTIONS[l.faction] ? FACTIONS[l.faction].color : '#fff';
                let imgHtml = l.isDirectImage 
                    ? `<div style="padding: 12px; background: linear-gradient(135deg, #5c3a21, #2a160b); box-shadow: inset 0 0 15px #000, 0 10px 20px rgba(0,0,0,0.9); border: 2px solid #111; border-radius: 2px; display: inline-block;">
                           <div style="border: 6px ridge #dca243; padding: 4px; background: #1a0b02; box-shadow: inset 0 0 10px #000;">
                               <img src="${l.portrait}" style="display:block; width: 140px; height: 140px; object-fit: cover; filter: sepia(0.2) contrast(1.1);">
                           </div>
                       </div>`
                    : `<div style="padding: 12px; background: linear-gradient(135deg, #5c3a21, #2a160b); box-shadow: inset 0 0 15px #000, 0 10px 20px rgba(0,0,0,0.9); border: 2px solid #111; border-radius: 2px; display: inline-block;">
                           <div style="border: 6px ridge #dca243; padding: 4px; background: #1a0b02; box-shadow: inset 0 0 10px #000;">
                               <div style="width: 140px; height: 140px; background-image: url('${l.portrait}'); background-position: ${l.bgOffsetX}px ${l.bgOffsetY}px; background-size: 450px auto; filter: sepia(0.2) contrast(1.1);"></div>
                           </div>
                       </div>`;
                
                modalHtml += `<div style="display:flex; gap: 3rem; align-items: center; background: rgba(0,0,0,0.6); padding: 1.5rem 3rem; border-radius: 8px;">
                    ${imgHtml}
                    <div>
                        <h3 style="color:${factionColor}; font-size: 1.8rem; margin-bottom: 0.5rem; font-family: 'Cinzel', serif;">${l.name}</h3>
                        <p style="color: #eee; line-height: 1.4; font-size: 1.5rem; font-family: 'Gabriola', 'Cormorant Garamond', 'Georgia', serif; font-style: italic;">${l.lore}</p>
                    </div>
                </div>`;
            });
        } else {
            let i = 0;
            let crestBg = basePath + 'kingdom_crests_1784496504882.jpg';
            Object.values(FACTIONS).forEach(f => {
                if(f.id === 'player') return;
                let bgX = (i % 3) * -150;
                let bgY = Math.floor(i / 3) * -150;
                i++;
                let imgHtml = `<div style="padding: 12px; background: linear-gradient(135deg, #5c3a21, #2a160b); box-shadow: inset 0 0 15px #000, 0 10px 20px rgba(0,0,0,0.9); border: 2px solid #111; border-radius: 2px; display: inline-block;">
                           <div style="border: 6px ridge #dca243; padding: 4px; background: #1a0b02; box-shadow: inset 0 0 10px #000;">
                               <div style="width: 140px; height: 140px; background-image: url('${crestBg}'); background-position: ${bgX}px ${bgY}px; background-size: 450px auto; filter: sepia(0.2) contrast(1.1);"></div>
                           </div>
                       </div>`;
                
                modalHtml += `<div style="display:flex; gap: 3rem; align-items: center; background: rgba(0,0,0,0.6); padding: 1.5rem 3rem; border-radius: 8px;">
                    ${imgHtml}
                    <div>
                        <h3 style="color:${f.color}; font-size: 1.8rem; margin-bottom: 0.5rem; font-family: 'Cinzel', serif;">${f.name}</h3>
                        <p style="color: #eee; line-height: 1.4; font-size: 1.5rem; font-family: 'Gabriola', 'Cormorant Garamond', 'Georgia', serif; font-style: italic;">${f.lore}</p>
                    </div>
                </div>`;
            });
        }

        modalHtml += `</div>
            <button class="btn primary" style="margin-top:2rem; width:200px; align-self:center;" onclick="Game.closeModal()">Kapat</button>
        </div>`;
        this.showModal(modalHtml, '1000px', bgImage);
    },

    // --- CHARACTER ---
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
            <ul style="list-style:none;display:flex;flex-direction:column;gap:0.8rem;">
                <li>
                    💪 <strong>Güç:</strong> ${s.str} 
                    ${pts > 0 ? `<button class="btn" style="padding:0 0.4rem;font-size:0.8rem;margin-left:0.5rem;" onclick="Game.addStat('str')">+</button>` : ''}
                    <div style="font-size:0.75rem;color:var(--text-muted)">Hasarınızı artırır (+1 yakın dövüş hasarı) ve turnuvalardaki hedeflerin kalma süresini uzatır.</div>
                </li>
                <li>
                    🏃 <strong>Çeviklik:</strong> ${s.agi} 
                    ${pts > 0 ? `<button class="btn" style="padding:0 0.4rem;font-size:0.8rem;margin-left:0.5rem;" onclick="Game.addStat('agi')">+</button>` : ''}
                    <div style="font-size:0.75rem;color:var(--text-muted)">Haritadaki seyahat hızınızı (+1.5) ve savaş alanındaki yürüme/koşma hızınızı (+0.5) artırır. Turnuva hedefleri büyür.</div>
                </li>
                <li>
                    🧠 <strong>Zeka:</strong> ${s.int} 
                    ${pts > 0 ? `<button class="btn" style="padding:0 0.4rem;font-size:0.8rem;margin-left:0.5rem;" onclick="Game.addStat('int')">+</button>` : ''}
                    <div style="font-size:0.75rem;color:var(--text-muted)">Görüş mesafenizi (savaş sisi çemberini) genişletir (+10 birim).</div>
                </li>
                <li>
                    ✨ <strong>Karizma:</strong> ${s.cha} 
                    ${pts > 0 ? `<button class="btn" style="padding:0 0.4rem;font-size:0.8rem;margin-left:0.5rem;" onclick="Game.addStat('cha')">+</button>` : ''}
                    <div style="font-size:0.75rem;color:var(--text-muted)">Maksimum grup kapasitenizi artırır (+2 asker).</div>
                </li>
            </ul>
        </div>
        </div>`;

        let fp = s.focusPoints || 0;
        let profs = [
            { id: 'oneHanded', name: 'Tek Elli Silahlar' },
            { id: 'twoHanded', name: 'Çift Elli Silahlar' },
            { id: 'polearm', name: 'Göndergeli Silahlar' },
            { id: 'bow', name: 'Okçuluk' },
            { id: 'riding', name: 'Binicilik' },
            { id: 'athletics', name: 'Atletizm' },
            { id: 'leadership', name: 'Liderlik' }
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
    addStat(type) {
        let s = state.player.stats;
        if(s.attributePoints && s.attributePoints > 0) {
            s[type]++;
            s.attributePoints--;
            if(type === 'int') {
                state.player.visibility = 500 + (s.int - 10) * 30;
            }
            this.updateStatsFromEquip();
            this.renderCharacterScreen();
            this.updateTopBar();
        }
    },

    // --- PARTY ---
    renderPartyScreen() {
        let html = `<p>Kapasite: ${state.player.party.length}/${state.player.partyCapacity}</p><hr style="margin:0.8rem 0;border-color:var(--panel-border)">`;
        if(state.player.party.length === 0) html += '<p>Grubunda hiç asker yok.</p>';
        else {
            let groups = {};
            state.player.party.forEach(t => {
                if(!groups[t.name]) {
                    groups[t.name] = { count: 0, ready: [], normal: [] };
                }
                if(t.xp >= t.xpNext && TROOP_UPGRADES[t.name]) {
                    groups[t.name].ready.push(t);
                } else {
                    groups[t.name].normal.push(t);
                }
                groups[t.name].count++;
            });

            html += '<ul style="list-style:none;">';
            for(let name in groups) {
                let g = groups[name];
                let typeInfo = TROOP_TYPES[name] || { type: 'infantry', icon: '🪖' };
                html += `<li style="padding:0.8rem;background:rgba(0,0,0,0.2);margin-bottom:0.5rem;border-radius:6px;display:flex;justify-content:space-between;align-items:center;border:1px solid var(--panel-border);">
                <div>
                    <span style="font-size:1.2rem;margin-right:0.5rem;">${typeInfo.icon}</span>
                    <strong style="color:var(--primary)">${name}</strong> x${g.count}
                    <div style="font-size:0.75rem;color:var(--text-muted)">Tür: ${typeInfo.type==='infantry'?'Piyade':typeInfo.type==='archer'?'Okçu':'Süvari'}</div>
                </div>`;
                
                if(g.ready.length > 0) {
                    let upgradeChoices = TROOP_UPGRADES[name];
                    html += `<div style="display:flex;gap:0.4rem;margin-top:0.4rem;">`;
                    upgradeChoices.forEach(choice => {
                        html += `<button class="btn primary" style="font-size:0.75rem;padding:0.3rem 0.6rem" onclick="Game.promoteTroop('${name.replace(/'/g,"\\'")}', '${choice.name.replace(/'/g,"\\'")}', ${choice.cost})">
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
        document.getElementById('party-list').innerHTML = html;
    },
    promoteTo51(id) {
        let t = state.player.party.find(x => x.id === id);
        let tokenIdx = state.player.inventory.findIndex(i => i.id === 'lvl51_token');
        if(t && tokenIdx !== -1) {
            let token = state.player.inventory[tokenIdx];
            token.qty--;
            if(token.qty <= 0) state.player.inventory.splice(tokenIdx, 1);
            
            t.level = 51;
            t.name = 'Efsanevi ' + t.name;
            
            alert(`${t.name} doğdu! Artık maaş istemez, yemek yemez ve muazzam güçlü!`);
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
            let nextTier = (newName === 'Svadya Çavuşu' || newName === 'Svadya Keskin Nişancısı' || newName === 'Svadya Şövalyesi') ? 3 : 2;
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
                ${canEquip ? `<button class="btn primary" style="font-size:0.7rem;padding:0.2rem 0.4rem;margin-top:0.3rem" onclick="Game.equipItem(${i})">Kuşan</button>` : ''}
                ${isUse ? `<button class="btn" style="border-color:#ffaa00;color:#ffaa00;font-size:0.7rem;padding:0.2rem 0.4rem;margin-top:0.3rem" onclick="Game.useItem(${i})">Kullan</button>` : ''}
                </div>`;
            });
            html += '</div>';
        }
        html += '</div></div>';
        document.getElementById('inventory-content').innerHTML = html;
    },
    _eqSlot(label, slot, item) {
        return `<div style="background:rgba(0,0,0,0.3);padding:0.8rem;border-radius:6px;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;">
        <div><div style="font-size:0.75rem;color:var(--text-muted)">${label}</div>
        <div style="font-weight:bold">${item ? (item.icon||'')+' '+item.name : 'Yok'}</div></div>
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
    updateStatsFromEquip() {
        let e = state.player.equipment;
        state.player.stats.maxHp = 50 + (e.armor ? (e.armor.defense||0) : 0);
        if(state.player.stats.hp > state.player.stats.maxHp) state.player.stats.hp = state.player.stats.maxHp;
    },

    // --- LEVEL UP ---
    checkLevelUp() {
        let s = state.player.stats;
        while(s.xp >= s.xpNext) {
            s.xp -= s.xpNext;
            s.level++;
            s.xpNext = Math.floor(s.xpNext * 1.5);
            s.attributePoints = (s.attributePoints || 0) + 2; // Seviye başına 2 puan
            s.focusPoints = (s.focusPoints || 0) + 3; // Bannerlord tarzı seviye başına 3 odak puanı
            s.maxHp += 10;
            s.hp = s.maxHp;
            alert(`Seviye atladın! Artık Lvl ${s.level}. 2 Nitelik, 3 Odak Puanı kazandın. Niteliklerini karakter ekranından dağıtabilirsin.`);
        }
        this.updateTopBar();
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
        
        if(Math.random() * 100 <= (p.escapeChance || 0)) {
            alert('Harika! Gardiyanların dalgınlığından yararlanarak başarıyla kaçtın!');
            state.player.prisoner = null;
            state.player.status = 'idle';
        } else {
            alert('Kahretsin! Kaçış girişimin fark edildi. Tüm planların suya düştü ve ceza aldın!');
            p.escapeChance = Math.max(0, (p.escapeChance || 0) - 60);
            p.isPlanning = false;
        }
        this.renderPrisonerUI();
    }
};

// --- BATTLE ---
const Battle = {
    canvas: null, ctx: null, units: [], projectiles: [], bloodStains: [], floatingTexts: [], active: false, loopId: null, clickHandler: null, commandListener: null, currentCommand: 'charge',

    start(enemyName, enemyCount, bossLevel = null) {
        Input.keys = {}; // Tuşları temizle
        this.canvas = document.getElementById('battle-canvas');
        this.ctx = this.canvas.getContext('2d');
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
        this.currentCommand = 'charge';
        this.active = true;

        let startPlayerX = enemyCount < 30 ? W/2 - 200 - Math.random()*100 : 80;
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

        // Player
        this.units.push({
            id: 'player', isPlayerTeam: true,
            hp: state.player.stats.hp, maxHp: state.player.stats.maxHp,
            x: startPlayerX, y: H/2, speed: 50 + state.player.stats.agi * 0.5, // Yarı hız
            attack: 10 + state.player.stats.str + weaponAtk,
            defense: armorDef, type: 'infantry',
            color: '#ffcc00', radius: 8, _cd: 0,
            isAttacking: false, attackTimer: 0, hitList: [], angleToMouse: 0
        });

        // Troops (Player's party)
        state.player.party.forEach((p, i) => {
            let baseName = p.name.replace('Efsanevi ', '');
            let typeInfo = TROOP_TYPES[baseName] || { hp: 30, speed: 60, attack: 8, defense: 0, type: 'infantry', icon: '🪖' };
            let lvlBonusHp = p.level * 2 + (p.level===51?100:0);
            let lvlBonusAtk = Math.floor(p.level / 3) + (p.level===51?15:0);
            let debuff = p.debuff ? 0.7 : 1;

            this.units.push({
                id: p.id, isPlayerTeam: true,
                hp: (typeInfo.hp + lvlBonusHp) * debuff, maxHp: (typeInfo.hp + lvlBonusHp) * debuff,
                x: startPlayerX - 20 + Math.random()*60, y: 50 + Math.random()*(H-100),
                speed: typeInfo.speed * debuff, attack: (typeInfo.attack + lvlBonusAtk) * debuff, defense: typeInfo.defense,
                type: typeInfo.type, color: typeInfo.type === 'cavalry' ? '#33ddff' : typeInfo.type === 'archer' ? '#55ff55' : '#33aaff',
                radius: typeInfo.type === 'cavalry' ? 7 : 5, _cd: 0
            });
        });

        // Enemies (Bandits vs Faction Lords vs Boss)
        let isBandit = enemyName.toLowerCase().includes('çapulcu');
        for(let i=0; i<enemyCount; i++) {
            let name = 'Çapulcu';
            let hp = 20, speed = 50, attack = 6, defense = 0, type = 'infantry', color = '#ff4444', radius = 5;
            
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
                // Faction troop (derebeyi askeri - daha güçlü ve karma)
                let r = Math.random();
                if(r < 0.4) {
                    name = 'Milis Piyade';
                    hp = 40; speed = 60; attack = 11; defense = 5; type = 'infantry'; radius = 5;
                } else if(r < 0.7) {
                    name = 'Milis Okçu';
                    hp = 35; speed = 55; attack = 7; defense = 2; type = 'archer'; radius = 5;
                } else {
                    name = 'Milis Süvari';
                    hp = 50; speed = 95; attack = 13; defense = 7; type = 'cavalry'; radius = 7;
                }
                color = '#ff6666';
            }

            let enemyLvl = 1;
            if(bossLevel) {
                if(i===0) enemyLvl = bossLevel;
                else enemyLvl = bossLevel - 10;
            } else if(!isBandit) {
                enemyLvl = 5 + Math.floor(state.time.day / 15);
            } else {
                enemyLvl = 1 + Math.floor(state.time.day / 30);
            }

            this.units.push({
                id: 'enemy_'+i, isPlayerTeam: false,
                hp: hp, maxHp: hp,
                x: startEnemyX + Math.random()*80, y: 50 + Math.random()*(H-100),
                speed: speed, attack: attack, defense: defense,
                type: type, color: color, radius: radius, _cd: 0, level: enemyLvl
            });
        }

        document.getElementById('battle-log-left').innerHTML = '<div class="log-msg" style="background:rgba(0,0,0,0.6);padding:5px;border-radius:5px;color:#fff;"><b>Savaş Başladı!</b><br>WASD = Hareket, Sol Tık = Saldırı<br>Taktik Emirleri: [1] Takip, [2] Hücum, [3] Bekle</div>';
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

        this.clickHandler = (e) => this.playerAttack(e);
        this.canvas.addEventListener('mousedown', this.clickHandler);

        this.commandListener = (e) => {
            if(e.key === '1') {
                this.currentCommand = 'follow';
                this.log('🔊 Emir: <b>Beni Takip Edin!</b>');
            } else if(e.key === '2') {
                this.currentCommand = 'charge';
                this.log('🔊 Emir: <b>Hücum Edin!</b>');
            } else if(e.key === '3') {
                this.currentCommand = 'hold';
                this.log('🔊 Emir: <b>Mevzi Koruyun!</b>');
            }
        };
        window.addEventListener('keydown', this.commandListener);

        let last = performance.now();
        const loop = (t) => {
            if(!this.active) return;
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
        if(!p || p.hp <= 0 || p.isAttacking) return; // Zaten saldırıyorsa veya öldüyse tekrar başlatma

        p.isAttacking = true;
        p.attackTimer = 0.3; // 300ms saldırı süresi
        p.hasHit = false; // Tek hedefe vurmak için
        p.angleToMouse = Math.atan2(Input.mouse.y - p.y, Input.mouse.x - p.x);
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
        if(t) {
            if(t.level >= 50) return; // 50'den sonrası sadece Boss Nişanı ile
            if(TROOP_UPGRADES[t.name] && t.xp >= t.xpNext) return; // Terfiye hazır, XP alamaz

            t.xp++;
            if(t.xp >= t.xpNext) {
                if(TROOP_UPGRADES[t.name]) {
                    this.log(`🔥 <b>${t.name}</b> Terfiye Hazır! (Grup ekranından sınıf atlatın)`);
                } else {
                    t.level++;
                    t.xp = 0;
                    t.xpNext = t.level < 30 ? 3 + t.level : 5 + t.level * 2;
                    this.log(`🔥 <b>${t.name}</b> Seviye Atladı! (Lvl ${t.level})`);
                }
            }
        }
    },

    update(dt) {
        if(dt <= 0) return; // FIX NaN POISONING
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
                    let dmg = Math.max(1, proj.damage - u.defense);
                    u.hp -= dmg;
                    hit = true;
                    this.bloodStains.push({ x: u.x, y: u.y, alpha: 1.0, size: 2.5 + Math.random()*2 });
                    this.floatingTexts.push({ x: u.x, y: u.y - 12, text: `-${dmg}`, color: proj.isPlayerTeam ? '#ff5555' : '#ff8888', life: 0.8 });
                    
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

        // Battle pings
        if(this.battlePings) {
            this.battlePings.forEach(p => p.life -= dt);
            this.battlePings = this.battlePings.filter(p => p.life > 0);
        }

        // Units movement & action update
        this.units.forEach(u => {
            if(u.hp <= 0) return;

            u.vx = 0; u.vy = 0; // Reset velocity
            
            let { speedMod, attackMod } = this.getTerrainEffects(u);
            let uSpeed = u.speed * speedMod;
            let uAttack = u.attack * attackMod;

            if(u.id === 'player') {
                let spd = u.speed;
                // Saldırı (Sweep) Logic
                if(u.isAttacking) {
                    u.attackTimer -= dt;
                    
                    if(u.attackTimer <= 0.15 && !u.hasHit) {
                        u.hasHit = true;
                        // Çarpışma kontrolü
                        let hitDist = 45;
                        let hitAngleRange = Math.PI / 3; 
                        this.units.forEach(e => {
                            if(e.hp > 0 && e.isPlayerTeam !== u.isPlayerTeam) {
                                let dx = e.x - u.x, dy = e.y - u.y;
                                let dist = Math.sqrt(dx*dx+dy*dy);
                                let angle = Math.atan2(dy, dx);
                                let diff = Math.abs(angle - u.angleToMouse);
                                while(diff > Math.PI) diff = 2*Math.PI - diff;
                                
                                if(dist <= hitDist && diff <= hitAngleRange) {
                                    let dmg = Math.max(1, Math.ceil(uAttack / 3) - (e.defense || 0));
                                    e.hp -= dmg;
                                    this.bloodStains.push({ x: e.x, y: e.y, alpha: 1.0, size: 3 + Math.random()*3 });
                                    this.floatingTexts.push({ x: e.x, y: e.y - 12, text: `-${dmg}`, color: '#ff3333', life: 0.8 });
                                    if(e.hp <= 0) {
                                        this.logKill(e, u);
                                    }
                                }
                            }
                        });
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
                return;
            }

            if(u.type === 'cavalry' && u.hp < u.maxHp * 0.5 && !u.dismounted) {
                u.type = 'infantry';
                u.dismounted = true;
                u.speed = Math.max(50, u.speed - 30);
                this.floatingTexts.push({ x: u.x, y: u.y - 12, text: 'Attan Düştü!', color: '#ffaa00', life: 1.0 });
            }

            // Terrain effects already calculated above

            // Find closest enemy
            let closest = null, minD = Infinity;
            this.units.forEach(e => {
                if(e.hp<=0 || e.isPlayerTeam === u.isPlayerTeam) return;
                let d = Math.sqrt(Math.pow(e.x-u.x,2)+Math.pow(e.y-u.y,2));
                if(d < minD) { minD = d; closest = e; }
            });

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
                        if(finalDist < 40) {
                            let dx = u.x - closest.x, dy = u.y - closest.y;
                            let len = Math.sqrt(dx*dx + dy*dy);
                            u.vx = (dx/len)*uSpeed; u.vy = (dy/len)*uSpeed;
                            u.x += u.vx*dt; u.y += u.vy*dt;
                        } else {
                            let shootCd = u.isPlayerTeam ? 1800 : 1200;
                            if(!u._cd || performance.now() - u._cd > shootCd) {
                                u._cd = performance.now();
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
                                    damage: uAttack, isPlayerTeam: u.isPlayerTeam, sourceId: u.id
                                });
                            }
                        }
                    } else {
                        let dx = closest.x-u.x, dy = closest.y-u.y;
                        let r = Math.min(uSpeed*dt/finalDist, 1);
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
                if(currentTargetDist > meleeRange) {
                    let dx = targetX-u.x, dy = targetY-u.y;
                    let r = Math.min(uSpeed*dt/Math.max(1, currentTargetDist), 1);
                    u.vx = dx*r/dt; u.vy = dy*r/dt;
                    u.x += dx*r; u.y += dy*r;
                } else if(finalDist <= meleeRange) {
                    if(!u._cd || performance.now()-u._cd > 1000) {
                        let dmg = Math.max(1, uAttack - (closest.defense||0));
                        closest.hp -= dmg;
                        u._cd = performance.now();
                        this.bloodStains.push({ x: closest.x, y: closest.y, alpha: 1.0, size: 3 + Math.random()*3 });
                        this.floatingTexts.push({ x: closest.x, y: closest.y - 12, text: `-${dmg}`, color: u.isPlayerTeam ? '#ff5555' : '#ff8888', life: 0.8 });
                        if(closest.hp <= 0) {
                            this.logKill(closest, u);
                            this.awardTroopXp(u.id);
                        }
                    }
                }
            }
        });

        this.checkEnd();
    },

    render() {
        let ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
        ctx.clearRect(0,0,W,H);
        ctx.fillStyle = '#1e381e'; // Green field
        ctx.fillRect(0,0,W,H);

        // Draw Terrain
        if(this.terrain) {
            // Rivers
            if(this.terrain.rivers) {
                ctx.fillStyle = 'rgba(64, 164, 223, 0.5)';
                this.terrain.rivers.forEach(r => {
                    ctx.fillRect(r.x, r.y, r.w, r.h);
                });
            }
            // Pits
            if(this.terrain.pits) {
                ctx.fillStyle = '#152515';
                this.terrain.pits.forEach(p => {
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
                });
            }
            // Forests
            if(this.terrain.forests) {
                this.terrain.forests.forEach(f => {
                    ctx.fillStyle = '#112211';
                    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fill();
                    ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText('🌲', f.x, f.y);
                    ctx.fillText('🌲', f.x-f.r/2, f.y-f.r/3);
                    ctx.fillText('🌲', f.x+f.r/2, f.y+f.r/3);
                });
            }
            // Hills
            if(this.terrain.hills) {
                ctx.fillStyle = '#264426';
                this.terrain.hills.forEach(h => {
                    ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI*2); ctx.fill();
                });
            }
        }

        // Render blood stains
        this.bloodStains.forEach(b => {
            ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI*2);
            ctx.fillStyle = `rgba(139, 0, 0, ${b.alpha})`; ctx.fill();
        });

        // Units
        ctx.strokeStyle = '#cccccc'; ctx.lineWidth = 2;
        this.projectiles.forEach(p => {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            // Draw a small line representing arrow velocity direction
            let angle = Math.atan2(p.vy, p.vx);
            ctx.lineTo(p.x - Math.cos(angle)*8, p.y - Math.sin(angle)*8);
            ctx.stroke();
        });

        // Units
        this.units.forEach(u => {
            if(u.hp <= 0) return;
            
            let icon = '💂';
            if(u.id === 'player') icon = state.player.equipment.horse ? '🐴' : '🧑‍🌾';
            else if(u.type === 'archer') icon = '🏹';
            else if(u.type === 'cavalry') icon = '🐎';
            
            let isMoving = (Math.abs(u.vx) > 0.1 || Math.abs(u.vy) > 0.1);
            let hop = 0;
            let sway = 0;
            if(isMoving) {
                let offset = (u.x + u.y) * 0.05;
                hop = Math.abs(Math.sin(performance.now()/150 + offset)) * 4;
                sway = Math.sin(performance.now()/150 + offset) * 0.15;
            }

            if(isMoving && Math.random() < 0.1) {
                // Dust particles
                ctx.fillStyle = 'rgba(200,200,200,0.4)';
                ctx.beginPath(); ctx.arc(u.x, u.y+5, 2+Math.random()*2, 0, Math.PI*2); ctx.fill();
            }

            ctx.save();
            ctx.translate(u.x, u.y - hop);
            if(isMoving) ctx.rotate(sway);

            ctx.font = '22px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, 0, 0);

            // Draw rank symbol
            if(u.level >= 5) {
                let rankStr = '';
                if(u.level >= 20) rankStr = '^';
                else if(u.level >= 15) rankStr = "'''";
                else if(u.level >= 10) rankStr = "''";
                else if(u.level >= 5) rankStr = "'";
                ctx.fillStyle = '#ffaa00';
                ctx.font = 'bold 16px Inter';
                ctx.fillText(rankStr, -12, -12);
            }

            ctx.restore();

            // Draw sword if attacking
            if(u.isAttacking && u.currentWeaponAngle !== undefined) {
                ctx.save();
                ctx.translate(u.x, u.y - hop);
                ctx.rotate(u.currentWeaponAngle); // Kılıcı tam hedefe doğru uzat
                ctx.scale(1.1, 1.1); // Kılıcı %10 büyüt
                
                // Metalik bir kılıç çizimi (emoji yerine)
                ctx.beginPath();
                ctx.moveTo(10, -2); ctx.lineTo(15, -2); // Kabza
                ctx.lineTo(15, -6); ctx.lineTo(18, -6); // Çaprazlık üst
                ctx.lineTo(18, -2); ctx.lineTo(40, -2); // Kılıç üst kenar
                ctx.lineTo(45, 0);  // Uç noktası
                ctx.lineTo(40, 2);  // Kılıç alt kenar
                ctx.lineTo(18, 2);  ctx.lineTo(18, 6);  // Çaprazlık alt
                ctx.lineTo(15, 6);  ctx.lineTo(15, 2);  // Kabza
                ctx.lineTo(10, 2);  ctx.closePath();
                
                ctx.fillStyle = '#ddd'; ctx.fill();
                ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.stroke();
                
                ctx.restore();
            }

            // HP bar
            let bw = 24;
            ctx.fillStyle = '#333'; ctx.fillRect(u.x-bw/2, u.y-18-hop, bw, 4);
            ctx.fillStyle = u.hp/u.maxHp > 0.5 ? '#2d2' : u.hp/u.maxHp > 0.25 ? '#dd2' : '#d22';
            ctx.fillRect(u.x-bw/2, u.y-18-hop, bw*(u.hp/u.maxHp), 4);
        });

        // Render floating texts
        ctx.textAlign = 'center';
        this.floatingTexts.forEach(f => {
            ctx.fillStyle = f.color; ctx.font = 'bold 11px Inter';
            ctx.fillText(f.text, f.x, f.y);
        });

        // Render battle pings
        if (this.battlePings) {
            this.battlePings.forEach(p => {
                let maxLife = 3.0;
                let progress = 1 - (p.life / maxLife); // 0'dan 1'e doğru büyür
                let size = 30 + progress * 20;
                let alpha = p.life > 1.0 ? 1.0 : p.life; // Son 1 saniyede kaybolur
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI*2);
                ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
                ctx.lineWidth = 3;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
                ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
                ctx.fill();

                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(p.label, p.x, p.y - size - 10);
            });
        }

        // Command HUD
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(10, H - 35, 340, 25);
        ctx.fillStyle = '#ffffff'; ctx.font = '12px Inter';
        let cmdName = this.currentCommand === 'follow' ? 'Takip Et (Defansif)' : this.currentCommand === 'hold' ? 'Mevzini Koru (Sabit)' : 'Hücum Et (Serbest)';
        ctx.fillText(`Mevcut Emir: ${cmdName} [Tuşlar: 1, 2, 3]`, 15, H - 18);

        // Tug of War Bar (Güç Çubuğu) - Animated & Humorous
        let playerAlive = this.units.filter(u => u.isPlayerTeam && u.hp > 0).length;
        let enemyAlive = this.units.filter(u => !u.isPlayerTeam && u.hp > 0).length;
        let totalAlive = playerAlive + enemyAlive;
        
        if (totalAlive > 0) {
            let ratio = playerAlive / totalAlive; // 0 to 1
            if (this.tugRatio === undefined) this.tugRatio = ratio;
            this.tugRatio += (ratio - this.tugRatio) * 0.1; // Smooth transition

            let barW = 500, barH = 30;
            let barX = W/2 - barW/2, barY = 25;

            // Shiny futuristic/fantasy background
            let gradient = ctx.createLinearGradient(barX, 0, barX+barW, 0);
            gradient.addColorStop(0, '#2ecc71'); // Green
            gradient.addColorStop(this.tugRatio, '#ffcc00'); // Clash point
            gradient.addColorStop(1, '#e74c3c'); // Red
            
            ctx.fillStyle = gradient;
            
            // Draw a hexagon/polygon bar background
            ctx.beginPath();
            ctx.moveTo(barX, barY);
            ctx.lineTo(barX+barW, barY);
            ctx.lineTo(barX+barW+15, barY+barH/2);
            ctx.lineTo(barX+barW, barY+barH);
            ctx.lineTo(barX, barY+barH);
            ctx.lineTo(barX-15, barY+barH/2);
            ctx.closePath();
            ctx.fill();

            // Draw a clash point indicator
            let clashX = barX + barW * this.tugRatio;
            let clashOffset = Math.sin(performance.now()/100) * 5; // Jitter effect
            ctx.fillStyle = '#fff';
            ctx.fillRect(clashX - 5 + clashOffset, barY - 10, 10, barH + 20);

            // Texts
            let statusText = "Kafa Kafaya! ⚔️";
            if(this.tugRatio > 0.8) statusText = "Ağlatıyoruz! 😂";
            else if(this.tugRatio > 0.6) statusText = "Tokatlıyoruz! 😎";
            else if(this.tugRatio < 0.2) statusText = "Eyvah Anam! 😱";
            else if(this.tugRatio < 0.4) statusText = "Dayak Yiyoruz! 😬";

            // Glow for text
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 5;

            ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Inter';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(statusText, W/2, barY - 15);

            ctx.font = 'bold 16px Inter';
            ctx.textAlign = 'left'; ctx.fillText(`Bizimkiler: ${playerAlive}`, barX + 10, barY + barH/2);
            ctx.textAlign = 'right'; ctx.fillText(`Çapulcular: ${enemyAlive}`, barX + barW - 10, barY + barH/2);
            
            ctx.shadowBlur = 0; // Reset
        }
    },

    logKill(victim, killer) {
        let vName = victim.name || (victim.isPlayerTeam ? 'Dost Asker' : 'Çapulcu');
        let kName = killer ? (killer.name || (killer.isPlayerTeam ? 'Dost Asker' : 'Çapulcu')) : 'Bilinmeyen';
        let msg = `${vName}, ${kName} tarafından öldürüldü.`;
        
        if (victim.isPlayerTeam) {
            this.log(`<span style="color:#ff4444">${msg}</span>`, 'right');
        } else {
            this.log(`<span style="color:#44ff44">${msg}</span>`, 'left');
        }
    },

    log(msg, side = 'left') {
        let b = document.getElementById(side === 'left' ? 'battle-log-left' : 'battle-log-right');
        if(!b) return;
        let div = document.createElement('div');
        div.className = 'log-msg';
        div.innerHTML = msg;
        div.style.background = 'rgba(0,0,0,0.6)';
        div.style.padding = '5px 10px';
        div.style.borderRadius = '5px';
        div.style.color = '#fff';
        div.style.fontFamily = 'Inter, sans-serif';
        div.style.fontSize = '0.85rem';
        div.style.transition = 'opacity 0.5s';
        
        b.prepend(div);
        while(b.children.length > 8) b.removeChild(b.lastChild);
        
        setTimeout(() => {
            if(b.contains(div)) div.style.opacity = '0';
            setTimeout(() => { if(b.contains(div)) b.removeChild(div); }, 500);
        }, 6000);
    },

    checkEnd() {
        let pAlive = this.units.some(u=>u.isPlayerTeam&&u.hp>0);
        let eAlive = this.units.some(u=>!u.isPlayerTeam&&u.hp>0);
        if(!pAlive) { this.active=false; this.endBattle(false); }
        else if(!eAlive) { this.active=false; this.endBattle(true); }
    },

    endBattle(won) {
        this.canvas.removeEventListener('mousedown', this.clickHandler);
        window.removeEventListener('keydown', this.commandListener);
        cancelAnimationFrame(this.loopId);

        if(won) {
            let xpGain = 30 + state.player.party.length * 5;
            let moneyGain = 50 + Math.floor(Math.random()*100);
            
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
            state.player.stats.xp += xpGain;

            let enemyCount = this.units.filter(u => !u.isPlayerTeam).length;
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
            if(state.player.currentEncounterNpcId) {
                state.npcParties = state.npcParties.filter(n => n.id !== state.player.currentEncounterNpcId);
                state.player.currentEncounterNpcId = null;
            }

            let resultHtml = `
            <div style="text-align:center;">
                <h2 style="color:#2ecc71;margin-bottom:1rem;font-size:2rem;text-shadow:0 0 10px rgba(46,204,113,0.5)">⚔️ Mükemmel Zafer! ⚔️</h2>
                <div style="background:rgba(0,0,0,0.3);padding:1.5rem;border-radius:10px;margin-bottom:1.5rem;font-size:1.2rem;line-height:1.6;text-align:left;">
                    <p style="margin-bottom:0.8rem"><b>Kazanılan Dinar:</b> <span style="color:#ffcc00">+${moneyGain}</span> 💰</p>
                    <p style="margin-bottom:0.8rem"><b>Kazanılan Şan/Nam:</b> <span style="color:#3498db">+3</span> 👑</p>
                    <p><b>Kazanılan Tecrübe:</b> <span style="color:#e74c3c">+${xpGain}</span> 🌟</p>
                </div>
                <button class="btn primary" style="font-size:1.2rem;padding:0.8rem 2rem;box-shadow:0 0 15px rgba(255,170,0,0.4);border-radius:8px" onclick="Game.closeModal(); Game.checkLevelUp(); Game.updateTopBar()">Kazanımları Al ve İlerle</button>
            </div>`;
            Game.showModal(resultHtml);
        } else {
            // Savaşı kaybettik — esir düştük
            let daysLost = 3 + Math.floor(Math.random() * 5);
            let ratio = 0.60 + Math.random() * 0.30;
            let moneyLost = Math.floor(state.player.money * ratio);
            state.player.money = Math.max(0, state.player.money - moneyLost);

            // Askerler dağılır
            state.player.party = [];
            state.player.stats.hp = Math.max(5, Math.floor(state.player.stats.maxHp * 0.3));

            // Esir sistemi
            let captorId = state.player.currentEncounterNpcId;
            let captor = captorId ? state.npcParties.find(n => n.id === captorId) : null;
            if(captor) {
                state.player.prisoner = { 
                    npcId: captor.id, npcName: captor.name, 
                    daysLeft: daysLost, 
                    ransomRequired: 0.75 + Math.random()*0.15, ransomRefusals: 0,
                    escapeChance: 0, isPlanning: false, lastAttemptDay: 0 
                };
                state.player.status = 'prisoner';
                Game.renderPrisonerUI();
            } else if(this.isBossFight) {
                alert('Savaş Tanrısı seni ezdi geçti. Tüm birliğini ve paranı kaybettin.');
            }
            state.player.currentEncounterNpcId = null;
            state.player.currentSiege = null;

            if(captor) alert(`Yenildin! Esir düştün! Tüm birliğin dağıldı.\n-${moneyLost} Dinar`);
        }

        // Sync HP
        let pUnit = this.units[0];
        state.player.stats.hp = Math.max(5, pUnit ? pUnit.hp : 5);

        // Remove dead troops
        let ti = 1;
        state.player.party = state.player.party.filter(() => {
            let u = this.units[ti++];
            return u && u.hp > 0;
        });

        Game.updateTopBar();
        Game.showScreen('map');
    },

    surrender() {
        this.active = false;
        this.canvas.removeEventListener('mousedown', this.clickHandler);
        window.removeEventListener('keydown', this.commandListener);
        cancelAnimationFrame(this.loopId);

        let captorId = state.player.currentEncounterNpcId;
        let captor = captorId ? state.npcParties.find(n => n.id === captorId) : null;
        if(captor) Game.surrender(captor.id, captor.name);
        else {
            alert('Teslim oldun! Birliğini kaybettin.');
            state.player.party = [];
            state.player.stats.hp = Math.max(5, Math.floor(state.player.stats.maxHp * 0.3));
        }
        Game.updateTopBar();
        Game.showScreen('map');
    },

};

// --- TOURNAMENT MINIGAME ---
const TournamentMinigame = {
    canvas:null, ctx:null, active:false, score:0, targets:[], spawnTimer:0, timeLeft:0, loopId:null, clickHandler:null,

    start() {
        this.canvas = document.getElementById('battle-canvas');
        this.ctx = this.canvas.getContext('2d');
        Game.showScreen('battle');
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.active = true;
        this.score = 0;
        this.targets = [];
        this.timeLeft = 25;
        this.spawnTimer = 0;

        document.getElementById('battle-log').innerHTML = '<b>🏆 Turnuva!</b> Hedeflere tıkla! 12 hedef vurursan kazanırsın.';

        this.clickHandler = (e) => this.onClick(e);
        this.canvas.addEventListener('mousedown', this.clickHandler);

        let last = performance.now();
        const loop = (t) => {
            if(!this.active) return;
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

        let agiBonus = state.player.stats.agi;
        let strBonus = state.player.stats.str;

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

        if(this.score >= 12) this.end(true);
    },

    render() {
        let ctx=this.ctx, W=this.canvas.width, H=this.canvas.height;
        ctx.clearRect(0,0,W,H);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0,0,W,H);

        ctx.fillStyle = '#fff'; ctx.font = '18px Inter';
        ctx.fillText(`Skor: ${this.score}/12`, 15, 25);
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
                document.getElementById('battle-log').innerHTML = `İsabet! (${this.score}/12)`;
                break;
            }
        }
    },

    end(won) {
        this.active = false;
        this.canvas.removeEventListener('mousedown', this.clickHandler);
        cancelAnimationFrame(this.loopId);
        if(won) {
            state.player.money += 500; state.player.renown += 20;
            alert('Turnuvayı kazandın! +500 Dinar, +20 Nam');
        } else {
            alert(`Elendin! Skor: ${this.score}/12`);
        }
        Game.updateTopBar();
        Game.showScreen('map');
    }
};

window.onload = () => Game.init();
