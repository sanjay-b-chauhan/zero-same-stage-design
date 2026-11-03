/* What she really did before an answer, as small grey lines above it. Facts only, never filler:
   the frame she saw, the file she read, what your words added to your slots, the question you asked her.
   b15 (his note, 3 Nov): never "Checked your slots". It read as her going back to scan your work every time you pressed
   Enter. A line is only there when something happened: she viewed your screen, read your file, or your words landed a find.
   Frames are kept here by the id of your message. The rest is read from the thread itself. */
import { create } from 'zustand';
import { useFlow } from '../engine/store';
import type { Msg, Phase, Step } from '../types';

export interface Frame {
  url: string;
  w: number;
  h: number;
  kind: 'screen' | 'file';
  name?: string;
}

export type SeenKey = 'screen' | 'file' | 'read' | 'slots' | 'asked';

export interface SeenItem {
  key: SeenKey;
  label: string;
  frame?: Frame;
}

interface SentMeta {
  phase: Phase;
  step?: Step['kind'];
}

interface SeenState {
  frames: Record<string, Frame>;
  sent: Record<string, SentMeta>;
  /* a frame taken for words you are about to type */
  pending: { frame: Frame; until: number } | null;
}

export const useSeen = create<SeenState>(() => ({ frames: {}, sent: {}, pending: null }));

export const attachFrame = (msgId: string, frame: Frame): void =>
  useSeen.setState((s) => ({ frames: { ...s.frames, [msgId]: frame } }));

export const holdFrame = (frame: Frame, ms: number): void => useSeen.setState({ pending: { frame, until: Date.now() + ms } });

/* Every message you send is stamped with where the stage was, so the line under it can say what was checked. */
let known = 0;
let firstId: string | undefined;
useFlow.subscribe((s) => {
  const st = s.stage;
  const msgs = st?.msgs;
  if (!st || !msgs) {
    known = 0;
    firstId = undefined;
    return;
  }
  if (msgs.length < known || msgs[0]?.id !== firstId) {
    known = 0;
    useSeen.setState({ frames: {}, sent: {}, pending: null });
  }
  firstId = msgs[0]?.id;
  if (msgs.length === known) return;
  const fresh = msgs.slice(known);
  known = msgs.length;
  const now = st.steps.find((x) => x.state === 'now');
  const sent: Record<string, SentMeta> = {};
  let typed: string | null = null;
  const { pending } = useSeen.getState();
  for (const m of fresh) {
    if (m.from !== 'me') continue;
    sent[m.id] = { phase: st.phase, step: now?.kind };
    if (!typed && pending && pending.until > Date.now() && m.text && !m.voiced) typed = m.id;
  }
  if (!Object.keys(sent).length) return;
  useSeen.setState((x) => ({
    sent: { ...x.sent, ...sent },
    ...(typed && pending ? { frames: { ...x.frames, [typed]: pending.frame }, pending: null } : {}),
  }));
});

const QUESTION = /\?\s*$|^(how|what|why|where|when|which|who|can|could|should|would|is|are|do|does|did|will|am|any)\b/i;
const YES_NO = /^(y|yes|yep|yeah|sure|n|no|nope|not really)[.!]?$/i;
const UNSURE = /^(i\s+)?(don'?t know|do not know|dunno|no idea|not sure|idk)\b/i;

const itemsFor = (p: Msg, frame: Frame | undefined, meta: SentMeta | undefined, first: string, fill: string | undefined): SeenItem[] => {
  if (meta?.phase === 'pou' || meta?.phase === 'done') return [];
  const items: SeenItem[] = [];
  if (frame) items.push({ key: frame.kind === 'screen' ? 'screen' : 'file', label: frame.kind === 'screen' ? 'Viewed your screen' : 'Viewed your file', frame });
  else if (p.file?.kind === 'image' && p.file.url) items.push({ key: 'screen', label: 'Viewed your screen', frame: { url: p.file.url, w: 0, h: 0, kind: 'screen' } });
  const text = (p.text ?? '').trim();
  if (p.file && (p.file.kind === 'csv' || p.file.kind === 'text')) items.push({ key: 'read', label: 'Read your file' });
  else if (fill) items.push({ key: 'slots', label: fill });
  else if (p.stuck || (text && QUESTION.test(text))) items.push({ key: 'asked', label: `Asked ${first}` });
  return items.slice(0, 2);
};

/* her first answer after something you sent carries the lines. A second line from her in a row carries none. */
export function seenLines(
  msgs: Msg[],
  frames: Record<string, Frame>,
  sent: Record<string, SentMeta>,
  first: string,
  fills: Record<string, string> = {}
): Map<string, SeenItem[]> {
  const out = new Map<string, SeenItem[]>();
  let ask: Msg | null = null;
  for (const m of msgs) {
    if (m.from === 'me') {
      ask = m;
      continue;
    }
    if (m.sys || !ask) continue;
    const items = itemsFor(ask, frames[ask.id], sent[ask.id], first, fills[ask.id]);
    if (items.length) out.set(m.id, items);
    ask = null;
  }
  return out;
}
