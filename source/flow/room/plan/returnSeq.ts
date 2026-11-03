/* Coming back to the objective after a stage. The finished stages live only in the flow's store, so this page keeps
   the ones it has already shown done, per project, for as long as the tab lives. A finished stage it has not shown yet
   plays its return once: its tick, the marker down the path, the next stage growing into the card, then its key. */
import type { ProjectMeta } from '../../types';

export interface Return {
  /* the stage just finished, and where the path goes next (stages.length: the end flag) */
  f: number;
  n: number;
}

const shown = new Set<string>();
const keyOf = (projectId: string, stageId: string) => `${projectId}:${stageId}`;

/* the last finished stage this page has not shown yet, or null when there is nothing new to show */
export const returnOf = (project: ProjectMeta, doneStages: string[]): Return | null => {
  let f = -1;
  project.stages.forEach((s, i) => {
    if (doneStages.includes(s.id) && !shown.has(keyOf(project.id, s.id))) f = i;
  });
  if (f < 0) return null;
  const n = project.stages.findIndex((s) => !doneStages.includes(s.id));
  return { f, n: n < 0 ? project.stages.length : n };
};

export const markShown = (project: ProjectMeta, doneStages: string[]) => {
  doneStages.forEach((id) => shown.add(keyOf(project.id, id)));
};

/* where the marker is along its way, 0 to 1, slow out of the old stage and slow into the next */
export const travelEase = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* b30 (his note: "the same container goes there, sits on the first thing, a tick mark, goes to the second thing, and then
   we open up the second stage"): a stage left with Continue asks the page to open the next one once the way back lands */
let autoStart = false;
export const armAutoStart = () => {
  autoStart = true;
};
export const takeAutoStart = () => {
  const on = autoStart;
  autoStart = false;
  return on;
};
