/* One way to move anything in the opening, and every move can be cut off by the next.
   A move starts from where the element really is right now (its computed look) and ends on a look that is also
   written inline, so when the animation is gone the element simply stays there. */
import { prefersReduced } from '../stage/parts/util';

export interface Look {
  transform?: string;
  opacity?: string;
  filter?: string;
}

const KEYS: (keyof Look)[] = ['transform', 'opacity', 'filter'];
const running = new WeakMap<Element, Animation>();

export function settle(el: Element | null) {
  if (!el) return;
  running.get(el)?.cancel();
  running.delete(el);
}

export function place(el: HTMLElement | null, to: Look) {
  if (!el) return;
  settle(el);
  KEYS.forEach((k) => {
    if (to[k] !== undefined) el.style[k] = to[k] as string;
  });
}

/* done runs only when the move finishes, never when the next move cuts it off */
export function moveTo(el: HTMLElement | null, to: Look, timing: KeyframeAnimationOptions, done?: () => void) {
  if (!el) return;
  const cs = getComputedStyle(el);
  const from: Keyframe = {};
  const end: Keyframe = {};
  KEYS.forEach((k) => {
    if (to[k] === undefined) return;
    from[k] = cs[k];
    end[k] = to[k];
  });
  place(el, to);
  if (prefersReduced(el) || !timing.duration) {
    done?.();
    return;
  }
  /* an arrival is solid early in its move, so a white surface never reads as glass on the way in */
  const solid = to.opacity === '1' && from.opacity !== '1';
  const frames: Keyframe[] = solid ? [from, { opacity: '1', offset: 0.3 }, end] : [from, end];
  const a = el.animate(frames, { fill: 'backwards', ...timing });
  running.set(el, a);
  a.onfinish = () => {
    if (running.get(el) !== a) return;
    running.delete(el);
    done?.();
  };
}

/* a keyframed move that ends on its last frame, for the world's arrival */
export function play(el: HTMLElement | null, frames: Keyframe[], timing: KeyframeAnimationOptions) {
  if (!el) return;
  settle(el);
  const last = frames[frames.length - 1] as Look;
  KEYS.forEach((k) => {
    if (last[k] !== undefined) el.style[k] = last[k] as string;
  });
  if (prefersReduced(el)) return;
  const a = el.animate(frames, { fill: 'backwards', ...timing });
  running.set(el, a);
  a.onfinish = () => {
    if (running.get(el) === a) running.delete(el);
  };
}

/* a key pressed from the keyboard shows the same 1 px press the pointer gets from the kit */
/* a tactile key, pressed from the keyboard: it sinks onto its lip and comes back up, as a click does (open.css .zo-k3) */
export function pressDown(el: HTMLElement | null, ms = 140) {
  if (!el) return;
  el.dataset.down = '1';
  window.setTimeout(() => delete el.dataset.down, ms);
}

export function tapDown(el: HTMLElement | null) {
  if (!el || prefersReduced(el)) return;
  el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(1px)', offset: 0.35 }, { transform: 'translateY(0)' }], {
    duration: 240,
    easing: 'cubic-bezier(.2,0,0,1)',
  });
}
