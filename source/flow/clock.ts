/* Timers that keep running while the tab is behind other windows.
   A hidden tab throttles its own timers and stops its rAF. A visible PiP window does not, and the two share one thread,
   so when a PiP window is open every timer runs on it. See BRIEF.md, PIP facts. */

let host: Window = window;
const switched = new Set<() => void>();

export const clock = {
  /* the PiP code calls this on open, and with null on close */
  useWindow(w: Window | null) {
    host = w ?? window;
    switched.forEach((f) => f());
  },
  /* a closed PiP window takes its pending timers with it: anyone holding a wait re-arms here */
  onSwitch(f: () => void): () => void {
    switched.add(f);
    return () => switched.delete(f);
  },
  setTimeout(fn: () => void, ms: number): number {
    return host.setTimeout(fn, ms);
  },
  clearTimeout(id: number) {
    /* an id belongs to the window that made it, clear both */
    window.clearTimeout(id);
    if (host !== window) host.clearTimeout(id);
  },
  setInterval(fn: () => void, ms: number): number {
    return host.setInterval(fn, ms);
  },
  clearInterval(id: number) {
    window.clearInterval(id);
    if (host !== window) host.clearInterval(id);
  },
  raf(fn: FrameRequestCallback): number {
    return host.requestAnimationFrame(fn);
  },
  cancelRaf(id: number) {
    window.cancelAnimationFrame(id);
    if (host !== window) host.cancelAnimationFrame(id);
  },
  wait(ms: number): Promise<void> {
    return new Promise((r) => {
      clock.setTimeout(r, ms);
    });
  },
};
