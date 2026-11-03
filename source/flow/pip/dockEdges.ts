/* Which sides of the floating PiP can be pulled: every side that is not held against the slot it sits in.
   A centred axis is free on both sides. */
import { centredX, centredY, FREE, type Slot } from './dockMotion';

export type Edge = 'n' | 's' | 'e' | 'w';

export const edgesFor = (s: Slot): Edge[] => {
  const free = FREE[s];
  const x: Edge[] = centredX(s) ? ['w', 'e'] : [free.includes('r') ? 'e' : 'w'];
  const y: Edge[] = centredY(s) ? ['n', 's'] : [free.includes('b') ? 's' : 'n'];
  return [...y, ...x];
};
