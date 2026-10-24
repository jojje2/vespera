// Web Audio API Procedural Soundtrack & Environmental Sound Engine

export class AudioEngine {
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

  interact() {
    this.playTone(520, 680, 0.12, 'sine', 0.22);
  }
}

export const audio = new AudioEngine();
