/* XP. One store, one way to earn. 1,000 XP a level, as in zero-coach-levels b53. A slot never pays twice, jumps and
   replays included.
   `total` is what you have earned, the moment it is earned. `shown` is what the HUD shows: it catches up when each coin
   lands, counting over 900 ms. Coins leave 250 ms apart. Timers come from clock, so this runs while only PiP is visible. */
import { create } from 'zustand';
import { softLand, ting } from '../audio';
import { clock } from '../clock';
import { flyCoin, FLY, ms, reducedIn, setSlow } from './flight';

export const XP = {
  found: 60,
  foundGame: 40,
  told: 15,
  prompt: 80,
  approved: 150,
  pouLine: 40,
  noteLine: 10,
  gameFirstTry: 20,
  stage2Slot: 100,
  stageDone: 200,
} as const;

export const XP_START = 420;
export const PER_LEVEL = 1000;

export interface XpLine {
  id: string;
  amount: number;
  reason: string;
  at: number;
  landed?: boolean; /* its coin has reached the badge */
}

interface XpState {
  total: number;
  log: XpLine[];
  shown: number;
  gain: number; /* one more each time a coin lands: the badge bumps, the count shows */
  up: { level: number; n: number } | null; /* the last level you reached, n counts them */
}

const FRESH = { total: XP_START, log: [] as XpLine[], shown: XP_START, gain: 0, up: null };

export const useXp = create<XpState>(() => ({ ...FRESH }));

export const levelOf = (total: number) => Math.min(10, Math.floor(total / PER_LEVEL) + 1);
export const intoLevel = (total: number) => (levelOf(total) >= 10 ? 1 : (total % PER_LEVEL) / PER_LEVEL);

export interface Award {
  amount: number;
  reason: string;
  id?: string;
  from?: Element | DOMRect | null;
  /* pay without a coin and without a sound: for dev jumps that land on a moment with slots already filled */
  quiet?: boolean;
}

/* ---------- where the coin lands ---------- */

let hudBadge: Element | null = null;
/* the HUD hands in its badge while it is on screen, and null when it hides */
export const setHudBadge = (el: Element | null) => {
  hudBadge = el;
};

const isEl = (v: unknown): v is Element =>
  !!v && typeof (v as Element).getBoundingClientRect === 'function' && !!(v as Element).ownerDocument;

const isRect = (v: unknown): v is DOMRect =>
  !!v && typeof (v as DOMRect).width === 'number' && typeof (v as DOMRect).left === 'number';

const targetIn = (doc: Document) => (): Element | null => {
  if (doc === document && hudBadge?.isConnected) return hudBadge;
  return doc.querySelector('[data-xp-target]');
};

/* ---------- the count ---------- */

let cFrom = XP_START;
let cTo = XP_START;
let cStart = 0;
let cTimer = 0;

const show = (v: number) => {
  const s = useXp.getState();
  if (v === s.shown) return;
  const was = levelOf(s.shown);
  const now = levelOf(v);
  if (now > was) {
    useXp.setState({ shown: v, up: { level: now, n: (s.up?.n ?? 0) + 1 } });
    ting();
  } else useXp.setState({ shown: v });
};

const tick = () => {
  const k = Math.min(1, (Date.now() - cStart) / ms(FLY.count));
  const e = 1 - Math.pow(1 - k, 3);
  show(Math.round(cFrom + (cTo - cFrom) * e));
  if (k >= 1) {
    clock.clearInterval(cTimer);
    cTimer = 0;
  }
};

const countBy = (amount: number) => {
  const { shown } = useXp.getState();
  if (!cTimer) cTo = shown;
  cTo += amount;
  cFrom = shown;
  cStart = Date.now();
  if (!cTimer) cTimer = clock.setInterval(tick, 32);
};

/* a quiet award moves the number without a count */
const nudge = (amount: number) => {
  if (cTimer) {
    cFrom += amount;
    cTo += amount;
    return;
  }
  useXp.setState((s) => ({ shown: s.shown + amount }));
};

/* ---------- the queue ---------- */

let gen = 0;
let nextLaunch = 0;
let landings = 0;
const flights = new Set<() => void>();
const waits = new Set<number>();

const markLanded = (id: string) =>
  useXp.setState((s) => ({ log: s.log.map((l) => (l.id === id ? { ...l, landed: true } : l)) }));

const land = (id: string, amount: number) => {
  markLanded(id);
  useXp.setState((s) => ({ gain: s.gain + 1 }));
  softLand(landings++ % 6);
  countBy(amount);
};

const launch = (id: string, amount: number, reason: string, from: Element | DOMRect | null, rect0: DOMRect | null) => {
  const el = isEl(from) ? from : null;
  const doc = el?.ownerDocument ?? document;
  const rect = el?.isConnected ? el.getBoundingClientRect() : rect0;
  if (!rect || rect.width + rect.height < 1 || reducedIn(doc)) {
    land(id, amount);
    return;
  }
  const g = gen;
  let cancel: () => void = () => {};
  cancel = flyCoin({
    doc,
    rect,
    amount,
    reason,
    target: targetIn(doc),
    onLand: () => {
      flights.delete(cancel);
      if (g === gen) land(id, amount);
    },
  });
  flights.add(cancel);
};

export function awardXp(a: Award) {
  const amount = Math.round(Number(a.amount));
  if (!Number.isFinite(amount) || amount <= 0) return;
  const reason = String(a.reason ?? '').trim();
  const id = a.id ?? `${reason}:${Date.now()}`;
  const { log } = useXp.getState();
  if (log.some((l) => l.id === id)) return;
  useXp.setState((s) => ({ total: s.total + amount, log: [...s.log, { id, amount, reason, at: Date.now() }] }));

  if (a.quiet) {
    markLanded(id);
    nudge(amount);
    return;
  }

  const from = a.from ?? null;
  let rect0: DOMRect | null = null;
  try {
    rect0 = isEl(from) ? from.getBoundingClientRect() : isRect(from) ? from : null;
  } catch {
    rect0 = null;
  }
  const now = Date.now();
  const at = Math.max(now, nextLaunch);
  nextLaunch = at + ms(FLY.gap);
  const g = gen;
  const go = () => {
    if (g === gen) launch(id, amount, reason, from, rect0);
  };
  if (at <= now) go();
  else {
    const t = clock.setTimeout(() => {
      waits.delete(t);
      go();
    }, at - now);
    waits.add(t);
  }
}

export const resetXp = () => {
  gen++;
  flights.forEach((c) => c());
  flights.clear();
  waits.forEach((t) => clock.clearTimeout(t));
  waits.clear();
  if (cTimer) clock.clearInterval(cTimer);
  cTimer = 0;
  cFrom = cTo = XP_START;
  nextLaunch = 0;
  landings = 0;
  useXp.setState({ ...FRESH, log: [] });
};

/* ---------- test rail, nothing on screen ---------- */

interface RailAward extends Omit<Award, 'from'> {
  from?: Award['from'] | string;
}
const rail = window as unknown as {
  __xp?: { award: (a: RailAward) => void; reset: () => void; state: () => XpState; slow: (k: number) => void };
};
rail.__xp = {
  award: (a) => awardXp({ ...a, from: typeof a.from === 'string' ? document.querySelector(a.from) : a.from }),
  reset: resetXp,
  state: () => useXp.getState(),
  slow: setSlow,
};
