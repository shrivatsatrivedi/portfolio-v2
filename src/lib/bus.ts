// Tiny event bus — lets the command palette, easter eggs, and canvas
// effects talk to each other without prop drilling.

type Handler = (payload?: unknown) => void;

const handlers = new Map<string, Set<Handler>>();

export function on(event: string, handler: Handler): () => void {
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
  }
  set.add(handler);
  return () => {
    set.delete(handler);
  };
}

export function emit(event: string, payload?: unknown) {
  handlers.get(event)?.forEach((h) => h(payload));
}

export type ToastPayload = { message: string; emoji?: string };

export function toast(message: string, emoji?: string) {
  emit("toast", { message, emoji } satisfies ToastPayload);
}
