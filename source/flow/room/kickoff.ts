/* The kickoff player. One take a chapter; the film, her caption and the wrap are worked out from (chapter, second) on every
   frame, so a seek, a dev landing or a blocked play is right by construction. Every take carries a token: anything that
   starts or stops her bumps it, and a stale take's ending is ignored. No checks inside the meeting: it plays through,
   holds on the deck's last frame a beat after her last word. After her hello the notes slide in beside the film on their
   own and the meeting carries on. A chapter that teaches ends on "Are we clear?": Yes writes its key points into the notes
   and moves on, the replay key plays it again. After the last one, the meeting carries you into the check-in on its own.
   b11: after her hello she asks if you are ready to take notes, and waits for Okay. */
import { create } from 'zustand';
import { pauseVoice, playTake, resumeVoice, seekVoice, stopVoice, voiceNow, voiceRate } from '../audio';
import { devMark } from '../dev/store';
import { useFlow } from '../engine/store';
import type { ProjectId } from '../types';
import { timerGroup, usePrefs, type Speed } from './prefs';
import { takesNotes } from './grade';
import { awardXp } from '../hud/xp';
import { gradeChapter, hasWritten, notesWritten, writeChapter, writeThrough, xpOf } from './notesStore';
import { runOf, type Run } from './run';
import { capsOf, locate, offsetsOf, totalOf, type Cap } from './timeline';

export type KickPhase = 'play' | 'done';
/* the meeting notes: not yet, then open beside the film */
export type KickNotes = 'off' | 'on';

interface KickState {
  seg: number;
  t: number; /* seconds inside the chapter */
  max: number; /* how far you may seek on the whole timeline: what you watched */
  playing: boolean;
  phase: KickPhase;
  replay: boolean; /* came back from the overview: free to seek */
  notes: KickNotes;
  check: number | null; /* the chapter whose "Are we clear?" is up: the meeting waits on it */
  writing: boolean; /* Yes was said: the chapter's key points are landing in the notes */
  ready: boolean; /* her hello is over: "Ready to take notes?" waits for Okay */
}

export const useKick = create<KickState>(() => ({ seg: 0, t: 0, max: 0, playing: false, phase: 'play', replay: false, notes: 'off', check: null, writing: false, ready: false }));

/* on a replay, how long the last frame holds before the film grows back into the plan */
const HOLD_MS = 1600;
/* her face has gone down to its corner and the notes are sliding in: a beat before she goes on */
const NOTES_MS = 1150;
/* her last word, then the film carries you into the check-in */
const TO_POU_MS = 900;
/* the last key point has landed: a beat before the next chapter */
const AFTER_WRITE_MS = 650;
/* b28 (his note: "it takes a pause ... after that you just quickly should go to the next step") */
const AFTER_PAY_MS = 450;

let run: Run = runOf('spotify');
let project: ProjectId = 'spotify';
let offs: number[] = offsetsOf(run);
let caps: Cap[][] = run.segments.map(capsOf);
let total = totalOf(run);
let R = 0;
let live = false; /* a take of this chapter is loaded, playing or paused */
const timers = timerGroup();

const S = () => useKick.getState();
const set = (p: Partial<KickState>) => useKick.setState(p);
const flow = () => useFlow.getState().actions;
const level = (v: number) => flow().setLevel(v);

export const kick = {
  run: () => run,
  offsets: () => offs,
  total: () => total,
  caps: () => caps,
  project: () => project,
};

const sync = (seg: number, t: number) => set(seg !== S().seg ? { seg, t } : { t });

/* 95 percent of a chapter counts as the whole of it */
function watched(seg: number, t: number) {
  const dur = run.segments[seg]?.audio_duration_sec ?? 0;
  const T = offs[seg] + (t >= dur * 0.95 ? dur : t);
  if (T > S().max) set({ max: T });
}

const halt = () => {
  ++R;
  live = false;
  timers.clear();
  stopVoice();
  level(0);
};

function startTake(t: number) {
  const tok = ++R;
  const s = S();
  const seg = run.segments[s.seg];
  if (!seg) return;
  timers.clear();
  live = true;
  set({ playing: true, phase: 'play' });
  voiceRate(usePrefs.getState().speed);
  const p = playTake(seg.segment_combined_audio_url, {
    onLevel: (v) => {
      if (tok === R) level(v);
    },
    onTime: (x) => {
      if (tok !== R) return;
      const at = S().seg;
      sync(at, x);
      watched(at, x);
    },
  });
  if (t > 0.01) seekVoice(t);
  void p.then(() => {
    if (tok !== R) return;
    live = false;
    level(0);
    /* a natural end moves on. Anything else (blocked after a reload, a failed file, a stop from outside) leaves it paused and ready */
    if (voiceNow()?.ended) advance();
    else set({ playing: false });
  });
}

function loadSeg(i: number, t: number, play: boolean) {
  halt();
  const seg = run.segments[i];
  if (!seg) return;
  set({ seg: i, t, phase: 'play', playing: play });
  devMark(`kickoff:${seg.id}`);
  if (play) startTake(t);
}

/* her hello is over: she goes down to her corner on the first panel, the notes slide in beside her, then she goes on */
function notesArrive() {
  set({ notes: 'on', max: Math.max(S().max, offs[1] ?? 0) });
  loadSeg(1, 0, false);
  const tok = R;
  timers.after(NOTES_MS, () => {
    if (tok === R && S().seg === 1 && !S().playing) startTake(0);
  });
}

function advance() {
  const i = S().seg;
  const seg = run.segments[i];
  if (i === 0 && S().notes === 'off' && run.segments.length > 1) {
    halt();
    set({ playing: false, t: seg.audio_duration_sec, ready: true });
    devMark('kickoff:ready');
    return;
  }
  /* a chapter that teaches asks if you are clear before it moves on, the first time through */
  if (seg && takesNotes(seg) && !S().replay && !notesWritten(seg.id)) {
    halt();
    set({ playing: false, t: seg.audio_duration_sec, check: i });
    devMark(`kickoff:check-${seg.id}`);
    return;
  }
  if (i < run.segments.length - 1) {
    loadSeg(i + 1, 0, true);
    return;
  }
  halt();
  set({ playing: false, phase: 'done', t: seg.audio_duration_sec, max: total });
  /* a replay goes back to the plan it came from; the first time through, the check-in follows on its own */
  if (S().replay) timers.after(HOLD_MS, () => flow().goto('objective'));
  else {
    devMark('kickoff:end');
    const tok = R;
    timers.after(TO_POU_MS, () => {
      if (tok === R && useFlow.getState().screen === 'kickoff') flow().goto('pou');
    });
  }
}

/* Okay: the Room has put her into her corner; the notes come in and she goes on */
export function kickReady() {
  if (!S().ready) return;
  set({ ready: false });
  notesArrive();
}

/* ---- what the Room calls ---- */

export function kickSetup(p: ProjectId) {
  halt();
  project = p;
  run = runOf(p);
  offs = offsetsOf(run);
  caps = run.segments.map(capsOf);
  total = totalOf(run);
  set({ seg: 0, t: 0, max: 0, playing: false, phase: 'play', replay: false, notes: 'off', check: null, writing: false, ready: false });
}

export function kickBegin(delay: number) {
  halt();
  set({ replay: false, phase: 'play', notes: 'off', check: null, writing: false, ready: false });
  timers.after(delay, () => loadSeg(0, 0, true));
}

/* back from the overview: every chapter open, the overview again at the end */
export function kickReplay() {
  writeThrough(run.segments.length);
  set({ replay: true, max: total, notes: 'on', check: null, writing: false, ready: false });
  loadSeg(0, 0, true);
}

/* keepVoice: leave whatever is speaking now alone (the plan view may have just started her) */
export function kickStop(keepVoice = false) {
  if (keepVoice) {
    ++R;
    live = false;
    timers.clear();
  } else halt();
  voiceRate(1);
  set({ playing: false });
}

/* the whole meeting behind you. For landing after it */
export function kickFinished() {
  kickStop(true);
  const last = run.segments.length - 1;
  writeThrough(run.segments.length);
  set({ seg: last, t: run.segments[last].audio_duration_sec, max: total, playing: false, phase: 'done', replay: false, notes: 'on', check: null, writing: false, ready: false });
}

export function kickPlay() {
  const s = S();
  if (s.check !== null || s.writing || s.ready) return;
  if (s.phase === 'done') {
    loadSeg(0, 0, true);
    return;
  }
  if (live && voiceNow()) {
    resumeVoice();
    set({ playing: true });
    const tok = R;
    timers.after(300, () => {
      if (tok === R && voiceNow()?.paused) set({ playing: false });
    });
    return;
  }
  const dur = run.segments[s.seg]?.audio_duration_sec ?? 0;
  startTake(s.t >= dur - 0.05 ? 0 : s.t);
}

export function kickPause() {
  if (!S().playing) return;
  pauseVoice();
  timers.clear();
  set({ playing: false });
  level(0);
}

export const kickToggle = () => (S().playing ? kickPause() : kickPlay());

export function kickSeek(T: number) {
  const s = S();
  if (s.writing) return;
  if (s.ready) set({ ready: false });
  /* a seek while she asks puts the question away; the end of the chapter asks it again */
  if (s.check !== null) set({ check: null });
  const lim = s.replay ? total : Math.min(s.max, total);
  const to = Math.max(0, Math.min(T, lim));
  const { seg, t } = locate(run, offs, to);
  timers.clear();
  const play = s.playing || s.phase === 'done';
  if (seg !== s.seg || !live) {
    loadSeg(seg, t, play);
    return;
  }
  set({ phase: 'play' });
  seekVoice(t);
  sync(seg, t);
}

export const kickNudge = (d: number) => {
  const s = S();
  kickSeek(offs[s.seg] + s.t + d);
};

export function kickSpeed(r: Speed) {
  usePrefs.setState({ speed: r });
  voiceRate(r);
}

/* Yes: the chapter's key points write themselves into the notes, then the next chapter */
export function kickClear() {
  const i = S().check;
  const seg = i === null ? undefined : run.segments[i];
  if (i === null || !seg) return;
  const tok = R;
  set({ check: null, writing: true });
  /* b17 (his note: "if I write some notes it should analyse first all my notes, and if it matches give me XP"): notes you
     wrote are read, checked line by line, her missing points written under them, and each line that matches pays */
  const wrote = hasWritten(seg.id);
  const check = wrote ? gradeChapter : writeChapter;
  check(seg.id, true, () => {
    if (tok !== R) return;
    if (wrote) {
      /* b23 (his note: "let's not add that motion from the meeting notes to the XP"): each line already shows what it
         earned; the head sums it and the Level counts up where it is, nothing flies */
      /* b28 (his note: "the meeting notes at the top are like +100 ... we don't need that at the top. 50, 25, that
         makes sense"): the lines keep what they earned, the head stays Meeting notes */
      const amount = xpOf(seg.id);
      if (amount > 0) awardXp({ amount, reason: 'Notes check', id: `notes:${seg.id}`, quiet: true });
    }
    timers.after(wrote ? AFTER_PAY_MS : AFTER_WRITE_MS, () => {
      if (tok !== R) return;
      set({ writing: false });
      if (i < run.segments.length - 1) loadSeg(i + 1, 0, true);
    });
  });
}

/* the replay key: the chapter again from its start; its end asks again */
export function kickAgain() {
  const i = S().check;
  if (i === null) return;
  set({ check: null });
  loadSeg(i, 0, true);
}

/* developer mode: land on a moment from any state */
export function kickLand(id: string) {
  kickStop();
  const segs = run.segments;
  set({ check: null, writing: false, replay: false, ready: false });
  /* her hello over, "Ready to take notes?" waiting */
  if ((id === 'kickoff:ready' || id === 'kickoff:notes') && segs.length > 1) {
    writeThrough(0);
    set({ max: offs[0] + segs[0].audio_duration_sec, seg: 0, t: segs[0].audio_duration_sec, phase: 'play', playing: false, notes: 'off', ready: true });
    devMark('kickoff:ready');
    return;
  }
  /* a chapter's "Are we clear?", everything before it written */
  if (id.startsWith('kickoff:check-')) {
    const i = segs.findIndex((x) => `kickoff:check-${x.id}` === id);
    if (i > 0) {
      writeThrough(i);
      set({ max: offs[i] + segs[i].audio_duration_sec, seg: i, t: segs[i].audio_duration_sec, phase: 'play', playing: false, notes: 'on', check: i });
      devMark(id);
      return;
    }
  }
  /* the meeting over: the check-in follows */
  if (id === 'kickoff:end') {
    const last = segs.length - 1;
    writeThrough(segs.length);
    set({ max: total, seg: last, t: segs[last].audio_duration_sec, phase: 'done', playing: false, notes: 'on' });
    devMark(id);
    const tok = R;
    timers.after(TO_POU_MS, () => {
      if (tok === R && useFlow.getState().screen === 'kickoff') flow().goto('pou');
    });
    return;
  }
  const i = Math.max(
    0,
    segs.findIndex((x) => `kickoff:${x.id}` === id)
  );
  writeThrough(i);
  set({ max: offs[i], notes: i === 0 ? 'off' : 'on' });
  loadSeg(i, 0, true);
}
