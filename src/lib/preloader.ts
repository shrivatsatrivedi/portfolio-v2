// Lets the Hero (and anything else) wait for the intro loader to finish
// before starting its own entrance animations.

let done = false;
const listeners: (() => void)[] = [];

export function markPreloaderDone() {
  if (done) return;
  done = true;
  const pending = listeners.splice(0, listeners.length);
  pending.forEach((cb) => cb());
}

export function onPreloaderDone(cb: () => void): () => void {
  if (done) {
    cb();
    return () => {};
  }
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
}
