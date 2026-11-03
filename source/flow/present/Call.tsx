/* b36 (his note, 4 Nov: "our design system, our color, our fonts, our styling"): stage 5's live call, built in the stage's
   own language instead of the dev room. One flow, start to end: the lobby with its three checks, the call with Eryn, the
   screen you share, five minutes on your deck, her three questions, her feedback, and the end of the project. Every tile is
   locked to 16:9, the voice is the browser's own (free), and nothing asks for a camera, a mic or a screen. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactElement, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import {
  Captions,
  CaptionsOff,
  Check,
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  ScreenShare,
  ScreenShareOff,
  Video,
  VideoOff,
} from 'lucide-react';
import { clock } from '../clock';
import { hushSpeech, speak } from '../engine/speak';
import { rise } from '../stage/parts/util';
import { awardXp, intoLevel, levelOf, useXp, XP_START } from '../hud';
import { fakeCam } from './fakeCam';
import { CALL, CHECKS, DECK, ERYN, FEEDBACK, FINISH, GREET, ME, PRESENT_LINES, QA, type Moment } from './callScript';
import './call.css';

export type CallStep = 'lobby' | 'call' | 'present' | 'qa' | 'report' | 'finish';
type Phase = 'lobby' | 'greet' | 'pick' | 'present' | 'offer' | 'qa' | 'closing' | 'review' | 'report' | 'finish';
type Who = 'eryn' | 'me';
interface Cap {
  who: Who;
  text: string;
  n: number;
}

const START: Record<CallStep, Phase> = { lobby: 'lobby', call: 'greet', present: 'present', qa: 'offer', report: 'report', finish: 'finish' };
const IN_CALL: readonly Phase[] = ['greet', 'pick', 'present', 'offer', 'qa', 'closing'];
const WORD_MS = 290;
const REVIEW_MS = 3400;
const CHECK_MS = 1100;
const REPLAY_TICK = 100;

const wait = (ms: number) => new Promise<void>((res) => clock.setTimeout(res, ms));
const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.round(s)) % 60).padStart(2, '0')}`;
const wordsOf = (t: string) => t.trim().split(/\s+/).filter(Boolean);
const slideAt = (t: number) => (t < 60 ? 0 : t < 120 ? 1 : 2);

function useFit(ref: RefObject<HTMLElement | null>, ratio = 16 / 9) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      const w = Math.floor(Math.min(W, H * ratio));
      setBox((b) => (b.w === w ? b : { w, h: Math.floor(w / ratio) }));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, ratio]);
  return box;
}

function SelfVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    const cam = fakeCam();
    if (!v || !cam) return;
    v.srcObject = cam;
    void v.play().catch(() => {});
  }, []);
  return <video ref={ref} className="zc-media" muted playsInline autoPlay />;
}

/* b36 (his note: "how it is there inside Google Meet ... a profile in the circular center, and that just has an audio
   integration"): her face is a circle, the ring around it moves with her voice */
const rings = new Set<HTMLElement>();
const voiceLevel = (v: number) => rings.forEach((el) => el.style.setProperty('--lv', v.toFixed(3)));

function Face({ who, speaking = false }: { who: Who; speaking?: boolean }) {
  const ring = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ring.current;
    if (!el || who !== 'eryn') return;
    rings.add(el);
    return () => {
      rings.delete(el);
    };
  }, [who]);
  return (
    <span className="zc-face" data-who={who} data-speaking={speaking}>
      <span ref={ring} className="zc-ring" aria-hidden />
      <img src={who === 'eryn' ? ERYN.img : ME.img} alt="" draggable={false} />
    </span>
  );
}

/* the one raised thing in the call: whoever has the floor, a 16:9 surface with their face in the middle */
function Focus({ speaking }: { speaking: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const { w, h } = useFit(wrap);
  return (
    <div className="zc-fit" ref={wrap}>
      {w > 0 && (
        <figure className="zc-focus" style={{ width: w, height: h }} data-speaking={speaking}>
          <Face who="eryn" speaking={speaking} />
          <figcaption className="zc-name">{ERYN.short}</figcaption>
        </figure>
      )}
    </div>
  );
}

/* you, on the ground: just the video, no card around it */
function Self({ cam, mic, speaking = false, className = '' }: { cam: boolean; mic: boolean; speaking?: boolean; className?: string }) {
  return (
    <figure className={`zc-self ${className}`} data-speaking={speaking}>
      {cam ? <SelfVideo /> : <Face who="me" speaking={speaking} />}
      <figcaption className="zc-name">
        {!mic && <MicOff size={12} strokeWidth={2} />}
        {ME.name}
      </figcaption>
    </figure>
  );
}

function Person({ who, speaking }: { who: Who; speaking: boolean }) {
  return (
    <div className="zc-person" data-speaking={speaking}>
      <Face who={who} speaking={speaking} />
      <span className="zc-person-t">
        <span className="zc-person-n">{who === 'eryn' ? ERYN.name : ME.name}</span>
        <span className="zc-person-r">{who === 'eryn' ? (speaking ? 'Speaking' : ERYN.role) : 'You'}</span>
      </span>
    </div>
  );
}

function Caption({ cap, on, label }: { cap: Cap | null; on: boolean; label?: string }) {
  if (!on || !cap) return <div className="zc-cap" />;
  const words = wordsOf(cap.text);
  return (
    <div className="zc-cap" key={cap.text}>
      <span className="zc-cap-who">
        {cap.who === 'eryn' ? ERYN.short : ME.name}
        {label && <span className="zc-cap-n">{label}</span>}
      </span>
      <p className="zc-cap-tx">
        {words.map((w, i) => (
          <span key={i} data-said={i < cap.n}>
            {w}{' '}
          </span>
        ))}
      </p>
    </div>
  );
}

function SlideView({ i }: { i: number }) {
  const s = DECK.slides[i];
  return (
    <div className="zc-slide">
      <span className="zc-slide-k">{s.k}</span>
      <h3 className="zc-slide-t">{s.t}</h3>
      <ul className="zc-slide-b">
        {s.b.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <footer className="zc-slide-f">
        <span>{DECK.file}</span>
        <span>{i + 1}</span>
      </footer>
    </div>
  );
}

function Share({ slide, onSlide }: { slide: number; onSlide: (i: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const { w, h } = useFit(wrap);
  const last = DECK.slides.length - 1;
  return (
    <div className="zc-fit" ref={wrap}>
      {w > 0 && (
        <div className="zc-share" style={{ width: w, height: h, ['--u' as string]: `${w / 100}px` }}>
          <SlideView i={slide} />
          <div className="zc-sbar">
            <button type="button" aria-label="Previous slide" disabled={slide === 0} onClick={() => onSlide(slide - 1)}>
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <span>
              {slide + 1} of {last + 1}
            </span>
            <button type="button" aria-label="Next slide" disabled={slide === last} onClick={() => onSlide(slide + 1)}>
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Pick({ onCancel, onShare }: { onCancel: () => void; onShare: () => void }) {
  const [sel, setSel] = useState(0);
  const sheet = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => rise(sheet.current, { y: 16, blur: 6, scale: 0.98, ms: 460 }), []);
  return (
    <>
      <div className="zc-scrim" onClick={onCancel} />
      <div className="zc-sheet" ref={sheet} role="dialog" aria-label="Share your screen">
        <h2 className="zc-sheet-h">Share your screen</h2>
        <div className="zc-opts">
          <button type="button" className="zc-opt" data-on={sel === 0} onClick={() => setSel(0)}>
            <span className="zc-opt-th" style={{ ['--u' as string]: '2.4px' }}>
              <SlideView i={0} />
            </span>
            <span className="zc-opt-l">
              <img src="static/logos/logo-slides.svg" alt="" />
              {DECK.file}
            </span>
          </button>
          <button type="button" className="zc-opt" data-on={sel === 1} onClick={() => setSel(1)}>
            <span className="zc-opt-th zc-desk">
              <i />
            </span>
            <span className="zc-opt-l">Entire screen</span>
          </button>
        </div>
        <div className="zc-sheet-f">
          <button type="button" className="zc-pill" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="zc-key" onClick={onShare}>
            Share
          </button>
        </div>
      </div>
    </>
  );
}

function HoldKey({ holding, onStart, onStop }: { holding: boolean; onStart: () => void; onStop: () => void }) {
  const viaPointer = useRef(false);
  return (
    <button
      type="button"
      className="zc-key zc-hold"
      data-holding={holding}
      onPointerDown={(e) => {
        viaPointer.current = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
        onStart();
      }}
      onPointerUp={() => onStop()}
      onClick={() => {
        if (viaPointer.current) {
          viaPointer.current = false;
          return;
        }
        if (holding) onStop();
        else onStart();
      }}
    >
      <Mic size={16} strokeWidth={2} />
      {holding ? 'Release to send' : 'Hold Space to answer'}
    </button>
  );
}

function Review() {
  return (
    <div className="zc-center">
      <Face who="eryn" speaking />
      <p className="zc-center-t">Eryn is writing your feedback</p>
      <span className="zc-track">
        <i style={{ animationDuration: `${REVIEW_MS}ms` }} />
      </span>
    </div>
  );
}

/* b36 (his note: "too much container in the container doesn't make sense ... we just have a video as a surface thing. On
   the right-hand side, it should be super highly detailed ... Everything should be on the ground only. Only one thing should
   be on the surface"): the replay is the one raised thing, her verdict and every moment sit on the ground beside it */
function Report() {
  const [tab, setTab] = useState<'moments' | 'scores'>('moments');
  const [sel, setSel] = useState<Moment | null>(FEEDBACK.moments[3]);
  const [t, setT] = useState(FEEDBACK.moments[3].at);
  const [playing, setPlaying] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const { w, h } = useFit(wrap);
  useEffect(() => {
    if (!playing) return;
    const id = clock.setInterval(() => setT((v) => (v + 1 >= FEEDBACK.length ? (setPlaying(false), FEEDBACK.length) : v + 1)), REPLAY_TICK);
    return () => clock.clearInterval(id);
  }, [playing]);
  const pick = (m: Moment) => {
    setSel(m);
    setT(m.at);
    setPlaying(false);
  };
  const qa = t >= 180;
  const avg = FEEDBACK.scores.reduce((a, s) => a + s.v, 0) / FEEDBACK.scores.length;
  const count = (kind: Moment['kind']) => FEEDBACK.moments.filter((m) => m.kind === kind).length;
  const group = (kind: Moment['kind'], label: string) => (
    <section className="zc-mgroup" data-kind={kind}>
      <h4 className="zc-mgroup-h">
        <i className="zc-dot" />
        {label}
        <span className="zc-num zc-mgroup-c">{count(kind)}</span>
      </h4>
      {FEEDBACK.moments
        .filter((m) => m.kind === kind)
        .map((m) => (
          <button key={m.title} type="button" className="zc-moment" data-kind={m.kind} data-on={sel === m} onClick={() => pick(m)}>
            <span className="zc-num zc-moment-at">{fmt(m.at)}</span>
            <span className="zc-moment-b">
              <span className="zc-moment-t">{m.title}</span>
              <span className="zc-moment-n">{m.note}</span>
              <span className="zc-moment-m">
                <span className="zc-tag">{m.tag}</span>
                <span className="zc-tag">{m.at >= 180 ? 'Questions' : `Slide ${m.slide + 1}`}</span>
              </span>
            </span>
          </button>
        ))}
    </section>
  );
  return (
    <div className="zc-report">
      <div className="zc-replay-col">
        <header className="zc-rhead">
          <img className="zc-avatar" src={ERYN.img} alt="" />
          <span className="zc-rwho">
            <span className="zc-rwho-n">{ERYN.name}</span>
            <span className="zc-rwho-r">{ERYN.role}</span>
          </span>
        </header>
        <h1 className="zc-verdict">{FEEDBACK.verdict}</h1>
        <div className="zc-fit zc-replay-fit" ref={wrap}>
          {w > 0 && (
            <div className="zc-replay" style={{ width: w, height: h, ['--u' as string]: `${w / 100}px` }}>
              {qa ? (
                <div className="zc-replay-call">
                  <Face who="eryn" />
                </div>
              ) : (
                <SlideView i={slideAt(t)} />
              )}
            </div>
          )}
        </div>
        <div className="zc-scrub">
          <button type="button" className="zc-ctl zc-ctl-s" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
          </button>
          <span className="zc-num zc-scrub-t">
            {fmt(t)} / {fmt(FEEDBACK.length)}
          </span>
          <div
            className="zc-scrub-bar"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setT(Math.round(((e.clientX - r.left) / r.width) * FEEDBACK.length));
            }}
          >
            <i className="zc-scrub-fill" style={{ width: `${(t / FEEDBACK.length) * 100}%` }} />
            <i className="zc-scrub-qa" style={{ left: `${(180 / FEEDBACK.length) * 100}%` }} />
            {FEEDBACK.moments.map((m) => (
              <button
                key={m.title}
                type="button"
                className="zc-mark"
                data-kind={m.kind}
                data-on={sel === m}
                aria-label={m.title}
                style={{ left: `${(m.at / FEEDBACK.length) * 100}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  pick(m);
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <aside className="zc-side">
        <div className="zc-sum-top">
          <span className="zc-num zc-avg-v">{avg.toFixed(1)}</span>
          <span className="zc-sum-top-t">
            <span className="zc-band">{FEEDBACK.band}</span>
            <span className="zc-sum-top-c">
              {count('worked')} worked, {count('work')} to work on
            </span>
          </span>
        </div>
        <div className="zc-tabs" role="tablist">
          <button type="button" role="tab" data-on={tab === 'moments'} onClick={() => setTab('moments')}>
            Moments
          </button>
          <button type="button" role="tab" data-on={tab === 'scores'} onClick={() => setTab('scores')}>
            Scores
          </button>
        </div>
        {tab === 'moments' ? (
          <div className="zc-side-b">
            {group('worked', 'What worked')}
            {group('work', 'What to work on')}
          </div>
        ) : (
          <div className="zc-side-b">
            {FEEDBACK.scores.map((s) => (
              <div key={s.name} className="zc-score" data-band={s.v >= 8 ? 'high' : s.v <= 6 ? 'low' : 'mid'}>
                <span className="zc-score-n">{s.name}</span>
                <span className="zc-score-v zc-num">{s.v}</span>
                <span className="zc-score-bar">
                  {Array.from({ length: 10 }, (_, k) => (
                    <i key={k} data-on={k < s.v} />
                  ))}
                </span>
                <span className="zc-score-note">{s.note}</span>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function Finish({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(0);
  const [landed, setLanded] = useState(false);
  const total = useXp((s) => s.total);
  const sum = useRef<HTMLElement>(null);
  const words = wordsOf(FINISH.line);
  useEffect(() => {
    awardXp({ amount: 160, reason: 'Presented to Eryn', id: 'present-final', quiet: true });
    let live = true;
    const s = speak(FINISH.line, 'eryn', { onWord: (k) => live && setN(k), onLevel: (v) => live && voiceLevel(v) });
    void s.done.then(() => (voiceLevel(0), live && clock.setTimeout(() => live && setLanded(true), 500)));
    return () => {
      live = false;
      s.stop();
    };
  }, []);
  useLayoutEffect(() => {
    if (landed) rise(sum.current, { y: 18, blur: 8, scale: 0.98, ms: 560 });
  }, [landed]);
  const level = levelOf(total);
  return (
    <div className="zc-center zc-finish">
      <Face who="eryn" speaking={!landed} />
      <p className="zc-finish-line">
        {words.map((w, i) => (
          <span key={i} data-said={i < n}>
            {w}{' '}
          </span>
        ))}
      </p>
      <section className="zc-sum" ref={sum} data-on={landed}>
        <div className="zc-sum-h">
          <span className="zc-sum-t">{FINISH.title}</span>
          <span className="zc-sum-p">{FINISH.project}</span>
        </div>
        <div className="zc-stats">
          <div>
            <span className="zc-stat-v zc-num">
              {FINISH.stages} of {FINISH.stages}
            </span>
            <span className="zc-stat-l">Stages</span>
          </div>
          <div>
            <span className="zc-stat-v zc-num">+{Math.max(0, total - XP_START)} XP</span>
            <span className="zc-stat-l">This project</span>
          </div>
          <div>
            <span className="zc-stat-v zc-num">Level {level}</span>
            <span className="zc-lvl">
              <i style={{ width: `${Math.round(intoLevel(total) * 100)}%` }} />
            </span>
          </div>
        </div>
        <div className="zc-port">
          <img src="static/logos/logo-slides.svg" alt="" />
          <span className="zc-port-n">{FINISH.portfolio}</span>
          <span className="zc-port-s">
            <Check size={14} strokeWidth={2.2} />
            Added to your portfolio
          </span>
        </div>
        <button type="button" className="zc-key" onClick={onDone}>
          Back to home
        </button>
      </section>
    </div>
  );
}

export function Call({ from, onExit, onDone }: { from: CallStep; onExit: () => void; onDone: () => void }): ReactElement {
  const [phase, setPhase] = useState<Phase>(START[from]);
  const [cap, setCap] = useState<Cap | null>(null);
  const [talking, setTalking] = useState(false);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [cc, setCc] = useState(true);
  const [checked, setChecked] = useState(0);
  const [cue, setCue] = useState(from !== 'lobby' && from !== 'call');
  const [slide, setSlide] = useState(0);
  const [left, setLeft] = useState(CALL.minutes * 60);
  const [ready, setReady] = useState(false);
  const [turn, setTurn] = useState(0);
  const [mine, setMine] = useState(false);
  const [holding, setHolding] = useState(false);
  const run = useRef(0);
  const said = useRef(0);
  const stage = useRef<HTMLElement>(null);
  const cueRef = useRef(cue);
  cueRef.current = cue;

  const say = useCallback(async (text: string, token: number) => {
    if (token !== run.current) return;
    setCap({ who: 'eryn', text, n: 0 });
    setTalking(true);
    const s = speak(text, 'eryn', { onWord: (n) => token === run.current && setCap((c) => (c && c.text === text ? { ...c, n } : c)), onLevel: (v) => token === run.current && voiceLevel(v) });
    await s.done;
    voiceLevel(0);
    if (token === run.current) setTalking(false);
    await wait(520);
  }, []);

  useEffect(() => () => hushSpeech(), []);

  useLayoutEffect(() => {
    stage.current?.querySelectorAll('[data-enter]').forEach((el, i) => rise(el, { y: 14, blur: 6, scale: 0.99, delay: i * 70, ms: 480 }));
  }, [phase === 'pick' ? 'greet' : phase]);

  useEffect(() => {
    if (phase !== 'lobby') return;
    setChecked(0);
    const ids = CHECKS.map((_, i) => clock.setTimeout(() => setChecked(i + 1), 700 + i * CHECK_MS));
    return () => ids.forEach((id) => clock.clearTimeout(id));
  }, [phase]);

  useEffect(() => {
    if (phase === 'pick') return;
    const token = ++run.current;
    const alive = () => token === run.current;
    void (async () => {
      if (phase === 'greet') {
        if (cueRef.current) return;
        await wait(900);
        for (const line of GREET) await say(line, token);
        if (alive()) setCue(true);
      } else if (phase === 'present') {
        await wait(600);
        await say(PRESENT_LINES.start, token);
      } else if (phase === 'offer') {
        setReady(false);
        await wait(700);
        await say(QA.offer, token);
        if (alive()) setReady(true);
      } else if (phase === 'qa') {
        setMine(false);
        await wait(500);
        await say(QA.turns[turn].q, token);
        if (alive()) setMine(true);
      } else if (phase === 'closing') {
        for (const line of QA.closing) await say(line, token);
        if (alive()) setPhase('review');
      } else if (phase === 'review') {
        setCap(null);
        await wait(REVIEW_MS);
        if (alive()) setPhase('report');
      }
    })();
  }, [phase, turn, say]);

  useEffect(() => {
    if (phase !== 'present') return;
    const id = clock.setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clock.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === 'present' && left === 60) void say(PRESENT_LINES.minute, run.current);
  }, [left, phase, say]);

  const start = useCallback(() => {
    if (!mine || holding) return;
    hushSpeech();
    said.current = 0;
    setHolding(true);
    setCap({ who: 'me', text: QA.turns[turn].a, n: 0 });
  }, [mine, holding, turn]);

  const stop = useCallback(() => {
    if (!holding) return;
    setHolding(false);
    if (said.current < 3) {
      setCap({ who: 'eryn', text: QA.turns[turn].q, n: wordsOf(QA.turns[turn].q).length });
      return;
    }
    setMine(false);
    setCap({ who: 'me', text: QA.turns[turn].a, n: wordsOf(QA.turns[turn].a).length });
    const token = ++run.current;
    void (async () => {
      await wait(700);
      await say(QA.turns[turn].ack, token);
      if (token !== run.current) return;
      if (turn + 1 < QA.turns.length) setTurn(turn + 1);
      else setPhase('closing');
    })();
  }, [holding, turn, say]);

  useEffect(() => {
    if (!holding) return;
    const total = wordsOf(QA.turns[turn].a).length;
    const id = clock.setInterval(() => {
      said.current = Math.min(total, said.current + 1);
      setCap((c) => (c && c.who === 'me' ? { ...c, n: said.current } : c));
    }, WORD_MS);
    return () => clock.clearInterval(id);
  }, [holding, turn]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (phase === 'present' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        setSlide((s) => Math.max(0, Math.min(DECK.slides.length - 1, s + (e.key === 'ArrowRight' ? 1 : -1))));
        return;
      }
      if (phase === 'qa' && e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) start();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (phase === 'qa' && e.code === 'Space') stop();
    };
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
    };
  }, [phase, start, stop]);

  const join = () => setPhase('greet');
  const done = () => {
    hushSpeech();
    setPhase('offer');
  };
  const ryn = talking && cap?.who === 'eryn';
  const inCall = IN_CALL.includes(phase);

  const action = (): ReactElement | null => {
    if (phase === 'greet' && cue)
      return (
        <button type="button" className="zc-key" onClick={() => setPhase('pick')}>
          <ScreenShare size={16} strokeWidth={2} />
          Share your screen
        </button>
      );
    if (phase === 'present')
      return (
        <button type="button" className="zc-key" onClick={done}>
          I’m done presenting
        </button>
      );
    if (phase === 'offer' && ready)
      return (
        <button type="button" className="zc-key" onClick={() => (setTurn(0), setPhase('qa'))}>
          I’m ready
        </button>
      );
    if (phase === 'qa' && mine) return <HoldKey holding={holding} onStart={start} onStop={stop} />;
    return null;
  };

  const screen = (): ReactElement => {
    if (phase === 'lobby')
      return (
        <div className="zc-lobby">
          <div className="zc-lobby-cam" data-enter>
            <Self cam={cam} mic={mic} className="zc-self-l" />
            <div className="zc-checks">
              {CHECKS.map((c, i) => (
                <span key={c} className="zc-check" data-ok={i < checked}>
                  {i < checked ? <Check size={12} strokeWidth={2.4} /> : <i />}
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="zc-lobby-side" data-enter>
            <Person who="eryn" speaking={false} />
            <h1 className="zc-h">Ready to present?</h1>
            <p className="zc-sub">Eryn is in the call. Five minutes on your deck, then three questions.</p>
            <button type="button" className="zc-key" disabled={checked < CHECKS.length} onClick={join}>
              Join the call
            </button>
          </div>
        </div>
      );
    if (phase === 'present')
      return (
        <div className="zc-present">
          <div className="zc-present-main" data-enter>
            <span className="zc-sharing">
              <ScreenShare size={12} strokeWidth={2} />
              You are presenting
            </span>
            <Share slide={slide} onSlide={setSlide} />
          </div>
          <aside className="zc-rail" data-enter>
            <Person who="eryn" speaking={ryn} />
            <Self cam={cam} mic={mic} />
            <Caption cap={cap} on={cc} />
          </aside>
        </div>
      );
    if (phase === 'review') return <Review />;
    if (phase === 'report') return <Report />;
    if (phase === 'finish') return <Finish onDone={onDone} />;
    return (
      <div className="zc-callview">
        <div className="zc-stage" data-enter>
          <Focus speaking={ryn} />
          <Self cam={cam} mic={mic} speaking={holding} className="zc-self-float" />
        </div>
        <Caption cap={cap} on={cc} label={phase === 'qa' ? `Question ${turn + 1} of ${QA.turns.length}` : undefined} />
      </div>
    );
  };

  return createPortal(
    /* b36 (his note: "the presenting mode has to be in a dark mode"): the whole call is the dark version */
    <div className="zs2 d1 ds2 zc zd" data-mode="dark" data-phase={phase}>
      <div className="zc-frame">
        <header className="zc-top">
          <div className="zc-crumb">
            <img src="static/logos/logo-spotify.svg" alt="" />
            <span className="zc-crumb-now">{CALL.title}</span>
            <span>{phase === 'report' ? 'Feedback' : CALL.project}</span>
          </div>
          <div className="zc-top-r">
            {phase === 'present' && (
              <span className="zc-pill zc-clock zc-num" data-low={left <= 60}>
                {fmt(left)}
              </span>
            )}
            {phase === 'report' ? (
              <>
                <button type="button" className="zc-pill" onClick={() => (setLeft(CALL.minutes * 60), setSlide(0), setCue(false), setPhase('greet'))}>
                  <RotateCcw size={14} strokeWidth={2} />
                  Redo
                </button>
                <button type="button" className="zc-key zc-key-s" onClick={() => setPhase('finish')}>
                  Add to portfolio
                </button>
              </>
            ) : (
              phase !== 'finish' &&
              phase !== 'review' && (
                <button type="button" className="zc-pill" onClick={onExit}>
                  Leave
                </button>
              )
            )}
          </div>
        </header>
        <main className="zc-main" ref={stage}>
          {screen()}
        </main>
        {inCall && (
          <footer className="zc-dock">
            <button type="button" className="zc-ctl" data-off={!mic} aria-label="Microphone" onClick={() => setMic((v) => !v)}>
              {mic ? <Mic size={16} strokeWidth={2} /> : <MicOff size={16} strokeWidth={2} />}
            </button>
            <button type="button" className="zc-ctl" data-off={!cam} aria-label="Camera" onClick={() => setCam((v) => !v)}>
              {cam ? <Video size={16} strokeWidth={2} /> : <VideoOff size={16} strokeWidth={2} />}
            </button>
            <button type="button" className="zc-ctl" data-off={!cc} aria-label="Captions" onClick={() => setCc((v) => !v)}>
              {cc ? <Captions size={16} strokeWidth={2} /> : <CaptionsOff size={16} strokeWidth={2} />}
            </button>
            <button
              type="button"
              className="zc-ctl"
              data-on={phase === 'present'}
              disabled={phase !== 'present' && !(phase === 'greet' && cue)}
              aria-label={phase === 'present' ? 'Stop sharing' : 'Share your screen'}
              onClick={() => (phase === 'present' ? done() : cue && setPhase('pick'))}
            >
              {phase === 'present' ? <ScreenShareOff size={16} strokeWidth={2} /> : <ScreenShare size={16} strokeWidth={2} />}
            </button>
            {action() && <span className="zc-dock-gap" />}
            {action()}
          </footer>
        )}
      </div>
      {phase === 'pick' && <Pick onCancel={() => setPhase('greet')} onShare={() => (setSlide(0), setPhase('present'))} />}
    </div>,
    document.body
  );
}
