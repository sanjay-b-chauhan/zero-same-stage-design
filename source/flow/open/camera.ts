/* The world camera, the b36 maths kept as they were. Pure functions of the window size and one place on the map.
   The world is a 16:9 box that covers the window. "Near" pushes in 1.6x toward the building, and each axis is clamped
   so the scaled world always covers the window: no edge of the world can ever show. */
import type { Place } from './places';

export interface Layout {
  vw: number;
  vh: number;
  W0: number; /* the world box, covering the window */
  H0: number;
  ox: number; /* where the box sits, it is centred */
  oy: number;
}

export const NEAR_SCALE = 3.2;
export const CAM_MS = 1300;
export const CAM_EASE = 'cubic-bezier(.7,0,.2,1)';

/* the slow breath of the world at rest. The tag's pin follows it with the same numbers. */
export const DRIFT_SCALE = 0.025;
export const DRIFT_T = { x: -0.004, y: -0.003 };

export function layout(vw: number, vh: number): Layout {
  const W0 = Math.max(vw, (vh * 16) / 9);
  const H0 = (W0 * 9) / 16;
  return { vw, vh, W0, H0, ox: (vw - W0) / 2, oy: (vh - H0) / 2 };
}

/* b36: the aim is the roof point a little lower, landing at 34% of the width and 56% of the height, then clamped */
export function nearCam(L: Layout, p: Place): { tx: number; ty: number; s: number } {
  const Sc = NEAR_SCALE;
  const px = p.dot.x * L.W0;
  const py = (p.dot.y + 0.014) * L.H0;
  const tx = Math.min(-L.ox, Math.max(L.vw - L.ox - Sc * L.W0, L.vw * 0.34 - L.ox - Sc * px));
  const ty = Math.min(-L.oy, Math.max(L.vh - L.oy - Sc * L.H0, L.vh * 0.56 - L.oy - Sc * py));
  return { tx, ty, s: Sc };
}

export const camTransform = (c: { tx: number; ty: number; s: number }): string => `translate(${c.tx}px, ${c.ty}px) scale(${c.s})`;

/* a world point (fractions of the map) on screen, under a camera */
export function onScreen(L: Layout, c: { tx: number; ty: number; s: number }, x: number, y: number): { x: number; y: number } {
  return { x: L.ox + c.tx + c.s * x * L.W0, y: L.oy + c.ty + c.s * y * L.H0 };
}

/* how far the drift carries one world point at its far end. The drift scales about the box centre, then shifts. */
export function driftOf(L: Layout, x: number, y: number): { dx: number; dy: number } {
  const k = 1 + DRIFT_SCALE;
  return {
    dx: DRIFT_SCALE * (x * L.W0 - L.W0 / 2) + k * DRIFT_T.x * L.W0,
    dy: DRIFT_SCALE * (y * L.H0 - L.H0 / 2) + k * DRIFT_T.y * L.H0,
  };
}

/* the card sits beside the building once the camera is near: just right of it, centred on it, always inside the window.
   It keeps clear of the developer gear's corner (top 26, right 26, 32 square). */
/* the top right corner belongs to the Level and coach pill and the dev gear, so the card never rises into it */
export const CORNER = { w: 250, h: 74 } as const;

export function cardSpot(L: Layout, p: Place, w: number, h: number, gap: number, edge: number): { left: number; top: number } {
  const c = nearCam(L, p);
  const a = onScreen(L, c, p.box.x0, p.box.y0);
  const b = onScreen(L, c, p.box.x1, p.box.y1);
  let left = b.x + gap;
  if (left + w > L.vw - edge) left = a.x - gap - w;
  left = Math.max(edge, Math.min(L.vw - edge - w, left));
  let top = (a.y + b.y) / 2 - h / 2;
  const minTop = left + w > L.vw - CORNER.w ? CORNER.h : edge;
  top = Math.max(minTop, Math.min(L.vh - edge - h, top));
  return { left: Math.round(left), top: Math.round(top) };
}
