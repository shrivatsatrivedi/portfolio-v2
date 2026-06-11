"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { onceVisible } from "@/lib/animations";

const SCHOOLS = [
  {
    name: "Manipal University Jaipur",
    degree: "B.Tech, Computer & Communication Engineering",
    dates: "Sept 2022 – June 2026",
    highlight:
      "🏆 Dean's Excellence Award — Highest band GPA in the department",
  },
  {
    name: "Jai Hind College, Mumbai",
    degree: "Higher Secondary Certificate (HSC)",
    dates: "Aug 2020 – May 2022",
  },
  {
    name: "Campion School, Mumbai",
    degree: "Indian Certificate of Secondary Education (ICSE)",
    dates: "Aug 2018 – June 2020",
  },
];

export default function Education() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    return onceVisible(sectionRef.current, () => {
      animate(".edu-card", {
        opacity: [0, 1],
        rotateX: [-75, 0],
        translateY: [50, 0],
        ease: "outExpo",
        duration: 900,
        delay: stagger(100),
      });
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      id="education"
      className="mx-auto w-full max-w-6xl px-6 py-28"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-light">
        Education
      </p>
      <h2 className="font-heading mt-4 text-4xl font-bold tracking-[-0.02em] sm:text-5xl">
        Where I learned.
      </h2>

      <div
        className="mt-14 grid gap-6 md:grid-cols-3"
        style={{ perspective: "1000px" }}
      >
        {SCHOOLS.map((school) => (
          <div
            key={school.name}
            className="edu-card glass glow-hover flex flex-col rounded-2xl p-7 opacity-0"
            style={{ transformOrigin: "bottom center" }}
          >
            <h3 className="font-heading text-lg font-semibold tracking-[-0.02em]">
              {school.name}
            </h3>
            <p className="mt-2 text-sm text-muted">{school.degree}</p>
            <p className="mt-1 text-xs text-muted">{school.dates}</p>
            {school.highlight && (
              <p className="mt-4 rounded-lg bg-accent/10 px-3 py-2 text-xs leading-relaxed text-accent-light">
                {school.highlight}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
