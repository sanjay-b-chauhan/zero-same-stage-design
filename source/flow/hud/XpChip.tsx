/* The small level chip for the PiP header: badge 18 with its number (b1 is a dark coin and reads as a grey disc that
   small, so it carries the level number the way the pill's badge does), Level N, the bar. Its badge is where the coin lands inside the
   PiP window ([data-xp-target]). It counts and bumps with the HUD. */
import { useEffect, useRef } from 'react';
import { prefersReduced } from '../stage/parts/util';
import { Bar, Badge, Roll, useReadout } from './parts';
import { intoLevel, levelOf, useXp } from './xp';
import './hud.css';

export default function XpChip() {
  const shown = useXp((s) => s.shown);
  const total = useXp((s) => s.total);
  const gain = useXp((s) => s.gain);
  const L = levelOf(shown);
  const xp = useReadout(gain);
  const badge = useRef<HTMLSpanElement>(null);
  const last = useRef(gain);

  useEffect(() => {
    const el = badge.current;
    if (gain > last.current && el && !prefersReduced(el)) {
      el.animate(
        [{ transform: 'none' }, { transform: 'scale(1.25) rotate(-8deg)', offset: 0.3 }, { transform: 'none' }],
        { duration: 620, easing: 'cubic-bezier(.2,0,0,1)' }
      );
    }
    last.current = gain;
  }, [gain]);

  return (
    <span className="zh-chip" aria-label={`Level ${L}`}>
      <span ref={badge} className="zh-bdgw" data-xp-target="">
        <Badge level={L} size={18} />
      </span>
      <span className="zh-tx">
        <Roll level={L} shown={shown} total={total} xp={xp} />
        <Bar p={intoLevel(shown)} />
      </span>
    </span>
  );
}
