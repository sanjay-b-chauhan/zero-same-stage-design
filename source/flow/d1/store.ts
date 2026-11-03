/* Design 1's stage, scripted. One thread, one phase, the brief she sent and what you ticked. Nothing here calls a model. */
import { create } from 'zustand';
import { clock } from '../clock';
import { awardXp } from '../hud';
import { showTurn } from '../stage/parts/turnStore';
import { APPROVED, FEEDBACK, OPEN, OPEN_2, POU, REPLY, REPLY_ELSE, REVIEW_STEPS, STUCK, TIERS, tierAt } from './script';

export type Item =
  | { id: number; k: 'brief' }
  | { id: number; k: 'her'; text: string; guide?: boolean }
  | { id: number; k: 'file' }
  | { id: number; k: 'me'; text: string }
  | { id: number; k: 'chips'; options: string[]; guide?: boolean }
  | { id: number; k: 'review'; n: number }
  | { id: number; k: 'feedback' }
  | { id: number; k: 'xp'; amount: number; label: string };

type NewItem = Item extends infer T ? (T extends Item ? Omit<T, 'id'> : never) : never;

export type Phase = 'work' | 'review' | 'feedback' | 'approved' | 'pou' | 'done';
export type PanelTab = 'resources' | 'feedback';

export interface D1 {
  stageId: string;
  thread: Item[];
  phase: Phase;
  typing: boolean;
  stuck: boolean;
  stuckAt: number;
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
}

let seq = 0;
let timers: ReturnType<typeof setTimeout>[] = [];
const later = (ms: number, fn: () => void) => timers.push(clock.setTimeout(fn, ms) as ReturnType<typeof setTimeout>);
const clear = () => {
  timers.forEach((t) => clock.clearTimeout(t as never));
  timers = [];
};

const fresh = (stageId: string): D1 => ({
  stageId,
  thread: [],
  phase: 'work',
  typing: false,
  stuck: false,
  stuckAt: 0,
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
});

export const useD1 = create<D1>(() => fresh('clean'));

const push = (it: NewItem) => useD1.setState((s) => ({ thread: [...s.thread, { ...it, id: ++seq } as Item] }));

/* she types, then the line lands. Short lines land fast, like a text */
function say(lines: string[], o: { guide?: boolean; after?: () => void; wait?: number } = {}) {
  let t = o.wait ?? 0;
  lines.forEach((text, i) => {
    later(t, () => useD1.setState({ typing: true }));
    t += 520 + Math.min(900, text.length * 14);
    later(t, () => {
      useD1.setState({ typing: false });
      push({ k: 'her', text, guide: o.guide });
      if (i === lines.length - 1) o.after?.();
    });
    t += 260;
  });
}

export const minutesIn = (s: D1 = useD1.getState()) => (Date.now() - s.startedAt) / 60000 + s.skewMin;

export const d1 = {
  begin(stageId: string) {
    clear();
    useD1.setState({ ...fresh(stageId), railOpen: useD1.getState().railOpen, panelW: useD1.getState().panelW });
    push({ k: 'brief' });
    if (stageId === 'clean') say(OPEN, { wait: 900, after: () => push({ k: 'file' }) });
    else say(OPEN_2, { wait: 900 });
  },

  send(text: string) {
    const t = text.trim();
    if (!t) return;
    const s = useD1.getState();
    push({ k: 'me', text: t });
    if (s.phase === 'pou') return d1.answer();
    if (s.stuck) return d1.stuckNext();
    const hit = REPLY.find((r) => r.re.test(t));
    say([hit ? hit.say : REPLY_ELSE]);
  },

  toggleStuck() {
    const s = useD1.getState();
    if (s.phase !== 'work' && s.phase !== 'feedback') return;
    if (s.stuck) {
      useD1.setState({ stuck: false });
      say(["Okay, you've got it from here."]);
      return;
    }
    useD1.setState({ stuck: true, stuckAt: 0 });
    const step = STUCK[0];
    say([step.say], { guide: true, after: () => push({ k: 'chips', options: [step.chip], guide: true }) });
  },

  stuckNext() {
    const s = useD1.getState();
    const at = s.stuckAt + 1;
    if (at >= STUCK.length) {
      useD1.setState({ stuck: false, stuckAt: 0 });
      return say(["That's it. You did it yourself."]);
    }
    useD1.setState({ stuckAt: at });
    const step = STUCK[at];
    say([step.say], { guide: true, after: () => push({ k: 'chips', options: [step.chip], guide: true }) });
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
    if (!/^https?:\/\/\S+\.\S+/i.test(s.link.trim())) return false;
    if (s.phase === 'work') return true;
    if (s.phase === 'feedback') return FEEDBACK.items.every((f) => s.fixed[f.id]);
    return false;
  },

  submit() {
    const s = useD1.getState();
    if (!d1.canSubmit(s)) return;
    const again = s.phase === 'feedback';
    useD1.setState({ phase: 'review', stuck: false, thread: s.thread.filter((i) => i.k !== 'chips') });
    push({ k: 'me', text: again ? 'Fixed both. Resubmitting.' : 'Here you go.' });
    const review = { k: 'review', n: 0 } as const;
    push(review);
    const reviewId = seq;
    REVIEW_STEPS.forEach((_, i) =>
      later(700 + i * 650, () =>
        useD1.setState((st) => ({ thread: st.thread.map((it) => (it.id === reviewId && it.k === 'review' ? { ...it, n: i + 1 } : it)) }))
      )
    );
    const done = 700 + REVIEW_STEPS.length * 650 + 300;
    if (!again && s.stageId === 'clean') {
      later(done, () => {
        useD1.setState({ phase: 'feedback', panel: 'feedback', view: null });
        say([FEEDBACK.head], { after: () => push({ k: 'feedback' }) });
      });
      return;
    }
    later(done, () => {
      useD1.setState({ phase: 'approved' });
      say([APPROVED], { after: () => d1.startPou() });
    });
  },

  startPou() {
    if (useD1.getState().stageId !== 'clean') return d1.finish();
    useD1.setState({ phase: 'pou', pouAt: 0 });
    say(['Before we move on, a few quick ones.', POU[0].q], { wait: 400 });
  },

  answer() {
    const s = useD1.getState();
    const cur = POU[s.pouAt];
    const next = s.pouAt + 1;
    if (next >= POU.length) {
      useD1.setState({ phase: 'done' });
      return say([cur.ack], { after: () => d1.finish() });
    }
    useD1.setState({ pouAt: next });
    say([cur.ack, POU[next].q]);
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
    if (s.stageId !== 'clean') return;
    later(2200, () =>
      showTurn(["That's exactly what I was looking for.", 'Clean data, every real customer kept.', 'Next, we see what each market brings in.'], {
        id: 'model',
        n: 2,
      })
    );
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
