"use client";

import { useEffect, useRef } from "react";
import { animate, stagger, createAnimatable } from "animejs";
import { onceVisible } from "@/lib/animations";

const MAX_TILT = 10;

const PROJECTS = [
  {
    title: "Emotion-Aware Conversational AI",
    stack: ["Python", "OpenAI API", "DeepFace", "Streamlit"],
    meta: "August 2025",
    repo: "https://github.com/shrivatsatrivedi/EmotionAwareLLM-Frontend",
    live: null,
    description:
      "Real-time facial emotion detection via webcam + context-aware empathetic responses from GPT. Built with an interactive Streamlit UI supporting live camera + chat.",
  },
  {
    title: "FocusCycle Pomodoro",
    stack: ["Next.js", "TypeScript", "MediaPipe", "Vercel KV"],
    meta: "Live",
    repo: "https://github.com/shrivatsatrivedi/focus-partner",
    live: "https://focus-partner.vercel.app/",
    description:
      "Productivity app with an accountability buddy system — uses face detection and tab-switch monitoring to enforce focus. Passwordless JWT auth, real-time exit approval, Redis session state.",
  },
  {
    title: "MERN Blog Application",
    stack: ["MongoDB", "Express.js", "React.js", "Node.js"],
    meta: "November 2024",
    repo: "https://github.com/shrivatsatrivedi/blog-app",
    live: null,
    description:
      "Full-stack blog with JWT-based auth, RESTful APIs, responsive React frontend, and MongoDB for CRUD operations.",
  },
  {
    title: "This Portfolio",
    stack: ["Next.js", "TypeScript", "Tailwind", "Anime.js"],
    meta: "2026",
    repo: "https://github.com/shrivatsatrivedi/portfolio",
    live: null,
    description:
      "You're looking at it. Cinematic dark portfolio with particle physics, letter-stagger animations, and 3D card tilt.",
  },
];

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}

export default function Projects() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll reveal
  useEffect(() => {
    return onceVisible(sectionRef.current, () => {
      animate(".project-card", {
        opacity: [0, 1],
        translateY: [40, 0],
        ease: "outExpo",
        duration: 800,
        delay: stagger(120),
      });
    });
  }, []);

  // Anime.js 3D tilt
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    for (const card of cardRefs.current) {
      if (!card) continue;
      const tilt = createAnimatable(card, {
        rotateX: 120,
        rotateY: 120,
        ease: "outQuad",
      });

      const onMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        tilt.rotateY(px * MAX_TILT * 2);
        tilt.rotateX(-py * MAX_TILT * 2);
      };
      const onLeave = () => {
        tilt.rotateX(0, 600, "outElastic(1, .5)");
        tilt.rotateY(0, 600, "outElastic(1, .5)");
      };

      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        card.removeEventListener("mousemove", onMove);
        card.removeEventListener("mouseleave", onLeave);
        tilt.revert();
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  const openRepo = (repo: string) => {
    window.open(repo, "_blank", "noopener,noreferrer");
  };

  return (
    <section
      ref={sectionRef}
      id="projects"
      className="mx-auto w-full max-w-6xl px-6 py-28"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-light">
        Projects
      </p>
      <h2 className="font-heading mt-4 text-4xl font-bold tracking-[-0.02em] sm:text-5xl">
        Things I&apos;ve built.
      </h2>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {PROJECTS.map((project, i) => (
          <div key={project.title} style={{ perspective: "800px" }}>
            <div
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              role="link"
              tabIndex={0}
              data-cursor
              aria-label={`${project.title} — view source on GitHub`}
              onClick={() => openRepo(project.repo)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openRepo(project.repo);
                }
              }}
              className="project-card glass glow-hover flex h-full flex-col rounded-2xl p-8 opacity-0"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-heading text-xl font-semibold tracking-[-0.02em]">
                  {project.title}
                </h3>
                <a
                  href={project.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted transition-colors hover:text-accent-light"
                  aria-label={`${project.title} on GitHub`}
                >
                  <GitHubIcon />
                </a>
              </div>

              <div className="mt-1 flex items-center gap-3 text-xs font-medium text-accent-light">
                {project.meta === "Live" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-light" />
                    Live
                  </span>
                ) : (
                  project.meta
                )}
                {project.live && (
                  <a
                    href={project.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="link-underline inline-flex items-center gap-1 text-foreground/80 hover:text-accent-light"
                  >
                    Visit site ↗
                  </a>
                )}
              </div>

              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">
                {project.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {project.stack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent-light"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
