/* The world map card's path: coming back, it reads where you are on it */
import type { StageMeta } from '../types';

export interface Progress {
  index: number; /* the stage you are on, 0 based; the count once every stage is done */
  n: number;
  current: StageMeta | null;
}

export const progressOf = (stages: StageMeta[], done: string[]): Progress => {
  const i = stages.findIndex((s) => !done.includes(s.id));
  return { index: i < 0 ? stages.length : i, n: stages.length, current: i < 0 ? null : stages[i] };
};
