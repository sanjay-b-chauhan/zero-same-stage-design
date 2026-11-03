/* Leaving Zero and coming back, on the page. The real page never moves: a still copy of it does the moving.
   Leaving: the copy shrinks into the PiP's spot, blur to soft, while the desktop rises around it.
   Back: the copy grows out of the PiP (or the Dock's Zero icon) to the full page, soft to sharp, while a copy of the desktop
   sinks away under it. Then the copies go and the live page is exactly where they ended. */
import { prefersReduced, SPRING } from '../../stage/parts/util';
import type { Rect } from './deskStore';

const MS = 680;
const PIP_R = 14;
const SOFT_OUT = 'cubic-bezier(0.4, 0, 0.6, 1)';
const SAFETY_MS = 1400;

let returning: HTMLElement | null = null;
let returnTimer = 0;

/* a still copy of the page, safe to move: no ids, nothing that can play or load, no dev tools, no build stamp */
const stillCopy = (from: Element): HTMLElement => {
  const c = from.cloneNode(true) as HTMLElement;
  c.removeAttribute('id');
  c.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  c.querySelectorAll('video, audio').forEach((n) => {
    const m = n as HTMLMediaElement;
    m.removeAttribute('autoplay');
    m.removeAttribute('src');
    m.querySelectorAll('source').forEach((s) => s.remove());
    m.muted = true;
    try {
      m.pause();
    } catch {
      /* a copy that never loaded has nothing to pause */
    }
  });
  c.querySelectorAll('iframe, .zdm, .z-stamp').forEach((n) => n.remove());
  c.setAttribute('aria-hidden', 'true');
  c.inert = true;
  return c;
};

const ghost = (page: HTMLElement): { outer: HTMLElement; inner: HTMLElement } => {
  const outer = document.createElement('div');
  outer.className = 'zmac-ghost';
  const inner = document.createElement('div');
  inner.className = 'zmac-ghost-in';
  inner.appendChild(page);
  outer.appendChild(inner);
  return { outer, inner };
};

/* The full page squeezed into a small rect: scaled to cover it, cropped to its middle, its corners the PiP's.
   The crop is in the page's own pixels, so it is divided by the scale. */
const squeeze = (to: Rect, vw: number, vh: number) => {
  const s = Math.max(to.w / vw, to.h / vh, 0.01);
  const lw = to.w / s;
  const lh = to.h / s;
  const left = (vw - lw) / 2;
  const top = (vh - lh) / 2;
  return {
    s,
    transform: `translate(${to.x - left * s}px, ${to.y - top * s}px) scale(${s})`,
    clip: `inset(${top}px ${vw - left - lw}px ${vh - top - lh}px ${left}px round ${PIP_R / s}px)`,
  };
};

const FULL = { transform: 'translate(0px, 0px) scale(1)', clipPath: 'inset(0px 0px 0px 0px round 0px)' };

const page = (): HTMLElement | null => document.getElementById('root');

export const cancelReturn = () => {
  window.clearTimeout(returnTimer);
  returning?.remove();
  returning = null;
};

/* Leaving: called once the desktop is laid out, with the rect the PiP is landing on */
export function playLeave(layer: HTMLElement, to: Rect): void {
  if (prefersReduced(layer)) return;
  const from = page();
  const slot = layer.querySelector<HTMLElement>('.zmac-ghost-slot');
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  /* the desktop rises around the shrinking page, the way a Space comes forward: no blur on the wall, so its edge stays clean on the dark */
  layer.querySelector('.zmac-wall')?.animate(
    [
      { transform: 'scale(0.94)', filter: 'brightness(0.72)', borderRadius: '18px' },
      { transform: 'scale(1)', filter: 'brightness(1)', borderRadius: '0px' },
    ],
    { duration: 820, easing: SPRING }
  );
  layer.querySelector('.zmac-wins')?.animate(
    [
      { transform: 'translateY(18px) scale(0.97)', filter: 'blur(6px)' },
      { transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
    ],
    { duration: 760, delay: 60, easing: SPRING, fill: 'backwards' }
  );
  layer.querySelector('.zmac-menubar')?.animate([{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }], {
    duration: 620,
    delay: 180,
    easing: SPRING,
    fill: 'backwards',
  });
  layer.querySelector('.zmac-dock')?.animate([{ transform: 'translateY(120%)' }, { transform: 'translateY(0)' }], {
    duration: 680,
    delay: 220,
    easing: SPRING,
    fill: 'backwards',
  });

  if (!from || !slot) return;
  const g = ghost(stillCopy(from));
  slot.appendChild(g.outer);
  const sq = squeeze(to, vw, vh);
  const shrink = g.outer.animate([FULL, { transform: sq.transform, clipPath: sq.clip }], { duration: MS, easing: SPRING, fill: 'forwards' });
  g.inner.animate(
    [
      { filter: 'blur(0px)', opacity: 1 },
      { filter: `blur(${1.5 / sq.s}px)`, opacity: 1, offset: 0.5 },
      { filter: `blur(${5 / sq.s}px)`, opacity: 0 },
    ],
    { duration: MS * 0.8, easing: SOFT_OUT, fill: 'forwards' }
  );
  const gone = () => g.outer.remove();
  shrink.onfinish = gone;
  shrink.oncancel = gone;
  window.setTimeout(gone, SAFETY_MS);
}

/* Coming back: called as the desktop leaves the page, with the rect Zero grows out of */
export function playReturn(layer: HTMLElement, from: Rect | null): void {
  cancelReturn();
  const live = page();
  if (!live || !from || prefersReduced(layer)) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const over = document.createElement('div');
  over.className = 'zmac-return';
  over.setAttribute('aria-hidden', 'true');
  const sink = layer.cloneNode(true) as HTMLElement;
  sink.querySelectorAll('.zp-dock, .zmac-ghost').forEach((n) => n.remove());
  sink.classList.add('zmac-sinking');
  sink.inert = true;
  over.appendChild(sink);
  const g = ghost(stillCopy(live));
  over.appendChild(g.outer);
  document.body.appendChild(over);
  returning = over;

  /* the desktop sinks away under it: back and down in light, the menu bar up, the Dock down */
  sink.animate(
    [
      { transform: 'scale(1)', filter: 'brightness(1)', borderRadius: '0px' },
      { transform: 'scale(0.94)', filter: 'brightness(0.62)', borderRadius: '18px' },
    ],
    { duration: MS, easing: SPRING, fill: 'forwards' }
  );
  sink.querySelector('.zmac-menubar')?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], {
    duration: 360,
    easing: 'cubic-bezier(0.4, 0, 1, 1)',
    fill: 'forwards',
  });
  sink.querySelector('.zmac-dock')?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(130%)' }], {
    duration: 420,
    easing: 'cubic-bezier(0.4, 0, 1, 1)',
    fill: 'forwards',
  });

  /* Zero grows out of where you pressed, soft to sharp */
  const sq = squeeze(from, vw, vh);
  const grow = g.outer.animate([{ transform: sq.transform, clipPath: sq.clip }, FULL], { duration: MS, easing: SPRING, fill: 'forwards' });
  g.inner.animate(
    [
      { filter: `blur(${5 / sq.s}px)`, opacity: 0 },
      { filter: `blur(${1.5 / sq.s}px)`, opacity: 1, offset: 0.3 },
      { filter: 'blur(0px)', opacity: 1 },
    ],
    { duration: MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' }
  );
  const done = () => {
    if (returning !== over) return;
    cancelReturn();
  };
  grow.onfinish = done;
  returnTimer = window.setTimeout(done, SAFETY_MS);
}
