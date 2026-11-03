/* The slots, compact. Each step is one quiet row with its count. The step you are on shows its slots as small cells,
   Like the stage's checklist: empty is a ring, done is a bare tick with no circle, green only once verified (b14, his note).
   The name of a filled slot shows on hover, never before.
   A step's cells are not there until she lays them down, then they land one by one. Never the big stage cells. */
import { useLayoutEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { clock } from '../clock';
import { useFlow } from '../engine/store';
import type { Slot, Step } from '../types';
import { submitLabel, workDone } from './logic';
import { pop, prefersReduced, rise, seededDashes, SNAP, SNAP_MS } from '../stage/parts/util';

const TICK = { size: 14, strokeWidth: 2.25 };
const ICON = { size: 14, strokeWidth: 1.75 };

const filledOf = (step: Step) => step.slots.filter((x) => x.filled).length;

/* a slot is landing now only if it was the engine's last one, moments ago. A remount never replays it. */
const isFresh = (slot: Slot) => {
  const s = useFlow.getState().stage;
  return !!s && s.lastSlotId === slot.id && Date.now() - s.lastSlotAt < 900;
};

function useFill(slot: Slot) {
  const el = useRef<HTMLSpanElement>(null);
  const was = useRef(slot.filled && !isFresh(slot));
  useLayoutEffect(() => {
    if (!slot.filled || was.current) {
      was.current = slot.filled;
      return;
    }
    was.current = true;
    const f = el.current;
    if (!f || prefersReduced(f)) return;
    f.animate([{ transform: 'scale(0.6)' }, { transform: 'scale(1)' }], { duration: SNAP_MS, easing: SNAP });
  }, [slot.filled, slot.id]);
  return el;
}

/* b16 (his note, 3 Nov: "I need a whole list there ... some of those would be like a hidden version"): every slot is its own
   row, the way the stage's board lists them. Found: the bare tick and its name. Not yet: a ring and a hidden line, seeded by
   its place so it never hints at the answer */
function Hidden({ seed }: { seed: string }) {
  return (
    <span className="zp-hide" aria-hidden>
      {seededDashes(seed).map((w, i) => (
        <i key={i} style={{ width: w }} />
      ))}
    </span>
  );
}

function Cell({ slot }: { slot: Slot }) {
  const el = useFill(slot);
  return (
    <span className="zp-srow" data-slot={slot.id} data-filled={slot.filled || undefined} data-verified={slot.verified || undefined}>
      <span ref={el} className="zp-cell" aria-hidden>
        {slot.filled && <Check {...TICK} />}
      </span>
      {slot.filled ? <span className="zp-srow-t">{slot.label}</span> : <Hidden seed={slot.id} />}
    </span>
  );
}

/* a prompt, a link or a file is one line of its own: what it is shows once it is there */
function Line({ slot }: { slot: Slot }) {
  const el = useFill(slot);
  const btn = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const view = btn.current?.ownerDocument.defaultView;
    try {
      await view?.navigator.clipboard.writeText(slot.value ?? '');
    } catch {
      /* clipboard refused, the prompt is still in the chat */
    }
    setCopied(true);
    clock.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <span ref={el} className="zp-line" data-slot={slot.id} data-filled={slot.filled || undefined}>
      {!slot.filled && slot.label && <span className="zp-line-label">{slot.label}</span>}
      {slot.filled && (
        <>
          <span className="zp-line-label">{slot.label}</span>
          {slot.kind === 'prompt' && slot.value ? (
            <button ref={btn} type="button" className="zp-line-copy" data-tip={copied ? 'Copied' : 'Copy the prompt'} aria-label="Copy the prompt" onClick={() => void copy()}>
              {copied ? <Check {...ICON} /> : <Copy {...ICON} />}
            </button>
          ) : (
            <Check className="zp-line-tick" data-verified={slot.verified || undefined} {...ICON} />
          )}
        </>
      )}
    </span>
  );
}

function Cells({ step, quiet }: { step: Step; quiet?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const was = useRef(step.revealed !== false);
  /* she laid them down: each lands on its own beat */
  useLayoutEffect(() => {
    const on = step.revealed !== false;
    if (!on || was.current) {
      was.current = on;
      return;
    }
    was.current = true;
    box.current?.querySelectorAll('.zp-srow, .zp-line').forEach((c, i) => {
      rise(c, { y: 6, scale: 0.8, blur: 3, delay: i * 40, ms: 520, easing: SNAP });
    });
  }, [step.revealed]);
  /* a step she has not laid down yet, or one still ahead, is there as hidden rows: you see how much is coming, not what */
  const hidden = quiet || step.revealed === false;
  return (
    <div ref={box} className="zp-step-cells" data-quiet={hidden || undefined}>
      {step.slots.map((s) =>
        hidden ? (
          <span key={s.id} className="zp-srow">
            <span className="zp-cell" aria-hidden />
            <Hidden seed={s.id} />
          </span>
        ) : s.kind === 'issue' ? (
          <Cell key={s.id} slot={s} />
        ) : (
          <Line key={s.id} slot={s} />
        )
      )}
    </div>
  );
}

function StepRow({ step, n }: { step: Step; n: number }) {
  const row = useRef<HTMLDivElement>(null);
  const before = useRef(step.state);
  useLayoutEffect(() => {
    if (before.current === step.state) return;
    const from = before.current;
    before.current = step.state;
    if (step.state === 'done' && from === 'now') pop(row.current?.querySelector('.zp-step-mark') ?? null, 0.4);
    if (step.state === 'now') rise(row.current?.querySelector('.zp-step-word') ?? null, { y: 6, blur: 5, ms: 520 });
  }, [step.state]);
  const total = step.slots.length;
  const filled = filledOf(step);
  return (
    <div ref={row} className="zp-step" data-state={step.state}>
      <div className="zp-step-head">
        <span className="zp-step-mark" aria-hidden>
          {step.state === 'done' ? <Check {...TICK} /> : <span className="z-num">{n}</span>}
        </span>
        {/* b16: every step says its name, so the list tells you what is ahead. Only its slots stay hidden */}
        <span className="zp-step-word">{step.kind === 'submit' ? submitLabel(step.label) : step.label}</span>
        {total > 1 && (
          <span className="zp-step-count z-num">
            {filled} of {total}
          </span>
        )}
      </div>
      {total > 0 && <Cells step={step} quiet={step.state === 'next'} />}
    </div>
  );
}

/* b16 (his note: "issue to find, then ... submissions"): the hand in is the last row, even on a stage whose steps don't name it.
   It reads as next until every step before it is done */
function SubmitRow({ n }: { n: number }) {
  const deliverable = useFlow((s) => s.project?.stages.find((x) => x.id === s.stage?.stageId)?.deliverable.label);
  const ready = useFlow((s) => workDone(s.stage));
  const sent = useFlow((s) => !!s.stage?.submitted);
  return (
    <div className="zp-step" data-state={sent ? 'done' : ready ? 'now' : 'next'}>
      <div className="zp-step-head">
        <span className="zp-step-mark" aria-hidden>
          {sent ? <Check {...TICK} /> : <span className="z-num">{n}</span>}
        </span>
        <span className="zp-step-word">{submitLabel(deliverable)}</span>
      </div>
    </div>
  );
}

export default function PipSlots() {
  /* b16: the whole list, every step down to the submission, in order */
  const steps = useFlow((s) => s.stage?.steps) ?? [];
  if (!steps.length) return null;
  const hasSubmit = steps.some((x) => x.kind === 'submit');
  return (
    <div className="zp-slots" data-fit>
      {steps.map((step, i) => (
        <StepRow key={step.id} step={step} n={i + 1} />
      ))}
      {!hasSubmit && <SubmitRow n={steps.length + 1} />}
    </div>
  );
}
