/* The brief's words, b47's shape (description with its numbers lit, Project Type, Workflows, Skills & Concepts), written
   from each project's own kickoff points and stages. objectiveSeed.ts pulls real product code, so it is never imported. */
import type { ProjectId } from '../types';

export const USER_ROLE: Record<ProjectId, string> = { spotify: 'Pricing Analyst', amazon: 'Engineer' };

export interface BriefTool {
  id: string;
  name: string;
  logo: string;
}

export interface BriefCopy {
  description: string;
  /* the phrases in the description that carry the numbers, lit in it */
  emphasis: string[];
  category: string;
  workflows: string[];
  skills: string[];
  tools: BriefTool[];
}

export const BRIEFS: Record<ProjectId, BriefCopy> = {
  spotify: {
    description:
      "Spotify raised Premium prices in six markets last year. A couple of them didn't care, and a couple lost a lot of people. Now leadership wants to know where to raise next, and by how much, but nobody can answer that yet: the raw export has ten things wrong with it. You join as the Pricing Analyst. Clean the data, model every market, and bring Eryn one clear recommendation, backed by numbers market by market.",
    emphasis: ['six markets', 'ten things wrong with it', 'one clear recommendation'],
    category: 'Pricing strategy',
    workflows: [
      "Use Claude to find and fix what's wrong in a raw pricing export.",
      "Build a revenue model that shows how far each market's price can go.",
      'Turn the model into one call: where to raise next, and by how much.',
      'Write the call up in a short pricing memo.',
      'Present the recommendation and back it with numbers, market by market.',
    ],
    skills: ['Data Cleaning', 'Revenue Modeling', 'Pricing Strategy', 'Data-Driven Recommendations', 'Stakeholder Presentations'],
    tools: [
      { id: 'claude', name: 'Claude', logo: 'static/logos/logo-claude.svg' },
      { id: 'sheets', name: 'Google Sheets', logo: 'static/logos/logo-sheets.svg' },
    ],
  },
  amazon: {
    description:
      "Amazon puts out announcements all the time, and a lot of the claims in them are hard to check. You're building an app that reads an announcement and checks every claim, so each one comes back verified, unverified or unsupported, with its source right next to it. You join as the Engineer, and you start by setting up the project the app runs on.",
    emphasis: ['checks every claim', 'verified, unverified or unsupported'],
    category: 'App build',
    workflows: [
      'Set up a GitHub repo for the project, with your API keys kept private.',
      'Get a first front-end running that the app can grow from.',
      'Connect a model that reads an announcement and checks every claim.',
      'Trace and test each answer against its source.',
      'Ship the fact checker to a live URL.',
    ],
    skills: ['Project Setup', 'Secrets Management', 'AI Integration', 'Testing and Tracing', 'Shipping to Production'],
    tools: [
      { id: 'claude-code', name: 'Claude Code', logo: 'static/logos/tool-claudecode.webp' },
      { id: 'github', name: 'GitHub', logo: 'static/logos/github.svg' },
    ],
  },
};

/* the description cut into runs, each marked when it is one of the lit phrases */
export const emphasize = (text: string, marks: string[]): { text: string; em: boolean }[] => {
  const runs: { text: string; em: boolean }[] = [];
  let rest = text;
  while (rest) {
    let at = -1;
    let hit = '';
    for (const m of marks) {
      const i = rest.indexOf(m);
      if (i >= 0 && (at < 0 || i < at)) {
        at = i;
        hit = m;
      }
    }
    if (at < 0) {
      runs.push({ text: rest, em: false });
      break;
    }
    if (at > 0) runs.push({ text: rest.slice(0, at), em: false });
    runs.push({ text: hit, em: true });
    rest = rest.slice(at + hit.length);
  }
  return runs;
};

/* the whole project's time, from the stages themselves */
export const totalMinutes = (stages: { minutes: number }[]): number => stages.reduce((n, s) => n + s.minutes, 0);

/* "82 min", "1 hr 22 min", "2 hr" */
export const hoursText = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
};

/* a deliverable's picture: a real file or tool mark where one exists, else a plain line icon */
export type DeliverableIcon = 'doc' | 'deck' | 'link';
export interface DeliverableArt {
  img?: string;
  icon?: DeliverableIcon;
}

const FILE_MARK: Record<string, string> = {
  '.csv': 'static/logos/f-csv.svg',
  '.md': 'static/logos/f-md.svg',
  '.xlsx': 'static/logos/logo-sheets.svg',
};

export const deliverableArt = (d: { label: string; type: string }): DeliverableArt => {
  const mark = FILE_MARK[d.type.toLowerCase()];
  if (mark) return { img: mark };
  if (/github/i.test(d.label)) return { img: 'static/logos/github.svg' };
  if (d.type.toLowerCase() === 'link') return { icon: 'link' };
  if (d.type.toLowerCase() === '.pptx') return { icon: 'deck' };
  return { icon: 'doc' };
};
