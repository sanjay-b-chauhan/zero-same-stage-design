/* The kickoff POU brain, the same logic as the real harness (flow/kickoff/harness.ts): three questions, two tries each.
   A first miss gets a "more" line, a second miss makes her say it and move on. The question you are on hears everything
   you have said for it so far, the others hear only this answer, so one answer can cover two. Pure, no timers. */
import { CHECK, END_ALL, END_SOME, NOT_HEARD, toldThenEnd, toldThenNext, type CheckLine } from '../../content/check';
import type { ProjectId } from '../types';

export type LineState = 'open' | 'said' | 'told';

export interface Turn {
  say: string[]; /* her lines, in order */
  heard: number[]; /* the questions this answer covered */
  told: number[]; /* the question she had to fill in */
  done: boolean;
  blank: boolean;
}

export interface Brain {
  lines: CheckLine[];
  state: LineState[];
  tries: number;
  said: string;
}

export const newBrain = (p: ProjectId): Brain => ({ lines: CHECK[p], state: CHECK[p].map(() => 'open'), tries: 0, said: '' });

export const current = (b: Brain): number => b.state.indexOf('open');

export const firstQuestion = (b: Brain): string => b.lines[0].q;

export const sampleAnswer = (b: Brain): string => {
  const at = current(b);
  return at < 0 ? '' : b.lines[at].sample;
};

export function step(b: Brain, raw: string): Turn {
  const text = raw.trim();
  const at = current(b);
  if (at < 0) return { say: [END_ALL], heard: [], told: [], done: true, blank: false };
  if (!text) return { say: [NOT_HEARD], heard: [], told: [], done: false, blank: true };

  b.said = `${b.said} ${text}`;
  const heard: number[] = [];
  b.lines.forEach((line, i) => {
    if (b.state[i] !== 'open') return;
    const hay = i === at ? b.said : text;
    if (line.hear.every((r) => r.test(hay))) {
      b.state[i] = 'said';
      heard.push(i);
    }
  });

  if (heard.length) {
    if (b.state[at] !== 'open') {
      b.tries = 0;
      b.said = '';
    }
    const next = current(b);
    if (next >= 0) return { say: [b.lines[next].q], heard, told: [], done: false, blank: false };
    return { say: [b.state.includes('told') ? END_SOME : END_ALL], heard, told: [], done: true, blank: false };
  }

  b.tries += 1;
  if (b.tries < 2) return { say: [b.lines[at].more[b.tries - 1] ?? b.lines[at].more[0]], heard: [], told: [], done: false, blank: false };

  b.state[at] = 'told';
  b.tries = 0;
  b.said = '';
  const next = current(b);
  if (next >= 0) return { say: [toldThenNext(b.lines[at].say, b.lines[next].q)], heard: [], told: [at], done: false, blank: false };
  /* the harness ends on her filling the gap; her closing line follows so the meeting always ends on a close */
  return { say: [toldThenEnd(b.lines[at].say), END_SOME], heard: [], told: [at], done: true, blank: false };
}

/* a moment of the POU, landed on directly: the questions before it answered with the sample answers */
export function brainAt(p: ProjectId, asking: number): Brain {
  const b = newBrain(p);
  for (let i = 0; i < Math.min(asking, b.lines.length); i++) b.state[i] = 'said';
  return b;
}

export const closing = (b: Brain): string => (b.state.includes('told') ? END_SOME : END_ALL);
