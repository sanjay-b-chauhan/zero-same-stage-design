/* b36's "Here's the wrap", over the film while she closes the meeting: a row lands on each beat of her last chapter.
   It holds, every row in, while the film grows into the plan. */
import { useEffect, useMemo, useRef } from 'react';
import { useFlow } from '../engine/store';
import type { ProjectId } from '../types';
import { kick, useKick } from './kickoff';
import { wrapRows, wrapTimes } from './wrapRows';

export default function Wrap({ pid, all }: { pid: ProjectId; all: boolean }) {
  const meta = useFlow((s) => s.project);
  const rows = useMemo(() => wrapRows(pid, kick.run(), meta), [pid, meta]);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const last = kick.run().segments.length - 1;
    const times = wrapTimes(kick.run().segments[last].audio_duration_sec);
    const paint = () => {
      const { seg, t, phase } = useKick.getState();
      host.current?.querySelectorAll<HTMLElement>('.rm-wr1').forEach((el, i) => {
        const on = all || phase === 'done' || (seg === last && t >= times[i]);
        el.dataset.in = on ? '1' : '0';
      });
    };
    paint();
    return useKick.subscribe(paint);
  }, [all]);

  return (
    <div ref={host} className="rm-wrap zd">
      <h2>Here's the wrap</h2>
      <div className="rm-wrr">
        {rows.map(([label, value]) => (
          <div key={label} className="rm-wr1" data-in="0">
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
