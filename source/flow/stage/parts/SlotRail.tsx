/* The slots at their smallest: the same stage as one line. What you hand in on top, every slot a point on one vertical line
   (a tick once it is done, green only when verified, the one you are on lit), the key at the bottom as an icon.
   Each point carries its slot's id, so a fill still rises from it. A click anywhere opens the slots at their own width. */
import { Check, Lock, Upload } from 'lucide-react';
import { useFlow } from '../../engine/store';
import type { Step } from '../../types';
import { fileIcon } from './util';

const ICON = { size: 16, strokeWidth: 1.75 };
const EMPTY: Step[] = [];

export default function SlotRail({ onOpen }: { onOpen: () => void }) {
  const steps = useFlow((s) => s.stage?.steps ?? EMPTY);
  const meta = useFlow((s) => s.project?.stages.find((x) => x.id === s.stage?.stageId));
  const phase = useFlow((s) => s.stage?.phase ?? 'work');
  const shown = steps.filter((x) => x.kind !== 'submit');
  const visible = shown.filter((x) => x.state === 'done' || (x.state === 'now' && x.revealed));
  const next = shown.find((x) => x.state === 'next');
  const unlocked = shown.length > 0 && shown.every((x) => x.state === 'done');
  const lit = visible.find((x) => x.state === 'now')?.slots.find((x) => !x.filled)?.id;
  const icon = meta ? fileIcon(meta.deliverable.type.replace('.', '')) : null;
  const what = meta ? `${meta.title}, ${meta.deliverable.label} ${meta.deliverable.type}` : 'The slots';
  const keyLabel = phase === 'work' ? (unlocked ? 'Submit' : 'Submit, once every step is done') : 'Open the slots';

  return (
    <div className="zs2-rail">
      <button type="button" className="zs2-rail-del" title={what} aria-label={`${what}. Open the slots`} onClick={onOpen}>
        {icon ? <img src={icon} alt="" draggable={false} /> : <Upload {...ICON} />}
      </button>
      <button type="button" className="zs2-rail-line" aria-label="Open the slots" onClick={onOpen}>
        {visible.map((step) => (
          <span key={step.id} className="zs2-rail-step" data-state={step.state} title={step.label}>
            {step.slots.map((slot) => (
              <i
                key={slot.id}
                className="zs2-rail-pt"
                data-slot={slot.id}
                data-filled={slot.filled || undefined}
                data-verified={(slot.filled && slot.verified) || undefined}
                data-lit={slot.id === lit || undefined}
              >
                {slot.filled && <Check size={10} strokeWidth={2.5} />}
              </i>
            ))}
          </span>
        ))}
        {next && (
          <span className="zs2-rail-step" data-state="next" aria-hidden>
            <i className="zs2-rail-pt" />
          </span>
        )}
      </button>
      <button type="button" className="zs2-rail-key" data-on={(phase === 'work' && unlocked) || undefined} title={keyLabel} aria-label={keyLabel} onClick={onOpen}>
        {phase === 'work' && !unlocked ? <Lock size={14} strokeWidth={1.75} /> : <Upload {...ICON} />}
      </button>
    </div>
  );
}
