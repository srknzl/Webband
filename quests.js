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

    // 2 — Search for a spot in the fog
    fog_dot: {
        title: 'Sisteki Nokta',
        givers: [],
        minRelation: 0,
        days: 15,
        reward: { money: 700, renown: 10, rel: 10 },
        setup(q, giver) {
            let home = LOCATIONS.find(l => l.id === giver.homeLocId) || { id: '', name: '?', x: 4500, y: 4500 };
            let a = Math.random() * Math.PI * 2, r = 900 + Math.random() * 900;
            // homeId is not the search spot *itself*, it's the center of the search ring: the
            // map pin sends the player to the right region without giving away the chest's spot.
            q.data = { x: home.x + Math.cos(a) * r, y: home.y + Math.sin(a) * r,
                       homeId: home.id, homeName: home.name, hint: 'soğuk' };   // raw key; translated at display
        },
        offer(q) {
            return `${T`"Haritada bir yer var. Nerede olduğunu sana söylemeyeceğim — söylersem başkası da öğrenir.<br><br>
                Şu kadarını bilmelisin: benim kalemden bir günlük yol içinde. Gez, ara.
                Yaklaştıkça adamlarım sana haber uçuracak."`}`;
        },
        // This is the one quest whose location is never written down — secrecy is its
        // whole point. A scale is shown instead, so the player isn't left guessing
        // whether 'soğuk' (cold) is good or bad.
        desc(q) { return T`${T(q.data.homeName)} çevresinde bir günlük yol içinde gizli bir nokta ara — her gün haber gelir.<br>
            Son haber: <b>${T(q.data.hint)}</b> <span style="opacity:0.7">(soğuk → ılık → YANIYORSUN)</span>`; },
        where(q) { return q.data.homeId; },
        day(q) {
            let d = Game.dist(state.player, q.data);
            let h = d < 500 ? 'YANIYORSUN' : d < 1200 ? 'ılık' : 'soğuk';
            if(h !== q.data.hint) {
                q.data.hint = h;
                alert(T`Bir kuş ayağında not getirdi: "${T(h)}"`);
            }
            if(d < 140) {
                alert(T('Toprakta bir taş yığını. Altında kurşun mühürlü bir sandık var.'));
                return 'done';
            }
        }
    },

    // 3 — Use the promotion tree
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
            if(ev === 'battle_won' && d.npcId === q.data.npcId) return 'done';
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
        setup(q) { q.data = { lo: 5, hi: 8 }; },
        offer(q) {
            return `${T`"Bir turnuvaya gireceksin. Kazanmayacaksın.<br><br>
                Ama rezil de olmayacaksın — <b>${q.data.lo} ile ${q.data.hi} arası</b> bir skorla eleneceksin.
                Bahisçiler tam oraya oynadı. Erken düşersen şüphelenirler, kazanırsan iflas ederim.<br><br>
                Kesen dolacak, adın biraz kirlenecek. Karar senin."`}`;
        },
        desc(q) { return T`🏆 işaretli bir şehrin arenasına çık ve <b>${q.data.lo}-${q.data.hi}</b> skorla elen.
            Kazanırsan da erken elenirsen de görev yanar.`; },
        where(q) { return Quests.nearestTourney(); },
        on(q, ev, d) {
            if(ev === 'tournament_end') {
                if(!d.won && d.score >= q.data.lo && d.score <= q.data.hi) return 'done';
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
        reward: { money: 400, renown: 4, rel: 8 },
        setup(q, giver) { q.data = { locId: giver.homeLocId, done: false }; },
        offer(q) {
            return `${T`"Aşçım Deli Hüsnü kümesin kapısını açık bırakmış. On beş tavuk kaleye dağıldı.<br><br>
                Bak, bunu adamlarıma yaptıramam — bütün kale bana güler.
                Sen bir yabancısın, senin şerefin buna dayanır. <b>15 saniyen var, 8 tavuk yakala.`}</b>"`;
        },
        desc(q) { return T`<b>${Quests.locName(q.data.locId)}</b>'a gir ve avluda tavuk kovala — 15 saniyede 8 tavuk.
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
                let n = Game.createNPC(T('Hasat Çapulcuları'), 'bandit', 8 + Math.floor(Math.random() * 12), '#8b0000');
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
        desc(q) { return T`Haritada 🏆 işaretli bir şehre gir ve turnuvayı kazan
            (elenirsen bir sonraki turnuvada yeniden denersin)`; },
        where(q) { return Quests.nearestTourney(); },
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
            let def = QUESTS[q.id];
            let w = def && def.where && def.where(q);
            if(w) (m[w] = m[w] || []).push(T(def.title));
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
        let def = QUESTS[q.id];
        let w = def.where && def.where(q);
        let gun = w ? this.daysTo(w) : null;
        return `<div style="background:rgba(0,0,0,0.25);border-left:3px solid var(--primary);border-radius:6px;
                padding:0.7rem 0.9rem;margin-top:1rem;line-height:1.55">
            <div>${def.desc(q)}</div>
            ${w ? `<div style="margin-top:0.4rem;color:#e0b062;font-size:var(--fs-sm)">${
                gun ? T`📍 ${this.locName(w)} · şu an ~${gun} günlük yol` : T`📍 ${this.locName(w)}`}</div>` : ''}
        </div>`;
    },

    offerMenu(giverId) {
        let giver = this.giver(giverId);
        if(state.player.quests.some(q => q.giverId === giverId)) {
            let q = state.player.quests.find(x => x.giverId === giverId);
            return Game.showModal(`<h3>📜 ${this.giverName(giver)}</h3>
                <p style="font-style:italic">${T`"Sana verdiğim işi bitirmeden yenisini isteme."`}</p>
                <p style="margin-top:1rem"><b>${T(QUESTS[q.id].title)}</b><br>
                <span style="color:var(--text-muted)">${QUESTS[q.id].desc(q)}</span></p>
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
            ${giver.isGuild ? '' : `<p id="lord-line" style="margin-top:1rem;font-style:italic;color:var(--primary);min-height:1.5em"></p>`}
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
            <div style="display:flex;gap:1rem;margin-top:1rem">
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
        let q = { id, giverId, startDay: state.time.day, deadline: state.time.day + QUESTS[id].days, data: {} };
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
            let def = QUESTS[q.id];
            if(!def.on) continue;
            let r = def.on(q, ev, d);
            if(r === 'done') this.complete(q);
            else if(r === 'fail') this.fail(q, T('Görev başarısız oldu.'));
        }
    },

    dailyTick() {
        for(let i = state.player.quests.length - 1; i >= 0; i--) {
            let q = state.player.quests[i];
            let def = QUESTS[q.id];
            if(state.time.day > q.deadline) { this.fail(q, T('Süre doldu.')); continue; }
            if(def.day) {
                let r = def.day(q);
                if(r === 'done') this.complete(q);
                else if(r === 'fail') this.fail(q, T('Görev başarısız oldu.'));
            }
        }
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
        if(q) this.fail(q, T('Görevden vazgeçtin.'));
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
            return `<div style="background:rgba(0,0,0,0.3);border:1px solid var(--panel-border);border-left:4px solid var(--primary);
                    border-radius:8px;padding:1rem;margin-bottom:0.8rem">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <b style="font-size:1.1rem">${T(def.title)}</b>
                    <span style="font-size:var(--fs-sm);color:${left <= 3 ? 'var(--danger)' : 'var(--text-muted)'}">${T`${left} gün kaldı`}</span>
                </div>
                <div style="font-size:var(--fs-sm);color:var(--text-muted);margin:0.3rem 0">${T`Veren: ${Quests.giverName(Quests.giver(q.giverId))} · ${q.deadline}. güne kadar`}</div>
                ${Quests.taskHtml(q)}
                <button class="btn" style="margin-top:0.6rem;font-size:var(--fs-sm);padding:0.3rem 0.8rem;border-color:var(--danger);color:var(--danger)"
                        onclick="Quests.abandon('${q.id}')">${T`Vazgeç`}</button>
            </div>`;
        }).join('');
    }
};
