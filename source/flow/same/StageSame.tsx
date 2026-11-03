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
  ArrowRight,
  Lock,
} from 'lucide-react';
import { looksPrivate } from './linkAccess';
import { leaveStage } from './leave';
import { frame, shotName, snip } from './snip';
import { Hold, PouMeter, Typed, useSpaceTalk } from '../room/pou/PouView';
import { CheckThread } from './CheckThread';
import { canHear, useHoldUi } from '../room/hold';
import { pouAnswerForMe, usePou } from '../room/pou';
import { useDevAction } from '../dev/store';
import { create } from 'zustand';
import { useFlow } from '../engine/store';
import { speak, hushSpeech } from '../engine/speak';
import { voiceRate } from '../audio';
import { rise } from '../stage/parts/util';
import '../stage/stage.css';
import '../d1/d1.css';
import './ds.css';
import { ASK_GROUPS, BRIEF, BRIEF_2, BURN, ISSUES, ISSUE_ENOUGH, RAW_FILE, SCENARIO, STUCK, TIERS, tierAt } from './script';
import { type D1 } from './store';
import Desktop from '../pip/desktop/Desktop';
import ClaudeApp from '../pip/desktop/ClaudeApp';
import { parse } from '../data/csv';
import { openDesktopApp, spot } from '../pip/desktop/deskStore';
import { BRIEF_PARTS, d1, fixesOf, minutesIn, slotAt, useD1, type Item } from './store';
import { specOf, workOf, type Slide, type Work } from './stages';
import { joinCall } from '../present/Live';

const I = { size: 14, strokeWidth: 1.75 };

/* b31: one copy key for anything you will paste somewhere else. The check holds for a beat */
const COPIED_MS = 1400;
function CopyKey({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="ds-copy"
      aria-label={label}
      title={done ? 'Copied' : 'Copy'}
      data-done={done || undefined}
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(text).catch(() => undefined);
        setDone(true);
        window.setTimeout(() => setDone(false), COPIED_MS);
      }}
    >
      {done ? <Check size={13} strokeWidth={2.4} /> : <Copy size={13} strokeWidth={1.75} />}
    </button>
  );
}

/* what you picked or snipped waits in the box until you send. Shared so her screenshot step can fill it */
type Draft = { name: string; meta: string; img?: string };
const useDraft = create<{ d: Draft | null }>(() => ({ d: null }));
const setDraft = (d: Draft | null) => {
  const was = useDraft.getState().d;
  if (was?.img?.startsWith('blob:') && was.img !== d?.img) URL.revokeObjectURL(was.img);
  useDraft.setState({ d });
};
const takeShot = async () => {
  const s = await snip();
  if (s) setDraft(s);
  window.setTimeout(() => document.querySelector<HTMLTextAreaElement>('.d1-comp textarea')?.focus(), 0);
};
const briefOf = (id: string) => (id === 'clean' ? BRIEF : (specOf(id)?.brief ?? BRIEF_2));
/* b35: the file she hands you on this stage. Stage 1 the raw export, then the clean file, then your model */
const fileOf = (id: string) => specOf(id)?.file ?? RAW_FILE;
const useFile = () => fileOf(useD1((s) => s.stageId));
/* b35: nothing to hand in until every slot she asked is ticked */
const slotsLeft = (s: D1) => {
  const sp = specOf(s.stageId);
  return !!sp && s.phase === 'work' && !!slotAt(sp, s);
};

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
  const sp = specOf(s.stageId);
  if (sp && s.phase === 'work') return 0.06 + (sp.slots.filter((x) => s.met[x.id]).length / sp.slots.length) * 0.44;
  return PHASE_P[s.phase] ?? 0;
};

function TopBar() {
  const project = useFlow((s) => s.project);
  const stageId = useD1((s) => s.stageId);
  const p = useD1(progressOf);
  const n = (project?.stages.findIndex((x) => x.id === stageId) ?? 0) + 1;
  const named = RAIL[stageId] ?? { title: briefOf(stageId).stage };
  const ver = useVer((s) => s.ver);
  /* b32 (his note: "when we just say 'explain to Eryn,' it's better to remove the top progress bar and top timer"): they step away */
  const checking = useD1((s) => s.phase === 'pou' || s.phase === 'done');
  return (
    <header className="d1-top ds-top" data-enter data-check={checking || undefined}>
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
            {g.id === 'prompt' && s.prompt && (
              <p className="ds-ask-v ds-has-copy">
                <span>{s.prompt}</span>
                <CopyKey text={s.prompt} label="Copy the prompt" />
              </p>
            )}
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
/* b36 (his note: "when we click on Prompt ... the Read More button should be there so we can see the whole bigger prompt") */
const LONG_TODO = 90;
function TodoRow({ on, text, pop, copy }: { on: boolean; text?: string; pop?: number; copy?: boolean }) {
  const [open, setOpen] = useState(false);
  const long = !!copy && on && (text?.length ?? 0) > LONG_TODO;
  return (
    <li className="ds-td-row" data-on={on || undefined} data-pop={pop} data-copy={(copy && on) || undefined}>
      <span className="ds-td-m">{on && <Check size={15} strokeWidth={2.4} />}</span>
      <span className="ds-td-tw">
        <span className="ds-td-t" data-blank={!on || undefined} data-open={open || undefined}>
          {on ? text : TODO_BLANK}
        </span>
        {long && (
          <button type="button" className="ds-td-more" onClick={() => setOpen((v) => !v)}>
            {open ? 'Show less' : 'Read more'}
          </button>
        )}
      </span>
      {copy && on && text && <CopyKey text={text} label="Copy the prompt" />}
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
            <TodoRow key={r.id} on={s.phase !== 'brief' && !!s.met[r.id]} text={r.text} pop={s.pop?.id === r.id ? s.pop.n : undefined} />
          ))}
        </TodoPart>
        <TodoPart title="Submission" state={sent ? 'done' : 'next'}>
          <TodoRow on={sent} text={specOf(s.stageId)?.sentLine ?? 'Clean sheet sent'} />
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
        {/* b36 (his note: "why do we have an empty space at the bottom ... if we are not identifying that, it should not be
            there"): only the issues you have named, one blank line until the first */}
        {ISSUES.filter((it) => s.found.includes(it.id)).map((it) => (
          <TodoRow key={it.id} on text={it.label} pop={s.pop?.id === it.id ? s.pop.n : undefined} />
        ))}
        {!ISSUES.some((it) => s.found.includes(it.id)) && <TodoRow on={false} />}
      </TodoPart>
      <TodoPart title={ASK_GROUPS[1].title} state={st(1)}>
        <TodoRow on={!!s.prompt} text={s.prompt} copy />
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
      {/* b30 (his note: "Please remove to-dos, brother") */}
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
        {/* b30 (his note: "in the V3 version ... just add a simple title") */}
        <h5 className="ds-td-h ds-w3-h">Requirements</h5>
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
  const left = useD1((s) => fixesOf(s.stageId).filter((f) => !s.fixed[f.id]).length);
  const on = useSubmitting((s) => s.on);
  /* ask mode: you hand in only after her asks, never before */
  const gated = useD1((s) => (s.ask && s.stageId === 'clean' && s.phase === 'work' && s.askStep !== 'submit') || slotsLeft(s));
  const ready = (phase === 'work' && !gated) || phase === 'feedback';
  /* b30 (his note: "the approved and this thing don't make sense"): once she has signed it off the key goes */
  if (phase === 'brief' || phase === 'approved' || phase === 'pou' || phase === 'done') return null;
  const label =
    phase === 'review'
      ? 'Checking'
      : phase === 'feedback'
        ? 'Resubmit'
        : 'Submit';
  return (
    <button
      type="button"
      className="ds-key ds-key-ink"
      disabled={(!ready && !on) || (phase === 'feedback' && left > 0)}
      data-on={on || undefined}
      data-busy={phase === 'review' || undefined}
      onClick={() => {
        if (phase === 'feedback') {
          useSubmitting.setState({ on: false });
          d1.submit();
        } else useSubmitting.setState({ on: !on });
      }}
    >
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
        {(stageId === 'clean' || !!specOf(stageId)) && n >= 3 && (
          <>
            <dt className="ds-in">
              <Paperclip size={14} strokeWidth={1.75} />
              Resources
            </dt>
            <dd className="ds-in ds-res-dd">
              <button type="button" className="ds-it" onClick={() => openSide('sheet')} title="Preview">
                <img src="static/logos/logo-sheets.svg" alt="" />
                <span className="ds-it-n">{fileOf(stageId).name}</span>
                <span className="ds-it-m d1-num">{fileOf(stageId).meta}</span>
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
  const fb = briefOf(useD1((s) => s.stageId));
  const tool = kind === 'tool' ? fb.tools.find((x) => x.id === id) : undefined;
  const tr = kind === 'train' ? fb.training.find((x) => x.id === id) : undefined;
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
  useZq.setState({ body: null, mode: 'rest', tip: null });
  const { r, b } = useZq.getState();
  spot.pip = { x: window.innerWidth - r - ZQ.rest, y: window.innerHeight - b - 44, w: ZQ.rest, h: 44 };
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
const useSide = create<{ view: 'sheet' | 'claude' | 'work' | null; w: number; drag: boolean }>(() => ({ view: null, w: 0, drag: false }));
const PV_MIN = 340;
const CHAT_MIN = 400;
const openSide = (view: 'sheet' | 'claude' | 'work') => useSide.setState({ view });
const RAW: Record<string, { text: string | null; p: Promise<string> | null }> = {};
function useRawText(own?: string) {
  const f = useFile();
  const url = own ?? f.url;
  const c = (RAW[url] ??= { text: null, p: null });
  const [got, setGot] = useState<{ url: string; text: string | null }>({ url, text: c.text });
  useEffect(() => {
    if (c.text !== null) return setGot({ url, text: c.text });
    c.p ??= fetch(url)
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '');
    let live = true;
    void c.p.then((t) => {
      c.text = t;
      if (live) setGot({ url, text: t });
    });
    return () => {
      live = false;
    };
  }, [url, c]);
  return got.url === url ? got.text : c.text;
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
  const RAW_FILE = useFile();
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
  const RAW_FILE = useFile();
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

const LINK_LOGO: Record<string, string> = { 'Google Docs': 'static/logos/logo-docs.svg', 'Google Slides': 'static/logos/logo-slides.svg' };

/* the whole sheet as Google Sheets draws it: letters across, numbers down, the header row held */
function GsTable({ url }: { url?: string }) {
  const text = useRawText(url);
  const table = useMemo(() => (text ? parse(text) : null), [text]);
  if (!table) return null;
  return (
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
  );
}

/* b36: in the stage 5 presentation the deck turns to the slide her question is about */
function useSlideAt(n: number) {
  const sp = specOf(useD1((s) => s.stageId));
  const lastHer = usePou((s) => [...s.thread].reverse().find((m) => m.from === 'her')?.text ?? '');
  const ended = usePou((s) => s.ended);
  const at = sp ? sp.check.findIndex((c) => c.q === lastHer || c.more.includes(lastHer)) : -1;
  return Math.max(0, Math.min(n - 1, at < 0 ? (ended ? n - 1 : 0) : at));
}

function SlideFace({ s, i }: { s: Slide; i: number }) {
  const top = s.bars ? Math.max(...s.bars.map((b) => b.v)) : 1;
  return (
    <div className="ds-sl" data-n={i + 1}>
      <h3 className="ds-sl-t">{s.title}</h3>
      {s.big && <p className="ds-sl-big d1-num">{s.big}</p>}
      {s.bars && (
        <div className="ds-sl-bars">
          {s.bars.map((b) => (
            <span key={b.label} className="ds-sl-bar" data-hi={b.hi || undefined}>
              <span className="ds-sl-bl">{b.label}</span>
              <span className="ds-sl-bt">
                <i style={{ width: `${(b.v / top) * 100}%` }} />
              </span>
              <span className="ds-sl-bv d1-num">${b.v.toFixed(2)}</span>
            </span>
          ))}
        </div>
      )}
      {s.lines && (
        <ul className="ds-sl-ls">
          {s.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      {s.sub && <p className="ds-sl-sub">{s.sub}</p>}
    </div>
  );
}

function DeckPane({ work }: { work: Extract<Work, { kind: 'deck' }> }) {
  const at = useSlideAt(work.slides.length);
  const [pick, setPick] = useState<number | null>(null);
  useEffect(() => setPick(null), [at]);
  const on = pick ?? at;
  const stage = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => rise(stage.current, { y: 10, blur: 8, ms: 460 }), [on]);
  return (
    <div className="ds-pv-deck">
      <div ref={stage} className="ds-sl-stage" key={on}>
        <SlideFace s={work.slides[on]} i={on} />
      </div>
      <div className="ds-sl-strip">
        {work.slides.map((s, i) => (
          <button key={s.title} type="button" className="ds-sl-th" data-on={i === on || undefined} aria-label={`Slide ${i + 1}`} onClick={() => setPick(i)}>
            <span className="ds-sl-thn d1-num">{i + 1}</span>
            <span className="ds-sl-thf">
              <SlideFace s={s} i={i} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DocPane({ work }: { work: Extract<Work, { kind: 'doc' }> }) {
  return (
    <div className="ds-pv-doc">
      <article className="ds-doc">
        {work.to && <p className="ds-doc-to">{work.to}</p>}
        <h3 className="ds-doc-t">{work.title}</h3>
        {work.blocks.map((b, i) => (
          <section key={i} className="ds-doc-b" data-lead={i === 0 || undefined}>
            {b.h && <h4 className="ds-doc-h">{b.h}</h4>}
            {b.p && <p className="ds-doc-p">{b.p}</p>}
            {b.rows && (
              <table className="ds-doc-tb">
                <thead>
                  <tr>
                    {b.rows[0].map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.slice(1).map((r) => (
                    <tr key={r[0]}>
                      {r.map((c, j) => (
                        <td key={j} className={j ? 'd1-num' : undefined}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {b.link && (
              <span className="ds-doc-link">
                <img src="static/logos/logo-sheets.svg" alt="" />
                {b.link}
              </span>
            )}
          </section>
        ))}
      </article>
    </div>
  );
}

function WorkPane({ work }: { work: Work }) {
  if (work.kind === 'sheet')
    return (
      <div className="ds-pv-sheet">
        <div className="ds-gs-box">
          <GsTable url={work.file.url} />
        </div>
      </div>
    );
  if (work.kind === 'doc') return <DocPane work={work} />;
  return <DeckPane work={work} />;
}

/* the right side, behind one hairline: the whole sheet, or Claude. Esc or the X closes it */
function Side() {
  const view = useSide((s) => s.view);
  const RAW_FILE = useFile();
  const work = workOf(useD1((s) => s.stageId));
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
  if (!view || (view === 'work' && !work)) return null;
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
    <aside ref={box} className="ds-pv" data-view={view} aria-label={view === 'work' && work ? work.name : view === 'sheet' ? RAW_FILE.name : 'Claude'}>
      <span className="ds-pv-grip" role="separator" aria-orientation="vertical" aria-label="Resize" onPointerDown={grip} onDoubleClick={() => useSide.setState({ w: 0 })} />
      {view === 'work' && work ? (
        <header className="ds-pv-h">
          {work.logo ? <img className="ds-pv-ico" src={work.logo} alt="" /> : <FileText className="ds-pv-ico" size={16} strokeWidth={1.75} />}
          <span className="ds-pv-t">{work.name}</span>
          <span className="ds-pv-m d1-num">{work.meta}</span>
          <span className="d1-grow" />
          {work.kind === 'sheet' && (
            <a className="d1-ghost" href={work.file.url} download aria-label={`Download ${work.name}`} title="Download">
              <Download {...I} />
            </a>
          )}
          <button type="button" className="d1-ghost" aria-label="Close" onClick={close}>
            <X {...I} />
          </button>
        </header>
      ) : (
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
      )}
      {view === 'work' && work ? (
        <WorkPane work={work} />
      ) : view === 'sheet' ? (
        <div className="ds-pv-sheet">
          <div className="ds-gs-box">
            <GsTable />
          </div>
        </div>
      ) : (
        <div className="ds-pv-cl">
          <ClaudeApp />
        </div>
      )}
    </aside>
  );
}

/* b30 (his note: "it's not faster. It has to be like estimated 2 minutes"): under your link, while she looks at it */
function Sent({ est }: { est: string }) {
  const name = useFlow((s) => s.project?.manager?.name.split(' ')[0] ?? 'She');
  return (
    <span className="ds-sent" aria-live="polite">
      <span className="ds-sent-t">{name} is reviewing</span>
      <span className="ds-sent-e">Estimated {est}</span>
    </span>
  );
}

export function FeedbackCard({ inPanel = false }: { inPanel?: boolean }) {
  const fixed = useD1((s) => s.fixed);
  const phase = useD1((s) => s.phase);
  const can = useD1((s) => d1.canSubmit(s));
  const after = phase !== 'feedback' && phase !== 'review';
  const items = fixesOf(useD1((s) => s.stageId));
  return (
    <div className="d1-fb" data-panel={inPanel || undefined}>
      {items.map((f, i) => (
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

/* b31 (his note: "super high quality previews for every freaking thing. If it's a screenshot, just make a preview and
   just a screenshot name, and that's it. Truncate. Same goes for Google Sheets: a preview or a Google Sheet icon"):
   a picture you send is the picture and its name; a sheet you send is its first rows and the Sheets mark */
function ImgCard({ src, name }: { src: string; name: string }) {
  return (
    <figure className="ds-pc ds-pc-img">
      <span className="ds-pc-peek">
        <img src={src} alt="" draggable={false} />
      </span>
      <figcaption className="ds-pc-foot">
        <span className="ds-pc-name" title={name}>
          {name}
        </span>
      </figcaption>
    </figure>
  );
}
function ShotCard({ name }: { name: string }) {
  const text = useRawText();
  return (
    <figure className="ds-pc ds-pc-img">
      <span className="ds-pc-peek" data-kind="sheet">
        {text ? <MiniSheet text={text} /> : <span className="ds-fcard-wait" />}
      </span>
      <figcaption className="ds-pc-foot">
        <span className="ds-pc-name" title={name}>
          {name}
        </span>
      </figcaption>
    </figure>
  );
}
function SheetLinkCard({ name, meta }: { name: string; meta: string }) {
  const own = specOf(useD1((s) => s.stageId))?.hand.preview;
  const text = useRawText(own);
  return (
    <figure className="ds-pc ds-pc-sheet">
      <span className="ds-pc-peek" data-kind="sheet">
        {text ? <MiniSheet text={text} /> : <span className="ds-fcard-wait" />}
      </span>
      <figcaption className="ds-pc-foot">
        <img className="ds-pc-ico" src="static/logos/logo-sheets.svg" alt="" draggable={false} />
        <span className="ds-pc-t">
          <span className="ds-pc-name" title={name}>
            {name}
          </span>
          <span className="ds-pc-meta">{meta}</span>
        </span>
        <Link2 size={14} strokeWidth={1.75} className="ds-pc-link" />
      </figcaption>
    </figure>
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
          <ShotCard name={it.name} />
        </div>
      );
    case 'seen':
      return (
        <div ref={row} className="d1-row d1-row-her">
          <p className="ds-seen" tabIndex={0} aria-label="Eryn viewed your screen">
            {it.img && <img src={it.img} alt="" />}
            <span className="ds-seen-t">Viewed your screen</span>
          </p>
        </div>
      );
    case 'att':
      if (it.img)
        return (
          <div ref={row} className="d1-row d1-row-me">
            <ImgCard src={it.img} name={it.name} />
          </div>
        );
      if (it.sheet)
        return (
          <div ref={row} className="d1-row d1-row-me">
            <SheetLinkCard name={it.name} meta={it.meta} />
          </div>
        );
      return (
        <div ref={row} className="d1-row d1-row-me">
          <button type="button" className="ds-att" aria-label={`Open ${it.name}`} onClick={() => openSide('work')}>
            <span className="ds-att-i" aria-hidden="true" data-logo={LINK_LOGO[it.meta] ? '' : undefined}>
              {LINK_LOGO[it.meta] ? <img src={LINK_LOGO[it.meta]} alt="" draggable={false} /> : it.link ? <Link2 size={15} strokeWidth={1.75} /> : <FileText size={15} strokeWidth={1.75} />}
            </span>
            <span className="d1-file-t">
              <span>{it.name}</span>
              <span className="d1-dim">{it.meta}</span>
            </span>
          </button>
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
    case 'sent':
      return (
        <div ref={row} className="d1-row d1-row-me ds-sent-row">
          <Sent est={it.est} />
        </div>
      );
    case 'feedback':
      return (
        <div ref={row} className="d1-row d1-row-her" data-fb>
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
        <label className="ds-sub-drop">
          <Upload size={16} strokeWidth={1.75} />
          Upload file
          <input type="file" accept=".pdf,.csv,.pptx,.docx" hidden onChange={(e) => e.target.files?.length && send()} />
        </label>
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

/* b31 (his note: "manager, ask us something, and we have an option to say 1, 2, or the third option, which is Other ... I
   think you did it previously ... that was really, really great"): stuck mode is her question with your answers under
   it. 1 says you did it, 2 is the question most people have, Other puts you in the box to say it your way. Number keys
   pick */
function AskCard({ focusBox }: { focusBox: () => void }) {
  const at = useD1((s) => s.stuckAt);
  const typing = useD1((s) => s.typing);
  const asked = useD1((s) => s.stuckAsked);
  const step = STUCK[at];
  const card = useRef<HTMLDivElement>(null);
  const opts = [
    { label: step.chip, go: () => (step.snip ? void takeShot() : d1.send(step.chip)) },
    ...(asked ? [] : [{ label: step.alt, go: () => d1.stuckAsk() }]),
    { label: 'Other', go: focusBox, other: true },
  ];
  useLayoutEffect(() => rise(card.current, { y: 8, blur: 6, ms: 420 }), [at]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (typing || isTyping(e.target)) return;
      const n = Number(e.key);
      if (n >= 1 && n <= opts.length) {
        e.preventDefault();
        opts[n - 1].go();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  return (
    <div ref={card} className="ds-askc" data-busy={typing || undefined} role="group" aria-label="Your answer">
      {opts.map((o, i) => (
        <button key={o.label} type="button" className="ds-askc-o" data-other={o.other || undefined} disabled={typing} onClick={o.go}>
          <span className="ds-askc-n d1-num">{i + 1}</span>
          <span className="ds-askc-t">{o.label}</span>
          {o.other && <span className="ds-askc-h">Type it below</span>}
        </button>
      ))}
    </div>
  );
}
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(t.tagName);

/* b30 (his note: "let's remove Submit a link and all ... we don't have a pop-up now. It's just like an upload: when you
   click it, it just opens up a browser"): the + key opens the file picker, nothing else */
function AttachKey({ pick }: { pick: (d: Draft) => void }) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="ds-attach-wrap">
      <button type="button" className="d1-ghost" aria-label="Upload a file" title="Upload a file" onClick={() => file.current?.click()}>
        <Plus {...I} />
      </button>
      <input
        ref={file}
        type="file"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            let img: string | undefined;
            try {
              img = f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined;
            } catch {
              img = undefined;
            }
            pick({ name: f.name, meta: `${Math.max(1, Math.round(f.size / 1024))} KB`, img });
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}

/* what you picked waits in the box, above your words, until you send */
function DraftCard({ d, drop }: { d: Draft; drop: () => void }) {
  const card = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => rise(card.current, { y: 8, blur: 6, scale: 0.96, ms: 420 }), []);
  if (d.img)
    return (
      <div ref={card} className="ds-draft ds-draft-img">
        <img src={d.img} alt={d.name} draggable={false} />
        <button type="button" className="ds-draft-x" aria-label="Remove the picture" onClick={drop}>
          <X size={12} strokeWidth={2} />
        </button>
      </div>
    );
  return (
    <div ref={card} className="ds-draft">
      <span className="ds-att-i" aria-hidden="true" data-img={d.img ? '' : undefined}>
        {d.img ? <img src={d.img} alt="" draggable={false} /> : <FileText size={15} strokeWidth={1.75} />}
      </span>
      <span className="d1-file-t">
        <span>{d.name}</span>
        <span className="d1-dim">{d.meta}</span>
      </span>
      <button type="button" className="ds-draft-x" aria-label="Remove the file" onClick={drop}>
        <X size={12} strokeWidth={2} />
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

/* b30: once she signs it off the box is one key, the check-in is her voice notes and your hold to talk, then the next stage */
function Cta({ label, onClick }: { label: string; onClick: () => void }) {
  const key = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => rise(key.current, { y: 12, blur: 8, scale: 0.96, ms: 520 }), [label]);
  return (
    <button ref={key} type="button" className="ds-cta" autoFocus onClick={onClick}>
      {label}
      <ArrowRight size={16} strokeWidth={2} />
    </button>
  );
}

function TalkBox() {
  const [hear] = useState(canHear);
  useSpaceTalk(hear);
  return <div className="ds-pou b-light">{hear ? <Hold /> : <Typed />}</div>;
}

function Composer() {
  const submitting = useSubmitting((s) => s.on);
  const [text, setText] = useState('');
  const draft = useDraft((s) => s.d);
  const stuck = useD1((s) => s.stuck);
  const phase = useD1((s) => s.phase);
  const stageId = useD1((s) => s.stageId);
  const ask = useD1((s) => s.ask && s.stageId === 'clean');
  const askStep = useD1((s) => s.askStep);
  const project = useFlow((s) => s.project);
  const ended = usePou((s) => s.ended);
  const box = useRef<HTMLTextAreaElement>(null);
  const canStuck = phase === 'work' || phase === 'feedback';
  if (phase === 'brief') return null;
  if (submitting) return <SubmitBox />;
  const manager = project?.manager.name.split(' ')[0] ?? 'her';
  if (phase === 'approved') return <Cta label={`Explain it to ${manager}`} onClick={() => d1.check()} />;
  if (phase === 'pou' && !ended) return <TalkBox />;
  if (phase === 'pou' || phase === 'done') {
    const stages = project?.stages ?? [];
    const at = stages.findIndex((x) => x.id === stageId);
    const next = stages[at + 1];
    if (!next) return phase === 'done' ? (stageId === 'deck' ? <Cta label="Join the call" onClick={joinCall} /> : <Cta label="Finish the project" onClick={() => void leaveStage(stageId)} />) : null;
    return <Cta label={`Continue to stage ${at + 2}`} onClick={() => void leaveStage(stageId)} />;
  }
  const send = () => {
    if (!text.trim() && !draft) return;
    d1.post(text, draft ?? undefined);
    setText('');
    /* sent: the picture now lives in the chat, so it is not let go */
    useDraft.setState({ d: null });
    box.current?.focus();
  };
  const hint = stuck
    ? 'Or say it your way'
    : ask && phase === 'work' && askStep === 'issues'
      ? 'Name an issue you see'
      : ask && phase === 'work' && askStep === 'prompt'
        ? 'Write the prompt you would send Claude'
        : `Message ${manager}`;
  return (
    <>
      {stuck && <AskCard focusBox={() => box.current?.focus()} />}
      <div className="d1-comp" data-stuck={stuck || undefined}>
        {draft && (
          <DraftCard d={draft} drop={() => setDraft(null)} />
        )}
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
          <AttachKey
            pick={(d) => {
              setDraft(d);
              box.current?.focus();
            }}
          />
          <button type="button" className="d1-ghost ds-shot-key" aria-label="Take a screenshot" title="Take a screenshot" onClick={() => void takeShot()}>
            <ShotIcon />
          </button>
          {canStuck && <StuckSwitch />}
          <span className="d1-grow" />
          <button type="button" className="d1-ghost" aria-label="Talk to her">
            <Mic {...I} />
          </button>
          <button type="button" className="d1-send" aria-label="Send" disabled={!text.trim() && !draft} onClick={send}>
            <ArrowUp size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  );
}

/* b30 (his note: "the feedback thing should be sticky just below the manager, like how in WhatsApp we have a pin thing
   ... a whole horizontal thing where the feedback is ... when you open the dropdown ... it should be at the top, not at
   the bottom"): her fixes stay pinned under her name while you work. The bar opens downward into the same list you tick
   in the chat, over the thread, so nothing squeezes */
function FbPin() {
  const phase = useD1((s) => s.phase);
  const left = useD1((s) => fixesOf(s.stageId).filter((f) => !s.fixed[f.id]).length);
  const has = useD1((s) => s.thread.some((i) => i.k === 'feedback'));
  const open = useFixDrop((s) => s.open);
  const box = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const on = phase === 'feedback' && has;
  useEffect(() => {
    if (!on) closeFixes();
  }, [on]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && closeFixes();
    const out = (e: PointerEvent) => !box.current?.contains(e.target as Node) && closeFixes();
    window.addEventListener('keydown', k);
    window.addEventListener('pointerdown', out);
    return () => {
      window.removeEventListener('keydown', k);
      window.removeEventListener('pointerdown', out);
    };
  }, [open]);
  useLayoutEffect(() => {
    if (open) rise(sheet.current, { y: -10, blur: 8, scale: 0.98, ms: 420 });
  }, [open]);
  if (!on) return null;
  return (
    <div ref={box} className="ds-pin" data-open={open || undefined}>
      <button type="button" className="ds-pin-k" aria-expanded={open} onClick={() => useFixDrop.setState({ open: !open })}>
        {/* b31 (his note: "just make it like 'Feedback v1'. That's it") */}
        <span className="ds-pin-t">Feedback v1</span>
        <span className="ds-pin-n">{left > 0 ? `${left} ${left === 1 ? 'fix' : 'fixes'} to go` : 'Ready to resubmit'}</span>
        <ChevronDown size={14} strokeWidth={2} className="ds-pin-c" />
      </button>
      {open && (
        <div ref={sheet} className="ds-pin-s" role="region" aria-label="Her feedback">
          <FeedbackCard inPanel />
        </div>
      )}
    </div>
  );
}

const CHECK_ROOM = 24;
function Chat() {
  const project = useFlow((s) => s.project);
  const thread = useD1((s) => s.thread);
  const typing = useD1((s) => s.typing);
  const stuck = useD1((s) => s.stuck);
  const scroller = useRef<HTMLDivElement>(null);
  const stageId = useD1((s) => s.stageId);

  const spacer = useRef<HTMLDivElement>(null);
  const started = useD1((s) => s.phase !== 'brief');
  const phase = useD1((s) => s.phase);
  const checking = phase === 'pou' || phase === 'done';
  /* her voice notes and your answers follow the bottom like the rest of the chat */
  const pouN = usePou((s) => s.thread.length);
  const pouSpeaking = usePou((s) => s.speaking);
  const pouRec = usePou((s) => !!s.recording);
  const pouEnded = usePou((s) => s.ended);
  const sending = useHoldUi((s) => s.sending);
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
    /* b31 (his note: "when it goes to explain ... the whole chat and all just scroll super up. Then ... the bar meter comes
       up slowly ... and then she sends the first voice note"): the check-in gets a clear page, its notes run from the top */
    /* b36 (his note: "why do we have that spacing at the bottom ... let's have a normal thing"): the key sits right under
       her last note, the room goes under the key */
    /* b36 (his note: "the stage screen just gets removed ... It should not get deleted, right? It's a bug"): the check-in
       no longer clears the page, it carries on under the chat like any other turn */
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [thread.length, typing, started, pouN, pouSpeaking, pouRec, pouEnded, sending, checking]);

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
  const pv = useSide((s) => !!s.view && (s.view !== 'work' || !!workOf(stageId)));
  const pvW = useSide((s) => s.w);
  /* b36: through the check-in what you made stays open on the right, behind the divider */
  useEffect(() => {
    if (checking && workOf(stageId)) useSide.setState({ view: 'work' });
    else if (!checking && useSide.getState().view === 'work') useSide.setState({ view: null });
  }, [checking, stageId]);
  const pvDrag = useSide((s) => s.drag);
  return (
    <section className="d1-chat" data-enter data-pv={pv || undefined} data-drag={pvDrag || undefined} style={pvW ? ({ '--pv-w': `${pvW}px` } as React.CSSProperties) : undefined}>
      <div className="d1-who ds-who" data-stuck={stuck || undefined} data-check={checking || undefined}>
        <span className="d1-face">
          {m && <img src={m.face} alt={m.full} />}
        </span>
        <span className="d1-who-t">
          <span>{m?.full}</span>
          <span className="d1-dim">{stuck ? 'Guiding you step by step' : m?.role}</span>
        </span>
        <span className="d1-grow" />
        {/* b30 (his note: "instead of the brief and the approve thing, there will be a brain meter and the three dashes") */}
        {/* b32 (his note: "The brain meter ... can come to the center towards the chat"): it sits in the middle of the chat column */}
        {checking ? (
          <span className="ds-pou ds-pou-m b-light">
            <PouMeter />
          </span>
        ) : (
          <>
        <button type="button" className="ds-key ds-key-line" data-shown={showKey || undefined} tabIndex={showKey ? 0 : -1} aria-hidden={!showKey} data-on={drop || undefined} aria-expanded={drop} onClick={() => useDrop.setState({ open: !drop })}>
          <FileText size={14} strokeWidth={1.75} />
          Brief
        </button>
        <SubmitKey />
          </>
        )}
      </div>
      <FbPin />
      <div ref={scroller} className="d1-scroll">
        <div className="d1-thread">
          {thread.map((it) => (
            <Row key={it.id} it={it} />
          ))}
          {checking && <CheckThread />}
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
        {checking && (
          <div className="d1-comp-wrap ds-key-in">
            <Composer />
          </div>
        )}
        <div ref={spacer} className="ds-turn-room" aria-hidden />
      </div>
      <div className="d1-comp-wrap" hidden={checking || undefined}>
        {!checking && <Composer />}
      </div>
      <BriefDrop />
      <Side />
    </section>
  );
}

/* ---------- PiP ---------- */
function PipKey() {
  const phase = useD1((s) => s.phase);
  const stageId = useD1((s) => s.stageId);
  /* b36 (his note: "make sure the PiP is only for stage 1") */
  if (phase === 'brief' || stageId !== 'clean') return null;
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

/* ---------- b32: the PiP, zero-stage-five b24's law in this stage (his note: "the freaking best pip mode experience ...
   pip mode for stage one only"; then "the PiP should be smaller ... The profile, the slot, the chat, and the full screen
   mode ... It should not have any spacing between them"). One small charcoal bar: her face, Slots, Chat, Back to Zero,
   side by side. Hover her face and it is the mic. Hold it (or Control Option Command Space) and every key folds away:
   the bar is your words, your voice and the time. Let go and she takes one frame of your screen, the bar says Viewed
   your screen with it, then her answer plays in the bar and it comes back to rest. Slots and Chat open above the bar,
   the window grows up from where it sits. Drags by the bar, sizes from either side while open ---------- */
type ZqMode = 'rest' | 'held' | 'seen' | 'say';
const ZQ = { min: 280, max: 440, rest: 148, talk: 300 };
const ZQ_TICK_MS = 210;
const ZQ_SEEN_MS = 1300;
const ZQ_WORD_MS = 150;
const ZQ_HOLD_MS = 1800;
const ZQ_KEYS = ['⌃', '⌥', '⌘', 'Space'];
const ZQ_I = { size: 17, strokeWidth: 1.75 };
const BLUR_W = [62, 46, 74, 54, 68, 42, 70, 50, 58, 64];

const useZq = create<{
  body: 'chat' | 'slots' | null;
  r: number;
  b: number;
  w: number;
  mode: ZqMode;
  said: string;
  heard: number;
  t0: number;
  frame: string | null;
  her: string;
  shown: number;
  tip: string | null;
  near: boolean;
  paused: boolean;
}>(() => ({ body: null, r: 15, b: 78, w: 320, mode: 'rest', said: '', heard: 0, t0: 0, frame: null, her: '', shown: 0, tip: null, near: false, paused: false }));

const zq = {
  run: 0,
  timer: 0 as number,
  stop() {
    window.clearInterval(zq.timer);
    window.clearTimeout(zq.timer);
  },
  hold() {
    const s = useZq.getState();
    if (s.mode === 'held' || useD1.getState().typing) return;
    zq.stop();
    const me = ++zq.run;
    const said = d1.sample();
    useZq.setState({ mode: 'held', said, heard: 0, t0: Date.now(), frame: null, her: '', shown: 0, tip: null });
    const n = said.split(/\s+/).length;
    zq.timer = window.setInterval(() => {
      if (zq.run !== me) return;
      useZq.setState((z) => ({ heard: Math.min(n, z.heard + 1) }));
    }, ZQ_TICK_MS);
  },
  async release() {
    const s = useZq.getState();
    if (s.mode !== 'held') return;
    zq.stop();
    const me = ++zq.run;
    useZq.setState({ mode: 'seen', heard: s.said.split(/\s+/).length });
    const before = useD1.getState().thread.length;
    const img = await frame();
    if (zq.run !== me) return;
    useZq.setState({ frame: img });
    d1.talk(s.said, img ?? undefined);
    zq.timer = window.setTimeout(() => zq.answer(me, before), ZQ_SEEN_MS);
  },
  /* her answer, word by word, in the bar; with the chat open it is already in the chat, so the bar rests */
  answer(me: number, before: number) {
    if (zq.run !== me) return;
    if (useZq.getState().body === 'chat') return zq.rest();
    const her = useD1.getState().thread.slice(before).find((i) => i.k === 'her');
    if (!her || her.k !== 'her') {
      zq.timer = window.setTimeout(() => zq.answer(me, before), 160);
      return;
    }
    const n = her.text.split(/\s+/).length;
    useZq.setState({ mode: 'say', her: her.text, shown: 0, paused: false });
    zq.timer = window.setInterval(() => {
      if (zq.run !== me || useZq.getState().paused) return;
      const k = useZq.getState().shown + 1;
      useZq.setState({ shown: k });
      if (k >= n) {
        zq.stop();
        zq.timer = window.setTimeout(() => zq.run === me && !useZq.getState().paused && zq.rest(), ZQ_HOLD_MS);
      }
    }, ZQ_WORD_MS);
  },
  rest() {
    zq.stop();
    zq.run++;
    useZq.setState({ mode: 'rest', said: '', heard: 0, her: '', shown: 0, paused: false });
  },
  /* b36 (his note: "I don't have anything to pause"): her answer in the bar holds where it is until you play it on */
  pause() {
    const z = useZq.getState();
    if (z.mode !== 'say') return;
    const words = z.her.split(/\s+/).length;
    if (!z.paused) return useZq.setState({ paused: true });
    useZq.setState({ paused: false });
    if (z.shown >= words) {
      const me = zq.run;
      zq.timer = window.setTimeout(() => zq.run === me && zq.rest(), ZQ_HOLD_MS);
    }
  },
};

/* the time you have held, 0:01 */
function ZqClock() {
  const t0 = useZq((z) => z.t0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((now - t0) / 1000));
  return <span className="ds-zq-time d1-num">{`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`}</span>;
}

/* your voice while you hold: a row of thin bars that move with you */
function ZqBars() {
  return (
    <span className="ds-zq-bars" aria-hidden="true">
      {Array.from({ length: 22 }, (_, i) => (
        <i key={i} style={{ animationDelay: `${((i * 37) % 11) * -0.09}s` }} />
      ))}
    </span>
  );
}

/* words as they are heard or said: the newest hold the right edge, each arrives blurred and settles */
function ZqWords({ text, n }: { text: string; n: number }) {
  const words = text.split(/\s+/).slice(0, n);
  return (
    <span className="ds-zq-words">
      <span className="ds-zq-words-in">
        {words.map((w, i) => (
          <span key={i} className="ds-zq-w">
            {w}{' '}
          </span>
        ))}
      </span>
    </span>
  );
}

function ZqZone() {
  const mode = useZq((z) => z.mode);
  const said = useZq((z) => z.said);
  const heard = useZq((z) => z.heard);
  const img = useZq((z) => z.frame);
  const her = useZq((z) => z.her);
  const shown = useZq((z) => z.shown);
  const body = useZq((z) => z.body);
  const paused = useZq((z) => z.paused);
  if (mode === 'rest') return null;
  return (
    <div className="ds-zq-zone" data-mode={mode}>
      {mode === 'held' && (
        <div key="held" className="ds-zq-listen">
          {/* b36 (his note: "that visual indication is not there, like 'Mic is on' and a sample transcript"): faked, no real mic */}
          <span className="ds-zq-micon">
            <Mic size={13} strokeWidth={2} />
            Mic is on
          </span>
          {body !== 'chat' ? <ZqWords text={said} n={heard} /> : <span className="d1-grow" />}
          <span className="ds-zq-voice">
            <ZqBars />
            <ZqClock />
          </span>
        </div>
      )}
      {mode === 'seen' && (
        <div key="seen" className="ds-zq-seen">
          {img ? <img src={img} alt="" draggable={false} /> : <i className="ds-zq-seen-blank" />}
          <span>Viewed your screen</span>
        </div>
      )}
      {mode === 'say' && (
        <div key="say" className="ds-zq-say">
          <ZqWords text={her} n={shown} />
          <button type="button" className="ds-zq-key ds-zq-pause" aria-label={paused ? 'Play' : 'Pause'} onClick={() => zq.pause()}>
            {paused ? <Play size={13} strokeWidth={2} fill="currentColor" /> : <Pause size={13} strokeWidth={2} fill="currentColor" />}
          </button>
        </div>
      )}
    </div>
  );
}

function ZqKey({ name, on, onClick, children }: { name: string; on?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="ds-zq-key"
      data-on={on || undefined}
      aria-label={name}
      aria-pressed={on}
      onPointerEnter={() => useZq.setState({ tip: name })}
      onPointerLeave={() => useZq.setState({ tip: null })}
      onFocus={() => useZq.setState({ tip: name })}
      onBlur={() => useZq.setState({ tip: null })}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/* her face: hover and it is the mic, hold it to talk. The tip says what it does and the keys that do the same */
function ZqFace() {
  const m = useFlow((s) => s.project?.manager);
  return (
    <button
      type="button"
      className="ds-zq-face"
      aria-label={`Press this button to talk to ${m?.name ?? 'her'}`}
      onPointerEnter={() => useZq.setState({ tip: 'face' })}
      onPointerLeave={() => useZq.setState({ tip: null })}
      onFocus={() => useZq.setState({ tip: 'face' })}
      onBlur={() => useZq.setState({ tip: null })}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        zq.hold();
        const up = () => {
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          void zq.release();
        };
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      }}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault();
          zq.hold();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') void zq.release();
      }}
    >
      {m && <img src={m.face} alt="" draggable={false} />}
      <span className="ds-zq-mic" aria-hidden="true">
        <Mic size={15} strokeWidth={2} />
      </span>
    </button>
  );
}

function ZqTip() {
  const tip = useZq((z) => z.tip);
  const mode = useZq((z) => z.mode);
  const name = useFlow((s) => s.project?.manager?.name ?? 'Eryn');
  if (!tip || mode !== 'rest') return null;
  return (
    <div key={tip} className="ds-zq-tip" role="tooltip">
      {tip === 'face' ? (
        <>
          {/* b36 (his note: "Hold to talk, Eryn ... too much. Let's just say 'Press this button to talk to Eryn'") */}
          <span>Press this button to talk to {name}</span>
          <span className="ds-zq-tip-keys">
            {ZQ_KEYS.map((k) => (
              <kbd key={k}>{k}</kbd>
            ))}
          </span>
        </>
      ) : (
        <span>{tip}</span>
      )}
    </div>
  );
}

/* Slots: the whole list, issues, the prompt and the submission. What is ahead is a hidden blurred line, never grey text */
function ZqSlots({ home }: { home: () => void }) {
  const s = useD1();
  const b = briefOf(s.stageId);
  const askMode = s.ask && s.stageId === 'clean';
  const sent = s.phase !== 'brief' && s.phase !== 'work';
  const blur = (i: number) => <span className="ds-zq-blur" style={{ width: `${BLUR_W[i % BLUR_W.length]}%` }} aria-label="Not yet" />;
  const row = (key: string, on: boolean, text: string, i: number, extra?: React.ReactNode) => (
    <li key={key} className="ds-zq-slot" data-on={on || undefined} data-pop={s.pop?.id === key ? s.pop.n : undefined}>
      <span className="ds-zq-tick">{on && <Check size={11} strokeWidth={2.6} />}</span>
      {on ? <span className="ds-zq-slot-t">{text}</span> : blur(i)}
      {extra}
    </li>
  );
  const parts: { title: string; count?: string; state: TodoState; rows: React.ReactNode[] }[] = [];
  if (askMode) {
    const order = ['issues', 'prompt', 'submit'];
    const at = s.phase === 'brief' ? 0 : s.phase === 'work' ? order.indexOf(s.askStep) : 3;
    const st = (k: number): TodoState => (k < at ? 'done' : k === at ? 'now' : 'next');
    parts.push({ title: ASK_GROUPS[0].title, count: `${s.found.length} of ${ISSUES.length}`, state: st(0), rows: ISSUES.map((it, i) => row(it.id, s.found.includes(it.id), it.label, i)) });
    parts.push({
      title: ASK_GROUPS[1].title,
      state: st(1),
      rows: [row('prompt', !!s.prompt, s.prompt, 3, s.prompt ? <CopyKey text={s.prompt} label="Copy the prompt" /> : null)],
    });
  } else {
    parts.push({
      title: 'Requirements',
      count: `${b.requirements.filter((r) => s.met[r.id]).length} of ${b.requirements.length}`,
      state: sent ? 'done' : 'now',
      rows: b.requirements.map((r, i) => row(r.id, !!s.met[r.id], r.text, i)),
    });
  }
  const ready = askMode ? s.phase === 'work' && s.askStep === 'submit' : s.phase === 'work' && !slotsLeft(s);
  return (
    <div className="ds-zq-slots">
      {parts.map((p, i) => (
        <section key={p.title} className="ds-zq-part" data-state={p.state}>
          <h5>
            <span className="ds-zq-n d1-num">{p.state === 'done' ? <Check size={10} strokeWidth={2.6} /> : i + 1}</span>
            {p.title}
            {p.count && <span className="ds-zq-count d1-num">{p.count}</span>}
          </h5>
          <ul>{p.rows}</ul>
        </section>
      ))}
      <section className="ds-zq-part" data-state={sent ? 'done' : ready ? 'now' : 'next'}>
        <h5>
          <span className="ds-zq-n d1-num">{sent ? <Check size={10} strokeWidth={2.6} /> : parts.length + 1}</span>
          Submission
        </h5>
        <button type="button" className="ds-zq-submit" disabled={!ready} onClick={home}>
          {sent ? <Check size={13} strokeWidth={2.2} /> : !ready ? <Lock size={13} strokeWidth={1.75} /> : <ArrowUpRight size={13} strokeWidth={1.75} />}
          {sent ? (specOf(s.stageId)?.sentLine ?? 'Clean sheet sent') : ready ? 'Submit in Zero' : specOf(s.stageId) ? 'Submit it' : 'Submit the clean sheet'}
        </button>
      </section>
    </div>
  );
}

function ZqChat({ home }: { home: () => void }) {
  const thread = useD1((s) => s.thread);
  const zf = useFile();
  const typing = useD1((s) => s.typing);
  const stuck = useD1((s) => s.stuck);
  const mode = useZq((z) => z.mode);
  const said = useZq((z) => z.said);
  const heard = useZq((z) => (z.mode === 'held' ? z.heard : 0));
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [thread.length, typing]);
  const send = () => {
    if (!text.trim()) return;
    d1.send(text);
    setText('');
  };
  const shoot = async () => {
    const img = await frame();
    d1.post('', { name: shotName(), meta: 'Your screen', img: img ?? undefined });
  };
  const heldWords = mode === 'held' ? said.split(/\s+/).slice(0, heard).join(' ') : '';
  return (
    <>
      <div ref={scroller} className="ds-zq-scroll">
        {thread.map((it) =>
          it.k === 'her' ? (
            <p key={it.id} className="ds-zq-her">
              {it.text}
              {it.tool && (
                <>
                  <br />
                  <ToolLink />
                </>
              )}
            </p>
          ) : it.k === 'me' || it.k === 'prompt' ? (
            <p key={it.id} className="ds-zq-me">
              {it.text}
            </p>
          ) : it.k === 'file' ? (
            <div key={it.id} className="ds-zq-file">
              <img src="static/logos/logo-sheets.svg" alt="" />
              <button type="button" className="ds-zq-file-t" onClick={() => (home(), openSide('sheet'))}>
                <span>{zf.name}</span>
                <span className="ds-zq-dim">{zf.meta}</span>
              </button>
              <button type="button" className="ds-zq-ghost" aria-label="Preview" title="Preview" onClick={() => (home(), openSide('sheet'))}>
                <Eye size={14} strokeWidth={1.75} />
              </button>
              <a className="ds-zq-ghost" href={zf.url} download aria-label="Download" title="Download">
                <Download size={14} strokeWidth={1.75} />
              </a>
            </div>
          ) : it.k === 'seen' ? (
            <p key={it.id} className="ds-zq-look ds-zq-seenrow" tabIndex={0} aria-label="Eryn viewed your screen">
              {it.img ? <img src={it.img} alt="" /> : <i className="ds-zq-seen-blank" />}
              <span className="ds-zq-seen-t">Viewed your screen</span>
            </p>
          ) : it.k === 'att' && it.img ? (
            <p key={it.id} className="ds-zq-look">
              <img src={it.img} alt="" />
              {it.name}
            </p>
          ) : it.k === 'shot' || it.k === 'att' ? (
            <p key={it.id} className="ds-zq-look">
              {it.k === 'att' && it.link ? <Link2 size={12} strokeWidth={1.75} /> : <FileText size={12} strokeWidth={1.75} />}
              {it.name}
            </p>
          ) : it.k === 'sent' ? (
            <p key={it.id} className="ds-zq-look">
              Reviewing
            </p>
          ) : it.k === 'feedback' ? (
            <button key={it.id} type="button" className="ds-zq-look ds-zq-look-k" onClick={home}>
              <ArrowUpRight size={12} strokeWidth={1.75} />
              Open her feedback in Zero
            </button>
          ) : null
        )}
        {typing && (
          <div className="d1-typing ds-zq-typing" aria-label="Eryn is typing">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
      {stuck && <AskCard focusBox={() => box.current?.focus()} />}
      <div className="ds-zq-comp" data-held={mode === 'held' || undefined}>
        <textarea
          ref={box}
          rows={1}
          value={mode === 'held' ? heldWords : text}
          readOnly={mode === 'held'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={stuck ? 'Or say it your way' : 'Message Eryn'}
          aria-label="Message Eryn"
        />
        <div className="ds-zq-comp-row">
          <button type="button" className="ds-zq-ghost" aria-label="Send her your screen" title="Send her your screen" onClick={() => void shoot()}>
            <ShotIcon size={15} />
          </button>
          <StuckSwitch />
          <span className="d1-grow" />
          <button type="button" className="d1-send" aria-label="Send" disabled={!text.trim()} onClick={send}>
            <ArrowUp size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  );
}

function ZeroPip() {
  const body = useZq((z) => z.body);
  const r = useZq((z) => z.r);
  const b = useZq((z) => z.b);
  const w = useZq((z) => z.w);
  const mode = useZq((z) => z.mode);
  const wrap = useRef<HTMLDivElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; r: number; b: number } | null>(null);
  const size = useRef<{ x: number; w: number; r: number; side: 1 | -1 } | null>(null);
  const home = () => {
    zq.rest();
    const rect = win.current?.getBoundingClientRect();
    if (rect) spot.back = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
    useFlow.getState().actions.setSurface('big');
  };
  const toggle = (v: 'chat' | 'slots') => {
    const next = body === v ? null : v;
    useZq.setState({ body: next });
    if (next === 'chat') useD1.setState({});
  };
  useLayoutEffect(() => rise(wrap.current, { y: 10, blur: 8, scale: 0.96, ms: 520, delay: 360 }), []);
  useEffect(() => () => zq.rest(), []);
  /* Control Option Command Space talks from anywhere on the desktop */
  useEffect(() => {
    /* b36: macOS keeps Control Command Space for its own emoji window, so the page may never hear the combo. Holding
       Space anywhere outside a text box talks too */
    const typingIn = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      const combo = e.ctrlKey && e.altKey && e.metaKey;
      if (!combo && (e.ctrlKey || e.altKey || e.metaKey || typingIn(e.target))) return;
      e.preventDefault();
      e.stopPropagation();
      zq.hold();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Meta' || e.key === 'Control' || e.key === 'Alt') void zq.release();
    };
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', up, true);
    return () => {
      window.removeEventListener('keydown', down, true);
      window.removeEventListener('keyup', up, true);
    };
  }, []);
  /* b32 (his note: "Click on the chat, and all should auto-collapse"): a click anywhere outside the PiP folds Slots or
     Chat back to the bar */
  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (!useZq.getState().body || wrap.current?.contains(e.target as Node)) return;
      useZq.setState({ body: null });
    };
    window.addEventListener('pointerdown', down, true);
    return () => window.removeEventListener('pointerdown', down, true);
  }, []);
  const talking = mode !== 'rest';
  /* b32 (his note: "not on hover, it should be smaller ... by 75%. [On hover] it should be 100%"): at rest the whole PiP
     sits at 75% from its corner; your pointer on it, or her talking, brings it to full size */
  const near = useZq((z) => z.near);
  /* b36 (his note: "When the chat is open, it should not condense to a smaller version"): open is always full size */
  const full = near || talking || !!body;
  const width = body ? w : talking ? ZQ.talk : ZQ.rest;
  return (
    <div
      ref={wrap}
      className="ds-zq-wrap"
      data-snip=""
      data-full={full || undefined}
      style={{ right: r, bottom: b }}
      onPointerEnter={() => useZq.setState({ near: true })}
      onPointerLeave={(e) => useZq.setState(e.buttons ? { tip: null } : { near: false, tip: null })}
      onFocus={() => useZq.setState({ near: true })}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && useZq.setState({ near: false })}
    >
      <ZqTip />
      <div
        ref={win}
        className="ds-zq"
        data-open={body || undefined}
        data-mode={mode}
        style={{ width, height: body ? 'auto' : 44 }}
      >
        {body && (
          <div key={body} className="ds-zq-body" data-body={body}>
            {body === 'chat' ? <ZqChat home={home} /> : <ZqSlots home={home} />}
          </div>
        )}
        <div
          className="ds-zq-bar"
          data-held={mode === 'held' || undefined}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            drag.current = { x: e.clientX, y: e.clientY, r, b };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current || !e.buttons) return;
            const d = drag.current;
            const ww = win.current?.offsetWidth ?? 0;
            useZq.setState({
              r: Math.max(8, Math.min(window.innerWidth - ww - 8, d.r - (e.clientX - d.x))),
              b: Math.max(8, Math.min(window.innerHeight - 60, d.b - (e.clientY - d.y))),
            });
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            drag.current = null;
            /* b36 (his note: "When I click on it, the whole chat mode and all should collapse"): a click on the bar, not a drag */
            if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4 && body) useZq.setState({ body: null });
            if (!wrap.current?.matches(':hover')) useZq.setState({ near: false });
          }}
        >
          <div className="ds-zq-keys" data-gone={(talking && !body) || mode === 'held' || undefined}>
            <ZqFace />
            <ZqKey name="Slots" on={body === 'slots'} onClick={() => toggle('slots')}>
              <ListChecks {...ZQ_I} />
            </ZqKey>
            <ZqKey name={`Chat with Eryn`} on={body === 'chat'} onClick={() => toggle('chat')}>
              <MessageCircle {...ZQ_I} />
            </ZqKey>
            <ZqKey name="Back to Zero" onClick={home}>
              <Maximize2 size={15} strokeWidth={1.75} />
            </ZqKey>
          </div>
          <ZqZone />
        </div>
        {body &&
          ([-1, 1] as const).map((side) => (
            <span
              key={side}
              className="ds-zq-size"
              data-side={side < 0 ? 'l' : 'r'}
              role="separator"
              aria-label="Resize"
              onPointerDown={(e) => {
                size.current = { x: e.clientX, w, r, side };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const z = size.current;
                if (!z || !e.buttons) return;
                const nw = Math.round(Math.min(ZQ.max, Math.max(ZQ.min, z.w + z.side * (e.clientX - z.x))));
                useZq.setState(z.side > 0 ? { w: nw, r: Math.max(8, z.r - (nw - z.w)) } : { w: nw });
              }}
              onPointerUp={() => (size.current = null)}
            />
          ))}
      </div>
    </div>
  );
}

function Pip() {
  const surface = useFlow((s) => s.ui.surface);
  if (surface !== 'pip') return null;
  return (
    <Desktop>
      <div className="zs2 d1 ds2 zd ds-zq-host" data-mode="dark">
        <ZeroPip />
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
  useDevAction('d1-fix', 'Tick every fix', () => fixesOf(useD1.getState().stageId).forEach((f) => !useD1.getState().fixed[f.id] && d1.fix(f.id)));
  useDevAction('d1-time', 'Add 35 minutes to the timer', () => d1.skew(35));
  useDevAction('ds-tools', 'Tools and training: switch V1 and V2', () => useLook.setState((l) => ({ tools: l.tools === 'v1' ? 'v2' : 'v1' })));
  useDevAction('d1-pou', 'Answer her check-in', () => pouAnswerForMe());
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
