/* The same PIP DOM as an in-page floating object, on the fake desktop (or the page, without one).
   Drag it by the bar, 1:1 from where you grabbed it. On release the momentum is projected and it springs to the nearest of eight
   slots (corners, edge middles), keeping the speed you let go with. Translate only, whole pixels at rest, so text stays sharp.
   Pull the free corner to size it, inside what the open view allows. Any key press springs it back to that view's size. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { rise, SPRING, SPRING_MS } from '../stage/parts/util';
import {
  bounded,
  centredX,
  centredY,
  currentPoint,
  DOCK_MARGIN,
  DOCK_SPRING_MS,
  FREE,
  nearestSlot,
  PAGE_AREA,
  project,
  slotPoint,
  springFrames,
  type Area,
  type Slot,
} from './dockMotion';
import { edgesFor, type Edge } from './dockEdges';
import { spot } from './desktop/deskStore';
import type { Limits, Size } from './logic';
import { setPulled } from './toolStore';

const DRAG_START_PX = 3;
const VELOCITY_WINDOW_MS = 100;

/* the slot you left it in, for the next time you go small */
let lastSlot: Slot = 'br';

const within = (v: number, lo: number, hi: number) => Math.round(Math.min(Math.max(v, lo), Math.max(lo, hi)));

export default function Dock({
  size,
  fitN,
  limits,
  area = PAGE_AREA,
  enterDelay = 0,
  onGrab,
  onPulled,
  children,
}: {
  size: Size;
  fitN: number;
  limits: Limits | null;
  area?: Area;
  enterDelay?: number;
  onGrab?: () => void;
  onPulled?: (s: Size) => void;
  children: ReactNode;
}) {
  const el = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const slot = useRef<Slot>(lastSlot);
  const live = useRef<Animation | null>(null);
  const dragged = useRef(false);
  const [at, setAt] = useState<Slot>(lastSlot);
  const areaRef = useRef(area);
  areaRef.current = area;

  const fitTo = useCallback((s: Size) => {
    const a = areaRef.current;
    return { w: Math.min(s.w, window.innerWidth - a.left - a.right), h: Math.min(s.h, window.innerHeight - a.top - a.bottom) };
  }, []);
  const shape = useRef(fitTo(size));

  /* The window inside is always the frame's size, never its own: --zp-w and --zp-h carry it (pip.css). While the frame springs
     smaller the window keeps the bigger size and the frame clips it, so the outline never stands away from what it holds. */
  const inside = useCallback((w: number, h: number) => {
    const box = el.current;
    if (!box) return;
    box.style.setProperty('--zp-w', `${w}px`);
    box.style.setProperty('--zp-h', `${h}px`);
  }, []);

  /* where it rests is also where tool windows open beside, and where Zero grows back from */
  const put = useCallback(
    (x: number, y: number, w: number, h: number, resting = true) => {
      const box = el.current;
      if (!box) return;
      box.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      box.style.width = `${w}px`;
      box.style.height = `${h}px`;
      inside(w, h);
      if (resting) spot.pip = { x, y, w, h };
    },
    [inside]
  );

  const target = useCallback((w: number, h: number) => slotPoint(slot.current, w, h, window.innerWidth, window.innerHeight, areaRef.current), []);

  /* first placement, then the entrance: it lands where Zero shrinks into */
  useLayoutEffect(() => {
    const { w, h } = shape.current;
    const p = target(w, h);
    put(p.x, p.y, w, h);
    rise(inner.current, enterDelay ? { y: 0, scale: 0.92, blur: 8, ms: 520, delay: enterDelay } : { y: 14, blur: 6, scale: 0.98, ms: 560 });
  }, [put, target, enterDelay]);

  /* opening and folding: grows from the slot it is holding, the row goes with the top edge */
  useLayoutEffect(() => {
    const box = el.current;
    if (!box) return;
    const next = fitTo(size);
    if (next.w === shape.current.w && next.h === shape.current.h) return;
    const style = box.ownerDocument.defaultView?.getComputedStyle(box);
    const from = {
      transform: style?.transform ?? box.style.transform,
      width: style?.width ?? `${shape.current.w}px`,
      height: style?.height ?? `${shape.current.h}px`,
    };
    live.current?.cancel();
    const was = shape.current;
    shape.current = next;
    const p = target(next.w, next.h);
    put(p.x, p.y, next.w, next.h);
    /* growing, the window is its new size at once and the frame uncovers it. Folding, it keeps the old size until the frame is there */
    const keepW = Math.max(was.w, next.w);
    const keepH = Math.max(was.h, next.h);
    if (keepW !== next.w || keepH !== next.h) inside(keepW, keepH);
    const anim = box.animate(
      [from, { transform: `translate3d(${p.x}px, ${p.y}px, 0)`, width: `${next.w}px`, height: `${next.h}px` }],
      { duration: SPRING_MS, easing: SPRING }
    );
    live.current = anim;
    const settle = () => {
      if (shape.current === next) inside(next.w, next.h);
    };
    anim.onfinish = settle;
    anim.oncancel = settle;
  }, [size, fitN, put, target, fitTo, inside]);

  /* the page changed size: stay in the slot */
  useEffect(() => {
    const onResize = () => {
      live.current?.cancel();
      const { w, h } = fitTo(size);
      shape.current = { w, h };
      const p = target(w, h);
      put(p.x, p.y, w, h);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [size, put, target, fitTo]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    onGrab?.();
    const box = el.current;
    const row = (e.target as Element).closest?.('.zp-bar') as HTMLElement | null;
    if (!box || !row || e.button !== 0) return;
    /* grabbing it mid spring catches it where it is */
    const start = currentPoint(box);
    live.current?.cancel();
    live.current = null;
    const { w, h } = shape.current;
    put(start.x, start.y, w, h, false);
    const grab = { x: e.clientX - start.x, y: e.clientY - start.y };
    const origin = { x: e.clientX, y: e.clientY };
    const trail: Array<{ t: number; x: number; y: number }> = [];
    let moving = false;
    let at = start;
    dragged.current = false;

    const move = (ev: PointerEvent) => {
      if (!moving) {
        if (Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < DRAG_START_PX) return;
        moving = true;
        dragged.current = true;
        row.setPointerCapture(ev.pointerId);
        row.dataset.dragging = 'true';
        box.dataset.dragging = 'true';
      }
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      at = {
        x: bounded(ev.clientX - grab.x, DOCK_MARGIN, vw - w - DOCK_MARGIN, vw),
        y: bounded(ev.clientY - grab.y, DOCK_MARGIN, vh - h - DOCK_MARGIN, vh),
      };
      box.style.transform = `translate3d(${at.x}px, ${at.y}px, 0)`;
      trail.push({ t: ev.timeStamp, x: ev.clientX, y: ev.clientY });
      while (trail.length > 2 && ev.timeStamp - trail[0].t > VELOCITY_WINDOW_MS) trail.shift();
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (!moving) return;
      delete row.dataset.dragging;
      delete box.dataset.dragging;
      try {
        row.releasePointerCapture(ev.pointerId);
      } catch {
        /* already released */
      }
      const a = trail[0];
      const b = trail[trail.length - 1];
      const dt = a && b ? (b.t - a.t) / 1000 : 0;
      /* a pause before letting go is a place, not a throw */
      const still = b ? ev.timeStamp - b.t > VELOCITY_WINDOW_MS : true;
      const v = dt > 0 && !still ? { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt } : { x: 0, y: 0 };
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      slot.current = nearestSlot(at.x + project(v.x), at.y + project(v.y), w, h, vw, vh, areaRef.current);
      lastSlot = slot.current;
      setAt(slot.current);
      const to = target(w, h);
      put(to.x, to.y, w, h);
      live.current = box.animate(springFrames(at, to, v), { duration: DOCK_SPRING_MS, easing: 'linear' });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  /* b16 (his note: "a user can go to any side ... and make it resizable"): the free corner and every free side size it. The held
     side stays where it is, the size follows the pointer 1:1 inside the view's limits. On a centred axis both edges move, so the
     size changes twice the pointer's move to keep the grip under it. Let go and the view remembers its size */
  const startSizing = (e: ReactPointerEvent<HTMLSpanElement>, dx: number, dy: number) => {
    const box = el.current;
    if (!box || !limits || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    live.current?.cancel();
    live.current = null;
    const grip = e.currentTarget;
    try {
      grip.setPointerCapture(e.pointerId);
    } catch {
      /* no live pointer to hold */
    }
    box.dataset.sizing = 'true';
    const s = slot.current;
    const sx = dx * (centredX(s) ? 2 : 1);
    const sy = dy * (centredY(s) ? 2 : 1);
    const from = { ...shape.current };
    const origin = { x: e.clientX, y: e.clientY };
    const a = areaRef.current;
    const move = (ev: PointerEvent) => {
      const w = within(from.w + sx * (ev.clientX - origin.x), limits.min.w, Math.min(limits.max.w, window.innerWidth - a.left - a.right));
      const h = within(from.h + sy * (ev.clientY - origin.y), limits.min.h, Math.min(limits.max.h, window.innerHeight - a.top - a.bottom));
      shape.current = { w, h };
      const p = target(w, h);
      put(p.x, p.y, w, h);
      setPulled(w !== from.w || h !== from.h);
    };
    const end = (ev: PointerEvent) => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', end);
      grip.removeEventListener('pointercancel', end);
      delete box.dataset.sizing;
      try {
        grip.releasePointerCapture(ev.pointerId);
      } catch {
        /* already released */
      }
      const now = shape.current;
      if (now.w !== from.w || now.h !== from.h) onPulled?.(now);
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  };
  const onGrip = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const free = FREE[slot.current];
    startSizing(e, free === 'tr' || free === 'br' ? 1 : -1, free === 'bl' || free === 'br' ? 1 : -1);
  };
  const onEdge = (edge: Edge) => (e: ReactPointerEvent<HTMLSpanElement>) =>
    startSizing(e, edge === 'e' ? 1 : edge === 'w' ? -1 : 0, edge === 's' ? 1 : edge === 'n' ? -1 : 0);

  /* a drag that started on a key is a drag, not a press */
  const onClickCapture = (e: React.MouseEvent) => {
    if (!dragged.current) return;
    dragged.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div ref={el} className="zp-dock" data-slot={at} data-bar={limits ? undefined : 'true'} onPointerDown={onPointerDown} onClickCapture={onClickCapture}>
      <div ref={inner} className="zp-dock-in">
        {children}
      </div>
      {limits && edgesFor(at).map((edge) => <span key={edge} className="zp-edge" data-e={edge} aria-hidden onPointerDown={onEdge(edge)} />)}
      {limits && <span className="zp-grip" data-at={FREE[at]} aria-hidden onPointerDown={onGrip} />}
    </div>
  );
}
