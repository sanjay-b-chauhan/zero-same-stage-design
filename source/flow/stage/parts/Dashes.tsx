/* The whole stage in one line, for the PIP. One dash per slot. Next step is two dots.
   A landing slot, or a hover on a filled dash, shows its label in place of the dashes for 2 s. In the POU the dashes are the lines. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clock } from '../../clock';
import { useFlow } from '../../engine/store';
import { rise } from './util';

const HOLD_MS = 2000;

interface Dash {
  id: string;
  label: string;
  filled: boolean;
  verified?: boolean;
}

export default function Dashes({ thin, onTap }: { thin?: boolean; onTap?: () => void }) {
  const steps = useFlow((s) => s.stage?.steps);
  const lines = useFlow((s) => s.stage?.pou.lines);
  const phase = useFlow((s) => s.stage?.phase ?? 'work');
  const lastSlotId = useFlow((s) => s.stage?.lastSlotId);
  const lastSlotAt = useFlow((s) => s.stage?.lastSlotAt ?? 0);
  const [flash, setFlash] = useState<string | null>(null);
  const timer = useRef(0);
  const lastSeen = useRef(lastSlotAt);
  const word = useRef<HTMLSpanElement>(null);

  const show = (label: string) => {
    setFlash(label);
    clock.clearTimeout(timer.current);
    timer.current = clock.setTimeout(() => setFlash(null), HOLD_MS);
  };

  useEffect(() => () => clock.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!lastSlotAt || lastSlotAt === lastSeen.current) return;
    lastSeen.current = lastSlotAt;
    const label = steps?.flatMap((x) => x.slots).find((x) => x.id === lastSlotId)?.label;
    if (label) show(label);
  }, [lastSlotAt, lastSlotId, steps]);

  useLayoutEffect(() => {
    if (flash) rise(word.current, { y: 6, blur: 5, ms: 480 });
  }, [flash]);

  const pou = phase === 'pou' && !!lines;
  const groups: Array<{ id: string; dashes: Dash[] } | { id: string; dots: true }> = [];
  if (pou) {
    groups.push({
      id: 'pou',
      dashes: lines!.map((l) => ({ id: l.k, label: l.k, filled: l.said })),
    });
  } else {
    let dotted = false;
    for (const step of steps ?? []) {
      /* a step her word has not landed yet is not there at all, and neither is what comes after it */
      if (step.state === 'now' && !step.revealed) break;
      if (step.state === 'next') {
        if (!dotted) groups.push({ id: `${step.id}-dots`, dots: true });
        dotted = true;
        continue;
      }
      groups.push({
        id: step.id,
        dashes: step.slots.map((x) => ({ id: x.id, label: x.label, filled: x.filled, verified: x.verified })),
      });
    }
  }

  return (
    <button type="button" className="zs2-dashes" data-thin={thin || undefined} aria-label="Slots" onClick={onTap}>
      {flash ? (
        <span ref={word} className="zs2-dashes-word">
          {flash}
        </span>
      ) : (
        groups.map((g) =>
          'dots' in g ? (
            <span key={g.id} className="zs2-dashes-dots" aria-hidden>
              <i />
              <i />
            </span>
          ) : (
            g.dashes.map((d, i) => (
              <span
                key={`${g.id}:${i}`}
                className="zs2-dash"
                data-verified={d.verified || undefined}
                data-filled={d.filled || undefined}
                onPointerEnter={() => {
                  if (d.filled) show(d.label);
                }}
              >
                <i />
              </span>
            ))
          )
        )
      )}
    </button>
  );
}
