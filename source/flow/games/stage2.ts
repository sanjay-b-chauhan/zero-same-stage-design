/* Stage 2, Revenue model, played as a demo in three hands-on rounds on the cleaned file:
   Revenue by market (who counts this month), One currency (convert it yourself), Revenue per user (divide and look).
   Every number comes from clean() with every fix on, so it is the same file stage 1 ends with. */
import type { ProjectId } from '../types';
import { RAW } from '../data/raw';
import { clean, parse, toCsv, type CleanFx } from '../data/csv';
import { SPOTIFY } from '../data/spotify';
import { RATES } from './rates';
import { cents, her, money, said, slice, team, usd } from './sheet';
import type { GameDef, GameExcerpt, GameTap } from './types';

export interface Stage2Slot {
  id: string;
  label: string;
  game: GameDef;
}

export interface Stage2Def {
  stageId: string;
  opener: string[];
  slots: Stage2Slot[];
  deliverable: () => { name: string; text: string; meta: string };
  close: string;
}

const EVERY_FIX: CleanFx = {
  region: true,
  regionAll: true,
  currency: true,
  mismatch: true,
  keepNames: true,
  dedupe: true,
  tests: true,
  price: true,
  plan: true,
  dates: true,
};

/* the country each market's cities sit in, for the names people say out loud */
const COUNTRY: Record<string, string> = { US: 'United States', MX: 'Mexico', BR: 'Brazil', UK: 'United Kingdom', DE: 'Germany', IN: 'India' };
const SHORT: Record<string, string> = { US: 'the US', MX: 'Mexico', BR: 'Brazil', UK: 'the UK', DE: 'Germany', IN: 'India' };

interface Market {
  key: string;
  name: string;
  region: string;
  cur: string;
  n: number; /* active customers */
  all: number; /* every row, churned included */
  local: number; /* monthly revenue from active customers, local currency */
  localAll: number;
  usd: number;
  perUser: number;
}

const HER = { name: SPOTIFY.meta.manager.name, face: SPOTIFY.meta.manager.face };
const ASK = `Ask ${HER.name}`;

const CLEAN = parse(clean(RAW, EVERY_FIX));
const cix = (k: string) => CLEAN.cols.indexOf(k);
const marketOf = (r: string[]) => RAW.city[r[cix('billing_city')]] ?? '';

const MARKETS: Market[] = Object.entries(RAW.market).map(([key, m]) => {
  const rows = CLEAN.rows.filter((r) => marketOf(r) === key);
  const active = rows.filter((r) => r[cix('status')] === 'active');
  const price = (r: string[]) => Number(r[cix('monthly_price')]) || 0;
  const local = cents(active.reduce((s, r) => s + price(r), 0));
  const localAll = cents(rows.reduce((s, r) => s + price(r), 0));
  const usdv = cents(local * (RATES[m.cur] ?? 0));
  return {
    key,
    name: COUNTRY[key] ?? key,
    region: m.region,
    cur: m.cur,
    n: active.length,
    all: rows.length,
    local,
    localAll,
    usd: usdv,
    perUser: active.length ? cents(usdv / active.length) : 0,
  };
});
const by = (k: string) => MARKETS.find((m) => m.key === k)!;
const US = by('US');
const MX = by('MX');
const IN = by('IN');
const ACTIVE = MARKETS.reduce((s, m) => s + m.n, 0);
const BY_USD = MARKETS.slice().sort((a, b) => b.usd - a.usd);
const BY_LOCAL = MARKETS.map((_, i) => i).sort((a, b) => MARKETS[b].local - MARKETS[a].local);
const LOWEST = MARKETS.slice().sort((a, b) => a.perUser - b.perUser)[0];
const HIGHEST = MARKETS.slice().sort((a, b) => b.perUser - a.perUser)[0];
const RATIO = Math.round(MX.local / US.local);

/* the model so far, a sheet of its own: header row 1, markets from row 2 */
const MODEL_FILE = 'revenue_model';
const NUMS = MARKETS.map((_, i) => i + 2);
const localView = (extra: Partial<GameExcerpt> = {}): GameExcerpt => ({
  cols: ['market', 'currency', 'customers', 'monthly_revenue_local'],
  rows: MARKETS.map((m) => [m.name, m.cur, String(m.n), money(m.local)]),
  rowNums: NUMS,
  file: MODEL_FILE,
  total: { label: 'Active customers', value: String(ACTIVE) },
  ...extra,
});
const usdView = (): GameExcerpt => ({
  cols: ['market', 'currency', 'monthly_revenue_local', 'monthly_revenue_usd'],
  rows: BY_USD.map((m) => [m.name, m.cur, money(m.local), money(m.usd)]),
  rowNums: NUMS,
  file: MODEL_FILE,
  mark: [[BY_USD.indexOf(MX), 3]],
});

/* 1. Revenue by market: churned customers are in the file, they are not in this month's revenue */
const round1 = (): GameDef => {
  const usRows = CLEAN.rows.map((r, i) => (marketOf(r) === 'US' ? i + 2 : 0)).filter(Boolean).slice(0, 5);
  const cols = ['customer_id', 'monthly_price', 'currency', 'status'];
  const s = slice(CLEAN, usRows, cols, { file: SPOTIFY.stages.clean?.deliverable?.name ?? 'spotify_pricing_clean.csv', total: { label: `US, all ${US.all} rows`, value: money(US.localAll) } });
  const status = s.rows.map((r) => r[3]);
  const churned = status.map((v, i) => (v === 'churned' ? i : -1)).filter((i) => i >= 0);
  const activeFirst = status.map((_, i) => i).sort((a, b) => Number(status[a] !== 'active') - Number(status[b] !== 'active') || a - b);
  const found = (i: number): GameTap => ({
    row: i,
    col: 3,
    right: true,
    then: `Churned means they stopped paying. Active only, the US is ${money(US.local)} USD a month, from ${US.n} of ${US.all}.`,
    view: localView({ mark: [[MARKETS.indexOf(US), 3]] }),
    beats: [team('pricing', 'That matches billing.')],
  });
  return {
    id: 'spotify:model:market',
    label: 'Revenue by market',
    her: HER,
    scene: ['Monday, 10:00 am. Pricing wants monthly revenue by market for the review.', `The clean file has ${CLEAN.rows.length} customers in ${MARKETS.length} markets.`],
    show: {
      ...s,
      tap: [
        ...churned.map(found),
        ...status.map((_, i) => i).filter((i) => !churned.includes(i)).map((i) => ({ row: i, col: 3, right: false, then: '', beats: [her('Active means paying. What about the rest?')] })),
        ...status.map((_, i) => ({ row: i, col: 1, right: false, then: '', beats: [her('The price is right. Is everyone still paying it?')] })),
      ],
      miss: { then: '', beats: [her("That one's fine.")] },
    },
    ask: "Tap who shouldn't count this month.",
    choices: [
      {
        id: 'sum',
        label: 'Sum every row by market',
        right: false,
        then: `US ${money(US.localAll)} USD, Mexico ${said(MX.localAll)} MXN, India ${said(IN.localAll)} INR.`,
        beats: [team('pricing', `The US makes ${money(US.localAll)} a month? Billing says ${money(US.local)}.`)],
      },
      { id: 'sort', label: 'Sort by status', right: false, neutral: true, then: 'Sorted by status.', sort: activeFirst },
      { id: 'ask', label: ASK, right: false, neutral: true, then: '', beats: [her("Who's actually paying us this month?")] },
    ],
    help: { then: '', beats: [her("Let's read status together. Who's still paying?")], sort: activeFirst, focus: { row: churned[0], col: 3 } },
    solve: `t:${churned[0]}:3`,
    answer: `Revenue by market, active customers only. The US is ${money(US.local)} USD a month, not ${money(US.localAll)}.`,
  };
};

/* 2. One currency: 1,222 pesos is not more than 94.92 dollars. You convert it yourself */
const round2 = (): GameDef => {
  const top = BY_USD[0];
  const convert = (i: number): GameTap => {
    const m = MARKETS[i];
    return {
      row: i,
      col: 1,
      right: true,
      then: `${said(m.local)} is ${m.cur}, not dollars. At the sample rate it's ${usd(m.usd)}.`,
      view: usdView(),
      beats: [team('pricing', `Now they line up. ${top.name} leads at ${usd(top.usd)}.`)],
    };
  };
  const nonUsd = MARKETS.map((m, i) => (m.cur === 'USD' ? -1 : i)).filter((i) => i >= 0);
  const usdRow = MARKETS.findIndex((m) => m.cur === 'USD');
  const first = MARKETS[BY_LOCAL[0]];
  const second = MARKETS[BY_LOCAL[1]];
  const usPlace = BY_LOCAL.indexOf(MARKETS.indexOf(US)) + 1;
  const place = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][usPlace - 1] ?? `number ${usPlace}`;
  return {
    id: 'spotify:model:usd',
    label: 'One currency',
    her: HER,
    scene: ['Monday, 10:20 am. Your table is up in the pricing review.', `Someone asks why Mexico makes ${RATIO} times what the US does.`],
    show: localView({
      tap: [
        ...nonUsd.map(convert),
        ...(usdRow >= 0 ? [{ row: usdRow, col: 1, right: false, then: '', beats: [her("That one's dollars already.")] }] : []),
        ...MARKETS.map((m, i) => ({ row: i, col: 3, right: false, then: '', beats: [her(`${said(m.local)} in what?`)] })),
      ],
      miss: { then: '', beats: [her('Look at what each number is in.')] },
    }),
    ask: 'Make the markets comparable.',
    choices: [
      {
        id: 'rank',
        label: 'Rank by revenue',
        right: false,
        then: `Ranked: ${first.name} first, ${second.name} second, the US ${place}.`,
        sort: BY_LOCAL,
        beats: [team('pricing', `${first.name}'s our biggest market? And ${SHORT.MX} makes ${RATIO} times ${SHORT.US}?`)],
      },
      {
        id: 'usd',
        label: 'Convert to USD',
        right: true,
        then: `At the sample rates ${top.name} leads with ${usd(top.usd)}. ${IN.name} is ${usd(IN.usd)}.`,
        view: usdView(),
        beats: [team('pricing', 'Now they line up.')],
      },
      { id: 'ask', label: ASK, right: false, neutral: true, then: '', beats: [her(`${said(MX.local)} what?`)] },
    ],
    help: { then: '', beats: [her("Let's put every row in dollars together.")], focus: { choice: 'usd' } },
    solve: 'c:usd',
    answer: `One currency, USD at sample rates. ${top.name} leads at ${usd(top.usd)} a month and ${BY_USD[BY_USD.length - 1].name} is last at ${usd(BY_USD[BY_USD.length - 1].usd)}.`,
  };
};

/* 3. Revenue per user: divide by customers and the market with the most people earns least per person */
const round3 = (): GameDef => {
  const low = BY_USD.indexOf(LOWEST);
  const totals: GameExcerpt = {
    cols: ['market', 'customers', 'monthly_revenue_usd'],
    rows: BY_USD.map((m) => [m.name, String(m.n), money(m.usd)]),
    rowNums: NUMS,
    file: MODEL_FILE,
  };
  const lowThen = `${usd(LOWEST.usd)} over ${LOWEST.n} customers is ${usd(LOWEST.perUser)} each, the least of the ${MARKETS.length}. ${HIGHEST.name} is ${usd(HIGHEST.perUser)}.`;
  const lowBeats = [team('pricing', `So one customer in ${SHORT[HIGHEST.key]} is worth about ${Math.round(HIGHEST.perUser / LOWEST.perUser)} in ${SHORT[LOWEST.key]}.`)];
  const divided = (mark = false): GameExcerpt => ({
    cols: ['market', 'customers', 'monthly_revenue_usd', 'revenue_per_user_usd'],
    rows: BY_USD.map((m) => [m.name, String(m.n), money(m.usd), money(m.perUser)]),
    rowNums: NUMS,
    file: MODEL_FILE,
    mark: mark ? [[low, 3]] : [],
    tap: [
      { row: low, right: true, then: lowThen, beats: lowBeats, mark: [[low, 3]] },
      ...BY_USD.map((m, i) => ({ row: i, right: false, then: `${m.name} is ${usd(m.perUser)} a customer.` })).filter((t) => t.row !== low),
    ],
  });
  const found = (): GameTap => ({ row: low, right: true, then: lowThen, beats: lowBeats, view: divided(true) });
  const most = MARKETS.slice().sort((a, b) => b.n - a.n)[0];
  const top = BY_USD[0];
  return {
    id: 'spotify:model:per_user',
    label: 'Revenue per user',
    her: HER,
    scene: ['Monday, 10:40 am. Pricing wants to know where a customer is worth least.', `${most.name} has the most customers, ${most.n}.`],
    show: {
      ...totals,
      tap: [
        found(),
        ...BY_USD.map((m, i) => ({ row: i, right: false, then: `${usd(m.usd)} over ${m.n} customers is ${usd(m.perUser)} each.` })).filter((t) => t.row !== low),
      ],
      miss: { then: '', beats: [her("What's one customer worth there?")] },
    },
    ask: 'Tap where a customer brings in least.',
    choices: [
      {
        id: 'send',
        label: 'Send the totals as is',
        right: false,
        then: '',
        beats: [team('pricing', `${top.name}'s ${usd(top.usd)} is ${top.n} people. ${LOWEST.name}'s ${usd(LOWEST.usd)} is ${LOWEST.n}. What's one person worth?`)],
      },
      { id: 'divide', label: 'Divide by customers', right: false, neutral: true, then: 'Revenue per user, dollars a month.', view: divided() },
      { id: 'ask', label: ASK, right: false, neutral: true, then: '', beats: [her("Total isn't the question. What's one customer worth?")] },
    ],
    help: { then: '', beats: [her("Let's divide each row by its customers together.")], view: divided(), focus: { row: low, col: 3 } },
    solve: `t:${low}`,
    answer: `Revenue per user. ${LOWEST.name} is lowest at ${usd(LOWEST.perUser)} a customer, ${SHORT[HIGHEST.key]} highest at ${usd(HIGHEST.perUser)}.`,
  };
};

/* revenue_model.csv, built here from the same numbers */
const COLS = ['market', 'region', 'customers', 'currency', 'monthly_revenue_local', 'monthly_revenue_usd', 'revenue_per_user_usd'];
const deliverable = () => ({
  name: 'revenue_model.csv',
  text: toCsv(
    COLS,
    BY_USD.map((m) => [m.name, m.region, String(m.n), m.cur, m.local.toFixed(2), m.usd.toFixed(2), m.perUser.toFixed(2)])
  ),
  meta: `${MARKETS.length} markets, ${ACTIVE} active customers, USD at sample rates`,
});

const spotify: Stage2Def = {
  stageId: 'model',
  opener: [
    SPOTIFY.stubLines.model ?? 'Okay, so now we have a clean file. Next we model what each market brings in.',
    'Three slots. Revenue by market, one currency, then revenue per user.',
  ],
  slots: [
    { id: 'market', label: 'Revenue by market', game: round1() },
    { id: 'usd', label: 'One currency', game: round2() },
    { id: 'per_user', label: 'Revenue per user', game: round3() },
  ],
  deliverable,
  close: "That's stage 2 done. Next up is stage 3 of 5, the recommendation.",
};

export const STAGE2: Partial<Record<ProjectId, Stage2Def>> = { spotify };

/* the numbers, for a check or a test */
export const MODEL = { markets: MARKETS, active: ACTIVE, rates: RATES };
