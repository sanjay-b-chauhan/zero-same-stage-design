/* The end of a stage, on the stage. The work steps back, one card holds the tick as it draws, what you handed in,
   the XP in green and her line, then Continue. With a stage after this one (founder call, 2 Nov) Continue sends the whole
   stage up and the turn is under it: only her, then the next stage. After the last stage the stage closes into the tick
   and the objective is under it. */
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useFlow } from '../../engine/store';
import { softClick, stopVoice } from '../../audio';
import { useDevAction } from '../../dev/store';
import { endCele, leaveCele, useCele } from './celeStore';
import Face from './Face';
import { closeStage, liftStage } from './handOff';
import { showTurn } from './turnStore';
import { land, rise } from './util';

const two = (n: number) => String(n).padStart(2, '0');

export default function Celebrate({ root }: { root: RefObject<HTMLDivElement | null> }) {
  const c = useCele();
  const card = useRef<HTMLDivElement>(null);
  const tick = useRef<HTMLSpanElement>(null);
  const said = useRef<HTMLParagraphElement>(null);
  const go = useRef<HTMLButtonElement>(null);
  const going = useRef(false);

  useLayoutEffect(() => {
    if (!c.on || !card.current) return;
    rise(card.current, { y: 16, scale: 0.96, blur: 8, ms: 620 });
    card.current.querySelectorAll('[data-in]').forEach((el, i) => rise(el, { y: 10, blur: 6, delay: 220 + i * 110, ms: 560 }));
  }, [c.on]);

  useLayoutEffect(() => {
    if (!c.line) return;
    rise(said.current, { y: 8, blur: 6, ms: 520 });
    rise(go.current, { y: 10, blur: 4, delay: 160, ms: 560 });
  }, [c.line]);

  /* the tick lands on the firm spring as the card arrives */
  useLayoutEffect(() => {
    if (c.on) land(tick.current, 0.4, 80, 3);
  }, [c.on]);

  useEffect(() => {
    if (!c.on || !c.leaving || going.current) return;
    going.current = true;
    const { next, say } = c;
    const away = next
      ? liftStage(root.current, () => showTurn(say, next))
      : closeStage(root.current, tick.current, () => useFlow.getState().actions.goto('objective'));
    void away.finally(() => {
      going.current = false;
      endCele();
    });
  }, [c.on, c.leaving, c.next, c.say, root]);

  useEffect(() => endCele, []);

  const press = () => {
    softClick();
    stopVoice();
    leaveCele();
  };
  useDevAction('cele-go', 'Continue', press, c.on && !!c.line && !c.leaving);

  if (!c.on) return null;
  return (
    <div className="zs2-cele" role="status" aria-live="polite">
      <div ref={card} className="zs2-cele-card">
        <span ref={tick} className="zs2-cele-tick" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M6 12.6l3.9 3.9L18 8.4" pathLength={1} />
          </svg>
        </span>
        <h2 data-in>Stage {two(c.n)} done</h2>
        <p data-in className="zs2-cele-file">
          {c.file}
        </p>
        <span data-in className="zs2-cele-xp z-num">
          +{c.xp} XP
        </span>
        <p ref={said} className="zs2-cele-said" data-shown={c.line ? '' : undefined}>
          <Face size={24} />
          <span>{c.line || ' '}</span>
        </p>
        <button
          ref={go}
          type="button"
          className="zk3 zs2-cele-go"
          data-tone="go"
          data-shown={c.line ? '' : undefined}
          disabled={!c.line || c.leaving}
          onClick={press}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
