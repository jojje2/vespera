// Complete Interconnected World Map of VESPERA (7 Biomes, 24 Handcrafted Multi-Route Chambers)
// Standard Room Coordinate Space: width = 1600, height = 960.
// Floor baseline is y = 880 (thickness 80). Ceiling is y = 0..50.

export const BIOMES = {
  ruins: {
    id: 'ruins',
    name: 'Sanctum of Ash',
    subtitle: 'Ancient Underground Ruins',
    bgTop: '#0b0d16',
    bgBot: '#151826',
    stoneMain: '#2a2e42',
    stoneTrim: '#474d6b',
    accent: '#f3a847',
    ambientLight: 0.34,
    particleType: 'ash'
  },
  caverns: {
    id: 'caverns',
    name: 'The Spore-Weald',
    subtitle: 'Overgrown Bioluminescent Caverns',
    bgTop: '#071312',
    bgBot: '#0f2421',
    stoneMain: '#1d3630',
    stoneTrim: '#396b5c',
    accent: '#56d38a',
    ambientLight: 0.32,
    particleType: 'spores'
  },
  village: {
    id: 'village',
    name: 'Hollowbrook Settlement',
    subtitle: 'The Forgotten Subterranean Village',
    bgTop: '#10121f',
    bgBot: '#1c2033',
    stoneMain: '#32354a',
    stoneTrim: '#635b54',
    accent: '#ffbe6b',
    ambientLight: 0.42,
    particleType: 'embers'
  },
  tunnels: {
    id: 'tunnels',
    name: 'The Drowned Sluice',
    subtitle: 'Flooded Aqueducts & Mossy Tunnels',
    bgTop: '#06111c',
    bgBot: '#0d2236',
    stoneMain: '#1c374f',
    stoneTrim: '#39678c',
    accent: '#5ce1e6',
    ambientLight: 0.30,
    particleType: 'drips'
  },
  crystals: {
    id: 'crystals',
    name: 'The Prism Vaults',
    subtitle: 'Glittering Caverns of Echo-Glass',
    bgTop: '#110921',
    bgBot: '#21133d',
    stoneMain: '#311f54',
    stoneTrim: '#6a47ab',
    accent: '#d27eff',
    ambientLight: 0.35,
    particleType: 'sparkles'
  },
  gardens: {
    id: 'gardens',
    name: 'The Briar Conservatory',
    subtitle: 'Thorny Gardens & Poisonous Canopy',
    bgTop: '#0c170b',
    bgBot: '#182b15',
    stoneMain: '#274022',
    stoneTrim: '#527a43',
    accent: '#8cf065',
    ambientLight: 0.33,
    particleType: 'pollen'
  },
  abyss: {
    id: 'abyss',
    name: 'The Deep Abyss',
    subtitle: 'Obsidian Chasm & Choir Sanctum',
    bgTop: '#040408',
    bgBot: '#0c0814',
    stoneMain: '#1b1626',
    stoneTrim: '#46335c',
    accent: '#e05368',
    ambientLight: 0.24,
    particleType: 'void'
  }
};

// Helper to build standard perimeter walls with doorways on specified sides
function makePerimeter(exits = {}) {
  const walls = [];
  // Floor (with optional bottom shaft opening at x: 700..900)
  if (exits.bottom) {
    walls.push({ x: 0, y: 880, w: 680, h: 80 });
    walls.push({ x: 920, y: 880, w: 680, h: 80 });
  } else {
    walls.push({ x: 0, y: 880, w: 1600, h: 80 });
  }
  // Ceiling (with optional top shaft opening at x: 700..900)
  if (exits.top) {
    walls.push({ x: 0, y: 0, w: 680, h: 48 });
    walls.push({ x: 920, y: 0, w: 680, h: 48 });
  } else {
    walls.push({ x: 0, y: 0, w: 1600, h: 48 });
  }
  // Left wall (opening at y: 680..880 if exits.left)
  if (exits.left) {
    walls.push({ x: 0, y: 0, w: 48, h: 680 });
  } else {
    walls.push({ x: 0, y: 0, w: 48, h: 960 });
  }
  // Right wall (opening at y: 680..880 if exits.right)
  if (exits.right) {
    walls.push({ x: 1552, y: 0, w: 48, h: 680 });
  } else {
    walls.push({ x: 1552, y: 0, w: 48, h: 960 });
  }
  return walls;
}

export const ROOMS = {
  // ==========================================
  // REGION 1: SANCTUM OF ASH (Ancient Ruins)
  // ==========================================
  ruins_sinkhole: {
    id: 'ruins_sinkhole',
    name: 'Watchtower Sinkhole',
    biome: 'ruins',
    atlasPos: { x: 1, y: 1 },
    exits: {
      right: { targetRoom: 'ruins_nave', targetX: 96, targetY: 820 }
    },
    brazier: { x: 310, y: 880, name: 'Sinkhole Brazier' },
    npcs: [{ id: 'orin', x: 1120, y: 880 }],
    items: [
      { id: 'clue_ribbon', x: 580, y: 710, type: 'item' },
      { id: 'lumen_sink_1', x: 920, y: 560, type: 'lumen', amount: 25 }
    ],
    loreTablets: [
      {
        x: 190,
        y: 880,
        title: 'Watchtower Milestone',
        text: 'Below lies the Sunken Kingdom of Vespera. Warden Kaelen: use [A/D] to move, [W/Space] to Jump, [J/Z] to Slash with your Gloom-Cleaver, and [E] to interact with inhabitants, relics, and Soul Braziers.'
      }
    ],
    platforms: [
      ...makePerimeter({ right: true }),
      { x: 480, y: 740, w: 220, h: 24 },
      { x: 820, y: 600, w: 220, h: 24 },
      { x: 1140, y: 720, w: 190, h: 24 }
    ],
    hazards: [
      { type: 'spikes', x: 710, y: 862, w: 110, h: 18 }
    ],
    enemies: [
      { type: 'crawler', x: 900, y: 565, patrol: [830, 1020] }
    ],
    props: [
      { type: 'statue', x: 250, y: 880 },
      { type: 'lantern', x: 310, y: 690 },
      { type: 'chain', x: 540, y: 48, h: 280 },
      { type: 'chain', x: 910, y: 48, h: 220 },
      { type: 'pillar', x: 1050, y: 880, h: 360 },
      { type: 'candles', x: 1160, y: 880 },
      { type: 'broken_cart', x: 430, y: 880 }
    ]
  },

  ruins_nave: {
    id: 'ruins_nave',
    name: 'Pillared Nave of Ash',
    biome: 'ruins',
    atlasPos: { x: 2, y: 1 },
    exits: {
      left: { targetRoom: 'ruins_sinkhole', targetX: 1470, targetY: 820 },
      right: { targetRoom: 'ruins_shrine', targetX: 96, targetY: 820 },
      bottom: { targetRoom: 'caverns_entry', targetX: 800, targetY: 110 },
      top: { targetRoom: 'ruins_vault', targetX: 800, targetY: 810 }
    },
    items: [
      { id: 'lumen_nave_1', x: 340, y: 480, type: 'lumen', amount: 30 }
    ],
    loreTablets: [
      {
        x: 610,
        y: 880,
        title: 'Choir Processional Relief',
        text: 'Three Pale Seals lock the Abyssal Chasm below. The hooded Choir carried the Echo-Weaver southward into the Spore-Weald below this floor shaft.'
      }
    ],
    platforms: [
      ...makePerimeter({ left: true, right: true, bottom: true, top: true }),
      // Stepping platforms around central shaft and upward climb
      { x: 240, y: 740, w: 210, h: 24 },
      { x: 520, y: 630, w: 180, h: 24 },
      { x: 940, y: 740, w: 220, h: 24 },
      { x: 1180, y: 610, w: 200, h: 24 },
      { x: 900, y: 490, w: 210, h: 24 },
      { x: 580, y: 380, w: 240, h: 24 },
      { x: 280, y: 510, w: 190, h: 24 },
      { x: 690, y: 250, w: 220, h: 24 },
      { x: 710, y: 130, w: 180, h: 22, oneWay: true }
    ],
    hazards: [
      { type: 'crumbling', x: 730, y: 630, w: 150, h: 22 },
      { type: 'falling_rock', x: 1020, y: 68 }
    ],
    enemies: [
      { type: 'crawler', x: 320, y: 705, patrol: [250, 430] },
      { type: 'bat', x: 820, y: 430, patrol: [650, 1050] },
      { type: 'sentinel', x: 1260, y: 840, patrol: [1100, 1450] }
    ],
    props: [
      { type: 'pillar', x: 380, y: 880, h: 520 },
      { type: 'pillar', x: 1220, y: 880, h: 520 },
      { type: 'lantern', x: 590, y: 630 },
      { type: 'lantern', x: 1010, y: 740 },
      { type: 'statue', x: 1380, y: 880 },
      { type: 'bones', x: 490, y: 880 }
    ]
  },

  ruins_shrine: {
    id: 'ruins_shrine',
    name: 'The Forgotten Tri-Shrine',
    biome: 'ruins',
    atlasPos: { x: 3, y: 1 },
    exits: {
      left: { targetRoom: 'ruins_nave', targetX: 1470, targetY: 820 },
      right: { targetRoom: 'village_west', targetX: 96, targetY: 820 },
      bottom: { targetRoom: 'ruins_catacomb', targetX: 800, targetY: 110 }
    },
    brazier: { x: 420, y: 880, name: 'Shrine Cloister Brazier' },
    shrineAltar: { x: 800, y: 720 },
    items: [
      { id: 'shrine_rune_1', x: 800, y: 310, type: 'item' }
    ],
    loreTablets: [
      {
        x: 630,
        y: 880,
        title: 'Altar of the Three Verses',
        text: 'Bring the Verse Tablets of Stone, Tides, and Starlight to this altar and press [E] to receive the Ancient Blessing. The East Gate leads to Hollowbrook Village; the lower shaft leads to the Catacomb Shortcut.'
      }
    ],
    platforms: [
      ...makePerimeter({ left: true, right: true, bottom: true }),
      // Chasm before right exit requiring Dash (310px gap with spikes below)
      { x: 660, y: 720, w: 280, h: 26 },
      { x: 430, y: 590, w: 200, h: 24 },
      { x: 690, y: 460, w: 220, h: 24 },
      { x: 710, y: 340, w: 180, h: 24 },
      { x: 960, y: 580, w: 180, h: 24 },
      { x: 1410, y: 600, w: 140, h: 24 }
    ],
    hazards: [
      // Spike pit guarding the eastern village approach (easy to Dash across, or jump from high platform)
      { type: 'spikes', x: 1080, y: 862, w: 290, h: 18 }
    ],
    enemies: [
      { type: 'sentinel', x: 520, y: 840, patrol: [220, 640] },
      { type: 'bat', x: 940, y: 440, patrol: [760, 1180] }
    ],
    props: [
      { type: 'shrine', x: 800, y: 720 },
      { type: 'candles', x: 710, y: 720 },
      { type: 'candles', x: 890, y: 720 },
      { type: 'lantern', x: 420, y: 710 },
      { type: 'chain', x: 800, y: 48, h: 240 }
    ]
  },

  ruins_vault: {
    id: 'ruins_vault',
    name: 'Hall of Relic Vaults',
    biome: 'ruins',
    atlasPos: { x: 2, y: 0 },
    exits: {
      bottom: { targetRoom: 'ruins_nave', targetX: 800, targetY: 120 }
    },
    items: [
      { id: 'lost_relic', x: 1360, y: 320, type: 'item' },
      { id: 'mask_shard_ruins', x: 220, y: 320, type: 'mask_upgrade' }
    ],
    loreTablets: [
      {
        x: 540,
        y: 880,
        title: 'Vault of the First Choir',
        text: 'Only those who time the spiked floors and moving lifts may claim the Chalice of the First Choir in the eastern alcove.'
      }
    ],
    platforms: [
      ...makePerimeter({ bottom: true }),
      { x: 420, y: 750, w: 200, h: 24 },
      { x: 980, y: 750, w: 200, h: 24 },
      { x: 220, y: 620, w: 200, h: 24 },
      { x: 1180, y: 620, w: 200, h: 24 },
      { x: 480, y: 490, w: 240, h: 24 },
      { x: 880, y: 490, w: 240, h: 24 },
      { x: 140, y: 350, w: 220, h: 24 },
      { x: 1240, y: 350, w: 240, h: 24 }
    ],
    movingPlatforms: [
      { x: 680, y: 620, w: 160, h: 22, dx: 180, dy: 0, speed: 1.6 },
      { x: 680, y: 360, w: 160, h: 22, dx: 220, dy: 0, speed: 1.9 }
    ],
    hazards: [
      { type: 'spikes', x: 220, y: 862, w: 240, h: 18 },
      { type: 'spikes', x: 1120, y: 862, w: 240, h: 18 },
      { type: 'falling_rock', x: 600, y: 68 },
      { type: 'falling_rock', x: 1000, y: 68 }
    ],
    enemies: [
      { type: 'sentinel', x: 560, y: 450, patrol: [490, 700] },
      { type: 'sentinel', x: 960, y: 450, patrol: [890, 1100] },
      { type: 'bat', x: 800, y: 260, patrol: [520, 1080] }
    ],
    props: [
      { type: 'statue', x: 1360, y: 350 },
      { type: 'candles', x: 1310, y: 350 },
      { type: 'pillar', x: 300, y: 880, h: 480 },
      { type: 'pillar', x: 1300, y: 880, h: 480 }
    ]
  },

  // ==========================================
  // REGION 2: THE SPORE-WEALD (Overgrown Caverns)
  // ==========================================
  caverns_entry: {
    id: 'caverns_entry',
    name: 'Luminous Root-Shaft',
    biome: 'caverns',
    atlasPos: { x: 2, y: 2 },
    exits: {
      top: { targetRoom: 'ruins_nave', targetX: 800, targetY: 810 },
      left: { targetRoom: 'caverns_grotto', targetX: 1470, targetY: 820 },
      right: { targetRoom: 'caverns_snare', targetX: 96, targetY: 820 },
      bottom: { targetRoom: 'caverns_boss', targetX: 800, targetY: 110 }
    },
    brazier: { x: 520, y: 880, name: 'Spore-Weald Brazier' },
    items: [
      { id: 'clue_tuning_shard', x: 1150, y: 580, type: 'item' }
    ],
    loreTablets: [
      {
        x: 380,
        y: 880,
        title: 'Spore-Walker Signpost',
        text: 'West: Herbalist Myra’s Grotto. East: The Spore-Snare Tunnel & Whispering Rootway. Below: Shrine of the Moth-Step Cloak & First Choir Seal.'
      }
    ],
    platforms: [
      ...makePerimeter({ top: true, left: true, right: true, bottom: true }),
      // Ladder of mossy platforms so player can always climb back up to ruins_nave even without upgrades!
      { x: 460, y: 750, w: 210, h: 24 },
      { x: 930, y: 750, w: 210, h: 24 },
      { x: 670, y: 630, w: 250, h: 24 },
      { x: 1050, y: 610, w: 220, h: 24 },
      { x: 380, y: 510, w: 230, h: 24 },
      { x: 690, y: 390, w: 220, h: 24 },
      { x: 980, y: 280, w: 210, h: 24 },
      { x: 690, y: 170, w: 220, h: 24 }
    ],
    hazards: [],
    enemies: [
      { type: 'sporeling', x: 540, y: 715, patrol: [470, 650] },
      { type: 'sporeling', x: 1020, y: 715, patrol: [940, 1120] },
      { type: 'bat', x: 800, y: 490, patrol: [560, 1040] }
    ],
    props: [
      { type: 'mushroom_giant', x: 260, y: 880 },
      { type: 'mushroom_giant', x: 1320, y: 880 },
      { type: 'vines', x: 420, y: 48, h: 240 },
      { type: 'vines', x: 1180, y: 48, h: 310 },
      { type: 'glow_flowers', x: 600, y: 880 },
      { type: 'glow_flowers', x: 1020, y: 880 }
    ]
  },

  caverns_grotto: {
    id: 'caverns_grotto',
    name: "Myra's Hidden Spore-Grotto",
    biome: 'caverns',
    atlasPos: { x: 1, y: 2 },
    exits: {
      right: { targetRoom: 'caverns_entry', targetX: 96, targetY: 820 }
    },
    npcs: [{ id: 'myra', x: 680, y: 880 }],
    items: [
      { id: 'lumen_grotto_1', x: 280, y: 540, type: 'lumen', amount: 45 }
    ],
    loreTablets: [
      {
        x: 920,
        y: 880,
        title: "Myra's Field Journal",
        text: 'The Starlight Mycelium blooms only in the humid dark at the far end of the eastern Spore-Snare Tunnel. Its cap restores damaged spirit vessels.'
      }
    ],
    platforms: [
      ...makePerimeter({ right: true }),
      { x: 450, y: 740, w: 260, h: 24 },
      { x: 200, y: 580, w: 240, h: 24 },
      { x: 860, y: 660, w: 240, h: 24 }
    ],
    hazards: [],
    enemies: [],
    props: [
      { type: 'hut', x: 580, y: 880 },
      { type: 'mushroom_giant', x: 340, y: 880 },
      { type: 'mushroom_giant', x: 1120, y: 880 },
      { type: 'lantern', x: 680, y: 710 },
      { type: 'candles', x: 520, y: 740 },
      { type: 'glow_flowers', x: 820, y: 880 },
      { type: 'vines', x: 300, y: 48, h: 260 }
    ]
  },

  caverns_snare: {
    id: 'caverns_snare',
    name: 'Spore-Snare Tunnel',
    biome: 'caverns',
    atlasPos: { x: 3, y: 2 },
    exits: {
      left: { targetRoom: 'caverns_entry', targetX: 1470, targetY: 820 },
      right: { targetRoom: 'caverns_secret_house', targetX: 96, targetY: 820 }
    },
    secretWalls: [
      { id: 'sec_wall_house', x: 1510, y: 660, w: 42, h: 220, hint: 'Vine-draped cracked masonry hides a warm hearth beyond...' }
    ],
    items: [
      { id: 'rare_mushroom', x: 1340, y: 420, type: 'item' },
      { id: 'lumen_snare_1', x: 780, y: 360, type: 'lumen', amount: 40 }
    ],
    platforms: [
      ...makePerimeter({ left: true, right: true }),
      { x: 260, y: 740, w: 200, h: 24 },
      { x: 560, y: 640, w: 200, h: 24 },
      { x: 860, y: 540, w: 200, h: 24 },
      { x: 1180, y: 450, w: 260, h: 24 },
      { x: 680, y: 390, w: 200, h: 24 }
    ],
    hazards: [
      { type: 'crumbling', x: 480, y: 740, w: 120, h: 20 },
      { type: 'spikes', x: 520, y: 862, w: 260, h: 18 },
      { type: 'poison_plant', x: 960, y: 880 },
      { type: 'poison_plant', x: 1180, y: 880 }
    ],
    enemies: [
      { type: 'sporeling', x: 620, y: 605, patrol: [570, 740] },
      { type: 'thumper', x: 920, y: 500, patrol: [870, 1040] },
      { type: 'bat', x: 1120, y: 340, patrol: [860, 1380] }
    ],
    props: [
      { type: 'mushroom_giant', x: 1340, y: 450 },
      { type: 'vines', x: 1500, y: 540, h: 340 },
      { type: 'glow_flowers', x: 330, y: 880 },
      { type: 'bones', x: 840, y: 880 }
    ]
  },

  caverns_secret_house: {
    id: 'caverns_secret_house',
    name: "Eamon's Concealed Root-Cabin",
    biome: 'caverns',
    atlasPos: { x: 4, y: 2 },
    exits: {
      left: { targetRoom: 'caverns_snare', targetX: 1450, targetY: 820 }
    },
    brazier: { x: 480, y: 880, name: 'Secret Hearth Brazier' },
    npcs: [{ id: 'eamon', x: 880, y: 880 }],
    items: [
      { id: 'lumen_house_1', x: 1220, y: 690, type: 'lumen', amount: 80 }
    ],
    loreTablets: [
      {
        x: 680,
        y: 880,
        title: "Smith Eamon's Anvil Ledger",
        text: 'I forged the Choir Seals under duress before fleeing into this hidden root-cavern. May my star-iron temper help a true Warden shatter what I built.'
      }
    ],
    platforms: [
      ...makePerimeter({ left: true }),
      { x: 1100, y: 720, w: 260, h: 24 }
    ],
    hazards: [],
    enemies: [],
    props: [
      { type: 'hut', x: 840, y: 880 },
      { type: 'lantern', x: 760, y: 700 },
      { type: 'lantern', x: 980, y: 700 },
      { type: 'candles', x: 1180, y: 720 },
      { type: 'statue', x: 1320, y: 880 },
      { type: 'glow_flowers', x: 350, y: 880 }
    ]
  },

  caverns_boss: {
    id: 'caverns_boss',
    name: 'Den of the Brood-Stalker',
    biome: 'caverns',
    atlasPos: { x: 2, y: 3 },
    exits: {
      top: { targetRoom: 'caverns_entry', targetX: 800, targetY: 810 },
      right: { targetRoom: 'tunnels_west', targetX: 96, targetY: 820 }
    },
    boss: {
      id: 'boss_brood_stalker',
      name: 'THE BROOD-STALKER',
      subtitle: 'Matriarch of the Spore-Weald',
      type: 'boss_stalker',
      x: 1050,
      y: 820,
      hp: 160
    },
    items: [
      { id: 'ability_dash', x: 1240, y: 840, type: 'ability', ability: 'dash' },
      { id: 'seal_caverns', x: 1380, y: 840, type: 'item' }
    ],
    loreTablets: [
      {
        x: 260,
        y: 880,
        title: 'Pedestal of the Moth-Step',
        text: 'Claim the Moth-Step Cloak to Dash [Shift / K] across wide chasms and evade charging beasts, and take the First Choir Seal.'
      }
    ],
    platforms: [
      ...makePerimeter({ top: true, right: true }),
      // Climb-out ladder back to caverns_entry
      { x: 560, y: 750, w: 200, h: 24 },
      { x: 840, y: 630, w: 200, h: 24 },
      { x: 560, y: 500, w: 200, h: 24 },
      { x: 840, y: 370, w: 200, h: 24 },
      { x: 680, y: 240, w: 240, h: 24 },
      { x: 700, y: 125, w: 200, h: 22, oneWay: true }
    ],
    hazards: [],
    enemies: [],
    props: [
      { type: 'shrine', x: 1240, y: 880 },
      { type: 'mushroom_giant', x: 200, y: 880 },
      { type: 'mushroom_giant', x: 1420, y: 880 },
      { type: 'bones', x: 940, y: 880 },
      { type: 'lantern', x: 1240, y: 700 }
    ]
  },

  // ==========================================
  // REGION 3: HOLLOWBROOK SETTLEMENT (Village)
  // ==========================================
  village_west: {
    id: 'village_west',
    name: 'Hollowbrook Lantern Square',
    biome: 'village',
    atlasPos: { x: 4, y: 1 },
    exits: {
      left: { targetRoom: 'ruins_shrine', targetX: 1470, targetY: 820 },
      right: { targetRoom: 'village_bridge', targetX: 96, targetY: 820 },
      bottom: { targetRoom: 'village_cellar', targetX: 800, targetY: 110 },
      top: { targetRoom: 'village_watchtower', targetX: 800, targetY: 810 }
    },
    brazier: { x: 440, y: 880, name: 'Hollowbrook Square Brazier' },
    npcs: [
      { id: 'sera', x: 760, y: 660 }
    ],
    items: [
      { id: 'clue_ledger', x: 1220, y: 660, type: 'item' }
    ],
    loreTablets: [
      {
        x: 280,
        y: 880,
        title: 'Hollowbrook Town Charter',
        text: 'Above the cobbles stand our cartography loft, old belfry, and watch-houses; below the iron grate lies Vane’s Curio Cellar and the Sluice Drain.'
      }
    ],
    platforms: [
      ...makePerimeter({ left: true, right: true, bottom: true, top: true }),
      // Village rooftops and loft balconies + climb to belfry
      { x: 620, y: 660, w: 320, h: 24 },
      { x: 1080, y: 660, w: 300, h: 24 },
      { x: 420, y: 760, w: 160, h: 22 },
      { x: 480, y: 510, w: 200, h: 22 },
      { x: 700, y: 370, w: 200, h: 22 },
      { x: 700, y: 220, w: 200, h: 22 },
      { x: 700, y: 115, w: 200, h: 20, oneWay: true }
    ],
    hazards: [],
    enemies: [],
    props: [
      { type: 'house', x: 640, y: 880 },
      { type: 'house', x: 1100, y: 880 },
      { type: 'lantern_post', x: 350, y: 880 },
      { type: 'lantern_post', x: 540, y: 880 },
      { type: 'lantern_post', x: 980, y: 880 },
      { type: 'broken_cart', x: 1400, y: 880 }
    ]
  },

  village_cellar: {
    id: 'village_cellar',
    name: "Vane's Concealed Cellar Emporium",
    biome: 'village',
    atlasPos: { x: 4, y: 2.3 },
    exits: {
      top: { targetRoom: 'village_west', targetX: 800, targetY: 810 },
      bottom: { targetRoom: 'tunnels_east', targetX: 800, targetY: 110 }
    },
    npcs: [
      { id: 'vane', x: 420, y: 880 }
    ],
    items: [
      { id: 'lumen_cellar_1', x: 1260, y: 700, type: 'lumen', amount: 55 }
    ],
    loreTablets: [
      {
        x: 1060,
        y: 880,
        title: 'Sluice Drainage Hatch',
        text: 'This lower sluice shaft connects Hollowbrook directly to the Flooded Tunnels below.'
      }
    ],
    platforms: [
      ...makePerimeter({ top: true, bottom: true }),
      { x: 540, y: 750, w: 200, h: 24 },
      { x: 860, y: 630, w: 200, h: 24 },
      { x: 560, y: 500, w: 200, h: 24 },
      { x: 840, y: 370, w: 200, h: 24 },
      { x: 680, y: 240, w: 240, h: 24 },
      { x: 700, y: 125, w: 200, h: 22, oneWay: true },
      { x: 1160, y: 730, w: 220, h: 24 }
    ],
    hazards: [],
    enemies: [],
    props: [
      { type: 'hut', x: 340, y: 880 },
      { type: 'lantern', x: 420, y: 710 },
      { type: 'candles', x: 520, y: 880 },
      { type: 'statue', x: 1260, y: 880 }
    ]
  },

  village_bridge: {
    id: 'village_bridge',
    name: 'The Severed Chasm Bridge',
    biome: 'village',
    atlasPos: { x: 5, y: 1 },
    exits: {
      left: { targetRoom: 'village_west', targetX: 1470, targetY: 820 },
      right: { targetRoom: 'crystals_entry', targetX: 96, targetY: 820 }
    },
    npcs: [
      { id: 'bram', x: 440, y: 880 }
    ],
    bridgeGap: {
      x: 560,
      y: 860,
      w: 580,
      h: 28
    },
    loreTablets: [
      {
        x: 260,
        y: 880,
        title: 'Chasm Winch Mechanism',
        text: 'Speak with Bram the Tinker to repair this bridge using a Dwarven Iron Winch-Gear from the Crystal Depths, or cross using advanced aerial mastery (Double Jump + Dash).'
      }
    ],
    platforms: [
      // Custom floor with central bridge chasm (always safe: high platforms + safety nets prevent any softlock)
      { x: 0, y: 880, w: 580, h: 80 },
      { x: 1120, y: 880, w: 480, h: 80 },
      { x: 580, y: 920, w: 540, h: 40 },
      { x: 0, y: 0, w: 1600, h: 48 },
      { x: 0, y: 0, w: 48, h: 680 },
      { x: 1552, y: 0, w: 48, h: 680 },
      // Escape steps from lower chasm floor so falling in is never a trap
      { x: 580, y: 830, w: 110, h: 20 },
      { x: 1010, y: 830, w: 110, h: 20 },
      // High rafters reachable only with Double Jump + Dash (or just walk across once Bram repairs bridge!)
      { x: 480, y: 600, w: 150, h: 22 },
      { x: 810, y: 470, w: 140, h: 22 },
      { x: 1100, y: 600, w: 150, h: 22 }
    ],
    hazards: [
      { type: 'spikes', x: 710, y: 902, w: 280, h: 18 }
    ],
    enemies: [
      { type: 'bat', x: 840, y: 560, patrol: [620, 1080] }
    ],
    props: [
      { type: 'lantern_post', x: 520, y: 880 },
      { type: 'lantern_post', x: 1160, y: 880 },
      { type: 'chain', x: 580, y: 48, h: 820 },
      { type: 'chain', x: 1120, y: 48, h: 820 }
    ]
  },

  // ==========================================
  // REGION 4: THE DROWNED SLUICE (Flooded Tunnels)
  // ==========================================
  tunnels_west: {
    id: 'tunnels_west',
    name: 'Submerged Aqueduct',
    biome: 'tunnels',
    atlasPos: { x: 3, y: 3 },
    exits: {
      left: { targetRoom: 'caverns_boss', targetX: 1470, targetY: 820 },
      right: { targetRoom: 'tunnels_east', targetX: 96, targetY: 820 },
      bottom: { targetRoom: 'tunnels_reliquary', targetX: 800, targetY: 110 },
      top: { targetRoom: 'ruins_catacomb', targetX: 800, targetY: 810 }
    },
    brazier: { x: 260, y: 880, name: 'Aqueduct Sluice Brazier' },
    items: [
      { id: 'clue_journal', x: 820, y: 520, type: 'item' },
      { id: 'plant_glowmoss', x: 1320, y: 620, type: 'item' }
    ],
    waterPools: [
      { x: 380, y: 855, w: 300, h: 35 },
      { x: 940, y: 855, w: 340, h: 35 }
    ],
    platforms: [
      ...makePerimeter({ left: true, right: true, bottom: true, top: true }),
      { x: 420, y: 740, w: 220, h: 24, slippery: true },
      { x: 700, y: 640, w: 220, h: 24 },
      { x: 740, y: 550, w: 160, h: 22 },
      { x: 540, y: 420, w: 200, h: 22 },
      { x: 820, y: 300, w: 200, h: 22 },
      { x: 700, y: 180, w: 200, h: 22 },
      { x: 700, y: 115, w: 200, h: 20, oneWay: true },
      { x: 1020, y: 730, w: 220, h: 24, slippery: true },
      { x: 1240, y: 650, w: 200, h: 24 }
    ],
    hazards: [
      { type: 'falling_rock', x: 550, y: 68 },
      { type: 'falling_rock', x: 1100, y: 68 }
    ],
    enemies: [
      { type: 'lurker', x: 500, y: 840, patrol: [390, 660] },
      { type: 'lurker', x: 1080, y: 840, patrol: [960, 1250] }
    ],
    props: [
      { type: 'pillar', x: 350, y: 880, h: 420 },
      { type: 'pillar', x: 1280, y: 880, h: 420 },
      { type: 'vines', x: 640, y: 48, h: 220 },
      { type: 'lantern', x: 260, y: 700 }
    ]
  },

  tunnels_reliquary: {
    id: 'tunnels_reliquary',
    name: 'Sunken Reliquary of Talons',
    biome: 'tunnels',
    atlasPos: { x: 3, y: 4 },
    exits: {
      top: { targetRoom: 'tunnels_west', targetX: 800, targetY: 810 }
    },
    npcs: [
      { id: 'caspian', x: 380, y: 880 }
    ],
    items: [
      { id: 'ability_wall', x: 1240, y: 840, type: 'ability', ability: 'wallJump' },
      { id: 'shrine_rune_2', x: 240, y: 380, type: 'item' }
    ],
    loreTablets: [
      {
        x: 1040,
        y: 880,
        title: 'Reliquary of the Mantis',
        text: 'With the Mantis Talons equipped, jump against any vertical stone wall and press [Jump] to Wall-Jump upward through vertical shafts!'
      }
    ],
    platforms: [
      ...makePerimeter({ top: true }),
      // Both stepping ledges AND vertical walls to practice Wall-Jump!
      { x: 580, y: 750, w: 180, h: 24 },
      { x: 840, y: 630, w: 180, h: 24 },
      { x: 580, y: 500, w: 180, h: 24 },
      { x: 840, y: 370, w: 180, h: 24 },
      { x: 680, y: 240, w: 240, h: 24 },
      { x: 700, y: 125, w: 200, h: 22, oneWay: true },
      // West alcove with Verse Tablet of Tides
      { x: 160, y: 410, w: 220, h: 24 },
      { x: 380, y: 560, w: 160, h: 24 }
    ],
    hazards: [
      { type: 'spikes', x: 580, y: 862, w: 220, h: 18 }
    ],
    enemies: [
      { type: 'lurker', x: 960, y: 840, patrol: [840, 1140] }
    ],
    props: [
      { type: 'shrine', x: 1240, y: 880 },
      { type: 'lantern', x: 380, y: 710 },
      { type: 'statue', x: 240, y: 410 },
      { type: 'candles', x: 1180, y: 880 }
    ]
  },

  tunnels_east: {
    id: 'tunnels_east',
    name: 'The Great Waterwheel Shaft',
    biome: 'tunnels',
    atlasPos: { x: 4, y: 3 },
    exits: {
      left: { targetRoom: 'tunnels_west', targetX: 1470, targetY: 820 },
      top: { targetRoom: 'village_cellar', targetX: 800, targetY: 810 },
      right: { targetRoom: 'crystals_lower', targetX: 96, targetY: 820 },
      bottom: { targetRoom: 'gardens_entry', targetX: 800, targetY: 110 }
    },
    waterPools: [
      { x: 220, y: 855, w: 420, h: 35 }
    ],
    items: [
      { id: 'lumen_wheel_1', x: 1180, y: 440, type: 'lumen', amount: 50 }
    ],
    platforms: [
      ...makePerimeter({ left: true, top: true, right: true, bottom: true }),
      // Central climbing shaft walls (can be climbed via platforms or Mantis Talons wall-jump)
      { x: 580, y: 260, w: 36, h: 420 },
      { x: 984, y: 260, w: 36, h: 420 },
      { x: 340, y: 740, w: 220, h: 24 },
      { x: 1040, y: 740, w: 220, h: 24 },
      { x: 640, y: 640, w: 160, h: 22 },
      { x: 800, y: 510, w: 160, h: 22 },
      { x: 640, y: 380, w: 160, h: 22 },
      { x: 700, y: 250, w: 200, h: 22 },
      { x: 700, y: 130, w: 200, h: 22, oneWay: true },
      { x: 1100, y: 470, w: 220, h: 24 }
    ],
    hazards: [
      { type: 'crumbling', x: 1300, y: 740, w: 140, h: 22 }
    ],
    enemies: [
      { type: 'lurker', x: 420, y: 705, patrol: [350, 540] },
      { type: 'bat', x: 1180, y: 580, patrol: [1040, 1420] }
    ],
    props: [
      { type: 'chain', x: 680, y: 48, h: 320 },
      { type: 'chain', x: 920, y: 48, h: 320 },
      { type: 'lantern', x: 1080, y: 740 }
    ]
  },

  // ==========================================
  // REGION 5: THE PRISM VAULTS (Crystal Depths)
  // ==========================================
  crystals_lower: {
    id: 'crystals_lower',
    name: 'Amethyst Foundry',
    biome: 'crystals',
    atlasPos: { x: 5, y: 3 },
    exits: {
      left: { targetRoom: 'tunnels_east', targetX: 1470, targetY: 820 },
      top: { targetRoom: 'crystals_entry', targetX: 800, targetY: 810 },
      right: { targetRoom: 'crystals_spire', targetX: 96, targetY: 820 }
    },
    brazier: { x: 320, y: 880, name: 'Amethyst Foundry Brazier' },
    items: [
      { id: 'bridge_pinion', x: 1280, y: 520, type: 'item' },
      { id: 'clue_prism_echo', x: 440, y: 540, type: 'item' }
    ],
    loreTablets: [
      {
        x: 620,
        y: 880,
        title: 'Foundry Harmonic Stone',
        text: 'Above lies the Prism Atrium & Hollowbrook Bridge. East rises the Crystal Spire where the Zephyr Plume (Double Jump) and Prism Warden await.'
      }
    ],
    platforms: [
      ...makePerimeter({ left: true, top: true, right: true }),
      { x: 360, y: 570, w: 220, h: 24 },
      { x: 540, y: 730, w: 220, h: 24 },
      { x: 860, y: 630, w: 220, h: 24 },
      { x: 1180, y: 550, w: 240, h: 24 },
      { x: 660, y: 460, w: 240, h: 24 },
      { x: 700, y: 320, w: 200, h: 24 },
      { x: 700, y: 180, w: 200, h: 24 }
    ],
    hazards: [
      { type: 'spikes', x: 860, y: 862, w: 240, h: 18 }
    ],
    enemies: [
      { type: 'crystal_golem', x: 640, y: 690, patrol: [550, 740] },
      { type: 'wisp', x: 1020, y: 480, patrol: [820, 1260] }
    ],
    props: [
      { type: 'crystal_cluster', x: 220, y: 880 },
      { type: 'crystal_cluster', x: 1180, y: 880 },
      { type: 'crystal_cluster', x: 420, y: 570 },
      { type: 'lantern', x: 320, y: 700 }
    ]
  },

  crystals_entry: {
    id: 'crystals_entry',
    name: 'Prism Gallery & High Bridgehead',
    biome: 'crystals',
    atlasPos: { x: 5, y: 2 },
    exits: {
      left: { targetRoom: 'village_bridge', targetX: 1470, targetY: 820 },
      bottom: { targetRoom: 'crystals_lower', targetX: 800, targetY: 110 },
      right: { targetRoom: 'crystals_boss', targetX: 96, targetY: 820 }
    },
    items: [
      { id: 'plant_crystalbloom', x: 300, y: 420, type: 'item' },
      { id: 'shrine_rune_3', x: 1260, y: 360, type: 'item' }
    ],
    platforms: [
      ...makePerimeter({ left: true, bottom: true, right: true }),
      { x: 220, y: 720, w: 220, h: 24 },
      { x: 200, y: 450, w: 220, h: 24 },
      { x: 460, y: 580, w: 220, h: 24 },
      { x: 960, y: 720, w: 220, h: 24 },
      { x: 920, y: 520, w: 220, h: 24 },
      { x: 1160, y: 390, w: 240, h: 24 }
    ],
    movingPlatforms: [
      { x: 680, y: 450, w: 160, h: 22, dx: 0, dy: 220, speed: 1.5 }
    ],
    hazards: [
      { type: 'spikes', x: 440, y: 862, w: 200, h: 18 },
      { type: 'spikes', x: 1180, y: 862, w: 200, h: 18 }
    ],
    enemies: [
      { type: 'wisp', x: 580, y: 420, patrol: [380, 820] },
      { type: 'crystal_golem', x: 1040, y: 680, patrol: [970, 1160] }
    ],
    props: [
      { type: 'crystal_cluster', x: 300, y: 450 },
      { type: 'crystal_cluster', x: 1280, y: 390 },
      { type: 'pillar', x: 540, y: 880, h: 300 }
    ]
  },

  crystals_spire: {
    id: 'crystals_spire',
    name: 'The Gloaming Gallery of Lights',
    biome: 'crystals',
    atlasPos: { x: 6, y: 3 },
    exits: {
      left: { targetRoom: 'crystals_lower', targetX: 1470, targetY: 820 },
      top: { targetRoom: 'crystals_boss', targetX: 800, targetY: 810 }
    },
    items: [
      { id: 'ability_double', x: 1320, y: 680, type: 'ability', ability: 'doubleJump' },
      { id: 'wisp_core', x: 240, y: 280, type: 'item' },
      { id: 'mask_shard_crystals', x: 280, y: 280, type: 'mask_upgrade' }
    ],
    loreTablets: [
      {
        x: 1140,
        y: 880,
        title: 'Shrine of the Zephyr Plume',
        text: 'Awaken the Zephyr Plume to Double-Jump in mid-air! Follow the Mysterious Cyan Lights upward to uncover the Whispering Alcove and reach the Prism Warden above.'
      }
    ],
    platforms: [
      ...makePerimeter({ left: true, top: true }),
      { x: 1180, y: 740, w: 260, h: 24 },
      { x: 860, y: 630, w: 220, h: 24 },
      { x: 520, y: 520, w: 220, h: 24 },
      { x: 160, y: 310, w: 260, h: 24 },
      { x: 480, y: 390, w: 200, h: 24 },
      { x: 820, y: 350, w: 220, h: 24 },
      { x: 700, y: 230, w: 220, h: 24 },
      { x: 700, y: 120, w: 200, h: 20, oneWay: true }
    ],
    hazards: [
      { type: 'spikes', x: 480, y: 862, w: 540, h: 18 }
    ],
    enemies: [
      { type: 'wisp', x: 640, y: 440, patrol: [460, 920] },
      { type: 'wisp', x: 420, y: 260, patrol: [240, 720] }
    ],
    props: [
      { type: 'shrine', x: 1320, y: 710 },
      { type: 'crystal_cluster', x: 220, y: 310 },
      { type: 'mysterious_light', x: 960, y: 580 },
      { type: 'mysterious_light', x: 620, y: 470 },
      { type: 'mysterious_light', x: 340, y: 250 }
    ]
  },

  crystals_boss: {
    id: 'crystals_boss',
    name: 'Sanctum of the Prism Warden',
    biome: 'crystals',
    atlasPos: { x: 6, y: 2 },
    exits: {
      left: { targetRoom: 'crystals_entry', targetX: 1470, targetY: 820 },
      bottom: { targetRoom: 'crystals_spire', targetX: 800, targetY: 110 }
    },
    boss: {
      id: 'boss_prism_warden',
      name: 'THE PRISM WARDEN',
      subtitle: 'Sentinel of the Harmonic Spire',
      type: 'boss_prism',
      x: 1050,
      y: 810,
      hp: 220
    },
    items: [
      { id: 'ability_heavy', x: 1260, y: 840, type: 'ability', ability: 'heavySlash' },
      { id: 'seal_crystals', x: 1400, y: 840, type: 'item' }
    ],
    loreTablets: [
      {
        x: 280,
        y: 880,
        title: 'Harmonic Resonance Altar',
        text: 'Master the Resonance Strike [L / V] to shatter Crystal Barriers and Echo-Glass cages, and claim the Second Choir Seal!'
      }
    ],
    platforms: [
      ...makePerimeter({ left: true, bottom: true }),
      { x: 360, y: 680, w: 220, h: 24 },
      { x: 1020, y: 680, w: 220, h: 24 }
    ],
    hazards: [],
    enemies: [],
    props: [
      { type: 'shrine', x: 1260, y: 880 },
      { type: 'crystal_cluster', x: 200, y: 880 },
      { type: 'crystal_cluster', x: 1440, y: 880 }
    ]
  },

  // ==========================================
  // REGION 6: THE BRIAR CONSERVATORY (Thorny Gardens)
  // ==========================================
  gardens_entry: {
    id: 'gardens_entry',
    name: 'Sylas’s Glasshouse Conservatory',
    biome: 'gardens',
    atlasPos: { x: 4, y: 4 },
    exits: {
      top: { targetRoom: 'tunnels_east', targetX: 800, targetY: 810 },
      right: { targetRoom: 'gardens_canopy', targetX: 96, targetY: 820 },
      bottom: { targetRoom: 'abyss_shaft', targetX: 800, targetY: 110 }
    },
    brazier: { x: 360, y: 880, name: 'Conservatory Brazier' },
    npcs: [
      { id: 'sylas', x: 520, y: 880 }
    ],
    loreTablets: [
      {
        x: 1020,
        y: 880,
        title: 'Conservatory Warning Plaque',
        text: 'East lies the Briar Canopy & Third Choir Seal. Below descends the Obsidian Chasm Shaft toward the Abyssal Sanctum where Liora is held.'
      }
    ],
    platforms: [
      ...makePerimeter({ top: true, right: true, bottom: true }),
      // Climb ladder back to tunnels_east
      { x: 540, y: 740, w: 200, h: 24 },
      { x: 860, y: 620, w: 200, h: 24 },
      { x: 560, y: 490, w: 200, h: 24 },
      { x: 840, y: 360, w: 200, h: 24 },
      { x: 680, y: 230, w: 240, h: 24 },
      { x: 700, y: 120, w: 200, h: 22, oneWay: true }
    ],
    hazards: [],
    enemies: [],
    props: [
      { type: 'hut', x: 460, y: 880 },
      { type: 'lantern', x: 520, y: 700 },
      { type: 'glow_flowers', x: 260, y: 880 },
      { type: 'glow_flowers', x: 1240, y: 880 },
      { type: 'vines', x: 1140, y: 48, h: 300 }
    ]
  },

  gardens_canopy: {
    id: 'gardens_canopy',
    name: 'The Thorny Briar Sanctum',
    biome: 'gardens',
    atlasPos: { x: 5, y: 4 },
    exits: {
      left: { targetRoom: 'gardens_entry', targetX: 1470, targetY: 820 },
      top: { targetRoom: 'gardens_secret_grove', targetX: 800, targetY: 810 }
    },
    items: [
      { id: 'plant_dewthorn', x: 780, y: 380, type: 'item' },
      { id: 'seal_gardens', x: 1380, y: 660, type: 'item' },
      { id: 'ability_thorn_shrine', x: 1240, y: 660, type: 'ability', ability: 'thornWard' }
    ],
    loreTablets: [
      {
        x: 240,
        y: 880,
        title: 'Sanctum of the Briar Crest',
        text: 'Navigate the upper vine-bridges to harvest the Crimson Night-Briar for Sylas, awaken the Cinder-Ward Mantle, and claim the Third Choir Seal.'
      }
    ],
    platforms: [
      ...makePerimeter({ left: true, top: true }),
      { x: 240, y: 740, w: 200, h: 24 },
      { x: 500, y: 620, w: 200, h: 24 },
      { x: 640, y: 510, w: 180, h: 22 },
      { x: 700, y: 390, w: 220, h: 24 },
      { x: 700, y: 255, w: 200, h: 22 },
      { x: 700, y: 120, w: 200, h: 20, oneWay: true },
      { x: 820, y: 610, w: 220, h: 24 },
      { x: 1160, y: 690, w: 300, h: 24 }
    ],
    hazards: [
      { type: 'thorns', x: 460, y: 856, w: 660, h: 24 },
      { type: 'poison_plant', x: 580, y: 610 },
      { type: 'poison_plant', x: 920, y: 610 }
    ],
    enemies: [
      { type: 'sporeling', x: 320, y: 695, patrol: [250, 420] },
      { type: 'thumper', x: 1280, y: 650, patrol: [1180, 1420] },
      { type: 'bat', x: 780, y: 280, patrol: [520, 1080] }
    ],
    props: [
      { type: 'shrine', x: 1240, y: 690 },
      { type: 'vines', x: 640, y: 48, h: 260 },
      { type: 'vines', x: 1060, y: 48, h: 280 },
      { type: 'glow_flowers', x: 780, y: 410 }
    ]
  },

  gardens_secret_grove: {
    id: 'gardens_secret_grove',
    name: 'Crown of the Star-Blossom',
    biome: 'gardens',
    atlasPos: { x: 5, y: 3.4 },
    exits: {
      bottom: { targetRoom: 'gardens_canopy', targetX: 800, targetY: 110 }
    },
    items: [
      { id: 'mask_shard_gardens', x: 800, y: 460, type: 'mask_upgrade' },
      { id: 'lumen_grove_1', x: 420, y: 620, type: 'lumen', amount: 90 }
    ],
    loreTablets: [
      {
        x: 1100,
        y: 880,
        title: 'Epitaph of the First Weaver',
        text: 'Before the Choir fell to shadow, Echo-Weavers sang life into these subterranean gardens. Liora carries their pure harmonic bloodline.'
      }
    ],
    platforms: [
      ...makePerimeter({ bottom: true }),
      { x: 340, y: 650, w: 240, h: 24 },
      { x: 1020, y: 650, w: 240, h: 24 },
      { x: 660, y: 490, w: 280, h: 24 }
    ],
    hazards: [],
    enemies: [],
    props: [
      { type: 'shrine', x: 800, y: 490 },
      { type: 'glow_flowers', x: 380, y: 650 },
      { type: 'glow_flowers', x: 1140, y: 650 },
      { type: 'vines', x: 500, y: 48, h: 260 },
      { type: 'vines', x: 1100, y: 48, h: 260 }
    ]
  },

  ruins_catacomb: {
    id: 'ruins_catacomb',
    name: 'Catacomb of Whispering Chains',
    biome: 'ruins',
    atlasPos: { x: 3, y: 2.4 },
    exits: {
      top: { targetRoom: 'ruins_shrine', targetX: 800, targetY: 810 },
      bottom: { targetRoom: 'tunnels_west', targetX: 480, targetY: 700 }
    },
    items: [
      { id: 'lumen_catacomb_1', x: 320, y: 580, type: 'lumen', amount: 65 }
    ],
    loreTablets: [
      {
        x: 1120,
        y: 880,
        title: "Caspian's Chalk Trail",
        text: 'A broken expedition lantern and chalk arrow point downward: "Dropping through this drainage chute into the Submerged Aqueduct—Sera, wait for me!"'
      }
    ],
    platforms: [
      ...makePerimeter({ top: true, bottom: true }),
      { x: 540, y: 740, w: 200, h: 24 },
      { x: 860, y: 620, w: 200, h: 24 },
      { x: 260, y: 610, w: 200, h: 24 },
      { x: 560, y: 490, w: 200, h: 24 },
      { x: 840, y: 360, w: 200, h: 24 },
      { x: 680, y: 230, w: 240, h: 24 },
      { x: 700, y: 120, w: 200, h: 22, oneWay: true }
    ],
    hazards: [
      { type: 'spikes', x: 260, y: 862, w: 240, h: 18 }
    ],
    enemies: [
      { type: 'sentinel', x: 1020, y: 840, patrol: [920, 1320] }
    ],
    props: [
      { type: 'chain', x: 420, y: 48, h: 460 },
      { type: 'chain', x: 1180, y: 48, h: 460 },
      { type: 'bones', x: 620, y: 880 },
      { type: 'lantern', x: 1080, y: 710 }
    ]
  },

  village_watchtower: {
    id: 'village_watchtower',
    name: 'Hollowbrook Belfry & Observatory',
    biome: 'village',
    atlasPos: { x: 4, y: 0 },
    exits: {
      bottom: { targetRoom: 'village_west', targetX: 800, targetY: 110 }
    },
    items: [
      { id: 'mask_shard_village', x: 1220, y: 480, type: 'mask_upgrade' },
      { id: 'lumen_belfry_1', x: 340, y: 480, type: 'lumen', amount: 75 }
    ],
    loreTablets: [
      {
        x: 520,
        y: 880,
        title: 'Watchman’s Brass Telescope',
        text: 'Through the cracked lens you spy the glittering spires of the Crystal Depths to the east and the dark rift of the Deep Abyss far below.'
      }
    ],
    platforms: [
      ...makePerimeter({ bottom: true }),
      { x: 440, y: 730, w: 220, h: 24 },
      { x: 940, y: 730, w: 220, h: 24 },
      { x: 260, y: 510, w: 240, h: 24 },
      { x: 1100, y: 510, w: 240, h: 24 },
      { x: 660, y: 580, w: 280, h: 24 }
    ],
    hazards: [],
    enemies: [
      { type: 'bat', x: 800, y: 420, patrol: [480, 1120] }
    ],
    props: [
      { type: 'lantern_post', x: 580, y: 880 },
      { type: 'lantern_post', x: 1020, y: 880 },
      { type: 'statue', x: 800, y: 580 }
    ]
  },

  // ==========================================
  // REGION 7: THE DEEP ABYSS (Obsidian Chasm & Finale)
  // ==========================================
  abyss_shaft: {
    id: 'abyss_shaft',
    name: 'The Obsidian Plunge',
    biome: 'abyss',
    atlasPos: { x: 4, y: 4.5 },
    exits: {
      top: { targetRoom: 'gardens_entry', targetX: 800, targetY: 810 },
      bottom: { targetRoom: 'abyss_gate', targetX: 800, targetY: 110 }
    },
    items: [
      { id: 'lumen_abyss_1', x: 280, y: 500, type: 'lumen', amount: 90 }
    ],
    platforms: [
      ...makePerimeter({ top: true, bottom: true }),
      { x: 540, y: 750, w: 200, h: 24 },
      { x: 860, y: 630, w: 200, h: 24 },
      { x: 220, y: 530, w: 220, h: 24 },
      { x: 560, y: 500, w: 200, h: 24 },
      { x: 840, y: 370, w: 200, h: 24 },
      { x: 680, y: 240, w: 240, h: 24 },
      { x: 700, y: 120, w: 200, h: 22, oneWay: true }
    ],
    hazards: [
      { type: 'spikes', x: 220, y: 862, w: 260, h: 18 },
      { type: 'spikes', x: 1120, y: 862, w: 260, h: 18 }
    ],
    enemies: [
      { type: 'void_knight', x: 920, y: 590, patrol: [860, 1040] },
      { type: 'wisp', x: 640, y: 420, patrol: [420, 1020] }
    ],
    props: [
      { type: 'chain', x: 340, y: 48, h: 720 },
      { type: 'chain', x: 1260, y: 48, h: 720 },
      { type: 'pillar', x: 180, y: 880, h: 640 },
      { type: 'pillar', x: 1420, y: 880, h: 640 }
    ]
  },

  abyss_gate: {
    id: 'abyss_gate',
    name: 'Threshold of the Three Choir Seals',
    biome: 'abyss',
    atlasPos: { x: 4, y: 5.2 },
    exits: {
      top: { targetRoom: 'abyss_shaft', targetX: 800, targetY: 810 },
      right: { targetRoom: 'abyss_sanctum', targetX: 96, targetY: 820 }
    },
    brazier: { x: 380, y: 880, name: 'Abyssal Threshold Brazier' },
    sealGate: {
      x: 1360,
      y: 640,
      w: 44,
      h: 240,
      requiredSeals: 3
    },
    items: [
      { id: 'clue_locket', x: 1180, y: 840, type: 'item' }
    ],
    loreTablets: [
      {
        x: 980,
        y: 880,
        title: 'The Abyssal Choir Gate',
        text: 'Only when the Three Choir Seals (Spore-Weald, Prism Vaults, and Thorny Gardens) are claimed will this Obsidian Gate part before the Warden.'
      }
    ],
    platforms: [
      ...makePerimeter({ top: true, right: true }),
      // Climb ladder back to gardens_entry
      { x: 540, y: 740, w: 200, h: 24 },
      { x: 860, y: 620, w: 200, h: 24 },
      { x: 560, y: 490, w: 200, h: 24 },
      { x: 840, y: 360, w: 200, h: 24 },
      { x: 680, y: 230, w: 240, h: 24 },
      { x: 700, y: 120, w: 200, h: 22, oneWay: true }
    ],
    hazards: [
      { type: 'spikes', x: 620, y: 862, w: 220, h: 18 }
    ],
    enemies: [
      { type: 'void_knight', x: 1080, y: 830, patrol: [900, 1280] }
    ],
    props: [
      { type: 'pillar', x: 240, y: 880, h: 520 },
      { type: 'pillar', x: 1320, y: 880, h: 520 },
      { type: 'chain', x: 480, y: 48, h: 420 },
      { type: 'chain', x: 1120, y: 48, h: 420 },
      { type: 'lantern', x: 380, y: 700 }
    ]
  },

  abyss_sanctum: {
    id: 'abyss_sanctum',
    name: 'The Abyssal Conduit & Echo-Glass Cage',
    biome: 'abyss',
    atlasPos: { x: 5, y: 5 },
    exits: {
      left: { targetRoom: 'abyss_gate', targetX: 1280, targetY: 820 }
    },
    boss: {
      id: 'boss_archon_malakor',
      name: 'ARCHON MALAKOR',
      subtitle: 'High Prelate of the Hollow Spire',
      type: 'boss_archon',
      x: 980,
      y: 800,
      hp: 300
    },
    lioraCage: {
      x: 1360,
      y: 880
    },
    npcs: [
      { id: 'liora', x: 1360, y: 880, requiresCageBroken: true }
    ],
    loreTablets: [
      {
        x: 240,
        y: 880,
        title: 'Dais of the Abyssal Conduit',
        text: 'Vanquish Archon Malakor and strike Liora’s Echo-Glass Cage with your Resonance Strike [L / V] or Gloom-Cleaver to set her free!'
      }
    ],
    platforms: [
      ...makePerimeter({ left: true }),
      { x: 320, y: 690, w: 220, h: 24 },
      { x: 700, y: 580, w: 220, h: 24 },
      { x: 1060, y: 690, w: 220, h: 24 }
    ],
    hazards: [],
    enemies: [],
    props: [
      { type: 'pillar', x: 420, y: 880, h: 560 },
      { type: 'pillar', x: 1180, y: 880, h: 560 },
      { type: 'chain', x: 1360, y: 48, h: 680 },
      { type: 'candles', x: 1280, y: 880 },
      { type: 'candles', x: 1440, y: 880 }
    ]
  }
};
