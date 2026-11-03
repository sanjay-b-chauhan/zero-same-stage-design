/* Hold to talk in the check-in. The stage's recognition (flow/stage/parts/useHold.ts) rebuilt for the Room, which has no stage:
   the same floor of 1 s, the same 120 s cap, Chrome's recognition in en-US. One wait is cut: if words are already in when you let go,
   she gets them at once instead of after the recognizer winds down. */
import { create } from 'zustand';
import { clock } from '../clock';
import { useFlow } from '../engine/store';
import { hasSpeech } from '../stage/parts/useHold';
import { pouAnswer, pouHush, pouVoiceReady, usePou } from './pou';
import { barsOf, type Voice } from './talk';

const MIN_HOLD_MS = 1000;
const MAX_HOLD_MS = 120000;
const FINAL_WAIT_MS = 1400;

interface RecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => RecognitionLike;

const ctor = (): RecognitionCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const canHear = hasSpeech;

/* the check-in after the meeting takes what you said, as a voice note: its length, its bars, its recording once it is ready */
export const answer = (text: string, voice?: Voice) => pouAnswer(text, voice);
const hush = () => pouHush();
const closed = () => usePou.getState().ended;

interface HoldUi {
  holding: boolean;
  at: number;
  heard: string; /* her words so far, interim included */
  sending: boolean;
  draft: number[]; /* the bars of the note on its way out, for the sending row */
}

export const useHoldUi = create<HoldUi>(() => ({ holding: false, at: 0, heard: '', sending: false, draft: [] }));

/* b20 (his note: "when I record and send there is no loader state"): every note you send shows as sending for a beat
   before it lands, even when the words are already in */
const SEND_MS = 140;

interface Take {
  at: number;
  rec: RecognitionLike | null;
  finals: string[];
  interim: string;
  stream: MediaStream | null;
  ctx: AudioContext | null;
  meter: number;
  cap: number;
  dead: boolean;
  levels: number[];
  rec2: MediaRecorder | null;
  chunks: Blob[];
  saved: Promise<void> | null; /* the recording's last chunk is in */
}

let take: Take | null = null;
const actions = () => useFlow.getState().actions;
const heardOf = (t: Take) => [...t.finals, t.interim].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

const teardown = (t: Take) => {
  t.dead = true;
  try {
    if (t.rec2 && t.rec2.state !== 'inactive') t.rec2.stop();
  } catch {
    /* already stopped */
  }
  clock.clearInterval(t.meter);
  clock.clearTimeout(t.cap);
  try {
    t.stream?.getTracks().forEach((x) => x.stop());
  } catch {
    /* already gone */
  }
  try {
    void t.ctx?.close();
  } catch {
    /* already closed */
  }
  actions().setMicLevel(0);
};

const openMic = async (t: Take) => {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return; /* no mic: the slab stays flat, typing still works */
  }
  if (t.dead) {
    stream.getTracks().forEach((x) => x.stop());
    return;
  }
  t.stream = stream;
  if (typeof MediaRecorder !== 'undefined') {
    try {
      const r = new MediaRecorder(stream);
      r.ondataavailable = (e) => {
        if (e.data.size) t.chunks.push(e.data);
      };
      t.saved = new Promise((res) => r.addEventListener('stop', () => res(), { once: true }));
      r.start();
      t.rec2 = r;
    } catch {
      t.rec2 = null; /* no recording: the note still shows, it just does not play back */
    }
  }
  try {
    const ctx = new window.AudioContext();
    t.ctx = ctx;
    void ctx.resume();
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    an.smoothingTimeConstant = 0.5;
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.fftSize);
    t.meter = clock.setInterval(() => {
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const x = (buf[i] - 128) / 128;
        sum += x * x;
      }
      const v = Math.min(1, Math.sqrt(sum / buf.length) * 4);
      t.levels.push(v);
      actions().setMicLevel(v);
    }, 50);
  } catch {
    /* no meter, the hold still works */
  }
};

const startRecognition = (t: Take) => {
  const C = ctor();
  if (!C) return;
  try {
    const rec = new C();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const said = r[0]?.transcript ?? '';
        if (r.isFinal) t.finals.push(said.trim());
        else interim += said;
      }
      t.interim = interim.trim();
      if (take === t) useHoldUi.setState({ heard: heardOf(t) });
    };
    rec.onerror = () => {};
    rec.start();
    t.rec = rec;
  } catch {
    t.rec = null;
  }
};

export function holdStart(): void {
  if (take || closed() || useHoldUi.getState().sending) return;
  const t: Take = { at: performance.now(), rec: null, finals: [], interim: '', stream: null, ctx: null, meter: 0, cap: 0, dead: false, levels: [], rec2: null, chunks: [], saved: null };
  take = t;
  hush();
  actions().setListening(true);
  useHoldUi.setState({ holding: true, at: Date.now(), heard: '' });
  startRecognition(t);
  void openMic(t);
  t.cap = clock.setTimeout(holdEnd, MAX_HOLD_MS);
}

export function holdCancel(): void {
  const t = take;
  if (!t) return;
  take = null;
  try {
    t.rec?.abort();
  } catch {
    /* never started */
  }
  teardown(t);
  actions().setListening(false);
  useHoldUi.setState({ holding: false, heard: '' });
}

const stopRec = (t: Take): Promise<void> =>
  new Promise((resolve) => {
    if (!t.rec) return resolve();
    const done = clock.setTimeout(resolve, FINAL_WAIT_MS);
    t.rec.onend = () => {
      clock.clearTimeout(done);
      resolve();
    };
    try {
      t.rec.stop();
    } catch {
      clock.clearTimeout(done);
      resolve();
    }
  });

export function holdEnd(): void {
  const t = take;
  if (!t) return;
  if (performance.now() - t.at < MIN_HOLD_MS) {
    holdCancel();
    return;
  }
  take = null;
  actions().setListening(false);
  const voice: Voice = { dur: (performance.now() - t.at) / 1000, bars: barsOf(t.levels), url: null };
  const r2 = t.rec2;
  const ship = (text: string) => {
    const id = answer(text, voice);
    if (!r2 || id === null) return;
    const done = () => {
      if (!t.chunks.length) return;
      try {
        pouVoiceReady(id, URL.createObjectURL(new Blob(t.chunks, { type: r2.mimeType || 'audio/webm' })));
      } catch {
        /* no playback for this note */
      }
    };
    void t.saved?.then(done);
  };
  useHoldUi.setState({ holding: false, sending: true, draft: voice.bars });
  const sent = (text: string) => {
    useHoldUi.setState({ sending: false, heard: '', draft: [] });
    ship(text);
  };
  const now = heardOf(t);
  if (now) {
    /* the words are in, she answers now. The recognizer winds down on its own */
    try {
      t.rec?.abort();
    } catch {
      /* already stopped */
    }
    teardown(t);
    clock.setTimeout(() => sent(now), SEND_MS);
    return;
  }
  const beat = new Promise<void>((r) => clock.setTimeout(r, SEND_MS));
  void Promise.all([stopRec(t), beat]).then(() => {
    teardown(t);
    sent(heardOf(t));
  });
}

/* the slab, held with the pointer */
export function holdPointer(e: { button: number; preventDefault(): void; currentTarget: Element }) {
  if (e.button !== 0) return;
  e.preventDefault();
  holdStart();
  const doc = e.currentTarget.ownerDocument;
  const up = () => {
    doc.removeEventListener('pointerup', up);
    doc.removeEventListener('pointercancel', cancel);
    holdEnd();
  };
  const cancel = () => {
    doc.removeEventListener('pointerup', up);
    doc.removeEventListener('pointercancel', cancel);
    holdCancel();
  };
  doc.addEventListener('pointerup', up);
  doc.addEventListener('pointercancel', cancel);
}

export const isHolding = () => take !== null;
