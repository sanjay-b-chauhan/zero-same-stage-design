/* The file side of the stage. Reads a real CSV, cleans one the way Claude would given a prompt, and checks whatever gets submitted.
   Feedback is computed from the file itself, so a row number on screen is a row in that file. */
import type { RawData } from './raw';
import type { ReviewItem, ReviewResult } from './defs';

export interface Table {
  cols: string[];
  rows: string[][];
}

export const parse = (txt: string): Table => {
  const out: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) {
      if (c === '"' && txt[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
      continue;
    }
    if (c === '"') q = true;
    else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\n') {
      row.push(cur);
      out.push(row);
      row = [];
      cur = '';
    } else if (c !== '\r') cur += c;
  }
  if (cur !== '' || row.length) {
    row.push(cur);
    out.push(row);
  }
  const rows = out.filter((r) => r.length > 1 || (r[0] || '').trim() !== '');
  return { cols: (rows[0] || []).map((c) => c.trim()), rows: rows.slice(1) };
};

const cell = (v: string) => (/[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));

export const toCsv = (cols: string[], rows: string[][]) =>
  [cols.join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n') + '\n';

export const num = (v: string): number | null => {
  const s = String(v).replace(/[^\d.,\-]/g, '');
  const n = parseFloat(/,\d{2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, ''));
  return isNaN(n) ? null : n;
};

const MON: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

const isoDate = (v: string) => {
  const s = String(v).trim();
  let m: RegExpMatchArray | null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)))
    return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  if ((m = s.match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/)))
    return `${m[3]}-${String(MON[m[2].toLowerCase()] || 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return s;
};

const planOf = (v: string, plans: string[]) => {
  const s = String(v).toLowerCase();
  if (/duo/.test(s)) return plans[1];
  if (/fam/.test(s)) return plans[2];
  if (/stud/.test(s)) return plans[3];
  if (/ind/.test(s)) return plans[0];
  return v;
};

export const list = (a: Array<string | number>) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);

export const rowsWord = (a: number[]) => (a.length === 1 ? 'row ' : 'rows ') + list(a.slice(0, 6)) + (a.length > 6 ? ' and more' : '');

export interface CleanFx {
  region?: boolean;
  regionAll?: boolean;
  currency?: boolean;
  mismatch?: boolean;
  keepNames?: boolean;
  dropNames?: boolean;
  dedupe?: boolean;
  tests?: boolean;
  price?: boolean;
  plan?: boolean;
  dates?: boolean;
}

/* What Claude hands back depends on what it was told. */
export const clean = (RAW: RawData, fx: CleanFx): string => {
  const c = RAW.cols;
  const ix = Object.fromEntries(c.map((k, i) => [k, i])) as Record<string, number>;
  const seen = new Set<string>();
  const out: string[][] = [];
  RAW.rows.forEach((r0) => {
    const r = r0.slice();
    const id = r[ix.customer_id];
    const city = r[ix.billing_city];
    const mk = RAW.market[RAW.city[city]];
    if (fx.tests && /^SP-99/.test(id)) return;
    if (fx.dedupe) {
      if (seen.has(id)) return;
      seen.add(id);
    }
    if (fx.dropNames && !r[ix.customer_name]) return;
    if (!r[ix.customer_name] && fx.keepNames) r[ix.customer_name] = 'Unknown';
    if (fx.plan) r[ix.plan] = planOf(r[ix.plan], RAW.plans);
    if (fx.dates) r[ix.signup_date] = isoDate(r[ix.signup_date]);
    if (fx.price) {
      let n = num(r[ix.monthly_price]);
      if (n !== null) {
        n = Math.abs(n);
        if (n >= 1000) n = n / 100;
        const pi = RAW.plans.indexOf(planOf(r[ix.plan], RAW.plans));
        if (n === 0 && mk && pi >= 0) n = mk.p[pi];
        r[ix.monthly_price] = String(n);
      }
    }
    if (fx.currency && !r[ix.currency] && mk) r[ix.currency] = mk.cur;
    if (fx.mismatch && mk) r[ix.currency] = mk.cur;
    out.push(r);
  });
  if (!fx.region) return toCsv(c, out);
  const at = ix.billing_city + 1;
  const cols = [...c.slice(0, at), 'region', ...c.slice(at)];
  return toCsv(
    cols,
    out.map((r) => {
      const city = r[ix.billing_city];
      const mk = RAW.market[RAW.city[city]];
      const v = mk && (fx.regionAll || city !== 'Bengaluru') ? mk.region : '';
      return [...r.slice(0, at), v, ...r.slice(at)];
    })
  );
};

/* Reads a submitted file the way she would. Returns feedback items, biggest first, and the numbers for the approved card */
export const check = (RAW: RawData, txt: string): ReviewResult => {
  const p = parse(txt || '');
  const low = p.cols.map((x) => x.toLowerCase());
  const at = (n: string) => low.indexOf(n);
  const idC = at('customer_id');
  const priceC = at('monthly_price');
  if (idC < 0 || priceC < 0)
    return {
      wrong: true,
      items: [
        {
          id: 'wrong',
          one: "This isn't the pricing file. I can't find customer_id or monthly_price in it.",
          what: 'Send me the cleaned pricing file as a .csv.',
          why: "I can only review what's in the file, and this one doesn't have the columns the revenue model needs.",
          how: "I'd download the file Claude gave you and drop that one in, not the prompt or a screenshot.",
        },
      ],
      total: 1,
    };
  const rC = at('region');
  const curC = at('currency');
  const cityC = at('billing_city');
  const nameC = at('customer_name');
  const planC = at('plan');
  const dateC = at('signup_date');
  const mailC = at('email');
  const items: ReviewItem[] = [];
  const R = p.rows;
  const rowNo = (i: number) => i + 2;
  const where = (t: (r: string[], i: number) => boolean) => R.map((r, i) => (t(r, i) ? rowNo(i) : 0)).filter(Boolean);
  const mkOf = (r: string[]) => (cityC >= 0 ? RAW.market[RAW.city[r[cityC]]] : undefined);
  const add = (id: string, one: string, what: string, why: string, how: string) => items.push({ id, one, what, why, how });

  if (rC < 0)
    add(
      'region',
      "Add a 'Region' column to your Spotify pricing dataset.",
      "Add a 'Region' column to your Spotify pricing dataset.",
      'Spotify pricing varies by location. We need to know which market each price belongs to so we can compare them accurately.',
      "I'd add a new column and populate it with the region for each billing_city."
    );
  else {
    const b = where((r) => !(r[rC] || '').trim());
    if (b.length) {
      const cities = [...new Set(R.filter((r) => !(r[rC] || '').trim()).map((r) => (cityC >= 0 ? r[cityC] : '')))].filter(Boolean);
      add(
        'region_blank',
        `Fill in the blank Region on ${rowsWord(b)}.`,
        `Fill in the blank Region on ${rowsWord(b)}. They're all ${list(cities) || 'the same city'}.`,
        'A blank region falls out of every market total, so those customers quietly disappear from the comparison.',
        `I'd tell Claude which region ${cities[0] || 'that city'} belongs to, then check that no region cell is empty.`
      );
    }
  }

  const dupSeen: Record<string, number> = {};
  const dups: number[] = [];
  R.forEach((r, i) => {
    const k = r[idC];
    if (dupSeen[k]) dups.push(rowNo(i));
    else dupSeen[k] = 1;
  });
  const missing = (() => {
    const have = new Set(R.map((r) => r[idC]));
    const ix = RAW.cols.indexOf('customer_id');
    const nm = RAW.cols.indexOf('customer_name');
    return [...new Set(RAW.rows.filter((r) => !/^SP-99/.test(r[ix]) && !have.has(r[ix])).map((r) => r[ix] + '|' + (r[nm] ? 'n' : 'b')))];
  })();

  if (curC >= 0) {
    const mm = where((r) => {
      const m = mkOf(r);
      return !!m && !!r[curC] && r[curC].trim().toUpperCase() !== m.cur;
    });
    if (mm.length) {
      const r0 = R[mm[0] - 2];
      add(
        'mismatch',
        `Fix the currency on ${rowsWord(mm)}. The price doesn't match the currency.`,
        `Fix the currency on ${rowsWord(mm)}. Row ${mm[0]} shows ${r0[priceC]} ${r0[curC]} for a customer in ${r0[cityC]}.`,
        `${num(r0[priceC])} is the local price in ${r0[cityC]}, not dollars. Left like this, that customer looks like they pay ten times what anyone else does, and the revenue model goes wrong.`,
        "I'd check every price against its market's normal range, then correct the currency on anything out of range."
      );
    }
    const bl = where((r) => !(r[curC] || '').trim());
    if (bl.length)
      add(
        'currency',
        `Fill in the blank currency on ${rowsWord(bl)}.`,
        `Fill in the blank currency on ${rowsWord(bl)}.`,
        "A price with no currency can't be compared to anything.",
        "I'd fill it from billing_city, since every city here has one currency."
      );
  }
  if (missing.length) {
    const blank = missing.filter((x) => x.endsWith('b')).length;
    const ids = missing.map((x) => x.split('|')[0]);
    add(
      'lost',
      blank === missing.length
        ? `Bring back the ${blank} customers you removed for having blank names.`
        : `Bring back the ${missing.length} real customers missing from this file.`,
      blank === missing.length
        ? `Bring back the ${blank} customers you removed for having blank names. ${list(ids.slice(0, 3))}${ids.length > 3 ? ' and more' : ''} are gone.`
        : `Bring back the ${missing.length} customers missing from this file, starting with ${list(ids.slice(0, 3))}.`,
      "A blank name doesn't make a bad record. They're paying customers, so dropping them understates revenue.",
      "I'd keep the rows, set the name to 'Unknown', and only remove duplicates and test accounts."
    );
  }
  if (dups.length)
    add(
      'dups',
      `Remove the duplicate customers on ${rowsWord(dups)}.`,
      `Remove the duplicate customers on ${rowsWord(dups)}.`,
      'A customer counted twice gets counted as twice the revenue.',
      "I'd keep the first row for each customer_id and drop the rest."
    );
  const tests = where((r) => /^SP-99/.test(r[idC]) || (mailC >= 0 && /internal/.test(r[mailC])));
  if (tests.length)
    add(
      'tests',
      `Remove the internal test accounts on ${rowsWord(tests)}.`,
      `Remove the internal test accounts on ${rowsWord(tests)}.`,
      "They aren't customers, and they'd pull the average price down.",
      "I'd filter out anything with a spotify-internal email or an SP-99 id."
    );
  const badPrice = where((r) => {
    const n = num(r[priceC]);
    return n === null || n <= 0;
  });
  if (badPrice.length)
    add(
      'bad_price',
      `Fix the zero or negative prices on ${rowsWord(badPrice)}.`,
      `Fix the zero or negative prices on ${rowsWord(badPrice)}.`,
      'Nobody pays minus twelve dollars. One of these can move a whole market average.',
      "I'd compare each one to the plan's normal price for that market and correct it."
    );
  const slip = where((r) => {
    const m = mkOf(r);
    const n = num(r[priceC]);
    return !!m && n !== null && n > Math.max(...m.p) * 3;
  });
  if (slip.length)
    add(
      'outlier',
      `Check the price on ${rowsWord(slip)}. It looks like a missing decimal.`,
      `Check the price on ${rowsWord(slip)}. It looks like a missing decimal.`,
      'One 1199 in a column of 11.99s makes that market look like a gold mine.',
      "I'd flag anything more than three times the top plan price for that market."
    );
  const textP = where((r) => /[^\d.\-]/.test(String(r[priceC]).trim()));
  if (textP.length)
    add(
      'price_text',
      `Make monthly_price a plain number on ${rowsWord(textP)}.`,
      `Make monthly_price a plain number on ${rowsWord(textP)}.`,
      "A cell like '$11.99' is text, so the revenue model skips it without telling you.",
      "I'd strip the symbols and keep the currency in its own column."
    );
  if (planC >= 0) {
    const pl = where((r) => !RAW.plans.includes(r[planC]));
    if (pl.length)
      add(
        'plan',
        `Use one label per plan on ${rowsWord(pl)}.`,
        `Use one label per plan on ${rowsWord(pl)}.`,
        'Three spellings of one plan means three lines in every pivot table.',
        `I'd map every variant to the four real names, like ${RAW.plans[0]}.`
      );
  }
  if (dateC >= 0) {
    const d = where((r) => !/^\d{4}-\d{2}-\d{2}$/.test(String(r[dateC]).trim()));
    if (d.length)
      add(
        'dates',
        `Put signup_date in one format on ${rowsWord(d)}.`,
        `Put signup_date in one format on ${rowsWord(d)}.`,
        '03/04/24 could be March or April. Mixed formats break anything that sorts or groups by date.',
        "I'd use YYYY-MM-DD everywhere."
      );
  }
  if (nameC >= 0) {
    const n = where((r) => !(r[nameC] || '').trim());
    if (n.length)
      add(
        'names',
        `Set the blank names to 'Unknown' on ${rowsWord(n)}.`,
        `Set the blank names to 'Unknown' on ${rowsWord(n)}.`,
        'A blank cell looks like a mistake. Unknown says you saw it and chose to keep the row.',
        "I'd fill it in so nobody downstream deletes those customers by accident."
      );
  }

  const stats = {
    rows: R.length,
    raw: RAW.rows.length,
    regions: rC >= 0 ? new Set(R.map((r) => r[rC]).filter(Boolean)).size : 0,
    currencies: curC >= 0 ? new Set(R.map((r) => r[curC]).filter(Boolean)).size : 0,
  };
  return { items: items.slice(0, 4), total: items.length, stats };
};
