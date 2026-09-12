// ============================================
// WEBBAND - Mount & Blade Style RPG
// ============================================

// Version stamp (#55 item 8): shown in the bug report and in the corner of the
// start screen. The player's desktop shortcut pulls the repo to `main` on every
// launch, so this is the only answer to "which code are we even talking about" — bumped by hand every turn.
const VERSION = { no: '1.01', date: '2026-09-12', name: 'Çapulcu Çapulcudur' };  // the version name is not translated

// --- ERROR BUFFER AND DEBUG REPORT (#52) ---
// Give the player more than just a screenshot: errors pile up in a ring buffer,
// and the button in the side menu turns it all into one JSON blob and copies it to the clipboard.
// It sits at the very top of the file so an error thrown during game setup is caught too.
const Debug = {
    errors: [], MAX_ERRORS: 25, frames: [],
    log(kind, msg, extra) {
        this.errors.push(Object.assign({ t: new Date().toISOString().slice(11, 19), kind, msg: String(msg).slice(0, 400) }, extra || {}));
        if(this.errors.length > this.MAX_ERRORS) this.errors.shift();
        this.seen++;
        this.badge();
    },
    // Badge in the corner of the screen (#55 item 2): the game shouldn't die silently —
    // a player who never opens the console should still see there was an error. Clicking it opens the report.
    seen: 0,
    badge() {
        let el = document.getElementById('err-badge');
        if(!el) return;
        el.textContent = T`⚠️ ${this.seen} hata — tıkla ve kopyala`;
        el.classList.toggle('hidden', !this.seen);
    },
    // The single gate wrapping the loop body: an exception thrown inside it used
    // to break the rAF chain (the screen freezes, nobody notices). Now the error
    // is reported once, repeats of the same signature are just counted, and the loop keeps going.
    _sig: {},
    guard(where, fn) {
        try { return fn(); }
        catch(e) {
            let sig = where + '|' + (e && e.message);
            if(this._sig[sig]) { this._sig[sig]++; return; }
            this._sig[sig] = 1;
            this.log(T('döngü'), where + ': ' + ((e && e.message) || e), {
                stack: ((e && e.stack) || '').split('\n').slice(1, 4).map(l => l.trim()).join(' | ')
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
    // skipFrame calls this every rAF: for black-screen/freeze complaints, the frame intervals become documented evidence
    frame(ms) { this.frames.push(Math.round(ms * 10) / 10); if(this.frames.length > 30) this.frames.shift(); },
    report() {
        let g = (f, d) => { try { let v = f(); return v === undefined ? d : v; } catch(e) { return T('hata: ') + e.message; } };
        let cv = id => g(() => { let c = document.getElementById(id); return c ? T`${c.width}x${c.height} (css ${Math.round(c.clientWidth)}x${Math.round(c.clientHeight)})` : 'none'; });
        return {
            version: { build: VERSION.no + ' — ' + VERSION.name, date: VERSION.date,
                     file: document.lastModified, url: location.href.split('?')[0], time: new Date().toISOString() },
            game: g(() => {
                let p = state.player;
                return {
                    day: state.time.day, hour: Math.floor(state.time.hour) + ':00', timeScale: state.timeScale,
                    screen: (document.querySelector('.view.active') || {}).id,
                    modalOpen: !document.getElementById('modal-overlay').classList.contains('hidden'),
                    name: p.name, level: p.stats.level, hp: Math.floor(p.stats.hp) + '/' + p.stats.maxHp, money: p.money, renown: p.renown,
                    pos: { x: Math.round(p.x), y: Math.round(p.y) }, status: p.status,
                    party: p.party.length + '/' + Game.getPartyCapacity(), prisoners: (p.prisoners || []).length,
                    faction: Game.playerFaction(), infamy: Game.infamy(),
                    siege: p.siege || null, raid: p.raid || null, captive: p.prisoner ? p.prisoner.npcName : null,
                    wars: Object.keys(state.wars || {}), quests: (p.quests || []).map(q => q.id)
                };
            }, T('oyun başlamamış')),
            render: {
                battleActive: g(() => Battle.active), tournamentActive: g(() => TournamentMinigame.active),
                mapLoopId: g(() => Game._loopId), battleLoopId: g(() => Battle.loopId),
                targetFps: g(() => Game.lite() ? 30 : 60),
                frameDivider: g(() => Math.max(1, Math.floor(1000 / (Game.lite() ? 30 : 60) / Game._step + 0.01))),
                effectiveFps: g(() => Game._step === Infinity ? T('ölçülmedi')
                    : Math.round(1000 / Game._step / Math.max(1, Math.floor(1000 / (Game.lite() ? 30 : 60) / Game._step + 0.01)))),
                measuredRefresh: g(() => Game._step === Infinity ? T('ölçülmedi') : Math.round(1000 / Game._step) + T(' Hz')),
                mapCanvas: cv('map-canvas'), battleCanvas: cv('battle-canvas'),
                lastFrames: this.frames.slice()
            },
            browser: {
                ua: navigator.userAgent, lang: navigator.language, dpr: window.devicePixelRatio,
                window: innerWidth + 'x' + innerHeight, screen: screen.width + 'x' + screen.height,
                // The notch. iOS reports it through env(safe-area-inset-*), but a shell that
                // zeroes the WKWebView's content inset reports 0 while still drawing under
                // the status bar — and a 0 here is indistinguishable from a flat screen (#94).
                // A custom property holding env() computes to the unresolved token, so the
                // insets have to be measured on a real box.
                safeArea: g(() => Game.safeArea().join(' ')),
                shell: window.Capacitor ? 'capacitor' : 'web',
                memory: g(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + T(' MB') : 'unknown')
            },
            errors: this.errors.slice(),
            swallowedRepeats: Object.keys(this._sig).map(k => `${k} x${this._sig[k]}`)
        };
    },
    text() { return JSON.stringify(this.report(), null, 1); },
    open() {
        let n = this.errors.length;
        // The badge counts *unseen* errors, and opening the report is seeing them —
        // otherwise it stayed on screen forever with no way to dismiss it.
        this.seen = 0;
        this.badge();
        Game.showModal(`<h3>${T`🐞 Debug Raporu`}</h3>
            <p style="font-size:var(--fs-sm);color:var(--text-muted)">${T`Tamponda <b>${n}</b> hata var. Aşağıdaki metni kopyalayıp doğrudan issue'ya yapıştırabilirsin.`}</p>
            <textarea id="debug-text" readonly style="width:100%;height:260px;background:rgba(0,0,0,0.45);color:#cfd6dc;border:1px solid var(--panel-border);border-radius:6px;font:0.72rem/1.35 monospace;padding:0.5rem">${this.text().replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</textarea>
            <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:0.8rem">
                <button class="btn primary" onclick="Debug.copy()">${T`📋 Panoya Kopyala`}</button>
                <button class="btn" onclick="Debug.download()">${T`💾 Dosya Olarak İndir`}</button>
                <button class="btn" onclick="Game.closeModal()">${T`Kapat`}</button>
            </div>
            <div id="debug-msg" style="text-align:center;margin-top:0.5rem;font-size:var(--fs-sm);color:var(--success)"></div>`, '720px');
    },
    copy() {
        let ta = document.getElementById('debug-text');
        let done = () => { let m = document.getElementById('debug-msg'); if(m) m.textContent = T('✅ Panoya kopyalandı.'); };
        // If clipboard permission is unavailable (file:// or an old browser), select and fall back to execCommand
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
    swadia:  { id: 'swadia',  name: 'Svadya Krallığı',  people: 'Svadya',  color: '#ff4d4d', crest: 0, ruler: 'Kral Harlaus', vizier: 'Vezir Klargus', lore: 'Ağır zırhlı şövalyeleri ve geniş düzlükleriyle meşhur, eski Kalradya İmparatorluğu\'nun asıl varisi olduğunu iddia eden güçlü bir krallık.' },
    rhodok:  { id: 'rhodok',  name: 'Rodok Krallığı',   people: 'Rodok',   color: '#33cc33', crest: 1, ruler: 'Kral Graveth', vizier: 'Vezir Matheas', lore: 'Dağlık bölgelerde yaşayan özgür ruhlu insanların kurduğu, tatar yaylı keskin nişancıları ve dev kalkanlı mızraklılarıyla geçilmez bir krallık.' },
    vaegir:  { id: 'vaegir',  name: 'Veagir Krallığı',  people: 'Veagir',  color: '#cccccc', crest: 3, crestFx: 'saturate(0.2) brightness(1.1)', ruler: 'Kral Yaroglek', vizier: 'Vezir Vuldrat', lore: 'Kuzeyin karlı ve soğuk ormanlarından gelen, baltalı piyadeleri ve ölümcül okçularıyla bilinen sert insanların diyarı.' },
    nord:    { id: 'nord',    name: 'Nord Krallığı',    people: 'Nord',    color: '#3399ff', crest: 3, ruler: 'Kral Ragnar', vizier: 'Vezir Lethwin', lore: 'Deniz aşırı ülkelerden uzun gemileriyle gelip kıyıları ele geçiren, atları kullanmayan fakat piyade dövüşünde rakipsiz olan savaşçılar.' },
    khergit: { id: 'khergit', name: 'Kergit Hanlığı',   people: 'Kergit',   color: '#cc66ff', crest: 2, ruler: 'Sancar Han', vizier: 'Vezir Tonju', lore: 'Doğunun bozkırlarından at sırtında gelen, aşırı hızlı atlı okçuları ve göçebe savaş taktikleriyle düşmanlarını çıldırtan boyların birleşimi.' }
};

// --- CHARACTER CREATION ---
// Warband's background questions: gender + 4 questions. Each answer makes a small
// but permanent difference to attributes/proficiencies/purse; choices are kept in state.player.background.
// Effect format: attr{}, prof{}, money, renown, item (equipped), relAll, relFaction{id,n}
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

// Banner: kingdom_crests.jpg's 2x2 crests + your own color. Once you found a
// kingdom, this is the source of your kingdom's color and your party color on the map.
// The sheet holds four banners (lion / bear / horse / raven), so the nine choices
// reuse them; the colour and the name are what tell two banners apart. Index is what
// a save stores (`state.player.banner`), so entries are only ever appended.
const BANNERS = [
  { crest:0, color:'#c0392b', name:'Kızıl Aslan' },
  { crest:3, color:'#2e86c1', name:'Mavi Karga' },
  { crest:1, color:'#27ae60', name:'Yeşil Ayı' },
  { crest:2, color:'#8e44ad', name:'Mor At' },
  { crest:0, color:'#e67e22', name:'Turuncu Aslan' },
  { crest:1, color:'#ffcc00', name:'Altın Ayı' },
  { crest:2, color:'#95a5a6', name:'Gümüş At' },
  { crest:3, color:'#16a085', name:'Deniz Kargası' },
  { crest:3, color:'#d35400', name:'Bakır Balta' }
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
    // `const Game` doesn't attach to window (it's a lexical global binding), so
    // window.Game was always undefined and EVERY alert in the game was being swallowed silently.
    if(typeof Game !== 'undefined' && Game.showModal) {
        Game.showModal(`<div style="text-align:center"><h3 style="margin-bottom:1rem;color:#ffaa00">${T`Bildirim`}</h3><p style="font-size:1.1rem;line-height:1.5">${String(msg).replace(/\n/g, '<br>')}</p><button class="btn primary" style="margin-top:1.5rem" onclick="Game.closeModal()">${T`Tamam`}</button></div>`);
    }
};

// Damage types (Warband): armor resists each type differently.
// armor = what fraction of defense applies, mult = the raw damage multiplier.
const DMG_TYPES = {
    cut:    { name: 'kesici', armor: 1.0,  mult: 1.0 },
    pierce: { name: 'delici', armor: 0.5,  mult: 0.9 },
    blunt:  { name: 'ezici',  armor: 0.65, mult: 0.8, knock: true }   // doesn't kill, knocks out: takes prisoners
};

const ITEMS = {
    // spoil: how many days until the whole stock spoils (daily loss = qty/spoil).
    // Cheap food spoils fast, pricier food keeps — so stockpiling is a real choice.
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
// Each faction has its own troop tree: recruit -> branch -> elite.
// Row format: [name, type, hp, speed, attack, defense, icon, upgrade cost]
const TROOP_TREES = {
    swadia: {   // balanced; the strongest heavy cavalry
        recruit: ['Svadya Köylüsü', 'infantry', 20, 50, 6, 0, '🪖', 'blunt'],
        branches: [
            [['Svadya Milisi', 'infantry', 45, 60, 12, 5, '🛡️', 'pierce', 40],
             ['Svadya Çavuşu', 'infantry', 65, 70, 18, 12, '🏰', 'cut', 100]],
            [['Svadya Avcısı', 'archer', 35, 55, 6, 2, '🏹', 'pierce', 50],
             ['Svadya Keskin Nişancısı', 'archer', 45, 60, 10, 5, '🎯', 'pierce', 120]],
            [['Svadya Süvarisi', 'cavalry', 50, 99, 12, 8, '🐴', 'cut', 70],
             ['Svadya Şövalyesi', 'cavalry', 75, 110, 22, 15, '⚔️🐴', 'cut', 150]]
        ]
    },
    rhodok: {   // no cavalry; huge shields and the Tatar bow
        recruit: ['Rodok Köylüsü', 'infantry', 20, 50, 6, 0, '🪖', 'blunt'],
        branches: [
            [['Rodok Mızraklısı', 'infantry', 48, 56, 11, 8, '🛡️', 'pierce', 40],
             ['Rodok Kalkanlısı', 'infantry', 70, 58, 17, 18, '🛡️', 'cut', 110]],
            [['Rodok Nişancısı', 'archer', 36, 54, 8, 3, '🏹', 'pierce', 55],
             ['Rodok Tatar Yaylısı', 'archer', 48, 56, 16, 6, '🎯', 'pierce', 130]]
        ]
    },
    vaegir: {   // axe infantry, deadly archers, mediocre cavalry
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
    nord: {     // doesn't use horses; unrivaled in infantry combat
        recruit: ['Nord Serfi', 'infantry', 20, 50, 6, 0, '🪖', 'blunt'],
        branches: [
            [['Nord Savaşçısı', 'infantry', 50, 62, 14, 6, '🛡️', 'cut', 45],
             ['Nord Baltacısı', 'infantry', 80, 74, 24, 13, '🪓', 'cut', 140]],
            [['Nord Avcısı', 'archer', 38, 58, 9, 3, '🏹', 'pierce', 50],
             ['Nord Nişancısı', 'archer', 50, 60, 12, 6, '🎯', 'pierce', 115]]
        ]
    },
    khergit: {  // all mounted; fast but thin armor
        recruit: ['Kergit Çobanı', 'infantry', 20, 70, 6, 0, '🪖', 'blunt'],
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
// The 'Acemi Asker' name from old saves maps into the Swadia tree
TROOP_TYPES['Acemi Asker'] = TROOP_TYPES['Svadya Köylüsü'];
TROOP_UPGRADES['Acemi Asker'] = TROOP_UPGRADES['Svadya Köylüsü'];

// Enemy bands: the party on the map + the unit mix in battle.
// battle: [name, type, hp, speed, attack, defense, weight] — weight = spawn chance
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
    // Village militia: the villagers you face during a raid. Doesn't roam the
    // map, only spawns in the Game.startRaid battle (bandKey is looked up by name).
    militia:  { name: 'Köy Milisi', color: '#c9a227', icon: 'foot', min: 4, max: 16, speedMult: 1, dmg: 'pierce',
                lore: '"Tırpanı kap Yusuf, geliyorlar!"',
                battle: [['Köylü','infantry',22,50,5,0,7], ['Köy Avcısı','archer',20,52,6,0,3],
                         ['Köy Bekçisi','infantry',30,54,8,2,2]],
                leader: ['Köy Muhtarı','infantry',44,54,10,3] },
    // Trade parties (#22): roam the map, never attack; robbing them drops their cargo
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
    settings: {},            // settings screen (#55): keys that deviate from the default; read via Game.opt()
    meta: {},                // save metadata: { v, surum, createdAt, playtime }
    timeScale: 1,            // time-flow multiplier (0.5/1/2 from the calendar badge in the top bar)
    activeTournaments: {},   // { cityId: true }
    mercPools: {},           // { locId: { day, list:[{name, level, count}] } }
    encounterCooldown: 0,
    player: {
        name: T('Maceracı'),
        gender: 'male',        // 'female' -> relations with lords start at −5, the marriage path goes through lords
        banner: 5,             // BANNERS index: crest + kingdom color
        background: {},        // answers given during character creation { birth, father, youth, job }
        money: 250,
        renown: 0,
        rightToRule: 0,
        wageDebt: 0,          // unpaid wages pile up
        wageLateHours: 0,     // how many hours overdue (-1 morale per hour)
        partyCapacity: 50,
        party: [],
        inventory: [{...ITEMS.bread, qty:1}],   // a single loaf: the food problem starts on day one (#75)
        equipment: { weapon: null, armor: null, horse: null },
        x: 4500, y: 4500,
        targetLocation: null,
        status: 'idle',
        speed: 50,
        // str/agi/int/cha/vit are the TARGET values; spending points grows the target.
        // eff.* is the effective (actually-in-effect) value, which approaches the target as you perform the related action.
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
        siege: null,               // siege camp: { locId, plan, daysLeft, weaken, foundingKingdom }
        currentRaid: null,         // the village being raided: { locId }
        wait: null,                // camping: { until } — time flows ×4, an encounter cuts it short (#53/1.1)
        honor: 0,                  // honor −100..100; the negative side is the old "raider mark" (#53/1.5)
        ambition: null,            // the selected goal: { id, day }
        ambitionsDone: [],         // ids of completed goals
        currentEncounterNpcId: null,
        prisoner: null,  // { npcId, daysLeft, ransomRequired, ransomRefusals }
        morale: 60,      // party morale 0-100
        moraleInfo: {},  // line items from the last morale calc (shown on the party screen)
        prisoners: [],   // captured prisoners: { id, name, level, type } | noble: { id, name, noble, lordId, faction, ransom }
        quests: [],
        poems: [],
    },
    time: { day:1, hour:8 },

    // --- Noble / quest system ---
    vassals: [],          // ids of lords who joined your kingdom (#40)
    relations: {},        // lordId -> -100..100
    affection: {},        // ladyId -> 0..100
    rivals: {},           // ladyId -> { lordId, affection }
    knownLocations: {},   // lordId -> { x, y, radius, day, name, live }
    questCooldown: {},    // lordId -> day
    smallTalkDay: {}, giftDay: {}, visitDay: {}, poemsRead: {}, dedicatedTo: [],
    pendingQuest: null, questOffers: {}, dowryOffer: null, betrothed: null, pendingWedding: null,
    pendingDedication: false, duel: null,
    feast: null, scheduledFeasts: [], nextFeastDay: 8,
    wars: {},            // 'a|b' (ordered faction pair) -> the day the war started
    warLog: [],          // recent events: { day, msg }
    lordRespawn: {},     // a lord party routed on the front -> which day it comes back
    grudges: {},         // lordId -> the day the blood feud started (#53/1.3): hunts you for 30 days
    warSeeded: false,    // whether the first war was assigned when the world was created
    allies: {},          // 'a|b' -> the day the alliance was formed
    campaigns: {},       // faction -> { marshalId, marshalName, targetLocId, day, pledged, helped }
    campaignCooldown: {}, // faction -> the day the last campaign ended
    guildPaid: {},       // locId -> the day the guild ledger fee was paid (#71)
    marshalOf: null,     // the faction whose marshal the player is (#69)
    envoy: null,         // { compId, name, lordId, backDay, mission } — companion sent as envoy (#69)
};

// --- INPUT ---
const Input = {
    keys: {},
    mouse: { x: 0, y: 0 },
    stick: null,          // last direction of the left stick (#65) — movement
    aim: null,            // last direction of the right stick (#88) — aim; overrides the left stick when set

    // No mouse cursor when playing by touch: aim derives from the stick's direction.
    // The battle engine still only looks at Input.mouse, so there's no second, separate aiming path to maintain.
    // If the right stick is never touched, aim falls back to the movement direction like before.
    aimSync(u) {
        let d = this.aim || this.stick;
        if(!d) return;
        this.mouse.x = u.x + d.x * 120;
        this.mouse.y = u.y + d.y * 120;
    },

    // The layout-independent name of a letter key; anything else falls back to e.key.
    letter(e) { return /^Key[A-Z]$/.test(e.code || '') ? e.code[3].toLowerCase() : (e.key || '').toLowerCase(); },

    init() {
        window.addEventListener('keydown', e => {
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            // A Turkish keyboard sends 'ı' from the key engraved I, and 'ı'.toLowerCase()
            // is still 'ı' — so the menu shortcuts and WASD only worked on a US layout.
            // e.code names the *physical* key, which is what a keycap hint promises (#94).
            let k = Input.letter(e);
            this.keys[k] = true;
            if(e.key === ' ') e.preventDefault(); // Prevent scrolling with Space
            // While a modal is open the keyboard belongs to the modal (#55 item 6): Esc
            // closes it, Enter presses the primary button. The encounter modal doesn't close with Esc — it isn't an escape from battle.
            if(!document.getElementById('modal-overlay').classList.contains('hidden')) {
                if(e.key === 'Escape') Game.dismissModal();
                else if(e.key === 'Enter') {
                    let b = document.querySelector('#modal-body button.primary') || document.querySelector('#modal-body button');
                    if(b) { e.preventDefault(); b.click(); }
                }
                return;
            }
            // Menu shortcuts (Warband-style) — inactive while battle/tournament/a modal is open
            if(!Battle.active && !TournamentMinigame.active && !e.ctrlKey && !e.metaKey &&
               document.getElementById('modal-overlay').classList.contains('hidden') &&
               document.getElementById('main-ui').classList.contains('active')) {
                let scr = { m:'map', c:'character', p:'party', i:'inventory', q:'quests' }[k];
                if(scr) Game.showScreen(scr);
                // Esc returns to the map from any screen
                else if(e.key === 'Escape') Game.showScreen('map');
                // Space brings the camera back to the player (if the map was panned away from the edge)
                else if(e.key === ' ' && document.getElementById('map-view').classList.contains('active')) Game.centerOnPlayer();
                // K: kingdoms' war/peace status
                else if(k === 'k') Game.showDiplomacy();
                // N: next piece — the music re-composes itself, so skipping is the only way
                // to hear a different band without waiting out the current one
                else if(k === 'n') Game.Music.skip();
            }
        });
        window.addEventListener('keyup', e => { 
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if(e.key) Input.keys[Input.letter(e)] = false; 
        });
        window.addEventListener('blur', () => {
            Input.keys = {}; // Prevent keys from getting stuck down when window focus is lost
        });
        window.addEventListener('mousemove', e => {
            Input.mouse.clientX = e.clientX;
            Input.mouse.clientY = e.clientY;
            Input.stick = null; Input.aim = null;   // if the mouse moved, it takes over aim, not the virtual stick
            
            let canvas = document.getElementById('battle-canvas');
            if(canvas && canvas.offsetParent !== null) { // Only track if visible
                let rect = canvas.getBoundingClientRect();
                Input.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
                Input.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
            }
        });
        window.addEventListener('wheel', e => {
            // `#map-view` carries `active` from page load — it is the selected *tab*, not a
            // visible map. Wheeling the start screen (which scrolls since #94) therefore
            // zoomed the map all the way out before the game even began. offsetParent is
            // the same visibility test the battle canvas uses above.
            if (Game.mapCanvas && Game.mapCanvas.offsetParent !== null) {
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

    // The continent is 9000 units wide; the farthest zoom-out fits all of it on screen (6% margin at the edge).
    minZoom() {
        if(!this.mapCanvas) return 0.12;
        return Math.max(0.07, Math.min(0.8, Math.min(this.mapCanvas.width, this.mapCanvas.height) / 9600));
    },

    // Keep settlement/party icons a readable size on screen when zoomed out (labels
    // already scaled by 1/zoom, but icons were in world units so they shrank away).
    iconScale() { return Math.max(1, 0.55 / this.camera.zoom); },

    // --- DRAW CACHES AND LITE MODE (#80) ---
    // The map was being redrawn from scratch every frame: ~150 mountains + 25
    // settlement emoji re-rasterized, ~250 gradient objects created and thrown away,
    // the coastline shadow blurred pixel by pixel with shadowBlur. On desktop the JS
    // side looks cheap (0.5 ms) because the whole cost is in rasterizing; on phones
    // the same work eats the frame budget along with heating up the device. All
    // three are fixed by the same principle: **bake the expensive thing once, then just stamp the image** (the map's counterpart to Battle.buildGround).

    // Lite mode: turns on by itself on touch devices, can be turned off in settings.
    // 'auto' = ask the device. The answer is cached since it's asked several times per frame.
    lite() {
        if(this._lite === undefined) {
            let v = this.opt('lite');
            this._lite = v === 'auto' ? this.isTouch() : !!v;
        }
        return this._lite;
    },

    // Emoji glyph: baked once into a power-of-two bucket, then stamped at a smaller size.
    // (The bucket is always chosen bigger than the requested size, so it's always downscaling — never blurs.)
    // x/y and size mean the same thing as `fillText(ch, x, y)` + `textBaseline:'alphabetic'`.
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
            s._base = Math.round(px * 1.25) / px;      // baseline-to-glyph-size ratio
            s._k = 1 / px;
            this._sprites[key] = s;
        }
        let k = size * s._k;
        ctx.drawImage(s, x - s.width * k / 2, y - s._base * size, s.width * k, s.height * k);
    },

    // A radial gradient centered at the origin; the caller moves it into place with translate.
    // A gradient is bound to the context that created it, so the cache lives on the context.
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

    // Label width is directly proportional to font size: measured once at 19px,
    // then just multiplied. (There used to be ~75 measureText calls per frame.)
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
        this.renderVerTag();
        this.applySettings();
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        this.mapCanvas = document.getElementById('map-canvas');
        // Opaque canvas: the sea fills every frame edge to edge, no alpha channel needed.
        // alpha:false lets the browser skip the blending pass (noticeable on weak GPUs).
        this.ctx = this.mapCanvas.getContext('2d', { alpha: false });
        // Mouse and touch go through a single gate (#65): pointer events carry both.
        // The destination marker is draggable (#35): press, move, release — the route rebuilds instantly
        this.mapCanvas.addEventListener('pointerdown', e => this.onMapDown(e));
        this.mapCanvas.addEventListener('pointermove', e => this.onMapMove(e));
        this.mapCanvas.addEventListener('pointerup', e => this.onMapUp(e));
        this.mapCanvas.addEventListener('pointercancel', e => this.onMapUp(e));
        // On a device with no keyboard, key badges would lie: CSS reads from a single class (#65)
        document.body.classList.toggle('touch', this.isTouch());
        // iOS Safari ignores `user-scalable=no`: a two-finger pinch zoomed the whole
        // UI, the game shifted, and there was no way back. Page zoom serves no
        // purpose in this game — Safari's own gesture events are stopped here,
        // and the Chrome/Android side is cut off by `touch-action` in style.css.
        ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev =>
            document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
        this.initTouchUI();
        document.getElementById('modal-overlay').addEventListener('click', e => {
            // Don't let the encounter (fight/surrender) modal close by clicking outside it
            if(e.target.id === 'modal-overlay') this.dismissModal();
        });
        window.addEventListener('resize', () => this.resizeCanvases());

        // Initialize village volunteers
        LOCATIONS.forEach(loc => {
            // Prosperity is a single number: it feeds the garrison, the volunteer pool, and market prices
            loc.prosperity = 35 + Math.floor(Math.random()*40)
                           + (loc.type === 'city' ? 15 : loc.type === 'castle' ? 5 : 0);
            if(loc.type === 'village' || loc.type === 'city') {
                loc.volunteersAvailable = 1 + Math.floor(Math.random()*4);
                if(loc.type === 'city') loc.volunteersAvailable += 3; // Cities have more
            }
        });

        // Build the continent and mountain range
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

    // --- SETTLEMENT PLACEMENT (#57) ---
    // Each settlement used to land at a fully random point in its wedge: two
    // cities could overlap, a region could stay empty. Now there are three rules
    // (minimum gap / castle on the border / village tied to a hub) and the output is validated.
    MIN_GAP: {
        'city|city': 700, 'city|castle': 480, 'city|village': 380,
        'castle|castle': 620, 'castle|village': 340, 'village|village': 420
    },
    VILLAGE_RANGE: [420, 900],       // the village's distance from the city/castle it's tied to

    minGap(a, b) { return this.MIN_GAP[a + '|' + b] || this.MIN_GAP[b + '|' + a] || 400; },

    // Is the candidate spot settleable: inside the continent and far enough from neighbors
    spotOk(p, type, placed) {
        if(Math.hypot(p.x - 4500, p.y - 4500) > this.getMapRadius(p.x, p.y) - 320) return false;
        return placed.every(o => this.dist(p, o) >= this.minGap(type, o.type));
    },

    // Set up the world: place settlements, weave roads, validate the result. If
    // the rules aren't met it retries from scratch — nobody plays in a disconnected/overlapping world.
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
            // City → castle → village order: so the village finds its hub already placed
            for(let type of ['city', 'castle', 'village']) {
                for(let loc of mine.filter(l => l.type === type)) {
                    if(type === 'village') { this.placeVillage(loc, mine, placed); continue; }
                    for(let k = 0; k < 400; k++) {
                        // Castle sits on the border (the wedge's outer 20%), city stays inside
                        let f = type === 'castle'
                            ? (Math.random() < 0.5 ? 0.02 + Math.random() * 0.18 : 0.80 + Math.random() * 0.18)
                            : 0.22 + Math.random() * 0.56;
                        // Distance is relative to the coastline: pulled in on the narrow side,
                        // opened up on the wide side — a fixed band left the continent's bulging sides empty
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

    // A village is tied to a city/castle (`loc.parentId`); the hub with the fewest villages is picked
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

    // Post-generation validation: gap, inside the continent, village–hub link, road connection
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
        // No settlement should be left disconnected: every settlement must sit at the end of at least one road segment
        let touched = new Set();
        (state.roads || []).forEach(r => LOCATIONS.forEach(l => {
            if(Math.hypot(l.x - r.x1, l.y - r.y1) < 40 || Math.hypot(l.x - r.x2, l.y - r.y2) < 40) touched.add(l.id);
        }));
        LOCATIONS.filter(l => !touched.has(l.id)).forEach(l => bad.push(l.name + T(' yol ağına bağlı değil')));
        return bad;
    },

    // A city's/castle's villages. If there's no `parentId` (an old world), falls back to the old 900-unit rule.
    villagesOf(loc) {
        let kids = LOCATIONS.filter(l => l.type === 'village' && l.parentId === loc.id);
        return kids.length ? kids
            : LOCATIONS.filter(l => l.type === 'village' && !l.parentId && this.dist(l, loc) < 900);
    },

    // --- ABANDONED STRUCTURES AND POINTS OF INTEREST (#58) ---
    // The map shouldn't be only settlements and enemies: points out in the field
    // you can travel to, with an outcome unknown in advance. They don't go into
    // LOCATIONS (`state.sites`), but since they carry `type:'site'` the
    // targeting/arrival machine (setTarget → update → enterLocation) carries them too, through a single one-line gate.
    SITE_COUNT: 14,
    SITE_MIN_GAP: 520,          // at least this far from a settlement and from each other

    // renew: how many days until it refills; 0 = one-time use (removed from the map once investigated)
    SITE_KINDS: {
        ruin:  { icon: '🏚️', name: 'Harabe', renew: 0,
                 desc: 'Adını kimsenin hatırlamadığı bir kalenin devrilmiş duvarları.',
                 pool: { coin: 3, gear: 2, ambush: 3, empty: 2 } },
        farm:  { icon: '🌾', name: 'Terk Edilmiş Çiftlik', renew: 25,
                 desc: 'Kapısı açık kalmış bir ambar; tarlayı ot basmış.',
                 pool: { food: 4, recruit: 2, empty: 2, ambush: 1 } },
        tower: { icon: '🗼', name: 'Gözetleme Kulesi', renew: 12,
                 desc: 'Yıllar önce nöbet tutulan bir kule. Merdiveni hâlâ sağlam görünüyor.',
                 pool: { scout: 5, coin: 1, empty: 2, trap: 1 } },
        cave:  { icon: '🕳️', name: 'Mağara', renew: 30,
                 desc: 'Ağzından soğuk hava geliyor. İçeride bir şeyin yaşadığı belli.',
                 pool: { coin: 2, gear: 2, ambush: 4, trap: 2 } },
        camp:  { icon: '⛺', name: 'Terk Edilmiş Kamp', renew: 15,
                 desc: 'Ateş külü hâlâ ılık. Buradan aceleyle kalkmışlar.',
                 pool: { coin: 2, food: 2, shelter: 2, ambush: 2, empty: 1 } },
        // A lair isn't a point of interest, it's a target: not investigated, assaulted.
        // It stays in `state.sites` because drawing, tooltips, clicks, targeting, and
        // saving already run through that array — a separate `state.lairs` would have meant a second loop in five different places.
        lair:  { icon: '☠️', name: 'Haydut İni', renew: 0, lair: true,
                 desc: 'Kayaların arasına sinmiş bir kamp. Etraftaki yollarda kimse geceleyin yürümüyor.' }
    },

    // Outcomes follow the same pattern as the daily event pool (DAY_EVENTS): a
    // `when` filter + `run` text. Whether it's a reward or a risk isn't known before you investigate.
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
            // Looking out from the tower reveals a distant party — it uses the "where is
            // it?" mechanic's marker, so Nobles.dailyTick removes it by itself after 3 days.
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
        let kinds = Object.keys(this.SITE_KINDS).filter(k => !this.SITE_KINDS[k].lair);
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

    // --- BANDIT LAIRS (#68) ---
    // A band no longer spawns out of thin air: every band has a lair it comes from.
    // It gnaws at nearby settlements every day and its purse grows; clearing it gives
    // you the purse and stops bands from spawning in that region. For the first time the map becomes genuinely "clearable".
    LAIR_COUNT: 5,
    LAIR_RANGE: 1500,        // gnaws at prosperity within this radius (at 2500 the whole map was in lair range)
    LAIR_DECAY: 0.5,         // prosperity per day (daily recovery is 0.4/0.15 — so the lair wins)
    LAIR_PURSE: 15,          // purse accumulated per day
    LAIR_RESPAWN: 20,        // a missing lair is rebuilt every this many days
    lairs() { return (state.sites || []).filter(s => s.kind === 'lair'); },
    ensureLairs() {
        this.ensureSites();
        for(let i = this.lairs().length; i < this.LAIR_COUNT; i++) this.spawnLair();
    },
    spawnLair() {
        for(let k = 0; k < 200; k++) {
            let a = Math.random() * Math.PI * 2;
            let R = this.getMapRadius(4500 + Math.cos(a), 4500 + Math.sin(a));
            let p = { x: 4500 + Math.cos(a) * R * (0.2 + Math.random() * 0.7),
                      y: 4500 + Math.sin(a) * R * (0.2 + Math.random() * 0.7) };
            let farEnough = LOCATIONS.every(l => this.dist(l, p) >= this.SITE_MIN_GAP)
                    && (state.sites || []).every(o => this.dist(o, p) >= this.SITE_MIN_GAP)
                    && this.dist(p, state.player) >= this.SPAWN_SAFE;
            if(!farEnough && k < 199) continue;
            let l = { id: 'lair_' + Math.random().toString(36).substr(2, 7), kind: 'lair', type: 'site',
                      name: 'Haydut İni', band: this.randomBandKind(),
                      x: p.x, y: p.y, strength: 8 + Math.floor(Math.random() * 5),
                      purse: 0, foundDay: state.time.day, seen: false };
            state.sites.push(l);
            return l;
        }
    },
    // An unseen lair isn't on the map: you have to find it before you can go there.
    lairSeen(s) {
        if(s.kind !== 'lair') return true;
        if(this.dist(s, state.player) < this.getVisibility()) s.seen = true;
        return !!s.seen;
    },
    // A band comes out of its lair. No band spawns in a lair-free region — that's the payoff of clearing it.
    spawnFromLair() {
        let l = this.lairs();
        if(!l.length) return null;
        let lair = l[Math.floor(Math.random() * l.length)];
        return this.spawnBand(lair.band, lair);
    },
    lairTick() {
        let l = this.lairs();
        l.forEach(x => {
            this.lairSeen(x);                                 // counts as found if you passed near it during the day
            x.purse = Math.min(1200, x.purse + this.LAIR_PURSE);
            x.strength = Math.min(24, x.strength + 0.15);     // an old lair is a grown lair
        });
        // Decay doesn't stack, only the nearest lair counts (same reason as `worst()`
        // in terrain penalties): a village at the overlap of three lairs was losing 1.8 prosperity a day and dying.
        LOCATIONS.forEach(loc => {
            if(loc.prosperity === undefined) return;
            if(l.some(x => this.dist(x, loc) < this.LAIR_RANGE))
                loc.prosperity = Math.max(10, loc.prosperity - this.LAIR_DECAY);
        });
        if(l.length < this.LAIR_COUNT && state.time.day % this.LAIR_RESPAWN === 0) this.spawnLair();
    },
    // Assaulting the lair: the purse is yours, the region breathes again, no more bands spawn from that lair.
    clearLair(id) {
        let l = this.lairs().find(x => x.id === id);
        if(!l) return '';
        state.sites = state.sites.filter(x => x !== l);
        state.npcParties.forEach(n => { if(n.lairId === l.id) n.lairId = null; });   // don't leave a dangling id
        Quests.emit('lair_cleared', { lairId: l.id });
        state.player.money += Math.round(l.purse);
        LOCATIONS.forEach(x => {
            if(x.prosperity !== undefined && this.dist(x, l) < this.LAIR_RANGE)
                x.prosperity = Math.min(100, x.prosperity + 5);
        });
        return T`<b>İn dağıtıldı.</b> Biriken kese <b>${Math.round(l.purse)} dinar</b> senin;
            çevredeki yerleşimler nefes aldı ve buradan yeni çete çıkmayacak.`;
    },
    assaultLair(id) {
        let l = this.lairs().find(x => x.id === id);
        if(!l) return this.closeModal();
        this.closeModal();
        state.player.currentEncounterNpcId = null;
        state.player.currentLair = l.id;
        Battle.start(BAND_KINDS[l.band].name, Math.round(l.strength));
    },

    // An investigated point is empty until it refills (if renew is 0 it's already been removed)
    siteReady(s) {
        let k = this.SITE_KINDS[s.kind];
        return !s.usedDay || (k.renew > 0 && state.time.day - s.usedDay >= k.renew);
    },

    enterSite(s) {
        let k = this.SITE_KINDS[s.kind];
        if(k.lair) return this.showModal(`<h3>${k.icon} ${T(k.name)}</h3>
            <p style="font-style:italic;color:var(--text-muted)">${T(k.desc)}</p>
            <p>${T`Nöbetçileri saydın: kabaca <b>${Math.round(s.strength)} kişi</b>.
                Bastığın gün biriktirdikleri de senin olur.`}</p>
            <div style="display:flex;gap:0.5rem;margin-top:1rem">
                <button class="btn primary" onclick="Game.assaultLair('${s.id}')">${T`⚔️ İni Bas`}</button>
                <button class="btn" onclick="Game.closeModal()">${T`🚪 Yoluna Devam Et`}</button>
            </div>`);
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
        if(k.lair) return this.enterSite(s);    // a lair isn't investigated, it's assaulted
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
        this._afterModal = r.then || null;
        this.showModal(`<h3>${k.icon} ${T(k.name)}</h3><p>${r.html}</p>
            <button class="btn primary" style="margin-top:1rem" onclick="Game.modalDone()">${T`Tamam`}</button>`);
    },

    // "Close, then continue": both a point of interest and a road event show a
    // result and can then open a battle — a battle screen started before the modal
    // closed was ending up stuck underneath it. One gate, two callers.
    modalDone() {
        let f = this._afterModal;
        this._afterModal = null;
        this.closeModal();
        if(f) f();
    },

    agoText(day) {
        let n = state.time.day - day;
        return n <= 0 ? '<b>bugün</b>' : `<b>${T`${n} gün önce`}</b>`;
    },

    siteTipHtml(s) {
        let k = this.SITE_KINDS[s.kind];
        if(k.lair) return `<i>${T(k.desc)}</i><br>${T`⚔️ Kabaca ${Math.round(s.strength)} kişi`}`;
        return `<i>${T(k.desc)}</i><br>${this.siteReady(s)
            ? T('🔍 Henüz araştırılmadı')
            : T`✔️ ${this.agoText(s.usedDay)} araştırıldı${k.renew ? T` (${k.renew} günde bir yenilenir)` : ''}`}`;
    },

    // --- ROAD NETWORK (#56) ---
    // Road types: paved-stone main road (cities), dirt road (castles), an
    // unmaintained goat path (villages). They all sit as short segments in the
    // same `state.roads` array — getTerrainInfo and renderMap keep reading a single data shape.
    ROAD_KINDS: {
        stone: { half: 26, mult: 1.18, name: 'Taş Yol',   icon: '🛣️' },
        dirt:  { half: 22, mult: 1.10, name: 'Toprak Yol', icon: '🛤️' },
        track: { half: 15, mult: 1.04, name: 'Keçi Yolu',  icon: '🥾' }
    },
    roadKind(loc) { return loc.type === 'city' ? 'stone' : loc.type === 'castle' ? 'dirt' : 'track'; },

    // A natural route between two points: gentle curves + skirting forests + staying
    // near the coast. Returns a polyline made of short segments instead of a straight line.
    roadPath(a, b) {
        let dx = b.x - a.x, dy = b.y - a.y;
        let len = Math.hypot(dx, dy) || 1;
        let n = Math.max(6, Math.min(18, Math.round(len / 220)));
        let nx = -dy / len, ny = dx / len;              // perpendicular direction
        let amp = len * (0.10 + Math.random() * 0.14) * (Math.random() < 0.5 ? -1 : 1);
        let phase = Math.random() * Math.PI * 2;
        let pts = [];
        for(let i = 0; i <= n; i++) {
            let t = i / n;
            // Base curve that zeroes out at the ends (sin) + a deviation from the second harmonic
            let off = (i === 0 || i === n) ? 0
                    : amp * Math.sin(t * Math.PI) * (0.7 + 0.3 * Math.sin(t * Math.PI * 2 + phase));
            let p = { x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off };
            if(i > 0 && i < n) {
                // Passes along the forest's edge, not through its interior
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

    // Intersection of two line segments (a river crossing = a bridge point)
    segCross(p, q, r, s) {
        let d = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
        if(Math.abs(d) < 1e-6) return null;
        let t = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / d;
        let u = ((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / d;
        if(t < 0 || t > 1 || u < 0 || u > 1) return null;
        return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
    },

    // The road network connecting every settlement. A new settlement can also
    // connect to the nearest **road point** — so real junctions form in the
    // network (previously every connection came out of a settlement, a star-shaped MST).
    // Called again whenever settlement coordinates change (loading an old save).
    buildRoads() {
        state.roads = [];
        state.bridges = [];
        let nodes = [{ x: LOCATIONS[0].x, y: LOCATIONS[0].y }];   // connectable points
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

    // Splits a route into segments, marks river crossings as bridges, and
    // adds intermediate points to `nodes` as junction candidates.
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

    // Crossing a river via a bridge doesn't slow you down (getTerrainInfo)
    onBridge(x, y) {
        return (state.bridges || []).some(br => Math.hypot(x - br.x, y - br.y) < 70);
    },

    // Enemy varieties on the map: each has a different unit mix and behavior in
    // battle (BAND_KINDS.battle -> unit generation inside Battle.start)
    spawnBand(kind, lair) {
        let k = BAND_KINDS[kind];
        let size = k.min + Math.floor(Math.random() * (k.max - k.min + 1));
        let npc = this.createNPC(k.name, 'bandit', size, k.color, null, 1);
        npc.band = kind;
        // A band comes out of its lair: place it around the lair, and if that's too
        // close to the player, leave it at the random spot createNPC gave it (SPAWN_SAFE is the one rule).
        if(lair) {
            for(let i = 0; i < 20; i++) {
                let a = Math.random() * Math.PI * 2, r = 200 + Math.random() * 300;
                let p = { x: lair.x + Math.cos(a) * r, y: lair.y + Math.sin(a) * r };
                if(this.dist(p, state.player) < this.SPAWN_SAFE) continue;
                npc.x = npc.targetX = p.x; npc.y = npc.targetY = p.y;
                npc.lairId = lair.id;
                break;
            }
        }
        npc.speed = Math.round(npc.speed * (k.speedMult || 1));
        state.npcParties.push(npc);
        return npc;
    },
    // Tougher bands appear as days pass
    randomBandKind() {
        let pool = ['bandit', 'bandit', 'wolf', 'forest'];
        if(state.time.day >= 20) pool.push('mountain');
        return pool[Math.floor(Math.random() * pool.length)];
    },

    // --- TRADE PARTIES (#22) ---
    // The map shouldn't only be bandits and lords: caravans shuttle between
    // cities, villagers shuttle between their own village and the nearest city.
    // They don't attack; robbing them pays off in loot, but robbing a kingdom at peace is banditry.
    spawnTrader(kind) {
        let pool = LOCATIONS.filter(l => l.type === (kind === 'caravan' ? 'city' : 'village'));
        let home = pool[Math.floor(Math.random() * pool.length)];
        if(!home) return null;
        let k = BAND_KINDS[kind];
        let size = k.min + Math.floor(Math.random() * (k.max - k.min + 1));
        // `npc.name` stays raw (a fallback for places like the battle title that
        // don't translate); the display name always comes from `npcName()`.
        let name = kind === 'caravan' ? `${this.factionPeople(home.faction)} Kervanı` : `${home.name} Köylüleri`;
        let npc = this.createNPC(name, kind, size, k.color, home.faction, 1);
        npc.band = kind;
        npc.speed = kind === 'caravan' ? 58 : 52;
        npc.trade = { kind, homeId: home.id, homeName: home.name, fromId: home.id, toId: home.id };
        if(kind === 'villager') {
            let market = LOCATIONS.filter(l => l.type === 'city')
                                  .sort((a, b) => this.dist(a, home) - this.dist(b, home))[0];
            npc.trade.marketId = market ? market.id : home.id;
        }
        // Cargo scales with guard count (#55 item 9): a 6-person caravan used to
        // carry the same purse as a 14-person one, so picking off the weakest was risk-free profit.
        // w = size / the type's midpoint; average cargo is unchanged, its spread is tied to risk.
        let w = size / ((k.min + k.max) / 2);
        if(kind === 'caravan') {
            let goods = Object.values(ITEMS).filter(i => i.type === 'trade');
            npc.cargo = [];
            for(let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
                let g = goods[Math.floor(Math.random() * goods.length)];
                // Balance cargo by value: little velvet, lots of ale
                let qty = Math.max(1, Math.round((3 + Math.random() * 4) * w * 100 / g.basePrice));
                let ex = npc.cargo.find(c => c.id === g.id);
                if(ex) ex.qty += qty; else npc.cargo.push({ id: g.id, qty });
            }
            npc.purse = Math.round((120 + Math.random() * 260) * w);
        } else {
            // Since food got cheaper (#47) a caravan now carries cartloads — otherwise robbing it was pointless
            npc.cargo = [{ id: 'wheat', qty: Math.max(4, Math.round((15 + Math.random() * 30) * w)) },
                         { id: 'cheese', qty: Math.max(2, Math.round((5 + Math.random() * 15) * w)) }];
            npc.purse = Math.round((20 + Math.random() * 50) * w);
        }
        npc.x = npc.targetX = home.x; npc.y = npc.targetY = home.y;
        state.npcParties.push(npc);
        this.traderArrive(npc);   // let it pick its first destination
        return npc;
    },
    // Keep the same density on the roads — a robbed caravan is replaced the next day
    ensureTraders() {
        let n = k => state.npcParties.filter(p => p.trade && p.trade.kind === k).length;
        for(let i = n('caravan'); i < 6; i++) this.spawnTrader('caravan');
        for(let i = n('villager'); i < 8; i++) this.spawnTrader('villager');
    },
    // Arrived at destination: leaves a bit of prosperity at the settlement, heads to its next stop
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
        // A caravan doesn't enter a war zone: it heads to a city at peace with its own kingdom
        let cities = LOCATIONS.filter(l => l.type === 'city' && l.id !== t.toId && !this.atWar(npc.faction, l.faction));
        return cities.length ? cities[Math.floor(Math.random() * cities.length)] : LOCATIONS.find(l => l.id === t.fromId);
    },
    // Meeting a caravan isn't a battle, it's a choice
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
        // Hitting a caravan of a kingdom you're at war with is a campaign; hitting one at peace is banditry
        if(!this.atWar(this.playerFaction(), npc.faction) && npc.faction !== this.playerFaction()) {
            state.player.renown = Math.max(0, (state.player.renown || 0) - 5);
            if(typeof Nobles !== 'undefined')
                LORDS.filter(l => l.faction === npc.faction).forEach(l => Nobles.addRel(l.id, -4));
            // Banditry costs honor and sets the region's lord on your trail (#53)
            this.addHonor(npc.trade && npc.trade.kind === 'villager' ? 'robPeasant' : 'robPeace');
            this.addGrudgeNearest(npc.faction);
        }
        Battle.start(npc.name, npc.size, null, npc.faction);
    },

    // --- BANDITRY (#24) ---
    // The player isn't the only one who robs caravans. Bandit bands also hit a
    // caravan they cross paths with; the cargo and purse stay on the band, so
    // whoever defeats that band gets the cargo too (the victory branch already writes beaten.cargo/purse to inventory).
    banditTick() {
        // Hunting behavior is in updateNPCs: the band walks onto the caravan, this is where the raid resolves
        let raiders = state.npcParties.filter(n => n.type === 'bandit' && n.size > 0
                                                   && !(BAND_KINDS[n.band] || {}).beast);
        if(!raiders.length) return;
        state.npcParties.filter(t => t.trade && t.size > 0).forEach(t => {
            let b = raiders.find(r => r.size > 0 && this.dist(r, t) < 400);
            if(!b) return;
            let pw = p => p.size * (0.7 + Math.random() * 0.6);
            // A caravan guard earns their pay, a villager party can't run
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
            // Cargo that never arrives lowers the destination's prosperity
            let dest = LOCATIONS.find(l => l.id === t.trade.toId);
            if(dest) dest.prosperity = Math.max(10, (dest.prosperity || 50) - (t.trade.kind === 'caravan' ? 1.5 : 0.5));
            this.news(T`🗡️ ${T(b.name)}, ${this.npcName(t)} kafilesini bastı — yük çetenin elinde.`);
        });
        state.npcParties = state.npcParties.filter(n => n.size > 0 || n.lordId);
    },

    // The continent is 9000 units, your view is ~500: you see ~1% of the map at
    // any moment. With 13 bands roaming, a player was seeing 0.3 bands a day —
    // once every three days, and hunting for a *specific* band was hopeless. The
    // population target is derived from visibility, not held fixed: `bandTarget()` gives the count that yields ~1 encounter a day based on the area swept.
    BAND_REFILL: 3,          // at most this many new bands set out per day
    bandCount() { return state.npcParties.filter(n => n.type === 'bandit' && n.size > 0).length; },
    bandTarget() {
        // Area swept per day ≈ 2·sight · daily travel; its ratio to the continent is
        // the daily encounter probability per band. Target: ~1 encounter a day.
        let swept = 2 * this.getVisibility() * 2600;
        return Math.round(Math.max(14, Math.min(30, 9000 * 9000 / swept)));
    },
    spawnNPCs() {
        this.ensureTraders();
        this.ensureLairs();
        // The world starts at the target population; it used to start at 13 and
        // spawn one a day, so the map was genuinely empty the first week.
        for(let i = 0; i < this.bandTarget(); i++) this.spawnFromLair();
        // Every noble has their own party roaming the map
        LORDS.forEach(l => {
            let size = l.rank === 'king' ? 100 : l.rank === 'vizier' ? 50 : 35;
            let npc = this.createNPC(l.name, l.rank, size, FACTIONS[l.faction].color, l.faction, 1);
            npc.lordId = l.id;
            let home = LOCATIONS.find(x => x.id === l.homeLocId);
            if(home) { npc.x = home.x; npc.y = home.y; npc.targetX = home.x; npc.targetY = home.y; }
            state.npcParties.push(npc);
        });
    },

    // Single display point for the party's name. Band/noble names come from a data table
    // (they have a dictionary key); caravan and village-convoy names are composite,
    // so they're translated as a template rather than a key.
    npcName(npc) {
        if(!npc) return '';
        if(npc.trade) return npc.trade.kind === 'caravan'
            ? T`${this.factionPeople(npc.faction)} Kervanı`
            : T`${T(npc.trade.homeName || '')} Köylüleri`;
        return T(npc.name);
    },

    // A new band/party doesn't spawn in the player's lap. The player starts at
    // 4500,4500 and since r started randomly from 0, a bandit band could spawn
    // right on top of them on the first frame: they'd get caught and taken captive
    // without noticing. This is the single gate — it applies both at world setup (spawnNPCs) and daily respawn (spawnBand).
    SPAWN_SAFE: 1500,

    createNPC(name, type, size, color, faction = null, level = 1) {
        let x, y;
        for(let i = 0; i < 40; i++) {
            let a = Math.random() * Math.PI * 2;
            let r = Math.random() * 3800; // Random within the map
            x = 4500 + Math.cos(a)*r; y = 4500 + Math.sin(a)*r;
            if(this.dist({ x, y }, state.player) >= this.SPAWN_SAFE) break;
        }
        return {
            id: 'npc_' + Math.random().toString(36).substr(2,9),
            name, type, faction, level,
            x, y, targetX: x, targetY: y,
            speed: type === 'bandit' ? 66 : (type === 'king' ? 70 : (type === 'vizier' ? 84 : 84)),
            size, color
        };
    },

    // --- CHARACTER CREATION ---
    // The wizard runs on top of a modal: each question in BACKGROUND is a step, then
    // the banner, then the summary. Choices are applied from one place, in applyCreation().
    creation: { step: 0, sel: {} },

    startGame() {
        const n = document.getElementById('char-name').value.trim();
        if(n) state.player.name = n;
        this.creation = { step: 0, sel: {} };
        this.renderCreation();
    },

    // Translates an option's effect into human language (used in both the wizard and the summary).
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
        if(step > BACKGROUND.length + 1) return this.renderCreationSummary();
        if(step === BACKGROUND.length + 1) return this.renderDiffStep();
        if(step === BACKGROUND.length) return this.renderBannerStep();

        let q = BACKGROUND[step], sel = this.creation.sel[q.key];
        let html = `<h3>${T(q.q)}</h3>
            <p style="color:var(--text-muted);font-size:var(--fs-sm)">${T`Adım ${step+1}/${BACKGROUND.length+2} — ${T(q.hint)}`}</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">`;
        q.opts.forEach(o => {
            html += `<button class="btn${sel === o.id ? ' primary' : ''}" style="text-align:left;line-height:1.4"
                onclick="Game.pickCreation('${q.key}','${o.id}')">
                <b>${T(o.label)}</b>
                <div style="font-size:var(--fs-sm);color:var(--text-muted);font-style:italic">${T(o.desc)}</div>
                <div style="font-size:var(--fs-sm);color:var(--primary)">${this.bonusText(o) || T('ek bir getirisi yok')}</div>
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

    // Banner selection: if you found a kingdom, this crest and color become yours.
    bannerColor() { return (BANNERS[state.player.banner] || BANNERS[0]).color; },

    // The only place that knows how kingdom_crests.jpg is cut: a 2x2 sheet of four
    // banners, so 200% zoom and a 0%/100% position picks out one whole quadrant (#92).
    // Every crest on screen goes through here — banners, kingdoms, anything later.
    crestCss(crest, size, style = '') {
        let c = ((crest | 0) % 4 + 4) % 4;
        return `<div style="width:${size}px;height:${size}px;flex:0 0 auto;background-image:url('kingdom_crests.jpg');
            background-size:200% 200%;background-position:${(c % 2) * 100}% ${Math.floor(c / 2) * 100}%;${style}"></div>`;
    },

    bannerCss(i, size = 72) {
        let b = BANNERS[i] || BANNERS[0];
        return this.crestCss(b.crest, size,
            `border:3px ridge ${b.color};border-radius:6px;box-shadow:inset 0 0 18px #000;`);
    },

    renderBannerStep() {
        let html = `<h3>${T`Sancağını seç`}</h3>
            <p style="color:var(--text-muted);font-size:var(--fs-sm)">${T`Adım ${BACKGROUND.length+1}/${BACKGROUND.length+2} — ${T(`Haritada grubunun rengi budur; kendi krallığını kurarsan krallığının da arması olur.`)}`}</p>
            <div style="display:flex;flex-wrap:wrap;gap:0.8rem;margin-top:1rem;justify-content:center">`;
        BANNERS.forEach((b, i) => {
            let on = this.creation.sel.banner === i;
            html += `<div onclick="Game.pickBanner(${i})" style="cursor:pointer;width:110px;text-align:center;padding:0.5rem;
                border-radius:8px;border:2px solid ${on ? b.color : 'var(--panel-border)'};background:rgba(0,0,0,0.3)">
                <div style="display:flex;justify-content:center">${this.bannerCss(i, 72)}</div>
                <div style="font-size:var(--fs-sm);margin-top:0.4rem;color:${b.color}">${T(b.name)}</div>
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

    // Settings asked before entering the game (#88): difficulty and lite mode. Language is
    // already asked on first launch (#lang-ask). No separate table — reads from the same
    // Game.DIFFS / Game.OPTS as the rows in ⚙️ Settings, writes through the same Game.setOpt gate.
    renderDiffStep() {
        let cur = this.opt('difficulty'), lt = this.opt('lite');
        let html = `<h3>${T`⚙️ Ayarlar`}</h3>
            <p style="color:var(--text-muted);font-size:var(--fs-sm)">${T`Adım ${BACKGROUND.length+2}/${BACKGROUND.length+2} — ${T(`Sonradan ⚙️ Ayarlar'dan değiştirebilirsin.`)}`}</p>
            <h4 style="margin:1rem 0 0.4rem">${T('⚔️ Zorluk')}</h4>
            <div style="display:flex;flex-direction:column;gap:0.5rem">`;
        for(let k in this.DIFFS) {
            let d = this.DIFFS[k];
            html += `<button class="btn${cur === k ? ' primary' : ''}" style="text-align:left;line-height:1.4"
                onclick="Game.pickDiff('${k}')">
                <b>${T(d.name)}</b>
                <div style="font-size:var(--fs-sm);color:var(--text-muted)">${T(d.note)}</div>
            </button>`;
        }
        html += `</div><h4 style="margin:1.1rem 0 0.4rem">${T('📱 Hafif mod')}</h4>
            <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-bottom:0.5rem">${T('Bütün oyunu sadeleştirir: deniz dalgası, orman ağaçları, ocak ışığı, savaş parçacıkları ve cam bulanıklığı düşer, hedef 30 fps. Telefonda kendiliğinden açılır.')}</div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap">`;
        for(let v of ['auto', true, false]) {
            html += `<button class="btn${lt === v ? ' primary' : ''}" style="font-size:var(--fs-sm)"
                onclick="Game.setOpt('lite', ${this.lit(v)}); Game.renderDiffStep()">${v === 'auto' ? T('Cihaza göre') : v ? T('Açık') : T('Kapalı')}</button>`;
        }
        html += `</div><div style="display:flex;gap:0.5rem;margin-top:1.2rem">
            <button class="btn" onclick="Game.creationBack()">${T`← Geri`}</button>
            <button class="btn primary" onclick="Game.diffStepDone()">${T`Sonraki`}</button></div>`;
        this.showModal(html, '660px');
    },

    pickDiff(k) {
        this.setOpt('difficulty', k);
        this.renderDiffStep();     // keep the choice, lite mode gets asked too
    },

    diffStepDone() {
        this.creation.step = BACKGROUND.length + 2;
        this.renderCreation();
    },

    renderCreationSummary() {
        let sel = this.creation.sel;
        let rows = BACKGROUND.map(q => {
            let o = q.opts.find(x => x.id === sel[q.key]);
            return `<div style="margin-bottom:0.4rem"><b>${T(q.q)}</b> ${T(o.label)}
                <div style="font-size:var(--fs-sm);color:var(--primary)">${this.bonusText(o) || '—'}</div></div>`;
        }).join('');
        let b = BANNERS[sel.banner || 0];
        let html = `<h3>${state.player.name}</h3>
            <div style="display:flex;gap:1.2rem;align-items:flex-start;margin-top:0.6rem">
                ${this.bannerCss(sel.banner || 0, 96)}
                <div style="flex:1;font-size:var(--fs-md);line-height:1.5">
                    <div style="color:${b.color};font-weight:bold">${T`${T(b.name)} sancağı`}</div>
                    ${rows}
                    <div><b>${T('⚔️ Zorluk')}</b> ${T(this.diff().name)}</div>
                </div>
            </div>
            <div style="display:flex;gap:0.6rem;margin-top:1.2rem">
                <button class="btn primary" style="flex:1" onclick="Game.finishCreation()">${T`⚔️ Maceraya Başla`}</button>
                <button class="btn" onclick="Game.creationBack()">${T`← Geri`}</button>
            </div>`;
        this.showModal(html, '660px');
    },

    // Applies the chosen background to the character. Single application point — the summary
    // screen also reads from the same source via bonusText here.
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
        // Rival suitors are set up based on gender (for a female player, targets are lords)
        Nobles.initRivals();
        this.initDiplomacy();   // There's always an open front in Calradia
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('main-ui').classList.add('active');
        this.resizeCanvases();
        
        // Instantly focus the camera on the player at start
        this.camera.x = state.player.x;
        this.camera.y = state.player.y;
        this.camera.offsetX = 0;
        this.camera.offsetY = 0;

        this.updateTopBar();
        this.applySettings();
        this.startGameLoop();
        // Tutorial shown once when a new character drops onto the map (#87).
        // Save.load doesn't pass through here on load, so it never shows for a returning player.
        setTimeout(() => this.startTutorial(), 400);
    },

    resizeCanvases() {
        // A hidden canvas's parent reports size 0; writing that value leaves the canvas
        // permanently 0x0. Only write when there's a real size.
        let fit = (canvas) => {
            let w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
            if(w > 0 && h > 0) { canvas.width = w; canvas.height = h; }
        };
        fit(this.mapCanvas);
        fit(document.getElementById('battle-canvas'));
    },

    // At 144/180 Hz, rAF gives 5-7 ms budget per frame; the game looks the same at 60 fps
    // too, but it costs the GPU 2-3x the work, and dropped frames feel like stutter.
    // Extra frames are skipped.
    //
    // A fixed ms threshold doesn't work: at 90 Hz, skipping every second frame gives 45 fps.
    // Instead, the refresh rate is measured and the largest whole divisor that doesn't drop
    // below 60 is chosen -> 60:60, 75:75, 90:90, 120:60, 144:72, 165:82, 180:60, 240:60.
    _prevT: 0, _step: Infinity, _steps: [], _frameNo: 0, _lastSkip: false,
    skipFrame(t) {
        // The decision is made per FRAME, not per call (#42). When two loops ask in the same
        // frame, both must get the same answer: previously each call incremented _frameNo,
        // so the counter advanced by 2 per frame, and on any screen with n≥2 (120 Hz
        // and up) one of the loops' parity always landed on odd — that loop never ran,
        // NOT EVEN ONCE. Measured: at n=2, over 2 seconds the map loop ran 60 times,
        // the battle loop 0 times; the battle froze and the screen stayed pitch black
        // since the canvas was never drawn.
        if(t === this._prevT) return this._lastSkip;
        let d = t - this._prevT;
        this._prevT = t;
        Debug.frame(d);                                     // frame intervals go into the debug report (#52)
        // The refresh period is the MEDIAN of the last frames, not the minimum.
        //
        // The minimum was a fatally bad estimator: a single bad sample pinned it permanently,
        // because the value could never climb back up.
        // That's exactly what the debug report from an iPhone measured — while scrolling
        // the page, iOS delivers two rAFs ~2 ms apart, `_minStep` locks to 2 ms,
        // and the divisor `1000/30/2` = **16**: 15 of every 16 frames get dropped,
        // and the game ran at **3.8 fps** on a 60 Hz screen. The "500 Hz" line in
        // the report was an echo of that same bad sample.
        //
        // The median is resilient in both directions (a long jank or a double delivery both
        // stay in the minority) and **self-corrects** as the window slides. The sample
        // filter is the second safeguard: consumer screens top out at 240 Hz, so an
        // interval under 4 ms can't be the screen's period. If the filter rejects
        // everything, `_step` stays Infinity and the divisor becomes 1 — so the error always falls on the side of "draw too many frames".
        if(d > 4 && d < 200) {
            this._steps.push(d);
            if(this._steps.length > 31) this._steps.shift();
            let srt = this._steps.slice().sort((a, b) => a - b);
            this._step = srt[srt.length >> 1];      // with a single sample the median is the sample itself: no warm-up
        }
        // The gate can be turned off from settings (#55 item 7): a player who doesn't trust
        // the gate should have an escape hatch. Measurement (Debug.frame) keeps running even while it's off.
        if(!this.opt('frameGate')) return this._lastSkip = false;
        // Target 30 fps in lite mode: halving the frame budget on phones helps more
        // than trimming the drawing (and it also slows down thermal warm-up).
        let fps = this.lite() ? 30 : 60;
        let n = Math.max(1, Math.floor(1000 / fps / this._step + 0.01));
        return this._lastSkip = ((++this._frameNo % n) !== 0);
    },

    // battle-canvas is shared by Battle and TournamentMinigame. The first getContext call is
    // binding: if one of them forgets the { alpha:false } flag, the second call returns null
    // and the screen stays pitch black again — the root cause gets looked for somewhere else entirely. One gate carries the contract (#54).
    battleCtx() {
        let c = document.getElementById('battle-canvas');
        let ctx = c.getContext('2d', { alpha: false });
        if(!ctx) Debug.log('canvas', T('battle-canvas 2d bağlamı alınamadı — ekran siyah kalır'));
        return ctx;
    },

    startGameLoop() {
        // Double-loop guard: if load/restart adds one more rAF loop each time, time and
        // movement speed up multiplicatively.
        if(this._loopId) cancelAnimationFrame(this._loopId);
        let lastTime = performance.now();
        const loop = (t) => {
            // Battle/tournament runs its own loop; the map loop steps aside.
            // showScreen() restarts it when returning to a non-battle screen.
            if(Battle.active || TournamentMinigame.active) { this._loopId = null; return; }
            if(this.skipFrame(t)) { this._loopId = requestAnimationFrame(loop); return; }
            let dt = (t - lastTime) / 1000;
            if(dt > 0.1) dt = 0.1;
            lastTime = t;
            // Don't let an exception break the rAF chain: the error is reported once, the loop lives on (#55)
            Debug.guard('map loop', () => { this.update(dt); this.renderMap(); });
            this._loopId = requestAnimationFrame(loop);
        };
        this._loopId = requestAnimationFrame(loop);
    },

    // --- UPDATE ---
    // --- ATTRIBUTES: target / effective ---
    // Awarding a point doesn't unlock the attribute instantly; it sets a TARGET. The effective
    // value approaches the target as you play in ways that suit it: agility by covering ground,
    // strength by swinging a sword, intelligence by talking, leadership by commanding a crowd,
    // vitality by taking a beating. Fast while the gap is big, slow as it nears the target.
    ATTRS: {
        str: { name: 'Güç',      icon: '💪', how: 'Yakın dövüşte isabetli vuruş' },
        agi: { name: 'Çeviklik', icon: '🏃', how: 'Haritada yol katetmek' },
        int: { name: 'Zekâ',     icon: '🧠', how: 'Soylularla konuşmak, görev almak' },
        cha: { name: 'Liderlik', icon: '👑', how: 'Kalabalık bir grubu yönetmek' },
        vit: { name: 'Dirayet',  icon: '🫀', how: 'Savaşta hasar yemek ve ayakta kalmak' }
    },
    // Measured: closing a 5-point gap takes ~38 "notable actions" —
    // ~11 map crossings for agility, ~8 battles for strength, ~38 days for leadership.
    ATTR_RATE: 0.08,

    // Effective value. If an old save has no eff, it's set equal to the target (backward compat).
    attr(k) {
        let s = state.player.stats;
        if(!s.eff) s.eff = {};
        if(s.eff[k] === undefined) s.eff[k] = s[k] || 10;
        return s.eff[k];
    },
    attrInt(k) { return Math.floor(this.attr(k)); },

    // w: the weight of the action (1 ≈ "one notable action").
    trainAttr(k, w) {
        let s = state.player.stats;
        let cur = this.attr(k), gap = (s[k] || 10) - cur;
        if(gap <= 0) { s.eff[k] = s[k] || 10; return; }
        // Without the 0.25 base, the target would never be reached (the gain would go to 0 as the gap shrank).
        s.eff[k] = Math.min(s[k], cur + w * this.ATTR_RATE * (0.25 + gap));
    },

    // Vitality: HP regen isn't in jumps of 5, it's steps of 1 HP per hour.
    hpRegenHours() { return Math.max(1, 8 - Math.floor((this.attr('vit') - 10) / 2)); },

    // A new character is limited to 12 people; the army grows with attributes, skill, AND renown.
    // Renown counts too, because troops in numbers follow a commander with a name.
    getPartyCapacity() {
        let cha = this.attr('cha');
        let leadership = state.player.proficiencies.leadership ? state.player.proficiencies.leadership.level : 1;
        // Since attributes are effective (fractional), capacity came out fractional too
        // ("15/15.785700000000002"). The fraction is truncated at the source so the
        // comparison, the info-card readout, and the badge all see the same whole number (#43).
        return 12 + Math.floor((cha - 10) * 3) + (leadership - 1) * 4 + Math.floor((state.player.renown || 0) / 40);
    },

    // Unpaid wages cost 1 morale every hour and the debt accumulates. It's paid off
    // automatically the moment money comes in; the counter only resets once the debt is fully cleared.
    // HP fills 1 at a time at the interval Vitality sets, not in jumps of 5.
    // The cap is explicit: maxHp. It works while captive too — you heal in the cell.
    HUNGER_HP: 3,          // HP cost of a day spent hungry (#75)
    regenTick() {
        if(state.player.wasHungry) return;     // a hungry man doesn't heal (#75)
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

    // Prey in the forest goes unnoticed: a band among the trees isn't spotted by normal
    // sight, only by getting close or tracking (Spotting / Pathfinding).
    spotRange(npc) {
        let vis = this.getVisibility();
        if(this.getTerrainInfo(npc.x, npc.y).name !== 'Orman') return vis;
        let track = (this.profLvl('spotting') - 1) * 0.03 + (this.profLvl('pathfinding') - 1) * 0.02;
        return vis * Math.min(0.9, 0.25 + track);
    },
    canSee(npc) { return this.dist(npc, state.player) <= this.spotRange(npc); },

    // A settlement's *location* stays fixed on the map, its *status* doesn't (#74). Smoke over
    // the walls is visible to a band from a distance, hence the ×1.5 sight range; counting the
    // garrison needs getting that close (or having visited before).
    LOC_SPOT: 1.5,
    locSpotRange() { return this.getVisibility() * this.LOC_SPOT; },
    locLive(loc) { return this.dist(loc, state.player) <= this.locSpotRange(); },

    // Every in-range settlement's status gets written to memory; the info card reads it as
    // "N days ago" once out of sight. Runs once an hour (25 settlements, negligible cost).
    scoutTick() { LOCATIONS.forEach(loc => { if(this.locLive(loc)) this.noteLoc(loc); }); },
    noteLoc(loc) {
        let lord = this.ownerLord(loc);
        loc.intel = { d: state.time.day, pr: Math.round(loc.prosperity || 50), g: this.garrisonOf(loc),
                      v: loc.volunteersAvailable, lord: lord && lord.id, fac: loc.faction };
    },

    getTerrainMultiplier(x, y) { return this.getTerrainInfo(x, y).mult; },

    // Terrain gives both the speed multiplier and the name shown in the info card — single source
    getTerrainInfo(x, y) {
        let mult = 1.0, name = 'Düzlük', icon = '🌾';
        for(let f of FORESTS) {
            let dx = x - f.x, dy = y - f.y;
            if(Math.sqrt(dx*dx + dy*dy) <= f.radius) {
                mult *= 0.8; // 20% slower in the forest
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
                // Crossing via a bridge doesn't slow you down — the river flows under the road
                if(this.onBridge(x, y)) { name = 'Köprü'; icon = '🌉'; }
                else { mult = 0.5; name = 'Nehir Geçidi'; icon = '🌊'; }
                break;
            }
        }
        if(state.roads) {
            for(let r of state.roads) {
                // The road is ~150 short segments: cheap bounding-box rejection first, then projection
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
                    mult *= kk.mult;  // stone road ×1.18, dirt ×1.10, goat path ×1.04
                    if(name === 'Düzlük') { name = kk.name; icon = kk.icon; }  // Bridge/Forest name is preserved
                    break;
                }
            }
        }
        return { mult, name, icon };
    },

    // The party's troop-type breakdown — used for both the map info card and the mounted ratio
    // A party member's battle/display stats come from one place: companions and spouse
    // aren't in TROOP_TYPES, so every caller used to make up its own defaults.
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
    // Battle Brothers' "ambition": a SINGLE active goal at a time, a reward on completion
    // and new goals unlock. It's all data; conditions read the state, they don't listen for events —
    // the daily tick and the Quests tab call the same `check`.
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
    // Open goals: the head of the chain before any goal is finished, then whatever completed ones unlock
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
    // Daily tick: if the selected goal's condition is met, give the reward and open the chain
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
            <span style="float:right;color:var(--text-muted);font-size:var(--fs-sm)">${T`${done} hedef tamamlandı`}</span>
            ${a ? `<div style="margin-top:0.5rem"><b>${T(a.title)}</b> — ${T(a.desc)}</div>
                   <button class="btn" style="margin-top:0.6rem;font-size:var(--fs-sm);padding:0.3rem 0.8rem"
                           onclick="Game.pickAmbition('');Quests.render()">${T`Vazgeç`}</button>`
                : open.length ? `<div style="color:var(--text-muted);margin:0.4rem 0">${T`Aynı anda tek hedef seçilir.`}</div>`
                   + open.map(o => `<button class="btn" style="display:block;width:100%;text-align:left;margin-top:0.4rem"
                        onclick="Game.pickAmbition('${o.id}')"><b>${T(o.title)}</b> — <span style="color:var(--text-muted)">${T(o.desc)}</span>
                        <span style="color:#e0b062">${T`+${o.renown} nam`}</span></button>`).join('')
                : `<div style="color:var(--text-muted);margin-top:0.4rem">${T`Bütün hedefleri kapattın.`}</div>`}
        </div>`;
    },

    // Wealth-scaled pressure (#53 item 1.3): the threat looks at your strength, not just the calendar.
    // The cheap version of Rimworld's "raid points = colony wealth" rule — the square root of
    // the army's total level. It doesn't crush a lone player, and it doesn't go easy on a 20-elite army.
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

    // In Warband, the party's mounted ratio is what mainly determines map speed
    getMountedRatio() {
        let total = state.player.party.length + 1;
        return (this.getPartyComposition().cavalry + (state.player.equipment.horse ? 1 : 0)) / total;
    },

    // The bag had no bottom: a single person could carry 500 wheat (#78). Capacity is
    // per-head — a mounted troop carries both itself and cargo, so it gets an extra share.
    CARGO_BASE: 20, CARGO_PER_MAN: 5, CARGO_PER_MOUNT: 4,
    cargoCap() {
        let mounted = this.getPartyComposition().cavalry + (state.player.equipment.horse ? 1 : 0);
        return this.CARGO_BASE + this.CARGO_PER_MAN * (state.player.party.length + 1) + this.CARGO_PER_MOUNT * mounted;
    },
    cargoLoad() { return state.player.inventory.reduce((n, i) => n + (i.qty || 0), 0); },
    // Loot and quest rewards can exceed the cap; the cost is speed. It drops to ×0.5 at
    // twice capacity — slowing you down instead of making you unable to walk.
    cargoMult() {
        let cap = this.cargoCap(), load = this.cargoLoad();
        return load <= cap ? 1 : Math.max(0.5, 1 - (load - cap) / cap * 0.5);
    },

    isNight() { let h = state.time.hour; return h < 6 || h >= 20; },

    // Time of day: name/icon only (the clock badge). The map tint is computed separately
    // and gradually — see dayTint()/nightGlow().
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

    // The map tint doesn't jump on the hour: it transitions linearly between key hours.
    // [hour, r, g, b, alpha]
    DAY_TINTS: [
        [0,   12, 20, 52, 0.46],
        [4,   12, 20, 52, 0.42],
        [6,   74, 44, 34, 0.30],   // warm tone as dawn breaks
        [9,    0,  0,  0, 0.00],   // morning brightness
        [16,   0,  0,  0, 0.00],   // no tint until afternoon
        [19, 112, 54, 22, 0.30],   // sunset
        [21,  30, 34, 70, 0.38],   // evening darkness
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
    // Hearth light in settlements doesn't switch on/off at a threshold either, it strengthens gradually in the evening
    nightGlow() {
        let h = ((state.time.hour % 24) + 24) % 24;
        if(h >= 21 || h < 5) return 1;
        if(h < 7)  return (7 - h) / 2;
        if(h > 19) return (h - 19) / 2;
        return 0;
    },

    getPlayerSpeed() {
        // A small party moves nimbly, a large army moves heavily (mounted ratio softens the penalty)
        let size = state.player.party.length + 1;
        let speedBonus = 0;
        if(size <= 1) speedBonus = 0.5;
        else if(size <= 10) speedBonus = 0.5 - ((size - 1) / 9) * 0.3;
        else if(size <= 20) speedBonus = 0.2 - ((size - 10) / 10) * 0.2;
        else speedBonus = -Math.min(0.45, (size - 20) * 0.01);

        // The mounted/foot difference comes from a single place (#72). Two multipliers used to
        // stack: a 105/66 base (=1.59×) plus an additional +0.35 from the mounted ratio — in a
        // fully mounted party the difference reached 2.1×, and in a large army (once the party
        // penalty shrank the denominator) it reached 2.6×. Now the base is shared and mounted
        // status is a *multiplier*: the total difference is capped at exactly 1.5× at every
        // party size. Going back to addition would let the cap slip again — since the party bonus sits in the denominator, the ratio wouldn't stay constant.
        let base = 66;
        let agiBonus = this.attr('agi') * 1.5;
        let mountBonus = this.getMountedRatio() * 0.5; // mounted ratio: on foot 1.0×, fully mounted 1.5×
        let nightMult = this.isNight() ? 0.85 : 1;      // travel is slower at night
        let terrain = this.getTerrainInfo(state.player.x, state.player.y);
        let pathMult = 1 + (this.profLvl('pathfinding') - 1) * 0.02;  // Pathfinding skill
        let cargoMult = this.cargoMult();                             // overload (#78)

        return {
            value: (base + agiBonus) * (1 + speedBonus) * (1 + mountBonus) * terrain.mult * nightMult * pathMult * cargoMult,
            base, agiBonus,
            partyMult: speedBonus,
            mountBonus,
            nightMult,
            pathMult,
            cargoMult,
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
            ${row(T('Temel'), spdData.base, true)}
            ${row(T('Çeviklik'), '+' + spdData.agiBonus.toFixed(1), true)}
            ${row(T('Grup büyüklüğü'), this.pct(spdData.partyMult*100, true), spdData.partyMult >= 0)}
            ${row(T('Atlı oranı'), this.pct(spdData.mountBonus*100, true), true)}
            ${row(T`Arazi (${T(spdData.terrain.name)})`, this.pct((spdData.terrainMult-1)*100, true), spdData.terrainMult >= 1)}
            ${spdData.nightMult < 1 ? row(T('Gece yürüyüşü'), this.pct(-15, true), false) : ''}
            ${spdData.pathMult > 1 ? row(T('Yol Bulma'), this.pct((spdData.pathMult-1)*100, true), true) : ''}
            ${spdData.cargoMult < 1 ? row(T`Aşırı yük (${this.cargoLoad()}/${this.cargoCap()})`, this.pct((spdData.cargoMult-1)*100, true), false) : ''}
            <hr style="border:0;border-top:1px solid rgba(212,175,55,.4);margin:5px 0">
            ${row('<b>' + T('Toplam') + '</b>', '<b>' + spdData.value.toFixed(1) + '</b>', true)}
        `);
    },

    getHumorousDialog(type, npc) {
        let p = state.player;
        let day = state.time.day;
        let lastDefeatDaysAgo = p.lastDefeatDay ? (day - p.lastDefeatDay) : 999;
        
        if(type === 'elder') {
            // The villager knows who they're facing: raider / enemy / guest (#50)
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
        state.meta.playtime = (state.meta.playtime || 0) + dt;   // playtime shown in the save info card
        
        // Mouse Edge Panning — gated by Game.edgePan(), can be turned off from ⚙️ Settings.
        let edgeMargin = 40;
        let panSpeed = 600 * dt / this.camera.zoom;
        let mx = Input.mouse.clientX;
        let my = Input.mouse.clientY;
        
        if (this.edgePan() && document.getElementById('map-view').classList.contains('active') && mx !== undefined) {
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

        // Smooth Zoom and Camera Follow.
        // A manual pan sticks to the MAP, not to the party. The camera target is
        // player + offset, so a constant offset dragged the view along as the player
        // walked: look at your destination and it slid away in your direction of travel
        // (#94). Cancelling the player's own step out of the offset holds the view still.
        // Space and 🎯 Beni Bul zero the offset and resume following, as before.
        if(this._camPx !== undefined && (this.camera.offsetX || this.camera.offsetY)) {
            this.camera.offsetX -= state.player.x - this._camPx;
            this.camera.offsetY -= state.player.y - this._camPy;
        }
        this._camPx = state.player.x; this._camPy = state.player.y;

        let targetCamX = state.player.x + this.camera.offsetX;
        let targetCamY = state.player.y + this.camera.offsetY;
        // With reduced motion on, there's no camera/zoom smoothing, it snaps instantly (#55 item 6)
        let snap = this.reduceMotion() ? 1 : 0;
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * (snap || 8 * dt);
        this.camera.x += (targetCamX - this.camera.x) * (snap || 5 * dt);
        this.camera.y += (targetCamY - this.camera.y) * (snap || 5 * dt);

        // WASD/arrows pan the camera FREELY — the keyboard counterpart to edge-of-screen mouse
        // panning (#44). It used to do the opposite, resetting the offset and locking the
        // camera to the player; the only way to look around the map by hand was to push
        // the mouse to the screen edge.
        // Returning to the player is already possible with Space and 🎯 Find Me.
        if(document.getElementById('map-view').classList.contains('active')) {
            let k = Input.keys;
            if(k['a']||k['arrowleft'])  this.camera.offsetX -= panSpeed;
            if(k['d']||k['arrowright']) this.camera.offsetX += panSpeed;
            if(k['w']||k['arrowup'])    this.camera.offsetY -= panSpeed;
            if(k['s']||k['arrowdown'])  this.camera.offsetY += panSpeed;
        }
        // Don't lose the continent entirely: the map is 9000 units, the offset is capped to match
        this.camera.offsetX = Math.max(-9000, Math.min(9000, this.camera.offsetX));
        this.camera.offsetY = Math.max(-9000, Math.min(9000, this.camera.offsetY));

        if(state.player.prisoner) {
            state.player.status = 'prisoner';
        }

        let isMapActive = document.getElementById('map-view').classList.contains('active');
        let isModalOpen = !document.getElementById('modal-overlay').classList.contains('hidden');
        let timeFlows = false;
        
        if (isMapActive && !isModalOpen) {
            // Time flows during a siege camp too: let prep days pass, let the world tick (#25)
            if (state.player.status === 'moving' || state.player.status === 'prisoner'
                || state.player.status === 'besieging' || state.player.status === 'raiding'
                || state.player.status === 'waiting') {
                timeFlows = true;
            }
        }

        if (timeFlows) {
            // Time flows at ×WAIT_SCALE while camped (#53/1.1)
            this.advanceTime(dt * this.timeScale() * (state.player.wait ? this.WAIT_SCALE : 1));
            this.waitTick();
            this.updateNPCs(dt);
            if(state.encounterCooldown > 0) state.encounterCooldown -= dt;
        }

        // Raiding is an ongoing action: progress, an intervening lord, completion (#49)
        if(state.player.status === 'raiding') { this.raidTick(timeFlows ? dt : 0); return; }

        if(state.player.status === 'prisoner') {
            let captor = state.npcParties.find(n => n.id === state.player.prisoner.npcId);
            if(captor) {
                state.player.x = captor.x; state.player.y = captor.y;
            }
            
            // Dynamic escape-plan progress
            if(state.player.prisoner.isPlanning) {
                let currentChance = state.player.prisoner.escapeChance || 0;
                
                if (currentChance < 80) {
                    // At the start (0), acceleration = 5.0
                    // As it approaches 80, acceleration = 0.1
                    let planSpeed = 0.1 + ((80 - currentChance) / 80) * 4.9;
                    
                    state.player.prisoner.escapeChance = Math.min(80, currentChance + planSpeed * dt);
                }
                
                let el = document.getElementById('ui-escape-chance');
                if(el) el.innerText = this.pct(state.player.prisoner.escapeChance);
            }
            
            return; // Do nothing else while a prisoner
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
                this.clampToMap(state.player); // prevent going past the natural borders
                this.trainAttr('agi', (dist * r) / 1500);   // agility improves on the road
                this.roadTick(dist * r);                    // road-event roll (#67)

                // Update the UI so speed can change instantly based on terrain
                if(Math.random() < 0.1) { // to avoid updating the DOM constantly at 60 FPS
                    this.updateSpeedUI(spdData);
                }
            }
        }

        if(timeFlows) this.checkAmbush(dt);

        // NPC -> player collision
        if(timeFlows && state.encounterCooldown <= 0) {
            for(let npc of state.npcParties) {
                // Bumping into a friendly noble is an encounter too — not a battle, a chat
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

    // Ambush in the forest: a band/pack hidden among the trees jumps you as you approach.
    // The chance to notice depends on Spotting + Pathfinding; if you notice, it's a normal
    // encounter, if you don't, the battle starts with you surrounded.
    //
    // Ambush range depends on SIGHT: a fixed 240 units was wider than a starting character's
    // sight in the forest (125) — meaning the band that jumped you was, by definition,
    // never drawn on screen. Clamping it with `spotRange` closes the "something I never
    // saw jumped me" class of bug; the roll still happens, the ambush still hurts, but there's a moment in between: you saw it.
    // 240 stays as a ceiling so ambushes don't get more frequent as skill grows.
    AMBUSH_RANGE: 240,
    checkAmbush(dt) {
        if(state.player.prisoner || state.encounterCooldown > 0) return;
        if(this.getTerrainInfo(state.player.x, state.player.y).name !== 'Orman') return;
        this._ambushCd = (this._ambushCd || 0) - dt;
        if(this._ambushCd > 0) return;
        this._ambushCd = 1;   // saniyede bir zar atmak yeter

        // Six wolves don't jump a large army: a band setting an ambush also does the math.
        // (The `backOff` branch in the encounter only runs when `!ambush`, so it must be excluded here.)
        let mine = state.player.party.filter(t => !t.wounded).length + 1;
        let lurker = state.npcParties.find(n => n.type === 'bandit'
            && this.dist(n, state.player) < Math.min(this.AMBUSH_RANGE, this.spotRange(n))
            && mine < n.size * 1.5
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

    // ---- CAMP: WAIT (#53 item 1.1) ----
    // A single primitive: the player stops, time flows at ×4, the world keeps ticking, and
    // any encounter (triggerEncounter) cuts the wait short. Resting, volunteer refresh,
    // waiting for a tournament/feast, waiting for a caravan — all of it is a customer of this.
    WAIT_SCALE: 4,
    // Waiting has a cost: wages, food, spoilage already tick hourly
    WAIT_CHOICES: [[1, '1 saat'], [8, '8 saat'], [24, '1 gün'], [72, '3 gün']],   // raw; translated at display
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
    // The single gate that ends waiting — both time running out and an encounter go through here
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
             <div style="color:var(--text-muted);font-size:var(--fs-sm)">
                ${T`❤️ ${Math.round(p.stats.hp)}/${Math.round(p.stats.maxHp)} · 🎺 ${Math.round(this.morale())} · zaman ×${this.WAIT_SCALE}`}</div>`);
    },

    // You can't surrender to an animal pack — if you're fast enough you slip away
    // The escape chance depends on the speed difference: a mounted party can outrun bandits,
    // a heavy army can't outrun Kergit horsemen (#30). Map speed already accounts for mounted
    // ratio, terrain, and night — we use it directly.
    // Escape in an ambush isn't disabled, it's expensive: the chance to slip away while surrounded is halved.
    // The multiplier lives here so the percentage shown on screen matches the percentage the roll uses.
    AMBUSH_FLEE: 0.5,
    fleeChance(npc) {
        // Ratio, not difference: taking the speed difference linearly (0.45 + diff/90), even
        // a large army escaped Kergit horsemen at 89%. As a ratio, equal speed gives 24%, 1.5x speed gives 84%.
        let his = (npc && npc.speed) || 60;
        let base = Math.max(0.1, Math.min(0.9, (this.getPlayerSpeed().value / his - 0.8) * 1.2));
        return state.ambush ? base * this.AMBUSH_FLEE : base;
    },
    fleeEncounter(npcId) {
        let npc = state.npcParties.find(n => n.id === npcId);
        this.closeModal();
        let chance = this.fleeChance(npc);
        if(Math.random() < chance) {
            state.encounterCooldown = 6;
            state.ambush = false;   // you slipped away: being surrounded doesn't carry over to the next battle
            state.player.status = 'idle'; state.player.targetLocation = null;
            alert(T`Geride bıraktın — atlarını sürüp uzaklaştın. (Kaçış şansı %${Math.round(chance*100)})`);
        } else {
            alert(T`Kaçamadın, yolunu kestiler! (Kaçış şansı %${Math.round(chance*100)})`);
            Battle.start(npc ? npc.name : 'Kurt Sürüsü', npc ? npc.size : 6, null, (npc && npc.faction) || '');
        }
    },
    // "Send your troops": let the engine itself resolve the battle without opening the arena (#30)
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
            if(dist < 120) return true; // Get right up on them and they won't forgive it!
            if(ps > npc.size * 1.5) return false; // If we're much stronger, let them flee from us (they won't be aggressive)
            if(state.time.day <= 14) {
                let hash = parseInt(npc.id.replace('npc_',''), 36) % 100 || 50;
                let aggroThreshold = (state.time.day / 14) * 100;
                if (hash > aggroThreshold) return false;
            }
            return true;
        }
        // Nobles are now people you talk to; a fight only happens if we're at war.
        if(npc.lordId) {
            if(this.hasGrudge(npc.lordId)) return true;     // blood feud: a battle, not a chat (#53)
            if(Nobles.rel(npc.lordId) <= -50) return true;
            // It's no longer "a different banner" — your kingdom being at war with theirs is what triggers aggression
            return this.atWar(this.playerFaction(), npc.faction);
        }
        if(npc.type === 'king' || npc.type === 'vizier' || npc.type === 'lord') {
            if(state.player.stats.level < npc.level - 5 && ps < npc.size / 2) return false; // not aggressive toward the weak
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
            // While captive, NPCs don't lock onto the player as a target (so the captor roams freely)
            let hostile = this.isHostile(npc) && state.player.status !== 'prisoner';

            // A weak band spots a strong army from afar and flees; a pursuer notices up close
            let sense = npc.size > ps ? 360 : 360 + Math.min(640, (ps / Math.max(1, npc.size)) * 240);
            // Fleeing is now independent of hostility: if a band is too weak to attack you
            // anyway (isHostile false) it used to never flee, and kept wandering instead.
            // A caravan/convoy flees an army from a kingdom it's at war with (otherwise carries on)
            let notices = dp < sense && (hostile || npc.type === 'bandit'
                          || (npc.trade && this.atWar(this.playerFaction(), npc.faction)));
            // A noble doesn't flee: an enemy lord will still walk toward an army a little bigger
            // than theirs, but pulls back if you're clearly stronger (×1.5) (#48).
            let might = npc.size * (npc.lordId ? 1.5 : 1);
            // A quest wave was summoned to fight *you*, and it is deliberately smaller than
            // your army — so the generic "a weak band runs" rule below sent it fleeing from
            // the very fight the quest promises, and Hasat Nöbeti became a chase (#94).
            if(npc.questWave) {
                npc.targetX = state.player.x; npc.targetY = state.player.y;
            } else if(notices && (might > ps ? hostile : true)) {
                if(might > ps) {
                    npc.targetX = state.player.x; npc.targetY = state.player.y;
                } else {
                    npc.targetX = npc.x - dxP * 2; npc.targetY = npc.y - dyP * 2;
                }
            } else {
                let dtx = npc.targetX - npc.x, dty = npc.targetY - npc.y;
                if(Math.sqrt(dtx*dtx + dty*dty) < 15) {
                    if(npc.trade) return this.traderArrive(npc);   // the convoy arrived at its stop
                    let a = Math.random() * Math.PI * 2;
                    // Nobles wander around their own settlements; this is required so you can
                    // find others in their halls.
                    let lord = npc.lordId ? Nobles.lord(npc.lordId) : null;
                    let home = lord ? LOCATIONS.find(x => x.id === lord.homeLocId) : null;
                    if(state.feast && lord && lord.faction === state.feast.faction) {
                        home = LOCATIONS.find(x => x.id === state.feast.locId) || home;
                    }
                    // A lord with a blood feud walks toward you, not home (#53/1.3)
                    if(lord && !this.hasGrudge(lord.id)) delete npc.hunting;   // gives up the chase once the feud ends
                    if(lord && this.hasGrudge(lord.id) && state.player.status !== 'prisoner' && Math.random() < 0.5) {
                        npc.targetX = state.player.x; npc.targetY = state.player.y;
                        npc.hunting = 'player';
                        return;
                    }
                    // A lord at war doesn't sit at home: he walks toward one of the nearby
                    // enemy settlements (warTick resolves the clash/siege there).
                    if(lord && this.warsOf(npc.faction).length) {
                        // If there's a campaign, the army doesn't disperse, it marches to the marshal's target
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

            // A bandit hunts caravans (#38): heads for the nearest convoy in range; banditTick
            // resolves the raid itself. A band that isn't strong enough doesn't give chase.
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
                    npc.hunting = prey.id;   // the id is stored, the name is translated at display time
                }
            }

            // Wolves burst out from among the trees: a pack in the forest senses you and
            // charges. The charge range depends on sight — it used to be a fixed 700, meaning
            // the pack closed in at ×2 speed while you could only see it from 125 units away,
            // so the whole approach was invisible. Now a pack only charges from a distance you
            // can actually *see*; you get to make the call. A charging pack is marked on the map with a red ring (npc.charging).
            let burst = 1;
            npc.charging = false;
            if((BAND_KINDS[npc.band] || {}).beast && dp < this.spotRange(npc) && state.player.status !== 'prisoner'
               && this.getTerrainInfo(npc.x, npc.y).name === 'Orman') {
                npc.targetX = state.player.x; npc.targetY = state.player.y;
                burst = 1.6;
                npc.charging = true;
            }

            let dx = npc.targetX - npc.x, dy = npc.targetY - npc.y;
            let d = Math.sqrt(dx*dx+dy*dy);
            if(d > 3) {
                let spd = npc.speed * this.getTerrainMultiplier(npc.x, npc.y) * burst;
                let r = Math.min(spd * dt / d, 1);
                npc.x += dx*r; npc.y += dy*r;
            }
            this.clampToMap(npc); // prevent NPCs from crossing mountains
        });
    },

    // `ambush`: 'ambush' | 'spotted' | 'raid' — 'raid' is the lord raiding you, no chat
    // --- PRE-BATTLE TROOP CHATTER (#35) ---
    // In the encounter modal, someone from your party says a line or two. Which pool they
    // speak from looks at the strength ratio, morale, hunger, and wage debt; the Leadership
    // skill raises the fear threshold (a good commander's men panic later).
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

    // The reward cut used to be visible only in a single line after the battle; know it before deciding.
    // The calculation is Battle.rewardScale itself — enemy strength is estimated from the npc (#55 item 9).
    preyWarning(npc) {
        if(!npc || npc.trade) return '';
        let sc = Battle.rewardScale(npc.size * ((npc.level || 1) + 1));
        return sc < 0.95 ? `${T`🪶 Kolay av: bu savaştan alacağın ganimet ve tecrübe <b>%${Math.round(sc * 100)}</b>'e iner.`}` : '';
    },

    triggerEncounter(npc, ambush) {
        // The camp breaks: you can't keep sleeping while someone's closing in on you (#53/1.1)
        if(state.player.wait) this.stopWait();
        state.encounterCooldown = 2;
        state.ambush = false;   // every encounter resets the flag; reopens the ambush branch
        state.player.currentEncounterNpcId = npc.id;

        // Caravan/village convoy: no battle is forced, robbing them is your choice
        if(npc.trade) {
            let live = state.npcParties.find(n => n.id === npc.id);
            if(live) return this.meetTrader(live);
        }

        // Running into a noble who isn't an enemy is a chance to talk, not a battle.
        // But there's no chat if you caught them burning their village (#49).
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
            // You didn't notice: the battle starts with you surrounded (Battle.start reads this)
            state.ambush = true;
            html += `<p style="color:#e0463a;margin-top:0.5rem">${T`Ağaçların arasından üstünüze
                     atladılar — çember daraldı, adamların dağılmış durumda!`}</p>`;
        } else if(ambush === 'spotted') {
            html += `<p style="color:#2ecc71;margin-top:0.5rem">${T`Kırılan dalı duydun: pusuyu
                     zamanında fark ettin, seni saramadılar.`}</p>`;
        }

        // A band can decide it's "not worth it" and back off. An animal pack doesn't know renown
        // or reputation, it knows numbers: it jumps a small party, but weighs a large army from a distance and backs off (#79).
        let bk = BAND_KINDS[npc.band] || {};
        let strong = state.player.party.filter(t => !t.wounded).length + 1 >= npc.size * 1.5;
        let backOff = !ambush && npc.type === 'bandit' && (bk.beast
            ? strong && Math.random() < 0.5
            : state.time.day <= 14 && Math.random() < 0.25);
        if(backOff) {
            dialog = bk.beast
                ? T`(Alfa dişlerini gösterip homurdanır, sürü ağaçların arasına doğru geri geri çekilir.)`
                : T`"Şu çaylağa bak patron, kılıcımızı kirletmeye değmez. Yürü git buradan çömez!"`;
            html += `<p><i>${dialog}</i></p>
            <p style="color:#2d2;font-size:var(--fs-sm);margin-top:0.5rem">${bk.beast
                ? T`${this.npcName(npc)} sayınızı tartıyor, üstünüze gelmiyor.`
                : T`${this.npcName(npc)} seninle savaşmaya değmeyeceğini düşünüyor.`}</p>
            <div style="display:flex;gap:1rem;margin-top:1rem;">
            <button class="btn primary" onclick="Game.closeModal(); state.encounterCooldown = 5;">${T`Uzaklaş`}</button>
            <button class="btn" style="border-color:#cc0000;color:#cc0000" onclick="Game.closeModal(); Battle.start('${npc.name.replace(/'/g,"\\'")}', ${npc.size}, null, '${npc.faction || ''}')">${T`⚔️ Yine De Savaş!`}</button>
            </div>`;
        } else {
            // No fleeing during a raid ambush — you got caught red-handed. In an ambush,
            // fleeing isn't disabled, it's open at half the chance (fleeChance reads
            // state.ambush): being surrounded is a cost, not a locked room.
            let canFlee = ambush !== 'raid';
            let flee = Math.round(this.fleeChance(npc) * 100);
            // If your army is 1.5x the enemy's, you don't have to step into the arena for every bandit
            let mine = state.player.party.filter(t => !t.wounded).length + 1;
            let canAuto = !ambush && mine >= npc.size * 1.5;
            let chat = this.troopChatter(npc);   // your men have something to say too (#35)
            let prey = this.preyWarning(npc);    // warn before the battle if the reward will be cut (#55)
            html += `<p><i>${dialog}</i></p>
            ${chat ? `<p style="margin-top:0.4rem;font-size:var(--fs-md)">${chat}</p>` : ''}
            ${prey ? `<p style="margin-top:0.4rem;font-size:var(--fs-sm);color:#cc8800">${prey}</p>` : ''}
            <p style="color:var(--text-muted);font-size:var(--fs-sm);margin-top:0.5rem">${!canFlee
                ? T('Kaçış yok — savaş ya da teslim ol!')
                : ambush === 'ambush'
                ? `${T`Sarıldın: kaçmak yarı şansla mümkün, kaçış şansın`} <b>%${flee}</b>.`
                : `${T`Kaçabilirsin ama hız farkı belirler: kaçış şansın`} <b>%${flee}</b>.`}</p>
            <div style="display:flex;gap:0.6rem;margin-top:1rem;flex-wrap:wrap;justify-content:center">
            <button class="btn primary" onclick="Game.closeModal(); Battle.start('${npc.name.replace(/'/g,"\\'")}', ${npc.size}, null, '${npc.faction || ''}')">${T`⚔️ Savaş!`}</button>
            ${canAuto ? `<button class="btn" style="border-color:#8fd6ff;color:#8fd6ff" onclick="Game.autoBattle('${npc.id}')" title="Sen inmezsin, adamların halleder — kayıp daha yüksektir">${T`🎖️ Askerlerini Gönder`}</button>` : ''}
            ${canFlee ? `<button class="btn" style="border-color:#cc8800;color:#cc8800" onclick="Game.fleeEncounter('${npc.id}')">${T`🏃 Kaçmayı Dene (%${flee})`}</button>` : ''}
            ${bk.beast ? '' :
                `<button class="btn" style="border-color:#cc8800;color:#cc8800" onclick="Game.closeModal(); Game.surrender('${npc.id}', '${npc.name.replace(/'/g,"\\'")}')">${T`🏳️ Teslim Ol`}</button>`}
            </div>`;
        }
        this.showModal(html);
    },

    surrender(npcId, npcName) {
        state.player.lastDefeatDay = state.time.day;
        // Surrendering is a defeat too: the weaker your opponent, the more renown you burn
        let foe = state.npcParties.find(n => n.id === npcId);
        let renownLost = this.defeatRenown(foe ? foe.size * ((foe.level || 1) + 1) : 0);
        state.player.renown = Math.max(0, state.player.renown - renownLost);
        let daysLost = 3 + Math.floor(Math.random() * 5); // 3-7 days captive
        let ratio = this.defeatLootRatio();   // cuts a share from the coffers (#53/1.2)
        let moneyLost = Math.floor(state.player.money * ratio);
        state.player.money = Math.max(0, state.player.money - moneyLost);

        // All troops are lost, prisoners go free
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

    // --- CAPTIVITY (single data model) ---
    // However you end up captured, it goes through here: the captor party (the one side that
    // moves on the map), the other prisoners alongside you, and the escape state all live here.
    // No other place holds captivity state until release.
    beginCaptivity(npc, days) {
        let band = npc ? BAND_KINDS[npc.band] : null;
        state.player.prisoner = {
            npcId: npc ? npc.id : null,
            npcName: npc ? npc.name : 'Bilinmeyen',
            troops: npc ? npc.size : 0,          // the captor's own troops
            fellows: this.rollFellows(band),     // those dragged along with you
            daysLeft: days,
            ransomRequired: 0.75 + Math.random()*0.15, ransomRefusals: 0,
            escapeChance: 0, isPlanning: false, lastAttemptDay: 0
        };
        state.player.status = 'prisoner';
        state.player.targetLocation = null;   // a captive has nowhere to go
        this.renderPrisonerUI();
    },
    // An animal pack doesn't take prisoners; a band might be dragging along a few other unlucky souls
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
            // If they don't have enough money, everything they have is taken and they're released
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
            // After the third refusal, there's no point keeping you
            state.player.money = Math.floor(state.player.money * 0.5);
            this.releaseFromCaptivity(T('"Bu adamı beslemek fidyesinden pahalıya geliyor." Yarı paranı alıp seni kovdular.'));
            return;
        }

        // Penalty: a few more days + the escape plan resets
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

    // A day used to pass in ~12s; the default was halved, the player can change it from the badge
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
        // Wage debt ticks hour by hour: a growing pressure instead of a one-time fixed
        // penalty. We count whole-hour boundaries since dt arrives fractional.
        let passed = Math.floor(state.time.day * 24 + state.time.hour) - Math.floor(before);
        for(let i = 0; i < passed; i++) { this.wageDebtTick(); this.regenTick(); this.scoutTick(); }
        while(state.time.hour >= 24) {
            state.time.day++;

        this.ambitionTick();   // did the ambition condition get met (#53/1.4)
        // Honor decays to zero over time but not quickly (#49/#53): one raid takes ~24 days
        if(state.player.honor) state.player.honor += state.player.honor > 0 ? -0.5 : 0.5;
        // Expired blood feuds are removed
        Object.keys(state.grudges).forEach(id => { if(!this.hasGrudge(id)) delete state.grudges[id]; });

        // Prosperity recovers over time (a raided village shouldn't stay poor forever)
        LOCATIONS.forEach(loc => {
            // A burned village recovers faster; an already-wealthy settlement grows slowly
            if(loc.prosperity !== undefined && loc.prosperity < 90) loc.prosperity += loc.prosperity < 50 ? 0.4 : 0.15;
        });
        this.stockTick();   // stock returns to baseline, and price with it (#24/#46)

        // Volunteer refresh (every 2 days for cities and villages)
        LOCATIONS.forEach(loc => {
            if(loc.type === 'village' || loc.type === 'city') {
                // After a partial recruitment (e.g. 2 left out of 5), a village should still be
                // able to refresh; it used to only refresh once fully emptied.
                let full = loc.type === 'city' ? 7 : 5;
                // A raided village has no volunteers to gather for a week
                if(state.time.day - (loc.raidedDay || -99) < 7) return;
                if(loc.volunteersAvailable < full && (state.time.day - (loc.lastRecruitDay || 0) >= 2)) {
                    let fresh = 1 + Math.floor(Math.random()*4) + (loc.type === 'city' ? 3 : 0)
                             + Math.floor((loc.prosperity || 50) / 40);   // a wealthy settlement feeds more volunteers
                    loc.volunteersAvailable = Math.max(loc.volunteersAvailable, fresh);
                }
            }
        });

        state.time.hour -= 24;
            this.dailyUpdate();
        }
        this.updateTopBar();
    },

    // --- DAILY EVENT POOL (#35) ---
    // Not every day has an event: EVENT_CHANCE rolls the dice (measured ~once every 3 days).
    // About 60% of the pool is bad, 40% good, but none of them cost enough to end a campaign.
    // Every event has a `when` filter (party, food, nearby settlement, morale) and the last
    // 5 events aren't reselected — the same joke isn't funny two days running.
    EVENT_CHANCE: 0.35,
    DAY_EVENTS: [
        // --- bad ---
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
            let lost = Math.min(250, Math.round(state.player.money * (0.02 + Math.random() * 0.03)));   // cap: even a rich player should just get annoyed
            state.player.money -= lost;
            return `${T`Sabah kese hafiflemişti. Kimse bir şey görmemiş, herkes birbirine bakıyor.<br><b>−${lost} dinar`}</b>.`;
        }},
        { id: 'sprain', bad: 1, when: c => c.party >= 2 && state.player.party.some(t => !t.wounded), run(c) {
            let t = Game.woundRandom(2);
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
        // --- good ---
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
            let t = Game.addRecruit(c.near);
            return `${T`Yolda başıboş dolaşan bir <b>${T(t.name)}</b> gruba katıldı. Eski komutanını sormamak en iyisi.`}`;
        }},
        { id: 'blessing', bad: 0, when: c => c.near && c.near.type === 'village', run(c) {
            Game.addItem('cheese', 2);
            Game.addMorale(2);
            return `${T`${T(c.near.name)} köyünden bir kadın "yoldan geçene uğur olsun" deyip iki peynir bıraktı.<br><b>+2 peynir</b>, moral`} <b>+2</b>.`;
        }}
    ],

    // Event helpers: all one-liners, kept here so they don't need to be written out separately
    addMorale(n) { state.player.morale = Math.max(0, Math.min(100, this.morale() + n)); },
    spend(n) { state.player.money = Math.max(0, state.player.money - n); },
    woundRandom(days) {
        let ok = state.player.party.filter(t => !t.wounded);
        if(!ok.length) return null;
        let t = ok[Math.floor(Math.random() * ok.length)];
        t.wounded = days;
        return t;
    },
    // Returns `null` if capacity is full — the caller says "wanted to join but there was no room"
    addRecruit(loc) {
        if(state.player.party.length + 1 >= this.getPartyCapacity()) return null;
        let t = { id: 'troop_' + Math.random().toString(36).substr(2, 9),
                  name: this.recruitName(loc || LOCATIONS[0]), level: 1, xp: 0, xpNext: 3, type: 'infantry' };
        state.player.party.push(t);
        return t;
    },
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

    // The world's current state is read from a single place; both the day and road event's
    // `when` filter see this. `near` is only a settlement within 900 units (naming a distant
    // village would feel odd), `land` is whose territory you're on — the nearest settlement's
    // faction, regardless of distance.
    eventCtx() {
        let p = state.player;
        let byDist = LOCATIONS.slice().sort((a, b) => this.dist(a, p) - this.dist(b, p));
        let ter = this.getTerrainInfo(p.x, p.y);
        let roadNames = Object.keys(this.ROAD_KINDS).map(k => this.ROAD_KINDS[k].name);
        return {
            party: p.party.length, cap: this.getPartyCapacity(),
            near: byDist[0] && this.dist(byDist[0], p) < 900 ? byDist[0] : null,
            land: byDist[0] && byDist[0].faction,
            food: this.foodStock().total, morale: this.morale(), money: p.money,
            honor: this.honor(), night: this.isNight(), day: state.time.day,
            terrain: ter.name, onRoad: roadNames.includes(ter.name)
        };
    },

    // One selector, two pools: the `when` filter + the recent-events window. The window is
    // **shared** across both pools (`state.recentEvents`) — identity is determined by id, not pool.
    pickEvent(pool, ctx, extra) {
        let recent = state.recentEvents || (state.recentEvents = []);
        let avail = pool.filter(e => e.when(ctx) && (!extra || extra(e)));
        if(!avail.length) return null;
        let fresh = avail.filter(e => !recent.includes(e.id));
        let side = fresh.length ? fresh : avail;
        let ev = side[Math.floor(Math.random() * side.length)];
        recent.push(ev.id);
        if(recent.length > 6) recent.shift();
        return ev;
    },

    dailyEvent() {
        if(state.player.prisoner || state.player.status === 'besieging') return null;
        if(Math.random() > this.EVENT_CHANCE) return null;
        let ctx = this.eventCtx();
        // The dice roll twice: first the tone (60% bad), then an event from that tone. The
        // repeat filter runs **inside the tone** — applying it first meant the good pool kept
        // getting stuck on "recent events" and emptying out, pushing the bad ratio up to 71%.
        let bad = Math.random() < 0.6 ? 1 : 0;
        let ev = this.pickEvent(this.DAY_EVENTS, ctx, e => e.bad === bad)
              || this.pickEvent(this.DAY_EVENTS, ctx);
        if(!ev) return null;
        let text = ev.run(ctx);
        this.updateTopBar();
        alert(`${ev.bad ? '🌧️' : '🌤️'} <b>${T`Günün Olayı`}</b><br><br>${text}`);
        return ev.id;
    },

    // --- ROAD EVENTS (#67) ---
    // A day event happens in camp and resolves on its own; **a road event happens while
    // walking and asks you for a decision**. Every choice has a real cost — money,
    // honor, troops, or time; the cost-free choice is the "OK" button, and that's
    // the day event's job.
    //
    // `text` and `label` are **functions**, not raw strings: the table is set up before
    // `I18N.load()` runs, and writing `T('…')` at the top level would freeze the translation
    // there (CLAUDE.md, "Raw stays, translate at display"). Every string in a function body is
    // still a literal the static extractor sees — so the "every T key exists in both
    // dictionaries" test covers this pool too, no separate gate needed.
    //
    // The roll depends on distance, not the day: one ROAD_CHANCE roll per ROAD_EVERY units,
    // so the expected interval is 4800 units. A party of six covers ~111 units/hour.
    // Measured (seeds 1-5, 30 days *uninterrupted* on the road): 13-20 events, average 16.
    // In a real game you don't spend the whole day on the road, so you'll see about half that.
    ROAD_EVERY: 1200,
    ROAD_CHANCE: 0.25,
    ROAD_EVENTS: [
        { id: 'beggar', icon: '🥖', when: c => c.money >= 30,
          text: () => T`Yol kenarında oturan yaşlı bir adam elini uzattı. "Üç gündür bir şey yemedim," diyor.`,
          choices: [
            { label: () => T`🪙 Sadaka ver (−20 dinar)`, run() {
                Game.spend(20); Game.addMorale(2);
                return T`Adamın duası arkandan geldi; adamların da bunu gördü.<br><b>−20 dinar</b>, moral <b>+2</b>, şeref <b>+${Game.addHonor('roadKind')}</b>.`;
            }},
            { label: () => T`🚶 Yoluna devam et`, run() {
                return T`Atını sürdün. Arkandan gelen sesi duymamış gibi yaptın.`;
            }}
          ]},

        { id: 'sick_carter', icon: '🤒', when: c => c.party >= 1,
          text: () => T`Devrilmiş bir arabanın yanında bir kervancı ateşler içinde yatıyor. Yoldaşları çoktan gitmiş.`,
          choices: [
            { label: () => T`⚕️ Cerrahını başına yolla (3 saat)`, run() {
                Game.advanceTime(3); Game.addProficiencyXp('surgery', 60);
                state.player.renown += 2;
                return T`Adam akşama doğru gözlerini açtı. Bu hikâye yolun ilerisinde senden önce varacak.<br><b>Cerrahlık +60 tecrübe</b>, itibar <b>+2</b>, şeref <b>+${Game.addHonor('roadKind')}</b>.<br><i>3 saat kaybettin.</i>`;
            }},
            { label: c => T`🍞 Erzak bırak, yoluna bak (−3 yiyecek)`, run() {
                let n = Game.takeFood(3);
                return T`Başucuna ${n} birim yiyecek bıraktın. Kalanı kendi şansına.<br><b>−${n} yiyecek</b>.`;
            }},
            { label: () => T`🚶 Bu senin işin değil`, run() {
                Game.addMorale(-2);
                return T`Adamların arkalarına baka baka geçti. Kimse bir şey söylemedi.<br>Moral <b>−2</b>, şeref <b>−${-Game.addHonor('roadCruel')}</b>.`;
            }}
          ]},

        { id: 'runaway', icon: '👦', when: c => c.near && c.near.type === 'village' && c.party + 1 < c.cap,
          text: c => T`${T(c.near.name)} köyünden kaçtığını söyleyen bir delikanlı yolunu kesti. "Beni de al," diyor, "tarlaya dönmem."`,
          choices: [
            { label: () => T`⚔️ Yanına al`, run(c) {
                let t = Game.addRecruit(c.near);
                return T`<b>${T(t.name)}</b> gruba katıldı. Köyün ağası bunu duyunca hoşnut olmayacak.<br>Şeref <b>−${-Game.addHonor('roadCruel')}</b>.`;
            }},
            { label: () => T`🏡 Köyüne geri yolla`, run(c) {
                if(c.near.prosperity !== undefined) c.near.prosperity = Math.min(100, c.near.prosperity + 3);
                return T`Ensesinden tuttuğun gibi köyün yolunu gösterdin. Ağası duydu, borcunu bilecek.<br>${T(c.near.name)} refahı <b>+3</b>, şeref <b>+${Game.addHonor('roadKind')}</b>.`;
            }}
          ]},

        { id: 'mill', icon: '🏚️', when: c => c.near && c.near.type === 'village' && c.money >= 200,
          text: c => T`${T(c.near.name)} değirmeni yıkılmış; çarkı derede çamura saplanmış duruyor. Köylüler taş taşıyor ama usta parası yok.`,
          choices: [
            { label: () => T`🔨 Ustanın parasını ver (−150 dinar)`, run(c) {
                Game.spend(150);
                if(c.near.prosperity !== undefined) c.near.prosperity = Math.min(100, c.near.prosperity + 10);
                state.player.renown += 2;
                return T`Çark iki haftaya döner. Köy bunu unutmaz.<br><b>−150 dinar</b>, ${T(c.near.name)} refahı <b>+10</b>, itibar <b>+2</b>, şeref <b>+${Game.addHonor('roadKind')}</b>.`;
            }},
            { label: () => T`🪨 Kesme taşlarını yükle, sat`, run(c) {
                let n = 90 + Math.floor(Math.random() * 70);
                state.player.money += n;
                if(c.near.prosperity !== undefined) c.near.prosperity = Math.max(0, c.near.prosperity - 6);
                return T`Köylüler bir şey diyemedi; senin adamların silahlıydı.<br><b>+${n} dinar</b>, ${T(c.near.name)} refahı <b>−6</b>, şeref <b>−${-Game.addHonor('roadCruel')}</b>.`;
            }},
            { label: () => T`🚶 Yoluna devam et`, run() {
                return T`Yıkık değirmen arkanda kaldı. Yarın da yıkık olacak.`;
            }}
          ]},

        { id: 'chained', icon: '⛓️', when: c => c.party + 1 < c.cap,
          text: () => T`Yol kenarındaki kazığa bağlı, ayağı zincirli bir adam. "Efendim beni burada unuttu," diyor. Gözlerinden bunun tam doğru olmadığı okunuyor.`,
          choices: [
            { label: () => T`🔓 Zincirini kır, yanına al`, run(c) {
                let t = Game.addRecruit(c.near);
                return T`<b>${T(t.name)}</b> gruba katıldı ve bir daha arkasına bakmadı.<br>Şeref <b>−${-Game.addHonor('roadCruel')}</b>.`;
            }},
            { label: () => T`🪙 Fidyesini öde, azat et (−80 dinar)`, run() {
                Game.spend(80); Game.addMorale(3);
                return T`Parayı kazığın dibine bıraktın, zinciri çözdün. Adam koşarak gitti.<br><b>−80 dinar</b>, moral <b>+3</b>, şeref <b>+${Game.addHonor('roadKind')}</b>.`;
            }},
            { label: () => T`🚶 Bu işe karışma`, run() {
                return T`Zincirin sahibi kim bilinmez, ama kesin biri var. Yoluna devam ettin.`;
            }}
          ]},

        { id: 'storm', icon: '⛈️', when: c => c.party >= 1,
          text: () => T`Ufuktan gelen kara bulut yolu bir anda kapattı. Dolu taneleri miğferlerde çınlıyor.`,
          choices: [
            { label: () => T`⛺ Sığınak ara, bekle (4 saat)`, run() {
                Game.advanceTime(4); Game.addProficiencyXp('pathfinding', 30);
                return T`Kaya dibinde kuru bir oyuk buldun. Fırtına geçene kadar kimse ıslanmadı.<br><b>Yol Bulma +30 tecrübe</b>.<br><i>4 saat kaybettin.</i>`;
            }},
            { label: () => T`🌧️ Doluda yürümeye devam et`, run() {
                Game.addMorale(-5);
                let t = Math.random() < 0.5 ? Game.woundRandom(2) : null;
                return t ? T`Islak taşta kayan <b>${Game.troopLabel(t)}</b> bileğini kırdı.<br>Moral <b>−5</b>, iki gün savaşa giremez.`
                         : T`Herkes sırılsıklam oldu ama yol bitti.<br>Moral <b>−5</b>.`;
            }}
          ]},

        { id: 'treat', icon: '🧀', when: c => c.near && c.near.type === 'village' && c.honor >= 10,
          text: c => T`${T(c.near.name)} köylüleri yol kenarına çıkmış seni bekliyor. Ellerinde bir sepet peynir, bir testi ayran var.`,
          choices: [
            { label: () => T`🙏 Kabul et`, run() {
                Game.addItem('cheese', 3); Game.addMorale(4);
                return T`Adamlar gölgede karnını doyurdu.<br><b>+3 peynir</b>, moral <b>+4</b>.`;
            }},
            { label: () => T`🪙 Kabul et ama parasını bırak (−40 dinar)`, run(c) {
                Game.spend(40); Game.addItem('cheese', 3); Game.addMorale(4);
                if(c.near.prosperity !== undefined) c.near.prosperity = Math.min(100, c.near.prosperity + 2);
                state.player.renown += 1;
                return T`"Bu köy kimseye bedava yedirmez" dedin, para keseye girdi.<br><b>−40 dinar</b>, <b>+3 peynir</b>, moral <b>+4</b>, itibar <b>+1</b>.`;
            }}
          ]},

        { id: 'toll', icon: '🪓', when: c => c.party >= 1 && c.money >= 60,
          text: () => T`Yolun daraldığı yerde altı kişi önünü kesti. "Bu yol bizim," diyor sakallısı, "geçiş parası var."`,
          choices: [
            { label: () => T`🪙 Haracı öde (−60 dinar)`, run() {
                Game.spend(60); Game.addMorale(-3);
                return T`Parayı saydın, yol açıldı. Adamların yere bakıyordu.<br><b>−60 dinar</b>, moral <b>−3</b>.`;
            }},
            { label: () => T`⚔️ "Bu yol kimsenin değil"`, run() {
                let npc = Game.spawnBand('bandit');
                npc.x = npc.targetX = state.player.x + 40;
                npc.y = npc.targetY = state.player.y;
                return { html: T`Sakallı adam kılıcını çekti. Pazarlık bitti.`,
                         then: () => Game.triggerEncounter(npc) };
            }}
          ]},

        { id: 'lost_scout', icon: '🧭', when: c => !c.onRoad,
          text: () => T`Tepenin ardından çıkan atlı yolunu şaşırmış: "Kaleye giden yol hangisi? İki gündür dönüp duruyorum."`,
          choices: [
            { label: () => T`🧭 Yolu tarif et`, run() {
                Game.addProficiencyXp('pathfinding', 40);
                return T`Adam teşekkür edip dörtnala uzaklaştı. Haritayı bir kez daha okumuş oldun.<br><b>Yol Bulma +40 tecrübe</b>, şeref <b>+${Game.addHonor('roadKind')}</b>.`;
            }},
            { label: () => T`🗡️ Atını ve kesesini al`, run() {
                let n = 70 + Math.floor(Math.random() * 90);
                state.player.money += n; Game.addProficiencyXp('looting', 30);
                return T`Adam yaya kaldı, sen zengin. Bu yolda kimse görmedi — bu sefer.<br><b>+${n} dinar</b>, <b>Yağmacılık +30 tecrübe</b>, şeref <b>−${-Game.addHonor('roadCruel')}</b>.`;
            }}
          ]},

        { id: 'pelt', icon: '🐺', when: c => c.terrain === 'Orman',
          text: () => T`Ağaçların arasında yeni ölmüş bir kurt. Postu temiz, leşi henüz soğumamış — yani onu öldüren şey de yakında.`,
          choices: [
            { label: () => T`🔪 Postunu yüz (2 saat)`, run() {
                Game.advanceTime(2);
                let n = 50 + Math.floor(Math.random() * 60);
                state.player.money += n; Game.addProficiencyXp('looting', 25);
                return T`Post kürkçüye gider.<br><b>+${n} dinar</b>, <b>Yağmacılık +25 tecrübe</b>.<br><i>2 saat kaybettin.</i>`;
            }},
            { label: () => T`👀 Kimin öldürdüğünü ara (2 saat)`, run() {
                Game.advanceTime(2); Game.addProficiencyXp('spotting', 50);
                return T`İzler bir sürünün geceyi nerede geçirdiğini söyledi. Artık ormanda gözün daha keskin.<br><b>Gözcülük +50 tecrübe</b>.<br><i>2 saat kaybettin.</i>`;
            }},
            { label: () => T`🚶 Burada durmak akıllıca değil`, run() {
                return T`Leşi bıraktın, adımını sıklaştırdın.`;
            }}
          ]},

        { id: 'deserters', icon: '🛡️', when: c => c.party >= 3 && c.party + 2 < c.cap,
          text: () => T`Ateş başında iki firari asker. Silahları hâlâ üstlerinde, ama üniformalarındaki arma sökülmüş.`,
          choices: [
            { label: () => T`⚔️ Aralarına al`, run(c) {
                let a = Game.addRecruit(c.near), b = Game.addRecruit(c.near);
                Game.addMorale(-3);
                return T`<b>${T(a.name)}</b> ve <b>${T(b.name)}</b> gruba katıldı. Eski askerlerin bu işe iyi bakmadı.<br>Moral <b>−3</b>.`;
            }},
            { label: () => T`⛓️ Bağla, en yakın kaleye teslim et (−4 saat)`, run() {
                Game.advanceTime(4);
                let n = 60 + Math.floor(Math.random() * 60);
                state.player.money += n; state.player.renown += 1;
                return T`Firari teslim etmenin bir bedeli vardır, alanın da.<br><b>+${n} dinar</b>, itibar <b>+1</b>, şeref <b>+${Game.addHonor('roadKind')}</b>.<br><i>4 saat kaybettin.</i>`;
            }},
            { label: () => T`🚶 Ateşlerini söndürmeden geç`, run() {
                return T`Göz göze geldiniz, kimse kımıldamadı. İyisi de bu.`;
            }}
          ]},

        { id: 'shrine', icon: '🕯️', when: c => c.money >= 40,
          text: () => T`Yol ayrımında taştan bir türbe. Önündeki çanakta bozuk paralar ve kurumuş çiçekler var.`,
          choices: [
            { label: () => T`🪙 Adak bırak (−30 dinar)`, run() {
                Game.spend(30); Game.addMorale(4);
                return T`Adamlar sırayla çanağa dokunup yola dizildi. Bugün kimse kötü konuşmadı.<br><b>−30 dinar</b>, moral <b>+4</b>.`;
            }},
            { label: () => T`🫳 Çanaktakileri al`, run() {
                let n = 15 + Math.floor(Math.random() * 25);
                state.player.money += n; Game.addMorale(-6);
                return T`Para keseye girdi ama adamların yüzü düştü.<br><b>+${n} dinar</b>, moral <b>−6</b>, şeref <b>−${-Game.addHonor('roadCruel')}</b>.`;
            }}
          ]},

        { id: 'night_fire', icon: '🔥', when: c => c.night && c.party >= 2,
          text: () => T`Karanlıkta, yoldan sapa bir yerde ateş yanıyor. Kimin olduğu buradan seçilmiyor.`,
          choices: [
            { label: () => T`👣 Sessizce yaklaş, bak`, run() {
                Game.addProficiencyXp('spotting', 45);
                if(Math.random() < 0.45) {
                    let n = 80 + Math.floor(Math.random() * 120);
                    state.player.money += n;
                    return T`Terk edilmiş bir kamp: aceleyle kalkmışlar, kese ateşin yanında unutulmuş.<br><b>+${n} dinar</b>, <b>Gözcülük +45 tecrübe</b>.`;
                }
                let npc = Game.spawnBand(Game.randomBandKind());
                npc.x = npc.targetX = state.player.x + 40;
                npc.y = npc.targetY = state.player.y;
                return { html: T`Ateşin başındakiler seni önce gördü.<br><b>Gözcülük +45 tecrübe</b>.`,
                         then: () => Game.triggerEncounter(npc) };
            }},
            { label: () => T`🌑 Ateşi arkanda bırak`, run() {
                Game.advanceTime(1);
                return T`Geniş bir kavis çizdin. Kim olduklarını hiç öğrenmeyeceksin.<br><i>1 saat kaybettin.</i>`;
            }}
          ]},

        { id: 'survivor', icon: '🔥', when: c => c.near && c.near.type === 'village'
                                             && c.day - (c.near.raidedDay || -99) < 10,
          text: c => T`${T(c.near.name)} yakılalı birkaç gün olmuş. Kül kokusunun içinden çıkan bir kadın seni görünce durdu.`,
          choices: [
            { label: () => T`🪙 Eline para sıkıştır (−100 dinar)`, run(c) {
                Game.spend(100);
                if(c.near.prosperity !== undefined) c.near.prosperity = Math.min(100, c.near.prosperity + 5);
                return T`Ne söyleyeceğini bilemedi. Sen de bilemedin.<br><b>−100 dinar</b>, ${T(c.near.name)} refahı <b>+5</b>, şeref <b>+${Game.addHonor('roadKind')}</b>.`;
            }},
            { label: () => T`🗡️ Kimin yaptığını sor`, run() {
                Game.addProficiencyXp('spotting', 35); Game.addMorale(-2);
                return T`Anlattıkları uzun sürdü ve hiçbiri iyi değildi. Bu yolda kimin gezindiğini artık biliyorsun.<br><b>Gözcülük +35 tecrübe</b>, moral <b>−2</b>.`;
            }},
            { label: () => T`🚶 Külün içinden geçip git`, run() {
                Game.addMorale(-3);
                return T`Adamların kadına baktı, sonra sana baktı.<br>Moral <b>−3</b>.`;
            }}
          ]},

        { id: 'peddler', icon: '🧺', when: c => c.money >= 150 && c.onRoad,
          text: () => T`Sırtında denk taşıyan bir seyyar satıcı: "Kervanım dağıldı, malı yarı fiyatına veriyorum. Buradan şehre canlı varamam."`,
          choices: [
            { label: () => T`🧺 Denkleri satın al (−140 dinar)`, run() {
                Game.spend(140); Game.addItem('velvet', 2); Game.addProficiencyXp('trade', 40);
                return T`İki top kadife, şehirde bunun iki katı eder — şehre varabilirsen.<br><b>−140 dinar</b>, <b>+2 kadife</b>, <b>Ticaret +40 tecrübe</b>.`;
            }},
            { label: () => T`🛡️ Şehre kadar yanında götür (−3 saat)`, run() {
                Game.advanceTime(3);
                let n = 100 + Math.floor(Math.random() * 80);
                state.player.money += n; state.player.renown += 1;
                return T`Adam sağ vardı ve bunu herkese anlattı.<br><b>+${n} dinar</b>, itibar <b>+1</b>, şeref <b>+${Game.addHonor('roadKind')}</b>.<br><i>3 saat kaybettin.</i>`;
            }},
            { label: () => T`🚶 İşine bak`, run() {
                return T`Denklerini sürüyerek arkanda kaldı.`;
            }}
          ]},

        { id: 'orphan', icon: '🗡️', when: c => c.near && c.party + 1 < c.cap,
          text: c => T`Elinde babasından kalan bir kılıçla bir oğlan. "${T(c.near.name)}'de bana iş yok," diyor, "savaşmayı öğrenirim."`,
          choices: [
            { label: () => T`⚔️ Al yanına`, run(c) {
                let t = Game.addRecruit(c.near);
                Game.addProficiencyXp('trainer', 25);
                return T`<b>${T(t.name)}</b> gruba katıldı. Kılıcı babasından kalmaydı, tutuşu değil.<br><b>Eğitmenlik +25 tecrübe</b>.`;
            }},
            { label: () => T`🪙 Kılıcını satın al, evine yolla (−60 dinar)`, run() {
                Game.spend(60); Game.addItem('sword', 1);
                return T`Para oğlanın eline, kılıç senin denginde. İkisi de kazandı sayılır.<br><b>−60 dinar</b>, <b>+1 kılıç</b>, şeref <b>+${Game.addHonor('roadKind')}</b>.`;
            }}
          ]},

        { id: 'old_soldier', icon: '🎯', when: c => c.party >= 3 && c.money >= 120,
          text: () => T`Yol kenarındaki hanın önünde oturan yaşlı bir asker adamlarını süzdü: "Bunlar mızrağı yanlış tutuyor. Bir gün ver, düzeltirim."`,
          choices: [
            { label: () => T`🎯 Tut, bir gün eğitsin (−100 dinar, 8 saat)`, run() {
                Game.spend(100); Game.advanceTime(8);
                Game.addProficiencyXp('trainer', 80);
                state.player.party.forEach(t => { t.xp = (t.xp || 0) + 2; });
                return T`Akşama kadar bağırdı. Sabah duruşları gerçekten değişmişti.<br><b>−100 dinar</b>, <b>Eğitmenlik +80 tecrübe</b>, her askere <b>+2 tecrübe</b>.<br><i>8 saat kaybettin.</i>`;
            }},
            { label: () => T`🍺 Bir bira ısmarla, hikâyesini dinle (−15 dinar)`, run() {
                Game.spend(15); Game.addMorale(3);
                return T`Anlattığı savaşların yarısı yalandı ama ateş başı şenlendi.<br><b>−15 dinar</b>, moral <b>+3</b>.`;
            }},
            { label: () => T`🚶 Adamlarım mızrağı iyi tutuyor`, run() {
                return T`Yaşlı asker arkandan güldü. Duymamış gibi yaptın.`;
            }}
          ]},

        { id: 'tracks', icon: '🐾', when: c => !c.night,
          text: () => T`Yolun tozunda taze at izleri: çok sayıda, hepsi aynı yöne. Bir saat önce buradan geçmişler.`,
          choices: [
            { label: () => T`🐾 İzi sür (2 saat)`, run() {
                Game.advanceTime(2); Game.addProficiencyXp('spotting', 40);
                if(Math.random() < 0.5) {
                    let n = 90 + Math.floor(Math.random() * 110);
                    state.player.money += n;
                    return T`İzler devrilmiş bir kervan arabasına çıktı; alacak bir şey kalmış.<br><b>+${n} dinar</b>, <b>Gözcülük +40 tecrübe</b>.<br><i>2 saat kaybettin.</i>`;
                }
                return T`İzler bir dereye girip kayboldu. Kaybedilen tek şey iki saat oldu.<br><b>Gözcülük +40 tecrübe</b>.<br><i>2 saat kaybettin.</i>`;
            }},
            { label: () => T`🧭 Ters yöne sap, karşılaşma`, run() {
                Game.advanceTime(1); state.encounterCooldown = Math.max(state.encounterCooldown, 8);
                return T`Kimin geçtiğini öğrenmedin ama kimseyle de karşılaşmadın.<br><i>1 saat kaybettin.</i>`;
            }}
          ]},

        { id: 'ford', icon: '🌊', when: c => c.terrain === 'Nehir Geçidi',
          text: () => T`Nehir kabarmış; bilinen geçit boğaza kadar geliyor. Aşağıda daha sığ bir yer olduğunu söylüyorlar.`,
          choices: [
            { label: () => T`🧭 Sığ geçidi ara (3 saat)`, run() {
                Game.advanceTime(3); Game.addProficiencyXp('pathfinding', 45);
                return T`İki dirsek aşağıda çakıllı bir geçit buldun; kimsenin ayağı ıslanmadı.<br><b>Yol Bulma +45 tecrübe</b>.<br><i>3 saat kaybettin.</i>`;
            }},
            { label: () => T`🌊 Buradan geç`, run() {
                Game.addMorale(-3);
                let n = Game.takeFood(2);
                return T`Akıntı iki denk erzağı alıp götürdü.<br><b>−${n} yiyecek</b>, moral <b>−3</b>.`;
            }}
          ]},

        { id: 'horse_trader', icon: '🐴', when: c => c.money >= 500 && !state.player.equipment.horse,
          text: () => T`Yol kenarında üç at bağlı, başlarında bir adam. "Kervanımın atları," diyor. Atların sağrısında başka birinin damgası var.`,
          choices: [
            { label: () => T`🐴 Soru sormadan al (−400 dinar)`, run() {
                Game.spend(400); Game.addItem('horse', 1); Game.addProficiencyXp('trade', 30);
                return T`At senin. Damganın sahibi bir gün karşına çıkabilir.<br><b>−400 dinar</b>, <b>+1 at</b>, şeref <b>−${-Game.addHonor('roadCruel')}</b>.`;
            }},
            { label: () => T`❓ Damgayı sor`, run() {
                Game.addProficiencyXp('persuasion', 35);
                return T`Adam önce kekeledi, sonra atları bırakıp tarlaya doğru koştu. Damgayı tanıyan birine haber saldın.<br><b>İkna +35 tecrübe</b>, şeref <b>+${Game.addHonor('roadKind')}</b>.`;
            }},
            { label: () => T`🚶 Bu iş kokuyor`, run() {
                return T`Atlara bakmadan geçtin. Bazen en ucuz at, almadığın attır.`;
            }}
          ]}
    ],

    // A road event depends on **distance**: a day spent in camp sees none, a day spent on the
    // road does. `timeFlows` is already off during a modal/battle/captivity so this is never
    // reached then; the encounter cooldown also pauses the counter so a player fresh out of a
    // battle isn't immediately handed another decision.
    roadTick(step) {
        if(state.player.prisoner || state.encounterCooldown > 0) return null;
        state.roadWalked = (state.roadWalked || 0) + step;
        if(state.roadWalked < this.ROAD_EVERY) return null;
        state.roadWalked -= this.ROAD_EVERY;
        if(Math.random() > this.ROAD_CHANCE) return null;
        return this.roadEvent();
    },

    roadEvent() {
        let ctx = this.eventCtx();
        let ev = this.pickEvent(this.ROAD_EVENTS, ctx);
        if(!ev) return null;
        this._roadEv = { ev, ctx };
        state.player.status = 'idle';   // the walk pauses in front of the decision
        this.showModal(`<h3>${ev.icon} ${T`Yolda`}</h3>
            <p style="font-style:italic;color:var(--text-muted)">${ev.text(ctx)}</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">
                ${ev.choices.map((ch, i) =>
                    `<button class="btn" style="text-align:left" onclick="Game.roadChoice(${i})">${ch.label(ctx)}</button>`).join('')}
            </div>`);
        return ev.id;
    },

    roadChoice(i) {
        let e = this._roadEv;
        if(!e) return this.closeModal();
        this._roadEv = null;
        let r = e.ev.choices[i].run(e.ctx);
        if(typeof r === 'string') r = { html: r };
        this.updateTopBar();
        this._afterModal = r.then || null;
        this.showModal(`<h3>${e.ev.icon} ${T`Yolda`}</h3><p>${r.html}</p>
            <button class="btn primary" style="margin-top:1rem" onclick="Game.modalDone()">${T`Tamam`}</button>`);
    },

    dailyUpdate() {
        Save.auto();   // ring-buffer autosave at the start of the day (#55 item 1)
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

        // Wages, food, and HP regen only apply to a free player; the rest of the world (quest
        // timers, feast/wedding day, rival suitors, tournament) needs to keep turning during
        // captivity too. The captivity block used to return early, and an engaged player who
        // got captured never had their wedding happen.
        if(!state.player.prisoner) {
            let fief = this.fiefIncome();                 // fief tax (garrison wages are in upkeep)
            state.player.money += fief.tax + fief.tribute + fief.trade;
            let up = this.upkeep();
            let totalWage = up.wage;
            let foodRequiredLow = up.foodLow;
            let foodRequiredHigh = up.foodHigh;

            let paid = state.player.money >= totalWage;
            if(paid) state.player.money -= totalWage;
            else state.player.wageDebt = (state.player.wageDebt || 0) + totalWage;   // debt accumulates, eating morale hour by hour

            this.spoilFood();

            // Food consumption
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
                return req; // Remaining (unmet) amount
            };

            // High-quality food is for level 30+ troops
            let missingHighQuality = consumeFood(highQualityFoods, Math.ceil(foodRequiredHigh));
            if(missingHighQuality > 0) {
                state.player.party.forEach(t => { if(t.level >= 30 && t.level < 51) t.debuff = true; });
            } else {
                state.player.party.forEach(t => { if(t.level >= 30 && t.level < 51) t.debuff = false; });
            }

            // The remaining food need can also be met with low-quality food
            let missingLow = consumeFood([...lowQualityFoods, ...highQualityFoods], Math.ceil(foodRequiredLow - foodRequiredHigh + missingHighQuality));

            // Wages and hunger now both settle their account in morale
            this.updateMorale(paid, missingLow > 0);

            // The player should see why they went hungry. Warband also warns when food
            // runs out; this had no warning before, so the player didn't understand why morale collapsed.
            let hungry = missingLow > 0;
            let alone = state.player.party.length === 0;
            if(hungry && !state.player.wasHungry) {
                alert(`🍽️ <b>${alone ? T('Aç kaldın!') : T('Ordu aç kaldı!')}</b><br>` +
                      T`Günlük ihtiyaç <b>${Math.ceil(foodRequiredLow)} birim</b> yemekti, <b>${Math.ceil(foodRequiredLow) - missingLow} birim</b> bulundu.<br>` +
                      (alone ? '' : `${T`Moral <b>−30</b> — moral 25'in altına inerse asker firar etmeye başlar.`}<br>`) +
                      T`Her aç gün <b>−${this.HUNGER_HP} can</b> götürür, yaran da iyileşmez.<br>` +
                      `<i>${T`Köylerin erzak pazarı en ucuz kaynaktır.`}</i>`);
            } else if(!hungry && state.player.wasHungry) {
                alert(alone ? T('🍞 Karnını doyurdun, açlık cezası kalktı.') : T('🍞 Ordu doydu, açlık cezası kalktı.'));
            }
            state.player.wasHungry = hungry;
            // Hunger's only effect used to be morale, and morale only applies to troops
            // (moraleMult in Battle). So a player traveling alone felt no effect from
            // going hungry. Now a hungry man loses weight: HUNGER_HP HP goes away per day
            // and regenTick doesn't heal it (see regenTick) — they don't die, the floor is 1 HP.
            if(hungry) state.player.stats.hp = Math.max(1, state.player.stats.hp - this.HUNGER_HP);

            // A quality shortfall is separate from hunger: full stomach, but an elite troop grumbles.
            // The player was rightly confused: "I have bread in inventory, why am I debuffed?"
            let elite = state.player.party.filter(t => t.level >= 30 && t.level < 51).length;
            if(missingHighQuality > 0 && elite && !state.player.wasLowQuality) {
                alert(`🥩 <b>${T`${elite} seçkin askerin</b> et/peynir bulamadı.`}<br>` +
                      `${T`Ekmek ve tahıl karınlarını doyurur ama <b>savaşta ×0.7</b> güçle dövüşürler.`}<br>` +
                      T`Bu açlık değil, <b>kalite</b> meselesi: günde ${Math.ceil(foodRequiredHigh)} birim et ya da peynir gerekiyor.`);
            }
            state.player.wasLowQuality = missingHighQuality > 0 && elite > 0;

            // Training skill: drills a few of the least experienced troops each day
            let trained = state.player.party.filter(t => !t.wounded)
                .sort((a, b) => a.level - b.level)
                .slice(0, this.profLvl('trainer') - 1);
            trained.forEach(t => this.giveTroopXp(t, 1));
            if(trained.length) this.addProficiencyXp('trainer', 4 * trained.length);

            this.addProficiencyXp('pathfinding', 12);
            this.addProficiencyXp('spotting', 8);

            // HP no longer jumps +5 per day; it fills 1 at a time, hour by hour (Game.regenTick).
            this.trainAttr('cha', state.player.party.length / 20);   // managing a crowd builds leadership
            this.trainAttr('vit', 0.1);

            // The wounded heal day by day
            state.player.party.forEach(t => {
                if(!t.wounded) return;
                t.wounded--;
                if(t.wounded <= 0) delete t.wounded;
            });

            // Prisoners look for a chance: a small escape chance each day.
            // ponytail: nobles don't flee — we leave the ransom decision to the player.
            let pmLvl = (state.player.proficiencies.prisonerMgmt || { level: 1 }).level;
            let escChance = Math.max(0.01, 0.06 - pmLvl * 0.005);
            state.player.prisoners = state.player.prisoners.filter(pr => pr.noble || Math.random() > escChance);
        }

        // Volunteer refresh (villages gain +1-2 volunteers per day, max 5)
        LOCATIONS.forEach(loc => {
            if(loc.type === 'village' && loc.volunteersAvailable !== undefined) {
                loc.volunteersAvailable = Math.min(5, loc.volunteersAvailable + Math.floor(Math.random() * 2));
            }
        });

        // NPCs grow stronger over time (first 3 months)
        let day = state.time.day;
        state.npcParties.forEach(npc => {
            if(npc.type === 'king') {
                npc.level = Math.min(20, 1 + Math.floor(day / 4.5)); // max 20 over 90 days
                npc.size = 50 + npc.level * 3;
            } else if(npc.type === 'vizier') {
                npc.level = Math.min(10, 1 + Math.floor(day / 9)); // max 10 over 90 days
                npc.size = 30 + npc.level * 2;
            }
        });

        // Tournament creation
        if(Math.random() < 0.25) {
            let cities = LOCATIONS.filter(l => l.type === 'city');
            let c = cities[Math.floor(Math.random() * cities.length)];
            state.activeTournaments[c.id] = true;
        }
        // End some tournaments
        for(let cid in state.activeTournaments) {
            if(Math.random() < 0.3) delete state.activeTournaments[cid];
        }

        this.diplomacyTick();   // war declaration / peace roll
        this.warTick();         // front-line clashes + settlements changing hands
        // Lords scattered in battle recover at home a few days later
        for(let lid in state.lordRespawn) {
            if(state.time.day >= state.lordRespawn[lid]) {
                this.respawnLordParty({ lordId: lid });
                delete state.lordRespawn[lid];
            }
        }

        this.campaignTick();    // marshal selection, campaign target, calling the player
        this.envoyTick();       // a companion sent as envoy comes back with an answer (#69)
        this.banditTick();      // bandits hit caravans on the road
        this.siegeTick();       // siege camp: preparation, starvation, relief army (#25)

        Nobles.dailyTick();
        Feast.dailyTick();
        Quests.dailyTick();

        // Bandit respawn: not one at a time, but up to a target. When only one band spawned
        // per day, a cleared region stayed empty for weeks.
        this.lairTick();
        for(let i = 0, eksik = this.bandTarget() - this.bandCount(); i < Math.min(this.BAND_REFILL, eksik); i++) {
            this.spawnFromLair();   // no lair, no band (#68)
        }
        this.ensureTraders();   // new caravans set out to replace robbed ones
        this.dailyEvent();      // daily event pool (#35) — last, after the day's accounting closes
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
        // Consumption is never zero anymore (the player eats too, #75) — the "no army" branch is gone.
        set('ui-food', fs.days);
        set('ui-food-sub', fs.total ? T('gün erzak') : T('erzak yok'));
        let fe = document.getElementById('chip-food');
        if(fe) fe.classList.toggle('warn', fs.days < 3);
        set('ui-renown', p.renown);
        set('ui-party', `${p.party.length}/${cap}`);
        let ccap = this.cargoCap(), cload = this.cargoLoad();
        set('ui-cargo', `${cload}/${ccap}`);
        let ce = document.getElementById('chip-cargo');
        if(ce) ce.classList.toggle('warn', cload > ccap);
        set('ui-hp', `${Math.floor(p.stats.hp)}/${p.stats.maxHp}`);
        set('ui-level', p.stats.level);

        bar('bar-hp', p.stats.hp / p.stats.maxHp * 100);
        bar('bar-party', p.party.length / cap * 100);
        bar('bar-cargo', cload / ccap * 100);
        bar('bar-xp', p.stats.xp / p.stats.xpNext * 100);
        set('ui-morale', Math.round(this.morale()));
        bar('bar-morale', this.morale());

        this.updateSpeedUI(this.getPlayerSpeed());
        this.updateTips(cap);
        this.updateMapHud();

    },

    // Top-bar tooltips: what each badge affects and by how much (thanks to setHtml,
    // the DOM is only written when the text actually changes)
    tipRow(label, val, good) {
        return `<div style="display:flex;justify-content:space-between;gap:1.2rem">
            <span>${label}</span><span style="color:${good === null ? '#ddd' : good ? 'var(--success)' : 'var(--danger)'}">${val}</span></div>`;
    },
    tipBox(title, rows, note) {
        return `<b style="font-family:Cinzel,serif">${title}</b>
            <hr style="border:0;border-top:1px solid rgba(212,175,55,.4);margin:5px 0">${rows}
            ${note ? `<div style="color:var(--text-muted);font-size:var(--fs-sm);margin-top:5px;max-width:270px">${note}</div>` : ''}`;
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
            (this.tributaries().length ? R(T('Haraç'), T`+${this.fiefIncome().levy} (${this.tributaries().length} köy)`, true) : '') +
            (p.spouse ? R(T('Evlilik geliri'), '+50', true) : '') +
            (p.wageDebt > 0 ? R(T('Gecikmiş maaş'), T`${Math.ceil(p.wageDebt)} dinar · ${p.wageLateHours || 0} saattir`, false) : '') +
            (p.wageDebt > 0 ? R(T('Saatlik moral kaybı'), '-1', false) : ''),
            T('Maaş ödenemezse borç birikir ve her saat 1 moral gider; paran olunca borç kendiliğinden ödenir. Lvl 10 altı asker maaş istemez, lvl 51 hiçbir şey istemez.')));

        let fs = this.foodStock();
        this.setHtml('tip-food', this.tipBox(T('Erzak'),
            R(T('Elde'), T`${fs.total} birim (${fs.low} tahıl/ekmek · ${fs.high} et/peynir)`, fs.total > 0) +
            R(T('Günlük tüketim'), T`-${fs.need} birim`, false) +
            (fs.spoil >= 0.05 ? R(T('Bozulma'), T`-${fs.spoil.toFixed(1)} birim/gün`, false) : '') +
            R(T('Yeter'), T`${fs.days} gün`, fs.days >= 3) +
            (fs.needHigh ? R(T('Seçkin asker payı'), T`${fs.needHigh} birim et/peynir`, fs.high >= fs.needHigh) : '') +
            R(T('Yemek çeşidi'), T`${fs.kinds} çeşit · moral +${fs.kinds * 5}`, fs.kinds > 1),
            T`Erzak biterse moral −30, firar başlar ve aç geçen her gün sana −${this.HUNGER_HP} can. Çeşit başına +5 moral. Ekmek çabuk bozulur (20 gün), tahıl dayanır (60 gün).`));

        this.setHtml('tip-renown', this.tipBox(T('Nam'),
            R(T('Namın'), p.renown, null) +
            R(T('Ulaşılan en yüksek'), this.peakRenown(), null) +
            R(T('Salon konukları'), T('80 nam'), this.peakRenown() >= 80) +
            R(T('Kız isteme'), T('120 nam'), this.peakRenown() >= 120) +
            R(T('Şölen daveti'), T('150 nam'), this.peakRenown() >= 150) +
            R(T('Hükmetme hakkı (köyü haraca bağla)'), T`${this.RENOWN_GATES.tribute} nam`, this.peakRenown() >= this.RENOWN_GATES.tribute) +
            R(T('Yoldaş elçiliği'), T`${this.RENOWN_GATES.envoy} nam`, this.peakRenown() >= this.RENOWN_GATES.envoy) +
            R(T('Mareşal adaylığı'), T`${this.RENOWN_GATES.marshal} nam`, this.peakRenown() >= this.RENOWN_GATES.marshal),
            T('Nam kazandıran: savaş zaferi +3, turnuva +20, şölen vermek +15. Drahomayı da düşürür.')));

        this.setHtml('tip-hp', this.tipBox(T('Can'),
            R(T('Şu an'), `${Math.floor(p.stats.hp)}/${p.stats.maxHp}`, p.stats.hp > p.stats.maxHp * 0.4) +
            R(T('Seviyeden'), 50 + (p.stats.level - 1) * 10, true) +
            (p.equipment.armor ? R(T`Zırh (${T(p.equipment.armor.name)})`, '+' + p.equipment.armor.armor, true) : R(T('Zırh'), T('yok'), false)),
            T('Her gün +5 iyileşirsin. Savaşta canın biterse ölmezsin, bayılırsın — adamların dövüşmeye devam eder ama ödül yarıya iner.')));

        this.setHtml('mute-ico', this.opt('muted') ? '🔇' : '🔊');
        this.setHtml('mute-lbl', this.opt('muted') ? T('Ses Kapalı') : T('Ses Açık'));

        let comp = this.getPartyComposition();
        // Capacity comes from the player's OWN Leadership level; the tooltip used to read
        // profLvl (the highest in the party), so the breakdown didn't add up with a companion around (#43).
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

        let ccap2 = this.cargoCap(), cload2 = this.cargoLoad();
        let cmounted = comp.cavalry + (p.equipment.horse ? 1 : 0);
        this.setHtml('tip-cargo', this.tipBox(T('Çanta'),
            R(T('Yük'), T`${cload2}/${ccap2} birim`, cload2 <= ccap2) +
            R(T('Taban'), this.CARGO_BASE, null) +
            R(T('Kişi başı'), `+${this.CARGO_PER_MAN * (p.party.length + 1)}`, null) +
            R(T('Atlı payı'), `+${this.CARGO_PER_MOUNT * cmounted}`, cmounted > 0) +
            (cload2 > ccap2 ? R(T('Aşırı yük hız cezası'), this.pct((this.cargoMult() - 1) * 100, true), false) : ''),
            T('Her birim mal bir yer tutar. Sınırı aşarsan pazardan alamazsın; ganimetle aşarsan hız düşer (kapasitenin iki katında yarıya iner). Tımarındaki depoya koyduğun mal yer tutmaz.')));

        this.setHtml('tip-morale', this.moraleTip());

        this.setHtml('tip-level', this.tipBox(T('Seviye'),
            R(T('Seviye'), p.stats.level, null) +
            R(T('Tecrübe'), `${Math.floor(p.stats.xp)}/${p.stats.xpNext}`, null) +
            R(T('Bekleyen nitelik puanı'), p.stats.attributePoints || 0, (p.stats.attributePoints || 0) > 0) +
            R(T('Bekleyen odak puanı'), p.stats.focusPoints || 0, (p.stats.focusPoints || 0) > 0),
            T('Her seviye: +10 can, tam iyileşme, 2 nitelik + 3 odak puanı. Seninle boy ölçüşemeyecek düşmandan alınan tecrübe ve ganimet azalır.')));
    },
    // Morale tooltip: the same line items as moraleHtml, shaped to fit a badge
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

    // Don't rewrite innerHTML every frame — only when the text actually changes
    _htmlCache: {},
    setHtml(id, html) {
        if(this._htmlCache[id] === html) return;
        this._htmlCache[id] = html;
        let e = document.getElementById(id);
        if(e) e.innerHTML = html;
    },

    // Map tooltip: the terrain you're on + troop composition
    updateMapHud() {
        let t = document.getElementById('map-terrain-txt');
        if(!t) return;
        let terrain = this.getTerrainInfo(state.player.x, state.player.y);
        t.innerText = T(terrain.name) + (terrain.mult !== 1 ? T`  (${terrain.mult > 1 ? '+' : ''}%${((terrain.mult-1)*100).toFixed(0)} hız)` : '');
        document.getElementById('map-terrain').firstElementChild.innerText = terrain.icon;

        let c = this.getPartyComposition();
        // Unspent points should show from the map and open the character screen (#35)
        let st = state.player.stats, ap = st.attributePoints || 0, fp = st.focusPoints || 0;
        const touch = this.isTouch();   // saying "(K)" to someone playing with a finger makes no sense (#65)
        let pts = ap + fp ? `<button id="btn-points" onclick="Game.showScreen('character')"`
                + ` title="${touch ? T('Harcanmamış puanların var — karakter ekranına git')
                                    : T('Harcanmamış puanların var — karakter ekranına git (C)')}">`
                + `✨ ${ap ? T`${ap} nitelik` : ''}${ap && fp ? ' · ' : ''}${fp ? T`${fp} odak` : ''}</button>` : '';
        this.setHtml('map-comp',
            `<span>🪖 <b>${c.infantry}</b></span><span>🏹 <b>${c.archer}</b></span><span>🐎 <b>${c.cavalry}</b></span>`
            + pts
            + `<button id="btn-wait" onclick="Game.askWait()" title="${T('Kamp kur, zamanı geçir')}">${T`⏳ Bekle`}</button>`
            + `<button id="btn-center" onclick="Game.centerOnPlayer()" title="${touch ? T('Kamerayı bana getir') : T('Kamerayı bana getir (Boşluk)')}">${T`🎯 Beni Bul`}${touch ? '' : ` <kbd>${T('Boşluk')}</kbd>`}</button>`
            + `<button id="btn-track" onclick="Game.Music.skip()" title="${touch ? T('Sıradaki parçaya geç') : T('Sıradaki parçaya geç (N)')}">${T`🎵 Sıradaki`}${touch ? '' : ' <kbd>N</kbd>'}</button>`
            + `<button id="btn-diplo" onclick="Game.showDiplomacy()" title="${touch ? T('Krallıkların savaş/barış hâli') : T('Krallıkların savaş/barış hâli (K)')}">${T`🌍 Diplomasi`}${touch ? '' : ' <kbd>K</kbd>'}</button>`);
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
    // Lock the camera back onto the player (resets the edge-pan offset)
    centerOnPlayer() {
        this.camera.offsetX = 0;
        this.camera.offsetY = 0;
    },

    showScreen(screenId) {
        document.querySelectorAll('.menu-btn').forEach(b => b.classList.toggle('active', b.dataset.view === screenId));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        let view = document.getElementById(screenId + '-view');
        if(view) view.classList.add('active');

        // In battle the whole screen belongs to the arena (#86). On a phone the campaign bar
        // (123px) and menu strip (105px) eat a third of a 664px window, leaving a
        // 345px canvas: `drawHud`'s top strip, the battle log, and the controls
        // overlapped each other. Both are hidden during battle; nobody taps them on a screen
        // that isn't being played anyway.
        document.body.classList.toggle('in-battle', screenId === 'battle');
        // On a narrow screen, quests sit behind "⋯ More": that button gets marked so it shows as selected
        let more = document.querySelector('.sb-more');
        if(more) more.classList.toggle('active', screenId === 'quests');

        // Give the newly-visible canvas its size: a resize done while hidden
        // may have left it 0x0 (the map stayed blank).
        this.resizeCanvases();

        // Every path out of a battle/tournament goes through here: restart the map loop
        if(screenId !== 'battle' && !this._loopId && !Battle.active && !TournamentMinigame.active) {
            this.startGameLoop();
        }

        this.renderSiegeUI();   // the siege panel only shows on the map
        this.renderRaidUI();    // the raid panel too (#49)
        this.renderWaitUI();    // the camp panel too (#53)
        this.applyViewBg(screenId);   // themed background, once per screen (#61)
        // Map music or battle music: the `in-battle` stamp set above is the same answer
        this.Music.sync();
        if(screenId === 'quests') Quests.render();
        else if(screenId === 'character') this.renderCharacterScreen();
        else if(screenId === 'party') this.renderPartyScreen();
        else if(screenId === 'inventory') this.renderInventoryScreen();
    },

    // --- MAP RENDER ---
    // Ground texture: a 256px repeating pattern, generated once
    buildGroundTexture() {
        let sz = 256;
        let c = document.createElement('canvas'); c.width = c.height = sz;
        let x = c.getContext('2d');
        x.fillStyle = '#32472d'; x.fillRect(0, 0, sz, sz);
        // Draw wrapping across the edges — otherwise tiling the pattern leaves a grid seam
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

    // Map name labels — a legible plate instead of bare shadowed text.
    // Overlapping ones shift upward (so names in a crowded area don't eat each other).
    // Label size scales with the screen: a fixed 19px is correct on a 1440px canvas,
    // but labels ran into each other on a 370px phone (#86). The short side's
    // 620px is the reference; a screen below that shrinks down to 68%.
    uiScale() {
        let cv = this.mapCanvas;
        if(!cv || !cv.width) return 1;
        return Math.max(0.68, Math.min(1, Math.min(cv.width, cv.height) / 620));
    },

    mapLabel(ctx, text, x, y, color, accent) {
        // Text size is independent of zoom: it reads at the same on-screen size at every zoom level
        let s = this.uiScale(), k = s / this.camera.zoom;
        let w = this.textW(ctx, text) * k + 18*k, h = 25*k;
        ctx.font = `bold ${(19*k).toFixed(1)}px Inter, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        if(!this._labelRects) this._labelRects = [];
        let free = false;
        for(let tries = 0; tries < 8; tries++) {
            let hit = this._labelRects.some(r =>
                Math.abs(r.x - x) < (r.w + w)/2 && Math.abs(r.y - y) < (r.h + h)/2 + 3);
            if(!hit) { free = true; break; }
            y -= h + 5;
        }
        // If no room opened up, the label just isn't drawn: printing it anyway after
        // 8 tries produced a wall of overlapping text on a narrow screen (#86). Whose
        // name got dropped can be read from the tooltip — two overlapping names, both are hidden.
        if(!free) return;
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

    // --- MAP PARTY ICONS ---
    // In Warband, the party icon shows what the party looks like: mounted if you're
    // mounted, spear infantry if on foot, a column behind you if you're a crowd.

    // Foot soldier silhouette (0,0 = footing point)
    drawFootman(ctx, col, cloak, bow) {
        if(bow) {                                                      // bow (bandit archer)
            ctx.strokeStyle = '#6b5535'; ctx.lineWidth = 2.4;
            ctx.beginPath(); ctx.arc(9, -16, 14, -Math.PI*0.45, Math.PI*0.45); ctx.stroke();
            ctx.strokeStyle = 'rgba(240,240,230,0.75)'; ctx.lineWidth = 1.1;
            ctx.beginPath(); ctx.moveTo(11, -28.6); ctx.lineTo(11, -3.4); ctx.stroke();
        } else {
        ctx.strokeStyle = '#6b5535'; ctx.lineWidth = 2.2;             // spear shaft
        ctx.beginPath(); ctx.moveTo(7, -36); ctx.lineTo(10, 8); ctx.stroke();
        ctx.fillStyle = '#cfd6dc';                                     // spear tip
        ctx.beginPath(); ctx.moveTo(7, -36); ctx.lineTo(4, -44); ctx.lineTo(11, -40); ctx.closePath(); ctx.fill();
        }

        ctx.strokeStyle = cloak; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-3, 2); ctx.lineTo(-5, 12); ctx.moveTo(3, 2); ctx.lineTo(5, 12); ctx.stroke();

        ctx.fillStyle = cloak;                                         // body
        ctx.beginPath();
        ctx.moveTo(-7, 4); ctx.lineTo(-5, -15);
        ctx.quadraticCurveTo(0, -21, 5, -15); ctx.lineTo(7, 4);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = col;                                           // shield
        ctx.beginPath(); ctx.arc(-8, -6, 6.4, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.4; ctx.stroke();

        ctx.fillStyle = '#d9c6a2';                                     // face
        ctx.beginPath(); ctx.arc(0, -20, 4.8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = cloak;                                         // helmet
        ctx.beginPath(); ctx.arc(0, -20, 5.2, Math.PI, 0); ctx.fill();
        ctx.lineCap = 'butt';
    },

    // Rider silhouette (0,0 = the horse's hoof line, horse faces right)
    drawRider(ctx, col, cloak) {
        let hide = '#4a3524', dark = '#33241a';

        ctx.strokeStyle = dark; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
        ctx.beginPath();                                                // legs
        ctx.moveTo(-9, -5); ctx.lineTo(-11, 9);
        ctx.moveTo(-4, -4); ctx.lineTo(-2, 9);
        ctx.moveTo(8, -5);  ctx.lineTo(10, 9);
        ctx.moveTo(12, -6); ctx.lineTo(15, 8);
        ctx.stroke();
        ctx.beginPath();                                                // tail
        ctx.moveTo(-13, -12); ctx.quadraticCurveTo(-22, -10, -21, -1);
        ctx.lineWidth = 3.8; ctx.stroke();

        ctx.fillStyle = hide;
        ctx.beginPath(); ctx.ellipse(1, -10, 14, 7.5, 0, 0, Math.PI*2); ctx.fill();   // body
        ctx.beginPath();                                                // neck
        ctx.moveTo(7, -15); ctx.lineTo(13, -31); ctx.lineTo(19, -29); ctx.lineTo(15, -11);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();                                                // head + muzzle
        ctx.moveTo(13, -32); ctx.lineTo(26, -28); ctx.lineTo(26, -24); ctx.lineTo(15, -25);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();                                                // ear
        ctx.moveTo(14, -32); ctx.lineTo(15, -37); ctx.lineTo(18, -31); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = dark; ctx.lineWidth = 2.6;                    // mane
        ctx.beginPath(); ctx.moveTo(5, -17); ctx.lineTo(13, -32); ctx.stroke();

        ctx.fillStyle = col;                                            // saddle cloth (faction color)
        ctx.beginPath(); ctx.moveTo(-8, -11); ctx.lineTo(6, -11); ctx.lineTo(3, -2); ctx.lineTo(-7, -2);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = cloak;                                          // rider's body
        ctx.beginPath();
        ctx.moveTo(-7, -12); ctx.lineTo(-5, -29);
        ctx.quadraticCurveTo(0, -34, 5, -29); ctx.lineTo(6, -12);
        ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#c8d0d8'; ctx.lineWidth = 2.6;               // sword raised in the air
        ctx.beginPath(); ctx.moveTo(5, -28); ctx.lineTo(14, -44); ctx.stroke();
        ctx.strokeStyle = cloak; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(3, -25); ctx.lineTo(6, -29); ctx.stroke();

        ctx.fillStyle = '#d9c6a2';                                      // face
        ctx.beginPath(); ctx.arc(0, -35, 4.8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = cloak;                                          // helmet
        ctx.beginPath(); ctx.arc(0, -35, 5.2, Math.PI, 0); ctx.fill();
        ctx.lineCap = 'butt';
    },

    // Wolf silhouette (0,0 = paw line, faces right) — a pack carries no human icon
    drawWolf(ctx, col) {
        let fur = '#5b6068', dark = '#33373d';

        ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath();                                               // legs
        ctx.moveTo(-8, -8); ctx.lineTo(-10, 6);
        ctx.moveTo(-3, -8); ctx.lineTo(-1, 6);
        ctx.moveTo(7, -8);  ctx.lineTo(6, 6);
        ctx.moveTo(11, -9); ctx.lineTo(13, 5);
        ctx.stroke();
        ctx.beginPath(); ctx.lineWidth = 4.2;                          // tail
        ctx.moveTo(-11, -13); ctx.quadraticCurveTo(-23, -15, -21, -26); ctx.stroke();

        ctx.fillStyle = fur;
        ctx.beginPath(); ctx.ellipse(0, -13, 13, 6.5, 0, 0, Math.PI*2); ctx.fill();   // body
        ctx.beginPath();                                               // neck + head
        ctx.moveTo(6, -18); ctx.lineTo(15, -25); ctx.lineTo(25, -23);
        ctx.lineTo(25, -18); ctx.lineTo(13, -12); ctx.closePath(); ctx.fill();
        ctx.beginPath();                                               // ears
        ctx.moveTo(14, -25); ctx.lineTo(14, -32); ctx.lineTo(18, -25); ctx.closePath();
        ctx.moveTo(19, -24); ctx.lineTo(21, -30); ctx.lineTo(24, -23); ctx.closePath(); ctx.fill();

        ctx.fillStyle = col;                                           // pack color: neck fur
        ctx.beginPath(); ctx.moveTo(-3, -19); ctx.lineTo(3, -26); ctx.lineTo(9, -18); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd479';                                     // eye
        ctx.beginPath(); ctx.arc(21, -21, 1.6, 0, Math.PI*2); ctx.fill();
        ctx.lineCap = 'butt';
    },

    // Whatever the party looks like gets drawn: mounted / spear infantry / archer / wolf
    // Caravan: draft horse + cargo wagon. Faction color is on the tent canopy.
    drawCart(ctx, col, cloak) {
        ctx.save();
        ctx.fillStyle = '#6b5442';                                      // draft horse
        ctx.beginPath(); ctx.ellipse(22, -22, 11, 6, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(29,-26); ctx.lineTo(38,-32); ctx.lineTo(40,-24); ctx.lineTo(31,-19); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#4a3a2e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(16,-17); ctx.lineTo(15,-3); ctx.moveTo(27,-17); ctx.lineTo(28,-3); ctx.stroke();
        ctx.strokeStyle = '#7d6a45'; ctx.lineWidth = 2.4;               // shaft (wagon pole)
        ctx.beginPath(); ctx.moveTo(0,-16); ctx.lineTo(18,-20); ctx.stroke();
        ctx.fillStyle = cloak; ctx.fillRect(-24, -30, 26, 17);          // cargo bed
        ctx.fillStyle = col;                                            // canopy
        ctx.beginPath(); ctx.moveTo(-26,-30); ctx.quadraticCurveTo(-11,-46, 4,-30); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.strokeStyle = '#4a3a2e'; ctx.lineWidth = 2.6;               // wheels
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
     * Full party icon: shadow + column behind + front figure + banner.
     * o = { mounted, size, color, scale, bob, dim }
     */
    // A large army looks bigger on the map too (~+20% at 30 people, capped at +35% at 100)
    partyIconScale(size) { return 1 + Math.min(0.35, Math.max(0, size - 5) * 0.007); },

    drawPartyIcon(ctx, x, y, o) {
        let sc = o.scale || 1;
        let kind = o.kind || (o.mounted ? 'rider' : 'foot');
        let cloak = o.dim ? '#3a3a42' : '#26262e';

        ctx.save();
        ctx.translate(x, y);

        ctx.beginPath();                                               // ground shadow
        ctx.ellipse(0, 0, 26*sc, 9*sc, 0, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();

        ctx.scale(sc, sc);
        ctx.translate(0, o.bob || 0);

        // Crowd column: 1 companion figure at 10+ people, 2 at 30+
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

        // Banner pole (a wolf pack carries no banner)
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
        // Time stops while a modal is open; continuing to draw made the modal's glass panel
        // recompute its backdrop blur every frame.
        if(!document.getElementById('modal-overlay').classList.contains('hidden')) return;
        let c = this.mapCanvas, ctx = this.ctx;
        let W = c.width, H = c.height;
        // On a phone the bottleneck isn't JS but fill rate (#84): the `lite` branches below
        // replace full-screen expensive layers with flat equivalents.
        let lite = this.lite();
        this._labelRects = [];
        ctx.clearRect(0,0,W,H);
        ctx.save();
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x + W/(2*this.camera.zoom), -this.camera.y + H/(2*this.camera.zoom));

        // --- Sea
        if(!this._seaGrad) {
            let g = ctx.createLinearGradient(0, -2000, 0, 11000);
            g.addColorStop(0, '#0a1c2e');
            g.addColorStop(0.5, '#123c58');
            g.addColorStop(1, '#0a1c2e');
            this._seaGrad = g;
        }
        // The gradient is cached but every pixel is still sampled: measured 0.99ms -> 0.06ms
        ctx.fillStyle = lite ? '#123c58' : this._seaGrad;
        ctx.fillRect(-5000, -5000, 20000, 20000);

        // Sea waves — 26 polylines × 45 points; the sea stays flat in lite mode
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 6;
        let wt = performance.now() / 4000;
        for(let i = -4; i < 22 && !this.lite(); i++) {
            let y = i * 600 + Math.sin(wt + i) * 40;
            ctx.beginPath();
            for(let x = -4000; x < 14000; x += 400) ctx.lineTo(x, y + Math.sin((x/900) + wt*2 + i) * 30);
            ctx.stroke();
        }

        // --- Continent
        ctx.save();
        ctx.beginPath();
        for(let i=0; i<state.mapBorder.length; i++) {
            let pt = state.mapBorder[i];
            if(i===0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();

        // Beach + coastal shadow
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if(!lite) { ctx.lineWidth = 90; ctx.strokeStyle = 'rgba(226,205,150,0.16)'; ctx.stroke(); }
        ctx.lineWidth = 42; ctx.strokeStyle = 'rgba(214,190,132,0.55)'; ctx.stroke();
        // Coastal shadow: `shadowBlur = 70` blurred the whole continent pixel by pixel
        // every frame. Three wide transparent outlines give the same halo, the cost is a path stroke.
        // In lite mode the beach strip stays, the halo drops: 6 wide outlines is 0.48ms, 1 is 0.12ms.
        if(!lite) {
            ctx.strokeStyle = 'rgba(0,0,0,0.22)';
            for(let bw of [130, 86, 48]) { ctx.lineWidth = bw; ctx.stroke(); }
        }
        ctx.fillStyle = '#2f452c'; ctx.fill();
        ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(140,170,120,0.35)'; ctx.stroke();

        ctx.clip(); // Nothing after this spills outside the continent

        // Ground texture (generated once and tiled as a pattern). Filling the whole
        // continent a second time, sampling a texture on top, costs 2.06ms on its own —
        // the single most expensive thing on the map. In lite mode the flat green underneath stays.
        if(!lite) {
            if(!this.groundPattern) this.buildGroundTexture();
            ctx.fillStyle = this.groundPattern;
            ctx.fill();
        }

        // Dirt patches — soft-edged
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

        // Rivers — bed, water, current
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        RIVERS.forEach(riv => {
            ctx.beginPath(); ctx.moveTo(riv.x1, riv.y1); ctx.lineTo(riv.x2, riv.y2);
            if(lite) { ctx.lineWidth = riv.width; ctx.strokeStyle = 'rgba(48,120,160,0.9)'; ctx.stroke(); return; }
            ctx.lineWidth = riv.width + 22; ctx.strokeStyle = 'rgba(96,110,70,0.55)'; ctx.stroke();
            ctx.lineWidth = riv.width; ctx.strokeStyle = 'rgba(48,120,160,0.85)'; ctx.stroke();
            ctx.lineWidth = riv.width * 0.45; ctx.strokeStyle = 'rgba(120,200,235,0.5)'; ctx.stroke();
        });
        if(!lite) {   // flowing shimmer: lineDashOffset changes every frame, so it's a new stroke each frame
            ctx.setLineDash([50, 90]);
            ctx.lineDashOffset = -(performance.now() / 25);
            ctx.strokeStyle = 'rgba(255,255,255,0.30)';
            RIVERS.forEach(riv => {
                ctx.lineWidth = Math.max(3, riv.width * 0.18);
                ctx.beginPath(); ctx.moveTo(riv.x1, riv.y1); ctx.lineTo(riv.x2, riv.y2); ctx.stroke();
            });
            ctx.setLineDash([]);
        }

        // Roads — a separate texture per kind (#56): paved main road, dirt road,
        // an unmaintained goat path. Same-kind roads collect into one path (3 stroke sets per frame).
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
                if(lite) continue;               // the center-line marking is decorative: the road's kind already reads from its width
                ctx.setLineDash(st.dash);
                ctx.lineWidth = st.mw;  ctx.strokeStyle = st.mark;     ctx.stroke();
                ctx.setLineDash([]);
            }
            // The road opens into a square at a settlement's mouth
            ctx.fillStyle = 'rgba(120,98,62,0.35)';
            LOCATIONS.forEach(l => {
                let r = l.type === 'city' ? 70 : l.type === 'castle' ? 52 : 40;
                ctx.beginPath(); ctx.arc(l.x, l.y, r, 0, Math.PI*2); ctx.fill();
            });
            // Bridges — planks crossing over the river
            (state.bridges || []).forEach(b => {
                let w = (this.ROAD_KINDS[b.kind] || this.ROAD_KINDS.dirt).half + 6;  // the road's own width
                ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a || 0);
                ctx.fillStyle = 'rgba(70,52,30,0.92)';
                ctx.fillRect(-w * 1.3, -w, w * 2.6, w * 2);
                ctx.strokeStyle = 'rgba(186,152,96,0.95)'; ctx.lineWidth = 4;
                for(let i = -w * 1.15; i <= w * 1.15; i += 12) {   // planks perpendicular to the road
                    ctx.beginPath(); ctx.moveTo(i, -w + 2); ctx.lineTo(i, w - 2); ctx.stroke();
                }
                ctx.restore();
            });
        }

        // Forests — actual trees (positions generated once and stored)
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
        // The forest patch stays fixed: its gradient is generated once. The trees (4 forests ×
        // ~15 trees, each 6 path segments + 1 gradient) drop in lite mode, the patch stays.
        if(!this._forestGrad) this._forestGrad = FORESTS.map(f => {
            let g = ctx.createRadialGradient(f.x, f.y, f.radius*0.2, f.x, f.y, f.radius);
            g.addColorStop(0, 'rgba(16,38,18,0.85)');
            g.addColorStop(1, 'rgba(16,38,18,0)');
            return g;
        });
        // In lite mode the trees are thinned but not switched off: a darkening disc alone
        // doesn't stand out from the ground, the forest became invisible — but a forest is
        // gameplay information (ambush, spotting, speed). With a third left the patch still reads.
        let step = this.lite() ? 3 : 1;
        FORESTS.forEach((f, i) => {
            ctx.fillStyle = this._forestGrad[i];
            ctx.beginPath(); ctx.arc(f.x, f.y, f.radius, 0, Math.PI*2); ctx.fill();
            this._forestTrees[i].forEach((t, j) => { if(j % step === 0) Battle.drawTree(ctx, t.x, t.y, t.r); });
        });

        ctx.restore(); // continent clip ends

        // Discovery sites (#58): smaller and dimmer than a settlement — draws attention without crowding
        (state.sites || []).forEach(site => {
            if(!this.lairSeen(site)) return;    // an undiscovered lair isn't on the map (#68)
            let k = this.SITE_KINDS[site.kind], ik = this.iconScale(), big = 30 * ik;
            let fresh = this.siteReady(site);
            ctx.beginPath();
            ctx.ellipse(site.x, site.y + 12, big*0.5, big*0.2, 0, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
            ctx.globalAlpha = fresh ? 0.95 : 0.45;
            this.emoji(ctx, k.icon, site.x, site.y + 10, big);
            ctx.globalAlpha = 1;
            // Only label when zoomed in: 14 long names crowded out settlement names at the continent view
            if(fresh && this.camera.zoom > 0.18) this.mapLabel(ctx, T(k.name), site.x, site.y - big*0.75 - 10, '#cbbf9a', '#8a7b52');
        });

        // Draw locations
        // A quest's "where" also shows on the map: it comes from the same source
        // as the 📍 in the quest screen (QUESTS[].where), so the two lists can't drift apart.
        let questMarks = typeof Quests !== 'undefined' ? Quests.targets() : {};
        LOCATIONS.forEach(loc => {
            let fc = FACTIONS[loc.faction] || {color:'#888'};
            let ik = this.iconScale();
            let big = (loc.type === 'city' ? 64 : loc.type === 'castle' ? 48 : 32) * ik;
            let icon = loc.type === 'city' ? '🏙️' : loc.type === 'castle' ? '🏰' : '🏘️';

            // Ground shadow
            ctx.beginPath();
            ctx.ellipse(loc.x, loc.y + 18, big*0.55, big*0.22, 0, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();

            this.emoji(ctx, icon, loc.x, loc.y + 15, big);

            // Faction pennant
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
            if(questMarks[loc.id]) this.emoji(ctx, '📜', loc.x - big*0.55, loc.y - 15 - 34*ik, 36*ik);

            this.mapLabel(ctx, T(loc.name), loc.x, loc.y - big*0.82 - 14, '#f2e4bb', fc.color);
            if(questMarks[loc.id] && this.camera.zoom > 0.18)
                this.mapLabel(ctx, questMarks[loc.id].join(' · '), loc.x, loc.y - big*0.82 - 34, '#e0b062', '#8a6a2a');
        });

        // --- TIME OF DAY ---
        // Night is blue, dawn/dusk warm-toned. At night, settlements have hearth light.
        let tint = this.dayTint();
        if(tint) {
            ctx.fillStyle = tint;
            ctx.fillRect(-1000, -1000, 11000, 11000);
        }
        // Hearth light: one gradient, intensity via globalAlpha (0 gradients/frame instead of 25)
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

        // No fog of war: terrain, roads, and settlements are always visible (like Warband).
        // The only thing hidden is parties — those are filtered by Game.canSee().

        // Draw a mountain range along the borders
        // Half of the 315 border points were mountains: ~157 emoji rasterizations per frame.
        // Now a baked sprite is stamped, and in lite mode it's also thinned to one in four.
        let mStep = this.lite() ? 4 : 2;
        state.mapBorder.forEach((pt, index) => {
            if(index % mStep === 0) {
                let sz = 42 + ((index * 37) % 24); // a broken silhouette instead of a regular repeat
                this.emoji(ctx, '🏔️', pt.x, pt.y + 20 + (index % 3) * 6, sz);
            }
        });

        // NPCs (only those in sight range)
        state.npcParties.forEach(npc => {
            let dx = npc.x - state.player.x;
            let dy = npc.y - state.player.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if(dist > this.spotRange(npc) + 45) return; // Don't draw if out of sight (or hidden in a forest)

            let nf = FACTIONS[npc.faction] || {};
            let band = BAND_KINDS[npc.band] || null;
            // A band travels in its own color and its own silhouette: a wolf pack doesn't look like bandits
            let nCol = band ? band.color : (npc.type === 'bandit' ? '#ff5a4a' : (nf.color || '#cccccc'));

            // Faction ring
            ctx.beginPath();
            ctx.ellipse(npc.x, npc.y + 22, 24, 9, 0, 0, Math.PI*2);
            ctx.strokeStyle = nCol; ctx.lineWidth = 3; ctx.globalAlpha = 0.75; ctx.stroke(); ctx.globalAlpha = 1;

            // A charge on top: one more red ring around the outside. A charge is now only
            // launched from within visible range, so this marker always arrives on time.
            if(npc.charging) {
                ctx.beginPath();
                ctx.ellipse(npc.x, npc.y + 22, 32, 13, 0, 0, Math.PI*2);
                ctx.strokeStyle = '#e0463a'; ctx.lineWidth = 2.5;
                ctx.globalAlpha = 0.5 + 0.35 * Math.abs(Math.sin(performance.now() / 260));
                ctx.stroke(); ctx.globalAlpha = 1;
            }

            // Bandits are on foot, nobles are mounted — the icon should make it obvious right away
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

            // Crown: king/vizier
            if(npc.type === 'king' || npc.type === 'vizier') {
                let cs = npc.type === 'king' ? 30 : 24;
                this.emoji(ctx, npc.type === 'king' ? '👑' : '🎖️', npc.x + 22, npc.y - 44 + cs*0.35, cs);
            }
            
            // The label used to be trimmed to the first word to keep the map readable, but
            // a band's name is a qualifier plus a noun and the first word is the throwaway
            // half: "Orman Haydutları" showed as "Orman", "Forest Bandits" as "Forest" (#94).
            // The full name is short enough in all three languages; the only thing worth
            // dropping is a lord's army suffix, which repeats on every lord on screen.
            let shortName = this.npcName(npc);
            if(npc.type === 'lord' || npc.type === 'king' || npc.type === 'vizier') {
                shortName = shortName.replace(T(' Ordusu'), '').replace(T(' Birliği'), '');
            }
            this.mapLabel(ctx, `${shortName} (${npc.size})`, npc.x, npc.y + 50, '#ffffff', nCol);
        });

        // Player
        // While captive, the only party moving on the map is the one holding you; you have
        // no separate group. The player icon + name + "Captive" text used to be drawn at the
        // same point as the captor's icon and label (overlapping text).
        let isPrisoner = !!state.player.prisoner;
        if(isPrisoner) {
            this.emoji(ctx, '⛓️', state.player.x - 30, state.player.y - 30, 30);
        } else {
            // Player base — a pulsing gold ring
            let pp = 1 + Math.sin(performance.now()/450) * 0.1;
            ctx.beginPath();
            ctx.ellipse(state.player.x, state.player.y + 28, 36*pp, 13*pp, 0, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(255,204,0,0.9)';
            ctx.lineWidth = 4; ctx.stroke();

            // If we have a horse, we appear mounted on the map (like in Warband)
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

        // Route (#35): a thin flowing dash + a small filled target marker. The arrowhead was
        // removed — the line itself already told the direction. A drag route is pale and white,
        // a confirmed route is gold: which one is active is clear at a glance.
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

            // Target marker: screen-sized (doesn't shrink away when zoomed out) small filled dot + ring
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

        // Location markers learned from lords
        Nobles.drawMarkers(ctx);

        ctx.restore();
    },

    handleMapHover(e) {
        if(Battle.active || TournamentMinigame.active) return;
        // The screen -> world transform is in mapPos; the tooltip used to look half a screen away from the cursor.
        let m = this.mapPos(e), mx = m.x, my = m.y;
        if(this.dragTarget) {                       // a temporary target while dragging (#35)
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
            if(this.dist(loc, {x:mx,y:my}) < 36) { found = { name: T(loc.name), sub: this.locTipHtml(loc) }; break; }
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
                if(site.kind === 'lair' && !site.seen) continue;
                if(this.dist(site, {x:mx,y:my}) < 30) {
                    found = { name: this.SITE_KINDS[site.kind].icon + ' ' + T(site.name), sub: this.siteTipHtml(site) };
                    break;
                }
            }
        }

        if(found) {
            // `rect` wasn't defined in this body: every time the cursor reached a settlement it
            // threw a ReferenceError and the tooltip never opened. The measurement goes through the same gate as mapPos.
            let rect = this.mapCanvas.getBoundingClientRect();
            tooltip.innerHTML = `<strong>${T(found.name)}</strong><br>${found.sub}`;
            tooltip.style.left = '0px'; tooltip.style.top = '0px';
            tooltip.classList.remove('hidden');
            // Measure and pull it inward: a narrow screen doesn't have room for a tooltip to the right of a finger (#65)
            let tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
            tooltip.style.left = Math.max(4, Math.min(e.clientX - rect.left + 15, rect.width - tw - 4)) + 'px';
            tooltip.style.top  = Math.max(4, Math.min(e.clientY - rect.top + 15, rect.height - th - 4)) + 'px';
            this.mapCanvas.style.cursor = 'pointer';
        } else {
            tooltip.classList.add('hidden');
            this.mapCanvas.style.cursor = 'crosshair';
        }
    },

    // Screen -> world. The same transform used to live in three places (click, tooltip, drag).
    mapPos(e) {
        let rect = this.mapCanvas.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) - rect.width/2) / this.camera.zoom + this.camera.x,
            y: ((e.clientY - rect.top) - rect.height/2) / this.camera.zoom + this.camera.y
        };
    },

    // The percent sign sits before the number in Turkish (%50), and after it
    // in English and Indonesian (50%). The dictionary handles percentages that
    // go through a `T` template; this gate is for numbers embedded in code that don't.
    pct(n, signed = false) {
        let v = Math.round(n * 10) / 10, sign = signed && v > 0 ? '+' : v < 0 ? '−' : '';
        v = Math.abs(v);
        return I18N.lang === 'tr' ? `${sign}%${v}` : `${sign}${v}%`;
    },

    // --- LANGUAGE ---
    // On first launch a screen asks (the browser language is suggested); the choice
    // is stored in localStorage and never asked again. Afterward, the flag row on the
    // start screen and ⚙️ Settings both go through the same `setLang` gate.
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

    // If lite mode turned on by itself, the player is told once: graphics quietly
    // scaled down raises the question "why does the game look like this". The answer is in ⚙️ Settings.
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

    // #ver-tag is born empty (index.html), so I18N.prime() never catches it — it has no
    // _trKey for applyDom to touch on a language change. So it's manually redrawn on
    // boot and on every language switch.
    renderVerTag() {
        let vt = document.getElementById('ver-tag');
        if(vt) vt.textContent = T`WebBand ${VERSION.no} · ${T(VERSION.name)} · ${VERSION.date}`;
    },

    // Install (#93). Chrome and the desktop browsers won't install on their own: they
    // fire `beforeinstallprompt`, and whoever calls `preventDefault()` on it owns the
    // moment the prompt appears. The event is stashed below and spent here — it is
    // single-use, so the button hides itself either way.
    // Safari fires nothing, on iPhone or on Mac: there the only route is the Share
    // sheet's "Add to Home Screen", which is why the button stays hidden rather than
    // opening a dialog that would lead nowhere.
    install() {
        const e = this.deferredInstall;
        if(!e) return;
        this.deferredInstall = null;
        this.showInstallBtn();
        e.prompt();
    },

    showInstallBtn() {
        const b = document.getElementById('install-btn');
        if(b) b.classList.toggle('hidden', !this.deferredInstall);
    },

    setLang(lang) {
        I18N.set(lang);
        const ask = document.getElementById('lang-ask');
        if(ask && !ask.classList.contains('hidden')) { ask.classList.add('hidden'); this.liteNotice(); }
        this.renderLangRow('lang-row');
        this.renderLangRow('lang-ask-row');
        this.renderVerTag();
        I18N.applyDom(document.body);
        if(document.getElementById('settings-panel')) return this.showSettings();
        // While in-game, the open screen rebuilds its own text
        const open = document.querySelector('.view.active');
        if(open && document.getElementById('main-ui').classList.contains('active')) {
            this.showScreen(open.id.replace('-view', ''));
            this.updateTopBar();
        }
    },

    // --- TOUCH (#65) ---
    // Mouse and finger don't keep separate code paths; both go through here.
    //   mouse  : move = tooltip, drag while pressed = target marker, click = target
    //   finger : one finger = pan the map, two fingers = zoom,
    //            short tap = target, long tap (450ms) = tooltip
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
        // A second finger means zoom: a half-finished target drag gets cancelled
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
            this.handleMapHover(e);                       // the marker moves under the finger
        } else {
            // Panning only moves the offset (same gate as WASD), the ±9000 limit is in update
            this.camera.offsetX -= dx / this.camera.zoom;
            this.camera.offsetY -= dy / this.camera.zoom;
        }
    },

    onMapUp(e) {
        // Mouse: there is no separate 'click' listener (#65) — pointerup carries the
        // click. endTargetDrag sets suppressClick on a real drag and handleMapClick eats
        // it, so a drag assigns one target, not two. (Restored: #83 reverted this.)
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
        if(p.moved > 10 || this._ptr.size) return;        // panning/zooming doesn't set a target
        if(performance.now() - p.t > 450) return this.handleMapHover(e);   // long tap: tooltip
        document.getElementById('map-tooltip').classList.add('hidden');
        this.handleMapClick(e);
    },

    // Two virtual sticks in battle (#88): the left stick turns the finger's direction into
    // WASD (the battle engine still sees a single input path), the right stick aims the
    // sword — you hit where you drag it, and it swings when you lift your finger. If the
    // right stick isn't touched, aim still comes from the movement direction like before.
    initTouchUI() {
        let st = document.getElementById('tstick');
        if(!st) return;
        // The stick machinery lives in one place: `onDir(d)` gives a direction (null when
        // released), `onEnd` runs when the finger lifts.
        const mount = (el, knob, onDir, onEnd) => {
            const R = 42;
            let id = null, cx = 0, cy = 0;
            const set = (dx, dy) => {
                let len = Math.hypot(dx, dy);
                if(len < 12) {
                    onDir(null);
                    knob.style.transform = '';
                    return;                               // the direction is kept: aim shouldn't spin back on release
                }
                let nx = dx / len, ny = dy / len;
                onDir({ x: nx, y: ny });
                let c = Math.min(1, len / R);
                knob.style.transform = `translate(${(nx * R * c).toFixed(1)}px, ${(ny * R * c).toFixed(1)}px)`;
            };
            el.addEventListener('pointerdown', e => {
                e.preventDefault(); id = e.pointerId;
                try { el.setPointerCapture(id); } catch(_) {}
                let r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
                set(e.clientX - cx, e.clientY - cy);
            });
            el.addEventListener('pointermove', e => { if(e.pointerId === id) set(e.clientX - cx, e.clientY - cy); });
            const off = e => { if(e.pointerId === id) { id = null; set(0, 0); if(onEnd) onEnd(); } };
            el.addEventListener('pointerup', off);
            el.addEventListener('pointercancel', off);
        };

        mount(st, document.getElementById('tstick-knob'), d => {
            if(!d) return ['w', 'a', 's', 'd'].forEach(k => Input.keys[k] = false);
            Input.stick = d;
            Input.keys['a'] = d.x < -0.38; Input.keys['d'] = d.x > 0.38;
            Input.keys['w'] = d.y < -0.38; Input.keys['s'] = d.y > 0.38;
        });

        // Right stick: aim while dragging, swing on release. A tap-and-release (no drag)
        // strikes toward the last aim direction — so the old ⚔️ button's job still stands.
        let ast = document.getElementById('tastick');
        if(ast) mount(ast, document.getElementById('tastick-knob'),
            d => { if(d) Input.aim = d; },
            () => Battle.playerAttack());

        let bl = document.getElementById('tb-block');
        bl.addEventListener('pointerdown', e => { e.preventDefault(); Battle.blockHeld = true; bl.classList.add('on'); });
        const blOff = () => { Battle.blockHeld = false; bl.classList.remove('on'); };
        bl.addEventListener('pointerup', blOff);
        bl.addEventListener('pointercancel', blOff);

        // A tooltip opens on tap: there's no `:hover` for a finger (#65)
        document.addEventListener('pointerdown', e => {
            if(e.pointerType === 'mouse') return;
            let c = e.target.closest && e.target.closest('.tooltip-container');
            document.querySelectorAll('.tooltip-container.tip-open').forEach(o => { if(o !== c) o.classList.remove('tip-open'); });
            if(!c) return;
            c.classList.toggle('tip-open');
            if(c.classList.contains('tip-open')) this.clampTip(c);
        });
    },

    // Battle orders (1/2/3) by finger: the listener is already on the keyboard, we hand the event to it
    touchCommand(key) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    },

    // --- DRAGGING THE TARGET MARKER (#35) ---
    // The marker's radius is screen-sized (16px), so it can still be grabbed when zoomed out.
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
        if(!moved) return;                        // dropped in place: the route stays the same
        this.setTarget(this.mapPos(e));
        this.suppressClick = true;                // the click that follows mouseup shouldn't set a new target
    },

    // Click and drag use the same target selection: locks onto a settlement/NPC if one is nearby.
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
            if(site.kind === 'lair' && !site.seen) continue;
            if(this.dist(site, m) < 30) { state.player.targetLocation = site; state.player.status = 'moving'; return; }
        }
        state.player.targetLocation = { x: m.x, y: m.y, name: T('Hedef Bölge'), type: null };
        state.player.status = 'moving';
    },

    handleMapClick(e) {
        if(Battle.active || TournamentMinigame.active) return;   // map input is ignored while a battle is open (#42)
        // Raiding, like captivity, holds you in place: you can't walk while emptying the storehouse (#49)
        if(state.player.status === 'raiding' || state.player.status === 'prisoner') return;
        if(this.suppressClick) { this.suppressClick = false; return; }
        this.setTarget(this.mapPos(e));   // the settlement / NPC / empty-area distinction is in setTarget
    },

    // --- SETTLEMENT ---
    enterLocation(loc) {
        if(loc.type === 'site') return this.enterSite(loc);   // discovery site (#58): a modal, not a screen
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('settlement-view').classList.add('active');
        document.getElementById('settlement-name').innerText = T(loc.name) + (loc.type==='city'?T(' (Şehir)'):loc.type==='castle'?T(' (Kale)'):T(' (Köy)'));
        let ac = document.getElementById('settlement-actions');
        ac.innerHTML = '';

        // Gates are only closed to a kingdom you're at war with (like in Warband);
        // the market and tavern are open to you in a neighbor's city at peace.
        let isEnemy = this.atWar(this.playerFaction(), loc.faction);

        this.noteLoc(loc);   // sees everything that comes through the gate (#74)
        Quests.emit('entered_location', { locId: loc.id, loc });

        if(isEnemy && (loc.type==='city'||loc.type==='castle')) {
            // No civilian services at an enemy's gate: market, tavern, hall, volunteers — all closed.
            // If you're independent, the same siege founds your own kingdom, so there's no separate button.
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
                // Enterprise: the answer to day 20's "what do I do with this money" (#53 item 1.6)
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
                // An enemy village gives you neither troops nor supplies — but it has a word or two to say (#50)
                this.addBtn(ac, T('🧓 Köy Yaşlısıyla Konuş'), () => this.talkToElder(loc));
                // It won't even sell cheese to the man it curses: a village you raided offers no service (#50)
                if(!isEnemy && !this.raidedRecently(loc)) {
                    if(loc.volunteersAvailable > 0) {
                        this.addBtn(ac, T('🪖 Gönüllü Topla'), () => this.recruitVolunteers(loc));
                    }
                    this.addBtn(ac, T('🛒 Erzak Al'), () => this.openMarket(loc));
                }
                this.addBtn(ac, T('🔥 Köyü Yağmala'), () => this.raidVillage(loc));
                // 300 renown: the right to rule — tribute without a siege (#69)
                if(!state.player.vassalOf && loc.owner !== 'player') {
                    this.addBtn(ac, loc.tributeTo === 'player'
                        ? T`👑 Haraç (+${this.tributeOf(loc)} dinar/gün)` : T('👑 Haraca Bağla'),
                        () => this.tributeVillage(loc));
                }
            }
        }
        if(!isEnemy && !state.player.vassalOf && (loc.type==='city'||loc.type==='castle')) {
            this.addBtn(ac, T('⚔️ Kuşat! (Kendi Krallığını Kur)'), () => this.besiegeLocation(loc, true));
        }
        this.addBtn(ac, T('🚪 Ayrıl'), () => this.showScreen('map'));
        this.renderScene(loc);   // buttons are ready: the scene is built on top of them (#60)
    },

    // ---------- SETTLEMENT SCENE (#60) ----------
    // The scene has no separate coordinate table: the settlement screen's own buttons
    // are drawn as buildings. Since addBtn is the single gate, a button added tomorrow
    // becomes a structure in the scene by itself — no need to keep two lists in sync.
    // The building type is picked from the button's icon; an unrecognized icon falls back to a house.
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
    // Deterministic randomness derived from the settlement's id: the same city always gets the same silhouette
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
            if(i === this._sceneHover) return;                 // only redraw on a change
            this._sceneHover = i;
            cv.style.cursor = i >= 0 ? 'pointer' : 'default';
            this.drawScene(cv.getContext('2d'), loc, btns, i);
        };
        cv.onmouseleave = () => { this._sceneHover = -1; this.drawScene(cv.getContext('2d'), loc, btns, -1); };
        cv.onclick = () => {
            let h = this.sceneHot[this._sceneHover];
            if(h) h.btn.onclick();                             // the button's own action — no second table
        };
    },

    drawScene(ctx, loc, btns, hover) {
        let W = this.SCENE_W, H = this.SCENE_H, R = i => this.sceneRnd(loc, i);
        let hour = state.time.hour, night = hour < 6 || hour >= 20, dusk = (hour >= 18 && hour < 20) || (hour >= 6 && hour < 8);
        let col = (FACTIONS[loc.faction] || {}).color || '#ffcc00';
        let ground = H * 0.66;
        ctx.clearRect(0, 0, W, H);

        // Sky — by time of day
        let sky = ctx.createLinearGradient(0, 0, 0, ground);
        if(night) { sky.addColorStop(0, '#0b1027'); sky.addColorStop(1, '#2b3355'); }
        else if(dusk) { sky.addColorStop(0, '#38406e'); sky.addColorStop(0.6, '#c9743c'); sky.addColorStop(1, '#e8b473'); }
        else { sky.addColorStop(0, '#6ea6dd'); sky.addColorStop(1, '#cfe0ea'); }
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, ground + 2);
        if(night) {                                            // stars
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            for(let i = 0; i < 40; i++) ctx.fillRect(R(i) * W, R(i + 100) * ground * 0.7, 1.6, 1.6);
        }
        ctx.fillStyle = night ? 'rgba(226,232,255,0.9)' : dusk ? 'rgba(255,196,120,0.95)' : 'rgba(255,246,214,0.95)';
        ctx.beginPath(); ctx.arc(90 + R(5) * (W - 180), 46 + R(6) * 24, night ? 16 : 22, 0, 7); ctx.fill();

        // Distant hills (two layers)
        for(let layer = 0; layer < 2; layer++) {
            ctx.fillStyle = night ? (layer ? '#1b2138' : '#141a2e') : (layer ? '#8fa07d' : '#6f8064');
            ctx.beginPath(); ctx.moveTo(0, ground);
            for(let x = 0; x <= W; x += 60) {
                let k = layer * 50 + x / 60;
                ctx.lineTo(x, ground - 30 - layer * 18 - R(k) * 45);
            }
            ctx.lineTo(W, ground); ctx.closePath(); ctx.fill();
        }

        // Backdrop: city walls, a crenellated castle wall, a village fence and fields
        this.drawBackdrop(ctx, loc, ground, night, col, R);

        // Ground
        let gr = ctx.createLinearGradient(0, ground, 0, H);
        gr.addColorStop(0, night ? '#2a2a22' : '#6b6a4a'); gr.addColorStop(1, night ? '#171712' : '#4a4a33');
        ctx.fillStyle = gr; ctx.fillRect(0, ground, W, H - ground);
        ctx.fillStyle = night ? 'rgba(120,110,80,0.25)' : 'rgba(190,175,130,0.45)';   // dirt road
        ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W, H); ctx.lineTo(W, H - 34); ctx.lineTo(0, H - 22); ctx.fill();

        // Buildings: two rows (odd indices in back, even in front)
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

        // Tooltip: the name of the building under the cursor
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
            // Field strips + fence
            ctx.fillStyle = night ? '#3a3a26' : '#9a8f4e';
            for(let i = 0; i < 5; i++) ctx.fillRect(i * 190 + R(i) * 20, ground - 26, 150, 22);
            ctx.strokeStyle = night ? '#3d3327' : '#7a6042'; ctx.lineWidth = 3;
            for(let x = 10; x < W; x += 34) {
                ctx.beginPath(); ctx.moveTo(x, ground - 4); ctx.lineTo(x, ground - 26); ctx.stroke();
            }
            ctx.beginPath(); ctx.moveTo(0, ground - 18); ctx.lineTo(W, ground - 18); ctx.stroke();
            return;
        }
        // Wall: long and crenellated in a city, thicker + a keep behind it in a castle
        if(loc.type === 'castle') {
            let kx = 60 + R(9) * (W - 320), kw = 190, kh = 165;
            ctx.fillStyle = night ? '#2e2e38' : '#7d7768';
            ctx.fillRect(kx, wallTop - kh + 40, kw, kh);
            ctx.fillStyle = night ? '#232630' : '#6b6558';
            for(let i = 0; i < 5; i++) ctx.fillRect(kx + i * 40, wallTop - kh + 26, 26, 16);   // battlement
            ctx.fillStyle = col;                                                              // banner
            ctx.fillRect(kx + kw / 2 - 1, wallTop - kh - 26, 2, 30);
            ctx.beginPath(); ctx.moveTo(kx + kw / 2 + 1, wallTop - kh - 24);
            ctx.lineTo(kx + kw / 2 + 36, wallTop - kh - 16); ctx.lineTo(kx + kw / 2 + 1, wallTop - kh - 8); ctx.fill();
        } else {
            // City silhouette: rooftops in the background, towers (count and position fixed per settlement)
            let houses = 7 + Math.floor(R(3) * 6);
            for(let i = 0; i < houses; i++) {
                let x = R(i + 30) * (W - 80), w = 54 + R(i + 60) * 46, h = 52 + R(i + 90) * 60;
                let top = wallTop + 14 - h;                      // rooftops show above the wall
                ctx.fillStyle = night ? '#22262f' : '#5f5c50';
                ctx.fillRect(x, top, w, h);
                ctx.fillStyle = night ? '#15181f' : '#47372c';
                ctx.beginPath(); ctx.moveTo(x - 6, top); ctx.lineTo(x + w / 2, top - 26); ctx.lineTo(x + w + 6, top); ctx.fill();
                if(night) {                                     // hearth light in the windows
                    ctx.fillStyle = 'rgba(255,196,90,0.75)';
                    ctx.fillRect(x + w * 0.3, top + 16, 7, 9);
                    if(R(i + 120) > 0.5) ctx.fillRect(x + w * 0.62, top + 16, 7, 9);
                }
            }
        }
        // Wall + gate
        ctx.fillStyle = stone; ctx.fillRect(0, wallTop, W, 92);
        ctx.fillStyle = night ? '#2c2c34' : '#6f6a5e';
        for(let x = 4; x < W; x += 34) ctx.fillRect(x, wallTop - 12, 20, 14);      // battlements
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, wallTop + 72, W, 20);  // shadow band
        let gx = 120 + R(7) * (W - 320);
        ctx.fillStyle = night ? '#16161c' : '#3b2f22';
        ctx.beginPath(); ctx.moveTo(gx, ground); ctx.lineTo(gx, wallTop + 44);
        ctx.arc(gx + 28, wallTop + 44, 28, Math.PI, 0); ctx.lineTo(gx + 56, ground); ctx.fill();
        ctx.fillStyle = col; ctx.fillRect(gx - 26, wallTop - 10, 3, 40);           // a banner beside the gate
        ctx.beginPath(); ctx.moveTo(gx - 23, wallTop - 8); ctx.lineTo(gx - 2, wallTop - 1); ctx.lineTo(gx - 23, wallTop + 6); ctx.fill();
    },

    // A single drawing primitive: the kind gives the silhouette's shape, the icon gives the sign.
    drawStructure(ctx, kind, x, y, w, h, col, icon, night, dim, hot) {
        ctx.save();
        if(hot) { ctx.shadowColor = 'rgba(255,204,0,0.9)'; ctx.shadowBlur = 22; }
        let wood = night ? '#2f2418' : '#6b4f31', wall = night ? '#39332a' : `rgb(${Math.round(168*dim)},${Math.round(150*dim)},${Math.round(120*dim)})`;
        let roof = night ? '#241d16' : `rgb(${Math.round(122*dim)},${Math.round(70*dim)},${Math.round(48*dim)})`;
        let lit = 'rgba(255,196,90,0.85)';
        ctx.fillStyle = 'rgba(0,0,0,0.28)';                       // ground shadow
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
            for(let i = 0; i < 5; i++) {                          // striped awning
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
            ctx.strokeStyle = wood; ctx.lineWidth = 4;            // palisade stakes
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
            // house / shop / barn / coop — body + roof, the difference is in the chimney and door
            let bh = kind === 'barn' ? h * 0.68 : h * 0.62, by = y + h - bh;
            ctx.fillStyle = wall; ctx.fillRect(x + 6, by, w - 12, bh);
            ctx.fillStyle = roof;
            ctx.beginPath(); ctx.moveTo(x - 2, by); ctx.lineTo(x + w / 2, by - h * 0.34); ctx.lineTo(x + w + 2, by); ctx.fill();
            ctx.fillStyle = night ? '#241d16' : '#4a3524';        // door
            let dw = kind === 'barn' ? w * 0.36 : w * 0.2;
            ctx.fillRect(x + w / 2 - dw / 2, y + h - bh * 0.62, dw, bh * 0.62);
            ctx.fillStyle = night ? lit : 'rgba(70,90,110,0.7)';  // window
            ctx.fillRect(x + 14, by + bh * 0.22, 13, 12);
            ctx.fillRect(x + w - 27, by + bh * 0.22, 13, 12);
            if(kind === 'shop') {                                  // workshop chimney + smoke
                ctx.fillStyle = roof; ctx.fillRect(x + w * 0.72, by - h * 0.28, 12, h * 0.3);
                ctx.fillStyle = 'rgba(200,200,200,0.35)';
                for(let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + w * 0.78, by - h * 0.34 - i * 11, 5 + i * 2, 0, 7); ctx.fill(); }
            }
            if(kind === 'coop') { ctx.fillStyle = wood; for(let i = 0; i < 5; i++) ctx.fillRect(x + 4 + i * (w - 8) / 5, y + h - 14, 3, 14); }
        }

        // Sign: the button's icon sits above the building, which door it is is obvious at a glance
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

    // --- INTERIOR BACKDROP (#60) ---
    // Stepping into a castle/tavern puts that space behind the modal. Drawn once, cached
    // as a data URL; `showModal`'s third argument (bgImage) was already ready for it.
    BG_DRAW: {
        hall:      ['drawHallBg', 640, 380],
        tavern:    ['drawTavernBg', 640, 380],
        armory:    ['drawArmoryBg', 900, 560],     // character screen (#61)
        camp:      ['drawCampBg', 900, 560],       // party screen
        storage:   ['drawStorageBg', 900, 560],    // inventory
        parchment: ['drawParchmentBg', 900, 560]   // quests
    },
    sceneBg(kind) {
        // Lite mode: each screen's background is drawn once and encoded to JPEG (measured:
        // 8-12ms + 27-37KB per screen). On a phone this is a noticeable stutter every time
        // the screen opens. Returning null makes callers use the overlay on its own.
        if(this.lite()) return null;
        this._sceneBg = this._sceneBg || {};
        if(this._sceneBg[kind]) return this._sceneBg[kind];
        let [fn, W, H] = this.BG_DRAW[kind] || this.BG_DRAW.tavern;
        let cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        this[fn](cv.getContext('2d'), W, H);
        return (this._sceneBg[kind] = cv.toDataURL('image/jpeg', 0.82));
    },
    // Themed background for menu screens (#61). Single gate `showScreen`; set once per
    // screen, CSS after that. The overlay stays dark — the background doesn't compete with the text.
    // Overlay darkness depends on the screen: parchment is light-colored so a thinner overlay
    // suffices, dark drawings (armory, camp, storage) need a thicker overlay for the text underneath.
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
    // Character: armory wall — stone, a hanging shield, crossed swords, a helmet, a banner
    drawArmoryBg(ctx, W, H) {
        let g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#33343a'); g.addColorStop(1, '#1e1f24');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        for(let y = 0, r = 0; y < H; y += 34, r++)
            for(let x = (r % 2 ? -34 : 0); x < W; x += 68) {
                ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, 68, 34);
            }
        // Crossed swords
        ctx.save(); ctx.translate(W * 0.5, H * 0.42);
        [-0.5, 0.5].forEach(a => {
            ctx.save(); ctx.rotate(a);
            ctx.fillStyle = '#8d939c'; ctx.fillRect(-9, -190, 18, 300);
            ctx.fillStyle = '#c9ced6'; ctx.fillRect(-9, -190, 6, 300);
            ctx.fillStyle = '#6a4a24'; ctx.fillRect(-40, 105, 80, 14); ctx.fillRect(-8, 119, 16, 56);
            ctx.restore();
        });
        ctx.restore();
        // Shield
        let sx = W * 0.5, sy = H * 0.5;
        ctx.fillStyle = '#5c2630';
        ctx.beginPath(); ctx.moveTo(sx - 78, sy - 90); ctx.lineTo(sx + 78, sy - 90);
        ctx.lineTo(sx + 78, sy + 20); ctx.quadraticCurveTo(sx, sy + 130, sx - 78, sy + 20); ctx.fill();
        ctx.strokeStyle = '#8a7130'; ctx.lineWidth = 7; ctx.stroke();
        ctx.fillStyle = 'rgba(212,175,55,0.55)'; ctx.beginPath(); ctx.arc(sx, sy - 10, 26, 0, 7); ctx.fill();
        // Side banners
        [W * 0.14, W * 0.86].forEach((bx, i) => {
            ctx.fillStyle = i ? '#25406f' : '#4a2a5e';
            ctx.beginPath(); ctx.moveTo(bx - 44, 0); ctx.lineTo(bx + 44, 0);
            ctx.lineTo(bx + 44, H * 0.6); ctx.lineTo(bx, H * 0.55); ctx.lineTo(bx - 44, H * 0.6); ctx.fill();
        });
        // Helmet shelf
        ctx.fillStyle = '#3a2b1a'; ctx.fillRect(0, H - 96, W, 16);
        [W * 0.22, W * 0.78].forEach(hx => {
            ctx.fillStyle = '#9aa1aa';
            ctx.beginPath(); ctx.arc(hx, H - 122, 30, Math.PI, 0); ctx.fill();
            ctx.fillRect(hx - 30, H - 122, 60, 26);
            ctx.fillStyle = '#20242a'; ctx.fillRect(hx - 5, H - 130, 10, 34);
        });
        this.bgVignette(ctx, W, H);
    },
    // Party: night camp — tents, a fire, a bundle of spears
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
        ctx.fillStyle = '#1b202c';                          // hilltop line
        ctx.beginPath(); ctx.moveTo(0, hz);
        for(let x = 0; x <= W; x += 60) ctx.lineTo(x, hz - 30 - 26 * Math.sin(x / 130));
        ctx.lineTo(W, hz); ctx.fill();
        let fg = ctx.createLinearGradient(0, hz, 0, H);
        fg.addColorStop(0, '#33301f'); fg.addColorStop(1, '#16150f');
        ctx.fillStyle = fg; ctx.fillRect(0, hz, W, H - hz);
        // Tents
        [[W * 0.18, H * 0.82, 130], [W * 0.82, H * 0.78, 110], [W * 0.5, H * 0.7, 90]].forEach(([tx, ty, tw]) => {
            ctx.fillStyle = '#d9cdb4';
            ctx.beginPath(); ctx.moveTo(tx, ty - tw); ctx.lineTo(tx + tw * 0.72, ty); ctx.lineTo(tx - tw * 0.72, ty); ctx.fill();
            ctx.fillStyle = '#3a2a20';
            ctx.beginPath(); ctx.moveTo(tx, ty - tw * 0.55); ctx.lineTo(tx + tw * 0.2, ty); ctx.lineTo(tx - tw * 0.2, ty); ctx.fill();
        });
        // Fire
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
        // Bundle of spears
        ctx.strokeStyle = '#5b4429'; ctx.lineWidth = 5;
        [-0.18, 0, 0.18].forEach(a => {
            ctx.save(); ctx.translate(W * 0.66, H); ctx.rotate(a);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -230); ctx.stroke(); ctx.restore();
        });
        this.bgVignette(ctx, W, H);
    },
    // Inventory: storehouse — shelves, a chest, sacks, a hanging rope
    drawStorageBg(ctx, W, H) {
        let g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#42301d'); g.addColorStop(1, '#241a10');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        for(let x = 0; x < W; x += 46) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x, 0, 3, H); }
        for(let y = H * 0.28; y < H; y += H * 0.34) {        // shelves
            ctx.fillStyle = '#6b4a28'; ctx.fillRect(0, y, W, 18);
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, y + 18, W, 12);
        }
        // Chests and sacks
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
        // Hanging rope and lantern
        ctx.strokeStyle = '#3a2b1a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(W * 0.88, 0); ctx.lineTo(W * 0.88, 90); ctx.stroke();
        let lg = ctx.createRadialGradient(W * 0.88, 106, 4, W * 0.88, 106, 90);
        lg.addColorStop(0, 'rgba(255,215,130,0.9)'); lg.addColorStop(1, 'rgba(255,180,60,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(W * 0.88, 106, 90, 0, 7); ctx.fill();
        this.bgVignette(ctx, W, H);
    },
    // Quests: parchment — fibers, a burnt edge, a seal
    drawParchmentBg(ctx, W, H) {
        let g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#d9c391'); g.addColorStop(0.5, '#c9b07b'); g.addColorStop(1, '#a98f5d');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        for(let i = 0; i < 220; i++) {                       // fiber texture
            let r = ((i * 131) % 9973) / 9973, r2 = ((i * 613) % 9967) / 9967;
            ctx.globalAlpha = 0.05 + r2 * 0.08;
            ctx.fillStyle = i % 3 ? '#8a6f42' : '#f0e0b8';
            ctx.fillRect(r * W, r2 * H, 30 + r2 * 90, 2);
        }
        ctx.globalAlpha = 1;
        for(let y = H * 0.16; y < H * 0.9; y += 46) {        // faded lines
            ctx.fillStyle = 'rgba(90,70,40,0.13)'; ctx.fillRect(W * 0.1, y, W * 0.8, 3);
        }
        // Burnt edge
        let e = ctx.createLinearGradient(0, 0, 0, H);
        e.addColorStop(0, 'rgba(70,45,15,0.55)'); e.addColorStop(0.12, 'rgba(70,45,15,0)');
        e.addColorStop(0.88, 'rgba(70,45,15,0)'); e.addColorStop(1, 'rgba(70,45,15,0.55)');
        ctx.fillStyle = e; ctx.fillRect(0, 0, W, H);
        let e2 = ctx.createLinearGradient(0, 0, W, 0);
        e2.addColorStop(0, 'rgba(70,45,15,0.5)'); e2.addColorStop(0.1, 'rgba(70,45,15,0)');
        e2.addColorStop(0.9, 'rgba(70,45,15,0)'); e2.addColorStop(1, 'rgba(70,45,15,0.5)');
        ctx.fillStyle = e2; ctx.fillRect(0, 0, W, H);
        // Wax seal
        ctx.fillStyle = '#8c2230';
        ctx.beginPath(); ctx.arc(W * 0.8, H * 0.82, 52, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.arc(W * 0.8, H * 0.82, 32, 0, 7); ctx.fill();
        this.bgVignette(ctx, W, H);
    },
    // Tavern: wooden wall, beams, hearth, barrels, a long table, hanging lanterns
    drawTavernBg(ctx, W, H) {
        let floor = H * 0.66;
        let g = ctx.createLinearGradient(0, 0, 0, floor);
        g.addColorStop(0, '#3a2a1c'); g.addColorStop(1, '#5a4028');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, floor);
        for(let y = 8; y < floor; y += 22) {          // wall planks
            ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, y, W, 2);
        }
        for(let x = 60; x < W; x += 150) {            // vertical beams
            ctx.fillStyle = '#2e2013'; ctx.fillRect(x, 0, 18, floor);
            ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x, 0, 4, floor);
        }
        // Hearth — the scene's light source
        let fx = W * 0.5, fy = floor;
        ctx.fillStyle = '#3b3630'; ctx.fillRect(fx - 70, floor - 130, 140, 130);
        ctx.fillStyle = '#171310';
        ctx.beginPath(); ctx.moveTo(fx - 46, fy); ctx.lineTo(fx - 46, fy - 62);
        ctx.quadraticCurveTo(fx, fy - 108, fx + 46, fy - 62); ctx.lineTo(fx + 46, fy); ctx.fill();
        let fl = ctx.createRadialGradient(fx, fy - 26, 4, fx, fy - 26, 90);
        fl.addColorStop(0, 'rgba(255,190,80,0.95)'); fl.addColorStop(0.4, 'rgba(230,120,30,0.55)');
        fl.addColorStop(1, 'rgba(230,120,30,0)');
        ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(fx, fy - 26, 90, 0, 7); ctx.fill();
        // Ground
        let fg = ctx.createLinearGradient(0, floor, 0, H);
        fg.addColorStop(0, '#4a3826'); fg.addColorStop(1, '#2a1f15');
        ctx.fillStyle = fg; ctx.fillRect(0, floor, W, H - floor);
        for(let y = floor + 10; y < H; y += 18) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, y, W, 2); }
        // Barrels
        [[70, floor + 26], [W - 78, floor + 20]].forEach(([bx, by]) => {
            ctx.fillStyle = '#6b4a28';
            ctx.beginPath(); ctx.ellipse(bx, by, 30, 40, 0, 0, 7); ctx.fill();
            ctx.strokeStyle = '#39281a'; ctx.lineWidth = 4;
            [-16, 0, 16].forEach(o => { ctx.beginPath(); ctx.moveTo(bx - 28, by + o); ctx.lineTo(bx + 28, by + o); ctx.stroke(); });
        });
        // Long table + stools
        ctx.fillStyle = '#7a5630'; ctx.fillRect(W * 0.28, H - 74, W * 0.44, 16);
        ctx.fillStyle = '#4c3320';
        ctx.fillRect(W * 0.31, H - 58, 12, 44); ctx.fillRect(W * 0.66, H - 58, 12, 44);
        [-70, 70].forEach(o => { ctx.fillStyle = '#5c3f26'; ctx.fillRect(W / 2 + o - 16, H - 44, 32, 10); });
        // Hanging lanterns
        [W * 0.22, W * 0.78].forEach(lx => {
            ctx.strokeStyle = '#241a10'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, 60); ctx.stroke();
            let lg = ctx.createRadialGradient(lx, 68, 2, lx, 68, 46);
            lg.addColorStop(0, 'rgba(255,215,130,0.9)'); lg.addColorStop(1, 'rgba(255,180,60,0)');
            ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, 68, 46, 0, 7); ctx.fill();
        });
        this.bgVignette(ctx, W, H);
    },
    // Lords' hall: stone wall, columns, banners, torches, a throne
    drawHallBg(ctx, W, H) {
        let floor = H * 0.7;
        let g = ctx.createLinearGradient(0, 0, 0, floor);
        g.addColorStop(0, '#2b2c31'); g.addColorStop(1, '#4a4b52');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, floor);
        for(let y = 0, r = 0; y < floor; y += 26, r++) {   // stone courses
            for(let x = (r % 2 ? -26 : 0); x < W; x += 52) {
                ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.5;
                ctx.strokeRect(x, y, 52, 26);
            }
        }
        // Columns
        [W * 0.12, W * 0.88].forEach(px => {
            ctx.fillStyle = '#5b5c64'; ctx.fillRect(px - 26, 0, 52, floor);
            ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(px - 26, 0, 12, floor);
            ctx.fillStyle = '#6a6b74'; ctx.fillRect(px - 34, floor - 22, 68, 22);
        });
        // Banners
        [W * 0.3, W * 0.7].forEach((bx, i) => {
            ctx.fillStyle = i ? '#7a2230' : '#243f7a';
            ctx.beginPath(); ctx.moveTo(bx - 30, 20); ctx.lineTo(bx + 30, 20);
            ctx.lineTo(bx + 30, 150); ctx.lineTo(bx, 132); ctx.lineTo(bx - 30, 150); ctx.fill();
            ctx.fillStyle = 'rgba(255,204,0,0.5)';
            ctx.beginPath(); ctx.arc(bx, 74, 15, 0, 7); ctx.fill();
        });
        // Throne + red carpet
        ctx.fillStyle = '#3a2b1a'; ctx.fillRect(W / 2 - 34, floor - 96, 68, 96);
        ctx.fillRect(W / 2 - 42, floor - 100, 84, 12);
        ctx.fillStyle = '#8a2b34'; ctx.fillRect(W / 2 - 26, floor - 84, 52, 60);
        // Ground
        let fg = ctx.createLinearGradient(0, floor, 0, H);
        fg.addColorStop(0, '#43444b'); fg.addColorStop(1, '#25262b');
        ctx.fillStyle = fg; ctx.fillRect(0, floor, W, H - floor);
        ctx.fillStyle = '#7a2230';
        ctx.beginPath(); ctx.moveTo(W / 2 - 46, floor); ctx.lineTo(W / 2 + 46, floor);
        ctx.lineTo(W / 2 + 130, H); ctx.lineTo(W / 2 - 130, H); ctx.fill();
        // Torches
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
        if(!this.btnLabelOk(text, 'addBtn')) return;   // an unlabeled button is never drawn (#35)
        let b = document.createElement('button');
        b.className = 'btn'; b.innerHTML = text; b.onclick = cb;
        container.appendChild(b);
    },

    // The single gate for the "blank yellow button" complaint (#35): an empty/undefined
    // label is never drawn, and which flow it came from lands in the Debug report along with the stack.
    btnLabelOk(text, where) {
        let t = (text === null || text === undefined) ? '' : String(text);
        if(t.replace(/<[^>]*>/g, '').trim()) return true;
        Debug.log('empty-button', T`Etiketsiz buton (${where})`, {
            value: JSON.stringify(text),
            stack: ((new Error()).stack || '').split('\n').slice(2, 5).map(l => l.trim()).join(' | ')
        });
        return false;
    },

    showModal(html, width = '600px', bgImage = null) {
        let mc = document.getElementById('modal-content');
        mc.style.width = width;
        mc.style.maxWidth = '90vw';
        if(bgImage) {
            // A 0.8/0.9 overlay was swallowing the interior drawing entirely (#60) — the text still reads, the scene still shows
            mc.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.62), rgba(0,0,0,0.82)), url('${bgImage}')`;
            mc.style.backgroundSize = 'cover';
            mc.style.backgroundPosition = 'center';
        } else {
            mc.style.backgroundImage = 'none';
            mc.style.background = 'rgba(20, 20, 25, 0.95)';
        }
        let mb = document.getElementById('modal-body');
        mb.innerHTML = html;
        // The modal HTML is generated via a template string; a button left with an empty label is caught here (#35)
        mb.querySelectorAll('button').forEach(b => {
            if(!this.btnLabelOk(b.textContent, 'showModal')) b.style.display = 'none';
        });
        // × only shows on a dismissible window; it asks through the same gate as Esc and clicking outside
        let cb = document.getElementById('modal-close');
        if(cb) { cb.classList.toggle('hidden', !this.canDismiss()); cb.title = T('Kapat'); }
        document.getElementById('modal-overlay').classList.remove('hidden');
    },
    // The three ways the user can close a window *on their own* — Esc, clicking outside, ×
    // — ask from one place; asking separately would leave one of them an escape hatch from an encounter (#70).
    // closeModal itself doesn't ask: encounter buttons ("Fight", "Surrender") close the window
    // while currentEncounterNpcId is still set, and asking there too would leave the window stuck open.
    canDismiss() { return !state.player.currentEncounterNpcId; },
    dismissModal() { if(this.canDismiss()) this.closeModal(); },
    closeModal() { this.skipType(); document.getElementById('modal-overlay').classList.add('hidden'); },

    // --- TYPEWRITER (#59) ---
    // Text is typed out gradually; any click or a new call completes it.
    // If reduced motion is on (or the system says so), it doesn't wait at all, prints in one frame.
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
        // The click that opened the modal may still be propagating — the listener is set on the next tick
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
        <div id="market-cols" style="display:flex;flex-wrap:wrap;gap:2rem;margin-top:1rem;">
        <div style="flex:1;min-width:220px;"><h4>${T`Satın Al`}</h4><ul id="market-buy" style="list-style:none;"></ul></div>
        <div style="flex:1;min-width:220px;"><h4>${T`Sat`}</h4><ul id="market-sell" style="list-style:none;"></ul></div>
        </div>
        <div id="market-msg" style="min-height:1.4rem;margin-top:0.8rem;font-size:var(--fs-md)"></div>
        <button class="btn" style="margin-top:1rem" onclick="Game.closeModal()">${T`Kapat`}</button>`;
        this.showModal(html);
        this._marketLoc = loc;
        this.refreshMarket();
    },

    // --- PER-GOOD SUPPLY/DEMAND (#24) ---
    // Price is no longer a single roll made on entering a city: every settlement has
    // its own multiplier per good. Cheap in its production region, expensive far from it;
    // it rises as you buy, falls as you sell, and drifts back to its own baseline untouched.
    GOOD_ORIGIN: {
        swadia:  { wheat:0.70, bread:0.75, velvet:1.30, salt:1.15 },   // plains, grain basket
        rhodok:  { ale:0.65,   iron:0.80,  meat:1.25,   cheese:1.15 }, // mountains, vineyards and mines
        vaegir:  { meat:0.70,  cheese:0.80, velvet:1.25, ale:1.20 },   // northern forest
        nord:    { salt:0.70,  meat:0.85,  wheat:1.30,  iron:1.20 },   // coast, salt flats
        khergit: { cheese:0.70, meat:0.75, velvet:1.35, bread:1.25 }   // steppe, herds
    },
    // The deviation is geography, not a hash (#77). It used to be a `loc.id + id` hash
    // giving a ±12% deviation: two neighboring cities could roll 0.88 and 1.12, and building
    // a trade route meant entering every city one by one and memorizing it. Now the deviation
    // is the sum of two low-frequency waves from position — neighboring settlements get similar
    // deviation, distant regions diverge, so the map is readable. Since each good has its own
    // wave direction and phase, the region where grain is cheap isn't the region where iron is.
    PRICE_NOISE: 0.06,              // ±6% (the old hash was ±12%)
    PRICE_WAVE: [1800, 1100],       // wavelength scale (units) — the continent is 9000 units wide
    priceNoise(x, y, id) {
        let h = 0;
        for(let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
        let a1 = (h % 628) / 100, a2 = ((h >>> 7) % 628) / 100;          // wave directions
        let p1 = ((h >>> 3) % 628) / 100, p2 = ((h >>> 11) % 628) / 100; // phases
        let [w1, w2] = this.PRICE_WAVE;
        return 0.6 * Math.sin((x * Math.cos(a1) + y * Math.sin(a1)) / w1 + p1)
             + 0.4 * Math.sin((x * Math.cos(a2) + y * Math.sin(a2)) / w2 + p2);
    },
    basePriceMult(loc, id) {
        let it = ITEMS[id];
        let m = (this.GOOD_ORIGIN[loc.faction] || {})[id] || 1;
        m *= 1 + this.PRICE_NOISE * this.priceNoise(loc.x || 0, loc.y || 0, id);
        if(loc.type === 'village' && it) m *= it.type === 'food' ? 0.8 : 1.15;   // a village's food is cheap, its trade goods pricey
        return m * (1.15 - (loc.prosperity || 50) / 400);                        // prosperity lowers price
    },
    // Price = regional baseline × supply curve. There's no separate "price state": the only thing that moves is stock.
    priceMult(loc, id) { return this.basePriceMult(loc, id) * this.supplyMul(loc, id); },

    // --- LIMITED STOCK AND SUPPLY CURVE (#46) ---
    // A settlement's stock of a good is limited: it depletes and gets pricier as you buy,
    // and refills and cheapens as you sell, replenishing daily in proportion to prosperity.
    // Emptying a village makes the next purchase expensive — "find the cheap village, buy it all" is now a real decision.
    STOCK_SCALE: { city: 500, village: 190, castle: 150 },   // stock scale — divided by √price
    stocked(id) { let it = ITEMS[id]; return !!it && (it.type === 'food' || it.type === 'trade'); },
    stockBase(loc, id) {
        // Plentiful in the production region, scarce far from it (same `GOOD_ORIGIN` table); prosperity grows the stockpile.
        // Normalized by value: a city holds the same value of each good, not the same count.
        let orig = (this.GOOD_ORIGIN[loc.faction] || {})[id] || 1;
        // An expensive good is scarcer, but not inversely proportional to price (√price): at full
        // proportion a city was left with 6 bolts of velvet, so a single cartload emptied the market and killed the trade.
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
    // Supply curve is 1/√ratio: price is ×1.41 when stock halves, ×0.71 when it doubles (clamped 0.55–2.0)
    supplyMul(loc, id) {
        if(!this.stocked(id)) return 1;
        let r = Math.max(0.05, this.stock(loc, id) / this.stockBase(loc, id));
        return Math.max(0.55, Math.min(2, Math.pow(r, -0.5)));
    },
    // Stock drifts toward its baseline every day (production/consumption); once it settles at the baseline the entry is deleted so the save doesn't bloat
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
    // Where the price sits relative to the base price — used in the market list and the guild ledger.
    // No words (#76): the arrow's direction, the color for cheap/expensive, and the number all say how much —
    // "cheap -22%" was saying the same thing a third time and cluttering the row.
    priceTag(loc, id) {
        let rel = Math.round((this.priceMult(loc, id) - 1) * 100);
        let c = rel <= -12 ? '#2ecc71' : rel >= 12 ? '#e0463a' : 'var(--text-muted)';
        return `<span style="color:${c}">${this.pct(rel, true)}</span>`;
    },
    // The guildmaster's ledger: which good is cheap where, expensive where (like Warband's
    // "trade goods prices" screen). The only source of information for planning a route.
    // The ledger is the trade game's only map, and it used to be free and instant. It now
    // costs a fee — paid once per town per day, so paging back from the table is free (#71).
    GUILD_FEE: 50,
    guildPrices(locId) {
        let here = LOCATIONS.find(l => l.id === locId);
        if(state.guildPaid[locId] !== state.time.day) {
            if(state.player.money < this.GUILD_FEE)
                return alert(T`Lonca ustası defteri kapattı: "Bu defter ${this.GUILD_FEE} dinar. Bedava bilgi yok."`);
            state.player.money -= this.GUILD_FEE;
            state.guildPaid[locId] = state.time.day;
            this.updateTopBar();
        }
        let towns = LOCATIONS.filter(l => l.type === 'city')
                             .sort((a, b) => this.dist(a, here) - this.dist(b, here)).slice(0, 5);
        let goods = Object.values(ITEMS).filter(i => i.type === 'trade' || i.type === 'food');
        let head = towns.map(t => `<th style="padding:0.2rem 0.4rem;font-weight:600;color:${(FACTIONS[t.faction]||{}).color||'#fff'}">${T(t.name)}${t.id === here.id ? ' *' : ''}</th>`).join('');
        let rows = goods.map(g => `<tr><td style="padding:0.2rem 0.4rem">${g.icon} ${T(g.name)}</td>` +
            towns.map(t => `<td style="padding:0.2rem 0.4rem;text-align:right">${Math.max(1, Math.floor(g.basePrice * this.priceMult(t, g.id)))}₺<br>
                <span style="font-size:var(--fs-xs)">${this.priceTag(t, g.id)}</span></td>`).join('') + '</tr>').join('');
        this.showModal(`<h3>${T`📈 Lonca Fiyat Defteri`}</h3>
            <p style="color:var(--text-muted);font-size:var(--fs-md)">${T`"En yakın beş şehrin fiyatları bunlar. Ucuz aldığın malı
            pahalı olduğu yerde satarsan kâr edersin — ama sen aldıkça fiyat yükselir, sattıkça düşer."<br>
            Satış fiyatı bu rakamın <b>%70</b>'i (Ticaret yeteneği payını iyileştirir). <i>*</i> bulunduğun şehir.`}</p>
            <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:var(--fs-sm)">
            <tr><th style="text-align:left;padding:0.2rem 0.4rem">${T`Mal`}</th>${head}</tr>${rows}</table></div>
            <button class="btn" style="margin-top:1rem" onclick="Game.openTavern(LOCATIONS.find(l=>l.id==='${locId}'))">${T('Geri')}</button>`, '760px');
    },
    // The price shouldn't come in as a parameter from the button's HTML: it could be
    // edited via the DOM to trade for free, and a missing parameter turned money into NaN.
    marketPrice(id, selling = false) {
        let it = ITEMS[id] || state.player.inventory.find(i => i.id === id);
        if(!it) return null;
        // Trade skill: a discount when buying, a premium when selling (25% cap)
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
            li.id = 'mrow-buy-' + item.id;   // the row is rebuilt on every refresh; the flash effect finds it by id
            let note = this.itemNote(item);
            // Stock (#46): how much of a limited good is left, no button once it's out
            let st = this._marketLoc ? Math.floor(this.stock(this._marketLoc, item.id)) : Infinity;
            let empty = st <= 0;
            li.innerHTML = `${item.icon} ${T(item.name)} - <b>${price}₺</b> `
                + `<span style="font-size:var(--fs-xs)">${this._marketLoc ? this.priceTag(this._marketLoc, item.id) : ''}</span> `
                + (isFinite(st) ? `<span style="font-size:var(--fs-xs);color:${empty ? '#e0463a' : st < 6 ? '#e8a13a' : 'var(--text-muted)'}">${T`stok ${st}`}</span> ` : '')
                + (empty ? `<i style="font-size:var(--fs-sm);color:var(--text-muted)">${T`tükendi`}</i>`
                    : `<button class="btn" style="padding:0.2rem 0.5rem;font-size:var(--fs-sm)" onclick="Game.buyItem('${item.id}')">${T`Al`}</button> `
                    + `<button class="btn" style="padding:0.2rem 0.5rem;font-size:var(--fs-sm)" onclick="Game.buyItem('${item.id}',5)">x5</button>`)
                + (note ? `<div style="font-size:var(--fs-xs);color:#cbb26b">${note}</div>` : '');
            buy.appendChild(li);
        });
        let sell = document.getElementById('market-sell'); sell.innerHTML = '';
        state.player.inventory.forEach(item => {
            if(item.type === 'trade') {
                let price = this.marketPrice(item.id, true);
                let li = document.createElement('li'); li.style.marginBottom = '0.5rem';
                li.id = 'mrow-sell-' + item.id;
                li.innerHTML = `${item.icon||'📦'} ${T(item.name)} x${item.qty} - <b>${price}₺</b> `
                    + `<span style="font-size:var(--fs-xs)">${this._marketLoc ? this.priceTag(this._marketLoc, item.id) : ''}</span> `
                    + `<button class="btn" style="padding:0.2rem 0.5rem;font-size:var(--fs-sm)" onclick="Game.sellItem('${item.id}')">${T`Sat`}</button> `
                    + (item.qty >= 5 ? `<button class="btn" style="padding:0.2rem 0.5rem;font-size:var(--fs-sm)" onclick="Game.sellItem('${item.id}',5)">x5</button>` : '');
                sell.appendChild(li);
            }
        });
    },
    // ============ TRANSACTION FEEDBACK (#45) ============
    // Single gate: sound + the relevant row flashing + a flying delta on the coin badge.
    // No sound file (no dependency/asset added) — generated with short-envelope oscillators.
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
        let ac = this.ac();
        if(!ac) return;
        try {
            s.f.forEach((freq, i) => {
                let o = ac.createOscillator(), g = ac.createGain();
                let t0 = ac.currentTime + i * s.d * 0.6;
                o.type = s.t;
                o.frequency.setValueAtTime(freq, t0);
                // Envelope: exponentialRamp can't reach 0, so a 0.0001 floor is used
                g.gain.setValueAtTime(0.0001, t0);
                g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.12 * this.opt('volume')), t0 + 0.012);
                g.gain.exponentialRampToValueAtTime(0.0001, t0 + s.d);
                o.connect(g); g.connect(ac.destination);
                o.start(t0); o.stop(t0 + s.d + 0.02);
            });
        } catch(e) { /* the game doesn't stop if there's no sound */ }
    },
    // The notch, measured. A custom property holding env() computes to the unresolved
    // token, so the insets only become numbers on a real box. Read by the debug report and
    // by index.html, which needs to know whether a native shell reports a believable value.
    safeArea() {
        let p = document.createElement('div');
        p.style.cssText = 'position:fixed;visibility:hidden;top:0;left:0;'
            + 'padding:env(safe-area-inset-top) env(safe-area-inset-right)'
            + ' env(safe-area-inset-bottom) env(safe-area-inset-left)';
        document.body.appendChild(p);
        let c = getComputedStyle(p), v = [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft];
        p.remove();
        return v;
    },

    // The one AudioContext in the game. A browser only hands one out after a gesture and
    // only so many per page, so SFX and Music share it — and an autoplay-suspended context
    // is resumed here rather than at each of the two call sites.
    ac() {
        try {
            let AC = window.AudioContext || window.webkitAudioContext;
            let ac = this._audio || (this._audio = new AC());
            if(ac.state === 'suspended') ac.resume();
            return ac;
        } catch(e) { return null; }   // no Web Audio: the game runs silently
    },
    toggleMute() { this.setOpt('muted', !this.opt('muted')); this.updateTopBar(); if(!this.opt('muted')) this.sfx('buy'); this.Music.sync(); },

    // ============ MUSIC (#95) ============
    // Same rule as the SFX above: no audio file ships. That is not only about repo size —
    // the worker precaches everything, so a soundtrack would have to be carried offline in
    // full, and a fixed track loops audibly on a map you stare at for an hour. So the music
    // is written rather than recorded: church modes over a drone, phrases of uneven length,
    // a different piece every few minutes. Medieval European music really was modal, droned
    // and largely unmetered, so here the honest version and the cheap version coincide.
    Music: {
        // Semitones from the tonic. Ionian — the plain major scale — is left out on purpose:
        // it is the one thing that makes "medieval" music sound like a fairground.
        modes: {
            dorian:     [0, 2, 3, 5, 7, 9, 10],
            aeolian:    [0, 2, 3, 5, 7, 8, 10],
            phrygian:   [0, 1, 3, 5, 7, 8, 10],
            mixolydian: [0, 2, 4, 5, 7, 9, 10],
            lydian:     [0, 2, 4, 6, 7, 9, 11]
        },
        // tonic is a MIDI note (50 = D3). Tempo is a property of the band, not of the screen:
        // a bell piece and a fingerpicked one do not want the same clock. The screen only
        // decides how high the key sits and which modes are on the table.
        MAP:    { modes: ['dorian', 'aeolian', 'lydian', 'mixolydian'], tonic: [52, 59] },
        BATTLE: { modes: ['dorian', 'phrygian', 'aeolian'],             tonic: [45, 50] },

        // Twenty bands. The previous pass had two line-ups and a handful of knobs on top of
        // them, and every piece came out sounding like the same two pieces — which is exactly
        // what got reported (#97). A band now owns its instruments, its metre, its tempo and
        // its texture, so the draw is between *arrangements*, not between settings.
        //
        //   beats  bar length in beats (4 = 4/4, 3 = 6/8 counted in dotted beats, 3.5 = 7/8)
        //   drums  one char per grid step across the bar — see HITS. '.' is a rest
        //   arp    a running figure; `pat` are scale steps over the bar's chord, `bass` puts
        //          the thumb on the root at the halves the way a picking hand does
        //   ost    a low staccato ostinato, `n` strokes to the bar — the engine room
        //   pad    held chord, `deg` the voicing in scale steps
        //   lead   the motif: `bars` of every four that carry it, `lift` in scale degrees
        //          (7 = one octave up), `stab` cuts every note short
        //   harm   a second instrument on the same motif, `deg` steps away (0 = doubling)
        //
        // The one rule the user set: the map is slow and calm, the battle is fast and loud.
        // Everything else is allowed to differ, and does.
        BANDS: [
            // ---- map: ten quiet ones ----
            { id: 'cayir', name: 'Çayır Yolu', beats: 4, bpm: [66, 78], len: 16, gain: 1.4,
              arp: { v: 'pluck', pat: [0, 2, 4, 2, 0, 2, 4, 2], vol: 0.1, bass: true },
              lead: { v: 'flute', lift: 7, vol: 0.09, bars: 2 } },
            { id: 'gol', name: 'Göl Aynası', beats: 4, bpm: [58, 68], len: 14, gain: 1.8,
              modes: ['lydian', 'mixolydian'],
              arp: { v: 'struck', pat: [0, 2, 4, 7, 9, 7, 4, 2], vol: 0.085, hold: 3.5 },
              lead: { v: 'flute', lift: 7, vol: 0.07, bars: 1 } },
            { id: 'oda', name: 'Oda Penceresi', beats: 4, bpm: [60, 70], len: 14, gain: 1.8,
              modes: ['aeolian', 'dorian'],
              arp: { v: 'piano', pat: [0, 4, 2, 7, 4, 2, 4, 2], vol: 0.09, hold: 2.2, bass: true },
              lead: { v: 'piano', lift: 7, vol: 0.085, bars: 2, hold: 1.6 } },
            { id: 'degirmen', name: 'Su Değirmeni', beats: 3.5, bpm: [70, 80], len: 14, gain: 1.9,
              modes: ['dorian', 'mixolydian'],
              arp: { v: 'struck', pat: [0, 2, 4, 2, 7, 4, 2], vol: 0.08, hold: 2 },
              ost: { v: 'pluck', n: 7, pat: [0, 0, 4, 4, 2, 2, 0], vol: 0.085 },
              lead: { v: 'flute', lift: 7, vol: 0.075, bars: 1 } },
            { id: 'han', name: 'Han Avlusu', beats: 4, bpm: [72, 82], len: 16, gain: 1.95,
              modes: ['dorian', 'phrygian'], drums: 'o.xx.ox.',
              ost: { v: 'pluck', n: 4, pat: [0, 4, 2, 4], vol: 0.17 },
              lead: { v: 'reed', lift: 0, vol: 0.075, bars: 3 } },
            { id: 'alaca', name: 'Alacakaranlık', beats: 4, bpm: [58, 66], len: 12, gain: 2.1,
              modes: ['lydian', 'mixolydian'], drums: 's.s.s.s.',
              arp: { v: 'struck', pat: [0, 4, 7, 4, 2, 4, 7, 4], vol: 0.075, hold: 2.5 },
              lead: { v: 'horn', lift: 0, vol: 0.07, bars: 2 } },
            { id: 'sis', name: 'Sis Vadisi', beats: 4, bpm: [56, 64], len: 12, gain: 2.5,
              modes: ['lydian', 'mixolydian'],
              drums: ['s.......', 's...s...', 's.s.s.s.', 'sos.s.so', 'sostsoso'],
              ost: { v: 'synth', n: 2, pat: [0, 4], vol: 0.18 },
              pad: { v: 'synth', deg: [0, 2, 7], lift: 0, vol: 0.13 },
              lead: { v: 'piano', lift: 7, vol: 0.06, bars: 2, hold: 1.8 } },
            { id: 'yolcu', name: 'Yolcu Adımı', beats: 4, bpm: [74, 84], len: 16, gain: 1.45,
              drums: 'o..s..s.',
              arp: { v: 'pluck', pat: [0, 2, 4, 2, 0, 2, 4, 2], vol: 0.09, bass: true },
              lead: { v: 'flute', lift: 7, vol: 0.085, bars: 2 } },
            { id: 'kopuz', name: 'Kopuz Havası', beats: 3, bpm: [76, 88], len: 16, gain: 2.4,
              modes: ['mixolydian', 'dorian'], drums: 'o..x..',
              arp: { v: 'pluck', pat: [0, 4, 2, 7, 4, 2], vol: 0.065, bass: true },
              lead: { v: 'pluck', lift: 7, vol: 0.09, bars: 2 } },
            { id: 'vadi', name: 'Yaylı Vadi', beats: 4, bpm: [54, 62], len: 12, gain: 1.25,
              pad: { v: 'bow', deg: [0, 2, 7], lift: 0, vol: 0.06 },
              ost: { v: 'bow', n: 1, vol: 0.05 },
              lead: { v: 'flute', lift: 7, vol: 0.085, bars: 2 } },

            // ---- battle: ten loud ones, one genre each (#98) ----
            // Ten pieces in one orchestral idiom is one piece heard ten times, which is what
            // came back the first two times. A band now owns a *genre* as well as a line-up:
            // the modal score engine underneath is unchanged, so every one of these is still
            // a medieval tune — it is the kit, the bass and the guitar that place it.
            { id: 'neon', name: 'Neon Sefer', battle: true, beats: 4, bpm: [152, 158], len: 24, gain: 0.67,
              modes: ['phrygian', 'aeolian'],
              drums: 'K.s.N.s.K.sKN.sw',           // 16 steps: the grid a drum machine is written on
              ost: { v: 'sub', n: 8, pat: [0, 0, 0, 0, 0, 0, 4, 2], vol: 0.1 },
              pad: { v: 'synth', deg: [0, 2, 4], lift: 0, vol: 0.055 },
              lead: { v: 'flute', lift: 7, vol: 0.09, bars: 4, hold: 1.1 },
              harm: { v: 'synth', deg: 0, vol: 0.04 } },
            { id: 'devre', name: 'Kara Devre', battle: true, beats: 4, bpm: [156, 164], len: 24, gain: 0.75,
              modes: ['phrygian'], drone: true,
              drums: 'K..kN..WK.k.N.w.',
              ost: { v: 'sub', n: 16, pat: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 3, 2, 1, 0], vol: 0.09 },
              lead: { v: 'reed', lift: 7, vol: 0.085, bars: 4, stab: true },
              harm: { v: 'dist', deg: 0, vol: 0.05 } },
            { id: 'tel', name: 'Demir Tel', battle: true, beats: 4, bpm: [158, 166], len: 24, gain: 0.61,
              modes: ['aeolian', 'dorian'],
              drums: 'K.s.N.s.K.sKN.sW',
              ost: { v: 'dist', n: 8, pat: [0, 0, 0, 0, 4, 4, 2, 2], vol: 0.075 },
              lead: { v: 'section', lift: 7, vol: 0.09, bars: 4 },
              harm: { v: 'dist', deg: 4, vol: 0.045 } },   // the fifth on top: a power chord, not a third
            { id: 'sancak', name: 'Altın Sancak', battle: true, beats: 4, bpm: [152, 160], len: 24, gain: 0.97,
              modes: ['mixolydian', 'dorian'],
              drums: 'K.s.c.s.K.s.c.sH',
              ost: { v: 'sub', n: 8, pat: [0, 0, 4, 4, 2, 2, 0, 0], vol: 0.09 },
              pad: { v: 'voice', deg: [0, 2, 4], lift: 0, vol: 0.055 },
              lead: { v: 'voice', lift: 7, vol: 0.1, bars: 4 },
              harm: { v: 'piano', deg: 0, vol: 0.05 } },
            { id: 'meydan', name: 'Meydan Dansı', battle: true, beats: 4, bpm: [152, 158], len: 24, gain: 0.7,
              modes: ['dorian', 'aeolian'],
              drums: 'K.sHK.sHK.sHK.sH',           // four on the floor, hat on every off-beat
              ost: { v: 'sub', n: 8, pat: [0, 7, 0, 7, 0, 7, 0, 7], vol: 0.095 },
              arp: { v: 'section', pat: [0, 0, 4, 4, 2, 2, 4, 4], vol: 0.055, hold: 0.35 },
              lead: { v: 'section', lift: 7, vol: 0.09, bars: 4, stab: true } },
            { id: 'dortnala', name: 'Dörtnala', battle: true, beats: 4, bpm: [160, 170], len: 24, gain: 1.11,
              modes: ['mixolydian', 'dorian'],
              drums: 'o.s.X.s.o.s.X.s.',           // the train beat, brushes rather than sticks
              arp: { v: 'pluck', pat: [0, 2, 4, 2, 0, 2, 4, 2], vol: 0.085, bass: true },
              ost: { v: 'pizz', n: 4, pat: [0, 4, 0, 4], vol: 0.1 },
              lead: { v: 'bow', lift: 7, vol: 0.09, bars: 4 },
              harm: { v: 'pluck', deg: 2, vol: 0.06 } },
            { id: 'halay', name: 'Halay Ateşi', battle: true, beats: 4, bpm: [158, 166], len: 24, gain: 0.98,
              modes: ['phrygian', 'dorian'], drone: true,
              drums: 'O.xxO.x.O.xxOxWR',
              ost: { v: 'pluck', n: 8, pat: [0, 0, 4, 2, 0, 0, 4, 2], vol: 0.1 },
              lead: { v: 'reed', lift: 7, vol: 0.09, bars: 4 },
              harm: { v: 'reed', deg: 2, vol: 0.06 } },   // two zurnas a third apart, as they are played
            // Karplus-Strong out in front reads as a wiry electric guitar, not a lute — and it
            // is already the map's main voice, so hearing it lead here too is what "that
            // metallic guitar is everywhere" meant. The kanun is the right Anatolian answer
            // and it is `struck`, which is sweeter by construction: a plucked wire rings, a
            // struck one is over (#98).
            { id: 'kanun', name: 'Kanun Cengi', battle: true, beats: 3.5, bpm: [156, 164], len: 28, gain: 0.91,
              modes: ['phrygian', 'dorian'],
              drums: 'O.xO.x.',                    // 7/8 counted 3+2+2, the Anatolian limp
              arp: { v: 'kanun', pat: [0, 2, 4, 2, 0, 4, 2], vol: 0.085, hold: 1.4 },
              ost: { v: 'piano', n: 7, pat: [0, 0, 4, 4, 2, 2, 0], vol: 0.085 },
              lead: { v: 'flute', lift: 7, vol: 0.1, bars: 4 },
              harm: { v: 'voice', deg: 0, vol: 0.05 } },
            { id: 'celik', name: 'Çelik Halay', battle: true, beats: 4.5, bpm: [158, 166], len: 28, gain: 0.86,
              modes: ['phrygian', 'dorian'], drone: true,
              drums: 'K.xK.xW.N',                  // 9/8 with a dance kick under it: the fusion, stated
              ost: { v: 'sub', n: 9, pat: [0, 0, 0, 4, 4, 2, 2, 0, 0], vol: 0.09 },
              arp: { v: 'kanun', pat: [0, 4, 2, 0, 4, 2, 0, 4, 2], vol: 0.07, hold: 1.2 },
              lead: { v: 'reed', lift: 7, vol: 0.085, bars: 4 } },
            { id: 'kilic', name: 'Kılıç Gölgesi', battle: true, beats: 4, bpm: [152, 160], len: 28, gain: 0.96,
              modes: ['aeolian', 'dorian'], drone: true,
              drums: 'O..W.xO..w.xO.WR',           // the fight itself, written into the grid
              ost: { v: 'sub', n: 4, vol: 0.085 },
              pad: { v: 'voice', deg: [0, 2, 7], lift: 7, vol: 0.06 },
              lead: { v: 'section', lift: 7, vol: 0.095, bars: 3, hold: 1.15,
                      alt: { v: 'voice', lift: 0, vol: 0.1, bars: 4, hold: 0.95 } },
              harm: { v: 'flute', deg: 0, vol: 0.055 } }
        ],

        // One chord per bar, as scale degrees. No progression contains the seventh degree as
        // a chord root, so there is never a leading tone pulling home: the chords lean
        // instead of resolving, which is the modal sound and not the Renaissance-fair one.
        PROGS: [[0, 0, 5, 6], [0, 6, 0, 4], [0, 3, 5, 0], [0, 4, 6, 5], [0, 5, 3, 4]],
        // Two vowels, not one. Formant synthesis is the trick — the same sawtooth through one
        // lowpass is a synth pad, through these three bandpasses it is a human vowel — but a
        // *held* vowel is still a pad, because nothing in it moves. VOWEL is an open "ah" and
        // VOWEL_O a rounder "oh"; a sung note travels from the second to the first, and that
        // journey is most of what makes the ear hear a mouth instead of a filter (#98).
        VOWEL: [800, 1150, 2900],
        VOWEL_O: [520, 1000, 2500],

        // ---- the score: no audio in here, which is the half worth testing ----

        // A rhythm and a shape, each exactly one bar. The first version generated every note
        // from an independent random walk, which is precisely why it noodled: nothing ever
        // came back, so there was nothing to recognise. A piece now draws ONE rhythm and ONE
        // contour and plays that motif over every chord of the progression — repetition is
        // what turns a handful of notes into a tune (#96). The three groups fill a bar of
        // four beats, of three, and of three and a half — a band draws from its own metre.
        RHYTHMS: [
            [1, 1, 2], [2, 1, 1], [1, 0.5, 0.5, 2], [1.5, 0.5, 2], [1, 1, 1, 1], [2, 2], [0.5, 0.5, 1, 2],
            [1, 1, 1], [1.5, 1.5], [1, 0.5, 0.5, 1], [2, 1],
            [1, 1, 1.5], [1.5, 1, 1], [1, 0.5, 1, 1], [2, 1.5],
            [1, 1, 1, 1.5], [1.5, 1.5, 1.5], [2, 1, 1.5], [1, 0.5, 1, 2]
        ],
        // Steps of the mode, relative to the bar's chord root. They lean on the chord tones
        // (0, 2, 4) so the melody sits on the harmony instead of arguing with it.
        CONTOURS: [
            [0, 2, 4, 2], [4, 2, 0, 2], [0, -1, 2, 4], [2, 4, 7, 4], [0, 4, 2, 0], [7, 4, 2, 0], [0, 2, 1, 4]
        ],

        // One bar of melody as [{ deg, beats, at }], `at` in beats from the bar's start.
        // `lift` raises the whole shape by scale degrees (7 = the octave, where the flute and
        // the violins live). The progression's last bar plays the contour backwards: a repeat
        // needs one variation or it turns into wallpaper.
        bar(p, lift, alt) {
            let i = p.bar % p.prog.length, m = p.motif;
            // `alt` answers the motif with its own shape — the same rhythm walking the other
            // way. It is still the piece's motif, which is why it sounds like a reply and not
            // like a second tune (#98).
            let c = alt ? m.c.slice().reverse() : m.c;
            if(i === p.prog.length - 1) c = c.slice().reverse();
            let root = p.prog[i] + (lift || 0), at = 0;
            return m.r.map((beats, j) => {
                let n = { deg: root + c[j % c.length], beats, at };
                at += beats;
                return n;
            });
        },

        // Degree -> Hz. Degrees outside 0..6 wrap into the octaves above and below.
        hz(tonic, mode, deg) {
            let s = this.modes[mode], oct = Math.floor(deg / s.length);
            return 440 * Math.pow(2, (tonic + s[deg - oct * s.length] + 12 * oct - 69) / 12);
        },

        // ---- synthesis ----

        // Karplus-Strong: a burst of noise in a delay line one period long that loses its
        // highs on every pass. It is the one trick that sounds like a plucked gut string
        // instead of a beep, and it is pure arithmetic — no sample, no library. Built per
        // note rather than cached: the adds are nothing next to holding PCM on a phone, and
        // fresh noise means no two plucks are identical.
        pluck(t, f, dur, vol, body) {
            let ac = this.ac, sr = ac.sampleRate;
            t = Math.max(0, t + (Math.random() - 0.5) * 0.012);   // a picking hand is not a sequencer,
            // and a humanised note that lands before the clock's zero throws rather than plays
            let len = Math.floor(sr * Math.min(3, dur + 1.2)), n = Math.max(2, Math.round(sr / f));
            let buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0), ring = new Float32Array(n);
            for(let i = 0; i < n; i++) ring[i] = Math.random() * 2 - 1;
            // White noise is a plectrum on steel: every harmonic up to Nyquist enters at full
            // strength and the first 50 ms are pure wire. Two smoothing passes over the ring
            // roll the excitation off before it is ever plucked, which is what a fingertip on
            // gut does — the string is the same, the finger is softer (#98).
            for(let p = 0; p < 2; p++)
                for(let i = 0; i < n; i++) ring[i] = (ring[i] + ring[(i + 1) % n]) * 0.5;
            for(let i = 0, j = 0; i < len; i++, j = (j + 1) % n) {
                d[i] = ring[j];
                ring[j] = (ring[j] + ring[(j + 1) % n]) * 0.498;   // 0.996 per period: highs fade first, as on a real string
            }
            let src = ac.createBufferSource(), g = ac.createGain();
            let lp = ac.createBiquadFilter(), bd = ac.createBiquadFilter();
            src.buffer = buf;
            // Raw Karplus-Strong is a psaltery: bright, wiry, and the reason the old map music
            // did not sound acoustic. The lowpass is the wooden top; the peak at 190 Hz is the
            // air inside the box, and that resonance is most of the difference between "a
            // string" and "a guitar" (#96).
            let bx = body || [2200, 190, 7];
            lp.type = 'lowpass'; lp.frequency.value = bx[0]; lp.Q.value = 0.7;
            bd.type = 'peaking'; bd.frequency.value = bx[1]; bd.Q.value = 1.1; bd.gain.value = bx[2];
            g.gain.setValueAtTime(vol, t);
            g.gain.setTargetAtTime(0.0001, t + dur * 0.85, 0.22);
            src.connect(lp); lp.connect(bd); bd.connect(g); g.connect(this.bus);
            src.start(t); src.stop(t + len / sr);
        },

        // The same string plucked instead of bowed. A violin's box is small and sits an octave
        // above a guitar's, and a pizzicato note is over before a bowed one has arrived.
        pizz(t, f, dur, vol) { this.pluck(t, f, Math.min(dur, 0.5), vol, [5200, 420, 5]); },

        // A kanun is a small trapezoid box of thin strings plucked with two plectra: brighter
        // than a lute's belly, far smaller than a guitar's, and the note is gone in a second.
        // `struck` was tried here first and was worse than what it replaced — its 4.72 partial
        // is a bell, and a bell arpeggiating under a flute is a glockenspiel (#98).
        kanun(t, f, dur, vol) { this.pluck(t, f, Math.min(dur, 1.1), vol, [2600, 300, 6]); },

        // White noise as a buffer source. Cheaper to write once than to inline three times.
        noise(dur) {
            let ac = this.ac, sr = ac.sampleRate, len = Math.max(1, Math.floor(sr * dur));
            let b = ac.createBuffer(1, len, sr), d = b.getChannelData(0);
            for(let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            let src = ac.createBufferSource(); src.buffer = b; return src;
        },

        // Flute: almost a pure sine with a soft octave above it — and a breath of filtered
        // noise riding the same envelope, which is the only thing standing between a sine
        // and a test tone.
        flute(t, f, dur, vol) {
            let ac = this.ac, g = ac.createGain();
            let vib = ac.createOscillator(), va = ac.createGain();
            vib.type = 'sine'; vib.frequency.value = 4.8; va.gain.value = f * 0.007;
            vib.connect(va);
            [[1, 1], [2, 0.16]].forEach(([m, lvl]) => {
                let o = ac.createOscillator(), og = ac.createGain();
                o.type = 'sine'; o.frequency.value = f * m; og.gain.value = lvl;
                va.connect(o.frequency);
                o.connect(og); og.connect(g);
                o.start(t); o.stop(t + dur + 0.08);
            });
            let nb = this.noise(dur + 0.1), bp = ac.createBiquadFilter(), ng = ac.createGain();
            bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 0.8; ng.gain.value = 0.05;
            nb.connect(bp); bp.connect(ng); ng.connect(g);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(vol, t + 0.07);          // a player's tongue, not a bow
            g.gain.setValueAtTime(vol, t + dur * 0.75);
            g.gain.linearRampToValueAtTime(0.0001, t + dur);
            g.connect(this.bus);
            vib.start(t); vib.stop(t + dur + 0.08); nb.start(t); nb.stop(t + dur + 0.08);
        },

        // Voices singing a vowel. See VOWEL above for why the filters are the point — and why
        // there are two vowels. Four things separate this from the pad it used to be, and all
        // four are things a singer does rather than things a synth does: the vowel opens over
        // the note, the vibrato arrives *after* the onset (nobody shakes a note they have only
        // just started), there is a breath at the front, and the sawtooth is rolled off before
        // it reaches the formants, because a glottal pulse is nothing like as bright as a saw.
        voice(t, f, dur, vol) {
            let ac = this.ac, o = ac.createOscillator(), g = ac.createGain();
            let vib = ac.createOscillator(), va = ac.createGain(), src = ac.createBiquadFilter();
            o.type = 'sawtooth'; o.frequency.value = f;
            src.type = 'lowpass'; src.frequency.value = 2400; src.Q.value = 0.4;
            o.connect(src);
            vib.type = 'sine'; vib.frequency.value = 5.2;
            va.gain.setValueAtTime(0.0001, t);
            va.gain.linearRampToValueAtTime(f * 0.011, t + Math.min(dur * 0.55, 0.5));
            vib.connect(va); va.connect(o.frequency);
            let move = Math.min(dur * 0.45, 0.4);
            this.VOWEL.forEach((fq, i) => {
                let bp = ac.createBiquadFilter(), fg = ac.createGain();
                bp.type = 'bandpass'; bp.Q.value = 6 + i * 3;
                bp.frequency.setValueAtTime(this.VOWEL_O[i], t);
                bp.frequency.exponentialRampToValueAtTime(fq, t + move);
                fg.gain.value = [1, 0.5, 0.22][i];
                src.connect(bp); bp.connect(fg); fg.connect(g);
            });
            // The breath: through the same mouth, so it runs into the formants rather than
            // straight to the bus. Without it every entry starts out of nowhere.
            let br = this.noise(0.07), bh = ac.createBiquadFilter(), bg = ac.createGain();
            bh.type = 'highpass'; bh.frequency.value = 1800;
            // Scaled down on long notes: a singer takes one breath and then holds, so a
            // bar-long pad chord getting the same burst per tone every bar is a hiss (#98).
            bg.gain.setValueAtTime(vol * 0.5 * Math.min(1, 0.6 / dur), t);
            bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
            br.connect(bh); bh.connect(bg); bg.connect(g);
            br.start(t); br.stop(t + 0.08);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);     // a choir does not start suddenly
            g.gain.setValueAtTime(vol, t + dur * 0.65);
            g.gain.linearRampToValueAtTime(0.0001, t + dur);
            g.connect(this.bus);
            o.start(t); vib.start(t); o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
        },

        // A string section is detuned unison plus the octave below — one bow is a soloist,
        // three are an orchestra. Lite mode drops to a single voice: this is the only part
        // of the score whose cost scales with how many notes are playing at once.
        section(t, f, dur, vol) {
            let v = Game.lite() ? [1] : [1, 1.005, 0.995, 0.5];
            v.forEach(m => this.bow(t, f * m, dur, vol * (m === 0.5 ? 0.8 : 0.62)));
        },

        // One violin: a sawtooth under a resonant lowpass. Two things stop it being a buzzer.
        // The filter opens for 60 ms at the start of every stroke — that is rosin catching the
        // string, and it is what the ear hears as a bow. And the vibrato fades IN, because no
        // player shakes a note they have only just started (#96).
        bow(t, f, dur, vol) {
            let ac = this.ac, o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
            let vib = ac.createOscillator(), va = ac.createGain();
            t = Math.max(0, t + (Math.random() - 0.5) * 0.014);   // no section plays perfectly together
            o.type = 'sawtooth'; o.frequency.value = f;
            vib.type = 'sine'; vib.frequency.value = 5 + Math.random() * 0.8;
            va.gain.setValueAtTime(0.0001, t);
            va.gain.linearRampToValueAtTime(f * 0.008, t + Math.min(0.45, dur * 0.6));
            vib.connect(va); va.connect(o.frequency);
            lp.type = 'lowpass'; lp.Q.value = 2.2;
            lp.frequency.setValueAtTime(Math.min(f * 8, 14000), t);
            lp.frequency.exponentialRampToValueAtTime(Math.min(f * 4, 9000), t + 0.06);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(vol, t + 0.045);
            g.gain.setValueAtTime(vol, t + dur * 0.75);
            g.gain.linearRampToValueAtTime(0.0001, t + dur);
            o.connect(lp); lp.connect(g); g.connect(this.bus);
            o.start(t); vib.start(t);
            o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
        },

        // Frame drum. The noise burst alone is a click; the skin's pitch falling from 150 to
        // 52 Hz underneath it is what makes the low stroke read as a drum.
        drum(t, low, vol) {
            let ac = this.ac, sr = ac.sampleRate, len = Math.floor(sr * 0.16);
            let buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
            for(let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, low ? 3 : 7);
            let src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
            src.buffer = buf;
            bp.type = 'bandpass'; bp.frequency.value = low ? 190 : 2200; bp.Q.value = low ? 1.1 : 0.7;
            g.gain.value = vol;
            src.connect(bp); bp.connect(g); g.connect(this.bus);
            src.start(t);
            if(low) {
                let o = ac.createOscillator(), og = ac.createGain();
                o.frequency.setValueAtTime(150, t);
                o.frequency.exponentialRampToValueAtTime(52, t + 0.13);
                og.gain.setValueAtTime(vol, t);
                og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
                o.connect(og); og.connect(this.bus); o.start(t); o.stop(t + 0.18);
            }
        },

        // Struck wire and metal: hammered dulcimer, harp, bell. The partials are deliberately
        // NOT whole multiples — a stretched series is what the ear hears as something hit
        // rather than something blown, and the high ones have to die first. `parts` swaps the
        // series, which is the whole difference between a dulcimer and a piano.
        struck(t, f, dur, vol, parts) {
            let ac = this.ac, g = ac.createGain();
            (parts || [[1, 1], [2.01, 0.4], [3.03, 0.17], [4.72, 0.07]]).forEach(([m, lvl]) => {
                let o = ac.createOscillator(), og = ac.createGain();
                o.type = 'sine'; o.frequency.value = f * m;
                og.gain.setValueAtTime(lvl * vol, t);
                og.gain.exponentialRampToValueAtTime(0.0001, t + dur * (0.3 + 0.7 / m));
                o.connect(og); og.connect(g);
                o.start(t); o.stop(t + dur + 0.05);
            });
            g.connect(this.bus);
        },

        // A piano is a struck string that is *nearly* harmonic — the stretch is a fraction of a
        // percent, not the dulcimer's two — plus the hammer itself, which is the felt thump the
        // ear uses to tell a piano from a bell. Same oscillator bank, two different numbers.
        piano(t, f, dur, vol) {
            this.struck(t, f, dur, vol, [[1, 1], [2.002, 0.42], [3.008, 0.2], [4.02, 0.09], [5.04, 0.04]]);
            let ac = this.ac, src = this.noise(0.03), lp = ac.createBiquadFilter(), g = ac.createGain();
            lp.type = 'lowpass'; lp.frequency.value = Math.min(f * 6, 5000);
            g.gain.setValueAtTime(vol * 0.22, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
            src.connect(lp); lp.connect(g); g.connect(this.bus);
            src.start(t); src.stop(t + 0.04);
        },

        // The one voice in here that is not pretending to be wood or gut: two saws a few cents
        // apart through a resonant lowpass that falls over the note. The detune is the width and
        // the falling filter is the movement — an analogue synth is those two things.
        synth(t, f, dur, vol) {
            let ac = this.ac, lp = ac.createBiquadFilter(), g = ac.createGain();
            // Q 6 is a filter singing at its cutoff, which is the exact sound of cheap plastic
            // preset; 2.5 still sweeps audibly but stops whistling. The ceiling comes down with
            // it — above 4.5 kHz a detuned saw pair is fizz, not brightness (#98).
            lp.type = 'lowpass'; lp.Q.value = 2.5;
            lp.frequency.setValueAtTime(Math.min(f * 6, 4500), t);
            lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.4, 110), t + Math.min(dur, 1.5));
            [-7, 7].forEach(cents => {
                let o = ac.createOscillator();
                o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = cents;
                o.connect(lp); o.start(t); o.stop(t + dur + 0.08);
            });
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(vol * 0.5, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            lp.connect(g); g.connect(this.bus);
        },

        // Brass. A horn is a sawtooth whose filter snaps open on the attack and settles back:
        // that rising brightness is the whole signature, and without it a saw is just a saw.
        horn(t, f, dur, vol) {
            let ac = this.ac, o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
            o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.992, t);
            o.frequency.linearRampToValueAtTime(f, t + 0.05);        // the lip finding the note
            lp.type = 'lowpass'; lp.Q.value = 1.4;
            lp.frequency.setValueAtTime(Math.min(f * 1.5, 9000), t);
            lp.frequency.linearRampToValueAtTime(Math.min(f * 7, 12000), t + 0.09);
            lp.frequency.linearRampToValueAtTime(Math.min(f * 3.2, 10000), t + dur);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(vol, t + 0.05);
            g.gain.setValueAtTime(vol, t + dur * 0.8);
            g.gain.linearRampToValueAtTime(0.0001, t + dur);
            o.connect(lp); lp.connect(g); g.connect(this.bus);
            o.start(t); o.stop(t + dur + 0.05);
        },

        // Double reed — zurna outdoors, duduk indoors. A square wave is the reed's buzz; the
        // narrow bandpass a fifth and a bit above is the bore that turns buzz into a voice.
        reed(t, f, dur, vol) {
            let ac = this.ac, o = ac.createOscillator(), bp = ac.createBiquadFilter(), g = ac.createGain();
            let vib = ac.createOscillator(), va = ac.createGain();
            o.type = 'square'; o.frequency.value = f;
            vib.type = 'sine'; vib.frequency.value = 5.5;
            va.gain.setValueAtTime(0.0001, t);
            va.gain.linearRampToValueAtTime(f * 0.01, t + Math.min(0.4, dur * 0.7));
            vib.connect(va); va.connect(o.frequency);
            bp.type = 'bandpass'; bp.frequency.value = Math.min(f * 3, 4200); bp.Q.value = 3.2;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(vol, t + 0.035);
            g.gain.setValueAtTime(vol, t + dur * 0.85);
            g.gain.linearRampToValueAtTime(0.0001, t + dur);
            o.connect(bp); bp.connect(g); g.connect(this.bus);
            o.start(t); vib.start(t); o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
        },

        // Shaker, tambourine: filtered noise with a tail. Everything that isn't a skin.
        shake(t, dur, f, vol) {
            let ac = this.ac, src = this.noise(dur), bp = ac.createBiquadFilter(), g = ac.createGain();
            bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 0.9;
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            src.connect(bp); bp.connect(g); g.connect(this.bus);
            src.start(t); src.stop(t + dur + 0.02);
        },

        // ---- the electric half (#98) ----
        // Ten battle bands in one idiom is one band; the ask was synthwave, rock, pop,
        // country, darksynth, folk and disco, and none of those are playable on a palette of
        // lutes and horns. What follows is the smallest set of voices that makes them
        // possible — a dance kit, a bass, a guitar, and the sound of the fight itself.

        // The acoustic drum() is a taiko: bandpassed noise around 190 Hz. A dance kick is the
        // opposite — barely any noise, a sine dropping fast, and a click on top, because a
        // phone speaker cannot reproduce the fundamental at all and the click is what is left.
        kick(t, vol) {
            let ac = this.ac, o = ac.createOscillator(), g = ac.createGain();
            o.frequency.setValueAtTime(155, t);
            o.frequency.exponentialRampToValueAtTime(41, t + 0.09);
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
            o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.3);
            let src = this.noise(0.012), hp = ac.createBiquadFilter(), cg = ac.createGain();
            hp.type = 'highpass'; hp.frequency.value = 1400;
            cg.gain.setValueAtTime(vol * 0.5, t);
            cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
            src.connect(hp); hp.connect(cg); cg.connect(this.bus);
            src.start(t); src.stop(t + 0.02);
        },

        // The backbeat, and it is two things at once: a band of noise for the wires under the
        // head and a short tuned thud for the head itself. Noise alone is a hiss, the tone
        // alone is a tom.
        snare(t, vol) {
            let ac = this.ac, src = this.noise(0.2), hp = ac.createBiquadFilter(), g = ac.createGain();
            hp.type = 'highpass'; hp.frequency.value = 1100;
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
            src.connect(hp); hp.connect(g); g.connect(this.bus);
            src.start(t); src.stop(t + 0.22);
            [188, 331].forEach((f, i) => {
                let o = ac.createOscillator(), og = ac.createGain();
                o.type = 'triangle'; o.frequency.value = f;
                og.gain.setValueAtTime(vol * (i ? 0.3 : 0.5), t);
                og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
                o.connect(og); og.connect(this.bus); o.start(t); o.stop(t + 0.1);
            });
        },

        // Not one clap but a room of them: three bursts a few milliseconds apart and a longer
        // tail. The scatter is the entire effect — a single burst is a snare with the tone
        // missing, which is why a drum machine without it never sounded like a disco.
        clap(t, vol) {
            let ac = this.ac;
            [0, 0.009, 0.019, 0.03].forEach((dt, i) => {
                let tail = i === 3, dur = tail ? 0.18 : 0.02;
                let src = this.noise(dur), bp = ac.createBiquadFilter(), g = ac.createGain();
                bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.8;
                g.gain.setValueAtTime(vol * (tail ? 0.55 : 1), t + dt);
                g.gain.exponentialRampToValueAtTime(0.0001, t + dt + dur);
                src.connect(bp); bp.connect(g); g.connect(this.bus);
                src.start(t + dt); src.stop(t + dt + dur + 0.02);
            });
        },

        // Steel meeting steel, behind the band and never in front of it. The first version led
        // with tuned partials around 600 Hz and came back as **a cowbell** — which is fair,
        // because two inharmonic tones down there *is* how a cowbell is made. A blade is the
        // other way round: almost all of it is a very bright, very short noise transient, and
        // the ring on top is thin, high and quiet. Partials close enough together to beat
        // against each other, rolled per hit so a row of clashes is a fight, not a machine.
        clang(t, vol) {
            let ac = this.ac, src = this.noise(0.09), hp = ac.createBiquadFilter(), g = ac.createGain();
            hp.type = 'highpass'; hp.frequency.value = 3600;
            g.gain.setValueAtTime(vol * 1.6, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
            src.connect(hp); hp.connect(g); g.connect(this.bus);
            src.start(t); src.stop(t + 0.1);
            this.struck(t + 0.004, 2400 + Math.random() * 900, 0.5, vol * 0.22,
                        [[1, 1], [1.41, 0.8], [1.93, 0.55], [2.37, 0.35]]);
        },

        // A blade going past: one narrow band of noise sweeping up and back down. Nothing
        // else is needed — a moving resonance is how the ear recognises something passing it.
        whoosh(t, vol) {
            let ac = this.ac, src = this.noise(0.26), bp = ac.createBiquadFilter(), g = ac.createGain();
            bp.type = 'bandpass'; bp.Q.value = 3.5;
            bp.frequency.setValueAtTime(500, t);
            bp.frequency.exponentialRampToValueAtTime(2600, t + 0.11);
            bp.frequency.exponentialRampToValueAtTime(420, t + 0.26);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(vol, t + 0.1);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
            src.connect(bp); bp.connect(g); g.connect(this.bus);
            src.start(t); src.stop(t + 0.28);
        },

        // A line of men shouting, far enough off to be texture. Noise through two vowel
        // formants with a slow swell: close up it would be comic, at this level and this
        // distance it is a crowd, and it is mixed to sit under everything.
        roar(t, vol) {
            let ac = this.ac, src = this.noise(0.9), g = ac.createGain();
            [700, 1150].forEach(f => {
                let bp = ac.createBiquadFilter();
                bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 5;
                src.connect(bp); bp.connect(g);
            });
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(vol, t + 0.3);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
            g.connect(this.bus); src.start(t); src.stop(t + 0.92);
        },

        // Synth bass. `synth()` sweeps its filter over the best part of a second, which is a
        // pad's gesture; a bass has to be gone before the next eighth arrives, so the envelope
        // is the difference between them, not the waveform. A sine doubles the saw because
        // nothing the player owns reproduces 55 Hz — the sine at least leaves a harmonic to fold.
        sub(t, f, dur, vol) {
            let ac = this.ac, lp = ac.createBiquadFilter(), g = ac.createGain();
            lp.type = 'lowpass'; lp.Q.value = 4;
            lp.frequency.setValueAtTime(Math.min(f * 14, 2600), t);
            lp.frequency.exponentialRampToValueAtTime(Math.max(f * 2, 90), t + Math.min(dur, 0.3));
            let saw = ac.createOscillator(), sg = ac.createGain();
            saw.type = 'sawtooth'; saw.frequency.value = f;
            sg.gain.value = 0.5; saw.connect(sg); sg.connect(lp);
            let sin = ac.createOscillator();
            sin.type = 'sine'; sin.frequency.value = f; sin.connect(lp);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            lp.connect(g); g.connect(this.bus);
            [saw, sin].forEach(o => { o.start(t); o.stop(t + dur + 0.05); });
        },

        // Electric guitar: two detuned saws folded through a waveshaper, then a cabinet — a
        // lowpass near 3 kHz, which is the speaker rather than the amp. Distortion without
        // that filter is a fizz; the cab is the whole difference between fuzz and a guitar.
        // The curve is built once and kept: it is the same 1024 numbers for every note.
        dist(t, f, dur, vol) {
            let ac = this.ac, ws = ac.createWaveShaper(), cab = ac.createBiquadFilter();
            let body = ac.createBiquadFilter(), pre = ac.createGain(), g = ac.createGain();
            if(!this._curve) {
                let n = 1024, c = new Float32Array(n);
                // Drive 3.5, not 5: past tanh's knee the odd harmonics stop growing and only the
                // fizz does. A real amp is driven until it sings, not until it buzzes (#98).
                for(let i = 0; i < n; i++) c[i] = Math.tanh((i / (n - 1) * 2 - 1) * 3.5);
                this._curve = c;
            }
            ws.curve = this._curve; ws.oversample = '2x';
            cab.type = 'lowpass'; cab.frequency.value = 2400; cab.Q.value = 0.8;
            // The cabinet is a wooden box as well as a speaker, and the bump at 220 Hz is the
            // box. Without it the lowpass alone reads as a muffled buzzer.
            body.type = 'peaking'; body.frequency.value = 220; body.Q.value = 1.2; body.gain.value = 4;
            pre.gain.value = 0.45;
            [-6, 6].forEach(cents => {
                let o = ac.createOscillator();
                o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = cents;
                o.connect(pre); o.start(t); o.stop(t + dur + 0.05);
            });
            // Held, then released: a guitar note does not decay like a struck one, and the
            // sustain is clamped off zero so a stab cannot put two events out of order.
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
            g.gain.setValueAtTime(vol, t + Math.max(dur * 0.7, 0.02));
            g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, 0.05));
            pre.connect(ws); ws.connect(cab); cab.connect(body); body.connect(g); g.connect(this.bus);
        },

        // The percussion alphabet a band's `drums` string is written in: loud and soft skin,
        // rim, shaker, tambourine. One table beats a switch, and a band reads as a rhythm you
        // can see at a glance. An anvil lived here too and was struck from the roster: a
        // metallic hit in the middle of a battle is a scrape, not a weapon (#97).
        HITS: {
            O: ['drum', true, 0.38], o: ['drum', true, 0.2], X: ['drum', false, 0.26],
            x: ['drum', false, 0.15], s: ['shake', 0.05, 6200, 0.05], S: ['shake', 0.09, 5200, 0.09],
            t: ['shake', 0.3, 3800, 0.06], H: ['shake', 0.26, 7600, 0.045],
            // The dance kit and the fight (#98). `s`/`H` double as closed and open hi-hat —
            // a bandpass at 6–8 kHz already is one, so no new voice was written for it.
            K: ['kick', 0.6], k: ['kick', 0.34], N: ['snare', 0.3], n: ['snare', 0.13],
            c: ['clap', 0.22], W: ['clang', 0.13], w: ['whoosh', 0.1], R: ['roar', 0.11]
        },
        // Placing the parts (#98). Only the reverb was ever stereo — every dry voice connects to
        // `this.bus` and so landed dead centre, which is a mono record with a wide tail on it.
        // A part is positioned by pointing the bus at a panner for the length of the call:
        // cheaper than threading a destination argument through fourteen voices, and the
        // panners hang off the real bus, so `retire()` still silences the lot in one fade.
        // Drums and the lead stay centre — that is where an ear expects the beat and the tune;
        // everything else opens up around them.
        PANS: {
            arp: -0.4, ost: 0.22, harm: 0.45, pad: [-0.55, 0.55, 0], drone: [-0.5, 0.5],
            // The kit: kick and snare are the centre of the record, the hands and the metal
            // are what a room hears from the sides.
            hit: { s: 0.35, S: 0.35, t: -0.3, H: -0.4, c: 0.3, W: -0.5, w: 0.5, R: 0, x: 0.25, X: 0.25 }
        },

        // Cached per bus, because the bus is rebuilt with every piece and a node may not be
        // connected across two AudioContexts.
        part(pan, fn) {
            let real = this.bus;
            if(pan) {
                let c = this._pans;
                if(!c || c.bus !== real) c = this._pans = { bus: real, m: {} };
                if(!c.m[pan]) { let n = this.ac.createStereoPanner(); n.pan.value = pan; n.connect(real); c.m[pan] = n; }
                this.bus = c.m[pan];
            }
            fn();
            this.bus = real;
        },

        hit(c, t) { let h = this.HITS[c]; if(h) this.part(this.PANS.hit[c] || 0, () => this[h[0]](t, ...h.slice(1))); },
        // The drone carries the harmony the period actually used: a held tonic and its fifth
        // (organum), not a chord progression. Retuned rather than restarted, so a new piece
        // slides into place instead of cutting.
        setDrone(f, bright) {
            let ac = this.ac;
            if(!this._dr) this._dr = [0, 1].map(i => {   // rebuilt with the bus: retire() stops the old pair
                let o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
                o.type = 'sawtooth'; lp.type = 'lowpass'; lp.Q.value = 0.6; g.gain.value = 0;
                o.connect(lp); lp.connect(g); o.start();
                this.part(this.PANS.drone[i], () => g.connect(this.bus));
                return { o, lp, g };
            });
            this._dr.forEach((v, i) => {
                // 1.4983, not 1.5: a fifth a shade narrow beats slowly, like two real strings
                let vf = f * (i ? 1.4983 : 1);
                v.o.frequency.setTargetAtTime(vf, ac.currentTime, 0.8);
                v.lp.frequency.setTargetAtTime(vf * (bright ? 4 : 2.2), ac.currentTime, 0.8);
                v.g.gain.setTargetAtTime(bright ? 0.05 : 0.035, ac.currentTime, 1.2);
            });
        },

        // A generated impulse response: exponentially decaying noise. Ten lines, and the
        // difference between a stone hall and a ringtone.
        verb() {
            let ac = this.ac, sr = ac.sampleRate, len = Math.floor(sr * 2.2);
            let b = ac.createBuffer(2, len, sr);
            for(let c = 0; c < 2; c++) {
                let d = b.getChannelData(c);
                for(let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
            }
            let cv = ac.createConvolver(); cv.buffer = b;
            return cv;
        },

        // ---- transport ----

        // Web Audio's clock is the only accurate one but cannot fire callbacks, so notes go in
        // ahead of time and a plain timer tops the queue up — the standard two-clock
        // arrangement, which makes setTimeout's drift harmless.
        LOOKAHEAD: 0.6,

        // Rolls a fresh piece: band, mode, key, tempo, chords, motif. The band comes first —
        // it decides the metre, which decides which rhythms are even legal.
        newPiece(battle) {
            let c = battle ? this.BATTLE : this.MAP, r = Math.random;
            let any = a => a[Math.floor(r() * a.length)];
            // Never the band that just finished: with ten to choose from a repeat is one roll
            // in ten, and back-to-back is exactly what the 🎵 Sıradaki button is pressed to
            // escape. `_last` rather than `this.piece.band`, because a skip goes through
            // retire() — which has already thrown the piece away by the time this runs.
            let pool = this.BANDS.filter(x => !!x.battle === battle && x !== this._last);
            let b = this._last = any(pool.length ? pool : this.BANDS.filter(x => !!x.battle === battle));
            let sum = a => a.reduce((x, y) => x + y, 0);
            this.piece = {
                battle, band: b, left: b.len, bar: 0,
                mode: any(b.modes || c.modes),
                tonic: c.tonic[0] + Math.floor(r() * (c.tonic[1] - c.tonic[0] + 1)),
                bpm: b.bpm[0] + r() * (b.bpm[1] - b.bpm[0]),
                prog: any(this.PROGS),
                motif: { r: any(this.RHYTHMS.filter(x => sum(x) === b.beats)), c: any(this.CONTOURS) }
            };
            // Everything below needs a live graph; above this line the roll is pure data,
            // which is what lets the no-repeat rule be tested without an AudioContext.
            if(this.bus) {
                this.bus.gain.value = b.gain;
                // A drone only suits a band whose harmony sits still. Under a guitar working
                // through a VI or a VII it is mud, so most of the map bands do without.
                if(b.drone) this.setDrone(this.hz(this.piece.tonic, this.piece.mode, 0) / 2, battle);
                else if(this._dr) this._dr.forEach(v => v.g.gain.setTargetAtTime(0, this.ac.currentTime, 0.5));
            }
            let el = document.getElementById('music-now');   // ⚙️ Ayarlar, if it happens to be open
            if(el) el.innerHTML = this.nowPlaying();
        },

        // What the settings screen shows. The piece changes every minute or so, so newPiece
        // writes straight into the row when the panel is open rather than leaving it stale.
        nowPlaying() {
            let p = this.piece;
            if(!p || !this._mode) return T('🎶 Müzik kapalı');
            let mode = p.mode[0].toUpperCase() + p.mode.slice(1);
            return T`🎶 Çalan: <b>${T(p.band.name)}</b> · ${mode}`;
        },

        // One bar of whatever the band declares. Twenty arrangements and one renderer: the
        // variety belongs in the BANDS table, where it can be read, not in twenty near-copies
        // of the same forty lines (#97).
        emit(spb) {
            let p = this.piece, b = p.band, t = this._at, bar = b.beats * spb;
            let root = p.prog[p.bar % p.prog.length], last = p.bar % p.prog.length === p.prog.length - 1;
            let f = d => this.hz(p.tonic, p.mode, d);
            if(b.drums) {
                // A `drums` array is a set of stages the piece walks through, one after another
                // over its `len` bars: the same grid, filling in. That is a build-up, and it is
                // the one way percussion is allowed to be interesting on a calm map.
                let g = Array.isArray(b.drums)
                    ? b.drums[Math.min(b.drums.length - 1, Math.floor(p.bar / b.len * b.drums.length))]
                    : b.drums;
                let n = g.length, st = bar / n;
                for(let i = 0; i < n; i++) this.hit(g[i], t + i * st);
                // A fill over the last half of the closing bar: the one place the drums stop
                // being a pulse and say something, and it lands where the melody turns around.
                if(last) [0, 1, 2, 3].forEach(i => this.drum(t + bar - 4 * st + i * st, i === 3, 0.22 + i * 0.06));
            }
            if(b.arp) this.part(this.PANS.arp, () => {
                let n = b.arp.pat.length, st = bar / n;
                b.arp.pat.forEach((d, i) => {
                    // Thumb on the root at the halves, fingers on the chord tones between —
                    // how a picking hand actually moves, rather than a run up the scale.
                    let bass = b.arp.bass && i % (n / 2) === 0;
                    this[b.arp.v](t + i * st, f(bass ? root - 7 + (i ? 4 : 0) : root + d),
                                  st * (b.arp.hold || 2.6), b.arp.vol * (bass ? 2 : 1));
                });
            });
            if(b.ost) this.part(this.PANS.ost, () => {
                let st = bar / b.ost.n, p2 = b.ost.pat;
                // With a `pat` the engine room becomes a bass *line*; without one it pedals on
                // the root, which is what anything epic wants underneath it.
                for(let i = 0; i < b.ost.n; i++)
                    this[b.ost.v](t + i * st, f(root + (p2 ? p2[i % p2.length] : 0)) / 2, st * 0.75, b.ost.vol);
            });
            // A chord's tones go to different places, which is the one thing that makes a pad
            // sound like players rather than a preset.
            if(b.pad) b.pad.deg.forEach((d, i) => this.part(this.PANS.pad[i] || 0, () =>
                this[b.pad.v](t, f(root + (b.pad.lift || 0) + d), bar * 0.95, b.pad.vol * [1, 0.72, 0.55][i])));
            // The lead breathes: `bars` of melody in every four, the rest off. Always playing
            // is exhausting to listen to, and a chill screen is where that shows.
            // `alt` is a second lead the band trades four-bar phrases with: another
            // instrument, another register, the motif answering itself. Without it a piece is
            // one melody for two minutes, which is what "hep aynı melodi" means.
            let ld = b.lead, answer = b.lead && b.lead.alt && Math.floor(p.bar / 4) % 2;
            if(answer) ld = Object.assign({}, b.lead, b.lead.alt);
            if(ld && p.bar % 4 < ld.bars) this.bar(p, ld.lift, answer).forEach(n => {
                let dur = n.beats * spb * (ld.hold || 0.92);
                let d = ld.stab ? Math.min(dur, spb * 0.45) : dur;
                this[ld.v](t + n.at * spb, f(n.deg), d, ld.vol);
                if(b.harm) this.part(this.PANS.harm, () => this[b.harm.v](t + n.at * spb, f(n.deg + b.harm.deg), d, b.harm.vol));
            });
            p.bar++;
            this._at = t + bar;
        },

        tick() {
            if(!this.ac || !this.piece) return;
            let now = this.ac.currentTime, spb = 60 / this.piece.bpm;
            // A backgrounded tab throttles timers; the queue is rebased rather than firing a
            // burst of notes whose start times are already in the past.
            if(this._at < now) this._at = now + 0.1;
            while(this._at < now + this.LOOKAHEAD) {
                this.emit(spb);
                if(--this.piece.left <= 0) { this.newPiece(this.piece.battle); spb = 60 / this.piece.bpm; }
            }
            this._timer = setTimeout(() => this.tick(), 150);
        },

        // A whole phrase is queued at once, so when the battle starts there can still be ten
        // seconds of lute in the pipeline — and Web Audio has no "cancel what I scheduled".
        // Every note of a piece therefore hangs off one bus gain: retiring the bus silences
        // the lot. The 0.25s fade is not politeness, it is the crossfade into the drums.
        retire() {
            let t = this.ac.currentTime;
            if(this._dr) this._dr.forEach(v => { v.g.gain.setTargetAtTime(0, t, 0.12); v.o.stop(t + 0.6); });
            this._dr = null;
            let old = this.bus;
            this.bus = null; this.piece = null; this._pans = null;
            if(!old) return;
            old.gain.setTargetAtTime(0, t, 0.08);
            setTimeout(() => old.disconnect(), 1500);   // long after the fade: an early disconnect clicks
        },

        // Coming back from another app, iOS leaves the context suspended and throttles the
        // timer chain to a stop. Resuming off a visibilitychange is not enough on its own —
        // the music only really came back after toggling 🔇, because a tap is a gesture and a
        // gesture is what the browser actually wants (#96). So the same wake hangs off both,
        // and a context that was suspended has its pieces rebuilt rather than merely
        // re-armed: an interrupted iOS context can come back "running" and silent.
        wake() {
            if(document.hidden || !this._mode) return;
            let was = this.ac && this.ac.state, ac = Game.ac();
            if(!ac) return;
            // resume() is a promise, so reading ac.state on the next line is a race — and
            // losing it is precisely why tapping did nothing while toggling 🔇 worked: that
            // path rebuilds without asking the state at all.
            ac.resume().then(() => {
                if(document.hidden || !this._mode) return;
                if(was === 'running' && this.bus) { clearTimeout(this._timer); this.tick(); return; }
                let m = this._mode;
                this._mode = null;
                this.set(m);
                this.revive();
            }).catch(() => {});   // refused without a gesture: the next tap tries again
        },

        // A context that reports `running` while its clock stands still is dead — WebKit
        // leaves one like that after an audio interruption, and nothing in its state says so.
        // Measured in the browser pane: after a suspend/resume the old context sat at
        // currentTime 0.02 forever while a brand new one ticked normally. So the clock gets
        // half a second to move, and if it hasn't, the whole AudioContext is thrown away and
        // rebuilt — which is the one thing toggling 🔇 could not do either (#96).
        revive() {
            let ac = this.ac, t0 = ac.currentTime;
            setTimeout(() => {
                if(!this._mode || this.ac !== ac || ac.currentTime > t0) return;
                let m = this._mode;
                this.set(null);
                try { ac.close(); } catch(e) {}
                Game._audio = null;     // Game.ac() hands out a fresh one
                this.out = null;        // and the hall is rebuilt with it
                this._mode = null;
                this.set(m);
            }, 500);
        },

        // A bar is queued ahead of the clock and Web Audio cannot un-schedule it, so a skip
        // retires the whole bus — the same move `revive()` makes — and `set` rolls a fresh
        // band on the way back in.
        skip() { let m = this._mode; if(!m) return; this.set(null); this.set(m); },

        // The only entry point: 'map', 'battle', or null for silence.
        set(mode) {
            if(mode === this._mode) return;
            clearTimeout(this._timer); this._timer = null;
            let ac = mode ? Game.ac() : this.ac;
            if(!ac) return;                      // no Web Audio: the game is simply quiet
            this.ac = ac;
            this.retire();
            this._mode = mode;
            if(!mode) return;
            if(!this.out) {                      // the hall outlives the pieces played in it
                this.out = ac.createGain();
                this.wet = ac.createGain(); this.wet.gain.value = 0.3;
                this.cv = this.verb();
                this.cv.connect(this.wet); this.wet.connect(this.out);
                // Measured peak sits around a quarter of full scale, but the parts are
                // independent: a guitar bass note, a flute entry and a reverb tail can land
                // on the same sample. A limiter costs one node and removes the whole class
                // of "it crackled once" bugs.
                let lim = ac.createDynamicsCompressor();
                lim.threshold.value = -6; lim.knee.value = 3; lim.ratio.value = 12;
                lim.attack.value = 0.003; lim.release.value = 0.25;
                this.out.connect(lim); lim.connect(ac.destination);
            }
            // Two listeners, one wake — see wake() for why a tap is needed as well as a
            // visibility change. Bound once and never again: `out` is rebuilt when a dead
            // context is replaced, so the graph block above is not the "runs once" place.
            if(!this._bound) {
                this._bound = true;
                document.addEventListener('visibilitychange', () => this.wake());
                document.addEventListener('pointerdown', () => {
                    if(this._mode && this.ac && this.ac.state !== 'running') this.wake();
                });
            }
            this.bus = ac.createGain();
            // Measured: with every part at its own level Cenk Korosu came out three times the
            // map's loudness (rms 0.147 against 0.051) — an army of strings and a choir
            // against one guitar. Levelled with one gain per band (set in newPiece) rather
            // than by re-tuning eight numbers, so each arrangement stays as written.
            this.bus.connect(this.out); this.bus.connect(this.cv);
            this.volume();
            this.newPiece(mode === 'battle');
            this._at = ac.currentTime + 0.2;
            this.tick();
        },

        // 1.2 puts the music a little below the transaction SFX (0.12 peak): measured peak
        // lands near 0.16 at the default volume, which is background, not foreground.
        volume() { if(this.out) this.out.gain.value = 1.2 * Game.opt('volume'); },

        // Music follows the screen. Called from showScreen (which knows the screen) and from
        // applySettings (which knows the settings), so neither has to know about the other.
        sync() {
            let live = document.getElementById('main-ui');
            this.volume();
            let el = document.getElementById('music-now');
            if(el) setTimeout(() => { let e2 = document.getElementById('music-now'); if(e2) e2.innerHTML = this.nowPlaying(); });
            this.set(!live || !live.classList.contains('active') || Game.opt('muted') || !Game.opt('music') ? null
                : document.body.classList.contains('in-battle') ? 'battle' : 'map');
        }
    },


    // ============ SETTINGS (#55 item 7) ============
    // One screen, one read gate: every setting's default lives in OPTS, and a deviating
    // key is written to state.settings (so it enters the save and stays blank in an old save).
    OPTS: { muted: false, volume: 0.6, music: true, reducedMotion: 'auto', gore: true, frameGate: true, fontScale: 1, autosave: true, lite: 'auto', difficulty: 'normal', edgePan: 'auto' },

    // Difficulty is a single pair of multipliers: damage **taken** and **dealt**. No other
    // number moves — a wolf pack and a lord's army pass through the same gate, so the
    // balance table (arrow range, charge multiplier, armor math) stays a single piece.
    // Stays raw, translated at display with `T`.
    DIFFS: {
        easy:   { taken: 0.6, dealt: 1.25, name: 'Kolay', note: 'Aldığın hasar %40 az, verdiğin %25 fazla' },
        normal: { taken: 1,   dealt: 1,    name: 'Orta',  note: 'Tasarlandığı denge' },
        hard:   { taken: 1.5, dealt: 0.85, name: 'Zor',   note: 'Aldığın hasar %50 fazla, verdiğin %15 az' }
    },
    diff() { return this.DIFFS[this.opt('difficulty')] || this.DIFFS.normal; },
    // If the target is on your side this is the damage "taken", otherwise "dealt".
    // The single call site is `Battle.afterArmor` — melee and arrows both pass through it.
    dmgMult(tgt) { let d = this.diff(); return tgt && tgt.isPlayerTeam ? d.taken : d.dealt; },
    opt(k) { let v = (state.settings || {})[k]; return v === undefined ? this.OPTS[k] : v; },

    // A JS literal that survives a double-quoted inline handler: JSON.stringify('auto')
    // is `"auto"`, and those quotes closed the onclick attribute mid-call — the button
    // then failed to compile (SyntaxError: Unexpected token '}') and did nothing (#94).
    lit(v) { return JSON.stringify(v).replace(/"/g, '&quot;'); },
    // The map panning when the mouse rests at the screen edge is desktop-only: on touch
    // there's no cursor, the last touch's coordinate stays in Input.mouse, and if it lands
    // on the edge the map would pan on its own. 'auto' asks the device, the two extremes are the player's call.
    edgePan() { let v = this.opt('edgePan'); return v === 'auto' ? !this.isTouch() : !!v; },
    setOpt(k, v) {
        (state.settings || (state.settings = {}))[k] = v;
        this.applySettings();
        if(document.getElementById('settings-panel')) this.showSettings();
    },
    // 'auto' reads the system's preference — an accessibility setting shouldn't be asked twice
    reduceMotion() {
        let v = this.opt('reducedMotion');
        if(v !== 'auto') return !!v;
        try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e) { return false; }
    },
    applySettings() {
        this._lite = undefined;   // the lite-mode answer is cached; it refreshes when the setting changes
        // The whole UI is rem-based; the root size scales from a single point
        document.documentElement.style.fontSize = (this.opt('fontScale') * 16) + 'px';
        document.body.classList.toggle('reduced-motion', this.reduceMotion());
        // Glass panels' backdrop-filter drops in lite mode (see style.css .lite)
        document.body.classList.toggle('lite', this.lite());
        // Screen backgrounds are set once via `dataset.bg`; if the stamp isn't cleared
        // when the mode changes, a screen entered in lite mode is left without a background once it returns to vanilla.
        document.querySelectorAll('.view[data-bg]').forEach(el => {
            delete el.dataset.bg; el.style.backgroundImage = '';
        });
        let cur = document.querySelector('.view.active');
        if(cur) this.applyViewBg(cur.id.replace(/-view$/, ''));
        this.Music.sync();   // mute, volume and the music switch all land here
    },
    // Only four tabs fit in a narrow screen's bottom strip; Quests, Saves, Sound and
    // Settings open from here (#86). The strip itself is still the one real menu — this page
    // calls the same `onclick`s, it doesn't open a second path.
    showMoreMenu() {
        let sesli = !this.opt('muted');
        let it = (ico, label, call) => `<button class="btn" style="display:flex;align-items:center;gap:0.6rem;width:100%;justify-content:flex-start;min-height:52px"
            onclick="${call}"><span style="font-size:1.3rem">${ico}</span>${label}</button>`;
        this.showModal(`<h3>${T`⋯ Daha`}</h3>
        <div style="display:flex;flex-direction:column;gap:0.5rem">
            ${it('📜', T('Görevler'), "Game.closeModal(); Game.showScreen('quests')")}
            ${it('💾', T('Kayıtlar'), 'Save.open()')}
            ${it(sesli ? '🔊' : '🔇', sesli ? T('Ses Açık') : T('Ses Kapalı'), 'Game.toggleMute(); Game.showMoreMenu()')}
            ${it('⚙️', T('Ayarlar'), 'Game.showSettings()')}
        </div>
        <button class="btn primary" style="margin-top:0.9rem" onclick="Game.closeModal()">${T`Kapat`}</button>`, '340px');
    },

    showSettings() {
        let sw = (k, on, off) => `<button class="btn${this.opt(k) ? ' primary' : ''}" style="font-size:var(--fs-sm);padding:0.25rem 0.7rem"
            onclick="Game.setOpt('${k}', ${!this.opt(k)})">${this.opt(k) ? on : off}</button>`;
        let row = (label, ctrl, note) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:0.5rem 0;border-bottom:1px solid var(--panel-border)">
            <div><div>${label}</div>${note ? `<div style="font-size:var(--fs-xs);color:var(--text-muted)">${note}</div>` : ''}</div><div style="white-space:nowrap">${ctrl}</div></div>`;
        let rm = this.opt('reducedMotion');
        let rmBtn = ['auto', true, false].map(v => `<button class="btn${rm === v ? ' primary' : ''}" style="font-size:var(--fs-sm);padding:0.25rem 0.6rem"
            onclick="Game.setOpt('reducedMotion', ${this.lit(v)})">${v === 'auto' ? T('Sistem') : v ? T('Açık') : T('Kapalı')}</button>`).join(' ');
        let fs = this.opt('fontScale');
        let fsBtn = [0.9, 1, 1.15].map(v => `<button class="btn${fs === v ? ' primary' : ''}" style="font-size:var(--fs-sm);padding:0.25rem 0.6rem"
            onclick="Game.setOpt('fontScale', ${v})">${v === 0.9 ? T('Küçük') : v === 1 ? T('Normal') : T('Büyük')}</button>`).join(' ');
        let lt = this.opt('lite');
        let liteBtn = ['auto', true, false].map(v => `<button class="btn${lt === v ? ' primary' : ''}" style="font-size:var(--fs-sm);padding:0.25rem 0.6rem"
            onclick="Game.setOpt('lite', ${this.lit(v)})">${v === 'auto' ? T('Cihaza göre') : v ? T('Açık') : T('Kapalı')}</button>`).join(' ');
        let ep = this.opt('edgePan');
        let epBtn = ['auto', true, false].map(v => `<button class="btn${ep === v ? ' primary' : ''}" style="font-size:var(--fs-sm);padding:0.25rem 0.6rem"
            onclick="Game.setOpt('edgePan', ${this.lit(v)})">${v === 'auto' ? T('Cihaza göre') : v ? T('Açık') : T('Kapalı')}</button>`).join(' ');
        let df = this.opt('difficulty');
        let dfBtn = ['easy', 'normal', 'hard'].map(v => `<button class="btn${df === v ? ' primary' : ''}" style="font-size:var(--fs-sm);padding:0.25rem 0.6rem"
            onclick="Game.setOpt('difficulty', '${v}')">${T(this.DIFFS[v].name)}</button>`).join(' ');
        let hz = this._step === Infinity ? T('ölçülmedi') : Math.round(1000 / this._step) + T(' Hz');
        this.showModal(`<div id="settings-panel"><h3>${T`⚙️ Ayarlar`}</h3>
        ${row(T('🌍 Dil'), I18N.LANGS.map(l => `<button class="btn${l.id === I18N.lang ? ' primary' : ''}" style="font-size:var(--fs-sm);padding:0.25rem 0.6rem"
            onclick="Game.setLang('${l.id}')">${l.flag} ${T(l.name)}</button>`).join(' '))}
        ${row(T('🔊 Ses'), sw('muted', T('Kapalı'), T('Açık')))}
        ${row(T('🎚️ Ses seviyesi'), `<input type="range" min="0" max="100" value="${Math.round(this.opt('volume') * 100)}"
            oninput="Game.setOpt('volume', this.value / 100)" onchange="Game.sfx('buy')" style="vertical-align:middle">
            <span style="font-size:var(--fs-sm);color:var(--text-muted)">${this.pct(this.opt('volume') * 100)}</span>`)}
        ${row(T('🎵 Müzik'), sw('music', T('Açık'), T('Kapalı')),
            T('Ortaçağ kilise makamlarında, her seferinde yeniden bestelenir: haritada sakin, savaşta davullu')
            + `<br><span id="music-now">${this.Music.nowPlaying()}</span>`)}
        ${row(T('🎞️ Hareketi azalt'), rmBtn, T('Kamera yumuşatması, kıvılcım ve arayüz animasyonları kapanır'))}
        ${row(T('📱 Hafif mod'), liteBtn, T('Bütün oyunu sadeleştirir: deniz dalgası, orman ağaçları, ocak ışığı, savaş parçacıkları ve cam bulanıklığı düşer, hedef 30 fps. Telefonda kendiliğinden açılır.'))}
        ${row(T('🖱️ Kenardan kaydırma'), epBtn, T('Fareyi haritanın kenarına götürünce kamera kayar. Dokunmatikte imleç olmadığı için kendiliğinden kapalıdır.'))}
        ${row(T('🩸 Kan ve cesetler'), sw('gore', T('Açık'), T('Kapalı')), T('Kapatmak zayıf makinede kare hızını rahatlatır'))}
        ${row(T('🖼️ Kare atlama kapısı'), sw('frameGate', T('Açık'), T('Kapalı')), `${T`Yüksek tazeleme hızlı ekranda fazla kareyi atar. Ölçülen:`} <b>${hz}</b>`)}
        ${row(T('🔠 Yazı boyutu'), fsBtn)}
        ${row(T('⚔️ Zorluk'), dfBtn, T(this.diff().note))}
        ${row(T('💾 Otomatik kayıt'), sw('autosave', T('Açık'), T('Kapalı')), T('Her oyun günü başında, halkasal 5 slot'))}
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.9rem">
            <button class="btn" onclick="Save.open()">${T`💾 Kayıtlar`}</button>
            <button class="btn" onclick="Debug.open()">${T`🐞 Debug Raporu`}</button>
            <button class="btn" onclick="Game.showKeys()">${this.isTouch() ? T`🎮 Kumanda` : T`⌨️ Tuşlar`}</button>
            <button class="btn" onclick="Game.closeModal(); Game.showScreen('map'); Game.startTutorial(true)">${T`🎓 Öğretici`}</button>
            <button class="btn" onclick="Game.closeModal(); Game.startTutorial(true, Game.BATTLE_TUTOR, Game.BTUTOR_KEY)">${T`🗡️ Savaş Öğreticisi`}</button>
            <button class="btn primary" onclick="Game.closeModal()">${T`Kapat`}</button>
        </div>
        <p style="margin-top:0.8rem;font-size:var(--fs-xs);color:var(--text-muted)">${T`WebBand ${VERSION.no} — ${VERSION.name} (${VERSION.date})`}</p>
        </div>`, '620px');
    },
    // Stays raw; translated at display with `T` (the table is built at load time,
    // when the language is still 'tr', so translating here would freeze the translation)
    KEYS: [['M', 'Harita'], ['C', 'Karakter'], ['P', 'Grup'], ['I', 'Envanter'], ['Q', 'Görevler'],
           ['K', 'Diplomasi'], ['N', 'Sıradaki müzik parçası'], ['Esc', 'Haritaya dön / modalı kapat'], ['Enter', 'Modaldeki ana düğme'],
           ['W A S D / Oklar', 'Haritada kamerayı kaydır'], ['Boşluk', 'Kamerayı oyuncuya getir'],
           ['Savaşta W A S D', 'Hareket'], ['Sol tık / Boşluk', 'Vur veya ok at'],
           ['Sağ tık / Shift', 'Blok'], ['1 2 3', 'Taktik emirleri']],
    // The touch equivalent: how to do the same things without a keyboard (#65)
    TOUCH_HELP: [['👆 Dokun', 'Hedef koy / yerleşime gir'], ['👆 Basılı tut', 'Künyeyi aç'],
                 ['✋ Sürükle', 'Haritayı kaydır'], ['🤏 İki parmak', 'Yakınlaştır / uzaklaştır'],
                 ['🎯 Beni Bul', 'Kamerayı sana getirir'], ['📋 Menü', 'Ekranlar arasında geçiş'],
                 ['🌍 Diplomasi', 'Krallıkların savaş/barış hâli'],
                 ['🎵 Sıradaki', 'Yeni bir parça besteler'],
                 ['🕹️ Sol çubuk', 'Savaşta hareket'],
                 ['⚔️ Sağ çubuk', 'Kılıca yön ver — çektiğin yere vurur, bıraktığında savurur'],
                 ['🛡️ Düğme', 'Blok — basılı tut'],
                 ['1 2 3 düğmeleri', 'Taktik emirleri'], ['✖ / Kapat', 'Modali kapatır']],
    showKeys() {
        let touch = this.isTouch(), rows = touch ? this.TOUCH_HELP : this.KEYS;
        this.showModal(`<h3>${touch ? T`🎮 Kumanda` : T`⌨️ Tuşlar`}</h3><table style="width:100%;font-size:var(--fs-md)">
        ${rows.map(([k, v]) => `<tr><td style="padding:0.25rem 0"><kbd>${T(k)}</kbd></td><td style="color:var(--text-muted)">${T(v)}</td></tr>`).join('')}
        </table><button class="btn" style="margin-top:0.8rem" onclick="Game.showSettings()">${T`← Ayarlar`}</button>`, '460px');
    },
    // --- Tutorial (#87) ---
    // Runs once on the first playthrough: shines a light over the UI and writes what it
    // is next to it. The steps are data; they stay raw Turkish, `T` is called at display.
    // If `el` is null the box appears centered and no ring is drawn.
    TUTOR: [
        { el: '#map-canvas', t: '🗺️ Kalradya',
          m: 'Gitmek istediğin yere tıkla. WASD ile haritayı gez, tekerlekle yakınlaş. Bir yerleşimin üstüne gelirsen künyesi açılır.',
          d: 'Gitmek istediğin yere dokun. Tek parmakla sürükleyerek haritayı gez, iki parmakla yakınlaştır. Bir yerleşime basılı tutarsan künyesi açılır.' },
        { el: '#chip-food', t: '🍞 Erzak',
          m: 'Ordun her gün yer. Bu rozet erzağın kaç gün yettiğini söyler; üç günün altına inince kırmızıya döner. Aç kalan asker moralini kaybeder ve firar eder.',
          d: 'Ordun her gün yer. Bu rozete dokunursan kalem kalem dökümü açılır — üç günün altına inince kırmızıya döner. Aç kalan asker firar eder.' },
        { el: '#chip-party', t: '⚔️ Grubun',
          m: 'Kaç asker taşıyabileceğini Liderlik niteliğin, İdare yeteneğin ve namın belirler. Köyden gönüllü toplar, handan paralı asker tutarsın.',
          d: 'Kaç asker taşıyabileceğini Liderlik niteliğin, İdare yeteneğin ve namın belirler. Köyden gönüllü toplar, handan paralı asker tutarsın.' },
        { el: '#map-hud', t: '🧭 Künye',
          m: 'Bulunduğun arazi hızını değiştirir — yoldan gitmek hızlı, nehir geçmek yavaştır. ⏳ Bekle ile kamp kurup zamanı geçirirsin: yaran iyileşir, turnuvalar açılır.',
          d: 'Bulunduğun arazi hızını değiştirir — yoldan gitmek hızlı, nehir geçmek yavaştır. ⏳ Bekle ile kamp kurup zamanı geçirirsin: yaran iyileşir, turnuvalar açılır.' },
        { el: '#sidebar', t: '📋 Ekranlar',
          m: 'Karakterin, grubun, çantan ve görevlerin buradan açılır. Kısayolları da var: M C P I Q.',
          d: 'Alttaki şeritten karakterine, grubuna ve çantana bakarsın. Görevler, kayıtlar, ses ve ayarlar ⋯ Daha düğmesinin arkasında.' },
        { el: null, t: '🎯 İlk işin',
          m: 'Kesende 250 dinar var ve yalnızsın. En yakın köye git: gönüllü topla, pazardan erzak al, sonra bir çapulcu çetesi avla. Şehirdeki handa görev ve paralı asker bulursun.',
          d: 'Kesende 250 dinar var ve yalnızsın. En yakın köye git: gönüllü topla, pazardan erzak al, sonra bir çapulcu çetesi avla. Şehirdeki handa görev ve paralı asker bulursun.' }
    ],
    TUTOR_KEY: 'webband_tutor_done',
    // Battle tutorial (#88) — once on the first battle. Same machine, a separate list and a
    // separate flag. Since a touch step's target is hidden on desktop (`#touch-ui`),
    // `tutorStep`'s "skip the invisible step" rule handles the device split on its own.
    BATTLE_TUTOR: [
        { el: '#battle-canvas', t: '🗡️ Meydan',
          m: 'WASD ile yürürsün ve kılıcın imlecin baktığı yere gider — yürüdüğün yere değil. Sol tık savurur, sağ tık (ya da Shift) kalkanı kaldırır: blok yalnız önden geleni keser.',
          d: 'Sol çubukla yürür, sağ çubukla kılıcına yön verirsin. Nişanın nereye baktığını oyuncunun önündeki sarı yay gösterir.' },
        { el: '#tstick', t: '🕹️ Sol çubuk',
          m: 'Hareket.',
          d: 'Hareket. Parmağını nereye çekersen oraya yürürsün.' },
        { el: '#tastick', t: '⚔️ Sağ çubuk',
          m: 'Nişan.',
          d: 'Kılıcın yönü. Çektiğin yön nişanındır, parmağını kaldırınca savurur — sürüklemeden dokunmak son yöne vurur. Yayın varsa aynı düğme ok atar.' },
        { el: null, t: '🚩 Emirler',
          m: 'Savaşın içinde emir fırsatları doğar: 1 Takip, 2 Hücum, 3 Mevzi. Kapalı emre basarsan adamların duymaz — emir açılınca kütüğe düşer.',
          d: 'Savaşın içinde emir fırsatları doğar: Takip / Hücum / Mevzi düğmeleri. Kapalı emre basarsan adamların duymaz — emir açılınca kütüğe düşer.' },
        { el: '#btn-surrender', t: '🏳️ Kaybediyorsan',
          m: 'Teslim ol her an açık: esir düşersin, paran ve namın yanar ama ordun tamamen kırılmaz. Sen ölürsen savaş bitmez — bayılırsın, adamların dövüşmeye devam eder.',
          d: 'Teslim ol her an açık: esir düşersin, paran ve namın yanar ama ordun tamamen kırılmaz. Sen ölürsen savaş bitmez — bayılırsın, adamların dövüşmeye devam eder.' },
        { el: null, t: '🎯 İki ipucu',
          m: 'Zırhlı düşmana kılıç işlemez: mızrak ve ok zırhın yarısını deler, topuz öldürmez ama bayıltır — bayılan düşman esir düşer. Ve blok yalnız önden korur, yan kanattan dolaşmak işe yarar.',
          d: 'Zırhlı düşmana kılıç işlemez: mızrak ve ok zırhın yarısını deler, topuz öldürmez ama bayıltır — bayılan düşman esir düşer. Ve blok yalnız önden korur, yan kanattan dolaşmak işe yarar.' }
    ],
    BTUTOR_KEY: 'webband_btutor_done',
    startTutorial(force, list, key) {
        this.tutorList = list || this.TUTOR;
        this.tutorKey = key || this.TUTOR_KEY;
        if(!force && localStorage.getItem(this.tutorKey)) return;
        this.tutor = 0;
        if(typeof Battle !== 'undefined' && Battle.active) Battle.paused = true;
        this.tutorStep(0);
    },
    tutorStep(i) {
        let list = this.tutorList || this.TUTOR;
        this.endTutorial(true);   // clear any previous one, don't leave the marker
        if(i < 0 || i >= list.length) return this.endTutorial();
        this.tutor = i;
        let s = list[i], el = s.el && document.querySelector(s.el);
        // If there's no target (e.g. a badge hidden on a narrow screen) the step is skipped —
        // drawing an empty ring in the corner of the screen doesn't read as a tutorial, it looks like a bug
        if(s.el && (!el || !el.offsetParent)) return this.tutorStep(i + 1);

        let box = document.createElement('div');
        box.id = 'coach-box';
        box.innerHTML = `<h4>${T(s.t)}</h4><p>${T(this.isTouch() ? s.d : s.m)}</p>
        <div class="coach-row"><span>${T`Adım`} ${i + 1}/${list.length}</span>
        <button class="btn" onclick="Game.endTutorial()">${T`Atla`}</button>
        <button class="btn primary" onclick="Game.tutorStep(${i + 1})">${i + 1 === list.length ? T`Başla` : T`Sonraki`}</button></div>`;
        document.body.appendChild(box);

        let ring = null;
        if(el) {
            let r = el.getBoundingClientRect();
            ring = document.createElement('div');
            ring.id = 'coach-ring';
            ring.style.cssText = `left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px`;
            document.body.appendChild(ring);
        }
        this.placeCoach(box, el);
        if(!ring) box.classList.add('mid');
    },
    // The box goes below the ring, above it if it doesn't fit, and is clamped into the
    // screen on both axes — same trouble as `clampTip`, but the target can also be at the center of the screen.
    placeCoach(box, el) {
        if(!el) return;
        let r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
        let pay = 12, W = innerWidth, H = innerHeight;
        let top = r.bottom + pay;
        if(top + b.height > H - 8) top = r.top - b.height - pay;
        if(top < 8) top = Math.max(8, Math.min(H - b.height - 8, r.bottom + pay));
        let left = r.left + r.width / 2 - b.width / 2;
        left = Math.max(8, Math.min(W - b.width - 8, left));
        box.style.left = left + 'px';
        box.style.top = top + 'px';
    },
    endTutorial(gecici) {
        ['coach-box', 'coach-ring'].forEach(id => { let e = document.getElementById(id); if(e) e.remove(); });
        if(gecici) return;                       // between steps: the battle stays paused
        this.tutor = null;
        if(typeof Battle !== 'undefined') Battle.paused = false;
        try { localStorage.setItem(this.tutorKey || this.TUTOR_KEY, '1'); } catch(e) {}
    },
    flash(el, ok = true) {
        if(!el) return;
        el.classList.remove('fx-flash', 'fx-flash-bad');
        void el.offsetWidth;   // reflow: the only way to retrigger the same class back to back
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
    // kind: buy | sell | error | recruit | upgrade. Flashes if el is given, flies if moneyDelta is given.
    feedback(kind, el, moneyDelta) {
        this.sfx(kind);
        this.flash(el, kind !== 'error');
        if(moneyDelta) this.floatText(document.getElementById('ui-money'),
            (moneyDelta > 0 ? '+' : '−') + Math.abs(Math.round(moneyDelta)) + '₺', moneyDelta > 0);
    },

    // The result of a trade should show inside the modal: alert() would close the market.
    marketMsg(html, ok = true) {
        this.setHtml('market-msg', `<span style="color:${ok ? 'var(--success)' : 'var(--danger)'}">${html}</span>`);
    },
    buyItem(id, n = 1) {
        if(this.marketPrice(id) === null) return alert(T('Bu eşya pazarda yok.'));
        let loc = this._marketLoc, out = false, full = false, cost = 0, can = 0;
        let free = this.cargoCap() - this.cargoLoad();   // room left in the bag (#78)
        // Price is computed unit by unit: each good bought lowers the stock, and the lowered stock
        // makes the next one pricier. (Buying in bulk at one price would be too cheap — hence the one-by-one vs. bulk difference.)
        for(; can < n; can++) {
            if(can >= free) { full = true; break; }
            if(loc && this.stock(loc, id) < 1) { out = true; break; }
            let p = this.marketPrice(id);
            if(state.player.money - cost < p) break;
            cost += p;
            if(loc) this.addStock(loc, id, -1);
        }
        if(can <= 0) {
            this.feedback('error', document.getElementById('mrow-buy-' + id));
            // Instead of silently ignoring it, it says why: no room / no stock / no money.
            return this.marketMsg(full ? T`Çantanda yer yok — taşıma sınırın ${this.cargoCap()} birim, elinde ${this.cargoLoad()} birim var. Sat, depoya koy ya da grubunu büyüt.`
                : out ? T`${T(ITEMS[id].name)} kalmadı — pazarın stoku tükendi, birkaç gün sonra gel.`
                : T`Yeterli dinarın yok — ${T(ITEMS[id].name)} ${this.marketPrice(id)}₺, kasanda ${Math.floor(state.player.money)}₺.`, false);
        }
        state.player.money -= cost;
        let ex = state.player.inventory.find(i=>i.id===id);
        if(ex) ex.qty += can; else state.player.inventory.push({...ITEMS[id], qty:can});
        this.addProficiencyXp('trade', 4 * can);
        Quests.emit('bought_item', { itemId: id, qty: can, locId: this._marketLoc ? this._marketLoc.id : null });
        let have = state.player.inventory.find(i=>i.id===id);
        this.marketMsg(`${ITEMS[id].icon} <b>${T(ITEMS[id].name)} x${can}</b> ${T`alındı · <b>-${cost}₺</b> · kasa <b>${Math.floor(state.player.money)}₺</b> · elde ${have ? have.qty : 0}`}`
            + (can < n ? ` <i>(${full ? T('çantan doldu') : out ? T('stok bitti') : T`paran ${n} taneye yetmedi`})</i>` : ''));
        this.updateTopBar(); this.refreshMarket();
        // The flash happens AFTER the refresh: the row element is rebuilt
        this.feedback('buy', document.getElementById('mrow-buy-' + id), -cost);
        this.flash(document.getElementById('mrow-sell-' + id));   // the amount you're holding changed too
    },
    sellItem(id, n = 1) {
        let idx = state.player.inventory.findIndex(i => i.id === id);
        if(idx === -1) return;
        let item = state.player.inventory[idx];
        if(item.type !== 'trade') { this.sfx('error'); return alert(T('Bu eşya pazarda satılmıyor.')); }
        let can = Math.min(n, item.qty), gain = 0;
        // What you sell enters the market's stock: each unit sold lowers the next one's price.
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
        <h4 style="color:var(--primary)">${T`👂 Köşedeki Fısıltılar`}</h4>
        <p style="font-size:var(--fs-md);color:var(--text-muted)">${T`"Kadehi sen ödersen dilim çözülür. Ne kadar doğrudur, orasını bilmem."`}</p>
        <button class="btn" onclick="Game.listenRumor('${loc.id}')">${T`👂 Söylenti Dinle (${this.RUMOR_COST} dinar, ${this.RUMOR_HOURS[0]}-${this.RUMOR_HOURS[1]} saat)`}</button>
        <hr style="border-color:var(--panel-border);margin:1.2rem 0">
        <h4 style="color:var(--primary)">${T`🎵 Köşedeki Ozan`}</h4>
        <p style="font-size:var(--fs-md);color:var(--text-muted)">${T`"Bir kadeh ve biraz gümüş, sana bir dize öğretirim. Kime okuyacağın seni ilgilendirir."`}</p>
        <div style="display:flex;flex-direction:column;gap:0.4rem;margin-top:0.6rem">`;
        POEMS.forEach(p => {
            html += state.player.poems.includes(p.id)
                ? `<button class="btn" disabled style="opacity:0.4;font-size:var(--fs-sm)">${T`${T(p.name)} (ezberinde)`}</button>`
                : `<button class="btn" style="font-size:var(--fs-sm)" onclick="Game.learnPoem('${p.id}')">${T`${T(p.name)} — ${p.cost} Dinar`}</button>`;
        });
        html += `</div>`;

        // Mercenaries — the only way to turn money directly into a ready-leveled troop
        let pool = this.mercPool(loc);
        html += `<hr style="border-color:var(--panel-border);margin:1.2rem 0">
            <h4 style="color:var(--primary)">${T`🗡️ Paralı Askerler`}</h4>
            <p style="font-size:var(--fs-md);color:var(--text-muted)">${T`"Sadakat pahalıdır, biz peşin çalışırız."`}</p>`;
        if(!pool.list.length) html += `<p style="color:var(--text-muted)">${T`Bu şehirde şu an boşta adam yok.`}</p>`;
        pool.list.forEach((m, i) => {
            let price = this.mercPrice(m);
            let space = Math.max(0, this.getPartyCapacity() - state.player.party.length);
            let max = Math.min(m.count, space, Math.floor(state.player.money / price));
            let st = this.troopStats({ name: m.name });
            html += `<div style="background:rgba(0,0,0,0.25);border:1px solid var(--panel-border);border-radius:6px;padding:0.7rem;margin-bottom:0.5rem">
                <b>${st.icon} ${T(m.name)}</b> <span style="font-size:var(--fs-sm);color:var(--text-muted)">${T`· seviye ${m.level} · ${m.count} kişi · kişi başı ${price} dinar`}</span>`;
            html += max > 0
                ? `<input type="range" id="merc-n-${i}" min="1" max="${max}" value="${max}" style="width:100%;margin:0.5rem 0"
                        oninput="Game.updateMercLabel(${i}, ${price})">
                   <button class="btn primary" id="merc-btn-${i}" style="font-size:var(--fs-sm)"
                        onclick="Game.hireMercs('${loc.id}', ${i}, +document.getElementById('merc-n-${i}').value)">${T`Tut: ${max} kişi (${max * price} Dinar)`}</button>`
                : `<div style="font-size:var(--fs-sm);color:var(--danger);margin-top:0.4rem">${space <= 0 ? T('Grubunda yer yok.') : T('Kesen yetmiyor.')}</div>`;
            html += `</div>`;
        });

        // Guildmaster
        html += `<hr style="border-color:var(--panel-border);margin:1.2rem 0">
            <h4 style="color:var(--primary)">${T`⚖️ Lonca Ustası`}</h4>
            <p style="font-size:var(--fs-md);color:var(--text-muted)">${T`Köşedeki masada, defterine bir şeyler yazıyor.`}</p>
            <button class="btn" onclick="Quests.offerMenu('guild_${loc.id}')">${T`İşi Sor`}</button>
            <button class="btn" onclick="Game.guildPrices('${loc.id}')">${state.guildPaid[loc.id] === state.time.day
                ? T`📈 Fiyat Defterine Bak` : T`📈 Fiyat Defterine Bak (${this.GUILD_FEE} dinar)`}</button>`;

        // Companions at the tavern
        let here = COMPANIONS.filter(c => c.city === loc.id && !state.player.party.some(t => t.companionId === c.id));
        if(here.length) {
            html += `<hr style="border-color:var(--panel-border);margin:1.2rem 0">
                <h4 style="color:var(--primary)">${T`🎖️ Köşedeki Yabancılar`}</h4>`;
            here.forEach(c => {
                let rival = c.dislikes.map(d => state.player.party.find(t => t.companionId === d)).find(Boolean);
                html += `<div style="background:rgba(0,0,0,0.25);border:1px solid var(--panel-border);border-radius:6px;padding:0.8rem;margin-bottom:0.5rem">
                    <b>${c.icon} ${T(c.name)}</b> <span style="font-size:var(--fs-sm);color:var(--text-muted)">· ${this.profName(c.skill)} ${c.level}</span>
                    <div style="font-size:var(--fs-sm);font-style:italic;color:var(--text-muted);margin:0.3rem 0">${T(c.lore)}</div>
                    ${rival
                        ? `<button class="btn" disabled style="opacity:0.5;font-size:var(--fs-sm)">${T`${T(rival.name)} grubundayken katılmaz`}</button>`
                        : `<button class="btn primary" style="font-size:var(--fs-sm)" onclick="Game.hireCompanion('${c.id}')">${T`Gruba Kat (${c.cost} Dinar)`}</button>`}
                </div>`;
            });
        }

        this.showModal(html, '600px', this.sceneBg('tavern'));   // tavern interior (#60)
        this._tavernLoc = loc;
    },
    // The mercenary pool refreshes every 3 days per city
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
    // Working with a raider is risky; a mercenary asks for extra (#49)
    mercPrice(m) { return Math.round((60 + m.level * 12) * (1 + this.infamyPenalty())); },

    // The settlement's faction gives which villager; an unknown faction falls back to the Swadian tree
    tree(faction) { return TROOP_TREES[faction] || TROOP_TREES.swadia; },
    recruitName(loc) { return this.tree(loc && loc.faction).recruit[0]; },
    // Faction army pool: 2 shares of mid-tier per branch, 1 share of elite
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
        // ponytail: a rivalry blocks joining; Warband's "walks out later"
        // would need an in-party event system, this much already gives the story.
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
            this.advanceTime(8);   // resting takes time too (#53/1.1)
            this.updateTopBar(); this.closeModal();
            alert(T('Bir gece handa kaldın (8 saat). Canın tamamen yenilendi.'));
        } else alert(T('Yeterli dinarın yok!'));
    },

    // --- RUMOURS (#71) ---
    // The tavern is the one place information has a price: a round of drinks, a few hours
    // of listening, and an ear trained by Spotting. Skill buys two things — which kinds of
    // story reach you at all (tier), and how often the story is wrong.
    //
    // A false rumour is never a made-up story: it's a true story pinned to the wrong place.
    // Every generator takes `L` and passes the subject through it before naming or marking
    // it — the FACTS come from the real subject, the PLACE comes from `L(subject)`. So a
    // lie costs you a three-day ride to a village that was never touched, which is the
    // point: information you didn't pay enough for.
    RUMOR_COST: 20,
    RUMOR_HOURS: [2, 4],
    // 1 — a direction and nothing more · 2 — who is where · 3 — numbers and dates
    rumorTier() { let l = this.profLvl('spotting'); return l >= 7 ? 3 : l >= 4 ? 2 : 1; },
    rumorLieChance() { return Math.max(0.05, 0.45 - (this.profLvl('spotting') - 1) * 0.05); },

    RUMORS: [
        // --- tier 1: a direction, no names ---
        { tier: 1, run(here, L) {
            let b = state.npcParties.filter(n => n.type === 'bandit' && Game.dist(n, here) < 3500)
                                    .sort((a, c) => Game.dist(a, here) - Game.dist(c, here))[0];
            if(!b) return null;
            return { html: T`"Duyduğuma göre <b>${Nobles.compass(L(b))}</b> tarafta bir çete dolaşıyor. Yalnız yola çıkma."` };
        }},
        { tier: 1, run(here, L) {
            // Any open front, not just this town's: a tavern hears about the big war too
            let war = Object.keys(state.wars)[0];
            if(!war) return null;
            let [a, b] = war.split('|');
            let front = LOCATIONS.filter(l => l.type !== 'village' && (l.faction === a || l.faction === b))
                                 .sort((x, c) => Game.dist(x, here) - Game.dist(c, here))[0];
            if(!front) return null;
            let mine = Game.playerFaction();
            return { html: T`"${Game.factionName(a)} ile ${Game.factionName(b)} birbirine girmiş.
                <b>${Nobles.compass(L(front))}</b> tarafta ordu geçmiş, yollar tekin değil."${mine === a || mine === b ? T(' Hancı sana bir de yan yan baktı.') : ''}` };
        }},
        // --- tier 2: who, and where ---
        { tier: 2, run(here, L) {
            let a = state.npcParties.filter(n => n.lordId && n.siegeLocId)[0];
            if(!a) return null;
            let target = LOCATIONS.find(l => l.id === a.siegeLocId);
            if(!target) return null;
            let at = L(target);
            return { html: T`"<b>${T(a.name)}</b> ordusunu <b>${T(at.name)}</b> kapısına dayamış. Surlar ne kadar dayanır bilinmez."`,
                     mark: { x: at.x, y: at.y, radius: 150, name: T`Kuşatma: ${T(at.name)}` } };
        }},
        { tier: 2, run(here, L) {
            let f = Object.keys(state.campaigns)[0];
            if(!f) return null;
            let c = state.campaigns[f], target = LOCATIONS.find(l => l.id === c.targetLocId);
            if(!target) return null;
            let at = L(target);
            return { html: T`"<b>${T(c.marshalName)}</b> mareşal seçilmiş. ${Game.factionName(f)} ordusu
                <b>${T(at.name)}</b> üzerine yürüyor — oralarda işin varsa acele et."`,
                     mark: { x: at.x, y: at.y, radius: 200, name: T`Sefer: ${T(at.name)}` } };
        }},
        { tier: 2, run(here, L) {
            let lp = state.npcParties.filter(n => n.lordId && Game.dist(n, here) < 2500)
                                     .sort((a, c) => Game.dist(a, here) - Game.dist(c, here))[0];
            if(!lp) return null;
            let at = L(lp);
            return { html: T`"<b>${T(lp.name)}</b> geçen gün buradan geçti, ${T(String(lp.size))} kişi kadar vardılar.
                Şu sıra ${Nobles.compass(at)} tarafta olmalı."`,
                     mark: { x: at.x, y: at.y, radius: 500, name: T(lp.name) } };
        }},
        // --- tier 3: numbers and dates ---
        { tier: 3, run(here, L) {
            // The best margin between this town and the nearest five: which good, where, how much
            let towns = LOCATIONS.filter(l => l.type === 'city' && l.id !== here.id)
                                 .sort((a, c) => Game.dist(a, here) - Game.dist(c, here)).slice(0, 5);
            let goods = Object.values(ITEMS).filter(i => i.type === 'trade');
            let best = null;
            towns.forEach(t => goods.forEach(g => {
                let gap = Game.priceMult(t, g.id) - Game.priceMult(here, g.id);
                if(!best || gap > best.gap) best = { gap, town: t, good: g };
            }));
            if(!best || best.gap < 0.15) return null;
            let at = L(best.town);
            return { html: T`"Buradan <b>${T(best.good.name)}</b> alıp <b>${T(at.name)}</b>'a götüren adam
                yüzde <b>${Math.round(best.gap * 100)}</b> kâr ediyor. Bunu sana ben söylemedim."` };
        }},
        { tier: 3, run(here, L) {
            let cid = Object.keys(state.activeTournaments)[0];
            let feast = state.feast && LOCATIONS.find(l => l.id === state.feast.locId);
            let town = feast || LOCATIONS.find(l => l.id === cid);
            if(!town) return null;
            let at = L(town);
            return { html: feast
                ? T`"<b>${T(at.name)}</b>'da şölen var, soylular oraya akıyor. Namın varsa kapıdan çevirmezler."`
                : T`"<b>${T(at.name)}</b>'da turnuva kuruluyor. Kılıcına güveniyorsan kese doldurursun."`,
                     mark: { x: at.x, y: at.y, radius: 150, name: T(at.name) } };
        }},
        { tier: 3, run(here, L) {
            let l = Game.lairs().filter(x => x.purse > 150)
                                .sort((a, c) => Game.dist(a, here) - Game.dist(c, here))[0];
            if(!l) return null;
            let at = L(l);
            if(at === l) l.seen = true;   // a true rumour genuinely puts the lair on the map
            return { html: T`"${Nobles.compass(at)} tarafta bir haydut ini var. Soydukları neredeyse
                <b>${Math.round(l.purse)} dinar</b> etmiş diyorlar. Kimse üstüne gitmeye cesaret edemiyor."`,
                     mark: { x: at.x, y: at.y, radius: 250, name: T('Haydut İni') } };
        }}
    ],

    listenRumor(locId) {
        let loc = LOCATIONS.find(l => l.id === locId);
        if(!loc) return;
        if(state.player.money < this.RUMOR_COST)
            return alert(T`Hancı kadehi geri aldı: "Bir hikâye ${this.RUMOR_COST} dinar. Bedava konuşan yok."`);
        state.player.money -= this.RUMOR_COST;

        let tier = this.rumorTier();
        let lie = Math.random() < this.rumorLieChance();
        let L = t => lie ? LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)] : t;
        // Weighted by tier: a trained ear doesn't just unlock the good stories, it hears them more often
        let bag = [];
        this.RUMORS.filter(r => r.tier <= tier).forEach(r => {
            let out = r.run(loc, L);
            if(out) for(let i = 0; i < r.tier; i++) bag.push(out);
        });

        let hours = this.RUMOR_HOURS[0] + Math.floor(Math.random() * (this.RUMOR_HOURS[1] - this.RUMOR_HOURS[0] + 1));
        this.advanceTime(hours);
        this.addProficiencyXp('spotting', 25);
        this.updateTopBar();

        let r = bag[Math.floor(Math.random() * bag.length)];
        if(r && r.mark) state.knownLocations['rumor'] =
            { x: r.mark.x, y: r.mark.y, radius: r.mark.radius, day: state.time.day, name: r.mark.name };

        this.showModal(`<h3>${T`👂 Söylenti — ${T(loc.name)}`}</h3>
            <p style="color:var(--text-muted);font-size:var(--fs-md)">${T`${hours} saat kadar köşede oturdun, kadehleri ödedin (−${this.RUMOR_COST} dinar).`}</p>
            <p style="font-style:italic;line-height:1.6">${r ? r.html : T`"Bugün anlatacak bir şey yok. Herkes kendi derdinde."`}</p>
            ${r && r.mark ? `<p style="color:var(--primary);font-size:var(--fs-sm)">${T`📍 Haritaya bir işaret düştü (3 gün geçerli).`}</p>` : ''}
            <p style="font-size:var(--fs-sm);color:var(--text-muted)">${T`Gözcülük ${this.profLvl('spotting')} — duyduğun sözün ağırlığı ${tier}/3,
            yanlış çıkma ihtimali ${this.pct(Math.round(this.rumorLieChance() * 100))}. Handa duyulan her söz doğru değildir.`}</p>
            <button class="btn primary" onclick="Game.listenRumor('${loc.id}')">${T`👂 Bir tur daha (${this.RUMOR_COST} dinar)`}</button>
            <button class="btn" onclick="Game.openTavern(LOCATIONS.find(l=>l.id==='${loc.id}'))">${T`Geri`}</button>`, '620px');
    },

    // --- ARENA (#26) ---
    // A practice fight always open, independent of the tournament, like in Warband.
    // Gives no loot or renown; there's no money either — the payoff is proficiency XP and time.
    ARENA_BET_MAX: 1000,
    openArena(loc) {
        let lv = state.player.stats.level;
        this.showModal(`<h3>${T`🤺 ${T(loc.name)} Arenası`}</h3>
        <p style="color:var(--text-muted)">${T`Kum meydanında tahta silahlarla dövüşülür. Ganimet, nam ve esaret yok —
        kazanan da kaybeden de kendi ayağıyla çıkar. Kazandığın tek şey <b>yeterlilik</b>, ödediğin tek bedel <b>zaman</b>.`}</p>
        <div class="action-list" style="margin-top:1rem">
            ${Battle.ARENA_FOES.map((f, i) => `<button class="btn" onclick="Game.startArena(${i})">
                <b>${T(f.name)}</b> <span style="color:var(--text-muted)">${T`· Sv. ${Math.max(1, lv + f.dLv)} · ~${f.xp} XP`}</span>
                <div style="font-size:var(--fs-sm);color:var(--text-muted)">${T(f.desc)}</div></button>`).join('')}
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
        // The cost is time: a few hours if you win, a day in a sickbed if you lose.
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
            <b>${T`🎲 Bahis`}</b> <span style="color:var(--text-muted);font-size:var(--fs-sm)">${T`— kendi kazanmana yatırırsın, oran tur ilerledikçe katlanır.`}</span>
            <div style="display:flex;gap:0.5rem;margin:0.5rem 0;font-size:var(--fs-sm);color:var(--text-muted);flex-wrap:wrap">
                ${TM.ODDS.map((o, i) => `<span>${i === TM.ROUNDS ? T('🏆 Şampiyon') : T`${i + 1}. turda elenme`}: <b style="color:${o >= 1 ? 'var(--success)' : 'var(--danger)'}">×${o}</b></span>`).join(' · ')}
            </div>
            <label>${T`Yatırılacak:`} <input type="number" id="tourney-bet" value="0" min="0" max="${max}" step="50"
                style="width:110px;padding:0.3rem"></label>
            <span style="color:var(--text-muted);font-size:var(--fs-sm)">${T`(en fazla ${max} dinar)`}</span>
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

    // Garrison grows with prosperity — the siege screen and the map tooltip both use the same number
    // ============ DIPLOMACY ============
    // Kingdoms declare war on each other and make peace; lord parties clash on the front,
    // settlements change hands. Single piece of data: state.wars = { 'a|b': start day }.
    warKey(a, b) { return [a, b].sort().join('|'); },
    atWar(a, b) { return !!(a && b && a !== b && state.wars[this.warKey(a, b)]); },
    warsOf(f) {
        if(!f) return [];
        return Object.keys(state.wars).filter(k => k.split('|').indexOf(f) !== -1)
                     .map(k => k.split('|').find(x => x !== f));
    },
    // The independent player has a flag too ('player'): otherwise `atWar` always returned false,
    // an enemy city's market stayed open, and an enemy lord walked right past you (#48).
    playerFaction() { return state.player.vassalOf || 'player'; },
    factionName(f) {
        if(f === 'player') return (state.player.name || T('Bağımsız')) + T(' Bölüğü');
        return T((FACTIONS[f] || { name: f || T('Bağımsız') }).name);
    },
    // The people's name, not the state's: "Khergit Khanate Caravan" doesn't fit on a
    // map label line. Same word as the troop names ("Khergit Rider") — one consistent term.
    factionPeople(f) {
        let k = FACTIONS[f];
        return k && k.people ? T(k.people) : this.factionName(f);
    },
    // The news feed; an event that concerns the player's kingdom also becomes a notification
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
    // ---- ALLIANCE ----
    // Allies don't declare war on each other; one's enemy becomes the other's enemy too.
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
        // The cost of an alliance: your ally's front becomes your front too
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

    // ---- MARSHAL AND CAMPAIGN ----
    // A kingdom at war picks a marshal and marches on a single target: lord parties
    // no longer scatter to random enemy settlements, the army musters (updateNPCs).
    // A vassal player is summoned to the campaign — pledging and not showing up is the costliest option.
    pickMarshal(f) {
        let ps = state.npcParties.filter(n => n.lordId && n.faction === f && n.size > 0);
        // The king carries the banner, the marshal's post goes to another lord
        let lords = ps.filter(n => (Nobles.lord(n.lordId) || {}).rank !== 'king');
        return (lords.length ? lords : ps).sort((a, b) => b.size - a.size)[0] || null;
    },
    campaignTick() {
        for(let f in state.campaigns) {
            let c = state.campaigns[f];
            let loc = LOCATIONS.find(l => l.id === c.targetLocId);
            // Counts if you marched with the army — sampled once a day
            if(c.pledged && loc && this.dist(state.player, loc) < 1200) c.helped = true;
            if(!loc || !this.atWar(f, loc.faction) || state.time.day - c.day > 25) { this.endCampaign(f); continue; }
            // The campaign marker stays on the map (Nobles.drawMarkers clears it after 3 days, refreshed daily)
            if(c.pledged) state.knownLocations['campaign'] =
                { x: loc.x, y: loc.y, radius: 200, day: state.time.day, name: T`Sefer: ${T(loc.name)}` };
        }
        Object.keys(FACTIONS).forEach(f => {
            // A new campaign summons shouldn't stomp the finished one's reward modal
            if(state.time.day - (state.campaignCooldown[f] || -99) < 3) return;
            if(state.campaigns[f] || !this.warsOf(f).length || Math.random() > 0.25) return;
            // The player holds the post (#69): the banner is theirs, no lord is picked
            let mine = state.marshalOf === f;
            let marshal = mine ? state.player : this.pickMarshal(f);
            if(!marshal) return;
            let target = LOCATIONS.filter(l => l.type !== 'village' && this.atWar(f, l.faction))
                                  .sort((a, b) => this.dist(a, marshal) - this.dist(b, marshal))[0];
            if(!target) return;
            state.campaigns[f] = { marshalId: mine ? 'player' : marshal.lordId,
                                   marshalName: mine ? state.player.name : marshal.name,
                                   targetLocId: target.id, day: state.time.day, pledged: mine || undefined };
            this.news(T`🎖️ ${T(state.campaigns[f].marshalName)} mareşal seçildi — ${this.factionName(f)} ordusu ${T(target.name)} üzerine yürüyor.`);
            // The marshal isn't summoned to arms, the marshal picks where the arms go
            if(mine) this.chooseCampaignTarget(f);
            else if(f === this.playerFaction() && f !== 'player_kingdom') this.summonToArms(f);
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
        // A marshal serves one campaign; the post has to be asked for again (#69)
        if(state.marshalOf === f) {
            state.marshalOf = null;
            if(won) { state.player.renown += 10; state.player.rightToRule += 5; }
            this.news(won ? T`🎖️ Mareşallik görevin zaferle bitti (+10 nam, +5 idare hakkı).`
                          : T`🎖️ Mareşallik görevin sonuçsuz bitti; sancak başkasına geçti.`, true);
        }
        if(c.pledged === undefined || f !== this.playerFaction()) return;
        delete state.knownLocations['campaign'];
        if(!c.pledged) return;                       // the cost of refusing was already paid at the summons
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
            this.addHonor('oathBroken');   // a broken promise costs honor (#53/1.5)
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

    // --- COMPANION ENVOY (#69, 500 renown) ---
    // A name worth 500 renown can speak through someone else's mouth. A companion rides out
    // to a lord and negotiates; the price is that they are out of your party for days —
    // their party skill goes with them, so sending the surgeon before a war is a real choice.
    ENVOY_DAYS: [3, 6],
    envoyCompanions() { return state.player.party.filter(t => t.isCompanion && !t.wounded); },
    envoyMenu(lordId) {
        let lord = Nobles.lord(lordId), gate = this.RENOWN_GATES.envoy;
        let back = `<button class="btn" onclick="Nobles.talk('${lordId}')">${T`Geri`}</button>`;
        let no = msg => this.showModal(`<h3>${T`🕊️ Elçilik`}</h3><p>${msg}</p>${back}`);
        if(this.peakRenown() < gate)
            return no(T`Elçi göndermek, gönderenin adının tanınmasını ister — gereken nam <b>${gate}</b>,
                sende <b>${this.peakRenown()}</b>. Bu kapıdan geçmeden yoldaşını kapıdan çevirirler.`);
        if(state.envoy)
            return no(T`<b>${T(state.envoy.name)}</b> zaten yolda; <b>${Math.max(0, state.envoy.backDay - state.time.day)}</b> gün sonra döner.
                Aynı anda tek elçin olabilir.`);
        let comps = this.envoyCompanions();
        if(!comps.length) return no(T`Gönderecek yoldaşın yok. Elçilik sıradan bir askerin işi değil.`);

        let atWar = this.atWar(this.playerFaction(), lord.faction);
        let html = `<h3>${T`🕊️ ${T(lord.name)}'a Elçi Gönder`}</h3>
            <p style="color:var(--text-muted);font-size:var(--fs-md)">${T`Yoldaşın gruptan
            ${this.ENVOY_DAYS[0]}-${this.ENVOY_DAYS[1]} gün ayrılır; yeteneği de onunla gider.
            İkna kabiliyeti ve seviyesi işin sonucunu belirler.`}</p>`;
        comps.forEach(c => {
            let ch = Math.round(this.envoyChance(c, lordId) * 100);
            html += `<div style="background:rgba(0,0,0,0.25);border:1px solid var(--panel-border);border-radius:6px;padding:0.7rem;margin-bottom:0.5rem">
                <b>${T(c.name)}</b> <span style="font-size:var(--fs-sm);color:var(--text-muted)">${T`· seviye ${c.level} · başarı ${ch}%`}</span>
                <div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap">
                <button class="btn" style="font-size:var(--fs-sm)" onclick="Game.sendEnvoy('${lordId}','${c.id}','rel')">${T`🤝 İlişki pazarlığı`}</button>
                ${atWar
                    ? `<button class="btn" style="font-size:var(--fs-sm)" onclick="Game.sendEnvoy('${lordId}','${c.id}','truce')">${T`🏳️ Ateşkes teklif et`}</button>`
                    : `<button class="btn" disabled style="opacity:0.4;font-size:var(--fs-sm)">${T`🏳️ Ateşkes (savaşta değilsiniz)`}</button>`}
                </div></div>`;
        });
        this.showModal(html + back, '620px');
    },
    // Level is the companion's own weight, Persuasion the party's silver tongue, relation the door already open
    envoyChance(comp, lordId) {
        return Math.max(0.1, Math.min(0.9,
            0.25 + comp.level * 0.02 + (this.profLvl('persuasion') - 1) * 0.03 + Nobles.rel(lordId) * 0.004));
    },
    sendEnvoy(lordId, compId, mission) {
        let i = state.player.party.findIndex(t => t.id === compId);
        if(i < 0 || state.envoy) return;
        let comp = state.player.party[i];
        let days = this.ENVOY_DAYS[0] + Math.floor(Math.random() * (this.ENVOY_DAYS[1] - this.ENVOY_DAYS[0] + 1));
        state.envoy = { compId, mission, lordId, name: comp.name, troop: comp,
                        chance: this.envoyChance(comp, lordId), backDay: state.time.day + days };
        state.player.party.splice(i, 1);
        this.closeModal();
        this.updateTopBar();
        alert(T`<b>${T(comp.name)}</b> atına atladı. <b>${days} gün</b> sonra haberle döner.`);
    },
    envoyTick() {
        let e = state.envoy;
        if(!e || state.time.day < e.backDay) return;
        state.envoy = null;
        state.player.party.push(e.troop);           // comes back even if the party is over capacity — morale pays for that
        let lord = Nobles.lord(e.lordId);
        let won = Math.random() < e.chance;
        if(!lord) return alert(T`<b>${T(e.name)}</b> eli boş döndü — gittiği lordu bulamamış.`);
        if(e.mission === 'truce') {
            let f = this.playerFaction();
            if(won && this.atWar(f, lord.faction)) {
                this.makePeace(f, lord.faction);
                Nobles.addRel(e.lordId, 5);
                alert(T`<b>${T(e.name)}</b> döndü: <b>${this.factionName(lord.faction)}</b> ile ateşkes imzalandı.`);
            } else {
                Nobles.addRel(e.lordId, -5);
                alert(T`<b>${T(e.name)}</b> kapıdan çevrilmiş. <i>"Kılıç konuşurken elçi dinlenmez,"</i> demişler.
                    ${T(lord.name)} ile −5 ilişki.`);
            }
        } else {
            let n = won ? 12 + Math.floor(Math.random() * 9) : -3;
            Nobles.addRel(e.lordId, n);
            alert(won
                ? T`<b>${T(e.name)}</b> masadan gülerek kalkmış. ${T(lord.name)} ile <b>+${n}</b> ilişki.`
                : T`<b>${T(e.name)}</b> lafı ağzına tıkanmış döndü. ${T(lord.name)} ile <b>−3</b> ilişki.`);
        }
        this.updateTopBar();
    },

    // --- MARSHALCY (#69, 800 renown) ---
    // The campaign system already marches every lord of a kingdom onto a single target
    // (updateNPCs). Marshalcy simply hands the player the pen that writes that target:
    // no new pathfinding, the army that used to march for an NPC now marches for you.
    // The post is for one campaign — it has to be asked for again next time.
    askMarshal(lordId) {
        let f = state.player.vassalOf, gate = this.RENOWN_GATES.marshal, r = Nobles.rel(lordId);
        let back = `<button class="btn" onclick="Nobles.talk('${lordId}')">${T`Geri`}</button>`;
        let no = msg => this.showModal(`<h3>${T`🎖️ Mareşallik`}</h3><p>${msg}</p>${back}`);
        if(this.peakRenown() < gate)
            return no(T`Kral kadehini bırakmadı bile: <i>"Sancağı taşıyacak adamın adı ordudan önce varmalı."</i><br><br>
                Gereken nam <b>${gate}</b>, sende <b>${this.peakRenown()}</b>.`);
        if(state.marshalOf === f) return no(T`Mareşal zaten sensin. Seferin hedefini sen belirliyorsun.`);
        if(!this.warsOf(f).length) return no(T`<i>"Barış zamanı mareşale ne gerek var?"</i> Krallığın şu an savaşta değil.`);
        if(r < this.MARSHAL_REL)
            return no(T`<i>"Sancağı tanımadığım adama vermem."</i><br><br>Gereken ilişki <b>${this.MARSHAL_REL}</b>,
                aranızdaki <b>${r}</b>.`);
        this.closeModal();
        state.marshalOf = f;
        LORDS.filter(l => l.faction === f && l.id !== lordId).forEach(l => Nobles.addRel(l.id, -2));   // the passed-over lords sulk
        this.news(T`🎖️ ${T(state.player.name)} mareşal seçildi — ${this.factionName(f)} ordusu senin hedefine yürüyecek.`);
        let c = state.campaigns[f];
        if(c) {                       // a campaign already under way: you take the banner over mid-march
            c.marshalId = 'player'; c.marshalName = state.player.name; c.pledged = true;
            return this.chooseCampaignTarget(f);
        }
        alert(T`Kral sancağı sana verdi. Krallık sefere çıktığında hedefi <b>sen</b> seçeceksin.
            Diğer lordlar bu tercihten pek hoşlanmadı (−2 ilişki).`);
    },
    MARSHAL_REL: 20,
    chooseCampaignTarget(f) {
        let c = state.campaigns[f];
        if(!c) return;
        let targets = LOCATIONS.filter(l => l.type !== 'village' && this.atWar(f, l.faction))
                               .sort((a, b) => this.dist(a, state.player) - this.dist(b, state.player)).slice(0, 6);
        if(!targets.length) return this.endCampaign(f);
        let rows = targets.map(l => `<button class="btn" style="text-align:left" onclick="Game.setCampaignTarget('${f}','${l.id}')">
            ${l.type === 'city' ? '🏰' : '🗼'} <b>${T(l.name)}</b>
            <span style="font-size:var(--fs-sm);color:var(--text-muted)">${T`· ${this.factionName(l.faction)} · garnizon ~${this.garrisonOf(l)} · ${Math.round(this.dist(l, state.player))} birim uzakta`}</span></button>`).join('');
        this.showModal(`<h3>${T`🎖️ Sefer Hedefini Seç`}</h3>
            <p style="color:var(--text-muted);font-size:var(--fs-md)">${T`Mareşal sensin. Seçtiğin yere
            ${this.factionName(f)} lordları yürüyecek — ama sancağın onların yanında olmazsa nam da olmaz.`}</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">${rows}</div>`, '620px');
    },
    setCampaignTarget(f, locId) {
        let c = state.campaigns[f], loc = LOCATIONS.find(l => l.id === locId);
        this.closeModal();
        if(!c || !loc) return;
        c.targetLocId = locId;
        c.day = state.time.day;         // the clock restarts with the new target
        this.news(T`🎖️ Mareşal ${T(state.player.name)} ordunun yönünü ${T(loc.name)} üzerine çevirdi.`, true);
    },

    // One front starts open when the world is built (Calradia is never at peace)
    initDiplomacy() {
        if(state.warSeeded) return;
        state.warSeeded = true;
        let fs = Object.keys(FACTIONS).filter(f => f !== 'player_kingdom');
        let a = fs[Math.floor(Math.random() * fs.length)];
        let b = fs.filter(f => f !== a)[Math.floor(Math.random() * (fs.length - 1))];
        state.wars[this.warKey(a, b)] = 1;
        state.warLog.unshift({ day: 1, msg: T`⚔️ ${this.factionName(a)} ile ${this.factionName(b)} savaş hâlinde.` });
    },
    // Daily roll: a war that drags on ends in peace, no faction opens more than two fronts
    diplomacyTick() {
        for(let k in state.wars) {
            let len = state.time.day - state.wars[k], p = k.split('|');
            // A kingdom down to two holdings begs for peace — otherwise it gets crushed
            // 'player' is a flag with no territory; it's exempt from the "begs for peace at two holdings" rule
            let weak = p.some(f => f !== 'player' && LOCATIONS.filter(l => l.type !== 'village' && l.faction === f).length <= 2);
            if(len >= (weak ? 5 : 15) && Math.random() < (weak ? 0.25 : 0.06 + len * 0.004)) this.makePeace(p[0], p[1]);
        }
        // Two kingdoms at peace with a common enemy shake hands
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
        // An aging alliance falls apart
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
    // Front: enemy lord parties that meet clash, the stronger one takes the
    // enemy's settlement. Runs once a day, independent of the player.
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
            // Since the campaign system musters armies onto a single target, conquest sped up; a
            // kingdom that lost its last city/castle was wiped off the map. The last holding
            // can't be taken — that kingdom is now forced into peace instead (diplomacyTick).
            if(LOCATIONS.filter(l => l.type !== 'village' && l.faction === loc.faction).length <= 1) return;
            let g = this.garrisonOf(loc);
            let atk = parties.find(p => p.size > 0 && this.atWar(p.faction, loc.faction)
                                        && this.dist(p, loc) < 500 && p.size > g * 1.3);
            if(!atk) return;
            // A siege doesn't end in a day: the army has to wait at the gate for 3 days.
            // Otherwise every lord passing by grabbed the castle (measured: 38 changes
            // of hands in 200 days, two kingdoms were wiped out).
            if(atk.siegeLocId !== loc.id) { atk.siegeLocId = loc.id; atk.siegeDays = 1; return; }
            atk.siegeDays = (atk.siegeDays || 1) + 1;
            // A newly fallen castle can't be retaken right away
            if(state.time.day - (loc.capturedDay || -99) < 10) return;
            if(atk.siegeDays < 3) return;
            atk.siegeLocId = null; atk.siegeDays = 0;
            this.captureSettlement(loc, atk);
        });
        // A scattered party is removed from the map, it regroups at home a few days later
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
        // A front clash can happen several times a day: it only makes the news if a
        // party is actually routed, and never pops a notification (otherwise you'd eat a modal every day of a war).
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
        atk.size = Math.max(10, Math.round(atk.size * 0.6));   // the siege eats into the army
        // The villages around the castle/city change hands too
        this.villagesOf(loc).filter(l => l.faction === old)
            .forEach(l => { l.faction = atk.faction; l.owner = null; l.tributeTo = null; });   // a new lord honours no old tribute (#69)
        // A fief you left undefended is lost; its garrison is put to the sword
        // ponytail: the storage doesn't change hands — the new owner is assumed not to find the cellar
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
    // Diplomacy screen: who's at war with whom, who holds how much land, the latest news
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
        // Ongoing campaigns: who's marshal, where the army is headed
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
                    ${this.vassals().length && l.type !== 'village' ? `<button class="btn" style="padding:0.1rem 0.5rem;font-size:var(--fs-xs)" onclick="Game.grantFiefMenu('${l.id}')">${T`👑 Vassala ver`}</button>` : ''}
                </div>`).join('') + `<div style="padding:0.4rem 0;color:var(--text-muted)">Toplam: +${this.fiefIncome().tax} vergi${this.fiefIncome().tribute ? T` · +${this.fiefIncome().tribute} haraç` : ''}${this.fiefIncome().levy ? T` · +${this.fiefIncome().levy} köy haracı` : ''} · −${this.fiefIncome().wage} garnizon maaşı · <b style="color:${this.fiefIncome().net >= 0 ? '#2ecc71' : '#e0463a'}">net ${this.fiefIncome().net >= 0 ? '+' : ''}${this.fiefIncome().net}</b> ${T`dinar/gün`}</div>` : ''}
            ${this.vassals().length ? `<h3 style="margin-top:1rem">${T`👑 Vassalların`}</h3>` + this.vassals().map(v =>
                `<div style="display:flex;gap:0.6rem;align-items:baseline;padding:0.3rem 0;border-bottom:1px solid var(--panel-border)">
                    <span style="min-width:150px;font-weight:600">${T(v.name)}</span>
                    <span style="color:var(--text-muted);min-width:110px">${T`İlişki: ${Nobles.rel(v.id)}`}</span>
                    <span>${this.fiefsOf(v.id).length ? this.fiefsOf(v.id).map(l => T(l.name)).join(', ')
                        : T('<span style="color:#e0463a">topraksız — küskün</span>')}</span>
                </div>`).join('') : ''}
            ${camps ? `<h3 style="margin-top:1rem">${T`🎖️ Yürüyen Seferler`}</h3>${camps}` : ''}
            <h3 style="margin-top:1rem">${T`📜 Haberler`}</h3>
            <div style="max-height:220px;overflow:auto;font-size:var(--fs-md)">${log}</div>
            <button class="btn" style="margin-top:1rem" onclick="Game.closeModal()">${T`Kapat`}</button>`, '640px');
    },

    garrisonOf(loc) {
        // In your own fief the garrison isn't a formula, it's the actual troops stationed there (#23)
        if(loc.owner === 'player') return (loc.garrison || []).length;
        let base = loc.type === 'city' ? 30 : loc.type === 'castle' ? 15 : 0;
        return Math.round(base * (0.6 + (loc.prosperity || 50) / 125));
    },

    // --- FIEF MANAGEMENT (#23) ---
    // A settlement you conquer is no longer just a flag change: you leave a garrison
    // (you pay its wage), it brings in daily tax, and you can stock its storage.
    // Enemy lords take back a fief you leave undefended (warTick → captureSettlement).
    myFiefs() { return LOCATIONS.filter(l => l.owner === 'player'); },
    // --- ENTERPRISE (#53 item 1.6) ---
    // Warband's enterprise: one big upfront cost, a small daily income. Like a fief,
    // it goes through fiefIncome; income stops if the city changes hands (the property stays, the profit doesn't).
    ENTERPRISE_COST: 3000,
    enterpriseIncome(loc) { return Math.round((loc.prosperity || 50) * 0.55); },
    myEnterprises() { return LOCATIONS.filter(l => l.enterprise); },
    // An enterprise in a city that falls to the enemy doesn't work
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
        // A vassal's fief doesn't go straight into your coffers, a share comes in as tribute (#40)
        let tribute = this.vassals().reduce((a, v) =>
            a + this.fiefsOf(v.id).reduce((b, l) => b + Math.round(this.fiefTax(l) * this.VASSAL_TRIBUTE), 0), 0);
        // Enterprise income is part of the daily flow too (#53/1.6)
        let trade = this.myEnterprises().reduce((a, l) => a + (this.enterpriseWorks(l) ? this.enterpriseIncome(l) : 0), 0);
        // Villages you put under tribute without taking them (#69)
        let levy = this.tributaries().reduce((a, l) => a + this.tributeOf(l), 0);
        return { tax, tribute, trade, levy, wage, troops, net: tax + tribute + trade + levy - wage };
    },
    // After a conquest: the settlement becomes your fief, the villages around it change flag too
    grantFief(loc, oldFaction) {
        loc.owner = 'player';
        loc.capturedDay = state.time.day;
        loc.garrison = loc.garrison || [];
        this.villagesOf(loc).filter(l => l.faction === oldFaction)
            .forEach(l => { l.faction = loc.faction; l.owner = 'player'; });
    },

    // --- VASSALS (#40) ---
    // Once you're king, a fief stops being a burden you carry alone: you grant land
    // to keep a lord. A vassal fights under your banner (their party's faction changes),
    // defends their fief with their own garrison, and pays a share of its tax as tribute.
    VASSAL_TRIBUTE: 0.3,
    VASSAL_REL: 25,
    isKing() { return state.player.vassalOf === 'player_kingdom'; },
    vassals() { return typeof LORDS === 'undefined' ? [] : LORDS.filter(l => (state.vassals || []).indexOf(l.id) !== -1); },
    fiefsOf(lordId) { return LOCATIONS.filter(l => l.owner === lordId); },
    // LORDS isn't written to the save; a lord's banner is rebuilt from state.vassals on every load
    applyVassals() {
        (state.vassals || []).forEach(id => {
            let l = Nobles.lord(id);
            if(!l) return;
            l.faction = 'player_kingdom';
            let npc = state.npcParties.find(n => n.lordId === id);
            if(npc) { npc.faction = 'player_kingdom'; npc.color = this.bannerColor(); }
        });
    },
    // The "join my kingdom" gate in a lord's dialogue: nobody swears fealty without land
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
        // The jealousy from Warband: a vassal left empty-handed while land is handed out sulks
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
            .map(v => `<button class="btn" style="font-size:var(--fs-xs);padding:0.25rem 0.5rem" onclick="Game.moveGarrison('${loc.id}','${label.replace(/'/g,"\\'")}',${v},'${dir}')">${v === max && max > 5 ? T('Hepsi') : v}</button>`).join(' ');
        let col = (title, groups, dir, empty) => {
            let rows = Object.keys(groups).map(k => {
                let g = groups[k];
                let blocked = dir === 'in' && g.sample.isCompanion;
                return `<li style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;padding:0.35rem 0;border-bottom:1px solid var(--panel-border)">
                    <span>${this.troopStats(g.sample).icon} ${k} <b>x${g.n}</b></span>
                    <span>${blocked ? T('<span style="color:var(--text-muted);font-size:var(--fs-xs)">yoldaş kalamaz</span>') : btns(k, dir, g.n)}</span></li>`;
            }).join('');
            return `<div style="flex:1"><h4>${title}</h4><ul style="list-style:none">${rows || `<li style="color:var(--text-muted)">${empty}</li>`}</ul></div>`;
        };
        let inc = this.fiefIncome();
        // The daily net should read in one line (#55 item 9): the "an elite garrison is a loss" rule
        // was sitting in the docs, but the player never saw it anywhere on screen.
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
        <p style="color:var(--text-muted);font-size:var(--fs-sm);margin-top:0.8rem">${T`Tüm tımarlarının garnizonu: ${inc.troops} asker · ${inc.wage} dinar/gün`}</p>
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
            .map(v => `<button class="btn" style="font-size:var(--fs-xs);padding:0.25rem 0.5rem" onclick="Game.moveStorage('${loc.id}','${id}',${v},'${dir}')">${v === max && max > 5 ? T('Hepsi') : v}</button>`).join(' ');
        let col = (title, list, dir, empty) => `<div style="flex:1"><h4>${title}</h4><ul style="list-style:none">${
            list.length ? list.map(i => `<li style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;padding:0.35rem 0;border-bottom:1px solid var(--panel-border)">
                <span>${i.icon} ${T(i.name)} <b>x${i.qty}</b></span><span>${btns(i.id, dir, i.qty)}</span></li>`).join('')
            : `<li style="color:var(--text-muted)">${empty}</li>`}</ul></div>`;
        // Treasury: the only money not looted on defeat (#53 item 1.2). Moving money into storage
        // is insurance — the smaller the purse you're carrying, the cheaper a defeat is.
        let tre = loc.treasury || 0;
        let money = [100, 500, Math.floor(state.player.money)].filter((v, i, a) => v > 0 && a.indexOf(v) === i);
        let back = [100, 500, tre].filter((v, i, a) => v > 0 && a.indexOf(v) === i);
        this.showModal(`<h3>${T`📦 ${T(loc.name)} Deposu`}</h3>
        <p style="color:var(--text-muted)">${T`Depodaki erzak bozulmaz (bozulma yalnız yanında taşıdığına işler) ve yenilgide yağmalanmaz.`}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;padding:0.5rem 0;border-top:1px solid var(--panel-border);border-bottom:1px solid var(--panel-border)">
            <span>${T`🏦 Kasa:`} <b>${tre}</b> dinar <span style="color:var(--text-muted);font-size:var(--fs-sm)">${T`(yenilgide yağmalanmaz)</span></span>
            <span>Yatır: ${money.map(v => `<button class="btn" style="font-size:var(--fs-xs);padding:0.25rem 0.5rem" onclick="Game.moveTreasury('${loc.id}',${v},'in')">${v === money[money.length-1] && money.length > 1 ? T('Hepsi') : v}</button>`).join(' ')}
                  ${tre ? T(' · Çek: ') + back.map(v => `<button class="btn" style="font-size:var(--fs-xs);padding:0.25rem 0.5rem" onclick="Game.moveTreasury('${loc.id}',${v},'out')">${v === back[back.length-1] && back.length > 1 ? T('Hepsi') : v}</button>`).join(' ') : ''}`}</span>
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
    // The share of your purse lost on defeat: the bigger your treasury's share, the smaller the loot (#53/1.2)
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
    // The lord who owns the settlement; villages have no lord of their own, they're tied to the nearest castle/city
    ownerLord(loc) {
        if(typeof LORDS === 'undefined') return null;
        let own = LORDS.find(x => x.homeLocId === loc.id);
        if(own) return own;
        let seats = LOCATIONS.filter(x => x.faction === loc.faction && LORDS.some(y => y.homeLocId === x.id));
        let near = seats.sort((a, b) => this.dist(a, loc) - this.dist(b, loc))[0];
        return near ? LORDS.find(y => y.homeLocId === near.id) : null;
    },
    // Party tooltip. In the party holding you captive, you and any other prisoners
    // beside their own troops also show up (captivity model: state.player.prisoner).
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
        // See it before you go up against it: is this band worth it for you (#55 item 9)
        let prey = this.preyWarning(npc);
        if(prey) html += `<br><span style="color:#cc8800;font-size:0.85em">${prey.replace(/<\/?b>/g, '')}</span>`;
        // Cargo shows up not just on caravans, but on a band that robbed one too
        if((npc.cargo || []).filter(c => ITEMS[c.id]).length)
            html += `<br>${T`Yük: ${npc.cargo.filter(c => ITEMS[c.id]).map(c => ITEMS[c.id].icon + ' ×' + c.qty).join(' ')}`}`;
        let pr = state.player.prisoner;
        if(pr && pr.npcId === npc.id) {
            html += `<br><span style="color:#ff8f82">${T`⛓️ Esirleri:</span> ${state.player.name} (sen)`}`
                  + (pr.fellows && pr.fellows.length ? `, ${pr.fellows.join(', ')}` : '');
        }
        return html;
    },
    // Map tooltip: whose land it is, who governs it, how rich it is, how many troops are waiting
    locTipHtml(loc) {
        let f = FACTIONS[loc.faction] || { name: '?' };
        let type = loc.type === 'city' ? T('Şehir') : loc.type === 'castle' ? T('Kale') : T('Köy');
        let pr = Math.round(loc.prosperity || 50);
        let prLbl = pr >= 75 ? T('Zengin') : pr >= 58 ? T('Müreffeh') : pr >= 42 ? T('İdare eder') : T('Yoksul');
        let hostile = this.atWar(this.playerFaction(), loc.faction);
        let gate = hostile ? `<span style="color:#e0463a">${T`⚔️ Düşman toprağı — sadece kuşatma`}</span>`
                           : `<span style="color:#2ecc71">${T`Kapılar sana açık`}</span>`;
        // A settlement's state is either seen with your own eyes or remembered (#74). There's no way to know
        // a distant castle's garrison if you've never been there — its location is known, its inside isn't.
        let live = this.locLive(loc), i = loc.intel;
        if(!live && !i) return `${T(f.name)} · ${type}<br>`
            + `<span style="color:var(--text-muted)">${T`Durumunu bilmiyorsun — yaklaş ya da içeri gir.`}</span><br>` + gate;

        let g = live ? this.garrisonOf(loc) : i.g;
        let vol = live ? loc.volunteersAvailable : i.v;
        let lord = live ? this.ownerLord(loc) : (typeof Nobles !== 'undefined' && i.lord ? Nobles.lord(i.lord) : null);
        let rel = lord && typeof Nobles !== 'undefined' ? Nobles.rel(lord.id) : 0;
        if(!live) { pr = i.pr; prLbl = pr >= 75 ? T('Zengin') : pr >= 58 ? T('Müreffeh') : pr >= 42 ? T('İdare eder') : T('Yoksul'); }
        let days = live ? 0 : state.time.day - i.d;
        let ageLine = live ? '' : `<span style="color:var(--text-muted)">${days <= 0 ? T`Bugünkü haber:` : T`${days} gün önce:`}</span><br>`;

        return `${T(f.name)} · ${type}<br>` + ageLine
            + (lord ? `${T`Sahibi: ${T(lord.name)} (${Nobles.relLabel(rel)})`}<br>` : '')
            + `${T`Refah: ${prLbl}`} <span style="color:var(--text-muted)">(${pr})</span><br>`
            + (g ? `${T`Garnizon: ~${g} asker`}<br>` : '')
            + (vol !== undefined ? `${T`Gönüllü: ${vol} kişi`}<br>` : '')
            + gate;
    },
    // Renown loss on defeat: the weaker the enemy relative to you, the greater the disgrace.
    // pow = the enemy's power score (level+1 per troop)
    // Gates check peak renown reached (#55 item 9). A single defeat could burn 22 renown,
    // which closed the hall (80) / marriage proposal (120) / feast (150) gates all at
    // once — losing honor should hit your purse and relationships, not the gate.
    // Every reader also updates the peak value at the same time — no separate hook needed.
    // Gates above 300 (#69): the AMBITIONS chain ended at "a landholder" and the game
    // flattened into "collect the tax". These three open the late game's own ladder.
    RENOWN_GATES: { tribute: 300, envoy: 500, marshal: 800 },
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
    // A siege isn't a pitched battle opened with one button: camp is set first, preparation
    // days pass (the world keeps running, an enemy lord can come to relieve it), then the
    // assault happens at the wall. The method chosen sets both the duration and the defender's edge.
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
                <br><span style="color:var(--text-muted);font-size:var(--fs-sm)">${T(p.desc)}</span></button>`;
        }).join('');
        this.showModal(`<h3>${T`🏰 ${T(loc.name)} Kuşatması</h3>
        <p>Garnizonda tahmini <b>${g}</b> asker var. Kampı kurunca ordun kapıda bekler:
        hazırlık bitene kadar zaman akar, ${this.factionName(loc.faction)} lordları kuşatmayı yarmaya gelebilir.`}</p>
        <p style="color:var(--text-muted);font-size:var(--fs-sm)">${T`Hazırlık bitince beklemeye devam edersen garnizonu
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
        this.news(T`${T(loc.name)} kuşatma altında.`);   // the panel is already visible, no modal notification needed
        this.renderSiegeUI();
    },
    // Daily siege processing (dailyUpdate)
    siegeTick() {
        let s = state.player.siege;
        if(!s) return;
        let loc = LOCATIONS.find(l => l.id === s.locId);
        if(!loc || loc.faction === this.playerFaction()) return this.liftSiege(true);
        if(s.daysLeft > 0) {
            s.daysLeft--;
            if(s.daysLeft === 0) alert(T`${T(this.SIEGE_PLANS[s.plan].name)} hazır — ${T(loc.name)} surlarına saldırabilirsin.`);
        } else {
            // Starving them out: the longer you wait, the garrison erodes, the city's prosperity drops
            s.weaken = Math.min(0.55, (s.weaken || 0) + 0.07);
            loc.prosperity = Math.max(10, (loc.prosperity || 50) - 1.5);
        }
        this.renderSiegeUI();
        this.siegeRelief(loc);
    },
    // An army coming to break the siege: the nearest enemy lord party within 2500 units
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
    // Starvation erodes the garrison; the siege panel and the assault both read the same number
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
    // Raid: rout the village militia, take the loot. The cost is steep — relationship with its lord,
    // the village's prosperity, your renown, and (if it's an at-peace kingdom) diplomatic standing.
    raidVillage(loc) {
        let owner = this.ownerLord(loc);
        let militia = Math.max(4, Math.round((loc.prosperity || 50) / 5));
        let peace = !this.atWar(this.playerFaction(), loc.faction) && loc.faction !== this.playerFaction();
        // A burned village's storehouse doesn't refill right away (#49)
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
    // --- TRIBUTE: THE RIGHT TO RULE (#69, 300 renown) ---
    // Warband's answer to "I have a name but no land" was: take a castle. At 300 renown an
    // independent captain can do the smaller thing instead — ride up to a village with an
    // army at his back and name a price. No siege, no battle; the village keeps its lord,
    // you take a cut of its tax. The lord it belongs to does not forget who did this.
    TRIBUTE_CUT: 0.4,
    TRIBUTE_MILITIA: 0.8,     // the share of the militia your party has to outweigh
    tributaries() { return LOCATIONS.filter(l => l.tributeTo === 'player'); },
    // Nothing comes through a closed front: war with its kingdom stops the payments (like an enterprise)
    tributeOf(loc) {
        return this.atWar(this.playerFaction(), loc.faction) ? 0 : Math.round(this.fiefTax(loc) * this.TRIBUTE_CUT);
    },
    villageMilitia(loc) { return Math.max(4, Math.round((loc.prosperity || 50) / 5)); },
    tributeVillage(loc) {
        let gate = this.RENOWN_GATES.tribute, militia = this.villageMilitia(loc);
        let need = Math.ceil(militia * this.TRIBUTE_MILITIA);
        let owner = this.ownerLord(loc);
        let back = `<button class="btn" onclick="Game.closeModal()">${T`Geri`}</button>`;
        let no = msg => this.showModal(`<h3>${T`👑 Haraç — ${T(loc.name)}`}</h3><p>${msg}</p>${back}`);

        if(this.peakRenown() < gate)
            return no(T`Köy yaşlısı omuz silkti: <i>"Sen de kimsin?"</i><br><br>
                Bir köyü kılıç çekmeden haraca bağlamak için adının önden gitmesi gerekir —
                gereken nam <b>${gate}</b>, sende <b>${this.peakRenown()}</b>.`);
        if(state.player.vassalOf)
            return no(T`Sen bir derebeyisin; bu köyün vergisi senin kralının. Kendi bayrağın altında olmadan haraç toplayamazsın.`);
        if(loc.tributeTo === 'player')
            return no(T`<b>${T(loc.name)}</b> zaten sana haraç veriyor — günde <b>${this.tributeOf(loc)} dinar</b>.`);
        if(state.player.party.length < need)
            return no(T`Köy milisi <b>${militia}</b> kişi; arkanda <b>${need}</b> kılıç olmadan kimse keseyi açmaz.
                Grubunda <b>${state.player.party.length}</b> asker var.`);

        this.showModal(`<h3>${T`👑 ${T(loc.name)} Haraca Bağla`}</h3>
            <p>${T`Adamlarınla meydanda durdun, kılıç çekmedin. Köy yaşlısı hesabı kendi yaptı:
            günde <b>${Math.round(this.fiefTax(loc) * this.TRIBUTE_CUT)} dinar</b>, sen sağ oldukça.`}</p>
            <p style="color:var(--danger);line-height:1.5">${T`Bedeli:`}
                ${owner ? `${T`${T(owner.name)} ile ilişki`} <b>−20</b>, ` : ''}${T`${this.factionName(loc.faction)} lordları <b>−4</b>,
                köyün refahı <b>−5</b>. Krallığıyla savaşa girersen haraç durur.
                <br>Karşılığında <b>+3 idare hakkı</b> — kendi krallığını kurduğunda bu rakam konuşur.`}</p>
            <button class="btn primary" onclick="Game.closeModal(); Game.imposeTribute('${loc.id}')">${T`👑 Fiyatı Söyle`}</button>
            <button class="btn" onclick="Game.closeModal()">${T`Vazgeç`}</button>`);
    },
    imposeTribute(locId) {
        let loc = LOCATIONS.find(l => l.id === locId);
        if(!loc || loc.tributeTo === 'player') return;
        loc.tributeTo = 'player';
        loc.tributeDay = state.time.day;
        loc.prosperity = Math.max(5, (loc.prosperity || 50) - 5);
        let owner = this.ownerLord(loc);
        if(owner) Nobles.addRel(owner.id, -20);
        LORDS.filter(l => l.faction === loc.faction && (!owner || l.id !== owner.id))
             .forEach(l => Nobles.addRel(l.id, -4));
        state.player.rightToRule += 3;
        this.updateTopBar();
        alert(T`<b>${T(loc.name)}</b> haraca bağlandı — günde <b>${this.tributeOf(loc)} dinar</b>.
            ${owner ? T`${T(owner.name)} bunu duyacak.` : ''}`);
    },

    startRaid(locId, count) {
        state.player.currentRaid = { locId };
        let loc = LOCATIONS.find(l => l.id === locId);
        Battle.start('Köy Milisi', count, null, loc ? loc.faction : null);
    },
    // --- RAID: AN ONGOING ACTION (#49) ---
    // Routing the militia is half the raid. Emptying the storehouse takes time: you can't move
    // for 15 seconds, time passes, and the village's kingdom's lords march toward the smoke.
    // --- HONOR (#53 item 1.5) ---
    // The old "raider stigma" was a one-way counter: it only ever recorded bad deeds. Honor
    // is the same number made two-sided (−100..100), and the stigma is just the label for its
    // negative side — no second reputation field is kept. It decays 0.5/day toward zero (~24 days per raid).
    HONOR: {
        raid:       [-12, 'raiding a village'],
        robPeace:   [-5,  'robbing a caravan at peace'],
        robPeasant: [-8,  'robbing a peasant caravan'],
        ransom:     [-2,  'ransoming a noble prisoner'],
        release:    [ 5,  'releasing a noble with honor'],
        abduct:     [-20, 'abducting a lady'],
        oathBroken: [-5,  'breaking a campaign pledge'],
        questDone:  [ 2,  'keeping a promise'],
        // Road events (#67): small one by one, but a habit over twenty events
        roadKind:   [ 2,  'lending a hand on the road'],
        roadCruel:  [-2,  'trampling the weak on the road'],
        spare:      [ 3,  'not chasing down the routed']
    },
    honor() { return Math.max(-100, Math.min(100, Math.round(state.player.honor || 0))); },
    addHonor(kind) {
        let h = this.HONOR[kind]; if(!h) return 0;
        state.player.honor = Math.max(-100, Math.min(100, (state.player.honor || 0) + h[0]));
        return h[0];
    },
    // The same honor doesn't read the same to everyone: a good-natured lord loves honor, a cunning
    // one doesn't shy from the dishonorable — Warband's personality reaction (#53/1.5).
    honorWeight(personality) {
        let h = this.honor();
        let w = personality === 'goodnatured' ? h / 40
              : personality === 'cunning' ? -h / 60
              : personality === 'debauched' ? -h / 90
              : h / 55;                                   // martial/quarrelsome: honor counts, but only a little
        return Math.max(-2, Math.min(2, Math.round(w)));
    },
    honorTier() { let h = this.honor(); return h >= 40 ? 2 : h >= 15 ? 1 : h <= -36 ? -2 : h <= -10 ? -1 : 0; },
    honorLabel() { return { '-2': T('💀 Köy Yakan'), '-1': T('🔥 Yağmacı'), '0': '—', '1': T('🕊️ Sözünün Eri'), '2': T('⚜️ Şerefli') }[this.honorTier()]; },
    // The old infamy gates read off honor's negative side — none of the callers had to change
    RAID_INFAMY: 12,
    infamy() { return Math.max(0, -this.honor()); },
    infamyTier() { return Math.max(0, -this.honorTier()); },
    infamyLabel() { return ['—', T('🔥 Yağmacı'), T('💀 Köy Yakan')][this.infamyTier()]; },
    // Price/volunteer multiplier: at 60 dishonor volunteers halve, mercenaries cost 60% more
    // Now two-sided: negative honor scares villagers off, positive honor opens the gate (#53/1.5).
    // The negative side is the same as the old raider penalty, so #49's measurements still hold.
    infamyPenalty() { return Math.max(-0.3, Math.min(0.6, -this.honor() / 100)); },

    // --- BLOOD FEUD (#53 item 1.3) ---
    // A lord whose village you burned, whose caravan you robbed, whose prisoner you ransomed never forgets:
    // for 30 days their party hunts you, and an encounter is a fight, not a conversation.
    GRUDGE_DAYS: 30,
    addGrudge(lordId) { if(lordId) state.grudges[lordId] = state.time.day; },
    hasGrudge(lordId) {
        let d = state.grudges[lordId];
        return d !== undefined && state.time.day - d < this.GRUDGE_DAYS;
    },
    grudgeList() { return Object.keys(state.grudges).filter(id => this.hasGrudge(id)); },
    // Robbing a faction's caravan: the nearest lord (whichever it belongs to) opens the feud
    addGrudgeNearest(faction) {
        if(typeof LORDS === 'undefined') return;
        let near = LORDS.filter(l => l.faction === faction)
            .map(l => ({ l, p: state.npcParties.find(n => n.lordId === l.id) }))
            .filter(o => o.p).sort((a, b) => this.dist(a.p, state.player) - this.dist(b.p, state.player))[0];
        if(near) this.addGrudge(near.l.id);
    },
    RAID_SECONDS: 15,
    RAID_ALERT: 1600,     // a lord within this range sees the smoke; covers ~1200-1600 units in 15s
    RAID_COOLDOWN: 30,    // days — the same village can't be raided again (~12 real minutes at ×1 speed)
    raidedRecently(loc) { return !!loc && loc.raidedDay !== undefined && state.time.day - loc.raidedDay < this.RAID_COOLDOWN; },
    // Battle's victory branch calls this: not loot, the raid phase begins
    completeRaid(locId) {
        let loc = LOCATIONS.find(l => l.id === locId);
        if(!loc) return;
        state.player.currentRaid = null;
        state.player.raid = { locId, t: 0 };
        state.player.x = loc.x; state.player.y = loc.y;
        state.player.targetLocation = null;
        state.player.status = 'raiding';
        this.showScreen('map');
        // Lords who see the smoke head for the village; raidTick refreshes their target every frame
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
            // They made it: the storehouse is only half emptied, no loot — you have to draw your sword
            this.abortRaid(true);
            // A lord whose storehouse got raided has nothing to say to you: the loot's gone, only the sword's left
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
        // How far is the nearest responder? The gamble's tension is in this line.
        let near = state.npcParties.filter(n => n.raidResponder)
                    .sort((a, b) => this.dist(a, loc) - this.dist(b, loc))[0];
        this.setHtml('raid-info',
            `<div><b>${T(loc.name)}</b> ${T`yağmalanıyor — ${(this.RAID_SECONDS - r.t).toFixed(1)} sn`}</div>
             <div class="hud-bar" style="margin:0.4rem 0"><i class="fill-hp" style="width:${pct}%"></i></div>
             <div style="color:${near ? 'var(--danger)' : 'var(--text-muted)'};font-size:var(--fs-sm)">
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
        state.player.renown = Math.max(0, (state.player.renown || 0) - 6);   // eats the victory's +3 as well
        this.addHonor('raid');            // honor drops, the stigma is just its label (#49/#53)
        let owner = this.ownerLord(loc);
        if(owner) this.addGrudge(owner.id);   // the owning lord hunts you for 30 days (#53/1.3)
        if(typeof Nobles !== 'undefined') {
            if(owner) Nobles.addRel(owner.id, -30);
            LORDS.filter(l => l.faction === loc.faction && (!owner || l.id !== owner.id))
                 .forEach(l => Nobles.addRel(l.id, -6));
        }
        // Burning an at-peace kingdom's village is a casus belli
        if(this.playerFaction() && loc.faction !== this.playerFaction()) this.declareWar(this.playerFaction(), loc.faction);
        this.addProficiencyXp('looting', 60);
        Quests.emit('raided', { locId: loc.id, faction: loc.faction });
        alert(T`${T(loc.name)} yağmalandı!\n\n💰 ${loot} dinar\n${food.map(([id, q]) => `${ITEMS[id].icon} ${T(ITEMS[id].name)} x${q}`).join('\n')}`
            + T`\n\nKöyün refahı ${Math.round(loc.prosperity)}'e düştü. Dumanı uzaktan görülüyor; bu unutulmayacak.`);
    },

    talkToElder(loc) {
        let dialog = this.getHumorousDialog('elder', loc);
        this.showModal(`<h3>${T`🧓 Köy Yaşlısı`}</h3><p><i>${dialog}</i></p>`);
    },
    // How many volunteers to take is a choice. It used to be all-or-nothing:
    // with 3 slots of capacity, a village with 5 volunteers couldn't give you even one recruit.
    recruitVolunteers(loc) {
        // A villager joins a raider reluctantly, and for a higher price (#49)
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
        ${pen > 0 ? `<p style="color:var(--danger);font-size:var(--fs-sm)">${T`${this.infamyLabel()} damgası: köyün yarısı seni görünce ambara saklandı (gönüllü −%${Math.round(pen*100)}, ücret +%${Math.round(pen*100)}).`}</p>`
          : pen < 0 ? `<p style="color:#7fd8a0;font-size:var(--fs-sm)">${T`${this.honorLabel()} adın buraya da ulaşmış: fazladan gönüllü çıktı, ücreti de kırdılar (+%${Math.round(-pen*100)} gönüllü, −%${Math.round(-pen*100)} ücret).`}</p>` : ''}
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
        if(loc) this.enterLocation(loc); // refresh the UI
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
                    <div style="color:var(--text-muted);font-size:var(--fs-sm);margin-bottom:0.5rem">${sub}</div>
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
            Object.values(FACTIONS).forEach(f => {
                if(f.id === 'player' || f.id === 'player_kingdom') return;
                let crest = this.crestCss(f.crest, 140,
                    `filter:sepia(0.2) contrast(1.1) ${f.crestFx || ''};`);
                modalHtml += row(frame(crest), f.color, T(f.name), `${T(f.ruler)} · ${T(f.vizier)}`, T(f.lore));
            });
        }

        modalHtml += `</div>
            <button class="btn primary" style="margin-top:2rem;width:200px;" onclick="Game.closeModal()">${T`Kapat`}</button>
        </div>`;
        this.showModal(modalHtml, '1000px', 'bg_hdr.jpg');
    },

    // --- CHARACTER ---
    // Writes what an attribute is doing right now based on its effective value (not the target —
    // the player should see what's actually working, not what they're going to earn).
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
            ${pts > 0 ? `<button class="btn" style="padding:0 0.4rem;font-size:var(--fs-sm);margin-left:0.5rem;" onclick="Game.addStat('${k}')">+</button>` : ''}
            ${done ? '' : `<div style="background:rgba(0,0,0,0.35);border-radius:3px;height:5px;margin:0.3rem 0;max-width:220px">
                <div style="background:var(--primary);height:100%;width:${pct}%;border-radius:3px"></div></div>`}
            <div style="font-size:var(--fs-xs);color:var(--text-muted)">${this.attrEffect(k)}</div>
            ${done ? '' : `<div style="font-size:var(--fs-xs);color:#cbb26b">${T`Gelişimi: ${a.how}`}</div>`}
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
                <div style="font-size:var(--fs-sm);color:var(--text-muted);line-height:1.5">
                    <b style="color:${this.bannerColor()}">${T((BANNERS[p.banner] || BANNERS[0]).name)}</b> ${T`sancağı`}<br>
                    ${p.gender === 'female' ? T('👩 Kadın') : T('👨 Erkek')}<br>${this.backgroundLine()}
                </div>
            </div>
        </div>
        <div style="flex:1;">
            <h3 style="color:var(--primary)">${T`Nitelikler ${pts > 0 ? `<span style="color:#2d2;font-size:var(--fs-md);">${T`(${pts} Puan Dağıtılabilir)`}</span>` : ''}`}</h3>
            <p style="font-size:var(--fs-xs);color:var(--text-muted);margin:-0.4rem 0 0.6rem">
                ${T`Puan vermek <b>hedefi</b> yükseltir. Sayının solundaki <b>efektif</b> değer, o niteliğe
                uygun oynadıkça hedefe yaklaşır — beklemek işe yaramaz.`}</p>
            <ul style="list-style:none;display:flex;flex-direction:column;gap:0.8rem;">
                ${Object.keys(this.ATTRS).map(k => this.attrRowHtml(k, pts)).join('')}
            </ul>
        </div>
        </div>`;

        let fp = s.focusPoints || 0;
        // What each skill does + its current value (feedback: the effects weren't visible before)
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

        let profHtml = `<h3 style="color:var(--primary);margin-top:1.5rem;">${T`Yetenekler ${fp > 0 ? `<span style="color:#2d2;font-size:var(--fs-md);">${T`(${fp} Odak Puanı Dağıtılabilir)`}</span>` : ''}`}</h3>
        <p style="font-size:var(--fs-sm);color:var(--text-muted);margin-bottom:1rem;">${T`Odak puanları yeteneklerin öğrenme hızını artırır (Bannerlord sistemi). Savaşarak gelişir.`}</p>
        <div style="display:flex;flex-wrap:wrap;gap:1rem;">`;
        
        profs.forEach(pr => {
            let pData = p.proficiencies[pr.id] || { level:1, xp:0, next:100, focus:0 };
            p.proficiencies[pr.id] = pData;
            let fill = (pData.xp / pData.next) * 100;
            let mult = 0.5 + (pData.focus||0);
            profHtml += `<div style="background:rgba(0,0,0,0.3);padding:0.8rem;border-radius:6px;width:48%;display:flex;justify-content:space-between;align-items:center;">
                <div style="flex:1">
                    <div style="font-weight:bold">${T`${pr.name} (Seviye ${pData.level})`}</div>
                    <div style="font-size:var(--fs-xs);color:#cbb26b">${pr.d(pData.level)}</div>
                    <div style="font-size:var(--fs-xs);color:var(--text-muted)">${T`Öğrenme Hızı: x${mult} | Odak: ${pData.focus||0}/5`}</div>
                    <div style="background:rgba(0,0,0,0.5);border-radius:2px;height:4px;margin-top:4px;width:90%;">
                        <div style="background:var(--primary);height:100%;width:${fill}%;"></div>
                    </div>
                </div>
                <div>
                    ${(fp > 0 && (pData.focus||0) < 5) ? `<button class="btn primary" style="padding:0.2rem 0.5rem;font-size:var(--fs-sm);" onclick="Game.addFocus('${pr.id}')">+</button>` : ''}
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
    // Troop experience passes through a single place: a kill in battle, and the Training skill too.
    giveTroopXp(t, n = 1) {
        if(!t || t.level >= 50) return null;                             // above 50 only via the Boss Token
        if(TROOP_UPGRADES[t.name] && t.xp >= t.xpNext) return null;      // ready to promote, doesn't take XP
        t.xp += n;
        if(t.xp < t.xpNext) return null;
        if(TROOP_UPGRADES[t.name]) return 'ready';
        t.level++;
        t.xp = 0;
        t.xpNext = t.level < 30 ? 3 + t.level : 5 + t.level * 2;
        return 'levelup';
    },

    // Party skills work by the "highest in the group" rule: a companion who's
    // an expert in their field can stand in for the player's own level.
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
            // An alert would be intrusive mid-battle, so this can go to the logs or console instead.
            console.log(T`Yeteneğin gelişti: ${id} (Lvl ${pData.level})`);
        }
    },
    // Vision from a single source: intelligence + Spotting skill. It used to be that
    // state.player.visibility only updated when an intelligence point was spent.
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
                // legendaries and the wounded are listed on their own row
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
                    <div style="font-size:var(--fs-xs);color:var(--text-muted)">${T`Tür: ${this.troopClassName(typeInfo)}${DMG_TYPES[typeInfo.dmgType] ? ' · ' + T(DMG_TYPES[typeInfo.dmgType].name) : ''}${g.sample.isCompanion ? T` · Yoldaş · ${this.profName((COMPANIONS.find(c=>c.id===g.sample.companionId)||{}).skill)} ${g.sample.level} · 20 dinar/gün` : ''}${g.wounded ? T` · savaşamaz, ${g.wounded} gün` : ''}`}</div>
                    ${g.sample.debuff ? T('<div style="font-size:var(--fs-xs);color:#e0463a">🍖 Et/peynir bulamadı — savaşta can ve saldırı ×0.7</div>') : ''}
                </div>`;

                // Reordering + removing from the party (#51)
                let q = name.replace(/'/g, "\\'");
                html += `<div style="display:flex;gap:0.3rem;align-items:center">
                    <button class="btn" title="Yukarı taşı" style="font-size:var(--fs-xs);padding:0.2rem 0.45rem" onclick="Game.moveTroopGroup('${q}', -1)">▲</button>
                    <button class="btn" title="Aşağı taşı" style="font-size:var(--fs-xs);padding:0.2rem 0.45rem" onclick="Game.moveTroopGroup('${q}', 1)">▼</button>
                    <button class="btn" title="Gruptan çıkar" style="font-size:var(--fs-xs);padding:0.2rem 0.45rem;border-color:var(--danger);color:var(--danger)" onclick="Game.dismissTroops('${q}')">➖</button>
                </div>`;

                if(g.ready.length > 0) {
                    let upgradeChoices = TROOP_UPGRADES[g.base];
                    html += `<div style="display:flex;gap:0.4rem;margin-top:0.4rem;">`;
                    upgradeChoices.forEach(choice => {
                        // Which option is infantry, which is mounted archer — a promotion shouldn't be a blind pick (#51)
                        let ci = this.troopStats({ name: choice.name });
                        html += `<button class="btn primary" style="font-size:var(--fs-xs);padding:0.3rem 0.6rem" onclick="Game.promoteTroop('${g.base.replace(/'/g,"\\'")}', '${T(choice.name).replace(/'/g,"\\'")}', ${choice.cost})">
                            ${T`Sınıf Terfisi: ${ci.icon} ${T(choice.name)} (${choice.cost} Dinar)`}
                            <div style="font-size:var(--fs-xs);opacity:0.8">${this.troopClassName(ci)}${DMG_TYPES[ci.dmgType] ? ' · ' + T(DMG_TYPES[ci.dmgType].name) : ''}</div>
                        </button>`;
                    });
                    html += `</div>`;
                }

                let maxLevelTroop = g.normal.find(t => t.level === 50) || g.ready.find(t => t.level === 50);
                let hasToken = state.player.inventory.some(i => i.id === 'lvl51_token');
                if(maxLevelTroop && hasToken) {
                    html += `<div style="margin-top:0.5rem"><button class="btn" style="border-color:#aa00ff;color:#aa00ff;font-size:var(--fs-xs);padding:0.3rem 0.6rem" onclick="Game.promoteTo51('${maxLevelTroop.id}')">${T`🌟 Savaş Tanrısı Nişanı Kullan (Lvl 51 Yap)`}</button></div>`;
                }

                html += `</li>`;
            }
            html += '</ul>';
        }
        html += this.moraleHtml();
        html += this.prisonersHtml();
        document.getElementById('party-list').innerHTML = html;
    },
    // the legendary prefix only shows on screen, the name in the data stays clean
    troopLabel(t) { return (t.legendary ? T('Efsanevi ') : '') + T(t.name); },
    // The party screen groups troops by this key; reordering and dismissal use the same key (#51)
    troopGroupKey(t) { return this.troopLabel(t) + (t.wounded ? T(' 🩹 (yaralı)') : ''); },
    troopClassName(st) {
        // A Khergit mounted archer is 'archer' in the tree but moves at speed 108 — write the class by
        // looking at speed, or it shows up identical to foot archers in the list. The cutoff is
        // `Battle.FOOT_MAX` — battle's forest "mounted" rule reads the same number, so there's not two thresholds in two places.
        let mounted = st.type === 'cavalry' || st.speed > Battle.FOOT_MAX;
        if(st.type === 'archer') return mounted ? T('Atlı Okçu') : T('Okçu');
        return mounted ? T('Süvari') : T('Piyade');
    },
    // Reorder group by group: the block of troops sharing a name swaps places with the neighboring block
    moveTroopGroup(key, dir) {
        let keys = [];
        state.player.party.forEach(t => { let k = this.troopGroupKey(t); if(keys.indexOf(k) < 0) keys.push(k); });
        let i = keys.indexOf(key), j = i + dir;
        if(i < 0 || j < 0 || j >= keys.length) return;
        keys[i] = keys[j]; keys[j] = key;
        // sort is stable: the order within a block stays intact
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

    // --- MORALE ---
    // Warband's morale system: food variety, wages, leadership, and an overcrowded party all
    // determine whether the party holds together. Low morale means troops desert, and in battle
    // the whole unit fights weaker.
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
            // Instead of a flat -25: the target drops further as debt grows. The real penalty is the
            // -1 morale per hour (Game.wageDebtTick); this line just keeps morale from recovering.
            'Maaş borcu': p.wageDebt > 0 ? -Math.min(40, 10 + Math.floor(p.wageDebt / Math.max(1, this.upkeep().wage)) * 10) : 0,
            'Kapasite aşımı': -over * 2
        };
        p.moraleInfo = parts;
        let t = Object.keys(parts).reduce((a, k) => a + parts[k], 0);
        return Math.max(0, Math.min(100, t));
    },

    // Badges shouldn't overflow off screen. It used to be that every overflowing badge got
    // 'left/right' set by hand (#chip-speed, #chip-time) — adding a new badge meant the same
    // clipping happened again. Now it's shifted in one place, the moment it appears.
    initTooltipClamp() {
        document.addEventListener('mouseover', e => {
            let c = e.target.closest && e.target.closest('.tooltip-container');
            if(c) this.clampTip(c);
        });
    },

    // The overflow fix lives in one place: mouse-triggered and touch-triggered both pass through here (#65)
    clampTip(c) {
        let t = c.querySelector('.tooltip-content');
        if(!t) return;
        t.style.transform = 'translateX(-50%)';
        let r = t.getBoundingClientRect(), pad = 10;
        let over = r.right - (window.innerWidth - pad), under = pad - r.left;
        if(over > 0) t.style.transform = `translateX(calc(-50% - ${Math.ceil(over)}px))`;
        else if(under > 0) t.style.transform = `translateX(calc(-50% + ${Math.ceil(under)}px))`;
    },

    // Food spoils: each kind has its own shelf life (ITEMS[].spoil = days).
    // The fractional loss accumulates on the stack and drops once it reaches a full unit —
    // so a 3-unit stack doesn't sit there forever either.
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

    // How many units will be lost to spoilage today (shown in the tooltip).
    spoilRate() {
        return state.player.inventory.reduce((a, it) => {
            let sp = (ITEMS[it.id] || {}).spoil;
            return a + (sp ? it.qty / sp : 0);
        }, 0);
    },

    // Food status: what's on hand, what's consumed per day, how many days it lasts.
    // Kept in one place so the tooltip, the warning, and the inventory all use the same math.
    foodStock() {
        let inv = state.player.inventory;
        let sum = q => inv.filter(i => q.includes(i.id)).reduce((a, i) => a + i.qty, 0);
        let low = sum(['wheat','bread']), high = sum(['meat','cheese']);
        let up = this.upkeep();
        let need = Math.ceil(up.foodLow);
        // Spoilage eats into the stock too; "how many days it lasts" would be too optimistic without it.
        let drain = need + this.spoilRate();
        return {
            low, high, total: low + high,
            need, needHigh: Math.ceil(up.foodHigh), spoil: this.spoilRate(),
            // Correct even with mixed stock: high quality covers both its own share and the general one
            days: drain > 0 ? Math.floor((low + high) / drain) : Infinity,
            kinds: ['wheat','bread','meat','cheese'].filter(id => inv.some(i => i.id === id && i.qty > 0)).length
        };
    },

    // Daily expense: wages + food. dailyUpdate and the top-bar tooltip use the same math.
    // A troop eats half a unit a day, the player a full unit (we count the player's own stomach too).
    // It used to be 1 per head: a 20-person army ate 21 units a day (~84 dinars),
    // meaning the food bill ran twice the wage bill. This is the single knob — consumption,
    // the "days left" badge, the hunger penalty, and the tooltip breakdown all read from upkeep().
    FOOD_MAN: 0.5,

    upkeep() {
        // The player's own belly is fed too (#75). It used to be only the party was counted:
        // a player traveling alone ate no food at all, and the top bar read "∞ days".
        // This one line stays here because consumption, "days left", the hunger penalty,
        // and the tooltip breakdown all read from this single function.
        let wage = 0, foodLow = 1, foodHigh = 0;
        state.player.party.forEach(t => {
            wage += this.troopWage(t);                              // companion 20, lvl51 free
            if(t.isCompanion) { foodLow += this.FOOD_MAN; return; }
            if(t.level >= 51) return;
            foodLow += t.level >= 20 ? this.FOOD_MAN * 1.5 : this.FOOD_MAN;
            if(t.level >= 30) foodHigh += this.FOOD_MAN;
        });
        wage += this.fiefIncome().wage;   // a fief's garrison wage comes out of your pocket too (#23)
        return { wage, foodLow, foodHigh };
    },

    // So a morale of 0 reads correctly too: (p.morale || 50) used to count zero as 50
    morale() { return typeof state.player.morale === 'number' ? state.player.morale : 60; },

    updateMorale(paid, hungry) {
        let p = state.player;
        p.morale = this.morale();
        let t = this.moraleTarget(paid, hungry);
        // Morale drops fast, recovers slowly
        p.morale = Math.max(0, Math.min(100, p.morale + Math.max(-10, Math.min(4, t - p.morale))));

        if(p.morale < 25 && p.party.length > 0) {
            let n = Math.min(p.party.length, 1 + Math.floor((25 - p.morale) / 8));
            // ponytail: the most recently joined desert first; a random pick wouldn't add anything
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

    // Morale scales the whole unit's strength in battle (0 -> x0.8, 50 -> x1.0, 100 -> x1.2)
    moraleMult() { return 0.8 + this.morale() / 250; },

    moraleHtml() {
        let m = Math.round(this.morale());
        let info = state.player.moraleInfo || {};
        let rows = Object.keys(info).filter(k => info[k] !== 0)
            .map(k => `<div style="display:flex;justify-content:space-between"><span>${T(k)}</span><span style="color:${info[k] > 0 ? '#2ecc71' : '#e74c3c'}">${info[k] > 0 ? '+' : ''}${info[k]}</span></div>`).join('');
        return `<h3 style="color:var(--primary);margin-top:1.5rem">${T`🎺 Moral ${m}/100 — ${this.moraleLabel(m)}`}</h3>
            <div style="background:rgba(0,0,0,0.25);padding:0.8rem;border-radius:6px;font-size:var(--fs-sm);line-height:1.6">
            ${rows || `<i>${T('Henüz hesaplanmadı (bir gün geçmeli).')}</i>`}
            <div style="color:var(--text-muted);margin-top:0.4rem">${T`Savaş gücü çarpanı: ×${this.moraleMult().toFixed(2)}${m < 25 ? T(' · <span style="color:#e74c3c">firar başladı!</span>') : ''}`}</div>
            </div>`;
    },

    // --- PRISONERS ---
    // Capacity depends on the Prisoner Management skill; noble prisoners take up space too.
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
                    <span>⛓️ <b>${T(name)}</b> x${g.count} <span style="color:var(--text-muted);font-size:var(--fs-sm)">${T`(tanesi ${g.value} dinar)`}</span></span>
                    <button class="btn" style="font-size:var(--fs-sm);padding:0.3rem 0.6rem" onclick="Game.sellPrisoners('${T(name).replace(/'/g,"\\'")}')">${T`Sat (+${g.count * g.value})`}</button>
                </li>`;
            }
            html += `</ul><button class="btn primary" style="width:100%" onclick="Game.sellPrisoners()">${T`Hepsini Sat (+${total} Dinar)`}</button>`;
        }
        if(ps.some(p => p.noble)) html += `<p style="color:#e59b3d;font-size:var(--fs-sm);margin-top:0.8rem">${T`Tüccar soylulara elini sürmez: "Onların fidyesi benim değil, senin işin." (Grup ekranından fidye iste)`}</p>`;
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
        // The note is shown inside the modal; alert() would stack on top of showModal
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

    // A ransomed or released lord returns to the map — otherwise a defeated noble
    // was erased from the game entirely.
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
        this.addHonor('ransom'); this.addGrudge(pr.lordId);   // a noble sold for money doesn't forget (#53)
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
        this.addHonor('release'); delete state.grudges[pr.lordId];   // an honorable act wipes the debt (#53)
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
            <p style="font-size:var(--fs-sm);color:var(--text-muted);margin:0 0 0.5rem">${T`Esir Yönetimi ${pm} · her esir günde <b>%${risk}</b> ihtimalle kaçar (soylular kaçmaz) · toplam değer ~${ps.reduce((a, p) => a + (p.noble ? p.ransom : this.prisonerValue(p)), 0)} dinar`}</p>`;
        if(ps.length === 0) return html + `<p style="color:var(--text-muted);font-size:var(--fs-sm)">${T`Zincirlerin boş. Kazandığın savaşlarda düşen düşmanların bir kısmı esir alınır; şehirdeki köle tüccarına satılır.`}</p>`;
        let groups = {};
        html += '<ul style="list-style:none;padding:0">';
        ps.forEach(p => {
            if(p.noble) {
                html += `<li style="padding:0.8rem;background:rgba(0,0,0,0.25);border:1px solid #e59b3d;border-radius:6px;margin-bottom:0.5rem">
                    <b style="color:#e59b3d">👑 ${T(p.name)}</b> <span style="font-size:var(--fs-sm);color:var(--text-muted)">${T`${T((FACTIONS[p.faction]||{name:''}).name)} · İlişki: ${Nobles.relLabel(Nobles.rel(p.lordId))}`}</span>
                    <div style="display:flex;gap:0.4rem;margin-top:0.5rem">
                        <button class="btn" style="font-size:var(--fs-sm);padding:0.3rem 0.6rem" onclick="Game.ransomLord('${p.id}')">${T`💰 Fidye İste (${p.ransom} Dinar)`}</button>
                        <button class="btn" style="font-size:var(--fs-sm);padding:0.3rem 0.6rem;border-color:#2ecc71;color:#2ecc71" onclick="Game.releaseLord('${p.id}')">${T`🕊️ Onurunla Salıver`}</button>
                    </div></li>`;
                return;
            }
            if(!groups[p.name]) groups[p.name] = { count: 0, value: this.prisonerValue(p) };
            groups[p.name].count++;
        });
        for(let name in groups) {
            let g = groups[name];
            html += `<li style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem;background:rgba(0,0,0,0.2);border:1px solid var(--panel-border);border-radius:6px;margin-bottom:0.4rem">
                <span>⛓️ <b>${T(name)}</b> x${g.count} <span style="font-size:var(--fs-sm);color:var(--text-muted)">${T`(tanesi ~${g.value} dinar)`}</span></span>
                <button class="btn" style="font-size:var(--fs-xs);padding:0.25rem 0.5rem" onclick="Game.releasePrisoners('${T(name).replace(/'/g,"\\'")}')">${T`Salıver`}</button>
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
            // Prepending 'Efsanevi ' to the name broke the TROOP_TYPES / TROOP_UPGRADES
            // key; the prefix is now display-only.
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
            let nextTier = TROOP_UPGRADES[newName] ? 2 : 3;   // no further tier means elite rank
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
            <h3 style="color:var(--primary)">${T`Çanta`} <span style="font-size:var(--fs-sm);color:${this.cargoLoad() > this.cargoCap() ? 'var(--danger)' : 'var(--text-muted)'}">${this.cargoLoad()}/${this.cargoCap()}</span></h3>`;
        if(state.player.inventory.length === 0) html += `<p>${T('Envanterin boş.')}</p>`;
        else {
            html += '<div style="display:flex;gap:0.8rem;flex-wrap:wrap;">';
            state.player.inventory.forEach((item,i) => {
                let canEquip = item.type==='weapon'||item.type==='armor'||item.type==='horse';
                let isUse = item.type === 'special' && item.id === 'boss_map';
                html += `<div style="padding:0.8rem;background:rgba(0,0,0,0.3);border:1px solid var(--panel-border);border-radius:6px;width:120px;text-align:center;">
                <div style="font-size:1.5rem">${item.icon||'📦'}</div>
                <div style="font-weight:bold;font-size:var(--fs-md);margin-top:0.3rem">${T(item.name)}</div>
                <div style="color:var(--text-muted);font-size:var(--fs-sm)">x${item.qty}</div>
                ${this.itemNote(item) ? `<div style="font-size:var(--fs-xs);color:#cbb26b;line-height:1.2;margin-top:0.2rem">${this.itemNote(item)}</div>` : ''}
                ${canEquip ? `<button class="btn primary" style="font-size:var(--fs-xs);padding:0.2rem 0.4rem;margin-top:0.3rem" onclick="Game.equipItem(${i})">${T`Kuşan`}</button>` : ''}
                ${isUse ? `<button class="btn" style="border-color:#ffaa00;color:#ffaa00;font-size:var(--fs-xs);padding:0.2rem 0.4rem;margin-top:0.3rem" onclick="Game.useItem(${i})">${T`Kullan`}</button>` : ''}
                </div>`;
            });
            html += '</div>';
        }
        html += '</div></div>';
        document.getElementById('inventory-content').innerHTML = html;
    },
    BOSS_RENOWN: 300,   // the renown gate for the boss map (#55 item 9)
    // The weapon's damage-type tooltip — its behavior against armor shows up here
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
        <div><div style="font-size:var(--fs-xs);color:var(--text-muted)">${label}</div>
        <div style="font-weight:bold">${item ? (item.icon||'')+' '+T(item.name) : T('Yok')}</div>
        ${item ? `<div style="font-size:var(--fs-xs);color:#cbb26b">${this.itemNote(item)}</div>` : ''}</div>
        ${item ? `<button class="btn" style="font-size:var(--fs-xs);padding:0.2rem 0.4rem" onclick="Game.unequipItem('${slot}')">${T`Çıkar`}</button>` : ''}
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
            // The game's strongest reward shouldn't be bought with money alone (#55 item 9): the gate also asks for renown
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
            
            let bossLevel = 30 + (state.bossEntries - 1) * 5; // 30 on the first entry, harder after
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
    // Max HP is derived from one single formula: base + level + armor.
    // It used to look at armor alone, so spending an attribute point or
    // putting on armor would wipe out all the HP that came from level.
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
            s.attributePoints = (s.attributePoints || 0) + 1; // 1 point per level (the target system arrived, points got rarer)
            s.focusPoints = (s.focusPoints || 0) + 3; // Bannerlord-style 3 focus points per level
            this.updateStatsFromEquip(); // +10 max HP per level — from the one formula
            s.hp = s.maxHp;
            alert(`${T`Seviye atladın! Artık Lvl ${s.level}. <b>1 Nitelik</b>, 3 Odak Puanı kazandın.`}<br>` +
                  `${T`Nitelik puanı bir <b>hedef</b> koyar; efektif değer o niteliğe uygun oynadıkça yükselir.`}`);
        }
        this.updateTopBar();
    },

};


// --- SAVE / LOAD ---
// ponytail: we dump the whole state to JSON. npcParties and quest data are plain data,
// so this is enough; the only thing that can't be saved is canvas/loop references.
const Save = {
    // --- SAVE SYSTEM (#55 item 1) ---
    // A single slot + unversioned JSON left "what happens when an old save opens with new
    // code" unanswered. Now: a version number + a migration chain,
    // 3 manual slots + a ring of 5 autosaves, export/import via the clipboard, and
    // a broken save gets set aside instead of deleted.
    LEGACY: 'webband_save_v1',        // the old unversioned single slot — read-only, a migration source
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
            // x/y must be saved too: init() reshuffles settlements' placement randomly on every
            // launch — otherwise, on load, the roads/player position land in a completely different world.
            locations: LOCATIONS.map(l => ({ id: l.id, faction: l.faction, x: l.x, y: l.y, parentId: l.parentId, volunteersAvailable: l.volunteersAvailable, lastRecruitDay: l.lastRecruitDay, prosperity: l.prosperity, raidedDay: l.raidedDay, capturedDay: l.capturedDay,
                owner: l.owner, garrison: l.garrison, storage: l.storage, stock: l.stock,
                enterprise: l.enterprise, treasury: l.treasury, intel: l.intel,
                tributeTo: l.tributeTo, tributeDay: l.tributeDay })),   // enterprise, treasury (#53), memory (#74), tribute (#69)
            playerKingdom: FACTIONS['player_kingdom'] || null
        };
    },

    write(slot) {
        try {
            localStorage.setItem(this.key(slot), JSON.stringify(this.snapshot()));
            return true;
        } catch(e) {
            // If the quota's full, say so instead of locking up the game: let the player delete an old slot
            Debug.log('save', T('Kayıt yazılamadı: ') + e.message, { slot });
            return false;
        }
    },
    save(slot) {
        let ok = this.write(slot || '1');
        if(document.getElementById('save-panel')) return this.open(ok ? T`✅ ${this.slotName(slot || '1')} kaydedildi.` : T('❌ Kayıt başarısız — yer kalmamış olabilir, bir slot sil.'));
        alert(ok ? T('Oyun kaydedildi.') : T('Kayıt başarısız: tarayıcı deposu dolu olabilir.'));
    },
    // A ring autosave at the start of every game day (can be turned off in settings)
    auto() {
        if(!Game.opt('autosave')) return;
        let i = ((state.meta.autoIdx || 0) % this.AUTOS.length);
        state.meta.autoIdx = i + 1;
        this.write(this.AUTOS[i]);
    },

    // Broken JSON used to make the game unopenable; the save isn't deleted, it's set aside.
    read(slot) {
        let raw = localStorage.getItem(this.key(slot));
        if(!raw) return null;
        try { return JSON.parse(raw); }
        catch(e) {
            let backup = 'webband_broken_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
            try { localStorage.setItem(backup, raw); localStorage.removeItem(this.key(slot)); } catch(e2) {}
            Debug.log('save', T('Bozuk kayıt: ') + e.message, { slot, backup });
            alert(`${T`Kayıt bozuk (${this.slotName(slot)}).<br>Silmedim, <b>${backup}</b> anahtarına taşıdım.`}`);
            return null;
        }
    },

    // Migration chain: each version turns a save that came from the previous one into today's shape.
    // These patches used to be one-off ifs scattered inside load().
    migrate(d) {
        if(!d.v || d.v < 2) {
            delete d.state.explored;   // fog of war was removed, the grid is no longer read
            // A legendary troop's name used to be stored with an 'Efsanevi ' prefix
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
    // The start screen's "Continue": whichever save is newest
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
        // In old saves that didn't carry x/y, settlements stayed at init()'s random spot;
        // the roads coming from the save didn't belong to that world, so they're rebuilt from scratch.
        // In saves from before #56 roads are straight lines (no kind) — a new network is built
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
        // Subsystems missing from the save are set up (each one is idempotent on its own)
        if(!Object.keys(state.rivals || {}).length) Nobles.initRivals();
        Game.applyVassals();     // LORDS isn't written to the save, a vassal's banner is restored here
        Game.initDiplomacy();    // in pre-diplomacy saves, fronts are set up
        Game.ensureTraders();    // old saves had no caravans/convoys
        Game.ensureSites();      // old saves had no exploration sites (#58)
        Game.ensureLairs();      // old saves had no bandit lairs (#68)
        Game.startGameLoop();
    },

    // A key missing from the save stays at its default value. It used to be that any key
    // present in state but not in the save was deleted: as versions added new fields
    // (state.rivals, say), loading an old save wiped them out, and the systems reading
    // those fields blew up on undefined. Plain objects merge key by key,
    // arrays and primitives come from the save as-is.
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

    // --- Save screen ---
    open(msg) {
        let rows = this.list(), byId = {};
        rows.forEach(r => byId[r.slot] = r);
        let inGame = document.getElementById('main-ui').classList.contains('active');
        let line = (slot) => {
            let r = byId[slot];
            let info = !r ? T('<span style="color:var(--text-muted)">boş</span>')
                : r.bozuk ? `<span style="color:var(--danger)">${T`bozuk (${r.kb} KB)`}</span>`
                : `<b>${r.ad || '—'}</b> ${T`· ${r.gun}. gün · Sv.${r.seviye || 1}`}
                   <span style="color:var(--text-muted);font-size:var(--fs-sm)">${T`${new Date(r.savedAt).toLocaleString(I18N.lang)} · ${r.kb} KB · v${r.surum}`}</span>`;
            return `<li style="display:flex;justify-content:space-between;align-items:center;gap:0.6rem;padding:0.45rem 0;border-bottom:1px solid var(--panel-border)">
                <span style="min-width:5rem">${this.slotName(slot)}</span>
                <span style="flex:1;font-size:var(--fs-md)">${info}</span>
                <span style="white-space:nowrap">
                    ${inGame && slot[0] !== 'a' && slot !== 'legacy' ? `<button class="btn" style="font-size:var(--fs-xs);padding:0.2rem 0.5rem" onclick="Save.save('${slot}')">${T`Kaydet`}</button>` : ''}
                    ${r && !r.bozuk ? `<button class="btn primary" style="font-size:var(--fs-xs);padding:0.2rem 0.5rem" onclick="Save.load('${slot}')">${T`Yükle`}</button>` : ''}
                    ${r ? `<button class="btn" style="font-size:var(--fs-xs);padding:0.2rem 0.5rem;border-color:var(--danger);color:var(--danger)" onclick="Save.del('${slot}')">${T`Sil`}</button>` : ''}
                </span></li>`;
        };
        Game.showModal(`<div id="save-panel"><h3>${T`💾 Kayıtlar`}</h3>
        ${msg ? `<p style="color:var(--success)">${msg}</p>` : ''}
        <ul style="list-style:none">${this.SLOTS.map(line).join('')}</ul>
        <h4 style="margin-top:0.8rem;color:var(--text-muted);font-size:var(--fs-sm)">${T`Otomatik kayıtlar (her oyun günü)`}</h4>
        <ul style="list-style:none">${this.AUTOS.map(line).join('')}${byId['legacy'] ? line('legacy') : ''}</ul>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.9rem">
            ${inGame ? `<button class="btn" onclick="Save.exportSave()">${T('📤 Dışa Aktar')}</button>` : ''}
            <button class="btn" onclick="Save.importSave()">${T`📥 İçe Aktar`}</button>
            <button class="btn primary" onclick="Game.closeModal()">${T`Kapat`}</button>
        </div></div>`, '660px');
    },
    // Downloading a file under file:// is problematic; the text is copied to the clipboard instead (same pattern as the #52 report)
    exportSave() {
        let txt = JSON.stringify(this.snapshot());
        Game.showModal(`<h3>${T`📤 Kaydı Dışa Aktar`}</h3>
        <p style="font-size:var(--fs-sm);color:var(--text-muted)">${T`Aşağıdaki metni saklayabilir ya da hata raporuna ekleyebilirsin (${Math.round(txt.length / 1024)} KB).`}</p>
        <textarea id="save-text" readonly style="width:100%;height:180px;background:rgba(0,0,0,0.45);color:#cfd6dc;border:1px solid var(--panel-border);border-radius:6px;font:0.7rem/1.3 monospace;padding:0.5rem">${txt.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</textarea>
        <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:0.8rem">
            <button class="btn primary" onclick="Save.copyText()">${T`📋 Panoya Kopyala`}</button>
            <button class="btn" onclick="Save.open()">${T`← Kayıtlar`}</button>
        </div><div id="save-msg" style="text-align:center;margin-top:0.5rem;color:var(--success);font-size:var(--fs-sm)"></div>`, '660px');
    },
    copyText() {
        let ta = document.getElementById('save-text');
        let done = () => { let m = document.getElementById('save-msg'); if(m) m.textContent = T('✅ Panoya kopyalandı.'); };
        if(navigator.clipboard) navigator.clipboard.writeText(ta.value).then(done, () => { ta.select(); document.execCommand('copy'); done(); });
        else { ta.select(); document.execCommand('copy'); done(); }
    },
    importSave() {
        Game.showModal(`<h3>${T`📥 Kaydı İçe Aktar`}</h3>
        <p style="font-size:var(--fs-sm);color:var(--text-muted)">${T`Dışa aktarılmış kayıt metnini yapıştır; 1. slota yazılır ve açılır.`}</p>
        <textarea id="save-text" style="width:100%;height:180px;background:rgba(0,0,0,0.45);color:#cfd6dc;border:1px solid var(--panel-border);border-radius:6px;font:0.7rem/1.3 monospace;padding:0.5rem"></textarea>
        <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:0.8rem">
            <button class="btn primary" onclick="Save.doImport()">${T`Yükle`}</button>
            <button class="btn" onclick="Save.open()">${T`← Kayıtlar`}</button>
        </div><div id="save-msg" style="text-align:center;margin-top:0.5rem;color:var(--danger);font-size:var(--fs-sm)"></div>`, '660px');
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

// The browser can decide the game is installable before `load` fires, and the event is
// not replayed — so these are registered at parse time rather than inside `Game.init()`.
// `deferredInstall` is the whole state: holding the event is what lets `Game.install()`
// open the prompt later, from a real click.
addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    Game.deferredInstall = e;
    Game.showInstallBtn();
});
// Installed from our button or from the browser's own menu — either way it's done.
addEventListener('appinstalled', () => {
    Game.deferredInstall = null;
    Game.showInstallBtn();
});

window.onload = () => Game.init();
