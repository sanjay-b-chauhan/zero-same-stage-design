/* The white to black move Sanjay loved, read from zero-workspace-next/b23 stageIn(), the meeting into the plan.
   b23: a light page holds one rounded frame. The dark page rises inside the frame, translateY(100%) to none, 760 ms.
   Then the frame opens out to the whole screen, clip-path inset(frame round r) to inset(0 round 0), 820 ms.
   Both on cubic-bezier(.7,0,.2,1). Here the frame is the plan card you just pressed (b36's card radius, 10), so the
   light plan falls into the stage's black from the card itself. The layer sits on the body, outside any b-light root,
   so --b-ground is always the stage's black.
   WAAPI only, so it carries on through anything the PIP does to the opener's rAF. */
import { clock } from '../clock';
import { useFlow } from '../engine/store';

const RISE_MS = 760;
const OPEN_MS = 820;
const EASING = 'cubic-bezier(.7,0,.2,1)';
const DEFAULT_RADIUS = 10;
const LIFT_GUARD_MS = 6000;

let running: Promise<void> | null = null;
let layer: HTMLDivElement | null = null;

export interface WipeRect {
  left: number;
  top: number;
  width: number;
  height: number;
  radius?: number;
}

const usable = (r: WipeRect | null | undefined): r is WipeRect => !!r && r.width > 0 && r.height > 0;

const centreFrame = (): WipeRect => {
  const width = Math.min(560, innerWidth - 40);
  return { left: (innerWidth - width) / 2, top: innerHeight / 2 - 26, width, height: 52 };
};

const insetOf = (f: WipeRect) =>
  `inset(${f.top}px ${innerWidth - f.left - f.width}px ${innerHeight - f.top - f.height}px ${f.left}px round ${f.radius ?? DEFAULT_RADIUS}px)`;

/* A hidden tab can hold a WAAPI promise back, so the clock always gets the last word. */
const settled = (a: Animation, ms: number) =>
  Promise.race([a.finished.then(() => undefined).catch(() => undefined), clock.wait(ms + 400)]);

const lift = () => {
  const el = layer;
  layer = null;
  if (!el) return;
  requestAnimationFrame(() => requestAnimationFrame(() => el.remove()));
};

const liftOnceStageIsUp = () => {
  if (useFlow.getState().screen === 'stage') {
    lift();
    return;
  }
  const guard = clock.setTimeout(() => {
    unsubscribe();
    lift();
  }, LIFT_GUARD_MS);
  const unsubscribe = useFlow.subscribe((s) => {
    if (s.screen !== 'stage') return;
    unsubscribe();
    clock.clearTimeout(guard);
    lift();
  });
};

async function run(rect?: WipeRect | null): Promise<void> {
  const frame = usable(rect) ? rect : centreFrame();
  const quick = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const rise = quick ? 1 : RISE_MS;
  const open = quick ? 1 : OPEN_MS;
  const from = insetOf(frame);

  const shell = document.createElement('div');
  shell.setAttribute('data-white-to-black', '');
  Object.assign(shell.style, { position: 'fixed', inset: '0', zIndex: '100000', clipPath: from, overflow: 'hidden' });
  const page = document.createElement('div');
  Object.assign(page.style, {
    position: 'absolute',
    left: '0',
    right: '0',
    top: `${frame.top}px`,
    bottom: '0',
    background: 'var(--b-ground)',
    willChange: 'transform',
  });
  shell.appendChild(page);
  document.body.appendChild(shell);
  layer = shell;

  const rising = page.animate(
    [{ transform: `translateY(${frame.height}px)` }, { transform: 'none' }],
    { duration: rise, easing: EASING, fill: 'both' }
  );
  await settled(rising, rise);

  page.style.top = '0';
  page.style.willChange = '';
  rising.cancel();

  const opening = shell.animate(
    [{ clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }],
    { duration: open, easing: EASING, fill: 'both' }
  );
  await settled(opening, open);

  shell.style.clipPath = 'none';
  opening.cancel();
  liftOnceStageIsUp();
}

/* Grows out of the rect you pass, the row that was pressed. Resolves the moment black covers everything.
   The layer stays up until the stage is mounted under it. */
export function playWhiteToBlack(rect?: WipeRect | null): Promise<void> {
  if (running) return running;
  running = run(rect).finally(() => {
    running = null;
  });
  return running;
}
