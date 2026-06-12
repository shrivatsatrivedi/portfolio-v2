// Self-contained canvas confetti — creates its own layer, runs, cleans up.

const COLORS_BASE = ["#ffffff", "#a5b4fc", "#e879f9", "#fb7185"];

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
  drag: number;
};

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

export function confettiBurst() {
  if (typeof document === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;z-index:10010;pointer-events:none;";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const w = (canvas.width = window.innerWidth);
  const h = (canvas.height = window.innerHeight);

  const accent =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim() || "#6366f1";
  const colors = [accent, ...COLORS_BASE];

  // two cannons firing inward from the bottom corners
  const pieces: Piece[] = [];
  for (let i = 0; i < 160; i++) {
    const fromLeft = i % 2 === 0;
    pieces.push({
      x: fromLeft ? -10 : w + 10,
      y: h * rand(0.55, 0.95),
      vx: (fromLeft ? 1 : -1) * rand(4, 13),
      vy: rand(-16, -7),
      w: rand(5, 10),
      h: rand(8, 16),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.25, 0.25),
      color: colors[Math.floor(rand(0, colors.length))],
      drag: rand(0.96, 0.99),
    });
  }

  const start = performance.now();
  const DURATION = 2800;

  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, w, h);
    const fade = t > DURATION - 600 ? Math.max(0, (DURATION - t) / 600) : 1;

    for (const p of pieces) {
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + 0.35; // gravity
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (t < DURATION) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  };

  requestAnimationFrame(frame);
}
