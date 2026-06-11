"use client";

import { useEffect, useRef, useState } from "react";
import { stagger, createTimeline } from "animejs";
import { markPreloaderDone } from "@/lib/preloader";

const NAME = "SHRIVATSA TRIVEDI";

export default function Preloader() {
  const [gone, setGone] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const overlay = overlayRef.current;
    const counter = counterRef.current;
    const bar = barRef.current;
    if (!overlay || !counter || !bar) {
      markPreloaderDone();
      setGone(true);
      return;
    }

    document.body.style.overflow = "hidden";
    const progress = { v: 0 };

    const tl = createTimeline();

    // monogram strokes draw themselves in
    tl.add(".loader-stroke", {
      strokeDashoffset: [120, 0],
      opacity: [0, 1],
      ease: "inOutQuart",
      duration: 1100,
      delay: stagger(150),
    });

    // name letters surface beneath the monogram
    tl.add(
      ".loader-letter",
      {
        opacity: [0, 1],
        translateY: [14, 0],
        ease: "outExpo",
        duration: 600,
        delay: stagger(18),
      },
      400,
    );

    // counter 0 → 100 with the progress bar
    tl.add(
      progress,
      {
        v: 100,
        ease: "inOutQuart",
        duration: 1900,
        onUpdate: () => {
          const n = Math.round(progress.v);
          counter.textContent = String(n).padStart(3, "0");
          bar.style.transform = `scaleX(${progress.v / 100})`;
        },
      },
      200,
    );

    // contents lift away…
    tl.add(".loader-fade", {
      opacity: [1, 0],
      translateY: [0, -24],
      ease: "inExpo",
      duration: 450,
      delay: stagger(60),
    });

    // …then the curtain wipes up into the hero
    tl.add(
      overlay,
      {
        translateY: ["0%", "-100%"],
        ease: "inOutExpo",
        duration: 850,
        onComplete: () => {
          document.body.style.overflow = "";
          markPreloaderDone();
          setGone(true);
        },
      },
      "-=150",
    );

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (gone) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[10002] flex flex-col items-center justify-center"
      style={{ background: "var(--bg)" }}
      aria-hidden
    >
      {/* ST monogram drawn as strokes */}
      <svg
        viewBox="0 0 120 80"
        className="loader-fade h-20 w-32"
        fill="none"
        stroke="var(--accent-light)"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path
          className="loader-stroke"
          d="M48 22c-4-5-12-7-18-4-6 3-7 11-1 15 5 4 14 4 18 9 5 6 1 14-6 16-7 2-14-1-17-6"
          strokeDasharray="120"
          strokeDashoffset="120"
        />
        <path
          className="loader-stroke"
          d="M66 18h38M85 18v44"
          strokeDasharray="120"
          strokeDashoffset="120"
        />
      </svg>

      <p className="loader-fade mt-8 flex gap-[2px] text-[11px] font-medium uppercase tracking-[0.5em] text-muted">
        {NAME.split("").map((ch, i) => (
          <span key={i} className="loader-letter inline-block opacity-0">
            {ch === " " ? " " : ch}
          </span>
        ))}
      </p>

      <span
        ref={counterRef}
        className="loader-fade font-heading absolute bottom-10 right-10 text-6xl font-bold tracking-[-0.02em] text-foreground/20 sm:text-7xl"
      >
        000
      </span>

      <div className="absolute bottom-0 left-0 h-px w-full bg-white/5">
        <div
          ref={barRef}
          className="h-full w-full origin-left bg-accent shadow-[0_0_12px_rgba(99,102,241,0.8)]"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
    </div>
  );
}
