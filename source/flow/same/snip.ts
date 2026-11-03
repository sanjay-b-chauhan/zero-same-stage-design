/* b31 (his note: "when I click on the screenshot icon, the whole screen should become black, and I should actually drag it
   and take a screenshot. Then it puts a slot in the chat, and I can type and send. It does not send directly"): the
   screen dims, you drag a box, the page under it is drawn into a picture (html-to-image, vendored, MIT) and cropped to
   your box. Esc or a click with no drag lets it go. */
import { toCanvas } from '../vendor/html-to-image/index';

const MIN = 12;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

export const shotName = (d = new Date()) => `Screenshot ${d.getDate()} ${MONTHS[d.getMonth()]} at ${pad(d.getHours())}.${pad(d.getMinutes())}.png`;

export type Snip = { name: string; meta: string; img: string };

type Box = { x: number; y: number; w: number; h: number };

let busy = false;

function pick(): Promise<Box | null> {
  return new Promise((resolve) => {
    const veil = document.createElement('div');
    veil.setAttribute('data-snip', '');
    veil.className = 'ds-snip';
    const box = document.createElement('div');
    box.className = 'ds-snip-box';
    const tip = document.createElement('div');
    tip.className = 'ds-snip-tip';
    tip.textContent = 'Drag over what you want her to see';
    veil.append(box, tip);
    document.body.appendChild(veil);
    let x0 = 0;
    let y0 = 0;
    let down = false;
    let r: Box = { x: 0, y: 0, w: 0, h: 0 };
    const done = (b: Box | null) => {
      window.removeEventListener('keydown', key, true);
      veil.remove();
      resolve(b);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      done(null);
    };
    veil.addEventListener('pointerdown', (e) => {
      down = true;
      x0 = e.clientX;
      y0 = e.clientY;
      veil.setPointerCapture(e.pointerId);
      veil.setAttribute('data-drag', '');
    });
    veil.addEventListener('pointermove', (e) => {
      if (!down) return;
      r = { x: Math.min(x0, e.clientX), y: Math.min(y0, e.clientY), w: Math.abs(e.clientX - x0), h: Math.abs(e.clientY - y0) };
      Object.assign(box.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    });
    veil.addEventListener('pointerup', () => {
      down = false;
      done(r.w >= MIN && r.h >= MIN ? r : null);
    });
    window.addEventListener('keydown', key, true);
  });
}

async function draw(b: Box): Promise<string | null> {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  try {
    const page = await toCanvas(document.body, {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: ratio,
      cacheBust: false,
      filter: (n) => !(n instanceof HTMLElement && n.hasAttribute('data-snip')),
      style: { transform: 'none' },
    });
    const out = document.createElement('canvas');
    out.width = Math.round(b.w * ratio);
    out.height = Math.round(b.h * ratio);
    const g = out.getContext('2d');
    if (!g) return null;
    g.drawImage(page, b.x * ratio, b.y * ratio, b.w * ratio, b.h * ratio, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  } catch {
    return null;
  }
}

/* the flash as the shot is taken, over your box only */
function flash(b: Box) {
  const f = document.createElement('div');
  f.setAttribute('data-snip', '');
  f.className = 'ds-snip-flash';
  Object.assign(f.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` });
  document.body.appendChild(f);
  window.setTimeout(() => f.remove(), 420);
}

export async function snip(): Promise<Snip | null> {
  if (busy) return null;
  busy = true;
  try {
    const b = await pick();
    if (!b) return null;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const img = await draw(b);
    flash(b);
    if (!img) return null;
    return { name: shotName(), meta: `${Math.round(b.w)} x ${Math.round(b.h)}`, img };
  } finally {
    busy = false;
  }
}
