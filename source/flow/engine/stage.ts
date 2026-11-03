/* The brain of the stage. Project > stage > step > slot. She directs, you answer, the system ticks. Both the big screen and the PIP
   read one store. No DOM except the one real file download. Every timer goes through the clock. */
import { clock } from '../clock';
import { playTake, softLand, stopVoice, ting } from '../audio';
import { devMark } from '../dev/store';
import { CARD_START, STEP_HELP, STUCK_ASK, STUCK_KEYS, STUCK_LINE, STUCK_RIGHT, STUCK_WORD_ASK, WORDS } from '../data/stuck';
import { DONE_LINE, HELLO_FIRST, HELLO_NEXT, OPENERS, PLAN_ASK, PLAN_GOOD, PLAN_STEER, PLAN_STEER_LEAD, PLAN_STUCK_LEAD, type Hand } from '../data/openers';
import {
  GO_LINE,
  GUIDE_OFF,
  GUIDE_PHASE,
  GUIDE_PICKS,
  GUIDE_STEPS,
  MCQ,
  MCQ_IDK,
  MCQ_NEAR,
  MCQ_TYPED,
  MCQ_WARM,
  STUCK_OFF,
  STUCK_ON,
  guideText,
} from '../data/stuckMode';
import { RATES } from '../games/rates';
import { celeLine, endCele, leaveCele, showCele } from '../stage/parts/celeStore';
import { turnLines } from '../data/turns';
import { emojiFor, fillLine, react } from '../stage/parts/reactions';
import type { Actions, Delivered, FileRef, FlowStateLike, Msg, Option, Phase, ProjectId, Screen, Slot, StageMeta, StageState, Step, TalkScene, UiState, VoiceNote } from './shapes';
import { planTalk, scriptFor, type TalkCtx, type TalkPlan } from './cowork';
import { hushSpeech, speak } from './speak';
import { awardXp, resetXp, XP } from '../hud/xp';
import { flyToLevel, stopFlights } from '../stage/parts/flyText';
import { gameFor } from '../games/stage1';
import { STAGE2, type Stage2Def } from '../games/stage2';
import { resetGames } from '../games/store';
import type { GameDef } from '../games/types';
import { takeFor } from './takes';
import { AMAZON } from '../data/amazon';
import { SPOTIFY, fxFrom } from '../data/spotify';
import { FILMS } from '../data/films';
import { RAW } from '../data/raw';
import { check, clean, parse, toCsv, type Table } from '../data/csv';
import type { AskStepDef, FindStepDef, Issue, OpenLine, PouQ, PromptStepDef, ReviewCtx, ReviewItem, ReviewResult, Scenario, StageDef, StepDef, Submission, VerifyResult } from '../data/defs';

export const SCENARIOS: Record<ProjectId, Scenario> = { spotify: SPOTIFY, amazon: AMAZON };

/* ---------- what she listens for, as b1 had it ---------- */
const STUCK = /\b(i ?don'?t know|dunno|idk|no idea|not sure|stuck|help|hint|confused|lost|clue|what do i do|what should i|i can'?t find|can'?t see)\b/i;
const ANSWER = /(just tell me|tell me the answer|give me the answer|what'?s the answer|show me the answer|give it to me|what are they|tell me)\b/i;
const WHERE = /\b(where).*(file|data|sheet|csv)|\b(can'?t|cannot).*(find|open).*(file|data)|\b(resend|send).*(file|data)/i;
const COUNT = /how many\s+(issues?\s+|more\s+)?(are\s+|do i have\s+|have i got\s+)?(there|left|more|to go|remaining)|what'?s left|how much (left|more)/i;
const HI = /^(hi|hey|hello|yo|sup|hii+)\b/i;
const OK = /^(ok|okay|sure|got it|cool|yes|yep|yeah|k|alright|fine|nice|great|thanks|thank you|ty)[.! ]*$/i;
const FIXQ = /how (do|would|should) (i|we) (fix|clean|solve)|should i fix|do i fix/i;
const SCREENQ = /what am i doing wrong|am i doing (this|it) right|does (this|it) look (right|ok|good)|can you see|see my screen|look at my screen/i;
const WRITE = /write it (for me)?|just give me|give me (the|a) prompt|can you write|you write|write the prompt|i don'?t know/i;
const SLOP = /\b(delve|leverage|robust|seamless|comprehensive|furthermore|moreover|in conclusion|utilize|facilitate|streamline|holistic|meticulous|in summary)\b/i;

/* There is no screen capture in this prototype, so she never says she can see it. */
const NO_SCREEN = "I can't see your screen from here. Tell me what you're looking at.";

/* feedback is yours now. You can ask her about any line */
const ABOUT: Record<string, RegExp> = {
  region: /region/i,
  region_blank: /region|bengaluru|blank/i,
  mismatch: /currenc|usd|match|mumbai|dollar/i,
  currency: /currenc/i,
  lost: /name|bring|removed|customers?|missing/i,
  dups: /duplic/i,
  tests: /test/i,
  bad_price: /negative|zero/i,
  outlier: /1199|decimal/i,
  price_text: /symbol|number/i,
  plan: /plan/i,
  dates: /date/i,
  names: /name/i,
};

const YES_NO: Option[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
];

const MAX_READ = 25 * 1024 * 1024;

/* the slot's words type in for about this long before they fly */
const SWEEP_AFTER = 380;

/* a card is open: the move is on it */
const CARD_LINE = 'Make your move on the card. A wrong one is fine, it plays out.';
const CARD_STUCK = "Make a move on the card. If two go badly, I'll play one with you.";

/* stage 2, played from STAGE2: one step of rounds, then the model it hands back */
const S2_STEP = 'rounds';
const S2_OUT = 'model-out';
const S2_LEAD = ['First, ', 'Next, ', 'Last one, '];

/* a name keeps its capitals (GitHub repo), anything else starts small */
/* the fact a slot rests on: the first sentence of her told line, the rest is her why */
const fact = (t: string) => t.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? t;
const lc = (t: string) => (!t || /^[A-Z][a-z]+[A-Z]/.test(t) || /^[A-Z]{2}/.test(t) ? t : t[0].toLowerCase() + t.slice(1));
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'prompt';

/* ---------- run state nobody draws ---------- */
interface LastSub {
  sub: Submission;
  isLink: boolean;
  was: string[];
}

interface Run {
  sc: Scenario;
  stageId: string;
  def?: StageDef; /* a stub stage has none */
  si: number;
  miss: Record<string, number>;
  rot: Record<string, number>;
  partOf: Record<string, number>;
  hinted: Record<string, boolean>; /* she has already pointed at where it shows */
  askDup: { tries: number } | null;
  dir?: string; /* the issue her last direction pointed at */
  pText: string;
  pTries: number;
  pGap?: string;
  pendingDraft?: string;
  prompt: Record<string, string>;
  concept: Record<string, 'yes' | 'no'>;
  entered: Record<number, boolean>;
  idled: number;
  yn: ((a: 'yes' | 'no') => void) | null;
  film: (() => void) | null;
  resub: boolean;
  subs: number;
  sawMismatch: boolean;
  fbItems: ReviewItem[];
  pouList: PouQ[];
  pouI: number;
  pouTries: number;
  pouAcc: string;
  slop: number;
  ctx: ReviewCtx;
  lastSub?: LastSub;
  saved?: StageState;
  games: Record<string, { stepId: string; slotId: string; label: string; s2?: boolean }>; /* game card msg id: the slot it fills */
  s2?: Stage2Def; /* a stage played from STAGE2 */
  briefed?: boolean; /* she has opened the stage: what it is for, what she handed you, what you hand back */
  plan?: (t: string) => void; /* b20: she asked what you plan to do, your answer goes here */
  hands: Record<string, FileRef>; /* what she handed you, by the key I'm stuck points with */
  asked: Record<string, number>; /* I'm stuck presses on one step or card */
  guided: Record<string, boolean>; /* stuck mode: the steps she already laid out, by step or phase */
  mcqTried: Record<string, number[]>; /* stuck mode: the picks already tried, by issue */
  pickUsed: Record<string, number[]>; /* b14 stuck mode: the keys of a step already played, by step or phase */
}

interface FillOpts {
  label?: string;
  value?: string;
  told?: boolean;
  xp?: false; /* the caller pays its own XP */
  ting?: false;
  said?: string;
  proof?: string;
  note?: string;
}

class Cancelled extends Error {}

/* every file anyone can open: what she sent and what you handed in */
const bank = new Map<string, FileRef>();

export const fileRef = (id: string) => bank.get(id);

export const fileTable = (id: string): Table | null => {
  const f = bank.get(id);
  return f?.text ? parse(f.text) : null;
};

export interface EngineDev {
  idle(): Promise<void>;
  busy(): boolean;
  setFast(on: boolean): void;
  tings(): number;
  handIn(how: 'first' | 'last'): Promise<void>;
  setRepo(how: 'submit' | 'first' | 'last'): void;
  csv: { parse: typeof parse; toCsv: typeof toCsv; clean: typeof clean; check: typeof check; fxFrom: typeof fxFrom; RAW: typeof RAW };
}

type SetFn = (p: Partial<FlowStateLike>) => void;
type GetFn = () => FlowStateLike;

export function createEngine(set: SetFn, get: GetFn): { actions: Actions; dev: EngineDev } {
  let R = null as unknown as Run;
  let runs: Record<string, Run> = {};
  let gen = 0;
  let ENG: Promise<unknown> = Promise.resolve();
  let queued = 0;
  let asides = 0;
  let fast = false;
  let instant = false;
  let mid = 0;
  let fileSeq = 0;
  let tingCount = 0;
  let idleOff: (() => void) | null = null;
  let streamOff: (() => void) | null = null;
  let hushed = false; /* you spoke over her: the rest of what she was opening with comes out silent */
  let delSeq = 0;
  let handFrom: string | undefined; /* where the next hand in left from on screen */

  /* ---------- time. A closed PiP window drops its timers, so every wait re-arms when the clock moves ---------- */
  interface Pending {
    at: number;
    fire: () => void;
  }
  const pending = new Set<Pending>();
  const later = (ms: number, fn: () => void) => {
    let done = false;
    const p: Pending = {
      at: Date.now() + ms,
      fire: () => {
        if (done) return;
        done = true;
        pending.delete(p);
        fn();
      },
    };
    pending.add(p);
    clock.setTimeout(p.fire, ms);
    return () => {
      done = true;
      pending.delete(p);
    };
  };
  clock.onSwitch(() => {
    pending.forEach((p) => clock.setTimeout(p.fire, Math.max(0, p.at - Date.now())));
  });

  const W = (ms: number): Promise<void> => {
    const g = gen;
    const real = instant ? 0 : fast ? Math.min(ms, 20) : ms;
    const go = real === 0 ? Promise.resolve() : new Promise<void>((res) => { later(real, res); });
    return go.then(() => {
      if (g !== gen) throw new Cancelled();
    });
  };

  /* one thing at a time. A second message waits its turn, nothing races */
  const queue = (f: () => unknown) => {
    const g = gen;
    queued++;
    ENG = ENG.then(() => (g === gen ? f() : undefined))
      .catch((e) => {
        if (!(e instanceof Cancelled)) console.error(e);
      })
      .finally(() => {
        if (g === gen) queued--;
      });
    return ENG;
  };

  const cancel = () => {
    gen++;
    stopFlights();
    ENG = Promise.resolve();
    queued = 0;
    idleOff?.();
    idleOff = null;
    if (R) {
      R.yn = null;
      R.film = null;
    }
    stopVoice();
    endStream();
    hushed = false;
    const st = get().stage;
    if (st?.typing || st?.wait) patch({ typing: false, wait: undefined });
  };

  /* ---------- state helpers ---------- */
  const stage = () => get().stage as StageState;
  const patch = (p: Partial<StageState> | ((s: StageState) => Partial<StageState>)) => {
    const s = get().stage;
    if (!s) return;
    set({ stage: { ...s, ...(typeof p === 'function' ? p(s) : p) } });
  };
  const setUi = (p: Partial<UiState>) => set({ ui: { ...get().ui, ...p } });

  const rot = (k: string, a: string[]) => {
    R.rot[k] = (R.rot[k] || 0) + 1;
    return a[(R.rot[k] - 1) % a.length];
  };

  const stepDef = (): StepDef | undefined => R.def?.flow[R.si];
  const stepNow = (): Step | undefined => stage().steps[R.si];
  const left = () => (stepNow()?.slots ?? []).filter((x) => !x.filled).length;
  const isFound = (id: string) => !!stepNow()?.slots.some((x) => x.id === id && x.filled);
  const target = (s: FindStepDef): Issue | undefined => {
    const id = s.order.find((o) => !isFound(o));
    return s.items.find((i) => i.id === id);
  };
  /* the open issue her last direction pointed at, so "I don't know" climbs the ladder on the one she asked about */
  const aim = (s: FindStepDef): Issue | undefined => (R.dir && !isFound(R.dir) ? s.items.find((i) => i.id === R.dir) : undefined) ?? target(s);

  const syncSteps = () => {
    const ph = stage().phase;
    const allDone = ph === 'approved' || ph === 'pou' || ph === 'done';
    patch((s) => ({ steps: s.steps.map((x, i): Step => ({ ...x, state: allDone || i < R.si ? 'done' : i === R.si ? 'now' : 'next' })) }));
  };

  /* a line she writes word by word goes in with its stream in the same set, so no frame ever shows it whole first */
  const addMsg = (m: Omit<Msg, 'id' | 'at'>, o: { stream?: boolean } = {}): Msg => {
    const s = get().stage;
    const msg: Msg = { id: `m${++mid}`, at: Date.now(), ...(s?.stuckMode && !m.sys && !m.rule && m.text ? { sm: true } : {}), ...m };
    if (o.stream) endStream();
    if (!s) return msg;
    const ui = get().ui;
    const miss = m.from === 'her' && ui.surface === 'pip' && (!ui.pipOpen || ui.pipBody !== 'chat');
    set({
      stage: { ...s, msgs: [...s.msgs, msg], unread: s.unread || miss },
      ...(o.stream ? { ui: { ...ui, stream: { id: msg.id, n: 0 } } } : {}),
    });
    return msg;
  };

  const say = (msg: Msg) => {
    if (!msg.voice || fast || instant) return;
    setUi({ playingMsgId: msg.id });
    const over = () => {
      if (get().ui.playingMsgId === msg.id) setUi({ playingMsgId: undefined, level: 0 });
    };
    void playTake(msg.voice.url, { onLevel: (v) => setUi({ level: v }) }).then(over, over);
  };

  const vKey = (): 'aaron' | 'eryn' => (R?.sc.meta.id === 'amazon' ? 'aaron' : 'eryn');

  /* ---------- her words come out on her voice when she has a take, else the way ChatGPT streams ----------
     b14 (his note: "It says one word at a time ... faster, like how ChatGPT does it"): with no take leading, a tick lets out
     every word whose time has come, a few at once, so a short line is out in about half a second. Each word softens in
     over its own transition (stage.css .zs2-w), so several are arriving together and the edge reads as one soft wave.
     A take leads a beat ahead of the playhead, so the word is sharp as she says it */
  const STREAM_TICK = 48;
  const STREAM_PER = 26;
  const STREAM_CAP = 1800;
  const TAKE_LEAD = 0.1;
  const wordStarts = (t: string): number[] => {
    const a: number[] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) a.push(m.index);
    return a;
  };
  const endStream = () => {
    const f = streamOff;
    streamOff = null;
    f?.();
  };
  const streamOut = (msg: Msg, o: { take?: VoiceNote; per?: number; cap?: number; onN?: (n: number) => void } = {}) =>
    new Promise<void>((resolve) => {
      const text = msg.text ?? '';
      const starts = wordStarts(text);
      const N = starts.length;
      let n = 0;
      let over = false;
      let stopTick: (() => void) | null = null;
      const put = (k: number) => {
        if (over) return;
        const v = Math.min(N, k);
        if (v <= n) return;
        n = v;
        if (get().ui.stream?.id === msg.id) setUi({ stream: { id: msg.id, n } });
        o.onN?.(n);
      };
      const finish = () => {
        if (over) return;
        put(N);
        over = true;
        stopTick?.();
        if (streamOff === finish) streamOff = null;
        if (get().ui.stream?.id === msg.id) setUi({ stream: undefined });
        resolve();
      };
      streamOff = finish;
      /* by the clock, not by the tick: a late tick lets out everything that is due, never one word behind */
      const pace = (per: number) => {
        const t0 = Date.now();
        const tick = () => {
          stopTick = null;
          if (over) return;
          put(Math.max(n + 1, Math.floor((Date.now() - t0) / per) + 1));
          if (n >= N) finish();
          else stopTick = later(STREAM_TICK, tick);
        };
        stopTick = later(STREAM_TICK, tick);
      };
      if (N === 0) {
        finish();
        return;
      }
      put(1);
      if (o.take) {
        const take = o.take;
        const share = starts.map((c) => c / Math.max(1, text.length));
        const dur = take.dur > 0 ? take.dur : 1;
        let heard = false;
        void playTake(take.url, {
          onLevel: (v) => {
            if (!over && get().ui.level !== v) setUi({ level: v });
          },
          onTime: (t) => {
            if (t > 0) heard = true;
            const at = (t + TAKE_LEAD) / dur + 0.015;
            let k = 0;
            while (k < N && share[k] <= at) k++;
            put(k);
          },
        }).then(() => {
          if (get().ui.level) setUi({ level: 0 });
          if (over) return;
          /* a take that never played, a blocked autoplay say, still comes out at her pace */
          if (heard) finish();
          else pace(Math.min(o.per ?? STREAM_PER, (o.cap ?? STREAM_CAP) / N));
        });
        return;
      }
      if (n >= N) finish();
      else pace(Math.min(o.per ?? STREAM_PER, (o.cap ?? STREAM_CAP) / N));
    });

  /* she takes a short beat, then writes. An opening line is spoken, and the next one waits for it to end */
  const her = async (
    text: string,
    o: { wait?: number; options?: Option[]; voice?: boolean; speak?: boolean; onN?: (n: number) => void; per?: number; cap?: number; dots?: boolean } = {}
  ) => {
    if (o.dots && !fast && !instant) patch({ typing: true });
    await W(o.wait ?? Math.min(420, 180 + text.length * 3));
    if (o.dots && stage().typing) patch({ typing: false });
    const live = !o.voice && !fast && !instant;
    const msg = addMsg(
      { from: 'her', text, options: live ? undefined : o.options, voice: o.voice ? takeFor(text, vKey()) : undefined },
      { stream: live }
    );
    if (o.voice) {
      say(msg);
      o.onN?.(Number.MAX_SAFE_INTEGER);
      return msg;
    }
    if (!live) {
      o.onN?.(Number.MAX_SAFE_INTEGER);
      return msg;
    }
    const g = gen;
    const take = o.speak && !hushed ? takeFor(text, vKey()) : undefined;
    await streamOut(msg, { take, onN: o.onN, per: o.per, cap: o.cap });
    if (g !== gen) throw new Cancelled();
    if (o.options) {
      const opts = o.options;
      patch((s) => ({ msgs: s.msgs.map((m) => (m.id === msg.id ? { ...m, options: opts } : m)) }));
    }
    return msg;
  };

  /* the queue is held while she waits on a Yes or No, so this one line goes around it */
  const aside = (text: string) => {
    const g = gen;
    asides++;
    later(instant || fast ? 0 : Math.min(420, 180 + text.length * 3), () => {
      asides--;
      if (g !== gen) return;
      const live = !fast && !instant;
      const m = addMsg({ from: 'her', text }, { stream: live });
      if (live) void streamOut(m);
    });
  };

  /* the slots of a step land, staggered, each with its own soft note */
  const revealStep = (id: string | undefined, sound = true) => {
    const step = id ? get().stage?.steps.find((x) => x.id === id) : undefined;
    if (!step || step.revealed) return;
    const at = Date.now();
    patch((s) => ({ steps: s.steps.map((x) => (x.id === step.id ? { ...x, revealed: true } : x)), revealAt: at, revealId: step.id }));
    if (!sound || fast || instant) return;
    step.slots.forEach((_, i) => later(i * 40, () => softLand(i)));
  };

  const tingNow = () => {
    tingCount++;
    ting();
  };

  /* ---------- XP. One id pays once. The coin leaves from the cell on the surface you are looking at ---------- */
  const pid = (): ProjectId => (R?.sc.meta.id ?? get().project?.id ?? 'spotify') as ProjectId;
  const xpKey = (k: string, stageId = R.stageId) => `${pid()}:${stageId}:${k}`;
  const pipDoc = (): Document | null => {
    try {
      return (window as unknown as { documentPictureInPicture?: { window?: Window | null } }).documentPictureInPicture?.window?.document ?? null;
    } catch {
      return null;
    }
  };
  /* while the PiP is open its own cells come first: the real window, or the dock on this page */
  const onScreen = (sel: string): Element | null => {
    try {
      const { surface, pipOpen } = get().ui;
      if (surface === 'pip' && pipOpen) {
        const inPip = pipDoc()?.querySelector(sel) ?? document.querySelector(`.zp ${sel}`);
        if (inPip) return inPip;
      }
      return document.querySelector(`.zs2-frame ${sel}`) ?? document.querySelector(sel);
    } catch {
      return null;
    }
  };
  const slotSel = (id: string) => `[data-slot="${id.replace(/["\\]/g, '')}"]`;
  type From = string | DOMRect | Element | null | undefined;
  /* a cell on screen: its own words fly into the Level pill and the award lands with them. No coin, no toast */
  const pay = (amount: number, reason: string, key: string, from?: From, o: { stageId?: string; quiet?: boolean; text?: string; after?: number } = {}) => {
    const id = xpKey(key, o.stageId);
    if (instant || o.quiet) {
      awardXp({ amount, reason, id, quiet: true });
      return;
    }
    const g = gen;
    /* a beat later, so the cell it leaves from is on screen */
    later(fast ? 0 : 40, () => {
      if (g !== gen) return;
      if (typeof from !== 'string') return awardXp({ amount, reason, id, from: from ?? null });
      const land = () => awardXp({ amount, reason, id, from: null });
      if (fast || !flyToLevel(onScreen(from), o.text ?? reason.replace(/^[^:]*:\s*/, ''), land, o.after ?? 0)) land();
    });
  };
  const stageNo = (stageId = R.stageId) => Math.max(0, R.sc.meta.stages.findIndex((x) => x.id === stageId)) + 1;

  const slotXp = (step: Step, slot: Slot, o: FillOpts) => {
    if (o.xp === false) return;
    const name = lc(o.label || slot.label || step.label);
    const from = slotSel(slot.id);
    /* the words fly once they have typed into the slot */
    const text = o.label || slot.label || step.label;
    if (slot.kind === 'prompt') return pay(o.told ? XP.told : XP.prompt, o.told ? 'Prompt, she drafted it' : 'Prompt agreed', slot.id, from, { text: step.label, after: 120 });
    if (slot.kind === 'file') return;
    pay(o.told ? XP.told : XP.found, `${o.told ? 'Told' : slot.kind === 'issue' ? 'Found' : 'Done'}: ${name}`, slot.id, from, { text, after: SWEEP_AFTER });
  };

  /* ---------- what you handed in: Your deliverables ---------- */
  const keepRef = (ref: FileRef) => {
    bank.set(ref.id, ref);
    if (get().stage) patch((s) => (s.files.some((f) => f.id === ref.id) ? {} : { files: [...s.files, ref] }));
    return ref;
  };
  const whereOf = (label: string, stageId = R.stageId) => `Stage ${stageNo(stageId)} · ${label}`;
  const deliver = (ref: FileRef, where: string, from?: string, quiet?: boolean) => {
    const list = get().delivered ?? [];
    if (list.some((d) => d.fileId === ref.id)) return;
    /* the same thing handed in again in the same stage (the repo from step 1, now for review) is one row, moved to the top */
    const same = list.find((d) => d.name === ref.name && d.kind === ref.kind && d.stageId === ref.stageId);
    const rest = same ? list.filter((d) => d !== same) : list;
    const d: Delivered = { id: `d${++delSeq}`, fileId: ref.id, name: ref.name, kind: ref.kind, where, stageId: ref.stageId, at: Date.now(), from, quiet: quiet || instant || undefined, again: same ? true : undefined };
    set({ delivered: [...rest, d] });
  };
  const promptRef = (stepId: string, label: string, text: string, stageId = R.stageId): FileRef =>
    keepRef({ id: `pr-${stageId}-${stepId}`, name: `${slug(label)}.txt`, meta: `${text.split(/\s+/).filter(Boolean).length} words`, kind: 'text', text, stageId, mine: true });

  /* a new run of the stage from a dev jump: no XP, no cards, nothing handed in */
  const restart = () => {
    resetXp();
    resetGames();
    set({ delivered: [] });
  };

  const share = (key: string) => {
    const raw = R.sc.files[key];
    if (!raw) return;
    const ref: FileRef = { id: raw.id, name: raw.name, meta: raw.meta, kind: raw.kind, url: raw.url, text: raw.text, stageId: R.stageId };
    bank.set(ref.id, ref);
    patch((s) => (s.files.some((f) => f.id === ref.id) ? {} : { files: [...s.files, ref] }));
    addMsg({ from: 'her', file: ref });
  };

  /* ---------- every stage opens with her: what it is for, what she hands you, what you hand back ---------- */
  const rateRef = (): FileRef => {
    const rows = Object.entries(RATES).map(([c, v]) => `${c},${v}`);
    const text = ['currency,usd_per_unit', ...rows].join('\n');
    return { id: `${pid()}-rates`, name: 'exchange_rates_sample.csv', meta: `${rows.length} currencies`, kind: 'csv', text, stageId: R.stageId };
  };
  const handRef = (h: Hand): [string, FileRef] | undefined => {
    if ('file' in h) {
      const raw = R.sc.files[h.file];
      return raw ? [h.file, { id: raw.id, name: raw.name, meta: raw.meta, kind: raw.kind, url: raw.url, text: raw.text, stageId: R.stageId }] : undefined;
    }
    if ('link' in h) return [h.name.toLowerCase(), { id: `tool-${h.name.toLowerCase().replace(/\W+/g, '-')}`, name: h.name, meta: h.meta, kind: 'link', url: h.link, stageId: R.stageId }];
    if ('carry' in h) {
      const mine = stage().files.filter((f) => f.mine && f.stageId === h.carry && f.kind !== 'link' && f.kind !== 'text');
      const last = mine[mine.length - 1];
      /* your file, handed back to you as this stage's input, so it sits in this stage's resources */
      return last ? [h.carry, { ...last, id: `${last.id}-in-${R.stageId}`, stageId: R.stageId, mine: false }] : undefined;
    }
    return ['rates', rateRef()];
  };
  const hand = (h: Hand, chat = true) => {
    const got = handRef(h);
    if (!got) return;
    const [key, ref] = got;
    R.hands[key] = ref;
    bank.set(ref.id, ref);
    patch((s) => (s.files.some((f) => f.id === ref.id) ? {} : { files: [...s.files, ref] }));
    if (chat) addMsg({ from: 'her', file: ref });
  };
  const firstStep = (): string | undefined => R.def?.flow[0]?.id ?? (R.s2 ? S2_STEP : undefined);
  const brief = async () => {
    if (R.briefed) return;
    R.briefed = true;
    const o = OPENERS[pid()]?.[R.stageId];
    if (!o) return;
    const step = firstStep();
    /* b20 (his note: "the issues and resources should be shown from the start"): the to-dos and the files are on the left
       before she says a word; her lines still hand each file in the chat */
    revealStep(step, false);
    o.lines.forEach((l) => typeof l !== 'string' && hand(l, false));
    /* b20: her opening reads at a talking pace, a hello first, a beat of dots before each line */
    const slow = { per: 72, cap: 5200, dots: true };
    await W(900);
    await her(get().doneStages.length ? HELLO_NEXT : HELLO_FIRST, { ...slow, wait: 1100 });
    for (const l of o.lines) {
      if (typeof l !== 'string') {
        await W(420);
        hand(l);
        continue;
      }
      await her(l, { speak: true, ...slow, wait: 900 + Math.min(700, l.length * 8) });
    }
    if (instant || fast) return;
    await her(PLAN_ASK, { speak: true, ...slow, wait: 1200 });
    const said = await new Promise<string>((r) => {
      R.plan = r;
    });
    R.plan = undefined;
    await W(420);
    const lost = STUCK.test(said) || /^(no|nope|nah|you tell me|tell me)\b/i.test(said);
    const steer = o.plan?.steer ?? PLAN_STEER;
    if (!lost && o.plan?.hit.test(said)) await her(PLAN_GOOD, { speak: true });
    else await her(`${lost ? PLAN_STUCK_LEAD : PLAN_STEER_LEAD} ${steer}`, { speak: true });
  };
  /* a dev jump lands after she opened it */
  const seedBrief = () => {
    if (R.briefed) return;
    R.briefed = true;
    OPENERS[pid()]?.[R.stageId]?.lines.forEach((l) => (typeof l === 'string' ? addMsg({ from: 'her', text: l }) : hand(l)));
  };
  /* the file she already handed you in the opening is not handed twice */
  const handed = (key: string) => {
    const id = R.sc.files[key]?.id;
    return !!id && Object.values(R.hands).some((f) => f.id === id);
  };

  const fillSlot = (stepId: string, slotId: string, o: FillOpts = {}) => {
    const was = get().stage?.steps.find((x) => x.id === stepId)?.slots.find((x) => x.id === slotId);
    const now = Date.now();
    patch((st) => ({
      lastSlotAt: now,
      lastSlotId: slotId,
      stuck: false,
      steps: st.steps.map((s) => {
        if (s.id !== stepId) return s;
        const me = s.slots.find((x) => x.id === slotId);
        if (!me) return s;
        const done = { ...me, filled: true, label: o.label ?? me.label, value: o.value ?? me.value, verified: !o.told, said: o.said, proof: o.proof, note: o.note };
        /* cells fill from the start, so an empty cell never hints at which answer is left */
        const before = s.slots.filter((x) => x.filled && x.id !== slotId);
        const after = s.slots.filter((x) => !x.filled && x.id !== slotId);
        return { ...s, revealed: true, slots: [...before, done, ...after] };
      }),
    }));
    if (o.ting !== false) tingNow();
    const step = stage().steps.find((x) => x.id === stepId);
    if (step?.kind === 'find' && step.slots.filter((x) => x.filled).length === 3) devMark('issues-3');
    const slot = step?.slots.find((x) => x.id === slotId);
    if (step && slot && was && !was.filled) slotXp(step, slot, o);
    /* right, in your own words: she reacts on your line before she answers */
    if (step && was && !was.filled && !o.told && o.ting !== false && !instant) react(stage().msgs, emojiFor(step, step.slots.every((x) => x.filled)), fillLine(step, slotId));
    /* found another way: its card, if one is open, is played */
    patch((s) => (s.msgs.some((m) => m.game && !m.game.done && R.games[m.id]?.slotId === slotId)
      ? { msgs: s.msgs.map((m) => (m.game && !m.game.done && R.games[m.id]?.slotId === slotId ? { ...m, game: { ...m.game, done: true } } : m)) }
      : {}));
  };
  const landSlot = async (stepId: string, slotId: string, o: FillOpts = {}) => {
    fillSlot(stepId, slotId, o);
    await W(260);
  };

  /* ---------- she comes back if you go quiet ---------- */
  let typedAt = 0;
  const nudge = () => {
    if (!R?.def || get().screen !== 'stage' || stage().phase !== 'work' || R.idled === R.si) return;
    const ui = get().ui;
    if (R.yn || R.film || ui.bigSide === 'preview' || ui.pipBody === 'preview' || Date.now() - typedAt < 60000) return resetIdle();
    R.idled = R.si;
    void queue(() => her(stepDef()?.kind === 'submit' ? 'Still with me? Tell me where you got to.' : "Still with me? Tell me what you're seeing."));
  };
  const resetIdle = () => {
    idleOff?.();
    idleOff = null;
    if (!R?.def || fast || instant || stage().phase !== 'work') return;
    idleOff = later(60000, nudge);
  };

  /* ---------- entering a step: she says what she needs, and the slots land on her word ---------- */
  const revealAt = (s: StepDef): { line: number; word: number } | undefined => {
    const mark = s.reveal;
    if (!mark) return undefined;
    let li = 0;
    for (const l of s.open) {
      if (typeof l !== 'string') continue;
      const at = l.indexOf(mark);
      if (at >= 0) return { line: li, word: wordStarts(l).filter((c) => c < at + mark.length).length };
      li++;
    }
    return undefined;
  };

  const sayLines = async (s: StepDef) => {
    const mark = revealAt(s);
    let li = 0;
    for (const l of s.open) {
      if (typeof l !== 'string') {
        if (handed(l.file)) continue;
        await W(160);
        share(l.file);
        continue;
      }
      const mine = li++;
      const on = mark && mark.line === mine ? (n: number) => n >= mark.word && revealStep(s.id) : undefined;
      await her(l, { speak: true, onN: on });
      /* no word to land on: they land as her first line ends */
      if (!mark && mine === 0) revealStep(s.id);
    }
    revealStep(s.id);
  };

  const OPEN_MARK: Partial<Record<StepDef['kind'], string>> = { prompt: 'prompt', submit: 'submit' };

  const enter = async () => {
    const s = stepDef();
    if (!s) return;
    hushed = false;
    syncSteps();
    resetIdle();
    const mark = OPEN_MARK[s.kind];
    if (mark) devMark(mark);
    if (instant || fast) revealStep(s.id, false);
    if (R.si === 0) await brief();
    if (s.concept && R.concept[s.id] === undefined) await concept(s);
    await sayLines(s);
    R.entered[R.si] = true;
    syncSteps();
    if (guideOn()) await guide();
  };

  /* Yes or No: a new concept. No plays the explainer right there */
  const concept = async (s: StepDef) => {
    const c = s.concept!;
    await her(c.ask, { options: YES_NO, speak: true });
    const a = await new Promise<'yes' | 'no'>((r) => {
      R.yn = r;
    });
    R.concept[s.id] = a;
    if (a === 'yes') {
      await her(c.yes, { speak: true });
      return;
    }
    await her(c.nope ?? "No problem. Here's a quick one.", { speak: true });
    const film = FILMS[c.no];
    if (!film) return;
    addMsg({ from: 'her', film: { id: film.id, title: film.title, seen: false } });
    setUi({ filmId: film.id });
    await new Promise<void>((res) => {
      R.film = res;
    });
  };

  const answerYN = (a: 'yes' | 'no') => {
    const res = R.yn;
    if (!res) return;
    R.yn = null;
    patch((s) => ({ msgs: s.msgs.map((m) => (m.options?.[0]?.id === 'yes' ? { ...m, options: undefined } : m)) }));
    addMsg({ from: 'me', text: a === 'yes' ? 'Yes' : 'No' });
    res(a);
  };

  const nextStep = async () => {
    R.si++;
    R.pTries = 0;
    R.pText = '';
    R.pendingDraft = undefined;
    if (stage().stuck) patch({ stuck: false });
    syncSteps();
    await W(280);
    await enter();
  };

  /* ---------- I don't know, twice: she plays it out with you on a card ---------- */
  const openCard = (slotId: string) => get().stage?.msgs.find((m) => m.game && !m.game.done && R.games[m.id]?.slotId === slotId);
  const playOut = async (stepId: string, slotId: string, label: string, def: GameDef, o: { s2?: boolean; lead?: string } = {}) => {
    if (openCard(slotId)) return her(CARD_LINE);
    await her(o.lead ?? "Let's play it out.", { speak: true });
    const m = addMsg({ from: 'her', game: { id: def.id } });
    R.games[m.id] = { stepId, slotId, label, s2: o.s2 };
    if (!o.s2) devMark('game');
  };
  const gameOf = (slotId: string) => gameFor(pid(), slotId);

  /* ---------- the ten: you say it, it ticks ---------- */
  const landIssue = (s: FindStepDef, it: Issue, told?: boolean, said?: string) =>
    landSlot(s.id, it.id, { label: it.label, told, said: told ? undefined : said, proof: fact(it.ask[2]), note: it.why });

  /* what landed, said back the way she'd say it: "the blank currencies and the negative prices" */
  const named = (got: Issue[]) => {
    const w = got.map((i) => i.said ?? lc(i.label));
    return w.length < 2 ? w[0] ?? '' : `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}`;
  };
  const cap = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);
  const COUNT_WORD = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const praise = (got: Issue[]) => {
    const x = named(got);
    if (got.length === 1)
      return rot('pr', [`Loved it, you spotted ${x} really well.`, `Nice catch. ${cap(x)}, that's a big one.`, `Yes, ${x}. Good eye.`, `That's it, ${x}. Nicely done.`]);
    if (got.length === 2) return rot('pr2', [`Nice, that's two at once. ${cap(x)}, both in.`, `Love that. ${cap(x)}, you got both.`]);
    return `Okay, you're on a roll. ${cap(x)}, all ${COUNT_WORD[got.length] ?? got.length} in.`;
  };

  /* the next thing to look at, asked as a question. It points, it never answers */
  const LEADS = ['Now, ', 'Next, ', 'Okay, so '];
  const direct = (s: FindStepDef, vague?: boolean) => {
    const other = vague ? s.blanks?.find((id) => !isFound(id)) : undefined;
    if (other) {
      R.dir = other;
      return rot('gaps', ["And those gaps aren't only in one column. Where else do you see blanks?", 'Those blanks show up in more than one place, though. Where else?']);
    }
    const open = s.order.filter((o) => !isFound(o));
    if (!open.length) return '';
    const was = R.dir && open.includes(R.dir) ? s.items.find((i) => i.id === R.dir) : undefined;
    /* she asked this one last time and you went elsewhere: she comes back to it once with a pointer, then lets it rest */
    if (was && !R.hinted[was.id]) {
      R.hinted[was.id] = true;
      R.miss[was.id] = Math.max(R.miss[was.id] || 0, 1);
      return rot('back', ['Okay, back to my question. ', "Let's not skip my question, though. "]) + was.ask[1];
    }
    const id = open.find((o) => o !== was?.id && !R.hinted[o]) ?? open.find((o) => o !== was?.id) ?? open[0];
    const t = s.items.find((i) => i.id === id);
    if (!t) return '';
    R.dir = t.id;
    return rot('lead', LEADS) + lc(t.ask[0]);
  };

  /* every answer gets a warm line back that names what landed, then the next question. She never stops on praise */
  const afterFind = async (s: FindStepDef, lead?: string, o: { vague?: boolean } = {}) => {
    const n = left();
    if (n <= 0) {
      await her(lead ? `${lead} ${s.done}` : s.done, { speak: !lead });
      await nextStep();
      return;
    }
    const tail = n === 5 ? "That's half of them." : n === 1 ? 'Just one left.' : '';
    const line = [lead, tail].filter(Boolean).join(' ');
    if (line) await her(line);
    if (guideOn()) return askMcq(s);
    const next = direct(s, o.vague);
    if (next) await her(next);
  };

  /* one message, many findings: split on commas, full stops and "and" so each finding keeps its own words */
  const clauses = (t: string) =>
    t
      .split(/[,;.!?\n]+|\s+(?:and|also|plus|or)\s+/i)
      .map((x) => x.trim())
      .filter(Boolean);
  const idsIn = (t: string) => (t.match(/SP-?\s?\d{5}/gi) || []).map((x) => 'SP-' + x.replace(/\D/g, ''));

  const onFind = async (text: string, s: FindStepDef) => {
    const t = text.trim();
    /* she asked for an example of a duplicate */
    if (R.askDup) {
      const dup = s.items.find((i) => i.id === 'dups')!;
      const ids = idsIn(t);
      if (ids.some((i) => RAW.dupIds.includes(i))) {
        R.askDup = null;
        await landIssue(s, dup);
        await afterFind(s, 'Oh, yeah, totally.');
        return;
      }
      if (ids.length) {
        R.askDup.tries++;
        if (R.askDup.tries < 2) {
          await her(`${ids[0]} is only in there once. Look again.`);
          return;
        }
      }
      if (STUCK.test(t) || R.askDup.tries >= 1) {
        const x = RAW.map.dups[0];
        R.askDup = null;
        await landIssue(s, dup, true);
        await afterFind(s, `${x.id} is on rows ${x.rows[0]} and ${x.rows[1]}. Same customer, counted twice.`);
        return;
      }
      R.askDup.tries++;
      await her('Give me one id that shows up twice.');
      return;
    }
    if (SCREENQ.test(t)) return her(NO_SCREEN);
    if (WHERE.test(t)) {
      await her('Here it is. Click it to look inside, or download it.');
      share('raw');
      return;
    }
    if (COUNT.test(t)) {
      const n = left();
      return her(n === 1 ? 'Just one left.' : `${n} to go.`);
    }
    if (FIXQ.test(t)) return her("We'll fix them all in one go in a minute. For now just find them.");
    /* the curveball, if they see it early */
    if (/currenc/i.test(t) && /match|mismatch|wrong|usd|dollar/i.test(t) && !/blank|missing|empty/i.test(t)) {
      return her("Good eye. That one isn't on my list of ten, but hold on to it. It's going to matter. What else?");
    }
    const tgt = aim(s);
    if (ANSWER.test(t) && tgt) {
      await landIssue(s, tgt, true);
      await afterFind(s, tgt.ask[2]);
      return;
    }
    /* read all of it: every issue named lands its own slot, and a vague "gaps" lands the blanks */
    const parts = clauses(t);
    const hits = s.items.filter((i) => !isFound(i.id) && i.find(t));
    const blank = s.vague && s.blanks && !hits.some((i) => s.blanks!.includes(i.id))
      ? parts.some((p) => s.vague!.test(p) && !s.items.some((i) => s.blanks!.includes(i.id) && i.find(p)))
        ? s.items.find((i) => s.blanks!.includes(i.id) && !isFound(i.id))
        : undefined
      : undefined;
    const vagueWords = blank ? parts.map((p) => p.match(s.vague!)?.[0]).filter(Boolean).join(', ') : undefined;
    if (blank) hits.push(blank);
    if (hits.length) {
      const dup = hits.find((i) => i.id === 'dups');
      const rest = hits.filter((i) => i !== dup);
      for (const i of rest) await landIssue(s, i, false, i === blank ? vagueWords : parts.find((p) => i.find(p)) ?? t);
      if (dup) {
        /* in stuck mode she never ends on an open question, so naming it is enough */
        if (idsIn(t).some((i) => RAW.dupIds.includes(i)) || guideOn()) {
          await landIssue(s, dup, false, parts.find((p) => dup.find(p)) ?? t);
          await afterFind(s, rest.length ? praise(hits) : 'Oh, yeah, totally.', { vague: !!blank });
          return;
        }
        R.askDup = { tries: 0 };
        await her((rest.length ? praise(rest) + ' ' : '') + "Oh, and what's an example of a duplicate?");
        return;
      }
      if (rest.length === 1 && left() > 0 && (R.rot.pr ?? 0) % 3 === 1) {
        await afterFind(s, praise(rest) + ' ' + rest[0].why, { vague: !!blank });
        return;
      }
      await afterFind(s, praise(rest), { vague: !!blank });
      return;
    }
    if (s.items.some((i) => isFound(i.id) && i.find(t))) return her(rot('again', s.again));
    if (HI.test(t)) return her('Hey. Open the file and tell me what stands out.');
    if (OK.test(t)) return her('Good. Tell me what you see.');
    /* close, but not there yet */
    for (const i of s.items) {
      if (isFound(i.id) || !i.part) continue;
      const p = i.part(t);
      if (p && R.partOf[i.id] !== 2) {
        R.partOf[i.id] = (R.partOf[i.id] || 0) + 1;
        if (R.partOf[i.id] === 2) {
          R.hinted[i.id] = true;
          return her("Okay, here's a hint. " + i.ask[1]);
        }
        return her(p);
      }
    }
    if (!tgt) return;
    /* a wrong guess gets one short line back, warm before it moves on (his note, b14: "always acknowledge, even if it's good
       or bad"). Saying you don't know climbs the ladder: ask, then the card (or a hint), then say it */
    if (!STUCK.test(t))
      return her(
        rot('nope', [
          'Good look, but that one checks out. What else do you see?',
          'I can see why that caught your eye. It holds up, though. What else jumps out?',
          'Fair check, and that one is fine. Keep looking, what else?',
        ])
      );
    if (openCard(tgt.id)) return her(CARD_STUCK);
    R.miss[tgt.id] = (R.miss[tgt.id] || 0) + 1;
    const lvl = R.miss[tgt.id];
    /* her last direction already asked the first question, so the first "I don't know" gets the hint */
    if (lvl <= 1 && R.dir !== tgt.id) return her(tgt.ask[0]);
    if (lvl <= 1) {
      R.hinted[tgt.id] = true;
      return her("Okay, here's a hint. " + tgt.ask[1]);
    }
    if (lvl === 2) {
      const g = gameOf(tgt.id);
      if (g) return playOut(s.id, tgt.id, tgt.label, g);
      if (!R.hinted[tgt.id]) {
        R.hinted[tgt.id] = true;
        return her("Okay, here's a hint. " + tgt.ask[1]);
      }
    }
    await landIssue(s, tgt, true);
    await afterFind(s, "Here's how I'd think about it. " + tgt.ask[2]);
  };

  /* ---------- the prompt: you write it with her, it lands in its own slot ---------- */
  const approvePrompt = async (s: PromptStepDef, text: string, told?: boolean) => {
    R.prompt[s.id] = text;
    await her(s.ok);
    fillSlot(s.id, s.id, { value: text, told });
    deliver(promptRef(s.id, s.label, text), whereOf(s.label), `slot:${s.id}`);
    await W(420);
    await nextStep();
  };

  const offerDraft = async (s: PromptStepDef, o: { lead?: string; label?: string } = {}) => {
    if (o.lead !== '') await her(o.lead ?? 'Okay, try this instead.');
    /* b14: in stuck mode her ready prompt carries the step's keys too, so it never ends on Use alone */
    const use: Option[] = guideOn()
      ? [{ id: 'use', label: o.label ?? useLabel() }, ...guidePicks(guideKey())]
      : [{ id: 'use', label: o.label ?? 'Use this' }];
    const live = !fast && !instant;
    const m = addMsg({ from: 'her', text: s.draft, draft: true, options: live ? undefined : use }, { stream: live });
    R.pendingDraft = m.id;
    if (!live) return;
    const g = gen;
    await streamOut(m, { cap: 1600 });
    if (g !== gen) throw new Cancelled();
    patch((st) => ({ msgs: st.msgs.map((x) => (x.id === m.id ? { ...x, options: use } : x)) }));
  };

  const useDraft = async (s: PromptStepDef) => {
    const id = R.pendingDraft;
    if (!id) return;
    R.pendingDraft = undefined;
    patch((st) => ({ msgs: st.msgs.map((m) => (m.id === id ? { ...m, options: undefined } : m)) }));
    R.pText = s.draft;
    await approvePrompt(s, s.draft, true);
  };

  const onPrompt = async (text: string, s: PromptStepDef) => {
    const t = text.trim();
    if (R.pendingDraft && /^(use (this|it|that)|yes|yeah|yep|ok|okay|looks good|sure)\b/i.test(t) && t.length < 30) return useDraft(s);
    /* a full prompt that says help or you write is still a prompt */
    if (t.length < 80 && (WRITE.test(t) || STUCK.test(t))) {
      R.pTries++;
      if (R.pTries >= 2 || /write|give me/i.test(t)) return offerDraft(s);
      return her('Start with the list. Tell Claude what the file is, then every fix you want, one by one.');
    }
    if (SCREENQ.test(t)) return her(NO_SCREEN);
    if (HI.test(t) || OK.test(t)) return her('What would you say to Claude?');
    /* what you add builds on what you wrote. It only starts over if the new one covers everything the old one did */
    const old = R.pText;
    const rewrite = !!old && t.length >= 60 && s.rubric.every((r) => !r.test.test(old) || r.test.test(t));
    const before = old ? s.rubric.filter((r) => r.test.test(old)).length : 0;
    R.pText = old && !rewrite ? old + '\n' + t : t;
    const whole = R.pText;
    const have = s.rubric.filter((r) => r.test.test(whole));
    const missing = s.rubric.filter((r) => !r.test.test(whole));
    const moved = have.length > before;
    if (have.length < s.need) {
      /* she never asks the same thing the same way twice: question, then hint, then a draft */
      if (!moved) R.pTries++;
      if (R.pTries >= 3) return offerDraft(s);
      if (!old && have.length < Math.min(3, s.rubric.length - 1)) return her(s.thin);
      /* a moved prompt gets the next gap, never the same sentence twice in a row */
      const gap = missing.find((m) => m.id !== R.pGap) ?? missing[0];
      R.pGap = gap.id;
      if (!moved) return her("Okay, here's a hint. " + gap.miss);
      return her(rot('ppart', ['Good start. ', "You're on the right track. ", 'Nice. Almost. ', 'Better. ']) + gap.miss);
    }
    if (s.output && !s.output.test(whole)) return her(s.outputMiss ?? 'Good. Now what do you want back? Be specific.');
    return approvePrompt(s, whole);
  };

  /* ---------- a single thing she asks for: a link, or just telling her you have it ---------- */
  const onAsk = async (text: string, s: AskStepDef) => {
    const t = text.trim();
    if (s.takes === 'link') {
      const u = t.match(/(https?:\/\/)?(www\.)?github\.com\/[\w.-]+\/[\w.-]+/i);
      if (!u) return her(rot('nolink', [s.nolink ?? '', 'I just need the link.']));
      const g = gen;
      /* a loader only when the check really takes longer than 2 s */
      const slow = later(2000, () => {
        if (g === gen) patch({ typing: true });
      });
      let res: VerifyResult;
      try {
        res = await s.verify!(u[0], R.ctx);
      } catch {
        res = { ok: true, limited: true };
      }
      slow();
      if (g !== gen) throw new Cancelled();
      if (stage().typing) patch({ typing: false });
      if (!res.ok) return her(res.say ?? "I can't access this link. Make it public.");
      const full = /^https?:\/\//i.test(u[0]) ? u[0] : `https://${u[0]}`;
      const had = stage().files.find((f) => f.kind === 'link' && f.mine && f.url === full);
      deliver(had ?? linkRef(u[0], true), whereOf(s.label), `slot:${s.id}`);
      await landSlot(s.id, s.id, { value: u[0], told: res.limited });
      await her(res.limited ? "GitHub won't let me check it right now, so I'm taking your word for it." : s.ok);
      await nextStep();
      return;
    }
    if (s.yes?.test(t)) {
      await landSlot(s.id, s.id);
      await her(s.ok);
      await nextStep();
      return;
    }
    if (STUCK.test(t) || /where|how/i.test(t)) return her(s.help ?? '');
    return her(s.remind ?? '');
  };

  /* ---------- while you go make it ---------- */
  const onRun = async (text: string, s: StepDef) => {
    const t = text.trim();
    const help = s.kind === 'submit' ? s.runHelp : undefined;
    if (SCREENQ.test(t)) return her(NO_SCREEN);
    if (/\b(done|finished|got it|ready|have it|it'?s ready)\b/i.test(t)) return her(`Good. Hit Submit and send me the ${/^[A-Z][a-z]+[A-Z]/.test(s.label) ? s.label : s.label[0].toLowerCase() + s.label.slice(1)}.`);
    if (/what (is|was) the prompt|where.*prompt|copy.*prompt/i.test(t)) return her("It's in the slot. Hit copy.");
    if (/\bclaude\b|how|where|what/i.test(t)) return her(help ?? 'Paste the prompt into Claude, attach the raw file, and send it. Then bring the file back here.');
    if (HI.test(t) || OK.test(t)) return her("Go for it. I'm here if you get stuck.");
    return her(help ?? 'Run it in Claude and send me what you get. If it looks off, ask me.');
  };

  /* ---------- submit ---------- */
  const canSubmit = () => {
    const s = get().stage;
    if (!s || !R?.def) return false;
    if (s.phase === 'work') return stepDef()?.kind === 'submit';
    return s.phase === 'feedback' && R.resub;
  };

  /* the wait names what she is really doing, with the real numbers from what you handed in */
  const waitSteps = (sub: Submission, isLink: boolean): Array<{ label: string; detail?: string; ms: number }> => {
    if (isLink) {
      const files = R.ctx.repo?.files;
      const path = (sub.url ?? sub.name).replace(/^https?:\/\/(www\.)?/, '');
      return [
        { label: 'Opening the repo', detail: path, ms: 900 },
        { label: files ? `Reading ${files.length} files` : 'Reading the files', ms: 1200 },
        { label: 'Looking for .env and index.html', ms: 1300 },
      ];
    }
    if (!sub.text) return [{ label: `Opening ${sub.name}`, ms: 2200 }];
    const t = parse(sub.text);
    const city = t.cols.map((c) => c.toLowerCase()).indexOf('billing_city');
    const cities = city >= 0 ? new Set(t.rows.map((r) => r[city]).filter(Boolean)).size : 0;
    return [
      { label: `Reading ${t.rows.length} rows`, detail: sub.name, ms: 900 },
      { label: `Checking ${t.cols.length} columns`, ms: 1100 },
      { label: cities ? `Matching prices across ${cities} cities` : 'Matching prices to markets', ms: 1400 },
    ];
  };

  const reviewFlow = async (sub: Submission, isLink: boolean, was: string[]) => {
    const def = R.def!;
    await her(rot('rd', ['Give me a sec.', 'Okay, let me read it.']));
    const steps = waitSteps(sub, isLink);
    patch({ wait: { at: Date.now(), steps } });
    await W(steps.reduce((a, x) => a + x.ms, 0));
    const g = gen;
    let r: ReviewResult;
    try {
      r = await def.review(sub, R.ctx);
    } catch {
      r = { items: [], total: 0, limited: true };
    }
    if (g !== gen) throw new Cancelled();
    patch({ wait: undefined });
    if (r.items.length) {
      if (r.items.some((x) => x.id === 'mismatch')) R.sawMismatch = true;
      const still = r.items.filter((x) => was.includes(x.id));
      R.fbItems = r.items;
      R.resub = false;
      patch({
        phase: 'feedback',
        submitOpen: false,
        fbOpen: undefined,
        feedback: r.items.map((x) => ({ id: x.id, one: x.one, what: x.what, why: x.why, how: x.how, checked: false })),
      });
      devMark('feedback');
      await her(
        still.length
          ? `You ticked ${still.length === 1 ? 'one' : still.length} of these, but ${still.length === 1 ? "it's" : "they're"} still in the file. ${still[0].one}`
          : def.reviewSay(r)
      );
      if (guideOn()) await guide(true);
      return;
    }
    R.fbItems = [];
    const last = def.flow[def.flow.length - 1];
    patch({
      phase: 'approved',
      feedback: [],
      fbOpen: undefined,
      submitOpen: false,
      submitted: { name: sub.name || sub.url || '', isLink, stats: r.stats ? def.stats(r) : undefined },
    });
    fillSlot(last.id, last.id, { value: sub.name || sub.url, told: r.limited, xp: false });
    syncSteps();
    devMark('approved');
    pay(XP.approved, `Approved: ${lc(def.deliverable.label)}`, 'approved', '.zs2-fileline');
    await her(r.limited ? "GitHub won't let me read it right now, so I'm taking your word on this one. I have a few questions now." : def.approve, { voice: !r.limited });
    if (guideOn()) await guide(true);
  };

  const kindOf = (name: string, type = ''): FileRef['kind'] =>
    /^image\//.test(type) || /\.(png|jpe?g|gif|webp)$/i.test(name) ? 'image' : /\.csv$/i.test(name) || type === 'text/csv' ? 'csv' : 'text';

  const upRef = (sub: Submission, blob?: Blob): FileRef => {
    const kind = kindOf(sub.name, blob?.type);
    let url: string | undefined;
    try {
      if (blob && kind === 'image') url = URL.createObjectURL(blob);
      else if (sub.text !== undefined) url = URL.createObjectURL(blob ?? new Blob([sub.text], { type: 'text/csv' }));
    } catch {
      url = undefined;
    }
    const ref: FileRef = { id: `up${++fileSeq}`, name: sub.name, meta: sub.meta ?? '', kind, url, text: sub.text, stageId: R.stageId, mine: true };
    bank.set(ref.id, ref);
    patch((s) => ({ files: [...s.files, ref] }));
    return ref;
  };

  /* a link is a card too: host and path, opened in the preview */
  const linkRef = (url: string, mine: boolean): FileRef => {
    const full = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const ref: FileRef = { id: `ln${++fileSeq}`, name: full.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''), meta: 'Link', kind: 'link', url: full, stageId: R.stageId, mine };
    bank.set(ref.id, ref);
    patch((s) => ({ files: [...s.files, ref] }));
    return ref;
  };

  const beginReview = (sub: Submission, isLink: boolean, blob?: Blob, from?: string) => {
    const was = stage().feedback.filter((x) => x.checked).map((x) => x.id);
    R.resub = false;
    R.subs++;
    R.lastSub = { sub, isLink, was };
    patch({ phase: 'review', submitOpen: false, submitted: { name: sub.name, isLink } });
    const ref = isLink ? linkRef(sub.url ?? sub.name, true) : upRef(sub, blob);
    addMsg({ from: 'me', file: ref });
    deliver(ref, whereOf(R.def?.deliverable.label ?? 'Deliverable'), from ?? 'submit');
    resetIdle();
    return queue(() => reviewFlow(sub, isLink, was));
  };

  const onFb = async (text: string) => {
    const t = text.trim();
    if (SCREENQ.test(t)) return her(NO_SCREEN);
    const list = stage().feedback;
    const open = list.filter((x) => !x.checked);
    /* the one you named, else the first or second you pointed at, else the one you have open or haven't ticked yet */
    const named = R.fbItems.find((x) => (ABOUT[x.id] ?? x.about ?? /$^/).test(t));
    const pointed = /\b(first|1st)\b/i.test(t) ? R.fbItems[0] : /\b(second|2nd)\b/i.test(t) ? R.fbItems[1] : undefined;
    const inFocus = R.fbItems.find((x) => x.id === stage().fbOpen) ?? R.fbItems.find((x) => open.some((o) => o.id === x.id));
    const asking = /\?|\b(how|why|what|which|where|mean|wrong|fix)\b/i.test(t);
    const hit = named ?? (R.fbItems.length === 1 ? R.fbItems[0] : undefined) ?? pointed ?? (asking ? inFocus : undefined);
    if (hit) {
      patch({ fbOpen: hit.id });
      return her(/\bwhy\b/i.test(t) ? hit.why : /\bwhat\b/i.test(t) && !/\bhow\b/i.test(t) ? hit.what : hit.how);
    }
    if (/done|fixed|ready/i.test(t)) return her(open.length ? "Tick it off when it's done. Then you can resubmit." : 'Good. Drop the new file in.');
    return her("Which one? Ask me about it and I'll tell you how I'd do it.");
  };

  /* ---------- stage POU: lines you unlock by saying them ---------- */
  const syncPou = (patchLine?: { i: number; told: boolean }) => {
    patch((s) => {
      const lines = s.pou.lines.map((l, i) => (patchLine && i === patchLine.i ? { ...l, said: true, told: patchLine.told } : l));
      return { pou: { ...s.pou, lines, asking: R.pouI, progress: lines.length ? lines.filter((l) => l.said).length / lines.length : 0 } };
    });
  };

  const pouAsk = async () => {
    const q = R.pouList[R.pouI];
    if (q) await her(q.q, { voice: true });
  };

  const pouStart = async () => {
    const c = R.def!.pou;
    const pick = c.curve.filter((x) => !x.when || x.when({ sawMismatch: R.sawMismatch })).slice(0, 1);
    R.pouList = [...c.lines, ...pick];
    R.pouI = 0;
    R.pouTries = 0;
    R.pouAcc = '';
    R.slop = 0;
    patch({
      phase: 'pou',
      pou: { lines: R.pouList.map((q) => ({ k: q.k, text: q.text, said: false })), asking: 0, progress: 0, recording: get().ui.listening },
    });
    devMark('pou-stage');
    await pouAsk();
  };

  const markDone = () => {
    const d = get().doneStages;
    if (!d.includes(R.stageId)) set({ doneStages: [...d, R.stageId] });
  };

  const pouEnd = async () => {
    patch({ phase: 'done' });
    devMark('done');
    markDone();
    syncSteps();
    await W(400);
    await celebrate(stage().submitted?.name ?? R.def!.deliverable.name ?? R.def!.deliverable.label);
  };

  const coachText = () => {
    const p = R.sc.meta.id === 'amazon' ? "he's" : "she's";
    return `That's three answers in a row that read like Claude wrote them. Faster, I get it. But ${p} asking so you can do this in an interview with no tab open. Close it and say it badly, in your own words.`;
  };

  const pouHeard = async (text: string) => {
    const q = R.pouList[R.pouI];
    if (!q) return;
    const t = text.trim();
    patch({ coach: undefined });
    if (SLOP.test(t) || t.split(/\s+/).length > 70) {
      R.slop++;
      if (R.slop < 3) {
        return her(R.slop === 1 ? "That sounded pasted. Tell me like you'd tell a friend." : 'Still reads like a doc. Your own words, even if it comes out messy.', { voice: true });
      }
      /* the coach is a different person. He lets you slip twice and comes in on the third */
      patch({ coach: { name: 'Navid', face: 'static/faces/navid.jpg', text: coachText() } });
      R.slop = 0;
      return her(q.q, { voice: true });
    }
    R.pouAcc += ' ' + t;
    if (q.hear.every((r) => r.test(R.pouAcc)) && R.pouAcc.trim().split(/\s+/).length >= 4) {
      const i = R.pouI;
      R.pouI++;
      R.pouTries = 0;
      R.pouAcc = '';
      syncPou({ i, told: false });
      tingNow();
      pay(XP.pouLine, `Said: ${q.k.toLowerCase()}`, `pou:${i}`, `[data-pou="${i}"]`);
      if (R.pouI >= R.pouList.length) return pouEnd();
      await her(rot('pok', ['Okay, got it.', 'Exactly.', "Yes. That's it."]), { wait: 500, voice: true });
      await pouAsk();
      return;
    }
    R.pouTries++;
    if (R.pouTries <= q.more.length) return her(q.more[R.pouTries - 1], { voice: true });
    /* she fills the gap. The mark stays white: green means verified only */
    const i = R.pouI;
    R.pouI++;
    R.pouTries = 0;
    R.pouAcc = '';
    syncPou({ i, told: true });
    pay(XP.told, `Told: ${q.k.toLowerCase()}`, `pou:${i}`, `[data-pou="${i}"]`);
    await her(`Okay. ${q.say} Keep that one.`, { voice: true });
    if (R.pouI >= R.pouList.length) return pouEnd();
    await pouAsk();
  };

  /* ---------- stage 2: three rounds, each a card you play, then the model she hands back ---------- */
  const s2Steps = (d: Stage2Def): Step[] => [
    {
      id: S2_STEP,
      label: 'Model each market',
      kind: 'find',
      state: 'now',
      slots: d.slots.map((x): Slot => ({ id: x.id, stepId: S2_STEP, kind: 'issue', label: x.label, named: true, filled: false })),
    },
    { id: S2_OUT, label: 'Revenue model', kind: 'ask', state: 'next', slots: [{ id: S2_OUT, stepId: S2_OUT, kind: 'file', label: '', filled: false }] },
  ];
  const s2Lead = (i: number, d: Stage2Def) => `${S2_LEAD[i] ?? 'Next, '}${lc(d.slots[i].label)}.`;
  const s2Open = () => {
    const step = get().stage?.steps.find((x) => x.id === S2_STEP);
    return R.s2?.slots.findIndex((x) => !step?.slots.some((y) => y.id === x.id && y.filled)) ?? -1;
  };

  const s2Enter = async () => {
    const d = R.s2;
    if (!d) return;
    hushed = false;
    syncSteps();
    devMark('model');
    if (instant || fast) revealStep(S2_STEP, false);
    if (OPENERS[pid()]?.[R.stageId]) await brief();
    else {
      for (let i = 0; i < d.opener.length; i++) {
        const last = i === d.opener.length - 1;
        await her(d.opener[i], { speak: true, onN: last ? (n: number) => n >= 2 && revealStep(S2_STEP) : undefined });
      }
    }
    revealStep(S2_STEP);
    R.entered[0] = true;
    await s2Next();
  };

  const s2Next = async () => {
    const d = R.s2;
    if (!d) return;
    const i = s2Open();
    if (i < 0) return s2Done();
    const slot = d.slots[i];
    devMark(`model:${i + 1}`);
    if (openCard(slot.id)) return;
    await playOut(S2_STEP, slot.id, slot.label, slot.game, { s2: true, lead: s2Lead(i, d) });
  };

  const s2Done = async () => {
    const d = R.s2;
    if (!d || stage().phase === 'done') return;
    const out = d.deliverable();
    const ref = keepRef({ id: `${pid()}-${R.stageId}-out`, name: out.name, meta: out.meta, kind: 'csv', text: out.text, stageId: R.stageId, mine: true });
    R.si = 1;
    revealStep(S2_OUT, false);
    fillSlot(S2_OUT, S2_OUT, { label: out.name, value: ref.id, xp: false });
    const meta = R.sc.meta.stages.find((x) => x.id === R.stageId);
    deliver(ref, whereOf(meta?.deliverable.label ?? 'Revenue model'), `slot:${S2_OUT}`);
    patch({ phase: 'done', submitted: { name: out.name, isLink: false } });
    markDone();
    syncSteps();
    devMark('model-done');
    await W(500);
    addMsg({ from: 'her', file: ref });
    await celebrate(out.name);
  };

  const s2Route = async (t: string) => {
    if (stage().phase === 'done') return her(STUCK_LINE.done);
    if (SCREENQ.test(t)) return her(NO_SCREEN);
    if (s2Open() >= 0 && !get().stage?.msgs.some((m) => m.game && !m.game.done)) return s2Next();
    if (STUCK.test(t)) return her(CARD_STUCK);
    return her(CARD_LINE);
  };

  /* ---------- what she answers from what she truly has ---------- */
  const screenLine = () => {
    const st = stage();
    const s = stepDef();
    return R.sc.screen({
      phase: st.phase,
      stepKind: s?.kind,
      left: left(),
      promptText: R.pText,
      firstOpenHow: st.feedback.find((x) => !x.checked)?.how,
      resub: R.resub,
      surface: get().ui.surface,
      runHelp: s?.kind === 'submit' ? s.runHelp : undefined,
    });
  };

  /* I'm stuck: the next rung of what this step already carries. Never a new fact */
  const climb = async () => {
    const st = stage();
    if (!R.def && R.s2) return st.phase === 'done' ? s2Route('') : her(CARD_STUCK);
    if (!R.def) return her("That's where this prototype stops.");
    const ph = st.phase;
    const s = ph === 'work' ? stepDef() : undefined;
    if (s?.kind === 'find') {
      const tgt = aim(s);
      if (!tgt) return her(s.stuck ?? STUCK_LINE.find);
      if (openCard(tgt.id)) return her(CARD_STUCK);
      R.miss[tgt.id] = (R.miss[tgt.id] || 0) + 1;
      const lvl = R.miss[tgt.id];
      if (lvl <= 1) return her(tgt.ask[0]);
      if (lvl === 2) {
        const g = gameOf(tgt.id);
        return g ? playOut(s.id, tgt.id, tgt.label, g) : her("Okay, here's a hint. " + tgt.ask[1]);
      }
      await landIssue(s, tgt, true);
      await afterFind(s, "Here's how I'd think about it. " + tgt.ask[2]);
      return;
    }
    if (s?.kind === 'prompt') {
      R.pTries++;
      if (R.pTries >= 3) return offerDraft(s);
      if (!R.pText) return her(s.stuck ?? s.thin);
      const missing = s.rubric.filter((r) => !r.test.test(R.pText));
      const gap = missing.find((m) => m.id !== R.pGap) ?? missing[0];
      if (!gap) return her(s.stuck ?? STUCK_LINE.prompt);
      R.pGap = gap.id;
      return her("Okay, here's a hint. " + gap.miss);
    }
    if (s?.kind === 'ask') return her(s.stuck ?? s.help ?? STUCK_LINE.ask);
    if (s?.kind === 'submit') return her(s.stuck ?? s.runHelp ?? STUCK_LINE.submit);
    if (ph === 'feedback') return her(st.feedback.find((x) => !x.checked)?.how ?? STUCK_LINE.feedback);
    return her((STUCK_LINE as Record<string, string | undefined>)[ph] ?? screenLine());
  };

  /* the step or card you are on, the thing a second press counts against */
  const stuckKey = (): string | undefined => {
    if (stage().phase !== 'work') return undefined;
    if (!R.def && R.s2) {
      const i = s2Open();
      return i >= 0 ? `card:${R.s2.slots[i].id}` : undefined;
    }
    const s = stepDef();
    if (s?.kind === 'find') {
      const t = aim(s);
      return t ? `find:${t.id}` : undefined;
    }
    return s ? `step:${s.id}` : undefined;
  };
  /* the first press asks which kind of stuck it is. The second on the same thing is the card you play */
  const stuckFlow = async () => {
    const k = stuckKey();
    if (!k) return climb();
    const issue = k.startsWith('find:') ? k.slice(5) : '';
    const n = R.asked[k] ?? 0;
    R.asked[k] = n + 1;
    if (n === 0 && !(issue && (R.miss[issue] ?? 0) >= 1)) return her(STUCK_ASK, { options: STUCK_KEYS.map((o) => ({ ...o })) });
    if (issue) R.miss[issue] = Math.max(R.miss[issue] ?? 0, 1);
    const kind = R.def ? stepDef()?.kind : undefined;
    if (kind !== 'ask' && kind !== 'submit') return climb();
    /* a step with no card to play: the line, then the exact tool under it, then only the first move */
    const point = helpNow()?.point;
    if (n === 1) {
      await climb();
      return pointAt(point);
    }
    if (n >= 3) return her("Hold to talk and show me your screen. We'll do it one click at a time.");
    const tool = point ? R.hands[point]?.name : undefined;
    return her(tool ? `Just the first move. Open ${tool} and tell me what you see.` : 'Just the first move. Do the first thing I said, then tell me what you see.');
  };
  const helpNow = () => STEP_HELP[(R.def ? stepDef()?.id : R.s2 ? S2_STEP : '') ?? ''];
  /* she points at the exact file or tool, the card lands right under her line */
  const pointAt = async (key?: string) => {
    const ref = key ? R.hands[key] : undefined;
    if (!ref) return;
    await W(200);
    addMsg({ from: 'her', file: ref });
  };
  const stuckPick = async (id: string) => {
    const help = helpNow();
    if (id === 'stuck:start') {
      if (!R.def && R.s2) {
        const i = s2Open();
        const slot = i >= 0 ? R.s2.slots[i] : undefined;
        await her((slot && CARD_START[slot.id]) || CARD_STUCK);
        return pointAt(help?.point);
      }
      const before = stage().msgs.length;
      await climb();
      /* a card she dealt is the pointer, a line gets the file under it */
      if (!stage().msgs.slice(before).some((m) => m.game)) await pointAt(help?.point);
      return;
    }
    if (id === 'stuck:right') return her(STUCK_RIGHT[!R.def && R.s2 ? 'card' : (stepDef()?.kind ?? 'ask')]);
    if (id === 'stuck:word') {
      const words = (help?.words ?? []).filter((w) => WORDS[w]);
      if (!words.length) return her("Type the word and I'll explain it in one line.");
      return her(STUCK_WORD_ASK, { options: words.map((w) => ({ id: `word:${w}`, label: WORDS[w].label })) });
    }
    const w = WORDS[id.slice(5)];
    if (w) return her(w.line);
  };
  const STUCK_OPT = /^(stuck|word):/;
  const dropStuckKeys = () =>
    patch((s) => (s.msgs.some((m) => m.options?.some((o) => STUCK_OPT.test(o.id)))
      ? { msgs: s.msgs.map((m) => (m.options?.some((o) => STUCK_OPT.test(o.id)) ? { ...m, options: undefined } : m)) }
      : {}));

  /* ---------- b13 stuck mode: a switch, not a press. She lays out the exact moves, the issues become picks ---------- */
  const guideOn = () => !!get().stage?.stuckMode;
  const GP_OPT = /^gp:/;
  const KEY_OPT = /^(mcq|gp):/;
  /* her stuck mode keys go, anything else on the same line (her ready prompt's Use) stays */
  const dropMcq = () =>
    patch((s) => (s.msgs.some((m) => m.options?.some((o) => KEY_OPT.test(o.id)))
      ? {
          msgs: s.msgs.map((m) => {
            if (!m.options?.some((o) => KEY_OPT.test(o.id))) return m;
            const rest = m.options.filter((o) => !KEY_OPT.test(o.id));
            return { ...m, options: rest.length ? rest : undefined, tally: undefined };
          }),
        }
      : {}));
  const guideKey = (): string => {
    const ph = stage().phase;
    if (ph !== 'work') return ph;
    if (!R.def && R.s2) return S2_STEP;
    return stepDef()?.id ?? ph;
  };
  const useLabel = () => `Use ${R.sc.meta.manager.name}'s prompt`;
  /* one message, her moves as a numbered list, on the raised slab her ready prompt sits on */
  const guideList = async (steps: string[]) => {
    await W(260);
    const live = !fast && !instant;
    const m = addMsg({ from: 'her', text: guideText(steps), draft: true }, { stream: live });
    if (!live) return;
    const g = gen;
    await streamOut(m, { cap: 2400 });
    if (g !== gen) throw new Cancelled();
  };
  const pickOpts = (id: string): Option[] =>
    (MCQ[id]?.picks ?? []).map((p, i) => ({ id: `mcq:${id}:${i}`, label: p.label })).filter((_, i) => !(R.mcqTried[id] ?? []).includes(i));
  /* b14: a question with picks carries the score so far, a quiet "3 of 10 found" beside the keys */
  const askPicks = async (text: string, id: string) => {
    const m = await her(text, { options: pickOpts(id) });
    /* the switch went off while she was writing: her keys never land after the line that says it is off */
    if (!guideOn()) return dropMcq();
    const step = stepNow();
    if (!step) return;
    const tally = { n: step.slots.filter((x) => x.filled).length, of: step.slots.length };
    patch((st) => ({ msgs: st.msgs.map((x) => (x.id === m.id ? { ...x, tally } : x)) }));
  };
  /* the next open issue as one question with three picks. An issue with no picks gets her plain question */
  const askMcq = async (s: FindStepDef) => {
    dropMcq();
    const it = target(s);
    if (!it) return;
    R.dir = it.id;
    const q = MCQ[it.id];
    if (!q) return her(it.ask[0]);
    await askPicks(q.q, it.id);
  };
  /* a right pick lands the slot the way your own words would: her emoji on your pick, the tick, the XP, her praise naming
     it. A wrong one is answered warm first, then what would happen, then the picks left. Never a red X */
  const mcqPick = async (optionId: string) => {
    const [, id, n] = optionId.split(':');
    const s = stepDef();
    if (s?.kind !== 'find') return;
    const it = s.items.find((i) => i.id === id);
    const pick = MCQ[id]?.picks[Number(n)];
    if (!it || !pick) return;
    if (isFound(id)) return guideOn() ? askMcq(s) : undefined;
    if (pick.ok) {
      if (id === 'dups') R.askDup = null;
      await landIssue(s, it, false, pick.label);
      await afterFind(s, praise([it]));
      return;
    }
    R.mcqTried[id] = [...(R.mcqTried[id] ?? []), Number(n)];
    const back = pick.back ?? 'Look again at that cell.';
    await askPicks(MCQ_WARM.test(back) ? back : `${rot('mcqno', MCQ_NEAR)} ${back}`, id);
  };
  /* b14: in stuck mode what you type is the last key. Naming an issue lands it like a right pick. Anything else is answered
     warm, then the issue's own pointer, then the picks again, so the step still ends on keys */
  const mcqTyped = async (t: string, s: FindStepDef) => {
    const it = R.dir ? s.items.find((i) => i.id === R.dir && !isFound(i.id)) : undefined;
    const hit = s.items.some((i) => !isFound(i.id) && (i.find(t) || !!i.part?.(t)));
    const plain = [SCREENQ, WHERE, COUNT, FIXQ, ANSWER, HI, OK].some((re) => re.test(t));
    if (R.askDup || hit || plain || !it || !MCQ[it.id]) {
      await onFind(t, s);
      return;
    }
    const lead = STUCK.test(t) ? rot('mcqidk', MCQ_IDK) : rot('mcqtyped', MCQ_TYPED);
    dropMcq();
    await askPicks(`${lead} ${it.ask[1]}`, it.id);
  };
  /* b14 (his words: "in stuck mode, there should always be a pill option"): the keys a step ends on, by step or phase.
   A key you played drops off, except go and hint: those can always be pressed again */
  const guidePicks = (k: string): Option[] => {
    const used = R.pickUsed[k] ?? [];
    return (GUIDE_PICKS[k] ?? [])
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => p.act === 'go' || p.act === 'hint' || !used.includes(i))
      .map(({ p, i }) => ({ id: `gp:${k}:${i}`, label: p.label }));
  };
  /* keys already open under her lines since your last one */
  const openKeys = (): boolean => {
    const ms = stage().msgs;
    for (let i = ms.length - 1; i >= 0; i--) {
      if (ms[i].options?.length) return true;
      if (ms[i].from === 'me') return false;
    }
    return false;
  };
  /* after she answers in stuck mode the step ends on keys again: a find step asks its next question, anything else gets its
     keys under her last line since yours, or one short line that carries them */
  const pinPicks = async () => {
    if (!guideOn() || !R?.def || openKeys()) return;
    const ph = stage().phase;
    const s = ph === 'work' ? stepDef() : undefined;
    if (s?.kind === 'find') return askMcq(s);
    const opts = [...(s?.kind === 'prompt' && R.pendingDraft ? [{ id: 'use', label: useLabel() }] : []), ...guidePicks(guideKey())];
    if (!opts.length) return;
    const ms = stage().msgs;
    let host: Msg | undefined;
    for (let i = ms.length - 1; i >= 0 && ms[i].from !== 'me'; i--) {
      const m = ms[i];
      if (m.text && !m.voice && !m.sys && !m.game && !m.film) {
        host = m;
        break;
      }
    }
    if (!host) {
      await her('Pick one, or say it your way.', { options: opts });
      if (!guideOn()) dropMcq();
      return;
    }
    const id = host.id;
    patch((st) => ({ msgs: st.msgs.map((x) => (x.id === id ? { ...x, options: opts } : x)) }));
  };
  /* a key she laid out for this step. Each one is answered first, then the step's keys come back */
  const guidePick = async (optionId: string) => {
    const [, k, n] = optionId.split(':');
    const i = Number(n);
    const p = GUIDE_PICKS[k]?.[i];
    if (!p || guideKey() !== k) return pinPicks();
    if (p.act !== 'go' && p.act !== 'hint') R.pickUsed[k] = [...(R.pickUsed[k] ?? []), i];
    const ph = stage().phase;
    const s = ph === 'work' ? stepDef() : undefined;
    if (p.act === 'word') {
      const w = p.word ? WORDS[p.word] : undefined;
      await her(w ? w.line : screenLine());
    } else if (p.act === 'hint') {
      await climb();
    } else if (p.act === 'show') {
      await climb();
      await pointAt(helpNow()?.point);
    } else if (s?.kind === 'submit') {
      if (canSubmit()) {
        patch({ submitOpen: true });
        await her(GO_LINE.submit);
      } else await onRun('done', s);
    } else if (s?.kind === 'ask' && s.takes === 'link') {
      await her(GO_LINE.link);
    } else if (s?.kind === 'ask') {
      await landSlot(s.id, s.id);
      await her(s.ok);
      await nextStep();
      return;
    } else if (ph === 'feedback') await her(GO_LINE.feedback);
    else if (ph === 'approved') await her(GO_LINE.approved);
    await pinPicks();
  };
  /* b14: a line you type in stuck mode is the last key. She answers it like any line, then the keys come back */
  const guidedTurn = async (t: string, s: StepDef | undefined, ph: Phase) => {
    if (s?.kind === 'find') await mcqTyped(t, s);
    else if (s?.kind === 'prompt') await onPrompt(t, s);
    else if (s?.kind === 'ask') await onAsk(t, s);
    else if (s?.kind === 'submit') await onRun(t, s);
    else if (ph === 'feedback') await onFb(t);
    else if (ph === 'approved') await her("Whenever you're ready, hit Start POU.");
    else if (ph === 'review') return her('Still reading it. One sec.');
    else if (ph === 'pou') return pouHeard(t);
    else return her(STUCK_LINE.done);
    await pinPicks();
  };
  const guide = async (again = false) => {
    if (!guideOn() || !R) return;
    const k = guideKey();
    if (R.guided[k] && !again) return;
    R.guided[k] = true;
    const steps = GUIDE_STEPS[k] ?? GUIDE_PHASE[k];
    if (steps) await guideList(steps);
    else await her(R.def ? screenLine() : STUCK_LINE.done);
    const s = R.def && stage().phase === 'work' ? stepDef() : undefined;
    if (s?.kind === 'find') await askMcq(s);
    if (s?.kind === 'prompt' && !R.pendingDraft) await offerDraft(s, { lead: '', label: useLabel() });
    await pinPicks();
  };

  /* ---------- the end of a stage, on the stage: the tick, the XP, her line, then back to the objective ---------- */
  const celebrate = async (file: string) => {
    const line = DONE_LINE[pid()]?.[R.stageId] ?? `That's stage ${stageNo()} done.`;
    if (instant) {
      pay(XP.stageDone, `Stage ${stageNo()} done`, 'done', null, { quiet: true });
      addMsg({ from: 'her', text: line });
      return;
    }
    const g = gen;
    if (get().ui.surface === 'pip') {
      setUi({ surface: 'big' });
      patch({ unread: false });
    }
    setUi(closePanels());
    const t0 = Date.now();
    const list = get().project?.stages ?? [];
    const at = list.findIndex((x) => x.id === R.stageId);
    const after = at >= 0 ? list[at + 1] : undefined;
    const next = after ? { id: after.id, n: at + 2 } : null;
    showCele({ n: stageNo(), total: R.sc.meta.stages.length, file, xp: XP.stageDone, next, say: after ? turnLines(pid(), R.stageId, after) : [] });
    await W(fast ? 0 : 760);
    pay(XP.stageDone, `Stage ${stageNo()} done`, 'done', '.zs2-cele-xp', { text: `+${XP.stageDone} XP`, after: 900 });
    hushed = false;
    celeLine(line);
    await her(line, { speak: true });
    /* with a stage after this one, Continue is yours: it opens the turn */
    if (next) return;
    await W(fast ? 0 : Math.max(1300, 3000 - (Date.now() - t0)));
    if (g !== gen) return endCele();
    leaveCele();
  };

  const route = async (t: string, voiced: boolean) => {
    if (!R.def && R.s2) return s2Route(t);
    if (!R.def) return her("That's where this prototype stops.");
    const ph = stage().phase;
    const s = ph === 'work' ? stepDef() : undefined;
    /* b14: what you say while holding is sorted before it gets here (actions.talk, engine/cowork.ts). Only a clear answer
       arrives as voiced, so it is taken exactly like a typed one */
    if (voiced && ph === 'pou') return pouHeard(t);
    if (guideOn()) return guidedTurn(t, s, ph);
    if (s?.kind === 'find') return onFind(t, s);
    if (s?.kind === 'prompt') return onPrompt(t, s);
    if (s?.kind === 'ask') return onAsk(t, s);
    if (s?.kind === 'submit') return onRun(t, s);
    if (ph === 'review') return her('Still reading it. One sec.');
    if (ph === 'feedback') return onFb(t);
    if (ph === 'approved') return her("Whenever you're ready, hit Start POU.");
    if (ph === 'pou') return pouHeard(t);
    return her(STUCK_LINE.done);
  };

  /* ---------- starting a stage ---------- */
  const scenario = () => SCENARIOS[(get().project?.id ?? 'spotify') as ProjectId];
  const s2For = (stageId: string): Stage2Def | undefined => {
    const d = STAGE2[(get().project?.id ?? 'spotify') as ProjectId];
    return d && d.stageId === stageId ? d : undefined;
  };

  const freshRun = (stageId: string): Run => {
    const sc = scenario();
    return {
      sc,
      stageId,
      def: sc.stages[stageId],
      si: 0,
      miss: {},
      rot: {},
      partOf: {},
      hinted: {},
      askDup: null,
      pText: '',
      pTries: 0,
      prompt: {},
      concept: {},
      entered: {},
      idled: -1,
      yn: null,
      film: null,
      resub: false,
      subs: 0,
      sawMismatch: false,
      fbItems: [],
      pouList: [],
      pouI: 0,
      pouTries: 0,
      pouAcc: '',
      slop: 0,
      ctx: {},
      games: {},
      s2: sc.stages[stageId] ? undefined : s2For(stageId),
      hands: {},
      asked: {},
      guided: {},
      mcqTried: {},
      pickUsed: {},
    };
  };

  const buildSteps = (def?: StageDef): Step[] =>
    (def?.flow ?? []).map(
      (f, i): Step => ({
        id: f.id,
        label: f.label,
        kind: f.kind,
        state: i === 0 ? 'now' : 'next',
        slots:
          f.kind === 'find'
            ? f.order.map((id) => ({ id, stepId: f.id, kind: 'issue' as const, label: '', filled: false }))
            : [
                {
                  id: f.id,
                  stepId: f.id,
                  kind:
                    f.kind === 'prompt'
                      ? ('prompt' as const)
                      : f.kind === 'ask'
                        ? f.takes === 'link'
                          ? ('link' as const)
                          : ('confirm' as const)
                        : def?.deliverable.takes === 'link'
                          ? ('link' as const)
                          : ('file' as const),
                  label: f.label,
                  filled: false,
                },
              ],
      })
    );

  const freshStage = (meta: StageMeta, files: FileRef[]): StageState => ({
    projectId: (get().project?.id ?? 'spotify') as ProjectId,
    stageId: meta.id,
    phase: 'work',
    steps: scenario().stages[meta.id] ? buildSteps(scenario().stages[meta.id]) : (() => {
      const d = s2For(meta.id);
      return d ? s2Steps(d) : [];
    })(),
    msgs: [],
    typing: false,
    files,
    feedback: [],
    submitOpen: false,
    pou: { lines: [], asking: 0, progress: 0, recording: false },
    startedAt: Date.now(),
    stageMs: meta.minutes * 60000,
    unread: false,
    lastSlotAt: 0,
  });

  const stubEnter = () => {
    void queue(async () => {
      if (OPENERS[pid()]?.[R.stageId]) await brief();
      else await her(R.sc.stubLines[R.stageId] || 'Okay, next one.');
      addMsg({ from: 'her', sys: true, text: 'The prototype stops here. Spotify stages 1 and 2 and Amazon stage 1 are built to show how every stage works.' });
    });
  };

  const metaOf = (id: string): StageMeta => {
    const list = scenario().meta.stages;
    const d = get().doneStages;
    return list.find((s) => s.id === id) ?? list.find((s) => !d.includes(s.id)) ?? list[0];
  };

  const closePanels = (): Partial<UiState> => ({ bigSide: null, previewFileId: undefined, filmId: undefined });

  const open = (id: string) => {
    const meta = metaOf(id);
    if (R && get().stage && R.stageId === meta.id && R.sc === scenario()) {
      set({ screen: 'stage' });
      resetIdle();
      return;
    }
    const carried = get().stage?.files ?? [];
    cancel();
    if (R && get().stage) {
      R.saved = stage();
      runs[R.stageId] = R;
    }
    const back = runs[meta.id];
    setUi(closePanels());
    if (back?.saved) {
      R = back;
      set({ screen: 'stage', stage: back.saved });
      const st = stage();
      if (st.phase === 'work' && R.def && !R.entered[R.si]) {
        /* it left in the middle of asking: ask again */
        patch((s) => ({ msgs: s.msgs.map((m) => (m.options ? { ...m, options: undefined } : m)) }));
        void queue(enter);
      } else if (st.phase === 'review' && R.lastSub) {
        const l = R.lastSub;
        void queue(() => reviewFlow(l.sub, l.isLink, l.was));
      } else if (st.phase === 'review') {
        /* it left while the file was still being read: nothing was handed in */
        R.resub = st.feedback.length > 0;
        patch({ phase: st.feedback.length ? 'feedback' : 'work' });
      } else if (st.phase === 'pou' && st.msgs[st.msgs.length - 1]?.from !== 'her') {
        void queue(pouAsk);
      } else if (st.phase === 'work' && R.s2) {
        void queue(R.entered[0] ? s2Next : s2Enter);
      } else resetIdle();
      return;
    }
    R = freshRun(meta.id);
    set({ screen: 'stage', stage: freshStage(meta, carried) });
    /* Design 1 runs its own scripted stage (d1/store.ts): the engine only holds which stage you are on */
    if (import.meta.env.VITE_D1 === '1') return;
    if (!R.def && R.s2) {
      void queue(s2Enter);
      return;
    }
    if (!R.def) {
      stubEnter();
      return;
    }
    void queue(enter);
  };

  /* ---------- dev jumps: land on any state without doing the work before it ---------- */
  const setProject = (id: ProjectId) => {
    cancel();
    R = null as unknown as Run;
    runs = {};
    bank.clear();
    set({ project: SCENARIOS[id].meta, stage: null, doneStages: [] });
    restart();
  };

  const seedLines = (f: StepDef) => {
    f.open.forEach((l) => {
      if (typeof l === 'string') addMsg({ from: 'her', text: l });
      else if (!handed(l.file)) share(l.file);
    });
  };

  const silentFill = (f: StepDef, ids?: string[], val?: string) => {
    const labelOf = (id: string) => (f.kind === 'find' ? (f.items.find((i) => i.id === id)?.label ?? '') : f.label);
    const value = val ?? (f.kind === 'prompt' ? f.draft : f.kind === 'ask' && f.takes === 'link' ? R.def?.demo.first().url : undefined);
    patch((st) => ({
      steps: st.steps.map((s) => {
        if (s.id !== f.id) return s;
        const take = (x: Step['slots'][number]) => !ids || ids.includes(x.id);
        const more = (id: string) => {
          const it = f.kind === 'find' ? f.items.find((i) => i.id === id) : undefined;
          return it ? { proof: fact(it.ask[2]), note: it.why } : {};
        };
        const done = s.slots.filter(take).map((x) => ({ ...x, filled: true, verified: true, label: labelOf(x.id), value: value ?? x.value, ...more(x.id) }));
        return { ...s, revealed: true, slots: [...done, ...s.slots.filter((x) => !take(x))] };
      }),
    }));
    if (f.kind === 'prompt') R.prompt[f.id] = f.draft;
    if (f.concept) R.concept[f.id] = 'yes';
    /* what this landed state has earned and handed in, without a coin */
    const q = { quiet: true };
    if (f.kind === 'find') (ids ?? f.order).forEach((id) => pay(XP.found, `Found: ${lc(labelOf(id))}`, id, null, q));
    if (f.kind === 'prompt') {
      pay(XP.prompt, 'Prompt agreed', f.id, null, q);
      deliver(promptRef(f.id, f.label, f.draft), whereOf(f.label), undefined, true);
    }
    if (f.kind === 'ask') {
      pay(XP.found, `Done: ${lc(f.label)}`, f.id, null, q);
      if (f.takes === 'link' && value) deliver(linkRef(value, true), whereOf(f.label), undefined, true);
    }
    if (f.kind === 'submit' && R.def) pay(XP.approved, `Approved: ${lc(R.def.deliverable.label)}`, 'approved', null, q);
  };

  /* a whole stage behind you: its files, its XP and what you handed in, quietly */
  const pastStage = (stageId: string): FileRef[] => {
    const def = R.sc.stages[stageId];
    if (!def) return [];
    const files: FileRef[] = [];
    const q = { quiet: true, stageId };
    def.flow.forEach((f) => {
      f.open.forEach((l) => {
        if (typeof l === 'string') return;
        const raw = R.sc.files[l.file];
        if (raw) files.push(keepRef({ id: raw.id, name: raw.name, meta: raw.meta, kind: raw.kind, url: raw.url, text: raw.text, stageId }));
      });
      if (f.kind === 'find') f.order.forEach((id) => pay(XP.found, `Found: ${lc(f.items.find((i) => i.id === id)?.label ?? id)}`, id, null, q));
      if (f.kind === 'prompt') {
        pay(XP.prompt, 'Prompt agreed', f.id, null, q);
        const ref = promptRef(f.id, f.label, f.draft, stageId);
        files.push(ref);
        deliver(ref, whereOf(f.label, stageId), undefined, true);
      }
      if (f.kind === 'ask') pay(XP.found, `Done: ${lc(f.label)}`, f.id, null, q);
    });
    const sub = def.demo.last();
    const link = def.deliverable.takes === 'link';
    const url = sub.url ?? sub.name;
    const ref = keepRef(
      link
        ? { id: `ln-${stageId}-out`, name: url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''), meta: 'Link', kind: 'link', url: /^https?:\/\//i.test(url) ? url : `https://${url}`, stageId, mine: true }
        : { id: `up-${stageId}-out`, name: sub.name, meta: sub.meta ?? '', kind: kindOf(sub.name), text: sub.text, stageId, mine: true }
    );
    files.push(ref);
    deliver(ref, whereOf(def.deliverable.label, stageId), undefined, true);
    pay(XP.approved, `Approved: ${lc(def.deliverable.label)}`, 'approved', null, q);
    const said = def.pou.lines.length + (def.pou.curve.length ? 1 : 0);
    for (let i = 0; i < said; i++) pay(XP.pouLine, 'Said it', `pou:${i}`, null, q);
    pay(XP.stageDone, `Stage ${stageNo(stageId)} done`, 'done', null, q);
    return files;
  };

  /* stage 2 from a dev jump: stage 1 done behind it, the first `filled` rounds played */
  const base2 = (filled: number): boolean => {
    const sc = scenario();
    const d = STAGE2[sc.meta.id];
    const meta = d && sc.meta.stages.find((x) => x.id === d.stageId);
    const first = sc.meta.stages.find((x) => sc.stages[x.id]);
    if (!d || !meta || !first) return false;
    cancel();
    runs = {};
    bank.clear();
    restart();
    R = freshRun(first.id);
    const files = pastStage(first.id);
    R = freshRun(meta.id);
    set({ screen: 'stage', stage: freshStage(meta, files), doneStages: [first.id] });
    setUi(closePanels());
    if (filled <= 0) return true;
    if (OPENERS[sc.meta.id]?.[meta.id]) seedBrief();
    else d.opener.forEach((l) => addMsg({ from: 'her', text: l }));
    revealStep(S2_STEP, false);
    R.entered[0] = true;
    d.slots.slice(0, filled).forEach((x, i) => {
      addMsg({ from: 'her', text: s2Lead(i, d) });
      const m = addMsg({ from: 'her', game: { id: x.game.id, done: true } });
      R.games[m.id] = { stepId: S2_STEP, slotId: x.id, label: x.label, s2: true };
      fillSlot(S2_STEP, x.id, { label: x.label, value: x.game.answer, xp: false, ting: false });
      pay(XP.stage2Slot, `Played: ${lc(x.label)}`, x.id, null, { quiet: true });
    });
    syncSteps();
    return true;
  };

  const base = (i: number, phase: Phase = 'work') => {
    const sure = instant; /* a jump lands with everything up to it already on the board */
    const meta = scenario().meta.stages.find((s) => scenario().stages[s.id]) ?? scenario().meta.stages[0];
    cancel();
    runs = {};
    restart();
    R = freshRun(meta.id);
    set({ screen: 'stage', stage: freshStage(meta, []), doneStages: [] });
    setUi(closePanels());
    R.si = i;
    if (sure || i > 0) seedBrief();
    const flow = R.def!.flow;
    flow.slice(0, i).forEach((f, n) => {
      seedLines(f);
      silentFill(f);
      R.entered[n] = true;
      if (f.kind === 'find') addMsg({ from: 'her', text: f.done });
    });
    patch({ phase });
    syncSteps();
    if (sure) patch((st) => ({ steps: st.steps.map((x, n) => (n <= i ? { ...x, revealed: true } : x)) }));
    return flow;
  };

  const playable = (): StageDef => {
    const sc = scenario();
    const m = sc.meta.stages.find((x) => sc.stages[x.id]) ?? sc.meta.stages[0];
    return sc.stages[m.id];
  };

  const jump = (to: string) => {
    let t = String(to ?? '').trim();
    const m = t.match(/^(spotify|amazon)(?::(.*))?$/);
    if (m) {
      setProject(m[1] as ProjectId);
      t = m[2] || 'stage';
    }
    if (t === 'fast' || t === 'slow') {
      fast = t === 'fast';
      return;
    }
    if (t === 'idle') {
      if (R) R.idled = -1;
      nudge();
      return;
    }
    if (t === 'world' || t === 'kickoff' || t === 'pou' || t === 'breakdown' || t === 'objective') {
      cancel();
      set({ screen: t as Screen });
      return;
    }
    /* the start of a stage is the one state you land on at her real pace */
    if (t === 'stage') {
      base(0);
      void queue(enter);
      return;
    }
    if (t === 'model-cele') {
      if (base2(STAGE2[scenario().meta.id]?.slots.length ?? 3)) void queue(s2Done);
      return;
    }
    if (t === 'model') {
      if (base2(0)) void queue(s2Enter);
      else {
        base(0);
        void queue(enter);
      }
      return;
    }
    instant = true;
    clock.setTimeout(() => {
      instant = false;
      resetIdle();
    }, 0);
    const flow = playable().flow;
    const last = flow.length - 1;
    const linked = playable().deliverable.takes === 'link';
    /* the second I'm stuck on the first open issue: her card is in the chat */
    if (t === 'game') {
      const f = flow[0];
      base(0);
      const tgt = f?.kind === 'find' ? target(f) : undefined;
      const g = tgt ? gameOf(tgt.id) : null;
      if (f?.kind !== 'find' || !tgt || !g) {
        void queue(enter);
        return;
      }
      seedLines(f);
      revealStep(f.id, false);
      R.entered[0] = true;
      syncSteps();
      R.miss[tgt.id] = 2;
      addMsg({ from: 'me', text: "I don't know" });
      addMsg({ from: 'her', text: tgt.ask[0] });
      addMsg({ from: 'me', text: "I'm stuck", stuck: true });
      void queue(() => playOut(f.id, tgt.id, tgt.label, g));
      return;
    }
    const round = t.match(/^model(?::(\d))?(-done)?$/);
    if (round && (round[1] || round[2])) {
      const d = STAGE2[scenario().meta.id];
      const n = round[2] ? (d?.slots.length ?? 3) : Math.max(1, Math.min(d?.slots.length ?? 3, Number(round[1])));
      const played = round[2] ? n : n - 1;
      if (!base2(played)) {
        base(0);
        void queue(enter);
        return;
      }
      void queue(round[2] ? s2Done : s2Next);
      return;
    }
    if (t === 'issues-3') {
      const f = flow[0];
      if (f.kind === 'find') {
        base(0);
        seedLines(f);
        silentFill(f, f.order.slice(0, 3));
        R.entered[0] = true;
        syncSteps();
      } else {
        base(3);
        void queue(enter);
      }
      return;
    }
    if (t === 'prompt') {
      base(flow.findIndex((f) => f.kind === 'prompt'));
      void queue(enter);
      return;
    }
    if (t === 'submit') {
      base(last);
      R.ctx.repo = R.def?.demo.repo?.('submit');
      void queue(enter);
      return;
    }
    if (t === 'feedback' || t === 'approved') {
      base(last);
      seedLines(flow[last]);
      R.entered[last] = true;
      const how = t === 'feedback' ? 'first' : 'last';
      R.ctx.repo = R.def?.demo.repo?.(how);
      void beginReview(R.def!.demo[how](), linked);
      return;
    }
    if (t === 'pou-stage' || t === 'done' || t === 'cele') {
      base(last);
      seedLines(flow[last]);
      R.entered[last] = true;
      R.ctx.repo = R.def?.demo.repo?.('last');
      R.sawMismatch = true;
      const def = R.def!;
      const sub = def.demo.last();
      silentFill(flow[last], undefined, sub.name);
      const handed = linked ? linkRef(sub.url ?? sub.name, true) : upRef(sub);
      deliver(handed, whereOf(def.deliverable.label), undefined, true);
      void queue(async () => {
        const r = await def.review(sub, R.ctx);
        patch({ phase: 'approved', submitted: { name: sub.name, isLink: linked, stats: r.stats ? def.stats(r) : undefined } });
        addMsg({ from: 'her', text: def.approve });
        syncSteps();
        if (t === 'pou-stage') return pouStart();
        R.pouList = [...def.pou.lines];
        R.pouI = R.pouList.length;
        patch({
          phase: 'done',
          pou: { lines: R.pouList.map((q) => ({ k: q.k, text: q.text, said: true })), asking: R.pouList.length, progress: 1, recording: false },
        });
        markDone();
        syncSteps();
        devMark('done');
        R.pouList.forEach((q, i) => pay(XP.pouLine, `Said: ${q.k.toLowerCase()}`, `pou:${i}`, null, { quiet: true }));
        if (t !== 'cele') pay(XP.stageDone, `Stage ${stageNo()} done`, 'done', null, { quiet: true });
        if (t === 'cele') {
          await clock.wait(40);
          await celebrate(sub.name);
          return;
        }
        addMsg({ from: 'her', text: def.pou.end });
      });
    }
  };

  /* ---------- b14 co-work: you hold, you talk, she took one frame. She answers the way your words call for ----------
     A clear answer to her question goes in as that answer. Anything else is talk: her line out loud, her cursor on the exact
     spot of your screen, or a film or file in the chat. She never edits and never clicks. engine/cowork.ts picks which */
  let pointSeq = 0;
  const talkCtx = (scene: TalkScene): TalkCtx => {
    const st = stage();
    const s = st.phase === 'work' ? stepDef() : undefined;
    const now = stepNow();
    /* her newest keys are still the ones you can press (the thread keeps them live past your talk), so they are still the
       ones you can say */
    let open: TalkCtx['open'];
    for (let i = st.msgs.length - 1; i >= 0; i--) {
      const m = st.msgs[i];
      if (m.options?.length) {
        open = { msgId: m.id, options: m.options };
        break;
      }
    }
    return {
      pid: pid(),
      phase: st.phase,
      step: s,
      aim: s?.kind === 'find' ? aim(s) : undefined,
      found: (now?.slots ?? []).filter((x) => x.filled).map((x) => x.id),
      left: s ? left() : 0,
      promptText: R.pText,
      feedback: st.feedback,
      open,
      yn: !!R.yn,
      scene,
      hasRaw: !!R.sc.files.raw,
      firstName: R.sc.meta.manager.name.split(' ')[0] ?? '',
    };
  };

  /* her answer to talk is spoken: the recorded take when this exact line has one, else the browser's own free voice.
     The words come out as she says them and her circle follows */
  const spoken = async (text: string, onStart?: () => void): Promise<Msg> => {
    await W(fast || instant ? 0 : 420);
    onStart?.();
    const live = !fast && !instant;
    const msg = addMsg({ from: 'her', text }, { stream: live });
    if (!live) return msg;
    const g = gen;
    const take = takeFor(text, vKey());
    if (take) await streamOut(msg, { take });
    else {
      const N = wordStarts(text).length;
      await new Promise<void>((resolve) => {
        let over = false;
        const finish = () => {
          if (over) return;
          over = true;
          voice.stop();
          if (streamOff === finish) streamOff = null;
          if (get().ui.stream?.id === msg.id) setUi({ stream: undefined, level: 0 });
          resolve();
        };
        const voice = speak(text, vKey(), {
          onWord: (n) => {
            if (!over && get().ui.stream?.id === msg.id) setUi({ stream: { id: msg.id, n: Math.min(N, n) } });
          },
          onLevel: (v) => {
            if (!over && get().ui.level !== v) setUi({ level: v });
          },
        });
        streamOff = finish;
        void voice.done.then(finish);
      });
    }
    if (g !== gen) throw new Cancelled();
    return msg;
  };

  /* stuck mode: the keys she laid out before you spoke come down under her answer, so the question is not asked twice and
     the step still ends on keys. Only her stuck keys move. Others are tied to the line they sit on */
  const carryKeys = (to: Msg): boolean => {
    const ms = stage().msgs;
    let from: Msg | undefined;
    for (let i = ms.length - 1; i >= 0; i--) {
      if (ms[i].options?.length) {
        from = ms[i];
        break;
      }
    }
    if (!from || from.id === to.id || !from.options?.every((o) => KEY_OPT.test(o.id) || o.id === 'use')) return false;
    const { id, options, tally } = from;
    patch((st) => ({
      msgs: st.msgs.map((x) => (x.id === id ? { ...x, options: undefined, tally: undefined } : x.id === to.id ? { ...x, options, tally } : x)),
    }));
    return true;
  };

  const coworkTurn = async (p: Extract<TalkPlan, { kind: 'help' }>) => {
    const g = gen;
    /* her cursor sets off as she starts to answer, so it lands while she is still talking */
    const go = () => {
      if (p.point && g === gen) setUi({ point: { id: ++pointSeq, to: p.point.to, note: p.point.note } });
    };
    const said = await spoken(p.say, go);
    const film = p.film ? FILMS[p.film] : undefined;
    if (film) {
      await W(220);
      addMsg({ from: 'her', film: { id: film.id, title: film.title, seen: true } });
    }
    if (p.file && R.sc.files[p.file]) {
      await W(220);
      share(p.file);
    }
    /* stuck mode ends on keys: hers from before you spoke move under this answer, else the step's keys are laid out */
    if (guideOn() && !carryKeys(said)) await pinPicks();
  };

  /* your line goes in first, so the frame she took can sit on it */
  const lastMine = (): string | undefined => {
    const ms = get().stage?.msgs ?? [];
    for (let i = ms.length - 1; i >= 0; i--) if (ms[i].from === 'me') return ms[i].id;
    return undefined;
  };

  /* ---------- the actions the UI calls ---------- */
  const actions: Actions = {
    goto(screen) {
      if (screen === 'stage' && !get().stage) return open('');
      set({ screen });
    },
    startStage: open,

    send(text, voiced = false) {
      const t = String(text ?? '').trim();
      if (!t || !get().stage || !R) return;
      stopVoice();
      hushSpeech();
      if (get().ui.point) setUi({ point: undefined });
      resetIdle();
      /* never in this chat: a pasted key comes straight back out */
      if (R.sc.secret?.test(t)) {
        addMsg({ from: 'me', text: 'Key removed', voiced });
        if (R.yn) aside(R.sc.leak ?? '');
        else void queue(() => her(R.sc.leak ?? ''));
        return;
      }
      hushed = true;
      if (R.plan) {
        addMsg({ from: 'me', text: t, voiced });
        R.plan(t);
        return;
      }
      if (stage().stuck) patch({ stuck: false });
      dropStuckKeys();
      if (R.yn) {
        if (/^(y|yes|yep|yeah|i do|sure)\b/i.test(t)) return answerYN('yes');
        if (/^(n|no|nope|not really|never)\b/i.test(t)) return answerYN('no');
        addMsg({ from: 'me', text: t, voiced });
        aside('Yes or no is fine.');
        return;
      }
      /* a pasted link is a card, the words around it would be lost in one */
      if (!voiced && /^(https?:\/\/)?(www\.)?[\w-]+(\.[\w-]+)+\/\S*$/i.test(t) && !/\s/.test(t)) addMsg({ from: 'me', file: linkRef(t, true) });
      else addMsg({ from: 'me', text: t, voiced });
      void queue(() => route(t, voiced));
    },

    choose(msgId, optionId) {
      if (!get().stage || !R) return;
      const m = stage().msgs.find((x) => x.id === msgId);
      if (!m?.options) return;
      if (optionId === 'use') {
        const s = stepDef();
        /* b14: in stuck mode Use can ride on a line that is not the draft, so its keys go with it */
        if (m.id !== R.pendingDraft) patch((st) => ({ msgs: st.msgs.map((x) => (x.id === msgId ? { ...x, options: undefined, tally: undefined } : x)) }));
        if (s?.kind === 'prompt') void queue(() => useDraft(s));
        return;
      }
      if (optionId === 'yes' || optionId === 'no') return answerYN(optionId);
      /* a pick, or b14 a stuck mode key: it becomes your line, then she answers it */
      if (KEY_OPT.test(optionId)) {
        const label = m.options.find((o) => o.id === optionId)?.label ?? '';
        patch((s) => ({ msgs: s.msgs.map((x) => (x.id === msgId ? { ...x, options: undefined, tally: undefined } : x)) }));
        stopVoice();
        resetIdle();
        hushed = true;
        if (label) addMsg({ from: 'me', text: label });
        void queue(() => (GP_OPT.test(optionId) ? guidePick(optionId) : mcqPick(optionId)));
        return;
      }
      if (STUCK_OPT.test(optionId)) {
        const label = m.options.find((o) => o.id === optionId)?.label ?? '';
        patch((s) => ({ msgs: s.msgs.map((x) => (x.id === msgId ? { ...x, options: undefined } : x)) }));
        stopVoice();
        resetIdle();
        if (label) addMsg({ from: 'me', text: label });
        void queue(() => stuckPick(optionId));
      }
    },

    openFile(fileId) {
      const f = bank.get(fileId);
      if (!f) return;
      if (get().ui.surface === 'pip') setUi({ previewFileId: fileId, pipBody: 'preview', pipOpen: true });
      else setUi({ previewFileId: fileId, bigSide: 'preview' });
    },
    closeSide() {
      const ui = get().ui;
      const body = ui.pipBody === 'preview' || ui.pipBody === 'resources' ? 'chat' : ui.pipBody;
      setUi({ bigSide: null, previewFileId: undefined, pipBody: body });
    },
    openResources() {
      if (get().ui.surface === 'pip') setUi({ pipBody: 'resources', pipOpen: true });
      else setUi({ bigSide: 'resources', previewFileId: undefined });
    },
    download(fileId) {
      const f = bank.get(fileId);
      if (!f) return;
      if (f.kind === 'link') {
        if (f.url) window.open(f.url, '_blank', 'noopener');
        return;
      }
      if (f.kind === 'image' && f.url) {
        try {
          const a = document.createElement('a');
          a.href = f.url;
          a.download = /\.\w+$/.test(f.name) ? f.name : `${f.name}.jpg`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch {
          /* the card stays, they can try again */
        }
        return;
      }
      if (f.text === undefined) return;
      try {
        const u = URL.createObjectURL(new Blob([f.text], { type: 'text/csv' }));
        const a = document.createElement('a');
        a.href = u;
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        later(4000, () => URL.revokeObjectURL(u));
      } catch {
        /* the chip stays, they can try again */
      }
    },

    openSubmit() {
      if (canSubmit()) patch({ submitOpen: true });
    },
    closeSubmit() {
      if (get().stage) patch({ submitOpen: false });
    },
    submitFile(file) {
      if (!canSubmit()) return;
      const def = R.def!;
      if (def.deliverable.takes === 'link') {
        const step0 = def.flow[0];
        void queue(() => her((step0.kind === 'ask' && step0.nolink) || 'Send me the link.'));
        return;
      }
      R.lastSub = undefined;
      const from = handFrom;
      handFrom = undefined;
      patch({ phase: 'review', submitOpen: false, submitted: { name: file.name, isLink: false } });
      const g = gen;
      const read: Promise<string | undefined> =
        file.size > MAX_READ
          ? Promise.resolve(undefined)
          : file.text().catch(() => undefined);
      void read.then((text) => {
        if (g !== gen) return;
        void beginReview({ name: file.name, text, meta: `${Math.max(1, Math.round(file.size / 1024))} KB` }, false, file, from);
      });
    },
    submitLink(url) {
      const u = String(url ?? '').trim();
      const from = handFrom;
      handFrom = undefined;
      if (!u || !canSubmit()) return;
      void beginReview({ name: u.replace(/^https?:\/\//, ''), url: u }, true, undefined, from);
    },

    toggleFeedback(id) {
      const st = get().stage;
      if (!st || st.phase !== 'feedback') return;
      const it = st.feedback.find((x) => x.id === id);
      if (!it) return;
      const feedback = st.feedback.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x));
      if (!it.checked) tingNow();
      const all = feedback.every((x) => x.checked);
      if (!all) R.resub = false;
      patch({ feedback, fbOpen: !it.checked && st.fbOpen === id ? undefined : st.fbOpen, submitOpen: all ? st.submitOpen : false });
    },
    setFbOpen(id) {
      if (get().stage) patch({ fbOpen: id });
    },
    resubmit() {
      const st = get().stage;
      if (!st || st.phase !== 'feedback' || !st.feedback.every((x) => x.checked)) return;
      R.resub = true;
      patch({ submitOpen: true });
    },

    startPou() {
      const st = get().stage;
      if (!st || st.phase !== 'approved') return;
      void queue(pouStart);
    },
    pouAnswer(text) {
      const t = String(text ?? '').trim();
      const st = get().stage;
      if (!t || !st || st.phase !== 'pou') return;
      stopVoice();
      addMsg({ from: 'me', text: t, voiced: true });
      void queue(() => pouHeard(t));
    },
    filmDone(id) {
      if (!get().stage) return;
      patch((s) => ({ msgs: s.msgs.map((m) => (m.film?.id === id ? { ...m, film: { ...m.film, seen: true } } : m)) }));
      const ui = get().ui;
      setUi({ filmId: undefined, pipBody: ui.pipBody === 'film' ? 'chat' : ui.pipBody });
      const res = R?.film;
      if (res) {
        R.film = null;
        res();
      }
    },
    dismissCoach() {
      if (get().stage) patch({ coach: undefined });
    },
    /* the Plus: a file you hand her. When the stage is waiting for it, it is the submission */
    attachFile(file) {
      if (!get().stage || !R) return;
      if (canSubmit()) {
        handFrom = 'composer';
        return actions.submitFile(file);
      }
      stopVoice();
      resetIdle();
      const g = gen;
      const read: Promise<string | undefined> =
        file.size > MAX_READ || kindOf(file.name, file.type) === 'image' ? Promise.resolve(undefined) : file.text().catch(() => undefined);
      void read.then((text) => {
        if (g !== gen) return;
        addMsg({ from: 'me', file: upRef({ name: file.name, text, meta: `${Math.max(1, Math.round(file.size / 1024))} KB` }, file) });
        const ph = stage().phase;
        const line =
          ph === 'review'
            ? "I'm still reading your last one. One sec."
            : ph === 'feedback'
              ? "Got it. Tick off each fix first, then hit Fix and resubmit and I'll read it."
              : R.def?.deliverable.takes === 'link'
                ? 'Got it. For this one I need the link to your repo.'
                : "Got it. I'll read it when you hit Submit.";
        if (R.yn) aside(line);
        else void queue(() => her(line));
      });
    },
    /* one frame of your screen. She has no eyes on it, so she answers from where you are */
    sendShot(dataUrl) {
      if (!get().stage || !R || !dataUrl) return;
      stopVoice();
      resetIdle();
      const ref: FileRef = { id: `sh${++fileSeq}`, name: 'Screenshot', meta: 'Just now', kind: 'image', url: dataUrl, stageId: R.stageId, mine: true };
      bank.set(ref.id, ref);
      patch((s) => ({ files: [...s.files, ref] }));
      addMsg({ from: 'me', file: ref });
      const line = R.def ? `Got your screenshot. ${screenLine()}` : 'Got your screenshot.';
      if (R.yn) aside(line);
      else void queue(() => her(line));
    },
    stuck() {
      const st = get().stage;
      /* one press, one rung. The pill stays pressed only while she answers, a second press then waits for her */
      if (!st || !R || st.stuck) return;
      stopVoice();
      resetIdle();
      hushed = true;
      patch({ stuck: true });
      addMsg({ from: 'me', text: "I'm stuck", stuck: true });
      if (R.plan) {
        R.plan("I'm stuck");
        patch({ stuck: false });
        return;
      }
      void queue(async () => {
        try {
          if (R.yn) await aside('Yes or no is fine. Pick the one that fits.');
          else if (get().stage?.stuckMode) await guide(true);
          else await stuckFlow();
        } finally {
          if (get().stage?.stuck) patch({ stuck: false });
        }
      });
    },
    stuckMode(on) {
      const st = get().stage;
      if (!st || !R) return;
      const next = on ?? !st.stuckMode;
      if (next === !!st.stuckMode) return;
      stopVoice();
      resetIdle();
      hushed = true;
      dropStuckKeys();
      patch({ stuckMode: next, stuck: false });
      /* b14 (his words: "a divider and center text, and then again a divider, like how WhatsApp shows when the time
         happens"): the flip is a line across the chat, so you can see where the guided part starts and ends */
      addMsg({ from: 'her', sys: true, rule: true, text: next ? STUCK_ON : STUCK_OFF });
      if (!next) {
        /* off: her picks go, everything you filled stays */
        dropMcq();
        if (R.yn) aside(GUIDE_OFF);
        else void queue(() => her(GUIDE_OFF));
        return;
      }
      R.guided = {};
      R.pickUsed = {};
      if (R.yn) aside("Yes or no is fine. Pick one and I'll walk you through the rest.");
      void queue(() => guide());
    },
    gameDone(msgId, r) {
      const st = get().stage;
      if (!st || !R) return;
      const m = st.msgs.find((x) => x.id === msgId);
      if (!m?.game || m.game.done) return;
      patch((s) => ({ msgs: s.msgs.map((x) => (x.id === msgId && x.game ? { ...x, game: { ...x.game, done: true } } : x)) }));
      const g = R.games[msgId];
      const slot = g && stage().steps.find((x) => x.id === g.stepId)?.slots.find((x) => x.id === g.slotId);
      if (!g || !slot || slot.filled) return;
      const rect = r?.rect ?? null;
      const answer = String(r?.answer ?? '');
      /* the coin leaves from the card on the surface you are looking at, the rect only if that card is gone */
      const cardAt = (): From => onScreen(`[data-mid="${msgId.replace(/["\\]/g, '')}"] .gm`) ?? rect ?? slotSel(g.slotId);
      resetIdle();
      void queue(async () => {
        if (stage().steps.find((x) => x.id === g.stepId)?.slots.find((x) => x.id === g.slotId)?.filled) return;
        fillSlot(g.stepId, g.slotId, { label: g.label, value: answer, xp: false, ting: false });
        const from = cardAt();
        pay(g.s2 ? XP.stage2Slot : XP.foundGame, `Played: ${lc(g.label)}`, g.slotId, from);
        if (r?.right && r.tries === 1) pay(XP.gameFirstTry, 'First move', `${g.slotId}:first`, from);
        await W(420);
        if (g.s2) return s2Next();
        const s = stepDef();
        if (s?.kind === 'find' && s.id === g.stepId) await afterFind(s, rot('gm', ['There it is.', "That's the one."]));
      });
    },
    noteTyping() {
      typedAt = Date.now();
    },
    setLightStage(v) {
      if (get().ui.lightStage !== v) setUi({ lightStage: v });
    },

    setSurface(s) {
      setUi({ surface: s });
      if (s === 'big' && get().stage) patch({ unread: false });
    },
    setPipBody(b) {
      setUi({ pipBody: b });
      if (b === 'chat' && get().ui.pipOpen && get().stage) patch({ unread: false });
    },
    setPipOpen(o) {
      setUi({ pipOpen: o });
      if (o && get().ui.pipBody === 'chat' && get().stage) patch({ unread: false });
    },
    setListening(l) {
      if (l) {
        hushed = true;
        stopVoice();
        hushSpeech();
        if (get().stage && R) resetIdle();
      }
      setUi({ listening: l });
      const st = get().stage;
      if (st && st.phase === 'pou') patch({ pou: { ...st.pou, recording: l } });
    },
    setLevel(v) {
      if (get().ui.level !== v) setUi({ level: v });
    },
    setMicLevel(v) {
      if (get().ui.micLevel !== v) setUi({ micLevel: v });
    },
    markRead() {
      if (get().stage) patch({ unread: false });
    },

    talk(text, scene) {
      const t = String(text ?? '').trim();
      const st = get().stage;
      if (!t || !st || !R) return { done: Promise.resolve() };
      if (get().ui.point) setUi({ point: undefined });
      /* the POU, a stage with no steps of its own, or a pasted key: the same way in as typing */
      if (st.phase === 'pou') {
        actions.pouAnswer(t);
        return { id: lastMine(), done: ENG };
      }
      if (!R.def || R.sc.secret?.test(t)) {
        actions.send(t, true);
        return { id: lastMine(), done: ENG };
      }
      const ctx = talkCtx(scene);
      const plan = planTalk(t, ctx);
      if (plan.kind === 'choose') {
        /* her key, said out loud. Use her prompt has no line of its own, so your words stand for it */
        if (plan.optionId === 'use') addMsg({ from: 'me', text: t, voiced: true });
        actions.choose(plan.msgId, plan.optionId);
        return { id: lastMine(), done: ENG };
      }
      if (plan.kind === 'answer') {
        actions.send(t, true);
        return { id: lastMine(), done: ENG };
      }
      stopVoice();
      hushSpeech();
      resetIdle();
      hushed = true;
      if (st.stuck) patch({ stuck: false });
      dropStuckKeys();
      const mine = addMsg({ from: 'me', text: t, voiced: true });
      /* she is waiting on a Yes or No, or a film: the queue is held, so this answer goes around it */
      const held = !!R.yn || !!R.film;
      const done = held
        ? coworkTurn(plan).catch((e) => {
            if (!(e instanceof Cancelled)) console.error(e);
          })
        : queue(() => coworkTurn(plan));
      return { id: mine.id, done };
    },
    talkLine(n, scene) {
      const st = get().stage;
      if (!st || !R) return '';
      if (st.phase === 'pou') {
        /* the POU heard as you would say it: the point of the question, in plain words */
        const q = R.pouList[R.pouI];
        if (!q) return 'I think I covered it.';
        const mine = q.say.replace(/\bYou'd\b/g, "I'd").replace(/\b[Yy]ou\b/g, 'I');
        return `So, ${mine[0] === 'I' && /^I\b/.test(mine) ? mine : mine[0].toLowerCase() + mine.slice(1)}`;
      }
      if (!R.def) return 'What should I do next?';
      return scriptFor(talkCtx(scene), n);
    },
    unpoint() {
      if (get().ui.point) setUi({ point: undefined });
    },
    jump,
  };

  const settled = () => asides === 0 && (!!R?.yn || !!R?.film || (queued === 0 && get().stage?.phase !== 'review'));
  const dev: EngineDev = {
    idle: async () => {
      for (let i = 0; i < 800 && !settled(); i++) await new Promise<void>((res) => { clock.setTimeout(res, 10); });
    },
    busy: () => !settled(),
    setFast(on) {
      fast = on;
    },
    tings: () => tingCount,
    setRepo(how) {
      if (R?.def) R.ctx.repo = R.def.demo.repo?.(how);
    },
    handIn: async (how) => {
      if (!canSubmit()) {
        const st = get().stage;
        if (st?.phase === 'feedback') {
          st.feedback.forEach((x) => {
            if (!x.checked) actions.toggleFeedback(x.id);
          });
          actions.resubmit();
        } else {
          jump('submit');
          await dev.idle();
        }
      }
      const def = R.def;
      if (!def) return;
      R.ctx.repo = def.demo.repo?.(how);
      const sub = def.demo[how]();
      if (def.deliverable.takes === 'link') actions.submitLink(sub.url ?? sub.name);
      else actions.submitFile(new File([sub.text ?? ''], sub.name, { type: 'text/csv' }));
    },
    csv: { parse, toCsv, clean, check, fxFrom, RAW },
  };

  return { actions, dev };
}
