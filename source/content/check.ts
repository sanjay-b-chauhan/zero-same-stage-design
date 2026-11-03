/* The kickoff POU brain and the note grader, as data. Words and regexes are b1's `check` blocks, word for word.
   Pure data, no imports: mocks.ts reads this before any app module runs, and tools/make_takes.mjs reads it in node. */

export type KickoffProject = 'spotify' | 'amazon';
export type VoiceKey = 'eryn' | 'aaron';

export interface CheckLine {
  text: string;
  q: string;
  hear: RegExp[];
  more: string[];
  say: string;
  sample: string; /* what we answer for you when this browser can't hear you */
}

export const VOICE_OF: Record<KickoffProject, VoiceKey> = { spotify: 'eryn', amazon: 'aaron' };

export const CHECK: Record<KickoffProject, CheckLine[]> = {
  spotify: [
    {
      text: 'Some markets held after the price rise, others lost people',
      q: "So what's going on with Spotify's prices? Your own words.",
      hear: [
        /\b(some|couple|few|certain|different|two|others?|not all|mixed)\b/i,
        /\b(lost|lose|losing|left|leave|leaving|cancel\w*|churn\w*|held|hold|fine|didn'?t care|stayed|dropped|people)\b/i,
      ],
      more: ['Okay, tell me more. Did every market react the same?', 'What happened after the prices went up?'],
      say: 'Some markets held after the rise and others lost people.',
      sample: 'We raised prices in six markets, and some of them held while others lost people.',
    },
    {
      text: 'We need to know where to raise next and by how much',
      q: 'Okay, got it. And what does leadership actually want from us?',
      hear: [/\b(where|which|what) (market|countr\w*|to|do|we|next)|\bwhere\b|which market/i, /\b(raise|next|increase|price|how much)\b/i],
      more: ['Say more. What do they want to decide?', 'Okay. Decide what, exactly?'],
      say: 'They want to know where to raise next, and by how much.',
      sample: 'They want to know where we raise next, and by how much.',
    },
    {
      text: "You're starting from a raw export, not a clean file",
      q: 'Makes sense. And what are you starting from?',
      hear: [/\b(raw|messy|mess|dirty|export|unclean|data|file|dataset)\b/i],
      more: ['What does the data look like right now?'],
      say: 'You start from a raw export, and it is not clean.',
      sample: "I'm starting from a raw export, and it's a mess.",
    },
  ],
  amazon: [
    {
      text: "We're building an app that fact-checks Amazon announcements",
      q: 'So what are we building? Your own words.',
      hear: [/\b(app|tool|site|something|building|build|product)\b/i, /\b(fact|check|checks|checking|verify|verif\w*|claims?|true)\b/i],
      more: ['Okay. What does it actually do?', 'Tell me more. Check what?'],
      say: 'An app that fact-checks Amazon announcements.',
      sample: "We're building an app that fact-checks Amazon announcements.",
    },
    {
      text: 'Every claim gets checked, with sources',
      q: 'Okay, got it. And how do I know a result is right?',
      hear: [/\b(source|sources|citation|proof|evidence|link)\b/i],
      more: ['What would you show next to each claim?'],
      say: 'Each claim gets a result and a source next to it.',
      sample: 'Every claim comes back with its sources right next to it.',
    },
    {
      text: 'First you set up the project',
      q: "Makes sense. So what's first?",
      hear: [/\b(set ?up|setup|repo|github|environment|project|keys?|env)\b/i],
      more: ['Before any of the app. What do you do?'],
      say: 'First you set up the project, so there is something to build on.',
      sample: 'First I set up the project, the repo and the environment.',
    },
  ],
};

/* Her last word when you got all of it yourself, and when she had to fill something in. Founder's manager doc. */
export const END_ALL = "That's perfect. You nailed it.";
export const END_SOME = "Good. Let's keep going.";
export const NOT_HEARD = "I didn't catch that. Say it again?";

/* When she fills the gap she moves on: b1's own wording. */
export const toldThenNext = (say: string, nextQ: string) => `Okay. ${say} Keep that one. ${nextQ}`;
export const toldThenEnd = (say: string) => `Okay. ${say}`;

/* Note grader. Every group has to match for a note to land on that point. */
export const NOTE_KEYS: Record<string, RegExp[]> = {
  /* spotify */
  one_dollar: [/\b(dollar|\$1|one more|price|raise\w*)\b/i, /\b(cancel\w*|leave|left|stay\w*|quit)\b/i],
  room_math: [/\b(95|92|ninety|hundred|100|room)\b/i, /\b(money|revenue|more|less|stay\w*)\b/i],
  eight_walk: [/\b(8|eight|fewer|less than)\b/i, /\b(walk\w*|leave|left|out|cancel\w*|churn\w*)\b/i],
  six_markets: [/\b(six|6)\b/i, /\b(market|country|countries|price|prices|premium|raise\w*)\b/i],
  mixed_reaction: [/\b(held|hold|holds|didn'?t care|stayed|fine|ok|okay|some|couple)\b/i, /\b(lost|lose|losing|left|leave|churn\w*|cancel\w*|people|customers|users)\b/i],
  where_next: [/\b(where|which|market)\b/i, /\b(next|raise|how much|price|prices)\b/i],
  messy_data: [/\b(data|dataset|export|file|numbers?)\b/i, /\b(mess|messy|dirty|bad|broken|wrong|unclean|issues?|problems?|can'?t|nobody)\b/i],
  ten_issues: [/\b(ten|10)\b/i, /\b(issues?|problems?|things?|wrong|errors?|mistakes?)\b/i],
  one_recommendation: [/\b(one|single|clear)\b/i, /\b(recommend\w*|call|decision|answer)\b/i],
  back_it_up: [/\b(numbers?|model|revenue|data|market by market|back)\b/i, /\b(market|markets|back|why|prove|support\w*|up)\b/i],
  clean_dataset: [/\b(clean\w*|fix\w*)\b/i, /\b(data|dataset|export|csv|file)\b/i],
  revenue_model: [/\b(revenue|model)\b/i, /\b(model|market|markets|build)\b/i],
  make_recommendation: [/\b(recommend\w*|call)\b/i],
  pricing_memo: [/\bmemo\b/i],
  present_it: [/\b(present\w*|deck|slides?)\b/i],
  /* amazon */
  hard_to_check: [/\b(announcement\w*|claims?)\b/i, /\b(hard|check\w*|verify|tough|difficult)\b/i],
  fact_check_app: [/\b(app|tool|build\w*)\b/i, /\b(fact|check\w*|claims?|announcement\w*)\b/i],
  three_results: [/\b(verified|unverified|unsupported|sources?)\b/i],
  set_up_first: [/\b(set ?up|setup|project|first)\b/i, /\b(project|repo|github|environment|first|set ?up|setup)\b/i],
  connect_model: [/\b(connect\w*|model)\b/i, /\bmodel\b/i],
  trace_test: [/\b(trace\w*|test\w*)\b/i],
  ship_it: [/\b(ship\w*|launch\w*|live)\b/i],
};
