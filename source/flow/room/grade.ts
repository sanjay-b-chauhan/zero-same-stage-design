/* The note check, as the real grader does it but in the browser: each note against the context points of its chapter,
   keyword groups from content/check.ts NOTE_KEYS, every group has to match. Pure. */
import { NOTE_KEYS } from '../../content/check';
import type { ProjectId } from '../types';
import type { Run, RunPoint, RunSegment } from './run';

export type Verdict = 'hit' | 'dup' | 'off';

export interface Graded {
  verdicts: { id: string; verdict: Verdict; point?: string }[];
  missed: RunPoint[];
}

/* the points one chapter teaches, in the order she says them */
export const pointsOf = (run: Run, seg: RunSegment): RunPoint[] => {
  const ids: string[] = [];
  seg.lines.forEach((l) => {
    if (l.context_point_id && !ids.includes(l.context_point_id)) ids.push(l.context_point_id);
  });
  return ids.map((id) => run.points.find((p) => p.id === id)).filter((p): p is RunPoint => !!p);
};

export const takesNotes = (seg: RunSegment): boolean => seg.lines.some((l) => !!l.context_point_id);

const hits = (text: string, id: string): boolean => {
  const keys = NOTE_KEYS[id];
  return !!keys && keys.every((r) => r.test(text));
};

export function gradeNotes(points: RunPoint[], notes: { id: string; text: string }[]): Graded {
  const covered = new Set<string>();
  const verdicts = notes.map((n) => {
    const text = n.text.trim();
    const open = points.filter((p) => !covered.has(p.id) && hits(text, p.id));
    if (open.length) {
      open.forEach((p) => covered.add(p.id));
      return { id: n.id, verdict: 'hit' as const, point: open[0].id };
    }
    const again = points.find((p) => hits(text, p.id));
    return again ? { id: n.id, verdict: 'dup' as const, point: again.id } : { id: n.id, verdict: 'off' as const };
  });
  return { verdicts, missed: points.filter((p) => !covered.has(p.id)) };
}

/* what a person in a hurry writes. One point left out on purpose in the last chapter, so she has something to add */
export const SAMPLE_NOTES: Record<ProjectId, Record<string, string[]>> = {
  spotify: {
    room: ['$1 more a month, would people cancel', '95 stay = more money, 92 = less', 'Only worth it if under 8 in 100 leave'],
    problem: ['Premium went up in 6 markets last year', 'Some held, a couple lost people', 'Where do we raise next, and how much', 'Data is a mess, 10 things wrong'],
    outcome: ['One clear recommendation', 'Back it with numbers, market by market'],
    process: ['Stage 1: clean the export into a csv', 'Then build the revenue model', 'Make the call', 'Present it'],
  },
  amazon: {
    problem: ['Announcements are hard to check'],
    outcome: ['Build an app that fact checks the claims', 'Verified or unsupported, with sources'],
    process: ['Set up the project and repo first', 'Connect the model', 'Trace it and test it'],
  },
};

/* The pause card's Ask: she answers from what she just told you in this chapter. The harness logic, word for word. */
const NOT_A_TOPIC =
  /^(what|when|where|which|who|why|how|does|did|the|and|are|you|your|mean|that|this|with|for|can|could|would|tell|about|more|please|just|have|has|was|were|will|not|our|they|them|there|here|like|get|got|meant|said|say)$/;

export const ASK_OPEN = "Yeah, go ahead. What's your question?";

export function answerAsk(run: Run, seg: RunSegment, asked: string): string {
  const points = pointsOf(run, seg);
  const words = (asked.toLowerCase().match(/[a-z0-9']{3,}/g) ?? []).filter((w) => !NOT_A_TOPIC.test(w));
  const count = (text: string) => words.filter((w) => text.toLowerCase().includes(w)).length;
  const best = [...points, ...run.points]
    .map((p) => ({ p, n: count(`${p.term} ${p.description}`) }))
    .reduce((a, b) => (b.n > a.n ? b : a), { p: points[0], n: 0 });
  if (best.n > 0 && best.p) return best.p.description;
  return points[0]
    ? `We'll get to that once we're in the project. What matters right now is this. ${points[0].description}`
    : "We'll get to that once we're in the project. Keep going and you'll see it.";
}
