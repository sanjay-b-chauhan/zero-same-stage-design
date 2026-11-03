/* b15 (his note, 3 Nov: "The green is the energy ... Blur with green, the little blur, and then the text"): a word that
   arrives starts in the green while it is still soft, holds it a beat and takes its own ink as it sharpens. Colour only:
   each reveal keeps its own blur and rise, this rides on top. For the reveals that run from script (the tutorial's spoken
   line, the objective title); the CSS ones carry the same green in their own rules */
import { prefersReduced } from './util';

const FALLBACK = '#4fdc85';
const EASE = 'cubic-bezier(.22,1,.36,1)';

export const greenOf = (el: Element): string => getComputedStyle(el).getPropertyValue('--g-hi').trim() || FALLBACK;

export function energize(words: Element[], { delay = 0, step = 38, ms = 720 } = {}): void {
  const first = words[0];
  if (!first || prefersReduced(first)) return;
  const g = greenOf(first);
  words.forEach((w, i) => {
    try {
      w.animate(
        [
          { color: g, offset: 0 },
          { color: g, offset: 0.4 },
        ],
        { duration: ms, delay: delay + i * step, easing: EASE, fill: 'backwards' }
      );
    } catch {
      /* an engine without partial keyframes keeps the plain reveal */
    }
  });
}
