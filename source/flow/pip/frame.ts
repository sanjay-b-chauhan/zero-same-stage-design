/* One frame of what she saw. Never a real capture (his note, 2 Nov: "no real functiaonlity please lets fake it untill we make it"):
   no screen picker, no permission, nothing leaves the page. The frame is the page itself, drawn by deskShot, so on the fake
   desktop it is the sheet you are looking at. When that cannot be drawn, a frame of the Zero file you are working on. */
import { clock } from '../clock';
import { useFlow } from '../engine/store';
import type { FileRef } from '../types';
import { deskShot } from './deskShot';
import type { Frame } from './seen';

const MAX_W = 1440;
const GRAB_WAIT_MS = 3000;

const within = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p, new Promise<null>((res) => clock.setTimeout(() => res(null), ms))]);

const toFrame = (src: CanvasImageSource, sw: number, sh: number, kind: Frame['kind']): Frame | null => {
  if (!sw || !sh) return null;
  const k = Math.min(1, MAX_W / sw);
  const w = Math.round(sw * k);
  const h = Math.round(sh * k);
  try {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    if (!g) return null;
    g.drawImage(src, 0, 0, w, h);
    return { url: c.toDataURL('image/jpeg', 0.84), w, h, kind };
  } catch {
    return null;
  }
};

/* a test can hand in the frame, nothing else changes */
let testScreen: string | null = null;
export const setTestScreen = (url: string | null): void => {
  testScreen = url;
};

export const loadFrame = (url: string, kind: Frame['kind']): Promise<Frame | null> =>
  within(
    new Promise<Frame | null>((res) => {
      const img = new Image();
      img.onload = () => res(toFrame(img, img.naturalWidth, img.naturalHeight, kind));
      img.onerror = () => res(null);
      img.src = url;
    }),
    GRAB_WAIT_MS
  );

/* What is on screen right now, as one frame. The window it came from does not matter: the page is the screen. */
export async function grabScreen(_from?: Window): Promise<Frame | null> {
  if (testScreen) {
    const url = testScreen;
    testScreen = null;
    return url === 'refuse' ? null : loadFrame(url, 'screen');
  }
  return within(deskShot(), GRAB_WAIT_MS);
}

/* ---------- the fallback: a frame of the file in Zero, drawn the way the preview shows it ---------- */

const cells = (line: string): string[] => {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === ',' && !q) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
};

const pickFile = (files: FileRef[]): FileRef | undefined => {
  for (let i = files.length - 1; i >= 0; i--) if (files[i].mine && files[i].text) return files[i];
  for (let i = files.length - 1; i >= 0; i--) if (files[i].text) return files[i];
  return undefined;
};

const fit = (g: CanvasRenderingContext2D, text: string, max: number): string => {
  if (g.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && g.measureText(`${t}...`).width > max) t = t.slice(0, -1);
  return `${t}...`;
};

export function fileFrame(): Frame | null {
  const file = pickFile(useFlow.getState().stage?.files ?? []);
  if (!file?.text) return null;
  const W = 960;
  const H = 600;
  try {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    if (!g) return null;
    const sans = '"Inter", system-ui, sans-serif';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#131417';
    g.font = `500 22px ${sans}`;
    g.textBaseline = 'middle';
    g.fillText(fit(g, file.name, W - 64), 32, 40);
    g.fillStyle = '#6a6f7a';
    g.font = `400 18px ${sans}`;
    g.fillText(fit(g, file.meta, W - 64), 32, 70);

    const lines = file.text.split(/\r?\n/).filter((l) => l.trim());
    const rows = lines.slice(0, 12).map(cells);
    const cols = Math.min(5, Math.max(1, rows[0]?.length ?? 1));
    const top = 104;
    const rowH = 40;
    const colW = (W - 64) / cols;
    rows.forEach((r, i) => {
      const y = top + i * rowH;
      if (y + rowH > H - 8) return;
      if (i === 0) {
        g.fillStyle = '#f6f6f8';
        g.fillRect(24, y, W - 48, rowH);
      }
      g.fillStyle = i === 0 ? '#4e525c' : '#131417';
      g.font = `${i === 0 ? 500 : 400} 17px ${sans}`;
      for (let k = 0; k < cols; k++) g.fillText(fit(g, r[k] ?? '', colW - 20), 32 + k * colW, y + rowH / 2);
      g.fillStyle = '#e7e7eb';
      g.fillRect(24, y + rowH - 1, W - 48, 1);
    });
    return { url: c.toDataURL('image/png'), w: W, h: H, kind: 'file', name: file.name };
  } catch {
    return null;
  }
}
