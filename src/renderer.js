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

    // High-DPI 2x Super-Sampled Resolution (2560x1440 QHD internal rendering)
    this.viewW = 1280;
    this.viewH = 720;
    this.dpiScale = 2;
    this.canvas.width = this.viewW * this.dpiScale;
    this.canvas.height = this.viewH * this.dpiScale;

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
