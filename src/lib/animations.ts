import type { AnimeParams } from "animejs";

export function fadeInUp(targets: string | Element | Element[], delay = 0): AnimeParams {
  return {
    targets,
    opacity: [0, 1],
    translateY: [40, 0],
    easing: "easeOutExpo",
    duration: 800,
    delay,
  };
}

export function fadeIn(targets: string | Element | Element[], delay = 0): AnimeParams {
  return {
    targets,
    opacity: [0, 1],
    easing: "easeOutExpo",
    duration: 600,
    delay,
  };
}

export function staggerFadeInUp(targets: string, stagger = 100): AnimeParams {
  return {
    targets,
    opacity: [0, 1],
    translateY: [30, 0],
    easing: "easeOutExpo",
    duration: 700,
    delay: (_el: Element, i: number) => i * stagger,
  };
}

export function slideInLeft(targets: string | Element | Element[], delay = 0): AnimeParams {
  return {
    targets,
    opacity: [0, 1],
    translateX: [-60, 0],
    easing: "easeOutExpo",
    duration: 800,
    delay,
  };
}

export function scaleIn(targets: string | Element | Element[], delay = 0): AnimeParams {
  return {
    targets,
    opacity: [0, 1],
    scale: [0.85, 1],
    easing: "easeOutExpo",
    duration: 700,
    delay,
  };
}
