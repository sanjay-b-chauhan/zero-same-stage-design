/* The one store. UI reads `screen`, `project`, `stage`, `ui`, calls `actions`. The brain is in stage.ts. */
import { create } from 'zustand';
import type { Actions, Delivered, ProjectId, ProjectMeta, Screen, StageState, UiState } from '../types';
import { createEngine, SCENARIOS, type EngineDev } from './stage';

export interface FlowState {
  screen: Screen;
  project: ProjectMeta | null;
  stage: StageState | null;
  doneStages: string[];
  delivered: Delivered[];
  ui: UiState;
  actions: Actions;
}

const query = new URLSearchParams(location.search);
const firstProject: ProjectId = query.get('project') === 'amazon' ? 'amazon' : 'spotify';

let dev: EngineDev | null = null;

export const useFlow = create<FlowState>((set, get) => {
  const engine = createEngine(set as (p: Partial<FlowState>) => void, get);
  dev = engine.dev;
  return {
    screen: 'world',
    project: SCENARIOS[firstProject].meta,
    stage: null,
    doneStages: [],
    delivered: [],
    ui: {
      surface: 'big',
      pipBody: 'chat',
      pipOpen: false,
      bigSide: null,
      listening: false,
      level: 0,
      micLevel: 0,
      lightStage: false,
    },
    actions: engine.actions,
  };
});

/* "Continue stage 2 of 5" for wherever the way back into the project is drawn. Null once every stage is done. */
export const continueLabel = (s: FlowState = useFlow.getState()): string | null => {
  const stages = s.project?.stages ?? [];
  const i = stages.findIndex((x) => !s.doneStages.includes(x.id));
  return i < 0 ? null : `Continue stage ${i + 1} of ${stages.length}`;
};

/* test rails, nothing on screen */
const rail = window as unknown as { __flow?: typeof useFlow; __engine?: EngineDev | null };
rail.__flow = useFlow;
rail.__engine = dev;

const jumpTo = query.get('jump');
if (jumpTo) useFlow.getState().actions.jump(jumpTo);
