"use client";

import { useEffect, useState } from "react";
import { on, type ToastPayload } from "@/lib/bus";

type Toast = ToastPayload & { id: number };

let counter = 0;

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return on("toast", (payload) => {
      const t = payload as ToastPayload;
      const id = ++counter;
      setToasts((s) => [...s, { ...t, id }]);
      setTimeout(() => {
        setToasts((s) => s.filter((x) => x.id !== id));
      }, 3400);
    });
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[10008] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in glass flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm text-foreground shadow-[0_0_24px_var(--glow-soft)]"
        >
          {t.emoji && <span aria-hidden>{t.emoji}</span>}
          {t.message}
        </div>
      ))}
    </div>
  );
}
