/* Her answers on the objective, scripted: what you asked, matched to the plan's own facts (the stage you are on, its
   minutes, what you hand in, the tools). Nothing is sent anywhere. */
import { BRIEFS } from '../../open/briefData';
import type { ProjectMeta, StageMeta } from '../../types';
import { aboutTime } from './words';

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export const replyTo = (text: string, project: ProjectMeta, current: StageMeta | null): string => {
  const q = text.toLowerCase();
  const stage = current ?? project.stages[0];
  const total = project.stages.reduce((t, s) => t + s.minutes, 0);
  if (!stage) return 'Good question. Ask me again inside the stage.';
  const n = project.stages.indexOf(stage) + 1;
  if (/^(ok|okay|k|got it|yes|yep|yeah|sure|cool|alright|makes sense|understood)\b/.test(q.trim())) return `Good. Hit Start when you're ready, stage ${n} first.`;
  if (/how long|time|hour|minute|quick/.test(q)) return `About ${aboutTime(total)} in all. ${stage.title} takes ${stage.minutes} minutes.`;
  if (/tool|sheet|app|software|use/.test(q)) {
    const tools = BRIEFS[project.id].tools.map((t) => t.name);
    return `You'll work in ${tools.join(' and ')}. Everything opens from the stage.`;
  }
  if (/deliver|submit|hand|make|output|send/.test(q)) return `For this one you hand me the ${lower(stage.deliverable.label)}, a ${stage.deliverable.type}. I'll check it and tell you what's missing.`;
  if (/first|start|begin|where/.test(q)) return `Start with stage ${n}, ${lower(stage.title)}. Hit Start when you're ready, I'll be in the chat the whole way.`;
  if (/stuck|help|hard|don.?t know|confus/.test(q)) return "That's fine. Inside the stage there's an I'm stuck switch, and I'll walk you through it one step at a time.";
  return `Good one. Bring it into the stage and we'll answer it on the real file. We start with stage ${n}, ${lower(stage.title)}.`;
};
