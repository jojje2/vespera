(() => {
"use strict";

// === FILE: src/audio.js ===
// Web Audio API Procedural Soundtrack & Environmental Sound Engine

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.masterVol = 0.75;
    this.musicVol = 0.65;
    this.sfxVol = 0.85;
    this.currentRegion = null;
    this.bossMode = false;
    this.musicTimer = null;
    this.ambientTimer = null;
    this.stepIndex = 0;
    this.initialized = false;
  }

  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.masterGain.gain.value = this.masterVol;
      this.musicGain.gain.value = this.musicVol * 0.35;
      this.sfxGain.gain.value = this.sfxVol * 0.55;

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.initialized = true;
      this.startLoops();
    } catch (e) {
      // Audio not supported or blocked
    }
  }

  setVolumes(master, music, sfx) {
    this.masterVol = master;
    this.musicVol = music;
    this.sfxVol = sfx;
    if (!this.initialized) return;
    this.masterGain.gain.setTargetAtTime(this.masterVol, this.ctx.currentTime, 0.05);
    this.musicGain.gain.setTargetAtTime(this.musicVol * 0.35, this.ctx.currentTime, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.sfxVol * 0.55, this.ctx.currentTime, 0.05);
  }

  setRegion(regionId, isBoss = false) {
    this.currentRegion = regionId;
    this.bossMode = isBoss;
  }

  startLoops() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    if (this.ambientTimer) clearInterval(this.ambientTimer);

    // Generative arpeggio / drone loop
    this.musicTimer = setInterval(() => {
      if (!this.initialized || !this.ctx || this.ctx.state !== 'running') return;
      this.playMusicStep();
    }, 650);

    // Environmental cave drips / wind / crackle loop
    this.ambientTimer = setInterval(() => {
      if (!this.initialized || !this.ctx || this.ctx.state !== 'running') return;
      this.playAmbientDetail();
    }, 2400);
  }

  playMusicStep() {
    const scales = {
      ruins: [146.83, 174.61, 220.0, 261.63, 293.66, 349.23, 440.0], // D minor haunting
      caverns: [130.81, 155.56, 196.0, 233.08, 261.63, 311.13, 392.0], // C minor lush
      village: [164.81, 196.0, 246.94, 293.66, 329.63, 392.0, 493.88], // E minor melancholic
      tunnels: [138.59, 164.81, 207.65, 246.94, 277.18, 329.63, 415.3], // C# minor watery
      crystals: [196.0, 246.94, 293.66, 369.99, 392.0, 493.88, 587.33], // Lydian crystalline
      gardens: [146.83, 164.81, 220.0, 233.08, 293.66, 329.63, 440.0], // Phrygian thorny
      abyss: [110.0, 130.81, 164.81, 196.0, 220.0, 246.94, 329.63], // Deep A minor
      boss: [110.0, 116.54, 146.83, 155.56, 164.81, 220.0, 233.08]
    };

    const key = this.bossMode ? 'boss' : (this.currentRegion || 'ruins');
    const scale = scales[key] || scales.ruins;
    const now = this.ctx.currentTime;

    // Bass drone every 4 steps
    if (this.stepIndex % 4 === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = this.bossMode ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(scale[0] * 0.5, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(this.bossMode ? 0.22 : 0.16, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 2.5);
    }

    // Melodic echo note
    const pattern = [0, 2, 4, 3, 5, 4, 2, 1];
    const noteIdx = pattern[this.stepIndex % pattern.length];
    const freq = scale[noteIdx % scale.length];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = key === 'crystals' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 1.2);

    this.stepIndex++;
  }

  playAmbientDetail() {
    const now = this.ctx.currentTime;
    const r = Math.random();
    if (r < 0.45) {
      // Water droplet echo
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const base = 900 + Math.random() * 500;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 1.45, now + 0.09);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (r < 0.75) {
      // Distant cavern rumble / wind
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(58 + Math.random() * 20, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 1.65);
    }
  }

  playTone(freq, endFreq, duration, type = 'sine', vol = 0.25) {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  jump() {
    this.playTone(190, 420, 0.14, 'sine', 0.22);
  }

  doubleJump() {
    this.playTone(320, 680, 0.18, 'triangle', 0.25);
  }

  wallJump() {
    this.playTone(240, 510, 0.12, 'triangle', 0.22);
  }

  dash() {
    this.playTone(360, 110, 0.16, 'sawtooth', 0.18);
  }

  slash() {
    this.playTone(480, 140, 0.11, 'sawtooth', 0.22);
  }

  heavySlash() {
    this.playTone(220, 65, 0.28, 'sawtooth', 0.34);
    setTimeout(() => this.playTone(540, 880, 0.22, 'triangle', 0.25), 50);
  }

  hitEnemy() {
    this.playTone(160, 75, 0.12, 'square', 0.26);
  }

  playerHurt() {
    this.playTone(150, 55, 0.32, 'sawtooth', 0.36);
  }

  heal() {
    this.playTone(330, 660, 0.35, 'sine', 0.28);
    setTimeout(() => this.playTone(440, 880, 0.35, 'triangle', 0.24), 120);
  }

  collect() {
    this.playTone(523.25, 783.99, 0.16, 'sine', 0.22);
    setTimeout(() => this.playTone(783.99, 1046.5, 0.22, 'triangle', 0.22), 90);
  }

  secretFound() {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, n * 1.02, 0.28, 'triangle', 0.26), i * 95);
    });
  }

  questComplete() {
    const notes = [392, 493.88, 587.33, 783.99];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, n, 0.34, 'triangle', 0.28), i * 110);
    });
  }

  doorOpen() {
    this.playTone(95, 140, 0.45, 'sawtooth', 0.28);
  }

  npcVoice(pitch = 320) {
    this.playTone(pitch, pitch * (0.9 + Math.random() * 0.25), 0.07, 'triangle', 0.15);
  }
}

const audio = new AudioEngine();


// === FILE: src/quests_npcs.js ===
// Abilities, Items, Quests, and NPC Definitions for VESPERA: Echoes of the Undercroft

const ABILITY_DEFS = {
  slash: {
    id: 'slash',
    name: 'Verdant Glaive (Kaelen)',
    keyHint: 'J / Z / X',
    desc: 'Warden Kaelen’s signature living spirit-blade. Carved from ironwood and bramble root; strikes foes, cleaves briar vines, and absorbs glowing Soul into your lantern.'
  },
  dash: {
    id: 'dash',
    name: 'Spore-Step Cloak (Myra)',
    keyHint: 'Shift / K / C',
    desc: 'Herbalist Myra’s gift, woven from ancient bioluminescent spore-silk. Unleashes a rapid horizontal burst through air, bypassing brambles, pitfalls, and falling hazards.'
  },
  wallJump: {
    id: 'wallJump',
    name: 'Mantis Talons (Caspian)',
    keyHint: 'Hold toward wall + Jump',
    desc: 'Explorer Caspian’s specialized climbing claws. Allows clinging to sheer vertical moss-covered cliffs and leaping upward between narrow chasm walls.'
  },
  doubleJump: {
    id: 'doubleJump',
    name: 'Verdant Leaf-Wings (Elder Shrine)',
    keyHint: 'Jump in Mid-Air',
    desc: 'The blessing of the Ancient Bramble Shrine. Unfurls spectral iridescent leaf-wings in mid-air to ascend to lofty ledges and hidden canopies.'
  },
  heavySlash: {
    id: 'heavySlash',
    name: 'Echo Resonance Strike (Liora)',
    keyHint: 'L / V',
    desc: 'Harmonic wave technique gifted by Sister Liora’s tuning shard. Releases a reverberating shockwave that shatters brittle crystal walls and Echo-Glass seals.'
  },
  thornWard: {
    id: 'thornWard',
    name: 'Bramble-Phase Mantle (Sylas)',
    keyHint: 'Passive + Dash Invulnerability',
    desc: 'Botanist Sylas’s distilled alchemical ward. Renders your vessel completely immune to poisonous thorns, acidic sap, and caustic mire, cloaking dashes in shadow.'
  }
};

const ITEM_DEFS = {
  // Story Clues of Liora (6 total)
  clue_ribbon: {
    id: 'clue_ribbon',
    name: "Liora's Singed Ribbon",
    category: 'clue',
    desc: 'A pale blue weaver’s ribbon snagged on broken masonry at the bottom of the Watchtower Sinkhole. Still warm with Echo-Glass dust.'
  },
  clue_tuning_shard: {
    id: 'clue_tuning_shard',
    name: 'Chipped Tuning Shard',
    category: 'clue',
    desc: 'Dropped by Liora in the Overgrown Caverns. Etched with tiny musical notations pointing toward the eastern village lift.'
  },
  clue_ledger: {
    id: 'clue_ledger',
    name: 'Choir Transit Ledger',
    category: 'clue',
    desc: 'Recovered from Hollowbrook. Records that the "Echo-Weaver Prisoner" was carried down to the Obsidian Chasm behind Three Choir Seals.'
  },
  clue_journal: {
    id: 'clue_journal',
    name: "Liora's Waterlogged Note",
    category: 'clue',
    desc: 'Tucked inside a waterproof reed tube in the Drowned Sluice: "Kaelen, if you follow me—their cage resonates at the third harmonic. Only a Resonance Strike can crack it."'
  },
  clue_prism_echo: {
    id: 'clue_prism_echo',
    name: 'Recorded Voice Crystal',
    category: 'clue',
    desc: 'A crystal in the Prism Vaults that captured Liora’s voice as she passed: "Malakor fears the three outer seals breaking. Break them and the Abyssal Gate must open."'
  },
  clue_locket: {
    id: 'clue_locket',
    name: 'Twin Warden Locket',
    category: 'clue',
    desc: 'Found outside the Abyssal Sanctum—half of the brass locket you and Liora shared since childhood, deliberately dropped to mark the final door.'
  },

  // Main Progression Seals
  seal_caverns: {
    id: 'seal_caverns',
    name: 'First Choir Seal (Verdant Crest)',
    category: 'key',
    desc: 'Claimed from the Spore-Weald depths. Unlocks one of the three locks on the Abyssal Sanctum.'
  },
  seal_crystals: {
    id: 'seal_crystals',
    name: 'Second Choir Seal (Prism Crest)',
    category: 'key',
    desc: 'Claimed after besting the Prism Warden in the Crystal Depths. Unlocks the second lock on the Abyssal Sanctum.'
  },
  seal_gardens: {
    id: 'seal_gardens',
    name: 'Third Choir Seal (Briar Crest)',
    category: 'key',
    desc: 'Claimed from the heart of the Thorny Gardens. Unlocks the final lock on the Abyssal Sanctum.'
  },

  // Side Quest Items & Keys
  rare_mushroom: {
    id: 'rare_mushroom',
    name: 'Starlight Mycelium Cap',
    category: 'quest',
    desc: 'A bioluminescent silver mushroom pulsing softly with cold light, found deep inside the Spore-Weald snare tunnel for Herbalist Myra.'
  },
  explorer_medallion: {
    id: 'explorer_medallion',
    name: "Caspian's Brass Astrolabe",
    category: 'quest',
    desc: 'Proof of finding the missing explorer Caspian inside the Sunken Vaults of the Ancient Ruins.'
  },
  cellar_key: {
    id: 'cellar_key',
    name: 'Tarnished Cellar Key',
    category: 'key',
    desc: 'Opens the locked iron grate beneath the Forgotten Village square, leading to the Flooded Tunnels and the Old Curiosity Vault.'
  },
  shrine_rune_1: {
    id: 'shrine_rune_1',
    name: 'Verse Tablet of Stone',
    category: 'quest',
    desc: 'First of three ancient liturgical tablets required to unseal the Forgotten Shrine in the Sanctum of Ash.'
  },
  shrine_rune_2: {
    id: 'shrine_rune_2',
    name: 'Verse Tablet of Tides',
    category: 'quest',
    desc: 'Second ancient tablet, recovered from the submerged archives of the Flooded Tunnels.'
  },
  shrine_rune_3: {
    id: 'shrine_rune_3',
    name: 'Verse Tablet of Starlight',
    category: 'quest',
    desc: 'Third ancient tablet, recovered from the high spire of the Crystal Depths.'
  },
  plant_glowmoss: {
    id: 'plant_glowmoss',
    name: 'Azure Weep-Moss',
    category: 'quest',
    desc: 'A rare amphibious flora specimen from the Flooded Tunnels sought by Sylas the Botanist.'
  },
  plant_crystalbloom: {
    id: 'plant_crystalbloom',
    name: 'Quartz-Petal Orchid',
    category: 'quest',
    desc: 'A crystalline flower growing on a razor ledge in the Crystal Depths.'
  },
  plant_dewthorn: {
    id: 'plant_dewthorn',
    name: 'Crimson Night-Briar',
    category: 'quest',
    desc: 'A volatile blossom harvested from the deepest canopy of the Thorny Gardens.'
  },
  bridge_pinion: {
    id: 'bridge_pinion',
    name: 'Dwarven Iron Winch-Gear',
    category: 'quest',
    desc: 'Heavy geared mechanism retrieved from the Crystal Depths foundry. Bram the Tinker needs this to repair the Broken Bridge in Hollowbrook.'
  },
  lost_relic: {
    id: 'lost_relic',
    name: 'Chalice of the First Choir',
    category: 'quest',
    desc: 'An ornate silver-and-obsidian reliquary hidden inside a trapped vault of the Ancient Ruins, sought by Collector Vane.'
  },
  wisp_core: {
    id: 'wisp_core',
    name: 'Luminous Echo-Core',
    category: 'quest',
    desc: 'Discovered by following the Mysterious Lights in the deep eastern tunnel. Contains a recorded memory of the kingdom’s fall.'
  }
};

const QUEST_DEFS = [
  {
    id: 'q_main_rescue',
    title: 'Echoes of Liora (Main Story)',
    isMain: true,
    giver: 'Warden Kaelen / Orin the Chronicler',
    region: 'All Regions of Vespera',
    description:
      'Your sister Liora was abducted during the Moonless Tremor by Archon Malakor and the Pale Choir. Follow her trail across the seven underground strata, break the Three Choir Seals, master the Resonance Strike, and rescue her from the Abyssal Sanctum.',
    rewardText: 'Rescue Liora & Restore the Undercroft',
    stages: [
      { id: 'find_first_clue', text: "Inspect Liora's Singed Ribbon in the Watchtower Sinkhole and speak with Orin the Chronicler." },
      { id: 'gain_dash', text: 'Explore the Overgrown Caverns, awaken the Moth-Step Cloak (Dash), and claim the First Choir Seal.' },
      { id: 'reach_village', text: 'Enter the Forgotten Village of Hollowbrook and uncover the Choir Transit Ledger.' },
      { id: 'break_three_seals', text: 'Break all 3 Choir Seals across the Caverns, Crystal Depths, and Thorny Gardens, and learn the Resonance Strike.' },
      { id: 'rescue_liora', text: 'Descend into the Deep Abyss, defeat Archon Malakor in the Abyssal Sanctum, and shatter Liora’s Echo-Glass Cage.' }
    ]
  },
  {
    id: 'q_mushroom',
    title: 'The Rare Mushroom',
    isMain: false,
    giver: 'Myra the Herbalist (Hidden Spore Grotto)',
    region: 'Overgrown Caverns',
    description:
      'Hidden inside a mossy grotto of the Overgrown Caverns, Herbalist Myra is brewing a restorative draught for wounded travelers. She needs a Starlight Mycelium Cap that only grows at the far end of the Spore-Snare Tunnel beyond spiked roots and crumbling ledges.',
    rewardText: '+1 Max Health Mask & 120 Lumen Shards',
    stages: [
      { id: 'talk_myra', text: 'Speak with Myra the Herbalist in the Hidden Spore Grotto.' },
      { id: 'collect_mushroom', text: 'Navigate the Spore-Snare Tunnel and harvest the Starlight Mycelium Cap.' },
      { id: 'return_myra', text: 'Return the Starlight Mycelium Cap to Myra for her elixir.' }
    ]
  },
  {
    id: 'q_explorer',
    title: 'The Missing Explorer',
    isMain: false,
    giver: 'Sera the Cartographer (Hollowbrook Village)',
    region: 'Ancient Ruins & Flooded Tunnels',
    description:
      'Sera’s partner, the explorer Caspian, ventured into the lower Catacombs of the Sanctum of Ash searching for a passage to the Drowned Sluice and never returned. Follow his campfires and chalk marks through the ruins to find him.',
    rewardText: 'Tarnished Cellar Key & 150 Lumen Shards',
    stages: [
      { id: 'talk_sera', text: 'Hear Sera’s plea in the Forgotten Village.' },
      { id: 'find_caspian', text: 'Follow the trail of broken lanterns into the Sunken Reliquary to locate Explorer Caspian.' },
      { id: 'report_sera', text: 'Return to Sera in Hollowbrook with word of Caspian’s safety.' }
    ]
  },
  {
    id: 'q_secret_house',
    title: 'The Secret House',
    isMain: false,
    giver: 'The Hermit of the Weeping Wall',
    region: 'Overgrown Caverns / Thorny Gardens Border',
    description:
      'Rumors speak of a reclusive lantern-smith living inside a concealed house behind dense hanging vines and a cracked stone wall in the eastern caverns. Discover the hidden entrance and bring warmth back to his hearth.',
    rewardText: 'Tempered Gloom-Cleaver (+35% Attack Damage)',
    stages: [
      { id: 'discover_house', text: 'Find and break the concealed vine-covered wall in the Whispering Rootway to enter the Secret House.' },
      { id: 'speak_hermit', text: 'Speak with Eamon the Recluse inside his hidden dwelling.' }
    ]
  },
  {
    id: 'q_shrine',
    title: 'The Forgotten Shrine',
    isMain: false,
    giver: 'Orin the Chronicler / Sealed Shrine Altar',
    region: 'Sanctum of Ash, Flooded Tunnels & Crystal Depths',
    description:
      'An ancient tripartite shrine in the Sanctum of Ash stands sealed behind harmonic locks. Three Verse Tablets—of Stone, Tides, and Starlight—were scattered across distant regions. Recover all three to unseal the shrine.',
    rewardText: '+1 Max Health Mask & Ancient Soul Vessel (+30 Max Soul)',
    stages: [
      { id: 'inspect_shrine', text: 'Examine the Sealed Shrine or speak with Orin about the Three Verse Tablets.' },
      { id: 'collect_tablets', text: 'Recover the Verse Tablets of Stone (Ruins), Tides (Flooded Tunnels), and Starlight (Crystal Depths).' },
      { id: 'unseal_shrine', text: 'Place the three tablets upon the Forgotten Shrine altar in the Sanctum of Ash.' }
    ]
  },
  {
    id: 'q_plants',
    title: 'The Strange Plants',
    isMain: false,
    giver: 'Sylas the Botanist (Briar Conservatory)',
    region: 'Flooded Tunnels, Crystal Depths & Thorny Gardens',
    description:
      'In his glass-domed laboratory inside the Thorny Gardens, Sylas studies how subterranean flora resist the Abyssal corruption. He needs three rare botanical specimens from three treacherous biomes.',
    rewardText: 'Cinder-Ward Mantle Blessing & 200 Lumen Shards',
    stages: [
      { id: 'talk_sylas', text: 'Speak with Sylas the Botanist in the Conservatory Lab.' },
      { id: 'gather_3_plants', text: 'Collect Azure Weep-Moss (Flooded Tunnels), Quartz-Petal Orchid (Crystal Depths), and Crimson Night-Briar (Thorny Gardens).' },
      { id: 'deliver_plants', text: 'Deliver all three specimens to Sylas.' }
    ]
  },
  {
    id: 'q_bridge',
    title: 'The Broken Bridge',
    isMain: false,
    giver: 'Bram the Tinker (Hollowbrook Bridgehead)',
    region: 'Forgotten Village & Crystal Depths',
    description:
      'The great suspension bridge spanning the chasm between Hollowbrook Village and the eastern sanctuaries was severed by the Pale Choir. Find a Dwarven Iron Winch-Gear in the Crystal Depths so Bram can restore the crossing and open a permanent shortcut.',
    rewardText: 'Permanent Village-to-Crystal Shortcut & 160 Lumen Shards',
    stages: [
      { id: 'talk_bram', text: 'Inspect the Broken Bridge in Hollowbrook and speak with Bram the Tinker.' },
      { id: 'find_gear', text: 'Retrieve the Dwarven Iron Winch-Gear from the Crystal Depths.' },
      { id: 'repair_bridge', text: 'Bring the Winch-Gear back to Bram to reconstruct the bridge.' }
    ]
  },
  {
    id: 'q_lights',
    title: 'The Mysterious Lights',
    isMain: false,
    giver: 'Strange Will-o-Wisps in the Gloaming Gallery',
    region: 'Crystal Depths & Deep Abyss Border',
    description:
      'Flickering cyan lights drift through an abandoned mining gallery between the Crystal Depths and the Abyss. Following their sequence without falling into the spike pits leads to a concealed chamber holding a piece of Liora’s past.',
    rewardText: 'Luminous Echo-Core & +1 Max Health Mask',
    stages: [
      { id: 'spot_lights', text: 'Encounter the Mysterious Lights in the Gloaming Gallery.' },
      { id: 'follow_lights_chamber', text: 'Follow the trail of wisps into the Whispering Vault and claim the Luminous Echo-Core.' }
    ]
  },
  {
    id: 'q_relic',
    title: 'The Lost Relic',
    isMain: false,
    giver: 'Vane the Antiquarian (Underground Curio Shop)',
    region: 'Forgotten Village & Sanctum Vault',
    description:
      'Vane the Antiquarian runs a hidden cellar shop in Hollowbrook. He asks you to brave the Hall of Pendulums in the upper ruins and recover the Chalice of the First Choir.',
    rewardText: '250 Lumen Shards & Soul-Catcher Charm (More Soul per Strike)',
    stages: [
      { id: 'talk_vane', text: 'Speak with Vane in his concealed Underground Shop.' },
      { id: 'retrieve_chalice', text: 'Navigate the trapped Hall of Relic Vaults and claim the Chalice of the First Choir.' },
      { id: 'return_vane', text: 'Deliver the Chalice to Vane.' }
    ]
  }
];

const NPC_DEFS = {
  orin: {
    id: 'orin',
    name: 'Orin the Chronicler',
    role: 'Keeper of the Sunken Annals',
    icon: '📜',
    voicePitch: 260,
    color: '#d4b886',
    getDialogue(state) {
      const cluesCount = Object.keys(state.inventory).filter(k => k.startsWith('clue_')).length;
      if (!state.npcMet.orin) {
        return {
          text: `"A surface-warden? By the embers... you carry the twin lantern of little Liora! Listen well, Kaelen: three nights ago, the Pale Choir dragged her down through this very sinkhole inside an Echo-Glass cage. They took her toward the Overgrown Caverns and Hollowbrook Village to unseal the Abyssal Conduit. Search for her dropped clues, and beware the Choir Seals blocking the Chasm."`,
          onOpen(game) {
            game.advanceQuest('q_main_rescue', 'find_first_clue');
            game.startQuest('q_shrine');
          },
          choices: [
            { label: 'Ask about the Sealed Shrine nearby', next: 'shrine_info' },
            { label: 'Where should I go first?', next: 'direction_info' },
            { label: 'Farewell', close: true }
          ]
        };
      }
      return {
        text: `"You have uncovered ${cluesCount} of Liora's 6 trail clues across Vespera. Remember: the Overgrown Caverns lie to the south-east where the Moth-Step Cloak rests, and the Forgotten Shrine in the next chamber awaits the Three Verse Tablets."`,
        choices: [
          { label: 'Tell me about the Forgotten Shrine', next: 'shrine_info' },
          { label: 'Where did the Pale Choir take Liora?', next: 'direction_info' },
          { label: 'Farewell', close: true }
        ]
      };
    },
    branches: {
      shrine_info: {
        text: `"The Forgotten Shrine in the eastern hall requires three Verse Tablets: one is hidden in our own Ruins Vault, one lies submerged in the Flooded Tunnels, and the last gleams atop the Crystal Depths. Unseal the shrine and its ancient vitality will strengthen your vessel."`,
        choices: [{ label: 'I will find the tablets', close: true }]
      },
      direction_info: {
        text: `"Head east through the Pillared Hall and drop into the Overgrown Caverns. There you will find the Moth-Step Cloak to dash across wide chasms, and a path leading up into Hollowbrook Village."`,
        choices: [{ label: 'Thank you, Orin', close: true }]
      }
    }
  },

  myra: {
    id: 'myra',
    name: 'Myra the Herbalist',
    role: 'Mycologist of the Spore-Weald',
    icon: '🍄',
    voicePitch: 390,
    color: '#6be3a2',
    getDialogue(state) {
      const q = state.quests.q_mushroom;
      if (!q || q.status === 'not_started') {
        return {
          text: `"Hush now, step lightly around the luminous spores! Oh—a traveler with an uncorrupted lantern. Did you see the hooded Choir pass through? The girl in their glass cage sang a note that made all my silver caps bloom at once! If you're heading into the Spore-Snare Tunnel to the east, could you bring me a Starlight Mycelium Cap? I'll brew you a Heart-Vessel draught in return!"`,
          onOpen(game) {
            game.startQuest('q_mushroom');
            game.advanceQuest('q_mushroom', 'talk_myra');
          },
          choices: [{ label: 'I will find the Starlight Mycelium Cap', close: true }]
        };
      }
      if (q.status === 'active' && state.inventory.rare_mushroom) {
        return {
          text: `"Marvellous! Look how the Starlight Mycelium Cap shimmers! Drink this distilled spore-nectar, Kaelen—it will permanently fortify your life mask and grant you 120 Lumen Shards from my pouch."`,
          onOpen(game) {
            game.advanceQuest('q_mushroom', 'return_myra');
            game.completeQuest('q_mushroom', { maxHp: 1, lumens: 120 });
          },
          choices: [{ label: 'Drink the Elixir (+1 Max Health)', close: true }]
        };
      }
      if (q.status === 'completed') {
        return {
          text: `"May the spores light your descent, Kaelen. Your sister left a Chipped Tuning Shard near the Brood-Stalker's lair—she never lost hope that you would follow."`,
          choices: [{ label: 'Farewell, Myra', close: true }]
        };
      }
      return {
        text: `"The Starlight Mycelium Cap grows at the far end of the Spore-Snare Tunnel, just east of this grotto. Watch out for the thorny creepers and crumbling moss ledges!"`,
        choices: [{ label: 'I am still searching', close: true }]
      };
    }
  },

  sera: {
    id: 'sera',
    name: 'Sera the Cartographer',
    role: 'Surveyor of Hollowbrook',
    icon: '🧭',
    voicePitch: 360,
    color: '#79c8ff',
    getDialogue(state) {
      const q = state.quests.q_explorer;
      if (!q || q.status === 'not_started') {
        return {
          text: `"Welcome to what remains of Hollowbrook Village, stranger. When the Pale Choir marched through carrying that poor girl in the Echo-Glass cage, my partner Caspian followed them toward the lower Ruins & Sunken Reliquary—and hasn't returned! Please, if you explore the lower catacombs, look for his brass astrolabe and bring him home."`,
          onOpen(game) {
            game.startQuest('q_explorer');
            game.advanceQuest('q_explorer', 'talk_sera');
          },
          choices: [{ label: 'I will search for Caspian', close: true }]
        };
      }
      if (q.status === 'active' && state.inventory.explorer_medallion) {
        return {
          text: `"Caspian's Brass Astrolabe! He's alive down by the Sunken Sluice? Thank the ancients! Take this Tarnished Cellar Key and 150 Lumen Shards—it unlocks the drainage grate beneath our village square."`,
          onOpen(game) {
            game.advanceQuest('q_explorer', 'report_sera');
            game.giveItem('cellar_key');
            game.completeQuest('q_explorer', { lumens: 150 });
          },
          choices: [{ label: 'Accept Key & Shards', close: true }]
        };
      }
      if (q.status === 'completed') {
        return {
          text: `"Caspian made it back safely and is resting inside our loft. Use the Tarnished Cellar Key on the drainage gate below the village to reach the Flooded Tunnels swiftly!"`,
          choices: [{ label: 'Thank you, Sera', close: true }]
        };
      }
      return {
        text: `"Caspian went down toward the lower Catacombs between the Sanctum of Ash and the Flooded Tunnels. Look for his blue signal lantern!"`,
        choices: [{ label: 'I will find him', close: true }]
      };
    }
  },

  caspian: {
    id: 'caspian',
    name: 'Explorer Caspian',
    role: 'Lost Delver of Hollowbrook',
    icon: '🔦',
    voicePitch: 240,
    color: '#6ec2ff',
    getDialogue(state) {
      if (!state.inventory.explorer_medallion) {
        return {
          text: `"Cough—by the deep tides, a friendly face! A collapsing bridge trapped me in this alcove while I was tracking the Pale Choir's barge. They ferried your sister across the Flooded Sluice! Take my Brass Astrolabe back to Sera in Hollowbrook so she knows I live, and I'll climb out via the rope shaft you just cleared!"`,
          onOpen(game) {
            game.startQuest('q_explorer');
            game.giveItem('explorer_medallion');
            game.advanceQuest('q_explorer', 'find_caspian');
          },
          choices: [{ label: "Take Caspian's Astrolabe", close: true }]
        };
      }
      return {
        text: `"Give my Astrolabe to Sera in Hollowbrook Village! And look closely at the Sunken Reliquary ahead—the Mantis Talons rest there, allowing you to scale vertical walls."`,
        choices: [{ label: 'Stay safe, Caspian', close: true }]
      };
    }
  },

  bram: {
    id: 'bram',
    name: 'Bram the Tinker',
    role: 'Bridgewright of Hollowbrook',
    icon: '⚙',
    voicePitch: 210,
    color: '#f3a847',
    getDialogue(state) {
      const q = state.quests.q_bridge;
      if (!q || q.status === 'not_started') {
        return {
          text: `"Curse those Choir zealots! After hauling their glass cage across Hollowbrook Chasm, they smashed my suspension winch so nobody could follow 'em directly into the Crystal Depths! If you find a Dwarven Iron Winch-Gear in the Crystal Foundry by going the long route through the Flooded Tunnels, I'll rebuild this bridge better than new!"`,
          onOpen(game) {
            game.startQuest('q_bridge');
            game.advanceQuest('q_bridge', 'talk_bram');
          },
          choices: [{ label: 'I will look for the Winch-Gear', close: true }]
        };
      }
      if (q.status === 'active' && state.inventory.bridge_pinion) {
        return {
          text: `"A genuine Dwarven Iron Winch-Gear! Stand back while I bolt her into the housing... *CLANG-WHIRRRR!* Ha! The Hollowbrook Great Bridge is whole again! Now you have a direct high-road between the Village and the Crystal Depths. Take these 160 Lumen Shards for your trouble!"`,
          onOpen(game) {
            game.advanceQuest('q_bridge', 'repair_bridge');
            game.worldFlags.bridgeRepaired = true;
            game.completeQuest('q_bridge', { lumens: 160 });
          },
          choices: [{ label: 'Cross the Restored Bridge!', close: true }]
        };
      }
      if (q.status === 'completed') {
        return {
          text: `"She holds taut as iron! Cross between Hollowbrook and the Crystal Depths whenever you please, Warden."`,
          choices: [{ label: 'Fine craftsmanship, Bram', close: true }]
        };
      }
      return {
        text: `"You'll need to take the lower route through the Flooded Tunnels to reach the Crystal Depths first, then bring me back an Iron Winch-Gear so I can drop the bridge!"`,
        choices: [{ label: 'Understood', close: true }]
      };
    }
  },

  vane: {
    id: 'vane',
    name: 'Vane the Antiquarian',
    role: 'Curator of the Concealed Cellar Shop',
    icon: '🏺',
    voicePitch: 290,
    color: '#c996ff',
    isMerchant: true,
    getDialogue(state) {
      const q = state.quests.q_relic;
      if (q && q.status === 'active' && state.inventory.lost_relic) {
        return {
          text: `"My word... the Chalice of the First Choir, unmarred after centuries in the Vault of Pendulums! You have the agility of a phantom, Kaelen. Accept 250 Lumen Shards and my Soul-Catcher Charm—your blade will draw far more Soul from every strike!"`,
          onOpen(game) {
            game.advanceQuest('q_relic', 'return_vane');
            game.worldFlags.soulCatcher = true;
            game.completeQuest('q_relic', { lumens: 250 });
          },
          choices: [{ label: 'Browse Curio Wares', close: false, next: 'shop' }, { label: 'Leave', close: true }]
        };
      }
      if (!q || q.status === 'not_started') {
        return {
          text: `"Ah, few travelers ever find the hidden hatch into my cellar emporium! I trade in ancient vessels and charms for Lumen Shards. Say—if you brave the Vault of Relic Traps in the upper Sanctum of Ash and retrieve the Chalice of the First Choir, I will reward you handsomely."`,
          onOpen(game) {
            game.startQuest('q_relic');
            game.advanceQuest('q_relic', 'talk_vane');
          },
          choices: [{ label: 'Leave', close: true }]
        };
      }
      return {
        text: `"Welcome back to the Cellar Emporium, Kaelen. Spend your Lumen Shards wisely—the deeper strata show no mercy."`,
        choices: [{ label: 'Leave Shop', close: true }]
      };
    }
  },

  eamon: {
    id: 'eamon',
    name: 'Eamon the Recluse',
    role: 'Master Bladesmith of the Secret House',
    icon: '🔥',
    voicePitch: 195,
    color: '#ff9d5c',
    getDialogue(state) {
      if (!state.worldFlags.bladeTempered) {
        return {
          text: `"Well! Nobody has parted the false briar-wall of my Secret House in twenty winters! You carry a surface Warden's Gloom-Cleaver... and you seek the Echo-Weaver girl stolen by Malakor? Lay your blade upon my anvil. I will fold star-iron into its edge free of charge!"`,
          onOpen(game) {
            game.startQuest('q_secret_house');
            game.advanceQuest('q_secret_house', 'discover_house');
            game.advanceQuest('q_secret_house', 'speak_hermit');
            game.worldFlags.bladeTempered = true;
            game.completeQuest('q_secret_house', { attackBonus: 1 });
          },
          choices: [{ label: 'Receive Tempered Gloom-Cleaver (+35% Damage)', close: true }]
        };
      }
      return {
        text: `"Your Gloom-Cleaver sings with star-iron now. Strike true when you face the Archon in the Abyss."`,
        choices: [{ label: 'Thank you, Master Eamon', close: true }]
      };
    }
  },

  sylas: {
    id: 'sylas',
    name: 'Sylas the Botanist',
    role: 'Keeper of the Briar Conservatory',
    icon: '🌿',
    voicePitch: 310,
    color: '#7bf28b',
    getDialogue(state) {
      const q = state.quests.q_plants;
      const hasAll = state.inventory.plant_glowmoss && state.inventory.plant_crystalbloom && state.inventory.plant_dewthorn;
      if (!q || q.status === 'not_started') {
        return {
          text: `"Fascinating! You made it into my glasshouse amidst the Thorny Gardens! I saw the Pale Choir carry Liora past the lower root-bridge. If you wish to survive the deepest bramble-pits, help me complete my synthesis: bring me Azure Weep-Moss from the Flooded Tunnels, a Quartz-Petal Orchid from the Crystal Depths, and a Crimson Night-Briar from the eastern canopy."`,
          onOpen(game) {
            game.startQuest('q_plants');
            game.advanceQuest('q_plants', 'talk_sylas');
          },
          choices: [{ label: 'I will gather the three specimens', close: true }]
        };
      }
      if (q.status === 'active' && hasAll) {
        return {
          text: `"All three rare specimens—Azure Weep-Moss, Quartz-Petal Orchid, and Crimson Night-Briar! Behold the completed distillation: it weaves the Cinder-Ward Mantle around your cloak, rendering you completely immune to poisonous thorns and caustic mire, plus 200 Lumen Shards!"`,
          onOpen(game) {
            game.advanceQuest('q_plants', 'gather_3_plants');
            game.advanceQuest('q_plants', 'deliver_plants');
            game.unlockAbility('thornWard');
            game.completeQuest('q_plants', { lumens: 200 });
          },
          choices: [{ label: 'Don the Cinder-Ward Mantle!', close: true }]
        };
      }
      if (q.status === 'completed') {
        return {
          text: `"With the Cinder-Ward Mantle, neither poisonous briars nor acid pools can harm you. Cross the Thorn Sanctum to the east and claim the Third Choir Seal!"`,
          choices: [{ label: 'Farewell, Sylas', close: true }]
        };
      }
      return {
        text: `"You currently hold ${[state.inventory.plant_glowmoss, state.inventory.plant_crystalbloom, state.inventory.plant_dewthorn].filter(Boolean).length} of the 3 required botanical specimens. Check the Flooded Tunnels, Crystal Depths, and Eastern Thorny Canopy!"`,
        choices: [{ label: 'Continue the search', close: true }]
      };
    }
  },

  liora: {
    id: 'liora',
    name: 'Liora the Echo-Weaver',
    role: 'Your Rescued Sister',
    icon: '✨',
    voicePitch: 440,
    color: '#8df6fa',
    getDialogue(state) {
      return {
        text: `"Kaelen! You followed every ribbon, shard, and song I left behind in the dark... When Archon Malakor locked me inside the Echo-Glass Cage, I knew the Gloom-Cleaver and your lantern would find a way through the seven strata. The Abyssal Conduit is calm now—we can return home whenever you are ready!"`,
        onOpen(game) {
          game.triggerRescueVictory();
        },
        choices: [{ label: 'Celebrate the Rescue!', close: true }]
      };
    }
  }
};

const SHOP_ITEMS = [
  {
    id: 'shop_mask_1',
    name: 'Vessel Mask Shard',
    cost: 120,
    desc: 'Permanently increases your Maximum Health by +1 Mask.',
    apply(game) {
      game.player.maxHp += 1;
      game.player.hp = game.player.maxHp;
    }
  },
  {
    id: 'shop_soul_1',
    name: 'Astral Lantern Phial',
    cost: 140,
    desc: 'Permanently increases Maximum Soul capacity by +35 and refills Soul.',
    apply(game) {
      game.player.maxSoul += 35;
      game.player.soul = game.player.maxSoul;
    }
  },
  {
    id: 'shop_lantern_lens',
    name: 'Prismatic Lantern Lens',
    cost: 110,
    desc: 'Expands your Soul-Lantern light radius by 40% and reveals faint secret walls nearby.',
    apply(game) {
      game.state.worldFlags.lanternUpgraded = true;
    }
  },
  {
    id: 'shop_swift_anklet',
    name: 'Wind-Woven Anklet',
    cost: 160,
    desc: 'Increases movement speed by 15% and reduces Dash cooldown.',
    apply(game) {
      game.state.worldFlags.swiftAnklet = true;
    }
  }
];


// === FILE: src/world_data.js ===
// Complete Interconnected World Map of VESPERA (7 Biomes, 24 Handcrafted Multi-Route Chambers)
// Standard Room Coordinate Space: width = 1600, height = 960.
// Floor baseline is y = 880 (thickness 80). Ceiling is y = 0..50.

const BIOMES = {
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

const ROOMS = {
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


// === FILE: src/save_system.js ===
// Persistent Save & Load System for VESPERA: Echoes of the Undercroft

const SAVE_KEY = 'vespera_undercroft_save_v1';

function createInitialState() {
  return {
    version: 1,
    timestamp: Date.now(),
    playTimeSeconds: 0,
    lumens: 0,
    maxHp: 5,
    maxSoul: 100,
    abilities: {
      slash: true,
      dash: false,
      wallJump: false,
      doubleJump: false,
      heavySlash: false,
      thornWard: false
    },
    inventory: {},
    collectedMapItems: {},
    brokenWalls: {},
    defeatedBosses: {},
    discoveredRooms: {
      ruins_sinkhole: true
    },
    npcMet: {},
    shopPurchased: {},
    worldFlags: {
      bridgeRepaired: false,
      bladeTempered: false,
      lanternUpgraded: false,
      swiftAnklet: false,
      soulCatcher: false,
      shrineUnsealed: false,
      cageShattered: false,
      lioraRescued: false
    },
    quests: {
      q_main_rescue: {
        status: 'active',
        completedStages: {}
      }
    },
    checkpoint: {
      roomId: 'ruins_sinkhole',
      x: 310,
      y: 820,
      name: 'Sinkhole Brazier'
    }
  };
}

class SaveSystem {
  static hasSave() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch (e) {
      return false;
    }
  }

  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const base = createInitialState();
      return {
        ...base,
        ...parsed,
        abilities: { ...base.abilities, ...(parsed.abilities || {}) },
        worldFlags: { ...base.worldFlags, ...(parsed.worldFlags || {}) },
        checkpoint: { ...base.checkpoint, ...(parsed.checkpoint || {}) }
      };
    } catch (e) {
      return null;
    }
  }

  static save(state) {
    try {
      state.timestamp = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  static clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      // ignore
    }
  }
}


// === FILE: src/entities.js ===
// Player, Enemies, Bosses, Hazards, Projectiles, and Particle Systems


class Player {
  constructor() {
    this.x = 180;
    this.y = 820;
    this.w = 28;
    this.h = 46;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.hp = 5;
    this.maxHp = 5;
    this.soul = 50;
    this.maxSoul = 100;

    // Ground & Air states
    this.onGround = false;
    this.onSlippery = false;
    this.coyoteTimer = 0;
    this.jumpBuffer = 0;
    this.canDoubleJump = false;
    this.wallSide = 0; // -1 left wall, 1 right wall
    this.wallJumpLock = 0;

    // Dash
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.canAirDash = true;

    // Combat
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.attackDir = 'side'; // 'side', 'up', 'down'
    this.heavyTimer = 0;
    this.heavyCooldown = 0;
    this.invulnTimer = 0;
    this.hurtTimer = 0;

    // Animation
    this.animTime = 0;
    this.walkCycle = 0;
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.healAnimTimer = 0;
    this.capeHistory = [];
  }

  resetAt(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.dashTimer = 0;
    this.attackTimer = 0;
    this.heavyTimer = 0;
    this.invulnTimer = 0.8;
  }

  getAttackBox() {
    if (this.heavyTimer > 0) {
      return {
        x: this.facing > 0 ? this.x + this.w - 6 : this.x - 92,
        y: this.y - 16,
        w: 98,
        h: this.h + 28,
        isHeavy: true,
        damage: 28
      };
    }
    if (this.attackTimer <= 0) return null;
    if (this.attackDir === 'up') {
      return {
        x: this.x - 18,
        y: this.y - 54,
        w: this.w + 36,
        h: 56,
        isHeavy: false,
        damage: 14
      };
    }
    if (this.attackDir === 'down') {
      return {
        x: this.x - 16,
        y: this.y + this.h - 4,
        w: this.w + 32,
        h: 52,
        isHeavy: false,
        damage: 14
      };
    }
    return {
      x: this.facing > 0 ? this.x + this.w - 4 : this.x - 62,
      y: this.y + 2,
      w: 66,
      h: this.h - 6,
      isHeavy: false,
      damage: 14
    };
  }

  update(dt, input, game) {
    this.animTime += dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.heavyCooldown > 0) this.heavyCooldown -= dt;
    if (this.wallJumpLock > 0) this.wallJumpLock -= dt;
    if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;

    const hasSwift = !!game.state.worldFlags.swiftAnklet;
    const maxSpeed = hasSwift ? 310 : 270;
    const gravity = 1350;

    // Record cape trail
    this.capeHistory.unshift({ x: this.x + this.w / 2, y: this.y + 18, facing: this.facing });
    if (this.capeHistory.length > 8) this.capeHistory.pop();

    // Animation decay & interpolation
    this.scaleX += (1.0 - this.scaleX) * Math.min(1, dt * 14);
    this.scaleY += (1.0 - this.scaleY) * Math.min(1, dt * 14);
    if (this.healAnimTimer > 0) this.healAnimTimer -= dt;
    if (this.onGround && Math.abs(this.vx) > 15) {
      this.walkCycle += dt * 14;
    } else {
      this.walkCycle += (0 - this.walkCycle) * Math.min(1, dt * 10);
    }

    // Focus Heal
    if (input.justPressed('heal') && this.soul >= 35 && this.hp < this.maxHp) {
      this.soul -= 35;
      this.hp = Math.min(this.maxHp, this.hp + 1);
      this.healAnimTimer = 0.65;
      audio.heal();
      game.spawnParticles(this.x + this.w / 2, this.y + this.h / 2, '#5ce1e6', 22, 130);
      game.updateHud();
    }

    // Dash Initiation
    if (
      input.justPressed('dash') &&
      game.hasAbility('dash') &&
      this.dashCooldown <= 0 &&
      (this.onGround || this.canAirDash)
    ) {
      this.dashTimer = 0.17;
      this.dashCooldown = hasSwift ? 0.38 : 0.50;
      this.scaleX = 1.35;
      this.scaleY = 0.72;
      if (!this.onGround) this.canAirDash = false;
      if (game.hasAbility('thornWard')) {
        this.invulnTimer = Math.max(this.invulnTimer, 0.22);
      }
      this.vx = this.facing * 640;
      this.vy = 0;
      audio.dash();
      game.spawnParticles(this.x + this.w / 2, this.y + this.h / 2, '#8df6fa', 12, 95);
    }

    // Active Dash
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.facing * 640;
      this.vy = 0;
      if (Math.random() < 0.7) {
        game.spawnParticles(
          this.x + this.w / 2,
          this.y + this.h / 2,
          game.hasAbility('thornWard') ? '#b174f2' : '#5ce1e6',
          2,
          40
        );
      }
    } else {
      // Horizontal movement
      let moveDir = 0;
      if (input.isDown('left')) moveDir -= 1;
      if (input.isDown('right')) moveDir += 1;

      if (this.wallJumpLock <= 0) {
        if (moveDir !== 0) {
          this.facing = moveDir;
          const accel = this.onGround ? (this.onSlippery ? 900 : 2400) : 1650;
          this.vx += moveDir * accel * dt;
          if (Math.abs(this.vx) > maxSpeed) {
            this.vx = moveDir * maxSpeed;
          }
        } else {
          const friction = this.onGround ? (this.onSlippery ? 420 : 2200) : 1100;
          if (Math.abs(this.vx) <= friction * dt) {
            this.vx = 0;
          } else {
            this.vx -= Math.sign(this.vx) * friction * dt;
          }
        }
      }

      // Gravity & Wall Slide
      this.vy += gravity * dt;
      if (
        !this.onGround &&
        this.wallSide !== 0 &&
        this.vy > 0 &&
        game.hasAbility('wallJump') &&
        ((this.wallSide === -1 && input.isDown('left')) || (this.wallSide === 1 && input.isDown('right')))
      ) {
        this.vy = Math.min(this.vy, 130);
        if (Math.random() < 0.35) {
          game.spawnParticles(
            this.wallSide === -1 ? this.x : this.x + this.w,
            this.y + 20,
            '#d4b886',
            1,
            25
          );
        }
      } else {
        this.vy = Math.min(this.vy, 760);
      }
    }

    // Jump Buffering
    if (input.justPressed('jump')) {
      this.jumpBuffer = 0.12;
    }

    if (this.jumpBuffer > 0) {
      if (this.coyoteTimer > 0) {
        // Normal or Coyote Jump
        this.vy = -565;
        this.scaleY = 1.25;
        this.scaleX = 0.8;
        this.onGround = false;
        this.coyoteTimer = 0;
        this.jumpBuffer = 0;
        this.dashTimer = 0;
        audio.jump();
        game.spawnParticles(this.x + this.w / 2, this.y + this.h, '#d4b886', 7, 65);
      } else if (this.wallSide !== 0 && game.hasAbility('wallJump')) {
        // Wall Jump
        this.vy = -540;
        this.scaleY = 1.28;
        this.scaleX = 0.78;
        this.vx = -this.wallSide * 320;
        this.facing = -this.wallSide;
        this.wallJumpLock = 0.15;
        this.jumpBuffer = 0;
        this.canDoubleJump = game.hasAbility('doubleJump');
        audio.wallJump();
        game.spawnParticles(
          this.wallSide === -1 ? this.x : this.x + this.w,
          this.y + this.h / 2,
          '#8df6fa',
          10,
          90
        );
      } else if (this.canDoubleJump && game.hasAbility('doubleJump')) {
        // Double Jump (Zephyr Plume)
        this.vy = -535;
        this.scaleY = 1.32;
        this.scaleX = 0.76;
        this.canDoubleJump = false;
        this.jumpBuffer = 0;
        audio.doubleJump();
        game.spawnParticles(this.x + this.w / 2, this.y + this.h, '#d27eff', 14, 110);
      }
    }

    // Variable Jump Height when releasing Jump button early
    if (!input.isDown('jump') && this.vy < -220) {
      this.vy *= 0.62;
    }

    // Attacks
    if (input.justPressed('attack') && this.attackCooldown <= 0 && this.heavyTimer <= 0) {
      this.attackTimer = 0.15;
      this.attackCooldown = 0.25;
      if (input.isDown('up')) {
        this.attackDir = 'up';
      } else if (input.isDown('down') && !this.onGround) {
        this.attackDir = 'down';
      } else {
        this.attackDir = 'side';
      }
      audio.slash();
      this.hitTargetsThisSwing = new Set();
    }

    // Resonance Heavy Strike
    if (
      input.justPressed('heavy') &&
      game.hasAbility('heavySlash') &&
      this.heavyCooldown <= 0 &&
      this.attackTimer <= 0
    ) {
      this.heavyTimer = 0.26;
      this.heavyCooldown = 0.65;
      audio.heavySlash();
      this.hitTargetsThisSwing = new Set();
      game.addScreenShake(5, 0.18);
      game.spawnParticles(
        this.facing > 0 ? this.x + this.w + 25 : this.x - 25,
        this.y + 20,
        '#d27eff',
        16,
        130
      );
    }

    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.heavyTimer > 0) this.heavyTimer -= dt;

    // Move & Collide X
    this.x += this.vx * dt;
    this.wallSide = 0;
    const solids = game.getSolidPlatforms();
    for (const p of solids) {
      if (p.oneWay) continue;
      if (rectOverlap(this, p)) {
        if (this.vx > 0) {
          this.x = p.x - this.w;
          this.wallSide = 1;
        } else if (this.vx < 0) {
          this.x = p.x + p.w;
          this.wallSide = -1;
        }
        this.vx = 0;
      }
    }

    // Also detect adjacent wall within 3px for responsive Wall Jump
    if (!this.onGround && this.wallSide === 0) {
      for (const p of solids) {
        if (p.oneWay) continue;
        if (this.y + this.h > p.y + 6 && this.y < p.y + p.h - 6) {
          if (Math.abs(this.x + this.w - p.x) <= 4) this.wallSide = 1;
          else if (Math.abs(this.x - (p.x + p.w)) <= 4) this.wallSide = -1;
        }
      }
    }

    // Move & Collide Y
    const prevBottom = this.y + this.h;
    this.y += this.vy * dt;
    this.onGround = false;
    this.onSlippery = false;

    for (const p of solids) {
      if (p.oneWay) {
        // One-way platform: only collide when falling from above and not holding down+jump
        if (
          this.vy >= 0 &&
          prevBottom <= p.y + 12 &&
          !(input.isDown('down') && input.isDown('jump')) &&
          rectOverlap(this, p)
        ) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.onGround = true;
        }
        continue;
      }
      if (rectOverlap(this, p)) {
        if (this.vy >= 0) {
          if (this.vy > 140) {
            this.scaleY = 0.78;
            this.scaleX = 1.22;
          }
          this.y = p.y - this.h;
          this.vy = 0;
          this.onGround = true;
          if (p.slippery) this.onSlippery = true;
          if (p.isMoving) {
            this.x += p.CarryDx || 0;
          }
          if (p.onStep) p.onStep();
        } else if (this.vy < 0) {
          this.y = p.y + p.h;
          this.vy = 0;
        }
      }
    }

    if (this.onGround) {
      this.coyoteTimer = 0.11;
      this.canDoubleJump = game.hasAbility('doubleJump');
      this.canAirDash = true;
    }
  }
}

class Enemy {
  constructor(def) {
    this.type = def.type;
    this.x = def.x;
    this.y = def.y;
    this.startX = def.x;
    this.startY = def.y;
    this.patrol = def.patrol || [def.x - 100, def.x + 100];
    this.vx = 65;
    this.vy = 0;
    this.facing = 1;
    this.dead = false;
    this.hurtFlash = 0;
    this.timer = Math.random() * 4;
    this.state = 'patrol';
    this.stateTimer = 0;
    this.walkCycle = Math.random() * 10;
    this.wingCycle = Math.random() * 10;
    this.breathCycle = Math.random() * 10;
    this.isAlert = false;

    // Configure per type
    switch (this.type) {
      case 'crawler':
        this.w = 34;
        this.h = 26;
        this.hp = 28;
        this.maxHp = 28;
        this.speed = 75;
        break;
      case 'bat':
        this.w = 32;
        this.h = 26;
        this.hp = 24;
        this.maxHp = 24;
        this.speed = 110;
        this.flying = true;
        break;
      case 'sentinel':
        this.w = 34;
        this.h = 48;
        this.hp = 52;
        this.maxHp = 52;
        this.speed = 85;
        break;
      case 'sporeling':
        this.w = 32;
        this.h = 34;
        this.hp = 36;
        this.maxHp = 36;
        this.speed = 80;
        break;
      case 'thumper':
        this.w = 44;
        this.h = 52;
        this.hp = 72;
        this.maxHp = 72;
        this.speed = 65;
        break;
      case 'lurker':
        this.w = 38;
        this.h = 34;
        this.hp = 45;
        this.maxHp = 45;
        this.speed = 95;
        break;
      case 'crystal_golem':
        this.w = 42;
        this.h = 54;
        this.hp = 80;
        this.maxHp = 80;
        this.speed = 60;
        break;
      case 'wisp':
        this.w = 28;
        this.h = 28;
        this.hp = 38;
        this.maxHp = 38;
        this.speed = 95;
        this.flying = true;
        break;
      case 'void_knight':
        this.w = 38;
        this.h = 54;
        this.hp = 95;
        this.maxHp = 95;
        this.speed = 110;
        break;
      default:
        this.w = 32;
        this.h = 32;
        this.hp = 30;
        this.maxHp = 30;
        this.speed = 75;
    }
  }

  update(dt, game) {
    if (this.dead) return;
    this.timer += dt;
    this.walkCycle += dt * (Math.abs(this.vx) * 0.12 + 6);
    this.wingCycle += dt * 18;
    this.breathCycle += dt * 2.8;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;

    const player = game.player;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.isAlert = dist < 260;

    if (this.flying) {
      // Flying movement
      this.x += this.facing * this.speed * dt;
      if (this.x < this.patrol[0]) {
        this.x = this.patrol[0];
        this.facing = 1;
      } else if (this.x > this.patrol[1]) {
        this.x = this.patrol[1];
        this.facing = -1;
      }
      this.y = this.startY + Math.sin(this.timer * 3.2) * 28;

      // Wisp shoots an orb occasionally
      if (this.type === 'wisp' && dist < 440 && Math.floor(this.timer * 10) % 28 === 0) {
        if (!this.shotCooldown || this.timer - this.shotCooldown > 2.4) {
          this.shotCooldown = this.timer;
          const ang = Math.atan2(dy, dx);
          game.projectiles.push({
            x: this.x + this.w / 2,
            y: this.y + this.h / 2,
            vx: Math.cos(ang) * 230,
            vy: Math.sin(ang) * 230,
            r: 7,
            color: '#d27eff',
            life: 3.0
          });
        }
      }
    } else {
      // Ground enemy patrol + aggro speed boost
      const aggro = dist < 260 && Math.abs(dy) < 90 ? 1.35 : 1.0;
      this.x += this.facing * this.speed * aggro * dt;
      if (this.x < this.patrol[0]) {
        this.x = this.patrol[0];
        this.facing = 1;
      } else if (this.x > this.patrol[1]) {
        this.x = this.patrol[1];
        this.facing = -1;
      }

      // Crystal golem ranged shard
      if (this.type === 'crystal_golem' && dist < 420) {
        if (!this.shotCooldown || this.timer - this.shotCooldown > 2.8) {
          this.shotCooldown = this.timer;
          const dir = dx >= 0 ? 1 : -1;
          this.facing = dir;
          game.projectiles.push({
            x: this.x + this.w / 2,
            y: this.y + 18,
            vx: dir * 260,
            vy: -30,
            r: 8,
            color: '#5ce1e6',
            life: 2.5
          });
        }
      }
    }
  }
}

class Boss {
  constructor(def) {
    this.id = def.id;
    this.name = def.name;
    this.subtitle = def.subtitle;
    this.type = def.type;
    this.x = def.x;
    this.y = def.y;
    this.startY = def.y;
    this.w = 64;
    this.h = 74;
    this.vx = 0;
    this.vy = 0;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.facing = -1;
    this.timer = 0;
    this.actionTimer = 1.5;
    this.phase = 'idle';
    this.hurtFlash = 0;
    this.dead = false;
  }

  update(dt, game) {
    if (this.dead) return;
    this.timer += dt;
    this.actionTimer -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;

    const p = game.player;
    const dx = p.x - this.x;

    if (this.actionTimer <= 0) {
      this.facing = dx >= 0 ? 1 : -1;
      const roll = Math.random();
      if (roll < 0.45) {
        // Dash / Charge across arena
        this.phase = 'charge';
        this.vx = this.facing * (this.type === 'boss_archon' ? 420 : 340);
        this.actionTimer = 1.3;
      } else if (roll < 0.78) {
        // Leap & Slam
        this.phase = 'leap';
        this.vy = -540;
        this.vx = this.facing * 240;
        this.actionTimer = 1.6;
      } else {
        // Radial Barrage
        this.phase = 'cast';
        this.vx = 0;
        this.actionTimer = 1.5;
        const count = this.type === 'boss_archon' ? 7 : 5;
        for (let i = 0; i < count; i++) {
          const angle = -Math.PI + (Math.PI * i) / (count - 1);
          game.projectiles.push({
            x: this.x + this.w / 2,
            y: this.y + 24,
            vx: Math.cos(angle) * 250,
            vy: Math.sin(angle) * 250,
            r: 9,
            color: this.type === 'boss_stalker' ? '#56d38a' : this.type === 'boss_prism' ? '#d27eff' : '#e05368',
            life: 3.2
          });
        }
      }
    }

    // Physics
    this.vy += 1100 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Arena bounds
    if (this.x < 140) {
      this.x = 140;
      this.vx = Math.abs(this.vx) * 0.5;
    }
    if (this.x > 1380) {
      this.x = 1380;
      this.vx = -Math.abs(this.vx) * 0.5;
    }
    if (this.y >= 880 - this.h) {
      if (this.vy > 300) {
        game.addScreenShake(6, 0.2);
      }
      this.y = 880 - this.h;
      this.vy = 0;
      if (this.phase === 'leap') this.vx *= 0.4;
    }
  }
}

function rectOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}


// === FILE: src/renderer.js ===
// High-Resolution Atmospheric Renderer, Dreamlike Lighting, Prop Artist, and World Atlas


// Safe Canvas roundRect polyfill
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r = 0) {
    const radius = typeof r === 'number' ? r : (r[0] || 0);
    this.beginPath();
    this.moveTo(x + radius, y);
    this.lineTo(x + w - radius, y);
    this.quadraticCurveTo(x + w, y, x + w, y + radius);
    this.lineTo(x + w, y + h - radius);
    this.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    this.lineTo(x + radius, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
    return this;
  };
}

class Renderer {
  constructor(canvas, minimapCanvas, atlasCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimapCanvas = minimapCanvas;
    this.mmCtx = minimapCanvas.getContext('2d');
    this.atlasCanvas = atlasCanvas;
    this.atlasCtx = atlasCanvas.getContext('2d');

    // Offscreen lightmap canvas for localized pools of light
    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = canvas.width;
    this.lightCanvas.height = canvas.height;
    this.lightCtx = this.lightCanvas.getContext('2d');

    // Ambient background critters (tiny glowing beetles & cave moths)
    this.critters = Array.from({ length: 22 }, (_, i) => ({
      x: (i * 137) % 1600,
      y: 100 + ((i * 281) % 760),
      phase: i * 0.85,
      speed: 12 + (i % 6) * 5,
      size: 1.8 + (i % 3) * 0.7
    }));

    // Floating dream dust particles
    this.dreamDust = Array.from({ length: 35 }, (_, i) => ({
      x: (i * 197) % 1600,
      y: (i * 149) % 960,
      radius: 1.2 + (i % 4) * 0.6,
      vx: 6 + (i % 4) * 4,
      vy: -8 - (i % 5) * 5,
      pulse: i * 0.5
    }));

    // Atmospheric Paranoia: Watcher Eyes in crevices & Stalking Gloam Prowler
    this.currentRoomEyesId = null;
    this.watcherEyes = [];
    this.stalkingPhantom = null;
    this.shadowParticles = [];
  }

  initRoomAtmosphere(room, game) {
    this.currentRoomEyesId = room.id;
    this.watcherEyes = [];
    this.stalkingPhantom = null;

    // Create 6-10 pairs of watcher eyes nestled in dark crevices & platform undersides
    const platforms = room.platforms || [];
    let eyeIndex = 0;
    for (const p of platforms) {
      if (p.w >= 60 && !p.oneWay) {
        // Place in dark underhang or edge
        const ey = p.y + p.h + 6;
        if (ey < 920 && eyeIndex < 9) {
          const ex = p.x + 24 + ((eyeIndex * 73) % Math.max(20, p.w - 48));
          this.watcherEyes.push({
            x: ex,
            y: ey,
            spacing: 6 + (eyeIndex % 3) * 1.5,
            size: 2.2 + (eyeIndex % 3) * 0.6,
            irisColor: eyeIndex % 3 === 0 ? '#ffea78' : eyeIndex % 3 === 1 ? '#6ee68e' : '#c49bff',
            alpha: 0,
            targetAlpha: 0.8 + (eyeIndex % 4) * 0.05,
            fearRadius: 160 + (eyeIndex % 3) * 35,
            blinkTimer: 0,
            blinkDuration: 0.18,
            nextBlink: 2.0 + (eyeIndex * 1.3) % 4.5,
            isBlinking: false
          });
          eyeIndex++;
        }
      }
    }

    // High background crevice eyes
    if (room.props) {
      for (const prop of room.props) {
        if (prop.type === 'pillar' && eyeIndex < 12) {
          this.watcherEyes.push({
            x: prop.x,
            y: Math.max(60, prop.y - (prop.h || 380) + 40),
            spacing: 8,
            size: 2.6,
            irisColor: '#ffdd6b',
            alpha: 0,
            targetAlpha: 0.88,
            fearRadius: 210,
            blinkTimer: 0,
            blinkDuration: 0.16,
            nextBlink: 1.8,
            isBlinking: false
          });
          eyeIndex++;
        }
      }
    }

    // Stalking Gloam Prowler (watcher phantom on high distant ledge)
    if (!room.isBossRoom && platforms.length > 2) {
      // Find an elevated platform
      const upperPlats = platforms.filter(p => p.y < 460 && p.w >= 80 && !p.oneWay);
      if (upperPlats.length > 0) {
        const targetPlat = upperPlats[upperPlats.length - 1];
        this.stalkingPhantom = {
          x: targetPlat.x + targetPlat.w * 0.5,
          y: targetPlat.y,
          facing: targetPlat.x > 800 ? -1 : 1,
          state: 'lurking',
          dissolveProgress: 0,
          scale: 1.0
        };
      }
    }
  }

  drawWatcherAtmosphere(ctx, room, game, time) {
    if (this.currentRoomEyesId !== room.id) {
      this.initRoomAtmosphere(room, game);
    }

    const p = game.player;
    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;

    // 1. Draw Stalking Gloam Prowler
    if (this.stalkingPhantom) {
      const ph = this.stalkingPhantom;
      const distToPlayer = Math.hypot(px - ph.x, py - ph.y);

      if (ph.state === 'lurking') {
        // Look towards player
        ph.facing = px > ph.x ? 1 : -1;

        // Player gets too close or lantern illuminates them -> dissolve into shadow smoke!
        if (distToPlayer < 240) {
          ph.state = 'dissolving';
          // Spawn shadow puff motes
          for (let i = 0; i < 18; i++) {
            this.shadowParticles.push({
              x: ph.x + (Math.random() - 0.5) * 24,
              y: ph.y - 20 + (Math.random() - 0.5) * 36,
              vx: (Math.random() - 0.5) * 45,
              vy: -25 - Math.random() * 55,
              size: 2.5 + Math.random() * 3.5,
              life: 0.9,
              maxLife: 0.9,
              color: i % 2 === 0 ? 'rgba(10, 14, 22, 0.9)' : 'rgba(80, 40, 110, 0.65)'
            });
          }
        }
      } else if (ph.state === 'dissolving') {
        ph.dissolveProgress += 0.04;
        if (ph.dissolveProgress >= 1) {
          this.stalkingPhantom = null;
        }
      }

      if (this.stalkingPhantom && ph.state === 'lurking') {
        ctx.save();
        const breath = Math.sin(time * 2.8) * 1.5;
        ctx.translate(ph.x, ph.y);
        ctx.scale(ph.facing, 1);

        // Dark hooded phantom silhouette
        ctx.fillStyle = '#060a10';
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(-8, -42 + breath);
        ctx.lineTo(8, -42 + breath);
        ctx.lineTo(14, 0);
        ctx.closePath();
        ctx.fill();

        // Gnarled curled watcher horns
        ctx.strokeStyle = '#04070c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-6, -38 + breath);
        ctx.quadraticCurveTo(-18, -58 + breath, -14, -68 + breath);
        ctx.moveTo(6, -38 + breath);
        ctx.quadraticCurveTo(18, -58 + breath, 14, -68 + breath);
        ctx.stroke();

        // Chilling glowing watcher eyes staring right through the player
        ctx.fillStyle = '#fbf0b5';
        ctx.shadowColor = '#ffeaa7';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(2, -34 + breath, 2.2, 0, Math.PI * 2);
        ctx.arc(8, -34 + breath, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
      }
    }

    // 2. Update & Draw Shadow Particles
    for (let i = this.shadowParticles.length - 1; i >= 0; i--) {
      const sp = this.shadowParticles[i];
      sp.life -= 0.025;
      sp.x += sp.vx * 0.025;
      sp.y += sp.vy * 0.025;
      if (sp.life <= 0) {
        this.shadowParticles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Draw Creepy Watcher Eyes in dark crevices
    for (const eye of this.watcherEyes) {
      const dist = Math.hypot(px - eye.x, py - eye.y);

      // Handle flee / caution logic
      if (dist < eye.fearRadius) {
        // Scared! Retreat into deep darkness
        eye.alpha = Math.max(0, eye.alpha - 0.06);
      } else {
        // Slowly peek out from shadow
        eye.alpha = Math.min(eye.targetAlpha, eye.alpha + 0.025);
      }

      if (eye.alpha <= 0.01) continue;

      // Handle blinking
      eye.blinkTimer += 0.025;
      if (!eye.isBlinking && eye.blinkTimer > eye.nextBlink) {
        eye.isBlinking = true;
        eye.blinkTimer = 0;
      }
      if (eye.isBlinking && eye.blinkTimer > eye.blinkDuration) {
        eye.isBlinking = false;
        eye.blinkTimer = 0;
        eye.nextBlink = 2.5 + Math.random() * 5.0;
      }

      if (eye.isBlinking) continue;

      // Pupil tracking angle towards player
      const angle = Math.atan2(py - eye.y, px - eye.x);
      const lookOffset = Math.min(1.2, dist * 0.015);
      const pupilX = Math.cos(angle) * lookOffset;
      const pupilY = Math.sin(angle) * lookOffset;

      ctx.save();
      ctx.globalAlpha = eye.alpha;

      // Dark crevice shadow behind eyes
      ctx.fillStyle = 'rgba(2, 3, 6, 0.75)';
      ctx.beginPath();
      ctx.ellipse(eye.x, eye.y, eye.spacing + 6, eye.size + 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pair of eyes
      for (const side of [-1, 1]) {
        const ex = eye.x + side * (eye.spacing * 0.5);
        const ey = eye.y;

        // Glowing sclera/iris
        ctx.fillStyle = eye.irisColor;
        ctx.shadowColor = eye.irisColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(ex, ey, eye.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Dilated dark pupil tracking player
        ctx.fillStyle = '#05070a';
        ctx.beginPath();
        ctx.arc(ex + pupilX, ey + pupilY, eye.size * 0.48, 0, Math.PI * 2);
        ctx.fill();

        // Tiny white specular highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex + pupilX - 0.5, ey + pupilY - 0.5, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  render(game, time) {
    const ctx = this.ctx;
    const room = game.currentRoom;
    if (!room) return;
    const biome = BIOMES[room.biome] || BIOMES.ruins;

    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.save();

    // 1. Deep Dreamlike Cavern Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, biome.bgTop);
    bgGrad.addColorStop(0.65, biome.bgBot);
    bgGrad.addColorStop(1, '#020306');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Camera transform
    const camX = Math.round(game.camX);
    const camY = Math.round(game.camY);

    // 2. Parallax Distant Silhouettes (Gothic Arches, Monolithic Pillars & Giant Roots)
    this.drawParallaxBackground(ctx, biome, camX, camY, W, H, time);

    // 3. Volumetric God Rays
    this.drawVolumetricGodRays(ctx, biome, camX, camY, W, H, time);

    ctx.translate(-camX, -camY);

    // 4. Dream Dust & Background Critters
    this.drawDreamDust(ctx, biome, time);
    this.drawBackgroundCritters(ctx, biome, time);

    // 4b. Watcher Atmosphere (Eyes in crevices & Stalking Gloam Prowler)
    this.drawWatcherAtmosphere(ctx, room, game, time);

    // 5. Midground Handcrafted Props & Architecture
    this.drawRoomProps(ctx, room, biome, time, game);

    // 6. Water Pools & Shimmering Reflections
    this.drawWaterPools(ctx, room, biome, time);

    // 7. Handcrafted Beveled Platforms, Walls & Bridges
    this.drawPlatforms(ctx, room, biome, game, time);

    // 8. Environmental Hazards (Spikes, Thorns, Crumbling, Falling Rocks, Poison Plants)
    this.drawHazards(ctx, room, game, time);

    // 9. Exit Doorway Portals
    this.drawExits(ctx, room, biome, time);

    // 10. Lore Tablets, Forgotten Shrine, Soul Brazier, Collectibles, Liora's Cage
    this.drawInteractables(ctx, room, biome, game, time);

    // 11. NPCs with glowing auras
    this.drawNPCs(ctx, room, game, time);

    // 12. Enemies & Bosses
    this.drawEnemies(ctx, game, time);

    // 13. Player (Warden Kaelen) & High-Res Sword Arcs
    this.drawPlayer(ctx, game.player, game, time);

    // 14. Projectiles & Sparks
    this.drawProjectilesAndParticles(ctx, game);

    // 15. Undulating Low Atmospheric Mist
    this.drawCavernMist(ctx, biome, time);

    ctx.restore();

    // 16. Enhanced Localized Lighting & Radial Bloom Overlay
    this.drawLightingOverlay(ctx, room, biome, game, camX, camY, time);
  }

  drawParallaxBackground(ctx, biome, camX, camY, W, H, time) {
    ctx.save();
    // Layer 1: Distant Gothic Vaulting & Giant Monoliths (0.18x parallax)
    const px1 = -(camX * 0.18) % 360;
    ctx.fillStyle = 'rgba(4, 7, 14, 0.48)';
    for (let x = px1 - 360; x < W + 360; x += 360) {
      // Giant Cathedral Spire / Pillar
      ctx.fillRect(x + 80, 0, 60, H);
      // Gothic pointed arch connecting pillars
      ctx.beginPath();
      ctx.moveTo(x + 80, 240);
      ctx.quadraticCurveTo(x + 230, 80, x + 380, 240);
      ctx.lineWidth = 32;
      ctx.strokeStyle = 'rgba(4, 7, 14, 0.38)';
      ctx.stroke();
    }

    // Layer 2: Mid-Distant Stalactites & Giant Gnarled Roots (0.38x parallax)
    const px2 = -(camX * 0.38) % 260;
    ctx.fillStyle = 'rgba(8, 14, 24, 0.55)';
    for (let x = px2 - 260; x < W + 260; x += 260) {
      // Stalactites descending from darkness
      ctx.beginPath();
      ctx.moveTo(x + 15, 0);
      ctx.lineTo(x + 55, 170 + Math.sin(x * 0.05) * 50);
      ctx.lineTo(x + 95, 0);
      ctx.fill();

      // Stalagmites rising from abyss
      ctx.beginPath();
      ctx.moveTo(x + 120, H);
      ctx.lineTo(x + 160, H - (140 + Math.cos(x * 0.04) * 45));
      ctx.lineTo(x + 200, H);
      ctx.fill();
    }
    ctx.restore();
  }

  drawVolumetricGodRays(ctx, biome, camX, camY, W, H, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const numRays = 4;
    for (let i = 0; i < numRays; i++) {
      const rayOffset = (i * 380 + (time * 12)) % (W + 600) - 200;
      const pulse = 0.55 + 0.35 * Math.sin(time * 1.5 + i * 1.8);

      const grad = ctx.createLinearGradient(rayOffset, 0, rayOffset + 240, H);
      grad.addColorStop(0, hexToRgba(biome.accent, 0.16 * pulse));
      grad.addColorStop(0.45, hexToRgba(biome.accent, 0.07 * pulse));
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(rayOffset - 30, 0);
      ctx.lineTo(rayOffset + 70, 0);
      ctx.lineTo(rayOffset + 380, H);
      ctx.lineTo(rayOffset + 180, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawDreamDust(ctx, biome, time) {
    ctx.save();
    for (const d of this.dreamDust) {
      const x = (d.x + time * d.vx) % 1600;
      const y = (d.y + time * d.vy) % 960;
      const wrapY = y < 0 ? y + 960 : y;
      const pulse = 0.3 + 0.45 * Math.sin(time * 3 + d.pulse);

      ctx.fillStyle = biome.accent;
      ctx.globalAlpha = Math.max(0, pulse);
      ctx.beginPath();
      ctx.arc(x, wrapY, d.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBackgroundCritters(ctx, biome, time) {
    ctx.save();
    for (const c of this.critters) {
      const cx = (c.x + Math.sin(time * 0.8 + c.phase) * 55 + 1600) % 1600;
      const cy = c.y + Math.cos(time * 1.4 + c.phase) * 22;
      const glow = 0.4 + 0.4 * Math.sin(time * 4 + c.phase);

      // Soft glow aura
      const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
      aura.addColorStop(0, hexToRgba(biome.accent, 0.45 * glow));
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();

      // Core beetle / firefly
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, c.size, 0, Math.PI * 2);
      ctx.fill();

      // Gossamer wings fluttering
      const wingY = Math.sin(time * 22 + c.phase) * 4;
      ctx.strokeStyle = hexToRgba(biome.accent, 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - wingY);
      ctx.lineTo(cx + 3, cy + wingY);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawWaterPools(ctx, room, biome, time) {
    if (!room.waterPools) return;
    for (const wp of room.waterPools) {
      ctx.save();
      // Translucent deep water volume
      const wGrad = ctx.createLinearGradient(0, wp.y, 0, wp.y + wp.h);
      wGrad.addColorStop(0, 'rgba(45, 160, 210, 0.45)');
      wGrad.addColorStop(0.4, 'rgba(18, 80, 130, 0.75)');
      wGrad.addColorStop(1, 'rgba(6, 25, 48, 0.92)');
      ctx.fillStyle = wGrad;
      ctx.fillRect(wp.x, wp.y, wp.w, wp.h);

      // Shimmering reflective surface waves
      ctx.strokeStyle = 'rgba(165, 245, 255, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let wx = wp.x; wx <= wp.x + wp.w; wx += 12) {
        const wy = wp.y + Math.sin(time * 3.4 + wx * 0.09) * 2.8 + Math.cos(time * 2.1 + wx * 0.05) * 1.5;
        if (wx === wp.x) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.stroke();

      // Caustic underwater light lines
      ctx.strokeStyle = 'rgba(120, 225, 255, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let wx = wp.x + 8; wx <= wp.x + wp.w - 8; wx += 24) {
        const cy = wp.y + 14 + Math.sin(time * 2.5 + wx * 0.12) * 5;
        ctx.moveTo(wx, cy);
        ctx.lineTo(wx + 12, cy + 8);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  drawPlatforms(ctx, room, biome, game, time) {
    const solids = game.getSolidPlatforms();

    for (const p of solids) {
      ctx.save();

      // 1. Base stone fill
      ctx.fillStyle = p.isBridge ? '#3d2b1f' : biome.stoneMain;
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // 2. Stratified Rock Layers & Geological Sediment Striations
      if (!p.isBridge && p.h >= 24) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        for (let sy = p.y + 14; sy < p.y + p.h - 10; sy += 18) {
          ctx.beginPath();
          ctx.moveTo(p.x, sy);
          for (let sx = p.x; sx <= p.x + p.w; sx += 40) {
            const wave = Math.sin(sx * 0.05 + sy * 0.08) * 2.5;
            ctx.lineTo(sx, sy + wave);
          }
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.stroke();
        }
      }

      // 3. Beveled depth gradient along the face
      const faceGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      faceGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      faceGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.02)');
      faceGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.22)');
      faceGrad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
      ctx.fillStyle = faceGrad;
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // 4. Top trim & Lush Organic Moss Crust
      const trimH = Math.min(7, p.h);
      ctx.fillStyle = p.slippery ? '#5ce1e6' : p.isBridge ? '#8f6f4f' : biome.stoneTrim;
      ctx.fillRect(p.x, p.y, p.w, trimH);

      // Organic tufted moss blades and dew drops on top surface
      if ((biome.id === 'caverns' || biome.id === 'gardens' || biome.id === 'sluice') && !p.isBridge) {
        ctx.fillStyle = biome.accent;
        ctx.globalAlpha = 0.85;
        // Individual vertical moss blades
        for (let gx = p.x + 4; gx < p.x + p.w - 4; gx += 7) {
          const bladeH = 2.5 + Math.sin(gx * 0.45) * 2;
          ctx.fillRect(gx, p.y - bladeH, 1.8, bladeH + 2);
        }
        // Glistening dewdrops
        ctx.fillStyle = '#ffffff';
        for (let dx = p.x + 10; dx < p.x + p.w - 10; dx += 28) {
          const dropY = p.y - 1.5;
          ctx.beginPath();
          ctx.arc(dx, dropY, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // 5. Hanging roots, ivy creepers & dripping water
      if (!p.oneWay) {
        if (biome.id === 'caverns' || biome.id === 'gardens') {
          // Gnarled creeping roots clinging to walls and underside
          ctx.strokeStyle = '#23442c';
          ctx.lineWidth = 2.5;
          for (let tx = p.x + 12; tx < p.x + p.w - 12; tx += 26) {
            const rootLen = 10 + Math.sin(tx * 0.3) * 8;
            ctx.beginPath();
            ctx.moveTo(tx, p.y + p.h);
            ctx.quadraticCurveTo(tx + Math.sin(tx) * 5, p.y + p.h + rootLen * 0.5, tx + Math.cos(tx) * 4, p.y + p.h + rootLen);
            ctx.stroke();

            // Tiny leaf cluster on root tip
            ctx.fillStyle = '#49a868';
            ctx.beginPath();
            ctx.arc(tx + Math.cos(tx) * 4, p.y + p.h + rootLen, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (biome.id === 'sluice') {
          // Dripping water droplets
          ctx.fillStyle = 'rgba(165, 240, 255, 0.75)';
          for (let dx = p.x + 16; dx < p.x + p.w - 16; dx += 45) {
            const dripPhase = (time * 2.2 + dx * 0.1) % 1.0;
            const dy = p.y + p.h + dripPhase * 24;
            ctx.beginPath();
            ctx.arc(dx, dy, 1.8 * (1 - dripPhase * 0.5), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 6. Crystal facet edge glints for Crystal Depths
      if (biome.id === 'crystals') {
        ctx.strokeStyle = 'rgba(210, 126, 255, 0.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.w, p.y);
        ctx.stroke();

        // Crystal stalactite shards clinging underneath
        if (!p.oneWay && p.h > 15) {
          ctx.fillStyle = '#b174f2';
          for (let cx = p.x + 18; cx < p.x + p.w - 18; cx += 34) {
            const ch = 8 + Math.sin(cx) * 5;
            ctx.beginPath();
            ctx.moveTo(cx - 3, p.y + p.h);
            ctx.lineTo(cx, p.y + p.h + ch);
            ctx.lineTo(cx + 3, p.y + p.h);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // 7. Stone border line & masonry joints
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(p.x, p.y, p.w, p.h);

      ctx.restore();
    }

    // Secret Destructible Walls
    if (room.secretWalls) {
      for (const sw of room.secretWalls) {
        if (game.state.brokenWalls[sw.id]) continue;
        ctx.save();
        ctx.fillStyle = biome.stoneMain;
        ctx.fillRect(sw.x, sw.y, sw.w, sw.h);

        // Luminous fracture veins
        const pulse = 0.5 + 0.45 * Math.sin(time * 3);
        ctx.strokeStyle = game.state.worldFlags.lanternUpgraded
          ? `rgba(92, 225, 230, ${pulse})`
          : `rgba(133, 210, 150, ${pulse * 0.75})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sw.x + 8, sw.y + 15);
        ctx.lineTo(sw.x + sw.w - 8, sw.y + 70);
        ctx.lineTo(sw.x + 12, sw.y + 130);
        ctx.lineTo(sw.x + sw.w - 6, sw.y + 195);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Three-Seal Gate in abyss_gate
    if (room.sealGate && !game.isSealGateOpen()) {
      const sg = room.sealGate;
      ctx.save();
      ctx.fillStyle = '#1c0f2b';
      ctx.fillRect(sg.x, sg.y, sg.w, sg.h);
      ctx.strokeStyle = '#e05368';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(sg.x, sg.y, sg.w, sg.h);

      const seals = [
        !!game.state.inventory.seal_caverns,
        !!game.state.inventory.seal_crystals,
        !!game.state.inventory.seal_gardens
      ];
      seals.forEach((lit, idx) => {
        const sy = sg.y + 48 + idx * 72;
        const color = lit ? '#56d38a' : '#e05368';

        // Outer glyph ring
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sg.x + sg.w / 2, sy, 14, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glowing seal rune
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sg.x + sg.w / 2, sy, lit ? 8 : 5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  drawRoomProps(ctx, room, biome, time, game) {
    if (!room.props) return;
    for (const p of room.props) {
      ctx.save();
      switch (p.type) {
        case 'pillar': {
          const h = p.h || 420;
          // Pillar plinth
          ctx.fillStyle = '#181b28';
          ctx.fillRect(p.x - 26, p.y - 20, 52, 20);
          // Column shaft
          const pGrad = ctx.createLinearGradient(p.x - 20, 0, p.x + 20, 0);
          pGrad.addColorStop(0, '#151824');
          pGrad.addColorStop(0.5, '#2e354a');
          pGrad.addColorStop(1, '#151824');
          ctx.fillStyle = pGrad;
          ctx.fillRect(p.x - 20, p.y - h + 24, 40, h - 44);
          // Capital arch
          ctx.fillStyle = '#222838';
          ctx.fillRect(p.x - 28, p.y - h, 56, 24);
          // Fluted lines
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x - 8, p.y - h + 26);
          ctx.lineTo(p.x - 8, p.y - 22);
          ctx.moveTo(p.x + 8, p.y - h + 26);
          ctx.lineTo(p.x + 8, p.y - 22);
          ctx.stroke();
          break;
        }
        case 'chain': {
          const h = p.h || 260;
          const sway = Math.sin(time * 1.5 + p.x * 0.015) * 6;
          ctx.strokeStyle = '#5a627a';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo(p.x + sway * 0.6, p.y + h * 0.5, p.x + sway, p.y + h);
          ctx.stroke();
          break;
        }
        case 'lantern': {
          const sway = Math.sin(time * 2.3 + p.x) * 4.5;
          // Chain
          ctx.strokeStyle = '#635645';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - 42);
          ctx.lineTo(p.x + sway, p.y);
          ctx.stroke();

          // Lantern brass cage
          ctx.fillStyle = '#2d2419';
          ctx.fillRect(p.x + sway - 10, p.y, 20, 26);
          ctx.strokeStyle = '#b8945a';
          ctx.lineWidth = 2;
          ctx.strokeRect(p.x + sway - 10, p.y, 20, 26);

          // Glowing heart with warm flicker
          const flicker = 0.8 + 0.2 * Math.sin(time * 14 + p.x);
          const coreGrad = ctx.createRadialGradient(p.x + sway, p.y + 13, 1, p.x + sway, p.y + 13, 10);
          coreGrad.addColorStop(0, '#ffffff');
          coreGrad.addColorStop(0.35, '#ffcf66');
          coreGrad.addColorStop(1, hexToRgba('#ff9d2e', 0.2));
          ctx.fillStyle = coreGrad;
          ctx.beginPath();
          ctx.arc(p.x + sway, p.y + 13, 9 * flicker, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'lantern_post': {
          // Iron pole
          ctx.fillStyle = '#1e2130';
          ctx.fillRect(p.x - 5, p.y - 120, 10, 120);
          // Ornate bracket
          ctx.strokeStyle = '#3a4059';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(p.x + 8, p.y - 110, 16, Math.PI * 0.5, Math.PI * 1.5, false);
          ctx.stroke();
          // Lantern lamp
          ctx.fillStyle = '#ffc86b';
          ctx.beginPath();
          ctx.arc(p.x + 16, p.y - 106, 8, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'candles': {
          const offsets = [-12, -2, 9];
          offsets.forEach((ox, idx) => {
            const ch = 14 + (idx % 2) * 7;
            // Candle wax pillar
            ctx.fillStyle = '#e3dacd';
            ctx.fillRect(p.x + ox - 3, p.y - ch, 6, ch);
            // Flame
            const flicker = Math.sin(time * 14 + idx * 3 + p.x) * 1.5;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(p.x + ox + flicker * 0.4, p.y - ch - 4, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 175, 55, 0.75)';
            ctx.beginPath();
            ctx.arc(p.x + ox + flicker * 0.4, p.y - ch - 5, 5.5, 0, Math.PI * 2);
            ctx.fill();
          });
          break;
        }
        case 'statue': {
          ctx.fillStyle = '#2b3145';
          ctx.fillRect(p.x - 26, p.y - 24, 52, 24);
          ctx.beginPath();
          ctx.moveTo(p.x - 18, p.y - 24);
          ctx.lineTo(p.x - 12, p.y - 100);
          ctx.lineTo(p.x + 12, p.y - 100);
          ctx.lineTo(p.x + 18, p.y - 24);
          ctx.fill();
          // Halo ring & head
          ctx.strokeStyle = 'rgba(212, 184, 134, 0.45)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y - 116, 18, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#e8e2d5';
          ctx.beginPath();
          ctx.arc(p.x, p.y - 114, 12, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'shrine': {
          // Ornate Altar Pedestal
          ctx.fillStyle = '#231d30';
          ctx.fillRect(p.x - 40, p.y - 22, 80, 22);
          ctx.strokeStyle = '#d4b886';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(p.x - 30, p.y - 105, 60, 85);

          // Glowing Relic Core with pulsating radiance
          const pulse = 1.0 + 0.2 * Math.sin(time * 3);
          const sGrad = ctx.createRadialGradient(p.x, p.y - 62, 1, p.x, p.y - 62, 22 * pulse);
          sGrad.addColorStop(0, '#ffffff');
          sGrad.addColorStop(0.4, biome.accent);
          sGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = sGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y - 62, 22 * pulse, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'hut': {
          ctx.fillStyle = '#1c1824';
          ctx.fillRect(p.x - 90, p.y - 130, 180, 130);
          ctx.strokeStyle = '#5a493a';
          ctx.lineWidth = 3;
          ctx.strokeRect(p.x - 90, p.y - 130, 180, 130);
          // Roof
          ctx.fillStyle = '#2d221c';
          ctx.beginPath();
          ctx.moveTo(p.x - 105, p.y - 130);
          ctx.lineTo(p.x, p.y - 195);
          ctx.lineTo(p.x + 105, p.y - 130);
          ctx.fill();
          // Glowing warm window
          ctx.fillStyle = 'rgba(255, 195, 105, 0.85)';
          ctx.beginPath();
          ctx.arc(p.x - 38, p.y - 72, 20, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'house': {
          ctx.fillStyle = '#1a1d2b';
          ctx.fillRect(p.x - 115, p.y - 220, 230, 220);
          ctx.strokeStyle = '#4e453c';
          ctx.lineWidth = 3;
          ctx.strokeRect(p.x - 115, p.y - 220, 230, 220);
          // Warm glowing multi-pane windows
          ctx.fillStyle = 'rgba(255, 200, 110, 0.75)';
          ctx.fillRect(p.x - 70, p.y - 170, 40, 50);
          ctx.fillRect(p.x + 30, p.y - 170, 40, 50);
          break;
        }
        case 'mushroom_giant': {
          // Stalk
          ctx.fillStyle = '#223d38';
          ctx.fillRect(p.x - 9, p.y - 92, 18, 92);

          // Underside luminous gills
          ctx.fillStyle = 'rgba(86, 235, 162, 0.85)';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y - 90, 46, 12, 0, 0, Math.PI);
          ctx.fill();

          // Bioluminescent cap with gradient
          const capGrad = ctx.createLinearGradient(p.x - 48, p.y - 120, p.x + 48, p.y - 90);
          capGrad.addColorStop(0, '#2ea672');
          capGrad.addColorStop(0.65, '#56d38a');
          capGrad.addColorStop(1, '#9ef7c4');
          ctx.fillStyle = capGrad;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y - 92, 52, 26, 0, Math.PI, 0, false);
          ctx.fill();

          // Glowing spore speckles
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x - 22, p.y - 104, 3, 0, Math.PI * 2);
          ctx.arc(p.x, p.y - 112, 4, 0, Math.PI * 2);
          ctx.arc(p.x + 24, p.y - 102, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'vines': {
          const h = p.h || 240;
          ctx.strokeStyle = '#32704a';
          ctx.lineWidth = 3.5;
          for (let i = -1; i <= 1; i++) {
            const sway = Math.sin(time * 1.9 + p.x + i * 2) * 9;
            ctx.beginPath();
            ctx.moveTo(p.x + i * 14, p.y);
            ctx.quadraticCurveTo(p.x + i * 14 + sway, p.y + h * 0.5, p.x + i * 14 - sway * 0.6, p.y + h);
            ctx.stroke();
          }
          break;
        }
        case 'glow_flowers': {
          for (let i = -2; i <= 2; i++) {
            const fx = p.x + i * 15;
            ctx.strokeStyle = '#2b6343';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(fx, p.y);
            ctx.lineTo(fx, p.y - 20);
            ctx.stroke();

            // Blossoms with inner glow
            const fGlow = 0.7 + 0.3 * Math.sin(time * 4 + fx);
            ctx.fillStyle = hexToRgba('#6ff5b6', fGlow);
            ctx.beginPath();
            ctx.arc(fx, p.y - 22, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(fx, p.y - 22, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'crystal_cluster': {
          // Multi-faceted refractive crystals
          const heights = [55, 84, 62];
          const angles = [-0.25, 0.04, 0.3];
          heights.forEach((ch, idx) => {
            ctx.save();
            ctx.translate(p.x + (idx - 1) * 15, p.y);
            ctx.rotate(angles[idx]);

            // Left shaded facet
            ctx.fillStyle = idx === 1 ? '#8a3ed4' : '#3296c4';
            ctx.beginPath();
            ctx.moveTo(-11, 0);
            ctx.lineTo(0, -ch);
            ctx.lineTo(0, 0);
            ctx.fill();

            // Right lit facet
            ctx.fillStyle = idx === 1 ? '#d27eff' : '#68e2ff';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -ch);
            ctx.lineTo(11, 0);
            ctx.fill();

            // Specular ridge
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -ch);
            ctx.stroke();

            ctx.restore();
          });
          break;
        }
        case 'mysterious_light': {
          const bob = Math.sin(time * 3.2 + p.x) * 9;
          const wGrad = ctx.createRadialGradient(p.x, p.y + bob, 1, p.x, p.y + bob, 18);
          wGrad.addColorStop(0, '#ffffff');
          wGrad.addColorStop(0.4, '#5ce1e6');
          wGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = wGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y + bob, 18, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'bones': {
          ctx.fillStyle = '#8f887b';
          ctx.beginPath();
          ctx.arc(p.x, p.y - 7, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(p.x - 16, p.y - 4, 32, 4);
          break;
        }
        case 'broken_cart': {
          ctx.strokeStyle = '#5a4632';
          ctx.lineWidth = 3;
          ctx.strokeRect(p.x - 28, p.y - 28, 56, 20);
          ctx.beginPath();
          ctx.arc(p.x - 14, p.y - 10, 10, 0, Math.PI * 2);
          ctx.arc(p.x + 16, p.y - 10, 10, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
      }
      ctx.restore();
    }
  }

  drawHazards(ctx, room, game, time) {
    for (const h of game.activeHazards) {
      ctx.save();
      if (h.type === 'spikes') {
        const spikeW = 14;
        for (let sx = h.x; sx < h.x + h.w; sx += spikeW) {
          // Shaded spike cone
          ctx.fillStyle = '#4c556b';
          ctx.beginPath();
          ctx.moveTo(sx, h.y + h.h);
          ctx.lineTo(sx + spikeW / 2, h.y);
          ctx.lineTo(sx + spikeW / 2, h.y + h.h);
          ctx.fill();

          ctx.fillStyle = '#8e9ab8';
          ctx.beginPath();
          ctx.moveTo(sx + spikeW / 2, h.y + h.h);
          ctx.lineTo(sx + spikeW / 2, h.y);
          ctx.lineTo(sx + spikeW, h.y + h.h);
          ctx.fill();
        }
      } else if (h.type === 'thorns') {
        ctx.fillStyle = game.hasAbility('thornWard') ? '#2e5436' : '#731b31';
        for (let sx = h.x; sx < h.x + h.w; sx += 16) {
          ctx.beginPath();
          ctx.arc(sx + 8, h.y + 12, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (h.type === 'crumbling') {
        if (h.collapsed) {
          ctx.restore();
          continue;
        }
        const shakeX = h.shaking ? (Math.random() - 0.5) * 6 : 0;
        ctx.fillStyle = '#503f31';
        ctx.fillRect(h.x + shakeX, h.y, h.w, h.h);
        ctx.strokeStyle = '#c4a674';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(h.x + shakeX, h.y, h.w, h.h);
      } else if (h.type === 'falling_rock') {
        ctx.fillStyle = '#5e657a';
        ctx.beginPath();
        ctx.moveTo(h.x - 14, h.currentY);
        ctx.lineTo(h.x, h.currentY + 34);
        ctx.lineTo(h.x + 14, h.currentY);
        ctx.closePath();
        ctx.fill();
      } else if (h.type === 'poison_plant') {
        ctx.fillStyle = '#3e752d';
        ctx.beginPath();
        ctx.arc(h.x, h.y - 12, 14, 0, Math.PI * 2);
        ctx.fill();
        if (h.puffActive) {
          const puffGrad = ctx.createRadialGradient(h.x, h.y - 22, 5, h.x, h.y - 22, 48);
          puffGrad.addColorStop(0, 'rgba(175, 255, 95, 0.55)');
          puffGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = puffGrad;
          ctx.beginPath();
          ctx.arc(h.x, h.y - 22, 48, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  drawExits(ctx, room, biome, time) {
    if (!room.exits) return;
    const pulse = 0.45 + 0.35 * Math.sin(time * 3);
    ctx.fillStyle = biome.accent;
    ctx.globalAlpha = pulse;

    if (room.exits.left) {
      ctx.fillRect(4, 700, 10, 175);
    }
    if (room.exits.right) {
      ctx.fillRect(1586, 700, 10, 175);
    }
    if (room.exits.top) {
      ctx.fillRect(700, 4, 200, 10);
    }
    if (room.exits.bottom) {
      ctx.fillRect(700, 946, 200, 10);
    }
    ctx.globalAlpha = 1;
  }

  drawInteractables(ctx, room, biome, game, time) {
    // Soul Brazier Checkpoint
    if (room.brazier) {
      const b = room.brazier;
      ctx.save();
      // Brazier Stone Basin
      ctx.fillStyle = '#383028';
      ctx.fillRect(b.x - 20, b.y - 36, 40, 36);
      ctx.strokeStyle = '#9c815c';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x - 20, b.y - 36, 40, 36);

      // Living Soul Flame
      const isActive = game.state.checkpoint.roomId === room.id;
      const flameColor = isActive ? '#5ce1e6' : '#f3a847';
      const flameGrad = ctx.createRadialGradient(b.x, b.y - 48, 2, b.x, b.y - 48, 20);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.4, flameColor);
      flameGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.arc(b.x, b.y - 48 + Math.sin(time * 6) * 3, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Lore Tablets
    if (room.loreTablets) {
      for (const lt of room.loreTablets) {
        ctx.save();
        ctx.fillStyle = '#353c52';
        ctx.beginPath();
        ctx.arc(lt.x, lt.y - 40, 20, Math.PI, 0);
        ctx.lineTo(lt.x + 20, lt.y);
        ctx.lineTo(lt.x - 20, lt.y);
        ctx.fill();
        ctx.strokeStyle = '#8df6fa';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Items, Abilities, Upgrades
    if (room.items) {
      for (const it of room.items) {
        if (game.isItemCollected(room.id, it)) continue;
        const bob = Math.sin(time * 4.2 + it.x) * 6;
        ctx.save();
        ctx.translate(it.x, it.y + bob);

        if (it.type === 'ability') {
          // Luminous celestial sphere
          const aGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
          aGrad.addColorStop(0, '#ffffff');
          aGrad.addColorStop(0.5, '#d27eff');
          aGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = aGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.fill();
        } else if (it.type === 'mask_upgrade') {
          ctx.fillStyle = '#8df6fa';
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (it.type === 'lumen') {
          ctx.fillStyle = '#f3a847';
          ctx.beginPath();
          ctx.moveTo(0, -12);
          ctx.lineTo(10, 0);
          ctx.lineTo(0, 12);
          ctx.lineTo(-10, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = '#5ce1e6';
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#d4b886';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Liora's Echo-Glass Cage in abyss_sanctum
    if (room.lioraCage && !game.state.worldFlags.cageShattered) {
      const c = room.lioraCage;
      ctx.save();
      // Liora inside (Verdant Night-Blossom Weaver)
      // Robes
      ctx.fillStyle = '#263b32';
      ctx.fillRect(c.x - 11, c.y - 44, 22, 44);
      // Head
      ctx.fillStyle = '#f0eade';
      ctx.beginPath();
      ctx.arc(c.x, c.y - 52, 9.5, 0, Math.PI * 2);
      ctx.fill();
      // Night-flower crown
      ctx.fillStyle = '#b174f2';
      ctx.beginPath();
      ctx.arc(c.x - 6, c.y - 59, 3.5, 0, Math.PI * 2);
      ctx.arc(c.x, c.y - 62, 4, 0, Math.PI * 2);
      ctx.arc(c.x + 6, c.y - 59, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Singing Echo-Glass harmonic crystal
      const cPulse = 1.0 + 0.2 * Math.sin(time * 5);
      const cGrad = ctx.createRadialGradient(c.x, c.y - 30, 1, c.x, c.y - 30, 14 * cPulse);
      cGrad.addColorStop(0, '#ffffff');
      cGrad.addColorStop(0.4, '#b174f2');
      cGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(c.x, c.y - 30, 14 * cPulse, 0, Math.PI * 2);
      ctx.fill();

      // Translucent Prismatic Echo-Glass Cage
      const cageGrad = ctx.createLinearGradient(c.x - 38, c.y - 100, c.x + 38, c.y);
      cageGrad.addColorStop(0, 'rgba(160, 245, 255, 0.45)');
      cageGrad.addColorStop(0.5, 'rgba(215, 140, 255, 0.25)');
      cageGrad.addColorStop(1, 'rgba(80, 200, 240, 0.45)');
      ctx.fillStyle = cageGrad;
      ctx.fillRect(c.x - 38, c.y - 100, 76, 100);
      ctx.strokeStyle = '#8df6fa';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(c.x - 38, c.y - 100, 76, 100);
      ctx.restore();
    }
  }

  drawNPCs(ctx, room, game, time) {
    if (!room.npcs) return;
    for (const n of room.npcs) {
      if (n.requiresCageBroken && !game.state.worldFlags.cageShattered) continue;
      const bob = Math.sin(time * 2.6 + n.x) * 2.5;
      ctx.save();

      if (n.id === 'orin') {
        // Mushroom Hermit Chronicler
        // Mossy cloak
        ctx.fillStyle = '#223826';
        ctx.beginPath();
        ctx.moveTo(n.x - 18, n.y);
        ctx.lineTo(n.x - 12, n.y - 44 + bob);
        ctx.lineTo(n.x + 12, n.y - 44 + bob);
        ctx.lineTo(n.x + 18, n.y);
        ctx.fill();

        // Birch walking staff
        ctx.strokeStyle = '#d9cfc1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(n.x + 16, n.y);
        ctx.lineTo(n.x + 16, n.y - 68 + bob);
        ctx.stroke();
        // Amber crystal atop staff
        ctx.fillStyle = '#f3a847';
        ctx.beginPath();
        ctx.arc(n.x + 16, n.y - 70 + bob, 5, 0, Math.PI * 2);
        ctx.fill();

        // Lichen beard & face
        ctx.fillStyle = '#e8dec8';
        ctx.beginPath();
        ctx.arc(n.x, n.y - 50 + bob, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#476949';
        ctx.beginPath();
        ctx.arc(n.x, n.y - 44 + bob, 7, 0, Math.PI);
        ctx.fill();

        // Giant speckled fungal cap (hat)
        ctx.fillStyle = '#8f462c';
        ctx.beginPath();
        ctx.ellipse(n.x, n.y - 58 + bob, 22, 11, 0, Math.PI, 0, false);
        ctx.fill();
        ctx.fillStyle = '#f5dfbe';
        ctx.beginPath();
        ctx.arc(n.x - 10, n.y - 62 + bob, 2.8, 0, Math.PI * 2);
        ctx.arc(n.x + 2, n.y - 65 + bob, 3.2, 0, Math.PI * 2);
        ctx.arc(n.x + 12, n.y - 61 + bob, 2.8, 0, Math.PI * 2);
        ctx.fill();

      } else if (n.id === 'myra') {
        // Fungal Apothecary
        ctx.fillStyle = '#1e3d34';
        ctx.fillRect(n.x - 12, n.y - 42 + bob, 24, 42);
        // Face
        ctx.fillStyle = '#f2ebd9';
        ctx.beginPath();
        ctx.arc(n.x, n.y - 48 + bob, 9, 0, Math.PI * 2);
        ctx.fill();
        // Teal bioluminescent mushroom cap
        ctx.fillStyle = '#2bb38f';
        ctx.beginPath();
        ctx.ellipse(n.x, n.y - 55 + bob, 20, 10, 0, Math.PI, 0, false);
        ctx.fill();
        ctx.fillStyle = '#8df6fa';
        ctx.beginPath();
        ctx.arc(n.x - 8, n.y - 58 + bob, 2.5, 0, Math.PI * 2);
        ctx.arc(n.x + 6, n.y - 59 + bob, 2.8, 0, Math.PI * 2);
        ctx.fill();

      } else if (n.id === 'sylas') {
        // Bramble Dryad of Silver Birch
        ctx.fillStyle = '#dcd8cf';
        ctx.fillRect(n.x - 7, n.y - 52 + bob, 14, 52);
        // Emerald vine hair & blooming roses
        ctx.fillStyle = '#38804e';
        ctx.beginPath();
        ctx.arc(n.x, n.y - 58 + bob, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e05368';
        ctx.beginPath();
        ctx.arc(n.x - 6, n.y - 62 + bob, 3.5, 0, Math.PI * 2);
        ctx.arc(n.x + 7, n.y - 60 + bob, 4, 0, Math.PI * 2);
        ctx.fill();

      } else if (n.id === 'bram') {
        // Root-Badger Bridgewright
        ctx.fillStyle = '#3d2f23';
        ctx.fillRect(n.x - 16, n.y - 38 + bob, 32, 38);
        ctx.fillStyle = '#9e7947';
        ctx.fillRect(n.x - 12, n.y - 30 + bob, 24, 20); // Leather apron
        // Badger snout & amber goggles
        ctx.fillStyle = '#e8dec8';
        ctx.beginPath();
        ctx.arc(n.x, n.y - 44 + bob, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f3a847';
        ctx.fillRect(n.x - 9, n.y - 47 + bob, 18, 5); // Goggles

      } else if (n.id === 'liora') {
        // Rescued Sister Liora (Night-Flower Weaver)
        ctx.fillStyle = '#263b32';
        ctx.fillRect(n.x - 11, n.y - 44 + bob, 22, 44);
        ctx.fillStyle = '#f0eade';
        ctx.beginPath();
        ctx.arc(n.x, n.y - 52 + bob, 9.5, 0, Math.PI * 2);
        ctx.fill();
        // Night-flower crown
        ctx.fillStyle = '#b174f2';
        ctx.beginPath();
        ctx.arc(n.x - 6, n.y - 59 + bob, 3.5, 0, Math.PI * 2);
        ctx.arc(n.x, n.y - 62 + bob, 4, 0, Math.PI * 2);
        ctx.arc(n.x + 6, n.y - 59 + bob, 3.5, 0, Math.PI * 2);
        ctx.fill();
        // Singing crystal in hands
        ctx.fillStyle = '#5ce1e6';
        ctx.beginPath();
        ctx.arc(n.x, n.y - 32 + bob, 6, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // Generic Bramble-Folk Inhabitant
        ctx.fillStyle = '#2a3b2b';
        ctx.beginPath();
        ctx.moveTo(n.x - 16, n.y);
        ctx.lineTo(n.x - 10, n.y - 46 + bob);
        ctx.lineTo(n.x + 10, n.y - 46 + bob);
        ctx.lineTo(n.x + 18, n.y);
        ctx.fill();

        ctx.fillStyle = '#f0ebe1';
        ctx.beginPath();
        ctx.arc(n.x, n.y - 52 + bob, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // Floating dialogue beacon glyph
      ctx.fillStyle = '#f3a847';
      ctx.font = 'bold 15px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('❖', n.x, n.y - 78 + bob);
      ctx.restore();
    }
  }

  drawEnemies(ctx, game, time) {
    for (const e of game.enemies) {
      if (e.dead) continue;
      ctx.save();
      const flash = e.hurtFlash > 0;
      const walk = e.walkCycle || (time * 10);
      const wing = e.wingCycle || (time * 16);
      const breath = e.breathCycle || (time * 3);

      switch (e.type) {
        case 'crawler': {
          // Moss-Scuttler: 6 articulated scurrying legs, mossy segmented shell, pulsing back-mushroom
          const cx = e.x + e.w / 2;
          const cy = e.y + 14;

          // 6 Articulated scurrying legs (3 on each side)
          ctx.strokeStyle = flash ? '#ffffff' : '#182b1d';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          for (let side = -1; side <= 1; side += 2) {
            for (let legIdx = 0; legIdx < 3; legIdx++) {
              const legPhase = walk + legIdx * 1.05 + (side > 0 ? Math.PI : 0);
              const legLift = Math.sin(legPhase) * 5;
              const legSweep = Math.cos(legPhase) * 6;
              const rootX = cx + (legIdx - 1) * 7;
              const kneeX = rootX + side * 14 + legSweep;
              const kneeY = cy + 4 - Math.max(0, legLift);
              const footX = rootX + side * 20 + legSweep * 1.3;
              const footY = cy + 12 + Math.max(0, -legLift * 0.4);

              ctx.beginPath();
              ctx.moveTo(rootX, cy);
              ctx.lineTo(kneeX, kneeY);
              ctx.lineTo(footX, footY);
              ctx.stroke();
            }
          }

          // Segmented Mossy Carapace Body
          ctx.fillStyle = flash ? '#ffffff' : '#23442a';
          ctx.beginPath();
          ctx.ellipse(cx, cy, e.w / 2, 9, 0, 0, Math.PI * 2);
          ctx.fill();

          // Shell plating highlight
          ctx.fillStyle = flash ? '#ffffff' : '#396d44';
          ctx.beginPath();
          ctx.ellipse(cx, cy - 2, e.w / 2 - 4, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Twitching sensory antennae
          const twitch = Math.sin(time * 14) * 3;
          ctx.strokeStyle = '#2d5936';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(e.facing > 0 ? e.x + e.w - 3 : e.x + 3, cy - 2);
          ctx.lineTo(e.facing > 0 ? e.x + e.w + 8 : e.x - 8, cy - 8 + twitch);
          ctx.stroke();

          // Pulsing bioluminescent back-mushroom (flares when alert/chasing)
          const shroomPulse = 1.0 + (e.isAlert ? 0.35 : 0.15) * Math.sin(time * 9);
          const shroomColor = e.isAlert ? '#ff5c5c' : '#5ce1a2';
          ctx.fillStyle = shroomColor;
          ctx.beginPath();
          ctx.arc(cx - e.facing * 4, cy - 10, 5 * shroomPulse, 0, Math.PI * 2);
          ctx.fill();
          // Stem
          ctx.fillStyle = '#e8dec8';
          ctx.fillRect(cx - e.facing * 4 - 1.5, cy - 6, 3, 5);

          // Glowing amber eye (dilates when chasing player)
          const eyeRadius = e.isAlert ? 3.5 : 2.5;
          ctx.fillStyle = '#ffe259';
          ctx.shadowColor = '#ffe259';
          ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.arc(e.facing > 0 ? e.x + e.w - 5 : e.x + 5, cy - 1, eyeRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          break;
        }

        case 'sporeling': {
          // Puffball Sporeling: squash-and-stretch hopping bounce & venting spore chimney
          const bounce = Math.abs(Math.sin(walk * 0.8)) * 8;
          const squashX = 1.0 + (bounce > 2 ? -0.15 : 0.25);
          const squashY = 1.0 + (bounce > 2 ? 0.25 : -0.2);
          const cx = e.x + e.w / 2;
          const cy = e.y + e.h / 2 - bounce;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(squashX, squashY);

          // Fungal spherical body
          ctx.fillStyle = flash ? '#ffffff' : '#2d6e46';
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.fill();

          // Spore spots
          ctx.fillStyle = '#8df6fa';
          ctx.beginPath();
          ctx.arc(-5, -4, 2.5, 0, Math.PI * 2);
          ctx.arc(5, -5, 2.5, 0, Math.PI * 2);
          ctx.arc(0, 4, 2.0, 0, Math.PI * 2);
          ctx.fill();

          // Spore vent chimney
          ctx.fillStyle = '#1e4a2f';
          ctx.fillRect(-3, -17, 6, 5);

          // Venting spore ring expanding upward
          const ringPhase = (breath * 0.8) % 1.0;
          const ringY = -17 - ringPhase * 16;
          const ringR = 3 + ringPhase * 7;
          ctx.strokeStyle = `rgba(141, 246, 250, ${1 - ringPhase})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, ringY, ringR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();
          break;
        }

        case 'bat': {
          // Gloam-Moth / Leaf-Flitter: multi-segment leaf/silk wings & drifting pollen motes
          const flap = Math.sin(wing) * 14;
          const cx = e.x + e.w / 2;
          const cy = e.y + e.h / 2;

          // Body
          ctx.fillStyle = flash ? '#ffffff' : '#192b21';
          ctx.beginPath();
          ctx.ellipse(cx, cy, 6, 11, 0, 0, Math.PI * 2);
          ctx.fill();

          // Multi-segment gossamer leaf wings
          ctx.fillStyle = flash ? '#ffffff' : '#336d44';
          ctx.strokeStyle = '#5de08e';
          ctx.lineWidth = 1.2;

          for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(cx, cy - 2);
            ctx.quadraticCurveTo(cx + side * 18, cy - 14 + flap, cx + side * 26, cy + flap);
            ctx.quadraticCurveTo(cx + side * 14, cy + 8 + flap * 0.5, cx, cy + 4);
            ctx.fill();
            ctx.stroke();

            // Wing leaf veins
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + side * 20, cy + flap * 0.7);
            ctx.stroke();
          }

          // Feathery moth antennae
          ctx.strokeStyle = '#e6decb';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx - 2, cy - 10);
          ctx.lineTo(cx - 7, cy - 18 + Math.sin(wing * 0.5) * 2);
          ctx.moveTo(cx + 2, cy - 10);
          ctx.lineTo(cx + 7, cy - 18 + Math.sin(wing * 0.5) * 2);
          ctx.stroke();

          // Glowing emerald eyes
          ctx.fillStyle = '#5ce1e6';
          ctx.beginPath();
          ctx.arc(cx - 2, cy - 6, 2.2, 0, Math.PI * 2);
          ctx.arc(cx + 2, cy - 6, 2.2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'sentinel': {
          // Bramble-Bark Sentry: heavy wooden golem stride, creaking branch arms & pulsing eye slit
          const cx = e.x + e.w / 2;
          const stepAngle = Math.sin(walk * 0.5) * 0.25;

          // Trunk Legs
          ctx.fillStyle = flash ? '#ffffff' : '#2e2015';
          for (const side of [-1, 1]) {
            const legShift = side * stepAngle * 10;
            ctx.fillRect(cx + side * 8 - 4, e.y + e.h - 18 + legShift, 8, 18);
          }

          // Bark Torso
          ctx.fillStyle = flash ? '#ffffff' : '#453120';
          ctx.beginPath();
          ctx.roundRect(e.x + 4, e.y + 10, e.w - 8, e.h - 22, 6);
          ctx.fill();

          // Bark Head with Moss Crown
          ctx.fillStyle = flash ? '#ffffff' : '#594029';
          ctx.fillRect(e.x + 8, e.y, e.w - 16, 14);
          ctx.fillStyle = '#3a7d4c';
          ctx.fillRect(e.x + 6, e.y - 3, e.w - 12, 5);

          // Creaking branch arms swinging with momentum
          const armSwing = Math.sin(walk * 0.5) * 12;
          ctx.strokeStyle = '#3d2b1c';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(e.x + 6, e.y + 14);
          ctx.lineTo(e.x - 6 - armSwing, e.y + 28);
          ctx.moveTo(e.x + e.w - 6, e.y + 14);
          ctx.lineTo(e.x + e.w + 6 + armSwing, e.y + 28);
          ctx.stroke();

          // Glowing vertical ocular slit (pulses alert crimson when chasing)
          const slitColor = e.isAlert ? '#ff5252' : '#5ce1a2';
          ctx.fillStyle = slitColor;
          ctx.shadowColor = slitColor;
          ctx.shadowBlur = 6;
          ctx.fillRect(e.facing > 0 ? e.x + e.w - 12 : e.x + 6, e.y + 4, 6, 6);
          ctx.shadowBlur = 0;
          break;
        }

        case 'thumper': {
          // Root-Horned Brute: 4-legged gallop with heavy hooves & massive curved wooden horns
          const cx = e.x + e.w / 2;
          const gallop = Math.sin(walk * 0.7);

          // Heavy Hoofed Legs
          ctx.fillStyle = flash ? '#ffffff' : '#211811';
          for (let i = -1; i <= 1; i += 2) {
            const hoofShift = i * gallop * 8;
            ctx.fillRect(cx + i * 14 - 5, e.y + e.h - 16 + hoofShift, 10, 16);
          }

          // Massive Hulking Body
          ctx.fillStyle = flash ? '#ffffff' : '#382718';
          ctx.beginPath();
          ctx.roundRect(e.x + 3, e.y + 10, e.w - 6, e.h - 20, 8);
          ctx.fill();

          // Massive curved wooden horns (tined)
          ctx.strokeStyle = '#9c663a';
          ctx.lineWidth = 5;
          ctx.beginPath();
          // Left Horn
          ctx.moveTo(cx - 10, e.y + 8);
          ctx.quadraticCurveTo(cx - 24, e.y - 6, cx - 20, e.y - 18);
          // Right Horn
          ctx.moveTo(cx + 10, e.y + 8);
          ctx.quadraticCurveTo(cx + 24, e.y - 6, cx + 20, e.y - 18);
          ctx.stroke();

          // Glowing predator eye
          ctx.fillStyle = '#ffb347';
          ctx.shadowColor = '#ffb347';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(e.facing > 0 ? e.x + e.w - 8 : e.x + 8, e.y + 16, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          break;
        }

        case 'crystal_golem': {
          // Geode-Bramble Golem: boulder bound in roots with open glowing geode
          ctx.fillStyle = flash ? '#ffffff' : '#352e42';
          ctx.beginPath();
          ctx.roundRect(e.x + 4, e.y + 4, e.w - 8, e.h - 8, 8);
          ctx.fill();

          // Glowing amethyst geode in chest
          ctx.fillStyle = '#b174f2';
          ctx.beginPath();
          ctx.arc(e.x + e.w / 2, e.y + e.h / 2, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(e.x + e.w / 2, e.y + e.h / 2, 4, 0, Math.PI * 2);
          ctx.fill();

          // Thorny vine binding
          ctx.strokeStyle = '#285233';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(e.x + 4, e.y + 12);
          ctx.lineTo(e.x + e.w - 4, e.y + e.h - 12);
          ctx.stroke();
          break;
        }

        case 'wisp': {
          // Forest Will-o'-Wisp: floating twin spirit motes with trailing silk tails
          const bob = Math.sin(time * 5 + e.x) * 4;
          const cx = e.x + e.w / 2;
          const cy = e.y + e.h / 2 + bob;

          // Outer luminous glow
          const wGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 16);
          wGrad.addColorStop(0, '#ffffff');
          wGrad.addColorStop(0.4, '#5ce1e6');
          wGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = wGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, 16, 0, Math.PI * 2);
          ctx.fill();

          // Twin orbiting satellite spirit motes
          for (let sat = 0; sat < 2; sat++) {
            const satAngle = time * 7 + sat * Math.PI;
            const sx = cx + Math.cos(satAngle) * 12;
            const sy = cy + Math.sin(satAngle) * 7;
            ctx.fillStyle = '#8df6fa';
            ctx.beginPath();
            ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        default: {
          // General Shadow-Bramble Creature
          ctx.fillStyle = flash ? '#ffffff' : '#2a3b2b';
          ctx.beginPath();
          ctx.roundRect(e.x, e.y, e.w, e.h, 6);
          ctx.fill();

          ctx.fillStyle = '#56d38a';
          ctx.beginPath();
          ctx.arc(e.facing > 0 ? e.x + e.w - 8 : e.x + 8, e.y + 10, 3.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
      ctx.restore();
    }

    // Bosses (Primal Undercroft Guardians)
    if (game.activeBoss && !game.activeBoss.dead) {
      const b = game.activeBoss;
      ctx.save();
      const flash = b.hurtFlash > 0;

      if (b.type === 'boss_stalker') {
        // The Brood-Matriarch (Horned Stag-Beetle with bioluminescent flora)
        ctx.fillStyle = flash ? '#ffffff' : '#21422c';
        ctx.beginPath();
        ctx.roundRect(b.x, b.y + 14, b.w, b.h - 14, 16);
        ctx.fill();

        // Giant branching root-horns
        ctx.strokeStyle = '#8f5c35';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(b.x + b.w / 2 + b.facing * 10, b.y + 16);
        ctx.lineTo(b.x + b.w / 2 + b.facing * 35, b.y - 18);
        ctx.lineTo(b.x + b.w / 2 + b.facing * 48, b.y - 14);
        ctx.stroke();

        // Back flora garden (glowing mushrooms)
        ctx.fillStyle = '#56d38a';
        ctx.beginPath();
        ctx.arc(b.x + 20, b.y + 12, 7, 0, Math.PI * 2);
        ctx.arc(b.x + 40, b.y + 8, 8.5, 0, Math.PI * 2);
        ctx.fill();

      } else if (b.type === 'boss_archon') {
        // Archon Malakor (Fallen Elder Spirit with Briar-Thorn Crown & Branch Wings)
        ctx.fillStyle = flash ? '#ffffff' : '#140c1a';
        ctx.beginPath();
        ctx.roundRect(b.x, b.y + 12, b.w, b.h - 12, 14);
        ctx.fill();

        // Jagged Thorn-Crown
        ctx.strokeStyle = '#e05368';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(b.x + 10, b.y + 14);
        ctx.lineTo(b.x + 18, b.y - 8);
        ctx.lineTo(b.x + b.w / 2, b.y + 8);
        ctx.lineTo(b.x + b.w - 18, b.y - 8);
        ctx.lineTo(b.x + b.w - 10, b.y + 14);
        ctx.stroke();

        // Glowing Abyssal Void Heart
        ctx.fillStyle = '#e05368';
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + 40, 10, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // The Prism Warden
        ctx.fillStyle = flash ? '#ffffff' : '#2b1b42';
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 14);
        ctx.fill();

        ctx.fillStyle = '#b174f2';
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  drawPlayer(ctx, p, game, time) {
    ctx.save();
    if (p.invulnTimer > 0 && Math.floor(time * 20) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    const px = p.x + p.w / 2;
    const py = p.y + p.h;
    const isHealing = (p.healAnimTimer || 0) > 0;
    const levitate = isHealing ? -Math.sin(time * 6) * 7 - 5 : 0;

    // Apply Squash & Stretch Physics Scale & Levitation
    ctx.translate(px, py + levitate);
    ctx.scale(p.scaleX || 1.0, p.scaleY || 1.0);

    // Subtle run lean when sprinting along the ground
    if (p.onGround && Math.abs(p.vx) > 30) {
      const runLean = p.facing * Math.min(0.14, Math.abs(p.vx) / 1600);
      ctx.rotate(runLean);
    }
    ctx.translate(-px, -py);

    // Focus Heal Aura: Swirling emerald & cyan will-o'-wisp ring
    if (isHealing) {
      const hPulse = 1.0 + 0.2 * Math.sin(time * 8);
      const hGrad = ctx.createRadialGradient(px, py - 20, 4, px, py - 20, 36 * hPulse);
      hGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      hGrad.addColorStop(0.5, 'rgba(92, 225, 230, 0.25)');
      hGrad.addColorStop(1, 'rgba(92, 225, 230, 0)');
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.arc(px, py - 20, 36 * hPulse, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting healing wisps
      for (let w = 0; w < 3; w++) {
        const wAngle = time * 7 + (w * Math.PI * 2) / 3;
        const wx = px + Math.cos(wAngle) * 22;
        const wy = py - 20 + Math.sin(wAngle) * 12;
        ctx.fillStyle = '#6ee68e';
        ctx.beginPath();
        ctx.arc(wx, wy, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 1. Layered Woven Moss & Bark Mantle (fluttering cape history)
    ctx.fillStyle = game.hasAbility('thornWard') ? '#2e1840' : '#193824';
    ctx.beginPath();
    ctx.moveTo(px, p.y + 12);
    for (let i = 0; i < p.capeHistory.length; i++) {
      const pt = p.capeHistory[i];
      ctx.lineTo(pt.x - p.facing * (i * 3.0), pt.y + i * 3.4);
    }
    ctx.lineTo(px, p.y + p.h - 4);
    ctx.fill();

    // Cape inner silver-birch bark trim
    ctx.fillStyle = '#32573e';
    ctx.beginPath();
    ctx.moveTo(px, p.y + 16);
    if (p.capeHistory.length > 3) {
      const mid = p.capeHistory[Math.floor(p.capeHistory.length / 2)];
      ctx.lineTo(mid.x - p.facing * 6, mid.y);
    }
    ctx.lineTo(px, p.y + p.h - 8);
    ctx.fill();

    // 2. Animated Shadow-Spirit Feet / Steps
    if (p.onGround && Math.abs(p.vx) > 10) {
      const stepPhase = p.walkCycle || (time * 12);
      ctx.fillStyle = '#0a0f12';
      for (const side of [-1, 1]) {
        const footLift = Math.sin(stepPhase + (side > 0 ? Math.PI : 0)) * 3;
        const footX = px + side * 5;
        const footY = p.y + p.h - Math.max(0, footLift);
        ctx.beginPath();
        ctx.arc(footX, footY - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Shadow-Spirit Body
    ctx.fillStyle = '#0a0f12';
    ctx.beginPath();
    ctx.roundRect(p.x + 4, p.y + 14, p.w - 8, p.h - 14, 6);
    ctx.fill();

    // 4. Wicker Will-o'-Wisp Lantern (at hip)
    const lx = p.x + (p.facing > 0 ? 5 : p.w - 5);
    const ly = p.y + 30;

    // Wicker basket frame
    ctx.strokeStyle = '#5c4530';
    ctx.lineWidth = 2;
    ctx.strokeRect(lx - 5, ly - 7, 10, 14);

    // Living, bobbing Will-o'-Wisp inside
    const wispBob = Math.sin(time * 8) * 2;
    const wispPulse = 1.0 + 0.2 * Math.sin(time * 10);
    const wispGrad = ctx.createRadialGradient(lx, ly + wispBob, 1, lx, ly + wispBob, 12 * wispPulse);
    wispGrad.addColorStop(0, '#ffffff');
    wispGrad.addColorStop(0.45, '#5ce1e6');
    wispGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = wispGrad;
    ctx.beginPath();
    ctx.arc(lx, ly + wispBob, 12 * wispPulse, 0, Math.PI * 2);
    ctx.fill();

    // 5. Shadow Spirit Head
    ctx.fillStyle = '#0a0f12';
    ctx.beginPath();
    ctx.arc(px, p.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();

    // 6. Branching Wooden Antlers (Trähorn) with delicate leaf buds
    ctx.strokeStyle = '#4a3525';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    // Left antler
    ctx.moveTo(p.x + 8, p.y + 5);
    ctx.lineTo(p.x + 2, p.y - 7);
    ctx.lineTo(p.x - 3, p.y - 12);
    ctx.moveTo(p.x + 2, p.y - 7);
    ctx.lineTo(p.x + 7, p.y - 14);
    // Right antler
    ctx.moveTo(p.x + p.w - 8, p.y + 5);
    ctx.lineTo(p.x + p.w - 2, p.y - 7);
    ctx.lineTo(p.x + p.w + 3, p.y - 12);
    ctx.moveTo(p.x + p.w - 2, p.y - 7);
    ctx.lineTo(p.x + p.w - 7, p.y - 14);
    ctx.stroke();

    // Leaf buds on antler tips
    ctx.fillStyle = '#6ee68e';
    ctx.beginPath();
    ctx.arc(p.x - 3, p.y - 12, 1.8, 0, Math.PI * 2);
    ctx.arc(p.x + 7, p.y - 14, 1.8, 0, Math.PI * 2);
    ctx.arc(p.x + p.w + 3, p.y - 12, 1.8, 0, Math.PI * 2);
    ctx.arc(p.x + p.w - 7, p.y - 14, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 7. Luminous Azure Spirit Eyes
    const eyeOffset = p.facing * 3.0;
    // Eye glow aura
    ctx.fillStyle = 'rgba(92, 225, 230, 0.45)';
    ctx.beginPath();
    ctx.arc(px + eyeOffset - 3, p.y + 10, 4, 0, Math.PI * 2);
    ctx.arc(px + eyeOffset + 3, p.y + 10, 4, 0, Math.PI * 2);
    ctx.fill();
    // Pure glowing eye cores
    ctx.fillStyle = '#5ce1e6';
    ctx.beginPath();
    ctx.arc(px + eyeOffset - 3, p.y + 10, 2.2, 0, Math.PI * 2);
    ctx.arc(px + eyeOffset + 3, p.y + 10, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 8. Thorn-Glaive Blade & Emerald Slash Arc
    const atk = p.getAttackBox();
    if (atk) {
      ctx.strokeStyle = atk.isHeavy
        ? '#56d38a'
        : game.state.worldFlags.bladeTempered
        ? '#ffbe55'
        : '#5ce1e6';
      ctx.lineWidth = atk.isHeavy ? 9 : 5.5;
      ctx.beginPath();
      ctx.arc(
        atk.x + atk.w / 2,
        atk.y + atk.h / 2,
        Math.max(atk.w, atk.h) * 0.48,
        0,
        Math.PI * 1.45
      );
      ctx.stroke();

      // Trailing thorn spark
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(atk.x + atk.w * 0.8, atk.y + atk.h * 0.2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawProjectilesAndParticles(ctx, game) {
    for (const pr of game.projectiles) {
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const pt of game.particles) {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawCavernMist(ctx, biome, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const mistGrad = ctx.createLinearGradient(0, 780, 0, 960);
    mistGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    mistGrad.addColorStop(0.7, hexToRgba(biome.accent, 0.09));
    mistGrad.addColorStop(1, hexToRgba(biome.accent, 0.16));
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, 780, 1600, 180);
    ctx.restore();
  }

  drawLightingOverlay(ctx, room, biome, game, camX, camY, time) {
    const lctx = this.lightCtx;
    const W = this.lightCanvas.width;
    const H = this.lightCanvas.height;

    lctx.globalCompositeOperation = 'source-over';
    lctx.fillStyle = `rgba(3, 5, 11, ${1 - biome.ambientLight})`;
    lctx.fillRect(0, 0, W, H);

    lctx.globalCompositeOperation = 'destination-out';

    const punchLight = (wx, wy, radius) => {
      const sx = wx - camX;
      const sy = wy - camY;
      if (sx < -radius || sx > W + radius || sy < -radius || sy > H + radius) return;
      const g = lctx.createRadialGradient(sx, sy, radius * 0.1, sx, sy, radius);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.45, 'rgba(0,0,0,0.85)');
      g.addColorStop(0.75, 'rgba(0,0,0,0.4)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g;
      lctx.beginPath();
      lctx.arc(sx, sy, radius, 0, Math.PI * 2);
      lctx.fill();
    };

    // Player Soul-Lantern light pool
    const lanternScale = game.state.worldFlags.lanternUpgraded ? 1.45 : 1.0;
    const flicker = Math.sin(time * 9) * 7;
    punchLight(
      game.player.x + game.player.w / 2,
      game.player.y + game.player.h / 2,
      (265 + flicker) * lanternScale
    );

    // Brazier light
    if (room.brazier) {
      punchLight(room.brazier.x, room.brazier.y - 35, 235 + flicker);
    }

    // Room props light sources
    if (room.props) {
      for (const p of room.props) {
        if (
          p.type === 'lantern' ||
          p.type === 'lantern_post' ||
          p.type === 'candles' ||
          p.type === 'shrine' ||
          p.type === 'mushroom_giant' ||
          p.type === 'crystal_cluster' ||
          p.type === 'mysterious_light' ||
          p.type === 'hut'
        ) {
          punchLight(p.x, p.y - 30, 185);
        }
      }
    }

    ctx.drawImage(this.lightCanvas, 0, 0);
  }

  renderMinimap(game) {
    const ctx = this.mmCtx;
    const W = this.minimapCanvas.width;
    const H = this.minimapCanvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#070910';
    ctx.fillRect(0, 0, W, H);

    for (const rKey of Object.keys(ROOMS)) {
      if (!game.state.discoveredRooms[rKey]) continue;
      const r = ROOMS[rKey];
      const rx = 14 + (r.atlasPos.x - 1) * 30;
      const ry = 12 + r.atlasPos.y * 17;
      const b = BIOMES[r.biome];

      ctx.fillStyle = r.id === game.currentRoom.id ? '#5ce1e6' : b.stoneTrim;
      ctx.fillRect(rx, ry, 22, 11);
      ctx.strokeStyle = '#d4b886';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, 22, 11);
    }
  }

  renderAtlas(game) {
    const ctx = this.atlasCtx;
    const W = this.atlasCanvas.width;
    const H = this.atlasCanvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#06080f';
    ctx.fillRect(0, 0, W, H);

    // Connection lines
    ctx.strokeStyle = 'rgba(212, 184, 134, 0.45)';
    ctx.lineWidth = 3;
    for (const rKey of Object.keys(ROOMS)) {
      if (!game.state.discoveredRooms[rKey]) continue;
      const r = ROOMS[rKey];
      const x1 = 90 + (r.atlasPos.x - 1) * 130 + 48;
      const y1 = 35 + r.atlasPos.y * 65 + 18;
      for (const dir of Object.keys(r.exits || {})) {
        const targetId = r.exits[dir].targetRoom;
        const tr = ROOMS[targetId];
        if (!tr) continue;
        const x2 = 90 + (tr.atlasPos.x - 1) * 130 + 48;
        const y2 = 35 + tr.atlasPos.y * 65 + 18;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // Nodes
    this.atlasNodes = [];
    for (const rKey of Object.keys(ROOMS)) {
      const discovered = !!game.state.discoveredRooms[rKey];
      if (!discovered && rKey !== 'abyss_sanctum') continue;
      const r = ROOMS[rKey];
      const rx = 90 + (r.atlasPos.x - 1) * 130;
      const ry = 35 + r.atlasPos.y * 65;
      const rw = 96;
      const rh = 36;
      const b = BIOMES[r.biome];

      this.atlasNodes.push({ room: r, x: rx, y: ry, w: rw, h: rh, discovered });

      ctx.fillStyle = discovered ? b.stoneMain : 'rgba(40, 20, 35, 0.5)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = r.id === game.currentRoom.id ? '#5ce1e6' : b.accent;
      ctx.lineWidth = r.id === game.currentRoom.id ? 3 : 1.5;
      ctx.strokeRect(rx, ry, rw, rh);

      ctx.fillStyle = '#e8e3d9';
      ctx.font = '10px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(discovered ? r.name.slice(0, 15) : 'Abyssal Sanctum', rx + rw / 2, ry + 22);

      // Markers
      if (r.id === game.currentRoom.id) {
        ctx.fillStyle = '#5ce1e6';
        ctx.beginPath();
        ctx.arc(rx + 12, ry + 10, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (r.brazier && discovered) {
        ctx.fillStyle = '#f3a847';
        ctx.beginPath();
        ctx.arc(rx + rw - 12, ry + 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (r.npcs && r.npcs.length > 0 && discovered) {
        ctx.fillStyle = '#56d38a';
        ctx.beginPath();
        ctx.arc(rx + rw - 24, ry + 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (r.id === 'abyss_sanctum') {
        ctx.fillStyle = '#e05368';
        ctx.beginPath();
        ctx.arc(rx + 12, ry + 10, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function hexToRgba(hex, alpha = 1) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


// === FILE: src/game.js ===
// Main Game Engine, World State Controller, Input, UI & Quest Progression







class InputManager {
  constructor() {
    this.down = {};
    this.pressed = {};
    this.keyMap = {
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
      ArrowUp: 'up',
      KeyW: 'up',
      ArrowDown: 'down',
      KeyS: 'down',
      Space: 'jump',
      KeyJ: 'attack',
      KeyZ: 'attack',
      KeyX: 'attack',
      KeyK: 'dash',
      ShiftLeft: 'dash',
      ShiftRight: 'dash',
      KeyC: 'dash',
      KeyL: 'heavy',
      KeyV: 'heavy',
      KeyE: 'interact',
      Enter: 'interact',
      KeyH: 'heal',
      KeyF: 'heal',
      KeyQ: 'quests',
      KeyM: 'map',
      KeyI: 'inventory',
      Escape: 'pause'
    };

    window.addEventListener('keydown', (e) => {
      audio.init();
      const act = this.keyMap[e.code];
      if (act) {
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }
        if (!this.down[act]) {
          this.pressed[act] = true;
        }
        this.down[act] = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      const act = this.keyMap[e.code];
      if (act) {
        this.down[act] = false;
      }
    });
  }

  bindTouchControls(container) {
    const buttons = container.querySelectorAll('[data-touch]');
    buttons.forEach((btn) => {
      const act = btn.getAttribute('data-touch');
      const start = (e) => {
        e.preventDefault();
        audio.init();
        if (!this.down[act]) this.pressed[act] = true;
        this.down[act] = true;
      };
      const end = (e) => {
        e.preventDefault();
        this.down[act] = false;
      };
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
      btn.addEventListener('mouseleave', end);
    });
  }

  isDown(act) {
    return !!this.down[act];
  }

  justPressed(act) {
    return !!this.pressed[act];
  }

  clearFrame() {
    this.pressed = {};
  }
}

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.atlasCanvas = document.getElementById('atlas-canvas');

    this.input = new InputManager();
    this.renderer = new Renderer(this.canvas, this.minimapCanvas, this.atlasCanvas);
    this.player = new Player();
    this.state = createInitialState();

    this.currentRoom = null;
    this.enemies = [];
    this.activeBoss = null;
    this.activeHazards = [];
    this.movingPlatforms = [];
    this.projectiles = [];
    this.particles = [];

    this.camX = 0;
    this.camY = 0;
    this.shakeTime = 0;
    this.shakeMag = 0;
    this.screenShakeEnabled = true;

    this.mode = 'title'; // 'title', 'playing', 'paused', 'dialogue', 'dead', 'victory'
    this.selectedQuestId = 'q_main_rescue';
    this.nearInteractable = null;
    this.interactCooldown = 0;
    this.dialogueActions = [];
    this.dialogueSelectedIndex = 0;

    this.lastTime = performance.now();
    this.elapsedTime = 0;

    this.setupUI();
    this.refreshTitleScreen();
    requestAnimationFrame((t) => this.loop(t));
  }

  setupUI() {
    // Title Screen buttons
    document.getElementById('btn-continue').addEventListener('click', () => {
      audio.init();
      this.continueGame();
    });
    document.getElementById('btn-new-game').addEventListener('click', () => {
      audio.init();
      this.startNewGame();
    });
    document.getElementById('btn-title-controls').addEventListener('click', () => {
      audio.init();
      this.openPauseModal('tab-inventory');
    });
    document.getElementById('btn-title-settings').addEventListener('click', () => {
      audio.init();
      this.openPauseModal('tab-settings');
    });

    // Pause Modal Tabs
    document.querySelectorAll('.tab-btn[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        this.switchModalTab(tabId);
      });
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      this.closePauseModal();
    });

    document.getElementById('minimap-canvas').addEventListener('click', () => {
      if (this.mode === 'playing') this.openPauseModal('tab-map');
    });

    // Atlas Hover / Click
    this.atlasCanvas.addEventListener('mousemove', (e) => {
      const rect = this.atlasCanvas.getBoundingClientRect();
      const scaleX = this.atlasCanvas.width / rect.width;
      const scaleY = this.atlasCanvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const nodes = this.renderer.atlasNodes || [];
      for (const n of nodes) {
        if (mx >= n.x && mx <= n.x + n.w && my >= n.y && my <= n.y + n.h) {
          const b = BIOMES[n.room.biome];
          document.getElementById('atlas-room-title').textContent = n.discovered
            ? `${n.room.name} (${b.name})`
            : 'Abyssal Sanctum (Final Objective)';
          document.getElementById('atlas-room-desc').textContent = n.discovered
            ? `Connections: ${Object.keys(n.room.exits || {}).join(', ').toUpperCase()}${n.room.brazier ? ' • Soul Brazier Checkpoint' : ''}`
            : 'Break the Three Choir Seals to unseal the Deep Abyss and rescue Liora.';
          break;
        }
      }
    });

    // Settings Controls
    const updateAudioSettings = () => {
      const m = Number(document.getElementById('opt-master-vol').value) / 100;
      const mu = Number(document.getElementById('opt-music-vol').value) / 100;
      const s = Number(document.getElementById('opt-sfx-vol').value) / 100;
      audio.setVolumes(m, mu, s);
    };
    document.getElementById('opt-master-vol').addEventListener('input', updateAudioSettings);
    document.getElementById('opt-music-vol').addEventListener('input', updateAudioSettings);
    document.getElementById('opt-sfx-vol').addEventListener('input', updateAudioSettings);

    document.getElementById('opt-screenshake').addEventListener('change', (e) => {
      this.screenShakeEnabled = e.target.checked;
    });

    document.getElementById('opt-touch-controls').addEventListener('change', (e) => {
      document.getElementById('touch-controls').classList.toggle('hidden', !e.target.checked);
    });

    this.input.bindTouchControls(document.getElementById('touch-controls'));

    // Save Management Buttons
    document.getElementById('btn-save-now').addEventListener('click', () => {
      SaveSystem.save(this.state);
      document.getElementById('save-status-msg').textContent =
        'Progress saved at ' + new Date().toLocaleTimeString();
      this.showToast('Journey Saved', 'All quests, relics, and checkpoints recorded.');
    });

    document.getElementById('btn-respawn-brazier').addEventListener('click', () => {
      this.closePauseModal();
      this.respawnAtBrazier();
    });

    document.getElementById('btn-reset-save').addEventListener('click', () => {
      SaveSystem.clear();
      this.closePauseModal();
      this.mode = 'title';
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('title-screen').classList.remove('hidden');
      this.refreshTitleScreen();
    });

    // Death & Victory Screen Buttons
    document.getElementById('btn-respawn').addEventListener('click', () => {
      document.getElementById('death-screen').classList.add('hidden');
      this.respawnAtBrazier();
    });

    document.getElementById('btn-continue-exploring').addEventListener('click', () => {
      document.getElementById('victory-screen').classList.add('hidden');
      this.mode = 'playing';
      SaveSystem.save(this.state);
    });

    document.getElementById('btn-victory-title').addEventListener('click', () => {
      SaveSystem.save(this.state);
      document.getElementById('victory-screen').classList.add('hidden');
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('title-screen').classList.remove('hidden');
      this.mode = 'title';
      this.refreshTitleScreen();
    });
  }

  refreshTitleScreen() {
    const hasSave = SaveSystem.hasSave();
    const btnContinue = document.getElementById('btn-continue');
    const summaryEl = document.getElementById('save-summary');
    btnContinue.classList.toggle('hidden', !hasSave);
    summaryEl.classList.toggle('hidden', !hasSave);

    if (hasSave) {
      const saved = SaveSystem.load();
      if (saved) {
        const roomsCount = Object.keys(saved.discoveredRooms || {}).length;
        const totalRooms = Object.keys(ROOMS).length;
        const seals = ['seal_caverns', 'seal_crystals', 'seal_gardens'].filter(
          (k) => saved.inventory && saved.inventory[k]
        ).length;
        summaryEl.textContent = `Saved Journey: ${saved.checkpoint?.name || 'Sanctum of Ash'} • ${roomsCount}/${totalRooms} Chambers Charted • ${seals}/3 Choir Seals • ${saved.lumens || 0} Lumens`;
      }
    }
  }

  startNewGame() {
    this.state = createInitialState();
    this.syncPlayerWithState();
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    this.mode = 'playing';
    this.loadRoom('ruins_sinkhole', 180, 820, true);
    SaveSystem.save(this.state);
    this.showToast(
      'Descent into Vespera',
      "Inspect Liora's Singed Ribbon ahead and speak with Orin the Chronicler."
    );
  }

  continueGame() {
    const loaded = SaveSystem.load();
    if (!loaded) {
      this.startNewGame();
      return;
    }
    this.state = loaded;
    this.syncPlayerWithState();
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    this.mode = 'playing';
    const cp = this.state.checkpoint || { roomId: 'ruins_sinkhole', x: 310, y: 820 };
    this.loadRoom(cp.roomId, cp.x, cp.y, true);
  }

  syncPlayerWithState() {
    this.player.maxHp = this.state.maxHp || 5;
    this.player.hp = this.player.maxHp;
    this.player.maxSoul = this.state.maxSoul || 100;
    this.player.soul = Math.min(this.player.maxSoul, 60);
    this.updateHud();
  }

  hasAbility(abId) {
    return !!(this.state.abilities && this.state.abilities[abId]);
  }

  unlockAbility(abId) {
    if (!this.state.abilities[abId]) {
      this.state.abilities[abId] = true;
      const def = ABILITY_DEFS[abId];
      audio.questComplete();
      this.showToast(`Ability Awakened: ${def ? def.name : abId}`, def ? `${def.desc} (${def.keyHint})` : '');
      if (abId === 'dash') {
        this.advanceQuest('q_main_rescue', 'gain_dash');
      }
      this.updateHud();
      SaveSystem.save(this.state);
    }
  }

  giveItem(itemId) {
    this.state.inventory[itemId] = true;
    const def = ITEM_DEFS[itemId];
    audio.collect();
    if (def) {
      this.showToast(`Acquired: ${def.name}`, def.desc);
    }

    // Check Quest Triggers for items
    if (itemId === 'clue_ribbon') {
      this.advanceQuest('q_main_rescue', 'find_first_clue');
    }
    if (itemId === 'clue_ledger') {
      this.advanceQuest('q_main_rescue', 'reach_village');
    }
    if (itemId === 'rare_mushroom') {
      this.startQuest('q_mushroom');
      this.advanceQuest('q_mushroom', 'collect_mushroom');
    }
    if (itemId === 'bridge_pinion') {
      this.startQuest('q_bridge');
      this.advanceQuest('q_bridge', 'find_gear');
    }
    if (itemId === 'lost_relic') {
      this.startQuest('q_relic');
      this.advanceQuest('q_relic', 'retrieve_chalice');
    }
    if (itemId === 'wisp_core') {
      this.startQuest('q_lights');
      this.advanceQuest('q_lights', 'spot_lights');
      this.advanceQuest('q_lights', 'follow_lights_chamber');
      this.completeQuest('q_lights', { maxHp: 1 });
    }
    if (
      this.state.inventory.shrine_rune_1 &&
      this.state.inventory.shrine_rune_2 &&
      this.state.inventory.shrine_rune_3
    ) {
      this.startQuest('q_shrine');
      this.advanceQuest('q_shrine', 'collect_tablets');
    }
    if (
      this.state.inventory.plant_glowmoss &&
      this.state.inventory.plant_crystalbloom &&
      this.state.inventory.plant_dewthorn
    ) {
      this.startQuest('q_plants');
      this.advanceQuest('q_plants', 'gather_3_plants');
    }
    const sealsCount = ['seal_caverns', 'seal_crystals', 'seal_gardens'].filter(
      (k) => this.state.inventory[k]
    ).length;
    if (sealsCount === 3 && this.hasAbility('heavySlash')) {
      this.advanceQuest('q_main_rescue', 'break_three_seals');
    }

    this.updateHud();
    SaveSystem.save(this.state);
  }

  startQuest(questId) {
    if (!this.state.quests[questId]) {
      this.state.quests[questId] = {
        status: 'active',
        completedStages: {}
      };
      const qDef = QUEST_DEFS.find((q) => q.id === questId);
      if (qDef) {
        this.showToast(`New Quest: ${qDef.title}`, qDef.description.slice(0, 95) + '...');
      }
      this.updateHud();
      SaveSystem.save(this.state);
    }
  }

  advanceQuest(questId, stageId) {
    if (!this.state.quests[questId]) {
      this.startQuest(questId);
    }
    const q = this.state.quests[questId];
    if (!q.completedStages[stageId]) {
      q.completedStages[stageId] = true;
      this.updateHud();
      SaveSystem.save(this.state);
    }
  }

  completeQuest(questId, rewards = {}) {
    if (!this.state.quests[questId]) {
      this.startQuest(questId);
    }
    const q = this.state.quests[questId];
    if (q.status === 'completed') return;
    q.status = 'completed';

    const qDef = QUEST_DEFS.find((d) => d.id === questId);
    if (qDef) {
      qDef.stages.forEach((s) => {
        q.completedStages[s.id] = true;
      });
    }

    if (rewards.maxHp) {
      this.state.maxHp += rewards.maxHp;
      this.player.maxHp = this.state.maxHp;
      this.player.hp = this.player.maxHp;
    }
    if (rewards.maxSoul) {
      this.state.maxSoul += rewards.maxSoul;
      this.player.maxSoul = this.state.maxSoul;
      this.player.soul = this.player.maxSoul;
    }
    if (rewards.lumens) {
      this.state.lumens += rewards.lumens;
    }

    audio.questComplete();
    if (qDef) {
      this.showToast(`Quest Completed: ${qDef.title}`, `Reward: ${qDef.rewardText}`);
    }
    this.updateHud();
    SaveSystem.save(this.state);
  }

  isItemCollected(roomId, itemDef) {
    if (itemDef.type === 'ability') {
      return this.hasAbility(itemDef.ability);
    }
    if (itemDef.type === 'item') {
      return !!this.state.inventory[itemDef.id];
    }
    return !!this.state.collectedMapItems[`${roomId}:${itemDef.id}`];
  }

  isSealGateOpen() {
    return !!(
      this.state.inventory.seal_caverns &&
      this.state.inventory.seal_crystals &&
      this.state.inventory.seal_gardens
    );
  }

  loadRoom(roomId, spawnX, spawnY, showBanner = false) {
    const room = ROOMS[roomId];
    if (!room) return;
    const prevBiome = this.currentRoom ? this.currentRoom.biome : null;
    this.currentRoom = room;
    this.state.discoveredRooms[roomId] = true;

    this.player.x = spawnX;
    this.player.y = spawnY - this.player.h;
    this.player.vx = 0;
    this.player.vy = 0;

    // Quest trigger on entering certain rooms
    if (roomId === 'village_west') {
      this.advanceQuest('q_main_rescue', 'reach_village');
    }
    if (roomId === 'crystals_spire') {
      this.startQuest('q_lights');
      this.advanceQuest('q_lights', 'spot_lights');
    }

    // Spawn Enemies
    this.enemies = (room.enemies || []).map((e) => new Enemy(e));

    // Spawn Boss if not defeated
    this.activeBoss = null;
    if (room.boss && !this.state.defeatedBosses[room.boss.id]) {
      this.activeBoss = new Boss(room.boss);
      document.getElementById('boss-hud').classList.remove('hidden');
      document.getElementById('boss-name').textContent = room.boss.name;
      document.getElementById('boss-title').textContent = room.boss.subtitle;
      document.getElementById('boss-hp-fill').style.width = '100%';
    } else {
      document.getElementById('boss-hud').classList.add('hidden');
    }

    // Setup Moving Platforms
    this.movingPlatforms = (room.movingPlatforms || []).map((mp) => ({
      ...mp,
      baseX: mp.x,
      baseY: mp.y,
      t: 0,
      isMoving: true,
      CarryDx: 0
    }));

    // Setup Active Hazards
    this.activeHazards = (room.hazards || []).map((h) => ({
      ...h,
      currentY: h.y,
      vy: 0,
      falling: false,
      respawnTimer: 0,
      shaking: false,
      shakeTimer: 0,
      collapsed: false,
      collapseTimer: 0,
      puffTimer: Math.random() * 3,
      puffActive: false
    }));

    this.projectiles = [];
    this.particles = [];

    // Audio & Area Banner
    audio.setRegion(room.biome, !!this.activeBoss);
    if (showBanner || prevBiome !== room.biome) {
      const b = BIOMES[room.biome];
      const banner = document.getElementById('area-banner');
      document.getElementById('area-banner-title').textContent = b.name.toUpperCase();
      document.getElementById('area-banner-sub').textContent = `${room.name} — ${b.subtitle}`;
      banner.classList.remove('hidden');
      banner.style.animation = 'none';
      void banner.offsetWidth;
      banner.style.animation = 'fadeBanner 4.2s ease forwards';
    }

    this.renderer.renderMinimap(this);
    this.updateHud();
  }

  getSolidPlatforms() {
    if (!this.currentRoom) return [];
    const list = [...(this.currentRoom.platforms || [])];

    // Moving platforms
    for (const mp of this.movingPlatforms) {
      list.push(mp);
    }

    // Crumbling platforms that haven't collapsed
    for (const h of this.activeHazards) {
      if (h.type === 'crumbling' && !h.collapsed) {
        list.push({
          x: h.x,
          y: h.y,
          w: h.w,
          h: h.h,
          onStep: () => {
            if (!h.shaking) {
              h.shaking = true;
              h.shakeTimer = 0.55;
            }
          }
        });
      }
    }

    // Repaired Bridge in village_bridge
    if (this.currentRoom.bridgeGap && this.state.worldFlags.bridgeRepaired) {
      list.push({
        ...this.currentRoom.bridgeGap,
        isBridge: true
      });
    }

    // Unbroken Secret Walls
    if (this.currentRoom.secretWalls) {
      for (const sw of this.currentRoom.secretWalls) {
        if (!this.state.brokenWalls[sw.id]) {
          list.push(sw);
        }
      }
    }

    // Three-Seal Gate in abyss_gate
    if (this.currentRoom.sealGate && !this.isSealGateOpen()) {
      list.push(this.currentRoom.sealGate);
    }

    return list;
  }

  spawnParticles(x, y, color, count = 10, speed = 80) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.3 + Math.random() * 0.7) * speed;
      const life = 0.35 + Math.random() * 0.45;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 20,
        color,
        size: 2 + Math.random() * 3,
        life,
        maxLife: life
      });
    }
  }

  addScreenShake(mag, duration) {
    if (!this.screenShakeEnabled) return;
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  damagePlayer(amount = 1) {
    if (this.player.invulnTimer > 0 || this.mode !== 'playing') return;
    this.player.hp -= amount;
    this.player.invulnTimer = 1.15;
    this.player.vy = -280;
    this.player.vx = -this.player.facing * 220;
    audio.playerHurt();
    this.addScreenShake(7, 0.25);
    this.spawnParticles(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2,
      '#e05368',
      18,
      140
    );
    this.updateHud();

    if (this.player.hp <= 0) {
      this.mode = 'dead';
      document.getElementById('death-screen').classList.remove('hidden');
    }
  }

  respawnAtBrazier() {
    this.player.hp = this.player.maxHp;
    this.player.soul = Math.max(this.player.soul, 50);
    const cp = this.state.checkpoint || { roomId: 'ruins_sinkhole', x: 310, y: 820 };
    this.mode = 'playing';
    this.loadRoom(cp.roomId, cp.x, cp.y, true);
    this.updateHud();
  }

  loop(now) {
    const dt = Math.min(0.033, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.elapsedTime += dt;

    this.handleGlobalShortcuts();

    if (this.mode === 'playing') {
      this.state.playTimeSeconds += dt;
      this.updatePlaying(dt);
    }

    this.renderer.render(this, this.elapsedTime);
    this.input.clearFrame();
    requestAnimationFrame((t) => this.loop(t));
  }

  handleGlobalShortcuts() {
    if (this.mode === 'playing') {
      if (this.input.justPressed('pause')) {
        this.openPauseModal('tab-quests');
      } else if (this.input.justPressed('quests')) {
        this.openPauseModal('tab-quests');
      } else if (this.input.justPressed('map')) {
        this.openPauseModal('tab-map');
      } else if (this.input.justPressed('inventory')) {
        this.openPauseModal('tab-inventory');
      }
    } else if (this.mode === 'dialogue') {
      if (this.input.justPressed('left') || this.input.justPressed('up')) {
        this.navigateDialogueChoices(-1);
      } else if (this.input.justPressed('right') || this.input.justPressed('down')) {
        this.navigateDialogueChoices(1);
      } else if (this.input.justPressed('interact') || this.input.justPressed('jump')) {
        this.activateDialogueChoice();
      } else if (this.input.justPressed('pause')) {
        this.closeDialogueModal();
      }
    } else if (this.mode === 'paused') {
      if (this.input.justPressed('pause')) {
        this.closePauseModal();
      }
    } else if (this.mode === 'dead') {
      if (this.input.justPressed('interact') || this.input.justPressed('jump')) {
        document.getElementById('death-screen').classList.add('hidden');
        this.respawnAtBrazier();
      }
    }
  }

  updatePlaying(dt) {
    const room = this.currentRoom;
    if (!room) return;

    // 1. Update Moving Platforms
    for (const mp of this.movingPlatforms) {
      const prevX = mp.x;
      mp.t += dt * mp.speed;
      mp.x = mp.baseX + Math.sin(mp.t) * mp.dx;
      mp.y = mp.baseY + Math.sin(mp.t) * mp.dy;
      mp.CarryDx = mp.x - prevX;
    }

    // 2. Update Player
    this.player.update(dt, this.input, this);

    // 3. Check Room Exits
    this.checkRoomExits(room);

    // 4. Update Hazards & Check Collisions
    this.updateHazards(dt);

    // 5. Update Combat (Sword Slash vs Enemies, Bosses, Secret Walls, Liora's Cage)
    this.updateCombat(dt);

    // 6. Update Enemies & Boss
    for (const e of this.enemies) {
      e.update(dt, this);
      if (!e.dead && rectOverlap(this.player, e)) {
        this.damagePlayer(1);
      }
    }
    if (this.activeBoss && !this.activeBoss.dead) {
      this.activeBoss.update(dt, this);
      if (rectOverlap(this.player, this.activeBoss)) {
        this.damagePlayer(1);
      }
    }

    // 7. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      const pBox = { x: pr.x - pr.r, y: pr.y - pr.r, w: pr.r * 2, h: pr.r * 2 };
      if (rectOverlap(this.player, pBox)) {
        this.damagePlayer(1);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (pr.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    // 8. Check Auto-Pickups & Proximity Interactables
    this.updateInteractables(room, dt);

    // 9. Update Ambient & Action Particles
    this.updateParticles(dt, room);

    // 10. Update Camera
    this.updateCamera(dt);
  }

  checkRoomExits(room) {
    if (!room.exits) return;
    const p = this.player;
    if (p.x < 12 && room.exits.left) {
      const ex = room.exits.left;
      this.loadRoom(ex.targetRoom, ex.targetX, ex.targetY);
    } else if (p.x + p.w > 1588 && room.exits.right) {
      const ex = room.exits.right;
      this.loadRoom(ex.targetRoom, ex.targetX, ex.targetY);
    } else if (p.y < 14 && room.exits.top) {
      const ex = room.exits.top;
      this.loadRoom(ex.targetRoom, ex.targetX, ex.targetY);
    } else if (p.y + p.h > 944 && room.exits.bottom) {
      const ex = room.exits.bottom;
      this.loadRoom(ex.targetRoom, ex.targetX, ex.targetY);
    }
  }

  updateHazards(dt) {
    for (const h of this.activeHazards) {
      if (h.type === 'spikes') {
        if (rectOverlap(this.player, h)) {
          this.damagePlayer(1);
          // Safety bounce out of spikes
          this.player.vy = -420;
        }
      } else if (h.type === 'thorns') {
        if (!this.hasAbility('thornWard') && rectOverlap(this.player, h)) {
          this.damagePlayer(1);
          this.player.vy = -420;
        }
      } else if (h.type === 'crumbling') {
        if (h.shaking) {
          h.shakeTimer -= dt;
          if (h.shakeTimer <= 0) {
            h.shaking = false;
            h.collapsed = true;
            h.collapseTimer = 2.6;
            this.spawnParticles(h.x + h.w / 2, h.y + 10, '#9e988e', 10, 75);
          }
        } else if (h.collapsed) {
          h.collapseTimer -= dt;
          if (h.collapseTimer <= 0) {
            h.collapsed = false;
          }
        }
      } else if (h.type === 'falling_rock') {
        if (h.respawnTimer > 0) {
          h.respawnTimer -= dt;
          if (h.respawnTimer <= 0) {
            h.currentY = h.y;
            h.vy = 0;
            h.falling = false;
          }
        } else if (!h.falling) {
          if (Math.abs(this.player.x - h.x) < 95 && this.player.y > h.y) {
            h.falling = true;
            h.vy = 60;
          }
        } else {
          h.vy += 980 * dt;
          h.currentY += h.vy * dt;
          const rBox = { x: h.x - 12, y: h.currentY, w: 24, h: 32 };
          if (rectOverlap(this.player, rBox)) {
            this.damagePlayer(1);
            h.respawnTimer = 2.5;
          } else if (h.currentY > 855) {
            this.spawnParticles(h.x, 865, '#7c859e', 8, 90);
            h.respawnTimer = 2.5;
          }
        }
      } else if (h.type === 'poison_plant') {
        h.puffTimer += dt;
        h.puffActive = h.puffTimer % 3.2 > 1.8;
        if (h.puffActive && !this.hasAbility('thornWard')) {
          const dist = Math.hypot(
            this.player.x + this.player.w / 2 - h.x,
            this.player.y + this.player.h / 2 - (h.y - 20)
          );
          if (dist < 48) {
            this.damagePlayer(1);
          }
        }
      }
    }
  }

  updateCombat(dt) {
    const atk = this.player.getAttackBox();
    if (!atk) return;

    const bonusMult = this.state.worldFlags.bladeTempered ? 1.35 : 1.0;
    const damage = Math.round(atk.damage * bonusMult);
    const soulGain = this.state.worldFlags.soulCatcher ? 18 : 12;

    // 1. Secret Walls
    if (this.currentRoom.secretWalls) {
      for (const sw of this.currentRoom.secretWalls) {
        if (!this.state.brokenWalls[sw.id] && rectOverlap(atk, sw)) {
          this.state.brokenWalls[sw.id] = true;
          audio.secretFound();
          this.addScreenShake(6, 0.22);
          this.spawnParticles(sw.x + sw.w / 2, sw.y + sw.h / 2, '#6be3a2', 24, 150);
          this.showToast('Secret Passage Discovered!', sw.hint || 'A concealed route opens.');
          if (sw.id === 'sec_wall_house') {
            this.startQuest('q_secret_house');
            this.advanceQuest('q_secret_house', 'discover_house');
          }
          SaveSystem.save(this.state);
        }
      }
    }

    // 2. Enemies
    for (const e of this.enemies) {
      if (e.dead || this.player.hitTargetsThisSwing?.has(e)) continue;
      if (rectOverlap(atk, e)) {
        this.player.hitTargetsThisSwing?.add(e);
        e.hp -= damage;
        e.hurtFlash = 0.14;
        audio.hitEnemy();
        this.player.soul = Math.min(this.player.maxSoul, this.player.soul + soulGain);
        if (this.player.attackDir === 'down') {
          this.player.vy = -440; // Pogo bounce!
        }
        this.spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#ffbe55', 10, 110);

        if (e.hp <= 0) {
          e.dead = true;
          this.state.lumens += 8;
          this.spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#f3a847', 16, 130);
        }
        this.updateHud();
      }
    }

    // 3. Active Boss
    if (
      this.activeBoss &&
      !this.activeBoss.dead &&
      !this.player.hitTargetsThisSwing?.has(this.activeBoss) &&
      rectOverlap(atk, this.activeBoss)
    ) {
      const b = this.activeBoss;
      this.player.hitTargetsThisSwing?.add(b);
      b.hp -= damage;
      b.hurtFlash = 0.12;
      audio.hitEnemy();
      this.player.soul = Math.min(this.player.maxSoul, this.player.soul + soulGain);
      if (this.player.attackDir === 'down') {
        this.player.vy = -450;
      }
      const pct = Math.max(0, (b.hp / b.maxHp) * 100);
      document.getElementById('boss-hp-fill').style.width = `${pct}%`;
      this.spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#e05368', 14, 140);

      if (b.hp <= 0) {
        b.dead = true;
        this.state.defeatedBosses[b.id] = true;
        this.state.lumens += 100;
        document.getElementById('boss-hud').classList.add('hidden');
        audio.questComplete();
        audio.setRegion(this.currentRoom.biome, false);
        this.addScreenShake(10, 0.4);
        this.spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#8df6fa', 36, 200);
        this.showToast(`${b.name} Vanquished!`, '+100 Lumen Shards claimed.');
        SaveSystem.save(this.state);
      }
      this.updateHud();
    }

    // 4. Liora's Echo-Glass Cage in abyss_sanctum
    if (
      this.currentRoom.lioraCage &&
      !this.state.worldFlags.cageShattered &&
      (!this.activeBoss || this.activeBoss.dead)
    ) {
      const c = this.currentRoom.lioraCage;
      const cageBox = { x: c.x - 42, y: c.y - 100, w: 84, h: 100 };
      if (rectOverlap(atk, cageBox)) {
        this.state.worldFlags.cageShattered = true;
        audio.questComplete();
        this.addScreenShake(9, 0.35);
        this.spawnParticles(c.x, c.y - 50, '#8df6fa', 40, 200);
        this.showToast(
          'Echo-Glass Cage Shattered!',
          'Speak with Liora [E] to complete the rescue!'
        );
        SaveSystem.save(this.state);
      }
    }
  }

  updateInteractables(room, dt) {
    if (this.interactCooldown > 0) {
      this.interactCooldown -= dt;
    }
    const pCenter = {
      x: this.player.x + this.player.w / 2,
      y: this.player.y + this.player.h / 2
    };

    // Auto-collect items / abilities / lumen crystals on touch
    if (room.items) {
      for (const it of room.items) {
        if (this.isItemCollected(room.id, it)) continue;
        const dist = Math.hypot(pCenter.x - it.x, pCenter.y - it.y);
        if (dist < 42) {
          if (it.type === 'ability') {
            this.unlockAbility(it.ability);
          } else if (it.type === 'mask_upgrade') {
            this.state.collectedMapItems[`${room.id}:${it.id}`] = true;
            this.state.maxHp += 1;
            this.player.maxHp = this.state.maxHp;
            this.player.hp = this.player.maxHp;
            audio.questComplete();
            this.showToast('Ancient Mask Vessel Found!', 'Maximum Health permanently increased by +1.');
            this.updateHud();
            SaveSystem.save(this.state);
          } else if (it.type === 'lumen') {
            this.state.collectedMapItems[`${room.id}:${it.id}`] = true;
            this.state.lumens += it.amount || 30;
            audio.collect();
            this.showToast(`+${it.amount || 30} Lumen Shards`, 'Crystallized light added to your pouch.');
            this.updateHud();
            SaveSystem.save(this.state);
          } else if (it.type === 'item') {
            this.giveItem(it.id);
          }
        }
      }
    }

    // Check contextual [E] prompt for Braziers, NPCs, Shrine Altar, Lore Tablets
    this.nearInteractable = null;

    if (room.brazier) {
      const d = Math.hypot(pCenter.x - room.brazier.x, pCenter.y - (room.brazier.y - 25));
      if (d < 64) {
        this.nearInteractable = {
          label: `Rest & Save at ${room.brazier.name}`,
          action: () => {
            this.player.hp = this.player.maxHp;
            this.player.soul = this.player.maxSoul;
            this.state.checkpoint = {
              roomId: room.id,
              x: room.brazier.x,
              y: room.brazier.y - 10,
              name: room.brazier.name
            };
            audio.heal();
            this.spawnParticles(room.brazier.x, room.brazier.y - 40, '#5ce1e6', 24, 130);
            SaveSystem.save(this.state);
            this.updateHud();
            this.showToast('Soul Brazier Kindled', 'Health & Soul restored. Checkpoint saved.');
          }
        };
      }
    }

    if (!this.nearInteractable && room.shrineAltar) {
      const d = Math.hypot(pCenter.x - room.shrineAltar.x, pCenter.y - (room.shrineAltar.y - 25));
      if (d < 70) {
        this.nearInteractable = {
          label: 'Inspect the Forgotten Tri-Shrine Altar',
          action: () => {
            this.startQuest('q_shrine');
            this.advanceQuest('q_shrine', 'inspect_shrine');
            const hasAll3 =
              this.state.inventory.shrine_rune_1 &&
              this.state.inventory.shrine_rune_2 &&
              this.state.inventory.shrine_rune_3;
            if (hasAll3 && !this.state.worldFlags.shrineUnsealed) {
              this.state.worldFlags.shrineUnsealed = true;
              this.advanceQuest('q_shrine', 'unseal_shrine');
              this.completeQuest('q_shrine', { maxHp: 1, maxSoul: 30 });
              this.openLoreModal(
                'The Forgotten Tri-Shrine Unsealed!',
                'As you set the Verse Tablets of Stone, Tides, and Starlight into the altar recesses, a harmonic chord echoes through the Sanctum. Your Maximum Health (+1 Mask) and Maximum Soul (+30) have permanently expanded!'
              );
            } else if (this.state.worldFlags.shrineUnsealed) {
              this.openLoreModal(
                'The Unsealed Tri-Shrine',
                'The three ancient Verse Tablets hum softly with warm light.'
              );
            } else {
              const count = [
                this.state.inventory.shrine_rune_1,
                this.state.inventory.shrine_rune_2,
                this.state.inventory.shrine_rune_3
              ].filter(Boolean).length;
              this.openLoreModal(
                'Sealed Altar of the Three Verses',
                `Three recessed slots await the Verse Tablets of Stone (Sanctum of Ash), Tides (Flooded Tunnels), and Starlight (Crystal Depths). You currently hold ${count} of 3 tablets.`
              );
            }
          }
        };
      }
    }

    if (!this.nearInteractable && room.npcs) {
      for (const n of room.npcs) {
        if (n.requiresCageBroken && !this.state.worldFlags.cageShattered) continue;
        const d = Math.hypot(pCenter.x - n.x, pCenter.y - (n.y - 25));
        if (d < 68) {
          const def = NPC_DEFS[n.id];
          this.nearInteractable = {
            label: `Speak with ${def ? def.name : n.id}`,
            action: () => this.openNpcDialogue(n.id)
          };
          break;
        }
      }
    }

    if (!this.nearInteractable && room.loreTablets) {
      for (const lt of room.loreTablets) {
        const d = Math.hypot(pCenter.x - lt.x, pCenter.y - (lt.y - 25));
        if (d < 64) {
          this.nearInteractable = {
            label: `Read: ${lt.title}`,
            action: () => this.openLoreModal(lt.title, lt.text)
          };
          break;
        }
      }
    }

    const promptEl = document.getElementById('interaction-prompt');
    if (this.nearInteractable && this.interactCooldown <= 0) {
      promptEl.classList.remove('hidden');
      document.getElementById('interaction-text').textContent = this.nearInteractable.label;
      if (this.input.justPressed('interact')) {
        this.nearInteractable.action();
      }
    } else {
      promptEl.classList.add('hidden');
    }
  }

  openLoreModal(title, text) {
    this.mode = 'dialogue';
    const modal = document.getElementById('dialogue-modal');
    modal.classList.remove('hidden');
    document.getElementById('dlg-portrait').textContent = '❖';
    document.getElementById('dlg-speaker').textContent = title;
    document.getElementById('dlg-role').textContent = 'Ancient Inscription';
    document.getElementById('dlg-text').textContent = text;
    document.getElementById('dlg-shop-items').classList.add('hidden');

    const choicesEl = document.getElementById('dlg-choices');
    choicesEl.innerHTML = '';
    this.dialogueActions = [() => this.closeDialogueModal()];
    this.dialogueSelectedIndex = 0;

    const btn = document.createElement('button');
    btn.className = 'menu-btn primary-btn selected';
    btn.textContent = 'Close [E / Enter]';
    btn.addEventListener('click', () => this.dialogueActions[0]());
    choicesEl.appendChild(btn);
    this.updateDialogueSelection();
  }

  openNpcDialogue(npcId, branchKey = null) {
    const def = NPC_DEFS[npcId];
    if (!def) return;
    this.mode = 'dialogue';
    audio.npcVoice(def.voicePitch);

    const node = branchKey && def.branches?.[branchKey]
      ? def.branches[branchKey]
      : def.getDialogue(this.state);

    this.state.npcMet[npcId] = true;
    if (node.onOpen) {
      node.onOpen(this);
    }

    const modal = document.getElementById('dialogue-modal');
    modal.classList.remove('hidden');
    document.getElementById('dlg-portrait').textContent = def.icon || '❖';
    document.getElementById('dlg-speaker').textContent = def.name;
    document.getElementById('dlg-role').textContent = def.role;
    document.getElementById('dlg-text').textContent = node.text;

    const shopEl = document.getElementById('dlg-shop-items');
    if (def.isMerchant) {
      shopEl.classList.remove('hidden');
      this.renderMerchantShop(shopEl);
    } else {
      shopEl.classList.add('hidden');
    }

    const choicesEl = document.getElementById('dlg-choices');
    choicesEl.innerHTML = '';
    this.dialogueActions = [];
    this.dialogueSelectedIndex = 0;

    const choicesList = node.choices || [{ label: 'Farewell', close: true }];
    choicesList.forEach((ch, idx) => {
      const btn = document.createElement('button');
      btn.className = 'menu-btn primary-btn' + (idx === 0 ? ' selected' : '');
      btn.textContent = ch.label;
      const action = () => {
        if (ch.close) {
          this.closeDialogueModal();
        } else if (ch.next) {
          this.openNpcDialogue(npcId, ch.next);
        }
      };
      this.dialogueActions.push(action);
      btn.addEventListener('click', action);
      choicesEl.appendChild(btn);
    });
    this.updateDialogueSelection();

    SaveSystem.save(this.state);
  }

  navigateDialogueChoices(delta) {
    if (!this.dialogueActions || this.dialogueActions.length <= 1) return;
    audio.npcVoice(480);
    this.dialogueSelectedIndex =
      (this.dialogueSelectedIndex + delta + this.dialogueActions.length) %
      this.dialogueActions.length;
    this.updateDialogueSelection();
  }

  updateDialogueSelection() {
    const choicesEl = document.getElementById('dlg-choices');
    const buttons = choicesEl.querySelectorAll('.menu-btn');
    buttons.forEach((b, idx) => {
      if (idx === this.dialogueSelectedIndex) {
        b.classList.add('selected');
        b.focus();
      } else {
        b.classList.remove('selected');
      }
    });
  }

  activateDialogueChoice() {
    if (this.dialogueActions && this.dialogueActions[this.dialogueSelectedIndex]) {
      this.dialogueActions[this.dialogueSelectedIndex]();
    } else {
      this.closeDialogueModal();
    }
  }

  closeDialogueModal() {
    document.getElementById('dialogue-modal').classList.add('hidden');
    if (this.mode === 'dialogue') {
      this.mode = 'playing';
      this.input.pressed['interact'] = false;
      this.input.down['interact'] = false;
      this.interactCooldown = 0.25;
    }
  }

  triggerRescueVictory() {
    this.closeDialogueModal();
    this.state.worldFlags.lioraRescued = true;
    this.advanceQuest('q_main_rescue', 'rescue_liora');
    this.completeQuest('q_main_rescue', { lumens: 500 });

    this.mode = 'victory';
    const vScreen = document.getElementById('victory-screen');
    vScreen.classList.remove('hidden');

    const completedQuests = Object.values(this.state.quests).filter(
      (q) => q.status === 'completed'
    ).length;
    const cluesFound = Object.keys(this.state.inventory).filter((k) =>
      k.startsWith('clue_')
    ).length;
    const roomsCharted = Object.keys(this.state.discoveredRooms).length;

    document.getElementById('victory-stats').innerHTML = `
      <div class="stat-box">
        <div class="stat-val">${roomsCharted} / ${Object.keys(ROOMS).length}</div>
        <div class="stat-lbl">Chambers Charted</div>
      </div>
      <div class="stat-box">
        <div class="stat-val">${completedQuests} / ${QUEST_DEFS.length}</div>
        <div class="stat-lbl">Quests Completed</div>
      </div>
      <div class="stat-box">
        <div class="stat-val">${cluesFound} / 6</div>
        <div class="stat-lbl">Liora's Clues Found</div>
      </div>
    `;
    SaveSystem.save(this.state);
  }

  updateParticles(dt, room) {
    // Spawn subtle biome particles
    if (this.particles.length < 55 && Math.random() < 0.45) {
      const b = BIOMES[room.biome];
      this.particles.push({
        x: this.camX + Math.random() * this.canvas.width,
        y: this.camY + Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 18,
        vy: b.particleType === 'drips' ? 95 : -12 - Math.random() * 18,
        color: b.accent,
        size: 1.5 + Math.random() * 2,
        life: 1.8,
        maxLife: 1.8
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  updateCamera(dt) {
    const targetX = this.player.x + this.player.w / 2 - this.canvas.width / 2;
    const targetY = this.player.y + this.player.h / 2 - this.canvas.height / 2;

    this.camX += (targetX - this.camX) * Math.min(1, dt * 8);
    this.camY += (targetY - this.camY) * Math.min(1, dt * 8);

    // Clamp to 1600x960 room bounds
    this.camX = Math.max(0, Math.min(1600 - this.canvas.width, this.camX));
    this.camY = Math.max(0, Math.min(960 - this.canvas.height, this.camY));

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      this.camX += (Math.random() - 0.5) * this.shakeMag * 2;
      this.camY += (Math.random() - 0.5) * this.shakeMag * 2;
      if (this.shakeTime <= 0) this.shakeMag = 0;
    }
  }

  updateHud() {
    // Health Masks
    const heartsEl = document.getElementById('hud-hearts');
    if (heartsEl) {
      heartsEl.innerHTML = '';
      for (let i = 0; i < this.player.maxHp; i++) {
        const mask = document.createElement('div');
        mask.className = 'mask-heart' + (i >= this.player.hp ? ' empty' : '');
        heartsEl.appendChild(mask);
      }
    }

    // Soul Fill
    const soulPct = Math.max(0, Math.min(100, (this.player.soul / this.player.maxSoul) * 100));
    document.getElementById('hud-soul-fill').style.width = `${soulPct}%`;

    // Resources
    document.getElementById('hud-lumens').textContent = this.state.lumens;
    const seals = ['seal_caverns', 'seal_crystals', 'seal_gardens'].filter(
      (k) => this.state.inventory[k]
    ).length;
    document.getElementById('hud-seals').textContent = `${seals} / 3`;
    const clues = Object.keys(this.state.inventory).filter((k) => k.startsWith('clue_')).length;
    document.getElementById('hud-clues').textContent = `${clues} / 6`;

    // Abilities Bar
    const badgeMap = {
      slash: 'ab-slash',
      dash: 'ab-dash',
      wallJump: 'ab-wall',
      doubleJump: 'ab-double',
      heavySlash: 'ab-heavy',
      thornWard: 'ab-thorn'
    };
    for (const [abKey, domId] of Object.entries(badgeMap)) {
      const el = document.getElementById(domId);
      if (el) {
        const unlocked = this.hasAbility(abKey);
        el.classList.toggle('unlocked', unlocked);
        el.classList.toggle('locked', !unlocked);
      }
    }

    // Region & Room Name
    if (this.currentRoom) {
      const b = BIOMES[this.currentRoom.biome];
      document.getElementById('hud-region-name').textContent = b.name;
      document.getElementById('hud-room-name').textContent = this.currentRoom.name;
    }

    // Active Quest Tracker
    const mainQ = this.state.quests.q_main_rescue || { completedStages: {} };
    const mainDef = QUEST_DEFS[0];
    const nextStage =
      mainDef.stages.find((s) => !mainQ.completedStages[s.id]) ||
      mainDef.stages[mainDef.stages.length - 1];
    document.getElementById('hud-quest-title').textContent = mainDef.title;
    document.getElementById('hud-quest-desc').textContent = nextStage.text;
  }

  openPauseModal(tabId = 'tab-quests') {
    this.mode = 'paused';
    document.getElementById('pause-modal').classList.remove('hidden');
    this.switchModalTab(tabId);
  }

  closePauseModal() {
    document.getElementById('pause-modal').classList.add('hidden');
    if (document.getElementById('title-screen').classList.contains('hidden')) {
      this.mode = 'playing';
    } else {
      this.mode = 'title';
    }
  }

  switchModalTab(tabId) {
    document.querySelectorAll('.tab-btn[data-tab]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach((p) => {
      p.classList.toggle('active', p.id === tabId);
    });

    if (tabId === 'tab-quests') this.renderQuestsTab();
    if (tabId === 'tab-map') this.renderer.renderAtlas(this);
    if (tabId === 'tab-inventory') this.renderInventoryTab();
  }

  renderQuestsTab() {
    const listEl = document.getElementById('quest-list');
    listEl.innerHTML = '';

    QUEST_DEFS.forEach((qDef) => {
      const qState = this.state.quests[qDef.id] || { status: 'not_started', completedStages: {} };
      const item = document.createElement('div');
      item.className = 'quest-item' + (this.selectedQuestId === qDef.id ? ' selected' : '');
      const statusLabel =
        qState.status === 'completed'
          ? 'Completed'
          : qState.status === 'active'
          ? qDef.isMain
            ? 'Main Quest'
            : 'Active'
          : 'Uncharted Rumor';
      const tagClass =
        qState.status === 'completed' ? 'completed' : qDef.isMain ? 'main' : '';
      item.innerHTML = `
        <span class="quest-item-title">${qDef.title}</span>
        <span class="quest-tag ${tagClass}">${statusLabel}</span>
      `;
      item.addEventListener('click', () => {
        this.selectedQuestId = qDef.id;
        this.renderQuestsTab();
      });
      listEl.appendChild(item);
    });

    const selDef = QUEST_DEFS.find((q) => q.id === this.selectedQuestId) || QUEST_DEFS[0];
    const selState = this.state.quests[selDef.id] || { status: 'not_started', completedStages: {} };
    document.getElementById('qd-title').textContent = selDef.title;
    document.getElementById('qd-status').textContent =
      selState.status === 'completed'
        ? 'COMPLETED'
        : selState.status === 'active'
        ? 'IN PROGRESS'
        : 'DISCOVERABLE IN WORLD';
    document.getElementById('qd-giver').textContent = `${selDef.giver} • ${selDef.region}`;
    document.getElementById('qd-desc').textContent = selDef.description;

    const stagesEl = document.getElementById('qd-stages');
    stagesEl.innerHTML = '';
    let currentMarked = false;
    selDef.stages.forEach((st) => {
      const li = document.createElement('li');
      const isDone = !!selState.completedStages[st.id];
      if (isDone) {
        li.className = 'done';
      } else if (!currentMarked) {
        li.className = 'current';
        currentMarked = true;
      }
      li.textContent = st.text;
      stagesEl.appendChild(li);
    });

    document.getElementById('qd-reward').textContent = `Reward: ${selDef.rewardText}`;
  }

  renderInventoryTab() {
    const abEl = document.getElementById('abilities-list');
    abEl.innerHTML = '';
    Object.values(ABILITY_DEFS).forEach((ab) => {
      const unlocked = this.hasAbility(ab.id);
      const card = document.createElement('div');
      card.className = 'inv-card' + (unlocked ? ' unlocked' : '');
      card.innerHTML = `
        <div class="inv-card-title">${ab.name} ${unlocked ? '✓' : '(Locked)'}</div>
        <div class="inv-card-desc"><b>[${ab.keyHint}]</b> ${ab.desc}</div>
      `;
      abEl.appendChild(card);
    });

    const invEl = document.getElementById('inventory-list');
    invEl.innerHTML = '';
    const ownedKeys = Object.keys(this.state.inventory).filter((k) => this.state.inventory[k]);
    if (ownedKeys.length === 0) {
      invEl.innerHTML = `<div class="inv-card"><div class="inv-card-desc">Explore Vespera to collect Liora's trail clues, Choir Seals, and quest relics.</div></div>`;
    } else {
      ownedKeys.forEach((k) => {
        const def = ITEM_DEFS[k];
        if (!def) return;
        const card = document.createElement('div');
        card.className = 'inv-card unlocked';
        card.innerHTML = `
          <div class="inv-card-title">${def.name}</div>
          <div class="inv-card-desc">${def.desc}</div>
        `;
        invEl.appendChild(card);
      });
    }
  }

  showToast(title, body) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast-title">${title}</div>
      <div class="toast-body">${body}</div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4200);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.vesperaGame = new Game();
});



if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    if (!window.vesperaGame) window.vesperaGame = new Game();
  });
} else {
  if (!window.vesperaGame) window.vesperaGame = new Game();
}
})();
