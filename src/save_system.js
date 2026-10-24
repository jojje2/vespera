// Persistent Save & Load System for VESPERA: Echoes of the Undercroft

const SAVE_KEY = 'vespera_undercroft_save_v1';

export function createInitialState() {
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

export class SaveSystem {
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
