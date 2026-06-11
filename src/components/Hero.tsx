"use client";

import { useEffect, useRef, useState } from "react";
import { animate, stagger, createTimer } from "animejs";
import { rand } from "@/lib/animations";

const NAME = "SHRIVATSA TRIVEDI";
const ROLES = [
  "Software Engineer",
  "Full-Stack Developer",
  "Android Developer",
  "AI Builder",
];
const PARTICLE_COUNT = 80;
const REPEL_RADIUS = 120;
const COLORS = ["#6366f1", "#818cf8", "#a5b4fc"];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  o: number;
  c: string;
};

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [typed, setTyped] = useState("");

  // Particle field — Anime.js timer drives the per-frame loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = section.clientWidth);
    let h = (canvas.height = section.clientHeight);
    const mouse = { x: -9999, y: -9999 };

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      vx: rand(-0.25, 0.25),
      vy: rand(-0.25, 0.25),
      r: rand(1, 1.5),
      o: rand(0.25, 0.85),
      c: COLORS[Math.floor(rand(0, COLORS.length))],
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
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;

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

          ctx.globalAlpha = p.o;
          ctx.fillStyle = p.c;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    });

    // 0ms — canvas fades in
    animate(canvas, { opacity: [0, 0.6], duration: 800, ease: "linear" });

    return () => {
      timer.cancel();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      section.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Load sequence — name letters, tagline, CTAs, badge
  useEffect(() => {
    // 300ms — letter-by-letter name reveal
    animate(".hero-letter", {
      translateY: [40, 0],
      opacity: [0, 1],
      ease: "outExpo",
      duration: 800,
      delay: stagger(30, { start: 300 }),
    });
    // 800ms — typewriter wrapper appears (typing starts in its own effect)
    animate(".hero-role", {
      opacity: [0, 1],
      ease: "outExpo",
      duration: 500,
      delay: 750,
    });
    // 1000ms — tagline
    animate(".hero-tagline", {
      opacity: [0, 1],
      translateY: [16, 0],
      ease: "outExpo",
      duration: 800,
      delay: 1000,
    });
    // 1200ms — CTAs slide up
    animate(".hero-cta", {
      opacity: [0, 1],
      translateY: [24, 0],
      ease: "outExpo",
      duration: 700,
      delay: stagger(120, { start: 1200 }),
    });
    // 1400ms — availability badge
    animate(".hero-badge", {
      opacity: [0, 1],
      translateY: [12, 0],
      ease: "outExpo",
      duration: 700,
      delay: 1400,
    });
  }, []);

  // Typewriter — types, holds 1.8s, deletes, cycles
  useEffect(() => {
    let role = 0;
    let char = 0;
    let deleting = false;
    let t: ReturnType<typeof setTimeout>;

    const tick = () => {
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

    t = setTimeout(tick, 800);
    return () => clearTimeout(t);
  }, []);

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

      <div className="relative z-10 flex flex-col items-center text-center">
        <h1
          className="font-heading flex flex-wrap justify-center gap-x-5 text-5xl font-bold tracking-[-0.02em] sm:text-6xl md:text-7xl lg:text-8xl"
          aria-label={NAME}
        >
          {NAME.split(" ").map((word, wi) => (
            <span key={wi} className="overflow-hidden whitespace-nowrap" aria-hidden>
              {word.split("").map((ch, i) => (
                <span key={i} className="hero-letter inline-block opacity-0">
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
            href="#projects"
            onClick={(e) => goTo(e, "projects")}
            className="hero-cta glow-hover rounded-full bg-accent px-8 py-3 text-sm font-semibold text-white opacity-0 transition-colors hover:bg-accent-light"
          >
            View Projects
          </a>
          <a
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
    </section>
  );
}
