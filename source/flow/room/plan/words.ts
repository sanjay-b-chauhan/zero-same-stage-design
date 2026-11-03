/* The plan's two lines, b36's: the one line problem from the kickoff's own context points, then
   "Five stages take you to the fix. About an hour and a half." from the real stage count and minutes. */
import type { ProjectId, ProjectMeta } from '../../types';
import { runOf } from '../run';

/* the context point that says the problem in one line, per project */
const PROBLEM_POINT: Record<ProjectId, string> = { spotify: 'where_next', amazon: 'hard_to_check' };

const COUNT = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

export const countWord = (n: number): string => COUNT[n] ?? String(n);

/* to the nearest half hour once it is an hour or more, else to the nearest five minutes */
export const aboutTime = (min: number): string => {
  if (min < 50) return `${Math.max(5, Math.round(min / 5) * 5)} minutes`;
  const halves = Math.round(min / 30);
  const whole = Math.floor(halves / 2);
  const half = halves % 2 === 1;
  if (whole === 1) return half ? 'an hour and a half' : 'an hour';
  return half ? `${whole} and a half hours` : `${whole} hours`;
};

export const problemLine = (project: ProjectMeta): string => {
  const id = PROBLEM_POINT[project.id];
  return runOf(project.id).points.find((p) => p.id === id)?.description ?? project.title;
};

export const pathLine = (project: ProjectMeta): string => {
  const n = project.stages.length;
  const min = project.stages.reduce((t, s) => t + s.minutes, 0);
  return `${countWord(n)} ${n === 1 ? 'stage takes' : 'stages take'} you to the fix. About ${aboutTime(min)}.`;
};

/* the objective's line: where the stages lead, from the project's own end. "Five stages to one clear recommendation." */
export const goalLine = (project: ProjectMeta): string => {
  const n = project.stages.length;
  const min = project.stages.reduce((t, s) => t + s.minutes, 0);
  const end = project.end.charAt(0).toLowerCase() + project.end.slice(1);
  return `${countWord(n)} ${n === 1 ? 'stage' : 'stages'} to ${end}. About ${aboutTime(min)}.`;
};
