/* The PiP chat rests on whole rows. The thread pins her newest line above the composer with room under it, and in a window
   this short that often leaves the top row cut by the bar. Once the thread is still (nothing writing, nothing moving, no hand
   on it), the cut row is shown whole when the room under the last line can pay for it, else it is scrolled out of view.
   Only a small glide, only at rest, and never while you are scrolling yourself. The thread's own pinning is untouched. */
import { useLayoutEffect, type RefObject } from 'react';
import { useFlow } from '../engine/store';
import { useTalk } from './talk';

const REST_MS = 180; /* still for this long counts as at rest */
const HANDS_MS = 2500; /* a scroll of yours is left alone this long */
const TOP = 6; /* air over a row shown whole */
const FLOOR = 20; /* air kept under the last line, over the composer */
const MIN_CUT = 2; /* less than this is not a cut */

const glideTo = (sc: HTMLElement, target: number): (() => void) => {
  const view = sc.ownerDocument.defaultView;
  if (!view) return () => {};
  if (view.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    sc.scrollTop = target;
    return () => {};
  }
  let raf = 0;
  let last = view.performance.now();
  let expect = sc.scrollTop;
  const tall = sc.scrollHeight;
  const step = (now: number) => {
    /* the thread moved itself or grew (her new line, your scroll): its move wins and this one stops before it writes */
    if (Math.abs(sc.scrollTop - expect) > 1.5 || sc.scrollHeight !== tall) {
      raf = 0;
      return;
    }
    const dt = Math.min(48, now - last);
    last = now;
    const gap = target - sc.scrollTop;
    if (Math.abs(gap) < 0.6) {
      sc.scrollTop = target;
      raf = 0;
      return;
    }
    sc.scrollTop += gap * (1 - Math.exp(-dt / 90));
    expect = sc.scrollTop;
    raf = view.requestAnimationFrame(step);
  };
  raf = view.requestAnimationFrame(step);
  return () => {
    if (raf) view.cancelAnimationFrame(raf);
  };
};

/* how far to move so no row is cut at the top, or 0 */
const fix = (sc: HTMLElement, col: HTMLElement): number => {
  const box = sc.getBoundingClientRect();
  const rows = Array.from(col.children) as HTMLElement[];
  if (!rows.length) return 0;
  const lastBottom = rows[rows.length - 1].getBoundingClientRect().bottom;
  /* nothing to tidy while the newest line is still under the edge: the thread is on its way down to it */
  if (lastBottom <= box.top || lastBottom > box.bottom + 1) return 0;
  for (const row of rows) {
    const r = row.getBoundingClientRect();
    if (r.height < 1 || r.bottom <= box.top) continue;
    if (r.top >= box.top - MIN_CUT) return 0;
    /* this row crosses the top edge */
    const cut = box.top - r.top + TOP;
    const slack = box.bottom - lastBottom - FLOOR;
    if (cut <= slack) return -cut;
    const shown = r.bottom - box.top;
    const room = sc.scrollHeight - sc.clientHeight - sc.scrollTop;
    /* a row taller than the window stays where it is: its start is cut, but its words keep going */
    if (r.height > box.height * 0.6 || shown + TOP > room) return 0;
    return shown + TOP;
  }
  return 0;
};

export function useWholeRows(host: RefObject<HTMLElement | null>, on: boolean) {
  useLayoutEffect(() => {
    if (!on) return;
    const sc = host.current?.querySelector<HTMLElement>('.zs2-thread-scroll');
    const col = sc?.querySelector<HTMLElement>('.zs2-thread-col');
    if (!sc || !col) return;
    const view = sc.ownerDocument.defaultView as (Window & typeof globalThis) | null;
    if (!view) return;
    let rest = 0;
    let handsAt = 0;
    let stopGlide: () => void = () => {};
    let mine = false; /* the scroll events of our own glide do not count as motion */

    const settle = () => {
      rest = 0;
      if (view.performance.now() - handsAt < HANDS_MS) return;
      const { ui, stage } = useFlow.getState();
      /* a talk turn can still add a film or a file under her line, so it waits for the whole turn */
      if (ui.stream || stage?.typing || useTalk.getState().phase !== 'idle') return wait();
      const d = fix(sc, col);
      if (Math.abs(d) < MIN_CUT) return;
      mine = true;
      stopGlide = glideTo(sc, sc.scrollTop + d);
      view.setTimeout(() => {
        mine = false;
      }, 700);
    };
    /* anything new in the thread stops a glide already on its way, so it never pulls against the thread's own follow */
    const changed = () => {
      stopGlide();
      mine = false;
      wait();
    };
    const wait = () => {
      if (rest) view.clearTimeout(rest);
      rest = view.setTimeout(settle, REST_MS);
    };
    const moved = () => {
      if (!mine) wait();
    };
    const hands = () => {
      handsAt = view.performance.now();
      stopGlide();
      mine = false;
    };
    const RO = view.ResizeObserver ?? ResizeObserver;
    const ro = new RO(changed);
    ro.observe(col);
    ro.observe(sc);
    sc.addEventListener('scroll', moved, { passive: true });
    sc.addEventListener('wheel', hands, { passive: true });
    sc.addEventListener('touchstart', hands, { passive: true });
    sc.addEventListener('pointerdown', hands);
    wait();
    return () => {
      ro.disconnect();
      if (rest) view.clearTimeout(rest);
      stopGlide();
      sc.removeEventListener('scroll', moved);
      sc.removeEventListener('wheel', hands);
      sc.removeEventListener('touchstart', hands);
      sc.removeEventListener('pointerdown', hands);
    };
  }, [host, on]);
}
