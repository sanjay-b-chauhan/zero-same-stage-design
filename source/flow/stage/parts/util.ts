/* Shared helpers for the stage parts. Everything here is safe in the PiP document:
   it works from the element it is given, never from the global window or document. */

/* critically damped, response .4, over 700 ms. The same curve as --z-spring in theme.css. */
export const SPRING =
  'linear(0, 0.1057, 0.3008, 0.4909, 0.6452, 0.7601, 0.8412, 0.8967, 0.9336, 0.9578, 0.9734, 0.9833, 0.9896, 0.9936, 0.996, 0.9976, 0.9985, 0.9991, 0.9995, 0.9997, 1)';
export const SPRING_MS = 700;

/* damping .8, response .3, over 520 ms. A hair of overshoot, for the moments that reward. */
export const SNAP =
  'linear(0, 0.0807, 0.252, 0.4425, 0.615, 0.7538, 0.8564, 0.9267, 0.9713, 0.997, 1.0098, 1.0146, 1.0149, 1.0128, 1.01, 1.0072, 1.0048, 1.0029, 1.0016, 1.0008, 1.0002, 0.9999, 0.9998, 0.9998, 1)';
export const SNAP_MS = 520;

/* damping .7, response .3, over 460 ms. One firm overshoot and still, for the moments that land: a tick, a file, her reaction */
export const FIRM =
  'linear(0, 0.0665, 0.218, 0.3994, 0.5759, 0.7281, 0.848, 0.9348, 0.9922, 1.0259, 1.0419, 1.046, 1.0427, 1.0356, 1.0273, 1.0192, 1.0122, 1.0068, 1.0029, 1.0003, 0.9988, 0.9981, 0.9979, 0.998, 1)';
export const FIRM_MS = 460;

export const prefersReduced = (el: Element): boolean => {
  try {
    return !!el.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

interface RiseOpts {
  y?: number;
  blur?: number;
  scale?: number;
  delay?: number;
  ms?: number;
  easing?: string;
}

/* Arrives from below, blur to sharp. Never a plain fade. */
export function rise(el: Element | null, o: RiseOpts = {}): void {
  if (!el || prefersReduced(el)) return;
  const { y = 10, blur = 6, scale = 1, delay = 0, ms = SPRING_MS, easing = SPRING } = o;
  el.animate(
    [
      { transform: `translateY(${y}px) scale(${scale})`, filter: `blur(${blur}px)`, opacity: 0 },
      { transform: 'translateY(0) scale(1)', filter: 'blur(0px)', opacity: 1 },
    ],
    { duration: ms, delay, easing, fill: 'backwards' }
  );
}

/* Scales in from its own centre with a small overshoot. */
export function pop(el: Element | null, from = 0.9, delay = 0): void {
  if (!el || prefersReduced(el)) return;
  el.animate([{ transform: `scale(${from})` }, { transform: 'scale(1)' }], {
    duration: SNAP_MS,
    delay,
    easing: SNAP,
    fill: 'backwards',
  });
}

/* Lands from small and soft to its size and sharp, on the firm spring. Once, never a loop. */
export function land(el: Element | null, from = 0.4, delay = 0, blur = 4): void {
  if (!el || prefersReduced(el)) return;
  el.animate(
    [
      { transform: `scale(${from})`, filter: `blur(${blur}px)` },
      { transform: 'scale(1)', filter: 'blur(0px)' },
    ],
    { duration: FIRM_MS, delay, easing: FIRM, fill: 'backwards' }
  );
}

/* Height glide between two measured heights, for rows that change shape. */
export function glideHeight(el: HTMLElement | null, fromH: number): void {
  if (!el || prefersReduced(el)) return;
  const to = el.getBoundingClientRect().height;
  if (Math.abs(to - fromH) < 1) return;
  el.animate([{ height: `${fromH}px` }, { height: `${to}px` }], {
    duration: SPRING_MS,
    easing: SPRING,
  });
}

export const isTextEntry = (t: EventTarget | null): boolean => {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable === true;
};

/* m:ss from milliseconds */
export const mss = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/* 00:07, the real voice note format */
export const mmss = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/* what a stage ends in: .csv keeps its dot, Link is a word */
export const typeTag = (t: string): string => (t.toLowerCase() === 'link' ? 'Link' : `.${t.replace(/^\./, '')}`);
export const takesLink = (t: string | undefined): boolean => t?.toLowerCase() === 'link';

export const firstName = (full: string): string => full.split(' ')[0] ?? full;

/* Same input, same bars. Never reshuffles on a remount. */
export const seededBars = (seed: string, n: number): number[] => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    out.push(8 + (Math.abs(h) % 17));
  }
  return out;
};

export const fileIcon = (kind: string): string | null => {
  if (kind === 'csv') return 'static/logos/f-csv.svg';
  if (kind === 'text') return 'static/logos/f-md.svg';
  return null;
};

/* A redacted line for an empty slot: three to five dashes of varied length, seeded so they never reshuffle.
   The seed is the slot's place, never its answer, so the shape gives nothing away. */
export const seededDashes = (seed: string): number[] => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const n = 3 + Math.floor(next() * 3);
  return Array.from({ length: n }, () => 14 + Math.round(next() * 34));
};

/* host and path of a link, for a card */
export const hostPath = (url: string | undefined): { host: string; path: string } => {
  try {
    const u = new URL(url ?? '');
    return { host: u.host.replace(/^www\./, ''), path: u.pathname.replace(/\/$/, '') };
  } catch {
    return { host: (url ?? '').replace(/^https?:\/\//, ''), path: '' };
  }
};

/* b14 stuck mode: how many keys she has open under her lines since your last one, so the composer can be the next number */
export const openKeyCount = (msgs: ReadonlyArray<{ from: string; options?: ReadonlyArray<unknown> }>): number => {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const n = msgs[i].options?.length ?? 0;
    if (n) return n;
    if (msgs[i].from === 'me') return 0;
  }
  return 0;
};
