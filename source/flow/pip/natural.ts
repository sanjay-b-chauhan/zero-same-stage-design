/* How tall a box's content is, never the room it was handed. A scroller that fills its window reports the window's height
   as its scrollHeight, so a list measured that way only ever grows. This reads its children instead. */
export function naturalH(el: HTMLElement): number {
  const view = el.ownerDocument.defaultView ?? window;
  const cs = view.getComputedStyle(el);
  const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  const kids = Array.from(el.children).filter((k) => {
    const s = view.getComputedStyle(k);
    return s.display !== 'none' && s.position !== 'absolute' && s.position !== 'fixed';
  }) as HTMLElement[];
  if (!kids.length) return Math.ceil(pad);
  const first = kids[0];
  const top = first.getBoundingClientRect().top - (parseFloat(view.getComputedStyle(first).marginTop) || 0);
  let bottom = top;
  for (const k of kids) bottom = Math.max(bottom, k.getBoundingClientRect().bottom + (parseFloat(view.getComputedStyle(k).marginBottom) || 0));
  return Math.ceil(pad + bottom - top);
}
