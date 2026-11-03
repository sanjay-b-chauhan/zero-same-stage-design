/* Her face from the meeting flies into her first voice note. The note's face sits inside the check-in, which is still
   rising in, so a copy makes the flight on top of the page and the real face shows the moment the copy lands */
export function flyFace(from: DOMRect, to: HTMLElement, ms: number, easing: string) {
  const src = to.querySelector('img')?.getAttribute('src');
  const r = to.getBoundingClientRect();
  if (!src || !r.width || !from.width) return;
  /* the check-in's own rise is still on it: take that off to find where the face settles */
  const pv = to.closest<HTMLElement>('.pv');
  let dy = 0;
  try {
    dy = pv ? new DOMMatrix(getComputedStyle(pv).transform).m42 : 0;
  } catch {
    dy = 0;
  }
  const top = r.top - dy;
  const c = document.createElement('div');
  c.className = 'pv-fly';
  Object.assign(c.style, { left: `${r.left}px`, top: `${top}px`, width: `${r.width}px`, height: `${r.height}px` });
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  c.append(img);
  document.body.append(c);
  to.style.visibility = 'hidden';
  const a = c.animate(
    [
      { transform: `translate(${from.left - r.left}px, ${from.top - top}px) scale(${from.width / r.width})` },
      { transform: 'none' },
    ],
    { duration: ms, easing }
  );
  const done = () => {
    c.remove();
    to.style.visibility = '';
  };
  a.finished.then(done, done);
}
