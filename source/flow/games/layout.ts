/* Layout helpers for the slice, which is drawn as a small Google Sheet. */

/* 0 is A, 25 is Z, 26 is AA */
export function colLetter(i: number): string {
  let n = Math.max(0, Math.floor(i));
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/* the title a csv gets once it is open in Sheets */
export const sheetTitle = (file: string | undefined): string => (file ?? 'Untitled spreadsheet').replace(/\.csv$/i, '');

/* the row number column at 34, the rest shared by how long their values are, so a short id never takes the room a
   plan name needs. Values that still do not fit end in an ellipsis, and the formula bar shows them in full. */
export function gridCols(cols: string[], rows: string[][]): string {
  const w = cols.map((c, i) => {
    const longest = rows.reduce((m, r) => Math.max(m, (r[i] ?? '').length), 0);
    /* the header is set bold, so it needs a little more than its letters */
    return Math.min(22, Math.max(5, longest, Math.ceil(c.length * 1.1)));
  });
  return ['34px', ...w.map((x) => `minmax(0, ${x}fr)`)].join(' ');
}

/* how Sheets sets a value: a plain number goes right, text stays left. A price with a symbol or a comma decimal is
   text in this file, which is half of what the price card is about. Dates stay text here, as the dates card says */
export const isSheetNumber = (v: string): boolean => /^\s*-?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?\s*$/.test(v);

/* a whole sheet keeps its row numbers in place when it is sorted, the rows move under them. A slice of scattered rows
   is a filtered view, so each row keeps its own number */
export function rowNumbers(rowNums: number[] | undefined, order: number[]): (r: number) => number {
  const nums = rowNums ?? [];
  if (nums.every((n, i) => n === i + 2)) return (r) => order.indexOf(r) + 2;
  return (r) => nums[r] ?? r + 2;
}
