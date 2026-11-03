/* The fake desktop's measures, as plain functions. No DOM, no React.
   macOS sizes: a 24 menu bar, a Dock of 48 icons on a strip that windows keep clear of. */
import type { Area } from '../dockMotion';
import type { Rect, WinId } from './deskStore';

export const MENU_H = 24;
export const DOCK_ICON = 48;
export const DOCK_STRIP = 74; /* the Dock, its gap under it and a little air over it */
export const EDGE = 12;
export const TITLE_H = 32;
const KEEP_TITLE = 120; /* a window pushed off the side always keeps this much of its title bar on screen */
const TOOL_GAP = 10;

/* where the PiP may rest on the desktop: under the menu bar, over the Dock */
export const DESK_AREA: Area = { top: MENU_H + EDGE, right: 16, bottom: DOCK_STRIP + 4, left: 16 };

export const visible = (vw: number, vh: number): Rect => ({ x: 0, y: MENU_H, w: vw, h: Math.max(200, vh - MENU_H - DOCK_STRIP) });

const MIN: Record<WinId, { w: number; h: number }> = {
  sheets: { w: 520, h: 320 },
  claude: { w: 420, h: 360 },
  todos: { w: 280, h: 120 },
  resources: { w: 280, h: 120 },
};
export const minSize = (id: WinId) => MIN[id];

const PIP_COLUMN = 316; /* the PiP's resting width and its margin: a first window keeps clear of it */

/* The first place an app opens: Sheets wide on the left, Claude a little in from the right, overlapping like a real day.
   Both clear the PiP's resting corner, Sheets by width, Claude by height. On a big monitor they open bigger, like real windows do */
export const firstFrame = (id: WinId, vw: number, vh: number): Rect => {
  const v = visible(vw, vh);
  if (id === 'sheets') {
    const w = Math.min(Math.max(1180, Math.round(vw * 0.62)), vw - PIP_COLUMN - 24);
    const h = Math.min(Math.max(700, Math.round(v.h * 0.82)), v.h - 28);
    const x = Math.min((vw - w) / 2 - 40, vw - PIP_COLUMN - w - EDGE);
    return { x: Math.round(Math.max(EDGE * 2, x)), y: v.y + 14, w, h };
  }
  const w = Math.min(Math.max(760, Math.round(vw * 0.36)), 960, vw - 180);
  const h = Math.min(Math.max(640, Math.round(v.h * 0.7)), v.h - 104);
  return { x: Math.round(Math.max(EDGE, vw - w - 90)), y: v.y + 30, w, h };
};

/* A tool window opens beside the PiP: on its left when there is room, else on its right. The second tool sits one further out.
   Top edges level when the PiP is high, bottom edges level when it is low, so the pair reads as one row. Kept inside the visible desktop. */
export const toolFrame = (pip: Rect | null, w: number, h: number, slot: number, vw: number, vh: number): Rect => {
  const v = visible(vw, vh);
  const at = pip ?? { x: vw - 308, y: v.y + EDGE, w: 292, h: 52 };
  const left = at.x - (w + TOOL_GAP) * (slot + 1);
  const x = left >= EDGE ? left : at.x + at.w + TOOL_GAP + (w + TOOL_GAP) * slot;
  const low = at.y + at.h / 2 > v.y + v.h / 2;
  const level = low ? at.y + at.h - h : at.y;
  const y = Math.min(Math.max(v.y + EDGE, level), vh - DOCK_STRIP - h);
  return { x: Math.round(Math.min(Math.max(EDGE, x), vw - w - EDGE)), y: Math.round(Math.max(v.y + EDGE, y)), w, h };
};

/* a window can go anywhere except above the menu bar, and its title bar never leaves the screen */
export const keepOnScreen = (r: Rect, vw: number, vh: number): Rect => ({
  ...r,
  x: Math.round(Math.min(Math.max(r.x, KEEP_TITLE - r.w), vw - KEEP_TITLE)),
  y: Math.round(Math.min(Math.max(r.y, MENU_H), vh - TITLE_H - 8)),
});

/* the green key: the whole visible desktop, a hair in from its edges */
export const zoomed = (vw: number, vh: number): Rect => {
  const v = visible(vw, vh);
  return { x: 6, y: v.y + 6, w: vw - 12, h: v.h - 12 };
};

/* A window grows out of a point: the transform origin in the window's own box, and the scale it starts from,
   so its first frame is about the size of what it came out of */
export const growFrom = (from: Rect | null | undefined, to: Rect): { origin: string; scale: number } => {
  if (!from) return { origin: '50% 60%', scale: 0.86 };
  const cx = from.x + from.w / 2 - to.x;
  const cy = from.y + from.h / 2 - to.y;
  const scale = Math.min(0.6, Math.max(0.08, Math.max(from.w / to.w, from.h / to.h)));
  return { origin: `${Math.round(cx)}px ${Math.round(cy)}px`, scale };
};
