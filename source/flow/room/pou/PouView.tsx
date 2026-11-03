/* The check-in after the meeting, as the real kickoff POU runs it: a thread of voice notes inside the film's frame, the
   meeting notes still open beside it. She sends a voice note, you hold Space and send one back, she listens and replies
   with the next. Her notes sit left with her face, yours sit right. Each note plays, shows its length, and folds out its
   transcript. The understanding meter sits at the top of the frame and fills as she hears what she needs. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, ArrowUp, Brain, ChevronDown, Mic, Pause, Play, X } from 'lucide-react';
import { useDevAction } from '../../dev/store';
import { useFlow } from '../../engine/store';
import { isTextEntry, prefersReduced, SPRING } from '../../stage/parts/util';
import { canHear, holdCancel, holdEnd, holdStart, useHoldUi } from '../hold';
import { usePeaks } from '../peaks';
import { meterOf, pouAnswer, pouAnswerForMe, pouFaceHand, REC_FROM, REC_TICK_MS, usePou } from '../pou';
import { sfx } from '../prefs';
import { cycleRate, NOTE_BARS, noteSrc, replayNote, useNote, useRate, type Msg } from '../talk';
import { mss } from '../timeline';
import './pou.css';

/* the understanding meter, in the back key's row and its height: one dash for each thing she needs to hear. A dash you
   said fills green; one she had to fill in for you fills grey. b12 (his note: "a brain icon because that's a brain
   meter"): a brain leads it and fills green from the bottom as she hears what she needs. The pill opens out of it, as
   wide as the thread below, so the two read as one column */
export function PouMeter() {
  const lines = usePou((s) => s.lines);
  const p = meterOf(lines);
  const said = lines.length ? lines.filter((l) => l.state === 'said').length / lines.length : 0;
  return (
    <div
      className="pv-meter"
      role="meter"
      aria-label="Understanding"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
      data-full={p >= 1 ? '1' : undefined}
      data-won={said >= 1 ? '1' : undefined}
      style={{ '--pv-p': said } as CSSProperties}
    >
      <span className="pv-mbg" aria-hidden />
      <span className="pv-brain" aria-hidden>
        <Brain size={18} strokeWidth={1.75} />
        <Brain className="pv-brain-on" size={18} strokeWidth={1.75} />
      </span>
      <span className="pv-dashes">
        {lines.map((l, i) => (
          <span key={i} className="pv-dash" data-state={l.state}>
            <i />
          </span>
        ))}
      </span>
    </div>
  );
}

/* her bars come from her take's peaks, yours from your mic */
function useBars(m: Msg): number[] {
  const peaks = usePeaks(m.from === 'her' ? m.take?.url : undefined);
  if (m.voice) return m.voice.bars;
  return Array.from({ length: NOTE_BARS }, (_, i) => Math.round(4 + (peaks ? peaks[Math.floor((i / NOTE_BARS) * peaks.length)] : 0.4) * 20));
}

function Note({ m, busy, still = false }: { m: Msg; busy: () => boolean; still?: boolean }) {
  const bars = useBars(m);
  const src = noteSrc(m);
  const dur = src?.dur ?? m.voice?.dur ?? 0;
  const playing = useNote((s) => s.id === m.id);
  const p = useNote((s) => (s.id === m.id ? s.p : 0));
  const [open, setOpen] = useState(false);
  const lit = playing ? Math.round(p * bars.length) : bars.length;
  const row = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = row.current?.querySelector<HTMLElement>('.pv-vn');
    if (still || !el || prefersReduced(el)) return;
    el.animate(
      [
        { transform: 'scale(.4)', filter: 'blur(10px)' },
        { transform: 'none', filter: 'blur(0px)' },
      ],
      { duration: 620, easing: SPRING }
    );
  }, []);
  return (
    <div ref={row} className="pv-row" data-from={m.from} data-id={m.id}>
      {m.from === 'her' && <Face />}
      <div className="pv-nb">
        <div className="pv-vn" data-playing={playing ? '1' : '0'}>
          <button
            type="button"
            className="pv-pb"
            aria-label={playing ? 'Pause' : 'Play'}
            disabled={!src}
            onClick={(e) => {
              e.currentTarget.blur();
              sfx.click();
              replayNote(m, busy());
            }}
          >
            {playing ? <Pause size={14} strokeWidth={2} fill="currentColor" /> : <Play size={14} strokeWidth={2} fill="currentColor" />}
          </button>
          <span className="pv-wv" aria-hidden>
            {bars.map((h, i) => (
              <i key={i} style={{ height: h }} data-on={i < lit ? '1' : '0'} />
            ))}
          </span>
          {/* b14 (his note: "when we play, the timer on the right just moves a little up, and it creates space for 1x,
              2x"): the time stays on the right; playing, it lifts and the speed key opens under it. The pill never grows */}
          <span className="pv-end" data-on={playing ? '1' : '0'}>
            <span className="pv-dd">{mss(playing ? dur * p : dur + 0.5)}</span>
            <Speed on={playing} />
          </span>
        </div>
        {m.text && (
          <button
            type="button"
            className="pv-trb"
            aria-expanded={open}
            onClick={(e) => {
              e.currentTarget.blur();
              setOpen(!open);
            }}
          >
            Transcript
            <ChevronDown size={14} strokeWidth={2} />
          </button>
        )}
        {open && m.text && <p className="pv-trt">{m.text}</p>}
      </div>
    </div>
  );
}

/* the speed key, only while a note plays: 1x, 1.2x, 1.5x */
function Speed({ on }: { on: boolean }) {
  const r = useRate((s) => s.r);
  return (
    <span className="pv-sp" data-on={on ? '1' : '0'}>
      <button
        type="button"
        aria-label={`Speed ${r}x`}
        tabIndex={on ? 0 : -1}
        onClick={(e) => {
          e.currentTarget.blur();
          sfx.click();
          cycleRate();
        }}
      >
        {r}x
      </button>
    </span>
  );
}

function Face() {
  const face = useFlow((s) => s.project?.manager?.face);
  return <span className="pv-face">{face && <img src={face} alt="" draggable={false} />}</span>;
}

/* she records her next note: her face and her mic live for a beat, then the note lands in its place.
   b31 (his note: "recording, trimming, and then sending ... 'Recording: 3 seconds, 2 seconds, 1 second' ... an estimated
   time also begins to show"): the time she has left counts down, then she trims it, then it sends. REC_TICK_MS x REC_FROM
   plus the trim beat is pou.ts RECORD_MS */
function Recording({ first, live }: { first: boolean; live: boolean }) {
  const [n, setN] = useState(REC_FROM);
  useEffect(() => {
    if (!live) return;
    setN(REC_FROM);
    const id = window.setInterval(() => setN((v) => Math.max(0, v - 1)), REC_TICK_MS);
    return () => window.clearInterval(id);
  }, [live]);
  const trim = n <= 0;
  return (
    <div className="pv-row pv-recg" data-from="her" data-first={first ? '1' : undefined} data-trim={trim ? '1' : undefined}>
      <Face />
      <span className="pv-rb" aria-label={trim ? 'Trimming' : 'Recording'}>
        <span className="pv-rw" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} style={{ animationDelay: `${(i % 5) * -0.11}s` }} />
          ))}
        </span>
      </span>
      {live && (
        <span key={trim ? 't' : 'r'} className="pv-rec-l">
          {trim ? 'Trimming' : 'Recording'}
          {!trim && <span className="pv-rec-n">{n} sec</span>}
        </span>
      )}
    </div>
  );
}

/* b12, his note: "it should start from the top only, not from the bottom ... it has to go after 3 or 4 messages ... don't
   pile up at the bottom". The thread starts under the meter and runs down, four rows at most (her recording or her
   listening counts as one). The fifth pushes the oldest up and away. Its foot stops well above the talk key */
const KEEP = 4;
const OUT_MS = 420;

export function Thread() {
  const thread = usePou((s) => s.thread);
  const speaking = usePou((s) => s.speaking);
  const ended = usePou((s) => s.ended);
  /* before her first note she is already recording it: her face from the meeting lands here */
  const recording = usePou((s) => (!!s.recording && s.speaking) || (!s.ended && s.thread.length === 0));
  const live = usePou((s) => !!s.recording && s.speaking);
  const holding = useHoldUi((s) => s.holding);
  const sending = useHoldUi((s) => s.sending);
  const th = useRef<HTMLDivElement>(null);
  const col = useRef<HTMLDivElement>(null);
  const last = thread[thread.length - 1];
  const waiting = !ended && !speaking && last?.from === 'me';
  /* b17 (his note: "I can't scroll and see all the parts"): the whole conversation stays, the page scrolls */
  const shown = thread;
  const key = shown.map((m) => m.id).join(',');
  const prev = useRef<Msg[]>(shown);
  const tops = useRef(new Map<number, number>());
  const [gone, setGone] = useState<{ m: Msg; top: number }[]>([]);
  const busy = () => usePou.getState().speaking || holding;

  useLayoutEffect(() => {
    const box = col.current;
    const frame = th.current;
    if (!box || !frame) return;
    const top0 = frame.getBoundingClientRect().top;
    const was = prev.current;
    prev.current = shown;
    const left = was.filter((m) => !shown.some((x) => x.id === m.id) && tops.current.has(m.id));
    if (left.length && left.length < KEEP) {
      setGone((g) => [...g, ...left.map((m) => ({ m, top: tops.current.get(m.id) ?? 0 }))]);
      const ids = new Set(left.map((m) => m.id));
      window.setTimeout(() => setGone((g) => g.filter((x) => !ids.has(x.m.id))), OUT_MS);
    }
    const next = new Map<number, number>();
    box.querySelectorAll<HTMLElement>('.pv-row[data-id]:not([data-out])').forEach((el) => {
      const id = Number(el.dataset.id);
      const top = el.getBoundingClientRect().top - top0;
      next.set(id, top);
      const old = tops.current.get(id);
      if (old !== undefined && old !== top && !prefersReduced(el)) {
        el.animate([{ transform: `translateY(${old - top}px)` }, { transform: 'none' }], { duration: 560, easing: SPRING });
      }
    });
    tops.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, recording, waiting, sending]);


  return (
    <div ref={th} className="pv-th">
      {gone.map(({ m, top }) => (
        <div key={`out-${m.id}`} className="pv-out" data-out="1" style={{ top }}>
          <Note m={m} busy={busy} still />
        </div>
      ))}
      <div ref={col} className="pv-col">
        {shown.map((m) => (
          <Note key={m.id} m={m} busy={busy} />
        ))}
        {/* b29 (his note: "the voice note goes and then for .5 sec listening, shimmer, below the user voice note, and then
            the manager recording .5 sec, and then the voice note comes") */}
        {/* b31 (his note: "don't write 'is listening' and all. Just put a bubble and then say, 'Listening to your voice
            note...' Recording, and then it sends it ... a little 1-second or 2-second loader for us to see"): her face
            and one bubble while she takes your note in, then her recording bars, then her note */}
        {waiting && (
          <div className="pv-row pv-lsn" data-from="her" aria-live="polite">
            <Face />
            <span className="pv-lsn-b">
              <span className="pv-lsn-t">Listening to your voice note...</span>
            </span>
          </div>
        )}
        {recording && <Recording first={thread.length === 0} live={live} />}
      </div>
    </div>
  );
}

/* no speech in this browser: type it instead */
export function Typed() {
  const [v, setV] = useState('');
  const speaking = usePou((s) => s.speaking);
  const send = () => {
    if (!v.trim()) return;
    sfx.click();
    pouAnswer(v);
    setV('');
  };
  return (
    <form
      className="pv-type"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Type your answer" aria-label="Your answer" disabled={speaking} />
      <button type="submit" className="pv-send" aria-label="Send" disabled={!v.trim()}>
        <ArrowRight size={16} strokeWidth={2} />
      </button>
    </form>
  );
}

/* the talk key. Click it (or hold Space) and it opens into the recording bar: cancel, your voice live, the time you have
   left, send. Letting go of Space sends too */
const LIVE_BARS = 40;
const REC_S = 120;

export function Hold() {
  const holding = useHoldUi((s) => s.holding);
  const sending = useHoldUi((s) => s.sending);
  const at = useHoldUi((s) => s.at);
  /* b23 (his note: "don't make a loader around the play icon ... the text at the bottom, Shyam Sharma is listening"):
     while your note goes over and she takes it in, the line under the key says so. Then her recording comes in above */
  const speaking = usePou((s) => s.speaking);
  const listening = usePou((s) => !s.ended && !s.speaking && s.thread[s.thread.length - 1]?.from === 'me') || sending;
  const first = usePou((s) => !s.ended && !s.thread.length);
  const [live, setLive] = useState<number[]>(() => Array(LIVE_BARS).fill(0));
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!holding) return;
    setLive(Array(LIVE_BARS).fill(0));
    setNow(Date.now());
    const id = window.setInterval(() => {
      const v = useFlow.getState().ui.micLevel;
      setLive((a) => [...a.slice(1), v]);
      setNow(Date.now());
    }, 70);
    return () => window.clearInterval(id);
  }, [holding]);
  const left = Math.max(0, Math.ceil(REC_S - (now - at) / 1000));
  return (
    <div className="pv-hold">
      <div className="pv-rec" data-on={holding ? '1' : '0'}>
        {holding ? (
          <>
            <button
              type="button"
              className="pv-x"
              aria-label="Cancel"
              onClick={() => {
                sfx.click();
                holdCancel();
              }}
            >
              <X size={18} strokeWidth={2} />
            </button>
            <span className="pv-live" aria-hidden>
              {live.map((v, i) => (
                <i key={i} style={{ height: Math.round(4 + Math.min(1, v * 1.6) * 20) }} />
              ))}
            </span>
            <span className="pv-left" data-low={left <= 10 ? '1' : undefined}>
              {mss(left)}
            </span>
            <button type="button" className="pv-send2" aria-label="Send" onClick={() => holdEnd()}>
              <ArrowUp size={18} strokeWidth={2} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="pv-key"
            aria-label="Talk"
            disabled={sending || speaking || listening || first}
            onClick={(e) => {
              e.currentTarget.blur();
              holdStart();
            }}
          >
            <Mic size={20} strokeWidth={1.8} />
          </button>
        )}
      </div>
      {/* b29: her listening moved up under your note; the line here only says how to talk */}
      <span className="pv-hint" data-on={holding || listening || speaking ? '0' : '1'}>
        Hold Space to talk
      </span>
    </div>
  );
}

/* on the way out every note rises away in turn, the newest last, with the meter and the key. Her face in her last note
   stays where it is: the plan's face grows out of it */
const OUT: Keyframe[] = [
  { transform: 'none', filter: 'blur(0px)', opacity: 1 },
  { transform: 'translateY(-14px) scale(0.98)', filter: 'blur(8px)', opacity: 0 },
];
const OUT_T: KeyframeAnimationOptions = { duration: 300, easing: 'cubic-bezier(.4,0,.7,.2)', fill: 'forwards' };
const STAGGER = 45;

function leaveAll(pv: HTMLElement): number {
  const rows = [...pv.querySelectorAll<HTMLElement>('.pv-row')];
  const hers = rows.filter((r) => r.dataset.from === 'her');
  const keep = hers[hers.length - 1]?.querySelector<HTMLElement>('.pv-face') ?? null;
  pouFaceHand(keep?.getBoundingClientRect() ?? null);
  rows.forEach((r, i) => {
    const parts = keep && r.contains(keep) ? [...r.children].filter((c) => c !== keep) : [r];
    parts.forEach((el) => el.animate(OUT, { ...OUT_T, delay: i * STAGGER }));
  });
  const meter = document.querySelector('.pv-meter');
  meter?.animate(OUT, { ...OUT_T, delay: 40 });
  pv.querySelector('.pv-dock')?.animate(
    [
      { transform: 'none', filter: 'blur(0px)', opacity: 1 },
      { transform: 'translateY(12px) scale(0.96)', filter: 'blur(8px)', opacity: 0 },
    ],
    OUT_T
  );
  return Number(OUT_T.duration) + Math.max(0, rows.length - 1) * STAGGER;
}

/* Space is the talk key here: down to talk, up to send, Escape lets it go */
const herTurn = () => {
  const p = usePou.getState();
  return !p.ended && (p.speaking || !p.thread.length || p.thread[p.thread.length - 1]?.from === 'me');
};

export function useSpaceTalk(hear: boolean) {
  useEffect(() => {
    if (!hear) return;
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== 'Escape') return;
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || isTextEntry(e.target)) return;
      if (e.key === 'Escape') {
        holdCancel();
        return;
      }
      e.preventDefault();
      /* b31 (his note: "when she has sent the voice note as the last thing ... the mic should be disabled"): her turn */
      if (!e.repeat && !herTurn()) holdStart();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTextEntry(e.target)) return;
      e.preventDefault();
      holdEnd();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      holdCancel();
    };
  }, [hear]);
}

export default function PouView() {
  const ended = usePou((s) => s.ended);
  const goto = useFlow((s) => s.actions.goto);
  const [hear] = useState(canHear);
  const pvRef = useRef<HTMLDivElement>(null);
  const scRef = useRef<HTMLDivElement>(null);
  const going = useRef(false);

  const leave = useCallback(() => {
    if (going.current) return;
    going.current = true;
    sfx.click();
    const pv = pvRef.current;
    if (!pv || prefersReduced(pv)) {
      goto('objective');
      return;
    }
    window.setTimeout(() => goto('objective'), leaveAll(pv) - 60);
  }, [goto]);

  /* b17: each new note, the listening dots, her recording and the Continue key scroll into view under the last note */
  const count = usePou((s) => s.thread.length);
  const speaking = usePou((s) => s.speaking);
  const sending = useHoldUi((s) => s.sending);
  useEffect(() => {
    const sc = scRef.current;
    if (!sc) return;
    const id = window.setTimeout(() => sc.scrollTo({ top: sc.scrollHeight, behavior: prefersReduced(sc) ? 'auto' : 'smooth' }), 60);
    return () => window.clearTimeout(id);
  }, [count, speaking, ended, sending]);

  useDevAction('pou-answer', 'Answer for me', pouAnswerForMe, !ended);
  useDevAction('pou-go', 'Continue', leave, ended);

  useSpaceTalk(hear);

  return (
    <div ref={pvRef} className="pv">
      <div ref={scRef} className="pv-sc">
        <Thread />
      </div>
      <div className="pv-dock">
        {ended ? (
          <button
            type="button"
            className="pv-go"
            autoFocus
            onClick={leave}
          >
            Continue
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        ) : hear ? (
          <Hold />
        ) : (
          <Typed />
        )}
      </div>
    </div>
  );
}
