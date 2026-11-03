/* The stage clock. Starts the moment the screen lands: the digits rise in, then it runs. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clock } from '../../clock';
import { useFlow } from '../../engine/store';
import type { Surface } from '../../types';
import { useDraft } from './draft';
import { mss, rise, prefersReduced } from './util';

const LANDING_MS = 1600;

function Digit({ c, index, landing }: { c: string; index: number; landing: boolean }) {
  const el = useRef<HTMLSpanElement>(null);
  const prev = useRef(c);
  useLayoutEffect(() => {
    if (landing) {
      rise(el.current, { y: 14, blur: 8, delay: 180 + index * 55 });
      return;
    }
  }, [landing, index]);
  useLayoutEffect(() => {
    if (prev.current === c) return;
    prev.current = c;
    const d = el.current;
    if (!d || prefersReduced(d)) return;
    d.animate(
      [
        { transform: 'translateY(5px)', filter: 'blur(2px)' },
        { transform: 'translateY(0)', filter: 'blur(0px)' },
      ],
      { duration: 280, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );
  }, [c]);
  return (
    <span ref={el} className="zs2-digit">
      {c}
    </span>
  );
}

export default function Timer({ surface }: { surface: Surface }) {
  const stageId = useFlow((s) => s.stage?.stageId ?? '');
  const startedAt = useFlow((s) => s.stage?.startedAt ?? 0);
  const stageMs = useFlow((s) => s.stage?.stageMs ?? 0);
  const phase = useFlow((s) => s.stage?.phase ?? 'work');
  const frozen = useDraft((s) => s.frozen[stageId]);
  const [now, setNow] = useState(() => Date.now());
  const [landing] = useState(() => surface === 'big' && Date.now() - startedAt < LANDING_MS);

  useEffect(() => {
    if (phase === 'done') return;
    const id = clock.setInterval(() => setNow(Date.now()), 200);
    return () => clock.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === 'done' && frozen === undefined && startedAt) {
      useDraft.getState().patch('frozen', stageId, stageMs - (Date.now() - startedAt));
    }
  }, [phase, frozen, stageId, stageMs, startedAt]);

  if (!startedAt || !stageMs) return null;
  const left = frozen ?? stageMs - (now - startedAt);
  const over = left < 0;
  /* a whole second is showing until it has fully passed, so it reads 25:00 when it lands */
  const shown = over ? `+${mss(-left)}` : mss(left + 999);
  const low = !over && left / stageMs < 0.2;
  const chars = shown.split('');

  return (
    <span className="zs2-timer z-num" data-surface={surface} data-low={low || over || undefined} role="timer">
      {chars.map((c, i) => (
        <Digit key={chars.length - i} c={c} index={i} landing={landing} />
      ))}
    </span>
  );
}
