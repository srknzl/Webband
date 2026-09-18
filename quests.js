// ============================================
// WEBBAND - QUEST SYSTEM
// ============================================
// Quests aren't copied from Warband; they target WebBand's own mechanics
// (fog, escape plan, market multiplier, food consumption, promotion tree, tournament).
//
// A quest definition:
//   givers      : which personalities give it (empty = everyone)
//   minRelation : not offered below this relation
//   can(giver)  : does the world currently make this quest possible (else not offered)
//   setup(q,giver) : fills q.data
//   desc(q)     : the quest-screen text — **what** to do and progress
//   where(q)    : id of the location to go to right now — the single source for
//                 the **where** question. Both the 📍 line in the quest list and
//                 the 📜 map pin read from here; no target (or a deliberately
//                 hidden one) means nothing is written.
//   on(q, ev, d): returns 'done' | 'fail' | undefined when an event arrives
//   day(q)      : called every day, 'done' | 'fail' | undefined
//   reward      : { money, renown, rel }

const QUESTS = {

    // 1 — Flood the market
    butter_blockade: {
        title: 'Tereyağı Ablukası',
        givers: ['cunning', 'debauched'],
        minRelation: 0,
        days: 20,
        reward: { money: 900, renown: 8, rel: 12 },
        setup(q, giver) {
            let hostile = LOCATIONS.filter(l => l.type === 'city' && l.faction !== giver.faction);
            let c = hostile[Math.floor(Math.random() * hostile.length)];
            q.data = { locId: c.id, locName: c.name, item: 'cheese', need: 15, got: 0 };
        },
        offer(q, giver) {
            return `${T`"${q.data.locName} pazarında peynir bolluğu var. Bolluk canımı sıkıyor.<br><br>
                Git, o pazardaki bütün peyniri satın al — <b>${q.data.need} birim</b>. Fiyat tavan yapsın, halkı homurdansın.
                Kışın kimin ambarı doluysa savaşı o kazanır."`}`;
        },
        desc(q) { return T`<b>${T(q.data.locName)}</b> pazarından peynir al — <b>${q.data.got}/${q.data.need}</b> birim (başka şehirde alınanı saymaz)`; },
        where(q) { return q.data.locId; },
        on(q, ev, d) {
            if(ev === 'bought_item' && d.locId === q.data.locId && d.itemId === 'cheese') {
                q.data.got += d.qty;
                if(q.data.got >= q.data.need) return 'done';
            }
        }
    },

    // 2 — Use the promotion tree
    sergeant_exam: {
        title: 'Çavuşluk Sınavı',
        givers: ['martial'],
        minRelation: 10,
        days: 30,
        reward: { money: 1200, renown: 15, rel: 15 },
        setup(q, giver) { q.data = { need: 5, locId: giver.homeLocId }; },
        offer(q) {
            return `${T`"Bana asker getirme; asker herkeste var. Bana <b>çavuş</b> getir.<br><br>
                Kendi elinle terfi ettirdiğin, seviyesi <b>20'nin üstünde ${q.data.need} adam</b> ile kapıma gel.
                Getiremezsen bir daha komutanlıktan bahsetme."`}`;
        },
        desc(q) {
            let n = state.player.party.filter(t => t.level >= 20).length;
            return T`Grubunda <b>${n}/${q.data.need}</b> asker 20. seviyeyi geçti — hepsi yanındayken
                ${T(Nobles.lord(q.giverId).name)}'ın salonuna gir (asker savaşta ve antrenmanda seviye atlar)`;
        },
        where(q) { return q.data.locId; },
        on(q, ev, d) {
            if(ev === 'entered_location' && d.locId === q.data.locId) {
                if(state.player.party.filter(t => t.level >= 20).length >= q.data.need) return 'done';
            }
        }
    },

    // 4 — Carry food while your own army eats it
    hungry_army: {
        title: 'Aç Ordu',
        givers: ['goodnatured', 'martial'],
        minRelation: 0,
        days: 12,
        reward: { money: 1000, renown: 6, rel: 18 },
        setup(q, giver) {
            let vils = LOCATIONS.filter(l => l.faction === giver.faction && l.type === 'village');
            let v = vils[Math.floor(Math.random() * vils.length)] || LOCATIONS[0];
            q.data = { locId: v.id, locName: v.name, need: 20 };
        },
        offer(q) {
            return `${T`"${q.data.locName} kışı çıkaramaz. <b>${q.data.need} birim yemek</b> lazım, buğday olur, ekmek olur.<br><br>
                Ama dikkat et: kendi adamların da o yükten yiyecek. Ne kadar kalabalıksan o kadar zor.
                Erzağı bozdurmadan götürebilirsen köy senin adını anar."`}`;
        },
        desc(q) {
            let f = Quests.foodCount();
            return T`<b>${T(q.data.locName)}</b> köyüne gir, çantanda <b>${f}/${q.data.need}</b> birim yemek olsun
                (buğday/ekmek/et/peynir sayılır; grubun her gün yediği için erken varmak iyidir)`;
        },
        where(q) { return q.data.locId; },
        on(q, ev, d) {
            if(ev === 'entered_location' && d.locId === q.data.locId) {
                if(Quests.foodCount() >= q.data.need) {
                    Quests.takeFood(q.data.need);
                    return 'done';
                }
                alert(T`Köy meydanında çuvalları saydılar. Yetmiyor. (${Quests.foodCount()}/${q.data.need})`);
            }
        }
    },

    // 5 — A quest with two solutions: win, or get captured on purpose
    brother_in_chains: {
        title: 'Zincirdeki Kardeş',
        givers: ['quarrelsome', 'martial', 'goodnatured'],
        minRelation: 15,
        days: 25,
        reward: { money: 800, renown: 15, rel: 15 },
        setup(q, giver) {
            let b = state.npcParties.filter(n => n.type === 'bandit').sort((a, b) => b.size - a.size)[0];
            q.data = { npcId: b ? b.id : null, npcName: b ? b.name : 'Çapulcular' };
        },
        offer(q) {
            return `${T`"Kardeşimi çapulcular kaçırdı. Zindanları nerede bilmiyorum.<br><br>
                İki yolu var: o çeteyi bulup <b>kılıçtan geçirirsin</b> — ya da kendini
                <b>bilerek onlara esir düşürüp</b> içeriden çıkarırsın. İkincisi daha çok işime gelir,
                çünkü içeriyi görmüş olursun. Ama ölürsen kimseye bir faydan olmaz."`}`;
        },
        desc(q) { return T`Haritada <b>${T(q.data.npcName)}</b> çetesini bul ve yen — <i>ya da</i> savaşı kaybedip
            esir düş, sonra zindandan kaç (kaçış daha çok ödül getirir). Aşağıdaki yer çetenin
            <b>şu an dolaştığı</b> civardır; çete gezer, işaret de onunla kayar`; },
        // Searching a 9000-unit continent for a roaming band was hopeless: your view
        // is 1% of the map. A rumor is given instead — the location the band is
        // *currently* closest to. As the band moves the pin moves with it, so you're
        // tracking a trail, not being handed an address.
        where(q) {
            let b = state.npcParties.find(n => n.id === q.data.npcId && n.size > 0);
            if(!b) return null;
            let near = LOCATIONS.slice().sort((x, y) => Game.dist(x, b) - Game.dist(y, b))[0];
            return near ? near.id : null;
        },
        on(q, ev, d) {
            // Any bandit-gang win counts, not just the one exact party snapshotted at setup()
            // (#132 report: "found the bandit gang but the quest didn't complete") — the
            // tracked party can be wiped and silently replaced by a same-looking, different-id
            // respawn (banditTick + bandRefillTick) before the player gets there, and nothing
            // in the UI distinguishes "the" tracked gang from any other bandit party anyway.
            // Looked up fresh here since Quests.emit() runs before the just-beaten party is
            // removed from state.npcParties.
            if(ev === 'battle_won') {
                let beaten = state.npcParties.find(n => n.id === d.npcId);
                if(beaten && beaten.type === 'bandit') return 'done';
            }
            if(ev === 'escaped_captivity' && d.npcId === q.data.npcId) {
                q.bonus = true;
                return 'done';
            }
        },
        onDone(q) {
            if(q.bonus) {
                Nobles.addRel(q.giverId, 10);
                state.player.renown += 15;
                alert(T('Zindandan kardeşiyle beraber çıktın. Lord bunu ömrü boyunca unutmayacak.\n(+10 ekstra ilişki, +15 ekstra nam)'));
            }
        }
    },

    // 6 — Manage to lose
    fixed_match: {
        title: 'Şike',
        givers: ['cunning', 'debauched'],
        minRelation: 20,
        days: 20,
        reward: { money: 2500, renown: -15, rel: 20 },
        setup(q) { q.data = { lo: 1, hi: 2 }; },   // rounds survived — the bracket has no score (#122)
        offer(q) {
            return `${T`"Bir turnuvaya gireceksin. Kazanmayacaksın.<br><br>
                Ama rezil de olmayacaksın — <b>${q.data.lo} ile ${q.data.hi} arası</b> tur kazanıp eleneceksin.
                Bahisçiler tam oraya oynadı. İlk turda düşersen şüphelenirler, kazanırsan iflas ederim.<br><br>
                Kesen dolacak, adın biraz kirlenecek. Karar senin."`}`;
        },
        desc(q) { return T`Bir şehirde denk geldiğin turnuvaya gir, <b>${q.data.lo}-${q.data.hi}</b> tur kazan ve elen.
            Kazanırsan da ilk turda elenirsen de görev yanar.`; },
        on(q, ev, d) {
            if(ev === 'tournament_end') {
                if(!d.won && d.wins >= q.data.lo && d.wins <= q.data.hi) return 'done';
                return 'fail';
            }
        }
    },

    // 7 — Spread false information
    false_news: {
        title: 'Yalan Haber',
        givers: ['cunning'],
        minRelation: 25,
        days: 18,
        reward: { money: 1400, renown: 5, rel: 20 },
        setup(q, giver) {
            let pool = LORDS.filter(l => l.faction !== giver.faction);
            let t = pool[Math.floor(Math.random() * pool.length)];
            let targets = LORDS.filter(l => l.faction === t.faction && l.id !== t.id).slice(0, 3);
            q.data = { about: t.id, aboutName: t.name, faction: t.faction, told: [], need: Math.max(2, targets.length) };
        },
        offer(q) {
            return `${T`"${q.data.aboutName} sınırda dolaşıyor. Nerede olduğunu ben biliyorum. Onun adamları bilmiyor.<br><br>
                Git, kendi krallığından <b>${q.data.need} lorda</b> onu yanlış yerde gördüğünü söyle.
                Ordularını boş ovaya yürütsünler.<br><br>
                Bir uyarı: yalan dolaşır. Bir süre sonra sana da yalan söylemeye başlarlar."`}`;
        },
        desc(q) { return T`${T(FACTIONS[q.data.faction] ? FACTIONS[q.data.faction].name : '?')} lordlarıyla salonlarında konuş ve
            <b>${T(q.data.aboutName)}</b> hakkındaki yalanı yay — <b>${q.data.told.length}/${q.data.need}</b> lord`; },
        where(q) { return Quests.nearestSeat(l => l.faction === q.data.faction && !q.data.told.includes(l.id) && l.id !== q.data.about); },
        on(q, ev, d) {
            if(ev === 'talked_to') {
                let l = Nobles.lord(d.lordId);
                let about = Nobles.lord(q.data.about);
                if(l && about && l.faction === about.faction && l.id !== about.id && !q.data.told.includes(l.id)) {
                    q.data.told.push(l.id);
                    Nobles.addRel(l.id, -3);
                    alert(T`${T(l.name)}'a ${T(about.name)}'ı yanlış yerde gördüğünü söyledin. İnandı.\n(${q.data.told.length}/${q.data.need})`);
                    if(q.data.told.length >= q.data.need) return 'done';
                }
            }
        },
        onDone(q) {
            let about = Nobles.lord(q.data.about);
            q.data.told.forEach(id => Nobles.addRel(id, -8));
            state.liars = { until: state.time.day + 5, faction: about.faction };
            alert(T`Yalan tuttu. Ama artık ${T(FACTIONS[about.faction].name)} lordları da sana doğruyu söylemiyor (5 gün).`);
        }
    },

    // 8 — Crazy Hüsnü's chickens (short-timer minigame variant)
    crazy_chickens: {
        title: 'Deli Hüsnü\'nün Tavukları',
        givers: ['goodnatured', 'quarrelsome', 'debauched'],
        minRelation: -10,
        days: 10,
        reward: { money: 700, renown: 6, rel: 8 },   // 25 seconds of chasing, not 15 (#123)
        setup(q, giver) { q.data = { locId: giver.homeLocId, done: false }; },
        offer(q) {
            return `${T`"Aşçım Deli Hüsnü kümesin kapısını açık bırakmış. Yirmi tavuk kaleye dağıldı.<br><br>
                Bak, bunu adamlarıma yaptıramam — bütün kale bana güler.
                Sen bir yabancısın, senin şerefin buna dayanır. <b>25 saniyen var, 16 tavuk yakala.
                Kazlara dokunma, onlar Hüsnü'nün değil.`}</b>"`;
        },
        desc(q) { return T`<b>${Quests.locName(q.data.locId)}</b>'a gir ve avluda tavuk kovala — 25 saniyede 16 tavuk.
            Mavi olanlar kaz, onları yakalarsan bir tavuk kaybedersin.
            Kaçırırsan süre dolana kadar yeniden deneyebilirsin.`; },
        where(q) { return q.data.locId; },
        on(q, ev, d) {
            if(ev === 'chickens_caught' && d.won) return 'done';
            if(ev === 'chickens_caught') alert(T('Tavuklar kazandı. Tekrar dene.'));
        }
    },

    // 9 — Defend the village
    harvest_watch: {
        title: 'Hasat Nöbeti',
        givers: ['martial', 'goodnatured'],
        minRelation: 0,
        days: 14,
        reward: { money: 1100, renown: 12, rel: 14 },
        setup(q, giver) {
            let vils = LOCATIONS.filter(l => l.faction === giver.faction && l.type === 'village');
            let v = vils[Math.floor(Math.random() * vils.length)] || LOCATIONS[0];
            q.data = { locId: v.id, locName: v.name, waves: 0, need: 2, spawned: false };
        },
        offer(q) {
            return `${T`"Hasat başlıyor, çapulcular da bunu biliyor. ${q.data.locName} köyünün yanında bekle.<br><br>
                <b>İki dalga</b> gelecek. İkisini de kır. Köylüler bir gün bile durmadan biçecek."`}`;
        },
        // The 500-unit gate in day() is invisible: out of range looks exactly like being
        // in range and rolling badly, so a player who wandered off had no way to tell they
        // were doing it wrong (#94). The treasure hunt above solves the same problem with
        // its hot/cold scale. Only shown once the quest is taken — at offer time, standing
        // in a lord's hall, "too far" is the normal state and would read as a warning.
        desc(q) {
            let v = LOCATIONS.find(l => l.id === q.data.locId);
            let watch = state.player.quests.includes(q) && v
                ? '<br>' + (Game.dist(state.player, v) <= 500
                    ? T`✅ <b>Nöbettesin</b> — her gün gelebilirler.`
                    : T`❌ <b>Nöbet yerinden uzaktasın</b> — sen dönene kadar kimse gelmez.`)
                : '';
            return T`<b>${T(q.data.locName)}</b> köyünün yakınında (yarım günlük mesafede) bekle;
                çapulcular gelince savaş — <b>${q.data.waves}/${q.data.need}</b> dalga püskürtüldü` + watch;
        },
        where(q) { return q.data.locId; },
        day(q) {
            let v = LOCATIONS.find(l => l.id === q.data.locId);
            if(Game.dist(state.player, v) > 500) return;
            if(Math.random() < 0.5) {
                // Two waves already make this an endurance job. Keep each one below a
                // normal roaming warband so an early company can realistically defend it.
                let n = Game.createNPC(T('Hasat Çapulcuları'), 'bandit', 5 + Math.floor(Math.random() * 8), '#8b0000');
                n.x = v.x + (Math.random() - 0.5) * 300;
                n.y = v.y + (Math.random() - 0.5) * 300;
                n.targetX = state.player.x; n.targetY = state.player.y;
                n.questWave = q.id;
                state.npcParties.push(n);
                alert(T`${q.data.locName} tarafından toz bulutu yükseliyor. Geliyorlar!`);
            }
        },
        on(q, ev, d) {
            if(ev === 'battle_won' && d.questWave === q.id) {
                q.data.waves++;
                if(q.data.waves >= q.data.need) return 'done';
                alert(T`Bir dalga püskürtüldü (${q.data.waves}/2). Nöbete devam.`);
            }
        }
    },

    // 10 — The lost letter
    lost_letter: {
        title: 'Kayıp Mektup',
        givers: ['cunning', 'goodnatured'],
        minRelation: 5,
        days: 16,
        reward: { money: 850, renown: 7, rel: 12 },
        setup(q, giver) {
            let vils = LOCATIONS.filter(l => l.type === 'village');
            let v = vils[Math.floor(Math.random() * vils.length)];
            let pool = LORDS.filter(l => l.id !== giver.id && l.faction === giver.faction);
            let to = pool[Math.floor(Math.random() * pool.length)] || LORDS[0];
            q.data = { pickLoc: v.id, pickName: v.name, toId: to.id, toName: to.name, has: false };
        },
        offer(q) {
            return `${T`"Bir ulağım ${q.data.pickName} köyünde kayboldu. Üstünde mühürlü bir mektup vardı.<br><br>
                Köye git, mektubu bul, <b>${q.data.toName}</b>'a ulaştır.<br>
                Mühür kırılırsa anlarım. Merakını yenemezsen de anlarım."`}`;
        },
        desc(q) {
            return q.data.has
                ? T`Mektup çantanda — <b>${T(q.data.toName)}</b>'a ulaştır; onu ancak kendi salonundayken bulursun`
                : T`<b>${T(q.data.pickName)}</b> köyüne gir ve mektubu bul, sonra <b>${T(q.data.toName)}</b>'a götür`;
        },
        where(q) { return q.data.has ? Quests.lordSeat(q.data.toId) : q.data.pickLoc; },
        on(q, ev, d) {
            if(ev !== 'entered_location') return;
            if(!q.data.has && d.locId === q.data.pickLoc) {
                q.data.has = true;
                alert(T('Köy çeşmesinin arkasında, çamura yarı gömülü bir çanta. Mühür sağlam.'));
                Quests.render();
                return;
            }
            if(q.data.has && Nobles.isAt(q.data.toId, d.locId)) return 'done';
        }
    },

    // 11 — Learn a poem from a bard
    bring_poem: {
        title: 'Bir Şiir Getir',
        givers: ['debauched', 'goodnatured'],
        minRelation: 0,
        days: 20,
        reward: { money: 600, renown: 5, rel: 16 },
        setup(q) { q.data = {}; },
        offer(q) {
            return `${T`"Yarın ziyafet var ve hiç kimsenin ezberinde tek bir dize yok.<br><br>
                Bir şehrin hanına git, ozanı bul, ondan bir şiir öğren. Sonra gelip bana oku.
                Kötüyse, öğrendiğini bana okumadan önce iyi düşün."`}`;
        },
        desc(q) { return T`Bir şehrin hanında ozandan şiir öğren (dinar ister), sonra ${T(Nobles.lord(q.giverId).name)}'ın
            salonuna dön ve <b>🎵 Öğrendiğin şiiri oku</b> de`; },
        where(q) { return Quests.lordSeat(q.giverId); },
        on(q, ev, d) {
            if(ev === 'poem_recited_lord' && d.lordId === q.giverId) return 'done';
        }
    },

    // 12 — The winning side of the arena (the mirror image of the fixed match)
    arena_champion: {
        title: 'Arena Şampiyonu',
        givers: ['martial', 'quarrelsome'],
        minRelation: 10,
        days: 25,
        reward: { money: 1600, renown: 20, rel: 14 },
        setup(q) { q.data = {}; },
        offer(q) {
            return `${T`"Kılıç kullandığını söylüyorlar. Söylenti ucuzdur, arena değil.<br><br>
                Turnuva nerede kuruluysa oraya git ve <b>kazan</b>. Hangi şehir olduğu umurumda değil.
                Elenirsen bir sonrakine girersin — ama süre işliyor."`}`;
        },
        desc(q) { return T`Bir şehirde denk geldiğin turnuvaya gir ve turnuvayı kazan
            (elenirsen bir sonraki turnuvada yeniden denersin)`; },
        on(q, ev, d) { if(ev === 'tournament_end' && d.won) return 'done'; }
    },

    // 13 — Use the sword without killing: bring prisoners
    chain_market: {
        title: 'Zincir Pazarı',
        givers: ['cunning', 'debauched', 'quarrelsome'],
        minRelation: 5,
        days: 18,
        reward: { money: 1500, renown: 6, rel: 12 },
        setup(q, giver) { q.data = { locId: giver.homeLocId, need: 4 }; },
        offer(q) {
            return `${T`"Duvarım var, hendeğim var, kazacak adamım yok.<br><br>
                Bana <b>${q.data.need} esir</b> getir — soylu değil, sıradan adam. Savaşı kazandıktan sonra
                sağ kalanları zincire vurursan olur. Nereden bulduğun benim işim değil."`}`;
        },
        desc(q) { return T`Savaş kazanıp esir al, sonra <b>${Quests.locName(q.data.locId)}</b>'a gir —
            yanında <b>${Quests.prisonerCount()}/${q.data.need}</b> sıradan esir olmalı (soylular sayılmaz)`; },
        where(q) { return q.data.locId; },
        on(q, ev, d) {
            if(ev !== 'entered_location' || d.locId !== q.data.locId) return;
            if(Quests.prisonerCount() < q.data.need) return;
            Quests.takePrisoners(q.data.need);
            return 'done';
        }
    },

    // 14 — Earn money by burning your honor: raid an enemy village
    dawn_raid: {
        title: 'Şafak Baskını',
        givers: ['quarrelsome', 'cunning'],
        minRelation: 20,
        days: 15,
        reward: { money: 1800, renown: -8, rel: 22 },
        // No war, no quest: burning a village at peace would put the player at war
        // with their own kingdom, and the lord doesn't want that either.
        can(giver) { return QUESTS.dawn_raid.foes(giver).length > 0; },
        foes(giver) {
            return LOCATIONS.filter(l => l.type === 'village' && l.faction && l.faction !== giver.faction
                && Game.atWar(l.faction, giver.faction));
        },
        setup(q, giver) {
            let vils = QUESTS.dawn_raid.foes(giver);
            let v = vils[Math.floor(Math.random() * vils.length)];
            q.data = { locId: v.id, locName: v.name };
        },
        offer(q) {
            return `${T`"${q.data.locName}'ın ambarı düşmanın ordusunu besliyor. O ambar yanarsa cephe de söner.<br><br>
                Git ve <b>köyü yağmala</b>. Dumanı görüp yetişen olursa kılıcını çekersin.
                Peşin söyleyeyim: bu iş namını lekeler, kesemi değil."`}`;
        },
        desc(q) { return T`<b>${T(q.data.locName)}</b> köyüne gir, <b>🔥 Köyü Yağmala</b> de ve sayaç dolana kadar dayan
            (yakındaki lordlar dumanı görüp üstüne gelir; namın düşer)`; },
        where(q) { return q.data.locId; },
        on(q, ev, d) { if(ev === 'raided' && d.locId === q.data.locId) return 'done'; }
    }
};

// --- GUILD QUESTS (giver: 'guild_<locId>') ---
QUESTS.caravan_escort = {
    title: 'Kervan Yolu Temizliği',
    givers: ['guild'],
    minRelation: -100,
    days: 12,
    reward: { money: 1400, renown: 8, rel: 0 },
    setup(q, giver) {
        let others = LOCATIONS.filter(l => l.type === 'city' && l.id !== giver.homeLocId);
        let c = others[Math.floor(Math.random() * others.length)];
        q.data = { locId: c.id, locName: c.name, need: 2, got: 0 };
    },
    offer(q) {
        return `${T`"Kervanımız <b>${q.data.locName}</b>'a gidecek ama yol çapulcu kaynıyor. Muhafız tutmak pahalı, tabut daha pahalı.<br><br>
            Sen önden git: <b>${q.data.need} çapulcu grubunu</b> dağıt, sonra ${q.data.locName}'a var ve oradaki adamımıza haber ver.
            Lonca borcunu unutmaz."`}`;
    },
    desc(q) {
        return q.data.got >= q.data.need
            ? T`Yol temiz — şimdi <b>${T(q.data.locName)}</b>'a gir ve loncanın adamına haber ver`
            : T`Haritada çapulcu grubu bul ve dağıt — <b>${q.data.got}/${q.data.need}</b>, sonra <b>${T(q.data.locName)}</b>'a git`;
    },
    where(q) { return q.data.got >= q.data.need ? q.data.locId : null; },
    on(q, ev, d) {
        if(ev === 'battle_won' && !d.lordId && q.data.got < q.data.need) q.data.got++;
        if(ev === 'entered_location' && d.locId === q.data.locId && q.data.got >= q.data.need) return 'done';
    }
};

QUESTS.guild_supply = {
    title: 'Lonca Siparişi',
    givers: ['guild'],
    minRelation: -100,
    days: 15,
    reward: { money: 900, renown: 5, rel: 0 },
    setup(q, giver) {
        let goods = ['iron', 'salt', 'velvet', 'ale'];
        let item = goods[Math.floor(Math.random() * goods.length)];
        let loc = LOCATIONS.find(l => l.id === giver.homeLocId);
        q.data = { locId: giver.homeLocId, locName: loc ? loc.name : '?', item, itemName: ITEMS[item].name, need: 10 };
    },
    offer(q) {
        return `${T`"Atölyeler <b>${q.data.itemName}</b> bekliyor, tedarikçim iki haftadır ortada yok.<br><br>
            <b>${q.data.need} birim ${q.data.itemName}</b> bul, ${q.data.locName}'a getir. Nereden bulduğun beni ilgilendirmez —
            loncanın defterinde sadece rakamlar var."`}`;
    },
    desc(q) {
        let inv = state.player.inventory.find(i => i.id === q.data.item);
        return T`<b>${T(q.data.locName)}</b>'a gir, çantanda <b>${inv ? inv.qty : 0}/${q.data.need}</b> birim
            ${T(q.data.itemName)} olsun (herhangi bir şehrin pazarından alınır)`;
    },
    where(q) { return q.data.locId; },
    on(q, ev, d) {
        if(ev !== 'entered_location' || d.locId !== q.data.locId) return;
        let idx = state.player.inventory.findIndex(i => i.id === q.data.item && i.qty >= q.data.need);
        if(idx === -1) return;
        let it = state.player.inventory[idx];
        it.qty -= q.data.need;
        if(it.qty <= 0) state.player.inventory.splice(idx, 1);
        return 'done';
    }
};

// Lair quest (#68). The guild master *knows* the lair — it's their own caravans
// being robbed. That's the quest's real value: a lair isn't drawn on the map until
// it's in view range, but the master names its spot and pins it. What's left to
// you is the raid, not the search.
QUESTS.clear_lair = {
    title: 'İni Bas',
    givers: ['guild'],
    minRelation: -100,
    days: 20,
    reward: { money: 1600, renown: 10, rel: 0 },
    can(giver) { return Game.lairs().length > 0; },
    setup(q, giver) {
        let ev = LOCATIONS.find(l => l.id === giver.homeLocId) || { x: 4500, y: 4500 };
        let l = Game.lairs().slice().sort((a, b) => Game.dist(a, ev) - Game.dist(b, ev))[0];
        l.seen = true;                       // what the master knows, you now know too
        q.data = { lairId: l.id, power: Math.round(l.strength) };
    },
    offer(q) {
        return `${T`"Kervanlarım <b>üç haftadır</b> aynı yerde soyuluyor. Adamlarımı takip ettirdim:
            kayaların arasında bir in var, kabaca <b>${q.data.power} kişi</b>.<br><br>
            Yerini haritana işaretledim. Git, dağıt. Ne bulursan senin — ben sadece yolun açılmasını istiyorum."`}`;
    },
    desc(q) {
        let l = Game.lairs().find(x => x.id === q.data.lairId);
        return l ? T`Haritada ☠️ <b>Haydut İni</b>ni bul ve bas — usta yerini işaretledi, ikon artık haritada`
                 : T('İn dağıtıldı — loncaya haber ver.');
    },
    // Single source for "where": the location the lair is currently closest to.
    // A lair doesn't move, so the pin is fixed; the real marker is the map icon itself.
    where(q) {
        let l = Game.lairs().find(x => x.id === q.data.lairId);
        if(!l) return null;
        let near = LOCATIONS.slice().sort((x, y) => Game.dist(x, l) - Game.dist(y, l))[0];
        return near ? near.id : null;
    },
    on(q, ev, d) {
        if(ev === 'lair_cleared' && d.lairId === q.data.lairId) return 'done';
    }
};

// --- EXTRA CONTRACTS (#129) ---
// These use events already emitted by the real game. They add variety without creating
// quest-only buttons or invisible counters that the rest of the world cannot satisfy.
QUESTS.royal_courier = {
    title: 'Mühürlü Ferman', givers: [], minRelation: 0, days: 12,
    reward: { money: 750, renown: 5, rel: 9 },
    setup(q, giver) {
        let pool = LOCATIONS.filter(l => l.type === 'city' && l.id !== giver.homeLocId);
        let to = pool[Math.floor(Math.random() * pool.length)];
        q.data = { locId: to.id, locName: to.name };
    },
    offer(q) { return T`Bu mühürlü fermanı <b>${T(q.data.locName)}</b> kapısındaki kumandana götür. Mührü kırma, oyalanma.`; },
    desc(q) { return T`<b>${T(q.data.locName)}</b> şehrine gir ve mühürlü fermanı teslim et.`; },
    where(q) { return q.data.locId; },
    on(q, ev, d) { if(ev === 'entered_location' && d.locId === q.data.locId) return 'done'; }
};

QUESTS.border_inspection = {
    title: 'Sınır Teftişi', givers: ['martial', 'cunning'], minRelation: 5, days: 18,
    reward: { money: 1050, renown: 9, rel: 11 },
    setup(q, giver) {
        let pool = LOCATIONS.filter(l => l.faction === giver.faction && l.id !== giver.homeLocId);
        q.data = { stops: pool.sort(() => Math.random() - 0.5).slice(0, 3).map(l => l.id), visited: [] };
    },
    offer(q) { return T`Sınırdaki üç yerleşimi dolaş. Garnizonları say, yolların açık olup olmadığını bana bildir.`; },
    desc(q) { return T`İşaretli yerleşimleri ziyaret et — <b>${q.data.visited.length}/${q.data.stops.length}</b> teftiş tamamlandı.`; },
    where(q) { return q.data.stops.find(id => !q.data.visited.includes(id)); },
    on(q, ev, d) {
        if(ev === 'entered_location' && q.data.stops.includes(d.locId) && !q.data.visited.includes(d.locId)) q.data.visited.push(d.locId);
        if(q.data.visited.length >= q.data.stops.length) return 'done';
    }
};

QUESTS.grain_levy = {
    title: 'Tahıl Vergisi', givers: ['martial', 'quarrelsome'], minRelation: 0, days: 14,
    reward: { money: 950, renown: 6, rel: 10 },
    setup(q, giver) { q.data = { locId: giver.homeLocId, need: 18, got: 0 }; },
    offer(q) { return T`Ordu ambarı boş. Pazarlardan <b>${q.data.need} çuval buğday</b> topla ve kapıma getir.`; },
    desc(q) { return T`Buğday satın al — <b>${q.data.got}/${q.data.need}</b>; yeterince topladığında görevi veren lordun salonuna dön.`; },
    where(q) { return q.data.got >= q.data.need ? q.data.locId : null; },
    on(q, ev, d) {
        if(ev === 'bought_item' && d.itemId === 'wheat') q.data.got += d.qty;
        if(ev === 'entered_location' && d.locId === q.data.locId && q.data.got >= q.data.need) return 'done';
    }
};

QUESTS.ale_for_feast = {
    title: 'Şölen Fıçıları', givers: ['debauched', 'goodnatured'], minRelation: 0, days: 12,
    reward: { money: 850, renown: 4, rel: 12 },
    setup(q, giver) { q.data = { locId: giver.homeLocId, need: 12 }; },
    offer(q) { return T`Mahzende tek damla kalmadı. <b>${q.data.need} fıçı bira</b> bulup salonuma getir.`; },
    desc(q) {
        let n = (state.player.inventory.find(i => i.id === 'ale') || {}).qty || 0;
        return T`Çantanda <b>${n}/${q.data.need}</b> bira olsun ve görevi veren lordun salonuna dön.`;
    },
    where(q) { return q.data.locId; },
    on(q, ev, d) {
        if(ev !== 'entered_location' || d.locId !== q.data.locId) return;
        let i = state.player.inventory.find(x => x.id === 'ale' && x.qty >= q.data.need);
        if(!i) return; i.qty -= q.data.need; return 'done';
    }
};

QUESTS.ransom_column = {
    title: 'Esir Kafilesi', givers: ['cunning', 'quarrelsome'], minRelation: 10, days: 18,
    reward: { money: 1300, renown: 8, rel: 13 },
    setup(q, giver) { q.data = { locId: giver.homeLocId, need: 5 }; },
    offer(q) { return T`Pazarlık için canlı adamlara ihtiyacım var. Soylu olmayan <b>${q.data.need} esir</b> getir.`; },
    desc(q) { return T`Soylu olmayan esirleri lordun salonuna getir — <b>${Quests.prisonerCount()}/${q.data.need}</b>.`; },
    where(q) { return q.data.locId; },
    on(q, ev, d) {
        if(ev !== 'entered_location' || d.locId !== q.data.locId || Quests.prisonerCount() < q.data.need) return;
        Quests.takePrisoners(q.data.need); return 'done';
    }
};

QUESTS.bandit_bounty = {
    title: 'Üç Çete', givers: ['martial', 'goodnatured', 'guild'], minRelation: -100, days: 20,
    reward: { money: 1450, renown: 12, rel: 12 },
    setup(q) { q.data = { got: 0, need: 3 }; },
    offer(q) { return T`Yolları tutan <b>${q.data.need} ayrı haydut çetesini</b> dağıt. Hangi bayrağı taşıdıkları önemli değil.`; },
    desc(q) { return T`Haritada haydut veya çapulcu gruplarını yen — <b>${q.data.got}/${q.data.need}</b>.`; },
    on(q, ev, d) {
        if(ev === 'battle_won' && !d.lordId && !d.questWave) q.data.got++;
        if(q.data.got >= q.data.need) return 'done';
    }
};

QUESTS.veteran_guard = {
    title: 'Kıdemli Muhafızlar', givers: ['martial'], minRelation: 15, days: 25,
    reward: { money: 1500, renown: 14, rel: 14 },
    setup(q, giver) { q.data = { locId: giver.homeLocId, need: 8, level: 15 }; },
    offer(q) { return T`Acemiler değil, savaş görmüş adamlar istiyorum. En az ${q.data.level}. seviyede <b>${q.data.need} askerle</b> gel.`; },
    desc(q) {
        let n = state.player.party.filter(t => t.level >= q.data.level).length;
        return T`En az ${q.data.level}. seviyede asker yetiştir — <b>${n}/${q.data.need}</b>; sonra lordun salonuna dön.`;
    },
    where(q) { return q.data.locId; },
    on(q, ev, d) {
        if(ev === 'entered_location' && d.locId === q.data.locId && state.player.party.filter(t => t.level >= q.data.level).length >= q.data.need) return 'done';
    }
};

QUESTS.enemy_scout = {
    title: 'Düşman Kapıları', givers: ['cunning', 'martial'], minRelation: 10, days: 18,
    reward: { money: 1100, renown: 10, rel: 12 },
    setup(q, giver) {
        let pool = LOCATIONS.filter(l => l.type === 'city' && l.faction !== giver.faction);
        q.data = { stops: pool.sort(() => Math.random() - 0.5).slice(0, 2).map(l => l.id), visited: [] };
    },
    offer(q) { return T`İki yabancı şehrin kapısına kadar git. Nöbet düzenlerini gör ve sağ dön.`; },
    desc(q) { return T`İşaretli yabancı şehirleri ziyaret et — <b>${q.data.visited.length}/${q.data.stops.length}</b>.`; },
    where(q) { return q.data.stops.find(id => !q.data.visited.includes(id)); },
    on(q, ev, d) {
        if(ev === 'entered_location' && q.data.stops.includes(d.locId) && !q.data.visited.includes(d.locId)) q.data.visited.push(d.locId);
        if(q.data.visited.length >= q.data.stops.length) return 'done';
    }
};

QUESTS.diplomatic_round = {
    title: 'Nabız Yoklama', givers: ['cunning', 'goodnatured'], minRelation: 15, days: 20,
    reward: { money: 1000, renown: 8, rel: 15 },
    setup(q, giver) {
        let pool = LORDS.filter(l => l.id !== giver.id && l.faction !== giver.faction);
        q.data = { lords: pool.sort(() => Math.random() - 0.5).slice(0, 2).map(l => l.id), talked: [] };
    },
    offer(q) { return T`İki yabancı lordla konuş. Savaşa mı barışa mı yakın olduklarını öğren; söz verme.`; },
    desc(q) { return T`Belirlenen yabancı lordlarla konuş — <b>${q.data.talked.length}/${q.data.lords.length}</b>.`; },
    where(q) { let id = q.data.lords.find(x => !q.data.talked.includes(x)); return id ? Quests.lordSeat(id) : null; },
    on(q, ev, d) {
        if(ev === 'talked_to' && q.data.lords.includes(d.lordId) && !q.data.talked.includes(d.lordId)) q.data.talked.push(d.lordId);
        if(q.data.talked.length >= q.data.lords.length) return 'done';
    }
};

QUESTS.market_sampler = {
    title: 'Pazar Defteri', givers: ['guild'], minRelation: -100, days: 16,
    reward: { money: 1000, renown: 6, rel: 0 },
    setup(q, giver) { q.data = { home: giver.homeLocId, cities: [], need: 3 }; },
    offer(q) { return T`Üç farklı şehir pazarında alışveriş yap. Fiyatları deftere geçirip bana dön.`; },
    desc(q) { return T`Farklı şehirlerde birer mal satın al — <b>${q.data.cities.length}/${q.data.need}</b>; sonra loncaya dön.`; },
    where(q) { return q.data.cities.length >= q.data.need ? q.data.home : null; },
    on(q, ev, d) {
        if(ev === 'bought_item' && d.locId && !q.data.cities.includes(d.locId)) q.data.cities.push(d.locId);
        if(ev === 'entered_location' && d.locId === q.data.home && q.data.cities.length >= q.data.need) return 'done';
    }
};

QUESTS.salt_run = {
    title: 'Tuz Yolu', givers: ['guild'], minRelation: -100, days: 14,
    reward: { money: 1150, renown: 5, rel: 0 },
    setup(q, giver) { q.data = { home: giver.homeLocId, need: 14, got: 0 }; },
    offer(q) { return T`Kışlık etler bozulmadan <b>${q.data.need} yük tuz</b> satın alıp loncaya getir.`; },
    desc(q) { return T`Pazarlardan tuz satın al — <b>${q.data.got}/${q.data.need}</b>; sonra loncaya dön.`; },
    where(q) { return q.data.got >= q.data.need ? q.data.home : null; },
    on(q, ev, d) {
        if(ev === 'bought_item' && d.itemId === 'salt') q.data.got += d.qty;
        if(ev === 'entered_location' && d.locId === q.data.home && q.data.got >= q.data.need) return 'done';
    }
};

QUESTS.war_chest = {
    title: 'Savaş Sandığı', givers: ['martial', 'cunning'], minRelation: 20, days: 20,
    reward: { money: 400, renown: 15, rel: 20 },
    setup(q, giver) { q.data = { locId: giver.homeLocId, need: 1800 }; },
    offer(q) { return T`Sefer sandığı boş. <b>${q.data.need} dinar</b> topla ve salonuma getir; krallık katkını unutmaz.`; },
    desc(q) { return T`En az <b>${q.data.need} dinarla</b> görevi veren lordun salonuna dön (para teslimde alınır).`; },
    where(q) { return q.data.locId; },
    on(q, ev, d) {
        if(ev !== 'entered_location' || d.locId !== q.data.locId || state.player.money < q.data.need) return;
        state.player.money -= q.data.need; return 'done';
    }
};

// --- FIELD CONTRACTS (#106) — zamana karşı, eskort, casusluk, arabuluculuk,
// kurtarma, teslimat zinciri, av/toplama, savunma. Hepsi mevcut Quests.emit
// olaylarıyla ve state.player/state.npcParties üstünde çalışır; app.js'e yeni kanca eklenmedi.
QUESTS.fever_relief = {
    title: 'Ateşli Hastalık', givers: ['goodnatured', 'martial'], minRelation: 0, days: 6,
    reward: { money: 750, renown: 9, rel: 16 },
    setup(q, giver) {
        let vils = LOCATIONS.filter(l => l.faction === giver.faction && l.type === 'village');
        let v = vils[Math.floor(Math.random() * vils.length)] || LOCATIONS[0];
        q.data = { locId: v.id, locName: v.name, need: 8 };
    },
    offer(q) { return T`${q.data.locName}'da ateşli hastalık yayılıyor, ihtiyarlar bal ve kaynatılmış otla iyileşir derdi.
        <b>${q.data.need} birim bal</b> lazım — <b>altı gün</b> içinde ulaşmazsan geç kalırsın.`; },
    desc(q) {
        let n = (state.player.inventory.find(i => i.id === 'honey') || {}).qty || 0;
        return T`<b>${T(q.data.locName)}</b> köyüne <b>${n}/${q.data.need}</b> birim balla gir — süre kısa, oyalanma.`;
    },
    where(q) { return q.data.locId; },
    on(q, ev, d) {
        if(ev !== 'entered_location' || d.locId !== q.data.locId) return;
        let i = state.player.inventory.find(x => x.id === 'honey' && x.qty >= q.data.need);
        if(!i) { alert(T`Yeterince bal yok. (${(state.player.inventory.find(x => x.id === 'honey') || {}).qty || 0}/${q.data.need})`); return; }
        i.qty -= q.data.need; return 'done';
    }
};

QUESTS.lady_escort = {
    title: 'Tehlikeli Yolculuk', givers: ['martial', 'goodnatured'], minRelation: 10, days: 10,
    reward: { money: 1300, renown: 10, rel: 16 },
    setup(q, giver) {
        let pool = LOCATIONS.filter(l => l.faction === giver.faction && l.type === 'city' && l.id !== giver.homeLocId);
        let c = pool[Math.floor(Math.random() * pool.length)] || LOCATIONS[0];
        q.data = { locId: c.id, locName: c.name };
    },
    offer(q) { return T`Yeğenimi <b>${q.data.locName}</b>'a göndermem gerekiyor ama yollar çapulcu kaynıyor.
        Yanına birkaç muhafız takıyorum, sen önden git — kafile seni izleyecek, yol boyunca göz kulak ol.`; },
    desc(q) { return T`Kafileyle birlikte <b>${T(q.data.locName)}</b>'a sağ salim ulaş.`; },
    where(q) { return q.data.locId; },
    on(q, ev, d) { if(ev === 'entered_location' && d.locId === q.data.locId) return 'done'; }
};

QUESTS.enemy_muster = {
    title: 'Düşman Ordugâhı', givers: ['cunning', 'martial'], minRelation: 15, days: 14,
    reward: { money: 1350, renown: 14, rel: 12 },
    can(giver) { return QUESTS.enemy_muster.foes(giver).length > 0; },
    foes(giver) { return LOCATIONS.filter(l => l.type === 'city' && l.faction && l.faction !== giver.faction && Game.atWar(l.faction, giver.faction)); },
    setup(q, giver) {
        let pool = QUESTS.enemy_muster.foes(giver);
        let c = pool[Math.floor(Math.random() * pool.length)];
        q.data = { locId: c.id, locName: c.name };
    },
    offer(q) { return T`${q.data.locName} surlarının ardında ne kadar asker biriktirdiklerini bilmem lazım.
        Sokul, say, sıvış — ama yakalanırsan zindanı boylarsın, seni tanımam.`; },
    desc(q) { return T`<b>${T(q.data.locName)}</b> surlarına kadar sokul ve nöbeti gözle.`; },
    where(q) { return q.data.locId; },
    on(q, ev, d) { if(ev === 'entered_location' && d.locId === q.data.locId) return 'done'; }
};

QUESTS.border_dispute = {
    title: 'Sınır Anlaşmazlığı', givers: ['goodnatured', 'cunning'], minRelation: 15, days: 16,
    reward: { money: 1000, renown: 10, rel: 16 },
    setup(q, giver) {
        let pool = LORDS.filter(l => l.faction === giver.faction && l.id !== giver.id);
        let picks = pool.sort(() => Math.random() - 0.5).slice(0, 2).map(l => l.id);
        q.data = { lords: picks, talked: [] };
    },
    offer(q) { return T`İki komutanım aynı sınır kalesini kendi hakkı sanıyor, neredeyse birbirlerine kılıç çekecekler.
        Git, ikisini de dinle — kimin haklı olduğunu değil, ateşin nasıl söneceğini bul.`; },
    desc(q) { return T`Anlaşmazlıktaki iki lordu da ziyaret et ve dinle — <b>${q.data.talked.length}/${q.data.lords.length}</b>.`; },
    where(q) { let id = q.data.lords.find(x => !q.data.talked.includes(x)); return id ? Quests.lordSeat(id) : null; },
    on(q, ev, d) {
        if(ev === 'talked_to' && q.data.lords.includes(d.lordId) && !q.data.talked.includes(d.lordId)) q.data.talked.push(d.lordId);
        if(q.data.talked.length >= q.data.lords.length) return 'done';
    },
    onDone(q) { q.data.lords.forEach(id => Nobles.addRel(id, 3)); }
};

QUESTS.hostage_rescue = {
    title: 'Rehin Tüccar', givers: ['quarrelsome', 'goodnatured'], minRelation: 10, days: 20,
    reward: { money: 1200, renown: 10, rel: 16 },
    can() { return state.npcParties.some(n => n.type === 'bandit' && n.size > 0); },
    setup(q) {
        let bands = state.npcParties.filter(n => n.type === 'bandit' && n.size > 0);
        let b = bands[Math.floor(Math.random() * bands.length)];
        q.data = { npcId: b ? b.id : null, npcName: b ? b.name : T('Çapulcular') };
    },
    offer(q) { return T`Ortağım son kervanla yola çıktı, geri dönmedi. Çapulcular kaçırmış olmalı.
        Bul onları, ortağımı sağ getir.`; },
    desc(q) { return T`Haritada <b>${T(q.data.npcName)}</b> çetesini bul ve yen; aşağıdaki yer çetenin
        şu an dolaştığı civardır — çete gezer, işaret de onunla kayar.`; },
    where(q) {
        let b = state.npcParties.find(n => n.id === q.data.npcId && n.size > 0);
        if(!b) return null;
        let near = LOCATIONS.slice().sort((x, y) => Game.dist(x, b) - Game.dist(y, b))[0];
        return near ? near.id : null;
    },
    // Any bandit-gang win counts, not just the exact party snapshotted at setup() (#132 —
    // see brother_in_chains for the full rationale: the tracked party can be silently wiped
    // and respawned with a new id before the player arrives, and nothing distinguishes it
    // from any other bandit party in the UI anyway).
    on(q, ev, d) {
        if(ev !== 'battle_won') return;
        let beaten = state.npcParties.find(n => n.id === d.npcId);
        if(beaten && beaten.type === 'bandit') return 'done';
    }
};

QUESTS.relay_packages = {
    title: 'Zincirleme Teslimat', givers: ['cunning', 'goodnatured'], minRelation: 5, days: 18,
    reward: { money: 1250, renown: 7, rel: 14 },
    setup(q, giver) {
        let pool = LOCATIONS.filter(l => l.faction === giver.faction && l.id !== giver.homeLocId && (l.type === 'city' || l.type === 'village'));
        let stops = pool.sort(() => Math.random() - 0.5).slice(0, 3).map(l => l.id);
        q.data = { stops, leg: 0 };
    },
    offer(q) { return T`Bu paketi açma. Her durakta biri seni bekliyor, paketi ona ver,
        elindeki yenisini bir sonraki durağa taşı. Zincir kopmasın.`; },
    desc(q) {
        let l = LOCATIONS.find(x => x.id === q.data.stops[q.data.leg]);
        return T`Durak <b>${q.data.leg + 1}/${q.data.stops.length}</b> — <b>${l ? T(l.name) : '?'}</b>'e paketi taşı.`;
    },
    where(q) { return q.data.stops[q.data.leg]; },
    on(q, ev, d) {
        if(ev !== 'entered_location' || d.locId !== q.data.stops[q.data.leg]) return;
        q.data.leg++;
        if(q.data.leg >= q.data.stops.length) return 'done';
        alert(T`Paketi teslim ettin, eline yenisini tutuşturdular. Sıradaki durak: ${T(Quests.locName(q.data.stops[q.data.leg]))}.`);
        Quests.render();
    }
};

QUESTS.wolf_cull = {
    title: 'Kurt Sürüleri', givers: ['martial', 'quarrelsome'], minRelation: 0, days: 16,
    reward: { money: 1350, renown: 11, rel: 12 },
    setup(q) { q.data = { got: 0, need: 3 }; },
    offer(q) { return T`Sürüler ağılları boşaltıyor, çobanlar geceleri uyuyamıyor.
        Haritada dolaşan <b>${q.data.need} kurt sürüsünü</b> dağıt.`; },
    desc(q) { return T`Haritada kurt sürülerini bul ve dağıt — <b>${q.data.got}/${q.data.need}</b>.`; },
    on(q, ev, d) {
        if(ev !== 'battle_won' || d.lordId || d.questWave) return;
        let npc = state.npcParties.find(n => n.id === d.npcId);
        if(npc && npc.band === 'wolf') q.data.got++;
        if(q.data.got >= q.data.need) return 'done';
    }
};

QUESTS.forest_ambush = {
    title: 'Orman Pususu', givers: ['martial', 'cunning'], minRelation: 0, days: 16,
    reward: { money: 1300, renown: 10, rel: 12 },
    setup(q) { q.data = { got: 0, need: 3 }; },
    offer(q) { return T`Tüccarlar ormanın içinden geçen kestirmeyi terk etti, orada pusu kuran çeteler var.
        <b>${q.data.need} orman çetesini</b> dağıt, yol yeniden açılsın.`; },
    desc(q) { return T`Haritada orman çetelerini bul ve dağıt — <b>${q.data.got}/${q.data.need}</b>.`; },
    on(q, ev, d) {
        if(ev !== 'battle_won' || d.lordId || d.questWave) return;
        let npc = state.npcParties.find(n => n.id === d.npcId);
        if(npc && npc.band === 'forest') q.data.got++;
        if(q.data.got >= q.data.need) return 'done';
    }
};

QUESTS.outpost_defense = {
    title: 'Sınır Karakolu', givers: ['martial'], minRelation: 10, days: 18,
    reward: { money: 1500, renown: 16, rel: 16 },
    setup(q, giver) {
        let castles = LOCATIONS.filter(l => l.faction === giver.faction && l.type === 'castle');
        let c = castles[Math.floor(Math.random() * castles.length)] || LOCATIONS.find(l => l.id === giver.homeLocId) || LOCATIONS[0];
        q.data = { locId: c.id, locName: c.name, waves: 0, need: 3 };
    },
    offer(q) { return T`${q.data.locName} karakolu zayıf kaldı, çapulcular bunu koklamış. <b>Üç dalga</b> gelecek, hepsini kır.`; },
    desc(q) {
        let v = LOCATIONS.find(l => l.id === q.data.locId);
        let watch = state.player.quests.includes(q) && v
            ? '<br>' + (Game.dist(state.player, v) <= 500
                ? T`✅ <b>Nöbettesin</b> — her gün gelebilirler.`
                : T`❌ <b>Nöbet yerinden uzaktasın</b> — sen dönene kadar kimse gelmez.`)
            : '';
        return T`<b>${T(q.data.locName)}</b> yakınında (yarım günlük mesafede) bekle —
            <b>${q.data.waves}/${q.data.need}</b> dalga püskürtüldü` + watch;
    },
    where(q) { return q.data.locId; },
    day(q) {
        let v = LOCATIONS.find(l => l.id === q.data.locId);
        if(Game.dist(state.player, v) > 500) return;
        if(Math.random() < 0.5) {
            let n = Game.createNPC(T('Karakol Baskıncıları'), 'bandit', 6 + Math.floor(Math.random() * 9), '#8b0000');
            n.x = v.x + (Math.random() - 0.5) * 300;
            n.y = v.y + (Math.random() - 0.5) * 300;
            n.targetX = state.player.x; n.targetY = state.player.y;
            n.questWave = q.id;
            state.npcParties.push(n);
            alert(T`${q.data.locName} yönünden toz bulutu — geliyorlar!`);
        }
    },
    on(q, ev, d) {
        if(ev === 'battle_won' && d.questWave === q.id) {
            q.data.waves++;
            if(q.data.waves >= q.data.need) return 'done';
            alert(T`Bir dalga püskürtüldü (${q.data.waves}/${q.data.need}). Nöbete devam.`);
        }
    }
};

// --- MORE FIELD CONTRACTS (#106) — borç tahsili, av/temizlik, casusluk, eskort,
// kuşatma erzakı, rehine değişimi. Same event surface as the block above.
QUESTS.debt_collector = {
    title: 'Borç Tahsildarı', givers: ['cunning', 'quarrelsome'], minRelation: 5, days: 16,
    reward: { money: 1400, renown: 7, rel: 12 },
    setup(q, giver) {
        let pool = LORDS.filter(l => l.faction === giver.faction && l.id !== giver.id);
        let debtors = pool.sort(() => Math.random() - 0.5).slice(0, 3).map(l => l.id);
        q.data = { debtors, collected: [] };
    },
    offer(q) { return T`Üç soylu bana borçlu, hiçbiri ödemiyor. Sözle bastıramadım, belki sen bastırırsın.
        Üçünü de bul, borcu hatırlat — kimin ne kadar utandığı beni ilgilendirmez.`; },
    desc(q) { return T`Borçlu lordları sırayla ziyaret et ve tahsilatı hatırlat — <b>${q.data.collected.length}/${q.data.debtors.length}</b>.`; },
    where(q) { let id = q.data.debtors.find(x => !q.data.collected.includes(x)); return id ? Quests.lordSeat(id) : null; },
    on(q, ev, d) {
        if(ev === 'talked_to' && q.data.debtors.includes(d.lordId) && !q.data.collected.includes(d.lordId)) {
            q.data.collected.push(d.lordId);
            Nobles.addRel(d.lordId, -2);
            alert(T`${T(Nobles.lord(d.lordId).name)} borcunu hatırlayınca suratı asıldı ama ödedi. (${q.data.collected.length}/${q.data.debtors.length})`);
        }
        if(q.data.collected.length >= q.data.debtors.length) return 'done';
    }
};

QUESTS.rogue_company = {
    title: 'Kaçak Birlik', givers: ['martial', 'quarrelsome'], minRelation: 10, days: 20,
    reward: { money: 850, renown: 16, rel: 14 },   // prestij ağırlıklı: para az, nam çok
    can() { return state.npcParties.some(n => n.type === 'bandit' && n.size > 0); },
    setup(q) {
        let bands = state.npcParties.filter(n => n.type === 'bandit' && n.size > 0);
        let b = bands[Math.floor(Math.random() * bands.length)];
        q.data = { npcId: b ? b.id : null, npcName: b ? b.name : T('Kaçak Birlik') };
    },
    offer(q) { return T`Bayrağımı taşıyan bir birlik firar etti, şimdi kendi hesabına yağma yapıyor.
        Bunu duyurmam yasak — utanç krallığa yeter. Bul onları, sessizce hallet.`; },
    desc(q) { return T`Haritada <b>${T(q.data.npcName)}</b> birliğini bul ve dağıt; aşağıdaki yer birliğin
        şu an dolaştığı civardır — birlik gezer, işaret de onunla kayar.`; },
    where(q) {
        let b = state.npcParties.find(n => n.id === q.data.npcId && n.size > 0);
        if(!b) return null;
        let near = LOCATIONS.slice().sort((x, y) => Game.dist(x, b) - Game.dist(y, b))[0];
        return near ? near.id : null;
    },
    // Any bandit-gang win counts, not just the exact party snapshotted at setup() (#132 —
    // see brother_in_chains for the full rationale: the tracked party can be silently wiped
    // and respawned with a new id before the player arrives, and nothing distinguishes it
    // from any other bandit party in the UI anyway).
    on(q, ev, d) {
        if(ev !== 'battle_won') return;
        let beaten = state.npcParties.find(n => n.id === d.npcId);
        if(beaten && beaten.type === 'bandit') return 'done';
    }
};

QUESTS.shadow_dispatch = {
    title: 'Gölgedeki Ferman', givers: ['cunning', 'martial'], minRelation: 15, days: 14,
    reward: { money: 1300, renown: 12, rel: 14 },
    can(giver) { return QUESTS.shadow_dispatch.foes(giver).length > 0; },
    foes(giver) { return LOCATIONS.filter(l => l.type === 'city' && l.faction && l.faction !== giver.faction && Game.atWar(l.faction, giver.faction)); },
    setup(q, giver) {
        let pool = QUESTS.shadow_dispatch.foes(giver);
        let c = pool[Math.floor(Math.random() * pool.length)];
        let home = LOCATIONS.find(l => l.id === giver.homeLocId);
        q.data = { locId: c.id, locName: c.name, homeId: giver.homeLocId, homeName: home ? home.name : '?', stage: 'infiltrate' };
    },
    offer(q) { return T`${q.data.locName} surlarının içinde bize yazılmış bir ferman var, kimin elinde olduğunu biliyorum.
        Sokul, al, sıvış. Yakalanırsan seni tanımam — ama fermanı getirirsen krallık senin adını anar.`; },
    desc(q) {
        return q.data.stage === 'infiltrate'
            ? T`<b>${T(q.data.locName)}</b> surlarına sokul ve fermanı ele geçir.`
            : T`Ferman elinde — sınırı geçip <b>${T(q.data.homeName)}</b>'a dön, izini kaybettir.`;
    },
    where(q) { return q.data.stage === 'infiltrate' ? q.data.locId : q.data.homeId; },
    on(q, ev, d) {
        if(ev !== 'entered_location') return;
        if(q.data.stage === 'infiltrate' && d.locId === q.data.locId) {
            q.data.stage = 'extract';
            alert(T('Ferman elinde. Şimdi sınırı sağ salim geçmen lazım.'));
            Quests.render();
            return;
        }
        if(q.data.stage === 'extract' && d.locId === q.data.homeId) return 'done';
    }
};

QUESTS.merchant_convoy = {
    title: 'Tüccar Kervanı', givers: ['goodnatured', 'cunning'], minRelation: 5, days: 12,
    reward: { money: 1450, renown: 9, rel: 14 },
    setup(q, giver) {
        let pool = LOCATIONS.filter(l => l.faction === giver.faction && l.type === 'city' && l.id !== giver.homeLocId);
        let c = pool[Math.floor(Math.random() * pool.length)] || LOCATIONS.find(l => l.id === giver.homeLocId) || LOCATIONS[0];
        q.data = { locId: c.id, locName: c.name, ambushed: false, cleared: false };
    },
    offer(q) { return T`Kervanım <b>${q.data.locName}</b>'a mal götürecek. Yolun ortasında pusu kurulduğunu duydum ama nerede bilmiyorum.
        Kervanla git, pusuya düşerlerse kurtar, sonunda kervanı sağ salim teslim et.`; },
    desc(q) {
        if(q.data.ambushed && !q.data.cleared) return T`Kervan pusuya düştü — saldıranları dağıt.`;
        return T`Kervanla birlikte <b>${T(q.data.locName)}</b>'a doğru yol al; yolda pusu olabilir.`;
    },
    where(q) { return q.data.locId; },
    day(q) {
        if(q.data.ambushed || q.data.cleared) return;
        if(Math.random() < 0.15) {
            q.data.ambushed = true;
            let n = Game.createNPC(T('Kervan Baskıncıları'), 'bandit', 5 + Math.floor(Math.random() * 6), '#8b0000');
            n.x = state.player.x + (Math.random() - 0.5) * 200;
            n.y = state.player.y + (Math.random() - 0.5) * 200;
            n.targetX = state.player.x; n.targetY = state.player.y;
            n.questWave = q.id;
            state.npcParties.push(n);
            alert(T('Kervanın önü kesildi! Silaha sarıl.'));
        }
    },
    on(q, ev, d) {
        if(ev === 'battle_won' && d.questWave === q.id) {
            q.data.ambushed = false; q.data.cleared = true;
            alert(T('Baskıncılar dağıtıldı, kervan yoluna devam ediyor.'));
            return;
        }
        if(ev === 'entered_location' && d.locId === q.data.locId && !q.data.ambushed) return 'done';
    }
};

QUESTS.siege_provisions = {
    title: 'Kuşatma Erzakı', givers: ['martial', 'goodnatured'], minRelation: 10, days: 8,
    reward: { money: 1000, renown: 13, rel: 16 },   // prestij ağırlıklı: kısa süre, çok nam
    can(giver) { return QUESTS.siege_provisions.besieged(giver).length > 0; },
    besieged(giver) {
        let ids = state.npcParties.filter(n => n.siegeLocId).map(n => n.siegeLocId);
        return LOCATIONS.filter(l => ids.includes(l.id) && l.faction === giver.faction);
    },
    setup(q, giver) {
        let pool = QUESTS.siege_provisions.besieged(giver);
        let c = pool[Math.floor(Math.random() * pool.length)];
        q.data = { locId: c.id, locName: c.name, need: 15 };
    },
    offer(q) { return T`${q.data.locName} kuşatma altında, ambarları tükeniyor. <b>${q.data.need} birim yemek</b> bul,
        muhasara hattını yarıp içeri sok. Çabuk ol, açlık kılıçtan hızlı öldürür.`; },
    desc(q) {
        let f = Quests.foodCount();
        return T`<b>${T(q.data.locName)}</b>'a gir, çantanda <b>${f}/${q.data.need}</b> birim yemek olsun.`;
    },
    where(q) { return q.data.locId; },
    on(q, ev, d) {
        if(ev !== 'entered_location' || d.locId !== q.data.locId) return;
        if(Quests.foodCount() < q.data.need) { alert(T`Yeterince erzak yok. (${Quests.foodCount()}/${q.data.need})`); return; }
        Quests.takeFood(q.data.need);
        return 'done';
    }
};

QUESTS.noble_hostage_exchange = {
    title: 'Rehine Değişimi', givers: ['cunning', 'quarrelsome'], minRelation: 15, days: 16,
    reward: { money: 1600, renown: 10, rel: 13 },
    setup(q, giver) {
        let pool = LOCATIONS.filter(l => l.type === 'city' && l.faction !== giver.faction);
        let c = pool[Math.floor(Math.random() * pool.length)] || LOCATIONS[0];
        q.data = { locId: c.id, locName: c.name, need: 3 };
    },
    offer(q) { return T`Düşman elimizdeki esirleri istiyor, karşılığında bizim adamlarımızı serbest bırakacaklar.
        Soylu olmayan <b>${q.data.need} esiri</b> <b>${q.data.locName}</b> kapısına götür ve değiş tokuşu yap.`; },
    desc(q) { return T`Soylu olmayan esirlerle <b>${T(q.data.locName)}</b>'a gir — <b>${Quests.prisonerCount()}/${q.data.need}</b>.`; },
    where(q) { return q.data.locId; },
    on(q, ev, d) {
        if(ev !== 'entered_location' || d.locId !== q.data.locId || Quests.prisonerCount() < q.data.need) return;
        Quests.takePrisoners(q.data.need); return 'done';
    }
};

// --- STORY CONTRACT (#105) — "Sisteki Nokta": ipucu (offer) → keşif (seek) →
// karşılaşma (encounter, battle_won via questWave) → çözüm (turn-in + onDone lore).
// Longer and stranger than a field contract on purpose; no `can()` gate — it always exists.
QUESTS.mist_point = {
    title: 'Sisteki Nokta', givers: [], minRelation: 20, days: 30,
    reward: { money: 1200, renown: 20, rel: 18 },
    setup(q, giver) {
        let anchor = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
        let px = anchor.x + (Math.random() - 0.5) * 700, py = anchor.y + (Math.random() - 0.5) * 700;
        q.data = { stage: 'seek', locId: anchor.id, locName: anchor.name, px, py, npcId: null };
    },
    offer(q) { return T`"${q.data.locName} yakınlarında, sisin hiç dağılmadığı bir nokta var diyorlar.
        Oraya giden dönmüş ama eskisi gibi konuşmuyor artık.<br><br>
        Ben yaşlıyım, gidemem. Sen git — ne olduğunu öğren, dönebilirsen anlat."`; },
    desc(q) {
        if(q.data.stage === 'seek') return T`<b>${T(q.data.locName)}</b> civarını araştır — sisin dağılmadığı yeri bul.`;
        if(q.data.stage === 'encounter') return T`Sisin içinden şekiller çıktı — üstüne git, ne olduklarını öğren.`;
        return T`Nokta sustu. Dönüp anlatman gerek.`;
    },
    where(q) { return q.data.locId; },
    on(q, ev, d) {
        if(q.data.stage === 'seek' && ev === 'entered_location' && d.locId === q.data.locId) {
            q.data.stage = 'encounter';
            let n = Game.createNPC(T('Sisteki Gölgeler'), 'bandit', 6 + Math.floor(Math.random() * 4), '#6a5acd');
            n.x = q.data.px; n.y = q.data.py;
            n.targetX = state.player.x; n.targetY = state.player.y;
            n.questWave = q.id;
            state.npcParties.push(n);
            q.data.npcId = n.id;
            alert(T('Sis kalınlaşıyor. İçinden insan biçimleri sıyrılıp geliyor.'));
            Quests.render();
            return;
        }
        if(q.data.stage === 'encounter' && ev === 'battle_won' && d.questWave === q.id) {
            q.data.stage = 'resolved';
            return 'done';
        }
    },
    onDone(q) {
        alert(T('Gölgeler dağılınca sis de dağıldı, geriye ne kırık bir mühür ne de bir iz kaldı — sadece anlatacak bir hikaye.'));
    }
};

const Quests = {

    active() { return state.player.quests; },

    // A quest's giver can be a lord, or a city's guild master.
    // The guild master has no relation value; its reward is only money and renown.
    giver(id) {
        if(String(id).indexOf('guild_') === 0) {
            let loc = LOCATIONS.find(l => l.id === String(id).slice(6)) || { id: '', name: '?', faction: null };
            return { id, name: T`Lonca Ustası (${T(loc.name)})`, personality: 'guild',
                     faction: loc.faction, homeLocId: loc.id, isGuild: true };
        }
        return Nobles.lord(id);
    },

    // The "Back" button: returns to dialogue for a lord, to the tavern for a guild master
    back(giverId) {
        let g = this.giver(giverId);
        if(g && g.isGuild) {
            let loc = LOCATIONS.find(l => l.id === g.homeLocId);
            return loc ? Game.openTavern(loc) : Game.closeModal();
        }
        Nobles.talk(giverId);
    },

    // ---------- "Where?" ----------
    // The location name appeared in quest text via three separate spellings, and one
    // (the chickens) blew up on a deleted location. One gate: id → translated name, else '?'.
    locName(id) {
        let l = LOCATIONS.find(x => x.id === id);
        return l ? T(l.name) : '?';
    },

    // A lord is only found in their own hall (Nobles.isAt) — so the answer to
    // "where do I go" is always their home location, not their party's live position.
    lordSeat(lordId) {
        let l = Nobles.lord(lordId);
        return l ? l.homeLocId : null;
    },

    // ---------- Turn-in (#107): done -> awaiting -> closed ----------
    // A guild master never leaves home; a lord's party roams, so "where do I collect"
    // is a snapshot of their position taken the moment the job is finished, not a live feed.
    turnInLoc(q) {
        let g = this.giver(q.giverId);
        if(g.isGuild) return g.homeLocId;
        let party = Nobles.partyOf(q.giverId);
        if(!party) return g.homeLocId;
        let near = LOCATIONS.slice().sort((x, y) => Game.dist(x, party) - Game.dist(y, party))[0];
        return near ? near.id : g.homeLocId;
    },

    // Is the giver actually standing at that snapshot right now? A guild master always is;
    // a lord's party may have moved on since the snapshot was taken.
    giverPresent(giverId, locId) {
        let g = this.giver(giverId);
        if(g.isGuild) return true;
        let party = Nobles.partyOf(giverId);
        let loc = LOCATIONS.find(l => l.id === locId);
        if(!party || !loc) return false;
        return Game.dist(party, loc) < 420;
    },

    // "Where" and "what it says" both need to know whether a quest is still being
    // worked, or is done and just waiting for a hand-off — same single source pattern as where().
    effectiveWhere(q) {
        if(q.state === 'awaiting') return q.turnInLocId;
        let def = QUESTS[q.id];
        return def.where ? def.where(q) : null;
    },

    descFor(q) {
        if(q.state === 'awaiting') {
            let g = this.giver(q.giverId);
            return T`Görev tamam. Ödülü almak için <b>${this.giverName(g)}</b>'le konuş — en son <b>${this.locName(q.turnInLocId)}</b>'de görüldü, ama nerede rastlarsan orada teslim edebilirsin.`;
        }
        return QUESTS[q.id].desc(q);
    },

    nearestTourney() {
        return this.nearestLoc(l => l.type === 'city' && state.activeTournaments[l.id]);
    },

    nearestSeat(pred) {
        let ids = LORDS.filter(pred).map(l => l.homeLocId);
        return this.nearestLoc(l => ids.includes(l.id));
    },

    nearestLoc(pred) {
        let best = null, bd = Infinity;
        LOCATIONS.filter(pred).forEach(l => {
            let d = Game.dist(state.player, l);
            if(d < bd) { bd = d; best = l; }
        });
        return best ? best.id : null;
    },

    // Map speed is per hour (Game.getPlayerSpeed) — the day count shown on the
    // quest card and used in the "can I make it" decision is the same number.
    daysTo(locId) {
        let l = LOCATIONS.find(x => x.id === locId);
        if(!l) return null;
        let spd = Game.getPlayerSpeed().value;
        return spd > 0 ? Math.max(1, Math.round(Game.dist(state.player, l) / (spd * 24))) : null;
    },

    /** Map pin list: { locId: [quest name, ...] } — rebuilt every frame (quest count stays single-digit). */
    targets() {
        let m = {};
        (state.player.quests || []).forEach(q => {
            let w = this.effectiveWhere(q);
            if(w) (m[w] = m[w] || []).push(T(QUESTS[q.id].title));
        });
        return m;
    },

    prisonerCount() { return (state.player.prisoners || []).filter(p => !p.noble).length; },

    takePrisoners(n) {
        for(let i = state.player.prisoners.length - 1; i >= 0 && n > 0; i--) {
            if(state.player.prisoners[i].noble) continue;
            state.player.prisoners.splice(i, 1); n--;
        }
    },

    foodCount() {
        return state.player.inventory
            .filter(i => ['wheat', 'bread', 'meat', 'cheese'].includes(i.id))
            .reduce((a, b) => a + b.qty, 0);
    },

    takeFood(n) {
        for(let i = state.player.inventory.length - 1; i >= 0 && n > 0; i--) {
            let it = state.player.inventory[i];
            if(!['wheat', 'bread', 'meat', 'cheese'].includes(it.id)) continue;
            let take = Math.min(it.qty, n);
            it.qty -= take; n -= take;
            if(it.qty <= 0) state.player.inventory.splice(i, 1);
        }
    },

    has(qid, giverId) {
        return state.player.quests.some(q => q.id === qid && (!giverId || q.giverId === giverId));
    },

    // ---------- Offer ----------
    // Single display gate for the giver's name: a guild master's is composed and
    // already translated inside `giver()`, a lord's comes from the raw data table.
    giverName(g) { return g.isGuild ? g.name : T(g.name); },

    // "What to do" and "where to go" in one box, in one wording.
    // Both the offer modal and the quest list render through here: the sentence
    // the player sees before accepting is the same one they later find on the quest screen.
    taskHtml(q) {
        let w = this.effectiveWhere(q);
        let gun = w ? this.daysTo(w) : null;
        return `<div style="background:rgba(0,0,0,0.25);border-left:3px solid var(--primary);border-radius:6px;
                padding:0.7rem 0.9rem;margin-top:1rem;line-height:1.55">
            <div>${this.descFor(q)}</div>
            ${w ? `<div style="margin-top:0.4rem;color:#e0b062;font-size:var(--fs-sm)">${
                gun ? T`📍 ${this.locName(w)} · şu an ~${gun} günlük yol` : T`📍 ${this.locName(w)}`}</div>` : ''}
        </div>`;
    },

    offerMenu(giverId) {
        let giver = this.giver(giverId);
        // Standing right in front of the giver IS presence — opening this menu already means
        // you found them (their own dialogue, wherever it was reached from). The old gate here
        // re-checked distance from the giver's *live* party to the *snapshot* location taken
        // back when the quest finished, instead of trusting that you're already talking to
        // them — so a lord who'd moved on since that snapshot (which is most lords, most of the
        // time) failed the check even with the player standing right in front of him, and the
        // only way to actually collect was to stumble into whatever settlement he happened to
        // be near at that exact moment (#132 report: "finding the giver is hard"). Completing
        // here needs no presence check at all — return right after so the reward alert this
        // shows isn't immediately clobbered by falling through to a cooldown/new-offer modal.
        let pending = state.player.quests.find(x => x.giverId === giverId);
        if(pending && pending.state === 'awaiting') {
            this.complete(pending);
            return;
        }
        if(pending) {
            let q = pending;
            return Game.showModal(`<h3>📜 ${this.giverName(giver)}</h3>
                <p style="font-style:italic">${q.state === 'awaiting' ? T`"Ödülünü unutmadım, işte burada."` : T`"Sana verdiğim işi bitirmeden yenisini isteme."`}</p>
                <p style="margin-top:1rem"><b>${T(QUESTS[q.id].title)}</b><br>
                <span style="color:var(--text-muted)">${this.descFor(q)}</span></p>
                <button class="btn" style="margin-top:1rem" onclick="Quests.back('${giverId}')">${T`Geri`}</button>`);
        }
        let cd = (state.questCooldown || {})[giverId] || 0;
        if(state.time.day < cd) {
            return Game.showModal(`<h3>📜 ${this.giverName(giver)}</h3>
                <p style="font-style:italic">${T`"Şu an sana verecek bir işim yok. Bir süre sonra uğra."`}</p>
                <button class="btn" style="margin-top:1rem" onclick="Quests.back('${giverId}')">${T`Geri`}</button>`);
        }
        // The offer is pinned per lord. It used to re-roll on every open;
        // since closing the modal carried no penalty, the player could keep
        // opening and closing the menu until the quest they wanted came up.
        state.questOffers = state.questOffers || {};
        let q = state.questOffers[giverId] || this.pick(giverId);
        if(!q) {
            return Game.showModal(`<h3>📜 ${this.giverName(giver)}</h3>
                <p style="font-style:italic">${T`"Yok. Git başımdan."`}</p>
                <button class="btn" style="margin-top:1rem" onclick="Quests.back('${giverId}')">${T`Geri`}</button>`);
        }
        // The pending offer is refreshed: an old offer shouldn't start with a shortened deadline
        q.startDay = state.time.day;
        q.deadline = state.time.day + QUESTS[q.id].days;
        state.questOffers[giverId] = q;
        state.pendingQuest = q;
        let def = QUESTS[q.id];
        Game.showModal(`<div style="display:flex;gap:1.2rem;align-items:flex-start">
                ${Nobles.portraitCss(giver, 110)}
                <div style="flex:1">
                    <h3 style="margin:0">📜 ${T(def.title)}</h3>
                    <div style="font-size:var(--fs-sm);color:var(--text-muted)">${T`${this.giverName(giver)} · süre ${def.days} gün${
                        giver.isGuild ? '' : ` · ${Nobles.traitOb(giverId).icon} ${T(Nobles.traitOb(giverId).name)}`}`}</div>
                </div></div>
            ${giver.isGuild ? '' : `<p id="lord-line" style="margin-top:1rem;font-style:italic;color:var(--primary);line-height:1.5;min-height:4.5em"></p>`}
            <p style="margin-top:1rem;line-height:1.6;font-style:italic">${def.offer(q, giver)}</p>
            ${this.taskHtml(q)}
            <div style="background:rgba(0,0,0,0.3);padding:0.8rem;border-radius:8px;margin-top:0.6rem;font-size:var(--fs-md)">
                ${T`Ödül:`} <b style="color:#ffcc00">${T`${def.reward.money} dinar`}</b> ·
                <b style="color:${def.reward.renown < 0 ? 'var(--danger)' : '#3498db'}">${T`${def.reward.renown > 0 ? '+' : ''}${def.reward.renown} nam`}</b>${def.reward.rel ? ` ·
                <b style="color:#2ecc71">${T`+${def.reward.rel} ilişki`}</b>` : ''}
                <div style="color:var(--text-muted);font-size:var(--fs-sm);margin-top:0.3rem">${
                    giver.isGuild ? T('Süre dolarsa ya da vazgeçersen görev yanar, lonca defterine kırmızı bir çizik düşer.')
                                  : T`Süre dolarsa ya da vazgeçersen görev yanar ve ${this.giverName(giver)} ile −10 ilişki.`}</div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:1rem;margin-top:1rem">
                <button class="btn primary" onclick="Quests.accept()">${T`Kabul Ediyorum`}</button>
                <button class="btn" onclick="Quests.decline('${giverId}')">${T`Reddet`}</button>
            </div>`, '680px');
        // The lord's opening line: personality trait + the player's standing (#59)
        if(!giver.isGuild) Game.typeIn('lord-line', `"${Nobles.lineFor('quest', giverId)}"`);
    },

    // Force-generate a quest from a specific lord (for the dowry quest)
    offerFrom(giverId, opts = {}) {
        let q = this.pick(giverId, true);
        if(!q) return null;
        if(opts.dowryFor) q.dowryFor = opts.dowryFor;
        state.player.quests.push(q);
        return q;
    },

    pick(giverId, ignoreDup = false) {
        let giver = this.giver(giverId);
        let rel = Nobles.rel(giverId);
        let pool = Object.keys(QUESTS).filter(id => {
            let d = QUESTS[id];
            if(rel < d.minRelation) return false;
            if(d.givers.length && !d.givers.includes(giver.personality)) return false;
            if(!ignoreDup && this.has(id)) return false;
            // If the world's current state doesn't make the quest possible, it isn't
            // offered either — so setup() can assume its precondition (see dawn_raid).
            if(d.can && !d.can(giver)) return false;
            return true;
        });
        if(!pool.length) return null;
        return this.make(pool[Math.floor(Math.random() * pool.length)], giverId);
    },

    /** A single quest instance — the roll is `pick`'s job, building it is this one's (tests build from here too). */
    make(id, giverId) {
        let q = { id, giverId, state: 'active', startDay: state.time.day, deadline: state.time.day + QUESTS[id].days, data: {} };
        QUESTS[id].setup(q, this.giver(giverId));
        return q;
    },

    accept() {
        let q = state.pendingQuest;
        if(!q) return;
        state.pendingQuest = null;
        if(state.questOffers) delete state.questOffers[q.giverId];
        state.player.quests.push(q);
        Game.trainAttr('int', 1);   // taking a quest trains intelligence
        Game.closeModal();
        alert(T`Görev kabul edildi: ${T(QUESTS[q.id].title)}\nSüre: ${QUESTS[q.id].days} gün.`);
    },

    decline(giverId) {
        state.pendingQuest = null;
        if(state.questOffers) delete state.questOffers[giverId];
        state.questCooldown = state.questCooldown || {};
        state.questCooldown[giverId] = state.time.day + 7 + Math.floor(Math.random() * 9);
        if(!this.giver(giverId).isGuild) Nobles.addRel(giverId, -2);
        this.back(giverId);
    },

    // ---------- Event dispatch ----------
    emit(ev, d = {}) {
        for(let i = state.player.quests.length - 1; i >= 0; i--) {
            let q = state.player.quests[i];
            if(q.state === 'awaiting') {
                if(ev === 'entered_location' && d.locId === q.turnInLocId) this.tryTurnIn(q);
                continue;
            }
            let def = QUESTS[q.id];
            if(!def.on) continue;
            let r = def.on(q, ev, d);
            if(r === 'done') this.markDone(q);
            else if(r === 'fail') this.fail(q, T('Görev başarısız oldu.'));
        }
    },

    dailyTick() {
        for(let i = state.player.quests.length - 1; i >= 0; i--) {
            let q = state.player.quests[i];
            // The task itself is finished; only the walk back is left, and that carries no clock.
            if(q.state === 'awaiting') continue;
            let def = QUESTS[q.id];
            if(state.time.day > q.deadline) { this.fail(q, T('Süre doldu.')); continue; }
            if(def.day) {
                let r = def.day(q);
                if(r === 'done') this.markDone(q);
                else if(r === 'fail') this.fail(q, T('Görev başarısız oldu.'));
            }
        }
    },

    // Objective met: the quest stops being "active" and starts waiting for a hand-off.
    // Reward doesn't move yet — see tryTurnIn/complete.
    markDone(q) {
        let def = QUESTS[q.id];
        state.npcParties = state.npcParties.filter(n => n.questWave !== q.id);
        q.state = 'awaiting';
        q.turnInLocId = this.turnInLoc(q);
        q.turnInSnapshotDay = state.time.day;
        let g = this.giver(q.giverId);
        alert(T`✅ Görev tamam: ${T(def.title)}\nÖdülü almak için ${T(this.giverName(g))}'le konuş — en son ${T(this.locName(q.turnInLocId))}'de görüldü, ama nerede rastlarsan orada teslim edebilirsin.`);
        this.render();
    },

    // Player reached the snapshot spot: pay out if the giver is actually still there,
    // otherwise the trail has moved on and a new snapshot is taken.
    tryTurnIn(q) {
        if(this.giverPresent(q.giverId, q.turnInLocId)) { this.complete(q); return; }
        let g = this.giver(q.giverId);
        let daysSince = Math.max(1, state.time.day - q.turnInSnapshotDay);
        q.turnInLocId = this.turnInLoc(q);
        q.turnInSnapshotDay = state.time.day;
        alert(T`${T(this.giverName(g))} burada değil — ${daysSince} gün önce buradaymış. Son görüldüğü yer: ${T(this.locName(q.turnInLocId))}.`);
        this.render();
    },

    complete(q) {
        let def = QUESTS[q.id];
        // Waves summoned for this quest no longer have a quest to belong to, and since
        // they never flee they would follow the player for good (#94).
        state.npcParties = state.npcParties.filter(n => n.questWave !== q.id);
        state.player.quests = state.player.quests.filter(x => x !== q);
        state.questCooldown = state.questCooldown || {};
        state.questCooldown[q.giverId] = state.time.day + 3;

        state.player.money += def.reward.money;
        state.player.renown = Math.max(0, state.player.renown + def.reward.renown);
        let g = this.giver(q.giverId);
        if(!g.isGuild) Nobles.addRel(q.giverId, def.reward.rel);
        if(def.onDone) def.onDone(q);
        Game.addHonor('questDone');   // keeping your word earns honor (#53/1.5)
        Game.trainAttr('int', 2);   // finishing a quest trains intelligence

        if(q.dowryFor && state.dowryOffer && state.dowryOffer.ladyId === q.dowryFor) {
            state.dowryOffer.amount = Math.max(500, Math.round(state.dowryOffer.amount * 0.5 / 50) * 50);
            alert(T`${T(g.name)}: "Sözümün arkasındayım. Drahomanın yarısını sil."\nYeni drahoma: ${state.dowryOffer.amount} dinar.`);
        }

        Game.updateTopBar();
        alert(T`✅ Görev tamamlandı: ${T(def.title)}\n\n+${def.reward.money} dinar, ${def.reward.renown > 0 ? '+' : ''}${def.reward.renown} nam` +
              (g.isGuild ? '.' : T`, ${T(g.name)} ile +${def.reward.rel} ilişki.`));
        this.render();
    },

    fail(q, why) {
        let def = QUESTS[q.id];
        state.npcParties = state.npcParties.filter(n => n.questWave !== q.id);   // see complete()
        let g = this.giver(q.giverId);
        state.player.quests = state.player.quests.filter(x => x !== q);
        if(!g.isGuild) Nobles.addRel(q.giverId, -10);
        state.questCooldown = state.questCooldown || {};
        state.questCooldown[q.giverId] = state.time.day + 10;
        alert(`❌ ${T(def.title)}: ${why}` + (g.isGuild ? T('\nLonca defterine kırmızı bir çizik atıldı.') : T`\n${T(g.name)} ile −10 ilişki.`));
        this.render();
    },

    abandon(qid) {
        let q = state.player.quests.find(x => x.id === qid);
        // A finished job isn't abandoned, just picked up later — there's nothing left to fail.
        if(q && q.state !== 'awaiting') this.fail(q, T('Görevden vazgeçtin.'));
    },

    // ---------- Screen ----------
    render() {
        let el = document.getElementById('quest-list');
        if(!el) return;
        // The goal chain sits above the quests — the answer to "what do I do now" (#53/1.4)
        let amb = Game.ambitionHtml();
        if(!state.player.quests.length) {
            el.innerHTML = amb + `<p style="color:var(--text-muted)">${T`Üstlendiğin bir görev yok. İki kapı var:<br>
                • Bir şehrin ya da kalenin <b>Lordlar Salonu</b>'na gir, bir soyluyla konuş ve "Bana bir iş var mı?" de —
                mizacı ve sana olan ilişkisi hangi işi teklif edeceğini belirler.<br>
                • Bir şehrin <b>hanı</b>nda lonca ustasıyla konuş — ilişki istemez, para öder.`}</p>`;
            return;
        }
        el.innerHTML = amb + state.player.quests.map(q => {
            let def = QUESTS[q.id];
            let left = q.deadline - state.time.day;
            let awaiting = q.state === 'awaiting';
            return `<div style="background:rgba(0,0,0,0.3);border:1px solid var(--panel-border);border-left:4px solid ${awaiting ? '#2ecc71' : 'var(--primary)'};
                    border-radius:8px;padding:1rem;margin-bottom:0.8rem">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <b style="font-size:1.1rem">${T(def.title)}</b>
                    <span style="font-size:var(--fs-sm);color:${awaiting ? '#2ecc71' : (left <= 3 ? 'var(--danger)' : 'var(--text-muted)')}">${
                        awaiting ? T`Teslime hazır` : T`${left} gün kaldı`}</span>
                </div>
                <div style="font-size:var(--fs-sm);color:var(--text-muted);margin:0.3rem 0">${
                    awaiting ? T`Veren: ${Quests.giverName(Quests.giver(q.giverId))}`
                             : T`Veren: ${Quests.giverName(Quests.giver(q.giverId))} · ${q.deadline}. güne kadar`}</div>
                ${Quests.taskHtml(q)}
                ${awaiting ? '' : `<button class="btn" style="margin-top:0.6rem;font-size:var(--fs-sm);padding:0.3rem 0.8rem;border-color:var(--danger);color:var(--danger)"
                        onclick="Quests.abandon('${q.id}')">${T`Vazgeç`}</button>`}
            </div>`;
        }).join('');
    }
};
