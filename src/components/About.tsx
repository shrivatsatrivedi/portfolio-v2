"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { onceVisible } from "@/lib/animations";

const STATS = [
  { value: "1", label: "Internship @ InMobi Group" },
  { value: "🏆", label: "Dean's Excellence Award" },
  { value: "4", label: "Projects Shipped" },
  { value: "3", label: "Certifications Earned" },
];

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    return onceVisible(sectionRef.current, () => {
      animate(".about-text", {
        opacity: [0, 1],
        translateY: [30, 0],
        ease: "outExpo",
        duration: 800,
        delay: stagger(120),
      });
      animate(".about-stat", {
        opacity: [0, 1],
        translateY: [30, 0],
        ease: "outExpo",
        duration: 700,
        delay: stagger(80, { start: 200 }),
      });
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="mx-auto w-full max-w-6xl px-6 py-28"
    >
      <div className="grid items-center gap-14 md:grid-cols-2">
        <div>
          <p className="about-text text-xs font-semibold uppercase tracking-[0.25em] text-accent-light opacity-0">
            About
          </p>
          <h2 className="about-text font-heading mt-4 text-4xl font-bold tracking-[-0.02em] opacity-0 sm:text-5xl">
            I build things that think.
          </h2>
          <p className="about-text mt-6 leading-relaxed text-muted opacity-0">
            I&apos;m a software engineer and final-year CS student based in
            Jaipur, passionate about full-stack development and AI-powered
            products. I&apos;ve shipped production code at Glance (InMobi
            Group), won the Dean&apos;s Excellence Award for academic
            performance, and built everything from emotion-aware AI to
            real-time productivity tools.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="about-stat glass glow-hover rounded-2xl p-6 opacity-0"
            >
              <div className="font-heading text-4xl font-bold text-accent-light">
                {stat.value}
              </div>
              <div className="mt-2 text-sm text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
