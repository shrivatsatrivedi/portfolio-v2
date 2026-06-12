"use client";

import { useEffect, useRef } from "react";
import { on, emit, toast } from "@/lib/bus";
import { restoreAccent } from "@/lib/accents";
import { confettiBurst } from "@/lib/confetti";
import { onPreloaderDone } from "@/lib/preloader";

const KONAMI = [
  "arrowup",
  "arrowup",
  "arrowdown",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowleft",
  "arrowright",
  "b",
  "a",
];

export default function EffectsLayer() {
  const barRef = useRef<HTMLDivElement>(null);
  const warpRef = useRef<HTMLCanvasElement>(null);
  const warpRunning = useRef(false);

  // Scroll progress bar
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Warp drive — hyperspace star streaks radiating from center
  useEffect(() => {
    const canvas = warpRef.current;
    if (!canvas) return;

    const runWarp = () => {
      if (warpRunning.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      warpRunning.current = true;

      const w = (canvas.width = window.innerWidth);
      const h = (canvas.height = window.innerHeight);
      const cx = w / 2;
      const cy = h / 2;
      const accent =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--accent-light")
          .trim() || "#818cf8";

      const stars = Array.from({ length: 260 }, () => ({
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * Math.max(w, h) * 0.05 + 8,
        speed: 1.045 + Math.random() * 0.035,
      }));

      const start = performance.now();
      const DURATION = 2300;

      const frame = (now: number) => {
        const t = now - start;
        const fade =
          t > DURATION - 500 ? Math.max(0, (DURATION - t) / 500) : 1;
        ctx.clearRect(0, 0, w, h);

        for (const s of stars) {
          const prev = s.dist;
          s.dist *= s.speed;
          if (s.dist > Math.max(w, h)) {
            s.dist = Math.random() * 30 + 8;
            continue;
          }
          const x1 = cx + Math.cos(s.angle) * prev;
          const y1 = cy + Math.sin(s.angle) * prev;
          const x2 = cx + Math.cos(s.angle) * s.dist;
          const y2 = cy + Math.sin(s.angle) * s.dist;
          ctx.globalAlpha =
            Math.min(1, s.dist / (Math.max(w, h) * 0.25)) * 0.8 * fade;
          ctx.strokeStyle = Math.random() > 0.3 ? "#ffffff" : accent;
          ctx.lineWidth = Math.min(2.5, s.dist / 300 + 0.5);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        if (t < DURATION) {
          requestAnimationFrame(frame);
        } else {
          ctx.clearRect(0, 0, w, h);
          warpRunning.current = false;
        }
      };

      requestAnimationFrame(frame);
    };

    return on("warp", runWarp);
  }, []);

  // Konami code → warp + confetti
  useEffect(() => {
    let progress = 0;
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0;
      if (progress === KONAMI.length) {
        progress = 0;
        emit("warp");
        confettiBurst();
        toast("WARP DRIVE ENGAGED", "🚀");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Restore saved accent theme
  useEffect(() => {
    restoreAccent();
  }, []);

  // Tab title easter egg
  useEffect(() => {
    const original = document.title;
    const onVisibility = () => {
      document.title = document.hidden
        ? "🛸 Lost in space? Come back…"
        : original;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // One-time command deck hint
  useEffect(() => {
    return onPreloaderDone(() => {
      if (sessionStorage.getItem("st-tip")) return;
      sessionStorage.setItem("st-tip", "1");
      setTimeout(() => {
        const coarse = window.matchMedia("(pointer: coarse)").matches;
        toast(
          coarse
            ? "Tap ✦ in the navbar — there's a command deck"
            : "Press ⌘K — there's a command deck hidden here",
          "✦",
        );
      }, 4500);
    });
  }, []);

  return (
    <>
      <div
        ref={barRef}
        className="fixed left-0 top-0 z-[10003] h-[2px] w-full origin-left bg-gradient-to-r from-accent to-accent-light shadow-[0_0_8px_var(--glow-mid)]"
        style={{ transform: "scaleX(0)" }}
        aria-hidden
      />
      <canvas
        ref={warpRef}
        className="pointer-events-none fixed inset-0 z-[9998] h-full w-full"
        aria-hidden
      />
    </>
  );
}
