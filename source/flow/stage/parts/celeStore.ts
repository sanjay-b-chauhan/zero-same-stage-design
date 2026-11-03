/* The end of a stage, on the stage. The engine says when it starts, what she says and when it leaves;
   the stage draws it and closes itself into the tick on the way back to the objective. */
import { create } from 'zustand';
import type { TurnNext } from './turnStore';

export interface Cele {
  on: boolean;
  leaving: boolean;
  n: number; /* the stage number, 1 based */
  total: number;
  file: string; /* what you handed in */
  xp: number;
  line: string; /* hers, shown once she has said it */
  next: TurnNext | null; /* the stage after this one; with one, Continue goes up into the turn instead of the objective */
  say: string[]; /* her words on the turn */
}

const OFF: Cele = { on: false, leaving: false, n: 0, total: 0, file: '', xp: 0, line: '', next: null, say: [] };

export const useCele = create<Cele>(() => OFF);

export const showCele = (c: Omit<Cele, 'on' | 'leaving' | 'line'>) => useCele.setState({ ...c, on: true, leaving: false, line: '' });
export const celeLine = (line: string) => useCele.setState({ line });
export const leaveCele = () => useCele.setState({ leaving: true });
export const endCele = () => useCele.setState(OFF);
