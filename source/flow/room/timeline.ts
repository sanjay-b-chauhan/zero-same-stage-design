/* The kickoff as one timeline. Pure, so any seek is right by construction: the chapter, her caption line and the word
   she is on at any second are worked out from the run, never remembered. */
import type { Run, RunSegment } from './run';

export interface CapWord {
  w: string;
  at: number; /* seconds inside the chapter */
  end: number;
}

export interface Cap {
  start: number;
  end: number;
  words: CapWord[];
}

/* where each chapter starts on the whole timeline */
export const offsetsOf = (run: Run): number[] => {
  let at = 0;
  return run.segments.map((s) => {
    const o = at;
    at += s.audio_duration_sec;
    return o;
  });
};

export const totalOf = (run: Run): number => run.segments.reduce((n, s) => n + s.audio_duration_sec, 0);

/* a second on the whole timeline, as a chapter and a second inside it */
export const locate = (run: Run, offs: number[], T: number): { seg: number; t: number } => {
  for (let i = run.segments.length - 1; i >= 0; i--) {
    if (T >= offs[i] - 1e-6) return { seg: i, t: Math.min(T - offs[i], run.segments[i].audio_duration_sec) };
  }
  return { seg: 0, t: 0 };
};

const clean = (s: string) => s.replace(/\s*[–—]\s*/g, ', ');

/* every word of a line gets its share of the line's time, by length */
const wordsOf = (text: string, start: number, end: number): CapWord[] => {
  const ws = clean(text).split(/\s+/).filter(Boolean);
  const chars = ws.reduce((n, w) => n + w.length + 1, 0) || 1;
  const span = Math.max(0, end - start);
  let at = start;
  return ws.map((w) => {
    const d = (span * (w.length + 1)) / chars;
    const out = { w, at, end: at + d };
    at += d;
    return out;
  });
};

const STOPW =
  /^(a|an|the|of|to|and|or|but|so|is|are|was|that|for|in|on|at|by|with|we|you|it|its|our|your|their|they|i|i'm|i'll|if|as|be|this|these|those|from|before|until|when|where|each|every|any|no|not|can|can't|just|then|there's|what|how|which|who|whole|single|more|less|only|also)$/i;

const sentencesOf = (words: CapWord[]): CapWord[][] => {
  const out: CapWord[][] = [];
  let cur: CapWord[] = [];
  for (const w of words) {
    cur.push(w);
    if (/[.?!]["')]*$/.test(w.w)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
};

/* b36's caption lines, word for word: one short line at a time, a long sentence cut where it reads best, at a comma when there is one */
const linesOf = (words: CapWord[]): CapWord[][] => {
  const out: CapWord[][] = [];
  for (const s of sentencesOf(words)) {
    const len = (i: number, j: number) => s.slice(i, j).reduce((a, w) => a + w.w.length + 1, 0) - 1;
    const L = len(0, s.length);
    if (L <= 42) {
      out.push(s);
      continue;
    }
    const tg = L / Math.ceil(L / 40);
    const best: number[] = [0];
    const from: number[] = [0];
    for (let j = 1; j <= s.length; j++) {
      best[j] = 1e9;
      for (let i = 0; i < j; i++) {
        const l = len(i, j);
        if (l > 44 && j - i > 1) continue;
        const end = s[j - 1].w;
        let c = best[i] + (l - tg) * (l - tg);
        if (j < s.length) {
          const nx = s[j].w;
          if (STOPW.test(end.replace(/[,;:]$/, ''))) c += 900;
          if (/[,;:]$/.test(end)) c -= 160;
          if (/^\w{1,3}[,.;:]$/.test(nx)) c += 700;
          if (/^[A-Z]/.test(end) && /^[A-Z]/.test(nx) && !/[,.;:]$/.test(end)) c += 700;
          if (j - i > 1 && /^(a|an|the)$/i.test(s[j - 2].w)) c += 300;
        }
        if (c < best[j]) {
          best[j] = c;
          from[j] = i;
        }
      }
    }
    const cuts: [number, number][] = [];
    for (let j = s.length; j > 0; j = from[j]) cuts.unshift([from[j], j]);
    cuts.forEach(([i, j]) => out.push(s.slice(i, j)));
  }
  return out;
};

/* a chapter's captions: her words with their times, cut into short lines */
export const capsOf = (seg: RunSegment): Cap[] =>
  seg.lines
    .flatMap((l) => linesOf(wordsOf(l.text, l.start_sec, l.end_sec)))
    .map((words) => ({ start: words[0].at, end: words[words.length - 1].end, words }));

/* captions for a line with no word times (the plan's): her words spread evenly over dur seconds, cut the same way */
export const capsOfText = (text: string, dur: number): Cap[] =>
  linesOf(wordsOf(text, 0, dur)).map((words) => ({ start: words[0].at, end: words[words.length - 1].end, words }));

/* the line on screen at t, or -1 before her first word */
export const capIndexAt = (caps: Cap[], t: number): number => {
  if (!caps.length || t < caps[0].start - 0.2) return -1;
  const k = caps.findIndex((c) => t < c.end + 0.25);
  return k < 0 ? caps.length - 1 : k;
};

/* how many words of a line she has said by t */
export const litAt = (cap: Cap, t: number): number => cap.words.filter((w) => t >= w.at - 0.02).length;

export const capText = (cap: Cap): string => cap.words.map((w) => w.w).join(' ');

export const mss = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
