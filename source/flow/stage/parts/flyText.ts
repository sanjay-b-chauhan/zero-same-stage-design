/* XP without a toast: the words you earned it with lift off where they landed and fly into the Level pill, which takes the
   hit (the HUD bumps its badge when the award lands). Green only because it is verified. Under a second, on its own layer,
   never blocks a click, and gone at once if anything stops it. Reduced motion, the PiP, or no pill: it returns false and
   the award lands in place. */
import { prefersReduced, SPRING } from './util';

const LIFT_MS = 160;
const TRAVEL_MS = 600;

let live: Animation[] = [];

export const stopFlights = () => {
  live.forEach((a) => {
    try {
      a.finish();
    } catch {
      /* already gone */
    }
  });
  live = [];
};

export function flyToLevel(from: Element | null, text: string, onLand: () => void, delay = 0): boolean {
  const doc = from?.ownerDocument;
  if (!from || !doc || doc !== document || !text.trim()) return false;
  const badge = doc.querySelector('[data-xp-badge]');
  if (!badge || prefersReduced(from)) return false;
  const a = from.getBoundingClientRect();
  const b = badge.getBoundingClientRect();
  if (a.width + a.height < 1 || b.width + b.height < 1) return false;

  const src = (from.querySelector('.zs2-slot-label') as HTMLElement | null) ?? (from as HTMLElement);
  const cs = getComputedStyle(src);
  const ghost = doc.createElement('span');
  ghost.className = 'zs2-xpghost';
  ghost.textContent = text;
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.left = `${Math.round(src.getBoundingClientRect().left)}px`;
  ghost.style.top = `${Math.round(a.top + a.height / 2)}px`;
  ghost.style.fontSize = cs.fontSize;
  /* the green of the ground it leaves from: bright on the dark stage, a deeper ink on the light one */
  const ink = cs.getPropertyValue('--g-ink').trim();
  if (ink) ghost.style.color = ink;
  doc.body.appendChild(ghost);

  const g = ghost.getBoundingClientRect();
  const dx = b.left + b.width / 2 - (g.left + g.width / 2);
  /* its top sits on the row's middle and it is lifted by half its height, so its centre is g.top */
  const dy = b.top + b.height / 2 - g.top;
  const total = LIFT_MS + TRAVEL_MS;
  const lift = LIFT_MS / total;
  let landed = false;
  const land = () => {
    if (landed) return;
    landed = true;
    ghost.remove();
    onLand();
  };
  const anim = ghost.animate(
    [
      { offset: 0, transform: 'translate(0, -50%) scale(1)', filter: 'blur(0px)' },
      { offset: lift, transform: 'translate(0, calc(-50% - 6px)) scale(1.06)', filter: 'blur(0px)', easing: SPRING },
      { offset: lift + (1 - lift) * 0.45, transform: `translate(${dx * 0.5}px, calc(-50% + ${dy * 0.5 - 28}px)) scale(0.62)`, filter: 'blur(0.5px)' },
      { offset: 1, transform: `translate(${dx}px, calc(-50% + ${dy}px)) scale(0.08)`, filter: 'blur(2px)' },
    ],
    { duration: total, delay, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'both' }
  );
  live.push(anim);
  anim.finished.then(land, land).finally(() => {
    live = live.filter((x) => x !== anim);
  });
  return true;
}
