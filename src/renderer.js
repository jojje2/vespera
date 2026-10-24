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

    // 8. Thorn-Glaive Blade & Sweeping Crescent Slash Trails
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

        // Directional Crescent Arc Sweep
        let startAngle = -0.9 * Math.PI;
        let endAngle = 0.35 * Math.PI;
        if (tr.dir === 'up') {
          startAngle = -1.25 * Math.PI;
          endAngle = -0.15 * Math.PI;
        } else if (tr.dir === 'down') {
          startAngle = 0.15 * Math.PI;
          endAngle = 1.15 * Math.PI;
        }

        // Outer Ethereal Glow Arc
        ctx.strokeStyle = bladeColor;
        ctx.globalAlpha = trailAlpha * 0.75;
        ctx.lineWidth = tr.isHeavy ? 10 : 7;
        ctx.beginPath();
        ctx.arc(0, 0, trailRadius, startAngle, endAngle);
        ctx.stroke();

        // Inner Sharp Blade Core
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = trailAlpha * 0.95;
        ctx.lineWidth = tr.isHeavy ? 4.5 : 3;
        ctx.beginPath();
        ctx.arc(0, 0, trailRadius, startAngle, endAngle);
        ctx.stroke();

        // Gleaming Thorn Spark at Blade Tip
        const tipX = Math.cos(endAngle) * trailRadius;
        const tipY = Math.sin(endAngle) * trailRadius;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = bladeColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
      }
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

    // Player Soul-Lantern light pool with organic double-sinus flicker
    const lanternScale = game.state.worldFlags.lanternUpgraded ? 1.45 : 1.0;
    const flicker = Math.sin(time * 8.5) * 6 + Math.cos(time * 14) * 3.5;
    punchLight(
      game.player.x + game.player.w / 2,
      game.player.y + game.player.h / 2,
      (270 + flicker) * lanternScale
    );

    // Brazier light
    if (room.brazier) {
      punchLight(room.brazier.x, room.brazier.y - 35, 240 + flicker * 0.8);
    }

    // Collectible items & Lumen Shards punch soft ambient glows
    if (room.items) {
      for (const it of room.items) {
        if (!game.isItemCollected(room.id, it)) {
          punchLight(it.x, it.y, 85);
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
          punchLight(p.x, p.y - 30, 185);
        }
      }
    }

    // Draw darkness & lighting mask onto main canvas
    ctx.drawImage(this.lightCanvas, 0, 0);

    // Cinematic Vignette Overlay around viewport corners
    ctx.save();
    const vGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.75);
    vGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vGrad.addColorStop(0.65, 'rgba(2, 4, 8, 0.32)');
    vGrad.addColorStop(1, 'rgba(1, 2, 5, 0.75)');
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
