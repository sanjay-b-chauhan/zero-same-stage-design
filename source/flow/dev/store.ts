/* Developer mode. Every moment of the flow in order, and one way to land on any of them.
   It sits beside the product: the gear, the list and the keys live in DevMode.tsx, the product only listens.

   A screen listens with useDevGo: "if someone asks for a moment of mine, go there".
   A screen says where you really are with devMark, so the arrow keys always step from the truth. */
import { useEffect } from 'react';
import { create } from 'zustand';

export interface DevStep {
  id: string;
  group: string;
  label: string;
  /* what the engine's jump() takes to reach the right screen. Opening and Room then take it from there by id. */
  jump: string;
}

export const DEV_STEPS: DevStep[] = [
  { id: 'world', group: 'Opening', label: 'World map', jump: 'world' },
  { id: 'card', group: 'Opening', label: 'Project card', jump: 'world' },
  { id: 'brief', group: 'Opening', label: 'Project brief', jump: 'world' },

  { id: 'kickoff:walk', group: 'Kickoff', label: 'Her walk, full window', jump: 'kickoff' },
  { id: 'kickoff:join', group: 'Kickoff', label: 'Join Now', jump: 'kickoff' },
  { id: 'kickoff:intro', group: 'Kickoff', label: 'Her hello', jump: 'kickoff' },
  { id: 'kickoff:ready', group: 'Kickoff', label: 'Ready to take notes?', jump: 'kickoff' },
  { id: 'kickoff:room', group: 'Kickoff', label: 'The question', jump: 'kickoff' },
  { id: 'kickoff:check-room', group: 'Kickoff', label: 'Are we clear? The question', jump: 'kickoff' },
  { id: 'kickoff:problem', group: 'Kickoff', label: 'Problem', jump: 'kickoff' },
  { id: 'kickoff:check-problem', group: 'Kickoff', label: 'Are we clear? Problem', jump: 'kickoff' },
  { id: 'kickoff:outcome', group: 'Kickoff', label: 'Outcome', jump: 'kickoff' },
  { id: 'kickoff:check-outcome', group: 'Kickoff', label: 'Are we clear? Outcome', jump: 'kickoff' },
  { id: 'kickoff:process', group: 'Kickoff', label: 'Process', jump: 'kickoff' },
  { id: 'kickoff:check-process', group: 'Kickoff', label: 'Are we clear? Process', jump: 'kickoff' },
  { id: 'kickoff:outro', group: 'Kickoff', label: 'Outro', jump: 'kickoff' },
  { id: 'kickoff:end', group: 'Kickoff', label: 'Meeting ends, into the check-in', jump: 'kickoff' },

  { id: 'pou:1', group: 'Check-in', label: 'First question', jump: 'pou' },
  { id: 'pou:2', group: 'Check-in', label: 'Second question', jump: 'pou' },
  { id: 'pou:3', group: 'Check-in', label: 'Third question', jump: 'pou' },
  { id: 'pou:end', group: 'Check-in', label: 'Meter full, Continue', jump: 'pou' },

  { id: 'objective', group: 'Plan', label: 'Project overview', jump: 'objective' },

  /* b37 (his note: "in the setting, let's rename it to the stage name"): each stage is listed by its own name, and every
     stage has its feedback, check-in and end one click away */
  { id: 'stage', group: 'Clean the dataset', label: 'She opens the stage', jump: 'stage' },
  { id: 'ds:clean:work', group: 'Clean the dataset', label: 'Got it, the work starts', jump: 'stage' },
  { id: 'ds:clean:review', group: 'Clean the dataset', label: 'You send the file, she reads it', jump: 'stage' },
  { id: 'ds:clean:feedback', group: 'Clean the dataset', label: 'Her feedback', jump: 'stage' },
  { id: 'ds:clean:approved', group: 'Clean the dataset', label: 'Approved', jump: 'stage' },
  { id: 'ds:clean:pou', group: 'Clean the dataset', label: 'Her check-in', jump: 'stage' },
  { id: 'ds:clean:done', group: 'Clean the dataset', label: 'Stage done', jump: 'stage' },
  { id: 'cele', group: 'Clean the dataset', label: 'Great, then the turn to the next stage', jump: 'cele' },

  { id: 'model', group: 'Build the revenue model', label: 'She opens the stage', jump: 'model' },
  { id: 'ds:model:review', group: 'Build the revenue model', label: 'You send it, she reads it', jump: 'model' },
  { id: 'ds:model:feedback', group: 'Build the revenue model', label: 'Her feedback', jump: 'model' },
  { id: 'ds:model:approved', group: 'Build the revenue model', label: 'Approved', jump: 'model' },
  { id: 'ds:model:pou', group: 'Build the revenue model', label: 'Her check-in', jump: 'model' },
  { id: 'ds:model:done', group: 'Build the revenue model', label: 'Stage done', jump: 'model' },

  { id: 'rec', group: 'Make the recommendation', label: 'She opens the stage', jump: 'rec' },
  { id: 'ds:rec:review', group: 'Make the recommendation', label: 'You send it, she reads it', jump: 'rec' },
  { id: 'ds:rec:feedback', group: 'Make the recommendation', label: 'Her feedback', jump: 'rec' },
  { id: 'ds:rec:approved', group: 'Make the recommendation', label: 'Approved', jump: 'rec' },
  { id: 'ds:rec:pou', group: 'Make the recommendation', label: 'Her check-in', jump: 'rec' },
  { id: 'ds:rec:done', group: 'Make the recommendation', label: 'Stage done', jump: 'rec' },

  { id: 'memo', group: 'Submit your final deliverables', label: 'She opens the stage', jump: 'memo' },
  { id: 'ds:memo:review', group: 'Submit your final deliverables', label: 'You send it, she reads it', jump: 'memo' },
  { id: 'ds:memo:feedback', group: 'Submit your final deliverables', label: 'Her feedback', jump: 'memo' },
  { id: 'ds:memo:approved', group: 'Submit your final deliverables', label: 'Approved', jump: 'memo' },
  { id: 'ds:memo:pou', group: 'Submit your final deliverables', label: 'Her check-in', jump: 'memo' },
  { id: 'ds:memo:done', group: 'Submit your final deliverables', label: 'Stage done', jump: 'memo' },

  { id: 'deck', group: 'Present to the stakeholder', label: 'She opens the stage', jump: 'deck' },
  { id: 'ds:deck:review', group: 'Present to the stakeholder', label: 'You send it, she reads it', jump: 'deck' },
  { id: 'ds:deck:feedback', group: 'Present to the stakeholder', label: 'Her feedback', jump: 'deck' },
  { id: 'ds:deck:approved', group: 'Present to the stakeholder', label: 'Approved', jump: 'deck' },
  { id: 'ds:deck:pou', group: 'Present to the stakeholder', label: 'Her check-in', jump: 'deck' },
  { id: 'ds:deck:done', group: 'Present to the stakeholder', label: 'Practice done, Join the call', jump: 'deck' },
  { id: 'call:lobby', group: 'Present to the stakeholder', label: 'The call, before you join', jump: 'deck' },
  { id: 'call:call', group: 'Present to the stakeholder', label: 'In the call, she says hello', jump: 'deck' },
  { id: 'call:check', group: 'Present to the stakeholder', label: 'Framing, slide and mic checks', jump: 'deck' },
  { id: 'call:present', group: 'Present to the stakeholder', label: 'You present, the call in PiP', jump: 'deck' },
  { id: 'call:qa', group: 'Present to the stakeholder', label: 'Her questions', jump: 'deck' },
  { id: 'call:review', group: 'Present to the stakeholder', label: 'She writes it up', jump: 'deck' },
  { id: 'call:report', group: 'Present to the stakeholder', label: 'Your presentation report', jump: 'deck' },
  { id: 'call:finish', group: 'Present to the stakeholder', label: 'The project ends', jump: 'deck' },
];

export const DEV_GROUPS: string[] = [...new Set(DEV_STEPS.map((s) => s.group))];

export const stepIndex = (id: string) => DEV_STEPS.findIndex((s) => s.id === id);

export interface DevAction {
  id: string;
  label: string;
  run: () => void;
}

export type ZStyle = 'voice' | 'job' | 'trust';
export type StageLayout = 'default' | 'resource-left';

interface Prefs {
  gear: boolean;
  keys: boolean;
  style: ZStyle;
  layout: StageLayout;
}

interface DevState extends Prefs {
  at: string;
  go: { id: string; n: number } | null;
  actions: DevAction[];
}

const PREFS = 'zero-stage-dev';

const STYLES: ZStyle[] = ['voice', 'job', 'trust'];
const DEFAULTS: Prefs = { gear: true, keys: true, style: 'voice', layout: 'default' };

const readPrefs = (): Prefs => {
  let saved: Partial<Prefs> = {};
  try {
    saved = JSON.parse(localStorage.getItem(PREFS) ?? '{}');
  } catch {
    saved = {};
  }
  const asked = new URLSearchParams(location.search).get('style') as ZStyle | null;
  const prefs = { ...DEFAULTS, ...saved };
  if (asked && STYLES.includes(asked)) prefs.style = asked;
  if (new URLSearchParams(location.search).get('layout') === 'resource-left') prefs.layout = 'resource-left';
  return prefs;
};

export const useDev = create<DevState>(() => ({
  ...readPrefs(),
  at: 'world',
  go: null,
  actions: [],
}));

/* the switch every screen follows, set before the first paint */
document.documentElement.dataset.zstyle = useDev.getState().style;

export const setPref = (p: Partial<Prefs>) => {
  useDev.setState(p);
  const { gear, keys, style, layout } = useDev.getState();
  document.documentElement.dataset.zstyle = style;
  try {
    localStorage.setItem(PREFS, JSON.stringify({ gear, keys, style, layout }));
  } catch {
    /* it still works for this visit */
  }
};

/* where you really are. Call it when the moment begins on its own, so the arrows step from here. */
export const devMark = (id: string) => {
  if (useDev.getState().at !== id && stepIndex(id) >= 0) useDev.setState({ at: id });
};

let seq = 0;
let consumed = 0;

/* DevMode calls this after the engine has reached the right screen. */
export const devAsk = (id: string) => {
  useDev.setState({ at: id, go: { id, n: ++seq } });
};

/* A screen takes the moments that are its own. Fires once per ask, including an ask made just before this screen mounted. */
export function useDevGo(mine: (id: string) => boolean, fn: (id: string) => void) {
  const go = useDev((s) => s.go);
  useEffect(() => {
    if (!go || go.n === consumed || !mine(go.id)) return;
    consumed = go.n;
    fn(go.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go?.n]);
}

/* A screen offers "do this for me" while it is on: fill my notes, answer for me. Shows in the panel, key A runs the first. */
export function useDevAction(id: string, label: string, run: () => void, on = true) {
  useEffect(() => {
    if (!on) return;
    const a: DevAction = { id, label, run };
    useDev.setState((s) => ({ actions: [...s.actions.filter((x) => x.id !== id), a] }));
    return () => useDev.setState((s) => ({ actions: s.actions.filter((x) => x !== a) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, label, on]);
}
