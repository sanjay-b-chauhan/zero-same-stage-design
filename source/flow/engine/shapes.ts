/* Types the engine speaks in. The state shape it needs from the store. */
export type * from '../types';
import type { Actions, Delivered, ProjectMeta, Screen, StageState, UiState } from '../types';

export interface FlowStateLike {
  screen: Screen;
  project: ProjectMeta | null;
  stage: StageState | null;
  doneStages: string[];
  delivered: Delivered[]; /* everything you handed in, every stage, newest last */
  ui: UiState;
  actions: Actions;
}
