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
  format: 'Google Sheet link',
  voice:
    "This stage is just about trust. If the data's messy, every number after it lies. Clean it, keep every real customer, send me the link.",
  voiceSec: 9,
  requirements: [
    { id: 'dups', text: 'No customer shows up twice' },
    { id: 'cur', text: 'Every price has a currency' },
    { id: 'keep', text: 'No real customer is lost' },
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
  ] as Training[],
};

/* stage 2, so the turn lands somewhere real. Same brief, her opener, the rest of the stage is the next build */
export const BRIEF_2 = {
  stage: 'Build the revenue model',
  deliverable: 'Revenue model',
  format: 'Google Sheet link',
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

export const RAW_FILE = { name: 'spotify_customers_raw.csv', meta: '412 rows, 9 columns', url: 'static/media/spotify_customers_raw.csv' };

/* her opening, after the brief */
export const OPEN = ["Here's the raw export.", "It's got issues. Clean it up and send me the link."];

/* you typed something in normal mode: short, a nudge, never the answer */
export const REPLY: { re: RegExp; say: string }[] = [
  { re: /where|start|begin|first/i, say: 'Open it in Sheets and just look at it. What jumps out?' },
  { re: /dup|twice|double|same/i, say: 'Yep. How would you spot them fast?' },
  { re: /currenc|\$|€|price/i, say: 'Good catch. Can you tell what each price is in?' },
  { re: /name|blank|empty|missing/i, say: "Keep those rows. They're still paying customers." },
  { re: /claude|ai|prompt/i, say: 'Sure, use it. Just check what it changes.' },
  { re: /done|finished|ready/i, say: 'Nice. Paste the link in the brief and hit Submit.' },
];
export const REPLY_ELSE = 'Got it. Keep going, send me the link when it looks clean.';

/* I'm stuck: she leads, one move at a time, until you say done */
export const STUCK: { say: string; chip: string }[] = [
  { say: "Okay, let's do it together. Open the CSV in Google Sheets.", chip: 'Opened it' },
  { say: 'Sort the sheet by email, A to Z.', chip: 'Sorted' },
  { say: 'See two rows next to each other with the same email? Those are doubles. Delete the older one.', chip: 'Done' },
  { say: 'Now filter the currency column for blanks. Fill each one from the price symbol.', chip: 'Filled them' },
  { say: 'Send me a screenshot of the sheet.', chip: 'Sent a screenshot' },
  { say: "Looks right. Share it with a link and paste it in the brief.", chip: 'Got it' },
];

export const REVIEW_STEPS = ['Opened your sheet', 'Read 412 rows', 'Checked the three requirements'];

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
  { upTo: 30, label: 'Under 30 min', xp: 100 },
  { upTo: 60, label: '30 to 60 min', xp: 75 },
  { upTo: 120, label: '1 to 2 hours', xp: 50 },
  { upTo: Infinity, label: 'Over 2 hours', xp: 0 },
];
export const tierAt = (min: number) => TIERS.findIndex((t) => min < t.upTo);
