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

    // Animation & Feel
    this.animTime = 0;
    this.walkCycle = 0;
    this.stepDustTimer = 0;
    this.dashGhostTimer = 0;
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.healAnimTimer = 0;
    this.capeHistory = [];
    this.slashTrails = [];
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
      this.scaleX = 1.38;
      this.scaleY = 0.70;
      if (!this.onGround) this.canAirDash = false;
      if (game.hasAbility('thornWard')) {
        this.invulnTimer = Math.max(this.invulnTimer, 0.22);
      }
      this.vx = this.facing * 640;
      this.vy = 0;
      audio.dash();
      game.spawnParticles(this.x + this.w / 2, this.y + this.h / 2, '#8df6fa', 14, 110);
    }

    // Active Dash
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.facing * 640;
      this.vy = 0;
      this.dashGhostTimer -= dt;
      if (this.dashGhostTimer <= 0) {
        this.dashGhostTimer = 0.035;
        game.spawnParticles(
          this.x + this.w / 2 - this.facing * 10,
          this.y + this.h / 2 + (Math.random() - 0.5) * 14,
          game.hasAbility('thornWard') ? '#b174f2' : '#5ce1e6',
          3,
          50
        );
      }
    } else {
      // Horizontal movement with smooth easing acceleration / deceleration
      let moveDir = 0;
      if (input.isDown('left')) moveDir -= 1;
      if (input.isDown('right')) moveDir += 1;

      if (this.wallJumpLock <= 0) {
        const targetVx = moveDir * maxSpeed;
        if (moveDir !== 0) {
          this.facing = moveDir;
          // Smooth acceleration easing towards target speed
          const accelLerp = this.onGround ? (this.onSlippery ? 6.5 : 18.0) : 11.0;
          this.vx += (targetVx - this.vx) * Math.min(1, dt * accelLerp);

          // Running footstep dust particles
          if (this.onGround && Math.abs(this.vx) > 40) {
            this.stepDustTimer -= dt;
            if (this.stepDustTimer <= 0) {
              this.stepDustTimer = 0.16;
              game.spawnParticles(
                this.x + this.w / 2 - this.facing * 8,
                this.y + this.h - 2,
                '#9e9587',
                2,
                30
              );
            }
          }
        } else {
          // Smooth deceleration easing towards stop
          const decelLerp = this.onGround ? (this.onSlippery ? 3.5 : 19.5) : 8.5;
          this.vx += (0 - this.vx) * Math.min(1, dt * decelLerp);
          if (Math.abs(this.vx) < 5) this.vx = 0;
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
        // Wall slide squash
        this.scaleX = 0.85;
        this.scaleY = 1.15;
        if (Math.random() < 0.4) {
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
        // Normal or Coyote Jump (tuned 20% higher so Kaelen reaches all platforms cleanly)
        this.vy = -680;
        this.scaleY = 1.30;
        this.scaleX = 0.76;
        this.onGround = false;
        this.coyoteTimer = 0;
        this.jumpBuffer = 0;
        this.dashTimer = 0;
        audio.jump();
        game.spawnParticles(this.x + this.w / 2, this.y + this.h, '#d4b886', 8, 75);
      } else if (this.wallSide !== 0 && game.hasAbility('wallJump')) {
        // Wall Jump
        this.vy = -650;
        this.scaleY = 1.32;
        this.scaleX = 0.74;
        this.vx = -this.wallSide * 340;
        this.facing = -this.wallSide;
        this.wallJumpLock = 0.15;
        this.jumpBuffer = 0;
        this.canDoubleJump = game.hasAbility('doubleJump');
        audio.wallJump();
        game.spawnParticles(
          this.wallSide === -1 ? this.x : this.x + this.w,
          this.y + this.h / 2,
          '#8df6fa',
          12,
          95
        );
      } else if (this.canDoubleJump && game.hasAbility('doubleJump')) {
        // Double Jump (Zephyr Plume)
        this.vy = -640;
        this.scaleY = 1.36;
        this.scaleX = 0.72;
        this.canDoubleJump = false;
        this.jumpBuffer = 0;
        audio.doubleJump();
        game.spawnParticles(this.x + this.w / 2, this.y + this.h, '#d27eff', 16, 120);
      }
    }

    // Variable Jump Height when releasing Jump button early
    if (!input.isDown('jump') && this.vy < -260) {
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
      game.addScreenShake(6, 0.22);
      game.spawnParticles(
        this.facing > 0 ? this.x + this.w + 25 : this.x - 25,
        this.y + 20,
        '#d27eff',
        18,
        140
      );
    }

    // Update Slash Trails
    for (let i = this.slashTrails.length - 1; i >= 0; i--) {
      this.slashTrails[i].life -= dt;
      if (this.slashTrails[i].life <= 0) {
        this.slashTrails.splice(i, 1);
      }
    }
    if (this.attackTimer > 0 || this.heavyTimer > 0) {
      const isHeavy = this.heavyTimer > 0;
      const prog = isHeavy ? 1 - this.heavyTimer / 0.26 : 1 - this.attackTimer / 0.15;
      this.slashTrails.push({
        x: this.x + this.w / 2,
        y: this.y + this.h / 2,
        facing: this.facing,
        dir: this.attackDir,
        prog,
        isHeavy,
        life: 0.10,
        maxLife: 0.10,
        tempered: !!game.state.worldFlags.bladeTempered
      });
    }

    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.heavyTimer > 0) this.heavyTimer -= dt;

    // Move & Collide X
    this.x += this.vx * dt;
    this.wallSide = 0;
    const solids = game.getSolidPlatforms();
    const isOneWayPlat = (p) => p.oneWay || (p.h <= 26 && p.y > 60 && p.y < 850);

    for (const p of solids) {
      if (isOneWayPlat(p)) continue;
      if (rectOverlap(this, p)) {
        if (this.vx > 0) {
          this.x = p.x - this.w;
          this.wallSide = 1;
        } else if (this.vx < 0) {
          this.x = p.x + p.w;
          this.wallSide = -1;
        }
        // Wall bump squash
        this.scaleX = 0.84;
        this.scaleY = 1.16;
        this.vx = 0;
      }
    }

    // Also detect adjacent wall within 3px for responsive Wall Jump
    if (!this.onGround && this.wallSide === 0) {
      for (const p of solids) {
        if (isOneWayPlat(p)) continue;
        if (this.y + this.h > p.y + 6 && this.y < p.y + p.h - 6) {
          if (Math.abs(this.x + this.w - p.x) <= 4) this.wallSide = 1;
          else if (Math.abs(this.x - (p.x + p.w)) <= 4) this.wallSide = -1;
        }
      }
    }

    // Move & Collide Y
    const prevBottom = this.y + this.h;
    const preVy = this.vy;
    this.y += this.vy * dt;
    this.onGround = false;
    this.onSlippery = false;

    for (const p of solids) {
      if (isOneWayPlat(p)) {
        // One-way platform: only collide when falling from above and not holding down+jump
        if (
          this.vy >= 0 &&
          prevBottom <= p.y + 14 &&
          !(input.isDown('down') && input.isDown('jump')) &&
          rectOverlap(this, p)
        ) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.onGround = true;
          if (preVy > 120) {
            const impactScale = Math.min(0.36, preVy / 1100);
            this.scaleY = 1.0 - impactScale;
            this.scaleX = 1.0 + impactScale;
            game.spawnParticles(this.x + this.w / 2, this.y + this.h, '#c4bcae', Math.min(8, Math.floor(preVy / 90)), 55);
          }
        }
        continue;
      }
      if (rectOverlap(this, p)) {
        if (this.vy >= 0) {
          if (preVy > 120) {
            const impactScale = Math.min(0.38, preVy / 1100);
            this.scaleY = 1.0 - impactScale;
            this.scaleX = 1.0 + impactScale;
            game.spawnParticles(this.x + this.w / 2, this.y + this.h, '#c4bcae', Math.min(10, Math.floor(preVy / 80)), 65);
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

    // Native 1280x720 HD Resolution with High-Quality Antialiasing
    this.viewW = 1280;
    this.viewH = 720;
    this.dpiScale = 1;
    this.canvas.width = this.viewW;
    this.canvas.height = this.viewH;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Offscreen lightmap canvas for localized pools of light
    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = this.viewW;
    this.lightCanvas.height = this.viewH;
    this.lightCtx = this.lightCanvas.getContext('2d');

    // Ambient background critters (tiny glowing beetles & cave moths)
    this.critters = Array.from({ length: 24 }, (_, i) => ({
      x: (i * 137) % 1600,
      y: 100 + ((i * 281) % 760),
      phase: i * 0.85,
      speed: 12 + (i % 6) * 5,
      size: 1.8 + (i % 3) * 0.7
    }));

    // Floating dream dust & soft bokeh orbs
    this.dreamDust = Array.from({ length: 48 }, (_, i) => ({
      x: (i * 197) % 1600,
      y: (i * 149) % 960,
      radius: 1.1 + (i % 4) * 0.55,
      vx: 5 + (i % 4) * 3.5,
      vy: -7 - (i % 5) * 4.5,
      pulse: i * 0.5,
      isGold: i % 3 === 0
    }));

    // Out-of-focus background bokeh light clusters
    this.bokehOrbs = Array.from({ length: 18 }, (_, i) => ({
      x: 120 + ((i * 263) % 1380),
      y: 140 + ((i * 179) % 640),
      r: 8 + (i % 5) * 6,
      phase: i * 1.1,
      warm: i % 2 === 0
    }));

    // Smoothly trailing floating Soul-Flame companion position
    this.wispX = 180;
    this.wispY = 800;

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

    const W = this.viewW;
    const H = this.viewH;

    ctx.save();
    ctx.scale(this.dpiScale, this.dpiScale);

    // 1. Deep Painterly Subterranean Cavern Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#070b14');
    bgGrad.addColorStop(0.38, biome.bgTop);
    bgGrad.addColorStop(0.75, biome.bgBot);
    bgGrad.addColorStop(1, '#04060b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Camera transform (smooth sub-pixel precision for high-DPI rendering)
    const camX = game.camX;
    const camY = game.camY;

    // 2. Parallax Distant Cathedral Vaults, Arches, Cliffs & Bokeh Lights
    this.drawParallaxBackground(ctx, biome, camX, camY, W, H, time);

    // 3. Volumetric God Rays
    this.drawVolumetricGodRays(ctx, biome, camX, camY, W, H, time);

    ctx.save();
    ctx.translate(-camX, -camY);

    // 4. Out-of-focus Bokeh Light Clusters & Dream Dust
    this.drawDreamDust(ctx, biome, time);
    this.drawBackgroundCritters(ctx, biome, time);

    // 4b. Watcher Atmosphere (Eyes in crevices & Stalking Gloam Prowler)
    this.drawWatcherAtmosphere(ctx, room, game, time);

    // 5. Midground Handcrafted Props & Architecture
    this.drawRoomProps(ctx, room, biome, time, game);

    // 6. Water Pools & Shimmering Reflections
    this.drawWaterPools(ctx, room, biome, time);

    // 7. Sculpted 3D Painterly Platforms, Tapered Floating Islands & Cliffs
    this.drawPlatforms(ctx, room, biome, game, time);

    // 8. Environmental Hazards (Spikes, Thorns, Crumbling, Falling Rocks, Poison Plants)
    this.drawHazards(ctx, room, game, time);

    // 9. Exit Doorway Portals
    this.drawExits(ctx, room, biome, time);

    // 10. Lore Obelisks, Forgotten Shrine, Soul Brazier, Collectibles, Liora's Cage
    this.drawInteractables(ctx, room, biome, game, time);

    // 11. Painterly NPCs with glowing auras & mushroom clusters
    this.drawNPCs(ctx, room, game, time);

    // 12. Bioluminescent Enemies & Bosses
    this.drawEnemies(ctx, game, time);

    // 13. Player (Warden Kaelen), Flowing Hair, Floating Flame Wisp & Slash Arcs
    this.drawPlayer(ctx, game.player, game, time);

    // 14. Projectiles & Sparks
    this.drawProjectilesAndParticles(ctx, game);

    // 15. Undulating Low Atmospheric Mist
    this.drawCavernMist(ctx, biome, time);

    // 15b. Dark Foreground Silhouette Framing (Gnarled Trees, Roots, Shelf Fungi & Vines)
    this.drawForegroundFraming(ctx, room, biome, camX, camY, W, H, time);

    ctx.restore();

    // 16. Enhanced Localized Lighting, Colored Surface Glow & Vignette Overlay
    this.drawLightingOverlay(ctx, room, biome, game, camX, camY, time);

    ctx.restore();
  }

  drawParallaxBackground(ctx, biome, camX, camY, W, H, time) {
    ctx.save();

    // Soft central atmospheric glow in the cavern depths
    const depthGlow = ctx.createRadialGradient(W * 0.45, H * 0.38, 30, W * 0.45, H * 0.38, W * 0.65);
    depthGlow.addColorStop(0, 'rgba(34, 52, 82, 0.38)');
    depthGlow.addColorStop(0.55, 'rgba(18, 28, 48, 0.18)');
    depthGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = depthGlow;
    ctx.fillRect(0, 0, W, H);

    // Layer 1: Distant Subterranean Cathedral Arches & Monolithic Columns (0.16x parallax)
    const px1 = -(camX * 0.16) % 420;
    for (let x = px1 - 420; x < W + 420; x += 420) {
      // Shaded Stone Column
      const colGrad = ctx.createLinearGradient(x + 60, 0, x + 135, 0);
      colGrad.addColorStop(0, '#090e18');
      colGrad.addColorStop(0.45, '#162136');
      colGrad.addColorStop(1, '#080c15');
      ctx.fillStyle = colGrad;
      ctx.fillRect(x + 60, 0, 75, H);

      // Column Capital Molding
      ctx.fillStyle = '#1b2840';
      ctx.fillRect(x + 50, 210, 95, 16);
      ctx.fillRect(x + 54, 226, 87, 10);

      // Grand Vaulted Arch connecting columns
      ctx.beginPath();
      ctx.moveTo(x + 98, 215);
      ctx.bezierCurveTo(x + 98, 45, x + 518, 45, x + 518, 215);
      ctx.lineWidth = 44;
      ctx.strokeStyle = '#0d1424';
      ctx.stroke();

      // Inner Arch Rim Highlight
      ctx.beginPath();
      ctx.moveTo(x + 120, 215);
      ctx.bezierCurveTo(x + 120, 72, x + 496, 72, x + 496, 215);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(65, 95, 140, 0.25)';
      ctx.stroke();

      // Hanging Stalactites & Mossy Roots inside the Archway
      ctx.fillStyle = '#0b111e';
      for (let s = 0; s < 4; s++) {
        const sx = x + 220 + s * 42;
        const sh = 45 + ((s * 29) % 55);
        ctx.beginPath();
        ctx.moveTo(sx - 7, 75 + Math.abs(s - 1.5) * 14);
        ctx.lineTo(sx, 75 + Math.abs(s - 1.5) * 14 + sh);
        ctx.lineTo(sx + 7, 75 + Math.abs(s - 1.5) * 14);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Layer 2: Mid-Distant Sloping Craggy Rock Buttresses & Distant Warm Bokeh Lights (0.32x parallax)
    const px2 = -(camX * 0.32) % 520;
    for (let x = px2 - 520; x < W + 520; x += 520) {
      // Sloping rock spire in mid-distance
      const rockGrad = ctx.createLinearGradient(x + 180, 120, x + 360, H);
      rockGrad.addColorStop(0, '#121a29');
      rockGrad.addColorStop(0.5, '#192436');
      rockGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = rockGrad;
      ctx.beginPath();
      ctx.moveTo(x + 140, H);
      ctx.lineTo(x + 230, 180);
      ctx.lineTo(x + 295, 140);
      ctx.lineTo(x + 410, H);
      ctx.closePath();
      ctx.fill();

      // Warm distant out-of-focus bokeh village/sanctuary lights on the rock face
      for (let b = 0; b < 5; b++) {
        const bx = x + 245 + ((b * 37) % 90);
        const by = 360 + b * 42;
        const pulse = 0.65 + 0.35 * Math.sin(time * 2.2 + b * 1.7);
        const bGrad = ctx.createRadialGradient(bx, by, 1, bx, by, 18);
        bGrad.addColorStop(0, `rgba(255, 225, 165, ${0.55 * pulse})`);
        bGrad.addColorStop(0.45, `rgba(255, 165, 75, ${0.24 * pulse})`);
        bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(bx, by, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawVolumetricGodRays(ctx, biome, camX, camY, W, H, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const numRays = 4;
    for (let i = 0; i < numRays; i++) {
      const rayOffset = (i * 360 + (time * 8)) % (W + 500) - 180;
      const pulse = 0.5 + 0.35 * Math.sin(time * 1.2 + i * 1.8);

      const grad = ctx.createLinearGradient(rayOffset, 0, rayOffset + 260, H);
      grad.addColorStop(0, hexToRgba('#8cb8ff', 0.11 * pulse));
      grad.addColorStop(0.5, hexToRgba(biome.accent, 0.05 * pulse));
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(rayOffset - 20, 0);
      ctx.lineTo(rayOffset + 85, 0);
      ctx.lineTo(rayOffset + 390, H);
      ctx.lineTo(rayOffset + 170, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawDreamDust(ctx, biome, time) {
    ctx.save();
    // 1. Soft out-of-focus background Bokeh Orbs
    for (const b of this.bokehOrbs) {
      const bx = b.x + Math.sin(time * 0.4 + b.phase) * 18;
      const by = b.y + Math.cos(time * 0.35 + b.phase) * 14;
      const alpha = 0.12 + 0.08 * Math.sin(time * 1.6 + b.phase);
      const col = b.warm ? '#ffb85c' : biome.accent;
      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, b.r * 2.2);
      grad.addColorStop(0, hexToRgba(col, alpha));
      grad.addColorStop(0.6, hexToRgba(col, alpha * 0.4));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, b.r * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Crisp floating spore & ember motes
    for (const d of this.dreamDust) {
      const x = (d.x + time * d.vx) % 1600;
      const y = (d.y + time * d.vy) % 960;
      const wrapY = y < 0 ? y + 960 : y;
      const pulse = 0.35 + 0.55 * Math.sin(time * 3 + d.pulse);
      const col = d.isGold ? '#ffd278' : biome.accent;

      ctx.fillStyle = col;
      ctx.globalAlpha = Math.max(0, pulse * 0.85);
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

      const isFloatingSlab = p.h <= 48 && p.y < 840 && !p.isBridge && p.w >= 45;

      if (isFloatingSlab) {
        // SCULPTED FLOATING ROCK ISLAND (Tapered Craggy Underside + Chiseled Facets + Hanging Roots)
        const extraDepth = Math.min(34, Math.max(18, p.w * 0.14));
        const bottomY = p.y + p.h + extraDepth;

        // 1. Deep Craggy Shadow Silhouette
        ctx.fillStyle = '#090c12';
        ctx.beginPath();
        ctx.moveTo(p.x - 5, p.y + 4);
        ctx.lineTo(p.x + p.w + 5, p.y + 4);
        ctx.lineTo(p.x + p.w - 4, p.y + p.h * 0.75);
        ctx.lineTo(p.x + p.w * 0.82, bottomY - 4);
        ctx.lineTo(p.x + p.w * 0.54, bottomY + 3);
        ctx.lineTo(p.x + p.w * 0.24, bottomY - 2);
        ctx.lineTo(p.x + 6, p.y + p.h * 0.8);
        ctx.closePath();
        ctx.fill();

        // 2. Mid-tone Chiseled 3D Rock Facets
        const rockGrad = ctx.createLinearGradient(p.x, p.y, p.x, bottomY);
        rockGrad.addColorStop(0, '#2d3746');
        rockGrad.addColorStop(0.38, '#1b222e');
        rockGrad.addColorStop(1, '#0b0e15');
        ctx.fillStyle = rockGrad;
        ctx.beginPath();
        ctx.moveTo(p.x - 3, p.y + 3);
        ctx.lineTo(p.x + p.w + 3, p.y + 3);
        ctx.lineTo(p.x + p.w - 8, p.y + p.h);
        ctx.lineTo(p.x + p.w * 0.68, bottomY - 5);
        ctx.lineTo(p.x + p.w * 0.35, bottomY - 3);
        ctx.lineTo(p.x + 9, p.y + p.h);
        ctx.closePath();
        ctx.fill();

        // 3. Upper Chiseled Stone Bevel Blocks
        for (let bx = p.x; bx < p.x + p.w - 14; bx += 36) {
          const bw = Math.min(34, p.x + p.w - bx);
          const bh = 11 + ((bx * 13) % 8);
          ctx.fillStyle = (bx % 72 === 0) ? '#323d4d' : '#26303d';
          ctx.beginPath();
          ctx.roundRect(bx + 1, p.y + 3, bw - 2, bh, 3);
          ctx.fill();

          // Warm/cool top rim highlight on stone block
          ctx.strokeStyle = 'rgba(165, 195, 215, 0.28)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(bx + 3, p.y + 4);
          ctx.lineTo(bx + bw - 3, p.y + 4);
          ctx.stroke();
        }

        // 4. Deep Rock Fissures / Cracks
        ctx.strokeStyle = '#07090e';
        ctx.lineWidth = 1.8;
        for (let cx = p.x + 28; cx < p.x + p.w - 24; cx += 52) {
          ctx.beginPath();
          ctx.moveTo(cx, p.y + 6);
          ctx.lineTo(cx - 6, p.y + 18);
          ctx.lineTo(cx + 4, p.y + p.h + 6);
          ctx.stroke();
        }

        // 5. Dangling Dark Roots & Hanging Tendrils underneath
        ctx.strokeStyle = '#0a0e13';
        ctx.lineWidth = 2.2;
        for (let rx = p.x + 18; rx < p.x + p.w - 18; rx += 22) {
          const rLen = 14 + ((rx * 17) % 22);
          const sway = Math.sin(time * 1.6 + rx * 0.1) * 2.5;
          ctx.beginPath();
          ctx.moveTo(rx, p.y + p.h + 4);
          ctx.quadraticCurveTo(rx + sway, p.y + p.h + rLen * 0.6, rx - sway * 0.7, p.y + p.h + rLen);
          ctx.stroke();

          // Root cross-knot
          if (rx % 44 === 0) {
            ctx.beginPath();
            ctx.moveTo(rx - 8, p.y + p.h + 6);
            ctx.quadraticCurveTo(rx, p.y + p.h + 15, rx + 9, p.y + p.h + 5);
            ctx.stroke();
          }
        }

        // 6. Lush Painterly Moss Cushion along Top Surface
        this.drawPainterlyMossTop(ctx, p.x - 2, p.y, p.w + 4, biome, time);

      } else if (p.isBridge) {
        // Wooden Suspension Bridge Planks & Cables
        ctx.fillStyle = '#2b1d14';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        for (let bx = p.x; bx < p.x + p.w; bx += 18) {
          ctx.fillStyle = (bx % 36 === 0) ? '#593c28' : '#472f1f';
          ctx.beginPath();
          ctx.roundRect(bx + 1, p.y - 2, 15, 9, 2);
          ctx.fill();
        }
      } else {
        // SCULPTED 3D CLIFF WALLS, PILLARS & GROUND STRATA
        const baseGrad = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
        baseGrad.addColorStop(0, '#1a222e');
        baseGrad.addColorStop(0.5, '#111721');
        baseGrad.addColorStop(1, '#080b10');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(p.x, p.y, p.w, p.h);

        // Chiseled 3D Rock Boulders along the edges & face
        const blockH = 28;
        const blockW = 46;
        for (let by = p.y; by < p.y + Math.min(p.h, 320); by += blockH) {
          const rowOffset = ((Math.floor((by - p.y) / blockH)) % 2) * 20;
          for (let bx = p.x; bx < p.x + p.w; bx += blockW) {
            const cw = Math.min(blockW - 2, p.x + p.w - bx);
            const ch = Math.min(blockH - 2, p.y + p.h - by);
            if (cw < 8 || ch < 8) continue;

            // Only draw detailed blocks near top or left/right cliff faces for performance & beauty
            const isNearEdge = (by - p.y < 64) || (bx - p.x < 56) || (p.x + p.w - bx < 68);
            if (!isNearEdge) continue;

            const shade = ((bx + by + rowOffset) % 3 === 0) ? '#293445' : '#1e2734';
            ctx.fillStyle = shade;
            ctx.beginPath();
            ctx.roundRect(bx + 1, by + 1, cw, ch, 4);
            ctx.fill();

            // Chiseled rock highlight bevel
            ctx.strokeStyle = 'rgba(150, 185, 205, 0.16)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(bx + 3, by + 2.5);
            ctx.lineTo(bx + cw - 3, by + 2.5);
            ctx.stroke();

            // Dark rock crevice mortar
            ctx.strokeStyle = '#090c12';
            ctx.lineWidth = 1.8;
            ctx.strokeRect(bx + 1, by + 1, cw, ch);
          }
        }

        // Climbing Woody Vines, Leaf Clusters & Shelf Mushrooms on Tall Cliffs/Pillars
        if (p.h >= 80) {
          // Left & right cliff vines
          for (const side of [0, 1]) {
            const vx = side === 0 ? p.x + 6 : p.x + p.w - 6;
            ctx.strokeStyle = '#1f3622';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(vx, p.y + 8);
            for (let vy = p.y + 20; vy < p.y + Math.min(p.h, 280); vy += 28) {
              const wave = Math.sin(vy * 0.08 + side * 2) * 8;
              ctx.lineTo(vx + wave, vy);
            }
            ctx.stroke();

            // Small vine leaves & bracket/shelf fungi
            for (let vy = p.y + 32; vy < p.y + Math.min(p.h, 260); vy += 44) {
              const wave = Math.sin(vy * 0.08 + side * 2) * 6;
              ctx.fillStyle = '#4e8a3c';
              ctx.beginPath();
              ctx.ellipse(vx + wave + (side === 0 ? -4 : 4), vy, 4.5, 2.5, side === 0 ? -0.4 : 0.4, 0, Math.PI * 2);
              ctx.fill();

              // Shelf mushroom cluster
              if (vy % 88 < 44) {
                const dir = side === 0 ? -1 : 1;
                ctx.fillStyle = '#8c6849';
                ctx.beginPath();
                ctx.ellipse(vx + dir * 4, vy + 12, 7, 3, 0, Math.PI, 0, false);
                ctx.fill();
                ctx.fillStyle = '#cfa87e';
                ctx.beginPath();
                ctx.ellipse(vx + dir * 3, vy + 16, 5, 2.2, 0, Math.PI, 0, false);
                ctx.fill();
              }
            }
          }
        }

        // Lush Painterly Moss Carpet on Top Ledge
        this.drawPainterlyMossTop(ctx, p.x, p.y, p.w, biome, time);
      }

      ctx.restore();
    }

    // Secret Destructible Walls
    if (room.secretWalls) {
      for (const sw of room.secretWalls) {
        if (game.state.brokenWalls[sw.id]) continue;
        ctx.save();
        ctx.fillStyle = '#1c2430';
        ctx.fillRect(sw.x, sw.y, sw.w, sw.h);

        // Luminous fracture veins
        const pulse = 0.55 + 0.4 * Math.sin(time * 3);
        ctx.strokeStyle = game.state.worldFlags.lanternUpgraded
          ? `rgba(92, 225, 230, ${pulse})`
          : `rgba(145, 225, 160, ${pulse * 0.8})`;
        ctx.lineWidth = 2.8;
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
      ctx.fillStyle = '#140c1f';
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
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sg.x + sg.w / 2, sy, 14, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sg.x + sg.w / 2, sy, lit ? 8 : 5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  drawPainterlyMossTop(ctx, x, y, w, biome, time) {
    ctx.save();
    const isCrystal = biome.id === 'crystals';
    const baseMoss = isCrystal ? '#3a2859' : '#264723';
    const midMoss = isCrystal ? '#643d96' : '#467d34';
    const brightMoss = isCrystal ? '#a76eff' : '#7ec449';

    // 1. Deep Moss Cushion Pillows
    ctx.fillStyle = baseMoss;
    for (let mx = x + 4; mx < x + w - 4; mx += 18) {
      const mw = Math.min(22, x + w - mx);
      const mh = 5 + ((mx * 7) % 4);
      ctx.beginPath();
      ctx.ellipse(mx + mw * 0.5, y + 2, mw * 0.55, mh * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Mid-tone Lush Moss Layer
    ctx.fillStyle = midMoss;
    for (let mx = x + 6; mx < x + w - 6; mx += 16) {
      const mw = Math.min(18, x + w - mx);
      ctx.beginPath();
      ctx.ellipse(mx + mw * 0.5, y + 0.5, mw * 0.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Rim-Lit Top Moss Highlights & Grass Blades
    ctx.fillStyle = brightMoss;
    for (let gx = x + 5; gx < x + w - 5; gx += 9) {
      const bladeH = 3 + Math.sin(gx * 0.4 + time * 2) * 1.8;
      ctx.beginPath();
      ctx.moveTo(gx - 1.5, y + 1);
      ctx.lineTo(gx + Math.sin(time * 2.2 + gx) * 1.2, y - bladeH);
      ctx.lineTo(gx + 1.5, y + 1);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  drawRoomProps(ctx, room, biome, time, game) {
    if (!room.props) return;
    for (const p of room.props) {
      ctx.save();
      switch (p.type) {
        case 'pillar': {
          const h = p.h || 420;
          // Sculpted Stone Plinth Base with Moss
          ctx.fillStyle = '#141924';
          ctx.beginPath();
          ctx.roundRect(p.x - 30, p.y - 24, 60, 24, 4);
          ctx.fill();
          ctx.fillStyle = '#252f42';
          ctx.beginPath();
          ctx.roundRect(p.x - 26, p.y - 34, 52, 12, 3);
          ctx.fill();

          // Cylindrical Shaded Column Shaft
          const pGrad = ctx.createLinearGradient(p.x - 22, 0, p.x + 22, 0);
          pGrad.addColorStop(0, '#0e121b');
          pGrad.addColorStop(0.35, '#273145');
          pGrad.addColorStop(0.7, '#1b2333');
          pGrad.addColorStop(1, '#0b0e16');
          ctx.fillStyle = pGrad;
          ctx.fillRect(p.x - 22, p.y - h + 28, 44, h - 62);

          // Carved Fluted Grooves
          ctx.strokeStyle = 'rgba(7, 10, 16, 0.55)';
          ctx.lineWidth = 2;
          for (const ox of [-11, -3, 5, 13]) {
            ctx.beginPath();
            ctx.moveTo(p.x + ox, p.y - h + 32);
            ctx.lineTo(p.x + ox, p.y - 36);
            ctx.stroke();
          }

          // Ornate Column Capital
          ctx.fillStyle = '#222b3d';
          ctx.beginPath();
          ctx.roundRect(p.x - 30, p.y - h, 60, 28, 4);
          ctx.fill();

          // Creeping Ivy Vines wrapping the Pillar
          ctx.strokeStyle = '#264527';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(p.x - 18, p.y - 10);
          ctx.bezierCurveTo(p.x + 24, p.y - h * 0.3, p.x - 24, p.y - h * 0.6, p.x + 16, p.y - h + 30);
          ctx.stroke();
          break;
        }
        case 'chain': {
          const h = p.h || 260;
          const sway = Math.sin(time * 1.5 + p.x * 0.015) * 6;
          ctx.strokeStyle = '#3d4659';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo(p.x + sway * 0.6, p.y + h * 0.5, p.x + sway, p.y + h);
          ctx.stroke();
          break;
        }
        case 'lantern': {
          const sway = Math.sin(time * 2.3 + p.x) * 4.5;
          const lx = p.x + sway;
          // Hanging Wrought-Iron Chain
          ctx.strokeStyle = '#4a4238';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - 46);
          ctx.lineTo(lx, p.y - 4);
          ctx.stroke();

          // Warm Outer Radial Halo
          const flicker = 0.88 + 0.12 * Math.sin(time * 11 + p.x);
          const halo = ctx.createRadialGradient(lx, p.y + 14, 2, lx, p.y + 14, 42 * flicker);
          halo.addColorStop(0, 'rgba(255, 220, 130, 0.45)');
          halo.addColorStop(0.5, 'rgba(255, 160, 60, 0.18)');
          halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(lx, p.y + 14, 42 * flicker, 0, Math.PI * 2);
          ctx.fill();

          // Ornate Pointed Lantern Roof with Moss
          ctx.fillStyle = '#252b36';
          ctx.beginPath();
          ctx.moveTo(lx - 14, p.y + 2);
          ctx.lineTo(lx, p.y - 8);
          ctx.lineTo(lx + 14, p.y + 2);
          ctx.closePath();
          ctx.fill();

          // Lantern Frame & Glowing Flame Heart
          ctx.fillStyle = 'rgba(28, 24, 20, 0.85)';
          ctx.fillRect(lx - 10, p.y + 2, 20, 24);
          const coreGrad = ctx.createRadialGradient(lx, p.y + 15, 1, lx, p.y + 15, 10 * flicker);
          coreGrad.addColorStop(0, '#ffffff');
          coreGrad.addColorStop(0.4, '#ffd875');
          coreGrad.addColorStop(1, 'rgba(255, 145, 35, 0)');
          ctx.fillStyle = coreGrad;
          ctx.beginPath();
          ctx.arc(lx, p.y + 15, 10 * flicker, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#8c7656';
          ctx.lineWidth = 1.8;
          ctx.strokeRect(lx - 10, p.y + 2, 20, 24);
          break;
        }
        case 'lantern_post': {
          ctx.fillStyle = '#181d29';
          ctx.fillRect(p.x - 4, p.y - 124, 8, 124);
          ctx.strokeStyle = '#3a4359';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(p.x + 8, p.y - 112, 16, Math.PI * 0.5, Math.PI * 1.5, false);
          ctx.stroke();

          const lGrad = ctx.createRadialGradient(p.x + 18, p.y - 106, 1, p.x + 18, p.y - 106, 26);
          lGrad.addColorStop(0, '#ffffff');
          lGrad.addColorStop(0.35, '#ffd275');
          lGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = lGrad;
          ctx.beginPath();
          ctx.arc(p.x + 18, p.y - 106, 26, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'candles': {
          const offsets = [-12, -2, 9];
          offsets.forEach((ox, idx) => {
            const ch = 14 + (idx % 2) * 7;
            ctx.fillStyle = '#e8dfd1';
            ctx.beginPath();
            ctx.roundRect(p.x + ox - 3, p.y - ch, 6, ch, 2);
            ctx.fill();
            const flicker = Math.sin(time * 14 + idx * 3 + p.x) * 1.2;
            const cGrad = ctx.createRadialGradient(p.x + ox + flicker * 0.4, p.y - ch - 5, 0.5, p.x + ox, p.y - ch - 5, 9);
            cGrad.addColorStop(0, '#ffffff');
            cGrad.addColorStop(0.4, '#ffbe55');
            cGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = cGrad;
            ctx.beginPath();
            ctx.arc(p.x + ox + flicker * 0.4, p.y - ch - 5, 9, 0, Math.PI * 2);
            ctx.fill();
          });
          break;
        }
        case 'statue': {
          ctx.fillStyle = '#222838';
          ctx.beginPath();
          ctx.roundRect(p.x - 28, p.y - 24, 56, 24, 4);
          ctx.fill();
          const stGrad = ctx.createLinearGradient(p.x - 18, p.y - 110, p.x + 18, p.y - 24);
          stGrad.addColorStop(0, '#45516b');
          stGrad.addColorStop(1, '#1b2130');
          ctx.fillStyle = stGrad;
          ctx.beginPath();
          ctx.moveTo(p.x - 18, p.y - 24);
          ctx.lineTo(p.x - 12, p.y - 102);
          ctx.lineTo(p.x + 12, p.y - 102);
          ctx.lineTo(p.x + 18, p.y - 24);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(212, 184, 134, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y - 116, 18, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#d8d2c5';
          ctx.beginPath();
          ctx.arc(p.x, p.y - 114, 11, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'shrine': {
          ctx.fillStyle = '#1d2233';
          ctx.beginPath();
          ctx.roundRect(p.x - 42, p.y - 22, 84, 22, 4);
          ctx.fill();
          ctx.strokeStyle = '#d4b886';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(p.x - 30, p.y - 105, 60, 85);

          const pulse = 1.0 + 0.2 * Math.sin(time * 3);
          const sGrad = ctx.createRadialGradient(p.x, p.y - 62, 1, p.x, p.y - 62, 26 * pulse);
          sGrad.addColorStop(0, '#ffffff');
          sGrad.addColorStop(0.4, biome.accent);
          sGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = sGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y - 62, 26 * pulse, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'hut': {
          ctx.fillStyle = '#181520';
          ctx.beginPath();
          ctx.roundRect(p.x - 90, p.y - 130, 180, 130, 6);
          ctx.fill();
          ctx.strokeStyle = '#5a493a';
          ctx.lineWidth = 3;
          ctx.strokeRect(p.x - 90, p.y - 130, 180, 130);
          ctx.fillStyle = '#2d221c';
          ctx.beginPath();
          ctx.moveTo(p.x - 108, p.y - 130);
          ctx.lineTo(p.x, p.y - 198);
          ctx.lineTo(p.x + 108, p.y - 130);
          ctx.closePath();
          ctx.fill();
          const wGrad = ctx.createRadialGradient(p.x - 38, p.y - 72, 2, p.x - 38, p.y - 72, 28);
          wGrad.addColorStop(0, '#fff5d6');
          wGrad.addColorStop(0.5, 'rgba(255, 190, 90, 0.85)');
          wGrad.addColorStop(1, 'rgba(255, 150, 40, 0)');
          ctx.fillStyle = wGrad;
          ctx.beginPath();
          ctx.arc(p.x - 38, p.y - 72, 28, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'house': {
          ctx.fillStyle = '#161926';
          ctx.fillRect(p.x - 115, p.y - 220, 230, 220);
          ctx.strokeStyle = '#4e453c';
          ctx.lineWidth = 3;
          ctx.strokeRect(p.x - 115, p.y - 220, 230, 220);
          ctx.fillStyle = 'rgba(255, 205, 115, 0.82)';
          ctx.fillRect(p.x - 70, p.y - 170, 40, 50);
          ctx.fillRect(p.x + 30, p.y - 170, 40, 50);
          break;
        }
        case 'mushroom_giant': {
          // Curved Organic Stalk
          const stGrad = ctx.createLinearGradient(p.x - 10, p.y - 92, p.x + 10, p.y);
          stGrad.addColorStop(0, '#3a6659');
          stGrad.addColorStop(0.5, '#d4e8dc');
          stGrad.addColorStop(1, '#1e3830');
          ctx.fillStyle = stGrad;
          ctx.beginPath();
          ctx.moveTo(p.x - 11, p.y);
          ctx.quadraticCurveTo(p.x - 6, p.y - 45, p.x - 8, p.y - 92);
          ctx.lineTo(p.x + 8, p.y - 92);
          ctx.quadraticCurveTo(p.x + 6, p.y - 45, p.x + 11, p.y);
          ctx.closePath();
          ctx.fill();

          // Underside Pleated Luminous Gills
          ctx.fillStyle = '#38b882';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y - 90, 48, 13, 0, 0, Math.PI * 2);
          ctx.fill();

          // Bioluminescent Cap with Rich Painterly Gradient
          const capGrad = ctx.createRadialGradient(p.x - 10, p.y - 112, 4, p.x, p.y - 95, 56);
          capGrad.addColorStop(0, '#b8ffe0');
          capGrad.addColorStop(0.45, '#42cf88');
          capGrad.addColorStop(1, '#18593c');
          ctx.fillStyle = capGrad;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y - 92, 54, 28, 0, Math.PI, 0, false);
          ctx.fill();

          // Raised Glowing Spots
          ctx.fillStyle = '#e8fff5';
          for (const [ox, oy, r] of [[-24, -104, 3.5], [-6, -113, 4.5], [14, -110, 3.8], [28, -101, 3.0]]) {
            ctx.beginPath();
            ctx.arc(p.x + ox, p.y + oy, r, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'vines': {
          const h = p.h || 240;
          for (let i = -1; i <= 1; i++) {
            const sway = Math.sin(time * 1.7 + p.x + i * 2) * 8;
            ctx.strokeStyle = i === 0 ? '#1c3b23' : '#2d5934';
            ctx.lineWidth = i === 0 ? 3.5 : 2.2;
            ctx.beginPath();
            ctx.moveTo(p.x + i * 14, p.y);
            ctx.quadraticCurveTo(p.x + i * 14 + sway, p.y + h * 0.5, p.x + i * 14 - sway * 0.6, p.y + h);
            ctx.stroke();

            // Little leaves along the hanging vine
            ctx.fillStyle = '#589e42';
            for (let ly = 24; ly < h - 16; ly += 32) {
              const lx = p.x + i * 14 + Math.sin(ly * 0.05 + time * 1.7) * 4;
              ctx.beginPath();
              ctx.ellipse(lx + 4, p.y + ly, 4, 2, 0.4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
        }
        case 'glow_flowers': {
          // Cluster of Glowing Golden & Emerald Toadstools / Flora (like in Reference Image)
          const offsets = [-22, -10, 0, 12, 22];
          offsets.forEach((ox, idx) => {
            const fx = p.x + ox;
            const fh = 12 + (idx % 3) * 6;
            const sway = Math.sin(time * 2.5 + idx) * 1.2;

            // Soft golden-green glow aura
            const gGrad = ctx.createRadialGradient(fx + sway, p.y - fh, 1, fx + sway, p.y - fh, 16);
            gGrad.addColorStop(0, 'rgba(255, 245, 185, 0.75)');
            gGrad.addColorStop(0.5, 'rgba(255, 195, 75, 0.25)');
            gGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gGrad;
            ctx.beginPath();
            ctx.arc(fx + sway, p.y - fh, 16, 0, Math.PI * 2);
            ctx.fill();

            // Slender pale stem
            ctx.strokeStyle = '#e8dec8';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(fx, p.y);
            ctx.quadraticCurveTo(fx + sway * 0.5, p.y - fh * 0.5, fx + sway, p.y - fh);
            ctx.stroke();

            // Glowing mushroom/bell cap
            ctx.fillStyle = '#ffdf78';
            ctx.beginPath();
            ctx.ellipse(fx + sway, p.y - fh, 6, 4.5, 0, Math.PI, 0, false);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(fx + sway, p.y - fh - 1.5, 2, 0, Math.PI * 2);
            ctx.fill();
          });
          break;
        }
        case 'crystal_cluster': {
          const heights = [55, 84, 62];
          const angles = [-0.25, 0.04, 0.3];
          heights.forEach((ch, idx) => {
            ctx.save();
            ctx.translate(p.x + (idx - 1) * 15, p.y);
            ctx.rotate(angles[idx]);

            ctx.fillStyle = idx === 1 ? '#8a3ed4' : '#3296c4';
            ctx.beginPath();
            ctx.moveTo(-11, 0);
            ctx.lineTo(0, -ch);
            ctx.lineTo(0, 0);
            ctx.fill();

            ctx.fillStyle = idx === 1 ? '#d27eff' : '#68e2ff';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -ch);
            ctx.lineTo(11, 0);
            ctx.fill();

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
          const wGrad = ctx.createRadialGradient(p.x, p.y + bob, 1, p.x, p.y + bob, 22);
          wGrad.addColorStop(0, '#ffffff');
          wGrad.addColorStop(0.4, '#5ce1e6');
          wGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = wGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y + bob, 22, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'bones': {
          ctx.fillStyle = '#9e9689';
          ctx.beginPath();
          ctx.arc(p.x, p.y - 7, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(p.x - 16, p.y - 4, 32, 4);
          break;
        }
        case 'broken_cart': {
          // Detailed Wooden Wagon with Plank Body, Iron Bindings, Spoked Wheels & Tow Shaft (Exact match to Reference Image!)
          const cx = p.x;
          const cy = p.y;

          // Tow Shaft / Pull Handle extending left onto the ground
          ctx.strokeStyle = '#4a3525';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(cx - 26, cy - 16);
          ctx.lineTo(cx - 64, cy - 2);
          ctx.stroke();
          // Iron tow chain links
          ctx.strokeStyle = '#707b8c';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(cx - 28, cy - 13);
          ctx.lineTo(cx - 58, cy - 1);
          ctx.stroke();
          ctx.setLineDash([]);

          // Flared Wooden Wagon Body (Trapezoid plank bed)
          const wGrad = ctx.createLinearGradient(cx - 34, cy - 52, cx + 34, cy - 14);
          wGrad.addColorStop(0, '#69452e');
          wGrad.addColorStop(0.5, '#472d1d');
          wGrad.addColorStop(1, '#26170e');
          ctx.fillStyle = wGrad;
          ctx.beginPath();
          ctx.moveTo(cx - 36, cy - 48);
          ctx.lineTo(cx + 36, cy - 52);
          ctx.lineTo(cx + 28, cy - 16);
          ctx.lineTo(cx - 28, cy - 16);
          ctx.closePath();
          ctx.fill();

          // Horizontal Plank Lines & Top Rim
          ctx.strokeStyle = '#1c110a';
          ctx.lineWidth = 1.6;
          for (const pyOff of [-38, -27]) {
            ctx.beginPath();
            ctx.moveTo(cx - 32, cy + pyOff);
            ctx.lineTo(cx + 32, cy + pyOff - 2);
            ctx.stroke();
          }
          // Vertical Wooden Stakes / Iron Straps
          ctx.fillStyle = '#2d221c';
          for (const sxOff of [-24, -8, 8, 24]) {
            ctx.fillRect(cx + sxOff - 2, cy - 49, 4, 33);
          }

          // Two Detailed Multi-Spoked Wooden Wheels
          for (const wx of [cx - 16, cx + 16]) {
            const wy = cy - 12;
            const r = 12;

            // Outer Iron-Bound Wooden Rim
            ctx.strokeStyle = '#1f1712';
            ctx.lineWidth = 4.5;
            ctx.beginPath();
            ctx.arc(wx, wy, r, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#63442f';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(wx, wy, r, 0, Math.PI * 2);
            ctx.stroke();

            // 8 Wheel Spokes
            ctx.strokeStyle = '#4d3322';
            ctx.lineWidth = 1.6;
            for (let a = 0; a < 4; a++) {
              const ang = (a * Math.PI) / 4;
              ctx.beginPath();
              ctx.moveTo(wx - Math.cos(ang) * r, wy - Math.sin(ang) * r);
              ctx.lineTo(wx + Math.cos(ang) * r, wy + Math.sin(ang) * r);
              ctx.stroke();
            }

            // Center Wheel Hub
            ctx.fillStyle = '#261c16';
            ctx.beginPath();
            ctx.arc(wx, wy, 3.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8c7a6b';
            ctx.beginPath();
            ctx.arc(wx, wy, 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
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
    // 1. Soul Brazier Checkpoint & Wrought-Iron Sanctuary Lantern (Exact match to Reference Image!)
    if (room.brazier) {
      const b = room.brazier;
      ctx.save();

      // Ambient Blue Ground Glow across the moss
      const groundGlow = ctx.createRadialGradient(b.x, b.y - 25, 4, b.x, b.y - 15, 110);
      groundGlow.addColorStop(0, 'rgba(65, 225, 255, 0.38)');
      groundGlow.addColorStop(0.5, 'rgba(20, 135, 230, 0.14)');
      groundGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = groundGlow;
      ctx.beginPath();
      ctx.arc(b.x, b.y - 15, 110, 0, Math.PI * 2);
      ctx.fill();

      // Companion Wrought-Iron Sanctuary Lantern on the moss (left of obelisk/brazier)
      const lx = b.x - 96;
      const ly = b.y;
      // Lantern blue glow
      const lGlow = ctx.createRadialGradient(lx, ly - 22, 2, lx, ly - 22, 48);
      lGlow.addColorStop(0, 'rgba(130, 245, 255, 0.5)');
      lGlow.addColorStop(0.5, 'rgba(30, 160, 245, 0.18)');
      lGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lGlow;
      ctx.beginPath();
      ctx.arc(lx, ly - 22, 48, 0, Math.PI * 2);
      ctx.fill();

      // Lantern stone base & iron cage
      ctx.fillStyle = '#1b222e';
      ctx.beginPath();
      ctx.roundRect(lx - 15, ly - 8, 30, 8, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(20, 32, 48, 0.7)';
      ctx.fillRect(lx - 11, ly - 38, 22, 30);

      // Inner blue soul flame in lantern
      const lFlicker = Math.sin(time * 9 + 1.2) * 1.5;
      ctx.fillStyle = '#38d6ff';
      ctx.beginPath();
      ctx.moveTo(lx - 5, ly - 12);
      ctx.quadraticCurveTo(lx - 6, ly - 24, lx + lFlicker, ly - 31);
      ctx.quadraticCurveTo(lx + 6, ly - 24, lx + 5, ly - 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(lx, ly - 16, 2.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wrought-iron bars & mossy domed roof
      ctx.strokeStyle = '#2d3747';
      ctx.lineWidth = 2;
      ctx.strokeRect(lx - 11, ly - 38, 22, 30);
      ctx.beginPath();
      ctx.moveTo(lx - 4, ly - 38);
      ctx.lineTo(lx - 4, ly - 8);
      ctx.moveTo(lx + 4, ly - 38);
      ctx.lineTo(lx + 4, ly - 8);
      ctx.stroke();

      // Lantern Domed Roof with Moss
      ctx.fillStyle = '#26303f';
      ctx.beginPath();
      ctx.moveTo(lx - 16, ly - 38);
      ctx.quadraticCurveTo(lx, ly - 54, lx + 16, ly - 38);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4e8a38';
      ctx.beginPath();
      ctx.ellipse(lx + 3, ly - 43, 8, 3, 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Main Sculpted Stone Brazier Pedestal
      const pedGrad = ctx.createLinearGradient(b.x - 18, b.y - 36, b.x + 18, b.y);
      pedGrad.addColorStop(0, '#384659');
      pedGrad.addColorStop(0.5, '#252f3d');
      pedGrad.addColorStop(1, '#121720');
      ctx.fillStyle = pedGrad;
      ctx.beginPath();
      ctx.roundRect(b.x - 18, b.y - 34, 36, 34, 4);
      ctx.fill();

      // Carved Spiral Relief & Rim on Brazier Pedestal
      ctx.strokeStyle = '#11161f';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(b.x - 5, b.y - 16, 7, 0, Math.PI * 1.6);
      ctx.arc(b.x + 6, b.y - 14, 6, Math.PI * 0.4, Math.PI * 1.9);
      ctx.stroke();

      // Top cyan rim reflection on stone basin
      ctx.fillStyle = '#4be8ff';
      ctx.globalAlpha = 0.55;
      ctx.fillRect(b.x - 16, b.y - 34, 32, 2.5);
      ctx.globalAlpha = 1;

      // Multi-Layered Roaring Azure Soul Flame
      const fSway = Math.sin(time * 8) * 2.5;
      const fStretch = Math.cos(time * 11) * 3;

      // Outer Deep Azure Flame Tongue
      ctx.fillStyle = '#0095ff';
      ctx.shadowColor = '#00b4ff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(b.x - 13, b.y - 34);
      ctx.bezierCurveTo(b.x - 18, b.y - 52, b.x - 6 + fSway, b.y - 68, b.x + fSway, b.y - 76 - fStretch);
      ctx.bezierCurveTo(b.x + 8 + fSway, b.y - 66, b.x + 18, b.y - 52, b.x + 13, b.y - 34);
      ctx.closePath();
      ctx.fill();

      // Mid Cyan Flame Tongue
      ctx.fillStyle = '#5ce1e6';
      ctx.beginPath();
      ctx.moveTo(b.x - 9, b.y - 34);
      ctx.bezierCurveTo(b.x - 12, b.y - 48, b.x - 3 + fSway * 0.7, b.y - 58, b.x + fSway * 0.7, b.y - 65 - fStretch * 0.6);
      ctx.bezierCurveTo(b.x + 5 + fSway * 0.7, b.y - 56, b.x + 12, b.y - 48, b.x + 9, b.y - 34);
      ctx.closePath();
      ctx.fill();

      // Bright White-Cyan Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(b.x - 5, b.y - 34);
      ctx.quadraticCurveTo(b.x - 5, b.y - 46, b.x + fSway * 0.4, b.y - 52);
      ctx.quadraticCurveTo(b.x + 5, b.y - 46, b.x + 5, b.y - 34);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    // 2. Lore Tablets — Ancient Tapered Stone Obelisk with Medallion & Runes (Exact match to Watchtower Milestone!)
    if (room.loreTablets) {
      for (const lt of room.loreTablets) {
        ctx.save();
        const ox = lt.x;
        const oy = lt.y;
        const obH = 156;

        // Tapered Obelisk Shaft (3D Left Lit Face & Right Shaded Face)
        // Left Lit Face
        const leftGrad = ctx.createLinearGradient(ox - 19, oy - obH, ox, oy);
        leftGrad.addColorStop(0, '#495669');
        leftGrad.addColorStop(0.5, '#3b4757');
        leftGrad.addColorStop(1, '#26303d');
        ctx.fillStyle = leftGrad;
        ctx.beginPath();
        ctx.moveTo(ox, oy - obH); // Pyramidion peak
        ctx.lineTo(ox - 12, oy - obH + 22);
        ctx.lineTo(ox - 19, oy);
        ctx.lineTo(ox, oy);
        ctx.closePath();
        ctx.fill();

        // Right Shaded Face (with subtle blue bounce light near base)
        const rightGrad = ctx.createLinearGradient(ox, oy - obH, ox + 19, oy);
        rightGrad.addColorStop(0, '#252d38');
        rightGrad.addColorStop(0.6, '#1d2530');
        rightGrad.addColorStop(1, '#28455c');
        ctx.fillStyle = rightGrad;
        ctx.beginPath();
        ctx.moveTo(ox, oy - obH);
        ctx.lineTo(ox + 12, oy - obH + 22);
        ctx.lineTo(ox + 19, oy);
        ctx.lineTo(ox, oy);
        ctx.closePath();
        ctx.fill();

        // Pyramidion Bevel Ridge
        ctx.strokeStyle = 'rgba(185, 205, 225, 0.35)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(ox - 12, oy - obH + 22);
        ctx.lineTo(ox, oy - obH + 26);
        ctx.lineTo(ox + 12, oy - obH + 22);
        ctx.stroke();

        // Center Recessed Circular Moon Medallion
        const medY = oy - 78;
        ctx.fillStyle = '#141922';
        ctx.beginPath();
        ctx.arc(ox, medY, 13.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#58687d';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 3D Shaded Moon Sphere inside Medallion
        const sphGrad = ctx.createRadialGradient(ox - 3, medY - 3, 1, ox, medY, 9.5);
        sphGrad.addColorStop(0, '#c2d2e3');
        sphGrad.addColorStop(0.6, '#65778c');
        sphGrad.addColorStop(1, '#1d2430');
        ctx.fillStyle = sphGrad;
        ctx.beginPath();
        ctx.arc(ox, medY, 9, 0, Math.PI * 2);
        ctx.fill();

        // Carved Vertical Runes Above & Below Medallion
        const runeGlow = 0.55 + 0.35 * Math.sin(time * 3 + ox);
        ctx.strokeStyle = `rgba(130, 225, 250, ${runeGlow})`;
        ctx.lineWidth = 1.6;
        // Upper runes
        for (let ry = oy - 126; ry <= oy - 100; ry += 12) {
          ctx.beginPath();
          ctx.moveTo(ox - 3, ry - 4);
          ctx.lineTo(ox + 3, ry);
          ctx.lineTo(ox - 2, ry + 4);
          ctx.moveTo(ox, ry - 5);
          ctx.lineTo(ox, ry + 5);
          ctx.stroke();
        }
        // Lower runes
        for (let ry = oy - 54; ry <= oy - 26; ry += 13) {
          ctx.beginPath();
          ctx.moveTo(ox - 4, ry - 3);
          ctx.lineTo(ox, ry + 4);
          ctx.lineTo(ox + 4, ry - 3);
          ctx.stroke();
        }

        // Clinging Moss Patches & Fern Fronds on the Obelisk Base & Flanks
        ctx.fillStyle = '#3b6e2e';
        ctx.beginPath();
        ctx.ellipse(ox - 10, oy - 115, 5, 14, 0.2, 0, Math.PI * 2);
        ctx.ellipse(ox + 11, oy - 48, 6, 18, -0.15, 0, Math.PI * 2);
        ctx.ellipse(ox - 12, oy - 16, 9, 12, 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#68ab44';
        ctx.beginPath();
        ctx.ellipse(ox - 9, oy - 117, 3, 9, 0.2, 0, Math.PI * 2);
        ctx.ellipse(ox + 10, oy - 50, 3.5, 11, -0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // 3. Collectibles: 3D Faceted Golden Lumen Shards, Masks & Relics
    if (room.items) {
      for (const it of room.items) {
        if (game.isItemCollected(room.id, it)) continue;
        const bob = Math.sin(time * 3.8 + it.x) * 5;
        ctx.save();
        ctx.translate(it.x, it.y + bob);

        if (it.type === 'lumen') {
          // Warm Golden Radial Aura
          const lHalo = ctx.createRadialGradient(0, 0, 2, 0, 0, 36);
          lHalo.addColorStop(0, 'rgba(255, 230, 110, 0.55)');
          lHalo.addColorStop(0.5, 'rgba(255, 165, 30, 0.2)');
          lHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = lHalo;
          ctx.beginPath();
          ctx.arc(0, 0, 36, 0, Math.PI * 2);
          ctx.fill();

          // 3D Octahedron / Faceted Golden Crystal (4 distinct shaded planes)
          // Top-Left Brightest Facet
          ctx.fillStyle = '#fff5b8';
          ctx.beginPath();
          ctx.moveTo(0, -15);
          ctx.lineTo(-11, 0);
          ctx.lineTo(0, -2);
          ctx.closePath();
          ctx.fill();

          // Top-Right Lit Amber Facet
          ctx.fillStyle = '#ffc436';
          ctx.beginPath();
          ctx.moveTo(0, -15);
          ctx.lineTo(11, 0);
          ctx.lineTo(0, -2);
          ctx.closePath();
          ctx.fill();

          // Bottom-Left Mid Gold Facet
          ctx.fillStyle = '#e69112';
          ctx.beginPath();
          ctx.moveTo(0, 15);
          ctx.lineTo(-11, 0);
          ctx.lineTo(0, -2);
          ctx.closePath();
          ctx.fill();

          // Bottom-Right Deep Bronze-Gold Facet
          ctx.fillStyle = '#b86204';
          ctx.beginPath();
          ctx.moveTo(0, 15);
          ctx.lineTo(11, 0);
          ctx.lineTo(0, -2);
          ctx.closePath();
          ctx.fill();

          // Crisp Specular Ridge Lines
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, -15);
          ctx.lineTo(0, 15);
          ctx.moveTo(-11, 0);
          ctx.lineTo(0, -2);
          ctx.lineTo(11, 0);
          ctx.stroke();

          // Orbiting Golden & Emerald Sparkles
          for (let s = 0; s < 4; s++) {
            const sAng = time * 2.5 + s * 1.57;
            const sx = Math.cos(sAng) * 18;
            const sy = Math.sin(sAng * 1.3) * 12;
            ctx.fillStyle = s % 2 === 0 ? '#ffe875' : '#9eff78';
            ctx.beginPath();
            ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (it.type === 'ability') {
          const aGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
          aGrad.addColorStop(0, '#ffffff');
          aGrad.addColorStop(0.45, '#d27eff');
          aGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = aGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 28, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
          ctx.stroke();
        } else if (it.type === 'mask_upgrade') {
          const mGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
          mGrad.addColorStop(0, '#ffffff');
          mGrad.addColorStop(0.5, '#8df6fa');
          mGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = mGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const iGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
          iGrad.addColorStop(0, '#ffffff');
          iGrad.addColorStop(0.5, '#5ce1e6');
          iGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = iGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 22, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // 4. Liora's Echo-Glass Cage in abyss_sanctum
    if (room.lioraCage && !game.state.worldFlags.cageShattered) {
      const c = room.lioraCage;
      ctx.save();
      ctx.fillStyle = '#263b32';
      ctx.fillRect(c.x - 11, c.y - 44, 22, 44);
      ctx.fillStyle = '#f0eade';
      ctx.beginPath();
      ctx.arc(c.x, c.y - 52, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b174f2';
      ctx.beginPath();
      ctx.arc(c.x - 6, c.y - 59, 3.5, 0, Math.PI * 2);
      ctx.arc(c.x, c.y - 62, 4, 0, Math.PI * 2);
      ctx.arc(c.x + 6, c.y - 59, 3.5, 0, Math.PI * 2);
      ctx.fill();

      const cPulse = 1.0 + 0.2 * Math.sin(time * 5);
      const cGrad = ctx.createRadialGradient(c.x, c.y - 30, 1, c.x, c.y - 30, 16 * cPulse);
      cGrad.addColorStop(0, '#ffffff');
      cGrad.addColorStop(0.4, '#b174f2');
      cGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(c.x, c.y - 30, 16 * cPulse, 0, Math.PI * 2);
      ctx.fill();

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
      const bob = Math.sin(time * 2.4 + n.x) * 2.0;
      ctx.save();

      // Warm Ambient Sanctuary Glow & Cluster of Little Glowing Mushrooms around NPC
      const npcHalo = ctx.createRadialGradient(n.x, n.y - 34, 4, n.x, n.y - 30, 76);
      npcHalo.addColorStop(0, 'rgba(255, 205, 105, 0.32)');
      npcHalo.addColorStop(0.55, 'rgba(255, 155, 55, 0.12)');
      npcHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = npcHalo;
      ctx.beginPath();
      ctx.arc(n.x, n.y - 30, 76, 0, Math.PI * 2);
      ctx.fill();

      // Cluster of small glowing golden-cream mushrooms at NPC's feet (just like Reference Image!)
      const shroomOffsets = [
        { ox: -38, h: 11, r: 4.5 },
        { ox: -28, h: 16, r: 6.0 },
        { ox: -20, h: 9, r: 3.8 },
        { ox: 22, h: 18, r: 6.5 },
        { ox: 31, h: 13, r: 5.2 },
        { ox: 39, h: 9, r: 4.0 }
      ];
      for (const sh of shroomOffsets) {
        const sx = n.x + sh.ox;
        // Stem
        ctx.strokeStyle = '#e8dec8';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(sx, n.y);
        ctx.lineTo(sx, n.y - sh.h);
        ctx.stroke();
        // Glowing Cap
        ctx.fillStyle = '#ffe58f';
        ctx.shadowColor = '#ffbe42';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(sx, n.y - sh.h, sh.r, sh.r * 0.72, 0, Math.PI, 0, false);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (n.id === 'orin') {
        // ORIN THE MUSHROOM HERMIT (Exact storybook painterly match to Reference Image!)
        // 1. Layered Olive-Moss & Earthy Woodland Cloak
        const cloakGrad = ctx.createLinearGradient(n.x - 20, n.y - 46 + bob, n.x + 20, n.y);
        cloakGrad.addColorStop(0, '#4a6136');
        cloakGrad.addColorStop(0.5, '#2e4022');
        cloakGrad.addColorStop(1, '#182411');
        ctx.fillStyle = cloakGrad;
        ctx.beginPath();
        ctx.moveTo(n.x - 20, n.y);
        ctx.quadraticCurveTo(n.x - 18, n.y - 26 + bob, n.x - 13, n.y - 44 + bob);
        ctx.lineTo(n.x + 13, n.y - 44 + bob);
        ctx.quadraticCurveTo(n.x + 18, n.y - 26 + bob, n.x + 20, n.y);
        ctx.closePath();
        ctx.fill();

        // Inner Rust-Brown Tunic & Collar Scarf
        ctx.fillStyle = '#593622';
        ctx.beginPath();
        ctx.moveTo(n.x - 7, n.y);
        ctx.lineTo(n.x - 4, n.y - 40 + bob);
        ctx.lineTo(n.x + 4, n.y - 40 + bob);
        ctx.lineTo(n.x + 7, n.y);
        ctx.closePath();
        ctx.fill();

        // Golden Collar Clasp
        ctx.fillStyle = '#ffd269';
        ctx.beginPath();
        ctx.arc(n.x, n.y - 38 + bob, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 2. Round Gentle Pale Face & Expressive Eyes
        const faceGrad = ctx.createRadialGradient(n.x - 2, n.y - 49 + bob, 1, n.x, n.y - 48 + bob, 11);
        faceGrad.addColorStop(0, '#fff7e8');
        faceGrad.addColorStop(0.7, '#dfd2bc');
        faceGrad.addColorStop(1, '#a89882');
        ctx.fillStyle = faceGrad;
        ctx.beginPath();
        ctx.arc(n.x, n.y - 48 + bob, 10.5, 0, Math.PI * 2);
        ctx.fill();

        // Friendly Dark Eyes & Smile
        ctx.fillStyle = '#1b1e26';
        ctx.beginPath();
        ctx.arc(n.x - 3.8, n.y - 48 + bob, 1.5, 0, Math.PI * 2);
        ctx.arc(n.x + 3.8, n.y - 48 + bob, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5c4d3c';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(n.x, n.y - 45.5 + bob, 2.5, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // 3. Wide Sculpted Red-Orange Amanita Mushroom Hat
        // Pleated Warm Gill Underside Brim
        ctx.fillStyle = '#d1b794';
        ctx.beginPath();
        ctx.ellipse(n.x, n.y - 55 + bob, 26, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pointed/Domed Red-Orange Mushroom Cap with Warm Rim Light
        const hatGrad = ctx.createLinearGradient(n.x - 26, n.y - 80 + bob, n.x + 26, n.y - 54 + bob);
        hatGrad.addColorStop(0, '#a32915');
        hatGrad.addColorStop(0.55, '#db4725');
        hatGrad.addColorStop(1, '#ff984a'); // Golden rim light on right side from staff!
        ctx.fillStyle = hatGrad;
        ctx.beginPath();
        ctx.moveTo(n.x - 27, n.y - 55 + bob);
        ctx.quadraticCurveTo(n.x - 14, n.y - 68 + bob, n.x, n.y - 82 + bob);
        ctx.quadraticCurveTo(n.x + 14, n.y - 68 + bob, n.x + 27, n.y - 55 + bob);
        ctx.quadraticCurveTo(n.x, n.y - 50 + bob, n.x - 27, n.y - 55 + bob);
        ctx.closePath();
        ctx.fill();

        // Raised Cream Spots on Hat
        ctx.fillStyle = '#fff0d1';
        for (const [sx, sy, sr] of [[-13, -60, 2.6], [-4, -69, 3.2], [5, -74, 2.4], [11, -62, 3.0], [18, -58, 2.2]]) {
          ctx.beginPath();
          ctx.arc(n.x + sx, n.y + sy + bob, sr, 0, Math.PI * 2);
          ctx.fill();
        }

        // 4. Gnarled Wooden Staff with Blazing Amber Flame Tip
        ctx.strokeStyle = '#6e4c30';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(n.x + 17, n.y);
        ctx.lineTo(n.x + 15, n.y - 66 + bob);
        ctx.stroke();

        // Blazing Golden Staff Flame
        const stGlow = ctx.createRadialGradient(n.x + 15, n.y - 70 + bob, 1, n.x + 15, n.y - 70 + bob, 18);
        stGlow.addColorStop(0, '#ffffff');
        stGlow.addColorStop(0.35, '#ffcc4d');
        stGlow.addColorStop(1, 'rgba(255, 130, 20, 0)');
        ctx.fillStyle = stGlow;
        ctx.beginPath();
        ctx.arc(n.x + 15, n.y - 70 + bob, 18, 0, Math.PI * 2);
        ctx.fill();

      } else if (n.id === 'myra') {
        // Myra the Herbalist (Bioluminescent Teal Mushroom Cap & Apothecary Cloak)
        const cloakG = ctx.createLinearGradient(n.x - 16, n.y - 44 + bob, n.x + 16, n.y);
        cloakG.addColorStop(0, '#29594b');
        cloakG.addColorStop(1, '#122922');
        ctx.fillStyle = cloakG;
        ctx.beginPath();
        ctx.moveTo(n.x - 18, n.y);
        ctx.lineTo(n.x - 12, n.y - 44 + bob);
        ctx.lineTo(n.x + 12, n.y - 44 + bob);
        ctx.lineTo(n.x + 18, n.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f5ebd6';
        ctx.beginPath();
        ctx.arc(n.x, n.y - 49 + bob, 9.5, 0, Math.PI * 2);
        ctx.fill();

        const capG = ctx.createLinearGradient(n.x - 24, n.y - 76 + bob, n.x + 24, n.y - 54 + bob);
        capG.addColorStop(0, '#1c7863');
        capG.addColorStop(0.6, '#3cd4ad');
        capG.addColorStop(1, '#a8fff0');
        ctx.fillStyle = capG;
        ctx.beginPath();
        ctx.moveTo(n.x - 24, n.y - 54 + bob);
        ctx.quadraticCurveTo(n.x, n.y - 80 + bob, n.x + 24, n.y - 54 + bob);
        ctx.closePath();
        ctx.fill();

      } else if (n.id === 'sylas') {
        // Sylas the Botanist
        ctx.fillStyle = '#2d4f38';
        ctx.beginPath();
        ctx.moveTo(n.x - 15, n.y);
        ctx.lineTo(n.x - 10, n.y - 48 + bob);
        ctx.lineTo(n.x + 10, n.y - 48 + bob);
        ctx.lineTo(n.x + 15, n.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e8e2d5';
        ctx.beginPath();
        ctx.arc(n.x, n.y - 54 + bob, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#499e5b';
        ctx.beginPath();
        ctx.arc(n.x, n.y - 60 + bob, 12, Math.PI, 0);
        ctx.fill();

      } else if (n.id === 'bram') {
        // Bram the Bridgewright
        ctx.fillStyle = '#3d2f23';
        ctx.beginPath();
        ctx.roundRect(n.x - 16, n.y - 42 + bob, 32, 42, 6);
        ctx.fill();
        ctx.fillStyle = '#9e7947';
        ctx.fillRect(n.x - 12, n.y - 32 + bob, 24, 22);
        ctx.fillStyle = '#e8dec8';
        ctx.beginPath();
        ctx.arc(n.x, n.y - 46 + bob, 10.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffbe42';
        ctx.fillRect(n.x - 9, n.y - 49 + bob, 18, 5);

      } else if (n.id === 'liora') {
        // Rescued Sister Liora
        ctx.fillStyle = '#263b32';
        ctx.fillRect(n.x - 11, n.y - 44 + bob, 22, 44);
        ctx.fillStyle = '#f0eade';
        ctx.beginPath();
        ctx.arc(n.x, n.y - 52 + bob, 9.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b174f2';
        ctx.beginPath();
        ctx.arc(n.x - 6, n.y - 59 + bob, 3.5, 0, Math.PI * 2);
        ctx.arc(n.x, n.y - 62 + bob, 4, 0, Math.PI * 2);
        ctx.arc(n.x + 6, n.y - 59, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Woodland Traveler NPC
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
          // Bioluminescent Emerald Beetle (matching the glowing green beetle on the upper-right cliff in the reference)
          const cx = e.x + e.w / 2;
          const cy = e.y + 13;

          // Soft emerald-lime ambient glow halo around the beetle
          const beetleGlow = ctx.createRadialGradient(cx, cy, 3, cx, cy, 48);
          beetleGlow.addColorStop(0, 'rgba(130, 255, 145, 0.42)');
          beetleGlow.addColorStop(0.5, 'rgba(65, 215, 110, 0.16)');
          beetleGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = beetleGlow;
          ctx.beginPath();
          ctx.arc(cx, cy, 48, 0, Math.PI * 2);
          ctx.fill();

          // 6 Articulated scurrying legs (3 on each side)
          ctx.strokeStyle = flash ? '#ffffff' : '#122918';
          ctx.lineWidth = 2.4;
          ctx.lineCap = 'round';
          for (let side = -1; side <= 1; side += 2) {
            for (let legIdx = 0; legIdx < 3; legIdx++) {
              const legPhase = walk + legIdx * 1.05 + (side > 0 ? Math.PI : 0);
              const legLift = Math.sin(legPhase) * 4.5;
              const legSweep = Math.cos(legPhase) * 5.5;
              const rootX = cx + (legIdx - 1) * 7;
              const kneeX = rootX + side * 13 + legSweep;
              const kneeY = cy + 3 - Math.max(0, legLift);
              const footX = rootX + side * 19 + legSweep * 1.25;
              const footY = cy + 12 + Math.max(0, -legLift * 0.4);

              ctx.beginPath();
              ctx.moveTo(rootX, cy + 2);
              ctx.lineTo(kneeX, kneeY);
              ctx.lineTo(footX, footY);
              ctx.stroke();
            }
          }

          // Rounded 3D Emerald-Jade Carapace Shell
          const shellGrad = ctx.createRadialGradient(cx - e.facing * 3, cy - 5, 2, cx, cy, e.w * 0.62);
          if (flash) {
            shellGrad.addColorStop(0, '#ffffff');
            shellGrad.addColorStop(1, '#ffffff');
          } else {
            shellGrad.addColorStop(0, '#abff9e');
            shellGrad.addColorStop(0.45, '#3dc462');
            shellGrad.addColorStop(0.85, '#195e30');
            shellGrad.addColorStop(1, '#0d3018');
          }
          ctx.fillStyle = shellGrad;
          ctx.beginPath();
          ctx.ellipse(cx, cy, e.w / 2 + 2, 11, 0, 0, Math.PI * 2);
          ctx.fill();

          // Carapace segmentation seam & glossy specular rim
          ctx.strokeStyle = 'rgba(215, 255, 195, 0.6)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.ellipse(cx, cy - 3, e.w / 2 - 4, 6, 0, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();

          // Translucent Fluttering Bioluminescent Dorsal Wings on top of the shell
          const wingFlutter = Math.sin(time * 24 + e.x) * 4;
          ctx.save();
          ctx.fillStyle = e.isAlert ? 'rgba(255, 120, 120, 0.55)' : 'rgba(180, 255, 150, 0.55)';
          ctx.strokeStyle = '#d9ffab';
          ctx.lineWidth = 1.1;
          for (let wSide = -1; wSide <= 1; wSide += 2) {
            ctx.beginPath();
            ctx.moveTo(cx - e.facing * 2, cy - 7);
            ctx.quadraticCurveTo(
              cx - e.facing * 12 + wSide * 6,
              cy - 22 + wingFlutter * wSide,
              cx - e.facing * 18 + wSide * 10,
              cy - 12 + wingFlutter * 0.5
            );
            ctx.quadraticCurveTo(cx - e.facing * 8, cy - 6, cx - e.facing * 2, cy - 7);
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();

          // Glowing Golden-Lime Lantern Nose / Horn & Eyes
          const headX = e.facing > 0 ? e.x + e.w : e.x;
          const noseGlow = ctx.createRadialGradient(headX, cy - 2, 1, headX, cy - 2, 12);
          noseGlow.addColorStop(0, '#ffffff');
          noseGlow.addColorStop(0.45, '#e5ff66');
          noseGlow.addColorStop(1, 'rgba(120, 255, 90, 0)');
          ctx.fillStyle = noseGlow;
          ctx.beginPath();
          ctx.arc(headX, cy - 2, 12, 0, Math.PI * 2);
          ctx.fill();

          // Curved beetle antennae
          const twitch = Math.sin(time * 14) * 2.5;
          ctx.strokeStyle = '#8ef58c';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(headX - e.facing * 2, cy - 4);
          ctx.quadraticCurveTo(headX + e.facing * 6, cy - 12, headX + e.facing * 11, cy - 9 + twitch);
          ctx.stroke();
          break;
        }

        case 'sporeling': {
          // Painterly Bioluminescent Puffball Sporeling
          const bounce = Math.abs(Math.sin(walk * 0.8)) * 8;
          const squashX = 1.0 + (bounce > 2 ? -0.14 : 0.22);
          const squashY = 1.0 + (bounce > 2 ? 0.22 : -0.18);
          const cx = e.x + e.w / 2;
          const cy = e.y + e.h / 2 - bounce;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(squashX, squashY);

          // Soft turquoise spore aura
          const spAura = ctx.createRadialGradient(0, 0, 4, 0, 0, 28);
          spAura.addColorStop(0, 'rgba(110, 245, 215, 0.35)');
          spAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = spAura;
          ctx.beginPath();
          ctx.arc(0, 0, 28, 0, Math.PI * 2);
          ctx.fill();

          // 3D Shaded Fungal Body
          const spGrad = ctx.createRadialGradient(-4, -5, 2, 0, 0, 15);
          spGrad.addColorStop(0, flash ? '#ffffff' : '#6be39b');
          spGrad.addColorStop(0.6, flash ? '#ffffff' : '#297347');
          spGrad.addColorStop(1, '#123822');
          ctx.fillStyle = spGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.fill();

          // Glowing Spore Pustules
          ctx.fillStyle = '#a8fff0';
          ctx.beginPath();
          ctx.arc(-5, -4, 2.6, 0, Math.PI * 2);
          ctx.arc(5, -5, 2.4, 0, Math.PI * 2);
          ctx.arc(0, 4, 2.1, 0, Math.PI * 2);
          ctx.fill();

          // Spore vent crown
          ctx.fillStyle = '#19472b';
          ctx.beginPath();
          ctx.roundRect(-4, -17, 8, 5, 2);
          ctx.fill();

          // Venting spore ring expanding upward
          const ringPhase = (breath * 0.8) % 1.0;
          const ringY = -17 - ringPhase * 16;
          const ringR = 3 + ringPhase * 7;
          ctx.strokeStyle = `rgba(141, 246, 250, ${1 - ringPhase})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, ringY, ringR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();
          break;
        }

        case 'bat': {
          // Painterly Luminescent Luna-Moth Flitter
          const flap = Math.sin(wing) * 14;
          const cx = e.x + e.w / 2;
          const cy = e.y + e.h / 2;

          // Soft wing glow
          const batGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
          batGlow.addColorStop(0, 'rgba(110, 245, 180, 0.3)');
          batGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = batGlow;
          ctx.beginPath();
          ctx.arc(cx, cy, 34, 0, Math.PI * 2);
          ctx.fill();

          // Multi-segment gossamer luna-moth wings
          for (const side of [-1, 1]) {
            const wGrad = ctx.createLinearGradient(cx, cy, cx + side * 26, cy + flap);
            wGrad.addColorStop(0, flash ? '#ffffff' : '#265c3b');
            wGrad.addColorStop(0.65, flash ? '#ffffff' : '#4ad682');
            wGrad.addColorStop(1, '#c4ffab');
            ctx.fillStyle = wGrad;
            ctx.strokeStyle = '#a8ffbe';
            ctx.lineWidth = 1.2;

            ctx.beginPath();
            ctx.moveTo(cx, cy - 3);
            ctx.quadraticCurveTo(cx + side * 18, cy - 16 + flap, cx + side * 27, cy + flap);
            ctx.quadraticCurveTo(cx + side * 15, cy + 10 + flap * 0.5, cx, cy + 5);
            ctx.fill();
            ctx.stroke();

            // Glowing wing eyespot
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx + side * 14, cy - 2 + flap * 0.5, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Velvet thorax body
          ctx.fillStyle = flash ? '#ffffff' : '#14261c';
          ctx.beginPath();
          ctx.ellipse(cx, cy, 6, 11, 0, 0, Math.PI * 2);
          ctx.fill();

          // Glowing cyan eyes
          ctx.fillStyle = '#8df6fa';
          ctx.beginPath();
          ctx.arc(cx - 2.2, cy - 6, 2.2, 0, Math.PI * 2);
          ctx.arc(cx + 2.2, cy - 6, 2.2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'sentinel': {
          // Bramble-Bark Ancient Sentry: sculpted wooden golem with glowing runes & moss shoulders
          const cx = e.x + e.w / 2;
          const stepAngle = Math.sin(walk * 0.5) * 0.25;

          // Trunk Legs
          ctx.fillStyle = flash ? '#ffffff' : '#241810';
          for (const side of [-1, 1]) {
            const legShift = side * stepAngle * 10;
            ctx.beginPath();
            ctx.roundRect(cx + side * 8 - 4, e.y + e.h - 18 + legShift, 8, 18, 3);
            ctx.fill();
          }

          // Sculpted Bark Torso with 3D shading
          const sGrad = ctx.createLinearGradient(e.x, e.y, e.x + e.w, e.y);
          sGrad.addColorStop(0, flash ? '#ffffff' : '#593e28');
          sGrad.addColorStop(0.5, flash ? '#ffffff' : '#3d2a1b');
          sGrad.addColorStop(1, '#21160e');
          ctx.fillStyle = sGrad;
          ctx.beginPath();
          ctx.roundRect(e.x + 3, e.y + 10, e.w - 6, e.h - 22, 7);
          ctx.fill();

          // Bark Head & Lush Moss Crown
          ctx.fillStyle = flash ? '#ffffff' : '#4a3422';
          ctx.beginPath();
          ctx.roundRect(e.x + 7, e.y, e.w - 14, 14, 4);
          ctx.fill();
          ctx.fillStyle = '#479c4c';
          ctx.beginPath();
          ctx.ellipse(cx, e.y, e.w * 0.42, 4.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Creaking branch arms swinging with momentum
          const armSwing = Math.sin(walk * 0.5) * 12;
          ctx.strokeStyle = '#382618';
          ctx.lineWidth = 4.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(e.x + 6, e.y + 15);
          ctx.lineTo(e.x - 6 - armSwing, e.y + 29);
          ctx.moveTo(e.x + e.w - 6, e.y + 15);
          ctx.lineTo(e.x + e.w + 6 + armSwing, e.y + 29);
          ctx.stroke();

          // Glowing ocular visor slit
          const slitColor = e.isAlert ? '#ff5252' : '#65f09e';
          ctx.fillStyle = slitColor;
          ctx.shadowColor = slitColor;
          ctx.shadowBlur = 8;
          ctx.fillRect(e.facing > 0 ? e.x + e.w - 13 : e.x + 6, e.y + 5, 7, 5);
          ctx.shadowBlur = 0;
          break;
        }

        case 'thumper': {
          // Root-Horned Briar Brute
          const cx = e.x + e.w / 2;
          const gallop = Math.sin(walk * 0.7);

          // Heavy Hoofed Legs
          ctx.fillStyle = flash ? '#ffffff' : '#1c140e';
          for (let i = -1; i <= 1; i += 2) {
            const hoofShift = i * gallop * 8;
            ctx.beginPath();
            ctx.roundRect(cx + i * 14 - 5, e.y + e.h - 16 + hoofShift, 10, 16, 3);
            ctx.fill();
          }

          // Massive Hulking 3D Body
          const tGrad = ctx.createRadialGradient(cx - 6, e.y + 18, 4, cx, e.y + 26, e.w * 0.6);
          tGrad.addColorStop(0, flash ? '#ffffff' : '#573d27');
          tGrad.addColorStop(0.6, flash ? '#ffffff' : '#362517');
          tGrad.addColorStop(1, '#1c130b');
          ctx.fillStyle = tGrad;
          ctx.beginPath();
          ctx.roundRect(e.x + 2, e.y + 10, e.w - 4, e.h - 20, 10);
          ctx.fill();

          // Mossy back ridge
          ctx.fillStyle = '#387d44';
          ctx.beginPath();
          ctx.ellipse(cx, e.y + 11, e.w * 0.38, 5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Massive curved wooden horns
          ctx.strokeStyle = '#9e6a3c';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cx - 10, e.y + 9);
          ctx.quadraticCurveTo(cx - 25, e.y - 6, cx - 20, e.y - 18);
          ctx.moveTo(cx + 10, e.y + 9);
          ctx.quadraticCurveTo(cx + 25, e.y - 6, cx + 20, e.y - 18);
          ctx.stroke();

          // Glowing predator amber eye
          ctx.fillStyle = '#ffbe47';
          ctx.shadowColor = '#ffbe47';
          ctx.shadowBlur = 7;
          ctx.beginPath();
          ctx.arc(e.facing > 0 ? e.x + e.w - 9 : e.x + 9, e.y + 17, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          break;
        }

        case 'crystal_golem': {
          // Geode-Bramble Golem: chiseled stone bound in roots with glowing crystal heart
          const cx = e.x + e.w / 2;
          const cy = e.y + e.h / 2;
          ctx.fillStyle = flash ? '#ffffff' : '#2d263b';
          ctx.beginPath();
          ctx.roundRect(e.x + 3, e.y + 3, e.w - 6, e.h - 6, 9);
          ctx.fill();

          // Glowing amethyst geode in chest
          const gGlow = ctx.createRadialGradient(cx, cy, 1, cx, cy, 16);
          gGlow.addColorStop(0, '#ffffff');
          gGlow.addColorStop(0.45, '#c68aff');
          gGlow.addColorStop(1, 'rgba(177, 116, 242, 0)');
          ctx.fillStyle = gGlow;
          ctx.beginPath();
          ctx.arc(cx, cy, 16, 0, Math.PI * 2);
          ctx.fill();

          // Thorny vine binding
          ctx.strokeStyle = '#2d6338';
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.moveTo(e.x + 5, e.y + 12);
          ctx.lineTo(e.x + e.w - 5, e.y + e.h - 12);
          ctx.stroke();
          break;
        }

        case 'wisp': {
          // Forest Will-o'-Wisp: luminous spirit core with orbiting motes
          const bob = Math.sin(time * 5 + e.x) * 4;
          const cx = e.x + e.w / 2;
          const cy = e.y + e.h / 2 + bob;

          const wGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 20);
          wGrad.addColorStop(0, '#ffffff');
          wGrad.addColorStop(0.4, '#70f2ff');
          wGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = wGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, 20, 0, Math.PI * 2);
          ctx.fill();

          for (let sat = 0; sat < 2; sat++) {
            const satAngle = time * 7 + sat * Math.PI;
            const sx = cx + Math.cos(satAngle) * 12;
            const sy = cy + Math.sin(satAngle) * 7;
            ctx.fillStyle = '#a8fff9';
            ctx.beginPath();
            ctx.arc(sx, sy, 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        default: {
          ctx.fillStyle = flash ? '#ffffff' : '#233b27';
          ctx.beginPath();
          ctx.roundRect(e.x, e.y, e.w, e.h, 7);
          ctx.fill();

          ctx.fillStyle = '#68f09c';
          ctx.beginPath();
          ctx.arc(e.facing > 0 ? e.x + e.w - 8 : e.x + 8, e.y + 10, 3.8, 0, Math.PI * 2);
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
        const bGrad = ctx.createRadialGradient(b.x + b.w * 0.4, b.y + 24, 6, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.65);
        bGrad.addColorStop(0, flash ? '#ffffff' : '#3a7a4c');
        bGrad.addColorStop(0.6, flash ? '#ffffff' : '#1d4027');
        bGrad.addColorStop(1, '#0e2114');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y + 14, b.w, b.h - 14, 18);
        ctx.fill();

        // Giant branching root-horns
        ctx.strokeStyle = '#9c663b';
        ctx.lineWidth = 5.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x + b.w / 2 + b.facing * 10, b.y + 16);
        ctx.lineTo(b.x + b.w / 2 + b.facing * 36, b.y - 18);
        ctx.lineTo(b.x + b.w / 2 + b.facing * 50, b.y - 14);
        ctx.stroke();

        // Back flora garden (glowing mushrooms)
        ctx.fillStyle = '#6cf09e';
        ctx.shadowColor = '#6cf09e';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x + 22, b.y + 12, 7.5, 0, Math.PI * 2);
        ctx.arc(b.x + 42, b.y + 8, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

      } else if (b.type === 'boss_archon') {
        // Archon Malakor
        ctx.fillStyle = flash ? '#ffffff' : '#160d1f';
        ctx.beginPath();
        ctx.roundRect(b.x, b.y + 12, b.w, b.h - 12, 14);
        ctx.fill();

        // Jagged Thorn-Crown
        ctx.strokeStyle = '#ff5c77';
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.moveTo(b.x + 10, b.y + 14);
        ctx.lineTo(b.x + 18, b.y - 8);
        ctx.lineTo(b.x + b.w / 2, b.y + 8);
        ctx.lineTo(b.x + b.w - 18, b.y - 8);
        ctx.lineTo(b.x + b.w - 10, b.y + 14);
        ctx.stroke();

        // Glowing Abyssal Void Heart
        ctx.fillStyle = '#ff5c77';
        ctx.shadowColor = '#ff5c77';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + 40, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

      } else {
        // The Prism Warden
        ctx.fillStyle = flash ? '#ffffff' : '#2e1d47';
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 14);
        ctx.fill();

        ctx.fillStyle = '#c58aff';
        ctx.shadowColor = '#c58aff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
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

    // =========================================================================
    // 1. FLOATING SOUL-FLAME WISP COMPANION (Hovers & trails behind Kaelen
    //    exactly like the golden-blue spirit flame in the reference image!)
    // =========================================================================
    const targetWispX = px - p.facing * 34 + Math.cos(time * 3.2) * 4;
    const targetWispY = p.y + 16 + levitate + Math.sin(time * 4.6) * 5;
    if (!this.wispX && !this.wispY) {
      this.wispX = targetWispX;
      this.wispY = targetWispY;
    } else {
      this.wispX += (targetWispX - this.wispX) * 0.18;
      this.wispY += (targetWispY - this.wispY) * 0.18;
    }
    const wx = this.wispX;
    const wy = this.wispY;

    // Warm Golden & Cyan Multi-Stop Radial Bloom Halo around the Wisp
    const wispPulse = 1.0 + 0.12 * Math.sin(time * 9);
    const wispHalo = ctx.createRadialGradient(wx, wy, 2, wx, wy, 48 * wispPulse);
    wispHalo.addColorStop(0, 'rgba(255, 250, 220, 0.85)');
    wispHalo.addColorStop(0.28, 'rgba(255, 195, 75, 0.48)');
    wispHalo.addColorStop(0.62, 'rgba(92, 225, 230, 0.18)');
    wispHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = wispHalo;
    ctx.beginPath();
    ctx.arc(wx, wy, 48 * wispPulse, 0, Math.PI * 2);
    ctx.fill();

    // Outer licking golden-amber flame tongues
    for (let t = 0; t < 5; t++) {
      const tPhase = time * 10 + t * 1.3;
      const sway = Math.sin(tPhase) * 5;
      const fHeight = 20 + (t % 2) * 7 + Math.cos(tPhase * 1.2) * 4;
      const offsetX = (t - 2) * 3.2;

      const fGrad = ctx.createLinearGradient(wx + offsetX, wy + 8, wx + offsetX + sway, wy - fHeight);
      fGrad.addColorStop(0, '#ff7b1c');
      fGrad.addColorStop(0.55, '#ffc247');
      fGrad.addColorStop(1, 'rgba(255, 235, 150, 0)');
      ctx.fillStyle = fGrad;

      ctx.beginPath();
      ctx.moveTo(wx + offsetX - 6, wy + 4);
      ctx.quadraticCurveTo(wx + offsetX - 7, wy - fHeight * 0.5, wx + offsetX + sway, wy - fHeight);
      ctx.quadraticCurveTo(wx + offsetX + 7, wy - fHeight * 0.5, wx + offsetX + 6, wy + 4);
      ctx.closePath();
      ctx.fill();
    }

    // Inner Azure-Cyan Soul Flame Heart (matching the blue-white center of the wisp in the image)
    const coreGrad = ctx.createLinearGradient(wx, wy + 5, wx, wy - 14);
    coreGrad.addColorStop(0, '#38b6ff');
    coreGrad.addColorStop(0.5, '#9ef8ff');
    coreGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.moveTo(wx - 4.5, wy + 3);
    ctx.quadraticCurveTo(wx - 5, wy - 6, wx + Math.sin(time * 12) * 2, wy - 14);
    ctx.quadraticCurveTo(wx + 5, wy - 6, wx + 4.5, wy + 3);
    ctx.closePath();
    ctx.fill();

    // Orbiting cyan & golden sparkles around the wisp
    for (let sp = 0; sp < 6; sp++) {
      const spAngle = time * 3.5 + sp * 1.05;
      const spDist = 11 + (sp % 3) * 6 + Math.sin(time * 5 + sp) * 3;
      const spX = wx + Math.cos(spAngle) * spDist;
      const spY = wy - 3 + Math.sin(spAngle) * (spDist * 0.7);
      ctx.fillStyle = sp % 2 === 0 ? '#ffe680' : '#8df6fa';
      ctx.beginPath();
      ctx.arc(spX, spY, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // =========================================================================
    // 2. KAELEN BODY TRANSFORM (Squash & Stretch + Sprint Lean)
    // =========================================================================
    ctx.save();
    ctx.translate(px, py + levitate);
    ctx.scale(p.scaleX || 1.0, p.scaleY || 1.0);

    if (p.onGround && Math.abs(p.vx) > 30) {
      const runLean = p.facing * Math.min(0.15, Math.abs(p.vx) / 1500);
      ctx.rotate(runLean);
    }
    ctx.translate(-px, -py);

    // Focus Heal Aura
    if (isHealing) {
      const hPulse = 1.0 + 0.2 * Math.sin(time * 8);
      const hGrad = ctx.createRadialGradient(px, py - 22, 4, px, py - 22, 38 * hPulse);
      hGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      hGrad.addColorStop(0.5, 'rgba(92, 225, 230, 0.28)');
      hGrad.addColorStop(1, 'rgba(92, 225, 230, 0)');
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.arc(px, py - 22, 38 * hPulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // =========================================================================
    // 3. SLENDER ANIMATED LEGS & BOOTS
    // =========================================================================
    const stepPhase = p.onGround && Math.abs(p.vx) > 15 ? (p.walkCycle || time * 13) : 0;
    for (const side of [-1, 1]) {
      const legSwing = p.onGround
        ? Math.sin(stepPhase + (side > 0 ? Math.PI : 0)) * (Math.abs(p.vx) > 15 ? 7 : 0)
        : side * 4;
      const footLift = p.onGround && Math.abs(p.vx) > 15
        ? Math.max(0, Math.cos(stepPhase + (side > 0 ? Math.PI : 0)) * 4)
        : 0;

      const hipX = px + side * 3.5;
      const hipY = p.y + p.h - 14;
      const footX = hipX + legSwing;
      const footY = p.y + p.h - footLift;

      ctx.strokeStyle = side < 0 ? '#0d111a' : '#171e2b';
      ctx.lineWidth = 4.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(footX, footY - 2);
      ctx.stroke();
    }

    // =========================================================================
    // 4. LAYERED DRAPED WOODLAND CLOAK WITH SCALLOPED HEM & FLAME RIM-LIGHT
    // =========================================================================
    const cloakFlutter = Math.sin(time * 9 + px * 0.05) * 3.5 - (p.vx * 0.025);

    // Back Cloak Fold (warm amber-gold rim-lit by the floating wisp behind Kaelen!)
    const backCloakGrad = ctx.createLinearGradient(px - p.facing * 16, p.y + 14, px + p.facing * 10, p.y + p.h - 6);
    backCloakGrad.addColorStop(0, '#a87b46');
    backCloakGrad.addColorStop(0.35, '#47392e');
    backCloakGrad.addColorStop(1, '#161b26');
    ctx.fillStyle = backCloakGrad;
    ctx.beginPath();
    ctx.moveTo(px - p.facing * 4, p.y + 13);
    ctx.quadraticCurveTo(
      px - p.facing * 18 + cloakFlutter,
      p.y + 26,
      px - p.facing * 16 + cloakFlutter * 1.3,
      p.y + p.h - 9
    );
    ctx.lineTo(px + p.facing * 8, p.y + p.h - 10);
    ctx.closePath();
    ctx.fill();

    // Main Draped Cloak Body (Deep twilight slate-indigo with subtle folds)
    const cloakGrad = ctx.createLinearGradient(px - 10, p.y + 12, px + 12, p.y + p.h - 8);
    if (game.hasAbility('thornWard')) {
      cloakGrad.addColorStop(0, '#36234a');
      cloakGrad.addColorStop(0.6, '#211530');
      cloakGrad.addColorStop(1, '#120b1c');
    } else {
      cloakGrad.addColorStop(0, '#2b3548');
      cloakGrad.addColorStop(0.55, '#1b2230');
      cloakGrad.addColorStop(1, '#10151f');
    }
    ctx.fillStyle = cloakGrad;
    ctx.beginPath();
    ctx.moveTo(px - 6, p.y + 13);
    ctx.quadraticCurveTo(px - 13 + cloakFlutter * 0.5, p.y + 25, px - 12 + cloakFlutter, p.y + p.h - 10);
    // Scalloped / tattered woodland hem
    ctx.lineTo(px - 6 + cloakFlutter * 0.6, p.y + p.h - 7);
    ctx.lineTo(px - 1 + cloakFlutter * 0.4, p.y + p.h - 11);
    ctx.lineTo(px + 5 + cloakFlutter * 0.2, p.y + p.h - 7);
    ctx.lineTo(px + 11, p.y + p.h - 10);
    ctx.quadraticCurveTo(px + 12, p.y + 24, px + 6, p.y + 13);
    ctx.closePath();
    ctx.fill();

    // Cloak fabric fold highlight lines
    ctx.strokeStyle = 'rgba(140, 175, 220, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px - 2, p.y + 16);
    ctx.quadraticCurveTo(px - 5 + cloakFlutter * 0.4, p.y + 26, px - 5 + cloakFlutter * 0.6, p.y + p.h - 9);
    ctx.moveTo(px + 3, p.y + 16);
    ctx.quadraticCurveTo(px + 4, p.y + 26, px + 5, p.y + p.h - 9);
    ctx.stroke();

    // Golden Collar Clasp / Brooch at the neck (matching the reference artwork)
    const claspX = px + p.facing * 3;
    const claspY = p.y + 16;
    ctx.fillStyle = '#ffd86b';
    ctx.beginPath();
    ctx.moveTo(claspX, claspY - 2.8);
    ctx.lineTo(claspX + 2.8, claspY);
    ctx.lineTo(claspX, claspY + 2.8);
    ctx.lineTo(claspX - 2.8, claspY);
    ctx.closePath();
    ctx.fill();

    // =========================================================================
    // 5. FLOWING LUMINOUS WHITE-CYAN MANE / HAIR (Streams behind Kaelen with
    //    warm golden-amber rim light on the tips facing the Wisp!)
    // =========================================================================
    const hairWave = Math.sin(time * 8.5) * 4;
    const hairLocks = [
      { startY: p.y + 3, lenX: 28, liftY: -4, thick: 6.5 },
      { startY: p.y + 6, lenX: 34, liftY: 1, thick: 7.5 },
      { startY: p.y + 9, lenX: 29, liftY: 6, thick: 6.0 },
      { startY: p.y + 12, lenX: 22, liftY: 10, thick: 4.5 }
    ];

    for (let i = 0; i < hairLocks.length; i++) {
      const lock = hairLocks[i];
      const hx0 = px - p.facing * 2;
      const hy0 = lock.startY;
      const tipX = px - p.facing * (lock.lenX + Math.abs(p.vx) * 0.04) + cloakFlutter * 0.8;
      const tipY = hy0 + lock.liftY + Math.sin(time * 9 + i * 1.1) * 3.5;

      // Gradient from glowing cyan-white at the crown to warm golden-lit tips near the wisp
      const hGrad = ctx.createLinearGradient(hx0, hy0, tipX, tipY);
      hGrad.addColorStop(0, '#ffffff');
      hGrad.addColorStop(0.55, '#c7f8ff');
      hGrad.addColorStop(0.85, '#ffe6a3');
      hGrad.addColorStop(1, '#ffb84d');

      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.moveTo(hx0, hy0 - lock.thick * 0.5);
      ctx.bezierCurveTo(
        hx0 - p.facing * (lock.lenX * 0.4),
        hy0 - lock.thick + hairWave * 0.4,
        hx0 - p.facing * (lock.lenX * 0.75),
        tipY - lock.thick * 0.4,
        tipX,
        tipY
      );
      ctx.bezierCurveTo(
        hx0 - p.facing * (lock.lenX * 0.7),
        tipY + lock.thick * 0.6,
        hx0 - p.facing * (lock.lenX * 0.35),
        hy0 + lock.thick * 0.7 + hairWave * 0.4,
        hx0,
        hy0 + lock.thick * 0.5
      );
      ctx.closePath();
      ctx.fill();
    }

    // =========================================================================
    // 6. EXPRESSIVE DARK SPIRIT HEAD & GLOWING CYAN EYES
    // =========================================================================
    const headGrad = ctx.createRadialGradient(px + p.facing * 2, p.y + 7, 2, px, p.y + 8, 10.5);
    headGrad.addColorStop(0, '#222b3d');
    headGrad.addColorStop(0.7, '#111621');
    headGrad.addColorStop(1, '#080b12');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(px, p.y + 8.5, 9.8, 0, Math.PI * 2);
    ctx.fill();

    // Crisp luminous hair bang sweeping over the brow
    ctx.fillStyle = '#e8fcff';
    ctx.beginPath();
    ctx.moveTo(px - p.facing * 5, p.y + 1);
    ctx.quadraticCurveTo(px + p.facing * 6, p.y - 2, px + p.facing * 9, p.y + 5);
    ctx.quadraticCurveTo(px + p.facing * 2, p.y + 4, px - p.facing * 5, p.y + 4);
    ctx.closePath();
    ctx.fill();

    // Glowing Cyan-White Oval Eyes
    const eyeCenter = px + p.facing * 3.5;
    // Soft cyan eye bloom
    ctx.fillStyle = 'rgba(115, 242, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(eyeCenter - 2.6, p.y + 8.8, 3.2, 4.0, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeCenter + 2.8, p.y + 8.8, 3.0, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bright white-cyan eye cores
    ctx.fillStyle = '#e0ffff';
    ctx.beginPath();
    ctx.ellipse(eyeCenter - 2.6, p.y + 8.8, 1.9, 2.7, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeCenter + 2.8, p.y + 8.8, 1.7, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // End Kaelen squash/stretch transform

    // =========================================================================
    // 7. SWEEPING CRESCENT SLASH TRAILS (Gloom-Cleaver)
    // =========================================================================
    if (p.slashTrails && p.slashTrails.length > 0) {
      for (const tr of p.slashTrails) {
        const trailAlpha = Math.max(0, tr.life / tr.maxLife);
        ctx.save();
        const bladeColor = tr.isHeavy
          ? '#b174f2'
          : tr.tempered
          ? '#ffbe55'
          : '#5ce1e6';
        const trailRadius = tr.isHeavy ? 54 : 42;

        ctx.translate(tr.x, tr.y);
        ctx.scale(tr.facing, 1);

        let startAngle = -0.9 * Math.PI;
        let endAngle = 0.35 * Math.PI;
        if (tr.dir === 'up') {
          startAngle = -1.25 * Math.PI;
          endAngle = -0.15 * Math.PI;
        } else if (tr.dir === 'down') {
          startAngle = 0.15 * Math.PI;
          endAngle = 1.15 * Math.PI;
        }

        ctx.strokeStyle = bladeColor;
        ctx.globalAlpha = trailAlpha * 0.78;
        ctx.lineWidth = tr.isHeavy ? 11 : 7.5;
        ctx.beginPath();
        ctx.arc(0, 0, trailRadius, startAngle, endAngle);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = trailAlpha * 0.96;
        ctx.lineWidth = tr.isHeavy ? 4.5 : 3;
        ctx.beginPath();
        ctx.arc(0, 0, trailRadius, startAngle, endAngle);
        ctx.stroke();

        const tipX = Math.cos(endAngle) * trailRadius;
        const tipY = Math.sin(endAngle) * trailRadius;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = bladeColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
      }
    }

    ctx.restore();
  }

  drawProjectilesAndParticles(ctx, game) {
    for (const pr of game.projectiles) {
      ctx.save();
      ctx.fillStyle = pr.color;
      ctx.shadowColor = pr.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const pt of game.particles) {
      const alpha = Math.max(0, pt.life / pt.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      if (pt.size > 2.2) {
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 5;
      }
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawCavernMist(ctx, biome, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const mistGrad = ctx.createLinearGradient(0, 740, 0, 960);
    mistGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    mistGrad.addColorStop(0.65, hexToRgba(biome.accent, 0.08));
    mistGrad.addColorStop(1, hexToRgba(biome.accent, 0.16));
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, 740, 1600, 220);
    ctx.restore();
  }

  drawForegroundFraming(ctx, room, biome, camX, camY, W, H, time) {
    // Dark botanical foreground silhouette frame (gnarled roots, shelf fungi, fern fronds & hanging vines
    // along viewport edges, matching the lush dark foreground framing of the reference image)
    ctx.save();
    const fgColor = '#04070b';
    const fgHighlight = '#0b121c';

    // Top-left & top-right overarching root canopy corners
    ctx.fillStyle = fgColor;
    // Left gnarled root pillar edge (subtle parallax near screen border)
    const leftEdgeX = Math.max(-20, -camX * 0.15);
    ctx.beginPath();
    ctx.moveTo(leftEdgeX, 0);
    ctx.lineTo(leftEdgeX + 42, 0);
    ctx.quadraticCurveTo(leftEdgeX + 24, H * 0.25, leftEdgeX + 32, H * 0.52);
    ctx.quadraticCurveTo(leftEdgeX + 18, H * 0.78, leftEdgeX + 46, H);
    ctx.lineTo(leftEdgeX, H);
    ctx.closePath();
    ctx.fill();

    // Right gnarled root pillar edge
    const rightEdgeX = W + Math.min(20, (1600 - W - camX) * 0.15);
    ctx.beginPath();
    ctx.moveTo(rightEdgeX, 0);
    ctx.lineTo(rightEdgeX - 42, 0);
    ctx.quadraticCurveTo(rightEdgeX - 24, H * 0.28, rightEdgeX - 34, H * 0.55);
    ctx.quadraticCurveTo(rightEdgeX - 18, H * 0.8, rightEdgeX - 48, H);
    ctx.lineTo(rightEdgeX, H);
    ctx.closePath();
    ctx.fill();

    // Bracket/shelf mushrooms & fern silhouettes on the foreground trunks
    const drawFgShelfFungus = (fx, fy, dir, scale) => {
      ctx.fillStyle = fgColor;
      ctx.beginPath();
      ctx.ellipse(fx + dir * 12 * scale, fy, 16 * scale, 5.5 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1b2c24';
      ctx.beginPath();
      ctx.ellipse(fx + dir * 12 * scale, fy - 1.5, 13 * scale, 3 * scale, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    };

    drawFgShelfFungus(leftEdgeX + 26, H * 0.34, 1, 1.1);
    drawFgShelfFungus(leftEdgeX + 22, H * 0.37, 1, 0.75);
    drawFgShelfFungus(leftEdgeX + 28, H * 0.68, 1, 1.0);
    drawFgShelfFungus(rightEdgeX - 26, H * 0.42, -1, 1.15);
    drawFgShelfFungus(rightEdgeX - 22, H * 0.45, -1, 0.8);

    // Hanging foreground silhouette vines along the top border
    ctx.strokeStyle = fgColor;
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const vx = ((i * 175 + 60) - camX * 1.15) % (W + 160);
      const drawX = vx < -80 ? vx + W + 160 : vx;
      const vLen = 38 + (i % 3) * 26;
      const sway = Math.sin(time * 1.6 + i * 1.3) * 4;

      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(drawX, -4);
      ctx.quadraticCurveTo(drawX + sway * 0.5, vLen * 0.5, drawX + sway, vLen);
      ctx.stroke();

      // Tiny silhouette leaves on hanging vine
      ctx.fillStyle = fgHighlight;
      for (let l = 1; l <= 3; l++) {
        const ly = (vLen / 4) * l;
        const lx = drawX + sway * (l / 4);
        ctx.beginPath();
        ctx.ellipse(lx + (l % 2 === 0 ? 4 : -4), ly, 4.5, 2.2, (l % 2 === 0 ? 0.4 : -0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawLightingOverlay(ctx, room, biome, game, camX, camY, time) {
    const lctx = this.lightCtx;
    const W = this.lightCanvas.width;
    const H = this.lightCanvas.height;

    lctx.globalCompositeOperation = 'source-over';
    // Slightly softer darkness base so all the rich painterly background & moss details shine through
    const darknessAlpha = Math.max(0.18, (1 - biome.ambientLight) * 0.75);
    lctx.fillStyle = `rgba(3, 6, 13, ${darknessAlpha})`;
    lctx.fillRect(0, 0, W, H);

    lctx.globalCompositeOperation = 'destination-out';

    const punchLight = (wx, wy, radius) => {
      const sx = wx - camX;
      const sy = wy - camY;
      if (sx < -radius || sx > W + radius || sy < -radius || sy > H + radius) return;
      const g = lctx.createRadialGradient(sx, sy, radius * 0.08, sx, sy, radius);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.5, 'rgba(0,0,0,0.88)');
      g.addColorStop(0.8, 'rgba(0,0,0,0.42)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g;
      lctx.beginPath();
      lctx.arc(sx, sy, radius, 0, Math.PI * 2);
      lctx.fill();
    };

    // Player & Floating Wisp light pool
    const lanternScale = game.state.worldFlags.lanternUpgraded ? 1.45 : 1.0;
    const flicker = Math.sin(time * 8.5) * 6 + Math.cos(time * 14) * 3.5;
    punchLight(
      game.player.x + game.player.w / 2,
      game.player.y + game.player.h / 2,
      (290 + flicker) * lanternScale
    );

    // Brazier light
    if (room.brazier) {
      punchLight(room.brazier.x, room.brazier.y - 35, 260 + flicker * 0.8);
    }

    // Lore Tablet light
    if (room.loreTablet) {
      punchLight(room.loreTablet.x, room.loreTablet.y - 45, 175);
    }

    // Collectible items & Lumen Shards
    if (room.items) {
      for (const it of room.items) {
        if (!game.isItemCollected(room.id, it)) {
          punchLight(it.x, it.y, 120);
        }
      }
    }

    // NPCs punch warm light
    if (room.npcs) {
      for (const npc of room.npcs) {
        punchLight(npc.x, npc.y - 25, 190);
      }
    }

    // Enemies punch subtle bioluminescent light
    if (game.enemies) {
      for (const e of game.enemies) {
        if (!e.dead) {
          punchLight(e.x + e.w / 2, e.y + e.h / 2, 110);
        }
      }
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
          punchLight(p.x, p.y - 30, 195);
        }
      }
    }

    // Draw darkness & lighting mask onto main canvas
    ctx.drawImage(this.lightCanvas, 0, 0);

    // Additive Colored Atmospheric Bloom Passes (Warm Amber for Wisp/Lumen, Azure for Brazier, Emerald for Fauna)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const drawColorBloom = (wx, wy, radius, colorRgb, alpha) => {
      const sx = wx - camX;
      const sy = wy - camY;
      if (sx < -radius || sx > W + radius || sy < -radius || sy > H + radius) return;
      const bg = ctx.createRadialGradient(sx, sy, 2, sx, sy, radius);
      bg.addColorStop(0, `rgba(${colorRgb}, ${alpha})`);
      bg.addColorStop(0.5, `rgba(${colorRgb}, ${alpha * 0.4})`);
      bg.addColorStop(1, `rgba(${colorRgb}, 0)`);
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    // Warm golden-amber bloom from Kaelen's floating wisp
    drawColorBloom(
      this.wispX || (game.player.x + game.player.w / 2),
      this.wispY || (game.player.y + 18),
      150,
      '255, 195, 85',
      0.16
    );

    // Azure bloom on Soul Brazier
    if (room.brazier) {
      drawColorBloom(room.brazier.x, room.brazier.y - 34, 170, '75, 215, 255', 0.18);
    }

    // Golden bloom on uncollected Lumen Shards
    if (room.items) {
      for (const it of room.items) {
        if (!game.isItemCollected(room.id, it)) {
          drawColorBloom(it.x, it.y, 90, '255, 220, 95', 0.18);
        }
      }
    }

    ctx.restore();

    // Cinematic Vignette Overlay around viewport corners
    ctx.save();
    const vGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.38, W / 2, H / 2, W * 0.76);
    vGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vGrad.addColorStop(0.7, 'rgba(2, 4, 8, 0.25)');
    vGrad.addColorStop(1, 'rgba(1, 2, 5, 0.68)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, W, H);

    // Red Damage Border Vignette Flash
    if (game.player && game.player.hurtTimer > 0) {
      const hurtAlpha = Math.min(0.42, (game.player.hurtTimer / 0.32) * 0.42);
      const hGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.68);
      hGrad.addColorStop(0, 'rgba(224, 83, 104, 0)');
      hGrad.addColorStop(1, `rgba(224, 83, 104, ${hurtAlpha})`);
      ctx.fillStyle = hGrad;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
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
    this.player.hurtTimer = 0.32;
    this.player.vy = -280;
    this.player.vx = -this.player.facing * 220;
    audio.playerHurt();
    this.addScreenShake(9, 0.32);
    this.spawnParticles(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2,
      '#e05368',
      22,
      160
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
        e.hurtFlash = 0.16;
        audio.hitEnemy();
        this.player.soul = Math.min(this.player.maxSoul, this.player.soul + soulGain);
        this.addScreenShake(atk.isHeavy ? 6.5 : 3.8, atk.isHeavy ? 0.22 : 0.12);

        if (this.player.attackDir === 'down') {
          this.player.vy = -450; // Pogo bounce!
          this.player.canDoubleJump = this.hasAbility('doubleJump');
          this.player.canAirDash = true;
          this.addScreenShake(4.5, 0.14);
        }

        // Directional spark bursts
        this.spawnParticles(e.x + e.w / 2, e.y + e.h / 2, atk.isHeavy ? '#d27eff' : '#ffbe55', atk.isHeavy ? 18 : 12, 130);

        if (e.hp <= 0) {
          e.dead = true;
          this.state.lumens += 8;
          this.addScreenShake(5, 0.18);
          this.spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#f3a847', 20, 160);
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
      b.hurtFlash = 0.14;
      audio.hitEnemy();
      this.player.soul = Math.min(this.player.maxSoul, this.player.soul + soulGain);
      this.addScreenShake(atk.isHeavy ? 7 : 4.5, 0.16);

      if (this.player.attackDir === 'down') {
        this.player.vy = -460;
        this.player.canDoubleJump = this.hasAbility('doubleJump');
        this.player.canAirDash = true;
      }
      const pct = Math.max(0, (b.hp / b.maxHp) * 100);
      document.getElementById('boss-hp-fill').style.width = `${pct}%`;
      this.spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#e05368', 16, 150);

      if (b.hp <= 0) {
        b.dead = true;
        this.state.defeatedBosses[b.id] = true;
        this.state.lumens += 100;
        document.getElementById('boss-hud').classList.add('hidden');
        audio.questComplete();
        audio.setRegion(this.currentRoom.biome, false);
        this.addScreenShake(12, 0.5);
        this.spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#8df6fa', 40, 220);
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
    // 1. Soul Brazier continuous glowing flame motes
    if (room.brazier && Math.random() < 0.35) {
      const b = room.brazier;
      const isActive = this.state.checkpoint && this.state.checkpoint.roomId === room.id;
      this.particles.push({
        x: b.x + (Math.random() - 0.5) * 16,
        y: b.y - 42,
        vx: (Math.random() - 0.5) * 18,
        vy: -28 - Math.random() * 32,
        color: isActive ? '#5ce1e6' : '#f3a847',
        size: 1.8 + Math.random() * 1.6,
        life: 0.65,
        maxLife: 0.65
      });
    }

    // 2. Glowing aura particles around uncollected items & Lumen Shards
    if (room.items && Math.random() < 0.3) {
      for (const it of room.items) {
        if (this.isItemCollected(room.id, it)) continue;
        const col = it.type === 'ability' ? '#d27eff' : it.type === 'mask_upgrade' ? '#8df6fa' : '#f3a847';
        const pAngle = Math.random() * Math.PI * 2;
        this.particles.push({
          x: it.x + Math.cos(pAngle) * 12,
          y: it.y + Math.sin(pAngle) * 12,
          vx: -Math.cos(pAngle) * 8,
          vy: -14 - Math.random() * 18,
          color: col,
          size: 1.6 + Math.random() * 1.4,
          life: 0.6,
          maxLife: 0.6
        });
      }
    }

    // 3. Subtle ambient biome particles (spores, floating embers, stardust)
    if (this.particles.length < 65 && Math.random() < 0.5) {
      const b = BIOMES[room.biome];
      this.particles.push({
        x: this.camX + Math.random() * 1280,
        y: this.camY + Math.random() * 720,
        vx: (Math.random() - 0.5) * 16,
        vy: b.particleType === 'drips' ? 95 : -14 - Math.random() * 18,
        color: b.accent,
        size: 1.5 + Math.random() * 2,
        life: 2.0,
        maxLife: 2.0
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
    const viewW = 1280;
    const viewH = 720;
    // Dynamic look-ahead based on player movement direction and horizontal velocity
    const lookAheadX = this.player.facing * Math.min(85, Math.abs(this.player.vx) * 0.24);
    const lookAheadY = Math.max(-50, Math.min(50, this.player.vy * 0.10));

    const targetX = this.player.x + this.player.w / 2 + lookAheadX - viewW / 2;
    const targetY = this.player.y + this.player.h / 2 + lookAheadY - viewH / 2;

    // Smooth exponential damping / camera lerp
    this.camX += (targetX - this.camX) * Math.min(1, dt * 6.2);
    this.camY += (targetY - this.camY) * Math.min(1, dt * 6.2);

    // Clamp to 1600x960 room bounds
    this.camX = Math.max(0, Math.min(1600 - viewW, this.camX));
    this.camY = Math.max(0, Math.min(960 - viewH, this.camY));

    // Screen Shake Offset with smooth decay
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const decay = Math.max(0, this.shakeTime / 0.35);
      const shakeAmt = this.shakeMag * decay;
      this.camX += (Math.random() - 0.5) * shakeAmt * 2.2;
      this.camY += (Math.random() - 0.5) * shakeAmt * 2.2;
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
        const isFilled = i < this.player.hp;
        const isCritical = this.player.hp === 1 && isFilled;
        mask.className = 'mask-heart' + (!isFilled ? ' empty' : '') + (isCritical ? ' low-health' : '');
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
