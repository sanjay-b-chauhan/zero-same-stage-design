/* Her reaction on your line. When what you wrote (or the file you sent) fills a slot, she puts one emoji on it, the way a
   person reacts in chat, before she answers. One emoji a moment, never confetti. The engine says when; this keeps which
   line got what, so the big screen and the PiP draw the same. A reaction belongs to one message: its id and its time. */
import { create } from 'zustand';
import type { Msg, Step } from '../../types';

export interface Reaction {
  e: string;
  fill?: string; /* b15: what your line added, said over her answer ("Added to your slots · Issue 2") */
  msgAt: number; /* the message's own time, so a reused id never picks up an old reaction */
  at: number; /* when she reacted, so only a fresh one springs in */
}

export const useReactions = create<Record<string, Reaction>>(() => ({}));

/* how fresh your line has to be for her to react to it, and how fresh a reaction is to still spring in on a mount */
const LINE_MS = 20000;
export const FRESH_MS = 900;

/* one per moment, and every one reads as praise at a glance (his note, b14: "Oh, really great"): a find takes turns between
   three so a run of them never repeats, the last find of a step is both hands up, the prompt you agreed is applause, the
   link or answer she checked is a hundred, the file you handed in is fire */
const FIND = ['🔥', '👏', '💯'];
export const emojiFor = (step: Step, stepDone: boolean): string => {
  if (step.kind === 'find') {
    if (stepDone) return '🙌';
    const n = step.slots.filter((x) => x.filled).length;
    return FIND[Math.max(0, n - 1) % FIND.length];
  }
  if (step.kind === 'prompt') return '👏';
  if (step.kind === 'ask') return '💯';
  return '🔥';
};

/* the line of yours she is reacting to: your latest, if it is recent and is words or a file you sent */
const yourLine = (msgs: Msg[], now: number): Msg | undefined => {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m.from !== 'me') continue;
    if (m.stuck || m.sys || now - m.at > LINE_MS) return undefined;
    return m.text || m.file ? m : undefined;
  }
  return undefined;
};

export function react(msgs: Msg[], e: string, fill?: string): void {
  const now = Date.now();
  const m = yourLine(msgs, now);
  if (!m || useReactions.getState()[m.id]?.msgAt === m.at) return;
  useReactions.setState({ [m.id]: { e, fill, msgAt: m.at, at: now } });
}

/* b15 (his note, 3 Nov: "Don't write 'check your slots' ... If something goes well, then 'added to your slot', 'issue number
   1'"): the line over her answer names what your words just did, the number the find took on the board */
export const fillLine = (step: Step, slotId: string): string => {
  if (step.kind !== 'find') return `Added to your slots · ${step.label}`;
  const n = step.slots.findIndex((x) => x.id === slotId) + 1;
  return `Added to your slots · Issue ${Math.max(1, n)}`;
};

export const fillsOf = (r: Record<string, Reaction>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [id, x] of Object.entries(r)) if (x.fill) out[id] = x.fill;
  return out;
};

export const clearReactions = () => useReactions.setState({}, true);
