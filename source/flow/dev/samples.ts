/* Dev mode's learner. What someone doing the stage would really say at each turn, read off the same file they have open,
   so Next plays the whole conversation at speed: their message, then her answer. Never "just tell me". */
import type { FindStepDef, Issue, StageDef } from '../data/defs';
import { RAW } from '../data/raw';
import type { ProjectId } from '../types';

const M = RAW.map;
const D = M.dups;
/* the sheet counts the header as row 1, like her lines do */
const at = (row: number, col: string) => RAW.rows[row - 2]?.[RAW.cols.indexOf(col)] ?? '';
const cents = (v: string) => (Number(v) / 100).toFixed(2);

/* Spotify stage 1: one finding per turn, each naming the rows and values in the file */
const SPOTIFY_FIND: Record<string, () => string> = {
  region: () => "There's no region column. Only billing_city, so we can't compare markets yet.",
  currency: () => `Row ${M.currency[0]} has no currency. ${M.currency.length} rows are like that, so those prices could be anything.`,
  names: () => `Row ${M.names[0]} has no customer name. ${M.names.length} rows are missing one.`,
  dups: () => `${D[0].id} shows up twice, on rows ${D[0].rows[0]} and ${D[0].rows[1]}. Same customer counted two times.`,
  dates: () =>
    `The signup dates are in different formats. Row ${M.dates[0]} says ${at(M.dates[0], 'signup_date')} and row ${M.dates[3]} says ${at(M.dates[3], 'signup_date')}.`,
  price_text: () => `Some prices are text, not numbers. Row ${M.price_text[0]} says ${at(M.price_text[0], 'monthly_price')} with the symbol on it.`,
  plan: () =>
    `The plan names are written different ways. Row ${M.plan_names[0]} says ${at(M.plan_names[0], 'plan')}, row ${M.plan_names[1]} says ${at(M.plan_names[1], 'plan')}.`,
  bad_price: () =>
    `Row ${M.bad_price[0]} has a negative price, ${at(M.bad_price[0], 'monthly_price')}. And row ${M.bad_price[2]} is ${at(M.bad_price[2], 'monthly_price')}.`,
  outlier: () => {
    const [a, b] = M.outlier;
    return `Rows ${a} and ${b} charge ${at(a, 'monthly_price')} in ${at(a, 'billing_city')} and ${at(b, 'billing_city')}. That has to be ${cents(at(a, 'monthly_price'))} with the decimal slipped.`;
  },
  test: () => `Row ${M.test[0]} is ${at(M.test[0], 'email')}. Rows ${M.test.join(', ')} are our own QA test accounts, not customers.`,
};

const PROMPTS: Record<string, string> = {
  'spotify:prompt': [
    'Clean this Spotify customer export for a pricing analysis. The csv is attached.',
    '',
    '1. Add a region column from billing_city.',
    '2. Fill the blank currency from the city too.',
    '3. Keep rows with no name and set the name to Unknown.',
    '4. Drop duplicate customer_id rows and keep the first one.',
    '5. Write every signup date as YYYY-MM-DD.',
    '6. Take the symbols off monthly_price so it is a plain number.',
    '7. One label per plan: Premium Individual, Duo, Family, Student.',
    '8. Negative and zero prices become the normal price for that plan in that market.',
    '9. Fix the 1199s. The decimal slipped, they are 11.99.',
    '10. Remove the QA test accounts.',
    '',
    'Send back one clean .csv and a short list of what you changed.',
  ].join('\n'),
  'amazon:envp': [
    'Set up the keys for this project.',
    'Put OPENROUTER_API_KEY and LANGCHAIN_API_KEY in a .env file.',
    'Make a .env.example with the same names and placeholder values, so anyone who clones it knows what they need.',
    'Add .env to the .gitignore so the real keys never go up to GitHub.',
    "Don't print my keys anywhere.",
  ].join('\n'),
  'amazon:htmlp': [
    'Build index.html, a front-end for fact-checking Amazon announcements.',
    'A text area to paste the announcement.',
    'A Check button to start.',
    'A results list that marks each claim verified, unverified or unsupported, with its source link next to it.',
    'Keep it to one file, no model calls yet.',
  ].join('\n'),
};

const ASKS: Record<string, string> = {
  'amazon:or': "Done. I made the OpenRouter key and saved it on my machine, not in here.",
  'amazon:ls': "Done, I have the LangSmith key too. It's saved with the other one.",
};

/* the POU, said out loud by the learner: first person, a bit loose, the way you talk. Keyed by the line she checks off */
const VOICE: Record<string, string> = {
  'spotify:A clean customer file you can compare across markets':
    "So it's the raw customer file, cleaned. I fixed the bad rows so we can actually compare the markets.",
  'spotify:Bad rows would have made the revenue model wrong':
    "Because everything after this runs on it. If the rows are wrong, the revenue model's wrong, and then the pricing call is wrong too.",
  'spotify:Found the issues, briefed Claude, then checked what came back':
    'I went through the file and found the ten issues first. Then I wrote Claude one prompt with every fix, and I checked what it gave back before I sent it.',
  'spotify:Local prices only compare once the currency is right':
    "Yeah, those Mumbai rows say 119 but the currency says USD. 119 is rupees, so with a dollar label they look like they pay ten times more.",
  'spotify:Blank names are still paying customers':
    "They're still real customers paying every month. If I delete them, revenue comes out lower than it really is.",
  'amazon:A public repo with the env setup and a front-end you can use':
    'I set up a public GitHub repo with an env file for the keys and a simple front-end page to check announcements.',
  'amazon:Keys stay out of the code, so they never end up on GitHub':
    'Because if the keys sit in the code, they go wherever the code goes. Push it to a public repo and anyone can read them.',
  'amazon:Made the repo, ran two prompts in Claude Code, pushed':
    'I made the repo on GitHub first, then ran two prompts in Claude Code, one for the env setup and one for the page, and pushed it.',
  'amazon:Anyone can use your key, and you pay for it':
    "Anyone who finds it can use my key and I pay for it. I'd revoke it right away and make a new one.",
};

/* her own summary is written to you ("You found..."), so a line with no sample of its own is turned around to "I" */
export const voiceTurn = (pid: ProjectId, text: string, say: string) =>
  VOICE[`${pid}:${text}`] ?? say.replace(/\bYou'd\b/g, "I'd").replace(/\bYou\b/g, 'I').replace(/\byou\b/g, 'I').replace(/\byour\b/gi, 'my');

/* the line has to land this finding and only this one, or the walk skips a turn */
const lands = (it: Issue, open: Issue[], t: string) => it.find(t) && open.every((o) => o === it || !o.find(t));

/* the next finding in her order, said the way a learner would */
export function findTurn(pid: ProjectId, s: FindStepDef, found: (id: string) => boolean): { id: string; text: string } | null {
  const open = s.order.map((id) => s.items.find((i) => i.id === id)).filter((i): i is Issue => !!i && !found(i.id));
  const it = open[0];
  if (!it) return null;
  const own = pid === 'spotify' ? SPOTIFY_FIND[it.id]?.() : undefined;
  const text = [own, it.label, it.ask[2]].find((t): t is string => !!t && lands(it, open, t)) ?? own ?? it.ask[2];
  return { id: it.id, text };
}

export const promptTurn = (pid: ProjectId, stepId: string, draft: string) => PROMPTS[`${pid}:${stepId}`] ?? draft;

export function askTurn(pid: ProjectId, stepId: string, def: StageDef, link: boolean): string {
  if (link) {
    const sub = def.demo.first();
    const url = sub.url ?? (sub.name ? `https://${sub.name.replace(/^https?:\/\//, '')}` : '');
    return url ? `Here's my repo: ${url}` : "Here's my repo.";
  }
  return ASKS[`${pid}:${stepId}`] ?? 'Done, I have it.';
}

/* the first sentence, for the button */
export const gist = (t: string) => {
  const one = t.split(/(?<=[.!?:])\s|\n/)[0] ?? t;
  return one.length > 48 ? `${one.slice(0, 47).trimEnd()}…` : one;
};
