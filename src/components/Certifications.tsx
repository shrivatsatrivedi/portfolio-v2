"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { onceVisible } from "@/lib/animations";

const CERTS = [
  {
    title: "Foundations of Data Science",
    issuer: "Google via Coursera",
    date: "Oct 2024",
    initial: "G",
  },
  {
    title: "Introduction to Software Engineering",
    issuer: "IBM via Coursera",
    date: "Oct 2024",
    initial: "IBM",
  },
];

export default function Certifications() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    return onceVisible(sectionRef.current, () => {
      animate(".cert-card", {
        opacity: [0, 1],
        translateY: [30, 0],
        ease: "outExpo",
        duration: 700,
        delay: stagger(120),
      });
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      id="certifications"
      className="mx-auto w-full max-w-6xl px-6 py-28"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-light">
        Certifications
      </p>
      <h2 className="font-heading mt-4 text-4xl font-bold tracking-[-0.02em] sm:text-5xl">
        Credentials.
      </h2>

      <div className="mt-14 grid gap-6 sm:grid-cols-2">
        {CERTS.map((cert) => (
          <div
            key={cert.title}
            className="cert-card glass glow-hover flex items-center gap-5 rounded-2xl p-6 opacity-0"
          >
            <div className="font-heading flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent-light">
              {cert.initial}
            </div>
            <div>
              <h3 className="font-heading font-semibold tracking-[-0.02em]">
                {cert.title}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {cert.issuer} · {cert.date}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
