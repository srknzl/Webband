// ============================================
// WEBBAND - Mount & Blade Tarzı RPG
// ============================================

// Sürüm damgası (#55 madde 8): hata raporunda ve başlangıç ekranının köşesinde
// yazar. Oyuncunun masaüstü kısayolu her açılışta depoyu `main`'e çektiği için
// "hangi kodu konuşuyoruz" sorusunun tek cevabı budur; her tur elle artırılır.
const VERSION = { no: '0.66', date: '2026-09-10', name: 'Hafif Mod' };  // sürüm adı çevrilmez

// --- HATA TAMPONU VE DEBUG RAPORU (#52) ---
// Oyuncunun elinde ekran görüntüsünden fazlası olsun: hatalar halkasal tamponda
// birikir, kenar menüsündeki düğme her şeyi tek JSON'a çevirip panoya kopyalar.
// Dosyanın en başında durur ki oyun kurulurken atılan hata da yakalansın.
const Debug = {
    errors: [], MAX_ERRORS: 25, frames: [],
    log(kind, msg, extra) {
        this.errors.push(Object.assign({ t: new Date().toISOString().slice(11, 19), kind, msg: String(msg).slice(0, 400) }, extra || {}));
        if(this.errors.length > this.MAX_ERRORS) this.errors.shift();
        this.seen++;
        this.badge();
    },
    // Ekranın köşesindeki rozet (#55 madde 2): oyun sessizce ölmesin, hata
    // olduğunu konsolu açmayan oyuncu da görsün. Tıklayınca rapor açılır.
    seen: 0,
    badge() {
        let el = document.getElementById('err-badge');
        if(!el) return;
        el.textContent = T`⚠️ ${this.seen} hata — tıkla ve kopyala`;
        el.classList.toggle('hidden', !this.seen);
    },
    // Döngü gövdesini saran tek kapı: içeride atılan istisna rAF zincirini
    // koparıyordu (ekran donar, kimse bilmez). Artık hata bir kez raporlanır,
    // aynı imza tekrarlanırsa sayılır ve döngü yaşamaya devam eder.
    _sig: {},
    guard(where, fn) {
        try { return fn(); }
        catch(e) {
            let sig = where + '|' + (e && e.message);
            if(this._sig[sig]) { this._sig[sig]++; return; }
            this._sig[sig] = 1;
            this.log(T('döngü'), where + ': ' + ((e && e.message) || e), {
                yigin: ((e && e.stack) || '').split('\n').slice(1, 4).map(l => l.trim()).join(' | ')
            });
        }
    },
    init() {
        window.addEventListener('error', e => this.log('error', e.message, {
            at: (e.filename || '').split('/').pop() + ':' + e.lineno,
            stack: ((e.error && e.error.stack) || '').split('\n').slice(1, 4).map(l => l.trim()).join(' | ')
        }));
        window.addEventListener('unhandledrejection', e => this.log('promise', (e.reason && e.reason.message) || e.reason));
        let orig = console.error.bind(console);
        console.error = (...a) => { this.log('console', a.map(x => (x && x.message) || x).join(' ')); orig(...a); };
    },
    // skipFrame her rAF'ta çağırır: siyah ekran/donma şikâyetinde kare aralıkları belge olur
    frame(ms) { this.frames.push(Math.round(ms * 10) / 10); if(this.frames.length > 30) this.frames.shift(); },
    report() {
        let g = (f, d) => { try { let v = f(); return v === undefined ? d : v; } catch(e) { return T('hata: ') + e.message; } };
        let cv = id => g(() => { let c = document.getElementById(id); return c ? T`${c.width}x${c.height} (css ${Math.round(c.clientWidth)}x${Math.round(c.clientHeight)})` : 'yok'; });
        return {
            surum: { oyun: VERSION.no + ' — ' + VERSION.name, tarih: VERSION.date,
                     dosya: document.lastModified, adres: location.href.split('?')[0], zaman: new Date().toISOString() },
            oyun: g(() => {
                let p = state.player;
                return {
                    gun: state.time.day, saat: Math.floor(state.time.hour) + ':00', zamanOlcegi: state.timeScale,
                    ekran: (document.querySelector('.view.active') || {}).id,
                    modalAcik: !document.getElementById('modal-overlay').classList.contains('hidden'),
                    ad: p.name, seviye: p.stats.level, can: Math.floor(p.stats.hp) + '/' + p.stats.maxHp, dinar: p.money, nam: p.renown,
                    konum: { x: Math.round(p.x), y: Math.round(p.y) }, durum: p.status,
                    grup: p.party.length + '/' + Game.getPartyCapacity(), esir: (p.prisoners || []).length,
                    fraksiyon: Game.playerFaction(), damga: Game.infamy(),
                    kusatma: p.siege || null, yagma: p.raid || null, esaret: p.prisoner ? p.prisoner.npcName : null,
                    savaslar: Object.keys(state.wars || {}), gorevler: (p.quests || []).map(q => q.id)
                };
            }, T('oyun başlamamış')),
            cizim: {
                savasAktif: g(() => Battle.active), turnuvaAktif: g(() => TournamentMinigame.active),
                haritaDonguId: g(() => Game._loopId), savasDonguId: g(() => Battle.loopId),
                kareBoleni: g(() => Math.max(1, Math.floor(1000 / 60 / Game._minStep + 0.01))),
                olculenTazeleme: g(() => Game._minStep === Infinity ? T('ölçülmedi') : Math.round(1000 / Game._minStep) + T(' Hz')),
                haritaTuval: cv('map-canvas'), savasTuvali: cv('battle-canvas'),
                sonKareler: this.frames.slice()
            },
            tarayici: {
                ua: navigator.userAgent, dil: navigator.language, dpr: window.devicePixelRatio,
                pencere: innerWidth + 'x' + innerHeight, ekran: screen.width + 'x' + screen.height,
                bellek: g(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + T(' MB') : 'bilinmiyor')
            },
            hatalar: this.errors.slice(),
            yutulanTekrar: Object.keys(this._sig).map(k => `${k} x${this._sig[k]}`)
        };
    },
    text() { return JSON.stringify(this.report(), null, 1); },
    open() {
        let n = this.errors.length;
        Game.showModal(`<h3>${T`🐞 Debug Raporu`}</h3>
            <p style="font-size:0.85rem;color:var(--text-muted)">${T`Tamponda <b>${n}</b> hata var. Aşağıdaki metni kopyalayıp doğrudan issue'ya yapıştırabilirsin.`}</p>
            <textarea id="debug-text" readonly style="width:100%;height:260px;background:rgba(0,0,0,0.45);color:#cfd6dc;border:1px solid var(--panel-border);border-radius:6px;font:0.72rem/1.35 monospace;padding:0.5rem">${this.text().replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</textarea>
            <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:0.8rem">
                <button class="btn primary" onclick="Debug.copy()">${T`📋 Panoya Kopyala`}</button>
                <button class="btn" onclick="Debug.download()">${T`💾 Dosya Olarak İndir`}</button>
                <button class="btn" onclick="Game.closeModal()">${T`Kapat`}</button>
            </div>
            <div id="debug-msg" style="text-align:center;margin-top:0.5rem;font-size:0.85rem;color:var(--success)"></div>`, '720px');
    },
    copy() {
        let ta = document.getElementById('debug-text');
        let done = () => { let m = document.getElementById('debug-msg'); if(m) m.textContent = T('✅ Panoya kopyalandı.'); };
        // Pano izni yoksa (file:// veya eski tarayıcı) seçip execCommand'a düş
        if(navigator.clipboard) navigator.clipboard.writeText(ta.value).then(done, () => { ta.select(); document.execCommand('copy'); done(); });
        else { ta.select(); document.execCommand('copy'); done(); }
    },
    download() {
        let a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([this.text()], { type: 'application/json' }));
        a.download = `webband-debug-gun${((state || {}).time || {}).day || 0}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
};
Debug.init();

// --- DATA ---
const FACTIONS = {
    swadia:  { id: 'swadia',  name: 'Svadya Krallığı',  color: '#ff4d4d', ruler: 'Kral Harlaus', vizier: 'Vezir Klargus', lore: 'Ağır zırhlı şövalyeleri ve geniş düzlükleriyle meşhur, eski Kalradya İmparatorluğu\'nun asıl varisi olduğunu iddia eden güçlü bir krallık.' },
    rhodok:  { id: 'rhodok',  name: 'Rodok Krallığı',   color: '#33cc33', ruler: 'Kral Graveth', vizier: 'Vezir Matheas', lore: 'Dağlık bölgelerde yaşayan özgür ruhlu insanların kurduğu, tatar yaylı keskin nişancıları ve dev kalkanlı mızraklılarıyla geçilmez bir krallık.' },
    vaegir:  { id: 'vaegir',  name: 'Veagir Krallığı',  color: '#cccccc', ruler: 'Kral Yaroglek', vizier: 'Vezir Vuldrat', lore: 'Kuzeyin karlı ve soğuk ormanlarından gelen, baltalı piyadeleri ve ölümcül okçularıyla bilinen sert insanların diyarı.' },
    nord:    { id: 'nord',    name: 'Nord Krallığı',    color: '#3399ff', ruler: 'Kral Ragnar', vizier: 'Vezir Lethwin', lore: 'Deniz aşırı ülkelerden uzun gemileriyle gelip kıyıları ele geçiren, atları kullanmayan fakat piyade dövüşünde rakipsiz olan savaşçılar.' },
    khergit: { id: 'khergit', name: 'Kergit Hanlığı',   color: '#cc66ff', ruler: 'Sancar Han', vizier: 'Vezir Tonju', lore: 'Doğunun bozkırlarından at sırtında gelen, aşırı hızlı atlı okçuları ve göçebe savaş taktikleriyle düşmanlarını çıldırtan boyların birleşimi.' }
};

// --- KARAKTER YARATMA ---
// Warband'ın geçmiş soruları: cinsiyet + 4 soru. Her cevap nitelik/yetenek/kese
// üzerinde küçük ama kalıcı bir fark yapar; seçimler state.player.background'da durur.
// Etki formatı: attr{}, prof{}, money, renown, item (kuşanılır), relAll, relFaction{id,n}
const BACKGROUND = [
{ key:'gender', q:'Kimsin?', hint:'Kalradya ordu toplayan bir kadına alışkın değil.', opts:[
  { id:'male',   label:'👨 Erkek', desc:'Kılıç kuşanmış bir erkek kimsenin dikkatini çekmez.' },
  { id:'female', label:'👩 Kadın', desc:'Lordlar sana kuşkuyla bakar; evlilik yolun leydilerden değil bekâr lordlardan geçer.', relAll:-5 }
]},
{ key:'birth', q:'Nerede doğdun?', hint:'Doğduğun toprağın lordları seni kendilerinden sayar.', opts:[
  { id:'swadia',  label:'🌾 Svadya ovasında bir köyde',   desc:'Sabanın arkasında büyüdün, sırtın erken sertleşti.', attr:{str:1}, relFaction:{id:'swadia',  n:5} },
  { id:'rhodok',  label:'⛰️ Rodok dağlarında bir kasabada', desc:'Taşlık yamaçta yürümek adamı dayanıklı yapar.',     attr:{vit:1}, relFaction:{id:'rhodok',  n:5} },
  { id:'vaegir',  label:'❄️ Veagir şehrinde',             desc:'Uzun kışlar okumaya vakit bırakır.',                 attr:{int:1}, relFaction:{id:'vaegir',  n:5} },
  { id:'nord',    label:'🌊 Nord kıyısında',              desc:'Kürek çekerek büyüdün, ayakların yorulmaz.',          prof:{athletics:2}, relFaction:{id:'nord', n:5} },
  { id:'khergit', label:'🐎 Kergit bozkırında',           desc:'Yürümeyi öğrenmeden ata bindin.',                     attr:{agi:1}, prof:{riding:1}, relFaction:{id:'khergit', n:5} }
]},
{ key:'father', q:'Baban ne iş yapardı?', hint:'Baba mesleği hem kese hem el alışkanlığı bırakır.', opts:[
  { id:'noble',    label:'🏰 Küçük bir soyluydu',   desc:'Adınız sofralarda anılırdı; kesen de boş değildi.', attr:{cha:1}, money:200, renown:10 },
  { id:'merchant', label:'💰 Tüccardı',             desc:'Terazinin hilesini de dürüstlüğünü de gördün.',      prof:{trade:2}, money:250 },
  { id:'smith',    label:'🔨 Demirciydi',           desc:'Örsün başında kol kuvveti ve çelik bilgisi.',        attr:{str:1}, prof:{oneHanded:2} },
  { id:'soldier',  label:'🛡️ Askerdi',              desc:'Mızrak dizilişini yürümeden önce öğrendin.',         attr:{vit:1}, prof:{polearm:2} },
  { id:'herder',   label:'🐑 Çobandı',              desc:'Sürüyü ararken kıtanın yarısını çiğnedin.',          attr:{agi:1}, prof:{pathfinding:2} }
]},
{ key:'youth', q:'Gençliğinde ne yaptın?', hint:'Bu yıllar yeteneklerinin temelini attı.', opts:[
  { id:'page',    label:'👑 Bir kalede uşaklık',   desc:'Salonda kimin kimi neden dinlediğini öğrendin.', attr:{cha:1}, prof:{leadership:1, persuasion:1} },
  { id:'hunter',  label:'🏹 Ormanda avcılık',      desc:'Yayı da izi de sürmeyi bilirsin.',               prof:{bow:2, spotting:1} },
  { id:'street',  label:'🗝️ Sokakta kendi başına',  desc:'Cebi dolu olanı uzaktan tanırsın.',              prof:{looting:2}, money:100 },
  { id:'cloister',label:'📖 Manastırda okudun',    desc:'Harf de tanırsın, yara da dikersin.',            attr:{int:1}, prof:{surgery:2} },
  { id:'groom',   label:'🐴 Ahırda seyislik',      desc:'At seni tanır, sen atı.',                        attr:{agi:1}, prof:{riding:2} }
]},
{ key:'job', q:'Maceraya atılmadan önceki mesleğin?', hint:'İlk mesleğin sırtındaki teçhizatı da belirler.', opts:[
  { id:'merc',     label:'⚔️ Paralı asker',      desc:'Kılıcını kiraladın; adın birkaç kalede geçti.',      item:'sword',  prof:{oneHanded:2}, renown:5 },
  { id:'caravan',  label:'🛡️ Kervan muhafızı',   desc:'Yolları ve kalkan tutmayı öğrendin.',               item:'shield', prof:{trade:1, spotting:1}, money:150 },
  { id:'squire',   label:'🐎 Şövalye adayı',     desc:'Efendinin atı sana kaldı; kesen ona gitti.',        item:'horse',  attr:{cha:1}, money:-100 },
  { id:'smuggler', label:'🚬 Kaçakçı',           desc:'Kese doldu ama adın kötüye çıktı.',                 money:300, prof:{pathfinding:1}, relAll:-2 },
  { id:'outlaw',   label:'🪓 Haydut',            desc:'Baltan da huyun da senden önce tanınır.',           item:'axe', prof:{twoHanded:2, looting:1}, relAll:-4 }
]}
];

// Sancak: kingdom_crests.jpg 3x3 armaları + kendi rengin. Krallık kurunca
// krallığının rengi ve haritadaki grup renginin kaynağı budur.
const BANNERS = [
  { crest:0, color:'#c0392b', name:'Kızıl Aslan' },
  { crest:1, color:'#2e86c1', name:'Mavi Şahin' },
  { crest:2, color:'#27ae60', name:'Yeşil Meşe' },
  { crest:3, color:'#8e44ad', name:'Mor Kartal' },
  { crest:4, color:'#e67e22', name:'Turuncu Güneş' },
  { crest:5, color:'#ffcc00', name:'Altın Boğa' },
  { crest:6, color:'#95a5a6', name:'Gümüş Kurt' },
  { crest:7, color:'#16a085', name:'Deniz Yılanı' },
  { crest:8, color:'#d35400', name:'Bakır Çekiç' }
];

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
    // `const Game` window'a takılmaz (sözcüksel global bağ), bu yüzden window.Game
    // her zaman undefined'dı ve oyundaki BÜTÜN alert'ler sessizce yutuluyordu.
    if(typeof Game !== 'undefined' && Game.showModal) {
        Game.showModal(`<div style="text-align:center"><h3 style="margin-bottom:1rem;color:#ffaa00">${T`Bildirim`}</h3><p style="font-size:1.1rem;line-height:1.5">${String(msg).replace(/\n/g, '<br>')}</p><button class="btn primary" style="margin-top:1.5rem" onclick="Game.closeModal()">${T`Tamam`}</button></div>`);
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
    wheat:  { id:'wheat',  name:'Tahıl',         type:'food',  quality:'low', basePrice:4,  icon:'🌾', spoil:60 },
    bread:  { id:'bread',  name:'Ekmek',         type:'food',  quality:'low', basePrice:6,  icon:'🍞', spoil:20 },
    meat:   { id:'meat',   name:'Kurutulmuş Et', type:'food',  quality:'high',basePrice:20, icon:'🥩', spoil:30 },
    cheese: { id:'cheese', name:'Peynir',        type:'food',  quality:'high',basePrice:16,  icon:'🧀', spoil:40 },
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
        recruit: ['Svadya Köylüsü', 'infantry', 20, 50, 6, 0, '🪖', 'blunt'],
        branches: [
            [['Svadya Milisi', 'infantry', 45, 60, 12, 5, '🛡️', 'pierce', 40],
             ['Svadya Çavuşu', 'infantry', 65, 65, 18, 12, '🏰', 'cut', 100]],
            [['Svadya Avcısı', 'archer', 35, 55, 6, 2, '🏹', 'pierce', 50],
             ['Svadya Keskin Nişancısı', 'archer', 45, 60, 10, 5, '🎯', 'pierce', 120]],
            [['Svadya Süvarisi', 'cavalry', 50, 99, 12, 8, '🐴', 'cut', 70],
             ['Svadya Şövalyesi', 'cavalry', 75, 110, 22, 15, '⚔️🐴', 'cut', 150]]
        ]
    },
    rhodok: {   // süvarisi yok; dev kalkanlar ve tatar yayı
        recruit: ['Rodok Köylüsü', 'infantry', 20, 50, 6, 0, '🪖', 'blunt'],
        branches: [
            [['Rodok Mızraklısı', 'infantry', 48, 56, 11, 8, '🛡️', 'pierce', 40],
             ['Rodok Kalkanlısı', 'infantry', 70, 58, 17, 18, '🛡️', 'cut', 110]],
            [['Rodok Nişancısı', 'archer', 36, 54, 8, 3, '🏹', 'pierce', 55],
             ['Rodok Tatar Yaylısı', 'archer', 48, 56, 16, 6, '🎯', 'pierce', 130]]
        ]
    },
    vaegir: {   // baltalı piyade, ölümcül okçu, vasat süvari
        recruit: ['Veagir Köylüsü', 'infantry', 20, 50, 6, 0, '🪖', 'blunt'],
        branches: [
            [['Veagir Piyadesi', 'infantry', 44, 60, 13, 4, '🪓', 'cut', 40],
             ['Veagir Baltacısı', 'infantry', 62, 64, 20, 9, '🪓', 'cut', 105]],
            [['Veagir Okçusu', 'archer', 34, 56, 9, 2, '🏹', 'pierce', 55],
             ['Veagir Nişancısı', 'archer', 44, 60, 14, 4, '🎯', 'pierce', 125]],
            [['Veagir Atlısı', 'cavalry', 46, 95, 11, 6, '🐴', 'cut', 70],
             ['Veagir Süvarisi', 'cavalry', 60, 100, 16, 10, '🐴', 'cut', 140]]
        ]
    },
    nord: {     // at kullanmaz; piyade dövüşünde rakipsiz
        recruit: ['Nord Serfi', 'infantry', 20, 50, 6, 0, '🪖', 'blunt'],
        branches: [
            [['Nord Savaşçısı', 'infantry', 50, 62, 14, 6, '🛡️', 'cut', 45],
             ['Nord Baltacısı', 'infantry', 80, 66, 24, 13, '🪓', 'cut', 140]],
            [['Nord Avcısı', 'archer', 38, 58, 9, 3, '🏹', 'pierce', 50],
             ['Nord Nişancısı', 'archer', 50, 60, 12, 6, '🎯', 'pierce', 115]]
        ]
    },
    khergit: {  // hepsi atlı; hızlı ama ince zırhlı
        recruit: ['Kergit Çobanı', 'infantry', 20, 55, 6, 0, '🪖', 'blunt'],
        branches: [
            [['Kergit Atlısı', 'cavalry', 44, 105, 11, 4, '🐴', 'cut', 60],
             ['Kergit Süvarisi', 'cavalry', 58, 115, 18, 8, '⚔️🐴', 'cut', 135]],
            [['Kergit Atlı Okçusu', 'archer', 40, 108, 10, 3, '🏹', 'pierce', 65],
             ['Kergit Han Muhafızı', 'archer', 52, 118, 15, 6, '🎯', 'pierce', 145]]
        ]
    }
};
const TROOP_UPGRADES = {};
const TROOP_TYPES = {};
(function buildTroopTrees() {
    const stats = r => ({ hp: r[2], speed: r[3], attack: r[4], defense: r[5], type: r[1], icon: r[6], dmgType: r[7] });
    const up = r => ({ name: r[0], cost: r[8], type: r[1] });
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
    bandit:   { name: 'Çapulcular', color: '#d0483a', icon: 'foot', min: 5, max: 14, speedMult: 1, dmg: 'blunt',
                lore: '"Ya paranı, ya canını!"',
                battle: [['Çapulcu','infantry',24,52,6,0,6], ['Çapulcu Okçu','archer',20,50,6,0,2],
                         ['Atlı Çapulcu','cavalry',32,88,9,2,1]],
                leader: ['Çapulcu Reisi','infantry',52,60,13,4] },
    forest:   { name: 'Orman Haydutları', color: '#8bd15a', icon: 'archer', min: 6, max: 12, speedMult: 1.05,
                lore: '"Ağaçların arasından bakan gözleri ancak ok uçarken fark edersin."',
                battle: [['Haydut Okçusu','archer',24,54,8,1,6], ['Orman Haydudu','infantry',28,58,8,1,4]],
                leader: ['Haydut Başı','archer',48,58,14,3] },
    mountain: { name: 'Dağ Eşkıyaları', color: '#d4a03a', icon: 'foot', min: 8, max: 16, speedMult: 0.95, dmg: 'blunt',
                lore: '"Bu geçit bizim. Geçiş ücreti: her şeyin."',
                battle: [['Dağ Eşkıyası','infantry',36,56,11,4,6], ['Eşkıya Nişancısı','archer',30,54,10,2,2],
                         ['Atlı Eşkıya','cavalry',44,92,13,5,2]],
                leader: ['Eşkıya Reisi','infantry',75,62,18,7] },
    // Köy milisi: yağmada karşına çıkan köylüler. Haritada gezmez, yalnızca
    // Game.startRaid savaşında doğar (bandKey ada göre bulunur).
    militia:  { name: 'Köy Milisi', color: '#c9a227', icon: 'foot', min: 4, max: 16, speedMult: 1, dmg: 'pierce',
                lore: '"Tırpanı kap Yusuf, geliyorlar!"',
                battle: [['Köylü','infantry',22,50,5,0,7], ['Köy Avcısı','archer',20,52,6,0,3],
                         ['Köy Bekçisi','infantry',30,54,8,2,2]],
                leader: ['Köy Muhtarı','infantry',44,54,10,3] },
    // Ticaret partileri (#22): haritada gezerler, saldırmazlar; soyulunca yükleri düşer
    caravan:  { name: 'Kervan Muhafızları', color: '#e0b062', icon: 'cart', min: 6, max: 14, speedMult: 1, trade: true, dmg: 'pierce',
                lore: '"Yükümüze dokunma yolcu — bu mallar loncaya yazılı."',
                battle: [['Kervan Muhafızı','infantry',34,56,10,3,5], ['Kervan Okçusu','archer',26,54,9,1,3],
                         ['Atlı Muhafız','cavalry',40,90,12,4,2]],
                leader: ['Kervanbaşı','infantry',55,58,14,5] },
    villager: { name: 'Köylü Kafilesi', color: '#9dbf6a', icon: 'foot', min: 3, max: 7, speedMult: 1, trade: true, dmg: 'pierce',
                lore: '"Pazara gidiyoruz efendim... bizde alacak bir şey yok ki."',
                battle: [['Köylü','infantry',22,50,5,0,8], ['Köy Avcısı','archer',20,52,6,0,2]] },
    wolf:     { name: 'Kurt Sürüsü', color: '#9aa4b2', icon: 'wolf', min: 6, max: 14, speedMult: 1.25, beast: true,
                lore: '"Uluma çok yakından geliyor. Sürü sizi çoktan çevirmiş."',
                battle: [['Kurt','infantry',20,104,8,0,8], ['Yaşlı Kurt','infantry',30,96,10,1,2]],
                leader: ['Alfa Kurt','infantry',55,112,15,2] }
};

// --- STATE ---
const state = {
    npcParties: [],
    settings: {},            // ayarlar ekranı (#55): varsayılandan sapan anahtarlar; okuma Game.opt()
    meta: {},                // kayıt künyesi: { v, surum, createdAt, playtime }
    timeScale: 1,            // zaman akışı çarpanı (üst çubuktaki takvim rozetinden 0.5/1/2)
    activeTournaments: {},   // { cityId: true }
    mercPools: {},           // { locId: { day, list:[{name, level, count}] } }
    encounterCooldown: 0,
    player: {
        name: T('Maceracı'),
        gender: 'male',        // 'female' -> lordlarla ilişki −5 başlar, evlilik yolu lordlardan geçer
        banner: 5,             // BANNERS dizini: arma + krallık rengi
        background: {},        // karakter yaratmada verilen cevaplar { birth, father, youth, job }
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
        siege: null,               // kuşatma kampı: { locId, plan, daysLeft, weaken, foundingKingdom }
        currentRaid: null,         // yağmalanan köy: { locId }
        wait: null,                // kamp: { until } — zaman ×4 akar, karşılaşma keser (#53/1.1)
        honor: 0,                  // şeref −100..100; eksi tarafı eski "yağmacı damgası" (#53/1.5)
        ambition: null,            // seçili hedef: { id, day }
        ambitionsDone: [],         // tamamlanan hedeflerin id'leri
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
    vassals: [],          // krallığına katılan lordların id'leri (#40)
    relations: {},        // lordId -> -100..100
    affection: {},        // ladyId -> 0..100
    rivals: {},           // ladyId -> { lordId, affection }
    knownLocations: {},   // lordId -> { x, y, radius, day, name, live }
    questCooldown: {},    // lordId -> gün
    smallTalkDay: {}, giftDay: {}, visitDay: {}, poemsRead: {}, dedicatedTo: [],
    pendingQuest: null, questOffers: {}, dowryOffer: null, betrothed: null, pendingWedding: null,
    pendingDedication: false, duel: null,
    feast: null, scheduledFeasts: [], nextFeastDay: 8,
    wars: {},            // 'a|b' (sıralı fraksiyon çifti) -> savaşın başladığı gün
    warLog: [],          // son olaylar: { day, msg }
    lordRespawn: {},     // cephede dağılan lord partisi -> hangi gün geri döner
    grudges: {},         // lordId -> kan davasının başladığı gün (#53/1.3): 30 gün seni avlar
    warSeeded: false,    // dünya kurulurken ilk savaş atandı mı
    allies: {},          // 'a|b' -> ittifakın kurulduğu gün
    campaigns: {},       // fraksiyon -> { marshalId, marshalName, targetLocId, day, pledged, helped }
    campaignCooldown: {}, // fraksiyon -> son seferin bittiği gün
};

// --- INPUT ---
const Input = {
    keys: {},
    mouse: { x: 0, y: 0 },
    stick: null,          // sanal çubuğun son yönü (#65) — parmakla nişan buradan okunur

    // Parmakla oynarken fare imleci yok: nişan çubuğun yönünden türer. Savaş motoru
    // hâlâ yalnız Input.mouse'a bakar, yani iki ayrı nişan yolu tutulmaz.
    aimSync(u) {
        if(!this.stick) return;
        this.mouse.x = u.x + this.stick.x * 120;
        this.mouse.y = u.y + this.stick.y * 120;
    },

    init() {
        window.addEventListener('keydown', e => {
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            this.keys[e.key.toLowerCase()] = true;
            if(e.key === ' ') e.preventDefault(); // Boşluk ile kaymayı engelle
            // Modal açıkken klavye modalindir (#55 madde 6): Esc kapatır, Enter ana
            // düğmeye basar. Karşılaşma modali Esc ile kapanmaz — savaştan kaçış değildir.
            if(!document.getElementById('modal-overlay').classList.contains('hidden')) {
                if(e.key === 'Escape' && !state.player.currentEncounterNpcId) Game.closeModal();
                else if(e.key === 'Enter') {
                    let b = document.querySelector('#modal-body button.primary') || document.querySelector('#modal-body button');
                    if(b) { e.preventDefault(); b.click(); }
                }
                return;
            }
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
                // K: krallıkların savaş/barış hâli
                else if(e.key.toLowerCase() === 'k') Game.showDiplomacy();
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
            Input.stick = null;      // fare kıpırdadıysa nişanı o alır, sanal çubuk değil
            
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
                Game.camera.targetZoom = Math.max(Game.minZoom(), Math.min(Game.camera.targetZoom, 3.0));
            }
        });
    }
};

// --- GAME ---
const Game = {
    mapCanvas: null,
    ctx: null,
    camera: { x: 0, y: 0, zoom: 0.8, targetZoom: 0.8, offsetX: 0, offsetY: 0 },

    // Kıta 9000 birim; en uzak yakınlık tamamını ekrana sığdırır (kenarda %6 pay).
    minZoom() {
        if(!this.mapCanvas) return 0.12;
        return Math.max(0.07, Math.min(0.8, Math.min(this.mapCanvas.width, this.mapCanvas.height) / 9600));
    },

    // Uzaklaşınca yerleşim/grup ikonları ekranda okunur boyutta kalsın (etiketler zaten
    // 1/zoom ile ölçekleniyordu, ikonlar dünya biriminde olduğu için erimişti).
    iconScale() { return Math.max(1, 0.55 / this.camera.zoom); },

    // --- ÇİZİM ÖNBELLEKLERİ VE HAFİF MOD (#80) ---
    // Harita her karede sıfırdan çiziliyordu: ~150 dağ + 25 yerleşim emojisi yeniden
    // rasterize ediliyor, ~250 gradyan nesnesi üretilip çöpe atılıyor, kıyı gölgesi
    // shadowBlur ile piksel piksel bulanıklaştırılıyordu. Masaüstünde JS tarafı ucuz
    // görünür (0.5 ms) çünkü bedelin tamamı rasterleştirmede; telefonda aynı iş
    // ısınmayla birlikte kare bütçesini yer. Üçü de aynı ilkeyle çözülür:
    // **pahalı şeyi bir kez pişir, sonra resmi bas** (Battle.buildGround'un haritadaki eşi).

    // Hafif mod: dokunmatik cihazda kendiliğinden açılır, ayarlardan kapatılır.
    // 'auto' = cihaza sor. Kare başına birkaç kez sorulduğu için cevap önbelleklenir.
    lite() {
        if(this._lite === undefined) {
            let v = this.opt('lite');
            this._lite = v === 'auto' ? this.isTouch() : !!v;
        }
        return this._lite;
    },

    // Emoji glifi: iki-üssü bir kovaya bir kez pişirilir, sonra küçültülerek basılır.
    // (Kova hep istenen boyuttan büyük seçilir, yani her zaman küçültme — bulanmaz.)
    // x/y ve boyut `fillText(ch, x, y)` + `textBaseline:'alphabetic'` ile aynı anlamda.
    _sprites: {},
    emoji(ctx, ch, x, y, size) {
        let px = Math.min(256, Math.max(16, Math.pow(2, Math.ceil(Math.log2(Math.max(16, size))))));
        let key = ch + '|' + px, s = this._sprites[key];
        if(!s) {
            s = document.createElement('canvas');
            s.width = Math.ceil(px * 1.6); s.height = Math.ceil(px * 1.7);
            let c = s.getContext('2d');
            c.font = px + 'px Arial'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
            c.fillText(ch, s.width / 2, Math.round(px * 1.25));
            s._base = Math.round(px * 1.25) / px;      // taban çizgisinin glif boyuna oranı
            s._k = 1 / px;
            this._sprites[key] = s;
        }
        let k = size * s._k;
        ctx.drawImage(s, x - s.width * k / 2, y - s._base * size, s.width * k, s.height * k);
    },

    // Merkezi orijinde duran radyal gradyan; çağıran translate ile yerine taşır.
    // Gradyan onu üreten bağlama bağlıdır, o yüzden önbellek bağlamın üstünde durur.
    radial(ctx, r, inner, outer) {
        let cache = ctx._grads || (ctx._grads = {});
        let key = r + '|' + inner + '|' + outer, g = cache[key];
        if(!g) {
            g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            g.addColorStop(0, inner); g.addColorStop(1, outer);
            cache[key] = g;
        }
        return g;
    },

    // Etiket genişliği yazı boyutuyla doğru orantılı: 19 px'te bir kez ölçülür,
    // sonrası çarpma. (Kare başına ~75 measureText çağrısı vardı.)
    _tw: {},
    textW(ctx, text) {
        let w = this._tw[text];
        if(w === undefined) {
            ctx.font = 'bold 19px Inter, sans-serif';
            w = this._tw[text] = ctx.measureText(text).width;
        }
        return w;
    },

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
        this.initLang();
        Input.init();
        this.initTooltipClamp();
        let vt = document.getElementById('ver-tag');
        if(vt) vt.textContent = T`WebBand ${VERSION.no} · ${T(VERSION.name)} · ${VERSION.date}`;
        this.applySettings();
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        this.mapCanvas = document.getElementById('map-canvas');
        // Opak tuval: deniz her kareyi baştan sona dolduruyor, alfa kanalına gerek yok.
        // alpha:false ile tarayıcı harmanlama geçişini atlar (zayıf GPU'da belirgin).
        this.ctx = this.mapCanvas.getContext('2d', { alpha: false });
        // Fare ve parmak tek kapıdan geçer (#65): pointer olayı ikisini de taşır.
        // Hedef işareti sürüklenebilir (#35): basılı tut, taşı, bırak — rota anında yeniden kurulur
        this.mapCanvas.addEventListener('pointerdown', e => this.onMapDown(e));
        this.mapCanvas.addEventListener('pointermove', e => this.onMapMove(e));
        this.mapCanvas.addEventListener('pointerup', e => this.onMapUp(e));
        this.mapCanvas.addEventListener('pointercancel', e => this.onMapUp(e));
        this.initTouchUI();
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

        // Kıtayı ve Sıradağları oluştur
        if(!state.mapBorder) {
            state.mapBorder = [];
            for(let a=0; a < Math.PI*2; a += 0.02) {
                let maxR = 4000 + Math.sin(a * 6) * 300 + Math.cos(a * 11) * 200 + Math.sin(a * 3) * 400;
                maxR += (Math.random() - 0.5) * 50; // Jitter
                state.mapBorder.push({ x: 4500 + Math.cos(a)*maxR, y: 4500 + Math.sin(a)*maxR });
            }
        }

        this.layoutWorld();
        this.spawnSites();
        this.spawnNPCs();
    },

    // --- YERLEŞİM DAĞITIMI (#57) ---
    // Eskiden her yerleşim dilimin içinde tamamen rastgele bir noktaya düşüyordu:
    // iki şehir üst üste binebiliyor, bir bölge bomboş kalabiliyordu. Artık üç kural var
    // (asgari aralık / kale sınırda / köy merkeze bağlı) ve üretim doğrulanır.
    MIN_GAP: {
        'city|city': 700, 'city|castle': 480, 'city|village': 380,
        'castle|castle': 620, 'castle|village': 340, 'village|village': 420
    },
    VILLAGE_RANGE: [420, 900],       // köyün bağlı olduğu şehre/kaleye uzaklığı

    minGap(a, b) { return this.MIN_GAP[a + '|' + b] || this.MIN_GAP[b + '|' + a] || 400; },

    // Aday nokta yerleşilebilir mi: kıtanın içinde ve komşulardan yeterince uzak
    spotOk(p, type, placed) {
        if(Math.hypot(p.x - 4500, p.y - 4500) > this.getMapRadius(p.x, p.y) - 320) return false;
        return placed.every(o => this.dist(p, o) >= this.minGap(type, o.type));
    },

    // Dünyayı kur: yerleşimleri dağıt, yolları ör, sonucu doğrula. Kurallar
    // sağlanamazsa baştan dener — kopuk/çakışık bir dünyayla oynanmaz.
    layoutWorld() {
        let bad = [];
        for(let t = 0; t < 12; t++) {
            this.placeLocations();
            this.buildRoads();
            bad = this.validateLocations();
            if(!bad.length) return;
        }
        console.warn(T('Yerleşim dağıtımı 12 denemede kurallara oturmadı:'), bad);
    },

    placeLocations() {
        let ids = Object.keys(FACTIONS).filter(f => LOCATIONS.some(l => l.faction === f));
        let wedge = Math.PI * 2 / ids.length;
        let placed = [];
        ids.forEach((fid, i) => {
            let base = i * wedge;
            let mine = LOCATIONS.filter(l => l.faction === fid);
            // Şehir → kale → köy sırası: köy bağlanacağı merkezi hazır bulsun
            for(let type of ['city', 'castle', 'village']) {
                for(let loc of mine.filter(l => l.type === type)) {
                    if(type === 'village') { this.placeVillage(loc, mine, placed); continue; }
                    for(let k = 0; k < 400; k++) {
                        // Kale sınırda durur (dilimin kenar %20'si), şehir içeride
                        let f = type === 'castle'
                            ? (Math.random() < 0.5 ? 0.02 + Math.random() * 0.18 : 0.80 + Math.random() * 0.18)
                            : 0.22 + Math.random() * 0.56;
                        // Uzaklık kıyıya göre: dar yönde içeride, geniş yönde açılır —
                        // sabit bant kıtanın şişkin taraflarını boş bırakıyordu
                        let a = base + wedge * f;
                        let R = this.getMapRadius(4500 + Math.cos(a), 4500 + Math.sin(a));
                        let d = R * (0.28 + Math.random() * 0.54);
                        let p = { x: 4500 + Math.cos(a) * d, y: 4500 + Math.sin(a) * d };
                        if(k === 399 || this.spotOk(p, type, placed)) { loc.x = p.x; loc.y = p.y; break; }
                    }
                    placed.push(loc);
                }
            }
        });
    },

    // Köy bir şehre/kaleye bağlıdır (`loc.parentId`); en az köyü olan merkez seçilir
    placeVillage(loc, mine, placed) {
        let hubs = mine.filter(l => l.type !== 'village');
        if(!hubs.length) hubs = placed.filter(l => l.type !== 'village');
        let count = id => placed.filter(l => l.parentId === id).length;
        let hub = hubs.reduce((a, b) => count(b.id) < count(a.id) ? b : a);
        loc.parentId = hub.id;
        let [lo, hi] = this.VILLAGE_RANGE;
        for(let k = 0; k < 400; k++) {
            let a = Math.random() * Math.PI * 2, d = lo + Math.random() * (hi - lo);
            let p = { x: hub.x + Math.cos(a) * d, y: hub.y + Math.sin(a) * d };
            if(k === 399 || this.spotOk(p, 'village', placed)) { loc.x = p.x; loc.y = p.y; break; }
        }
        placed.push(loc);
    },

    // Üretim sonrası doğrulama: aralık, kıta içi, köy–merkez bağı, yol bağlantısı
    validateLocations() {
        let bad = [];
        LOCATIONS.forEach((a, i) => {
            if(Math.hypot(a.x - 4500, a.y - 4500) > this.getMapRadius(a.x, a.y) - 200)
                bad.push(a.name + T(' kıta sınırının dışında'));
            for(let j = i + 1; j < LOCATIONS.length; j++) {
                let b = LOCATIONS[j], need = this.minGap(a.type, b.type), d = this.dist(a, b);
                if(d < need) bad.push(T`${T(a.name)}–${T(b.name)} çok yakın (${Math.round(d)} < ${need})`);
            }
            if(a.type === 'village') {
                let h = LOCATIONS.find(l => l.id === a.parentId);
                if(!h) bad.push(a.name + T(' köyünün bağlı merkezi yok'));
                else if(this.dist(a, h) > this.VILLAGE_RANGE[1] + 1) bad.push(a.name + T(' merkezinden kopuk'));
            }
        });
        // Kopuk yerleşim kalmasın: her yerleşim en az bir yol parçasının ucunda olmalı
        let touched = new Set();
        (state.roads || []).forEach(r => LOCATIONS.forEach(l => {
            if(Math.hypot(l.x - r.x1, l.y - r.y1) < 40 || Math.hypot(l.x - r.x2, l.y - r.y2) < 40) touched.add(l.id);
        }));
        LOCATIONS.filter(l => !touched.has(l.id)).forEach(l => bad.push(l.name + T(' yol ağına bağlı değil')));
        return bad;
    },

    // Bir şehrin/kalenin köyleri. `parentId` yoksa (eski dünya) 900 birimlik eski kurala düşer.
    villagesOf(loc) {
        let kids = LOCATIONS.filter(l => l.type === 'village' && l.parentId === loc.id);
        return kids.length ? kids
            : LOCATIONS.filter(l => l.type === 'village' && !l.parentId && this.dist(l, loc) < 900);
    },

    // --- TERK EDİLMİŞ YAPILAR VE KEŞİF NOKTALARI (#58) ---
    // Harita yalnızca yerleşimler ve düşmanlardan ibaret olmasın: arazide üstüne
    // gidilebilen, sonucu önceden bilinmeyen noktalar. LOCATIONS'a girmezler
    // (`state.sites`), ama `type:'site'` taşıdıkları için hedefleme/varış makinesi
    // (setTarget → update → enterLocation) tek satırlık bir kapıyla onları da taşır.
    SITE_COUNT: 14,
    SITE_MIN_GAP: 520,          // yerleşimden ve birbirinden en az bu kadar uzak

    // renew: kaç günde bir yeniden dolar; 0 = tek kullanımlık (araştırılınca haritadan silinir)
    SITE_KINDS: {
        ruin:  { icon: '🏚️', name: T('Harabe'), renew: 0,
                 desc: T('Adını kimsenin hatırlamadığı bir kalenin devrilmiş duvarları.'),
                 pool: { coin: 3, gear: 2, ambush: 3, empty: 2 } },
        farm:  { icon: '🌾', name: T('Terk Edilmiş Çiftlik'), renew: 25,
                 desc: T('Kapısı açık kalmış bir ambar; tarlayı ot basmış.'),
                 pool: { food: 4, recruit: 2, empty: 2, ambush: 1 } },
        tower: { icon: '🗼', name: T('Gözetleme Kulesi'), renew: 12,
                 desc: T('Yıllar önce nöbet tutulan bir kule. Merdiveni hâlâ sağlam görünüyor.'),
                 pool: { scout: 5, coin: 1, empty: 2, trap: 1 } },
        cave:  { icon: '🕳️', name: T('Mağara'), renew: 30,
                 desc: T('Ağzından soğuk hava geliyor. İçeride bir şeyin yaşadığı belli.'),
                 pool: { coin: 2, gear: 2, ambush: 4, trap: 2 } },
        camp:  { icon: '⛺', name: T('Terk Edilmiş Kamp'), renew: 15,
                 desc: T('Ateş külü hâlâ ılık. Buradan aceleyle kalkmışlar.'),
                 pool: { coin: 2, food: 2, shelter: 2, ambush: 2, empty: 1 } }
    },

    // Sonuçlar günlük olay havuzuyla (DAY_EVENTS) aynı desende: `when` süzgeci +
    // `run` metni. Ödül mü risk mi olduğu araştırmadan önce belli değildir.
    SITE_OUTCOMES: {
        coin: { run(s) {
            let n = 60 + Math.floor(Math.random() * 160);
            state.player.money += n;
            return { html: `${T`Devrilmiş bir taşın altında toprağa gömülü küçük bir kese buldun.<br><b>+${n} dinar`}</b>.` };
        }},
        gear: { run(s) {
            let ids = ['sword','axe','mace','lance','bow','shield','mail'];
            let id = ids[Math.floor(Math.random() * ids.length)];
            Game.addItem(id, 1);
            return { html: `${T`Paslı bir sandığın dibinde işe yarar tek şey kalmış: <b>${ITEMS[id].icon} ${T(ITEMS[id].name)}</b>.<br>Envanterine girdi.`}` };
        }},
        food: { run(s) {
            let id = ['wheat','cheese','meat'][Math.floor(Math.random() * 3)], n = 3 + Math.floor(Math.random() * 6);
            Game.addItem(id, n);
            return { html: `${T`Ambarın bir köşesi farelerden kurtulmuş.`}<br><b>+${n} ${T(ITEMS[id].name)}</b>.` };
        }},
        shelter: { run(s) {
            Game.addMorale(4);
            return { html: `${T`Adamlar bir gece olsun çadır kurmadan, hazır barakada uyudu.<br>Moral`} <b>+4</b>.` };
        }},
        recruit: {
            when: () => state.player.party.length + 1 < Game.getPartyCapacity(),
            run(s) {
                let near = LOCATIONS.slice().sort((a, b) => Game.dist(a, s) - Game.dist(b, s))[0];
                let name = Game.recruitName(near);
                state.player.party.push({ id: 'troop_' + Math.random().toString(36).substr(2, 9),
                    name, level: 1, xp: 0, xpNext: 3, type: 'infantry' });
                return { html: `${T`Samanlıkta saklanan bir <b>${T(name)}</b> çıktı karşına. Gidecek yeri yokmuş, gruba katıldı.`}` };
            }
        },
        scout: { run(s) {
            // Kuleden bakınca uzaktaki bir grup görünür — "nerede?" mekaniğinin işaretini
            // kullanır, yani 3 gün sonra Nobles.dailyTick kendiliğinden siler.
            let far = state.npcParties.filter(n => Game.dist(n, s) > 700)
                                      .sort((a, b) => Game.dist(a, s) - Game.dist(b, s))[0];
            if(!far) return { html: T('Ufukta kıpırdayan bir şey yok. Boşuna tırmandın.') };
            state.knownLocations[s.id] = { x: far.x, y: far.y, radius: 200,
                day: state.time.day, name: far.name, live: false };
            Game.addProficiencyXp('spotting', 40);
            return { html: `${T`Kuleden bakınca toz bulutu gördün: <b>${T(far.name)}</b>.<br>📍 Haritaya bir işaret düştü (3 gün geçerli).`}` };
        }},
        trap: { run(s) {
            let dmg = 8 + Math.floor(Math.random() * 18);
            let st = state.player.stats;
            st.hp = Math.max(1, st.hp - dmg);
            return { html: `${T`Çürük döşeme ayağının altında çöktü. Aşağıdaki taşlara kadar yuvarlandın.<br><b>−${dmg} can`}</b>.` };
        }},
        empty: { run(s) {
            let lines = [T('İçeride senden önce gelenlerin izinden başka bir şey yok.'),
                         T('Ne varsa yıllar önce taşınmış. Boşuna zahmet.'),
                         T('Tek bulduğun, kimin olduğu belli olmayan bir çift eski çizme.')];
            return { html: lines[Math.floor(Math.random() * lines.length)] };
        }},
        ambush: { run(s) {
            let kind = s.kind === 'cave' ? 'wolf' : s.kind === 'ruin' ? 'mountain' : 'bandit';
            return {
                html: T`İçeriden çıkan sesi duyduğunda geç kalmıştın — burası boş değilmiş.`,
                then() {
                    let npc = Game.spawnBand(kind);
                    npc.x = npc.targetX = s.x; npc.y = npc.targetY = s.y;
                    Game.triggerEncounter(npc, 'ambush');
                }
            };
        }}
    },

    pickWeighted(pool) {
        let tot = 0;
        for(let k in pool) tot += pool[k];
        let r = Math.random() * tot;
        for(let k in pool) { r -= pool[k]; if(r <= 0) return k; }
    },

    spawnSites() {
        state.sites = [];
        let kinds = Object.keys(this.SITE_KINDS);
        for(let i = 0; i < this.SITE_COUNT; i++) {
            for(let k = 0; k < 200; k++) {
                let a = Math.random() * Math.PI * 2;
                let R = this.getMapRadius(4500 + Math.cos(a), 4500 + Math.sin(a));
                let d = R * (0.15 + Math.random() * 0.75);
                let p = { x: 4500 + Math.cos(a) * d, y: 4500 + Math.sin(a) * d };
                let clear = LOCATIONS.every(l => this.dist(l, p) >= this.SITE_MIN_GAP)
                         && state.sites.every(o => this.dist(o, p) >= this.SITE_MIN_GAP);
                if(!clear && k < 199) continue;
                state.sites.push({ id: 'site_' + i, kind: kinds[i % kinds.length], type: 'site',
                    name: this.SITE_KINDS[kinds[i % kinds.length]].name, x: p.x, y: p.y, usedDay: null });
                break;
            }
        }
    },
    ensureSites() { if(!(state.sites || []).length) this.spawnSites(); },

    // Araştırılmış nokta yenilenene kadar boştur (renew 0 ise zaten silinmiştir)
    siteReady(s) {
        let k = this.SITE_KINDS[s.kind];
        return !s.usedDay || (k.renew > 0 && state.time.day - s.usedDay >= k.renew);
    },

    enterSite(s) {
        let k = this.SITE_KINDS[s.kind];
        let ready = this.siteReady(s);
        this.showModal(`<h3>${k.icon} ${T(k.name)}</h3>
            <p style="font-style:italic;color:var(--text-muted)">${T(k.desc)}</p>
            <p>${ready ? T('İçeride ne olduğunu ancak girince öğrenirsin.')
                       : T`Burayı ${this.agoText(s.usedDay)} altını üstüne getirdin; daha toparlanmamış.`}</p>
            <div style="display:flex;gap:0.5rem;margin-top:1rem">
                ${ready ? `<button class="btn primary" onclick="Game.investigateSite('${s.id}')">${T`🔍 Araştır`}</button>` : ''}
                <button class="btn" onclick="Game.closeModal()">${T`🚪 Yoluna Devam Et`}</button>
            </div>`);
    },

    investigateSite(id) {
        let s = (state.sites || []).find(x => x.id === id);
        if(!s || !this.siteReady(s)) return this.closeModal();
        let k = this.SITE_KINDS[s.kind];
        let pool = {};
        for(let key in k.pool) {
            let o = this.SITE_OUTCOMES[key];
            if(!o.when || o.when(s)) pool[key] = k.pool[key];
        }
        let r = this.SITE_OUTCOMES[this.pickWeighted(pool)].run(s);
        s.usedDay = state.time.day;
        if(!k.renew) state.sites = state.sites.filter(x => x !== s);
        this.addProficiencyXp('spotting', 20);
        this.updateTopBar();
        this._siteThen = r.then || null;
        this.showModal(`<h3>${k.icon} ${T(k.name)}</h3><p>${r.html}</p>
            <button class="btn primary" style="margin-top:1rem" onclick="Game.siteDone()">${T`Tamam`}</button>`);
    },

    siteDone() {
        let f = this._siteThen;
        this._siteThen = null;
        this.closeModal();
        if(f) f();
    },

    agoText(day) {
        let n = state.time.day - day;
        return n <= 0 ? '<b>bugün</b>' : `<b>${T`${n} gün önce`}</b>`;
    },

    siteTipHtml(s) {
        let k = this.SITE_KINDS[s.kind];
        return `<i>${T(k.desc)}</i><br>${this.siteReady(s)
            ? T('🔍 Henüz araştırılmadı')
            : T`✔️ ${this.agoText(s.usedDay)} araştırıldı${k.renew ? T` (${k.renew} günde bir yenilenir)` : ''}`}`;
    },

    // --- YOL AĞI (#56) ---
    // Yol türleri: taş döşeli ana yol (şehirler), toprak yol (kaleler), bakımsız
    // keçi yolu (köyler). Hepsi aynı `state.roads` dizisinde kısa parçalar hâlinde
    // durur — getTerrainInfo ve renderMap tek veri şeklini okumaya devam eder.
    ROAD_KINDS: {
        stone: { half: 26, mult: 1.18, name: T('Taş Yol'),   icon: '🛣️' },
        dirt:  { half: 22, mult: 1.10, name: T('Toprak Yol'), icon: '🛤️' },
        track: { half: 15, mult: 1.04, name: T('Keçi Yolu'),  icon: '🥾' }
    },
    roadKind(loc) { return loc.type === 'city' ? 'stone' : loc.type === 'castle' ? 'dirt' : 'track'; },

    // İki nokta arası doğal güzergâh: yumuşak dönemeç + ormanı dolanma + kıyıda kalma.
    // Düz çizgi yerine kısa parçalardan oluşan bir polyline döner.
    roadPath(a, b) {
        let dx = b.x - a.x, dy = b.y - a.y;
        let len = Math.hypot(dx, dy) || 1;
        let n = Math.max(6, Math.min(18, Math.round(len / 220)));
        let nx = -dy / len, ny = dx / len;              // dik yön
        let amp = len * (0.10 + Math.random() * 0.14) * (Math.random() < 0.5 ? -1 : 1);
        let phase = Math.random() * Math.PI * 2;
        let pts = [];
        for(let i = 0; i <= n; i++) {
            let t = i / n;
            // Uçlarda sıfırlanan (sin) taban dönemeç + ikinci harmonikten sapma
            let off = (i === 0 || i === n) ? 0
                    : amp * Math.sin(t * Math.PI) * (0.7 + 0.3 * Math.sin(t * Math.PI * 2 + phase));
            let p = { x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off };
            if(i > 0 && i < n) {
                // Ormanın içinden değil kenarından geçilir
                for(let f of FORESTS) {
                    let fd = Math.hypot(p.x - f.x, p.y - f.y), edge = f.radius + 45;
                    if(fd < edge) {
                        let ang = fd < 1 ? Math.random() * Math.PI * 2 : Math.atan2(p.y - f.y, p.x - f.x);
                        p.x = f.x + Math.cos(ang) * edge; p.y = f.y + Math.sin(ang) * edge;
                    }
                }
                this.clampToMap(p);
            }
            pts.push(p);
        }
        return pts;
    },

    // İki doğru parçasının kesişimi (nehir geçişi = köprü noktası)
    segCross(p, q, r, s) {
        let d = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
        if(Math.abs(d) < 1e-6) return null;
        let t = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / d;
        let u = ((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / d;
        if(t < 0 || t > 1 || u < 0 || u > 1) return null;
        return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
    },

    // Tüm yerleşkeleri birbirine bağlayan yol ağı. Yeni yerleşim en yakın **yol
    // noktasına** da bağlanabilir — böylece ağda gerçek kavşaklar oluşur (eskiden
    // her bağlantı bir yerleşimden çıkıyordu, yıldız şeklinde bir MST'ydi).
    // Yerleşim koordinatları değiştiğinde (eski kayıt yüklemesi) yeniden çağrılır.
    buildRoads() {
        state.roads = [];
        state.bridges = [];
        let nodes = [{ x: LOCATIONS[0].x, y: LOCATIONS[0].y }];   // bağlanılabilir noktalar
        let unconnected = LOCATIONS.slice(1);

        while(unconnected.length > 0) {
            let bestDist = Infinity, bestNode = null, bestIdx = -1;
            for(let c of nodes) {
                for(let i = 0; i < unconnected.length; i++) {
                    let d = Math.hypot(c.x - unconnected[i].x, c.y - unconnected[i].y);
                    if(d < bestDist) { bestDist = d; bestNode = c; bestIdx = i; }
                }
            }
            let u = unconnected[bestIdx];
            this.layRoad(bestNode, u, this.roadKind(u), nodes);
            nodes.push({ x: u.x, y: u.y });
            unconnected.splice(bestIdx, 1);
        }
    },

    // Bir güzergâhı parçalara böler, nehir geçişlerini köprü olarak işaretler ve
    // ara noktaları kavşak adayı olarak `nodes`'a ekler.
    layRoad(a, b, kind, nodes) {
        let pts = this.roadPath(a, b);
        for(let i = 0; i < pts.length - 1; i++) {
            let p = pts[i], q = pts[i+1];
            state.roads.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y, kind });
            for(let riv of RIVERS) {
                let c = this.segCross(p, q, { x: riv.x1, y: riv.y1 }, { x: riv.x2, y: riv.y2 });
                if(c) state.bridges.push({ x: c.x, y: c.y, a: Math.atan2(q.y - p.y, q.x - p.x), kind });
            }
            if(nodes && i > 0) nodes.push({ x: p.x, y: p.y });
        }
    },

    // Nehri köprüden geçmek yavaşlatmaz (getTerrainInfo)
    onBridge(x, y) {
        return (state.bridges || []).some(br => Math.hypot(x - br.x, y - br.y) < 70);
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

    // --- TİCARET PARTİLERİ (#22) ---
    // Harita yalnız haydut ve lordlardan ibaret kalmasın: kervanlar şehirler arasında,
    // köylüler kendi köyleriyle en yakın şehir arasında mekik dokur. Saldırmazlar;
    // soymak ganimet verir ama barıştaki bir krallığı soymak eşkıyalıktır.
    spawnTrader(kind) {
        let pool = LOCATIONS.filter(l => l.type === (kind === 'caravan' ? 'city' : 'village'));
        let home = pool[Math.floor(Math.random() * pool.length)];
        if(!home) return null;
        let k = BAND_KINDS[kind];
        let size = k.min + Math.floor(Math.random() * (k.max - k.min + 1));
        let name = kind === 'caravan' ? `${this.factionName(home.faction)} Kervanı` : `${home.name} Köylüleri`;
        let npc = this.createNPC(name, kind, size, k.color, home.faction, 1);
        npc.band = kind;
        npc.speed = kind === 'caravan' ? 58 : 52;
        npc.trade = { kind, homeId: home.id, homeName: home.name, fromId: home.id, toId: home.id };
        if(kind === 'villager') {
            let market = LOCATIONS.filter(l => l.type === 'city')
                                  .sort((a, b) => this.dist(a, home) - this.dist(b, home))[0];
            npc.trade.marketId = market ? market.id : home.id;
        }
        // Yük muhafız sayısıyla ölçülür (#55 madde 9): eskiden 6 kişilik kervanla
        // 14 kişilik aynı keseyi taşıyordu, yani en zayıfını seçmek risksiz kârdı.
        // w = büyüklük / türün ortası; ortalama yük değişmez, dağılımı riske bağlanır.
        let w = size / ((k.min + k.max) / 2);
        if(kind === 'caravan') {
            let goods = Object.values(ITEMS).filter(i => i.type === 'trade');
            npc.cargo = [];
            for(let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
                let g = goods[Math.floor(Math.random() * goods.length)];
                // Yük değerce dengelensin: kadife az, bira çok taşınır
                let qty = Math.max(1, Math.round((3 + Math.random() * 4) * w * 100 / g.basePrice));
                let ex = npc.cargo.find(c => c.id === g.id);
                if(ex) ex.qty += qty; else npc.cargo.push({ id: g.id, qty });
            }
            npc.purse = Math.round((120 + Math.random() * 260) * w);
        } else {
            // Erzak ucuzladığı için (#47) kafile artık araba dolusu taşır — yoksa soyması anlamsızdı
            npc.cargo = [{ id: 'wheat', qty: Math.max(4, Math.round((15 + Math.random() * 30) * w)) },
                         { id: 'cheese', qty: Math.max(2, Math.round((5 + Math.random() * 15) * w)) }];
            npc.purse = Math.round((20 + Math.random() * 50) * w);
        }
        npc.x = npc.targetX = home.x; npc.y = npc.targetY = home.y;
        state.npcParties.push(npc);
        this.traderArrive(npc);   // ilk hedefini seçsin
        return npc;
    },
    // Yollarda hep aynı yoğunluk olsun — yenilen kafilenin yerine ertesi gün yenisi çıkar
    ensureTraders() {
        let n = k => state.npcParties.filter(p => p.trade && p.trade.kind === k).length;
        for(let i = n('caravan'); i < 6; i++) this.spawnTrader('caravan');
        for(let i = n('villager'); i < 8; i++) this.spawnTrader('villager');
    },
    // Hedefe vardı: yerleşime biraz refah bırakır, sonraki durağına yönelir
    traderArrive(npc) {
        let t = npc.trade;
        let dest = LOCATIONS.find(l => l.id === t.toId);
        if(dest) dest.prosperity = Math.min(90, (dest.prosperity || 50) + (t.kind === 'caravan' ? 0.5 : 0.15));
        let next = this.traderNext(npc);
        if(!next) return;
        t.fromId = t.toId; t.toId = next.id;
        npc.targetX = next.x + (Math.random() - 0.5) * 60;
        npc.targetY = next.y + (Math.random() - 0.5) * 60;
    },
    traderNext(npc) {
        let t = npc.trade;
        if(t.kind === 'villager') return LOCATIONS.find(l => l.id === (t.toId === t.homeId ? t.marketId : t.homeId));
        // Kervan savaş bölgesine girmez: kendi krallığıyla barışık bir şehre yönelir
        let cities = LOCATIONS.filter(l => l.type === 'city' && l.id !== t.toId && !this.atWar(npc.faction, l.faction));
        return cities.length ? cities[Math.floor(Math.random() * cities.length)] : LOCATIONS.find(l => l.id === t.fromId);
    },
    // Kafileye rastlamak savaş değil, bir seçimdir
    meetTrader(npc) {
        let bk = BAND_KINDS[npc.band] || {};
        let war = this.atWar(this.playerFaction(), npc.faction) ;
        let cargo = (npc.cargo || []).filter(c => ITEMS[c.id])
                    .map(c => `${ITEMS[c.id].icon} ${T(ITEMS[c.id].name)} ×${c.qty}`).join(' · ') || T('boş');
        let dest = LOCATIONS.find(l => l.id === npc.trade.toId);
        this.showModal(`<h3>${npc.trade.kind === 'caravan' ? '🐪' : '🧺'} ${this.npcName(npc)}</h3>
        <p><i>${bk.lore ? T(bk.lore) : ''}</i></p>
        <p>${this.factionName(npc.faction)} · <b>${npc.size}</b> ${T`kişi${dest ? T` · ${T(dest.name)} yolunda` : ''}`}</p>
        <p style="color:var(--text-muted)">${T`Yük: ${cargo}${npc.purse ? T` · 💰 kese` : ''}`}</p>
        ${war ? `<p style="color:#2ecc71">${T`Krallığın ${this.factionName(npc.faction)} ile savaşta — bu yük meşru ganimet.`}</p>`
              : `<p style="color:var(--danger)">${T`Soyarsan eşkıyalık sayılır: ${this.factionName(npc.faction)} lordları <b>−4</b>, namın <b>−5</b>.`}</p>`}
        <div style="display:flex;gap:1rem;margin-top:1rem;">
        <button class="btn" style="border-color:#cc0000;color:#cc0000" onclick="Game.robTrader('${npc.id}')">${T`🗡️ Soy`}</button>
        <button class="btn primary" onclick="Game.closeModal(); state.encounterCooldown = 6; state.player.currentEncounterNpcId = null;">${T`🚪 Yoluna Bırak`}</button>
        </div>`);
    },
    robTrader(npcId) {
        let npc = state.npcParties.find(n => n.id === npcId);
        this.closeModal();
        if(!npc) return;
        // Savaştaki krallığın kervanını vurmak seferdir; barıştakini vurmak yol kesmektir
        if(!this.atWar(this.playerFaction(), npc.faction) && npc.faction !== this.playerFaction()) {
            state.player.renown = Math.max(0, (state.player.renown || 0) - 5);
            if(typeof Nobles !== 'undefined')
                LORDS.filter(l => l.faction === npc.faction).forEach(l => Nobles.addRel(l.id, -4));
            // Yol kesmek şerefi yer ve bölgenin lordunu peşine takar (#53)
            this.addHonor(npc.trade && npc.trade.kind === 'villager' ? 'robPeasant' : 'robPeace');
            this.addGrudgeNearest(npc.faction);
        }
        Battle.start(npc.name, npc.size, null, npc.faction);
    },

    // --- YOL KESME (#24) ---
    // Kervanları yalnız oyuncu soymaz. Haydut çeteleri de yolda kesiştikleri kafileyi
    // vurur; yük ve kese çetenin üstünde kalır, yani o çeteyi yakalayan yükü de alır
    // (zafer dalı beaten.cargo/purse'ü zaten envantere yazıyor).
    banditTick() {
        // Av davranışı updateNPCs'te: çete kafilenin üstüne yürür, baskını burası çözer
        let raiders = state.npcParties.filter(n => n.type === 'bandit' && n.size > 0
                                                   && !(BAND_KINDS[n.band] || {}).beast);
        if(!raiders.length) return;
        state.npcParties.filter(t => t.trade && t.size > 0).forEach(t => {
            let b = raiders.find(r => r.size > 0 && this.dist(r, t) < 400);
            if(!b) return;
            let pw = p => p.size * (0.7 + Math.random() * 0.6);
            // Kervan muhafızı parasını hak eder, köylü kafilesi kaçamaz
            if(pw(t) * (t.trade.kind === 'caravan' ? 1.15 : 0.5) > pw(b)) {
                b.size = Math.round(b.size * (0.5 + Math.random() * 0.3));
                t.size = Math.max(2, Math.round(t.size * (0.75 + Math.random() * 0.2)));
                if(b.size < 4) { b.size = 0; this.news(T`🛡️ ${this.npcName(t)}, ${T(b.name)} baskınını püskürttü.`); }
                return;
            }
            b.cargo = b.cargo || [];
            (t.cargo || []).forEach(c => {
                let ex = b.cargo.find(x => x.id === c.id);
                if(ex) ex.qty += c.qty; else b.cargo.push({ ...c });
            });
            b.purse = (b.purse || 0) + (t.purse || 0);
            b.size = Math.max(3, b.size - Math.floor(Math.random() * 3));
            t.size = 0;
            // Ulaşamayan yük varılacak yerin refahını düşürür
            let dest = LOCATIONS.find(l => l.id === t.trade.toId);
            if(dest) dest.prosperity = Math.max(10, (dest.prosperity || 50) - (t.trade.kind === 'caravan' ? 1.5 : 0.5));
            this.news(T`🗡️ ${T(b.name)}, ${this.npcName(t)} kafilesini bastı — yük çetenin elinde.`);
        });
        state.npcParties = state.npcParties.filter(n => n.size > 0 || n.lordId);
    },

    spawnNPCs() {
        this.ensureTraders();
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
    },

    // Parti adının tek gösterim kapısı. Çete/soylu adı veri tablosundan gelir
    // (sözlükte anahtarı var); kervan ve köylü kafilesinin adı ise bileşiktir,
    // o yüzden anahtar değil şablon olarak çevrilir.
    npcName(npc) {
        if(!npc) return '';
        if(npc.trade) return npc.trade.kind === 'caravan'
            ? T`${this.factionName(npc.faction)} Kervanı`
            : T`${T(npc.trade.homeName || '')} Köylüleri`;
        return T(npc.name);
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

    // --- KARAKTER YARATMA ---
    // Sihirbaz modal üstünde döner: BACKGROUND'daki her soru bir adım, sonra
    // sancak, sonra özet. Seçimler applyCreation()'da tek yerden uygulanır.
    creation: { step: 0, sel: {} },

    startGame() {
        const n = document.getElementById('char-name').value.trim();
        if(n) state.player.name = n;
        this.creation = { step: 0, sel: {} };
        this.renderCreation();
    },

    // Bir seçeneğin etkisini insan diline çevirir (hem sihirbazda hem özette).
    bonusText(o) {
        let out = [];
        for(let k in (o.attr || {}))  out.push(`${this.ATTRS[k].icon} ${T(this.ATTRS[k].name)} +${o.attr[k]}`);
        for(let k in (o.prof || {}))  out.push(`${this.profName(k)} +${o.prof[k]}`);
        if(o.money)   out.push(T`${o.money > 0 ? '+' : ''}${o.money} dinar`);
        if(o.renown)  out.push(T`${o.renown > 0 ? '+' : ''}${o.renown} nam`);
        if(o.item)    out.push(T`${ITEMS[o.item].icon} ${T(ITEMS[o.item].name)} (kuşanılmış)`);
        if(o.relAll)  out.push(T`bütün lordlarla ${o.relAll} ilişki`);
        if(o.relFaction) out.push(T`${T(FACTIONS[o.relFaction.id].name)} lordlarıyla +${o.relFaction.n} ilişki`);
        return out.join(' · ');
    },

    renderCreation() {
        let step = this.creation.step;
        if(step > BACKGROUND.length) return this.renderCreationSummary();
        if(step === BACKGROUND.length) return this.renderBannerStep();

        let q = BACKGROUND[step], sel = this.creation.sel[q.key];
        let html = `<h3>${T(q.q)}</h3>
            <p style="color:var(--text-muted);font-size:0.85rem">${T`Adım ${step+1}/${BACKGROUND.length+1} — ${T(q.hint)}`}</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">`;
        q.opts.forEach(o => {
            html += `<button class="btn${sel === o.id ? ' primary' : ''}" style="text-align:left;line-height:1.4"
                onclick="Game.pickCreation('${q.key}','${o.id}')">
                <b>${T(o.label)}</b>
                <div style="font-size:0.8rem;color:var(--text-muted);font-style:italic">${T(o.desc)}</div>
                <div style="font-size:0.8rem;color:var(--primary)">${this.bonusText(o) || T('ek bir getirisi yok')}</div>
            </button>`;
        });
        html += `</div>`;
        if(step > 0) html += `<button class="btn" style="margin-top:1rem" onclick="Game.creationBack()">${T`← Geri`}</button>`;
        this.showModal(html, '660px');
    },

    pickCreation(key, id) {
        this.creation.sel[key] = id;
        this.creation.step++;
        this.renderCreation();
    },

    creationBack() {
        this.creation.step = Math.max(0, this.creation.step - 1);
        this.renderCreation();
    },

    // Sancak seçimi: krallık kurunca bu arma ve renk senin olur.
    bannerColor() { return (BANNERS[state.player.banner] || BANNERS[0]).color; },

    bannerCss(i, size = 72) {
        let b = BANNERS[i] || BANNERS[0];
        return `<div style="width:${size}px;height:${size}px;flex:0 0 auto;border:3px ridge ${b.color};border-radius:6px;
            background-image:url('kingdom_crests.jpg');background-size:300% 300%;
            background-position:${(b.crest % 3) * 50}% ${Math.floor(b.crest / 3) * 50}%;
            box-shadow:inset 0 0 18px #000;"></div>`;
    },

    renderBannerStep() {
        let html = `<h3>${T`Sancağını seç`}</h3>
            <p style="color:var(--text-muted);font-size:0.85rem">${T`Adım ${BACKGROUND.length+1}/${BACKGROUND.length+1} — ${T(`Haritada grubunun rengi budur; kendi krallığını kurarsan krallığının da arması olur.`)}`}</p>
            <div style="display:flex;flex-wrap:wrap;gap:0.8rem;margin-top:1rem;justify-content:center">`;
        BANNERS.forEach((b, i) => {
            let on = this.creation.sel.banner === i;
            html += `<div onclick="Game.pickBanner(${i})" style="cursor:pointer;width:110px;text-align:center;padding:0.5rem;
                border-radius:8px;border:2px solid ${on ? b.color : 'var(--panel-border)'};background:rgba(0,0,0,0.3)">
                <div style="display:flex;justify-content:center">${this.bannerCss(i, 72)}</div>
                <div style="font-size:0.8rem;margin-top:0.4rem;color:${b.color}">${T(b.name)}</div>
            </div>`;
        });
        html += `</div><button class="btn" style="margin-top:1rem" onclick="Game.creationBack()">${T`← Geri`}</button>`;
        this.showModal(html, '660px');
    },

    pickBanner(i) {
        this.creation.sel.banner = i;
        this.creation.step = BACKGROUND.length + 1;
        this.renderCreation();
    },

    renderCreationSummary() {
        let sel = this.creation.sel;
        let rows = BACKGROUND.map(q => {
            let o = q.opts.find(x => x.id === sel[q.key]);
            return `<div style="margin-bottom:0.4rem"><b>${T(q.q)}</b> ${T(o.label)}
                <div style="font-size:0.8rem;color:var(--primary)">${this.bonusText(o) || '—'}</div></div>`;
        }).join('');
        let b = BANNERS[sel.banner || 0];
        let html = `<h3>${state.player.name}</h3>
            <div style="display:flex;gap:1.2rem;align-items:flex-start;margin-top:0.6rem">
                ${this.bannerCss(sel.banner || 0, 96)}
                <div style="flex:1;font-size:0.9rem;line-height:1.5">
                    <div style="color:${b.color};font-weight:bold">${T`${T(b.name)} sancağı`}</div>
                    ${rows}
                </div>
            </div>
            <div style="display:flex;gap:0.6rem;margin-top:1.2rem">
                <button class="btn primary" style="flex:1" onclick="Game.finishCreation()">${T`⚔️ Maceraya Başla`}</button>
                <button class="btn" onclick="Game.creationBack()">${T`← Geri`}</button>
            </div>`;
        this.showModal(html, '660px');
    },

    // Seçilen geçmişi karaktere işler. Tek uygulama noktası — özet ekranı da
    // buradaki bonusText ile aynı kaynaktan okur.
    applyCreation() {
        let p = state.player, sel = this.creation.sel;
        p.gender = sel.gender || 'male';
        p.banner = sel.banner || 0;
        p.background = { ...sel };

        BACKGROUND.forEach(q => {
            let o = q.opts.find(x => x.id === sel[q.key]);
            if(!o) return;
            for(let k in (o.attr || {})) { p.stats[k] += o.attr[k]; p.stats.eff[k] += o.attr[k]; }
            for(let k in (o.prof || {})) p.proficiencies[k].level += o.prof[k];
            p.money = Math.max(0, p.money + (o.money || 0));
            p.renown = Math.max(0, p.renown + (o.renown || 0));
            if(o.item) {
                let it = ITEMS[o.item];
                p.equipment[it.type] = { ...it, qty: 1 };
            }
            if(o.relAll) LORDS.forEach(l => Nobles.addRel(l.id, o.relAll));
            if(o.relFaction) LORDS.filter(l => l.faction === o.relFaction.id)
                                  .forEach(l => Nobles.addRel(l.id, o.relFaction.n));
        });
        this.updateStatsFromEquip();
        p.stats.hp = p.stats.maxHp;
    },

    finishCreation() {
        this.applyCreation();
        this.closeModal();
        this.enterWorld();
    },

    backgroundLine() {
        let bg = state.player.background || {};
        return BACKGROUND.filter(q => q.key !== 'gender')
            .map(q => { let o = q.opts.find(x => x.id === bg[q.key]); return o && T(o.label); })
            .filter(Boolean).join(' · ') || T('Bilinmeyen bir geçmiş');
    },

    enterWorld() {
        // Rakip talipler cinsiyete göre kurulur (kadın oyuncuda hedef lordlardır)
        Nobles.initRivals();
        this.initDiplomacy();   // Kalradya'da her zaman açık bir cephe vardır
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('main-ui').classList.add('active');
        this.resizeCanvases();
        
        // Başlangıçta kamerayı anında oyuncuya odakla
        this.camera.x = state.player.x;
        this.camera.y = state.player.y;
        this.camera.offsetX = 0;
        this.camera.offsetY = 0;

        this.updateTopBar();
        this.applySettings();
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
    },

    // 144/180 Hz ekranda rAF kare başına 5-7 ms bütçe verir; oyun 60 fps'te de
    // aynı görünür ama GPU'ya 2-3 kat iş çıkar ve kaçan kareler takılma olarak
    // hissedilir. Fazla kareler atlanır.
    //
    // Sabit ms eşiği olmaz: 90 Hz'te her ikinci kareyi atlamak 45 fps eder.
    // Onun yerine tazeleme hızı ölçülüp 60'ın altına düşürmeyen en büyük tam
    // bölen seçilir -> 60:60, 75:75, 90:90, 120:60, 144:72, 165:82, 180:60, 240:60.
    _prevT: 0, _minStep: Infinity, _frameNo: 0, _lastSkip: false,
    skipFrame(t) {
        // Karar KARE başına verilir, çağrı başına değil (#42). İki döngü aynı karede
        // sorduğunda ikisi de aynı cevabı almalı: eskiden her çağrı _frameNo'yu
        // artırdığı için sayaç kare başına 2 artıyor, n≥2 olan her ekranda (120 Hz
        // ve üstü) döngülerden birinin parmak izi hep tek sayıya düşüyordu — o döngü
        // BİR KEZ BİLE çalışmıyordu. Ölçüldü: n=2'de 2 saniyede harita döngüsü 60,
        // savaş döngüsü 0 kez işledi; savaş donuyor, tuval hiç çizilmediği için
        // ekran simsiyah kalıyordu.
        if(t === this._prevT) return this._lastSkip;
        let d = t - this._prevT;
        this._prevT = t;
        // d > 1: tarayıcı jank sonrası iki kareyi arka arkaya verirse bölen patlar.
        // Gerçek hiçbir ekran 1000 Hz'in üstünde değil, alt sınır güvenli.
        Debug.frame(d);                                     // kare aralıkları debug raporuna girer (#52)
        if(d > 1 && d < this._minStep) this._minStep = d;   // min: tek tük takılmayı eler
        // Kapı ayarlardan kapatılabilir (#55 madde 7): kapıya güvenmeyen oyuncunun
        // elinde bir kaçış yolu olsun. Ölçüm (Debug.frame) kapalıyken de sürer.
        if(!this.opt('frameGate')) return this._lastSkip = false;
        // Hafif modda hedef 30 fps: telefonda kare bütçesini yarıya indirmek,
        // çizimi kısmaktan daha çok işe yarar (ve ısınmayı da yavaşlatır).
        let fps = this.lite() ? 30 : 60;
        let n = Math.max(1, Math.floor(1000 / fps / this._minStep + 0.01));
        return this._lastSkip = ((++this._frameNo % n) !== 0);
    },

    // battle-canvas'ı Battle ve TournamentMinigame paylaşıyor. İlk getContext bağlayıcıdır:
    // biri { alpha:false } bayrağını unutursa ikinci çağrı null döner ve ekran yine
    // simsiyah kalır — kök neden bambaşka yerde aranır. Tek kapı sözleşmeyi taşır (#54).
    battleCtx() {
        let c = document.getElementById('battle-canvas');
        let ctx = c.getContext('2d', { alpha: false });
        if(!ctx) Debug.log('tuval', T('battle-canvas 2d bağlamı alınamadı — ekran siyah kalır'));
        return ctx;
    },

    startGameLoop() {
        // Çift döngü koruması: yükleme/yeniden başlatma her seferinde bir rAF
        // döngüsü daha eklerse zaman ve hareket kat kat hızlanır.
        if(this._loopId) cancelAnimationFrame(this._loopId);
        let lastTime = performance.now();
        const loop = (t) => {
            // Savaş/turnuva kendi döngüsünü işletir; harita döngüsü yerini bırakır.
            // showScreen() savaş dışı bir ekrana dönüldüğünde geri kurar.
            if(Battle.active || TournamentMinigame.active) { this._loopId = null; return; }
            if(this.skipFrame(t)) { this._loopId = requestAnimationFrame(loop); return; }
            let dt = (t - lastTime) / 1000;
            if(dt > 0.1) dt = 0.1;
            lastTime = t;
            // İstisna rAF zincirini koparmasın: hata bir kez raporlanır, döngü yaşar (#55)
            Debug.guard('harita döngüsü', () => { this.update(dt); this.renderMap(); });
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
        // Nitelikler efektif (kesirli) olduğu için kapasite de kesirli çıkıyordu
        // ("15/15.785700000000002"). Kesir kaynağında kırpılır ki karşılaştırma,
        // künye dökümü ve rozet aynı tam sayıyı görsün (#43).
        return 12 + Math.floor((cha - 10) * 3) + (leadership - 1) * 4 + Math.floor((state.player.renown || 0) / 40);
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
            alert(`${T`💰 Birikmiş <b>${Math.ceil(p.wageDebt)} dinar</b> maaş borcu ödendi. Askerler homurdanmayı bıraktı.`}`);
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
                // Köprüden geçen yavaşlamaz — nehir yolun altından akar
                if(this.onBridge(x, y)) { name = 'Köprü'; icon = '🌉'; }
                else { mult = 0.5; name = 'Nehir Geçidi'; icon = '🌊'; }
                break;
            }
        }
        if(state.roads) {
            for(let r of state.roads) {
                // Yol ~150 kısa parça: önce ucuz kutu elemesi, sonra izdüşüm
                let kk = this.ROAD_KINDS[r.kind] || this.ROAD_KINDS.dirt, h = kk.half;
                if(x < (r.x1 < r.x2 ? r.x1 : r.x2) - h || x > (r.x1 > r.x2 ? r.x1 : r.x2) + h) continue;
                if(y < (r.y1 < r.y2 ? r.y1 : r.y2) - h || y > (r.y1 > r.y2 ? r.y1 : r.y2) + h) continue;
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
                if(dx * dx + dy * dy <= h * h) {
                    mult *= kk.mult;  // taş yol ×1.18, toprak ×1.10, keçi yolu ×1.04
                    if(name === 'Düzlük') { name = kk.name; icon = kk.icon; }  // Köprü/Orman adı korunur
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

    // --- HEDEFLER (#53 madde 1.4) ---
    // Battle Brothers'ın "ambition"ı: aynı anda TEK aktif hedef, tamamlanınca ödül
    // ve yeni hedefler açılır. Tamamı veri; koşullar state'i okur, olay dinlemez —
    // günlük tik ve Görevler sekmesi aynı `check`'i çağırır.
    AMBITIONS: [
        { id: 'band',      title: 'Küçük bir bölük', desc: 'Grubunu 10 kişiye çıkar.',
          check: p => p.party.length >= 10, renown: 5, opens: ['champion', 'friend'] },
        { id: 'champion',  title: 'Turnuva şampiyonu', desc: 'Bir turnuvayı kazan.',
          check: p => (p.tourneyWins || 0) > 0, renown: 10, money: 500, opens: ['fief'] },
        { id: 'friend',    title: 'Bir lordun dostu', desc: 'Bir soyluyla ilişkini 30\'a çıkar.',
          check: () => Object.keys(state.relations || {}).some(k => state.relations[k] >= 30),
          renown: 5, opens: ['sworn'] },
        { id: 'sworn',     title: 'Yeminli', desc: 'Bir krallığa bağlılık yemini et.',
          check: p => !!p.vassalOf, renown: 15, opens: ['feud', 'fief'] },
        { id: 'feud',      title: 'Kan bedeli', desc: 'Açtığın bir kan davasını kapat (esiri onurla salıver ya da 30 günü doldur).',
          check: p => !!p.hadGrudge && Game.grudgeList().length === 0,
          renown: 10, honor: 'release', opens: [] },
        { id: 'fief',      title: 'Toprak sahibi', desc: 'Bir tımarın olsun.',
          check: () => LOCATIONS.some(l => l.owner === 'player'), renown: 20, opens: [] }
    ],
    ambition() { return this.AMBITIONS.find(a => a.id === (state.player.ambition || {}).id); },
    // Açık hedefler: hiç hedef bitirmemişken zincirin başı, sonra tamamlananların açtıkları
    openAmbitions() {
        let done = state.player.ambitionsDone || [];
        let opened = done.reduce((a, id) => {
            let d = this.AMBITIONS.find(x => x.id === id);
            return d ? a.concat(d.opens) : a;
        }, ['band']);
        return this.AMBITIONS.filter(a => done.indexOf(a.id) === -1 && opened.indexOf(a.id) !== -1);
    },
    pickAmbition(id) {
        if(!id) state.player.ambition = null;
        else if(!this.AMBITIONS.some(a => a.id === id)) return;
        else state.player.ambition = { id, day: state.time.day };
        if(typeof Quests !== 'undefined') Quests.render();
    },
    // Günlük tik: seçili hedefin koşulu sağlandıysa ödülü ver, zinciri aç
    ambitionTick() {
        if(this.grudgeList().length) state.player.hadGrudge = true;   // "kan bedeli" kapanabilsin (kayda girer)
        let a = this.ambition();
        if(!a || !a.check(state.player)) return;
        state.player.ambitionsDone = (state.player.ambitionsDone || []).concat(a.id);
        state.player.ambition = null;
        state.player.renown += a.renown;
        if(a.money) state.player.money += a.money;
        if(a.honor) this.addHonor(a.honor);
        this.updateTopBar();
        alert(T`🎯 Hedefe ulaştın: ${T(a.title)}\n+${a.renown} nam${a.money ? T`, +${a.money} dinar` : ''}.`
            + (this.openAmbitions().length ? T('\n\nGörevler sekmesinde yeni hedefler açıldı.') : ''));
    },
    ambitionHtml() {
        let a = this.ambition(), open = this.openAmbitions();
        let done = (state.player.ambitionsDone || []).length;
        return `<div style="background:rgba(0,0,0,0.3);border:1px solid var(--panel-border);border-left:4px solid #e0b062;
                border-radius:8px;padding:1rem;margin-bottom:1rem">
            <b style="font-size:1.1rem">${T`🎯 Hedefin`}</b>
            <span style="float:right;color:var(--text-muted);font-size:0.85rem">${T`${done} hedef tamamlandı`}</span>
            ${a ? `<div style="margin-top:0.5rem"><b>${T(a.title)}</b> — ${T(a.desc)}</div>
                   <button class="btn" style="margin-top:0.6rem;font-size:0.8rem;padding:0.3rem 0.8rem"
                           onclick="Game.pickAmbition('');Quests.render()">${T`Vazgeç`}</button>`
                : open.length ? `<div style="color:var(--text-muted);margin:0.4rem 0">${T`Aynı anda tek hedef seçilir.`}</div>`
                   + open.map(o => `<button class="btn" style="display:block;width:100%;text-align:left;margin-top:0.4rem"
                        onclick="Game.pickAmbition('${o.id}')"><b>${T(o.title)}</b> — <span style="color:var(--text-muted)">${T(o.desc)}</span>
                        <span style="color:#e0b062">${T`+${o.renown} nam`}</span></button>`).join('')
                : `<div style="color:var(--text-muted);margin-top:0.4rem">${T`Bütün hedefleri kapattın.`}</div>`}
        </div>`;
    },

    // Servet ölçekli baskı (#53 madde 1.3): tehdit yalnız takvime değil, senin gücüne de bakar.
    // Rimworld'ün "baskın puanı = koloni serveti" kuralının ucuz hâli — ordunun seviye
    // toplamının karekökü. Tek başına gezen oyuncuyu ezmez, 20 elitli orduyu rahat bırakmaz.
    threatLevel() {
        let sum = (state.player.party || []).reduce((a, t) => a + (t.level || 1), 0)
                + (state.player.stats.level || 1);
        return Math.round(Math.sqrt(sum) / 2);
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
        if(h < 5)  return { key: 'night',   name: T('Gece'),       icon: '🌙' };
        if(h < 8)  return { key: 'dawn',    name: T('Şafak'),      icon: '🌅' };
        if(h < 11) return { key: 'morning', name: T('Sabah'),      icon: '🌄' };
        if(h < 15) return { key: 'day',     name: T('Öğle'),       icon: '🌞' };
        if(h < 18) return { key: 'noon',    name: T('İkindi'),     icon: '🌇' };
        if(h < 20) return { key: 'dusk',    name: T('Gün Batımı'), icon: '🌆' };
        return { key: 'night', name: T('Gece'), icon: '🌙' };
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
        if(mode) mode.innerText = mounted ? T('atlı') : T('yaya');

        let row = (label, val, good) =>
            `<div style="display:flex;justify-content:space-between;gap:1.2rem">
                <span>${label}</span>
                <span style="color:${good ? 'var(--success)' : 'var(--danger)'}">${val}</span>
             </div>`;

        this.setHtml('ui-speed-breakdown', `
            <b style="font-family:Cinzel,serif">${T`Yol Alma Hızı`}</b>
            <hr style="border:0;border-top:1px solid rgba(212,175,55,.4);margin:5px 0">
            ${row(T`Temel (${mounted ? T('atlı') : T('yaya')})`, spdData.base, true)}
            ${row(T('Çeviklik'), '+' + spdData.agiBonus.toFixed(1), true)}
            ${row(T('Grup büyüklüğü'), this.pct(spdData.partyMult*100, true), spdData.partyMult >= 0)}
            ${row(T('Atlı oranı'), this.pct(spdData.mountBonus*100, true), true)}
            ${row(T`Arazi (${T(spdData.terrain.name)})`, this.pct((spdData.terrainMult-1)*100, true), spdData.terrainMult >= 1)}
            ${spdData.nightMult < 1 ? row(T('Gece yürüyüşü'), this.pct(-15, true), false) : ''}
            ${spdData.pathMult > 1 ? row(T('Yol Bulma'), this.pct((spdData.pathMult-1)*100, true), true) : ''}
            <hr style="border:0;border-top:1px solid rgba(212,175,55,.4);margin:5px 0">
            ${row('<b>' + T('Toplam') + '</b>', '<b>' + spdData.value.toFixed(1) + '</b>', true)}
        `);
    },

    getHumorousDialog(type, npc) {
        let p = state.player;
        let day = state.time.day;
        let lastDefeatDaysAgo = p.lastDefeatDay ? (day - p.lastDefeatDay) : 999;
        
        if(type === 'elder') {
            // Köylü kimin karşısında durduğunu bilir: yağmacı / düşman / misafir (#50)
            let loc = npc, pick = a => a[Math.floor(Math.random() * a.length)];
            if(this.raidedRecently(loc)) return pick([
                T`"Yine mi sen?! Ambarımızı boşalttın, damları yaktın... Defol! (Arkadan bir taş vızıldayıp geçer.)"`,
                T`"Allah belanı versin. Kızım o gece ağlamaktan sesini kaybetti. Bir daha ağzını açma bana."`,
                T`"Köpek. Hasadımızı yiyip 'köy yaşlısıyla konuşayım' diyor. Ne yüzle geliyorsun?"`,
                T`"Konuşacak bir şeyimiz yok. Sen gittikten sonra üç ev boş kaldı — say bakalım kaç tane."`
            ]);
            if(loc && this.atWar(this.playerFaction(), loc.faction)) return pick([
                T`"...Bizim lordumuzla savaştasın. Sana ne ekmek var ne asker. Yolun açık olsun — çabuk olsun."`,
                T`"Kılıcını görüyorum yabancı. Kadınlar çoktan ambara saklandı. Ne istiyorsan al da git."`,
                T`"Bu köy ${this.factionName(loc.faction)}'ın. Senin gibi birine kuyudan su bile vermeyiz."`
            ]);
            if(this.infamyTier() >= 2) return T`"Adını duyduk. Köy yakanmışsın. ...Hoşgeldin de deme bana, sadece çabuk git."`;
            if(p.party.length < 5 && p.stats.level < 5) return T`"Şu cılız delikanlıya bakın, Deli Hüsnü'ye söyleyin belki gönüllü olur, bununla giderse biz de kurtuluruz."`;
            if(p.money > 5000) return T`"Lordum, şu yaşlıya köydeki fakfakirler için biraz dinar atsanız da ortalık şenlense..."`;
            if(lastDefeatDaysAgo < 3) return T`"Duyduğuma göre geçenlerde biri buralarda çapulculardan fena dayak yemiş... Umarım o sen değilsindir yabancı."`;
            return T`"Köyümüze hoşgeldin yabancı. Hasat bu aralar fena değil, Deli Hüsnü yine tavukları kovalıyor."`;
        } else if(type === 'lord' || type === 'king' || type === 'vizier') {
            if(p.party.length < 10) return T`"Hah! Bu çapulcu sürüsüyle mi karşıma çıkıyorsun? Seni ezip geçeceğim!"`;
            if(lastDefeatDaysAgo < 3) return T`"Daha dünün dayak yemiş eziği gelmiş kafa tutuyor... Askerler, şunların işini bitirin!"`;
            return T`"Kılıcımın tadına bakma vakti geldi. Teslim ol ya da öl!"`;
        } else if(type === 'bandit') {
            let band = npc && npc.band ? BAND_KINDS[npc.band] : null;
            if(band && band.beast) return T(band.lore);
            if(p.party.length > 50) return T`"Aman abi, biz kendi halimizde garip çapulcularız... (Ama yine de saldırırlar!)"`;
            if(band && band.lore && npc.band !== 'bandit') return T(band.lore);
            return T`"Ya paranı, ya canını! Gerçi üstündekiler beş para etmez ama..."`;
        }
        return T`"Sana nasıl yardım edebilirim?"`;
    },

    update(dt) {
        if (Battle.active || TournamentMinigame.active) return;
        state.meta.playtime = (state.meta.playtime || 0) + dt;   // kayıt künyesinde oynama süresi
        
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
        let targetCamX = state.player.x + this.camera.offsetX;
        let targetCamY = state.player.y + this.camera.offsetY;
        // Hareket azaltma açıkken kamera ve zoom yumuşatması yok, anında oturur (#55 madde 6)
        let snap = this.reduceMotion() ? 1 : 0;
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * (snap || 8 * dt);
        this.camera.x += (targetCamX - this.camera.x) * (snap || 5 * dt);
        this.camera.y += (targetCamY - this.camera.y) * (snap || 5 * dt);

        // WASD/oklar kamerayı SERBEST kaydırır — kenardan fare pan'ının klavye karşılığı (#44).
        // Eskiden tam tersini yapıyor, offset'i sıfırlayıp kamerayı oyuncuya kilitliyordu;
        // haritayı elle gezmenin tek yolu fareyi ekran kenarına dayamaktı.
        // Oyuncuya dönmek zaten Boşluk ve 🎯 Beni Bul ile mümkün.
        if(document.getElementById('map-view').classList.contains('active')) {
            let k = Input.keys;
            if(k['a']||k['arrowleft'])  this.camera.offsetX -= panSpeed;
            if(k['d']||k['arrowright']) this.camera.offsetX += panSpeed;
            if(k['w']||k['arrowup'])    this.camera.offsetY -= panSpeed;
            if(k['s']||k['arrowdown'])  this.camera.offsetY += panSpeed;
        }
        // Kıtayı büsbütün kaybetmeyelim: harita 9000 birim, offset onun kadarıyla sınırlı
        this.camera.offsetX = Math.max(-9000, Math.min(9000, this.camera.offsetX));
        this.camera.offsetY = Math.max(-9000, Math.min(9000, this.camera.offsetY));

        if(state.player.prisoner) {
            state.player.status = 'prisoner';
        }

        let isMapActive = document.getElementById('map-view').classList.contains('active');
        let isModalOpen = !document.getElementById('modal-overlay').classList.contains('hidden');
        let timeFlows = false;
        
        if (isMapActive && !isModalOpen) {
            // Kuşatma kampında da zaman akar: hazırlık günleri geçsin, dünya işlesin (#25)
            if (state.player.status === 'moving' || state.player.status === 'prisoner'
                || state.player.status === 'besieging' || state.player.status === 'raiding'
                || state.player.status === 'waiting') {
                timeFlows = true;
            }
        }

        if (timeFlows) {
            // Kampta zaman ×WAIT_SCALE akar (#53/1.1)
            this.advanceTime(dt * this.timeScale() * (state.player.wait ? this.WAIT_SCALE : 1));
            this.waitTick();
            this.updateNPCs(dt);
            if(state.encounterCooldown > 0) state.encounterCooldown -= dt;
        }

        // Yağma süren bir eylemdir: ilerleme, müdahale eden lord, bitiş (#49)
        if(state.player.status === 'raiding') { this.raidTick(timeFlows ? dt : 0); return; }

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
                if(el) el.innerText = this.pct(state.player.prisoner.escapeChance);
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

        if(timeFlows) this.checkAmbush(dt);

        // NPC -> player collision
        if(timeFlows && state.encounterCooldown <= 0) {
            for(let npc of state.npcParties) {
                // Dost soylulara çarpmak da bir karşılaşmadır — savaş değil, sohbet
                if(!npc.lordId && !npc.trade && !this.isHostile(npc)) continue;
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

    // ---- KAMP: BEKLE (#53 madde 1.1) ----
    // Tek primitif: oyuncu durur, zaman ×4 akar, dünya işlemeye devam eder ve
    // herhangi bir karşılaşma (triggerEncounter) beklemeyi keser. Dinlenme, gönüllü
    // tazelenmesi, turnuva/şölen beklemek, kervan beklemek hep bunun müşterisi.
    WAIT_SCALE: 4,
    // Beklemenin bir bedeli var: maaş, erzak, bozulma zaten saatle işliyor
    WAIT_CHOICES: [[1, '1 saat'], [8, '8 saat'], [24, '1 gün'], [72, '3 gün']],   // ham; gösterimde çevrilir
    askWait() {
        if(state.player.prisoner || state.player.raid) return;
        let terr = this.getTerrainInfo(state.player.x, state.player.y);
        let risk = terr.name === 'Orman'
            ? T('<div style="color:var(--danger)">Ormanda kamp: pusuya düşebilirsin.</div>') : '';
        this.showModal(`<h2>${T`⏳ Kamp Kur</h2>
            <p>Burada durup zamanı geçir. Zaman <b>${this.WAIT_SCALE} kat</b> hızlı akar; can yenilenir,
               maaş ve erzak işler, karşılaşma olursa kamp bozulur.`}</p>
            <div style="color:var(--text-muted)">${T`Arazi: ${terr.icon} ${T(terr.name)}`}</div>${risk}
            <div class="action-list" style="margin-top:0.8rem">`
            + this.WAIT_CHOICES.map(([h, lbl]) =>
                `<button class="btn" onclick="Game.startWait(${h})">${T(lbl)}</button>`).join('')
            + `<button class="btn" onclick="Game.startWait(${this.hoursUntilDawn()})">${T`Sabahı bekle`}</button>
               <button class="btn" onclick="Game.closeModal()">${T`Vazgeç`}</button></div>`, 420);
    },
    hoursUntilDawn() { let h = state.time.hour; return h < 6 ? Math.ceil(6 - h) : Math.ceil(30 - h); },
    startWait(hours) {
        this.closeModal();
        if(state.player.prisoner || state.player.raid) return;
        state.player.targetLocation = null;
        state.player.status = 'waiting';
        state.player.wait = { until: state.time.day * 24 + state.time.hour + hours };
        this.showScreen('map');
        this.renderWaitUI();
    },
    // Beklemeyi bitiren tek kapı — süre dolması da, karşılaşma da buradan geçer
    stopWait(msg) {
        if(!state.player.wait) return;
        state.player.wait = null;
        if(state.player.status === 'waiting') state.player.status = 'idle';
        this.renderWaitUI();
        if(msg) alert(msg);
    },
    waitTick() {
        let w = state.player.wait;
        if(!w) return;
        if(state.time.day * 24 + state.time.hour >= w.until) return this.stopWait();
        this.renderWaitUI();
    },
    renderWaitUI() {
        let ui = document.getElementById('wait-ui');
        if(!ui) return;
        let w = state.player.wait;
        let onMap = document.getElementById('map-view').classList.contains('active');
        if(!w || !onMap) { ui.classList.add('hidden'); return; }
        ui.classList.remove('hidden');
        let left = Math.max(0, w.until - (state.time.day * 24 + state.time.hour));
        let p = state.player;
        this.setHtml('wait-info',
            `<div>${T`Kalan:`} <b>${left < 1 ? Math.round(left * 60) + ' dakika' : left.toFixed(1) + ' saat'}</b></div>
             <div style="color:var(--text-muted);font-size:0.85rem">
                ${T`❤️ ${Math.round(p.stats.hp)}/${Math.round(p.stats.maxHp)} · 🎺 ${Math.round(this.morale())} · zaman ×${this.WAIT_SCALE}`}</div>`);
    },

    // Hayvan sürüsüne teslim olunmaz — hızın yeterse sıyrılırsın
    // Kaçış şansı hız farkına bağlıdır: atlı bir grup çapulcuyu ekebilir,
    // ağır ordu Kergit atlılarından kaçamaz (#30). Harita hızı zaten atlı oranı,
    // arazi ve geceyi hesaplıyor — doğrudan onu kullanıyoruz.
    fleeChance(npc) {
        // Fark değil oran: hız farkını doğrusal alınca (0.45 + fark/90) kalabalık ordu bile
        // Kergit atlılarından %89 ile kaçıyordu. Oranda denk hız %24, 1.5 kat hız %84 eder.
        let his = (npc && npc.speed) || 60;
        return Math.max(0.1, Math.min(0.9, (this.getPlayerSpeed().value / his - 0.8) * 1.2));
    },
    fleeEncounter(npcId) {
        let npc = state.npcParties.find(n => n.id === npcId);
        this.closeModal();
        let chance = this.fleeChance(npc);
        if(Math.random() < chance) {
            state.encounterCooldown = 6;
            state.player.status = 'idle'; state.player.targetLocation = null;
            alert(T`Geride bıraktın — atlarını sürüp uzaklaştın. (Kaçış şansı %${Math.round(chance*100)})`);
        } else {
            alert(T`Kaçamadın, yolunu kestiler! (Kaçış şansı %${Math.round(chance*100)})`);
            Battle.start(npc ? npc.name : 'Kurt Sürüsü', npc ? npc.size : 6, null, (npc && npc.faction) || '');
        }
    },
    // "Askerlerini gönder": savaşı motorun kendisi kursun ama arena açılmasın (#30)
    autoBattle(npcId) {
        let npc = state.npcParties.find(n => n.id === npcId);
        if(!npc) return this.closeModal();
        this.closeModal();
        Battle.start(npc.name, npc.size, null, npc.faction || '', null, true);
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
            if(this.hasGrudge(npc.lordId)) return true;     // kan davası: sohbet değil savaş (#53)
            if(Nobles.rel(npc.lordId) <= -50) return true;
            // Artık "başka bayrak" değil, krallığının o krallıkla savaşta olması saldırtır
            return this.atWar(this.playerFaction(), npc.faction);
        }
        if(npc.type === 'king' || npc.type === 'vizier' || npc.type === 'lord') {
            if(state.player.stats.level < npc.level - 5 && ps < npc.size / 2) return false; // Güçsüzlere agresif değil
        }
        if(npc.type === 'lord' || npc.type === 'king' || npc.type === 'vizier')
            return this.atWar(this.playerFaction(), npc.faction);
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
            // Kervan/kafile savaştaki krallığın ordusundan kaçar (yoksa yoluna devam)
            let notices = dp < sense && (hostile || npc.type === 'bandit'
                          || (npc.trade && this.atWar(this.playerFaction(), npc.faction)));
            // Soylu kaçmaz: düşman lord kendinden biraz kalabalık orduya da yürür, ancak
            // belirgin şekilde güçlüysen (×1.5) geri çekilir (#48).
            let might = npc.size * (npc.lordId ? 1.5 : 1);
            if(notices && (might > ps ? hostile : true)) {
                if(might > ps) {
                    npc.targetX = state.player.x; npc.targetY = state.player.y;
                } else {
                    npc.targetX = npc.x - dxP * 2; npc.targetY = npc.y - dyP * 2;
                }
            } else {
                let dtx = npc.targetX - npc.x, dty = npc.targetY - npc.y;
                if(Math.sqrt(dtx*dtx + dty*dty) < 15) {
                    if(npc.trade) return this.traderArrive(npc);   // kafile durağına vardı
                    let a = Math.random() * Math.PI * 2;
                    // Soylular kendi yerleşimlerinin etrafında döner; başkalarını
                    // salonlarında bulabilmek için bu şart.
                    let lord = npc.lordId ? Nobles.lord(npc.lordId) : null;
                    let home = lord ? LOCATIONS.find(x => x.id === lord.homeLocId) : null;
                    if(state.feast && lord && lord.faction === state.feast.faction) {
                        home = LOCATIONS.find(x => x.id === state.feast.locId) || home;
                    }
                    // Kan davalı lord evine değil senin üstüne yürür (#53/1.3)
                    if(lord && !this.hasGrudge(lord.id)) delete npc.hunting;   // dava bitince peşini bırakır
                    if(lord && this.hasGrudge(lord.id) && state.player.status !== 'prisoner' && Math.random() < 0.5) {
                        npc.targetX = state.player.x; npc.targetY = state.player.y;
                        npc.hunting = 'player';
                        return;
                    }
                    // Savaştaki lord evinde oturmaz: yakın düşman yerleşimlerinden
                    // birine yürür (warTick orada çarpışmayı/kuşatmayı çözer).
                    if(lord && this.warsOf(npc.faction).length) {
                        // Sefer varsa ordu dağılmaz, mareşalin hedefine yürür
                        let camp = state.campaigns[npc.faction];
                        let ct = camp && LOCATIONS.find(l => l.id === camp.targetLocId);
                        if(ct && Math.random() < 0.7) home = ct;
                        else if(Math.random() < 0.35) {
                            let foes = LOCATIONS.filter(l => l.type !== 'village' && this.atWar(npc.faction, l.faction))
                                                .sort((a2, b2) => this.dist(a2, npc) - this.dist(b2, npc));
                            if(foes.length) home = foes[Math.floor(Math.random() * Math.min(3, foes.length))];
                        }
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

            // Haydut kervan avlar (#38): menzilindeki en yakın kafileye yönelir; baskının
            // kendisini banditTick çözer. Gücü yetmeyen çete peşine düşmez.
            if(npc.type === 'bandit' && !notices && !(BAND_KINDS[npc.band] || {}).beast) {
                let prey = null, bd = 1200;
                state.npcParties.forEach(t => {
                    if(!t.trade || t.size <= 0) return;
                    let d2 = this.dist(t, npc);
                    if(d2 < bd) { bd = d2; prey = t; }
                });
                npc.hunting = null;
                if(prey && prey.size * (prey.trade.kind === 'caravan' ? 1.15 : 0.5) < npc.size * 1.2) {
                    npc.targetX = prey.x; npc.targetY = prey.y;
                    npc.hunting = prey.id;   // kimlik saklanır, ad gösterim anında çevrilir
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

    // `ambush`: 'ambush' | 'spotted' | 'raid' — 'raid' yağmayı basan lorddur, sohbet yok
    // --- SAVAŞ ÖNCESİ ASKER MIRILTISI (#35) ---
    // Karşılaşma modalinde grubundan biri iki çift laf eder. Hangi havuzdan konuştuğu
    // güç oranına, morale, açlığa ve maaş borcuna bakar; İdare yeteneği korku eşiğini
    // yükseltir (iyi komutanın adamı geç panikler).
    CHATTER: {
        scared: [
            'Nereden geldim buraya, anamın evi sıcacıktı...',
            'Sayarım ha: onlar çok, biz az. Matematik bu, kabahat bende değil.',
            'Komutanım, ölürsem maaşımı anneme verirsiniz değil mi? ...Vermezsiniz.',
            'Şimdi kaçsak kimse fark etmez bence. Ben fark etmem mesela.',
            'Bak şu adamın kılıcına. Benimki tırpandan bozma.'
        ],
        hungry: [
            'Dövüşürüm de önce bir ekmek olsa? İki gündür kayış yiyorum.',
            'Aç karnına ölmek var mı, o da ayrı zulüm.',
            'Karnım gurulduyor, düşman duyup yerimizi buluyor.'
        ],
        unpaid: [
            'Maaşı alamadık ama ölmeye ilk biz gidiyoruz, güzel düzen.',
            'Bugün bedava dövüşüyorum. Yarın hesabı konuşuruz komutanım.',
            'Borcunu ödemeyen komutanın ardından kılıç sallamak zor iş.'
        ],
        bold: [
            'Bunlar mı? Kahvaltıdan önce toplarız.',
            'Komutanım, sen izle. Biz hallederiz.',
            'Ganimeti şimdiden paylaşalım, sonra tartışmayalım.',
            'Adamları say derseniz sayarım ama gerek yok, hepsi yatacak.'
        ],
        grumble: [
            'Yine mi? Daha dün mızrağımı temizlemiştim.',
            'Bir gün de kimseyle karşılaşmadan yürüsek.',
            'Bunlar da bir yerden çıkıyor. Fabrikaları mı var?'
        ]
    },

    troopChatter(npc) {
        let party = state.player.party;
        if(!party.length) return null;
        let mine = party.filter(t => !t.wounded).length + 1;
        let ratio = npc.size / Math.max(1, mine);
        let fs = this.foodStock(), lead = this.profLvl('leadership'), mo = this.morale();
        let pool = ratio >= 1.3 + (lead - 1) * 0.08 || mo < 25 ? 'scared'
                 : fs.total < fs.need ? 'hungry'
                 : state.player.wageDebt > 0 ? 'unpaid'
                 : (mo >= 70 || ratio <= 0.6) ? 'bold' : 'grumble';
        let t = party[Math.floor(Math.random() * party.length)];
        let line = T(this.CHATTER[pool][Math.floor(Math.random() * this.CHATTER[pool].length)]);
        return `<span style="color:var(--text-muted)">${this.troopLabel(t)}:</span> <i>"${line}"</i>`;
    },

    // Ödül kısma savaştan sonra tek satırda görülüyordu; kararı vermeden önce bilinsin.
    // Hesap Battle.rewardScale'in kendisidir — düşman gücü npc'den tahmin edilir (#55 madde 9).
    preyWarning(npc) {
        if(!npc || npc.trade) return '';
        let sc = Battle.rewardScale(npc.size * ((npc.level || 1) + 1));
        return sc < 0.95 ? `${T`🪶 Kolay av: bu savaştan alacağın ganimet ve tecrübe <b>%${Math.round(sc * 100)}</b>'e iner.`}` : '';
    },

    triggerEncounter(npc, ambush) {
        // Kamp bozulur: kimse üstüne gelirken uyumaya devam edemezsin (#53/1.1)
        if(state.player.wait) this.stopWait();
        state.encounterCooldown = 2;
        state.ambush = false;   // her karşılaşma bayrağı sıfırlar; pusu dalı geri açar
        state.player.currentEncounterNpcId = npc.id;

        // Kervan/köylü kafilesi: savaş dayatılmaz, soymak senin seçimin
        if(npc.trade) {
            let live = state.npcParties.find(n => n.id === npc.id);
            if(live) return this.meetTrader(live);
        }

        // Düşman olmayan bir soyluya rastladıysak bu bir sohbet fırsatı, savaş değil.
        // Ama köyünü yakarken bastıysa sohbet olmaz (#49).
        if(npc.lordId && !this.isHostile(npc) && ambush !== 'raid') {
            state.player.currentEncounterNpcId = null;
            state.encounterCooldown = 8;
            return Nobles.talk(npc.lordId);
        }

        let dialog = this.getHumorousDialog(npc.type, npc);

        let html = `<h3>${ambush === 'ambush' ? T('🌲 Pusu!') : ambush === 'raid' ? T('🔥 Baskın!') : T('⚔️ Karşılaşma:')} ${this.npcName(npc)}</h3>
        <p style="margin-top:0.5rem;">${T`Düşman grup büyüklüğü: <b>${npc.size}</b> kişi</p>
        <p>Senin grubun: <b>${state.player.party.length + 1}</b> kişi`}</p>`;

        if(ambush === 'ambush') {
            // Fark edemedin: savaş etrafın sarılmış hâlde başlar (Battle.start okur)
            state.ambush = true;
            html += `<p style="color:#e0463a;margin-top:0.5rem">${T`Ağaçların arasından üstünüze
                     atladılar — kaçacak yer yok, adamların dağılmış durumda!`}</p>`;
        } else if(ambush === 'spotted') {
            html += `<p style="color:#2ecc71;margin-top:0.5rem">${T`Kırılan dalı duydun: pusuyu
                     zamanında fark ettin, seni saramadılar.`}</p>`;
        }

        if(!ambush && npc.type === 'bandit' && state.time.day <= 14 && Math.random() < 0.25) {
            dialog = T`"Şu çaylağa bak patron, kılıcımızı kirletmeye değmez. Yürü git buradan çömez!"`;
            html += `<p><i>${dialog}</i></p>
            <p style="color:#2d2;font-size:0.85rem;margin-top:0.5rem">${T`Çapulcular seninle savaşmaya değmeyeceğini düşünüyor.`}</p>
            <div style="display:flex;gap:1rem;margin-top:1rem;">
            <button class="btn primary" onclick="Game.closeModal(); state.encounterCooldown = 5;">${T`Uzaklaş`}</button>
            <button class="btn" style="border-color:#cc0000;color:#cc0000" onclick="Game.closeModal(); Battle.start('${npc.name.replace(/'/g,"\\'")}', ${npc.size}, null, '${npc.faction || ''}')">${T`⚔️ Yine De Savaş!`}</button>
            </div>`;
        } else {
            // Pusuda ve yağma baskınında kaçış yok — etrafın sarılı, suçüstü yakalandın
            let canFlee = ambush !== 'ambush' && ambush !== 'raid';
            let flee = Math.round(this.fleeChance(npc) * 100);
            // Ordun rakibin 1.5 katıysa her çapulcu için arenaya inmek zorunda değilsin
            let mine = state.player.party.filter(t => !t.wounded).length + 1;
            let canAuto = !ambush && mine >= npc.size * 1.5;
            let chat = this.troopChatter(npc);   // adamlarının da söyleyecek bir şeyi var (#35)
            let prey = this.preyWarning(npc);    // ödül kısılacaksa savaştan önce söyle (#55)
            html += `<p><i>${dialog}</i></p>
            ${chat ? `<p style="margin-top:0.4rem;font-size:0.9rem">${chat}</p>` : ''}
            ${prey ? `<p style="margin-top:0.4rem;font-size:0.85rem;color:#cc8800">${prey}</p>` : ''}
            <p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.5rem">${canFlee
                ? `${T`Kaçabilirsin ama hız farkı belirler: kaçış şansın`} <b>%${flee}</b>.`
                : T('Kaçış yok — savaş ya da teslim ol!')}</p>
            <div style="display:flex;gap:0.6rem;margin-top:1rem;flex-wrap:wrap;justify-content:center">
            <button class="btn primary" onclick="Game.closeModal(); Battle.start('${npc.name.replace(/'/g,"\\'")}', ${npc.size}, null, '${npc.faction || ''}')">${T`⚔️ Savaş!`}</button>
            ${canAuto ? `<button class="btn" style="border-color:#8fd6ff;color:#8fd6ff" onclick="Game.autoBattle('${npc.id}')" title="Sen inmezsin, adamların halleder — kayıp daha yüksektir">${T`🎖️ Askerlerini Gönder`}</button>` : ''}
            ${canFlee ? `<button class="btn" style="border-color:#cc8800;color:#cc8800" onclick="Game.fleeEncounter('${npc.id}')">${T`🏃 Kaçmayı Dene (%${flee})`}</button>` : ''}
            ${(BAND_KINDS[npc.band] || {}).beast ? '' :
                `<button class="btn" style="border-color:#cc8800;color:#cc8800" onclick="Game.closeModal(); Game.surrender('${npc.id}', '${npc.name.replace(/'/g,"\\'")}')">${T`🏳️ Teslim Ol`}</button>`}
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
        let ratio = this.defeatLootRatio();   // kasadaki pay kaybı düşürür (#53/1.2)
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
        state.player.siege = null;
        state.player.currentRaid = null;

        alert(`${T`Teslim oldun! Tüm birliğini kaybettin ve köle olarak sürükleneceksin.<br>-${moneyLost} Dinar`}`
            + (renownLost ? `<br>${T`-${renownLost} nam`}` : ''));
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
        let pool = [T('Köylü'), T('Kervancı'), T('Gezgin Tüccar'), T('Yaralı Asker'), T('Değirmenci'), T('Ozan'), T('Çırak')];
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
            this.releaseFromCaptivity(T('Kesenin dibi göründü. Ellerindeki son dinarı da alıp seni yol kenarına attılar.'));
            return;
        }
        state.player.money -= amount;
        this.releaseFromCaptivity(T`${amount} Dinar ödedin. Zincirlerin çözüldü.`);
    },

    refuseRansom(ratio) {
        if(!state.player.prisoner) return this.closeModal();
        let p = state.player.prisoner;
        p.ransomRefusals = (p.ransomRefusals || 0) + 1;
        this.closeModal();

        if(p.ransomRefusals >= 3) {
            // Üçüncü retten sonra ellerinde tutmanın anlamı kalmaz
            state.player.money = Math.floor(state.player.money * 0.5);
            this.releaseFromCaptivity(T('"Bu adamı beslemek fidyesinden pahalıya geliyor." Yarı paranı alıp seni kovdular.'));
            return;
        }

        // Ceza: birkaç gün daha + kaçış planı sıfırlanır
        p.daysLeft = 2 + Math.floor(Math.random() * 4);
        p.ransomRequired = Math.min(0.95, (p.ransomRequired || 0.75) + 0.05);
        p.escapeChance = Math.max(0, (p.escapeChance || 0) - 25);
        p.isPlanning = false;
        this.renderPrisonerUI();
        alert(T`Reddettin. Bir güzel dayak yedin ve zindana geri atıldın. (${p.daysLeft} gün daha)`);
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

        this.ambitionTick();   // hedef koşulu sağlandı mı (#53/1.4)
        // Şeref zamanla sıfıra döner ama çabuk değil (#49/#53): bir yağma ~24 gün
        if(state.player.honor) state.player.honor += state.player.honor > 0 ? -0.5 : 0.5;
        // Süresi dolan kan davaları silinir
        Object.keys(state.grudges).forEach(id => { if(!this.hasGrudge(id)) delete state.grudges[id]; });

        // Refah zamanla toparlanır (yağmalanan köy sonsuza dek yoksul kalmasın)
        LOCATIONS.forEach(loc => {
            // Yakılan köy daha hızlı toparlanır; zaten zengin yerleşim yavaş büyür
            if(loc.prosperity !== undefined && loc.prosperity < 90) loc.prosperity += loc.prosperity < 50 ? 0.4 : 0.15;
        });
        this.stockTick();   // stok tabanına döner, fiyat da onunla (#24/#46)

        // Gönüllü yenilenmesi (şehirler ve köyler için 2 günde bir)
        LOCATIONS.forEach(loc => {
            if(loc.type === 'village' || loc.type === 'city') {
                // Kısmi alım sonrası (ör. 5'ten 2 kalmış) köy de yenilenebilmeli;
                // eskiden yalnızca tam boşalınca yenileniyordu.
                let full = loc.type === 'city' ? 7 : 5;
                // Yağmalanan köyde bir hafta toplanacak gönüllü kalmaz
                if(state.time.day - (loc.raidedDay || -99) < 7) return;
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

    // --- GÜNLÜK OLAY HAVUZU (#35) ---
    // Her gün bir olay olmaz: EVENT_CHANCE zar atar (ölçüldü ~3 günde bir). Havuzun
    // yaklaşık %60'ı olumsuz, %40'ı olumludur ama hiçbirinin bedeli seferi bitirmez.
    // Her olayın `when` süzgeci vardır (grup, erzak, yakındaki yerleşim, moral) ve
    // son 5 olay tekrar seçilmez — aynı espri iki gün üst üste komik değil.
    EVENT_CHANCE: 0.35,
    DAY_EVENTS: [
        // --- olumsuz ---
        { id: 'latrine', bad: 1, when: c => c.party >= 3, run(c) {
            Game.addMorale(-3);
            return `${T`Askerlerden biri gece yolunu şaşırıp <b>hela çukuruna</b> düştü. Kokusu sabaha kadar kampta kaldı.<br>Moral`} <b>−3</b>.`;
        }},
        { id: 'foodfight', bad: 1, when: c => c.party >= 4 && c.food > 3, run(c) {
            let lost = Game.takeFood(2 + Math.floor(Math.random() * 3));
            Game.addMorale(-2);
            return `${T`Son peynir yüzünden <b>erzak kavgası</b> çıktı; kavganın ortasında ${lost} birim yiyecek yere döküldü.<br>Moral`} <b>−2</b>.`;
        }},
        { id: 'drunk', bad: 1, when: c => c.party >= 2 && c.near, run(c) {
            let fine = 20 + Math.floor(Math.random() * 40);
            state.player.money = Math.max(0, state.player.money - fine);
            return `${T`${T(c.near.name)} yakınında sarhoş bir askerin <b>yanlış adama</b> meydan okuduğu haberi geldi. Tazminatı sen ödedin.<br><b>−${fine} dinar`}</b>.`;
        }},
        { id: 'thief', bad: 1, when: c => state.player.money > 100, run(c) {
            let lost = Math.min(250, Math.round(state.player.money * (0.02 + Math.random() * 0.03)));   // tavan: zengin oyuncuyu da sadece kızdırsın
            state.player.money -= lost;
            return `${T`Sabah kese hafiflemişti. Kimse bir şey görmemiş, herkes birbirine bakıyor.<br><b>−${lost} dinar`}</b>.`;
        }},
        { id: 'sprain', bad: 1, when: c => c.party >= 2 && state.player.party.some(t => !t.wounded), run(c) {
            let hurt = state.player.party.filter(t => !t.wounded);
            let t = hurt[Math.floor(Math.random() * hurt.length)];
            t.wounded = 2;
            return `<b>${Game.troopLabel(t)}</b> ${T`kendi mızrağına takılıp ayağını burktu. İki gün savaşa giremez.`}`;
        }},
        { id: 'rumor_market', bad: 1, when: c => c.near && c.near.type === 'city', run(c) {
            return `${T`Yolda duyduğun söylenti: "<i>${T(c.near.name)} esnafı adamı donuna kadar soyar</i>." Cüzdanını sıkı tut.`}`;
        }},
        { id: 'rain', bad: 1, when: c => true, run(c) {
            Game.addMorale(-2);
            return `${T`Bütün gün yağmur yağdı. Çadırlar ıslandı, yorganlar ıslandı, herkesin keyfi kaçtı.<br>Moral`} <b>−2</b>.`;
        }},
        { id: 'horseshoe', bad: 1, when: c => !!state.player.equipment.horse, run(c) {
            let fee = 15 + Math.floor(Math.random() * 25);
            state.player.money = Math.max(0, state.player.money - fee);
            return `${T`Atının nalı düştü. Yol kenarındaki nalbant fırsatı kaçırmadı.<br><b>−${fee} dinar`}</b>.`;
        }},
        // --- olumlu ---
        { id: 'bard', bad: 0, when: c => c.party >= 2, run(c) {
            Game.addMorale(4);
            return `${T`Askerlerden biri akşam ateşinde öyle kötü şarkı söyledi ki kamp gülmekten kırıldı.<br>Moral`} <b>+4</b>.`;
        }},
        { id: 'purse', bad: 0, when: c => true, run(c) {
            let gain = 30 + Math.floor(Math.random() * 60);
            state.player.money += gain;
            return `${T`Yol kenarındaki çalılıkta unutulmuş bir kese buldun. Sahibi aramaya gelmedi.<br><b>+${gain} dinar`}</b>.`;
        }},
        { id: 'hunt', bad: 0, when: c => c.party >= 1, run(c) {
            let n = 2 + Math.floor(Math.random() * 3);
            Game.addItem('meat', n);
            return `${T`Avcı çıkışan askerin bu sefer şansı yaver gitti: akşam yemeğine <b>${n} et</b> geldi.`}`;
        }},
        { id: 'deserter', bad: 0, when: c => c.party + 1 < Game.getPartyCapacity(), run(c) {
            let name = Game.recruitName(c.near || LOCATIONS[0]);
            state.player.party.push({ id: 'troop_' + Math.random().toString(36).substr(2, 9),
                name, level: 1, xp: 0, xpNext: 3, type: 'infantry' });
            return `${T`Yolda başıboş dolaşan bir <b>${T(name)}</b> gruba katıldı. Eski komutanını sormamak en iyisi.`}`;
        }},
        { id: 'blessing', bad: 0, when: c => c.near && c.near.type === 'village', run(c) {
            Game.addItem('cheese', 2);
            Game.addMorale(2);
            return `${T`${T(c.near.name)} köyünden bir kadın "yoldan geçene uğur olsun" deyip iki peynir bıraktı.<br><b>+2 peynir</b>, moral`} <b>+2</b>.`;
        }}
    ],

    // Olay yardımcıları: üçü de tek satır, ayrı ayrı yazılmasınlar diye burada
    addMorale(n) { state.player.morale = Math.max(0, Math.min(100, this.morale() + n)); },
    addItem(id, qty) {
        let ex = state.player.inventory.find(i => i.id === id);
        if(ex) ex.qty += qty; else state.player.inventory.push({ ...ITEMS[id], qty });
    },
    takeFood(n) {
        let left = n, got = 0;
        for(let i = 0; i < state.player.inventory.length && left > 0; i++) {
            let it = state.player.inventory[i];
            if(!['wheat','bread','meat','cheese'].includes(it.id)) continue;
            let take = Math.min(it.qty, left);
            it.qty -= take; left -= take; got += take;
            if(it.qty <= 0) { state.player.inventory.splice(i, 1); i--; }
        }
        return got;
    },

    dailyEvent() {
        if(state.player.prisoner || state.player.status === 'besieging') return null;
        if(Math.random() > this.EVENT_CHANCE) return null;
        let near = LOCATIONS.filter(l => this.dist(l, state.player) < 900)
                            .sort((a, b) => this.dist(a, state.player) - this.dist(b, state.player))[0];
        let ctx = { party: state.player.party.length, near, food: this.foodStock().total, morale: this.morale() };
        let recent = state.recentEvents || (state.recentEvents = []);
        let avail = this.DAY_EVENTS.filter(e => e.when(ctx));
        // Zar iki kez atılır: önce ton (%60 olumsuz), sonra o tondan olay. Tekrar
        // süzgeci **tonun içinde** çalışır — önce uygulanınca olumlu havuz "son
        // olaylar"a takılıp boşalıyor ve olumsuz oran %71'e çıkıyordu.
        let bad = Math.random() < 0.6 ? 1 : 0;
        let side = avail.filter(e => e.bad === bad);
        if(!side.length) side = avail;
        if(!side.length) return null;
        let pool = side.filter(e => !recent.includes(e.id));
        if(!pool.length) pool = side;
        let ev = pool[Math.floor(Math.random() * pool.length)];
        recent.push(ev.id);
        if(recent.length > 4) recent.shift();
        let text = ev.run(ctx);
        this.updateTopBar();
        alert(`${ev.bad ? '🌧️' : '🌤️'} <b>${T`Günün Olayı`}</b><br><br>${text}`);
        return ev.id;
    },

    dailyUpdate() {
        Save.auto();   // günün başında halkasal otomatik kayıt (#55 madde 1)
        if(state.player.prisoner) {
            state.player.prisoner.daysLeft--;
            if(state.player.prisoner.daysLeft <= 0) {
                let escapeChance = Math.random();
                if(escapeChance <= 0.40) {
                    Quests.emit('escaped_captivity', { npcId: state.player.prisoner.npcId });
                    state.player.prisoner = null; state.player.status = 'idle'; state.encounterCooldown = 5;
                    this.renderPrisonerUI();
                    alert(T('Şanslısın! Fırsatını bulup fidye ödemeden kaçmayı başardın!'));
                } else {
                    let ratio = state.player.prisoner.ransomRequired;
                    let amount = Math.floor(state.player.money * ratio);
                    this.showModal(`<div style="text-align:center">
                        <h3 style="margin-bottom:1rem;color:#ffaa00">${T`Fidye İsteği`}</h3>
                        <p style="font-size:1.1rem;margin-bottom:1.5rem">${T`Seni esir edenler özgürlüğün karşılığında senden <b>${amount} Dinar</b> istiyor. Kabul ediyor musun?`}</p>
                        <div style="display:flex;gap:1rem;justify-content:center;">
                            <button class="btn primary" onclick="Game.payRansom(${amount})">${T`Öde ve Kurtul`}</button>
                            <button class="btn" style="border-color:#cc0000;color:#cc0000" onclick="Game.refuseRansom(${ratio})">${T`Reddet`}</button>
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
            let fief = this.fiefIncome();                 // tımar vergisi (garnizon maaşı upkeep'te)
            state.player.money += fief.tax + fief.tribute + fief.trade;
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
                alert(`🍽️ <b>${T`Ordu aç kaldı!</b><br>Günlük ihtiyaç <b>${Math.ceil(foodRequiredLow)} birim</b> yemekti,`} ` +
                      T`<b>${Math.ceil(foodRequiredLow) - missingLow} birim</b> bulundu.<br>` +
                      `${T`Moral <b>−30</b> — moral 25'in altına inerse asker firar etmeye başlar.`}<br>` +
                      `<i>${T`Köylerin erzak pazarı en ucuz kaynaktır.`}</i>`);
            } else if(!hungry && state.player.wasHungry) {
                alert(T('🍞 Ordu doydu, açlık cezası kalktı.'));
            }
            state.player.wasHungry = hungry;

            // Kalite eksiği açlıktan ayrı bir şey: karnı tok ama seçkin asker homurdanıyor.
            // Oyuncu "envanterde ekmek var, neden debuff yiyorum" diye haklı olarak şaşırıyordu.
            let elite = state.player.party.filter(t => t.level >= 30 && t.level < 51).length;
            if(missingHighQuality > 0 && elite && !state.player.wasLowQuality) {
                alert(`🥩 <b>${T`${elite} seçkin askerin</b> et/peynir bulamadı.`}<br>` +
                      `${T`Ekmek ve tahıl karınlarını doyurur ama <b>savaşta ×0.7</b> güçle dövüşürler.`}<br>` +
                      T`Bu açlık değil, <b>kalite</b> meselesi: günde ${Math.ceil(foodRequiredHigh)} birim et ya da peynir gerekiyor.`);
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

        this.diplomacyTick();   // savaş ilanı / barış zarı
        this.warTick();         // cephede çarpışma + yerleşim el değiştirme
        // Cephede dağılan lordlar birkaç gün sonra evinde toparlanır
        for(let lid in state.lordRespawn) {
            if(state.time.day >= state.lordRespawn[lid]) {
                this.respawnLordParty({ lordId: lid });
                delete state.lordRespawn[lid];
            }
        }

        this.campaignTick();    // mareşal seçimi, sefer hedefi, oyuncuya çağrı
        this.banditTick();      // haydutlar yoldaki kafileleri vurur
        this.siegeTick();       // kuşatma kampı: hazırlık, açlık, yardım ordusu (#25)

        Nobles.dailyTick();
        Feast.dailyTick();
        Quests.dailyTick();

        // Çapulcu yeniden doğma
        if(state.npcParties.filter(n=>n.type==='bandit').length < 10) {
            this.spawnBand(this.randomBandKind());
        }
        this.ensureTraders();   // soyulan kafilelerin yerine yenileri yola çıkar
        this.dailyEvent();      // günlük olay havuzu (#35) — en sonda, günün hesabı kapandıktan sonra
    },

    updateTopBar() {
        let p = state.player;
        let set = (id, v) => { let e = document.getElementById(id); if(e) e.innerText = v; };
        let bar = (id, pct) => { let e = document.getElementById(id); if(e) e.style.width = Math.max(0, Math.min(100, pct)) + '%'; };

        let cap = this.getPartyCapacity();
        let dp = this.getDayPart();

        set('ui-day', T`${state.time.day}. Gün`);
        set('ui-clock', `${String(Math.floor(state.time.hour)).padStart(2,'0')}:00 · ${dp.name}`);
        set('ui-daypart', dp.icon);
        set('ui-money', Math.floor(p.money));
        let fs = this.foodStock();
        set('ui-food', fs.need ? (fs.days === Infinity ? '∞' : fs.days) : '—');
        set('ui-food-sub', fs.need ? (fs.total ? T('gün erzak') : T('erzak yok')) : T('erzak'));
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

        this.setHtml('tip-time', this.tipBox(T('Sefer Takvimi'),
            R(T('Gün'), p.quests && p.quests.length ? T`${state.time.day}. gün` : state.time.day, null) +
            R(T('Saat'), `${String(Math.floor(state.time.hour)).padStart(2,'0')}:00 · ${this.getDayPart().name}`, null) +
            R(T('Zaman akışı'), '×' + this.timeScale(), null),
            T('Zaman yalnızca haritada, sen yol alırken işler. Gece yol alma hızı −%15, görüş ×0.7. Rozete tıkla → akış hızını değiştir.')));

        let up = this.upkeep();
        this.setHtml('tip-money', this.tipBox(T('Hazine'),
            R(T('Kesede'), T`${Math.floor(p.money)} dinar`, null) +
            R(T('Günlük asker maaşı'), '-' + up.wage, false) +
            R(T('Günlük yemek'), T`-${Math.ceil(up.foodLow)} birim${up.foodHigh ? T` (${Math.ceil(up.foodHigh)}'i et/peynir)` : ''}`, false) +
            (this.myFiefs().length ? R(T('Tımar vergisi'), T`+${this.fiefIncome().tax} (${this.myFiefs().length} tımar)`, true) : '') +
            (this.myEnterprises().length ? R(T('İşletme'), T`+${this.fiefIncome().trade} (${this.myEnterprises().length} işletme)`, true) : '') +
            (p.spouse ? R(T('Evlilik geliri'), '+50', true) : '') +
            (p.wageDebt > 0 ? R(T('Gecikmiş maaş'), T`${Math.ceil(p.wageDebt)} dinar · ${p.wageLateHours || 0} saattir`, false) : '') +
            (p.wageDebt > 0 ? R(T('Saatlik moral kaybı'), '-1', false) : ''),
            T('Maaş ödenemezse borç birikir ve her saat 1 moral gider; paran olunca borç kendiliğinden ödenir. Lvl 10 altı asker maaş istemez, lvl 51 hiçbir şey istemez.')));

        let fs = this.foodStock();
        this.setHtml('tip-food', this.tipBox(T('Erzak'),
            R(T('Elde'), T`${fs.total} birim (${fs.low} tahıl/ekmek · ${fs.high} et/peynir)`, fs.total > 0) +
            R(T('Günlük tüketim'), T`-${fs.need} birim`, false) +
            (fs.spoil >= 0.05 ? R(T('Bozulma'), T`-${fs.spoil.toFixed(1)} birim/gün`, false) : '') +
            R(T('Yeter'), fs.need ? T`${fs.days} gün` : T('ordu yok'), fs.days >= 3) +
            (fs.needHigh ? R(T('Seçkin asker payı'), T`${fs.needHigh} birim et/peynir`, fs.high >= fs.needHigh) : '') +
            R(T('Yemek çeşidi'), T`${fs.kinds} çeşit · moral +${fs.kinds * 5}`, fs.kinds > 1),
            T('Erzak biterse moral −30 ve firar başlar. Çeşit başına +5 moral. Ekmek çabuk bozulur (20 gün), tahıl dayanır (60 gün).')));

        this.setHtml('tip-renown', this.tipBox(T('Nam'),
            R(T('Namın'), p.renown, null) +
            R(T('Ulaşılan en yüksek'), this.peakRenown(), null) +
            R(T('Salon konukları'), T('80 nam'), this.peakRenown() >= 80) +
            R(T('Kız isteme'), T('120 nam'), this.peakRenown() >= 120) +
            R(T('Şölen daveti'), T('150 nam'), this.peakRenown() >= 150),
            T('Nam kazandıran: savaş zaferi +3, turnuva +20, şölen vermek +15. Drahomayı da düşürür.')));

        this.setHtml('tip-hp', this.tipBox(T('Can'),
            R(T('Şu an'), `${Math.floor(p.stats.hp)}/${p.stats.maxHp}`, p.stats.hp > p.stats.maxHp * 0.4) +
            R(T('Seviyeden'), 50 + (p.stats.level - 1) * 10, true) +
            (p.equipment.armor ? R(T`Zırh (${T(p.equipment.armor.name)})`, '+' + p.equipment.armor.armor, true) : R(T('Zırh'), T('yok'), false)),
            T('Her gün +5 iyileşirsin. Savaşta canın biterse ölmezsin, bayılırsın — adamların dövüşmeye devam eder ama ödül yarıya iner.')));

        this.setHtml('mute-ico', this.opt('muted') ? '🔇' : '🔊');
        this.setHtml('mute-lbl', this.opt('muted') ? T('Ses Kapalı') : T('Ses Açık'));

        let comp = this.getPartyComposition();
        // Kapasite oyuncunun KENDİ İdare seviyesinden gelir; künye profLvl (gruptaki en
        // yüksek) okuduğu için yoldaş varken döküm toplama uymuyordu (#43).
        let lead = (state.player.proficiencies.leadership || { level: 1 }).level;
        this.setHtml('tip-party', this.tipBox(T('Grup'),
            R(T('Mevcut'), `${p.party.length}/${cap}`, p.party.length <= cap) +
            R(T('Temel kapasite'), 12, null) +
            R(T('Liderlik (efektif)'), `+${Math.floor((this.attr('cha') - 10) * 3)}`, this.attr('cha') >= 10) +
            R(T('İdare yeteneği'), `+${(lead - 1) * 4}`, true) +
            R(T('Nam'), `+${Math.floor(p.renown / 40)}`, p.renown >= 40) +
            R(T('Dağılım'), `🪖${comp.infantry} 🏹${comp.archer} 🐎${comp.cavalry}`, null) +
            R(T('Atlı oranı'), this.pct(this.getMountedRatio() * 100), null),
            T('Kapasiteyi aşarsan moral düşer. Kalabalık ordu haritada yavaş yol alır; atlı oranı bu cezayı hafifletir.')));

        this.setHtml('tip-morale', this.moraleTip());

        this.setHtml('tip-level', this.tipBox(T('Seviye'),
            R(T('Seviye'), p.stats.level, null) +
            R(T('Tecrübe'), `${Math.floor(p.stats.xp)}/${p.stats.xpNext}`, null) +
            R(T('Bekleyen nitelik puanı'), p.stats.attributePoints || 0, (p.stats.attributePoints || 0) > 0) +
            R(T('Bekleyen odak puanı'), p.stats.focusPoints || 0, (p.stats.focusPoints || 0) > 0),
            T('Her seviye: +10 can, tam iyileşme, 2 nitelik + 3 odak puanı. Seninle boy ölçüşemeyecek düşmandan alınan tecrübe ve ganimet azalır.')));
    },
    // Moral künyesi: moraleHtml ile aynı kalemler, rozete sığan biçimde
    moraleTip() {
        let m = Math.round(this.morale());
        let info = state.player.moraleInfo || {};
        let rows = Object.keys(info).filter(k => info[k] !== 0)
            .map(k => this.tipRow(T(k), (info[k] > 0 ? '+' : '') + info[k], info[k] > 0)).join('');
        return this.tipBox(T`Moral ${m}/100 — ${this.moraleLabel(m)}`,
            (rows || `<i>${T('Henüz hesaplanmadı (bir gün geçmeli).')}</i>`) +
            this.tipRow(T('Savaş gücü çarpanı'), '×' + this.moraleMult().toFixed(2), this.moraleMult() >= 1) +
            (state.player.wageDebt > 0
                ? this.tipRow(T('Maaş gecikmesi'), T`${state.player.wageLateHours || 0} saat · -1/saat`, false) : ''),
            T('Moral tüm askerlerinin canını ve saldırısını ölçekler. 25\'in altında her gece asker firar eder. Hızlı düşer, yavaş toparlanır.'));
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
        t.innerText = T(terrain.name) + (terrain.mult !== 1 ? T`  (${terrain.mult > 1 ? '+' : ''}%${((terrain.mult-1)*100).toFixed(0)} hız)` : '');
        document.getElementById('map-terrain').firstElementChild.innerText = terrain.icon;

        let c = this.getPartyComposition();
        // Harcanmamış puan haritadan görünsün, karakter ekranına açılsın (#35)
        let st = state.player.stats, ap = st.attributePoints || 0, fp = st.focusPoints || 0;
        let pts = ap + fp ? `<button id="btn-points" onclick="Game.showScreen('character')"`
                + ` title="${T('Harcanmamış puanların var — karakter ekranına git (C)')}">✨ ${ap ? T`${ap} nitelik` : ''}`
                + `${ap && fp ? ' · ' : ''}${fp ? T`${fp} odak` : ''}</button>` : '';
        this.setHtml('map-comp',
            `<span>🪖 <b>${c.infantry}</b></span><span>🏹 <b>${c.archer}</b></span><span>🐎 <b>${c.cavalry}</b></span>`
            + pts
            + `<button id="btn-wait" onclick="Game.askWait()" title="${T('Kamp kur, zamanı geçir')}">${T`⏳ Bekle`}</button>`
            + `<button id="btn-center" onclick="Game.centerOnPlayer()" title="${T('Kamerayı bana getir (Boşluk)')}">${T`🎯 Beni Bul <kbd>Boşluk`}</kbd></button>`
            + `<button id="btn-diplo" onclick="Game.showDiplomacy()" title="${T('Krallıkların savaş/barış hâli (K)')}">${T`🌍 Diplomasi`} <kbd>K</kbd></button>`);
    },

    renderPrisonerUI() {
        let ui = document.getElementById('prisoner-ui');
        if(!state.player.prisoner) { ui.classList.add('hidden'); return; }
        ui.classList.remove('hidden');

        let p = state.player.prisoner;
        this.setHtml('prisoner-info',
              `${T`Seni tutan:`} <b>${T(p.npcName)}</b><br>`
            + `${T`Muhafız: <b>${p.troops || '?'}</b> kişi`}<br>`
            + `${T`Kalan süre: <b>${Math.max(0, p.daysLeft)}</b> gün`}<br>`
            + (p.fellows && p.fellows.length
                ? `${T`Diğer esirler:`} <b>${p.fellows.join(', ')}</b>`
                : T`Zincirdeki tek esir sensin.`));
        document.getElementById('ui-escape-chance').innerText = this.pct(p.escapeChance);
        
        let btn = document.getElementById('btn-escape-plan');
        if(p.isPlanning) {
            btn.classList.add('planning-active');
            btn.innerText = T('Plan Yapılıyor... (Vazgeç)');
        } else {
            btn.classList.remove('planning-active');
            btn.innerText = T('Kaçış Planı Yap');
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
            alert(T('Günde sadece 1 kez kaçmayı deneyebilirsin! Plan yapmaya devam et veya yarını bekle.'));
            return;
        }
        
        p.lastAttemptDay = state.time.day;
        
        if(Math.random() * 100 <= p.escapeChance) {
            alert(T('Harika! Gardiyanların dalgınlığından yararlanarak başarıyla kaçtın!'));
            Quests.emit('escaped_captivity', { npcId: p.npcId });
            state.player.prisoner = null;
            state.player.status = 'idle';
        } else {
            alert(T('Kahretsin! Kaçış girişimin fark edildi. Tüm planların suya düştü ve ceza aldın!'));
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

        // Savaştan/turnuvadan çıkılan her yol buradan geçer: harita döngüsünü geri kur
        if(screenId !== 'battle' && !this._loopId && !Battle.active && !TournamentMinigame.active) {
            this.startGameLoop();
        }

        this.renderSiegeUI();   // kuşatma paneli yalnız haritada durur
        this.renderRaidUI();    // yağma paneli de (#49)
        this.renderWaitUI();    // kamp paneli de (#53)
        this.applyViewBg(screenId);   // tematik zemin, ekran başına bir kez (#61)
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
        let w = this.textW(ctx, text) * k + 18*k, h = 25*k;
        ctx.font = `bold ${(19*k).toFixed(1)}px Inter, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

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
    // Kervan: çeki atı + yük arabası. Fraksiyon rengi tentede.
    drawCart(ctx, col, cloak) {
        ctx.save();
        ctx.fillStyle = '#6b5442';                                      // çeki atı
        ctx.beginPath(); ctx.ellipse(22, -22, 11, 6, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(29,-26); ctx.lineTo(38,-32); ctx.lineTo(40,-24); ctx.lineTo(31,-19); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#4a3a2e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(16,-17); ctx.lineTo(15,-3); ctx.moveTo(27,-17); ctx.lineTo(28,-3); ctx.stroke();
        ctx.strokeStyle = '#7d6a45'; ctx.lineWidth = 2.4;               // ok (dişingi)
        ctx.beginPath(); ctx.moveTo(0,-16); ctx.lineTo(18,-20); ctx.stroke();
        ctx.fillStyle = cloak; ctx.fillRect(-24, -30, 26, 17);          // yük kasası
        ctx.fillStyle = col;                                            // tente
        ctx.beginPath(); ctx.moveTo(-26,-30); ctx.quadraticCurveTo(-11,-46, 4,-30); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.strokeStyle = '#4a3a2e'; ctx.lineWidth = 2.6;               // tekerlekler
        ctx.beginPath(); ctx.arc(-18, -10, 7, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(-3, -10, 6, 0, Math.PI*2); ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.restore();
    },

    drawFigure(ctx, kind, col, cloak) {
        if(kind === 'cart')  return this.drawCart(ctx, col, cloak);
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

        // Deniz dalgaları — 26 polyline × 45 nokta; hafif modda deniz düz durur
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 6;
        let wt = performance.now() / 4000;
        for(let i = -4; i < 22 && !this.lite(); i++) {
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
        // Kıyı gölgesi: `shadowBlur = 70` kıtanın tamamını her karede piksel piksel
        // bulanıklaştırıyordu. Üç saydam geniş kontur aynı hâleyi verir, bedeli yol çizimi.
        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        for(let bw of [130, 86, 48]) { ctx.lineWidth = bw; ctx.stroke(); }
        ctx.fillStyle = '#2f452c'; ctx.fill();
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
        if(!this.lite()) state.dirtPatches.forEach(d => {
            ctx.save(); ctx.translate(d.x, d.y);
            ctx.fillStyle = this.radial(ctx, Math.round(d.r), 'rgba(30,44,28,0.55)', 'rgba(30,44,28,0)');
            ctx.beginPath(); ctx.arc(0, 0, d.r, 0, Math.PI*2); ctx.fill();
            ctx.restore();
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

        // Yollar — türüne göre ayrı doku (#56): taş döşeli ana yol, toprak yol,
        // bakımsız keçi yolu. Aynı türdekiler tek path'te toplanır (kare başına 3 stroke seti).
        if(state.roads) {
            const STYLE = {
                stone: { w: 52, shoulder: 'rgba(78,72,60,0.45)', top: 36, surf: 'rgba(150,146,134,0.48)',
                         mark: 'rgba(226,222,208,0.26)', dash: [26, 20], mw: 5 },
                dirt:  { w: 44, shoulder: 'rgba(92,68,38,0.45)', top: 28, surf: 'rgba(158,124,74,0.42)',
                         mark: 'rgba(214,186,132,0.30)', dash: [70, 55], mw: 4 },
                track: { w: 26, shoulder: 'rgba(84,72,44,0.30)', top: 14, surf: 'rgba(150,132,88,0.28)',
                         mark: 'rgba(198,180,132,0.22)', dash: [22, 46], mw: 3 }
            };
            for(let kind of ['stone', 'dirt', 'track']) {
                let st = STYLE[kind];
                ctx.beginPath();
                let any = false;
                state.roads.forEach(r => {
                    if((r.kind || 'dirt') !== kind) return;
                    any = true;
                    ctx.moveTo(r.x1, r.y1); ctx.lineTo(r.x2, r.y2);
                });
                if(!any) continue;
                ctx.lineWidth = st.w;   ctx.strokeStyle = st.shoulder; ctx.stroke();
                ctx.lineWidth = st.top; ctx.strokeStyle = st.surf;     ctx.stroke();
                ctx.setLineDash(st.dash);
                ctx.lineWidth = st.mw;  ctx.strokeStyle = st.mark;     ctx.stroke();
                ctx.setLineDash([]);
            }
            // Yerleşim ağzında yol meydana açılır
            ctx.fillStyle = 'rgba(120,98,62,0.35)';
            LOCATIONS.forEach(l => {
                let r = l.type === 'city' ? 70 : l.type === 'castle' ? 52 : 40;
                ctx.beginPath(); ctx.arc(l.x, l.y, r, 0, Math.PI*2); ctx.fill();
            });
            // Köprüler — nehrin üstünden geçen kalaslar
            (state.bridges || []).forEach(b => {
                let w = (this.ROAD_KINDS[b.kind] || this.ROAD_KINDS.dirt).half + 6;  // yolun kendi genişliği
                ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a || 0);
                ctx.fillStyle = 'rgba(70,52,30,0.92)';
                ctx.fillRect(-w * 1.3, -w, w * 2.6, w * 2);
                ctx.strokeStyle = 'rgba(186,152,96,0.95)'; ctx.lineWidth = 4;
                for(let i = -w * 1.15; i <= w * 1.15; i += 12) {   // kalaslar yola dik
                    ctx.beginPath(); ctx.moveTo(i, -w + 2); ctx.lineTo(i, w - 2); ctx.stroke();
                }
                ctx.restore();
            });
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
        // Orman lekesi sabit konumda: gradyanı bir kez üretilir. Ağaçlar (4 orman ×
        // ~15 ağaç, her biri 6 yol + 1 gradyan) hafif modda düşer, leke kalır.
        if(!this._forestGrad) this._forestGrad = FORESTS.map(f => {
            let g = ctx.createRadialGradient(f.x, f.y, f.radius*0.2, f.x, f.y, f.radius);
            g.addColorStop(0, 'rgba(16,38,18,0.85)');
            g.addColorStop(1, 'rgba(16,38,18,0)');
            return g;
        });
        // Hafif modda ağaçlar seyreltilir ama söndürülmez: karartma diski tek başına
        // zeminden ayırt edilmiyor, orman görünmez oluyordu — oysa orman bir oynanış
        // bilgisi (pusu, görüş, hız). Üçte biri kalınca lekesi hâlâ okunuyor.
        let step = this.lite() ? 3 : 1;
        FORESTS.forEach((f, i) => {
            ctx.fillStyle = this._forestGrad[i];
            ctx.beginPath(); ctx.arc(f.x, f.y, f.radius, 0, Math.PI*2); ctx.fill();
            this._forestTrees[i].forEach((t, j) => { if(j % step === 0) Battle.drawTree(ctx, t.x, t.y, t.r); });
        });

        ctx.restore(); // kıta clip'i biter

        // Keşif noktaları (#58): yerleşimden küçük, soluk — dikkat çeker ama kalabalık etmez
        (state.sites || []).forEach(site => {
            let k = this.SITE_KINDS[site.kind], ik = this.iconScale(), big = 30 * ik;
            let fresh = this.siteReady(site);
            ctx.beginPath();
            ctx.ellipse(site.x, site.y + 12, big*0.5, big*0.2, 0, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
            ctx.globalAlpha = fresh ? 0.95 : 0.45;
            this.emoji(ctx, k.icon, site.x, site.y + 10, big);
            ctx.globalAlpha = 1;
            // Etiket yalnız yakınlaşınca: 14 uzun ad kıta görünümünde yerleşim adlarını eziyordu
            if(fresh && this.camera.zoom > 0.18) this.mapLabel(ctx, k.name, site.x, site.y - big*0.75 - 10, '#cbbf9a', '#8a7b52');
        });

        // Draw locations
        LOCATIONS.forEach(loc => {
            let fc = FACTIONS[loc.faction] || {color:'#888'};
            let ik = this.iconScale();
            let big = (loc.type === 'city' ? 64 : loc.type === 'castle' ? 48 : 32) * ik;
            let icon = loc.type === 'city' ? '🏙️' : loc.type === 'castle' ? '🏰' : '🏘️';

            // Yer gölgesi
            ctx.beginPath();
            ctx.ellipse(loc.x, loc.y + 18, big*0.55, big*0.22, 0, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();

            this.emoji(ctx, icon, loc.x, loc.y + 15, big);

            // Fraksiyon flaması
            let px = loc.x + big*0.42, py = loc.y - big*0.45;
            ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 3 * ik;
            ctx.beginPath(); ctx.moveTo(px, py + 34*ik); ctx.lineTo(px, py - 26*ik); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(px, py - 26*ik); ctx.lineTo(px + 30*ik, py - 17*ik); ctx.lineTo(px, py - 8*ik);
            ctx.closePath();
            ctx.fillStyle = fc.color; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2 * ik; ctx.stroke();

            if(loc.type === 'city' && state.activeTournaments[loc.id]) {
                this.emoji(ctx, '🏆', loc.x - big*0.55, loc.y - 15, 36*ik);
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
        // Ocak ışığı: gradyan tek, şiddeti globalAlpha ile (25 gradyan/kare yerine 0)
        let glow = this.nightGlow();
        if(glow > 0.02 && !this.lite()) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.30 * glow;
            ctx.fillStyle = this.radial(ctx, 110, 'rgba(255,170,70,1)', 'rgba(255,140,50,0)');
            LOCATIONS.forEach(loc => {
                ctx.save(); ctx.translate(loc.x, loc.y);
                ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            });
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }

        // Savaş sisi yok: arazi, yol ve yerleşimler her zaman görünür (Warband gibi).
        // Gizli olan tek şey gruplardır — onlar Game.canSee() ile eleniyor.

        // Sınırlar boyunca sıra dağları çiz
        // 315 sınır noktasının yarısı dağdı: kare başına ~157 emoji rasterleştirmesi.
        // Artık pişmiş sprite basılıyor, hafif modda ayrıca dört noktada bire seyreliyor.
        let mStep = this.lite() ? 4 : 2;
        state.mapBorder.forEach((pt, index) => {
            if(index % mStep === 0) {
                let sz = 42 + ((index * 37) % 24); // düzenli tekrar yerine kırık silüet
                this.emoji(ctx, '🏔️', pt.x, pt.y + 20 + (index % 3) * 6, sz);
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
                scale: (npc.type === 'king' ? 1.15 : 1) * this.partyIconScale(npc.size || 1) * this.iconScale(),
                bob: isMoving ? -Math.abs(Math.sin(performance.now()/150)) * 5 : 0,
                dim: npc.type === 'bandit'
            });

            // Taç: kral/vezir
            if(npc.type === 'king' || npc.type === 'vizier') {
                let cs = npc.type === 'king' ? 30 : 24;
                this.emoji(ctx, npc.type === 'king' ? '👑' : '🎖️', npc.x + 22, npc.y - 44 + cs*0.35, cs);
            }
            
            let shortName = this.npcName(npc).split(' ')[0];
            if(npc.type === 'lord' || npc.type === 'king' || npc.type === 'vizier') {
                shortName = this.npcName(npc).replace(T(' Ordusu'), '').replace(T(' Birliği'), '');
            }
            this.mapLabel(ctx, `${shortName} (${npc.size})`, npc.x, npc.y + 50, '#ffffff', nCol);
        });

        // Player
        // Esirken haritada hareket eden tek taraf seni tutan partidir; senin ayrı bir
        // grubun yoktur. Eskiden oyuncu ikonu + adı + "Esir" yazısı esir alanın ikonu
        // ve etiketiyle aynı noktaya çiziliyordu (üst üste binen metinler).
        let isPrisoner = !!state.player.prisoner;
        if(isPrisoner) {
            this.emoji(ctx, '⛓️', state.player.x - 30, state.player.y - 30, 30);
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
                color: this.bannerColor(),
                scale: 1.35 * this.partyIconScale(state.player.party.length + 1) * this.iconScale(),
                bob: state.player.status === 'moving' ? -Math.abs(Math.sin(performance.now()/150)) * 6 : 0
            });

            this.mapLabel(ctx, `${state.player.name} (${state.player.party.length + 1})`,
                          state.player.x, state.player.y - 72, '#ffcc00', '#ffcc00');
        }

        // Rota (#35): ince akan kesik + küçük dolu hedef işareti. Ok başı kaldırıldı —
        // çizginin kendisi zaten yönü söylüyordu. Sürükleme rotası soluk ve beyazdır,
        // onaylanmış rota altın: hangisinin geçerli olduğu tek bakışta ayrılır.
        let route = (t, live) => {
            let z = this.camera.zoom;
            ctx.save();
            ctx.lineCap = 'round';
            ctx.setLineDash([10 / z, 9 / z]); ctx.lineDashOffset = live ? -(performance.now() / 55) % (19 / z) : 0;
            ctx.strokeStyle = 'rgba(0,0,0,0.30)'; ctx.lineWidth = 3.4 / z;
            ctx.beginPath(); ctx.moveTo(state.player.x, state.player.y); ctx.lineTo(t.x, t.y); ctx.stroke();
            ctx.strokeStyle = live ? 'rgba(255,214,102,0.75)' : 'rgba(240,240,240,0.55)';
            ctx.lineWidth = 1.6 / z;
            ctx.beginPath(); ctx.moveTo(state.player.x, state.player.y); ctx.lineTo(t.x, t.y); ctx.stroke();
            ctx.setLineDash([]);

            // Hedef işareti: ekran boyutunda (uzaklaşınca erimez) küçük dolu nokta + halka
            let r = 6 / z, pulse = live ? 1 + Math.sin(performance.now()/380) * 0.12 : 1.15;
            ctx.fillStyle = live ? 'rgba(255,214,102,0.9)' : 'rgba(240,240,240,0.6)';
            ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = live ? 'rgba(60,40,0,0.55)' : 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.2 / z;
            ctx.stroke();
            ctx.strokeStyle = live ? 'rgba(255,214,102,0.45)' : 'rgba(240,240,240,0.35)';
            ctx.lineWidth = 1.2 / z;
            ctx.beginPath(); ctx.arc(t.x, t.y, r * 2 * pulse, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        };
        if(state.player.targetLocation && state.player.status === 'moving') route(state.player.targetLocation, true);
        if(this.dragTarget) route(this.dragTarget, false);

        // Lordlardan öğrenilen konum işaretleri
        Nobles.drawMarkers(ctx);

        ctx.restore();
    },

    handleMapHover(e) {
        if(Battle.active || TournamentMinigame.active) return;
        // Ekran -> dünya dönüşümü mapPos'ta; künye imlecin yarım ekran uzağını arıyordu.
        let m = this.mapPos(e), mx = m.x, my = m.y;
        if(this.dragTarget) {                       // sürüklerken geçici hedef (#35)
            this.dragTarget.x = mx; this.dragTarget.y = my;
            this.dragTarget.moved = true;
        } else if(state.player.status === 'moving' && state.player.targetLocation
                  && this.dist(state.player.targetLocation, m) < this.targetGrabRadius()) {
            this.mapCanvas.style.cursor = 'grab';
        } else if(this.mapCanvas.style.cursor === 'grab') {
            this.mapCanvas.style.cursor = '';
        }
        let tooltip = document.getElementById('map-tooltip');
        let found = null;

        for(let loc of LOCATIONS) {
            if(this.dist(loc, {x:mx,y:my}) < 36) { found = { name: loc.name, sub: this.locTipHtml(loc) }; break; }
        }
        if(!found) {
            for(let npc of state.npcParties) {
                if(this.dist(npc,{x:mx,y:my}) < 30 && this.canSee(npc)) {
                    found = { name: this.npcName(npc), sub: this.npcTipHtml(npc) };
                    break;
                }
            }
        }
        if(!found) {
            for(let site of (state.sites || [])) {
                if(this.dist(site, {x:mx,y:my}) < 30) {
                    found = { name: this.SITE_KINDS[site.kind].icon + ' ' + site.name, sub: this.siteTipHtml(site) };
                    break;
                }
            }
        }

        if(found) {
            // `rect` bu gövdede tanımlı değildi: yerleşimin üstüne her gelişte
            // ReferenceError atıyor, künye hiç açılmıyordu. Ölçüm mapPos ile aynı kapıdan.
            let rect = this.mapCanvas.getBoundingClientRect();
            tooltip.innerHTML = `<strong>${T(found.name)}</strong><br>${found.sub}`;
            tooltip.style.left = '0px'; tooltip.style.top = '0px';
            tooltip.classList.remove('hidden');
            // Ölçüp içeri al: dar ekranda parmağın sağında künye kadar yer yok (#65)
            let tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
            tooltip.style.left = Math.max(4, Math.min(e.clientX - rect.left + 15, rect.width - tw - 4)) + 'px';
            tooltip.style.top  = Math.max(4, Math.min(e.clientY - rect.top + 15, rect.height - th - 4)) + 'px';
            this.mapCanvas.style.cursor = 'pointer';
        } else {
            tooltip.classList.add('hidden');
            this.mapCanvas.style.cursor = 'crosshair';
        }
    },

    // Ekran -> dünya. Üç yerde (tıklama, künye, sürükleme) aynı dönüşüm vardı.
    mapPos(e) {
        let rect = this.mapCanvas.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) - rect.width/2) / this.camera.zoom + this.camera.x,
            y: ((e.clientY - rect.top) - rect.height/2) / this.camera.zoom + this.camera.y
        };
    },

    // Yüzde işareti Türkçede sayının önünde (%50), İngilizce ve Endonezcede
    // arkasında (50%) durur. `T` şablonuna giren yüzdeleri sözlük hallediyor;
    // bu kapı şablona girmeyen, koda gömülü sayılar içindir.
    pct(n, signed = false) {
        let v = Math.round(n * 10) / 10, sign = signed && v > 0 ? '+' : v < 0 ? '−' : '';
        v = Math.abs(v);
        return I18N.lang === 'tr' ? `${sign}%${v}` : `${sign}${v}%`;
    },

    // --- DİL ---
    // İlk açılışta perde sorar (tarayıcı dili önerilir); seçim localStorage'da
    // durur, bir daha sorulmaz. Sonrasında başlangıç ekranındaki bayrak sırası
    // ve ⚙️ Ayarlar aynı `setLang` kapısından geçer.
    initLang() {
        const saved = I18N.load();
        this.renderLangRow('lang-row');
        if(!saved) {
            const ask = document.getElementById('lang-ask');
            I18N.set(I18N.guess());
            this.renderLangRow('lang-ask-row');
            if(ask) ask.classList.remove('hidden');
        }
        I18N.applyDom(document.body);
        if(saved) this.liteNotice();
    },

    // Hafif mod kendiliğinden açıldıysa oyuncuya bir kez söylenir: sessizce kısılan
    // grafik "oyun neden böyle görünüyor" sorusu doğurur. Cevap ⚙️ Ayarlar'da.
    liteNotice() {
        if(!this.lite() || this.opt('lite') !== 'auto') return;
        try { if(localStorage.getItem('webband_lite_told')) return;
              localStorage.setItem('webband_lite_told', '1'); } catch(e) { return; }
        setTimeout(() => alert(T`📱 Telefon/tablet algılandı — Hafif Mod açıldı.\nDeniz dalgası, orman ağaçları, ocak ışığı ve savaş parçacıkları düşer; hedef 30 fps.\n⚙️ Ayarlar'dan kapatabilirsin.`), 600);
    },

    renderLangRow(id) {
        const el = document.getElementById(id);
        if(!el) return;
        el.innerHTML = I18N.LANGS.map(l =>
            `<button class="lang-btn${l.id === I18N.lang ? ' on' : ''}" onclick="Game.setLang('${l.id}')">
                <span class="lang-flag">${l.flag}</span>${T(l.name)}</button>`).join('');
    },

    setLang(lang) {
        I18N.set(lang);
        const ask = document.getElementById('lang-ask');
        if(ask && !ask.classList.contains('hidden')) { ask.classList.add('hidden'); this.liteNotice(); }
        this.renderLangRow('lang-row');
        this.renderLangRow('lang-ask-row');
        I18N.applyDom(document.body);
        if(document.getElementById('settings-panel')) return this.showSettings();
        // Oyun içindeyken açık ekran kendi metnini yeniden kurar
        const open = document.querySelector('.view.active');
        if(open && document.getElementById('main-ui').classList.contains('active')) {
            this.showScreen(open.id.replace('-view', ''));
            this.updateTopBar();
        }
    },

    // --- DOKUNMATİK (#65) ---
    // Fare ve parmak ayrı kod yolu tutmaz; ikisi de buradan geçer.
    //   fare  : hareket = künye, basılı sürükle = hedef işareti, tık = hedef
    //   parmak: tek parmak = haritayı kaydır, iki parmak = yakınlaştır,
    //           kısa dokunuş = hedef, uzun dokunuş (450 ms) = künye
    _ptr: new Map(),          // pointerId -> { x, y, t, moved }
    _pinch: 0,

    isTouch() {
        return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    },

    ptrGap() {
        let a = [...this._ptr.values()];
        return a.length < 2 ? 0 : Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
    },

    onMapDown(e) {
        if(e.pointerType === 'mouse') return this.startTargetDrag(e);
        this._ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 });
        try { this.mapCanvas.setPointerCapture(e.pointerId); } catch(_) {}
        // İkinci parmak yakınlaştırmadır: yarım kalan hedef sürüklemesi iptal olur
        if(this._ptr.size > 1) { this.dragTarget = null; this._pinch = this.ptrGap(); }
        else this.startTargetDrag(e);
    },

    onMapMove(e) {
        if(e.pointerType === 'mouse') return this.handleMapHover(e);
        let p = this._ptr.get(e.pointerId);
        if(!p) return;
        let dx = e.clientX - p.x, dy = e.clientY - p.y;
        p.x = e.clientX; p.y = e.clientY; p.moved += Math.hypot(dx, dy);
        if(this._ptr.size > 1) {
            let gap = this.ptrGap();
            if(this._pinch > 0 && gap > 0) {
                this.camera.targetZoom = Math.max(this.minZoom(), Math.min(3.0, this.camera.targetZoom * gap / this._pinch));
            }
            this._pinch = gap;
        } else if(this.dragTarget) {
            this.handleMapHover(e);                       // işaret parmağın altında taşınır
        } else {
            // Kaydırma yalnız offset'i oynatır (WASD ile aynı kapı), ±9000 sınırı update'te
            this.camera.offsetX -= dx / this.camera.zoom;
            this.camera.offsetY -= dy / this.camera.zoom;
        }
    },

    onMapUp(e) {
        // Fare: ayrı bir 'click' dinleyicisi yok (#65) — tıklamayı pointerup taşır.
        // endTargetDrag gerçek sürüklemede suppressClick kurar, handleMapClick onu yer.
        if(e.pointerType === 'mouse') {
            if(e.button !== 0) return;
            this.endTargetDrag(e);
            return this.handleMapClick(e);
        }
        let p = this._ptr.get(e.pointerId);
        this._ptr.delete(e.pointerId);
        if(this._ptr.size < 2) this._pinch = 0;
        if(!p) return;
        if(this.dragTarget) return this.endTargetDrag(e);
        if(p.moved > 10 || this._ptr.size) return;        // kaydırma/yakınlaştırma hedef atamaz
        if(performance.now() - p.t > 450) return this.handleMapHover(e);   // uzun dokunuş: künye
        document.getElementById('map-tooltip').classList.add('hidden');
        this.handleMapClick(e);
    },

    // Savaşta sanal çubuk: parmağın yönü WASD'ye çevrilir, yani savaş motoru
    // hâlâ tek giriş yolu görür (`Input.keys`). Nişan da aynı yönden okunur —
    // parmakla oynarken fare imleci diye bir şey yok.
    initTouchUI() {
        let st = document.getElementById('tstick'), knob = document.getElementById('tstick-knob');
        if(!st) return;
        const R = 42;
        let id = null, cx = 0, cy = 0;
        const set = (dx, dy) => {
            let len = Math.hypot(dx, dy);
            if(len < 12) {
                ['w', 'a', 's', 'd'].forEach(k => Input.keys[k] = false);
                knob.style.transform = '';
                return;                                   // yön korunur: bırakınca nişan dönmesin
            }
            let nx = dx / len, ny = dy / len;
            Input.stick = { x: nx, y: ny };
            Input.keys['a'] = nx < -0.38; Input.keys['d'] = nx > 0.38;
            Input.keys['w'] = ny < -0.38; Input.keys['s'] = ny > 0.38;
            let c = Math.min(1, len / R);
            knob.style.transform = `translate(${(nx * R * c).toFixed(1)}px, ${(ny * R * c).toFixed(1)}px)`;
        };
        st.addEventListener('pointerdown', e => {
            e.preventDefault(); id = e.pointerId;
            try { st.setPointerCapture(id); } catch(_) {}
            let r = st.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
            set(e.clientX - cx, e.clientY - cy);
        });
        st.addEventListener('pointermove', e => { if(e.pointerId === id) set(e.clientX - cx, e.clientY - cy); });
        const off = e => { if(e.pointerId === id) { id = null; set(0, 0); } };
        st.addEventListener('pointerup', off);
        st.addEventListener('pointercancel', off);

        let at = document.getElementById('tb-attack'), bl = document.getElementById('tb-block');
        at.addEventListener('pointerdown', e => { e.preventDefault(); Battle.playerAttack(); });
        bl.addEventListener('pointerdown', e => { e.preventDefault(); Battle.blockHeld = true; bl.classList.add('on'); });
        const blOff = () => { Battle.blockHeld = false; bl.classList.remove('on'); };
        bl.addEventListener('pointerup', blOff);
        bl.addEventListener('pointercancel', blOff);

        // Künye dokunmayla açılır: `:hover` parmakta yoktur (#65)
        document.addEventListener('pointerdown', e => {
            if(e.pointerType === 'mouse') return;
            let c = e.target.closest && e.target.closest('.tooltip-container');
            document.querySelectorAll('.tooltip-container.tip-open').forEach(o => { if(o !== c) o.classList.remove('tip-open'); });
            if(!c) return;
            c.classList.toggle('tip-open');
            if(c.classList.contains('tip-open')) this.clampTip(c);
        });
    },

    // Savaş emirleri (1/2/3) parmakla: dinleyici zaten klavyede, olayı ona veriyoruz
    touchCommand(key) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    },

    // --- HEDEF İŞARETİNİ SÜRÜKLEME (#35) ---
    // İşaretin yarıçapı ekran boyutundadır (16 px), yani uzaklaşınca da tutulabilir.
    targetGrabRadius() { return 16 / this.camera.zoom + 6; },

    startTargetDrag(e) {
        if(e.button !== 0 || Battle.active || TournamentMinigame.active) return;
        if(state.player.status !== 'moving' || !state.player.targetLocation) return;
        let m = this.mapPos(e);
        if(this.dist(state.player.targetLocation, m) > this.targetGrabRadius()) return;
        this.dragTarget = { x: m.x, y: m.y, moved: false };
        this.mapCanvas.style.cursor = 'grabbing';
    },

    endTargetDrag(e) {
        if(!this.dragTarget) return;
        let moved = this.dragTarget.moved;
        this.dragTarget = null;
        this.mapCanvas.style.cursor = '';
        if(!moved) return;                        // yerinde bırakıldı: rota aynı kalsın
        this.setTarget(this.mapPos(e));
        this.suppressClick = true;                // mouseup'ın ardından gelen click yeni hedef atamasın
    },

    // Tıklama ve sürükleme aynı hedef seçimini kullanır: yerleşim/NPC yakınsa ona kilitlenir.
    setTarget(m) {
        for(let loc of LOCATIONS) {
            if(this.dist(loc, m) < 36) { state.player.targetLocation = loc; state.player.status = 'moving'; return; }
        }
        for(let npc of state.npcParties) {
            if(this.dist(npc, m) < 30 && this.canSee(npc)) {
                state.player.targetLocation = { ...npc, isNpc: true }; state.player.status = 'moving'; return;
            }
        }
        for(let site of (state.sites || [])) {
            if(this.dist(site, m) < 30) { state.player.targetLocation = site; state.player.status = 'moving'; return; }
        }
        state.player.targetLocation = { x: m.x, y: m.y, name: T('Hedef Bölge'), type: null };
        state.player.status = 'moving';
    },

    handleMapClick(e) {
        if(Battle.active || TournamentMinigame.active) return;   // savaş açıkken harita girdisi yok sayılır (#42)
        // Esaret gibi yağma da yerinde tutar: ambarı boşaltırken yürüyemezsin (#49)
        if(state.player.status === 'raiding' || state.player.status === 'prisoner') return;
        if(this.suppressClick) { this.suppressClick = false; return; }
        this.setTarget(this.mapPos(e));   // yerleşim / NPC / boş alan ayrımı setTarget'ta
    },

    // --- SETTLEMENT ---
    enterLocation(loc) {
        if(loc.type === 'site') return this.enterSite(loc);   // keşif noktası (#58): ekran değil modal
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('settlement-view').classList.add('active');
        document.getElementById('settlement-name').innerText = loc.name + (loc.type==='city'?T(' (Şehir)'):loc.type==='castle'?T(' (Kale)'):T(' (Köy)'));
        let ac = document.getElementById('settlement-actions');
        ac.innerHTML = '';

        // Kapılar yalnızca savaşta olduğun krallığa kapalıdır (Warband'daki gibi);
        // barıştaki komşunun şehrinde pazar ve han sana açık.
        let isEnemy = this.atWar(this.playerFaction(), loc.faction);

        Quests.emit('entered_location', { locId: loc.id, loc });

        if(isEnemy && (loc.type==='city'||loc.type==='castle')) {
            // Düşman kapısında hiçbir sivil hizmet yok: pazar, han, salon, gönüllü — hepsi kapalı.
            // Bağımsızsan aynı kuşatma kendi krallığını kurar, iki ayrı düğme çıkmaz.
            this.addBtn(ac, state.player.vassalOf ? T('⚔️ Kuşatma Kampı Kur') : T('⚔️ Kuşat! (Kendi Krallığını Kur)'),
                        () => this.besiegeLocation(loc, !state.player.vassalOf));
        } else {
            let chickenQ = state.player.quests.find(q => q.id === 'crazy_chickens' && q.data.locId === loc.id);
            if(chickenQ) this.addBtn(ac, T('🐔 Tavukları Kovala (15 sn)'), () => TournamentMinigame.start({ mode:'chicken', goal:8, time:15 }));
            if(loc.owner === 'player' && loc.type !== 'village') {
                this.addBtn(ac, T`🛡️ Garnizon (${(loc.garrison || []).length} asker)`, () => this.openGarrison(loc));
                this.addBtn(ac, T`📦 Depo (${(loc.storage || []).length} kalem)`, () => this.openStorage(loc));
            }
            if(loc.type === 'city') {
                this.addBtn(ac, T('🛒 Pazara Git'), () => this.openMarket(loc));
                // İşletme: 20. günün "bu parayla ne yapayım" cevabı (#53 madde 1.6)
                this.addBtn(ac, loc.enterprise
                    ? T`🏭 İşletmen (+${this.enterpriseIncome(loc)} dinar/gün)`
                    : T`🏭 İşletme Satın Al (${this.ENTERPRISE_COST} dinar)`, () => this.buyEnterprise(loc));
                this.addBtn(ac, T('🍺 Hana Gir'), () => this.openTavern(loc));
                this.addBtn(ac, T('⛓️ Köle Tüccarı'), () => this.openSlaveTrader());
                this.addBtn(ac, T('🤺 Arenada Dövüş'), () => this.openArena(loc));
                if(state.activeTournaments[loc.id]) {
                    this.addBtn(ac, T('🏆 Turnuvaya Katıl'), () => this.joinTournament(loc));
                }
                this.addBtn(ac, T('👑 Lordlar Salonuna Git'), () => Nobles.openHall(loc));
                if(state.feast && state.feast.locId === loc.id) {
                    this.addBtn(ac, T('🍷 Şölene Katıl'), () => Feast.open(loc));
                } else if(state.player.vassalOf && loc.faction === state.player.vassalOf) {
                    this.addBtn(ac, T('🍷 Şölen Ver (3000 Dinar + 30 et/peynir)'), () => Feast.host(loc));
                }
                if(loc.volunteersAvailable > 0) {
                    this.addBtn(ac, T('🪖 Gönüllü Topla'), () => this.recruitVolunteers(loc));
                }
            } else if(loc.type === 'castle') {
                this.addBtn(ac, T('👑 Lordlar Salonuna Git'), () => Nobles.openHall(loc));
                if(state.feast && state.feast.locId === loc.id) {
                    this.addBtn(ac, T('🍷 Şölene Katıl'), () => Feast.open(loc));
                }
            } else if(loc.type === 'village') {
                // Düşman köyü sana ne asker ne erzak verir — ama söyleyecek iki çift lafı vardır (#50)
                this.addBtn(ac, T('🧓 Köy Yaşlısıyla Konuş'), () => this.talkToElder(loc));
                // Küfrettiği adama peynir de satmaz: yağmaladığın köy hizmet vermez (#50)
                if(!isEnemy && !this.raidedRecently(loc)) {
                    if(loc.volunteersAvailable > 0) {
                        this.addBtn(ac, T('🪖 Gönüllü Topla'), () => this.recruitVolunteers(loc));
                    }
                    this.addBtn(ac, T('🛒 Erzak Al'), () => this.openMarket(loc));
                }
                this.addBtn(ac, T('🔥 Köyü Yağmala'), () => this.raidVillage(loc));
            }
        }
        if(!isEnemy && !state.player.vassalOf && (loc.type==='city'||loc.type==='castle')) {
            this.addBtn(ac, T('⚔️ Kuşat! (Kendi Krallığını Kur)'), () => this.besiegeLocation(loc, true));
        }
        this.addBtn(ac, T('🚪 Ayrıl'), () => this.showScreen('map'));
        this.renderScene(loc);   // düğmeler hazır: sahne onların üstüne kurulur (#60)
    },

    // ---------- YERLEŞİM SAHNESİ (#60) ----------
    // Sahnenin ayrı bir nokta tablosu yok: yerleşim ekranındaki düğmelerin kendisi
    // bina olarak çizilir. addBtn tek kapı olduğu için yarın eklenen bir düğme
    // sahnede kendiliğinden bir yapı olur — iki listeyi senkron tutmak gerekmez.
    // Düğmenin ikonundan yapı türü seçilir; tanımadığı ikon eve düşer.
    SCENE_W: 900, SCENE_H: 280,
    SCENE_KIND: {
        '👑': 'tower', '🛡️': 'tower', '🏆': 'tower',
        '🍺': 'house', '🧓': 'house', '⛓️': 'house', '🏭': 'shop', '📦': 'barn',
        '🛒': 'stall', '🍷': 'stall', '🪖': 'tent', '⚔️': 'tent',
        '🤺': 'ring', '🔥': 'fire', '🐔': 'coop', '🚪': 'gate'
    },
    sceneIcon(text) {
        let m = String(text).match(/(\p{Extended_Pictographic}️?)/u);
        return m ? m[1] : '';
    },
    sceneKind(icon) {
        return this.SCENE_KIND[icon] || this.SCENE_KIND[icon.replace('️', '')] || 'house';
    },
    // Yerleşimin kimliğinden türeyen sabit rastgelelik: aynı şehir her zaman aynı silueti alır
    sceneRnd(loc, i) {
        let str = String(loc.id) + '|' + i, h = 0;
        for(let k = 0; k < str.length; k++) h = (h * 131 + str.charCodeAt(k)) % 1000003;
        return h / 1000003;
    },

    renderScene(loc) {
        let cv = document.getElementById('scene-canvas');
        if(!cv) return;
        let btns = [...document.getElementById('settlement-actions').children];
        this._sceneLoc = loc;
        this._sceneBtns = btns;
        this.sceneHot = [];
        this.drawScene(cv.getContext('2d'), loc, btns, -1);
        cv.onmousemove = e => {
            let r = cv.getBoundingClientRect();
            let x = (e.clientX - r.left) * cv.width / r.width, y = (e.clientY - r.top) * cv.height / r.height;
            let i = this.sceneHot.findIndex(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
            if(i === this._sceneHover) return;                 // yalnız değişimde yeniden çiz
            this._sceneHover = i;
            cv.style.cursor = i >= 0 ? 'pointer' : 'default';
            this.drawScene(cv.getContext('2d'), loc, btns, i);
        };
        cv.onmouseleave = () => { this._sceneHover = -1; this.drawScene(cv.getContext('2d'), loc, btns, -1); };
        cv.onclick = () => {
            let h = this.sceneHot[this._sceneHover];
            if(h) h.btn.onclick();                             // düğmenin kendi eylemi — ikinci bir tablo yok
        };
    },

    drawScene(ctx, loc, btns, hover) {
        let W = this.SCENE_W, H = this.SCENE_H, R = i => this.sceneRnd(loc, i);
        let hour = state.time.hour, night = hour < 6 || hour >= 20, dusk = (hour >= 18 && hour < 20) || (hour >= 6 && hour < 8);
        let col = (FACTIONS[loc.faction] || {}).color || '#ffcc00';
        let ground = H * 0.66;
        ctx.clearRect(0, 0, W, H);

        // Gökyüzü — günün vaktine göre
        let sky = ctx.createLinearGradient(0, 0, 0, ground);
        if(night) { sky.addColorStop(0, '#0b1027'); sky.addColorStop(1, '#2b3355'); }
        else if(dusk) { sky.addColorStop(0, '#38406e'); sky.addColorStop(0.6, '#c9743c'); sky.addColorStop(1, '#e8b473'); }
        else { sky.addColorStop(0, '#6ea6dd'); sky.addColorStop(1, '#cfe0ea'); }
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, ground + 2);
        if(night) {                                            // yıldızlar
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            for(let i = 0; i < 40; i++) ctx.fillRect(R(i) * W, R(i + 100) * ground * 0.7, 1.6, 1.6);
        }
        ctx.fillStyle = night ? 'rgba(226,232,255,0.9)' : dusk ? 'rgba(255,196,120,0.95)' : 'rgba(255,246,214,0.95)';
        ctx.beginPath(); ctx.arc(90 + R(5) * (W - 180), 46 + R(6) * 24, night ? 16 : 22, 0, 7); ctx.fill();

        // Uzak tepeler (iki kat)
        for(let layer = 0; layer < 2; layer++) {
            ctx.fillStyle = night ? (layer ? '#1b2138' : '#141a2e') : (layer ? '#8fa07d' : '#6f8064');
            ctx.beginPath(); ctx.moveTo(0, ground);
            for(let x = 0; x <= W; x += 60) {
                let k = layer * 50 + x / 60;
                ctx.lineTo(x, ground - 30 - layer * 18 - R(k) * 45);
            }
            ctx.lineTo(W, ground); ctx.closePath(); ctx.fill();
        }

        // Arka plan: şehirde sur, kalede burçlu duvar, köyde çit ve tarla
        this.drawBackdrop(ctx, loc, ground, night, col, R);

        // Zemin
        let gr = ctx.createLinearGradient(0, ground, 0, H);
        gr.addColorStop(0, night ? '#2a2a22' : '#6b6a4a'); gr.addColorStop(1, night ? '#171712' : '#4a4a33');
        ctx.fillStyle = gr; ctx.fillRect(0, ground, W, H - ground);
        ctx.fillStyle = night ? 'rgba(120,110,80,0.25)' : 'rgba(190,175,130,0.45)';   // toprak yol
        ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W, H); ctx.lineTo(W, H - 34); ctx.lineTo(0, H - 22); ctx.fill();

        // Yapılar: çift sıra (tek indisler arkada, çiftler önde)
        this.sceneHot = [];
        let back = btns.filter((_, i) => i % 2 === 1), front = btns.filter((_, i) => i % 2 === 0);
        let rows = [
            { list: back, base: ground + 14, w: 96, h: 66, dim: 0.82 },
            { list: front, base: H - 16, w: 122, h: 88, dim: 1 }
        ];
        rows.forEach((row, ri) => {
            let n = row.list.length || 1, step = (W - 60) / n;
            row.list.forEach((btn, i) => {
                let x = 30 + i * step + (step - row.w) / 2 + (R(ri * 20 + i) - 0.5) * 14;
                let y = row.base - row.h;
                let icon = this.sceneIcon(btn.innerHTML);
                let idx = btns.indexOf(btn);
                this.sceneHot[idx] = { x, y, w: row.w, h: row.h, btn, icon, label: btn.innerText };
                this.drawStructure(ctx, this.sceneKind(icon), x, y, row.w, row.h, col, icon, night, row.dim, hover === idx);
            });
        });

        // Künye: imlecin altındaki yapının adı
        if(hover >= 0 && this.sceneHot[hover]) {
            let h = this.sceneHot[hover], txt = h.label.trim();
            ctx.font = 'bold 17px Inter, sans-serif';
            let tw = ctx.measureText(txt).width, bx = Math.max(6, Math.min(W - tw - 26, h.x + h.w / 2 - tw / 2 - 10));
            let by = Math.max(4, h.y - 34);
            ctx.fillStyle = 'rgba(10,10,14,0.88)';
            ctx.strokeStyle = col; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.roundRect(bx, by, tw + 20, 28, 6); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(txt, bx + 10, by + 15);
        }
    },

    drawBackdrop(ctx, loc, ground, night, col, R) {
        let W = this.SCENE_W;
        let wallTop = ground - 92, stone = night ? '#3a3a44' : '#8b8578';
        if(loc.type === 'village') {
            // Tarla şeritleri + çit
            ctx.fillStyle = night ? '#3a3a26' : '#9a8f4e';
            for(let i = 0; i < 5; i++) ctx.fillRect(i * 190 + R(i) * 20, ground - 26, 150, 22);
            ctx.strokeStyle = night ? '#3d3327' : '#7a6042'; ctx.lineWidth = 3;
            for(let x = 10; x < W; x += 34) {
                ctx.beginPath(); ctx.moveTo(x, ground - 4); ctx.lineTo(x, ground - 26); ctx.stroke();
            }
            ctx.beginPath(); ctx.moveTo(0, ground - 18); ctx.lineTo(W, ground - 18); ctx.stroke();
            return;
        }
        // Sur duvarı: şehirde uzun ve mazgallı, kalede daha kalın + arkada donjon
        if(loc.type === 'castle') {
            let kx = 60 + R(9) * (W - 320), kw = 190, kh = 165;
            ctx.fillStyle = night ? '#2e2e38' : '#7d7768';
            ctx.fillRect(kx, wallTop - kh + 40, kw, kh);
            ctx.fillStyle = night ? '#232630' : '#6b6558';
            for(let i = 0; i < 5; i++) ctx.fillRect(kx + i * 40, wallTop - kh + 26, 26, 16);   // mazgal
            ctx.fillStyle = col;                                                              // sancak
            ctx.fillRect(kx + kw / 2 - 1, wallTop - kh - 26, 2, 30);
            ctx.beginPath(); ctx.moveTo(kx + kw / 2 + 1, wallTop - kh - 24);
            ctx.lineTo(kx + kw / 2 + 36, wallTop - kh - 16); ctx.lineTo(kx + kw / 2 + 1, wallTop - kh - 8); ctx.fill();
        } else {
            // Şehir silueti: arka planda çatılar, kuleler (sayısı ve yeri yerleşime göre sabit)
            let houses = 7 + Math.floor(R(3) * 6);
            for(let i = 0; i < houses; i++) {
                let x = R(i + 30) * (W - 80), w = 54 + R(i + 60) * 46, h = 52 + R(i + 90) * 60;
                let top = wallTop + 14 - h;                      // çatılar surun üstünden görünür
                ctx.fillStyle = night ? '#22262f' : '#5f5c50';
                ctx.fillRect(x, top, w, h);
                ctx.fillStyle = night ? '#15181f' : '#47372c';
                ctx.beginPath(); ctx.moveTo(x - 6, top); ctx.lineTo(x + w / 2, top - 26); ctx.lineTo(x + w + 6, top); ctx.fill();
                if(night) {                                     // pencerelerde ocak ışığı
                    ctx.fillStyle = 'rgba(255,196,90,0.75)';
                    ctx.fillRect(x + w * 0.3, top + 16, 7, 9);
                    if(R(i + 120) > 0.5) ctx.fillRect(x + w * 0.62, top + 16, 7, 9);
                }
            }
        }
        // Sur + kapı
        ctx.fillStyle = stone; ctx.fillRect(0, wallTop, W, 92);
        ctx.fillStyle = night ? '#2c2c34' : '#6f6a5e';
        for(let x = 4; x < W; x += 34) ctx.fillRect(x, wallTop - 12, 20, 14);      // mazgallar
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, wallTop + 72, W, 20);  // gölge bandı
        let gx = 120 + R(7) * (W - 320);
        ctx.fillStyle = night ? '#16161c' : '#3b2f22';
        ctx.beginPath(); ctx.moveTo(gx, ground); ctx.lineTo(gx, wallTop + 44);
        ctx.arc(gx + 28, wallTop + 44, 28, Math.PI, 0); ctx.lineTo(gx + 56, ground); ctx.fill();
        ctx.fillStyle = col; ctx.fillRect(gx - 26, wallTop - 10, 3, 40);           // kapının yanında sancak
        ctx.beginPath(); ctx.moveTo(gx - 23, wallTop - 8); ctx.lineTo(gx - 2, wallTop - 1); ctx.lineTo(gx - 23, wallTop + 6); ctx.fill();
    },

    // Tek çizim primitifi: tür siluetin şeklini, ikon tabelayı verir.
    drawStructure(ctx, kind, x, y, w, h, col, icon, night, dim, hot) {
        ctx.save();
        if(hot) { ctx.shadowColor = 'rgba(255,204,0,0.9)'; ctx.shadowBlur = 22; }
        let wood = night ? '#2f2418' : '#6b4f31', wall = night ? '#39332a' : `rgb(${Math.round(168*dim)},${Math.round(150*dim)},${Math.round(120*dim)})`;
        let roof = night ? '#241d16' : `rgb(${Math.round(122*dim)},${Math.round(70*dim)},${Math.round(48*dim)})`;
        let lit = 'rgba(255,196,90,0.85)';
        ctx.fillStyle = 'rgba(0,0,0,0.28)';                       // zemin gölgesi
        ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 3, w * 0.52, 7, 0, 0, 7); ctx.fill();

        if(kind === 'tower') {
            ctx.fillStyle = wall; ctx.fillRect(x + w * 0.22, y, w * 0.56, h);
            ctx.fillStyle = roof;
            for(let i = 0; i < 4; i++) ctx.fillRect(x + w * 0.22 + i * w * 0.15, y - 9, w * 0.1, 10);
            ctx.fillStyle = night ? lit : 'rgba(40,35,28,0.8)';
            ctx.fillRect(x + w * 0.42, y + h * 0.34, w * 0.16, h * 0.2);
            ctx.fillStyle = col; ctx.fillRect(x + w * 0.5, y - 34, 2, 26);
            ctx.beginPath(); ctx.moveTo(x + w * 0.52, y - 32); ctx.lineTo(x + w * 0.82, y - 25); ctx.lineTo(x + w * 0.52, y - 18); ctx.fill();
        } else if(kind === 'stall') {
            ctx.fillStyle = wood; ctx.fillRect(x + 6, y + h * 0.35, 5, h * 0.65); ctx.fillRect(x + w - 11, y + h * 0.35, 5, h * 0.65);
            for(let i = 0; i < 5; i++) {                          // çizgili tente
                ctx.fillStyle = i % 2 ? '#c94f3d' : '#e8ded0';
                ctx.fillRect(x + i * w / 5, y + h * 0.28, w / 5, h * 0.16);
            }
            ctx.fillStyle = wood; ctx.fillRect(x + 10, y + h * 0.62, w - 20, h * 0.14);
            ctx.fillStyle = night ? '#3a2f22' : '#8a6c46';
            ctx.fillRect(x + 16, y + h * 0.78, 22, 18); ctx.fillRect(x + w - 44, y + h * 0.78, 22, 18);
        } else if(kind === 'tent') {
            ctx.fillStyle = night ? '#2c2c26' : '#ddd2b4';
            ctx.beginPath(); ctx.moveTo(x + w / 2, y + h * 0.1); ctx.lineTo(x + 4, y + h); ctx.lineTo(x + w - 4, y + h); ctx.fill();
            ctx.fillStyle = night ? '#191913' : '#4a4436';
            ctx.beginPath(); ctx.moveTo(x + w / 2, y + h * 0.45); ctx.lineTo(x + w / 2 - 13, y + h); ctx.lineTo(x + w / 2 + 13, y + h); ctx.fill();
            ctx.fillStyle = col; ctx.fillRect(x + w / 2 - 1, y - 12, 2, 22);
            ctx.beginPath(); ctx.moveTo(x + w / 2 + 1, y - 11); ctx.lineTo(x + w / 2 + 20, y - 6); ctx.lineTo(x + w / 2 + 1, y - 1); ctx.fill();
        } else if(kind === 'ring') {
            ctx.fillStyle = night ? '#2a2118' : '#8e6c44';
            ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.72, w * 0.48, h * 0.3, 0, 0, 7); ctx.fill();
            ctx.fillStyle = night ? '#3a2f22' : '#b08a58';
            ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.66, w * 0.42, h * 0.24, 0, 0, 7); ctx.fill();
            ctx.strokeStyle = wood; ctx.lineWidth = 4;            // palisad kazıkları
            for(let i = 0; i < 10; i++) {
                let a = i / 10 * Math.PI * 2, px = x + w / 2 + Math.cos(a) * w * 0.45, py = y + h * 0.72 + Math.sin(a) * h * 0.3;
                ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 16); ctx.stroke();
            }
        } else if(kind === 'fire') {
            ctx.fillStyle = wood; ctx.fillRect(x + w / 2 - 16, y + h * 0.6, 32, h * 0.4);
            ctx.fillStyle = '#e8622a';
            ctx.beginPath(); ctx.moveTo(x + w / 2, y + h * 0.18); ctx.lineTo(x + w / 2 - 20, y + h * 0.62); ctx.lineTo(x + w / 2 + 20, y + h * 0.62); ctx.fill();
            ctx.fillStyle = '#ffcc44';
            ctx.beginPath(); ctx.moveTo(x + w / 2, y + h * 0.34); ctx.lineTo(x + w / 2 - 10, y + h * 0.62); ctx.lineTo(x + w / 2 + 10, y + h * 0.62); ctx.fill();
        } else if(kind === 'gate') {
            ctx.fillStyle = night ? '#33333c' : '#8b8578'; ctx.fillRect(x, y + h * 0.1, w, h * 0.9);
            ctx.fillStyle = night ? '#16161c' : '#3b2f22';
            ctx.beginPath(); ctx.moveTo(x + w * 0.28, y + h); ctx.lineTo(x + w * 0.28, y + h * 0.42);
            ctx.arc(x + w / 2, y + h * 0.42, w * 0.22, Math.PI, 0); ctx.lineTo(x + w * 0.72, y + h); ctx.fill();
        } else {
            // house / shop / barn / coop — gövde + çatı, farkı bacada ve kapıda
            let bh = kind === 'barn' ? h * 0.68 : h * 0.62, by = y + h - bh;
            ctx.fillStyle = wall; ctx.fillRect(x + 6, by, w - 12, bh);
            ctx.fillStyle = roof;
            ctx.beginPath(); ctx.moveTo(x - 2, by); ctx.lineTo(x + w / 2, by - h * 0.34); ctx.lineTo(x + w + 2, by); ctx.fill();
            ctx.fillStyle = night ? '#241d16' : '#4a3524';        // kapı
            let dw = kind === 'barn' ? w * 0.36 : w * 0.2;
            ctx.fillRect(x + w / 2 - dw / 2, y + h - bh * 0.62, dw, bh * 0.62);
            ctx.fillStyle = night ? lit : 'rgba(70,90,110,0.7)';  // pencere
            ctx.fillRect(x + 14, by + bh * 0.22, 13, 12);
            ctx.fillRect(x + w - 27, by + bh * 0.22, 13, 12);
            if(kind === 'shop') {                                  // atölye bacası + duman
                ctx.fillStyle = roof; ctx.fillRect(x + w * 0.72, by - h * 0.28, 12, h * 0.3);
                ctx.fillStyle = 'rgba(200,200,200,0.35)';
                for(let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + w * 0.78, by - h * 0.34 - i * 11, 5 + i * 2, 0, 7); ctx.fill(); }
            }
            if(kind === 'coop') { ctx.fillStyle = wood; for(let i = 0; i < 5; i++) ctx.fillRect(x + 4 + i * (w - 8) / 5, y + h - 14, 3, 14); }
        }

        // Tabela: düğmenin ikonu binanın üstünde durur, hangi kapı olduğu bir bakışta belli
        ctx.shadowBlur = 0;
        if(icon) {
            ctx.fillStyle = hot ? 'rgba(255,204,0,0.95)' : 'rgba(12,12,16,0.8)';
            ctx.strokeStyle = hot ? '#fff' : 'rgba(255,204,0,0.55)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.roundRect(x + w / 2 - 17, y - (kind === 'tower' ? 56 : 26), 34, 26, 6); ctx.fill(); ctx.stroke();
            ctx.font = '17px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(icon, x + w / 2, y - (kind === 'tower' ? 42 : 12));
        }
        ctx.restore();
    },

    // --- İÇ MEKÂN ARKA PLANI (#60) ---
    // Kaleye/hana girince modalin arkasında o mekân durur. Tek seferlik çizim, data URL
    // olarak önbelleklenir; `showModal`'ın üçüncü argümanı (bgImage) zaten hazırdı.
    BG_DRAW: {
        hall:      ['drawHallBg', 640, 380],
        tavern:    ['drawTavernBg', 640, 380],
        armory:    ['drawArmoryBg', 900, 560],     // karakter ekranı (#61)
        camp:      ['drawCampBg', 900, 560],       // grup ekranı
        storage:   ['drawStorageBg', 900, 560],    // envanter
        parchment: ['drawParchmentBg', 900, 560]   // görevler
    },
    sceneBg(kind) {
        // Hafif mod: her ekranın zemini bir kez çizilip JPEG'e kodlanıyor (ölçüldü:
        // ekran başına 8-12 ms + 27-37 KB). Telefonda bu, ekran her açılışında
        // hissedilen bir takılma. null dönünce çağıranlar perdeyi tek başına kullanır.
        if(this.lite()) return null;
        this._sceneBg = this._sceneBg || {};
        if(this._sceneBg[kind]) return this._sceneBg[kind];
        let [fn, W, H] = this.BG_DRAW[kind] || this.BG_DRAW.tavern;
        let cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        this[fn](cv.getContext('2d'), W, H);
        return (this._sceneBg[kind] = cv.toDataURL('image/jpeg', 0.82));
    },
    // Menü ekranlarına tematik zemin (#61). Tek kapı `showScreen`; her ekrana bir kez konur,
    // sonrası CSS. Perde koyu tutulur — zemin metinle yarışmaz.
    // Perde koyuluğu ekrana göre: parşömen açık renk olduğu için daha ince perde yeter,
    // koyu çizimler (cephanelik, kamp, ambar) altında yazı için daha kalın perde gerekir.
    VIEW_BG: {
        character: ['armory', 0.74, 0.88],
        party:     ['camp', 0.72, 0.88],
        inventory: ['storage', 0.70, 0.86],
        quests:    ['parchment', 0.60, 0.78]
    },
    applyViewBg(id) {
        let cfg = this.VIEW_BG[id], el = document.getElementById(id + '-view');
        if(!cfg || !el || el.dataset.bg) return;
        let [kind, a0, a1] = cfg;
        el.dataset.bg = kind;
        let img = this.sceneBg(kind);
        el.style.backgroundImage = `linear-gradient(rgba(10,10,14,${a0}), rgba(10,10,14,${a1}))`
            + (img ? `, url('${img}')` : '');
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center top';
    },
    // Karakter: cephanelik duvarı — taş, asılı kalkan, çapraz kılıç, miğfer, sancak
    drawArmoryBg(ctx, W, H) {
        let g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#33343a'); g.addColorStop(1, '#1e1f24');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        for(let y = 0, r = 0; y < H; y += 34, r++)
            for(let x = (r % 2 ? -34 : 0); x < W; x += 68) {
                ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, 68, 34);
            }
        // Çapraz kılıçlar
        ctx.save(); ctx.translate(W * 0.5, H * 0.42);
        [-0.5, 0.5].forEach(a => {
            ctx.save(); ctx.rotate(a);
            ctx.fillStyle = '#8d939c'; ctx.fillRect(-9, -190, 18, 300);
            ctx.fillStyle = '#c9ced6'; ctx.fillRect(-9, -190, 6, 300);
            ctx.fillStyle = '#6a4a24'; ctx.fillRect(-40, 105, 80, 14); ctx.fillRect(-8, 119, 16, 56);
            ctx.restore();
        });
        ctx.restore();
        // Kalkan
        let sx = W * 0.5, sy = H * 0.5;
        ctx.fillStyle = '#5c2630';
        ctx.beginPath(); ctx.moveTo(sx - 78, sy - 90); ctx.lineTo(sx + 78, sy - 90);
        ctx.lineTo(sx + 78, sy + 20); ctx.quadraticCurveTo(sx, sy + 130, sx - 78, sy + 20); ctx.fill();
        ctx.strokeStyle = '#8a7130'; ctx.lineWidth = 7; ctx.stroke();
        ctx.fillStyle = 'rgba(212,175,55,0.55)'; ctx.beginPath(); ctx.arc(sx, sy - 10, 26, 0, 7); ctx.fill();
        // Yan sancaklar
        [W * 0.14, W * 0.86].forEach((bx, i) => {
            ctx.fillStyle = i ? '#25406f' : '#4a2a5e';
            ctx.beginPath(); ctx.moveTo(bx - 44, 0); ctx.lineTo(bx + 44, 0);
            ctx.lineTo(bx + 44, H * 0.6); ctx.lineTo(bx, H * 0.55); ctx.lineTo(bx - 44, H * 0.6); ctx.fill();
        });
        // Miğfer rafı
        ctx.fillStyle = '#3a2b1a'; ctx.fillRect(0, H - 96, W, 16);
        [W * 0.22, W * 0.78].forEach(hx => {
            ctx.fillStyle = '#9aa1aa';
            ctx.beginPath(); ctx.arc(hx, H - 122, 30, Math.PI, 0); ctx.fill();
            ctx.fillRect(hx - 30, H - 122, 60, 26);
            ctx.fillStyle = '#20242a'; ctx.fillRect(hx - 5, H - 130, 10, 34);
        });
        this.bgVignette(ctx, W, H);
    },
    // Grup: gece kampı — çadırlar, ateş, mızrak demeti
    drawCampBg(ctx, W, H) {
        let hz = H * 0.55;
        let g = ctx.createLinearGradient(0, 0, 0, hz);
        g.addColorStop(0, '#0d1226'); g.addColorStop(1, '#3a2f3c');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for(let i = 0; i < 60; i++) {
            let r = ((i * 131) % 997) / 997, r2 = ((i * 613) % 991) / 991;
            ctx.globalAlpha = 0.2 + r2 * 0.6;
            ctx.fillRect(r * W, r2 * hz * 0.8, 2, 2);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#1b202c';                          // tepe hattı
        ctx.beginPath(); ctx.moveTo(0, hz);
        for(let x = 0; x <= W; x += 60) ctx.lineTo(x, hz - 30 - 26 * Math.sin(x / 130));
        ctx.lineTo(W, hz); ctx.fill();
        let fg = ctx.createLinearGradient(0, hz, 0, H);
        fg.addColorStop(0, '#33301f'); fg.addColorStop(1, '#16150f');
        ctx.fillStyle = fg; ctx.fillRect(0, hz, W, H - hz);
        // Çadırlar
        [[W * 0.18, H * 0.82, 130], [W * 0.82, H * 0.78, 110], [W * 0.5, H * 0.7, 90]].forEach(([tx, ty, tw]) => {
            ctx.fillStyle = '#d9cdb4';
            ctx.beginPath(); ctx.moveTo(tx, ty - tw); ctx.lineTo(tx + tw * 0.72, ty); ctx.lineTo(tx - tw * 0.72, ty); ctx.fill();
            ctx.fillStyle = '#3a2a20';
            ctx.beginPath(); ctx.moveTo(tx, ty - tw * 0.55); ctx.lineTo(tx + tw * 0.2, ty); ctx.lineTo(tx - tw * 0.2, ty); ctx.fill();
        });
        // Ateş
        let fx = W * 0.5, fy = H * 0.88;
        let fl = ctx.createRadialGradient(fx, fy, 5, fx, fy, 190);
        fl.addColorStop(0, 'rgba(255,205,110,0.95)'); fl.addColorStop(0.35, 'rgba(235,130,40,0.5)');
        fl.addColorStop(1, 'rgba(235,130,40,0)');
        ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(fx, fy, 190, 0, 7); ctx.fill();
        ctx.strokeStyle = '#40301f'; ctx.lineWidth = 9;
        [-0.6, 0.6].forEach(a => {
            ctx.save(); ctx.translate(fx, fy); ctx.rotate(a);
            ctx.beginPath(); ctx.moveTo(-46, 0); ctx.lineTo(46, 0); ctx.stroke(); ctx.restore();
        });
        // Mızrak demeti
        ctx.strokeStyle = '#5b4429'; ctx.lineWidth = 5;
        [-0.18, 0, 0.18].forEach(a => {
            ctx.save(); ctx.translate(W * 0.66, H); ctx.rotate(a);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -230); ctx.stroke(); ctx.restore();
        });
        this.bgVignette(ctx, W, H);
    },
    // Envanter: ambar — raflar, sandık, çuvallar, asılı ip
    drawStorageBg(ctx, W, H) {
        let g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#42301d'); g.addColorStop(1, '#241a10');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        for(let x = 0; x < W; x += 46) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x, 0, 3, H); }
        for(let y = H * 0.28; y < H; y += H * 0.34) {        // raflar
            ctx.fillStyle = '#6b4a28'; ctx.fillRect(0, y, W, 18);
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, y + 18, W, 12);
        }
        // Sandıklar ve çuvallar
        [[W * 0.16, H * 0.28, 150], [W * 0.72, H * 0.62, 175]].forEach(([bx, by, bw]) => {
            ctx.fillStyle = '#7a5630'; ctx.fillRect(bx, by - bw * 0.62, bw, bw * 0.62);
            ctx.fillStyle = '#4c3320'; ctx.fillRect(bx, by - bw * 0.62, bw, 14);
            ctx.fillStyle = '#c9a44a'; ctx.fillRect(bx + bw / 2 - 11, by - bw * 0.34, 22, 26);
        });
        [[W * 0.46, H * 0.62], [W * 0.56, H * 0.62], [W * 0.3, H * 0.96]].forEach(([sx, sy]) => {
            ctx.fillStyle = '#6e5c3a';
            ctx.beginPath(); ctx.ellipse(sx, sy - 34, 34, 44, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#57482d'; ctx.fillRect(sx - 13, sy - 82, 26, 14);
        });
        // Asılı ip ve fener
        ctx.strokeStyle = '#3a2b1a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(W * 0.88, 0); ctx.lineTo(W * 0.88, 90); ctx.stroke();
        let lg = ctx.createRadialGradient(W * 0.88, 106, 4, W * 0.88, 106, 90);
        lg.addColorStop(0, 'rgba(255,215,130,0.9)'); lg.addColorStop(1, 'rgba(255,180,60,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(W * 0.88, 106, 90, 0, 7); ctx.fill();
        this.bgVignette(ctx, W, H);
    },
    // Görevler: parşömen — lifler, yanık kenar, mühür
    drawParchmentBg(ctx, W, H) {
        let g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#d9c391'); g.addColorStop(0.5, '#c9b07b'); g.addColorStop(1, '#a98f5d');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        for(let i = 0; i < 220; i++) {                       // lif dokusu
            let r = ((i * 131) % 9973) / 9973, r2 = ((i * 613) % 9967) / 9967;
            ctx.globalAlpha = 0.05 + r2 * 0.08;
            ctx.fillStyle = i % 3 ? '#8a6f42' : '#f0e0b8';
            ctx.fillRect(r * W, r2 * H, 30 + r2 * 90, 2);
        }
        ctx.globalAlpha = 1;
        for(let y = H * 0.16; y < H * 0.9; y += 46) {        // silik satırlar
            ctx.fillStyle = 'rgba(90,70,40,0.13)'; ctx.fillRect(W * 0.1, y, W * 0.8, 3);
        }
        // Yanık kenar
        let e = ctx.createLinearGradient(0, 0, 0, H);
        e.addColorStop(0, 'rgba(70,45,15,0.55)'); e.addColorStop(0.12, 'rgba(70,45,15,0)');
        e.addColorStop(0.88, 'rgba(70,45,15,0)'); e.addColorStop(1, 'rgba(70,45,15,0.55)');
        ctx.fillStyle = e; ctx.fillRect(0, 0, W, H);
        let e2 = ctx.createLinearGradient(0, 0, W, 0);
        e2.addColorStop(0, 'rgba(70,45,15,0.5)'); e2.addColorStop(0.1, 'rgba(70,45,15,0)');
        e2.addColorStop(0.9, 'rgba(70,45,15,0)'); e2.addColorStop(1, 'rgba(70,45,15,0.5)');
        ctx.fillStyle = e2; ctx.fillRect(0, 0, W, H);
        // Mum mührü
        ctx.fillStyle = '#8c2230';
        ctx.beginPath(); ctx.arc(W * 0.8, H * 0.82, 52, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.arc(W * 0.8, H * 0.82, 32, 0, 7); ctx.fill();
        this.bgVignette(ctx, W, H);
    },
    // Han: ahşap duvar, kirişler, ocak, fıçılar, uzun masa, asma kandiller
    drawTavernBg(ctx, W, H) {
        let floor = H * 0.66;
        let g = ctx.createLinearGradient(0, 0, 0, floor);
        g.addColorStop(0, '#3a2a1c'); g.addColorStop(1, '#5a4028');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, floor);
        for(let y = 8; y < floor; y += 22) {          // duvar tahtaları
            ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, y, W, 2);
        }
        for(let x = 60; x < W; x += 150) {            // dikey kirişler
            ctx.fillStyle = '#2e2013'; ctx.fillRect(x, 0, 18, floor);
            ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x, 0, 4, floor);
        }
        // Ocak — sahnenin ışık kaynağı
        let fx = W * 0.5, fy = floor;
        ctx.fillStyle = '#3b3630'; ctx.fillRect(fx - 70, floor - 130, 140, 130);
        ctx.fillStyle = '#171310';
        ctx.beginPath(); ctx.moveTo(fx - 46, fy); ctx.lineTo(fx - 46, fy - 62);
        ctx.quadraticCurveTo(fx, fy - 108, fx + 46, fy - 62); ctx.lineTo(fx + 46, fy); ctx.fill();
        let fl = ctx.createRadialGradient(fx, fy - 26, 4, fx, fy - 26, 90);
        fl.addColorStop(0, 'rgba(255,190,80,0.95)'); fl.addColorStop(0.4, 'rgba(230,120,30,0.55)');
        fl.addColorStop(1, 'rgba(230,120,30,0)');
        ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(fx, fy - 26, 90, 0, 7); ctx.fill();
        // Zemin
        let fg = ctx.createLinearGradient(0, floor, 0, H);
        fg.addColorStop(0, '#4a3826'); fg.addColorStop(1, '#2a1f15');
        ctx.fillStyle = fg; ctx.fillRect(0, floor, W, H - floor);
        for(let y = floor + 10; y < H; y += 18) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, y, W, 2); }
        // Fıçılar
        [[70, floor + 26], [W - 78, floor + 20]].forEach(([bx, by]) => {
            ctx.fillStyle = '#6b4a28';
            ctx.beginPath(); ctx.ellipse(bx, by, 30, 40, 0, 0, 7); ctx.fill();
            ctx.strokeStyle = '#39281a'; ctx.lineWidth = 4;
            [-16, 0, 16].forEach(o => { ctx.beginPath(); ctx.moveTo(bx - 28, by + o); ctx.lineTo(bx + 28, by + o); ctx.stroke(); });
        });
        // Uzun masa + tabure
        ctx.fillStyle = '#7a5630'; ctx.fillRect(W * 0.28, H - 74, W * 0.44, 16);
        ctx.fillStyle = '#4c3320';
        ctx.fillRect(W * 0.31, H - 58, 12, 44); ctx.fillRect(W * 0.66, H - 58, 12, 44);
        [-70, 70].forEach(o => { ctx.fillStyle = '#5c3f26'; ctx.fillRect(W / 2 + o - 16, H - 44, 32, 10); });
        // Asma kandiller
        [W * 0.22, W * 0.78].forEach(lx => {
            ctx.strokeStyle = '#241a10'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, 60); ctx.stroke();
            let lg = ctx.createRadialGradient(lx, 68, 2, lx, 68, 46);
            lg.addColorStop(0, 'rgba(255,215,130,0.9)'); lg.addColorStop(1, 'rgba(255,180,60,0)');
            ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, 68, 46, 0, 7); ctx.fill();
        });
        this.bgVignette(ctx, W, H);
    },
    // Lordlar salonu: taş duvar, sütunlar, sancaklar, meşaleler, taht
    drawHallBg(ctx, W, H) {
        let floor = H * 0.7;
        let g = ctx.createLinearGradient(0, 0, 0, floor);
        g.addColorStop(0, '#2b2c31'); g.addColorStop(1, '#4a4b52');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, floor);
        for(let y = 0, r = 0; y < floor; y += 26, r++) {   // taş sıraları
            for(let x = (r % 2 ? -26 : 0); x < W; x += 52) {
                ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.5;
                ctx.strokeRect(x, y, 52, 26);
            }
        }
        // Sütunlar
        [W * 0.12, W * 0.88].forEach(px => {
            ctx.fillStyle = '#5b5c64'; ctx.fillRect(px - 26, 0, 52, floor);
            ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(px - 26, 0, 12, floor);
            ctx.fillStyle = '#6a6b74'; ctx.fillRect(px - 34, floor - 22, 68, 22);
        });
        // Sancaklar
        [W * 0.3, W * 0.7].forEach((bx, i) => {
            ctx.fillStyle = i ? '#7a2230' : '#243f7a';
            ctx.beginPath(); ctx.moveTo(bx - 30, 20); ctx.lineTo(bx + 30, 20);
            ctx.lineTo(bx + 30, 150); ctx.lineTo(bx, 132); ctx.lineTo(bx - 30, 150); ctx.fill();
            ctx.fillStyle = 'rgba(255,204,0,0.5)';
            ctx.beginPath(); ctx.arc(bx, 74, 15, 0, 7); ctx.fill();
        });
        // Taht + kırmızı halı
        ctx.fillStyle = '#3a2b1a'; ctx.fillRect(W / 2 - 34, floor - 96, 68, 96);
        ctx.fillRect(W / 2 - 42, floor - 100, 84, 12);
        ctx.fillStyle = '#8a2b34'; ctx.fillRect(W / 2 - 26, floor - 84, 52, 60);
        // Zemin
        let fg = ctx.createLinearGradient(0, floor, 0, H);
        fg.addColorStop(0, '#43444b'); fg.addColorStop(1, '#25262b');
        ctx.fillStyle = fg; ctx.fillRect(0, floor, W, H - floor);
        ctx.fillStyle = '#7a2230';
        ctx.beginPath(); ctx.moveTo(W / 2 - 46, floor); ctx.lineTo(W / 2 + 46, floor);
        ctx.lineTo(W / 2 + 130, H); ctx.lineTo(W / 2 - 130, H); ctx.fill();
        // Meşaleler
        [W * 0.12, W * 0.88].forEach(tx => {
            ctx.fillStyle = '#241a10'; ctx.fillRect(tx - 4, 120, 8, 34);
            let lg = ctx.createRadialGradient(tx, 118, 3, tx, 118, 70);
            lg.addColorStop(0, 'rgba(255,200,110,0.95)'); lg.addColorStop(0.45, 'rgba(240,140,40,0.4)');
            lg.addColorStop(1, 'rgba(240,140,40,0)');
            ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(tx, 118, 70, 0, 7); ctx.fill();
        });
        this.bgVignette(ctx, W, H);
    },
    bgVignette(ctx, W, H) {
        let v = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.85);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    },

    addBtn(container, text, cb) {
        if(!this.btnLabelOk(text, 'addBtn')) return;   // etiketsiz düğme hiç çizilmez (#35)
        let b = document.createElement('button');
        b.className = 'btn'; b.innerHTML = text; b.onclick = cb;
        container.appendChild(b);
    },

    // Yazısız sarı düğme şikâyetinin tek kapısı (#35): boş/undefined etiket çizilmez,
    // hangi akıştan geldiği yığınla birlikte Debug raporuna düşer.
    btnLabelOk(text, where) {
        let t = (text === null || text === undefined) ? '' : String(text);
        if(t.replace(/<[^>]*>/g, '').trim()) return true;
        Debug.log('bosbuton', T`Etiketsiz buton (${where})`, {
            deger: JSON.stringify(text),
            yigin: ((new Error()).stack || '').split('\n').slice(2, 5).map(l => l.trim()).join(' | ')
        });
        return false;
    },

    showModal(html, width = '600px', bgImage = null) {
        let mc = document.getElementById('modal-content');
        mc.style.width = width;
        mc.style.maxWidth = '90vw';
        if(bgImage) {
            // 0.8/0.9'luk perde iç mekân çizimini tamamen yutuyordu (#60) — yazı hâlâ okunur, sahne görünür
            mc.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.62), rgba(0,0,0,0.82)), url('${bgImage}')`;
            mc.style.backgroundSize = 'cover';
            mc.style.backgroundPosition = 'center';
        } else {
            mc.style.backgroundImage = 'none';
            mc.style.background = 'rgba(20, 20, 25, 0.95)';
        }
        let mb = document.getElementById('modal-body');
        mb.innerHTML = html;
        // Modal HTML'i şablon dizesiyle üretiliyor; etiketi boş kalan düğme burada yakalanır (#35)
        mb.querySelectorAll('button').forEach(b => {
            if(!this.btnLabelOk(b.textContent, 'showModal')) b.style.display = 'none';
        });
        document.getElementById('modal-overlay').classList.remove('hidden');
    },
    closeModal() { this.skipType(); document.getElementById('modal-overlay').classList.add('hidden'); },

    // --- YAZI MAKİNESİ (#59) ---
    // Metin kademeli yazılır; herhangi bir tıklama ya da yeni bir çağrı onu tamamlar.
    // Hareket azaltma açıksa (ya da sistem öyle diyorsa) hiç beklemez, tek karede basar.
    typeIn(elId, text, then = null, cps = 60) {
        this.skipType();
        let el = document.getElementById(elId);
        if(!el) return;
        if(this.reduceMotion()) { el.textContent = text; if(then) then(); return; }
        el.textContent = '';
        let i = 0, step = 2;
        this._type = { el, text, then, timer: setInterval(() => {
            i += step;
            el.textContent = text.slice(0, i);
            if(i >= text.length) Game.skipType();
        }, 1000 / (cps / step)) };
        // Modalı açan tıklama hâlâ yayılıyor olabilir — dinleyici bir sonraki tur konur
        setTimeout(() => {
            if(!Game._type) return;
            document.addEventListener('click', Game._typeSkip = () => Game.skipType());
        }, 0);
    },
    skipType() {
        let t = this._type;
        if(this._typeSkip) { document.removeEventListener('click', this._typeSkip); this._typeSkip = null; }
        if(!t) return;
        clearInterval(t.timer);
        this._type = null;
        t.el.textContent = t.text;
        if(t.then) t.then();
    },

    // --- MARKET ---
    openMarket(loc) {
        let html = `<h3>${T`🛒 Pazar - ${T(loc.name)}`}</h3>
        <div id="market-cols" style="display:flex;gap:2rem;margin-top:1rem;">
        <div style="flex:1;"><h4>${T`Satın Al`}</h4><ul id="market-buy" style="list-style:none;"></ul></div>
        <div style="flex:1;"><h4>${T`Sat`}</h4><ul id="market-sell" style="list-style:none;"></ul></div>
        </div>
        <div id="market-msg" style="min-height:1.4rem;margin-top:0.8rem;font-size:0.9rem"></div>`;
        this.showModal(html);
        this._marketLoc = loc;
        this.refreshMarket();
    },

    // --- MAL BAŞINA ARZ/TALEP (#24) ---
    // Fiyat artık şehre girerken atılan tek zar değil: her yerleşimin her mal için
    // kendi çarpanı var. Üretim bölgesinde ucuz, uzağında pahalı; sen aldıkça
    // yükselir, sattıkça düşer, dokunulmazsa kendi tabanına geri döner.
    GOOD_ORIGIN: {
        swadia:  { wheat:0.70, bread:0.75, velvet:1.30, salt:1.15 },   // ova, tahıl ambarı
        rhodok:  { ale:0.65,   iron:0.80,  meat:1.25,   cheese:1.15 }, // dağ, bağ ve maden
        vaegir:  { meat:0.70,  cheese:0.80, velvet:1.25, ale:1.20 },   // kuzey ormanı
        nord:    { salt:0.70,  meat:0.85,  wheat:1.30,  iron:1.20 },   // kıyı, tuzla
        khergit: { cheese:0.70, meat:0.75, velvet:1.35, bread:1.25 }   // bozkır, sürü
    },
    basePriceMult(loc, id) {
        let it = ITEMS[id];
        let m = (this.GOOD_ORIGIN[loc.faction] || {})[id] || 1;
        // Aynı krallığın her şehri aynı fiyatı vermesin: yerleşim+mal'dan türeyen sabit sapma
        let h = 0, str = loc.id + id;
        for(let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
        m *= 0.88 + (h % 25) / 100;
        if(loc.type === 'village' && it) m *= it.type === 'food' ? 0.8 : 1.15;   // köy erzağı ucuz, ticaret malı pahalı
        return m * (1.15 - (loc.prosperity || 50) / 400);                        // bolluk fiyatı düşürür
    },
    // Fiyat = bölge tabanı × arz eğrisi. Ayrı bir "fiyat durumu" yok: oynayan tek şey stok.
    priceMult(loc, id) { return this.basePriceMult(loc, id) * this.supplyMul(loc, id); },

    // --- SINIRLI STOK VE ARZ EĞRİSİ (#46) ---
    // Yerleşimin elindeki mal sınırlıdır: aldıkça biter ve pahalanır, sattıkça bollaşır ve
    // ucuzlar, her gün refahla orantılı yenilenir. Bir köyü boşaltmak sonraki alımı pahalı
    // yapar — "ucuz köyü bul, hepsini al" artık gerçek bir karar.
    STOCK_SCALE: { city: 500, village: 190, castle: 150 },   // stok ölçeği — √fiyat ile bölünür
    stocked(id) { let it = ITEMS[id]; return !!it && (it.type === 'food' || it.type === 'trade'); },
    stockBase(loc, id) {
        // Üretim bölgesinde bol, uzağında kıt (aynı `GOOD_ORIGIN` tablosu); refah depoyu büyütür.
        // Değere göre normalize: şehir her maldan aynı sayıda değil, aynı değerde tutar.
        let orig = (this.GOOD_ORIGIN[loc.faction] || {})[id] || 1;
        // Pahalı mal az bulunur ama fiyatla ters orantılı değil (√fiyat): tam orantıda bir şehirde
        // 6 top kadife kalıyordu, tek yük bile pazarı boşaltıp ticareti zarara sokuyordu.
        return Math.max(3, Math.round((this.STOCK_SCALE[loc.type] || 150) * (0.55 + (loc.prosperity || 50) / 110)
            / (orig * Math.sqrt(ITEMS[id].basePrice))));
    },
    stock(loc, id) {
        if(!this.stocked(id)) return Infinity;
        if(!loc.stock) loc.stock = {};
        if(loc.stock[id] === undefined) loc.stock[id] = this.stockBase(loc, id);
        return loc.stock[id];
    },
    addStock(loc, id, n) { if(this.stocked(id)) loc.stock[id] = Math.max(0, this.stock(loc, id) + n); },
    // Arz eğrisi 1/√oran: stok yarıya inince fiyat ×1.41, ikiye katlanınca ×0.71 (0.55–2.0 sınırlı)
    supplyMul(loc, id) {
        if(!this.stocked(id)) return 1;
        let r = Math.max(0.05, this.stock(loc, id) / this.stockBase(loc, id));
        return Math.max(0.55, Math.min(2, Math.pow(r, -0.5)));
    },
    // Her gün stok tabanına yaklaşır (üretim/tüketim); tabana oturunca kayıt şişmesin diye silinir
    stockTick() {
        LOCATIONS.forEach(l => {
            if(!l.stock) return;
            for(let id in l.stock) {
                let base = this.stockBase(l, id);
                l.stock[id] += (base - l.stock[id]) * (0.08 + (l.prosperity || 50) / 700);
                if(Math.abs(l.stock[id] - base) < 0.5) delete l.stock[id];
            }
        });
    },
    // Fiyatın taban fiyata göre nerede durduğu — pazar listesinde ve lonca defterinde
    priceTag(loc, id) {
        let rel = Math.round((this.priceMult(loc, id) - 1) * 100);
        let c = rel <= -12 ? '#2ecc71' : rel >= 12 ? '#e0463a' : 'var(--text-muted)';
        let w = rel <= -12 ? T('ucuz') : rel >= 12 ? T('pahalı') : T('normal');
        return `<span style="color:${c}">${w} ${this.pct(rel, true)}</span>`;
    },
    // Lonca ustasının defteri: hangi mal nerede ucuz, nerede pahalı (Warband'daki
    // "ticaret malları fiyatları" ekranı). Rota kurmanın tek bilgi kaynağı.
    guildPrices(locId) {
        let here = LOCATIONS.find(l => l.id === locId);
        let towns = LOCATIONS.filter(l => l.type === 'city')
                             .sort((a, b) => this.dist(a, here) - this.dist(b, here)).slice(0, 5);
        let goods = Object.values(ITEMS).filter(i => i.type === 'trade' || i.type === 'food');
        let head = towns.map(t => `<th style="padding:0.2rem 0.4rem;font-weight:600;color:${(FACTIONS[t.faction]||{}).color||'#fff'}">${T(t.name)}${t.id === here.id ? ' *' : ''}</th>`).join('');
        let rows = goods.map(g => `<tr><td style="padding:0.2rem 0.4rem">${g.icon} ${T(g.name)}</td>` +
            towns.map(t => `<td style="padding:0.2rem 0.4rem;text-align:right">${Math.max(1, Math.floor(g.basePrice * this.priceMult(t, g.id)))}₺<br>
                <span style="font-size:0.7rem">${this.priceTag(t, g.id)}</span></td>`).join('') + '</tr>').join('');
        this.showModal(`<h3>${T`📈 Lonca Fiyat Defteri`}</h3>
            <p style="color:var(--text-muted);font-size:0.9rem">${T`"En yakın beş şehrin fiyatları bunlar. Ucuz aldığın malı
            pahalı olduğu yerde satarsan kâr edersin — ama sen aldıkça fiyat yükselir, sattıkça düşer."<br>
            Satış fiyatı bu rakamın <b>%70</b>'i (Ticaret yeteneği payını iyileştirir). <i>*</i> bulunduğun şehir.`}</p>
            <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.85rem">
            <tr><th style="text-align:left;padding:0.2rem 0.4rem">${T`Mal`}</th>${head}</tr>${rows}</table></div>
            <button class="btn" style="margin-top:1rem" onclick="Game.openTavern(LOCATIONS.find(l=>l.id==='${locId}'))">${T('Geri')}</button>`, '760px');
    },
    // Fiyat butonun HTML'inden parametre olarak gelmemeli: DOM'dan değiştirilerek
    // bedavaya alışveriş yapılabiliyor, eksik parametrede para NaN oluyordu.
    marketPrice(id, selling = false) {
        let it = ITEMS[id] || state.player.inventory.find(i => i.id === id);
        if(!it) return null;
        // Ticaret yeteneği: alışta indirim, satışta prim (en fazla %25)
        let edge = Math.min(0.25, (this.profLvl('trade') - 1) * 0.02);
        let loc = this._marketLoc;
        let mult = (loc ? this.priceMult(loc, id) : 1) * (selling ? 0.7 * (1 + edge) : 1 - edge);
        return Math.max(1, Math.floor(it.basePrice * mult));
    },
    refreshMarket() {
        let buy = document.getElementById('market-buy'); buy.innerHTML = '';
        Object.values(ITEMS).forEach(item => {
            let price = this.marketPrice(item.id);
            let li = document.createElement('li'); li.style.marginBottom = '0.5rem';
            li.id = 'mrow-buy-' + item.id;   // satır her yenilemede yeniden kurulur; parlatma id'den bulur
            let note = this.itemNote(item);
            // Stok (#46): sınırlı mal kaç tane kalmış, tükendiyse buton yok
            let st = this._marketLoc ? Math.floor(this.stock(this._marketLoc, item.id)) : Infinity;
            let empty = st <= 0;
            li.innerHTML = `${item.icon} ${T(item.name)} - <b>${price}₺</b> `
                + `<span style="font-size:0.72rem">${this._marketLoc ? this.priceTag(this._marketLoc, item.id) : ''}</span> `
                + (isFinite(st) ? `<span style="font-size:0.72rem;color:${empty ? '#e0463a' : st < 6 ? '#e8a13a' : 'var(--text-muted)'}">${T`stok ${st}`}</span> ` : '')
                + (empty ? `<i style="font-size:0.8rem;color:var(--text-muted)">${T`tükendi`}</i>`
                    : `<button class="btn" style="padding:0.2rem 0.5rem;font-size:0.8rem" onclick="Game.buyItem('${item.id}')">${T`Al`}</button> `
                    + `<button class="btn" style="padding:0.2rem 0.5rem;font-size:0.8rem" onclick="Game.buyItem('${item.id}',5)">x5</button>`)
                + (note ? `<div style="font-size:0.7rem;color:#cbb26b">${note}</div>` : '');
            buy.appendChild(li);
        });
        let sell = document.getElementById('market-sell'); sell.innerHTML = '';
        state.player.inventory.forEach(item => {
            if(item.type === 'trade') {
                let price = this.marketPrice(item.id, true);
                let li = document.createElement('li'); li.style.marginBottom = '0.5rem';
                li.id = 'mrow-sell-' + item.id;
                li.innerHTML = `${item.icon||'📦'} ${T(item.name)} x${item.qty} - <b>${price}₺</b> `
                    + `<span style="font-size:0.72rem">${this._marketLoc ? this.priceTag(this._marketLoc, item.id) : ''}</span> `
                    + `<button class="btn" style="padding:0.2rem 0.5rem;font-size:0.8rem" onclick="Game.sellItem('${item.id}')">${T`Sat`}</button> `
                    + (item.qty >= 5 ? `<button class="btn" style="padding:0.2rem 0.5rem;font-size:0.8rem" onclick="Game.sellItem('${item.id}',5)">x5</button>` : '');
                sell.appendChild(li);
            }
        });
    },
    // ============ İŞLEM GERİ BİLDİRİMİ (#45) ============
    // Tek kapı: ses + ilgili satırın parlaması + dinar rozetinde uçan delta.
    // Ses dosyası yok (bağımlılık/varlık eklemeden) — kısa zarflı osilatörlerle üretilir.
    SFX: {
        buy:     { f: [523, 784],       t: 'triangle', d: 0.10 },
        sell:    { f: [659, 988],       t: 'triangle', d: 0.10 },
        error:   { f: [196, 131],       t: 'square',   d: 0.16 },
        recruit: { f: [392, 523, 659],  t: 'triangle', d: 0.11 },
        upgrade: { f: [523, 659, 880],  t: 'triangle', d: 0.13 }
    },
    sfx(kind) {
        let s = this.SFX[kind];
        if(!s || this.opt('muted')) return;
        try {
            let AC = window.AudioContext || window.webkitAudioContext;
            let ac = this._audio || (this._audio = new AC());
            if(ac.state === 'suspended') ac.resume();
            s.f.forEach((freq, i) => {
                let o = ac.createOscillator(), g = ac.createGain();
                let t0 = ac.currentTime + i * s.d * 0.6;
                o.type = s.t;
                o.frequency.setValueAtTime(freq, t0);
                // Zarf: exponentialRamp 0'a inemez, 0.0001 taban kullanılır
                g.gain.setValueAtTime(0.0001, t0);
                g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.12 * this.opt('volume')), t0 + 0.012);
                g.gain.exponentialRampToValueAtTime(0.0001, t0 + s.d);
                o.connect(g); g.connect(ac.destination);
                o.start(t0); o.stop(t0 + s.d + 0.02);
            });
        } catch(e) { /* ses yoksa oyun durmaz */ }
    },
    toggleMute() { this.setOpt('muted', !this.opt('muted')); this.updateTopBar(); if(!this.opt('muted')) this.sfx('buy'); },

    // ============ AYARLAR (#55 madde 7) ============
    // Tek ekran, tek okuma kapısı: her ayarın varsayılanı OPTS'ta durur, sapan
    // anahtar state.settings'e yazılır (yani kayda girer ve eski kayıtta boş kalır).
    OPTS: { muted: false, volume: 0.6, reducedMotion: 'auto', gore: true, frameGate: true, fontScale: 1, autosave: true, lite: 'auto' },
    opt(k) { let v = (state.settings || {})[k]; return v === undefined ? this.OPTS[k] : v; },
    setOpt(k, v) {
        (state.settings || (state.settings = {}))[k] = v;
        this.applySettings();
        if(document.getElementById('settings-panel')) this.showSettings();
    },
    // 'auto' sistemin tercihini okur — erişilebilirlik ayarı oyunda ikinci kez sorulmasın
    reduceMotion() {
        let v = this.opt('reducedMotion');
        if(v !== 'auto') return !!v;
        try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e) { return false; }
    },
    applySettings() {
        this._lite = undefined;   // hafif mod cevabı önbellekli; ayar değişince tazelenir
        // Arayüzün tamamı rem tabanlı; kök boyutu tek noktadan ölçeklenir
        document.documentElement.style.fontSize = (this.opt('fontScale') * 16) + 'px';
        document.body.classList.toggle('reduced-motion', this.reduceMotion());
        // Cam panellerin backdrop-filter'ı hafif modda düşer (bkz. style.css .lite)
        document.body.classList.toggle('lite', this.lite());
        // Ekran zeminleri `dataset.bg` ile bir kez konuyor; mod değişince damga
        // silinmezse hafif modda girilen ekran vanilla'ya dönünce zeminsiz kalır.
        document.querySelectorAll('.view[data-bg]').forEach(el => {
            delete el.dataset.bg; el.style.backgroundImage = '';
        });
        let cur = document.querySelector('.view.active');
        if(cur) this.applyViewBg(cur.id.replace(/-view$/, ''));
    },
    showSettings() {
        let sw = (k, on, off) => `<button class="btn${this.opt(k) ? ' primary' : ''}" style="font-size:0.8rem;padding:0.25rem 0.7rem"
            onclick="Game.setOpt('${k}', ${!this.opt(k)})">${this.opt(k) ? on : off}</button>`;
        let row = (label, ctrl, note) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:0.5rem 0;border-bottom:1px solid var(--panel-border)">
            <div><div>${label}</div>${note ? `<div style="font-size:0.75rem;color:var(--text-muted)">${note}</div>` : ''}</div><div style="white-space:nowrap">${ctrl}</div></div>`;
        let rm = this.opt('reducedMotion');
        let rmBtn = ['auto', true, false].map(v => `<button class="btn${rm === v ? ' primary' : ''}" style="font-size:0.8rem;padding:0.25rem 0.6rem"
            onclick="Game.setOpt('reducedMotion', ${JSON.stringify(v)})">${v === 'auto' ? T('Sistem') : v ? T('Açık') : T('Kapalı')}</button>`).join(' ');
        let fs = this.opt('fontScale');
        let fsBtn = [0.9, 1, 1.15].map(v => `<button class="btn${fs === v ? ' primary' : ''}" style="font-size:0.8rem;padding:0.25rem 0.6rem"
            onclick="Game.setOpt('fontScale', ${v})">${v === 0.9 ? T('Küçük') : v === 1 ? T('Normal') : T('Büyük')}</button>`).join(' ');
        let lt = this.opt('lite');
        let liteBtn = ['auto', true, false].map(v => `<button class="btn${lt === v ? ' primary' : ''}" style="font-size:0.8rem;padding:0.25rem 0.6rem"
            onclick="Game.setOpt('lite', ${JSON.stringify(v)})">${v === 'auto' ? T('Cihaza göre') : v ? T('Açık') : T('Kapalı')}</button>`).join(' ');
        let hz = this._minStep === Infinity ? T('ölçülmedi') : Math.round(1000 / this._minStep) + T(' Hz');
        this.showModal(`<div id="settings-panel"><h3>${T`⚙️ Ayarlar`}</h3>
        ${row(T('🌍 Dil'), I18N.LANGS.map(l => `<button class="btn${l.id === I18N.lang ? ' primary' : ''}" style="font-size:0.8rem;padding:0.25rem 0.6rem"
            onclick="Game.setLang('${l.id}')">${l.flag} ${T(l.name)}</button>`).join(' '))}
        ${row(T('🔊 Ses'), sw('muted', T('Kapalı'), T('Açık')))}
        ${row(T('🎚️ Ses seviyesi'), `<input type="range" min="0" max="100" value="${Math.round(this.opt('volume') * 100)}"
            oninput="Game.setOpt('volume', this.value / 100)" onchange="Game.sfx('buy')" style="vertical-align:middle">
            <span style="font-size:0.8rem;color:var(--text-muted)">${this.pct(this.opt('volume') * 100)}</span>`)}
        ${row(T('🎞️ Hareketi azalt'), rmBtn, T('Kamera yumuşatması, kıvılcım ve arayüz animasyonları kapanır'))}
        ${row(T('📱 Hafif mod'), liteBtn, T('Bütün oyunu sadeleştirir: deniz dalgası, orman ağaçları, ocak ışığı, savaş parçacıkları ve cam bulanıklığı düşer, hedef 30 fps. Telefonda kendiliğinden açılır.'))}
        ${row(T('🩸 Kan ve cesetler'), sw('gore', T('Açık'), T('Kapalı')), T('Kapatmak zayıf makinede kare hızını rahatlatır'))}
        ${row(T('🖼️ Kare atlama kapısı'), sw('frameGate', T('Açık'), T('Kapalı')), `${T`Yüksek tazeleme hızlı ekranda fazla kareyi atar. Ölçülen:`} <b>${hz}</b>`)}
        ${row(T('🔠 Yazı boyutu'), fsBtn)}
        ${row(T('💾 Otomatik kayıt'), sw('autosave', T('Açık'), T('Kapalı')), T('Her oyun günü başında, halkasal 5 slot'))}
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.9rem">
            <button class="btn" onclick="Save.open()">${T`💾 Kayıtlar`}</button>
            <button class="btn" onclick="Debug.open()">${T`🐞 Debug Raporu`}</button>
            <button class="btn" onclick="Game.showKeys()">${T`⌨️ Tuşlar`}</button>
            <button class="btn primary" onclick="Game.closeModal()">${T`Kapat`}</button>
        </div>
        <p style="margin-top:0.8rem;font-size:0.75rem;color:var(--text-muted)">${T`WebBand ${VERSION.no} — ${VERSION.name} (${VERSION.date})`}</p>
        </div>`, '620px');
    },
    // Ham durur; gösterimde `T` ile çevrilir (tablo yükleme anında kurulur,
    // o sırada dil hâlâ 'tr' olduğu için burada çevirmek çeviriyi dondururdu)
    KEYS: [['M', 'Harita'], ['C', 'Karakter'], ['P', 'Grup'], ['I', 'Envanter'], ['Q', 'Görevler'],
           ['K', 'Diplomasi'], ['Esc', 'Haritaya dön / modalı kapat'], ['Enter', 'Modaldeki ana düğme'],
           ['W A S D / Oklar', 'Haritada kamerayı kaydır'], ['Boşluk', 'Kamerayı oyuncuya getir'],
           ['Savaşta W A S D', 'Hareket'], ['Sol tık / Boşluk', 'Vur veya ok at'],
           ['Sağ tık / Shift', 'Blok'], ['1 2 3', 'Taktik emirleri']],
    showKeys() {
        this.showModal(`<h3>${T`⌨️ Tuşlar`}</h3><table style="width:100%;font-size:0.9rem">
        ${this.KEYS.map(([k, v]) => `<tr><td style="padding:0.25rem 0"><kbd>${T(k)}</kbd></td><td style="color:var(--text-muted)">${T(v)}</td></tr>`).join('')}
        </table><button class="btn" style="margin-top:0.8rem" onclick="Game.showSettings()">${T`← Ayarlar`}</button>`, '460px');
    },
    flash(el, ok = true) {
        if(!el) return;
        el.classList.remove('fx-flash', 'fx-flash-bad');
        void el.offsetWidth;   // reflow: aynı sınıfı arka arkaya tetiklemenin tek yolu
        el.classList.add(ok ? 'fx-flash' : 'fx-flash-bad');
    },
    floatText(el, txt, ok = true) {
        if(!el) return;
        let r = el.getBoundingClientRect();
        let d = document.createElement('div');
        d.className = 'fx-float' + (ok ? '' : ' bad');
        d.textContent = txt;
        d.style.left = (r.left + r.width / 2) + 'px';
        d.style.top = r.top + 'px';
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 950);
    },
    // kind: buy | sell | error | recruit | upgrade. el varsa parlar, moneyDelta varsa uçar.
    feedback(kind, el, moneyDelta) {
        this.sfx(kind);
        this.flash(el, kind !== 'error');
        if(moneyDelta) this.floatText(document.getElementById('ui-money'),
            (moneyDelta > 0 ? '+' : '−') + Math.abs(Math.round(moneyDelta)) + '₺', moneyDelta > 0);
    },

    // Alışverişin sonucu modalin içinde görünsün: alert() pazarı kapatırdı.
    marketMsg(html, ok = true) {
        this.setHtml('market-msg', `<span style="color:${ok ? 'var(--success)' : 'var(--danger)'}">${html}</span>`);
    },
    buyItem(id, n = 1) {
        if(this.marketPrice(id) === null) return alert(T('Bu eşya pazarda yok.'));
        let loc = this._marketLoc, out = false, cost = 0, can = 0;
        // Fiyat birim birim hesaplanır: her alınan mal stoku düşürür, düşen stok bir sonrakini
        // pahalılaştırır. (Tek fiyatla toplu almak ucuza gelirdi — teker teker al/toplu al farkı.)
        for(; can < n; can++) {
            if(loc && this.stock(loc, id) < 1) { out = true; break; }
            let p = this.marketPrice(id);
            if(state.player.money - cost < p) break;
            cost += p;
            if(loc) this.addStock(loc, id, -1);
        }
        if(can <= 0) {
            this.feedback('error', document.getElementById('mrow-buy-' + id));
            return this.marketMsg(out ? T`${T(ITEMS[id].name)} kalmadı — pazarın stoku tükendi, birkaç gün sonra gel.`
                : T`Yeterli dinarın yok — ${T(ITEMS[id].name)} ${this.marketPrice(id)}₺, kasanda ${Math.floor(state.player.money)}₺.`, false);
        }
        state.player.money -= cost;
        let ex = state.player.inventory.find(i=>i.id===id);
        if(ex) ex.qty += can; else state.player.inventory.push({...ITEMS[id], qty:can});
        this.addProficiencyXp('trade', 4 * can);
        Quests.emit('bought_item', { itemId: id, qty: can, locId: this._marketLoc ? this._marketLoc.id : null });
        let have = state.player.inventory.find(i=>i.id===id);
        this.marketMsg(`${ITEMS[id].icon} <b>${T(ITEMS[id].name)} x${can}</b> ${T`alındı · <b>-${cost}₺</b> · kasa <b>${Math.floor(state.player.money)}₺</b> · elde ${have ? have.qty : 0}`}`
            + (can < n ? ` <i>(${out ? T('stok bitti') : T`paran ${n} taneye yetmedi`})</i>` : ''));
        this.updateTopBar(); this.refreshMarket();
        // Parlatma yenilemeden SONRA: satır elemanı yeniden kuruluyor
        this.feedback('buy', document.getElementById('mrow-buy-' + id), -cost);
        this.flash(document.getElementById('mrow-sell-' + id));   // elindeki adet de değişti
    },
    sellItem(id, n = 1) {
        let idx = state.player.inventory.findIndex(i => i.id === id);
        if(idx === -1) return;
        let item = state.player.inventory[idx];
        if(item.type !== 'trade') { this.sfx('error'); return alert(T('Bu eşya pazarda satılmıyor.')); }
        let can = Math.min(n, item.qty), gain = 0;
        // Sattığın mal pazarın stokuna girer: her satılan birim bir sonrakinin fiyatını düşürür.
        for(let i = 0; i < can; i++) {
            gain += this.marketPrice(id, true);
            if(this._marketLoc) this.addStock(this._marketLoc, id, 1);
        }
        state.player.money += gain;
        this.addProficiencyXp('trade', 4 * can);
        item.qty -= can;
        if(item.qty <= 0) state.player.inventory.splice(idx,1);
        this.marketMsg(`${item.icon||'📦'} <b>${T(item.name)} x${can}</b> ${T`satıldı · <b>+${gain}₺</b> · kasa <b>${Math.floor(state.player.money)}₺</b> · elde ${Math.max(0,item.qty)}`}`);
        this.updateTopBar(); this.refreshMarket();
        this.feedback('sell', document.getElementById('mrow-sell-' + id) || document.getElementById('mrow-buy-' + id), gain);
        this.flash(document.getElementById('mrow-buy-' + id));
    },

    // --- TAVERN ---
    openTavern(loc) {
        let html = `<h3>${T`🍺 Han - ${T(loc.name)}</h3><p>Hancı sana gülümsüyor. "Hoşgeldin yolcu!"</p>
        <p>Burada dinlenip canını yenileyebilirsin. (10 Dinar)`}</p>
        <button class="btn primary" onclick="Game.restAtTavern()">${T`Dinlen`}</button>
        <hr style="border-color:var(--panel-border);margin:1.2rem 0">
        <h4 style="color:var(--primary)">${T`🎵 Köşedeki Ozan`}</h4>
        <p style="font-size:0.9rem;color:var(--text-muted)">${T`"Bir kadeh ve biraz gümüş, sana bir dize öğretirim. Kime okuyacağın seni ilgilendirir."`}</p>
        <div style="display:flex;flex-direction:column;gap:0.4rem;margin-top:0.6rem">`;
        POEMS.forEach(p => {
            html += state.player.poems.includes(p.id)
                ? `<button class="btn" disabled style="opacity:0.4;font-size:0.85rem">${T`${T(p.name)} (ezberinde)`}</button>`
                : `<button class="btn" style="font-size:0.85rem" onclick="Game.learnPoem('${p.id}')">${T`${T(p.name)} — ${p.cost} Dinar`}</button>`;
        });
        html += `</div>`;

        // Paralı askerler — parayı doğrudan hazır seviyeli askere çevirmenin tek yolu
        let pool = this.mercPool(loc);
        html += `<hr style="border-color:var(--panel-border);margin:1.2rem 0">
            <h4 style="color:var(--primary)">${T`🗡️ Paralı Askerler`}</h4>
            <p style="font-size:0.9rem;color:var(--text-muted)">${T`"Sadakat pahalıdır, biz peşin çalışırız."`}</p>`;
        if(!pool.list.length) html += `<p style="color:var(--text-muted)">${T`Bu şehirde şu an boşta adam yok.`}</p>`;
        pool.list.forEach((m, i) => {
            let price = this.mercPrice(m);
            let space = Math.max(0, this.getPartyCapacity() - state.player.party.length);
            let max = Math.min(m.count, space, Math.floor(state.player.money / price));
            let st = this.troopStats({ name: m.name });
            html += `<div style="background:rgba(0,0,0,0.25);border:1px solid var(--panel-border);border-radius:6px;padding:0.7rem;margin-bottom:0.5rem">
                <b>${st.icon} ${T(m.name)}</b> <span style="font-size:0.8rem;color:var(--text-muted)">${T`· seviye ${m.level} · ${m.count} kişi · kişi başı ${price} dinar`}</span>`;
            html += max > 0
                ? `<input type="range" id="merc-n-${i}" min="1" max="${max}" value="${max}" style="width:100%;margin:0.5rem 0"
                        oninput="Game.updateMercLabel(${i}, ${price})">
                   <button class="btn primary" id="merc-btn-${i}" style="font-size:0.85rem"
                        onclick="Game.hireMercs('${loc.id}', ${i}, +document.getElementById('merc-n-${i}').value)">${T`Tut: ${max} kişi (${max * price} Dinar)`}</button>`
                : `<div style="font-size:0.85rem;color:var(--danger);margin-top:0.4rem">${space <= 0 ? T('Grubunda yer yok.') : T('Kesen yetmiyor.')}</div>`;
            html += `</div>`;
        });

        // Lonca ustası
        html += `<hr style="border-color:var(--panel-border);margin:1.2rem 0">
            <h4 style="color:var(--primary)">${T`⚖️ Lonca Ustası`}</h4>
            <p style="font-size:0.9rem;color:var(--text-muted)">${T`Köşedeki masada, defterine bir şeyler yazıyor.`}</p>
            <button class="btn" onclick="Quests.offerMenu('guild_${loc.id}')">${T`İşi Sor`}</button>
            <button class="btn" onclick="Game.guildPrices('${loc.id}')">${T`📈 Fiyat Defterine Bak`}</button>`;

        // Handaki yoldaşlar
        let here = COMPANIONS.filter(c => c.city === loc.id && !state.player.party.some(t => t.companionId === c.id));
        if(here.length) {
            html += `<hr style="border-color:var(--panel-border);margin:1.2rem 0">
                <h4 style="color:var(--primary)">${T`🎖️ Köşedeki Yabancılar`}</h4>`;
            here.forEach(c => {
                let rival = c.dislikes.map(d => state.player.party.find(t => t.companionId === d)).find(Boolean);
                html += `<div style="background:rgba(0,0,0,0.25);border:1px solid var(--panel-border);border-radius:6px;padding:0.8rem;margin-bottom:0.5rem">
                    <b>${c.icon} ${T(c.name)}</b> <span style="font-size:0.8rem;color:var(--text-muted)">· ${this.profName(c.skill)} ${c.level}</span>
                    <div style="font-size:0.85rem;font-style:italic;color:var(--text-muted);margin:0.3rem 0">${T(c.lore)}</div>
                    ${rival
                        ? `<button class="btn" disabled style="opacity:0.5;font-size:0.85rem">${T`${T(rival.name)} grubundayken katılmaz`}</button>`
                        : `<button class="btn primary" style="font-size:0.85rem" onclick="Game.hireCompanion('${c.id}')">${T`Gruba Kat (${c.cost} Dinar)`}</button>`}
                </div>`;
            });
        }

        this.showModal(html, '600px', this.sceneBg('tavern'));   // han iç mekânı (#60)
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
    // Yağmacıyla çalışmak risklidir; paralı asker fazladan ister (#49)
    mercPrice(m) { return Math.round((60 + m.level * 12) * (1 + this.infamyPenalty())); },

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
        this.setHtml('merc-btn-' + i, T`Tut: ${n} kişi (${n * price} Dinar)`);
    },

    hireMercs(locId, idx, n) {
        let loc = LOCATIONS.find(l => l.id === locId);
        let pool = this.mercPool(loc);
        let m = pool.list[idx];
        if(!m) return;
        let price = this.mercPrice(m);
        n = Math.min(n, m.count, Math.max(0, this.getPartyCapacity() - state.player.party.length), Math.floor(state.player.money / price));
        if(n < 1) return alert(T('Alacak adam yok.'));
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
        let m = { surgery:T('Cerrahlık'), spotting:T('Gözcülük'), pathfinding:T('Yol Bulma'), trade:T('Ticaret'),
                  looting:T('Yağma'), trainer:T('Eğitim'), prisonerMgmt:T('Esir Yönetimi'),
                  oneHanded:T('Tek El'), twoHanded:T('Çift El'), polearm:T('Mızrak'), bow:T('Okçuluk'),
                  riding:T('Binicilik'), athletics:T('Atletizm'), leadership:T('İdare'), persuasion:T('İkna') };
        return m[id] || id;
    },

    hireCompanion(cid) {
        let c = COMPANIONS.find(x => x.id === cid);
        if(!c || state.player.party.some(t => t.companionId === cid)) return;
        if(state.player.party.length >= this.getPartyCapacity()) return alert(T('Grubun dolu. "Kalabalığa karışmam ben."'));
        let rival = c.dislikes.map(d => state.player.party.find(t => t.companionId === d)).find(Boolean);
        // ponytail: husumet katılmayı engeller; Warband'daki "sonradan çekip gitme"
        // için grup içi olay sistemi gerekirdi, bu kadarı hikâyeyi veriyor.
        if(rival) return alert(T`"${T(rival.name)} mi? O adamla aynı çadırda uyumam." (Katılmadı)`);
        if(state.player.money < c.cost) return alert(T('Kesen yetmiyor. "Bedavaya kimse kılıç sallamaz."'));
        state.player.money -= c.cost;
        state.player.party.push({
            id: 'comp_' + c.id, companionId: c.id, isCompanion: true,
            name: c.name, level: c.level, xp: 0, xpNext: 3 + c.level
        });
        this.updateTopBar();
        alert(T`${T(c.name)} gruba katıldı. ${this.profName(c.skill)} yeteneği artık grubuna işliyor (seviye ${c.level}).`);
        if(this._tavernLoc) this.openTavern(this._tavernLoc);
    },

    learnPoem(pid) {
        let p = POEMS.find(x => x.id === pid);
        if(state.player.poems.includes(pid)) return;
        if(state.player.money < p.cost) return alert(T('Ozan kadehini kaldırmadı. Paran yetmiyor.'));
        state.player.money -= p.cost;
        state.player.poems.push(pid);
        this.updateTopBar();
        alert(T`${T(p.text)}\n\nOzan üç kez tekrarlattı. Artık ezberinde.`);
        if(this._tavernLoc) this.openTavern(this._tavernLoc);
    },
    restAtTavern() {
        if(state.player.money >= 10) {
            state.player.money -= 10;
            state.player.stats.hp = state.player.stats.maxHp;
            this.advanceTime(8);   // dinlenmek de zaman yer (#53/1.1)
            this.updateTopBar(); this.closeModal();
            alert(T('Bir gece handa kaldın (8 saat). Canın tamamen yenilendi.'));
        } else alert(T('Yeterli dinarın yok!'));
    },

    // --- ARENA (#26) ---
    // Warband'daki gibi turnuvadan bağımsız, her zaman açık pratik dövüşü.
    // Ganimet ve nam vermez; parası da yoktur — karşılığı yeterlilik XP'si ve zamandır.
    ARENA_BET_MAX: 1000,
    openArena(loc) {
        let lv = state.player.stats.level;
        this.showModal(`<h3>${T`🤺 ${T(loc.name)} Arenası`}</h3>
        <p style="color:var(--text-muted)">${T`Kum meydanında tahta silahlarla dövüşülür. Ganimet, nam ve esaret yok —
        kazanan da kaybeden de kendi ayağıyla çıkar. Kazandığın tek şey <b>yeterlilik</b>, ödediğin tek bedel <b>zaman</b>.`}</p>
        <div class="action-list" style="margin-top:1rem">
            ${Battle.ARENA_FOES.map((f, i) => `<button class="btn" onclick="Game.startArena(${i})">
                <b>${T(f.name)}</b> <span style="color:var(--text-muted)">${T`· Sv. ${Math.max(1, lv + f.dLv)} · ~${f.xp} XP`}</span>
                <div style="font-size:0.8rem;color:var(--text-muted)">${T(f.desc)}</div></button>`).join('')}
        </div>`);
    },
    startArena(idx) { this.closeModal(); Battle.startArena(idx); },
    finishArena(foe, won) {
        let wp = state.player.equipment.weapon ? state.player.equipment.weapon.weaponType : 'oneHanded';
        if(!state.player.proficiencies[wp]) wp = 'oneHanded';
        let xp = won ? foe.xp : Math.round(foe.xp * 0.4);
        let moveProf = state.player.equipment.horse ? 'riding' : 'athletics';
        this.addProficiencyXp(wp, xp);
        this.addProficiencyXp(moveProf, Math.round(xp * 0.6));
        // Bedeli zamandır: kazanınca birkaç saat, kaybedince bir gün hasta yatağı.
        this.advanceTime(won ? 3 : 24);
        this.updateTopBar();
        alert((won ? T`${T(foe.name)} kumun üstünde kaldı, kalabalık ıslık çalıyor.`
                   : T`${T(foe.name)} seni yere serdi. Bir gün kendine gelemedin.`)
            + T`\n\n+${xp} ${this.profName(wp)}, +${Math.round(xp * 0.6)} ${this.profName(moveProf)} yeterlilik XP'si.`
            + T`\nArena para vermez — burada yalnız ustalık kazanılır.`);
    },

    // --- TOURNAMENT ---
    joinTournament(loc) {
        if(!state.activeTournaments[loc.id]) {
            this.showModal(`<h3>${T`🏆 Turnuva Alanı</h3><p>Şu anda bu şehirde turnuva düzenlenmiyor.`}</p>`);
            return;
        }
        let max = Math.min(this.ARENA_BET_MAX, state.player.money);
        let TM = TournamentMinigame;
        this.showModal(`<h3>${T`🏆 ${T(loc.name)} Turnuvası!</h3>
        <p><b>${TM.ROUNDS} tur</b> — her turda kuradan <b>rastgele bir ekipman</b> çıkar; kiminde hedef küçülür, kiminde büyür.</p>
        <p>Şampiyonluk ödülü: <b>500 Dinar</b> ve <b>+20 Nam</b>. Elenirsen turnuva sona erer.`}</p>
        <div style="margin-top:1rem;padding:0.8rem;border:1px solid var(--panel-border);border-radius:8px">
            <b>${T`🎲 Bahis`}</b> <span style="color:var(--text-muted);font-size:0.85rem">${T`— kendi kazanmana yatırırsın, oran tur ilerledikçe katlanır.`}</span>
            <div style="display:flex;gap:0.5rem;margin:0.5rem 0;font-size:0.85rem;color:var(--text-muted);flex-wrap:wrap">
                ${TM.ODDS.map((o, i) => `<span>${i === TM.ROUNDS ? T('🏆 Şampiyon') : T`${i + 1}. turda elenme`}: <b style="color:${o >= 1 ? 'var(--success)' : 'var(--danger)'}">×${o}</b></span>`).join(' · ')}
            </div>
            <label>${T`Yatırılacak:`} <input type="number" id="tourney-bet" value="0" min="0" max="${max}" step="50"
                style="width:110px;padding:0.3rem"></label>
            <span style="color:var(--text-muted);font-size:0.85rem">${T`(en fazla ${max} dinar)`}</span>
        </div>
        <button class="btn primary" style="margin-top:1rem" onclick="Game.startTournament('${loc.id}')">${T`⚔️ Arenaya Çık!`}</button>`);
    },
    startTournament(locId) {
        let el = document.getElementById('tourney-bet');
        let bet = Math.max(0, Math.min(Math.min(this.ARENA_BET_MAX, state.player.money), Math.floor(+(el && el.value) || 0)));
        this.closeModal();
        delete state.activeTournaments[locId];
        state.player.money -= bet;
        this.updateTopBar();
        TournamentMinigame.start({ bet });
    },

    // Garnizon refahla büyür — kuşatma ekranı da harita künyesi de aynı sayıyı kullanır
    // ============ DİPLOMASİ ============
    // Krallıklar birbirine savaş açar, barışır; lord partileri cephede çarpışır,
    // yerleşimler el değiştirir. Tek veri: state.wars = { 'a|b': başlangıç günü }.
    warKey(a, b) { return [a, b].sort().join('|'); },
    atWar(a, b) { return !!(a && b && a !== b && state.wars[this.warKey(a, b)]); },
    warsOf(f) {
        if(!f) return [];
        return Object.keys(state.wars).filter(k => k.split('|').indexOf(f) !== -1)
                     .map(k => k.split('|').find(x => x !== f));
    },
    // Bağımsız oyuncunun da bir bayrağı vardır ('player'): yoksa `atWar` hep false dönüyor,
    // düşman şehrin pazarı açık kalıyor ve düşman lord yanından geçip gidiyordu (#48).
    playerFaction() { return state.player.vassalOf || 'player'; },
    factionName(f) {
        if(f === 'player') return (state.player.name || T('Bağımsız')) + T(' Bölüğü');
        return T((FACTIONS[f] || { name: f || T('Bağımsız') }).name);
    },
    // Haber akışı; oyuncunun krallığını ilgilendiren olay ayrıca bildirim olur
    news(msg, mine) {
        state.warLog.unshift({ day: state.time.day, msg });
        if(state.warLog.length > 20) state.warLog.pop();
        if(mine) alert(msg);
    },
    declareWar(a, b) {
        if(!a || !b || a === b || this.atWar(a, b) || this.allied(a, b)) return;
        state.wars[this.warKey(a, b)] = state.time.day;
        let mine = this.playerFaction() === a || this.playerFaction() === b;
        this.news(T`⚔️ ${this.factionName(a)} ile ${this.factionName(b)} savaşa girdi.`, mine);
    },
    makePeace(a, b) {
        if(!this.atWar(a, b)) return;
        delete state.wars[this.warKey(a, b)];
        let mine = this.playerFaction() === a || this.playerFaction() === b;
        this.news(T`🕊️ ${this.factionName(a)} ile ${this.factionName(b)} barış imzaladı.`, mine);
    },
    // ---- İTTİFAK ----
    // Müttefikler birbirine savaş açmaz; birinin düşmanı diğerinin de düşmanı olur.
    allied(a, b) { return !!(a && b && a !== b && state.allies[this.warKey(a, b)]); },
    alliesOf(f) {
        if(!f) return [];
        return Object.keys(state.allies).filter(k => k.split('|').indexOf(f) !== -1)
                     .map(k => k.split('|').find(x => x !== f));
    },
    makeAlliance(a, b) {
        if(!a || !b || a === b || this.allied(a, b) || this.atWar(a, b)) return;
        state.allies[this.warKey(a, b)] = state.time.day;
        let mine = this.playerFaction() === a || this.playerFaction() === b;
        this.news(T`🤝 ${this.factionName(a)} ile ${this.factionName(b)} ittifak kurdu.`, mine);
        // İttifakın bedeli: müttefikin cephesi senin cephen olur
        this.warsOf(a).concat(this.warsOf(b)).forEach(f => {
            if(f === a || f === b) return;
            this.declareWar(a, f); this.declareWar(b, f);
        });
    },
    breakAlliance(a, b) {
        if(!this.allied(a, b)) return;
        delete state.allies[this.warKey(a, b)];
        this.news(T`💔 ${this.factionName(a)} ile ${this.factionName(b)} ittifakı bozuldu.`,
                  this.playerFaction() === a || this.playerFaction() === b);
    },

    // ---- MAREŞAL VE SEFER ----
    // Savaştaki krallık bir mareşal seçer ve tek bir hedefe yürür: lord partileri
    // artık rastgele düşman yerleşimine dağılmaz, ordu toplanır (updateNPCs).
    // Vassal olan oyuncu sefere çağrılır — söz verip gitmemek en pahalı seçenektir.
    pickMarshal(f) {
        let ps = state.npcParties.filter(n => n.lordId && n.faction === f && n.size > 0);
        // Kral sancağı taşır, mareşallik başka bir lorda verilir
        let lords = ps.filter(n => (Nobles.lord(n.lordId) || {}).rank !== 'king');
        return (lords.length ? lords : ps).sort((a, b) => b.size - a.size)[0] || null;
    },
    campaignTick() {
        for(let f in state.campaigns) {
            let c = state.campaigns[f];
            let loc = LOCATIONS.find(l => l.id === c.targetLocId);
            // Orduyla birlikte yürüdüysen sayılır — günde bir kez örneklenir
            if(c.pledged && loc && this.dist(state.player, loc) < 1200) c.helped = true;
            if(!loc || !this.atWar(f, loc.faction) || state.time.day - c.day > 25) { this.endCampaign(f); continue; }
            // Sefer işareti haritada durur (Nobles.drawMarkers 3 günde siler, her gün tazeleniyor)
            if(c.pledged) state.knownLocations['campaign'] =
                { x: loc.x, y: loc.y, radius: 200, day: state.time.day, name: T`Sefer: ${T(loc.name)}` };
        }
        Object.keys(FACTIONS).forEach(f => {
            // Biten seferin ödül modalini yeni sefer çağrısı ezmesin
            if(state.time.day - (state.campaignCooldown[f] || -99) < 3) return;
            if(state.campaigns[f] || !this.warsOf(f).length || Math.random() > 0.25) return;
            let marshal = this.pickMarshal(f);
            if(!marshal) return;
            let target = LOCATIONS.filter(l => l.type !== 'village' && this.atWar(f, l.faction))
                                  .sort((a, b) => this.dist(a, marshal) - this.dist(b, marshal))[0];
            if(!target) return;
            state.campaigns[f] = { marshalId: marshal.lordId, marshalName: marshal.name,
                                   targetLocId: target.id, day: state.time.day };
            this.news(T`🎖️ ${T(marshal.name)} mareşal seçildi — ${this.factionName(f)} ordusu ${T(target.name)} üzerine yürüyor.`);
            if(f === this.playerFaction() && f !== 'player_kingdom') this.summonToArms(f);
        });
    },
    endCampaign(f) {
        let c = state.campaigns[f];
        if(!c) return;
        delete state.campaigns[f];
        state.campaignCooldown[f] = state.time.day;
        let loc = LOCATIONS.find(l => l.id === c.targetLocId);
        let won = loc && loc.faction === f;
        this.news(won ? T`🎖️ ${this.factionName(f)} seferi ${T(loc.name)} ile taçlandı.`
                      : T`🏳️ ${this.factionName(f)} ordusu dağıldı, sefer sonuçsuz kaldı.`);
        if(c.pledged === undefined || f !== this.playerFaction()) return;
        delete state.knownLocations['campaign'];
        if(!c.pledged) return;                       // reddedenin bedeli çağrı anında ödendi
        let king = LORDS.find(l => l.faction === f && l.rank === 'king');
        let lords = LORDS.filter(l => l.faction === f);
        if(c.helped && won) {
            state.player.renown += 15;
            lords.forEach(l => Nobles.addRel(l.id, 8));
            alert(T`Sefer taçlandı: ${T(loc.name)} alındı ve sen oradaydın.\n+15 nam, ${this.factionName(f)} lordlarıyla +8 ilişki.`);
        } else if(c.helped) {
            state.player.renown += 5;
            lords.forEach(l => Nobles.addRel(l.id, 3));
            alert(T`Sefer sonuç vermedi ama sancağın ordunun yanındaydı.\n+5 nam, lordlarla +3 ilişki.`);
        } else {
            if(king) Nobles.addRel(king.id, -8);
            lords.forEach(l => Nobles.addRel(l.id, -3));
            this.addHonor('oathBroken');   // tutulmayan söz şerefi yer (#53/1.5)
            alert(T`Sefere katılacağını söyleyip ordunun yanına hiç gitmedin.\n${king ? T(king.name) : T('Kralın')} −8, diğer lordlar −3 ilişki, −5 şeref.`);
        }
    },
    summonToArms(f) {
        let c = state.campaigns[f];
        let loc = LOCATIONS.find(l => l.id === c.targetLocId);
        let king = LORDS.find(l => l.faction === f && l.rank === 'king');
        this.showModal(`<h3>${T`🎖️ Sefer Çağrısı</h3>
        <p>${king ? T(king.name) : T('Kralın')} bütün derebeylerini sancağı altında topluyor.
        <b>${T(c.marshalName)}</b> mareşal seçildi; ordu <b>${T(loc.name)}</b> üzerine yürüyor.`}</p>
        <p style="color:var(--text-muted)">${T`Katılırsan hedefin yakınında bulunman gerekir — harita
        sefer işaretini gösterir. Söz verip gitmemek, çağrıyı baştan reddetmekten pahalıdır.`}</p>
        <div style="display:flex;gap:1rem;margin-top:1rem">
        <button class="btn primary" onclick="Game.answerSummons(true)">${T`⚔️ Sefere Katıl`}</button>
        <button class="btn" onclick="Game.answerSummons(false)">${T`🚪 Reddet`}</button></div>`);
    },
    answerSummons(join) {
        let f = this.playerFaction(), c = state.campaigns[f];
        this.closeModal();
        if(!c) return;
        c.pledged = !!join;
        if(join) return alert(T('Sancağını kaldırdın. Ordunun hedefine yürü — sefer işareti haritada.'));
        LORDS.filter(l => l.faction === f).forEach(l => Nobles.addRel(l.id, -5));
        alert(T('Çağrıyı geri çevirdin. Krallığın bütün lordlarıyla ilişkin −5.'));
    },

    // Dünya kurulurken bir cephe açık başlar (Kalradya hiç sakin değildir)
    initDiplomacy() {
        if(state.warSeeded) return;
        state.warSeeded = true;
        let fs = Object.keys(FACTIONS).filter(f => f !== 'player_kingdom');
        let a = fs[Math.floor(Math.random() * fs.length)];
        let b = fs.filter(f => f !== a)[Math.floor(Math.random() * (fs.length - 1))];
        state.wars[this.warKey(a, b)] = 1;
        state.warLog.unshift({ day: 1, msg: T`⚔️ ${this.factionName(a)} ile ${this.factionName(b)} savaş hâlinde.` });
    },
    // Günlük zar: uzayan savaşlar barışla biter, iki cepheden fazlası açılmaz
    diplomacyTick() {
        for(let k in state.wars) {
            let len = state.time.day - state.wars[k], p = k.split('|');
            // İki toprağa düşen krallık barış için yalvarır — yoksa eziliyor
            // 'player' toprağı olmayan bir bayraktır; "iki toprağa düşen barış ister" kuralına girmez
            let weak = p.some(f => f !== 'player' && LOCATIONS.filter(l => l.type !== 'village' && l.faction === f).length <= 2);
            if(len >= (weak ? 5 : 15) && Math.random() < (weak ? 0.25 : 0.06 + len * 0.004)) this.makePeace(p[0], p[1]);
        }
        // Ortak düşmanı olan iki barışık krallık el sıkışır
        if(Math.random() < 0.05) {
            let fs = Object.keys(FACTIONS).filter(f => f !== 'player_kingdom');
            let pairs = [];
            fs.forEach(a => fs.forEach(b => {
                if(a >= b || this.atWar(a, b) || this.allied(a, b)) return;
                if(this.warsOf(a).some(x => this.warsOf(b).indexOf(x) !== -1)) pairs.push([a, b]);
            }));
            let p = pairs[Math.floor(Math.random() * pairs.length)];
            if(p) this.makeAlliance(p[0], p[1]);
        }
        // Eskiyen ittifak dağılır
        for(let k in state.allies) {
            if(state.time.day - state.allies[k] > 25 && Math.random() < 0.05) {
                let p = k.split('|'); this.breakAlliance(p[0], p[1]);
            }
        }
        if(Math.random() < 0.10) {
            let fs = Object.keys(FACTIONS).filter(f => this.warsOf(f).length < 2);
            let a = fs[Math.floor(Math.random() * fs.length)];
            let cand = fs.filter(f => f !== a && !this.atWar(a, f));
            let b = cand[Math.floor(Math.random() * cand.length)];
            if(a && b) this.declareWar(a, b);
        }
    },
    // Cephe: karşılaşan düşman lord partileri çarpışır, güçlü olan düşman
    // yerleşimini alır. Günde bir kez, oyuncudan bağımsız işler.
    warTick() {
        if(!Object.keys(state.wars).length) return;
        let parties = state.npcParties.filter(n => n.lordId && n.faction);
        for(let i = 0; i < parties.length; i++) {
            for(let j = i + 1; j < parties.length; j++) {
                let A = parties[i], B = parties[j];
                if(A.size <= 0 || B.size <= 0) continue;
                if(!this.atWar(A.faction, B.faction)) continue;
                if(this.dist(A, B) > 700) continue;
                this.resolveFieldBattle(A, B);
            }
        }
        LOCATIONS.forEach(loc => {
            if(loc.type === 'village') return;
            // Sefer sistemi orduları tek hedefte topladığı için fetih hızlandı; son
            // şehrini/kalesini de kaptıran krallık haritadan siliniyordu. Son toprak
            // alınamaz — o krallık artık barışa zorlanır (diplomacyTick).
            if(LOCATIONS.filter(l => l.type !== 'village' && l.faction === loc.faction).length <= 1) return;
            let g = this.garrisonOf(loc);
            let atk = parties.find(p => p.size > 0 && this.atWar(p.faction, loc.faction)
                                        && this.dist(p, loc) < 500 && p.size > g * 1.3);
            if(!atk) return;
            // Kuşatma bir günde bitmez: ordunun 3 gün kapıda beklemesi gerekir.
            // Yoksa yoldan geçen her lord kaleyi kapıyordu (ölçüldü: 200 günde 38
            // el değiştirme, iki krallık silinmişti).
            if(atk.siegeLocId !== loc.id) { atk.siegeLocId = loc.id; atk.siegeDays = 1; return; }
            atk.siegeDays = (atk.siegeDays || 1) + 1;
            // Yeni düşen kale hemen geri alınamaz
            if(state.time.day - (loc.capturedDay || -99) < 10) return;
            if(atk.siegeDays < 3) return;
            atk.siegeLocId = null; atk.siegeDays = 0;
            this.captureSettlement(loc, atk);
        });
        // Dağılan partiler haritadan silinir, birkaç gün sonra evinde toparlanır
        state.npcParties.filter(n => n.size <= 0 && n.lordId).forEach(n => {
            state.lordRespawn[n.lordId] = state.time.day + 4 + Math.floor(Math.random() * 6);
        });
        state.npcParties = state.npcParties.filter(n => !(n.lordId && n.size <= 0));
    },
    resolveFieldBattle(A, B) {
        let pw = p => p.size * (1 + (p.level || 1) * 0.05) * (0.75 + Math.random() * 0.5);
        let win = pw(A) >= pw(B) ? A : B, lose = win === A ? B : A;
        win.size = Math.max(5, Math.round(win.size * (0.80 + Math.random() * 0.12)));
        lose.size = Math.round(lose.size * (0.25 + Math.random() * 0.25));
        // Cephe çarpışması günde birkaç kez olur: yalnızca bir parti dağılırsa
        // habere girer, bildirim hiç çıkmaz (yoksa savaşta her gün modal yerdin).
        if(lose.size < 8) {
            lose.size = 0;
            this.news(T`🩸 ${T(win.name)} (${this.factionName(win.faction)}), ${T(lose.name)} kuvvetlerini dağıttı.`);
        }
    },
    captureSettlement(loc, atk) {
        let old = loc.faction;
        let wasMine = loc.owner === 'player';
        loc.faction = atk.faction;
        loc.capturedDay = state.time.day;
        atk.size = Math.max(10, Math.round(atk.size * 0.6));   // kuşatma orduyu yer
        // Kalenin/şehrin çevresindeki köyler de el değiştirir
        this.villagesOf(loc).filter(l => l.faction === old)
            .forEach(l => { l.faction = atk.faction; l.owner = null; });
        // Savunmasız bıraktığın tımar elden çıkar; garnizonun kılıçtan geçer
        // ponytail: depo el değiştirmez — yeni sahibi mahzeni bulamamış sayılır
        let lostFief = '';
        if(wasMine) {
            let lost = (loc.garrison || []).length;
            loc.owner = null; loc.garrison = [];
            lostFief = `<br><b style="color:#e0463a">${T`⚔️ ${T(loc.name)} senin tımarındı!`}</b> `
                + (lost ? T`${lost} kişilik garnizonun kılıçtan geçti.` : T('Garnizonsuz bıraktığın tımar bir gün bile dayanmadı.'));
        }
        let mine = wasMine || [old, atk.faction].indexOf(this.playerFaction()) !== -1;
        this.news(T`🏰 ${T(loc.name)}, ${this.factionName(old)}'ndan alındı — artık ${this.factionName(atk.faction)} toprağı.${lostFief}`, mine);
    },
    // Diplomasi ekranı: kim kiminle savaşta, kimin kaç toprağı var, son haberler
    showDiplomacy() {
        let rows = Object.keys(FACTIONS).map(f => {
            let foes = this.warsOf(f);
            let holds = LOCATIONS.filter(l => l.faction === f).length;
            return `<div style="display:flex;gap:0.6rem;align-items:baseline;padding:0.35rem 0;border-bottom:1px solid var(--panel-border)">
                <span style="color:${FACTIONS[f].color};font-weight:600;min-width:150px">${T(FACTIONS[f].name)}</span>
                <span style="color:var(--text-muted);min-width:70px">${T`${holds} toprak`}</span>
                <span>${foes.length ? '⚔️ ' + foes.map(x => this.factionName(x)).join(', ')
                                    : T('<span style="color:#2ecc71">🕊️ Barış içinde</span>')}${
                    this.alliesOf(f).length ? ` <span style="color:#6fc3ff">🤝 ${this.alliesOf(f).map(x => this.factionName(x)).join(', ')}</span>` : ''
                }</span></div>`;
        }).join('');
        // Yürüyen seferler: kim mareşal, ordu nereye gidiyor
        let camps = Object.keys(state.campaigns).map(f => {
            let c = state.campaigns[f], t = LOCATIONS.find(l => l.id === c.targetLocId);
            return `<div style="padding:0.3rem 0;border-bottom:1px solid var(--panel-border)">
                <span style="color:${(FACTIONS[f]||{}).color||'#fff'};font-weight:600">${this.factionName(f)}</span>
                — 🎖️ ${T(c.marshalName)} → <b>${t ? T(t.name) : '?'}</b>
                ${c.pledged ? T('<span style="color:#2ecc71">· sancağın orada</span>')
                            : c.pledged === false ? T('<span style="color:var(--danger)">· çağrıyı reddettin</span>') : ''}</div>`;
        }).join('');
        let log = state.warLog.length
            ? state.warLog.map(n => `<div style="padding:0.2rem 0"><span style="color:var(--text-muted)">${T`${n.day}. gün`}</span> — ${n.msg}</div>`).join('')
            : T('<p style="color:var(--text-muted)">Henüz haber yok.</p>');
        let mine = this.playerFaction();
        this.showModal(`<h3>${T`🌍 Kalradya'nın Hâli`}</h3>
            ${mine === 'player'
                ? `<p style="color:var(--text-muted)">${T`Bağımsızsın — kimseye yemin etmedin.${this.warsOf('player').length
                    ? ` <b style="color:var(--danger)">${T`Düşmanın: ${this.warsOf('player').map(x => this.factionName(x)).join(', ')}`}</b> ${T`— şehirlerine giremezsin, lordları üstüne gelir.`}` : ''}`}</p>`
                : `<p style="color:var(--text-muted)">${T`Bağlılığın:`} <b style="color:${(FACTIONS[mine]||{}).color||'#fff'}">${this.factionName(mine)}</b>${this.warsOf(mine).length ? T(' — savaştasın!') : ''}</p>`}
            ${rows}
            ${this.grudgeList().length ? `<h3 style="margin-top:1rem">${T`🩸 Kan Davaları`}</h3>`
                + this.grudgeList().map(id => {
                    let l = (typeof LORDS !== 'undefined' ? LORDS.find(x => x.id === id) : null) || { name: id };
                    let left = this.GRUDGE_DAYS - (state.time.day - state.grudges[id]);
                    return `<div style="padding:0.3rem 0;border-bottom:1px solid var(--panel-border)">
                        ${T`<b style="color:var(--danger)">${T(l.name)}</b> seni arıyor — <span style="color:var(--text-muted)">${left} gün daha</span>`}</div>`;
                }).join('') : ''}
            ${this.myFiefs().length ? `<h3 style="margin-top:1rem">${T`🏰 Tımarların`}</h3>` + this.myFiefs().map(l =>
                `<div style="display:flex;gap:0.6rem;align-items:baseline;padding:0.3rem 0;border-bottom:1px solid var(--panel-border)">
                    <span style="min-width:150px;font-weight:600">${T(l.name)}</span>
                    <span style="color:var(--text-muted);min-width:70px">${l.type === 'city' ? T('Şehir') : l.type === 'castle' ? T('Kale') : T('Köy')}</span>
                    <span style="color:#ffcc00;min-width:110px">${T`+${this.fiefTax(l)} dinar/gün`}</span>
                    <span style="color:${(l.garrison || []).length ? '#2ecc71' : '#e0463a'}">${T`🛡️ ${(l.garrison || []).length} garnizon`}</span>
                    ${this.vassals().length && l.type !== 'village' ? `<button class="btn" style="padding:0.1rem 0.5rem;font-size:0.75rem" onclick="Game.grantFiefMenu('${l.id}')">${T`👑 Vassala ver`}</button>` : ''}
                </div>`).join('') + `<div style="padding:0.4rem 0;color:var(--text-muted)">Toplam: +${this.fiefIncome().tax} vergi${this.fiefIncome().tribute ? T` · +${this.fiefIncome().tribute} haraç` : ''} · −${this.fiefIncome().wage} garnizon maaşı · <b style="color:${this.fiefIncome().net >= 0 ? '#2ecc71' : '#e0463a'}">net ${this.fiefIncome().net >= 0 ? '+' : ''}${this.fiefIncome().net}</b> ${T`dinar/gün`}</div>` : ''}
            ${this.vassals().length ? `<h3 style="margin-top:1rem">${T`👑 Vassalların`}</h3>` + this.vassals().map(v =>
                `<div style="display:flex;gap:0.6rem;align-items:baseline;padding:0.3rem 0;border-bottom:1px solid var(--panel-border)">
                    <span style="min-width:150px;font-weight:600">${T(v.name)}</span>
                    <span style="color:var(--text-muted);min-width:110px">${T`İlişki: ${Nobles.rel(v.id)}`}</span>
                    <span>${this.fiefsOf(v.id).length ? this.fiefsOf(v.id).map(l => T(l.name)).join(', ')
                        : T('<span style="color:#e0463a">topraksız — küskün</span>')}</span>
                </div>`).join('') : ''}
            ${camps ? `<h3 style="margin-top:1rem">${T`🎖️ Yürüyen Seferler`}</h3>${camps}` : ''}
            <h3 style="margin-top:1rem">${T`📜 Haberler`}</h3>
            <div style="max-height:220px;overflow:auto;font-size:0.92rem">${log}</div>
            <button class="btn" style="margin-top:1rem" onclick="Game.closeModal()">${T`Kapat`}</button>`, '640px');
    },

    garrisonOf(loc) {
        // Senin tımarında garnizon bir formül değil, oradaki gerçek askerlerdir (#23)
        if(loc.owner === 'player') return (loc.garrison || []).length;
        let base = loc.type === 'city' ? 30 : loc.type === 'castle' ? 15 : 0;
        return Math.round(base * (0.6 + (loc.prosperity || 50) / 125));
    },

    // --- TIMAR YÖNETİMİ (#23) ---
    // Fethettiğin yerleşim artık bayrak değişikliğinden ibaret değil: garnizon
    // bırakırsın (maaşını sen ödersin), günlük vergi getirir, depoya erzak koyarsın.
    // Savunmasız bıraktığın tımarı düşman lordlar geri alır (warTick → captureSettlement).
    myFiefs() { return LOCATIONS.filter(l => l.owner === 'player'); },
    // --- İŞLETME (#53 madde 1.6) ---
    // Warband'ın işletmesi: tek seferlik büyük bedel, günlük küçük gelir. Tımar gibi
    // fiefIncome'dan geçer; şehir el değiştirirse gelir kesilir (mülk kalır, kâr durur).
    ENTERPRISE_COST: 3000,
    enterpriseIncome(loc) { return Math.round((loc.prosperity || 50) * 0.55); },
    myEnterprises() { return LOCATIONS.filter(l => l.enterprise); },
    // Düşman eline geçen şehirdeki işletme çalışmaz
    enterpriseWorks(loc) { return !!loc.enterprise && !this.atWar(this.playerFaction(), loc.faction); },
    buyEnterprise(loc) {
        if(loc.enterprise) {
            return alert(T`${T(loc.name)}'daki işletmen günde +${this.enterpriseIncome(loc)} dinar getiriyor.`
                + (this.enterpriseWorks(loc) ? '' : T('\nAma şehirle savaştasın: kapılar kapalı, kazanç duruyor.')));
        }
        if(state.player.money < this.ENTERPRISE_COST) return alert(T('Yeterli dinarın yok!'));
        state.player.money -= this.ENTERPRISE_COST;
        loc.enterprise = true;
        this.updateTopBar(); this.enterLocation(loc);
        let inc = this.enterpriseIncome(loc);
        alert(T`${T(loc.name)}'da bir işletme açtın.\nGünde +${inc} dinar — kendini ${Math.ceil(this.ENTERPRISE_COST / inc)} günde amorti eder.`);
    },

    fiefTax(loc) { return Math.round((loc.prosperity || 50) * (loc.type === 'city' ? 2 : loc.type === 'castle' ? 0.7 : 1)); },
    troopWage(t) { return t.isCompanion ? 20 : t.level >= 51 ? 0 : t.level >= 20 ? Math.floor(t.level / 2) : t.level >= 10 ? 2 : 0; },
    fiefIncome() {
        let tax = 0, wage = 0, troops = 0;
        this.myFiefs().forEach(l => {
            tax += this.fiefTax(l);
            (l.garrison || []).forEach(t => { wage += this.troopWage(t); troops++; });
        });
        // Vassalın tımarı kasana doğrudan girmez, haraç olarak bir payı gelir (#40)
        let tribute = this.vassals().reduce((a, v) =>
            a + this.fiefsOf(v.id).reduce((b, l) => b + Math.round(this.fiefTax(l) * this.VASSAL_TRIBUTE), 0), 0);
        // İşletme geliri de günlük akışın parçası (#53/1.6)
        let trade = this.myEnterprises().reduce((a, l) => a + (this.enterpriseWorks(l) ? this.enterpriseIncome(l) : 0), 0);
        return { tax, tribute, trade, wage, troops, net: tax + tribute + trade - wage };
    },
    // Fetihten sonra: yerleşim senin tımarın olur, çevresindeki köyler de bayrak değiştirir
    grantFief(loc, oldFaction) {
        loc.owner = 'player';
        loc.capturedDay = state.time.day;
        loc.garrison = loc.garrison || [];
        this.villagesOf(loc).filter(l => l.faction === oldFaction)
            .forEach(l => { l.faction = loc.faction; l.owner = 'player'; });
    },

    // --- VASSALLAR (#40) ---
    // Kral olunca tımar tek başına taşınacak bir yük olmaktan çıkar: toprak vererek
    // lord tutarsın. Vassal senin bayrağınla savaşır (partisinin fraksiyonu değişir),
    // tımarını kendi garnizonuyla savunur ve vergisinin bir payını haraç olarak öder.
    VASSAL_TRIBUTE: 0.3,
    VASSAL_REL: 25,
    isKing() { return state.player.vassalOf === 'player_kingdom'; },
    vassals() { return typeof LORDS === 'undefined' ? [] : LORDS.filter(l => (state.vassals || []).indexOf(l.id) !== -1); },
    fiefsOf(lordId) { return LOCATIONS.filter(l => l.owner === lordId); },
    // LORDS kayda yazılmaz; lordun bayrağı her yüklemede state.vassals'tan geri kurulur
    applyVassals() {
        (state.vassals || []).forEach(id => {
            let l = Nobles.lord(id);
            if(!l) return;
            l.faction = 'player_kingdom';
            let npc = state.npcParties.find(n => n.lordId === id);
            if(npc) { npc.faction = 'player_kingdom'; npc.color = this.bannerColor(); }
        });
    },
    // Lord diyaloğundaki "krallığıma katıl" kapısı: toprak vermeden kimse yemin etmez
    offerVassalage(lordId) {
        let lord = Nobles.lord(lordId), rel = Nobles.rel(lordId);
        let free = this.myFiefs().filter(l => l.type !== 'village');
        if(rel < this.VASSAL_REL)
            return alert(T`${T(lord.name)} sana bağlanacak kadar güvenmiyor.\nGereken ilişki: ${this.VASSAL_REL} (şu an ${rel}).`);
        if(!free.length)
            return alert(T('Toprağı olmayan krala kimse yemin etmez. Önce bir şehir ya da kale fethet — vassal ancak tımar karşılığı gelir.'));
        this.showModal(`<h3>${T`👑 ${T(lord.name)}'e Bağlılık Teklifi`}</h3>
            <p style="color:var(--text-muted)">${T`Hangi tımarı ona veriyorsun? Toprak onun olur:
            vergisinin <b>%${Math.round(this.VASSAL_TRIBUTE * 100)}</b>'i haraç olarak sana gelir, kalanı ve garnizon
            derdi ona kalır. Partisi bundan sonra senin bayrağınla savaşır.`}</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">
            ${free.map(l => `<button class="btn" onclick="Game.grantFiefTo('${l.id}','${lordId}',1)">${T`🏰 ${T(l.name)} (${l.type === 'city' ? T('Şehir') : T('Kale')}) — +${this.fiefTax(l)} dinar/gün`}</button>`).join('')}
            <button class="btn" onclick="Nobles.talk('${lordId}')">${T`Vazgeç`}</button></div>`, '560px');
    },
    grantFiefMenu(locId) {
        let loc = LOCATIONS.find(l => l.id === locId);
        let vs = this.vassals();
        if(!vs.length) return alert(T('Henüz vassalın yok. Lordlarla konuşup krallığına davet et.'));
        this.showModal(`<h3>${T`🏰 ${T(loc.name)} kime veriliyor?`}</h3>
            <p style="color:var(--text-muted)">${T`Tımar vassalın olur; vergisinin %${Math.round(this.VASSAL_TRIBUTE * 100)}'i haraç
            olarak sana gelir. Buradaki <b>${(loc.garrison || []).length}</b> asker onun emrine geçer.`}</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">
            ${vs.map(v => `<button class="btn" onclick="Game.grantFiefTo('${locId}','${v.id}')">${T`👑 ${T(v.name)} — ${this.fiefsOf(v.id).length} tımar · ilişki ${Nobles.rel(v.id)}`}</button>`).join('')}
            <button class="btn" onclick="Game.showDiplomacy()">${T`Vazgeç`}</button></div>`, '560px');
    },
    grantFiefTo(locId, lordId, swear) {
        let loc = LOCATIONS.find(l => l.id === locId), lord = Nobles.lord(lordId);
        if(!loc || !lord || loc.owner !== 'player') return;
        if(swear) {
            let old = lord.faction;
            state.vassals.push(lordId);
            this.applyVassals();
            LORDS.filter(l => l.faction === old).forEach(l => Nobles.addRel(l.id, -10));
            this.news(T`👑 ${T(lord.name)}, ${this.factionName(old)}'dan ayrılıp senin krallığına katıldı.`, true);
        }
        let n = (loc.garrison || []).length;
        loc.owner = lordId;
        loc.garrison = [];
        this.villagesOf(loc).filter(l => l.owner === 'player').forEach(l => l.owner = lordId);
        Nobles.addRel(lordId, 20);
        // Warband'daki kıskançlık: toprak dağıtılırken eli boş kalan vassal küser
        this.vassals().filter(v => v.id !== lordId && !this.fiefsOf(v.id).length)
                      .forEach(v => Nobles.addRel(v.id, -5));
        this.news(T`🏰 ${T(loc.name)} tımarı ${T(lord.name)}'e verildi.`, true);
        this.closeModal();
        alert(T`${T(loc.name)} artık ${T(lord.name)}'in tımarı.\n+20 ilişki${n ? T`, garnizondaki ${n} asker onun emrine geçti` : ''}.\nGünlük haracı: +${Math.round(this.fiefTax(loc) * this.VASSAL_TRIBUTE)} dinar.`);
        this.updateTopBar();
    },
    troopGroups(list) {
        let g = {};
        (list || []).forEach(t => {
            let k = this.troopLabel(t);
            if(!g[k]) g[k] = { sample: t, n: 0 };
            g[k].n++;
        });
        return g;
    },
    openGarrison(loc) {
        loc.garrison = loc.garrison || [];
        let cap = this.getPartyCapacity();
        let btns = (label, dir, max) => [1, 5, max].filter((v, i, a) => v > 0 && a.indexOf(v) === i)
            .map(v => `<button class="btn" style="font-size:0.75rem;padding:0.25rem 0.5rem" onclick="Game.moveGarrison('${loc.id}','${label.replace(/'/g,"\\'")}',${v},'${dir}')">${v === max && max > 5 ? T('Hepsi') : v}</button>`).join(' ');
        let col = (title, groups, dir, empty) => {
            let rows = Object.keys(groups).map(k => {
                let g = groups[k];
                let blocked = dir === 'in' && g.sample.isCompanion;
                return `<li style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;padding:0.35rem 0;border-bottom:1px solid var(--panel-border)">
                    <span>${this.troopStats(g.sample).icon} ${k} <b>x${g.n}</b></span>
                    <span>${blocked ? T('<span style="color:var(--text-muted);font-size:0.75rem">yoldaş kalamaz</span>') : btns(k, dir, g.n)}</span></li>`;
            }).join('');
            return `<div style="flex:1"><h4>${title}</h4><ul style="list-style:none">${rows || `<li style="color:var(--text-muted)">${empty}</li>`}</ul></div>`;
        };
        let inc = this.fiefIncome();
        // Günlük net tek satırda yazsın (#55 madde 9): "elit garnizon zarardır" kuralı
        // belgede duruyordu ama oyuncu ekranda hiçbir yerde görmüyordu.
        let wage = loc.garrison.reduce((a, t) => a + this.troopWage(t), 0), net = this.fiefTax(loc) - wage;
        this.showModal(`<h3>${T`🛡️ ${T(loc.name)} Garnizonu`}</h3>
        <p style="color:var(--text-muted)">${T`Vergi`} <b style="color:#ffcc00">+${this.fiefTax(loc)}</b> ${T`− garnizon maaşı`} <b>${wage}</b> =
           <b style="color:${net >= 0 ? 'var(--success)' : 'var(--danger)'}">${T`${net >= 0 ? '+' : ''}${net} dinar/gün</b>
           (${loc.garrison.length} asker).${net < 0 ? T(' <b>Bu tımar zarar ediyor</b> — ucuz askerle doldurmak doğru hamledir.') : ''}
           <br>Garnizon grup kapasitenden düşmez ama maaşını sen ödersin; düşman kuşatması bu sayıya bakar.`}</p>
        <div style="display:flex;gap:1.5rem;margin-top:0.8rem">
            ${col(T('Grubun (') + state.player.party.length + '/' + cap + ')', this.troopGroups(state.player.party), 'in', T('Yanında asker yok.'))}
            ${col(T('Garnizon'), this.troopGroups(loc.garrison), 'out', T('Kale boş — ilk saldırıda düşer.'))}
        </div>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.8rem">${T`Tüm tımarlarının garnizonu: ${inc.troops} asker · ${inc.wage} dinar/gün`}</p>
        <button class="btn" style="margin-top:0.8rem" onclick="Game.closeModal()">${T`Kapat`}</button>`, '700px');
    },
    moveGarrison(locId, label, n, dir) {
        let loc = LOCATIONS.find(l => l.id === locId);
        if(!loc) return;
        loc.garrison = loc.garrison || [];
        let from = dir === 'in' ? state.player.party : loc.garrison;
        let to = dir === 'in' ? loc.garrison : state.player.party;
        if(dir === 'out') n = Math.min(n, Math.max(0, this.getPartyCapacity() - state.player.party.length));
        for(let i = 0; i < n; i++) {
            let idx = from.findIndex(t => this.troopLabel(t) === label && !(dir === 'in' && t.isCompanion));
            if(idx === -1) break;
            to.push(from.splice(idx, 1)[0]);
        }
        this.openGarrison(loc);
        this.updateTopBar();
    },
    openStorage(loc) {
        loc.storage = loc.storage || [];
        let btns = (id, dir, max) => [1, 5, max].filter((v, i, a) => v > 0 && a.indexOf(v) === i)
            .map(v => `<button class="btn" style="font-size:0.75rem;padding:0.25rem 0.5rem" onclick="Game.moveStorage('${loc.id}','${id}',${v},'${dir}')">${v === max && max > 5 ? T('Hepsi') : v}</button>`).join(' ');
        let col = (title, list, dir, empty) => `<div style="flex:1"><h4>${title}</h4><ul style="list-style:none">${
            list.length ? list.map(i => `<li style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;padding:0.35rem 0;border-bottom:1px solid var(--panel-border)">
                <span>${i.icon} ${T(i.name)} <b>x${i.qty}</b></span><span>${btns(i.id, dir, i.qty)}</span></li>`).join('')
            : `<li style="color:var(--text-muted)">${empty}</li>`}</ul></div>`;
        // Kasa: yenilgide yağmalanmayan tek para (#53 madde 1.2). Depoya para taşımak
        // bir sigortadır — yanında taşıdığın kese ne kadar küçükse yenilgi o kadar ucuz.
        let tre = loc.treasury || 0;
        let money = [100, 500, Math.floor(state.player.money)].filter((v, i, a) => v > 0 && a.indexOf(v) === i);
        let back = [100, 500, tre].filter((v, i, a) => v > 0 && a.indexOf(v) === i);
        this.showModal(`<h3>${T`📦 ${T(loc.name)} Deposu`}</h3>
        <p style="color:var(--text-muted)">${T`Depodaki erzak bozulmaz (bozulma yalnız yanında taşıdığına işler) ve yenilgide yağmalanmaz.`}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;padding:0.5rem 0;border-top:1px solid var(--panel-border);border-bottom:1px solid var(--panel-border)">
            <span>${T`🏦 Kasa:`} <b>${tre}</b> dinar <span style="color:var(--text-muted);font-size:0.8rem">${T`(yenilgide yağmalanmaz)</span></span>
            <span>Yatır: ${money.map(v => `<button class="btn" style="font-size:0.75rem;padding:0.25rem 0.5rem" onclick="Game.moveTreasury('${loc.id}',${v},'in')">${v === money[money.length-1] && money.length > 1 ? T('Hepsi') : v}</button>`).join(' ')}
                  ${tre ? T(' · Çek: ') + back.map(v => `<button class="btn" style="font-size:0.75rem;padding:0.25rem 0.5rem" onclick="Game.moveTreasury('${loc.id}',${v},'out')">${v === back[back.length-1] && back.length > 1 ? T('Hepsi') : v}</button>`).join(' ') : ''}`}</span>
        </div>
        <div style="display:flex;gap:1.5rem;margin-top:0.8rem">
            ${col(T('Yanındakiler'), state.player.inventory, 'in', T('Çantan boş.'))}
            ${col(T('Depo'), loc.storage, 'out', T('Depo boş.'))}
        </div>
        <button class="btn" style="margin-top:0.8rem" onclick="Game.closeModal()">${T`Kapat`}</button>`, '700px');
    },
    moveTreasury(locId, n, dir) {
        let loc = LOCATIONS.find(l => l.id === locId);
        if(!loc) return;
        loc.treasury = loc.treasury || 0;
        let q = dir === 'in' ? Math.min(n, Math.floor(state.player.money)) : Math.min(n, loc.treasury);
        if(q <= 0) return;
        state.player.money += dir === 'in' ? -q : q;
        loc.treasury += dir === 'in' ? q : -q;
        this.openStorage(loc);
        this.updateTopBar();
    },
    myTreasury() { return LOCATIONS.reduce((a, l) => a + (l.owner === 'player' ? (l.treasury || 0) : 0), 0); },
    // Yenilgide kaybedilen kese oranı: kasadaki payın büyükse yağma da küçülür (#53/1.2)
    defeatLootRatio() {
        let safe = this.myTreasury(), carried = Math.max(0, state.player.money);
        let share = safe + carried > 0 ? safe / (safe + carried) : 0;
        return 0.6 + 0.3 * (1 - share);
    },

    moveStorage(locId, itemId, n, dir) {
        let loc = LOCATIONS.find(l => l.id === locId);
        if(!loc) return;
        loc.storage = loc.storage || [];
        let from = dir === 'in' ? state.player.inventory : loc.storage;
        let to = dir === 'in' ? loc.storage : state.player.inventory;
        let src = from.find(i => i.id === itemId);
        if(!src) return;
        let q = Math.min(n, src.qty);
        let dst = to.find(i => i.id === itemId);
        if(dst) dst.qty += q; else to.push({ ...src, qty: q, decay: 0 });
        src.qty -= q;
        if(src.qty <= 0) from.splice(from.indexOf(src), 1);
        this.openStorage(loc);
        this.updateTopBar();
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
        let fname = T((FACTIONS[npc.faction] || { name: 'Bağımsız' }).name);
        let what = bk ? (bk.trade ? `${fname} · ${npc.trade && npc.trade.kind === 'caravan' ? T('Kervan') : T('Köylü kafilesi')}`
                                  : (bk.beast ? T('Yaratık sürüsü') : T('Haydut çetesi')))
                      : fname;
        let unitWord = bk && bk.trade ? (npc.trade && npc.trade.kind === 'caravan' ? T('Muhafız') : T('Kişi')) : T('Asker');
        let html = `${what}<br>${unitWord}: ${npc.size}`;
        if(npc.trade) {
            let d = LOCATIONS.find(l => l.id === npc.trade.toId);
            html += d ? `<br>${T`Hedef: ${T(d.name)}`}` : '';
        }
        if(npc.hunting) {
            let h = npc.hunting === 'player' ? state.player.name
                  : this.npcName(state.npcParties.find(x => x.id === npc.hunting));
            if(h) html += `<br><span style="color:#ffb347">${T`🎯 Peşinde:`}</span> ${h}`;
        }
        // Üstüne gitmeden önce gör: bu çete senin için doyurucu mu (#55 madde 9)
        let prey = this.preyWarning(npc);
        if(prey) html += `<br><span style="color:#cc8800;font-size:0.85em">${prey.replace(/<\/?b>/g, '')}</span>`;
        // Yük yalnız kafilelerde değil, onları soymuş çetede de görünür
        if((npc.cargo || []).filter(c => ITEMS[c.id]).length)
            html += `<br>${T`Yük: ${npc.cargo.filter(c => ITEMS[c.id]).map(c => ITEMS[c.id].icon + ' ×' + c.qty).join(' ')}`}`;
        let pr = state.player.prisoner;
        if(pr && pr.npcId === npc.id) {
            html += `<br><span style="color:#ff8f82">${T`⛓️ Esirleri:</span> ${state.player.name} (sen)`}`
                  + (pr.fellows && pr.fellows.length ? `, ${pr.fellows.join(', ')}` : '');
        }
        return html;
    },
    // Harita künyesi: kimin toprağı, kim yönetiyor, ne kadar zengin, kaç asker bekliyor
    locTipHtml(loc) {
        let f = FACTIONS[loc.faction] || { name: '?' };
        let type = loc.type === 'city' ? T('Şehir') : loc.type === 'castle' ? T('Kale') : T('Köy');
        let pr = Math.round(loc.prosperity || 50);
        let prLbl = pr >= 75 ? T('Zengin') : pr >= 58 ? T('Müreffeh') : pr >= 42 ? T('İdare eder') : T('Yoksul');
        let g = this.garrisonOf(loc);
        let lord = this.ownerLord(loc);
        let rel = lord && typeof Nobles !== 'undefined' ? Nobles.rel(lord.id) : 0;
        let hostile = this.atWar(this.playerFaction(), loc.faction);
        return `${T(f.name)} · ${type}<br>`
            + (lord ? `${T`Sahibi: ${T(lord.name)} (${Nobles.relLabel(rel)})`}<br>` : '')
            + `${T`Refah: ${prLbl}`} <span style="color:var(--text-muted)">(${pr})</span><br>`
            + (g ? `${T`Garnizon: ~${g} asker`}<br>` : '')
            + (loc.volunteersAvailable !== undefined ? `${T`Gönüllü: ${loc.volunteersAvailable} kişi`}<br>` : '')
            + (hostile ? `<span style="color:#e0463a">${T`⚔️ Düşman toprağı — sadece kuşatma`}</span>`
                       : `<span style="color:#2ecc71">${T`Kapılar sana açık`}</span>`);
    },
    // Yenilgide nam kaybı: düşman senden ne kadar zayıfsa rezillik o kadar büyük.
    // pow = düşmanın güç puanı (asker başına seviye+1)
    // Kapılar ulaşılmış nama bakar (#55 madde 9). Tek yenilgi 22 nam yakabiliyor,
    // bu da salon (80) / kız isteme (120) / şölen (150) kapılarının hepsini birden
    // kapatıyordu: şeref kaybı keseyi ve ilişkiyi vurmalı, kapıyı değil.
    // Okuyan herkes aynı anda tepe değeri de günceller — ayrı bir kanca gerekmez.
    peakRenown() {
        let p = state.player;
        return (p.maxRenown = Math.max(p.maxRenown || 0, p.renown || 0));
    },

    defeatRenown(pow) {
        let mine = state.player.stats.level +
                   state.player.party.reduce((a, t) => a + (t.level || 1) + 1, 0);
        let r = Math.min(1, pow / Math.max(1, mine));
        let loss = 2 + Math.round(18 * (1 - r)) + Math.floor((state.player.renown || 0) * 0.02 * (1 - r));
        return Math.min(state.player.renown || 0, loss);
    },

    // --- SIEGE (#25) ---
    // Kuşatma tek tuşla açılan bir meydan savaşı değil: önce kamp kurulur, hazırlık
    // günleri geçer (dünya işler, düşman lordu yardıma gelebilir), sonra surun
    // dibinde saldırılır. Yöntem seçimi hem süreyi hem savunanın avantajını belirler.
    SIEGE_PLANS: {
        ladder: { icon: '🪜', name: 'Merdiven', days: 1, defBonus: 0.40, gaps: 1,
                  desc: 'Bir günde hazırlanır ama tek gedikten girersin — savunan surun ardında güçlüdür (+%40).' },
        tower:  { icon: '🗼', name: 'Kuşatma Kulesi', days: 3, defBonus: 0.15, gaps: 2,
                  desc: 'Üç gün marangozluk ister; kule surda ikinci bir gedik açar, savunanın avantajı erir (+%15).' }
    },
    besiegeLocation(loc, founding = false) {
        let g = this.garrisonOf(loc);
        let plans = Object.keys(this.SIEGE_PLANS).map(k => {
            let p = this.SIEGE_PLANS[k];
            return `<button class="btn" style="display:block;width:100%;text-align:left;margin-bottom:0.5rem"
                onclick="Game.closeModal(); Game.beginSiege('${loc.id}','${k}',${founding})">
                ${p.icon} <b>${T(p.name)}</b> ${T`— ${p.days} gün hazırlık`}
                <br><span style="color:var(--text-muted);font-size:0.82rem">${T(p.desc)}</span></button>`;
        }).join('');
        this.showModal(`<h3>${T`🏰 ${T(loc.name)} Kuşatması</h3>
        <p>Garnizonda tahmini <b>${g}</b> asker var. Kampı kurunca ordun kapıda bekler:
        hazırlık bitene kadar zaman akar, ${this.factionName(loc.faction)} lordları kuşatmayı yarmaya gelebilir.`}</p>
        <p style="color:var(--text-muted);font-size:0.85rem">${T`Hazırlık bitince beklemeye devam edersen garnizonu
        <b>açlığa mahkûm</b> edersin: her gün erir — ama senin ordun da kapıda erzak yer.`}</p>
        ${plans}
        <button class="btn" onclick="Game.closeModal()">${T`Vazgeç`}</button>`);
    },
    beginSiege(locId, plan, founding) {
        let loc = LOCATIONS.find(l => l.id === locId);
        if(!loc) return;
        state.player.siege = { locId, plan, daysLeft: this.SIEGE_PLANS[plan].days, weaken: 0, foundingKingdom: founding };
        state.player.x = loc.x; state.player.y = loc.y;
        state.player.targetLocation = null;
        state.player.status = 'besieging';
        this.showScreen('map');
        this.news(T`${T(loc.name)} kuşatma altında.`);   // panel zaten görünür, modal bildirim gereksiz
        this.renderSiegeUI();
    },
    // Günlük kuşatma işleyişi (dailyUpdate)
    siegeTick() {
        let s = state.player.siege;
        if(!s) return;
        let loc = LOCATIONS.find(l => l.id === s.locId);
        if(!loc || loc.faction === this.playerFaction()) return this.liftSiege(true);
        if(s.daysLeft > 0) {
            s.daysLeft--;
            if(s.daysLeft === 0) alert(T`${T(this.SIEGE_PLANS[s.plan].name)} hazır — ${T(loc.name)} surlarına saldırabilirsin.`);
        } else {
            // Açlığa mahkûm etme: bekledikçe garnizon erir, şehrin refahı düşer
            s.weaken = Math.min(0.55, (s.weaken || 0) + 0.07);
            loc.prosperity = Math.max(10, (loc.prosperity || 50) - 1.5);
        }
        this.renderSiegeUI();
        this.siegeRelief(loc);
    },
    // Kuşatmayı yarmaya gelen ordu: 2500 birim içindeki en yakın düşman lord partisi
    siegeRelief(loc) {
        let foes = state.npcParties.filter(n => n.lordId && n.faction === loc.faction && this.dist(n, loc) < 2500);
        if(!foes.length || Math.random() > 0.25) return;
        let n = foes.reduce((a, b) => this.dist(a, loc) <= this.dist(b, loc) ? a : b);
        n.x = loc.x + 40; n.y = loc.y + 40;
        this.showModal(`<h3>${T`🚩 Yardım Ordusu!</h3>
        <p><b>${this.npcName(n)}</b> ${n.size} kişiyle kuşatmayı yarmaya geldi. Surun dibinde iki ateş arasında
        kalamazsın: ya bu orduyu karşılarsın ya da kampı toplarsın.`}</p>
        <button class="btn primary" onclick="Game.closeModal(); Game.meetRelief('${n.id}')">${T`⚔️ Karşıla`}</button>
        <button class="btn" onclick="Game.closeModal(); Game.liftSiege()">${T`🚪 Kuşatmayı Kaldır`}</button>`);
    },
    meetRelief(npcId) {
        let n = state.npcParties.find(p => p.id === npcId);
        if(n) this.triggerEncounter(n);
    },
    liftSiege(silent) {
        state.player.siege = null;
        if(state.player.status === 'besieging') state.player.status = 'idle';
        this.renderSiegeUI();
        if(!silent) alert(T('Kuşatma kaldırıldı. Ordun kampı toplayıp çekildi.'));
    },
    assaultSiege() {
        let s = state.player.siege;
        if(!s) return;
        if(s.daysLeft > 0) return alert(T`Hazırlık bitmedi — ${s.daysLeft} gün daha gerek.`);
        let loc = LOCATIONS.find(l => l.id === s.locId);
        if(!loc) return this.liftSiege(true);
        let count = this.siegeGarrison(loc, s);
        state.player.siege = null;
        state.player.status = 'idle';
        this.renderSiegeUI();
        this.startSiege(s.locId, count, s.foundingKingdom, s.plan);
    },
    // Açlık garnizonu eritir; kuşatma paneli de saldırı da aynı sayıyı okur
    siegeGarrison(loc, s) {
        return Math.max(3, Math.round(this.garrisonOf(loc) * (1 - (s.weaken || 0))));
    },
    renderSiegeUI() {
        let ui = document.getElementById('siege-ui');
        if(!ui) return;
        let s = state.player.siege;
        let onMap = document.getElementById('map-view').classList.contains('active');
        if(!s || !onMap) { ui.classList.add('hidden'); return; }
        ui.classList.remove('hidden');
        let loc = LOCATIONS.find(l => l.id === s.locId) || { name: '?' };
        let p = this.SIEGE_PLANS[s.plan];
        this.setHtml('siege-info',
              `${T`Kuşatılan:`} <b>${T(loc.name)}</b><br>`
            + `${T`Yöntem:`} <b>${p.icon} ${T(p.name)}</b><br>`
            + (s.daysLeft > 0 ? `${T`Hazırlık: <b>${s.daysLeft}</b> gün kaldı`}<br>`
                              : `${T`Hazırlık tamam — açlık garnizonu`} <b>%${Math.round((s.weaken || 0) * 100)}</b> eritti<br>`)
            + `${T`Garnizon:`} <b>${this.siegeGarrison(loc, s)}</b> asker`);
        let btn = document.getElementById('btn-siege-assault');
        btn.disabled = s.daysLeft > 0;
        btn.style.opacity = s.daysLeft > 0 ? 0.5 : 1;
    },
    startSiege(locId, count, founding, plan = 'ladder') {
        state.player.currentSiege = { locId, foundingKingdom: founding };
        let loc = LOCATIONS.find(l => l.id === locId);
        Battle.start(T('Garnizon'), count, null, loc ? loc.faction : null, this.SIEGE_PLANS[plan]);
    },

    // --- VILLAGE ---
    // Yağma: köy milisini dağıt, ganimeti al. Bedeli ağır — sahibi lordla ilişki,
    // köyün refahı, namın ve (barıştaki bir krallıksa) diplomatik durum.
    raidVillage(loc) {
        let owner = this.ownerLord(loc);
        let militia = Math.max(4, Math.round((loc.prosperity || 50) / 5));
        let peace = !this.atWar(this.playerFaction(), loc.faction) && loc.faction !== this.playerFaction();
        // Yakılan köyün ambarı hemen dolmaz (#49)
        let wait = loc.raidedDay !== undefined ? this.RAID_COOLDOWN - (state.time.day - loc.raidedDay) : 0;
        if(wait > 0) return this.showModal(`<h3>🔥 ${T(loc.name)}</h3>
        <p>${T`Burası daha yeni yağmalandı — ambar boş, ahır boş, sağ kalanlar ormanda.
        Alacak bir şey kalması için <b>${Math.ceil(wait)} gün</b> daha geçmeli.`}</p>
        <button class="btn" onclick="Game.closeModal()">${T`Geri`}</button>`);
        this.showModal(`<h3>${T`🔥 ${T(loc.name)} Yağması</h3>
        <p>Köy milisi tahminen <b>${militia}</b> kişi. Dağıtırsan ambarı boşaltmak
        <b>${this.RAID_SECONDS} saniye</b> sürer — o sürede kıpırdayamazsın ve dumanı gören
        ${this.factionName(loc.faction)} lordları üstüne yürür. Yetişirlerse ganimet yok.`}</p>
        <p style="color:var(--danger);line-height:1.5">${T`Bedeli:`}
            ${owner ? `${T`${T(owner.name)} ile ilişki`} <b>−30</b>, ` : ''}${T`${this.factionName(loc.faction)} lordları <b>−6</b>,
            köyün refahı çöker ve günlerce gönüllü vermez, namın <b>−6</b>,
            <b>yağmacı damgası +${this.RAID_INFAMY}</b> (gönüllü ve paralı asker pahalanır, lordlar yüz vermez).
            ${peace ? `<br>${T`Bu köy barıştaki bir krallığın — yağma <b>savaş sebebi</b> sayılır.`}` : ''}`}</p>
        <button class="btn primary" onclick="Game.closeModal(); Game.startRaid('${loc.id}', ${militia})">${T`🔥 Yak ve Yağmala`}</button>
        <button class="btn" onclick="Game.closeModal()">${T`Vazgeç`}</button>`);
    },
    startRaid(locId, count) {
        state.player.currentRaid = { locId };
        let loc = LOCATIONS.find(l => l.id === locId);
        Battle.start('Köy Milisi', count, null, loc ? loc.faction : null);
    },
    // --- YAĞMA: SÜREN EYLEM (#49) ---
    // Milisi dağıtmak yağmanın yarısı. Ambarı boşaltmak zaman ister: 15 saniye boyunca
    // kıpırdayamazsın, zaman akar ve köyün krallığının lordları dumana doğru yürür.
    // --- ŞEREF (#53 madde 1.5) ---
    // Eski "yağmacı damgası" tek yönlü bir sayaçtı: yalnız kötü eylem yazılıyordu. Şeref
    // aynı sayının iki yönlüsüdür (−100..100) ve damga onun eksi tarafının etiketidir —
    // ikinci bir itibar alanı tutulmaz. Günde 0.5 sıfıra doğru söner (bir yağma ~24 gün).
    HONOR: {
        raid:       [-12, 'köy yağması'],
        robPeace:   [-5,  'barıştaki kervanı soymak'],
        robPeasant: [-8,  'köylü kafilesini soymak'],
        ransom:     [-2,  'soylu esirden fidye'],
        release:    [ 5,  'soyluyu onurla salıvermek'],
        abduct:     [-20, 'kız kaçırma'],
        oathBroken: [-5,  'sefer sözünü tutmamak'],
        questDone:  [ 2,  'verilen sözü tutmak']
    },
    honor() { return Math.max(-100, Math.min(100, Math.round(state.player.honor || 0))); },
    addHonor(kind) {
        let h = this.HONOR[kind]; if(!h) return 0;
        state.player.honor = Math.max(-100, Math.min(100, (state.player.honor || 0) + h[0]));
        return h[0];
    },
    // Aynı şeref herkeste aynı okunmaz: iyi huylu lord şerefi sever, kurnaz olan
    // şerefsizden çekinmez — Warband'ın mizaç tepkisi (#53/1.5).
    honorWeight(personality) {
        let h = this.honor();
        let w = personality === 'goodnatured' ? h / 40
              : personality === 'cunning' ? -h / 60
              : personality === 'debauched' ? -h / 90
              : h / 55;                                   // martial/quarrelsome: şerefi sayar ama az
        return Math.max(-2, Math.min(2, Math.round(w)));
    },
    honorTier() { let h = this.honor(); return h >= 40 ? 2 : h >= 15 ? 1 : h <= -36 ? -2 : h <= -10 ? -1 : 0; },
    honorLabel() { return { '-2': T('💀 Köy Yakan'), '-1': T('🔥 Yağmacı'), '0': '—', '1': T('🕊️ Sözünün Eri'), '2': T('⚜️ Şerefli') }[this.honorTier()]; },
    // Eski infamy kapıları şerefin eksi tarafından okur — çağıranların hiçbiri değişmedi
    RAID_INFAMY: 12,
    infamy() { return Math.max(0, -this.honor()); },
    infamyTier() { return Math.max(0, -this.honorTier()); },
    infamyLabel() { return ['—', T('🔥 Yağmacı'), T('💀 Köy Yakan')][this.infamyTier()]; },
    // Fiyat/gönüllü çarpanı: 60 onursuzlukta gönüllü yarıya iner, paralı asker %60 pahalanır
    // Artık iki yönlü: eksi şeref köylüyü kaçırır, artı şeref kapıyı açar (#53/1.5).
    // Eksi tarafı eski yağmacı cezasının aynısı, yani #49'un ölçümleri geçerli.
    infamyPenalty() { return Math.max(-0.3, Math.min(0.6, -this.honor() / 100)); },

    // --- KAN DAVASI (#53 madde 1.3) ---
    // Köyünü yaktığın, kervanını soyduğun, esirini fidyeye bağladığın lord seni unutmaz:
    // 30 gün boyunca partisi seni avlar ve karşılaşma sohbet değil savaş olur.
    GRUDGE_DAYS: 30,
    addGrudge(lordId) { if(lordId) state.grudges[lordId] = state.time.day; },
    hasGrudge(lordId) {
        let d = state.grudges[lordId];
        return d !== undefined && state.time.day - d < this.GRUDGE_DAYS;
    },
    grudgeList() { return Object.keys(state.grudges).filter(id => this.hasGrudge(id)); },
    // Bir fraksiyonun kervanını soymak: davayı en yakın lordu açar (kimin malıysa o)
    addGrudgeNearest(faction) {
        if(typeof LORDS === 'undefined') return;
        let near = LORDS.filter(l => l.faction === faction)
            .map(l => ({ l, p: state.npcParties.find(n => n.lordId === l.id) }))
            .filter(o => o.p).sort((a, b) => this.dist(a.p, state.player) - this.dist(b.p, state.player))[0];
        if(near) this.addGrudge(near.l.id);
    },
    RAID_SECONDS: 15,
    RAID_ALERT: 1600,     // bu menzildeki lord dumanı görür; 15 sn'de ~1200–1600 birim yol alır
    RAID_COOLDOWN: 30,    // gün — aynı köy bir daha yağmalanamaz (~12 dk gerçek zaman, hız ×1)
    raidedRecently(loc) { return !!loc && loc.raidedDay !== undefined && state.time.day - loc.raidedDay < this.RAID_COOLDOWN; },
    // Battle zafer dalı burayı çağırır: ganimet değil, yağma safhası başlar
    completeRaid(locId) {
        let loc = LOCATIONS.find(l => l.id === locId);
        if(!loc) return;
        state.player.currentRaid = null;
        state.player.raid = { locId, t: 0 };
        state.player.x = loc.x; state.player.y = loc.y;
        state.player.targetLocation = null;
        state.player.status = 'raiding';
        this.showScreen('map');
        // Dumanı gören lordlar köye yönelir; hedefleri raidTick her karede tazeler
        state.npcParties.forEach(n => {
            if(n.lordId && n.faction === loc.faction && this.dist(n, loc) < this.RAID_ALERT) n.raidResponder = true;
        });
        this.renderRaidUI();
    },
    raidTick(dt) {
        let r = state.player.raid;
        if(!r) return;
        let loc = LOCATIONS.find(l => l.id === r.locId);
        if(!loc) return this.abortRaid(true);
        r.t += dt;
        let responder = null;
        state.npcParties.forEach(n => {
            if(!n.raidResponder) return;
            n.targetX = loc.x; n.targetY = loc.y;
            if(this.dist(n, loc) < 60 && !responder) responder = n;
        });
        if(responder) {
            // Yetişti: ambar yarım kaldı, ganimet yok — kılıcını çekmek zorundasın
            this.abortRaid(true);
            // Ambarı basılmış lordun sana diyeceği yok: ganimet gitti, kılıç kaldı
            if(typeof Nobles !== 'undefined') Nobles.addRel(responder.lordId, -15);
            alert(T`${T(responder.name)} dumanı görüp yetişti — yağma yarıda kaldı, ganimet yok.`);
            return this.triggerEncounter(responder, 'raid');
        }
        if(r.t >= this.RAID_SECONDS) return this.finishRaid(loc);
        this.renderRaidUI();
    },
    abortRaid(silent) {
        state.player.raid = null;
        if(state.player.status === 'raiding') state.player.status = 'idle';
        state.npcParties.forEach(n => delete n.raidResponder);
        this.renderRaidUI();
        if(!silent) alert(T('Yağmayı bıraktın. Ambara dokunmadan çekildin — köylü ucuz kurtuldu.'));
    },
    renderRaidUI() {
        let ui = document.getElementById('raid-ui');
        if(!ui) return;
        let r = state.player.raid;
        let onMap = document.getElementById('map-view').classList.contains('active');
        if(!r || !onMap) { ui.classList.add('hidden'); return; }
        ui.classList.remove('hidden');
        let loc = LOCATIONS.find(l => l.id === r.locId) || { name: '?' };
        let pct = Math.min(100, r.t / this.RAID_SECONDS * 100);
        // En yakın müdahaleci ne kadar uzakta? Kumarın gerilimi bu satırda.
        let near = state.npcParties.filter(n => n.raidResponder)
                    .sort((a, b) => this.dist(a, loc) - this.dist(b, loc))[0];
        this.setHtml('raid-info',
            `<div><b>${T(loc.name)}</b> ${T`yağmalanıyor — ${(this.RAID_SECONDS - r.t).toFixed(1)} sn`}</div>
             <div class="hud-bar" style="margin:0.4rem 0"><i class="fill-hp" style="width:${pct}%"></i></div>
             <div style="color:${near ? 'var(--danger)' : 'var(--text-muted)'};font-size:0.85rem">
                ${near ? T`🚩 ${T(near.name)} yaklaşıyor — ${Math.round(this.dist(near, loc))} birim`
                       : T('Ufukta kimse yok. Ambarı boşalt.')}</div>`);
    },
    finishRaid(loc) {
        state.player.raid = null;
        state.player.status = 'idle';
        state.npcParties.forEach(n => delete n.raidResponder);
        this.renderRaidUI();
        this.grantRaidLoot(loc);
    },
    grantRaidLoot(loc) {
        let pr = loc.prosperity || 50;
        let loot = Math.round(pr * 6 * (0.85 + Math.random() * 0.3));
        state.player.money += loot;
        let food = [['wheat', 4 + Math.round(pr / 12)], ['cheese', 1 + Math.round(pr / 25)]];
        food.forEach(([id, qty]) => {
            let ex = state.player.inventory.find(i => i.id === id);
            if(ex) ex.qty += qty; else state.player.inventory.push({ ...ITEMS[id], qty });
        });
        loc.prosperity = Math.max(10, pr - 20);
        loc.volunteersAvailable = 0;
        loc.raidedDay = state.time.day;
        state.player.renown = Math.max(0, (state.player.renown || 0) - 6);   // zaferin +3'ünü de yer
        this.addHonor('raid');            // şeref düşer, damga onun etiketidir (#49/#53)
        let owner = this.ownerLord(loc);
        if(owner) this.addGrudge(owner.id);   // sahibi lord 30 gün seni avlar (#53/1.3)
        if(typeof Nobles !== 'undefined') {
            if(owner) Nobles.addRel(owner.id, -30);
            LORDS.filter(l => l.faction === loc.faction && (!owner || l.id !== owner.id))
                 .forEach(l => Nobles.addRel(l.id, -6));
        }
        // Barıştaki krallığın köyünü yakmak savaş sebebidir
        if(this.playerFaction() && loc.faction !== this.playerFaction()) this.declareWar(this.playerFaction(), loc.faction);
        this.addProficiencyXp('looting', 60);
        alert(T`${T(loc.name)} yağmalandı!\n\n💰 ${loot} dinar\n${food.map(([id, q]) => `${ITEMS[id].icon} ${T(ITEMS[id].name)} x${q}`).join('\n')}`
            + T`\n\nKöyün refahı ${Math.round(loc.prosperity)}'e düştü. Dumanı uzaktan görülüyor; bu unutulmayacak.`);
    },

    talkToElder(loc) {
        let dialog = this.getHumorousDialog('elder', loc);
        this.showModal(`<h3>${T`🧓 Köy Yaşlısı`}</h3><p><i>${dialog}</i></p>`);
    },
    // Kaç gönüllü alınacağı seçilebilir. Eskiden hepsini almak zorunluydu:
    // kapasitede 3 yer varken 5 gönüllülük köyden tek asker bile alınamıyordu.
    recruitVolunteers(loc) {
        // Yağmacıya köylü zor katılır ve pahalıya katılır (#49)
        let pen = this.infamyPenalty();
        let cost = Math.max(5, Math.round(10 * (1 + pen)));
        let avail = Math.floor(loc.volunteersAvailable * (1 - pen));
        let space = Math.max(0, this.getPartyCapacity() - state.player.party.length);
        let afford = Math.floor(state.player.money / cost);
        let max = Math.min(avail, space, afford);

        if(max <= 0) {
            return this.showModal(`<h3>${T`🪖 Gönüllü Topla</h3>
            <p>${avail} gönüllü hazır. Kişi başı ${cost} Dinar.`}</p>
            <p style="color:var(--danger)">${space <= 0 ? T('Grubunda yer yok.') : T('Bir gönüllüye bile yetecek dinarın yok.')}</p>`);
        }

        this.showModal(`<h3>${T`🪖 Gönüllü Topla</h3>
        <p>${avail} gönüllü hazır. Kişi başı ${cost} Dinar. En fazla <b>${max}</b> kişi alabilirsin.`}</p>
        ${pen > 0 ? `<p style="color:var(--danger);font-size:0.85rem">${T`${this.infamyLabel()} damgası: köyün yarısı seni görünce ambara saklandı (gönüllü −%${Math.round(pen*100)}, ücret +%${Math.round(pen*100)}).`}</p>`
          : pen < 0 ? `<p style="color:#7fd8a0;font-size:0.85rem">${T`${this.honorLabel()} adın buraya da ulaşmış: fazladan gönüllü çıktı, ücreti de kırdılar (+%${Math.round(-pen*100)} gönüllü, −%${Math.round(-pen*100)} ücret).`}</p>` : ''}
        <input type="range" id="recruit-n" min="1" max="${max}" value="${max}" style="width:100%;margin:0.8rem 0"
               oninput="Game.updateRecruitLabel(${cost})">
        <button class="btn primary" id="recruit-btn"
                onclick="Game.doRecruit('${loc.id}', +document.getElementById('recruit-n').value, ${cost})">${
                    T`İşe Al: ${max} kişi (${max * cost} Dinar)`}</button>`);
    },
    updateRecruitLabel(cost) {
        let n = +document.getElementById('recruit-n').value;
        this.setHtml('recruit-btn', T`İşe Al: ${n} kişi (${n * cost} Dinar)`);
    },
    doRecruit(locId, amount, cost) {
        let loc = LOCATIONS.find(l => l.id === locId);
        amount = Math.min(amount, loc ? Math.floor(loc.volunteersAvailable * (1 - this.infamyPenalty())) : amount);
        let total = amount * cost;
        if(amount < 1) { this.sfx('error'); return alert(T('Alınacak gönüllü yok!')); }
        if(state.player.money < total) { this.sfx('error'); return alert(T('Yeterli dinarın yok!')); }
        if(state.player.party.length + amount > this.getPartyCapacity()) { this.sfx('error'); return alert(T('Grubunda yer yok!')); }
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
        this.feedback('recruit', null, -total);
        alert(T`${amount} gönüllü gruba katıldı!`);
    },

    // --- LORE ---
    showLore(type) {
        let title = type === 'lords' ? T('Kalradya Lordları') : T('Kalradya Krallıkları');
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
                let f = FACTIONS[l.faction] || { name:T('Bilinmiyor'), color:'#fff' };
                let home = LOCATIONS.find(x => x.id === l.homeLocId);
                modalHtml += row(frame(Nobles.portraitCss(l, 140)), f.color, T(l.name),
                    `${T(f.name)} · ${T(PERSONALITIES[l.personality].name)}${home ? ' · ' + T(home.name) : ''}`, T(l.lore));
            });
            LADIES.forEach(L => {
                let f = FACTIONS[L.faction] || { name:T('Bilinmiyor'), color:'#fff' };
                modalHtml += row(frame(Nobles.portraitCss(L, 140)), '#ff9ec4', T(L.name),
                    T`${T(f.name)} · ${T(LADY_TRAITS[L.trait].name)} · Vasisi: ${T((Nobles.lord(L.guardianId)||{name:'?'}).name)}`, T(L.lore));
            });
        } else {
            let i = 0;
            Object.values(FACTIONS).forEach(f => {
                if(f.id === 'player' || f.id === 'player_kingdom') return;
                let crest = `<div style="width:140px;height:140px;background-image:url('kingdom_crests.jpg');
                    background-size:300% 300%;background-position:${(i%3)*50}% ${Math.floor(i/3)*50}%;filter:sepia(0.2) contrast(1.1);"></div>`;
                i++;
                modalHtml += row(frame(crest), f.color, T(f.name), `${T(f.ruler)} · ${T(f.vizier)}`, T(f.lore));
            });
        }

        modalHtml += `</div>
            <button class="btn primary" style="margin-top:2rem;width:200px;" onclick="Game.closeModal()">${T`Kapat`}</button>
        </div>`;
        this.showModal(modalHtml, '1000px', 'bg_hdr.jpg');
    },

    // --- CHARACTER ---
    // Niteliğin şu an ne yaptığını efektif değere göre yazar (hedefe göre değil —
    // oyuncu neyi kazandığını değil, neyin işlediğini görmeli).
    attrEffect(k) {
        let v = this.attr(k);
        switch(k) {
            case 'str': return T`Yakın dövüş saldırısı +${v.toFixed(1)}`;
            case 'agi': return T`Harita hızı +${(v * 1.5).toFixed(1)} · savaş hızı +${(v * 0.5).toFixed(1)}`;
            case 'int': return T`Görüş ${Math.round(this.getVisibility())} birim`;
            case 'cha': return T`Grup kapasitesi +${Math.round((v - 10) * 3)}`;
            case 'vit': return T`Max can +${Math.round((v - 10) * 5)} · ${this.hpRegenHours()} saatte 1 can`;
        }
        return '';
    },
    attrRowHtml(k, pts) {
        let a = this.ATTRS[k], s = state.player.stats;
        let eff = this.attr(k), tgt = s[k] || 10;
        let pct = tgt > 10 ? Math.max(0, Math.min(100, (eff - 10) / (tgt - 10) * 100)) : 100;
        let done = eff >= tgt - 0.001;
        return `<li>
            ${a.icon} <strong>${T(a.name)}:</strong>
            <span style="color:${done ? '#fff' : 'var(--primary)'};font-size:1.05rem">${eff.toFixed(1)}</span>
            <span style="color:var(--text-muted)"> ${T`/ ${tgt} hedef`}</span>
            ${pts > 0 ? `<button class="btn" style="padding:0 0.4rem;font-size:0.8rem;margin-left:0.5rem;" onclick="Game.addStat('${k}')">+</button>` : ''}
            ${done ? '' : `<div style="background:rgba(0,0,0,0.35);border-radius:3px;height:5px;margin:0.3rem 0;max-width:220px">
                <div style="background:var(--primary);height:100%;width:${pct}%;border-radius:3px"></div></div>`}
            <div style="font-size:0.75rem;color:var(--text-muted)">${this.attrEffect(k)}</div>
            ${done ? '' : `<div style="font-size:0.72rem;color:#cbb26b">${T`Gelişimi: ${a.how}`}</div>`}
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
            <p>${T`Seviye: ${s.level} (XP: ${s.xp}/${s.xpNext})`}</p>
            <div style="background:rgba(0,0,0,0.3);border-radius:4px;height:8px;width:200px;margin:0.5rem 0;">
                <div style="background:var(--primary);height:100%;width:${xpBar}%;border-radius:4px;"></div>
            </div>
            <p>${T`Can: ${Math.round(s.hp)}/${Math.round(s.maxHp)}`}</p>
            <p>${T`Nam: ${p.renown} | İdare Hakkı: ${p.rightToRule}`}${this.honorTier()
                ? ` | <span style="color:${this.honor() < 0 ? 'var(--danger)' : '#7fd8a0'}"
                     title="${T('Şeref: eylemlerinin ikinci itibar ekseni (−100..100)')}">${this.honorLabel()} (${this.honor()})</span>` : ''}</p>
            <p>${T`Bağlılık: ${p.vassalOf ? T((FACTIONS[p.vassalOf]||{name:p.vassalOf}).name) : T('Bağımsız')}</p>
            <p>Eş: ${p.spouse ? T((Nobles.any(p.spouse) || {name:p.spouse}).name) : T('Yok')}`}</p>
            <div style="display:flex;gap:0.8rem;align-items:center;margin-top:0.8rem">
                ${this.bannerCss(p.banner || 0, 64)}
                <div style="font-size:0.8rem;color:var(--text-muted);line-height:1.5">
                    <b style="color:${this.bannerColor()}">${T((BANNERS[p.banner] || BANNERS[0]).name)}</b> ${T`sancağı`}<br>
                    ${p.gender === 'female' ? T('👩 Kadın') : T('👨 Erkek')}<br>${this.backgroundLine()}
                </div>
            </div>
        </div>
        <div style="flex:1;">
            <h3 style="color:var(--primary)">${T`Nitelikler ${pts > 0 ? `<span style="color:#2d2;font-size:0.9rem;">${T`(${pts} Puan Dağıtılabilir)`}</span>` : ''}`}</h3>
            <p style="font-size:0.75rem;color:var(--text-muted);margin:-0.4rem 0 0.6rem">
                ${T`Puan vermek <b>hedefi</b> yükseltir. Sayının solundaki <b>efektif</b> değer, o niteliğe
                uygun oynadıkça hedefe yaklaşır — beklemek işe yaramaz.`}</p>
            <ul style="list-style:none;display:flex;flex-direction:column;gap:0.8rem;">
                ${Object.keys(this.ATTRS).map(k => this.attrRowHtml(k, pts)).join('')}
            </ul>
        </div>
        </div>`;

        let fp = s.focusPoints || 0;
        // Her yetenek ne yapıyor + şu anki değeri (geri bildirim: etkiler görünmüyordu)
        const L = id => this.profLvl(id);
        let profs = [
            { id: 'oneHanded', name: T('Tek Elli Silahlar'), d: l => T`Kılıç hasarı ×${(0.35 + Math.min(0.4, l*0.004)).toFixed(2)}` },
            { id: 'twoHanded', name: T('Çift Elli Silahlar'), d: l => T`Çift elli silah hasarı ×${(0.35 + Math.min(0.4, l*0.004)).toFixed(2)}` },
            { id: 'polearm', name: T('Göndergeli Silahlar'), d: l => T`Mızrak hasarı ×${(0.35 + Math.min(0.4, l*0.004)).toFixed(2)} (atlı şarjda ×2.6'ya kadar)` },
            { id: 'bow', name: T('Okçuluk'), d: l => T`Ok hasarı ×${(0.5 + Math.min(0.5, l*0.005)).toFixed(2)}, savaş başına ${24 + l*2} ok` },
            { id: 'riding', name: T('Binicilik'), d: l => T`Atlı savaş hızı ${Math.round(95 + this.attr('agi')*0.5 + (l-1)*3)}` },
            { id: 'athletics', name: T('Atletizm'), d: l => T`Yaya savaş hızı ${Math.round(50 + this.attr('agi')*0.5 + (l-1)*1.5)}` },
            { id: 'leadership', name: T('İdare'), d: l => T`Grup kapasitesi +${(L('leadership')-1)*4}, moral +${(L('leadership')-1)*3}` },
            { id: 'persuasion', name: T('İkna Kabiliyeti'), d: () => T('Drahoma pazarlığı ve diyalog seçenekleri') },
            { id: 'surgery', name: T('Cerrahlık'), d: () => T`Ölen askerin yaralı kurtulma şansı %${Math.round(Math.min(0.75, 0.35 + L('surgery')*0.03)*100)}` },
            { id: 'prisonerMgmt', name: T('Esir Yönetimi'), d: () => T`Esir kapasitesi ${this.prisonerCapacity()}, kaçış şansı %${Math.max(1, 6 - L('prisonerMgmt')*0.5).toFixed(1)}` },
            { id: 'pathfinding', name: T('Yol Bulma'), d: () => T`Harita hızı +%${((L('pathfinding')-1)*2).toFixed(0)}` },
            { id: 'spotting', name: T('Gözcülük'), d: () => T`Görüş ${Math.round(this.getVisibility())} birim` },
            { id: 'trade', name: T('Ticaret'), d: () => T`Alışta indirim / satışta prim %${Math.round(Math.min(0.25, (L('trade')-1)*0.02)*100)}` },
            { id: 'looting', name: T('Yağma'), d: () => T`Savaş ganimeti +%${((L('looting')-1)*4).toFixed(0)}` },
            { id: 'trainer', name: T('Eğitim'), d: () => T`Her gün ${Math.max(0, L('trainer')-1)} askere +1 XP` }
        ];

        let profHtml = `<h3 style="color:var(--primary);margin-top:1.5rem;">${T`Yetenekler ${fp > 0 ? `<span style="color:#2d2;font-size:0.9rem;">${T`(${fp} Odak Puanı Dağıtılabilir)`}</span>` : ''}`}</h3>
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem;">${T`Odak puanları yeteneklerin öğrenme hızını artırır (Bannerlord sistemi). Savaşarak gelişir.`}</p>
        <div style="display:flex;flex-wrap:wrap;gap:1rem;">`;
        
        profs.forEach(pr => {
            let pData = p.proficiencies[pr.id] || { level:1, xp:0, next:100, focus:0 };
            p.proficiencies[pr.id] = pData;
            let fill = (pData.xp / pData.next) * 100;
            let mult = 0.5 + (pData.focus||0);
            profHtml += `<div style="background:rgba(0,0,0,0.3);padding:0.8rem;border-radius:6px;width:48%;display:flex;justify-content:space-between;align-items:center;">
                <div style="flex:1">
                    <div style="font-weight:bold">${T`${pr.name} (Seviye ${pData.level})`}</div>
                    <div style="font-size:0.75rem;color:#cbb26b">${pr.d(pData.level)}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">${T`Öğrenme Hızı: x${mult} | Odak: ${pData.focus||0}/5`}</div>
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
            console.log(T`Yeteneğin gelişti: ${id} (Lvl ${pData.level})`);
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
        let html = `<p>${T('Kapasite')}: ${state.player.party.length}/${this.getPartyCapacity()}` +
            (wounded ? ` · <span style="color:#ffaa00">${T`🩹 ${wounded} yaralı</span> (savaşa giremez)`}` : '') + `</p><hr style="margin:0.8rem 0;border-color:var(--panel-border)">`;
        if(state.player.party.length === 0) html += `<p>${T('Grubunda hiç asker yok.')}</p>`;
        else {
            let groups = {};
            state.player.party.forEach(t => {
                // efsaneviler ve yaralılar ayrı satırda listelenir
                let key = this.troopGroupKey(t);
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
                    <div style="font-size:0.75rem;color:var(--text-muted)">${T`Tür: ${this.troopClassName(typeInfo)}${DMG_TYPES[typeInfo.dmgType] ? ' · ' + T(DMG_TYPES[typeInfo.dmgType].name) : ''}${g.sample.isCompanion ? T` · Yoldaş · ${this.profName((COMPANIONS.find(c=>c.id===g.sample.companionId)||{}).skill)} ${g.sample.level} · 20 dinar/gün` : ''}${g.wounded ? T` · savaşamaz, ${g.wounded} gün` : ''}`}</div>
                    ${g.sample.debuff ? T('<div style="font-size:0.75rem;color:#e0463a">🍖 Et/peynir bulamadı — savaşta can ve saldırı ×0.7</div>') : ''}
                </div>`;

                // Sıra değiştirme + gruptan çıkarma (#51)
                let q = name.replace(/'/g, "\\'");
                html += `<div style="display:flex;gap:0.3rem;align-items:center">
                    <button class="btn" title="Yukarı taşı" style="font-size:0.75rem;padding:0.2rem 0.45rem" onclick="Game.moveTroopGroup('${q}', -1)">▲</button>
                    <button class="btn" title="Aşağı taşı" style="font-size:0.75rem;padding:0.2rem 0.45rem" onclick="Game.moveTroopGroup('${q}', 1)">▼</button>
                    <button class="btn" title="Gruptan çıkar" style="font-size:0.75rem;padding:0.2rem 0.45rem;border-color:var(--danger);color:var(--danger)" onclick="Game.dismissTroops('${q}')">➖</button>
                </div>`;

                if(g.ready.length > 0) {
                    let upgradeChoices = TROOP_UPGRADES[g.base];
                    html += `<div style="display:flex;gap:0.4rem;margin-top:0.4rem;">`;
                    upgradeChoices.forEach(choice => {
                        // Hangi seçenek piyade, hangisi atlı okçu — terfi kör tercih olmasın (#51)
                        let ci = this.troopStats({ name: choice.name });
                        html += `<button class="btn primary" style="font-size:0.75rem;padding:0.3rem 0.6rem" onclick="Game.promoteTroop('${g.base.replace(/'/g,"\\'")}', '${T(choice.name.replace(/'/g,"\\'"))}', ${choice.cost})">
                            ${T`Sınıf Terfisi: ${ci.icon} ${T(choice.name)} (${choice.cost} Dinar)`}
                            <div style="font-size:0.7rem;opacity:0.8">${this.troopClassName(ci)}${DMG_TYPES[ci.dmgType] ? ' · ' + T(DMG_TYPES[ci.dmgType].name) : ''}</div>
                        </button>`;
                    });
                    html += `</div>`;
                }

                let maxLevelTroop = g.normal.find(t => t.level === 50) || g.ready.find(t => t.level === 50);
                let hasToken = state.player.inventory.some(i => i.id === 'lvl51_token');
                if(maxLevelTroop && hasToken) {
                    html += `<div style="margin-top:0.5rem"><button class="btn" style="border-color:#aa00ff;color:#aa00ff;font-size:0.75rem;padding:0.3rem 0.6rem" onclick="Game.promoteTo51('${maxLevelTroop.id}')">${T`🌟 Savaş Tanrısı Nişanı Kullan (Lvl 51 Yap)`}</button></div>`;
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
    troopLabel(t) { return (t.legendary ? T('Efsanevi ') : '') + T(t.name); },
    // Grup ekranı askerleri bu anahtarla toplar; sıra ve çıkarma da aynı anahtarı kullanır (#51)
    troopGroupKey(t) { return this.troopLabel(t) + (t.wounded ? T(' 🩹 (yaralı)') : ''); },
    troopClassName(st) {
        // Kergit atlı okçusu ağaçta 'archer' ama 108 hızla gezer — sınıfı hıza bakarak yaz,
        // yoksa listede yaya okçularla aynı görünüyor. Yaya tavanı 66, süvari tabanı 95.
        let mounted = st.type === 'cavalry' || st.speed >= 90;
        if(st.type === 'archer') return mounted ? T('Atlı Okçu') : T('Okçu');
        return mounted ? T('Süvari') : T('Piyade');
    },
    // Sırayı grup grup değiştir: aynı ada sahip askerler bloğu komşu blokla yer değiştirir
    moveTroopGroup(key, dir) {
        let keys = [];
        state.player.party.forEach(t => { let k = this.troopGroupKey(t); if(keys.indexOf(k) < 0) keys.push(k); });
        let i = keys.indexOf(key), j = i + dir;
        if(i < 0 || j < 0 || j >= keys.length) return;
        keys[i] = keys[j]; keys[j] = key;
        // sort kararlıdır: blok içindeki sıra bozulmaz
        state.player.party.sort((a, b) => keys.indexOf(this.troopGroupKey(a)) - keys.indexOf(this.troopGroupKey(b)));
        this.renderPartyScreen();
    },
    dismissTroops(key) {
        let n = state.player.party.filter(t => this.troopGroupKey(t) === key).length;
        if(!n) return;
        this.showModal(`<h3>${T`➖ Gruptan Çıkar</h3>
            <p><b>${key}</b> — elinde ${n} tane var. Çıkardığın asker yoluna gider, geri gelmez.`}</p>
            <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:1rem">
                <button class="btn" onclick="Game.doDismiss('${key.replace(/'/g, "\\'")}', 1)">${T`Bir Tane`}</button>
                ${n > 1 ? `<button class="btn" style="border-color:var(--danger);color:var(--danger)" onclick="Game.doDismiss('${key.replace(/'/g, "\\'")}', ${n})">${T`Hepsi (${n})`}</button>` : ''}
                <button class="btn" onclick="Game.closeModal()">${T`Vazgeç`}</button>
            </div>`);
    },
    doDismiss(key, n) {
        let gone = 0;
        for(let i = state.player.party.length - 1; i >= 0 && gone < n; i--) {
            if(this.troopGroupKey(state.player.party[i]) === key) { state.player.party.splice(i, 1); gone++; }
        }
        this.closeModal();
        this.renderPartyScreen();
        this.updateTopBar();
        alert(T`${key} × ${gone} gruptan ayrıldı.`);
    },

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
            if(c) this.clampTip(c);
        });
    },

    // Taşma düzeltmesi tek yerde: fareyle gelen de dokunmayla açılan da buradan geçer (#65)
    clampTip(c) {
        let t = c.querySelector('.tooltip-content');
        if(!t) return;
        t.style.transform = 'translateX(-50%)';
        let r = t.getBoundingClientRect(), pad = 10;
        let over = r.right - (window.innerWidth - pad), under = pad - r.left;
        if(over > 0) t.style.transform = `translateX(calc(-50% - ${Math.ceil(over)}px))`;
        else if(under > 0) t.style.transform = `translateX(calc(-50% + ${Math.ceil(under)}px))`;
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
            wage += this.troopWage(t);                              // yoldaş 20, lvl51 bedava
            if(t.isCompanion) { foodLow += 1; return; }
            if(t.level >= 51) return;
            foodLow += t.level >= 20 ? 1.5 : 1;
            if(t.level >= 30) foodHigh += 1;
        });
        wage += this.fiefIncome().wage;   // tımar garnizonunun maaşı da senden çıkar (#23)
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
            alert(T`Moral çöktü! ${gone.length} asker gece kamptan kaçtı. (Moral ${Math.round(p.morale)})`);
        }
    },

    moraleLabel(m) {
        if(m >= 80) return T('<span style="color:#2ecc71">Coşkulu</span>');
        if(m >= 60) return T('<span style="color:#8ecf5a">Yüksek</span>');
        if(m >= 40) return T('<span style="color:#ccc">Normal</span>');
        if(m >= 25) return T('<span style="color:#e59b3d">Düşük</span>');
        return T('<span style="color:#e74c3c">Çökmüş</span>');
    },

    // Moral savaşta bütün birliğin gücünü ölçekler (0 -> x0.8, 50 -> x1.0, 100 -> x1.2)
    moraleMult() { return 0.8 + this.morale() / 250; },

    moraleHtml() {
        let m = Math.round(this.morale());
        let info = state.player.moraleInfo || {};
        let rows = Object.keys(info).filter(k => info[k] !== 0)
            .map(k => `<div style="display:flex;justify-content:space-between"><span>${T(k)}</span><span style="color:${info[k] > 0 ? '#2ecc71' : '#e74c3c'}">${info[k] > 0 ? '+' : ''}${info[k]}</span></div>`).join('');
        return `<h3 style="color:var(--primary);margin-top:1.5rem">${T`🎺 Moral ${m}/100 — ${this.moraleLabel(m)}`}</h3>
            <div style="background:rgba(0,0,0,0.25);padding:0.8rem;border-radius:6px;font-size:0.85rem;line-height:1.6">
            ${rows || `<i>${T('Henüz hesaplanmadı (bir gün geçmeli).')}</i>`}
            <div style="color:var(--text-muted);margin-top:0.4rem">${T`Savaş gücü çarpanı: ×${this.moraleMult().toFixed(2)}${m < 25 ? T(' · <span style="color:#e74c3c">firar başladı!</span>') : ''}`}</div>
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
        let html = `<h2 style="color:var(--primary);margin-top:0">${T`⛓️ Köle Tüccarı`}</h2>`;
        if(note) html += `<p style="color:#ffcc00">${note}</p>`;
        let troops = ps.filter(p => !p.noble);
        if(troops.length === 0) {
            html += `<p style="color:var(--text-muted)">${T`Tüccar boş ranzalarını gösteriyor: "Zincirim bol, malın yok. Git birkaç çapulcu topla da konuşalım."`}</p>`;
        } else {
            let groups = {};
            troops.forEach(t => {
                let key = t.name;
                if(!groups[key]) groups[key] = { count: 0, value: this.prisonerValue(t) };
                groups[key].count++;
            });
            let total = troops.reduce((a, t) => a + this.prisonerValue(t), 0);
            html += `<p style="color:var(--text-muted)">${T`Tüccar esirlerini tek tek süzüyor.`}</p><ul style="list-style:none;padding:0">`;
            for(let name in groups) {
                let g = groups[name];
                html += `<li style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem;background:rgba(0,0,0,0.25);border:1px solid var(--panel-border);border-radius:6px;margin-bottom:0.4rem">
                    <span>⛓️ <b>${T(name)}</b> x${g.count} <span style="color:var(--text-muted);font-size:0.8rem">${T`(tanesi ${g.value} dinar)`}</span></span>
                    <button class="btn" style="font-size:0.8rem;padding:0.3rem 0.6rem" onclick="Game.sellPrisoners('${T(name.replace(/'/g,"\\'"))}')">${T`Sat (+${g.count * g.value})`}</button>
                </li>`;
            }
            html += `</ul><button class="btn primary" style="width:100%" onclick="Game.sellPrisoners()">${T`Hepsini Sat (+${total} Dinar)`}</button>`;
        }
        if(ps.some(p => p.noble)) html += `<p style="color:#e59b3d;font-size:0.85rem;margin-top:0.8rem">${T`Tüccar soylulara elini sürmez: "Onların fidyesi benim değil, senin işin." (Grup ekranından fidye iste)`}</p>`;
        html += `<button class="btn" style="width:100%;margin-top:0.8rem" onclick="Game.closeModal()">${T`Ayrıl`}</button>`;
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
        this.openSlaveTrader(T`${sold} esir satıldı. +${money} dinar.`);
    },

    releasePrisoners(name) {
        let n = 0;
        state.player.prisoners = state.player.prisoners.filter(p => {
            if(p.noble || p.name !== name) return true;
            n++; return false;
        });
        if(n) { this.renderPartyScreen(); alert(T`${n} esir salıverildi.`); }
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
        this.addHonor('ransom'); this.addGrudge(pr.lordId);   // parayla satılan soylu unutmaz (#53)
        Nobles.addRel(pr.lordId, -20);
        LORDS.filter(l => l.faction === pr.faction && l.id !== pr.lordId).forEach(l => Nobles.addRel(l.id, -4));
        this.respawnLordParty(pr);
        this.addProficiencyXp('prisonerMgmt', 40);
        this.updateTopBar();
        this.renderPartyScreen();
        alert(T`${T(pr.name)} için ${pr.ransom} dinar fidye alındı. Serbest bıraktın ama bunu unutmayacak.`);
    },

    releaseLord(id) {
        let i = state.player.prisoners.findIndex(p => p.id === id);
        if(i === -1) return;
        let pr = state.player.prisoners.splice(i, 1)[0];
        Nobles.addRel(pr.lordId, 25);
        LORDS.filter(l => l.faction === pr.faction && l.id !== pr.lordId).forEach(l => Nobles.addRel(l.id, 6));
        state.player.renown += 3;
        this.addHonor('release'); delete state.grudges[pr.lordId];   // şeref borcu siler (#53)
        this.respawnLordParty(pr);
        this.updateTopBar();
        this.renderPartyScreen();
        alert(T`${T(pr.name)}'i fidyesiz salıverdin. Bu şerefli davranış dilden dile dolaşacak. (+3 nam)`);
    },

    prisonersHtml() {
        let ps = state.player.prisoners || [];
        let pm = (state.player.proficiencies.prisonerMgmt || { level: 1 }).level;
        let risk = Math.max(1, 6 - pm * 0.5).toFixed(1);
        let html = `<h3 style="color:var(--primary);margin-top:1.5rem">${T`⛓️ Esirler ${ps.length}/${this.prisonerCapacity()}`}</h3>
            <p style="font-size:0.8rem;color:var(--text-muted);margin:0 0 0.5rem">${T`Esir Yönetimi ${pm} · her esir günde <b>%${risk}</b> ihtimalle kaçar (soylular kaçmaz) · toplam değer ~${ps.reduce((a, p) => a + (p.noble ? p.ransom : this.prisonerValue(p)), 0)} dinar`}</p>`;
        if(ps.length === 0) return html + `<p style="color:var(--text-muted);font-size:0.85rem">${T`Zincirlerin boş. Kazandığın savaşlarda düşen düşmanların bir kısmı esir alınır; şehirdeki köle tüccarına satılır.`}</p>`;
        let groups = {};
        html += '<ul style="list-style:none;padding:0">';
        ps.forEach(p => {
            if(p.noble) {
                html += `<li style="padding:0.8rem;background:rgba(0,0,0,0.25);border:1px solid #e59b3d;border-radius:6px;margin-bottom:0.5rem">
                    <b style="color:#e59b3d">👑 ${T(p.name)}</b> <span style="font-size:0.8rem;color:var(--text-muted)">${T`${T((FACTIONS[p.faction]||{name:''}).name)} · İlişki: ${Nobles.relLabel(Nobles.rel(p.lordId))}`}</span>
                    <div style="display:flex;gap:0.4rem;margin-top:0.5rem">
                        <button class="btn" style="font-size:0.8rem;padding:0.3rem 0.6rem" onclick="Game.ransomLord('${p.id}')">${T`💰 Fidye İste (${p.ransom} Dinar)`}</button>
                        <button class="btn" style="font-size:0.8rem;padding:0.3rem 0.6rem;border-color:#2ecc71;color:#2ecc71" onclick="Game.releaseLord('${p.id}')">${T`🕊️ Onurunla Salıver`}</button>
                    </div></li>`;
                return;
            }
            if(!groups[p.name]) groups[p.name] = { count: 0, value: this.prisonerValue(p) };
            groups[p.name].count++;
        });
        for(let name in groups) {
            let g = groups[name];
            html += `<li style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem;background:rgba(0,0,0,0.2);border:1px solid var(--panel-border);border-radius:6px;margin-bottom:0.4rem">
                <span>⛓️ <b>${T(name)}</b> x${g.count} <span style="font-size:0.8rem;color:var(--text-muted)">${T`(tanesi ~${g.value} dinar)`}</span></span>
                <button class="btn" style="font-size:0.75rem;padding:0.25rem 0.5rem" onclick="Game.releasePrisoners('${T(name.replace(/'/g,"\\'"))}')">${T`Salıver`}</button>
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

            alert(T`${this.troopLabel(t)} doğdu! Artık maaş istemez, yemek yemez ve muazzam güçlü!`);
            this.renderPartyScreen();
            this.updateTopBar();
        }
    },
    promoteTroop(oldName, newName, cost) {
        if(state.player.money < cost) { this.sfx('error'); return alert(T('Yeterli dinarın yok!')); }
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
            this.feedback('upgrade', null, -cost);
            alert(T`Asker başarıyla ${newName} sınıfına terfi ettirildi!`);
        }
    },

    // --- INVENTORY ---
    renderInventoryScreen() {
        let e = state.player.equipment;
        let html = `<div style="display:flex;gap:2rem;">
        <div style="flex:1;">
            <h3 style="color:var(--primary)">${T`Kuşanılan`}</h3>
            ${this._eqSlot(T('Silah'),'weapon',e.weapon)}
            ${this._eqSlot(T('Zırh'),'armor',e.armor)}
            ${this._eqSlot(T('At'),'horse',e.horse)}
        </div>
        <div style="flex:2;">
            <h3 style="color:var(--primary)">${T`Çanta`}</h3>`;
        if(state.player.inventory.length === 0) html += `<p>${T('Envanterin boş.')}</p>`;
        else {
            html += '<div style="display:flex;gap:0.8rem;flex-wrap:wrap;">';
            state.player.inventory.forEach((item,i) => {
                let canEquip = item.type==='weapon'||item.type==='armor'||item.type==='horse';
                let isUse = item.type === 'special' && item.id === 'boss_map';
                html += `<div style="padding:0.8rem;background:rgba(0,0,0,0.3);border:1px solid var(--panel-border);border-radius:6px;width:120px;text-align:center;">
                <div style="font-size:1.5rem">${item.icon||'📦'}</div>
                <div style="font-weight:bold;font-size:0.9rem;margin-top:0.3rem">${T(item.name)}</div>
                <div style="color:var(--text-muted);font-size:0.8rem">x${item.qty}</div>
                ${this.itemNote(item) ? `<div style="font-size:0.68rem;color:#cbb26b;line-height:1.2;margin-top:0.2rem">${this.itemNote(item)}</div>` : ''}
                ${canEquip ? `<button class="btn primary" style="font-size:0.7rem;padding:0.2rem 0.4rem;margin-top:0.3rem" onclick="Game.equipItem(${i})">${T`Kuşan`}</button>` : ''}
                ${isUse ? `<button class="btn" style="border-color:#ffaa00;color:#ffaa00;font-size:0.7rem;padding:0.2rem 0.4rem;margin-top:0.3rem" onclick="Game.useItem(${i})">${T`Kullan`}</button>` : ''}
                </div>`;
            });
            html += '</div>';
        }
        html += '</div></div>';
        document.getElementById('inventory-content').innerHTML = html;
    },
    BOSS_RENOWN: 300,   // boss haritasının nam kapısı (#55 madde 9)
    // Silahın hasar türü künyesi — zırha karşı davranışı burada görünür
    itemNote(item) {
        if(!item) return '';
        if(item.id === 'boss_map') return T`Kullanmak için ${this.BOSS_RENOWN} nam gerekir (sende ${this.peakRenown()})`;
        let bits = [];
        if(item.attack) bits.push(T`+${item.attack} saldırı`);
        if(item.defense) bits.push(T`+${item.defense} savunma`);
        let t = DMG_TYPES[item.dmgType];
        if(t) bits.push(T`${T(t.name)} — düşman savunması %${Math.round(t.armor*100)} etkili, hasar ×${t.mult}${t.knock ? T(', bayıltır (esir)') : ''}`);
        return bits.join(' · ');
    },

    _eqSlot(label, slot, item) {
        return `<div style="background:rgba(0,0,0,0.3);padding:0.8rem;border-radius:6px;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;">
        <div><div style="font-size:0.75rem;color:var(--text-muted)">${label}</div>
        <div style="font-weight:bold">${item ? (item.icon||'')+' '+T(item.name) : T('Yok')}</div>
        ${item ? `<div style="font-size:0.72rem;color:#cbb26b">${this.itemNote(item)}</div>` : ''}</div>
        ${item ? `<button class="btn" style="font-size:0.75rem;padding:0.2rem 0.4rem" onclick="Game.unequipItem('${slot}')">${T`Çıkar`}</button>` : ''}
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
            // Oyunun en güçlü ödülü yalnız parayla alınmasın (#55 madde 9): kapı nam da ister
            if(this.peakRenown() < this.BOSS_RENOWN) {
                alert(`${T`🗺️ Harita bir yol tarif ediyor ama sonundaki kapı herkese açılmıyor.`}<br><br>`
                    + `${T`Savaş Tanrısı'nın önüne çıkmak için <b>${this.BOSS_RENOWN} nam</b> gerekir (sende ${this.peakRenown()}).`}`);
                return;
            }
            state.bossEntries = (state.bossEntries || 0) + 1;
            if(state.bossEntries > 4) { alert(T("Boss haritasını daha fazla kullanamazsın!")); return; }
            item.qty--;
            if(item.qty <= 0) state.player.inventory.splice(idx, 1);
            this.renderInventoryScreen();
            
            let bossLevel = 30 + (state.bossEntries - 1) * 5; // İlk giriş 30, sonra zorlaşır
            Battle.start(T('Savaş Tanrısı (Boss)'), 15 + state.bossEntries * 5, bossLevel);
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
            alert(`${T`Seviye atladın! Artık Lvl ${s.level}. <b>1 Nitelik</b>, 3 Odak Puanı kazandın.`}<br>` +
                  `${T`Nitelik puanı bir <b>hedef</b> koyar; efektif değer o niteliğe uygun oynadıkça yükselir.`}`);
        }
        this.updateTopBar();
    },

};


// --- KAYIT / YÜKLEME ---
// ponytail: tüm state'i JSON'a atıyoruz. npcParties ve görev data'sı düz veri
// olduğu için bu yeterli; kaydedilemeyen tek şey canvas/loop referansları.
const Save = {
    // --- KAYIT SİSTEMİ (#55 madde 1) ---
    // Tek slot + sürümsüz JSON, "eski kayıt yeni kodla açılınca ne oluyor"
    // sorusunu cevapsız bırakıyordu. Artık: sürüm numarası + göç zinciri,
    // 3 elle slot + 5 halkasal otomatik kayıt, panoya dışa/içe aktarma ve
    // bozuk kaydı silmeden kenara çekme.
    LEGACY: 'webband_save_v1',        // sürümsüz tek slot — yalnız okunur, göç kaynağı
    V: 2,
    SLOTS: ['1', '2', '3'],
    AUTOS: ['a1', 'a2', 'a3', 'a4', 'a5'],
    key(slot) { return slot === 'legacy' ? this.LEGACY : 'webband_save_' + slot; },
    slotName(slot) { return slot === 'legacy' ? T('Eski kayıt') : slot[0] === 'a' ? T('Oto ') + slot[1] : T('Slot ') + slot; },

    snapshot() {
        state.meta = Object.assign({ createdAt: Date.now(), playtime: 0 }, state.meta, { v: this.V, surum: VERSION.no });
        return {
            v: this.V, savedAt: Date.now(), surum: VERSION.no,
            gun: state.time.day, ad: state.player.name, seviye: state.player.stats.level,
            state: { ...state },
            // x/y de kaydedilmeli: init() yerleşimleri her açılışta rastgele yeniden dağıtıyor,
            // yoksa yüklemede yollar/oyuncu konumu bambaşka bir dünyaya denk geliyor.
            locations: LOCATIONS.map(l => ({ id: l.id, faction: l.faction, x: l.x, y: l.y, parentId: l.parentId, volunteersAvailable: l.volunteersAvailable, lastRecruitDay: l.lastRecruitDay, prosperity: l.prosperity, raidedDay: l.raidedDay, capturedDay: l.capturedDay,
                owner: l.owner, garrison: l.garrison, storage: l.storage, stock: l.stock,
                enterprise: l.enterprise, treasury: l.treasury })),   // işletme ve kasa (#53)
            playerKingdom: FACTIONS['player_kingdom'] || null
        };
    },

    write(slot) {
        try {
            localStorage.setItem(this.key(slot), JSON.stringify(this.snapshot()));
            return true;
        } catch(e) {
            // Kota dolduysa oyunu kilitlemek yerine söyle: oyuncu eski slotu silebilsin
            Debug.log('kayit', T('Kayıt yazılamadı: ') + e.message, { slot });
            return false;
        }
    },
    save(slot) {
        let ok = this.write(slot || '1');
        if(document.getElementById('save-panel')) return this.open(ok ? T`✅ ${this.slotName(slot || '1')} kaydedildi.` : T('❌ Kayıt başarısız — yer kalmamış olabilir, bir slot sil.'));
        alert(ok ? T('Oyun kaydedildi.') : T('Kayıt başarısız: tarayıcı deposu dolu olabilir.'));
    },
    // Her oyun günü başında halkasal otomatik kayıt (ayarlardan kapatılabilir)
    auto() {
        if(!Game.opt('autosave')) return;
        let i = ((state.meta.autoIdx || 0) % this.AUTOS.length);
        state.meta.autoIdx = i + 1;
        this.write(this.AUTOS[i]);
    },

    // Bozuk JSON oyunu açılmaz hâle getiriyordu; kayıt silinmez, kenara çekilir.
    read(slot) {
        let raw = localStorage.getItem(this.key(slot));
        if(!raw) return null;
        try { return JSON.parse(raw); }
        catch(e) {
            let bak = 'webband_broken_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
            try { localStorage.setItem(bak, raw); localStorage.removeItem(this.key(slot)); } catch(e2) {}
            Debug.log('kayit', T('Bozuk kayıt: ') + e.message, { slot, yedek: bak });
            alert(`${T`Kayıt bozuk (${this.slotName(slot)}).<br>Silmedim, <b>${bak}</b> anahtarına taşıdım.`}`);
            return null;
        }
    },

    // Göç zinciri: her sürüm bir öncekinden gelen kaydı bugünkü şekle çevirir.
    // Eskiden bu yamalar load() içine serpilmiş tek seferlik if'lerdi.
    migrate(d) {
        if(!d.v || d.v < 2) {
            delete d.state.explored;   // savaş sisi kaldırıldı, ızgara artık okunmuyor
            // Efsanevi askerin adı 'Efsanevi ' önekiyle saklanıyordu
            (d.state.player.party || []).forEach(t => {
                if(t.name && t.name.startsWith(T('Efsanevi '))) { t.name = t.name.slice(9); t.legendary = true; }
            });
            if(d.state.muted !== undefined) { d.state.settings = d.state.settings || {}; d.state.settings.muted = d.state.muted; }
            d.state.meta = { v: 2, createdAt: d.savedAt || Date.now(), playtime: 0, gocEdildi: true };
            d.v = 2;
        }
        return d;
    },

    hasSave() { return this.list().length > 0; },
    list() {
        return [].concat(this.SLOTS, this.AUTOS, ['legacy']).map(slot => {
            let raw = localStorage.getItem(this.key(slot));
            if(!raw) return null;
            let d = null;
            try { d = JSON.parse(raw); } catch(e) { return { slot, bozuk: true, kb: Math.round(raw.length / 1024) }; }
            return { slot, kb: Math.round(raw.length / 1024), savedAt: d.savedAt || 0, surum: d.surum || '?',
                     gun: d.gun !== undefined ? d.gun : ((d.state || {}).time || {}).day, ad: d.ad || ((d.state || {}).player || {}).name,
                     seviye: d.seviye || (((d.state || {}).player || {}).stats || {}).level };
        }).filter(Boolean);
    },
    // Başlangıç ekranındaki "Kayıttan Devam": en yeni kayıt hangisiyse o
    continueGame() {
        let rows = this.list().filter(r => !r.bozuk).sort((a, b) => b.savedAt - a.savedAt);
        if(!rows.length) return alert(T('Kayıtlı oyun yok.'));
        this.load(rows[0].slot);
    },

    load(slot) {
        let d = this.read(slot || '1');
        if(!d) return alert(T('Bu slotta kayıt yok.'));
        if(d.v > this.V) return alert(T('Bu kayıt oyunun daha yeni bir sürümünden; yüklenemiyor.'));
        this.migrate(d);
        this.apply(d);
        alert(T`Kayıt yüklendi (${this.slotName(slot || '1')}). Gün ${state.time.day}.`);
    },

    apply(d) {
        if(d.playerKingdom) FACTIONS['player_kingdom'] = d.playerKingdom;
        this.mergeInto(state, d.state);

        let legacyLocs = false;
        (d.locations || []).forEach(sl => {
            let l = LOCATIONS.find(x => x.id === sl.id);
            if(!l) return;
            if(sl.x === undefined) legacyLocs = true;
            Object.assign(l, sl);
        });
        // x/y taşımayan eski kayıtlarda yerleşimler init()'in rastgele yerinde kalır;
        // kayıttan gelen yollar o dünyaya ait olmadığı için baştan örülür.
        // #56 öncesi kayıtlarda yollar düz çizgidir (kind yok) — yeni ağ örülür
        if(legacyLocs || !(state.roads || []).some(r => r.kind)) Game.buildRoads();

        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('main-ui').classList.add('active');
        Game.resizeCanvases();
        Game.camera.x = state.player.x; Game.camera.y = state.player.y;
        Game.camera.offsetX = 0; Game.camera.offsetY = 0;
        Game.showScreen('map');
        Game.applySettings();
        Game.updateTopBar();
        Game.renderPrisonerUI();
        // Kayıtta olmayan alt sistemler kurulur (hepsi kendi içinde tekrarsız)
        if(!Object.keys(state.rivals || {}).length) Nobles.initRivals();
        Game.applyVassals();     // LORDS kayda yazılmaz, vassalların bayrağı burada geri kurulur
        Game.initDiplomacy();    // diplomasi öncesi kayıtlarda cephe kurulur
        Game.ensureTraders();    // eski kayıtlarda kervan/kafile yoktu
        Game.ensureSites();      // eski kayıtlarda keşif noktası yoktu (#58)
        Game.startGameLoop();
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

    del(slot) {
        localStorage.removeItem(this.key(slot));
        this.open(T`🗑️ ${this.slotName(slot)} silindi.`);
    },
    wipe() { this.SLOTS.concat(this.AUTOS, ['legacy']).forEach(s => localStorage.removeItem(this.key(s))); },

    // --- Kayıt ekranı ---
    open(msg) {
        let rows = this.list(), byId = {};
        rows.forEach(r => byId[r.slot] = r);
        let inGame = document.getElementById('main-ui').classList.contains('active');
        let line = (slot) => {
            let r = byId[slot];
            let info = !r ? T('<span style="color:var(--text-muted)">boş</span>')
                : r.bozuk ? `<span style="color:var(--danger)">${T`bozuk (${r.kb} KB)`}</span>`
                : `<b>${r.ad || '—'}</b> ${T`· ${r.gun}. gün · Sv.${r.seviye || 1}`}
                   <span style="color:var(--text-muted);font-size:0.78rem">${T`${new Date(r.savedAt).toLocaleString(I18N.lang)} · ${r.kb} KB · v${r.surum}`}</span>`;
            return `<li style="display:flex;justify-content:space-between;align-items:center;gap:0.6rem;padding:0.45rem 0;border-bottom:1px solid var(--panel-border)">
                <span style="min-width:5rem">${this.slotName(slot)}</span>
                <span style="flex:1;font-size:0.9rem">${info}</span>
                <span style="white-space:nowrap">
                    ${inGame && slot[0] !== 'a' && slot !== 'legacy' ? `<button class="btn" style="font-size:0.75rem;padding:0.2rem 0.5rem" onclick="Save.save('${slot}')">${T`Kaydet`}</button>` : ''}
                    ${r && !r.bozuk ? `<button class="btn primary" style="font-size:0.75rem;padding:0.2rem 0.5rem" onclick="Save.load('${slot}')">${T`Yükle`}</button>` : ''}
                    ${r ? `<button class="btn" style="font-size:0.75rem;padding:0.2rem 0.5rem;border-color:var(--danger);color:var(--danger)" onclick="Save.del('${slot}')">${T`Sil`}</button>` : ''}
                </span></li>`;
        };
        Game.showModal(`<div id="save-panel"><h3>${T`💾 Kayıtlar`}</h3>
        ${msg ? `<p style="color:var(--success)">${msg}</p>` : ''}
        <ul style="list-style:none">${this.SLOTS.map(line).join('')}</ul>
        <h4 style="margin-top:0.8rem;color:var(--text-muted);font-size:0.85rem">${T`Otomatik kayıtlar (her oyun günü)`}</h4>
        <ul style="list-style:none">${this.AUTOS.map(line).join('')}${byId['legacy'] ? line('legacy') : ''}</ul>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.9rem">
            ${inGame ? `<button class="btn" onclick="Save.exportSave()">${T('📤 Dışa Aktar')}</button>` : ''}
            <button class="btn" onclick="Save.importSave()">${T`📥 İçe Aktar`}</button>
            <button class="btn primary" onclick="Game.closeModal()">${T`Kapat`}</button>
        </div></div>`, '660px');
    },
    // file:// altında dosya indirmek sorunlu; metin panoya kopyalanır (#52 raporuyla aynı desen)
    exportSave() {
        let txt = JSON.stringify(this.snapshot());
        Game.showModal(`<h3>${T`📤 Kaydı Dışa Aktar`}</h3>
        <p style="font-size:0.85rem;color:var(--text-muted)">${T`Aşağıdaki metni saklayabilir ya da hata raporuna ekleyebilirsin (${Math.round(txt.length / 1024)} KB).`}</p>
        <textarea id="save-text" readonly style="width:100%;height:180px;background:rgba(0,0,0,0.45);color:#cfd6dc;border:1px solid var(--panel-border);border-radius:6px;font:0.7rem/1.3 monospace;padding:0.5rem">${txt.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</textarea>
        <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:0.8rem">
            <button class="btn primary" onclick="Save.copyText()">${T`📋 Panoya Kopyala`}</button>
            <button class="btn" onclick="Save.open()">${T`← Kayıtlar`}</button>
        </div><div id="save-msg" style="text-align:center;margin-top:0.5rem;color:var(--success);font-size:0.85rem"></div>`, '660px');
    },
    copyText() {
        let ta = document.getElementById('save-text');
        let done = () => { let m = document.getElementById('save-msg'); if(m) m.textContent = T('✅ Panoya kopyalandı.'); };
        if(navigator.clipboard) navigator.clipboard.writeText(ta.value).then(done, () => { ta.select(); document.execCommand('copy'); done(); });
        else { ta.select(); document.execCommand('copy'); done(); }
    },
    importSave() {
        Game.showModal(`<h3>${T`📥 Kaydı İçe Aktar`}</h3>
        <p style="font-size:0.85rem;color:var(--text-muted)">${T`Dışa aktarılmış kayıt metnini yapıştır; 1. slota yazılır ve açılır.`}</p>
        <textarea id="save-text" style="width:100%;height:180px;background:rgba(0,0,0,0.45);color:#cfd6dc;border:1px solid var(--panel-border);border-radius:6px;font:0.7rem/1.3 monospace;padding:0.5rem"></textarea>
        <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:0.8rem">
            <button class="btn primary" onclick="Save.doImport()">${T`Yükle`}</button>
            <button class="btn" onclick="Save.open()">${T`← Kayıtlar`}</button>
        </div><div id="save-msg" style="text-align:center;margin-top:0.5rem;color:var(--danger);font-size:0.85rem"></div>`, '660px');
    },
    doImport() {
        let ta = document.getElementById('save-text'), msg = document.getElementById('save-msg');
        let d;
        try { d = JSON.parse(ta.value); } catch(e) { msg.textContent = T('Metin geçerli JSON değil.'); return; }
        if(!d || !d.state || !d.state.player) { msg.textContent = T('Bu bir WebBand kaydı değil.'); return; }
        if(d.v > this.V) { msg.textContent = T('Kayıt oyunun daha yeni bir sürümünden.'); return; }
        this.migrate(d);
        try { localStorage.setItem(this.key('1'), JSON.stringify(d)); } catch(e) { msg.textContent = T('Yazılamadı: ') + e.message; return; }
        this.apply(d);
        alert(T`Kayıt içe aktarıldı ve 1. slota yazıldı. Gün ${state.time.day}.`);
    }
};

window.onload = () => Game.init();
