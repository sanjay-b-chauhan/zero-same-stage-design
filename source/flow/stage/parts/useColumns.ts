/* The columns. Two custom properties on the body, --zs2-workw and --zs2-sidew. The side panel's width comes from the
   window and from what it holds: the resources list is a mid width, an open file gets more room, and when it swaps what
   it holds it springs to the new width.
   The work's width is yours (his note, 2 Nov: "Add the resize of the panels"): drag the line between the work and the
   chat, or focus it and use the arrows. It stops at the work's own minimum and maximum and never takes the chat under
   its minimum. Kept in localStorage for the next visit, double click puts it back.
   b17 (his note, 3 Nov: "why you keep removing the concept for resizing the panels"): the files panel has its line again,
   as b6 to b10 had it. The list and an open file each keep their own width. */
import { useCallback, useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent as RPointerEvent, type RefObject } from 'react';
import { CHAT_MIN, dragSide, GUTTER, RES, readCols, saveCols, SIDE, sideWidth, WORK, type Cols, type SideKind } from './columns';
import { prefersReduced } from './util';

const SNAP_HOLD = 560;
const STEP = 16; /* an arrow press */
const STEP_BIG = 48; /* with Shift */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* the work's width for this body: what you set, inside its own range and the room the chat leaves */
const workFor = (c: Cols, body: number) => {
  const w = typeof c.work === 'number' && Number.isFinite(c.work) ? c.work : WORK.base;
  return clamp(Math.round(w), WORK.min, Math.max(WORK.min, Math.min(WORK.max, body - CHAT_MIN - GUTTER)));
};

export interface GripHandlers {
  value: number;
  min: number;
  max: number;
  onPointerDown: (e: RPointerEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}

export interface ColumnGrips extends GripHandlers {
  side: GripHandlers;
}

export function useColumns(body: RefObject<HTMLDivElement | null>, kind: SideKind = 'preview', flip = false): ColumnGrips {
  const snapT = useRef(0);
  const held = useRef(kind);
  held.current = kind;
  const cols = useRef<Cols>(readCols());
  const shown = useRef(workFor(cols.current, 1 << 14));
  const sideShown = useRef(0);

  const apply = useCallback(() => {
    const el = body.current;
    if (!el) return;
    const work = workFor(cols.current, el.clientWidth);
    shown.current = work;
    el.style.setProperty('--zs2-workw', `${work}px`);
    const side = sideWidth(cols.current, el.clientWidth, window.innerWidth, work, held.current);
    sideShown.current = side;
    el.style.setProperty('--zs2-sidew', `${side}px`);
    el.querySelector('.zs2-grip[data-for="work"]')?.setAttribute('aria-valuenow', String(work));
    el.querySelector('.zs2-grip[data-for="side"]')?.setAttribute('aria-valuenow', String(side));
  }, [body]);

  const set = useCallback(
    (w: number, keep: boolean) => {
      cols.current = { ...cols.current, work: w };
      apply();
      if (keep) saveCols(cols.current);
    },
    [apply]
  );

  const lastKind = useRef(kind);
  useLayoutEffect(() => {
    if (lastKind.current === kind) return;
    lastKind.current = kind;
    const el = body.current;
    if (el && !prefersReduced(el)) {
      el.dataset.snap = '';
      window.clearTimeout(snapT.current);
      snapT.current = window.setTimeout(() => delete el.dataset.snap, SNAP_HOLD);
    }
    apply();
  }, [kind, apply, body]);

  useLayoutEffect(() => {
    apply();
    const el = body.current;
    if (!el) return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      window.clearTimeout(snapT.current);
    };
  }, [apply, body]);

  /* the drag follows the pointer 1 to 1 with no transition, and is kept once you let go */
  const onPointerDown = (e: RPointerEvent<HTMLElement>) => {
    const el = body.current;
    if (!el || e.button !== 0) return;
    e.preventDefault();
    const grip = e.currentTarget;
    const view = grip.ownerDocument.defaultView ?? window;
    const id = e.pointerId;
    const x0 = e.clientX;
    const w0 = shown.current;
    try {
      grip.setPointerCapture(id);
    } catch {
      /* capture refused: the window below still hears every move */
    }
    el.dataset.dragging = '';
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      set(w0 + (ev.clientX - x0) * (flip ? -1 : 1), false);
    };
    /* on the window, so the drag follows even where capture never starts */
    const end = (ev?: PointerEvent) => {
      if (ev && 'pointerId' in ev && ev.pointerId !== id) return;
      view.removeEventListener('pointermove', move);
      view.removeEventListener('pointerup', end);
      view.removeEventListener('pointercancel', end);
      view.removeEventListener('blur', blur);
      delete el.dataset.dragging;
      cols.current = { ...cols.current, work: shown.current };
      saveCols(cols.current);
    };
    const blur = () => end();
    view.addEventListener('pointermove', move);
    view.addEventListener('pointerup', end);
    view.addEventListener('pointercancel', end);
    view.addEventListener('blur', blur);
  };

  const onDoubleClick = () => {
    const el = body.current;
    if (el && !prefersReduced(el)) {
      el.dataset.snap = '';
      window.clearTimeout(snapT.current);
      snapT.current = window.setTimeout(() => delete el.dataset.snap, SNAP_HOLD);
    }
    cols.current = { ...cols.current, work: undefined };
    apply();
    saveCols(cols.current);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const by = e.shiftKey ? STEP_BIG : STEP;
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      set(e.key === 'Home' ? WORK.min : WORK.max, true);
      return;
    }
    if (!dir) return;
    e.preventDefault();
    set(shown.current + dir * by * (flip ? -1 : 1), true);
  };

  /* the files panel sits on the far side of the chat: a drag toward the chat makes it wider */
  const sideKey = () => (held.current === 'res' ? 'res' : 'side');
  const setSide = (w: number, keep: boolean) => {
    const el = body.current;
    if (!el) return;
    cols.current = { ...cols.current, [sideKey()]: dragSide(w, el.clientWidth, shown.current, held.current) };
    apply();
    if (keep) saveCols(cols.current);
  };
  const sideDir = flip ? 1 : -1;
  const side: GripHandlers = {
    value: sideShown.current,
    min: SIDE.min,
    max: kind === 'res' ? RES.pull : SIDE.max,
    onPointerDown: (e) => {
      const el = body.current;
      if (!el || e.button !== 0) return;
      e.preventDefault();
      const grip = e.currentTarget;
      const view = grip.ownerDocument.defaultView ?? window;
      const id = e.pointerId;
      const x0 = e.clientX;
      const w0 = sideShown.current;
      try {
        grip.setPointerCapture(id);
      } catch {
        /* capture refused: the window below still hears every move */
      }
      el.dataset.dragging = '';
      const move = (ev: PointerEvent) => {
        if (ev.pointerId === id) setSide(w0 + (ev.clientX - x0) * sideDir, false);
      };
      const end = (ev?: PointerEvent) => {
        if (ev && 'pointerId' in ev && ev.pointerId !== id) return;
        view.removeEventListener('pointermove', move);
        view.removeEventListener('pointerup', end);
        view.removeEventListener('pointercancel', end);
        view.removeEventListener('blur', blur);
        delete el.dataset.dragging;
        saveCols(cols.current);
      };
      const blur = () => end();
      view.addEventListener('pointermove', move);
      view.addEventListener('pointerup', end);
      view.addEventListener('pointercancel', end);
      view.addEventListener('blur', blur);
    },
    onDoubleClick: () => {
      cols.current = { ...cols.current, [sideKey()]: undefined };
      apply();
      saveCols(cols.current);
    },
    onKeyDown: (e) => {
      const by = e.shiftKey ? STEP_BIG : STEP;
      const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      setSide(sideShown.current + dir * by * sideDir, true);
    },
  };

  return { value: shown.current, min: WORK.min, max: WORK.max, onPointerDown, onDoubleClick, onKeyDown, side };
}
