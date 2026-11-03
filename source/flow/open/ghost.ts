/* When Enter hands over to the Room, the opening unmounts at once. A still of the world and its scrim stays under the
   whole app for a moment, behind everything (z-index -1 on the body), so the Room can grow out of the sheet over the
   world it came from instead of over an empty canvas. An opaque Room simply covers it. It removes itself. */
import { clock } from '../clock';

const HOLD_MS = 1400;

export function leaveWorldBehind(img: HTMLImageElement | null, scrim: HTMLElement | null) {
  if (!img) return;
  try {
    document.querySelectorAll('.zo-ghost').forEach((n) => n.remove());
    const r = img.getBoundingClientRect();
    const g = document.createElement('div');
    g.className = 'zo-ghost';
    g.setAttribute('aria-hidden', 'true');
    const still = img.cloneNode() as HTMLImageElement;
    still.className = '';
    Object.assign(still.style, {
      position: 'absolute',
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
      objectFit: 'cover',
    });
    const veil = document.createElement('div');
    veil.className = 'zo-ghost-scrim';
    veil.style.opacity = scrim ? getComputedStyle(scrim).opacity : '0';
    g.append(still, veil);
    document.body.appendChild(g);
    clock.setTimeout(() => g.remove(), HOLD_MS);
  } catch {
    /* without the still the Room grows over the canvas, which is fine */
  }
}
