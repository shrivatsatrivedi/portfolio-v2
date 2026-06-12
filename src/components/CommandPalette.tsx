"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate } from "animejs";
import { on, emit, toast } from "@/lib/bus";
import { cycleAccent } from "@/lib/accents";
import { confettiBurst } from "@/lib/confetti";

type Command = {
  id: string;
  label: string;
  hint?: string;
  emoji: string;
  group: string;
  keywords?: string;
  action: () => void;
};

const EMAIL = "shrivatsatrivedi@gmail.com";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);

  const setOpenSync = (v: boolean) => {
    openRef.current = v;
    setOpen(v);
    if (v) {
      setQuery("");
      setSelected(0);
    }
  };

  const commands = useMemo<Command[]>(
    () => [
      // Navigate
      { id: "nav-home", label: "Home", emoji: "🏠", group: "Navigate", action: () => scrollTo("hero") },
      { id: "nav-about", label: "About", emoji: "👤", group: "Navigate", action: () => scrollTo("about") },
      { id: "nav-exp", label: "Experience", emoji: "💼", group: "Navigate", action: () => scrollTo("experience") },
      { id: "nav-proj", label: "Projects", emoji: "🛠️", group: "Navigate", action: () => scrollTo("projects") },
      { id: "nav-skills", label: "Skills", emoji: "🪐", group: "Navigate", keywords: "orbit tech", action: () => scrollTo("skills") },
      { id: "nav-edu", label: "Education", emoji: "🎓", group: "Navigate", action: () => scrollTo("education") },
      { id: "nav-certs", label: "Certifications", emoji: "📜", group: "Navigate", action: () => scrollTo("certifications") },
      { id: "nav-contact", label: "Contact", emoji: "✉️", group: "Navigate", action: () => scrollTo("contact") },
      // Connect
      {
        id: "copy-email",
        label: "Copy email address",
        hint: EMAIL,
        emoji: "📋",
        group: "Connect",
        action: () => {
          navigator.clipboard
            .writeText(EMAIL)
            .then(() => toast("Email copied to clipboard", "✓"))
            .catch(() => toast("Couldn't copy — " + EMAIL, "📧"));
        },
      },
      {
        id: "resume",
        label: "View résumé",
        hint: "resume.pdf",
        emoji: "📄",
        group: "Connect",
        keywords: "cv resume download",
        action: () => window.open("/resume.pdf", "_blank", "noopener,noreferrer"),
      },
      {
        id: "github",
        label: "Open GitHub",
        hint: "shrivatsatrivedi",
        emoji: "🐙",
        group: "Connect",
        action: () => window.open("https://github.com/shrivatsatrivedi", "_blank", "noopener,noreferrer"),
      },
      {
        id: "linkedin",
        label: "Open LinkedIn",
        emoji: "💼",
        group: "Connect",
        action: () => window.open("https://linkedin.com/in/shrivatsa", "_blank", "noopener,noreferrer"),
      },
      // Fun
      {
        id: "game",
        label: "Play: Stack Breaker",
        hint: "built into the page",
        emoji: "🕹️",
        group: "Fun",
        keywords: "game play arcade breakout",
        action: () => scrollTo("arcade"),
      },
      {
        id: "warp",
        label: "Engage warp drive",
        emoji: "🚀",
        group: "Fun",
        keywords: "hyperspace stars",
        action: () => emit("warp"),
      },
      {
        id: "accent",
        label: "Shift the nebula",
        hint: "cycle accent color",
        emoji: "🎨",
        group: "Fun",
        keywords: "theme color accent",
        action: () => toast(`Accent shifted: ${cycleAccent()}`, "🎨"),
      },
      {
        id: "hire",
        label: "sudo hire-me",
        hint: "run with privileges",
        emoji: "⚡",
        group: "Fun",
        keywords: "sudo hire job",
        action: () => {
          confettiBurst();
          toast("Access granted. Routing to contact…", "⚡");
          setTimeout(() => scrollTo("contact"), 600);
        },
      },
      {
        id: "whoami",
        label: "whoami",
        emoji: "🛸",
        group: "Fun",
        action: () => toast("A future teammate, hopefully", "🛸"),
      },
      {
        id: "konami",
        label: "Cheat codes?",
        emoji: "👾",
        group: "Fun",
        keywords: "konami secret easter egg",
        action: () => toast("Try: ↑ ↑ ↓ ↓ ← → ← → B A", "👾"),
      },
    ],
    [],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) =>
      (c.label + " " + (c.keywords ?? "") + " " + c.group)
        .toLowerCase()
        .includes(q),
    );
  }, [commands, query]);

  // global hotkey + bus toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenSync(!openRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    const offBus = on("palette:toggle", () => setOpenSync(!openRef.current));
    return () => {
      window.removeEventListener("keydown", onKey);
      offBus();
    };
     
  }, []);

  // open side effects — focus + entrance animation only
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    if (panelRef.current) {
      animate(panelRef.current, {
        opacity: [0, 1],
        scale: [0.96, 1],
        translateY: [-10, 0],
        ease: "outQuad",
        duration: 220,
      });
    }
    return () => clearTimeout(t);
  }, [open]);

  // keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenSync(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => (s + 1) % Math.max(filtered.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected(
          (s) =>
            (s - 1 + Math.max(filtered.length, 1)) %
            Math.max(filtered.length, 1),
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[selected];
        if (cmd) {
          setOpenSync(false);
          cmd.action();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
     
  }, [open, filtered, selected]);

  // keep selection in view
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [selected, filtered]);

  if (!open) return null;

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-[10005] flex items-start justify-center px-4 pt-[16vh]"
      onClick={() => setOpenSync(false)}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="glass relative w-full max-w-xl overflow-hidden rounded-2xl shadow-[0_0_60px_var(--glow-soft)]"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <span className="text-accent-light" aria-hidden>
            ✦
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            placeholder="Type a command or search…"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            aria-label="Command palette search"
          />
          <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-muted">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Nothing found. Try “warp”, “game”, or “hire”.
            </p>
          )}
          {filtered.map((cmd, i) => {
            const showGroup = cmd.group !== lastGroup;
            lastGroup = cmd.group;
            return (
              <div key={cmd.id}>
                {showGroup && (
                  <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                    {cmd.group}
                  </p>
                )}
                <button
                  data-selected={i === selected}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => {
                    setOpenSync(false);
                    cmd.action();
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    i === selected
                      ? "bg-accent/15 text-foreground"
                      : "text-muted"
                  }`}
                >
                  <span aria-hidden>{cmd.emoji}</span>
                  <span className="flex-1">{cmd.label}</span>
                  {cmd.hint && (
                    <span className="text-xs text-muted">{cmd.hint}</span>
                  )}
                  {i === selected && (
                    <span className="text-xs text-accent-light" aria-hidden>
                      ↵
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-5 py-2.5 text-[10px] text-muted">
          <span>↑↓ navigate · ↵ run</span>
          <span className="text-accent-light">shrivatsa@portfolio:~$</span>
        </div>
      </div>
    </div>
  );
}
