/* The hero. Steps in order, one column, on the big screen and in the PIP.
   A step is nothing until her word lands its slots: they rise one after the other, each with its own soft note.
   A slot reads like a task list: an open ring until it is done, then a tick, green only when it is verified.
   An empty slot is a redacted line, softly blurred, seeded by its place so it never hints at the answer.
   A fill types its words in with a green sweep through them, then they fly to the Level pill (the engine's flyToLevel).
   Rows are keyed by place, so a fill never moves anything. The ting is the engine's.
   A named slot (a stage 2 round) shows its name dim before it fills: it is a task, never an answer.
   A file slot is the file itself: its icon and name, and it opens in the preview.
   His notes, 2 Nov: the board is sections, each with its heading: the issues, the prompt, the submission. b12: a heading
   is a small line with a chevron before it that folds it, and nothing else ("that can only be a dropdown"): no number,
   no count, nothing folds by itself. A section her word has not landed yet is its heading and one blurred line. */
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy, Eye } from 'lucide-react';
import { clock } from '../../clock';
import { fileRef } from '../../engine/stage';
import { useFlow } from '../../engine/store';
import type { Slot, Step, Surface } from '../../types';
import { fileIcon, land, prefersReduced, rise, seededDashes } from './util';

const ICON = { size: 16, strokeWidth: 1.75 };
const FRESH_MS = 900;
const TYPE_MS = 18; /* a character */
const TYPE_MAX = 380;
const SWEEP_MS = 760;

/* a slot is landing now only if it was the engine's last one, moments ago. A remount never replays it */
const isFresh = (slot: Slot) => {
  const s = useFlow.getState().stage;
  return !!s && s.lastSlotId === slot.id && Date.now() - s.lastSlotAt < FRESH_MS;
};
/* the same for a whole step landing on her word */
const isLanding = (step: Step) => {
  const s = useFlow.getState().stage;
  return !!s && s.revealId === step.id && Date.now() - (s.revealAt ?? 0) < FRESH_MS;
};

function Redact({ seed, lines = 1 }: { seed: string; lines?: number }) {
  return (
    <span className="zs2-redact" aria-hidden>
      {Array.from({ length: lines }, (_, l) => (
        <span key={l} className="zs2-redact-line">
          {seededDashes(`${seed}:${l}`).map((w, i) => (
            <i key={i} style={{ width: w }} />
          ))}
        </span>
      ))}
    </span>
  );
}

/* the words type in, left to right, and a green band runs through them as they land. Interruptible: a new fill finishes it */
function typeIn(el: HTMLElement | null) {
  if (!el || prefersReduced(el)) return;
  const n = Math.max(1, (el.textContent ?? '').length);
  const ms = Math.min(TYPE_MAX, n * TYPE_MS);
  el.getAnimations().forEach((a) => a.finish());
  el.animate([{ clipPath: 'inset(-4px 100% -4px 0)' }, { clipPath: 'inset(-4px 0 -4px 0)' }], { duration: ms, easing: `steps(${n}, end)` });
  el.classList.add('zs2-sweep');
  const band = el.animate([{ backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0' }], { duration: SWEEP_MS, easing: 'cubic-bezier(.3,0,.2,1)' });
  const done = () => el.classList.remove('zs2-sweep');
  band.finished.then(done, done);
}

function useFillMoment(slot: Slot, kind: 'type' | 'rise' = 'rise') {
  const label = useRef<HTMLSpanElement>(null);
  const tick = useRef<HTMLSpanElement>(null);
  const was = useRef(slot.filled && !isFresh(slot));
  useLayoutEffect(() => {
    if (!slot.filled || was.current) {
      was.current = slot.filled;
      return;
    }
    was.current = true;
    if (kind === 'type') typeIn(label.current);
    else rise(label.current, { y: 6, blur: 6, ms: 620 });
    land(tick.current, 0.3, kind === 'type' ? Math.min(TYPE_MAX, (slot.label?.length ?? 0) * TYPE_MS) : 160, 3);
  }, [slot.filled, slot.id]);
  return { label, tick };
}

/* b17 (his note, 3 Nov: "Remove this drop down"): a done slot is its tick and its words, nothing opens under it */
function Row({ slot, seed }: { slot: Slot; seed: string }) {
  const { label, tick } = useFillMoment(slot, 'type');
  const mark = !slot.filled ? 'open' : slot.verified ? 'ok' : 'told';
  return (
    <div className="zs2-slot" data-slot={slot.id} data-filled={slot.filled || undefined} data-named={slot.named || undefined}>
      <span ref={tick} className="zs2-slot-mark" data-mark={mark} aria-label={slot.filled ? (slot.verified ? 'Done, verified' : 'Done') : 'Not done yet'}>
        {slot.filled && <Check size={slot.verified ? 16 : 14} strokeWidth={slot.verified ? 2.75 : 2.25} />}
      </span>
      {!slot.named && <Redact seed={seed} />}
      {(slot.filled || slot.named) && (
        <span ref={label} className="zs2-slot-label">
          {slot.label}
        </span>
      )}
    </div>
  );
}

function PromptRow({ slot, seed }: { slot: Slot; seed: string }) {
  const { label } = useFillMoment(slot);
  const [copied, setCopied] = useState(false);
  const host = useRef<HTMLButtonElement>(null);
  const copy = async () => {
    const view = host.current?.ownerDocument.defaultView;
    try {
      await view?.navigator.clipboard.writeText(slot.value ?? '');
    } catch {
      /* clipboard refused, the text is still there to read */
    }
    setCopied(true);
    clock.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="zs2-promptslot" data-slot={slot.id} data-filled={slot.filled || undefined}>
      {!slot.filled && <Redact seed={seed} lines={3} />}
      {slot.filled && (
        <>
          <span ref={label} className="zs2-promptslot-text">
            {slot.value}
          </span>
          <button ref={host} type="button" className="zs2-ghost zs2-promptslot-copy" aria-label="Copy the prompt" title="Copy" onClick={() => void copy()}>
            {copied ? <Check {...ICON} /> : <Copy {...ICON} />}
          </button>
        </>
      )}
    </div>
  );
}

function FileRow({ slot, seed }: { slot: Slot; seed: string }) {
  const { label } = useFillMoment(slot);
  const openFile = useFlow((s) => s.actions.openFile);
  const f = slot.filled && slot.value ? fileRef(slot.value) : undefined;
  if (!f)
    return (
      <div className="zs2-slot" data-slot={slot.id}>
        <Redact seed={seed} />
      </div>
    );
  const icon = fileIcon(f.kind);
  return (
    <button type="button" className="zs2-slot zs2-fileslot" data-slot={slot.id} data-filled="" aria-label={`Open ${f.name}`} onClick={() => openFile(f.id)}>
      {icon && <img className="zs2-fileslot-ico" src={icon} alt="" draggable={false} />}
      <span ref={label} className="zs2-slot-label">
        {f.name}
      </span>
      <Eye className="zs2-fileslot-eye" {...ICON} />
    </button>
  );
}

function Body({ step }: { step: Step }) {
  const box = useRef<HTMLDivElement>(null);
  /* the slots land on her word, one after the other */
  useLayoutEffect(() => {
    if (!isLanding(step)) return;
    box.current?.querySelectorAll(':scope > *').forEach((el, i) => {
      rise(el, { y: 10, scale: 0.96, blur: 3, delay: i * 40, ms: 620 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.revealed]);
  return (
    <div ref={box} className="zs2-slots" data-kind={step.kind}>
      {step.slots.map((slot, i) =>
        slot.kind === 'prompt' ? (
          <PromptRow key={i} slot={slot} seed={`${step.id}:${i}`} />
        ) : slot.kind === 'file' ? (
          <FileRow key={i} slot={slot} seed={`${step.id}:${i}`} />
        ) : (
          <Row key={i} slot={slot} seed={`${step.id}:${i}`} />
        )
      )}
    </div>
  );
}

/* the board just landed on her word: every heading rises in, one after the other */
const boardLanding = () => {
  const s = useFlow.getState().stage;
  return !!s && Date.now() - (s.revealAt ?? 0) < FRESH_MS;
};

/* One section: its title. b23 (his note: "remove the dropdown ... it just opens up when there is a time for it, it's a
   whole progress thing"): nothing to press, the section opens when the work reaches it. It folds on the spring: the height glides and the rows blur as they go, sharp again as they come back. A CSS
   transition, so a second press mid fold turns it around from where it is */
function Section({
  n,
  title,
  state,
  open,
  children,
}: {
  n: number;
  title: string;
  state: Step['state'];
  open: boolean;
  children: ReactNode;
}) {
  const el = useRef<HTMLElement>(null);
  const id = useId();
  useLayoutEffect(() => {
    if (!boardLanding()) return;
    rise(el.current?.querySelector('.zs2-sec-head') ?? null, { y: 8, blur: 4, delay: (n - 1) * 70, ms: 560 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <section ref={el} className="zs2-sec" data-state={state} data-closed={!open || undefined}>
      <div className="zs2-sec-head" aria-expanded={open} aria-controls={id}>
        <span className="zs2-sec-t">{title}</span>
        {state === 'done' && <Check className="zs2-sec-done" size={12} strokeWidth={2} aria-label="Done" />}
      </div>
      <div id={id} className="zs2-sec-fold" inert={!open || undefined}>
        <div className="zs2-sec-in">{children}</div>
      </div>
    </section>
  );
}

/* a section her word has not landed: one blurred line under its heading, it says what comes and nothing of the answer */
function Pending({ id }: { id: string }) {
  const el = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (boardLanding()) rise(el.current, { y: 10, scale: 0.96, blur: 3, delay: 200, ms: 620 });
  }, []);
  return (
    <div ref={el} className="zs2-slot" data-pending="">
      <Redact seed={`next:${id}`} />
    </div>
  );
}

function StepSection({ step, n }: { step: Step; n: number }) {
  const landed = step.state === 'done' || (step.state === 'now' && !!step.revealed);
  const open = step.state === 'now';

  return (
    <div className="zs2-step" data-state={step.state}>
      <Section n={n} title={step.label} state={step.state} open={open}>
        {landed ? <Body step={step} /> : <Pending id={step.id} />}
      </Section>
    </div>
  );
}

/* the hand in, last: the key and what follows it. It opens by itself whenever the drop area does */
function SubmitSection({ step, n, children }: { step: Step; n: number; children: ReactNode }) {
  const dropping = useFlow((s) => s.stage?.submitOpen ?? false);
  const open = dropping || step.state === 'now';
  return (
    <div className="zs2-step zs2-step-submit" data-state={step.state}>
      <Section n={n} title="Submission" state={step.state} open={open}>
        {children}
      </Section>
    </div>
  );
}

/* `submit` is what the hand in section holds (the big screen passes its SubmitArea). Without a submit step it sits
   under the sections with no heading */
export default function SlotBoard({ surface, submit }: { surface: Surface; submit?: ReactNode }) {
  const steps = useFlow((s) => s.stage?.steps);
  if (!steps) return null;
  /* nothing shows until her word lands the first step. Then every section is there, in order */
  const landed = steps.length > 0 && !!steps[0].revealed;
  const at = steps.findIndex((x) => x.kind === 'submit');
  return (
    <div className="zs2-board" data-surface={surface}>
      {landed &&
        steps.map((step, i) =>
          step.kind === 'submit' ? null : <StepSection key={step.id} step={step} n={i + 1} />
        )}
      {landed && at >= 0 ? (
        <SubmitSection step={steps[at]} n={at + 1}>
          {submit}
        </SubmitSection>
      ) : (
        submit
      )}
    </div>
  );
}

