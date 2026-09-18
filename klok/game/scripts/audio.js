/**
 * AudioManager — centralised sound system for FAMOUSDA.
 *
 * Three independent volume channels (each 0–1):
 *   sfx    — jump, collect, hit, checkpoint, interact
 *   bgm    — in-game background music
 *   lobby  — main-menu / char-select music
 *
 * All audio is generated via Web Audio API so zero external files are
 * required.  Real .mp3 files can be swapped in by replacing the
 * _synth* methods with <audio> element sources.
 *
 * Usage:
 *   import { audio } from './audio.js';
 *   audio.play('jump');
 *   audio.setVolume('sfx', 0.5);
 *   audio.startBgm();
 *   audio.stopBgm();
 */

class AudioManager {
  constructor() {
    this._ctx     = null;   // AudioContext (created on first user gesture)
    this._ready   = false;

    // Volume settings (0–1), persisted in localStorage
    this._vol = {
      sfx:   this._load('sfx',   0.7),
      bgm:   this._load('bgm',   0.4),
      lobby: this._load('lobby', 0.35),
    };

    // Gain nodes (created when context initialises)
    this._gains = { sfx: null, bgm: null, lobby: null };

    // Currently playing looping sources
    this._bgmNode   = null;
    this._lobbyNode = null;

    // Oscillator/noise scheduler
    this._bgmTimer   = null;
    this._lobbyTimer = null;
  }

  // ── Persistence helpers ───────────────────────────────────────────────────
  _load(key, def) {
    const v = parseFloat(localStorage.getItem(`famousda_vol_${key}`));
    return isNaN(v) ? def : Math.max(0, Math.min(1, v));
  }
  _save(key, val) {
    localStorage.setItem(`famousda_vol_${key}`, val);
  }

  // ── Init (must be called after a user gesture) ────────────────────────────
  init() {
    if (this._ready) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      for (const ch of ['sfx', 'bgm', 'lobby']) {
        const g = this._ctx.createGain();
        g.gain.value = this._vol[ch];
        g.connect(this._ctx.destination);
        this._gains[ch] = g;
      }
      this._ready = true;
    } catch (e) {
      console.warn('AudioContext unavailable:', e);
    }
  }

  // ── Volume API ────────────────────────────────────────────────────────────
  getVolume(channel) { return this._vol[channel] ?? 0; }

  setVolume(channel, val) {
    val = Math.max(0, Math.min(1, val));
    this._vol[channel] = val;
    this._save(channel, val);
    if (this._gains[channel]) this._gains[channel].gain.setTargetAtTime(val, this._ctx.currentTime, 0.02);
  }

  // ── SFX ───────────────────────────────────────────────────────────────────
  play(name) {
    if (!this._ready) return;
    switch (name) {
      case 'jump':       this._tone(220, 'square', 0.08, 0.12, 'sfx'); break;
      case 'land':       this._noise(0.06, 0.08, 'sfx');                break;
      case 'collect':    this._chord([660, 880, 1100], 0.07, 0.22, 'sfx'); break;
      case 'heart':      this._chord([440, 660, 880, 1320], 0.08, 0.35, 'sfx'); break;
      case 'hit':        this._noise(0.18, 0.25, 'sfx', true);          break;
      case 'checkpoint': this._chord([330, 440, 660], 0.10, 0.4, 'sfx'); break;
      case 'interact':   this._tone(440, 'sine', 0.06, 0.1, 'sfx');     break;
      case 'gameover':   this._chord([220, 165, 110], 0.12, 0.8, 'sfx', true); break;
    }
  }

  // ── BGM (in-game) ─────────────────────────────────────────────────────────
  startBgm() {
    if (!this._ready || this._bgmNode) return;
    this._bgmNode = this._startLoop('bgm', this._bgmPattern.bind(this));
  }

  stopBgm() {
    if (this._bgmNode) { this._bgmNode.stop?.(); this._bgmNode = null; }
    if (this._bgmTimer) { clearTimeout(this._bgmTimer); this._bgmTimer = null; }
  }

  // ── Lobby music (menu / char select) ──────────────────────────────────────
  startLobby() {
    if (!this._ready || this._lobbyNode) return;
    this._lobbyNode = this._startLoop('lobby', this._lobbyPattern.bind(this));
  }

  stopLobby() {
    if (this._lobbyNode) { this._lobbyNode.stop?.(); this._lobbyNode = null; }
    if (this._lobbyTimer) { clearTimeout(this._lobbyTimer); this._lobbyTimer = null; }
  }

  stopAll() { this.stopBgm(); this.stopLobby(); }

  // ── Internal synth helpers ────────────────────────────────────────────────

  /** Single tone */
  _tone(freq, type, vol, dur, channel) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type      = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(vol, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(env);
    env.connect(this._gains[channel]);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.01);
  }

  /** Short noise burst */
  _noise(vol, dur, channel, lowpass = false) {
    const ctx    = this._ctx;
    const bufLen = ctx.sampleRate * dur;
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    const env  = ctx.createGain();
    env.gain.setValueAtTime(vol, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(env);
    if (lowpass) {
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 400;
      env.connect(filt); filt.connect(this._gains[channel]);
    } else {
      env.connect(this._gains[channel]);
    }
    src.start(); src.stop(ctx.currentTime + dur + 0.01);
  }

  /** Chord arpeggio */
  _chord(freqs, vol, dur, channel, descend = false) {
    const arr = descend ? [...freqs].reverse() : freqs;
    arr.forEach((f, i) => {
      const ctx = this._ctx;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const t0 = ctx.currentTime + i * 0.06;
      env.gain.setValueAtTime(0, t0);
      env.gain.linearRampToValueAtTime(vol, t0 + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(env); env.connect(this._gains[channel]);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
    });
  }

  /** Looping music via recursive setTimeout scheduling */
  _startLoop(channel, patternFn) {
    // Dummy node so stopBgm/stopLobby has something to check
    const dummy = { stop: () => {} };
    const run = () => {
      const delay = patternFn();   // returns ms until next call
      if (channel === 'bgm')
        this._bgmTimer   = setTimeout(run, delay);
      else
        this._lobbyTimer = setTimeout(run, delay);
    };
    run();
    return dummy;
  }

  // ── BGM pattern — gentle pentatonic loop ─────────────────────────────────
  _bgmPattern() {
    if (!this._ready) return 1600;
    const ctx = this._ctx;
    // C-major pentatonic: C4 D E G A  (midi 60 62 64 67 69)
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00,
                   523.25, 587.33, 659.25];
    const note  = scale[Math.floor(Math.random() * scale.length)];
    const osc   = ctx.createOscillator();
    const env   = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = note;
    env.gain.setValueAtTime(0.06, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.connect(env); env.connect(this._gains['bgm']);
    osc.start(); osc.stop(ctx.currentTime + 0.6);
    return 280 + Math.random() * 200;   // ms between notes
  }

  // ── Lobby pattern — cheerful major arpeggio ───────────────────────────────
  _lobbyPattern() {
    if (!this._ready) return 2000;
    const ctx = this._ctx;
    const arps = [
      [261.63, 329.63, 392.00, 523.25],   // C major
      [293.66, 369.99, 440.00, 587.33],   // D minor
      [329.63, 415.30, 493.88, 659.25],   // E minor
    ];
    const seq = arps[Math.floor(this._lobbyStep = ((this._lobbyStep || 0) + 1) % arps.length)];
    seq.forEach((f, i) => {
      const t0 = ctx.currentTime + i * 0.14;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      env.gain.setValueAtTime(0, t0);
      env.gain.linearRampToValueAtTime(0.07, t0 + 0.04);
      env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
      osc.connect(env); env.connect(this._gains['lobby']);
      osc.start(t0); osc.stop(t0 + 0.6);
    });
    return 700;
  }
}

export const audio = new AudioManager();
