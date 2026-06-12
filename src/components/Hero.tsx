"use client";

import { useEffect, useRef, useState } from "react";
import { animate, stagger, createTimer, createAnimatable } from "animejs";
import { rand } from "@/lib/animations";
import { onPreloaderDone } from "@/lib/preloader";
import { on } from "@/lib/bus";

const NAME = "SHRIVATSA TRIVEDI";
const ROLES = [
  "Software Engineer",
  "Full-Stack Developer",
  "Android Developer",
  "AI Builder",
];
const PARTICLE_COUNT = 80;
const REPEL_RADIUS = 120;
const LINK_DIST = 110;
const GLYPHS = "!<>-_\\/[]{}—=+*^?#01";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  o: number;
  slot: number; // index into the live accent palette
};

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctaRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [typed, setTyped] = useState("");

  // Particle constellation — Anime.js timer drives the per-frame loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = section.clientWidth);
    let h = (canvas.height = section.clientHeight);
    const mouse = { x: -9999, y: -9999 };

    // palette follows the live accent theme; warp (Konami / ⌘K) boosts speed
    let colors = ["#6366f1", "#818cf8", "#a5b4fc"];
    const readAccent = () => {
      const cs = getComputedStyle(document.documentElement);
      const a = cs.getPropertyValue("--accent").trim() || "#6366f1";
      const l = cs.getPropertyValue("--accent-light").trim() || "#818cf8";
      colors = [a, l, l];
    };
    readAccent();
    const offAccent = on("accent:changed", readAccent);

    let boostUntil = 0;
    const offWarp = on("warp", () => {
      boostUntil = performance.now() + 2300;
    });

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      vx: rand(-0.25, 0.25),
      vy: rand(-0.25, 0.25),
      r: rand(1, 1.6),
      o: rand(0.25, 0.85),
      slot: Math.floor(rand(0, 3)),
    }));

    const onResize = () => {
      w = canvas.width = section.clientWidth;
      h = canvas.height = section.clientHeight;
    };
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);
    section.addEventListener("mouseleave", onLeave);

    const timer = createTimer({
      onUpdate: () => {
        ctx.clearRect(0, 0, w, h);

        const boost = performance.now() < boostUntil ? 7 : 1;

        for (const p of particles) {
          p.x += p.vx * boost;
          p.y += p.vy * boost;

          // gentle repulsion from cursor
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < REPEL_RADIUS && dist > 0.01) {
            const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * 0.9;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }

          // wrap at edges
          if (p.x < 0) p.x += w;
          if (p.x > w) p.x -= w;
          if (p.y < 0) p.y += h;
          if (p.y > h) p.y -= h;
        }

        // constellation lines between close particles
        ctx.lineWidth = 0.6;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i];
            const b = particles[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d = Math.hypot(dx, dy);
            if (d < LINK_DIST) {
              ctx.globalAlpha = (1 - d / LINK_DIST) * 0.16;
              ctx.strokeStyle = colors[1];
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }

        for (const p of particles) {
          ctx.globalAlpha = p.o;
          ctx.fillStyle = colors[p.slot];
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    });

    return () => {
      timer.cancel();
      offAccent();
      offWarp();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      section.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Load sequence — fires once the preloader curtain lifts
  useEffect(() => {
    return onPreloaderDone(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        animate(canvas, { opacity: [0, 0.6], duration: 800, ease: "linear" });
      }
      animate(".hero-orb", {
        opacity: [0, 1],
        scale: [0.6, 1],
        ease: "outExpo",
        duration: 1400,
      });
      animate(".hero-letter", {
        translateY: [60, 0],
        rotateX: [-50, 0],
        opacity: [0, 1],
        ease: "outExpo",
        duration: 900,
        delay: stagger(30, { start: 300 }),
      });
      animate(".hero-role", {
        opacity: [0, 1],
        ease: "outExpo",
        duration: 500,
        delay: 750,
      });
      animate(".hero-tagline", {
        opacity: [0, 1],
        translateY: [16, 0],
        ease: "outExpo",
        duration: 800,
        delay: 1000,
      });
      animate(".hero-cta", {
        opacity: [0, 1],
        translateY: [24, 0],
        ease: "outExpo",
        duration: 700,
        delay: stagger(120, { start: 1200 }),
      });
      animate(".hero-badge", {
        opacity: [0, 1],
        translateY: [12, 0],
        ease: "outExpo",
        duration: 700,
        delay: 1400,
      });
      animate(".hero-scroll", {
        opacity: [0, 1],
        ease: "outExpo",
        duration: 700,
        delay: 1800,
      });
    });
  }, []);

  // Typewriter — starts with the rest of the sequence
  useEffect(() => {
    let role = 0;
    let char = 0;
    let deleting = false;
    let t: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const word = ROLES[role];
      if (!deleting) {
        char++;
        setTyped(word.slice(0, char));
        if (char === word.length) {
          deleting = true;
          t = setTimeout(tick, 1800);
        } else {
          t = setTimeout(tick, 70);
        }
      } else {
        char--;
        setTyped(word.slice(0, char));
        if (char === 0) {
          deleting = false;
          role = (role + 1) % ROLES.length;
          t = setTimeout(tick, 350);
        } else {
          t = setTimeout(tick, 40);
        }
      }
    };

    const unsub = onPreloaderDone(() => {
      t = setTimeout(tick, 800);
    });

    return () => {
      cancelled = true;
      unsub();
      if (t) clearTimeout(t);
    };
  }, []);

  // Magnetic CTAs — buttons lean toward the cursor, spring back on leave
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    for (const btn of ctaRefs.current) {
      if (!btn) continue;
      const magnet = createAnimatable(btn, {
        translateX: 200,
        translateY: 200,
        ease: "outQuad",
      });

      const onMove = (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        const px = e.clientX - (rect.left + rect.width / 2);
        const py = e.clientY - (rect.top + rect.height / 2);
        magnet.translateX(px * 0.3);
        magnet.translateY(py * 0.4);
      };
      const onLeave = () => {
        magnet.translateX(0, 700, "outElastic(1, .4)");
        magnet.translateY(0, 700, "outElastic(1, .4)");
      };

      btn.addEventListener("mousemove", onMove);
      btn.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        btn.removeEventListener("mousemove", onMove);
        btn.removeEventListener("mouseleave", onLeave);
        magnet.revert();
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  // Click the name → glyph-scramble decode effect
  const decodeName = () => {
    const letters = document.querySelectorAll<HTMLElement>(".hero-letter");
    letters.forEach((el, i) => {
      if (el.dataset.decoding) return;
      el.dataset.decoding = "1";
      const original = el.dataset.char ?? el.textContent ?? "";
      let frame = 0;
      const total = 12 + i * 2;
      const tick = () => {
        frame++;
        if (frame >= total) {
          el.textContent = original;
          delete el.dataset.decoding;
          return;
        }
        if (frame % 2 === 0) {
          el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
  };

  // Letters bounce when you sweep over them
  const onLetterEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    const el = e.currentTarget;
    if (el.dataset.busy) return;
    el.dataset.busy = "1";
    animate(el, {
      translateY: [0, -14, 0],
      color: ["#e2e8f0", "#818cf8", "#e2e8f0"],
      ease: "inOutQuad",
      duration: 450,
      onComplete: () => {
        delete el.dataset.busy;
      },
    });
  };

  const goTo = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-16"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full opacity-0"
        aria-hidden
      />

      {/* breathing accent glow behind the name */}
      <div
        className="hero-orb orb-breathe pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent) 16%, transparent) 0%, color-mix(in srgb, var(--accent) 5%, transparent) 45%, transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <h1
          className="font-heading flex flex-wrap justify-center gap-x-5 text-5xl font-bold tracking-[-0.02em] sm:text-6xl md:text-7xl lg:text-8xl"
          style={{ perspective: "600px" }}
          aria-label={NAME}
          onClick={decodeName}
          title="Click me"
        >
          {NAME.split(" ").map((word, wi) => (
            <span key={wi} className="whitespace-nowrap" aria-hidden>
              {word.split("").map((ch, i) => (
                <span
                  key={i}
                  data-char={ch}
                  className="hero-letter inline-block opacity-0"
                  onMouseEnter={onLetterEnter}
                >
                  {ch}
                </span>
              ))}
            </span>
          ))}
        </h1>

        <p className="hero-role mt-6 h-8 text-xl font-medium text-accent-light opacity-0 sm:text-2xl">
          {typed}
          <span className="caret" aria-hidden />
        </p>

        <p className="hero-tagline mt-4 max-w-xl text-base text-muted opacity-0 sm:text-lg">
          Building products at the intersection of intelligence and experience.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            ref={(el) => {
              ctaRefs.current[0] = el;
            }}
            href="#projects"
            onClick={(e) => goTo(e, "projects")}
            className="hero-cta glow-hover rounded-full bg-accent px-8 py-3 text-sm font-semibold text-white opacity-0 transition-colors hover:bg-accent-light"
          >
            View Projects
          </a>
          <a
            ref={(el) => {
              ctaRefs.current[1] = el;
            }}
            href="#contact"
            onClick={(e) => goTo(e, "contact")}
            className="hero-cta glow-hover rounded-full border border-accent/60 px-8 py-3 text-sm font-semibold text-accent-light opacity-0 transition-colors hover:border-accent-light hover:text-foreground"
          >
            Get in Touch
          </a>
        </div>

        <div className="hero-badge badge-pulse glass mt-14 rounded-full px-5 py-2 text-xs tracking-wide text-accent-light opacity-0 sm:text-sm">
          ✦ Open to Opportunities · June 2026
        </div>
      </div>

      {/* scroll cue */}
      <div className="hero-scroll absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 opacity-0">
        <span className="text-[10px] uppercase tracking-[0.35em] text-muted">
          Scroll
        </span>
        <span className="scroll-line block h-10 w-px bg-gradient-to-b from-accent-light to-transparent" />
      </div>
    </section>
  );
}
