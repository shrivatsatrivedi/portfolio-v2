"use client";

import { useEffect, useRef, useState } from "react";
import { on } from "@/lib/bus";
import { rand } from "@/lib/animations";

type Phase = "ready" | "playing" | "over";

type Asteroid = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  sides: number;
};

type Debris = { x: number; y: number; vx: number; vy: number; life: number };

const BEST_KEY = "st-orbit-best";

export default function GameModal() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>("ready");
  const resetRef = useRef(false);

  const setPhaseSync = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useEffect(() => {
    return on("game:open", () => {
      setBest(Number(localStorage.getItem(BEST_KEY)) || 0);
      setScore(0);
      setPhaseSync("ready");
      setOpen(true);
    });
  }, []);

  // lock page scroll + esc to close
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(
          e.key,
        )
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // game engine
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = frame.clientWidth;
    const h = frame.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const accent =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim() || "#6366f1";
    const accentLight =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent-light")
        .trim() || "#818cf8";

    const ship = { x: w * 0.2, y: h / 2, r: 11 };
    const target = { x: w * 0.2, y: h / 2 };
    const stars = Array.from({ length: 60 }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(0.4, 1.6),
      v: rand(20, 90),
    }));
    let asteroids: Asteroid[] = [];
    let debris: Debris[] = [];
    let elapsed = 0;
    let spawnIn = 0.8;
    let raf = 0;
    let last = performance.now();

    const toLocal = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      target.x = Math.min(Math.max(clientX - rect.left, ship.r), w - ship.r);
      target.y = Math.min(Math.max(clientY - rect.top, ship.r), h - ship.r);
    };
    const onMouse = (e: MouseEvent) => toLocal(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) toLocal(t.clientX, t.clientY);
    };
    canvas.addEventListener("mousemove", onMouse);
    canvas.addEventListener("touchmove", onTouch, { passive: false });
    canvas.addEventListener("touchstart", onTouch, { passive: false });

    const explode = (x: number, y: number) => {
      for (let i = 0; i < 26; i++) {
        const a = rand(0, Math.PI * 2);
        const s = rand(40, 260);
        debris.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 1,
        });
      }
    };

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (resetRef.current) {
        resetRef.current = false;
        elapsed = 0;
        spawnIn = 0.8;
        asteroids = [];
        debris = [];
        ship.x = target.x = w * 0.2;
        ship.y = target.y = h / 2;
      }

      ctx.clearRect(0, 0, w, h);

      // drifting starfield
      ctx.fillStyle = "#64748b";
      for (const s of stars) {
        s.x -= s.v * dt;
        if (s.x < 0) {
          s.x = w;
          s.y = rand(0, h);
        }
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (phaseRef.current === "playing") {
        elapsed += dt;
        setScore(Math.floor(elapsed * 10));

        // difficulty ramp
        spawnIn -= dt;
        if (spawnIn <= 0) {
          spawnIn = Math.max(0.22, 0.85 - elapsed * 0.02);
          asteroids.push({
            x: w + 30,
            y: rand(20, h - 20),
            r: rand(9, 24),
            vx: -rand(120, 200) - elapsed * 6,
            vy: rand(-30, 30),
            rot: rand(0, Math.PI * 2),
            vr: rand(-2, 2),
            sides: Math.floor(rand(5, 9)),
          });
        }

        // ship follows pointer with easing
        ship.x += (target.x - ship.x) * Math.min(1, dt * 10);
        ship.y += (target.y - ship.y) * Math.min(1, dt * 10);

        for (const a of asteroids) {
          a.x += a.vx * dt;
          a.y += a.vy * dt;
          a.rot += a.vr * dt;
          if (a.y < a.r || a.y > h - a.r) a.vy *= -1;

          const d = Math.hypot(a.x - ship.x, a.y - ship.y);
          if (d < a.r + ship.r * 0.75) {
            explode(ship.x, ship.y);
            setPhaseSync("over");
            const finalScore = Math.floor(elapsed * 10);
            setBest((prev) => {
              const nb = Math.max(prev, finalScore);
              localStorage.setItem(BEST_KEY, String(nb));
              return nb;
            });
          }
        }
        asteroids = asteroids.filter((a) => a.x > -40);
      }

      // asteroids
      for (const a of asteroids) {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rot);
        ctx.strokeStyle = "#94a3b8";
        ctx.fillStyle = "rgba(148, 163, 184, 0.12)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < a.sides; i++) {
          const ang = (i / a.sides) * Math.PI * 2;
          const rr = a.r * (0.82 + 0.18 * Math.sin(i * 7 + a.sides));
          const px = Math.cos(ang) * rr;
          const py = Math.sin(ang) * rr;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // ship
      if (phaseRef.current !== "over") {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.shadowColor = accent;
        ctx.shadowBlur = 18;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(ship.r + 4, 0);
        ctx.lineTo(-ship.r, -ship.r * 0.8);
        ctx.lineTo(-ship.r * 0.5, 0);
        ctx.lineTo(-ship.r, ship.r * 0.8);
        ctx.closePath();
        ctx.fill();
        // engine flare
        ctx.fillStyle = accentLight;
        ctx.globalAlpha = rand(0.4, 0.9);
        ctx.beginPath();
        ctx.moveTo(-ship.r * 0.7, -3);
        ctx.lineTo(-ship.r - rand(6, 14), 0);
        ctx.lineTo(-ship.r * 0.7, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // explosion debris
      for (const d of debris) {
        d.life -= dt * 1.4;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.life > 0) {
          ctx.globalAlpha = d.life;
          ctx.fillStyle = accentLight;
          ctx.fillRect(d.x - 2, d.y - 2, 4, 4);
        }
      }
      debris = debris.filter((d) => d.life > 0);
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("touchmove", onTouch);
      canvas.removeEventListener("touchstart", onTouch);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10006] flex items-center justify-center px-4"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass relative w-full max-w-2xl rounded-2xl p-5 shadow-[0_0_60px_var(--glow-soft)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold tracking-[-0.02em]">
            ORBIT <span className="text-accent-light">DODGER</span>
          </h3>
          <div className="flex items-center gap-5 text-sm">
            <span className="text-muted">
              Score{" "}
              <span className="font-heading font-bold text-foreground">
                {score}
              </span>
            </span>
            <span className="text-muted">
              Best{" "}
              <span className="font-heading font-bold text-accent-light">
                {best}
              </span>
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-muted transition-colors hover:text-foreground"
              aria-label="Close game"
            >
              ✕
            </button>
          </div>
        </div>

        <div
          ref={frameRef}
          className="relative h-[340px] w-full overflow-hidden rounded-xl border border-white/10 sm:h-[400px]"
          style={{ background: "#06060a", touchAction: "none" }}
        >
          <canvas ref={canvasRef} className="h-full w-full" />

          {phase !== "playing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 text-center">
              {phase === "over" ? (
                <>
                  <p className="font-heading text-3xl font-bold tracking-[-0.02em]">
                    SHIP LOST
                  </p>
                  <p className="text-sm text-muted">
                    Final score: <span className="text-foreground">{score}</span>
                    {score >= best && score > 0 && (
                      <span className="text-accent-light"> · new best!</span>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-heading text-3xl font-bold tracking-[-0.02em]">
                    ORBIT DODGER
                  </p>
                  <p className="max-w-xs text-sm text-muted">
                    Steer with your mouse or finger. Dodge the asteroids.
                    Survive.
                  </p>
                </>
              )}
              <button
                onClick={() => {
                  setScore(0);
                  resetRef.current = true;
                  setPhaseSync("playing");
                }}
                className="glow-hover rounded-full bg-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
              >
                {phase === "over" ? "Fly again" : "Launch"}
              </button>
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-[11px] text-muted">
          Found via the command deck — you&apos;re clearly thorough. I like
          that.
        </p>
      </div>
    </div>
  );
}
