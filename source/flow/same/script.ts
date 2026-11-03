import type { Line } from './store';
/* Same stage b2: Design 1's script with her greeting first, a longer voice note for the transcript, no link box. */
/* Design 1 (Navid, 3 Nov call): the real stage with fewer design changes. Every word she says in stage 1, short like a text.
   The brief is what she sends first. Requirements are outcomes you can tick, not specs. Feedback is action items with a why. */

export interface BriefTool {
  id: string;
  name: string;
  logo: string;
  film: string[]; /* the tool training, one line per step */
}

export interface Training {
  id: string;
  kind: 'Concept' | 'Workflow';
  title: string;
  steps: string[];
}

export interface FixItem {
  id: string;
  text: string;
  why: string;
}

export const BRIEF = {
  stage: 'Clean the dataset',
  deliverable: 'Clean dataset',
  deliverableLine: 'Clean the raw export so every number after it can be trusted.',
  format: 'Google Sheet link',
  formatLine: 'Share it so anyone with the link can view.',
  voice:
    "So this first stage is all about trust. The export you're getting has customers listed twice, prices with no currency, and a few rows with no name. If the data's messy, every number we build after it lies, and the whole pricing call falls apart. Start with the doubles, they're the easiest to miss. Keep every real customer and send it over when it looks right.",
  voiceSec: 23,
  problem: "The raw export has customers listed twice, prices with no currency and test accounts mixed in. Every number we build after this depends on it.",
  requirements: [
    { id: 'dups', text: 'Remove every customer listed twice' },
    { id: 'cur', text: 'Give every price its currency' },
    { id: 'test', text: 'Take out the test accounts' },
    { id: 'keep', text: 'Keep every real customer, even the ones with no name' },
  ],
  tools: [
    {
      id: 'sheets',
      name: 'Google Sheets',
      logo: 'static/logos/logo-sheets.svg',
      film: ['File, Import, upload the CSV', 'Data, Data cleanup, Remove duplicates', 'Share, Anyone with the link can view'],
    },
    {
      id: 'claude',
      name: 'Claude',
      logo: 'static/logos/logo-claude.svg',
      film: ['Attach the CSV', 'Ask what looks wrong, in your own words', 'Check every change it makes against the file'],
    },
  ] as BriefTool[],
  training: [
    {
      id: 'clean',
      kind: 'Concept',
      title: 'What clean data means',
      steps: ['One row, one customer', 'Every value in the same format', 'Missing is marked, never guessed'],
    },
    {
      id: 'dedupe',
      kind: 'Workflow',
      title: 'Find and remove duplicates',
      steps: ['Sort by email', 'Look for two rows in a row with the same email', 'Keep the newest, delete the other'],
    },
    {
      id: 'claude-clean',
      kind: 'Workflow',
      title: 'Clean a file with Claude',
      steps: ['Attach the CSV', 'List the issues you found, one per line', 'Ask for the clean file back, then spot check it'],
    },
  ] as Training[],
};

/* stage 2, so the turn lands somewhere real. Same brief, her opener, the rest of the stage is the next build */
export const BRIEF_2 = {
  stage: 'Build the revenue model',
  problem: 'Now we see what each market brings in, so we know where a dollar more is worth it.',
  deliverable: 'Revenue model',
  deliverableLine: 'What each market brings in, one row per market.',
  format: 'Google Sheet link',
  formatLine: 'Share it so anyone with the link can view.',
  voice: 'Now we see what each market brings in. One row per market, price times customers. Keep it simple.',
  voiceSec: 7,
  requirements: [
    { id: 'm1', text: 'One row per market' },
    { id: 'm2', text: 'Revenue is price times customers' },
  ],
  tools: [] as BriefTool[],
  training: [] as Training[],
};
export const OPEN_2 = ['Your clean file is in. Nice work.', "Next, show me what each market brings in. Send the link when it's done."];

export const RAW_FILE = { name: 'spotify_pricing_raw.csv', meta: '64 rows, 10 columns', url: 'static/media/spotify_pricing_raw.csv' };

/* her opening, after the brief */
export const GREET = "Hey, let's go. We're starting stage 1, and here's everything you need for it.";
export const OPEN = ["Here's the raw data.", "Can you send me back a cleaned version? You'll notice a ton of issues. Can you spot some?"];
export const SHOT_REPLY = "Got your screen. You're on the right track, keep going.";

/* you typed something in normal mode: short, a nudge, never the answer */
export const REPLY: { re: RegExp; say: string }[] = [
  { re: /where|start|begin|first/i, say: 'Open it in Sheets and just look at it. What jumps out?' },
  { re: /dup|twice|double|same/i, say: 'Yep. How would you spot them fast?' },
  { re: /currenc|\$|€|price/i, say: 'Good catch. Can you tell what each price is in?' },
  { re: /name|blank|empty|missing/i, say: "Keep those rows. They're still paying customers." },
  { re: /claude|ai|prompt/i, say: 'Sure, use it. Just check what it changes.' },
  { re: /done|finished|ready/i, say: 'Nice. Hit Submit in the brief.' },
];
export const REPLY_ELSE = 'Got it. Keep going, hit Submit when it looks clean.';

/* I'm stuck: she leads, one move at a time, until you say done */
/* I'm stuck: she walks you through it one step at a time. Each step: the move (option 1), the question most people
   have there (option 2, she answers and waits), or anything you type */
export const STUCK: { say: string; chip: string; alt: string; help: string }[] = [
  { say: "Okay, let's do it together. Open the CSV in Google Sheets.", chip: 'Opened it', alt: "Where's the file?", help: "It's the CSV right above. Download it, then in Sheets go File, Import." },
  { say: 'Sort the sheet by email, A to Z.', chip: 'Sorted', alt: 'How do I sort?', help: 'Click the email column letter, then Data, Sort sheet, A to Z.' },
  { say: 'See two rows next to each other with the same email? Those are doubles. Delete the older one.', chip: 'Done', alt: 'Which one is older?', help: 'Check the signup date column. The earlier date goes.' },
  { say: 'Now filter the currency column for blanks. Fill each one from the price symbol.', chip: 'Filled them', alt: "Where's the symbol?", help: 'Look at the price cell. A $ means USD, a £ means GBP.' },
  { say: 'Send me a screenshot of the sheet.', chip: 'Sent a screenshot', alt: 'How do I send one?', help: 'Hit the camera next to the plus in the box below.' },
  { say: 'Looks right. Hit Submit up top.', chip: 'Got it', alt: "What if it's still wrong?", help: "Then I'll tell you exactly what. That's what the review is for." },
];

/* while you are stuck the clock runs this many times faster, so the guided way costs XP */
export const BURN = 3;

export const REVIEW_STEPS = ['Opened your sheet', 'Read 64 rows', 'Checked the four requirements'];

export const FEEDBACK: { head: string; items: FixItem[] } = {
  head: 'Close. Two things.',
  items: [
    { id: 'f1', text: 'Remove the 6 customers still listed twice', why: 'Doubles count their money twice.' },
    { id: 'f2', text: 'Add the currency on 9 rows', why: "A price with no currency can't be compared." },
  ],
};

export const APPROVED = "That's what I needed. Clean file.";

/* the stage check-in: why, how, then two specific ones */
export const POU: { q: string; ack: string }[] = [
  { q: 'Why did we clean the data first?', ack: 'Exactly. Bad rows, bad answer.' },
  { q: 'How did you find the doubles?', ack: "Good. That's the habit." },
  { q: 'Row 18 had no currency. What did you do with it?', ack: 'Right call.' },
  { q: 'Why keep the rows with no name?', ack: "Yes. They still pay. That's the point." },
];

/* the XP for time, counted up, never a countdown */
export const TIERS = [
  { upTo: 30, label: 'Under 30 min', xp: 500 },
  { upTo: 60, label: '30 to 60 min', xp: 250 },
  { upTo: 90, label: '60 to 90 min', xp: 100 },
  { upTo: Infinity, label: 'Over 90 min', xp: 0 },
];
export const tierAt = (min: number) => TIERS.findIndex((t) => min < t.upTo);

/* b14: the scenario's own title, the one on the world map card */
export const SCENARIO = { title: 'One More Dollar', line: 'Find where Spotify can raise prices next' };

/* b14 ask mode (founder call, 3 Nov): the manager drives with asks. Each one fills only when you get it right in the chat.
   Asks sit under the stage on the left. Normal mode shows only the requirements. */
export interface Issue {
  id: string;
  label: string;
  re: RegExp;
}
export const ISSUES: Issue[] = [
  { id: 'dup', label: 'Customers listed twice', re: /dup|twice|double|repeat|same (customer|email|row)/i },
  { id: 'cur', label: 'Prices with no currency', re: /currenc|no (\$|symbol)|usd|eur|gbp/i },
  { id: 'neg', label: 'Negative prices', re: /negative|minus|below zero|-\d/i },
  { id: 'test', label: 'Test accounts mixed in', re: /test|fake|dummy|internal|qa/i },
  { id: 'date', label: 'Dates written three ways', re: /date|format|dd|mm|yyyy/i },
  { id: 'name', label: 'Rows with no name', re: /name|blank|empty|missing/i },
  { id: 'city', label: 'Cities spelled two ways', re: /city|cities|spell|typo|mumbai|bombay/i },
  { id: 'plan', label: 'Plan names that do not match', re: /plan|tier|premium|family|student/i },
  { id: 'zero', label: 'Prices of zero', re: /zero|\b0\b|free/i },
  { id: 'space', label: 'Extra spaces in emails', re: /space|whitespace|trim|padding/i },
];
export const ISSUE_ENOUGH = 5;
/* b27 (his note: "when it's an Ask environment, I want the manager to become more friendly, like how I showed in the
   link"): her opening from zero-stage-five b23, word for word, with Claude inside her line and the file in its place */
export const ASK_OPEN: Line[] = [
  "Before we price anything, the customer file has to be right. That's this stage.",
  { text: "Here's what I'm handing you. The raw export, and Claude to do the heavy lifting.", tool: 'claude' },
  { file: true },
  'You hand me back one clean sheet. Same customers, nothing broken.',
  "Okay, so the first thing is I have a data file, but there's a bunch of issues with it. I need you to help me figure out those issues.",
  'Can you open it and tell me what issues you found?',
];
export const ASK_HIT = ['Yep, that one.', "Good eye. What else?", "That's a real one. Keep going.", 'Nice. Another?', 'Right.'];
export const ASK_MISS = [
  'Hmm, not that one. Have a look at the price column.',
  'Close, but no. Check how the dates are written.',
  'Not quite. Anything odd about who the customers are?',
];
export const ASK_ENOUGH = ["That's enough to work with. Claude can catch the rest.", 'What prompt would you send Claude to fix these?'];
export const ASK_PROMPT_SHORT = 'Say more. Tell Claude each issue and what clean looks like.';
export const ASK_PROMPT_OK = ['That works.', 'Run it in Claude with the raw file, then send me the clean sheet.'];
export const ASK_GROUPS = [
  { id: 'issues', title: 'Issues to identify' },
  { id: 'prompt', title: 'Prompt to Claude' },
  { id: 'submit', title: 'Submission' },
] as const;
