/* The one state both the big screen and the PIP read. UI never holds flow state of its own. */

export type ProjectId = 'spotify' | 'amazon';
export type Screen = 'world' | 'kickoff' | 'pou' | 'breakdown' | 'objective' | 'stage';
/* these four are one surface, the Room */
export const isRoomScreen = (s: Screen): boolean => s === 'kickoff' || s === 'pou' || s === 'breakdown' || s === 'objective';
export type Phase = 'work' | 'review' | 'feedback' | 'approved' | 'pou' | 'done';
export type Surface = 'big' | 'pip';
export type PipBody = 'chat' | 'slots' | 'resources' | 'preview' | 'film';
export type BigSide = null | 'preview' | 'resources';

export interface StageMeta {
  id: string;
  title: string;
  short: string; /* the plain word in the top bar */
  minutes: number;
  deliverable: { label: string; type: string };
  stub?: boolean; /* later stages: named, not playable */
}

export interface ProjectMeta {
  id: ProjectId;
  company: string;
  logo: string; /* static/logos/... */
  title: string;
  manager: { name: string; full: string; role: string; face: string };
  stages: StageMeta[];
  end: string; /* last node on the breakdown line */
}

export type SlotKind = 'issue' | 'prompt' | 'confirm' | 'link' | 'file';
export interface Slot {
  id: string;
  stepId: string;
  kind: SlotKind;
  label: string; /* only shown once filled, or on hover of a filled one */
  filled: boolean;
  value?: string; /* the agreed prompt, the link, the file name */
  verified?: boolean;
  named?: boolean; /* its name shows before it fills: a round you play, never an answer */
  said?: string; /* what you wrote that filled it, in your words */
  proof?: string; /* where it shows in the work */
  note?: string; /* what she took from it */
}

export interface Step {
  id: string;
  label: string;
  kind: 'find' | 'ask' | 'prompt' | 'submit';
  state: 'next' | 'now' | 'done';
  slots: Slot[];
  revealed?: boolean; /* its slots have landed, on her word. Until then the step is only its title */
}

export interface FileRef {
  id: string;
  name: string;
  meta: string;
  kind: 'csv' | 'text' | 'link' | 'image';
  url?: string;
  stageId: string;
  text?: string; /* the real file text, for the preview and Download */
  mine?: boolean; /* you handed this in, she did not share it */
}

/* one thing you handed in: a prompt, a file, a link, the stage 2 model. Your deliverables lists them, newest first */
export interface Delivered {
  id: string;
  fileId: string; /* opens in the preview */
  name: string;
  kind: FileRef['kind'];
  where: string; /* the step or slot it filled */
  stageId: string;
  at: number; /* ms */
  from?: string; /* where it left from on screen: 'slot:<id>', 'composer' or 'submit' */
  quiet?: boolean; /* a dev jump put it there, nothing flies */
  again?: boolean; /* the same thing handed in again in its stage: it replaced its old row, the count stays */
}

export interface Option {
  id: string;
  label: string;
}

export interface FilmRef {
  id: string;
  title: string;
  seen: boolean;
}

export interface VoiceNote {
  takeId: string;
  url: string;
  dur: number;
  text: string;
}

export interface Msg {
  id: string;
  from: 'her' | 'me';
  at: number;
  text?: string;
  file?: FileRef;
  options?: Option[]; /* cleared once answered */
  film?: FilmRef;
  voice?: VoiceNote; /* POU questions */
  voiced?: boolean; /* my line came from hold to talk */
  draft?: boolean; /* text is a prompt she drafted, keep its line breaks */
  sys?: boolean; /* a plain system line, not her words */
  stuck?: boolean; /* my "I'm stuck", drawn as the pill I pressed */
  game?: { id: string; done?: boolean }; /* a micro-scenario card, flow/games */
  rule?: boolean; /* b14: a sys line drawn across the chat between two hairlines, "Stuck mode on" */
  tally?: { n: number; of: number }; /* b14 stuck mode: how many of the step's slots are found so far */
  sm?: boolean; /* b20: said while stuck mode was on, so its bubble takes the stuck colour */
}

export interface FeedbackItem {
  id: string;
  one: string;
  what: string;
  why: string;
  how: string;
  checked: boolean;
}

export interface PouLine {
  k: 'What' | 'Why' | 'How' | 'One more';
  text: string;
  said: boolean;
  told?: boolean; /* she filled the gap: it pops, but stays white */
}

export interface SubmitInfo {
  name: string;
  isLink: boolean;
  stats?: Array<[string, string]>;
}

export interface StageState {
  projectId: ProjectId;
  stageId: string;
  phase: Phase;
  steps: Step[];
  msgs: Msg[];
  typing: boolean; /* she is writing */
  files: FileRef[]; /* everything she has shared, by stage */
  feedback: FeedbackItem[];
  submitted?: SubmitInfo;
  submitOpen: boolean; /* the drop area is showing */
  pou: { lines: PouLine[]; asking: number; progress: number; recording: boolean };
  startedAt: number; /* ms, when the timer started */
  stageMs: number;
  unread: boolean;
  lastSlotAt: number; /* ms, for the fill moment */
  lastSlotId?: string;
  fbOpen?: string; /* the feedback item that is expanded */
  coach?: { name: string; face: string; text: string }; /* third strike in the POU */
  revealAt?: number; /* ms, when the current step's slots landed */
  revealId?: string;
  stuck?: boolean; /* the I'm stuck pill is lit */
  stuckMode?: boolean; /* b13 stuck mode: the switch in the composer is on. She lays out the moves, the issues become picks */
  wait?: { at: number; steps: Array<{ label: string; detail?: string; ms: number }> }; /* the honest review wait, real numbers */
}

/* b14 co-work: where her cursor goes on the fake desktop. Rows count the header as row 1, the way the sheet numbers them */
export type PointAt =
  | { at: 'cells'; col: string; rows: number[] }
  | { at: 'head'; col: string }
  | { at: 'dock'; app: 'sheets' | 'claude' }
  | { at: 'claude-input' };

export interface PointMark {
  id: number;
  to: PointAt;
  note: string;
}

/* what is on the fake desktop when you talk: she points only at what is there */
export interface TalkScene {
  desk: boolean;
  sheet: boolean;
  claude: boolean;
}

export interface UiState {
  surface: Surface;
  pipBody: PipBody;
  pipOpen: boolean; /* collapsed row or opened body */
  bigSide: BigSide;
  previewFileId?: string;
  filmId?: string;
  listening: boolean; /* hold to talk is down */
  level: number; /* 0 to 1, her voice right now, drives the circle */
  micLevel: number; /* 0 to 1, my voice right now */
  playingMsgId?: string; /* the voice note playing right now */
  stream?: { id: string; n: number }; /* her line being written: how many words are out */
  lightStage: boolean; /* the stage in the kit's light, from the dev panel */
  point?: PointMark; /* b14 co-work: her cursor on the fake desktop, until you act or dismiss it */
}

export interface Actions {
  /* flow */
  goto(screen: Screen): void;
  startStage(stageId: string): void;
  /* stage */
  send(text: string, voiced?: boolean): void;
  choose(msgId: string, optionId: string): void;
  openFile(fileId: string): void;
  closeSide(): void;
  openResources(): void;
  download(fileId: string): void;
  openSubmit(): void;
  closeSubmit(): void;
  submitFile(file: File): void;
  submitLink(url: string): void;
  toggleFeedback(id: string): void;
  setFbOpen(id?: string): void;
  resubmit(): void;
  startPou(): void;
  pouAnswer(text: string): void;
  filmDone(id: string): void;
  dismissCoach(): void;
  attachFile(file: File): void;
  sendShot(dataUrl: string): void;
  stuck(): void;
  stuckMode(on?: boolean): void;
  /* b14 co-work: what you said while holding. An answer to her question goes in as one, anything else she answers as talk:
     in voice, by pointing on your screen, or with a film or file. id is your line, so the frame she took can sit on it */
  talk(text: string, scene: TalkScene): { id?: string; done: Promise<unknown> };
  /* the question a hold "hears" when nothing was typed, from where you are. n rotates the way she helps */
  talkLine(n: number, scene: TalkScene): string;
  unpoint(): void;
  setLightStage(v: boolean): void;
  noteTyping(): void; /* the composer has words in it, so she does not nudge */
  /* surface */
  setSurface(s: Surface): void;
  setPipBody(b: PipBody): void;
  setPipOpen(o: boolean): void;
  setListening(l: boolean): void;
  setLevel(v: number): void;
  setMicLevel(v: number): void;
  markRead(): void;
  /* a micro-scenario card in the thread is played: fill its slot, pay its XP, mark it done. Safe to call twice */
  gameDone(msgId: string, r: { right: boolean; tries: number; answer: string; rect: DOMRect | null }): void;
  /* dev only, Control+D */
  jump(to: string): void;
}
