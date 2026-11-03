/* Smart animate from the breakdown to the objective. For a beat both pages stand, the breakdown under the objective.
   Every piece of the breakdown with a twin on the objective (same data-m) hands over to it:
   a dot grows into its dot, its colour turning on the way; a title and its minutes glide into the row as the same
   words; the card you are on grows into the white card; every other card's outline reshapes into its row and thins
   away; the headline crosses into the title; Got it crosses into Start.
   What has no twin leaves (the second line, the path's segments, Again) or arrives after (the path's lines, the
   deliverable, the left column). Returns how long the breakdown has to stay. */
import { SPRING, SPRING_MS, rise } from '../../stage/parts/util';
import { blurWords } from './blurWords';

const T: KeyframeAnimationOptions = { duration: SPRING_MS, easing: SPRING };
const STAGGER = 30;
const OUT_EASE = 'cubic-bezier(.2,.6,.3,1)';

const twins = (root: Element): Map<string, HTMLElement> => {
  const m = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>('[data-m]').forEach((el) => {
    if (el.dataset.m) m.set(el.dataset.m, el);
  });
  return m;
};

/* the box the words take, not the block they sit in */
const wordsBox = (el: Element): DOMRect => {
  const r = document.createRange();
  r.selectNodeContents(el);
  const b = r.getBoundingClientRect();
  return b.width ? b : el.getBoundingClientRect();
};

const fontPx = (el: Element) => parseFloat(getComputedStyle(el).fontSize) || 1;

/* a glide from where the twin stands, the same thing moving */
function glideIn(b: HTMLElement, ra: DOMRect, rb: DOMRect, scale: number, delay: number, extra?: { from: Keyframe; to: Keyframe }) {
  const dx = ra.left - rb.left;
  const dy = ra.top - rb.top;
  b.animate(
    [
      { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${scale})`, ...extra?.from },
      { transformOrigin: '0 0', transform: 'none', ...extra?.to },
    ],
    { ...T, delay, fill: 'backwards' }
  );
}

/* two different things on one path: the old one blurs away on it, the new one comes sharp along it */
function cross(a: HTMLElement, b: HTMLElement, ra: DOMRect, rb: DOMRect, delay: number, blur = 8) {
  const dx = ra.left - rb.left;
  const dy = ra.top - rb.top;
  const s = rb.height / ra.height;
  b.animate(
    [
      { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${1 / s})`, opacity: 0, filter: `blur(${blur}px)` },
      { opacity: 1, filter: 'blur(0px)', offset: 0.5 },
      { transformOrigin: '0 0', transform: 'none', opacity: 1, filter: 'blur(0px)' },
    ],
    { ...T, delay, fill: 'backwards' }
  );
  a.animate(
    [
      { transformOrigin: '0 0', transform: 'none', opacity: 1, filter: 'blur(0px)' },
      { opacity: 0, filter: `blur(${blur}px)`, offset: 0.45 },
      { transformOrigin: '0 0', transform: `translate(${-dx}px, ${-dy}px) scale(${s})`, opacity: 0, filter: `blur(${blur}px)` },
    ],
    { ...T, delay, fill: 'forwards' }
  );
}

/* a card's surface reshapes into its row's: place, size, corner, fill and outline, with nothing distorted */
function reshape(a: HTMLElement, ra: DOMRect, rb: DOMRect, to: CSSStyleDeclaration | null, delay: number) {
  const cs = getComputedStyle(a);
  [...a.children].forEach((c) => ((c as HTMLElement).style.visibility = 'hidden'));
  const from: Keyframe = {
    transform: 'none',
    width: `${ra.width}px`,
    height: `${ra.height}px`,
    minHeight: '0px',
    borderRadius: cs.borderRadius,
    backgroundColor: cs.backgroundColor,
    boxShadow: cs.boxShadow,
    opacity: 1,
  };
  const end: Keyframe = {
    transform: `translate(${rb.left - ra.left}px, ${rb.top - ra.top}px)`,
    width: `${rb.width}px`,
    height: `${rb.height}px`,
    minHeight: '0px',
    borderRadius: to ? to.borderRadius : cs.borderRadius,
    backgroundColor: to ? to.backgroundColor : cs.backgroundColor,
    boxShadow: to ? to.boxShadow : cs.boxShadow,
    opacity: to ? 1 : 0,
  };
  a.animate([from, end], { ...T, delay, fill: 'forwards' });
}

const out = (el: Element | null | undefined, delay = 0, y = -12) =>
  el?.animate(
    [
      { transform: 'none', filter: 'blur(0px)', opacity: 1 },
      { transform: `translateY(${y}px)`, filter: 'blur(8px)', opacity: 0 },
    ],
    { duration: 240, delay, easing: OUT_EASE, fill: 'forwards' }
  );

export function smartAnimate(from: HTMLElement, to: HTMLElement): number {
  const A = twins(from);
  const B = twins(to);
  const keys = [...B.keys()].filter((k) => A.has(k));
  const row = (k: string) => {
    const id = k.slice(2);
    const rows = [...to.querySelectorAll<HTMLElement>('.ob-row[data-k]')];
    return Math.max(0, rows.findIndex((r) => r.dataset.k === id));
  };

  /* measure everything first, then move */
  const rect = new Map<string, [DOMRect, DOMRect]>();
  keys.forEach((k) => {
    const a = A.get(k)!;
    const b = B.get(k)!;
    rect.set(k, k === 'title' ? [wordsBox(a), wordsBox(b)] : [a.getBoundingClientRect(), b.getBoundingClientRect()]);
  });
  const styleOf = new Map<string, [CSSStyleDeclaration, CSSStyleDeclaration]>();
  keys.forEach((k) => {
    if (k.startsWith('n:') || k.startsWith('c:')) {
      const a = getComputedStyle(A.get(k)!);
      const b = getComputedStyle(B.get(k)!);
      /* frozen now: the live declarations change once the animations start */
      styleOf.set(k, [
        { backgroundColor: a.backgroundColor, color: a.color, boxShadow: a.boxShadow, borderRadius: a.borderRadius } as CSSStyleDeclaration,
        { backgroundColor: b.backgroundColor, color: b.color, boxShadow: b.boxShadow, borderRadius: b.borderRadius } as CSSStyleDeclaration,
      ]);
    }
  });
  const sizes = new Map<string, number>();
  keys.forEach((k) => {
    if (k.startsWith('t:') || k.startsWith('m:')) sizes.set(k, fontPx(A.get(k)!) / fontPx(B.get(k)!));
  });

  keys.forEach((k) => {
    const a = A.get(k)!;
    const b = B.get(k)!;
    const [ra, rb] = rect.get(k)!;
    const d = k.length > 2 && k[1] === ':' ? row(k) * STAGGER : 0;
    /* b11: the headline blurs away and the title comes in word by word, sharp out of a blur */
    if (k === 'title') {
      out(a, 0, -10);
      blurWords(b, 140);
      return;
    }
    if (k === 'go') {
      cross(a, b, ra, rb, 0, 3);
      return;
    }
    if (k.startsWith('n:')) {
      const [sa, sb] = styleOf.get(k)!;
      const dx = ra.left + ra.width / 2 - (rb.left + rb.width / 2);
      const dy = ra.top + ra.height / 2 - (rb.top + rb.height / 2);
      a.style.visibility = 'hidden';
      b.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${ra.width / rb.width})`, backgroundColor: sa.backgroundColor, color: sa.color, boxShadow: sa.boxShadow },
          { transform: 'none', backgroundColor: sb.backgroundColor, color: sb.color, boxShadow: sb.boxShadow },
        ],
        { ...T, delay: d, fill: 'backwards' }
      );
      return;
    }
    if (k.startsWith('t:') || k.startsWith('m:')) {
      a.style.visibility = 'hidden';
      glideIn(b, ra, rb, sizes.get(k)!, d);
      return;
    }
    if (k.startsWith('c:')) {
      const [, sb] = styleOf.get(k)!;
      const surface = b.classList.contains('ob-card');
      reshape(a, ra, rb, surface ? sb : null, d);
      /* the white card is the breakdown card grown: its own fill and shadow wait under it until it lands */
      if (surface) {
        b.animate(
          [
            { backgroundColor: 'transparent', boxShadow: 'none' },
            { backgroundColor: 'transparent', boxShadow: 'none', offset: 0.96 },
            { backgroundColor: sb.backgroundColor, boxShadow: sb.boxShadow },
          ],
          { ...T, delay: d, fill: 'backwards' }
        );
      }
    }
  });

  /* no twin: the breakdown's own pieces leave */
  out(from.querySelector('.pl-g2'), 0);
  from.querySelectorAll('.pl-seg').forEach((el) => out(el, 0, 0));
  out(from.querySelector('.pl-again'), 0, 10);
  from.querySelectorAll<HTMLElement>('.pl-stop[data-in="0"]').forEach((el) => (el.style.visibility = 'hidden'));

  /* no twin: the objective's own pieces arrive once the rows have landed */
  to.querySelectorAll<HTMLElement>('.ob-row').forEach((r, i) => {
    r.querySelectorAll('.ob-ln').forEach((ln) =>
      ln.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
        duration: 380,
        delay: 300 + i * 50,
        easing: 'cubic-bezier(.22,1,.36,1)',
        fill: 'backwards',
      })
    );
    r.querySelectorAll('.ob-del, .ob-dot').forEach((el) => rise(el, { y: 6, blur: 6, delay: 320 }));
  });
  /* then each piece of the left column, one after the other */
  [...to.querySelectorAll('.ob-left [data-rise]')]
    .filter((el) => !el.matches('[data-m="title"]'))
    .forEach((el, i) => rise(el, { y: 14, blur: 10, delay: 420 + i * 90 }));

  return SPRING_MS + row('c:end') * STAGGER + 80;
}
