/* Same stage b2 (his notes, 3 Nov): Design 1's flow, untouched, in the job portal's look with a Light and Dark switch.
   Changes from Design 1: one pill style on top, no Resources key there (it sits beside her name), the timer shows its XP
   as a bar, her name card lives in the chat column, she says hello before the brief, the brief is wide and vertical with
   the voice note and its transcript first, no link box, and I'm stuck is a switch.
   Design 1 (Navid, 3 Nov call): the real stage page, fewer design changes, in our language.
   Left: only the stages, the one you are on filled, collapses to dots. Middle: the chat with her, the brief is the first
   thing she sends and pins to the top once it scrolls away. Right: Resources and Feedback in one panel, its X top right,
   its line drags. The timer counts up and says what each speed is worth. No plan mode, no slots, no work canvas. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  ArrowUpRight,
  Eye,
  MessageCircle,
  BookOpen,
  GraduationCap,
  ListChecks,
  Wrench,
  Link2,
  Package,
  Paperclip,
  Presentation,
  Workflow,
  Camera,
  Check,
  ChevronLeft,
  Clock3,
  Download,
  FileText,
  Moon,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  Plus,
  Sun,
  X,
  Upload,
  PictureInPicture2,
  Copy,
  ChevronDown,
  Minus,
  Maximize2,
  CircleAlert,
} from 'lucide-react';
import { looksPrivate } from './linkAccess';
import { useDevAction } from '../dev/store';
import { create } from 'zustand';
import { useFlow } from '../engine/store';
import { speak, hushSpeech } from '../engine/speak';
import { voiceRate } from '../audio';
import { rise } from '../stage/parts/util';
import '../stage/stage.css';
import '../d1/d1.css';
import './ds.css';
import { ASK_GROUPS, BRIEF, BRIEF_2, BURN, FEEDBACK, ISSUES, ISSUE_ENOUGH, RAW_FILE, REVIEW_STEPS, SCENARIO, STUCK, TIERS, tierAt } from './script';
import { type D1 } from './store';
import Desktop from '../pip/desktop/Desktop';
import ClaudeApp from '../pip/desktop/ClaudeApp';
import { parse } from '../data/csv';
import { openDesktopApp, spot } from '../pip/desktop/deskStore';
import { BRIEF_PARTS, d1, minutesIn, useD1, type Item } from './store';

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

const BOUNDS = ['30 min', '60 min', '90 min'];

/* left to right, as the clock runs. Only the tier you are in has its colour, green, then yellow, then orange, the
   others wait in grey. Past 90 min there is no time XP left, so the timer goes away (founder call, 3 Nov) */
function Timer() {
  const min = useNowMin();
  const stuck = useD1((s) => s.stuck);
  const at = tierAt(min);
  const cap = TIERS[TIERS.length - 2].upTo;
  if (min >= cap) return null;
  const pos = Math.min(1, min / cap);
  const tiers = TIERS.slice(0, -1);
  return (
    <div className="d1-timer ds-pill" data-burn={stuck || undefined} tabIndex={0} aria-label={`Time on this stage ${clockOf(min)}, finishing now earns ${TIERS[at].xp} XP`}>
      <Clock3 {...I} />
      <span className="d1-num">{clockOf(min)}</span>
      {stuck && <span className="ds-burn d1-num">{BURN}x</span>}
      <div className="d1-tip ds-xp" role="tooltip">
        <div className="ds-xp-bar">
          {tiers.map((t, i) => (
            <div key={t.label} className="ds-xp-seg" data-tier={i} data-state={i < at ? 'past' : i === at ? 'now' : 'next'}>
              <span className="ds-xp-v d1-num">{t.xp} XP</span>
              <span className="ds-xp-track" />
            </div>
          ))}
          <b className="ds-xp-here" style={{ left: `${pos * 100}%` }} aria-hidden="true" />
        </div>
        <div className="ds-xp-ticks d1-num">
          {BOUNDS.map((b) => (
            <span key={b}>{b}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Light and Dark, the job portal's mode switch */
const MODE_KEY = 'zero-same-stage-mode';
const readMode = (): 'light' | 'dark' => {
  try {
    return localStorage.getItem(MODE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};
const useMode = create<{ mode: 'light' | 'dark' }>(() => ({ mode: readMode() }));
const setMode = (mode: 'light' | 'dark') => {
  useMode.setState({ mode });
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* private window: the switch still works for this visit */
  }
};

/* light or dark, one icon. It is for us to look, not a product setting */
function ModeSwitch() {
  const mode = useMode((s) => s.mode);
  const dark = mode === 'dark';
  return (
    <button type="button" className="ds-pill ds-modekey" aria-label={dark ? 'Light mode' : 'Dark mode'} title={dark ? 'Light mode' : 'Dark mode'} onClick={() => setMode(dark ? 'light' : 'dark')}>
      {dark ? <Sun {...I} /> : <Moon {...I} />}
    </button>
  );
}

/* b23 (his note: "before the light or dark key, like B1, B2, B3"): three versions of the stage on one link, for us to
   compare. V1 the stages rail, its requirements land after Got it. V2 no rail and no scenario name, the stage is the
   header with its dropdown, To-dos and Resources on the left (zero-stage-five b23). V3 is V1 with the requirements
   there from the start. ?v=v2 on the link wins */
type Ver = 'v1' | 'v2' | 'v3';
const VERS: Ver[] = ['v1', 'v2', 'v3'];
const VER_KEY = 'zero-same-stage-ver';
const readVer = (): Ver => {
  try {
    const v = new URLSearchParams(location.search).get('v') ?? localStorage.getItem(VER_KEY);
    return v === 'v2' || v === 'v3' ? v : 'v1';
  } catch {
    return 'v1';
  }
};
export const useVer = create<{ ver: Ver }>(() => ({ ver: readVer() }));
const setVer = (ver: Ver) => {
  useVer.setState({ ver });
  try {
    localStorage.setItem(VER_KEY, ver);
    const u = new URL(location.href);
    u.searchParams.set('v', ver);
    history.replaceState(null, '', u);
  } catch {
    /* private window: the switch still works for this visit */
  }
};

/* plain words, the one you are on in a thin outline pill (his tab rule) */
function Seg<T extends string>({ label, items, on, pick }: { label: string; items: { id: T; t: string }[]; on: T; pick: (id: T) => void }) {
  return (
    <div className="ds-seg" role="radiogroup" aria-label={label}>
      {items.map((it) => (
        <button key={it.id} type="button" role="radio" aria-checked={it.id === on} onClick={() => it.id !== on && pick(it.id)}>
          {it.t}
        </button>
      ))}
    </div>
  );
}

function VerSwitch() {
  const ver = useVer((s) => s.ver);
  return <Seg label="Version" items={VERS.map((v) => ({ id: v, t: v.toUpperCase() }))} on={ver} pick={setVer} />;
}

/* V2's header: the stage you are on, n of all, its name, and a dropdown of every stage */
function StagePick() {
  const project = useFlow((s) => s.project);
  const stageId = useD1((s) => s.stageId);
  const phase = useD1((s) => s.phase);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', off);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', off);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);
  if (!project) return null;
  const cur = project.stages.findIndex((x) => x.id === stageId);
  const named = (id: string, t: string) => RAIL[id]?.title ?? t;
  return (
    <div ref={box} className="ds-pick" data-open={open || undefined}>
      <button type="button" className="ds-pick-k" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="ds-pick-n d1-num">
          {cur + 1}
          <i>/{project.stages.length}</i>
        </span>
        <span className="ds-pick-t">{named(stageId, project.stages[cur]?.title ?? '')}</span>
        <ChevronDown className="ds-pick-c" size={14} strokeWidth={1.75} />
      </button>
      <ol className="ds-pick-m" role="menu">
        {project.stages.map((x, i) => {
          const state = i < cur || (i === cur && phase === 'done') ? 'done' : i === cur ? 'now' : 'next';
          return (
            <li key={x.id} role="menuitem" data-state={state}>
              <span className="ds-pick-mk d1-num">{state === 'done' ? <Check size={11} strokeWidth={2.4} /> : i + 1}</span>
              {named(x.id, x.title)}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* how far this stage has got, 0 to 1. Ask mode counts the asks, normal mode counts what she has checked */
const PHASE_P: Record<string, number> = { brief: 0, work: 0.12, review: 0.6, feedback: 0.7, approved: 0.86, pou: 0.92, done: 1 };
export const progressOf = (s: D1) => {
  if (s.ask && s.stageId === 'clean' && s.phase === 'work') {
    const issues = Math.min(1, s.found.length / ISSUE_ENOUGH);
    return 0.06 + issues * 0.3 + (s.prompt ? 0.14 : 0);
  }
  return PHASE_P[s.phase] ?? 0;
};

function TopBar() {
  const project = useFlow((s) => s.project);
  const stageId = useD1((s) => s.stageId);
  const p = useD1(progressOf);
  const n = (project?.stages.findIndex((x) => x.id === stageId) ?? 0) + 1;
  const named = RAIL[stageId] ?? { title: briefOf(stageId).stage };
  const ver = useVer((s) => s.ver);
  return (
    <header className="d1-top ds-top" data-enter>
      <div className="d1-top-l">
        <button type="button" className="d1-ghost" aria-label="Back to the project" onClick={() => useFlow.getState().actions.goto('objective')}>
          <ChevronLeft size={16} strokeWidth={1.75} />
        </button>
        {ver !== 'v1' ? (
          <StagePick />
        ) : (
          <>
            {project && <img className="d1-logo" src={project.logo} alt={project.company} />}
            <span className="ds-scn">{project?.title ?? SCENARIO.title}</span>
          </>
        )}
      </div>
      <div className="ds-top-mid" aria-label={`Stage ${n}, ${named.title}, ${Math.round(p * 100)} percent`}>
        <span className="ds-prog" aria-hidden="true">
          <i style={{ width: `${Math.max(p, 0.04) * 100}%` }} />
        </span>
        <span className="ds-prog-pc d1-num" aria-hidden="true">{Math.round(p * 100)}%</span>
      </div>
      <div className="d1-top-r">
        <VerSwitch />
        <PipKey />
        <ModeSwitch />
        <Timer />
        <span className="zs2-hud-anchor" data-hud-anchor="" />
      </div>
    </header>
  );
}

/* ---------- left: only the stages ---------- */
/* nothing is locked, you pass through it: the one you are on is green, the rest wait as dots, the deliverable and the
   presentation get their own icons (founder call, 3 Nov) */
const kindOf = (title: string) => (/present/i.test(title) ? 'present' : /deliverable|memo|report/i.test(title) ? 'deliver' : 'stage');
/* what each stage is called here, and one line on what it asks of you (founder call, 3 Nov) */
const RAIL: Record<string, { title: string; line: string }> = {
  clean: { title: 'Clean the dataset', line: 'Fix the doubles, the missing currencies and the blank names' },
  model: { title: 'Build the revenue model', line: 'What each market brings in today' },
  rec: { title: 'Make the recommendation', line: 'Where prices can go up, and by how much' },
  memo: { title: 'Submit your final deliverables', line: 'The model and the memo, sent together' },
  deck: { title: 'Present to the stakeholder', line: 'Five minutes, one clear ask' },
};

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
          const named = RAIL[s.id] ?? { title: s.title, line: '' };
          const kind = kindOf(named.title);
          return (
            <li key={s.id} className="d1-st" data-state={state} data-kind={kind} title={open ? undefined : named.title}>
              <span className="d1-st-mark">
                {state === 'done' ? (
                  <Check size={11} strokeWidth={2.4} />
                ) : state === 'now' ? (
                  i + 1
                ) : kind === 'present' ? (
                  <Presentation size={13} strokeWidth={1.75} />
                ) : kind === 'deliver' ? (
                  <FileText size={13} strokeWidth={1.75} />
                ) : (
                  <i className="ds-dot" />
                )}
              </span>
              {open && (
                <span className="ds-st-t">
                  <span className="d1-st-name">{named.title}</span>
                  {state === 'now' && <StageWork />}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* under the stage you are on: the requirements (normal mode), or her asks (ask mode). Nothing to tick by hand:
   she ticks a requirement when her feedback says it is met, an ask fills when you get it right in the chat */
/* b23 (his note: "when I click Got it it should not convert into identify issues ... the requirements are just there,
   and they only populate on the left once you say Got it"): V1 lands them one after another after Got it, V3 has them
   from the start. The rail never turns into her asks */
function StageWork() {
  const s = useD1();
  const ver = useVer((v) => v.ver);
  const b = briefOf(s.stageId);
  if (s.phase === 'brief' && ver !== 'v3') return null;
  return <Reqs s={s} b={b} land={ver !== 'v3'} />;
}

function Reqs({ s, b, land }: { s: D1; b: ReturnType<typeof briefOf>; land: boolean }) {
  return (
    <ul className="ds-req" aria-label="Requirements" data-land={land || undefined}>
      {b.requirements.map((r, i) => (
        <li key={r.id} data-on={s.met[r.id] || undefined} style={{ '--i': i } as React.CSSProperties}>
          <span className="ds-req-m">{s.met[r.id] ? <Check size={10} strokeWidth={2.8} /> : <i />}</span>
          {r.text}
        </li>
      ))}
    </ul>
  );
}

function Asks({ s }: { s: D1 }) {
  const order = ['issues', 'prompt', 'submit'];
  /* before Got it nothing has started; after you hand in, all three are behind you */
  const at = s.phase === 'brief' ? -1 : s.phase === 'work' ? order.indexOf(s.askStep) : 3;
  return (
    <div className="ds-asks">
      {ASK_GROUPS.map((g, gi) => {
        const state = gi < at ? 'done' : gi === at ? 'now' : 'next';
        return (
          <section key={g.id} className="ds-ask" data-state={state}>
            <h5 className="ds-ask-t">
              <span className="ds-req-m">{state === 'done' ? <Check size={10} strokeWidth={2.8} /> : <i />}</span>
              {g.title}
              {g.id === 'issues' && <span className="d1-num ds-ask-n">{s.found.length} of {ISSUES.length}</span>}
            </h5>
            {state === 'now' && g.id === 'issues' && (
              <ol className="ds-slots">
                {ISSUES.map((it, i) => {
                  const k = s.found.indexOf(it.id);
                  const got = k >= 0;
                  return (
                    <li key={it.id} data-on={got || undefined} data-pop={s.pop?.id === it.id ? s.pop.n : undefined}>
                      <span className="d1-num ds-slot-n">{i + 1}</span>
                      {got ? <span className="ds-slot-t">{it.label}</span> : <span className="ds-slot-blank" aria-label="Not found yet" />}
                      {s.pop?.id === it.id && <span key={s.pop.n} className="ds-plus d1-num">+20</span>}
                    </li>
                  );
                })}
              </ol>
            )}
            {g.id === 'prompt' && s.prompt && <p className="ds-ask-v">{s.prompt}</p>}
            {state === 'now' && g.id === 'prompt' && !s.prompt && <p className="ds-ask-h">Tell her the prompt you would send Claude</p>}
            {state === 'now' && g.id === 'submit' && <p className="ds-ask-h">Run it in Claude, then send her the clean sheet</p>}
          </section>
        );
      })}
    </div>
  );
}

/* V2's left side. b29 (his note: "directly replicate what's there in image 2, issues to identify, then a prompt for Claude,
   submission ... when you chat with the manager it gets unlocked ... don't copy the blur, just an empty space like --"):
   her to-dos as one list in three parts. A part opens when you reach it, each line fills when you get it right in the chat */
const TODO_BLANK = '--';
type TodoState = 'done' | 'now' | 'next';
function TodoRow({ on, text, pop }: { on: boolean; text?: string; pop?: number }) {
  return (
    <li className="ds-td-row" data-on={on || undefined} data-pop={pop}>
      <span className="ds-td-m">{on && <Check size={10} strokeWidth={2.8} />}</span>
      <span className="ds-td-t" data-blank={!on || undefined}>
        {on ? text : TODO_BLANK}
      </span>
      {pop !== undefined && (
        <span key={pop} className="ds-plus d1-num">
          +20
        </span>
      )}
    </li>
  );
}
function TodoPart({ title, state, children }: { title: string; state: TodoState; children?: React.ReactNode }) {
  return (
    <section className="ds-td" data-state={state}>
      <h5 className="ds-td-h">{title}</h5>
      {state !== 'next' && children && <ul className="ds-td-l">{children}</ul>}
    </section>
  );
}
function Todos({ s }: { s: D1 }) {
  const b = briefOf(s.stageId);
  const askMode = s.ask && s.stageId === 'clean';
  const sent = s.phase !== 'brief' && s.phase !== 'work';
  if (!askMode) {
    const work: TodoState = s.phase === 'brief' ? 'next' : sent ? 'done' : 'now';
    return (
      <div className="ds-tds">
        <TodoPart title="Requirements" state={s.phase === 'brief' ? 'now' : work}>
          {b.requirements.map((r) => (
            <TodoRow key={r.id} on={s.phase !== 'brief' && !!s.met[r.id]} text={r.text} />
          ))}
        </TodoPart>
        <TodoPart title="Submission" state={sent ? 'done' : 'next'}>
          <TodoRow on={sent} text="Clean sheet sent" />
        </TodoPart>
      </div>
    );
  }
  const order = ['issues', 'prompt', 'submit'];
  const at = s.phase === 'brief' ? 0 : s.phase === 'work' ? order.indexOf(s.askStep) : 3;
  const st = (k: number): TodoState => (k < at ? 'done' : k === at ? 'now' : 'next');
  return (
    <div className="ds-tds">
      <TodoPart title={ASK_GROUPS[0].title} state={st(0)}>
        {ISSUES.map((it) => {
          const got = s.found.includes(it.id);
          return <TodoRow key={it.id} on={got} text={it.label} pop={s.pop?.id === it.id ? s.pop.n : undefined} />;
        })}
      </TodoPart>
      <TodoPart title={ASK_GROUPS[1].title} state={st(1)}>
        <TodoRow on={!!s.prompt} text={s.prompt} />
      </TodoPart>
      <TodoPart title={ASK_GROUPS[2].title} state={st(2)}>
        <TodoRow on={at > 2} text="Clean sheet sent" />
      </TodoPart>
    </div>
  );
}
function Work2() {
  const s = useD1();
  return (
    <aside className="ds-w2" data-enter aria-label="To-dos">
      <div className="ds-w2-tabs">
        <span className="ds-w2-one">To-dos</span>
      </div>
      <div className="ds-w2-body">
        <Todos s={s} />
      </div>
    </aside>
  );
}

/* V3. b29 (his note: "the V3 version should be the replica of the V2 version on the left ... 1 by 5 and the stage name,
   and just below that the requirements in bullet points"): V2's header, the requirements under it from the start */
function Work3() {
  const s = useD1();
  const b = briefOf(s.stageId);
  return (
    <aside className="ds-w2 ds-w3" data-enter aria-label="Requirements">
      <div className="ds-w2-body">
        <Reqs s={s} b={b} land={false} />
      </div>
    </aside>
  );
}

/* ---------- the brief she sends ---------- */
/* her voice note: a small play key and Listen; once you press it, the same row is the player (progress, time, speed) */
const RATES = [1, 1.2, 2];
const sec = (n: number) => `${Math.floor(n / 60)}:${String(Math.round(n) % 60).padStart(2, '0')}`;

const useSaid = create<{ p: number; on: boolean }>(() => ({ p: 0, on: false }));

/* one player for the brief wherever it shows (in the thread and dropped down from her name) */
const useVN = create<{ on: boolean; open: boolean; p: number; ri: number }>(() => ({ on: false, open: false, p: 0, ri: 0 }));
const vn = { at: 0, run: 0, sp: null as { stop: () => void } | null };
const vnLevel = (v: number) => useFlow.setState((s) => ({ ui: { ...s.ui, level: v } }));
const vnHalt = () => {
  vn.run++;
  vn.sp?.stop();
  vn.sp = null;
  hushSpeech();
  vnLevel(0);
};
useVN.subscribe((v) => useSaid.setState({ p: v.p, on: v.on || (v.p > 0 && v.p < 1) }));

function VoiceNote() {
  const stageId = useD1((s) => s.stageId);
  const b = briefOf(stageId);
  const words = b.voice.split(' ');
  const N = words.length;
  const { on, open, p, ri } = useVN();
  useEffect(
    () => () => {
      vnHalt();
      voiceRate(1);
      useVN.setState({ on: false });
    },
    []
  );
  const go = (from: number, rate = RATES[useVN.getState().ri]) => {
    vnHalt();
    const me = vn.run;
    const start = from >= N ? 0 : from;
    vn.at = start;
    voiceRate(rate);
    useVN.setState({ on: true, open: true, p: start / N });
    const v = speak(words.slice(start).join(' '), 'eryn', {
      onWord: (n) => {
        if (vn.run !== me) return;
        vn.at = start + n;
        useVN.setState({ p: vn.at / N });
      },
      onLevel: (x) => vn.run === me && vnLevel(x),
    });
    vn.sp = v;
    void v.done.then(() => {
      if (vn.run !== me) return;
      vn.sp = null;
      vnLevel(0);
      const end = vn.at >= N;
      if (end) vn.at = 0;
      useVN.setState(end ? { on: false, p: 1 } : { on: false });
    });
  };
  const toggle = () => {
    if (on) {
      vnHalt();
      useVN.setState({ on: false });
    } else go(vn.at);
  };
  const speed = () => {
    const n = (ri + 1) % RATES.length;
    useVN.setState({ ri: n });
    if (on) go(vn.at, RATES[n]);
    else voiceRate(RATES[n]);
  };
  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const k = Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * N);
    if (on) go(k);
    else {
      vn.at = k;
      useVN.setState({ p: k / N });
    }
  };
  const key = (
    <button type="button" className="ds-pl-key" onClick={toggle} aria-label={on ? 'Pause her voice note' : 'Play her voice note'}>
      {on ? <Pause size={9} strokeWidth={0} fill="currentColor" /> : <Play size={9} strokeWidth={0} fill="currentColor" />}
    </button>
  );
  if (!open)
    return (
      <button type="button" className="ds-listen" onClick={() => go(0)} aria-label="Listen to her voice note">
        <span className="ds-pl-key" aria-hidden="true">
          <Play size={9} strokeWidth={0} fill="currentColor" />
        </span>
        Listen
        <span className="d1-num ds-listen-t">{sec(b.voiceSec)}</span>
      </button>
    );
  return (
    <div className="ds-pl" data-on={on || undefined}>
      {key}
      <div className="ds-pl-bar" role="slider" aria-label="Voice note position" aria-valuemin={0} aria-valuemax={b.voiceSec} aria-valuenow={Math.round(p * b.voiceSec)} tabIndex={0} onPointerDown={seek}>
        <i style={{ transform: `scaleX(${p})` }} />
      </div>
      <span className="d1-num ds-pl-t">
        {sec(p * b.voiceSec)} / {sec(b.voiceSec)}
      </span>
      <button type="button" className="ds-pl-rate d1-num" onClick={speed} aria-label={`Speed ${RATES[ri]}x`}>
        {RATES[ri]}x
      </button>
    </div>
  );
}

/* how far her voice note has got, so the transcript can light each word she has said */

/* what she says in the note, two lines and Read more */
function Transcript() {
  const stageId = useD1((s) => s.stageId);
  const b = briefOf(stageId);
  const { p, on } = useSaid();
  const [open, setOpen] = useState(false);
  const words = b.voice.split(' ');
  return (
    <div className="ds-tr" data-open={open || undefined}>
      <p className="ds-script" data-on={on || (p > 0 && p < 1) || undefined}>
        {words.map((w, i) => (
          <span key={i} data-said={i < p * words.length || undefined}>
            {w}{' '}
          </span>
        ))}
      </p>
      <button type="button" className="ds-more" onClick={() => setOpen(!open)}>
        {open ? 'Show less' : 'Read more'}
      </button>
    </div>
  );
}

const useSubmitting = create<{ on: boolean }>(() => ({ on: false }));

function SubmitKey() {
  const phase = useD1((s) => s.phase);
  const left = useD1((s) => FEEDBACK.items.filter((f) => !s.fixed[f.id]).length);
  const on = useSubmitting((s) => s.on);
  /* ask mode: you hand in only after her asks, never before */
  const gated = useD1((s) => s.ask && s.stageId === 'clean' && s.phase === 'work' && s.askStep !== 'submit');
  const ready = (phase === 'work' && !gated) || phase === 'feedback';
  if (phase === 'brief') return null;
  const label =
    phase === 'review'
      ? 'Checking'
      : phase === 'feedback'
        ? left > 0
          ? `${left} ${left === 1 ? 'fix' : 'fixes'} to go`
          : 'Resubmit'
        : phase === 'work'
          ? 'Submit'
          : 'Approved';
  const done = phase === 'approved' || phase === 'pou' || phase === 'done';
  return (
    <button
      type="button"
      className="ds-key ds-key-ink"
      disabled={!ready && !on}
      data-done={done || undefined}
      data-on={on || undefined}
      data-busy={phase === 'review' || undefined}
      onClick={() => {
        if (phase === 'feedback' && left > 0) useFixDrop.setState({ open: !useFixDrop.getState().open });
        else if (phase === 'feedback') {
          useSubmitting.setState({ on: false });
          d1.submit();
        } else useSubmitting.setState({ on: !on });
      }}
    >
      {done && <Check size={13} strokeWidth={2.4} />}
      {label}
    </button>
  );
}

/* how long each training film runs, shown on hover */
const TRAIN_LEN: Record<string, string> = { clean: '1.5 min', dedupe: '2 min' };

/* tools and training: V2 side by side, V1 one under the other, the dev gear flips it */
const useLook = create<{ tools: 'v1' | 'v2' }>(() => ({ tools: 'v2' }));

/* a list that shows its first few, then See more (founder call: 3 requirements, 2 trainings) */
function More({ n, children }: { n: number; children: React.ReactNode[] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? children : children.slice(0, n);
  return (
    <>
      {shown}
      {children.length > n && (
        <button type="button" className="ds-more ds-more-l" onClick={() => setOpen(!open)}>
          {open ? 'Show less' : `See ${children.length - n} more`}
        </button>
      )}
    </>
  );
}

/* b23 (his note: "where are all the resources, the tools, the training videos ... I want every thing"): the brief is
   whole in every mode again, and in the thread it builds in as she puts it down: deliverable, format, resources,
   requirements, tools, training. Got it sits under it, outside the card */
function Brief({ inThread = false }: { inThread?: boolean }) {
  const stageId = useD1((s) => s.stageId);
  const met = useD1((s) => s.met);
  const n = useD1((s) => (inThread ? s.briefN : BRIEF_PARTS));
  const b = briefOf(stageId);
  const look = useLook((s) => s.tools);
  const tools = b.tools.map((t) => (
    <button key={t.id} type="button" className="ds-it" onClick={() => openView(`tool:${t.id}`)}>
      <img src={t.logo} alt="" />
      <span className="ds-it-n">{t.name}</span>
      <Play className="ds-it-go" size={8} strokeWidth={0} fill="currentColor" />
    </button>
  ));
  const training = b.training.map((t) => (
    <button key={t.id} type="button" className="ds-it" onClick={() => openView(`train:${t.id}`)}>
      <span className="ds-it-ic ds-it-play">
        <Play size={8} strokeWidth={0} fill="currentColor" />
      </span>
      <span className="ds-it-n">{t.title}</span>
      <span className="ds-it-len d1-num">{TRAIN_LEN[t.id] ?? '2 min'}</span>
    </button>
  ));
  const reqs = b.requirements.map((r) => (
    <div key={r.id} className="ds-todo2 ds-bul" data-on={met[r.id] || undefined}>
      <span className="ds-req-m">{met[r.id] ? <Check size={10} strokeWidth={2.8} /> : <i />}</span>
      <span>{r.text}</span>
    </div>
  ));
  return (
    <article className="ds-b">
      <h3 className="ds-b-t">{b.stage}</h3>
      {/* ask mode is guided step by step, so no voice note: the problem in two lines instead (founder call) */}
      <VoiceNote />
      <Transcript />

      <dl className="ds-g">
        {n >= 1 && (
          <>
            <dt className="ds-in">
              <Package size={14} strokeWidth={1.75} />
              Deliverable
            </dt>
            <dd className="ds-in">{b.deliverable}</dd>
          </>
        )}
        {n >= 2 && (
          <>
            <dt className="ds-in">
              <Link2 size={14} strokeWidth={1.75} />
              Format
            </dt>
            <dd className="ds-in">{b.format}</dd>
          </>
        )}
        {stageId === 'clean' && n >= 3 && (
          <>
            <dt className="ds-in">
              <Paperclip size={14} strokeWidth={1.75} />
              Resources
            </dt>
            <dd className="ds-in ds-res-dd">
              <button type="button" className="ds-it" onClick={() => openSide('sheet')} title="Preview">
                <img src="static/logos/logo-sheets.svg" alt="" />
                <span className="ds-it-n">{RAW_FILE.name}</span>
                <span className="ds-it-m d1-num">{RAW_FILE.meta}</span>
              </button>
              <FileKeys />
            </dd>
          </>
        )}
      </dl>

      {n >= 4 && (
        <dl className="ds-g ds-in">
          <dt className="ds-g-top">
            <ListChecks size={14} strokeWidth={1.75} />
            Requirements
          </dt>
          <dd>
            <More n={3}>{reqs}</More>
          </dd>
        </dl>
      )}

      {n < 5 ? null : look === 'v1' ? (
        <dl className="ds-g ds-in">
          {b.tools.length > 0 && (
            <>
              <dt className="ds-g-top">
                <Wrench size={14} strokeWidth={1.75} />
                Tools
              </dt>
              <dd>{tools}</dd>
            </>
          )}
          {b.training.length > 0 && n >= 6 && (
            <>
              <dt className="ds-g-top">
                <GraduationCap size={14} strokeWidth={1.75} />
                Training
              </dt>
              <dd>
                <More n={2}>{training}</More>
              </dd>
            </>
          )}
        </dl>
      ) : (
        b.tools.length > 0 && (
          <div className="ds-g2 ds-in" data-one={n < 6 || undefined}>
            <section>
              <h4 className="ds-g2-t">
                <Wrench size={14} strokeWidth={1.75} />
                Tools
              </h4>
              {tools}
            </section>
            {n >= 6 && (
              <section className="ds-in">
                <h4 className="ds-g2-t">
                  <GraduationCap size={14} strokeWidth={1.75} />
                  Training
                </h4>
                <More n={2}>{training}</More>
              </section>
            )}
          </div>
        )
      )}
    </article>
  );
}

/* b23 (his note: "the button should be outside that container"): Got it under the brief, once she has put it all down */
function BriefGo() {
  const show = useD1((s) => s.phase === 'brief' && s.briefN >= BRIEF_PARTS);
  if (!show) return null;
  return (
    <div className="ds-b-go ds-b-go-out ds-in">
      <button type="button" className="ds-key ds-key-ink" onClick={() => d1.start()}>
        Got it, let's start
      </button>
    </div>
  );
}

/* b14 (founder call): the Brief key drops the brief down from the top, over the chat, one look and it goes. Users leave
   side panels open, so this one closes on a click outside, Esc or the X.
   b27 (his note: "the feedback should be sticky ... when we click on 2 fixes to go, it just opens up the feedback, just
   like how a popup opens ... they have to tick everything, and then only the submit button opens up"): the fixes drop
   down the same way from their key */
const useDrop = create<{ open: boolean }>(() => ({ open: false }));
const useFixDrop = create<{ open: boolean }>(() => ({ open: false }));
function Drop({ open, close, label, children }: { open: boolean; close: () => void; label: string; children: React.ReactNode }) {
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, close]);
  useLayoutEffect(() => {
    const el = sheet.current;
    if (!el) return;
    el.animate(
      open
        ? [{ transform: 'translateY(-24px) scale(0.985)', filter: 'blur(8px)', opacity: 0 }, { transform: 'none', filter: 'blur(0)', opacity: 1 }]
        : [{ transform: 'none', filter: 'blur(0)', opacity: 1 }, { transform: 'translateY(-18px) scale(0.99)', filter: 'blur(6px)', opacity: 0 }],
      { duration: open ? 460 : 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
    );
  }, [open]);
  return (
    <div className="ds-drop" data-open={open || undefined} aria-hidden={!open} onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={sheet} className="ds-drop-s" role="dialog" aria-label={label}>
        <button type="button" className="d1-ghost ds-drop-x" aria-label="Close" onClick={close}>
          <X {...I} />
        </button>
        {children}
      </div>
    </div>
  );
}
const closeBrief = () => useDrop.setState({ open: false });
const closeFixes = () => useFixDrop.setState({ open: false });
function BriefDrop() {
  const open = useDrop((s) => s.open);
  return (
    <Drop open={open} close={closeBrief} label="Stage brief">
      <Brief />
    </Drop>
  );
}
function FixDrop() {
  const open = useFixDrop((s) => s.open);
  const phase = useD1((s) => s.phase);
  useEffect(() => {
    if (phase !== 'feedback') closeFixes();
  }, [phase]);
  return (
    <Drop open={open && phase === 'feedback'} close={closeFixes} label="Her fixes">
      <div className="ds-fixdrop">
        <h3 className="ds-fixdrop-t">{FEEDBACK.head}</h3>
        <FeedbackCard inPanel />
      </div>
    </Drop>
  );
}

/* the right side is only for a preview: a tool or a training plays there */
/* b13: a tool or a training opens one popup with its film over the screen; nothing opens beside the chat */
const useFilm = create<{ view: string | null }>(() => ({ view: null }));
const openView = (view: string) => useFilm.setState({ view });
const FILM_SEC: Record<string, number> = { clean: 90, dedupe: 120 };
const FILM_RATES = [1, 1.2, 2];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function FilmPop() {
  const view = useFilm((s) => s.view);
  const card = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [on, setOn] = useState(true);
  const [ri, setRi] = useState(0);
  const [kind, id] = (view ?? ':').split(':');
  const tool = kind === 'tool' ? BRIEF.tools.find((x) => x.id === id) : undefined;
  const tr = kind === 'train' ? BRIEF.training.find((x) => x.id === id) : undefined;
  const steps = tool?.film ?? tr?.steps ?? [];
  const len = tool ? 60 : FILM_SEC[id] ?? 90;
  const step = Math.min(steps.length - 1, Math.floor((t / len) * steps.length));
  const close = () => useFilm.setState({ view: null });
  useEffect(() => {
    setT(0);
    setOn(true);
  }, [view]);
  useEffect(() => {
    if (!view || !on) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = ((now - last) / 1000) * FILM_RATES[ri];
      last = now;
      setT((v) => {
        const n = Math.min(len, v + dt);
        if (n >= len) setOn(false);
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [view, on, ri, len]);
  useEffect(() => {
    if (!view) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === ' ' && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOn((o) => !o);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [view]);
  useLayoutEffect(() => {
    if (view) rise(card.current, { y: 18, blur: 10, scale: 0.96, ms: 520 });
  }, [view]);
  useLayoutEffect(() => {
    if (view) rise(line.current, { y: 10, blur: 6, ms: 460 });
  }, [step, view]);
  if (!view || !steps.length) return null;
  const title = tool ? `${tool.name} in ${steps.length} moves` : tr?.title;
  return (
    <div className="ds-film-scrim" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={card} className="ds-film" role="dialog" aria-label={title}>
        <div className="ds-film-h">
          {tool && <img src={tool.logo} alt="" />}
          <span>{title}</span>
          <button type="button" className="d1-ghost" aria-label="Close" onClick={close}>
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div className="ds-film-v" onClick={() => setOn((o) => !o)}>
          <span className="ds-film-n d1-num">{step + 1} of {steps.length}</span>
          <div ref={line} key={step} className="ds-film-line">{steps[step]}</div>
          {!on && (
            <span className="ds-film-big">
              <Play size={22} strokeWidth={0} fill="currentColor" />
            </span>
          )}
        </div>
        <div className="ds-film-bar">
          <button type="button" className="ds-film-pp" aria-label={on ? 'Pause' : 'Play'} onClick={() => (t >= len ? (setT(0), setOn(true)) : setOn((o) => !o))}>
            {on ? <Pause size={13} strokeWidth={0} fill="currentColor" /> : <Play size={13} strokeWidth={0} fill="currentColor" />}
          </button>
          <div
            className="ds-film-track"
            onPointerDown={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setT(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * len);
            }}
          >
            <i style={{ width: `${(t / len) * 100}%` }} />
          </div>
          <span className="ds-film-time d1-num">
            {clock(t)} / {clock(len)}
          </span>
          <button type="button" className="ds-film-rate d1-num" onClick={() => setRi((r) => (r + 1) % FILM_RATES.length)}>
            {FILM_RATES[ri]}x
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- the chat ---------- */
/* b24 (his note: "we don't need this green animation from the manager, just be in the chat"): her line is plain text,
   the bubble rises in as one piece like any other row */
function Words({ text }: { text: string }) {
  return <span>{text}</span>;
}

/* b27: out of Zero, to your desktop, with her beside you in the PiP. Sheets for the work, Claude when she hands it over */
function popOut(app: 'sheets' | 'claude') {
  const { w } = usePip.getState();
  const x = window.innerWidth - w - 24;
  const y = 64;
  usePip.setState({ x, y, open: true });
  useAskPip.setState({ body: null });
  spot.pip = { x, y, w, h: 340 };
  useFlow.getState().actions.setSurface('pip');
  window.setTimeout(() => openDesktopApp(app), 520);
}

/* her tool inside her words (zero-stage-five b13): the real mark, "Open in Claude" underlined in blue, the arrow that says
   it leaves. It opens Claude on your desktop, the way it would on your Mac */
function ToolLink() {
  return (
    <a
      className="zs2-toollink ds-toollink"
      data-inline=""
      href="https://claude.ai"
      target="_blank"
      rel="noreferrer"
      aria-label="Open in Claude"
      onClick={(e) => {
        e.preventDefault();
        popOut('claude');
      }}
    >
      <img className="zs2-toollink-ico" src="static/logos/logo-claude.svg" alt="" draggable={false} />
      <span className="zs2-toollink-t">Open in Claude</span>
      <ArrowUpRight className="zs2-toollink-go" size={13} strokeWidth={2} aria-hidden />
    </a>
  );
}

/* ---------- b27: the file she hands you is a preview (his note: "for Spotify, I need a preview ... whatever is a resource,
   it should be a preview, but if it's a link, it can be a link. Also a preview and an AI icon should be there. When I click
   on the AI icon, it should just open up on the right-hand side as a divider") ---------- */
/* b28 (his note: "I don't want it in another container ... the same white container, a divider ... resizable"): w is the
   width you dragged it to, 0 until you do; drag is true while you hold its edge */
const useSide = create<{ view: 'sheet' | 'claude' | null; w: number; drag: boolean }>(() => ({ view: null, w: 0, drag: false }));
const PV_MIN = 340;
const CHAT_MIN = 400;
const openSide = (view: 'sheet' | 'claude') => useSide.setState({ view });
const RAW: { text: string | null; p: Promise<string> | null } = { text: null, p: null };
function useRawText() {
  const [text, setText] = useState(RAW.text);
  useEffect(() => {
    if (RAW.text !== null) return;
    RAW.p ??= fetch(RAW_FILE.url)
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '');
    let live = true;
    void RAW.p.then((t) => {
      RAW.text = t;
      if (live) setText(t);
    });
    return () => {
      live = false;
    };
  }, []);
  return text;
}
const PEEK_ROWS = 5;
const PEEK_COLS = 4;
const colName = (j: number) => String.fromCharCode(65 + (j % 26));

/* the top left of the real file as Google Sheets draws it (zero-stage-five b23 MiniSheet): letters, numbers, A1 selected */
function MiniSheet({ text }: { text: string }) {
  const t = useMemo(() => parse(text.split('\n', PEEK_ROWS + 1).join('\n')), [text]);
  const rows = [t.cols, ...t.rows].slice(0, PEEK_ROWS);
  const n = Math.min(PEEK_COLS, t.cols.length);
  const cols = Array.from({ length: n }, (_, j) => j);
  return (
    <span className="zs2-sheet" style={{ gridTemplateColumns: `22px repeat(${n}, minmax(0, 1fr))` }} aria-hidden>
      <span className="zs2-sheet-h" data-corner="" />
      {cols.map((j) => (
        <span key={`h${j}`} className="zs2-sheet-h">
          {colName(j)}
        </span>
      ))}
      {rows.map((r, i) => [
        <span key={`n${i}`} className="zs2-sheet-h" data-num="">
          {i + 1}
        </span>,
        ...cols.map((j) => (
          <span key={`c${i}:${j}`} className="zs2-sheet-c" data-a1={(i === 0 && j === 0) || undefined}>
            {r[j] ?? ''}
          </span>
        )),
      ])}
    </span>
  );
}

/* Preview, Claude and Download, on every place the file sits */
function FileKeys() {
  return (
    <span className="ds-fkeys">
      <button type="button" className="d1-ghost" aria-label={`Preview ${RAW_FILE.name}`} title="Preview" onClick={() => openSide('sheet')}>
        <Eye {...I} />
      </button>
      <button type="button" className="d1-ghost ds-ai" aria-label="Open Claude beside the chat" title="Ask Claude" onClick={() => openSide('claude')}>
        <img src="static/logos/logo-claude.svg" alt="" draggable={false} />
      </button>
      <a className="d1-ghost" href={RAW_FILE.url} download aria-label={`Download ${RAW_FILE.name}`} title="Download">
        <Download {...I} />
      </a>
    </span>
  );
}

function FileCard() {
  const text = useRawText();
  return (
    <div className="zs2-fcard ds-fcard">
      <button type="button" className="zs2-fcard-open" aria-label={`Preview ${RAW_FILE.name}`} onClick={() => openSide('sheet')}>
        <span className="zs2-fcard-peek" data-kind="csv">
          {text ? <MiniSheet text={text} /> : <span className="ds-fcard-wait" />}
        </span>
        <span className="zs2-fcard-foot">
          <span className="zs2-fcard-ico">
            <img src="static/logos/logo-sheets.svg" alt="" draggable={false} />
          </span>
          <span className="zs2-fcard-t">
            <span className="zs2-fcard-name" title={RAW_FILE.name}>
              {RAW_FILE.name}
            </span>
            <span className="zs2-fcard-meta">{RAW_FILE.meta}</span>
          </span>
        </span>
      </button>
      <FileKeys />
    </div>
  );
}

/* the right side, behind one hairline: the whole sheet, or Claude. Esc or the X closes it */
function Side() {
  const view = useSide((s) => s.view);
  const text = useRawText();
  const table = useMemo(() => (text ? parse(text) : null), [text]);
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!view) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && !(e.target instanceof HTMLTextAreaElement) && useSide.setState({ view: null });
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [view]);
  useLayoutEffect(() => {
    box.current?.animate([{ transform: 'translateX(28px)', filter: 'blur(10px)', opacity: 0 }, { transform: 'none', filter: 'blur(0px)', opacity: 1 }], {
      duration: 520,
      easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
    });
  }, [view]);
  if (!view) return null;
  const close = () => useSide.setState({ view: null });
  /* its left edge is the divider: hold it and drag, the chat gives way or takes the room back */
  const grip = (e: React.PointerEvent<HTMLSpanElement>) => {
    const el = box.current;
    const chat = el?.parentElement;
    if (e.button !== 0 || !el || !chat) return;
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = el.offsetWidth;
    const max = Math.max(PV_MIN, chat.clientWidth - CHAT_MIN);
    const g = e.currentTarget;
    g.setPointerCapture(e.pointerId);
    useSide.setState({ drag: true });
    const move = (m: PointerEvent) => useSide.setState({ w: Math.round(Math.min(max, Math.max(PV_MIN, w0 + x0 - m.clientX))) });
    const up = () => {
      g.removeEventListener('pointermove', move);
      g.removeEventListener('pointerup', up);
      g.removeEventListener('pointercancel', up);
      useSide.setState({ drag: false });
    };
    g.addEventListener('pointermove', move);
    g.addEventListener('pointerup', up);
    g.addEventListener('pointercancel', up);
  };
  return (
    <aside ref={box} className="ds-pv" data-view={view} aria-label={view === 'sheet' ? RAW_FILE.name : 'Claude'}>
      <span className="ds-pv-grip" role="separator" aria-orientation="vertical" aria-label="Resize" onPointerDown={grip} onDoubleClick={() => useSide.setState({ w: 0 })} />
      <header className="ds-pv-h">
        <img className="ds-pv-ico" src={view === 'sheet' ? 'static/logos/logo-sheets.svg' : 'static/logos/logo-claude.svg'} alt="" />
        <span className="ds-pv-t">{view === 'sheet' ? RAW_FILE.name : 'Claude'}</span>
        {view === 'sheet' && <span className="ds-pv-m d1-num">{RAW_FILE.meta}</span>}
        <span className="d1-grow" />
        {view === 'sheet' ? (
          <button type="button" className="d1-ghost ds-ai" aria-label="Open Claude here" title="Ask Claude" onClick={() => openSide('claude')}>
            <img src="static/logos/logo-claude.svg" alt="" />
          </button>
        ) : (
          <button type="button" className="d1-ghost" aria-label="Preview the file" title="Preview the file" onClick={() => openSide('sheet')}>
            <Eye {...I} />
          </button>
        )}
        <a className="d1-ghost" href={RAW_FILE.url} download aria-label={`Download ${RAW_FILE.name}`} title="Download">
          <Download {...I} />
        </a>
        <button type="button" className="d1-ghost" aria-label="Close" onClick={close}>
          <X {...I} />
        </button>
      </header>
      {view === 'sheet' ? (
        <div className="ds-pv-sheet">
          {table && (
            <table className="ds-gs">
              <thead>
                <tr>
                  <th className="ds-gs-n" />
                  {table.cols.map((_, j) => (
                    <th key={j}>{colName(j)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[table.cols, ...table.rows].map((r, i) => (
                  <tr key={i} data-head={i === 0 || undefined}>
                    <td className="ds-gs-n">{i + 1}</td>
                    {table.cols.map((_, j) => (
                      <td key={j}>{r[j] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="ds-pv-cl">
          <ClaudeApp />
        </div>
      )}
    </aside>
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
        <button type="button" className="ds-key ds-key-ink" disabled={!can} onClick={() => d1.submit()}>
          Resubmit
        </button>
      )}
    </div>
  );
}

/* the prompt you wrote stays in the chat, ready to copy into Claude */
function PromptCard({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="ds-prompt">
      <div className="ds-prompt-h">
        <img src="static/logos/logo-claude.svg" alt="" />
        Your prompt for Claude
        <span className="d1-grow" />
        <button
          type="button"
          className="d1-ghost"
          aria-label="Copy the prompt"
          onClick={() => {
            void navigator.clipboard?.writeText(text).catch(() => undefined);
            setDone(true);
            window.setTimeout(() => setDone(false), 1400);
          }}
        >
          {done ? <Check size={13} strokeWidth={2.4} /> : <Copy size={13} strokeWidth={1.75} />}
        </button>
      </div>
      <p>{text}</p>
    </div>
  );
}

function Row({ it }: { it: Item }) {
  const row = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    rise(row.current, { y: 10, blur: 6, ms: 560 });
  }, [it.k]);
  switch (it.k) {
    case 'brief':
      return (
        <div ref={row} className="d1-row d1-row-her" data-brief>
          <Brief inThread />
          <BriefGo />
        </div>
      );
    case 'her':
      return (
        <div ref={row} className="d1-row d1-row-her">
          <div className="d1-bub" data-guide={it.guide || undefined}>
            <Words text={it.text} />
            {it.tool && (
              <>
                <br />
                <ToolLink />
              </>
            )}
          </div>
        </div>
      );
    case 'file':
      return (
        <div ref={row} className="d1-row d1-row-her">
          <FileCard />
        </div>
      );
    case 'shot':
      return (
        <div ref={row} className="d1-row d1-row-me">
          <div className="ds-shot">
            <span className="ds-shot-img" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="d1-file-t">
              <span>Screenshot</span>
              <span className="d1-dim">Google Sheets, just now</span>
            </span>
          </div>
        </div>
      );
    case 'att':
      return (
        <div ref={row} className="d1-row d1-row-me">
          <div className="ds-att">
            <span className="ds-att-i" aria-hidden="true">
              {it.link ? <Link2 size={15} strokeWidth={1.75} /> : <FileText size={15} strokeWidth={1.75} />}
            </span>
            <span className="d1-file-t">
              <span>{it.name}</span>
              <span className="d1-dim">{it.meta}</span>
            </span>
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
    case 'prompt':
      return (
        <div ref={row} className="d1-row d1-row-me">
          <PromptCard text={it.text} />
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

const CHECK_STEP_MS = 900;
const SHAKE: Keyframe[] = [0, -8, 7, -5, 4, -2, 0].map((x) => ({ transform: `translateX(${x}px)` }));
const CHECK_OK_MS = 700;

/* one line of the link check: soft while it runs, a tick when it is done */
function CheckLine({ on, done, text }: { on: boolean; done: boolean; text: string }) {
  return (
    <li className="ds-chk-l" data-on={on || undefined} data-done={done || undefined}>
      <span className="ds-chk-d" aria-hidden="true">
        {done && <Check size={11} strokeWidth={3} />}
      </span>
      <span className="ds-chk-t">{text}</span>
    </li>
  );
}

/* b14 (founder call): submitting looks nothing like a chat. A dark square with the ask as its title, one field to paste
   the link, or one place to drop a file when the format is a file */
function SubmitBox() {
  const stageId = useD1((s) => s.stageId);
  const project = useFlow((s) => s.project);
  const b = briefOf(stageId);
  const [link, setLink] = useState('');
  const box = useRef<HTMLInputElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const ok = /^https?:\/\/\S+\.\S+/i.test(link.trim());
  const isFile = /file|csv|pdf|deck/i.test(b.format) && !/link/i.test(b.format);
  useEffect(() => box.current?.focus(), []);
  useLayoutEffect(() => rise(card.current, { y: 12, blur: 8, scale: 0.98, ms: 460 }), []);
  /* b17 (his note: "as they add the link add a loader like checking, and most links are private, so nudge them to make
     it public for the manager to review, so she never has to ask again"): the link is opened and its sharing read before
     it goes. Private: the box says so, with the three clicks that open it. Check again passes */
  const [check, setCheck] = useState<'idle' | 'open' | 'who' | 'private' | 'again' | 'ok'>('idle');
  const tried = useRef(false);
  const waits = useRef<number[]>([]);
  useEffect(() => () => waits.current.forEach((t) => window.clearTimeout(t)), []);
  const after = (ms: number, fn: () => void) => waits.current.push(window.setTimeout(fn, ms));
  const send = () => {
    d1.setLink(link.trim());
    useSubmitting.setState({ on: false });
    d1.submit();
  };
  const pass = () => {
    setCheck('ok');
    after(CHECK_OK_MS, send);
  };
  const go = () => {
    if (!ok || (check !== 'idle' && check !== 'private')) return;
    if (check === 'private') {
      setCheck('again');
      after(CHECK_STEP_MS, pass);
      return;
    }
    setCheck('open');
    after(CHECK_STEP_MS, () => setCheck('who'));
    after(CHECK_STEP_MS * 2, () => {
      if (!tried.current && looksPrivate(link.trim())) {
        tried.current = true;
        setCheck('private');
        /* b17 (his note: "just one simple yellow pill, one liner, and the box should shake, like haptics") */
        card.current?.animate(SHAKE, { duration: 420, easing: 'ease-out' });
      } else pass();
    });
  };
  const busy = check === 'open' || check === 'who' || check === 'again' || check === 'ok';
  const manager = project?.manager.name.split(' ')[0] ?? 'Your manager';
  return (
    <div ref={card} className="ds-sub" role="group" aria-label="Submit">
      <div className="ds-sub-h">
        <span>
          Submit your {b.deliverable.toLowerCase()} as a {b.format}
        </span>
        <button type="button" className="ds-sub-x" aria-label="Cancel" onClick={() => useSubmitting.setState({ on: false })}>
          <X {...I} />
        </button>
      </div>
      {isFile ? (
        <button type="button" className="ds-sub-drop">
          <Upload size={16} strokeWidth={1.75} />
          Upload file
        </button>
      ) : (
        <div className="ds-sub-row">
          <Link2 size={15} strokeWidth={1.75} />
          <input
            ref={box}
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              if (check === 'private') setCheck('idle');
              tried.current = false;
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') go();
              if (e.key === 'Escape') useSubmitting.setState({ on: false });
            }}
            readOnly={busy}
            placeholder="Paste your link"
            aria-label="Your Google Sheet link"
          />
          {(check === 'idle' || check === 'private') && (
            <button type="button" className="ds-sub-go" disabled={!ok} onClick={go}>
              Submit
            </button>
          )}
        </div>
      )}
      {busy && (
        <ul className="ds-chk" aria-live="polite">
          <CheckLine on={check === 'open'} done={check !== 'open'} text="Opening your link" />
          {check !== 'open' && check !== 'again' && <CheckLine on={check === 'who'} done={check === 'ok'} text={`Checking ${manager} can see it`} />}
          {check === 'again' && <CheckLine on done={false} text="Checking again" />}
          {check === 'ok' && <CheckLine on={false} done text={`${manager} can open it. Sending`} />}
        </ul>
      )}
      {check === 'private' && (
        <p className="ds-priv1" role="alert">
          <CircleAlert size={14} strokeWidth={2} aria-hidden="true" />
          Private link. Set Share to Anyone with the link, then Submit again.
        </p>
      )}
    </div>
  );
}

/* the switch, the same in both boxes */
function StuckSwitch() {
  const stuck = useD1((s) => s.stuck);
  return (
    <button type="button" role="switch" className="ds-stuck" data-on={stuck || undefined} aria-checked={stuck} onClick={() => d1.toggleStuck()}>
      <span className="ds-sw" aria-hidden="true">
        <b />
      </span>
      I'm stuck
    </button>
  );
}

/* b14 (founder call): I'm stuck is instruction, not direction. Like Google Maps: do this, then this. The step she is on
   sits on top of the box until it is done; Done moves on, "How?" gets her answer and the step stays */
function StepCard() {
  const at = useD1((s) => s.stuckAt);
  const typing = useD1((s) => s.typing);
  const asked = useD1((s) => s.stuckAsked);
  const step = STUCK[at];
  const card = useRef<HTMLDivElement>(null);
  const done = () => {
    if (typing) return;
    if (at === 4) d1.shot();
    d1.send(step.chip);
  };
  useLayoutEffect(() => rise(card.current, { y: 8, blur: 6, ms: 420 }), [at]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|BUTTON)$/.test(t.tagName)) return;
      if (e.key === 'Enter') done();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  return (
    <div ref={card} className="ds-step" data-busy={typing || undefined}>
      <span className="ds-step-n d1-num">
        {at + 1}/{STUCK.length}
      </span>
      <span className="ds-step-t">{step.say}</span>
      {!asked && (
        <button type="button" className="ds-step-k" disabled={typing} onClick={() => d1.stuckAsk()}>
          How?
        </button>
      )}
      <button type="button" className="ds-step-k ds-step-done" disabled={typing} onClick={done}>
        <Check size={12} strokeWidth={2.4} />
        {step.chip}
      </button>
    </div>
  );
}

const useAttach = create<{ open: boolean; link: boolean }>(() => ({ open: false, link: false }));

function AttachKey() {
  const open = useAttach((s) => s.open);
  const ref = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) useAttach.setState({ open: false });
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && useAttach.setState({ open: false });
    window.addEventListener('pointerdown', out, true);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', out, true);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);
  const pick = (k: 'file' | 'link') => {
    useAttach.setState({ open: false });
    if (k === 'file') file.current?.click();
    else useAttach.setState({ link: true });
  };
  return (
    <div className="ds-attach-wrap" ref={ref}>
      <button
        type="button"
        className="d1-ghost"
        aria-label="Add a file or a link"
        aria-expanded={open}
        data-on={open || undefined}
        onClick={() => useAttach.setState({ open: !open })}
      >
        <Plus {...I} />
      </button>
      {open && (
        <div className="ds-attach" role="menu">
          <button type="button" role="menuitem" onClick={() => pick('file')}>
            <span className="ds-attach-i"><Paperclip size={15} strokeWidth={1.75} /></span>
            <span className="ds-attach-t">
              Upload a file
              <small>Sheet, CSV, doc or image</small>
            </span>
          </button>
          <button type="button" role="menuitem" onClick={() => pick('link')}>
            <span className="ds-attach-i"><Link2 size={15} strokeWidth={1.75} /></span>
            <span className="ds-attach-t">
              Add a link
              <small>Google Sheet, Doc or Drive</small>
            </span>
          </button>
        </div>
      )}
      <input
        ref={file}
        type="file"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) d1.attach(f.name, `${Math.max(1, Math.round(f.size / 1024))} KB`);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/* Add a link: a slim row inside the box, paste and Enter, it lands as a link card */
function LinkRow() {
  const [url, setUrl] = useState('');
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => box.current?.focus(), []);
  const ok = /^https?:\/\/\S+\.\S+/i.test(url.trim());
  const close = () => useAttach.setState({ link: false });
  const add = () => {
    if (!ok) return;
    let host = url.trim();
    try {
      host = new URL(host).hostname.replace(/^www\./, '');
    } catch {
      /* keep the raw text */
    }
    d1.attach(/docs\.google\.com\/spreadsheets/i.test(url) ? 'Google Sheet' : host, url.trim().replace(/^https?:\/\//, '').slice(0, 42), true);
    close();
  };
  return (
    <div className="ds-linkrow">
      <Link2 size={14} strokeWidth={1.75} />
      <input
        ref={box}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') add();
          if (e.key === 'Escape') close();
        }}
        placeholder="Paste a link"
        aria-label="Paste a link"
      />
      <button type="button" className="ds-linkrow-go" disabled={!ok} onClick={add}>
        Add
      </button>
      <button type="button" className="d1-ghost" aria-label="Cancel the link" onClick={close}>
        <X {...I} />
      </button>
    </div>
  );
}

/* b27 (his note: "the screenshot icon should be ... rounded, and at the bottom a plus icon and a dot dot thing, like the
   Windows screenshot icon"): his drawing on a 24 grid. Three round corners, dots between them, the plus where the
   fourth corner would be */
function ShotIcon({ size = 16 }: { size?: number }) {
  return (
    <svg className="ds-shot-ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.75 5.75A2 2 0 0 1 5.75 3.75M16.75 3.75A2 2 0 0 1 18.75 5.75M3.75 16.75A2 2 0 0 0 5.75 18.75" />
      <path d="M9.25 3.75h0M13.25 3.75h0M18.75 9.25h0M18.75 13.25h0M3.75 9.25h0M3.75 13.25h0M9.25 18.75h0M13.25 18.75h0" />
      <path d="M16.25 18.75h5M18.75 16.25v5" />
    </svg>
  );
}

function Composer() {
  const linking = useAttach((s) => s.link);
  const submitting = useSubmitting((s) => s.on);
  const [text, setText] = useState('');
  const stuck = useD1((s) => s.stuck);
  const phase = useD1((s) => s.phase);
  const ask = useD1((s) => s.ask && s.stageId === 'clean');
  const askStep = useD1((s) => s.askStep);
  const box = useRef<HTMLTextAreaElement>(null);
  const canStuck = phase === 'work' || phase === 'feedback';
  if (phase === 'brief') return null;
  if (submitting) return <SubmitBox />;
  const send = () => {
    if (!text.trim()) return;
    d1.send(text);
    setText('');
    box.current?.focus();
  };
  const hint =
    phase === 'pou'
      ? 'Answer Eryn'
      : stuck
        ? 'Tell her where you are'
        : ask && phase === 'work' && askStep === 'issues'
          ? 'Name an issue you see'
          : ask && phase === 'work' && askStep === 'prompt'
            ? 'Write the prompt you would send Claude'
            : 'Message Eryn';
  return (
    <>
      {stuck && <StepCard />}
      <div className="d1-comp" data-stuck={stuck || undefined}>
        {linking && <LinkRow />}
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
          placeholder={hint}
          aria-label="Message your manager"
        />
        <div className="d1-comp-row">
          <AttachKey />
          <button type="button" className="d1-ghost ds-shot-key" aria-label="Send her a screenshot" title="Send her a screenshot" onClick={() => d1.shot()}>
            <ShotIcon />
          </button>
          {canStuck && <StuckSwitch />}
          <span className="d1-grow" />
          <button type="button" className="d1-ghost" aria-label="Talk to her">
            <Mic {...I} />
          </button>
          <button type="button" className="d1-send" aria-label="Send" disabled={!text.trim()} onClick={send}>
            <ArrowUp size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  );
}

function Chat() {
  const project = useFlow((s) => s.project);
  const thread = useD1((s) => s.thread);
  const typing = useD1((s) => s.typing);
  const stuck = useD1((s) => s.stuck);
  const scroller = useRef<HTMLDivElement>(null);
  const stageId = useD1((s) => s.stageId);

  const spacer = useRef<HTMLDivElement>(null);
  const started = useD1((s) => s.phase !== 'brief');
  useLayoutEffect(() => {
    const el = scroller.current;
    const pad = spacer.current;
    if (!el || !pad) return;
    if (!started) {
      /* follow the newest line, but while you have not said anything yet never scroll the top of her brief away */
      pad.style.height = '0px';
      let top = el.scrollHeight;
      const brief = el.querySelector<HTMLElement>('[data-brief]');
      if (brief && !thread.some((i) => i.k === 'me' || i.k === 'chips' || i.k === 'shot')) top = Math.min(top, el.scrollTop + brief.getBoundingClientRect().top - el.getBoundingClientRect().top - 8);
      el.scrollTo({ top, behavior: 'smooth' });
      return;
    }
    /* b29 (his note: "let's do a normal chat, like how normal chat comes, till the bottom ... a little spacing at the
       bottom, but not extreme"): no room under the turn, the newest line follows the bottom like any chat */
    pad.style.height = '0px';
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [thread.length, typing, started]);

  const m = project?.manager;
  const drop = useDrop((s) => s.open);
  /* the Brief key only shows once her brief has scrolled out of view; while you can see it, it is right there */
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const root = scroller.current;
    const el = root?.querySelector('[data-brief]');
    if (!root || !el) return;
    const io = new IntersectionObserver(([e]) => setGone(!e.isIntersecting), { root, threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [thread.some((i) => i.k === 'brief')]);
  const showKey = gone || drop;
  const pv = useSide((s) => !!s.view);
  const pvW = useSide((s) => s.w);
  const pvDrag = useSide((s) => s.drag);
  return (
    <section className="d1-chat" data-enter data-pv={pv || undefined} data-drag={pvDrag || undefined} style={pvW ? ({ '--pv-w': `${pvW}px` } as React.CSSProperties) : undefined}>
      <div className="d1-who ds-who" data-stuck={stuck || undefined}>
        <span className="d1-face">
          {m && <img src={m.face} alt={m.full} />}
        </span>
        <span className="d1-who-t">
          <span>{m?.full}</span>
          <span className="d1-dim">{stuck ? 'Guiding you step by step' : m?.role}</span>
        </span>
        <span className="d1-grow" />
        <button type="button" className="ds-key ds-key-line" data-shown={showKey || undefined} tabIndex={showKey ? 0 : -1} aria-hidden={!showKey} data-on={drop || undefined} aria-expanded={drop} onClick={() => useDrop.setState({ open: !drop })}>
          <FileText size={14} strokeWidth={1.75} />
          Brief
        </button>
        <SubmitKey />
      </div>
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
        <div ref={spacer} className="ds-turn-room" aria-hidden />
      </div>
      <div className="d1-comp-wrap">
        <Composer />
      </div>
      <BriefDrop />
      <FixDrop />
      <Side />
    </section>
  );
}

/* ---------- PiP (from V3) ---------- */
/* b14 (founder call): the PiP is intentional, it opens only from this key, never when you switch windows. Out of Zero
   you are on your desktop with your tools; the PiP holds the chat and the requirements, nothing else. No mic key and no
   attachments: hover her face and talk, she sees your screen. Folds to one bar. Drags anywhere, resizes between limits. */
const PIP_MIN = 240;
const PIP_MAX = 380;
const usePip = create<{ open: boolean; tab: 'chat' | 'req'; w: number; x: number; y: number }>(() => ({ open: true, tab: 'chat', w: 264, x: -1, y: -1 }));

function PipKey() {
  const phase = useD1((s) => s.phase);
  if (phase === 'brief') return null;
  return (
    <button
      type="button"
      className="ds-pill ds-pipkey ds-modekey"
      aria-label="Pop out"
      title="Pop out: work in your tools with her beside you"
      onClick={() => popOut('sheets')}
    >
      <PictureInPicture2 {...I} />
    </button>
  );
}

function PipChat() {
  const thread = useD1((s) => s.thread);
  const typing = useD1((s) => s.typing);
  const scroller = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.length, typing]);
  const send = () => {
    if (!text.trim()) return;
    d1.send(text);
    setText('');
  };
  return (
    <>
      <div ref={scroller} className="ds-pip-scroll">
        {thread.map((it) =>
          it.k === 'her' ? (
            <p key={it.id} className="ds-pip-her" data-guide={it.guide || undefined}>
              {it.text}
            </p>
          ) : it.k === 'me' ? (
            <p key={it.id} className="ds-pip-me">
              {it.text}
            </p>
          ) : it.k === 'file' ? (
            <p key={it.id} className="ds-pip-file">
              <img src="static/logos/f-csv.svg" alt="" />
              {RAW_FILE.name}
            </p>
          ) : it.k === 'att' ? (
            <p key={it.id} className="ds-pip-seen">
              {it.link ? <Link2 size={11} strokeWidth={1.75} /> : <FileText size={11} strokeWidth={1.75} />}
              {it.name}
            </p>
          ) : it.k === 'shot' ? (
            <p key={it.id} className="ds-pip-seen">
              <ShotIcon size={11} />
              Viewed your screen
            </p>
          ) : it.k === 'prompt' ? (
            <p key={it.id} className="ds-pip-me">
              {it.text}
            </p>
          ) : null
        )}
        {typing && (
          <div className="d1-typing ds-pip-typing" aria-label="Eryn is typing">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
      <input
        className="ds-pip-in"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') send();
        }}
        placeholder="Message Eryn"
        aria-label="Message Eryn"
      />
    </>
  );
}

function MiniPip() {
  const m = useFlow((s) => s.project?.manager);
  const { open, tab, w, x, y } = usePip();
  const ask = useD1((s) => s.ask && s.stageId === 'clean');
  const last = useD1((s) => [...s.thread].reverse().find((i) => i.k === 'her'));
  const typing = useD1((s) => s.typing);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const size = useRef<{ x: number; w: number } | null>(null);
  const home = () => {
    const r = box.current?.getBoundingClientRect();
    if (r) spot.back = { x: r.left, y: r.top, w: r.width, h: r.height };
    useFlow.getState().actions.setSurface('big');
  };
  useLayoutEffect(() => rise(box.current, { y: 10, blur: 8, scale: 0.96, ms: 520, delay: 360 }), []);
  const left = x < 0 ? window.innerWidth - w - 24 : x;
  const top = y < 0 ? 64 : y;
  return (
    <div ref={box} className="ds-pip" data-open={open || undefined} style={{ width: w, left, top }}>
      <div
        className="ds-pip-bar"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          drag.current = { dx: e.clientX - left, dy: e.clientY - top };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current || !e.buttons) return;
          usePip.setState({
            x: Math.max(8, Math.min(window.innerWidth - w - 8, e.clientX - drag.current.dx)),
            y: Math.max(32, Math.min(window.innerHeight - 60, e.clientY - drag.current.dy)),
          });
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <button type="button" className="ds-pip-face" aria-label="Ask her, she sees your screen" title="Ask her" onClick={() => d1.shot()}>
          {m && <img src={m.face} alt="" />}
          <span className="ds-pip-mic" aria-hidden="true">
            <Mic size={13} strokeWidth={2} />
          </span>
        </button>
        <span className="ds-pip-who">
          <span>{m?.name ?? 'Eryn'}</span>
          <span className="d1-dim">{typing ? 'Typing' : open ? 'Ask her anything' : last?.k === 'her' ? last.text : 'Ask her anything'}</span>
        </span>
        <button type="button" className="d1-ghost" aria-label={open ? 'Fold to a bar' : 'Open'} onClick={() => usePip.setState({ open: !open })}>
          {open ? <Minus {...I} /> : <ChevronDown {...I} />}
        </button>
        <button type="button" className="d1-ghost" aria-label="Back to Zero" title="Back to Zero" onClick={home}>
          <Maximize2 size={13} strokeWidth={1.75} />
        </button>
      </div>
      {open && (
        <>
          <div className="ds-pip-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'chat'} onClick={() => usePip.setState({ tab: 'chat' })}>
              Chat
            </button>
            <button type="button" role="tab" aria-selected={tab === 'req'} onClick={() => usePip.setState({ tab: 'req' })}>
              {ask ? 'Asks' : 'Requirements'}
            </button>
          </div>
          <div className="ds-pip-body">{tab === 'chat' ? <PipChat /> : <div className="ds-pip-req"><StageWork /></div>}</div>
          <span
            className="ds-pip-size"
            role="separator"
            aria-label="Resize"
            onPointerDown={(e) => {
              size.current = { x: e.clientX, w };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!size.current || !e.buttons) return;
              const nw = Math.round(Math.min(PIP_MAX, Math.max(PIP_MIN, size.current.w - (e.clientX - size.current.x))));
              usePip.setState({ w: nw, x: left + (w - nw) });
            }}
            onPointerUp={() => (size.current = null)}
          />
        </>
      )}
    </div>
  );
}

/* ---------- b27: in Ask mode the PiP is zero-stage-five b23's bar (his note: "the pip that the V3 version has made was super
   good, you have to take that as well"). Her face, then keys of one size on one gap: talk with your screen, her asks,
   the chat, and Back to Zero on the far edge. No resources key (his note: "we don't need resources"). A key opens its
   view under the bar and the window grows up from where it sits; the same key folds it back to the bar ---------- */
const useAskPip = create<{ body: 'chat' | 'asks' | null; r: number; b: number }>(() => ({ body: null, r: 15, b: 78 }));
const ZP_I = { size: 18, strokeWidth: 1.75 };

function ZpKey({ name, on, mic, onClick, children }: { name: string; on?: boolean; mic?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="ds-zp-key" data-on={on || undefined} data-mic={mic || undefined} aria-label={name} aria-pressed={on} title={name} onClick={onClick}>
      {children}
    </button>
  );
}

function AskPipBox() {
  const [text, setText] = useState('');
  const send = () => {
    if (!text.trim()) return;
    d1.send(text);
    setText('');
  };
  return (
    <div className="ds-zp-comp">
      <textarea
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
        placeholder="Ask Eryn"
        aria-label="Message Eryn"
      />
      <div className="ds-zp-comp-row">
        <button type="button" className="d1-ghost" aria-label="Send her a screenshot" title="Send her a screenshot" onClick={() => d1.shot()}>
          <ShotIcon />
        </button>
        <StuckSwitch />
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

function AskPipChat({ home }: { home: () => void }) {
  const thread = useD1((s) => s.thread);
  const typing = useD1((s) => s.typing);
  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.length, typing]);
  return (
    <>
      <div ref={scroller} className="ds-zp-scroll">
        {thread.map((it) =>
          it.k === 'her' ? (
            <p key={it.id} className="ds-zp-her">
              {it.text}
              {it.tool && (
                <>
                  <br />
                  <ToolLink />
                </>
              )}
            </p>
          ) : it.k === 'me' || it.k === 'prompt' ? (
            <p key={it.id} className="ds-zp-me">
              {it.text}
            </p>
          ) : it.k === 'file' ? (
            <div key={it.id} className="ds-zp-file">
              <img src="static/logos/logo-sheets.svg" alt="" />
              <button
                type="button"
                className="ds-zp-file-t"
                onClick={() => {
                  home();
                  openSide('sheet');
                }}
              >
                <span>{RAW_FILE.name}</span>
                <span className="d1-dim">{RAW_FILE.meta}</span>
              </button>
              <button
                type="button"
                className="d1-ghost"
                aria-label="Preview"
                title="Preview"
                onClick={() => {
                  home();
                  openSide('sheet');
                }}
              >
                <Eye size={16} strokeWidth={1.75} />
              </button>
              <a className="d1-ghost" href={RAW_FILE.url} download aria-label="Download" title="Download">
                <Download size={16} strokeWidth={1.75} />
              </a>
            </div>
          ) : it.k === 'shot' ? (
            <p key={it.id} className="ds-zp-seen">
              <ShotIcon size={12} />
              Viewed your screen
            </p>
          ) : it.k === 'att' ? (
            <p key={it.id} className="ds-zp-seen">
              {it.link ? <Link2 size={12} strokeWidth={1.75} /> : <FileText size={12} strokeWidth={1.75} />}
              {it.name}
            </p>
          ) : null
        )}
        {typing && (
          <div className="d1-typing ds-zp-typing" aria-label="Eryn is typing">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
      <AskPipBox />
    </>
  );
}

function AskPip() {
  const m = useFlow((s) => s.project?.manager);
  const { body, r, b } = useAskPip();
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; r: number; b: number } | null>(null);
  const home = () => {
    const r = box.current?.getBoundingClientRect();
    if (r) spot.back = { x: r.left, y: r.top, w: r.width, h: r.height };
    useFlow.getState().actions.setSurface('big');
  };
  const toggle = (v: 'chat' | 'asks') => useAskPip.setState({ body: body === v ? null : v });
  useLayoutEffect(() => rise(box.current, { y: 10, blur: 8, scale: 0.96, ms: 520, delay: 360 }), []);
  return (
    <div ref={box} className="ds-zp" data-open={body ? '' : undefined} style={{ right: r, bottom: b }}>
      <div
        className="ds-zp-bar"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          drag.current = { x: e.clientX, y: e.clientY, r, b };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current || !e.buttons) return;
          const w = box.current?.offsetWidth ?? 0;
          const d = drag.current;
          useAskPip.setState({
            r: Math.max(8, Math.min(window.innerWidth - w - 8, d.r - (e.clientX - d.x))),
            b: Math.max(8, Math.min(window.innerHeight - 60, d.b - (e.clientY - d.y))),
          });
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <span className="ds-zp-face" title={m?.full}>
          {m && <img src={m.face} alt={m.full} draggable={false} />}
        </span>
        <ZpKey name="Talk with your screen" mic onClick={() => d1.shot()}>
          <Mic {...ZP_I} />
        </ZpKey>
        <ZpKey name="Manager's ask" on={body === 'asks'} onClick={() => toggle('asks')}>
          <ListChecks {...ZP_I} />
        </ZpKey>
        <ZpKey name="Chat with Eryn" on={body === 'chat'} onClick={() => toggle('chat')}>
          <MessageCircle {...ZP_I} />
        </ZpKey>
        <span className="d1-grow" />
        <ZpKey name="Back to Zero" onClick={home}>
          <Maximize2 {...ZP_I} />
        </ZpKey>
      </div>
      {body && (
        <div key={body} className="ds-zp-body" data-body={body}>
          {body === 'chat' ? (
            <AskPipChat home={home} />
          ) : (
            <div className="ds-zp-asks">
              <StageWork />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Pip() {
  const surface = useFlow((s) => s.ui.surface);
  const mode = useMode((s) => s.mode);
  const ask = useD1((s) => s.ask && s.stageId === 'clean');
  if (surface !== 'pip') return null;
  if (ask)
    return (
      <Desktop>
        <div className="zs2 d1 ds2 zd ds-zp-host" data-mode="dark">
          <AskPip />
        </div>
      </Desktop>
    );
  return (
    <Desktop>
      <div className={`zs2 d1 ds2 ds-pip-host ${mode === 'dark' ? 'zd' : 'z-light'}`} data-mode={mode}>
        <MiniPip />
      </div>
    </Desktop>
  );
}

export default function StageSame() {
  const engineStage = useFlow((s) => s.stage?.stageId ?? 'clean');
  const root = useRef<HTMLDivElement>(null);
  const mode = useMode((s) => s.mode);
  const ver = useVer((s) => s.ver);

  useEffect(() => {
    if (useD1.getState().stageId !== engineStage || useD1.getState().thread.length === 0) d1.begin(engineStage);
  }, [engineStage]);
  useEffect(() => () => d1.stop(), []);

  useLayoutEffect(() => {
    root.current?.querySelectorAll('[data-enter]').forEach((el, i) => rise(el, { y: 14, blur: 0, scale: 0.99, delay: i * 80, ms: 480 }));
  }, []);

  useDevAction('next', 'Next', () => void d1.next());
  useDevAction('d1-fix', 'Tick every fix', () => FEEDBACK.items.forEach((f) => !useD1.getState().fixed[f.id] && d1.fix(f.id)));
  useDevAction('d1-time', 'Add 35 minutes to the timer', () => d1.skew(35));
  useDevAction('ds-tools', 'Tools and training: switch V1 and V2', () => useLook.setState((l) => ({ tools: l.tools === 'v1' ? 'v2' : 'v1' })));
  useDevAction('d1-pou', 'Answer her check-in', () => d1.send('Because every number after it depends on it.'));
  useDevAction('ds-ask', 'Ask mode on or off', () => d1.setAsk(!useD1.getState().ask));
  useDevAction('ds-start', 'Got it, let\'s start', () => d1.start());
  useDevAction('ds-issues', 'Name five issues', () => ['duplicates', 'no currency', 'negative prices', 'test accounts', 'dates'].forEach((t, i) => window.setTimeout(() => d1.send(t), i * 1400)));
  useDevAction('ds-prompt', 'Send the prompt', () => d1.send('Remove duplicate customers, add the currency to every price, drop test accounts and negative prices, and write every date as YYYY-MM-DD.'));

  return (
    <div ref={root} className={`zs2 d1 ds2 ${mode === 'dark' ? 'zd' : 'z-light'}`} data-mode={mode}>
      <div className="d1-frame">
        <TopBar />
        <div className="d1-body" data-ver={ver}>
          {ver === 'v2' ? <Work2 /> : ver === 'v3' ? <Work3 /> : <Rail />}
          <Chat />
        </div>
        <FilmPop />
      </div>
      <Pip />
    </div>
  );
}
