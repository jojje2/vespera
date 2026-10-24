// High-Resolution Atmospheric Renderer, Dreamlike Lighting, Prop Artist, and World Atlas

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

      // Base stone fill
      ctx.fillStyle = p.isBridge ? '#3d2b1f' : biome.stoneMain;
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Beveled depth gradient along the face
      const faceGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      faceGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      faceGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.15)');
      faceGrad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
      ctx.fillStyle = faceGrad;
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Top trim (Lush moss for caverns/gardens, crystal rim for crystals, ash molding for ruins)
      ctx.fillStyle = p.slippery ? '#5ce1e6' : p.isBridge ? '#8f6f4f' : biome.stoneTrim;
      ctx.fillRect(p.x, p.y, p.w, Math.min(6, p.h));

      // Organic hanging moss tendrils / ivy fringes
      if ((biome.id === 'caverns' || biome.id === 'gardens') && !p.oneWay) {
        ctx.fillStyle = biome.accent;
        ctx.globalAlpha = 0.65;
        for (let tx = p.x + 6; tx < p.x + p.w - 6; tx += 16) {
          const vineLen = 6 + Math.sin(tx * 0.35) * 5;
          ctx.beginPath();
          ctx.arc(tx, p.y + Math.min(6, p.h), 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(tx - 1, p.y + Math.min(6, p.h), 2, vineLen);
        }
        ctx.globalAlpha = 1;
      }

      // Crystal facet edge glints for Crystal Depths
      if (biome.id === 'crystals') {
        ctx.strokeStyle = 'rgba(210, 126, 255, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.w, p.y);
        ctx.stroke();
      }

      // Stone border line
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
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

      switch (e.type) {
        case 'crawler': {
          // Moss-Scuttler: mossy shell, scurrying legs, back mushroom
          ctx.fillStyle = flash ? '#ffffff' : '#2b4d34';
          ctx.beginPath();
          ctx.ellipse(e.x + e.w / 2, e.y + 14, e.w / 2, 10, 0, 0, Math.PI * 2);
          ctx.fill();

          // Scurrying legs
          ctx.strokeStyle = '#1e3323';
          ctx.lineWidth = 2.5;
          for (let i = -1; i <= 1; i += 2) {
            const legWiggle = Math.sin(time * 16 + i) * 4;
            ctx.beginPath();
            ctx.moveTo(e.x + e.w / 2 + i * 10, e.y + 16);
            ctx.lineTo(e.x + e.w / 2 + i * 18, e.y + 24 + legWiggle);
            ctx.stroke();
          }

          // Little glowing back-mushroom
          ctx.fillStyle = '#56d38a';
          ctx.beginPath();
          ctx.arc(e.x + e.w / 2 - 4, e.y + 2, 4.5, 0, Math.PI * 2);
          ctx.fill();

          // Glowing amber eye
          ctx.fillStyle = '#ffe259';
          ctx.beginPath();
          ctx.arc(e.facing > 0 ? e.x + e.w - 5 : e.x + 5, e.y + 12, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'sporeling': {
          // Puffball Sporeling: bouncy round fungal cap
          const bounce = Math.abs(Math.sin(time * 6)) * 4;
          ctx.fillStyle = flash ? '#ffffff' : '#398758';
          ctx.beginPath();
          ctx.arc(e.x + e.w / 2, e.y + e.h / 2 - bounce, 14, 0, Math.PI * 2);
          ctx.fill();

          // Spore dots
          ctx.fillStyle = '#8df6fa';
          ctx.beginPath();
          ctx.arc(e.x + e.w / 2 - 5, e.y + e.h / 2 - 4 - bounce, 2.5, 0, Math.PI * 2);
          ctx.arc(e.x + e.w / 2 + 5, e.y + e.h / 2 - 5 - bounce, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Spore top chimney
          ctx.fillStyle = '#285e3e';
          ctx.fillRect(e.x + e.w / 2 - 3, e.y + e.h / 2 - 17 - bounce, 6, 5);
          break;
        }

        case 'bat': {
          // Gloam-Moth / Leaf-Flitter: leaf wings that flap
          const flap = Math.sin(time * 16) * 12;
          ctx.fillStyle = flash ? '#ffffff' : '#1e3328';
          ctx.beginPath();
          ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, 6, 10, 0, 0, Math.PI * 2);
          ctx.fill();

          // Leaf wings
          ctx.fillStyle = flash ? '#ffffff' : '#387349';
          ctx.beginPath();
          ctx.moveTo(e.x + e.w / 2, e.y + e.h / 2);
          ctx.lineTo(e.x - 14, e.y + e.h / 2 + flap);
          ctx.lineTo(e.x + e.w / 2, e.y + e.h / 2 - 6);
          ctx.moveTo(e.x + e.w / 2, e.y + e.h / 2);
          ctx.lineTo(e.x + e.w + 14, e.y + e.h / 2 + flap);
          ctx.lineTo(e.x + e.w / 2, e.y + e.h / 2 - 6);
          ctx.fill();

          // Glowing eyes
          ctx.fillStyle = '#5ce1e6';
          ctx.beginPath();
          ctx.arc(e.x + e.w / 2 - 2, e.y + e.h / 2 - 5, 2, 0, Math.PI * 2);
          ctx.arc(e.x + e.w / 2 + 2, e.y + e.h / 2 - 5, 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'sentinel': {
          // Bramble-Bark Sentry: wooden golem with branch shoulders
          ctx.fillStyle = flash ? '#ffffff' : '#3b2b1d';
          ctx.fillRect(e.x + 6, e.y + 12, e.w - 12, e.h - 12);

          // Head block
          ctx.fillStyle = flash ? '#ffffff' : '#543d28';
          ctx.fillRect(e.x + 8, e.y, e.w - 16, 14);

          // Shoulder leaf branches
          ctx.strokeStyle = '#2f663c';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(e.x + 6, e.y + 12);
          ctx.lineTo(e.x - 6, e.y + 2);
          ctx.moveTo(e.x + e.w - 6, e.y + 12);
          ctx.lineTo(e.x + e.w + 6, e.y + 2);
          ctx.stroke();

          // Glowing green eye slit
          ctx.fillStyle = '#56d38a';
          ctx.fillRect(e.facing > 0 ? e.x + e.w - 12 : e.x + 6, e.y + 5, 7, 3);
          break;
        }

        case 'thumper': {
          // Root-Horned Brute: massive wooden ram horns
          ctx.fillStyle = flash ? '#ffffff' : '#2d2217';
          ctx.fillRect(e.x + 4, e.y + 14, e.w - 8, e.h - 14);

          // Massive curved wooden horns
          ctx.strokeStyle = '#8a5c37';
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.arc(e.x + e.w / 2 - 10, e.y + 8, 12, Math.PI, Math.PI * 1.8);
          ctx.arc(e.x + e.w / 2 + 10, e.y + 8, 12, Math.PI * 1.2, 0);
          ctx.stroke();

          // Glowing crimson/amber eye
          ctx.fillStyle = '#f3a847';
          ctx.beginPath();
          ctx.arc(e.facing > 0 ? e.x + e.w - 8 : e.x + 8, e.y + 18, 4, 0, Math.PI * 2);
          ctx.fill();
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
          // Forest Will-o'-Wisp: floating cyan spirit orb
          const bob = Math.sin(time * 5 + e.x) * 4;
          const wGrad = ctx.createRadialGradient(e.x + e.w / 2, e.y + e.h / 2 + bob, 1, e.x + e.w / 2, e.y + e.h / 2 + bob, 14);
          wGrad.addColorStop(0, '#ffffff');
          wGrad.addColorStop(0.5, '#5ce1e6');
          wGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = wGrad;
          ctx.beginPath();
          ctx.arc(e.x + e.w / 2, e.y + e.h / 2 + bob, 14, 0, Math.PI * 2);
          ctx.fill();
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

    // 1. Layered Woven Moss & Bark Mantle (fluttering cape history)
    ctx.fillStyle = game.hasAbility('thornWard') ? '#2e1840' : '#193824';
    ctx.beginPath();
    ctx.moveTo(p.x + p.w / 2, p.y + 12);
    for (let i = 0; i < p.capeHistory.length; i++) {
      const pt = p.capeHistory[i];
      ctx.lineTo(pt.x - p.facing * (i * 3.0), pt.y + i * 3.4);
    }
    ctx.lineTo(p.x + p.w / 2, p.y + p.h - 4);
    ctx.fill();

    // Cape inner silver-birch bark trim
    ctx.fillStyle = '#32573e';
    ctx.beginPath();
    ctx.moveTo(p.x + p.w / 2, p.y + 16);
    if (p.capeHistory.length > 3) {
      const mid = p.capeHistory[Math.floor(p.capeHistory.length / 2)];
      ctx.lineTo(mid.x - p.facing * 6, mid.y);
    }
    ctx.lineTo(p.x + p.w / 2, p.y + p.h - 8);
    ctx.fill();

    // 2. Shadow-Spirit Body
    ctx.fillStyle = '#0a0f12';
    ctx.beginPath();
    ctx.roundRect(p.x + 4, p.y + 14, p.w - 8, p.h - 14, 6);
    ctx.fill();

    // 3. Wicker Will-o'-Wisp Lantern (at hip)
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

    // 4. Shadow Spirit Head
    ctx.fillStyle = '#0a0f12';
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();

    // 5. Branching Wooden Antlers (Trähorn) with delicate leaf buds
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

    // 6. Luminous Azure Spirit Eyes
    const eyeOffset = p.facing * 3.0;
    // Eye glow aura
    ctx.fillStyle = 'rgba(92, 225, 230, 0.45)';
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2 + eyeOffset - 3, p.y + 10, 4, 0, Math.PI * 2);
    ctx.arc(p.x + p.w / 2 + eyeOffset + 3, p.y + 10, 4, 0, Math.PI * 2);
    ctx.fill();
    // Pure glowing eye cores
    ctx.fillStyle = '#5ce1e6';
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2 + eyeOffset - 3, p.y + 10, 2.2, 0, Math.PI * 2);
    ctx.arc(p.x + p.w / 2 + eyeOffset + 3, p.y + 10, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 7. Thorn-Dagger Blade & Emerald Slash Arc
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
