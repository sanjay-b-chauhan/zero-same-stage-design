/* The micro-scenario card. It lands in the stage chat as her message: a real moment in two lines, a live slice of the
   real file drawn as the Google Sheet it lives in, and moves. You tap the cell or row you think is wrong, or you do
   something, and the moment plays forward from what you did. A move that goes badly is part of the story.
   The card is a b36 slab. The sheet is a tool, so it stays Google Sheets. CSS and WAAPI motion only, no rAF, so it
   also lives in the Document PiP window. Both surfaces read one move list (store.ts), so they show the same moment. */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Check, Hash } from 'lucide-react';
import { softClick, ting } from '../audio';
import { clock } from '../clock';
import { isTextEntry } from '../stage/parts/util';
import { colLetter, gridCols, isSheetNumber, rowNumbers, sheetTitle } from './layout';
import { glideRows, playMove } from './motion';
import { cellAt, cellKey, play, selected, step, type GameStep, type Played } from './play';
import { pushStep, useGames } from './store';
import type { GameBeat, GameDef, GameResult } from './types';
import './games.css';

const NO_STEPS: GameStep[] = [];
const SOLVED: GameStep[] = [{ k: 'solve' }];
const DONE_AFTER = 480;
const SHEETS_LOGO = 'static/logos/logo-sheets.svg';

/* the newest open card in a document takes the number keys */
const LIVE: Array<{ t: object; doc: Document }> = [];

interface Props {
  game: GameDef;
  onDone(r: GameResult): void;
  dark?: boolean;
  /* msg.game.done: already played, show it solved and still */
  done?: boolean;
  /* the message id, so the same game asked twice starts fresh. Defaults to game.id */
  uid?: string;
}

/* a second line from the same person carries no face or name, like a chat */
const sameAsBefore = (bs: GameBeat[], i: number) =>
  i > 0 && bs[i].who !== 'sheet' && bs[i - 1].who === bs[i].who && bs[i - 1].name === bs[i].name;

function Beat({ b, her, more }: { b: GameBeat; her?: GameDef['her']; more?: boolean }) {
  if (b.who === 'sheet')
    return (
      <div className="gm-beat" data-who="sheet">
        <p>{b.text}</p>
      </div>
    );
  const name = b.who === 'her' ? her?.name : b.name ? `#${b.name}` : undefined;
  return (
    <div className="gm-beat" data-who={b.who} data-more={more || undefined}>
      {more ? (
        <span aria-hidden />
      ) : b.who === 'her' && her?.face ? (
        <span className="gm-av">
          <img src={her.face} alt="" draggable={false} />
        </span>
      ) : (
        <span className="gm-av gm-av-i" aria-hidden>
          <Hash size={11} strokeWidth={2.25} />
        </span>
      )}
      <p>
        {name && !more ? <span className="gm-who">{name} </span> : null}
        {b.text}
      </p>
    </div>
  );
}

export default function GameCard({ game, onDone, dark, done, uid }: Props) {
  const key = uid ?? game.id;
  const log = useGames((s) => s.logs[key]) ?? NO_STEPS;
  const steps = done && log.length === 0 ? SOLVED : log;
  const p: Played = useMemo(() => play(game, steps), [game, steps]);

  const root = useRef<HTMLDivElement>(null);
  const token = useRef({});
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const pending = useRef<{ id: number; fire: () => void } | null>(null);

  /* a card mounted already played (the PiP opening mid-game, a reload) gets no entrance and replays nothing */
  const fresh = useRef(steps.length === 0 && !done).current;
  const seen = useRef<{ n: number; p: Played }>({ n: steps.length, p });
  const tops = useRef(new Map<string, number>());

  const act = (st: GameStep) => {
    if (done) return;
    const cur = play(game, useGames.getState().logs[key] ?? NO_STEPS);
    if (cur.found) return;
    const next = step(game, cur, st);
    if (next === cur) return;
    softClick();
    pushStep(key, st);
    if (!next.found) return;
    ting();
    const result = { right: next.mine, tries: next.moves, answer: game.answer };
    const fire = () => {
      if (!pending.current) return;
      clock.clearTimeout(pending.current.id);
      pending.current = null;
      const el = root.current;
      onDoneRef.current({ ...result, rect: el && el.isConnected ? el.getBoundingClientRect() : null });
    };
    /* the tick lands first, then the slot fills and the XP leaves from here */
    pending.current = { id: clock.setTimeout(fire, DONE_AFTER), fire };
  };
  const actRef = useRef(act);
  actRef.current = act;

  /* a closed PiP window takes its timers with it, and so does unmounting: report now rather than never */
  useEffect(() => {
    const off = clock.onSwitch(() => pending.current?.fire());
    return () => {
      off();
      pending.current?.fire();
    };
  }, []);

  /* number keys run the moves, on the newest open card, unless you are typing */
  const open = !p.found && !done;
  const used = p.used.join('|');
  useEffect(() => {
    const el = root.current;
    if (!el || !open) return;
    const doc = el.ownerDocument;
    const me = { t: token.current, doc };
    LIVE.push(me);
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.defaultPrevented) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > game.choices.length) return;
      const t = e.target as HTMLElement | null;
      if (isTextEntry(t)) {
        const v = (t as HTMLInputElement).value ?? t?.textContent ?? '';
        if (String(v).trim()) return;
      }
      const mine = LIVE.filter((x) => x.doc === doc);
      if (mine[mine.length - 1]?.t !== token.current) return;
      const c = game.choices[n - 1];
      if (!c || used.split('|').includes(c.id)) return;
      e.preventDefault();
      actRef.current({ k: 'c', id: c.id });
    };
    doc.addEventListener('keydown', onKey);
    return () => {
      doc.removeEventListener('keydown', onKey);
      const i = LIVE.indexOf(me);
      if (i >= 0) LIVE.splice(i, 1);
    };
  }, [open, used, game]);

  /* each move plays out on the card: rows glide, values swap, the lines it set off arrive one by one */
  useLayoutEffect(() => {
    const el = root.current;
    const was = seen.current;
    const moved = steps.length > was.n;
    tops.current = glideRows(el, moved ? tops.current : new Map());
    if (moved) playMove(el, was.p, p);
    seen.current = { n: steps.length, p };
  }, [steps.length, p]);

  const v = p.view;
  const cols = useMemo(() => gridCols(v.cols, v.rows), [v]);
  const letters = v.cols.map((_, i) => v.letters?.[i] ?? colLetter(i));
  const rowNum = rowNumbers(v.rowNums, p.order);
  const sel = selected(p);
  const selName = `${letters[sel.col] ?? 'A'}${sel.row < 0 ? 1 : rowNum(sel.row)}`;
  const selValue = sel.row < 0 ? (v.cols[sel.col] ?? '') : cellAt(p, sel.row, sel.col);
  const her = p.focus && p.focus.row !== undefined ? cellKey(p.focus.row, p.focus.col ?? 0) : '';
  const beats = p.story?.beats ?? [];

  return (
    <div
      ref={root}
      className={dark ? 'gm zd' : 'gm'}
      role="group"
      aria-label={game.label ?? 'Play it out'}
      data-fresh={fresh || undefined}
      data-found={p.found || undefined}
    >
      <div className="gm-scene">
        {game.scene.map((line, i) => (
          <p key={i} className="gm-in" style={{ ['--d' as string]: i }}>
            {line}
          </p>
        ))}
      </div>

      {v.cols.length > 0 && (
        <div className="gm-gs gm-in" style={{ ['--d' as string]: 2, ['--gm-cols' as string]: cols }}>
          <div className="gm-gs-top">
            <img src={SHEETS_LOGO} alt="" width={16} height={16} draggable={false} />
            <span>{sheetTitle(v.file)}</span>
          </div>
          <div className="gm-gs-fx" aria-hidden>
            <span className="gm-gs-name">{selName}</span>
            <span className="gm-gs-f">fx</span>
            <span className="gm-gs-fv">{selValue}</span>
          </div>
          <div className="gm-gs-grid" role="table" aria-label="Rows from the file">
            <div key={`l${p.viewN}`} className="gm-tr gm-gs-letters" aria-hidden>
              <span />
              {letters.map((l, ci) => (
                <span key={ci} data-on={ci === sel.col || undefined}>
                  {l}
                </span>
              ))}
            </div>
            <div key={`h${p.viewN}`} className="gm-tr gm-th" role="row">
              <span className="gm-n" role="rowheader" data-on={sel.row < 0 || undefined}>
                1
              </span>
              {v.cols.map((c, ci) => (
                <span key={c} role="columnheader" className="gm-hd" data-sel={(sel.row < 0 && sel.col === ci) || undefined}>
                  {c}
                </span>
              ))}
            </div>
            {p.order.map((r) => (
              <div
                key={`${p.viewN}:${r}`}
                data-k={`${p.viewN}:${r}`}
                className="gm-tr gm-row"
                role="row"
                data-dim={p.dim.includes(r) || undefined}
              >
                <span className="gm-n" role="rowheader" data-on={sel.row === r || undefined}>
                  {rowNum(r)}
                </span>
                {v.cols.map((c, ci) => {
                  const ck = cellKey(r, ci);
                  const val = cellAt(p, r, ci);
                  return (
                    <span key={ci} role="cell" className="gm-td">
                      <button
                        type="button"
                        className="gm-c"
                        data-ck={ck}
                        disabled={!open}
                        aria-label={`${letters[ci]}${rowNum(r)}, ${c}, ${val || 'blank'}`}
                        data-sel={(sel.row === r && sel.col === ci) || undefined}
                        data-mark={p.marks.includes(ck) || undefined}
                        data-her={ck === her || undefined}
                        data-num={isSheetNumber(val) || undefined}
                        onClick={() => act({ k: 't', row: r, col: ci })}
                      >
                        <span className="gm-v">{val}</span>
                        {ck === her && game.her ? <span className="gm-flag">{game.her.name}</span> : null}
                      </button>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {v.total && (
        <div className="gm-total gm-in" style={{ ['--d' as string]: 3 }}>
          <span>{v.total.label}</span>
          <span className="gm-tv">{p.total}</span>
        </div>
      )}

      <div className="gm-story" aria-live="polite" data-empty={beats.length === 0 || undefined}>
        {beats.map((b, i) => (
          <Beat key={`${p.story?.n}:${i}`} b={b} her={game.her} more={sameAsBefore(beats, i)} />
        ))}
      </div>

      {p.found || done ? (
        <div className="gm-done">
          <span className="gm-tick" aria-hidden>
            <Check size={12} strokeWidth={3} />
          </span>
          <span>{game.label ?? game.answer}</span>
        </div>
      ) : (
        <div className="gm-act gm-in" style={{ ['--d' as string]: 4 }}>
          <p className="gm-ask">{game.ask}</p>
          <div className="gm-moves">
            {game.choices.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className="gm-move"
                disabled={p.used.includes(c.id)}
                data-her={p.focus?.choice === c.id || undefined}
                aria-keyshortcuts={String(i + 1)}
                onClick={() => act({ k: 'c', id: c.id })}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
