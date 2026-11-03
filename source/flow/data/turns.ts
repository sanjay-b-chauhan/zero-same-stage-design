/* Her words on the turn between two stages, keyed by the stage just done. The founder's shape, 2 Nov: "okay, so now that
   we've done this, let's work on that". Read, not heard: the turn is text only, like the tutorial's opening. */
import type { ProjectId, StageMeta } from '../types';

const TURN: Record<ProjectId, Record<string, [string, string]>> = {
  spotify: {
    clean: ["Okay, so now that the data's clean, let's work on the revenue model.", 'Six markets, side by side.'],
    model: ["Okay, so now that we know what each market earns, let's make the call.", 'Where we raise, and by how much.'],
    rec: ["Okay, so now that we've made the call, let's write it up.", 'One page the team can act on.'],
    memo: ["Okay, so now that it's written, let's present it.", 'To the people who decide.'],
  },
  amazon: {
    env: ["Okay, so now that the environment's set up, let's connect the model.", 'A claim goes in, a verdict comes out.'],
    ai: ["Okay, so now that it answers, let's trace it and test it.", "So we know when it's wrong."],
    trace: ["Okay, so now that it's tested, let's ship it.", 'One live link.'],
  },
};

export function turnLines(p: ProjectId, from: string, next: StageMeta): string[] {
  const time = `About ${next.minutes} minutes.`;
  const own = TURN[p]?.[from];
  return own ? [own[0], `${own[1]} ${time}`] : [`Okay, next up is ${next.short.toLowerCase()}.`, time];
}
