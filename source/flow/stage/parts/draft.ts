/* View state that has to survive a switch between the big screen and the PIP.
   Flow state lives in the engine. This is only what a person was in the middle of. */
import { create } from 'zustand';
import { useFlow } from '../../engine/store';

export interface FilmProgress {
  t: number; /* seconds at the playhead */
  max: number; /* furthest point reached, drag can only go back from here */
  speed: number;
  paused: boolean;
}

interface DraftState {
  text: string;
  link: string;
  stepOpen: Record<string, boolean>; /* a done step someone opened or closed by hand */
  slotOpen: Record<string, boolean>; /* a done slot opened to show what filled it */
  pouFrom: number; /* where the POU room starts in the thread */
  noteOpen: Record<string, boolean>;
  film: Record<string, FilmProgress>;
  clips: Record<string, { url: string; dur: number }>; /* my own held takes, by what was heard */
  repeat: boolean; /* the last hold caught no words */
  holdAt: number; /* ms, when the current hold started */
  frozen: Record<string, number>; /* stage id to ms left when it ended */
  set(p: Partial<Omit<DraftState, 'set' | 'patch'>>): void;
  patch<K extends 'stepOpen' | 'slotOpen' | 'noteOpen' | 'film' | 'clips' | 'frozen'>(
    k: K,
    id: string,
    v: DraftState[K][string]
  ): void;
}

export const useDraft = create<DraftState>((set) => ({
  text: '',
  link: '',
  stepOpen: {},
  slotOpen: {},
  pouFrom: 0,
  noteOpen: {},
  film: {},
  clips: {},
  repeat: false,
  holdAt: 0,
  frozen: {},
  set: (p) => set(p),
  patch: (k, id, v) => set((s) => ({ [k]: { ...s[k], [id]: v } }) as Partial<DraftState>),
}));

/* The POU is its own room. It starts with whatever she says after the phase turns, on either surface. */
let lastPhase: string | undefined;
useFlow.subscribe((s) => {
  const phase = s.stage?.phase;
  if (phase === lastPhase) return;
  lastPhase = phase;
  if (phase === 'pou') useDraft.getState().set({ pouFrom: s.stage?.msgs.length ?? 0 });
  else if (phase !== 'done') useDraft.getState().set({ pouFrom: 0 });
});

/* Which messages each surface has already shown, so a switch never replays an entrance. */
const seen: Record<string, Set<string>> = { big: new Set(), pip: new Set() };
export const seenOn = (surface: string): Set<string> => seen[surface] ?? (seen[surface] = new Set());
