/* The note check at the end of a chapter, in b36's card that grows out of its mark. The points she made sit blurred;
   each note you say or type is graded on the spot (NOTE_KEYS, in the browser) and a point it covers pops sharp with a ting.
   All of them and she says so. "That's all" and she fills in the rest herself, and the mark stays white. */
import { create } from 'zustand';
import { stopVoice } from '../audio';
import { END_ALL, END_SOME, VOICE_OF } from '../../content/check';
import { useFlow } from '../engine/store';
import type { ProjectId } from '../types';
import { answerAsk, pointsOf } from './grade';
import { addNote, coveredOf, gradeChapter, sampleOf, writtenOf } from './notesStore';
import { sfx, timerGroup } from './prefs';
import type { Run, RunSegment } from './run';
import { blankCard, push, say as sayInto, setLine, showAll, stopReplay, type CardState } from './talk';

export const NOTES_ASK = 'Are we clear? Tell me what you took from that.';

interface NcState extends CardState {
  segId: string | null;
  asked: boolean; /* she has asked, so your answers count */
}

export const useNc = create<NcState>(() => ({ ...blankCard(), segId: null, asked: false }));

const S = () => useNc.getState();
const set = (p: Partial<NcState>) => useNc.setState(p);
const level = (v: number) => useFlow.getState().actions.setLevel(v);
const timers = timerGroup();
const pops = timerGroup();

let R = 0;
let project: ProjectId = 'spotify';
let run: Run | null = null;
let seg: RunSegment | null = null;
let ids: string[] = [];
let onDone: ((won: boolean) => void) | null = null;
let closing = false; /* she is wrapping up: nothing more counts */

const wait = (ms: number) => new Promise<void>((r) => timers.after(ms, r));
const say = (texts: string[], tok: number) => sayInto(useNc, texts, VOICE_OF[project], () => tok === R, wait);

const QUESTION = /\?\s*$|^(what|why|how|when|where|who|which|can|could|do|does|did|is|are|should|would|will)\b/i;

function finish(won: boolean) {
  const id = S().segId;
  if (!id) return;
  gradeChapter(id, false);
  set({ ended: true, won, speaking: false });
  level(0);
  const cb = onDone;
  const tok = R;
  timers.after(650, () => {
    if (tok === R) cb?.(won);
  });
}

/* pop every line your notes now cover. Returns true once nothing is left */
function popCovered(): boolean {
  const id = S().segId;
  if (!id) return false;
  const cov = new Set(coveredOf(id));
  let k = 0;
  S().lines.forEach((l, i) => {
    if (l.state !== 'open' || !cov.has(ids[i])) return;
    setLine(useNc, i, 'said');
    const at = k++ * 110;
    pops.after(at, () => sfx.ting());
  });
  return ids.length > 0 && ids.every((x) => cov.has(x));
}

function allIn(tok: number) {
  closing = true;
  timers.after(260, () => {
    if (tok !== R) return;
    void say([END_ALL], tok).then(() => {
      if (tok === R) finish(true);
    });
  });
}

/* the card opens: her face lands, she asks, and anything you already wrote is checked in front of you */
export function ncOpen(p: ProjectId, r: Run, segId: string, done: (won: boolean) => void, delay = 900) {
  ncStop();
  project = p;
  run = r;
  seg = r.segments.find((s) => s.id === segId) ?? null;
  onDone = done;
  const points = seg ? pointsOf(r, seg) : [];
  ids = points.map((x) => x.id);
  closing = false;
  set({ ...blankCard(), segId, asked: false, lines: points.map((x) => ({ text: x.description, state: 'open' as const })) });
  const tok = R;
  timers.after(delay, () => {
    if (tok !== R) return;
    void say([NOTES_ASK], tok).then(() => {
      if (tok !== R) return;
      set({ asked: true });
      const mine = writtenOf(segId);
      if (!mine.length) return;
      mine.forEach((text, i) =>
        timers.after(i * 140, () => {
          if (tok === R) push(useNc, { from: 'me', text });
        })
      );
      timers.after(mine.length * 140 + 120, () => {
        if (tok === R && popCovered()) allIn(tok);
      });
    });
  });
}

export function ncStop(keepVoice = false) {
  ++R;
  timers.clear();
  pops.clear();
  stopReplay();
  if (!keepVoice) {
    stopVoice();
    level(0);
  }
  showAll(useNc);
  set({ speaking: false });
}

export function ncClose() {
  ncStop();
  onDone = null;
  set({ ...blankCard(), segId: null, asked: false });
}

/* she stops the moment you start to talk */
export function ncHush() {
  if (!S().speaking) return;
  ++R;
  timers.clear();
  stopVoice();
  level(0);
  showAll(useNc);
  set({ speaking: false, asked: true });
}

/* one note, said or typed. A question gets her answer from this chapter instead, and counts for nothing */
export function ncAnswer(raw: string) {
  const s = S();
  const text = raw.trim();
  if (!s.segId || s.ended || closing || !text || !run || !seg) return;
  const tok = ++R;
  timers.clear();
  stopReplay();
  stopVoice();
  level(0);
  showAll(useNc);
  set({ speaking: false, asked: true });
  push(useNc, { from: 'me', text });
  if (QUESTION.test(text)) {
    const reply = answerAsk(run, seg, text);
    timers.after(140, () => {
      if (tok === R) void say([reply], tok);
    });
    return;
  }
  addNote(s.segId, text);
  if (popCovered()) allIn(tok);
}

/* "That's all": what you left out, she says herself, then the next chapter */
export function ncDone() {
  const s = S();
  if (!s.segId || s.ended || closing || !run || !seg) return;
  closing = true;
  const tok = ++R;
  timers.clear();
  stopReplay();
  stopVoice();
  level(0);
  showAll(useNc);
  if (popCovered()) {
    allIn(tok);
    return;
  }
  const missed: string[] = [];
  S().lines.forEach((l, i) => {
    if (l.state !== 'open') return;
    setLine(useNc, i, 'told');
    sfx.land(i);
    missed.push(l.text);
  });
  timers.after(140, () => {
    if (tok !== R) return;
    void say([...missed, END_SOME], tok).then(() => {
      if (tok === R) finish(false);
    });
  });
}

/* developer mode, "Fill my notes": the sample notes a person in a hurry writes, said one at a time, then That's all */
export function ncFillForMe() {
  const s = S();
  if (!s.segId || s.ended || closing) return;
  const notes = sampleOf(s.segId);
  notes.forEach((text, i) =>
    pops.after(i * 260, () => {
      if (S().ended) return;
      ncAnswer(text);
    })
  );
  pops.after(notes.length * 260 + 200, () => {
    if (!S().ended) ncDone();
  });
}
