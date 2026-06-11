"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { onceVisible, rand } from "@/lib/animations";

type Size = "lg" | "md" | "sm";

const SKILLS: { name: string; size: Size }[] = [
  { name: "JavaScript", size: "lg" },
  { name: "Python", size: "lg" },
  { name: "React", size: "lg" },
  { name: "Next.js", size: "lg" },
  { name: "Node.js", size: "lg" },
  { name: "Java", size: "md" },
  { name: "TypeScript", size: "md" },
  { name: "Express.js", size: "md" },
  { name: "MongoDB", size: "md" },
  { name: "C/C++", size: "md" },
  { name: "HTML/CSS", size: "sm" },
  { name: "OpenAI API", size: "sm" },
  { name: "DeepFace", size: "sm" },
  { name: "MediaPipe", size: "sm" },
  { name: "Streamlit", size: "sm" },
  { name: "Git", size: "sm" },
  { name: "Vercel", size: "sm" },
];

const SIZE_CLASSES: Record<Size, string> = {
  lg: "h-28 w-28 text-sm",
  md: "h-24 w-24 text-xs",
  sm: "h-20 w-20 text-[11px]",
};

export default function Skills() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    return onceVisible(sectionRef.current, () => {
      animate(".skill-bubble", {
        opacity: [0, 1],
        scale: [0.4, 1],
        translateX: [() => rand(-160, 160), 0],
        translateY: [() => rand(60, 180), 0],
        ease: "outExpo",
        duration: 900,
        delay: stagger(40),
        onComplete: () => {
          // gentle infinite drift, each bubble on its own orbit-like path
          document
            .querySelectorAll<HTMLElement>(".skill-bubble")
            .forEach((bubble) => {
              animate(bubble, {
                translateX: rand(-12, 12),
                translateY: rand(-16, 16),
                duration: rand(8000, 16000),
                ease: "inOutSine",
                loop: true,
                alternate: true,
              });
            });
        },
      });
    });
  }, []);

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
        Tools of the trade.
      </h2>

      <div className="mt-16 flex flex-wrap items-center justify-center gap-5">
        {SKILLS.map((skill) => (
          <div key={skill.name} className="skill-bubble opacity-0">
            <div
              className={`glass flex items-center justify-center rounded-full text-center font-medium text-foreground transition-all duration-300 hover:scale-110 hover:border-accent/60 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] ${SIZE_CLASSES[skill.size]}`}
            >
              {skill.name}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
