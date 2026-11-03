/* What the fake Claude hands back. The same model the stage already uses for Claude (data/spotify fxFrom, data/csv clean):
   what comes back depends only on what you told it, so a thin prompt gets a thin file. Nothing is sent anywhere. */
import { clock } from '../../clock';
import { clean, type CleanFx } from '../../data/csv';
import { RAW } from '../../data/raw';
import { fxFrom } from '../../data/spotify';
import { useFlow } from '../../engine/store';
import { addLoose, useDesk, type ClaudeMsg, type LooseFile } from './deskStore';

const THINK_MS = 1600;
const CLEAN_NAME = 'spotify_pricing_clean.csv';

/* one line per thing it did, in the order the file is cleaned, true to what clean() does */
const DID: Array<[keyof CleanFx, string]> = [
  ['tests', 'Removed the internal test accounts.'],
  ['dedupe', 'Removed duplicate customer_id rows and kept the first.'],
  ['dropNames', 'Removed rows with a blank customer_name.'],
  ['keepNames', 'Set blank customer_name values to Unknown.'],
  ['plan', 'Matched every plan to one of the four plan names.'],
  ['dates', 'Put every signup_date in YYYY-MM-DD.'],
  ['price', 'Made monthly_price a plain number and fixed negatives, zeros and lost decimals.'],
  ['currency', 'Filled blank currency from billing_city.'],
  ['mismatch', 'Set each currency to the one its billing_city uses.'],
  ['region', 'Added a region column from billing_city.'],
];

let seq = 0;
const id = (p: string) => `${p}-${Date.now().toString(36)}-${(seq += 1)}`;

export const changesFor = (fx: CleanFx): string[] => DID.filter(([k]) => fx[k]).map(([, line]) => line);

/* the reply to one message: the cleaned file when the prompt asks for anything Claude can do to this export */
export const replyTo = (prompt: string): ClaudeMsg => {
  const onSpotify = useFlow.getState().project?.id === 'spotify';
  const fx = onSpotify ? fxFrom(prompt) : {};
  const lines = changesFor(fx);
  if (!lines.length) {
    return { id: id('c'), from: 'claude', text: "Happy to help. Attach the file and tell me what you'd like done with it." };
  }
  const text = clean(RAW, fx);
  const rows = text.trim().split('\n').length - 1;
  const file: LooseFile = { id: id('clean'), name: CLEAN_NAME, text };
  return { id: id('c'), from: 'claude', text: `Here's the cleaned file, ${rows} rows. What I changed:`, list: lines, file };
};

export const askClaude = (text: string) => {
  const said = text.trim();
  if (!said || useDesk.getState().thinking) return;
  const mine: ClaudeMsg = { id: id('m'), from: 'me', text: said };
  useDesk.setState((d) => ({ claude: [...d.claude, mine], thinking: true }));
  clock.setTimeout(() => {
    const back = replyTo(said);
    if (back.file) addLoose(back.file);
    useDesk.setState((d) => ({ claude: [...d.claude, back], thinking: false }));
  }, THINK_MS);
};

/* the file lands in Downloads, the way a real one would, ready to hand in from the PiP */
export const downloadLoose = (f: LooseFile) => {
  try {
    const url = URL.createObjectURL(new Blob([f.text], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch {
    /* the browser kept it, the card still opens it in Sheets */
  }
};
