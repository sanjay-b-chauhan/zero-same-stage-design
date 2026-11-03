/* Navid, the coach. He sits beside the work and never does it: the manager owns the work.
   One line on what he watches right now, read from where you are in the flow. */
import type { Screen, StageState } from '../types';

export const COACH = {
  name: 'Navid',
  role: 'Your coach',
  face: 'static/faces/navid.jpg',
  rule: 'I let you slip twice. On the third, I step in.',
} as const;

const STEP: Record<string, string> = {
  find: 'I’m watching how you read the file before you call something an issue.',
  ask: 'I’m watching whether you ask her a clear question before you guess.',
  prompt: 'I’m watching whether your prompt spells out what clean means.',
  submit: 'I’m watching whether you check the file yourself before you hand it in.',
};

export function watching(screen: Screen, stage: StageState | null): string {
  if (screen === 'breakdown') return 'I’m watching whether you can say the plan back in your own words.';
  if (screen === 'objective') return 'I’m watching whether you know why the stages come in this order.';
  if (screen !== 'stage' || !stage) return 'I’m watching how you read the brief: who it’s for and what done looks like.';
  if (stage.phase === 'review' || stage.phase === 'feedback') return 'I’m watching whether you fix every point she raises before you resubmit.';
  if (stage.phase === 'approved' || stage.phase === 'done') return 'I’m watching whether you can sum up this stage in one line.';
  const now = stage.steps.find((s) => s.state === 'now');
  return STEP[now?.kind ?? 'find'] ?? STEP.find;
}
