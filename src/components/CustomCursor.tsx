"use client";

import { useEffect, useRef } from "react";

const RING_LERP = 0.16;
const SCALE_LERP = 0.2;
const INTERACTIVE = "a, button, input, textarea, label, [data-cursor]";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const mouse = { x: -100, y: -100 };
    const ringPos = { x: -100, y: -100 };
    let dotScale = 1;
    let targetDotScale = 1;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const onOver = (e: MouseEvent) => {
      const hovering = !!(e.target as Element).closest?.(INTERACTIVE);
      targetDotScale = hovering ? 2.4 : 1;
      ring.style.backgroundColor = hovering
        ? "rgba(99, 102, 241, 0.12)"
        : "transparent";
      ring.style.borderColor = hovering
        ? "rgba(129, 140, 248, 0.9)"
        : "rgba(99, 102, 241, 0.7)";
    };

    // transform-only updates keep everything on the compositor —
    // no layout work per frame, unlike animating left/top
    const loop = () => {
      ringPos.x += (mouse.x - ringPos.x) * RING_LERP;
      ringPos.y += (mouse.y - ringPos.y) * RING_LERP;
      dotScale += (targetDotScale - dotScale) * SCALE_LERP;
      dot.style.transform = `translate3d(${mouse.x - 5}px, ${mouse.y - 5}px, 0) scale(${dotScale})`;
      ring.style.transform = `translate3d(${ringPos.x - 18}px, ${ringPos.y - 18}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="custom-cursor pointer-events-none fixed left-0 top-0 z-[10001] h-[10px] w-[10px] rounded-full bg-accent will-change-transform"
        style={{ transform: "translate3d(-100px, -100px, 0)" }}
        aria-hidden
      />
      <div
        ref={ringRef}
        className="custom-cursor pointer-events-none fixed left-0 top-0 z-[10000] h-9 w-9 rounded-full border transition-colors duration-200 will-change-transform"
        style={{
          transform: "translate3d(-100px, -100px, 0)",
          borderColor: "rgba(99, 102, 241, 0.7)",
        }}
        aria-hidden
      />
    </>
  );
}
