/* Your deliverables. Everything you handed in, newest first: a file type icon, its name, the step it filled, when, and View.
   The icon sits in the chat head beside Resources, with a count. Each new hand in grows out of where it left (the slot, the
   composer, the submit area), flies into the icon, the count goes up, and the window stays closed.
   The window is b36's Submit window: a slab, a 34 high head, a close, dragged by its head. It springs out of the icon and back.
   Everything works from the element's own document, so DeliverablesList also runs inside the PiP. */
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { FileCheck2, FileText, Globe, X } from 'lucide-react';
import { softClick, softLand } from '../../audio';
import { fileRef } from '../../engine/stage';
import { useFlow } from '../../engine/store';
import type { Delivered, Surface } from '../../types';
import { fileIcon, pop, prefersReduced, rise, SNAP } from './util';

const ICON = { size: 16, strokeWidth: 1.75 };
const EMPTY: Delivered[] = [];
const WIN_W = 360;
const GAP = 8;

/* 11:45, the clock time you handed it in */
const hhmm = (at: number): string => {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/* where a hand in left from on screen */
const sourceOf = (doc: Document, from?: string): Element | null => {
  if (!from) return null;
  if (from.startsWith('slot:')) return doc.querySelector(`[data-slot="${from.slice(5).replace(/["\\]/g, '')}"]`);
  if (from === 'composer') return doc.querySelector('.zs2-composer');
  if (from === 'submit') return doc.querySelector('.zs2-work .zs2-submit') ?? doc.querySelector('.zs2-submit');
  return null;
};

export const useDelivered = (): Delivered[] => useFlow((s) => s.delivered ?? EMPTY);

/* the file's own mark when we have one for its type, a csv or a .md. A .txt is a plain page, a link is a globe */
const markOf = (d: Delivered): string | null => {
  if (d.kind === 'csv') return fileIcon('csv');
  if (d.kind === 'text' && /\.md$/i.test(d.name)) return fileIcon('text');
  return null;
};
/* the same two glyphs as lucide's Globe and FileText, for the chip that is built outside React */
const GLYPH = {
  link: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  page: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
};

/* the file type, as a 30 tile */
export function DeliverableIcon({ d }: { d: Delivered }) {
  const f = fileRef(d.fileId);
  if (d.kind === 'image' && f?.url)
    return (
      <span className="zs2-dl-ico" data-kind="image">
        <img src={f.url} alt="" draggable={false} />
      </span>
    );
  const src = markOf(d);
  return (
    <span className="zs2-dl-ico" data-kind={d.kind}>
      {src ? <img src={src} alt="" draggable={false} /> : d.kind === 'link' ? <Globe {...ICON} /> : <FileText {...ICON} />}
    </span>
  );
}

/* the rows. Shared: the PiP renders this list in its own body */
export function DeliverablesList({ surface, onView }: { surface: Surface; onView?: (d: Delivered) => void }) {
  const list = useDelivered();
  const openFile = useFlow((s) => s.actions.openFile);
  const rows = list.slice().reverse();
  if (rows.length === 0)
    return (
      <p className="zs2-dl-none" data-surface={surface}>
        Nothing yet. Anything you hand in lands here.
      </p>
    );
  return (
    <div className="zs2-dl-list" data-surface={surface} role="list">
      {rows.map((d) => (
        <div key={d.id} className="zs2-dl-row" role="listitem" data-did={d.id}>
          <DeliverableIcon d={d} />
          <span className="zs2-dl-t">
            <b title={d.name}>{d.name}</b>
            <em>{d.where}</em>
          </span>
          <span className="zs2-dl-at">{hhmm(d.at)}</span>
          <button
            type="button"
            className="zs2-dl-view"
            aria-label={`View ${d.name}`}
            onClick={() => {
              softClick();
              if (onView) onView(d);
              else openFile(d.fileId);
            }}
          >
            View
          </button>
        </div>
      ))}
    </div>
  );
}

/* a small row grows out of where it left, travels into the icon, and goes */
function flyIn(btn: HTMLElement, d: Delivered, landed: () => void): void {
  const doc = btn.ownerDocument;
  const src = sourceOf(doc, d.from);
  const r = src?.getBoundingClientRect();
  if (!r || r.width + r.height < 1 || prefersReduced(btn)) {
    landed();
    return;
  }
  const chip = doc.createElement('div');
  chip.className = 'zs2-dfly';
  chip.setAttribute('aria-hidden', 'true');
  const icon = markOf(d);
  if (icon) {
    const img = doc.createElement('img');
    img.src = icon;
    img.alt = '';
    chip.appendChild(img);
  } else {
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.75');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = d.kind === 'link' ? GLYPH.link : GLYPH.page;
    chip.appendChild(svg);
  }
  const name = doc.createElement('span');
  name.textContent = d.name;
  chip.appendChild(name);
  doc.body.appendChild(chip);
  const c = chip.getBoundingClientRect();
  const left = Math.max(8, Math.min(r.left + 8, (doc.defaultView?.innerWidth ?? 1200) - c.width - 8));
  const top = r.top + r.height / 2 - c.height / 2;
  chip.style.left = `${left}px`;
  chip.style.top = `${top}px`;
  const to = btn.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (left + c.width / 2);
  const dy = to.top + to.height / 2 - (top + c.height / 2);
  const anim = chip.animate(
    [
      { offset: 0, transform: 'translate(0, 6px) scale(0.6)', filter: 'blur(6px)', opacity: 0, easing: SNAP },
      { offset: 0.32, transform: 'translate(0, 0) scale(1)', filter: 'blur(0px)', opacity: 1 },
      { offset: 0.46, transform: 'translate(0, 0) scale(1)', filter: 'blur(0px)', opacity: 1, easing: 'cubic-bezier(.55,0,.2,1)' },
      { offset: 1, transform: `translate(${dx}px, ${dy}px) scale(0.18)`, filter: 'blur(3px)', opacity: 0.3 },
    ],
    { duration: 1150, fill: 'forwards' }
  );
  let done = false;
  const end = () => {
    if (done) return;
    done = true;
    chip.remove();
    landed();
  };
  anim.onfinish = end;
  anim.oncancel = end;
}

/* the icon with its count. The count goes up when a hand in lands in it */
function DlButton({ open, onToggle, btnRef }: { open: boolean; onToggle: () => void; btnRef: RefObject<HTMLButtonElement | null> }) {
  const list = useDelivered();
  /* rows still in the air are not counted yet. A row handed in again replaces its old one, so it adds nothing */
  const [flying, setFlying] = useState(0);
  const seen = useRef(new Set(list.map((d) => d.id)));
  const count = useRef<HTMLSpanElement>(null);
  const shown = Math.max(0, list.length - flying);

  useEffect(() => {
    const fresh = list.filter((d) => !seen.current.has(d.id));
    seen.current = new Set(list.map((d) => d.id));
    if (fresh.length === 0) return;
    const btn = btnRef.current;
    const pip = useFlow.getState().ui.surface === 'pip';
    fresh
      .filter((d) => !d.quiet)
      .forEach((d, i) => {
        const grows = !d.again;
        const arrive = () => {
          pop(count.current, 0.6);
          softLand(i + 2);
        };
        if (!btn || pip) return arrive();
        if (grows) setFlying((n) => n + 1);
        flyIn(btn, d, () => {
          if (grows) setFlying((n) => Math.max(0, n - 1));
          arrive();
        });
      });
  }, [list, btnRef]);

  return (
    <button
      ref={btnRef}
      type="button"
      className="zs2-ghost zs2-dl-btn zs2-headkey"
      aria-label={`Your deliverables, ${shown}`}
      data-tip="Your deliverables"
      aria-expanded={open}
      data-active={open || undefined}
      onClick={() => {
        softClick();
        onToggle();
      }}
    >
      <FileCheck2 {...ICON} />
      {shown > 0 && (
        <span ref={count} className="zs2-dl-n">
          {shown}
        </span>
      )}
    </button>
  );
}

interface Place {
  top: number;
  right: number;
}

/* b36's window, out of the icon. Dragged by its head, Esc or the close sends it back */
function DlWindow({ anchor, closing, onClose, onGone }: { anchor: HTMLElement; closing: boolean; onClose: () => void; onGone: () => void }) {
  const doc = anchor.ownerDocument;
  const view = doc.defaultView ?? window;
  const count = useDelivered().length;
  const el = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [place] = useState<Place>(() => {
    const a = anchor.getBoundingClientRect();
    return { top: a.bottom + GAP, right: Math.max(GAP, view.innerWidth - a.right) };
  });
  const [off, setOff] = useState({ x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);

  /* where the icon is, from the window's top right corner */
  const toIcon = () => {
    const a = anchor.getBoundingClientRect();
    const w = el.current?.getBoundingClientRect();
    if (!w) return { dx: 0, dy: 0 };
    return { dx: a.left + a.width / 2 - w.right, dy: a.top + a.height / 2 - w.top };
  };

  useLayoutEffect(() => {
    const w = el.current;
    if (!w || prefersReduced(w)) return;
    const { dx, dy } = toIcon();
    w.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, filter: 'blur(6px)', opacity: 0 },
        { transform: 'translate(0, 0) scale(1)', filter: 'blur(0px)', opacity: 1 },
      ],
      { duration: 560, easing: SNAP }
    );
    rise(body.current, { y: 10, blur: 6, ms: 420, delay: 60 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!closing) return;
    const w = el.current;
    if (!w || prefersReduced(w)) {
      onGone();
      return;
    }
    const { dx, dy } = toIcon();
    const anim = w.animate(
      [
        { transform: 'translate(0, 0) scale(1)', filter: 'blur(0px)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, filter: 'blur(5px)', opacity: 0 },
      ],
      { duration: 340, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }
    );
    anim.onfinish = onGone;
    anim.oncancel = onGone;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault();
        onClose();
      }
    };
    doc.addEventListener('keydown', onKey);
    return () => doc.removeEventListener('keydown', onKey);
  }, [doc, onClose]);

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture refused: the drag still follows while the pointer stays on the head */
    }
    el.current?.setAttribute('data-held', '');
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const w = el.current?.getBoundingClientRect();
    const W = view.innerWidth;
    const H = view.innerHeight;
    let x = d.ox + e.clientX - d.x;
    let y = d.oy + e.clientY - d.y;
    if (w) {
      const left0 = w.left - off.x;
      const top0 = w.top - off.y;
      x = Math.min(Math.max(x, GAP - left0), W - GAP - (left0 + w.width));
      y = Math.min(Math.max(y, GAP - top0), H - 40 - top0);
    }
    setOff({ x, y });
  };
  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    el.current?.removeAttribute('data-held');
  };

  return createPortal(
    <div
      className="zs2-win-at zd"
      style={{ top: place.top, right: place.right, width: Math.min(WIN_W, view.innerWidth - GAP * 2), transform: `translate(${off.x}px, ${off.y}px)` }}
    >
    <div ref={el} className="zs2-win" role="dialog" aria-label="Your deliverables">
      <div className="zs2-win-h" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <span className="zs2-win-t">Your deliverables</span>
        <span className="zs2-win-m">{count > 0 ? String(count) : ''}</span>
        <button type="button" className="zs2-win-x" aria-label="Close" onClick={onClose}>
          <X size={14} strokeWidth={2} />
        </button>
      </div>
      <div ref={body} className="zs2-win-b" style={{ maxHeight: Math.max(160, view.innerHeight - place.top - 24) }}>
        <DeliverablesList
          surface="big"
          onView={(d) => {
            useFlow.getState().actions.openFile(d.fileId);
            onClose();
          }}
        />
      </div>
    </div>
    </div>,
    doc.body
  );
}

/* the icon and its window, for the chat head on the big screen */
export default function Deliverables() {
  const btn = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<'closed' | 'open' | 'closing'>('closed');
  const toggle = () => setState((s) => (s === 'open' ? 'closing' : s === 'closed' ? 'open' : s));
  const close = () => setState((s) => (s === 'open' ? 'closing' : s));
  return (
    <>
      <DlButton open={state === 'open'} onToggle={toggle} btnRef={btn} />
      {state !== 'closed' && btn.current && (
        <DlWindow anchor={btn.current} closing={state === 'closing'} onClose={close} onGone={() => setState('closed')} />
      )}
    </>
  );
}
