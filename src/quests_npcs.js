// Abilities, Items, Quests, and NPC Definitions for VESPERA: Echoes of the Undercroft

export const ABILITY_DEFS = {
  slash: {
    id: 'slash',
    name: 'Gloom-Cleaver',
    keyHint: 'J / Z / X',
    desc: 'Warden Kaelen’s resonant iron blade. Strikes enemies, cuts hanging vines, and channels Soul into your lantern.'
  },
  dash: {
    id: 'dash',
    name: 'Moth-Step Cloak',
    keyHint: 'Shift / K / C',
    desc: 'Woven from silk of the Spore-Weald ancients. Grants a swift horizontal burst through air or across chasms and past falling traps.'
  },
  wallJump: {
    id: 'wallJump',
    name: 'Mantis Talons',
    keyHint: 'Hold toward wall + Jump',
    desc: 'Carved bone hooks from the Drowned Sluice reliquary. Allows clinging to vertical stone shafts and leaping upward between walls.'
  },
  doubleJump: {
    id: 'doubleJump',
    name: 'Zephyr Plume',
    keyHint: 'Jump in Mid-Air',
    desc: 'An iridescent pinion crystallized in the Prism Vaults. Press Jump again in mid-air to vault to high ledges and upper galleries.'
  },
  heavySlash: {
    id: 'heavySlash',
    name: 'Resonance Strike',
    keyHint: 'L / V',
    desc: 'Harmonic technique taught by Liora’s tuning fork. Shatters brittle crystal barriers, cracked masonry walls, and Echo-Glass seals.'
  },
  thornWard: {
    id: 'thornWard',
    name: 'Cinder-Ward Mantle',
    keyHint: 'Passive + Dash Invulnerability',
    desc: 'Alchemical mantle distilled in the Briar Conservatory. Neutralizes poisonous thorns and caustic mire, and cloaks your Dash in shadow.'
  }
};

export const ITEM_DEFS = {
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

export const QUEST_DEFS = [
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

export const NPC_DEFS = {
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

export const SHOP_ITEMS = [
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
