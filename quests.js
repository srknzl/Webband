// ============================================
// WEBBAND - GÖREV SİSTEMİ
// ============================================
// Görevler Warband'dan kopya değil; WebBand'ın kendi mekaniklerini
// (sis, kaçış planı, pazar çarpanı, yemek tüketimi, terfi ağacı, turnuva) hedefler.
//
// Bir görev tanımı:
//   givers      : hangi mizaçtaki lordlar verir (boş = herkes)
//   minRelation : bu ilişki altında teklif edilmez
//   setup(q,giver) : q.data'yı doldurur
//   desc(q)     : görev ekranındaki metin
//   on(q, ev, d): olay geldiğinde 'done' | 'fail' | undefined döner
//   day(q)      : her gün çağrılır, 'done' | 'fail' | undefined
//   reward      : { money, renown, rel }

const QUESTS = {

    // 1 — Pazarı şişir
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
        desc(q) { return `${T`${T(q.data.locName)} pazarından peynir satın al:`} <b>${q.data.got}/${q.data.need}</b>`; },
        on(q, ev, d) {
            if(ev === 'bought_item' && d.locId === q.data.locId && d.itemId === 'cheese') {
                q.data.got += d.qty;
                if(q.data.got >= q.data.need) return 'done';
            }
        }
    },

    // 2 — Sisin içinde nokta ara
    fog_dot: {
        title: 'Sisteki Nokta',
        givers: [],
        minRelation: 0,
        days: 15,
        reward: { money: 700, renown: 10, rel: 10 },
        setup(q, giver) {
            let home = LOCATIONS.find(l => l.id === giver.homeLocId) || { x: 4500, y: 4500 };
            let a = Math.random() * Math.PI * 2, r = 900 + Math.random() * 900;
            q.data = { x: home.x + Math.cos(a) * r, y: home.y + Math.sin(a) * r, hint: 'soğuk' };   // ham anahtar; çeviri gösterimde
        },
        offer(q) {
            return `${T`"Haritada bir yer var. Nerede olduğunu sana söylemeyeceğim — söylersem başkası da öğrenir.<br><br>
                Şu kadarını bilmelisin: benim kalemden bir günlük yol içinde. Gez, ara.
                Yaklaştıkça adamlarım sana haber uçuracak."`}`;
        },
        desc(q) { return `${T`Gizli noktayı ara. Son haber:`} <b>${T(q.data.hint)}</b>`; },
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

    // 3 — Terfi ağacını kullan
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
            return `${T`20+ seviye asker: <b>${n}/${q.data.need}</b> — sonra ${T(Nobles.lord(q.giverId).name)}'a dön`}`;
        },
        on(q, ev, d) {
            if(ev === 'entered_location' && d.locId === q.data.locId) {
                if(state.player.party.filter(t => t.level >= 20).length >= q.data.need) return 'done';
            }
        }
    },

    // 4 — Kendi ordun yemeği yerken taşı
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
            return `${T`${T(q.data.locName)}'a yemek götür: <b>${f}/${q.data.need}</b> (grubun her gün yiyor)`}`;
        },
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

    // 5 — İki çözümü olan görev: kazan ya da bilerek esir düş
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
        desc(q) { return `${T`${T(q.data.npcName)} çetesini yen — <i>ya da</i> onlara teslim olup içeriden kaç`}`; },
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

    // 6 — Kaybetmeyi becer
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
        desc(q) { return `${T`Bir turnuvada <b>${q.data.lo}-${q.data.hi}</b> skorla elen (kazanma!)`}`; },
        on(q, ev, d) {
            if(ev === 'tournament_end') {
                if(!d.won && d.score >= q.data.lo && d.score <= q.data.hi) return 'done';
                return 'fail';
            }
        }
    },

    // 7 — Yalan bilgi yay
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
            q.data = { about: t.id, aboutName: t.name, told: [], need: Math.max(2, targets.length) };
        },
        offer(q) {
            return `${T`"${q.data.aboutName} sınırda dolaşıyor. Nerede olduğunu ben biliyorum. Onun adamları bilmiyor.<br><br>
                Git, kendi krallığından <b>${q.data.need} lorda</b> onu yanlış yerde gördüğünü söyle.
                Ordularını boş ovaya yürütsünler.<br><br>
                Bir uyarı: yalan dolaşır. Bir süre sonra sana da yalan söylemeye başlarlar."`}`;
        },
        desc(q) { return `${T`${T(q.data.aboutName)} hakkında yalan yay:`} <b>${q.data.told.length}/${q.data.need}</b> lord`; },
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

    // 8 — Deli Hüsnü'nün tavukları (kısa turnuva varyantı)
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
        desc(q) { return T`${T(LOCATIONS.find(l=>l.id===q.data.locId).name)}'da tavuk kovala (15 sn, 8 tavuk)`; },
        on(q, ev, d) {
            if(ev === 'chickens_caught' && d.won) return 'done';
            if(ev === 'chickens_caught') alert(T('Tavuklar kazandı. Tekrar dene.'));
        }
    },

    // 9 — Köyü savun
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
        desc(q) { return `${T`${T(q.data.locName)} yakınında bekle ve 2 baskını püskürt:`} <b>${q.data.waves}/2</b>`; },
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

    // 10 — Kayıp mektup
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
                ? `${T`Mektup sende — <b>${T(q.data.toName)}</b>'a götür`}`
                : `${T`Mektubu <b>${T(q.data.pickName)}</b> köyünde bul`}`;
        },
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

    // 11 — Ozandan şiir öğren
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
        desc(q) { return T`Meyhanede ozandan bir şiir öğren ve ${T(Nobles.lord(q.giverId).name)}'a oku`; },
        on(q, ev, d) {
            if(ev === 'poem_recited_lord' && d.lordId === q.giverId) return 'done';
        }
    }
};

// --- LONCA GÖREVLERİ (giver: 'guild_<locId>') ---
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
    desc(q) { return `${T`Çapulcu grubu dağıt: <b>${q.data.got}/${q.data.need}</b>`}${q.data.got >= q.data.need ? T` · sonra <b>${T(q.data.locName)}</b>'a git` : ''}`; },
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
        return T`${T(q.data.locName)}'a <b>${q.data.need} ${T(q.data.itemName)}</b> getir (çantanda ${inv ? inv.qty : 0})`;
    },
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

const Quests = {

    active() { return state.player.quests; },

    // Görev veren bir lord olabilir, bir şehrin lonca ustası da olabilir.
    // Lonca ustasının ilişkisi yoktur; ödül olarak yalnızca dinar ve nam verir.
    giver(id) {
        if(String(id).indexOf('guild_') === 0) {
            let loc = LOCATIONS.find(l => l.id === String(id).slice(6)) || { id: '', name: '?', faction: null };
            return { id, name: T`Lonca Ustası (${T(loc.name)})`, personality: 'guild',
                     faction: loc.faction, homeLocId: loc.id, isGuild: true };
        }
        return Nobles.lord(id);
    },

    // "Geri" tuşu: lorda diyaloga, lonca ustasında hana döner
    back(giverId) {
        let g = this.giver(giverId);
        if(g && g.isGuild) {
            let loc = LOCATIONS.find(l => l.id === g.homeLocId);
            return loc ? Game.openTavern(loc) : Game.closeModal();
        }
        Nobles.talk(giverId);
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

    // ---------- Teklif ----------
    // Görev verenin adının tek gösterim kapısı: lonca ustasınınki bileşiktir ve
    // `giver()` içinde zaten çevrilir, lordunki ham veri tablosundan gelir.
    giverName(g) { return g.isGuild ? g.name : T(g.name); },

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
        // Teklif lord başına sabitlenir. Eskiden her açılışta yeni zar
        // atılıyordu; modalı kapatmak ceza da doğurmadığı için oyuncu
        // istediği görev çıkana kadar menüyü açıp kapatabiliyordu.
        state.questOffers = state.questOffers || {};
        let q = state.questOffers[giverId] || this.pick(giverId);
        if(!q) {
            return Game.showModal(`<h3>📜 ${this.giverName(giver)}</h3>
                <p style="font-style:italic">${T`"Yok. Git başımdan."`}</p>
                <button class="btn" style="margin-top:1rem" onclick="Quests.back('${giverId}')">${T`Geri`}</button>`);
        }
        // Bekleyen teklif tazelenir: eski bir teklif kısalmış süreyle başlamasın
        q.startDay = state.time.day;
        q.deadline = state.time.day + QUESTS[q.id].days;
        state.questOffers[giverId] = q;
        state.pendingQuest = q;
        let def = QUESTS[q.id];
        Game.showModal(`<div style="display:flex;gap:1.2rem;align-items:flex-start">
                ${Nobles.portraitCss(giver, 110)}
                <div style="flex:1">
                    <h3 style="margin:0">📜 ${T(def.title)}</h3>
                    <div style="font-size:0.8rem;color:var(--text-muted)">${T`${this.giverName(giver)} · süre ${def.days} gün${
                        giver.isGuild ? '' : ` · ${Nobles.traitOb(giverId).icon} ${T(Nobles.traitOb(giverId).name)}`}`}</div>
                </div></div>
            ${giver.isGuild ? '' : `<p id="lord-line" style="margin-top:1rem;font-style:italic;color:var(--primary);min-height:1.5em"></p>`}
            <p style="margin-top:1rem;line-height:1.6;font-style:italic">${def.offer(q, giver)}</p>
            <div style="background:rgba(0,0,0,0.3);padding:0.8rem;border-radius:8px;margin-top:1rem;font-size:0.9rem">
                ${T`Ödül:`} <b style="color:#ffcc00">${T`${def.reward.money} dinar`}</b> ·
                <b style="color:${def.reward.renown < 0 ? 'var(--danger)' : '#3498db'}">${T`${def.reward.renown > 0 ? '+' : ''}${def.reward.renown} nam`}</b>${def.reward.rel ? ` ·
                <b style="color:#2ecc71">${T`+${def.reward.rel} ilişki`}</b>` : ''}
            </div>
            <div style="display:flex;gap:1rem;margin-top:1rem">
                <button class="btn primary" onclick="Quests.accept()">${T`Kabul Ediyorum`}</button>
                <button class="btn" onclick="Quests.decline('${giverId}')">${T`Reddet`}</button>
            </div>`, '680px');
        // Lordun ön sözü: karakter özelliği + oyuncunun ağırlığı (#59)
        if(!giver.isGuild) Game.typeIn('lord-line', `"${Nobles.lineFor('quest', giverId)}"`);
    },

    // Belirli bir lorddan zorla görev üret (drahoma görevi için)
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
            return true;
        });
        if(!pool.length) return null;
        let id = pool[Math.floor(Math.random() * pool.length)];
        let q = { id, giverId, startDay: state.time.day, deadline: state.time.day + QUESTS[id].days, data: {} };
        QUESTS[id].setup(q, giver);
        return q;
    },

    accept() {
        let q = state.pendingQuest;
        if(!q) return;
        state.pendingQuest = null;
        if(state.questOffers) delete state.questOffers[q.giverId];
        state.player.quests.push(q);
        Game.trainAttr('int', 1);   // görev almak zekâyı geliştirir
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

    // ---------- Olay dağıtımı ----------
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
        state.player.quests = state.player.quests.filter(x => x !== q);
        state.questCooldown = state.questCooldown || {};
        state.questCooldown[q.giverId] = state.time.day + 3;

        state.player.money += def.reward.money;
        state.player.renown = Math.max(0, state.player.renown + def.reward.renown);
        let g = this.giver(q.giverId);
        if(!g.isGuild) Nobles.addRel(q.giverId, def.reward.rel);
        if(def.onDone) def.onDone(q);
        Game.addHonor('questDone');   // verilen sözü tutmak şeref kazandırır (#53/1.5)
        Game.trainAttr('int', 2);   // görev bitirmek zekâyı geliştirir

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

    // ---------- Ekran ----------
    render() {
        let el = document.getElementById('quest-list');
        if(!el) return;
        // Hedef zinciri görevlerin üstünde durur — "şimdi ne yapayım"ın cevabı (#53/1.4)
        let amb = Game.ambitionHtml();
        if(!state.player.quests.length) {
            el.innerHTML = amb + `<p style="color:var(--text-muted)">${T`Üstlendiğin bir görev yok.
                Bir şehrin ya da kalenin Lordlar Salonuna git, bir soyluyla konuş ve "Bana bir iş var mı?" de.`}</p>`;
            return;
        }
        el.innerHTML = amb + state.player.quests.map(q => {
            let def = QUESTS[q.id];
            let left = q.deadline - state.time.day;
            return `<div style="background:rgba(0,0,0,0.3);border:1px solid var(--panel-border);border-left:4px solid var(--primary);
                    border-radius:8px;padding:1rem;margin-bottom:0.8rem">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <b style="font-size:1.1rem">${T(def.title)}</b>
                    <span style="font-size:0.85rem;color:${left <= 3 ? 'var(--danger)' : 'var(--text-muted)'}">${T`${left} gün kaldı`}</span>
                </div>
                <div style="font-size:0.85rem;color:var(--text-muted);margin:0.3rem 0">${T`Veren: ${T(Quests.giver(q.giverId).name)}`}</div>
                <div style="margin-top:0.4rem">${def.desc(q)}</div>
                <button class="btn" style="margin-top:0.6rem;font-size:0.8rem;padding:0.3rem 0.8rem;border-color:var(--danger);color:var(--danger)"
                        onclick="Quests.abandon('${q.id}')">${T`Vazgeç`}</button>
            </div>`;
        }).join('');
    }
};
