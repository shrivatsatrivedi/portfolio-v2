"use client";

import { useEffect, useRef } from "react";
import { animate, stagger, createTimer } from "animejs";
import { onceVisible, rand } from "@/lib/animations";

// Three orbital rings — core stack inside, ecosystem outside.
const RINGS = [
  {
    factor: 0.34, // of max radius
    secondsPerRev: 32,
    direction: 1,
    chipClass:
      "px-4 py-2 text-sm font-semibold text-foreground border-accent/40",
    skills: ["JavaScript", "Python", "React", "Next.js", "Node.js"],
  },
  {
    factor: 0.65,
    secondsPerRev: 50,
    direction: -1,
    chipClass: "px-3.5 py-1.5 text-xs font-medium text-foreground/90",
    skills: ["Java", "TypeScript", "Express.js", "MongoDB", "C/C++"],
  },
  {
    factor: 0.96,
    secondsPerRev: 74,
    direction: 1,
    chipClass: "px-3 py-1.5 text-[11px] text-muted",
    skills: [
      "HTML/CSS",
      "OpenAI API",
      "DeepFace",
      "MediaPipe",
      "Streamlit",
      "Git",
      "Vercel",
    ],
  },
];

type ChipState = {
  el: HTMLDivElement;
  radiusFactor: number;
  angle: number;
  speed: number; // radians per ms
};

export default function Skills() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ringRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Orbit engine — one Anime.js timer positions every chip each frame
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const chips: ChipState[] = [];
    let flatIndex = 0;
    for (const ring of RINGS) {
      const count = ring.skills.length;
      for (let i = 0; i < count; i++) {
        const el = chipRefs.current[flatIndex++];
        if (!el) continue;
        chips.push({
          el,
          radiusFactor: ring.factor,
          angle: (i / count) * Math.PI * 2 + rand(-0.12, 0.12),
          speed:
            (ring.direction * (Math.PI * 2)) / (ring.secondsPerRev * 1000),
        });
      }
    }

    let cx = 0;
    let cy = 0;
    let maxRadius = 0;

    const measure = () => {
      const rect = stage.getBoundingClientRect();
      cx = rect.width / 2;
      cy = rect.height / 2;
      maxRadius = Math.min(rect.width, rect.height) / 2 - 36;
      RINGS.forEach((ring, i) => {
        const el = ringRefs.current[i];
        if (el) {
          const d = maxRadius * ring.factor * 2;
          el.style.width = `${d}px`;
          el.style.height = `${d}px`;
        }
      });
    };
    measure();
    window.addEventListener("resize", measure);

    // hovering the system eases it to slow motion — tactile, not frozen
    let speedScale = 1;
    let targetSpeedScale = 1;
    const onEnter = () => {
      targetSpeedScale = 0.18;
    };
    const onLeave = () => {
      targetSpeedScale = 1;
    };
    stage.addEventListener("mouseenter", onEnter);
    stage.addEventListener("mouseleave", onLeave);

    let last = performance.now();
    const timer = createTimer({
      onUpdate: () => {
        const now = performance.now();
        const dt = Math.min(now - last, 64);
        last = now;
        speedScale += (targetSpeedScale - speedScale) * 0.06;
        for (const chip of chips) {
          chip.angle += chip.speed * dt * speedScale;
          const r = maxRadius * chip.radiusFactor;
          const x = cx + r * Math.cos(chip.angle);
          const y = cy + r * Math.sin(chip.angle);
          chip.el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        }
      },
    });

    return () => {
      timer.cancel();
      window.removeEventListener("resize", measure);
      stage.removeEventListener("mouseenter", onEnter);
      stage.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Entry — core blooms, rings draw, chips pop in with stagger
  useEffect(() => {
    return onceVisible(sectionRef.current, () => {
      animate(".skill-core", {
        opacity: [0, 1],
        scale: [0, 1],
        ease: "outElastic(1, .6)",
        duration: 1200,
      });
      animate(".skill-ring", {
        opacity: [0, 1],
        scale: [0.6, 1],
        ease: "outExpo",
        duration: 1000,
        delay: stagger(150, { start: 200 }),
      });
      animate(".skill-chip-inner", {
        opacity: [0, 1],
        scale: [0, 1],
        ease: "outBack(2)",
        duration: 600,
        delay: stagger(45, { start: 400 }),
      });
    });
  }, []);

  // Click a chip → joyful little pop
  const onChipClick = (e: React.MouseEvent<HTMLDivElement>) => {
    animate(e.currentTarget, {
      scale: [1, 1.35, 1],
      ease: "outElastic(1, .4)",
      duration: 700,
    });
  };

  let flatIndex = -1;

  return (
    <section
      ref={sectionRef}
      id="skills"
      className="mx-auto w-full max-w-6xl px-6 py-28"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-light">
        Skills
      </p>
      <h2 className="font-heading mt-4 text-4xl font-bold tracking-[-0.02em] sm:text-5xl">
        My tech orbit.
      </h2>
      <p className="mt-3 text-sm text-muted">
        Core stack at the center — hover to slow the system down.
      </p>

      <div
        ref={stageRef}
        className="relative mx-auto mt-10 h-[420px] w-full max-w-3xl sm:h-[540px] md:h-[640px]"
      >
        {/* ambient glow behind the system */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 65%)",
          }}
          aria-hidden
        />

        {/* orbit guides */}
        {RINGS.map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              ringRefs.current[i] = el;
            }}
            className="skill-ring pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06] opacity-0"
            aria-hidden
          />
        ))}

        {/* the sun */}
        <div className="skill-core badge-pulse glass absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full opacity-0 sm:h-24 sm:w-24">
          <span className="font-heading text-xl font-bold text-accent-light sm:text-2xl">
            ST
          </span>
        </div>

        {/* orbiting chips */}
        {RINGS.map((ring) =>
          ring.skills.map((skill) => {
            flatIndex++;
            const i = flatIndex;
            return (
              <div
                key={skill}
                ref={(el) => {
                  chipRefs.current[i] = el;
                }}
                className="absolute left-0 top-0 will-change-transform"
                style={{ transform: "translate3d(-200px, -200px, 0)" }}
              >
                <div
                  data-cursor
                  onClick={onChipClick}
                  className={`skill-chip-inner glass cursor-pointer whitespace-nowrap rounded-full opacity-0 transition-shadow duration-300 hover:shadow-[0_0_24px_rgba(99,102,241,0.45)] ${ring.chipClass}`}
                >
                  {skill}
                </div>
              </div>
            );
          }),
        )}
      </div>
    </section>
  );
}
