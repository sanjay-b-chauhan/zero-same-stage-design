/* The kickoff deck as data. Every panel id and revealable id is exactly the one in tools/kickoff_script.mjs, and the words on screen
   are the words of those panels. *word* marks the emphasis of the source. Rows and prices are read from the real export in flow/data/raw.ts.
   A scene is one or more panels that share one object: the object stays and is patched, only the words swap. */
import { RAW } from '../../data/raw';
import type { ProjectId } from '../../types';

export interface Reveal {
  id: string;
  text: string;
}
export interface Stat {
  numId: string;
  num: string;
  lblId: string;
  lbl: string;
}
export interface Words {
  a?: string;
  b?: Reveal;
  stat?: Stat;
}
/* one line whose text follows her words: the last step that is on wins */
export interface SayStep {
  when: string;
  text: string;
}

/* the last step whose `when` is on (a panel id or a reveal id) sets the value */
export interface DialStep {
  when: string;
  value: number;
}
export interface MarketCell {
  code: string;
  price: string;
}
/* a crowd of four: `left` of them walk out once the card is on */
export interface CompareCard {
  id: string;
  title: string;
  left: number;
}
export interface RoadRow {
  id: string;
  title: string;
  desc: string;
}
export interface RawTable {
  name: string;
  meta: string;
  cols: string[];
  rows: { n: number; cells: { text: string; bad: boolean }[] }[];
}
export interface PriceTable {
  cols: string[];
  rows: { market: string; cells: string[] }[];
}
export interface PageRow {
  id: string;
  title: string;
  value: number;
  icon: 'where' | 'much';
}
export interface ClaimRow {
  id: string;
  label: string;
  name: string;
  tone: 'ok' | 'plain' | 'no';
}

export type Body =
  | { t: 'title'; line: string; lineOn?: string; sub: string; logo: string; face: string }
  | { t: 'volume'; steps: DialStep[]; prices: string[]; walkOn: string }
  | { t: 'markets'; turnOn: string; cells: MarketCell[] }
  | { t: 'compare'; cards: CompareCard[] }
  | { t: 'raw'; before: string; land: string; markOn: string; stat: Stat; table: RawTable }
  | { t: 'page'; title: string; tag: string; rows: PageRow[]; tableOn: string; table: PriceTable }
  | { t: 'roadmap'; rows: RoadRow[] }
  | { t: 'ask'; text: string; face: string }
  | { t: 'count'; land: string; n: number }
  | { t: 'proof'; markOn: string; checkOn: string }
  | { t: 'claims'; rows: ClaimRow[] };

export interface Scene {
  panels: string[];
  words?: Record<string, Words>;
  say?: SayStep[];
  sayBig?: boolean; /* the one 28 line, otherwise the 16 label under an object */
  body?: Body;
  above?: boolean; /* the object sits over the words */
  ids?: Record<string, string[]>; /* what each panel reveals, so a later panel of the scene implies it */
}

/* the real export: seven real rows with exactly ten bad cells, nothing bad left unmarked in these columns */
const RAW_COLS = ['customer_name', 'plan', 'monthly_price', 'currency', 'billing_city', 'signup_date'];
const RAW_MARKS: Record<number, string[]> = {
  2: ['monthly_price'],
  3: ['plan'],
  4: ['monthly_price', 'signup_date'],
  7: ['customer_name'],
  12: ['currency', 'signup_date'],
  17: ['monthly_price'],
  19: ['customer_name', 'monthly_price'],
};
const rawTable: RawTable = {
  name: RAW.name,
  meta: `${RAW.rows.length} rows, ${RAW.cols.length} columns`,
  cols: RAW_COLS,
  rows: Object.keys(RAW_MARKS).map((k) => {
    const n = Number(k);
    return {
      n,
      cells: RAW_COLS.map((c) => ({ text: RAW.rows[n - 2][RAW.cols.indexOf(c)], bad: RAW_MARKS[n].includes(c) })),
    };
  }),
};

const money = (sym: string, v: number) => `${sym}${Number.isInteger(v) ? v : v.toFixed(2)}`;
const priceTable: PriceTable = {
  cols: RAW.plans.map((p) => p.replace('Premium ', '')),
  rows: Object.entries(RAW.market).map(([code, m]) => ({ market: code, cells: m.p.map((v) => money(m.sym, v)) })),
};

/* the six markets at their real Premium Individual price */
const sixCells: MarketCell[] = Object.entries(RAW.market).map(([code, m]) => ({ code, price: money(m.sym, m.p[0]) }));
const US = RAW.market.US;

/* Her voice carries the words and the caption prints them. A slide holds one object, or one line, and nothing she has just said twice over.
   Every reveal id still fires: where a line went, the id now moves the object. */
const SPOTIFY: Scene[] = [
  {
    panels: ['p-b1-1'],
    body: {
      t: 'title',
      line: 'Where do we raise *next*?',
      lineOn: 'pill-cover',
      sub: 'Eryn Mitchell, Spotify',
      logo: 'static/logos/logo-spotify.svg',
      face: 'static/faces/eryn.webp',
    },
  },
  {
    panels: ['p-b2-1', 'p-b2-2'],
    above: true,
    say: [
      { when: 'p-b2-1', text: 'Price' },
      { when: 'p-b2-2', text: 'Nobody notices' },
      { when: 'st-far', text: 'People walk out' },
    ],
    ids: { 'p-b2-1': ['st-knob'], 'p-b2-2': ['st-far'] },
    /* the price is the volume: a little up and the room stays, too far and people walk out */
    body: {
      t: 'volume',
      walkOn: 'st-far',
      prices: [money(US.sym, US.p[0]), money(US.sym, US.p[0]), money(US.sym, US.p[0] + 1), money(US.sym, US.p[0] + 4)],
      steps: [
        { when: 'p-b2-1', value: 0 },
        { when: 'st-knob', value: 1 },
        { when: 'p-b2-2', value: 2 },
        { when: 'st-far', value: 3 },
      ],
    },
  },
  {
    panels: ['p-b2-3'],
    words: { 'p-b2-3': { stat: { numId: 'num-six', num: '6', lblId: 'lbl-six', lbl: 'markets' } } },
    body: { t: 'markets', turnOn: 'num-six', cells: sixCells },
  },
  {
    panels: ['p-b2-4'],
    body: {
      t: 'compare',
      cards: [
        { id: 'cc-held', title: "Didn't care", left: 0 },
        { id: 'cc-lost', title: 'Lost a lot of people', left: 3 },
      ],
    },
  },
  {
    panels: ['p-b2-5'],
    words: { 'p-b2-5': { a: 'Where do we raise *next*?', b: { id: 'st-much', text: 'And *by how much*?' } } },
  },
  {
    panels: ['p-b2-6', 'p-b2-7'],
    ids: { 'p-b2-6': ['st-mess'], 'p-b2-7': ['num-ten', 'lbl-ten'] },
    body: {
      t: 'raw',
      before: 'Nobody can answer that.',
      land: 'st-mess',
      markOn: 'num-ten',
      stat: { numId: 'num-ten', num: '10', lblId: 'lbl-ten', lbl: 'things wrong with it' },
      table: rawTable,
    },
  },
  { panels: ['p-b3-1'], words: { 'p-b3-1': { a: 'What does *good* look like?' } } },
  {
    panels: ['p-b3-2', 'p-b3-3', 'p-b3-4'],
    ids: { 'p-b3-3': ['cc-where', 'cc-much'], 'p-b3-4': ['st-numbers'] },
    body: {
      t: 'page',
      title: 'One clear recommendation',
      tag: '.pdf',
      rows: [
        { id: 'cc-where', title: 'Where we raise next', value: 0.5, icon: 'where' },
        { id: 'cc-much', title: 'By how much', value: 0.62, icon: 'much' },
      ],
      tableOn: 'st-numbers',
      table: priceTable,
    },
  },
  {
    panels: ['p-b4-1'],
    words: { 'p-b4-1': { a: "Here's the *roadmap*." } },
    body: { t: 'count', land: 'st-five', n: 5 },
  },
  {
    panels: ['p-b4-2'],
    body: {
      t: 'roadmap',
      rows: [
        { id: 'tl-1', title: 'Clean the dataset', desc: '15 min, a clean .csv' },
        { id: 'tl-2', title: 'Build the revenue model', desc: '25 min, an .xlsx, market by market' },
        { id: 'tl-3', title: 'Make the recommendation', desc: '15 min, a .pdf' },
        { id: 'tl-4', title: 'Write the pricing memo', desc: '15 min, a .pdf' },
        { id: 'tl-5', title: 'Present it', desc: '12 min, a slide deck' },
      ],
    },
  },
  { panels: ['p-b4-3'], body: { t: 'ask', text: 'Stuck? *Just ask me*.', face: 'static/faces/eryn.webp' } },
  { panels: ['p-b5-1'], words: { 'p-b5-1': { a: 'Which knob. *How far*.' } } },
  { panels: ['p-b5-2'], words: { 'p-b5-2': { a: 'A few *quick questions*.' } } },
];

const AMAZON: Scene[] = [
  {
    panels: ['p-b1-1'],
    body: {
      t: 'title',
      line: 'Every claim gets *checked*.',
      sub: 'Aaron Lee, Amazon',
      logo: 'static/logos/logo-amazon.svg',
      face: 'static/faces/aaron.webp',
    },
  },
  {
    panels: ['p-b2-1', 'p-b2-2'],
    above: true,
    say: [
      { when: 'p-b2-1', text: 'Announcements all the time' },
      { when: 'st-hard', text: 'Hard to check' },
      { when: 'p-b2-2', text: 'The fact checker' },
      { when: 'st-runs', text: "Nothing runs until every claim's been checked" },
    ],
    ids: { 'p-b2-1': ['st-hard'], 'p-b2-2': ['st-runs'] },
    body: { t: 'proof', markOn: 'st-hard', checkOn: 'st-runs' },
  },
  {
    panels: ['p-b3-1', 'p-b3-2'],
    ids: { 'p-b3-2': ['cc-v', 'cc-u', 'cc-s'] },
    body: {
      t: 'claims',
      rows: [
        { id: 'cc-v', name: 'Claim 1', label: 'Verified', tone: 'ok' },
        { id: 'cc-u', name: 'Claim 2', label: 'Unverified', tone: 'plain' },
        { id: 'cc-s', name: 'Claim 3', label: 'Unsupported', tone: 'no' },
      ],
    },
  },
  {
    panels: ['p-b4-1'],
    say: [
      { when: 'p-b4-1', text: 'First things first.' },
      { when: 'st-setup', text: 'Something *real* to build on.' },
    ],
    sayBig: true,
  },
  {
    panels: ['p-b4-2'],
    body: {
      t: 'roadmap',
      rows: [
        { id: 'tl-1', title: 'Set up the environment', desc: '25 min, a GitHub repo' },
        { id: 'tl-2', title: 'Connect the model', desc: '25 min, a working fact check' },
        { id: 'tl-3', title: 'Trace and test it', desc: '20 min, a test report' },
        { id: 'tl-4', title: 'Ship it', desc: '15 min, a live URL' },
      ],
    },
  },
  { panels: ['p-b5-1'], words: { 'p-b5-1': { a: 'Are we on the *same page*?' } } },
];

export const DECKS: Record<ProjectId, Scene[]> = { spotify: SPOTIFY, amazon: AMAZON };

export const sceneOf = (project: ProjectId, panel: string): { scene: Scene; index: number } | null => {
  const scenes = DECKS[project];
  const index = scenes.findIndex((s) => s.panels.includes(panel));
  return index < 0 ? null : { scene: scenes[index], index };
};
