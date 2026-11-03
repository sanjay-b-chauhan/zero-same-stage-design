/* The turn between two stages, from the founder call (2 Nov). The stage has gone up; the screen is only her. Her face, then
   her words one line at a time in the tutorial's own spoken line (NewFtuxFlow's SpokenLine: each word rises out of a blur),
   on the tutorial's dark page. Then Start the next stage, or come back later. Either way this sheet goes up the same way the
   stage did, and what is under it is already there. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SpokenLine } from '@/renderer/windows/newMainUI/components/NewFtuxFlow/open/SpokenLine';
import '@/renderer/windows/newMainUI/components/NewFtuxFlow/styles/tokens.css';
import '@/renderer/windows/newMainUI/components/NewFtuxFlow/styles/open.css';
import { useFlow } from '../../engine/store';
import { softClick } from '../../audio';
import { clock } from '../../clock';
import { useDevAction } from '../../dev/store';
import { energize } from './energy';
import Face from './Face';
import { liftAway } from './handOff';
import { JobHookStrip } from './JobHook';
import { endTurn, useTurn } from './turnStore';
import { rise } from './util';
import './turn.css';

const FIRST_MS = 520;
/* a line holds long enough to read it, the way the tutorial's openScript holds its own */
const holdOf = (s: string) => 1500 + s.split(' ').length * 240;

export default function StageTurn() {
  const t = useTurn();
  const sheet = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLDivElement>(null);
  const keys = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(-1);
  const [ready, setReady] = useState(false);
  const leaving = useRef(false);

  useLayoutEffect(() => {
    if (!t.on) return;
    leaving.current = false;
    setAt(-1);
    setReady(false);
    rise(face.current, { y: 18, scale: 0.9, blur: 10, delay: 160, ms: 680 });
  }, [t.on]);

  /* b15: her words take the green as they arrive. The tutorial's line is the real component and stays untouched; its new
     words are caught as they land and ride its own 38 ms stagger */
  useEffect(() => {
    const el = sheet.current;
    if (!t.on || !el) return;
    const mo = new MutationObserver((recs) => {
      const fresh: Element[] = [];
      recs.forEach((r) =>
        r.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches('.nftux-w')) fresh.push(n);
          else fresh.push(...n.querySelectorAll('.nftux-w'));
        })
      );
      energize(fresh);
    });
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [t.on]);

  /* her lines, one after the other, then the keys */
  useEffect(() => {
    if (!t.on) return;
    let i = -1;
    let stop = false;
    const step = async () => {
      await clock.wait(FIRST_MS);
      for (i = 0; i < t.lines.length && !stop; i++) {
        setAt(i);
        await clock.wait(holdOf(t.lines[i]));
      }
      if (!stop) setReady(true);
    };
    void step();
    return () => {
      stop = true;
    };
  }, [t.on, t.lines]);

  useLayoutEffect(() => {
    if (!ready || !keys.current) return;
    keys.current.querySelectorAll('[data-k]').forEach((el, i) => rise(el, { y: 12, blur: 6, delay: i * 110, ms: 560 }));
  }, [ready]);

  const go = async (where: 'next' | 'later') => {
    if (leaving.current || !t.next) return;
    leaving.current = true;
    softClick();
    const a = useFlow.getState().actions;
    if (where === 'next') a.startStage(t.next.id);
    else a.goto('objective');
    await liftAway(sheet.current);
    endTurn();
  };

  const run = useRef(go);
  run.current = go;
  useDevAction(
    'turn-go',
    ready ? `Start stage ${t.next?.n ?? ''}` : 'Skip her lines',
    () => {
      if (ready) return void run.current('next');
      setAt(t.lines.length - 1);
      setReady(true);
    },
    t.on
  );

  if (!t.on || !t.next) return null;
  const line = at >= 0 ? t.lines[at] : '';
  return (
    <div ref={sheet} className="nftux dark zt" role="dialog" aria-label={`Stage ${t.next.n}`}>
      <div className="zt-col">
        <div ref={face} className="zt-face">
          <Face size={72} live={false} />
        </div>
        <div className="zt-line" aria-live="polite">
          {line ? <SpokenLine text={line} wide /> : null}
        </div>
        <div ref={keys} className="zt-keys" data-shown={ready ? '' : undefined}>
          <div data-k className="zt-hook">
            <JobHookStrip />
          </div>
          <button data-k type="button" className="zk3" data-tone="light" disabled={!ready} autoFocus onClick={() => void go('next')}>
            Start stage {t.next.n}
          </button>
          <button data-k type="button" className="zt-later" disabled={!ready} onClick={() => void go('later')}>
            Come back later
          </button>
        </div>
      </div>
    </div>
  );
}
