// Player, Enemies, Bosses, Hazards, Projectiles, and Particle Systems

import { audio } from './audio.js';

export class Player {
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
        // Normal or Coyote Jump
        this.vy = -565;
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
        this.vy = -540;
        this.scaleY = 1.32;
        this.scaleX = 0.74;
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
          12,
          95
        );
      } else if (this.canDoubleJump && game.hasAbility('doubleJump')) {
        // Double Jump (Zephyr Plume)
        this.vy = -535;
        this.scaleY = 1.36;
        this.scaleX = 0.72;
        this.canDoubleJump = false;
        this.jumpBuffer = 0;
        audio.doubleJump();
        game.spawnParticles(this.x + this.w / 2, this.y + this.h, '#d27eff', 16, 120);
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
        // Wall bump squash
        this.scaleX = 0.84;
        this.scaleY = 1.16;
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
    const preVy = this.vy;
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

export class Enemy {
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

export class Boss {
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

export function rectOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}
