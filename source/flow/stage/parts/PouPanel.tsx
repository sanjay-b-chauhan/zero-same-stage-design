/* Proof of understanding. Same state in both surfaces.
   PouLines: What, Why, How, One more. Blurred until you've said it, then it pops sharp, the same reward as a slot.
   On the big screen they sit under the one thread, never over your slots: those stay sharp, they are your work.
   PouFoot: the lines and the hold. The hold grows out of where the composer was, and folds away once she is done.
   PouExchange: big is the voice notes and the hold pill. Pip is her current question and a 52 high hold slab.
   PouMeter: the real understanding bar, real numbers from understandingBar.styles.ts: 10 high, gloss and fill gradients, 1.2 s pour. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Brain, Mic, X } from 'lucide-react';
import { formatDuration, remainingMs } from '@/renderer/windows/newMainUI/pilotWebUI/components/TrainingShared/Chat/recordingCountdown';
import { clock } from '../../clock';
import { useFlow } from '../../engine/store';
import type { Msg, PouLine, Surface } from '../../types';
import CoachCard from './CoachCard';
import { useDraft } from './draft';
import MicBars from './MicBars';
import { HeldClock } from './Composer';
import Thread from './Thread';
import VoicePill from './VoicePill';
import { hasSpeech, holdCancel, holdProps } from './useHold';
import { pop, prefersReduced, rise, SPRING, SPRING_MS } from './util';

const ICON = { size: 16, strokeWidth: 1.75 };
const IDLE_LABEL = 'Hold Space to talk';
const REPEAT_LABEL = "Didn't catch that. Hold Space and say it again";

function Line({ line, i }: { line: PouLine; i: number }) {
  const row = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLParagraphElement>(null);
  const was = useRef(line.said);
  useLayoutEffect(() => {
    if (was.current === line.said) return;
    was.current = line.said;
    if (line.said) {
      pop(row.current, 0.92);
      rise(body.current, { y: 5, blur: 7, delay: 70, ms: 620 });
    }
  }, [line.said]);
  return (
    <div ref={row} className="zs2-line" data-pou={i} data-said={line.said || undefined} data-told={line.told || undefined}>
      <p ref={body} className="zs2-line-t" aria-hidden={!line.said}>
        {line.text}
      </p>
    </div>
  );
}

export function PouLines() {
  const lines = useFlow((s) => s.stage?.pou.lines);
  if (!lines) return null;
  return (
    <div className="zs2-lines">
      {lines.map((l, i) => (
        <Line key={l.k} line={l} i={i} />
      ))}
      <CoachCard surface="big" />
    </div>
  );
}

/* the composer's box, measured while it was there, so the hold can grow out of it */
let composerAt: DOMRect | null = null;
export const keepComposerAt = (r: DOMRect | null) => {
  if (r && r.width > 0) composerAt = r;
};

export function PouFoot() {
  const lines = useFlow((s) => s.stage?.pou.lines);
  const done = useFlow((s) => s.stage?.phase === 'done');
  const speech = hasSpeech();
  const grid = useRef<HTMLDivElement>(null);
  const hold = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = hold.current;
    grid.current?.querySelectorAll('.zs2-line').forEach((n, i) => rise(n, { y: 14, blur: 8, scale: 0.96, delay: 120 + i * 60, ms: 620 }));
    const from = composerAt;
    composerAt = null;
    const pill = el?.querySelector('.zs2-hold-pill, .zs2-composer') as HTMLElement | null;
    if (!el || !pill || !from || prefersReduced(el)) return;
    const to = pill.getBoundingClientRect();
    if (to.width < 1) return;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    pill.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})`, filter: 'blur(6px)' },
        { transform: 'none', filter: 'blur(0px)' },
      ],
      { duration: SPRING_MS, easing: SPRING }
    );
  }, []);

  if (!lines) return null;
  return (
    <div className="zs2-pou-foot" data-done={done || undefined}>
      <div ref={grid} className="zs2-lines" data-in="chat">
        {lines.map((l, i) => (
          <Line key={l.k} line={l} i={i} />
        ))}
      </div>
      <div className="zs2-pou-holdfold">
        <div ref={hold} className="zs2-pou-holdin" inert={done}>
          {speech ? (
            <HoldPill />
          ) : (
            <div className="zs2-chat-foot">
              <PouTyped />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PouMeter() {
  const progress = useFlow((s) => s.stage?.pou.progress ?? 0);
  const pct = Math.max(0, Math.min(100, progress <= 1 ? progress * 100 : progress));
  return (
    <div className="zs2-meter-wrap">
      <div className="zs2-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <span className="zs2-meter-fill" style={{ width: `${pct}%` }}>
          <i className="zs2-meter-gloss" />
        </span>
      </div>
      <Brain {...ICON} />
    </div>
  );
}

function RecCount() {
  const at = useDraft((s) => s.holdAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = clock.setInterval(() => setNow(Date.now()), 200);
    return () => clock.clearInterval(id);
  }, []);
  return <span className="zs2-rec-time z-num">{formatDuration(remainingMs(now - at))}</span>;
}

/* the real mic pill: 124 grows to 536, 74 high, at the real .79 scale of a 1512 window */
function HoldPill() {
  const listening = useFlow((s) => s.ui.listening);
  const typing = useFlow((s) => s.stage?.typing ?? false);
  const repeat = useDraft((s) => s.repeat);
  return (
    <div className="zs2-hold" data-off={typing || undefined}>
      <div className="zs2-hold-pill" data-rec={listening || undefined}>
        <button type="button" className="zs2-hold-mic" aria-label="Hold to talk" tabIndex={listening ? -1 : 0} {...holdProps()}>
          <Mic {...ICON} />
        </button>
        {listening && (
          <div className="zs2-hold-rec">
            <button type="button" className="zs2-hold-x" aria-label="Cancel" onClick={holdCancel}>
              <X {...ICON} />
            </button>
            <MicBars bars={48} />
            <RecCount />
          </div>
        )}
      </div>
      <span className="zs2-hold-label">{listening ? 'Esc to cancel' : repeat ? REPEAT_LABEL : IDLE_LABEL}</span>
    </div>
  );
}

function HoldSlab() {
  const listening = useFlow((s) => s.ui.listening);
  const typing = useFlow((s) => s.stage?.typing ?? false);
  const repeat = useDraft((s) => s.repeat);
  return (
    <button type="button" className="zs2-holdslab" data-rec={listening || undefined} data-off={typing || undefined} {...holdProps()}>
      {listening ? (
        <>
          <Mic {...ICON} />
          <MicBars bars={28} />
          <HeldClock />
        </>
      ) : (
        <>
          <Mic {...ICON} />
          <span>{repeat ? 'Say that again' : 'Hold to talk'}</span>
        </>
      )}
    </button>
  );
}

const lastVoice = (msgs: Msg[]): Msg | undefined => {
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].voice) return msgs[i];
  return undefined;
};

export function PouExchange({ surface }: { surface: Surface }) {
  const msgs = useFlow((s) => s.stage?.msgs);
  const typing = useFlow((s) => s.stage?.typing ?? false);
  const speech = hasSpeech();
  if (surface === 'big') {
    return (
      <div className="zs2-pou">
        <Thread surface="big" />
        {speech ? (
          <HoldPill />
        ) : (
          <div className="zs2-chat-foot">
            <PouTyped />
          </div>
        )}
      </div>
    );
  }
  const q = lastVoice(msgs ?? []);
  return (
    <div className="zs2-pou" data-surface="pip">
      <div className="zs2-pou-q">
        {q?.voice && <VoicePill id={q.id} surface="pip" url={q.voice.url} dur={q.voice.dur} text={q.voice.text} />}
        {typing && (
          <div className="zs2-typing">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
      <CoachCard surface="pip" />
      {speech ? <HoldSlab /> : <PouTyped />}
    </div>
  );
}

/* no recognition in this browser: the answer is typed, the POU still runs */
function PouTyped() {
  const text = useDraft((s) => s.text);
  const set = useDraft((s) => s.set);
  const answer = useFlow((s) => s.actions.pouAnswer);
  return (
    <div className="zs2-composer" data-typed>
      <textarea
        className="zs2-input"
        rows={1}
        value={text}
        placeholder="Type your answer"
        onChange={(e) => set({ text: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && text.trim()) {
            e.preventDefault();
            answer(text.trim());
            set({ text: '' });
          }
        }}
      />
    </div>
  );
}

export default function PouPanel({ surface }: { surface: Surface }) {
  return <PouExchange surface={surface} />;
}
