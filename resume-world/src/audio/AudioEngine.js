// Fully synthesized WebAudio soundscape — no audio files.
// Rain hiss, thunder rumble, water lapping, underwater muffle, splash.
// The context unlocks on the first user gesture (browser autoplay policy).

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.pending = { rain: false, water: false, underwater: false };
    this.voices = {};
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
}
