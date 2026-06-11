import { animate, stagger } from "animejs";

type Targets = Parameters<typeof animate>[0];

export const rand = (min: number, max: number) =>
  Math.random() * (max - min) + min;

export function fadeInUp(targets: Targets, delay = 0) {
  return animate(targets, {
    opacity: [0, 1],
    translateY: [40, 0],
    ease: "outExpo",
    duration: 800,
    delay,
  });
}

export function fadeIn(targets: Targets, delay = 0) {
  return animate(targets, {
    opacity: [0, 1],
    ease: "outExpo",
    duration: 600,
    delay,
  });
}

export function staggerFadeInUp(targets: Targets, staggerMs = 100, start = 0) {
  return animate(targets, {
    opacity: [0, 1],
    translateY: [30, 0],
    ease: "outExpo",
    duration: 700,
    delay: stagger(staggerMs, { start }),
  });
}

export function slideInLeft(targets: Targets, delay = 0) {
  return animate(targets, {
    opacity: [0, 1],
    translateX: [-60, 0],
    ease: "outExpo",
    duration: 800,
    delay,
  });
}

export function scaleIn(targets: Targets, delay = 0) {
  return animate(targets, {
    opacity: [0, 1],
    scale: [0.85, 1],
    ease: "outExpo",
    duration: 700,
    delay,
  });
}

/**
 * Runs `cb` once when `el` first scrolls into view.
 * Returns a cleanup function for useEffect.
 */
export function onceVisible(
  el: Element | null,
  cb: () => void,
  threshold = 0.15,
) {
  if (!el) return () => {};
  if (typeof IntersectionObserver === "undefined") {
    cb();
    return () => {};
  }
  const obs = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          obs.disconnect();
          cb();
          break;
        }
      }
    },
    { threshold },
  );
  obs.observe(el);
  return () => obs.disconnect();
}
