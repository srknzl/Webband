// ============================================
// WEBBAND - BATTLE ENGINE AND TOURNAMENT
// ============================================
// Split out of app.js (#41): Battle + TournamentMinigame. Both reach
// `battle-canvas` and Game/state from inside their function bodies — so
// loading them AFTER app.js is enough; there's no load-order dependency between them.
// --- BATTLE ---
const Battle = {
    canvas: null, ctx: null, units: [], projectiles: [], bloodStains: [], floatingTexts: [], active: false, loopId: null, clickHandler: null, commandListener: null, currentCommand: 'charge',
    swings: [], sparks: [], corpses: [], knockedOut: false, grass: null,
    // Keep formations and command opportunities relevant: played battles take roughly
    // one-third longer without changing troop ratios or the auto-resolve model.
    DAMAGE_PACE: 0.75,
    // Damage alone could not slow a fight down much — a battle is mostly closing distance and
    // the melt at the end. What reads as "too fast" is the cadence: everyone hacking at once.
    // SWING_PACE stretches every attack cooldown — the AI's and the player's — so a swing is a
    // decision again: there is time to raise the shield, step out, or give an order between hits.
    // Deliberately NOT unit speed: slowing movement makes the field feel like mud.
    SWING_PACE: 1.6,

    // Camera (#4): the field used to render at 1:1 — the whole arena visible at once, every
    // unit tiny. Now zoomed in on the player; drawMinimap() compensates for the lost overview.
    // A literal ~10x would put less than one melee range on screen, so this is tuned down for playability.
    // Pulled back from 3 (#132 mobile report: too tight, especially on a narrow phone screen
    // where the same zoom shows less absolute area than on a desktop monitor) — still closer
    // than the old 1:1, just with more of the field visible around the player.
    CAM_ZOOM: 2.3,
    // How many of a backed lord's men join your side (#32 report): a third of his host, at
    // least 3, at most 20 — his other men are still busy with the rest of the enemy.
    ALLY_SHARE: 0.35, ALLY_CAP: 20,
    allyShare(size) { return Math.min(size, this.ALLY_CAP, Math.max(3, Math.round(size * this.ALLY_SHARE))); },
    DIE_T: 0.7,   // seconds a fallen unit keeps being drawn while it tips over (1.32.0)
    SPRITE_FOOT: 14,   // a Swordsman frame's feet sit this far below the unit's point (the old tile's feet)
    // A rounded-rectangle path (soft pass, 1.32.0). Falls back to a plain rectangle where
    // Canvas2D has no roundRect (Safari < 16).
    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        if(ctx.roundRect) ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); else ctx.rect(x, y, w, h);
    },
    // Touch screens (1.31.5 report: "far too close on the phone"): the zoom is picked so the
    // screen's short side shows MOBILE_VIEW arena px — ~1.4 on a 390-px-wide iPhone instead of
    // 2.3 — never closer than CAM_ZOOM, never below 1.2. Desktop keeps CAM_ZOOM.
    MOBILE_VIEW: 280,
    camZoomFor(W, H) {
        return Game.isTouch() ? Math.max(1.2, Math.min(this.CAM_ZOOM, Math.min(W, H) / this.MOBILE_VIEW)) : this.CAM_ZOOM;
    },

    // ---- Renderer seam (1.33.0). Battle keeps every piece of state and every animation clock;
    // drawing goes through one of two objects with the same shape — { resize(w, h),
    // render(battle, now), info(), destroy() }: `canvasGfx` below (the Canvas2D code, the
    // fallback) or `BattleGL` (battle-gl.js, PixiJS 8 on its own #battle-gl canvas — one
    // canvas can't hold both a 2d and a webgl context, and #battle-canvas also serves the
    // chicken chase through Game.battleCtx()). Setting: Game.opt('renderer'),
    // 'auto' | 'pixi' | 'canvas'; a `?renderer=` URL parameter overrides it for the session.
    rendererWanted() {
        let q = typeof location !== 'undefined' && /[?&]renderer=(auto|pixi|canvas)\b/.exec(location.search || '');
        return q ? q[1] : Game.opt('renderer');
    },
    // 'pixi' or 'canvas'. 'auto' = Pixi when a hardware WebGL context can be created; 'pixi'
    // takes any WebGL, a software rasterizer included. Without one — or once Pixi failed or
    // lost its context this session — Canvas2D.
    rendererKind() {
        let want = this.rendererWanted(), gl = Game.webgl();
        if(want === 'canvas' || this._glBroken || !gl.ok || typeof PIXI === 'undefined' || typeof BattleGL === 'undefined') return 'canvas';
        return want === 'pixi' || !gl.soft ? 'pixi' : 'canvas';
    },
    // Starts (or tears down) the WebGL renderer to match the setting. Pixi's init is async, so
    // this runs ahead of the first battle (applySettings); until it's ready the battle draws
    // through Canvas2D, and liveGfx() swaps over on the first frame after.
    prepareGfx() {
        if(typeof BattleGL === 'undefined') return;
        if(this.rendererKind() === 'pixi') BattleGL.init(document.getElementById('battle-gl')).catch(e => this.glFailed(e));
        else if(BattleGL.app) BattleGL.destroy();   // frees the GPU; the element is swapped for a fresh one
        if(this.active) { this.listen(true); this.liveGfx(); }
    },
    glFailed(e) {
        this._glBroken = true;
        Debug.log('render', T('WebGL çizici başlatılamadı — Canvas2D ile devam'), { err: String((e && e.message) || e) });
        if(this.active) this.liveGfx();
    },
    liveGfx() {
        let g = this.rendererKind() === 'pixi' && BattleGL.ready ? BattleGL : this.canvasGfx;
        if(this.gfx !== g) { this.gfx = g; this.showSurface(g === this.canvasGfx ? 'canvas' : 'gl'); }
        return g;
    },
    // Exactly one of the two battle canvases is shown. The hidden #battle-canvas still carries
    // the field's size (width/height), which camera, clamps and the mouse mapping read.
    showSurface(which) {
        let c = document.getElementById('battle-canvas'), gl = document.getElementById('battle-gl');
        if(c) c.hidden = which !== 'canvas';
        if(gl) gl.hidden = which !== 'gl';
    },
    // The canvas the player sees — mouse coordinates are measured against its box.
    surfaceEl() {
        let gl = document.getElementById('battle-gl');
        return gl && !gl.hidden ? gl : document.getElementById('battle-canvas');
    },
    surfaces() { return [document.getElementById('battle-canvas'), document.getElementById('battle-gl')].filter(Boolean); },
    listen(on) {
        this.surfaces().forEach(c => {
            c[on ? 'addEventListener' : 'removeEventListener']('mousedown', this.clickHandler);
            c[on ? 'addEventListener' : 'removeEventListener']('contextmenu', this.menuHandler);
        });
    },
    // CPU ms per drawn frame, smoothed — the debug report's render.battleRenderer (1.33.0).
    cpu: { update: 0, render: 0 },
    cpuSample(u, r) { this.cpu.update += (u - this.cpu.update) * 0.05; this.cpu.render += (r - this.cpu.render) * 0.05; },
    gfxInfo() {
        let g = this.gfx || this.canvasGfx, i = g.info();
        return { setting: this.rendererWanted(), active: g.name, gpu: Game.webgl().gpu || '-', resolution: i.resolution, drawCalls: i.drawCalls,
                 cpuMsUpdate: Math.round(this.cpu.update * 100) / 100, cpuMsRender: Math.round(this.cpu.render * 100) / 100 };
    },

    // Rival suitor duel: 1-on-1, no group, no loot
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
            // The lone foe must be infantry: if an archer comes up from the pool it kites you forever in 1v1
            e.name = lord.name; e.type = 'infantry';
            e.defense = 8; e.speed = 70; e.radius = 9; e.color = '#ff8800';
            e.tier = 1;   // a lord in a formal duel: fixed "normal" look, not level-derived (#132)
        }
        document.getElementById('battle-log-left').innerHTML = `<b>${T`🗡️ Şeref Düellosu:`}</b> ${T(lord.name)}`;
    },

    // Arena (#26): free practice fight in the city's sand ring. Reuses the
    // same duel infrastructure — no group enters, no loot/capture/honor, only proficiency XP.
    // `tier` is each foe's own fixed weak/normal/armored look (#132) — the ladder is real
    // (harder fights pay more xp), but the art doesn't derive from that live difficulty number.
    ARENA_FOES: [
        { name: 'Acemi Dövüşçü',   dLv: -3, xp: 80,  tier: 0, desc: 'Kolay lokma, az ter.' },
        { name: 'Arena Gediklisi', dLv: 2,  xp: 180, tier: 1, desc: 'Senden bir gömlek üstün.' },
        { name: 'Arena Şampiyonu', dLv: 8,  xp: 340, tier: 2, desc: 'Dayak yersin ama çok şey öğrenirsin.' }
    ],
    // The rig behind both the arena and the tournament (#122): the party steps out, one
    // wooden-weapon opponent steps in. `foe.lv` is an absolute level, `foe.dLv` one relative
    // to the player — a fixed ladder is written the second way, a drawn bracket the first.
    soloFoe(foe, color) {
        this._duelParty = state.player.party;
        state.player.party = [];
        this.start(foe.name, 1);
        let e = this.units.find(u => !u.isPlayerTeam);
        if(!e) return;
        let lv = Math.max(1, foe.lv || state.player.stats.level + (foe.dLv || 0));
        e.level = lv;
        e.hp = e.maxHp = 50 + lv * 6;
        e.attack = 10 + lv;
        e.defense = 6 + Math.floor(lv / 3);
        // Wooden weapon: blunt, i.e. it knocks out instead of killing — nobody dies on the sand
        e.name = foe.name; e.type = 'infantry'; e.dmgType = 'blunt';
        e.speed = 70; e.radius = 9; e.color = color || '#ffcc55';
        // The foe's own fixed tier (#132) if it has one (ARENA_FOES does); otherwise a plain
        // "normal" look — never derived from `lv`, which is precisely what varies here.
        e.tier = foe.tier !== undefined ? foe.tier : 1;
    },
    startArena(idx) {
        let f = this.ARENA_FOES[idx] || this.ARENA_FOES[1];
        this.isArena = f;
        this.soloFoe(f);
        document.getElementById('battle-log-left').innerHTML = `<b>${T`🤺 Arena:</b> ${T(f.name)} — kum meydanı, tahta silahlar, ganimet yok.`}`;
    },
    // One round of the bracket (#122). Same sand, same wooden weapons; what differs is where
    // the result goes — `Game.tourneyRoundDone` puts it back on the board instead of the map.
    startTourneyFight(foe) {
        this.isTourney = foe;
        let match = foe.teamFight || { size:1, player:{ name:'Mavi Takım', color:'#2497ff' },
                                      enemy:{ name:'Kırmızı Takım', color:'#ff3b4f' }, allies:[], enemies:[] };
        this.soloFoe(foe, match.enemy.color);
        let player = this.units.find(u => u.id === 'player');
        let captain = this.units.find(u => !u.isPlayerTeam);
        // Tournament issue is supplied by the arena: personal armour, weapon, shield and horse
        // never enter the ring. Levels still matter, but everybody gets the same padded armour
        // and blunt wooden sword; mounts are forbidden for both teams.
        const standardise = (u, color) => {
            if(!u) return;
            u.color = color; u.defense = 8; u.dmgType = 'blunt'; u.hasShield = false;
            u.type = 'infantry'; u.mounted = false; u.radius = 7;
            u.tier = 1;   // standard-issue tournament kit for everyone — fixed, not level-derived (#132)
        };
        if(player) {
            standardise(player, match.player.color);
            player.attack = 10 + Game.attr('str');
            player.speed = this.footSpeed();
            this.arrows = 0;
        }
        standardise(captain, match.enemy.color);
        const addFighter = (f, team, color, idx) => {
            let lv = Math.max(1, f.lv || state.player.stats.level);
            let u = {
                id: `tourney_${team ? 'ally' : 'enemy'}_${idx}`, name:f.name, isPlayerTeam:team,
                hp:50 + lv * 6, maxHp:50 + lv * 6, attack:10 + lv,
                defense:8, speed:70, radius:7, type:'infantry', mounted:false,
                dmgType:'blunt', hasShield:false, color, atkCd:Math.random() * 0.6,
                x:team ? 110 + Math.random() * 90 : this.canvas.width - 200 + Math.random() * 90,
                y:70 + Math.random() * Math.max(1, this.canvas.height - 140), level:lv
            };
            standardise(u, color);
            this.units.push(u);
        };
        (match.allies || []).forEach((f, i) => addFighter(f, true, match.player.color, i));
        (match.enemies || []).forEach((f, i) => addFighter(f, false, match.enemy.color, i));
        document.getElementById('battle-log-left').innerHTML =
            `<b>${T('🏆 Turnuva:')} ${T(foe.round)} · ${match.size}×${match.size}</b><br>
             <span style="color:${match.player.color}">● ${T(match.player.name)}</span>
             <span style="color:var(--text-muted)"> — </span>
             <span style="color:${match.enemy.color}">● ${T(match.enemy.name)}</span><br>
             <span style="color:var(--text-muted)">${T('Standart turnuva seti: tahta kılıç, dolgulu zırh, at yok.')}</span>`;
    },

    start(enemyName, enemyCount, bossLevel = null, faction = null, siegePlan = null, auto = false, enemyBand = null) {
        Input.keys = {}; // Clear keys
        this.canvas = document.getElementById('battle-canvas');
        this.ctx = Game.battleCtx();   // single gate to the shared canvas (#54)
        Game.showScreen('battle');
        // into the field through a short curtain (2.1); an auto-resolved fight is never shown
        if(!auto) Game.curtain(bossLevel ? T('Son savaş') : siegePlan ? T('Kuşatma') : T('Savaş!'), T`${enemyCount} düşmana karşı`);
        this.isBossFight = !!bossLevel;
        
        let vc = document.getElementById('view-container'), bui = document.getElementById('battle-ui');
        // on a phone the bar floats over the field (2.1) and takes no height from it
        let uiHeight = Game.floatsOver(bui) ? 0 : ((bui && bui.offsetHeight) || 50);
        
        let clientH = vc.clientHeight || window.innerHeight;
        let W = vc.clientWidth || 800;
        let H = Math.max(300, clientH - uiHeight);
        
        this.canvas.width = W;
        this.canvas.height = H;

        this.units = [];
        this.projectiles = [];
        this.bloodStains = [];
        this.floatingTexts = [];
        this.swings = [];
        this.sparks = [];
        this.corpses = [];
        this.knockedOut = false;
        this.autoLoss = null;
        // The siege wall is baked into `ground`. Clear that canvas between every battle:
        // otherwise a normal battle at the same resolution reuses the previous siege field.
        this.grass = null;
        this.ground = null;
        this.currentCommand = 'charge';
        // Camera (#4): recentered fresh every battle, otherwise it opens on wherever the
        // previous fight's player unit died.
        this.camZoom = this.camZoomFor(W, H);
        this.cam = { x: W / 2, y: H / 2 };
        this.shakeT = undefined;
        // Commands aren't ready at the start of battle: each one becomes available
        // as an "opportunity" at its own random moment. The horn call comes from inside the battle, not a menu.
        // An order needs someone to obey it (#114). The duel and the arena empty the party
        // before the fight, so "⚑ Fırsat: Hücum Edin" was being shouted across a one-on-one
        // with nobody standing behind the player. The party is the single gate rather than an
        // `isDuel` check, because a player caught alone on the road has no one to command either.
        this.cmdSlots = state.player.party.length === 0 ? [] : [
            // The name stays raw; it's translated via `T` at every display site (otherwise it would pass through translation twice)
            { key: '2', cmd: 'charge', name: 'Hücum Edin',      at: 1.0 + Math.random() * 1.5 },
            { key: '1', cmd: 'follow', name: 'Beni Takip Edin', at: 2.5 + Math.random() * 2.5 },
            { key: '3', cmd: 'hold',   name: 'Mevzi Koruyun',   at: 4.0 + Math.random() * 3.5 }
        ];
        // The touch command pad is static markup, so it has to be hidden by hand when there is
        // nothing to command — otherwise three dead buttons sit under the player's thumb.
        let tc = document.getElementById('tcmds');
        if(tc) tc.style.display = this.cmdSlots.length ? '' : 'none';
        this.battleTime = 0;
        // Ambush (Game.checkAmbush): a band you failed to notice catches you out in the open
        this.ambushed = !!state.ambush; state.ambush = false;
        // Siege (#25): wall + breach terrain, a positional bonus for the defender. The plan comes from Game.SIEGE_PLANS.
        // Reset every battle (#5): otherwise a siege's castle scene/banner bleeds into the next, unrelated field fight.
        this.siege = siegePlan ? { name: siegePlan.name, defBonus: siegePlan.defBonus, gaps: siegePlan.gaps } : null;
        this.siegeBannerColor = null;
        // What each side's foot soldiers are dyed in (visual refresh): the player's kingdom, or gold
        // for an unsworn warband; the enemy's kingdom, or bandit brown when it has none.
        let pf = Game.playerFaction();
        this.playerCloth = Swordsman.DYE[pf] ? pf : 'player';
        this.enemyCloth = faction && Swordsman.DYE[faction] ? faction : 'bandit';
        if(this.siege) {
            let wx = Math.round(W * 0.66);
            let gaps = [{ y: H / 2, h: 74, gate: true }];
            if(this.siege.gaps > 1) gaps.push({ y: Math.round(H * 0.22), h: 118, gate: false });   // tower ramp
            // Which equipment silhouette sits at the gate (#118) rides the same plan.gaps signal
            // that already decides whether there's a second breach: a tower plan builds a ramp,
            // a ladder plan only ever climbs the one gate.
            this.siege.wall = { x: wx, t: 26, gaps, equip: this.siege.gaps > 1 ? 'tower' : 'ladder' };
            this.siegeBannerColor = (faction && FACTIONS[faction] && FACTIONS[faction].color) || '#b23b3b';
        }
        this.active = true;
        this.pendingEnd = undefined;   // a stale delayed-end flag from a previous fight must not carry over (#114)

        // In an ambush the player isn't caught at the edge but in the middle of the arena (needed for the circle)
        // The arena/tournament ring (#132) is its own circle — the open-field spawn offsets can
        // land outside it, so both sides spawn at a fixed fraction of the ring's own radius instead.
        let ringSpawn = (this.isArena || this.isTourney) ? this.arenaRing(W, H) : null;
        let startPlayerX = ringSpawn ? ringSpawn.cx - ringSpawn.r * 0.5
                         : this.siege ? 120
                         : this.ambushed ? W/2 : (enemyCount < 30 ? W/2 - 200 - Math.random()*100 : 80);
        // In a siege the defender spawns behind the wall, the attacker out in the field
        let startEnemyX = ringSpawn ? ringSpawn.cx + ringSpawn.r * 0.5
                        : this.siege ? this.siege.wall.x + 60
                        : (enemyCount < 30 ? W/2 + 100 + Math.random()*100 : W - 160);

        // Procedural Terrain Generation — skipped in the arena/tournament ring (#132): a sand
        // pit has no hills, forest or river, and an invisible rock would make no sense there.
        this.terrain = { hills: [], pits: [], forests: [], rivers: [], mountains: [], rocks: [] };
        if(!this.isArena && !this.isTourney) {
        for(let i=0; i<3+Math.random()*6; i++) {
            this.terrain.hills.push({ x: Math.random()*W, y: Math.random()*H, r: 50+Math.random()*80 });
        }
        for(let i=0; i<2+Math.random()*4; i++) {
            this.terrain.pits.push({ x: Math.random()*W, y: Math.random()*H, r: 20+Math.random()*40 });
        }
        for(let i=0; i<2+Math.random()*3; i++) {
            this.terrain.forests.push({ x: Math.random()*W, y: Math.random()*H, r: 60+Math.random()*60 });
        }
        // Mountain (#118): unlike a hill's flat patch, speed falls off toward a single summit —
        // 1 at the foot, down to 0.45 at the peak. At most one per field, drawn with contour rings.
        if(Math.random() > 0.5) {
            this.terrain.mountains.push({ x: 60+Math.random()*Math.max(1,W-120), y: 60+Math.random()*Math.max(1,H-120), r: 90+Math.random()*90 });
        }
        // Impassable rocks — adds positioning and tactical variety.
        // Not placed in the spawn lanes (150 units from the edges).
        for(let i=0; i<2+Math.random()*3; i++) {
            this.terrain.rocks.push({
                x: 150 + Math.random()*Math.max(1, W-300),
                y: 40 + Math.random()*Math.max(1, H-80),
                r: 18 + Math.random()*20
            });
        }

        // 50% chance of a river (a randomly vertical or horizontal cutting strip)
        if(Math.random() > 0.5) {
            let isVertical = Math.random() > 0.5;
            if(isVertical) {
                let rx = W*0.3 + Math.random()*(W*0.4); // Near the middle
                this.terrain.rivers.push({ x: rx, y: 0, w: 60+Math.random()*40, h: H, isVertical: true });
            } else {
                let ry = H*0.3 + Math.random()*(H*0.4);
                this.terrain.rivers.push({ x: 0, y: ry, w: W, h: 60+Math.random()*40, isVertical: false });
            }
        }
        // A rock is the only impassable thing on the field. Standing in the water it reads as part of
        // the river — the player walks into the ford and stops dead against nothing he can see.
        // The river is the one place a rock may not sit.
        this.terrain.rocks = this.terrain.rocks.filter(k => !this.terrain.rivers.some(r =>
            k.x + k.r > r.x && k.x - k.r < r.x + r.w && k.y + k.r > r.y && k.y - k.r < r.y + r.h));
        }
        
        // Siege field: no river/rocks at the wall's foot, cover stays only on the besieging side
        if(this.siege) {
            let wx = this.siege.wall.x;
            this.terrain.rivers = [];
            this.terrain.rocks = [];
            this.terrain.hills = this.terrain.hills.filter(h => h.x < wx - 120);
            this.terrain.pits = this.terrain.pits.filter(p => p.x < wx - 100);
            this.terrain.forests = this.terrain.forests.filter(f => f.x < wx - 160);
            this.terrain.mountains = this.terrain.mountains.filter(m => m.x < wx - 200);
        }

        let weaponAtk = state.player.equipment.weapon ? state.player.equipment.weapon.attack : 0;
        let armorDef = ['shield','armor','helmet','gloves','boots']
            .reduce((n, slot) => n + ((state.player.equipment[slot] || {}).defense || 0), 0);

        // Mount: if there's a horse the player enters as cavalry — the engine already knows cavalry (and being unhorsed)
        let mounted = !!state.player.equipment.horse;
        // Each horse tier carries its own speed/armor bonus (#132) instead of one shared scalar
        let hSpd = 1 + (mounted ? (state.player.equipment.horse.hSpd || 0) / 100 : 0);
        let hDef = 1 + (mounted ? (state.player.equipment.horse.hDef || 0) / 100 : 0);
        armorDef = Math.round(armorDef * hDef);
        // The quiver fills per battle; zero if there's no bow
        // Skill tree #110: Ranger perks add flat arrows
        this.arrows = this.playerHasBow() ? 24 + this.prof('bow') * 2 + Game.perkMod('arrowCount') : 0;
        this.blockHeld = false;

        // Player
        // A horse adds a flat +33% of max HP as a buffer on top of whatever health you're
        // already carrying (#132) — riding in wounded still means riding in with a cushion,
        // not 33% of an already-small number. `dismountFloor` is the entry hp *before* that
        // bonus was added — the dismount check below compares against it, so a wounded rider
        // dismounts once the buffer specifically is spent, not at their theoretical full health
        // (which a wounded player's buffered hp could already be at or under on frame one).
        let baseMaxHp = state.player.stats.maxHp;
        let dismountFloor = state.player.stats.hp;
        let mountHpBonus = mounted ? baseMaxHp * 0.33 : 0;
        this.units.push({
            id: 'player', isPlayerTeam: true, name: state.player.name,
            hp: state.player.stats.hp + mountHpBonus, maxHp: baseMaxHp + mountHpBonus, baseMaxHp, dismountFloor,
            x: startPlayerX, y: H/2,
            // Skill tree #110: Ranger perks scale riding/foot speed. Nerfed ~20% (#132) — mounted
            // was overwhelmingly faster than foot at every riding level, not just at the top end.
            speed: mounted ? (80 + Game.attr('agi') * 0.5 + (this.prof('riding') - 1) * 2) * (1 + Game.perkMod('ridingSpeed')) * hSpd
                           : this.footSpeed(),
            attack: 10 + Game.attr('str') + weaponAtk,
            defense: armorDef, type: mounted ? 'cavalry' : 'infantry', mounted,
            dmgType: this.playerDmgType(),
            hasShield: this.playerHasShield(),
            color: '#ffcc00', radius: mounted ? 9 : 8, atkCd: 0,
            isAttacking: false, attackTimer: 0, swingCd: 0, angleToMouse: 0, currentWeaponAngle: 0
        });
        this._horseDied = false;   // rolled when the player is thrown (#132), read in endBattle

        // Troop kills/XP/casualties are watched from a single log this battle, read back
        // in endBattle() for the detail tab (#120).
        this._battleLog = { deaths: [], xpGain: {}, xpStart: {}, playerKills: 0 };
        this._odds = { foes: enemyCount, own: state.player.party.filter(p => !p.wounded).length + 1 };   // #127
        state.player.party.forEach(p => { this._battleLog.xpStart[p.id] = { level: p.level, name: p.name }; });

        // Troops (Player's party) — the wounded don't join the battle, they heal in camp
        state.player.party.filter(p => !p.wounded).forEach((p, i) => {
            // A troop is exactly its class (#124): level only decides when a promotion opens, so
            // strength comes from the tree step alone and changes only when the name does.
            let typeInfo = Game.troopStats(p);
            // Hunger and morale were two separate multipliers; both at once dragged HP AND attack to ×0.56 —
            // a losing battle fed on itself. It now floors at 0.7.
            let debuff = Math.max(0.7, (p.debuff ? 0.7 : 1) * Game.moraleMult());

            this.units.push({
                id: p.id, isPlayerTeam: true, name: p.name,
                hp: typeInfo.hp * debuff, maxHp: typeInfo.hp * debuff,
                x: startPlayerX - 20 + Math.random()*60, y: 50 + Math.random()*(H-100),
                // Speed isn't affected by morale: the enemy has no morale, so if it scaled, the same troop
                // would run at two different speeds on the two sides. Morale scales HP and attack (the UI says so too).
                speed: typeInfo.speed, attack: typeInfo.attack * debuff, defense: typeInfo.defense,
                type: typeInfo.type, mounted: typeInfo.type === 'cavalry' || typeInfo.speed > this.FOOT_MAX,
                dmgType: typeInfo.dmgType, brace: typeInfo.brace, color: typeInfo.type === 'cavalry' ? '#33ddff' : typeInfo.type === 'archer' ? '#55ff55' : '#33aaff',
                radius: typeInfo.type === 'cavalry' ? 7 : 5, atkCd: 0, level: p.level, icon: typeInfo.icon, tier: typeInfo.tier   // #132
            });
        });

        // Enemies (Bands vs Faction Lords vs Boss)
        let npc = state.npcParties.find(n => n.id === state.player.currentEncounterNpcId);
        // The button that announced the encounter is authoritative. Falling back to the
        // global encounter id could select a stale wolf party while the modal said bandits.
        let bandKey = enemyBand || (npc && npc.band)
                    || (Object.keys(BAND_KINDS).find(k => BAND_KINDS[k].name === enemyName));
        let band = BAND_KINDS[bandKey];
        let isBandit = !!band;
        for(let i=0; i<enemyCount; i++) {
            let name = 'Çapulcu';   // BAND_KINDS/TROOP_TYPES key — translated on screen via T()
            let hp = 24, speed = 52, attack = 6, defense = 0, type = 'infantry', color = '#ff4444', radius = 5;
            let dmgType = (band && band.dmg) || 'cut', brace;
            let icon = null;   // stays null for every enemy — only the player's own companions/spouse (#132) ever set this
            // Battle art tier (weak/normal/armored, #132) — fixed by the unit's identity (which
            // named row it is), never computed from its live attack/defense or level. A "Nord
            // Serfi" looks the same whether it's a fresh spawn or has fought for 50 days.
            let tier = null;

            if(!bossLevel && isBandit) {
                // Band mix: each kind has its own units; a large band gets its leader up front
                let row;
                if(i === 0 && enemyCount >= 6 && band.leader) {
                    row = band.leader;
                    tier = 2;   // the named leader always reads as the elite of the band
                } else {
                    let total = band.battle.reduce((a2, r) => a2 + r[6], 0);
                    let roll = Math.random() * total;
                    let bIdx = band.battle.findIndex(r => (roll -= r[6]) <= 0);
                    if(bIdx < 0) bIdx = 0;
                    row = band.battle[bIdx];
                    tier = Math.min(2, bIdx);   // fixed by the row's own position in the roster, not by its stats
                }
                name = row[0]; type = row[1]; hp = row[2]; speed = row[3]; attack = row[4]; defense = row[5];
                radius = type === 'cavalry' ? 7 : 5;
                color = band.beast ? '#c9b6a0' : type === 'archer' ? '#ff7744' : type === 'cavalry' ? '#ff5522' : '#ff4444';
            }
            
            let bossData = null;
            if(bossLevel) {
                // No more guards (#132) — enemyCount is always 1 for a boss fight, so this loop
                // never reaches i>0 here. Real per-boss stats/identity come from BOSSES, keyed by
                // whichever boss the player is actually fighting (state.player.currentBoss);
                // `enemyName` is the fallback if that's somehow unresolved.
                bossData = BOSSES[state.player.currentBoss];
                name = enemyName;
                hp = bossData ? bossData.hp : 100 + bossLevel * 10;
                speed = 70;
                attack = bossData ? bossData.attack : 25 + bossLevel;
                defense = bossData ? bossData.defense : 20;
                type = (bossData && bossData.mounted) ? 'cavalry' : 'infantry';
                radius = 10;
                color = '#aa00ff';
            }
            else if(!isBandit) {
                // Faction soldier — from the encountered kingdom's own troop tree
                let pool = Game.factionTroopPool(faction);
                name = pool[Math.floor(Math.random() * pool.length)];
                let ti = TROOP_TYPES[name];
                hp = ti.hp; speed = ti.speed; attack = ti.attack; defense = ti.defense; type = ti.type; dmgType = ti.dmgType; brace = ti.brace;
                tier = ti.tier;   // fixed recruit/mid/elite position in its own tree (#132)
                radius = type === 'cavalry' ? 7 : 5;
                color = '#ff6666';
            }

            // The rank pip over the boss's head and the loot/renown it's worth track bossLevel —
            // there's no guard case to special-case anymore (#132, one enemy, always i===0).
            let enemyLvl = bossLevel ? bossLevel : 1;
            // Nobody but the boss itself scales with the calendar or the player's own strength
            // (#99, extended to faction/lord soldiers in #132). Bandits used to gain a level
            // every 30 days — +4 HP, +0.5 attack, +0.25 defense each, with no ceiling — while an
            // un-upgraded recruit gained nothing at all, so headcount quietly stopped meaning
            // anything. Measured in the real engine, 25 raw peasants against a 14-strong lair
            // band: 98% wins on day 60, 73% on day 120, 23% on day 200. The same party one
            // upgrade up wins 100% on every one of those days. A looter is a looter; the answer
            // to a late-game player is a lord's army, not a peasant with a veteran's HP bar —
            // and now that army's own soldiers don't quietly out-level the player either.
            // `enemyLvl` stays 1 for both, so the block below adds nothing: a faction soldier's
            // TROOP_TREES stats stand on their own, exactly like a bandit's band-roster stats do.

            if(!bossLevel) {
                hp += (enemyLvl - 1) * 4;
                attack += Math.floor((enemyLvl - 1) / 2);
                defense += Math.floor((enemyLvl - 1) / 4);
            }
            // The defender fights behind the wall: the positional bonus depends on the siege method (#25)
            if(this.siege) {
                hp = Math.round(hp * (1 + this.siege.defBonus));
                attack = Math.round(attack * (1 + this.siege.defBonus));
            }
            this.units.push({
                id: 'enemy_'+i, isPlayerTeam: false, name: name,
                beast: !!(band && band.beast),
                charge: (band && band.beast) ? 1.6 : 1.3,   // wolves attack with a pounce
                hp: hp, maxHp: hp,
                // In an ambush the enemy doesn't spawn from a single lane but from a circle around the player
                x: this.ambushed ? Math.max(20, Math.min(W-20, startPlayerX + Math.cos(i*2.4)*(130+Math.random()*110)))
                                 : startEnemyX + Math.random()*80,
                y: this.ambushed ? Math.max(20, Math.min(H-20, H/2 + Math.sin(i*2.4)*(130+Math.random()*110)))
                                 : 50 + Math.random()*(H-100),
                speed: speed, attack: attack, defense: defense, dmgType: dmgType, brace: brace,
                type: type, mounted: type === 'cavalry' || speed > this.FOOT_MAX, icon, tier,
                color: color, radius: radius, atkCd: Math.random()*0.6, level: enemyLvl,
                // Signature dodgable AOE (#132) — ticked by updateBossSpecial(), one config per
                // boss in BOSSES.<key>.special. `state`/`t` are the special's own tiny state
                // machine (idle/telegraph/strike), separate from the unit's own hp/position.
                isBoss: !!bossData, bossKey: bossData ? state.player.currentBoss : null,
                special: bossData ? { ...bossData.special, state: 'idle', t: 1.5 + Math.random() } : null
            });
        }

        // The lord you came to back fights beside you (#32 report, 1.32.1): a share of his host,
        // drawn from his kingdom's troop tree, joins your side. Until 1.32.1 only your own party
        // stood there while his men never took the field.
        let aa = state.player.assistAlly;
        let allyParty = aa && aa.npcId ? state.npcParties.find(n => n.id === aa.npcId && n.size > 0) : null;
        if(allyParty) {
            let names = Game.allyRoster(allyParty.faction, allyParty.level || 1);
            for(let i = 0, n = this.allyShare(allyParty.size); i < n; i++) {
                let nm = names[i % names.length], ti = Game.troopStats({ name: nm });
                this.units.push({
                    id: 'ally_' + i, isPlayerTeam: true, allyOf: allyParty.id, name: nm,
                    hp: ti.hp, maxHp: ti.hp,
                    x: startPlayerX - 20 + Math.random()*60, y: 50 + Math.random()*(H-100),
                    speed: ti.speed, attack: ti.attack, defense: ti.defense, type: ti.type,
                    mounted: ti.type === 'cavalry' || ti.speed > this.FOOT_MAX,
                    dmgType: ti.dmgType, brace: ti.brace, color: '#7ec8a0',
                    radius: ti.type === 'cavalry' ? 7 : 5, atkCd: Math.random() * 0.6,
                    level: allyParty.level || 1, icon: ti.icon, tier: ti.tier, cloth: allyParty.faction
                });
            }
        }

        // Auto-resolve: the same units are set up but the arena never opens, the result is just computed (#30)
        if(auto) return this.autoResolve();
        // Partial engagement: only as many units as capacity allows enter the field, the rest wait in reserve (#30)
        this.splitReserves(H, startPlayerX, startEnemyX);

        // Rout phase: the starting headcount is frozen here (reserves included), and the flee
        // direction is the edge you spawned from — even if you spawned in the middle in an ambush, you flee back the way you came.
        this.routed = { p: false, e: false };
        this.spared = 0;
        this.startN = {
            p: this.units.filter(u => u.isPlayerTeam && u.id !== 'player').length + this.reserves.p.length,
            e: this.units.filter(u => !u.isPlayerTeam).length + this.reserves.e.length
        };
        this.routX = { p: startPlayerX < W / 2 ? 0 : W, e: startEnemyX < W / 2 ? 0 : W };
        this.clearRoutPrompt();

        // The command hint is written per device: there's no such thing as WASD when playing by touch (#65)
        const ipucu = Game.isTouch() ? T('Sol çubuk hareket · Sağ çubuk kılıç · 🛡️ blok')
                                     : T('WASD hareket · Sol tık saldırı');
        document.getElementById('battle-log-left').innerHTML = '<div class="log-msg" style="padding:6px 10px;color:#fff;"><b>'
            + (this.ambushed ? T('Pusuya Düştün! Etrafın sarıldı.') : T('Savaş Başladı!'))
            // Command key hints are only written for keyboard: on touch the same three commands
            // sit as buttons at the bottom of the screen instead (#86).
            + '</b><br>' + ipucu + (Game.isTouch() || !this.cmdSlots.length ? '' : '<br>' + T('[1] Takip · [2] Hücum · [3] Bekle')) + '</div>';
        if(this.siege) document.getElementById('battle-log-left').innerHTML =
            `<div class="log-msg" style="padding:6px 10px;color:#fff;"><b>${T`🏰 Kuşatma — ${T(this.siege.name)}`}</b><br>`
            + T`Sur geçilmez; gedikten gireceksin. Savunanın mevzi avantajı +%${Math.round(this.siege.defBonus*100)}.`
            + `<br>${ipucu}</div>`;
        document.getElementById('battle-log-right').innerHTML = '';

        setTimeout(() => {
            // Arena, tournament and honour duels have an opponent, not an army commander.
            // This also suppresses the three named red command pings in those modes.
            if(this.active && !this.isArena && !this.isTourney && !this.isDuel) {
                let names = [T("Antonius"), T("John"), T("Ragnar"), T("Kel Mahmut"), T("Bozkurt"), T("Topal Rıza"), T("Deli Yürek"), T("Kemikkıran"), T("Kanlı Hasan"), T("Gaius"), T("Bjorn"), T("Dilsiz Suikastçi"), T("Kör Hafız"), T("Barbaros"), T("Turgut")];
                let n1 = names[Math.floor(Math.random()*names.length)];
                let n2 = names[Math.floor(Math.random()*names.length)];
                while(n1 === n2) n2 = names[Math.floor(Math.random()*names.length)];

                let quotes = [
                    T`Bu ezikleri ezelim! ${n1} soldan ilerle, ${n2} sen sağdan dalacaksın!`,
                    T`Bu gerizekalılar bizi yeneceğini mi düşündü gerçekten? ${n1}, ${n2}, parçalayın şunları!`,
                    T`Bugün kılıçlarımız kan içecek! ${n1} okçuları koru, ${n2} hücuma geç!`,
                    T`Haha! Akşama ziyafet var çocuklar! ${n1} sağ kanadı tut, ${n2} esir alma!`,
                    T`Sadece zırhları para eder, kendileri çöp! ${n1}, ${n2}, saldırın!`,
                    T`Şu zavallılara bakın... ${n1} sen soldan vur, ${n2} sen arkadan dolaş!`,
                    T`Yemek molasından önce şunları halledelim! ${n1} önden git, ${n2} destek çık!`,
                    T`Analarını ağlatmaya geldik! ${n1} sol taraftan sar, ${n2} kaçmalarına izin verme!`,
                    T`Bunlar savaşmayı oyun sanıyor herhalde! ${n1}, ${n2}, onlara gerçek savaşı gösterin!`
                ];
                let q = quotes[Math.floor(Math.random()*quotes.length)];

                this.log(`<span style="color:#ffaa00;font-size:1.1rem;display:block;margin-bottom:5px"><b>${T`Düşman Komutanı:`}</b></span><span style="color:#fff;font-style:italic">"${q}"</span>`, 'right');
            }
        }, 1000);

        // Left click swings/shoots, right click holds block (Shift also blocks)
        this.clickHandler = (e) => {
            if(e.button === 2) { e.preventDefault(); this.blockHeld = true; }
            else this.playerAttack(e);
        };
        this.upHandler = () => { this.blockHeld = false; };
        window.addEventListener('mouseup', this.upHandler);
        this.menuHandler = (e) => e.preventDefault();
        this.listen(true);   // both battle canvases: whichever renderer is showing gets the clicks

        this.commandListener = (e) => {
            let slot = this.cmdSlots.find(c => c.key === e.key);
            if(!slot) return;
            if(!slot.open) return this.log(`<span style="opacity:0.7">${T`Şu an "${T(slot.name)}" emrini verecek durumda değilsin.`}</span>`);
            // Shouting the same command twice in a row is pointless
            if(this.currentCommand === slot.cmd) return;
            this.currentCommand = slot.cmd;
            this.log(`${T`🔊 Emir:`} <b>${T(slot.name)}!</b>`);
        };
        window.addEventListener('keydown', this.commandListener);

        this.warmUp();
        this.gfx = null; this.liveGfx();
        this.cpu = { update: 0, render: 0 };
        this.paused = false;
        if(this.loopId) cancelAnimationFrame(this.loopId);
        let last = performance.now();
        const loop = (t) => {
            if(!this.active) return;
            if(Game.skipFrame(t)) { this.loopId = requestAnimationFrame(loop); return; }
            let dt = Math.min((t-last)/1000, 0.05);
            last = t;
            // While the tutorial is open the battle pauses but keeps rendering (#88) — so
            // the character can't be killed while there's something to read on screen.
            Debug.guard('battle loop', () => {
                Anim.tick(dt);
                let t0 = performance.now();
                if(!this.paused) this.update(dt);
                let t1 = performance.now();
                this.render();
                this.cpuSample(t1 - t0, performance.now() - t1);
            });
            this.lastRender = performance.now();     // pulse (#54)
            this.loopId = requestAnimationFrame(loop);
        };
        this.loopId = requestAnimationFrame(loop);
        // First-battle tutorial (#88): opens after the arena is set up and the first frame is
        // drawn, and pauses the battle. Its flag is its own key, separate from the map tutorial.
        setTimeout(() => Game.startTutorial(false, Game.BATTLE_TUTOR, Game.BTUTOR_KEY), 500);
        // Pulse check (#54): so a black screen never silently settles in again. If not even
        // one frame was drawn within 700 ms, the loop is dead — it's rebuilt once and
        // the event lands in the Debug report. (The root cause was closed in #42; this is a net, not a fix.)
        this.lastRender = 0;
        clearTimeout(this._pulseT);
        this._pulseT = setTimeout(() => {
            if(!this.active || this.lastRender || document.hidden) return;   // rAF already stops in a hidden tab, don't false-alarm
            Debug.log('pulse', T('Savaş döngüsü 700 ms boyunca hiç kare çizmedi — döngü yeniden kuruldu'));
            cancelAnimationFrame(this.loopId);
            this.loopId = requestAnimationFrame(loop);
        }, 700);
    },

    playerAttack(e) {
        if(e) e.preventDefault();
        let p = this.units.find(u => u.id === 'player');
        // No new swing before recovery finishes — rapid clicking no longer stacks damage
        if(!p || p.hp <= 0 || p.blocking || p.isAttacking || p.swingCd > 0) return;
        if(this.playerHasBow()) return this.playerShoot(p);

        p.isAttacking = true;
        p.attackTimer = 0.3; // 300ms attack duration
        p.swingCd = this.swingCooldown();
        p.hasHit = false; // So it only hits a single target
        let wm = this.worldMouse();
        p.angleToMouse = Math.atan2(wm.y - p.y, wm.x - p.x);
        this.swings.push({ x: p.x, y: p.y, angle: p.angleToMouse, life: 0.3 });
    },

    // Swing recovery: speeds up as proficiency rises (0.75s → 0.45s)
    // Skill tree #110: melee speed perks shorten the cooldown further
    swingCooldown() {
        let lv = this.playerWeaponProf();
        return Math.max(0.45, 0.75 - lv * 0.005) * this.SWING_PACE / (1 + Game.perkMod('meleeSpeed'));
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
    playerHasShield() { return !!state.player.equipment.shield; },

    // Bow: the quiver is limited, movement and being mounted both hurt accuracy
    playerShoot(p) {
        let lv = this.prof('bow');
        p.swingCd = Math.max(0.5, 1.15 - lv * 0.006) * this.SWING_PACE;
        if(this.arrows <= 0) {
            this.floatingTexts.push({ x: p.x, y: p.y - 20, text: T('ok bitti'), color: '#999', life: 0.6 });
            return;
        }
        this.arrows--;
        let wm = this.worldMouse();
        let a = Math.atan2(wm.y - p.y, wm.x - p.x);
        let moving = Math.abs(p.lastVx || 0) > 0.1 || Math.abs(p.lastVy || 0) > 0.1;
        let spread = (0.04 + (moving ? 0.10 : 0) + (p.type === 'cavalry' ? 0.08 : 0)) * (1 - Math.min(0.6, lv * 0.005));
        a += (Math.random() - 0.5) * spread * 2;
        let speed = 480;   // 1.5x (#118): arrows used to hang in the air long enough to sidestep
        this.projectiles.push({
            x: p.x + Math.cos(a) * 12, y: p.y + Math.sin(a) * 12,
            vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
            // Skill tree #110: Ranger perks add bow damage
            damage: p.attack * (0.5 + Math.min(0.5, lv * 0.005) + Game.perkMod('dmgBow')), dmgType: 'pierce',
            isPlayerTeam: true, sourceId: 'player'
        });
        p.angleToMouse = a;
        p.bowTimer = 0.25;
        p.shotT = 0; p.shotA = a;   // recoil (1.32.0)
    },

    // Armor works by damage type: cut takes it in full, pierce takes half, blunt takes two-thirds
    // `tgt` is only for the difficulty multiplier: if the target is on the player's side it's "damage you take",
    // otherwise "damage you deal". At normal difficulty the multiplier is 1, so the balance table is unchanged.
    afterArmor(dmgType, raw, def, tgt) {
        let t = DMG_TYPES[dmgType] || DMG_TYPES.cut;
        // Armor blunts a blow but never trivializes it (#8): heavy plate used to drop a strong
        // hit to the Math.max(1) floor — "1 damage" — so an axeman could not scratch a knight.
        // A fraction of the type-adjusted raw always lands; armor scales how much between here and full.
        let base = raw * t.mult;
        let landed = Math.max(base - (def || 0) * t.armor, base * this.ARMOR_FLOOR);
        return Math.max(1, Math.round(landed * Game.dmgMult(tgt)));
    },
    ARMOR_FLOOR: 0.18,   // min share of a type-adjusted hit that pierces any armor (#8)

    // Block: an attack is cut off if it lands within the arc the shield faces (0 = full block)
    blockFactor(tgt, sx, sy) {
        if(!tgt.blocking) return 1;
        let a = Math.atan2(sy - tgt.y, sx - tgt.x);
        let diff = Math.abs(a - (tgt.blockAngle || 0));
        while(diff > Math.PI) diff = 2 * Math.PI - diff;
        if(diff > Math.PI / 3) return 1;              // an attack from behind/the side gets through
        return tgt.hasShield ? 0 : 0.4;               // full with a shield, 60% reduction with a bare arm
    },
    blockedFx(tgt, sx, sy) {
        this.spark(tgt.x, tgt.y, Math.atan2(sy - tgt.y, sx - tgt.x), '#dfe6ef');
        this.floatingTexts.push({ x: tgt.x, y: tgt.y - 14, text: T('🛡 blok'), color: '#cfe3ff', life: 0.6 });
        tgt.blockFlash = 0.2;
    },

    // The ceiling for two legs. Anything above it is four-legged (the slowest horse: Mounted Bandit at 88),
    // so in TROOP_TYPES `speed > FOOT_MAX` means "mounted" — `type` alone can't tell you that,
    // because a Khergit Horse Archer shows up as 'archer' and wolves as 'infantry'.
    FOOT_MAX: 85,
    // Charge stamina: sprints for this many seconds, then recovers for this many seconds.
    // The breather is the battle's rhythm: it's the only window for breaking contact (#A1).
    CHARGE_BURST: 2.0, CHARGE_REST: 4.0, CHARGE_TIRED: 0.9,

    // The player's foot speed. The ceiling stays under a horse: a human can't outrun one.
    // Skill tree #110: Scout/Ranger perks scale foot speed
    footSpeed() {
        return Math.min(this.FOOT_MAX, 56 + Game.attr('agi') * 0.5 + (this.prof('athletics') - 1) * 2) * (1 + Game.perkMod('footSpeed'));
    },

    // The charge's SPEED multiplier (chargeMult below scales damage, don't mix them up).
    // Single gate: the player and the AI spend the same stamina budget. It used to be only
    // the AI that sped up, and the player couldn't break contact at any skill level.
    // `want` = does this unit want to be sprinting right now. Distance is NOT consulted: tying the player's
    // charge to enemy distance built a feedback loop where the player's own speed controlled the threshold —
    // oscillating around the 220 boundary, the player spent only a quarter of their stamina
    // and stayed fast permanently, even outrunning a horse faster than themselves.
    // Stamina only drops while actually being spent; it refills spread over time.
    chargeSpeed(u, want, dt) {
        if(u.chargeT === undefined) u.chargeT = this.CHARGE_BURST;
        if((u.chargeCd || 0) > 0) {                    // recovering: the clock runs even while standing still
            u.chargeCd -= dt;
            if(u.chargeCd <= 0) u.chargeT = this.CHARGE_BURST;
            return this.CHARGE_TIRED;
        }
        // Not spending it neither loses nor gains anything. There's NO passive refill: if there were, tapping
        // intermittently would beat holding it down (measured: 1.083 > 1.033), and the charge rhythm
        // would turn into a key-mashing minigame instead. Stamina only comes back with a full rest.
        if(!want) return 1;
        u.chargeT -= dt;
        if(u.chargeT <= 0) { u.chargeCd = this.CHARGE_REST; return this.CHARGE_TIRED; }
        return u.charge || 1.3;
    },

    // Charge: damage rises while fast on horseback, and stacks with a polearm (couched lance)
    // Skill tree #110: charge perks scale the bonus (player only — this is only called for the player unit)
    chargeMult(u) {
        if(u.type !== 'cavalry') return 1;
        let sp = Math.sqrt((u.lastVx || 0) ** 2 + (u.lastVy || 0) ** 2) / Math.max(1, u.speed);
        let lance = this.playerWeaponType() === 'polearm';
        return 1 + Math.min(1, sp) * (lance ? 1.6 : 0.6) * (1 + Game.perkMod('chargeDmg'));
    },

    // The sword swing's half-angle — attackAngle + the Wide Swing skill + skill tree #110 perks
    swingHalfAngle() {
        let deg = (state.player.attackAngle || 30) + (state.player.skills.wideSwing || 0) * 10 + Game.perkMod('blockAngle');
        return deg * Math.PI / 180;
    },

    // Anti-cavalry (#109): a spear/polearm held by standing infantry against a charging horse.
    // Troops don't carry an explicit weapon type, so `pierce` (spears, not arrows — this only
    // runs on melee infantry) stands in for "holds something built to gore a horse".
    isBracer(u) {
        if(!u || u.hp <= 0 || u.beast || u.mounted || u.type !== 'infantry') return false;
        if(u.id === 'player') return this.playerWeaponType() === 'polearm';
        return u.dmgType === 'pierce' || !!u.brace;
    },
    // The brace bonus a unit lands on a charging horse (#109). Spears (pierce infantry) get the
    // full 1.5; a shield troop can carry an explicit lighter brace (Rodok Kalkanlısı 1.25) so its
    // anti-cavalry identity lives here, not in a damage type that would leak into every matchup.
    braceMult(u) {
        if(!this.isBracer(u)) return 1;
        if(u.id === 'player') return 1.5;
        return u.brace || 1.5;
    },

    // Melee damage from one place: blood, knockback, damage text, kill logging
    dealMelee(src, tgt, raw) {
        // Animation clock (1.32.0): every swing shows, blocked or not — AI swings used to be
        // invisible, the hit simply landed. Purely visual: drawUnit turns it into a lunge + trail.
        src.atkT = 0; src.atkA = Math.atan2(tgt.y - src.y, tgt.x - src.x);
        let bf = this.blockFactor(tgt, src.x, src.y);
        if(bf === 0) return this.blockedFx(tgt, src.x, src.y);
        // Bracing infantry bites harder into a charging horse — the counter to cavalry kiting
        // the whole line (#109). Cuts both ways: the same check on the other side of dealMelee's
        // caller means a lone rider can't just charge a spear wall down for free either.
        if(tgt.type === 'cavalry' && !tgt.beast) raw *= this.braceMult(src);
        let dmg = this.afterArmor(src.dmgType, raw * bf * this.DAMAGE_PACE, tgt.defense, tgt);
        tgt.hp -= dmg;
        // Attributes grow through play: strength if the player lands the hit, vitality if the player takes it.
        if(src.id === 'player') Game.trainAttr('str', 0.15);
        if(tgt.id === 'player') Game.trainAttr('vit', dmg / 60);
        tgt.hitFlash = 0.18;
        let a = Math.atan2(tgt.y - src.y, tgt.x - src.x);
        tgt.hitT = 0; tgt.hitA = a;
        if(tgt.id === 'player') this.shakeT = 0;
        tgt.x += Math.cos(a) * 4; tgt.y += Math.sin(a) * 4; // geri tepme
        this.blood(tgt.x, tgt.y, 3 + Math.random()*3);
        this.spark(tgt.x, tgt.y, a, src.isPlayerTeam ? '#ffdd66' : '#ff8866');
        this.floatingTexts.push({ x: tgt.x, y: tgt.y - 12, text: `-${dmg}`, color: src.isPlayerTeam ? '#ffdd55' : '#ff6666', life: 0.8, big: src.id === 'player' });
        // Adrenaline (#109): infantry that's just eaten a hit from cavalry gets a short burst of
        // speed — a fighting chance to close the gap a horse would otherwise always have. Only
        // the hit itself arms it; the burst and its cooldown both tick in update().
        if(src.type === 'cavalry' && !src.beast && tgt.type === 'infantry' && !tgt.mounted && tgt.hp > 0) tgt.adrenalineHitT = 3.0;
        if(tgt.hp <= 0) {
            // A blunt weapon doesn't kill, it knocks out — raising the odds of being taken prisoner
            if((DMG_TYPES[src.dmgType] || {}).knock) tgt.stunned = true;
            this.logKill(tgt, src);
            this.awardTroopXp(src.id);
        }
    },

    // Shared dodgable-AOE mechanic (#132) — one generic idle→telegraph→strike→recovery state
    // machine, data-driven off BOSSES.<key>.special (shape/radius-or-length+width/telegraph
    // duration/damage multiplier/cooldown), so 5 distinct bosses share one system instead of 5
    // bespoke ones. `sp.tx/ty/angle` freeze at the moment the telegraph starts — the boss itself
    // can keep moving, but the strike lands where it was marked, which is what makes it
    // genuinely dodgable (walk out of the marked ground before the telegraph timer ends).
    updateBossSpecial(u, dt) {
        let sp = u.special;
        if(!sp || u.hp <= 0) return;
        sp.t -= dt;
        if(sp.state === 'idle') {
            if(sp.t <= 0) {
                sp.state = 'telegraph'; sp.t = sp.telegraph;
                sp.tx = u.x; sp.ty = u.y;
                let target = this.units.find(t => t.hp > 0 && t.isPlayerTeam !== u.isPlayerTeam);
                sp.angle = target ? Math.atan2(target.y - u.y, target.x - u.x) : 0;
            }
        } else if(sp.state === 'telegraph') {
            if(sp.t <= 0) {
                sp.state = 'strike'; sp.t = 0.4;   // brief recovery before the cooldown starts
                this.units.forEach(t => {
                    if(t.hp <= 0 || t.isPlayerTeam === u.isPlayerTeam) return;
                    let hit = sp.shape === 'circle'
                        ? Math.hypot(t.x - sp.tx, t.y - sp.ty) <= sp.radius
                        : this.pointInOrientedRect(t.x, t.y, sp.tx, sp.ty, sp.angle, sp.length, sp.width);
                    if(hit) this.dealMelee(u, t, u.attack * sp.dmgMult);
                });
            }
        } else if(sp.state === 'strike') {
            if(sp.t <= 0) { sp.state = 'idle'; sp.t = sp.cooldown; }
        }
    },
    // Point-in-oriented-rectangle: only Bozkır Hanı's line-shaped charge needs this, the other
    // 4 bosses use a plain circle (simple distance check, no geometry helper needed).
    pointInOrientedRect(px, py, ox, oy, angle, length, width) {
        let dx = px - ox, dy = py - oy;
        let c = Math.cos(-angle), s = Math.sin(-angle);
        let lx = dx * c - dy * s, ly = dx * s + dy * c;
        return lx >= 0 && lx <= length && Math.abs(ly) <= width / 2;
    },

    // Blood and sparks both pass through one gate: so they can be turned off in settings (#55 item 6/7).
    // Blood/corpses fall under "gore", sparks under the reduce-motion setting — two separate needs.
    blood(x, y, size) {
        if(!Game.opt('gore')) return;
        this.bloodStains.push({ x, y, alpha: 1.0, size });
    },
    spark(x, y, angle, color) {
        if(Game.reduceMotion()) return;
        // Particle count drops from 5 to 2 in lite mode (see Game.lite()).
        for(let i = 0, n = Game.lite() ? 2 : 5; i < n; i++) {
            let a = angle + (Math.random()-0.5) * 1.6;
            let sp = 40 + Math.random()*90;
            this.sparks.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life: 0.25 + Math.random()*0.2, color });
        }
    },

    getTerrainEffects(u) {
        let speedMod = 1.0;
        let attackMod = 1.0;
        if(!this.terrain) return { speedMod, attackMod };
        // Terrain penalties don't multiply, the worst one applies: an overlapping forest+pit+river
        // used to drag cavalry down to 0.34 — a knight slower than a peasant. Now the floor is 0.6.
        let worst = m => { speedMod = Math.min(speedMod, m); };

        // Forest: what gets caught on branches is whatever is four-legged. `type` can't tell that
        // (a Khergit Horse Archer reads 'archer', a wolf 'infantry'), so `mounted` is checked instead.
        if (this.terrain.forests) {
            for(let f of this.terrain.forests) {
                let dx = u.x - f.x, dy = u.y - f.y;
                if(dx*dx + dy*dy <= f.r*f.r) {
                    if(u.type === 'archer') attackMod *= 0.7;
                    if(u.mounted) worst(0.6);
                }
            }
        }
        // Hill
        if (this.terrain.hills) {
            for(let h of this.terrain.hills) {
                let dx = u.x - h.x, dy = u.y - h.y;
                if(dx*dx + dy*dy <= h.r*h.r) {
                    if(u.type === 'archer') attackMod *= 1.3;
                }
            }
        }
        // Pit
        if (this.terrain.pits) {
            for(let p of this.terrain.pits) {
                let dx = u.x - p.x, dy = u.y - p.y;
                if(dx*dx + dy*dy <= p.r*p.r) {
                    worst(0.8);
                }
            }
        }
        // River
        if (this.terrain.rivers) {
            for(let r of this.terrain.rivers) {
                if(u.x >= r.x && u.x <= r.x + r.w && u.y >= r.y && u.y <= r.y + r.h) {
                    worst(0.7);
                }
            }
        }
        // Mountain (#118): speed falls off toward the summit — 1 at the foot, 0.45 at the peak —
        // instead of a hill's flat patch. Goes through the same worst() gate as everything else.
        if (this.terrain.mountains) {
            for(let m of this.terrain.mountains) {
                let dx = u.x - m.x, dy = u.y - m.y, d = Math.sqrt(dx*dx + dy*dy);
                if(d <= m.r) worst(1 - (1 - d / m.r) * 0.55);
            }
        }
        return { speedMod, attackMod };
    },

    awardTroopXp(id) {
        if(!id || id === 'player') return;
        let t = state.player.party.find(x => x.id === id);
        if(!t) return;
        let r = Game.giveTroopXp(t, 1);
        // One XP per kill actually granted; the detail tab (#120) reads this back as "XP kazanıldı".
        if(this._battleLog) this._battleLog.xpGain[id] = (this._battleLog.xpGain[id] || 0) + 1;
        if(r === 'ready') this.log(`🔥 <b>${T(t.name)}</b> ${T`Terfiye Hazır! (Grup ekranından sınıf atlatın)`}`);
        else if(r === 'levelup') this.log(`🔥 <b>${T(t.name)}</b> ${T`Seviye Atladı! (Lvl ${t.level})`}`);
    },

    update(dt) {
        if(dt <= 0) return; // FIX NaN POISONING

        // Arena/duel end delay (#114): once a side is decided the field freezes on the final
        // blow for a beat instead of cutting straight to the modal — render() keeps drawing the
        // frozen frame since nothing below runs while this is pending.
        if(this.pendingEnd !== undefined) {
            this.endDelay -= dt;
            if(this.endDelay <= 0) { this.active = false; let w = this.pendingEnd; this.pendingEnd = undefined; this.endBattle(w); }
            else this.tickTug(dt);   // the bar still slides to the final count during the held beat
            return;
        }

        // Command opportunities: each one opens at its own moment, not all together.
        this.battleTime += dt;
        (this.cmdSlots || []).forEach(c => {
            if(c.open || this.battleTime < c.at) return;
            c.open = true;
            this.log(`<span style="color:#ffd479">${T`⚑ Fırsat:`} <b>[${c.key}] ${T(c.name)}</b></span>`);
            // The log is capped at 5 lines and kill messages sweep it away; the opportunity
            // should also show above the player's own head. Not on touch: there the text
            // already sits in the top strip, and this text overlapped the player exactly.
            let pl = this._byId ? this._byId['player'] : null;
            if(pl && !Game.isTouch()) this.floatingTexts.push({ x: pl.x, y: pl.y - 34, text: `⚑ [${c.key}] ${T(c.name)}`, color: '#ffd479', life: 2.2 });
        });

        // Both clicking and Space trigger an attack
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

            // Terrain interference (#118): rolled once per arrow, the first time it grazes a rock
            // or enters a forest canopy — not every frame, or a long pass through a forest would
            // approach 100% regardless of the stated chance.
            if(!proj._terrRolled && this.terrain) {
                let snagged = false, rolled = false;
                for(let k of this.terrain.rocks || []) {
                    let dx = proj.x - k.x, dy = (proj.y - k.y) / this.ROCK_SQUASH;
                    if(dx*dx + dy*dy <= (k.r + 3) * (k.r + 3)) { rolled = true; snagged = Math.random() < 0.7; break; }
                }
                if(!rolled) for(let f of this.terrain.forests || []) {
                    let dx = proj.x - f.x, dy = proj.y - f.y;
                    if(dx*dx + dy*dy <= f.r*f.r) { rolled = true; snagged = Math.random() < 0.6; break; }
                }
                if(rolled) proj._terrRolled = true;
                if(snagged) { this.projectiles.splice(i, 1); continue; }
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
                    let dmg = this.afterArmor(proj.dmgType, proj.damage * bf * this.DAMAGE_PACE, u.defense, u);
                    u.hp -= dmg;
                    hit = true;
                    u.hitFlash = 0.15;
                    u.hitT = 0; u.hitA = Math.atan2(proj.vy, proj.vx);
                    if(u.id === 'player') this.shakeT = 0;
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
            f.age = (f.age || 0) + dt;   // drives the pop-in (1.32.0)
        });
        this.floatingTexts = this.floatingTexts.filter(f => f.life > 0);

        // Sword trails, sparks, hit flash
        this.swings.forEach(sw => sw.life -= dt);
        this.swings = this.swings.filter(sw => sw.life > 0);
        this.sparks.forEach(sp => {
            sp.x += sp.vx * dt; sp.y += sp.vy * dt;
            sp.vy += 120 * dt; sp.life -= dt;
        });
        this.sparks = this.sparks.filter(sp => sp.life > 0);
        // In a crowded battle a flood of particles was dropping FPS. In lite mode the caps
        // drop to a third: on a phone every stain is a separate arc + fill.
        let lite = Game.lite();
        let capSpark = lite ? 40 : 120, capText = lite ? 14 : 40, capBlood = lite ? 60 : 200;
        if(this.sparks.length > capSpark) this.sparks.splice(0, this.sparks.length - capSpark);
        if(this.floatingTexts.length > capText) this.floatingTexts.splice(0, this.floatingTexts.length - capText);
        if(this.bloodStains.length > capBlood) this.bloodStains.splice(0, this.bloodStains.length - capBlood);
        this.units.forEach(u => {
            if(u.hitFlash > 0) u.hitFlash -= dt;
            // Animation clocks (1.32.0): seconds since the last hit / swing / shot / fall. They
            // tick here, not in render, so a paused battle freezes mid-motion.
            if(u.hitT !== undefined) u.hitT += dt;
            if(u.atkT !== undefined) u.atkT += dt;
            if(u.shotT !== undefined) u.shotT += dt;
            if(u.deadT !== undefined) u.deadT += dt;
        });
        if(this.shakeT !== undefined) this.shakeT += dt;

        // id -> unit table (target lookups run through this)
        this._byId = {};
        this.units.forEach(u => { this._byId[u.id] = u; });

        // Anti-cavalry brace (#109): a bracing spearman planted near an enemy horse sets against
        // the charge — the horse slows down in that radius (paired with dealMelee's bonus damage
        // against it). Precomputed once per frame rather than per pair inside the movement loop.
        const BRACE_RANGE = 55;
        let bracers = this.units.filter(u => this.isBracer(u));
        this.units.forEach(u => {
            if(u.hp <= 0 || u.type !== 'cavalry' || u.beast) { u.braced = false; return; }
            u.braced = bracers.some(b => b.isPlayerTeam !== u.isPlayerTeam
                && (b.x - u.x) ** 2 + (b.y - u.y) ** 2 <= BRACE_RANGE * BRACE_RANGE);
        });

        // Units movement & action update
        this.units.forEach(u => {
            if(u.hp <= 0) return;
            if(u.isBoss && u.special) this.updateBossSpecial(u, dt);

            u.vx = 0; u.vy = 0; // Reset velocity
            if(u.atkCd > 0) u.atkCd -= dt; // attack cooldown timer (dt-based — independent of frame rate)
            // Adrenaline (#109): a hit from cavalry arms a short window; if the burst hasn't
            // already fired and isn't cooling down, it triggers here — a chance to close the
            // gap a horse would otherwise always have.
            if(u.adrenalineHitT > 0) u.adrenalineHitT -= dt;
            if(u.adrenalineT > 0) u.adrenalineT -= dt;
            if(u.adrenalineCd > 0) u.adrenalineCd -= dt;
            if(u.adrenalineHitT > 0 && !(u.adrenalineT > 0) && !(u.adrenalineCd > 0) && u.type === 'infantry' && !u.beast) {
                u.adrenalineHitT = 0; u.adrenalineT = 2.5; u.adrenalineCd = 8;
                this.floatingTexts.push({ x: u.x, y: u.y - 24, text: T('⚡ Adrenalin!'), color: '#ffee55', life: 0.9 });
            }

            let { speedMod, attackMod } = this.getTerrainEffects(u);
            let uSpeed = u.speed * speedMod;
            if(u.braced) uSpeed *= 0.55;           // a horse can't keep its charge speed against set spears
            if(u.adrenalineT > 0) uSpeed *= 1.4;   // the adrenaline burst itself
            let uAttack = u.attack * attackMod;

            // When the horse is hit, the rider falls off — one check for everyone, player included.
            // The player's own trigger is "the +33% mount buffer is spent" (hp back down to
            // dismountFloor, the hp they actually entered the fight with) instead of a flat 50%
            // (#132) — comparing against baseMaxHp instead would dismount a wounded rider
            // instantly, since entry_hp + 33%_bonus can already be <= baseMaxHp on frame one.
            // Troops have no buffer/dismountFloor of their own, so they keep the flat-50% trigger.
            // `!u.isBoss` is a no-op until bosses exist as mountable units; a boss's own hp
            // governs its fight entirely.
            let playerBufferSpent = u.id === 'player' && u.dismountFloor !== undefined && u.hp <= u.dismountFloor;
            if(u.type === 'cavalry' && !u.dismounted && !u.isBoss &&
               (playerBufferSpent || (u.id !== 'player' && u.hp < u.maxHp * 0.5))) {
                u.type = 'infantry';
                u.dismounted = true;
                u.mounted = false;   // yayan kalan ormanda ceza yemez
                // Losing your horse leaves you on foot — it used to be -30, so a 174-speed knight
                // stayed at 144 and still outran the best-developed foot player. Now it truly drops.
                u.speed = u.id === 'player' ? this.footSpeed() : Math.max(50, u.speed * 0.55);
                if(u.id === 'player') u.radius = 8;
                this.floatingTexts.push({ x: u.x, y: u.y - 12, text: T('Attan Düştü!'), color: '#ffaa00', life: 1.0 });
                // Only the player's mount is a real item that can be lost (#132) — a troop's
                // horse is baked into its fixed TROOP_TREES stats, nothing to remove from anywhere.
                // An `immortal` horse (Han Kısrağı, the Bozkır Hanı reward — its own desc says
                // as much) never rolls this, in every fight from here on, not just the boss's own.
                let horse = state.player.equipment.horse;
                if(u.id === 'player' && !(horse && horse.immortal) && Math.random() < 0.10) this._horseDied = true;
            }

            // Rout: whoever flees doesn't fight, they run to the edge they came from. This is exactly
            // where speed matters — cavalry catches the fleeing, infantry is left watching. Whoever
            // reaches the edge is removed from `units` (below), so they count for neither loot nor prisoners.
            if(u.routing) {
                u.blocking = false; u.tgtId = null;
                let hedef = this.routX[u.isPlayerTeam ? 'p' : 'e'];
                u.vx = Math.sign(hedef - u.x) * uSpeed * this.ROUT_SPEED; u.vy = 0;
                u.x += u.vx * dt;
                u.routT = (u.routT || 0) + dt;
                // The time gate is a net for the edge gate: if a wall or rock pins the fleeing unit down,
                // the battle would never end — a unit running for 12s is considered to have left the battle.
                if(u.x <= 16 || u.x >= this.canvas.width - 16 || u.routT > 12) u.escaped = true;
                return;
            }

            if(u.id === 'player') {
                Input.aimSync(u);   // on touch, aim comes from the virtual stick's direction (#65)
                // Block: right click or Shift. Can't swing while blocking, walks slowly.
                u.blocking = u.hp > 0 && !u.isAttacking && (this.blockHeld || !!Input.keys['shift']);
                if(u.blocking) { let wm = this.worldMouse(); u.blockAngle = Math.atan2(wm.y - u.y, wm.x - u.x); }
                if(u.blockFlash > 0) u.blockFlash -= dt;
                if(u.bowTimer > 0) u.bowTimer -= dt;
                // The block penalty is now the same on both sides (the AI slows too) and 0.65 instead
                // of 0.5: a player blocking at half speed was getting swarmed, so nobody used block.
                uSpeed *= u.blocking ? 0.65 : 1;
                // Attack (Sweep) Logic
                if(u.swingCd > 0) u.swingCd -= dt;
                if(u.isAttacking) {
                    u.attackTimer -= dt;
                    // Sword arc: sweeps from the left shoulder to the right (for drawing)
                    let half = this.swingHalfAngle();
                    let prog = 1 - Math.max(0, u.attackTimer) / 0.3;
                    u.currentWeaponAngle = u.angleToMouse - half + prog * half * 2;

                    if(u.attackTimer <= 0.15 && !u.hasHit) {
                        u.hasHit = true;
                        // A SINGLE target: the nearest enemy inside the arc.
                        // (It used to hit everyone in the arc at once — a group-mowing bug.)
                        // Range depends on the weapon: a polearm is longer, and a bit longer still on horseback
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
                            // Damage depends on proficiency: 35% for a novice, 75% for a master
                            // Skill tree #110: melee perks add damage by weapon type
                            let wt = this.playerWeaponType();
                            let dmgPerk = wt === 'twoHanded' ? Game.perkMod('dmg2h')
                                        : wt === 'polearm' ? Game.perkMod('dmgPolearm')
                                        : Game.perkMod('dmg1h');
                            let mult = 0.35 + Math.min(0.4, this.playerWeaponProf() * 0.004) + dmgPerk;
                            let charge = this.chargeMult(u);
                            if(charge >= 1.8) this.floatingTexts.push({ x: u.x, y: u.y - 26, text: T('MIZRAK ŞARJI!'), color: '#ffcc00', life: 0.9 });
                            this.dealMelee(u, target, uAttack * mult * charge);
                        } else {
                            this.floatingTexts.push({ x: u.x, y: u.y - 20, text: T('ıska'), color: '#999', life: 0.5 });
                        }
                    }

                    if(u.attackTimer <= 0) u.isAttacking = false;
                }

                let dx=0, dy=0;
                if(Input.keys['w']||Input.keys['arrowup']) dy=-1;
                if(Input.keys['s']||Input.keys['arrowdown']) dy=1;
                if(Input.keys['a']||Input.keys['arrowleft']) dx=-1;
                if(Input.keys['d']||Input.keys['arrowright']) dx=1;
                // The player has charge stamina too: sprints for ~2s within 220, then recovers for ~4s.
                // The only window for breaking contact is the enemy's rest; it used to be only the AI
                // that sped up, so the player couldn't escape at any skill level.
                // ponytail: direction isn't asked — same budget whether closing in or backing off.
                uSpeed *= this.chargeSpeed(u, !!(dx||dy), dt);
                if(dx||dy) {
                    let len = Math.sqrt(dx*dx+dy*dy);
                    u.vx = (dx/len)*uSpeed; u.vy = (dy/len)*uSpeed;
                    u.x += u.vx*dt; u.y += u.vy*dt;
                    u.x = Math.max(10, Math.min(this.canvas.width-10, u.x));
                    u.y = Math.max(10, Math.min(this.canvas.height-10, u.y));
                }
                // vx/vy get reset every frame — charge and aim look at the last frame
                u.lastVx = u.vx; u.lastVy = u.vy;
                return;
            }

            // Terrain effects already calculated above

            // Target search used to be a full scan every frame (O(n²) in a crowd, and an FPS drop).
            // The target refreshes every 0.3s; in between, distance is measured from the target found by id.
            u.retargetCd = (u.retargetCd || 0) - dt;
            let closest = u.tgtId ? this._byId[u.tgtId] : null;
            if(closest && closest.hp <= 0) closest = null;
            // Stuck target (#109): if the current target hasn't gotten meaningfully closer since
            // the last retarget cycle it's likely unreachable (pinned behind a rock/wall/crowd) —
            // sit it out for a few seconds instead of grinding against it forever.
            if(closest && u.retargetCd <= 0 && u._tgtLastD !== undefined) {
                let curD = Math.hypot(closest.x - u.x, closest.y - u.y);
                if(curD > 60 && curD > u._tgtLastD - 8) { u.avoidId = closest.id; u.avoidUntil = this.battleTime + 3; closest = null; }
            }
            if(!closest || u.retargetCd <= 0) {
                // Ally-engaged bias (#132): a target an ally is already trading blows with scores
                // 15% better than the raw distance says, so units pile onto the same fight instead
                // of spreading thin chasing separate targets past each other. Built once per retarget
                // (an O(n) pass over allies' own current engagement, not a per-candidate scan) —
                // "engaged" means the ally's own target is within melee range of it right now.
                let engagedIds = null;
                if(this.units.length > 2) {
                    engagedIds = new Set();
                    this.units.forEach(a => {
                        if(a === u || a.hp <= 0 || a.isPlayerTeam !== u.isPlayerTeam || !a.tgtId) return;
                        let t = this._byId[a.tgtId];
                        if(t && t.hp > 0 && Math.hypot(a.x - t.x, a.y - t.y) < 60) engagedIds.add(a.tgtId);
                    });
                }
                // `fallback` ignores the avoid list: a unit must never end up with no target at all
                // just because the one enemy left standing was marked stuck (this bit a 1-on-1 badly).
                let minScore = Infinity, pick = null, fallbackD2 = Infinity, fallback = null;
                this.units.forEach(e => {
                    if(e.hp<=0 || e.isPlayerTeam === u.isPlayerTeam) return;
                    let dx = e.x-u.x, dy = e.y-u.y, d2 = dx*dx + dy*dy;
                    if(d2 < fallbackD2) { fallbackD2 = d2; fallback = e; }
                    if(e.id === u.avoidId && this.battleTime < u.avoidUntil) return;
                    // Role priority: a melee unit leans toward running down a nearby archer instead
                    // of always taking the geometrically closest body — a light nudge, not a hard rule.
                    let score = (u.type !== 'archer' && e.type === 'archer') ? d2 * 0.7 : d2;
                    if(engagedIds && engagedIds.has(e.id)) score *= 0.85;
                    if(score < minScore) { minScore = score; pick = e; }
                });
                closest = pick || fallback;
                u.tgtId = closest ? closest.id : null;
                u.retargetCd = 0.3 + Math.random()*0.2;
                u._tgtLastD = closest ? Math.hypot(closest.x-u.x, closest.y-u.y) : undefined;
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

            // In a siege the wall can't be crossed: the target on the other side is reached through the breach. The defender
            // stays on its own side, holding the mouth of the breach — the bottleneck is its advantage (#25).
            let moveX = closest ? closest.x : u.x, moveY = closest ? closest.y : u.y;
            let wall = this.siege && this.siege.wall;
            if(wall && closest) {
                let mySide = u.x < wall.x;
                if(mySide !== (targetX < wall.x)) {
                    let g = wall.gaps.reduce((a, b) => Math.abs(b.y - u.y) < Math.abs(a.y - u.y) ? b : a);
                    targetY = moveY = g.y;
                    // The attacker targets past the breach (the offset drops once through it), the defender waits at its mouth.
                    // The target point must be farther than melee range (35): if it's too close, the unit
                    // thinks it has "arrived" at the mouth of the breach and stalls there instead.
                    targetX = moveX = u.isPlayerTeam ? wall.x + 70 : wall.x + 40;
                }
            }

            // Archer AI
            if(u.type === 'archer') {
                if(closest) {
                    if(finalDist < 250) {
                        if(finalDist < 55) {
                            // Slows down while dropping the bow to retreat — it used to flee at the same speed
                            // as a melee fighter, so it could shoot risk-free forever.
                            // A foot archer went up to 0.8 (at 0.55 even your own archer was useless),
                            // but a MOUNTED archer stays at 0.55: 0.8 of a speed-108 horse would forever
                            // outrun the pursuer, bringing back the bug above.
                            let dx = u.x - closest.x, dy = u.y - closest.y;
                            let len = Math.max(1, Math.sqrt(dx*dx + dy*dy));
                            let rs = uSpeed * (u.mounted ? 0.55 : 0.8);
                            u.vx = (dx/len)*rs; u.vy = (dy/len)*rs;
                            u.x += u.vx*dt; u.y += u.vy*dt;
                        } else {
                            if(u.atkCd <= 0) {
                                u.atkCd = (1.4 + Math.random()*0.3) * this.SWING_PACE;
                                let arrowSpeed = 375;   // 1.5x (#118): arrows used to hang in the air long enough to sidestep
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
                                u.shotT = 0; u.shotA = Math.atan2(dy, dx);   // bow + recoil (1.32.0)
                            }
                        }
                    } else {
                        let dx = moveX-u.x, dy = moveY-u.y;
                        let md = Math.max(1, Math.sqrt(dx*dx + dy*dy));
                        let r = Math.min(uSpeed*0.8*dt/md, 1);   // an archer closes in on foot
                        u.vx = dx*r/dt; u.vy = dy*r/dt;
                        u.x += dx*r; u.y += dy*r;
                    }
                }
                return;
            }

            // Low-HP retreat tendency (#109): a badly hurt foot soldier sometimes buys itself room
            // instead of trading blows to the death — archers already do this via their own kite,
            // above. Rerolled every ~1-1.5s so it reads as a tendency, not a permanent flee.
            // Against a mounted enemy retreating on foot is futile — it can't outrun a horse and just
            // gives up its own swing for nothing, which used to tank foot's win rate against cavalry.
            if(!u.beast && u.type !== 'cavalry' && u.hp < u.maxHp * 0.25 && !(closest && closest.mounted)) {
                u.retreatCd = (u.retreatCd || 0) - dt;
                if(u.retreatCd <= 0) {
                    u.retreatCd = 1 + Math.random() * 0.6;
                    u.wantsRetreat = Math.random() < 0.5;
                    // Retreat toward the nearest living ally within 300, not blindly away from the
                    // enemy (#132): a unit that falls back onto its own line can rejoin the fight,
                    // one that runs into open ground just gets run down alone. Picked once per
                    // reroll, same caching pattern as the target search above, not scanned per frame.
                    if(u.wantsRetreat) {
                        let ally = null, allyD2 = 300 * 300;
                        this.units.forEach(a => {
                            if(a === u || a.hp <= 0 || a.isPlayerTeam !== u.isPlayerTeam) return;
                            let dx = a.x - u.x, dy = a.y - u.y, d2 = dx*dx + dy*dy;
                            if(d2 < allyD2) { allyD2 = d2; ally = a; }
                        });
                        u.retreatAllyId = ally ? ally.id : null;
                    }
                }
            } else u.wantsRetreat = false;
            if(u.wantsRetreat && closest && finalDist < 90) {
                let ally = u.retreatAllyId ? this._byId[u.retreatAllyId] : null;
                let dx, dy;
                if(ally && ally.hp > 0) { dx = ally.x - u.x; dy = ally.y - u.y; }
                else { dx = u.x - closest.x; dy = u.y - closest.y; }
                let len = Math.max(1, Math.sqrt(dx*dx + dy*dy));
                let rs = uSpeed * 0.75;
                u.vx = (dx/len)*rs; u.vy = (dy/len)*rs;
                u.x += u.vx*dt; u.y += u.vy*dt;
                return;
            }

            // Melee Cavalry & Infantry AI
            if(closest) {
                let meleeRange = 35;
                let currentTargetDist = Math.sqrt(Math.pow(targetX - u.x, 2) + Math.pow(targetY - u.y, 2));
                // A shielded enemy holds block between hits (the block chance comes from its defense).
                // It passes through the same Battle.blockFactor gate: only a frontal hit is cut off, the player can flank it.
                if(!u.beast && finalDist <= meleeRange + 15) {
                    u.blockCd = (u.blockCd || 0) - dt;
                    if(u.blockCd <= 0) {
                        u.blockCd = 0.6 + Math.random() * 0.8;
                        u.wantsBlock = Math.random() < Math.min(0.45, (u.defense || 0) / 40);
                    }
                    u.blocking = !!u.wantsBlock && u.atkCd > 0.2;   // lowers the shield right before swinging
                    if(u.blocking) u.blockAngle = Math.atan2(closest.y - u.y, closest.x - u.x);
                } else u.blocking = false;
                if(currentTargetDist > meleeRange) {
                    // Charge: speeds up while closing on a target, cutting off an archer's escape — but once
                    // stamina runs out it recovers. While it stayed at a constant 1.3 the player could never break contact.
                    let charge = this.chargeSpeed(u, currentTargetDist < 220, dt);
                    if(u.blocking) charge *= 0.65;   // an AI holding a shield slows down too (same penalty as the player)
                    let dx = targetX-u.x, dy = targetY-u.y;
                    let r = Math.min(uSpeed*charge*dt/Math.max(1, currentTargetDist), 1);
                    u.vx = dx*r/dt; u.vy = dy*r/dt;
                    u.x += dx*r; u.y += dy*r;
                } else if(finalDist <= meleeRange) {
                    if(u.atkCd <= 0) {
                        u.atkCd = (0.85 + Math.random()*0.4) * this.SWING_PACE; // so not everyone swings at the same instant
                        this.dealMelee(u, closest, uAttack);
                    }
                }
            }
        });

        // Anyone who leaves the field is removed from the battle. This is the one place: the fleeing unit is neither killed nor captured,
        // nor searched — leaving `units` makes all three counts correct at once.
        if(this.units.some(u => u.escaped)) this.units = this.units.filter(u => !u.escaped);

        // Nobody can leave the field — retreating archers used to flee off the map and lock up the battle.
        // The arena/tournament ring is round (#132), so its own boundary is a circle, not a box.
        let bw = this.canvas.width, bh = this.canvas.height;
        let ring = (this.isArena || this.isTourney) ? this.arenaRing(bw, bh) : null;
        let rocks = (this.terrain && this.terrain.rocks) || [];
        this.units.forEach(u => {
            if(u.hp <= 0) return;
            if(ring) {
                let dx = u.x - ring.cx, dy = u.y - ring.cy, d = Math.sqrt(dx*dx + dy*dy), max = ring.r - u.radius;
                if(d > max && d > 0.01) { let s = max / d; u.x = ring.cx + dx * s; u.y = ring.cy + dy * s; }
            } else {
                u.x = Math.max(12, Math.min(bw - 12, u.x));
                u.y = Math.max(12, Math.min(bh - 12, u.y));
            }
            // Rocks are impassable: anyone who enters one is pushed back out. Also cover now (#118):
            // an arrow that grazes one is stopped 70% of the time (Battle.projectiles update).
            // Except while fleeing: a rock can't push a unit running straight across sideways, or it gets stuck and locks up the battle.
            if(!u.routing) rocks.forEach(k => this.pushOffRock(u, k));
            // Wall: impassable outside a breach, narrows it into a corridor inside the breach (#25)
            let w = this.siege && this.siege.wall;
            if(w && Math.abs(u.x - w.x) < w.t/2 + u.radius) {
                let g = w.gaps.find(g2 => Math.abs(u.y - g2.y) < g2.h/2);
                if(g) u.y = Math.max(g.y - g.h/2 + u.radius, Math.min(g.y + g.h/2 - u.radius, u.y));
                else u.x = u.x < w.x ? w.x - w.t/2 - u.radius : w.x + w.t/2 + u.radius;
            }
        });

        this.separate();
        this.updateCamera(dt);
        this.tickTug(dt);
        this.tickHooves(performance.now());
        this.checkEnd();
    },

    // Camera (#4): smoothly follows the player (or the first living ally if the player is
    // already gone), clamped so it never shows past the arena's own edges.
    updateCamera(dt) {
        let zoom = this.camZoom || 1;
        if(zoom <= 1 || !this.canvas) return;
        let p = (this._byId && this._byId['player']) || this.units.find(u => u.isPlayerTeam && u.hp > 0) || this.units[0];
        if(!p) return;
        if(!this.cam) this.cam = { x: p.x, y: p.y };
        let t = Math.min(1, dt * 6);
        this.cam.x += (p.x - this.cam.x) * t;
        this.cam.y += (p.y - this.cam.y) * t;
        let W = this.canvas.width, H = this.canvas.height;
        let halfW = W / (2 * zoom), halfH = H / (2 * zoom);
        this.cam.x = Math.max(halfW, Math.min(W - halfW, this.cam.x));
        this.cam.y = Math.max(halfH, Math.min(H - halfH, this.cam.y));
    },

    // Screen mouse -> world coordinates. On touch, Input.aimSync (app.js) already writes
    // Input.mouse in world space (a fixed offset from the player); only the desktop path, which
    // writes canvas-pixel coordinates, needs the camera zoom/pan undone (#4).
    worldMouse() {
        if(Input.aim || Input.stick) return { x: Input.mouse.x, y: Input.mouse.y };
        let zoom = this.camZoom || 1;
        if(zoom <= 1 || !this.cam || !this.canvas) return { x: Input.mouse.x, y: Input.mouse.y };
        return {
            x: this.cam.x + (Input.mouse.x - this.canvas.width / 2) / zoom,
            y: this.cam.y + (Input.mouse.y - this.canvas.height / 2) / zoom
        };
    },

    // Two armies used to walk straight through each other and pile onto the same pixels: you could
    // not tell who you were swinging at, and a stack of six men took six times the damage in the
    // same second. Bodies now push each other apart — the line forms, the flanks matter.
    // ponytail: O(n²) over the living. At the ~70 units a battle ever holds that is ~2.5k distance
    // checks a frame, far under budget; bucket by grid if the cap ever rises.
    separate() {
        let live = this.units.filter(u => u.hp > 0 && !u.routing);
        for(let i = 0; i < live.length; i++) {
            let a = live[i];
            for(let j = i + 1; j < live.length; j++) {
                let b = live[j];
                let dx = b.x - a.x, dy = b.y - a.y;
                let min = (a.radius + b.radius) * 1.35;   // shoulder room, not just skin contact
                let d2 = dx*dx + dy*dy;
                if(d2 >= min*min) continue;
                let d = Math.sqrt(d2) || 0.01;
                // A tiny jitter when two units land exactly on top of each other, or the push has no direction.
                let nx = d2 < 0.0001 ? Math.random() - 0.5 : dx / d;
                let ny = d2 < 0.0001 ? Math.random() - 0.5 : dy / d;
                // The overlap is shared, each side giving way in proportion to how easily it is
                // shoved: a rider gives less ground than a man on foot.
                let push = min - d;
                let am = a.mounted ? 0.3 : 1, bm = b.mounted ? 0.3 : 1;
                let aShare = push * am / (am + bm), bShare = push * bm / (am + bm);
                a.x -= nx * aShare; a.y -= ny * aShare;
                b.x += nx * bShare; b.y += ny * bShare;
            }
        }
        let bw2 = this.canvas.width, bh2 = this.canvas.height;
        let ring2 = (this.isArena || this.isTourney) ? this.arenaRing(bw2, bh2) : null;
        live.forEach(u => {
            if(ring2) {
                let dx = u.x - ring2.cx, dy = u.y - ring2.cy, d = Math.sqrt(dx*dx + dy*dy), max = ring2.r - u.radius;
                if(d > max && d > 0.01) { let s = max / d; u.x = ring2.cx + dx * s; u.y = ring2.cy + dy * s; }
            } else {
                u.x = Math.max(12, Math.min(bw2 - 12, u.x));
                u.y = Math.max(12, Math.min(bh2 - 12, u.y));
            }
        });
    },

    // The sand pit's circle, shared by the ground drawing and the boundary clamp above (#132) —
    // one set of numbers, so the wall you see is the wall that actually stops you.
    arenaRing(w, h) { return { cx: w / 2, cy: h / 2, r: Math.min(w, h) * 0.47 - 10 }; },

    // --- Ground: grass + terrain is drawn once to an offscreen canvas, never regenerated every frame
    // `scale` (1.33.0): the WebGL renderer bakes the same field at more pixels per unit so the
    // zoomed camera doesn't magnify a 1x bitmap; every coordinate below stays in field units.
    // The field is pixel art at the soldiers' own pixel size (2.1): everything below is drawn
    // into a small canvas, one pixel per GROUND_PX field units (the Swordsman sprite's K), then
    // blown up without smoothing — so the grass, the river, the trees and the walls share the
    // soldiers' pixel grid instead of being a soft painting under crisp sprites. `scale` is the
    // WebGL path's sharper bake (screen density × zoom); the pixels stay the same size.
    GROUND_PX: 1.25,
    buildGround(scale = 1) {
        let W = this.canvas.width, H = this.canvas.height, P = this.GROUND_PX;
        let lw = Math.ceil(W / P), lh = Math.ceil(H / P);
        let low = document.createElement('canvas');
        low.width = lw; low.height = lh;
        let c = low.getContext('2d');
        if(this.isArena || this.isTourney) { c.scale(1 / P, 1 / P); this.buildArenaGround(c, W, H); }
        else this.buildField(c, lw, lh, W, H, P);
        let g = document.createElement('canvas');
        g.width = Math.round(W * scale); g.height = Math.round(H * scale);
        g._w = W; g._h = H; g._s = scale;
        let gx = g.getContext('2d');
        gx.imageSmoothingEnabled = false;
        gx.drawImage(low, 0, 0, lw * P * scale, lh * P * scale);
        this.ground = g;
    },
    // A pastel meadow, pixel by pixel (round 1's field): the base green, one of four tones on
    // about a sixth of the pixels, a slow light/dark mottling so it doesn't read as noise, grass
    // tufts and the odd flower. Written as ImageData — a phone bakes it in a few milliseconds.
    // Its own seeded generator: one draw from the game's dice, not a hundred thousand.
    buildField(c, lw, lh, W, H, P) {
        let seed = (Math.random() * 4294967296) >>> 0;
        let rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        let img = c.createImageData(lw, lh), d = img.data;
        const BASE = [76, 116, 57], TONES = [[85, 128, 63], [70, 105, 58], [63, 96, 52], [91, 136, 68]];
        // the mottling: a coarse random grid, bilinearly blended (cells of ~48 pixels)
        let gw = Math.ceil(lw / 48) + 2, gh = Math.ceil(lh / 48) + 2, grid = [];
        for(let i = 0; i < gw * gh; i++) grid.push(rnd() * 2 - 1);
        let mot = (x, y) => {
            let fx = x / 48, fy = y / 48, ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy;
            let a = grid[iy * gw + ix], b = grid[iy * gw + ix + 1], cc = grid[(iy + 1) * gw + ix], dd = grid[(iy + 1) * gw + ix + 1];
            return (a * (1 - tx) + b * tx) * (1 - ty) + (cc * (1 - tx) + dd * tx) * ty;
        };
        for(let y = 0; y < lh; y++) for(let x = 0; x < lw; x++) {
            let col = rnd() < 0.16 ? TONES[(rnd() * 4) | 0] : BASE;
            // mottling as a dither: a lighter or darker tone where the patch leans that way
            let m = mot(x, y) + (rnd() - 0.5) * 0.5;
            let k = m > 0.45 ? 1.07 : m < -0.45 ? 0.92 : 1;
            let i = (y * lw + x) * 4;
            d[i] = Math.min(255, col[0] * k); d[i + 1] = Math.min(255, col[1] * k); d[i + 2] = Math.min(255, col[2] * k); d[i + 3] = 255;
        }
        let put = (x, y, r, g, b) => { if(x < 0 || y < 0 || x >= lw || y >= lh) return; let i = (y * lw + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; };
        for(let n = 0, N = lw * lh * 0.004; n < N; n++) {              // tufts: two dark blades, a light one between
            let x = (rnd() * lw) | 0, y = (rnd() * lh) | 0;
            put(x, y, 58, 90, 48); put(x, y + 1, 58, 90, 48); put(x + 2, y, 58, 90, 48); put(x + 2, y + 1, 58, 90, 48);
            put(x + 1, y - 1, 98, 146, 74); put(x + 1, y, 98, 146, 74); put(x + 1, y + 1, 98, 146, 74);
        }
        for(let n = 0, N = lw * lh * 0.0009; n < N; n++) {             // flowers
            let x = (rnd() * lw) | 0, y = (rnd() * lh) | 0;
            if(rnd() < 0.5) put(x, y, 232, 211, 106); else put(x, y, 233, 228, 214);
        }
        c.putImageData(img, 0, 0);
        c.scale(1 / P, 1 / P);                                       // terrain below is in field units
        let lite = Game.lite();

        let TR = this.terrain || {};

        (TR.rivers||[]).forEach(r => {
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

        (TR.pits||[]).forEach(p => {
            let rg = c.createRadialGradient(p.x, p.y - p.r*0.2, p.r*0.1, p.x, p.y, p.r);
            rg.addColorStop(0, 'rgba(0,0,0,0.58)');
            rg.addColorStop(0.75, 'rgba(0,0,0,0.30)');
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = rg; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI*2); c.fill();
            c.strokeStyle = 'rgba(170,190,140,0.22)'; c.lineWidth = 2;
            c.beginPath(); c.arc(p.x, p.y, p.r*0.94, Math.PI*1.1, Math.PI*1.9); c.stroke();
        });

        (TR.hills||[]).forEach(h => {
            let rg = c.createRadialGradient(h.x - h.r*0.25, h.y - h.r*0.3, h.r*0.1, h.x, h.y, h.r);
            rg.addColorStop(0, 'rgba(196,220,152,0.20)');
            rg.addColorStop(0.6, 'rgba(124,164,92,0.10)');
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = rg; c.beginPath(); c.arc(h.x, h.y, h.r, 0, Math.PI*2); c.fill();
            c.strokeStyle = 'rgba(255,255,255,0.07)'; c.lineWidth = 1.5;
            c.beginPath(); c.arc(h.x, h.y, h.r*0.62, 0, Math.PI*2); c.stroke();
        });

        // Mountain (#118): drawn with contour rings so the falling speed multiplier toward
        // the summit actually reads on the ground — a hill's flat gradient can't show that.
        (TR.mountains||[]).forEach(m => {
            let rg = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
            rg.addColorStop(0, 'rgba(150,140,128,0.32)');
            rg.addColorStop(0.6, 'rgba(96,88,76,0.16)');
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = rg; c.beginPath(); c.arc(m.x, m.y, m.r, 0, Math.PI*2); c.fill();
            c.strokeStyle = 'rgba(235,230,215,0.20)'; c.lineWidth = 1;
            for(let ring = 1; ring <= 4; ring++) { c.beginPath(); c.arc(m.x, m.y, m.r*ring/5, 0, Math.PI*2); c.stroke(); }
            c.fillStyle = 'rgba(255,255,255,0.32)';
            c.beginPath(); c.arc(m.x, m.y, m.r*0.12, 0, Math.PI*2); c.fill();   // snow cap at the summit
        });

        (TR.forests||[]).forEach(f => {
            c.fillStyle = 'rgba(9,24,11,0.5)';
            c.beginPath(); c.arc(f.x, f.y, f.r, 0, Math.PI*2); c.fill();
            let n = Math.floor(f.r / (lite ? 18 : 9));
            let trees = [];
            for(let i = 0; i < n; i++) {
                let a = Math.random()*Math.PI*2, d = Math.sqrt(Math.random()) * f.r * 0.92;
                trees.push({ x: f.x + Math.cos(a)*d, y: f.y + Math.sin(a)*d, r: 8 + Math.random()*7 });
            }
            trees.sort((a,b) => a.y - b.y).forEach(t => this.drawTree(c, t.x, t.y, t.r));
        });

        (TR.rocks||[]).forEach(k => this.drawRock(c, k.x, k.y, k.r));

        if(this.siege && this.siege.wall) {
            this.drawWall(c, this.siege.wall, H);
            // Breach corridor highlight (#118): the one crossable point on the field should
            // read at a glance, not just be inferred from where the wall happens to have a gap.
            let gate = this.siege.wall.gaps.find(gp => gp.gate);
            if(gate) {
                let cg = c.createLinearGradient(this.siege.wall.x - 90, 0, this.siege.wall.x + 90, 0);
                cg.addColorStop(0, 'rgba(255,200,120,0)'); cg.addColorStop(0.5, 'rgba(255,200,120,0.10)'); cg.addColorStop(1, 'rgba(255,200,120,0)');
                c.fillStyle = cg; c.fillRect(this.siege.wall.x - 90, gate.y - gate.h/2 - 10, 180, gate.h + 20);
            }
        }

        // A slight darkening: keeps units readable against the brighter pixel meadow
        c.fillStyle = 'rgba(6,10,6,0.08)';
        c.fillRect(0, 0, W, H);
    },

    // The arena/tournament ring (#132): round sand pit, wooden boundary, a crowd packed around
    // the outside — seen from above, so the crowd is just a mottled ring of "heads", not figures.
    // The circle matches `arenaRing()`, the same one the boundary clamp uses: nobody can wander
    // past the wall the ground shows them.
    buildArenaGround(c, W, H) {
        let { cx, cy, r } = this.arenaRing(W, H);
        let lite = Game.lite();

        // Packed dirt outside the ring, where the crowd stands
        let outer = c.createLinearGradient(0, 0, 0, H);
        outer.addColorStop(0, '#4a4034'); outer.addColorStop(1, '#2e281f');
        c.fillStyle = outer; c.fillRect(0, 0, W, H);

        // Crowd: rings of small heads packed shoulder to shoulder around the pit, thinning
        // toward the canvas edge so it reads as a stand rather than a hard-edged ribbon.
        let bands = lite ? 3 : 5;
        for(let b = 0; b < bands; b++) {
            let br = r + 22 + b * (lite ? 26 : 20);
            if(br > Math.max(W, H) * 0.8) break;
            let step = 15 + b * 1.5;
            let n = Math.max(8, Math.floor((2 * Math.PI * br) / step));
            for(let i = 0; i < n; i++) {
                let a = (i / n) * Math.PI * 2 + b * 0.37;
                let x = cx + Math.cos(a) * br, y = cy + Math.sin(a) * br * 0.94;
                if(x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
                let tone = 40 + Math.floor(this.crowdRnd(b, i) * 50);
                c.fillStyle = `rgba(${tone + 30},${tone + 14},${tone},0.85)`;
                c.beginPath(); c.arc(x, y, 4.2, 0, Math.PI * 2); c.fill();
            }
        }
        // A soft glow washes out the crowd right at the wall so the boundary itself still reads clearly
        let crowdFade = c.createRadialGradient(cx, cy, r, cx, cy, r + 46);
        crowdFade.addColorStop(0, 'rgba(46,40,31,0)'); crowdFade.addColorStop(1, 'rgba(46,40,31,0.9)');
        c.fillStyle = crowdFade; c.beginPath(); c.arc(cx, cy, r + 46, 0, Math.PI * 2); c.fill();

        // Sand floor
        let sand = c.createRadialGradient(cx, cy - r * 0.15, r * 0.1, cx, cy, r);
        sand.addColorStop(0, '#e0c088'); sand.addColorStop(0.8, '#c9a463'); sand.addColorStop(1, '#a9853f');
        c.save();
        c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
        c.fillStyle = sand; c.fillRect(cx - r, cy - r, r * 2, r * 2);
        // Raked concentric rings, like a groomed fighting pit
        c.strokeStyle = 'rgba(150,110,60,0.28)'; c.lineWidth = 2;
        for(let ring = 1; ring <= 5; ring++) { c.beginPath(); c.arc(cx, cy, r * ring / 6, 0, Math.PI * 2); c.stroke(); }
        // A little grit so it doesn't read as a flat disc
        for(let i = 0, n = lite ? 120 : 400; i < n; i++) {
            let a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
            c.fillStyle = Math.random() > 0.5 ? 'rgba(255,240,200,0.12)' : 'rgba(90,60,30,0.14)';
            c.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2, 2);
        }
        c.restore();

        // Wooden boundary wall — the fence nobody fights past
        c.strokeStyle = '#5a4327'; c.lineWidth = 10;
        c.beginPath(); c.arc(cx, cy, r + 4, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = '#7a5c34'; c.lineWidth = 3;
        c.beginPath(); c.arc(cx, cy, r + 7, 0, Math.PI * 2); c.stroke();
        let posts = Math.floor((2 * Math.PI * r) / 34);
        for(let i = 0; i < posts; i++) {
            let a = (i / posts) * Math.PI * 2;
            let x = cx + Math.cos(a) * (r + 4), y = cy + Math.sin(a) * (r + 4);
            c.fillStyle = '#8a6a3c'; c.fillRect(x - 2.5, y - 7, 5, 14);
        }

        c.fillStyle = 'rgba(6,10,6,0.12)';
        c.fillRect(0, 0, W, H);
    },
    // Deterministic dot placement for the crowd texture — no state kept, just needs to not be pure Math.random
    // per band/index or the rings would shimmer if buildArenaGround ever re-ran mid-battle.
    crowdRnd(a, b) {
        let h = (a * 374761393 + b * 668265263) % 1000003;
        return Math.abs(h) / 1000003;
    },

    // Siege wall: stone band + crenellations outside the breaches, broken gate leaves at the gate (#25)
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
            // Banners (#118): a flag every ~90px so the sur reads as a held wall, not a bare strip
            for(let by = a + 40; by < b; by += 90) {
                c.fillStyle = '#4a3a24'; c.fillRect(x1 - 1, by - 24, 3, 24);
                c.fillStyle = this.siegeBannerColor || '#b23b3b';
                c.beginPath(); c.moveTo(x1 + 2, by - 24); c.lineTo(x1 + 16, by - 18); c.lineTo(x1 + 2, by - 12); c.closePath(); c.fill();
            }
        });

        w.gaps.forEach(g => {
            let a = g.y - g.h/2, b = g.y + g.h/2;
            c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(x0, a, w.t, b - a);
            if(g.gate) {
                c.fillStyle = '#3a3129';
                c.fillRect(x0 - 7, a - 14, w.t + 14, 14);
                c.fillRect(x0 - 7, b, w.t + 14, 14);
                c.fillStyle = '#5b3f22';   // broken gate leaves
                c.fillRect(x0 - 4, a + 3, 9, 22); c.fillRect(x0 - 4, b - 25, 9, 22);
            } else {
                for(let i = 0; i < 9; i++)   // tower ramp: a breach filled with rubble
                    this.drawRock(c, x0 + Math.random()*w.t, a + 6 + Math.random()*(b - a - 12), 3 + Math.random()*4);
            }
            // Attacker's siege equipment (#118): parked on the field side of the gate the field
            // was already breached through — a tower plan means a tower, otherwise it's ladders.
            if(g.gate) this.drawSiegeEquip(c, w, g);
        });
    },

    // Attacker-side equipment silhouette at the gate — decorative, drawn once into the baked
    // ground, not a hitbox. `w.equip` was set from the plan's own gap count in Battle.start().
    drawSiegeEquip(c, w, g) {
        let x0 = w.x - w.t/2;
        if(w.equip === 'tower') {
            let tx = x0 - 42, ty = g.y;
            c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(tx + 15, ty + 48, 22, 7, 0, 0, Math.PI*2); c.fill();
            let tg = c.createLinearGradient(tx, 0, tx + 30, 0);
            tg.addColorStop(0, '#5a3f22'); tg.addColorStop(1, '#3a2a16');
            c.fillStyle = tg; c.fillRect(tx, ty - 46, 30, 94);
            c.strokeStyle = 'rgba(18,12,8,0.85)'; c.lineWidth = 2; c.strokeRect(tx, ty - 46, 30, 94);
            for(let ly = ty - 40; ly < ty + 44; ly += 13) { c.beginPath(); c.moveTo(tx, ly); c.lineTo(tx + 30, ly); c.stroke(); }
            c.fillStyle = '#6b4a2a'; c.fillRect(tx - 6, ty - 50, 42, 8);   // ramp lip facing the wall
        } else {
            [-16, 18].forEach(off => {
                let bx = x0 - 6, by1 = g.y + off + 34, by2 = g.y + off - 34, tx2 = x0 + 3;
                c.strokeStyle = '#7a5a34'; c.lineWidth = 3;
                c.beginPath(); c.moveTo(bx, by1); c.lineTo(tx2, by2); c.stroke();
                c.beginPath(); c.moveTo(bx + 6, by1); c.lineTo(tx2 + 6, by2); c.stroke();
                c.strokeStyle = 'rgba(60,42,20,0.9)'; c.lineWidth = 2;
                for(let r = 1; r < 6; r++) {
                    let t = r / 6, ax = bx + (tx2 - bx) * t, ay = by1 + (by2 - by1) * t;
                    c.beginPath(); c.moveTo(ax - 1, ay); c.lineTo(ax + 7, ay); c.stroke();
                }
            });
        }
    },

    // Periodic arrow-rain arcs off the wall + a boiling-oil glow at the gate while
    // an attacker stands in the breach corridor — drawn live in render(), not baked.
    drawSiegeFx(ctx, now, W, H) {
        let w = this.siege.wall;
        if(!w) return;
        let t = (now / 900) % 1;
        if(t < 0.5) {
            ctx.strokeStyle = 'rgba(220,200,150,0.55)'; ctx.lineWidth = 1.5;
            for(let i = 0; i < 5; i++) {
                let sy = (H / 5) * i + 20, prog = (t*2 + i*0.13) % 1;
                let sx = w.x - w.t/2 - 4, ex = sx - 130;
                let x = sx + (ex - sx) * prog, y = sy - Math.sin(prog * Math.PI) * 30;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10, y + 3); ctx.stroke();
            }
        }
        let gate = w.gaps.find(g => g.gate);
        if(gate) {
            // Player is always the besieger (spawns left of the wall, defenders spawn behind it),
            // so any attacker-side unit near the gate means the breach is in use.
            let breached = this.units.some(u => u.isPlayerTeam
                && Math.abs(u.x - w.x) < 60 && Math.abs(u.y - gate.y) < gate.h/2);
            if(breached) {
                let pulse = 0.25 + 0.15 * Math.sin(now / 180);
                let og = ctx.createRadialGradient(w.x, gate.y, 4, w.x, gate.y, 46);
                og.addColorStop(0, `rgba(255,150,40,${pulse})`); og.addColorStop(1, 'rgba(255,150,40,0)');
                ctx.fillStyle = og; ctx.beginPath(); ctx.arc(w.x, gate.y, 46, 0, Math.PI*2); ctx.fill();
            }
        }
    },

    ROCK_SQUASH: 0.8,   // a rock is drawn this flat vertically; collision reads the same number
    // Measured in the rock's own squashed space so the hit area is the ellipse that is drawn,
    // not a taller circle around it — "stuck on a rock that isn't there" (#118). Sliding push:
    // only part of the overlap closes each frame, so brushing the edge reads as a slide, not a wall.
    pushOffRock(u, k) {
        let dx = u.x - k.x, dy = (u.y - k.y) / this.ROCK_SQUASH;
        let d = Math.sqrt(dx*dx + dy*dy), min = k.r + u.radius;
        if(d < min && d > 0.01) { let correct = (min - d) * 0.55; u.x += dx/d * correct; u.y += dy/d * correct * this.ROCK_SQUASH; }
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
            let px = x + Math.cos(a2)*rr, py = y + Math.sin(a2)*rr*this.ROCK_SQUASH;
            i ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.closePath(); c.fill();
        c.strokeStyle = 'rgba(20,22,24,0.8)'; c.lineWidth = 2; c.stroke();
    },

    // Once for the battle ground, but called EVERY FRAME on the map (4 forests × ~15 trees).
    // The canopy gradient depends only on the tree's radius, not its position: drawing is set up
    // at the origin and moved into place with translate, so the gradient is built once per radius.
    // Since the gradient is tied to the context that created it, the cache lives on the context itself.
    drawTree(c, x, y, r) {
        let cache = c._treeGrad || (c._treeGrad = {}), key = Math.round(r), rg = cache[key];
        if(!rg) {
            rg = c.createRadialGradient(-key*0.35, -key*0.45, key*0.1, 0, -key*0.2, key);
            rg.addColorStop(0, 'rgba(96,146,72,1)');
            rg.addColorStop(0.65, 'rgba(46,88,40,1)');
            rg.addColorStop(1, 'rgba(20,44,20,1)');
            cache[key] = rg;
        }
        c.save(); c.translate(x, y);
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.beginPath(); c.ellipse(r*0.4, r*0.55, r*0.95, r*0.42, 0, 0, Math.PI*2); c.fill();
        c.fillStyle = '#3b2a18';
        c.fillRect(-r*0.13, -r*0.1, r*0.26, r*0.7);
        c.fillStyle = rg;
        c.beginPath(); c.arc(0, -r*0.25, r*0.85, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(-r*0.5, -r*0.05, r*0.5, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(r*0.5, -r*0.05, r*0.48, 0, Math.PI*2); c.fill();
        c.restore();
    },

    // One frame, through whichever renderer is live (1.33.0). Rendering is side-effect free:
    // it reads Battle's state and animation clocks and writes none of them — drawing twice
    // leaves the battle exactly as it was (tools/test.js checks this).
    render() {
        let g = this.liveGfx(), W = this.canvas.width, H = this.canvas.height;
        if(g.w !== W || g.h !== H) g.resize(W, H);
        g.render(this, performance.now());
    },

    // The Canvas2D renderer — the pre-1.33.0 drawing code, unchanged. It is the fallback when
    // WebGL is missing or turned off in settings, and what the Node harness runs.
    canvasGfx: {
        name: 'canvas', w: 0, h: 0,
        resize(w, h) { this.w = w; this.h = h; },
        render(b, now) { b.drawCanvas(now); },
        info() { return { resolution: '1x', drawCalls: null }; },
        destroy() {}
    },

    drawCanvas(now) {
        let ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
        if(!this.ground || this.ground._w !== W || this.ground._h !== H) this.buildGround();

        ctx.clearRect(0,0,W,H);

        // Camera (#4): everything from the ground to floating damage text is drawn inside this
        // transform. Screen-space stuff (vignette, HUD, minimap) is drawn after ctx.restore().
        let zoom = this.camZoom || 1, cam = this.cam || { x: W/2, y: H/2 };
        ctx.save();
        ctx.translate(W/2, H/2);
        ctx.scale(zoom, zoom);
        ctx.translate(-cam.x, -cam.y);
        // Impact shake (1.32.0): only when the player is hit — it tells you, it doesn't decorate.
        // A sine, not Math.random: the same frame draws the same picture.
        if(this.shakeT !== undefined && this.shakeT < 0.22 && Anim.on()) {
            let s = 2.2 * Anim.decay(this.shakeT, 0.22) / zoom;
            ctx.translate(Math.sin(this.battleTime * 97) * s, Math.cos(this.battleTime * 71) * s);
        }

        // pixel ground (2.1): zoomed in, its pixels stay hard-edged like the soldiers'
        ctx.imageSmoothingEnabled = false;
        if(this.ground._s === 1) ctx.drawImage(this.ground, 0, 0);
        else ctx.drawImage(this.ground, 0, 0, W, H);   // baked sharper for the WebGL path, then the setting flipped
        ctx.imageSmoothingEnabled = true;

        // Water shimmer (the only animated terrain effect)
        if(this.terrain && this.terrain.rivers && !Game.lite()) {
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

        // Siege FX (#118): arrow rain from the wall + boiling-oil glow at the breach
        if(this.siege && !Game.lite()) this.drawSiegeFx(ctx, now, W, H);

        // Kan lekeleri
        this.bloodStains.forEach(b => {
            ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI*2);
            ctx.fillStyle = `rgba(122,10,10,${b.alpha*0.8})`; ctx.fill();
        });

        // Corpses — the fallen stay on the field
        this.corpses.forEach(cp => {
            ctx.save();
            ctx.translate(cp.x, cp.y); ctx.rotate(cp.rot);
            // fades in under the falling unit instead of popping into place (1.32.0)
            ctx.globalAlpha = 0.5 * (cp.born === undefined ? 1 : Anim.k(this.battleTime - cp.born - 0.2, 0.5, 'outQuad'));
            ctx.fillStyle = cp.isPlayerTeam ? '#4a5a7a' : '#6a3a3a';
            ctx.beginPath(); ctx.ellipse(0, 0, 9, 4.5, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
            ctx.restore();
            ctx.globalAlpha = 1;
        });

        // Sword swing trail
        this.swings.forEach(sw => {
            let a = Anim.ease.outQuad(Anim.clamp01(sw.life / 0.3));
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

        // Aim arc (#88): there's no cursor on touch, so where the sword will go
        // is only visible if it's drawn. A single outline — kept even in lite mode.
        let aimP = Game.isTouch() && this.units.find(u => u.id === 'player' && u.hp > 0);
        if(aimP) {
            let a = Math.atan2(Input.mouse.y - aimP.y, Input.mouse.x - aimP.x), half = this.swingHalfAngle();
            ctx.save(); ctx.translate(aimP.x, aimP.y);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 42, a - half, a + half); ctx.closePath();
            ctx.strokeStyle = 'rgba(255,225,150,0.32)'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.restore();
        }

        // Boss special-attack telegraph (#132) — a ground marker during the dodge window, drawn
        // under the units so it reads as a decal rather than an overlay on top of them.
        this.units.forEach(u => { if(u.hp > 0 && u.special) this.drawBossSpecial(ctx, u, now); });

        // Units — sorted by y for a sense of depth. The just-fallen are drawn too, for the
        // DIE_T seconds of their fall (1.32.0).
        this.units.filter(u => u.hp > 0 || (u.deadT !== undefined && u.deadT < this.dieT(u)))
            .sort((a,b) => a.y - b.y).forEach(u => this.drawUnit(ctx, u, now));

        // Arrows
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

        // Sparks
        this.sparks.forEach(sp => {
            ctx.globalAlpha = Math.max(0, sp.life / 0.4);
            ctx.strokeStyle = sp.color; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x - sp.vx*0.02, sp.y - sp.vy*0.02); ctx.stroke();
        });
        ctx.globalAlpha = 1;

        // Floating damage text
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let pop = Anim.on();
        this.floatingTexts.forEach(f => {
            ctx.globalAlpha = Anim.ease.outQuad(Anim.clamp01(f.life / 0.4));
            ctx.font = `bold ${f.big ? 15 : 12}px Inter, sans-serif`;
            ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
            // Pops in: starts small, overshoots a touch, settles (1.32.0)
            let age = f.age || 0, s = pop && age < 0.2 ? 0.55 + 0.45 * Anim.ease.outBack(age / 0.2) : 1;
            if(s !== 1) { ctx.save(); ctx.translate(f.x, f.y); ctx.scale(s, s); ctx.strokeText(f.text, 0, 0); ctx.fillStyle = f.color; ctx.fillText(f.text, 0, 0); ctx.restore(); }
            else { ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); }
        });
        ctx.globalAlpha = 1;

        ctx.restore();   // back to screen space (#4) — vignette, HUD and minimap are not zoomed

        // Vignette
        if(!this._vignette || this._vignette.w !== W) {
            let vg = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.35, W/2, H/2, Math.max(W,H)*0.72);
            vg.addColorStop(0, 'rgba(0,0,0,0)');
            vg.addColorStop(1, 'rgba(0,0,0,0.55)');
            this._vignette = { w: W, g: vg };
        }
        ctx.fillStyle = this._vignette.g; ctx.fillRect(0,0,W,H);

        this.drawHud(ctx, W, H, now);
        this.drawMinimap(ctx, W, H);
    },

    // Minimap (#4): the zoomed camera can only show a slice of the field, so a small overhead
    // view sits in the corner — the whole arena scaled down, friendly dots one color, enemies
    // red, the player brighter, plus an outline of what the camera currently shows. No gradient:
    // a flat fill, baked once per frame like everything else in the HUD.
    drawMinimap(ctx, W, H) {
        if(!this.units.length) return;
        let { mw, mh, mx, my } = this.miniBox(W);
        let ww = this.canvas.width, wh = this.canvas.height;
        let sx = mw / ww, sy = mh / wh;
        ctx.save();
        ctx.fillStyle = 'rgba(10,14,10,0.6)';
        ctx.fillRect(mx, my, mw, mh);
        ctx.strokeStyle = 'rgba(200,170,90,0.5)'; ctx.lineWidth = 1;
        ctx.strokeRect(mx, my, mw, mh);
        this.units.forEach(u => {
            if(u.hp <= 0) return;
            let px = mx + u.x * sx, py = my + u.y * sy;
            ctx.fillStyle = u.id === 'player' ? '#ffcc00' : (u.isPlayerTeam ? '#4fa8ff' : '#ff5a4a');
            ctx.beginPath(); ctx.arc(px, py, u.id === 'player' ? 2.6 : 1.6, 0, Math.PI*2); ctx.fill();
        });
        let zoom = this.camZoom || 1;
        if(zoom > 1.02 && this.cam) {
            let halfW = ww / (2*zoom), halfH = wh / (2*zoom);
            let vx = mx + (this.cam.x - halfW) * sx, vy = my + (this.cam.y - halfH) * sy;
            ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
            ctx.strokeRect(vx, vy, halfW * 2 * sx, halfH * 2 * sy);
        }
        ctx.restore();
    },

    // Remaining unit emoji: beasts, the two narrative one-offs (companion medal, spouse ring),
    // and 🐎 as cavalry's loading-frame placeholder (see troopSprite) — everything else,
    // cavalry included once its image is loaded, is a real sprite (see below).
    UNIT_ICONS: ['🐺', '🧑‍🌾', '🎖️', '💍', '🐎', '🐴'],
    // Troop art (#132) — real pixel-art sprites for all three types, not emoji or procedural
    // shapes (troops/LICENSE.txt has full sourcing/licensing for every file here):
    // - Infantry: 3 hand-picked levels of a "Swordsman" (CraftPix.net, free/royalty-free, no
    //   attribution required), genuinely more armored at each tier.
    // - Archer: one sprite (CraftPix.net Roguelike Kit's hooded archer, bow on the back)
    //   recolored per tier (paler/leather → richer → desaturated steel) since only one archer
    //   pose was available in that pack.
    // These single frames are now only the placeholders shown while the animated atlases load
    // (Swordsman / Archer / Mounted, at the end of this file). Cavalry's Wesnoth sprites are
    // gone: riders are a code-drawn Horse carrying a Swordsman (2.0.0).
    TROOP_TIER_COLORS: ['#8a7256', '#5a6b7a', '#3f4a56'],   // unused now cavalry is a real sprite too; kept for the infantry/archer loading-frame fallback
    TROOP_TIER_ACCENT: ['#c2a878', '#cfd8e0', '#e8e8e8'],
    TROOP_TIER_NAMES: ['weak', 'normal', 'armored'],
    TROOP_SPRITE_SIZE: 36,   // close to the player's own 40x40 emoji sprite, tuned slightly down per playtest feedback
    // Kicks off the network/cache fetch; returns the (possibly still-loading) Image. Cached by
    // key so repeated calls don't create new Image objects.
    troopImage(type, tier) {
        if(!this._troopImages) this._troopImages = {};
        let key = type + '_' + this.TROOP_TIER_NAMES[tier];
        let img = this._troopImages[key];
        if(img) return img;
        img = new Image();
        img.src = 'troops/' + key + '.png';
        this._troopImages[key] = img;
        return img;
    },
    // Draws a loaded image into a `size`x`size` canvas, preserving aspect ratio and centered —
    // every real sprite file here is already tightly cropped to its own content, no two are the
    // same exact width/height, so this (not a fixed source-crop rect) is what fits them all.
    // `R` (1.33.0): bake scale — the tile is size*R pixels for a size-unit sprite; `_pixel`
    // tells the WebGL renderer to sample it nearest-neighbour.
    bakeFitted(img, size, R = 1) {
        let c = document.createElement('canvas');
        let px = Math.round(size * R);
        c.width = c.height = px;
        c._pixel = true;
        let cx = c.getContext('2d');
        cx.imageSmoothingEnabled = false;   // keep the pixel art crisp, not blurred
        let scale = Math.min(px / img.naturalWidth, px / img.naturalHeight) * 0.92;
        let w = img.naturalWidth * scale, h = img.naturalHeight * scale;
        cx.drawImage(img, (px - w) / 2, (px - h) / 2, w, h);
        return c;
    },
    // Cache key for a sprite baked at scale R: the Canvas2D path (R = 1) keeps its old keys.
    rKey(key, R) { return R === 1 ? key : key + '@' + R; },
    // Cavalry (horse + rider) draws bigger than a standing infantry/archer tile, matching how
    // much wider the Wesnoth sprites actually are.
    TROOP_SPRITE_SIZES: { infantry: 36, archer: 36, cavalry: 48 },
    troopSprite(type, tier, R = 1) {
        if(!this._troopSprites) this._troopSprites = {};
        let key = this.rKey(type + '_' + tier, R);
        let c = this._troopSprites[key];
        if(c) return c;   // permanent cache — only ever holds the real, loaded sprite
        let img = this.troopImage(type, tier);
        if(img.complete && img.naturalWidth > 0) {
            c = this.bakeFitted(img, this.TROOP_SPRITE_SIZES[type] || this.TROOP_SPRITE_SIZE, R);
            this._troopSprites[key] = c;
            return c;
        }
        // Infantry/archer/cavalry for the handful of frames before its image finishes loading
        // (`warmUp()` starts the fetch well before battle is visible, so this is normally never
        // seen) — a placeholder. Cavalry just borrows the plain 🐎 emoji (cached by unitSprite
        // already); infantry/archer get a small procedural placeholder, cached separately so it
        // can never permanently shadow the real sprite once the image is ready.
        if(type === 'cavalry') return this.unitSprite('🐎', R);
        if(!this._proceduralSprites) this._proceduralSprites = {};
        let pc = this._proceduralSprites[key];
        if(pc) return pc;
        let size = 30, h = size / 2;
        pc = document.createElement('canvas');
        pc.width = pc.height = Math.round(size * R);
        let x = pc.getContext('2d');
        x.scale(R, R);
        x.translate(h, h);
        x.fillStyle = this.TROOP_TIER_COLORS[tier];
        x.strokeStyle = 'rgba(0,0,0,0.85)';
        x.lineWidth = Math.max(1.5, size * 0.06);
        x.lineJoin = 'round';
        if(type === 'archer') this.drawArcherSilhouette(x, h, tier);
        else this.drawInfantrySilhouette(x, h, tier);
        this._proceduralSprites[key] = pc;
        return pc;
    },
    // The player's own real-sprite look (#132) — `kind` is 'melee' or 'bow', matching
    // whichever real sprite the equipped weapon's category maps to (both CraftPix, see
    // troops/LICENSE.txt). Falls back to the emoji farmer glyph for the few frames before the
    // image loads (warmUp() starts the fetch at battle start, same pattern as troopSprite()).
    playerImage(kind) {
        if(!this._playerImages) this._playerImages = {};
        let img = this._playerImages[kind];
        if(img) return img;
        img = new Image();
        img.src = 'troops/player_' + kind + '.png';
        this._playerImages[kind] = img;
        return img;
    },
    playerSprite(kind, R = 1) {
        if(!this._playerSprites) this._playerSprites = {};
        let key = this.rKey(kind, R);
        let c = this._playerSprites[key];
        if(c) return c;
        let img = this.playerImage(kind);
        if(img.complete && img.naturalWidth > 0) {
            c = this.bakeFitted(img, kind === 'horse' ? 48 : 40, R);   // mounted draws bigger, same as cavalry troops
            this._playerSprites[key] = c;
            return c;
        }
        return this.unitSprite(kind === 'horse' ? '🐴' : '🧑‍🌾', R);
    },
    // Standing soldier: legs, torso, head; tier 1 adds a helmet band, tier 2 adds a shield.
    drawInfantrySilhouette(x, h, tier) {
        x.beginPath(); x.rect(-h*0.22, h*0.05, h*0.18, h*0.55); x.fill(); x.stroke();
        x.beginPath(); x.rect(h*0.04, h*0.05, h*0.18, h*0.55); x.fill(); x.stroke();
        x.beginPath(); x.ellipse(0, -h*0.25, h*0.32, h*0.32, 0, 0, Math.PI*2); x.fill(); x.stroke();
        x.beginPath(); x.arc(0, -h*0.68, h*0.16, 0, Math.PI*2); x.fill(); x.stroke();
        x.save(); x.strokeStyle = '#ccc'; x.lineWidth = Math.max(2, h*0.09);
        x.beginPath(); x.moveTo(h*0.3, -h*0.3); x.lineTo(h*0.55, -h*0.65); x.stroke(); x.restore();
        if(tier >= 1) {
            x.save(); x.strokeStyle = this.TROOP_TIER_ACCENT[tier]; x.lineWidth = Math.max(1, h*0.06);
            x.beginPath(); x.arc(0, -h*0.68, h*0.19, Math.PI*1.15, Math.PI*1.85); x.stroke(); x.restore();
        }
        if(tier >= 2) {
            x.save(); x.fillStyle = '#5b4632';
            x.beginPath(); x.ellipse(-h*0.42, -h*0.1, h*0.16, h*0.26, 0, 0, Math.PI*2); x.fill(); x.stroke(); x.restore();
        }
    },
    // Standing archer with a drawn bow; tier 1 adds a quiver, tier 2 a heavier coat (wider torso).
    drawArcherSilhouette(x, h, tier) {
        x.beginPath(); x.rect(-h*0.2, h*0.05, h*0.16, h*0.55); x.fill(); x.stroke();
        x.beginPath(); x.rect(h*0.04, h*0.05, h*0.16, h*0.55); x.fill(); x.stroke();
        x.beginPath(); x.ellipse(0, -h*0.25, h*(0.26 + tier*0.03), h*0.3, 0, 0, Math.PI*2); x.fill(); x.stroke();
        x.beginPath(); x.arc(0, -h*0.65, h*0.15, 0, Math.PI*2); x.fill(); x.stroke();
        x.save(); x.strokeStyle = '#8a5a2b'; x.lineWidth = Math.max(2, h*0.07);
        x.beginPath(); x.arc(h*0.35, -h*0.3, h*0.35, -Math.PI*0.35, Math.PI*0.35); x.stroke();
        x.strokeStyle = '#eee'; x.lineWidth = 1;
        x.beginPath();
        x.moveTo(h*0.35 + Math.cos(-Math.PI*0.35)*h*0.35, -h*0.3 + Math.sin(-Math.PI*0.35)*h*0.35);
        x.lineTo(h*0.35 + Math.cos(Math.PI*0.35)*h*0.35, -h*0.3 + Math.sin(Math.PI*0.35)*h*0.35);
        x.stroke(); x.restore();
        if(tier >= 1) {
            x.save(); x.fillStyle = '#5b4632';
            x.beginPath(); x.rect(-h*0.38, -h*0.42, h*0.13, h*0.32); x.fill(); x.stroke(); x.restore();
        }
    },
    // An outlined emoji sprite (built once per icon).
    unitSprite(icon, R = 1) {
        if(!this._sprites) this._sprites = {};
        let key = this.rKey(icon, R);
        let c = this._sprites[key];
        if(c) return c;
        c = document.createElement('canvas');
        c.width = c.height = Math.round(40 * R);
        let x = c.getContext('2d');
        x.scale(R, R);
        x.font = '22px Arial';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.strokeStyle = 'rgba(0,0,0,0.85)'; x.lineWidth = 4; x.lineJoin = 'round';
        x.strokeText(icon, 20, 20);
        x.fillText(icon, 20, 20);
        this._sprites[key] = c;
        return c;
    },

    // Make sure nothing new is left to rasterize on the battle's first frame.
    warmUp() {
        this._swordGrad = null;   // the context may have been recreated
        this.UNIT_ICONS.forEach(i => this.unitSprite(i));
        Object.keys(BOSSES).forEach(k => this.bossSprite(k));
        ['infantry', 'archer'].forEach(t => [0, 1, 2].forEach(tier => this.troopSprite(t, tier)));
        this.playerSprite('bow');
        Swordsman.load(); Archer.load();
    },

    // Hand-drawn boss art (#132) — no image-generation tool is available and the game ships
    // zero image assets (everything is drawn live on canvas, baked once per the performance
    // rules), so this is procedural vector art built from basic canvas primitives (arcs, paths,
    // rects), not emoji and not a downloaded image — one bespoke silhouette per boss, baked once
    // into its own offscreen canvas exactly like `unitSprite()` bakes emoji, and drawn through a
    // dedicated branch in `drawUnit` that skips the shared emoji-glyph pipeline entirely.
    BOSS_COLORS: {
        kurt_ana: '#7a5c8e', bozkir_hani: '#c9a24b', demirci_dev: '#b5451f',
        korsan_kral: '#2b2b3d', savas_tanrisi: '#8e1616'
    },
    // Draw size (bounding box) — notably bigger than a regular unit's ~10-20px footprint.
    // Demirci Dev is the biggest of the 4 field bosses ("Dev" = Giant); Savaş Tanrısı, the final
    // boss, is the single largest sprite in the game.
    BOSS_DRAW_SIZE: {
        kurt_ana: 44, bozkir_hani: 46, korsan_kral: 48, demirci_dev: 64, savas_tanrisi: 70
    },
    bossSprite(key, R = 1) {
        if(!this._bossSprites) this._bossSprites = {};
        let ck = this.rKey(key, R);
        let c = this._bossSprites[ck];
        if(c) return c;
        let size = this.BOSS_DRAW_SIZE[key] || 50, half = size / 2;
        c = document.createElement('canvas');
        c.width = c.height = Math.round(size * R);
        let x = c.getContext('2d');
        x.scale(R, R);
        x.translate(half, half);
        x.fillStyle = this.BOSS_COLORS[key] || '#aa00ff';
        x.strokeStyle = 'rgba(0,0,0,0.85)';
        x.lineWidth = Math.max(2, size * 0.05);
        x.lineJoin = 'round';
        const drawers = {
            kurt_ana: this.drawWolfSilhouette, bozkir_hani: this.drawRiderSilhouette,
            demirci_dev: this.drawGiantSilhouette, korsan_kral: this.drawPirateSilhouette,
            savas_tanrisi: this.drawWarGodSilhouette
        };
        (drawers[key] || this.drawGiantSilhouette).call(this, x, half);
        this._bossSprites[ck] = c;
        return c;
    },
    // Crouched wolf: body, head, snout, two ears, four legs.
    drawWolfSilhouette(x, h) {
        x.beginPath(); x.ellipse(0, h*0.15, h*0.75, h*0.4, 0, 0, Math.PI*2); x.fill(); x.stroke();
        x.beginPath(); x.ellipse(-h*0.6, -h*0.05, h*0.35, h*0.28, 0, 0, Math.PI*2); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(-h*0.95, -h*0.05); x.lineTo(-h*0.6, -h*0.2); x.lineTo(-h*0.6, h*0.1); x.closePath(); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(-h*0.75,-h*0.3); x.lineTo(-h*0.6,-h*0.55); x.lineTo(-h*0.45,-h*0.32); x.closePath(); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(-h*0.45,-h*0.3); x.lineTo(-h*0.32,-h*0.5); x.lineTo(-h*0.2,-h*0.28); x.closePath(); x.fill(); x.stroke();
        [-h*0.5,-h*0.1,h*0.3,h*0.6].forEach(lx => { x.beginPath(); x.rect(lx, h*0.35, h*0.15, h*0.35); x.fill(); x.stroke(); });
    },
    // Mounted khan: horse body/neck/legs, rider torso+head, a plume accent.
    drawRiderSilhouette(x, h) {
        x.beginPath(); x.ellipse(0, h*0.15, h*0.85, h*0.35, 0, 0, Math.PI*2); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(h*0.6, -h*0.05); x.lineTo(h*0.95, -h*0.35); x.lineTo(h*0.75, -h*0.15); x.closePath(); x.fill(); x.stroke();
        [-h*0.6,-h*0.2,h*0.2,h*0.6].forEach(lx => { x.beginPath(); x.rect(lx, h*0.4, h*0.14, h*0.4); x.fill(); x.stroke(); });
        x.beginPath(); x.ellipse(-h*0.05, -h*0.35, h*0.3, h*0.35, 0, 0, Math.PI*2); x.fill(); x.stroke();
        x.beginPath(); x.arc(-h*0.05, -h*0.65, h*0.18, 0, Math.PI*2); x.fill(); x.stroke();
        x.save(); x.strokeStyle = '#ffdd88'; x.lineWidth = Math.max(2, h*0.08);
        x.beginPath(); x.moveTo(-h*0.05,-h*0.83); x.lineTo(h*0.05,-h*1.05); x.stroke(); x.restore();
    },
    // Broad hulking blacksmith: legs, wide torso, head, hammer arm.
    drawGiantSilhouette(x, h) {
        x.beginPath(); x.rect(-h*0.35, h*0.25, h*0.3, h*0.6); x.fill(); x.stroke();
        x.beginPath(); x.rect(h*0.05, h*0.25, h*0.3, h*0.6); x.fill(); x.stroke();
        x.beginPath(); x.ellipse(0, -h*0.05, h*0.55, h*0.45, 0, 0, Math.PI*2); x.fill(); x.stroke();
        x.beginPath(); x.arc(0, -h*0.6, h*0.25, 0, Math.PI*2); x.fill(); x.stroke();
        x.beginPath(); x.rect(h*0.4, -h*0.3, h*0.18, h*0.55); x.fill(); x.stroke();
        x.beginPath(); x.rect(h*0.3, -h*0.75, h*0.5, h*0.3); x.fill(); x.stroke();
    },
    // Pirate captain: legs, coat, head, tricorne hat, raised cutlass, a skull accent.
    drawPirateSilhouette(x, h) {
        x.beginPath(); x.rect(-h*0.25, h*0.15, h*0.2, h*0.55); x.fill(); x.stroke();
        x.beginPath(); x.rect(h*0.05, h*0.15, h*0.2, h*0.55); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(-h*0.4,-h*0.3); x.lineTo(h*0.4,-h*0.3); x.lineTo(h*0.5,h*0.25); x.lineTo(-h*0.5,h*0.25); x.closePath(); x.fill(); x.stroke();
        x.beginPath(); x.arc(0, -h*0.55, h*0.22, 0, Math.PI*2); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(-h*0.35,-h*0.65); x.lineTo(h*0.35,-h*0.65); x.lineTo(h*0.15,-h*0.9); x.lineTo(-h*0.15,-h*0.9); x.closePath(); x.fill(); x.stroke();
        x.save(); x.strokeStyle = '#cccccc'; x.lineWidth = Math.max(2, h*0.06);
        x.beginPath(); x.moveTo(h*0.4,-h*0.2); x.lineTo(h*0.75,-h*0.7); x.stroke(); x.restore();
        x.save(); x.fillStyle = '#e8e0c8';
        x.beginPath(); x.arc(-h*0.55, -h*0.05, h*0.1, 0, Math.PI*2); x.fill(); x.restore();
    },
    // War God: aura rings, legs, armored torso, pauldrons, haloed head, a glowing raised weapon.
    drawWarGodSilhouette(x, h) {
        x.save(); x.strokeStyle = 'rgba(255,215,120,0.55)'; x.lineWidth = Math.max(2, h*0.04);
        [0.7,0.85,1.0].forEach(r => { x.beginPath(); x.arc(0, 0, h*r, 0, Math.PI*2); x.stroke(); });
        x.restore();
        x.beginPath(); x.rect(-h*0.28, h*0.2, h*0.22, h*0.55); x.fill(); x.stroke();
        x.beginPath(); x.rect(h*0.06, h*0.2, h*0.22, h*0.55); x.fill(); x.stroke();
        x.beginPath(); x.ellipse(0, -h*0.1, h*0.5, h*0.5, 0, 0, Math.PI*2); x.fill(); x.stroke();
        x.beginPath(); x.arc(-h*0.5, -h*0.35, h*0.2, 0, Math.PI*2); x.fill(); x.stroke();
        x.beginPath(); x.arc(h*0.5, -h*0.35, h*0.2, 0, Math.PI*2); x.fill(); x.stroke();
        x.beginPath(); x.arc(0, -h*0.7, h*0.22, 0, Math.PI*2); x.fill(); x.stroke();
        x.save(); x.strokeStyle = '#ffe9a8'; x.lineWidth = Math.max(2, h*0.05);
        x.beginPath(); x.arc(0, -h*0.7, h*0.34, 0, Math.PI*2); x.stroke(); x.restore();
        x.save(); x.strokeStyle = '#fff4c8'; x.lineWidth = Math.max(3, h*0.08);
        x.beginPath(); x.moveTo(h*0.45,-h*0.2); x.lineTo(h*0.9,-h*0.85); x.stroke(); x.restore();
    },

    // Pulsing outline over the marked ground during the telegraph window (#132) — the actual
    // dodge signal. Nothing draws once the strike itself has landed (state moves to 'strike').
    drawBossSpecial(ctx, u, now) {
        let sp = u.special;
        if(sp.state !== 'telegraph') return;
        let pulse = 0.4 + 0.3 * Math.abs(Math.sin(now / 120));
        ctx.save();
        ctx.strokeStyle = `rgba(255,60,60,${pulse})`;
        ctx.fillStyle = `rgba(255,60,60,${pulse * 0.18})`;
        ctx.lineWidth = 3;
        if(sp.shape === 'circle') {
            ctx.beginPath(); ctx.arc(sp.tx, sp.ty, sp.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        } else {
            ctx.save();
            ctx.translate(sp.tx, sp.ty); ctx.rotate(sp.angle);
            ctx.beginPath(); ctx.rect(0, -sp.width / 2, sp.length, sp.width); ctx.fill(); ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    },

    // Which baked picture a unit wears. Shared by both renderers (1.33.0): `R` is the bake
    // scale — 1 for Canvas2D, device pixels x camera zoom for the WebGL path.
    unitArt(u, R = 1, now = 0) {
        let look = this.spriteLook(u);
        if(look) {
            let a = look.kind === 'horse' ? Mounted.art(look, this.mountAnim(u, now))
                  : look.kind === 'archer' ? Archer.art(look.cloth, ...this.archerAnim(u, now))
                  : Swordsman.art(look, ...this.spriteAnim(u, now));
            if(a) return a;
        }
        // Below: the frame or two before the sprite atlases load, and the units that keep
        // their own art (bosses, beasts, the marked companions).
        let isPlayer = u.id === 'player';
        let icon = '💂', bakedSpr = null;
        if(isPlayer) {
            let wt = state.player.equipment.weapon && state.player.equipment.weapon.weaponType;
            if(u.type === 'cavalry') icon = '🐴';
            else bakedSpr = wt === 'bow' ? this.playerSprite('bow', R) : this.troopSprite('infantry', 0, R);
        }
        else if(u.isBoss) bakedSpr = this.bossSprite(u.bossKey, R);   // hand-drawn boss art (#132)
        else if(u.icon === '🎖️' || u.icon === '💍') icon = u.icon;   // companion/spouse keep their marker
        else if(u.beast) icon = '🐺';
        else if(u.type === 'cavalry' || u.mounted) icon = '🐎';
        // Regular infantry/archer, either side (#132): tier fixed at spawn from the unit's
        // identity (`u.tier`), never from its live attack/defense/level.
        else bakedSpr = this.troopSprite(u.type === 'archer' ? 'archer' : 'infantry', u.tier || 0, R);
        return bakedSpr || this.unitSprite(icon, R);
    },

    // ---- Animated soldiers (visual refresh) ----
    // Who is drawn with which sprite, and how they look. Pure: reads the unit, writes nothing.
    // - foot: the Swordsman (player with a melee weapon: armour -> body, weapon -> sword,
    //   helmet -> head; infantry: fixed tier -> armour/weapon, helmet/hair/skin by id hash);
    // - archer: the hooded archer, cloth dyed (player with a bow, archers on foot);
    // - horse: a Swordsman rider on a Horse (the mounted player — horse coat from the horse's
    //   price —, cavalry and horse archers — coat from the tier).
    // Bosses, beasts and the marked companions keep their own art.
    spriteLook(u) {
        if(!Swordsman.ready() || u.isBoss || u.beast) return null;
        let side = u.cloth && Swordsman.DYE[u.cloth] ? u.cloth : u.isPlayerTeam ? (this.playerCloth || 'player') : (this.enemyCloth || 'bandit');
        let mounted = u.mounted || u.type === 'cavalry';
        if(u.id === 'player')
            return this.heroLook(state.player.equipment, state.player.background && state.player.background.gender === 'female', side, mounted);
        if(u.icon === '🎖️' || u.icon === '💍') return null;
        let tier = Math.max(0, Math.min(2, u.tier || 0)), h = this.idHash(u), lite = Game.lite();
        let rider = {
            armor: tier + 1, weapon: tier + 1, helm: [['', 'cap'], ['cap', 'nasal'], ['nasal', 'greathelm']][tier][h % 2],
            skin: lite ? 0 : (h >>> 3) % 4, hair: lite ? 0 : (h >>> 5) % 6, cloth: side   // a phone bakes fewer faces
        };
        if(mounted) return { kind: 'horse', rider, cloth: side, coat: ['bay', 'grey', 'black'][tier] };
        if(u.type === 'archer') return Archer.ready() ? { kind: 'archer', cloth: side } : null;
        if(u.type !== 'infantry') return null;
        return Object.assign({ kind: 'foot' }, rider);
    },
    // Round 1 chose "the kingdom's colours on the clothes" to tell the sides apart (2.1): a
    // soldier drawn as a sprite wears his side, so only a unit without clothes to show (a beast,
    // the boss, a figure still waiting for its sheet) keeps the ground ring. The player's gold
    // pulse is not a team mark and stays.
    teamRing(u) { return !this.spriteLook(u); },
    // The player's look from what they wear — shared by the battle and the character creation
    // preview (2.1), which feeds it the equipment the chosen background would give
    heroLook(eq, fem, side, mounted) {
        let w = eq.weapon, ar = eq.armor, hm = eq.helmet;
        let rider = {
            armor: !ar ? 1 : (ar.defense || 0) < 20 ? 2 : 3, weapon: !w ? 1 : (w.basePrice || 0) < 400 ? 2 : 3,
            helm: !hm ? '' : (hm.defense || 0) < 5 ? 'cap' : (hm.defense || 0) < 12 ? 'nasal' : 'greathelm',
            skin: 0, hair: fem ? 3 : 0, cloth: side, fem: !!fem,
            // what's in the hand and on the chest beyond the pack's sword and chain (2.1)
            wpn: !w ? '' : /^axe/.test(w.id) ? 'axe' : w.id === 'mace_warhammer' ? 'hammer' : w.id === 'mace_spiked' ? 'spiked' : /^mace/.test(w.id) ? 'mace' : w.weaponType === 'polearm' ? 'spear' : '',
            plate: !!ar && (ar.defense || 0) >= 30
        };
        if(mounted) {
            let hp = (eq.horse && eq.horse.basePrice) || 0;
            return { kind: 'horse', rider, cloth: side, coat: hp < 1000 ? 'bay' : hp < 2000 ? 'grey' : 'black' };
        }
        if(w && w.weaponType === 'bow') return Archer.ready() ? { kind: 'archer', cloth: side } : null;
        return Object.assign({ kind: 'foot' }, rider);
    },
    idHash(u) {
        let s = String(u.id != null ? u.id : u.name || ''), h = 2166136261;
        for(let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
        return h >>> 0;
    },
    spriteFace(a) { let c = Math.cos(a), s = Math.sin(a); return Math.abs(c) >= Math.abs(s) * 0.9 ? (c < 0 ? 'left' : 'right') : (s < 0 ? 'up' : 'down'); },
    // the facing a unit shows when nothing else decides it
    restFacing(u) {
        let moving = Math.abs(u.vx || 0) > 0.1 || Math.abs(u.vy || 0) > 0.1;
        return u.id === 'player' ? this.spriteFace(u.angleToMouse || 0)
             : moving ? this.spriteFace(Math.atan2(u.vy, u.vx))
             // standing still, a unit keeps looking where it last struck or shot (the more
             // recent of the two): an archer that stepped back to shoot faces its target
             : u.shotA !== undefined && !(u.atkT < u.shotT) ? this.spriteFace(u.shotA)
             : u.atkA !== undefined ? this.spriteFace(u.atkA)
             : (u.lastVx || u.lastVy) ? this.spriteFace(Math.atan2(u.lastVy || 0, u.lastVx || 0))
             : (u.isPlayerTeam ? 'right' : 'left');
    },
    // [anim, facing, ms into it] from the unit's own clocks — the same ones unitPose reads.
    spriteAnim(u, now) {
        let isPlayer = u.id === 'player', h = this.idHash(u) % 997, face = a => this.spriteFace(a);
        let moving = Math.abs(u.vx || 0) > 0.1 || Math.abs(u.vy || 0) > 0.1, dir = this.restFacing(u);
        if(u.hp <= 0) return ['Death', dir, (u.deadT || 0) * 1000];
        if(isPlayer && u.isAttacking) return ['attack', face(u.currentWeaponAngle || u.angleToMouse || 0), (1 - Math.max(0, u.attackTimer) / 0.3) * 560];
        // an AI blow lands the moment atkT is reset: show the swing from its striking frame on
        if(!isPlayer && u.atkT !== undefined && u.atkT < 0.35) return ['attack', u.atkA !== undefined ? face(u.atkA) : dir, 210 + u.atkT * 1000];
        if(u.hitT !== undefined && u.hitT < 0.42) return ['Hurt', dir, u.hitT * 1000];
        if(moving) return [Math.hypot(u.vx, u.vy) > 95 ? 'Run' : 'Walk', dir, now + h * 37];
        return ['Idle', dir, now + h * 53];
    },
    // The archer: the release lands on frame 2 of 4 when shotT is reset.
    archerAnim(u, now) {
        let h = this.idHash(u) % 997, dir = this.restFacing(u), moving = Math.abs(u.vx || 0) > 0.1 || Math.abs(u.vy || 0) > 0.1;
        if(u.hp <= 0) return ['Death', dir, (u.deadT || 0) * 1000];
        if(u.shotT !== undefined && u.shotT < 0.3) return ['Attack', u.shotA !== undefined ? this.spriteFace(u.shotA) : dir, 300 + u.shotT * 1000];
        if(u.hitT !== undefined && u.hitT < 0.24) return ['Hurt', dir, u.hitT * 1000];
        // stepping back from a close enemy between shots: walk backwards, eyes on the target
        if(moving && u.shotT < 2 && Math.cos(Math.atan2(u.vy, u.vx) - u.shotA) < 0) return ['Walk', this.spriteFace(u.shotA), now + h * 37];
        if(moving) return ['Walk', dir, now + h * 37];
        return ['Idle', dir, now + h * 53];
    },
    // A rider: the horse faces left or right and walks or gallops by speed; the rider's own
    // animation (idle, swing, hurt, fall) runs on top.
    mountAnim(u, now) {
        let [anim, dir, t] = this.spriteAnim(u, now), h = this.idHash(u) % 997;
        let lr = a => Math.cos(a) < 0 ? 'left' : 'right';
        let facing = dir === 'left' || dir === 'right' ? dir
                   : Math.abs(u.vx || 0) > 0.1 ? lr(Math.atan2(u.vy || 0, u.vx))
                   : u.atkA !== undefined ? lr(u.atkA) : (u.isPlayerTeam ? 'right' : 'left');
        let sp = Math.hypot(u.vx || 0, u.vy || 0);
        if(anim === 'Run' || anim === 'Walk') anim = 'Idle';
        return { gait: sp < 0.1 ? 'stand' : sp < 60 ? 'walk' : 'gallop', gt: now + h * 41, facing, anim, t,
                 dead: u.hp <= 0, deadT: u.deadT || 0 };
    },
    // How long a fallen unit stays drawn: the sprite's own death animation, then a fade.
    SPRITE_DIE_T: 1.3,
    dieT(u) { return this.spriteLook(u) ? this.SPRITE_DIE_T : this.DIE_T; },

    // The walk/gallop rhythm, read by the pose below, the hoofbeats in update() and nothing
    // else — one set of numbers, so the clop lands on the hop you see.
    gait(u, now) {
        let moving = (Math.abs(u.vx) > 0.1 || Math.abs(u.vy) > 0.1);
        let offset = (u.x + u.y) * 0.05;
        // A horse's gait reads distinctly from a foot soldier's walk (#132: mounted movement
        // "flew" — dead smooth regardless of speed). The stride period now tracks actual
        // velocity — a galloping horse's legs move faster than a trotting one's — and the
        // bounce/tilt is bigger, so covering ground at speed looks like running, not sliding.
        let mounted = u.mounted || u.type === 'cavalry';
        let speedMag = mounted ? Math.hypot(u.vx, u.vy) : 0;
        // Half the old cadence (1.32.1 report: "it rocks too fast"): the 85 ms floor meant ~3.7
        // bounces a second at a gallop, which read as jitter. Now ~1.9 at full tilt, the same
        // rhythm the hoofbeats follow.
        let strideMs = mounted ? Math.max(170, 12000 / Math.max(25, speedMag)) : 150;
        // Mounted bob toned down (1.32.1 report: "the horse rocks too much"): 7 px / 0.24 rad
        // read as a boat in a storm once 1.32.0's stretch and lean stacked on top.
        let hopAmp = mounted ? 3.5 : 4, swayAmp = mounted ? 0.07 : 0.15;
        let phase = Math.sin(now/strideMs + offset);
        return { moving, mounted, offset, strideMs,
                 hop: moving ? Math.abs(phase) * hopAmp : 0, sway: moving ? phase * swayAmp : 0, phase: Math.abs(phase) };
    },

    // ---- Motion layer (1.32.0): offsets, lean and squash read off the unit's animation
    // clocks (atkT/hitT/shotT/deadT, ticked in update). Drawn-only: the unit's real x/y —
    // hit boxes, AI, collisions — never move. "Reduce motion" keeps the fall, drops the rest.
    // A pure function of (unit, now): both renderers draw exactly this pose (1.33.0).
    unitPose(u, now) {
        let gt = this.gait(u, now), hop = gt.hop, sway = gt.sway, strideMs = gt.strideMs, offset = gt.offset;
        let fx = Anim.on(), dead = u.hp <= 0;
        let ox = 0, oy = 0, lean = 0, sx = 1, sy = 1, alpha = 1;
        if(dead) {
            // Tips over away from its killer and sinks, then fades while the corpse fades in
            let k = Anim.k(u.deadT, this.DIE_T, 'inQuad');
            lean = (u.fallDir || 1) * 1.45 * k; oy = 4 * k; hop = 0; sway = 0;
            alpha = 1 - Anim.k(u.deadT - 0.3, this.DIE_T - 0.3, 'inOutQuad');
        } else if(fx) {
            // Swing: a lunge toward the target and back
            if(u.atkT < 0.3) { let b = Anim.ease.bump(Anim.k(u.atkT, 0.3, 'outQuad')) * 6; ox += Math.cos(u.atkA) * b; oy += Math.sin(u.atkA) * b; }
            // Shot: a small kick back along the arrow
            if(u.shotT < 0.25) { let b = Anim.decay(u.shotT, 0.25) * 3; ox -= Math.cos(u.shotA) * b; oy -= Math.sin(u.shotA) * b; }
            // Hit: squashed by the blow, pushed back, leaning away — then springs back
            if(u.hitT < 0.3) {
                let d = Anim.decay(u.hitT, 0.3);
                sx += 0.16 * d; sy -= 0.14 * d;
                ox += Math.cos(u.hitA) * 3 * d; oy += Math.sin(u.hitA) * 1.5 * d;
                lean += Math.cos(u.hitA) * 0.22 * d;
            }
            // Walking: stretches on the stride and leans into the run; standing: breathes
            if(gt.moving) {
                let c = Math.cos(2 * (now / strideMs + offset));
                let g = gt.mounted ? 0.4 : 1;   // a horse carries its rider level; a man on foot bounces
                sy *= 1 + 0.05 * g * c; sx *= 1 - 0.04 * g * c;
                lean += Math.max(-1, Math.min(1, u.vx / 140)) * 0.08 * g;
            } else sy *= 1 + 0.018 * Math.sin(now / 650 + offset);
        }
        if(this.spriteLook(u)) {
            // The sprite's frames already walk, flinch and fall: keep only the lunge/knockback
            // offsets, and fade a fallen one out once its death animation has played.
            hop = 0; sway = 0; lean = 0; sx = 1; sy = 1;
            if(dead) { ox = 0; oy = 0; alpha = 1 - Anim.k((u.deadT || 0) - 0.9, this.SPRITE_DIE_T - 0.9, 'inOutQuad'); }
        }
        return { ux: u.x + ox, uy: u.y + oy, hop, sway, lean, sx, sy, alpha, dead, moving: gt.moving };
    },

    // A stable 0..1 hash — the draw path's stand-in for Math.random (1.33.0): rendering must
    // not consume the game's random stream, and the same frame must draw the same picture.
    hash01(a, b) { let s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); },
    // A dust puff kicked up by a walking unit this frame, or null — a quarter of the frames,
    // as before, just picked by hash instead of by Math.random.
    dustPuff(u, now, offset) {
        let f = Math.floor(now / 16);
        if(this.hash01(f, offset) >= 0.25) return null;
        return { x: u.x + (this.hash01(f + 0.5, offset) - 0.5) * 8, y: u.y + 9, r: 1.5 + this.hash01(f, offset + 7.7) * 2.5 };
    },

    drawUnit(ctx, u, now) {
        let isPlayer = u.id === 'player';
        let pose = this.unitPose(u, now);
        let hop = pose.hop, sway = pose.sway, lean = pose.lean, sx = pose.sx, sy = pose.sy, alpha = pose.alpha, dead = pose.dead;
        let isMoving = pose.moving;
        let ring = u.isPlayerTeam ? '#4fa8ff' : '#ff5a4a';
        let ux = pose.ux, uy = pose.uy;

        // Ground shadow + team ring (filled and fully opaque so it doesn't wash out against the ground)
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.ellipse(u.x, u.y + 9, 12, 5.5, 0, 0, Math.PI*2);
        ctx.fillStyle = `rgba(0,0,0,${0.5 - hop*0.03})`; ctx.fill();

        if(!dead) {
            if(this.teamRing(u)) {
                ctx.beginPath();
                ctx.ellipse(u.x, u.y + 9, 10, 4.5, 0, 0, Math.PI*2);
                ctx.fillStyle = u.isPlayerTeam ? 'rgba(79,168,255,0.28)' : 'rgba(255,90,74,0.28)';
                ctx.fill();
                // Telling teams apart doesn't rely on color alone (#55 item 6): the friendly ring is solid,
                // the enemy's is dashed — still distinguishable on a grayscale screen.
                ctx.setLineDash(u.isPlayerTeam ? [] : [4, 3.2]);
                ctx.strokeStyle = ring; ctx.lineWidth = 2.5; ctx.stroke();
                ctx.setLineDash([]);
            }

            if(isPlayer) {
                let pulse = 1 + Math.sin(now/300)*0.12;
                ctx.beginPath();
                ctx.ellipse(u.x, u.y + 9, 14*pulse, 6.5*pulse, 0, 0, Math.PI*2);
                ctx.strokeStyle = 'rgba(255,204,0,0.85)'; ctx.lineWidth = 2.5; ctx.stroke();
            }

            let dp = isMoving && !Game.lite() ? this.dustPuff(u, now, (u.x + u.y) * 0.05) : null;
            if(dp) {
                ctx.fillStyle = 'rgba(196,186,150,0.35)';
                ctx.beginPath(); ctx.arc(dp.x, dp.y, dp.r, 0, Math.PI*2); ctx.fill();
            }
        }

        ctx.save();
        ctx.translate(ux, uy - hop);
        ctx.rotate(sway);
        let spr = this.unitArt(u, 1, now), k = spr._k || 1, sw = spr.width * k, sh = spr.height * k, h2 = sh / 2;
        // Lean, fall and squash pivot on the feet, not the middle of the sprite (1.32.0). A
        // Swordsman frame carries its own feet anchor (_ax/_ay) and scale (_k).
        let foot = spr._ay !== undefined ? this.SPRITE_FOOT : h2, ax = spr._ax !== undefined ? spr._ax : 0.5, ay = spr._ay !== undefined ? spr._ay : 1;
        ctx.translate(0, foot); ctx.rotate(lean); ctx.scale(sx, sy);
        if(spr._pixel) ctx.imageSmoothingEnabled = false;
        ctx.drawImage(spr, -ax * sw, -ay * sh, sw, sh);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        if(u.level >= 5) {
            let rankStr = u.level >= 20 ? '^' : u.level >= 15 ? "'''" : u.level >= 10 ? "''" : "'";
            ctx.fillStyle = '#ffcc44';
            ctx.font = 'bold 15px Inter, sans-serif';
            ctx.fillText(rankStr, -12, spr._rankY !== undefined ? spr._rankY : -12 - h2);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
        if(dead) return;   // a falling unit has no flash, weapon, shield or health bar

        // Hit flash — fades out on a curve rather than a straight line (1.32.0)
        let flash = u.hitT !== undefined ? Anim.decay(u.hitT, 0.3) * 0.75 : 0;
        if(flash > 0.01) {
            ctx.globalAlpha = flash;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(ux, uy - hop, 13, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Swing trail for everyone but the player, whose own sword is drawn below (1.32.0):
        // AI hits used to land without anything on screen to say a blow was struck.
        if(!isPlayer && u.atkT < 0.22) {
            let k = Anim.k(u.atkT, 0.22, 'outCubic'), a0 = u.atkA - 0.85;
            ctx.beginPath(); ctx.arc(ux, uy - hop - 2, 20, a0, a0 + 1.7 * k);
            ctx.strokeStyle = `rgba(255,245,215,${0.6 * (1 - k)})`; ctx.lineWidth = 1 + 2.5 * (1 - k); ctx.stroke();
        }

        // Shield (while blocking) — a 60° arc it faces, flashes white on a hit
        if(u.blocking) {
            let ba = u.blockAngle || 0;
            ctx.save();
            ctx.translate(ux, uy - hop);
            ctx.beginPath();
            ctx.arc(0, 0, 20, ba - Math.PI/3, ba + Math.PI/3);
            ctx.lineWidth = u.blockFlash > 0 ? 7 : 5;
            ctx.strokeStyle = u.blockFlash > 0 ? '#ffffff' : (u.hasShield ? 'rgba(150,190,255,0.9)' : 'rgba(190,190,190,0.6)');
            ctx.stroke();
            ctx.restore();
        }

        // Bow (right after firing an arrow) — AI archers show theirs too (1.32.0)
        let bowUp = isPlayer ? u.bowTimer > 0 : u.shotT < 0.25;
        if(bowUp && !spr._bow) {   // the archer sprite draws its own bow
            ctx.save();
            ctx.translate(ux, uy - hop);
            ctx.rotate((isPlayer ? u.angleToMouse : u.shotA) || 0);
            ctx.beginPath();
            ctx.arc(12, 0, 11, -Math.PI/2.2, Math.PI/2.2);
            ctx.lineWidth = 2.5; ctx.strokeStyle = '#c8a24a'; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(12 + 11*Math.cos(-Math.PI/2.2), 11*Math.sin(-Math.PI/2.2));
            ctx.lineTo(12 + 11*Math.cos(Math.PI/2.2), 11*Math.sin(Math.PI/2.2));
            ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.stroke();
            ctx.restore();
        }

        // A Swordsman player swings the sprite's own sword; the trail still shows where it cuts.
        let spritePlayer = isPlayer && spr._ay !== undefined;
        if(spritePlayer && u.isAttacking) {
            let a1 = u.currentWeaponAngle || 0, k2 = 1 - Math.max(0, u.attackTimer) / 0.3;
            ctx.beginPath(); ctx.arc(ux, uy - hop - 2, 24, a1 - 1.2 * Math.min(1, k2 + 0.2), a1);
            ctx.strokeStyle = `rgba(255,245,215,${0.7 * (1 - k2 * 0.6)})`; ctx.lineWidth = 3; ctx.stroke();
        }
        // Sword (while swinging)
        if(u.isAttacking && !spritePlayer) {
            ctx.save();
            ctx.translate(ux, uy - hop);
            ctx.rotate(u.currentWeaponAngle || 0);
            ctx.beginPath();
            ctx.moveTo(10,-2); ctx.lineTo(15,-2); ctx.lineTo(15,-6); ctx.lineTo(18,-6);
            ctx.lineTo(18,-2); ctx.lineTo(40,-2); ctx.lineTo(45,0); ctx.lineTo(40,2);
            ctx.lineTo(18,2); ctx.lineTo(18,6); ctx.lineTo(15,6); ctx.lineTo(15,2);
            ctx.lineTo(10,2); ctx.closePath();
            if(!this._swordGrad) {
                let sg = ctx.createLinearGradient(10,-4,45,4);
                sg.addColorStop(0, '#8a7a55'); sg.addColorStop(0.35, '#f2f2f6'); sg.addColorStop(1, '#9aa0aa');
                this._swordGrad = sg;   // drawn after the transform, so local coordinates stay fixed
            }
            ctx.fillStyle = this._swordGrad; ctx.fill();
            ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 1; ctx.stroke();
            ctx.restore();
        }

        // HP bar — only if wounded (and always for the player)
        if(u.hp < u.maxHp || isPlayer) {
            let bw = 26, r = Math.max(0, u.hp / u.maxHp);
            let by = u.y - 20 - hop;
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            this.roundRect(ctx, u.x - bw/2 - 1, by - 1, bw + 2, 5, 2.5); ctx.fill();
            ctx.fillStyle = r > 0.5 ? '#41d06a' : r > 0.25 ? '#e8c93a' : '#e0463a';
            if(bw * r > 0.5) { this.roundRect(ctx, u.x - bw/2, by, bw * r, 3, 1.5); ctx.fill(); }
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(u.x - bw/2, by, bw * r, 1);
        }
    },

    // Where the HUD sits (#65, #86): on a touch device the bottom half belongs to the sticks
    // and the log, so the command strip and status line move under the power bar instead.
    hudLayout(W, H) {
        const touch = Game.isTouch();
        // The `B - 40 / -26 / -56 / -76` offsets stay the same either way.
        return { touch, B: touch ? 150 : H, hudW: touch ? Math.min(150, W - 24) : Math.min(360, W - 24) };
    },
    // The command strip, or false when there is nothing to command (#114): in a duel or an
    // arena bout the whole box was drawn for orders that could never be given.
    drawCmdStrip(ctx, B, hudW, touch) {
        if(!(this.cmdSlots && this.cmdSlots.length)) return false;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        let cmdName = this.currentCommand === 'follow' ? T('Takip Et') : this.currentCommand === 'hold' ? T('Mevzini Koru') : T('Hücum Et');
        ctx.fillStyle = 'rgba(12,14,10,0.72)';
        this.roundRect(ctx, 12, B - 40, hudW, 28, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(200,170,90,0.45)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#e9d9a8'; ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText(`⚑ ${cmdName}`, 22, B - 26);
        // On touch, the command list isn't written to the canvas a second time (#86): the `#tcmds`
        // buttons already show which command is open. On a 390px screen
        // the two lists didn't fit side by side, "⚑ Attack" and "[2] Attack" ran into each other.
        if(!touch) {
            // Commands not yet open are dim: the player sees what's coming and when
            ctx.font = '11px Inter, sans-serif';
            let lbl = { '1': T('Takip'), '2': T('Hücum'), '3': T('Bekle') };
            let x = 22 + hudW*0.42;
            this.cmdSlots.forEach(c => {
                ctx.fillStyle = c.open ? 'rgba(233,217,168,0.75)' : 'rgba(233,217,168,0.22)';
                let t = `[${c.key}] ${lbl[c.key]} `;
                ctx.fillText(t, x, B - 26);
                x += ctx.measureText(t).width + 4;
            });
        }
        return true;
    },
    // A signature of everything drawCmdStrip reads — the WebGL renderer re-bakes the strip
    // only when this changes.
    cmdStripKey(hudW, touch) {
        if(!(this.cmdSlots && this.cmdSlots.length)) return '';
        return [hudW, touch, this.currentCommand, I18N.lang, this.cmdSlots.map(c => c.open ? 1 : 0).join('')].join('|');
    },
    // Player status line: mount, arrows, block — { text, color } or null when the player is down.
    statusLine(touch) {
        let pl = this._byId ? this._byId['player'] : null;
        if(!(pl && pl.hp > 0)) return null;
        let bits = [pl.type === 'cavalry' ? T('🐴 Atlı') : T('🥾 Yaya')];
        if(this.playerHasBow()) bits.push(T`🏹 ${this.arrows} ok`);
        const blockKeyHint = touch ? T('🛡 düğmesi') : T('[Sağ tık/Shift]');
        // On touch the block button is right there on screen; writing how to block every frame
        // just wasted space on a narrow screen (#86). The moment of blocking is still shown.
        if(pl.blocking) bits.push(T('🛡 BLOK'));
        else if(!touch) bits.push(this.playerHasShield() ? T`🛡 ${blockKeyHint} blok` : T`${blockKeyHint} savuştur`);
        // Terrain and stamina used to be invisible multipliers: the player couldn't tell why they were slower.
        if(this.getTerrainEffects(pl).speedMod < 1) bits.push(T('🌲 Ağır Zemin'));
        if((pl.chargeCd || 0) > 0) bits.push(T('💨 Soluklanıyor'));
        return { text: bits.join('   ·   '), color: pl.blocking ? '#bcd8ff' : 'rgba(233,217,168,0.75)' };
    },
    tugStatus(tug) {
        if(tug > 0.8) return T('Ağlatıyoruz! 😂');
        if(tug > 0.6) return T('Tokatlıyoruz! 😎');
        if(tug < 0.2) return T('Eyvah Anam! 😱');
        if(tug < 0.4) return T('Dayak Yiyoruz! 😬');
        return T('Kafa Kafaya! ⚔️');
    },
    // Tug-of-war geometry, shared by both renderers.
    tugBox(W) { let barW = Math.min(460, W - 130), barH = 22; return { barW, barH, barX: W/2 - barW/2, barY: 34 }; },
    // Minimap geometry, shared by both renderers: the top-right corner, unless the tug bar
    // would run under it (every phone in portrait) — then it drops below the tug bar and the
    // touch log strip (style.css, top 66px).
    miniBox(W) {
        let mw = Math.min(150, W * 0.28), mh = mw * 0.62, mx = W - mw - 12, t = this.tugBox(W);
        return { mw, mh, mx, my: t.barX + t.barW + 14 > mx ? t.barY + t.barH + 36 : 12 };
    },

    drawHud(ctx, W, H, now) {
        let { touch, B, hudW } = this.hudLayout(W, H);
        // Command strip
        this.drawCmdStrip(ctx, B, hudW, touch);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';

        let st = this.statusLine(touch);
        if(st) {
            ctx.fillStyle = st.color;
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillText(st.text, 22, B - 56);
        }

        if(this.knockedOut) {
            ctx.fillStyle = 'rgba(255,70,70,0.9)'; ctx.font = 'bold 13px Inter, sans-serif';
            ctx.fillText(T('☠ Baygınsın — adamların savaşıyor'), 22, B - 76);
        }

        // Power bar
        let playerAlive = this.units.filter(u => u.isPlayerTeam && u.hp > 0).length;
        let enemyAlive = this.units.filter(u => !u.isPlayerTeam && u.hp > 0).length;
        let total = playerAlive + enemyAlive;
        if(total <= 0) return;

        let tug = this.tugShown(playerAlive / total);

        let { barW, barH, barX, barY } = this.tugBox(W);

        ctx.fillStyle = 'rgba(10,12,9,0.75)';
        this.roundRect(ctx, barX - 6, barY - 6, barW + 12, barH + 12, (barH + 12) / 2); ctx.fill();
        ctx.strokeStyle = 'rgba(200,170,90,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.save();
        this.roundRect(ctx, barX, barY, barW, barH, barH / 2); ctx.clip();   // soft pill ends (1.32.0)

        let fill = barW * tug;
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
        ctx.restore();

        let jitter = Math.sin(now/110) * 3;
        ctx.fillStyle = '#fff';
        ctx.fillRect(barX + fill - 2 + jitter, barY - 5, 4, barH + 10);
        ctx.fillStyle = 'rgba(255,220,120,0.9)';
        ctx.fillRect(barX + fill - 1 + jitter, barY - 5, 2, barH + 10);

        let statusText = this.tugStatus(tug);

        if(!Game.lite()) { ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 6; }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f3e6c0'; ctx.font = 'bold 18px Cinzel, serif';
        ctx.fillText(statusText, W/2, barY - 18);
        ctx.font = 'bold 13px Inter, sans-serif'; ctx.fillStyle = '#fff';
        ctx.textAlign = 'left'; ctx.fillText(T`Biz ${playerAlive}`, barX + 8, barY + barH/2);
        ctx.textAlign = 'right'; ctx.fillText(T`${enemyAlive} Düşman`, barX + barW - 8, barY + barH/2);
        ctx.shadowBlur = 0;
    },
    // The tug-of-war bar eases toward the live ratio with a 0.14 s half-life — the old "8% per
    // frame" felt the same at 60 fps but crawled at half speed at 30 (1.32.0). Ticked in
    // update() since 1.33.0 (it used to be written from inside the HUD drawing).
    tickTug(dt) {
        let p = 0, e = 0;
        this.units.forEach(u => { if(u.hp > 0) u.isPlayerTeam ? p++ : e++; });
        if(p + e <= 0) return;
        this.tugRatio = this.tugRatio === undefined ? p / (p + e) : Anim.damp(this.tugRatio, p / (p + e), Math.min(0.1, dt), 0.14);
    },
    // What the bar shows: the eased value, or the live ratio before the first tick.
    tugShown(ratio) { return this.tugRatio === undefined ? ratio : this.tugRatio; },
    // Hoofbeats (#132): only the player's own mount, timed to its own stride (Battle.gait) —
    // a clop lands each time the visual hop peaks, hysteresis so one peak = one sound. Lived
    // in drawUnit until 1.33.0; the draw path no longer writes state or plays sound.
    tickHooves(now) {
        let u = this._byId && this._byId['player'];
        if(!u || u.hp <= 0) return;
        let gt = this.gait(u, now);
        if(!gt.mounted || !gt.moving) return;
        if(gt.phase > 0.97 && !u._hoofUp) { u._hoofUp = true; Game.sfx('hoofbeat'); }
        else if(gt.phase < 0.9) u._hoofUp = false;
    },

    logKill(victim, killer) {
        // The fall (1.32.0): the unit keeps being drawn for DIE_T seconds, tipping over away
        // from its killer and fading while its corpse fades in underneath (see drawUnit).
        victim.deadT = 0;
        victim.fallDir = killer && killer.x > victim.x ? -1 : 1;
        if(Game.opt('gore')) {
            this.corpses.push({ x: victim.x, y: victim.y, isPlayerTeam: victim.isPlayerTeam, rot: Math.random()*Math.PI*2, born: this.battleTime });
            // #114: a duel has only one kill in it — make that final blow read as heavier.
            if(this.isDuel) {
                for(let i = 0; i < 4; i++) this.bloodStains.push({
                    x: victim.x + (Math.random()-0.5)*20, y: victim.y + (Math.random()-0.5)*20,
                    size: 8 + Math.random()*10, alpha: 1
                });
            }
        }
        let capCorpse = Game.lite() ? 20 : 60;
        while(this.corpses.length > capCorpse) this.corpses.shift();
        // #120: death record for the post-battle detail tab.
        if(this._battleLog) this._battleLog.deaths.push({
            name: victim.name || (victim.isPlayerTeam ? T('Dost Asker') : T('Çapulcu')),
            isPlayerTeam: !!victim.isPlayerTeam, type: victim.type || 'infantry', level: victim.level || 1,
            killerName: killer ? (killer.name || (killer.isPlayerTeam ? T('Dost Asker') : T('Çapulcu'))) : T('Bilinmeyen')
        });
        if(killer && killer.id === 'player' && !victim.isPlayerTeam && this._battleLog) this._battleLog.playerKills++;
        if(victim.id === 'player') {
            this.knockedOut = true;
            this.log(T('<span style="color:#ff4444"><b>Yere yığıldın!</b> Adamların savaşa devam ediyor…</span>'), 'right');
        }
        let vName = T(victim.name || (victim.isPlayerTeam ? 'Dost Asker' : 'Çapulcu'));
        let kName = killer ? T(killer.name || (killer.isPlayerTeam ? 'Dost Asker' : 'Çapulcu')) : T('Bilinmeyen');
        let msg = `☠ ${vName} <span style="opacity:.6">←</span> ${kName}`;

        if (victim.isPlayerTeam) {
            this.log(`<span style="color:#ff6666">${msg}</span>`, 'right');
        } else {
            this.log(`<span style="color:#66dd77">${msg}</span>`, 'left');
        }
    },

    log(msg, side = 'left') {
        // On a phone the two corner logs used to eat the bottom half of the screen and sit right
        // on top of the player — you couldn't see yourself. On touch everything collapses into one strip and
        // only the **last** line stays; the color already tells which side it's from.
        const touch = Game.isTouch();
        let b = document.getElementById(touch || side === 'left' ? 'battle-log-left' : 'battle-log-right');
        if(!b) return;
        let div = document.createElement('div');
        div.className = 'log-msg';
        div.innerHTML = msg;
        div.style.padding = '5px 10px';
        div.style.color = '#fff';
        div.style.fontFamily = 'Inter, sans-serif';
        div.style.transition = 'opacity 0.5s';
        
        b.prepend(div);
        while(b.children.length > (touch ? 1 : 5)) b.removeChild(b.lastChild);
        
        setTimeout(() => {
            if(b.contains(div)) div.style.opacity = '0';
            setTimeout(() => { if(b.contains(div)) b.removeChild(div); }, 500);
        }, 4500);
    },

    // --- PARTIAL ENGAGEMENT, WAVES, AND AUTO-RESOLVE (#30) ---
    // Warband's "battlefield capacity": a 100-strong army doesn't all
    // pile onto the field at once; only capacity's worth fights, and reserves enter in waves as the field clears.
    FIELD_CAP: 30,
    reserves: { p: [], e: [] },
    splitReserves(H, startPlayerX, startEnemyX) {
        this._spawn = { H, p: startPlayerX, e: startEnemyX };
        this.reserves = { p: [], e: [] };
        [true, false].forEach(team => {
            let side = team ? 'p' : 'e';
            let list = this.units.filter(u => u.isPlayerTeam === team && u.id !== 'player');
            let over = list.length - (this.FIELD_CAP - (team ? 1 : 0));   // the player also takes up a slot
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
            // In one wave, not a trickle: once the field drops under 70% a full batch of reinforcements comes in
            if(live > this.FIELD_CAP * 0.7) return;
            let n = 0;
            while(n < this.FIELD_CAP - live && pool.length) {
                let u = pool.shift();
                u.x = (team ? this._spawn.p : this._spawn.e) + Math.random() * 60 - 30;
                u.y = 50 + Math.random() * (this._spawn.H - 100);
                this.units.push(u); n++;
            }
            if(n) this.log(`🚩 <b>${T`Takviye dalgası:</b> ${n} ${team ? T('asker sahaya girdi') : T('düşman sahaya girdi')} (yedek: ${pool.length})`}`, team ? 'left' : 'right');
        });
    },
    // Send your troops in: the winner's losses are inversely proportional to the strength ratio (Lanchester's
    // *linear* law). The square law was tried — at 5x superiority losses dropped to 3%,
    // making auto-resolve free. With a 0.45 coefficient, 2x superiority costs ~22%, 5x ~9%,
    // 10x ~4%; fighting it by hand is still cheaper. The Leadership skill reduces it by up to 40%.
    autoResolve() {
        this.reserves = { p: [], e: [] };
        let str = team => this.units.filter(u => u.isPlayerTeam === team)
            .reduce((a, u) => a + u.hp * (u.attack + 2), 0);
        let q = str(true) / Math.max(1, str(false)) * (0.85 + Math.random() * 0.3);   // ±15% luck factor
        let won = q > 1, ratio = won ? q : 1 / q;
        let loss = Math.min(0.85, 0.45 / ratio
            * (1 - Math.min(0.4, (Game.profLvl('leadership') - 1) * 0.04))
            * (won ? Game.diff().taken : 1));   // difficulty: your own losses scale when you win
        this.units.forEach(u => {
            if(u.isPlayerTeam !== won) { u.hp = 0; return; }              // the losing side falls entirely
            if(u.id !== 'player' && Math.random() < loss) u.hp = 0;
        });
        let pu = this.units[0];
        if(won) pu.hp = Math.max(5, Math.round(pu.hp * (1 - loss * 0.6)));   // the player is battered, not killed
        this.autoLoss = loss;
        this.active = false;
        this.endBattle(won);
    },

    // --- ROUT AND PURSUIT ---
    // An army doesn't fight to its last man. Once a side's headcount drops below a quarter
    // of the start, it stops fighting and runs to the edge it came from. Once a fleeing unit
    // leaves the field it's removed from `units`; since loot, capture, and casualty counts already
    // run off that list, the fleeing unit's accounting comes out right with no extra branch (not dead, not looted, not captured).
    ROUT_AT: 0.25,       // remaining headcount / starting headcount
    ROUT_MIN: 6,         // a band of six or fewer never routs — the clash is already over by then
    ROUT_SPEED: 1.2,     // runs for dear life: a slow fugitive gets caught, a fast one gets away
    routCheck() {
        ['p', 'e'].forEach(side => {
            if(this.routed[side] || this.startN[side] < this.ROUT_MIN) return;
            let team = side === 'p';
            let ayakta = this.units.filter(u => u.isPlayerTeam === team && u.hp > 0 && u.id !== 'player');
            if(ayakta.length + this.reserves[side].length > this.startN[side] * this.ROUT_AT) return;
            this.routed[side] = true;
            this.reserves[side] = [];   // a broken army's reserves are never sent into the field
            ayakta.forEach(u => {
                u.routing = true;
                this.floatingTexts.push({ x: u.x, y: u.y - 20, text: T('bozgun!'), color: '#ffdd55', life: 1.6 });
            });
            if(team) this.log(`😱 <b>${T('Adamların dağıldı!')}</b> ${T('Kalanlar sahayı terk ediyor.')}`, 'left');
            else {
                this.log(`🏳️ <b>${T('Düşman bozuldu!')}</b> ${T('Peşlerine düşebilir ya da bırakabilirsin.')}`, 'right');
                this.showRoutPrompt();
            }
        });
    },
    showRoutPrompt() {
        let ui = document.getElementById('battle-ui');
        if(!ui || document.getElementById('rout-prompt')) return;
        let d = document.createElement('div');
        d.id = 'rout-prompt';
        d.innerHTML = `<span>🏳️ ${T('Düşman kaçıyor')}</span>`
            + `<button class="btn" onclick="Battle.spareRouters()">🕊️ ${T('Bırak Gitsinler')}</button>`;
        ui.insertBefore(d, document.getElementById('btn-surrender'));
    },
    clearRoutPrompt() {
        let d = document.getElementById('rout-prompt');
        if(d && d.parentNode) d.parentNode.removeChild(d);
    },
    // Both chasing and letting go have a cost: cut down the fleeing and you get loot and prisoners, let them go and
    // you get honor. Which one you can afford depends on your horse's speed — the numbers do the work here.
    spareRouters() {
        if(!this.active || !this.routed.e) return;
        let n = 0;
        this.units.forEach(u => { if(!u.isPlayerTeam && u.hp > 0) { u.escaped = true; n++; } });
        this.units = this.units.filter(u => !u.escaped);
        this.spared = n;
        this.clearRoutPrompt();
        this.log(`🕊️ <b>${T`${n} kaçağı bıraktın.`}</b>`, 'right');
        this.checkEnd();
    },

    checkEnd() {
        this.routCheck();
        this.reinforce();
        if(this.pendingEnd !== undefined) return;
        let pAlive = this.units.some(u=>u.isPlayerTeam&&u.hp>0) || this.reserves.p.length > 0;
        let eAlive = this.units.some(u=>!u.isPlayerTeam&&u.hp>0) || this.reserves.e.length > 0;
        if(pAlive && eAlive) return;
        let won = pAlive;   // exactly one side (at most) is still standing at this point
        // Arena, tournament and honour duels get a beat on the final blow before the result
        // modal (#114) — a freeze-frame, via the guard at the top of update(). A full field
        // battle still ends the instant the last side falls; delaying every battle risked
        // interfering with auto-resolve/reserve timing nobody asked to change here.
        if(this.isDuel || this.isArena || this.isTourney) { this.pendingEnd = won; this.endDelay = 1.0; return; }
        this.active = false;
        this.endBattle(won);
    },

    // An enemy who can't match you isn't worth much: loot and experience are cut down by the strength ratio.
    // Enemy strength can be supplied from outside (#55 item 9): so the encounter modal can write the
    // "easy prey" warning with the same formula before the battle even starts.
    rewardScale(enemyPower) {
        let ep = enemyPower !== undefined ? enemyPower
               : this.units.filter(u => !u.isPlayerTeam).reduce((a, u) => a + (u.level || 1) + 1, 0);
        let pp = state.player.stats.level +
                 state.player.party.reduce((a, t) => a + (t.level || 1) + 1, 0);
        return Math.max(0.2, Math.min(1, (ep / Math.max(1, pp)) * 1.6));
    },

    // #120: switches the win-modal between the existing summary and the new detail tab.
    switchResultTab(which) {
        let ozetPane = document.getElementById('bres-pane-ozet'), detayPane = document.getElementById('bres-pane-detay');
        let ozetBtn = document.getElementById('bres-tab-ozet'), detayBtn = document.getElementById('bres-tab-detay');
        if(!ozetPane || !detayPane) return;
        ozetPane.style.display = which === 'ozet' ? '' : 'none';
        detayPane.style.display = which === 'detay' ? '' : 'none';
        if(ozetBtn) ozetBtn.className = which === 'ozet' ? 'btn primary' : 'btn';
        if(detayBtn) detayBtn.className = which === 'detay' ? 'btn primary' : 'btn';
    },

    // #120: casualty table, troop XP/promotion table, loot breakdown, prisoner list —
    // all built from data already collected during the fight (_battleLog) or already
    // computed by endBattle for the summary tab.
    buildDetailTab(moneyGain, cargoTxt, captured) {
        let log = this._battleLog || { deaths: [], xpGain: {}, xpStart: {} };
        let typeName = { infantry: T('Piyade'), archer: T('Okçu'), cavalry: T('Süvari') };
        let tds = 'padding:0.3rem 0.5rem;border-bottom:1px solid var(--panel-border)';

        let casRows = log.deaths.map(d => `<tr>
            <td style="${tds}">${T(d.name)}</td>
            <td style="${tds};color:${d.isPlayerTeam ? '#ff8888' : '#88dd88'}">${d.isPlayerTeam ? T('Dost') : T('Düşman')}</td>
            <td style="${tds}">${typeName[d.type] || d.type}</td>
            <td style="${tds}">${d.level}</td>
            <td style="${tds}">${T(d.killerName)}</td>
        </tr>`).join('');

        let xpRows = state.player.party.filter(t => log.xpGain[t.id]).map(t => {
            let ready = TROOP_UPGRADES[t.name] && t.xp >= t.xpNext;
            let promoBtns = ready ? TROOP_UPGRADES[t.name].map(choice =>
                `<button class="btn primary" style="font-size:var(--fs-xs);padding:0.15rem 0.4rem;margin-left:0.25rem" onclick="Game.promoteTroop('${t.name.replace(/'/g,"\\'")}','${T(choice.name).replace(/'/g,"\\'")}',${choice.cost})">${T(choice.name)}</button>`
            ).join('') : '';
            return `<tr>
                <td style="${tds}">${T(t.name)}</td>
                <td style="${tds}">+${log.xpGain[t.id]}</td>
                <td style="${tds}">${T`Lvl ${t.level}`}</td>
                <td style="${tds}">${ready ? '🔥 ' + T('Terfiye hazır') + promoBtns : ''}</td>
            </tr>`;
        }).join('');

        let newPrisoners = captured > 0 ? state.player.prisoners.slice(-captured) : [];
        let prisTxt = newPrisoners.map(p => `${T(p.name)} (Lvl ${p.level})`).join(', ');

        let block = (title, inner) => `<div style="background:rgba(0,0,0,0.25);padding:1rem;border-radius:var(--r-md);margin-bottom:1rem;text-align:left">
            <h3 style="color:var(--primary);margin-bottom:0.6rem;font-size:1rem">${title}</h3>${inner}</div>`;

        return `<div style="max-height:60vh;overflow-y:auto">
            ${block(T('Kayıplar'), casRows
                ? `<table style="width:100%;border-collapse:collapse;font-size:var(--fs-sm)"><tr style="color:var(--text-muted)"><td style="${tds}">${T('İsim')}</td><td style="${tds}">${T('Taraf')}</td><td style="${tds}">${T('Tür')}</td><td style="${tds}">${T('Seviye')}</td><td style="${tds}">${T('Kim öldürdü')}</td></tr>${casRows}</table>`
                : `<p style="color:var(--text-muted)">${T('Kayıp yok.')}</p>`)}
            ${block(T('Birlik Tecrübesi'), xpRows
                ? `<table style="width:100%;border-collapse:collapse;font-size:var(--fs-sm)"><tr style="color:var(--text-muted)"><td style="${tds}">${T('İsim')}</td><td style="${tds}">${T('Kazanılan XP')}</td><td style="${tds}">${T('Seviye')}</td><td style="${tds}"></td></tr>${xpRows}</table>`
                : `<p style="color:var(--text-muted)">${T('Bu savaşta XP kazanan birlik yok.')}</p>`)}
            ${block(T('Ganimet'), `<p>${T`💰 ${moneyGain} dinar`}</p>${cargoTxt ? `<p style="margin-top:0.4rem">${cargoTxt}</p>` : ''}`)}
            ${block(T('Esirler'), prisTxt ? `<p>⛓️ ${prisTxt}</p>` : `<p style="color:var(--text-muted)">${T('Esir alınmadı.')}</p>`)}
        </div>`;
    },

    endBattle(won) {
        // The lord you backed pays for his own dead, win or lose (1.32.1)
        let aa = state.player.assistAlly, ap = aa && aa.npcId ? state.npcParties.find(n => n.id === aa.npcId) : null;
        if(ap) ap.size = Math.max(5, ap.size - this.units.filter(u => u.allyOf === ap.id && u.hp <= 0).length);
        // Every exit from a fight is here — real battle, arena, tournament round, duel —
        // so the victory/defeat sting is hooked once (#131). It plays over the screen the
        // lines below switch to, and hands the playlist back when it ends.
        Game.Music.sting(won);
        this.clearRoutPrompt();
        this.listen(false);
        window.removeEventListener('mouseup', this.upHandler);
        window.removeEventListener('keydown', this.commandListener);
        cancelAnimationFrame(this.loopId);

        // The arena and a tournament round leave through the same door: nobody dies, the party
        // comes back, and the result is handed to whoever asked for the fight (#122).
        if(this.isArena || this.isTourney) {
            let foe = this.isArena || this.isTourney, bracket = !!this.isTourney;
            this.isArena = this.isTourney = null;
            state.player.party = this._duelParty || [];
            this._duelParty = null;
            let aUnit = this.units[0];
            state.player.stats.hp = Math.max(5, aUnit ? Math.floor(aUnit.hp) : 5);
            Game.showScreen('map');
            if(bracket) Game.tourneyRoundDone(won); else Game.finishArena(foe, won);
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

        // The player's own horse (#132): rolled once already in the dismount check above; here
        // it's just turned into the removal + the line shown in the summary/defeat message. Real
        // battle only — arena/duel/tournament already returned above, nothing to lose there.
        let horseTxt = '';
        if(this._horseDied && state.player.equipment.horse) {
            horseTxt = T('🐴 Atın savaşta öldü, elinden gitti.');
            state.player.equipment.horse = null;
        }
        this._horseDied = false;

        // A troop whose HP hits zero doesn't die outright: the Surgery skill can save them as
        // wounded instead. The wounded stay in the group, can't fight, and heal over a few days.
        // Matching is done by id instead of order: the already-wounded who skip battle used to shift the order.
        let surgery = (state.player.proficiencies.surgery || { level: 1 }).level;
        // Skill tree #110: Medic perks raise wounded-survival odds
        let saveChance = Math.min(0.95, 0.35 + surgery * 0.03 + Game.perkMod('healChance') / 100);
        let saved = 0, killed = 0, bySurgery = 0;
        state.player.party.forEach(t => {
            let u = this.units.find(x => x.id === t.id);
            if(!u || u.hp > 0) return;
            // Companions never die, only get wounded
            if(t.isCompanion || Math.random() < saveChance) {
                t.wounded = Math.max(1, 3 + Math.floor(Math.random()*2) - Math.floor(surgery / 4));
                saved++;
                if(!t.isCompanion) bySurgery++;
            } else { t._dead = true; killed++; }
        });
        state.player.party = state.player.party.filter(t => !t._dead);
        if(saved) Game.addProficiencyXp('surgery', 30 * saved);
        this.lastCasualties = { saved, killed };
        let log = this._battleLog || { deaths: [], playerKills: 0 }, odds = this._odds || { foes: 0, own: 1 };
        Game.careerBattle({ won, kills: log.playerKills || 0, slain: log.deaths.filter(d => !d.isPlayerTeam).length,
                            foes: odds.foes, own: odds.own, killed, surgery: bySurgery });

        // Some of the fallen enemies don't die, they're taken prisoner (Warband's captive system).
        // Capacity depends on the Prisoner Management skill; nobody is captured in a boss fight.
        let captured = 0;
        if(won && !this.isBossFight) {
            let free = Game.prisonerCapacity() - state.player.prisoners.length;
            this.units.forEach(u => {
                // An animal is never captured; anyone knocked out with a blunt weapon almost certainly falls
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
            // Loot scales with the enemy's count and level — it used to be that
            // 5 bandits and a 100-strong army paid out the same amount.
            let loot = this.units.filter(u => !u.isPlayerTeam)
                .reduce((a, u) => a + (u.beast ? 6 : 10) + (u.level || 1) * (u.beast ? 3 : 5), 0);  // looting a hide pays less
            // Skill tree #110: Raid perks add a loot percentage
            let moneyGain = Math.floor(loot * (0.85 + Math.random()*0.3) * (1 + (Game.profLvl('looting') - 1) * 0.04 + Game.perkMod('loot') / 100 + Game.relicMod('loot') / 100));

            // Bandit hunting shouldn't stay profitable forever
            let rScale = this.isBossFight ? 1 : this.rewardScale();
            moneyGain = Math.max(1, Math.floor(moneyGain * rScale));
            xpGain = Math.max(1, Math.floor(xpGain * rScale));

            // A victory won unconscious, on your men's backs, is only half a victory
            if(this.knockedOut) {
                xpGain = Math.floor(xpGain * 0.5);
                moneyGain = Math.floor(moneyGain * 0.5);
            }
            
            if(this.isBossFight) {
                moneyGain += 1500;
                xpGain += 700;
                let bossKey = state.player.currentBoss;
                state.player.currentBoss = null;
                let boss = bossKey ? BOSSES[bossKey] : null;
                if(state.finalBoss) {
                    // The boss-of-bosses: the game is won (#38). Banner of Kalradia (#132) —
                    // the one relic it drops, no unique item (BOSSES.savas_tanrisi.item is null).
                    state.finalBoss = false;
                    Game.gainRelic('kalradia_sancagi');
                    this._bossWin = { final: true };
                } else if(boss) {
                    // A unique boss: its one-of-a-kind drop and its relic
                    state.bossKills[bossKey] = true;
                    state.sites = (state.sites || []).filter(s => s.id !== 'boss_' + bossKey);
                    Game.addItem(boss.item, 1);
                    Game.gainRelic(boss.relic);
                    Game.gainRenown(30);
                    this._bossWin = { boss: bossKey };
                }
            }
            
            // Letting the fleeing go: you chose honor over loot. Since the fleeing were already
            // removed from `units`, the loot and prisoner counts above never counted them at all.
            let spareHonor = this.spared ? Game.addHonor('spare') : 0;

            state.player.money += moneyGain;
            Game.gainRenown(3);
            state.player.morale = Math.min(100, Game.morale() + 5);
            state.player.stats.xp += xpGain;

            let enemyCount = this.units.filter(u => !u.isPlayerTeam).length;
            Game.addProficiencyXp('looting', 10 * enemyCount);
            let wpType = state.player.equipment.weapon ? state.player.equipment.weapon.weaponType : 'oneHanded';
            if(!state.player.proficiencies[wpType]) wpType = 'oneHanded';
            Game.addProficiencyXp(wpType, 50 * enemyCount);
            if(state.player.equipment.horse) Game.addProficiencyXp('riding', 40 * enemyCount);
            else Game.addProficiencyXp('athletics', 40 * enemyCount);

            // Siege
            let conquestTxt = '';
            if(state.player.currentSiege) {
                let s = state.player.currentSiege;
                let loc = LOCATIONS.find(l=>l.id===s.locId);
                if(loc) {
                    let oldF = loc.faction;   // war begins with the kingdom you conquered from
                    if(s.foundingKingdom) {
                        FACTIONS['player_kingdom'] = {id:'player_kingdom', name:state.player.name+T(' Krallığı'), color:Game.bannerColor(), ruler:state.player.name};
                        state.player.vassalOf = 'player_kingdom';
                        loc.faction = 'player_kingdom';
                        Game.grantFief(loc, oldF);
                        Game.declareWar('player_kingdom', oldF);
                        conquestTxt = `<b>${T`${T(loc.name)} fethedildi — kendi krallığını ilan ettin!`}</b>`;
                    } else if(state.player.vassalOf) {
                        loc.faction = state.player.vassalOf;
                        Game.grantFief(loc, oldF);
                        Game.declareWar(state.player.vassalOf, oldF);
                        conquestTxt = `<b>${T`${T(loc.name)} fethedildi!</b> ${T((FACTIONS[state.player.vassalOf]||{name:'?'}).name)} adına aldın; kralın burayı sana tımar verdi.`}`;
                    }
                    // Conquest info stays in the victory modal: alert() used to clash with the victory screen
                    if(conquestTxt) conquestTxt += `<br>${T`Tımar geliri`} <b style="color:#ffcc00">${T`+${Game.fiefTax(loc)} dinar/gün`}</b>. `
                        + T`Garnizon bırakmazsan düşman ilk fırsatta geri alır (yerleşim ekranı → 🛡️ Garnizon).`;
                }
                state.player.currentSiege = null;
            }

            // Bandit lair (#68) — same pattern as raiding a village: the battle's over, this is where it's wrapped up
            let lairTxt = '';
            if(state.player.currentLair) {
                lairTxt = Game.clearLair(state.player.currentLair);
                state.player.currentLair = null;
            }

            // Raiding a village
            if(state.player.currentRaid) {
                let locId = state.player.currentRaid.locId;
                state.player.currentRaid = null;
                Game.completeRaid(locId);
            }

            // Remove the defeated NPC from the map
            let nobleTaken = null, cargoTxt = '', assistTxt = '';

            // Fought beside a clashing lord (#32): the ally and their kingdom warm to you
            if(state.player.assistAlly) {
                let a = state.player.assistAlly; state.player.assistAlly = null;
                if(a.lordId) Nobles.addRel(a.lordId, 6);
                if(a.faction) LORDS.filter(l => l.faction === a.faction).forEach(l => Nobles.addRel(l.id, 2));
                Game.gainRenown(4);
                assistTxt = T`Yanında dövüştüğün lord sana minnettar — itibarın arttı.`;
            }
            if(state.player.currentEncounterNpcId) {
                let beaten = state.npcParties.find(n => n.id === state.player.currentEncounterNpcId);
                Quests.emit('battle_won', {
                    npcId: state.player.currentEncounterNpcId,
                    questWave: beaten ? beaten.questWave : null,
                    lordId: beaten ? beaten.lordId : null
                });
                state.npcParties = state.npcParties.filter(n => n.id !== state.player.currentEncounterNpcId);
                state.player.currentEncounterNpcId = null;

                // A caravan/party's cargo is added to the loot (#22)
                if(beaten && beaten.cargo) {
                    beaten.cargo.forEach(c => {
                        let it = ITEMS[c.id];
                        if(!it) return;
                        let ex = state.player.inventory.find(i => i.id === c.id);
                        if(ex) ex.qty += c.qty; else state.player.inventory.push({ ...it, qty: c.qty });
                        cargoTxt += `${it.icon} ${T(it.name)} ×${c.qty} · `;
                    });
                    if(beaten.purse) { state.player.money += beaten.purse; cargoTxt += T`💰 ${beaten.purse} dinar kese`; }
                }

                // A defeated noble is taken prisoner: either collect the ransom or release them with honor
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

            // Boss drop line (#38): the unique item + relic, shown in the summary
            let bossTxt = '';
            if(this._bossWin && this._bossWin.boss) {
                let b = BOSSES[this._bossWin.boss];
                bossTxt = '<b>' + T(b.name) + ' ' + T('yenildi!') + '</b> '
                    + ITEMS[b.item].icon + ' ' + T(ITEMS[b.item].name) + ' · '
                    + RELICS[b.relic].icon + ' ' + T(RELICS[b.relic].name);
            }

            // #120: the detail tab reads the same numbers the summary already computed.
            let detailHtml = this.buildDetailTab(moneyGain, cargoTxt, captured);

            let summaryHtml = `
            <div style="text-align:center;">
                <h2 style="color:#2ecc71;margin-bottom:1rem;font-size:2rem;text-shadow:0 0 10px rgba(46,204,113,0.5)">${this.autoLoss ? T('🎖️ Askerlerin Halletti') : this.knockedOut ? T('🩸 Pahalı Zafer') : T('⚔️ Mükemmel Zafer! ⚔️')}</h2>
                ${this.autoLoss ? `<p style="color:#8fd6ff;margin-bottom:1rem">${T`Sen inmedin: adamların kendi başlarına dövüştü, beklenen kayıp %${Math.round(this.autoLoss*100)}.`}</p>` : ''}
                ${this.knockedOut ? T('<p style="color:#ff8866;margin-bottom:1rem">Savaş meydanında bayıldın; ganimet ve tecrübe yarıya indi.</p>') : ''}
                ${rScale < 0.9 ? `<p style="color:#c9a227;margin-bottom:1rem">${T`Kolay av: bu düşman sana denk değildi, ödüller %${Math.round(rScale*100)}'e indi.`}</p>` : ''}
                <div style="background:rgba(0,0,0,0.3);padding:1.5rem;border-radius:var(--r-md);margin-bottom:1.5rem;font-size:1.2rem;line-height:1.6;text-align:left;">
                    <p style="margin-bottom:0.8rem"><b>${T`Kazanılan Dinar:`}</b> <span style="color:#ffcc00">+${moneyGain}</span> 💰</p>
                    <p style="margin-bottom:0.8rem"><b>${T`Kazanılan Şan/Nam:`}</b> <span style="color:#3498db">+3</span> 👑</p>
                    <p style="margin-bottom:0.8rem"><b>${T`Kazanılan Tecrübe:`}</b> <span style="color:#e74c3c">+${xpGain}</span> 🌟</p>
                    <p><b>${T`Kayıplar:`}</b> <span style="color:#e74c3c">${T`${killed} ölü`}</span> · <span style="color:#ffaa00">${T`${saved} yaralı`}</span> 🩹</p>
                    ${captured ? `<p style="margin-top:0.8rem"><b>${T`Esir Alınan:`}</b> <span style="color:#dda0dd">${captured}</span> ⛓️ <span style="font-size:var(--fs-sm);color:var(--text-muted)">${T`(şehirdeki köle tüccarına satabilirsin)`}</span></p>` : ''}
                    ${spareHonor ? `<p style="margin-top:0.8rem;color:#9fe0a0">🕊️ <b>${T`${this.spared} kaçağı bıraktın.`}</b> ${T`Şeref`} <span style="color:#9fe0a0">+${spareHonor}</span> <span style="font-size:var(--fs-sm);color:var(--text-muted)">${T`(kovalasaydın ganimet ve esir olurdu)`}</span></p>` : ''}
                    ${conquestTxt ? `<p style="margin-top:0.8rem;color:#e59b3d">🏰 ${conquestTxt}</p>` : ''}
                    ${lairTxt ? `<p style="margin-top:0.8rem;color:#e59b3d">☠️ ${lairTxt}</p>` : ''}
                    ${bossTxt ? `<p style="margin-top:0.8rem;color:#e0b0b0">💀 ${bossTxt}</p>` : ''}
                    ${horseTxt ? `<p style="margin-top:0.8rem;color:#ff8866">${horseTxt}</p>` : ''}
                    ${cargoTxt ? `<p style="margin-top:0.8rem"><b>${T`Yük Ganimeti:`}</b> <span style="color:#e0b062">${cargoTxt}</span> 🐪</p>` : ''}
                    ${nobleTaken ? `<p style="margin-top:0.8rem;color:#e59b3d"><b>${T`👑 ${nobleTaken} esir alındı!`}</b> <span style="font-size:var(--fs-sm);color:var(--text-muted)">${T`Grup ekranından fidye iste ya da salıver.`}</span></p>` : ''}
                    ${assistTxt ? `<p style="margin-top:0.8rem;color:#9fe0a0">🤝 ${assistTxt}</p>` : ''}
                </div>
                <button class="btn primary" style="font-size:1.2rem;padding:0.8rem 2rem;box-shadow:0 0 15px rgba(255,170,0,0.4);border-radius:var(--r-md)" onclick="Game.closeModal(); Game.checkLevelUp(); Game.updateTopBar()">${T`Kazanımları Al ve İlerle`}</button>
            </div>`;
            let resultHtml = `<div>
                <div style="display:flex;gap:0.5rem;justify-content:center;margin-bottom:1rem">
                    <button id="bres-tab-ozet" class="btn primary" style="padding:0.4rem 1.2rem" onclick="Battle.switchResultTab('ozet')">${T('Özet')}</button>
                    <button id="bres-tab-detay" class="btn" style="padding:0.4rem 1.2rem" onclick="Battle.switchResultTab('detay')">${T('Ayrıntı')}</button>
                </div>
                <div id="bres-pane-ozet">${summaryHtml}</div>
                <div id="bres-pane-detay" style="display:none">${detailHtml}</div>
            </div>`;
            if(this._bossWin && this._bossWin.final) { this._bossWin = null; Game.showVictory(); }
            else { this._bossWin = null; Game.showModal(resultHtml); }
        } else {
            // We lost the battle — taken prisoner.
            state.player.assistAlly = null;   // no gratitude for a fight you lost (#32)
            // Renown loss must be computed before the party disbands: the strength ratio comes from it.
            let epow = this.units.filter(u => !u.isPlayerTeam).reduce((a, u) => a + (u.level || 1) + 1, 0);
            let renownLost = this.isBossFight ? 0 : Game.defeatRenown(epow);
            state.player.renown = Math.max(0, state.player.renown - renownLost);

            let daysLost = 3 + Math.floor(Math.random() * 5);
            // The loss ratio is now a decision, not a die roll: your fief's coffer share reduces it (#53/1.2)
            let ratio = Game.defeatLootRatio();
            let moneyLost = Math.floor(state.player.money * ratio);
            state.player.money = Math.max(0, state.player.money - moneyLost);

            state.player.morale = Math.max(0, Game.morale() - 15);

            // Troops disband, prisoners are freed from their chains
            state.player.party = [];
            state.player.prisoners.filter(p => p.noble).forEach(p => Game.scheduleLordRespawn(p.lordId, 4));
            state.player.prisoners = [];
            state.player.stats.hp = Math.max(5, Math.floor(state.player.stats.maxHp * 0.3));

            // Captivity system
            let captorId = state.player.currentEncounterNpcId;
            let captor = captorId ? state.npcParties.find(n => n.id === captorId) : null;
            if(captor) {
                Game.beginCaptivity(captor, daysLost);
            } else if(this.isBossFight) {
                alert(T('Savaş Tanrısı seni ezdi geçti. Tüm birliğini ve paranı kaybettin.')
                    + (horseTxt ? `<br>${horseTxt}` : ''));
            } else if(horseTxt) {
                alert(horseTxt);
            }
            state.player.currentEncounterNpcId = null;
            state.player.currentSiege = null;
            state.player.siege = null;
            state.player.currentRaid = null;
            state.player.currentLair = null;

            if(captor) alert(`${T`Yenildin! Esir düştün! Tüm birliğin dağıldı.<br>-${moneyLost} Dinar`}`
                + (renownLost ? `<br>${T`-${renownLost} nam — <i>böyle bir düşmana yenilmek dilden dile dolaşacak.`}</i>` : '')
                + (horseTxt ? `<br>${horseTxt}` : ''));
        }

        // Sync HP — so a defeat doesn't crush the 30% floor set above
        let pUnit = this.units[0];
        if(won) state.player.stats.hp = Math.max(1, Math.floor(pUnit ? pUnit.hp : 1));

        Game.updateTopBar();
        Game.showScreen('map');
    },

    // One tap on the bar used to hand over the whole army — a stray thumb on a phone was
    // enough. The button now asks, with the fight paused, and names the price; "back to the
    // fight" is the primary answer, so Enter, Esc and × all land on the safe side (canDismiss
    // lets this one window close mid-battle). Every way out resumes the fight (Game.closeModal).
    // Phone battle (2.1, round 1): no bottom strip; the pause button in the corner opens this —
    // back to the fight, or give up (which still asks, as the button always did). It rides the
    // surrender prompt's own door: closing the window resumes the fight.
    pauseMenu() {
        if(!this.active) return;
        this.paused = true;
        this._askingSurrender = true;
        Game.showModal(`<h3>${T`⏸ Duraklatıldı`}</h3>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:0.6rem">
                <button class="btn primary" onclick="Game.closeModal()">${T`⚔️ Savaşa Dön`}</button>
                <button class="btn" style="border-color:var(--danger);color:var(--danger)" onclick="Battle.askSurrender()">${T`🏳️ Teslim Ol`}</button>
            </div>`, '340px');
    },
    askSurrender() {
        if(!this.active) return this.surrender();
        this.paused = true;
        this._askingSurrender = true;
        let price = (this.isDuel || this.isArena || this.isTourney)
            ? T('Maçı kaybetmiş sayılırsın.') : T('Bütün birliğin dağılır ve esir düşersin.');
        Game.showModal(`<h3>${T`🏳️ Teslim olmak mı?`}</h3>
            <p style="margin-top:0.6rem">${price}</p>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:1.2rem">
                <button class="btn primary" onclick="Game.closeModal()">${T`⚔️ Savaşa Dön`}</button>
                <button class="btn" style="border-color:var(--danger);color:var(--danger)"
                    onclick="Game.closeModal(); Battle.surrender()">${T`🏳️ Teslim Ol`}</button>
            </div>`, '380px');
    },

    surrender() {
        // Withdrawing from a duel/arena match is a defeat, not a captivity — this path used to
        // not restore _duelParty, permanently wiping out the group.
        if(this.isDuel || this.isArena || this.isTourney) { this.active = false; this.endBattle(false); return; }
        this.active = false;
        this.listen(false);
        window.removeEventListener('mouseup', this.upHandler);
        window.removeEventListener('keydown', this.commandListener);
        cancelAnimationFrame(this.loopId);

        let captorId = state.player.currentEncounterNpcId;
        let captor = captorId ? state.npcParties.find(n => n.id === captorId) : null;
        // A surrendered assist earns no gratitude: left set, the lord thanked you after your next,
        // unrelated victory (1.32.1)
        state.player.assistAlly = null;
        // Ongoing state must be cleaned up even in battles with nobody to capture, like a siege or
        // boss fight; otherwise a currentSiege left set would make the next battle won
        // count as having conquered that city.
        let wasSiege = state.player.currentSiege;
        state.player.currentSiege = null;
        state.player.currentRaid = null;
        state.player.currentLair = null;
        state.player.currentEncounterNpcId = null;

        if(captor) Game.surrender(captor.id, captor.name);
        else {
            alert(wasSiege ? T('Kuşatmadan çekildin. Birliğin dağıldı.') : T('Teslim oldun! Birliğini kaybettin.'));
            state.player.party = [];
            state.player.prisoners.filter(p => p.noble).forEach(p => Game.scheduleLordRespawn(p.lordId, 4));
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

    // The tournament eliminates round by round (#26). Each round draws a random piece of gear:
    // a long-ranged weapon shrinks the target but keeps it up longer, a mace with a shield does
    // the opposite. The betting odds depend on the round you're eliminated in — winning the championship pays ×5.
    ROUNDS: 4,
    ODDS: [0, 0.3, 0.8, 1.6, 5],
    GEAR: [
        { icon:'🗡️', name:T('Tahta Kılıç'),     size:1.00, life:1.00 },
        { icon:'🔱', name:T('Mızrak'),           size:0.85, life:1.30 },
        { icon:'🏹', name:T('Yay'),              size:0.70, life:1.55 },
        { icon:'🛡️', name:T('Topuz ve Kalkan'),  size:1.30, life:0.75 }
    ],
    rollGear() { return this.GEAR[Math.floor(Math.random() * this.GEAR.length)]; },

    start(opts = {}) {
        // Chicken chasing is the only thing left riding this engine: the tournament moved to the
        // real Battle rig and a bracket (#122). The 'tournament' branches below stay because they
        // are the click-minigame's own round/gear machinery — but nothing defaults into them.
        this.mode = opts.mode || 'chicken';
        this.goal = opts.goal || 12;
        this.bet = opts.bet || 0;
        this.loc = opts.loc || null;
        this.round = 1;
        this.perRound = Math.max(1, Math.ceil(this.goal / this.ROUNDS));
        this.gear = this.mode === 'chicken' ? null : this.rollGear();
        this.canvas = document.getElementById('battle-canvas');
        this.ctx = Game.battleCtx();   // single gate to the shared canvas (#54)
        Battle.showSurface('canvas');   // the chase stays Canvas2D; a WebGL battle may have been showing
        Game.showScreen('battle');
        // Chicken chasing and other click challenges have no troops to command. The command
        // pad is static battle markup, so a previous real fight could leave it visible here.
        let tc = document.getElementById('tcmds');
        if(tc) tc.style.display = 'none';
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.active = true;
        this.score = 0;
        this.targets = [];
        this.timeLeft = opts.time || 25;
        this.spawnTimer = 0;

        document.getElementById('battle-log-left').innerHTML = this.mode === 'chicken'
            ? `<b>${T`🐔 Tavuk Avı!</b> ${this.goal} tavuk yakala. Kimseye anlatma.`}`
            : `<b>${T`🏆 1. Tur!</b> Kuradan ${this.gear.icon} <b>${T(this.gear.name)}</b> çıktı — ${this.perRound} isabet bir tur eder.`}`;

        this.clickHandler = (e) => this.onClick(e);
        this.canvas.addEventListener('mousedown', this.clickHandler);

        if(this.loopId) cancelAnimationFrame(this.loopId);
        let last = performance.now();
        const loop = (t) => {
            if(!this.active) return;
            if(Game.skipFrame(t)) { this.loopId = requestAnimationFrame(loop); return; }
            let dt = Math.min((t-last)/1000, 0.05);
            last = t;
            Debug.guard('tournament loop', () => { this.update(dt); this.render(); });
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
            // A 42px circle alive for 1.2s was a target you could hardly miss (#123). The bird
            // is smaller, quicker and shrinks further in the closing seconds, and one in four is
            // a goose that costs you a bird if you grab it. Agility and strength still help --
            // they just no longer play the game for you.
            let rush = this.timeLeft <= 5 ? 0.75 : 1;
            this.targets.push({
                x: 40 + Math.random()*(this.canvas.width-80),
                y: 40 + Math.random()*(this.canvas.height-80),
                radius: (24 + agiBonus * 0.8) * rush * (this.gear ? this.gear.size : 1),
                timeLeft: (0.8 + strBonus * 0.12) * (this.gear ? this.gear.life : 1),
                bad: this.mode === 'chicken' && Math.random() < 0.25
            });
            this.spawnTimer = 0.25 + Math.random()*0.3;
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
        ctx.fillText(T`Süre: ${Math.ceil(this.timeLeft)}`, 15, 50);
        if(this.mode !== 'chicken') {
            ctx.fillStyle = '#e0b062';
            ctx.fillText(T`${this.round}. Tur / ${this.ROUNDS}  ·  ${this.gear.icon} ${T(this.gear.name)}`, 15, 75);
            if(this.bet) {
                let cleared = Math.min(this.ROUNDS, Math.floor(this.score / this.perRound));
                ctx.fillText(T`🎲 Bahis ${this.bet} → şu an ${Math.round(this.bet * this.ODDS[cleared])} dinar`, 15, 100);
            }
        }

        this.targets.forEach(t => {
            let alpha = Math.min(t.timeLeft, 1);
            ctx.beginPath(); ctx.arc(t.x,t.y,t.radius,0,Math.PI*2);
            ctx.fillStyle = t.bad ? `rgba(60,110,200,${alpha})` : `rgba(200,40,40,${alpha})`; ctx.fill();
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
                this.targets.splice(i,1);
                if(t.bad) {   // the goose (#123): grabbing it costs you a bird
                    this.score = Math.max(0, this.score - 1);
                    document.getElementById('battle-log-left').innerHTML =
                        `${T`🦢 Kaz! Elindeki tavuk da kaçtı.`} (${this.score}/${this.goal})`;
                    break;
                }
                this.score++;
                let msg = `${this.mode === 'chicken' ? T('Yakaladın!') : T('İsabet!')} (${this.score}/${this.goal})`;
                // Round over: a new draw, a clean field, and a breather between rounds
                if(this.mode !== 'chicken' && this.score < this.goal && this.score % this.perRound === 0) {
                    this.round++;
                    this.gear = this.rollGear();
                    this.targets = [];
                    this.timeLeft += 6;
                    msg = `<b>${T`${this.round}. Tur!</b> Kuradan ${this.gear.icon} <b>${T(this.gear.name)}</b> çıktı. (+6 sn)`}`;
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

        if(this.mode === 'chicken') {
            // Win or lose, you're still standing in the courtyard — dumping the player out to
            // the map screen meant retrying a failed attempt was a walk back out through the
            // gate and in again every single time (#132 report). Back into the settlement
            // instead, so a miss is just another click on the same button.
            if(this.loc) Game.enterLocation(this.loc); else Game.showScreen('map');
            Quests.emit('chickens_caught', { won, score: this.score });
            if(won) alert(T`Son tavuğu ahırın arkasında kıstırdın. ${this.score}/${this.goal}.`);
            Game.updateTopBar();
            return;
        }
        Game.showScreen('map');

        // Bet: the money was taken at entry, payout is based on the round you were eliminated in (#26)
        let betTxt = '';
        if(this.bet) {
            let cleared = Math.min(this.ROUNDS, Math.floor(this.score / this.perRound));
            let pay = Math.round(this.bet * this.ODDS[cleared]);
            state.player.money += pay;
            betTxt = T`\n\n🎲 Bahis: ${this.bet} dinar × ${this.ODDS[cleared]} = ${pay} dinar `
                   + (pay > this.bet ? `(+${pay - this.bet} kâr)` : T`(−${this.bet - pay} zarar)`);
        }
        if(won) {
            state.player.money += 500; state.player.renown += 20;
            alert(T('Turnuvayı kazandın! +500 Dinar, +20 Nam') + betTxt + T('\n\nArenada zaferini bir leydiye ithaf edebilirsin — salona git.'));
        } else {
            alert(T`${this.round}. turda elendin! Skor: ${this.score}/${this.goal}` + betTxt);
        }
        Game.tournamentFinished(won, { score: this.score });
        Game.updateTopBar();
    }
};

// --- SWORDSMAN SPRITES (visual refresh, step 1) ---
// <swordsman-index> (generated by tools/build-swordsman.js — do not edit by hand)
const SWORDSMAN_INDEX = {"1":{"size":[1024,332],"parts":{"Death":{"head":[0,0,14,19,36,27],"body":[208,200,22,31,19,15],"sword_back":[0,264,17,35,31,10],"sword":[698,264,16,37,25,8]},"attack":{"head":[252,0,20,17,24,25],"sword":[444,0,11,25,42,25],"sword_back":[0,108,11,21,36,23],"body":[0,200,19,30,26,16]},"Run":{"head":[780,0,23,17,18,24],"body":[518,108,23,27,17,17],"sword":[656,200,19,33,18,11],"sword_back":[800,200,23,34,20,10]},"Walk":{"head":[288,108,22,17,20,21],"body":[341,200,25,30,14,14],"sword_back":[217,264,22,34,22,9],"sword":[204,304,20,37,21,7]},"Hurt":{"head":[408,108,20,19,22,19],"body":[581,200,24,31,15,13],"sword":[613,264,19,37,17,8],"sword_back":[330,304,21,36,23,7]},"Idle":{"head":[654,108,23,19,18,16],"body":[425,200,25,31,13,13],"sword_back":[349,264,22,36,22,8],"sword":[0,304,19,37,17,7]}},"red":{"Hurt":[0,0,0.48,0.97,0.53,0,0,0.49,0.95,0.52,0,0,0.49,0.95,0.5,0,0,0.52,1,0.49],"Death":[0,0,0,0.36,0.86,0.41,0,0,0,0,0.43,1,0.49,0,0,0,0,0.44,0.99,0.49,0,0,0,0,0.49,0.92,0.45,0]}},"2":{"size":[1024,344],"parts":{"attack":{"sword":[0,0,13,24,40,27],"sword_back":[572,0,11,20,35,24],"head":[0,108,20,17,24,24],"body":[0,204,19,30,26,16]},"Death":{"head":[320,0,14,19,36,27],"body":[208,204,22,31,19,15],"sword_back":[0,268,18,35,30,11],"sword":[794,268,15,37,26,9]},"Run":{"head":[192,108,23,17,18,20],"body":[566,108,22,27,18,17],"sword_back":[692,204,24,32,19,13],"sword":[844,204,19,33,18,13]},"Walk":{"head":[336,108,22,17,20,19],"body":[341,204,24,30,16,14],"sword_back":[462,268,22,35,22,9],"sword":[192,312,20,37,20,8]},"Hurt":{"head":[456,108,20,19,22,19],"body":[437,204,24,31,15,14],"sword_back":[594,268,21,35,23,9],"sword":[709,268,19,37,17,9]},"Idle":{"head":[710,108,23,19,18,16],"body":[512,204,24,31,15,13],"sword_back":[210,268,22,36,21,9],"sword":[0,312,20,37,16,8]}},"red":{"Hurt":[0,0,0.48,0.96,0.53,0,0,0.49,0.94,0.51,0,0,0.5,0.96,0.51,0,0,0.52,1,0.5],"Death":[0,0,0,0.39,0.93,0.45,0,0,0,0,0.43,1,0.49,0,0,0,0,0.43,0.97,0.48,0,0,0,0,0.52,0.99,0.49,0]}},"3":{"size":[1024,304],"parts":{"attack":{"sword":[0,0,13,24,40,27],"sword_back":[572,0,11,20,35,25],"head":[0,108,20,17,24,24],"body":[592,108,19,29,26,17]},"Death":{"head":[320,0,14,19,36,27],"body":[0,204,22,31,19,15],"sword":[468,264,15,36,26,10],"sword_back":[650,264,18,35,30,9]},"Run":{"head":[192,108,23,17,18,20],"body":[456,108,23,27,17,17],"sword_back":[229,204,23,32,20,14],"sword":[569,204,19,33,18,13]},"Walk":{"head":[336,108,22,17,20,19],"body":[133,204,24,30,16,14],"sword_back":[713,204,22,34,22,11],"sword":[845,204,20,35,21,11]},"Idle":{"head":[800,108,23,19,18,16],"body":[389,204,24,31,15,13],"sword_back":[0,264,22,36,22,10],"sword":[264,264,19,36,17,10]}},"red":{"Death":[0,0,0,0.4,0.94,0.45,0,0,0,0,0.43,1,0.49,0,0,0,0,0.43,0.97,0.48,0,0,0,0,0.5,0.96,0.47,0]}}};
const ARCHER_INDEX = {"Idle":{"n":4,"D":0,"S":1,"U":2},"Walk":{"n":6,"D":3,"S":4,"U":5},"Attack":{"n":4,"D":6,"S":7,"U":8},"Hurt":{"n":2,"D":9,"S":10,"U":11},"Death":{"n":8,"D":12,"S":13,"U":14}};
// </swordsman-index>

// The CraftPix Swordsman (1-3) as the battle's foot soldiers and the player on foot.
// Every frame is composed from the pack's layers — body and head from the armour tier,
// sword from the weapon tier — so the player looks like what they wear (no knight on day
// one). Skin, hair and cloth are recoloured by exact palette entry (shading survives);
// cloth takes the side's kingdom colour. Helmets are drawn by hand once per facing and
// placed per frame by matching the head against a reference; nothing is re-derived per
// frame, so a helmet cannot change shape between frames. A composed frame is baked once
// into its own small canvas (cropped to content) and cached; both renderers draw it
// through Battle.unitArt like any other baked art — `_k` is its size in field units per
// pixel, `_ax/_ay` the anchor that sits on the feet, `_pixel` asks for nearest sampling.
const Swordsman = (() => {
    const F = 64, FOOT = { x: 32, y: 44 };
    const K = 1.25;                 // field units per sprite pixel: ~32 tall, the old tile's size
    const ANIM = {
        Idle:   { n: 12, ms: 120, loop: true },
        Walk:   { n: 6,  ms: 110, loop: true },
        Run:    { n: 8,  ms: 80,  loop: true },
        attack: { n: 8,  ms: 70,  loop: false },
        Hurt:   { n: 5,  ms: 85,  loop: false },
        Death:  { n: 7,  ms: 120, loop: false },
    };
    const ROW = { down: 0, left: 1, right: 2, up: 3 }, DIRS = ['down', 'left', 'right', 'up'];

    // ---- palettes, read off the pack's own PNGs ----
    const HAIR = ['#2b2023', '#3b2c33', '#4d3945', '#684f5a', '#876c7d'], HAIR_LINE = '#211a1c';
    const SKIN = ['#795048', '#a46f59', '#be865f', '#e1b26e', '#f6ca74'];
    const EYES = ['#3f6ad4', '#374a8f', '#d2dde8'];
    const CLOTH = {
        1: ['#2d312b', '#3f433d', '#5e615a', '#6f736a', '#868b7c', '#a0a387'],   // rags
        2: ['#3c201e', '#4f2725', '#653631', '#784639', '#905941'],              // leather vest, dyed
        3: ['#481916', '#5e1e1c', '#8a3b26', '#a24d29', '#4c2726'],              // cape
    };
    // kingdom id -> the hue its soldiers are dyed in (FACTIONS colours, toned for cloth)
    const DYE = {
        swadia:  { h: 2,   s: 0.62, dl: 0.06 },
        rhodok:  { h: 118, s: 0.42, dl: 0.04 },
        vaegir:  { h: 210, s: 0.07, dl: 0.14 },
        nord:    { h: 213, s: 0.62, dl: 0.06 },
        khergit: { h: 282, s: 0.45, dl: 0.06 },
        bandit:  { h: 28,  s: 0.28, dl: 0.00 },
        player:  { h: 42,  s: 0.62, dl: 0.08 },   // an unsworn warband: gold, a colour no kingdom wears
    };
    const HAIRS = [null,
        (h, s, l) => [20, 0.12, l * 0.7], (h, s, l) => [24, 0.4, l * 1.02], (h, s, l) => [12, 0.55, l * 1.08 + 0.04],
        (h, s, l) => [40, 0.5, l * 1.2 + 0.12], (h, s, l) => [220, 0.05, l * 1.15 + 0.14]];
    const SKINS = [null,
        (h, s, l) => [h + 2, s * 0.8, Math.min(0.9, l + 0.06)], (h, s, l) => [h - 4, s * 0.95, l - 0.12], (h, s, l) => [h - 6, s * 0.85, l - 0.24]];
    const STEEL = ['#1d1a22', '#3d4552', '#5f6b7d', '#8795a8', '#b9c6d4', '#e4ecf2'];
    const LEATHER = ['#1f130d', '#4a2c1a', '#6e4527', '#8f5d33', '#b07a45', '#c99a62'];

    const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
    const key = (r, g, b) => (r << 16) | (g << 8) | b;
    const hkey = h => { const [r, g, b] = hex2rgb(h); return key(r, g, b); };
    function rgb2hsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
        if(mx === mn) return [0, 0, l];
        const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return [h * 60, s, l];
    }
    function hsl2rgb(h, s, l) {
        h = ((h % 360) + 360) % 360 / 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
        if(!s) return [l * 255, l * 255, l * 255].map(Math.round);
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
        const t = x => { x = (x + 1) % 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 0.5 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; };
        return [t(h + 1 / 3), t(h), t(h - 1 / 3)].map(v => Math.round(v * 255));
    }
    const viaHsl = (hex, f) => { const [r, g, b] = hex2rgb(hex); return hsl2rgb(...f(...rgb2hsl(r, g, b))); };

    // ---- atlases ----
    let imgs = null;
    function load() {
        if(imgs || typeof Image === 'undefined' || !SWORDSMAN_INDEX) return;
        imgs = [1, 2, 3].map(l => { const i = new Image(); i.src = 'troops/swordsman_' + l + '.png'; return i; });
    }
    const ready = () => !!imgs && imgs.every(i => i.complete && i.naturalWidth > 0);
    const hasAnim = (lvl, anim) => !!(SWORDSMAN_INDEX[lvl].parts[anim] && SWORDSMAN_INDEX[lvl].parts[anim].body);
    function cell() { const c = document.createElement('canvas'); c.width = c.height = F; return c; }
    // one layer of one frame, drawn into a 64x64 cell at its place in the pack's grid
    function layer(x, lvl, anim, part, f, row) {
        const p = SWORDSMAN_INDEX[lvl].parts[anim] && SWORDSMAN_INDEX[lvl].parts[anim][part];
        if(!p) return;
        const [ax, ay, bx, by, bw, bh] = p;
        x.drawImage(imgs[lvl - 1], ax + f * bw, ay + row * bh, bw, bh, bx, by, bw, bh);
    }

    // ---- hand-drawn helmets ----
    // Each helmet is drawn once per facing, pixel by pixel, in the coordinates of that facing's
    // reference head (level-1 Idle frame 0; the side facings also carry the half-turned Idle
    // frame 6). Every other frame gets the same drawing, moved by however far its head moved,
    // found by matching the frame's head (skin, eyes, hair, outline) against the reference. A
    // fallen head (Death) is matched against the reference turned by ±45/±90/180°.
    //   O outline · 1–5 dark→light · N slit/hole · . empty
    const HELM_TPL = {
      nasal: {
        down: { x: 25, y: 21, brim: 28, rows: [
          '...OOOOOOO...',
          '.OO3445432OO.',
          'O33455543322O',
          'O34554433221O',
          'O34443333221O',
          'O33333332221O',
          'O22222222111O',
          'OOOOOO3OOOOOO',
          '......3......',
          '......2......',
          '......O......'] },
        left: { x: 25, y: 21, brim: 28, rows: [
          '....OOOOOOO...',
          '..OO3445432OO.',
          '.O34455433221O',
          'O344554332211O',
          'O344443332211O',
          'O333333322211O',
          'O222222221111O',
          'OOOOOOOO22111O',
          'O3......O2111O',
          'O3.......O111O',
          'OO........OOO.'] },
        // the side head half-turned to the camera (Idle frames 5–10): the nose guard sits mid-face
        left34: { x: 25, y: 21, brim: 28, rows: [
          '....OOOOOOO...',
          '..OO3445432OO.',
          '.O34455433221O',
          'O344554332211O',
          'O344443332211O',
          'O333333322211O',
          'O222222221111O',
          'OOOOO3OOO2111O',
          '.....3...O111O',
          '.....2....OOO.',
          '.....O........'] },
        up: { x: 25, y: 21, brim: 29, rows: [
          '...OOOOOOO...',
          '.OO3445432OO.',
          'O33455543322O',
          'O34554433221O',
          'O34443333221O',
          'O33333332221O',
          'O33333322211O',
          'O22222222111O',
          'OOOOOOOOOOOOO'] },
      },
      cap: {
        down: { x: 25, y: 22, brim: 28, rows: [
          '...OOOOOOO...',
          '.OO4452432OO.',
          'O34453233221O',
          'O34432332211O',
          'O33332322111O',
          'O11111111111O',
          'OOOOOOOOOOOOO'] },
        left: { x: 25, y: 22, brim: 28, rows: [
          '...OOOOOOOO...',
          '.OO44534332OO.',
          'O344532433211O',
          'O344432333211O',
          'O333322322111O',
          'O111111111111O',
          'OOOOOOOOOOOOOO'] },
        up: { x: 25, y: 22, brim: 29, rows: [
          '...OOOOOOO...',
          '.OO4453432OO.',
          'O34453233221O',
          'O34432332211O',
          'O33332322111O',
          'O33332322111O',
          'O11111111111O',
          'OOOOOOOOOOOOO'] },
      },
      greathelm: {
        down: { x: 25, y: 21, brim: 34, rows: [
          '.OOOOOOOOOOO.',
          'O34455443322O',
          'O34554433221O',
          'O34443333221O',
          'O33333333221O',
          'O33333333221O',
          'O22222422211O',
          'O33333433221O',
          'O33333433221O',
          'ONNNNNONNNNNO',
          'O33333433221O',
          'O33333433221O',
          'O2N2N242N2N1O',
          '.OOOOOOOOOOO.'] },
        left: { x: 25, y: 21, brim: 34, rows: [
          '.OOOOOOOOOOOO.',
          'O344554332211O',
          'O344554332211O',
          'O344443332211O',
          'O333333322211O',
          'O333333322211O',
          'O222222221111O',
          'O333333322211O',
          'O333333322211O',
          'ONNNNN3322211O',
          'O333333322211O',
          'O333333322211O',
          'ON3N3332211OO.',
          '.OOOOOOOOOOO..'] },
        up: { x: 25, y: 21, brim: 34, rows: [
          '.OOOOOOOOOOO.',
          'O34455443322O',
          'O34554433221O',
          'O34443333221O',
          'O33333333221O',
          'O33333333221O',
          'O33333332221O',
          'O33333322211O',
          'O33333322211O',
          'O22222222111O',
          'O33333322211O',
          'O33333322211O',
          'O22222222111O',
          '.OOOOOOOOOOO.'] },
      },
    };

    const CLS = new Map();
    HAIR.forEach(h => CLS.set(hkey(h), 1)); CLS.set(hkey(HAIR_LINE), 2);
    SKIN.forEach(h => CLS.set(hkey(h), 3)); CLS.set(hkey('#552d24'), 3);
    EYES.forEach(h => CLS.set(hkey(h), 4)); CLS.set(hkey('#110b00'), 5);
    const classOf = (d, i) => d[i + 3] ? (CLS.get(key(d[i], d[i + 1], d[i + 2])) || 6) : 0;
    const PIV = { x: 31, y: 28 };
    function rotGrid(g, deg) {
        if(!deg) return g;
        const o = new Uint8Array(F * F), r = -deg * Math.PI / 180, c = Math.round(Math.cos(r) * 1e6) / 1e6, s = Math.round(Math.sin(r) * 1e6) / 1e6;
        for(let y = 0; y < F; y++) for(let x = 0; x < F; x++) {
            const dx = x - PIV.x, dy = y - PIV.y;
            const sx = Math.round(PIV.x + dx * c - dy * s), sy = Math.round(PIV.y + dx * s + dy * c);
            if(sx >= 0 && sy >= 0 && sx < F && sy < F) o[y * F + x] = g[sy * F + sx];
        }
        return o;
    }
    const mirror = g => { const o = new Uint8Array(F * F); for(let y = 0; y < F; y++) for(let x = 0; x < F; x++) o[y * F + x] = g[y * F + (F - 1 - x)]; return o; };
    const SYM = { '.': 0, O: 1, '1': 2, '2': 3, '3': 4, '4': 5, '5': 6, N: 7 };
    function tplGrids(t) {
        const g = new Uint8Array(F * F), cut = new Uint8Array(F * F);
        t.rows.forEach((row, j) => { for(let i = 0; i < row.length; i++) g[(t.y + j) * F + t.x + i] = SYM[row[i]] || 0; });
        const w = Math.max(...t.rows.map(r => r.length));
        for(let y = 0; y <= t.brim; y++) for(let x = t.x - 3; x < t.x + w + 3; x++) if(x >= 0 && x < F) cut[y * F + x] = 1;
        return { g, cut };
    }
    let _refs = null;
    function refs() {
        if(_refs) return _refs;
        const grab = (row, f = 0) => {
            const c = cell(), x = c.getContext('2d'); layer(x, 1, 'Idle', 'head', f, row);
            const d = x.getImageData(0, 0, F, F).data, g = new Uint8Array(F * F);
            for(let i = 0; i < F * F; i++) g[i] = classOf(d, i * 4);
            return g;
        };
        _refs = { down: [grab(0)], left: [grab(1), grab(1, 6)], up: [grab(3)] };
        _refs.right = _refs.left.map(mirror);
        return _refs;
    }
    const tplCache = {};
    function tplFor(type, dir, deg, pose = 0, fallen = false) {
        const k = type + dir + deg + ':' + pose + (fallen ? 'f' : '');
        if(tplCache[k]) return tplCache[k];
        const side = dir === 'right' ? 'left' : dir, set = HELM_TPL[type];
        // a head fallen face-down, seen from behind, shows only its crown: every helmet reads as a dome
        const base = fallen && dir === 'up' ? HELM_TPL.nasal.up : (pose && set[side + '34']) || set[side];
        let { g, cut } = tplGrids(base);
        if(dir === 'right') { g = mirror(g); cut = mirror(cut); }
        const rr = rotGrid(refs()[dir][pose], deg), pts = [];
        for(let i = 0; i < F * F; i++) if(rr[i]) pts.push(i % F, (i / F) | 0, rr[i]);
        return (tplCache[k] = { g: rotGrid(g, deg), cut: rotGrid(cut, deg), pts });
    }
    function score(cellCls, pts, dx, dy) {
        let s = 0;
        for(let p = 0; p < pts.length; p += 3) {
            const r = pts[p + 2], X = pts[p] + dx, Y = pts[p + 1] + dy;
            const c = X >= 0 && Y >= 0 && X < F && Y < F ? cellCls[Y * F + X] : 0;
            if(c === r) s += r === 1 ? 1 : 2;
            else if(!c) s -= 1;
        }
        return s;
    }
    const fitCache = {};
    // paint `type` onto one head cell (ImageData of a 64x64 canvas holding only the head layer)
    function helmet(id, type, anim, row, f, lvl) {
        const d = id.data, dir = DIRS[row], turning = anim === 'Death';
        const cellCls = new Uint8Array(F * F); let any = false;
        for(let i = 0; i < F * F; i++) { cellCls[i] = classOf(d, i * 4); if(cellCls[i]) any = true; }
        if(!any) return;
        const fk = [lvl, anim, row, f, type].join(':');
        let best = fitCache[fk];
        if(!best) {
            const degs = turning && dir !== 'up' ? [0, 45, -45, 90, -90, 180] : [0], poses = refs()[dir].length;
            for(let pose = 0; pose < poses; pose++) for(const deg of degs) {
                if(pose && deg) continue;
                const { pts } = tplFor(type, dir, deg, pose), R = turning ? 12 : 7;
                for(let dy = -R; dy <= R; dy++) for(let dx = -R; dx <= R; dx++) {
                    const s = score(cellCls, pts, dx, dy) - (deg ? 4 : 0) - (pose ? 1 : 0);
                    if(!best || s > best.s) best = { s, deg, dx, dy, pose };
                }
            }
            fitCache[fk] = best;
        }
        const { g, cut } = tplFor(type, dir, best.deg, best.pose, turning && dir === 'up' && f >= 3);
        let clip = null;             // a fallen helmet covers only where the head still shows
        if(turning) {
            clip = new Uint8Array(F * F);
            for(let i = 0; i < F * F; i++) if(cellCls[i]) { const x0 = i % F, y0 = (i / F) | 0; for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++) { const X = x0 + dx, Y = y0 + dy; if(X >= 0 && Y >= 0 && X < F && Y < F) clip[Y * F + X] = 1; } }
        }
        const ramp = type === 'cap' ? LEATHER : STEEL;
        const COL = [null, ramp[0], ramp[1], ramp[2], ramp[3], ramp[4], ramp[5], '#0d0b10'].map(h => h && hex2rgb(h));
        for(let y = 0; y < F; y++) for(let x = 0; x < F; x++) {
            const X = x + best.dx, Y = y + best.dy;
            if(X < 0 || Y < 0 || X >= F || Y >= F) continue;
            const i = (Y * F + X) * 4, sym = clip && !clip[Y * F + X] ? 0 : g[y * F + x];
            if(sym) { const [r, gg, b] = COL[sym]; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255; }
            else if(cut[y * F + x]) { const c = classOf(d, i); if(c === 1 || c === 2) d[i + 3] = 0; }
        }
    }

    // ---- other weapons and plate (2.1, round 1's promise: the pack only has swords) ----
    // An axe, a mace or a spear is the sword layer made into a haft — its steel greys turned to
    // wood — with a head drawn at the far end, pointing the way the blade pointed. The grip is the
    // layer's pixel nearest the body, the tip the farthest, so it follows every swing.
    const WOOD = ['#4a3420', '#6b4e2e', '#8a6a40'], STEEL_H = ['#2a2d33', '#6e7680', '#9aa3ad', '#c9d0d6', '#eef2f4'];
    function weapon(x, lvl, anim, part, f, row, kind) {
        if(!kind) return layer(x, lvl, anim, part, f, row);
        const t = cell(), tx = t.getContext('2d');
        layer(tx, lvl, anim, part, f, row);
        const id = tx.getImageData(0, 0, F, F), d = id.data, BX = 32, BY = 33;
        let grip = null, tip = null, gd = 1e9, td = -1;
        for(let i = 0; i < F * F; i++) {
            const o = i * 4;
            if(!d[o + 3]) continue;
            const px = i % F, py = (i / F) | 0, dist = (px - BX) ** 2 + (py - BY) ** 2;
            if(dist < gd) { gd = dist; grip = [px, py]; }
            if(dist > td) { td = dist; tip = [px, py]; }
            const r = d[o], g = d[o + 1], b = d[o + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
            if(mx > 90 && b >= r - 8 && mx - mn < 90) {     // blade steel (grey to steel-blue) -> haft wood, by brightness
                const w = WOOD[mx > 190 ? 2 : mx > 140 ? 1 : 0]; d[o] = parseInt(w.slice(1, 3), 16); d[o + 1] = parseInt(w.slice(3, 5), 16); d[o + 2] = parseInt(w.slice(5, 7), 16);
            }
        }
        tx.putImageData(id, 0, 0);
        if(tip && grip && td > 16) {
            let dx = tip[0] - grip[0], dy = tip[1] - grip[1], L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
            const nx = -dy, ny = dx, P = (a, b, c) => { tx.fillStyle = c; tx.fillRect(Math.round(a), Math.round(b), 1, 1); };
            if(kind === 'axe') {                           // a bearded blade on one side of the haft
                const W = [3, 5, 6, 6, 4, 2];
                W.forEach((w, s) => {
                    const cx = tip[0] - dx * s, cy = tip[1] - dy * s;
                    for(let k = 1; k <= w; k++) P(cx + nx * k, cy + ny * k, k === w ? STEEL_H[4] : STEEL_H[s === 0 || s === W.length - 1 ? 1 : 2]);
                    P(cx + nx * (w + 1), cy + ny * (w + 1), STEEL_H[0]);
                });
                P(tip[0] + dx, tip[1] + dy, STEEL_H[0]);
            } else if(kind === 'mace' || kind === 'hammer' || kind === 'spiked') {
                const cx = tip[0] + dx, cy = tip[1] + dy;
                if(kind === 'hammer') {                    // a block across the haft
                    for(let k = -3; k <= 3; k++) for(let s = -1; s <= 1; s++) P(cx + nx * k + dx * s, cy + ny * k + dy * s, Math.abs(k) === 3 || s === 1 ? STEEL_H[0] : s === -1 ? STEEL_H[3] : STEEL_H[2]);
                } else {
                    for(let yy = -3; yy <= 3; yy++) for(let xx = -3; xx <= 3; xx++) {
                        const r2 = xx * xx + yy * yy;
                        if(r2 <= 9) P(cx + xx, cy + yy, r2 > 5 ? STEEL_H[0] : xx + yy < -1 ? STEEL_H[3] : STEEL_H[2]);
                    }
                    if(kind === 'spiked') for(const [a, b] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) P(cx + a, cy + b, STEEL_H[4]);
                }
            } else if(kind === 'spear') {                  // a leaf-shaped point past the tip
                for(let s = 1; s <= 5; s++) {
                    const w = s < 2 ? 1 : s < 4 ? 2 : 1, cx = tip[0] + dx * s, cy = tip[1] + dy * s;
                    for(let k = -w + 1; k < w; k++) P(cx + nx * k, cy + ny * k, k === 0 ? STEEL_H[4] : STEEL_H[2]);
                }
                P(tip[0] + dx * 6, tip[1] + dy * 6, STEEL_H[0]);
            }
        }
        x.drawImage(t, 0, 0);
    }
    // Plate: steel shoulder guards on the body layer's shoulders and a bright ridge down the chest
    // (the pack's chain shirt is the top armour level; plate is drawn over it)
    function plateArmour(bx, dir, anim) {
        const id = bx.getImageData(0, 0, F, F).data;
        let x0 = F, y0 = F, x1 = -1, y1 = -1;
        for(let i = 0; i < F * F; i++) if(id[i * 4 + 3]) { const px = i % F, py = (i / F) | 0; if(px < x0) x0 = px; if(px > x1) x1 = px; if(py < y0) y0 = py; if(py > y1) y1 = py; }
        if(x1 < 0 || anim === 'Death') return;
        const P = (a, b, w, h, c) => { bx.fillStyle = c; bx.fillRect(a, b, w, h); };
        const guard = gx => { P(gx - 1, y0 - 1, 5, 1, STEEL_H[0]); P(gx - 1, y0, 1, 3, STEEL_H[0]); P(gx + 3, y0, 1, 3, STEEL_H[0]); P(gx, y0, 3, 3, STEEL_H[2]); P(gx, y0, 3, 1, STEEL_H[4]); P(gx, y0 + 3, 3, 1, STEEL_H[0]); };
        const mid = (x0 + x1 + 1) >> 1;
        if(dir === 'down' || dir === 'up') {
            guard(x0 + 1); guard(x1 - 3);
            if(dir === 'down') { P(mid - 1, y0 + 4, 2, 5, STEEL_H[2]); P(mid - 1, y0 + 4, 1, 5, STEEL_H[3]); }
        } else {
            guard(dir === 'left' ? mid - 1 : mid - 2);
            P(dir === 'left' ? x0 + 2 : x1 - 3, y0 + 4, 1, 5, STEEL_H[3]);
        }
    }

    // ---- a woman's long hair and face (2.1, round 1's "same body, long hair, a different face") ----
    // Drawn by code over the composed frame, placed by the head layer's own box so it follows
    // every frame's bob and turn: strands down to the shoulders on both sides facing the camera,
    // down the back of the head in profile, over the nape seen from behind. It is painted in the
    // pack's own hair palette, so colourMap recolours it with the rest of the hair; a softer
    // mouth sits on the face.
    function longHair(x, hx, dir) {
        const id = hx.getImageData(0, 0, F, F).data;
        let x0 = F, y0 = F, x1 = -1, y1 = -1;
        for(let i = 0; i < F * F; i++) if(id[i * 4 + 3]) { const px = i % F, py = (i / F) | 0; if(px < x0) x0 = px; if(px > x1) x1 = px; if(py < y0) y0 = py; if(py > y1) y1 = py; }
        if(x1 < 0) return;
        const P = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
        const strand = (sx, top, len, w) => {           // a lock of hair: dark edge, lighter middle, a rounded tip
            P(sx - 1, top, 1, len, HAIR_LINE); P(sx + w, top, 1, len, HAIR_LINE);
            P(sx, top, w, len, HAIR[1]); if(w > 1) P(sx + (w >> 1), top, 1, len - 1, HAIR[3]);
            P(sx, top + len, w, 1, HAIR_LINE);
        };
        const len = Math.max(6, (y1 - y0) >> 1);
        if(dir === 'down') {
            strand(x0 + 1, y0 + 6, len + 2, 2); strand(x1 - 1, y0 + 6, len + 2, 2);
            P((x0 + x1 + 1) >> 1, y1 - 2, 1, 1, '#c9706a');                       // the mouth
        } else if(dir === 'left') {
            strand(x1 - 3, y0 + 5, len + 3, 3);
            P(x0 + 3, y1 - 2, 1, 1, '#c9706a');
        } else if(dir === 'right') {
            strand(x0 + 1, y0 + 5, len + 3, 3);
            P(x1 - 3, y1 - 2, 1, 1, '#c9706a');
        } else {                                        // from behind: a fall of hair over the nape
            for(let r = 0; r < len; r++) {
                const inset = 2 + (r >> 1), a = x0 + inset, b = x1 - inset;
                if(b <= a) break;
                P(a - 1, y1 - 2 + r, 1, 1, HAIR_LINE); P(b + 1, y1 - 2 + r, 1, 1, HAIR_LINE);
                P(a, y1 - 2 + r, b - a + 1, 1, r % 3 === 1 ? HAIR[3] : HAIR[2]);
            }
        }
    }

    // ---- composed frames ----
    const mapCache = {};
    function colourMap(look) {
        const k = look.skin + ':' + look.hair + ':' + look.cloth + ':' + look.armor;
        if(mapCache[k]) return mapCache[k];
        const m = new Map();
        if(look.skin) SKIN.forEach(h => m.set(hkey(h), viaHsl(h, SKINS[look.skin])));
        if(look.hair) HAIR.forEach(h => m.set(hkey(h), viaHsl(h, HAIRS[look.hair])));
        const dye = DYE[look.cloth];
        if(dye) {
            const sat = look.armor === 1 ? dye.s * 0.7 : dye.s, dl = look.armor === 1 ? dye.dl : dye.dl + 0.08;
            CLOTH[look.armor].forEach(h => m.set(hkey(h), viaHsl(h, (hh, s, l) => [dye.h, sat, l + dl])));
        }
        return (mapCache[k] = m);
    }
    // level 3 ships no layered Hurt: built from its idle frame, knocked back, then flushed red
    const HURT3 = [[1, 0], [2, 0], [2, 0.9], [1, 0.8], [0, 0.3]];
    const KNOCK = { right: [-1, 0], left: [1, 0], down: [0, -1], up: [0, 1] };
    const frames = new Map(), CAP = 2500;
    function frameIndex(anim, t) {
        const A = ANIM[anim], f = Math.floor(Math.max(0, t) / A.ms);
        return A.loop ? f % A.n : Math.min(A.n - 1, f);
    }
    // look: { armor 1..3, weapon 1..3, helm ''|'cap'|'nasal'|'greathelm', skin 0..3, hair 0..5, cloth }
    function art(look, anim, dir, t) {
        if(!ready()) return null;
        const f = frameIndex(anim, t), row = ROW[dir];
        const k = [look.armor, look.weapon, look.helm, look.skin, look.hair, look.cloth, look.fem ? 'f' : '', look.wpn || '', look.plate ? 'p' : '', anim, row, f].join('|');
        let c = frames.get(k);
        if(c) { frames.delete(k); frames.set(k, c); return c; }   // keep recently used frames
        c = bake(look, anim, row, f, dir);
        frames.set(k, c);
        if(frames.size > CAP) frames.delete(frames.keys().next().value);
        return c;
    }
    function bake(look, anim, row, f, dir) {
        let a = anim, fr = f, ox = 0, oy = 0, red = 0;
        if(!hasAnim(look.armor, a)) {
            const [kk, r] = HURT3[Math.min(f, HURT3.length - 1)];
            a = 'Idle'; fr = 0; ox = KNOCK[dir][0] * kk; oy = KNOCK[dir][1] * kk; red = r;
        } else if(a === 'Hurt' || a === 'Death') {
            const t = SWORDSMAN_INDEX[look.armor].red[a];
            red = t ? t[row * ANIM[a].n + f] || 0 : 0;
        }
        const wl = hasAnim(look.weapon, a) ? look.weapon : 2;
        const head = cell(), hx = head.getContext('2d');
        layer(hx, look.armor, a, 'head', fr, row);
        if(look.helm) { const id = hx.getImageData(0, 0, F, F); helmet(id, look.helm, a, row, fr, look.armor); hx.putImageData(id, 0, 0); }
        const comp = cell(), x = comp.getContext('2d');
        weapon(x, wl, a, 'sword_back', fr, row, look.wpn);
        if(look.plate) { const b = cell(), bx = b.getContext('2d'); layer(bx, look.armor, a, 'body', fr, row); plateArmour(bx, dir, a); x.drawImage(b, 0, 0); }
        else layer(x, look.armor, a, 'body', fr, row);
        x.drawImage(head, 0, 0);
        if(look.fem && a !== 'Death') longHair(x, hx, dir);
        weapon(x, wl, a, 'sword', fr, row, look.wpn);
        const id = x.getImageData(0, 0, F, F), d = id.data, m = colourMap(look);
        let x0 = F, y0 = F, x1 = -1, y1 = -1;
        for(let i = 0; i < d.length; i += 4) {
            if(!d[i + 3]) continue;
            const c = m.get(key(d[i], d[i + 1], d[i + 2]));
            if(c) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; }
            const p = i >> 2, px = p % F, py = (p / F) | 0;
            if(px < x0) x0 = px; if(px > x1) x1 = px; if(py < y0) y0 = py; if(py > y1) y1 = py;
        }
        x.putImageData(id, 0, 0);
        if(red > 0.02) {
            x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#d42a3a'; x.globalAlpha = Math.min(0.65, red * 0.65);
            x.fillRect(0, 0, F, F); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
        }
        if(x1 < 0) { x0 = y0 = 0; x1 = y1 = 1; }
        const out = document.createElement('canvas');
        out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
        out.getContext('2d').drawImage(comp, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
        out._pixel = true; out._k = K; out._rankY = -36;
        out._ax = (FOOT.x - ox - x0) / out.width; out._ay = (FOOT.y - oy - y0) / out.height;
        return out;
    }
    // a cloth colour dyed with a side's hue — shared with the archer and the saddle cloth
    const dyeRgb = (hex, dye) => viaHsl(hex, (h, s, l) => [dye.h, dye.s, l + dye.dl]);
    const dyeHex = cloth => { const d = DYE[cloth]; if(!d) return null; const [r, g, b] = hsl2rgb(d.h, d.s * 0.9, 0.42 + d.dl); return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''); };
    return { ANIM, K, load, ready, art, frameIndex, DYE, dyeRgb, dyeHex };
})();

// The horse for every rider (visual refresh, step 2). Neither pack ships one, so it is built
// from a few shapes (barrel, chest, rump, neck, head, jointed legs) rasterised onto the pixel
// grid, shaded by edge and outlined. Legs run one stride cycle each, offset in time: a gallop
// (rotary footfalls, a moment in the air) and a calm four-beat walk. A foreleg folds at the
// knee with the hoof tucked back, a hind leg at the hock with the hoof tucked forward.
// Every (coat, gait, frame, cloth) is baked once; 48x36 px, facing right, ground at y 33.
const Horse = (() => {
    const W = 48, H = 36, GROUND = 33, SADDLE = { x: 21, y: 13 };
    const COATS = {
        bay:   { o: '#24160f', c: ['#4a2a18', '#6b3f22', '#8c5530', '#ad7143'], mane: '#261710', sock: '#d8c7a8' },
        grey:  { o: '#23232b', c: ['#5b5b67', '#83838f', '#a7a7b1', '#cbcbd3'], mane: '#3d3d47', sock: '#e9e9ee' },
        black: { o: '#121015', c: ['#262229', '#38323c', '#4b4450', '#655c6b'], mane: '#141117', sock: '#8d8490' },
    };
    const ease = u => u * u * (3 - 2 * u);
    // [upper, lower] leg angles, absolute, degrees from vertical (+ = toward the head)
    function legAt(p, fore, g) {
        if(p < g.stance) {
            const th = g.reach - 2 * g.reach * (p / g.stance);
            return fore ? [th, th] : [th - 12, th + 8];
        }
        const u = (p - g.stance) / (1 - g.stance), th = -g.reach + 2 * g.reach * ease(u), flex = Math.sin(Math.PI * u);
        return fore ? [th + flex * g.knee, th - flex * g.fold] : [th - 12 - flex * g.hock, th + 8 + flex * g.fold * 0.9];
    }
    const GAITS = {
        // rotary gallop: near hind, far hind, near fore, far fore, then all four in the air
        gallop: { n: 8, ms: 70, stance: 0.42, reach: 28, knee: 22, fold: 78, hock: 14, phase: { nh: 0, fh: 0.12, nf: 0.4, ff: 0.52 }, bob: t => Math.round(-Math.sin(2 * Math.PI * (t - 0.15))) },
        // four-beat walk: hind, fore on the same side, then the other side; always three feet down
        walk:   { n: 8, ms: 115, stance: 0.62, reach: 16, knee: 14, fold: 46, hock: 8, phase: { nh: 0, nf: 0.25, fh: 0.5, ff: 0.75 }, bob: t => Math.round(-Math.sin(4 * Math.PI * t) * 0.6) },
    };
    const POSES = {};
    for(const g in GAITS) {
        const G = GAITS[g];
        POSES[g] = Array.from({ length: G.n }, (_, i) => {
            const t = i / G.n, f = {};
            for(const k in G.phase) f[k] = legAt((t + 1 - G.phase[k]) % 1, k[1] === 'f', G);
            f.bob = G.bob(t); f.tail = 1 + Math.round(Math.sin(2 * Math.PI * t) * (g === 'gallop' ? 1 : 0.5));
            return f;
        });
    }
    POSES.stand = [{ nf: [3, 3], ff: [-2, -2], nh: [-14, 6], fh: [-10, 9], bob: 0, tail: 1 }];
    const frameOf = (gait, t) => gait === 'stand' ? 0 : Math.floor(Math.max(0, t) / GAITS[gait].ms) % GAITS[gait].n;
    const shade = (hex, k) => {
        const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16));
        const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
        return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
    };
    const cache = {};
    function bake(coatName, gait, fi, cloth) {
        const key = coatName + gait + fi + (cloth || '');
        if(cache[key]) return cache[key];
        const coat = COATS[coatName] || COATS.bay, P = POSES[gait][fi] || POSES.stand[0], b = P.bob;
        const m = new Uint8Array(W * H);          // 1 body · 2 far leg · 3 mane/tail · 4 hoof · 6 cloth · 7 saddle · 8 eye · 9 sock
        const set = (x, y, v) => { x = Math.round(x); y = Math.round(y); if(x >= 0 && y >= 0 && x < W && y < H) m[y * W + x] = v; };
        const ell = (cx, cy, rx, ry, v) => { for(let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for(let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x - cx) / rx, dy = (y - cy) / ry; if(dx * dx + dy * dy <= 1) set(x, y, v); } };
        const line = (x0, y0, x1, y1, r, v) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1; for(let i = 0; i <= n; i++) { const t = i / n; ell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, v); } };
        const leg = (hx, hy, [a1, a2], v, sock) => {
            const r1 = a1 * Math.PI / 180, r2 = a2 * Math.PI / 180;
            const kx = hx + Math.sin(r1) * 6, ky = hy + Math.cos(r1) * 6, fx = kx + Math.sin(r2) * 6, fy = ky + Math.cos(r2) * 6;
            line(hx, hy, kx, ky, 1.25, v); line(kx, ky, fx, fy, 0.75, v);
            if(sock) line(kx + (fx - kx) * 0.6, ky + (fy - ky) * 0.6, fx, fy, 0.7, 9);
            set(fx, fy, 4);
        };
        leg(27, 21 + b, P.ff, 2); leg(14, 21 + b, P.fh, 2);                    // far legs, behind the body
        const tw = [[9, 15], [6, 18], [5, 22], [5, 25]].map(([x, y], i) => [x - (i ? P.tail * 0.6 * i : 0), y + b]);
        for(let i = 0; i < tw.length - 1; i++) line(tw[i][0], tw[i][1], tw[i + 1][0], tw[i + 1][1], 1, 3);
        ell(22, 18 + b, 9.5, 5, 1); ell(29, 17 + b, 5, 5, 1); ell(14, 17 + b, 5.5, 5, 1);
        line(29, 15 + b, 34, 8 + b, 2.4, 1);
        ell(37, 8 + b, 4, 2.4, 1); ell(40, 10 + b, 2, 1.8, 1);
        set(35, 3 + b, 1); set(35, 4 + b, 1); set(36, 4 + b, 1);
        leg(28, 21 + b, P.nf, 1, true); leg(15, 21 + b, P.nh, 1, false);
        line(28, 12 + b, 33, 5 + b, 0.8, 3); set(34, 5 + b, 3); set(35, 6 + b, 3);
        set(37, 7 + b, 8);
        for(let y = 14; y <= 20; y++) for(let x = 17; x <= 25; x++) if(m[(y + b) * W + x] === 1) set(x, y + b, cloth ? 6 : 7);
        for(let x = 18; x <= 23; x++) { set(x, 12 + b, 7); set(x, 13 + b, 7); }
        set(17, 12 + b, 7); set(24, 11 + b, 7);
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d'), id = x.createImageData(W, H), d = id.data;
        const rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
        const ramp = cloth ? [shade(cloth, -0.35), shade(cloth, -0.15), cloth, shade(cloth, 0.2)] : null;
        const put = (i, h) => { const [r, g, bb] = rgb(h); d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = bb; d[i * 4 + 3] = 255; };
        const at = (xx, yy) => xx < 0 || yy < 0 || xx >= W || yy >= H ? 0 : m[yy * W + xx];
        for(let yy = 0; yy < H; yy++) for(let xx = 0; xx < W; xx++) {
            const v = m[yy * W + xx], i = yy * W + xx; if(!v) continue;
            const up = at(xx, yy - 1), dn = at(xx, yy + 1);
            if(v === 1) put(i, coat.c[!up || up === 3 ? 3 : !dn ? 1 : 2]);
            else if(v === 2) put(i, coat.c[!up ? 1 : 0]);
            else if(v === 3) put(i, coat.mane);
            else if(v === 4) put(i, '#1a1412');
            else if(v === 6) put(i, ramp[!up || up === 7 ? 3 : !dn || dn === 2 ? 0 : (xx === 17 || xx === 25) ? 1 : 2]);
            else if(v === 7) put(i, !up ? '#9a6a3a' : '#6e4527');
            else if(v === 8) put(i, '#0e0b0a');
            else if(v === 9) put(i, coat.sock);
        }
        for(let yy = 0; yy < H; yy++) for(let xx = 0; xx < W; xx++)
            if(!m[yy * W + xx] && (at(xx - 1, yy) || at(xx + 1, yy) || at(xx, yy - 1) || at(xx, yy + 1))) put(yy * W + xx, coat.o);
        x.putImageData(id, 0, 0);
        return (cache[key] = c);
    }
    return { W, H, GROUND, SADDLE, GAITS, bake, frameOf, bob: (gait, fi) => (POSES[gait][fi] || POSES.stand[0]).bob };
})();

// The hooded archer (Roguelike Kit): idle 4 / walk 6 / attack 4 / hurt 2 / death 8 frames of
// 32x32, facing down, side (right; left is mirrored) and up. Cloth greens are dyed like the
// swordsmen's. Frames are baked once and handed to both renderers like Swordsman frames.
const Archer = (() => {
    const K = 1.5, FOOT = { x: 16, y: 27 };
    const ANIM = { Idle: { ms: 160, loop: true }, Walk: { ms: 110, loop: true }, Attack: { ms: 150 }, Hurt: { ms: 120 }, Death: { ms: 110 } };
    const GREEN = ['#265c42', '#3e8948', '#63c74d'];
    let img = null;
    const load = () => { if(!img && typeof Image !== 'undefined' && ARCHER_INDEX) { img = new Image(); img.src = 'troops/archer_anim.png'; } };
    const ready = () => !!img && img.complete && img.naturalWidth > 0;
    const frames = new Map();
    function art(cloth, anim, dir, t) {
        if(!ready()) return null;
        const A = ARCHER_INDEX[anim], n = A.n, fr = Math.floor(Math.max(0, t) / ANIM[anim].ms);
        const f = ANIM[anim].loop ? fr % n : Math.min(n - 1, fr), side = dir === 'left' || dir === 'right';
        const k = [cloth, anim, dir, f].join('|');
        let c = frames.get(k);
        if(c) return c;
        c = document.createElement('canvas'); c.width = c.height = 32;
        const x = c.getContext('2d');
        // the kit's side strip is drawn facing left: right is its mirror
        if(dir === 'right') { x.translate(32, 0); x.scale(-1, 1); }
        x.drawImage(img, f * 32, A[side ? 'S' : dir === 'up' ? 'U' : 'D'] * 32, 32, 32, 0, 0, 32, 32);
        x.setTransform(1, 0, 0, 1, 0, 0);
        const dye = Swordsman.DYE[cloth];
        if(dye) {
            const id = x.getImageData(0, 0, 32, 32), d = id.data, m = new Map();
            GREEN.forEach(h => m.set(h, Swordsman.dyeRgb(h, dye)));
            for(let i = 0; i < d.length; i += 4) {
                if(!d[i + 3]) continue;
                const h = '#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''), r = m.get(h);
                if(r) { d[i] = r[0]; d[i + 1] = r[1]; d[i + 2] = r[2]; }
            }
            x.putImageData(id, 0, 0);
        }
        c._pixel = true; c._k = K; c._ax = FOOT.x / 32; c._ay = FOOT.y / 32; c._rankY = -34; c._bow = true;
        frames.set(k, c);
        return c;
    }
    return { ANIM, load, ready, art };
})();

// A rider: the Swordsman from the waist up, sat on a Horse. Composed per frame into one
// canvas (the horse facing left or right only), cached like the others. A fallen rider lies
// beside a horse that fades out as it bolts.
const Mounted = (() => {
    const CW = 64, CH = 58, HX = 8, HY = 22;          // horse cell's place in the composite
    const FEET = { x: HX + 24, y: HY + Horse.GROUND };
    const frames = new Map(), CAP = 1500;
    // s: { gait 'stand'|'walk'|'gallop', gt, facing 'left'|'right', anim, t, dead, deadT }
    function art(look, s) {
        if(!Swordsman.ready()) return null;
        const hf = s.dead ? Horse.frameOf('gallop', s.deadT * 1000) : Horse.frameOf(s.gait, s.gt);
        const fade = s.dead ? Math.min(4, Math.floor(s.deadT / 0.2)) : 0;
        const rf = Swordsman.frameIndex(s.anim, s.t);
        const k = [look.rider.armor, look.rider.weapon, look.rider.helm, look.rider.skin, look.rider.hair, look.rider.fem ? 'f' : '', look.rider.wpn || '', look.rider.plate ? 'p' : '', look.cloth, look.coat, s.dead ? 'd' : s.gait, hf, fade, s.facing, s.anim, rf].join('|');
        let c = frames.get(k);
        if(c) { frames.delete(k); frames.set(k, c); return c; }
        c = document.createElement('canvas'); c.width = CW; c.height = CH;
        const x = c.getContext('2d'), left = s.facing === 'left';
        const horse = Horse.bake(look.coat, s.dead ? 'gallop' : s.gait, hf, Swordsman.dyeHex(look.cloth));
        const drawHorse = (dx, alpha) => {
            x.save(); x.globalAlpha = alpha;
            if(left) { x.translate(HX + dx + Horse.W, HY); x.scale(-1, 1); x.drawImage(horse, 0, 0); }
            else x.drawImage(horse, HX + dx, HY);
            x.restore();
        };
        if(s.dead) {
            // the horse bolts the way it faced and fades; its rider falls where it stood
            drawHorse((left ? -1 : 1) * fade * 3, 1 - fade / 4.5);
            const r = Swordsman.art(look.rider, 'Death', s.facing, s.t);
            if(r) x.drawImage(r, Math.round(FEET.x - r._ax * r.width) + (left ? 5 : -5), Math.round(FEET.y - r._ay * r.height));
        } else {
            drawHorse(0, 1);
            const r = Swordsman.art(look.rider, s.anim, s.facing, s.t);
            if(r) {
                // only the rider's upper body: cut 7 px above the feet, seat that line on the saddle
                const fx = r._ax * r.width, fy = r._ay * r.height, cut = Math.max(1, Math.round(fy - 7));
                const bob = s.gait === 'stand' ? 0 : Horse.bob(s.gait, hf);
                const sx = HX + (left ? Horse.W - 1 - Horse.SADDLE.x : Horse.SADDLE.x), sy = HY + Horse.SADDLE.y + bob;
                x.drawImage(r, 0, 0, r.width, cut, Math.round(sx - fx), sy - cut, r.width, cut);
            }
        }
        c._pixel = true; c._k = Swordsman.K; c._ax = FEET.x / CW; c._ay = FEET.y / CH; c._rankY = -56;
        frames.set(k, c);
        if(frames.size > CAP) frames.delete(frames.keys().next().value);
        return c;
    }
    return { art };
})();
