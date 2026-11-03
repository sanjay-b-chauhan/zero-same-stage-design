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

  { id: 'stage', group: 'Stage 1', label: 'She opens, the slots land', jump: 'stage' },
  { id: 'game', group: 'Stage 1', label: 'Stuck twice, a quick round', jump: 'game' },
  { id: 'issues-3', group: 'Stage 1', label: 'Three issues found', jump: 'issues-3' },
  { id: 'prompt', group: 'Stage 1', label: 'Write the prompt', jump: 'prompt' },
  { id: 'submit', group: 'Stage 1', label: 'Submit the file', jump: 'submit' },
  { id: 'feedback', group: 'Stage 1', label: 'Her feedback', jump: 'feedback' },
  { id: 'approved', group: 'Stage 1', label: 'Approved', jump: 'approved' },
  { id: 'pou-stage', group: 'Stage 1', label: 'Stage POU', jump: 'pou-stage' },
  { id: 'done', group: 'Stage 1', label: 'Stage done', jump: 'done' },
  { id: 'cele', group: 'Stage 1', label: 'Great, then the turn to stage 2', jump: 'cele' },

  { id: 'model', group: 'Stage 2', label: 'She opens stage 2', jump: 'model' },
  { id: 'model:1', group: 'Stage 2', label: 'Round one', jump: 'model:1' },
  { id: 'model:2', group: 'Stage 2', label: 'Round two', jump: 'model:2' },
  { id: 'model:3', group: 'Stage 2', label: 'Round three', jump: 'model:3' },
  { id: 'model-done', group: 'Stage 2', label: 'Stage 2 done', jump: 'model-done' },
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
