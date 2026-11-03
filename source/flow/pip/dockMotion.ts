/* The physics of the in-page dock, as plain functions.
   Critically damped, response .4, with the release velocity carried into the spring.
   A throw is projected with Apple's deceleration, then lands on the nearest of eight slots. */

export type Corner = 'tl' | 'tr' | 'bl' | 'br';

export const DOCK_MARGIN = 16;
const RESPONSE_S = 0.4;
const OMEGA = (2 * Math.PI) / RESPONSE_S;
export const DOCK_SPRING_MS = 700;
const FRAMES = 42;
const DECELERATION = 0.998; /* UIScrollView normal, per ms */
const RUBBER = 0.55;

export const project = (velocityPxPerS: number): number => (velocityPxPerS / 1000) * (DECELERATION / (1 - DECELERATION));

/* past the edge the dock pulls back harder the further you go */
export const rubber = (over: number, range: number): number => {
  if (over <= 0 || range <= 0) return 0;
  return (1 - 1 / ((over * RUBBER) / range + 1)) * range;
};

export const bounded = (v: number, min: number, max: number, range: number): number => {
  if (v < min) return min - rubber(min - v, range);
  if (v > max) return max + rubber(v - max, range);
  return v;
};

/* Where it can rest: the four corners, the middle of the top and bottom edges, the middle of the two sides */
export type Slot = Corner | 'tc' | 'bc' | 'ml' | 'mr';
export const SLOTS: Slot[] = ['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br'];

/* the room it rests in, as insets from the page edges, the margin included. On the desktop the menu bar and the Dock are out */
export interface Area {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export const PAGE_AREA: Area = { top: DOCK_MARGIN, right: DOCK_MARGIN, bottom: DOCK_MARGIN, left: DOCK_MARGIN };

/* the prototype's dev gear owns the bottom right corner (right 26, 32 wide), so the dock stops beside it there.
   On the desktop the Dock's strip already lifts it clear */
const GEAR_ROOM = 50;
const gearRoom = (s: Slot, a: Area): number =>
  s === 'br' && a.bottom < GEAR_ROOM && typeof document !== 'undefined' && document.querySelector('.zdm-gear') ? GEAR_ROOM : 0;

const isLeft = (s: Slot) => s === 'tl' || s === 'bl' || s === 'ml';
const isRight = (s: Slot) => s === 'tr' || s === 'br' || s === 'mr';
const isTop = (s: Slot) => s === 'tl' || s === 'tc' || s === 'tr';
const isBottom = (s: Slot) => s === 'bl' || s === 'bc' || s === 'br';

/* the centred axis grows both ways, so a grip on it moves at half the size change */
export const centredX = (s: Slot) => s === 'tc' || s === 'bc';
export const centredY = (s: Slot) => s === 'ml' || s === 'mr';

export const slotPoint = (s: Slot, w: number, h: number, vw: number, vh: number, a: Area = PAGE_AREA): { x: number; y: number } => {
  const right = Math.max(a.left, vw - w - a.right - gearRoom(s, a));
  const bottom = Math.max(a.top, vh - h - a.bottom);
  const midX = Math.max(a.left, a.left + (vw - a.left - a.right - w) / 2);
  const midY = Math.max(a.top, a.top + (vh - a.top - a.bottom - h) / 2);
  return {
    x: Math.round(isLeft(s) ? a.left : isRight(s) ? right : midX),
    y: Math.round(isTop(s) ? a.top : isBottom(s) ? bottom : midY),
  };
};

/* the slot nearest to where the throw lands */
export const nearestSlot = (x: number, y: number, w: number, h: number, vw: number, vh: number, a: Area = PAGE_AREA): Slot => {
  let best: Slot = 'br';
  let bestD = Infinity;
  for (const s of SLOTS) {
    const p = slotPoint(s, w, h, vw, vh, a);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
};

/* the corner a grip sits on: across from where it rests. An edge slot keeps the grip on its open side */
export const FREE: Record<Slot, Corner> = { br: 'tl', bl: 'tr', tr: 'bl', tl: 'br', tc: 'br', bc: 'tr', ml: 'br', mr: 'bl' };

const at = (from: number, to: number, v: number, t: number): number => {
  const a = from - to;
  return to + (a + (v + OMEGA * a) * t) * Math.exp(-OMEGA * t);
};

/* Sampled from the closed form, so it runs on the compositor and never needs a frame loop. */
export const springFrames = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  v: { x: number; y: number }
): Keyframe[] => {
  const frames: Keyframe[] = [];
  const total = DOCK_SPRING_MS / 1000;
  for (let i = 0; i < FRAMES; i++) {
    const t = (i / FRAMES) * total;
    frames.push({ transform: `translate3d(${at(from.x, to.x, v.x, t)}px, ${at(from.y, to.y, v.y, t)}px, 0)` });
  }
  frames.push({ transform: `translate3d(${to.x}px, ${to.y}px, 0)` });
  return frames;
};

/* where the dock is right now, even halfway through a spring */
export const currentPoint = (el: HTMLElement): { x: number; y: number } => {
  const view = el.ownerDocument.defaultView;
  const m = view?.getComputedStyle(el).transform ?? 'none';
  const hit = /matrix(3d)?\((.+)\)/.exec(m);
  if (!hit) return { x: 0, y: 0 };
  const n = hit[2].split(',').map((p) => parseFloat(p));
  return hit[1] ? { x: n[12], y: n[13] } : { x: n[4], y: n[5] };
};
