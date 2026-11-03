/* b21 (his note: "add the inspector vibe like click and change the size and all"): Inspect in Look. Hover outlines what is
   under the pointer with its size, a click picks it and nothing on the page runs, Esc or Inspect again stops. What you change
   lands on its selector, so every element of that kind follows, the way a style does. */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';

interface InspectState {
  on: boolean;
  sel: string | null;
  count: number;
  el: Element | null;
}
export const useInspect = create<InspectState>(() => ({ on: false, sel: null, count: 0, el: null }));
export const setInspecting = (on: boolean) => useInspect.setState({ on });
export const clearPick = () => useInspect.setState({ sel: null, count: 0, el: null });

const OURS = '.zdm-wrap, .zdm-gear, .zdm-hud, [data-zdm-ins]';
const esc = (c: string) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(c) : c);
const classesOf = (el: Element) =>
  [...el.classList]
    .filter((c) => !/^\d/.test(c))
    .slice(0, 2)
    .map((c) => `.${esc(c)}`)
    .join('');

/* the element's own classes; a bare tag takes its nearest classed parent so the rule stays narrow */
export const selectorFor = (el: Element): string => {
  const own = classesOf(el);
  if (own) return own;
  const tag = el.tagName.toLowerCase();
  const up = el.parentElement?.closest('[class]');
  const anc = up ? classesOf(up) : '';
  return anc ? `${anc} ${tag}` : tag;
};

const countOf = (sel: string) => {
  try {
    return document.querySelectorAll(sel).length;
  } catch {
    return 0;
  }
};

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}
const boxOf = (el: Element, label: string): Box => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height, label: `${label}  ${Math.round(r.width)} × ${Math.round(r.height)}` };
};

function Frame({ b, picked }: { b: Box; picked?: boolean }) {
  return (
    <div className="zdm-ins-box" data-zdm-ins data-picked={picked || undefined} style={{ left: b.x, top: b.y, width: b.w, height: b.h }}>
      <span className="zdm-ins-tag" data-below={b.y < 24 || undefined}>
        {b.label}
      </span>
    </div>
  );
}

export default function Inspector() {
  const on = useInspect((s) => s.on);
  const pickedEl = useInspect((s) => s.el);
  const pickedSel = useInspect((s) => s.sel);
  const [hoverEl, setHoverEl] = useState<Element | null>(null);
  const [hover, setHover] = useState<Box | null>(null);
  const [picked, setPicked] = useState<Box | null>(null);

  useEffect(() => {
    if (!on) {
      setHoverEl(null);
      return;
    }
    const page = (t: EventTarget | null): Element | null => (t instanceof Element && !t.closest(OURS) ? t : null);
    const move = (e: PointerEvent) => {
      setHoverEl(page(e.target));
    };
    const block = (e: Event) => {
      if (!page(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const click = (e: MouseEvent) => {
      const el = page(e.target);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      const sel = selectorFor(el);
      useInspect.setState({ sel, el, count: countOf(sel) });
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setInspecting(false);
      }
    };
    const leave = () => setHoverEl(null);
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerdown', block, true);
    document.addEventListener('mousedown', block, true);
    document.addEventListener('mouseup', block, true);
    document.addEventListener('click', click, true);
    document.addEventListener('keydown', key, true);
    document.documentElement.addEventListener('pointerleave', leave);
    document.documentElement.setAttribute('data-zdm-inspecting', '');
    return () => {
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerdown', block, true);
      document.removeEventListener('mousedown', block, true);
      document.removeEventListener('mouseup', block, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('keydown', key, true);
      document.documentElement.removeEventListener('pointerleave', leave);
      document.documentElement.removeAttribute('data-zdm-inspecting');
    };
  }, [on]);

  /* both frames follow their elements through layout changes, while you tune them */
  useEffect(() => {
    if ((!pickedEl || !pickedSel) && !hoverEl) {
      setPicked(null);
      setHover(null);
      return;
    }
    let raf = 0;
    const tick = () => {
      setPicked(pickedEl && pickedSel && pickedEl.isConnected ? boxOf(pickedEl, pickedSel) : null);
      setHover(hoverEl && hoverEl.isConnected ? boxOf(hoverEl, selectorFor(hoverEl)) : null);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [pickedEl, pickedSel, hoverEl]);

  if (!on && !picked) return null;
  return createPortal(
    <>
      {picked && <Frame b={picked} picked />}
      {on && hover && <Frame b={hover} />}
    </>,
    document.body
  );
}
