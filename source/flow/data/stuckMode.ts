/* Stuck mode, b13 (his words, 2 Nov: "When stock mode is on, the manager becomes more lenient ... It gives you the right
   step: you need to do this, you need to do this, that. Once you're done, send me this, and then do those MCQs").
   A switch, not a press. Per step: the exact moves as a short numbered list. The find step turns into one question at a
   time with three picks; a wrong pick gets what would happen, never a red X. Spotify carries the picks, Amazon the moves. */
import { RAW } from './raw';

export interface McqPick {
  label: string;
  ok?: true;
  back?: string; /* what she says to this pick when it is wrong */
}

export interface Mcq {
  q: string;
  picks: McqPick[];
}

export const GUIDE_HEAD = 'Okay, step by step.';
export const GUIDE_OFF = "Okay, over to you. Nothing you did is lost.";

export const guideText = (steps: string[]) => [GUIDE_HEAD, ...steps.map((s, i) => `${i + 1}. ${s}`)].join('\n');

/* by step id, the same keys STEP_HELP uses */
export const GUIDE_STEPS: Record<string, string[]> = {
  issues: [
    `Open ${RAW.name} in Sheets.`,
    'Go across the columns, left to right.',
    "I'll ask one thing at a time. Pick 1, 2 or 3, or say it your way.",
    'Once all ten are in, we write the prompt.',
  ],
  prompt: [
    'Say what the file is: a raw Spotify customer export.',
    'List every fix, one per line. All ten.',
    'Ask Claude for one clean .csv back.',
    "Once you're done, send me the prompt. Or use mine below.",
  ],
  run: [
    `Open Claude and attach ${RAW.name}.`,
    'Paste the prompt from your slot and send it.',
    'Download the clean .csv it gives you.',
    'Hit Submit clean dataset and drop that file in.',
  ],
  rounds: [
    'Open the card in the chat.',
    'Read the question at the top of it.',
    "Make your pick. I'll show you how it plays out.",
    'Three cards, then the revenue model is done.',
  ],
  repo: [
    'Go to github.com and hit New repository.',
    'Give it a name and set it to Public.',
    'Hit Create repository and copy the link.',
    'Paste the link here.',
  ],
  or: [
    'Open openrouter.ai/keys.',
    'Hit Create key and copy it.',
    'Keep it somewhere safe. Never paste it here.',
    'Tell me when you have it.',
  ],
  ls: [
    'Open smith.langchain.com/settings.',
    'Hit Create API key and copy it.',
    'Keep it to yourself. Never paste it here.',
    'Tell me when you have it.',
  ],
  envp: [
    'Ask Claude Code for a .env with OPENROUTER_API_KEY and LANGCHAIN_API_KEY.',
    'Ask for a .env.example with the same names and fake values.',
    'Ask for a .gitignore, and tell it never to print your keys.',
    "Once you're done, send me the prompt. Or use mine below.",
  ],
  htmlp: [
    'Ask for one file, index.html.',
    'Say what goes on it: a box to paste the announcement and a button to check it.',
    'Say what comes back: each claim marked verified, unverified or unsupported, with its source.',
    "Once you're done, send me the prompt. Or use mine below.",
  ],
  send: [
    'Paste each prompt into Claude Code and run it.',
    'Tell it to commit and push.',
    'Refresh the repo page and check index.html is there.',
    'Hit Submit GitHub repository and paste the link.',
  ],
};

/* the parts of a stage that are not a step */
export const GUIDE_PHASE: Record<string, string[]> = {
  feedback: [
    'Open the first thing to fix.',
    'Fix it in your file.',
    'Tick it, then do the next one.',
    'When they are all ticked, hit Fix and resubmit.',
  ],
  approved: [
    'Hit Start POU.',
    "I'll ask what you made, why it matters and how you did it.",
    'Answer in your own words. Short is fine.',
  ],
};

/* the ten issues as picks, in the find step's order. Rows are sheet rows, the header is row 1 */
export const MCQ: Record<string, Mcq> = {
  region: {
    q: "We want to compare prices across markets. Look along the column names. What's missing?",
    picks: [
      { label: 'A price column', back: "That one's there, monthly_price. Right now every customer sits in one big pile. What would split them by market?" },
      { label: 'A region column', ok: true },
      { label: 'A customer id', back: "That's the first column, customer_id. It tells us who, not where. What would tell us which market they're in?" },
    ],
  },
  currency: {
    q: "Go down the currency column to row 5, Leo Cole in Mexico City. What's in that cell?",
    picks: [
      { label: 'USD', back: 'The rows above say USD, sure. Now look at Leo\'s row. Is his 139 in pesos or dollars?' },
      { label: 'MXN', back: "That's what it should say, he's in Mexico City. Look again at what it actually says." },
      { label: "Nothing, it's blank", ok: true },
    ],
  },
  names: {
    q: 'Look at customer_name on row 7. Who is that?',
    picks: [
      { label: 'Nina Costa', back: "Smart, that's from the email. But look at the name cell itself. If we filter by name, does she show up?" },
      { label: "We can't tell, it's blank", ok: true },
      { label: 'A test account', back: "That's a real email, paying 23.9 in São Paulo. Look at the name cell instead." },
    ],
  },
  dups: {
    q: 'Look at rows 13 and 40. Hannah Nair, SP-10434 on both. What is going on?',
    picks: [
      { label: 'Two people, same name', back: 'Check the id and the email on both rows. Are those two people?' },
      { label: 'Same customer, twice', ok: true },
      { label: 'She changed her plan', back: 'Both rows say Premium Individual at 119. Nothing changed between them. So what is the second row?' },
    ],
  },
  dates: {
    q: 'Compare signup_date on rows 2, 4 and 5. Could you sort by it?',
    picks: [
      { label: "Yes, they're all dates", back: "They're dates to you. To a sheet, 06/19/23 and 15 Dec 2023 are text in different shapes. Sort it and they scatter." },
      { label: 'No, three formats', ok: true },
      { label: 'Some are missing', back: 'Every row has one, actually. Look at how each one is written.' },
    ],
  },
  price_text: {
    q: 'Row 4 says $19.99 in monthly_price. What would SUM do with it?',
    picks: [
      { label: 'Add 19.99', back: "That's what you'd hope. Look at it the way a sheet does. With the $ stuck on, is it a number or a word?" },
      { label: 'Show an error', back: "No error, that's the scary part. It quietly leaves something out and your total still looks fine. What would it leave out?" },
      { label: "Skip it, it's text", ok: true },
    ],
  },
  plan: {
    q: 'Rows 3 and 11 say PREM_IND and premium indiv. What are those?',
    picks: [
      { label: 'One plan, many spellings', ok: true },
      { label: 'Two different plans', back: 'Picture the pivot table. PREM_IND, premium indiv and Premium Individual on three rows. How many plans is that really?' },
      { label: 'Typos to delete', back: 'Delete them and we lose paying customers. Those are real plans, just written their own way.' },
    ],
  },
  bad_price: {
    q: 'Look at monthly_price on row 2. Can someone pay that?',
    picks: [
      { label: "Yes, it's a refund", back: 'Could be, in a payments file. In a pricing file it drags the US average down for everyone. Can a plan cost minus 11.99?' },
      { label: "No, it's negative", ok: true },
      { label: "Yes, it's a discount", back: 'A discount still leaves something to pay. Look at the sign in front of it.' },
    ],
  },
  outlier: {
    q: 'Rows 17 and 18 say 1199 for Premium Individual in the US. Everyone else pays 11.99. What happened?',
    picks: [
      { label: 'They pay for a year', back: 'Nice thought, but a year at 11.99 is about 144. 1199 is a hundred times more. What turns 11.99 into 1199?' },
      { label: "It's a business plan", back: 'The plan column says Premium Individual, same as everyone. Look at the digits next to 11.99.' },
      { label: 'The decimal slipped', ok: true },
    ],
  },
  test: {
    q: 'Look at the email on row 19. Who is that?',
    picks: [
      { label: 'A new customer', back: 'Look at the end of the email, spotify-internal. Count it and a fake signup sits in the New York numbers.' },
      { label: 'Our own test account', ok: true },
      { label: 'A free trial', back: 'It does say 0.00. But look at the name and the email. Would a real customer be called QA Test?' },
    ],
  },
};

/* ---------- b14 (his words: "in stuck mode, there should always be a pill option ... Option 1, option 2, option 3, and
   option 4 ... is nothing but the chat thing"). Every step in stuck mode ends in keys, never an open question, and the chat
   box is always the next number. A find step's keys are its picks above, a prompt step's first key is her ready prompt.
   The rest are moves she makes with you: go (you have it, carry on), hint (the next rung of this step), show (the line and
   the exact tool under it), word (one word of the step, an analogy and a real example). By step id, then phase */
export type GuideAct = 'go' | 'hint' | 'show' | 'word';

export interface GuidePick {
  label: string;
  act: GuideAct;
  word?: string; /* a key of WORDS in stuck.ts */
}

export const GUIDE_PICKS: Record<string, GuidePick[]> = {
  prompt: [
    { label: 'Give me a hint', act: 'hint' },
    { label: "What's a prompt?", act: 'word', word: 'prompt' },
  ],
  run: [
    { label: 'I have the clean file', act: 'go' },
    { label: 'Where do I run it?', act: 'show' },
    { label: 'It looks off', act: 'hint' },
  ],
  repo: [
    { label: 'I have the link', act: 'go' },
    { label: 'Show me where', act: 'show' },
    { label: "What's a repo?", act: 'word', word: 'repo' },
  ],
  or: [
    { label: 'I have the key', act: 'go' },
    { label: 'Show me where', act: 'show' },
    { label: "What's an API key?", act: 'word', word: 'key' },
  ],
  ls: [
    { label: 'I have the key', act: 'go' },
    { label: 'Show me where', act: 'show' },
    { label: "What's LangSmith?", act: 'word', word: 'langsmith' },
  ],
  envp: [
    { label: 'Give me a hint', act: 'hint' },
    { label: "What's a .env file?", act: 'word', word: 'env' },
  ],
  htmlp: [
    { label: 'Give me a hint', act: 'hint' },
    { label: "What's a prompt?", act: 'word', word: 'prompt' },
  ],
  send: [
    { label: "It's pushed", act: 'go' },
    { label: 'How do I push?', act: 'show' },
    { label: "What's a commit?", act: 'word', word: 'commit' },
  ],
  feedback: [
    { label: 'How do I fix the first one?', act: 'hint' },
    { label: 'I fixed them all', act: 'go' },
  ],
  approved: [
    { label: "I'm ready", act: 'go' },
    { label: 'What will you ask?', act: 'hint' },
  ],
};

/* what she says to go, by the kind of step it is. The link one hands you the chat, the next number */
export const GO_LINE = {
  submit: "Love that. I opened the hand in for you. Drop the file in and I'll read it straight away.",
  link: 'Nice. Paste the link right here and I\'ll check it.',
  feedback: 'Nice work. Tick each one you fixed, then hit Fix and resubmit.',
  approved: "Love it. Hit Start POU and I'll ask you three short things.",
};

/* she answers every pick and every line you type, right or wrong, warm and specific, before the next step (his words: "the
   best part of a manager is that he should always acknowledge, even if it's good or bad"). The specific part is the back
   line of the pick or the issue's own hint; these only open it, and never in front of a line that already opens warm */
export const MCQ_NEAR = ['Fair pick.', 'Good instinct, not quite.', "I see why you'd go there.", 'Close, and worth a look.'];
export const MCQ_WARM = /^(smart|nice|good|fair|could be|that's what you'd hope)\b/i;
export const MCQ_TYPED = ['Thanks for putting it your way. Not this one yet.', "I like that you said it in your own words. It isn't quite it."];
export const MCQ_IDK = ["No problem, that's what the picks are for.", "That's fine. Let's narrow it down."];

/* the line across the chat when the switch flips, like WhatsApp's date line (his words: "a divider and center text, and
   then again a divider") */
export const STUCK_ON = 'Stuck mode on';
export const STUCK_OFF = 'Stuck mode off';
