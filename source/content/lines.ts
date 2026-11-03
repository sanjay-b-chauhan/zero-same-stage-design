/* Every spoken line outside the kickoff meeting itself. tools/make_takes.mjs records one free Kokoro take for each.
   Stage POU words are b1's `pou` blocks, word for word. The kickoff POU comes from content/check.ts. */
import { CHECK, END_ALL, END_SOME, NOT_HEARD, toldThenEnd, toldThenNext } from './check.ts';
import type { KickoffProject, VoiceKey } from './check.ts';

export interface Line {
  id: string;
  voice: VoiceKey;
  text: string;
}

export interface BreakdownLine {
  text: string;
  stop?: number; /* the stage index this line names */
}

export const BREAKDOWN: Record<KickoffProject, BreakdownLine[]> = {
  spotify: [
    { text: "Alright, you've got the whole picture." },
    { text: "It's a lot if you look at it as one big thing, so let's split it up, so you can move faster." },
    { text: 'First, we clean the data.', stop: 0 },
    { text: 'Then we build the revenue model, market by market.', stop: 1 },
    { text: "Once we've got that, you make the call, where we raise and by how much.", stop: 2 },
    { text: 'Then you write it up in a pricing memo.', stop: 3 },
    { text: 'And last, you present it.', stop: 4 },
    { text: "That's it. Five pieces, and at the end you've got one clear recommendation. You got it?" },
  ],
  amazon: [
    { text: "Alright, you've got the whole picture." },
    { text: "It's a lot if you look at it as one big thing, so let's split it up, so you can move faster." },
    { text: 'First, we set up the environment.', stop: 0 },
    { text: 'Then we connect the model.', stop: 1 },
    { text: 'Once we can see it working, you trace it and test it.', stop: 2 },
    { text: 'And last, you ship it.', stop: 3 },
    { text: "That's it. Four pieces, and at the end you've got a live app. You got it?" },
  ],
};

interface PouItem {
  k: string;
  q: string;
  more: string[];
  say: string;
}

export const STAGE_POU: Record<KickoffProject, { lines: PouItem[]; curve: PouItem[]; end: string }> = {
  spotify: {
    lines: [
      {
        k: 'what',
        q: 'What did you just submit to me? How would you explain it?',
        more: ['Okay. But what is it? Say it like I never saw it.', "Tell me more. What's actually in it now?"],
        say: "It's the customer file with the bad rows fixed, so markets can be compared.",
      },
      {
        k: 'why',
        q: 'Why does this dataset matter?',
        more: ['Okay, got it. What would actually break if we skipped this?', 'Say more. Who gets hurt by a bad file?'],
        say: 'Everything after this sits on it. Bad rows make the revenue model wrong, and we set prices off that model.',
      },
      {
        k: 'how',
        q: 'How did you clean it? Walk me through what you did.',
        more: ['Okay. And then what?', 'Walk me through it in order. What came first?'],
        say: 'You found the issues first, gave Claude a specific prompt, then checked what it returned and fixed what it missed.',
      },
    ],
    curve: [
      {
        k: 'curve1',
        q: "Hey, I noticed that in your first file the pricing on some Mumbai rows didn't match the currency. Can you explain that?",
        more: ['What would that have done to the numbers?', 'Why is 119 USD a problem?'],
        say: '119 is a rupee price with a dollar label. It makes those customers look like they pay ten times what anyone else does.',
      },
      {
        k: 'curve2',
        q: 'You kept the rows with blank names. Why not just delete them?',
        more: ['What would we lose?'],
        say: "They're real paying customers. Dropping them understates revenue.",
      },
    ],
    end: "Great, that's exactly what I was looking for.",
  },
  amazon: {
    lines: [
      {
        k: 'what',
        q: 'What did you set up in this stage?',
        more: ["Okay. What's actually in the repo now?", 'Tell me more. What could I open and use?'],
        say: 'A repo with the environment set up and a front-end you can use.',
      },
      {
        k: 'why',
        q: 'Why do we need an environment file instead of putting API keys directly in our code?',
        more: ['What goes wrong if the key sits in the code?', 'Who could see it?'],
        say: 'Keys in code go wherever the code goes, including a public repo.',
      },
      {
        k: 'how',
        q: 'Walk me through how you created the repository, configured the environment, and built the HTML interface.',
        more: ['Okay. And then what?', 'Walk me through it in order.'],
        say: 'You made the repo, ran one prompt for the environment and one for the front-end, then pushed.',
      },
    ],
    curve: [
      {
        k: 'curve1',
        q: 'What could happen if you accidentally pushed your .env file to GitHub?',
        more: ['And what would you do right after?'],
        say: "Anyone can use your keys on your bill. You'd revoke them right away.",
      },
    ],
    end: "Nice. That's the first stage done.",
  },
};

/* What she says between POU questions in b1, plus the acceptance line. Same words. */
export const STAGE_ACKS = ['Okay, got it.', 'Exactly.', "Yes. That's it.", 'Awesome. This looks great. I have a few questions now.'];

/* When she fills the gap on a stage POU question, b1 says it like this. */
export const keepThatOne = (say: string) => `Okay. ${say} Keep that one.`;

const lines: Line[] = [];
const add = (id: string, voice: VoiceKey, text: string) => lines.push({ id, voice, text });

(['spotify', 'amazon'] as KickoffProject[]).forEach((p) => {
  const voice: VoiceKey = p === 'amazon' ? 'aaron' : 'eryn';

  BREAKDOWN[p].forEach((l, i) => add(`bd-${p}-${i}`, voice, l.text));

  const check = CHECK[p];
  check.forEach((l, i) => {
    add(`check-${p}-${i}-q`, voice, l.q);
    l.more.forEach((m, j) => add(`check-${p}-${i}-more${j}`, voice, m));
    add(`check-${p}-${i}-end`, voice, toldThenEnd(l.say));
    for (let n = i + 1; n < check.length; n++) add(`check-${p}-${i}-to${n}`, voice, toldThenNext(l.say, check[n].q));
  });
  add(`check-${p}-all`, voice, END_ALL);
  add(`check-${p}-some`, voice, END_SOME);
  add(`check-${p}-nothing`, voice, NOT_HEARD);

  const pou = STAGE_POU[p];
  [...pou.lines, ...pou.curve].forEach((l) => {
    add(`pou-${p}-${l.k}-q`, voice, l.q);
    l.more.forEach((m, j) => add(`pou-${p}-${l.k}-more${j}`, voice, m));
    add(`pou-${p}-${l.k}-say`, voice, l.say);
    add(`pou-${p}-${l.k}-keep`, voice, keepThatOne(l.say));
  });
  add(`pou-${p}-end`, voice, pou.end);
  STAGE_ACKS.forEach((t, i) => add(`ack-${p}-${i}`, voice, t));
});

/* Her opening lines on each stage step, word for word from flow/data. A line that drifts loses its take and she stays silent, never stuck. */
export const STAGE_OPEN: Record<KickoffProject, string[]> = {
  spotify: [
    "Okay, so the first thing is I have a data file, but there's a bunch of issues with it. I need you to help me figure out those issues.",
    'Can you open it and tell me what issues you found?',
    "That's all ten. Now the prompt.",
    'Have you written a prompt to clean a file with Claude before?',
    'Okay, then this one is yours.',
    "No problem. Here's a quick one.",
    'Okay, great. Now we know all the issues with the file. What is a prompt that we can send to Claude to fix these issues?',
    "Now go ahead and throw that in Claude and send me the clean data file when you have it ready. Hit PIP and I'll come with you.",
  ],
  amazon: [
    "Okay, what we need to first do is set up our environment. Let's start by creating a GitHub repo. Hit PIP, make one, and send me the link.",
    'Okay, now we need two keys. First, OpenRouter. Do you know what OpenRouter is?',
    'Okay, good.',
    "Okay, here's a video.",
    "Go make a key on openrouter.ai. Don't paste it here. Just tell me when you have it.",
    'Next, LangSmith. Do you know what that is?',
    "Okay, here's one for that.",
    'Same thing. Make a key, keep it to yourself, and tell me when you have it.',
    "Good. We've got both API keys. Now we need to store them securely. How would you prompt Claude Code to set that up?",
    "Nice. Now let's build the interface. What would you tell Claude Code to create so someone can easily submit an announcement and review the results?",
    "Now go run both of those in Claude Code. Commit and push. Send me the repo link when it's up.",
  ],
};

(['spotify', 'amazon'] as KickoffProject[]).forEach((p) => {
  const voice: VoiceKey = p === 'amazon' ? 'aaron' : 'eryn';
  STAGE_OPEN[p].forEach((t, i) => add(`open-${p}-${i}`, voice, t));
});

export const LINES: Line[] = lines;
