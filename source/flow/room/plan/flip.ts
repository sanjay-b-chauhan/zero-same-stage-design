/* FLIP for the plan's path. Read every [data-flip] box before the commit, then after it each box that was there glides
   from where it stood (place and width) to where it is now. Boxes that are new are handed back, so they can arrive. */

export type PlanSnapshot = Map<string, DOMRect>;

export const takeSnapshot = (root: Element | null): PlanSnapshot | null => {
  if (!root) return null;
  const snap: PlanSnapshot = new Map();
  root.querySelectorAll<HTMLElement>('[data-flip]').forEach((el) => {
    const key = el.dataset.flip;
    if (key) snap.set(key, el.getBoundingClientRect());
  });
  return snap;
};

export const glideFrom = (snap: PlanSnapshot, root: Element, timing: KeyframeAnimationOptions): HTMLElement[] => {
  const fresh: HTMLElement[] = [];
  root.querySelectorAll<HTMLElement>('[data-flip]').forEach((el) => {
    const was = el.dataset.flip ? snap.get(el.dataset.flip) : undefined;
    if (!was) {
      fresh.push(el);
      return;
    }
    const now = el.getBoundingClientRect();
    const dx = was.left - now.left;
    const dy = was.top - now.top;
    const sameW = Math.abs(was.width - now.width) < 0.5;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && sameW) return;
    const from: Keyframe = { transform: `translate(${dx}px, ${dy}px)` };
    const to: Keyframe = { transform: 'none' };
    if (!sameW) {
      from.width = `${was.width}px`;
      to.width = `${now.width}px`;
    }
    el.animate([from, to], timing);
  });
  return fresh;
};
