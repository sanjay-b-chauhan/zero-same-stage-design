/* One window on the fake desktop, in macOS's own chrome: traffic lights, a centred title, the OS shadow.
   Drag it by the title bar, 1:1 from where you grabbed it. A press anywhere on it brings it to the front.
   It grows out of where it came from (its Dock icon, or the PiP) and goes back into it: scale from that point, blur to sharp.
   Red closes, yellow sends it to the Dock, green fills the desktop and back. A double click on the title bar does the same as green.
   The chrome is the OS, so it may carry the OS shadow. What is inside is the app's own. */
import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Minus, X } from 'lucide-react';
import { prefersReduced, SPRING, SPRING_MS } from '../../stage/parts/util';
import { frames, type Rect, type WinId } from './deskStore';
import { EDGE, firstFrame, growFrom, keepOnScreen, zoomed } from './geometry';

export type WinTone = 'light' | 'claude' | 'zero';

const OUT_MS = 380;
const OUT = 'cubic-bezier(0.4, 0, 0.6, 1)';
const DRAG_START_PX = 2;

const at = (r: Rect) => `translate3d(${r.x}px, ${r.y}px, 0)`;

/* b16 (his note: "a user can go to any side ... and make it resizable ... on every page individually ... maximum width and a
   minimum width"): every side and corner sizes it, inside its limits and the desktop. Each window remembers the size you gave
   it per width it opens at (the list and a file are two pages), for this visit */
export interface WinLimits {
  min: { w: number; h: number };
  max: { w: number; h: number };
}
type Side = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const SIDES: Side[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const pulledWins: Partial<Record<string, { w: number; h: number }>> = {};
const clampTo = (v: number, lo: number, hi: number) => Math.round(Math.min(Math.max(v, lo), Math.max(lo, hi)));

/* the zoom key's own glyph: two corners pointing out */
function ZoomGlyph() {
  return (
    <svg viewBox="0 0 12 12" width="8" height="8" aria-hidden>
      <path d="M3 3h4.4L3 7.4Z M9 9H4.6L9 4.6Z" fill="currentColor" />
    </svg>
  );
}

export default function MacWindow({
  id,
  open,
  min = false,
  n = 0,
  z,
  active,
  title,
  tone,
  from,
  frame,
  panel = false,
  width,
  limits,
  onFocus,
  onClose,
  onMin,
  children,
}: {
  id: WinId;
  open: boolean;
  min?: boolean;
  n?: number;
  z: number;
  active: boolean;
  title: string;
  tone: WinTone;
  /* where it grows out of and goes back into */
  from: () => Rect | null;
  /* its first frame, when it has never been placed, given the height it measures at its width */
  frame?: (h: number) => Rect;
  /* a floating panel: no yellow or green, its height follows what it holds */
  panel?: boolean;
  /* a panel that changes width, for a file it shows wider */
  width?: number;
  limits?: WinLimits;
  onFocus: () => void;
  onClose: () => void;
  onMin?: () => void;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [present, setPresent] = useState(open);
  const [hidden, setHidden] = useState(min);
  const [isZoomed, setZoomed] = useState(false);
  const rect = useRef<Rect | null>(null);
  const before = useRef<Rect | null>(null);
  const live = useRef<Animation | null>(null);
  const was = useRef({ open: false, min, n });

  if (open && !present) setPresent(true);

  const pageKey = `${id}:${width ?? 0}`;
  /* the size this page was pulled to, or back to the size it takes by itself */
  const sizeFromMemory = (r: Rect): Rect => {
    const el = box.current;
    const kept = limits ? pulledWins[pageKey] : undefined;
    if (!el) return r;
    if (!kept) {
      delete el.dataset.sized;
      if (panel) el.style.height = '';
      return r;
    }
    el.dataset.sized = 'true';
    el.style.height = `${kept.h}px`;
    /* it keeps the edge it opened against (beside the PiP), and grows away from it */
    return { ...r, x: r.x + r.w - kept.w, w: kept.w, h: kept.h };
  };

  const place = (r: Rect) => {
    const el = box.current;
    if (!el) return;
    rect.current = r;
    el.style.transform = at(r);
    el.style.width = `${r.w}px`;
    if (!panel) el.style.height = `${r.h}px`;
  };

  const measured = (): Rect => {
    const r = rect.current ?? { x: 0, y: 0, w: 0, h: 0 };
    const h = box.current?.offsetHeight ?? r.h;
    return { ...r, h };
  };

  const arrive = () => {
    const el = box.current;
    const r = rect.current;
    if (!el || !r || prefersReduced(el)) return;
    const g = growFrom(from(), measured());
    live.current?.cancel();
    el.style.transformOrigin = g.origin;
    live.current = el.animate(
      [
        { transform: `${at(r)} scale(${g.scale})`, filter: 'blur(12px)', opacity: 0 },
        { opacity: 1, offset: 0.28 },
        { transform: `${at(r)} scale(1)`, filter: 'blur(0px)', opacity: 1 },
      ],
      { duration: SPRING_MS, easing: SPRING }
    );
  };

  const depart = (done: () => void) => {
    const el = box.current;
    const r = rect.current;
    if (!el || !r || prefersReduced(el)) return done();
    const g = growFrom(from(), measured());
    live.current?.cancel();
    el.style.transformOrigin = g.origin;
    const a = el.animate(
      [
        { transform: `${at(r)} scale(1)`, filter: 'blur(0px)', opacity: 1 },
        { opacity: 1, offset: 0.55 },
        { transform: `${at(r)} scale(${g.scale})`, filter: 'blur(10px)', opacity: 0 },
      ],
      { duration: OUT_MS, easing: OUT, fill: 'forwards' }
    );
    live.current = a;
    a.onfinish = () => {
      if (live.current === a) done();
    };
  };

  /* open, close, minimise and restore, each played from or into where it belongs */
  useLayoutEffect(() => {
    const prev = was.current;
    was.current = { open, min, n };
    if (!present) return;
    if (open && (!prev.open || prev.n !== n)) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const el = box.current;
      if (el && panel && width !== undefined) el.style.width = `${width}px`;
      const h = el?.offsetHeight ?? 0;
      const r = keepOnScreen(sizeFromMemory(frames[id] ?? frame?.(h) ?? firstFrame(id, vw, vh)), vw, vh);
      place(r);
      if (!min) {
        setHidden(false);
        arrive();
      }
      return;
    }
    if (!open && prev.open) {
      depart(() => {
        live.current?.cancel();
        live.current = null;
        setPresent(false);
      });
      return;
    }
    if (min && !prev.min) {
      depart(() => setHidden(true));
      return;
    }
    if (!min && prev.min) {
      live.current?.cancel();
      setHidden(false);
      arrive();
    }
  });

  /* a new width springs from the old one, its right edge kept on screen */
  useLayoutEffect(() => {
    const el = box.current;
    const r = rect.current;
    if (!el || !r || width === undefined) return;
    const sized = sizeFromMemory({ ...r, w: width });
    if (sized.w === r.w && sized.h === r.h) return;
    const vw = window.innerWidth;
    const next = { ...sized, x: Math.max(EDGE, Math.min(r.x, vw - sized.w - EDGE)) };
    place(next);
    if (prefersReduced(el)) return;
    el.animate([{ transform: at(r), width: `${r.w}px` }, { transform: at(next), width: `${next.w}px` }], { duration: SPRING_MS, easing: SPRING });
  }, [width]);

  const zoom = () => {
    const el = box.current;
    const r = rect.current;
    if (!el || !r || panel) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const next = isZoomed && before.current ? before.current : zoomed(vw, vh);
    if (!isZoomed) before.current = r;
    setZoomed(!isZoomed);
    live.current?.cancel();
    el.style.transformOrigin = '0 0';
    place(next);
    frames[id] = next;
    if (prefersReduced(el)) return;
    live.current = el.animate(
      [
        { transform: at(r), width: `${r.w}px`, height: `${r.h}px` },
        { transform: at(next), width: `${next.w}px`, height: `${next.h}px` },
      ],
      { duration: SPRING_MS, easing: SPRING }
    );
  };

  /* the title bar drags the window. Keys on it stay keys */
  const onBarDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = box.current;
    const r = rect.current;
    if (!el || !r || e.button !== 0) return;
    if ((e.target as Element).closest('button, input, textarea, a')) return;
    const bar = e.currentTarget;
    live.current?.cancel();
    live.current = null;
    const grab = { x: e.clientX - r.x, y: e.clientY - r.y };
    const origin = { x: e.clientX, y: e.clientY };
    let moving = false;
    const move = (ev: PointerEvent) => {
      if (!moving) {
        if (Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < DRAG_START_PX) return;
        moving = true;
        bar.setPointerCapture(ev.pointerId);
        el.dataset.dragging = 'true';
        if (isZoomed) setZoomed(false);
      }
      const cur = rect.current ?? r;
      place(keepOnScreen({ ...cur, x: ev.clientX - grab.x, y: ev.clientY - grab.y }, window.innerWidth, window.innerHeight));
    };
    const end = (ev: PointerEvent) => {
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', end);
      bar.removeEventListener('pointercancel', end);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      if (!moving) return;
      delete el.dataset.dragging;
      try {
        bar.releasePointerCapture(ev.pointerId);
      } catch {
        /* already released */
      }
      if (rect.current) frames[id] = rect.current;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
  };

  const onSideDown = (side: Side) => (e: ReactPointerEvent<HTMLSpanElement>) => {
    const el = box.current;
    const r0 = rect.current;
    if (!el || !r0 || !limits || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    live.current?.cancel();
    live.current = null;
    if (isZoomed) setZoomed(false);
    const grip = e.currentTarget;
    try {
      grip.setPointerCapture(e.pointerId);
    } catch {
      /* no live pointer to hold */
    }
    el.dataset.dragging = 'true';
    el.dataset.sized = 'true';
    const r = { ...r0, h: el.offsetHeight };
    const origin = { x: e.clientX, y: e.clientY };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - origin.x;
      const dy = ev.clientY - origin.y;
      let { x, y, w, h } = r;
      if (side.includes('e')) w = clampTo(r.w + dx, limits.min.w, Math.min(limits.max.w, vw - r.x - EDGE));
      if (side.includes('w')) {
        w = clampTo(r.w - dx, limits.min.w, Math.min(limits.max.w, r.x + r.w - EDGE));
        x = r.x + r.w - w;
      }
      if (side.includes('s')) h = clampTo(r.h + dy, limits.min.h, Math.min(limits.max.h, vh - r.y - EDGE));
      if (side.includes('n')) {
        h = clampTo(r.h - dy, limits.min.h, Math.min(limits.max.h, r.y + r.h - EDGE));
        y = r.y + r.h - h;
      }
      place({ x, y, w, h });
      el.style.height = `${h}px`;
    };
    const end = (ev: PointerEvent) => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', end);
      grip.removeEventListener('pointercancel', end);
      delete el.dataset.dragging;
      try {
        grip.releasePointerCapture(ev.pointerId);
      } catch {
        /* already released */
      }
      const now = rect.current;
      if (!now) return;
      frames[id] = now;
      pulledWins[pageKey] = { w: now.w, h: now.h };
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  };

  if (!present) return null;

  return (
    <div
      ref={box}
      className="zmac-win"
      data-tone={tone}
      data-active={active || undefined}
      data-panel={panel || undefined}
      data-win={id}
      style={{ zIndex: z, visibility: hidden ? 'hidden' : undefined }}
      onPointerDownCapture={onFocus}
      role="dialog"
      aria-label={title}
    >
      <div className="zmac-titlebar" onPointerDown={onBarDown} onDoubleClick={(e) => !(e.target as Element).closest('button') && zoom()}>
        <div className="zmac-lights">
          <button type="button" className="zmac-light" data-k="close" aria-label="Close" onClick={onClose}>
            <X size={8} strokeWidth={3} />
          </button>
          <button type="button" className="zmac-light" data-k="min" aria-label="Minimise" disabled={panel || !onMin} onClick={onMin}>
            <Minus size={8} strokeWidth={3} />
          </button>
          <button type="button" className="zmac-light" data-k="zoom" aria-label="Zoom" disabled={panel} onClick={zoom}>
            <ZoomGlyph />
          </button>
        </div>
        <span className="zmac-title">{title}</span>
      </div>
      <div className="zmac-body">{children}</div>
      {limits && SIDES.map((side) => <span key={side} className="zmac-rs" data-e={side} aria-hidden onPointerDown={onSideDown(side)} />)}
    </div>
  );
}
