/* Her lines for the breakdown, each with its take when one exists. No take means silent timing, never a hang. */
import { BREAKDOWN } from '../../content/lines';
import { takeFor } from '../../content/takes';
import type { ProjectId } from '../types';

export interface BeatLine {
  text: string;
  stop?: number;
  url?: string;
  dur?: number;
}

export const breakdownScript = (id: ProjectId): BeatLine[] =>
  BREAKDOWN[id].map((line) => {
    const take = takeFor(line.text);
    return { text: line.text, stop: line.stop, url: take?.url, dur: take?.dur };
  });
