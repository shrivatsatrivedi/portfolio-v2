import { emit } from "@/lib/bus";

// Accent themes — every glow, border, button, and even the hero particle
// field re-colors live because everything derives from these two variables.
export const ACCENTS = [
  { name: "Nebula", accent: "#6366f1", light: "#818cf8" },
  { name: "Ion", accent: "#06b6d4", light: "#22d3ee" },
  { name: "Pulsar", accent: "#d946ef", light: "#e879f9" },
  { name: "Nova", accent: "#f43f5e", light: "#fb7185" },
  { name: "Solar", accent: "#f59e0b", light: "#fbbf24" },
];

const STORAGE_KEY = "st-accent";

function apply(index: number) {
  const theme = ACCENTS[index % ACCENTS.length];
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-light", theme.light);
  localStorage.setItem(STORAGE_KEY, String(index % ACCENTS.length));
  emit("accent:changed");
  return theme;
}

export function restoreAccent() {
  const saved = Number(localStorage.getItem(STORAGE_KEY));
  if (Number.isInteger(saved) && saved > 0 && saved < ACCENTS.length) {
    apply(saved);
  }
}

export function cycleAccent(): string {
  const current = Number(localStorage.getItem(STORAGE_KEY)) || 0;
  return apply((current + 1) % ACCENTS.length).name;
}
