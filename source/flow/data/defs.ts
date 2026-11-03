/* The shape of a scenario. Words and rules only, no DOM and no state. flow/engine runs them. */
import type { ProjectMeta, Surface } from '../types';

export type Stats = Record<string, string | number>;

export interface ReviewItem {
  id: string;
  one: string;
  what: string;
  why: string;
  how: string;
  about?: RegExp;
}

export interface ReviewResult {
  items: ReviewItem[];
  total: number;
  wrong?: boolean;
  limited?: boolean; /* the check could not reach what it needed, so nothing was really inspected */
  stats?: Stats;
}

export interface Submission {
  name: string;
  text?: string;
  url?: string;
  meta?: string;
}

export interface RepoFixture {
  url: string;
  public: boolean;
  files: string[];
}

/* Things the review may read that are not in the submission itself. */
export interface ReviewCtx {
  repo?: RepoFixture;
}

export interface ConceptDef {
  ask: string;
  yes: string;
  no: string; /* film id */
  nope?: string;
}

export type OpenLine = string | { file: string };

export interface Issue {
  id: string;
  label: string;
  find: (t: string) => boolean;
  part?: (t: string) => string | null;
  ask: [string, string, string];
  why: string;
  said?: string; /* how she names it back when it lands: "the negative prices" */
}

export interface RubricRow {
  id: string;
  test: RegExp;
  miss: string;
}

interface StepBase {
  id: string;
  label: string;
  open: OpenLine[];
  concept?: ConceptDef;
  reveal?: string; /* the words in her opening line the slots land on */
  doing?: string; /* the one thing to do now, under the stage title */
  stuck?: string; /* what she says to I'm stuck on this step, when the step has nothing better */
}

export interface FindStepDef extends StepBase {
  kind: 'find';
  items: Issue[];
  order: string[];
  again: string[];
  done: string;
  blanks?: string[]; /* a vague "gaps" or "empty cells" lands the first of these still open */
  vague?: RegExp;
}

export interface PromptStepDef extends StepBase {
  kind: 'prompt';
  rubric: RubricRow[];
  need: number;
  output?: RegExp;
  outputMiss?: string;
  draft: string;
  thin: string;
  ok: string;
}

export interface VerifyResult {
  ok: boolean;
  say?: string;
  limited?: boolean;
}

export interface AskStepDef extends StepBase {
  kind: 'ask';
  takes?: 'link';
  verify?: (url: string, ctx: ReviewCtx) => Promise<VerifyResult>;
  nolink?: string;
  yes?: RegExp;
  ok: string;
  help?: string;
  remind?: string;
}

export interface SubmitStepDef extends StepBase {
  kind: 'submit';
  type: string;
  runHelp?: string;
}

export type StepDef = FindStepDef | PromptStepDef | AskStepDef | SubmitStepDef;

export interface PouQ {
  k: 'What' | 'Why' | 'How' | 'One more';
  text: string;
  q: string;
  hear: RegExp[];
  more: string[];
  say: string;
  when?: (ctx: { sawMismatch: boolean }) => boolean;
}

export interface StageDef {
  id: string;
  deliverable: { label: string; type: string; takes: 'file' | 'link'; name: string };
  flow: StepDef[];
  review: (sub: Submission, ctx: ReviewCtx) => ReviewResult | Promise<ReviewResult>;
  reviewSay: (r: ReviewResult) => string;
  approve: string;
  stats: (r: ReviewResult) => Array<[string, string]>;
  pou: { lines: PouQ[]; curve: PouQ[]; end: string };
  /* dev only: what a rough and a clean hand-in look like */
  demo: {
    first: () => Submission;
    last: () => Submission;
    repo?: (how: 'submit' | 'first' | 'last') => RepoFixture;
  };
}

export interface ScreenCtx {
  phase: string;
  stepKind?: StepDef['kind'];
  left: number;
  promptText: string;
  firstOpenHow?: string; /* the first unticked feedback item */
  resub: boolean;
  surface: Surface;
  runHelp?: string;
}

export interface RawFile {
  id: string;
  name: string;
  meta: string;
  kind: 'csv';
  url: string;
  text: string;
}

export interface Scenario {
  meta: ProjectMeta;
  files: Record<string, RawFile>;
  stages: Record<string, StageDef>;
  stubLines: Record<string, string>;
  say: { ready: string; next: (title: string) => string; back: (n: number, title: string) => string };
  secret?: RegExp;
  leak?: string;
  /* what she can truthfully say when you hold to talk, from state she really has */
  screen: (c: ScreenCtx) => string;
}
