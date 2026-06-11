"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { onceVisible } from "@/lib/animations";

const EMAIL = "shrivatsatrivedi@gmail.com";

const LINKS = [
  {
    label: EMAIL,
    href: `mailto:${EMAIL}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    ),
  },
  {
    label: "+91 70451 03001",
    href: "tel:+917045103001",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
      </svg>
    ),
  },
  {
    label: "linkedin.com/in/shrivatsa",
    href: "https://linkedin.com/in/shrivatsa",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
      </svg>
    ),
  },
  {
    label: "github.com/shrivatsatrivedi",
    href: "https://github.com/shrivatsatrivedi",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
      </svg>
    ),
  },
];

export default function Contact() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    return onceVisible(sectionRef.current, () => {
      animate(".contact-reveal", {
        opacity: [0, 1],
        translateY: [30, 0],
        ease: "outExpo",
        duration: 700,
        delay: stagger(60),
      });
    });
  }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const subject = encodeURIComponent(
      `Portfolio contact from ${data.get("name")}`,
    );
    const body = encodeURIComponent(
      `${data.get("message")}\n\n— ${data.get("name")} (${data.get("email")})`,
    );
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
  };

  const inputClass =
    "glass w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40 transition-colors bg-transparent";

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="mx-auto w-full max-w-6xl px-6 pb-16 pt-28"
    >
      <p className="contact-reveal text-xs font-semibold uppercase tracking-[0.25em] text-accent-light opacity-0">
        Contact
      </p>
      <h2 className="contact-reveal font-heading mt-4 text-4xl font-bold tracking-[-0.02em] opacity-0 sm:text-5xl">
        Let&apos;s build something.
      </h2>
      <p className="contact-reveal mt-4 max-w-xl text-muted opacity-0">
        Always open to interesting conversations — internships, projects, or
        just a good chat about tech.
      </p>

      <div className="mt-14 grid gap-14 md:grid-cols-2">
        {/* Contact links */}
        <ul className="flex flex-col gap-5">
          {LINKS.map((link) => (
            <li key={link.label} className="contact-reveal opacity-0">
              <a
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={
                  link.href.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
                className="group inline-flex items-center gap-4 text-muted transition-colors hover:text-foreground"
              >
                <span className="glass flex h-11 w-11 items-center justify-center rounded-full text-accent-light transition-colors group-hover:border-accent/50">
                  {link.icon}
                </span>
                <span className="link-underline text-sm">{link.label}</span>
              </a>
            </li>
          ))}
        </ul>

        {/* Form */}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            name="name"
            placeholder="Name"
            required
            className={`contact-reveal opacity-0 ${inputClass}`}
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            className={`contact-reveal opacity-0 ${inputClass}`}
          />
          <textarea
            name="message"
            placeholder="Message"
            required
            rows={5}
            className={`contact-reveal resize-none opacity-0 ${inputClass}`}
          />
          <button
            type="submit"
            className="contact-reveal shimmer-btn glow-hover rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-white opacity-0 transition-colors hover:bg-accent-light"
          >
            Send
          </button>
        </form>
      </div>

      <p className="mt-24 text-center text-xs text-muted">
        © 2026 Shrivatsa Trivedi · Built with Next.js, Tailwind &amp; Anime.js
      </p>
    </section>
  );
}
