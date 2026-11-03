/* Her cursor on your screen (b14 co-work). When pointing is the answer, it leaves the PiP from her face and travels on the
   spring to the exact place: the cells in Sheets, a column, an app in the Dock, Claude's box. Her face and a short note ride
   on it, the way a teammate's cursor carries their name in a shared doc. On the sheet the cells she means get her outline,
   the way Sheets marks where a collaborator is. She only points: nothing is clicked, typed or scrolled for you.
   It goes when you act (a press, a scroll, a key anywhere outside the PiP) or when you press it, and slides home to her face. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFlow } from '../../engine/store';
import { prefersReduced, SPRING, SPRING_MS } from '../../stage/parts/util';
import type { PointAt, PointMark } from '../../types';
import { iconRect } from './MacDock';
import { HEAD_H, ROW_HEAD_W } from './sheetsModel';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Placed {
  tip: { x: number; y: number };
  cells: Box[];
  clip: Box | null; /* the sheet's visible cells, so an outline never spills past the grid */
  note: string;
  avoid?: Box; /* her note never sits across this (the Dock she is pointing into) */
}

const boxOf = (el: Element): Box => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

/* the cell for a sheet row (the header is row 1) in the named column, or null when the sheet does not have it */
const sheetCell = (grid: Element, col: string, row: number): Element | null => {
  const rows = grid.querySelectorAll('.zgs-sheet > .zgs-row:not(.zgs-colheads)');
  const head = rows[0];
  if (!head) return null;
  const c = Array.from(head.querySelectorAll('.zgs-cell')).findIndex((x) => x.textContent?.trim() === col);
  if (c < 0) return null;
  return rows[row - 1]?.querySelectorAll('.zgs-cell')[c] ?? null;
};

const inside = (b: Box, clip: Box) => b.y >= clip.y - 1 && b.y + b.h <= clip.y + clip.h + 1 && b.x + b.w > clip.x && b.x < clip.x + clip.w;

/* where the tip goes and which cells get her outline, measured from the page as it is now */
function place(to: PointAt, note: string): Placed | null {
  if (to.at === 'dock') {
    const r = iconRect(to.app);
    const dock = document.querySelector('.zmac .zmac-dock-row');
    return r ? { tip: { x: r.x + r.w * 0.62, y: r.y + r.h * 0.38 }, cells: [], clip: null, note, avoid: dock ? boxOf(dock) : undefined } : null;
  }
  if (to.at === 'claude-input') {
    const el = document.querySelector('.zmac .zcl-input');
    if (!el) return null;
    const r = boxOf(el);
    return { tip: { x: r.x + Math.min(48, r.w * 0.2), y: r.y + Math.min(r.h / 2, 14) }, cells: [], clip: null, note };
  }
  const grid = document.querySelector('.zmac .zgs-grid');
  if (!grid) return null;
  const g = boxOf(grid);
  const clip: Box = { x: g.x + ROW_HEAD_W, y: g.y + HEAD_H, w: Math.max(0, g.w - ROW_HEAD_W), h: Math.max(0, g.h - HEAD_H) };
  const rows = to.at === 'head' ? [1] : to.rows;
  const cells: Box[] = [];
  let first: Box | null = null;
  let hidden: number | null = null;
  for (const n of rows) {
    const el = sheetCell(grid, to.col, n);
    if (!el) continue;
    const b = boxOf(el);
    if (inside(b, clip)) {
      cells.push(b);
      first = first ?? b;
    } else if (hidden === null) hidden = n;
  }
  if (first) {
    return { tip: { x: first.x + Math.min(first.w * 0.55, 64), y: first.y + first.h * 0.62 }, cells, clip, note };
  }
  /* the row is off screen: she points at the column, and the note says where to scroll */
  const head = sheetCell(grid, to.col, 1);
  if (!head) return null;
  const b = boxOf(head);
  const lead = hidden !== null ? `Scroll to row ${hidden}. ` : '';
  return { tip: { x: b.x + Math.min(b.w * 0.55, 64), y: b.y + b.h * 0.62 }, cells: inside(b, clip) ? [b] : [], clip, note: lead + note };
}

/* her face in the PiP, where the cursor leaves from and goes back to */
const home = (): { x: number; y: number } | null => {
  const el = document.querySelector('.zmac .zp-dock .zp-face');
  if (!el) return null;
  const r = boxOf(el);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
};

export default function Pointer() {
  const mark = useFlow((s) => s.ui.point);
  const face = useFlow((s) => s.project?.manager.face);
  const name = useFlow((s) => s.project?.manager.name ?? '');
  const unpoint = useFlow((s) => s.actions.unpoint);
  const [shown, setShown] = useState<{ mark: PointMark; at: Placed } | null>(null);
  const cur = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const cellsBox = useRef<HTMLDivElement>(null);
  const leaving = useRef<Animation | null>(null);
  const arrived = useRef(0);

  /* a new mark is measured once, where things are right now */
  useEffect(() => {
    if (!mark) return;
    leaving.current?.cancel();
    leaving.current = null;
    const at = place(mark.to, mark.note);
    if (!at) {
      unpoint();
      return;
    }
    setShown({ mark, at });
  }, [mark, unpoint]);

  /* cleared: it slides home to her face and goes */
  useEffect(() => {
    if (mark || !shown) return;
    const el = cur.current;
    const to = home();
    if (!el || !to || prefersReduced(el)) {
      setShown(null);
      return;
    }
    const { x, y } = shown.at.tip;
    cellsBox.current?.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.98)', opacity: 0 }], {
      duration: 160,
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
      fill: 'forwards',
    });
    const a = el.animate(
      [
        { transform: `translate(${x}px, ${y}px) scale(1)`, filter: 'blur(0px)', opacity: 1 },
        { transform: `translate(${to.x}px, ${to.y}px) scale(0.4)`, filter: 'blur(3px)', opacity: 0 },
      ],
      { duration: 420, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
    );
    leaving.current = a;
    a.onfinish = () => {
      if (leaving.current === a) setShown(null);
    };
  }, [mark, shown]);

  /* arriving: from her face to the spot on the spring, then the note and the outlines land */
  useLayoutEffect(() => {
    const el = cur.current;
    if (!el || !shown || !mark || shown.mark.id !== mark.id) return;
    const { x, y } = shown.at.tip;
    el.style.transform = `translate(${x}px, ${y}px)`;
    cellsBox.current?.getAnimations().forEach((a) => a.cancel());
    /* the note turns to the left when the right edge is too close, and goes above the tip when under it would cross the
       Dock or run off the bottom */
    const t = tag.current;
    if (t) {
      t.toggleAttribute('data-flip', x + 20 + t.offsetWidth > window.innerWidth - 12);
      const av = shown.at.avoid;
      const under = y + 18 + t.offsetHeight;
      t.toggleAttribute('data-up', under > window.innerHeight - 12 || (!!av && under > av.y));
      t.style.setProperty('--zcw-up', `${Math.max(10, av ? Math.round(y - av.y) + 8 : 10)}px`);
    }
    /* the same mark measured again (the window resized) just moves */
    if (arrived.current === mark.id || prefersReduced(el)) {
      arrived.current = mark.id;
      return;
    }
    arrived.current = mark.id;
    const from = home() ?? { x: x - 120, y: y + 80 };
    el.animate([{ transform: `translate(${from.x}px, ${from.y}px)` }, { transform: `translate(${x}px, ${y}px)` }], {
      duration: SPRING_MS + 200,
      easing: SPRING,
    });
    t?.animate(
      [
        { transform: 'scale(0.6)', filter: 'blur(4px)', opacity: 0 },
        { transform: 'scale(1)', filter: 'blur(0px)', opacity: 1 },
      ],
      { duration: 460, delay: SPRING_MS - 220, easing: SPRING, fill: 'backwards' }
    );
    cellsBox.current?.querySelectorAll('.zcw-cell').forEach((c, i) =>
      c.animate([{ transform: 'scale(1.06)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], {
        duration: 360,
        delay: SPRING_MS - 160 + i * 90,
        easing: SPRING,
        fill: 'backwards',
      })
    );
  }, [shown, mark]);

  /* you acted: a press, a scroll or a key anywhere outside the PiP. Esc too */
  useEffect(() => {
    if (!mark) return;
    const inPip = (t: EventTarget | null) => t instanceof Element && !!t.closest('.zp-dock');
    const press = (e: Event) => {
      if (!inPip(e.target)) unpoint();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift') return;
      if (e.key === 'Escape' || !inPip(e.target)) unpoint();
    };
    const resize = () => {
      const at = place(mark.to, mark.note);
      if (!at) return unpoint();
      setShown({ mark, at });
    };
    document.addEventListener('pointerdown', press, true);
    document.addEventListener('wheel', press, { capture: true, passive: true });
    document.addEventListener('keydown', key, true);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('pointerdown', press, true);
      document.removeEventListener('wheel', press, true);
      document.removeEventListener('keydown', key, true);
      window.removeEventListener('resize', resize);
    };
  }, [mark, unpoint]);

  /* the desktop going away takes her cursor with it */
  useEffect(() => () => unpoint(), [unpoint]);

  if (!shown) return null;
  const { at } = shown;
  const clip = at.clip;
  return (
    <div className="zcw-pointer" aria-live="polite">
      {clip && at.cells.length > 0 && (
        <div ref={cellsBox} className="zcw-cells" style={{ left: clip.x, top: clip.y, width: clip.w, height: clip.h }}>
          {at.cells.map((c, i) => (
            <span key={i} className="zcw-cell" style={{ left: c.x - clip.x - 1, top: c.y - clip.y - 1, width: c.w + 1, height: c.h + 1 }} />
          ))}
        </div>
      )}
      <div ref={cur} className="zcw-cur">
        <svg className="zcw-arrow" width="20" height="22" viewBox="0 0 20 22" aria-hidden>
          <path d="M2 1.5v16l4.2-3.9 2.8 6.4 2.8-1.2-2.7-6.2 5.7-.2z" />
        </svg>
        <div
          ref={tag}
          className="zcw-tag"
          role="button"
          tabIndex={-1}
          aria-label={`${name}: ${at.note}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            unpoint();
          }}
        >
          {face && <img className="zcw-face" src={face} alt="" draggable={false} />}
          <span className="zcw-note">{at.note}</span>
        </div>
      </div>
    </div>
  );
}
