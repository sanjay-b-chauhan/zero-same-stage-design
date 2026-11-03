/* The stage's column widths: each one's own minimum and maximum, the rail the slots snap to, and the widths you dragged,
   kept for the next visit. Plain numbers, no DOM. */

export const GUTTER = 8;
export const WORK = { base: 340, min: 260, max: 480 } as const;
export const RAIL = { w: 60, snapIn: 190, snapOut: 220 } as const; /* under 190 it becomes the rail, past 220 it comes back */
export const SIDE = { min: 320, max: 1200 } as const;
export const CHAT_MIN = 440;

export interface Cols {
  work?: number;
  rail?: boolean;
  side?: number; /* a file open beside the chat */
  res?: number; /* the resources list */
}

export type SideKind = 'preview' | 'res';

const KEY = 'zero-stage-cols';

export const readCols = (): Cols => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Cols;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
};

export const saveCols = (c: Cols) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* it still holds for this visit */
  }
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* the side panel's own default, as b5 had it: 400 to 560 with the window */
export const sideBase = (vw: number) => clamp(vw - 1032, 400, 560);

/* the resources list is rows, not files: a third of the stage at most, never the half a sheet wants */
export const RES = { min: 320, max: 440, pull: 720, share: 0.28 } as const; /* b17: it opens at max at most, a pull takes it to 720 */
export const resBase = (body: number) => clamp(Math.round(body * RES.share), RES.min, RES.max);

export const workWidth = (c: Cols) => (c.rail ? RAIL.w : clamp(c.work ?? WORK.base, WORK.min, WORK.max));

/* the side panel never takes the chat under its minimum, whatever the window does */
export const sideRoom = (body: number, work: number) => Math.max(SIDE.min, body - work - CHAT_MIN - GUTTER * 2);

export const sideWidth = (c: Cols, body: number, vw: number, work: number, kind: SideKind = 'preview') =>
  kind === 'res'
    ? clamp(c.res ?? resBase(body), SIDE.min, Math.min(RES.pull, sideRoom(body, work)))
    : clamp(c.side ?? sideBase(vw), SIDE.min, Math.min(SIDE.max, sideRoom(body, work)));

/* where a drag of the work column lands: a width, or the rail */
export const dragWork = (w: number, railed: boolean): { work: number; rail: boolean } => {
  if (railed) return w > RAIL.snapOut ? { work: clamp(w, WORK.min, WORK.max), rail: false } : { work: WORK.min, rail: true };
  if (w < RAIL.snapIn) return { work: WORK.min, rail: true };
  return { work: clamp(w, WORK.min, WORK.max), rail: false };
};

export const dragSide = (w: number, body: number, work: number, kind: SideKind = 'preview') =>
  clamp(w, SIDE.min, Math.min(kind === 'res' ? RES.pull : SIDE.max, sideRoom(body, work)));
