"use client";

import { useEffect, useRef } from "react";

const LERP = 0.15;
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
    let hovering = false;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const onOver = (e: MouseEvent) => {
      hovering = !!(e.target as Element).closest?.(INTERACTIVE);
      dot.style.transform = `translate(-50%, -50%) scale(${hovering ? 2.4 : 1})`;
      ring.style.backgroundColor = hovering
        ? "rgba(99, 102, 241, 0.12)"
        : "transparent";
      ring.style.borderColor = hovering
        ? "rgba(129, 140, 248, 0.9)"
        : "rgba(99, 102, 241, 0.7)";
    };

    const loop = () => {
      ringPos.x += (mouse.x - ringPos.x) * LERP;
      ringPos.y += (mouse.y - ringPos.y) * LERP;
      dot.style.left = `${mouse.x}px`;
      dot.style.top = `${mouse.y}px`;
      ring.style.left = `${ringPos.x}px`;
      ring.style.top = `${ringPos.y}px`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
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
        className="custom-cursor pointer-events-none fixed z-[10001] h-[10px] w-[10px] rounded-full bg-accent transition-transform duration-200"
        style={{ left: -100, top: -100, transform: "translate(-50%, -50%)" }}
        aria-hidden
      />
      <div
        ref={ringRef}
        className="custom-cursor pointer-events-none fixed z-[10000] h-9 w-9 rounded-full border transition-colors duration-200"
        style={{
          left: -100,
          top: -100,
          transform: "translate(-50%, -50%)",
          borderColor: "rgba(99, 102, 241, 0.7)",
        }}
        aria-hidden
      />
    </>
  );
}
