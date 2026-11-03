/* The two cards that sit on the film's bar. At the end of a chapter that teaches: her face, "Are we clear?", the replay key
   on the left and Yes. At the end of the meeting: "I hope you're completely in sync" and Continue into the check-in. Each
   rises from the point on the bar where the chapter ends, and goes back into it. b11: the bar is the film's progress line
   at rest, the card rises from it; after her hello, "Ready to take notes?" sits in the middle under her, Okay its one key. */
import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUp, NotebookPen, RotateCcw } from 'lucide-react';
import { useDevAction } from '../dev/store';
import { useFlow } from '../engine/store';
import { kick, kickAgain, kickClear, useKick } from './kickoff';
import { sfx } from './prefs';

const LEAVE_MS = 260;
const EDGE = 16;

/* the x on the bar where chapter `seg` ends, inside the frame, the card kept clear of both edges */
function useAnchor(seg: number, card: React.RefObject<HTMLDivElement | null>) {
  const [x, setX] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = card.current;
    const fr = el?.closest('.rm-fr');
    if (!el || !fr) return;
    const place = () => {
      const cell = fr.querySelectorAll<HTMLElement>('.rm-line .rm-lc')[seg];
      const f = fr.getBoundingClientRect();
      const w = el.offsetWidth;
      const end = cell ? cell.getBoundingClientRect().right - f.left : f.width - EDGE;
      setX(Math.round(Math.max(EDGE, Math.min(f.width - w - EDGE, end - w / 2))));
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(fr);
    return () => ro.disconnect();
  }, [seg, card]);
  return x;
}

function Card({ seg, children, leaving, pro }: { seg: number; children: React.ReactNode; leaving: boolean; pro?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useAnchor(seg, ref);
  const face = useFlow((s) => s.project?.manager);
  return (
    <div
      ref={ref}
      className={pro ? 'kc kc-pro' : 'kc'}
      role="dialog"
      aria-label={face ? `${face.name} asks` : undefined}
      data-leaving={leaving ? '1' : undefined}
      data-placed={x === null ? undefined : '1'}
      style={{ left: x ?? 0 }}
      onClick={(e) => e.stopPropagation()}
    >
      {face?.face && <img className="kc-face" src={face.face} alt="" draggable={false} />}
      {children}
    </div>
  );
}

/* a card stays a moment after it is answered, so it can leave */
function useStay(on: boolean) {
  const [stay, setStay] = useState(on);
  const [was, setWas] = useState(on);
  if (on !== was) {
    setWas(on);
    if (on) setStay(true);
  }
  useLayoutEffect(() => {
    if (on || !stay) return;
    const id = window.setTimeout(() => setStay(false), LEAVE_MS);
    return () => window.clearTimeout(id);
  }, [on, stay]);
  return stay;
}

/* her answer to a question at a check-in: the chapter's own key point, said plainly. Scripted: nothing is sent anywhere */
function answerFor(seg: number): string {
  const run = kick.run();
  const id = run.segments[seg]?.lines.find((l) => l.context_point_id)?.context_point_id;
  const p = id ? run.points.find((x) => x.id === id) : undefined;
  return p ? `Good question. The short version: ${p.description}` : 'Good question. Watch that part again with me and it will click.';
}

export function CheckIn() {
  const check = useKick((s) => s.check);
  const [last, setLast] = useState<number | null>(check);
  if (check !== null && check !== last) setLast(check);
  const stay = useStay(check !== null);
  const yes = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);
  /* b15 (his note: "Ask | Yes and then bottom only text watch again with icon small"): Ask opens a line to type in, she
     answers in the card from the chapter's own key point, then Ask and Yes come back */
  const [asking, setAsking] = useState(false);
  const [q, setQ] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [for_, setFor] = useState(check);
  if (check !== for_) {
    setFor(check);
    setAsking(false);
    setReply(null);
    setQ('');
  }
  useLayoutEffect(() => {
    if (check !== null) yes.current?.focus({ preventScroll: true });
  }, [check]);
  useLayoutEffect(() => {
    if (asking) field.current?.focus({ preventScroll: true });
  }, [asking]);
  useDevAction(
    'kick-yes',
    'Say yes',
    () => {
      sfx.click();
      kickClear();
    },
    check !== null
  );
  if (!stay || last === null) return null;
  return (
    /* b14 (his note: "this UI also should be like the profile. Then we have one line, and then we have the two CTAs"):
       her face on top like a profile, the one line, then Watch again and Yes side by side */
    <Card seg={last} leaving={check === null} pro>
      <b className="kc-q" data-reply={reply ? '1' : undefined}>
        {reply ?? 'Are we clear?'}
      </b>
      {asking ? (
        <form
          className="kc-ask"
          onSubmit={(e) => {
            e.preventDefault();
            if (!q.trim()) return;
            sfx.click();
            setReply(answerFor(last));
            setQ('');
            setAsking(false);
          }}
        >
          <input
            ref={field}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') setAsking(false);
            }}
            placeholder="Ask her about this part"
            aria-label="Your question"
          />
          <button type="submit" className="kc-ask-go" aria-label="Ask" disabled={!q.trim()}>
            <ArrowUp size={14} strokeWidth={2} />
          </button>
        </form>
      ) : (
        <span className="kc-k">
          <button
            type="button"
            className="kc-again kc-askk"
            onClick={() => {
              sfx.click();
              setAsking(true);
            }}
          >
            Ask
          </button>
          <button
            ref={yes}
            type="button"
            className="zk3 kc-two"
            onClick={() => {
              sfx.click();
              kickClear();
            }}
          >
            Yes
          </button>
        </span>
      )}
      <button
        type="button"
        className="kc-re2"
        onClick={() => {
          sfx.click();
          kickAgain();
        }}
      >
        <RotateCcw size={12} strokeWidth={2} />
        Watch again
      </button>
    </Card>
  );
}

/* after her hello: is your pen ready. Okay closes her video into her corner and the notes come in. b13 (his note: "make it
   more better POP, icon and below text and below text"): a pop that stands up, the icon, the question, what Okay does, the key */
export function ReadyCard({ on, onOkay }: { on: boolean; onOkay: () => void }) {
  const stay = useStay(on);
  const key = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (on) key.current?.focus({ preventScroll: true });
  }, [on]);
  if (!stay) return null;
  return (
    <div className="kc kc-mid" role="dialog" aria-label="Ready to take notes?" data-placed="1" data-leaving={on ? undefined : '1'} onClick={(e) => e.stopPropagation()}>
      <span className="kc-ic" aria-hidden>
        <NotebookPen size={20} strokeWidth={1.75} />
      </span>
      <b className="kc-q">Ready to take notes?</b>
      <span className="kc-sub">She moves to the corner and your notes open beside her.</span>
      <button ref={key} type="button" className="zk3 kc-ok" onClick={onOkay}>
        Okay
      </button>
    </div>
  );
}

export function EndCard() {
  const on = useKick((s) => s.phase === 'done' && !s.replay);
  const last = useKick((s) => s.seg);
  const goto = useFlow((s) => s.actions.goto);
  const stay = useStay(on);
  const key = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (on) key.current?.focus({ preventScroll: true });
  }, [on]);
  useDevAction(
    'kick-go',
    'Continue',
    () => {
      sfx.click();
      goto('pou');
    },
    on
  );
  if (!stay) return null;
  return (
    <Card seg={last} leaving={!on}>
      <b className="kc-q">I hope you're completely in sync</b>
      <span className="kc-k">
        <button
          ref={key}
          type="button"
          className="kc-yes"
          onClick={() => {
            sfx.click();
            goto('pou');
          }}
        >
          Continue
          <ArrowRight size={16} strokeWidth={2} />
        </button>
      </span>
    </Card>
  );
}
