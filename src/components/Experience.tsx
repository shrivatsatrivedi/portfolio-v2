"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { onceVisible } from "@/lib/animations";

const BULLETS = [
  "Engineered a multi-faceted login system for the Glance Android app, handling country-wise and age-based compliance logic — now live on Android and iOS.",
  "Collaborated with backend, product, and QA teams to ensure seamless integration and on-time feature delivery.",
  "Improved application stability by debugging edge cases in a large-scale production codebase.",
];

export default function Experience() {
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return onceVisible(sectionRef.current, () => {
      if (lineRef.current) {
        animate(lineRef.current, {
          scaleY: [0, 1],
          ease: "outExpo",
          duration: 900,
        });
      }
      if (cardRef.current) {
        animate(cardRef.current, {
          opacity: [0, 1],
          translateX: [-60, 0],
          ease: "outExpo",
          duration: 800,
          delay: 300,
        });
      }
      animate(".exp-bullet", {
        opacity: [0, 1],
        translateX: [-20, 0],
        ease: "outExpo",
        duration: 600,
        delay: stagger(100, { start: 600 }),
      });
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      id="experience"
      className="mx-auto w-full max-w-6xl px-6 py-28"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-light">
        Experience
      </p>
      <h2 className="font-heading mt-4 text-4xl font-bold tracking-[-0.02em] sm:text-5xl">
        Where I&apos;ve worked.
      </h2>

      <div className="relative mt-14 pl-8 md:pl-12">
        {/* Glowing timeline */}
        <div
          ref={lineRef}
          className="absolute left-0 top-0 h-full w-px origin-top bg-accent"
          style={{
            transform: "scaleY(0)",
            boxShadow: "0 0 12px rgba(99, 102, 241, 0.7)",
          }}
        />
        <div className="absolute -left-[5px] top-2 h-[11px] w-[11px] rounded-full bg-accent shadow-[0_0_12px_rgba(99,102,241,0.9)]" />

        <div
          ref={cardRef}
          className="glass glow-hover rounded-2xl p-8 opacity-0"
        >
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h3 className="font-heading text-2xl font-semibold tracking-[-0.02em]">
                Glance <span className="text-muted">(InMobi Group)</span>
              </h3>
              <p className="mt-1 font-medium text-accent-light">
                Software Engineer Intern, Android
              </p>
            </div>
            <p className="shrink-0 text-sm text-muted">
              May 2025 – July 2025 · Bengaluru, Karnataka
            </p>
          </div>

          <ul className="mt-6 space-y-3">
            {BULLETS.map((bullet, i) => (
              <li
                key={i}
                className="exp-bullet flex gap-3 text-sm leading-relaxed text-muted opacity-0"
              >
                <span className="mt-[3px] shrink-0 text-accent-light">▹</span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
