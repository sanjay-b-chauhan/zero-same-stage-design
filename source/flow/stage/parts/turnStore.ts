/* The turn between two stages (founder call, 2 Nov): the stage goes up, the screen is only her, her words arriving the way
   the tutorial opens, then the next stage or later. The stage starts it; FlowRoot draws it so it outlives the stage. */
import { create } from 'zustand';

export interface TurnNext {
  id: string;
  n: number; /* 1 based */
}

export interface Turn {
  on: boolean;
  lines: string[];
  next: TurnNext | null;
}

const OFF: Turn = { on: false, lines: [], next: null };

export const useTurn = create<Turn>(() => OFF);

export const showTurn = (lines: string[], next: TurnNext) => useTurn.setState({ on: true, lines, next });
export const endTurn = () => useTurn.setState(OFF);
