/* One rect passed from the surface that is leaving to the surface that arrives, so the second can grow out of the first. */
let held: { left: number; top: number; width: number; height: number; radius: number } | null = null;

export const giveRect = (el: Element, radius: number) => {
  const r = el.getBoundingClientRect();
  held = { left: r.left, top: r.top, width: r.width, height: r.height, radius };
};

export const takeRect = () => {
  const r = held;
  held = null;
  return r;
};
