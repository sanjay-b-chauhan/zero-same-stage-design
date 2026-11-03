/* Start: the key you pressed becomes the stage. Its pill rounds into a drop while its word goes soft, then the drop grows
   from the key until it is the whole screen, turning from the key's black to the stage's ground on the way, while the
   page behind it sinks back and blurs. Resolves the moment the screen is covered; the layer stays up until the stage is
   mounted under it. WAAPI only, so it carries on through anything the PIP does to the opener's rAF. */
import { clock } from '../clock';
import { useFlow } from '../engine/store';

const ROUND_MS = 260;
const GROW_MS = 880;
const ROUND_EASE = 'cubic-bezier(.3,0,.2,1)';
const GROW_EASE = 'cubic-bezier(.76,0,.24,1)';
const LIFT_GUARD_MS = 6000;
const FALLBACK_INK = '#0b0b0c';

let running: Promise<void> | null = null;

/* a hidden tab can hold a WAAPI promise back, so the clock always gets the last word */
const settled = (a: Animation, ms: number) => Promise.race([a.finished.then(() => undefined).catch(() => undefined), clock.wait(ms + 400)]);

const solid = (c: string) => (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c) ? c : FALLBACK_INK);

/* b20 (his note: "I need smoother transition at the start and at the end of the stage"): the cover never just vanishes.
   The stage arrives under it soft and a touch large, and sharpens into place while the cover thins away over it */
const ARRIVE_MS = 720;
const ARRIVE_EASE = 'cubic-bezier(.16,1,.3,1)';
const arrive = (layer: HTMLElement) => {
  const frame = document.querySelector<HTMLElement>('.zs2-frame');
  const quick = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (quick) {
    layer.remove();
    return;
  }
  frame?.animate(
    [
      { transform: 'scale(1.025)', filter: 'blur(12px)' },
      { transform: 'none', filter: 'blur(0px)' },
    ],
    { duration: ARRIVE_MS, easing: ARRIVE_EASE }
  );
  const thin = layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ARRIVE_MS * 0.7, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  void settled(thin, ARRIVE_MS).then(() => layer.remove());
};

const liftOnceStageIsUp = (layer: HTMLElement, sunk: Animation | null) => {
  const lift = () => {
    sunk?.cancel();
    requestAnimationFrame(() => requestAnimationFrame(() => arrive(layer)));
  };
  if (useFlow.getState().screen === 'stage') {
    lift();
    return;
  }
  const guard = clock.setTimeout(() => {
    off();
    lift();
  }, LIFT_GUARD_MS);
  const off = useFlow.subscribe((s) => {
    if (s.screen !== 'stage') return;
    off();
    clock.clearTimeout(guard);
    lift();
  });
};

async function run(key: HTMLElement, page: HTMLElement | null): Promise<void> {
  const r = key.getBoundingClientRect();
  const css = getComputedStyle(key);
  const ink = solid(css.backgroundColor);
  const ground = getComputedStyle(document.documentElement).getPropertyValue('--b-ground').trim() || ink;
  const d = Math.max(r.width, r.height);
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const reach = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
  const quick = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const drop = document.createElement('div');
  drop.setAttribute('data-start-circle', '');
  Object.assign(drop.style, {
    position: 'fixed',
    zIndex: '100000',
    left: `${cx - d / 2}px`,
    top: `${cy - d / 2}px`,
    width: `${d}px`,
    height: `${d}px`,
    borderRadius: '50%',
    background: ink,
    display: 'grid',
    placeItems: 'center',
    pointerEvents: 'none',
    willChange: 'transform',
  });
  const word = document.createElement('span');
  word.textContent = key.textContent ?? '';
  Object.assign(word.style, { color: css.color, font: css.font, letterSpacing: css.letterSpacing, whiteSpace: 'nowrap' });
  drop.appendChild(word);
  document.body.appendChild(drop);

  if (quick) {
    drop.style.transform = `scale(${(reach * 2) / d + 0.1})`;
    drop.style.background = ground;
    word.remove();
    liftOnceStageIsUp(drop, null);
    return;
  }

  /* the pill rounds into a drop, its word goes soft */
  const pill = { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: `${r.height / 2}px` };
  const round = { left: `${cx - d / 2}px`, top: `${cy - d / 2}px`, width: `${d}px`, height: `${d}px`, borderRadius: `${d / 2}px` };
  const rounding = drop.animate([pill, round], { duration: ROUND_MS, easing: ROUND_EASE, fill: 'both' });
  word.animate([{ filter: 'blur(0px)', opacity: 1 }, { filter: 'blur(6px)', opacity: 0 }], { duration: ROUND_MS * 0.8, easing: 'ease-out', fill: 'forwards' });
  key.style.visibility = 'hidden';
  await settled(rounding, ROUND_MS);

  /* the drop grows from the key to the whole screen; the page sinks back under it */
  if (page) page.style.transformOrigin = `${cx}px ${cy}px`;
  const sunk =
    page?.animate([{ transform: 'none', filter: 'blur(0px)' }, { transform: 'scale(0.965)', filter: 'blur(8px)' }], { duration: GROW_MS, easing: GROW_EASE, fill: 'forwards' }) ??
    null;
  const growing = drop.animate(
    [
      { transform: 'scale(1)', background: ink },
      { transform: `scale(${(reach * 2) / d + 0.1})`, background: ground },
    ],
    { duration: GROW_MS, easing: GROW_EASE, fill: 'forwards' }
  );
  await settled(growing, GROW_MS);
  key.style.visibility = '';
  liftOnceStageIsUp(drop, sunk);
}

/* Grows out of the key you pressed. Resolves the moment the stage's ground covers everything */
export function playStartCircle(key: HTMLElement, page?: HTMLElement | null): Promise<void> {
  if (running) return running;
  running = run(key, page ?? null).finally(() => {
    running = null;
  });
  return running;
}
