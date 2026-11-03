/* Design 1 (Navid, 3 Nov call): the real stage page, fewer design changes, in our language.
   Left: only the stages, the one you are on filled, collapses to dots. Middle: the chat with her, the brief is the first
   thing she sends and pins to the top once it scrolls away. Right: Resources and Feedback in one panel, its X top right,
   its line drags. The timer counts up and says what each speed is worth. No plan mode, no slots, no work canvas. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock3,
  Download,
  FileText,
  FolderOpen,
  LifeBuoy,
  Lock,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  Plus,
  X,
} from 'lucide-react';
import { useDevAction } from '../dev/store';
import { useFlow } from '../engine/store';
import { speak, hushSpeech } from '../engine/speak';
import { energize } from '../stage/parts/energy';
import { rise } from '../stage/parts/util';
import '../stage/stage.css';
import './d1.css';
import './ds.css';
import { BRIEF, BRIEF_2, FEEDBACK, RAW_FILE, REVIEW_STEPS, TIERS, tierAt } from './script';
import { d1, minutesIn, useD1, type Item } from './store';

const I = { size: 14, strokeWidth: 1.75 };
const briefOf = (id: string) => (id === 'clean' ? BRIEF : BRIEF_2);

/* ---------- top row ---------- */
function useNowMin() {
  const [, set] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => set((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  return minutesIn();
}

const clockOf = (min: number) => {
  const s = Math.max(0, Math.floor(min * 60));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

function Timer() {
  const done = useD1((s) => s.phase === 'done');
  const min = useNowMin();
  const at = tierAt(min);
  return (
    <div className="d1-timer" tabIndex={0} aria-label={`Time on this stage ${clockOf(min)}`}>
      <Clock3 {...I} />
      <span className="d1-num">{clockOf(min)}</span>
      <div className="d1-tip" role="tooltip">
        <div className="d1-tip-h">The faster you finish, the more XP</div>
        {TIERS.map((t, i) => (
          <div key={t.label} className="d1-tier" data-on={i === at || undefined}>
            <span>{t.label}</span>
            <span className="d1-num">{t.xp} XP</span>
          </div>
        ))}
        {!done && <div className="d1-tip-f">No deadline. It counts up, never down.</div>}
      </div>
    </div>
  );
}

function TopBar() {
  const project = useFlow((s) => s.project);
  const stageId = useD1((s) => s.stageId);
  const panel = useD1((s) => s.panel);
  const n = (project?.stages.findIndex((s) => s.id === stageId) ?? 0) + 1;
  return (
    <header className="d1-top" data-enter>
      <div className="d1-top-l">
        <button type="button" className="d1-ghost" aria-label="Back to the project" onClick={() => useFlow.getState().actions.goto('objective')}>
          <ChevronLeft size={16} strokeWidth={1.75} />
        </button>
        {project && <img className="d1-logo" src={project.logo} alt={project.company} />}
        <span className="d1-crumb">{project?.title}</span>
        <span className="d1-sep">/</span>
        <span className="d1-crumb d1-crumb-now">
          Stage {n}, {briefOf(stageId).stage}
        </span>
      </div>
      <div className="d1-top-r">
        <Timer />
        <button
          type="button"
          className="d1-key"
          data-on={panel === 'resources' || undefined}
          onClick={() => (panel === 'resources' ? d1.closePanel() : d1.openPanel('resources'))}
        >
          <FolderOpen {...I} />
          Resources
        </button>
        <span className="zs2-hud-anchor" />
      </div>
    </header>
  );
}

/* ---------- left: only the stages ---------- */
function Rail() {
  const project = useFlow((s) => s.project);
  const stageId = useD1((s) => s.stageId);
  const open = useD1((s) => s.railOpen);
  const phase = useD1((s) => s.phase);
  const cur = project?.stages.findIndex((s) => s.id === stageId) ?? 0;
  if (!project) return null;
  return (
    <nav className="d1-rail" data-open={open || undefined} aria-label="Stages" data-enter>
      <div className="d1-rail-h">
        {open && <span className="d1-rail-t">Stages</span>}
        <button type="button" className="d1-ghost" aria-label={open ? 'Collapse stages' : 'Show stages'} onClick={() => d1.setRail(!open)}>
          {open ? <PanelLeftClose {...I} /> : <PanelLeftOpen {...I} />}
        </button>
      </div>
      <ol className="d1-stages">
        {project.stages.map((s, i) => {
          const state = i < cur || (i === cur && phase === 'done') ? 'done' : i === cur ? 'now' : 'next';
          return (
            <li key={s.id} className="d1-st" data-state={state} title={open ? undefined : s.title}>
              <span className="d1-st-mark">{state === 'done' ? <Check size={11} strokeWidth={2.4} /> : state === 'next' ? <Lock size={10} strokeWidth={2} /> : i + 1}</span>
              {open && <span className="d1-st-name">{s.title}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ---------- the brief she sends ---------- */
function VoiceNote() {
  const stageId = useD1((s) => s.stageId);
  const b = briefOf(stageId);
  const [on, setOn] = useState(false);
  const [p, setP] = useState(0);
  const words = b.voice.split(' ').length;
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);
  const play = () => {
    if (on) {
      stop.current?.();
      return;
    }
    setOn(true);
    setP(0);
    const sp = speak(b.voice, 'eryn', { onWord: (n) => setP(n / words), onLevel: (v) => useFlow.setState((s) => ({ ui: { ...s.ui, level: v } })) });
    stop.current = () => {
      sp.stop();
      hushSpeech();
      setOn(false);
      useFlow.setState((s) => ({ ui: { ...s.ui, level: 0 } }));
    };
    void sp.done.then(() => {
      setP(1);
      stop.current?.();
    });
  };
  const bars = Array.from({ length: 28 }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(i * 1.7 + 0.4)) * (0.5 + 0.5 * Math.abs(Math.cos(i * 0.6))));
  return (
    <button type="button" className="d1-voice" onClick={play} aria-label={on ? 'Pause her voice note' : 'Play her voice note'}>
      <span className="d1-voice-key">{on ? <Pause size={12} strokeWidth={2} /> : <Play size={12} strokeWidth={2} />}</span>
      <span className="d1-voice-bars">
        {bars.map((h, i) => (
          <i key={i} style={{ height: `${Math.round(h * 100)}%` }} data-on={i / bars.length < p || undefined} />
        ))}
      </span>
      <span className="d1-num d1-dim">0:{String(b.voiceSec).padStart(2, '0')}</span>
    </button>
  );
}

function SubmitRow() {
  const link = useD1((s) => s.link);
  const phase = useD1((s) => s.phase);
  const can = useD1((s) => d1.canSubmit(s));
  const left = useD1((s) => FEEDBACK.items.filter((f) => !s.fixed[f.id]).length);
  const label =
    phase === 'review' ? 'Checking' : phase === 'feedback' ? 'Resubmit' : phase === 'work' ? 'Submit' : 'Approved';
  const locked = phase !== 'work' && phase !== 'feedback';
  return (
    <div className="d1-submit">
      <form
        className="d1-link"
        onSubmit={(e) => {
          e.preventDefault();
          d1.submit();
        }}
      >
        <input
          value={link}
          disabled={locked}
          onChange={(e) => d1.setLink(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="Paste your Google Sheet link"
          aria-label="Your Google Sheet link"
        />
        <button type="submit" className="d1-go" disabled={!can} data-done={phase === 'approved' || phase === 'pou' || phase === 'done' || undefined}>
          {locked && phase !== 'review' ? <Check size={13} strokeWidth={2.2} /> : null}
          {label}
        </button>
      </form>
      {phase === 'feedback' && left > 0 && <div className="d1-hint">Tick each fix in her feedback to resubmit</div>}
    </div>
  );
}

function Brief({ pinned = false, onClose }: { pinned?: boolean; onClose?: () => void }) {
  const stageId = useD1((s) => s.stageId);
  const met = useD1((s) => s.met);
  const project = useFlow((s) => s.project);
  const b = briefOf(stageId);
  const [more, setMore] = useState(pinned);
  const n = (project?.stages.findIndex((s) => s.id === stageId) ?? 0) + 1;
  const total = project?.stages.length ?? 5;
  const metN = b.requirements.filter((r) => met[r.id]).length;
  return (
    <article className="d1-brief" data-pinned={pinned || undefined}>
      <div className="d1-brief-h">
        <div className="d1-brief-hl">
          <span className="d1-tag">
            Stage {n} of {total}
          </span>
          <h3 className="d1-brief-t">{b.stage}</h3>
        </div>
        {onClose && (
          <button type="button" className="d1-ghost" aria-label="Close the brief" onClick={onClose}>
            <X {...I} />
          </button>
        )}
      </div>
      <dl className="d1-facts">
        <div>
          <dt>Deliverable</dt>
          <dd>{b.deliverable}</dd>
        </div>
        <div>
          <dt>Format</dt>
          <dd>{b.format}</dd>
        </div>
      </dl>
      <VoiceNote />
      {more && (
        <>
          <section className="d1-sec">
            <div className="d1-sec-h">
              <span>Done when</span>
              <span className="d1-num d1-dim">
                {metN} of {b.requirements.length}
              </span>
            </div>
            {b.requirements.map((r) => (
              <label key={r.id} className="d1-req" data-on={met[r.id] || undefined}>
                <input type="checkbox" checked={!!met[r.id]} onChange={() => d1.tick(r.id)} />
                <span className="d1-box">{met[r.id] && <Check size={11} strokeWidth={2.6} />}</span>
                <span>{r.text}</span>
              </label>
            ))}
          </section>
          {b.tools.length > 0 && (
            <section className="d1-sec">
              <div className="d1-sec-h">
                <span>Tools</span>
              </div>
              <div className="d1-tools">
                {b.tools.map((t) => (
                  <button key={t.id} type="button" className="d1-tool" onClick={() => d1.openPanel('resources', `tool:${t.id}`)}>
                    <img src={t.logo} alt="" />
                    <span>{t.name}</span>
                    <span className="d1-play">
                      <Play size={10} strokeWidth={2.2} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {b.training.length > 0 && (
            <section className="d1-sec">
              <div className="d1-sec-h">
                <span>Training</span>
              </div>
              {b.training.map((t) => (
                <button key={t.id} type="button" className="d1-train" onClick={() => d1.openPanel('resources', `train:${t.id}`)}>
                  <span className="d1-dim">{t.kind}</span>
                  <span>{t.title}</span>
                  <Play size={11} strokeWidth={2} />
                </button>
              ))}
            </section>
          )}
        </>
      )}
      <SubmitRow />
      {!pinned && (
        <button type="button" className="d1-more" onClick={() => setMore(!more)}>
          {more ? 'Show less' : 'Requirements, tools and training'}
          {more ? <ChevronUp {...I} /> : <ChevronDown {...I} />}
        </button>
      )}
    </article>
  );
}

/* ---------- the chat ---------- */
function Words({ text }: { text: string }) {
  const el = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const words = el.current ? Array.from(el.current.querySelectorAll('.d1-w')) : [];
    words.forEach((w, i) => rise(w, { y: 4, blur: 4, delay: i * 26, ms: 520 }));
    energize(words, { step: 26 });
  }, []);
  return (
    <span ref={el}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="d1-w">
          {w}{' '}
        </span>
      ))}
    </span>
  );
}

function Review({ n }: { n: number }) {
  return (
    <div className="d1-review">
      {REVIEW_STEPS.map((s, i) => (
        <div key={s} className="d1-review-row" data-state={i < n ? 'done' : i === n ? 'now' : 'next'}>
          <span className="d1-review-mark">{i < n ? <Check size={11} strokeWidth={2.4} /> : null}</span>
          {s}
        </div>
      ))}
    </div>
  );
}

export function FeedbackCard({ inPanel = false }: { inPanel?: boolean }) {
  const fixed = useD1((s) => s.fixed);
  const phase = useD1((s) => s.phase);
  const can = useD1((s) => d1.canSubmit(s));
  const after = phase !== 'feedback' && phase !== 'review';
  return (
    <div className="d1-fb" data-panel={inPanel || undefined}>
      {FEEDBACK.items.map((f, i) => (
        <label key={f.id} className="d1-fix" data-on={fixed[f.id] || after || undefined}>
          <input type="checkbox" checked={!!fixed[f.id] || after} disabled={after} onChange={() => d1.fix(f.id)} />
          <span className="d1-box">{(fixed[f.id] || after) && <Check size={11} strokeWidth={2.6} />}</span>
          <span className="d1-fix-t">
            <span>
              {i + 1}. {f.text}
            </span>
            <span className="d1-dim">{f.why}</span>
          </span>
        </label>
      ))}
      {phase === 'feedback' && (
        <button type="button" className="d1-go d1-fb-go" disabled={!can} onClick={() => d1.submit()}>
          Resubmit
        </button>
      )}
    </div>
  );
}

function Row({ it }: { it: Item }) {
  const row = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (it.k !== 'her') rise(row.current, { y: 10, blur: 6, ms: 560 });
  }, [it.k]);
  switch (it.k) {
    case 'brief':
      return (
        <div ref={row} className="d1-row d1-row-her" data-brief>
          <Brief />
        </div>
      );
    case 'her':
      return (
        <div ref={row} className="d1-row d1-row-her">
          <div className="d1-bub" data-guide={it.guide || undefined}>
            <Words text={it.text} />
          </div>
        </div>
      );
    case 'file':
      return (
        <div ref={row} className="d1-row d1-row-her">
          <div className="d1-file">
            <img src="static/logos/f-csv.svg" alt="" />
            <span className="d1-file-t">
              <span>{RAW_FILE.name}</span>
              <span className="d1-dim">{RAW_FILE.meta}</span>
            </span>
            <a className="d1-ghost" href={RAW_FILE.url} download aria-label="Download the raw file">
              <Download {...I} />
            </a>
          </div>
        </div>
      );
    case 'me':
      return (
        <div ref={row} className="d1-row d1-row-me">
          <div className="d1-bub d1-me">{it.text}</div>
        </div>
      );
    case 'chips':
      return (
        <div ref={row} className="d1-row d1-row-me">
          {it.options.map((o) => (
            <button key={o} type="button" className="d1-chip" onClick={() => d1.chip(o)}>
              {o}
            </button>
          ))}
        </div>
      );
    case 'review':
      return (
        <div ref={row} className="d1-row d1-row-her">
          <Review n={it.n} />
        </div>
      );
    case 'feedback':
      return (
        <div ref={row} className="d1-row d1-row-her">
          <FeedbackCard />
        </div>
      );
    case 'xp':
      return (
        <div ref={row} className="d1-row d1-row-mid">
          <span className="d1-xp">
            +{it.amount} XP <span className="d1-dim">· {it.label}</span>
          </span>
        </div>
      );
  }
}

function Composer() {
  const [text, setText] = useState('');
  const stuck = useD1((s) => s.stuck);
  const phase = useD1((s) => s.phase);
  const box = useRef<HTMLTextAreaElement>(null);
  const canStuck = phase === 'work' || phase === 'feedback';
  const send = () => {
    if (!text.trim()) return;
    d1.send(text);
    setText('');
    box.current?.focus();
  };
  return (
    <div className="d1-comp" data-stuck={stuck || undefined}>
      <textarea
        ref={box}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={phase === 'pou' ? 'Answer Eryn' : stuck ? 'Tell her where you are' : 'Message Eryn'}
        aria-label="Message your manager"
      />
      <div className="d1-comp-row">
        <button type="button" className="d1-ghost" aria-label="Attach a file">
          <Plus {...I} />
        </button>
        {canStuck && (
          <button type="button" className="d1-stuck" data-on={stuck || undefined} aria-pressed={stuck} onClick={() => d1.toggleStuck()}>
            <LifeBuoy {...I} />
            I'm stuck
          </button>
        )}
        <span className="d1-grow" />
        <button type="button" className="d1-ghost" aria-label="Talk to her">
          <Mic {...I} />
        </button>
        <button type="button" className="d1-send" aria-label="Send" disabled={!text.trim()} onClick={send}>
          <ArrowUp size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function Chat() {
  const project = useFlow((s) => s.project);
  const thread = useD1((s) => s.thread);
  const typing = useD1((s) => s.typing);
  const stuck = useD1((s) => s.stuck);
  const scroller = useRef<HTMLDivElement>(null);
  const [briefGone, setBriefGone] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const stageId = useD1((s) => s.stageId);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [thread.length, typing]);

  useEffect(() => {
    const el = scroller.current?.querySelector('[data-brief]');
    if (!el || !scroller.current) return;
    const io = new IntersectionObserver(([e]) => setBriefGone(!e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0)), {
      root: scroller.current,
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [thread.length > 0, stageId]);

  useEffect(() => {
    if (!briefGone) setPinOpen(false);
  }, [briefGone]);

  const m = project?.manager;
  return (
    <section className="d1-chat" data-enter>
      <div className="d1-who" data-stuck={stuck || undefined}>
        <span className="d1-face">
          {m && <img src={m.face} alt={m.full} />}
        </span>
        <span className="d1-who-t">
          <span>{m?.full}</span>
          <span className="d1-dim">{stuck ? 'Guiding you step by step' : m?.role}</span>
        </span>
      </div>
      {briefGone && (
        <div className="d1-pin">
          {!pinOpen ? (
            <button type="button" className="d1-pin-bar" onClick={() => setPinOpen(true)}>
              <span className="d1-tag">Brief</span>
              <span className="d1-pin-t">{briefOf(stageId).deliverable}</span>
              <span className="d1-dim">{briefOf(stageId).format}</span>
              <ChevronDown {...I} />
            </button>
          ) : (
            <div className="d1-pin-sheet">
              <Brief pinned onClose={() => setPinOpen(false)} />
            </div>
          )}
        </div>
      )}
      <div ref={scroller} className="d1-scroll">
        <div className="d1-thread">
          {thread.map((it) => (
            <Row key={it.id} it={it} />
          ))}
          {typing && (
            <div className="d1-row d1-row-her">
              <div className="d1-typing" aria-label="Eryn is typing">
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="d1-comp-wrap">
        <Composer />
      </div>
    </section>
  );
}

/* ---------- right: Resources and Feedback ---------- */
function ResourceView({ view }: { view: string }) {
  const [kind, id] = view.split(':');
  const b = BRIEF;
  const tool = kind === 'tool' ? b.tools.find((t) => t.id === id) : undefined;
  const tr = kind === 'train' ? b.training.find((t) => t.id === id) : undefined;
  const steps = tool?.film ?? tr?.steps ?? [];
  const [at, setAt] = useState(0);
  useEffect(() => {
    setAt(0);
    const t = window.setInterval(() => setAt((n) => Math.min(steps.length, n + 1)), 1400);
    return () => window.clearInterval(t);
  }, [view, steps.length]);
  return (
    <div className="d1-view">
      <button type="button" className="d1-back" onClick={() => d1.openPanel('resources')}>
        <ChevronLeft {...I} />
        Resources
      </button>
      <div className="d1-view-h">
        {tool && <img src={tool.logo} alt="" />}
        <span>{tool ? `${tool.name} in 3 moves` : tr?.title}</span>
      </div>
      <ol className="d1-view-steps">
        {steps.map((s, i) => (
          <li key={s} data-on={i < at || undefined}>
            <span className="d1-num">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Resources() {
  const view = useD1((s) => s.view);
  const stageId = useD1((s) => s.stageId);
  if (view) return <ResourceView view={view} />;
  const b = briefOf(stageId);
  return (
    <div className="d1-res">
      <div className="d1-sec-h">
        <span>Files</span>
      </div>
      <div className="d1-res-row">
        <FileText {...I} />
        <span className="d1-file-t">
          <span>{RAW_FILE.name}</span>
          <span className="d1-dim">{RAW_FILE.meta}</span>
        </span>
        <a className="d1-ghost" href={RAW_FILE.url} download aria-label="Download">
          <Download {...I} />
        </a>
      </div>
      {b.tools.length > 0 && (
        <>
          <div className="d1-sec-h">
            <span>Tools</span>
          </div>
          {b.tools.map((t) => (
            <button key={t.id} type="button" className="d1-res-row" onClick={() => d1.openPanel('resources', `tool:${t.id}`)}>
              <img src={t.logo} alt="" />
              <span className="d1-file-t">
                <span>{t.name}</span>
                <span className="d1-dim">How to use it here</span>
              </span>
              <span className="d1-play">
                <Play size={10} strokeWidth={2.2} />
              </span>
            </button>
          ))}
        </>
      )}
      {b.training.length > 0 && (
        <>
          <div className="d1-sec-h">
            <span>Training</span>
          </div>
          {b.training.map((t) => (
            <button key={t.id} type="button" className="d1-res-row" onClick={() => d1.openPanel('resources', `train:${t.id}`)}>
              <span className="d1-file-t">
                <span>{t.title}</span>
                <span className="d1-dim">{t.kind}</span>
              </span>
              <span className="d1-play">
                <Play size={10} strokeWidth={2.2} />
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

function Panel() {
  const panel = useD1((s) => s.panel);
  const w = useD1((s) => s.panelW);
  const hasFb = useD1((s) => s.thread.some((i) => i.k === 'feedback'));
  const box = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    if (panel) rise(box.current, { y: 0, blur: 8, scale: 0.98, ms: 520 });
  }, [panel !== null]);
  if (!panel) return null;
  return (
    <>
      <div
        className="d1-grip"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the panel"
        tabIndex={0}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, w };
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* a synthetic pointer still drags */
          }
        }}
        onPointerMove={(e) => {
          if (drag.current && e.buttons) d1.setPanelW(drag.current.w + (drag.current.x - e.clientX));
        }}
        onPointerUp={() => (drag.current = null)}
        onDoubleClick={() => d1.setPanelW(340)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') d1.setPanelW(w + 16);
          if (e.key === 'ArrowRight') d1.setPanelW(w - 16);
        }}
      />
      <aside ref={box} className="d1-panel" style={{ width: w }}>
        <div className="d1-panel-h">
          <div className="d1-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={panel === 'resources'} onClick={() => d1.openPanel('resources')}>
              Resources
            </button>
            <button type="button" role="tab" aria-selected={panel === 'feedback'} onClick={() => d1.openPanel('feedback')}>
              Feedback
            </button>
          </div>
          <button type="button" className="d1-ghost" aria-label="Close" onClick={() => d1.closePanel()}>
            <X {...I} />
          </button>
        </div>
        <div className="d1-panel-b">
          {panel === 'resources' ? (
            <Resources />
          ) : hasFb ? (
            <>
              <div className="d1-fb-h">{FEEDBACK.head}</div>
              <FeedbackCard inPanel />
            </>
          ) : (
            <div className="d1-empty">Her feedback lands here after you submit.</div>
          )}
        </div>
      </aside>
    </>
  );
}

export default function StageD1() {
  const engineStage = useFlow((s) => s.stage?.stageId ?? 'clean');
  const root = useRef<HTMLDivElement>(null);
  const light = useFlow((s) => s.ui.lightStage);

  useEffect(() => {
    if (useD1.getState().stageId !== engineStage || useD1.getState().thread.length === 0) d1.begin(engineStage);
  }, [engineStage]);
  useEffect(() => () => d1.stop(), []);

  useLayoutEffect(() => {
    root.current?.querySelectorAll('[data-enter]').forEach((el, i) => rise(el, { y: 14, blur: 0, scale: 0.99, delay: i * 80, ms: 480 }));
  }, []);

  useDevAction('d1-link', 'Paste a sheet link', () => d1.setLink('https://docs.google.com/spreadsheets/d/1spotify-clean/edit'));
  useDevAction('d1-fix', 'Tick every fix', () => FEEDBACK.items.forEach((f) => !useD1.getState().fixed[f.id] && d1.fix(f.id)));
  useDevAction('d1-time', 'Add 35 minutes to the timer', () => d1.skew(35));
  useDevAction('d1-pou', 'Answer her check-in', () => d1.send('Because every number after it depends on it.'));

  return (
    <div ref={root} className={import.meta.env.VITE_DS === '1' ? 'zs2 d1 z-light ds' : `zs2 d1 ${light ? 'z-light' : 'zd'}`}>
      <div className="d1-frame">
        <TopBar />
        <div className="d1-body">
          <Rail />
          <Chat />
          <Panel />
        </div>
      </div>
    </div>
  );
}
