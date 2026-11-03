/* b36's check-in card, light. It grows out of its mark on the timeline, her face flies in from the corner of the film,
   the points she listens for sit blurred until you say them, her voice notes and your answers stack in one thread,
   and you answer by holding Space (or the mic key) or by typing. One card for the note check and the check-in after the meeting. */
import { Fragment, memo, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { ArrowUp, Captions, Keyboard, Mic, Pause, Play, X } from 'lucide-react';
import { useFlow } from '../engine/store';
import { pop, prefersReduced, SPRING } from '../stage/parts/util';
import { CARD_W, placeCard, ringArcs, type CardPlace } from './cardGeo';
import { answer, canHear, holdCancel, holdEnd, holdPointer, useHoldUi } from './hold';
import { ncDone, useNc } from './notesCheck';
import { barsFor, usePeaks } from './peaks';
import { usePou } from './pou';
import { sfx } from './prefs';
import { replayNote, useNote, type CardState, type Msg } from './talk';
import { mss } from './timeline';

export type CardSrc = 'notes' | 'pou';
type Phase = 'off' | 'in' | 'show' | 'closing';

const ICON = { size: 16, strokeWidth: 2 };

const Words = memo(function Words({ text, n }: { text: string; n: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="rm-lw" data-on={i < n ? '1' : '0'}>
            {w}
          </span>{' '}
        </Fragment>
      ))}
    </>
  );
});

function HerNote({ m, busy }: { m: Msg & { take: { url: string; dur: number } }; busy: () => boolean }) {
  const peaks = usePeaks(m.take.url);
  const bars = barsFor(m.take.dur, peaks);
  const playing = useNote((s) => s.id === m.id);
  const p = useNote((s) => (s.id === m.id ? s.p : 1));
  const [open, setOpen] = useState(false);
  const lit = Math.round(p * bars.length);
  return (
    <div className="rm-row" data-from="her" data-open={open ? '1' : '0'}>
      <div className="rm-vn">
        <button
          type="button"
          className="rm-pb"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={(e) => {
            e.stopPropagation();
            replayNote(m, busy());
          }}
        >
          {playing ? <Pause size={13} strokeWidth={2} fill="currentColor" /> : <Play size={13} strokeWidth={2} fill="currentColor" />}
        </button>
        <span className="rm-wv" aria-hidden>
          {bars.map((h, i) => (
            <i key={i} style={{ height: h }} data-on={i < lit ? '1' : '0'} />
          ))}
        </span>
        <span className="rm-dd">{mss(playing ? m.take.dur * (1 - p) + 0.999 : m.take.dur + 0.5)}</span>
      </div>
      <button type="button" className="rm-trb" aria-label="Read it" aria-pressed={open} onClick={() => setOpen(!open)}>
        <Captions size={16} strokeWidth={1.75} />
      </button>
      {open && <p className="rm-trt">{m.text}</p>}
    </div>
  );
}

function Row({ m, stream, busy }: { m: Msg; stream: number | null; busy: () => boolean }) {
  const el = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const r = el.current?.firstElementChild as HTMLElement | null;
    if (!r || prefersReduced(r)) return;
    r.animate([{ transform: 'scale(.7)' }, { transform: 'none' }], { duration: 520, easing: SPRING });
  }, []);
  let body;
  if (m.from === 'me') {
    body = (
      <div className="rm-row" data-from="me">
        <p className="rm-trt">{m.text}</p>
      </div>
    );
  } else if (m.take) {
    body = <HerNote m={m as Msg & { take: { url: string; dur: number } }} busy={busy} />;
  } else {
    body = (
      <div className="rm-row" data-from="her" data-live="1">
        <p className="rm-trt">{stream === null ? m.text : <Words text={m.text} n={stream} />}</p>
      </div>
    );
  }
  return (
    <div ref={el} className="rm-rw" data-from={m.from}>
      {body}
    </div>
  );
}

function Line({ text, state }: { text: string; state: string }) {
  const el = useRef<HTMLLIElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (state !== 'open') pop(el.current, 0.5);
  }, [state]);
  return (
    <li ref={el} className="rm-ln" data-state={state} aria-hidden={state === 'open'}>
      <i className="rm-lnk">
        {state === 'said' && (
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden>
            <path d="M3.2 8.4l3.1 3.1 6.5-7" />
          </svg>
        )}
      </i>
      <span>{text}</span>
    </li>
  );
}

function Halo({ st, face, alt, wait, imgRef }: { st: CardState; face?: string; alt: string; wait: boolean; imgRef: RefObject<HTMLImageElement | null> }) {
  const vr = useRef<HTMLSpanElement>(null);
  const arcs = ringArcs(Math.max(1, st.lines.length));
  const filled = st.lines.filter((l) => l.state === 'said').length;
  const done = useRef(filled);

  /* the circle behind her face follows her voice, b36's gain for the card */
  useEffect(() => {
    let s = 0;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const g = useFlow.getState().ui.level;
      s += (g - s) * (1 - Math.exp(-dt / (g > s ? 0.04 : 0.13)));
      const el = vr.current;
      if (el) {
        el.style.visibility = s > 0.015 ? 'visible' : 'hidden';
        el.style.transform = `scale(${(1 + s * 0.2).toFixed(3)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* each point you say fills the next arc and her face nods */
  useEffect(() => {
    if (filled > done.current && !st.won) pop(imgRef.current, 0.5);
    done.current = filled;
  }, [filled, st.won, imgRef]);

  return (
    <span className="rm-halo" data-won={st.won ? '1' : '0'}>
      <svg viewBox="0 0 104 104" aria-hidden>
        {arcs.map((d, i) => (
          <path key={`t${i}`} className="rm-tk" d={d} />
        ))}
        {arcs.map((d, i) => (
          <path key={`f${i}`} className="rm-fl" pathLength={1} d={d} data-on={i < filled || st.won ? '1' : '0'} />
        ))}
      </svg>
      <span ref={vr} className="rm-hvr" />
      {face && <img ref={imgRef} src={face} alt={alt} draggable={false} data-wait={wait ? '1' : '0'} />}
    </span>
  );
}

function Answer({ src, st }: { src: CardSrc; st: CardState }) {
  const hold = useHoldUi();
  const [typing, setTyping] = useState(() => !canHear());
  const [text, setText] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const asked = useNc((s) => s.asked);
  const canFinish = src === 'notes' && asked && !st.ended;

  useEffect(() => {
    if (typing) field.current?.focus({ preventScroll: true });
  }, [typing]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    sfx.click();
    setText('');
    answer(t);
  };

  const done = canFinish ? (
    <button
      type="button"
      className="rm-done"
      onClick={() => {
        sfx.click();
        ncDone();
      }}
    >
      That's all
    </button>
  ) : (
    <span />
  );

  if (typing) {
    return (
      <div className="rm-mic" data-mode="type">
        {canHear() ? (
          <button type="button" className="rm-mx" aria-label="Talk instead" onClick={() => setTyping(false)}>
            <Mic {...ICON} />
          </button>
        ) : (
          <span />
        )}
        <form
          className="rm-field"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            ref={field}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') e.currentTarget.blur();
            }}
            placeholder={src === 'notes' ? 'A note, then Enter' : 'Type your answer'}
            aria-label={src === 'notes' ? 'Your note' : 'Your answer'}
          />
          <button type="submit" className="rm-ms" aria-label="Send" disabled={!text.trim()}>
            <ArrowUp {...ICON} />
          </button>
        </form>
        {done}
      </div>
    );
  }

  if (hold.holding || hold.sending) {
    return (
      <div className="rm-mic" data-mode="rec">
        <div className="rm-rec">
          <button type="button" className="rm-mx" aria-label="Cancel" onClick={() => holdCancel()}>
            <X {...ICON} />
          </button>
          <span className="rm-heard" data-sending={hold.sending ? '1' : '0'}>
            {hold.heard || 'Listening'}
          </span>
          <button type="button" className="rm-ms" aria-label="Send" onClick={() => holdEnd()}>
            <ArrowUp {...ICON} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rm-mic" data-mode="talk">
      <button type="button" className="rm-mx" aria-label="Type instead" onClick={() => setTyping(true)}>
        <Keyboard {...ICON} />
      </button>
      <button type="button" className="rm-mb" aria-label="Hold Space to talk" title="Hold Space to talk" onPointerDown={(e) => holdPointer(e)}>
        <Mic size={22} strokeWidth={2} />
      </button>
      {done}
    </div>
  );
}

export default function CheckCard({
  src,
  open,
  mark,
  frame,
  faceFrom,
  onClosed,
}: {
  src: CardSrc;
  open: boolean;
  mark: number;
  frame: RefObject<HTMLDivElement | null>;
  faceFrom: () => HTMLElement | null;
  onClosed: () => void;
}) {
  const nc = useNc();
  const pu = usePou();
  const manager = useFlow((s) => s.project?.manager);
  const live: CardState = src === 'notes' ? nc : pu;
  const snap = useRef<{ st: CardState; src: CardSrc }>({ st: live, src });
  if (open) snap.current = { st: live, src };
  const { st, src: shownSrc } = open ? { st: live, src } : snap.current;

  const [phase, setPhase] = useState<Phase>('off');
  const [place, setPlace] = useState<CardPlace | null>(null);
  const [wait, setWait] = useState(true);
  const card = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const fly = useRef<HTMLImageElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const busy = () => st.speaking || useHoldUi.getState().holding;

  const measure = (): CardPlace | null => {
    const fr = frame.current;
    const m = fr?.querySelector(`.rm-mark[data-k="${mark}"]`);
    if (!fr || !m) return null;
    return placeCard(m.getBoundingClientRect(), fr.getBoundingClientRect());
  };

  /* open: sit above the mark. Close: shrink back into it */
  useLayoutEffect(() => {
    if (open) {
      setPlace(measure());
      setWait(true);
      setPhase('in');
    } else if (phaseRef.current === 'in' || phaseRef.current === 'show') {
      setPhase('closing');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mark]);

  useEffect(() => {
    if (phase !== 'show' && phase !== 'in') return;
    const again = () => setPlace(measure());
    window.addEventListener('resize', again);
    return () => window.removeEventListener('resize', again);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mark]);

  /* frame rects inside the film, for the face that flies between the corner and the card */
  const rel = (r: DOMRect) => {
    const f = frame.current?.getBoundingClientRect();
    return f ? { x: r.left - f.left, y: r.top - f.top, w: r.width } : { x: r.left, y: r.top, w: r.width };
  };

  useLayoutEffect(() => {
    const c = card.current;
    if (phase === 'in') {
      if (!c) return;
      c.dataset.measure = '1';
      const target = img.current?.getBoundingClientRect();
      delete c.dataset.measure;
      void c.offsetWidth;
      const id = requestAnimationFrame(() => setPhase('show'));
      const from = faceFrom()?.getBoundingClientRect();
      const f = fly.current;
      if (!target || !from || !f || prefersReduced(c)) {
        setWait(false);
        return () => cancelAnimationFrame(id);
      }
      const a = rel(from);
      const b = rel(target);
      Object.assign(f.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.w}px`, visibility: 'visible' });
      const anim = f.animate([{ transform: `translate(${a.x - b.x}px, ${a.y - b.y}px) scale(${a.w / b.w})` }, { transform: 'none' }], {
        duration: 820,
        delay: 120,
        easing: 'cubic-bezier(.3,1.18,.4,1)',
        fill: 'backwards',
      });
      const land = () => {
        f.style.visibility = 'hidden';
        setWait(false);
      };
      anim.finished.then(land, land);
      return () => cancelAnimationFrame(id);
    }
    if (phase === 'closing') {
      const from = img.current?.getBoundingClientRect();
      const to = faceFrom()?.getBoundingClientRect();
      const f = fly.current;
      if (from && to && f && c && !prefersReduced(c)) {
        const a = rel(from);
        const b = rel(to);
        Object.assign(f.style, { left: `${a.x}px`, top: `${a.y}px`, width: `${a.w}px`, height: `${a.w}px`, visibility: 'visible' });
        setWait(true);
        const anim = f.animate([{ transform: 'none' }, { transform: `translate(${b.x - a.x}px, ${b.y - a.y}px) scale(${b.w / a.w})` }], {
          duration: 720,
          easing: 'cubic-bezier(.6,0,.25,1)',
          fill: 'forwards',
        });
        const gone = () => {
          f.style.visibility = 'hidden';
          anim.cancel();
        };
        anim.finished.then(gone, gone);
      }
      const id = window.setTimeout(() => {
        setPhase('off');
        onClosed();
      }, 740);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* the newest note stays in view */
  useLayoutEffect(() => {
    const el = thread.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: st.thread.length > 2 ? 'smooth' : 'auto' });
  }, [st.thread.length]);

  /* all of them said: every line rings once, in turn */
  useEffect(() => {
    if (!st.won || !card.current) return;
    card.current.querySelectorAll<HTMLElement>('.rm-ln').forEach((el, i) => {
      window.setTimeout(() => pop(el, 0.5), i * 150);
    });
    if (!prefersReduced(card.current)) {
      card.current.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.022)', offset: 0.34 }, { transform: 'scale(1)' }], { duration: 600, easing: SPRING });
    }
  }, [st.won]);

  if (phase === 'off') return null;
  const p = place ?? { left: 16, bottom: 72, maxH: 480, originX: CARD_W / 2 };
  return (
    <>
      <div
        ref={card}
        className="rm-pop"
        data-phase={phase}
        role="dialog"
        aria-label={`Check in with ${manager?.name ?? 'your manager'}`}
        onClick={(e) => e.stopPropagation()}
        style={{ left: p.left, bottom: p.bottom, maxHeight: p.maxH, transformOrigin: `${p.originX}px calc(100% + 26px)` }}
      >
        <div className="rm-pop-b">
          <div className="b-who rm-who">
            <Halo st={st} face={manager?.face} alt={manager?.full ?? ''} wait={wait} imgRef={img} />
            <span className="b-who-t">
              <span className="b-who-n">{manager?.name}</span>
              <span className="b-who-r">Manager</span>
            </span>
          </div>
          <ol className="rm-lns">
            {st.lines.map((l, i) => (
              <Line key={i} text={l.text} state={l.state} />
            ))}
          </ol>
          <div ref={thread} className="rm-thread">
            {st.thread.map((m) => (
              <Row key={m.id} m={m} stream={st.stream?.id === m.id ? st.stream.n : null} busy={busy} />
            ))}
          </div>
          {!st.ended && phase !== 'closing' && <Answer src={shownSrc} st={st} />}
        </div>
      </div>
      {manager?.face && <img ref={fly} className="rm-fly" src={manager.face} alt="" draggable={false} />}
    </>
  );
}
