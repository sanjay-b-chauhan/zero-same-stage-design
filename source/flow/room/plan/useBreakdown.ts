/* She breaks the project down, one sentence at a time. Each stage lands the moment her take for it starts.
   A line with no take runs on a word count timer, and a take that will not start or will not end can never hold the plan back. */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { BREAKDOWN } from '../../../content/lines';
import { playTake, softLand, stopVoice } from '../../audio';
import { clock } from '../../clock';
import { takeFor } from '../../engine/takes';
import { useFlow } from '../../engine/store';
import type { ProjectMeta } from '../../types';
import { setCaption } from '../caption';

const ARRIVE_MS = 620;
const LINE_GAP_MS = 140;
const PLAY_GRACE_MS = 1200;
const TAKE_SLACK_MS = 2500;
const CLEAR_MS = 240;

export type PlanOn = number | 'all' | null;

export interface BreakdownState {
  said: number; /* how many of her lines have started */
  landed: number; /* how many stage rows she has named */
  on: PlanOn; /* the row she is on, or all of them when she sums it up */
  asking: boolean; /* her words are done */
  clearing: boolean; /* Again: the rows are leaving */
}

const FRESH: BreakdownState = { said: 0, landed: 0, on: null, asking: false, clearing: false };

const wordsMs = (text: string) => Math.max(900, text.trim().split(/\s+/).length * 340);

const sentencesOf = (text: string): string[] => text.match(/[^.?!]+[.?!]+/g)?.map((s) => s.trim()) ?? [text];

/* where each sentence ends, as a share of the line */
const endsOf = (parts: string[]): number[] => {
  const total = parts.reduce((n, p) => n + p.length, 0);
  let run = 0;
  return parts.map((p) => {
    run += p.length;
    return run / total;
  });
};

/* b22 (his note: "we don't need this got it kind of version ... it should be direct"): her last line ends before "You got
   it?". The take stops in the pause before it (measured: Eryn 4.08 to 4.55 s, Aaron 3.20 to 3.66 s), a cut, no new audio */
const QUESTION = /\s*You got it\?$/;
const CUT_AT: Record<string, number> = { eryn: 4.3, aaron: 3.4 };

const voiceOf = (project: ProjectMeta) => (project.id === 'amazon' ? 'aaron' : 'eryn');

export function useBreakdown(project: ProjectMeta, active: boolean) {
  const [state, setState] = useState<BreakdownState>(FRESH);
  const runRef = useRef(0);
  /* b23 (his note: "with the arrow keys it should just go next, next, next ... and on my clicks"): her line ends now */
  const skipRef = useRef(false);

  const speak = useCallback(
    (text: string, alive: () => boolean, onStart: () => void) =>
      new Promise<void>((resolve) => {
        const take = takeFor(text, voiceOf(project));
        const asks = QUESTION.test(text);
        const cutAt = asks ? CUT_AT[voiceOf(project)] : undefined;
        const kept = text.replace(QUESTION, '');
        const parts = sentencesOf(kept);
        const ends = endsOf(parts);
        let started = false;
        let shown = -1;
        const captionAt = (share: number) => {
          const found = ends.findIndex((e) => share < e);
          const i = found < 0 ? parts.length - 1 : found;
          if (i === shown) return;
          shown = i;
          setCaption(parts[i]);
        };
        const start = () => {
          if (started || !alive()) return;
          started = true;
          onStart();
          captionAt(0);
        };
        const silent = () => {
          start();
          const ms = wordsMs(kept);
          const t0 = performance.now();
          const step = () => {
            if (!alive()) return resolve();
            if (skipRef.current) {
              skipRef.current = false;
              return resolve();
            }
            const share = (performance.now() - t0) / ms;
            captionAt(share);
            if (share >= 1) return resolve();
            clock.setTimeout(step, 80);
          };
          step();
        };
        if (!take) return silent();
        const grace = clock.setTimeout(start, PLAY_GRACE_MS);
        const budget = clock.setTimeout(stopVoice, take.dur * 1000 + TAKE_SLACK_MS);
        void playTake(take.url, {
          onLevel: (v) => useFlow.getState().actions.setLevel(v),
          onTime: (t) => {
            start();
            if (cutAt !== undefined && t >= cutAt) return stopVoice();
            if (alive() && take.dur) captionAt(t / (cutAt ?? take.dur));
          },
        }).then(() => {
          clock.clearTimeout(grace);
          clock.clearTimeout(budget);
          if (!alive()) return resolve();
          if (skipRef.current) {
            skipRef.current = false;
            start();
            return resolve();
          }
          if (!started) return silent();
          resolve();
        });
      }),
    [project]
  );

  const play = useCallback(async () => {
    const run = ++runRef.current;
    const alive = () => run === runRef.current;
    setState(FRESH);
    await clock.wait(ARRIVE_MS);
    const lines = BREAKDOWN[project.id];
    const lastStop = lines.reduce((n, l, i) => (l.stop !== undefined ? i : n), -1);
    for (let i = 0; i < lines.length; i++) {
      if (!alive()) return;
      const line = lines[i];
      await speak(line.text, alive, () => {
        setState((s) => ({ ...s, said: i + 1 }));
        if (line.stop !== undefined) {
          const stop = line.stop;
          setState((s) => ({ ...s, landed: stop + 1, on: stop }));
          softLand(stop);
        } else if (i > lastStop) {
          setState((s) => ({ ...s, on: 'all' }));
        }
      });
      if (!alive()) return;
      await clock.wait(LINE_GAP_MS);
    }
    if (!alive()) return;
    setState((s) => ({ ...s, asking: true }));
  }, [project, speak]);

  const halt = useCallback(() => {
    runRef.current++;
    stopVoice();
    useFlow.getState().actions.setLevel(0);
    setCaption(null);
  }, []);

  /* before paint, so coming back to the breakdown never shows a frame of the old rows */
  useLayoutEffect(() => {
    if (!active) return;
    void play();
    return halt;
  }, [active, play, halt]);

  const again = useCallback(() => {
    halt();
    const run = runRef.current;
    setState((s) => ({ ...s, asking: false, on: null, clearing: true }));
    clock.setTimeout(() => {
      if (run === runRef.current) void play();
    }, CLEAR_MS);
  }, [halt, play]);

  /* developer mode: land on the start of her words from any state */
  const restart = useCallback(() => {
    halt();
    void play();
  }, [halt, play]);

  /* developer mode: everything she was going to name is named */
  const finish = useCallback(() => {
    halt();
    const lines = BREAKDOWN[project.id];
    const last = lines[lines.length - 1]?.text ?? '';
    setState({ said: lines.length, landed: project.stages.length, on: 'all', asking: true, clearing: false });
    setCaption(sentencesOf(last).pop() ?? null);
  }, [halt, project]);

  const skip = useCallback(() => {
    skipRef.current = true;
    stopVoice();
  }, []);

  return { state, again, halt, restart, finish, skip };
}
