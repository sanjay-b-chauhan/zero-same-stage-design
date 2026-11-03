/* "Here's the wrap": four rows, label and value, shown over the film while she closes the meeting. Every value is the
   project's own data: a point she made (run.ts), or the stages it runs on (the project's stages). */
import type { ProjectId, ProjectMeta } from '../types';
import type { Run } from './run';

type Source = { point: string } | { stages: true };

const ROWS: Record<ProjectId, [string, Source][]> = {
  spotify: [
    ['The problem', { point: 'where_next' }],
    ['Where you start', { point: 'ten_issues' }],
    ['What you bring back', { point: 'one_recommendation' }],
    ['How it goes', { stages: true }],
  ],
  amazon: [
    ['The problem', { point: 'hard_to_check' }],
    ['What you build', { point: 'fact_check_app' }],
    ['What it gives back', { point: 'three_results' }],
    ['How it goes', { stages: true }],
  ],
};

const low = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/* one sentence: the first stage as it is, the rest in lower case, "and" before the last */
const listOf = (names: string[]): string => {
  if (names.length < 2) return names.join('');
  const [first, ...rest] = names;
  return `${[first, ...rest.slice(0, -1).map(low)].join(', ')} and ${low(rest[rest.length - 1])}.`;
};

export function wrapRows(p: ProjectId, run: Run, meta: ProjectMeta | null): [string, string][] {
  return ROWS[p]
    .map(([label, src]): [string, string] => {
      if ('point' in src) return [label, run.points.find((x) => x.id === src.point)?.description ?? ''];
      return [label, listOf((meta?.stages ?? []).map((s) => s.title))];
    })
    .filter(([, v]) => !!v);
}

/* when each row arrives inside her last chapter, as b36 times them against its outro */
export const wrapTimes = (dur: number): number[] => [0.17, 0.26, 0.35, 0.44].map((f) => f * dur);
