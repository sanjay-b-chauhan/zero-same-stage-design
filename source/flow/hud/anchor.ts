/* Where the pill sits. If the page holds a [data-hud-anchor] box, the pill's right edge and vertical centre match it;
   without one, hud.css keeps the viewport corner. Nothing polls:
   - a MutationObserver notices the box arrive, leave or lose its tag (while a box is held it only checks isConnected,
     and it only measures when the box changes);
   - a ResizeObserver follows the box's size, the window resize event catches a centred frame moving;
   - while the box or anything around it is still moving in (the stage's top row rises on arrival), it waits for that
     animation's finished promise and measures the landed place, never a frame of the way in. transitionend and
     animationend around the box measure again.
   The dev gear lives in the bottom right corner, so the pill never makes room for it. */
import { useEffect, useRef, type RefObject } from 'react';

const ATTR = 'data-hud-anchor';
const SEL = `[${ATTR}]`;
const VARS = ['--zh-cy', '--zh-r'] as const;
const MOVES = /^(transform|translate|scale|rotate|top|left|right|bottom|inset|margin|padding|width|height)/i;

/* an animation that moves or resizes what it is on, and ends */
const moves = (a: Animation) => {
  const e = a.effect;
  if (!e || !Number.isFinite(e.getComputedTiming().endTime ?? Infinity)) return false;
  if (a instanceof CSSTransition) return MOVES.test(a.transitionProperty);
  if (!(e instanceof KeyframeEffect)) return false;
  try {
    return e.getKeyframes().some((k) => Object.keys(k).some((p) => MOVES.test(p)));
  } catch {
    return false;
  }
};

export function useHudAnchor(host: RefObject<HTMLElement | null>, key: unknown) {
  const refresh = useRef<() => void>(() => {});

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cur: Element | null = null;
    let live = true;
    const seen = new WeakSet<Animation>();

    /* true while the box or one of its ancestors is still moving in; measures again once each move finishes */
    const moving = (from: Element) => {
      let busy = false;
      for (let n: Element | null = from; n; n = n.parentElement) {
        for (const a of n.getAnimations()) {
          if (!(a.playState === 'running' || a.pending) || !moves(a)) continue;
          busy = true;
          if (seen.has(a)) continue;
          seen.add(a);
          a.finished.then(place, place);
        }
      }
      return busy;
    };

    function place() {
      if (!live) return;
      if (cur && moving(cur)) return;
      const r = cur?.getBoundingClientRect();
      /* a box with no width is not reserved yet (an empty inline span), so the pill keeps its corner */
      if (!r || r.width < 1 || r.height < 1) {
        for (const v of VARS) el!.style.removeProperty(v);
        return;
      }
      const right = Math.round(document.documentElement.clientWidth - r.right);
      el!.style.setProperty('--zh-cy', `${Math.round(r.top + r.height / 2)}px`);
      el!.style.setProperty('--zh-r', `${right}px`);
    }

    const ro = new ResizeObserver(place);
    const sync = () => {
      let changed = false;
      if (cur && (!cur.isConnected || !cur.hasAttribute(ATTR))) {
        ro.unobserve(cur);
        cur = null;
        changed = true;
      }
      if (!cur) {
        const a = document.querySelector(SEL);
        if (a) {
          cur = a;
          ro.observe(a);
          changed = true;
        }
      }
      if (changed) place();
    };
    const settled = (e: Event) => {
      if (cur && e.target instanceof Node && e.target.contains(cur)) place();
    };

    const mo = new MutationObserver(sync);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: [ATTR] });
    window.addEventListener('resize', place);
    document.addEventListener('transitionend', settled, true);
    document.addEventListener('animationend', settled, true);
    refresh.current = () => {
      sync();
      place();
    };
    refresh.current();

    return () => {
      live = false;
      window.removeEventListener('resize', place);
      document.removeEventListener('transitionend', settled, true);
      document.removeEventListener('animationend', settled, true);
      ro.disconnect();
      mo.disconnect();
      refresh.current = () => {};
      for (const v of VARS) el.style.removeProperty(v);
    };
  }, [host]);

  /* a new screen or phase: look again and measure, the box may have moved */
  useEffect(() => {
    refresh.current();
  }, [key]);
}
