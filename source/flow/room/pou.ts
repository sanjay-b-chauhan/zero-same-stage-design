/* The check-in after the kickoff: she asks, you hold Space and answer, the meter at the top fills. The real logic
   (pouBrain.ts) with every wait cut: her next line starts about 140 ms after your answer, her words arrive on her voice,
   a line you covered pops sharp with a ting. */
import { create } from 'zustand';
import { stopVoice, voiceRate } from '../audio';
import { END_ALL, END_SOME, NOT_HEARD, VOICE_OF } from '../../content/check';
import { devMark } from '../dev/store';
import { useFlow } from '../engine/store';
import { takeFor } from '../engine/takes';
import type { ProjectId } from '../types';
import { brainAt, closing, current, sampleAnswer, step, type Brain } from './pouBrain';
import { sfx, timerGroup } from './prefs';
import { blankCard, nextId, push, say as sayInto, setLine, showAll, stopReplay, useRate, voiceOf, type CardState, type Msg, type Voice } from './talk';

export const usePou = create<CardState>(() => blankCard());

const S = () => usePou.getState();
const set = (p: Partial<CardState>) => usePou.setState(p);
const level = (v: number) => useFlow.getState().actions.setLevel(v);
const timers = timerGroup();

/* the beat between your note landing and hers starting, while she listens */
/* b28 (his note: "as soon as I send, it should go into that listening mode, and then ... recording. Super fast") */
const REPLY_MS = 500;

let R = 0;
let brain: Brain | null = null;
let project: ProjectId = 'spotify';

const wait = (ms: number) => new Promise<void>((r) => timers.after(ms, r));
/* each of her notes is recorded first, a quick beat (b11: "it records the voice note and sends it") */
const RECORD_MS = 500;
const say = (texts: string[], tok: number) => sayInto(usePou, texts, VOICE_OF[project], () => tok === R, wait, RECORD_MS);

function end() {
  const b = brain;
  set({ ended: true, speaking: false, won: !!b && b.state.every((s) => s === 'said') });
  level(0);
}

function prefetch(b: Brain) {
  const urls = new Set<string>();
  const add = (t: string) => {
    const k = takeFor(t, VOICE_OF[project]);
    if (k) urls.add(k.url);
  };
  b.lines.forEach((l) => {
    add(l.q);
    l.more.forEach(add);
  });
  [END_ALL, END_SOME, NOT_HEARD].forEach(add);
  urls.forEach((u) => {
    void fetch(u).catch(() => undefined);
  });
}

/* Begin, or land on a moment: the questions before `asking` already answered with the sample answers */
export function pouEnter(p: ProjectId, asking = 0, delay = 900) {
  pouStop();
  project = p;
  voiceRate(useRate.getState().r);
  const b = brainAt(p, asking);
  brain = b;
  const thread: Msg[] = [];
  for (let i = 0; i < Math.min(asking, b.lines.length); i++) {
    const q = takeFor(b.lines[i].q, VOICE_OF[p]);
    thread.push({ id: nextId(), from: 'her', text: b.lines[i].q, take: q ? { url: q.url, dur: q.dur } : undefined });
    thread.push({ id: nextId(), from: 'me', text: b.lines[i].sample, voice: voiceOf(b.lines[i].sample) });
  }
  S().thread.forEach((m) => {
    if (m.voice?.url) URL.revokeObjectURL(m.voice.url);
  });
  set({ ...blankCard(), lines: b.lines.map((l, i) => ({ text: l.text, state: b.state[i] })), thread });
  prefetch(b);
  const tok = R;
  timers.after(delay, () => {
    if (tok !== R) return;
    if (current(b) < 0) {
      devMark('pou:end');
      void say([closing(b)], tok).then(() => {
        if (tok === R) end();
      });
      return;
    }
    devMark(`pou:${asking + 1}`);
    void say([b.lines[current(b)].q], tok);
  });
}

export function pouStop(keepVoice = false) {
  ++R;
  timers.clear();
  stopReplay();
  if (!keepVoice) {
    stopVoice();
    level(0);
  }
  showAll(usePou);
  set({ speaking: false });
}

/* she stops the moment you start to talk */
export function pouHush() {
  if (!S().speaking) return;
  ++R;
  timers.clear();
  stopVoice();
  level(0);
  showAll(usePou);
  set({ speaking: false });
}

/* your voice note goes in and she answers it. Returns the note's id so its recording can follow */
export function pouAnswer(raw: string, voice?: Voice): number | null {
  const b = brain;
  if (!b || S().ended) return null;
  const tok = ++R;
  timers.clear();
  stopReplay();
  stopVoice();
  level(0);
  showAll(usePou);
  const text = raw.trim();
  const id = push(usePou, { from: 'me', text, voice: voice ?? voiceOf(text) });
  const turn = step(b, text);
  turn.heard.forEach((i, k) =>
    timers.after(k * 110, () => {
      setLine(usePou, i, 'said');
      sfx.ting();
    })
  );
  turn.told.forEach((i) => {
    setLine(usePou, i, 'told');
    sfx.land(i);
  });
  timers.after(REPLY_MS, () => {
    if (tok !== R) return;
    devMark(turn.done ? 'pou:end' : `pou:${current(b) + 1}`);
    void say(turn.say, tok).then(() => {
      if (tok === R && turn.done) end();
    });
  });
  return id;
}

/* your recording is saved: the note can play it */
export function pouVoiceReady(id: number, url: string) {
  const thread = S().thread;
  if (!thread.some((m) => m.id === id)) {
    URL.revokeObjectURL(url);
    return;
  }
  set({ thread: thread.map((m) => (m.id === id && m.voice ? { ...m, voice: { ...m.voice, url } } : m)) });
}

export const pouSample = (): string => (brain ? sampleAnswer(brain) : '');

/* how much she believes you understood: a line you said counts whole, one she had to fill in counts half */
export const meterOf = (lines: { state: string }[]): number =>
  lines.length ? lines.reduce((n, l) => n + (l.state === 'said' ? 1 : l.state === 'told' ? 0.5 : 0), 0) / lines.length : 0;

/* "Answer for me" */
/* her face in the last note she sent, read as you leave, so the plan's face grows out of it */
let faceAt: DOMRect | null = null;
export const pouFaceHand = (r: DOMRect | null) => {
  faceAt = r;
};
export const pouFaceTake = (): DOMRect | null => {
  const r = faceAt;
  faceAt = null;
  return r;
};

export function pouAnswerForMe() {
  const s = pouSample();
  if (s) pouAnswer(s);
}

export function pouLand(p: ProjectId, id: string) {
  if (id === 'pou:end') pouEnter(p, 3, 160);
  else pouEnter(p, Math.max(0, Number(id.split(':')[1] ?? 1) - 1), 160);
}
