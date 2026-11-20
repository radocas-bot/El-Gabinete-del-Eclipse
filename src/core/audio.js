/* ==========================================================================
   src/core/audio.js — Procedural Victorian-Horological Soundtrack & Foley Engine
   ========================================================================== */
(function (SR) {
  'use strict';

  // D minor / D Dorian atmospheric progression (8 bars @ 68 BPM, 4 beats/bar)
  const TEMPO_BPM = 68;
  const BEAT_SEC = 60 / TEMPO_BPM; // ~0.8824s per beat

  // Frequency table (Hz)
  const N = {
    A1: 55.00, Bb1: 58.27, C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00,
    A2: 110.00, Bb2: 116.54, B2: 123.47, C3: 130.81, Cs3: 138.59, D3: 146.83,
    E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, Bb3: 233.08, B3: 246.94,
    C4: 261.63, Cs4: 277.18, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
    A4: 440.00, Bb4: 466.16, B4: 493.88, C5: 523.25, Cs5: 554.37, D5: 587.33,
    E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00
  };

  // 8-bar evolving progression (~28.2s per full harmonic cycle)
  const BARS = [
    // Bar 0: Dm9 — mysterious opening
    {
      pad: [N.D2, N.A2, N.D3, N.E3, N.F3, N.A3],
      arp: [
        [0.0, N.D4, 0.72], [0.5, N.A4, 0.58], [1.0, N.F4, 0.64], [1.5, N.E4, 0.50],
        [2.0, N.D4, 0.62], [2.5, N.A3, 0.48], [3.0, N.E4, 0.56]
      ],
      mel: [[0.0, N.A4, 1.5, 0.65], [2.0, N.F4, 1.0, 0.56], [3.0, N.E4, 1.0, 0.52]]
    },
    // Bar 1: Bbmaj7 — warm Victorian melancholy
    {
      pad: [N.Bb1, N.F2, N.Bb2, N.D3, N.F3, N.A3],
      arp: [
        [0.0, N.Bb3, 0.68], [0.5, N.F4, 0.56], [1.0, N.A4, 0.62], [1.5, N.D4, 0.48],
        [2.0, N.F4, 0.58], [3.0, N.A4, 0.54], [3.5, N.D5, 0.46]
      ],
      mel: [[0.0, N.D4, 1.8, 0.62], [2.0, N.F4, 0.9, 0.55], [3.0, N.A4, 1.0, 0.64]]
    },
    // Bar 2: Gm9 — deep celestial wonder
    {
      pad: [N.G2, N.Bb2, N.D3, N.F3, N.A3],
      arp: [
        [0.0, N.G3, 0.68], [0.5, N.D4, 0.55], [1.0, N.A4, 0.62], [1.5, N.Bb4, 0.52],
        [2.0, N.F4, 0.58], [2.5, N.D4, 0.46], [3.0, N.A4, 0.54]
      ],
      mel: [[0.0, N.Bb4, 1.4, 0.64], [1.5, N.A4, 0.5, 0.52], [2.0, N.G4, 1.8, 0.58]]
    },
    // Bar 3: Asus4 -> A7 — horological suspense & leading-tone pull
    {
      pad: [N.A1, N.A2, N.D3, N.E3, N.G3],
      pad2: [N.A1, N.A2, N.Cs3, N.E3, N.G3],
      arp: [
        [0.0, N.A3, 0.64], [0.5, N.E4, 0.54], [1.0, N.D4, 0.58], [2.0, N.Cs4, 0.62],
        [2.5, N.E4, 0.52], [3.0, N.G4, 0.56], [3.5, N.E4, 0.46]
      ],
      mel: [[0.0, N.A4, 1.6, 0.58], [2.0, N.G4, 1.0, 0.52], [3.0, N.E4, 1.0, 0.54]]
    },
    // Bar 4: Dm9 (Dorian color) — higher shimmer
    {
      pad: [N.D2, N.A2, N.D3, N.F3, N.C4],
      arp: [
        [0.0, N.D4, 0.68], [0.5, N.A4, 0.58], [1.0, N.C5, 0.62], [1.5, N.A4, 0.48],
        [2.0, N.F4, 0.58], [2.5, N.E4, 0.48], [3.0, N.D4, 0.54]
      ],
      mel: [[0.0, N.F4, 1.4, 0.62], [1.5, N.A4, 0.5, 0.55], [2.0, N.D5, 1.8, 0.66]]
    },
    // Bar 5: C6/9 (Dorian lift) — starlight glow
    {
      pad: [N.C2, N.G2, N.C3, N.D3, N.E3, N.A3],
      arp: [
        [0.0, N.C4, 0.66], [0.5, N.G4, 0.54], [1.0, N.A4, 0.60], [1.5, N.E4, 0.48],
        [2.0, N.D4, 0.56], [3.0, N.G4, 0.52], [3.5, N.A4, 0.46]
      ],
      mel: [[0.0, N.C5, 1.4, 0.62], [1.5, N.A4, 0.5, 0.52], [2.0, N.G4, 1.8, 0.56]]
    },
    // Bar 6: Gm7 -> Bb/F — introspective breath
    {
      pad: [N.G2, N.Bb2, N.D3, N.F3, N.G3],
      arp: [
        [0.0, N.G3, 0.64], [0.5, N.D4, 0.52], [1.0, N.F4, 0.58], [2.0, N.Bb4, 0.60],
        [2.5, N.F4, 0.48], [3.0, N.D4, 0.52]
      ],
      mel: [[0.0, N.A4, 1.0, 0.58], [1.0, N.Bb4, 1.0, 0.60], [2.0, N.F4, 1.8, 0.54]]
    },
    // Bar 7: Asus4 -> A7 soft cadence back to Dm9
    {
      pad: [N.A1, N.A2, N.D3, N.E3, N.A3],
      pad2: [N.A1, N.A2, N.Cs3, N.E3, N.G3],
      arp: [
        [0.0, N.E4, 0.58], [1.0, N.D4, 0.54], [2.0, N.Cs4, 0.56], [2.5, N.E4, 0.48],
        [3.0, N.A4, 0.52]
      ],
      mel: [[0.0, N.E4, 1.8, 0.56], [2.0, N.Cs4, 1.8, 0.52]]
    }
  ];

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.ambientGain = null;
      this.musicGain = null;
      this.musicDryBus = null;
      this.musicReverbSend = null;
      this.sfxGain = null;
      this.noiseBuffer = null;
      this.ambientStarted = false;
      this.volume = 0.75;
      this.muted = false;
      this.musicVolume = 0.36;
      this.musicMuted = false;
      this._tickTimer = null;
      this._tickPhase = false;

      // Music scheduler state
      this._musicTimer = null;
      this._nextBarTime = 0;
      this._barIndex = 0;
      this._cycleCount = 0;
      this._windNode = null;
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        return;
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.16;
      this.ambientGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicMuted ? 0 : this.musicVolume;
      this.musicGain.connect(this.masterGain);

      // Build warm stereo chamber delay/reverb bus for the soundtrack
      this._buildMusicBus();

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.85;
      this.sfxGain.connect(this.masterGain);

      // Reusable 2s white noise buffer for steam, wood scrape, wind & gentle felt attacks
      const sr = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, sr * 2, sr);
      const ch = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < ch.length; i++) {
        ch[i] = Math.random() * 2 - 1;
      }
    }

    _buildMusicBus() {
      const ctx = this.ctx;
      this.musicDryBus = ctx.createGain();
      this.musicDryBus.gain.value = 0.78;
      this.musicDryBus.connect(this.musicGain);

      this.musicReverbSend = ctx.createGain();
      this.musicReverbSend.gain.value = 0.44;

      // Dual golden-ratio cross-fed stereo delay with warm lowpass damping
      const delayL = ctx.createDelay(1.0);
      const delayR = ctx.createDelay(1.0);
      delayL.delayTime.value = 0.37;
      delayR.delayTime.value = 0.53;

      const dampL = ctx.createBiquadFilter();
      dampL.type = 'lowpass';
      dampL.frequency.value = 1750;
      const dampR = ctx.createBiquadFilter();
      dampR.type = 'lowpass';
      dampR.frequency.value = 1550;

      const fbL = ctx.createGain();
      const fbR = ctx.createGain();
      fbL.gain.value = 0.36;
      fbR.gain.value = 0.34;

      this.musicReverbSend.connect(delayL);
      this.musicReverbSend.connect(delayR);

      delayL.connect(dampL);
      delayR.connect(dampR);

      // Cross-feedback for lush stereo hall spread
      dampL.connect(fbL);
      fbL.connect(delayR);
      dampR.connect(fbR);
      fbR.connect(delayL);

      if (typeof ctx.createStereoPanner === 'function') {
        const panL = ctx.createStereoPanner();
        const panR = ctx.createStereoPanner();
        panL.pan.value = -0.58;
        panR.pan.value = 0.58;
        dampL.connect(panL);
        dampR.connect(panR);
        panL.connect(this.musicGain);
        panR.connect(this.musicGain);
      } else {
        dampL.connect(this.musicGain);
        dampR.connect(this.musicGain);
      }
    }

    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, v));
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
      }
    }

    setMuted(m) {
      this.muted = !!m;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
      }
    }

    setMusicVolume(v) {
      this.musicVolume = Math.max(0, Math.min(1, v));
      if (this.musicGain && this.ctx) {
        this.musicGain.gain.setTargetAtTime(this.musicMuted ? 0 : this.musicVolume, this.ctx.currentTime, 0.08);
      }
    }

    setMusicMuted(m) {
      this.musicMuted = !!m;
      if (this.musicGain && this.ctx) {
        this.musicGain.gain.setTargetAtTime(this.musicMuted ? 0 : this.musicVolume, this.ctx.currentTime, 0.08);
      }
    }

    // ---- Soundtrack Voice Generators ----

    _playPadChord(freqs, startTime, durationSec, level) {
      const ctx = this.ctx;
      if (!ctx || !this.musicDryBus) return;
      const chordBus = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, startTime);
      filter.frequency.linearRampToValueAtTime(580, startTime + durationSec * 0.45);
      filter.frequency.linearRampToValueAtTime(320, startTime + durationSec);
      filter.Q.value = 0.85;

      const att = Math.min(1.35, durationSec * 0.35);
      const rel = Math.min(1.8, durationSec * 0.45);
      const peak = (level || 0.14) / Math.sqrt(freqs.length);

      chordBus.gain.setValueAtTime(0.0005, startTime);
      chordBus.gain.linearRampToValueAtTime(peak, startTime + att);
      chordBus.gain.setValueAtTime(peak * 0.92, startTime + Math.max(att, durationSec - rel * 0.4));
      chordBus.gain.exponentialRampToValueAtTime(0.0005, startTime + durationSec + rel * 0.6);

      chordBus.connect(filter);
      filter.connect(this.musicDryBus);
      filter.connect(this.musicReverbSend);

      const stopTime = startTime + durationSec + rel * 0.65;
      for (let i = 0; i < freqs.length; i++) {
        const f = freqs[i];
        // Pair of gently detuned oscillators for lush warm chamber strings
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = i === 0 ? 'triangle' : 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(f * 0.9978, startTime);
        osc2.frequency.setValueAtTime(f * 1.0022, startTime);

        const voiceGain = ctx.createGain();
        voiceGain.gain.value = i === 0 ? 1.1 : 0.45;
        osc1.connect(voiceGain);
        osc2.connect(voiceGain);
        voiceGain.connect(chordBus);

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(stopTime);
        osc2.stop(stopTime);
      }
    }

    _playCelestaNote(freq, startTime, durationSec, velocity, panVal) {
      const ctx = this.ctx;
      if (!ctx || !this.musicDryBus) return;

      const env = ctx.createGain();
      const vel = (velocity || 0.6) * (0.88 + Math.random() * 0.22);
      const peak = 0.16 * vel;
      const decay = Math.max(1.2, durationSec * 1.45);

      env.gain.setValueAtTime(0.0004, startTime);
      env.gain.linearRampToValueAtTime(peak, startTime + 0.012);
      env.gain.exponentialRampToValueAtTime(peak * 0.34, startTime + 0.22);
      env.gain.exponentialRampToValueAtTime(0.0004, startTime + decay);

      // Fundamental sine + delicate celesta/music-box bell harmonic (3x & 2x soft)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);

      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2.0, startTime);
      g2.gain.setValueAtTime(0.18, startTime);
      g2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      const osc3 = ctx.createOscillator();
      const g3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(freq * 3.004, startTime);
      g3.gain.setValueAtTime(0.09, startTime);
      g3.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.24);

      osc1.connect(env);
      osc2.connect(g2);
      g2.connect(env);
      osc3.connect(g3);
      g3.connect(env);

      let outNode = env;
      if (typeof ctx.createStereoPanner === 'function' && panVal) {
        const pan = ctx.createStereoPanner();
        pan.pan.value = panVal;
        env.connect(pan);
        outNode = pan;
      }
      outNode.connect(this.musicDryBus);
      outNode.connect(this.musicReverbSend);

      const stopTime = startTime + decay + 0.05;
      osc1.start(startTime);
      osc2.start(startTime);
      osc3.start(startTime);
      osc1.stop(stopTime);
      osc2.stop(stopTime);
      osc3.stop(stopTime);
    }

    _playHarpPluck(freq, startTime, velocity, panVal) {
      const ctx = this.ctx;
      if (!ctx || !this.musicDryBus) return;

      const vel = (velocity || 0.55) * (0.9 + Math.random() * 0.18);
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(Math.min(2600, freq * 5.2), startTime);
      filt.frequency.exponentialRampToValueAtTime(Math.max(380, freq * 1.4), startTime + 1.35);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0004, startTime);
      env.gain.linearRampToValueAtTime(0.115 * vel, startTime + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0004, startTime + 1.9);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      osc.connect(filt);
      filt.connect(env);

      let outNode = env;
      if (typeof ctx.createStereoPanner === 'function' && panVal) {
        const pan = ctx.createStereoPanner();
        pan.pan.value = panVal;
        env.connect(pan);
        outNode = pan;
      }
      outNode.connect(this.musicDryBus);
      outNode.connect(this.musicReverbSend);

      osc.start(startTime);
      osc.stop(startTime + 1.95);
    }

    _scheduleBar(barIdx, barStartTime, cycleCount) {
      const bar = BARS[barIdx % BARS.length];
      const barDur = BEAT_SEC * 4;

      // 1. Evolving String Pad (splits gracefully on bars with pad2 cadence)
      if (bar.pad2) {
        this._playPadChord(bar.pad, barStartTime, BEAT_SEC * 2.05, 0.18);
        this._playPadChord(bar.pad2, barStartTime + BEAT_SEC * 2.0, BEAT_SEC * 2.05, 0.19);
      } else {
        this._playPadChord(bar.pad, barStartTime, barDur, 0.19);
      }

      // Every 3rd cycle, give the listener a serene breathing interlude (pad + sparse harp only)
      const isRestCycle = (cycleCount % 3 === 2);

      // 2. Spacious Harp / Celesta Arpeggio
      for (let i = 0; i < bar.arp.length; i++) {
        if (isRestCycle && i % 2 === 1) continue;
        const step = bar.arp[i];
        const t = barStartTime + step[0] * BEAT_SEC;
        const pan = (i % 2 === 0 ? -0.28 : 0.28);
        this._playHarpPluck(step[1], t, step[2] * (isRestCycle ? 0.72 : 0.92), pan);
      }

      // 3. Haunting Lyrical Celesta Melody Motif
      if (!isRestCycle) {
        const octaveShift = (cycleCount % 2 === 1 && (barIdx === 4 || barIdx === 5)) ? 1.0 : 1.0;
        for (let m = 0; m < bar.mel.length; m++) {
          const note = bar.mel[m];
          const t = barStartTime + note[0] * BEAT_SEC;
          const dur = note[2] * BEAT_SEC;
          const pan = -0.14 + (m % 3) * 0.14;
          this._playCelestaNote(note[1] * octaveShift, t, dur, note[3], pan);
        }
      }
    }

    _musicSchedulerTick() {
      if (!this.ctx || !this.ambientStarted) return;
      if (this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;
      const barDur = BEAT_SEC * 4;

      // Recover cleanly if tab was backgrounded without firing stacked bars
      if (this._nextBarTime < now - 0.5) {
        this._nextBarTime = now + 0.08;
      }

      const lookahead = 0.6;
      while (this._nextBarTime < now + lookahead) {
        this._scheduleBar(this._barIndex, this._nextBarTime, this._cycleCount);
        this._barIndex++;
        if (this._barIndex >= BARS.length) {
          this._barIndex = 0;
          this._cycleCount++;
        }
        this._nextBarTime += barDur;
      }
    }

    startAmbient() {
      this.init();
      if (!this.ctx || this.ambientStarted) return;
      this.ambientStarted = true;
      const now = this.ctx.currentTime;

      // Soft nocturnal wind outside the celestial dome skylight
      if (this.noiseBuffer) {
        const wind = this.ctx.createBufferSource();
        wind.buffer = this.noiseBuffer;
        wind.loop = true;
        const windFilter = this.ctx.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.frequency.value = 280;
        windFilter.Q.value = 3.4;
        const windGain = this.ctx.createGain();
        windGain.gain.value = 0.04;
        wind.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(this.ambientGain);
        wind.start(now);
        this._windNode = wind;
      }

      // Start the Victorian-Horological Mystery Soundtrack scheduler
      this._barIndex = 0;
      this._cycleCount = 0;
      this._nextBarTime = now + 0.12;
      this._musicSchedulerTick();
      this._musicTimer = setInterval(() => this._musicSchedulerTick(), 260);
    }

    stopAmbient() {
      this.ambientStarted = false;
      if (this._musicTimer) {
        clearInterval(this._musicTimer);
        this._musicTimer = null;
      }
      if (this._windNode) {
        try { this._windNode.stop(); } catch (e) {}
        this._windNode = null;
      }
    }

    startClockTick() {
      if (this._tickTimer) return;
      this._tickTimer = setInterval(() => {
        if (!this.ctx || this.ctx.state !== 'running' || this.muted) return;
        this._tickPhase = !this._tickPhase;
        this.playTick(this._tickPhase);
      }, 1000);
    }

    stopClockTick() {
      if (this._tickTimer) {
        clearInterval(this._tickTimer);
        this._tickTimer = null;
      }
    }

    playTick(high) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(high ? 1320 : 980, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.028);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.035);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.04);
    }

    playClick(pitch = 1.0) {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(720 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(220 * pitch, t + 0.05);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.065);
    }

    playGear(pitch = 1.0) {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const dt = i * 0.042;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        const f = (380 + i * 75) * pitch;
        osc.frequency.setValueAtTime(f, t + dt);
        osc.frequency.exponentialRampToValueAtTime(110, t + dt + 0.04);
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 1100;
        g.gain.setValueAtTime(0.11, t + dt);
        g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.045);
        osc.connect(filt);
        filt.connect(g);
        g.connect(this.sfxGain);
        osc.start(t + dt);
        osc.stop(t + dt + 0.05);
      }
    }

    playBookLatch(pitch = 1.0) {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.11);
      g.gain.setValueAtTime(0.24, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.13);
      setTimeout(() => this.playClick(1.25 * pitch), 65);
    }

    playError() {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [155, 118].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t + i * 0.1);
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 340;
        g.gain.setValueAtTime(0.14, t + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.16);
        osc.connect(filt);
        filt.connect(g);
        g.connect(this.sfxGain);
        osc.start(t + i * 0.1);
        osc.stop(t + i * 0.1 + 0.18);
      });
    }

    playDrawer() {
      this.init();
      if (!this.ctx || !this.noiseBuffer) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(340, t);
      filt.frequency.linearRampToValueAtTime(520, t + 0.35);
      filt.Q.value = 2.0;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.01, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
      src.connect(filt);
      filt.connect(g);
      g.connect(this.sfxGain);
      src.start(t);
      src.stop(t + 0.5);
    }

    playSteam() {
      this.init();
      if (!this.ctx || !this.noiseBuffer) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'highpass';
      filt.frequency.value = 1800;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.005, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      src.connect(filt);
      filt.connect(g);
      g.connect(this.sfxGain);
      src.start(t);
      src.stop(t + 0.38);
    }

    // Tuned metallic music-box reed (index 1..5 -> D4, F4, G4, A4, C5)
    playChime(noteIndex) {
      this.init();
      if (!this.ctx) return;
      const notes = [0, 293.66, 349.23, 392.00, 440.00, 523.25];
      const f = notes[noteIndex] || 440;
      const t = this.ctx.currentTime;

      [1, 2.756, 5.404].forEach((mult, idx) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f * mult;
        const amp = idx === 0 ? 0.24 : (idx === 1 ? 0.08 : 0.03);
        const dur = idx === 0 ? 1.4 : 0.45;
        g.gain.setValueAtTime(amp, t);
        g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      });
    }

    playCrystal(pitch = 1.0) {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [880, 1318.5, 1760].forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f * pitch;
        g.gain.setValueAtTime(0.12 / (idx + 1), t + idx * 0.025);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.85);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t + idx * 0.025);
        osc.stop(t + 0.9);
      });
    }

    playPickup() {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [523.25, 659.25].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.14, t + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.24);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t + i * 0.07);
        osc.stop(t + i * 0.07 + 0.26);
      });
    }

    playUV(on) {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(on ? 240 : 620, t);
      osc.frequency.exponentialRampToValueAtTime(on ? 680 : 210, t + 0.26);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.32);
    }

    playSolve() {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const chord = [293.66, 369.99, 440.0, 587.33, 739.99];
      chord.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.13, t + i * 0.085);
        g.gain.exponentialRampToValueAtTime(0.0008, t + i * 0.085 + 1.35);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t + i * 0.085);
        osc.stop(t + i * 0.085 + 1.4);
      });
    }

    playClockBell() {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const chimes = [587.33, 523.25, 440.0, 293.66];
      chimes.forEach((f, i) => {
        const start = t + i * 0.42;
        [1, 2.0, 3.01].forEach((m, k) => {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = f * m;
          g.gain.setValueAtTime(0.18 / (k + 1), start);
          g.gain.exponentialRampToValueAtTime(0.0008, start + 1.5);
          osc.connect(g);
          g.connect(this.sfxGain);
          osc.start(start);
          osc.stop(start + 1.55);
        });
      });
    }

    playVaultOpen() {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(52, t);
      osc.frequency.linearRampToValueAtTime(38, t + 2.4);
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 140;
      g.gain.setValueAtTime(0.01, t);
      g.gain.linearRampToValueAtTime(0.28, t + 0.35);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
      osc.connect(filt);
      filt.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 2.7);

      setTimeout(() => {
        if (!this.ctx) return;
        const chord = [293.66, 440.0, 587.33, 739.99, 880.0, 1174.66];
        const t2 = this.ctx.currentTime;
        chord.forEach((f, i) => {
          const o = this.ctx.createOscillator();
          const gg = this.ctx.createGain();
          o.type = 'triangle';
          o.frequency.value = f;
          gg.gain.setValueAtTime(0.001, t2 + i * 0.12);
          gg.gain.linearRampToValueAtTime(0.11, t2 + i * 0.12 + 0.25);
          gg.gain.exponentialRampToValueAtTime(0.0008, t2 + i * 0.12 + 3.2);
          o.connect(gg);
          gg.connect(this.sfxGain);
          o.start(t2 + i * 0.12);
          o.stop(t2 + i * 0.12 + 3.3);
        });
      }, 950);
    }
  }

  SR.Audio = new SoundEngine();
})(window.SR = window.SR || {});
