/* What she says to I'm stuck when the step itself has nothing better. Short, from where you are, never a new fact. */
import type { StepDef } from './defs';

export const STUCK_LINE: Record<StepDef['kind'] | 'feedback' | 'review' | 'approved' | 'pou' | 'done', string> = {
  find: "Open the file and go row by row. Anything that looks off counts. Tell me one thing you see.",
  prompt: 'Start with the list. Tell Claude what the file is, then every fix you want, one by one.',
  ask: "Tell me where you got to and I'll point you at the next click.",
  submit: 'Paste the prompt into Claude, attach the raw file, and send it. Then bring the file back here.',
  feedback: "Pick the first one you haven't ticked. Ask me about it and I'll tell you how I'd fix it.",
  review: "I'm still reading it. Give me a sec.",
  approved: "Hit Start POU. I'll ask you a few short questions.",
  pou: 'Say it badly, in your own words. That counts.',
  done: "You're done with this one. Hit Back to the project when you're ready.",
};

/* I'm stuck, from your side. The first press on a step asks which kind of stuck it is, three keys:
   lost on where to start, unsure what you have is right, or a word you don't know.
   Start gets the next rung of the step and the exact file or row it sits in. Right gets one question back.
   Word gets the words of this step as keys, then one line each: an analogy and a real example. She never does it for you.
   A second press on the same thing skips the keys and climbs the ladder, so twice stuck is the card you play. */
export const STUCK_ASK = "Okay. What's got you?";
export const STUCK_KEYS = [
  { id: 'stuck:start', label: "Where do I start" },
  { id: 'stuck:right', label: 'Is this right' },
  { id: 'stuck:word', label: "A word I don't know" },
] as const;
export const STUCK_WORD_ASK = 'Which one?';

/* one question back, so you say it and she checks it */
export const STUCK_RIGHT: Record<StepDef['kind'] | 'card', string> = {
  find: 'Say the issue you think you see, in one line. I\'ll tell you if it holds.',
  prompt: "Paste what you have so far. I'll tell you what's missing.",
  ask: "Tell me where you got to. I'll tell you if it's right.",
  submit: "Send it over. If it's off, I'll show you exactly where.",
  card: "Make the move you think is right. If it's off, it plays out and you'll see why.",
};

export interface Word {
  label: string;
  line: string;
}

/* every line is an analogy and a named, real example. No new facts about the task */
export const WORDS: Record<string, Word> = {
  csv: { label: 'CSV', line: "A CSV is a spreadsheet saved as plain text, one row per line, commas between cells. Open it in Google Sheets and it's just a table." },
  duplicate: { label: 'Duplicate', line: 'A duplicate is the same customer twice, like the same Netflix charge landing two times. You count them once.' },
  outlier: { label: 'Outlier', line: "An outlier is a number that doesn't fit, like a $1,199 coffee on a receipt. Usually a typo, so check it before you trust it." },
  prompt: { label: 'Prompt', line: "A prompt is your brief. Claude wasn't in this chat, so it only knows what you write. Say what the file is, what to fix, and what you want back." },
  market: { label: 'Market', line: 'A market is one country, priced on its own. Spotify charges India and the UK very different prices for the same plan.' },
  rate: { label: 'Exchange rate', line: 'An exchange rate turns one currency into another, like a travel card turning rupees into dollars. Here everything goes into US dollars.' },
  arpu: { label: 'Revenue per user', line: "Revenue per user is a market's money divided by its customers. It's how Netflix compares a big cheap market with a small pricey one." },
  repo: { label: 'Repo', line: 'A repo is the project folder on GitHub that remembers every change, like a Google Drive folder with its full history.' },
  commit: { label: 'Commit and push', line: 'A commit saves a snapshot on your machine. A push sends it up to GitHub. Save, then send.' },
  key: { label: 'API key', line: 'An API key is a password for software. Your app uses it to reach OpenRouter, and whoever holds it runs up your bill.' },
  openrouter: { label: 'OpenRouter', line: 'OpenRouter is one key for many AI models, like one card that works at every shop.' },
  langsmith: { label: 'LangSmith', line: 'LangSmith records every step your app takes with the model, like a flight recorder, so you can see where it went wrong.' },
  env: { label: '.env file', line: 'A .env file keeps your keys on your machine only. It is the safe, and .gitignore is the rule that the safe never leaves the house.' },
};

/* the words each step uses, and the file or tool the first rung points at (a key in the stage's resources) */
export const STEP_HELP: Record<string, { words: string[]; point?: string }> = {
  issues: { words: ['csv', 'duplicate', 'outlier'], point: 'raw' },
  prompt: { words: ['prompt', 'csv'], point: 'claude' },
  run: { words: ['csv', 'prompt'], point: 'claude' },
  rounds: { words: ['market', 'rate', 'arpu'], point: 'rates' },
  repo: { words: ['repo', 'commit'], point: 'github' },
  or: { words: ['key', 'openrouter'], point: 'openrouter' },
  ls: { words: ['key', 'langsmith'], point: 'langsmith' },
  envp: { words: ['env', 'key'], point: 'claude code' },
  htmlp: { words: ['prompt'], point: 'claude code' },
  send: { words: ['commit', 'repo'], point: 'github' },
};

/* stage 2: the first rung on each card is a question back, never the move */
export const CARD_START: Record<string, string> = {
  market: "Look at the status column first. Who should count toward this month's money?",
  usd: 'Each total is in its own money. What has to happen before you can compare them?',
  per_user: 'A big market wins on totals. What would make a small one fair to compare?',
};
