/* The rules of the PIP as plain functions. No DOM, no React.
   Closed, it is one row of keys, 52 high, which is Chrome's floor for the real window too.
   It grows only while you look at something, then goes back. */
import type { Msg, Phase, PipBody, StageState, Step } from '../types';

export const KEY = 36; /* every circle in the bar, her face included */
export const KEY_GAP = 4;
export const BAR_PAD = 8; /* the same all round */
export const BAR_KEYS = 7;
export const BAR_W = BAR_PAD * 2 + BAR_KEYS * KEY + (BAR_KEYS - 1) * KEY_GAP; /* 292: the row and nothing else. Opening only grows it down */
export const BAR_H = BAR_PAD * 2 + KEY; /* 52 */
export const WIN_FLOOR_H = 52; /* Chrome's floor for a Document PiP is 240 x 52 */
export const OPEN_W = BAR_W;
export const CHAT_H = 540;
export const PANEL_H = 560; /* feedback, the drop, the POU */
export const MIN_OPEN_H = 180;
export const RES_MAX_H = 480;
export const WIDE_W = 520;
export const WIDE_H = 640;
export const STAMP_H = 18; /* the build number's own line, real window only */
export const STRIP_H = 34; /* Chrome's own strip above the page */
export const TALL_AT = 120; /* a window taller than this is opened, whoever resized it */

export interface Size {
  w: number;
  h: number;
}

export type ShownBody = PipBody | 'submit' | 'feedback' | 'pou';

export const isWide = (b: PipBody): boolean => b === 'preview' || b === 'film';

/* a body whose height is measured from what it holds, the rest have a fixed one */
export const isMeasured = (b: ShownBody): boolean => b === 'slots' || b === 'resources' || b === 'feedback';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* Every view has its own floor and ceiling. You can pull the window to any size between them;
   a key springs it back to the view's own size. A list is as tall as what it holds, so a short list is a short window. */
export interface Limits {
  min: Size;
  max: Size;
}
export const LIMITS: Record<ShownBody, Limits> = {
  chat: { min: { w: BAR_W, h: 320 }, max: { w: 560, h: 820 } },
  slots: { min: { w: BAR_W, h: 96 }, max: { w: 520, h: PANEL_H } },
  resources: { min: { w: BAR_W, h: 96 }, max: { w: 480, h: RES_MAX_H } },
  feedback: { min: { w: BAR_W, h: MIN_OPEN_H }, max: { w: 520, h: 680 } },
  submit: { min: { w: BAR_W, h: 300 }, max: { w: 520, h: 680 } },
  pou: { min: { w: BAR_W, h: 360 }, max: { w: 520, h: 760 } },
  preview: { min: { w: 400, h: 360 }, max: { w: 960, h: 900 } },
  film: { min: { w: 400, h: 300 }, max: { w: 960, h: 760 } },
};
export const clampSize = (s: Size, l: Limits): Size => ({ w: Math.round(clamp(s.w, l.min.w, l.max.w)), h: Math.round(clamp(s.h, l.min.h, l.max.h)) });

/* natural: the measured height under the bar, when the body is one that is measured */
export const sizeFor = (open: boolean, shown: ShownBody, natural?: number): Size => {
  if (!open) return { w: BAR_W, h: BAR_H };
  const l = LIMITS[shown];
  if (shown === 'preview' || shown === 'film') return clampSize({ w: WIDE_W, h: WIDE_H }, l);
  if (shown === 'chat') return { w: OPEN_W, h: CHAT_H };
  if (isMeasured(shown)) return { w: OPEN_W, h: Math.round(clamp(Math.ceil(BAR_H + (natural ?? 200)), l.min.h, l.max.h)) };
  return { w: OPEN_W, h: PANEL_H };
};

/* 'slots' is the work tab. What the work is depends on where the stage is. */
export const shownBody = (body: PipBody, phase: Phase, submitOpen: boolean): ShownBody => {
  /* the POU is the only thing the small window shows while it runs */
  if (phase === 'pou') return 'pou';
  if (body !== 'slots') return body;
  if (submitOpen) return 'submit';
  if (phase === 'feedback') return 'feedback';
  return 'slots';
};

/* the composer is under the chat while there is still something to say. Under the slots sits the one key. */
export const hasComposer = (shown: ShownBody, phase: Phase, done: boolean): boolean => {
  if (shown !== 'chat') return false;
  return (phase === 'work' && !done) || phase === 'feedback';
};

/* the same test the submit key uses: every step before the submit step is done */
export const workDone = (stage: StageState | null | undefined): boolean => {
  const steps = stage?.steps ?? [];
  const work = steps.filter((x) => x.kind !== 'submit');
  return work.length > 0 && work.every((x) => x.state === 'done');
};

export const workSteps = (steps: Step[] | undefined): Step[] => (steps ?? []).filter((x) => x.kind !== 'submit');

export const lastFromMe = (msgs: Msg[] | undefined): Msg | undefined => {
  if (!msgs) return undefined;
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].from === 'me') return msgs[i];
  return undefined;
};

export const lastVoice = (msgs: Msg[] | undefined): Msg | undefined => {
  if (!msgs) return undefined;
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].voice) return msgs[i];
  return undefined;
};

/* her note on the POU screen. Once you have answered it, it is behind you. */
export const openNote = (msgs: Msg[] | undefined): Msg | undefined => {
  const q = lastVoice(msgs);
  const mine = lastFromMe(msgs);
  return q && mine && msgs && msgs.indexOf(mine) > msgs.indexOf(q) ? undefined : q;
};

export const fixesLabel = (open: number): string => (open === 1 ? '1 fix' : `${open} fixes`);

/* Same rule as the key: a name that starts in capitals keeps them. Submit GitHub repo */
export const submitLabel = (deliverable: string | undefined): string => {
  if (!deliverable) return 'Submit';
  const keep = /^[A-Z][a-z]+[A-Z]/.test(deliverable) || /^[A-Z]{2}/.test(deliverable);
  return `Submit ${keep ? deliverable : deliverable[0].toLowerCase() + deliverable.slice(1)}`;
};
