/* Talk with your screen, faked until it is real (his note, 2 Nov: "no real functiaonlity please lets fake it untill we make it").
   Control+Option+Command+Space anywhere, Space held on the stage, or the mic. A tap starts and sends itself once you have
   finished; a hold sends when you let go; a second press sends now; Esc cancels.
   Nothing asks the browser for anything: no microphone, no speech recognition, no screen picker. What she hears is the question
   that fits where you are (or what you had typed in the box), said on a speech-shaped signal, so the bars and her circle move
   like a voice and the words land as you would say them. Each hold asks a different kind of question, so a run of holds shows
   every way she helps: she points on your screen, she answers out loud, she hands you a film or a file.
   On send she takes one frame of the page as drawn, and actions.talk answers it as talk (engine/cowork.ts).
   The screen never moves for this: no surface switch, no body opening. */
import { create } from 'zustand';
import { clock } from '../clock';
import { useFlow } from '../engine/store';
import { useDraft } from '../stage/parts/draft';
import type { TalkScene } from '../types';
import { desk, useDesk } from './desktop/deskStore';
import { fakeVoice, roomTone, TRAIL_MS, type Voice } from './fakeVoice';
import { fileFrame, grabScreen, setTestScreen } from './frame';
import { attachFrame, type Frame } from './seen';

export type TalkPhase = 'idle' | 'listening' | 'looking' | 'answering';

interface TalkState {
  phase: TalkPhase;
  via: 'screen' | 'pou' | null;
  at: number;
  words: string[]; /* what you are saying */
  heard: number; /* how many of them she has heard so far */
  frame: Frame | null; /* the one frame she took, for the status line */
}

export const useTalk = create<TalkState>(() => ({ phase: 'idle', via: null, at: 0, words: [], heard: 0, frame: null }));

const HOLD_MS = 350; /* a press held past this is a hold, and letting go sends */
const MAX_MS = 120000; /* the real cap, recordingCountdown.ts */
const LOOK_MS = 520; /* "Viewed screen" stays long enough to be read */
const ANSWER_CAP_MS = 45000;

interface Take {
  text: string;
  typed: boolean;
  voice: Voice;
  room: (() => void) | null;
  tap: boolean;
  auto: number;
  cap: number;
}

let take: Take | null = null;
let turn = 0;
let holds = 0; /* scripted holds on this stage: the next one asks the next kind of question */
let rotKey = '';
let nextLine: string | null = null; /* test rail: the words the next hold hears */
let downAt = 0;
let downStarted = false;
let pipWin: Window | null = null;

const flow = () => useFlow.getState();
const idle = () => useTalk.setState({ phase: 'idle', via: null, at: 0, words: [], heard: 0, frame: null });
export const talking = (): boolean => useTalk.getState().phase === 'listening';

/* What is on the fake desktop right now, so she only points at what is there */
const scene = (): TalkScene => {
  const { ui, stage } = flow();
  const on = desk.on && ui.surface === 'pip';
  const d = useDesk.getState();
  const raw = stage?.files.find((f) => f.kind === 'csv' && !f.mine);
  const rawShown = !!raw && (!d.sheetFile || d.sheetFile === raw.id);
  return {
    desk: on,
    sheet: on && d.wins.sheets.open && !d.wins.sheets.min && rawShown,
    claude: on && d.wins.claude.open && !d.wins.claude.min,
  };
};

const stopTake = (t: Take) => {
  clock.clearTimeout(t.auto);
  clock.clearTimeout(t.cap);
  t.voice.stop();
  t.room?.();
  t.room = null;
  flow().actions.setMicLevel(0);
};

/* a tap: she waits for the quiet after your last word, then it sends itself */
const armTap = (t: Take, done: boolean) => {
  if (!t.tap || !done || take !== t) return;
  clock.clearTimeout(t.auto);
  t.auto = clock.setTimeout(() => void talkSend(), TRAIL_MS);
};

export function talkStart(): boolean {
  const s = useTalk.getState();
  if (s.phase === 'listening' || s.phase === 'looking') return false;
  const { stage, screen, actions } = flow();
  if (!stage || screen !== 'stage') return false;
  const pou = stage.phase === 'pou';
  const key = `${stage.projectId}:${stage.stageId}`;
  if (key !== rotKey) {
    rotKey = key;
    holds = 0;
  }
  const typed = pou ? '' : useDraft.getState().text.trim();
  const line = nextLine ?? (typed || actions.talkLine(holds, scene()));
  nextLine = null;
  const words = line.split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  turn += 1;
  useDraft.getState().set({ holdAt: Date.now(), repeat: false });
  actions.unpoint();
  actions.setListening(true);
  useTalk.setState({ phase: 'listening', via: pou ? 'pou' : 'screen', at: Date.now(), words, heard: 0, frame: null });
  const t: Take = {
    text: line,
    typed: !!typed,
    voice: fakeVoice(words, {
      onLevel: (v) => flow().actions.setMicLevel(v),
      onHeard: (n) => useTalk.setState({ heard: n }),
    }),
    room: null,
    tap: false,
    auto: 0,
    cap: 0,
  };
  take = t;
  t.cap = clock.setTimeout(() => void talkSend(), MAX_MS);
  /* after your last word the room stays live while you keep holding */
  void t.voice.done.then(() => {
    if (take !== t) return;
    t.room = roomTone((v) => flow().actions.setMicLevel(v));
    armTap(t, true);
  });
  return true;
}

export function talkCancel(): void {
  const s = useTalk.getState();
  downStarted = false;
  if (s.phase !== 'listening') return;
  const t = take;
  take = null;
  turn += 1;
  if (t) stopTake(t);
  if (flow().ui.listening) flow().actions.setListening(false);
  idle();
}

export async function talkSend(): Promise<void> {
  const t = take;
  if (!t || useTalk.getState().phase !== 'listening') return;
  take = null;
  downStarted = false;
  const mine = turn;
  clock.clearTimeout(t.auto);
  clock.clearTimeout(t.cap);
  /* let go before your last word: the rest of what you said still lands, quickly */
  t.voice.rush();
  await t.voice.done;
  stopTake(t);
  if (turn !== mine) return;
  const { actions } = flow();
  actions.setListening(false);
  if (t.typed) useDraft.getState().set({ text: '' });
  if (useTalk.getState().via === 'pou') {
    idle();
    actions.talk(t.text, scene());
    return;
  }
  if (!t.typed) holds += 1;
  useTalk.setState({ phase: 'looking' });
  /* one frame, as you let go. Then nothing more of your screen */
  const frame = (await grabScreen()) ?? fileFrame();
  if (turn !== mine) return;
  useTalk.setState({ frame });
  await clock.wait(LOOK_MS);
  if (turn !== mine) return;
  const r = flow().actions.talk(t.text, scene());
  if (r.id && frame) attachFrame(r.id, frame);
  useTalk.setState({ phase: 'answering' });
  await Promise.race([r.done, clock.wait(ANSWER_CAP_MS)]);
  if (turn === mine && useTalk.getState().phase === 'answering') idle();
}

/* the bar's mic, the keys and Space share one rule: press starts or sends, a held press sends when you let go */
export function talkPress(_from?: Window): void {
  const phase = useTalk.getState().phase;
  if (phase === 'listening') {
    void talkSend();
    return;
  }
  if (phase === 'looking') return;
  downAt = Date.now();
  downStarted = talkStart();
}

export function talkRelease(_from?: Window): void {
  if (!downStarted) return;
  downStarted = false;
  const t = take;
  if (!t || useTalk.getState().phase !== 'listening') return;
  if (Date.now() - downAt >= HOLD_MS) {
    void talkSend();
    return;
  }
  t.tap = true;
  armTap(t, useTalk.getState().heard >= useTalk.getState().words.length);
}

const isCombo = (e: KeyboardEvent) => e.code === 'Space' && e.ctrlKey && e.altKey && e.metaKey;
const MODS = new Set(['Meta', 'Control', 'Alt', 'OS']);

/* Capture on the window, so the Space hold underneath never sees this combination. */
export function bindTalkKeys(win: Window): () => void {
  const down = (e: KeyboardEvent) => {
    const phase = useTalk.getState().phase;
    if (isCombo(e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      talkPress();
      return;
    }
    if (phase !== 'listening') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      talkCancel();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopImmediatePropagation();
      void talkSend();
    }
  };
  const up = (e: KeyboardEvent) => {
    if (!downStarted) return;
    /* a Mac drops the Space key up while Command is down, so letting go of any of the four counts */
    if (e.code !== 'Space' && !MODS.has(e.key)) return;
    if (e.code === 'Space') {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    talkRelease();
  };
  const blur = () => {
    if (downStarted && talking()) talkRelease();
  };
  win.addEventListener('keydown', down, true);
  win.addEventListener('keyup', up, true);
  win.addEventListener('blur', blur);
  return () => {
    win.removeEventListener('keydown', down, true);
    win.removeEventListener('keyup', up, true);
    win.removeEventListener('blur', blur);
  };
}

/* the PiP window, when it is a real one */
export const talkWindow = (w: Window | null): void => {
  pipWin = w;
};

/* The Zero window listens from the start, on the stage and in the big screen too. */
const bound = window as unknown as { __zpTalk?: () => void; __pip?: unknown };
bound.__zpTalk?.();
bound.__zpTalk = bindTalkKeys(window);

/* test rails, nothing on screen */
bound.__pip = {
  press: () => talkPress(),
  release: () => talkRelease(),
  send: () => talkSend(),
  cancel: talkCancel,
  /* the next frame comes from this image */
  screen: setTestScreen,
  /* the words the next hold hears, instead of the scripted question */
  hear: (text: string) => {
    nextLine = text;
  },
  phase: () => useTalk.getState().phase,
  heard: () => useTalk.getState().words.slice(0, useTalk.getState().heard).join(' '),
  holds: () => holds,
  real: () => !!pipWin && !pipWin.closed,
};
