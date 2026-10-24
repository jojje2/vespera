// Main Game Engine, World State Controller, Input, UI & Quest Progression

import { audio } from './audio.js';
import { BIOMES, ROOMS } from './world_data.js';
import { ABILITY_DEFS, ITEM_DEFS, QUEST_DEFS, NPC_DEFS, SHOP_ITEMS } from './quests_npcs.js';
import { Player, Enemy, Boss, rectOverlap } from './entities.js';
import { Renderer } from './renderer.js';
import { SaveSystem, createInitialState } from './save_system.js';

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

export class Game {
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
