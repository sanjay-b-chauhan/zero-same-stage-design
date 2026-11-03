/* Where b36's check-in card sits and how its meter is drawn. Pure. */

export const CARD_W = 400;
/* b17: the card never comes lower than this over the film's foot, so the progress line runs under it, never through it */
export const CARD_FLOOR = 44;

export interface CardPlace {
  left: number; /* inside the film */
  bottom: number;
  maxH: number;
  originX: number; /* the mark, from the card's left edge */
}

/* right above the mark that asked, centred on it, never closer than 16 to the film's edge, 26 clear of the mark */
export function placeCard(mark: DOMRect, frame: DOMRect): CardPlace {
  const mx = mark.left + mark.width / 2 - frame.left;
  const my = mark.top + mark.height / 2 - frame.top;
  const left = Math.round(Math.max(16, Math.min(frame.width - 16 - CARD_W, mx - CARD_W / 2)));
  const bottom = Math.max(CARD_FLOOR, Math.round(frame.height - (my - 26)));
  return { left, bottom, maxH: Math.round(frame.height - bottom - 16), originX: Math.round(mx - left) };
}

/* the meter around her face: one arc per point she listens for, clockwise from the foot, b36's numbers */
export function ringArcs(n: number): string[] {
  const C = 52;
  const r = 49;
  const gb = 14;
  const gap = n > 1 ? 14 : 0;
  const len = (360 - gb - (n - 1) * gap) / Math.max(1, n);
  const pt = (a: number) => {
    const t = (a * Math.PI) / 180;
    return `${(C + r * Math.sin(t)).toFixed(2)} ${(C - r * Math.cos(t)).toFixed(2)}`;
  };
  const out: string[] = [];
  let a = 180 + gb / 2;
  for (let i = 0; i < n; i++) {
    out.push(`M${pt(a)}A${r} ${r} 0 ${len > 180 ? 1 : 0} 1 ${pt(a + len)}`);
    a += len + gap;
  }
  return out;
}
