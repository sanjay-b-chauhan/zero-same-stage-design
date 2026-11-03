/* The real hold to talk records; while you hold, the browser's own SpeechRecognition listens and this returns what it heard.
   No SpeechRecognition, or permission denied: return the current question's sample answer, so the flow still finishes in Safari.
   It's there and it heard nothing: return nothing, and she says "I didn't catch that."
   Tests: window.__harness.sttText, when it is a string, wins over everything ('' means she heard nothing). */
import { useMemo, useRef } from 'react';

interface H {
  sttText?: string | null;
  sttMs?: number;
  micDenied?: boolean;
}
const h = (): H => (window as unknown as { __harness?: H }).__harness ?? {};
const sample = (): string =>
  (window as unknown as { __pou?: { sample?: () => string } }).__pou?.sample?.() ?? '';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Result {
  isFinal: boolean;
  0: { transcript: string };
}
interface Recognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<Result> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognizerCtor = new () => Recognizer;

const recognizerCtor = (): RecognizerCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

/* errors that mean this browser can't hear you at all, as opposed to you said nothing */
const CANT_HEAR = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'network', 'language-not-supported']);

interface Session {
  stop: () => Promise<{ text: string; failed: boolean }>;
  cancel: () => void;
}

function listen(Ctor: RecognizerCtor, onPartial: (text: string) => void): Session {
  let finals = '';
  let interim = '';
  let failed = false;
  let holding = true;
  let rec: Recognizer | null = null;
  let ended: (() => void) | null = null;

  const begin = () => {
    try {
      const r = new Ctor();
      r.lang = 'en-US';
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finals += `${res[0].transcript} `;
          else interim += res[0].transcript;
        }
        onPartial(`${finals}${interim}`.trim());
      };
      r.onerror = (e) => {
        if (CANT_HEAR.has(e.error)) failed = true;
      };
      /* it stops itself on a pause, so it restarts for as long as you hold */
      r.onend = () => {
        if (holding && !failed) begin();
        else ended?.();
      };
      rec = r;
      r.start();
    } catch {
      failed = true;
      ended?.();
    }
  };
  begin();

  return {
    stop: () =>
      new Promise((resolve) => {
        holding = false;
        const done = () => resolve({ text: `${finals}${interim}`.trim(), failed });
        if (!rec || failed) {
          done();
          return;
        }
        ended = done;
        try {
          rec.stop();
        } catch {
          done();
        }
        setTimeout(done, 1500);
      }),
    cancel: () => {
      holding = false;
      try {
        rec?.abort();
      } catch {
        /* already gone */
      }
    },
  };
}

export function useKickoffStt(options: { onTranscript?: (t: { text: string }) => void } = {}) {
  const lastSource = useRef<'native' | 'deepgram' | 'post-api' | 'none'>('none');
  const lastReason = useRef<'ok' | 'empty' | 'error'>('empty');
  const onTranscriptRef = useRef(options.onTranscript);
  onTranscriptRef.current = options.onTranscript;
  const session = useRef<Session | null>(null);

  return useMemo(
    () => ({
      onRecordingStart: async () => {
        lastSource.current = 'none';
        session.current?.cancel();
        session.current = null;
        const Ctor = recognizerCtor();
        const skip = typeof h().sttText === 'string' || new URLSearchParams(location.search).get('mic') === 'fake';
        if (Ctor && !skip) session.current = listen(Ctor, (text) => onTranscriptRef.current?.({ text }));
      },
      onRecordingCancel: () => {
        lastSource.current = 'none';
        session.current?.cancel();
        session.current = null;
      },
      finalizeTranscript: async (): Promise<string | undefined> => {
        const running = session.current;
        session.current = null;
        const stopped = running ? await running.stop() : null;

        let text: string;
        const forced = h().sttText;
        if (typeof forced === 'string') {
          await wait(h().sttMs ?? 900);
          text = forced.trim();
        } else if (!stopped || stopped.failed || h().micDenied) {
          await wait(h().sttMs ?? 900);
          text = sample();
        } else {
          text = stopped.text;
        }

        lastSource.current = text ? 'native' : 'none';
        lastReason.current = text ? 'ok' : 'empty';
        if (text) onTranscriptRef.current?.({ text });
        return text || undefined;
      },
      lastSource,
      lastReason,
    }),
    []
  );
}
