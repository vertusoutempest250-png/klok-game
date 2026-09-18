/**
 * Level — World layout, background layers, decorations, platforms,
 * NPCs, memories, checkpoints, all five sections.
 *
 * World is 9000 × 600 px. Canvas view is 800 × 450 px (scaled to window).
 */

import { Platform }  from './platform.js';
import { NPC }        from './npc.js';
import { Memory, MemoryTypes } from './coin.js';
import { Checkpoint } from './checkpoint.js';
import { Trap }       from './trap.js';

export const WORLD_W = 9000;
export const WORLD_H = 600;
export const GROUND_Y = 520;   // top of ground layer

// Section boundaries (world X)
export const SECTIONS = [
  { name: 'Sawah',          xStart: 0,    xEnd: 1800, skyTop: '#B8E0F0', skyBot: '#D4F0B0' },
  { name: 'Desa',           xStart: 1800, xEnd: 3600, skyTop: '#A8D8F0', skyBot: '#C8E890' },
  { name: 'Pedesaan',       xStart: 3600, xEnd: 5400, skyTop: '#A0CCE8', skyBot: '#C0E080' },
  { name: 'Jalan Sekolah',  xStart: 5400, xEnd: 7200, skyTop: '#98C4E0', skyBot: '#B8D878' },
  { name: 'Sekolah',        xStart: 7200, xEnd: 9000, skyTop: '#90B8D8', skyBot: '#B0D070' },
];

export class Level {
  constructor() {
    this.platforms    = [];
    this.npcs         = [];
    this.memories     = [];
    this.checkpoints  = [];
    this.traps        = [];          // ← NEW
    this._clouds      = [];
    this._birds       = [];
    this._decorations = [];
    this._treeList    = [];
    this._buildingList = [];

    this._build();
  }

  _build() {
    this._buildPlatforms();
    this._buildNPCs();
    this._buildMemories();
    this._buildCheckpoints();
    this._buildTraps();              // ← NEW
    this._buildDecorations();
    this._buildClouds();
    this._buildBirds();
  }

  // ── Platforms ────────────────────────────────────────────────────────
  _buildPlatforms() {
    const G  = GROUND_Y;
    const GH = WORLD_H - G;

    // ====== GROUND — full-level base ======
    this.platforms.push(new Platform(0, G, WORLD_W, GH, 'solid', '', 'grass'));

    // ====== SECTION 1: SAWAH (Rice field) — x 0–1800 ======
    // Irrigation channels (death/water gaps + boards)
    this.platforms.push(new Platform(280, G, 60, GH, 'death', '', 'water'));
    this.platforms.push(new Platform(580, G, 60, GH, 'death', '', 'water'));
    this.platforms.push(new Platform(900, G, 60, GH, 'death', '', 'water'));
    this.platforms.push(new Platform(1200, G, 60, GH, 'death', '', 'water'));
    this.platforms.push(new Platform(1500, G, 60, GH, 'death', '', 'water'));

    // Wooden bridges over channels
    this.platforms.push(new Platform(275, G - 2, 70, 10, 'solid', '', 'wood'));
    this.platforms.push(new Platform(575, G - 2, 70, 10, 'solid', '', 'wood'));
    this.platforms.push(new Platform(895, G - 2, 70, 10, 'solid', '', 'wood'));
    this.platforms.push(new Platform(1195, G - 2, 70, 10, 'solid', '', 'wood'));
    this.platforms.push(new Platform(1495, G - 2, 70, 10, 'solid', '', 'wood'));

    // Raised dirt mounds (rice paddy edges)
    this.platforms.push(new Platform(140, G - 28, 100, 28, 'solid', '', 'dirt'));
    this.platforms.push(new Platform(430, G - 28, 100, 28, 'solid', '', 'dirt'));
    this.platforms.push(new Platform(730, G - 28, 100, 28, 'solid', '', 'dirt'));
    this.platforms.push(new Platform(1040, G - 28, 100, 28, 'solid', '', 'dirt'));
    this.platforms.push(new Platform(1340, G - 28, 100, 28, 'solid', '', 'dirt'));
    this.platforms.push(new Platform(1640, G - 28, 120, 28, 'solid', '', 'dirt'));

    // ====== SECTION 2: DESA (Village) — x 1800–3600 ======
    // Ground transition to road
    this.platforms.push(new Platform(1800, G, 1800, GH, 'solid', '', 'dirt'));

    // Stepping-stone platforms
    this.platforms.push(new Platform(1900, G - 50, 80, 18, 'solid', '', 'stone'));
    this.platforms.push(new Platform(2050, G - 90, 80, 18, 'solid', '', 'stone'));
    this.platforms.push(new Platform(2200, G - 60, 80, 18, 'solid', '', 'stone'));
    this.platforms.push(new Platform(2400, G - 100, 100, 18, 'solid', '', 'stone'));
    this.platforms.push(new Platform(2600, G - 70, 80, 18, 'solid', '', 'stone'));
    this.platforms.push(new Platform(2800, G - 110, 100, 18, 'solid', '', 'stone'));
    this.platforms.push(new Platform(3000, G - 80, 80, 18, 'solid', '', 'stone'));
    this.platforms.push(new Platform(3200, G - 50, 100, 18, 'solid', '', 'stone'));
    this.platforms.push(new Platform(3400, G - 90, 80, 18, 'solid', '', 'stone'));

    // ====== SECTION 3: PEDESAAN (Countryside) — x 3600–5400 ======
    this.platforms.push(new Platform(3600, G, 1800, GH, 'solid', '', 'grass'));

    // Hills (elevated ground sections)
    this.platforms.push(new Platform(3700, G - 60, 200, 60, 'solid', '', 'grass'));
    this.platforms.push(new Platform(3980, G - 110, 180, 110, 'solid', '', 'grass'));
    this.platforms.push(new Platform(4220, G - 70, 160, 70, 'solid', '', 'grass'));

    // Bridges
    this.platforms.push(new Platform(4450, G - 10, 200, 14, 'solid', '', 'wood'));
    this.platforms.push(new Platform(4450, G, 200, GH, 'death', '', 'water'));

    this.platforms.push(new Platform(4800, G - 80, 120, 18, 'solid', '', 'stone'));
    this.platforms.push(new Platform(4980, G - 130, 120, 18, 'solid', '', 'stone'));
    this.platforms.push(new Platform(5160, G - 80, 120, 18, 'solid', '', 'stone'));

    // ====== SECTION 4: JALAN SEKOLAH (School road) — x 5400–7200 ======
    this.platforms.push(new Platform(5400, G, 1800, GH, 'solid', '', 'road'));

    // Sidewalk ledges
    this.platforms.push(new Platform(5500, G - 24, 120, 24, 'solid', '', 'school'));
    this.platforms.push(new Platform(5700, G - 24, 120, 24, 'solid', '', 'school'));
    this.platforms.push(new Platform(5900, G - 48, 120, 24, 'solid', '', 'school'));
    this.platforms.push(new Platform(6100, G - 24, 140, 24, 'solid', '', 'school'));
    this.platforms.push(new Platform(6320, G - 60, 120, 24, 'solid', '', 'school'));
    this.platforms.push(new Platform(6520, G - 80, 140, 24, 'solid', '', 'school'));
    this.platforms.push(new Platform(6720, G - 50, 120, 24, 'solid', '', 'school'));
    this.platforms.push(new Platform(6900, G - 30, 200, 24, 'solid', '', 'school'));

    // ====== SECTION 5: SEKOLAH (School) — x 7200–9000 ======
    this.platforms.push(new Platform(7200, G, 1800, GH, 'solid', '', 'school'));

    // School yard platforms
    this.platforms.push(new Platform(7300, G - 40, 160, 18, 'solid', '', 'school'));
    this.platforms.push(new Platform(7540, G - 80, 160, 18, 'solid', '', 'school'));
    this.platforms.push(new Platform(7780, G - 120, 160, 18, 'solid', '', 'school'));
    this.platforms.push(new Platform(8020, G - 80, 160, 18, 'solid', '', 'school'));
    this.platforms.push(new Platform(8260, G - 40, 160, 18, 'solid', '', 'school'));

    // Final approach — flat
    this.platforms.push(new Platform(8500, G - 10, 480, 18, 'solid', '', 'school'));
  }

  // ── NPCs ──────────────────────────────────────────────────────────────
  _buildNPCs() {
    const G = GROUND_Y;

    const npcData = [
      {
        x: 350, y: G - 44,
        name: 'Dika',
        color: '#C03030',
        lines: [
          'Masih ingat waktu kita pertama kali masuk kelas?',
          'Semuanya masih bingung nyari ruangan haha.',
        ],
      },
      {
        x: 800, y: G - 44,
        name: 'Reni',
        color: '#C06090',
        lines: [
          'Perjalanan kita panjang banget ya...',
          'Dari ospek sampai detik ini, nggak kerasa.',
        ],
      },
      {
        x: 1600, y: G - 72,
        name: 'Budi',
        color: '#3060C0',
        lines: [
          'Sawah ini reminds me of our study trips!',
          'Jangan lupa semua kenangan kita ya.',
        ],
      },
      {
        x: 2200, y: G - 104,
        name: 'Sari',
        color: '#30A060',
        lines: [
          'Desa ini kayak rumah kedua kita.',
          'Semua teman di sini seperti keluarga.',
        ],
      },
      {
        x: 2900, y: G - 154,
        name: 'Hendra',
        color: '#C08030',
        lines: [
          'Lulus bareng teman-teman satu angkatan...',
          'Rasanya campur aduk antara senang dan sedih.',
        ],
      },
      {
        x: 3900, y: G - 104,
        name: 'Putri',
        color: '#8030C0',
        lines: [
          'Alam pedesaan ini yang bikin hati tenang.',
          'Semoga kita semua sukses di jalan masing-masing!',
        ],
      },
      {
        x: 4600, y: G - 44,
        name: 'Rizky',
        color: '#3090C0',
        lines: [
          'Jembatan ini... berasa melewati fase hidup baru.',
          'Tetap semangat ya, teman-teman!',
        ],
      },
      {
        x: 5600, y: G - 68,
        name: 'Fitri',
        color: '#C04080',
        lines: [
          'Udah deket sekolah nih, deg-degan.',
          'Tiga tahun kita lewatin jalan ini setiap hari.',
        ],
      },
      {
        x: 6200, y: G - 108,
        name: 'Yoga',
        color: '#40A040',
        lines: [
          'Rambu sekolah ini... berasa kemarin kita baru masuk.',
          'Sekarang mau lulus. Waktu cepet banget.',
        ],
      },
      {
        x: 7000, y: G - 74,
        name: 'Maya',
        color: '#A03060',
        lines: [
          'Sebentar lagi kita sampai di gerbang.',
          'Inget nggak? Dulu takut masuk gerbang sekolah haha.',
        ],
      },
      {
        x: 7500, y: G - 84,
        name: 'Andi',
        color: '#4060A0',
        lines: [
          'Halaman sekolah ini saksi bisu perjalanan kita.',
          'XII IPS 2 — kelas terbaik yang pernah ada!',
        ],
      },
      {
        x: 8100, y: G - 124,
        name: 'Dewi',
        color: '#B04020',
        lines: [
          'Hampir sampai gerbang... jangan nangis ya.',
          'Wkwk, aku yang nangis duluan deh.',
        ],
      },
      {
        x: 8450, y: G - 44,
        name: 'Farhan',
        color: '#206080',
        lines: [
          'Gerbang sekolah sudah di depan mata!',
          'FAMOUSDA — XII IPS 2 — selamanya di hati.',
        ],
      },
    ];

    for (const d of npcData) {
      this.npcs.push(new NPC(d.x, d.y, d.name, d.lines, d.color));
    }
  }

  // ── Memories (collectibles) ───────────────────────────────────────────
  //
  //  Placement rules:
  //    • Every item sits exactly ITEM_FLOAT (28px) above its surface Y.
  //    • Surface Y for ground items  = GROUND_Y  → item y = G - ITEM_FLOAT
  //    • Surface Y for platform(-h) items = G - h → item y = G - h - ITEM_FLOAT
  //    • Items are never over water/death tiles or unsupported air.
  //    • Min 80px horizontal gap from any trap.
  //
  _buildMemories() {
    const G  = GROUND_Y;
    const F  = 28;   // float height above surface (item bob clears it nicely)

    // Helper: Y above ground
    const gY  = () => G - F;
    // Helper: Y above platform with given depth below ground
    const pY  = (depth) => G - depth - F;

    const places = [
      // ── Level 1: Sawah — 6 items, all on flat ground between channels ──────
      // Channels at x: 280, 580, 900, 1200, 1500  (each 60px wide)
      // Safe ground gaps: 0–280, 340–580, 640–900, 960–1200, 1260–1500, 1560–1800
      { x: 190,  y: gY(),    type: 'PHOTO'  }, // gap 1: x=190
      { x: 510,  y: gY(),    type: 'NOTE'   }, // gap 2: x=510 (clear of thorn@460+36=496 ✓ 14px — move further)
      { x: 760,  y: gY(),    type: 'BOOK'   }, // gap 3: x=760 (clear of spike@648 ✓)
      { x: 1130, y: gY(),    type: 'RIBBON' }, // gap 4: x=1130 (thorn@1055 ends at 1091, safe +39px right)
      { x: 1400, y: gY(),    type: 'BADGE'  }, // gap 5: x=1400
      { x: 1680, y: pY(28),  type: 'PHOTO'  }, // on mound@1640(-28), right area, no trap

      // ── Level 2: Desa — 6 items, each on a different clean platform ─────────
      // Platforms (xStart, depth): 1900(-50), 2050(-90), 2400(-100), 2600(-70), 3000(-80), 3400(-90)
      // Traps: spike@2210(on plat 2200—skip that one), thorn@2550, spike@2860, thorn@3250
      { x: 1930, y: pY(50),  type: 'BOOK'   }, // plat@1900(-50), no trap
      { x: 2080, y: pY(90),  type: 'PHOTO'  }, // plat@2050(-90), no trap
      { x: 2440, y: pY(100), type: 'NOTE'   }, // plat@2400(-100), no trap
      { x: 2640, y: pY(70),  type: 'BADGE'  }, // plat@2600(-70), no trap
      { x: 3030, y: pY(80),  type: 'RIBBON' }, // plat@3000(-80), no trap
      { x: 3420, y: pY(90),  type: 'PHOTO'  }, // plat@3400(-90), no trap

      // ── Level 3: Pedesaan — 6 items on hills/ledges away from traps ─────────
      // Hills: 3700(-60), 3980(-110), 4220(-70)
      // Ledges: 4800(-80), 4980(-130), 5160(-80)
      // Traps: saw@4000(hill3980), thorn@4380(ground), spike@4700(ground), saw@5000(ledge4980)
      { x: 3730, y: pY(60),  type: 'BADGE'  }, // hill@3700(-60), left side — no trap
      { x: 4240, y: pY(70),  type: 'NOTE'   }, // hill@4220(-70), no trap (thorn@4380 is 140px right)
      { x: 4550, y: gY(),    type: 'RIBBON' }, // ground between thorn@4380 and spike@4700: x=4550 (safe)
      { x: 4830, y: pY(80),  type: 'PHOTO'  }, // ledge@4800(-80), no trap (saw@5000 is 170px right)
      { x: 5185, y: pY(80),  type: 'BADGE'  }, // ledge@5160(-80), right of saw@5000 (+185px)
      { x: 5350, y: gY(),    type: 'BOOK'   }, // ground after all ledges, end of section (thorn@5260 ends ~5296, safe +54px)

      // ── Level 4: Jalan Sekolah — 6 items on ledges, away from traps ─────────
      // Ledges (xStart, depth): 5500(-24), 5700(-24), 5900(-48), 6100(-24), 6320(-60), 6520(-80), 6720(-50), 6900(-30)
      // Traps: spike@5715(plat5700), spike@5940(plat5900), saw@6100(ground), spike@6340(plat6320), saw@6620(ground), spike@6870(plat6900-edge)
      { x: 5530, y: pY(24),  type: 'BOOK'   }, // plat@5500(-24), 185px before spike@5715 ✓
      { x: 5830, y: pY(48),  type: 'PHOTO'  }, // plat@5900(-48), offset from spike@5940 by 110px ✓
      { x: 6160, y: pY(24),  type: 'NOTE'   }, // plat@6100(-24), 60px right of saw@6100 — on platform level
      { x: 6555, y: pY(80),  type: 'RIBBON' }, // plat@6520(-80), 215px from spike@6340 ✓
      { x: 6750, y: pY(50),  type: 'BADGE'  }, // plat@6720(-50), 130px from saw@6620 ✓
      { x: 6950, y: pY(30),  type: 'PHOTO'  }, // plat@6900(-30), 80px from spike@6870 edge ✓

      // ── Level 5: Sekolah — 6 items, most challenging navigation ────────────
      // Ledges (xStart, depth): 7300(-40), 7540(-80), 7780(-120), 8020(-80), 8260(-40), flat@8500(-10)
      // Traps: thorn@7420(ground), spike@7560(plat7540-left), thorn@7700(ground),
      //        thorn@7920(ground), spike@8040(plat8020-left), saw@8180(ground), saw@8390(ground), spike@8500(flat-left)
      { x: 7330, y: pY(40),  type: 'NOTE'   }, // plat@7300(-40), 90px before thorn@7420 ✓
      { x: 7760, y: pY(80),  type: 'BOOK'   }, // plat@7540(-80), RIGHT end, +60px before saw@7700+32=7732 ends ✓
      { x: 7810, y: pY(120), type: 'PHOTO'  }, // highest plat@7780(-120), no trap on it ✓
      { x: 8100, y: pY(80),  type: 'RIBBON' }, // plat@8020(-80), middle (+60 from spike@8040, −80 from saw@8180) ✓
      { x: 8310, y: pY(40),  type: 'BADGE'  }, // plat@8260(-40), 130px before saw@8390 ✓
      { x: 8590, y: pY(10),  type: 'NOTE'   }, // flat@8500(-10), 200px after saw@8390 ✓
    ];

    for (const p of places) {
      this.memories.push(new Memory(p.x, p.y, p.type));
    }
  }

  // ── Checkpoints ───────────────────────────────────────────────────────
  _buildCheckpoints() {
    const G = GROUND_Y;
    const spots = [
      { x: 440,  y: G - 58, id: 1 },  // After first channel
      { x: 1750, y: G - 58, id: 2 },  // End of Sawah
      { x: 3550, y: G - 58, id: 3 },  // End of Desa
      { x: 5380, y: G - 58, id: 4 },  // End of Pedesaan
      { x: 7180, y: G - 58, id: 5 },  // End of Jalan Sekolah
    ];
    for (const s of spots) {
      this.checkpoints.push(new Checkpoint(s.x, s.y, s.id));
    }
  }

  // ── Traps ─────────────────────────────────────────────────────────────────
  //
  //  Difficulty progression:
  //    Level 1 (Sawah)       — 2 traps  — very easy
  //    Level 2 (Desa)        — 4 traps  — easy
  //    Level 3 (Pedesaan)    — 5 traps  — medium
  //    Level 4 (Jalan)       — 6 traps  — harder
  //    Level 5 (Sekolah)     — 8 traps  — most challenging
  //
  //  Memory x-coords listed for conflict check:
  //    L1: 220, 530, 820, 1120, 1420, 1680
  //    L2: 1930, 2070, 2420, 2630, 3020, 3220
  //    L3: 3730, 4130, 4290, 4510, 4840, 5190
  //    L4: 5520, 5820, 6200, 6540, 6730, 6930
  //    L5: 7330, 7580, 7800, 8050, 8300, 8580
  //
  _buildTraps() {
    const G  = GROUND_Y;
    const SH = 24;   // spike height
    const TH = 36;   // thorn height
    const SW = 32;   // saw size

    // ====== LEVEL 1: SAWAH — 2 traps, very generous spacing ======
    // Thorns on dirt mound — items @ 220, 530, 820 are all clear
    this.traps.push(new Trap(460,  G - 28 - TH, 36, TH, 'thorn'));  // mound@430; nearest item=530(+70px right)
    this.traps.push(new Trap(1055, G - 28 - TH, 36, TH, 'thorn'));  // mound@1040; items 820(-235), 1120(+65)

    // ====== LEVEL 2: DESA — 4 traps, easy spacing ======
    // Spike on stone platform — items are on DIFFERENT platforms
    this.traps.push(new Trap(2210, G - 60 - SH, 28, SH, 'spike')); // plat@2200(-60); items 2070(-140px) 2420(+210)
    this.traps.push(new Trap(2550, G - TH,       42, TH, 'thorn')); // ground; items 2420(-130) 2630(+80)
    this.traps.push(new Trap(2860, G - 110 - SH, 28, SH, 'spike')); // plat@2800(-110); items 2630(-230) 3020(+160)
    this.traps.push(new Trap(3250, G - TH,       42, TH, 'thorn')); // ground; items 3220(-30 not on ground) 3220 is on plat

    // ====== LEVEL 3: PEDESAAN — 5 traps, medium difficulty ======
    this.traps.push(new Trap(4000, G - 110 - SW, SW, SW, 'saw'));   // hill@3980(-110); item 3730(-270) 4130(+130)
    this.traps.push(new Trap(4380, G - TH,       36, TH, 'thorn')); // ground; items 4290(-90) 4510(+130)
    this.traps.push(new Trap(4700, G - SH,       28, SH, 'spike')); // ground; items 4510(-190) 4840(+140)
    this.traps.push(new Trap(5000, G - 130 - SW, SW, SW, 'saw'));   // ledge@4980(-130); items 4840(-160) 5190(+190)
    this.traps.push(new Trap(5260, G - TH,       36, TH, 'thorn')); // ground; item 5190(-70 on ledge, clear)

    // ====== LEVEL 4: JALAN SEKOLAH — 6 traps, harder ======
    this.traps.push(new Trap(5715, G - 24 - SH,  28, SH, 'spike')); // ledge@5700(-24); items 5520(-195) 5820(+105)
    this.traps.push(new Trap(5940, G - 48 - SH,  28, SH, 'spike')); // ledge@5900(-48); items 5820(-120) 6200(+260)
    this.traps.push(new Trap(6100, G - SW,        SW, SW, 'saw'));   // ground; items 5820(-280) 6200(+100)
    this.traps.push(new Trap(6340, G - 60 - SH,  28, SH, 'spike')); // ledge@6320(-60); items 6200(-140) 6540(+200)
    this.traps.push(new Trap(6620, G - SW,        SW, SW, 'saw'));   // ground; items 6540(-80) 6730(+110)
    this.traps.push(new Trap(6870, G - 30 - SH,  28, SH, 'spike')); // ledge@6900(-30); items 6730(-140) 6930(+60)

    // ====== LEVEL 5: SEKOLAH — 8 traps, most challenging ======
    this.traps.push(new Trap(7420, G - TH,        36, TH, 'thorn')); // ground; items 7330(-90) 7580(+160)
    this.traps.push(new Trap(7560, G - 80 - SH,  28, SH, 'spike')); // ledge@7540(-80); items 7330(-230) 7580(item is on ledge top, +20 above spike — safe)
    this.traps.push(new Trap(7700, G - SW,        SW, SW, 'saw'));   // ground; items 7580(-120) 7800(plat top, safe)
    this.traps.push(new Trap(7920, G - TH,        36, TH, 'thorn')); // ground; items 7800(-120) 8050(+130)
    this.traps.push(new Trap(8040, G - 80 - SH,  28, SH, 'spike')); // ledge@8020(-80); items 7920 thorn not near, 8050(item on ledge top)
    this.traps.push(new Trap(8180, G - SW,        SW, SW, 'saw'));   // ground; items 8050(-130) 8300(+120)
    this.traps.push(new Trap(8390, G - SW,        SW, SW, 'saw'));   // ground; items 8300(-90) 8580(+190)
    this.traps.push(new Trap(8500, G - 10 - SH,  28, SH, 'spike')); // final flat@8500; items 8300(-200) 8580(+80 — safe, item is further right)
  }
  _buildDecorations() {
    const G = GROUND_Y;

    // Trees — rice field section
    for (let x = 100; x < 1800; x += 200) {
      if (x % 400 === 100) {
        this._treeList.push({ x, y: G, type: 'palm',  size: 1 + Math.random() * 0.4 });
      } else {
        this._treeList.push({ x, y: G, type: 'tree',  size: 1 + Math.random() * 0.4 });
      }
    }

    // Trees — village
    for (let x = 1850; x < 3600; x += 180) {
      this._treeList.push({ x, y: G, type: 'tree', size: 1 + Math.random() * 0.3 });
    }

    // Trees — countryside
    for (let x = 3650; x < 5400; x += 150) {
      const t = Math.random() > 0.5 ? 'tree' : 'bush';
      this._treeList.push({ x, y: G, type: t, size: 1 + Math.random() * 0.5 });
    }

    // Lamp posts — school road
    for (let x = 5450; x < 7200; x += 220) {
      this._decorations.push({ x, y: G, type: 'lamp' });
    }
    // School road trees
    for (let x = 5500; x < 7200; x += 240) {
      this._treeList.push({ x, y: G, type: 'schooltree', size: 1 });
    }

    // School buildings
    this._buildingList.push({ x: 7300, y: G - 200, w: 260, h: 200, type: 'building' });
    this._buildingList.push({ x: 7620, y: G - 180, w: 240, h: 180, type: 'building' });
    this._buildingList.push({ x: 8500, y: G - 240, w: 300, h: 240, type: 'gate' });

    // Signs
    this._decorations.push({ x: 5430, y: G - 60, type: 'sign', text: 'SEKOLAH' });
    this._decorations.push({ x: 7260, y: G - 60, type: 'sign', text: 'SMAN FAMOUSDA' });

    // Flag pole
    this._decorations.push({ x: 7750, y: G - 200, type: 'flagpole' });

    // Graduation ribbons / banners near school
    for (let x = 8200; x < 8500; x += 80) {
      this._decorations.push({ x, y: G - 180, type: 'banner' });
    }
  }

  _buildClouds() {
    for (let i = 0; i < 40; i++) {
      this._clouds.push({
        x: Math.random() * WORLD_W,
        y: 30 + Math.random() * 130,
        w: 80 + Math.random() * 120,
        speed: 8 + Math.random() * 12,
        alpha: 0.6 + Math.random() * 0.4,
      });
    }
  }

  _buildBirds() {
    for (let i = 0; i < 20; i++) {
      this._birds.push({
        x: Math.random() * WORLD_W,
        y: 50 + Math.random() * 120,
        speed: 20 + Math.random() * 30,
        flapTimer: Math.random() * Math.PI * 2,
        flapSpeed: 4 + Math.random() * 3,
        wing: 0,
      });
    }
  }

  // ── Update ────────────────────────────────────────────────────────────
  update(dt, playerX, playerY) {
    // Cloud drift
    for (const c of this._clouds) {
      c.x += c.speed * dt;
      if (c.x > WORLD_W + 200) c.x = -200;
    }
    // Bird flap & move
    for (const b of this._birds) {
      b.x += b.speed * dt;
      b.flapTimer += b.flapSpeed * dt;
      b.wing = Math.sin(b.flapTimer);
      if (b.x > WORLD_W + 100) b.x = -100;
    }
    // NPCs
    for (const npc of this.npcs) npc.update(playerX, dt);
    // Memories
    for (const m of this.memories) m.update(dt);
    // Checkpoints
    for (const cp of this.checkpoints) cp.update(dt);
    // Traps
    for (const t of this.traps) t.update(dt);
  }

  // ── Draw ──────────────────────────────────────────────────────────────
  drawBackground(ctx, camX, camY, canvasW, canvasH) {
    const section = this._getSectionAt(camX + canvasW / 2);

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvasH * 0.7);
    grad.addColorStop(0, section.skyTop);
    grad.addColorStop(1, section.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Sun
    const sunX = canvasW * 0.82;
    const sunY = canvasH * 0.12;
    ctx.save();
    ctx.fillStyle = '#FFF0A0';
    ctx.shadowColor = '#FFDD00';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Clouds (parallax layer 1 — far, slow)
    ctx.save();
    ctx.translate(-camX * 0.2, 0);
    for (const c of this._clouds) {
      this._drawCloud(ctx, c.x, c.y, c.w, c.alpha);
    }
    ctx.restore();

    // Birds (parallax layer 2)
    ctx.save();
    ctx.translate(-camX * 0.35, 0);
    for (const b of this._birds) {
      this._drawBird(ctx, b.x, b.y, b.wing);
    }
    ctx.restore();

    // Mountains / hills far bg (parallax layer 3)
    ctx.save();
    ctx.translate(-camX * 0.15, 0);
    this._drawMountains(ctx, canvasW, canvasH);
    ctx.restore();

    // Mid-ground hills (parallax layer 4)
    ctx.save();
    ctx.translate(-camX * 0.4, 0);
    this._drawMidHills(ctx, canvasW, canvasH);
    ctx.restore();
  }

  drawWorld(ctx, camX, camY) {
    // Trees (behind platforms)
    for (const t of this._treeList) {
      const sx = t.x - camX;
      const sy = t.y - camY;
      if (sx > -100 && sx < 900) this._drawTree(ctx, sx, sy, t.type, t.size || 1);
    }

    // Buildings
    for (const b of this._buildingList) {
      const sx = b.x - camX;
      const sy = b.y - camY;
      if (sx > -350 && sx < 1200) {
        if (b.type === 'gate') this._drawSchoolGate(ctx, sx, sy, b.w, b.h);
        else this._drawBuilding(ctx, sx, sy, b.w, b.h);
      }
    }

    // Decorations
    for (const d of this._decorations) {
      const sx = d.x - camX;
      const sy = d.y - camY;
      if (sx > -80 && sx < 900) this._drawDecoration(ctx, sx, sy, d);
    }

    // Draw platforms
    for (const p of this.platforms) {
      const sx = p.x - camX;
      if (sx > -200 && sx < 1100) {
        this._drawPlatformVisual(ctx, p, camX, camY);
      }
    }

    // Rice plants (section 1)
    for (let rx = 50; rx < 1750; rx += 24) {
      const sx = rx - camX;
      if (sx > -30 && sx < 900) {
        const sy = GROUND_Y - camY;
        this._drawRicePlant(ctx, sx, sy - 28);
      }
    }
  }

  drawEntities(ctx, camX, camY) {
    // Checkpoints
    for (const cp of this.checkpoints) {
      const sx = cp.x - camX;
      if (sx > -60 && sx < 900) {
        ctx.save();
        ctx.translate(-camX, -camY);
        cp.draw(ctx);
        ctx.restore();
      }
    }

    // Memories
    for (const m of this.memories) {
      const sx = m.x - camX;
      if (sx > -40 && sx < 900) {
        ctx.save();
        ctx.translate(-camX, -camY);
        m.draw(ctx);
        ctx.restore();
      }
    }

    // NPCs
    for (const npc of this.npcs) {
      const sx = npc.x - camX;
      if (sx > -80 && sx < 900) {
        ctx.save();
        ctx.translate(-camX, -camY);
        npc.draw(ctx);
        ctx.restore();
      }
    }

    // Traps — drawn on top of platforms, below player
    for (const t of this.traps) {
      const sx = t.x - camX;
      if (sx > -80 && sx < 900) {
        ctx.save();
        ctx.translate(-camX, -camY);
        t.draw(ctx);
        ctx.restore();
      }
    }
  }

  // ── Getters ───────────────────────────────────────────────────────────
  _getSectionAt(worldX) {
    for (const s of SECTIONS) {
      if (worldX >= s.xStart && worldX < s.xEnd) return s;
    }
    return SECTIONS[SECTIONS.length - 1];
  }

  getCurrentSectionName(worldX) {
    return this._getSectionAt(worldX).name;
  }

  // ── Visual helpers ───────────────────────────────────────────────────

  _drawPlatformVisual(ctx, plat, camX, camY) {
    const sx = plat.x - camX;
    const sy = plat.y - camY;
    if (plat.type === 'death') {
      this._drawWaterSurface(ctx, sx, sy, plat.w, plat.h);
      return;
    }
    if (plat.tag === 'invis') return;

    // Use the platform drawing module logic inline for speed
    const p = plat;
    const tag = p.tag;

    ctx.save();
    if (tag === 'grass') {
      ctx.fillStyle = '#8B6340'; ctx.fillRect(sx, sy + 6, plat.w, plat.h);
      ctx.fillStyle = '#5A8C3A'; ctx.fillRect(sx, sy, plat.w, 8);
      ctx.fillStyle = '#7EC850'; ctx.fillRect(sx, sy, plat.w, 3);
      ctx.fillStyle = '#7EC850';
      for (let tx = sx + 4; tx < sx + plat.w - 4; tx += 8) {
        ctx.fillRect(tx, sy - 2, 2, 3);
        ctx.fillRect(tx + 3, sy - 1, 1, 2);
      }
      ctx.fillStyle = '#7A5430';
      for (let ty = sy + 14; ty < sy + plat.h; ty += 8) {
        for (let tx = sx + 4; tx < sx + plat.w; tx += 12) ctx.fillRect(tx, ty, 4, 1);
      }
    } else if (tag === 'dirt') {
      ctx.fillStyle = '#9B7550'; ctx.fillRect(sx, sy, plat.w, plat.h);
      ctx.fillStyle = '#7A5A30';
      for (let ty = sy + 4; ty < sy + plat.h; ty += 7)
        for (let tx = sx + 3; tx < sx + plat.w; tx += 10) ctx.fillRect(tx, ty, 5, 2);
      ctx.fillStyle = '#B8926A'; ctx.fillRect(sx, sy, plat.w, 2);
    } else if (tag === 'stone') {
      ctx.fillStyle = '#7A8A96'; ctx.fillRect(sx, sy, plat.w, plat.h);
      ctx.fillStyle = '#909EAA'; ctx.fillRect(sx, sy, plat.w, 3);
      ctx.fillStyle = '#5A6872';
      const bw = 32, bh = 16;
      for (let ty = sy; ty < sy + plat.h; ty += bh) {
        const off = ((ty - sy) / bh % 2 === 0) ? 0 : bw / 2;
        for (let tx = sx - off; tx < sx + plat.w; tx += bw) ctx.fillRect(Math.max(tx, sx), ty, 1, bh);
        ctx.fillRect(sx, ty, plat.w, 1);
      }
    } else if (tag === 'wood') {
      ctx.fillStyle = '#A06030'; ctx.fillRect(sx, sy, plat.w, plat.h);
      ctx.fillStyle = '#8A5020';
      for (let tx = sx + 4; tx < sx + plat.w; tx += 6) ctx.fillRect(tx, sy, 1, plat.h);
      ctx.fillStyle = '#C08040'; ctx.fillRect(sx, sy, plat.w, 2);
    } else if (tag === 'road') {
      ctx.fillStyle = '#505060'; ctx.fillRect(sx, sy, plat.w, plat.h);
      ctx.fillStyle = '#888898'; ctx.fillRect(sx, sy, plat.w, 5);
      ctx.fillStyle = '#404050';
      for (let tx = sx; tx < sx + plat.w; tx += 20) ctx.fillRect(tx, sy + plat.h / 2 - 1, 10, 2);
    } else if (tag === 'school') {
      ctx.fillStyle = '#C8C0A8'; ctx.fillRect(sx, sy, plat.w, plat.h);
      ctx.fillStyle = '#B8B098';
      for (let ty = sy; ty < sy + plat.h; ty += 24)
        for (let tx = sx; tx < sx + plat.w; tx += 24) {
          ctx.fillRect(tx, ty, plat.w, 1);
          ctx.fillRect(tx, ty, 1, plat.h);
        }
      ctx.fillStyle = '#D8D0B8'; ctx.fillRect(sx, sy, plat.w, 2);
    }
    ctx.restore();
  }

  _drawWaterSurface(ctx, x, y, w, h) {
    ctx.fillStyle = '#1A4A88'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#2A6AAA'; ctx.fillRect(x, y, w, 8);
    const t = Date.now() / 800;
    ctx.fillStyle = '#4A8ACC';
    for (let tx = x; tx < x + w; tx += 16) {
      ctx.fillRect(tx + Math.sin(t + tx) * 4, y + 4, 8, 2);
    }
  }

  _drawCloud(ctx, x, y, w, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(x - w / 4, y + 6, w / 3.5, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w / 3.5, y + 4, w / 3, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawBird(ctx, x, y, wing) {
    ctx.save();
    ctx.strokeStyle = '#334455';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 8, y + wing * 4, x - 14, y + 2);
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 8, y + wing * 4, x + 14, y + 2);
    ctx.stroke();
    ctx.restore();
  }

  _drawMountains(ctx, cw, ch) {
    const base = ch * 0.68;
    ctx.fillStyle = '#7090A8';
    ctx.beginPath();
    ctx.moveTo(0, base);
    for (let x = 0; x < cw + 160; x += 160) {
      ctx.lineTo(x + 80, base - 100 - Math.sin(x * 0.009) * 50);
      ctx.lineTo(x + 160, base);
    }
    ctx.lineTo(cw + 200, ch);
    ctx.lineTo(0, ch);
    ctx.closePath();
    ctx.fill();
    // Snow peaks
    ctx.fillStyle = '#D8E8F0';
    for (let x = 0; x < cw + 160; x += 160) {
      const peak = base - 100 - Math.sin(x * 0.009) * 50;
      ctx.beginPath();
      ctx.moveTo(x + 80, peak);
      ctx.lineTo(x + 60, peak + 24);
      ctx.lineTo(x + 100, peak + 24);
      ctx.closePath();
      ctx.fill();
    }
  }

  _drawMidHills(ctx, cw, ch) {
    const base = ch * 0.76;
    ctx.fillStyle = '#6A9060';
    ctx.beginPath();
    ctx.moveTo(0, base);
    for (let x = 0; x < cw + 220; x += 220) {
      ctx.quadraticCurveTo(x + 110, base - 60, x + 220, base);
    }
    ctx.lineTo(cw + 250, ch);
    ctx.lineTo(0, ch);
    ctx.closePath();
    ctx.fill();
  }

  _drawTree(ctx, x, y, type, size = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);

    if (type === 'palm') {
      // Trunk
      ctx.fillStyle = '#A06830';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(-4 + i * 0.6, -70 + i * 14, 8 - i * 0.4, 15);
      }
      // Leaves
      const leafColor = '#3A8C20';
      ctx.fillStyle = leafColor;
      ctx.save();
      ctx.translate(0, -72);
      for (let a = 0; a < 6; a++) {
        ctx.save();
        ctx.rotate((a / 6) * Math.PI * 2);
        ctx.fillStyle = a % 2 === 0 ? '#4AAC30' : '#3A8C20';
        ctx.beginPath();
        ctx.ellipse(18, 0, 22, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    } else if (type === 'bush') {
      // Bush
      ctx.fillStyle = '#4A7A20';
      ctx.beginPath();
      ctx.ellipse(0, -10, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5A9030';
      ctx.beginPath();
      ctx.ellipse(-10, -8, 14, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(10, -8, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'schooltree') {
      // Trimmed school tree
      ctx.fillStyle = '#6A5020'; ctx.fillRect(-5, -50, 10, 50);
      ctx.fillStyle = '#3A7020';
      ctx.beginPath();
      ctx.ellipse(0, -55, 18, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4A8A30';
      ctx.beginPath();
      ctx.ellipse(0, -58, 14, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Generic tree
      ctx.fillStyle = '#7A5030'; ctx.fillRect(-5, -70, 10, 70);
      // Trunk texture
      ctx.fillStyle = '#6A4020';
      ctx.fillRect(-5, -40, 2, 40);
      ctx.fillRect(3, -55, 2, 55);
      // Foliage (3 layers)
      ctx.fillStyle = '#2A7010';
      ctx.beginPath();
      ctx.moveTo(0, -110); ctx.lineTo(-28, -60); ctx.lineTo(28, -60); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3A8820';
      ctx.beginPath();
      ctx.moveTo(0, -90); ctx.lineTo(-24, -48); ctx.lineTo(24, -48); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4A9830';
      ctx.beginPath();
      ctx.moveTo(0, -72); ctx.lineTo(-18, -38); ctx.lineTo(18, -38); ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _drawBuilding(ctx, x, y, w, h) {
    // Wall
    ctx.fillStyle = '#E8D8B8';
    ctx.fillRect(x, y, w, h);
    // Roof
    ctx.fillStyle = '#B84040';
    ctx.fillRect(x - 6, y - 16, w + 12, 20);
    // Windows
    ctx.fillStyle = '#A8C8E8';
    for (let wx = x + 16; wx < x + w - 16; wx += 36) {
      ctx.fillRect(wx, y + 20, 20, 24);
      ctx.strokeStyle = '#4A6A88';
      ctx.lineWidth = 1;
      ctx.strokeRect(wx, y + 20, 20, 24);
      ctx.fillStyle = '#6A9AB8';
      ctx.fillRect(wx + 10, y + 20, 1, 24);
      ctx.fillRect(wx, y + 32, 20, 1);
      ctx.fillStyle = '#A8C8E8';
    }
    // Door
    ctx.fillStyle = '#8A5020';
    ctx.fillRect(x + w / 2 - 12, y + h - 36, 24, 36);
    ctx.fillStyle = '#C8A060';
    ctx.fillRect(x + w / 2 + 4, y + h - 20, 3, 5);
    // Outline
    ctx.strokeStyle = '#888070';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  _drawSchoolGate(ctx, x, y, w, h) {
    const pillarW = 30;
    const gateH = h * 0.85;
    const archH = 30;

    // Left pillar
    ctx.fillStyle = '#E8E0C8';
    ctx.fillRect(x, y, pillarW, h);
    // Right pillar
    ctx.fillRect(x + w - pillarW, y, pillarW, h);

    // Arch top
    ctx.fillStyle = '#C8A020';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + archH, w / 2 - pillarW + 10, Math.PI, 0);
    ctx.fill();

    // Gate text backdrop
    ctx.fillStyle = '#1A2A6A';
    ctx.fillRect(x + pillarW, y - 10, w - pillarW * 2, 40);

    // Gate text
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SMAN FAMOUSDA', x + w / 2, y + 15);

    // Gate bars
    ctx.fillStyle = '#3A3A5A';
    const barCount = 8;
    const barSpacing = (w - pillarW * 2) / barCount;
    for (let i = 0; i < barCount; i++) {
      const bx = x + pillarW + i * barSpacing + barSpacing / 2 - 3;
      ctx.fillRect(bx, y + 40, 6, gateH - 40);
      // Spear tip
      ctx.fillStyle = '#C8A020';
      ctx.beginPath();
      ctx.moveTo(bx + 3, y + 40);
      ctx.lineTo(bx, y + 55);
      ctx.lineTo(bx + 6, y + 55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3A3A5A';
    }

    // Decorative balls on pillars
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x + pillarW / 2, y - 8, 14, 0, Math.PI * 2);
    ctx.arc(x + w - pillarW / 2, y - 8, 14, 0, Math.PI * 2);
    ctx.fill();

    // Graduation ribbons
    ctx.fillStyle = '#CC3366';
    for (let rx = x + pillarW; rx < x + w - pillarW; rx += 30) {
      ctx.beginPath();
      ctx.moveTo(rx, y - 10);
      ctx.quadraticCurveTo(rx + 15, y + 4, rx + 30, y - 10);
      ctx.stroke();
    }

    // Outline
    ctx.strokeStyle = '#C8A020';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, pillarW, h);
    ctx.strokeRect(x + w - pillarW, y, pillarW, h);

    // FINISH zone indicator at base
    ctx.fillStyle = '#FFD70044';
    ctx.fillRect(x + pillarW, y + h - 8, w - pillarW * 2, 8);
  }

  _drawDecoration(ctx, x, y, d) {
    switch (d.type) {
      case 'lamp': {
        ctx.fillStyle = '#888898'; ctx.fillRect(x - 2, y - 80, 4, 80);
        ctx.fillStyle = '#AAAAAA'; ctx.fillRect(x - 2, y - 84, 16, 8);
        ctx.fillStyle = '#FFFFCC';
        ctx.shadowColor = '#FFFF88'; ctx.shadowBlur = 12;
        ctx.fillRect(x + 2, y - 82, 8, 5);
        ctx.shadowBlur = 0;
        break;
      }
      case 'sign': {
        ctx.fillStyle = '#8A5020'; ctx.fillRect(x + 10, y - 40, 4, 40);
        ctx.fillStyle = '#F0E8C8'; ctx.fillRect(x, y - 58, 80, 22);
        ctx.strokeStyle = '#8A5020'; ctx.lineWidth = 2; ctx.strokeRect(x, y - 58, 80, 22);
        ctx.fillStyle = '#2A1A0A';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(d.text, x + 40, y - 42);
        break;
      }
      case 'flagpole': {
        ctx.fillStyle = '#AAAAAA'; ctx.fillRect(x, y, 4, 200);
        const t = Date.now() / 600;
        ctx.fillStyle = '#CC0000';
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.quadraticCurveTo(x + 34 + Math.sin(t) * 6, y + 18, x + 44, y + 28 + Math.sin(t) * 4);
        ctx.lineTo(x + 4, y + 36);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('★', x + 24 + Math.sin(t) * 3, y + 20);
        break;
      }
      case 'banner': {
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x, y, 6, 60);
        ctx.fillStyle = '#CC3366';
        ctx.fillRect(x, y, 6, 20);
        ctx.fillRect(x, y + 22, 6, 20);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x, y + 44, 6, 16);
        break;
      }
    }
  }

  _drawRicePlant(ctx, x, y) {
    // Simple rice stalk
    ctx.fillStyle = '#7AC850';
    ctx.fillRect(x, y, 1, 12);
    ctx.fillStyle = '#C8E888';
    // Grain clusters
    ctx.fillRect(x - 2, y, 2, 4);
    ctx.fillRect(x + 1, y + 2, 2, 4);
  }
}
