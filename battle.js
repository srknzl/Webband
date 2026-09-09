// ============================================
// WEBBAND - SAVAŞ MOTORU VE TURNUVA
// ============================================
// app.js'ten ayrıldı (#41): Battle + TournamentMinigame. İkisi de `battle-canvas`'ı
// paylaşır ve Game/state'e fonksiyon gövdelerinden erişir — bu yüzden app.js'ten
// SONRA yüklenmeleri yeterlidir, aralarında yükleme sırası bağı yoktur.
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
            // Tekil rakip piyade olmalı: havuzdan okçu çıkarsa 1v1'de seni sonsuza kadar kite eder
            e.name = lord.name; e.type = 'infantry';
            e.defense = 8; e.speed = 70; e.radius = 9; e.color = '#ff8800';
        }
        document.getElementById('battle-log-left').innerHTML = `<b>🗡️ Şeref Düellosu:</b> ${lord.name}`;
    },

    // Arena (#26): şehrin kum meydanında ücretsiz pratik dövüşü. Düello altyapısının
    // aynısı — grup sahneye girmez, ganimet/esaret/nam yok, yalnızca yeterlilik XP'si.
    ARENA_FOES: [
        { name: 'Acemi Dövüşçü',   dLv: -3, xp: 80,  desc: 'Kolay lokma, az ter.' },
        { name: 'Arena Gediklisi', dLv: 2,  xp: 180, desc: 'Senden bir gömlek üstün.' },
        { name: 'Arena Şampiyonu', dLv: 8,  xp: 340, desc: 'Dayak yersin ama çok şey öğrenirsin.' }
    ],
    startArena(idx) {
        let f = this.ARENA_FOES[idx] || this.ARENA_FOES[1];
        this._duelParty = state.player.party;
        state.player.party = [];
        this.isArena = f;
        this.start(f.name, 1);
        let e = this.units.find(u => !u.isPlayerTeam);
        if(e) {
            let lv = Math.max(1, state.player.stats.level + f.dLv);
            e.level = lv;
            e.hp = e.maxHp = 50 + lv * 6;
            e.attack = 10 + lv;
            e.defense = 6 + Math.floor(lv / 3);
            // Tahta silah: ezici, yani öldürmez bayıltır — arenada kimse ölmez
            e.name = f.name; e.type = 'infantry'; e.dmgType = 'blunt';
            e.speed = 70; e.radius = 9; e.color = '#ffcc55';
        }
        document.getElementById('battle-log-left').innerHTML = `<b>🤺 Arena:</b> ${f.name} — kum meydanı, tahta silahlar, ganimet yok.`;
    },

    start(enemyName, enemyCount, bossLevel = null, faction = null, siegePlan = null, auto = false) {
        Input.keys = {}; // Tuşları temizle
        this.canvas = document.getElementById('battle-canvas');
        this.ctx = Game.battleCtx();   // paylaşılan tuvalin tek kapısı (#54)
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
        this.autoLoss = null;
        this.grass = null;
        this.currentCommand = 'charge';
        this.cmdSlots = []; this.battleTime = 0;
        // Pusu (Game.checkAmbush): fark edemediğin çete seni ortada yakalar
        this.ambushed = !!state.ambush; state.ambush = false;
        // Kuşatma (#25): sur + gedik arazisi, savunana mevzi bonusu. Plan Game.SIEGE_PLANS'ten gelir.
        this.siege = siegePlan ? { name: siegePlan.name, defBonus: siegePlan.defBonus, gaps: siegePlan.gaps } : null;
        if(this.siege) {
            let wx = Math.round(W * 0.66);
            let gaps = [{ y: H / 2, h: 74, gate: true }];
            if(this.siege.gaps > 1) gaps.push({ y: Math.round(H * 0.22), h: 118, gate: false });   // kule rampası
            this.siege.wall = { x: wx, t: 26, gaps };
        }
        this.active = true;

        // Pusuda oyuncu kenarda değil, arenanın ortasında yakalanır (çember için şart)
        let startPlayerX = this.siege ? 120
                         : this.ambushed ? W/2 : (enemyCount < 30 ? W/2 - 200 - Math.random()*100 : 80);
        // Kuşatmada savunan surun ardında doğar, saldıran sahada
        let startEnemyX = this.siege ? this.siege.wall.x + 60
                        : (enemyCount < 30 ? W/2 + 100 + Math.random()*100 : W - 160);

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
        
        // Kuşatma sahası: sur dibinde nehir/kaya olmaz, örtü yalnızca kuşatan tarafta kalır
        if(this.siege) {
            let wx = this.siege.wall.x;
            this.terrain.rivers = [];
            this.terrain.rocks = [];
            this.terrain.hills = this.terrain.hills.filter(h => h.x < wx - 120);
            this.terrain.pits = this.terrain.pits.filter(p => p.x < wx - 100);
            this.terrain.forests = this.terrain.forests.filter(f => f.x < wx - 160);
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
                type: typeInfo.type, dmgType: typeInfo.dmgType, color: typeInfo.type === 'cavalry' ? '#33ddff' : typeInfo.type === 'archer' ? '#55ff55' : '#33aaff',
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
            let dmgType = (band && band.dmg) || 'cut';

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
                hp = ti.hp; speed = ti.speed; attack = ti.attack; defense = ti.defense; type = ti.type; dmgType = ti.dmgType;
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
                // Takvim mi, senin gücün mü — hangisi büyükse o (#53/1.3)
                enemyLvl = Math.max(5 + Math.floor(state.time.day / 15), Game.threatLevel() + 3);
            } else {
                enemyLvl = Math.max(1 + Math.floor(state.time.day / 30), Game.threatLevel() - 1);
            }

            // Seviye artık sadece etikette değil, gerçekten güçlendiriyor
            if(!bossLevel) {
                hp += (enemyLvl - 1) * 4;
                attack += Math.floor((enemyLvl - 1) / 2);
                defense += Math.floor((enemyLvl - 1) / 4);
            }
            // Savunan surun ardında dövüşür: mevzi avantajı kuşatma yöntemine bağlı (#25)
            if(this.siege) {
                hp = Math.round(hp * (1 + this.siege.defBonus));
                attack = Math.round(attack * (1 + this.siege.defBonus));
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
                speed: speed, attack: attack, defense: defense, dmgType: dmgType,
                type: type, color: color, radius: radius, atkCd: Math.random()*0.6, level: enemyLvl
            });
        }

        // Otomatik çözüm: aynı birimler kurulur ama arena açılmaz, sonuç hesaplanır (#30)
        if(auto) return this.autoResolve();
        // Kısmi katılım: sahaya kapasite kadar birim çıkar, kalanı yedekte bekler (#30)
        this.splitReserves(H, startPlayerX, startEnemyX);

        document.getElementById('battle-log-left').innerHTML = '<div class="log-msg" style="padding:6px 10px;color:#fff;"><b>'
            + (this.ambushed ? 'Pusuya Düştün! Etrafın sarıldı.' : 'Savaş Başladı!')
            + '</b><br>WASD hareket · Sol tık saldırı<br>[1] Takip · [2] Hücum · [3] Bekle</div>';
        if(this.siege) document.getElementById('battle-log-left').innerHTML =
            `<div class="log-msg" style="padding:6px 10px;color:#fff;"><b>🏰 Kuşatma — ${this.siege.name}</b><br>`
            + `Sur geçilmez; gedikten gireceksin. Savunanın mevzi avantajı +%${Math.round(this.siege.defBonus*100)}.`
            + `<br>WASD hareket · Sol tık saldırı</div>`;
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
            Debug.guard('savaş döngüsü', () => { this.update(dt); this.render(); });
            this.lastRender = performance.now();     // nabız (#54)
            this.loopId = requestAnimationFrame(loop);
        };
        this.loopId = requestAnimationFrame(loop);
        // Nabız kontrolü (#54): siyah ekran bir daha sessizce oturmasın. 700 ms içinde
        // tek kare çizilmediyse döngü ölmüş demektir — bir kez yeniden kurulur ve
        // olay Debug raporuna düşer. (Kök neden #42'de kapatıldı; bu ağdır, çözüm değil.)
        this.lastRender = 0;
        clearTimeout(this._pulseT);
        this._pulseT = setTimeout(() => {
            if(!this.active || this.lastRender || document.hidden) return;   // gizli sekmede rAF zaten duruyor, yanlış alarm olmasın
            Debug.log('nabiz', 'Savaş döngüsü 700 ms boyunca hiç kare çizmedi — döngü yeniden kuruldu');
            cancelAnimationFrame(this.loopId);
            this.loopId = requestAnimationFrame(loop);
        }, 700);
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
        this.blood(tgt.x, tgt.y, 3 + Math.random()*3);
        this.spark(tgt.x, tgt.y, a, src.isPlayerTeam ? '#ffdd66' : '#ff8866');
        this.floatingTexts.push({ x: tgt.x, y: tgt.y - 12, text: `-${dmg}`, color: src.isPlayerTeam ? '#ffdd55' : '#ff6666', life: 0.8, big: src.id === 'player' });
        if(tgt.hp <= 0) {
            // Ezici silah öldürmez, bayıltır — esir düşme şansı yükselir
            if((DMG_TYPES[src.dmgType] || {}).knock) tgt.stunned = true;
            this.logKill(tgt, src);
            this.awardTroopXp(src.id);
        }
    },

    // Kan ve kıvılcım tek kapıdan geçer: ayarlardan kapatılabilsin (#55 madde 6/7).
    // Kan/ceset "gore", kıvılcım hareket azaltma ayarına bağlı — ikisi ayrı ihtiyaç.
    blood(x, y, size) {
        if(!Game.opt('gore')) return;
        this.bloodStains.push({ x, y, alpha: 1.0, size });
    },
    spark(x, y, angle, color) {
        if(Game.reduceMotion()) return;
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
                    this.blood(u.x, u.y, 2.5 + Math.random()*2);
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

            // Kuşatmada sur geçilmez: karşı taraftaki hedefe gedikten gidilir. Savunan
            // kendi tarafında kalır, gediğin ağzını tutar — darboğaz onun avantajıdır (#25).
            let moveX = closest ? closest.x : u.x, moveY = closest ? closest.y : u.y;
            let wall = this.siege && this.siege.wall;
            if(wall && closest) {
                let mySide = u.x < wall.x;
                if(mySide !== (targetX < wall.x)) {
                    let g = wall.gaps.reduce((a, b) => Math.abs(b.y - u.y) < Math.abs(a.y - u.y) ? b : a);
                    targetY = moveY = g.y;
                    // Saldıran gediğin ötesini hedefler (geçince sapma kalkar), savunan ağzında bekler.
                    // Hedef noktası yakın dövüş menzilinden (35) uzak olmalı: yakınsa birim
                    // gediğin ağzında "vardım" sanıp duruyor ve orada kırılıyordu.
                    targetX = moveX = u.isPlayerTeam ? wall.x + 70 : wall.x + 40;
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
                        let dx = moveX-u.x, dy = moveY-u.y;
                        let md = Math.max(1, Math.sqrt(dx*dx + dy*dy));
                        let r = Math.min(uSpeed*0.8*dt/md, 1);   // okçu yürüyerek yaklaşır
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
            // Sur: gedik dışında geçilmez, gediğin içinde koridor gibi daraltır (#25)
            let w = this.siege && this.siege.wall;
            if(w && Math.abs(u.x - w.x) < w.t/2 + u.radius) {
                let g = w.gaps.find(g2 => Math.abs(u.y - g2.y) < g2.h/2);
                if(g) u.y = Math.max(g.y - g.h/2 + u.radius, Math.min(g.y + g.h/2 - u.radius, u.y));
                else u.x = u.x < w.x ? w.x - w.t/2 - u.radius : w.x + w.t/2 + u.radius;
            }
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

        if(this.siege && this.siege.wall) this.drawWall(c, this.siege.wall, H);

        // Hafif karartma: birimler zeminin üstünde daha okunur dursun
        c.fillStyle = 'rgba(6,10,6,0.16)';
        c.fillRect(0, 0, W, H);

        this.ground = g;
    },

    // Kuşatma suru: gedikler dışında taş bant + mazgal, kapıda kırık kanatlar (#25)
    drawWall(c, w, H) {
        let x0 = w.x - w.t/2, x1 = w.x + w.t/2;
        let sorted = w.gaps.slice().sort((a, b) => a.y - b.y);
        let segs = [], y = 0;
        sorted.forEach(g => { segs.push([y, g.y - g.h/2]); y = g.y + g.h/2; });
        segs.push([y, H]);

        segs.forEach(([a, b]) => {
            if(b <= a) return;
            c.fillStyle = 'rgba(0,0,0,0.45)';
            c.fillRect(x1, a + 8, 18, b - a);
            let g = c.createLinearGradient(x0, 0, x1, 0);
            g.addColorStop(0, '#8b8377'); g.addColorStop(0.45, '#6d6559'); g.addColorStop(1, '#443f38');
            c.fillStyle = g; c.fillRect(x0, a, w.t, b - a);
            c.strokeStyle = 'rgba(28,26,24,0.55)'; c.lineWidth = 1.5;
            for(let yy = a + 14; yy < b; yy += 14) { c.beginPath(); c.moveTo(x0, yy); c.lineTo(x1, yy); c.stroke(); }
            c.strokeStyle = 'rgba(20,18,16,0.85)'; c.lineWidth = 3;
            c.strokeRect(x0, a, w.t, b - a);
            for(let yy = a + 5; yy < b - 12; yy += 24) {   // mazgallar savunan tarafa bakar
                c.fillStyle = '#7a7266'; c.fillRect(x1 - 4, yy, 13, 12);
                c.strokeStyle = 'rgba(20,18,16,0.8)'; c.lineWidth = 2; c.strokeRect(x1 - 4, yy, 13, 12);
            }
        });

        w.gaps.forEach(g => {
            let a = g.y - g.h/2, b = g.y + g.h/2;
            c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(x0, a, w.t, b - a);
            if(g.gate) {
                c.fillStyle = '#3a3129';
                c.fillRect(x0 - 7, a - 14, w.t + 14, 14);
                c.fillRect(x0 - 7, b, w.t + 14, 14);
                c.fillStyle = '#5b3f22';   // kırılmış kapı kanatları
                c.fillRect(x0 - 4, a + 3, 9, 22); c.fillRect(x0 - 4, b - 25, 9, 22);
            } else {
                for(let i = 0; i < 9; i++)   // kule rampası: molozla dolmuş gedik
                    this.drawRock(c, x0 + Math.random()*w.t, a + 6 + Math.random()*(b - a - 12), 3 + Math.random()*4);
            }
        });
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
        // Takım ayrımı yalnız renge bırakılmaz (#55 madde 6): dost halkası dolu,
        // düşmanınki kesiklidir — gri tonlamalı ekranda da ayırt edilir.
        ctx.setLineDash(u.isPlayerTeam ? [] : [4, 3.2]);
        ctx.strokeStyle = ring; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.setLineDash([]);

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
        if(Game.opt('gore')) this.corpses.push({ x: victim.x, y: victim.y, isPlayerTeam: victim.isPlayerTeam, rot: Math.random()*Math.PI*2 });
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

    // --- KISMİ KATILIM, DALGALAR VE OTOMATİK ÇÖZÜM (#30) ---
    // Warband'ın "savaş alanı kapasitesi": 100 kişilik ordu tek seferde sahaya
    // dolmaz; kapasite kadarı dövüşür, saha boşaldıkça yedekler dalga hâlinde girer.
    FIELD_CAP: 30,
    reserves: { p: [], e: [] },
    splitReserves(H, startPlayerX, startEnemyX) {
        this._spawn = { H, p: startPlayerX, e: startEnemyX };
        this.reserves = { p: [], e: [] };
        [true, false].forEach(team => {
            let side = team ? 'p' : 'e';
            let list = this.units.filter(u => u.isPlayerTeam === team && u.id !== 'player');
            let over = list.length - (this.FIELD_CAP - (team ? 1 : 0));   // oyuncu da bir yer tutar
            if(over <= 0) return;
            this.reserves[side] = list.slice(list.length - over);
            this.units = this.units.filter(u => this.reserves[side].indexOf(u) < 0);
        });
    },
    reinforce() {
        if(!this.reserves) return;
        [true, false].forEach(team => {
            let side = team ? 'p' : 'e', pool = this.reserves[side];
            if(!pool.length) return;
            let live = this.units.filter(u => u.isPlayerTeam === team && u.hp > 0).length;
            // Damla damla değil dalga hâlinde: saha %70'in altına inince toptan takviye gelir
            if(live > this.FIELD_CAP * 0.7) return;
            let n = 0;
            while(n < this.FIELD_CAP - live && pool.length) {
                let u = pool.shift();
                u.x = (team ? this._spawn.p : this._spawn.e) + Math.random() * 60 - 30;
                u.y = 50 + Math.random() * (this._spawn.H - 100);
                this.units.push(u); n++;
            }
            if(n) this.log(`🚩 <b>Takviye dalgası:</b> ${n} ${team ? 'asker sahaya girdi' : 'düşman sahaya girdi'} (yedek: ${pool.length})`, team ? 'left' : 'right');
        });
    },
    // Askerlerini gönder: kazananın kaybı güç oranıyla ters orantılıdır (Lanchester'ın
    // *doğrusal* yasası). Kare yasası denendi — 5 kat üstün orduda kayıp %3'e düşüyor,
    // otomatik çözüm bedavaya geliyordu. 0.45 katsayısıyla 2 kat üstünlük ~%22, 5 kat ~%9,
    // 10 kat ~%4 kayıp verir; elle dövüşmek hâlâ ucuzdur. İdare yeteneği %40'a kadar indirir.
    autoResolve() {
        this.reserves = { p: [], e: [] };
        let str = team => this.units.filter(u => u.isPlayerTeam === team)
            .reduce((a, u) => a + u.hp * (u.attack + 2), 0);
        let q = str(true) / Math.max(1, str(false)) * (0.85 + Math.random() * 0.3);   // ±%15 talih payı
        let won = q > 1, ratio = won ? q : 1 / q;
        let loss = Math.min(0.85, 0.45 / ratio
            * (1 - Math.min(0.4, (Game.profLvl('leadership') - 1) * 0.04)));
        this.units.forEach(u => {
            if(u.isPlayerTeam !== won) { u.hp = 0; return; }              // kaybeden taraf tamamen düşer
            if(u.id !== 'player' && Math.random() < loss) u.hp = 0;
        });
        let pu = this.units[0];
        if(won) pu.hp = Math.max(5, Math.round(pu.hp * (1 - loss * 0.6)));   // oyuncu hırpalanır, ölmez
        this.autoLoss = loss;
        this.active = false;
        this.endBattle(won);
    },

    checkEnd() {
        this.reinforce();
        let pAlive = this.units.some(u=>u.isPlayerTeam&&u.hp>0) || this.reserves.p.length > 0;
        let eAlive = this.units.some(u=>!u.isPlayerTeam&&u.hp>0) || this.reserves.e.length > 0;
        if(!pAlive) { this.active=false; this.endBattle(false); }
        else if(!eAlive) { this.active=false; this.endBattle(true); }
    },

    // Seninle boy ölçüşemeyecek düşman doyurmaz: ganimet ve tecrübe güç oranına göre kısılır.
    // Düşman gücü dışarıdan verilebilir (#55 madde 9): karşılaşma modali savaş
    // başlamadan aynı formülle "kolay av" uyarısını yazabilsin diye.
    rewardScale(enemyPower) {
        let ep = enemyPower !== undefined ? enemyPower
               : this.units.filter(u => !u.isPlayerTeam).reduce((a, u) => a + (u.level || 1) + 1, 0);
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

        if(this.isArena) {
            let foe = this.isArena;
            this.isArena = null;
            state.player.party = this._duelParty || [];
            this._duelParty = null;
            let aUnit = this.units[0];
            state.player.stats.hp = Math.max(5, aUnit ? Math.floor(aUnit.hp) : 5);
            Game.showScreen('map');
            Game.finishArena(foe, won);
            return;
        }

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
            let conquestTxt = '';
            if(state.player.currentSiege) {
                let s = state.player.currentSiege;
                let loc = LOCATIONS.find(l=>l.id===s.locId);
                if(loc) {
                    let oldF = loc.faction;   // fethettiğin krallıkla savaş başlar
                    if(s.foundingKingdom) {
                        FACTIONS['player_kingdom'] = {id:'player_kingdom', name:state.player.name+' Krallığı', color:Game.bannerColor(), ruler:state.player.name};
                        state.player.vassalOf = 'player_kingdom';
                        loc.faction = 'player_kingdom';
                        Game.grantFief(loc, oldF);
                        Game.declareWar('player_kingdom', oldF);
                        conquestTxt = `<b>${loc.name} fethedildi — kendi krallığını ilan ettin!</b>`;
                    } else if(state.player.vassalOf) {
                        loc.faction = state.player.vassalOf;
                        Game.grantFief(loc, oldF);
                        Game.declareWar(state.player.vassalOf, oldF);
                        conquestTxt = `<b>${loc.name} fethedildi!</b> ${(FACTIONS[state.player.vassalOf]||{name:'?'}).name} adına aldın; kralın burayı sana tımar verdi.`;
                    }
                    // Fetih bilgisi zafer modalinde durur: alert() zafer ekranıyla eziliyordu
                    if(conquestTxt) conquestTxt += `<br>Tımar geliri <b style="color:#ffcc00">+${Game.fiefTax(loc)} dinar/gün</b>. `
                        + `Garnizon bırakmazsan düşman ilk fırsatta geri alır (yerleşim ekranı → 🛡️ Garnizon).`;
                }
                state.player.currentSiege = null;
            }

            // Köy yağması
            if(state.player.currentRaid) {
                let locId = state.player.currentRaid.locId;
                state.player.currentRaid = null;
                Game.completeRaid(locId);
            }

            // Yenilen NPC'yi haritadan kaldır
            let nobleTaken = null, cargoTxt = '';
            if(state.player.currentEncounterNpcId) {
                let beaten = state.npcParties.find(n => n.id === state.player.currentEncounterNpcId);
                Quests.emit('battle_won', {
                    npcId: state.player.currentEncounterNpcId,
                    questWave: beaten ? beaten.questWave : null,
                    lordId: beaten ? beaten.lordId : null
                });
                state.npcParties = state.npcParties.filter(n => n.id !== state.player.currentEncounterNpcId);
                state.player.currentEncounterNpcId = null;

                // Kervan/kafile yükü ganimete eklenir (#22)
                if(beaten && beaten.cargo) {
                    beaten.cargo.forEach(c => {
                        let it = ITEMS[c.id];
                        if(!it) return;
                        let ex = state.player.inventory.find(i => i.id === c.id);
                        if(ex) ex.qty += c.qty; else state.player.inventory.push({ ...it, qty: c.qty });
                        cargoTxt += `${it.icon} ${it.name} ×${c.qty} · `;
                    });
                    if(beaten.purse) { state.player.money += beaten.purse; cargoTxt += `💰 ${beaten.purse} dinar kese`; }
                }

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
                <h2 style="color:#2ecc71;margin-bottom:1rem;font-size:2rem;text-shadow:0 0 10px rgba(46,204,113,0.5)">${this.autoLoss ? '🎖️ Askerlerin Halletti' : this.knockedOut ? '🩸 Pahalı Zafer' : '⚔️ Mükemmel Zafer! ⚔️'}</h2>
                ${this.autoLoss ? `<p style="color:#8fd6ff;margin-bottom:1rem">Sen inmedin: adamların kendi başlarına dövüştü, beklenen kayıp %${Math.round(this.autoLoss*100)}.</p>` : ''}
                ${this.knockedOut ? '<p style="color:#ff8866;margin-bottom:1rem">Savaş meydanında bayıldın; ganimet ve tecrübe yarıya indi.</p>' : ''}
                ${rScale < 0.9 ? `<p style="color:#c9a227;margin-bottom:1rem">Kolay av: bu düşman sana denk değildi, ödüller %${Math.round(rScale*100)}'e indi.</p>` : ''}
                <div style="background:rgba(0,0,0,0.3);padding:1.5rem;border-radius:10px;margin-bottom:1.5rem;font-size:1.2rem;line-height:1.6;text-align:left;">
                    <p style="margin-bottom:0.8rem"><b>Kazanılan Dinar:</b> <span style="color:#ffcc00">+${moneyGain}</span> 💰</p>
                    <p style="margin-bottom:0.8rem"><b>Kazanılan Şan/Nam:</b> <span style="color:#3498db">+3</span> 👑</p>
                    <p style="margin-bottom:0.8rem"><b>Kazanılan Tecrübe:</b> <span style="color:#e74c3c">+${xpGain}</span> 🌟</p>
                    <p><b>Kayıplar:</b> <span style="color:#e74c3c">${killed} ölü</span> · <span style="color:#ffaa00">${saved} yaralı</span> 🩹</p>
                    ${captured ? `<p style="margin-top:0.8rem"><b>Esir Alınan:</b> <span style="color:#dda0dd">${captured}</span> ⛓️ <span style="font-size:0.85rem;color:var(--text-muted)">(şehirdeki köle tüccarına satabilirsin)</span></p>` : ''}
                    ${conquestTxt ? `<p style="margin-top:0.8rem;color:#e59b3d">🏰 ${conquestTxt}</p>` : ''}
                    ${cargoTxt ? `<p style="margin-top:0.8rem"><b>Yük Ganimeti:</b> <span style="color:#e0b062">${cargoTxt}</span> 🐪</p>` : ''}
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
            // Kaybın oranı artık zar değil karar: tımar kasandaki pay onu düşürür (#53/1.2)
            let ratio = Game.defeatLootRatio();
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
            state.player.siege = null;
            state.player.currentRaid = null;

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
        // Düello/arena maçından çekilmek esaret değil yenilgidir — eskiden bu yol
        // _duelParty'yi geri koymadığı için grubu kalıcı olarak siliyordu.
        if(this.isDuel || this.isArena) { this.active = false; this.endBattle(false); return; }
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
        state.player.currentRaid = null;
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

    // Turnuva tur tur elenir (#26). Her turda kuradan rastgele bir ekipman çıkar:
    // uzun menzilli silah hedefi küçültür ama ekranda daha uzun tutar, kalkanlı topuz
    // tam tersi. Bahis oranı elendiğin tura bağlı — şampiyonluk ×5 öder.
    ROUNDS: 4,
    ODDS: [0, 0.3, 0.8, 1.6, 5],
    GEAR: [
        { icon:'🗡️', name:'Tahta Kılıç',     size:1.00, life:1.00 },
        { icon:'🔱', name:'Mızrak',           size:0.85, life:1.30 },
        { icon:'🏹', name:'Yay',              size:0.70, life:1.55 },
        { icon:'🛡️', name:'Topuz ve Kalkan',  size:1.30, life:0.75 }
    ],
    rollGear() { return this.GEAR[Math.floor(Math.random() * this.GEAR.length)]; },

    start(opts = {}) {
        this.mode = opts.mode || 'tournament';
        this.goal = opts.goal || 12;
        this.bet = opts.bet || 0;
        this.round = 1;
        this.perRound = Math.max(1, Math.ceil(this.goal / this.ROUNDS));
        this.gear = this.mode === 'chicken' ? null : this.rollGear();
        this.canvas = document.getElementById('battle-canvas');
        this.ctx = Game.battleCtx();   // paylaşılan tuvalin tek kapısı (#54)
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
            : `<b>🏆 1. Tur!</b> Kuradan ${this.gear.icon} <b>${this.gear.name}</b> çıktı — ${this.perRound} isabet bir tur eder.`;

        this.clickHandler = (e) => this.onClick(e);
        this.canvas.addEventListener('mousedown', this.clickHandler);

        if(this.loopId) cancelAnimationFrame(this.loopId);
        let last = performance.now();
        const loop = (t) => {
            if(!this.active) return;
            if(Game.skipFrame(t)) { this.loopId = requestAnimationFrame(loop); return; }
            let dt = Math.min((t-last)/1000, 0.05);
            last = t;
            Debug.guard('turnuva döngüsü', () => { this.update(dt); this.render(); });
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
                radius: (42 + agiBonus * 1.2) * (this.gear ? this.gear.size : 1),
                timeLeft: (1.2 + strBonus * 0.12) * (this.gear ? this.gear.life : 1),
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
        if(this.mode !== 'chicken') {
            ctx.fillStyle = '#e0b062';
            ctx.fillText(`${this.round}. Tur / ${this.ROUNDS}  ·  ${this.gear.icon} ${this.gear.name}`, 15, 75);
            if(this.bet) {
                let cleared = Math.min(this.ROUNDS, Math.floor(this.score / this.perRound));
                ctx.fillText(`🎲 Bahis ${this.bet} → şu an ${Math.round(this.bet * this.ODDS[cleared])} dinar`, 15, 100);
            }
        }

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
                let msg = `${this.mode === 'chicken' ? 'Yakaladın!' : 'İsabet!'} (${this.score}/${this.goal})`;
                // Tur bitti: yeni kura, temiz saha ve tur arası nefes payı
                if(this.mode !== 'chicken' && this.score < this.goal && this.score % this.perRound === 0) {
                    this.round++;
                    this.gear = this.rollGear();
                    this.targets = [];
                    this.timeLeft += 6;
                    msg = `<b>${this.round}. Tur!</b> Kuradan ${this.gear.icon} <b>${this.gear.name}</b> çıktı. (+6 sn)`;
                }
                document.getElementById('battle-log-left').innerHTML = msg;
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

        // Bahis: para girişte kesildi, ödeme elenilen tura göre yapılır (#26)
        let betTxt = '';
        if(this.bet) {
            let cleared = Math.min(this.ROUNDS, Math.floor(this.score / this.perRound));
            let pay = Math.round(this.bet * this.ODDS[cleared]);
            state.player.money += pay;
            betTxt = `\n\n🎲 Bahis: ${this.bet} dinar × ${this.ODDS[cleared]} = ${pay} dinar `
                   + (pay > this.bet ? `(+${pay - this.bet} kâr)` : `(−${this.bet - pay} zarar)`);
        }
        if(won) {
            state.player.money += 500; state.player.renown += 20;
            state.player.tourneyWins = (state.player.tourneyWins || 0) + 1;   // hedef zinciri sayar (#53/1.4)
            state.pendingDedication = true;
            alert('Turnuvayı kazandın! +500 Dinar, +20 Nam' + betTxt + '\n\nArenada zaferini bir leydiye ithaf edebilirsin — salona git.');
        } else {
            alert(`${this.round}. turda elendin! Skor: ${this.score}/${this.goal}` + betTxt);
        }
        Quests.emit('tournament_end', { won, score: this.score });
        Game.updateTopBar();
    }
};
