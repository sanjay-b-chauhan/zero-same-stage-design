/* ?gamelab: every card on its own, in a dark chat column like the stage's, with a picker.
   ?gamelab&g=spotify:dups opens one card. window.__games drives it from a script. */
import { useEffect, useMemo, useState } from 'react';
import GameCard from './GameCard';
import { allGames, gameById } from './find';
import { STAGE2 } from './stage2';
import { resetGames } from './store';
import type { GameResult } from './types';
import './lab.css';

interface Rails {
  ids: string[];
  pick(id: string): void;
  reset(): void;
  tap(row: number, col: number): boolean;
  move(n: number): boolean;
  result: GameResult | null;
}
type LabWindow = Window & { __games?: Rails; ZT?: Record<string, unknown> };

const STAGE2_IDS = new Set((STAGE2.spotify?.slots ?? []).map((s) => s.game.id));

export default function GameLab() {
  const games = useMemo(allGames, []);
  const q = new URLSearchParams(location.search);
  const [id, setId] = useState(() => gameById(q.get('g'))?.id ?? games[0]?.id ?? '');
  const [n, setN] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const game = gameById(id);
  const uid = `lab:${id}:${n}`;

  const restart = () => {
    resetGames(uid);
    setResult(null);
    setN((x) => x + 1);
  };

  useEffect(() => {
    const click = (el: Element | null) => {
      if (!(el instanceof HTMLButtonElement) || el.disabled) return false;
      el.click();
      return true;
    };
    const w = window as LabWindow;
    w.__games = {
      ids: games.map((g) => g.id),
      pick: (next) => {
        setId(next);
        setResult(null);
        setN((x) => x + 1);
      },
      reset: restart,
      tap: (row, col) => click(document.querySelector(`.gm [data-ck="${row}:${col}"]`)),
      move: (i) => click(document.querySelectorAll('.gm .gm-move')[i - 1] ?? null),
      result,
    };
    w.ZT = { ...(w.ZT ?? {}), ready: true };
  });

  const s2 = game ? STAGE2_IDS.has(game.id) : false;
  const opener = s2 && game?.id === STAGE2.spotify?.slots[0]?.game.id ? STAGE2.spotify?.opener ?? [] : [];

  return (
    <div className="zj zd gml">
      <div className="gml-dev">
        <select
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setResult(null);
            setN((x) => x + 1);
          }}
          aria-label="Card"
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.id.replace('spotify:', '')}
              {g.label ? `, ${g.label}` : ''}
            </option>
          ))}
        </select>
        <button type="button" className="zj-sec zj-sm" onClick={restart}>
          Again
        </button>
      </div>

      <div className="gml-col">
        {opener.map((line, i) => (
          <p key={i} className="gml-her">
            {line}
          </p>
        ))}
        {!s2 && <p className="gml-me">I don't know.</p>}
        {game ? (
          <GameCard key={uid} uid={uid} game={game} dark onDone={setResult} />
        ) : (
          <p className="gml-note">No card with that id.</p>
        )}
        {result && (
          <p className="gml-note">
            onDone: right {String(result.right)}, tries {result.tries}
            {result.rect ? `, rect ${Math.round(result.rect.width)} by ${Math.round(result.rect.height)}` : ', no rect'}
          </p>
        )}
      </div>
    </div>
  );
}
