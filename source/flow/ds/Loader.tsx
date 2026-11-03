/* The one loading system. It names the real work: the words and numbers come from the real data, the time is what really passed.
   Never a face, never a pulsing ring, never a looping fake. No loader for a wait under 2 s.
   CSS only, no parent rAF, so the same parts run inside the PiP window. */
import { useEffect, useRef, useState } from 'react';

import { clock } from '../clock';

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

/* beautifului's Loading State: a 3 x 3 grid of squares lighting in a wave */
const Pixels = () => (
  <span className="z4-px" aria-hidden>
    {Array.from({ length: 9 }, (_, i) => (
      <i key={i} />
    ))}
  </span>
);

/* the time that really passed, from the moment it began */
function Running() {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const began = Date.now();
    const id = clock.setInterval(() => setMs(Date.now() - began), 100);
    return () => clock.clearInterval(id);
  }, []);
  return <span className="z4-load-detail">{seconds(ms)}</span>;
}

/* One line: the activity shimmers, the number sits beside it, the time runs. */
export function Loader({ label, detail }: { label: string; detail?: string }) {
  return (
    <span className="z4-load" role="status">
      <Pixels />
      <span className="z4-load-label">{label}</span>
      {detail && <span className="z4-load-detail">{detail}</span>}
      <Running />
    </span>
  );
}

export interface LoadStep {
  label: string;
  detail?: string;
  ms: number;
}

/* Real steps in order. The one running shimmers. A finished one stays, with its time. */
export function LoadSteps({ steps, onDone }: { steps: LoadStep[]; onDone?: () => void }) {
  const [at, setAt] = useState(0);
  const [took, setTook] = useState<number[]>([]);
  const finish = useRef(onDone);
  finish.current = onDone;
  const count = steps.length;
  const ms = steps[at]?.ms;

  useEffect(() => {
    if (at >= count) {
      finish.current?.();
      return;
    }
    let live = true;
    const began = Date.now();
    clock.setTimeout(() => {
      if (!live) return;
      setTook((t) => [...t, Date.now() - began]);
      setAt((i) => i + 1);
    }, ms ?? 0);
    return () => {
      live = false;
    };
  }, [at, count, ms]);

  return (
    <ol className="z4-steps" role="status">
      {steps.slice(0, at + 1).map((s, i) => {
        const done = i < at;
        return (
          <li key={s.label} className="z4-step" data-done={done || undefined}>
            {done ? <span className="z4-step-dot" aria-hidden /> : <Pixels />}
            <span className="z4-load-label">{s.label}</span>
            {s.detail && <span className="z4-load-detail">{s.detail}</span>}
            <span className="z4-step-time">{done ? seconds(took[i] ?? s.ms) : <Running />}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* The shape of what is coming, in the place it will land. */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <span className="z4-skel" aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <i key={i} style={{ width: `${88 - ((i * 23) % 40)}%` }} />
      ))}
    </span>
  );
}
