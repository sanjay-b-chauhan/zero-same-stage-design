import type { CheckLine } from '../../content/check';
import type { Line } from './store';
import { BRIEF, type FixItem } from './script';
/* b35 (his note: "stages 2, 3, 4, 5 ... whatever content is there in the current thing, we just have to use it, but put it
   into our system"): stages 2 to 5 in the ds stage. The stage model from the founder call: she directs one slot at a time,
   the system ticks a slot when your answer gets it, you only tick her fixes. Every number is the real one from the cleaned
   file (games/stage2.ts) and the sample recommendation PDF. Stage 5's check-in is the practice presentation. */

export type Brief = typeof BRIEF;

export interface Slot {
  id: string;
  ask: string;
  re: RegExp[];
  yes: string;
  miss: string;
  sample: string;
}

export interface Hand {
  name: string;
  meta: string;
  preview?: string;
  link?: boolean;
  sheet?: boolean;
}

export interface StageFile {
  name: string;
  meta: string;
  url: string;
}

/* b39 (his note: "the manager analyzes the file, and then they give feedback on the right-hand side ... Below expectation,
   Met it, Exceeded, Exceptional. Then there are some content changes, some style changes ... When you open it, you see why
   this is feedback and how we can make it better ... Resubmit, Continue"): one band, one verdict, the notes in two groups */
export const BANDS = ['Below expectations', 'Meets expectations', 'Exceeds expectations', 'Exceptional'] as const;
export const BANDS_SHORT = ['Below', 'Meets', 'Exceeds', 'Exceptional'] as const;
export interface GradeItem {
  id: string;
  group: 'Content' | 'Style';
  title: string;
  why: string;
  how: string;
  fixed: string;
  /* the block of the page it points at */
  at: number;
}
export interface Grade {
  v1: { band: number; verdict: string; line: string };
  v2: { band: number; verdict: string; line: string };
  items: GradeItem[];
  accept: [string, string];
  /* what she checks while she reads, one line at a time */
  scan: string[];
}

export interface StageSpec {
  brief: Brief;
  file: StageFile;
  greet: string;
  open: Line[];
  slots: Slot[];
  ready: string;
  after: string;
  hand: Hand;
  sentLine: string;
  review: { first: { est: string; got: string; back: string }; again: { est: string; got: string; back: string } };
  feedback?: { head: string; items: FixItem[]; ask: string };
  /* b39: a graded review on the right instead of fixes to tick */
  grade?: Grade;
  /* b41 (his note: "No PO experience, no final submission, nothing. It's like directly you are joining the call"): she sends
     the pack, the only key is Join the call */
  call?: boolean;
  fixedLine: string;
  checkIntro: string;
  check: CheckLine[];
}

const SHEETS = 'static/logos/logo-sheets.svg';
const CLAUDE = 'static/logos/logo-claude.svg';
const CLEAN_FILE: StageFile = { name: 'spotify_pricing_clean.csv', meta: '58 rows, 11 columns', url: 'static/media/spotify_pricing_clean.csv' };
const MODEL_FILE: StageFile = { name: 'revenue_model.csv', meta: '6 markets, 49 active customers', url: 'static/media/revenue_model.csv' };

const model: StageSpec = {
  brief: {
    stage: 'Build the revenue model',
    deliverable: 'Revenue model',
    deliverableLine: 'What each market brings in, one row per market.',
    format: 'Google Sheet link',
    formatLine: 'Share it so anyone with the link can view.',
    voice:
      "Okay, so now we have a clean file. Next we model what each market brings in. Three things matter here. Only people still paying count this month, so churned customers stay out. Every market bills in its own money, so put it all in dollars before you compare anything. Then divide by customers, because a big market isn't the same as a valuable one. One row per market, and send me the link.",
    voiceSec: 26,
    problem: 'We know who the customers are. Now we need what each market brings in, in one currency, so the markets can be compared.',
    requirements: [
      { id: 'active', text: 'Count only the customers still paying' },
      { id: 'usd', text: 'Put every market in US dollars' },
      { id: 'per', text: 'Divide by customers for revenue per user' },
    ],
    tools: [
      { id: 'sheets', name: 'Google Sheets', logo: SHEETS, film: ['Filter status to active', 'Sum monthly price by market', 'Multiply by the rate for US dollars'] },
      { id: 'claude', name: 'Claude', logo: CLAUDE, film: ['Attach the clean CSV', 'Ask for revenue by market, active only', 'Check one market by hand'] },
    ],
    training: [
      { id: 'rev', kind: 'Concept', title: 'Revenue versus customers', steps: ['Revenue is what comes in this month', 'Customers is how many pay it', 'A big market is not always a valuable one'] },
      { id: 'fx', kind: 'Workflow', title: 'Convert currencies in Sheets', steps: ['Add a rate column', 'Multiply local revenue by the rate', 'Format the result as US dollars'] },
      { id: 'arpu', kind: 'Workflow', title: 'Revenue per user', steps: ['Revenue in one column, customers in the next', 'Divide one by the other', 'Sort it, lowest first'] },
    ],
  },
  file: CLEAN_FILE,
  greet: 'Your clean file is in. Nice work.',
  open: ["Here's the clean file you sent me. Everything in this stage comes from it.", { file: true }],
  slots: [
    {
      id: 'active',
      ask: 'First thing. The US has 14 rows in the file. How many count for this month, and why?',
      re: [/\b(8|eight)\b|activ|paying|churn|cancel|left|stopped/i],
      yes: 'Right. 6 of those 14 churned. The US brings in $94.92 a month, not $176.86.',
      miss: 'Look at the status column. Who is still paying?',
      sample: "Only the 8 active ones. The 6 who churned don't pay anymore.",
    },
    {
      id: 'usd',
      ask: 'Next. Mexico brings in 1,222 a month and Germany 93.92. Which one is bigger?',
      re: [/germany|convert|usd|dollar|currenc|rate|peso|euro|depends/i],
      yes: 'Exactly, different money. In dollars Germany leads at $101.43 and Mexico is $67.21.',
      miss: 'Careful. What currency is each of those in?',
      sample: "You can't tell until you convert. In dollars Germany is bigger.",
    },
    {
      id: 'per',
      ask: 'Last one. India has the most customers, 11. Is it our best market?',
      re: [/\bno\b|\bnot\b|per (user|customer|person|head)|divide|average|lowest|least|worst|1\.62/i],
      yes: 'No, it is the lowest. $1.62 a customer. The UK is highest at $13.96.',
      miss: 'Divide what it brings in by how many customers it has. What do you get?',
      sample: "No. Per customer it's the lowest, about $1.62.",
    },
  ],
  ready: "That's the model. One row per market in a sheet, then send me the link.",
  after: 'Send me the link when the sheet is ready.',
  hand: { name: 'revenue_model', meta: 'Google Sheets', link: true, sheet: true, preview: MODEL_FILE.url },
  sentLine: 'Revenue model sent',
  review: {
    first: { est: '2 min', got: "Got it. Give me two minutes, I'm checking the math.", back: 'Okay, I went through every row.' },
    again: { est: '30 sec', got: 'Okay, one sec.', back: 'Perfect. That reads in five seconds.' },
  },
  feedback: {
    head: 'The numbers are right. Two things.',
    items: [
      { id: 'f1', text: 'Sort the markets by revenue in US dollars, biggest first', why: 'Leadership reads the top row first.' },
      { id: 'f2', text: 'Round every dollar figure to two decimals', why: '$67.2135 reads like a mistake.' },
    ],
    ask: 'How should I sort the markets?',
  },
  fixedLine: "Sorted and rounded. Here's the new one.",
  checkIntro: 'Nice. This is solid. A few questions before we move on.',
  check: [
    {
      text: 'What each market brings in each month, in dollars',
      q: "So what did you just send me? Explain it like I've never seen it.",
      hear: [/market|countr|row/i, /revenue|bring|money|dollar|usd|earn|make|worth/i],
      more: ['Okay, but what does one row tell me?', "Say more. What's actually in it?"],
      say: 'One row per market, what it brings in each month in dollars, and what each customer is worth.',
      sample: "It's one row per market with what it brings in every month, in dollars.",
    },
    {
      text: 'Churned customers would have almost doubled the US',
      q: 'Why did we leave the churned customers out?',
      hear: [/churn|cancel|left|leave|stopp|not paying|don'?t pay|aren'?t paying|gone/i, /revenue|count|number|inflat|wrong|bigger|double|month|money|real/i],
      more: ['Okay. What would have happened if we kept them?', 'Say more. Which number goes wrong?'],
      say: 'They stopped paying. Counting them makes the US look almost twice as big as it is.',
      sample: "They don't pay anymore. Counting them would almost double the US revenue.",
    },
    {
      text: 'India is the biggest by customers and the smallest by value',
      q: 'What surprised you in the numbers?',
      hear: [/india|uk|britain|germany|brazil|mexico|\bus\b|market/i, /per (user|customer)|lowest|highest|most|least|big|small|value|worth|surpris/i],
      more: ['Okay. Which market, and why?', 'Tell me more. What did the per customer number show?'],
      say: "India has the most customers and the lowest value per customer. Size isn't value.",
      sample: 'India. The most customers, but the lowest revenue per user.',
    },
  ],
};

const rec: StageSpec = {
  brief: {
    stage: 'Make the recommendation',
    deliverable: 'Recommendation',
    deliverableLine: 'One market, one step up, and why not further.',
    format: 'One page PDF',
    formatLine: 'One page. Leadership reads it in a minute.',
    voice:
      "Okay, this is the one leadership actually reads. Not a list of options, not a maybe. One call. Which market we raise next, and by how much. Think of price like a volume knob. Turn it a little and nobody notices. Turn it too far and people leave, and the US already showed us that. Use your model, pick the market that held, and tell me how far to turn it.",
    voiceSec: 24,
    problem: 'Leadership wants one call. One market to raise next, by how much, and why not further.',
    requirements: [
      { id: 'where', text: 'Name one market to raise next' },
      { id: 'why', text: 'Say why that market can take it' },
      { id: 'step', text: 'One step up, in its own currency' },
      { id: 'limit', text: 'Say why not further' },
    ],
    tools: [
      { id: 'sheets', name: 'Google Sheets', logo: SHEETS, film: ['Open the revenue model', 'Sort by revenue per user', 'Mark the markets where nobody left'] },
      { id: 'claude', name: 'Claude', logo: CLAUDE, film: ['Attach the model', 'Ask it to argue against your pick', 'Keep only what the numbers back'] },
    ],
    training: [
      { id: 'knob', kind: 'Concept', title: 'Price is a volume knob', steps: ['A small turn, nobody notices', 'Too far and people leave', 'The market that held has room'] },
      { id: 'call', kind: 'Workflow', title: 'Write one clear call', steps: ['Name one market', 'Give one number, in its currency', 'Say why not further'] },
    ],
  },
  file: MODEL_FILE,
  greet: 'Your model is in. That was the hard part.',
  open: ["Here's your model. The answer is already in it.", { file: true }],
  slots: [
    {
      id: 'where',
      ask: 'Start here. Which market do we raise next?',
      re: [/brazil|\bbr\b/i],
      yes: 'Brazil. Okay, I like it.',
      miss: 'Look at the markets where nobody left. Which one earns the least per customer?',
      sample: 'Brazil.',
    },
    {
      id: 'why',
      ask: 'Why Brazil?',
      re: [/churn|left|leave|nobody|no ?one|lost|held|stay|lowest|least|4\.82|per (user|customer)|cheap|room|low/i],
      yes: 'Right. Nobody left there, and at $4.82 a customer it has the most room.',
      miss: 'Check two things in the model. Who left, and what each customer pays.',
      sample: 'Nobody churned there, and it earns the least per customer of the markets that held.',
    },
    {
      id: 'step',
      ask: 'Brazil Individual is R$23.90 today. Where do we take it?',
      re: [/\b2[4-6]([.,]\d+)?\b|\d+\s?(%|percent)|r\$|reais|real/i],
      yes: 'R$25.90 works. About 8 percent, one step.',
      miss: 'Give me a real price, in reais.',
      sample: 'One step, to R$25.90. About 8 percent.',
    },
    {
      id: 'limit',
      ask: 'Last one. Why not go higher?',
      re: [/\bus\b|united states|america|\buk\b|britain|churn|left|lost|lose|leave|too far|risk|cancel/i],
      yes: 'Exactly. The US lost 6 of 14 and the UK 2 of 8 when the knob went too far.',
      miss: 'What happened in the markets that went too far last time?',
      sample: 'Because the US lost 6 of 14 customers when it went too far.',
    },
  ],
  ready: "That's the call. Put those four lines on one page and send me the PDF.",
  after: 'Send me the PDF when the page is ready.',
  hand: { name: 'pricing_recommendation.pdf', meta: 'PDF, 1 page' },
  sentLine: 'Recommendation sent',
  review: {
    first: { est: '2 min', got: "Got it. Two minutes, I'm reading it like leadership would.", back: "Okay, I read it twice. That's a call I can take upstairs." },
    again: { est: '30 sec', got: 'Okay, one sec.', back: "That's the one." },
  },
  fixedLine: "Here's the new one.",
  checkIntro: 'This is good. Before I send it up, a few questions.',
  check: [
    {
      text: 'Raise Brazil Individual one step, to R$25.90',
      q: 'Give me your recommendation in one sentence.',
      hear: [/brazil/i, /25|8|percent|raise|up|step|increase/i],
      more: ['Shorter. One market, one number.', 'Okay, but by how much?'],
      say: 'Raise Brazil Individual one step, from R$23.90 to R$25.90.',
      sample: 'Raise Brazil Individual one step, from R$23.90 to R$25.90.',
    },
    {
      text: 'Nobody left Brazil, and it earns the least per customer',
      q: 'Why Brazil and not Germany? Germany held too.',
      hear: [/churn|left|lost|nobody|no ?one|stay|held|per (user|customer)|4\.82|12\.68|room|cheap|lowest|less|already/i, /brazil|germany|price|high|more|room|customer/i],
      more: ['Okay. What does Germany already pay?', 'Say more. What makes Brazil the one with room?'],
      say: 'Both held, but Germany already earns $12.68 a customer. Brazil earns $4.82, so it has the most room.',
      sample: 'Germany already earns $12.68 a customer. Brazil earns $4.82, so it has more room.',
    },
    {
      text: 'Too far and people leave, like the US did',
      q: "What's the risk, and how would we know early?",
      hear: [/churn|leave|left|lose|cancel|drop/i, /watch|track|month|week|first|early|signal|test|measure|data|see/i],
      more: ['Okay. And how would we catch it?', 'What would we look at, and when?'],
      say: "People leave if we go too far. We'd watch Brazil churn in the first month and stop if it moves.",
      sample: 'The risk is churn. We watch Brazil cancellations in the first month.',
    },
  ],
};

const memo: StageSpec = {
  brief: {
    stage: 'Submit your final deliverables',
    deliverable: 'Pricing memo, with the model',
    deliverableLine: 'The memo carries the call, the model backs it up.',
    format: 'PDF',
    formatLine: 'One page, the model linked at the bottom.',
    voice:
      "So this is the package that goes upstairs. A short memo, with your model linked under it. Leadership reads the first line and maybe the second, so put the ask right at the top. Then the numbers that prove it, then the risk and how we'd catch it early. Keep it to one page. If I have to scroll, it's too long.",
    voiceSec: 21,
    problem: "Leadership won't open a spreadsheet. The memo carries the call, the model is there for anyone who checks.",
    requirements: [
      { id: 'who', text: 'Write it for the person signing off' },
      { id: 'ask', text: 'Put the ask in the first line' },
      { id: 'proof', text: 'Back it with two numbers' },
      { id: 'attach', text: 'Link the model underneath' },
    ],
    tools: [
      { id: 'claude', name: 'Claude', logo: CLAUDE, film: ['Paste your recommendation', 'Ask for one page, the ask first', 'Cut every line that is not the ask, the proof or the risk'] },
      { id: 'sheets', name: 'Google Sheets', logo: SHEETS, film: ['Open the revenue model', 'Share, anyone with the link can view', 'Copy the link into the memo'] },
    ],
    training: [
      { id: 'reader', kind: 'Concept', title: 'Write for the reader', steps: ['Who signs off', 'What they need to decide', 'What they will ask next'] },
      { id: 'onepage', kind: 'Workflow', title: 'The one page memo', steps: ['The ask in line one', 'Two numbers that prove it', 'The risk and how we catch it'] },
    ],
  },
  file: MODEL_FILE,
  greet: "Leadership liked the call. Now we package it.",
  open: ["Here's your model again. It goes under the memo.", { file: true }],
  slots: [
    {
      id: 'who',
      ask: 'Who reads this memo first?',
      re: [/lead|vp|head|exec|stakeholder|boss|director|cfo|ceo|pricing|manager|decid|sign/i],
      yes: 'Yep. The pricing lead. Write it for them, not for me.',
      miss: 'Think about who signs off on a price change.',
      sample: "The pricing lead. They're the one who signs off.",
    },
    {
      id: 'ask',
      ask: "What's the very first line of the memo?",
      re: [/brazil/i],
      yes: 'Good. The ask, first, in one line.',
      miss: 'Lead with the ask. What are we asking them to approve?',
      sample: 'Raise Brazil Individual to R$25.90 next month.',
    },
    {
      id: 'proof',
      ask: 'Which two numbers back it up?',
      re: [/4\.82|\b0\b|zero|nobody|no ?one|churn|per (user|customer)|12\.68|revenue|\$/i],
      yes: 'Those two. Nobody left Brazil, and it earns $4.82 a customer.',
      miss: 'Pick from the model. One about who stayed, one about what they pay.',
      sample: 'Zero churn in Brazil, and $4.82 a customer, the lowest of the markets that held.',
    },
    {
      id: 'attach',
      ask: 'And what goes under the memo?',
      re: [/model|sheet|spreadsheet|revenue|csv|data|numbers|link/i],
      yes: 'Right. The model, so anyone can check the math.',
      miss: 'If leadership asks how we got the number, where do they look?',
      sample: 'The revenue model, linked, so anyone can check it.',
    },
  ],
  ready: "That's the package. Write the memo, link the model at the bottom, and send it to me as a PDF.",
  after: 'Send me the PDF when it reads right.',
  hand: { name: 'pricing_memo.pdf', meta: 'PDF, 1 page' },
  sentLine: 'Memo and model sent',
  review: {
    first: { est: '2 min', got: "Got it. Give me two minutes, I'm reading it top to bottom.", back: 'Okay, read it.' },
    again: { est: '30 sec', got: 'Okay, one sec.', back: 'Much better.' },
  },
  grade: {
    v1: { band: 1, verdict: 'The call is right and the numbers hold. It reads like a long note, not a one pager yet.', line: 'It meets the bar. Two notes on content, two on style. I pinned each one on the page.' },
    v2: { band: 2, verdict: "One page, the gain in line one, a line we roll back at. I'd send this upstairs as is.", line: 'It exceeds the bar now. Continue when you are ready.' },
    items: [
      {
        id: 'c1',
        group: 'Content',
        title: 'Say what it earns, next to the ask',
        why: 'Line one says what to do, not what we get. The pricing lead approves a number.',
        how: 'Put the gain in the same line: about 8 percent more from every Brazil Individual customer.',
        fixed: 'Line one carries the gain now.',
        at: 0,
      },
      {
        id: 'c2',
        group: 'Content',
        title: 'Name the line we roll back at',
        why: '"If churn moves" is not something anyone can act on. Who calls it, and at what number?',
        how: 'Pick the number and the window: roll it back if 2 of the 8 Brazil customers cancel in the first month.',
        fixed: 'The roll back line is set: 2 of 8, in the first month.',
        at: 3,
      },
      {
        id: 's1',
        group: 'Style',
        title: 'Keep it to one page',
        why: 'It runs onto a second page. Leadership stops reading at the scroll.',
        how: 'Drop Why not further. The model already holds the US and UK numbers for anyone who checks.',
        fixed: 'One page now. The US and UK numbers live in the model.',
        at: 2,
      },
      {
        id: 's2',
        group: 'Style',
        title: 'Make each heading its point',
        why: 'The proof and The risk say where you are, not what you learn. A skimmer reads only the headings.',
        how: 'Write each heading as the point, like Nobody left Brazil, or We catch it in week one.',
        fixed: 'Every heading is its point now.',
        at: 1,
      },
    ],
    accept: ['Fair. It does the job.', 'Good. Now tell me why it works.'],
    scan: ['Reading the ask', 'Checking the numbers against your model', 'Checking the risk', 'Checking it fits one page'],
  },
  fixedLine: "Took all four notes. Here's v2.",
  checkIntro: 'Great. A few questions, then it goes up.',
  check: [
    {
      text: 'A one page memo with the ask on top, the model under it',
      q: "Walk me through what's in the package.",
      hear: [/memo|doc|page/i, /model|sheet|number|data|link/i],
      more: ['Okay. And what sits under the memo?', 'Say more. What does leadership get?'],
      say: 'A one page memo with the ask on top, and the model linked under it.',
      sample: 'A one page memo with the ask on top, and the model linked under it.',
    },
    {
      text: 'The ask goes first because leadership reads one line',
      q: 'Why does the ask go first?',
      hear: [/read|busy|first|time|top|skim|line|attention|scroll|minute/i, /lead|they|exec|people|reader|boss|nobody|no ?one|vp/i],
      more: ['Okay. What happens if it sits on page two?', 'Say more. Who are we writing for?'],
      say: "Leadership reads one line. If the ask isn't there, they miss it.",
      sample: "Because leadership reads one line. If the ask isn't there, they miss it.",
    },
    {
      text: 'We watch Brazil churn in the first month',
      q: 'If this goes wrong, how do we find out?',
      hear: [/churn|cancel|leave|left|drop/i, /month|week|watch|track|early|first|dashboard|signal|see/i],
      more: ['Okay. What would we look at?', 'And when would we look?'],
      say: 'We watch Brazil cancellations every week in the first month, and stop if they move.',
      sample: 'We watch Brazil cancellations every week in the first month.',
    },
  ],
};

const deck: StageSpec = {
  call: true,
  brief: {
    stage: 'Present to the stakeholder',
    deliverable: 'Slide deck, three slides',
    deliverableLine: 'The ask, the numbers behind it, the risk.',
    format: 'Google Slides link',
    formatLine: "Three slides, built from your memo. You present it to me live.",
    voice:
      "Last one. You're presenting this to the VP of pricing, and you get five minutes. Three slides is plenty. The ask, the numbers behind it, and the risk with how we'd catch it. Don't read the slides out loud, talk to them. When you're ready, join the call and present it to me like I'm the VP. Then I'll ask the questions the VP would.",
    voiceSec: 22,
    problem: 'The VP of pricing gives you five minutes. The deck has to make the ask before they ask you.',
    requirements: [
      { id: 'ask', text: 'Slide 1, the ask' },
      { id: 'proof', text: 'Slide 2, the numbers behind it' },
      { id: 'risk', text: 'Slide 3, the risk and how we catch it' },
    ],
    tools: [
      { id: 'claude', name: 'Claude', logo: CLAUDE, film: ['Paste your memo', 'Ask for three slides, one idea each', 'Rewrite every title as a sentence'] },
      { id: 'sheets', name: 'Google Sheets', logo: SHEETS, film: ['Open the revenue model', 'Chart revenue per user by market', 'Copy the chart onto slide 2'] },
    ],
    training: [
      { id: 'three', kind: 'Concept', title: 'Three slides, one ask', steps: ['The ask, big', 'One chart that proves it', 'The risk, before they ask'] },
      { id: 'say', kind: 'Workflow', title: 'Practise out loud', steps: ['Say slide 1 in one breath', 'Answer the obvious push back', 'End on the risk and the signal'] },
    ],
  },
  file: MODEL_FILE,
  greet: 'The memo went up. The VP wants to hear it from you.',
  open: [
    'Here is everything. Your deck is built from the memo, three slides.',
    'The model is here too, in case anyone asks for a number.',
    { file: true },
    'Five minutes on the deck, then my questions. Ask me anything first, and join the call when you are ready.',
  ],
  slots: [
    {
      id: 'ask',
      ask: "What's on slide 1?",
      re: [/ask|brazil|raise|recommend|25|approv/i],
      yes: 'Yes. The ask, big, nothing else.',
      miss: 'Lead with what you want them to approve.',
      sample: 'The ask. Raise Brazil Individual to R$25.90.',
    },
    {
      id: 'proof',
      ask: 'And slide 2?',
      re: [/number|model|data|churn|per (user|customer)|chart|revenue|market|proof|why/i],
      yes: 'Good. One chart, Brazil next to the others.',
      miss: 'What would make the VP believe slide 1?',
      sample: 'The numbers. Revenue per user by market, Brazil next to the rest.',
    },
    {
      id: 'risk',
      ask: 'And the last slide?',
      re: [/risk|churn|watch|track|catch|month|signal|leave|cancel/i],
      yes: "Right. End on the risk and the signal. That's what VPs ask about.",
      miss: "What's the first thing a VP worries about with a price rise?",
      sample: 'The risk. Churn, and how we watch it in the first month.',
    },
  ],
  ready: "That's the deck. Build the three slides and send me the link. Then you present it to me.",
  after: 'Send me the Slides link when the three are built.',
  hand: { name: 'brazil_pricing_deck', meta: 'Google Slides', link: true },
  sentLine: 'Deck sent',
  review: {
    first: { est: '1 min', got: 'Got it. Give me a minute to flip through.', back: "Okay, the slides work. Now let's hear it." },
    again: { est: '30 sec', got: 'Okay, one sec.', back: "That's it." },
  },
  fixedLine: "Here's the new one.",
  checkIntro: "Okay, I'm the VP now. You have five minutes. Go.",
  check: [
    {
      text: 'Open on the ask',
      q: "I've got five minutes. What do you need from me?",
      hear: [/brazil/i, /raise|approv|price|25|increase|up|step/i],
      more: ["Faster. What's the ask?", "I still don't know what you want me to approve."],
      say: 'Approve raising Brazil Individual one step, to R$25.90.',
      sample: "I'd like you to approve raising Brazil Individual one step, to R$25.90.",
    },
    {
      text: 'Answer the push back with the numbers',
      q: 'Why Brazil? Germany earns way more.',
      hear: [/per (user|customer)|4\.82|12\.68|room|churn|left|nobody|no ?one|already|held|stay/i, /brazil|germany|more|less|room|price|customer/i],
      more: ["That's not a number. Why Brazil?", 'Okay, but Germany held too. So?'],
      say: 'Germany already earns $12.68 a customer. Brazil earns $4.82 and nobody left, so it has the room.',
      sample: 'Germany already earns $12.68 a customer. Brazil earns $4.82 and nobody left, so it has the room.',
    },
    {
      text: 'Name the risk and the signal before they do',
      q: 'And if people leave?',
      hear: [/watch|track|month|week|early|stop|roll ?back|pause|signal|measure|revert/i, /churn|cancel|leave|left|number|rate|brazil|it|price/i],
      more: ['So what do we do about it?', 'How fast would we know?'],
      say: 'We watch Brazil cancellations every week. If churn moves in the first month, we roll it back.',
      sample: 'We watch Brazil cancellations every week. If churn moves in the first month, we roll it back.',
    },
  ],
};

export const STAGES: Record<string, StageSpec> = { model, rec, memo, deck };

/* stage 1 keeps its own script (script.ts); every other stage reads its spec */
export const specOf = (stageId: string): StageSpec | undefined => STAGES[stageId];

/* b36 (his note: "let's make the whole freaking thing, even the presentation, how we have the divide"): in every check-in
   what you made opens on the right, behind the divider. Every number is the model's (revenue_model.csv) and the call. */
export interface DocBlock {
  h?: string;
  p?: string;
  rows?: string[][];
  link?: string;
}
export interface Slide {
  title: string;
  big?: string;
  sub?: string;
  bars?: { label: string; v: number; hi?: boolean }[];
  lines?: string[];
}
export type Work =
  | { kind: 'sheet'; name: string; meta: string; logo: string; file: StageFile }
  | { kind: 'doc'; name: string; meta: string; logo?: string; title: string; to?: string; blocks: DocBlock[]; v2?: DocBlock[] }
  | { kind: 'deck'; name: string; meta: string; logo: string; slides: Slide[] };

const SLIDES = 'static/logos/logo-slides.svg';
const HELD: string[][] = [
  ['Market', 'Active', 'Left', 'Per customer'],
  ['Brazil', '8', '0', '$4.82'],
  ['Germany', '8', '0', '$12.68'],
  ['United States', '8', '6', '$11.87'],
  ['United Kingdom', '6', '2', '$13.96'],
];

export const WORK: Record<string, Work> = {
  clean: { kind: 'sheet', name: 'spotify_pricing_clean', meta: CLEAN_FILE.meta, logo: SHEETS, file: CLEAN_FILE },
  model: { kind: 'sheet', name: 'revenue_model', meta: MODEL_FILE.meta, logo: SHEETS, file: MODEL_FILE },
  rec: {
    kind: 'doc',
    name: 'pricing_recommendation.pdf',
    meta: 'PDF, 1 page',
    title: 'Raise Brazil Individual one step',
    blocks: [
      { p: 'Raise Brazil Individual from R$23.90 to R$25.90 next month. About 8 percent, one step.' },
      { h: 'Why Brazil', p: 'Nobody left Brazil, and of the markets that held it earns the least per customer: $4.82, against $12.68 in Germany.' },
      { rows: HELD },
      { h: 'Why not further', p: 'When the price went too far, the US lost 6 of 14 customers and the UK 2 of 8. One step keeps us clear of that.' },
      { h: 'How we know early', p: 'We watch Brazil cancellations every week in the first month and stop if churn moves.' },
    ],
  },
  memo: {
    kind: 'doc',
    name: 'pricing_memo.pdf',
    meta: 'PDF, 1 page',
    title: 'Brazil Individual price',
    to: 'To the pricing lead',
    blocks: [
      { p: 'Approve raising Brazil Individual to R$25.90 next month.' },
      { h: 'The proof', p: 'Zero churn in Brazil, and $4.82 a customer, the lowest of the markets that held.' },
      { h: 'Why not further', p: 'When the price went too far, the US lost 6 of 14 customers and the UK 2 of 8. One step keeps us clear of that.' },
      { h: 'The risk', p: 'Go too far and people leave. We watch Brazil cancellations and roll it back if churn moves.' },
      { h: 'The model', p: 'Every number above comes from the model. Anyone with the link can check the math.', link: 'revenue_model' },
    ],
    /* b39: what she reads after Resubmit, her four notes taken */
    v2: [
      { p: 'Approve raising Brazil Individual to R$25.90 next month, about 8 percent more from every customer there.' },
      { h: 'Nobody left Brazil', p: 'Zero churn, and $4.82 a customer, the lowest of the markets that held.' },
      { h: 'We catch it in week one', p: 'We watch Brazil cancellations every week for the first month, and roll it back if 2 of the 8 customers cancel.' },
      { h: 'The model', p: 'Every number above comes from the model. Anyone with the link can check the math.', link: 'revenue_model' },
    ],
  },
  deck: {
    kind: 'deck',
    name: 'brazil_pricing_deck',
    meta: 'Google Slides, 3 slides',
    logo: SLIDES,
    slides: [
      { title: 'Approve raising Brazil Individual to R$25.90', big: 'R$23.90 to R$25.90', sub: 'One step, about 8 percent, next month.' },
      {
        title: 'Brazil has the most room',
        bars: [
          { label: 'UK', v: 13.96 },
          { label: 'Germany', v: 12.68 },
          { label: 'US', v: 11.87 },
          { label: 'Mexico', v: 8.4 },
          { label: 'Brazil', v: 4.82, hi: true },
          { label: 'India', v: 1.62 },
        ],
        sub: 'Revenue per customer, US dollars. Nobody left Brazil.',
      },
      {
        title: 'We catch churn in the first month',
        lines: ['Watch Brazil cancellations every week', 'If churn moves in the first month, roll it back', 'The US lost 6 of 14 when it went too far'],
      },
    ],
  },
};

export const workOf = (stageId: string): Work | undefined => WORK[stageId];
