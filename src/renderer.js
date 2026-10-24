// Atmospheric Multi-Layer Renderer, Prop Artist, Dynamic Lighting, and World Atlas

import { BIOMES, ROOMS } from './world_data.js';

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

export class Renderer {
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
    this.critters = Array.from({ length: 18 }, (_, i) => ({
      x: (i * 137) % 1600,
      y: 120 + ((i * 293) % 720),
      phase: i * 0.9,
      speed: 14 + (i % 5) * 6
    }));
  }

  render(game, time) {
    const ctx = this.ctx;
    const room = game.currentRoom;
    if (!room) return;
    const biome = BIOMES[room.biome] || BIOMES.ruins;

    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.save();

    // 1. Deep Biome Sky/Cavern Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, biome.bgTop);
    bgGrad.addColorStop(1, biome.bgBot);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Camera transform
    const camX = Math.round(game.camX);
    const camY = Math.round(game.camY);

    // 2. Parallax Distant Silhouettes (Archways, Monoliths, Stalactites, Giant Roots)
    this.drawParallaxBackground(ctx, biome, camX, camY, W, H, time);

    ctx.translate(-camX, -camY);

    // 3. Tiny Background Critters
    this.drawBackgroundCritters(ctx, biome, time);

    // 4. Midground Props & Architecture
    this.drawRoomProps(ctx, room, biome, time, game);

    // 5. Water Pools & Caustic Mire
    if (room.waterPools) {
      for (const wp of room.waterPools) {
        const wGrad = ctx.createLinearGradient(0, wp.y, 0, wp.y + wp.h);
        wGrad.addColorStop(0, 'rgba(62, 185, 224, 0.55)');
        wGrad.addColorStop(1, 'rgba(14, 58, 92, 0.85)');
        ctx.fillStyle = wGrad;
        ctx.fillRect(wp.x, wp.y, wp.w, wp.h);
        ctx.strokeStyle = 'rgba(141, 246, 250, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let wx = wp.x; wx <= wp.x + wp.w; wx += 16) {
          const wy = wp.y + Math.sin(time * 3 + wx * 0.08) * 2.5;
          if (wx === wp.x) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      }
    }

    // 6. Platforms, Walls, Bridges, Secret Walls
    this.drawPlatforms(ctx, room, biome, game, time);

    // 7. Environmental Hazards (Spikes, Thorns, Crumbling, Falling Rocks, Poison Plants)
    this.drawHazards(ctx, room, game, time);

    // 8. Exit Doorway Indicators & Archways
    this.drawExits(ctx, room, biome, time);

    // 9. Lore Tablets, Forgotten Shrine, Soul Brazier, Collectibles, Liora's Cage
    this.drawInteractables(ctx, room, biome, game, time);

    // 10. NPCs
    this.drawNPCs(ctx, room, game, time);

    // 11. Enemies & Bosses
    this.drawEnemies(ctx, game, time);

    // 12. Player (Warden Kaelen) & Sword Arcs
    this.drawPlayer(ctx, game.player, game, time);

    // 13. Projectiles & Particles
    this.drawProjectilesAndParticles(ctx, game);

    ctx.restore();

    // 14. Localized Lighting & Shadow Overlay
    this.drawLightingOverlay(ctx, room, biome, game, camX, camY, time);
  }

  drawParallaxBackground(ctx, biome, camX, camY, W, H, time) {
    ctx.save();
    // Distant layer (0.25x parallax)
    const px1 = -(camX * 0.22) % 320;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    for (let x = px1 - 320; x < W + 320; x += 320) {
      // Gothic cavern ribs / giant pillars
      ctx.fillRect(x + 60, 0, 48, H);
      ctx.beginPath();
      ctx.arc(x + 220, 180, 130, Math.PI, 0, false);
      ctx.lineWidth = 26;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.stroke();
    }

    // Mid-distant stalactites & roots (0.45x parallax)
    const px2 = -(camX * 0.45) % 240;
    ctx.fillStyle = 'rgba(8, 12, 20, 0.45)';
    for (let x = px2 - 240; x < W + 240; x += 240) {
      ctx.beginPath();
      ctx.moveTo(x + 20, 0);
      ctx.lineTo(x + 65, 160 + Math.sin(x) * 40);
      ctx.lineTo(x + 110, 0);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBackgroundCritters(ctx, biome, time) {
    for (const c of this.critters) {
      const cx = (c.x + Math.sin(time * 0.7 + c.phase) * 45 + 1600) % 1600;
      const cy = c.y + Math.cos(time * 1.3 + c.phase) * 18;
      ctx.fillStyle = biome.accent;
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(time * 4 + c.phase);
      ctx.beginPath();
      ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
      ctx.fill();
      // Tiny wings
      const wing = Math.sin(time * 18 + c.phase) * 3;
      ctx.strokeStyle = biome.accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - wing);
      ctx.lineTo(cx + 3, cy + wing);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawRoomProps(ctx, room, biome, time, game) {
    if (!room.props) return;
    for (const p of room.props) {
      switch (p.type) {
        case 'pillar': {
          const h = p.h || 420;
          ctx.fillStyle = '#1b2030';
          ctx.fillRect(p.x - 22, p.y - h, 44, h);
          ctx.strokeStyle = biome.stoneTrim;
          ctx.lineWidth = 2;
          ctx.strokeRect(p.x - 22, p.y - h, 44, h);
          // Fluted lines & cracks
          ctx.beginPath();
          ctx.moveTo(p.x - 8, p.y - h + 15);
          ctx.lineTo(p.x - 8, p.y - 15);
          ctx.moveTo(p.x + 8, p.y - h + 15);
          ctx.lineTo(p.x + 8, p.y - 15);
          ctx.stroke();
          break;
        }
        case 'chain': {
          const h = p.h || 260;
          ctx.strokeStyle = '#596178';
          ctx.lineWidth = 3;
          const sway = Math.sin(time * 1.4 + p.x * 0.02) * 5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo(p.x + sway, p.y + h * 0.5, p.x + sway * 1.3, p.y + h);
          ctx.stroke();
          break;
        }
        case 'lantern': {
          const sway = Math.sin(time * 2.2 + p.x) * 4;
          ctx.strokeStyle = '#6f6554';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - 38);
          ctx.lineTo(p.x + sway, p.y);
          ctx.stroke();
          ctx.fillStyle = '#2b241d';
          ctx.fillRect(p.x + sway - 8, p.y, 16, 20);
          ctx.fillStyle = '#ffbe55';
          ctx.fillRect(p.x + sway - 5, p.y + 4, 10, 12);
          break;
        }
        case 'lantern_post': {
          ctx.fillStyle = '#2d3142';
          ctx.fillRect(p.x - 4, p.y - 115, 8, 115);
          ctx.fillRect(p.x - 16, p.y - 115, 32, 6);
          ctx.fillStyle = '#ffcb6b';
          ctx.beginPath();
          ctx.arc(p.x + 12, p.y - 102, 7, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'candles': {
          const offsets = [-10, 0, 9];
          offsets.forEach((ox, idx) => {
            const ch = 12 + (idx % 2) * 6;
            ctx.fillStyle = '#d9cfc1';
            ctx.fillRect(p.x + ox - 3, p.y - ch, 6, ch);
            const flicker = Math.sin(time * 12 + idx + p.x) * 1.5;
            ctx.fillStyle = '#ffae42';
            ctx.beginPath();
            ctx.arc(p.x + ox + flicker * 0.4, p.y - ch - 4, 3.5, 0, Math.PI * 2);
            ctx.fill();
          });
          break;
        }
        case 'statue': {
          ctx.fillStyle = '#383e54';
          ctx.fillRect(p.x - 24, p.y - 22, 48, 22);
          ctx.beginPath();
          ctx.moveTo(p.x - 16, p.y - 22);
          ctx.lineTo(p.x - 10, p.y - 95);
          ctx.lineTo(p.x + 10, p.y - 95);
          ctx.lineTo(p.x + 16, p.y - 22);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y - 108, 12, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'shrine': {
          ctx.fillStyle = '#322b40';
          ctx.fillRect(p.x - 36, p.y - 18, 72, 18);
          ctx.strokeStyle = '#d4b886';
          ctx.lineWidth = 2;
          ctx.strokeRect(p.x - 26, p.y - 96, 52, 78);
          ctx.fillStyle = biome.accent;
          ctx.beginPath();
          ctx.arc(p.x, p.y - 58, 12 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'hut': {
          // Cozy underground dwelling / laboratory
          ctx.fillStyle = '#23202b';
          ctx.fillRect(p.x - 85, p.y - 125, 170, 125);
          ctx.strokeStyle = '#6e5c49';
          ctx.lineWidth = 3;
          ctx.strokeRect(p.x - 85, p.y - 125, 170, 125);
          // Pitched roof
          ctx.fillStyle = '#382e29';
          ctx.beginPath();
          ctx.moveTo(p.x - 100, p.y - 125);
          ctx.lineTo(p.x, p.y - 185);
          ctx.lineTo(p.x + 100, p.y - 125);
          ctx.fill();
          // Glowing arched window
          ctx.fillStyle = 'rgba(255, 190, 95, 0.75)';
          ctx.beginPath();
          ctx.arc(p.x - 35, p.y - 68, 18, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'house': {
          ctx.fillStyle = '#222638';
          ctx.fillRect(p.x - 110, p.y - 210, 220, 210);
          ctx.strokeStyle = '#5d534a';
          ctx.lineWidth = 3;
          ctx.strokeRect(p.x - 110, p.y - 210, 220, 210);
          ctx.fillStyle = 'rgba(255, 192, 105, 0.65)';
          ctx.fillRect(p.x - 65, p.y - 165, 36, 44);
          ctx.fillRect(p.x + 25, p.y - 165, 36, 44);
          break;
        }
        case 'mushroom_giant': {
          ctx.fillStyle = '#2a4742';
          ctx.fillRect(p.x - 8, p.y - 85, 16, 85);
          ctx.fillStyle = '#4deba2';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y - 85, 44, 20, 0, Math.PI, 0, false);
          ctx.fill();
          break;
        }
        case 'vines': {
          const h = p.h || 240;
          ctx.strokeStyle = '#38754f';
          ctx.lineWidth = 3;
          for (let i = -1; i <= 1; i++) {
            const sway = Math.sin(time * 1.8 + p.x + i) * 8;
            ctx.beginPath();
            ctx.moveTo(p.x + i * 12, p.y);
            ctx.quadraticCurveTo(p.x + i * 12 + sway, p.y + h * 0.5, p.x + i * 12 - sway * 0.5, p.y + h);
            ctx.stroke();
          }
          break;
        }
        case 'glow_flowers': {
          for (let i = -2; i <= 2; i++) {
            const fx = p.x + i * 14;
            ctx.strokeStyle = '#2f6e49';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(fx, p.y);
            ctx.lineTo(fx, p.y - 18);
            ctx.stroke();
            ctx.fillStyle = '#7bf5b8';
            ctx.beginPath();
            ctx.arc(fx, p.y - 20, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'crystal_cluster': {
          const heights = [48, 72, 54];
          const angles = [-0.24, 0.04, 0.28];
          heights.forEach((ch, idx) => {
            ctx.save();
            ctx.translate(p.x + (idx - 1) * 14, p.y);
            ctx.rotate(angles[idx]);
            ctx.fillStyle = idx === 1 ? '#d27eff' : '#64d9f5';
            ctx.beginPath();
            ctx.moveTo(-9, 0);
            ctx.lineTo(0, -ch);
            ctx.lineTo(9, 0);
            ctx.fill();
            ctx.restore();
          });
          break;
        }
        case 'mysterious_light': {
          const bob = Math.sin(time * 3 + p.x) * 8;
          ctx.fillStyle = '#5ce1e6';
          ctx.beginPath();
          ctx.arc(p.x, p.y + bob, 7, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'bones': {
          ctx.fillStyle = '#9e9789';
          ctx.beginPath();
          ctx.arc(p.x, p.y - 7, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(p.x - 16, p.y - 4, 32, 4);
          break;
        }
        case 'broken_cart': {
          ctx.strokeStyle = '#6e563f';
          ctx.lineWidth = 3;
          ctx.strokeRect(p.x - 28, p.y - 28, 56, 20);
          ctx.beginPath();
          ctx.arc(p.x - 14, p.y - 10, 10, 0, Math.PI * 2);
          ctx.arc(p.x + 16, p.y - 10, 10, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
      }
    }
  }

  drawPlatforms(ctx, room, biome, game, time) {
    const solids = game.getSolidPlatforms();
    for (const p of solids) {
      ctx.fillStyle = p.isBridge ? '#574331' : biome.stoneMain;
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Top trim highlight
      ctx.fillStyle = p.slippery ? '#5ce1e6' : p.isBridge ? '#8f6f4f' : biome.stoneTrim;
      ctx.fillRect(p.x, p.y, p.w, Math.min(5, p.h));

      // Subtle stone brick lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }

    // Secret Destructible Walls
    if (room.secretWalls) {
      for (const sw of room.secretWalls) {
        if (game.state.brokenWalls[sw.id]) continue;
        ctx.fillStyle = biome.stoneMain;
        ctx.fillRect(sw.x, sw.y, sw.w, sw.h);
        // Visible fracture cracks & glowing seam hint
        ctx.strokeStyle = game.state.worldFlags.lanternUpgraded ? '#5ce1e6' : '#85966f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sw.x + 6, sw.y + 20);
        ctx.lineTo(sw.x + sw.w - 6, sw.y + 65);
        ctx.lineTo(sw.x + 10, sw.y + 120);
        ctx.lineTo(sw.x + sw.w - 4, sw.y + 180);
        ctx.stroke();
      }
    }

    // Three-Seal Gate in abyss_gate
    if (room.sealGate && !game.isSealGateOpen()) {
      const sg = room.sealGate;
      ctx.fillStyle = '#241436';
      ctx.fillRect(sg.x, sg.y, sg.w, sg.h);
      ctx.strokeStyle = '#e05368';
      ctx.lineWidth = 3;
      ctx.strokeRect(sg.x, sg.y, sg.w, sg.h);
      // 3 Seal emblems
      const seals = [
        !!game.state.inventory.seal_caverns,
        !!game.state.inventory.seal_crystals,
        !!game.state.inventory.seal_gardens
      ];
      seals.forEach((lit, idx) => {
        ctx.fillStyle = lit ? '#56d38a' : '#e05368';
        ctx.beginPath();
        ctx.arc(sg.x + sg.w / 2, sg.y + 50 + idx * 70, 9, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  drawHazards(ctx, room, game, time) {
    for (const h of game.activeHazards) {
      if (h.type === 'spikes') {
        ctx.fillStyle = '#9aa4ba';
        const spikeW = 14;
        for (let sx = h.x; sx < h.x + h.w; sx += spikeW) {
          ctx.beginPath();
          ctx.moveTo(sx, h.y + h.h);
          ctx.lineTo(sx + spikeW / 2, h.y);
          ctx.lineTo(sx + spikeW, h.y + h.h);
          ctx.fill();
        }
      } else if (h.type === 'thorns') {
        ctx.fillStyle = game.hasAbility('thornWard') ? '#3b6345' : '#85243b';
        for (let sx = h.x; sx < h.x + h.w; sx += 16) {
          ctx.beginPath();
          ctx.arc(sx + 8, h.y + 12, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (h.type === 'crumbling') {
        if (h.collapsed) continue;
        const shakeX = h.shaking ? (Math.random() - 0.5) * 6 : 0;
        ctx.fillStyle = '#5c4b3b';
        ctx.fillRect(h.x + shakeX, h.y, h.w, h.h);
        ctx.strokeStyle = '#d4b886';
        ctx.strokeRect(h.x + shakeX, h.y, h.w, h.h);
      } else if (h.type === 'falling_rock') {
        ctx.fillStyle = '#6c738a';
        ctx.beginPath();
        ctx.moveTo(h.x - 14, h.currentY);
        ctx.lineTo(h.x, h.currentY + 34);
        ctx.lineTo(h.x + 14, h.currentY);
        ctx.fill();
      } else if (h.type === 'poison_plant') {
        ctx.fillStyle = '#4e8c3a';
        ctx.beginPath();
        ctx.arc(h.x, h.y - 12, 14, 0, Math.PI * 2);
        ctx.fill();
        if (h.puffActive) {
          ctx.fillStyle = 'rgba(155, 240, 90, 0.35)';
          ctx.beginPath();
          ctx.arc(h.x, h.y - 22, 48, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawExits(ctx, room, biome, time) {
    if (!room.exits) return;
    const pulse = 0.45 + 0.25 * Math.sin(time * 3);
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
      ctx.fillStyle = '#453c33';
      ctx.fillRect(b.x - 18, b.y - 34, 36, 34);
      const isActive = game.state.checkpoint.roomId === room.id;
      ctx.fillStyle = isActive ? '#5ce1e6' : '#f3a847';
      ctx.beginPath();
      ctx.arc(b.x, b.y - 44 + Math.sin(time * 6) * 2, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lore Tablets
    if (room.loreTablets) {
      for (const lt of room.loreTablets) {
        ctx.fillStyle = '#404863';
        ctx.beginPath();
        ctx.arc(lt.x, lt.y - 38, 18, Math.PI, 0);
        ctx.lineTo(lt.x + 18, lt.y);
        ctx.lineTo(lt.x - 18, lt.y);
        ctx.fill();
        ctx.strokeStyle = '#8df6fa';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Items, Abilities, Upgrades
    if (room.items) {
      for (const it of room.items) {
        if (game.isItemCollected(room.id, it)) continue;
        const bob = Math.sin(time * 4 + it.x) * 5;
        ctx.save();
        ctx.translate(it.x, it.y + bob);
        if (it.type === 'ability') {
          ctx.fillStyle = '#d27eff';
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (it.type === 'mask_upgrade') {
          ctx.fillStyle = '#8df6fa';
          ctx.beginPath();
          ctx.arc(0, 0, 13, 0, Math.PI * 2);
          ctx.fill();
        } else if (it.type === 'lumen') {
          ctx.fillStyle = '#f3a847';
          ctx.beginPath();
          ctx.moveTo(0, -11);
          ctx.lineTo(9, 0);
          ctx.lineTo(0, 11);
          ctx.lineTo(-9, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = '#5ce1e6';
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
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
      // Draw Liora inside the cage
      ctx.fillStyle = '#8df6fa';
      ctx.fillRect(c.x - 10, c.y - 44, 20, 44);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(c.x, c.y - 52, 9, 0, Math.PI * 2);
      ctx.fill();

      // Translucent Echo-Glass Cage bars
      ctx.fillStyle = 'rgba(141, 246, 250, 0.25)';
      ctx.fillRect(c.x - 36, c.y - 96, 72, 96);
      ctx.strokeStyle = '#8df6fa';
      ctx.lineWidth = 3;
      ctx.strokeRect(c.x - 36, c.y - 96, 72, 96);
    }
  }

  drawNPCs(ctx, room, game, time) {
    if (!room.npcs) return;
    for (const n of room.npcs) {
      if (n.requiresCageBroken && !game.state.worldFlags.cageShattered) continue;
      const bob = Math.sin(time * 2.5 + n.x) * 2;
      // Cloak body
      ctx.fillStyle = '#384666';
      ctx.beginPath();
      ctx.moveTo(n.x - 16, n.y);
      ctx.lineTo(n.x - 10, n.y - 44 + bob);
      ctx.lineTo(n.x + 10, n.y - 44 + bob);
      ctx.lineTo(n.x + 16, n.y);
      ctx.fill();
      // Head / Mask
      ctx.fillStyle = '#e8e3d9';
      ctx.beginPath();
      ctx.arc(n.x, n.y - 52 + bob, 10, 0, Math.PI * 2);
      ctx.fill();
      // Floating indicator above NPC
      ctx.fillStyle = '#f3a847';
      ctx.font = 'bold 13px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('❖', n.x, n.y - 72 + bob);
    }
  }

  drawEnemies(ctx, game, time) {
    for (const e of game.enemies) {
      if (e.dead) continue;
      ctx.save();
      ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#c9495d';
      if (e.type === 'sporeling') ctx.fillStyle = e.hurtFlash > 0 ? '#fff' : '#4ec982';
      if (e.type === 'crystal_golem' || e.type === 'wisp') ctx.fillStyle = e.hurtFlash > 0 ? '#fff' : '#b86df2';
      if (e.type === 'lurker') ctx.fillStyle = e.hurtFlash > 0 ? '#fff' : '#4aa8c9';

      ctx.beginPath();
      ctx.roundRect(e.x, e.y, e.w, e.h, 6);
      ctx.fill();

      // Glowing eyes
      ctx.fillStyle = '#ffe985';
      const eyeX = e.facing > 0 ? e.x + e.w - 10 : e.x + 6;
      ctx.beginPath();
      ctx.arc(eyeX, e.y + 10, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (game.activeBoss && !game.activeBoss.dead) {
      const b = game.activeBoss;
      ctx.save();
      ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : b.type === 'boss_stalker' ? '#3bbf78' : b.type === 'boss_prism' ? '#a855f7' : '#d9385a';
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 12);
      ctx.fill();
      ctx.strokeStyle = '#f5d799';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Boss crown / horns
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2 + b.facing * 12, b.y + 22, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawPlayer(ctx, p, game, time) {
    ctx.save();
    if (p.invulnTimer > 0 && Math.floor(time * 20) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Flowing Cloak Trail
    ctx.fillStyle = game.hasAbility('thornWard') ? '#562b7a' : '#263859';
    ctx.beginPath();
    ctx.moveTo(p.x + p.w / 2, p.y + 12);
    for (let i = 0; i < p.capeHistory.length; i++) {
      const pt = p.capeHistory[i];
      ctx.lineTo(pt.x - p.facing * (i * 2.4), pt.y + i * 3.2);
    }
    ctx.lineTo(p.x + p.w / 2, p.y + p.h - 4);
    ctx.fill();

    // Body Cloak
    ctx.fillStyle = '#1b263d';
    ctx.beginPath();
    ctx.roundRect(p.x + 3, p.y + 14, p.w - 6, p.h - 14, 5);
    ctx.fill();

    // Soul-Lantern at Kaelen's hip
    ctx.fillStyle = '#5ce1e6';
    ctx.beginPath();
    ctx.arc(p.x + (p.facing > 0 ? 6 : p.w - 6), p.y + 30, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Expressive Pale Mask & Horns
    ctx.fillStyle = '#f2eee6';
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + 10, 11, 0, Math.PI * 2);
    ctx.fill();

    // Curved Warden Horns
    ctx.strokeStyle = '#f2eee6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x + 8, p.y + 4);
    ctx.lineTo(p.x + 4, p.y - 7);
    ctx.moveTo(p.x + p.w - 8, p.y + 4);
    ctx.lineTo(p.x + p.w - 4, p.y - 7);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#0a0d17';
    const eyeOffset = p.facing * 3;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2 + eyeOffset - 3, p.y + 10, 2.2, 0, Math.PI * 2);
    ctx.arc(p.x + p.w / 2 + eyeOffset + 3, p.y + 10, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Sword Slash / Resonance Strike Arc
    const atk = p.getAttackBox();
    if (atk) {
      ctx.strokeStyle = atk.isHeavy ? '#d27eff' : game.state.worldFlags.bladeTempered ? '#ffbe55' : '#8df6fa';
      ctx.lineWidth = atk.isHeavy ? 8 : 5;
      ctx.beginPath();
      ctx.arc(
        atk.x + atk.w / 2,
        atk.y + atk.h / 2,
        Math.max(atk.w, atk.h) * 0.45,
        0,
        Math.PI * 1.4
      );
      ctx.stroke();
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
      const g = lctx.createRadialGradient(sx, sy, radius * 0.12, sx, sy, radius);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.65, 'rgba(0,0,0,0.55)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g;
      lctx.beginPath();
      lctx.arc(sx, sy, radius, 0, Math.PI * 2);
      lctx.fill();
    };

    // Player Soul-Lantern light pool
    const lanternScale = game.state.worldFlags.lanternUpgraded ? 1.4 : 1.0;
    const flicker = Math.sin(time * 9) * 6;
    punchLight(
      game.player.x + game.player.w / 2,
      game.player.y + game.player.h / 2,
      (250 + flicker) * lanternScale
    );

    // Brazier light
    if (room.brazier) {
      punchLight(room.brazier.x, room.brazier.y - 35, 220 + flicker);
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
          punchLight(p.x, p.y - 30, 175);
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

    // Draw connection lines first
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

    // Draw room nodes
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
