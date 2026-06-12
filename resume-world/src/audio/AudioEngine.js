// Fully synthesized WebAudio soundscape — no audio files.
// Rain hiss, thunder rumble, water lapping, underwater muffle, splash.
// The context unlocks on the first user gesture (browser autoplay policy).

// A-minor pentatonic across two octaves — everything sounds gentle together.
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99];
// Pad chord roots: Am(add9) -> Fmaj7 -> C -> G, as raw frequencies.
const CHORDS = [
  [110, 164.81, 246.94],
  [87.31, 220, 329.63],
  [130.81, 196, 329.63],
  [98, 246.94, 293.66],
];
const MOODS = {
  calm:  { rate: 1.0, octave: 1, lp: 700, density: 0.75 },
  storm: { rate: 1.8, octave: 0.5, lp: 320, density: 0.5 },
  deep:  { rate: 2.2, octave: 0.5, lp: 260, density: 0.45 },
  space: { rate: 1.3, octave: 2, lp: 1100, density: 0.6 },
  tour:  { rate: 0.7, octave: 1, lp: 800, density: 0.95 },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.pending = { rain: false, water: false, underwater: false };
    this.voices = {};
    this.mood = MOODS.calm;
    this.musicOn = false;
    this.chordIndex = 0;
  }

  unlock() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.7;
    this.master.connect(this.ctx.destination);

    // 2s loopable white noise buffer shared by all weather voices
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // apply any state requested before unlock
    if (this.pending.rain) this.rain(true);
    if (this.pending.water) this.water(true);
    if (this.pending.underwater) this.setUnderwater(true);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) {
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.7, this.ctx.currentTime + 0.15);
    }
    return this.muted;
  }

  makeNoiseLoop(filterType, freq, gain) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    src.connect(filter).connect(g).connect(this.master);
    src.start();
    g.gain.linearRampToValueAtTime(gain, this.ctx.currentTime + 1.2);
    return { src, filter, g };
  }

  stopVoice(name, fade = 0.8) {
    const v = this.voices[name];
    if (!v) return;
    v.g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fade);
    setTimeout(() => { try { v.src.stop(); } catch { /* already stopped */ } }, fade * 1000 + 100);
    delete this.voices[name];
  }

  rain(on) {
    this.pending.rain = on;
    if (!this.ctx) return;
    if (on && !this.voices.rain) {
      this.voices.rain = this.makeNoiseLoop('bandpass', 2400, 0.16);
      this.voices.rain.filter.Q.value = 0.4;
    } else if (!on) {
      this.stopVoice('rain');
    }
  }

  thunder(delaySec = 0.4) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delaySec;
    // noise rumble
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(420, t0);
    lp.frequency.exponentialRampToValueAtTime(70, t0 + 2.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.55, t0 + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 2.6);
    src.connect(lp).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + 2.8);
    // sub-bass body
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(52, t0);
    osc.frequency.exponentialRampToValueAtTime(30, t0 + 1.8);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0, t0);
    og.gain.linearRampToValueAtTime(0.3, t0 + 0.08);
    og.gain.exponentialRampToValueAtTime(0.001, t0 + 2.0);
    osc.connect(og).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 2.2);
  }

  splash() {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1800, t0);
    bp.frequency.exponentialRampToValueAtTime(380, t0 + 0.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + 0.7);
  }

  water(on) {
    this.pending.water = on;
    if (!this.ctx) return;
    if (on && !this.voices.water) {
      const v = this.makeNoiseLoop('lowpass', 650, 0.1);
      // slow lapping LFO on the gain
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.35;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.035;
      lfo.connect(lfoGain).connect(v.g.gain);
      lfo.start();
      v.lfo = lfo;
      this.voices.water = v;
    } else if (!on && this.voices.water) {
      try { this.voices.water.lfo.stop(); } catch { /* noop */ }
      this.stopVoice('water');
    }
  }

  setUnderwater(under) {
    this.pending.underwater = under;
    if (!this.ctx || !this.voices.water) return;
    const f = this.voices.water.filter.frequency;
    f.linearRampToValueAtTime(under ? 200 : 650, this.ctx.currentTime + 0.4);
  }

  // ---------------------------------------------------- generative music

  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.master);
    this.musicGain.gain.linearRampToValueAtTime(0.16, this.ctx.currentTime + 3);

    this.padFilter = this.ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = this.mood.lp;
    this.padFilter.connect(this.musicGain);

    // pluck echo
    this.delay = this.ctx.createDelay(1);
    this.delay.delayTime.value = 0.42;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.32;
    this.delay.connect(fb).connect(this.delay);
    this.delay.connect(this.musicGain);

    this.playChord();
    this.chordTimer = setInterval(() => this.playChord(), 9000);
    this.schedulePluck();
  }

  playChord() {
    if (!this.ctx || !this.musicOn) return;
    const freqs = CHORDS[this.chordIndex % CHORDS.length];
    this.chordIndex++;
    const t0 = this.ctx.currentTime;
    for (const f of freqs) {
      for (const [type, det, vol] of [['sine', 0, 0.05], ['triangle', 3, 0.025]]) {
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = f;
        osc.detune.value = det;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + 3);
        g.gain.setValueAtTime(vol, t0 + 6.5);
        g.gain.linearRampToValueAtTime(0, t0 + 10);
        osc.connect(g).connect(this.padFilter);
        osc.start(t0);
        osc.stop(t0 + 10.2);
      }
    }
    this.padFilter.frequency.linearRampToValueAtTime(this.mood.lp, t0 + 2);
  }

  schedulePluck() {
    if (!this.musicOn) return;
    const wait = (700 + Math.random() * 1600) * this.mood.rate;
    this.pluckTimer = setTimeout(() => {
      if (this.ctx && this.musicOn && !this.muted && Math.random() < this.mood.density) {
        const f = SCALE[Math.floor(Math.random() * SCALE.length)] * this.mood.octave;
        const t0 = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.06, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
        osc.connect(g);
        g.connect(this.musicGain);
        g.connect(this.delay);
        osc.start(t0);
        osc.stop(t0 + 1.5);
      }
      this.schedulePluck();
    }, wait);
  }

  setMood(name) {
    this.mood = MOODS[name] || MOODS.calm;
    if (this.ctx && this.musicOn) {
      this.padFilter.frequency.linearRampToValueAtTime(this.mood.lp, this.ctx.currentTime + 1.5);
    }
  }
}
