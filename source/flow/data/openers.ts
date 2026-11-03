/* Every stage opens with her: what this stage is for, what she is handing you, what you hand back. Then the work.
   A resource is a real file from the scenario, a real tool link, the file you handed in last stage, or a sheet made here.
   content/lines.ts records a free take for each line, word for word. A line that drifts loses its take and she writes it. */
import type { ProjectId } from '../types';

export type Hand =
  | { file: string } /* a file in the scenario's bank */
  | { link: string; name: string; meta: string } /* a real tool, opened in a new tab */
  | { carry: string } /* what you handed in on that stage */
  | { made: 'rates' }; /* the exchange rates the model uses, as a csv */

export interface StageOpen {
  lines: (string | Hand)[];
  /* the slots land as she says this, on the line that holds it */
  reveal?: string;
  /* b20 (his note: "the first question should be What are you planning to do now? then their plan of action ... we can tell
     them what to do"): what a plan that is on track mentions, and the way she lays it out when it is not */
  plan?: { hit: RegExp; steer: string };
}

export const PLAN_ASK = 'What are you planning to do now?';
/* b20 (his note: "let the manager send the chat a little slow, it's super fast the starting ones and it comes direct to the
   point"): she says hello before the work, a different hello once you have finished a stage */
export const HELLO_FIRST = "Hey, good to have you here. Give me a minute to set you up.";
export const HELLO_NEXT = 'Welcome back. Nice work on the last one.';
export const PLAN_GOOD = "That's exactly how I'd do it.";
export const PLAN_STEER_LEAD = "Close. Here's how I'd go.";
export const PLAN_STUCK_LEAD = "No problem. Here's the way.";
export const PLAN_STEER = "Start with what I handed you, find what's off, then fix it and send it back.";

const CLAUDE: Hand = { link: 'https://claude.ai', name: 'Claude', meta: 'Tool' };
const CLAUDE_CODE: Hand = { link: 'https://docs.anthropic.com/en/docs/claude-code/overview', name: 'Claude Code', meta: 'Tool' };

export const OPENERS: Record<ProjectId, Record<string, StageOpen>> = {
  spotify: {
    clean: {
      lines: [
        "Before we price anything, the customer file has to be right. That's this stage.",
        "Here's what I'm handing you. The raw export, and Claude to do the heavy lifting.",
        CLAUDE,
        { file: 'raw' },
        'You hand me back one clean csv. Same customers, nothing broken.',
      ],
      plan: {
        hit: /dup|duplicat|clean|currenc|missing|blank|empty|date|format|broken|issue|error|claude|prompt|fix/i,
        steer: 'Open the raw export, find what is broken in it, then write Claude one prompt that fixes all of it.',
      },
    },
    model: {
      lines: [
        'Your clean file is in. Now we work out what each market actually brings in.',
        "You've got your clean file and this month's exchange rates.",
        { carry: 'clean' },
        { made: 'rates' },
        'You hand me back a revenue model, in three slots. Revenue by market, one currency, then revenue per user.',
      ],
      reveal: 'three slots',
      plan: {
        hit: /revenue|market|currenc|convert|usd|rate|per user|arpu|model|sum|total/i,
        steer: 'Add up revenue by market, turn it all into dollars with the rates, then divide by users.',
      },
    },
    rec: { lines: ['Now you make the call. Where we raise next, and by how much.', 'You hand me back one recommendation.'] },
    memo: { lines: ['Now we write it up so leadership can say yes.', 'You hand me back a pricing memo.'] },
    deck: { lines: ['Last one. You present it.', 'You hand me back a slide deck.'] },
  },
  amazon: {
    env: {
      lines: [
        "Before we build anything, the app needs a home and two keys. That's this stage.",
        "Here's what you'll use. GitHub for the repo, OpenRouter and LangSmith for the keys, and Claude Code to set it up.",
        { link: 'https://github.com/new', name: 'GitHub', meta: 'New repository' },
        { link: 'https://openrouter.ai/settings/keys', name: 'OpenRouter', meta: 'API keys' },
        { link: 'https://smith.langchain.com', name: 'LangSmith', meta: 'API keys' },
        CLAUDE_CODE,
        'You hand me back the repo link, with the keys kept out of it.',
      ],
      plan: {
        hit: /repo|github|key|openrouter|langsmith|env|secret|claude code|set ?up|install/i,
        steer: 'Make the repo on GitHub, get both keys, then have Claude Code set it up with the keys in an env file, never in the code.',
      },
    },
    ai: { lines: ['Now we connect the model, so a claim goes in and a verdict comes out.', 'You hand me back a working fact check.'] },
    trace: { lines: ["Now you trace it and test it, so we know when it's wrong.", 'You hand me back a test report.'] },
    ship: { lines: ['Last one. You ship it.', 'You hand me back a live URL.'] },
  },
};

/* her line when a stage is done, said in the celebration */
export const DONE_LINE: Record<ProjectId, Record<string, string>> = {
  spotify: { clean: "Great, that's exactly what I was looking for.", model: "That's stage 2 done." },
  amazon: { env: "Nice. That's the first stage done." },
};

export const openerLines = (p: ProjectId): string[] =>
  Object.values(OPENERS[p]).flatMap((o) => o.lines.filter((l): l is string => typeof l === 'string'));
