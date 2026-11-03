/* The world you can move. His note (3 Nov): "the world map should be scrollable, like how we have an interactive thing,
   it has to be really good". One camera on .zo-cam, driven by hand: drag it (with momentum when you let go, and a rubber
   band at the edges), scroll it with a wheel or a trackpad, pinch or Control scroll to zoom about the pointer, touch
   with one finger or two. The push in to a building keeps b36's 1.3 s curve, and starts from wherever the camera is.
   Every move cuts off the one before it. The camera is translate(tx, ty) scale(s) on the world box, origin top left. */
import { clock } from '../clock';
import { CAM_EASE, CAM_MS, NEAR_SCALE, type Layout } from './camera';
import type { Place } from './places';

export interface Cam {
  tx: number;
  ty: number;
  s: number;
}

/* the map at rest is a little in, so there is somewhere to go. You can pull out to the whole world and in to the push */
export const REST_SCALE = 1.5;
export const MIN_SCALE = 1;
export const MAX_SCALE = NEAR_SCALE;

/* how far past an edge the world will stretch, and how it resists on the way (iOS: 0.55) */
const RUBBER = 0.55;
/* iOS's normal deceleration, per ms */
const DECEL = 0.998;
/* the spring that brings an edge home: critically damped, about 400 ms */
const HOME = 0.016;
const V_MAX = 5; /* px per ms, a hard flick */
const DRAG_FROM = 6; /* px before a press becomes a drag, so a tap on a tag stays a tap */

export const camTransform = (c: Cam): string => `translate(${c.tx}px, ${c.ty}px) scale(${c.s})`;

/* the range the camera can sit in at a scale, so the world always covers the window */
export function bounds(L: Layout, s: number) {
  return { x0: L.vw - L.ox - s * L.W0, x1: -L.ox, y0: L.vh - L.oy - s * L.H0, y1: -L.oy };
}

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

export function clampCam(L: Layout, c: Cam): Cam {
  const s = clampScale(c.s);
  const b = bounds(L, s);
  return { s, tx: Math.min(b.x1, Math.max(b.x0, c.tx)), ty: Math.min(b.y1, Math.max(b.y0, c.ty)) };
}

/* the camera that puts a world point (fractions of the map) in the middle of the window */
export function aimAt(L: Layout, x: number, y: number, s: number): Cam {
  return clampCam(L, { s, tx: L.vw / 2 - L.ox - s * x * L.W0, ty: L.vh / 2 - L.oy - s * y * L.H0 });
}

/* the map at rest: in a little, framed on every company that has a project, a touch low so the tags above them fit */
export function restCam(L: Layout, places: Place[]): Cam {
  if (!places.length) return aimAt(L, 0.5, 0.5, REST_SCALE);
  const x = places.reduce((a, p) => a + p.dot.x, 0) / places.length;
  const y = places.reduce((a, p) => a + p.dot.y, 0) / places.length;
  return aimAt(L, x, y - 0.02, REST_SCALE);
}

/* the world point at the middle of the window, so a resize keeps you looking at the same place */
export function middleOf(L: Layout, c: Cam): { x: number; y: number } {
  return { x: (L.vw / 2 - L.ox - c.tx) / (c.s * L.W0), y: (L.vh / 2 - L.oy - c.ty) / (c.s * L.H0) };
}

/* past an edge the world gives less the further you pull, and never a third of the window */
const reach = (dim: number) => Math.max(1, dim * 0.33);
export function rubber(over: number, dim: number): number {
  const d = reach(dim);
  const a = Math.abs(over);
  return Math.sign(over) * (1 - 1 / ((a * RUBBER) / d + 1)) * d;
}

/* a position on one axis, stretched past its range */
function stretch(v: number, lo: number, hi: number, dim: number): number {
  if (v > hi) return hi + rubber(v - hi, dim);
  if (v < lo) return lo + rubber(v - lo, dim);
  return v;
}

/* CSS cubic-bezier, solved for x, so the push keeps b36's own curve */
function bezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  const X = (t: number) => ((ax * t + bx) * t + cx) * t;
  const Y = (t: number) => ((ay * t + by) * t + cy) * t;
  const dX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = X(t) - x;
      const d = dX(t);
      if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    if (t < 0 || t > 1) {
      let lo = 0;
      let hi = 1;
      t = x;
      for (let i = 0; i < 24; i++) {
        if (X(t) < x) lo = t;
        else hi = t;
        t = (lo + hi) / 2;
      }
    }
    return Y(t);
  };
}
const easeOf = (css: string) => {
  const m = css.match(/cubic-bezier\(([^)]+)\)/);
  const n = m ? m[1].split(',').map(Number) : [0.25, 0.1, 0.25, 1];
  return bezier(n[0], n[1], n[2], n[3]);
};
const CAM_CURVE = easeOf(CAM_EASE);
const GLIDE_CURVE = bezier(0.2, 0, 0, 1);

type Mode = 'idle' | 'drag' | 'free' | 'tween';

export interface Panner {
  get(): Cam;
  set(c: Cam): void;
  /* the push in or out, on b36's curve. done runs only if nothing cut it off */
  tween(to: Cam, opts?: { ms?: number; done?: () => void; glide?: boolean }): void;
  stop(): void;
  /* hand moves: on while the map is the thing on screen */
  enable(on: boolean): void;
  dispose(): void;
}

/* drives the camera element. `layout` is read fresh each time, so a resize is picked up at once.
   `surface` takes the pointer and the wheel; `onMove` hears every frame the camera moves. */
export function createPanner(
  el: HTMLElement,
  surface: HTMLElement,
  layout: () => Layout,
  opts: { onMove?: (c: Cam) => void; reduced?: () => boolean } = {}
): Panner {
  let c: Cam = { tx: 0, ty: 0, s: 1 };
  let mode: Mode = 'idle';
  let on = false;
  let raf = 0;
  let last = 0;
  let vx = 0;
  let vy = 0;
  let wheelIdle = 0;
  let tw: { from: Cam; to: Cam; t0: number; ms: number; curve: (x: number) => number; done?: () => void } | null = null;

  const write = () => {
    el.style.transform = camTransform(c);
    el.style.setProperty('--zs', String(1 / c.s));
    opts.onMove?.(c);
  };

  const halt = () => {
    clock.cancelRaf(raf);
    raf = 0;
    tw = null;
    vx = vy = 0;
    mode = 'idle';
  };

  const loop = (now: number) => {
    raf = 0;
    const dt = Math.min(48, last ? now - last : 16);
    last = now;
    if (mode === 'tween' && tw) {
      const k = tw.ms <= 0 ? 1 : Math.min(1, (now - tw.t0) / tw.ms);
      const e = tw.curve(k);
      /* scale moves in log space so the push feels even all the way in */
      const s = Math.exp(Math.log(tw.from.s) + (Math.log(tw.to.s) - Math.log(tw.from.s)) * e);
      c = { s, tx: tw.from.tx + (tw.to.tx - tw.from.tx) * e, ty: tw.from.ty + (tw.to.ty - tw.from.ty) * e };
      write();
      if (k >= 1) {
        const done = tw.done;
        tw = null;
        mode = 'idle';
        done?.();
        return;
      }
    } else if (mode === 'free') {
      /* momentum inside the range, a spring past an edge, in small steps so the spring stays steady */
      const b = bounds(layout(), c.s);
      let { tx, ty } = c;
      for (let left = dt; left > 0; left -= 4) {
        const h = Math.min(4, left);
        const ax = tx > b.x1 ? b.x1 : tx < b.x0 ? b.x0 : null;
        const ay = ty > b.y1 ? b.y1 : ty < b.y0 ? b.y0 : null;
        if (ax === null) vx *= Math.pow(DECEL, h);
        else vx += (-HOME * HOME * (tx - ax) - 2 * HOME * vx) * h;
        if (ay === null) vy *= Math.pow(DECEL, h);
        else vy += (-HOME * HOME * (ty - ay) - 2 * HOME * vy) * h;
        tx += vx * h;
        ty += vy * h;
      }
      c = { ...c, tx, ty };
      const inside = tx >= b.x0 - 0.5 && tx <= b.x1 + 0.5 && ty >= b.y0 - 0.5 && ty <= b.y1 + 0.5;
      if (inside && Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) {
        c = clampCam(layout(), c);
        write();
        mode = 'idle';
        return;
      }
      write();
    } else return;
    raf = clock.raf(loop);
  };

  const run = (m: Mode) => {
    mode = m;
    if (!raf) {
      last = 0;
      raf = clock.raf(loop);
    }
  };

  const free = (v: { x: number; y: number }) => {
    if (opts.reduced?.()) {
      halt();
      c = clampCam(layout(), c);
      write();
      return;
    }
    vx = Math.max(-V_MAX, Math.min(V_MAX, v.x));
    vy = Math.max(-V_MAX, Math.min(V_MAX, v.y));
    run('free');
  };

  /* ---------- the hand ---------- */

  const pts = new Map<number, { x: number; y: number }>();
  let press: { x: number; y: number; id: number } | null = null;
  let dragging = false;
  let swallowClick = false;
  /* where the grab began, in camera terms, and the unstretched position it would be at */
  let raw = { tx: 0, ty: 0 };
  let samples: { x: number; y: number; t: number }[] = [];
  let pinch: { d: number; mx: number; my: number } | null = null;

  const placeRaw = () => {
    const L = layout();
    const b = bounds(L, c.s);
    c = { ...c, tx: stretch(raw.tx, b.x0, b.x1, L.vw), ty: stretch(raw.ty, b.y0, b.y1, L.vh) };
    write();
  };

  /* the unstretched position under a stretched one, so a second grab carries on from where the world is */
  const unstretch = () => {
    const L = layout();
    const b = bounds(L, c.s);
    const back = (v: number, lo: number, hi: number, dim: number) => {
      const over = v > hi ? v - hi : v < lo ? v - lo : 0;
      if (!over) return v;
      const d = reach(dim);
      const a = Math.min(0.98, Math.abs(over) / d);
      return (over > 0 ? hi : lo) + (Math.sign(over) * ((1 / (1 - a) - 1) * d)) / RUBBER;
    };
    raw = { tx: back(c.tx, b.x0, b.x1, L.vw), ty: back(c.ty, b.y0, b.y1, L.vh) };
  };

  const zoomAt = (px: number, py: number, s1: number) => {
    const L = layout();
    const s = clampScale(s1);
    /* the world point under the pointer stays under it */
    const lx = px - L.ox;
    const ly = py - L.oy;
    const k = s / c.s;
    c = clampCam(L, { s, tx: lx - (lx - c.tx) * k, ty: ly - (ly - c.ty) * k });
    write();
  };

  const pair = () => {
    const [a, b] = [...pts.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  };

  const onDown = (e: PointerEvent) => {
    if (!on || e.button !== 0) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      pinch = pair();
      dragging = true;
      swallowClick = true;
      return;
    }
    if (pts.size > 2) return;
    halt();
    unstretch();
    press = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dragging = false;
    swallowClick = false;
    samples = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }];
  };

  const onMove = (e: PointerEvent) => {
    if (!on || !pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId)!;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) {
      const now = pair();
      zoomAt(now.mx, now.my, (c.s * now.d) / Math.max(1, pinch.d));
      const L = layout();
      c = clampCam(L, { ...c, tx: c.tx + now.mx - pinch.mx, ty: c.ty + now.my - pinch.my });
      write();
      pinch = now;
      return;
    }
    if (!press || e.pointerId !== press.id) return;
    if (!dragging) {
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < DRAG_FROM) return;
      dragging = true;
      swallowClick = true;
      surface.dataset.grabbing = '1';
      try {
        surface.setPointerCapture(e.pointerId);
      } catch {
        /* the drag still follows while the pointer is over the window */
      }
    }
    raw = { tx: raw.tx + e.clientX - prev.x, ty: raw.ty + e.clientY - prev.y };
    placeRaw();
    samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    while (samples.length > 2 && e.timeStamp - samples[0].t > 90) samples.shift();
  };

  const onUp = (e: PointerEvent) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pinch) {
      pinch = null;
      /* one finger left on the glass carries on as a drag */
      const rest = [...pts.entries()][0];
      if (rest) {
        unstretch();
        press = { x: rest[1].x, y: rest[1].y, id: rest[0] };
        samples = [{ x: rest[1].x, y: rest[1].y, t: e.timeStamp }];
        return;
      }
      press = null;
      free({ x: 0, y: 0 });
      return;
    }
    if (!press || e.pointerId !== press.id) return;
    press = null;
    delete surface.dataset.grabbing;
    if (!dragging) return;
    dragging = false;
    /* the flick: how fast the last 90 ms went. A pause before letting go is no flick at all. */
    const a = samples[0];
    const z = samples[samples.length - 1];
    const span = z.t - a.t;
    const still = e.timeStamp - z.t > 60;
    free(span > 8 && !still ? { x: (z.x - a.x) / span, y: (z.y - a.y) / span } : { x: 0, y: 0 });
  };

  /* a drag that let go over a tag is not a click on it */
  const onClick = (e: MouseEvent) => {
    if (!swallowClick) return;
    swallowClick = false;
    e.stopPropagation();
    e.preventDefault();
  };

  const onWheel = (e: WheelEvent) => {
    if (!on) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? layout().vh : 1;
    let dx = e.deltaX * unit;
    let dy = e.deltaY * unit;
    if (e.shiftKey && !dx) [dx, dy] = [dy, 0];
    if (e.ctrlKey || e.metaKey) {
      /* a pinch on a trackpad, or Control and a wheel */
      halt();
      const step = Math.max(-40, Math.min(40, dy));
      zoomAt(e.clientX, e.clientY, c.s * Math.exp(-step * 0.01));
      return;
    }
    const L = layout();
    if (Math.abs(dx) >= 50 || Math.abs(dy) >= 50) {
      /* a mouse wheel's notches: glide there instead of jumping */
      const from = tw && mode === 'tween' ? tw.to : c;
      const to = clampCam(L, { ...from, tx: from.tx - dx, ty: from.ty - dy });
      halt();
      tw = { from: { ...c }, to, t0: performance.now(), ms: 320, curve: GLIDE_CURVE };
      run('tween');
      return;
    }
    /* a trackpad: the world under the fingers, stretching at an edge, home once the fingers rest */
    halt();
    const b = bounds(L, c.s);
    const give = (v: number, d: number, lo: number, hi: number, dim: number) => {
      const over = v > hi ? v - hi : v < lo ? v - lo : 0;
      if (over && Math.sign(-d) === Math.sign(over)) return v - d * Math.max(0, 1 - Math.abs(over) / (dim * 0.12));
      return v - d;
    };
    c = { ...c, tx: give(c.tx, dx, b.x0, b.x1, L.vw), ty: give(c.ty, dy, b.y0, b.y1, L.vh) };
    write();
    clock.clearTimeout(wheelIdle);
    wheelIdle = clock.setTimeout(() => {
      if (mode === 'idle') free({ x: 0, y: 0 });
    }, 90);
  };

  /* Safari's pinch */
  type Gesture = Event & { scale: number; clientX: number; clientY: number };
  let g0 = 1;
  const onGStart = (e: Event) => {
    if (!on) return;
    e.preventDefault();
    halt();
    g0 = c.s;
  };
  const onGChange = (e: Event) => {
    if (!on) return;
    e.preventDefault();
    const g = e as Gesture;
    zoomAt(g.clientX, g.clientY, g0 * g.scale);
  };

  surface.addEventListener('pointerdown', onDown);
  surface.addEventListener('pointermove', onMove);
  surface.addEventListener('pointerup', onUp);
  surface.addEventListener('pointercancel', onUp);
  surface.addEventListener('click', onClick, true);
  surface.addEventListener('wheel', onWheel, { passive: false });
  surface.addEventListener('gesturestart', onGStart);
  surface.addEventListener('gesturechange', onGChange);

  return {
    get: () => ({ ...c }),
    set(next) {
      halt();
      c = { ...next };
      write();
    },
    tween(to, o = {}) {
      halt();
      if (opts.reduced?.()) {
        c = { ...to };
        write();
        o.done?.();
        return;
      }
      tw = { from: { ...c }, to: { ...to }, t0: performance.now(), ms: o.ms ?? CAM_MS, curve: o.glide ? GLIDE_CURVE : CAM_CURVE, done: o.done };
      run('tween');
    },
    stop: halt,
    enable(v) {
      on = v;
      if (!v) {
        pts.clear();
        press = null;
        pinch = null;
        dragging = false;
        delete surface.dataset.grabbing;
      }
    },
    dispose() {
      halt();
      clock.clearTimeout(wheelIdle);
      surface.removeEventListener('pointerdown', onDown);
      surface.removeEventListener('pointermove', onMove);
      surface.removeEventListener('pointerup', onUp);
      surface.removeEventListener('pointercancel', onUp);
      surface.removeEventListener('click', onClick, true);
      surface.removeEventListener('wheel', onWheel);
      surface.removeEventListener('gesturestart', onGStart);
      surface.removeEventListener('gesturechange', onGChange);
    },
  };
}
