// ============================================
// WEBBAND - SOYLULAR: İLİŞKİ, DİYALOG, FLÖRT, EVLİLİK
// ============================================

// --- KİŞİLİKLER ---
// Kimin hangi hediyeden hoşlandığını, hangi görevi verdiğini ve drahomada
// ne kadar açgözlü olduğunu belirler.
const PERSONALITIES = {
    martial:     { name: 'Savaşçı',    likes: ['sword','axe','lance','horse'], dowry: 1.0, greet: 'Kılıcın keskin mi delikanlı? Laf değil, çelik konuşur burada.' },
    cunning:     { name: 'Kurnaz',     likes: ['iron','salt','velvet'],        dowry: 1.3, greet: 'Her sohbetin bir bedeli vardır. Seninkini henüz hesaplayamadım.' },
    debauched:   { name: 'Sefahatçi',  likes: ['velvet','ale','cheese','meat'],dowry: 1.2, greet: 'Kadeh boş, sohbet kuru. Bu ikisinden birini düzelt bari.' },
    goodnatured: { name: 'İyi Kalpli', likes: ['bread','wheat','cheese'],      dowry: 0.8, greet: 'Hoş geldin evlat. Yolun uzunsa otur, ekmeğimiz var.' },
    quarrelsome: { name: 'Huysuz',     likes: [],                              dowry: 1.15, greet: 'Ne var? Konuşacaksan konuş, dikilip durma karşımda.' }
};

// --- LEYDİ HUYLARI ---
// İltifatın tutup tutmayacağını belirler.
const LADY_TRAITS = {
    romantic:  { name: 'Hülyalı',  likes: 'beauty',  hates: 'war',
                 hint: 'Pencere kenarında oturup uzaklara bakmayı sever.' },
    ambitious: { name: 'Hırslı',   likes: 'glory',   hates: 'beauty',
                 hint: 'Babasının haritalarını ondan daha iyi okur.' },
    pious:     { name: 'Sofu',     likes: 'honor',   hates: 'loot',
                 hint: 'Şafak duasını hiç kaçırmadığı söylenir.' },
    wild:      { name: 'Deli Dolu',likes: 'hunt',    hates: 'court',
                 hint: 'Kardeşlerinden daha iyi ata biner, bunu da saklamaz.' }
};

const COMPLIMENTS = [
    { id:'beauty', label:'Güzelliğinden bahset',        line:'"Kalradya\'nın bütün kalelerini gezdim leydim; hiçbirinin penceresinden böyle bir manzara görünmedi."' },
    { id:'glory',  label:'Fetihlerinden ve namından bahset', line:'"Bir gün bu kıtanın haritasını yeniden çizeceğim. Yanımda kim durursa adı da benimle anılacak."' },
    { id:'honor',  label:'Onurdan ve adaletten bahset', line:'"Yenilmiş bir adamın kesesini almam leydim. Kılıç şerefi için çekilir, gümüş için değil."' },
    { id:'hunt',   label:'Attan ve avdan bahset',       line:'"Doludizgin giderken rüzgârın kulakta çıkardığı sesi bilir misiniz? Ben başka müzik dinlemem."' },
    { id:'court',  label:'Saray adabından bahset',      line:'"Bir soylunun asıl silahı sofradaki duruşudur derler; ben de öyle öğrendim."' },
    { id:'loot',   label:'Ganimetten ve zenginlikten bahset', line:'"Son baskında öyle bir kese aldım ki, ağırlığından atım topalladı."' }
];

const POEMS = [
    { id:'poem_butter', name:'Tereyağı Kasidesi', cost:200,
      text:'"Ekmeğin üstünde eriyen bir sarılık gibisin;\ngörmesem aç kalırım, görsem doyamam."' },
    { id:'poem_steppe', name:'Bozkır Ağıdı', cost:200,
      text:'"Bozkırda yol yoktur, iz vardır.\nSen geçtin diye artık her yer yoldur."' },
    { id:'poem_iron',   name:'Demirci Türküsü', cost:250,
      text:'"Örsün üstünde ne varsa kırılır;\nsenin adın hariç, o su verilmiş çelik."' },
    { id:'poem_north',  name:'Kuzey Kışı', cost:250,
      text:'"Kar yağınca bütün krallıklar aynı beyaza döner.\nBir tek senin saçının rengi kalır."' },
    { id:'poem_river',  name:'Nehir Kenarı', cost:300,
      text:'"Nehir hep aynı yerden akar ama hiç aynı su değildir.\nBen her gün başka bir sebeple aynı kapıya geliyorum."' }
];

// --- SOYLULAR ---
// portraitIndex: lord_portraits.jpg 3x3 ızgarasındaki sıra (0-8)
const LORDS = [
    // Svadya
    { id:'harlaus',  name:'Kral Harlaus',  faction:'swadia',  rank:'king',   personality:'debauched',   homeLocId:'praven',    portraitIndex:0, lore:'Tereyağına olan düşkünlüğü ile bilinir. Ülkesi elden giderken bile ziyafet vermekten geri durmayan, ağır zırhlı geleneksel bir hükümdardır.' },
    { id:'klargus',  name:'Vezir Klargus', faction:'swadia',  rank:'vizier', personality:'cunning',     homeLocId:'suno',      portraitIndex:5, lore:'Her şeye sinirlenen ama hiçbir şey yapamayan tipik bir bürokrat. Kılıç tutmayı bilmez ama vergileri artırma konusunda bir ustadır.' },
    { id:'mustafa',  name:'Lord Mustafa',  faction:'swadia',  rank:'lord',   personality:'goodnatured', homeLocId:'uxkhal',    portraitIndex:3, lore:'Kalradya\'nın en eski ve bilge lordlarından biridir. Gerektiğinde kralların bile ona akıl danıştığı söylenir. Geceleri köy çocuklarına tahta kılıç yonttuğu anlatılır.' },
    { id:'despin',   name:'Kont Despin',   faction:'swadia',  rank:'lord',   personality:'martial',     homeLocId:'dhirim',    portraitIndex:2, lore:'Ziyafet masasında bile zırhını çıkarmayan adam. "Barış, iki savaş arasındaki yemek molasıdır" sözü ona aittir.' },
    { id:'alaric',   name:'Sör Alaric',    faction:'swadia',  rank:'lord',   personality:'quarrelsome', homeLocId:'castle_s1', portraitIndex:7, lore:'Kimseyle üç cümleden fazla konuşamadan tartışmaya girer. Buna rağmen kimse onu turnuvada yenemedi.' },
    { id:'reylan',   name:'Lord Reylan',   faction:'swadia',  rank:'lord',   personality:'cunning',     homeLocId:'castle_s2', portraitIndex:4, lore:'Hangi savaşın kimin kazanacağını hep önceden bilir. Bilmediği zamanlarda ise o savaşa katılmaz.' },

    // Rodok
    { id:'graveth',  name:'Kral Graveth',  faction:'rhodok',  rank:'king',   personality:'martial',     homeLocId:'jelkala',   portraitIndex:1, lore:'Sert mizaçlı, dağlıların lideri. Konseyi devirerek zorla başa geçtiği söylenir.' },
    { id:'matheas',  name:'Vezir Matheas', faction:'rhodok',  rank:'vizier', personality:'goodnatured', homeLocId:'veluca',    portraitIndex:5, lore:'Eskiden tüccardı. Hâlâ her konuşmayı bir pazarlık sanır ama kimseyi kazıkladığı görülmedi.' },
    { id:'serkan',   name:'Lord Serkan',   faction:'rhodok',  rank:'lord',   personality:'quarrelsome', homeLocId:'castle_r1', portraitIndex:8, lore:'Orta yaşlı, taviz vermeyen bir savaş beyi. Geçmişte büyük bir ihanete uğradığı için kimseye tam güvenmez.' },
    { id:'bunduk',   name:'Kont Bunduk',   faction:'rhodok',  rank:'lord',   personality:'martial',     homeLocId:'jelkala',   portraitIndex:6, lore:'Tatar yayını kırk adımdan bir kuruşa isabet ettirdiği iddia edilir. İddiayı hep o ortaya atar.' },

    // Veagir
    { id:'yaroglek', name:'Kral Yaroglek', faction:'vaegir',  rank:'king',   personality:'martial',     homeLocId:'reyvadin',  portraitIndex:2, lore:'Kuzeyin karlı steplerinin hükümdarı. Sert bir mizacı olsa da halkı tarafından benimsenmiştir.' },
    { id:'vuldrat',  name:'Vezir Vuldrat', faction:'vaegir',  rank:'vizier', personality:'cunning',     homeLocId:'khudan',    portraitIndex:5, lore:'Kralın kulağına ne fısıldadığını kimse bilmez, ama fısıldadıktan sonra hep birinin kellesi gider.' },
    { id:'furkan',   name:'Lord Furkan',   faction:'vaegir',  rank:'lord',   personality:'martial',     homeLocId:'castle_v1', portraitIndex:4, lore:'Genç, hırslı ve yetenekli. Ailesinin kökeni bilinmese de kılıçtaki ustalığıyla hızla yükselmiştir.' },
    { id:'dramug',   name:'Boyar Dramug',  faction:'vaegir',  rank:'lord',   personality:'debauched',   homeLocId:'reyvadin',  portraitIndex:0, lore:'Kışın ortasında bile buzlu şarap içer. "Soğuk soğuğu keser" der, kimse itiraz etmez.' },
    { id:'tzevlin',  name:'Boyar Tzevlin', faction:'vaegir',  rank:'lord',   personality:'goodnatured', homeLocId:'khudan',    portraitIndex:3, lore:'Kendi köylülerinin adını tek tek bilir. Bu yüzden diğer boyarlar onu ciddiye almaz.' },

    // Nord
    { id:'ragnar',   name:'Kral Ragnar',   faction:'nord',    rank:'king',   personality:'martial',     homeLocId:'sargoth',   portraitIndex:2, lore:'Nordların tartışmasız lideri. Oğlu için kıtayı fethetmek isteyen bir denizci savaş ağası.' },
    { id:'lethwin',  name:'Vezir Lethwin', faction:'nord',    rank:'vizier', personality:'goodnatured', homeLocId:'tihr',      portraitIndex:5, lore:'Nordlar arasında kılıç yerine kalem tutan tek adam. Bu yüzden hem korunur hem alay edilir.' },
    { id:'ulfrick',  name:'Jarl Ulfrick',  faction:'nord',    rank:'lord',   personality:'quarrelsome', homeLocId:'castle_n1', portraitIndex:6, lore:'Bir baltayı fırlattıktan sonra "pardon" dediği tek olay bir düğündü. Düğün de orada bitti.' },
    { id:'skeggi',   name:'Jarl Skeggi',   faction:'nord',    rank:'lord',   personality:'debauched',   homeLocId:'sargoth',   portraitIndex:8, lore:'Gemisinin ambarını birayla doldurup erzakı unuttuğu sefer hâlâ türkülerde anlatılır.' },

    // Kergit
    { id:'sancar',   name:'Sancar Han',    faction:'khergit', rank:'king',   personality:'cunning',     homeLocId:'tulga',     portraitIndex:1, lore:'Kardeşinin hakkını gasp ederek başa geçtiği için hep tartışılan, at üstünde uyuyup uyanan kurnaz bozkır hanı.' },
    { id:'tonju',    name:'Vezir Tonju',   faction:'khergit', rank:'vizier', personality:'quarrelsome', homeLocId:'halmar',    portraitIndex:7, lore:'Hana bile bağırdığı olmuştur. Hâlâ hayatta olmasının sebebini kimse çözemedi.' },
    { id:'arslan',   name:'Bey Arslan',    faction:'khergit', rank:'lord',   personality:'martial',     homeLocId:'narra',     portraitIndex:6, lore:'Dört yaşında ata bindi, beş yaşında düştü, altı yaşında bir daha düşmedi.' },
    { id:'kagan',    name:'Bey Kağan',     faction:'khergit', rank:'lord',   personality:'debauched',   homeLocId:'castle_k1', portraitIndex:0, lore:'Kımızı su gibi içer, sonra bozkırda kaybolur, üç gün sonra başka bir boyun çadırında bulunur.' }
];

const LADIES = [
    { id:'isolla',  name:'Leydi Isolla',  faction:'swadia',  guardianId:'harlaus',  homeLocId:'praven',    trait:'ambitious', lore:'Babasının ziyafetlerinden sıkılır; masanın altında krallığın borç defterini okur.' },
    { id:'adelia',  name:'Leydi Adelia',  faction:'swadia',  guardianId:'despin',   homeLocId:'dhirim',    trait:'romantic',  lore:'Kalenin en yüksek burcunda oturup güneşin batışını izler. Babası bunu "vakit kaybı" sayar.' },
    { id:'nelda',   name:'Leydi Nelda',   faction:'swadia',  guardianId:'reylan',   homeLocId:'castle_s2', trait:'pious',     lore:'Şafak duasını hiç kaçırmaz. Ganimet sandığına elini bile sürmediği söylenir.' },
    { id:'safiya',  name:'Leydi Safiya',  faction:'swadia',  guardianId:'klargus',  homeLocId:'suno',      trait:'wild',      lore:'Amcasının atlarını gizlice alıp geceleri ovada koşturur. Üç kez yakalandı, üçünde de kaçtı.' },
    { id:'sonadel', name:'Leydi Sonadel', faction:'rhodok',  guardianId:'graveth',  homeLocId:'jelkala',   trait:'pious',     lore:'Dağ manastırında büyüdü. Babasının darbeyle başa geçmesini hâlâ affetmiş değil.' },
    { id:'vera',    name:'Leydi Vera',    faction:'rhodok',  guardianId:'bunduk',   homeLocId:'jelkala',   trait:'ambitious', lore:'Babasının tatar yayı iddialarına bahis açar ve genelde kazanır.' },
    { id:'anya',    name:'Leydi Anya',    faction:'vaegir',  guardianId:'yaroglek', homeLocId:'reyvadin',  trait:'romantic',  lore:'Kışın donmuş pencereye parmağıyla isimler yazar, sonra sildiğini söyler.' },
    { id:'milena',  name:'Leydi Milena',  faction:'vaegir',  guardianId:'dramug',   homeLocId:'reyvadin',  trait:'wild',      lore:'Babasının av köpeklerini ondan iyi tanır. Kurt sürüsüne tek başına yaklaştığı anlatılır.' },
    { id:'aesa',    name:'Leydi Aesa',    faction:'nord',    guardianId:'ragnar',   homeLocId:'sargoth',   trait:'wild',      lore:'Babasının uzun gemisinde büyüdü. Karada yürürken bile güverte adımı atar.' },
    { id:'hilda',   name:'Leydi Hilda',   faction:'nord',    guardianId:'ulfrick',  homeLocId:'castle_n1', trait:'ambitious', lore:'Kardeşlerinin hepsinden iyi kalkan tutar ama kimse ona sıra vermez. Bu onu daha da hırslandırır.' },
    { id:'altun',   name:'Leydi Altun',   faction:'khergit', guardianId:'sancar',   homeLocId:'tulga',     trait:'ambitious', lore:'Hanın en sevdiği evladı olduğunu bilir ve bunu bir koz gibi kullanır.' },
    { id:'gokce',   name:'Leydi Gökçe',   faction:'khergit', guardianId:'arslan',   homeLocId:'narra',     trait:'romantic',  lore:'Bozkırda söylenen bütün ağıtları ezbere bilir; hiçbirini sonuna kadar söylemez.' }
];

// --- TALİPLER (kadın oyuncu) ---
// Kadın karakterin evlilik yolu leydilerden değil bekâr lordlardan geçer.
// Flört makinesini ikiye ayırmamak için lord "leydi şeklinde" sarılır:
// vasisi kendi kralı, huyu mizacından türer. SUITORS ilk istendiğinde dolar.
const SUITOR_TRAIT = { martial:'ambitious', cunning:'pious', debauched:'wild',
                       goodnatured:'romantic', quarrelsome:'wild' };
const SUITORS = [];

// --- YOLDAŞLAR ---
// Handa bulunan isimli NPC kahramanlar. Sıradan askerden farkları: savaşta
// ölmezler (yaralanırlar), seviye atlarlar ve uzmanlık yeteneklerini gruba
// katarlar (Game.profLvl "gruptaki en yüksek" kuralını uygular).
const COMPANIONS = [
    { id:'ferhat',  name:'Cerrah Ferhat',    city:'praven',   cost:800, skill:'surgery',      troopType:'infantry', icon:'🩺', level:10,
      lore:'Ordu cerrahıydı, bir lordun kolunu kesmeyi reddedince kovuldu. "Adam iyileşti ama beni kovdular. Kalradya böyle bir yer."',
      dislikes:['kudret'] },
    { id:'zeynep',  name:'İzci Zeynep',      city:'sargoth',  cost:700, skill:'spotting',     troopType:'archer',   icon:'🦅', level:11,
      lore:'Sisin içinde bir atlıyı sesinden tanır. "Gözüm senin haritandan iyidir, ona güven."',
      dislikes:[] },
    { id:'bahadir', name:'Kılavuz Bahadır',  city:'tulga',    cost:750, skill:'pathfinding',  troopType:'cavalry',  icon:'🧭', level:10,
      lore:'Bozkırda doğdu, yolu yıldızdan okur. "Kestirme diye bir şey yok, sadece bilenler ve kaybolanlar var."',
      dislikes:[] },
    { id:'mervan',  name:'Tüccar Mervan',    city:'reyvadin', cost:900, skill:'trade',        troopType:'infantry', icon:'💰', level:9,
      lore:'İki kervanını da çapulculara kaptırdı, üçüncüsünü korumak için kılıç kuşandı. "Zarar da bir tecrübedir ama pahalı olanından."',
      dislikes:['kudret'] },
    { id:'kudret',  name:'Gaddar Kudret',    city:'jelkala',  cost:650, skill:'looting',      troopType:'infantry', icon:'🪓', level:12,
      lore:'Savaş meydanında ölülerin cebini ilk o karıştırır. "Ölünün dinarı ölüye ne fayda?"',
      dislikes:['ferhat','mervan'] },
    { id:'lale',    name:'Talimci Lale',     city:'uxkhal',   cost:850, skill:'trainer',      troopType:'archer',   icon:'🎯', level:10,
      lore:'Bir kalenin bütün garnizonunu tek başına eğitti, komutan alkışı kendine sakladı. "Bana asker ver, sana ordu vereyim."',
      dislikes:[] },
    { id:'harun',   name:'Zindancı Harun',   city:'halmar',   cost:600, skill:'prisonerMgmt', troopType:'infantry', icon:'🔗', level:9,
      lore:'On yıl zindan gardiyanlığı yaptı, sonra zindandakiyle yer değiştirdi. "Zinciri bilirim; iki tarafından da tuttum."',
      dislikes:[] }
];

// --- SOYLU SİSTEMİ ---
const Nobles = {

    // ---------- Yardımcılar ----------
    lord(id)  { return LORDS.find(l => l.id === id); },
    lady(id)  {
        if(id && id.indexOf('suitor_') === 0) return this.suitors().find(l => l.id === id);
        return LADIES.find(l => l.id === id);
    },

    isFemale() { return state.player.gender === 'female'; },

    // Kur yapılabilecekler: erkek oyuncuda leydiler, kadın oyuncuda bekâr lordlar.
    courtables() { return this.isFemale() ? this.suitors() : LADIES; },

    suitors() {
        if(!SUITORS.length) {
            LORDS.filter(l => l.rank !== 'king').forEach(l => {
                let king = LORDS.find(k => k.faction === l.faction && k.rank === 'king');
                SUITORS.push({ id: 'suitor_' + l.id, lordId: l.id, suitor: true, name: l.name,
                    faction: l.faction, homeLocId: l.homeLocId, portraitIndex: l.portraitIndex,
                    guardianId: king ? king.id : l.id, trait: SUITOR_TRAIT[l.personality], lore: l.lore });
            });
        }
        return SUITORS;
    },
    any(id)   { return this.lord(id) || this.lady(id); },

    rel(id)   { return state.relations[id] || 0; },
    addRel(id, n) {
        state.relations[id] = Math.max(-100, Math.min(100, this.rel(id) + n));
        return state.relations[id];
    },
    aff(id)   { return state.affection[id] || 0; },
    addAff(id, n) {
        state.affection[id] = Math.max(0, Math.min(100, this.aff(id) + n));
        return state.affection[id];
    },

    relLabel(v) {
        if(v >= 60) return '<span style="color:#2ecc71">Sadık Dost</span>';
        if(v >= 25) return '<span style="color:#8ecf5a">Dost</span>';
        if(v >= 5)  return '<span style="color:#ccc">Hoşnut</span>';
        if(v > -5)  return '<span style="color:#999">Kayıtsız</span>';
        if(v > -25) return '<span style="color:#e59b3d">Kırgın</span>';
        if(v > -60) return '<span style="color:#e74c3c">Düşman</span>';
        return '<span style="color:#ff3333">Kan Davalı</span>';
    },

    // 3x3 sprite sheet'ten portre karesi
    portraitCss(n, size = 120) {
        let col = (n.portraitIndex ?? 0) % 3, row = Math.floor((n.portraitIndex ?? 0) / 3);
        if(n.isGuild) {
            // Lonca ustasının portresi yok — terazi mührü
            return `<div style="width:${size}px;height:${size}px;border-radius:8px;flex:0 0 auto;
                background:linear-gradient(160deg,#4a3a1c,#221a0c);border:4px ridge #dca243;
                display:flex;align-items:center;justify-content:center;font-size:${size*0.5}px;">⚖️</div>`;
        }
        if(n.guardianId !== undefined && !n.suitor) {
            // Leydiler için portre yok — kamea tarzı baş harf madalyonu
            let letter = n.name.replace(/^Leydi\s+/, '').charAt(0);
            let hue = (n.id.charCodeAt(0) * 37) % 360;
            return `<div style="width:${size}px;height:${size}px;border-radius:50%;flex:0 0 auto;
                background:radial-gradient(circle at 35% 30%, hsl(${hue} 45% 62%), hsl(${hue} 35% 22%));
                border:4px ridge #dca243;display:flex;align-items:center;justify-content:center;
                font-family:'Cinzel',serif;font-size:${size*0.45}px;color:#1a0b02;
                text-shadow:0 1px 0 rgba(255,255,255,0.35);box-shadow:inset 0 0 20px rgba(0,0,0,0.6);">${letter}</div>`;
        }
        return `<div style="width:${size}px;height:${size}px;flex:0 0 auto;border:4px ridge #dca243;
            background-image:url('lord_portraits.jpg');background-size:300% 300%;
            background-position:${col*50}% ${row*50}%;filter:sepia(0.2) contrast(1.1);
            box-shadow:inset 0 0 15px #000;"></div>`;
    },

    // ---------- Nerede kim var ----------
    // Bir lord "evinde" sayılır: partisi kendi yerleşimine yakınsa ya da orada şölen varsa.
    partyOf(lordId) { return state.npcParties.find(n => n.lordId === lordId); },

    isAt(lordId, locId) {
        if(state.feast && state.feast.locId === locId) {
            let l = this.lord(lordId);
            if(l && l.faction === state.feast.faction) return true;
        }
        let l = this.lord(lordId);
        if(!l) return false;
        if(l.homeLocId !== locId) return false;
        let party = this.partyOf(lordId);
        let loc = LOCATIONS.find(x => x.id === locId);
        if(!party || !loc) return false;
        return Game.dist(party, loc) < 420;
    },

    lordsAt(locId) { return LORDS.filter(l => this.isAt(l.id, locId)); },

    // Leydiler seyahat etmez; evlerindedirler (şölendeyse şölen şehrinde).
    // Talip lordlar ise gezer: ancak kendi salonundayken (ya da şölende) bulunur.
    ladiesAt(locId) {
        return this.courtables().filter(l => {
            if(l.suitor) return this.isAt(l.lordId, locId);
            if(state.feast && state.feast.locId === locId && l.faction === state.feast.faction) return true;
            return l.homeLocId === locId;
        });
    },

    // ---------- Lordlar Salonu ----------
    HALL_RENOWN: 80,

    openHall(loc) {
        let f = FACTIONS[loc.faction] || { name: '?' };
        let lords = this.lordsAt(loc.id);
        let ladies = this.ladiesAt(loc.id);
        let renown = state.player.renown;

        let html = `<h3>👑 Lordlar Salonu — ${loc.name}</h3>
            <p style="color:var(--text-muted);font-size:0.9rem">${f.name}${state.feast && state.feast.locId===loc.id ? ' — <b style="color:#ffcc00">🍷 Şölen sürüyor!</b>' : ''}</p>`;

        html += `<h4 style="margin-top:1.2rem;color:var(--primary)">Salondaki Soylular</h4>`;
        if(lords.length === 0) {
            html += `<p style="color:var(--text-muted);font-size:0.9rem">Salon boş. Soylular sefere çıkmış; onları haritada bulman ya da bir başkasına yerlerini sorman gerek.</p>`;
        } else {
            html += `<div style="display:flex;flex-wrap:wrap;gap:1rem;margin-top:0.6rem">`;
            lords.forEach(l => html += this.nobleCard(l));
            html += `</div>`;
        }

        // Kadın oyuncuda kur hedefi lordların kendisidir; ayrı bir konuk listesi
        // aynı kartları ikinci kez basardı — kur yapma lordun diyaloğundan yürür.
        if(this.isFemale()) {
            html += `<p style="margin-top:1.2rem;font-size:0.85rem;color:var(--text-muted)">
                Salonun leydileri seninle ilgilenmiyor. Bekâr bir lorda kur yapmak istersen
                onunla konuş (gereken nam: ${this.HALL_RENOWN}, sende ${renown}).</p>`;
        } else {
        html += `<h4 style="margin-top:1.5rem;color:var(--primary)">Salonun Konukları</h4>`;
        if(renown < this.HALL_RENOWN) {
            html += `<p style="color:var(--danger);font-size:0.9rem">Kapıdaki muhafız yolunu kesiyor:
                <i>"Kim bu üstü başı toz içindeki? Soyluların oturduğu salona her önüne gelen giremez."</i><br>
                <span style="color:var(--text-muted)">Gereken nam: ${this.HALL_RENOWN} (sende ${renown})</span></p>`;
        } else if(ladies.length === 0) {
            html += `<p style="color:var(--text-muted);font-size:0.9rem">Bugün konuk yok.</p>`;
        } else {
            html += `<div style="display:flex;flex-wrap:wrap;gap:1rem;margin-top:0.6rem">`;
            ladies.forEach(l => html += this.nobleCard(l));
            html += `</div>`;
        }
        }

        if(!state.player.vassalOf && loc.faction && FACTIONS[loc.faction]) {
            html += `<button class="btn" style="margin-top:1.5rem" onclick="Nobles.swearFealtyPrompt('${loc.faction}')">⚔️ ${FACTIONS[loc.faction].ruler}'a Bağlılık Yemini Et</button>`;
        }
        html += `<button class="btn" style="margin-top:0.5rem" onclick="Game.closeModal()">Ayrıl</button>`;
        Game.showModal(html, '760px');
    },

    nobleCard(n) {
        let isLady = n.guardianId !== undefined;
        let sub = isLady
            ? `İlgi: <b style="color:#ff9ec4">${this.aff(n.id)}</b>`
            : this.relLabel(this.rel(n.id));
        return `<div onclick="Nobles.talk('${n.id}')" style="cursor:pointer;width:150px;text-align:center;
            padding:0.6rem;background:rgba(0,0,0,0.35);border:1px solid var(--panel-border);border-radius:8px">
            <div style="display:flex;justify-content:center">${this.portraitCss(n, 96)}</div>
            <div style="font-weight:bold;margin-top:0.5rem;font-size:0.9rem">${n.name}</div>
            <div style="font-size:0.75rem;margin-top:0.2rem">${sub}</div>
        </div>`;
    },

    swearFealtyPrompt(fid) {
        if(state.player.renown < 50) return alert('Derebeyi olmak için en az 50 Nam gerekli.');
        state.player.vassalOf = fid;
        state.player.rightToRule += 5;
        LORDS.filter(l => l.faction === fid).forEach(l => this.addRel(l.id, 10));
        alert(`Artık ${FACTIONS[fid].name} derebeyisin! Krallığın lordları seni tanımaya başladı.`);
        Game.closeModal();
        Game.updateTopBar();
    },

    // ---------- Diyalog ----------
    talk(id) {
        let n = this.any(id);
        if(!n) return;
        if(n.guardianId !== undefined) return this.courtMenu(id);

        let r = this.rel(id);
        let p = PERSONALITIES[n.personality];
        let line = this.greetLine(n, r);
        Quests.emit('talked_to', { lordId: id });

        let html = `<div style="display:flex;gap:1.5rem;align-items:flex-start">
            ${this.portraitCss(n, 140)}
            <div style="flex:1">
                <h3 style="margin:0;color:${FACTIONS[n.faction].color}">${n.name}</h3>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.6rem">
                    ${FACTIONS[n.faction].name} · ${p.name} · İlişki: ${this.relLabel(r)} (${r})
                    <br>Gözünde ağırlığın: <b style="color:var(--primary)">${this.standingLabel(this.standing(id))}</b>
                    <span style="opacity:0.7">(nam + ilişki + kapıya getirdiğin ordu)</span>
                </div>
                <p style="font-style:italic;color:#eee;line-height:1.5">${line}</p>
            </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1.2rem">`;

        let today = state.time.day;
        let chat = state.smallTalkDay || {};
        html += chat[id] === today
            ? `<button class="btn" disabled style="opacity:0.4">🗣️ Hâl hatır soruldu (bugünlük yeter)</button>`
            : `<button class="btn" onclick="Nobles.smallTalk('${id}')">🗣️ Hâl hatır sor</button>`;

        html += `<button class="btn" onclick="Quests.offerMenu('${id}')">📜 Bana bir iş var mı?</button>`;
        html += `<button class="btn" onclick="Nobles.askWhereMenu('${id}')">🗺️ Birinin yerini sor</button>`;
        html += `<button class="btn" onclick="Nobles.giftMenu('${id}')">🎁 Hediye ver</button>`;

        // "Bir Şiir Getir" görevi bu lorddaysa ve ezberinde şiir varsa
        if(state.player.poems.length && state.player.quests.some(q => q.id === 'bring_poem' && q.giverId === id))
            html += `<button class="btn" onclick="Nobles.recitePoemToLord('${id}')">🎵 Öğrendiğin şiiri oku</button>`;

        // Kadın oyuncunun kur yolu: lordun kendi diyaloğundan (salon nam kapısı burada)
        let suitor = this.isFemale() ? this.suitors().find(x => x.lordId === id) : null;
        if(suitor) {
            html += state.player.renown >= this.HALL_RENOWN
                ? `<button class="btn" style="border-color:#ff9ec4;color:#ff9ec4" onclick="Nobles.courtMenu('${suitor.id}')">💘 Ona kur yap (ilgi ${this.aff(suitor.id)})</button>`
                : `<button class="btn" disabled style="opacity:0.4">💘 Kur yapmak için ${this.HALL_RENOWN} nam gerekir (sende ${state.player.renown})</button>`;
        }

        let wards = this.courtables().filter(l => l.guardianId === id);
        if(wards.length) {
            wards.forEach(w => {
                html += `<button class="btn" style="border-color:#ff9ec4;color:#ff9ec4" onclick="Nobles.askForHand('${w.id}')">💍 ${w.name} ile ilgili konuşmak istiyorum</button>`;
            });
        }

        html += `<button class="btn" style="border-color:var(--danger);color:var(--danger)" onclick="Nobles.insult('${id}')">🤬 Hakaret et</button>`;
        html += `<button class="btn" onclick="Game.closeModal()">Ayrıl</button></div>`;

        Game.showModal(html, '680px');
    },

    recitePoemToLord(id) {
        let p = POEMS.find(x => x.id === state.player.poems[0]);
        Quests.emit('poem_recited_lord', { lordId: id, poemId: p.id });
        alert(`${p.text}\n\n${this.lord(id).name} kadehini masaya bıraktı. "Fena değil. Ziyafette bunu okuyacaksın."`);
    },

    // Oyuncunun soylu gözündeki ağırlığı: nam + ilişki + kapıya getirdiği ordu.
    // -1 küçümsenen ... 4 çekinilen. Replikler ve sohbetin karşılığı buna bağlı.
    standing(id) {
        let p = state.player, r = this.rel(id);
        let theirs = (state.npcParties.find(x => x.lordId === id) || {}).size || 20;
        let power = p.party.length / Math.max(1, theirs);
        let sc = Math.min(3, Math.floor(p.renown / 130))
               + (r >= 40 ? 1 : r <= -15 ? -1 : 0)
               + (power >= 1.2 ? 1 : power < 0.4 ? -1 : 0)
               - (this.lord(id).personality === 'quarrelsome' ? 1 : 0);
        return Math.max(-1, Math.min(4, sc));
    },
    standingLabel(sc) {
        return ['Bir hiç', 'Tanınmayan', 'Adı duyulmuş', 'Saygı gören', 'Ünlü', 'Çekinilen'][sc + 1];
    },

    // Selamlama: önce husumet, sonra dostluk, sonra oyuncunun ağırlığı.
    // Sabit tek cevap yok — her kademenin kendi havuzu var.
    GREETS: {
        '-1': [
            'Sen de kimsin? Kapıda bekleyen dilencilere sadaka veriyoruz, salonda değil.',
            'Adını duymadım, ordunu görmedim, vaktimi de alma.',
            'Şu üstündekine kılık mı denir? Konuş bakalım, kısa tut.'
        ],
        '0': [
            'Seni bir yerden hatırlar gibiyim. Neyse, derdini söyle.',
            "Bir yolcu daha. Kalradya'da bunlardan bol var.",
            'Konuş. Ama ağzından çıkanı kulağın duysun.'
        ],
        '1': [
            'Adını duydum. Küçük işler, ama iş sonuçta.',
            'Otur bakalım. Bir kadeh içimlik vaktim var.',
            'Yollarda gezen çok, iş bitiren az. Sen hangisisin?'
        ],
        '2': [
            'Hoş geldin. Senin adın bu salonda birkaç kez geçti — kötüsünden değil.',
            'Gel şöyle. Kılıcını duvara as, sohbet uzun sürebilir.',
            'Seni beklemiyordum ama yerim var. Anlat.'
        ],
        '3': [
            'Buyur, baş köşe senin. Böylesi her gün kapımı çalmıyor.',
            'Namın önünden yürüyor. Umarım söyledikleri abartıdır — abartı değilse pahalıya patlar.',
            'Hizmetkâr! İyi şarabı getir. Bu adam ayakta karşılanmaz.'
        ],
        '4': [
            'Ordunu kapımın önünde gördüm. Dostça geldiğini varsayıyorum... değil mi?',
            'Sen artık bir maceracı değilsin, bir mesele oldun. Otur, konuşalım.',
            'Bu salonda bugün iki lord var galiba. Söyle bakalım, ne istersin?'
        ]
    },
    greetLine(n, r) {
        if(r <= -50) return `"Sen hâlâ nefes alıyor musun? Bir gün bu hatayı düzelteceğim."`;
        if(r <= -15) return `"Yüzünü görmek bile keyfimi kaçırıyor. Çabuk söyle derdini."`;
        if(r >= 60)  return `"Gel bakalım! Otur şöyle. Senin geldiğin gün kötü haber gelmez bu kapıya."`;
        let pool = this.GREETS[String(this.standing(n.id))] || this.GREETS['0'];
        // Aynı lordda aynı gün aynı repliği tekrarlama
        let seed = (state.time.day * 7 + (n.id || '').length * 3) % pool.length;
        return `"${pool[seed]}"`;
    },

    smallTalk(id) {
        let today = state.time.day;
        state.smallTalkDay = state.smallTalkDay || {};
        if(state.smallTalkDay[id] === today) return;
        state.smallTalkDay[id] = today;

        let n = this.lord(id);
        // Sohbet artık otomatik +1 değil: seni ciddiye almayan lord hiçbir şey
        // vermez, hatta tersler. Ağırlığın arttıkça sohbetin de karşılığı artar.
        let sc = this.standing(id);
        let gain = sc <= -1 ? -1 : sc === 0 ? 0 : sc <= 2 ? 1 : 2;
        if(gain) this.addRel(id, gain);
        Game.trainAttr('int', 0.3);

        if(sc <= 0) {
            let brush = [
                `"Havadan sudan konuşacak vaktim yok. Adını duyduğum gün otururuz."`,
                `"Bak evlat, ben her gelene ahbap olsam bu salonda oturacak yer kalmazdı."`,
                `"Hava mı? Güzel. Hasat mı? Fena değil. Başka? Yok mu? Güle güle."`,
                `"Sen konuşurken ben kaç mızrak ısmarlayacağımı hesaplıyordum. Kusura bakma."`
            ];
            alert(`${n.name}: ${brush[Math.floor(Math.random()*brush.length)]}\n\n` +
                  `(Gözünde ağırlığın: ${this.standingLabel(sc)}${gain ? ` · ${gain} ilişki` : ' · ilişki değişmedi'})\n` +
                  `Nam kazan, kalabalık bir orduyla gel — kapılar o zaman açılır.`);
            return this.talk(id);
        }

        let topics = [
            `"${FACTIONS[n.faction].name}'nda vergiler yine arttı. Kimse konuşmuyor ama herkes biliyor."`,
            `"Bu aralar yollarda çapulcu kaynıyor. Kimin beslediğini merak ediyorum."`,
            `"Duyduğuma göre ${LORDS[Math.floor(Math.random()*LORDS.length)].name} yine bir sınırda dolaşıyormuş."`,
            `"Geçen kış ambarlar boş kaldı. Bu yıl aynısı olursa kılıç değil kaşık konuşacak."`,
            `"Turnuvalar eskisi gibi değil. Eskiden adam ölürdü, şimdi herkes sağ dönüyor."`
        ];
        if(sc >= 3) topics.push(
            `"Açık konuşayım: seninle iyi geçinmek, karşında olmaktan ucuz."`,
            `"Kraldan önce sana danışan lordlar var artık. Bunu ben söylemedim, sen de duymadın."`);
        alert(`${n.name}: ${topics[Math.floor(Math.random()*topics.length)]}\n\n` +
              `(Gözünde ağırlığın: ${this.standingLabel(sc)} · +${gain} ilişki)`);
        this.talk(id);
    },

    insult(id) {
        let n = this.lord(id);
        this.addRel(id, -15);
        state.player.renown += 2;
        // Rakip krallıkların lordları bundan hoşlanır
        LORDS.filter(l => l.faction !== n.faction).forEach(l => this.addRel(l.id, 5));
        Game.updateTopBar();
        alert(`Sen: "Senin soyağacın bir tereyağı fıçısına sığar ${n.name}."\n\n${n.name} mosmor kesildi.\n−15 ilişki, +2 nam. Rakip krallıkların lordları bunu duyunca keyiflendi (+5).`);
        Game.closeModal();
    },

    // ---------- Hediye ----------
    giftMenu(id) {
        let n = this.lord(id);
        let inv = state.player.inventory.filter(i => i.type !== 'special');
        if(inv.length === 0) return alert('Verecek bir şeyin yok.');
        if(state.giftDay && state.giftDay[id] === state.time.day)
            return alert('Bugün ona zaten bir hediye verdin. Fazlası yalakalık olur.');

        let html = `<h3>🎁 ${n.name}'a Hediye</h3>
            <p style="color:var(--text-muted);font-size:0.85rem">Herkes her şeyden hoşlanmaz. ${PERSONALITIES[n.personality].name} bir adamın neyi seveceğini tahmin et.</p>
            <div style="display:flex;flex-wrap:wrap;gap:0.6rem;margin-top:1rem">`;
        state.player.inventory.forEach((it, i) => {
            if(it.type === 'special') return;
            html += `<button class="btn" style="font-size:0.8rem" onclick="Nobles.giveGift('${id}',${i})">${it.icon||'📦'} ${it.name} (x${it.qty})</button>`;
        });
        html += `</div><button class="btn" style="margin-top:1rem" onclick="Nobles.talk('${id}')">Geri</button>`;
        Game.showModal(html);
    },

    giveGift(id, idx) {
        let n = this.lord(id);
        let item = state.player.inventory[idx];
        if(!item) return;
        let p = PERSONALITIES[n.personality];

        let gain, line;
        if(n.personality === 'quarrelsome') {
            gain = 3; line = `"Hı. Sağ ol." Fazlasını bekleme.`;
        } else if(p.likes.includes(item.id)) {
            gain = { martial:8, cunning:6, debauched:10, goodnatured:7 }[n.personality];
            line = `"${item.name}! İşte adam gibi hediye." Gözleri parladı.`;
        } else {
            gain = 1; line = `"...Sağ ol." Hediyeyi yandaki masaya bıraktı, bir daha bakmadı.`;
        }

        item.qty--;
        if(item.qty <= 0) state.player.inventory.splice(idx, 1);
        state.giftDay = state.giftDay || {};
        state.giftDay[id] = state.time.day;
        this.addRel(id, gain);

        alert(`${n.name}: ${line}\n\n+${gain} ilişki`);
        this.talk(id);
    },

    // ---------- "Birinin yerini sor" ----------
    askWhereMenu(askedId) {
        let asked = this.lord(askedId);
        let others = LORDS.filter(l => l.id !== askedId);
        let html = `<h3>🗺️ ${asked.name}'a sor: "… nerede?"</h3>
            <p style="color:var(--text-muted);font-size:0.85rem">
            Alacağın cevabın doğruluğu onunla aranın iyiliğine bağlı. Kırgın bir adam seni bilerek yanlış yola sürer.</p>
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1rem;max-height:45vh;overflow-y:auto">`;
        others.forEach(l => {
            html += `<button class="btn" style="font-size:0.8rem" onclick="Nobles.askWhere('${askedId}','${l.id}')">${l.name}</button>`;
        });
        html += `</div><button class="btn" style="margin-top:1rem" onclick="Nobles.talk('${askedId}')">Geri</button>`;
        Game.showModal(html, '720px');
    },

    askWhere(askedId, targetId) {
        let asked = this.lord(askedId), target = this.lord(targetId);
        let party = this.partyOf(targetId);
        if(!party) return alert(`"${target.name} mi? O adam artık yok. Kimse cesedini de bulamadı."`);

        let r = this.rel(askedId);
        // Başka krallıktan birini soruyorsan bir kademe düşer
        if(asked.faction !== target.faction) r -= 20;
        // Yaydığın yalan geri döndü: o krallığın lordları da sana yalan söylüyor
        if(state.liars && state.time.day <= state.liars.until && asked.faction === state.liars.faction) r = -1;

        let msg, accuracy = null, lie = false;

        if(r < 0) {
            lie = true; accuracy = 400;
            msg = `"${target.name} mi? Tabii, biliyorum." Gözünü kırpmadan bir yer tarif etti.`;
        } else if(r < 20) {
            let dir = this.compass(party);
            msg = `"Kesin bir şey diyemem. Geçen ay ${dir} tarafına gitmişti."`;
        } else if(r < 50) {
            accuracy = 600;
            msg = `"Şöyle bir bakayım haritaya... Buralarda bir yerde olmalı."`;
        } else {
            accuracy = 200;
            msg = `"${target.name} mi? Adamlarım dün gördü. Tam olarak şurada. Üç gün boyunca da haber alırım, kaçamaz."`;
        }

        if(accuracy !== null) {
            let angle = Math.random() * Math.PI * 2;
            let ox, oy;
            if(lie) {
                // Yalan: gerçek konumdan 800-1500 birim uzağa işaret koy
                let d = 800 + Math.random() * 700;
                ox = party.x + Math.cos(angle) * d;
                oy = party.y + Math.sin(angle) * d;
            } else {
                let d = Math.random() * accuracy * 0.6;
                ox = party.x + Math.cos(angle) * d;
                oy = party.y + Math.sin(angle) * d;
            }
            state.knownLocations[targetId] = {
                x: ox, y: oy, radius: accuracy, day: state.time.day,
                name: target.name, live: (!lie && accuracy <= 200)
            };
        }

        alert(`${asked.name}: ${msg}${accuracy !== null ? '\n\n📍 Haritaya bir işaret düştü (3 gün geçerli).' : ''}`);
        this.talk(askedId);
    },

    compass(p) {
        let dx = p.x - 4500, dy = p.y - 4500;
        if(Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'doğu' : 'batı';
        return dy > 0 ? 'güney' : 'kuzey';
    },

    // Haritaya bilinen konum işaretlerini çiz (Game.renderMap içinden çağrılır)
    drawMarkers(ctx) {
        for(let id in state.knownLocations) {
            let m = state.knownLocations[id];
            if(m.live) {
                let party = this.partyOf(id);
                if(party) { m.x = party.x; m.y = party.y; }
            }
            ctx.save();
            ctx.strokeStyle = 'rgba(255,204,0,0.75)';
            ctx.lineWidth = 6;
            ctx.setLineDash([18, 14]);
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 30px Inter';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'black'; ctx.shadowBlur = 12;
            ctx.fillText(`📍 ${m.name}`, m.x, m.y - m.radius - 14);
            ctx.restore();
        }
    },

    // ---------- FLÖRT ----------
    courtMenu(ladyId) {
        let L = this.lady(ladyId);
        let a = this.aff(ladyId);
        let t = LADY_TRAITS[L.trait];
        let g = this.lord(L.guardianId);
        let rival = state.rivals[ladyId];

        if(state.player.spouse === ladyId) {
            return Game.showModal(`<div style="display:flex;gap:1.5rem;align-items:center">${this.portraitCss(L,140)}
                <div><h3 style="margin:0">${L.name}</h3><p style="font-style:italic">"Eve ne zaman döneceksin?"</p></div></div>
                <button class="btn" style="margin-top:1rem" onclick="Game.closeModal()">Kapat</button>`);
        }

        let html = `<div style="display:flex;gap:1.5rem;align-items:flex-start">
            ${this.portraitCss(L, 140)}
            <div style="flex:1">
                <h3 style="margin:0;color:#ff9ec4">${L.name}</h3>
                <div style="font-size:0.8rem;color:var(--text-muted)">
                    ${FACTIONS[L.faction].name} · ${t.name} · ${L.suitor ? 'Efendisi' : 'Vasisi'}: ${g ? g.name : '—'}
                </div>
                <p style="font-size:0.85rem;color:var(--text-muted);margin-top:0.4rem;font-style:italic">${L.lore}</p>
                <div style="margin-top:0.8rem">
                    <div style="font-size:0.8rem">İlgisi: <b style="color:#ff9ec4">${a}/100</b></div>
                    <div style="background:rgba(0,0,0,0.4);height:8px;border-radius:4px;margin-top:4px">
                        <div style="background:#ff9ec4;height:100%;width:${a}%;border-radius:4px"></div>
                    </div>`;
        if(rival) {
            html += `<div style="font-size:0.8rem;margin-top:0.6rem">Rakip <b>${this.any(rival.lordId).name}</b>: <b style="color:#e74c3c">${Math.floor(rival.affection)}/100</b></div>
                     <div style="background:rgba(0,0,0,0.4);height:6px;border-radius:3px;margin-top:3px">
                        <div style="background:#e74c3c;height:100%;width:${Math.floor(rival.affection)}%;border-radius:3px"></div>
                     </div>`;
        }
        html += `</div></div></div><div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1.2rem">`;

        let today = state.time.day;
        let visited = (state.visitDay || {})[ladyId] || -99;
        html += (today - visited >= 3)
            ? `<button class="btn" onclick="Nobles.visitLady('${ladyId}')">💬 Sohbet et (+3)</button>`
            : `<button class="btn" disabled style="opacity:0.4">💬 Sohbet et (${3-(today-visited)} gün sonra)</button>`;

        html += `<button class="btn" onclick="Nobles.complimentMenu('${ladyId}')">🌹 İltifat et</button>`;

        if(state.player.poems.length)
            html += `<button class="btn" onclick="Nobles.poemMenu('${ladyId}')">📜 Şiir oku</button>`;
        else
            html += `<button class="btn" disabled style="opacity:0.4">📜 Şiir oku (önce meyhanede ozandan öğren)</button>`;

        if(state.pendingDedication)
            html += `<button class="btn primary" onclick="Nobles.dedicate('${ladyId}')">🏆 Turnuva zaferini ona ithaf et (+18)</button>`;

        if(rival)
            html += `<button class="btn" style="border-color:#e74c3c;color:#e74c3c" onclick="Nobles.rivalMenu('${ladyId}')">⚔️ Rakibin: ${this.any(rival.lordId).name}</button>`;

        if(a >= 60)
            html += `<button class="btn primary" onclick="Nobles.askForHand('${ladyId}')">💍 ${L.suitor ? 'Kralından elini isteyeceğim' : 'Babandan seni isteyeceğim'}</button>`;
        else
            html += `<button class="btn" disabled style="opacity:0.4">💍 Evlilikten söz etmek için ilgisi 60 olmalı (${a})</button>`;

        html += `<button class="btn" onclick="Game.closeModal()">Ayrıl</button></div>`;
        Game.showModal(html, '700px');
    },

    visitLady(ladyId) {
        state.visitDay = state.visitDay || {};
        state.visitDay[ladyId] = state.time.day;
        let L = this.lady(ladyId);
        this.addAff(ladyId, 3);
        let lines = [
            `"Yollar nasıldı? Buradan bakınca hep aynı görünüyor."`,
            `"Babam yine aynı hikâyeyi anlattı. Üçüncü kez dinliyormuş gibi yaptım."`,
            `"Sen konuşurken kaleyi unutuyorum. Bunu kimseye söyleme."`,
            `"Bugün kimse bana bir şey sormadı. Sen sordun. Tuhaf ama iyi geldi."`
        ];
        alert(`${L.name}: ${lines[Math.floor(Math.random()*lines.length)]}\n\n+3 ilgi`);
        this.courtMenu(ladyId);
    },

    complimentMenu(ladyId) {
        let L = this.lady(ladyId);
        let html = `<h3>🌹 ${L.name}'a İltifat</h3>
            <p style="font-size:0.85rem;color:var(--text-muted);font-style:italic">İpucu: ${LADY_TRAITS[L.trait].hint}</p>
            <p style="font-size:0.8rem;color:var(--danger)">Yanlış konu açarsan geri teper.</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">`;
        COMPLIMENTS.forEach(c => {
            html += `<button class="btn" style="font-size:0.85rem" onclick="Nobles.compliment('${ladyId}','${c.id}')">${c.label}</button>`;
        });
        html += `</div><button class="btn" style="margin-top:1rem" onclick="Nobles.courtMenu('${ladyId}')">Geri</button>`;
        Game.showModal(html);
    },

    compliment(ladyId, cid) {
        let L = this.lady(ladyId), t = LADY_TRAITS[L.trait];
        let c = COMPLIMENTS.find(x => x.id === cid);
        let gain, reply;
        if(cid === t.likes) {
            gain = 5;  reply = `Gözlerini kaçırdı ama gülümsediğini gördün. "Devam et," dedi.`;
        } else if(cid === t.hates) {
            gain = -8; reply = `Yüzü buz kesti. "Sen beni hiç dinlememişsin," dedi ve arkasını döndü.`;
        } else {
            gain = 1;  reply = `Kibarca başını salladı. Söylediğin bir kulağından girip diğerinden çıktı.`;
        }
        this.addAff(ladyId, gain);
        alert(`Sen: ${c.line}\n\n${reply}\n\n${gain > 0 ? '+' : ''}${gain} ilgi`);
        this.courtMenu(ladyId);
    },

    poemMenu(ladyId) {
        let L = this.lady(ladyId);
        let used = (state.poemsRead || {})[ladyId] || [];
        let html = `<h3>📜 ${L.name}'a Şiir</h3>
            <p style="font-size:0.85rem;color:var(--text-muted)">Her şiiri aynı kişiye yalnızca bir kez okuyabilirsin.</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">`;
        state.player.poems.forEach(pid => {
            let p = POEMS.find(x => x.id === pid);
            html += used.includes(pid)
                ? `<button class="btn" disabled style="opacity:0.4">${p.name} (okundu)</button>`
                : `<button class="btn" onclick="Nobles.recitePoem('${ladyId}','${pid}')">${p.name}</button>`;
        });
        html += `</div><button class="btn" style="margin-top:1rem" onclick="Nobles.courtMenu('${ladyId}')">Geri</button>`;
        Game.showModal(html);
    },

    recitePoem(ladyId, pid) {
        state.poemsRead = state.poemsRead || {};
        state.poemsRead[ladyId] = state.poemsRead[ladyId] || [];
        if(state.poemsRead[ladyId].includes(pid)) return;
        state.poemsRead[ladyId].push(pid);
        let p = POEMS.find(x => x.id === pid);
        this.addAff(ladyId, 12);
        alert(`${p.text}\n\n${this.lady(ladyId).name} uzun bir süre sustu.\n\n+12 ilgi`);
        this.courtMenu(ladyId);
    },

    dedicate(ladyId) {
        if(!state.pendingDedication) return;
        state.pendingDedication = false;
        state.dedicatedTo = state.dedicatedTo || [];
        if(state.dedicatedTo.includes(ladyId)) {
            alert('Ona zaten bir zafer ithaf etmiştin. İkincisi aynı etkiyi yapmaz.');
            this.addAff(ladyId, 4);
        } else {
            state.dedicatedTo.push(ladyId);
            this.addAff(ladyId, 18);
            alert(`Arenanın ortasında durdun ve zaferini ${this.lady(ladyId).name}'ya ithaf ettin.\nBütün salon ona döndü. Yüzü kızardı ama gözünü kaçırmadı.\n\n+18 ilgi`);
        }
        this.courtMenu(ladyId);
    },

    // ---------- Rakip talip ----------
    // Rakip leydiyse kılıcı kendisi çekmez: şerefini vasisi savunur.
    duelTarget(rival) {
        return (rival.guardianId !== undefined && !rival.suitor) ? this.lord(rival.guardianId) : rival;
    },

    rivalMenu(ladyId) {
        let r = state.rivals[ladyId];
        let rl = this.any(r.lordId);
        let opp = this.duelTarget(rl);
        let html = `<h3>⚔️ Rakip: ${rl.name}</h3>
            <p>Aynı kapıyı o da çalıyor. İlgisi her gün artıyor (şu an <b>${Math.floor(r.affection)}</b>).
            100'e ilk ulaşan ${this.lady(ladyId).name} ile nişanlanır.</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">
            <button class="btn" onclick="Nobles.duelRival('${ladyId}')">🗡️ Şeref düellosuna çağır${opp.id !== rl.id ? ` (vasisi ${opp.name} çıkacak)` : ''}</button>
            <button class="btn" style="border-color:#aa8800;color:#aa8800" onclick="Nobles.smearRival('${ladyId}')">🐍 İtibarını lekele</button>
            <button class="btn" onclick="Nobles.courtMenu('${ladyId}')">Geri</button></div>`;
        Game.showModal(html);
    },

    duelRival(ladyId) {
        let r = state.rivals[ladyId];
        let opp = this.duelTarget(this.any(r.lordId));
        Game.closeModal();
        state.duel = { ladyId, lordId: opp.id };
        Battle.startDuel(opp);
    },

    resolveDuel(won) {
        let d = state.duel;
        state.duel = null;
        if(!d) return;
        let rl = this.lord(d.lordId);
        if(won) {
            delete state.rivals[d.ladyId];
            this.addAff(d.ladyId, 15);
            state.player.renown += 10;
            this.addRel(d.lordId, -25);
            alert(`${rl.name} dizlerinin üstüne çöktü ve kılıcını bıraktı.\n"Bu iş burada bitti," dedi ve salonu terk etti.\n\n+15 ilgi, +10 nam, ${rl.name} ile −25 ilişki.`);
        } else {
            this.addAff(d.ladyId, -20);
            state.player.stats.hp = Math.max(5, Math.floor(state.player.stats.maxHp * 0.2));
            Game.advanceTime(24 * 5);
            alert(`${rl.name} seni yere serdi. Beş gün yatakta kaldın.\n\n−20 ilgi, 5 gün kayıp.`);
        }
        Game.updateTopBar();
    },

    smearRival(ladyId) {
        let r = state.rivals[ladyId];
        let rl = this.any(r.lordId);
        Game.closeModal();
        if(Math.random() < 0.30) {
            LORDS.filter(l => l.faction === rl.faction).forEach(l => this.addRel(l.id, -25));
            this.addAff(ladyId, -10);
            alert(`Yaydığın dedikodu geri tepti. Kimin uydurduğu anlaşıldı.\n${FACTIONS[rl.faction].name}'nın bütün lordlarıyla −25 ilişki, −10 ilgi.`);
        } else {
            r.affection = Math.max(0, r.affection - 20);
            alert(`Meyhanelerde ${rl.name} hakkında anlatılanlar salona kadar ulaştı.\nRakibinin ilgisi −20 düştü.`);
        }
        this.courtMenu(ladyId);
    },

    // ---------- Babadan isteme ve drahoma ----------
    dowryFor(ladyId) {
        let L = this.lady(ladyId);
        let g = this.lord(L.guardianId);
        let p = state.player;
        let fiefs = LOCATIONS.filter(l => l.faction === L.faction && l.type !== 'village').length;

        let base = 8000;
        let fiefAdd = fiefs * 400;
        // Nam indirimi logaritmik: doğrusalken 300 nam tek başına −6000 ediyor,
        // drahoma hep 1500 tabanına çakılıyordu.
        let renownCut = Math.round(2200 * Math.log10(1 + p.renown / 60));
        let relCut = Math.max(0, this.rel(g.id)) * 25;
        let statusMult = p.vassalOf === 'player_kingdom' ? 0.6 : (p.vassalOf ? 0.8 : 1.0);
        let persMult = PERSONALITIES[g.personality].dowry;

        let raw = (base + fiefAdd - renownCut - relCut) * statusMult * persMult;
        let total = Math.max(2500, Math.round(raw / 50) * 50);
        return { base, fiefAdd, renownCut, relCut, statusMult, persMult, total, fiefs, guardian: g };
    },

    MIN_RENOWN: 120,
    MIN_REL: 25,

    askForHand(ladyId) {
        let L = this.lady(ladyId);
        let g = this.lord(L.guardianId);
        let a = this.aff(ladyId);
        let p = state.player;

        if(p.spouse) return alert('Zaten evlisin. Kalradya buna hoş bakmaz.');

        if(a < 60) return alert(`${L.name} seni henüz o gözle görmüyor. (İlgi ${a}/60)\nÖnce onunla vakit geçir.`);

        let ward = L.suitor ? 'vassalımı' : 'kızımı';
        let html = `<h3>💍 ${g.name} ile Görüşme</h3>
            <p style="font-style:italic">"${L.name}, öyle mi?" Seni tepeden tırnağa süzdü. "Üç şeye bakarım: adına, sözüne ve kesene."</p>
            <div style="background:rgba(0,0,0,0.3);padding:1rem;border-radius:8px;margin-top:1rem">`;

        let okRenown = p.renown >= this.MIN_RENOWN;
        let okRel = this.rel(g.id) >= this.MIN_REL;
        html += `<div style="margin-bottom:0.5rem">${okRenown?'✅':'❌'} <b>Nam:</b> ${p.renown} / ${this.MIN_RENOWN}
                 ${okRenown?'':`<div style="font-size:0.85rem;color:var(--danger);font-style:italic">"Adını duyan yok. ${ward} bir hiçe vermem."</div>`}</div>`;
        html += `<div style="margin-bottom:0.5rem">${okRel?'✅':'❌'} <b>İlişki:</b> ${this.rel(g.id)} / ${this.MIN_REL}
                 ${okRel?'':'<div style="font-size:0.85rem;color:var(--danger);font-style:italic">"Seni tanımıyorum bile. Önce bir işime yara."</div>'}</div>`;
        html += `</div>`;

        if(!okRenown || !okRel) {
            html += `<button class="btn" style="margin-top:1rem" onclick="Nobles.courtMenu('${ladyId}')">Geri Çekil</button>`;
            return Game.showModal(html, '660px');
        }

        let d = this.dowryFor(ladyId);
        state.dowryOffer = { ladyId, amount: d.total, hagglesToday: 0 };
        html += this.dowryBreakdown(ladyId);
        Game.showModal(html, '680px');
    },

    dowryBreakdown(ladyId) {
        let d = this.dowryFor(ladyId);
        let o = state.dowryOffer;
        let p = state.player;
        let dLabel = this.lady(ladyId).suitor ? 'Başlık' : 'Drahoma';
        let html = `<h4 style="margin-top:1.2rem;color:var(--primary)">${dLabel} Hesabı</h4>
            <div style="background:rgba(0,0,0,0.3);padding:1rem;border-radius:8px;font-size:0.9rem;line-height:1.7">
            <div>Temel bedel: <b>${d.base}</b> dinar</div>
            <div>${FACTIONS[this.lady(ladyId).faction].name}'nın ${d.fiefs} kalesi/şehri var: <span style="color:var(--danger)">+${d.fiefAdd}</span></div>
            <div>Namın (${p.renown}) sayesinde: <span style="color:var(--success)">−${d.renownCut}</span></div>
            <div>${d.guardian.name} ile aran (${this.rel(d.guardian.id)}) sayesinde: <span style="color:var(--success)">−${d.relCut}</span></div>
            <div>Mevkiin: <b>×${d.statusMult}</b> ${p.vassalOf === 'player_kingdom' ? '(kendi krallığın)' : p.vassalOf ? '(derebeyi)' : '(bağımsız maceracı)'}</div>
            <div>${PERSONALITIES[d.guardian.personality].name} mizacı: <b>×${d.persMult}</b></div>
            <hr style="border-color:var(--panel-border);margin:0.6rem 0">
            <div style="font-size:1.2rem">İstenen: <b style="color:#ffcc00">${o.amount} dinar</b> (kesende ${Math.floor(p.money)})</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">`;

        html += p.money >= o.amount
            ? `<button class="btn primary" onclick="Nobles.payDowry('${ladyId}')">💰 Kabul et ve öde (${o.amount})</button>`
            : `<button class="btn" disabled style="opacity:0.4">💰 Kesen yetmiyor (${o.amount})</button>`;

        html += `<button class="btn" onclick="Nobles.haggle('${ladyId}')">🤝 Pazarlık et (İkna yeteneği)</button>`;

        if(p.renown >= 200)
            html += `<button class="btn" onclick="Nobles.dowryQuest('${ladyId}')">⚔️ "Param yok ama kılıcım var"</button>`;
        else
            html += `<button class="btn" disabled style="opacity:0.4">⚔️ "Param yok ama kılıcım var" (200 nam gerekir)</button>`;

        html += `<button class="btn" style="border-color:var(--danger);color:var(--danger)" onclick="Nobles.elopePrompt('${ladyId}')">🏇 Kaçırmayı teklif et</button>`;
        html += `<button class="btn" onclick="Nobles.courtMenu('${ladyId}')">Düşüneyim</button></div>`;
        return html;
    },

    haggle(ladyId) {
        let o = state.dowryOffer;
        if(!o) return;
        if(o.haggledDay === state.time.day) return alert('Bugün yeterince pazarlık ettin. Adamın sabrını taşırma.');
        o.haggledDay = state.time.day;

        let g = this.dowryFor(ladyId).guardian;
        let lvl = (state.player.proficiencies.persuasion || { level: 1 }).level;
        let chance = 0.40 + lvl * 0.05;

        if(Math.random() < chance) {
            o.amount = Math.max(1000, Math.round(o.amount * 0.8 / 50) * 50);
            Game.addProficiencyXp('persuasion', 60);
            alert(`"...Peki. Ama bir kuruş daha aşağı inmem."\n\nBedel %20 düştü → ${o.amount} dinar.`);
        } else {
            this.addRel(g.id, -5);
            Game.addProficiencyXp('persuasion', 20);
            alert(`"Burası pazar yeri mi sanıyorsun?"\n\nPazarlık tutmadı, −5 ilişki. Yarın tekrar dene.`);
        }
        Game.showModal(`<h3>💍 ${g.name} ile Pazarlık</h3>` + this.dowryBreakdown(ladyId), '680px');
    },

    payDowry(ladyId) {
        let o = state.dowryOffer;
        if(!o || state.player.money < o.amount) return;
        state.player.money -= o.amount;
        this.betroth(ladyId, `Drahoma sayıldı, eller sıkıldı.`);
    },

    dowryQuest(ladyId) {
        let g = this.dowryFor(ladyId).guardian;
        Game.closeModal();
        let q = Quests.offerFrom(g.id, { forced: true, dowryFor: ladyId });
        if(!q) {
            alert(`${g.name}: "Şu an sana verecek bir işim yok. Bir süre sonra gel."`);
            return this.courtMenu(ladyId);
        }
        alert(`${g.name}: "Kesen boşsa kılıcın çalışsın. Şunu hallet, drahomanın yarısını unutayım."`);
    },

    elopePrompt(ladyId) {
        let L = this.lady(ladyId);
        Game.showModal(`<h3>🏇 Kaçırma</h3>
            <p>Gece yarısı, arka kapı, iki at. Drahoma yok, tören yok.</p>
            <p style="color:var(--danger)">Bedeli:<br>
            • ${this.lord(L.guardianId).name} ile <b>−60</b> ilişki<br>
            • ${FACTIONS[L.faction].name}'nın bütün lordlarıyla <b>−20</b><br>
            • <b>−30</b> nam<br>
            • ${L.name}'nın ilgisi <b>−10</b> (böyle hayal etmemişti)</p>
            <div style="display:flex;gap:1rem;margin-top:1rem">
            <button class="btn" style="border-color:var(--danger);color:var(--danger)" onclick="Nobles.elope('${ladyId}')">Atları hazırla</button>
            <button class="btn" onclick="Nobles.courtMenu('${ladyId}')">Vazgeç</button></div>`);
    },

    elope(ladyId) {
        let L = this.lady(ladyId);
        this.addRel(L.guardianId, -60);
        LORDS.filter(l => l.faction === L.faction && l.id !== L.guardianId).forEach(l => this.addRel(l.id, -20));
        state.player.renown = Math.max(0, state.player.renown - 30);
        this.addAff(ladyId, -10);
        this.marry(ladyId, 'Şafak sökerken sınırı geçtiniz. Arkanızda bağıran bir kale kaldı.');
    },

    betroth(ladyId, msg) {
        state.betrothed = ladyId;
        state.dowryOffer = null;
        let L = this.lady(ladyId);
        Game.closeModal();
        Game.updateTopBar();
        // Şölen varsa hemen, yoksa vasi bir tane düzenlesin
        if(state.feast && state.feast.faction === L.faction) {
            this.marry(ladyId, msg + '\nŞölen zaten sürüyordu; nikâh o akşam kıyıldı.');
        } else {
            let loc = LOCATIONS.find(l => l.id === this.lord(L.guardianId).homeLocId);
            state.pendingWedding = { ladyId, locId: loc ? loc.id : L.homeLocId, day: state.time.day + 5 + Math.floor(Math.random()*6) };
            Feast.schedule(L.faction, state.pendingWedding.locId, state.pendingWedding.day);
            alert(`${msg}\n\nNişanlandınız! Düğün ${state.pendingWedding.day - state.time.day} gün sonra ${loc ? loc.name : '?'} şehrindeki şölende yapılacak. O gün orada ol.`);
        }
    },

    marry(ladyId, msg) {
        let L = this.lady(ladyId);
        state.player.spouse = ladyId;
        state.betrothed = null;
        state.pendingWedding = null;
        delete state.rivals[ladyId];
        state.player.rightToRule += 15;
        LORDS.filter(l => l.faction === L.faction).forEach(l => this.addRel(l.id, 20));
        state.player.party.push({
            id: 'spouse_' + ladyId, name: L.name + ' (Eş)', level: 10, xp: 0, xpNext: 999,
            type: 'noble', isSpouse: true
        });
        Game.closeModal();
        Game.updateTopBar();
        alert(`${msg}\n\n💍 ${L.name} ile evlendin!\n+15 idare hakkı, ${FACTIONS[L.faction].name} lordlarıyla +20 ilişki, günlük +50 dinar drahoma geliri.`);
    },

    // ---------- Günlük ----------
    dailyTick() {
        // Bilinen konum işaretleri 3 gün sonra silinir
        for(let id in state.knownLocations) {
            if(state.time.day - state.knownLocations[id].day >= 3) delete state.knownLocations[id];
        }

        // Rakip talipler ilerler — ama yarış asıl sen kur yapmaya başlayınca kızışır.
        // Yoksa oyuncu daha 120 nama ulaşamadan bütün leydiler nişanlanıyor.
        for(let ladyId in state.rivals) {
            let r = state.rivals[ladyId];
            r.affection += this.aff(ladyId) > 0 ? 1.2 : 0.15;
            if(r.affection >= 100 && state.player.spouse !== ladyId && state.betrothed !== ladyId) {
                let L = this.lady(ladyId);
                alert(`Geç kaldın. ${L.name}, ${this.any(r.lordId).name} ile nişanlandı.`);
                state.affection[ladyId] = 0;
                delete state.rivals[ladyId];
                state.lostLadies = state.lostLadies || [];
                state.lostLadies.push(ladyId);
            }
        }

        // Evlilik geliri
        if(state.player.spouse) state.player.money += 50;

        // Düğün günü geldi mi?
        if(state.pendingWedding && state.time.day >= state.pendingWedding.day) {
            let w = state.pendingWedding;
            let atVenue = Game.dist(state.player, LOCATIONS.find(l => l.id === w.locId) || state.player) < 200;
            if(atVenue) this.marry(w.ladyId, 'Şölen salonu doldu, kadehler kalktı.');
            else if(state.time.day > w.day + 2) {
                this.addRel(this.lady(w.ladyId).guardianId, -25);
                this.addAff(w.ladyId, -25);
                state.pendingWedding = null;
                state.betrothed = null;
                alert('Kendi düğününe gitmedin. Salon iki gün bekledi, sonra dağıldı. Rezil oldun.');
            }
        }
    },

    // Oyun başında rakip talipleri kur
    initRivals() {
        state.rivals = {};
        this.courtables().forEach(L => {
            if(Math.random() < 0.60) {
                // Erkek oyuncunun rakibi bir lord, kadın oyuncununki aynı lorda talip bir leydi
                let pool = (this.isFemale() ? LADIES : LORDS)
                    .filter(l => l.faction === L.faction && l.id !== L.guardianId && l.id !== L.id && l.rank !== 'king');
                if(pool.length) {
                    state.rivals[L.id] = {
                        lordId: pool[Math.floor(Math.random()*pool.length)].id,
                        affection: 10 + Math.random() * 25
                    };
                }
            }
        });
    }
};

// --- ŞÖLEN ---
const Feast = {
    schedule(faction, locId, day) {
        state.scheduledFeasts = state.scheduledFeasts || [];
        state.scheduledFeasts.push({ faction, locId, day });
    },

    RENOWN_REQ: 150,

    dailyTick() {
        // Süresi dolan şöleni kapat
        if(state.feast && state.time.day >= state.feast.endDay) state.feast = null;

        // Planlanmış şölenler
        state.scheduledFeasts = (state.scheduledFeasts || []).filter(f => {
            if(state.time.day >= f.day) {
                state.feast = { faction: f.faction, locId: f.locId, endDay: state.time.day + 4, greeted: [] };
                return false;
            }
            return true;
        });

        // Kendiliğinden şölen (10-20 günde bir)
        if(!state.feast && state.time.day >= (state.nextFeastDay || 8)) {
            let cities = LOCATIONS.filter(l => l.type === 'city' && FACTIONS[l.faction]);
            let c = cities[Math.floor(Math.random()*cities.length)];
            if(c) {
                state.feast = { faction: c.faction, locId: c.id, endDay: state.time.day + 4, greeted: [] };
                state.nextFeastDay = state.time.day + 10 + Math.floor(Math.random()*11);
            }
        }
    },

    open(loc) {
        if(state.player.renown < this.RENOWN_REQ) {
            return alert(`Kapıdaki teşrifatçı listeye baktı ve başını salladı.\n"Bu isim burada yazmıyor."\n\nGereken nam: ${this.RENOWN_REQ} (sende ${state.player.renown})`);
        }
        let f = state.feast;
        let guests = LORDS.filter(l => l.faction === f.faction);
        let ladies = Nobles.courtables().filter(l => l.faction === f.faction);

        let html = `<h3>🍷 Şölen — ${loc.name}</h3>
            <p style="color:var(--text-muted);font-size:0.9rem">${FACTIONS[f.faction].name}'nın bütün soyluları burada.
            Herkesle bir kez selamlaşabilirsin (+2 ilişki).</p>`;

        if(state.pendingWedding && state.pendingWedding.locId === loc.id && state.time.day >= state.pendingWedding.day) {
            html += `<button class="btn primary" style="margin:1rem 0;font-size:1.1rem" onclick="Nobles.marry('${state.pendingWedding.ladyId}','Salon doldu, kadehler kalktı.')">💍 Nikâhı Kıy!</button>`;
        }

        html += `<h4 style="color:var(--primary);margin-top:1rem">Lordlar</h4><div style="display:flex;flex-wrap:wrap;gap:1rem">`;
        guests.forEach(l => html += Nobles.nobleCard(l));
        html += `</div>`;
        // Kadın oyuncuda kur hedefi lordların kendisi; ayrı leydi listesi basılmaz.
        if(!Nobles.isFemale()) {
            html += `<h4 style="color:var(--primary);margin-top:1rem">Leydiler</h4><div style="display:flex;flex-wrap:wrap;gap:1rem">`;
            ladies.forEach(l => html += Nobles.nobleCard(l));
            html += `</div>`;
        }
        html += `<button class="btn" style="margin-top:1.2rem" onclick="Feast.greetAll()">🥂 Salonu dolaş ve herkesi selamla</button>
                 <button class="btn" onclick="Game.closeModal()">Ayrıl</button>`;
        Game.showModal(html, '820px');
    },

    greetAll() {
        let f = state.feast;
        if(!f) return;
        let n = 0;
        LORDS.filter(l => l.faction === f.faction).forEach(l => {
            if(!f.greeted.includes(l.id)) { f.greeted.push(l.id); Nobles.addRel(l.id, 2); n++; }
        });
        Game.advanceTime(4);
        alert(n ? `Salonu dolaştın, ${n} soyluyla kadeh tokuşturdun. Her biriyle +2 ilişki.` : 'Bu şölende herkesi zaten selamladın.');
        Game.closeModal();
    },

    // Kendi şölenini düzenle (kendi şehrin varsa)
    host(loc) {
        const COST = 3000, FOOD = 30;
        let food = state.player.inventory.filter(i => ['meat','cheese'].includes(i.id)).reduce((a,b) => a + b.qty, 0);
        if(state.player.money < COST) return alert(`Şölen için ${COST} dinar gerek.`);
        if(food < FOOD) return alert(`Şölen için ${FOOD} birim yüksek kalite yemek (et/peynir) gerek. Sende ${food} var.`);

        state.player.money -= COST;
        let need = FOOD;
        for(let i = state.player.inventory.length - 1; i >= 0 && need > 0; i--) {
            let it = state.player.inventory[i];
            if(['meat','cheese'].includes(it.id)) {
                let take = Math.min(it.qty, need);
                it.qty -= take; need -= take;
                if(it.qty <= 0) state.player.inventory.splice(i, 1);
            }
        }
        state.feast = { faction: loc.faction, locId: loc.id, endDay: state.time.day + 4, greeted: [], hostedByPlayer: true };
        LORDS.filter(l => l.faction === loc.faction).forEach(l => Nobles.addRel(l.id, 5));
        state.player.renown += 15;
        Game.updateTopBar();
        Game.closeModal();
        alert(`Şölenin başladı! ${FACTIONS[loc.faction].name}'nın bütün soyluları geldi.\nHer biriyle +5 ilişki, +15 nam.`);
    }
};
