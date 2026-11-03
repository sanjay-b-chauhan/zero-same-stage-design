/* Design 1's stage, scripted. One thread, one phase, the brief she sent and what you ticked. Nothing here calls a model. */
import { create } from 'zustand';
import { clock } from '../clock';
import { awardXp } from '../hud';
import { pouAnswerForMe, pouEnterLines, usePou } from '../room/pou';
import { shotName } from './snip';
import { BRIEF, CHECK_INTRO, FEEDBACK, OPEN, OPEN_2, SHOT_REPLY, REPLY, REPLY_ELSE, REVIEW, STAGE_CHECK, STUCK, BURN, TIERS, tierAt, ISSUES, ISSUE_ENOUGH, ASK_OPEN, ASK_HIT, ASK_MISS, ASK_ENOUGH, ASK_PROMPT_SHORT, ASK_PROMPT_OK } from './script';

export type Item =
  | { id: number; k: 'brief' }
  | { id: number; k: 'her'; text: string; guide?: boolean; tool?: 'claude' }
  | { id: number; k: 'file' }
  | { id: number; k: 'me'; text: string }
  | { id: number; k: 'shot'; name: string }
  | { id: number; k: 'seen'; img?: string }
  | { id: number; k: 'chips'; options: string[]; guide?: boolean }
  | { id: number; k: 'sent'; est: string }
  | { id: number; k: 'feedback' }
  | { id: number; k: 'xp'; amount: number; label: string }
  | { id: number; k: 'prompt'; text: string }
  | { id: number; k: 'att'; name: string; meta: string; link?: boolean; img?: string; sheet?: boolean };

type NewItem = Item extends infer T ? (T extends Item ? Omit<T, 'id'> : never) : never;

export type Phase = 'brief' | 'work' | 'review' | 'feedback' | 'approved' | 'pou' | 'done';
export type AskStep = 'issues' | 'prompt' | 'submit';
export type PanelTab = 'resources' | 'feedback';

export interface D1 {
  stageId: string;
  thread: Item[];
  phase: Phase;
  typing: boolean;
  stuck: boolean;
  stuckAt: number;
  stuckSince: number;
  stuckAsked: boolean;
  burnMin: number;
  met: Record<string, boolean>;
  fixed: Record<string, boolean>;
  link: string;
  startedAt: number;
  skewMin: number;
  pouAt: number;
  panel: PanelTab | null;
  view: string | null;
  railOpen: boolean;
  panelW: number;
  /* b14: ask mode. found issues in the order you named them, the prompt you wrote, where the asks are */
  ask: boolean;
  found: string[];
  prompt: string;
  askStep: AskStep;
  pop: { id: string; n: number } | null;
  /* b23: how much of the brief she has put down so far, 0 to BRIEF_PARTS */
  briefN: number;
}

/* b23 (his note: "the brief reveals as she says it: deliverable, format, requirements, tools, training"): the parts she
   puts down one after another, the Got it key comes once the last one is in */
export const BRIEF_PARTS = 6;
const PART_MS = 620;

const ASK_KEY = 'zero-same-stage-ask';
function readAsk() {
  /* ?ask=off or ?ask=on on the link wins, so a shared link lands in the mode it names */
  const q = new URLSearchParams(location.search).get('ask');
  if (q === 'off' || q === 'on') return q === 'on';
  try {
    return localStorage.getItem(ASK_KEY) !== 'off';
  } catch {
    return true;
  }
}

let seq = 0;
let missN = 0;
let popN = 0;
/* every wait she makes is kept with what it will do, so Next can play it now instead of waiting it out */
type Wait = { id: number; at: number; fn: () => void };
let timers: Wait[] = [];
const later = (ms: number, fn: () => void) => {
  const w: Wait = { id: 0, at: Date.now() + ms, fn };
  w.id = clock.setTimeout(() => {
    timers = timers.filter((x) => x !== w);
    fn();
  }, ms);
  timers.push(w);
};
const clear = () => {
  timers.forEach((t) => clock.clearTimeout(t.id));
  timers = [];
};
/* b23 (his note: "every thing that takes time should go quickly with my arrow keys"): run every pending wait in order */
const flush = () => {
  for (let guard = 0; timers.length && guard < 200; guard++) {
    const w = timers.reduce((a, b) => (b.at < a.at ? b : a));
    clock.clearTimeout(w.id);
    timers = timers.filter((x) => x !== w);
    w.fn();
  }
};
const DEV_ISSUES = ['duplicates', 'no currency', 'negative prices', 'test accounts', 'dates'];
const DEV_LINK = 'https://docs.google.com/spreadsheets/d/spotify-clean';
/* how long she takes to look, in the prototype. The estimate she gives is the real one */
const REVIEW_MS = 4200;
const REVIEW_AGAIN_MS = 2600;
const CHECK_FIRST_MS = 1500;

const fresh = (stageId: string): D1 => ({
  stageId,
  thread: [],
  phase: 'work',
  typing: false,
  stuck: false,
  stuckAt: 0,
  stuckSince: 0,
  stuckAsked: false,
  burnMin: 0,
  met: {},
  fixed: {},
  link: '',
  startedAt: Date.now(),
  skewMin: 0,
  pouAt: 0,
  panel: null,
  view: null,
  railOpen: true,
  panelW: 340,
  ask: readAsk(),
  found: [],
  prompt: '',
  askStep: 'issues',
  pop: null,
  briefN: 0,
});

export const useD1 = create<D1>(() => fresh('clean'));

const push = (it: NewItem) => useD1.setState((s) => ({ thread: [...s.thread, { ...it, id: ++seq } as Item] }));

/* she types, then the line lands. Short lines land fast, like a text. b27: a line can carry her tool link inside it,
   and the file she hands you lands in its place in the run, with no typing before it */
export type Line = string | { text: string; tool: 'claude' } | { file: true };
function say(lines: Line[], o: { guide?: boolean; after?: () => void; wait?: number } = {}) {
  let t = o.wait ?? 0;
  lines.forEach((line, i) => {
    const last = i === lines.length - 1;
    if (typeof line !== 'string' && 'file' in line) {
      later(t, () => {
        push({ k: 'file' });
        if (last) o.after?.();
      });
      t += 420;
      return;
    }
    const text = typeof line === 'string' ? line : line.text;
    const tool = typeof line === 'string' ? undefined : line.tool;
    later(t, () => useD1.setState({ typing: true }));
    t += 520 + Math.min(900, text.length * 14);
    later(t, () => {
      useD1.setState({ typing: false });
      push({ k: 'her', text, guide: o.guide, tool });
      if (last) o.after?.();
    });
    t += 260;
  });
}

const burning = (s: D1) => (s.stuck ? ((Date.now() - s.stuckSince) / 60000) * (BURN - 1) : 0);
export const minutesIn = (s: D1 = useD1.getState()) => (Date.now() - s.startedAt) / 60000 + s.skewMin + s.burnMin + burning(s);
/* leave stuck mode: bank what it burned */
const unstick = (extra: Partial<D1> = {}) => useD1.setState((s) => ({ stuck: false, burnMin: s.burnMin + burning(s), ...extra }));

export const d1 = {
  /* b23: the one Next for the stage. A wait in progress plays out at once, otherwise your side of the moment is
     played: Got it, the next issue, the prompt, the link, the fixes, her check-in. False when the stage is done */
  next(): boolean {
    if (timers.length) {
      flush();
      return true;
    }
    const s = useD1.getState();
    if (s.phase === 'brief') return d1.start(), true;
    if (s.phase === 'approved') return d1.check(), true;
    if (s.phase === 'pou') return usePou.getState().ended ? false : (pouAnswerForMe(), true);
    if (s.phase === 'feedback') {
      FEEDBACK.items.forEach((f) => !s.fixed[f.id] && d1.fix(f.id));
      return d1.submit(), true;
    }
    if (s.phase !== 'work') return false;
    if (s.stuck) return d1.stuckNext(), true;
    if (s.ask && s.stageId === 'clean') {
      if (s.askStep === 'issues') {
        const t = DEV_ISSUES.find((w) => ISSUES.some((i) => !s.found.includes(i.id) && i.re.test(w)));
        if (t) return d1.send(t), true;
      }
      if (s.askStep === 'prompt') return d1.send('Remove duplicate customers, add the currency to every price, drop test accounts and negative prices, and write every date as YYYY-MM-DD.'), true;
    }
    d1.setLink(DEV_LINK);
    d1.submit();
    return true;
  },

  begin(stageId: string) {
    clear();
    const keep = useD1.getState();
    useD1.setState({ ...fresh(stageId), railOpen: keep.railOpen, panelW: keep.panelW, ask: keep.ask, phase: 'brief' });
    /* b14 (founder call): she says hello, the brief builds in, and nothing else happens until you say Got it */
    const brief = () => {
      push({ k: 'brief' });
      useD1.setState({ typing: true });
      for (let k = 1; k <= BRIEF_PARTS; k++) later(k * PART_MS, () => useD1.setState({ briefN: k, typing: k < BRIEF_PARTS }));
    };
    /* b29 (his note: "let's remove the first message ... start with the straight brief"): stage one opens on the brief */
    if (stageId === 'clean') later(400, brief);
    else say([OPEN_2[0]], { wait: 400, after: () => later(250, brief) });
  },

  /* Got it, let's start: the brief lifts, her first ask comes in under it */
  start() {
    const s = useD1.getState();
    if (s.phase !== 'brief') return;
    if (s.briefN < BRIEF_PARTS) flush();
    useD1.setState({ phase: 'work', startedAt: Date.now(), briefN: BRIEF_PARTS, typing: false });
    push({ k: 'me', text: "Got it, let's start." });
    if (s.stageId !== 'clean') return say([OPEN_2[1]], { wait: 500 });
    if (s.ask) return say(ASK_OPEN, { wait: 600 });
    say(OPEN, { wait: 600, after: () => push({ k: 'file' }) });
  },

  setAsk(on: boolean) {
    useD1.setState({ ask: on });
    try {
      localStorage.setItem(ASK_KEY, on ? 'on' : 'off');
    } catch {
      /* private window */
    }
  },

  /* ask mode: a line you typed names an issue. Fills its slot, a quick +20 */
  findIssue(text: string) {
    const s = useD1.getState();
    const hit = ISSUES.find((i) => !s.found.includes(i.id) && i.re.test(text));
    if (!hit) return false;
    const found = [...s.found, hit.id];
    useD1.setState({ found, pop: { id: hit.id, n: ++popN } });
    awardXp({ amount: 20, reason: hit.label, id: `d1:issue:${hit.id}` });
    if (s.askStep === 'issues' && found.length === ISSUE_ENOUGH) {
      say([ASK_HIT[found.length % ASK_HIT.length], ...ASK_ENOUGH], { after: () => useD1.setState({ askStep: 'prompt' }) });
    } else say([ASK_HIT[(found.length - 1) % ASK_HIT.length]]);
    return true;
  },

  /* the screenshot key: she sees one frame of your screen and says one line */
  shot() {
    push({ k: 'shot', name: shotName() });
    say([SHOT_REPLY], { wait: 500 });
  },

  /* the + key: a file or a link lands in the chat as a card, she says one line */
  attach(name: string, meta: string, link?: boolean) {
    push({ k: 'att', name, meta, link });
    say([link ? 'Got the link. I will open it when you submit.' : 'Got the file. I will look at it when you submit.'], { wait: 500 });
  },

  /* b30 (his note: "the image does not send directly. It loads up in a chat container, and then we can type, or we can
     directly send"): what you picked goes with your words, in one send */
  post(text: string, file?: { name: string; meta: string; img?: string }) {
    if (file) push({ k: 'att', name: file.name, meta: file.meta, img: file.img });
    const s = useD1.getState();
    /* her screenshot step: the shot you send is the answer */
    if (file?.img && s.stuck && STUCK[s.stuckAt].snip) {
      if (text.trim()) push({ k: 'me', text: text.trim() });
      return d1.stuckNext();
    }
    if (text.trim()) return d1.send(text);
    if (file) say(['Got the file. I will look at it when you submit.'], { wait: 500 });
  },

  /* b32: what you would say if you held to talk right now, the same line Next would play for you */
  sample(): string {
    const s = useD1.getState();
    if (s.stuck) return STUCK[s.stuckAt].chip;
    if (s.ask && s.stageId === 'clean' && s.phase === 'work') {
      if (s.askStep === 'issues') {
        const t = DEV_ISSUES.find((w) => ISSUES.some((i) => !s.found.includes(i.id) && i.re.test(w)));
        if (t) return `I see ${t} in here.`;
      }
      if (s.askStep === 'prompt') return 'Remove duplicate customers, add the currency to every price, drop test accounts and negative prices, and write every date as YYYY-MM-DD.';
    }
    if (s.phase === 'feedback') return 'Where are the customers still listed twice?';
    return "I'm in the sheet now. Where should I start?";
  },

  /* b32: you held to talk in the PiP. Your words, the one frame she took as you let go, then her answer */
  talk(text: string, img?: string) {
    const t = text.trim();
    if (!t) return;
    push({ k: 'me', text: t });
    push({ k: 'seen', img });
    d1.answer(t);
  },

  send(text: string) {
    const t = text.trim();
    if (!t) return;
    push({ k: 'me', text: t });
    d1.answer(t);
  },

  answer(t: string) {
    const s = useD1.getState();
    if (s.stuck) {
      const step = STUCK[s.stuckAt];
      if (t === step.chip) return d1.stuckNext();
      return say([step.help], { guide: true });
    }
    if (s.ask && s.stageId === 'clean' && s.phase === 'work') {
      if (s.askStep === 'prompt') {
        if (t.split(/\s+/).length < 8) return say([ASK_PROMPT_SHORT]);
        /* b31: your words stay as you said them; the prompt sits in your to-dos with its copy key */
        useD1.setState({ prompt: t, askStep: 'submit' });
        awardXp({ amount: 50, reason: 'Prompt to Claude', id: 'd1:prompt' });
        useD1.setState({ pop: { id: 'prompt', n: ++popN } });
        return say(ASK_PROMPT_OK);
      }
      if (s.askStep === 'issues' && d1.findIssue(t)) return;
      if (s.askStep === 'issues') return say([ASK_MISS[missN++ % ASK_MISS.length]]);
    }
    const hit = REPLY.find((r) => r.re.test(t));
    say([hit ? hit.say : REPLY_ELSE]);
  },

  toggleStuck() {
    const s = useD1.getState();
    if (s.phase !== 'work' && s.phase !== 'feedback') return;
    if (s.stuck) {
      unstick();
      say(["Okay, you've got it from here."]);
      return;
    }
    useD1.setState({ stuck: true, stuckAt: 0, stuckAsked: false, stuckSince: Date.now() });
    say([STUCK[0].say], { guide: true });
  },

  stuckNext() {
    const s = useD1.getState();
    const at = s.stuckAt + 1;
    if (at >= STUCK.length) {
      unstick({ stuckAt: 0 });
      return say(["That's it. You did it yourself."]);
    }
    useD1.setState({ stuckAt: at, stuckAsked: false });
    say([STUCK[at].say], { guide: true });
  },

  /* option 2: the question most people have at this step; she answers and the step stays */
  stuckAsk() {
    const s = useD1.getState();
    if (!s.stuck) return;
    const step = STUCK[s.stuckAt];
    useD1.setState({ stuckAsked: true });
    push({ k: 'me', text: step.alt });
    say([step.help], { guide: true });
  },

  chip(text: string) {
    useD1.setState((s) => ({ thread: s.thread.filter((i) => i.k !== 'chips') }));
    d1.send(text);
  },

  setLink(link: string) {
    useD1.setState({ link });
  },

  tick(id: string) {
    useD1.setState((s) => ({ met: { ...s.met, [id]: !s.met[id] } }));
  },

  fix(id: string) {
    useD1.setState((s) => ({ fixed: { ...s.fixed, [id]: !s.fixed[id] } }));
  },

  canSubmit(s: D1 = useD1.getState()) {
    if (s.phase === 'work') return true;
    if (s.phase === 'feedback') return FEEDBACK.items.every((f) => s.fixed[f.id]);
    return false;
  },

  submit() {
    const s = useD1.getState();
    if (!d1.canSubmit(s)) return;
    const again = s.phase === 'feedback';
    const r = again ? REVIEW.again : REVIEW.first;
    unstick({ phase: 'review', thread: s.thread.filter((i) => i.k !== 'chips') });
    if (again) push({ k: 'me', text: "Fixed both. Here's the new one." });
    push({ k: 'att', name: again ? 'spotify_pricing_clean_v2' : 'spotify_pricing_clean', meta: 'Google Sheets', link: true, sheet: true });
    /* b30: under your link, how long she will take, while she takes it */
    push({ k: 'sent', est: r.est });
    const sentId = seq;
    const drop = () => useD1.setState((st) => ({ thread: st.thread.filter((it) => it.id !== sentId) }));
    say([r.got], { wait: 600 });
    const back = again ? REVIEW_AGAIN_MS : REVIEW_MS;
    if (!again && s.stageId === 'clean') {
      later(back, () => {
        drop();
        /* what she saw already met ticks now; the two she flagged wait for your fixes */
        useD1.setState({ phase: 'feedback', met: { test: true, keep: true } });
        say([r.back, FEEDBACK.head], { after: () => push({ k: 'feedback' }) });
      });
      return;
    }
    later(back, () => {
      drop();
      /* she checked them: every requirement ticks itself, you never tick a requirement */
      useD1.setState({ phase: 'approved', met: Object.fromEntries(BRIEF.requirements.map((r) => [r.id, true])) });
      say([r.back]);
    });
  },

  /* b30 (his note: "then the bottom chat has to convert into a CTA ... a proof of understanding stage ... a voice chat
     experience, like how we had a kickoff POU"): the kickoff's check-in, in this chat, with the stage's questions */
  check() {
    const s = useD1.getState();
    if (s.phase !== 'approved') return;
    if (s.stageId !== 'clean') return d1.finish();
    useD1.setState({ phase: 'pou' });
    /* b31: the page clears and the meter comes up before her first note */
    pouEnterLines('spotify', STAGE_CHECK, [CHECK_INTRO], CHECK_FIRST_MS);
  },

  finish() {
    const s = useD1.getState();
    const min = minutesIn(s);
    const tier = TIERS[Math.max(0, tierAt(min))];
    useD1.setState({ phase: 'done' });
    if (tier.xp > 0) {
      push({ k: 'xp', amount: tier.xp, label: `Done in ${Math.max(1, Math.round(min))} min` });
      awardXp({ amount: tier.xp, reason: `Stage done in ${Math.max(1, Math.round(min))} min`, id: `d1:${s.stageId}` });
    }
  },

  openPanel(tab: PanelTab, view: string | null = null) {
    useD1.setState({ panel: tab, view });
  },
  closePanel() {
    useD1.setState({ panel: null, view: null });
  },
  setRail(open: boolean) {
    useD1.setState({ railOpen: open });
  },
  setPanelW(w: number) {
    useD1.setState({ panelW: Math.round(Math.min(560, Math.max(280, w))) });
  },
  skew(min: number) {
    useD1.setState((s) => ({ skewMin: s.skewMin + min }));
  },
  stop: clear,
};

/* the check-in ends when she has heard enough: the stage is done */
usePou.subscribe((p, was) => {
  if (p.ended && !was.ended && useD1.getState().phase === 'pou') d1.finish();
});
