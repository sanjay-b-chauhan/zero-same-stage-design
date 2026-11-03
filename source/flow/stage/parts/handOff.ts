/* Back to the objective: the stage closes into its own tick. A still copy of the stage stays on top while the objective
   mounts under it, the copy's circle shrinks onto the tick, then the tick springs away. The reverse of Start's drop.
   No fade, no black frame: what is under the circle is the objective, already there. WAAPI and the clock only. */
import { clock } from '../../clock';
import { prefersReduced } from './util';

const CLOSE_MS = 880;
const CLOSE_EASE = 'cubic-bezier(.76,0,.24,1)';
const AWAY_MS = 300;
const AWAY_EASE = 'cubic-bezier(.5,0,.75,0)';

const settled = (a: Animation, ms: number) => Promise.race([a.finished.then(() => undefined).catch(() => undefined), clock.wait(ms + 400)]);

export async function closeStage(root: HTMLElement | null, tick: HTMLElement | null, go: () => void): Promise<void> {
  if (!root || prefersReduced(root)) {
    go();
    return;
  }
  const r = (tick ?? root).getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const end = Math.max(8, r.width / 2);
  const reach = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));

  const layer = document.createElement('div');
  layer.className = root.parentElement?.className ?? '';
  layer.setAttribute('data-stage-close', '');
  Object.assign(layer.style, { position: 'fixed', inset: '0', zIndex: '100000', pointerEvents: 'none', background: 'transparent' });
  let copy: HTMLElement;
  try {
    copy = root.cloneNode(true) as HTMLElement;
  } catch {
    go();
    return;
  }
  copy.removeAttribute('id');
  layer.appendChild(copy);
  document.body.appendChild(layer);

  go();

  const shut = layer.animate(
    [{ clipPath: `circle(${reach}px at ${cx}px ${cy}px)` }, { clipPath: `circle(${end}px at ${cx}px ${cy}px)` }],
    { duration: CLOSE_MS, easing: CLOSE_EASE, fill: 'forwards' }
  );
  const sink = copy.querySelector('.zs2-frame')?.animate(
    [{ transform: 'scale(.985)', filter: 'blur(6px)' }, { transform: 'scale(.94)', filter: 'blur(14px)' }],
    { duration: CLOSE_MS, easing: CLOSE_EASE, fill: 'forwards' }
  );
  await settled(shut, CLOSE_MS);
  layer.style.transformOrigin = `${cx}px ${cy}px`;
  const away = layer.animate(
    [
      { transform: 'scale(1)', filter: 'blur(0px)' },
      { transform: 'scale(0)', filter: 'blur(4px)' },
    ],
    { duration: AWAY_MS, easing: AWAY_EASE, fill: 'forwards' }
  );
  await settled(away, AWAY_MS);
  sink?.cancel();
  layer.remove();
}

/* On to the next stage (the founder's turn): the stage goes up. A still copy stays on top while the turn mounts under it,
   then the copy travels up out of the frame like a sheet pulled away, a little blur on the way. */
/* b20: a touch longer and softer at both ends, and the sheet tips back as it goes, so it reads as one smooth pull */
const LIFT_MS = 920;
const LIFT_EASE = 'cubic-bezier(.7,0,.2,1)';

export async function liftStage(root: HTMLElement | null, under: () => void): Promise<void> {
  if (!root || prefersReduced(root)) {
    under();
    return;
  }
  const layer = document.createElement('div');
  layer.className = root.parentElement?.className ?? '';
  layer.setAttribute('data-stage-lift', '');
  Object.assign(layer.style, { position: 'fixed', inset: '0', zIndex: '100000', pointerEvents: 'none', background: 'transparent' });
  try {
    layer.appendChild(root.cloneNode(true));
  } catch {
    under();
    return;
  }
  document.body.appendChild(layer);
  under();
  const up = layer.animate(
    [
      { transform: 'none', filter: 'blur(0px)' },
      { transform: 'translateY(-2%) scale(.975)', filter: 'blur(2px)', offset: 0.25 },
      { transform: `translateY(${-innerHeight}px) scale(.94)`, filter: 'blur(12px)' },
    ],
    { duration: LIFT_MS, easing: LIFT_EASE, fill: 'forwards' }
  );
  await settled(up, LIFT_MS);
  layer.remove();
}

/* the same move for any sheet already on screen (the turn itself, on its way out) */
export async function liftAway(el: HTMLElement | null): Promise<void> {
  if (!el || prefersReduced(el)) return;
  const up = el.animate(
    [
      { transform: 'none', filter: 'blur(0px)' },
      { transform: 'translateY(-2%) scale(.975)', filter: 'blur(2px)', offset: 0.25 },
      { transform: `translateY(${-innerHeight}px) scale(.94)`, filter: 'blur(12px)' },
    ],
    { duration: LIFT_MS, easing: LIFT_EASE, fill: 'forwards' }
  );
  await settled(up, LIFT_MS);
}
