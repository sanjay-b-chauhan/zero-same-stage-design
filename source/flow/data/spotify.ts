/* Spotify Pricing. Every word she says in stage 1, from Navid's Spotify doc and the manager personality doc, as b1 had them. */
import type { Issue, RubricRow, Scenario, ScreenCtx, StageDef, Submission } from './defs';
import { RAW } from './raw';
import { check, clean as cleanCsv, type CleanFx, toCsv } from './csv';

const M = RAW.map;
const D = M.dups;
const NEG = /\b(missing|blank|empty|no|not|none|null|without|lack|lacks|lacking|absent|don'?t|doesn'?t|isn'?t|aren'?t|can'?t|cannot|never|some)\b/i;

/* the ten findings */
const issues: Issue[] = [
  {
    id: 'region',
    label: 'No region column',
    find: (t) =>
      (/\bregions?\b/i.test(t) && (NEG.test(t) || /need|add/i.test(t))) ||
      (/\b(market|country|countries|geograph\w*)\b/i.test(t) && NEG.test(t)) ||
      /where (each|the|a|they|customers?).*(located|live|are|from|based)/i.test(t) ||
      (/\blocation\b/i.test(t) && NEG.test(t)),
    part: (t) =>
      /\b(region|market|country|countries|location|billing_city|city|cities)\b/i.test(t)
        ? "Good, that's the only location info we've got. What would we need to compare markets?"
        : null,
    ask: [
      "What information would we need to compare Spotify's pricing across different markets?",
      'Take another look at the columns. Is there anything missing that tells us where each customer is located?',
      "We're missing a region column. Without it, we can't compare pricing between countries.",
    ],
    why: "Without it we can't compare markets.",
    said: 'the missing region column',
  },
  {
    id: 'currency',
    label: 'Currency blank on some rows',
    find: (t) => /currenc/i.test(t) && NEG.test(t),
    part: (t) => (/currenc/i.test(t) ? "You're on the right track. What's wrong with that column?" : null),
    ask: [
      'Look at how the prices are labeled. Can you always tell what a price is in?',
      `Scroll down the currency column. Look at row ${M.currency[0]}.`,
      `${M.currency.length} rows have no currency. A price with no currency can't be compared to anything.`,
    ],
    why: 'A price with no currency means nothing.',
    said: 'the blank currencies',
  },
  {
    id: 'names',
    label: 'Customer names missing',
    find: (t) => /\bnames?\b/i.test(t) && NEG.test(t),
    part: (t) => (/\bnames?\b/i.test(t) ? 'What about the names?' : null),
    ask: [
      'Look at who these customers are. Is everyone identified?',
      `Check the customer_name column around row ${M.names[0]}.`,
      `${M.names.length} rows have no customer name. They're still real customers, so we can't just lose them.`,
    ],
    why: "Hold on to that one. They're still paying customers.",
    said: 'the missing names',
  },
  {
    id: 'dups',
    label: 'Same customer twice',
    find: (t) => /duplic|\bdupes?\b|repeat|twice|same (id|customer|row|person)|more than once|appears? again/i.test(t),
    ask: [
      'Is every customer in here only once?',
      `Sort by customer_id in your head. Look for the same id showing up again, like around row ${D[0].rows[0]}.`,
      `${D[0].id} is on rows ${D[0].rows[0]} and ${D[0].rows[1]}. Same customer, counted twice.`,
    ],
    why: 'Counted twice is revenue counted twice.',
    said: 'the duplicate customers',
  },
  {
    id: 'dates',
    label: 'Dates in three formats',
    find: (t) =>
      (/\bdates?\b/i.test(t) && /format|mixed|inconsisten|differ|mess|same|vary|varies|multiple|all over|wrong|weird|standard/i.test(t)) ||
      /date format/i.test(t),
    part: (t) => (/\bdates?\b/i.test(t) ? "Yes, something's off in there. What exactly?" : null),
    ask: [
      'When did these people sign up? Could you sort by that?',
      `Compare signup_date on row ${M.dates[0]} and row ${M.dates[3]}.`,
      'signup_date is written three different ways. 03/04/24 could be March or April.',
    ],
    why: "You can't sort or group on that.",
    said: 'the messy dates',
  },
  {
    id: 'price_text',
    label: 'Prices stored as text',
    find: (t) =>
      (/(price|monthly_price|amount|cost)/i.test(t) && /symbol|text|string|\$|₹|£|€|sign\b|comma|not (a )?number|non.?numeric|format|mixed/i.test(t)) ||
      /currency symbols?/i.test(t),
    part: (t) => (/\b(price|pricing|monthly_price)\b/i.test(t) ? "There's more than one thing wrong in that column. What are you seeing?" : null),
    ask: [
      'Could you add up the monthly_price column right now?',
      `Look at row ${M.price_text[0]} in monthly_price. Would a formula read that?`,
      "Some prices have a symbol stuck on them, like $19.99. That's text, so a formula skips it.",
    ],
    why: 'A formula would skip those without telling you.',
    said: 'the prices stored as text',
  },
  {
    id: 'plan',
    label: 'One plan, many spellings',
    find: (t) => /\bplans?\b/i.test(t) && /name|label|spell|inconsisten|differ|variation|mixed|same plan|written|case|capital|format|typo|standard|messy|mess|wrong/i.test(t),
    part: (t) => (/\bplans?\b/i.test(t) ? 'What about the plans?' : null),
    ask: [
      'How many plans does Spotify actually sell here? How many do you count in that column?',
      `Compare plan on row ${M.plan_names[0]} and row ${M.plan_names[1]}.`,
      'The same plan is written lots of ways: Premium Individual, PREM_IND, premium indiv.',
    ],
    why: "That's three lines in every pivot table for one plan.",
    said: 'the plan spellings',
  },
  {
    id: 'bad_price',
    label: 'Negative and zero prices',
    find: (t) => /negative|minus|below zero|(?:^|[\s(=:])-\s?\d|\bzero\b|0\.00|free\b/i.test(t),
    ask: [
      'Are all of these prices possible?',
      `Look at row ${M.bad_price[0]} in monthly_price.`,
      `Some prices are negative or zero, like row ${M.bad_price[0]}. Nobody pays minus twelve dollars.`,
    ],
    why: 'One of those can move a whole market average.',
    said: 'the negative prices',
  },
  {
    id: 'outlier',
    label: 'A slipped decimal',
    find: (t) => /outlier|too (high|big|large|much)|huge|1199|1,199|extra (zero|digit)|decimal|way (too|more|higher)|unrealistic|absurd|ridiculous|thousand|insane|crazy high|very high/i.test(t),
    ask: [
      'Does anyone look like they pay way more than everyone else?',
      `Look at rows ${M.outlier[0]} and ${M.outlier[1]}. Compare them to the other New York rows.`,
      `Rows ${M.outlier[0]} and ${M.outlier[1]} say 1199. That's 11.99 with the decimal gone.`,
    ],
    why: 'One of those makes a market look like a gold mine.',
    said: 'the slipped decimal',
  },
  {
    id: 'test',
    label: 'Internal test accounts',
    find: (t) => /\b(test|tests|testing|qa|internal|fake|dummy|staff|employee)\b/i.test(t),
    ask: [
      'Is everyone in this file actually a customer?',
      `Look at the email on row ${M.test[0]}.`,
      `Rows ${M.test.join(', ')} are our own QA accounts, not customers.`,
    ],
    why: "They aren't customers, so they don't belong in revenue.",
    said: 'the test accounts',
  },
];

/* the prompt */
const rubric: RubricRow[] = [
  { id: 'region', test: /region/i, miss: "You're missing the region part. Where should Claude get it from?" },
  { id: 'currency', test: /currenc/i, miss: "You're missing the blank currency. What should Claude do with those rows?" },
  { id: 'names', test: /\bnames?\b/i, miss: 'What about the blank names? Tell Claude what to do with them.' },
  { id: 'dups', test: /duplic|dupes?|customer_id|unique/i, miss: 'You skipped the duplicates. Which row should it keep?' },
  { id: 'dates', test: /\bdates?\b|yyyy|iso/i, miss: 'What format do you want the dates in?' },
  { id: 'price', test: /symbol|numeric|number|\$|plain/i, miss: 'What should Claude do with prices that have a symbol on them?' },
  { id: 'plan', test: /\bplans?\b/i, miss: 'Add the plan names. How many real plans are there?' },
  { id: 'bad', test: /negative|zero|invalid/i, miss: 'What about the negative and zero prices?' },
  { id: 'outlier', test: /outlier|decimal|1199|too high|range/i, miss: "Claude won't catch the 1199s unless you tell it. Add that." },
  { id: 'test', test: /\btest\b|\bqa\b|internal/i, miss: 'You forgot the test accounts.' },
];

const DRAFT = `You are cleaning a raw Spotify customer export for a pricing analysis. The file is attached.

Fix all of these:
1. Add a region column, using billing_city.
2. Fill blank currency from billing_city.
3. Keep rows with blank names and set the name to Unknown.
4. Remove duplicate customer_id rows, keep the first.
5. Put signup_date in YYYY-MM-DD.
6. Make monthly_price a plain number with no symbols.
7. Use one label per plan: Premium Individual, Duo, Family, Student.
8. Correct negative and zero prices to the plan's normal price for that market.
9. Correct prices that lost a decimal, like 1199.
10. Remove internal test accounts.

Give me back one clean .csv and a short list of what you changed.`;

/* what Claude does with whatever it's told */
export const fxFrom = (t: string, fx: CleanFx = {}): CleanFx => {
  const n: CleanFx = { ...fx };
  const s = t.toLowerCase();
  if (/region/.test(s)) n.region = true;
  if (/bengaluru|every (row|city)|no blank|all (rows|cities)|blank region|region.*(blank|missing|empty)|fill.*region|region.*rows? \d|rows? \d.*region/.test(s)) n.regionAll = n.region = true;
  if (/currenc/.test(s)) n.currency = true;
  if (/mismatch|(does ?n.?t|don.?t|not) match|wrong currenc|\busd\b|mumbai|rupee|\binr\b|currency.*rows? \d|rows? \d.*currency/.test(s)) n.mismatch = true;
  if (/\bnames?\b/.test(s)) {
    if (/keep|unknown|bring|don'?t (delete|drop|remove)|restore|placeholder|customers? back/.test(s)) {
      n.keepNames = true;
      n.dropNames = false;
    } else if (!n.keepNames) n.dropNames = true;
  }
  if (/bring back|customers? back|restore|removed/.test(s)) {
    n.keepNames = true;
    n.dropNames = false;
  }
  if (/duplic|dupes?|unique/.test(s)) n.dedupe = true;
  if (/\btest\b|\bqa\b|internal/.test(s)) n.tests = true;
  if (/symbol|numeric|number|negative|zero|outlier|decimal|1199|price/.test(s)) n.price = true;
  if (/\bplans?\b/.test(s)) n.plan = true;
  if (/\bdates?\b|yyyy|iso/.test(s)) n.dates = true;
  return n;
};

/* stage 1: every step, in order */
const cleanStage: StageDef = {
  id: 'clean',
  deliverable: { label: 'Clean dataset', type: '.csv', takes: 'file', name: 'spotify_pricing_clean.csv' },
  flow: [
    {
      id: 'issues',
      kind: 'find',
      label: 'Issues to identify',
      items: issues,
      order: ['region', 'currency', 'names', 'dups', 'dates', 'price_text', 'plan', 'bad_price', 'outlier', 'test'],
      reveal: 'a bunch of issues',
      open: [
        "Okay, so the first thing is I have a data file, but there's a bunch of issues with it. I need you to help me figure out those issues.",
        { file: 'raw' },
        'Can you open it and tell me what issues you found?',
      ],
      again: ['We have that one. What else do you see?', 'Got that one already. What else?', "That one's in. Keep going, what else?"],
      blanks: ['currency', 'names'],
      vague: /\b(gaps?|holes?|blanks?|empty( (cells?|fields?|values?|rows?|spots?|columns?))?|missing (values?|data|info|fields?|cells?|entries)|nulls?|n\/a)\b/i,
      done: "That's all ten. Now the prompt.",
      doing: 'Find the issues',
    },
    {
      id: 'prompt',
      kind: 'prompt',
      label: 'Prompt to Claude',
      rubric,
      need: 8,
      output: /\.?csv|file|return|give me back|output/i,
      outputMiss: 'Good. Now what do you want back from Claude? Be specific.',
      draft: DRAFT,
      concept: { ask: 'Have you written a prompt to clean a file with Claude before?', yes: 'Okay, then this one is yours.', no: 'prompt' },
      reveal: 'a prompt',
      doing: 'Write the prompt for Claude',
      open: ['Okay, great. Now we know all the issues with the file. What is a prompt that we can send to Claude to fix these issues?'],
      thin: "Claude wasn't in this chat. It only knows what you tell it. What are the issues?",
      ok: "Okay, great. That looks like a good prompt. I'll put it in the slot.",
    },
    {
      id: 'run',
      kind: 'submit',
      label: 'Clean dataset',
      type: '.csv',
      doing: 'Run it in Claude, then submit',
      open: ["Now go ahead and throw that in Claude and send me the clean data file when you have it ready. Hit PIP and I'll come with you."],
    },
  ],
  review: (sub) =>
    sub.text
      ? check(RAW, sub.text)
      : {
          wrong: true,
          items: [
            {
              id: 'wrong',
              one: "I can't read that file.",
              what: 'Send me the cleaned file as a .csv.',
              why: 'I can only review what I can open.',
              how: 'Export it as .csv and drop it in.',
            },
          ],
          total: 1,
        },
  reviewSay: (r) =>
    r.wrong
      ? "That's not the file I need."
      : r.items.length === 1
        ? "This looks good, but there's one thing to fix."
        : `Close. There are ${r.items.length} things to fix. You can ask me about any of them.`,
  approve: 'Awesome. This looks great. I have a few questions now.',
  stats: (r) => {
    const s = r.stats ?? {};
    return [
      [`${s.raw} to ${s.rows}`, 'rows'],
      [String(s.regions), 'regions'],
      [String(s.currencies), 'currencies'],
    ];
  },
  pou: {
    lines: [
      {
        k: 'What',
        text: 'A clean customer file you can compare across markets',
        q: 'What did you just submit to me? How would you explain it?',
        hear: [/clean|fixed|cleaned/i, /file|data|dataset|csv|customers?|sheet/i],
        more: ['Okay. But what is it? Say it like I never saw it.', "Tell me more. What's actually in it now?"],
        say: "It's the customer file with the bad rows fixed, so markets can be compared.",
      },
      {
        k: 'Why',
        text: 'Bad rows would have made the revenue model wrong',
        q: 'Why does this dataset matter?',
        hear: [
          /revenue|model|compare|comparison|pricing|decision|recommend|wrong|accurate|trust/i,
          /wrong|bad|break|broken|mislead|accurate|compare|can'?t|cannot|off|skew|trust|depend|rely|because|so that|otherwise/i,
        ],
        more: ['Okay, got it. What would actually break if we skipped this?', 'Say more. Who gets hurt by a bad file?'],
        say: 'Everything after this sits on it. Bad rows make the revenue model wrong, and we set prices off that model.',
      },
      {
        k: 'How',
        text: 'Found the issues, briefed Claude, then checked what came back',
        q: 'How did you clean it? Walk me through what you did.',
        hear: [/claude|prompt/i, /issue|found|check|review|feedback|fixed|went through|looked|spotted/i],
        more: ['Okay. And then what?', 'Walk me through it in order. What came first?'],
        say: 'You found the issues first, gave Claude a specific prompt, then checked what it returned and fixed what it missed.',
      },
    ],
    curve: [
      {
        k: 'One more',
        text: 'Local prices only compare once the currency is right',
        when: (c) => c.sawMismatch,
        q: "Hey, I noticed that in your first file the pricing on some Mumbai rows didn't match the currency. Can you explain that?",
        hear: [/inr|rupee|india|mumbai|local|usd|dollar/i, /currenc|price|wrong|mismatch|match|label/i],
        more: ['What would that have done to the numbers?', 'Why is 119 USD a problem?'],
        say: "119 is a rupee price with a dollar label. It makes those customers look like they pay ten times what anyone else does.",
      },
      {
        k: 'One more',
        text: 'Blank names are still paying customers',
        when: () => true,
        q: 'You kept the rows with blank names. Why not just delete them?',
        hear: [/customer|real|paying|revenue|pay|money|understate|count/i],
        more: ['What would we lose?'],
        say: "They're real paying customers. Dropping them understates revenue.",
      },
    ],
    end: "Great, that's exactly what I was looking for.",
  },
  demo: {
    first: (): Submission => ({ name: 'spotify_pricing_clean.csv', text: cleanCsv(RAW, fxFrom(DRAFT)) }),
    last: (): Submission => ({
      name: 'spotify_pricing_clean_v2.csv',
      text: cleanCsv(RAW, fxFrom(DRAFT + '\nFill region for Bengaluru. Fix the currency mismatch.')),
    }),
  },
};

/* holding to talk: only from state she really has. She never claims to see the screen. */
const screen = (c: ScreenCtx): string => {
  if (c.phase === 'feedback') {
    if (c.firstOpenHow) return `You're still on the feedback. Start with this one. ${c.firstOpenHow}`;
    return c.resub ? 'All ticked. Drop the new file in.' : 'All ticked. Hit fix and resubmit.';
  }
  if (c.phase === 'approved') return "Nothing's wrong. Hit Start POU.";
  if (c.phase === 'review') return "I'm reading your file. One sec.";
  if (c.phase === 'work' && c.stepKind === 'find') return `You've got ${c.left} to go. Look at the columns one at a time.`;
  if (c.phase === 'work' && c.stepKind === 'prompt') {
    return c.promptText ? 'Keep going. What else does Claude need to know?' : "Nothing in the prompt yet. Tell me what you'd say to Claude.";
  }
  if (c.surface === 'big') return "You're still in Zero. Hit PIP and go to Claude.";
  return 'Run it in Claude and send me what you get. If it looks off, ask me.';
};

export const SPOTIFY: Scenario = {
  meta: {
    id: 'spotify',
    company: 'Spotify',
    logo: 'static/logos/logo-spotify.svg',
    title: 'Find Where Spotify Can Raise Prices Next',
    manager: { name: 'Eryn', full: 'Eryn Mitchell', role: 'Your manager', face: 'static/faces/eryn.webp' },
    stages: [
      { id: 'clean', title: 'Clean the dataset', short: 'Clean data', minutes: 15, deliverable: { label: 'Clean dataset', type: '.csv' } },
      { id: 'model', title: 'Build the revenue model', short: 'Revenue model', minutes: 25, deliverable: { label: 'Revenue model', type: '.csv' } },
      { id: 'rec', title: 'Make the recommendation', short: 'Recommendation', minutes: 15, deliverable: { label: 'Recommendation', type: '.pdf' }, stub: true },
      { id: 'memo', title: 'Write the pricing memo', short: 'Pricing memo', minutes: 15, deliverable: { label: 'Pricing memo', type: '.pdf' }, stub: true },
      { id: 'deck', title: 'Present it', short: 'Present', minutes: 12, deliverable: { label: 'Slide deck', type: '.pptx' }, stub: true },
    ],
    end: 'One clear recommendation',
  },
  files: {
    raw: {
      id: 'raw',
      name: RAW.name,
      meta: `${RAW.rows.length} rows, ${RAW.cols.length} columns`,
      kind: 'csv',
      url: 'static/media/' + RAW.name,
      text: toCsv(RAW.cols, RAW.rows),
    },
  },
  stages: { clean: cleanStage },
  stubLines: { model: 'Okay, so now we have a clean file. Next we model what each market brings in.' },
  say: {
    ready: "Okay, awesome. So in order to do this project, I've separated it into these stages. Each one has its own deliverable. Let's work through each one together.",
    next: (t) => `Next up, ${t.toLowerCase()}.`,
    back: (n, t) => `Welcome back. You're on stage ${n}, ${t.toLowerCase()}.`,
  },
  screen,
};
