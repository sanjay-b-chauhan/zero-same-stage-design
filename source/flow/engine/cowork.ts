/* Talking with your screen, without any AI (AI mode off, which is the only mode this prototype has).
   You hold, you talk, you let go. She took one frame, and she answers the way your words call for:
     voice  her answer in the chat, spoken aloud
     point  her cursor travels to the exact place on your screen and leaves a short note there
     hand   a card in the chat: a film to watch, or a file or tool to open
   Talk is answered as talk. It only counts as an answer to her open question when it clearly is one.
   Every line comes from the stage's own content (data/spotify.ts, data/amazon.ts, data/stuck.ts). Pure: no DOM, no store. */
import type { AskStepDef, FindStepDef, Issue, PromptStepDef, StepDef } from '../data/defs';
import { FILMS } from '../data/films';
import { RAW } from '../data/raw';
import { STUCK_LINE, WORDS } from '../data/stuck';
import type { Option, Phase, PointAt, ProjectId, TalkScene } from './shapes';

export type HelpPath = 'voice' | 'point' | 'hand';
export const PATHS: HelpPath[] = ['point', 'voice', 'hand'];

export interface PointSpec {
  to: PointAt;
  note: string;
}

export interface TalkCtx {
  pid: ProjectId;
  phase: Phase;
  step?: StepDef;
  aim?: Issue;
  found: string[];
  left: number;
  promptText: string;
  feedback: Array<{ one: string; why: string; how: string; checked: boolean }>;
  open?: { msgId: string; options: Option[] };
  yn: boolean;
  scene: TalkScene;
  hasRaw: boolean;
  firstName: string;
}

export type TalkPlan =
  | { kind: 'answer' }
  | { kind: 'choose'; msgId: string; optionId: string }
  | { kind: 'help'; path: HelpPath; say: string; point?: PointSpec; film?: string; file?: string; tool?: string };

/* ---------- what the sheet's columns are, in her words: an analogy or a real example, never a new fact ---------- */

const COLS: Record<string, string> = {
  customer_id: "customer_id is one person's account number. Every person gets exactly one, so the same id twice is one customer counted twice.",
  customer_name: "customer_name is who's paying. A blank one is still a real paying customer, so don't drop them.",
  email: 'email is how we reach them. It also gives away anyone who is not a real customer, like our own test accounts.',
  plan: "plan is the subscription they're on. Spotify sells four here, so every spelling should land on one of those four.",
  monthly_price: "monthly_price is what they pay each month, in their own money. It has to be a plain number, or a formula skips it.",
  currency: "currency says what that price is in. 11.99 means nothing until you know if it's dollars or pounds.",
  billing_city: "billing_city is where they're billed. It's the only clue to where each customer is.",
  signup_date: "signup_date is when they joined. It needs one format, or you can't sort by it.",
  status: 'status says if they still pay. Churned means they left, like a gym member who cancelled.',
  months_active: "months_active is how long they've been paying. Think of it as their streak.",
};

/* the column each finding lives in, and the rows that show it (RAW.map, the answer key) */
const M = RAW.map;
const WHERE: Record<string, { col: string; rows: number[]; note: string }> = {
  region: { col: 'billing_city', rows: [], note: 'This is the only place the file says where. Is that enough to compare markets?' },
  currency: { col: 'currency', rows: [M.currency[0]], note: `Look at row ${M.currency[0]} here.` },
  names: { col: 'customer_name', rows: [M.names[0]], note: `Check customer_name on row ${M.names[0]}.` },
  dups: { col: 'customer_id', rows: M.dups[0].rows, note: `Check customer_id here. Then row ${M.dups[0].rows[1]}.` },
  dates: { col: 'signup_date', rows: [M.dates[0], M.dates[3]], note: `Compare this date with row ${M.dates[3]}.` },
  price_text: { col: 'monthly_price', rows: [M.price_text[0]], note: 'Would a formula read this one?' },
  plan: { col: 'plan', rows: [M.plan_names[0], M.plan_names[1]], note: `Same plan? Compare it with row ${M.plan_names[1]}.` },
  bad_price: { col: 'monthly_price', rows: [M.bad_price[0]], note: 'Could anyone pay this?' },
  outlier: { col: 'monthly_price', rows: [M.outlier[0], M.outlier[1]], note: 'Compare this with the other New York rows.' },
  test: { col: 'email', rows: [M.test[0]], note: 'Whose email is this?' },
};

/* ---------- what you said: the intent, by plain patterns ---------- */

const Q = /\?\s*$|^(how|what|why|where|when|which|who|can|could|should|would|is|are|do|does|did|will|am|any|show|tell|explain|help)\b/i;
const I = {
  better: /\b(better|improve|faster|quicker|tighten|stronger|smarter|cleaner|level up)\b/i,
  check: /\b(check (my|this|it)|did i|am i (doing|on track|right)|is (this|that|it|mine) (right|ok|okay|good|correct)|look at (this|my)|how am i doing|how'?s (this|it) look)/i,
  next: /\b(what'?s next|what now|what next|what'?s left|how many (left|more|to go)|where am i|what do i do now|what comes next)\b/i,
  stuck: /\b(stuck|lost|no idea|don'?t know|do not know|confused|can'?t find|cannot find|where should i (look|start)|where do i look|i'?m blank|no clue|show me where)\b/i,
  file: /\b(where'?s|where is|send|resend|open|find|need)\b.*\b(file|data|sheet|csv|raw)\b|\b(file|csv) again\b/i,
  film: /\b(video|film|watch|show me how|explainer|walk ?through)\b/i,
  where: /\bwhere (do|should|can) i (paste|put|write|type|send|drop|make|get|create)\b|\bwhere does (it|this|the prompt) go\b/i,
  how: /\b(how (do|should|would|can) (i|we)|how to|what do i (write|say|do)|where do i start|what should (it|the prompt|i) say|what goes in)\b/i,
  what: /\b(what (is|are|does|do|'?s)|meaning of|mean)\b/i,
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/* the column or word you asked about, if you named one */
const colIn = (t: string): string | undefined => {
  const s = t.toLowerCase().replace(/\s+/g, '_');
  return Object.keys(COLS).find((c) => s.includes(c) || s.includes(c.replace(/_/g, '')));
};
const wordIn = (t: string): string | undefined => {
  const s = t.toLowerCase();
  const has = (w: string) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(s);
  return Object.keys(WORDS).find((k) => has(k) || has(WORDS[k].label.toLowerCase()));
};

/* ---------- is it clearly an answer to what she asked? ---------- */

/* her open question's option, said out loud: the whole label, or a reply that is plainly one of them */
const optionSaid = (t: string, options: Option[]): Option | undefined => {
  const said = norm(t);
  if (!said) return undefined;
  const exact = options.find((o) => norm(o.label) === said);
  if (exact) return exact;
  if (Q.test(t) || said.split(' ').length > 7) return undefined;
  const hits = options.filter((o) => said.includes(norm(o.label)));
  return hits.length === 1 ? hits[0] : undefined;
};

const isAnswer = (t: string, c: TalkCtx): boolean => {
  const s = c.step;
  if (c.yn) return /^(y|yes|yep|yeah|sure|i do|n|no|nope|not really|never)\b/i.test(t.trim());
  if (c.phase === 'pou') return true;
  if (Q.test(t.trim())) return false;
  if (s?.kind === 'find') return s.items.some((i) => !c.found.includes(i.id) && i.find(t));
  if (s?.kind === 'prompt') return t.length > 80 && s.rubric.filter((r) => r.test.test(t)).length >= 2;
  if (s?.kind === 'ask') return /https?:\/\/|github\.com|\b(got it|have it|done|created|i have|made it|got the key)\b/i.test(t);
  return false;
};

/* ---------- the replies ---------- */

const sheetPoint = (c: TalkCtx, col: string, rows: number[], note: string): PointSpec | undefined => {
  if (!c.scene.desk) return undefined;
  if (!c.scene.sheet) return { to: { at: 'dock', app: 'sheets' }, note: 'Open the file in Sheets first.' };
  return { to: rows.length ? { at: 'cells', col, rows } : { at: 'head', col }, note };
};

const claudePoint = (c: TalkCtx, note: string): PointSpec | undefined => {
  if (!c.scene.desk) return undefined;
  if (!c.scene.claude) return { to: { at: 'dock', app: 'claude' }, note: 'Open Claude from here.' };
  return { to: { at: 'claude-input' }, note };
};

const voice = (say: string, point?: PointSpec): TalkPlan => ({ kind: 'help', path: point ? 'point' : 'voice', say, point });

/* her cursor goes to Claude's box, or to Claude in the Dock while it is closed. Then her line starts where you have to start */
const viaClaude = (c: TalkCtx, say: string, note: string): TalkPlan => {
  const point = claudePoint(c, note);
  return voice(point?.to.at === 'dock' ? `Open Claude first. ${say}` : say, point);
};

/* the film that fits the step, if this stage has one */
const filmFor = (c: TalkCtx): string | undefined => {
  const s = c.step;
  if (s?.concept && FILMS[s.concept.no]) return s.concept.no;
  if ((s?.kind === 'prompt' || s?.kind === 'submit') && FILMS.prompt) return 'prompt';
  return undefined;
};

const progress = (c: TalkCtx): string => {
  const s = c.step;
  if (s?.kind === 'find') {
    const next = c.aim ? WHERE[c.aim.id] : undefined;
    const n = c.left;
    const lead = n === 1 ? 'Just one left.' : `${n} to go.`;
    return next ? `${lead} Next, look at the ${next.col} column.` : lead;
  }
  if (s?.kind === 'prompt') return 'All the issues are in. Now the prompt: tell Claude what the file is, every fix, and what you want back.';
  if (s?.kind === 'submit') return "Run your prompt in Claude, check what comes back, then drop the file in Submit.";
  if (s?.kind === 'ask') return s.doing ? `${s.doing}. That's the one thing right now.` : STUCK_LINE.ask;
  return STUCK_LINE[c.phase === 'work' ? 'find' : c.phase] ?? STUCK_LINE.done;
};

/* how much of the prompt is there, from the rubric itself */
const promptCheck = (s: PromptStepDef, text: string): string => {
  if (!text.trim()) return "There's no prompt yet. Start with what the file is, then list every fix.";
  const missing = s.rubric.filter((r) => !r.test.test(text));
  if (!missing.length) return "That covers everything. Say what you want back and it's ready.";
  return `You've covered ${s.rubric.length - missing.length} of ${s.rubric.length}. ${missing[0].miss}`;
};

const findCheck = (s: FindStepDef, c: TalkCtx): string => {
  const done = s.items.filter((i) => c.found.includes(i.id));
  if (!done.length) return "Nothing's in yet. Tell me one thing that looks off and I'll check it.";
  const names = done.slice(-2).map((i) => i.said ?? i.label.toLowerCase());
  const tail = c.left ? `${c.left} to go.` : "That's all ten.";
  return `${done.length} in, all real. Last ones were ${names.join(' and ')}. ${tail}`;
};

const better = (c: TalkCtx): string => {
  const s = c.step;
  if (s?.kind === 'find') return 'Name the row and the column with each one. "Rows 13 and 40 share an id" lands faster than "there are duplicates".';
  if (s?.kind === 'prompt') return 'Number every fix, one per line, and end with exactly what you want back: one clean .csv and a short list of what changed.';
  if (s?.kind === 'submit') return "Before you send it, open what Claude gave back and spot check three rows. That's how you catch what it missed.";
  if (s?.kind === 'ask') return 'Do it in the order the slots show. Each one sets up the next.';
  if (c.phase === 'feedback') return 'Take the fixes in the order I listed them. The first one changes the most.';
  if (c.phase === 'pou') return STUCK_LINE.pou;
  return "Say what you're trying to do in one line, and I'll tell you the fastest way there.";
};

/* the way in for each step, from the step's own words */
const howTo = (c: TalkCtx): TalkPlan => {
  const s = c.step;
  if (s?.kind === 'find') {
    const at = c.aim ? WHERE[c.aim.id] : undefined;
    return voice(
      'Go one column at a time, left to right. For each one ask: could I add this up, sort it, or compare it across markets?',
      at ? sheetPoint(c, at.col, [], 'Start with this column.') : undefined
    );
  }
  /* a how is answered in her voice. The film is there when you ask for it */
  if (s?.kind === 'prompt') {
    return voice("Three things. What the file is, every fix one by one, and what you want back. If a stranger could run it, it's ready.");
  }
  if (s?.kind === 'submit') {
    const help = (s as { runHelp?: string }).runHelp ?? STUCK_LINE.submit;
    return viaClaude(c, help, 'Paste your prompt here, attach the raw file, send.');
  }
  if (s?.kind === 'ask') return voice((s as AskStepDef).help ?? STUCK_LINE.ask);
  return voice(STUCK_LINE[c.phase === 'work' ? 'find' : c.phase] ?? STUCK_LINE.done);
};

/* you're stuck: she points at the next rung. Off the desktop she says it */
const unstick = (c: TalkCtx, named?: Issue): TalkPlan => {
  const s = c.step;
  const it = s?.kind === 'find' ? named ?? c.aim : undefined;
  if (s?.kind === 'find' && it) {
    const at = WHERE[it.id];
    const point = at ? sheetPoint(c, at.col, at.rows, at.note) : undefined;
    /* with her cursor on the spot, she only asks the question. Without it, the line has to carry the where */
    if (point) return { kind: 'help', path: 'point', say: it.ask[0], point };
    return c.hasRaw ? { kind: 'help', path: 'hand', say: it.ask[1], file: 'raw' } : voice(it.ask[1]);
  }
  if (s?.kind === 'prompt' || s?.kind === 'submit') {
    return viaClaude(c, STUCK_LINE[s.kind], s.kind === 'prompt' ? 'Your prompt goes in here.' : 'Paste it here, attach the file, send.');
  }
  if (c.phase === 'feedback') {
    const f = c.feedback.find((x) => !x.checked);
    /* the fix named, not "this one": in the chat there is nothing to point at */
    return voice(f ? `${f.one.split(/(?<=\.)\s/)[0]} ${f.how}` : 'All ticked. Hit fix and resubmit.');
  }
  return voice(STUCK_LINE[s?.kind ?? (c.phase === 'work' ? 'find' : c.phase)] ?? STUCK_LINE.done);
};

const explain = (t: string, c: TalkCtx): TalkPlan | null => {
  const col = colIn(t);
  if (col && c.pid === 'spotify') return voice(COLS[col]);
  const word = wordIn(t);
  if (word) return voice(WORDS[word].line);
  return null;
};

/* What she does with what you said. Your words, her open question, and where the stage is */
export function planTalk(text: string, c: TalkCtx): TalkPlan {
  const t = text.trim();
  if (c.open) {
    const o = optionSaid(t, c.open.options);
    if (o) return { kind: 'choose', msgId: c.open.msgId, optionId: o.id };
  }
  if (isAnswer(t, c)) return { kind: 'answer' };
  if (c.phase === 'review') return voice("I'm reading your file right now. A few more seconds and I'll tell you what I found.");
  if (I.film.test(t)) {
    const film = filmFor(c);
    if (film) return { kind: 'help', path: 'hand', say: `Here's the one on ${FILMS[film].title.toLowerCase()}. It's short.`, film };
  }
  if (I.file.test(t) && c.hasRaw) {
    const point = c.scene.desk && !c.scene.sheet ? { to: { at: 'dock' as const, app: 'sheets' as const }, note: 'Or open it in Sheets from here.' } : undefined;
    return { kind: 'help', path: 'hand', say: "Here's the file again. Open it and keep it beside me.", file: 'raw', point };
  }
  if (I.where.test(t)) {
    const s = c.step;
    if (s?.kind === 'prompt' || s?.kind === 'submit') {
      return viaClaude(
        c,
        s.kind === 'prompt' ? "Write it in Claude's box. Attach the raw file with it." : STUCK_LINE.submit,
        s.kind === 'prompt' ? 'Write it here, then attach the file.' : 'Paste it here, attach the raw file, send.'
      );
    }
  }
  const s0 = c.step;
  const named = s0?.kind === 'find' ? s0.items.find((i) => !c.found.includes(i.id) && i.find(t)) : undefined;
  if (I.stuck.test(t) || (named && /\bwhere\b/i.test(t))) return unstick(c, named);
  if (I.check.test(t)) {
    const s = c.step;
    if (s?.kind === 'find') return voice(findCheck(s, c));
    if (s?.kind === 'prompt') return voice(promptCheck(s, c.promptText));
    if (c.phase === 'feedback') {
      const open = c.feedback.filter((x) => !x.checked).length;
      return voice(open ? `${open} still open. ${c.feedback.find((x) => !x.checked)?.one ?? ''}`.trim() : 'All ticked. Hit fix and resubmit.');
    }
    return voice(progress(c));
  }
  if (I.better.test(t)) return voice(better(c));
  if (I.next.test(t)) return voice(progress(c));
  if (I.what.test(t)) {
    const e = explain(t, c);
    if (e) return e;
  }
  if (I.how.test(t)) return howTo(c);
  const e = explain(t, c);
  if (e) return e;
  if (c.phase === 'feedback') {
    const f = c.feedback.find((x) => !x.checked);
    if (f) return voice(`${f.why} ${f.how}`);
  }
  if (c.phase === 'approved') return voice("You're through. Hit Start POU and I'll ask you three quick things.");
  if (c.phase === 'done') return voice(STUCK_LINE.done);
  /* nothing matched: she says what she can do, from where you are */
  const s = c.step;
  if (s?.kind === 'find') return voice(`Tell me which column you're on and I'll point at the spot. ${progress(c)}`);
  return voice(`Say it another way and I'll help. ${progress(c)}`);
}

/* ---------- the scripted question, when nothing was typed ----------
   Each hold takes the next path, so a run of holds shows all three: she points, she answers, she hands you something. */
export function scriptFor(c: TalkCtx, n: number): string {
  const path = PATHS[n % PATHS.length];
  const s = c.step;
  const col = c.aim ? WHERE[c.aim.id]?.col : undefined;
  if (c.phase === 'review') return 'Is my file okay? What are you seeing?';
  if (c.phase === 'feedback') return path === 'voice' ? 'Why does this fix matter?' : path === 'point' ? "I'm stuck on the next fix." : 'Can you send the file again?';
  if (c.phase === 'approved') return 'What happens now?';
  if (c.phase === 'done') return "What's next for me?";
  if (s?.kind === 'find') {
    if (path === 'point') return "I'm stuck. Where should I be looking?";
    if (path === 'voice') return col ? `What does ${col} actually mean?` : 'How many are left?';
    return 'Where is the file again?';
  }
  if (s?.kind === 'prompt') {
    if (path === 'point') return 'Where do I write the prompt?';
    if (path === 'voice') return c.promptText ? 'Is my prompt good enough?' : 'What should the prompt say?';
    return 'Is there a video on writing prompts?';
  }
  if (s?.kind === 'submit') {
    if (path === 'point') return 'Where do I paste this?';
    if (path === 'voice') return 'How do I make this better before I send it?';
    return 'Can you send me the raw file again?';
  }
  if (s?.kind === 'ask') {
    const word = s.id === 'or' ? 'OpenRouter' : s.id === 'ls' ? 'LangSmith' : 'a repo';
    if (path === 'hand' && s.concept) return `Is there a video on ${word}?`;
    if (path === 'voice') return `What is ${word}?`;
    return 'How do I do this one?';
  }
  return path === 'voice' ? 'What should I do next?' : "I'm stuck. What now?";
}

/* the words of a line, for the voice and the captions */
export const wordsOf = (t: string): string[] => t.trim().split(/\s+/).filter(Boolean);
