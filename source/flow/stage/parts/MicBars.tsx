/* My voice as it arrives: a scrolling row of bars, shift left, newest on the right, like the real RealTimeWaveform.
   Direct writes on the clock, nothing re-renders. */
import { useEffect, useRef } from 'react';
import { clock } from '../../clock';
import { useFlow } from '../../engine/store';

export default function MicBars({ bars = 40 }: { bars?: number }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const wf = new Array<number>(bars).fill(0.08);
    const id = clock.setInterval(() => {
      const el = box.current;
      if (!el) return;
      wf.shift();
      const level = useFlow.getState().ui.micLevel;
      wf.push(Math.max(0.08, Math.min(1, level + (Math.random() - 0.5) * 0.06)));
      const kids = el.children;
      for (let i = 0; i < kids.length; i++) (kids[i] as HTMLElement).style.transform = `scaleY(${wf[i]})`;
    }, 60);
    return () => clock.clearInterval(id);
  }, [bars]);
  return (
    <div ref={box} className="zs2-micbars" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className="zs2-micbar" />
      ))}
    </div>
  );
}
