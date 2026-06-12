// Synth sound effects + haptics for the arcade. No audio assets —
// everything is generated with WebAudio oscillators at runtime.

let ctx: AudioContext | null = null;
let muted: boolean | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isMuted(): boolean {
  if (muted === null) {
    try {
      muted = localStorage.getItem("st-sfx") === "off";
    } catch {
      muted = false;
    }
  }
  return muted;
}

export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem("st-sfx", v ? "off" : "on");
  } catch {
    // ignore
  }
}

type ToneOpts = {
  dur?: number;
  type?: OscillatorType;
  vol?: number;
  slide?: number; // Hz delta to glide toward over the duration
  delay?: number; // seconds
};

export function tone(
  freq: number,
  { dur = 0.08, type = "square", vol = 0.04, slide = 0, delay = 0 }: ToneOpts = {},
) {
  if (isMuted()) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, freq + slide),
      t0 + dur,
    );
  }
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Vibration — supported on Android Chrome; silently ignored elsewhere.
export function buzz(pattern: number | number[]) {
  if (isMuted()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignore
  }
}

// Game vocabulary
export const sfx = {
  launch: () => tone(180, { type: "sawtooth", dur: 0.18, slide: 420, vol: 0.05 }),
  paddle: () => {
    tone(196, { type: "square", dur: 0.06 });
    buzz(6);
  },
  wall: () => tone(140, { type: "square", dur: 0.05, vol: 0.025 }),
  brick: (combo: number) => {
    tone(300 + Math.min(combo, 12) * 45, { type: "triangle", dur: 0.09, vol: 0.05 });
    buzz(10);
  },
  lifeLost: () => {
    tone(240, { type: "sawtooth", dur: 0.4, slide: -170, vol: 0.06 });
    buzz([70, 50, 70]);
  },
  gameOver: () => {
    tone(220, { type: "sawtooth", dur: 0.3, slide: -120, vol: 0.06 });
    tone(110, { type: "sawtooth", dur: 0.5, slide: -60, vol: 0.06, delay: 0.25 });
    buzz([100, 60, 180]);
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(f, { type: "triangle", dur: 0.16, vol: 0.06, delay: i * 0.09 }),
    );
    buzz([30, 30, 30, 30, 30, 120]);
  },
};
