/* What the deck shows at any time of the kickoff: the last set_panel and every show so far. Pure, so a seek back is right by construction. */
import type { Run } from '../run';

export interface DeckState {
  panel: string;
  shown: Set<string>;
}

export function deckAt(run: Run, segIndex: number, t: number): DeckState {
  const shown = new Set<string>();
  let panel = run.segments[0]?.cues.find((c) => c.action === 'set_panel')?.args.id ?? '';
  run.segments.slice(0, segIndex + 1).forEach((seg, i) => {
    seg.cues.forEach((c) => {
      if (i === segIndex && c.time_sec > t) return;
      if (c.action === 'set_panel') panel = c.args.id;
      else if (c.action === 'show') shown.add(c.args.id);
    });
  });
  return { panel, shown };
}
