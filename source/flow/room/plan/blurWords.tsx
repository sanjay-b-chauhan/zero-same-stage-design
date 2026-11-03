/* A line that arrives word by word: each word comes sharp out of a blur, rising a little, one after the other.
   words() splits the text into spans the animation can reach; blurWords() plays it and says how long it takes. */
import { energize } from '../../stage/parts/energy';
import { prefersReduced } from '../../stage/parts/util';

const STEP = 55;
const MS = 620;
const EASE = 'cubic-bezier(.22,1,.36,1)';

export const words = (text: string) =>
  text.split(/(\s+)/).map((w, i) => (/^\s+$/.test(w) ? w : <span key={i} className="b-w">{w}</span>));

export function blurWords(el: Element | null, delay = 0): number {
  if (!el || prefersReduced(el)) return 0;
  const ws = [...el.querySelectorAll<HTMLElement>('.b-w')];
  ws.forEach((w, i) =>
    w.animate(
      [
        { transform: 'translateY(8px)', filter: 'blur(10px)', opacity: 0 },
        { transform: 'none', filter: 'blur(0px)', opacity: 1 },
      ],
      { duration: MS, delay: delay + i * STEP, easing: EASE, fill: 'backwards' }
    )
  );
  energize(ws, { delay, step: STEP, ms: MS });
  return ws.length * STEP + MS / 2;
}
