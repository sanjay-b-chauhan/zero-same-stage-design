/* The coach. Not the manager: he lets you slip twice and comes in on the third, beside the work, never in the chat.
   Gone when you dismiss him or answer again. The height moves too, so what is next to him never jumps. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useFlow } from '../../engine/store';
import type { Surface } from '../../types';
import { glideHeight, prefersReduced, rise, SPRING } from './util';

const LEAVE_MS = 420;

export default function CoachCard({ surface }: { surface: Surface }) {
  const coach = useFlow((s) => s.stage?.coach);
  const dismiss = useFlow((s) => s.actions.dismissCoach);
  const el = useRef<HTMLDivElement>(null);
  /* keeps his words on the card while it leaves */
  const [shown, setShown] = useState(coach);
  if (coach && coach !== shown) setShown(coach);

  /* here when this surface opened: the surface's own entrance is enough */
  const seen = useRef(coach);
  useLayoutEffect(() => {
    if (!coach || coach === seen.current) return;
    seen.current = coach;
    glideHeight(el.current, 0);
    rise(el.current, { y: 10, blur: 6, ms: 560 });
  }, [coach]);

  useEffect(() => {
    if (coach || !shown) return;
    const node = el.current;
    if (!node || prefersReduced(node)) {
      setShown(undefined);
      return;
    }
    const out = node.animate(
      [
        { height: `${node.getBoundingClientRect().height}px` },
        /* the column's gap goes with him */
        { height: '0px', marginTop: '-8px', paddingTop: 0, paddingBottom: 0, borderWidth: 0, transform: 'translateY(6px)', filter: 'blur(6px)', opacity: 0 },
      ],
      { duration: LEAVE_MS, easing: SPRING, fill: 'forwards' }
    );
    out.onfinish = () => setShown(undefined);
    return () => {
      out.onfinish = null;
      out.cancel();
    };
  }, [coach, shown]);

  if (!shown) return null;
  return (
    <div ref={el} className="zs2-coach" data-surface={surface} role="status">
      <div className="zs2-coach-head">
        <span className="zs2-face" style={{ width: 24, height: 24 }}>
          <img className="zs2-face-img" src={shown.face} alt="" draggable={false} />
        </span>
        <span className="zs2-coach-name">{shown.name}, your coach</span>
        <button type="button" className="zs2-ico" aria-label={`Dismiss ${shown.name}`} onClick={dismiss}>
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>
      <p className="zs2-coach-line">{shown.text}</p>
    </div>
  );
}
