/* The rules of a card, pure. A card's state is its list of moves played forward from the start, so the big screen and
   the PiP, which both read the same list, always show the same moment. No DOM, no timers. */
import type { GameBeat, GameDef, GameExcerpt, GameFocus, GameMove } from './types';

export type GameStep = { k: 'c'; id: string } | { k: 't'; row: number; col: number } | { k: 'solve' };

export interface Played {
  view: GameExcerpt;
  viewN: number; /* goes up each time the slice is replaced, so its rows land again */
  order: number[];
  cells: Record<string, string>; /* changed values, 'row:col' */
  dim: number[];
  marks: string[]; /* 'row:col' */
  seen: string[]; /* cells you already looked at, 'row:col' */
  total?: string;
  story: { n: number; beats: GameBeat[] } | null; /* what the last move played out */
  used: string[]; /* actions already done */
  moves: number;
  bad: number;
  helped: boolean;
  found: boolean;
  mine: boolean; /* found by the learner's own move */
  focus?: GameFocus;
}

const EMPTY_VIEW: GameExcerpt = { cols: [], rows: [] };
const FINE: GameMove & { then: string } = { then: '', beats: [{ who: 'her', text: "That one's fine." }] };
const TOGETHER: GameBeat = { who: 'her', text: "Here, let's do this one together." };

const k = (r: number, c: number) => `${r}:${c}`;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export function start(game: GameDef): Played {
  const view = game.show ?? EMPTY_VIEW;
  return {
    view,
    viewN: 0,
    order: range(view.rows.length),
    cells: {},
    dim: [],
    marks: (view.mark ?? []).map(([r, c]) => k(r, c)),
    seen: [],
    total: view.total?.value,
    story: null,
    used: [],
    moves: 0,
    bad: 0,
    helped: false,
    found: false,
    mine: false,
  };
}

const tapOf = (view: GameExcerpt, row: number, col: number) => {
  const taps = view.tap ?? [];
  return taps.find((t) => t.row === row && t.col === col) ?? taps.find((t) => t.row === row && t.col === undefined) ?? null;
};

/* a move's effect on the slice, in place on a fresh copy */
function apply(s: Played, m: GameMove) {
  if (m.view) {
    s.view = m.view;
    s.viewN += 1;
    s.order = range(m.view.rows.length);
    s.cells = {};
    s.dim = [];
    s.marks = (m.view.mark ?? []).map(([r, c]) => k(r, c));
    s.seen = [];
    s.total = m.view.total?.value;
    s.focus = undefined;
  }
  if (m.sort && m.sort.length === s.view.rows.length) s.order = m.sort.slice();
  m.set?.forEach(([r, c, v]) => {
    s.cells[k(r, c)] = v;
    if (!s.marks.includes(k(r, c))) s.marks.push(k(r, c));
  });
  if (m.dim) s.dim = m.dim.slice();
  m.mark?.forEach(([r, c]) => {
    if (!s.marks.includes(k(r, c))) s.marks.push(k(r, c));
  });
  if (m.total !== undefined) s.total = m.total;
}

const linesOf = (m: GameMove & { then?: string }): GameBeat[] => [
  ...(m.then ? [{ who: 'sheet' as const, text: m.then }] : []),
  ...(m.beats ?? []),
];

/* the move she plays with you, resolved against the slice as it is now */
function solveMove(game: GameDef, s: Played): { m: GameMove & { then: string }; cell?: [number, number] } | null {
  const ref = game.solve ?? '';
  if (ref.startsWith('c:')) {
    const c = game.choices.find((x) => x.id === ref.slice(2));
    return c ? { m: c } : null;
  }
  if (ref.startsWith('t:')) {
    const [r, c] = ref.slice(2).split(':').map(Number);
    const t = tapOf(s.view, r, Number.isFinite(c) ? c : 0) ?? (s.view.tap ?? []).find((x) => x.row === r && x.right) ?? null;
    if (!t) return null;
    return { m: t, cell: [r, Number.isFinite(c) ? c : (t.col ?? 0)] };
  }
  const first = game.choices.find((x) => x.right);
  if (first) return { m: first };
  const t = (s.view.tap ?? []).find((x) => x.right);
  return t ? { m: t, cell: [t.row, t.col ?? 0] } : null;
}

function finish(s: Played, m: GameMove, cell?: [number, number]) {
  apply(s, m);
  /* a move that brings a new slice marks what it wants itself, the old row numbers mean nothing there */
  if (cell && !m.view && !s.marks.includes(k(cell[0], cell[1]))) s.marks.push(k(cell[0], cell[1]));
  s.found = true;
  s.focus = undefined;
}

/* one step. Returns the same object when the step changes nothing (a cell you already looked at, an action already done) */
export function step(game: GameDef, s0: Played, st: GameStep): Played {
  if (s0.found) return s0;
  const s: Played = {
    ...s0,
    order: s0.order.slice(),
    cells: { ...s0.cells },
    dim: s0.dim.slice(),
    marks: s0.marks.slice(),
    seen: s0.seen.slice(),
    used: s0.used.slice(),
  };

  if (st.k === 'solve') {
    const sv = solveMove(game, s);
    if (!sv) return s0;
    finish(s, sv.m, sv.cell);
    s.story = { n: s.moves, beats: linesOf(sv.m) };
    return s;
  }

  let m: GameMove & { then: string; right?: boolean };
  let cell: [number, number] | undefined;
  if (st.k === 'c') {
    const c = game.choices.find((x) => x.id === st.id);
    if (!c || s.used.includes(c.id)) return s0;
    s.used.push(c.id);
    m = c;
  } else {
    if (st.row < 0 || st.row >= s.view.rows.length) return s0;
    if (s.dim.includes(st.row) && !tapOf(s.view, st.row, st.col)?.right) return s0;
    const key = k(st.row, st.col);
    if (s.seen.includes(key)) {
      /* a cell you already read: it only takes the selection back, it is not a move */
      if (s.seen[s.seen.length - 1] === key) return s0;
      s.seen = [...s.seen.filter((x) => x !== key), key];
      return s;
    }
    s.seen.push(key);
    m = tapOf(s.view, st.row, st.col) ?? s.view.miss ?? FINE;
    cell = [st.row, st.col];
  }

  s.moves += 1;
  const beats = linesOf(m);

  if (m.right) {
    finish(s, m, cell);
    s.mine = true;
    s.story = { n: s.moves, beats };
    return s;
  }

  apply(s, m);
  if (m.neutral) {
    s.story = { n: s.moves, beats };
    return s;
  }

  s.bad += 1;
  if (s.bad === 2 && game.help) {
    s.helped = true;
    apply(s, game.help);
    s.focus = game.help.focus;
    /* she says the help instead of her usual line: what happened stays, her line becomes the help */
    s.story = { n: s.moves, beats: [...beats.filter((b) => b.who !== 'her'), ...linesOf(game.help)] };
    return s;
  }
  if (s.bad >= 3 || (s.bad === 2 && !game.help)) {
    const sv = solveMove(game, s);
    if (sv) {
      finish(s, sv.m, sv.cell);
      s.story = { n: s.moves, beats: [...beats.filter((b) => b.who !== 'her'), TOGETHER, ...linesOf(sv.m)] };
      return s;
    }
  }
  s.story = { n: s.moves, beats };
  return s;
}

export function play(game: GameDef, log: GameStep[]): Played {
  return log.reduce((s, st) => step(game, s, st), start(game));
}

/* the cell Sheets shows as selected: the last cell you tapped, else the first header cell (row -1).
   Her pointer after help is not a selection, it is her cursor in the sheet (focus) */
export function selected(p: Played): { row: number; col: number } {
  const last = p.seen[p.seen.length - 1];
  if (!last) return { row: -1, col: 0 };
  const [row, col] = last.split(':').map(Number);
  return { row, col };
}

/* the value a cell shows now */
export const cellAt = (p: Played, r: number, c: number): string => p.cells[k(r, c)] ?? p.view.rows[r]?.[c] ?? '';
export const cellKey = k;
