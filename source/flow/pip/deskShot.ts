/* One frame of what is on screen, drawn from the page itself (his note, 2 Nov: no real screen capture, ever, so no picker).
   It paints what the eye sees, in order: fills, hairline outlines, pictures, icons and text, each clipped by the boxes that
   clip it. Gradients become their middle colour, blur and shadows are left out. Good enough to read as a screenshot in a
   232 wide frame, and it never asks the browser for anything. */
import type { Frame } from './seen';

const MAX_W = 1440;
const SKIP = '.zcw-pointer, .zp-dock, .zp-pop, .zdm, script, style, template, noscript';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Op =
  | { k: 'fill'; b: Box; r: number; c: string; a: number; clip: Box }
  | { k: 'ring'; b: Box; r: number; c: string; lw: number; inset: boolean; a: number; clip: Box }
  | { k: 'img'; el: HTMLImageElement | HTMLCanvasElement; b: Box; r: number; top: boolean; a: number; clip: Box }
  | { k: 'svg'; src: string; b: Box; a: number; clip: Box }
  | { k: 'text'; s: string; b: Box; font: string; c: string; a: number; clip: Box; lines: DOMRect[] };

const cut = (a: Box, b: Box): Box | null => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const r = Math.min(a.x + a.w, b.x + b.w);
  const t = Math.min(a.y + a.h, b.y + b.h);
  return r > x && t > y ? { x, y, w: r - x, h: t - y } : null;
};

const boxOf = (r: DOMRect): Box => ({ x: r.left, y: r.top, w: r.width, h: r.height });

const alphaOf = (c: string): number => {
  if (!c || c === 'transparent') return 0;
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (!m) return 1;
  const p = m[1].split(/[,/\s]+/).filter(Boolean);
  return p.length >= 4 ? parseFloat(p[3]) : 1;
};

/* the middle colour of a gradient, for things like the green disc */
const gradMid = (img: string): string | null => {
  const cs = img.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi);
  return cs && cs.length ? cs[Math.floor(cs.length / 2)] : null;
};

const radiusOf = (cs: CSSStyleDeclaration, b: Box): number => {
  const raw = cs.borderTopLeftRadius;
  const v = raw.endsWith('%') ? (parseFloat(raw) / 100) * Math.min(b.w, b.h) : parseFloat(raw) || 0;
  return Math.min(v, b.w / 2, b.h / 2);
};

/* box-shadow hairlines: "0 0 0 1px colour" and the inset kind. Blurred shadows are not drawn */
const ringsOf = (shadow: string): Array<{ c: string; lw: number; inset: boolean }> => {
  if (!shadow || shadow === 'none') return [];
  const out: Array<{ c: string; lw: number; inset: boolean }> = [];
  for (const part of shadow.split(/,(?![^(]*\))/)) {
    const c = /rgba?\([^)]+\)|#[0-9a-f]{3,8}/i.exec(part)?.[0];
    const nums = part.replace(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi, '').match(/-?[\d.]+px|\b0\b/g) ?? [];
    const [x, y, blur, spread] = nums.map((n) => parseFloat(n));
    if (!c || alphaOf(c) === 0 || x || y || blur || !spread) continue;
    out.push({ c, lw: spread, inset: /inset/.test(part) });
  }
  return out;
};

const sameOrigin = (src: string): boolean => {
  if (!src) return false;
  if (src.startsWith('data:') || src.startsWith('blob:')) return true;
  try {
    return new URL(src, location.href).origin === location.origin;
  } catch {
    return false;
  }
};

/* an icon as a picture: its own markup with the colour it is drawn in */
const svgSrc = (el: SVGSVGElement, color: string, b: Box): string | null => {
  try {
    const c = el.cloneNode(true) as SVGSVGElement;
    c.setAttribute('width', String(Math.round(b.w)));
    c.setAttribute('height', String(Math.round(b.h)));
    c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const s = new XMLSerializer().serializeToString(c).replace(/currentColor/g, color);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
  } catch {
    return null;
  }
};

const zOf = (el: Element): number => {
  const cs = getComputedStyle(el);
  if (cs.position === 'static') return 0;
  const z = parseInt(cs.zIndex, 10);
  return Number.isFinite(z) ? z : 0;
};

/* the walk: what would be painted, in order, and what clips it */
function collect(root: Element, view: Box): Op[] {
  const ops: Op[] = [];
  const walk = (el: Element, clip: Box, alpha: number) => {
    if (el.matches(SKIP)) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const a = alpha * (parseFloat(cs.opacity) || 0);
    if (a < 0.02) return;
    const r = el.getBoundingClientRect();
    const b = boxOf(r);
    const fixed = cs.position === 'fixed';
    const here = fixed ? view : clip;
    const seen = b.w > 0 && b.h > 0 ? cut(b, here) : null;
    /* far outside what clips it: rows of a sheet below the fold, a list scrolled away */
    if (b.w > 0 && b.h > 0 && !seen && cs.display !== 'contents') {
      const far = b.y > here.y + here.h + 200 || b.y + b.h < here.y - 200 || b.x > here.x + here.w + 200 || b.x + b.w < here.x - 200;
      if (far) return;
    }
    if (seen) {
      const rad = radiusOf(cs, b);
      let bg = cs.backgroundColor;
      if (alphaOf(bg) === 0 && cs.backgroundImage && cs.backgroundImage !== 'none') bg = gradMid(cs.backgroundImage) ?? bg;
      if (alphaOf(bg) > 0) ops.push({ k: 'fill', b, r: rad, c: bg, a, clip: here });
      const bw = parseFloat(cs.borderTopWidth) || 0;
      if (bw > 0 && alphaOf(cs.borderTopColor) > 0 && cs.borderTopStyle !== 'none') {
        ops.push({ k: 'ring', b, r: rad, c: cs.borderTopColor, lw: bw, inset: true, a, clip: here });
      }
      for (const ring of ringsOf(cs.boxShadow)) ops.push({ k: 'ring', b, r: rad, ...ring, a, clip: here });
      if (el instanceof HTMLImageElement && el.complete && el.naturalWidth && sameOrigin(el.currentSrc || el.src)) {
        ops.push({ k: 'img', el, b, r: rad, top: /top|0%/.test(cs.objectPosition.split(' ')[1] ?? ''), a, clip: here });
      }
      if (el instanceof HTMLCanvasElement) ops.push({ k: 'img', el, b, r: rad, top: false, a, clip: here });
      if (el instanceof SVGSVGElement) {
        const src = svgSrc(el, cs.color, b);
        if (src) ops.push({ k: 'svg', src, b, a, clip: here });
        return;
      }
    }
    if (el instanceof HTMLImageElement || el instanceof HTMLCanvasElement || el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      if ((el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) && el.value && seen && cs.color && el.type !== 'file') {
        ops.push({ k: 'text', s: el.value, b, font: fontOf(cs), c: cs.color, a, clip: cut(b, here) ?? here, lines: [] });
      }
      return;
    }
    const scrolls = cs.overflowX !== 'visible' || cs.overflowY !== 'visible';
    const inner = scrolls && b.w > 0 && b.h > 0 ? cut(b, here) : here;
    if (!inner) return;
    const kids = Array.from(el.childNodes);
    const els = kids.filter((n): n is Element => n.nodeType === 1);
    const order = els.some((k) => zOf(k) !== 0) ? [...els].sort((p, q) => zOf(p) - zOf(q)) : null;
    if (order) {
      /* text of this element first, then its children by their stacking */
      for (const n of kids) if (n.nodeType === 3) text(n as Text, cs, inner, a);
      for (const k of order) walk(k, inner, a);
      return;
    }
    for (const n of kids) {
      if (n.nodeType === 3) text(n as Text, cs, inner, a);
      else if (n.nodeType === 1) walk(n as Element, inner, a);
    }
  };
  const text = (n: Text, cs: CSSStyleDeclaration, clip: Box, a: number) => {
    const s = n.data.replace(/\s+/g, ' ').trim();
    if (!s || alphaOf(cs.color) === 0) return;
    const range = document.createRange();
    range.selectNodeContents(n);
    const lines = Array.from(range.getClientRects()).filter((x) => x.width > 0 && x.height > 0);
    if (!lines.length) return;
    const all = boxOf(range.getBoundingClientRect());
    if (!cut(all, clip)) return;
    ops.push({ k: 'text', s, b: all, font: fontOf(cs), c: cs.color, a, clip, lines });
  };
  walk(root, view, 1);
  return ops;
}

const fontOf = (cs: CSSStyleDeclaration) => `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

const roundRect = (g: CanvasRenderingContext2D, b: Box, r: number) => {
  g.beginPath();
  if (r > 0 && typeof g.roundRect === 'function') g.roundRect(b.x, b.y, b.w, b.h, r);
  else g.rect(b.x, b.y, b.w, b.h);
};

const loadSvg = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });

/* words laid into the line boxes the page gave them, so a wrapped line wraps where it did */
const drawText = (g: CanvasRenderingContext2D, op: Extract<Op, { k: 'text' }>) => {
  g.font = op.font;
  g.fillStyle = op.c;
  g.textBaseline = 'middle';
  const lines = op.lines.length ? op.lines : [new DOMRect(op.b.x + 4, op.b.y, op.b.w - 8, op.b.h)];
  if (lines.length === 1) {
    const l = lines[0];
    g.fillText(op.s, l.left, l.top + l.height / 2);
    return;
  }
  const words = op.s.split(' ');
  let i = 0;
  for (const l of lines) {
    let line = '';
    while (i < words.length) {
      const next = line ? `${line} ${words[i]}` : words[i];
      if (line && g.measureText(next).width > l.width + 2) break;
      line = next;
      i++;
    }
    g.fillText(line, l.left, l.top + l.height / 2);
  }
};

/* the page as a picture. Root defaults to the whole page */
export async function deskShot(root: Element = document.documentElement): Promise<Frame | null> {
  try {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const view: Box = { x: 0, y: 0, w: vw, h: vh };
    const ops = collect(root, view);
    const icons = new Map<string, HTMLImageElement | null>();
    await Promise.all(
      ops.filter((o): o is Extract<Op, { k: 'svg' }> => o.k === 'svg').map(async (o) => {
        if (!icons.has(o.src)) icons.set(o.src, await loadSvg(o.src));
      })
    );
    const k = Math.min(1, MAX_W / vw);
    const c = document.createElement('canvas');
    c.width = Math.round(vw * k);
    c.height = Math.round(vh * k);
    const g = c.getContext('2d');
    if (!g) return null;
    g.scale(k, k);
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    g.fillStyle = alphaOf(bodyBg) > 0 ? bodyBg : '#f3f3f5';
    g.fillRect(0, 0, vw, vh);
    for (const op of ops) {
      g.save();
      g.beginPath();
      g.rect(op.clip.x, op.clip.y, op.clip.w, op.clip.h);
      g.clip();
      g.globalAlpha = op.a;
      if (op.k === 'fill') {
        g.fillStyle = op.c;
        roundRect(g, op.b, op.r);
        g.fill();
      } else if (op.k === 'ring') {
        g.strokeStyle = op.c;
        g.lineWidth = op.lw;
        const d = op.inset ? op.lw / 2 : -op.lw / 2;
        roundRect(g, { x: op.b.x + d, y: op.b.y + d, w: op.b.w - d * 2, h: op.b.h - d * 2 }, Math.max(0, op.r - d));
        g.stroke();
      } else if (op.k === 'img') {
        roundRect(g, op.b, op.r);
        g.clip();
        const sw = op.el instanceof HTMLImageElement ? op.el.naturalWidth : op.el.width;
        const sh = op.el instanceof HTMLImageElement ? op.el.naturalHeight : op.el.height;
        const s = Math.max(op.b.w / sw, op.b.h / sh);
        const cw = op.b.w / s;
        const ch = op.b.h / s;
        g.drawImage(op.el, (sw - cw) / 2, op.top ? 0 : (sh - ch) / 2, cw, ch, op.b.x, op.b.y, op.b.w, op.b.h);
      } else if (op.k === 'svg') {
        const img = icons.get(op.src);
        if (img) g.drawImage(img, op.b.x, op.b.y, op.b.w, op.b.h);
      } else drawText(g, op);
      g.restore();
    }
    return { url: c.toDataURL('image/jpeg', 0.84), w: c.width, h: c.height, kind: 'screen' };
  } catch {
    return null;
  }
}
