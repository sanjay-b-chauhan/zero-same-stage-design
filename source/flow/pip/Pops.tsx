/* One small dark tooltip, or one framed thumbnail, at a time. Drawn inside the window, so nothing can spill it:
   in a closed bar there is no room above or below, so a tip sits beside its icon instead.
   Anything with data-tip gets a tip (data-tip-sub, data-tip-keys add the quiet parts). data-frame shows a frame from SeenLine. */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { clock } from '../clock';
import { prefersReduced } from '../stage/parts/util';
import type { Frame } from './seen';
import { frameRegistry } from './SeenLine';

type Pop =
  | { kind: 'tip'; label: string; sub?: string; keys?: string[]; stack: boolean; target: HTMLElement }
  | { kind: 'frame'; frame: Frame; target: HTMLElement };

type Side = 'below' | 'above' | 'left' | 'right';

const GAP = 6;
const EDGE = 6;
const TIP_DELAY_MS = 420;
const FRAME_DELAY_MS = 140;
const WARM_MS = 600;
const FRAME_W = 232;
const FRAME_MAX_H = 160;
const PAD = 4;

const SEL = '[data-tip],[data-frame]';

/* b16 (his note: "add the hover text above it, not below it, outside the pipe"): on the desktop a key in the bar names itself
   above the PiP, outside it. The real window can't draw past its own edge, so there it stays inside */
const floatHost = (p: Pop | null, host: HTMLElement | null): HTMLElement | null =>
  p?.kind === 'tip' && p.target.closest('.zp-bar') ? (host?.closest('.zp-dock') as HTMLElement | null) : null;

const rowRight = (t: HTMLElement, host: DOMRect): number => {
  const row = t.closest('.zp-keys')?.getBoundingClientRect();
  return (row ? row.right : t.getBoundingClientRect().right) - host.left;
};

const STACK_MIN_H = 90; /* a stacked tip needs the window open */

const read = (t: HTMLElement, roomH: number): Pop | null => {
  const id = t.dataset.frame;
  if (id) {
    const frame = frameRegistry.get(id);
    return frame ? { kind: 'frame', frame, target: t } : null;
  }
  const label = t.dataset.tip;
  if (!label) return null;
  const sub = t.dataset.tipSub || undefined;
  return { kind: 'tip', label, sub, keys: t.dataset.tipKeys?.split(' ').filter(Boolean), stack: !!sub && t.dataset.tipStack !== undefined && roomH >= STACK_MIN_H, target: t };
};

/* the frame's box from its real shape, inside what the window has */
const frameBox = (f: Frame, room: number): { w: number; h: number } => {
  const maxW = Math.min(FRAME_W, room - EDGE * 2) - PAD * 2;
  const ratio = f.w > 0 && f.h > 0 ? f.h / f.w : 10 / 16;
  let w = maxW;
  let h = Math.round(w * ratio);
  if (h > FRAME_MAX_H) {
    h = FRAME_MAX_H;
    w = Math.round(h / ratio);
  }
  return { w, h };
};

export default function Pops({ root }: { root: RefObject<HTMLDivElement | null> }) {
  const [pop, setPop] = useState<Pop | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const notch = useRef<HTMLSpanElement>(null);
  const shownAt = useRef(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const doc = el.ownerDocument;
    let wait = 0;
    let leave = 0;
    let current: HTMLElement | null = null;

    const show = (t: HTMLElement) => {
      const p = read(t, el.offsetHeight);
      if (!p) return;
      current = t;
      shownAt.current = Date.now();
      setPop(p);
    };
    const hide = () => {
      clock.clearTimeout(wait);
      clock.clearTimeout(leave);
      if (current) shownAt.current = Date.now();
      current = null;
      setPop(null);
    };
    const over = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.(SEL) as HTMLElement | null;
      if (!t || !el.contains(t)) return;
      clock.clearTimeout(leave);
      if (t === current) return;
      clock.clearTimeout(wait);
      const warm = Date.now() - shownAt.current < WARM_MS;
      const ms = t.dataset.frame ? FRAME_DELAY_MS : warm ? 0 : TIP_DELAY_MS;
      if (ms === 0) show(t);
      else wait = clock.setTimeout(() => show(t), ms);
    };
    const out = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.(SEL) as HTMLElement | null;
      if (!t) return;
      const to = e.relatedTarget as Node | null;
      if (to && t.contains(to)) return;
      clock.clearTimeout(wait);
      if (t === current) leave = clock.setTimeout(hide, 80);
    };
    const focus = (e: FocusEvent) => {
      const t = (e.target as Element | null)?.closest?.(SEL) as HTMLElement | null;
      if (!t || !t.matches(':focus-visible')) return;
      clock.clearTimeout(wait);
      show(t);
    };
    const blur = () => hide();
    /* a press is an answer to the tip. A tap on the frame line shows the frame, for touch */
    const press = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.(SEL) as HTMLElement | null;
      if (t?.dataset.frame) {
        if (current === t) hide();
        else show(t);
        return;
      }
      hide();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && current) hide();
    };
    el.addEventListener('pointerover', over);
    el.addEventListener('pointerout', out);
    el.addEventListener('focusin', focus);
    el.addEventListener('focusout', blur);
    el.addEventListener('pointerdown', press, true);
    el.addEventListener('scroll', hide, true);
    doc.addEventListener('keydown', key);
    return () => {
      clock.clearTimeout(wait);
      clock.clearTimeout(leave);
      el.removeEventListener('pointerover', over);
      el.removeEventListener('pointerout', out);
      el.removeEventListener('focusin', focus);
      el.removeEventListener('focusout', blur);
      el.removeEventListener('pointerdown', press, true);
      el.removeEventListener('scroll', hide, true);
      doc.removeEventListener('keydown', key);
    };
  }, [root]);

  /* place it once it has a size, then let it arrive from the side it points at */
  useLayoutEffect(() => {
    const b = box.current;
    const host = root.current;
    if (!pop || !b || !host) return;
    if (!pop.target.isConnected) {
      setPop(null);
      return;
    }
    const t = pop.target.getBoundingClientRect();
    const dock = floatHost(pop, host);
    if (dock) {
      const D = dock.getBoundingClientRect();
      const vw = dock.ownerDocument.defaultView?.innerWidth ?? D.right;
      const w = b.offsetWidth;
      const h = b.offsetHeight;
      const up = t.top - GAP - h >= EDGE;
      const side: Side = up ? 'above' : 'below';
      const x = Math.max(EDGE, Math.min(vw - w - EDGE, (t.left + t.right) / 2 - w / 2)) - D.left;
      const y = (up ? t.top - GAP - h : t.bottom + GAP) - D.top;
      b.style.left = `${Math.round(x)}px`;
      b.style.top = `${Math.round(y)}px`;
      b.dataset.side = side;
      b.style.visibility = 'visible';
      if (prefersReduced(b)) return;
      b.animate(
        [
          { transform: `translateY(${up ? 4 : -4}px) scale(0.96)`, filter: 'blur(3px)', opacity: 0 },
          { transform: 'none', filter: 'blur(0px)', opacity: 1 },
        ],
        { duration: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
      return;
    }
    const R = host.getBoundingClientRect();
    const r = { left: t.left - R.left, top: t.top - R.top, right: t.right - R.left, bottom: t.bottom - R.top };
    const W = R.width;
    const H = R.height;
    const w = b.offsetWidth;
    const h = b.offsetHeight;
    const cx = (r.left + r.right) / 2;
    const cy = (r.top + r.bottom) / 2;
    const clampX = (x: number) => Math.max(EDGE, Math.min(W - w - EDGE, x));
    const clampY = (y: number) => Math.max(EDGE, Math.min(H - h - EDGE, y));

    let side: Side;
    let x: number;
    let y: number;
    if (pop.kind === 'frame') {
      const below = r.bottom + GAP + 4 + h + EDGE <= H;
      side = below || r.top - GAP - 4 - h < EDGE ? 'below' : 'above';
      x = clampX(r.left - 10);
      y = side === 'below' ? r.bottom + GAP + 4 : r.top - GAP - 4 - h;
    } else if (r.bottom + GAP + h + EDGE <= H) {
      side = 'below';
      x = clampX(cx - w / 2);
      y = r.bottom + GAP;
    } else if (rowRight(pop.target, R) + GAP + w + EDGE <= W) {
      /* the keys sit left beside her face: a tip clears the whole row to its right, so it never sits on the next key */
      side = 'right';
      x = rowRight(pop.target, R) + GAP;
      y = clampY(cy - h / 2);
    } else if (r.left - GAP - w >= EDGE) {
      /* beside a key in the bar it clears the whole row of keys, so it never sits on the next one */
      const row = pop.target.closest('.zp-keys')?.getBoundingClientRect();
      const lx = row ? Math.min(r.left, row.left - R.left) : r.left;
      side = 'left';
      x = lx - GAP - w >= EDGE ? lx - GAP - w : r.left - GAP - w;
      y = clampY(cy - h / 2);
    } else if (r.right + GAP + w + EDGE <= W) {
      side = 'right';
      x = r.right + GAP;
      y = clampY(cy - h / 2);
    } else if (r.top - GAP - h >= EDGE) {
      side = 'above';
      x = clampX(cx - w / 2);
      y = r.top - GAP - h;
    } else {
      /* the folded bar is all there is: the tip sits in the row beside the key, as far right as it fits */
      side = 'right';
      x = clampX(r.right + GAP);
      y = clampY(cy - h / 2);
    }
    b.style.left = `${Math.round(x)}px`;
    b.style.top = `${Math.round(y)}px`;
    b.dataset.side = side;
    b.style.visibility = 'visible';
    const n = notch.current;
    if (n) n.style.left = `${Math.round(Math.max(12, Math.min(w - 12, Math.min(cx, r.left + 28) - x)))}px`;

    if (prefersReduced(b)) return;
    const from =
      side === 'below' ? 'translateY(-4px)' : side === 'above' ? 'translateY(4px)' : side === 'left' ? 'translateX(4px)' : 'translateX(-4px)';
    b.animate(
      [
        { transform: `${from} scale(0.96)`, filter: 'blur(3px)', opacity: 0 },
        { transform: 'none', filter: 'blur(0px)', opacity: 1 },
      ],
      { duration: pop.kind === 'frame' ? 260 : 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );
  }, [pop, root]);

  if (!pop) return null;
  if (pop.kind === 'frame') {
    const R = root.current?.getBoundingClientRect();
    const size = frameBox(pop.frame, R?.width ?? 360);
    return (
      <div ref={box} className="zp-pop zp-frame" style={{ visibility: 'hidden' }} aria-hidden>
        <span ref={notch} className="zp-notch" />
        <img src={pop.frame.url} alt="" width={size.w} height={size.h} draggable={false} />
      </div>
    );
  }
  const dock = floatHost(pop, root.current);
  const tip = (
    <div ref={box} className={`zp-pop zp-tip${dock ? ' zp-pop-out' : ''}`} data-stack={pop.stack || undefined} role="tooltip" style={{ visibility: 'hidden' }}>
      <span className="zp-tip-label">{pop.label}</span>
      {pop.sub && <span className="zp-tip-sub z-num">{pop.sub}</span>}
      {pop.keys && (
        <span className="zp-tip-keys">
          {pop.keys.map((k) => (
            <kbd key={k}>{k}</kbd>
          ))}
        </span>
      )}
    </div>
  );
  return dock ? createPortal(tip, dock) : tip;
}
