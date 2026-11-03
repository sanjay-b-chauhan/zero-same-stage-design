/* The honest wait while she reads what you handed in. The engine names the steps with the real numbers and says when it began,
   so a remount or a switch to the PIP picks up where it is and never replays. Built on the kit's loader classes. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clock } from '../../clock';
import { useFlow } from '../../engine/store';
import { rise } from './util';

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

const Pixels = () => (
  <span className="z4-px" aria-hidden>
    {Array.from({ length: 9 }, (_, i) => (
      <i key={i} />
    ))}
  </span>
);

export default function WaitSteps() {
  const wait = useFlow((s) => s.stage?.wait);
  const [now, setNow] = useState(() => Date.now());
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = clock.setInterval(() => setNow(Date.now()), 100);
    return () => clock.clearInterval(id);
  }, []);

  useLayoutEffect(() => {
    if (wait && Date.now() - wait.at < 300) rise(el.current, { y: 8, blur: 4, ms: 420 });
  }, [wait]);

  if (!wait) return null;
  const spent = now - wait.at;
  let acc = 0;
  const rows = wait.steps.map((s) => {
    const start = acc;
    acc += s.ms;
    return { ...s, start, end: acc };
  });
  const at = rows.findIndex((r) => spent < r.end);
  const shown = at < 0 ? rows : rows.slice(0, at + 1);

  return (
    <div ref={el} className="zs2-row zs2-waiting">
      <ol className="z4-steps" role="status">
        {shown.map((r, i) => {
          const done = at < 0 || i < at;
          return (
            <li key={r.label} className="z4-step" data-done={done || undefined}>
              {done ? <span className="z4-step-dot" aria-hidden /> : <Pixels />}
              <span className="z4-load-label">{r.label}</span>
              {r.detail && <span className="z4-load-detail">{r.detail}</span>}
              <span className="z4-step-time">{seconds(done ? r.ms : Math.max(0, spent - r.start))}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
