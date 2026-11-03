/* Stage 1, Spotify: one played moment for each of the ten issues, GAMES.spotify[issueId].
   Every row is the real row from RAW at its sheet row number. Every number is worked out here from those rows,
   so a total on the card is the total of what you see. Her hints are her own first asks from spotify.ts. */
import type { ProjectId } from '../types';
import { RAW } from '../data/raw';
import { list, num } from '../data/csv';
import { SPOTIFY } from '../data/spotify';
import type { FindStepDef } from '../data/defs';
import { RATES } from './rates';
import { avg, her, money, plainNum, said, slice, sum, team, usd } from './sheet';
import type { GameDef } from './types';

const ISSUES = (SPOTIFY.stages.clean?.flow.find((f) => f.kind === 'find') as FindStepDef | undefined)?.items ?? [];
const hint = (id: string) => ISSUES.find((i) => i.id === id)?.ask[0] ?? 'Look again, one column at a time.';
const labelOf = (id: string) => ISSUES.find((i) => i.id === id)?.label ?? id;
const HER = { name: SPOTIFY.meta.manager.name, face: SPOTIFY.meta.manager.face };
const ASK = `Ask ${HER.name}`;

const col = (k: string) => RAW.cols.indexOf(k);
const at = (n: number) => RAW.rows[n - 2] ?? [];
const cell = (n: number, k: string) => at(n)[col(k)] ?? '';
const nums = (pred: (r: string[]) => boolean) => RAW.rows.map((r, i) => (pred(r) ? i + 2 : 0)).filter(Boolean);
const mkt = (city: string) => RAW.market[RAW.city[city]];
const M = RAW.map;

/* month-first, like the file's own cleaner: 06/19/23 is 2023-06-19, 15 Dec 2023 is 2023-12-15 */
const MON: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
const iso = (v: string) => {
  let m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  m = v.match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/);
  if (m) return `${m[3]}-${MON[m[2].toLowerCase()] ?? '01'}-${m[1].padStart(2, '0')}`;
  return v;
};

const base = (id: string) => ({ id: `spotify:${id}`, label: labelOf(id), her: HER });
const askHer = (id: string) => ({ id: 'ask', label: ASK, right: false, neutral: true, then: '', beats: [her(hint(id))] });

/* 1. No region column. You try to group by place and find there is no place to group by. */
const region = (): GameDef => {
  const rows = [10, 21, 33, 62];
  const cols = ['customer_id', 'monthly_price', 'currency', 'billing_city'];
  const usdRows = nums((r) => r[col('currency')] === 'USD');
  const usdCities = [...new Set(usdRows.map((n) => cell(n, 'billing_city')))];
  const cities = Object.keys(RAW.city).length;
  const regions = new Set(Object.values(RAW.market).map((m) => m.region)).size;
  const withRegion = slice(RAW, rows, cols);
  const view = {
    cols: [...cols, 'region'],
    rows: withRegion.rows.map((r) => [...r, mkt(r[3])?.region ?? '']),
    rowNums: rows,
    file: withRegion.file,
    /* the new column goes in right after billing_city */
    letters: [...(withRegion.letters ?? []), 'H'],
    mark: rows.map((_, i) => [i, 4] as [number, number]),
    total: { label: 'Regions', value: String(regions) },
  };
  return {
    ...base('region'),
    scene: ['Monday, 9:10 am. The pricing review is at 11.', 'Your VP wants the average price by region, one line each.'],
    show: {
      ...withRegion,
      tap: rows.map((_, i) => ({
        row: i,
        col: 3,
        right: false,
        neutral: true,
        then: '',
        beats: [her("That's the only place we've got. A city, though, not a region.")],
      })),
      miss: { then: '', beats: [her("That cell's fine. What would you group by?")] },
    },
    ask: 'Get it into regions.',
    choices: [
      {
        id: 'currency',
        label: 'Group by currency',
        right: false,
        then: `USD comes back as one group: ${usdRows.length} rows from ${usdCities.length} cities.`,
        beats: [team('pricing-review', `Why are Mumbai and London in the USD line? And ${M.currency.length} rows have no currency at all.`)],
      },
      {
        id: 'region',
        label: 'Add a region column',
        right: true,
        then: `${cities} cities fold into ${regions} regions.`,
        view,
        beats: [team('pricing-review', `${regions} lines. That I can read.`)],
      },
      askHer('region'),
    ],
    help: {
      then: '',
      beats: [her(`Every city sits in one market. Let's build the region from billing_city.`)],
      focus: { choice: 'region' },
    },
    solve: 'c:region',
    answer: `No region column. We build it from billing_city, ${cities} cities into ${regions} regions.`,
  };
};

/* 2. Currency blank on some rows. Finance's conversion stops on a price with nothing next to it. */
const currency = (): GameDef => {
  const rows = [11, 12, 20, 21];
  const cols = ['customer_id', 'monthly_price', 'currency', 'billing_city'];
  const s = slice(RAW, rows, cols);
  const fill = rows
    .map((n, i) => [i, n] as const)
    .filter(([, n]) => !cell(n, 'currency'))
    .map(([i, n]) => [i, 2, mkt(cell(n, 'billing_city'))?.cur ?? ''] as [number, number, string]);
  const p12 = num(cell(12, 'monthly_price')) ?? 0;
  const found = (i: number) => {
    const n = rows[i];
    const city = cell(n, 'billing_city');
    return {
      row: i,
      col: 2,
      right: true,
      then: `Row ${n} has no currency. ${city} bills in ${mkt(city)?.cur}, so billing_city fills it.`,
      set: fill,
      beats: [team('finance', `Script runs. ${M.currency.length} rows like that, all filled.`)],
    };
  };
  return {
    ...base('currency'),
    scene: ['Tuesday, 2:30 pm. Finance is converting every price to USD for the board pack.', 'Their script stopped on row 12.'],
    show: {
      ...s,
      tap: [
        ...fill.map(([i]) => found(i)),
        { row: 1, col: 1, right: false, then: '', beats: [her(`${said(p12)} is a normal Family price. In what, though?`)] },
      ],
      miss: { then: '', beats: [her("That one's fine. Read row 12 across.")] },
    },
    ask: 'Tap what stopped it.',
    choices: [
      {
        id: 'usd',
        label: "Tell Finance it's USD",
        right: false,
        then: `Row 12 goes in as ${usd(p12)}.`,
        beats: [team('finance', `Munich bills in euros. That's ${usd(p12 * RATES.EUR)} at our rate, and row 20 is pesos.`)],
      },
      { id: 'sort', label: 'Sort by currency', right: false, neutral: true, then: 'Sorted by currency, blanks first.', sort: [1, 2, 0, 3] },
      askHer('currency'),
    ],
    help: { then: '', beats: [her("Let's read row 12 left to right together. Price first, then what it's in.")], focus: { row: 1, col: 2 } },
    solve: 't:1:2',
    answer: `Currency blank on ${M.currency.length} rows. Every city has one currency, so billing_city fills it.`,
  };
};

/* 3. Customer names missing. Ops is about to delete rows that look broken, and they are paying customers. */
const names = (): GameDef => {
  const rows = [7, 10, 16, 26];
  const cols = ['customer_id', 'customer_name', 'monthly_price', 'billing_city'];
  const s = slice(RAW, rows, cols, { total: { label: 'Rows in the file', value: String(RAW.rows.length) } });
  const blank = rows.map((n, i) => (cell(n, 'customer_name') ? -1 : i)).filter((i) => i >= 0);
  const left = RAW.rows.length - M.names.length;
  const keep = (i: number) => ({
    row: i,
    col: 1,
    right: true,
    then: `No name on row ${rows[i]}, but ${said(num(cell(rows[i], 'monthly_price')) ?? 0)} ${cell(rows[i], 'currency')} a month. Keep it, call it Unknown.`,
    set: blank.map((b) => [b, 1, 'Unknown'] as [number, number, string]),
    dim: [],
    total: String(RAW.rows.length),
    beats: [team('ops', `Got it. All ${M.names.length} stay in as Unknown.`)],
  });
  return {
    ...base('names'),
    scene: ['Wednesday, 10:00 am. Ops is tidying the file before the model runs.', 'Their script deletes every row that looks broken.'],
    show: {
      ...s,
      tap: [
        ...blank.map(keep),
        ...blank.map((i) => ({ row: i, col: 2, right: false, then: '', beats: [her('They pay. So what looks broken?')] })),
      ],
      miss: { then: '', beats: [her("That one's fine.")] },
    },
    ask: 'Tap what the script would delete.',
    choices: [
      {
        id: 'run',
        label: 'Let Ops run it',
        right: false,
        then: `Rows ${list(M.names)} are gone. ${RAW.rows.length} rows down to ${left}.`,
        dim: blank,
        total: String(left),
        beats: [team('finance', `Revenue just dropped. Those ${M.names.length} still pay us every month.`)],
      },
      askHer('names'),
    ],
    help: { then: '', beats: [her(`Let's read the names column together, top to bottom.`)], dim: [], total: String(RAW.rows.length), focus: { row: blank[0], col: 1 } },
    solve: `t:${blank[0]}:1`,
    answer: `Customer names missing on ${M.names.length} rows. They still pay, so they stay in as Unknown.`,
  };
};

/* 4. Same customer twice. Rio counts one more customer than the Rio team has. */
const dups = (): GameDef => {
  const rows = nums((r) => r[col('billing_city')] === 'Rio de Janeiro');
  const cols = ['customer_id', 'customer_name', 'plan', 'monthly_price'];
  const s = slice(RAW, rows, cols, { total: { label: 'Rio customers', value: String(rows.length) } });
  const ids = rows.map((n) => cell(n, 'customer_id'));
  const unique = new Set(ids).size;
  const twice = ids.filter((id, i) => ids.indexOf(id) !== i);
  const pair = ids.map((id, i) => (twice.includes(id) ? i : -1)).filter((i) => i >= 0);
  const byId = ids.map((_, i) => i).sort((a, b) => ids[a].localeCompare(ids[b]) || a - b);
  const dupId = twice[0] ?? '';
  const zero = rows.findIndex((n) => (num(cell(n, 'monthly_price')) ?? 1) === 0);
  const found = (i: number) => ({
    row: i,
    right: true,
    then: `${dupId} is on rows ${list(pair.map((p) => rows[p]))}. Same person, same plan, same day.`,
    dim: pair.slice(1),
    mark: pair.map((p) => [p, 0] as [number, number]),
    total: String(unique),
    beats: [team('rio-team', `${unique}. That's us.`)],
  });
  return {
    ...base('dups'),
    scene: [`Thursday, 4:15 pm. The Rio team says they have ${unique} customers.`, `Your file shows ${rows.length}.`],
    show: {
      ...s,
      tap: [
        ...(zero >= 0 ? [{ row: zero, col: 3, right: false, neutral: true, then: '', beats: [her("Good eye, a 0.00 price is on our list too. The count's still off.")] }] : []),
        ...pair.map(found),
      ],
      miss: { then: '', beats: [her("That one's only in once.")] },
    },
    ask: 'Tap the extra one.',
    choices: [
      { id: 'send', label: `Tell them it's ${rows.length}`, right: false, then: '', beats: [team('rio-team', `We have ${unique}. Who's the ${rows.length === 5 ? 'fifth' : 'extra one'}?`)] },
      { id: 'sort', label: 'Sort by customer_id', right: false, neutral: true, then: 'Sorted by customer_id.', sort: byId },
      askHer('dups'),
    ],
    help: { then: '', beats: [her("Let's sort by customer_id together and read down the ids.")], sort: byId, focus: { row: pair[1], col: 0 } },
    solve: `t:${pair[1]}`,
    answer: `Same customer twice. ${list(RAW.dupIds)} each show up two times.`,
  };
};

/* 5. Dates in three formats. Marketing's sort puts a 2023 signup above a 2022 one. */
const dates = (): GameDef => {
  const rows = [2, 4, 5, 9];
  const cols = ['customer_id', 'billing_city', 'signup_date'];
  const s = slice(RAW, rows, cols);
  const raw = rows.map((n) => cell(n, 'signup_date'));
  const asText = raw.map((_, i) => i).sort((a, b) => raw[a].localeCompare(raw[b]));
  const fixed = raw.map(iso);
  const asDate = fixed.map((_, i) => i).sort((a, b) => fixed[a].localeCompare(fixed[b]));
  const odd = raw.map((v, i) => (v === fixed[i] ? -1 : i)).filter((i) => i >= 0);
  const found = (i: number) => ({
    row: i,
    col: 2,
    right: true,
    then: `Three formats in one column. As YYYY-MM-DD it sorts: ${asDate.map((j) => fixed[j].slice(0, 4)).join(', ')}.`,
    set: odd.map((j) => [j, 2, fixed[j]] as [number, number, string]),
    sort: asDate,
    beats: [team('marketing', 'Oldest first. Perfect.')],
  });
  return {
    ...base('dates'),
    scene: ["Friday, 9:30 am. Marketing wants signups by month for last year's campaign.", 'They need it sorted, oldest first.'],
    show: {
      ...s,
      tap: [
        ...odd.map(found),
        { row: 0, col: 2, right: false, then: '', beats: [her("That one's YYYY-MM-DD. Compare the others with it.")] },
      ],
      miss: { then: '', beats: [her("That one's fine.")] },
    },
    ask: 'Tap what breaks the order.',
    choices: [
      {
        id: 'sort',
        label: 'Sort by signup_date',
        right: false,
        then: `Sorted: ${asText.map((j) => raw[j]).join(', ')}.`,
        sort: asText,
        beats: [team('marketing', `${raw[asText[0]]} comes before ${raw[asText[1]]}? That's 2023 above 2022.`)],
      },
      askHer('dates'),
    ],
    help: { then: '', beats: [her(`Let's put rows ${rows[0]} and ${rows[1]} side by side. Same column, same kind of date?`)], focus: { row: 1, col: 2 } },
    solve: 't:1:2',
    answer: `Dates in three formats: ${raw[0]}, ${raw[1]} and ${raw[2]}. One format, YYYY-MM-DD.`,
  };
};

/* 6. Prices stored as text. SUM gives half of what four customers pay. */
const priceText = (): GameDef => {
  const rows = [9, 10, 24, 25];
  const cols = ['customer_id', 'plan', 'monthly_price', 'billing_city'];
  const vals = rows.map((n) => cell(n, 'monthly_price'));
  const sumSays = sum(vals.map((v) => plainNum(v) ?? 0));
  const real = sum(vals.map((v) => num(v) ?? 0));
  const text = vals.map((v, i) => (plainNum(v) === null ? i : -1)).filter((i) => i >= 0);
  const plain = vals.map((v, i) => (plainNum(v) === null ? -1 : i)).filter((i) => i >= 0);
  const s = slice(RAW, rows, cols, { total: { label: 'SUM', value: money(sumSays) } });
  const found = (i: number) => ({
    row: i,
    col: 2,
    right: true,
    then: `${vals[i]} is text, so SUM skipped it. Strip the symbol and it counts: ${money(real)}.`,
    set: text.map((j) => [j, 2, String(num(vals[j]) ?? vals[j])] as [number, number, string]),
    total: money(real),
    beats: [team('finance', `${money(real)}. That's the number.`)],
  });
  return {
    ...base('price_text'),
    scene: [`Monday, 3:00 pm. Four UK customers, all on Premium Individual at £${said(real / rows.length)}.`, `SUM says ${money(sumSays)}. It should be ${money(real)}.`],
    show: {
      ...s,
      tap: [
        ...text.map(found),
        ...plain.map((i) => ({ row: i, col: 2, right: false, then: '', beats: [her('SUM reads that one fine.')] })),
        { row: 2, col: 1, right: false, then: '', beats: [her("That spelling's a problem too, and it's on the list. SUM doesn't care about it.")] },
      ],
      miss: { then: '', beats: [her("That's not what SUM adds up.")] },
    },
    ask: 'Tap what SUM skips.',
    choices: [
      {
        id: 'send',
        label: `Send ${money(sumSays)} to Finance`,
        right: false,
        then: '',
        beats: [team('finance', `${rows.length} people at ${said(real / rows.length)} is ${money(real)}. Where did half of it go?`)],
      },
      { id: 'count', label: 'Count the numbers', right: false, neutral: true, then: `COUNT finds ${plain.length} numbers in ${rows.length} cells.` },
      askHer('price_text'),
    ],
    help: { then: '', beats: [her("Let's read the four prices the way SUM does. Which ones are plain numbers?")], focus: { row: text[0], col: 2 } },
    solve: `t:${text[0]}:2`,
    answer: 'Prices stored as text. $19.99, £11.99 and ₹59 are words to a formula, so the symbols come off.',
  };
};

/* 7. One plan, many spellings. The pivot has ten lines for four plans. */
const plan = (): GameDef => {
  const rows = [3, 11, 33, 56];
  const cols = ['customer_id', 'plan', 'monthly_price', 'currency'];
  const labels = new Set(RAW.rows.map((r) => r[col('plan')])).size;
  const real = RAW.plans.length;
  const vals = rows.map((n) => cell(n, 'plan'));
  const odd = vals.map((v, i) => (RAW.plans.includes(v) ? -1 : i)).filter((i) => i >= 0);
  const good = vals.findIndex((v) => RAW.plans.includes(v));
  const byPlan = vals.map((_, i) => i).sort((a, b) => (vals[a] < vals[b] ? -1 : vals[a] > vals[b] ? 1 : 0));
  const s = slice(RAW, rows, cols, { total: { label: 'Lines in the pivot', value: String(labels) } });
  const found = (i: number) => ({
    row: i,
    col: 1,
    right: true,
    then: `${list(odd.map((j) => vals[j]))} are all ${RAW.plans[0]}. One name each and the pivot has ${real} lines.`,
    set: odd.map((j) => [j, 1, RAW.plans[0]] as [number, number, string]),
    total: String(real),
    beats: [team('pricing', `${real} plans. That matches what we sell.`)],
  });
  return {
    ...base('plan'),
    scene: ['Tuesday, 11:00 am. You pivot customers by plan for the pricing team.', `Spotify sells ${real} plans. Your pivot has ${labels} lines.`],
    show: {
      ...s,
      tap: [
        ...odd.map(found),
        ...(good >= 0 ? [{ row: good, col: 1, right: false, then: '', beats: [her("That's the real name. Now compare the others with it.")] }] : []),
        ...rows.map((n, i) => ({ row: i, col: 2, right: false, then: '', beats: [her(`${cell(n, 'monthly_price')} on all four. Same price, same plan?`)] })),
      ],
      miss: { then: '', beats: [her("That one's fine.")] },
    },
    ask: `Tap what turns ${real} plans into ${labels}.`,
    choices: [
      { id: 'send', label: 'Send the pivot as is', right: false, then: '', beats: [team('pricing', `${labels} plans? We sell ${real}. What are the other ${labels - real}?`)] },
      { id: 'sort', label: 'Sort by plan', right: false, neutral: true, then: 'Sorted by plan.', sort: byPlan },
      askHer('plan'),
    ],
    help: { then: '', beats: [her("Let's read the plan column out loud together, one row at a time.")], focus: { row: odd[0], col: 1 } },
    solve: `t:${odd[0]}:1`,
    answer: `One plan, many spellings. ${labels} labels for ${real} plans, so every variant gets its real name.`,
  };
};

/* 8. Negative and zero prices. Monterrey's average comes out below what anyone there pays. */
const badPrice = (): GameDef => {
  const rows = nums((r) => r[col('billing_city')] === 'Monterrey');
  const cols = ['customer_id', 'plan', 'monthly_price', 'currency'];
  const vals = rows.map((n) => plainNum(cell(n, 'monthly_price')) ?? 0);
  const neg = vals.findIndex((v) => v <= 0);
  const list0 = RAW.market.MX.p;
  const fixedVal = list0[0];
  const fixed = vals.map((v, i) => (i === neg ? fixedVal : v));
  const lowFirst = vals.map((_, i) => i).sort((a, b) => vals[a] - vals[b]);
  const s = slice(RAW, rows, cols, { total: { label: 'Average', value: money(avg(vals)) } });
  return {
    ...base('bad_price'),
    scene: [`Wednesday, 1:45 pm. Monterrey's average price comes out at ${said(avg(vals))} MXN.`, `Premium Individual in Mexico is ${fixedVal}.`],
    show: {
      ...s,
      tap: [
        {
          row: neg,
          col: 2,
          right: true,
          then: `${cell(rows[neg], 'monthly_price')} on a ${cell(rows[neg], 'plan')}. Nobody pays minus. At ${fixedVal} the average is ${money(avg(fixed))}.`,
          set: [[neg, 2, String(fixedVal)]],
          total: money(avg(fixed)),
          beats: [team('pricing', 'That looks like Monterrey.')],
        },
        ...vals.map((v, i) => ({
          row: i,
          col: 2,
          right: false,
          then: '',
          beats: [her(v === list0[2] ? `${v} is the Family price in Mexico. That one's real.` : `${v} is the normal Premium Individual price there.`)],
        })).filter((t) => t.row !== neg),
      ],
      miss: { then: '', beats: [her("That one's fine.")] },
    },
    ask: 'Tap what drags it down.',
    choices: [
      {
        id: 'send',
        label: `Report ${said(avg(vals))} MXN`,
        right: false,
        then: '',
        beats: [team('pricing', `${said(avg(vals))}? That's below every adult plan in Mexico. Is Monterrey on a promo?`)],
      },
      { id: 'sort', label: 'Sort by monthly_price', right: false, neutral: true, then: 'Sorted, lowest first.', sort: lowFirst },
      askHer('bad_price'),
    ],
    help: { then: '', beats: [her("Let's sort the prices low to high together and look at the top one.")], sort: lowFirst, focus: { row: neg, col: 2 } },
    solve: `t:${neg}:2`,
    answer: `Negative and zero prices on rows ${list(M.bad_price)}. Each one goes back to its plan's normal price.`,
  };
};

/* 9. A slipped decimal. Finance asks why four US customers average fifty times the list price. */
const outlier = (): GameDef => {
  const rows = [16, ...M.outlier, 33];
  const cols = ['customer_id', 'plan', 'monthly_price', 'billing_city'];
  const vals = rows.map((n) => plainNum(cell(n, 'monthly_price')) ?? 0);
  const listP = RAW.market.US.p[0];
  const big = vals.map((v, i) => (v > listP * 10 ? i : -1)).filter((i) => i >= 0);
  const fixed = vals.map((v, i) => (big.includes(i) ? v / 100 : v));
  const highFirst = vals.map((_, i) => i).sort((a, b) => vals[b] - vals[a] || a - b);
  const times = Math.floor(avg(vals) / listP);
  const s = slice(RAW, rows, cols, { total: { label: 'Average', value: money(avg(vals)) } });
  const found = (i: number) => ({
    row: i,
    col: 2,
    right: true,
    then: `${said(vals[i])} is ${money(vals[i] / 100)} with the decimal gone. Fix both and the average is ${usd(avg(fixed))}.`,
    set: big.map((j) => [j, 2, money(vals[j] / 100)] as [number, number, string]),
    total: money(avg(fixed)),
    beats: [team('finance', `${usd(avg(fixed))}. Makes sense now.`)],
  });
  return {
    ...base('outlier'),
    scene: [`Friday, 4:50 pm. Finance asks why four US customers average ${usd(avg(vals))} a month.`, `Premium Individual is ${usd(listP)}.`],
    show: {
      ...s,
      tap: [
        ...big.map(found),
        ...vals.map((_, i) => i).filter((i) => !big.includes(i)).map((i) => ({ row: i, col: 2, right: false, then: '', beats: [her("That's the list price. Compare the others with it.")] })),
      ],
      miss: { then: '', beats: [her("That one's fine.")] },
    },
    ask: 'Tap what pulls it up.',
    choices: [
      {
        id: 'send',
        label: 'Tell Finance they pay more',
        right: false,
        then: '',
        beats: [team('finance', `${times} times the list price? I'm not putting that in front of the CFO.`)],
      },
      { id: 'sort', label: 'Sort by monthly_price', right: false, neutral: true, then: 'Sorted, highest first.', sort: highFirst },
      askHer('outlier'),
    ],
    help: { then: '', beats: [her("Let's sort by price, highest first, and look at the top two.")], sort: highFirst, focus: { row: big[0], col: 2 } },
    solve: `t:${big[0]}:2`,
    answer: `A slipped decimal on rows ${list(M.outlier)}. ${said(vals[big[0]] ?? 1199)} is really ${money((vals[big[0]] ?? 1199) / 100)}.`,
  };
};

/* 10. Internal test accounts. London has one more customer than the UK team does. */
const test = (): GameDef => {
  const rows = nums((r) => r[col('billing_city')] === 'London');
  const cols = ['customer_id', 'customer_name', 'email'];
  const s = slice(RAW, rows, cols, { total: { label: 'London customers', value: String(rows.length) } });
  const qa = rows.map((n, i) => (/^SP-99/.test(cell(n, 'customer_id')) ? i : -1)).filter((i) => i >= 0);
  const real = rows.length - qa.length;
  const q = qa[0] ?? 0;
  const found = (i: number) => ({
    row: i,
    right: true,
    then: `${cell(rows[i], 'customer_id')}, a spotify-internal email, ${cell(rows[i], 'monthly_price')} a month. That's our QA, not a customer.`,
    dim: [i],
    mark: [[i, 2]] as Array<[number, number]>,
    total: String(real),
    beats: [team('uk-team', `${real}. Matches ours.`)],
  });
  return {
    ...base('test'),
    scene: ["Thursday, 9:00 am. London's customer count goes to the UK team at noon.", `They have ${real} subscribers there. Your file has ${rows.length}.`],
    show: { ...s, tap: qa.map(found), miss: { then: '', beats: [her("That's a real customer.")] } },
    ask: "Tap the one who isn't a customer.",
    choices: [
      { id: 'send', label: `Send them ${rows.length}`, right: false, then: '', beats: [team('uk-team', `We have ${real} in London. Who's the extra one?`)] },
      askHer('test'),
    ],
    help: { then: '', beats: [her("Let's read the emails together, one by one.")], focus: { row: q, col: 2 } },
    solve: `t:${q}`,
    answer: `Internal test accounts on rows ${list(M.test)}. That's our QA, not customers.`,
  };
};

const spotify: Record<string, GameDef> = {
  region: region(),
  currency: currency(),
  names: names(),
  dups: dups(),
  dates: dates(),
  price_text: priceText(),
  plan: plan(),
  bad_price: badPrice(),
  outlier: outlier(),
  test: test(),
};

/* Amazon's stage has no issue slots (repo, keys, two prompts, a link), so it has no stage 1 games yet. */
export const GAMES: Record<ProjectId, Record<string, GameDef>> = { spotify, amazon: {} };

export const gameFor = (projectId: ProjectId, slotId: string): GameDef | null => GAMES[projectId]?.[slotId] ?? null;
