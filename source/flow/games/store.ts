/* Every card's moves, by card. One list, so a card open on the big screen and in the PiP at once shows one moment. */
import { create } from 'zustand';
import type { GameStep } from './play';

interface GamesState {
  logs: Record<string, GameStep[]>;
}

export const useGames = create<GamesState>(() => ({ logs: {} }));

export const pushStep = (uid: string, st: GameStep) =>
  useGames.setState((s) => ({ logs: { ...s.logs, [uid]: [...(s.logs[uid] ?? []), st] } }));

/* a dev jump or a replay starts a card fresh. No id clears them all */
export const resetGames = (uid?: string) =>
  useGames.setState((s) => {
    if (!uid) return { logs: {} };
    const next = { ...s.logs };
    delete next[uid];
    return { logs: next };
  });
