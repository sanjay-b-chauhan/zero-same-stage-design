/* Her side of a check-in card, shared by both cards (the note check after a chapter, the check-in after the kickoff):
   the lines she says one after another, each on its recorded take, her words arriving on her voice, and the voice note
   rows you can play again. A line with no take, or a blocked one, still arrives, quietly. */
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { playTake, stopVoice, voiceRate } from '../audio';
import type { VoiceKey } from '../../content/check';
import { useFlow } from '../engine/store';
import { takeFor } from '../engine/takes';
import type { LineState } from './pouBrain';

/* your answer as a voice note: how long you held, the bars your mic drew, and the recording once it is saved */
export interface Voice {
  dur: number;
  bars: number[];
  url: string | null;
}

export interface Msg {
  id: number;
  from: 'her' | 'me';
  text: string;
  take?: { url: string; dur: number };
  voice?: Voice;
}

export const NOTE_BARS = 18;

/* the levels the mic gave every 50 ms, folded into the note's bars: 4 to 24 px, loud parts tall */
export function barsOf(levels: number[]): number[] {
  return Array.from({ length: NOTE_BARS }, (_, i) => {
    const a = Math.floor((i / NOTE_BARS) * levels.length);
    const b = Math.max(a + 1, Math.floor(((i + 1) / NOTE_BARS) * levels.length));
    const part = levels.slice(a, b);
    const v = part.length ? Math.max(...part) : 0.15;
    return Math.round(4 + Math.min(1, v * 1.4) * 20);
  });
}

/* a note with no recording behind it (typed, or answered for you): bars drawn from its words, its length read at a talking pace */
export function voiceOf(text: string): Voice {
  const words = text.split(/\s+/).filter(Boolean);
  const bars = Array.from({ length: NOTE_BARS }, (_, i) => {
    const w = words[Math.floor((i / NOTE_BARS) * Math.max(1, words.length))] ?? '';
    return Math.round(6 + ((w.length * 7 + i * 5) % 17));
  });
  return { dur: Math.max(1.5, words.length / 2.6), bars, url: null };
}

/* what a note plays: her take, or your recording */
export const noteSrc = (m: Msg): { url: string; dur: number } | undefined =>
  m.take ?? (m.voice?.url ? { url: m.voice.url, dur: m.voice.dur } : undefined);

export interface CardLine {
  text: string;
  state: LineState;
}

export interface CardState {
  lines: CardLine[];
  thread: Msg[];
  stream: { id: number; n: number } | null; /* her line being said: how many words are out */
  speaking: boolean;
  ended: boolean;
  won: boolean; /* every line said by you, none filled in by her */
  recording?: boolean; /* she is recording her next note: a quick beat before it lands */
}

export type CardStore = UseBoundStore<StoreApi<CardState>>;

export const blankCard = (): CardState => ({ lines: [], thread: [], stream: null, speaking: false, ended: false, won: false });

/* one speed for every voice note, kept across the check-in: 1x, 1.2x, 1.5x, then back */
export const RATES = [1, 1.2, 1.5] as const;
export const useRate = create<{ r: number }>(() => ({ r: 1 }));
export function cycleRate() {
  const i = RATES.indexOf(useRate.getState().r as (typeof RATES)[number]);
  const r = RATES[(i + 1) % RATES.length];
  useRate.setState({ r });
  voiceRate(r);
}

/* the voice note playing now and how far in, so only that row's wave moves */
export const useNote = create<{ id: number | null; p: number }>(() => ({ id: null, p: 0 }));

let mid = 0;
export const nextId = () => ++mid;

const level = (v: number) => useFlow.getState().actions.setLevel(v);
const wordCount = (t: string) => t.split(/\s+/).filter(Boolean).length;

export function push(store: CardStore, m: Omit<Msg, 'id'>): number {
  const id = nextId();
  store.setState({ thread: [...store.getState().thread, { ...m, id }] });
  return id;
}

export function showAll(store: CardStore) {
  const st = store.getState().stream;
  if (st) store.setState({ stream: { id: st.id, n: 1e6 } });
  useNote.setState({ id: null, p: 0 });
}

export function setLine(store: CardStore, i: number, state: LineState) {
  store.setState({ lines: store.getState().lines.map((l, k) => (k === i ? { ...l, state } : l)) });
}

export async function say(
  store: CardStore,
  texts: string[],
  voice: VoiceKey,
  alive: () => boolean,
  wait: (ms: number) => Promise<void>,
  recordMs = 0
): Promise<void> {
  stopReplay();
  store.setState({ speaking: true });
  for (const text of texts) {
    if (!alive()) return;
    /* she records it first: a short beat with her mic live, then the note lands */
    if (recordMs > 0) {
      store.setState({ recording: true });
      await wait(recordMs);
      store.setState({ recording: false });
      if (!alive()) return;
    }
    const take = takeFor(text, voice);
    const id = push(store, { from: 'her', text, take: take ? { url: take.url, dur: take.dur } : undefined });
    const n = wordCount(text);
    store.setState({ stream: { id, n: 0 } });
    let began = false;
    if (take) {
      useNote.setState({ id, p: 0 });
      await playTake(take.url, {
        onLevel: (v) => {
          if (alive()) level(v);
        },
        onTime: (t) => {
          if (!alive()) return;
          began = true;
          useNote.setState({ id, p: Math.min(1, t / Math.max(0.1, take.dur)) });
          const out = Math.ceil(n * Math.min(1, (t + 0.2) / Math.max(0.4, take.dur * 0.92)));
          if (out !== store.getState().stream?.n) store.setState({ stream: { id, n: out } });
        },
      });
    }
    if (!alive()) return;
    if (!began) {
      for (let k = 1; k <= n; k++) {
        store.setState({ stream: { id, n: k } });
        await wait(55);
        if (!alive()) return;
      }
    }
    store.setState({ stream: { id, n: 1e6 } });
    useNote.setState({ id: null, p: 0 });
    level(0);
  }
  if (alive()) store.setState({ speaking: false });
}

/* the play key on one of her voice notes: that note again, unless she is talking or you are */
let replayTok = 0;
export function replayNote(m: Msg, busy: boolean) {
  const src = noteSrc(m);
  if (!src || busy) return;
  const tok = ++replayTok;
  if (useNote.getState().id === m.id) {
    stopVoice();
    level(0);
    useNote.setState({ id: null, p: 0 });
    return;
  }
  const take = src;
  useNote.setState({ id: m.id, p: 0 });
  void playTake(take.url, {
    onLevel: (v) => {
      if (tok === replayTok) level(v);
    },
    onTime: (t) => {
      if (tok === replayTok) useNote.setState({ id: m.id, p: Math.min(1, t / Math.max(0.1, take.dur)) });
    },
  }).then(() => {
    if (tok !== replayTok) return;
    level(0);
    useNote.setState({ id: null, p: 0 });
  });
}

export const stopReplay = () => {
  ++replayTok;
};
