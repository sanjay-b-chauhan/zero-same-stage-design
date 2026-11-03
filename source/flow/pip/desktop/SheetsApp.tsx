/* Google Sheets, 1:1 in its own look, showing the real CSV the stage hands out. Not Zero's tokens: the tool stays the tool.
   Title row with the menus, the toolbar pill, the formula bar, column letters and row numbers, gridlines, the sheet tab.
   A click selects a cell, the arrows move it while Sheets is in front, the name box and the formula bar follow. */
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import {
  AlignLeft,
  ArrowDownToLine,
  Baseline,
  Bold,
  ChartColumn,
  ChevronDown,
  ChevronUp,
  CloudCheck,
  Filter,
  FolderInput,
  Grid2x2,
  History,
  Italic,
  Link,
  Lock,
  Menu,
  Merge,
  MessageSquarePlus,
  MessageSquareText,
  Minus,
  PaintBucket,
  PaintRoller,
  Percent,
  Plus,
  Printer,
  Redo2,
  Search,
  Sigma,
  Star,
  Strikethrough,
  Undo2,
  Video,
  WrapText,
} from 'lucide-react';
import type { Table } from '../../data/csv';
import { useFlow } from '../../engine/store';
import { useDesk } from './deskStore';
import { LEARNER } from './learner';
import { alignOf, cellAt, cellName, colName, colWidths, docTitle, HEAD_H, pickSheet, ROW_H, ROW_HEAD_W, rowCount } from './sheetsModel';

const ICON = { size: 18, strokeWidth: 1.75 };
const MENUS = ['File', 'Edit', 'View', 'Insert', 'Format', 'Data', 'Tools', 'Extensions', 'Help'];

function Tool({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <button type="button" className="zgs-tool" data-wide={wide || undefined} aria-label={label} title={label}>
      {children}
    </button>
  );
}

const Sep = () => <span className="zgs-sep" aria-hidden />;

function Toolbar() {
  return (
    <div className="zgs-tools" role="toolbar" aria-label="Main toolbar">
      <div className="zgs-tools-row">
        <Tool label="Search the menus">
          <Search {...ICON} />
        </Tool>
        <Tool label="Undo">
          <Undo2 {...ICON} />
        </Tool>
        <Tool label="Redo">
          <Redo2 {...ICON} />
        </Tool>
        <Tool label="Print">
          <Printer {...ICON} />
        </Tool>
        <Tool label="Paint format">
          <PaintRoller {...ICON} />
        </Tool>
        <Tool label="Zoom" wide>
          <span className="zgs-tool-tx">100%</span>
          <ChevronDown size={14} strokeWidth={2} />
        </Tool>
        <Sep />
        <Tool label="Format as currency">
          <span className="zgs-tool-tx">$</span>
        </Tool>
        <Tool label="Format as percent">
          <Percent size={16} strokeWidth={1.75} />
        </Tool>
        <Tool label="Decrease decimal places">
          <span className="zgs-tool-tx zgs-tool-sm">.0</span>
        </Tool>
        <Tool label="Increase decimal places">
          <span className="zgs-tool-tx zgs-tool-sm">.00</span>
        </Tool>
        <Tool label="More formats" wide>
          <span className="zgs-tool-tx zgs-tool-sm">123</span>
          <ChevronDown size={14} strokeWidth={2} />
        </Tool>
        <Sep />
        <Tool label="Font" wide>
          <span className="zgs-tool-tx zgs-font">Defaul...</span>
          <ChevronDown size={14} strokeWidth={2} />
        </Tool>
        <Sep />
        <Tool label="Decrease font size">
          <Minus size={16} strokeWidth={1.75} />
        </Tool>
        <span className="zgs-size">10</span>
        <Tool label="Increase font size">
          <Plus size={16} strokeWidth={1.75} />
        </Tool>
        <Sep />
        <Tool label="Bold">
          <Bold {...ICON} />
        </Tool>
        <Tool label="Italic">
          <Italic {...ICON} />
        </Tool>
        <Tool label="Strikethrough">
          <Strikethrough {...ICON} />
        </Tool>
        <Tool label="Text colour">
          <Baseline {...ICON} />
        </Tool>
        <Sep />
        <Tool label="Fill colour">
          <PaintBucket {...ICON} />
        </Tool>
        <Tool label="Borders">
          <Grid2x2 {...ICON} />
        </Tool>
        <Tool label="Merge cells">
          <Merge {...ICON} />
        </Tool>
        <Sep />
        <Tool label="Horizontal align" wide>
          <AlignLeft {...ICON} />
          <ChevronDown size={14} strokeWidth={2} />
        </Tool>
        <Tool label="Vertical align" wide>
          <ArrowDownToLine {...ICON} />
          <ChevronDown size={14} strokeWidth={2} />
        </Tool>
        <Tool label="Text wrapping" wide>
          <WrapText {...ICON} />
          <ChevronDown size={14} strokeWidth={2} />
        </Tool>
        <Sep />
        <Tool label="Insert link">
          <Link {...ICON} />
        </Tool>
        <Tool label="Insert comment">
          <MessageSquarePlus {...ICON} />
        </Tool>
        <Tool label="Insert chart">
          <ChartColumn {...ICON} />
        </Tool>
        <Tool label="Create a filter">
          <Filter {...ICON} />
        </Tool>
        <Tool label="Functions">
          <Sigma {...ICON} />
        </Tool>
      </div>
      <Tool label="Hide the menus">
        <ChevronUp {...ICON} />
      </Tool>
    </div>
  );
}

/* Every cell, drawn once per file. Moving the selection never draws them again */
const Cells = memo(function Cells({
  table,
  widths,
  rows,
  total,
  onPick,
}: {
  table: Table;
  widths: number[];
  rows: number;
  total: number;
  onPick: (r: number, c: number) => void;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="zgs-row" style={{ width: total }}>
          <span className="zgs-rowhead">{r + 1}</span>
          {widths.map((w, c) => {
            const v = cellAt(table, r, c);
            return (
              <span key={c} className="zgs-cell" style={{ width: w, textAlign: r > 0 ? alignOf(v) : 'left' }} onPointerDown={() => onPick(r, c)}>
                {v}
              </span>
            );
          })}
        </div>
      ))}
    </>
  );
});

const EMPTY_TABLE: Table = { cols: [], rows: [] };

/* the sheet on screen: the file asked for, else the CSV she shared, else the newest one Claude handed back */
const useSheet = () => {
  const files = useFlow((s) => s.stage?.files);
  const loose = useDesk((d) => d.loose);
  const want = useDesk((d) => d.sheetFile);
  return useMemo(() => pickSheet(files, loose, want), [files, loose, want]);
};

export const useSheetTitle = (): string => {
  const sheet = useSheet();
  return sheet ? docTitle(sheet.name) : 'Untitled spreadsheet';
};

export default function SheetsApp({ active }: { active: boolean }) {
  const sheet = useSheet();
  const table = sheet?.table ?? EMPTY_TABLE;
  const widths = useMemo(() => colWidths(table), [table]);
  const lefts = useMemo(() => widths.reduce<number[]>((acc, w, i) => [...acc, (acc[i] ?? 0) + w], [0]), [widths]);
  const rows = rowCount(table);
  const [sel, setSel] = useState({ r: 0, c: 0 });
  const grid = useRef<HTMLDivElement>(null);
  const keys = useRef<HTMLTextAreaElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const front = useRef(active);
  const pick = useCallback((r: number, c: number) => {
    setSel({ r, c });
    keys.current?.focus({ preventScroll: true });
  }, []);
  const title = sheet ? docTitle(sheet.name) : 'Untitled spreadsheet';

  /* a new file opens at A1 */
  useEffect(() => {
    setSel({ r: 0, c: 0 });
    grid.current?.scrollTo({ top: 0, left: 0 });
  }, [sheet?.id]);

  /* Like the real Sheets, the keys go to a hidden cell input that holds focus while Sheets is in front.
     Being a text field, it keeps the arrows away from anything listening on the page, the dev panel included */
  useEffect(() => {
    front.current = active;
    if (active) keys.current?.focus({ preventScroll: true });
    else keys.current?.blur();
  }, [active]);

  /* a press anywhere in Sheets leaves focus on the cell, the way the real one keeps typing in the grid */
  const keepCellFocus = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as Element).tagName)) return;
    e.preventDefault();
    keys.current?.focus({ preventScroll: true });
  };

  /* a press on the title bar takes focus after the press; it comes back to the cell.
     Focus that went to another app's field stays there */
  const onKeysBlur = () => {
    requestAnimationFrame(() => {
      const a = document.activeElement;
      const lost = !a || a === document.body || (!!root.current?.contains(a) && !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
      if (front.current && lost) keys.current?.focus({ preventScroll: true });
    });
  };

  /* the arrows, Tab and Enter move the selection, and the grid follows it */
  const onKeys = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const step: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      Enter: [1, 0],
      Tab: [0, e.shiftKey ? -1 : 1],
    };
    const d = step[e.key];
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    setSel((s) => ({ r: Math.min(rows - 1, Math.max(0, s.r + d[0])), c: Math.min(widths.length - 1, Math.max(0, s.c + d[1])) }));
  };

  useEffect(() => {
    const g = grid.current;
    if (!g) return;
    const top = HEAD_H + sel.r * ROW_H;
    const left = ROW_HEAD_W + lefts[sel.c];
    if (top - HEAD_H < g.scrollTop) g.scrollTop = top - HEAD_H;
    else if (top + ROW_H > g.scrollTop + g.clientHeight) g.scrollTop = top + ROW_H - g.clientHeight;
    if (left - ROW_HEAD_W < g.scrollLeft) g.scrollLeft = left - ROW_HEAD_W;
    else if (left + widths[sel.c] > g.scrollLeft + g.clientWidth) g.scrollLeft = left + widths[sel.c] - g.clientWidth;
  }, [sel, lefts, widths]);

  const total = ROW_HEAD_W + lefts[lefts.length - 1];
  const value = cellAt(table, sel.r, sel.c);

  return (
    <div ref={root} className="zgs" onMouseDown={keepCellFocus}>
      <header className="zgs-head">
        <img className="zgs-logo" src="static/logos/logo-sheets.svg" alt="Sheets home" draggable={false} />
        <div className="zgs-doc">
          <div className="zgs-doc-top">
            <span className="zgs-title">{title}</span>
            <button type="button" className="zgs-ico" aria-label="Star">
              <Star size={18} strokeWidth={1.75} />
            </button>
            <button type="button" className="zgs-ico" aria-label="Move">
              <FolderInput size={18} strokeWidth={1.75} />
            </button>
            <button type="button" className="zgs-ico" aria-label="Saved to Drive">
              <CloudCheck size={18} strokeWidth={1.75} />
            </button>
          </div>
          <nav className="zgs-menus" aria-label="Menu bar">
            {MENUS.map((m) => (
              <button key={m} type="button" className="zgs-menu">
                {m}
              </button>
            ))}
          </nav>
        </div>
        <div className="zgs-head-r">
          <button type="button" className="zgs-round" aria-label="Last edit">
            <History size={20} strokeWidth={1.75} />
          </button>
          <button type="button" className="zgs-round" aria-label="Comments">
            <MessageSquareText size={20} strokeWidth={1.75} />
          </button>
          <button type="button" className="zgs-round zgs-meet" aria-label="Join a call">
            <Video size={20} strokeWidth={1.75} />
            <ChevronDown size={14} strokeWidth={2} />
          </button>
          <button type="button" className="zgs-share">
            <Lock size={16} strokeWidth={2} />
            Share
          </button>
          <img className="zgs-me" src={LEARNER.face} alt={LEARNER.name} draggable={false} />
        </div>
      </header>

      <Toolbar />

      <div className="zgs-fx">
        <span className="zgs-namebox">
          {cellName(sel.r, sel.c)}
          <ChevronDown size={14} strokeWidth={2} />
        </span>
        <span className="zgs-fx-sep" aria-hidden />
        <span className="zgs-fx-mark" aria-hidden>
          fx
        </span>
        <span className="zgs-fx-val">{value}</span>
      </div>

      <div ref={grid} className="zgs-grid">
        <div className="zgs-sheet" style={{ width: total, height: HEAD_H + rows * ROW_H }}>
          <div className="zgs-row zgs-colheads" style={{ width: total }}>
            <span className="zgs-corner" />
            {widths.map((w, c) => (
              <span key={c} className="zgs-colhead" data-on={c === sel.c || undefined} style={{ width: w }}>
                {colName(c)}
              </span>
            ))}
          </div>
          <Cells table={table} widths={widths} rows={rows} total={total} onPick={pick} />
          {/* the selected row's number lights without drawing the cells again */}
          <style>{`.zgs-sheet > .zgs-row:nth-child(${sel.r + 2}) > .zgs-rowhead { background: var(--zgs-on); color: var(--zgs-on-tx); }`}</style>
          <span
            className="zgs-sel"
            style={{
              transform: `translate(${ROW_HEAD_W + lefts[sel.c] - 1}px, ${HEAD_H + sel.r * ROW_H - 1}px)`,
              width: widths[sel.c] + 1,
              height: ROW_H + 1,
            }}
            aria-hidden
          />
          <textarea
            ref={keys}
            className="zgs-keys"
            readOnly
            aria-label={`Cell ${cellName(sel.r, sel.c)}`}
            value={value}
            onKeyDown={onKeys}
            onBlur={onKeysBlur}
            style={{ transform: `translate(${ROW_HEAD_W + lefts[sel.c]}px, ${HEAD_H + sel.r * ROW_H}px)` }}
          />
        </div>
      </div>

      <footer className="zgs-tabs">
        <button type="button" className="zgs-round zgs-sm" aria-label="Add sheet">
          <Plus size={18} strokeWidth={1.75} />
        </button>
        <button type="button" className="zgs-round zgs-sm" aria-label="All sheets">
          <Menu size={18} strokeWidth={1.75} />
        </button>
        <button type="button" className="zgs-tab" data-on>
          {sheet ? docTitle(sheet.name) : 'Sheet1'}
          <ChevronDown size={14} strokeWidth={2} />
        </button>
      </footer>
    </div>
  );
}
