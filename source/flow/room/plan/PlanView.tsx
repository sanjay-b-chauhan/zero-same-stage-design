/* The breakdown and the objective, as b36's plan: on a light page under her face, the one line problem, then
   "N stages take you to the fix. About N hours." in .62, then the stages as a path, numbered dots on one line and an
   outlined card for each, all revealed on her words. Got it: the same path stays in the same DOM, the brief and the
   kickoff land in front of it as two done stops, and the stage you are on holds the one key.
   The Room owns the sheet, the head, her face, the caption and the frame. */
import { Check, FileText, Flag, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';

import { softClick, softLand } from '../../audio';
import { clock } from '../../clock';
import { devMark, useDevAction, useDevGo } from '../../dev/store';
import { continueLabel, useFlow } from '../../engine/store';
import BriefBody from '../../open/BriefBody';
import { moveTo, place as placeLook } from '../../open/motion';
import { playWhiteToBlack } from '../../screens/WhiteToBlack';
import { SPRING, SPRING_MS, isTextEntry, pop, prefersReduced, rise } from '../../stage/parts/util';
import type { ProjectMeta, StageMeta } from '../../types';
import { glideFrom, takeSnapshot, type PlanSnapshot } from './flip';
import { smartAnimate } from './morph';
import Objective from './Objective';
import { useBreakdown } from './useBreakdown';
import { pathLine, problemLine } from './words';
import './plan.css';

type PlanMode = 'breakdown' | 'objective';
type StopKind = 'brief' | 'kick' | 'stage' | 'end';
type Tone = 'now' | 'done' | 'later';

interface Stop {
  key: string;
  kind: StopKind;
  title: string;
  stage?: StageMeta;
  n?: number;
}

const GLIDE: KeyframeAnimationOptions = { duration: SPRING_MS, easing: SPRING };
const DRAW_MS = 380;
const DRAW_EASE = 'cubic-bezier(.22,1,.36,1)';
const CARD_RADIUS = 10;
const ICON = { strokeWidth: 2 } as const;

/* b36 planStop: the line into a stop draws, then the dot pops from .2 and the card drops in from above, blur to sharp */
function landStop(stops: NodeListOf<HTMLElement>, col: number, delay: number) {
  const stop = stops[col];
  if (!stop || prefersReduced(stop)) return;
  const seg = col > 0 ? stops[col - 1]?.querySelector<HTMLElement>('.pl-seg') : null;
  const lead = seg ? 200 : 0;
  seg?.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: DRAW_MS, easing: DRAW_EASE, delay, fill: 'backwards' });
  pop(stop.querySelector('.pl-node'), 0.2, delay + lead);
  rise(stop.querySelector('.pl-card'), { y: -10, scale: 0.9, blur: 6, delay: delay + lead + 40 });
}

function Plan({ project, mode, leaving = false }: { project: ProjectMeta; mode: PlanMode; leaving?: boolean }) {
  const goto = useFlow((s) => s.actions.goto);
  const startStage = useFlow((s) => s.actions.startStage);
  const doneStages = useFlow((s) => s.doneStages);
  const openStage = useFlow((s) => {
    const st = s.stage;
    return st && st.projectId === project.id && !s.doneStages.includes(st.stageId) ? st.stageId : null;
  });

  const { state, again, halt, restart, finish } = useBreakdown(project, mode === 'breakdown' && !leaving);
  const stages = project.stages;
  const objective = mode === 'objective';
  const landed = objective ? stages.length : state.landed;
  const endIn = objective || state.on === 'all' || state.asking;
  const said = objective ? Number.POSITIVE_INFINITY : state.said;
  const problem = useMemo(() => problemLine(project), [project]);
  const path = useMemo(() => pathLine(project), [project]);

  const rootRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<HTMLDivElement>(null);
  const keyRef = useRef<HTMLButtonElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const sheetXRef = useRef<HTMLButtonElement>(null);
  const starting = useRef(false);
  const seenStages = useRef(objective ? stages.length : 0);
  const seenEnd = useRef(objective);
  const sheetSeen = useRef(false);
  const [briefOpen, setBriefOpen] = useState(false);

  /* read before the commit, while the path still stands where she left it */
  const lastMode = useRef(mode);
  const snap = useRef<PlanSnapshot | null>(null);
  if (lastMode.current !== mode) {
    lastMode.current = mode;
    snap.current = mode === 'objective' ? takeSnapshot(pathRef.current) : null;
  }

  const currentIndex = stages.findIndex((s) => !doneStages.includes(s.id));
  const current = currentIndex < 0 ? null : stages[currentIndex];
  const started = doneStages.length > 0 || openStage !== null;
  const keyLabel = started ? continueLabel() : 'Start stage';

  const stops: Stop[] = [
    ...(objective
      ? [
          { key: 'brief', kind: 'brief' as const, title: 'Project brief' },
          { key: 'kick', kind: 'kick' as const, title: 'Kickoff meeting' },
        ]
      : []),
    ...stages.map((s, i) => ({ key: s.id, kind: 'stage' as const, title: s.title, stage: s, n: i + 1 })),
    { key: 'end', kind: 'end', title: project.end },
  ];

  const isIn = (s: Stop): boolean => {
    if (s.kind === 'brief' || s.kind === 'kick') return objective;
    if (s.kind === 'end') return endIn;
    return (s.n ?? 0) <= landed;
  };
  const toneOf = (s: Stop): Tone | undefined => {
    if (!objective) return undefined;
    if (s.kind === 'brief' || s.kind === 'kick') return 'done';
    if (s.kind === 'end') return 'later';
    if (s.stage && doneStages.includes(s.stage.id)) return 'done';
    return s.stage?.id === current?.id ? 'now' : 'later';
  };
  const isOn = (s: Stop): boolean => {
    if (objective) return s.kind === 'stage' && s.stage?.id === current?.id;
    if (s.kind === 'end') return state.on === 'all';
    return s.n !== undefined && state.on === s.n - 1;
  };

  /* a stop lands on her word */
  useLayoutEffect(() => {
    if (objective) {
      seenStages.current = stages.length;
      seenEnd.current = true;
      return;
    }
    const root = pathRef.current;
    const from = seenStages.current;
    seenStages.current = landed;
    const cols: number[] = [];
    for (let i = from; i < landed; i++) cols.push(i);
    if (endIn && !seenEnd.current) cols.push(stages.length);
    seenEnd.current = endIn;
    if (!root || !cols.length) return;
    const list = root.querySelectorAll<HTMLElement>('.pl-stop');
    cols.forEach((c, k) => landStop(list, c, k * 70));
  }, [landed, endIn, objective, stages.length]);

  /* her words are done: the two answers rise */
  useLayoutEffect(() => {
    if (state.asking && !objective) rise(keysRef.current, { y: 16, scale: 0.96, blur: 6 });
  }, [state.asking, objective]);

  /* Got it: the same stops glide to their new places, the brief and the kickoff land in front, the key rises */
  useLayoutEffect(() => {
    const s = snap.current;
    snap.current = null;
    const root = pathRef.current;
    if (!s || !root || prefersReduced(root)) return;
    const fresh = glideFrom(s, root, GLIDE);
    const timers: number[] = [];
    fresh.forEach((el, i) => {
      const d = 240 + i * 40;
      if (el.classList.contains('pl-seg')) {
        el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: DRAW_MS, easing: DRAW_EASE, delay: d, fill: 'backwards' });
      } else if (el.classList.contains('pl-node')) {
        pop(el, 0.2, d);
      } else rise(el, { y: -10, scale: 0.9, blur: 6, delay: d });
    });
    root.querySelectorAll('.pl-node[data-tone="done"]').forEach((n, i) => {
      timers.push(clock.setTimeout(() => softLand(i + 2), 300 + i * 80));
    });
    rise(keysRef.current, { y: 16, scale: 0.96, blur: 6, delay: 420 });
    return () => timers.forEach((id) => clock.clearTimeout(id));
  }, [mode]);

  /* straight into the objective (a dev landing, or back from a stage): the page arrives once */
  useLayoutEffect(() => {
    if (!objective) return;
    rise(stackRef.current, { y: 10, blur: 6 });
    rise(keysRef.current, { y: 16, scale: 0.96, blur: 6, delay: 160 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    devMark(mode);
  }, [mode]);

  /* developer mode: the engine has already brought the right screen, and stepping between the two plays the real glide */
  useDevGo(
    (id) => id === 'breakdown' || id === 'objective',
    (id) => {
      setBriefOpen(false);
      if (id === 'breakdown' && mode === 'breakdown') restart();
    }
  );
  const finishRef = useRef(finish);
  finishRef.current = finish;
  useDevAction('plan-finish', 'Finish her words', () => finishRef.current(), !objective && !leaving && !state.asking);

  const gotIt = useCallback(() => {
    softClick();
    halt();
    goto('objective');
  }, [goto, halt]);

  useDevAction('plan-got', 'Got it', gotIt, !objective && !leaving && state.asking);

  const pressAgain = useCallback(() => {
    softClick();
    again();
  }, [again]);

  const start = useCallback(
    async (stageId: string, card: Element | null) => {
      if (starting.current || !card) return;
      starting.current = true;
      softClick();
      try {
        const r = card.getBoundingClientRect();
        await playWhiteToBlack({ left: r.left, top: r.top, width: r.width, height: r.height, radius: CARD_RADIUS });
        startStage(stageId);
      } finally {
        starting.current = false;
      }
    },
    [startStage]
  );

  const currentCard = () => pathRef.current?.querySelector('.pl-stop[data-on="1"] .pl-card') ?? null;

  /* the brief rises over the plan as b36's sheet, and drops away the same way */
  useLayoutEffect(() => {
    const el = sheetRef.current;
    const sc = scrimRef.current;
    if (!el || !sc) return;
    const h = rootRef.current?.clientHeight ?? window.innerHeight;
    if (briefOpen) {
      sheetSeen.current = true;
      sc.style.visibility = 'visible';
      moveTo(sc, { opacity: '1' }, { duration: 450, easing: 'ease-out' });
      if (el.style.visibility !== 'visible') placeLook(el, { transform: `translateY(${Math.round(h * 0.62)}px) scale(0.96)` });
      el.style.visibility = 'visible';
      moveTo(el, { transform: 'none' }, GLIDE);
      el.querySelectorAll('[data-rise="h"]').forEach((n, i) => rise(n, { y: 14, blur: 6, delay: 220 + i * 30 }));
      el.querySelectorAll('[data-rise="b"]').forEach((n, i) => rise(n, { y: 18, blur: 6, delay: 280 + i * 50 }));
      pop(sheetXRef.current, 0.6, 300);
      el.focus({ preventScroll: true });
    } else if (sheetSeen.current) {
      moveTo(sc, { opacity: '0' }, { duration: 260, easing: 'ease-out' }, () => (sc.style.visibility = 'hidden'));
      moveTo(
        el,
        { transform: `translateY(${Math.round(h * 0.7)}px) scale(0.97)` },
        { duration: 420, easing: 'cubic-bezier(.55,.06,.68,.19)' },
        () => (el.style.visibility = 'hidden')
      );
    }
  }, [briefOpen]);

  useEffect(() => {
    if (!objective) setBriefOpen(false);
  }, [objective]);

  /* Enter answers the one key, Escape closes the brief. Tab still walks the page. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* typing in a chat or a field: Enter is that field's, never this screen's (his note, 3 Nov) */
      if (e.defaultPrevented || (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)))) return;
      if (e.key === 'Escape' && briefOpen) {
        e.preventDefault();
        setBriefOpen(false);
        return;
      }
      if (e.defaultPrevented || isTextEntry(e.target)) return;
      if (e.key !== 'Enter' || e.repeat || document.activeElement instanceof HTMLButtonElement) return;
      if (objective) {
        if (briefOpen || !current) return;
        void start(current.id, currentCard());
      } else if (state.asking) gotIt();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [objective, briefOpen, current, state.asking, start, gotIt]);

  const clearing = state.clearing && !objective;

  return (
    <div ref={rootRef} className="plan b-light" data-mode={mode} data-leaving={leaving ? '1' : undefined} inert={leaving}>
      <div ref={stackRef} className={`pl-stack${clearing ? ' is-clearing' : ''}`}>
        <h1 className="pl-goal">
          <span data-in={said >= 1 ? '1' : '0'} data-m="title">
            {problem}
          </span>
          <span className="pl-g2" data-in={said >= 2 ? '1' : '0'}>
            {path}
          </span>
        </h1>

        <div ref={pathRef} className="pl-path" style={{ gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))` }}>
          {stops.map((s, i) => {
            const inNow = isIn(s);
            const next = stops[i + 1];
            const tone = toneOf(s);
            const nextTone = next ? toneOf(next) : undefined;
            const on = isOn(s);
            const go = objective && s.kind === 'stage' && on;
            const cardInner = (
              <>
                <span className="pl-t" data-m={`t:${s.key}`}>
                  {s.title}
                </span>
                {s.kind === 'brief' && (
                  <span className="pl-sub">
                    <span className="pl-min">
                      <FileText size={14} {...ICON} />
                      Open
                    </span>
                  </span>
                )}
                {s.kind === 'kick' && (
                  <span className="pl-sub">
                    <span className="pl-min">
                      <RotateCcw size={14} {...ICON} />
                      Replay
                    </span>
                  </span>
                )}
                {s.kind === 'stage' && s.stage && (
                  <span className="pl-sub">
                    <span className="pl-min" data-m={`m:${s.key}`}>
                      {s.stage.minutes} min
                    </span>
                    {go && (
                      <span className="pl-alt" title={`${s.stage.deliverable.label} ${s.stage.deliverable.type}`}>
                        {s.stage.deliverable.label}
                        <span className="pl-type">{s.stage.deliverable.type}</span>
                      </span>
                    )}
                  </span>
                )}
              </>
            );
            const action =
              s.kind === 'brief'
                ? () => {
                    softClick();
                    setBriefOpen(true);
                  }
                : s.kind === 'kick'
                  ? () => {
                      softClick();
                      goto('kickoff');
                    }
                  : go && s.stage
                    ? (e: MouseEvent<HTMLButtonElement>) => void start(s.stage!.id, e.currentTarget)
                    : null;
            return (
              <div
                key={s.key}
                className="pl-stop"
                data-kind={s.kind}
                data-in={inNow ? '1' : '0'}
                data-on={on ? '1' : '0'}
                data-go={go ? '1' : '0'}
                data-tone={tone}
              >
                {next && (
                  <span
                    className="pl-seg"
                    data-flip={`${s.key}-s`}
                    data-in={isIn(next) ? '1' : '0'}
                    data-tone={nextTone === 'later' ? 'later' : undefined}
                    aria-hidden
                  />
                )}
                <span className="pl-node" data-flip={`${s.key}-n`} data-m={`n:${s.key}`} data-tone={tone}>
                  {tone === 'done' ? <Check size={13} {...ICON} /> : s.kind === 'end' ? <Flag size={12} {...ICON} /> : s.n}
                </span>
                {action ? (
                  <button type="button" className="pl-card" data-flip={`${s.key}-c`} data-m={`c:${s.key}`} onClick={action}>
                    {cardInner}
                  </button>
                ) : (
                  <div className="pl-card" data-flip={`${s.key}-c`} data-m={`c:${s.key}`}>
                    {cardInner}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {objective ? (
        <div ref={keysRef} className="pl-keys" data-in={current ? '1' : '0'}>
          {current && (
            <button ref={keyRef} type="button" className="zk3 pl-go" onClick={() => void start(current.id, currentCard())}>
              {keyLabel}
            </button>
          )}
        </div>
      ) : (
        <div ref={keysRef} className={`pl-keys${clearing ? ' is-clearing' : ''}`} data-in={state.asking ? '1' : '0'}>
          <button type="button" className="zk3 pl-again" data-tone="line" onClick={pressAgain}>
            <RotateCcw {...ICON} />
            Again
          </button>
          <button type="button" className="zk3 pl-go" data-m="go" onClick={gotIt}>
            Got it
          </button>
        </div>
      )}

      {objective && (
        <>
          <div ref={scrimRef} className="zo-scrim pl-scrim" aria-hidden onClick={() => setBriefOpen(false)} />
          <div className="zo-sheetwrap pl-sheetwrap">
            <section
              ref={sheetRef}
              className="zo-sheet b-light"
              role="dialog"
              aria-modal="true"
              aria-label="Project brief"
              tabIndex={-1}
              inert={!briefOpen}
            >
              <button ref={sheetXRef} type="button" className="zo-x" aria-label="Close the brief" onClick={() => setBriefOpen(false)}>
                <X strokeWidth={1.75} />
              </button>
              <header className="zo-hd">
                <span className="zo-art" data-rise="h">
                  <img src={project.logo} alt={project.company} draggable={false} />
                </span>
                <h2 className="zo-hd-t" data-rise="h">
                  {project.title}
                </h2>
              </header>
              <BriefBody project={project} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}

/* the breakdown is b36's plan; the objective is the real product's screen, redrawn (Objective.tsx). From one to the
   other both stand for a beat, the breakdown under the objective, while every piece hands over to its twin (morph.ts) */
export default function PlanView({ mode }: { mode: PlanMode }) {
  const project = useFlow((s) => s.project);
  const hostRef = useRef<HTMLDivElement>(null);
  const [prev, setPrev] = useState(mode);
  const [handing, setHanding] = useState(false);
  if (prev !== mode) {
    setPrev(mode);
    setHanding(prev === 'breakdown' && mode === 'objective' && !prefersReduced(document.documentElement));
  }

  useLayoutEffect(() => {
    const host = hostRef.current;
    const from = host?.querySelector<HTMLElement>('.plan[data-leaving]');
    const to = host?.querySelector<HTMLElement>('.ob');
    if (!handing || !from || !to) return;
    const id = clock.setTimeout(() => setHanding(false), smartAnimate(from, to));
    return () => clock.clearTimeout(id);
  }, [handing]);

  if (!project) return null;
  return (
    <div ref={hostRef} className="pl-host">
      {(mode === 'breakdown' || handing) && <Plan key={project.id} project={project} mode="breakdown" leaving={handing} />}
      {mode === 'objective' && <Objective key={project.id} project={project} morph={handing} />}
    </div>
  );
}
