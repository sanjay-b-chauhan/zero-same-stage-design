/* Small helpers the games are written with: real rows out of a table by their sheet row number, the beats, money. */
import { colLetter } from './layout';
import type { GameBeat, GameExcerpt } from './types';

export interface SheetTable {
  cols: string[];
  rows: string[][];
  name?: string;
}

/* rows by sheet row number (header is row 1), only the columns asked for */
export function slice(t: SheetTable, nums: number[], cols: string[], extra: Partial<GameExcerpt> = {}): GameExcerpt {
  const ix = cols.map((c) => t.cols.indexOf(c));
  return {
    cols,
    rows: nums.map((n) => ix.map((i) => (i >= 0 ? (t.rows[n - 2]?.[i] ?? '') : ''))),
    rowNums: nums,
    letters: ix.map((i) => colLetter(Math.max(0, i))),
    ...(t.name ? { file: t.name } : {}),
    ...extra,
  };
}

export const her = (text: string): GameBeat => ({ who: 'her', text });
export const team = (name: string, text: string): GameBeat => ({ who: 'team', name, text });
export const sheetSays = (text: string): GameBeat => ({ who: 'sheet', text });

export const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/* to the cent, halves up, without float drift (605.495 is 605.50) */
export const cents = (n: number) => Math.round((n + Math.sign(n) * 1e-9) * 100) / 100;
/* 1222 -> 1,222.00, 94.92 -> 94.92 */
export const money = (n: number) => cents(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/* 1222 -> 1,222 and 93.92 -> 93.92: the way a person says it */
export const said = (n: number) =>
  Math.abs(n - Math.round(n)) < 0.005 ? Math.round(n).toLocaleString('en-US') : money(n);
export const usd = (n: number) => `$${money(n)}`;

/* a plain number cell, the way a sheet's SUM or AVERAGE reads it: text and symbols are skipped */
export const plainNum = (v: string): number | null => (/^\s*-?\d+(\.\d+)?\s*$/.test(v) ? Number(v) : null);
