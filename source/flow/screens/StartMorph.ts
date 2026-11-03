/* b21 (his note: "when I click the CTA it should not be black ... the stage screen is the white one, so we just increase
   the container and match it with the stage chat ... super morphing, not fade in and fade out"): Start never covers the
   screen. The white stage card you pressed is lifted off the page and grows, on one soft curve, into the stage's own
   white chat sheet. Its words go soft as it stretches, the page behind sinks back, and once the stage is mounted under
   it the sheet lands exactly on the real one and hands over, blur to sharp, with no cut. WAAPI only. */
import { clock } from '../clock';
import { useFlow } from '../engine/store';

const GROW_MS = 860;
const LAND_MS = 420;
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const LIFT_GUARD_MS = 6000;
const SHEET = '.d1-chat';
/* where the chat sheet sits on the stage before it exists: the rail on the left, the top bar above */
const GUESS = { left: 268, top: 72, right: 20, bottom: 20, radius: 28 };

let running: Promise<void> | null = null;

const settled = (a: Animation, ms: number) => Promise.race([a.finished.then(() => undefined).catch(() => undefined), clock.wait(ms + 400)]);

type Box = { left: number; top: number; width: number; height: number; radius: number };
const frameOf = (b: Box) => ({
  left: `${b.left}px`,
  top: `${b.top}px`,
  width: `${b.width}px`,
  height: `${b.height}px`,
  borderRadius: `${b.radius}px`,
});
const guess = (): Box => {
  const left = Math.min(GUESS.left, innerWidth * 0.2);
  return { left, top: GUESS.top, width: innerWidth - left - GUESS.right, height: innerHeight - GUESS.top - GUESS.bottom, radius: GUESS.radius };
};

const whenStage = (): Promise<void> =>
  new Promise((resolve) => {
    if (useFlow.getState().screen === 'stage') return resolve();
    const guard = clock.setTimeout(() => {
      off();
      resolve();
    }, LIFT_GUARD_MS);
    const off = useFlow.subscribe((s) => {
      if (s.screen !== 'stage') return;
      off();
      clock.clearTimeout(guard);
      resolve();
    });
  });

/* the stage arrives around the sheet: its chat sharpens in place, the rail and the bar rise into theirs */
const land = async (layer: HTMLElement) => {
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  const real = document.querySelector<HTMLElement>(SHEET);
  const rr = real?.getBoundingClientRect();
  const kids = real ? [...real.children] : [];
  kids.forEach((k) =>
    (k as HTMLElement).animate([{ transform: 'translateY(10px)', filter: 'blur(8px)' }, { transform: 'none', filter: 'blur(0px)' }], {
      duration: 640,
      delay: 60,
      easing: EASE,
      fill: 'backwards',
    })
  );
  document.querySelectorAll<HTMLElement>('.d1-rail, .d1-top, .zs2-top').forEach((el, i) =>
    el.animate([{ transform: 'translateY(-8px)', filter: 'blur(8px)', opacity: 0 }, { transform: 'none', filter: 'blur(0px)', opacity: 1 }], {
      duration: 620,
      delay: 80 + i * 40,
      easing: EASE,
      fill: 'backwards',
    })
  );
  if (rr) {
    const to: Box = { left: rr.left, top: rr.top, width: rr.width, height: rr.height, radius: parseFloat(getComputedStyle(real!).borderTopLeftRadius) || GUESS.radius };
    const fit = layer.animate([frameOf(boxOf(layer)), frameOf(to)], { duration: LAND_MS, easing: EASE, fill: 'forwards' });
    await settled(fit, LAND_MS);
  }
  /* the real sheet is the same white in the same place: the lifted one simply lets go */
  const go = layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'linear', fill: 'forwards' });
  await settled(go, 260);
  layer.remove();
};

const boxOf = (el: HTMLElement): Box => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height, radius: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0 };
};

async function run(card: HTMLElement, page: HTMLElement | null): Promise<void> {
  const from = boxOf(card);
  const css = getComputedStyle(card);
  const to = guess();
  const quick = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const layer = document.createElement('div');
  layer.setAttribute('data-start-morph', '');
  Object.assign(layer.style, {
    position: 'fixed',
    zIndex: '100000',
    ...frameOf(from),
    background: css.backgroundColor || '#fff',
    boxShadow: '0 0 0 1px rgba(19,20,23,.05), 0 1px 2px rgba(19,20,23,.04), 0 24px 60px -24px rgba(10,37,64,.18)',
    overflow: 'hidden',
    pointerEvents: 'none',
    willChange: 'left, top, width, height',
  });
  /* the card's own content rides along at its size, pinned to the top left, and goes soft as the sheet grows */
  const face = card.cloneNode(true) as HTMLElement;
  Object.assign(face.style, { position: 'absolute', left: '0', top: '0', width: `${from.width}px`, height: `${from.height}px`, margin: '0', background: 'none', boxShadow: 'none', transform: 'none' });
  layer.appendChild(face);
  document.body.appendChild(layer);
  card.style.visibility = 'hidden';

  if (quick) {
    Object.assign(layer.style, frameOf(to));
    face.remove();
  } else {
    /* the window behind the sinking page keeps the page's own light ground, never the dark body */
    const ground = (page && getComputedStyle(page).backgroundColor) || '';
    const lit = ground && !/rgba\(.*,\s*0\)$/.test(ground) && ground !== 'transparent' ? ground : '#eff3f8';
    const was = document.body.style.background;
    document.body.style.background = lit;
    void whenStage().then(() => clock.setTimeout(() => (document.body.style.background = was), 1200));
    if (page) page.style.transformOrigin = `${from.left + from.width / 2}px ${from.top + from.height / 2}px`;
    page?.animate([{ transform: 'none', filter: 'blur(0px)' }, { transform: 'scale(0.97)', filter: 'blur(12px)' }], {
      duration: GROW_MS * 0.8,
      easing: EASE,
      fill: 'forwards',
    });
    face.animate(
      [
        { transform: 'none', filter: 'blur(0px)', opacity: 1 },
        { transform: 'translate(12px, 6px) scale(1.04)', filter: 'blur(8px)', opacity: 0 },
      ],
      { duration: GROW_MS * 0.45, easing: 'ease-out', fill: 'forwards' }
    );
    const grow = layer.animate([frameOf(from), frameOf(to)], { duration: GROW_MS, easing: EASE, fill: 'forwards' });
    await settled(grow, GROW_MS);
  }
  void whenStage().then(() => land(layer));
}

/* Lifts the stage card and grows it into the stage's chat sheet. Resolves once the sheet is in place */
export function playStartMorph(card: HTMLElement, page?: HTMLElement | null): Promise<void> {
  if (running) return running;
  running = run(card, page ?? null).finally(() => {
    running = null;
  });
  return running;
}
