"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { onceVisible, rand } from "@/lib/animations";
import { on } from "@/lib/bus";
import { confettiBurst } from "@/lib/confetti";
import { sfx, isMuted, setMuted } from "@/lib/sfx";

type Phase = "ready" | "playing" | "over" | "won";

type Brick = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  row: number;
  alive: boolean;
};

type Spark = { x: number; y: number; vx: number; vy: number; life: number };

// every brick is a real entry from the skills orbit (+ a few dev glyphs)
const LABELS = [
  "JavaScript",
  "Python",
  "React",
  "Next.js",
  "Node.js",
  "Java",
  "TypeScript",
  "Express.js",
  "MongoDB",
  "C/C++",
  "HTML/CSS",
  "OpenAI API",
  "DeepFace",
  "MediaPipe",
  "Streamlit",
  "Git",
  "Vercel",
  "</>",
  "{ }",
  "===",
  "async",
];

const BEST_KEY = "st-breaker-best";
const BALL_SPEED = 380;
const MAX_SPEED = 560;

export default function Arcade() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(3);
  const [soundOn, setSoundOn] = useState(true);

  const phaseRef = useRef<Phase>("ready");
  const cmdRef = useRef<"none" | "launch" | "restart">("none");

  const setPhaseSync = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // restore persisted best score + mute preference after hydration
  useEffect(() => {
    const t = setTimeout(() => {
      setBest(Number(localStorage.getItem(BEST_KEY)) || 0);
      setSoundOn(!isMuted());
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // section entry animation
  useEffect(() => {
    return onceVisible(sectionRef.current, () => {
      animate(".arcade-reveal", {
        opacity: [0, 1],
        translateY: [30, 0],
        ease: "outExpo",
        duration: 800,
        delay: (el: unknown, i: number) => i * 100,
      });
    });
  }, []);

  // game engine
  useEffect(() => {
    const canvas = canvasRef.current;
    const frameEl = frameRef.current;
    if (!canvas || !frameEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let colors = { accent: "#6366f1", light: "#818cf8" };

    const readAccent = () => {
      const cs = getComputedStyle(document.documentElement);
      colors = {
        accent: cs.getPropertyValue("--accent").trim() || "#6366f1",
        light: cs.getPropertyValue("--accent-light").trim() || "#818cf8",
      };
    };
    readAccent();
    const offAccent = on("accent:changed", readAccent);

    const paddle = { x: 0, w: 96, h: 12 };
    const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 7, stuck: true, speed: BALL_SPEED };
    let bricks: Brick[] = [];
    let sparks: Spark[] = [];
    const trail: { x: number; y: number }[] = [];
    let combo = 0;
    let shake = 0;
    let gameScore = 0;
    let gameLives = 3;

    const stars = Array.from({ length: 50 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: rand(0.4, 1.4),
      v: rand(6, 26),
    }));

    const buildBricks = () => {
      const cols = Math.max(3, Math.min(7, Math.floor(w / 100)));
      const rows = 3;
      const gap = 6;
      const top = 16;
      const side = 10;
      const bw = (w - side * 2 - gap * (cols - 1)) / cols;
      const bh = 30;
      bricks = LABELS.slice(0, cols * rows).map((label, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        return {
          x: side + col * (bw + gap),
          y: top + row * (bh + gap),
          w: bw,
          h: bh,
          label,
          row,
          alive: true,
        };
      });
    };

    const resetBall = () => {
      ball.stuck = true;
      ball.speed = BALL_SPEED;
      ball.x = paddle.x;
      ball.y = h - 34 - ball.r;
      ball.vx = 0;
      ball.vy = 0;
      trail.length = 0;
      combo = 0;
    };

    const fullReset = () => {
      gameScore = 0;
      gameLives = 3;
      setScore(0);
      setLives(3);
      buildBricks();
      resetBall();
    };

    const measure = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = frameEl.clientWidth;
      h = frameEl.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paddle.w = Math.max(64, Math.min(110, w * 0.14));
      paddle.x = w / 2;
      buildBricks();
      resetBall();
    };
    measure();
    window.addEventListener("resize", measure);

    // input
    const movePaddle = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      paddle.x = Math.min(
        Math.max(clientX - rect.left, paddle.w / 2),
        w - paddle.w / 2,
      );
    };
    const onMouse = (e: MouseEvent) => movePaddle(e.clientX);
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) movePaddle(t.clientX);
    };
    const launch = () => {
      if (!ball.stuck) return;
      ball.stuck = false;
      const a = rand(-0.6, 0.6);
      ball.vx = Math.sin(a) * ball.speed;
      ball.vy = -Math.cos(a) * ball.speed;
      sfx.launch();
    };
    const onClick = () => {
      if (phaseRef.current === "ready") {
        setPhaseSync("playing");
        launch();
      } else if (phaseRef.current === "playing" && ball.stuck) {
        launch();
      }
    };
    canvas.addEventListener("mousemove", onMouse);
    canvas.addEventListener("touchmove", onTouch, { passive: false });
    canvas.addEventListener("touchstart", onTouch, { passive: false });
    canvas.addEventListener("click", onClick);

    // only burn CPU while the arcade is on screen
    let visible = false;
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? false;
      },
      { threshold: 0.1 },
    );
    io.observe(canvas);

    const explodeBrick = (b: Brick) => {
      for (let i = 0; i < 14; i++) {
        const a = rand(0, Math.PI * 2);
        const s = rand(40, 220);
        sparks.push({
          x: b.x + b.w / 2,
          y: b.y + b.h / 2,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 1,
        });
      }
    };

    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.04);
      last = now;
      if (!visible) return;

      // external commands from React buttons
      if (cmdRef.current === "restart") {
        cmdRef.current = "none";
        fullReset();
      } else if (cmdRef.current === "launch") {
        cmdRef.current = "none";
        launch();
      }

      const playing = phaseRef.current === "playing";

      if (playing && !ball.stuck) {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // walls
        if (ball.x < ball.r) {
          ball.x = ball.r;
          ball.vx *= -1;
          sfx.wall();
        } else if (ball.x > w - ball.r) {
          ball.x = w - ball.r;
          ball.vx *= -1;
          sfx.wall();
        }
        if (ball.y < ball.r) {
          ball.y = ball.r;
          ball.vy *= -1;
          sfx.wall();
        }

        // paddle
        const py = h - 22;
        if (
          ball.vy > 0 &&
          ball.y + ball.r >= py &&
          ball.y + ball.r <= py + paddle.h + 10 &&
          Math.abs(ball.x - paddle.x) <= paddle.w / 2 + ball.r
        ) {
          const offset = (ball.x - paddle.x) / (paddle.w / 2);
          // jitter prevents a degenerate perfectly-vertical bounce loop
          const angle = offset * 1.05 + rand(-0.05, 0.05);
          ball.vx = Math.sin(angle) * ball.speed;
          ball.vy = -Math.abs(Math.cos(angle) * ball.speed);
          ball.y = py - ball.r;
          combo = 0;
          sfx.paddle();
        }

        // bricks
        for (const b of bricks) {
          if (!b.alive) continue;
          if (
            ball.x + ball.r > b.x &&
            ball.x - ball.r < b.x + b.w &&
            ball.y + ball.r > b.y &&
            ball.y - ball.r < b.y + b.h
          ) {
            b.alive = false;
            combo++;
            gameScore += 10 + (combo - 1) * 5;
            setScore(gameScore);
            explodeBrick(b);
            shake = 7;
            sfx.brick(combo);
            ball.speed = Math.min(MAX_SPEED, ball.speed + 6);

            // reflect off the nearest face
            const fromLeft = Math.abs(ball.x - b.x);
            const fromRight = Math.abs(ball.x - (b.x + b.w));
            const fromTop = Math.abs(ball.y - b.y);
            const fromBottom = Math.abs(ball.y - (b.y + b.h));
            const min = Math.min(fromLeft, fromRight, fromTop, fromBottom);
            if (min === fromTop || min === fromBottom) ball.vy *= -1;
            else ball.vx *= -1;

            // re-normalize to current speed
            const mag = Math.hypot(ball.vx, ball.vy) || 1;
            ball.vx = (ball.vx / mag) * ball.speed;
            ball.vy = (ball.vy / mag) * ball.speed;
            break;
          }
        }

        // cleared the stack
        if (bricks.every((b) => !b.alive)) {
          setPhaseSync("won");
          setBest((prev) => {
            const nb = Math.max(prev, gameScore);
            localStorage.setItem(BEST_KEY, String(nb));
            return nb;
          });
          sfx.win();
          confettiBurst();
        }

        // dropped the ball
        if (ball.y - ball.r > h) {
          gameLives--;
          setLives(gameLives);
          if (gameLives <= 0) {
            setPhaseSync("over");
            setBest((prev) => {
              const nb = Math.max(prev, gameScore);
              localStorage.setItem(BEST_KEY, String(nb));
              return nb;
            });
            sfx.gameOver();
          } else {
            resetBall();
            sfx.lifeLost();
          }
        }

        trail.unshift({ x: ball.x, y: ball.y });
        if (trail.length > 9) trail.pop();
      }

      if (ball.stuck) {
        ball.x = paddle.x;
        ball.y = h - 34 - ball.r;
      }

      // ---- draw ----
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      if (shake > 0.3) {
        ctx.translate(rand(-shake, shake) * 0.5, rand(-shake, shake) * 0.5);
        shake *= 0.86;
      }

      // starfield
      ctx.fillStyle = "#64748b";
      for (const s of stars) {
        s.y += (s.v * dt) / h;
        if (s.y > 1) s.y -= 1;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // bricks
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const b of bricks) {
        if (!b.alive) continue;
        const alpha = [0.28, 0.2, 0.13][b.row] ?? 0.13;
        ctx.fillStyle = colors.accent;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 6);
        ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = colors.accent;
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 0.5, b.w - 8);
      }
      ctx.globalAlpha = 1;

      // ball trail
      trail.forEach((t, i) => {
        ctx.globalAlpha = (1 - i / trail.length) * 0.25;
        ctx.fillStyle = colors.light;
        ctx.beginPath();
        ctx.arc(t.x, t.y, ball.r * (1 - i / trail.length), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // ball
      ctx.shadowColor = colors.accent;
      ctx.shadowBlur = 16;
      ctx.fillStyle = colors.light;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      // paddle
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.roundRect(paddle.x - paddle.w / 2, h - 22, paddle.w, paddle.h, 6);
      ctx.fill();
      ctx.shadowBlur = 0;

      // sparks
      for (const s of sparks) {
        s.life -= dt * 1.6;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 220 * dt;
        if (s.life > 0) {
          ctx.globalAlpha = s.life;
          ctx.fillStyle = colors.light;
          ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
        }
      }
      sparks = sparks.filter((s) => s.life > 0);
      ctx.globalAlpha = 1;
      ctx.restore();
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      offAccent();
      window.removeEventListener("resize", measure);
      canvas.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("touchmove", onTouch);
      canvas.removeEventListener("touchstart", onTouch);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  const restart = () => {
    cmdRef.current = "restart";
    setPhaseSync("ready");
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setMuted(!next);
  };

  return (
    <section
      ref={sectionRef}
      id="arcade"
      className="mx-auto w-full max-w-6xl px-6 py-28"
    >
      <p className="arcade-reveal text-xs font-semibold uppercase tracking-[0.25em] text-accent-light opacity-0">
        Arcade
      </p>
      <h2 className="arcade-reveal font-heading mt-4 text-4xl font-bold tracking-[-0.02em] opacity-0 sm:text-5xl">
        Break my stack.
      </h2>
      <p className="arcade-reveal mt-3 max-w-xl text-sm text-muted opacity-0">
        Take a break — literally. Every brick is a real skill from my toolbox.
        Sound on for the full effect; phones get haptics too.
      </p>

      <div className="arcade-reveal mx-auto mt-10 max-w-3xl opacity-0">
        <div className="mb-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-5">
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
          </div>
          <div className="flex items-center gap-4">
            <span className="tracking-widest text-accent-light" aria-label={`${lives} lives`}>
              {"▲".repeat(Math.max(lives, 0))}
              <span className="opacity-25">
                {"▲".repeat(Math.max(3 - lives, 0))}
              </span>
            </span>
            <button
              onClick={toggleSound}
              className="text-muted transition-colors hover:text-foreground"
              aria-label={soundOn ? "Mute sound" : "Unmute sound"}
            >
              {soundOn ? "🔊" : "🔇"}
            </button>
          </div>
        </div>

        <div
          ref={frameRef}
          className="relative h-[380px] w-full overflow-hidden rounded-2xl border border-white/10 sm:h-[440px]"
          style={{ background: "#06060a", touchAction: "none" }}
        >
          <canvas ref={canvasRef} className="h-full w-full" />

          {phase !== "playing" && (
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center gap-3 text-center ${
                phase === "ready" ? "pointer-events-none" : "bg-black/50"
              }`}
            >
              {phase === "ready" && (
                <>
                  <p className="font-heading text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
                    STACK <span className="text-accent-light">BREAKER</span>
                  </p>
                  <p className="text-xs text-muted sm:text-sm">
                    Move to aim · click or tap to launch
                  </p>
                </>
              )}
              {phase === "over" && (
                <>
                  <p className="font-heading text-3xl font-bold tracking-[-0.02em]">
                    KERNEL PANIC
                  </p>
                  <p className="text-sm text-muted">
                    Out of lives · score{" "}
                    <span className="text-foreground">{score}</span>
                    {score >= best && score > 0 && (
                      <span className="text-accent-light"> · new best!</span>
                    )}
                  </p>
                  <button
                    onClick={restart}
                    className="glow-hover mt-2 rounded-full bg-accent px-7 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
                  >
                    Recompile
                  </button>
                </>
              )}
              {phase === "won" && (
                <>
                  <p className="font-heading text-3xl font-bold tracking-[-0.02em]">
                    STACK CLEARED
                  </p>
                  <p className="text-sm text-muted">
                    Certified full-stack breaker ·{" "}
                    <span className="text-foreground">{score}</span> pts
                  </p>
                  <button
                    onClick={restart}
                    className="glow-hover mt-2 rounded-full bg-accent px-7 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
                  >
                    Run it back
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-[11px] text-muted">
          Clear all the bricks and you officially know my whole stack.
        </p>
      </div>
    </section>
  );
}
