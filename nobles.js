// ============================================
// WEBBAND - NOBLES: RELATIONS, DIALOGUE, COURTSHIP, MARRIAGE
// ============================================

// --- PERSONALITIES ---
// Determines who likes which gift, which quest they give, and how
// greedy they are about the dowry.
const PERSONALITIES = {
    martial:     { name: 'Savaşçı',    likes: ['sword','axe','lance','horse'], dowry: 1.0, greet: 'Kılıcın keskin mi delikanlı? Laf değil, çelik konuşur burada.' },
    cunning:     { name: 'Kurnaz',     likes: ['iron','salt','velvet'],        dowry: 1.3, greet: 'Her sohbetin bir bedeli vardır. Seninkini henüz hesaplayamadım.' },
    debauched:   { name: 'Sefahatçi',  likes: ['velvet','ale','cheese','meat'],dowry: 1.2, greet: 'Kadeh boş, sohbet kuru. Bu ikisinden birini düzelt bari.' },
    goodnatured: { name: 'İyi Kalpli', likes: ['bread','wheat','cheese'],      dowry: 0.8, greet: 'Hoş geldin evlat. Yolun uzunsa otur, ekmeğimiz var.' },
    quarrelsome: { name: 'Huysuz',     likes: [],                              dowry: 1.15, greet: 'Ne var? Konuşacaksan konuş, dikilip durma karşımda.' }
};

// --- LADY TRAITS ---
// Determines whether a compliment lands.
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

// --- LORDS ---
// portraitIndex: position in lord_portraits.jpg's 3x3 grid (0-8)
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

// --- SUITORS (female player) ---
// A female character's marriage path runs through unmarried lords, not ladies.
// To avoid splitting the courtship machine in two, a lord is wrapped "shaped
// like a lady": their guardian is their own king, their trait derives from
// their personality. SUITORS fills in on first request.
const SUITOR_TRAIT = { martial:'ambitious', cunning:'pious', debauched:'wild',
                       goodnatured:'romantic', quarrelsome:'wild' };
const SUITORS = [];

// --- COMPANIONS ---
// Named NPC heroes found at the tavern. Unlike a regular soldier, they don't
// die in battle (they're wounded), they level up, and they contribute their
// proficiency to the party (Game.profLvl applies the "highest in party" rule).
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

// --- NOBLE SYSTEM ---
const Nobles = {

    // ---------- Helpers ----------
    lord(id)  { return LORDS.find(l => l.id === id); },
    lady(id)  {
        if(id && id.indexOf('suitor_') === 0) return this.suitors().find(l => l.id === id);
        return LADIES.find(l => l.id === id);
    },

    isFemale() { return state.player.gender === 'female'; },

    // Who can be courted: ladies for a male player, unmarried lords for a female player.
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
        if(v >= 60) return T('<span style="color:#2ecc71">Sadık Dost</span>');
        if(v >= 25) return T('<span style="color:#8ecf5a">Dost</span>');
        if(v >= 5)  return T('<span style="color:#ccc">Hoşnut</span>');
        if(v > -5)  return T('<span style="color:#999">Kayıtsız</span>');
        if(v > -25) return T('<span style="color:#e59b3d">Kırgın</span>');
        if(v > -60) return T('<span style="color:#e74c3c">Düşman</span>');
        return T('<span style="color:#ff3333">Kan Davalı</span>');
    },

    // Portrait tile from the 3x3 sprite sheet
    portraitCss(n, size = 120) {
        let col = (n.portraitIndex ?? 0) % 3, row = Math.floor((n.portraitIndex ?? 0) / 3);
        if(n.isGuild) {
            // The guild master has no portrait — a scale seal instead
            return `<div style="width:${size}px;height:${size}px;border-radius:8px;flex:0 0 auto;
                background:linear-gradient(160deg,#4a3a1c,#221a0c);border:4px ridge #dca243;
                display:flex;align-items:center;justify-content:center;font-size:${size*0.5}px;">⚖️</div>`;
        }
        if(n.guardianId !== undefined && !n.suitor) return this.ladyPortrait(n, size);
        return `<div style="width:${size}px;height:${size}px;flex:0 0 auto;border:4px ridge #dca243;
            background-image:url('lord_portraits.jpg');background-size:300% 300%;
            background-position:${col*50}% ${row*50}%;filter:sepia(0.2) contrast(1.1);
            box-shadow:inset 0 0 15px #000;"></div>`;
    },

    // There's no lady in the sprite sheet (#39): the portrait is drawn in code. Everything
    // derives from a hash of the id, so the same lady gets the same face every time.
    LADY_LOOK: {
        // faction: [dress, dress shadow, skin, hair options]
        swadia:  ['#8d2230', '#5d1220', '#f0cdb0', ['#5a3418', '#241611', '#b06a2c']],
        rhodok:  ['#2f6b3a', '#1c4325', '#e8c4a4', ['#3a2412', '#161616', '#7b4a22']],
        vaegir:  ['#2b4f86', '#1a3054', '#f5dcc6', ['#c8a86a', '#e0cf9c', '#6b4a24']],
        nord:    ['#4a6b7c', '#2c4350', '#f7e0cb', ['#e6d08a', '#c9954a', '#8a6a3a']],
        khergit: ['#8a6320', '#573c12', '#e3b489', ['#1b1410', '#3a2416', '#5a3a1c']]
    },

    ladyPortrait(n, size = 120) {
        let h = 0;
        for(let i = 0; i < n.id.length; i++) h = (h * 31 + n.id.charCodeAt(i)) >>> 0;
        let look = this.LADY_LOOK[n.faction] || this.LADY_LOOK.swadia;
        let [dress, dressDark, skin, hairs] = look;
        let hair = hairs[h % hairs.length];
        let eye = ['#3c6e4a', '#4a6f9c', '#5a4230', '#6b6b74'][(h >> 3) % 4];
        let faceW = 20 + (h >> 5) % 3;              // face width varies a little
        let lip = ['#a8434c', '#93394a', '#b95a55'][(h >> 7) % 3];
        let uid = 'ld' + n.id;

        // Accessory by trait. `back` is drawn UNDER the face, `front` over it — split in
        // two so a headscarf doesn't cover the face.
        let back = '', front = '';
        if(n.trait === 'ambitious') {
            front = `<path d="M31 33 L37 24 L44 31 L50 21 L56 31 L63 24 L69 33 Z" fill="#e0b955" stroke="#8a6a1e" stroke-width="0.8"/>
                     <circle cx="50" cy="28" r="2.4" fill="#a5322b"/>`;
        } else if(n.trait === 'pious') {
            back = `<path d="M22 52 Q20 16 50 14 Q80 16 78 52 Q78 82 68 96 L32 96 Q22 82 22 52 Z" fill="#ded6c4"/>`;
            front = `<path d="M27 44 Q30 22 50 21 Q70 22 73 44" fill="none" stroke="#bdb49e" stroke-width="2.4"/>`;
        } else if(n.trait === 'romantic') {
            back = `<path d="M72 50 Q82 68 74 92" fill="none" stroke="${hair}" stroke-width="7" stroke-linecap="round"/>`;
            front = `<g transform="translate(70,40)"><circle cx="-3" cy="-3" r="3" fill="#e3a3b6"/><circle cx="3" cy="-3" r="3" fill="#e3a3b6"/>
                       <circle cx="-3" cy="3" r="3" fill="#e3a3b6"/><circle cx="3" cy="3" r="3" fill="#e3a3b6"/>
                       <circle r="2" fill="#efd07e"/></g>`;
        } else {
            back = `<path d="M29 44 Q23 68 31 92" fill="none" stroke="${hair}" stroke-width="8" stroke-linecap="round"/>
                    <path d="M71 44 Q78 66 70 90" fill="none" stroke="${hair}" stroke-width="8" stroke-linecap="round"/>`;
            front = `<path d="M34 30 Q44 24 52 27" fill="none" stroke="${hair}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
        }

        let svg = `<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="display:block">
            <defs>
                <radialGradient id="${uid}bg" cx="34%" cy="26%">
                    <stop offset="0%" stop-color="#6a5540"/><stop offset="100%" stop-color="#1b1410"/>
                </radialGradient>
                <radialGradient id="${uid}sk" cx="38%" cy="30%">
                    <stop offset="0%" stop-color="#fff" stop-opacity="0.35"/><stop offset="100%" stop-color="#000" stop-opacity="0.22"/>
                </radialGradient>
                <radialGradient id="${uid}vg" cx="50%" cy="45%">
                    <stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
                </radialGradient>
                <!-- Lord portraits are oil paintings; the SVG's clean edges looked like a toy
                     next to them. A slight ripple + canvas grain brings the two closer to one frame. -->
                <filter id="${uid}pt" x="-10%" y="-10%" width="120%" height="120%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${h % 100}" result="w"/>
                    <feDisplacementMap in="SourceGraphic" in2="w" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
                </filter>
                <filter id="${uid}gr" x="0" y="0" width="100%" height="100%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${(h >> 4) % 100}"/>
                    <feColorMatrix type="saturate" values="0"/>
                </filter>
            </defs>
            <rect width="100" height="100" fill="url(#${uid}bg)"/>
            <g filter="url(#${uid}pt)">
            ${back}
            <path d="M50 64 Q28 68 20 100 L80 100 Q72 68 50 64 Z" fill="${dress}"/>
            <path d="M50 64 Q41 80 50 100 L58 100 Q53 80 50 64 Z" fill="${dressDark}"/>
            <path d="M44 54 h12 v13 q-6 4 -12 0 Z" fill="${skin}"/>
            <path d="M44 54 h12 v6 q-6 4 -12 0 Z" fill="#000" opacity="0.18"/>
            <path d="M26 46 Q26 17 50 17 Q74 17 74 46 Q74 61 70 72 L30 72 Q26 61 26 46 Z" fill="${hair}"/>
            <ellipse cx="50" cy="46" rx="${faceW}" ry="25" fill="${skin}"/>
            <ellipse cx="50" cy="46" rx="${faceW}" ry="25" fill="url(#${uid}sk)"/>
            <path d="M29 40 Q35 23 50 23 Q65 23 71 40 Q63 31 50 32 Q37 31 29 40 Z" fill="${hair}"/>
            <path d="M35 26 Q46 21 58 24" fill="none" stroke="#fff" stroke-width="1.6" opacity="0.13"/>
            <path d="M38.5 42.5 Q42 40.6 45.5 42.5" fill="none" stroke="${hair}" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M54.5 42.5 Q58 40.6 61.5 42.5" fill="none" stroke="${hair}" stroke-width="1.2" stroke-linecap="round"/>
            <ellipse cx="42" cy="47" rx="2.6" ry="1.6" fill="#e6dbcb"/><circle cx="42" cy="47" r="1.4" fill="${eye}"/>
            <circle cx="42" cy="46.8" r="0.6" fill="#170f07"/>
            <ellipse cx="58" cy="47" rx="2.6" ry="1.6" fill="#e6dbcb"/><circle cx="58" cy="47" r="1.4" fill="${eye}"/>
            <circle cx="58" cy="46.8" r="0.6" fill="#170f07"/>
            <path d="M39 45.6 Q42 44 45 45.6" fill="none" stroke="#2a1c12" stroke-width="0.9" stroke-linecap="round"/>
            <path d="M55 45.6 Q58 44 61 45.6" fill="none" stroke="#2a1c12" stroke-width="0.9" stroke-linecap="round"/>
            <path d="M48.6 50 Q50 54 52 54.6" fill="none" stroke="#b98a6c" stroke-width="0.9" stroke-linecap="round"/>
            <path d="M46 59.4 Q50 57.6 54 59.4 Q50 62.4 46 59.4 Z" fill="${lip}"/>
            <path d="M46 59.4 Q50 60.4 54 59.4" fill="none" stroke="#6d2a30" stroke-width="0.6"/>
            <ellipse cx="37.5" cy="53" rx="3.2" ry="2.1" fill="#c9705e" opacity="0.25"/>
            <ellipse cx="62.5" cy="53" rx="3.2" ry="2.1" fill="#c9705e" opacity="0.25"/>
            ${front}
            </g>
            <rect width="100" height="100" filter="url(#${uid}gr)" opacity="0.16" style="mix-blend-mode:overlay"/>
            <rect width="100" height="100" fill="url(#${uid}vg)"/>
        </svg>`;
        return `<div style="width:${size}px;height:${size}px;border-radius:50%;flex:0 0 auto;overflow:hidden;
            border:4px ridge #dca243;box-shadow:inset 0 0 15px #000;filter:sepia(0.35) contrast(1.05) saturate(0.9);">${svg}</div>`;
    },

    // ---------- Who's where ----------
    // A lord counts as "home" if their party is near their own location, or if a feast is there.
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

    // Ladies don't travel; they're home (or at the feast city, if there's a feast).
    // Suitor lords do roam: found only in their own hall (or at a feast).
    ladiesAt(locId) {
        return this.courtables().filter(l => {
            if(l.suitor) return this.isAt(l.lordId, locId);
            if(state.feast && state.feast.locId === locId && l.faction === state.feast.faction) return true;
            return l.homeLocId === locId;
        });
    },

    // ---------- Lords' Hall ----------
    HALL_RENOWN: 80,

    openHall(loc) {
        let f = FACTIONS[loc.faction] || { name: '?' };
        let lords = this.lordsAt(loc.id);
        let ladies = this.ladiesAt(loc.id);
        let renown = Game.peakRenown();   // gates look at peak renown reached (#55)

        let html = `<h3>${T`👑 Lordlar Salonu — ${T(loc.name)}`}</h3>
            <p style="color:var(--text-muted);font-size:var(--fs-md)">${T(f.name)}${state.feast && state.feast.locId===loc.id ? T(' — <b style="color:#ffcc00">🍷 Şölen sürüyor!</b>') : ''}</p>`;

        html += `<h4 style="margin-top:1.2rem;color:var(--primary)">${T`Salondaki Soylular`}</h4>`;
        if(lords.length === 0) {
            html += `<p style="color:var(--text-muted);font-size:var(--fs-md)">${T`Salon boş. Soylular sefere çıkmış; onları haritada bulman ya da bir başkasına yerlerini sorman gerek.`}</p>`;
        } else {
            html += `<div style="display:flex;flex-wrap:wrap;gap:1rem;margin-top:0.6rem">`;
            lords.forEach(l => html += this.nobleCard(l));
            html += `</div>`;
        }

        // For a female player, the courtship target is the lords themselves; a separate
        // guest list would print the same cards twice — courtship runs through the lord's dialogue.
        if(this.isFemale()) {
            html += `<p style="margin-top:1.2rem;font-size:var(--fs-sm);color:var(--text-muted)">
                ${T`Salonun leydileri seninle ilgilenmiyor. Bekâr bir lorda kur yapmak istersen
                onunla konuş (gereken nam: ${this.HALL_RENOWN}, sende ${renown}).`}</p>`;
        } else {
        html += `<h4 style="margin-top:1.5rem;color:var(--primary)">${T`Salonun Konukları`}</h4>`;
        if(renown < this.HALL_RENOWN) {
            html += `<p style="color:var(--danger);font-size:var(--fs-md)">${T`Kapıdaki muhafız yolunu kesiyor:
                <i>"Kim bu üstü başı toz içindeki? Soyluların oturduğu salona her önüne gelen giremez."`}</i><br>
                <span style="color:var(--text-muted)">${T`Gereken nam: ${this.HALL_RENOWN} (sende ${renown})`}</span></p>`;
        } else if(ladies.length === 0) {
            html += `<p style="color:var(--text-muted);font-size:var(--fs-md)">${T`Bugün konuk yok.`}</p>`;
        } else {
            html += `<div style="display:flex;flex-wrap:wrap;gap:1rem;margin-top:0.6rem">`;
            ladies.forEach(l => html += this.nobleCard(l));
            html += `</div>`;
        }
        }

        if(!state.player.vassalOf && loc.faction && FACTIONS[loc.faction]) {
            html += `<button class="btn" style="margin-top:1.5rem" onclick="Nobles.swearFealtyPrompt('${loc.faction}')">${T`⚔️ ${T(FACTIONS[loc.faction].ruler)}'a Bağlılık Yemini Et`}</button>`;
        }
        html += `<button class="btn" style="margin-top:0.5rem" onclick="Game.closeModal()">${T`Ayrıl`}</button>`;
        Game.showModal(html, '760px', Game.sceneBg('hall'));   // interior of the keep (#60)
    },

    nobleCard(n) {
        let isLady = n.guardianId !== undefined;
        let sub = isLady
            ? `${T`İlgi:`} <b style="color:#ff9ec4">${this.aff(n.id)}</b>`
            : this.relLabel(this.rel(n.id));
        return `<div onclick="Nobles.talk('${n.id}')" style="cursor:pointer;width:150px;text-align:center;
            padding:0.6rem;background:rgba(0,0,0,0.35);border:1px solid var(--panel-border);border-radius:8px">
            <div style="display:flex;justify-content:center">${this.portraitCss(n, 96)}</div>
            <div style="font-weight:bold;margin-top:0.5rem;font-size:var(--fs-md)">${T(n.name)}</div>
            <div style="font-size:var(--fs-xs);margin-top:0.2rem">${sub}</div>
        </div>`;
    },

    swearFealtyPrompt(fid) {
        if(Game.peakRenown() < 50) return alert(T('Derebeyi olmak için en az 50 Nam gerekli.'));
        state.player.vassalOf = fid;
        state.player.rightToRule += 5;
        LORDS.filter(l => l.faction === fid).forEach(l => this.addRel(l.id, 10));
        alert(T`Artık ${T(FACTIONS[fid].name)} derebeyisin! Krallığın lordları seni tanımaya başladı.`);
        Game.closeModal();
        Game.updateTopBar();
    },

    // ---------- Dialogue ----------
    talk(id) {
        let n = this.any(id);
        if(!n) return;
        if(n.guardianId !== undefined) return this.courtMenu(id);

        let r = this.rel(id);
        let p = PERSONALITIES[n.personality];
        let line = this.greetLine(n, r);
        let banter = this.retinueHtml(id);          // retinue banter (#59), shown once the line finishes
        Quests.emit('talked_to', { lordId: id });

        let html = `<div style="display:flex;gap:1.5rem;align-items:flex-start">
            ${this.portraitCss(n, 140)}
            <div style="flex:1">
                <h3 style="margin:0;color:${FACTIONS[n.faction].color}">${T(n.name)}</h3>
                <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-bottom:0.6rem">
                    ${T`${T(FACTIONS[n.faction].name)} · ${T(p.name)} · ${this.traitOb(id).icon} ${T(this.traitOb(id).name)} · İlişki: ${this.relLabel(r)} (${r})
                    <br>Gözünde ağırlığın:`} <b style="color:var(--primary)">${this.standingLabel(this.standing(id))}</b>
                    <span style="opacity:0.7">${T`(nam + ilişki + kapıya getirdiğin ordu)`}</span>
                    ${Game.infamyTier() ? `<br><span style="color:var(--danger)">${T`${Game.infamyLabel()} diye biliniyorsun — köy yakan adamın sözü bu salonda ${Game.infamyTier() > 1 ? T('hiç') : 'zor'} geçer.`}</span>` : ''}
                </div>
                <p id="lord-line" style="font-style:italic;color:#eee;line-height:1.5;min-height:3em"></p>
                ${banter}
            </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1.2rem">`;

        let today = state.time.day;
        let chat = state.smallTalkDay || {};
        html += chat[id] === today
            ? `<button class="btn" disabled style="opacity:0.4">${T`🗣️ Hâl hatır soruldu (bugünlük yeter)`}</button>`
            : `<button class="btn" onclick="Nobles.smallTalk('${id}')">${T`🗣️ Hâl hatır sor`}</button>`;

        html += `<button class="btn" onclick="Quests.offerMenu('${id}')">${T`📜 Bana bir iş var mı?`}</button>`;
        html += `<button class="btn" onclick="Nobles.askWhereMenu('${id}')">${T`🗺️ Birinin yerini sor`}</button>`;
        html += `<button class="btn" onclick="Nobles.giftMenu('${id}')">${T`🎁 Hediye ver`}</button>`;

        // If the "Bring a Poem" quest is with this lord and one is memorized
        if(state.player.poems.length && state.player.quests.some(q => q.id === 'bring_poem' && q.giverId === id))
            html += `<button class="btn" onclick="Nobles.recitePoemToLord('${id}')">${T`🎵 Öğrendiğin şiiri oku`}</button>`;

        // A female player's courtship path: from the lord's own dialogue (the hall's renown gate lives here)
        let suitor = this.isFemale() ? this.suitors().find(x => x.lordId === id) : null;
        if(suitor) {
            html += Game.peakRenown() >= this.HALL_RENOWN
                ? `<button class="btn" style="border-color:#ff9ec4;color:#ff9ec4" onclick="Nobles.courtMenu('${suitor.id}')">${T`💘 Ona kur yap (ilgi ${this.aff(suitor.id)})`}</button>`
                : `<button class="btn" disabled style="opacity:0.4">${T`💘 Kur yapmak için ${this.HALL_RENOWN} nam gerekir (sende ${Game.peakRenown()})`}</button>`;
        }

        let wards = this.courtables().filter(l => l.guardianId === id);
        if(wards.length) {
            wards.forEach(w => {
                html += `<button class="btn" style="border-color:#ff9ec4;color:#ff9ec4" onclick="Nobles.askForHand('${w.id}')">${T`💍 ${T(w.name)} ile ilgili konuşmak istiyorum`}</button>`;
            });
        }

        // A player who is king can retain lords — the price is a fief (#40)
        if(Game.isKing() && n.rank !== 'king' && n.faction !== 'player_kingdom')
            html += `<button class="btn" style="border-color:var(--primary);color:var(--primary)" onclick="Game.offerVassalage('${id}')">${T`👑 Krallığıma katıl (tımar teklif et)`}</button>`;
        else if(n.faction === 'player_kingdom')
            html += `<button class="btn" disabled style="opacity:0.5">${T`👑 Senin vassalın — ${Game.fiefsOf(id).length} tımar`}</button>`;

        html += `<button class="btn" style="border-color:var(--danger);color:var(--danger)" onclick="Nobles.insult('${id}')">${T`🤬 Hakaret et`}</button>`;
        html += `<button class="btn" onclick="Game.closeModal()">${T`Ayrıl`}</button></div>`;

        Game.showModal(html, '680px');
        // The line is typed out gradually; the retinue only cuts in once the lord finishes
        let b = document.getElementById('lord-banter');
        if(b) b.style.visibility = 'hidden';
        Game.typeIn('lord-line', `"${line}"`, () => { if(b) b.style.visibility = 'visible'; });
    },

    recitePoemToLord(id) {
        let p = POEMS.find(x => x.id === state.player.poems[0]);
        Quests.emit('poem_recited_lord', { lordId: id, poemId: p.id });
        alert(T`${T(p.text)}\n\n${T(this.lord(id).name)} kadehini masaya bıraktı. "Fena değil. Ziyafette bunu okuyacaksın."`);
    },

    // The player's standing in a noble's eyes: renown + relation + the army brought to the door.
    // -1 looked down on ... 4 feared. Lines and the payoff of small talk depend on this.
    standing(id) {
        let p = state.player, r = this.rel(id);
        let theirs = (state.npcParties.find(x => x.lordId === id) || {}).size || 20;
        let power = p.party.length / Math.max(1, theirs);
        let sc = Math.min(3, Math.floor(p.renown / 130))
               + (r >= 40 ? 1 : r <= -15 ? -1 : 0)
               + (power >= 1.2 ? 1 : power < 0.4 ? -1 : 0)
               - (this.lord(id).personality === 'quarrelsome' ? 1 : 0)
               + Game.honorWeight(this.lord(id).personality);   // honor is read according to the lord's personality (#53/1.5)
        return Math.max(-1, Math.min(4, sc));
    },
    standingLabel(sc) {
        return [T('Bir hiç'), T('Tanınmayan'), T('Adı duyulmuş'), T('Saygı gören'), T('Ünlü'), T('Çekinilen')][sc + 1];
    },

    // ---------- Lord personalities and line pool (#59) ----------
    // Personality (PERSONALITIES) decides what a lord does; character trait decides how they talk.
    // The trait is never saved: it derives from a hash of the id, so the same lord gets
    // the same trait on every load and in every old save — no migration code needed.
    LORD_TRAITS: {
        proud:     { name: 'Kibirli',  icon: '\ud83e\udd9a' },
        craven:    { name: 'Korkak',   icon: '\ud83d\udc01' },
        cruel:     { name: 'Zalim',    icon: '\ud83d\udde1\ufe0f' },
        jolly:     { name: 'Neşeli',   icon: '\ud83c\udf7a' },
        greedy:    { name: 'Paragöz',  icon: '\ud83d\udcb0' },
        honorable: { name: 'Onurlu',   icon: '\u269c\ufe0f' },
        fawning:   { name: 'Dalkavuk', icon: '\ud83d\ude47' }
    },
    traitOf(id) {
        let keys = Object.keys(this.LORD_TRAITS), str = String(id), h = 0;
        for(let i = 0; i < str.length; i++) h = (h * 131 + str.charCodeAt(i)) % 1000003;   // 131: the most even spread across 23 lords (2-4)
        return keys[h % keys.length];
    },
    traitOb(id) { return this.LORD_TRAITS[this.traitOf(id)]; },

    // The standing score (-1..4) collapses to three speech bands:
    // 0 = doesn't take you seriously, 1 = normal, 2 = wary/fawning
    band(sc) { return sc <= 0 ? 0 : sc <= 2 ? 1 : 2; },

    // Line pool: keys 'b0/b1/b2' map to a band, the rest to a character trait.
    // In greet, the trait pool is further split into three by band.
    LORD_LINES: {
        greet: {
            proud: [
                ['Bu salona girmeden önce ayakkabılarına baktın mı? Ben baktım.',
                 'Konuş. Ama kısa konuş; öğleden sonra kendi portremi izleyeceğim.'],
                ['Adını duydum. Bir kere. Belki iki — ikincisinde de ben söylüyordum.',
                 'Otur. Ama o koltuğa değil, o benim büyükbabamın.'],
                ['İkimiz de büyük adamız. Aramızdaki tek fark, benim daha eski olmam.',
                 'Seni denk sayıyorum. Bunu kimseye söyleme, itibarım zedelenir.']
            ],
            craven: [
                ['Silahın var mı? Yok değil mi? Yok de. Lütfen yok de.',
                 'Kapıyı kapat... hayır, açık bırak. Açık ki kaçabileyim. Buyur, dinliyorum.'],
                ['Otur, ama kapıya yakın otur. İkimiz için de iyi olur.',
                 'Kötü haber getirmediysen konuş. Getirdiysen otur, önce bir su içeyim.'],
                ['Ordunu saydım. İki kere saydım. Sonuç ikisinde de fena çıktı.',
                 'Ne istersen. Gerçekten. Şu masa da senin olsun, ben zaten sevmezdim.']
            ],
            cruel: [
                ['Zindanım dolu ama bir kişilik yer her zaman açılır. Sen ne diyordun?',
                 'Adını unutacağım. Yüzünü unutmam — o meslek icabı.'],
                ['İşini bitir de git. Akşam bir asmam var, geç kalmak istemem.',
                 'Yararlı adamları severim. Yararsızlara ne yaptığımı köylülere sorabilirsin.'],
                ['Sen olmasan çok rahat ederdim. Olduğun için, buyur otur.',
                 'Seni sevmiyorum, yine de iyi davranıyorum. Bu benden büyük bir iltifat.']
            ],
            jolly: [
                ['Hoş geldin! Kim olduğunu bilmiyorum ama içki bitmeden öğreniriz.',
                 'Yeni bir yüz! Çavuşum yine kaybedecek, ben hep yeni yüzlere bahse girerim.'],
                ['Gel gel! Şu peyniri dene, kokusu ağır ama karakteri var — sana benziyor.',
                 'Anlat bakalım, yollarda kaç kişiyi darladın? Şaka. Yarısını anlat yeter.'],
                ['İşte adam dediğin! Hizmetkâr, iyi şaraptan getir — hayır, çok iyi olanından.',
                 'Seninle aynı masada olmak keyifli. Karşı masada olmak da bir o kadar pahalı.']
            ],
            greedy: [
                ['Vaktim paradır. Sen ise şu ana kadar bedavaya konuşuyorsun.',
                 'Kesene baktım, oradan bir ses gelmedi. Yine de dinliyorum.'],
                ['Otur. Kadeh başına iki dinar, ama ilk yudum ikramımdır.',
                 'Dostluk güzel şeydir. Faizli olanı daha da güzel.'],
                ['Zengin adamla konuşmak bedava. Bu benim tek indirimim.',
                 'Sen ticaret yolu gibisin: yanından geçmek bile kâr.']
            ],
            honorable: [
                ['Adını bilmiyorum. Ama sözünü tutup tutmadığını öğreneceğim.',
                 'Bir adamı kılıcından değil, borcundan tanırım. Anlat.'],
                ['Hoş geldin. Doğru söyle, kısa söyle; ikimiz de kazanalım.',
                 'Bu salonda yalan söyleyen adam iki kere oturmaz. Buyur, otur.'],
                ['Namın önünden yürüyor. Umarım arkasından da aynısı geliyordur.',
                 'Seni denk görüyorum. Bu benim verebileceğim en pahalı şey.']
            ],
            fawning: [
                ['Kimsiniz? Önemli birine benziyorsunuz... değil misiniz? Peki.',
                 'Buyurun oturun. Yani otur. Yani... hangisi rahatsa.'],
                ['Ah, ne güzel oldu gelmeniz! Tam da sizden bahsediyordum — iyi şeylerdi tabii.',
                 'Sizi kralın sofrasında görmüştüm sanki. Görmediysem de göreceğim, eminim.'],
                ['Efendim! Buyurun, baş köşe zaten sizin adınıza boş duruyordu.',
                 'Ben hep sizin tarafınızdaydım. Sorarsanız herkes doğrular — sorulacaklarla konuştum.']
            ]
        },
        chat: {
            proud: ['Kralın yeni sancağını gördün mü? Rengi berbat. Benimkini kopyalasalar bu kadar konuşulmazdı.',
                    'Şairler beni yeterince yazmıyor. Birine para verdim, üçüncü kıtada beni unuttu.'],
            craven: ['Sur nöbetini iki katına çıkardım. Nöbetçiler için değil, benim uykum için.',
                     'Kergitler at üstünde uyuyormuş. Ben yatakta bile uyuyamıyorum, bu nasıl adalet?'],
            cruel: ['Vergiyi ödemeyen iki köylüyü kuleye astım. Üçüncüsü ödedi. Sistem işliyor.',
                    'Merhamet pahalı bir maldır. Ambarımda ona yer yok.'],
            jolly: ['Geçen ay domuz turnuvası düzenledim. Kazanan domuza çavuşumun adını verdim.',
                    'Şarap bitince savaş başlar derler. Ben o yüzden mahzeni büyüttüm — barış budur.'],
            greedy: ['Bir tüccar kadifeyi bana iki katına satmaya kalktı. Şimdi bana çalışıyor.',
                     'Toprak iyidir de, faiz uyumuyor. Ben de uyumuyorum; ikimiz anlaşıyoruz.'],
            honorable: ['Yeminimi bozduğumu söyleyene rastlarsan bana getir. Yüzleşmeyi severim.',
                        'Kılıç kuşanmak kolay. Zor olan, kuşanmadan durabilmek.'],
            fawning: ['Kral geçen gün bana baktı. Bakışında bir sıcaklık vardı. Belki güneş vuruyordu.',
                      'Ben de tam sizin gibi düşünüyorum. Ne düşündüğünüzü söyleyin, aynısını düşüneyim.'],
            b1: ['Bu aralar yollarda çapulcu kaynıyor. Kimin beslediğini merak ediyorum.',
                 'Geçen kış ambarlar boş kaldı. Bu yıl aynısı olursa kılıç değil kaşık konuşacak.',
                 'Turnuvalar eskisi gibi değil. Eskiden adam ölürdü, şimdi herkes sağ dönüyor.'],
            b2: ['Açık konuşayım: seninle iyi geçinmek, karşında olmaktan ucuz.',
                 'Kraldan önce sana danışan lordlar var artık. Bunu ben söylemedim, sen de duymadın.',
                 'Adamlarım seni konuşuyor, ben de dinliyorum. Bu benim için yeni bir durum.']
        },
        brush: {
            proud: ['Hâl hatır mı? Benim hâlim iyi. Senin hatırın yok.'],
            craven: ['Bilmiyorum, duymadım, görmedim. Başka bir şey var mı?'],
            cruel: ['Konuşmak istiyorsan zindanda konuşan çok. Onlara katılabilirsin.'],
            jolly: ['Seninle içerdim ama kadeh sayım belli. Adını duyunca bir tane fazla koyarım.'],
            greedy: ['Sohbet bedava değil. Fiyatını da veremezsin; geç.'],
            honorable: ['Tanımadığım adamla ahbaplık etmem. Tanınacak bir iş yap, sonra otur.'],
            fawning: ['Ben şu an büyüklerle konuşuyorum... yani sonra. Siz de büyüksünüz tabii. Neyse.'],
            b0: ['Havadan sudan konuşacak vaktim yok. Adını duyduğum gün otururuz.',
                 'Hava mı? Güzel. Hasat mı? Fena değil. Başka? Yok mu? Güle güle.',
                 'Sen konuşurken ben kaç mızrak ısmarlayacağımı hesaplıyordum. Kusura bakma.']
        },
        quest: {
            proud: ['Sana bir iş vereceğim. Aklında tut, çünkü iki kere anlatmam.',
                    'Bu iş benim seviyeme göre küçük. Yani tam sana göre.'],
            craven: ['Bir iş var ama tehlikeli. Ben gidemem; sırtım tutuyor. Ve kalbim. Ve dizlerim.',
                     'Sen gidersin, ben burada senin için endişelenirim. İş bölümü budur.'],
            cruel: ['Bir iş var. Beceremezsen ne olacağını anlatmayayım, uyku düzenin bozulur.',
                    'Bu işi bitir. Bitmezse bitirecek birini bulurum, sen de onu izlersin.'],
            jolly: ['Bir işim var! Sıkıcı değil, söz. Yani biraz sıkıcı. Ama sonunda içki var.',
                    'Şuna bak, tam sana göre. Kaybedersen de güzel bir hikâye olur.'],
            greedy: ['İş var, para var. Benim payım büyük ama seninki de var.',
                     'Ödemeyi peşin isteme. Peşin ödeyen adam iki kere ödemiş sayılır.'],
            honorable: ['Bir işim var. Kabul edersen sözünü tut; tutamayacaksan şimdi reddet, kimse gücenmez.',
                        'Bu iş kolay değil. Kolay olsa sana teklif etmezdim.'],
            fawning: ['Küçücük bir ricam olacak, sizin gibi biri için hiç iş sayılmaz...',
                      'Bunu kral duyarsa çok memnun olur. Sizin adınızı da anarım. Muhtemelen.'],
            b0: ['Sana verecek doğru dürüst bir iş yok ama ayak işi her zaman var.',
                 'Bunu adamlarıma versem gülerler. O yüzden sana veriyorum.',
                 'Beceremezsen kimse şaşırmaz. Bu da bir tür özgürlük.'],
            b2: ['Bunu senden rica ediyorum, emretmiyorum. Farkı ikimiz de biliyoruz.',
                 'Bu işi sana veriyorum, çünkü başkası becerse kimsenin haberi olmaz.',
                 'Kabul edersen herkese anlatırım. Etmezsen hiç konuşmadık.']
        },
        retort: {
            proud: ['Bunu bir daha söyle. Hayır, söyleme. Kulağım kirlenir.'],
            craven: ['Ben... ben de senin hakkında kötü şeyler düşünüyorum. İçimden.'],
            cruel: ['Güzel. Artık seni öldürmek için sebebim var, bahaneye gerek kalmadı.'],
            jolly: ['Ha ha! Bunu bir yere yazın. Sonra da adamı kapının önüne koyun.'],
            greedy: ['Bu hakaretin bedelini faiziyle alırım. Faizi de yüksek tutarım.'],
            honorable: ['Söylediğinin arkasında kılıcınla durabiliyor musun? Hayır mı? Öyleyse çık.'],
            fawning: ['Ne dediniz? Yani... öyle demek istemediniz herhalde. Değil mi? Değil mi?']
        },
        // Retinue banter: [retinue's line, lord's reply]
        retinue: {
            proud: [['Efendim, portrenizin boyası hâlâ kurumadı.', 'Kurusun. Sanat acele etmez; ben ederim.'],
                    ['Misafirin adını deftere yazayım mı efendim?', 'Yaz. Silmesi kolay olur.']],
            craven: [['Efendim, kapıda bir atlı var.', 'Kapat! ... Postacı mı? Yine de kapat.'],
                     ['Zırhınızı getireyim mi efendim?', 'Getir ama giymem. Yanımda dursun, moral olur.']],
            cruel: [['Efendim, zindandaki adam af diliyor.', 'Dilesin. Dilekçe güzel şeydir, arşivde tutarız.'],
                    ['Köylüler vergiyi ödeyemiyor efendim.', 'Öyleyse iki şey ödesinler: vergi ve özür.']],
            jolly: [['Efendim, mahzende üç fıçı kaldı.', 'Üç mü? Felaket. Savaş ilan et, seferde içeriz.'],
                    ['Domuz yine bahçeye girdi efendim.', 'Bırak girsin. Misafirimiz var, kalabalık görünürüz.']],
            greedy: [['Efendim, tüccar fiyatı düşürmüş.', 'Demek bir bildiği var. Al hepsini, iki katına satarız.'],
                     ['Maaşımız bu ay gecikti efendim.', 'Gecikmedi, faizle bekliyor. Bana teşekkür edeceksin.']],
            honorable: [['Efendim, düşman lordu pusuya düşürebiliriz.', 'Düşürebiliriz. Düşürmeyeceğiz. Sen kahvaltını et.'],
                        ['Sözünüzü geri alsanız kârlı çıkardınız efendim.', 'Kârlı çıkmak için söz vermedim ki.']],
            fawning: [['Efendim, kral mektubunuza cevap vermemiş.', 'Cevap vermemek de bir cevaptır. Olumlu bir cevap.'],
                      ['Bu misafir önemli biri mi efendim?', 'Öyle davran. Yanılırsak da zararı yok.']],
            b0: [['Efendim, salon soğuk.', 'Sohbet ısıtır. Odun atma, konuşana kulak ver.'],
                 ['Yemek hazır efendim.', 'Bekletin. Bu adam ya kısa konuşur ya da yemek soğur.']],
            b1: [['Bir haberci geldi efendim.', 'Sırasını beklesin. Haber bekler, misafir beklemez... genelde.'],
                 ['Kılıcınızı bilettim efendim.', 'İyi. Umarım bu sohbette işime yaramaz.']],
            b2: [['Muhasebeyi getireyim mi efendim?', 'Getirme. Bugün keyfim yerinde, bozmayalım.'],
                 ['Efendim, köpek yine masaya çıktı.', 'Bırak otursun. Bu salondaki en dürüst konuk o.']]
        }
    },
    RETAINERS: ['Yaşlı çavuş', 'Kâhya', 'Silahtar', 'Danışman', 'Genç uşak', 'Kâtip'],

    // The last N lines are never picked again (the pattern from Game.dailyEvent). Two
    // differences here: the counter is kept per kind, and the lookback is capped at
    // 60% of the pool — applying a filter of 12 to a 5-line pool emptied the pool
    // and selection fell back to fully random (measured: 16% back-to-back repeats).
    fresh(pool, kind = 'x') {
        if(!pool.length) return null;
        let mem = state.recentLines || (state.recentLines = {});
        let recent = mem[kind] || (mem[kind] = []);
        let keep = Math.max(1, Math.min(12, Math.floor(pool.length * 0.6)));
        let key = x => JSON.stringify(x), tail = recent.slice(-keep);
        let f = pool.filter(x => tail.indexOf(key(x)) < 0);
        let use = f.length ? f : pool;
        let out = use[Math.floor(Math.random() * use.length)];
        recent.push(key(out));
        if(recent.length > 12) recent.shift();
        return out;
    },
    // Line selection: kind + the lord's character trait + the player's standing band
    lineFor(kind, id, extra = []) {
        let src = this.LORD_LINES[kind] || {}, b = this.band(this.standing(id));
        let mine = src[this.traitOf(id)] || [];
        if(kind === 'greet') mine = mine[b] || [];
        // The pool text passed through `T` while the script loaded — the language was
        // always 'tr' at that point, so it stayed Turkish; translation happens at
        // selection time. `extra` arrives from the caller already translated.
        let pool = mine.concat(src['b' + b] || []).map(x => Array.isArray(x) ? x.map(s => T(s)) : T(x));
        return this.fresh(pool.concat(extra), kind + b);
    },
    // Retinue banter: doesn't cut in on every dialogue, only one time in three
    retinueHtml(id) {
        if(Math.random() > 0.34) return '';
        let pair = this.lineFor('retinue', id);
        if(!pair) return '';
        let who = this.RETAINERS[Math.floor(Math.random() * this.RETAINERS.length)];
        return `<div id="lord-banter" style="margin-top:0.6rem;font-size:var(--fs-sm);color:var(--text-muted);border-left:2px solid var(--panel-border);padding-left:0.7rem">
            <div><b>${T(who)}:</b> <i>"${pair[0]}"</i></div>
            <div style="margin-top:0.2rem"><b>${this.lord(id) ? T(this.lord(id).name) : T('Lord')}:</b> <i>"${pair[1]}"</i></div>
        </div>`;
    },

    // A single-line modal: portrait + a typewriter-written line + a note, then back to dialogue
    say(id, line, note = '') {
        let n = this.lord(id);
        Game.showModal(`<div style="display:flex;gap:1.2rem;align-items:flex-start">
                ${this.portraitCss(n, 110)}
                <div style="flex:1">
                    <h3 style="margin:0;color:${FACTIONS[n.faction].color}">${T(n.name)}</h3>
                    <p id="lord-line" style="font-style:italic;color:#eee;line-height:1.5;min-height:3.2em"></p>
                    ${note ? `<div style="font-size:var(--fs-sm);color:var(--text-muted)">${note}</div>` : ''}
                </div></div>
            <button class="btn" style="margin-top:1rem" onclick="Nobles.talk('${id}')">${T`Geri`}</button>`, '620px');
        Game.typeIn('lord-line', `"${line}"`);
    },

    // Greeting: hostility first, then friendship, then the player's standing.
    // No single fixed reply — every tier has its own pool.
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
    // Returns plain text (no quotes): the typewriter writes it into textContent (#59)
    greetLine(n, r) {
        if(r <= -50) return T('Sen hâlâ nefes alıyor musun? Bir gün bu hatayı düzelteceğim.');
        if(r <= -15) return T('Yüzünü görmek bile keyfimi kaçırıyor. Çabuk söyle derdini.');
        if(r >= 60)  return T('Gel bakalım! Otur şöyle. Senin geldiğin gün kötü haber gelmez bu kapıya.');
        // Character trait + standing band pool; the old GREETS tier pool stays mixed in
        return this.lineFor('greet', n.id, (this.GREETS[String(this.standing(n.id))] || []).map(s => T(s)));
    },

    smallTalk(id) {
        let today = state.time.day;
        state.smallTalkDay = state.smallTalkDay || {};
        if(state.smallTalkDay[id] === today) return;
        state.smallTalkDay[id] = today;

        let n = this.lord(id);
        // Small talk is no longer an automatic +1: a lord who doesn't take you
        // seriously gives nothing, even snaps back. The payoff grows with your standing.
        let sc = this.standing(id);
        let gain = sc <= -1 ? -1 : sc === 0 ? 0 : sc <= 2 ? 1 : 2;
        if(gain) this.addRel(id, gain);
        Game.trainAttr('int', 0.3);

        if(sc <= 0) {
            return this.say(id, this.lineFor('brush', id),
                `${T`Gözünde ağırlığın:`} <b>${this.standingLabel(sc)}</b>${gain ? T` · ${gain} ilişki` : T(' · ilişki değişmedi')}<br>` +
                T`Nam kazan, kalabalık bir orduyla gel — kapılar o zaman açılır.`);
        }

        // Two more lines are added to the pool from the world's current state
        let world = [
            T`${T(FACTIONS[n.faction].name)}'nda vergiler yine arttı. Kimse konuşmuyor ama herkes biliyor.`,
            T`Duyduğuma göre ${T(LORDS[Math.floor(Math.random()*LORDS.length)].name)} yine bir sınırda dolaşıyormuş.`
        ];
        this.say(id, this.lineFor('chat', id, world),
            `${T`Gözünde ağırlığın: <b>${this.standingLabel(sc)}</b> · +${gain} ilişki`}`);
    },

    insult(id) {
        let n = this.lord(id);
        this.addRel(id, -15);
        state.player.renown += 2;
        // Rival kingdoms' lords enjoy this
        LORDS.filter(l => l.faction !== n.faction).forEach(l => this.addRel(l.id, 5));
        Game.updateTopBar();
        // The reply comes from the lord's character trait (#59)
        Game.showModal(`<div style="display:flex;gap:1.2rem;align-items:flex-start">
                ${this.portraitCss(n, 110)}
                <div style="flex:1">
                    <h3 style="margin:0;color:${FACTIONS[n.faction].color}">${T(n.name)}</h3>
                    <p style="font-style:italic;color:var(--text-muted)">${T`Sen: "Senin soyağacın bir tereyağı fıçısına sığar ${T(n.name)}."`}</p>
                    <p id="lord-line" style="font-style:italic;color:#eee;line-height:1.5;min-height:3em"></p>
                    <div style="font-size:var(--fs-sm);color:var(--text-muted)">${T`−15 ilişki, +2 nam. Rakip krallıkların lordları bunu duyunca keyiflendi (+5).`}</div>
                </div></div>
            <button class="btn" style="margin-top:1rem" onclick="Game.closeModal()">${T`Ayrıl`}</button>`, '620px');
        Game.typeIn('lord-line', `"${this.lineFor('retort', id)}"`);
    },

    // ---------- Gift ----------
    giftMenu(id) {
        let n = this.lord(id);
        let inv = state.player.inventory.filter(i => i.type !== 'special');
        if(inv.length === 0) return alert(T('Verecek bir şeyin yok.'));
        if(state.giftDay && state.giftDay[id] === state.time.day)
            return alert(T('Bugün ona zaten bir hediye verdin. Fazlası yalakalık olur.'));

        let html = `<h3>${T`🎁 ${T(n.name)}'a Hediye`}</h3>
            <p style="color:var(--text-muted);font-size:var(--fs-sm)">${T`Herkes her şeyden hoşlanmaz. ${T(PERSONALITIES[n.personality].name)} bir adamın neyi seveceğini tahmin et.`}</p>
            <div style="display:flex;flex-wrap:wrap;gap:0.6rem;margin-top:1rem">`;
        state.player.inventory.forEach((it, i) => {
            if(it.type === 'special') return;
            html += `<button class="btn" style="font-size:var(--fs-sm)" onclick="Nobles.giveGift('${id}',${i})">${it.icon||'📦'} ${T(it.name)} (x${it.qty})</button>`;
        });
        html += `</div><button class="btn" style="margin-top:1rem" onclick="Nobles.talk('${id}')">${T`Geri`}</button>`;
        Game.showModal(html);
    },

    giveGift(id, idx) {
        let n = this.lord(id);
        let item = state.player.inventory[idx];
        if(!item) return;
        let p = PERSONALITIES[n.personality];

        let gain, line;
        if(n.personality === 'quarrelsome') {
            gain = 3; line = T`"Hı. Sağ ol." Fazlasını bekleme.`;
        } else if(p.likes.includes(item.id)) {
            gain = { martial:8, cunning:6, debauched:10, goodnatured:7 }[n.personality];
            line = T`"${T(item.name)}! İşte adam gibi hediye." Gözleri parladı.`;
        } else {
            gain = 1; line = T`"...Sağ ol." Hediyeyi yandaki masaya bıraktı, bir daha bakmadı.`;
        }

        item.qty--;
        if(item.qty <= 0) state.player.inventory.splice(idx, 1);
        state.giftDay = state.giftDay || {};
        state.giftDay[id] = state.time.day;
        this.addRel(id, gain);

        alert(T`${T(n.name)}: ${line}\n\n+${gain} ilişki`);
        this.talk(id);
    },

    // ---------- "Ask someone's whereabouts" ----------
    askWhereMenu(askedId) {
        let asked = this.lord(askedId);
        let others = LORDS.filter(l => l.id !== askedId);
        let html = `<h3>${T`🗺️ ${T(asked.name)}'a sor: "… nerede?"`}</h3>
            <p style="color:var(--text-muted);font-size:var(--fs-sm)">
            ${T`Alacağın cevabın doğruluğu onunla aranın iyiliğine bağlı. Kırgın bir adam seni bilerek yanlış yola sürer.`}</p>
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1rem;max-height:45vh;overflow-y:auto">`;
        others.forEach(l => {
            html += `<button class="btn" style="font-size:var(--fs-sm)" onclick="Nobles.askWhere('${askedId}','${l.id}')">${T(l.name)}</button>`;
        });
        html += `</div><button class="btn" style="margin-top:1rem" onclick="Nobles.talk('${askedId}')">${T`Geri`}</button>`;
        Game.showModal(html, '720px');
    },

    askWhere(askedId, targetId) {
        let asked = this.lord(askedId), target = this.lord(targetId);
        let party = this.partyOf(targetId);
        if(!party) return alert(T`"${T(target.name)} mi? O adam artık yok. Kimse cesedini de bulamadı."`);

        let r = this.rel(askedId);
        // Asking about someone from another kingdom drops a tier
        if(asked.faction !== target.faction) r -= 20;
        // The lie you spread came back around: that kingdom's lords lie to you too
        if(state.liars && state.time.day <= state.liars.until && asked.faction === state.liars.faction) r = -1;

        let msg, accuracy = null, lie = false;

        if(r < 0) {
            lie = true; accuracy = 400;
            msg = T`"${T(target.name)} mi? Tabii, biliyorum." Gözünü kırpmadan bir yer tarif etti.`;
        } else if(r < 20) {
            let dir = this.compass(party);
            msg = T`"Kesin bir şey diyemem. Geçen ay ${dir} tarafına gitmişti."`;
        } else if(r < 50) {
            accuracy = 600;
            msg = T`"Şöyle bir bakayım haritaya... Buralarda bir yerde olmalı."`;
        } else {
            accuracy = 200;
            msg = T`"${T(target.name)} mi? Adamlarım dün gördü. Tam olarak şurada. Üç gün boyunca da haber alırım, kaçamaz."`;
        }

        if(accuracy !== null) {
            let angle = Math.random() * Math.PI * 2;
            let ox, oy;
            if(lie) {
                // Lie: place the marker 800-1500 units away from the real position
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

        alert(`${T(asked.name)}: ${msg}${accuracy !== null ? T('\n\n📍 Haritaya bir işaret düştü (3 gün geçerli).') : ''}`);
        this.talk(askedId);
    },

    compass(p) {
        let dx = p.x - 4500, dy = p.y - 4500;
        if(Math.abs(dx) > Math.abs(dy)) return dx > 0 ? T('doğu') : T('batı');
        return dy > 0 ? T('güney') : T('kuzey');
    },

    // Draws known-location markers on the map (called from within Game.renderMap)
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
            ctx.fillText(`📍 ${T(m.name)}`, m.x, m.y - m.radius - 14);
            ctx.restore();
        }
    },

    // ---------- COURTSHIP ----------
    courtMenu(ladyId) {
        let L = this.lady(ladyId);
        let a = this.aff(ladyId);
        let t = LADY_TRAITS[L.trait];
        let g = this.lord(L.guardianId);
        let rival = state.rivals[ladyId];

        if(state.player.spouse === ladyId) {
            return Game.showModal(`<div style="display:flex;gap:1.5rem;align-items:center">${this.portraitCss(L,140)}
                <div><h3 style="margin:0">${T(L.name)}</h3><p style="font-style:italic">${T`"Eve ne zaman döneceksin?"`}</p></div></div>
                <button class="btn" style="margin-top:1rem" onclick="Game.closeModal()">${T`Kapat`}</button>`);
        }

        let html = `<div style="display:flex;gap:1.5rem;align-items:flex-start">
            ${this.portraitCss(L, 140)}
            <div style="flex:1">
                <h3 style="margin:0;color:#ff9ec4">${T(L.name)}</h3>
                <div style="font-size:var(--fs-sm);color:var(--text-muted)">
                    ${T(FACTIONS[L.faction].name)} · ${T(t.name)} · ${L.suitor ? T('Efendisi') : T('Vasisi')}: ${g ? T(g.name) : '—'}
                </div>
                <p style="font-size:var(--fs-sm);color:var(--text-muted);margin-top:0.4rem;font-style:italic">${T(L.lore)}</p>
                <div style="margin-top:0.8rem">
                    <div style="font-size:var(--fs-sm)">${T`İlgisi:`} <b style="color:#ff9ec4">${a}/100</b></div>
                    <div style="background:rgba(0,0,0,0.4);height:8px;border-radius:4px;margin-top:4px">
                        <div style="background:#ff9ec4;height:100%;width:${a}%;border-radius:4px"></div>
                    </div>`;
        if(rival) {
            html += `<div style="font-size:var(--fs-sm);margin-top:0.6rem">${T`Rakip`} <b>${T(this.any(rival.lordId).name)}</b>: <b style="color:#e74c3c">${Math.floor(rival.affection)}/100</b></div>
                     <div style="background:rgba(0,0,0,0.4);height:6px;border-radius:3px;margin-top:3px">
                        <div style="background:#e74c3c;height:100%;width:${Math.floor(rival.affection)}%;border-radius:3px"></div>
                     </div>`;
        }
        html += `</div></div></div><div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1.2rem">`;

        let today = state.time.day;
        let visited = (state.visitDay || {})[ladyId] || -99;
        html += (today - visited >= 3)
            ? `<button class="btn" onclick="Nobles.visitLady('${ladyId}')">${T`💬 Sohbet et (+3)`}</button>`
            : `<button class="btn" disabled style="opacity:0.4">${T`💬 Sohbet et (${3-(today-visited)} gün sonra)`}</button>`;

        html += `<button class="btn" onclick="Nobles.complimentMenu('${ladyId}')">${T`🌹 İltifat et`}</button>`;

        if(state.player.poems.length)
            html += `<button class="btn" onclick="Nobles.poemMenu('${ladyId}')">${T`📜 Şiir oku`}</button>`;
        else
            html += `<button class="btn" disabled style="opacity:0.4">${T`📜 Şiir oku (önce meyhanede ozandan öğren)`}</button>`;

        if(state.pendingDedication)
            html += `<button class="btn primary" onclick="Nobles.dedicate('${ladyId}')">${T`🏆 Turnuva zaferini ona ithaf et (+18)`}</button>`;

        if(rival)
            html += `<button class="btn" style="border-color:#e74c3c;color:#e74c3c" onclick="Nobles.rivalMenu('${ladyId}')">${T`⚔️ Rakibin: ${T(this.any(rival.lordId).name)}`}</button>`;

        if(a >= 60)
            html += `<button class="btn primary" onclick="Nobles.askForHand('${ladyId}')">💍 ${L.suitor ? T('Kralından elini isteyeceğim') : T('Babandan seni isteyeceğim')}</button>`;
        else
            html += `<button class="btn" disabled style="opacity:0.4">${T`💍 Evlilikten söz etmek için ilgisi 60 olmalı (${a})`}</button>`;

        html += `<button class="btn" onclick="Game.closeModal()">${T`Ayrıl`}</button></div>`;
        Game.showModal(html, '700px');
    },

    visitLady(ladyId) {
        state.visitDay = state.visitDay || {};
        state.visitDay[ladyId] = state.time.day;
        let L = this.lady(ladyId);
        this.addAff(ladyId, 3);
        let lines = [
            T`"Yollar nasıldı? Buradan bakınca hep aynı görünüyor."`,
            T`"Babam yine aynı hikâyeyi anlattı. Üçüncü kez dinliyormuş gibi yaptım."`,
            T`"Sen konuşurken kaleyi unutuyorum. Bunu kimseye söyleme."`,
            T`"Bugün kimse bana bir şey sormadı. Sen sordun. Tuhaf ama iyi geldi."`
        ];
        alert(T`${T(L.name)}: ${lines[Math.floor(Math.random()*lines.length)]}\n\n+3 ilgi`);
        this.courtMenu(ladyId);
    },

    complimentMenu(ladyId) {
        let L = this.lady(ladyId);
        let html = `<h3>${T`🌹 ${T(L.name)}'a İltifat`}</h3>
            <p style="font-size:var(--fs-sm);color:var(--text-muted);font-style:italic">${T`İpucu: ${T(LADY_TRAITS[L.trait].hint)}`}</p>
            <p style="font-size:var(--fs-sm);color:var(--danger)">${T`Yanlış konu açarsan geri teper.`}</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">`;
        COMPLIMENTS.forEach(c => {
            html += `<button class="btn" style="font-size:var(--fs-sm)" onclick="Nobles.compliment('${ladyId}','${c.id}')">${T(c.label)}</button>`;
        });
        html += `</div><button class="btn" style="margin-top:1rem" onclick="Nobles.courtMenu('${ladyId}')">${T`Geri`}</button>`;
        Game.showModal(html);
    },

    compliment(ladyId, cid) {
        let L = this.lady(ladyId), t = LADY_TRAITS[L.trait];
        let c = COMPLIMENTS.find(x => x.id === cid);
        let gain, reply;
        if(cid === t.likes) {
            gain = 5;  reply = T`Gözlerini kaçırdı ama gülümsediğini gördün. "Devam et," dedi.`;
        } else if(cid === t.hates) {
            gain = -8; reply = T`Yüzü buz kesti. "Sen beni hiç dinlememişsin," dedi ve arkasını döndü.`;
        } else {
            gain = 1;  reply = T`Kibarca başını salladı. Söylediğin bir kulağından girip diğerinden çıktı.`;
        }
        this.addAff(ladyId, gain);
        alert(`Sen: ${c.line}\n\n${reply}\n\n${gain > 0 ? '+' : ''}${gain} ilgi`);
        this.courtMenu(ladyId);
    },

    poemMenu(ladyId) {
        let L = this.lady(ladyId);
        let used = (state.poemsRead || {})[ladyId] || [];
        let html = `<h3>${T`📜 ${T(L.name)}'a Şiir`}</h3>
            <p style="font-size:var(--fs-sm);color:var(--text-muted)">${T`Her şiiri aynı kişiye yalnızca bir kez okuyabilirsin.`}</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">`;
        state.player.poems.forEach(pid => {
            let p = POEMS.find(x => x.id === pid);
            html += used.includes(pid)
                ? `<button class="btn" disabled style="opacity:0.4">${T`${T(p.name)} (okundu)`}</button>`
                : `<button class="btn" onclick="Nobles.recitePoem('${ladyId}','${pid}')">${T(p.name)}</button>`;
        });
        html += `</div><button class="btn" style="margin-top:1rem" onclick="Nobles.courtMenu('${ladyId}')">${T`Geri`}</button>`;
        Game.showModal(html);
    },

    recitePoem(ladyId, pid) {
        state.poemsRead = state.poemsRead || {};
        state.poemsRead[ladyId] = state.poemsRead[ladyId] || [];
        if(state.poemsRead[ladyId].includes(pid)) return;
        state.poemsRead[ladyId].push(pid);
        let p = POEMS.find(x => x.id === pid);
        this.addAff(ladyId, 12);
        alert(T`${T(p.text)}\n\n${T(this.lady(ladyId).name)} uzun bir süre sustu.\n\n+12 ilgi`);
        this.courtMenu(ladyId);
    },

    dedicate(ladyId) {
        if(!state.pendingDedication) return;
        state.pendingDedication = false;
        state.dedicatedTo = state.dedicatedTo || [];
        if(state.dedicatedTo.includes(ladyId)) {
            alert(T('Ona zaten bir zafer ithaf etmiştin. İkincisi aynı etkiyi yapmaz.'));
            this.addAff(ladyId, 4);
        } else {
            state.dedicatedTo.push(ladyId);
            this.addAff(ladyId, 18);
            alert(T`Arenanın ortasında durdun ve zaferini ${T(this.lady(ladyId).name)}'ya ithaf ettin.\nBütün salon ona döndü. Yüzü kızardı ama gözünü kaçırmadı.\n\n+18 ilgi`);
        }
        this.courtMenu(ladyId);
    },

    // ---------- Rival suitor ----------
    // If the rival is a lady, she doesn't draw the sword herself: her guardian defends her honor.
    duelTarget(rival) {
        return (rival.guardianId !== undefined && !rival.suitor) ? this.lord(rival.guardianId) : rival;
    },

    rivalMenu(ladyId) {
        let r = state.rivals[ladyId];
        let rl = this.any(r.lordId);
        let opp = this.duelTarget(rl);
        let html = `<h3>${T`⚔️ Rakip: ${T(rl.name)}</h3>
            <p>Aynı kapıyı o da çalıyor. İlgisi her gün artıyor (şu an <b>${Math.floor(r.affection)}</b>).
            100'e ilk ulaşan ${T(this.lady(ladyId).name)} ile nişanlanır.`}</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">
            <button class="btn" onclick="Nobles.duelRival('${ladyId}')">${T`🗡️ Şeref düellosuna çağır${opp.id !== rl.id ? T` (vasisi ${T(opp.name)} çıkacak)` : ''}`}</button>
            <button class="btn" style="border-color:#aa8800;color:#aa8800" onclick="Nobles.smearRival('${ladyId}')">${T`🐍 İtibarını lekele`}</button>
            <button class="btn" onclick="Nobles.courtMenu('${ladyId}')">${T`Geri`}</button></div>`;
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
            alert(T`${T(rl.name)} dizlerinin üstüne çöktü ve kılıcını bıraktı.\n"Bu iş burada bitti," dedi ve salonu terk etti.\n\n+15 ilgi, +10 nam, ${T(rl.name)} ile −25 ilişki.`);
        } else {
            this.addAff(d.ladyId, -20);
            state.player.stats.hp = Math.max(5, Math.floor(state.player.stats.maxHp * 0.2));
            Game.advanceTime(24 * 5);
            alert(T`${T(rl.name)} seni yere serdi. Beş gün yatakta kaldın.\n\n−20 ilgi, 5 gün kayıp.`);
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
            alert(T`Yaydığın dedikodu geri tepti. Kimin uydurduğu anlaşıldı.\n${T(FACTIONS[rl.faction].name)}'nın bütün lordlarıyla −25 ilişki, −10 ilgi.`);
        } else {
            r.affection = Math.max(0, r.affection - 20);
            alert(T`Meyhanelerde ${T(rl.name)} hakkında anlatılanlar salona kadar ulaştı.\nRakibinin ilgisi −20 düştü.`);
        }
        this.courtMenu(ladyId);
    },

    // ---------- Asking the father, and the dowry ----------
    dowryFor(ladyId) {
        let L = this.lady(ladyId);
        let g = this.lord(L.guardianId);
        let p = state.player;
        let fiefs = LOCATIONS.filter(l => l.faction === L.faction && l.type !== 'village').length;

        let base = 8000;
        let fiefAdd = fiefs * 400;
        // The renown discount is logarithmic: linear, 300 renown alone was worth
        // −6000, and the dowry kept pinning to its 1500 floor.
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

        if(p.spouse) return alert(T('Zaten evlisin. Kalradya buna hoş bakmaz.'));

        if(a < 60) return alert(T`${T(L.name)} seni henüz o gözle görmüyor. (İlgi ${a}/60)\nÖnce onunla vakit geçir.`);

        let ward = L.suitor ? T('vassalımı') : T('kızımı');
        let html = `<h3>${T`💍 ${T(g.name)} ile Görüşme`}</h3>
            <p style="font-style:italic">${T`"${T(L.name)}, öyle mi?" Seni tepeden tırnağa süzdü. "Üç şeye bakarım: adına, sözüne ve kesene."`}</p>
            <div style="background:rgba(0,0,0,0.3);padding:1rem;border-radius:8px;margin-top:1rem">`;

        let okRenown = Game.peakRenown() >= this.MIN_RENOWN;
        let okRel = this.rel(g.id) >= this.MIN_REL;
        html += `<div style="margin-bottom:0.5rem">${okRenown?'✅':'❌'} <b>${T`Nam:`}</b> ${Game.peakRenown()} / ${this.MIN_RENOWN}
                 ${okRenown?'':`<div style="font-size:var(--fs-sm);color:var(--danger);font-style:italic">${T`"Adını duyan yok. ${ward} bir hiçe vermem."`}</div>`}</div>`;
        html += `<div style="margin-bottom:0.5rem">${okRel?'✅':'❌'} <b>${T`İlişki:`}</b> ${this.rel(g.id)} / ${this.MIN_REL}
                 ${okRel?'':T('<div style="font-size:var(--fs-sm);color:var(--danger);font-style:italic">"Seni tanımıyorum bile. Önce bir işime yara."</div>')}</div>`;
        html += `</div>`;

        if(!okRenown || !okRel) {
            html += `<button class="btn" style="margin-top:1rem" onclick="Nobles.courtMenu('${ladyId}')">${T`Geri Çekil`}</button>`;
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
        let dLabel = this.lady(ladyId).suitor ? T('Başlık') : T('Drahoma');
        let html = `<h4 style="margin-top:1.2rem;color:var(--primary)">${T`${dLabel} Hesabı`}</h4>
            <div style="background:rgba(0,0,0,0.3);padding:1rem;border-radius:8px;font-size:var(--fs-md);line-height:1.7">
            <div>${T`Temel bedel: <b>${d.base}</b> dinar</div>
            <div>${T(FACTIONS[this.lady(ladyId).faction].name)}'nın ${d.fiefs} kalesi/şehri var:`} <span style="color:var(--danger)">+${d.fiefAdd}</span></div>
            <div>${T`Namın (${p.renown}) sayesinde:`} <span style="color:var(--success)">−${d.renownCut}</span></div>
            <div>${T`${T(d.guardian.name)} ile aran (${this.rel(d.guardian.id)}) sayesinde:`} <span style="color:var(--success)">−${d.relCut}</span></div>
            <div>${T`Mevkiin: <b>×${d.statusMult}</b> ${p.vassalOf === 'player_kingdom' ? T('(kendi krallığın)') : p.vassalOf ? T('(derebeyi)') : T('(bağımsız maceracı)')}</div>
            <div>${T(PERSONALITIES[d.guardian.personality].name)} mizacı:`} <b>×${d.persMult}</b></div>
            <hr style="border-color:var(--panel-border);margin:0.6rem 0">
            <div style="font-size:1.2rem">${T`İstenen:`} <b style="color:#ffcc00">${o.amount} dinar</b> ${T`(kesende ${Math.floor(p.money)})`}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">`;

        html += p.money >= o.amount
            ? `<button class="btn primary" onclick="Nobles.payDowry('${ladyId}')">${T`💰 Kabul et ve öde (${o.amount})`}</button>`
            : `<button class="btn" disabled style="opacity:0.4">${T`💰 Kesen yetmiyor (${o.amount})`}</button>`;

        html += `<button class="btn" onclick="Nobles.haggle('${ladyId}')">${T`🤝 Pazarlık et (İkna yeteneği)`}</button>`;

        if(Game.peakRenown() >= 200)
            html += `<button class="btn" onclick="Nobles.dowryQuest('${ladyId}')">${T`⚔️ "Param yok ama kılıcım var"`}</button>`;
        else
            html += `<button class="btn" disabled style="opacity:0.4">${T`⚔️ "Param yok ama kılıcım var" (200 nam gerekir)`}</button>`;

        html += `<button class="btn" style="border-color:var(--danger);color:var(--danger)" onclick="Nobles.elopePrompt('${ladyId}')">${T`🏇 Kaçırmayı teklif et`}</button>`;
        html += `<button class="btn" onclick="Nobles.courtMenu('${ladyId}')">${T`Düşüneyim`}</button></div>`;
        return html;
    },

    haggle(ladyId) {
        let o = state.dowryOffer;
        if(!o) return;
        if(o.haggledDay === state.time.day) return alert(T('Bugün yeterince pazarlık ettin. Adamın sabrını taşırma.'));
        o.haggledDay = state.time.day;

        let g = this.dowryFor(ladyId).guardian;
        let lvl = (state.player.proficiencies.persuasion || { level: 1 }).level;
        let chance = 0.40 + lvl * 0.05;

        if(Math.random() < chance) {
            o.amount = Math.max(1000, Math.round(o.amount * 0.8 / 50) * 50);
            Game.addProficiencyXp('persuasion', 60);
            alert(T`"...Peki. Ama bir kuruş daha aşağı inmem."\n\nBedel %20 düştü → ${o.amount} dinar.`);
        } else {
            this.addRel(g.id, -5);
            Game.addProficiencyXp('persuasion', 20);
            alert(T`"Burası pazar yeri mi sanıyorsun?"\n\nPazarlık tutmadı, −5 ilişki. Yarın tekrar dene.`);
        }
        Game.showModal(`<h3>${T`💍 ${T(g.name)} ile Pazarlık`}</h3>` + this.dowryBreakdown(ladyId), '680px');
    },

    payDowry(ladyId) {
        let o = state.dowryOffer;
        if(!o || state.player.money < o.amount) return;
        state.player.money -= o.amount;
        this.betroth(ladyId, T`Drahoma sayıldı, eller sıkıldı.`);
    },

    dowryQuest(ladyId) {
        let g = this.dowryFor(ladyId).guardian;
        Game.closeModal();
        let q = Quests.offerFrom(g.id, { forced: true, dowryFor: ladyId });
        if(!q) {
            alert(T`${T(g.name)}: "Şu an sana verecek bir işim yok. Bir süre sonra gel."`);
            return this.courtMenu(ladyId);
        }
        alert(T`${T(g.name)}: "Kesen boşsa kılıcın çalışsın. Şunu hallet, drahomanın yarısını unutayım."`);
    },

    elopePrompt(ladyId) {
        let L = this.lady(ladyId);
        Game.showModal(`<h3>${T`🏇 Kaçırma</h3>
            <p>Gece yarısı, arka kapı, iki at. Drahoma yok, tören yok.`}</p>
            <p style="color:var(--danger)">${T`Bedeli:<br>
            • ${T(this.lord(L.guardianId).name)} ile <b>−60</b> ilişki<br>
            • ${T(FACTIONS[L.faction].name)}'nın bütün lordlarıyla <b>−20</b><br>
            • <b>−30</b> nam, <b>−20</b> şeref<br>
            • ${T(L.name)}'nın ilgisi <b>−10</b> (böyle hayal etmemişti)`}</p>
            <div style="display:flex;gap:1rem;margin-top:1rem">
            <button class="btn" style="border-color:var(--danger);color:var(--danger)" onclick="Nobles.elope('${ladyId}')">${T`Atları hazırla`}</button>
            <button class="btn" onclick="Nobles.courtMenu('${ladyId}')">${T`Vazgeç`}</button></div>`);
    },

    elope(ladyId) {
        let L = this.lady(ladyId);
        this.addRel(L.guardianId, -60);
        LORDS.filter(l => l.faction === L.faction && l.id !== L.guardianId).forEach(l => this.addRel(l.id, -20));
        state.player.renown = Math.max(0, state.player.renown - 30);
        Game.addHonor('abduct');   // an abduction is honor's most expensive line item (#53/1.5)
        this.addAff(ladyId, -10);
        this.marry(ladyId, T('Şafak sökerken sınırı geçtiniz. Arkanızda bağıran bir kale kaldı.'));
    },

    betroth(ladyId, msg) {
        state.betrothed = ladyId;
        state.dowryOffer = null;
        let L = this.lady(ladyId);
        Game.closeModal();
        Game.updateTopBar();
        // If a feast is running, right away; otherwise the guardian schedules one
        if(state.feast && state.feast.faction === L.faction) {
            this.marry(ladyId, msg + T('\nŞölen zaten sürüyordu; nikâh o akşam kıyıldı.'));
        } else {
            let loc = LOCATIONS.find(l => l.id === this.lord(L.guardianId).homeLocId);
            state.pendingWedding = { ladyId, locId: loc ? loc.id : L.homeLocId, day: state.time.day + 5 + Math.floor(Math.random()*6) };
            Feast.schedule(L.faction, state.pendingWedding.locId, state.pendingWedding.day);
            alert(T`${msg}\n\nNişanlandınız! Düğün ${state.pendingWedding.day - state.time.day} gün sonra ${loc ? T(loc.name) : '?'} şehrindeki şölende yapılacak. O gün orada ol.`);
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
            id: 'spouse_' + ladyId, name: L.name + T(' (Eş)'), level: 10, xp: 0, xpNext: 999,
            type: 'noble', isSpouse: true
        });
        Game.closeModal();
        Game.updateTopBar();
        alert(T`${msg}\n\n💍 ${T(L.name)} ile evlendin!\n+15 idare hakkı, ${T(FACTIONS[L.faction].name)} lordlarıyla +20 ilişki, günlük +50 dinar drahoma geliri.`);
    },

    // ---------- Daily ----------
    dailyTick() {
        // Known-location markers are removed after 3 days
        for(let id in state.knownLocations) {
            if(state.time.day - state.knownLocations[id].day >= 3) delete state.knownLocations[id];
        }

        // Rival suitors advance — but the race only really heats up once you start courting.
        // Otherwise every lady gets engaged before the player even reaches 120 renown.
        for(let ladyId in state.rivals) {
            let r = state.rivals[ladyId];
            r.affection += this.aff(ladyId) > 0 ? 1.2 : 0.15;
            if(r.affection >= 100 && state.player.spouse !== ladyId && state.betrothed !== ladyId) {
                let L = this.lady(ladyId);
                alert(T`Geç kaldın. ${T(L.name)}, ${T(this.any(r.lordId).name)} ile nişanlandı.`);
                state.affection[ladyId] = 0;
                delete state.rivals[ladyId];
                state.lostLadies = state.lostLadies || [];
                state.lostLadies.push(ladyId);
            }
        }

        // Marriage income
        if(state.player.spouse) state.player.money += 50;

        // Has the wedding day arrived?
        if(state.pendingWedding && state.time.day >= state.pendingWedding.day) {
            let w = state.pendingWedding;
            let atVenue = Game.dist(state.player, LOCATIONS.find(l => l.id === w.locId) || state.player) < 200;
            if(atVenue) this.marry(w.ladyId, T('Şölen salonu doldu, kadehler kalktı.'));
            else if(state.time.day > w.day + 2) {
                this.addRel(this.lady(w.ladyId).guardianId, -25);
                this.addAff(w.ladyId, -25);
                state.pendingWedding = null;
                state.betrothed = null;
                alert(T('Kendi düğününe gitmedin. Salon iki gün bekledi, sonra dağıldı. Rezil oldun.'));
            }
        }
    },

    // Set up rival suitors at game start
    initRivals() {
        state.rivals = {};
        this.courtables().forEach(L => {
            if(Math.random() < 0.60) {
                // A male player's rival is a lord; a female player's rival is a lady also suiting the same lord
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

// --- FEAST ---
const Feast = {
    schedule(faction, locId, day) {
        state.scheduledFeasts = state.scheduledFeasts || [];
        state.scheduledFeasts.push({ faction, locId, day });
    },

    RENOWN_REQ: 150,

    dailyTick() {
        // Close a feast whose time is up
        if(state.feast && state.time.day >= state.feast.endDay) state.feast = null;

        // Scheduled feasts
        state.scheduledFeasts = (state.scheduledFeasts || []).filter(f => {
            if(state.time.day >= f.day) {
                state.feast = { faction: f.faction, locId: f.locId, endDay: state.time.day + 4, greeted: [] };
                return false;
            }
            return true;
        });

        // Spontaneous feast (every 10-20 days)
        if(!state.feast && state.time.day >= (state.nextFeastDay || 8)) {
            let cities = LOCATIONS.filter(l => l.type === 'city' && FACTIONS[l.faction]);
            let c = cities[Math.floor(Math.random()*cities.length)];
            if(c) {
                state.feast = { faction: c.faction, locId: c.id, endDay: state.time.day + 4, greeted: [] };
                state.nextFeastDay = state.time.day + 10 + Math.floor(Math.random()*11);
            }
        }
    },

    HONOR_REQ: -30,
    open(loc) {
        if(Game.peakRenown() < this.RENOWN_REQ) {
            return alert(T`Kapıdaki teşrifatçı listeye baktı ve başını salladı.\n"Bu isim burada yazmıyor."\n\nGereken nam: ${this.RENOWN_REQ} (sende ${Game.peakRenown()})`);
        }
        // Renown opens the door, honor decides who's kept at it: a village-burner isn't let into the hall (#53/1.5)
        if(Game.honor() < this.HONOR_REQ) {
            return alert(T`Teşrifatçı adını biliyor — fazlasıyla.\n"${Game.honorLabel()} birini bu salona sokamam."\n\n`
                + T`Gereken şeref: ${this.HONOR_REQ} (sende ${Game.honor()})`);
        }
        let f = state.feast;
        let guests = LORDS.filter(l => l.faction === f.faction);
        let ladies = Nobles.courtables().filter(l => l.faction === f.faction);

        let html = `<h3>${T`🍷 Şölen — ${T(loc.name)}`}</h3>
            <p style="color:var(--text-muted);font-size:var(--fs-md)">${T`${T(FACTIONS[f.faction].name)}'nın bütün soyluları burada.
            Herkesle bir kez selamlaşabilirsin (+2 ilişki).`}</p>`;

        if(state.pendingWedding && state.pendingWedding.locId === loc.id && state.time.day >= state.pendingWedding.day) {
            html += `<button class="btn primary" style="margin:1rem 0;font-size:1.1rem" onclick="Nobles.marry('${state.pendingWedding.ladyId}','Salon doldu, kadehler kalktı.')">${T`💍 Nikâhı Kıy!`}</button>`;
        }

        html += `<h4 style="color:var(--primary);margin-top:1rem">${T`Lordlar`}</h4><div style="display:flex;flex-wrap:wrap;gap:1rem">`;
        guests.forEach(l => html += Nobles.nobleCard(l));
        html += `</div>`;
        // For a female player, courtship targets the lords themselves; no separate lady list is printed.
        if(!Nobles.isFemale()) {
            html += `<h4 style="color:var(--primary);margin-top:1rem">${T`Leydiler`}</h4><div style="display:flex;flex-wrap:wrap;gap:1rem">`;
            ladies.forEach(l => html += Nobles.nobleCard(l));
            html += `</div>`;
        }
        html += `<button class="btn" style="margin-top:1.2rem" onclick="Feast.greetAll()">${T`🥂 Salonu dolaş ve herkesi selamla`}</button>
                 <button class="btn" onclick="Game.closeModal()">${T`Ayrıl`}</button>`;
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
        alert(n ? T`Salonu dolaştın, ${n} soyluyla kadeh tokuşturdun. Her biriyle +2 ilişki.` : T('Bu şölende herkesi zaten selamladın.'));
        Game.closeModal();
    },

    // Host your own feast (if you have your own city)
    host(loc) {
        const COST = 3000, FOOD = 30;
        let food = state.player.inventory.filter(i => ['meat','cheese'].includes(i.id)).reduce((a,b) => a + b.qty, 0);
        if(state.player.money < COST) return alert(T`Şölen için ${COST} dinar gerek.`);
        if(food < FOOD) return alert(T`Şölen için ${FOOD} birim yüksek kalite yemek (et/peynir) gerek. Sende ${food} var.`);

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
        alert(T`Şölenin başladı! ${T(FACTIONS[loc.faction].name)}'nın bütün soyluları geldi.\nHer biriyle +5 ilişki, +15 nam.`);
    }
};
