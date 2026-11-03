/* Tools in their own small windows beside the PiP. Chrome gives a tab one Document PiP, so each tool is a plain popup,
   opened in the press that asks for it (a popup needs that press), beside the PiP, then sized to what it holds.
   Only the PiP stays on top in Chrome: a popup goes behind the app you click next, and its key in the PiP brings it back.
   In the desktop app this same window.open becomes a BrowserWindow, and main.ts setWindowOpenHandler can give frames
   named zero-tool-* alwaysOnTop and no frame. Nothing in here changes for that. */
import type { Tool } from './toolStore';

export const TOOL_W = 320;
const GAP = 8;
const FIRST_H: Record<Tool, number> = { todos: 220, resources: 200 };

const wins: Partial<Record<Tool, Window>> = {};

export const toolWin = (t: Tool): Window | undefined => {
  const w = wins[t];
  return w && !w.closed ? w : undefined;
};

/* beside the PiP, top edges level: to its left when the screen has room, else to its right. A second tool sits one further out */
const beside = (from: Window, w: number, slot: number): { x: number; y: number } => {
  const scr = from.screen as Screen & { availLeft?: number; availTop?: number };
  const minX = scr.availLeft ?? 0;
  const maxX = minX + scr.availWidth - w;
  const left = from.screenX - (w + GAP) * (slot + 1);
  const x = left >= minX ? left : from.screenX + from.outerWidth + GAP + (w + GAP) * slot;
  return { x: Math.round(Math.min(Math.max(minX, x), maxX)), y: Math.round(Math.max(scr.availTop ?? 0, from.screenY)) };
};

export function openToolWin(t: Tool, from: Window, slot: number): Window | null {
  const have = toolWin(t);
  if (have) {
    try {
      have.focus();
    } catch {
      /* it is there, focus is the browser's call */
    }
    return have;
  }
  const at = beside(from, TOOL_W, slot);
  const feats = `popup=yes,width=${TOOL_W},height=${FIRST_H[t]},left=${at.x},top=${at.y}`;
  const name = `zero-tool-${t}`;
  let w: Window | null = null;
  try {
    w = from.open('', name, feats);
  } catch {
    w = null;
  }
  if (!w && from !== window) {
    try {
      w = window.open('', name, feats);
    } catch {
      w = null;
    }
  }
  if (w) wins[t] = w;
  return w;
}

export function closeToolWin(t: Tool): void {
  const w = wins[t];
  delete wins[t];
  try {
    w?.close();
  } catch {
    /* already gone */
  }
}

/* the window as tall as what it holds, its frame included */
export function fitToolWin(w: Window, inner: { w: number; h: number }): void {
  try {
    const fw = Math.max(0, w.outerWidth - w.innerWidth);
    const fh = Math.max(0, w.outerHeight - w.innerHeight);
    if (Math.abs(w.innerWidth - inner.w) < 2 && Math.abs(w.innerHeight - inner.h) < 2) return;
    w.resizeTo(Math.round(inner.w + fw), Math.round(inner.h + fh));
  } catch {
    /* the browser kept its size, the body scrolls */
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    closeToolWin('todos');
    closeToolWin('resources');
  });
}
