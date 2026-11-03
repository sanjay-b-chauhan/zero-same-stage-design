/* What a move looks like as it plays out. WAAPI only (no rAF, no library), so it runs the same in the Document PiP
   window. It works from the card's own element and the two states either side of the move, and only for moves made
   while this card was on screen, so a card mounted mid-game (the PiP opening, a reload) never replays anything. */
import { pop, prefersReduced, rise, SNAP, SNAP_MS, SPRING, SPRING_MS } from '../stage/parts/util';
import type { Played } from './play';

const BEAT_GAP = 260;
const ROW_GAP = 40;

const q = (root: HTMLElement, sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));

function swap(el: HTMLElement | null, delay = 0) {
  if (!el || prefersReduced(el)) return;
  el.animate(
    [
      { transform: 'translateY(6px)', filter: 'blur(3px)', opacity: 0 },
      { transform: 'translateY(0)', filter: 'blur(0px)', opacity: 1 },
    ],
    { duration: SNAP_MS, delay, easing: SNAP, fill: 'backwards' }
  );
}

/* the slice's rows glide to their new places after a sort, never jump */
export function glideRows(root: HTMLElement | null, before: Map<string, number>): Map<string, number> {
  const now = new Map<string, number>();
  if (!root) return now;
  q(root, '.gm-row').forEach((el) => {
    const k = el.dataset.k ?? '';
    now.set(k, el.offsetTop);
    const was = before.get(k);
    if (was === undefined || Math.abs(was - el.offsetTop) < 1 || prefersReduced(el)) return;
    el.animate([{ transform: `translateY(${was - el.offsetTop}px)` }, { transform: 'translateY(0)' }], {
      duration: SPRING_MS,
      easing: SPRING,
    });
  });
  return now;
}

export function playMove(root: HTMLElement | null, prev: Played, next: Played) {
  if (!root) return;
  let t = 0;

  /* a new slice lands row by row */
  if (next.viewN !== prev.viewN) {
    rise(root.querySelector('.gm-th'), { y: 6, blur: 4 });
    q(root, '.gm-row').forEach((el, i) => rise(el, { y: 8, blur: 4, delay: (i + 1) * ROW_GAP }));
    t = (next.order.length + 1) * ROW_GAP;
  } else {
    /* values that changed swap in place */
    Object.keys(next.cells).forEach((k) => {
      if (prev.cells[k] === next.cells[k]) return;
      swap(root.querySelector<HTMLElement>(`[data-ck="${k}"] .gm-v`));
    });
  }

  if (next.total !== prev.total) swap(root.querySelector('.gm-tv'), Math.min(t, 200));

  /* what the move set off, one line after the other, at reading pace */
  let after = t;
  if (next.story && next.story.n !== prev.story?.n) {
    const beats = q(root, '.gm-beat');
    beats.forEach((el, i) => rise(el, { y: 8, blur: 5, delay: t + i * BEAT_GAP }));
    after = t + beats.length * BEAT_GAP;
  }

  /* the tick lands once the moment has been told */
  if (next.found && !prev.found) {
    const d = Math.min(after, 900);
    rise(root.querySelector('.gm-done'), { y: 6, blur: 4, delay: d });
    pop(root.querySelector('.gm-tick'), 0.5, d + 80);
  }
}
