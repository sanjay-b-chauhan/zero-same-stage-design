/* A micro-scenario: a real moment at work, a live slice of the file, and moves the learner makes on it.
   b4 (his note, 2 Nov 2026): experiential, never a quiz. You tap the row or cell you think is wrong, or you do something
   (a verb), and the moment plays forward from what you did, with real numbers. A move that goes badly is part of the story.
   Every field added for that is optional, so the first shape (ask, choices, answer) still reads. */

/* who speaks in the little scene a move plays out: her, a team channel replying, or the sheet itself */
export type GameWho = 'her' | 'team' | 'sheet';

export interface GameBeat {
  who: GameWho;
  name?: string; /* the team channel, like finance. Her name comes from GameDef.her */
  text: string;
}

/* [row index in the slice, col index, new value] */
export type GameSet = [number, number, string];

/* What a move does to the slice and what plays out after it. Rows are always the slice's own row indexes,
   so a sort never changes what a tap means. */
export interface GameMove {
  beats?: GameBeat[];
  neutral?: boolean; /* neither finds it nor goes badly: a sort, a count, asking her */
  set?: GameSet[]; /* cells this move changes, they get the quiet outline */
  sort?: number[]; /* the new row order, by row index */
  dim?: number[]; /* rows that leave the slice (shown faint). Replaces the set before it, [] brings them back */
  mark?: Array<[number, number]>; /* cells to outline */
  total?: string; /* the slice total after this move */
  view?: GameExcerpt; /* replaces the slice: a pivot, a new column */
}

export interface GameChoice extends GameMove {
  id: string;
  label: string; /* a verb: "Send it to finance as is", "Sort by customer_id", "Ask Eryn" */
  right: boolean; /* this move finds it */
  then: string; /* what happens if you go with it, one line, the sheet's voice. Empty when only the beats speak */
}

/* a tap on the slice: a cell, or a whole row when col is left out */
export interface GameTap extends GameMove {
  row: number;
  col?: number;
  right: boolean;
  then: string;
}

export interface GameExcerpt {
  cols: string[];
  rows: string[][];
  rowNums?: number[]; /* sheet row numbers, header is row 1 */
  mark?: Array<[number, number]>; /* [row index in rows, col index] the cell that matters */
  total?: { label: string; value: string }; /* one live line under the slice: SUM, Average, Rows */
  tap?: GameTap[]; /* what tapping a cell or row does here */
  miss?: GameMove & { then: string }; /* any other tap */
  letters?: string[]; /* the sheet's column letters for cols, A when the slice starts at the first column */
  file?: string; /* the sheet's name in its title bar */
}

export interface GameFocus {
  row?: number;
  col?: number;
  choice?: string;
}

export interface GameDef {
  id: string;
  scene: string[]; /* two short lines: who, when, what is at stake */
  show?: GameExcerpt;
  ask: string; /* what to do now, one short line */
  choices: GameChoice[]; /* the moves, verbs. Keys 1, 2, 3 */
  answer: string; /* her one line once you get it, also the slot's value */
  label?: string; /* what was found, beside the tick: the slot's name */
  her?: { name: string; face: string };
  /* after two moves that go badly she plays the right move with you: her line, the slice nudged, the place to look */
  help?: GameMove & { then: string; focus?: GameFocus };
  solve?: string; /* the right move, 'c:<choice id>', 't:<row>' or 't:<row>:<col>'. She plays it if a third move goes badly */
}

export interface GameResult {
  right: boolean; /* found by the learner's own move, not played by her */
  tries: number; /* moves made, taps and actions */
  answer: string;
  rect: DOMRect | null;
}
