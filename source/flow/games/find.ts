/* Look a card up by its id (msg.game.id), across stage 1 and stage 2. */
import type { ProjectId } from '../types';
import { GAMES } from './stage1';
import { STAGE2 } from './stage2';
import type { GameDef } from './types';

export function allGames(): GameDef[] {
  const out: GameDef[] = [];
  (Object.keys(GAMES) as ProjectId[]).forEach((p) => {
    out.push(...Object.values(GAMES[p] ?? {}));
    out.push(...(STAGE2[p]?.slots.map((s) => s.game) ?? []));
  });
  return out;
}

let byId: Map<string, GameDef> | null = null;
export function gameById(id: string | undefined | null): GameDef | null {
  if (!id) return null;
  if (!byId) byId = new Map(allGames().map((g) => [g.id, g]));
  return byId.get(id) ?? null;
}
