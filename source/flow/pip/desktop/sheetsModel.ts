/* How Google Sheets lays out an imported CSV, as plain functions. No DOM, no React.
   Numbers, prices and dates sit on the right, words on the left, the way Sheets reads a cell. */
import { parse, type Table } from '../../data/csv';
import type { FileRef } from '../../types';
import type { LooseFile } from './deskStore';

export const ROW_H = 21;
export const HEAD_H = 24;
export const ROW_HEAD_W = 46;
export const EMPTY_COL_W = 100;
const MIN_ROWS = 100;
const MIN_COLS = 26;
const CHAR_PX = 7.1; /* Arial 10 at 96 dpi, an average glyph */
const CELL_PAD = 12;
const MAX_COL_W = 260;
const MIN_COL_W = 64;

export interface Sheet {
  id: string;
  name: string;
  table: Table;
}

const NUMBER = /^[-+]?[$£€]?\d[\d,]*(\.\d+)?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const US_DATE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const LONG_DATE = /^\d{1,2} [A-Z][a-z]{2} \d{4}$/;

export const alignOf = (v: string): 'left' | 'right' =>
  NUMBER.test(v) || ISO_DATE.test(v) || US_DATE.test(v) || LONG_DATE.test(v) ? 'right' : 'left';

/* A, B ... Z, AA, AB */
export const colName = (i: number): string => {
  let n = i + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

export const cellName = (r: number, c: number) => `${colName(c)}${r + 1}`;

/* every column as wide as its longest value, like a double click on the column edge */
export const colWidths = (t: Table): number[] => {
  const n = Math.max(MIN_COLS, t.cols.length);
  return Array.from({ length: n }, (_, c) => {
    if (c >= t.cols.length) return EMPTY_COL_W;
    let longest = t.cols[c].length;
    for (const row of t.rows) longest = Math.max(longest, (row[c] ?? '').length);
    return Math.round(Math.min(MAX_COL_W, Math.max(MIN_COL_W, longest * CHAR_PX + CELL_PAD)));
  });
};

export const rowCount = (t: Table) => Math.max(MIN_ROWS, t.rows.length + 1 + 20);

/* the header row is row 1, the way the file opens */
export const cellAt = (t: Table, r: number, c: number): string => {
  if (r === 0) return t.cols[c] ?? '';
  return t.rows[r - 1]?.[c] ?? '';
};

/* the doc title is the file name without its extension */
export const docTitle = (name: string) => name.replace(/\.(csv|xlsx?)$/i, '');

/* What Sheets shows: the file asked for, else the CSV she shared on this stage, else the newest one Claude handed back */
export const pickSheet = (files: FileRef[] | undefined, loose: LooseFile[], want: string | undefined): Sheet | null => {
  const shared = (files ?? []).filter((f) => f.kind === 'csv' && f.text !== undefined);
  const byId = want ? shared.find((f) => f.id === want) ?? loose.find((f) => f.id === want) : undefined;
  const pick = byId ?? shared.find((f) => !f.mine) ?? shared[0] ?? loose[loose.length - 1];
  if (!pick || pick.text === undefined) return null;
  return { id: pick.id, name: pick.name, table: parse(pick.text) };
};
